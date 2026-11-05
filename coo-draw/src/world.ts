/**
 * 「画室」World：一个入口，两套画法。
 *
 * - API 引擎（`./api`，从 pet-draw 搬来）负责人设笔触的小画：画夹、评价、弹图、额度；
 * - 本地引擎（`./local`，从 coo-gen 搬来）负责用户自己的 ComfyUI 出图：工作室、LoRA、工作流；
 * - 两处人设调用点（桌宠主动画 / 日记配图）各有一个路由开关；选了本地就把渲染交给本地引擎，
 *   但计数、画夹、气泡和评价仍由 API 引擎统一处理，保证日记和评价链路不变。
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import type { Language } from 'cortico/core/language.ts';
import type {
  ToolCallContext, ToolDef, ToolOutcome, World, WorldHost, WorldWebUiDecl,
} from 'cortico/core/types.ts';
import type { PopupLike } from './api/popup.ts';
import { PetDrawWorld } from './api/world.ts';
import { CooGenWorld } from './local/world.ts';
import type { WebSocketLike } from './local/comfy.ts';
import {
  DRAW_DEFAULTS, DRAW_GROUPS, legacyMigrationPatch, type DrawConfigSection,
} from './config.ts';
import type {
  DrawPurpose, LocalPersonaRequest, LocalPersonaResult, PersonaRenderConfig,
} from './render-types.ts';

const ENV_PROMPT_FILE = fileURLToPath(new URL('./ENV_PROMPT.md', import.meta.url));
const MIGRATION_MARKER = 'draw-migrated.json';


export interface DrawWorldOptions {
  cfg: DrawConfigSection;
  timezone: string;
  dataDir: string;
  botDir: string;
  botName: string;
  secret: (name: string) => string;
  persist?: (patch: Partial<DrawConfigSection>) => void;
  popup?: PopupLike;
  fetchImpl?: typeof fetch;
  WebSocketImpl?: new (url: string) => WebSocketLike;
  spawnImpl?: typeof spawn;
  clientFactory?: (url: string) => import('./local/comfy.ts').ComfyApi;
  now?: () => Date;
}

const capitalize = (key: string): string => key.charAt(0).toUpperCase() + key.slice(1);

/** 把合并配置投影成 coo-gen 认识的字段名（local 前缀）。 */
function localCfgView(cfg: DrawConfigSection): import('./local/config.ts').CooGenConfigSection {
  const target = cfg as unknown as Record<string, unknown>;
  return new Proxy(target, {
    get(obj, prop, receiver) {
      if (typeof prop !== 'string') return Reflect.get(obj, prop, receiver);
      if (prop === 'enabled') return obj.enabled;
      return obj[`local${capitalize(prop)}`];
    },
  }) as unknown as import('./local/config.ts').CooGenConfigSection;
}

function routeLabel(value: DrawConfigSection['routePet']): string {
  return value === 'local' ? '本地 ComfyUI' : 'API（千问）';
}

export class DrawWorld implements World {
  readonly id = 'draw';
  private readonly api: PetDrawWorld;
  private readonly local: CooGenWorld;
  private host: WorldHost | undefined;

  constructor(private readonly opts: DrawWorldOptions) {
    this.api = new PetDrawWorld({
      cfg: opts.cfg,
      timezone: opts.timezone,
      dataDir: opts.dataDir,
      botDir: opts.botDir,
      botName: opts.botName,
      secret: opts.secret,
      ...(opts.persist ? { persist: (patch) => opts.persist!(patch as Partial<DrawConfigSection>) } : {}),
      ...(opts.popup ? { popup: opts.popup } : {}),
      ...(opts.fetchImpl ? { fetchImpl: opts.fetchImpl } : {}),
      ...(opts.now ? { now: opts.now } : {}),
      routeFor: (purpose) => this.routeFor(purpose),
      renderLocal: (request) => this.renderLocal(request),
    });
    this.local = new CooGenWorld({
      cfg: localCfgView(opts.cfg),
      timezone: opts.timezone,
      dataDir: opts.dataDir,
      botDir: opts.botDir,
      botName: opts.botName,
      secret: opts.secret,
      ...(opts.fetchImpl ? { fetchImpl: opts.fetchImpl } : {}),
      ...(opts.WebSocketImpl ? { WebSocketImpl: opts.WebSocketImpl } : {}),
      ...(opts.spawnImpl ? { spawnImpl: opts.spawnImpl } : {}),
      ...(opts.clientFactory ? { clientFactory: opts.clientFactory } : {}),
      ...(opts.now ? { now: opts.now } : {}),
      personaConfig: () => this.personaConfig(),
    });
  }

  /* --------------------------------------------------------------- 路由 */

  private routeFor(purpose: DrawPurpose): 'api' | 'local' {
    return purpose === 'diary' ? this.opts.cfg.routeDiary : this.opts.cfg.routePet;
  }

  private personaConfig(): PersonaRenderConfig {
    const cfg = this.opts.cfg;
    return {
      workflow: cfg.personaWorkflow,
      unet: cfg.personaUnet,
      clip: cfg.personaClip,
      vae: cfg.personaVae,
      steps: cfg.personaSteps,
      cfg: cfg.personaCfg,
      sampler: cfg.personaSampler,
      scheduler: cfg.personaScheduler,
      loras: cfg.personaLoras,
      negative: cfg.personaNegative,
      extra: cfg.personaExtraPrompt,
      referenceMode: cfg.personaReferenceMode,
      denoise: cfg.personaImg2imgDenoise,
    };
  }

  private renderLocal(request: LocalPersonaRequest): Promise<LocalPersonaResult> {
    return this.local.renderPersona(request);
  }

  /* ----------------------------------------------------------- 生命周期 */

  async start(host: WorldHost): Promise<void> {
    this.host = host;
    this.migrateLegacyConfig(host);
    await this.api.start(host);
    await this.local.start(host);
    host.log.info('draw mounted', {
      routePet: this.opts.cfg.routePet,
      routeDiary: this.opts.cfg.routeDiary,
      style: this.opts.cfg.style,
      personaWorkflow: this.opts.cfg.personaWorkflow,
    });
  }

  async stop(): Promise<void> {
    await this.local.stop();
    await this.api.stop();
    this.host = undefined;
  }

  /** 从旧 `worlds.pet-draw` / `worlds.coo-gen` 拷一次配置；只补仍是默认值的键。 */
  private migrateLegacyConfig(host: WorldHost): void {
    const marker = join(this.opts.dataDir, MIGRATION_MARKER);
    if (existsSync(marker)) return;
    try {
      const raw = JSON.parse(readFileSync(join(this.opts.botDir, 'config.json'), 'utf8')) as {
        worlds?: Record<string, Record<string, unknown> | undefined>;
      };
      const patch = legacyMigrationPatch(raw.worlds?.['pet-draw'], raw.worlds?.['coo-gen'], this.opts.cfg, DRAW_DEFAULTS);
      if (Object.keys(patch).length) {
        this.opts.persist?.(patch);
        host.log.info('draw: legacy config migrated', { keys: Object.keys(patch) });
      }
      writeFileSync(marker, `${JSON.stringify({ at: new Date().toISOString(), keys: Object.keys(patch) }, null, 2)}\n`, 'utf8');
    } catch (error) {
      host.log.warn('draw: legacy config migration failed', { error: String(error) });
    }
  }

  /* --------------------------------------------------------------- 工具 */

  tools(): ToolDef[] {
    const apiTools = this.api.tools();
    const localTools = this.local.tools();
    const petDraw = apiTools.find((tool) => tool.name === 'pet_draw');
    const rest = apiTools.filter((tool) => tool.name !== 'pet_draw');
    if (!petDraw) return [...apiTools, ...localTools];
    return [
      {
        ...petDraw,
        handler: (args: Record<string, unknown>, ctx: ToolCallContext): Promise<string | ToolOutcome> => this.petDraw(args, ctx, petDraw.handler),
      },
      ...rest,
      ...localTools,
    ];
  }

  private petDraw(
    args: Record<string, unknown>,
    ctx: ToolCallContext,
    apiHandler: ToolDef['handler'],
  ): Promise<string | ToolOutcome> {
    // 路由本身由 API 引擎内部处理（它知道怎么存画夹和推事件）；这里只补默认 purpose。
    return apiHandler({ ...args, purpose: args.purpose === 'diary' ? 'diary' : 'pet' }, ctx);
  }

  /* ---------------------------------------------------------- 环境变量 */

  envPromptVars(): Record<string, string> {
    const cfg = this.opts.cfg;
    const apiVars = this.api.envPromptVars();
    const localVars = this.local.envPromptVars();
    return {
      ...apiVars,
      ...localVars,
      'draw.routePet': routeLabel(cfg.routePet),
      'draw.routeDiary': routeLabel(cfg.routeDiary),
      'draw.routes': `桌宠主动画=${routeLabel(cfg.routePet)}；日记配图=${routeLabel(cfg.routeDiary)}`,
      'draw.style': apiVars['petDraw.style'] ?? cfg.style,
      'draw.personaWorkflow': cfg.personaWorkflow,
      'draw.personaReferenceMode': cfg.personaReferenceMode === 'img2img' ? '图生图' : '先写提示词',
    };
  }

  /* --------------------------------------------------------------- 面板 */

  webUi(language: Language = 'zh'): WorldWebUiDecl {
    const zh = language.startsWith('zh');
    const apiUi = this.api.webUi(language);
    const localUi = this.local.webUi(language);
    return {
      label: zh ? '画室' : 'Drawing studio',
      config: DRAW_GROUPS,
      panels: [
        {
          id: 'api',
          title: zh ? 'API 绘画' : 'API drawings',
          description: zh
            ? '铃兰按自己的人设画 512×512 小画：画夹、画风、额度和参考图。'
            : 'Persona-styled 512x512 drawings: gallery, style, quota and references.',
          getMethods: ['open'],
        },
        {
          id: 'local',
          title: zh ? '本地出图' : 'Local studio',
          description: zh
            ? '用你的 ComfyUI 出你自己的图：模型、LoRA、工作流、进度与历史。'
            : 'Your own ComfyUI pictures: checkpoints, LoRAs, workflows, progress and history.',
        },
      ],
      invoke: async (panel, method, args) => {
        if (panel === 'api') return apiUi.invoke!('folder', method, args);
        // 本地页签内用「studio.xxx / loras.xxx / workflows.xxx」前缀把子面板的方法转发给原实现。
        if (panel === 'local') {
          const dot = method.indexOf('.');
          if (dot > 0) return localUi.invoke!(method.slice(0, dot), method.slice(dot + 1), args);
          return localUi.invoke!('studio', method, args);
        }
        return localUi.invoke!(panel, method, args);
      },
      lamps: [
        ...(apiUi.lamps ?? []),
        ...(localUi.lamps ?? []),
      ],
      promptDocs: [
        {
          key: 'worlds.draw.envPrompt',
          title: zh ? '画室 · 环境提示词' : 'Drawing studio · prompt',
          description: zh
            ? '说明两种画法的分工、两处路由当前指向哪里、人设出图怎么保持铃兰的手笔，以及什么时候用 pet_draw / coo_gen。'
            : 'Explains the two backends, where each persona call site is routed, how persona drawings keep their hand, and when to use pet_draw / coo_gen.',
          path: ENV_PROMPT_FILE,
          role: 'envPrompt',
          vars: [
            { name: 'draw.routes', description: '当前两处人设调用点的画法摘要。' },
            { name: 'draw.routePet', description: '桌宠主动画当前用哪种画法。' },
            { name: 'draw.routeDiary', description: '日记配图当前用哪种画法。' },
            { name: 'draw.personaWorkflow', description: '本地人设笔触的工作流 id。' },
            { name: 'draw.personaReferenceMode', description: '本地参考图是「先写提示词」还是「图生图」。' },
            { name: 'petDraw.persona', description: '从基础设定读到的名字。' },
            { name: 'petDraw.style', description: '当前画风的名字与一句短说明。' },
            { name: 'petDraw.today', description: '今天已画的张数与上限。' },
            { name: 'petDraw.key', description: '千问 API Key 是否已配置。' },
            { name: 'petDraw.perCall', description: '每次最多出几张。' },
            { name: 'petDraw.folder', description: '画夹目录与已存张数。' },
            { name: 'cooGen.status', description: 'ComfyUI 是否在线。' },
            { name: 'cooGen.url', description: 'ComfyUI 地址。' },
            { name: 'cooGen.models', description: '模型根目录。' },
            { name: 'cooGen.model', description: '默认模型。' },
            { name: 'cooGen.folder', description: '本地出图的保存目录。' },
            { name: 'cooGen.count', description: '历史里有多少张。' },
            { name: 'cooGen.loras', description: '可用 LoRA 列表。' },
            { name: 'cooGen.defaults', description: '常驻 LoRA。' },
            { name: 'cooGen.workflow', description: '默认工作流。' },
            { name: 'cooGen.maxLoras', description: '一次最多叠加几个 LoRA。' },
          ],
        },
      ],
      storage: [
        ...(apiUi.storage ?? []),
        ...(localUi.storage ?? []),
      ],
    };
  }
}

export { DRAW_DEFAULTS };
export type { DrawConfigSection };
