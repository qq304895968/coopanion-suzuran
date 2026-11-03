/**
 * 参考图：用户点名一个人物时，搜一张图或截一张屏，作为这一次生成的参考输入。
 *
 * 优先级：对话附件 > 明确的屏幕截图 > 网络图片搜索。搜不到就按文字画，绝不假装画得像。
 * 参考图只在内存里用一次，不写进画夹，也不进索引。
 */
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, unlinkSync } from 'node:fs';
import { isIP } from 'node:net';
import { basename, isAbsolute, join } from 'node:path';
import { detectImageMime, imageSize } from './draw.ts';

export type ReferenceSource = 'attachment' | 'file' | 'search' | 'screen';

export interface ReferenceImage {
  bytes: Uint8Array;
  mime: string;
  width: number;
  height: number;
  source: ReferenceSource;
  /** 给回执看的一句话，不含 URL。 */
  detail: string;
}

export interface ResolveReferenceOptions {
  mode: 'auto' | 'search' | 'screen' | 'none';
  name?: string;
  query?: string;
  attachment?: ReferenceImage | null;
  /** 本地图片的绝对路径;给了它就优先用这张,不再搜图/截图。 */
  path?: string;
  allowSearch: boolean;
  allowScreen: boolean;
  dataDir: string;
  fetchImpl?: typeof fetch;
}

export interface ReferenceResolution {
  ref: ReferenceImage | null;
  /** 回执/日志里的一句话，例如「参考图：Bing 搜索「明日方舟 铃兰」」。 */
  note: string;
}

export const MAX_REFERENCE_BYTES = 4 * 1024 * 1024;
export const MAX_REFERENCE_EDGE = 4096;

/**
 * 不一定说出“截图”两个字，但这些话是在指当前屏幕/眼前这一刻。
 * 只看用户/模型给的话，不读屏幕内容。
 */
const SCREEN_INTENT_RE = /(记下|记录|拍下|留住).{0,8}(这一刻|这一瞬间|这个瞬间|现在)|这一瞬间|这一刻|现在这个画面|眼前(这个|的)?(画面|场景|人)|屏幕上|屏幕里|截图|照着(他|她|这个|屏幕)|照(他|她)的样子|照这个样子|就(按)?现在这样|当前(画面|屏幕)|这个画面|这一幕|\b(this moment|right now|on (the )?screen|what you see|as (he|she) looks|like this)\b/i;

/** 从用户话里推断“要用当前屏幕”；明确说无关/不要截图时不截。 */
export function hasScreenIntent(text: string): boolean {
  if (/(与?.*无关|不相关|没关系|别看屏幕|不要用屏幕|不用屏幕|不要截图)/.test(text)) return false;
  return SCREEN_INTENT_RE.test(text);
}

const FETCH_TIMEOUT_MS = 12_000;
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';

function timeoutSignal(): { signal: AbortSignal; done: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  timer.unref?.();
  return { signal: controller.signal, done: () => clearTimeout(timer) };
}

/** 只接受静图；尺寸和字节数给一个上限，避免把巨大参考图塞进请求。 */
export function validateReference(bytes: Uint8Array, source: ReferenceSource, detail: string): ReferenceImage | null {
  if (!bytes.byteLength || bytes.byteLength > MAX_REFERENCE_BYTES) return null;
  const mime = detectImageMime(bytes);
  if (!mime) return null;
  const size = imageSize(bytes);
  if (!size || size.width < 16 || size.height < 16) return null;
  if (size.width > MAX_REFERENCE_EDGE || size.height > MAX_REFERENCE_EDGE) return null;
  return { bytes, mime, width: size.width, height: size.height, source, detail };
}

/**
 * 直接从本地文件读一张参考图。
 * 只接受绝对路径;相对路径、读不到、格式不识、太大都返回 null。
 */
export function referenceFromFile(path: string): ReferenceImage | null {
  const target = path.trim();
  if (!target || !isAbsolute(target) || !existsSync(target)) return null;
  try {
    const bytes = new Uint8Array(readFileSync(target));
    return validateReference(bytes, 'file', `本地图片 ${basename(target)}`);
  } catch {
    return null;
  }
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

export interface BingImageResult {
  url: string;
  title: string;
  page: string;
}

/** 从 Bing 图片搜索的 HTML 里取 murl/t/purl；导出给测试。 */
export function extractBingResults(html: string): BingImageResult[] {
  const results: BingImageResult[] = [];
  const seen = new Set<string>();
  const re = /<a[^>]+class="iusc"[^>]+m="([^"]+)"/g;
  for (const match of html.matchAll(re)) {
    const raw = decodeHtml(match[1] ?? '');
    let parsed: { murl?: unknown; t?: unknown; purl?: unknown };
    try {
      parsed = JSON.parse(raw) as typeof parsed;
    } catch {
      continue;
    }
    const url = typeof parsed.murl === 'string' ? parsed.murl.trim() : '';
    if (!/^https?:\/\//i.test(url) || seen.has(url)) continue;
    seen.add(url);
    results.push({
      url,
      title: typeof parsed.t === 'string' ? parsed.t : '',
      page: typeof parsed.purl === 'string' ? parsed.purl : '',
    });
    if (results.length >= 20) break;
  }
  return results;
}

/** 兼容旧测试/调用：只取 URL。 */
export function extractBingImageUrls(html: string): string[] {
  return extractBingResults(html).map((result) => result.url).slice(0, 8);
}

function relevance(result: BingImageResult, query: string): number {
  const text = `${result.title} ${result.page}`.toLowerCase();
  const terms = query.toLowerCase().split(/[\s,，、/]+/).filter((term) => term.length > 1);
  let score = 0;
  if (terms.length) {
    const hits = terms.filter((term) => text.includes(term)).length;
    if (hits === terms.length) score += 4;
    else if (hits > 0) score += 2;
    else return -10;
  }
  if (/wiki|wikipedia|fandom|biligame|bilibili|prts\.wiki|hoyolab|mihoyo|official/.test(result.page)) score += 1;
  if (/其他|素材|模板|广告|立即访问|成功男士|社交|更多选项/.test(result.title)) score -= 5;
  return score;
}

/** 拒绝本机/内网地址；http 图片升级成 https，升级不成就不要。 */
export function publicImageUrl(raw: string): URL | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (url.username || url.password) return null;
  if (url.protocol === 'http:') url.protocol = 'https:';
  const host = url.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) return null;
  const ip = isIP(host);
  if (ip === 4) {
    const parts = host.split('.').map(Number);
    const [a, b] = parts;
    if (a === 0 || a === 10 || a === 127) return null;
    if (a === 169 && b === 254) return null;
    if (a === 172 && b !== undefined && b >= 16 && b <= 31) return null;
    if (a === 192 && b === 168) return null;
    if (a === 100 && b !== undefined && b >= 64 && b <= 127) return null;
    if (a !== undefined && a >= 224) return null;
  }
  if (ip === 6) {
    if (host === '::1' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80')) return null;
  }
  return url;
}

async function fetchText(url: string, fetchImpl: typeof fetch): Promise<string> {
  const { signal, done } = timeoutSignal();
  try {
    const response = await fetchImpl(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.6',
        Accept: 'text/html,application/xhtml+xml,application/json',
      },
      signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } finally {
    done();
  }
}

async function downloadReference(url: string, referer: string, detail: string, fetchImpl: typeof fetch): Promise<ReferenceImage | null> {
  const target = publicImageUrl(url);
  if (!target) return null;
  const { signal, done } = timeoutSignal();
  try {
    const response = await fetchImpl(target, {
      headers: {
        'User-Agent': USER_AGENT,
        Referer: referer,
        Accept: 'image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8',
      },
      redirect: 'follow',
      signal,
    });
    if (!response.ok) return null;
    if (response.url) {
      const finalUrl = publicImageUrl(response.url);
      if (!finalUrl) return null;
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    return validateReference(bytes, 'search', detail);
  } catch {
    return null;
  } finally {
    done();
  }
}

async function wikipediaReference(query: string, fetchImpl: typeof fetch): Promise<ReferenceImage | null> {
  for (const lang of ['zh', 'en']) {
    try {
      const text = await fetchText(
        `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`,
        fetchImpl,
      );
      const parsed = JSON.parse(text) as {
        originalimage?: { source?: unknown };
        thumbnail?: { source?: unknown };
      };
      const src = parsed.originalimage?.source ?? parsed.thumbnail?.source;
      if (typeof src !== 'string') continue;
      const ref = await downloadReference(src, `https://${lang}.wikipedia.org/`, `Wikipedia 搜索「${query}」`, fetchImpl);
      if (ref) return ref;
    } catch {
      // 换下一个语言/来源。
    }
  }
  return null;
}

/** Bing 图片搜索取第一张能下载的；失败再试 Wikipedia。 */
export async function searchReference(query: string, fetchImpl: typeof fetch = fetch): Promise<ReferenceImage | null> {
  const q = query.replace(/\s+/g, ' ').trim().slice(0, 120);
  if (!q) return null;

  try {
    const html = await fetchText(
      `https://www.bing.com/images/search?q=${encodeURIComponent(q)}&form=HDRSC2&first=1&mkt=zh-CN&setlang=zh-hans&cc=CN`,
      fetchImpl,
    );
    const ranked = extractBingResults(html)
      .map((result) => ({ ...result, score: relevance(result, q) }))
      .filter((result) => result.score >= 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
    for (const result of ranked) {
      const ref = await downloadReference(result.url, 'https://www.bing.com/', `Bing 搜索「${q}」`, fetchImpl);
      if (ref) return ref;
    }
  } catch {
    // 搜索源不可用时试 Wikipedia。
  }
  return wikipediaReference(q, fetchImpl);
}

async function run(command: string, args: readonly string[], timeoutMs = 15_000): Promise<number> {
  return await new Promise<number>((resolve) => {
    let settled = false;
    const child = spawn(command, args, { windowsHide: true, stdio: 'ignore' });
    const done = (code: number): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(code);
    };
    const timer = setTimeout(() => {
      try { child.kill(); } catch { /* already gone */ }
      done(1);
    }, timeoutMs);
    timer.unref?.();
    child.on('error', () => done(1));
    child.on('exit', (code) => done(code ?? 1));
  });
}

/** 截当前主屏；只在本机 Windows/macOS 上实现。图只留在临时文件里，读完就删。 */
async function captureScreenOnce(dataDir: string): Promise<ReferenceImage | null> {
  if (process.platform !== 'win32' && process.platform !== 'darwin') return null;
  const dir = join(dataDir, 'tmp');
  const file = join(dir, `pet-draw-screen-${randomUUID()}.jpg`);
  try {
    mkdirSync(dir, { recursive: true });
    let code = 1;
    if (process.platform === 'win32') {
      const ps = join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
      const exe = existsSync(ps) ? ps : 'powershell.exe';
      const quoted = file.replace(/'/g, "''");
      const script = [
        'Add-Type -AssemblyName System.Windows.Forms',
        'Add-Type -AssemblyName System.Drawing',
        '$b=[System.Windows.Forms.Screen]::PrimaryScreen.Bounds',
        '$bmp=New-Object System.Drawing.Bitmap $b.Width,$b.Height',
        '$g=[System.Drawing.Graphics]::FromImage($bmp)',
        '$g.CopyFromScreen($b.Location,[System.Drawing.Point]::Empty,$b.Size)',
        `$bmp.Save('${quoted}',[System.Drawing.Imaging.ImageFormat]::Jpeg)`,
        '$g.Dispose(); $bmp.Dispose()',
      ].join('; ');
      code = await run(exe, ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-Command', script]);
    } else {
      code = await run('screencapture', ['-x', '-t', 'jpg', file]);
    }
    if (code !== 0 || !existsSync(file)) return null;
    const bytes = new Uint8Array(readFileSync(file));
    return validateReference(bytes, 'screen', '当前主屏截图');
  } catch {
    return null;
  } finally {
    try { unlinkSync(file); } catch { /* already gone */ }
  }
}

/** 截屏偶发 PowerShell 启动/桌面切换失败，重试一次再放弃。 */
export async function captureScreen(dataDir: string): Promise<ReferenceImage | null> {
  return (await captureScreenOnce(dataDir)) ?? (await captureScreenOnce(dataDir));
}

/** 解析这次要用的参考图；失败只影响参考，不影响画图。 */
export async function resolveReference(opts: ResolveReferenceOptions): Promise<ReferenceResolution> {
  if (opts.mode === 'none') return { ref: null, note: '没有用参考图，按文字画' };
  if (opts.attachment) {
    return { ref: { ...opts.attachment, source: 'attachment', detail: '对话里附的参考图' }, note: '参考图：对话里附的图' };
  }
  if (opts.path) {
    const file = referenceFromFile(opts.path);
    if (file) return { ref: file, note: `参考图：${file.detail}` };
    return { ref: null, note: `参考图文件没读到(${basename(opts.path)})，按文字画` };
  }

  const query = (opts.query ?? opts.name ?? '').trim();

  if (opts.mode === 'screen') {
    if (!opts.allowScreen) return { ref: null, note: '截图参考已关闭，按文字画' };
    const screen = await captureScreen(opts.dataDir);
    if (screen) return { ref: screen, note: `参考图：${screen.detail}` };
    if (!query) return { ref: null, note: '截图失败，按文字画' };
    // 截图失败再退回搜图。
  }

  if ((opts.mode === 'auto' || opts.mode === 'search' || opts.mode === 'screen') && query) {
    if (!opts.allowSearch) return { ref: null, note: '搜图参考已关闭，按文字画' };
    const found = await searchReference(query, opts.fetchImpl);
    if (found) return { ref: found, note: `参考图：${found.detail}` };
    return { ref: null, note: `没找到「${query}」的参考图，按文字画` };
  }

  return { ref: null, note: '没有可用的参考图，按文字画' };
}
