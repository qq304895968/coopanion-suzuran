/**
 * coo-gen 的公共类型。服务端和浏览器面板都 import 它；这里不能出现 node: 内置模块，
 * 否则浏览器 bundle 会把 Node 运行时拖进来。
 */

export type LoRASource = 'default' | 'auto' | 'manual';

export interface DefaultLoRA {
  /** 展示名；缺省时取文件名去扩展名。 */
  name: string;
  /** 相对 ComfyUI `models/loras` 的路径，统一用 `/`。 */
  path: string;
  weight: number;
  trigger_words: string[];
}

export interface LoRARecord {
  /** 相对 loras 根目录的路径（`/` 分隔），同时作为稳定 id。 */
  path: string;
  /** 不含目录与扩展名的文件名，例如 `zelda_botw_style`。 */
  name: string;
  /** 相对目录；根目录为空串。 */
  category: string;
  /** 文件字节数。 */
  size: number;
  /** 同目录预览图相对路径；没有则为 null。 */
  preview: string | null;
  /** safetensors / 侧车文件里读到的触发词。 */
  trigger_words: string[];
  /** 用户设置的别名（中文或任意短词）。 */
  aliases: string[];
  /** 用户设置的建议权重；缺省 null。 */
  weight: number | null;
}

export interface MatchedLoRA {
  path: string;
  name: string;
  weight: number;
  source: LoRASource;
  /** 命中原因，给回执和面板看。 */
  reason: string;
  /** 0–1；仅用于排序。 */
  confidence: number;
}

export interface LoRAMatchInput {
  /** 用户原话或画面描述。 */
  subject: string;
  /** 风格提示，可为空。 */
  styleHint?: string;
  /** 调用方显式点名的 LoRA（不区分大小写、可带扩展名）。 */
  explicit?: Array<{ name: string; weight?: number }>;
  /** 额外标签；里面出现的别名/文件名也参与匹配。 */
  extraTags?: string[];
}

export interface LoRAMergeOptions {
  maxCount: number;
  /** 对话匹配优先于默认 LoRA。 */
  autoFirst?: boolean;
}

export interface ParamMapping {
  /** 面板参数名，例如 `positive`、`steps`、`checkpoint`、`width`。 */
  param: string;
  node_id: string;
  /** 节点 inputs 里的字段名。 */
  field: string;
  ui_label: string;
  ui_type: 'text' | 'slider' | 'number' | 'dropdown' | 'seed' | 'image';
  min?: number;
  max?: number;
  default?: unknown;
}

export interface WorkflowPreset {
  id: string;
  name: string;
  /** true = 内置模板，不能删。 */
  builtin: boolean;
  /** ComfyUI API 格式的工作流。 */
  workflow: Record<string, unknown>;
  param_mapping: ParamMapping[];
  /** 内置模板的 kind。 */
  kind?: 'txt2img' | 'img2img' | 'controlnet' | 'imported';
  created_at: number;
  /** 导入来源文件名，仅展示。 */
  source?: string;
  /** 导入时无法自动识别的节点/字段提醒。 */
  warnings?: string[];
}

export type TaskSource = 'user' | 'pet';

export interface GenerateParams {
  positive: string;
  negative?: string;
  checkpoint?: string;
  /** 选中的 LoRA；source 由服务端补齐，面板传 manual。 */
  loras?: Array<{ path: string; weight: number; source?: LoRASource }>;
  sampler?: string;
  scheduler?: string;
  steps?: number;
  cfg?: number;
  width?: number;
  height?: number;
  batch?: number;
  seed?: number;
  workflow?: string;
  /** 图生图/ControlNet 的输入图；本机绝对路径或 ComfyUI input 目录里的文件名。 */
  inputImage?: string;
  controlImage?: string;
  controlNet?: string;
  denoise?: number;
  controlStrength?: number;
  /** 面板上的额外备注，只写进历史与元数据。 */
  note?: string;
  /** 导入工作流的自定义参数（param -> 值）。 */
  custom?: Record<string, string | number>;
  /** 任务来源：用户在面板发起 或 桌宠发起。 */
  source?: TaskSource;
}

export type TaskStatus = 'queued' | 'running' | 'done' | 'error' | 'cancelled';

export interface TaskProgress {
  current: number;
  total: number;
  /** 当前节点 id / 阶段说明。 */
  node?: string;
  message?: string;
}

export interface TaskImage {
  /** 历史记录 id，用来向服务端要二进制。 */
  id: string;
  filename: string;
  width: number;
  height: number;
}

export interface GenerateTaskView {
  id: string;
  prompt_id: string;
  status: TaskStatus;
  source?: TaskSource;
  progress: TaskProgress;
  params: GenerateParams;
  loras: Array<{ path: string; name: string; weight: number; source: LoRASource }>;
  images: TaskImage[];
  error?: string;
  created_at: number;
  finished_at?: number;
  elapsed_ms?: number;
}

export interface HistoryEntry {
  id: string;
  filename: string;
  /** 绝对路径，只在本地面板显示。 */
  path: string;
  positive: string;
  negative: string;
  checkpoint: string;
  loras: Array<{ name: string; path: string; weight: number; source?: LoRASource }>;
  sampler: string;
  scheduler: string;
  steps: number;
  cfg: number;
  width: number;
  height: number;
  seed: number;
  batch: number;
  created_at: number;
  workflow: string;
  workflow_id?: string;
  prompt_id: string;
  task_id: string;
  note?: string;
  source?: TaskSource;
  inputImage?: string;
  controlImage?: string;
  controlNet?: string;
  denoise?: number;
  controlStrength?: number;
  custom?: Record<string, string | number>;
}

export interface WorkflowSummary {
  id: string;
  name: string;
  builtin: boolean;
  kind?: WorkflowPreset['kind'];
  /** 当前工作流是否包含需要选择的 Checkpoint 参数映射。 */
  needs_checkpoint?: boolean;
  created_at: number;
  source?: string;
  warnings?: string[];
  mapping_count: number;
  /** 工作流自身携带的 LoRA（导入后回填到面板，生成时不再重复叠加）。 */
  workflow_loras?: Array<{ path: string; name: string; weight: number }>;
}

export interface ComfyHealth {
  ok: boolean;
  url: string;
  system?: string;
  version?: string;
  devices?: string[];
  error?: string;
  checked_at: number;
}

export interface LaunchState {
  configured: boolean;
  stop_configured: boolean;
  auto_launch: boolean;
  command: string;
  stop_command: string;
  running: boolean;
  last_error?: string;
}

export interface ModelFileView {
  path: string;
  name: string;
  kind: 'checkpoint' | 'diffusion_model' | 'lora' | 'vae' | 'unknown';
  size: number;
  /** 绝对路径，面板「复制路径」用。 */
  file: string;
}

export interface SavedStudioParams {
  workflow?: string;
  positive?: string;
  negative?: string;
  checkpoint?: string;
  loras?: Array<{ path: string; weight: number }>;
  sampler?: string;
  scheduler?: string;
  steps?: number;
  cfg?: number;
  width?: number;
  height?: number;
  batch?: number;
  seed?: number;
  inputImage?: string;
  controlImage?: string;
  controlNet?: string;
  denoise?: number;
  controlStrength?: number;
  custom?: Record<string, string | number>;
}

export interface CooGenBootstrap {
  health: ComfyHealth;
  launch: LaunchState;
  config: {
    url: string;
    models_dir: string;
    model_root: string;
    output_dir: string;
    default_checkpoint: string;
    lora_max_count: number;
    history_limit: number;
    sampler: string;
    scheduler: string;
    steps: number;
    cfg: number;
    width: number;
    height: number;
    batch: number;
    negative_prompt: string;
    timeout_seconds: number;
    popup_enabled: boolean;
    translate_enabled: boolean;
    prompt_prefix: string;
    prompt_suffix: string;
  };
  checkpoints: string[];
  diffusion_models: string[];
  model_files: ModelFileView[];
  model_root: string;
  samplers: string[];
  schedulers: string[];
  control_nets: string[];
  loras: LoRARecord[];
  lora_root: string;
  defaults: DefaultLoRA[];
  aliases: Record<string, string[]>;
  last_params?: SavedStudioParams;
  history: HistoryEntry[];
  presets: WorkflowSummary[];
  workflow: string;
  task: GenerateTaskView | null;
  warnings: string[];
}

export interface GenerateResponse {
  ok: boolean;
  task?: GenerateTaskView;
  error?: string;
  warnings?: string[];
}

export interface StatusResponse {
  task: GenerateTaskView | null;
  health: ComfyHealth;
  launch?: LaunchState;
  warnings: string[];
}

export interface ImageData {
  entry: HistoryEntry;
}

export interface LoraDefaultsResponse {
  ok: boolean;
  defaults?: DefaultLoRA[];
  aliases?: Record<string, string[]>;
  error?: string;
}
