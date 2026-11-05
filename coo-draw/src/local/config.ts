import type { ConfigGroup, ConfigProperty } from 'cortico/core/types.ts';

/** `worlds.coo-gen` 段。简单标量放这里；LoRA 数组、别名和字典放在 settings.json。 */
export interface CooGenConfigSection {
  enabled: boolean;
  /** ComfyUI HTTP 根地址。 */
  url: string;
  /** ComfyUI 根目录（包含 main.py 和 models 的那层）。 */
  comfyDir: string;
  /** 独立的模型根目录；包含 checkpoints / loras / diffusion_models。留空时用 comfyDir/models。 */
  modelsDir: string;
  /** 插件启动后自动拉起 ComfyUI。 */
  autoLaunch: boolean;
  /** 启动脚本 / 可执行文件；留空时不提供一键启动。 */
  launchScript: string;
  /** 启动参数，一行字符串，支持双引号。 */
  launchArgs: string;
  /** 关闭脚本；留空时不提供关闭按钮/工具。 */
  stopScript: string;
  /** 启动工作目录；留空时取脚本所在目录。 */
  launchCwd: string;
  /** 启动后等待 /system_stats 就绪的秒数。 */
  launchWaitSeconds: number;
  /** 出图保存目录；留空 = 部署数据目录下的 output。 */
  outputDir: string;
  /** 默认 checkpoint（ComfyUI 里的文件名）。 */
  defaultCheckpoint: string;
  /** 一次最多叠加几个 LoRA。 */
  loraMaxCount: number;
  /** 面板保留最近多少张。 */
  historyLimit: number;
  sampler: string;
  scheduler: string;
  steps: number;
  cfg: number;
  width: number;
  height: number;
  batch: number;
  negativePrompt: string;
  promptPrefix: string;
  promptSuffix: string;
  /** 可选的 OpenAI 兼容翻译端点；留空时只用词典 + 调用方给英文 tag。 */
  translateUrl: string;
  translateModel: string;
  /** 从部署 .env 读翻译 Key 的变量名。 */
  translateKeyEnv: string;
  translateTimeoutSeconds: number;
  /** 单次任务总超时。 */
  timeoutSeconds: number;
  /** 轮询 /history 的间隔。 */
  pollSeconds: number;
  /** 画完是否在桌宠头顶气泡弹第一张。 */
  popupEnabled: boolean;
  popupSeconds: number;
  popupScale: number;
  /** 面板默认工作流 id。 */
  defaultWorkflow: string;
}

export const COO_GEN_DEFAULTS: CooGenConfigSection = {
  enabled: false,
  url: 'http://127.0.0.1:8188',
  comfyDir: '',
  modelsDir: '',
  autoLaunch: false,
  launchScript: '',
  launchArgs: '',
  stopScript: '',
  launchCwd: '',
  launchWaitSeconds: 60,
  outputDir: '',
  defaultCheckpoint: '',
  loraMaxCount: 3,
  historyLimit: 50,
  sampler: 'euler_ancestral',
  scheduler: 'normal',
  steps: 20,
  cfg: 7,
  width: 768,
  height: 1152,
  batch: 1,
  negativePrompt: 'low quality, blurry, bad anatomy',
  promptPrefix: 'masterpiece, best quality',
  promptSuffix: '',
  translateUrl: '',
  translateModel: '',
  translateKeyEnv: 'COO_GEN_LLM_KEY',
  translateTimeoutSeconds: 12,
  timeoutSeconds: 300,
  pollSeconds: 2,
  popupEnabled: true,
  popupSeconds: 6,
  popupScale: 0.8,
  defaultWorkflow: 'quick-txt2img',
};

export const SAMPLERS = [
  'euler_ancestral',
  'euler',
  'heun',
  'dpm_2',
  'dpm_2_ancestral',
  'lms',
  'dpmpp_2s_ancestral',
  'dpmpp_sde',
  'dpmpp_2m',
  'dpmpp_2m_sde',
  'dpmpp_3m_sde',
  'ddim',
  'uni_pc',
] as const;

export const SCHEDULERS = [
  'normal',
  'karras',
  'exponential',
  'sgm_uniform',
  'simple',
  'ddim_uniform',
  'beta',
] as const;

export const COO_GEN_CONFIG_GROUP: ConfigGroup = {
  id: 'world:coo-gen',
  owner: 'world:coo-gen',
  schema: {
    type: 'object',
    title: '出图',
    description: '用本地 ComfyUI 出用户自己的图。这里只放连接和默认值；LoRA 常驻组合、别名和默认参数在「出图」面板里管理。',
    properties: {
      'worlds.coo-gen.url': {
        type: 'string',
        title: 'ComfyUI 地址',
        description: '默认 http://127.0.0.1:8188。面板会实时检测 /system_stats。',
        'x-hot': true,
      },
      'worlds.coo-gen.comfyDir': {
        type: 'string',
        title: 'ComfyUI 根目录',
        description: '包含 main.py 和 models 的那层，例如 D:\\develop\\ComfyUI\\ComfyUI。用来找 ComfyUI 自己的 models 和 extra_model_paths.yaml。',
        'x-path': { kind: 'directory' },
        'x-hot': true,
      },
      'worlds.coo-gen.modelsDir': {
        type: 'string',
        title: '模型根目录',
        description: '独立的模型文件夹，例如 D:\\develop\\ComfyUI\\models。里面放 checkpoints/、loras/、diffusion_models/；留空时用 ComfyUI 根目录下的 models。插件会从这里扫描模型，并可通过面板写入 extra_model_paths.yaml 让 ComfyUI 也读取。',
        'x-path': { kind: 'directory' },
        'x-hot': true,
      },
      'worlds.coo-gen.outputDir': {
        type: 'string',
        title: '出图保存目录',
        description: '留空 = 部署数据目录下的 output。图按「时间_种子_模型.png」保存，并写 PNG 元数据。',
        'x-path': { kind: 'directory' },
        'x-hot': true,
      },
      'worlds.coo-gen.defaultCheckpoint': {
        type: 'string',
        title: '默认模型',
        description: 'ComfyUI 的 checkpoint 文件名；面板里可以改。留空时用列表第一个。',
        'x-hot': true,
      },
      'worlds.coo-gen.loraMaxCount': {
        type: 'integer',
        title: 'LoRA 最多叠加数',
        description: '1–5，默认 3。对话匹配优先于默认 LoRA；超限时淘汰默认。',
        minimum: 1,
        maximum: 5,
        'x-hot': true,
      },
      'worlds.coo-gen.historyLimit': {
        type: 'integer',
        title: '面板历史条数',
        description: '1–200，默认 50。只影响面板与历史索引，不删图。',
        minimum: 1,
        maximum: 200,
        'x-hot': true,
      },
      'worlds.coo-gen.sampler': {
        type: 'string',
        title: '默认采样器',
        description: '新任务默认使用；面板里可以改。',
        enum: [...SAMPLERS],
        'x-hot': true,
      },
      'worlds.coo-gen.scheduler': {
        type: 'string',
        title: '默认调度器',
        enum: [...SCHEDULERS],
        'x-hot': true,
      },
      'worlds.coo-gen.steps': {
        type: 'integer',
        title: '默认步数',
        description: '1–100，默认 20。',
        minimum: 1,
        maximum: 100,
        'x-hot': true,
      },
      'worlds.coo-gen.cfg': {
        type: 'number',
        title: '默认 CFG',
        description: '1–30，默认 7。',
        minimum: 1,
        maximum: 30,
        'x-hot': true,
      },
      'worlds.coo-gen.width': {
        type: 'integer',
        title: '默认宽度',
        description: '64–4096，默认 768。',
        minimum: 64,
        maximum: 4096,
        'x-hot': true,
      },
      'worlds.coo-gen.height': {
        type: 'integer',
        title: '默认高度',
        description: '64–4096，默认 1152。',
        minimum: 64,
        maximum: 4096,
        'x-hot': true,
      },
      'worlds.coo-gen.batch': {
        type: 'integer',
        title: '默认批次',
        description: '1–8，默认 1。',
        minimum: 1,
        maximum: 8,
        'x-hot': true,
      },
      'worlds.coo-gen.negativePrompt': {
        type: 'string',
        title: '默认反向提示词',
        description: '面板里可改；对话触发出图时也用它。',
        'x-hot': true,
      },
      'worlds.coo-gen.promptPrefix': {
        type: 'string',
        title: '正向提示词前缀',
        description: '每次出图自动加在最前面；留空不加。',
        'x-hot': true,
      },
      'worlds.coo-gen.promptSuffix': {
        type: 'string',
        title: '正向提示词后缀',
        description: '每次出图自动加在最后面；留空不加。',
        'x-hot': true,
      },
      'worlds.coo-gen.translateUrl': {
        type: 'string',
        title: '翻译端点（可选）',
        description: 'OpenAI 兼容的 /v1/chat/completions 地址，例如 http://127.0.0.1:11434/v1。留空时只用词典和调用方给的英文 tag。',
        'x-hot': true,
      },
      'worlds.coo-gen.translateModel': {
        type: 'string',
        title: '翻译模型',
        description: '例如 qwen2.5:7b；留空则不开翻译。',
        'x-hot': true,
      },
      'worlds.coo-gen.translateKeyEnv': {
        type: 'string',
        title: '翻译 Key 的环境变量名',
        description: '默认 COO_GEN_LLM_KEY；本地端点通常不需要，留空即可。',
        'x-hot': true,
      },
      'worlds.coo-gen.translateTimeoutSeconds': {
        type: 'integer',
        title: '翻译超时（秒）',
        description: '3–60，默认 12。超时后原文直接作为 prompt。',
        minimum: 3,
        maximum: 60,
        'x-hot': true,
      },
      'worlds.coo-gen.timeoutSeconds': {
        type: 'integer',
        title: '单次出图超时（秒）',
        description: '30–1800，默认 300；超时后任务标记为失败并提示取消。',
        minimum: 30,
        maximum: 1800,
        'x-hot': true,
      },
      'worlds.coo-gen.pollSeconds': {
        type: 'integer',
        title: '轮询间隔（秒）',
        description: '1–10，默认 2；WebSocket 断线时靠它查 /history。',
        minimum: 1,
        maximum: 10,
        'x-hot': true,
      },
      'worlds.coo-gen.popupEnabled': {
        type: 'boolean',
        title: '画完自动弹第一张',
        description: '弹在桌宠头顶的气泡里；桌宠没开时只留对话页和面板。',
        'x-hot': true,
      },
      'worlds.coo-gen.popupSeconds': {
        type: 'integer',
        title: '气泡停留（秒）',
        description: '1–30，默认 6。',
        minimum: 1,
        maximum: 30,
        'x-hot': true,
      },
      'worlds.coo-gen.popupScale': {
        type: 'number',
        title: '气泡尺寸缩放',
        description: '0.3–2，默认 0.8。',
        minimum: 0.3,
        maximum: 2,
        'x-hot': true,
      },
      'worlds.coo-gen.defaultWorkflow': {
        type: 'string',
        title: '默认工作流',
        description: '内置 quick-txt2img / img2img / controlnet，或导入工作流的 id。',
        'x-hot': true,
      },
      'worlds.coo-gen.launchScript': {
        type: 'string',
        title: 'ComfyUI 启动脚本',
        description: '一键启动用的 .bat / .cmd / .exe / .py；留空则不提供一键启动。',
        'x-path': { kind: 'file', extensions: ['.bat', '.cmd', '.exe', '.py', '.ps1'] },
        'x-warning': true,
        'x-hot': true,
      },
      'worlds.coo-gen.launchArgs': {
        type: 'string',
        title: '启动参数',
        description: '例如 --port 8188；支持双引号。用 start_coo-gen 脚本时留空即可，脚本会自己带端口。',
        'x-hot': true,
      },
      'worlds.coo-gen.stopScript': {
        type: 'string',
        title: 'ComfyUI 关闭脚本',
        description: '一键关闭用的 .bat / .cmd / .exe / .ps1；留空则面板和对话都不提供关闭。',
        'x-path': { kind: 'file', extensions: ['.bat', '.cmd', '.exe', '.ps1'] },
        'x-warning': true,
        'x-hot': true,
      },
      'worlds.coo-gen.launchCwd': {
        type: 'string',
        title: '启动工作目录',
        description: '留空时用脚本所在目录。',
        'x-path': { kind: 'directory' },
        'x-hot': true,
      },
      'worlds.coo-gen.launchWaitSeconds': {
        type: 'integer',
        title: '启动等待（秒）',
        description: '10–300，默认 60；期间每 1.5 秒探测一次。',
        minimum: 10,
        maximum: 300,
        'x-hot': true,
      },
      'worlds.coo-gen.autoLaunch': {
        type: 'boolean',
        title: '插件启动时自动拉起 ComfyUI',
        description: '只在配置了启动脚本时生效；不会重复启动已经在运行的实例。',
        'x-hot': true,
      },
    } as unknown as Record<string, ConfigProperty>,
  },
};
