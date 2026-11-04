/**
 * 「出图」World：用户借桌宠的界面调用本地 ComfyUI。
 *
 * 与「绘画」不同：这里的视角是用户本人，模型/LoRA/参数由用户选，图片存进用户自己的目录。
 * 对话入口通过 coo_gen 工具提交后台任务，完成后推 coogen.done；面板入口直接走同一套任务队列。
 */
import { execFile, spawn } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { nowIso } from 'cortico/core/util.ts';
import type {
  BlobInput, ToolCallContext, ToolDef, ToolOutcome, World, WorldHost, WorldWebUiDecl,
} from 'cortico/core/types.ts';
import type { Language } from 'cortico/core/language.ts';
import type { DeepPartial } from 'cortico/world.ts';
import { COO_GEN_DEFAULTS, COO_GEN_CONFIG_GROUP, SAMPLERS, SCHEDULERS, type CooGenConfigSection } from './config.ts';
import { ComfyClient, normalizeBaseUrl, type ComfyApi, type ComfyEvent, type WebSocketLike } from './comfy.ts';
import { safeFilenamePart, safeMessage } from './fs-util.ts';
import { LaunchManager } from './launch.ts';
import {
  applyUserLoRAMeta, describeLoRAsForPrompt, matchLoRAs, mergeLoRAs, normalizeLoraPath, resolveDefaults, scanLoRAs,
} from './lora.ts';
import { ensureExtraModelPaths } from './model-paths.ts';
import { missingFromApi, modelNames, scanModelFiles, type ModelFile } from './models.ts';
import { OutputStore } from './output.ts';
import { PresetStore } from './presets.ts';
import { SettingsStore, type LoRAMeta } from './settings.ts';
import { randomSeed, TaskManager, type SubmitInput } from './tasks.ts';
import { COO_GEN_TOOL_DECLS, COO_GEN_TOOL_SUMMARIES } from './tools.ts';
import { composePrompt, selectLorasWithLlm, translatePrompt } from './translate.ts';
import type {
  ComfyHealth as HealthType, DefaultLoRA, GenerateParams, GenerateResponse, GenerateTaskView,
  HistoryEntry, LoRARecord, StatusResponse, WorkflowSummary,
} from './types.ts';
import {
  applyCustomParams, buildForPreset, convertUiWorkflow, detectParamMapping, looksLikeUiWorkflow, validateApiWorkflow,
  type ObjectInfo,
} from './workflow.ts';

const ENV_PROMPT_FILE = fileURLToPath(new URL('./ENV_PROMPT.md', import.meta.url));
const LORA_CACHE_MS = 60_000;
const MODEL_CACHE_MS = 60_000;

export interface CooGenWorldOptions {
  cfg: CooGenConfigSection;
  timezone: string;
  dataDir: string;
  botDir: string;
  botName: string;
  secret: (name: string) => string;
  persist?: (patch: DeepPartial<CooGenConfigSection>) => void;
  fetchImpl?: typeof fetch;
  WebSocketImpl?: new (url: string) => WebSocketLike;
  spawnImpl?: typeof spawn;
  clientFactory?: (url: string) => ComfyApi;
  now?: () => Date;
}

const str = (args: Record<string, unknown>, key: string): string | undefined => {
  const value = args[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
};

const int = (args: Record<string, unknown>, key: string): number | undefined => {
  const value = args[key];
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Math.trunc(Number(value));
  return undefined;
};

const num = (args: Record<string, unknown>, key: string): number | undefined => {
  const value = args[key];
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return undefined;
};

const bool = (args: Record<string, unknown>, key: string): boolean | undefined => {
  const value = args[key];
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
};

const strings = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim());
};

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

/** 请求系统文件管理器打开目录；失败时仍可在面板复制路径。 */
function openInFileManager(dir: string, selectFile?: string): void {
  // 官方宿主不处理 companion:open-folder；IPC 入队成功不等于目录已打开。
  // 不让未获确认的自定义消息阻止下方的原生系统命令。
  const esc = (value: string): string => value.replace(/'/g, "''");
  try {
    if (process.platform === 'win32') {
      const ps = join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
      const script = selectFile
        ? `Start-Process explorer.exe -ArgumentList '/select,"${esc(selectFile)}"'`
        : `$shell = New-Object -ComObject Shell.Application; $shell.ShellExecute('${esc(dir)}', '', '', 'open', 1)`;
      execFile(ps, ['-NoProfile', '-NonInteractive', '-Command', script], { windowsHide: true, timeout: 10_000 }, () => {});
      return;
    }
    const command = process.platform === 'darwin' ? 'open' : 'xdg-open';
    const child = spawn(command, [selectFile ?? dir], { detached: true, stdio: 'ignore' });
    child.on('error', () => {});
    child.unref();
  } catch {
    // 打不开时面板还有「复制路径」兜底。
  }
}

export class CooGenWorld implements World {
  readonly id = 'coo-gen';
  private host: WorldHost | undefined;
  private readonly settings: SettingsStore;
  private readonly presets: PresetStore;
  private readonly launch: LaunchManager;
  private output: OutputStore | undefined;
  private outputDirCache = '';
  private tasks: TaskManager | undefined;
  private client: ComfyApi | undefined;
  private clientUrl = '';
  private watch: { dispose(): void; readonly connected: boolean } | undefined;
  private lastHealth: HealthType;
  private checkpointsCache: { at: number; root: string; items: string[] } | null = null;
  private modelScanCache: { at: number; root: string; items: ModelFile[]; warnings: string[] } | null = null;
  private checkpointWarnings: string[] = [];
  private samplersCache: { at: number; items: string[] } | null = null;
  private controlNetsCache: { at: number; items: string[] } | null = null;
  private loraCache: { at: number; root: string; items: LoRARecord[]; warnings: string[] } | null = null;
  private stopped = false;
  private warn: (message: string, data?: unknown) => void;
  private info: (message: string, data?: unknown) => void;

  constructor(private readonly opts: CooGenWorldOptions) {
    this.settings = new SettingsStore(opts.dataDir);
    this.presets = new PresetStore(opts.dataDir);
    this.lastHealth = { ok: false, url: normalizeBaseUrl(opts.cfg.url), error: '还没检测', checked_at: 0 };
    this.warn = (message, data) => console.warn(`[coo-gen] ${message}`, data ?? '');
    this.info = (message, data) => console.info(`[coo-gen] ${message}`, data ?? '');
    this.launch = new LaunchManager({
      getConfig: () => ({
        script: this.opts.cfg.launchScript,
        args: this.opts.cfg.launchArgs,
        cwd: this.opts.cfg.launchCwd,
        waitSeconds: this.opts.cfg.launchWaitSeconds,
        stopScript: this.opts.cfg.stopScript,
      }),
      health: (force) => this.refreshHealth(force ?? false),
      log: (message, data) => this.info(message, data),
      ...(opts.spawnImpl ? { spawnImpl: opts.spawnImpl } : {}),
    });
  }

  /* --------------------------------------------------------------- 提示词 */

  envPromptVars(): Record<string, string> {
    const records = this.loraCache?.items ?? [];
    const defaults = this.settings.get().default_loras;
    const workflow = this.presets.get(this.opts.cfg.defaultWorkflow) ?? this.presets.list()[0];
    return {
      'cooGen.status': this.lastHealth.ok
        ? `在线（${this.lastHealth.system ?? this.lastHealth.url}）`
        : `离线${this.lastHealth.error ? `（${this.lastHealth.error}）` : ''}`,
      'cooGen.url': this.opts.cfg.url,
      'cooGen.models': this.modelsRoot() || '（未配置）',
      'cooGen.model': this.opts.cfg.defaultCheckpoint || '（未设置，用列表第一个）',
      'cooGen.folder': this.outputDir(),
      'cooGen.count': String(this.output?.list(200).length ?? 0),
      'cooGen.loras': records.length
        ? describeLoRAsForPrompt(records, this.settings.aliasIndex(), 50)
        : '（还没有扫到 LoRA；可以先纯模型出图，或在面板里设置 ComfyUI 根目录）',
      'cooGen.defaults': defaults.length
        ? defaults.map((item) => `${item.path}@${item.weight}`).join('、')
        : '（无）',
      'cooGen.workflow': workflow ? `${workflow.name}（${workflow.id}）` : '（无）',
      'cooGen.maxLoras': String(this.opts.cfg.loraMaxCount),
    };
  }

  /* --------------------------------------------------------------- 工具 */

  tools(): ToolDef[] {
    const handlers: Record<string, (args: Record<string, unknown>, ctx: ToolCallContext) => Promise<ToolOutcome>> = {
      coo_gen: (args, ctx) => this.generateTool(args, ctx),
      coo_gen_start: () => this.startTool(),
      coo_gen_stop: () => this.stopTool(),
      coo_gen_result: (args) => this.resultTool(args),
      coo_gen_cancel: (args) => this.cancelTool(args),
      coo_gen_loras: (args) => this.lorasTool(args),
      coo_gen_status: (args) => this.statusTool(args),
      coo_gen_open_output: () => this.openOutputTool(),
    };
    return COO_GEN_TOOL_DECLS.map((decl) => ({
      ...decl,
      handler: async (args, ctx) => handlers[decl.name]!(args ?? {}, ctx),
    }));
  }

  webUi(language: Language = 'zh'): WorldWebUiDecl {
    const zh = language.startsWith('zh');
    const health = this.lastHealth;
    const records = this.loraCache?.items ?? [];
    const localModels = this.scanModels().items;
    const localCheckpoints = modelNames(localModels, 'checkpoint');
    const localDiffusion = modelNames(localModels, 'diffusion_model');
    const output = this.output;
    const historyCount = output?.list(200).length ?? 0;
    return {
      label: zh ? '出图' : 'Image studio',
      config: [COO_GEN_CONFIG_GROUP],
      panels: [
        {
          id: 'studio',
          title: zh ? '出图' : 'Studio',
          description: zh
            ? '选模型、LoRA 和参数，点生成；进度、预览和最近 50 张都在这里。'
            : 'Pick a checkpoint, LoRAs and settings, then generate; progress, preview and the last 50 pictures live here.',
        },
        {
          id: 'loras',
          title: zh ? 'LoRA 管理' : 'LoRAs',
          description: zh
            ? '扫描 ComfyUI 的 models/loras，设常驻组合、中文别名和触发词。'
            : 'Scan ComfyUI models/loras, set always-on defaults, aliases and trigger words.',
        },
        {
          id: 'workflows',
          title: zh ? '工作流' : 'Workflows',
          description: zh
            ? '内置文生图/图生图/ControlNet；导入 ComfyUI 导出的 JSON 并自动识别参数。'
            : 'Built-in txt2img/img2img/ControlNet; import ComfyUI JSON with automatic parameter mapping.',
        },
      ],
      invoke: async (panel, method, args) => this.invokePanel(panel, method, args),
      lamps: [
        {
          label: 'ComfyUI',
          state: health.ok ? 'online' : health.checked_at ? 'error' : 'loading',
          hint: health.ok ? `${health.system ?? health.url}${health.devices?.length ? ` · ${health.devices[0]}` : ''}` : health.error ?? '正在检测',
        },
        {
          label: '模型',
          state: localCheckpoints.length ? 'online' : localDiffusion.length ? 'loading' : 'offline',
          hint: `${this.modelsRoot() || '未配置'} · Checkpoint ${localCheckpoints.length} · Diffusion ${localDiffusion.length}`,
        },
        {
          label: 'LoRA',
          state: records.length ? 'online' : 'offline',
          hint: records.length ? `${records.length} 个 · 默认 ${this.settings.get().default_loras.length} 个` : '没扫到 LoRA；可设置模型根目录',
        },
        {
          label: '输出',
          state: output ? 'online' : 'loading',
          hint: `${this.outputDir()} · ${historyCount} 张`,
        },
      ],
      badges: [
        { label: '模型', value: this.opts.cfg.defaultCheckpoint || `${localCheckpoints.length} 个`, tone: localCheckpoints.length ? 'on' : 'off' },
        { label: 'LoRA', value: String(records.length), tone: records.length ? 'on' : 'off' },
        { label: '历史', value: String(historyCount), tone: 'plain' },
      ],
      promptDocs: [
        {
          key: 'worlds.coo-gen.envPrompt',
          title: '出图 · 环境提示词',
          description: '告诉桌宠什么时候用本地 ComfyUI 出图、怎么选 LoRA、后台任务完成后怎么把图给对方看。',
          path: ENV_PROMPT_FILE,
          role: 'envPrompt',
          vars: [
            { name: 'cooGen.status', description: 'ComfyUI 当前是否在线。' },
            { name: 'cooGen.url', description: 'ComfyUI 地址。' },
            { name: 'cooGen.models', description: '模型根目录（checkpoints / loras / diffusion_models）。' },
            { name: 'cooGen.model', description: '默认 checkpoint。' },
            { name: 'cooGen.folder', description: '出图保存目录。' },
            { name: 'cooGen.count', description: '历史里有几张图。' },
            { name: 'cooGen.loras', description: '可用 LoRA 列表（路径、别名、触发词），可能被截断。', multiline: true },
            { name: 'cooGen.defaults', description: '常驻默认 LoRA 与权重。' },
            { name: 'cooGen.workflow', description: '默认工作流。' },
            { name: 'cooGen.maxLoras', description: '一次最多叠加几个 LoRA。' },
          ],
        },
      ],
      storage: [
        {
          key: 'coo-gen-history',
          label: '出图历史索引',
          kind: 'disk',
          location: this.output?.historyFile ?? join(this.opts.dataDir, 'coo-gen', 'history.json'),
          note: '只清面板里的最近记录，不删 output 文件夹里的图片、也不动 LoRA 设置。',
          stat: () => `${historyCount} 条`,
          clear: () => this.outputStore().clear(),
        },
      ],
    };
  }

  /* --------------------------------------------------------------- 生命周期 */

  async start(host: WorldHost): Promise<void> {
    this.host = host;
    this.warn = (message, data) => host.log.warn(message, data);
    this.info = (message, data) => host.log.info(message, data);
    this.stopped = false;
    this.outputStore();
    this.ensureTasks();
    this.info('coo-gen mounted', {
      url: this.opts.cfg.url,
      output: this.outputDir(),
      loras: this.loraRoot() || '(未配置 comfyDir)',
      workflow: this.opts.cfg.defaultWorkflow,
    });
    void this.refreshHealth(true).then(() => {
      if (this.opts.cfg.autoLaunch && !this.lastHealth.ok && this.launch.configured()) {
        this.info('auto-launch ComfyUI');
        void this.launch.launch().catch((error) => this.warn('auto-launch failed', safeMessage(error)));
      }
    }).catch(() => {});
    void this.getLoRAs().catch((error) => this.warn('LoRA 扫描失败', safeMessage(error)));
  }

  async stop(): Promise<void> {
    this.stopped = true;
    this.tasks?.dispose();
    this.tasks = undefined;
    this.watch?.dispose();
    this.watch = undefined;
    this.client?.close();
    this.client = undefined;
    this.host = undefined;
    this.warn = (message, data) => console.warn(`[coo-gen] ${message}`, data ?? '');
    this.info = (message, data) => console.info(`[coo-gen] ${message}`, data ?? '');
  }

  /* --------------------------------------------------------------- 连接 */

  private comfy(): ComfyApi {
    const url = normalizeBaseUrl(this.opts.cfg.url);
    if (this.client && this.clientUrl === url) return this.client;
    this.watch?.dispose();
    this.watch = undefined;
    this.tasks?.dispose();
    this.tasks = undefined;
    this.client?.close();
    this.clientUrl = url;
    this.client = this.opts.clientFactory?.(url) ?? new ComfyClient({
      url,
      ...(this.opts.fetchImpl ? { fetchImpl: this.opts.fetchImpl } : {}),
      ...(this.opts.WebSocketImpl ? { WebSocketImpl: this.opts.WebSocketImpl } : {}),
    });
    this.checkpointsCache = null;
    this.samplersCache = null;
    this.controlNetsCache = null;
    return this.client;
  }

  private ensureTasks(): TaskManager {
    if (this.tasks) return this.tasks;
    const client = this.comfy();
    this.tasks = new TaskManager({
      client,
      store: this.outputStore(),
      timeoutMs: Math.max(30, this.opts.cfg.timeoutSeconds) * 1000,
      pollMs: Math.max(1, this.opts.cfg.pollSeconds) * 1000,
      onDone: (task, entries) => this.onTaskDone(task, entries),
      onFailed: (task) => this.onTaskFailed(task),
      onConnection: (connected) => {
        if (connected) this.info('ComfyUI WebSocket 已连接');
        else this.warn('ComfyUI WebSocket 断开，5 秒后重连');
      },
      log: (message, data) => this.warn(message, data),
    });
    this.watch = client.watch({
      event: (event) => this.onComfyEvent(event),
      connected: (connected) => {
        this.tasks?.connection(connected);
        if (connected) void this.refreshHealth(true).catch(() => {});
      },
    });
    return this.tasks;
  }

  private onComfyEvent(event: ComfyEvent): void {
    try {
      this.tasks?.onEvent(event);
    } catch (error) {
      this.warn('处理 ComfyUI 事件失败', { error: safeMessage(error), type: event.type });
    }
  }

  private async refreshHealth(force: boolean): Promise<HealthType> {
    try {
      this.lastHealth = await this.comfy().health(force);
    } catch (error) {
      this.lastHealth = {
        ok: false,
        url: normalizeBaseUrl(this.opts.cfg.url),
        error: safeMessage(error),
        checked_at: Date.now(),
      };
    }
    return this.lastHealth;
  }

  private async checkpoints(force = false): Promise<string[]> {
    const now = Date.now();
    const root = this.modelsRoot();
    if (!force && this.checkpointsCache && this.checkpointsCache.root === root && now - this.checkpointsCache.at < MODEL_CACHE_MS) {
      return this.checkpointsCache.items;
    }
    const scan = this.scanModels(force);
    const local = modelNames(scan.items, 'checkpoint');
    let api: string[] = [];
    if (this.lastHealth.ok) {
      try {
        api = await this.comfy().checkpoints();
      } catch {
        // ComfyUI 离线时仍然返回本地扫描结果，面板可以显示但不能生成。
      }
    }
    const merged: string[] = [];
    const seen = new Set<string>();
    const add = (name: string): void => {
      const key = name.replace(/\\/g, '/').toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      merged.push(name);
    };
    for (const name of api) add(name);
    for (const name of local) add(name);
    this.checkpointWarnings = api.length ? missingFromApi(local, api) : [];
    this.checkpointsCache = { at: now, root, items: merged };
    return merged;
  }

  private diffusionModels(force = false): string[] {
    return modelNames(this.scanModels(force).items, 'diffusion_model');
  }

  private async samplers(force = false): Promise<string[]> {
    const now = Date.now();
    if (!force && this.samplersCache && now - this.samplersCache.at < MODEL_CACHE_MS) return this.samplersCache.items;
    try {
      const items = await this.comfy().samplers();
      this.samplersCache = { at: now, items: items.length ? items : [...SAMPLERS] };
      return this.samplersCache.items;
    } catch {
      return [...SAMPLERS];
    }
  }

  private async schedulers(force = false): Promise<string[]> {
    const now = Date.now();
    if (!force && this.samplersCache && now - this.samplersCache.at < MODEL_CACHE_MS) return [...SCHEDULERS];
    try {
      const items = await this.comfy().schedulers();
      return items.length ? items : [...SCHEDULERS];
    } catch {
      return [...SCHEDULERS];
    }
  }

  private async controlNets(force = false): Promise<string[]> {
    const now = Date.now();
    if (!force && this.controlNetsCache && now - this.controlNetsCache.at < MODEL_CACHE_MS) return this.controlNetsCache.items;
    try {
      const items = await this.comfy().controlNets();
      this.controlNetsCache = { at: now, items };
      return items;
    } catch {
      return this.controlNetsCache?.items ?? [];
    }
  }

  /* --------------------------------------------------------------- LoRA */

  private modelsRoot(): string {
    const configured = this.opts.cfg.modelsDir.trim();
    if (configured) return resolve(configured);
    const dir = this.opts.cfg.comfyDir.trim();
    if (!dir) return '';
    const resolved = resolve(dir);
    if (/[\\/]models$/i.test(resolved)) return resolved;
    const models = join(resolved, 'models');
    return existsSync(models) ? models : resolved;
  }

  private scanModels(force = false): { items: ModelFile[]; warnings: string[] } {
    const root = this.modelsRoot();
    const now = Date.now();
    if (!force && this.modelScanCache && this.modelScanCache.root === root && now - this.modelScanCache.at < MODEL_CACHE_MS) {
      return { items: this.modelScanCache.items, warnings: this.modelScanCache.warnings };
    }
    const scanned = scanModelFiles(root);
    this.modelScanCache = { at: now, root, items: scanned.items, warnings: scanned.warnings };
    return { items: scanned.items, warnings: scanned.warnings };
  }

  private loraRoot(): string {
    const models = this.modelsRoot();
    if (models) {
      const preferred = join(models, 'loras');
      if (existsSync(preferred)) return preferred;
    }
    const dir = this.opts.cfg.comfyDir.trim();
    if (dir) {
      const resolved = resolve(dir);
      if (/[\\/]loras$/i.test(resolved) && existsSync(resolved)) return resolved;
      for (const candidate of [join(resolved, 'models', 'loras'), join(resolved, 'loras')]) {
        if (existsSync(candidate) && candidate !== join(models, 'loras')) return candidate;
      }
    }
    return models ? join(models, 'loras') : '';
  }

  private async getLoRAs(force = false): Promise<LoRARecord[]> {
    const root = this.loraRoot();
    const now = Date.now();
    if (!force && this.loraCache && this.loraCache.root === root && now - this.loraCache.at < LORA_CACHE_MS) {
      return this.loraCache.items;
    }
    const warnings: string[] = [];
    let items: LoRARecord[] = [];
    if (root) {
      const scanned = scanLoRAs(root);
      warnings.push(...scanned.warnings);
      items = scanned.items;
    } else {
      warnings.push('没有设置 ComfyUI 根目录，只能从 /object_info 读 LoRA 名称，没有预览图');
    }
    try {
      if (root && !this.lastHealth.ok) throw new Error('ComfyUI offline');
      const names = await this.comfy().loras();
      const byPath = new Map(items.map((item) => [normalizeLoraPath(item.path).toLowerCase(), item]));
      for (const name of names) {
        const path = normalizeLoraPath(name);
        if (!path) continue;
        const key = path.toLowerCase();
        if (byPath.has(key)) continue;
        const slash = path.lastIndexOf('/');
        const file = slash >= 0 ? path.slice(slash + 1) : path;
        items.push({
          path,
          name: file.replace(/\.(safetensors|ckpt|pt|pth)$/i, ''),
          category: slash >= 0 ? path.slice(0, slash) : '',
          size: 0,
          preview: null,
          trigger_words: [],
          aliases: [],
          weight: null,
        });
      }
    } catch {
      if (!root) warnings.push('ComfyUI 不在线，读不到 LoRA 列表');
    }
    items.sort((a, b) => (a.category === b.category ? a.name.localeCompare(b.name) : a.category.localeCompare(b.category)));
    items = applyUserLoRAMeta(items, this.settings.aliasIndex(), this.settings.get().lora_meta);
    this.loraCache = { at: now, root, items, warnings };
    return items;
  }

  /**
   * Coopanion 的标准部署是 `<安装目录>/data/home/companion`，需求里的输出目录是
   * `<安装目录>/data/output`，比 `ctx.dataDir`（`.../companion/data`）高两级。
   * 只有识别到标准布局才这样放；其它 Cortico 部署退回 `<dataDir>/output`。
   */
  private defaultOutputDir(): string {
    const botDir = resolve(this.opts.botDir);
    if (basename(botDir).toLowerCase() === 'companion' && basename(dirname(botDir)).toLowerCase() === 'home') {
      return resolve(botDir, '..', '..', 'output');
    }
    return join(this.opts.dataDir, 'output');
  }

  private outputDir(): string {
    const configured = this.opts.cfg.outputDir.trim();
    const dir = configured ? resolve(configured) : this.defaultOutputDir();
    if (dir !== this.outputDirCache) this.outputDirCache = dir;
    return dir;
  }

  private outputStore(): OutputStore {
    const dir = this.outputDir();
    if (this.output && this.output.dir === dir) {
      this.output.setLimit(this.opts.cfg.historyLimit);
      return this.output;
    }
    this.output = new OutputStore({
      dataDir: this.opts.dataDir,
      outputDir: dir,
      timezone: this.opts.timezone,
      historyLimit: this.opts.cfg.historyLimit,
      ...(this.opts.now ? { now: this.opts.now } : {}),
    });
    return this.output;
  }

  /* --------------------------------------------------------------- 工具实现 */

  private async generateTool(args: Record<string, unknown>, ctx: ToolCallContext): Promise<ToolOutcome> {
    const subject = str(args, 'subject');
    if (!subject) return { text: '缺少 subject：要画什么？给我一句描述。', failed: true };
    const health = await this.refreshHealth(false);
    if (!health.ok) {
      return {
        text: `[offline] ComfyUI 没连上：${health.error ?? health.url}。可以用 coo_gen_start 帮对方启动，或让对方在「出图」面板点「一键启动」；启动后再重试。不要假装已经画好。`,
        failed: true,
      };
    }
    try {
      const result = await this.generateFromChat(args, ctx);
      const notes = result.warnings?.length ? `\n提醒：${result.warnings.join('；')}` : '';
      if (result.ok && result.task) {
        if (result.task.status === 'error') {
          return { text: `[failed] ${result.task.error ?? '提交失败'}${notes}`, failed: true };
        }
        const wait = bool(args, 'wait') === true;
        if (!wait) {
          const loraText = result.task.loras.length
            ? ` LoRA：${result.task.loras.map((lora) => `${lora.name}@${lora.weight}`).join('、')}。`
            : '';
          return {
            text: `[queued] 已提交出图任务 ${result.task.id}（${result.task.params.positive.slice(0, 160)}）。${loraText}画好后会收到 coogen.done 事件；那时用 coo_gen_result 取回附件并展示，不要提前说画好了。${notes}`,
          };
        }
        const finished = await this.waitForTask(result.task.id, Math.max(1, Math.min(300, this.opts.cfg.timeoutSeconds)), ctx.signal);
        const outcome = this.taskOutcome(finished, true, '画好了');
        return notes ? { ...outcome, text: `${outcome.text}${notes}` } : outcome;
      }
      return { text: result.error ?? '提交出图任务失败', failed: true };
    } catch (error) {
      return { text: `出图失败：${safeMessage(error)}`, failed: true };
    }
  }

  private async startTool(): Promise<ToolOutcome> {
    if (!this.launch.configured()) {
      return {
        text: '[config] 没有配置 ComfyUI 启动脚本。请在 World 设置或「出图」面板里填 start_coo-gen.bat / .ps1 的完整路径。',
        failed: true,
      };
    }
    const result = await this.launch.launch();
    void this.refreshHealth(true);
    if (result.ok) {
      this.loraCache = null;
      void this.getLoRAs(true).catch((error) => this.warn('启动后扫描 LoRA 失败', safeMessage(error)));
      return { text: `[ok] ${result.message}` };
    }
    return { text: `[failed] ${result.message}`, failed: true };
  }

  private async stopTool(): Promise<ToolOutcome> {
    if (!this.launch.stopConfigured()) {
      return {
        text: '[config] 没有配置 ComfyUI 关闭脚本。请在 World 设置或「出图」面板里填 stop_coo-gen.bat / .ps1 的完整路径。',
        failed: true,
      };
    }
    if (this.tasks?.active()) {
      return { text: '[busy] 正在出图，先取消当前任务再关闭 ComfyUI，免得留下半张图。', failed: true };
    }
    const result = await this.launch.stop();
    void this.refreshHealth(true);
    return result.ok ? { text: `[ok] ${result.message}` } : { text: `[failed] ${result.message}`, failed: true };
  }

  private async generateFromChat(args: Record<string, unknown>, _ctx: ToolCallContext): Promise<GenerateResponse> {
    const subject = str(args, 'subject')!;
    const styleHint = str(args, 'style_hint');
    const extraTags = strings(args.extra_tags);
    const providedPrompt = str(args, 'prompt');
    const warnings: string[] = [];
    let positive = providedPrompt ?? '';
    if (!positive) {
      const translated = await translatePrompt(subject, styleHint, extraTags, this.translateOptions());
      positive = translated.prompt;
      warnings.push(...translated.warnings);
    } else if (styleHint || extraTags.length) {
      positive = composePrompt(positive, [styleHint ?? '', ...extraTags].join(', '), '');
    }
    if (!positive.trim()) positive = subject;

    const loras = await this.resolveLoras({
      subject: [subject, styleHint ?? '', ...extraTags].join(' '),
      styleHint,
      extraTags,
      explicit: this.parseExplicitLoras(args.loras),
    });
    warnings.push(...loras.warnings);

    const params = this.normalizeParams({
      positive,
      negative: str(args, 'negative') ?? this.opts.cfg.negativePrompt,
      checkpoint: str(args, 'checkpoint') ?? this.opts.cfg.defaultCheckpoint,
      loras: loras.loras.map((lora) => ({ path: lora.path, weight: lora.weight, source: lora.source })),
      sampler: str(args, 'sampler') ?? this.opts.cfg.sampler,
      scheduler: str(args, 'scheduler') ?? this.opts.cfg.scheduler,
      steps: int(args, 'steps') ?? this.opts.cfg.steps,
      cfg: num(args, 'cfg') ?? this.opts.cfg.cfg,
      width: int(args, 'width') ?? this.opts.cfg.width,
      height: int(args, 'height') ?? this.opts.cfg.height,
      batch: int(args, 'batch') ?? this.opts.cfg.batch,
      seed: int(args, 'seed') ?? -1,
      workflow: str(args, 'workflow') ?? this.opts.cfg.defaultWorkflow,
      inputImage: str(args, 'input_image'),
      controlImage: str(args, 'control_image'),
      controlNet: str(args, 'control_net'),
      denoise: num(args, 'denoise'),
      controlStrength: num(args, 'control_strength'),
      note: str(args, 'note'),
    });
    const submitted = await this.submit(params, loras.loras, warnings);
    return { ok: true, task: submitted, warnings };
  }

  private parseExplicitLoras(value: unknown): Array<{ name: string; weight?: number }> {
    if (!Array.isArray(value)) return [];
    const out: Array<{ name: string; weight?: number }> = [];
    for (const item of value) {
      if (!item || typeof item !== 'object') continue;
      const entry = item as Record<string, unknown>;
      const name = typeof entry.name === 'string' ? entry.name.trim() : '';
      if (!name) continue;
      const weight = Number(entry.weight);
      out.push({ name, ...(Number.isFinite(weight) ? { weight } : {}) });
    }
    return out;
  }

  private translateOptions() {
    const cfg = this.opts.cfg;
    const keyName = cfg.translateKeyEnv.trim();
    const apiKey = keyName ? this.opts.secret(keyName).trim() : '';
    return {
      dictionary: this.settings.dictionary(),
      url: cfg.translateUrl.trim(),
      model: cfg.translateModel.trim(),
      ...(apiKey ? { apiKey } : {}),
      timeoutSeconds: cfg.translateTimeoutSeconds,
      ...(this.opts.fetchImpl ? { fetchImpl: this.opts.fetchImpl } : {}),
    };
  }

  private async resolveLoras(input: {
    subject: string;
    styleHint?: string;
    extraTags?: string[];
    explicit: Array<{ name: string; weight?: number }>;
  }): Promise<{ loras: ReturnType<typeof mergeLoRAs>; warnings: string[] }> {
    const warnings: string[] = [];
    const records = await this.getLoRAs();
    const settings = this.settings.get();
    const defaults = resolveDefaults(records, settings.default_loras);
    for (const missing of defaults.missing) warnings.push(`默认 LoRA 找不到：${missing.path}（已跳过）`);
    if (!records.length) {
      warnings.push('本机没有扫到 LoRA，这次纯模型出图');
      return { loras: defaults.loras, warnings };
    }
    let matched = matchLoRAs(records, this.settings.aliasIndex(), {
      subject: input.subject,
      ...(input.styleHint ? { styleHint: input.styleHint } : {}),
      ...(input.extraTags?.length ? { extraTags: input.extraTags } : {}),
      explicit: input.explicit,
    }, { explicitSource: 'auto' });
    if (!matched.length && !input.explicit.length && this.opts.cfg.translateUrl.trim() && this.opts.cfg.translateModel.trim()) {
      const picks = await selectLorasWithLlm(input.subject, records, this.translateOptions());
      matched = picks.flatMap((pick) => {
        const record = records.find((item) => (
          item.path.toLowerCase() === pick.name.toLowerCase()
          || item.name.toLowerCase() === pick.name.toLowerCase()
          || item.path.toLowerCase().endsWith(`/${pick.name.toLowerCase()}`)
        ));
        if (!record) return [];
        return [{
          path: record.path,
          name: record.name,
          weight: pick.weight,
          source: 'auto' as const,
          reason: `LLM 语义：${pick.reason}`,
          confidence: 0.65,
        }];
      });
    }
    for (const pick of input.explicit) {
      const found = matched.some((item) => item.name.toLowerCase() === pick.name.toLowerCase()
        || item.path.toLowerCase().includes(pick.name.toLowerCase()));
      if (!found) warnings.push(`没找到 LoRA「${pick.name}」，已跳过`);
    }
    const merged = mergeLoRAs(defaults.loras, matched, { maxCount: this.opts.cfg.loraMaxCount });
    try {
      const available = await this.comfy().loras();
      if (available.length) {
        const normalized = new Set(available.map((name) => normalizeLoraPath(name).toLowerCase()));
        const kept = merged.filter((lora) => normalized.has(lora.path.toLowerCase()));
        for (const lora of merged) {
          if (!normalized.has(lora.path.toLowerCase()) && !lora.path.includes('/')) {
            // 有些对象只给文件名；再按文件名比一次。
            const byName = available.some((name) => {
              const base = normalizeLoraPath(name).split('/').pop()?.toLowerCase();
              return base === `${lora.name.toLowerCase()}.safetensors` || base === lora.name.toLowerCase();
            });
            if (byName) kept.push(lora);
          }
        }
        if (kept.length < merged.length) {
          const missing = merged.filter((lora) => !kept.includes(lora)).map((lora) => lora.path);
          warnings.push(`ComfyUI 没有加载这些 LoRA：${missing.join('、')}`);
        }
        return { loras: kept, warnings };
      }
    } catch { /* ComfyUI 离线时保留本地匹配结果 */ }
    return { loras: merged, warnings };
  }

  private normalizeParams(input: GenerateParams): GenerateParams {
    const cfg = this.opts.cfg;
    const width = clamp(Math.round(Number(input.width ?? cfg.width) || cfg.width), 64, 4096);
    const height = clamp(Math.round(Number(input.height ?? cfg.height) || cfg.height), 64, 4096);
    const steps = clamp(Math.round(Number(input.steps ?? cfg.steps) || cfg.steps), 1, 100);
    const cfgScale = clamp(Number(input.cfg ?? cfg.cfg) || cfg.cfg, 1, 30);
    const batch = clamp(Math.round(Number(input.batch ?? cfg.batch) || cfg.batch), 1, 8);
    return {
      ...input,
      positive: input.positive.trim(),
      negative: (input.negative ?? cfg.negativePrompt).trim(),
      checkpoint: (input.checkpoint ?? cfg.defaultCheckpoint).trim(),
      sampler: input.sampler || cfg.sampler,
      scheduler: input.scheduler || cfg.scheduler,
      steps,
      cfg: cfgScale,
      width: width - (width % 8),
      height: height - (height % 8),
      batch,
      seed: Number.isFinite(Number(input.seed)) ? Math.trunc(Number(input.seed)) : -1,
      workflow: input.workflow || cfg.defaultWorkflow,
    };
  }

  /** 面板和工具共用的提交入口。 */
  private async submit(
    input: GenerateParams,
    loras: Array<{ path: string; name: string; weight: number; source: 'default' | 'auto' | 'manual' }>,
    warnings: string[],
  ): Promise<GenerateTaskView> {
    const params = this.normalizeParams(input);
    if (!params.positive.trim()) throw new Error('正向提示词不能为空');
    params.positive = composePrompt(this.opts.cfg.promptPrefix, params.positive, this.opts.cfg.promptSuffix);
    if (!Number.isFinite(Number(params.seed)) || Number(params.seed) < 0) params.seed = randomSeed();
    const preset = this.presets.get(params.workflow ?? this.opts.cfg.defaultWorkflow);
    if (!preset) throw new Error(`工作流不存在：${params.workflow}`);
    const needsCheckpoint = preset.param_mapping.some((mapping) => mapping.param === 'checkpoint');
    if (needsCheckpoint && !params.checkpoint) {
      const list = await this.checkpoints();
      if (list.length) params.checkpoint = list[0]!;
      else throw new Error('没有选择 checkpoint，而且 ComfyUI 没有返回模型列表');
    }
    if (params.checkpoint) {
      const checkpointList = await this.checkpoints();
      if (checkpointList.length && !checkpointList.includes(params.checkpoint)) {
        warnings.push(`ComfyUI 模型列表里没有「${params.checkpoint}」，提交可能失败`);
      }
    }
    if (this.checkpointWarnings.length) {
      warnings.push(`这些本地模型还没被 ComfyUI 读取：${this.checkpointWarnings.join('、')}；请点「让 ComfyUI 读取模型目录」并重启 ComfyUI。`);
    }
    if (preset.kind === 'img2img' && !params.inputImage) throw new Error('图生图需要输入图');
    if (preset.kind === 'controlnet' && (!params.inputImage || !params.controlImage)) throw new Error('ControlNet 需要输入图和控制图');
    await this.prepareInputImages(preset, params);
    const built = buildForPreset(preset, params, loras.map((lora) => ({ path: lora.path, weight: lora.weight })));
    const withCustom = applyCustomParams(built.workflow, preset.param_mapping, params.custom);
    warnings.push(...built.warnings);
    const tasks = this.ensureTasks();
    return tasks.submit({
      params,
      loras,
      workflow: withCustom as unknown as Record<string, unknown>,
      workflowName: preset.name,
      seed: params.seed ?? -1,
      batch: params.batch ?? 1,
    } satisfies SubmitInput);
  }

  private async prepareInputImages(preset: { param_mapping: Array<{ param: string; ui_type: string }>; kind?: string }, params: GenerateParams): Promise<void> {
    const maps = preset.param_mapping.filter((map) => map.ui_type === 'image');
    for (const map of maps) {
      const key = map.param as 'inputImage' | 'controlImage';
      const value = params[key];
      if (!value) continue;
      if (!existsSync(value)) continue;
      const mime = MIME_BY_EXT[extname(value).toLowerCase()];
      if (!mime) throw new Error(`输入图只支持 png / jpg / webp / gif：${value}`);
      if (statSync(value).size > 50 * 1024 * 1024) throw new Error('输入图超过 50 MB');
      params[key] = await this.comfy().uploadImage(value);
    }
  }

  private async waitForTask(id: string, seconds: number, signal?: AbortSignal): Promise<GenerateTaskView | null> {
    const deadline = Date.now() + Math.max(0, seconds) * 1000;
    const tasks = this.ensureTasks();
    let task = tasks.get(id);
    while (task && (task.status === 'queued' || task.status === 'running') && Date.now() < deadline && !signal?.aborted) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      task = tasks.get(id);
    }
    return task;
  }

  private taskOutcome(task: GenerateTaskView | null, attach: boolean, intro: string): ToolOutcome {
    if (!task) return { text: '还没有出图任务。先用 coo_gen 提交一张。', failed: true };
    const lines: string[] = [];
    if (task.status === 'done') {
      lines.push(`${intro}！task ${task.id}，seed ${task.params.seed}，模型 ${task.params.checkpoint || '默认'}。`);
      if (task.loras.length) lines.push(`LoRA：${task.loras.map((lora) => `${lora.name}@${lora.weight}`).join('、')}。`);
      lines.push(`提示词：${task.params.positive}`);
      lines.push(`文件：${task.images.map((image) => image.filename).join('、')}（${this.outputDir()}）。`);
      lines.push(attach ? '图片已作为附件返回；用 pet_say.images 展示，不要在正文里贴句柄。' : '需要图片时把 attach 设为 true。');
      const blobs = attach ? this.blobsFor(task.images.map((image) => image.id)) : [];
      return { text: lines.join('\n'), ...(blobs.length ? { blobs } : {}) };
    }
    if (task.status === 'error') {
      return { text: `[failed] ${task.error ?? '出图失败'}。可以把分辨率或步数调低再试；不要重复提交同一张。`, failed: true };
    }
    if (task.status === 'cancelled') return { text: '[cancelled] 这次出图已经取消。' };
    const p = task.progress;
    return { text: `还在画：${p.message ?? p.current + '/' + p.total}（${p.current}/${p.total}）。画好后我再把图给你看。` };
  }

  private blobsFor(ids: string[]): BlobInput[] {
    const out: BlobInput[] = [];
    for (const id of ids.slice(0, 8)) {
      const entry = this.outputStore().get(id);
      if (!entry) continue;
      try {
        const bytes = readFileSync(entry.path);
        const mime = MIME_BY_EXT[extname(entry.filename).toLowerCase()] ?? 'image/png';
        out.push({ bytes, mime, name: entry.filename, fallbackText: `出图 ${entry.filename}` });
      } catch {
        // 图被移走时跳过附件，文字里仍有文件名。
      }
    }
    return out;
  }

  private async resultTool(args: Record<string, unknown>): Promise<ToolOutcome> {
    const attach = bool(args, 'attach') !== false;
    if (bool(args, 'history') === true) {
      const limit = clamp(int(args, 'limit') ?? 8, 1, 20);
      const entries = this.outputStore().list(limit);
      if (!entries.length) return { text: `出图历史还是空的。保存目录：${this.outputDir()}` };
      const lines = [`最近 ${entries.length} 张（${this.outputDir()}）：`];
      for (const entry of entries) {
        lines.push(`- ${entry.filename} · seed ${entry.seed} · ${new Date(entry.created_at).toLocaleString('zh-CN')} · ${entry.positive.slice(0, 80)}`);
      }
      const blobs = attach ? this.blobsFor([entries[0]!.id]) : [];
      lines.push(attach ? '最新一张已作为附件返回；用 pet_say.images 展示。' : '需要图片时把 attach 设为 true。');
      return { text: lines.join('\n'), ...(blobs.length ? { blobs } : {}) };
    }
    const id = str(args, 'task_id');
    const tasks = this.ensureTasks();
    let task = id ? tasks.get(id) : tasks.latest();
    const waitSeconds = clamp(int(args, 'wait_seconds') ?? 0, 0, 30);
    if (task && waitSeconds > 0) task = await this.waitForTask(task.id, waitSeconds);
    if (!task) {
      const latest = this.outputStore().list(1)[0];
      if (!latest) return { text: '还没有出图任务。先用 coo_gen 画一张。' };
      return this.taskOutcome({
        id: latest.task_id,
        prompt_id: latest.prompt_id,
        status: 'done',
        progress: { current: 1, total: 1 },
        params: { positive: latest.positive, negative: latest.negative, checkpoint: latest.checkpoint, loras: latest.loras, sampler: latest.sampler, scheduler: latest.scheduler, steps: latest.steps, cfg: latest.cfg, width: latest.width, height: latest.height, batch: latest.batch, seed: latest.seed },
        loras: latest.loras.map((lora) => ({ ...lora, source: lora.source ?? 'manual' })),
        images: [{ id: latest.id, filename: latest.filename, width: latest.width, height: latest.height }],
        created_at: latest.created_at,
        finished_at: latest.created_at,
      } as GenerateTaskView, attach, '这是最近一张');
    }
    return this.taskOutcome(task, attach, task.status === 'done' ? '画好了' : '任务状态');
  }

  private async cancelTool(args: Record<string, unknown>): Promise<ToolOutcome> {
    const id = str(args, 'task_id');
    const ok = await this.ensureTasks().cancel(id);
    return ok ? { text: '已取消当前出图任务。' } : { text: '现在没有正在跑的出图任务。' };
  }

  private async lorasTool(args: Record<string, unknown>): Promise<ToolOutcome> {
    const query = (str(args, 'query') ?? '').toLowerCase();
    const category = (str(args, 'category') ?? '').toLowerCase();
    const limit = clamp(int(args, 'limit') ?? 30, 1, 60);
    const records = await this.getLoRAs();
    const defaults = new Set(this.settings.get().default_loras.map((item) => item.path.toLowerCase()));
    const filtered = records.filter((item) => {
      if (category && !item.category.toLowerCase().includes(category)) return false;
      if (!query) return true;
      return [item.path, item.name, item.category, ...item.aliases, ...item.trigger_words]
        .some((value) => value.toLowerCase().includes(query));
    }).slice(0, limit);
    if (!filtered.length) {
      return {
        text: records.length
          ? `没有匹配「${query || category}」的 LoRA；共 ${records.length} 个。`
          : `没扫到 LoRA。${this.loraRoot() ? `目录：${this.loraRoot()}` : '先在 World 设置里填 ComfyUI 根目录。'}`,
      };
    }
    const lines = [`LoRA（${filtered.length}/${records.length}）：`];
    for (const item of filtered) {
      const bits = [item.path];
      if (item.aliases.length) bits.push(`别名:${item.aliases.join('/')}`);
      if (item.trigger_words.length) bits.push(`触发词:${item.trigger_words.slice(0, 5).join('/')}`);
      if (defaults.has(item.path.toLowerCase())) bits.push('常驻');
      lines.push(`- ${bits.join(' | ')}`);
    }
    return { text: lines.join('\n') };
  }

  private async statusTool(args: Record<string, unknown>): Promise<ToolOutcome> {
    const health = await this.refreshHealth(bool(args, 'refresh') === true);
    const records = await this.getLoRAs();
    const checkpoints = await this.checkpoints();
    const diffusionModels = this.diffusionModels();
    const task = this.ensureTasks().latest();
    const lines = [
      health.ok ? `ComfyUI 在线：${health.system ?? health.url}` : `ComfyUI 离线：${health.error ?? health.url}`,
      `地址：${health.url}`,
      `模型目录：${this.modelsRoot() || '（未配置）'}`,
      `Checkpoint：${checkpoints.length ? checkpoints.slice(0, 8).join('、') : '（没读到）'}`,
      `Diffusion/UNet：${diffusionModels.length ? diffusionModels.slice(0, 8).join('、') : '（无）'}`,
      `LoRA：${records.length} 个；常驻 ${this.settings.get().default_loras.length} 个`,
      `保存目录：${this.outputDir()}`,
      `启动脚本：${this.launch.configured() ? this.opts.cfg.launchScript : '未配置'}`,
      `关闭脚本：${this.launch.stopConfigured() ? this.opts.cfg.stopScript : '未配置'}`,
      `当前任务：${task ? `${task.status} ${task.progress.current}/${task.progress.total} ${task.progress.message ?? ''}` : '空闲'}`,
    ];
    if (!health.ok && this.launch.configured()) lines.push('可以用 coo_gen_start 启动，或在面板点「一键启动」。');
    if (health.ok && this.launch.stopConfigured()) lines.push('需要停止时用 coo_gen_stop，或在面板点「关闭」。');
    return { text: lines.join('\n') };
  }

  private async openOutputTool(): Promise<ToolOutcome> {
    const dir = this.outputDir();
    openInFileManager(dir);
    return { text: `已打开出图目录：${dir}` };
  }

  /* --------------------------------------------------------------- 完成后 */

  private async onTaskDone(task: GenerateTaskView, entries: HistoryEntry[]): Promise<void> {
    this.info('出图完成', { task: task.id, seeds: task.params.seed, files: entries.map((entry) => entry.filename) });
    const first = entries[0];
    if (first && this.opts.cfg.popupEnabled) {
      void this.showInPetBubble(first.path).catch((error) => this.warn('气泡弹图失败', safeMessage(error)));
    }
    if (!this.host) return;
    const blobs = this.blobsFor(entries.map((entry) => entry.id));
    const text = [
      `[coo-gen] 出图完成：task ${task.id}，seed ${task.params.seed}，模型 ${task.params.checkpoint || '默认'}。`,
      task.loras.length ? `LoRA：${task.loras.map((lora) => `${lora.name}@${lora.weight}`).join('、')}。` : '',
      `提示词：${task.params.positive}`,
      `文件：${entries.map((entry) => entry.filename).join('、')}（${this.outputDir()}）。`,
      '用 coo_gen_result 取回附件并展示；不要在正文里贴句柄。',
    ].filter(Boolean).join('\n');
    try {
      await this.host.pushEvent({
        type: 'coogen.done',
        ts: nowIso(this.opts.timezone),
        source: this.id,
        origin: 'internal',
        senderKey: this.id,
        text,
        meta: {
          task_id: task.id,
          prompt_id: task.prompt_id,
          seed: task.params.seed,
          files: entries.map((entry) => entry.filename),
          prompt: task.params.positive,
        },
        ...(blobs.length ? { blobs } : {}),
      }, { trigger: 'flush' });
    } catch (error) {
      this.warn('推送 coogen.done 失败', safeMessage(error));
    }
  }

  private async onTaskFailed(task: GenerateTaskView): Promise<void> {
    this.warn('出图失败', { task: task.id, error: task.error ?? 'unknown' });
    if (!this.host) return;
    try {
      await this.host.pushEvent({
        type: 'coogen.failed',
        ts: nowIso(this.opts.timezone),
        source: this.id,
        origin: 'internal',
        senderKey: this.id,
        text: `[coo-gen] 出图失败（task ${task.id}）：${task.error ?? '未知错误'}。可以降低分辨率/步数，或检查 ComfyUI 控制台后再试。`,
        meta: { task_id: task.id, error: task.error ?? '' },
      }, { trigger: 'flush' });
    } catch (error) {
      this.warn('推送 coogen.failed 失败', safeMessage(error));
    }
  }

  private petBubbleUrl(): string {
    let port = 7797;
    for (const file of [join(this.opts.botDir, 'config.json'), join(this.opts.dataDir, '..', 'config.json')]) {
      try {
        const raw = JSON.parse(readFileSync(file, 'utf8')) as { worlds?: Record<string, { port?: unknown }> };
        const value = Number(raw.worlds?.['desktop-pet']?.port);
        if (Number.isFinite(value) && value > 0) { port = value; break; }
      } catch { /* 下一个候选 */ }
    }
    return `http://127.0.0.1:${port}/api/image-bubble`;
  }

  private async showInPetBubble(path: string): Promise<boolean> {
    try {
      if (!existsSync(path)) return false;
      const bytes = readFileSync(path);
      if (bytes.byteLength > 8 * 1024 * 1024) return false;
      const mime = MIME_BY_EXT[extname(path).toLowerCase()] ?? 'image/png';
      const dataUrl = `data:${mime};base64,${bytes.toString('base64')}`;
      const response = await (this.opts.fetchImpl ?? fetch)(this.petBubbleUrl(), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          dataUrl,
          duration: clamp(this.opts.cfg.popupSeconds, 1, 30),
          scale: clamp(this.opts.cfg.popupScale, 0.3, 2),
          size: 0,
          radius: 16,
        }),
        signal: AbortSignal.timeout(2500),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /* --------------------------------------------------------------- 面板 API */

  private async invokePanel(panel: string, method: string, args: unknown[]): Promise<unknown> {
    if (!['studio', 'loras', 'workflows'].includes(panel)) throw new Error(`unknown panel: ${panel}`);
    switch (method) {
      case 'bootstrap': return this.bootstrap();
      case 'status': return this.status();
      case 'history': return this.panelHistory(args[0]);
      case 'generate': return this.panelGenerate(args[0]);
      case 'cancel': return this.panelCancel(args[0]);
      case 'health': return { health: await this.refreshHealth(true) };
      case 'launch': return this.panelLaunch();
      case 'stop': return this.panelStop();
      case 'refreshModels': return this.panelRefreshModels();
      case 'syncModelPaths': return this.panelSyncModelPaths();
      case 'image': return this.panelImage(args[0]);
      case 'localImage': return this.panelLocalImage(args[0]);
      case 'loraPreview': return this.panelLoraPreview(args[0]);
      case 'openFolder': {
        openInFileManager(this.outputDir());
        return { ok: true, path: this.outputDir() };
      }
      case 'revealImage': return this.panelReveal(args[0]);
      case 'sendToPet': return this.panelSendToPet(args[0]);
      case 'clearHistory': return { ok: true, message: this.outputStore().clear() };
      case 'listLoras': return this.panelListLoras();
      case 'setDefaults': return this.panelSetDefaults(args[0]);
      case 'setAliases': return this.panelSetAliases(args[0]);
      case 'setLoraMeta': return this.panelSetLoraMeta(args[0], args[1]);
      case 'presets': return { presets: this.presets.summaries(), default_workflow: this.opts.cfg.defaultWorkflow };
      case 'presetDetail': return this.panelPresetDetail(args[0]);
      case 'importWorkflow': return this.panelImportWorkflow(args[0], args[1]);
      case 'removePreset': return { ok: this.presets.remove(String(args[0] ?? '')) };
      default: throw new Error(`unknown method: ${method}`);
    }
  }

  private configSnapshot() {
    const cfg = this.opts.cfg;
    return {
      url: cfg.url,
      models_dir: this.modelsRoot(),
      model_root: this.modelsRoot(),
      output_dir: this.outputDir(),
      default_checkpoint: cfg.defaultCheckpoint,
      lora_max_count: cfg.loraMaxCount,
      history_limit: cfg.historyLimit,
      sampler: cfg.sampler,
      scheduler: cfg.scheduler,
      steps: cfg.steps,
      cfg: cfg.cfg,
      width: cfg.width,
      height: cfg.height,
      batch: cfg.batch,
      negative_prompt: cfg.negativePrompt,
      timeout_seconds: cfg.timeoutSeconds,
      popup_enabled: cfg.popupEnabled,
      translate_enabled: Boolean(cfg.translateUrl.trim() && cfg.translateModel.trim()),
      prompt_prefix: cfg.promptPrefix,
      prompt_suffix: cfg.promptSuffix,
    };
  }

  private async bootstrap(): Promise<Record<string, unknown>> {
    const health = await this.refreshHealth(false);
    const [checkpoints, samplers, schedulers, controlNets, loras] = await Promise.all([
      this.checkpoints(),
      health.ok ? this.samplers() : Promise.resolve([...SAMPLERS] as string[]),
      health.ok ? this.schedulers() : Promise.resolve([...SCHEDULERS] as string[]),
      health.ok ? this.controlNets() : Promise.resolve([]),
      this.getLoRAs().catch(() => []),
    ]);
    const settings = this.settings.get();
    const defaults = resolveDefaults(loras, settings.default_loras);
    const warnings: string[] = [];
    const diffusionModels = this.diffusionModels();
    if (this.loraCache?.warnings.length) warnings.push(...this.loraCache.warnings);
    for (const missing of defaults.missing) warnings.push(`默认 LoRA 文件丢失：${missing.path}`);
    if (this.checkpointWarnings.length) {
      warnings.push(`本地模型未出现在 ComfyUI 列表：${this.checkpointWarnings.join('、')}。在「出图」面板点「让 ComfyUI 读取模型目录」，再重启 ComfyUI。`);
    }
    if (!health.ok) warnings.push(`ComfyUI 离线：${health.error ?? health.url}`);
    if (!this.launch.configured()) warnings.push('没有配置 ComfyUI 启动脚本；离线时需要手动启动。');
    const workflow = this.presets.get(this.opts.cfg.defaultWorkflow) ?? this.presets.list()[0];
    return {
      health,
      launch: {
        configured: this.launch.configured(),
        stop_configured: this.launch.stopConfigured(),
        auto_launch: this.opts.cfg.autoLaunch,
        command: [this.opts.cfg.launchScript, this.opts.cfg.launchArgs].filter(Boolean).join(' '),
        stop_command: this.opts.cfg.stopScript,
        running: this.launch.running(),
        ...(this.launch.lastErrorText() ? { last_error: this.launch.lastErrorText() } : {}),
      },
      config: this.configSnapshot(),
      checkpoints,
      diffusion_models: diffusionModels,
      model_files: this.scanModels().items.slice(0, 500).map(({ path, name, kind, size, file }) => ({ path, name, kind, size, file })),
      model_root: this.modelsRoot(),
      samplers,
      schedulers,
      control_nets: controlNets,
      loras,
      lora_root: this.loraRoot(),
      defaults: settings.default_loras,
      aliases: settings.lora_aliases,
      history: this.outputStore().list(this.opts.cfg.historyLimit),
      presets: this.presets.summaries(),
      workflow: workflow?.id ?? 'quick-txt2img',
      task: this.ensureTasks().latest(),
      warnings,
    };
  }

  private async status(): Promise<StatusResponse> {
    const health = await this.refreshHealth(false);
    const warnings: string[] = [];
    if (!health.ok) warnings.push(health.error ?? 'ComfyUI 离线');
    return { task: this.ensureTasks().latest(), health, warnings };
  }

  private async panelGenerate(raw: unknown): Promise<GenerateResponse> {
    try {
      const input = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
      const lorasProvided = Array.isArray(input.loras);
      const params = this.normalizeParams({
        positive: String(input.positive ?? '').trim(),
        negative: typeof input.negative === 'string' ? input.negative : this.opts.cfg.negativePrompt,
        checkpoint: typeof input.checkpoint === 'string' ? input.checkpoint : this.opts.cfg.defaultCheckpoint,
        loras: Array.isArray(input.loras) ? input.loras as GenerateParams['loras'] : [],
        sampler: typeof input.sampler === 'string' ? input.sampler : this.opts.cfg.sampler,
        scheduler: typeof input.scheduler === 'string' ? input.scheduler : this.opts.cfg.scheduler,
        steps: Number(input.steps) || this.opts.cfg.steps,
        cfg: Number(input.cfg) || this.opts.cfg.cfg,
        width: Number(input.width) || this.opts.cfg.width,
        height: Number(input.height) || this.opts.cfg.height,
        batch: Number(input.batch) || this.opts.cfg.batch,
        seed: Number.isFinite(Number(input.seed)) ? Number(input.seed) : -1,
        workflow: typeof input.workflow === 'string' ? input.workflow : this.opts.cfg.defaultWorkflow,
        inputImage: typeof input.inputImage === 'string' ? input.inputImage : undefined,
        controlImage: typeof input.controlImage === 'string' ? input.controlImage : undefined,
        controlNet: typeof input.controlNet === 'string' ? input.controlNet : undefined,
        denoise: Number.isFinite(Number(input.denoise)) ? Number(input.denoise) : undefined,
        controlStrength: Number.isFinite(Number(input.controlStrength)) ? Number(input.controlStrength) : undefined,
        note: typeof input.note === 'string' ? input.note : undefined,
        custom: input.custom && typeof input.custom === 'object' && !Array.isArray(input.custom)
          ? Object.fromEntries(Object.entries(input.custom as Record<string, unknown>)
            .filter(([, value]) => typeof value === 'string' || typeof value === 'number')
            .slice(0, 80)) as Record<string, string | number>
          : undefined,
      });
      if (!params.positive) return { ok: false, error: '正向提示词不能为空' };
      const health = await this.refreshHealth(false);
      if (!health.ok) return { ok: false, error: `ComfyUI 没有连上：${health.error ?? health.url}。点「一键启动」或检查地址。` };
      const records = await this.getLoRAs();
      const byPath = new Map(records.map((record) => [record.path.toLowerCase(), record]));
      const chosen: Array<{ path: string; name: string; weight: number; source: 'manual' }> = [];
      for (const item of params.loras ?? []) {
        const record = byPath.get(String(item.path).toLowerCase());
        if (!record) continue;
        chosen.push({ path: record.path, name: record.name, weight: clamp(Number(item.weight) || 0.75, 0.05, 2), source: 'manual' });
      }
      if (!lorasProvided) {
        const settings = this.settings.get();
        const defaults = resolveDefaults(records, settings.default_loras);
        for (const lora of defaults.loras.slice(0, this.opts.cfg.loraMaxCount)) {
          chosen.push({ path: lora.path, name: lora.name, weight: lora.weight, source: 'manual' });
        }
      }
      const warnings: string[] = [];
      const task = await this.submit(params, chosen, warnings);
      return { ok: true, task, warnings };
    } catch (error) {
      return { ok: false, error: safeMessage(error) };
    }
  }

  private panelHistory(limit: unknown): { task: GenerateTaskView | null; history: HistoryEntry[]; total: number } {
    const n = clamp(Number(limit) || this.opts.cfg.historyLimit, 1, this.opts.cfg.historyLimit);
    return { task: this.ensureTasks().latest(), history: this.outputStore().list(n), total: this.outputStore().list(200).length };
  }

  private async panelCancel(id: unknown): Promise<{ ok: boolean }> {
    return { ok: await this.ensureTasks().cancel(typeof id === 'string' ? id : undefined) };
  }

  private async panelLaunch(): Promise<{ ok: boolean; message: string }> {
    const result = await this.launch.launch();
    void this.refreshHealth(true);
    if (result.ok) {
      this.loraCache = null;
      void this.getLoRAs(true).catch(() => {});
    }
    return { ok: result.ok, message: result.message };
  }

  private async panelStop(): Promise<{ ok: boolean; message: string }> {
    if (this.tasks?.active()) return { ok: false, message: '正在出图，先取消任务再关闭 ComfyUI。' };
    const result = await this.launch.stop();
    void this.refreshHealth(true);
    return { ok: result.ok, message: result.message };
  }

  private async panelRefreshModels(): Promise<{
    ok: boolean; checkpoints: string[]; diffusion_models: string[]; model_files: Array<{ path: string; name: string; kind: string; size: number; file: string }>; model_root: string;
    samplers: string[]; schedulers: string[]; control_nets: string[]; loras: LoRARecord[]; lora_root: string; health: HealthType;
  }> {
    this.modelScanCache = null;
    this.checkpointsCache = null;
    this.loraCache = null;
    const health = await this.refreshHealth(true);
    const checkpoints = await this.checkpoints(true);
    const diffusionModels = this.diffusionModels(true);
    const samplers = await this.samplers(true);
    const schedulers = await this.schedulers(true);
    const controlNets = await this.controlNets(true);
    const loras = await this.getLoRAs(true);
    return {
      ok: health.ok, checkpoints, diffusion_models: diffusionModels, model_root: this.modelsRoot(),
      model_files: this.scanModels().items.slice(0, 500).map(({ path, name, kind, size, file }) => ({ path, name, kind, size, file })),
      samplers, schedulers, control_nets: controlNets, loras, lora_root: this.loraRoot(), health,
    };
  }

  private panelSyncModelPaths(): { ok: boolean; path: string; created: boolean; message: string } {
    const comfy = this.opts.cfg.comfyDir.trim();
    const models = this.opts.cfg.modelsDir.trim() || this.modelsRoot();
    const result = ensureExtraModelPaths(comfy, models);
    if (result.ok) {
      this.modelScanCache = null;
      this.checkpointsCache = null;
      this.loraCache = null;
    }
    return result;
  }

  private binary(file: string, mime: string): { $binary: { mime: string; base64: string } } {
    return { $binary: { mime, base64: readFileSync(file).toString('base64') } };
  }

  private panelImage(id: unknown): { $binary: { mime: string; base64: string } } {
    const entry = this.outputStore().get(String(id ?? ''));
    if (!entry) throw new Error('找不到这张图');
    if (!existsSync(entry.path)) throw new Error(`图片文件不存在：${entry.filename}`);
    return this.binary(entry.path, MIME_BY_EXT[extname(entry.filename).toLowerCase()] ?? 'image/png');
  }

  private panelLocalImage(path: unknown): { $binary: { mime: string; base64: string } } {
    const file = resolve(String(path ?? ''));
    const mime = MIME_BY_EXT[extname(file).toLowerCase()];
    if (!mime) throw new Error('只支持 png / jpg / webp / gif');
    if (!existsSync(file)) throw new Error(`文件不存在：${file}`);
    if (statSync(file).size > 30 * 1024 * 1024) throw new Error('图片超过 30 MB');
    return this.binary(file, mime);
  }

  private async panelLoraPreview(path: unknown): Promise<{ $binary: { mime: string; base64: string } }> {
    const key = String(path ?? '').toLowerCase();
    const records = await this.getLoRAs();
    const record = records.find((item) => item.path.toLowerCase() === key);
    if (!record?.preview) throw new Error('这个 LoRA 没有预览图');
    const root = this.loraRoot();
    const file = join(root, record.preview);
    if (!resolve(file).startsWith(resolve(root)) || !existsSync(file)) throw new Error('预览图文件不存在');
    return this.binary(file, MIME_BY_EXT[extname(file).toLowerCase()] ?? 'image/png');
  }

  private panelReveal(id: unknown): { ok: boolean; path: string } {
    const entry = this.outputStore().get(String(id ?? ''));
    if (!entry) throw new Error('找不到这张图');
    openInFileManager(this.outputDir(), entry.path);
    return { ok: true, path: entry.path };
  }

  private async panelSendToPet(id: unknown): Promise<{ ok: boolean; message: string }> {
    const entry = this.outputStore().get(String(id ?? ''));
    if (!entry) return { ok: false, message: '找不到这张图' };
    const ok = await this.showInPetBubble(entry.path);
    return { ok, message: ok ? '已发到桌宠气泡。' : '桌宠没开或气泡接口不可用；可以点「打开文件夹」。' };
  }

  private async panelListLoras(): Promise<{ loras: LoRARecord[]; defaults: DefaultLoRA[]; aliases: Record<string, string[]>; lora_root: string }> {
    const loras = await this.getLoRAs(true);
    return {
      loras,
      defaults: this.settings.get().default_loras,
      aliases: this.settings.get().lora_aliases,
      lora_root: this.loraRoot(),
    };
  }

  private panelSetDefaults(raw: unknown): { ok: boolean; defaults?: DefaultLoRA[]; error?: string } {
    try {
      if (!Array.isArray(raw)) return { ok: false, error: '默认 LoRA 必须是数组' };
      const defaults: DefaultLoRA[] = [];
      for (const item of raw.slice(0, 20)) {
        if (!item || typeof item !== 'object') continue;
        const entry = item as Record<string, unknown>;
        const path = String(entry.path ?? '').replace(/\\/g, '/');
        if (!path) continue;
        defaults.push({
          name: String(entry.name ?? path.split('/').pop() ?? path),
          path,
          weight: clamp(Number(entry.weight) || 0.8, 0.05, 2),
          trigger_words: Array.isArray(entry.trigger_words) ? strings(entry.trigger_words) : [],
        });
      }
      this.settings.setDefaults(defaults);
      this.loraCache = null;
      return { ok: true, defaults: this.settings.get().default_loras };
    } catch (error) {
      return { ok: false, error: safeMessage(error) };
    }
  }

  private panelSetAliases(raw: unknown): { ok: boolean; aliases?: Record<string, string[]>; error?: string } {
    try {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, error: '别名表必须是对象' };
      const aliases: Record<string, string[]> = {};
      for (const [key, value] of Object.entries(raw as Record<string, unknown>).slice(0, 300)) {
        const alias = key.trim();
        if (!alias) continue;
        aliases[alias] = strings(value);
      }
      this.settings.setAliases(aliases);
      this.loraCache = null;
      return { ok: true, aliases: this.settings.get().lora_aliases };
    } catch (error) {
      return { ok: false, error: safeMessage(error) };
    }
  }

  private panelSetLoraMeta(path: unknown, patch: unknown): { ok: boolean; error?: string } {
    try {
      const key = String(path ?? '').trim();
      if (!key) return { ok: false, error: '缺少 LoRA 路径' };
      if (!patch || typeof patch !== 'object') return { ok: false, error: '缺少要保存的字段' };
      const entry = patch as Record<string, unknown>;
      const meta: LoRAMeta = {};
      if (entry.aliases !== undefined) meta.aliases = strings(entry.aliases);
      if (entry.trigger_words !== undefined) meta.trigger_words = strings(entry.trigger_words);
      if (entry.weight !== undefined) meta.weight = clamp(Number(entry.weight) || 0, 0.05, 2);
      this.settings.setMeta(key, meta);
      this.loraCache = null;
      return { ok: true };
    } catch (error) {
      return { ok: false, error: safeMessage(error) };
    }
  }

  private panelPresetDetail(id: unknown): { ok: boolean; preset?: Record<string, unknown>; error?: string } {
    const preset = this.presets.get(String(id ?? ''));
    if (!preset) return { ok: false, error: '找不到这个工作流' };
    return {
      ok: true,
      preset: {
        id: preset.id,
        name: preset.name,
        builtin: preset.builtin,
        kind: preset.kind,
        mapping: preset.param_mapping,
        warnings: preset.warnings ?? [],
      },
    };
  }

  private async panelImportWorkflow(file: unknown, name: unknown): Promise<{ ok: boolean; preset?: WorkflowSummary; warnings?: string[]; error?: string }> {
    try {
      const path = resolve(String(file ?? ''));
      if (!existsSync(path)) return { ok: false, error: `文件不存在：${path}` };
      if (statSync(path).size > 20 * 1024 * 1024) return { ok: false, error: '工作流 JSON 超过 20 MB' };
      const raw = JSON.parse(readFileSync(path, 'utf8')) as unknown;
      let workflow;
      let warnings: string[] = [];
      if (looksLikeUiWorkflow(raw)) {
        let info = {};
        try {
          const health = await this.refreshHealth(false);
          if (health.ok) info = await this.comfy().objectInfo();
        } catch { /* 离线时用内置 schema */ }
        const converted = convertUiWorkflow(raw, info as ObjectInfo);
        if ('error' in converted) return { ok: false, error: converted.error };
        workflow = converted.workflow;
        warnings = converted.warnings;
      } else {
        const checked = validateApiWorkflow(raw);
        if ('error' in checked) return { ok: false, error: `${checked.error}；如果这是 ComfyUI 的 UI 格式，请用「Save (API Format)」导出。` };
        workflow = checked.workflow;
      }
      const detected = detectParamMapping(workflow);
      warnings.push(...detected.warnings);
      const presetName = typeof name === 'string' && name.trim()
        ? name.trim()
        : safeFilenamePart(path.split(/[\\/]/).pop()?.replace(/\.json$/i, '') ?? '导入的工作流');
      const preset = this.presets.add({
        name: presetName,
        workflow: workflow as unknown as Record<string, unknown>,
        mapping: detected.mapping,
        source: path,
        warnings,
      });
      return {
        ok: true,
        preset: {
          id: preset.id,
          name: preset.name,
          builtin: false,
          kind: 'imported',
          created_at: preset.created_at,
          source: path,
          ...(warnings.length ? { warnings } : {}),
          mapping_count: detected.mapping.length,
        },
        warnings,
      };
    } catch (error) {
      return { ok: false, error: `导入失败：${safeMessage(error)}` };
    }
  }

  /** 给测试/诊断用。 */
  diagnostics(): { url: string; output: string; loraRoot: string; loras: number; warnings: string[] } {
    return {
      url: normalizeBaseUrl(this.opts.cfg.url),
      output: this.outputDir(),
      loraRoot: this.loraRoot(),
      loras: this.loraCache?.items.length ?? 0,
      warnings: this.loraCache?.warnings ?? [],
    };
  }
}

export type { GenerateTaskView };
