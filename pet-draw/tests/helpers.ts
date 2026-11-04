import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ToolCallContext, ToolOutcome } from 'cortico/core/types.ts';
import { PET_DRAW_DEFAULTS, type PetDrawConfigSection } from '../src/config.ts';
import type { PopupLike } from '../src/popup.ts';
import { PetDrawWorld } from '../src/world.ts';

export function pngBytes(width = 512, height = 512): Uint8Array {
  const bytes = new Uint8Array(33);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  bytes.set([0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52], 8);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  bytes.set([0x08, 0x06, 0x00, 0x00, 0x00], 24);
  return bytes;
}

/** 最小 JPEG 头：SOI + APP0 + SOF0，足够让尺寸解析读到 width/height。 */
export function jpegBytes(width = 512, height = 512): Uint8Array {
  const app0 = [0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00];
  const sof0 = [
    0xff, 0xc0, 0x00, 0x11, 0x08,
    (height >> 8) & 0xff, height & 0xff,
    (width >> 8) & 0xff, width & 0xff,
    0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
  ];
  return new Uint8Array([0xff, 0xd8, ...app0, ...sof0, 0xff, 0xd9]);
}

export function gifBytes(): Uint8Array {
  return new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00]);
}

export interface FetchCall {
  url: string;
  init?: RequestInit;
}

export interface FakeQwen {
  fetchImpl: typeof fetch;
  calls: FetchCall[];
  bytes: Uint8Array;
}

/** 同步生图 + 图片下载 + 额度/价格查询都能答的假 fetch。 */
export function fakeQwen(opts: {
  bytes?: Uint8Array;
  imageUrl?: string;
  imageUrls?: string[];
  usage?: { output_width?: number; output_height?: number };
  status?: number;
  errorBody?: unknown;
  requestId?: string;
  quotaStatus?: number;
  modelsStatus?: number;
} = {}): FakeQwen {
  const bytes = opts.bytes ?? pngBytes();
  const calls: FetchCall[] = [];
  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    calls.push({ url, init });
    if (url.includes('/api/v1/quotas')) {
      const status = opts.quotaStatus ?? 200;
      if (status >= 400) return new Response('quota unavailable', { status });
      return new Response(JSON.stringify({
        output: {
          quotas: [{
            model: 'qwen-image-3.0',
            model_limit: {
              request_limit: 2,
              request_limit_period: 6,
              async_user_queue_limit: 200,
              async_user_concurrency_limit: 10,
            },
          }],
        },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (url.includes('/api/v1/models')) {
      const status = opts.modelsStatus ?? 200;
      if (status >= 400) return new Response('models unavailable', { status });
      return new Response(JSON.stringify({
        output: {
          models: [{
            model: 'qwen-image-3.0',
            prices: [{ prices: [{ type: 'qima_output_1k', price: '0.18' }] }],
          }],
        },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (url.includes('/services/aigc/multimodal-generation/generation')) {
      const status = opts.status ?? 200;
      if (status >= 400) {
        return new Response(JSON.stringify(opts.errorBody ?? { code: 'InvalidParameter', message: 'bad request' }), {
          status,
          headers: { 'content-type': 'application/json' },
        });
      }
      const body = JSON.parse(String(init?.body ?? '{}')) as { parameters?: { n?: number } };
      const count = Math.max(1, Math.min(4, Number(body.parameters?.n) || 1));
      const images = opts.imageUrls?.length
        ? opts.imageUrls.slice(0, count)
        : Array.from({ length: count }, (_, index) =>
            `${opts.imageUrl ?? 'https://dashscope-result.oss-accelerate.aliyuncs.com/draw'}-${index + 1}.png`);
      return new Response(JSON.stringify({
        request_id: opts.requestId ?? 'req-1',
        output: { choices: images.map((image) => ({ message: { content: [{ image }] } })) },
        usage: opts.usage ?? { output_width: 512, output_height: 512, output_image_count: count },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    return new Response(bytes, { status: 200, headers: { 'content-type': 'image/png' } });
  }) as typeof fetch;
  return { fetchImpl, calls, bytes };
}

export function fakeCtx(signal?: AbortSignal): ToolCallContext {
  const log = {
    trace: () => undefined,
    debug: () => undefined,
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined,
    emit: () => undefined,
    child: () => log,
  };
  return { role: 'test', log, signal };
}

export interface MadeWorld {
  world: PetDrawWorld;
  cfg: PetDrawConfigSection;
  dataDir: string;
}

export function makeWorld(opts: {
  cfg?: Partial<PetDrawConfigSection>;
  secret?: string;
  fetchImpl?: typeof fetch;
  persist?: (patch: Partial<PetDrawConfigSection>) => void;
  popup?: PopupLike;
  now?: () => Date;
  dataDir?: string;
  botDir?: string;
} = {}): MadeWorld {
  const dataDir = opts.dataDir ?? mkdtempSync(join(tmpdir(), 'pet-draw-test-'));
  const cfg: PetDrawConfigSection = { ...PET_DRAW_DEFAULTS, ...opts.cfg };
  const world = new PetDrawWorld({
    cfg,
    timezone: 'Asia/Shanghai',
    dataDir,
    botDir: opts.botDir ?? dataDir,
    botName: '铃兰',
    secret: () => opts.secret ?? 'sk-test-key',
    persist: opts.persist,
    popup: opts.popup ?? { showData: async () => true },
    fetchImpl: opts.fetchImpl,
    now: opts.now,
  });
  return { world, cfg, dataDir };
}

export function getTool(world: PetDrawWorld, name: string) {
  const tool = world.tools().find((entry) => entry.name === name);
  if (!tool) throw new Error(`${name} tool is missing`);
  return tool;
}

export function drawTool(world: PetDrawWorld) {
  return getTool(world, 'pet_draw');
}

export async function callTool(
  world: PetDrawWorld,
  name: string,
  args: Record<string, unknown>,
  ctx: ToolCallContext = fakeCtx(),
): Promise<ToolOutcome> {
  const result = await getTool(world, name).handler(args, ctx);
  return typeof result === 'string' ? { text: result } : result;
}

export async function callDraw(
  world: PetDrawWorld,
  subject: string,
  ctx: ToolCallContext = fakeCtx(),
  args: Record<string, unknown> = {},
): Promise<ToolOutcome> {
  return callTool(world, 'pet_draw', { subject, ...args }, ctx);
}
