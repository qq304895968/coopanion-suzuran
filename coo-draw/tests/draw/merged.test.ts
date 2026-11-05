/**
 * 合并层的行为测试：路由、人设本地出图、参考图 describe 流程、配置迁移与工作流约束。
 * 用假的 ComfyUI 客户端，不碰真网络。
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { EventEnvelope, ToolCallContext, ToolOutcome, WorldHost } from 'cortico/core/types.ts';
import { DRAW_DEFAULTS, legacyMigrationPatch, type DrawConfigSection } from '../../src/config.ts';
import { DrawWorld } from '../../src/world.ts';
import type { ComfyApi, ComfyHistoryEntry, ComfyImage, ComfyImageRef, ComfyPromptResult } from '../../src/local/comfy.ts';
import type { ComfyHealth } from '../../src/local/types.ts';
import type { Workflow } from '../../src/local/workflow.ts';
import { injectSplitLoRAs, personaTxt2Img, withImg2Img } from '../../src/local/persona-workflow.ts';
import { buildLocalPersonaPrompt, parsePersonaLoras } from '../../src/persona-local.ts';
import { profileFor } from '../../src/api/style.ts';

const roots: string[] = [];
function root(): string {
  const dir = mkdtempSync(join(tmpdir(), 'coo-draw-test-'));
  roots.push(dir);
  return dir;
}
afterEach(() => {
  for (const dir of roots.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function pngBytes(): Uint8Array {
  const bytes = new Uint8Array(33);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  bytes.set([0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52], 8);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, 512);
  view.setUint32(20, 512);
  bytes.set([0x08, 0x06, 0x00, 0x00, 0x00], 24);
  return bytes;
}

const log = {
  trace: () => undefined,
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
  emit: () => undefined,
  child: () => log,
};

function fakeHost(pushed: EventEnvelope[]): WorldHost {
  return {
    pushEvent: async (event: Parameters<WorldHost['pushEvent']>[0]) => {
      const saved = { ...event, cursor: pushed.length + 1, origin: event.origin ?? 'external' } as EventEnvelope;
      pushed.push(saved);
      return saved;
    },
    log,
    store: {} as never,
    drainPendingEvents: async () => [],
    blob: (handle: string) => (handle === 'log:ref' ? { bytes: pngBytes(), mime: 'image/png' } : null),
    reportUsage: () => undefined,
    modelFacts: { model: () => 'test', accepts: () => true, contextWindow: () => undefined },
  } as unknown as WorldHost;
}

function fakeComfy(): ComfyApi & { submitted: Array<Record<string, unknown>> } {
  const submitted: Array<Record<string, unknown>> = [];
  const api = {
    submitted,
    health: async (): Promise<ComfyHealth> => ({ ok: true, url: 'http://fake', checked_at: 1 }),
    systemStats: async () => ({ system: { comfyui_version: 'test' }, devices: [] }),
    objectInfo: async () => ({}),
    checkpoints: async () => [],
    loras: async () => [],
    controlNets: async () => [],
    samplers: async () => ['euler'],
    schedulers: async () => ['simple'],
    submit: async (workflow: Record<string, unknown>): Promise<ComfyPromptResult> => {
      submitted.push(workflow);
      return { prompt_id: 'p1' };
    },
    history: async (): Promise<ComfyHistoryEntry> => ({
      outputs: { '9': { images: [{ filename: 'draw-persona_0001.png', type: 'output' }] } },
      status: { status_str: 'success', completed: true },
    }),
    view: async (ref: ComfyImageRef): Promise<ComfyImage> => ({ bytes: pngBytes(), mime: 'image/png', ref }),
    uploadImage: async () => 'uploaded.png',
    interrupt: async () => undefined,
    cancel: async () => undefined,
    watch: () => ({ dispose: () => undefined }),
    close: () => undefined,
  };
  return api as unknown as ComfyApi & { submitted: Array<Record<string, unknown>> };
}

interface MadeDraw {
  world: DrawWorld;
  cfg: DrawConfigSection;
  pushed: EventEnvelope[];
  comfy: ReturnType<typeof fakeComfy>;
  popups: string[];
  persists: Array<Partial<DrawConfigSection>>;
  dataDir: string;
}

function makeDraw(overrides: Partial<DrawConfigSection> = {}): MadeDraw {
  const dataDir = root();
  const pushed: EventEnvelope[] = [];
  const popups: string[] = [];
  const persists: Array<Partial<DrawConfigSection>> = [];
  const cfg: DrawConfigSection = {
    ...DRAW_DEFAULTS,
    enabled: true,
    dailyLimit: 10,
    cooldownSeconds: 0,
    popupEnabled: true,
    ...overrides,
  };
  const comfy = fakeComfy();
  const world = new DrawWorld({
    cfg,
    timezone: 'Asia/Shanghai',
    dataDir,
    botDir: dataDir,
    botName: '铃兰',
    secret: () => 'sk-test',
    persist: (patch: Partial<DrawConfigSection>) => { persists.push(patch); Object.assign(cfg, patch); },
    popup: { showData: async (dataUrl: string) => { popups.push(dataUrl); return true; } },
    clientFactory: () => comfy,
    now: () => new Date('2026-11-03T12:00:00+08:00'),
  });
  return { world, cfg, pushed, comfy, popups, persists, dataDir };
}

function ctx(signal?: AbortSignal): ToolCallContext {
  return { role: 'test', log, signal } as unknown as ToolCallContext;
}

async function call(world: DrawWorld, name: string, args: Record<string, unknown>, signal?: AbortSignal): Promise<ToolOutcome> {
  const tool = world.tools().find((entry) => entry.name === name);
  if (!tool) throw new Error(`${name} missing`);
  const out = await tool.handler(args, ctx(signal));
  return typeof out === 'string' ? { text: out } : out;
}

describe('config', () => {
  it('has flat defaults for both engines and the routes', () => {
    expect(DRAW_DEFAULTS.routePet).toBe('api');
    expect(DRAW_DEFAULTS.routeDiary).toBe('api');
    expect(DRAW_DEFAULTS.localUrl).toBe('http://127.0.0.1:8188');
    expect(DRAW_DEFAULTS.personaReferenceMode).toBe('describe');
    expect(DRAW_DEFAULTS.saveDir).toBe('');
  });

  it('migrates only keys that are still at defaults', () => {
    const current: DrawConfigSection = {
      ...DRAW_DEFAULTS,
      saveDir: 'F:\\already\\set',
      style: 'pencil',
    };
    const patch = legacyMigrationPatch(
      { saveDir: 'F:\\old', style: 'crayon', enabled: true },
      { url: 'http://old:8188', popupEnabled: false, enabled: false },
      current,
    );
    expect(patch.saveDir).toBeUndefined();
    expect(patch.style).toBeUndefined();
    expect(patch.localUrl).toBe('http://old:8188');
    expect(patch.localPopupEnabled).toBe(false);
  });

  it('remaps config groups under worlds.draw', async () => {
    const { world } = makeDraw();
    const ui = world.webUi('zh');
    const groups = ui.config ?? [];
    expect(groups.map((group) => group.id)).toEqual(['world:draw', 'world:draw-local', 'world:draw-persona']);
    for (const group of groups) {
      for (const path of Object.keys(group.schema.properties)) {
        expect(path.startsWith('worlds.draw.')).toBe(true);
      }
    }
    const local = groups.find((group) => group.id === 'world:draw-local')!;
    expect(Object.keys(local.schema.properties)).toContain('worlds.draw.localUrl');
    const api = groups.find((group) => group.id === 'world:draw')!;
    expect(Object.keys(api.schema.properties)).toContain('worlds.draw.routeDiary');
  });
});

describe('routing', () => {
  it('uses the API route by default on pet_draw', async () => {
    const made = makeDraw({ routePet: 'api' });
    const fetchCalls: string[] = [];
    const fetchImpl = (async (input: string | URL | Request) => {
      const url = String(input);
      fetchCalls.push(url);
      if (url.includes('generation')) {
        return new Response(JSON.stringify({
          request_id: 'r1',
          output: { choices: [{ message: { content: [{ image: 'https://dashscope-result.oss-accelerate.aliyuncs.com/a.png' }] } }] },
          usage: { output_width: 512, output_height: 512 },
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      return new Response(pngBytes(), { status: 200, headers: { 'content-type': 'image/png' } });
    }) as typeof fetch;
    // 重新构造一个带 fetch 的 World，避免改到公共 helper。
    const world = new DrawWorld({
      cfg: made.cfg, timezone: 'Asia/Shanghai', dataDir: made.dataDir, botDir: made.dataDir, botName: '铃兰',
      secret: () => 'sk-test', fetchImpl,
      popup: { showData: async () => true },
      clientFactory: () => made.comfy,
      now: () => new Date('2026-11-03T12:00:00+08:00'),
    });
    const out = await call(world, 'pet_draw', { subject: '一只猫' });
    expect(out.text).toContain('API（千问）');
    expect(fetchCalls.some((url) => url.includes('generation'))).toBe(true);
    expect(made.comfy.submitted).toHaveLength(0);
  });

  it('uses the local persona preset for the diary route without touching the user studio', async () => {
    const made = makeDraw({ routePet: 'api', routeDiary: 'local', localPopupEnabled: false });
    await worldStart(made);
    const out = await call(made.world, 'pet_draw', { subject: '一只在草地上打滚的小狐狸', purpose: 'diary' });
    expect(out.text).toContain('本地 ComfyUI（人设笔触）');
    expect(out.text).toContain('用途：日记配图');
    expect(made.comfy.submitted).toHaveLength(1);
    const workflow = made.comfy.submitted[0] as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
    const nodes = Object.values(workflow);
    expect(nodes.some((node) => node.class_type === 'UNETLoader')).toBe(true);
    const latent = nodes.find((node) => node.class_type === 'EmptyLatentImage')!;
    expect(latent.inputs).toMatchObject({ width: 512, height: 512, batch_size: 1 });
    const positive = nodes.find((node) => node.class_type === 'CLIPTextEncode')!;
    expect(String(positive.inputs.text)).toContain('crayon');
    expect(out.blobs?.length).toBe(1);
    const index = JSON.parse(readFileSync(join(made.dataDir, 'pet-draw', 'index.json'), 'utf8')) as { drawings: Array<{ styleId: string }> };
    expect(index.drawings[0]!.styleId).toBe('crayon');
  });

  it('still counts, pops and pushes the same event on the local route', async () => {
    const made = makeDraw({ routePet: 'local' });
    await worldStart(made);
    const out = await call(made.world, 'pet_draw', { subject: '一只猫' });
    expect(out.text).toContain('画好了');
    expect(made.popups).toHaveLength(1);
    const event = made.pushed.find((item) => item.type === 'petdraw.drawn');
    expect(event).toBeTruthy();
  });

  it('pet_draw_settings can change the two routes on explicit request', async () => {
    const made = makeDraw();
    const out = await call(made.world, 'pet_draw_settings', { routePet: 'local', routeDiary: 'local' });
    expect(out.text).toContain('桌宠主动画改为：本地 ComfyUI');
    expect(out.text).toContain('日记配图改为：本地 ComfyUI');
    expect(made.cfg.routePet).toBe('local');
    expect(made.cfg.routeDiary).toBe('local');
    expect(made.persists[0]).toMatchObject({ routePet: 'local', routeDiary: 'local' });
  });

  it('rejects an unknown route value', async () => {
    const made = makeDraw();
    const out = await call(made.world, 'pet_draw_settings', { routeDiary: 'cloud' });
    expect(out.failed).toBe(true);
  });
});

describe('local sub-panels', () => {
  it('forwards prefixed methods to the original studio/loras/workflows panels', async () => {
    const made = makeDraw();
    await worldStart(made);
    const ui = made.world.webUi('zh');
    const boot = await ui.invoke!('local', 'studio.bootstrap', []) as { config?: { url?: string } };
    expect(boot.config?.url).toBe('http://127.0.0.1:8188');
    const loras = await ui.invoke!('local', 'loras.listLoras', []) as { loras?: unknown[] };
    expect(Array.isArray(loras.loras)).toBe(true);
    expect(ui.panels?.filter((panel) => !(panel as { slot?: string }).slot).map((panel) => panel.id)).toEqual(['api', 'local']);
    expect(ui.badges).toBeUndefined();
  });
});

function worldStart(made: MadeDraw): Promise<void> {
  // start() 里本地引擎会探测 ComfyUI，用假客户端同步完成。
  return made.world.start(fakeHost(made.pushed));
}

describe('reference handling on the local route', () => {
  it('returns the reference and asks for a prompt in describe mode', async () => {
    const made = makeDraw({ routePet: 'local' });
    await worldStart(made);
    const file = join(made.dataDir, 'ref.png');
    writeFileSync(file, pngBytes());
    const first = await call(made.world, 'pet_draw', { subject: '画下这一刻', referencePath: file, purpose: 'pet' });
    expect(first.text).toContain('[need-prompt]');
    expect(first.blobs?.length).toBe(1);
    expect(made.comfy.submitted).toHaveLength(0);

    const second = await call(made.world, 'pet_draw', { subject: '画下这一刻', referencePath: file, prompt: 'a girl in a white dress by the window', purpose: 'pet' });
    expect(second.text).toContain('画好了');
    expect(made.comfy.submitted).toHaveLength(1);
    const workflow = made.comfy.submitted[0] as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
    const positive = Object.values(workflow).find((node) => node.class_type === 'CLIPTextEncode')!;
    expect(String(positive.inputs.text)).toContain('white dress');
  });

  it('feeds the reference through img2img when that mode is selected', async () => {
    const made = makeDraw({ routePet: 'local', personaReferenceMode: 'img2img' });
    await worldStart(made);
    const file = join(made.dataDir, 'ref.png');
    writeFileSync(file, pngBytes());
    const out = await call(made.world, 'pet_draw', { subject: '画下这一刻', referencePath: file });
    expect(out.text).toContain('画好了');
    const workflow = made.comfy.submitted[0] as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
    expect(Object.values(workflow).some((node) => node.class_type === 'VAEEncode')).toBe(true);
    const load = Object.values(workflow).find((node) => node.class_type === 'LoadImage')!;
    expect(load.inputs.image).toBe('uploaded.png');
  });
});

describe('local persona prompt and workflow', () => {
  it('builds a hybrid persona prompt with English style tags', () => {
    const prompt = buildLocalPersonaPrompt({
      subject: '一只小猫',
      profile: profileFor({ ...DRAW_DEFAULTS }),
      personaTraits: '礼貌、认真、容易害羞',
      extra: '',
      hasReference: false,
    });
    expect(prompt).toContain('crayon');
    expect(prompt).toContain('一只小猫');
    expect(prompt).toContain('礼貌、认真');
    expect(prompt).toContain('no photograph');
  });

  it('parses persona LoRAs with weights and caps at three', () => {
    const loras = parsePersonaLoras('a.safetensors:0.8, b.safetensors, c:1.4, d:0.5');
    expect(loras).toHaveLength(3);
    expect(loras[0]).toEqual({ path: 'a.safetensors', weight: 0.8 });
    expect(loras[1]).toEqual({ path: 'b.safetensors', weight: 0.6 });
    expect(loras[2]!.weight).toBe(1.4);
  });

  it('injects persona LoRAs after the split UNET/CLIP loaders', () => {
    const preset = personaTxt2Img({
      unet: 'u.safetensors', clip: 'c.safetensors', vae: 'v.safetensors',
      steps: 8, cfg: 1, sampler: 'euler', scheduler: 'simple',
    });
    const injected = injectSplitLoRAs(preset.workflow as unknown as Workflow, [{ path: 'style.safetensors', weight: 0.6 }]);
    const nodes = Object.values(injected.workflow);
    const lora = nodes.find((node) => node.class_type === 'LoraLoader')!;
    expect(lora.inputs).toMatchObject({ lora_name: 'style.safetensors', strength_model: 0.6, strength_clip: 0.6 });
    const sampler = nodes.find((node) => node.class_type === 'KSampler')!;
    expect(String((sampler.inputs.model as unknown[])[0])).toBe('14');
  });

  it('derives img2img with a LoadImage/VAEEncode and a denoise parameter', () => {
    const preset = personaTxt2Img({
      unet: 'u.safetensors', clip: 'c.safetensors', vae: 'v.safetensors',
      steps: 8, cfg: 1, sampler: 'euler', scheduler: 'simple',
    });
    const img = withImg2Img(preset, 0.5);
    expect(img.kind).toBe('img2img');
    const nodes = Object.entries(img.workflow as unknown as Workflow);
    const encode = nodes.find(([, node]) => node.class_type === 'VAEEncode');
    const scale = nodes.find(([, node]) => node.class_type === 'ImageScale');
    expect(encode).toBeTruthy();
    expect(scale?.[1].inputs).toMatchObject({ width: 512, height: 512, crop: 'disabled' });
    expect((encode?.[1].inputs.pixels as unknown[])[0]).toBe(scale?.[0]);
    expect(img.param_mapping.some((item) => item.param === 'inputImage')).toBe(true);
    expect(img.param_mapping.some((item) => item.param === 'denoise')).toBe(true);
  });
});
