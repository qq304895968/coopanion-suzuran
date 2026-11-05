/**
 * `worlds.draw` 段：一个 World 的合并配置。
 *
 * - API 绘画沿用 pet-draw 的字段名（style / saveDir / popup…），方便旧配置直接迁移；
 * - 本地出图的字段统一加 `local` 前缀，避免 popupEnabled、width 这类同名键打架；
 * - 两处人设调用点各有一个路由开关：routePet / routeDiary；
 * - 人设笔触（本地）单独一组 persona*，不混进用户自己的出图参数。
 *
 * 配置 schema 只支持标量，所以 LoRA 列表用 `personaLoras` 一行字符串保存。
 */
import type { ConfigGroup, ConfigProperty } from 'cortico/core/types.ts';
import { PET_DRAW_CONFIG_GROUP, PET_DRAW_DEFAULTS, type PetDrawConfigSection } from './api/config.ts';
import { COO_GEN_CONFIG_GROUP, COO_GEN_DEFAULTS, type CooGenConfigSection } from './local/config.ts';

/** 一处的画法。 */
export type RouteBackend = 'api' | 'local';
/** 本地人设出图时，参考图是先写提示词还是直接图生图。 */
export type PersonaReferenceMode = 'describe' | 'img2img';

type Prefixed<T> = { [K in keyof T as `local${Capitalize<string & K>}`]: T[K] };
type LocalSection = Omit<CooGenConfigSection, 'enabled'>;

export type DrawConfigSection = Omit<PetDrawConfigSection, 'enabled'> & Prefixed<LocalSection> & {
  enabled: boolean;
  /** 桌宠主动画（聊天里自己画）走哪边。 */
  routePet: RouteBackend;
  /** 写日记时现画一张走哪边。 */
  routeDiary: RouteBackend;

  /** 人设笔触用的工作流；缺省用内置的 persona-krea2。 */
  personaWorkflow: string;
  /** 内置人设工作流的三件模型；换模型时改这里。 */
  personaUnet: string;
  personaClip: string;
  personaVae: string;
  personaSteps: number;
  personaCfg: number;
  personaSampler: string;
  personaScheduler: string;
  /** 人设笔触叠加的 LoRA；`文件名:权重` 逗号分隔。 */
  personaLoras: string;
  /** 人设笔触的负面词。 */
  personaNegative: string;
  /** 追加在人设提示词后的一句补充（可留空）。 */
  personaExtraPrompt: string;
  personaReferenceMode: PersonaReferenceMode;
  personaImg2imgDenoise: number;
};

const capitalize = (key: string): string => key.charAt(0).toUpperCase() + key.slice(1);

function prefixedLocalDefaults(): Prefixed<LocalSection> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(COO_GEN_DEFAULTS)) {
    if (key === 'enabled') continue;
    out[`local${capitalize(key)}`] = value;
  }
  return out as Prefixed<LocalSection>;
}

const LOCAL_DEFAULTS = prefixedLocalDefaults();

export const DRAW_DEFAULTS: DrawConfigSection = {
  ...PET_DRAW_DEFAULTS,
  ...LOCAL_DEFAULTS,
  routePet: 'api',
  routeDiary: 'api',
  personaWorkflow: 'persona-krea2',
  personaUnet: 'krea2_turbo_nvfp4.safetensors',
  personaClip: 'qwen3vl_4b_fp8_scaled.safetensors',
  personaVae: 'qwen_image_vae.safetensors',
  personaSteps: 8,
  personaCfg: 1,
  personaSampler: 'euler',
  personaScheduler: 'simple',
  personaLoras: '',
  personaNegative: '照片, 写实, 3D, 高清, 摄影, 粗糙, 文字, 水印, 签名, 边框',
  personaExtraPrompt: '',
  personaReferenceMode: 'describe',
  personaImg2imgDenoise: 0.55,
};

/** 旧配置段里可能出现的键。 */
type LegacyRecord = Record<string, unknown> | undefined;

function remapGroup(
  group: ConfigGroup,
  oldPrefix: string,
  mapKey: (short: string) => string,
  overrides: { id: string; title: string; description?: string },
): ConfigGroup {
  const properties: Record<string, ConfigProperty> = {};
  for (const [path, prop] of Object.entries(group.schema.properties)) {
    const short = path.startsWith(oldPrefix) ? path.slice(oldPrefix.length) : path;
    properties[mapKey(short)] = prop;
  }
  return {
    id: overrides.id,
    owner: 'world:draw',
    schema: {
      type: 'object',
      title: overrides.title,
      ...(overrides.description ? { description: overrides.description } : {}),
      properties,
    },
  };
}

const ROUTE_PROPERTIES: Record<string, ConfigProperty> = {
  'worlds.draw.routePet': {
    type: 'string',
    title: '桌宠主动画用哪种画法',
    description: '铃兰自己想画、或你让她画一张时走这边。API = 千问 512 小画；本地 = 你的 ComfyUI，按「人设笔触」预设出图。选哪种就用哪种，不可用时报错，不会偷偷换。',
    enum: ['api', 'local'],
    'x-options': 'draw-route',
    'x-hot': true,
  },
  'worlds.draw.routeDiary': {
    type: 'string',
    title: '日记配图用哪种画法',
    description: '写日记时现画一张走这边。无论 API 还是本地，都按人设笔触出图；本地不会套用你工作室的模型/LoRA。',
    enum: ['api', 'local'],
    'x-options': 'draw-route',
    'x-hot': true,
  },
};

const apiProperties = remapGroup(
  PET_DRAW_CONFIG_GROUP,
  'worlds.pet-draw.',
  (short) => `worlds.draw.${short}`,
  {
    id: 'world:draw',
    title: '绘图 · 通用与 API',
    description: '画风、配额、画夹和参考图是 API 绘画与本地人设出图共用的人设设定。API Key 只从部署 .env 读取，不写进 config.json。',
  },
).schema.properties;

export const DRAW_CONFIG_GROUP: ConfigGroup = {
  id: 'world:draw',
  owner: 'world:draw',
  schema: {
    type: 'object',
    title: '绘图 · 通用与 API',
    description: '画风、配额、画夹和参考图是 API 绘画与本地人设出图共用的人设设定。API Key 只从部署 .env 读取，不写进 config.json。',
    properties: { ...ROUTE_PROPERTIES, ...apiProperties },
  },
};

export const DRAW_LOCAL_CONFIG_GROUP: ConfigGroup = remapGroup(
  COO_GEN_CONFIG_GROUP,
  'worlds.coo-gen.',
  (short) => `worlds.draw.local${capitalize(short)}`,
  {
    id: 'world:draw-local',
    title: '本地出图 · ComfyUI',
    description: '用户自己的出图：连接、模型、LoRA、采样、保存目录、启动脚本。这里只影响「本地出图」页，不影响铃兰的人设笔触。',
  },
);

export const DRAW_PERSONA_CONFIG_GROUP: ConfigGroup = {
  id: 'world:draw-persona',
  owner: 'world:draw',
  schema: {
    type: 'object',
    title: '人设笔触 · 本地',
    description: '铃兰主动画或日记配图被路由到本地时，用这套独立的模型、LoRA 和采样参数，固定 512×512、一次一张。改动不会影响「本地出图」页的用户参数；画出来的图仍进画夹、可以评价。',
    properties: {
      'worlds.draw.personaWorkflow': {
        type: 'string',
        title: '人设工作流',
        description: '缺省 persona-krea2（内置 Krea2 文生图）。图生图会按参考图自动派生，不用另选。',
        'x-hot': true,
      },
      'worlds.draw.personaUnet': {
        type: 'string',
        title: '人设模型（UNET）',
        description: '内置人设工作流加载的 diffusion/UNET 文件名，例如 krea2_turbo_nvfp4.safetensors。',
        'x-hot': true,
      },
      'worlds.draw.personaClip': {
        type: 'string',
        title: '人设文本编码器',
        description: 'Krea2 配 qwen3vl_4b_fp8_scaled.safetensors；换模型时一起改。',
        'x-hot': true,
      },
      'worlds.draw.personaVae': {
        type: 'string',
        title: '人设 VAE',
        description: '与模型配套的 VAE，例如 qwen_image_vae.safetensors。',
        'x-hot': true,
      },
      'worlds.draw.personaSteps': {
        type: 'integer',
        title: '人设步数',
        description: 'Krea2 Turbo 建议 8 步；其它工作流按自己的需要改。',
        minimum: 1,
        maximum: 100,
        'x-hot': true,
      },
      'worlds.draw.personaCfg': {
        type: 'number',
        title: '人设 CFG',
        description: 'Krea2 Turbo 固定 1；换普通模型时再调。',
        minimum: 1,
        maximum: 30,
        'x-hot': true,
      },
      'worlds.draw.personaSampler': {
        type: 'string',
        title: '人设采样器',
        description: '例如 euler / euler_ancestral。',
        'x-hot': true,
      },
      'worlds.draw.personaScheduler': {
        type: 'string',
        title: '人设调度器',
        description: '例如 simple / normal。',
        'x-hot': true,
      },
      'worlds.draw.personaLoras': {
        type: 'string',
        title: '人设 LoRA',
        description: '`文件名:权重`，逗号分隔，最多 3 个；留空 = 纯模型。只影响人设笔触。',
        'x-hot': true,
      },
      'worlds.draw.personaNegative': {
        type: 'string',
        title: '人设负面词',
        description: '压住照片/写实/3D/文字/水印这类会破坏手绘感的元素；Krea2 CFG=1 时可能不起作用，换普通模型时生效。',
        'x-hot': true,
      },
      'worlds.draw.personaExtraPrompt': {
        type: 'string',
        title: '人设提示词补充',
        description: '追加在每张人设画后面的一句，比如纸张、笔触细节；留空即可。',
        'x-hot': true,
      },
      'worlds.draw.personaReferenceMode': {
        type: 'string',
        title: '本地参考图方式',
        description: 'describe = 铃兰先看参考图、写一句画什么，再出图（更稳，但多一轮）；img2img = 直接把参考图重绘（快，但可能不够像铃兰的手笔）。',
        enum: ['describe', 'img2img'],
        'x-options': 'draw-persona-reference',
        'x-hot': true,
      },
      'worlds.draw.personaImg2imgDenoise': {
        type: 'number',
        title: '图生图重绘幅度',
        description: '0.05–1。越高越像新画、越低越保留参考图；人设笔触建议 0.45–0.65。',
        minimum: 0.05,
        maximum: 1,
        'x-hot': true,
      },
    },
  },
};

export const DRAW_GROUPS: ConfigGroup[] = [
  DRAW_CONFIG_GROUP,
  DRAW_LOCAL_CONFIG_GROUP,
  DRAW_PERSONA_CONFIG_GROUP,
];

/** 旧 `worlds.pet-draw` / `worlds.coo-gen` → 新 `worlds.draw` 的一次性迁移补丁。 */
export function legacyMigrationPatch(
  petDraw: LegacyRecord,
  cooGen: LegacyRecord,
  current: DrawConfigSection,
  defaults: DrawConfigSection = DRAW_DEFAULTS,
): Partial<DrawConfigSection> {
  const patch: Record<string, unknown> = {};
  const shouldFill = (key: keyof DrawConfigSection): boolean => {
    const currentValue = current[key];
    const defaultValue = defaults[key];
    return currentValue === undefined || Object.is(currentValue, defaultValue);
  };

  if (petDraw) {
    for (const key of Object.keys(PET_DRAW_DEFAULTS) as Array<keyof PetDrawConfigSection>) {
      if (key === 'enabled') continue;
      const value = petDraw[key];
      if (value === undefined) continue;
      if (shouldFill(key as keyof DrawConfigSection)) patch[key] = value;
    }
  }

  if (cooGen) {
    for (const key of Object.keys(COO_GEN_DEFAULTS) as Array<keyof CooGenConfigSection>) {
      if (key === 'enabled') continue;
      const value = cooGen[key];
      if (value === undefined) continue;
      const next = `local${capitalize(key)}` as keyof DrawConfigSection;
      if (shouldFill(next)) patch[next] = value;
    }
  }

  if (petDraw?.enabled === true || cooGen?.enabled === true) {
    if (current.enabled === false) patch.enabled = true;
  }
  return patch as Partial<DrawConfigSection>;
}
