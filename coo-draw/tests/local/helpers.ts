import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import type {
  ComfyApi, ComfyEvent, ComfyHistoryEntry, ComfyImage, ComfyImageRef, ComfyPromptResult,
  ComfySystemStats, ComfyWatch, ComfyWatchHandlers,
} from '../../src/local/comfy.ts';
import type { ComfyHealth } from '../../src/local/types.ts';
import type { CooGenConfigSection } from '../../src/local/config.ts';
import { COO_GEN_DEFAULTS } from '../../src/local/config.ts';
import type { WorldHost } from 'cortico/core/types.ts';

/** 1×1 透明 PNG，带 IHDR/IDAT/IEND。 */
export const PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

export function pngBytes(): Buffer {
  return Buffer.from(PNG_BASE64, 'base64');
}

export function tempDir(prefix = 'coo-gen-test-'): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

export function removeDir(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

export function writeJson(file: string, value: unknown): void {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export class FakeComfy implements ComfyApi {
  events: ComfyEvent[] = [];
  workflow: Record<string, unknown> | null = null;
  promptId = 'prompt-1';
  historyEntry: ComfyHistoryEntry | null = null;
  loraNames: string[] = [];
  checkpointNames: string[] = ['anything_v5.safetensors'];
  submitError: Error | null = null;
  watchers: ComfyWatchHandlers[] = [];
  closed = false;

  async systemStats(): Promise<ComfySystemStats> {
    return { system: { os: 'nt', comfyui_version: '0.3.test' }, devices: [{ name: 'GPU', vram_total: 8 * 1024 ** 3 }] };
  }

  async health(): Promise<ComfyHealth> {
    return { ok: true, url: 'http://127.0.0.1:8188', system: 'ComfyUI 0.3.test', version: '0.3.test', devices: ['GPU'], checked_at: Date.now() };
  }

  async objectInfo(): Promise<Record<string, unknown>> {
    return {
      CheckpointLoaderSimple: { input: { required: { ckpt_name: [this.checkpointNames] } } },
      LoraLoader: { input: { required: { lora_name: [this.loraNames] } } },
      KSampler: {
        input: {
          required: {
            seed: ['INT', {}],
            steps: ['INT', {}],
            cfg: ['FLOAT', {}],
            sampler_name: [['euler', 'euler_ancestral']],
            scheduler: [['normal', 'karras']],
            denoise: ['FLOAT', {}],
          },
        },
      },
    };
  }

  async checkpoints(): Promise<string[]> { return this.checkpointNames; }
  async loras(): Promise<string[]> { return this.loraNames; }
  async controlNets(): Promise<string[]> { return []; }
  async samplers(): Promise<string[]> { return ['euler', 'euler_ancestral']; }
  async schedulers(): Promise<string[]> { return ['normal', 'karras']; }

  async submit(workflow: Record<string, unknown>): Promise<ComfyPromptResult> {
    if (this.submitError) throw this.submitError;
    this.workflow = workflow;
    return { prompt_id: this.promptId };
  }

  async history(): Promise<ComfyHistoryEntry | null> { return this.historyEntry; }

  async view(ref: ComfyImageRef): Promise<ComfyImage> {
    return { bytes: pngBytes(), mime: 'image/png', ref };
  }

  async uploadImage(path: string): Promise<string> {
    return path.split(/[\\/]/).pop() ?? 'upload.png';
  }

  async interrupt(): Promise<void> { /* noop */ }
  async cancel(): Promise<void> { /* noop */ }

  watch(handlers: ComfyWatchHandlers): ComfyWatch {
    this.watchers.push(handlers);
    queueMicrotask(() => handlers.connected(true));
    return {
      dispose: () => {
        const index = this.watchers.indexOf(handlers);
        if (index >= 0) this.watchers.splice(index, 1);
      },
      connected: true,
    };
  }

  emit(event: ComfyEvent): void {
    this.events.push(event);
    for (const watcher of [...this.watchers]) watcher.event(event);
  }

  close(): void {
    this.closed = true;
    this.watchers = [];
  }

  makeDone(filenames = ['coo-gen_00001_.png']): void {
    this.historyEntry = {
      outputs: {
        '9': {
          images: filenames.map((filename) => ({ filename, subfolder: '', type: 'output' })),
        },
      },
      status: { status_str: 'success', completed: true },
    };
  }
}

export interface TestHost {
  host: WorldHost;
  events: Array<Record<string, unknown>>;
  logs: string[];
}

export function testHost(): TestHost {
  const events: Array<Record<string, unknown>> = [];
  const logs: string[] = [];
  const log = {
    info: (message: string) => { logs.push(`info ${message}`); },
    warn: (message: string, data?: unknown) => { logs.push(`warn ${message} ${data ? JSON.stringify(data) : ''}`); },
    error: (message: string) => { logs.push(`error ${message}`); },
    debug: () => {},
  };
  const host = {
    pushEvent: async (event: Record<string, unknown>) => {
      events.push(event);
      return { ...event, cursor: events.length };
    },
    pushDeferred: () => {},
    store: {
      latestCursor: () => 0,
      get: () => undefined,
      range: () => [],
      around: () => [],
      grep: () => ({ hits: [] }),
    },
    modelFacts: { inputs: ['text'], outputs: ['text'], tools: true },
    blob: () => null,
    reportUsage: () => {},
    log,
  } as unknown as WorldHost;
  return { host, events, logs };
}

export function testCfg(overrides: Partial<CooGenConfigSection> = {}): CooGenConfigSection {
  return {
    ...COO_GEN_DEFAULTS,
    enabled: true,
    popupEnabled: false,
    outputDir: '',
    comfyDir: '',
    pollSeconds: 1,
    timeoutSeconds: 60,
    translateUrl: '',
    ...overrides,
  };
}

/** 建一个最小的 ComfyUI 目录结构。 */
export function makeComfyDir(root: string): string {
  const loras = join(root, 'models', 'loras');
  mkdirSync(join(loras, '风格'), { recursive: true });
  mkdirSync(join(loras, '角色'), { recursive: true });
  writeFileSync(join(loras, '风格', 'soft_lighting.safetensors'), 'fake');
  writeFileSync(join(loras, '风格', 'soft_lighting.png'), pngBytes());
  writeFileSync(join(loras, '角色', 'zelda_botw_style.safetensors'), 'fake');
  writeFileSync(join(loras, '角色', 'zelda_botw_style.png'), pngBytes());
  writeFileSync(join(loras, '角色', 'hatsune_miku_v4.safetensors'), 'fake');
  writeFileSync(join(loras, '角色', 'hatsune_miku_v4.json'), JSON.stringify({ trigger_words: ['hatsune miku', 'vocaloid'] }));
  writeFileSync(join(loras, '风格', 'cyberpunk_neon.safetensors'), 'fake');
  writeFileSync(join(loras, '风格', 'mecha_detail.safetensors'), 'fake');
  return loras;
}
