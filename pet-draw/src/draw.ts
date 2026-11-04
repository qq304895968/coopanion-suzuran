/**
 * 千问图像生成的最小客户端。只打同步文生图接口，只接受 512×512：
 * 模型、端点、尺寸都在这里写死，配置里没有地方能把它改成视频或高清图。
 */
export const QWEN_API_BASE = 'https://maas.qianwenaiapi.com/api/v1';
export const QWEN_IMAGE_MODEL = 'qwen-image-3.0';
export const DRAW_WIDTH = 512;
export const DRAW_HEIGHT = 512;
export const DRAW_SIZE = `${DRAW_WIDTH}*${DRAW_HEIGHT}`;
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const MAX_IMAGES_PER_CALL = 4;
export const DEFAULT_TIMEOUT_MS = 120_000;

export interface DrawRequest {
  apiKey: string;
  prompt: string;
  negativePrompt: string;
  /** 本次要几张；夹在 1–MAX_IMAGES_PER_CALL。 */
  count?: number;
  /** 可选参考图：作为图生图的输入，不改变输出 512×512。 */
  reference?: { bytes: Uint8Array; mime: string };
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
}

export interface DrawResult {
  bytes: Uint8Array;
  mime: string;
  width: number;
  height: number;
  fileName: string;
  requestId?: string;
}

export interface DrawBatch {
  images: DrawResult[];
  requestId?: string;
}

export type DrawErrorCode =
  | 'missing-key'
  | 'auth'
  | 'http'
  | 'network'
  | 'timeout'
  | 'aborted'
  | 'bad-response'
  | 'too-large'
  | 'unsupported-format'
  | 'download';

export class QwenDrawError extends Error {
  constructor(
    message: string,
    readonly code: DrawErrorCode,
    readonly opts: { requestId?: string; status?: number } = {},
  ) {
    super(message);
    this.name = 'QwenDrawError';
  }
}

const SAFE_MESSAGE_CHARS = 300;

/** 错误正文里不留下 Key，也不把整段 HTML 原样抛给模型。 */
export function safeMessage(input: unknown): string {
  const text = input instanceof Error ? input.message : String(input ?? '');
  return text
    .replace(/sk-[A-Za-z0-9._-]+/g, 'sk-***')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, SAFE_MESSAGE_CHARS);
}

interface ApiErrorFields {
  code?: string;
  message?: string;
  requestId?: string;
}

function apiErrorFields(body: string): ApiErrorFields {
  try {
    const parsed = JSON.parse(body) as {
      code?: unknown;
      message?: unknown;
      request_id?: unknown;
      requestId?: unknown;
    };
    return {
      code: typeof parsed.code === 'string' ? parsed.code : undefined,
      message: typeof parsed.message === 'string' ? parsed.message : undefined,
      requestId: typeof parsed.request_id === 'string'
        ? parsed.request_id
        : typeof parsed.requestId === 'string' ? parsed.requestId : undefined,
    };
  } catch {
    return {};
  }
}

interface SyncResponse {
  output?: {
    choices?: Array<{ message?: { content?: Array<{ image?: unknown; url?: unknown }> } }>;
    results?: Array<{ url?: unknown }>;
  };
  usage?: {
    output_width?: unknown;
    output_height?: unknown;
    width?: unknown;
    height?: unknown;
  };
  request_id?: unknown;
}

function imageUrlsOf(body: SyncResponse): string[] {
  const urls: string[] = [];
  for (const choice of body.output?.choices ?? []) {
    for (const part of choice.message?.content ?? []) {
      if (typeof part.image === 'string' && part.image) urls.push(part.image);
      else if (typeof part.url === 'string' && part.url) urls.push(part.url);
    }
  }
  for (const result of body.output?.results ?? []) {
    if (typeof result.url === 'string' && result.url) urls.push(result.url);
  }
  return [...new Set(urls)];
}

const ALLOWED_HOSTS = ['aliyuncs.com', 'qianwenai.com', 'qianwenaiapi.com'];

/** 只从千问/OSS 的地址取图，避免服务端返回任意 URL 时把请求带去别处。 */
export function isAllowedImageHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return ALLOWED_HOSTS.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

function readU32(bytes: Uint8Array, offset: number): number {
  return ((bytes[offset]! << 24) | (bytes[offset + 1]! << 16) | (bytes[offset + 2]! << 8) | bytes[offset + 3]!) >>> 0;
}

function startsWith(bytes: Uint8Array, sig: number[]): boolean {
  return sig.every((value, index) => bytes[index] === value);
}

const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** PNG / JPEG / WebP 的真实格式；GIF 与未知格式返回 null（动图一律不要）。 */
export function detectImageMime(bytes: Uint8Array): string | null {
  if (startsWith(bytes, PNG_SIG)) return 'image/png';
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
    && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) return 'image/webp';
  return null;
}

/** 不依赖图片库的尺寸读取；认不出返回 null。下载回来的图也要再核一次大小。 */
export function imageSize(bytes: Uint8Array): { width: number; height: number } | null {
  if (startsWith(bytes, PNG_SIG) && bytes.length >= 24) {
    return { width: readU32(bytes, 16), height: readU32(bytes, 20) };
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    let i = 2;
    while (i + 9 < bytes.length) {
      if (bytes[i] !== 0xff) { i += 1; continue; }
      const marker = bytes[i + 1]!;
      if (marker === 0xd8 || marker === 0xd9) { i += 2; continue; }
      if (marker === 0xda) break;
      const length = ((bytes[i + 2]! << 8) | bytes[i + 3]!) >>> 0;
      if (length < 2) return null;
      const isSof = marker >= 0xc0 && marker <= 0xcf
        && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isSof && i + 9 < bytes.length) {
        return {
          height: ((bytes[i + 5]! << 8) | bytes[i + 6]!) >>> 0,
          width: ((bytes[i + 7]! << 8) | bytes[i + 8]!) >>> 0,
        };
      }
      i += 2 + length;
    }
    return null;
  }
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
    && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
    && bytes.length >= 30
  ) {
    const kind = String.fromCharCode(bytes[12]!, bytes[13]!, bytes[14]!, bytes[15]!);
    if (kind === 'VP8X') {
      return {
        width: 1 + (bytes[24]! | (bytes[25]! << 8) | (bytes[26]! << 16)),
        height: 1 + (bytes[27]! | (bytes[28]! << 8) | (bytes[29]! << 16)),
      };
    }
    if (kind === 'VP8 ') {
      return {
        width: (bytes[26]! | (bytes[27]! << 8)) & 0x3fff,
        height: (bytes[28]! | (bytes[29]! << 8)) & 0x3fff,
      };
    }
    if (kind === 'VP8L') {
      const bits = (bytes[21]! | (bytes[22]! << 8) | (bytes[23]! << 16) | (bytes[24]! << 24)) >>> 0;
      return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
    }
  }
  return null;
}

function fileNameFor(mime: string, index: number, total: number, now = new Date()): string {
  const stamp = now.toISOString().replace(/[:.]/g, '-');
  const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
  return `pet-draw-${stamp}${total > 1 ? `-${index + 1}` : ''}.${ext}`;
}

function abortError(signal: AbortSignal): boolean {
  return signal.aborted;
}

interface DownloadContext {
  fetchImpl: typeof fetch;
  signal: AbortSignal;
  callerSignal?: AbortSignal;
  requestId?: string;
}

async function downloadImage(imageUrl: string, index: number, total: number, ctx: DownloadContext): Promise<DrawResult> {
  let url: URL;
  try {
    url = new URL(imageUrl);
  } catch {
    throw new QwenDrawError('千问返回的图片地址不合法。', 'bad-response', { requestId: ctx.requestId });
  }
  if (url.protocol !== 'https:' || !isAllowedImageHost(url.hostname)) {
    throw new QwenDrawError('千问返回的图片地址不在允许的域名里。', 'bad-response', { requestId: ctx.requestId });
  }

  let imageResponse: Response;
  try {
    imageResponse = await ctx.fetchImpl(url, { signal: ctx.signal, redirect: 'follow' });
  } catch (error) {
    if (abortError(ctx.signal)) {
      throw new QwenDrawError('画到一半停下了。', ctx.callerSignal?.aborted ? 'aborted' : 'timeout');
    }
    throw new QwenDrawError(`下载图片失败：${safeMessage(error)}`, 'download', { requestId: ctx.requestId });
  }
  if (!imageResponse.ok) {
    throw new QwenDrawError(`下载图片失败：HTTP ${imageResponse.status}。`, 'download', { requestId: ctx.requestId });
  }
  if (imageResponse.url) {
    try {
      const finalUrl = new URL(imageResponse.url);
      if (finalUrl.protocol !== 'https:' || !isAllowedImageHost(finalUrl.hostname)) {
        throw new QwenDrawError('图片被重定向到了不允许的域名。', 'download', { requestId: ctx.requestId });
      }
    } catch (error) {
      if (error instanceof QwenDrawError) throw error;
    }
  }

  const bytes = new Uint8Array(await imageResponse.arrayBuffer());
  if (bytes.byteLength === 0) throw new QwenDrawError('下载回来的图片是空的。', 'download', { requestId: ctx.requestId });
  if (bytes.byteLength > MAX_IMAGE_BYTES) {
    throw new QwenDrawError(`图片有 ${Math.round(bytes.byteLength / 1024)} KB，超过 4 MB，已丢弃。`, 'too-large', { requestId: ctx.requestId });
  }
  const mime = detectImageMime(bytes);
  if (!mime) {
    throw new QwenDrawError('下载回来的不是 PNG/JPEG/WebP 静图。', 'unsupported-format', { requestId: ctx.requestId });
  }
  const size = imageSize(bytes);
  if (!size || size.width <= 0 || size.height <= 0) {
    throw new QwenDrawError('读不出图片尺寸，已丢弃。', 'bad-response', { requestId: ctx.requestId });
  }
  if (size.width > DRAW_WIDTH || size.height > DRAW_HEIGHT) {
    throw new QwenDrawError(
      `图片实际是 ${size.width}×${size.height}，超过 512×512，已丢弃。`,
      'too-large',
      { requestId: ctx.requestId },
    );
  }

  return {
    bytes,
    mime,
    width: size.width,
    height: size.height,
    fileName: fileNameFor(mime, index, total),
    requestId: ctx.requestId,
  };
}

/**
 * 调一次千问同步文生图，下载全部图片并核对格式与尺寸。
 * 抛出的 QwenDrawError 只带有眼可读的中文说明、错误码和 request_id，不含 Key。
 */
export async function drawWithQwen(req: DrawRequest): Promise<DrawBatch> {
  if (!req.apiKey.trim()) throw new QwenDrawError('还没有配置千问 API Key。', 'missing-key');
  const count = Math.max(1, Math.min(MAX_IMAGES_PER_CALL, Math.trunc(req.count ?? 1)));
  const fetchImpl = req.fetchImpl ?? fetch;
  const controller = new AbortController();
  const abortFromCaller = (): void => controller.abort();
  if (req.signal?.aborted) controller.abort();
  else req.signal?.addEventListener('abort', abortFromCaller, { once: true });
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  timer.unref?.();

  try {
    let response: Response;
    try {
      response = await fetchImpl(`${QWEN_API_BASE}/services/aigc/multimodal-generation/generation`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${req.apiKey.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: QWEN_IMAGE_MODEL,
          input: {
            messages: [{
              role: 'user',
              content: [
                ...(req.reference
                  ? [{ image: `data:${req.reference.mime};base64,${Buffer.from(req.reference.bytes).toString('base64')}` }]
                  : []),
                { text: req.prompt },
              ],
            }],
          },
          parameters: {
            negative_prompt: req.negativePrompt,
            size: DRAW_SIZE,
            n: count,
            prompt_extend: false,
            watermark: false,
          },
        }),
        signal: controller.signal,
      });
    } catch (error) {
      if (abortError(controller.signal)) {
        throw new QwenDrawError('画到一半停下了。', req.signal?.aborted ? 'aborted' : 'timeout');
      }
      throw new QwenDrawError(`连不上千问：${safeMessage(error)}`, 'network');
    }

    const bodyText = await response.text();
    if (!response.ok) {
      const fields = apiErrorFields(bodyText);
      const code = response.status === 401 || response.status === 403 ? 'auth' : 'http';
      const detail = [fields.code, fields.message].filter(Boolean).join(' ');
      throw new QwenDrawError(
        `千问返回 ${response.status}${detail ? `：${safeMessage(detail)}` : ''}`,
        code,
        { requestId: fields.requestId, status: response.status },
      );
    }

    let parsed: SyncResponse;
    try {
      parsed = JSON.parse(bodyText) as SyncResponse;
    } catch {
      throw new QwenDrawError('千问回了看不懂的内容。', 'bad-response');
    }
    const requestId = typeof parsed.request_id === 'string' ? parsed.request_id : undefined;
    const imageUrls = imageUrlsOf(parsed).slice(0, count);
    if (!imageUrls.length) throw new QwenDrawError('千问没有返回图片地址。', 'bad-response', { requestId });

    const width = Number(parsed.usage?.output_width ?? parsed.usage?.width);
    const height = Number(parsed.usage?.output_height ?? parsed.usage?.height);
    if (Number.isFinite(width) && width > DRAW_WIDTH) {
      throw new QwenDrawError(`千问返回了 ${width} 像素宽的图，超过 512，已丢弃。`, 'too-large', { requestId });
    }
    if (Number.isFinite(height) && height > DRAW_HEIGHT) {
      throw new QwenDrawError(`千问返回了 ${height} 像素高的图，超过 512，已丢弃。`, 'too-large', { requestId });
    }

    const images = await Promise.all(imageUrls.map((url, index) =>
      downloadImage(url, index, imageUrls.length, {
        fetchImpl,
        signal: controller.signal,
        callerSignal: req.signal,
        requestId,
      })));

    return { images, requestId };
  } finally {
    clearTimeout(timer);
    req.signal?.removeEventListener('abort', abortFromCaller);
  }
}
