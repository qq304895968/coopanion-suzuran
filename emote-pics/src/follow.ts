/** 桌宠位置:优先截屏识别屏幕底部,失败再读部署 config.json;都不写盘。 */
import { execFile, spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';

export interface PetPositionSources {
  dataDir?: string;
  botDir?: string;
  repoRoot?: string;
}

export type PetPositionResult =
  | {
    ok: true;
    petX: number;
    source: 'screen' | 'screen-last' | 'config';
    file?: string;
    rememberPosition?: boolean;
    mtimeMs?: number;
    cached?: boolean;
    fields?: Record<string, unknown>;
    block?: PetBlock;
    stripTop?: number;
    estimatedBlockW?: number;
  }
  | { ok: false; reason: string; file?: string | null; mtimeMs?: number; cached?: boolean };

export interface DisplayRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface CapturedStrip {
  display: DisplayRect;
  width: number;
  height: number;
  /** Device pixel ratio used for the capture: bitmap pixels = CSS pixels × dpr. */
  dpr: number;
  /** 4 bytes per pixel, B G R A, rows top to bottom. */
  bgra: Buffer;
}

export interface PetCandidate {
  left: number;
  right: number;
  width: number;
  hits: number;
  petX: number;
  top: number;
  bottom: number;
  height: number;
}

export interface PetBlock {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PetFollow {
  petX: number;
  source: 'screen' | 'screen-last' | 'config';
  block?: PetBlock;
  /** Where the strip starts in the page's work-area coordinates. */
  stripTop?: number;
  /** Used only when a stale config value has no block. */
  estimatedBlockW?: number;
}

export interface PetScanStats {
  thresholdHits: number;
  maxColumnHits: number;
  maxBlockHits: number;
  maxBlockWidth: number;
  rejectedBottom: number;
  near: Array<{ x: number; y: number; w: number; h: number; hits: number; bottomOk: boolean }>;
}

/** The pet's block width measured on this machine; used only by the config fallback. */
export const ESTIMATED_BLOCK_W = 76;

export interface LocatedPet {
  petX: number;
  score: number;
  blockWidth: number;
  block: PetBlock;
  candidates: PetCandidate[];
}

/** Read `<deployment>/config.json`; `dataDir` is `<deployment>/data`. */
export class PetConfigPositionSource {
  private cache: {
    file: string;
    mtimeMs: number;
    size: number;
    result: PetPositionResult;
  } | null = null;

  constructor(private readonly roots: PetPositionSources) {}

  read(): PetPositionResult {
    const file = this.findConfig();
    if (!file) return { ok: false, reason: '找不到部署的 config.json', file: null };
    let stat;
    try {
      stat = statSync(file);
    } catch (err) {
      return { ok: false, reason: `读不到 config.json: ${message(err)}`, file };
    }
    if (this.cache && this.cache.file === file
      && this.cache.mtimeMs === stat.mtimeMs && this.cache.size === stat.size) {
      return { ...this.cache.result, cached: true };
    }
    let result: PetPositionResult;
    try {
      const raw = JSON.parse(readFileSync(file, 'utf8')) as unknown;
      result = { ...parsePetX(raw, file), mtimeMs: stat.mtimeMs, cached: false };
    } catch (err) {
      result = { ok: false, reason: `config.json 读不出来: ${message(err)}`, file, mtimeMs: stat.mtimeMs, cached: false };
    }
    this.cache = { file, mtimeMs: stat.mtimeMs, size: stat.size, result };
    return result;
  }

  private findConfig(): string | null {
    const candidates: string[] = [];
    const push = (path: string | null): void => {
      if (path && !candidates.includes(path)) candidates.push(path);
    };
    if (this.roots.dataDir) {
      push(join(this.roots.dataDir, '..', 'config.json'));
      push(join(this.roots.dataDir, 'config.json'));
      push(join(this.roots.dataDir, '..', '..', 'config.json'));
    }
    if (this.roots.botDir) push(join(this.roots.botDir, 'config.json'));
    if (this.roots.repoRoot) push(join(this.roots.repoRoot, 'config.json'));
    for (const path of candidates) {
      try {
        if (statSync(path).isFile()) return path;
      } catch {
        // try the next candidate
      }
    }
    return null;
  }
}

function parsePetX(raw: unknown, file: string): PetPositionResult {
  const worlds = (raw as { worlds?: unknown } | null)?.worlds;
  const section = (worlds as Record<string, unknown> | null | undefined)?.['desktop-pet'];
  if (section === null || typeof section !== 'object') {
    return { ok: false, reason: 'config.json 里没有 worlds.desktop-pet', file };
  }
  const setting = section as Record<string, unknown>;
  if (setting.rememberPosition === false) {
    return { ok: false, reason: '桌宠的 rememberPosition 是 false', file };
  }
  const petX = setting.petX;
  if (typeof petX !== 'number' || !Number.isFinite(petX) || petX < 0 || petX > 1) {
    return { ok: false, reason: 'desktop-pet.petX 不是 0~1 的数字', file };
  }
  return {
    ok: true,
    petX,
    source: 'config',
    file,
    rememberPosition: setting.rememberPosition !== false,
    fields: positionFields(setting),
  };
}

function positionFields(setting: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(setting)) {
    if (!/pet|position|stand|x|y|width|height/i.test(key)) continue;
    if (typeof value === 'number' || typeof value === 'boolean' || value === null) out[key] = value;
  }
  return out;
}

/** 截主屏工作区底部 260 CSS px;PowerShell 先切到物理像素,Dpr 一并带回。 */
export async function capturePrimaryStrip(): Promise<CapturedStrip> {
  const dir = mkdtempSync(join(tmpdir(), 'emote-pics-strip-'));
  const file = join(dir, 'strip.bmp');
  try {
    const body = '$wa=[System.Windows.Forms.Screen]::PrimaryScreen.WorkingArea; $screenLeft=$wa.Left; $screenTop=$wa.Top; $screenWidth=$wa.Width; $screenHeight=$wa.Height; $w=$wa.Width; $h=[int][Math]::Min([Math]::Round(260*$scale),$wa.Height); $left=$wa.Left; $top=$wa.Top+$wa.Height-$h';
    const stdout = await captureViaPowerShell(body, file);
    const { display, dpr } = parseCapture(stdout);
    const decoded = decodeBmp(readFileSync(file));
    return { display, dpr, ...decoded };
  } finally {
    try { rmSync(dir, { recursive: true, force: true }); } catch { /* temp cleanup is best effort */ }
  }
}

/** 截指定工作区的底部条带;入参是 CSS 矩形,输出仍是物理位图。 */
export async function captureStrip(display: DisplayRect): Promise<CapturedStrip> {
  const dir = mkdtempSync(join(tmpdir(), 'emote-pics-strip-'));
  const file = join(dir, 'strip.bmp');
  const cssH = Math.max(1, Math.min(260, Math.floor(display.height)));
  try {
    const body = `$screenLeft=[int][Math]::Round(${Math.floor(display.left)}*$scale); $screenTop=[int][Math]::Round(${Math.floor(display.top)}*$scale); $screenWidth=[int][Math]::Round(${Math.floor(display.width)}*$scale); $screenHeight=[int][Math]::Round(${Math.floor(display.height)}*$scale); $w=$screenWidth; $h=[int][Math]::Round(${cssH}*$scale); $left=$screenLeft; $top=[int][Math]::Round(${Math.floor(display.top + display.height - cssH)}*$scale)`;
    const stdout = await captureViaPowerShell(body, file);
    const { display: got, dpr } = parseCapture(stdout);
    const decoded = decodeBmp(readFileSync(file));
    return { display: got, dpr, ...decoded };
  } finally {
    try { rmSync(dir, { recursive: true, force: true }); } catch { /* temp cleanup is best effort */ }
  }
}

const POWERSHELL_READY = '__EMOTE_READY__';
const DPI_CS = 'using System; using System.Runtime.InteropServices; public static class EmotePicsDpi { '
  + '[DllImport("user32.dll")] public static extern bool SetProcessDpiAwarenessContext(IntPtr value); '
  + '[DllImport("user32.dll")] public static extern bool SetProcessDPIAware(); '
  + '[DllImport("user32.dll")] public static extern uint GetDpiForSystem(); }';

interface PendingCapture {
  resolve: (line: string) => void;
  reject: (err: Error) => void;
  timer: NodeJS.Timeout;
}

/** One long-lived PowerShell; Add-Type/csc runs once per process, not per screenshot. */
class PowerShellCapture {
  private proc: ChildProcessWithoutNullStreams | null = null;
  private ready: Promise<void> | null = null;
  private readyResolve: (() => void) | null = null;
  private readyReject: ((err: Error) => void) | null = null;
  private readyTimer: NodeJS.Timeout | null = null;
  private seq = 0;
  private pending = new Map<number, PendingCapture>();

  async capture(body: string, file: string): Promise<string> {
    await this.ensure();
    const id = ++this.seq;
    const command = `try { $dpi=[EmotePicsDpi]::GetDpiForSystem(); if($dpi -lt 96){ $dpi=96 }; $scale=$dpi/96.0; ${body}; `
      + `$bmp=New-Object System.Drawing.Bitmap($w,$h); $g=[System.Drawing.Graphics]::FromImage($bmp); `
      + `$g.CopyFromScreen($left,$top,0,0,$bmp.Size); $bmp.Save('${escapePowerShell(file)}',[System.Drawing.Imaging.ImageFormat]::Bmp); `
      + '$g.Dispose(); $bmp.Dispose(); '
      + `Write-Output ("__EMOTE_DONE__${id} " + ("{0},{1},{2},{3},{4},{5},{6},{7},{8}" -f $left,$top,$w,$h,$dpi,$screenLeft,$screenTop,$screenWidth,$screenHeight)) `
      + `} catch { Write-Output ("__EMOTE_ERR__${id} " + $_.Exception.Message) }`;
    return this.send(command, id);
  }

  dispose(): void {
    this.kill(new Error('powershell capture stopped'));
  }

  private async ensure(): Promise<void> {
    if (this.proc && this.ready) return this.ready;
    this.start();
    return this.ready!;
  }

  private start(): void {
    const proc = spawn('powershell.exe', [
      '-NoProfile', '-ExecutionPolicy', 'Bypass', '-NoExit', '-Command', '-',
    ], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    this.proc = proc;
    const lines = createInterface({ input: proc.stdout });
    lines.on('line', (line) => this.onLine(line));
    proc.stderr.on('data', () => { /* keep stderr from filling the pipe */ });
    proc.on('error', (err) => this.onExit(err));
    proc.on('exit', () => this.onExit(new Error('powershell exited')));
    this.ready = new Promise<void>((resolve, reject) => {
      this.readyResolve = resolve;
      this.readyReject = reject;
    });
    this.readyTimer = setTimeout(() => {
      this.kill(new Error('powershell init timeout'));
    }, 15_000);
    const init = `try { Add-Type -TypeDefinition '${escapePowerShell(DPI_CS)}'; `
      + '$ok=[EmotePicsDpi]::SetProcessDpiAwarenessContext([IntPtr](-4)); '
      + 'if(-not $ok){ [EmotePicsDpi]::SetProcessDPIAware() | Out-Null }; '
      + '$dpi=[EmotePicsDpi]::GetDpiForSystem(); if($dpi -lt 96){ $dpi=96 }; $scale=$dpi/96.0; '
      + 'Add-Type -AssemblyName System.Drawing; Add-Type -AssemblyName System.Windows.Forms; '
      + `Write-Output '${POWERSHELL_READY}' `
      + '} catch { Write-Output ("__EMOTE_INIT_ERR__ " + $_.Exception.Message) }';
    try {
      proc.stdin.write(init + '\n');
    } catch (err) {
      this.kill(captureError('powershell init', err));
    }
  }

  private onLine(line: string): void {
    if (line.trim() === POWERSHELL_READY) {
      if (this.readyTimer) clearTimeout(this.readyTimer);
      this.readyTimer = null;
      this.readyResolve?.();
      this.readyResolve = null;
      this.readyReject = null;
      return;
    }
    if (line.startsWith('__EMOTE_INIT_ERR__ ')) {
      this.kill(new Error(line.slice('__EMOTE_INIT_ERR__ '.length) || 'powershell init failed'));
      return;
    }
    const done = /^__EMOTE_DONE__(\d+) (.*)$/.exec(line);
    if (done) {
      const id = Number(done[1]);
      const pending = this.pending.get(id);
      if (!pending) return;
      this.pending.delete(id);
      clearTimeout(pending.timer);
      pending.resolve(done[2]!);
      return;
    }
    const failed = /^__EMOTE_ERR__(\d+) (.*)$/.exec(line);
    if (failed) {
      const id = Number(failed[1]);
      const pending = this.pending.get(id);
      if (!pending) return;
      this.pending.delete(id);
      clearTimeout(pending.timer);
      pending.reject(new Error(failed[2] || 'powershell capture failed'));
    }
  }

  private send(command: string, id: number): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.kill(new Error('powershell capture timeout'));
      }, 5_000);
      this.pending.set(id, { resolve, reject, timer });
      try {
        this.proc!.stdin.write(command + '\n');
      } catch (err) {
        const pending = this.pending.get(id);
        if (pending) {
          this.pending.delete(id);
          clearTimeout(pending.timer);
          pending.reject(captureError('powershell write', err));
        }
      }
    });
  }

  private onExit(err: Error): void {
    const proc = this.proc;
    this.proc = null;
    this.ready = null;
    if (this.readyTimer) clearTimeout(this.readyTimer);
    this.readyTimer = null;
    this.readyReject?.(err);
    this.readyReject = null;
    this.readyResolve = null;
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(err);
    }
    this.pending.clear();
    if (proc && !proc.killed) proc.kill();
  }

  private kill(err: Error): void {
    const proc = this.proc;
    this.proc = null;
    this.ready = null;
    if (this.readyTimer) clearTimeout(this.readyTimer);
    this.readyTimer = null;
    this.readyReject?.(err);
    this.readyReject = null;
    this.readyResolve = null;
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(err);
    }
    this.pending.clear();
    if (!proc) return;
    const pid = proc.pid;
    try { proc.kill(); } catch { /* already gone */ }
    if (typeof pid === 'number') {
      execFile('taskkill', ['/PID', String(pid), '/T', '/F'], { windowsHide: true }, () => { /* best effort */ });
    }
  }
}

let powerShellCapture: PowerShellCapture | null = null;

async function captureViaPowerShell(body: string, file: string): Promise<string> {
  if (!powerShellCapture) powerShellCapture = new PowerShellCapture();
  return powerShellCapture.capture(body, file);
}

export function disposeCaptureChannel(): void {
  powerShellCapture?.dispose();
  powerShellCapture = null;
}

/** BMP header + bottom-up rows to top-down BGRA. */
export function decodeBmp(bytes: Buffer): { width: number; height: number; bgra: Buffer } {
  if (bytes.length < 54 || bytes.toString('ascii', 0, 2) !== 'BM') throw new Error('不是 BMP');
  const offset = bytes.readUInt32LE(10);
  const width = bytes.readInt32LE(18);
  const rawHeight = bytes.readInt32LE(22);
  const bpp = bytes.readUInt16LE(28);
  const height = Math.abs(rawHeight);
  if (width <= 0 || height <= 0) throw new Error('BMP 尺寸无效');
  if (bpp !== 24 && bpp !== 32) throw new Error(`不支持的 BMP 位深 ${bpp}`);
  const bytesPerPixel = bpp / 8;
  const rowSize = Math.floor((bpp * width + 31) / 32) * 4;
  if (offset + rowSize * height > bytes.length) throw new Error('BMP 数据不完整');
  const bgra = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const srcRow = rawHeight > 0 ? height - 1 - y : y;
    for (let x = 0; x < width; x += 1) {
      const src = offset + srcRow * rowSize + x * bytesPerPixel;
      const dst = (y * width + x) * 4;
      bgra[dst] = bytes[src]!;
      bgra[dst + 1] = bytes[src + 1]!;
      bgra[dst + 2] = bytes[src + 2]!;
      bgra[dst + 3] = 255;
    }
  }
  return { width, height, bgra };
}

/** 用 DeepSeek 蓝阈值扫列,返回最可信的候选。 */
export function locatePet(
  bgra: Buffer,
  width: number,
  height: number,
  priorPetX?: number,
  stats?: PetScanStats,
): LocatedPet | null {
  if (width <= 0 || height <= 0 || bgra.length < width * height * 4) return null;
  if (stats) {
    stats.thresholdHits = 0;
    stats.maxColumnHits = 0;
    stats.maxBlockHits = 0;
    stats.maxBlockWidth = 0;
    stats.rejectedBottom = 0;
    stats.near = [];
  }
  const step = 2;
  const columns = new Uint32Array(width);
  const tops = new Uint32Array(width).fill(height);
  const bottoms = new Int32Array(width).fill(-1);
  for (let x = 0; x < width; x += step) {
    let hits = 0;
    for (let y = 0; y < height; y += 1) {
      const i = (y * width + x) * 4;
      const b = bgra[i]!;
      if (b <= 140) continue;
      const g = bgra[i + 1]!;
      const r = bgra[i + 2]!;
      const nearAnchor = Math.abs(r - 77) <= 60
        && Math.abs(g - 107) <= 60
        && Math.abs(b - 254) <= 60;
      // The figure's shaded hair is darker than the anchor; still blue-dominant, never white/gray.
      const blueish = b > r + 20 && b > g + 10;
      if ((nearAnchor || blueish) && b > r && b > g) {
        hits += 1;
        if (y < tops[x]!) tops[x] = y;
        if (y > bottoms[x]!) bottoms[x] = y;
      }
    }
    columns[x] = hits;
    if (stats) {
      stats.thresholdHits += hits;
      if (hits > stats.maxColumnHits) stats.maxColumnHits = hits;
    }
  }
  const candidates: PetCandidate[] = [];
  let start = -1;
  let last = -1;
  let hits = 0;
  let blockTop = height;
  let blockBottom = -1;
  const flush = (): void => {
    if (start < 0) return;
    const right = Math.min(width - 1, last + step - 1);
    const block = {
      left: start,
      right,
      width: right - start + 1,
      hits,
      petX: 0,
      top: blockTop,
      bottom: blockBottom,
      height: Math.max(0, blockBottom - blockTop + 1),
    };
    if (stats) {
      if (hits > stats.maxBlockHits) stats.maxBlockHits = hits;
      if (block.width > stats.maxBlockWidth) stats.maxBlockWidth = block.width;
      if (block.width >= 20) {
        stats.near.push({
          x: block.left,
          y: block.top,
          w: block.width,
          h: block.height,
          hits: block.hits,
          bottomOk: block.top + block.height >= height * 0.7,
        });
      }
    }
    if (block.width >= 20 && block.width <= 400 && block.hits >= 600) {
      if (block.top + block.height < height * 0.7) {
        if (stats) stats.rejectedBottom += 1;
      } else {
        block.petX = round01(((block.left + block.right) / 2) / width);
        candidates.push(block);
      }
    }
    start = -1;
    last = -1;
    hits = 0;
    blockTop = height;
    blockBottom = -1;
  };
  for (let x = 0; x < width; x += step) {
    if (columns[x]! > 0) {
      if (start < 0) start = x;
      else if (x - last > 8) flush();
      if (start < 0) start = x;
      last = x;
      hits += columns[x]!;
      if (tops[x]! < blockTop) blockTop = tops[x]!;
      if (bottoms[x]! > blockBottom) blockBottom = bottoms[x]!;
    }
  }
  flush();
  if (!candidates.length) return null;
  let best = candidates[0]!;
  if (typeof priorPetX === 'number' && Number.isFinite(priorPetX)) {
    best = candidates.reduce((a, b) => Math.abs(a.petX - priorPetX) <= Math.abs(b.petX - priorPetX) ? a : b);
  } else {
    best = candidates.reduce((a, b) => a.hits >= b.hits ? a : b);
  }
  return {
    petX: best.petX,
    score: best.hits,
    blockWidth: best.width,
    block: { x: best.left, y: best.top, w: best.width, h: best.height },
    candidates,
  };
}

/** 截屏来源:成功/失败都缓存 2.5 秒,并做单飞;同一时刻只允许一次截屏。 */
export class PetScreenPositionSource {
  private cache: { at: number; result: PetPositionResult } | null = null;
  private lastPetX: number | undefined;
  private inflight: Promise<PetPositionResult> | null = null;
  private generation = 0;

  constructor(private readonly opts: {
    now?: () => number;
    log?: (message: string) => void;
    capture?: () => Promise<CapturedStrip>;
  } = {}) {}

  async read(): Promise<PetPositionResult> {
    if (process.platform !== 'win32') return { ok: false, reason: '屏幕识别只支持 Windows' };
    const now = this.opts.now?.() ?? Date.now();
    if (this.cache && now - this.cache.at < 2_500) return this.cache.result;
    if (this.inflight) return this.inflight;
    const run = this.capture(now, this.generation);
    const wrapped = run.finally(() => {
      if (this.inflight === wrapped) this.inflight = null;
    });
    this.inflight = wrapped;
    return wrapped;
  }

  dispose(): void {
    this.generation += 1;
    this.inflight = null;
    this.cache = null;
    disposeCaptureChannel();
  }

  private async capture(now: number, generation: number): Promise<PetPositionResult> {
    const started = now;
    try {
      const strip = await (this.opts.capture ?? capturePrimaryStrip)();
      const dpr = strip.dpr > 0 ? strip.dpr : 1;
      const cssW = strip.width / dpr;
      const cssH = strip.height / dpr;
      const stats: PetScanStats = {
        thresholdHits: 0,
        maxColumnHits: 0,
        maxBlockHits: 0,
        maxBlockWidth: 0,
        rejectedBottom: 0,
        near: [],
      };
      const found = locatePet(strip.bgra, strip.width, strip.height, this.lastPetX, stats);
      if (!found) {
        const near = [...stats.near]
          .sort((a, b) => b.hits - a.hits)
          .slice(0, 3)
          .map((c) => `(x=${round2(c.x / dpr)},y=${round2(c.y / dpr)},w=${round2(c.w / dpr)},h=${round2(c.h / dpr)},hits=${c.hits},bottom=${c.bottomOk})`)
          .join(', ');
        this.opts.log?.(
          `follow-source: screen no-block strip=${strip.width}x${strip.height}px physical css=${Math.round(cssW)}x${Math.round(cssH)} dpr=${dpr}@screen(physical ${strip.display.left},${strip.display.top + strip.display.height - strip.height}; css ${round2(strip.display.left / dpr)},${round2((strip.display.top + strip.display.height - strip.height) / dpr)}) near=[${near}] thresholdHits=${stats.thresholdHits} maxColumn=${stats.maxColumnHits} maxBlock=${stats.maxBlockHits}/${stats.maxBlockWidth} rejectedBottom=${stats.rejectedBottom} (need hits>=600 width 20..400; bottom y+h>=70% stripH)`,
        );
        const failed: PetPositionResult = { ok: false, reason: '屏幕底部没有找到符合阈值的蓝色块' };
        if (generation === this.generation) this.cache = { at: now, result: failed };
        return failed;
      }
      const stripTop = (strip.display.height - strip.height) / dpr;
      const block = {
        x: found.block.x / dpr,
        y: found.block.y / dpr,
        w: found.block.w / dpr,
        h: found.block.h / dpr,
      };
      const result: PetPositionResult = {
        ok: true,
        petX: found.petX,
        source: 'screen',
        block,
        stripTop,
      };
      if (generation === this.generation) {
        this.cache = { at: now, result };
        this.lastPetX = found.petX;
      }
      const elapsed = (this.opts.now?.() ?? Date.now()) - started;
      if (elapsed > 200) this.opts.log?.(`截屏识别耗时 ${elapsed} ms`);
      const sorted = [...found.candidates].sort((a, b) => b.hits - a.hits);
      const top3 = sorted
        .slice(0, 3)
        .map((c, index) => `#${index + 1}(x=${round2(c.left / dpr)},y=${round2(c.top / dpr)},w=${round2(c.width / dpr)},h=${round2(c.height / dpr)},hits=${c.hits})`)
        .join(', ');
      const chosenIndex = sorted.findIndex((c) => c.left === found.block.x
        && c.top === found.block.y && c.width === found.block.w && c.height === found.block.h) + 1;
      this.opts.log?.(
        `follow-source: screen petX=${found.petX} candidates=[${top3}] chosen=#${chosenIndex} thresh=hits>=600 width 20..400 bottom>=70% strip=${strip.width}x${strip.height}px physical css=${Math.round(cssW)}x${Math.round(cssH)} dpr=${dpr}@screen(physical ${strip.display.left},${strip.display.top + strip.display.height - strip.height}; css ${round2(strip.display.left / dpr)},${round2((strip.display.top + strip.display.height - strip.height) / dpr)}) block=(x=${round2(block.x)},y=${round2(block.y)},w=${round2(block.w)},h=${round2(block.h)}) stripTop=${round2(stripTop)} space=physical-bitmap/css-result config=not-read`,
      );
      return result;
    } catch (err) {
      const reason = message(err);
      this.opts.log?.(`follow-source: screen failed: ${reason}`);
      const failed: PetPositionResult = { ok: false, reason: `截屏失败: ${reason}` };
      if (generation === this.generation) this.cache = { at: now, result: failed };
      return failed;
    }
  }
}

/** config 里的 petX 只有最近一分钟内写过才优先信;更旧就截屏校正,避免永远跟过期位置。 */
const CONFIG_FRESH_MS = 60_000;

/** config 新鲜优先 → 截屏 → 3 秒内上次成功值 → config 兜底 → 失败。 */
export class PetPositionResolver {
  private lastScreen: { petX: number; at: number; block?: PetBlock; stripTop?: number } | null = null;

  constructor(
    private readonly screen: PetScreenPositionSource,
    private readonly config: PetConfigPositionSource,
    private readonly opts: { now?: () => number; log?: (message: string) => void } = {},
  ) {}

  async read(): Promise<PetPositionResult> {
    const now = this.opts.now?.() ?? Date.now();
    // config has its own mtime+size cache; trust it only while its petX is recent.
    const config = this.config.read();
    const configAge = config.ok && typeof config.mtimeMs === 'number'
      ? now - config.mtimeMs
      : Number.POSITIVE_INFINITY;
    if (config.ok && configAge <= CONFIG_FRESH_MS) {
      this.opts.log?.(
        `follow-source: config petX=${config.petX} file=${config.file ?? '?'} mtimeMs=${config.mtimeMs ?? '?'} ageMs=${Math.round(configAge)} cached=${config.cached === true} fields=${JSON.stringify(config.fields ?? {})} estimatedBlockW=${ESTIMATED_BLOCK_W} reason=config-fresh`,
      );
      return { ...config, estimatedBlockW: ESTIMATED_BLOCK_W };
    }
    const shot = await this.screen.read();
    if (shot.ok) {
      this.lastScreen = { petX: shot.petX, at: now, block: shot.block, stripTop: shot.stripTop };
      return shot;
    }
    if (this.lastScreen && now - this.lastScreen.at <= 3_000) {
      this.opts.log?.(
        `follow-source: screen-last petX=${this.lastScreen.petX} ageMs=${now - this.lastScreen.at} reason=${shot.reason}`,
      );
      return {
        ok: true,
        petX: this.lastScreen.petX,
        source: 'screen-last',
        block: this.lastScreen.block,
        stripTop: this.lastScreen.stripTop,
      };
    }
    if (config.ok) {
      this.opts.log?.(
        `follow-source: config petX=${config.petX} file=${config.file ?? '?'} mtimeMs=${config.mtimeMs ?? '?'} cached=${config.cached === true} fields=${JSON.stringify(config.fields ?? {})} estimatedBlockW=${ESTIMATED_BLOCK_W} reason=${shot.reason}`,
      );
      return { ...config, estimatedBlockW: ESTIMATED_BLOCK_W };
    }
    this.opts.log?.(`follow-source: config failed: ${config.reason}${config.file ? ` file=${config.file}` : ''}`);
    return { ok: false, reason: `截屏: ${shot.reason}; config: ${config.reason}` };
  }

  dispose(): void {
    this.screen.dispose();
  }
}

function parseCapture(stdout: unknown): { display: DisplayRect; dpr: number } {
  const text = typeof stdout === 'string' ? stdout.trim() : '';
  const parts = text.split(',').map(Number);
  if (parts.length !== 9 || parts.some((value) => !Number.isFinite(value))) {
    throw new Error(`截图脚本没有返回条带/工作区/DPI: ${text.slice(0, 160)}`);
  }
  const dpi = parts[4]!;
  if (dpi < 96 || dpi > 480) throw new Error(`截图 DPI 异常: ${dpi}`);
  return {
    display: { left: parts[5]!, top: parts[6]!, width: parts[7]!, height: parts[8]! },
    dpr: dpi / 96,
  };
}

function escapePowerShell(value: string): string {
  return value.replace(/'/g, "''");
}

function captureError(stage: string, err: unknown): Error {
  const e = err as { name?: string; message?: string; stderr?: string; code?: number };
  const detail = e.stderr ? ` stderr=${e.stderr.slice(-300)}` : '';
  return new Error(`${stage}: ${e.name ?? 'Error'}: ${e.message ?? String(err)}${detail}`);
}

function round01(value: number): number {
  return Math.round(Math.min(1, Math.max(0, value)) * 100) / 100;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
