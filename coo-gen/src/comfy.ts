/** ComfyUI 的 HTTP + WebSocket 客户端；不依赖第三方库，Node 22 自带 fetch/WebSocket。 */
import { readFileSync, statSync } from 'node:fs';
import { basename, extname } from 'node:path';
import type { ComfyHealth } from './types.ts';

export interface ComfySystemStats {
  system?: {
    os?: string;
    comfyui_version?: string;
    python_version?: string;
    ram_total?: number;
  };
  devices?: Array<{ name?: string; type?: string; vram_total?: number; vram_free?: number }>;
}

export interface ComfyHistoryOutput {
  images?: Array<{ filename: string; subfolder?: string; type?: string }>;
  gifs?: Array<{ filename: string; subfolder?: string; type?: string }>;
}

export interface ComfyHistoryEntry {
  outputs?: Record<string, ComfyHistoryOutput>;
  status?: {
    status_str?: string;
    completed?: boolean;
    messages?: unknown[];
  };
}

export interface ComfyPromptResult {
  prompt_id: string;
  number?: number;
  node_errors?: unknown;
}

export interface ComfyImageRef {
  filename: string;
  subfolder?: string;
  type?: string;
}

export interface ComfyImage {
  bytes: Uint8Array;
  mime: string;
  ref: ComfyImageRef;
}

export type ComfyEventType =
  | 'status'
  | 'execution_start'
  | 'execution_cached'
  | 'executing'
  | 'progress'
  | 'executed'
  | 'execution_error'
  | 'execution_interrupted'
  | 'unknown';

export interface ComfyEvent {
  type: ComfyEventType;
  data: Record<string, unknown>;
  prompt_id?: string;
}

export interface ComfyWatchHandlers {
  event(event: ComfyEvent): void;
  connected(connected: boolean): void;
}

export interface ComfyWatch {
  dispose(): void;
  readonly connected: boolean;
}

export interface ComfyApi {
  health(force?: boolean): Promise<ComfyHealth>;
  systemStats(): Promise<ComfySystemStats>;
  objectInfo(node?: string): Promise<Record<string, unknown>>;
  checkpoints(): Promise<string[]>;
  loras(): Promise<string[]>;
  controlNets(): Promise<string[]>;
  samplers(): Promise<string[]>;
  schedulers(): Promise<string[]>;
  submit(workflow: Record<string, unknown>): Promise<ComfyPromptResult>;
  history(promptId: string): Promise<ComfyHistoryEntry | null>;
  view(ref: ComfyImageRef): Promise<ComfyImage>;
  uploadImage(path: string): Promise<string>;
  interrupt(): Promise<void>;
  cancel(promptId: string): Promise<void>;
  watch(handlers: ComfyWatchHandlers): ComfyWatch;
  close(): void;
}

export class ComfyError extends Error {
  constructor(message: string, readonly status = 0) {
    super(message);
    this.name = 'ComfyError';
  }
}

export interface ComfyClientOptions {
  url: string;
  fetchImpl?: typeof fetch;
  /** 测试注入；缺省用全局 WebSocket。 */
  WebSocketImpl?: new (url: string) => WebSocketLike;
  clientId?: string;
  reconnectMs?: number;
  timeoutMs?: number;
  now?: () => number;
}

export interface WebSocketLike {
  onopen: ((event: unknown) => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onclose: ((event: unknown) => void) | null;
  close(): void;
  readyState: number;
}

const MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

export function normalizeBaseUrl(raw: string): string {
  const text = (raw || 'http://127.0.0.1:8188').trim();
  const withProtocol = /^https?:\/\//i.test(text) ? text : `http://${text}`;
  return withProtocol.replace(/\/+$/, '');
}

function wsUrl(baseUrl: string, clientId: string): string {
  const parsed = new URL(baseUrl);
  parsed.protocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
  parsed.pathname = `${parsed.pathname.replace(/\/+$/, '')}/ws`;
  parsed.search = `?clientId=${encodeURIComponent(clientId)}`;
  return parsed.toString();
}

function randomId(): string {
  return `coo-gen-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function parseCombo(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const first = value[0];
  if (!Array.isArray(first)) return [];
  return first.filter((item): item is string => typeof item === 'string');
}

function comboFromObjectInfo(info: Record<string, unknown>, node: string, field: string): string[] {
  const entry = info[node] as { input?: { required?: Record<string, unknown> } } | undefined;
  const spec = entry?.input?.required?.[field];
  return parseCombo(spec);
}

export class ComfyClient implements ComfyApi {
  readonly url: string;
  readonly clientId: string;
  private readonly fetchImpl: typeof fetch;
  private readonly WebSocketImpl: new (url: string) => WebSocketLike;
  private readonly reconnectMs: number;
  private readonly timeoutMs: number;
  private healthCache: { at: number; value: ComfyHealth } | null = null;
  private watchHandle: ComfyWatch | null = null;

  constructor(options: ComfyClientOptions) {
    this.url = normalizeBaseUrl(options.url);
    this.clientId = options.clientId ?? randomId();
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.WebSocketImpl = options.WebSocketImpl ?? (globalThis.WebSocket as unknown as new (url: string) => WebSocketLike);
    this.reconnectMs = Math.max(1000, options.reconnectMs ?? 5000);
    this.timeoutMs = Math.max(1000, options.timeoutMs ?? 20_000);
  }

  private async request(path: string, init: RequestInit = {}, timeoutMs = this.timeoutMs): Promise<Response> {
    if (typeof this.fetchImpl !== 'function') throw new ComfyError('当前 Node 没有 fetch');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    timer.unref?.();
    try {
      const response = await this.fetchImpl(`${this.url}${path}`, { ...init, signal: controller.signal });
      return response;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ComfyError(`ComfyUI 请求超时（${path}）`);
      }
      throw new ComfyError(`连不上 ComfyUI：${error instanceof Error ? error.message : String(error)}`);
    } finally {
      clearTimeout(timer);
    }
  }

  private async json<T>(path: string, init: RequestInit = {}, timeoutMs = this.timeoutMs): Promise<T> {
    const response = await this.request(path, init, timeoutMs);
    const body = await response.text();
    if (!response.ok) {
      let detail = body.slice(0, 800);
      try {
        const parsed = JSON.parse(body) as { error?: unknown; message?: unknown };
        detail = typeof parsed.error === 'string' ? parsed.error : typeof parsed.message === 'string' ? parsed.message : detail;
      } catch { /* keep raw */ }
      throw new ComfyError(`ComfyUI ${response.status}：${detail || response.statusText}`, response.status);
    }
    try {
      return JSON.parse(body) as T;
    } catch {
      throw new ComfyError(`ComfyUI 返回的不是 JSON：${body.slice(0, 200)}`);
    }
  }

  async systemStats(): Promise<ComfySystemStats> {
    return this.json<ComfySystemStats>('/system_stats', { method: 'GET' }, 5000);
  }

  async health(force = false): Promise<ComfyHealth> {
    const now = Date.now();
    if (!force && this.healthCache && now - this.healthCache.at < 3000) return this.healthCache.value;
    try {
      const stats = await this.systemStats();
      const version = stats.system?.comfyui_version;
      const os = stats.system?.os;
      const devices = (stats.devices ?? []).map((device) => {
        const vram = device.vram_total ? ` ${Math.round(device.vram_total / 1024 ** 3)} GB` : '';
        return `${device.name ?? device.type ?? 'device'}${vram}`;
      });
      const value: ComfyHealth = {
        ok: true,
        url: this.url,
        ...(version ? { version } : {}),
        system: [version ? `ComfyUI ${version}` : 'ComfyUI', os].filter(Boolean).join(' · '),
        devices,
        checked_at: now,
      };
      this.healthCache = { at: now, value };
      return value;
    } catch (error) {
      const value: ComfyHealth = {
        ok: false,
        url: this.url,
        error: error instanceof Error ? error.message : String(error),
        checked_at: now,
      };
      this.healthCache = { at: now, value };
      return value;
    }
  }

  async objectInfo(node?: string): Promise<Record<string, unknown>> {
    const path = node ? `/object_info/${encodeURIComponent(node)}` : '/object_info';
    return this.json<Record<string, unknown>>(path, { method: 'GET' }, 30_000);
  }

  async checkpoints(): Promise<string[]> {
    const info = await this.objectInfo('CheckpointLoaderSimple');
    return comboFromObjectInfo(info, 'CheckpointLoaderSimple', 'ckpt_name');
  }

  async loras(): Promise<string[]> {
    const info = await this.objectInfo('LoraLoader');
    return comboFromObjectInfo(info, 'LoraLoader', 'lora_name');
  }

  async controlNets(): Promise<string[]> {
    const info = await this.objectInfo('ControlNetLoader');
    return comboFromObjectInfo(info, 'ControlNetLoader', 'control_net_name');
  }

  async samplers(): Promise<string[]> {
    const info = await this.objectInfo('KSampler');
    return comboFromObjectInfo(info, 'KSampler', 'sampler_name');
  }

  async schedulers(): Promise<string[]> {
    const info = await this.objectInfo('KSampler');
    const list = comboFromObjectInfo(info, 'KSampler', 'scheduler');
    return list.length ? list : ['normal', 'karras', 'exponential', 'sgm_uniform', 'simple', 'ddim_uniform', 'beta'];
  }

  async submit(workflow: Record<string, unknown>): Promise<ComfyPromptResult> {
    const response = await this.request('/prompt', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: workflow, client_id: this.clientId, extra_data: {} }),
    });
    const body = await response.text();
    if (!response.ok) {
      throw new ComfyError(`提交失败 ${response.status}：${body.slice(0, 1200)}`, response.status);
    }
    let parsed: ComfyPromptResult;
    try {
      parsed = JSON.parse(body) as ComfyPromptResult;
    } catch {
      throw new ComfyError(`提交返回不是 JSON：${body.slice(0, 200)}`);
    }
    if (!parsed.prompt_id) throw new ComfyError(`提交没有返回 prompt_id：${body.slice(0, 300)}`);
    if (parsed.node_errors && Object.keys(parsed.node_errors as object).length) {
      throw new ComfyError(`工作流节点错误：${JSON.stringify(parsed.node_errors).slice(0, 1200)}`);
    }
    return parsed;
  }

  async history(promptId: string): Promise<ComfyHistoryEntry | null> {
    const all = await this.json<Record<string, ComfyHistoryEntry>>(
      `/history/${encodeURIComponent(promptId)}`,
      { method: 'GET' },
      10_000,
    );
    return all[promptId] ?? Object.values(all)[0] ?? null;
  }

  async view(ref: ComfyImageRef): Promise<ComfyImage> {
    const query = new URLSearchParams({
      filename: ref.filename,
      subfolder: ref.subfolder ?? '',
      type: ref.type ?? 'output',
    });
    const response = await this.request(`/view?${query.toString()}`, { method: 'GET' }, 60_000);
    if (!response.ok) throw new ComfyError(`取图失败 ${response.status}`, response.status);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > 64 * 1024 * 1024) throw new ComfyError('图片超过 64 MB，拒绝保存');
    const header = response.headers.get('content-type') ?? '';
    const mime = header.startsWith('image/') ? header.split(';')[0]! : MIME_BY_EXT[extname(ref.filename).toLowerCase()] ?? 'image/png';
    return { bytes, mime, ref };
  }

  async uploadImage(path: string): Promise<string> {
    let size = 0;
    try { size = statSync(path).size; } catch { throw new ComfyError(`读不到输入图：${path}`); }
    if (size > 50 * 1024 * 1024) throw new ComfyError('输入图超过 50 MB');
    const name = basename(path);
    const bytes = readFileSync(path);
    const mime = MIME_BY_EXT[extname(path).toLowerCase()] ?? 'application/octet-stream';
    const form = new FormData();
    form.append('image', new Blob([new Uint8Array(bytes)], { type: mime }), name);
    form.append('overwrite', 'true');
    const response = await this.request('/upload/image', { method: 'POST', body: form }, 60_000);
    const body = await response.text();
    if (!response.ok) throw new ComfyError(`上传输入图失败 ${response.status}：${body.slice(0, 400)}`, response.status);
    try {
      const parsed = JSON.parse(body) as { name?: string; subfolder?: string };
      if (!parsed.name) throw new Error('no name');
      return parsed.subfolder ? `${parsed.subfolder}/${parsed.name}` : parsed.name;
    } catch {
      throw new ComfyError(`上传输入图返回异常：${body.slice(0, 300)}`);
    }
  }

  async interrupt(): Promise<void> {
    const response = await this.request('/interrupt', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    }, 10_000);
    if (!response.ok) throw new ComfyError(`取消失败 ${response.status}`, response.status);
  }

  async cancel(promptId: string): Promise<void> {
    try {
      await this.request('/queue', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ delete: [promptId] }),
      }, 10_000);
    } catch { /* 已经不在队列里也没关系 */ }
    try { await this.interrupt(); } catch { /* 任务可能已经结束 */ }
  }

  watch(handlers: ComfyWatchHandlers): ComfyWatch {
    if (this.watchHandle) this.watchHandle.dispose();
    let socket: WebSocketLike | null = null;
    let disposed = false;
    let connected = false;
    let timer: NodeJS.Timeout | null = null;

    const setConnected = (value: boolean): void => {
      if (connected === value) return;
      connected = value;
      try { handlers.connected(value); } catch { /* listener 出错不影响重连 */ }
    };

    const schedule = (): void => {
      if (disposed || timer) return;
      timer = setTimeout(() => {
        timer = null;
        connect();
      }, this.reconnectMs);
      timer.unref?.();
    };

    const connect = (): void => {
      if (disposed) return;
      if (typeof this.WebSocketImpl !== 'function') return;
      try {
        socket = new this.WebSocketImpl(wsUrl(this.url, this.clientId));
      } catch {
        schedule();
        return;
      }
      socket.onopen = () => setConnected(true);
      socket.onmessage = (message) => {
        try {
          const raw = typeof message.data === 'string' ? message.data : '';
          if (!raw) return;
          const parsed = JSON.parse(raw) as { type?: string; data?: Record<string, unknown> };
          if (!parsed.type) return;
          const data = parsed.data ?? {};
          const promptId = typeof data.prompt_id === 'string' ? data.prompt_id : undefined;
          handlers.event({
            type: parsed.type as ComfyEventType,
            data,
            ...(promptId ? { prompt_id: promptId } : {}),
          });
        } catch { /* 非 JSON 帧忽略 */ }
      };
      socket.onerror = () => { setConnected(false); };
      socket.onclose = () => {
        setConnected(false);
        socket = null;
        schedule();
      };
    };

    const handle: ComfyWatch = {
      dispose: () => {
        disposed = true;
        if (timer) clearTimeout(timer);
        timer = null;
        try { socket?.close(); } catch { /* ignore */ }
        socket = null;
        setConnected(false);
        if (this.watchHandle === handle) this.watchHandle = null;
      },
      get connected() { return connected; },
    };
    this.watchHandle = handle;
    connect();
    return handle;
  }

  close(): void {
    this.watchHandle?.dispose();
    this.watchHandle = null;
  }
}
