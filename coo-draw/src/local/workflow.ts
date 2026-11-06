/** ComfyUI API 格式工作流：内置模板、参数映射、LoRA 注入，以及 UI 格式导入。 */
import type { GenerateParams, ParamMapping, WorkflowPreset } from './types.ts';

export type WorkflowNode = {
  class_type: string;
  inputs: Record<string, unknown>;
  _meta?: { title?: string };
};
export type Workflow = Record<string, WorkflowNode>;

export interface BuildWorkflowResult {
  workflow: Workflow;
  warnings: string[];
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const text = (value: unknown, fallback = ''): string => (typeof value === 'string' ? value : fallback);
const num = (value: unknown, fallback: number): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

function baseMapping(entries: ParamMapping[]): ParamMapping[] {
  return entries;
}

export function builtinQuickTxt2Img(): Workflow {
  return {
    '4': { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: '' }, _meta: { title: 'Checkpoint' } },
    '6': { class_type: 'CLIPTextEncode', inputs: { text: '', clip: ['4', 1] }, _meta: { title: 'Positive' } },
    '7': { class_type: 'CLIPTextEncode', inputs: { text: '', clip: ['4', 1] }, _meta: { title: 'Negative' } },
    '5': { class_type: 'EmptyLatentImage', inputs: { width: 768, height: 1152, batch_size: 1 }, _meta: { title: 'Latent' } },
    '3': {
      class_type: 'KSampler',
      inputs: {
        seed: 0,
        steps: 20,
        cfg: 7,
        sampler_name: 'euler_ancestral',
        scheduler: 'normal',
        denoise: 1,
        model: ['4', 0],
        positive: ['6', 0],
        negative: ['7', 0],
        latent_image: ['5', 0],
      },
      _meta: { title: 'KSampler' },
    },
    '8': { class_type: 'VAEDecode', inputs: { samples: ['3', 0], vae: ['4', 2] }, _meta: { title: 'Decode' } },
    '9': { class_type: 'SaveImage', inputs: { filename_prefix: 'coo-gen', images: ['8', 0] }, _meta: { title: 'Save' } },
  };
}

export function builtinImg2Img(): Workflow {
  return {
    '4': { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: '' }, _meta: { title: 'Checkpoint' } },
    '6': { class_type: 'CLIPTextEncode', inputs: { text: '', clip: ['4', 1] }, _meta: { title: 'Positive' } },
    '7': { class_type: 'CLIPTextEncode', inputs: { text: '', clip: ['4', 1] }, _meta: { title: 'Negative' } },
    '10': { class_type: 'LoadImage', inputs: { image: '' }, _meta: { title: 'Input image' } },
    '11': { class_type: 'VAEEncode', inputs: { pixels: ['10', 0], vae: ['4', 2] }, _meta: { title: 'Encode' } },
    '3': {
      class_type: 'KSampler',
      inputs: {
        seed: 0,
        steps: 20,
        cfg: 7,
        sampler_name: 'euler_ancestral',
        scheduler: 'normal',
        denoise: 0.6,
        model: ['4', 0],
        positive: ['6', 0],
        negative: ['7', 0],
        latent_image: ['11', 0],
      },
      _meta: { title: 'KSampler' },
    },
    '8': { class_type: 'VAEDecode', inputs: { samples: ['3', 0], vae: ['4', 2] }, _meta: { title: 'Decode' } },
    '9': { class_type: 'SaveImage', inputs: { filename_prefix: 'coo-gen', images: ['8', 0] }, _meta: { title: 'Save' } },
  };
}

export function builtinControlNet(): Workflow {
  return {
    '4': { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: '' }, _meta: { title: 'Checkpoint' } },
    '6': { class_type: 'CLIPTextEncode', inputs: { text: '', clip: ['4', 1] }, _meta: { title: 'Positive' } },
    '7': { class_type: 'CLIPTextEncode', inputs: { text: '', clip: ['4', 1] }, _meta: { title: 'Negative' } },
    '10': { class_type: 'LoadImage', inputs: { image: '' }, _meta: { title: 'Input image' } },
    '11': { class_type: 'VAEEncode', inputs: { pixels: ['10', 0], vae: ['4', 2] }, _meta: { title: 'Encode' } },
    '20': { class_type: 'LoadImage', inputs: { image: '' }, _meta: { title: 'Control image' } },
    '21': { class_type: 'ControlNetLoader', inputs: { control_net_name: '' }, _meta: { title: 'ControlNet' } },
    '22': {
      class_type: 'ControlNetApplyAdvanced',
      inputs: {
        positive: ['6', 0],
        negative: ['7', 0],
        control_net: ['21', 0],
        image: ['20', 0],
        strength: 1,
        start_percent: 0,
        end_percent: 1,
      },
      _meta: { title: 'Apply ControlNet' },
    },
    '3': {
      class_type: 'KSampler',
      inputs: {
        seed: 0,
        steps: 20,
        cfg: 7,
        sampler_name: 'euler_ancestral',
        scheduler: 'normal',
        denoise: 0.7,
        model: ['4', 0],
        positive: ['22', 0],
        negative: ['22', 1],
        latent_image: ['11', 0],
      },
      _meta: { title: 'KSampler' },
    },
    '8': { class_type: 'VAEDecode', inputs: { samples: ['3', 0], vae: ['4', 2] }, _meta: { title: 'Decode' } },
    '9': { class_type: 'SaveImage', inputs: { filename_prefix: 'coo-gen', images: ['8', 0] }, _meta: { title: 'Save' } },
  };
}

const COMMON_MAPPING: ParamMapping[] = [
  { param: 'positive', node_id: '6', field: 'text', ui_label: '正向提示词', ui_type: 'text', default: '' },
  { param: 'negative', node_id: '7', field: 'text', ui_label: '反向提示词', ui_type: 'text', default: '' },
  { param: 'checkpoint', node_id: '4', field: 'ckpt_name', ui_label: '模型', ui_type: 'dropdown', default: '' },
  { param: 'steps', node_id: '3', field: 'steps', ui_label: '步数', ui_type: 'slider', min: 1, max: 100, default: 20 },
  { param: 'cfg', node_id: '3', field: 'cfg', ui_label: 'CFG', ui_type: 'slider', min: 1, max: 30, default: 7 },
  { param: 'seed', node_id: '3', field: 'seed', ui_label: '种子', ui_type: 'seed', default: -1 },
  { param: 'sampler', node_id: '3', field: 'sampler_name', ui_label: '采样器', ui_type: 'dropdown', default: 'euler_ancestral' },
  { param: 'scheduler', node_id: '3', field: 'scheduler', ui_label: '调度器', ui_type: 'dropdown', default: 'normal' },
  { param: 'width', node_id: '5', field: 'width', ui_label: '宽度', ui_type: 'number', min: 64, max: 4096, default: 768 },
  { param: 'height', node_id: '5', field: 'height', ui_label: '高度', ui_type: 'number', min: 64, max: 4096, default: 1152 },
  { param: 'batch', node_id: '5', field: 'batch_size', ui_label: '批次', ui_type: 'number', min: 1, max: 8, default: 1 },
];

function preset(
  id: string,
  name: string,
  kind: WorkflowPreset['kind'],
  workflow: Workflow,
  mapping: ParamMapping[],
): WorkflowPreset {
  return {
    id,
    name,
    builtin: true,
    kind,
    workflow,
    param_mapping: baseMapping(mapping),
    created_at: 0,
  };
}

export function builtinPresets(): WorkflowPreset[] {
  const img = builtinImg2Img();
  const cnet = builtinControlNet();
  return [
    preset('quick-txt2img', '快速文生图', 'txt2img', builtinQuickTxt2Img(), COMMON_MAPPING),
    preset('img2img', '图生图', 'img2img', img, [
      ...COMMON_MAPPING,
      { param: 'inputImage', node_id: '10', field: 'image', ui_label: '输入图', ui_type: 'image', default: '' },
      { param: 'denoise', node_id: '3', field: 'denoise', ui_label: '重绘幅度', ui_type: 'slider', min: 0.05, max: 1, default: 0.6 },
    ]),
    preset('controlnet', 'ControlNet', 'controlnet', cnet, [
      ...COMMON_MAPPING,
      { param: 'inputImage', node_id: '10', field: 'image', ui_label: '输入图', ui_type: 'image', default: '' },
      { param: 'denoise', node_id: '3', field: 'denoise', ui_label: '重绘幅度', ui_type: 'slider', min: 0.05, max: 1, default: 0.7 },
      { param: 'controlImage', node_id: '20', field: 'image', ui_label: '控制图', ui_type: 'image', default: '' },
      { param: 'controlNet', node_id: '21', field: 'control_net_name', ui_label: 'ControlNet 模型', ui_type: 'dropdown', default: '' },
      { param: 'controlStrength', node_id: '22', field: 'strength', ui_label: '控制强度', ui_type: 'slider', min: 0, max: 2, default: 1 },
    ]),
  ];
}

export function findPreset(id: string, imported: WorkflowPreset[] = []): WorkflowPreset | undefined {
  return [...builtinPresets(), ...imported].find((item) => item.id === id);
}

/* ------------------------------------------------------------------ apply */

export function applyParams(
  workflow: Workflow,
  mapping: ParamMapping[],
  params: GenerateParams,
): Workflow {
  const out = clone(workflow);
  const values: Record<string, unknown> = params as unknown as Record<string, unknown>;
  for (const map of mapping) {
    const raw = values[map.param];
    if (raw === undefined || raw === null || raw === '') continue;
    const node = out[map.node_id];
    if (!node) continue;
    switch (map.ui_type) {
      case 'number':
      case 'slider': {
        let n = Number(raw);
        if (!Number.isFinite(n)) break;
        if (map.min !== undefined || map.max !== undefined) {
          n = Math.min(map.max ?? Number.POSITIVE_INFINITY, Math.max(map.min ?? Number.NEGATIVE_INFINITY, n));
        }
        if (Number.isInteger(n)) n = Math.round(n);
        node.inputs[map.field] = n;
        break;
      }
      case 'seed': {
        const n = Number(raw);
        if (!Number.isFinite(n)) break;
        node.inputs[map.field] = Math.trunc(Math.min(2 ** 53 - 1, Math.max(0, n)));
        break;
      }
      default:
        node.inputs[map.field] = String(raw);
        break;
    }
  }
  return out;
}

/** 导入工作流里未预置到固定表单的参数，按 param 名写入映射节点。 */
export function applyCustomParams(
  workflow: Workflow,
  mapping: ParamMapping[],
  custom: Record<string, string | number> | undefined,
): Workflow {
  if (!custom || !Object.keys(custom).length) return workflow;
  const out = clone(workflow);
  for (const map of mapping) {
    if (!(map.param in custom)) continue;
    const raw = custom[map.param];
    if (raw === undefined || raw === null || raw === '') continue;
    const node = out[map.node_id];
    if (!node) continue;
    if (map.ui_type === 'number' || map.ui_type === 'slider') {
      let n = Number(raw);
      if (!Number.isFinite(n)) continue;
      if (map.min !== undefined || map.max !== undefined) {
        n = Math.min(map.max ?? Number.POSITIVE_INFINITY, Math.max(map.min ?? Number.NEGATIVE_INFINITY, n));
      }
      node.inputs[map.field] = n;
    } else {
      node.inputs[map.field] = String(raw);
    }
  }
  return out;
}

/* ------------------------------------------------------------------- lora */

function maxNodeId(workflow: Workflow): number {
  let max = 0;
  for (const key of Object.keys(workflow)) {
    const n = Number(key);
    if (Number.isInteger(n) && n > max) max = n;
  }
  return max;
}

function checkpointNode(workflow: Workflow): string | null {
  for (const [id, node] of Object.entries(workflow)) {
    if (node.class_type.startsWith('CheckpointLoader')) return id;
  }
  return null;
}

function unetLoaderNode(workflow: Workflow): string | null {
  for (const [id, node] of Object.entries(workflow)) {
    if (/^(UNETLoader|UnetLoaderGGUF)$/i.test(node.class_type)) return id;
  }
  return null;
}

function clipLoaderNode(workflow: Workflow): string | null {
  for (const [id, node] of Object.entries(workflow)) {
    if (/^(CLIPLoader|DualCLIPLoader|TripleCLIPLoader|CLIPLoaderGGUF)$/i.test(node.class_type)) return id;
  }
  return null;
}

function isLink(value: unknown): value is [string | number, number] {
  return Array.isArray(value) && value.length === 2
    && (typeof value[0] === 'string' || typeof value[0] === 'number')
    && typeof value[1] === 'number';
}

export interface WorkflowLoRA {
  node_id: string;
  /** 工作流里写的 lora_name（可能带目录和扩展名） */
  path: string;
  /** 去掉目录和扩展名后的名字，用于和面板里的 LoRA 比对 */
  name: string;
  weight: number;
  clip_weight?: number;
}

function isLoraLoader(node: WorkflowNode | undefined): boolean {
  return !!node && /^LoraLoader(ModelOnly)?$/.test(node.class_type);
}

/** 归一化 LoRA 名：去目录、去扩展名、转小写，用来判断是不是同一份 LoRA。 */
export function loraBasename(value: string): string {
  const file = value.replace(/\\/g, '/').split('/').pop() ?? value;
  return file.replace(/\.(safetensors|ckpt|pt|bin)$/i, '').toLowerCase();
}

export function loraKey(lora: { path?: string; name?: string }): string {
  return loraBasename(lora.path || lora.name || '');
}

/** 列出工作流里已经存在的 LoRA，导入/切换 preset 时用来回填面板。 */
export function listWorkflowLoRAs(workflow: Workflow): WorkflowLoRA[] {
  const result: WorkflowLoRA[] = [];
  for (const [id, node] of Object.entries(workflow)) {
    if (!isLoraLoader(node)) continue;
    const raw = node.inputs.lora_name;
    if (typeof raw !== 'string' || !raw) continue;
    const weight = Number(node.inputs.strength_model ?? 1);
    const clip = node.inputs.strength_clip === undefined ? undefined : Number(node.inputs.strength_clip);
    result.push({
      node_id: id,
      path: raw,
      name: loraBasename(raw),
      weight: Number.isFinite(weight) ? weight : 1,
      ...(clip !== undefined && Number.isFinite(clip) ? { clip_weight: clip } : {}),
    });
  }
  return result;
}

/**
 * 在 CheckpointLoader 或分离式 UNETLoader（+ CLIPLoader）输出后插入 LoRA 链，
 * 并把所有下游引用改到链尾。工作流里已有同名 LoRA 时只更新权重，不再叠加一份。
 */
export function injectLoRAs(
  workflow: Workflow,
  loras: Array<{ path: string; weight: number; clip_weight?: number }>,
): BuildWorkflowResult {
  const out = clone(workflow);
  const warnings: string[] = [];
  if (!loras.length) return { workflow: out, warnings };

  // 工作流本身已带的 LoRA：更新 model 强度；只有调用方显式给了 clip_weight
  // 才更新 CLIP 强度，否则保持工作流原值。剩余没出现过的 LoRA 才插入新节点，
  // 避免同一组 LoRA 被应用两遍。
  const existing = new Map<string, string>();
  for (const [id, node] of Object.entries(out)) {
    if (!isLoraLoader(node)) continue;
    const raw = node.inputs.lora_name;
    if (typeof raw === 'string' && raw) existing.set(loraBasename(raw), id);
  }
  const pending: Array<{ path: string; weight: number; clip_weight?: number }> = [];
  const seen = new Set<string>();
  for (const lora of loras) {
    const key = loraKey(lora);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const existingId = existing.get(key);
    if (existingId) {
      out[existingId]!.inputs.strength_model = lora.weight;
      if (lora.clip_weight !== undefined && Number.isFinite(lora.clip_weight)) {
        out[existingId]!.inputs.strength_clip = lora.clip_weight;
      }
      continue;
    }
    pending.push(lora);
  }
  if (!pending.length) return { workflow: out, warnings };
  const ckpt = checkpointNode(out);
  if (ckpt) {
    let next = maxNodeId(out) + 1;
    let model: [string, number] = [ckpt, 0];
    let clip: [string, number] = [ckpt, 1];
    const inserted: string[] = [];
    for (const lora of pending) {
      const id = String(next++);
      const clipWeight = lora.clip_weight !== undefined && Number.isFinite(lora.clip_weight) ? lora.clip_weight : lora.weight;
      out[id] = {
        class_type: 'LoraLoader',
        inputs: {
          lora_name: lora.path,
          strength_model: lora.weight,
          strength_clip: clipWeight,
          model,
          clip,
        },
        _meta: { title: `LoRA: ${lora.path.split('/').pop() ?? lora.path}` },
      };
      inserted.push(id);
      model = [id, 0];
      clip = [id, 1];
    }
    const skip = new Set(inserted);
    for (const [id, node] of Object.entries(out)) {
      if (skip.has(id)) continue;
      for (const [field, value] of Object.entries(node.inputs)) {
        if (!isLink(value)) continue;
        if (String(value[0]) !== ckpt) continue;
        if (value[1] === 0) node.inputs[field] = [...model];
        else if (value[1] === 1) node.inputs[field] = [...clip];
      }
    }
    return { workflow: out, warnings };
  }

  // 分离式加载器（如 Krea2 / Flux / SD3：UNETLoader + CLIPLoader，或单独 UNETLoader）
  const unetId = unetLoaderNode(out);
  if (unetId) {
    const clipId = clipLoaderNode(out);
    let next = maxNodeId(out) + 1;
    let modelLink: [string, number] = [unetId, 0];
    let clipLink: [string, number] | null = clipId ? [clipId, 0] : null;
    const inserted: string[] = [];
    for (const lora of pending) {
      const id = String(next++);
      const clipWeight = lora.clip_weight !== undefined && Number.isFinite(lora.clip_weight) ? lora.clip_weight : lora.weight;
      if (clipLink) {
        out[id] = {
          class_type: 'LoraLoader',
          inputs: {
            lora_name: lora.path,
            strength_model: lora.weight,
            strength_clip: clipWeight,
            model: [...modelLink],
            clip: [...clipLink],
          },
          _meta: { title: `LoRA: ${lora.path.split('/').pop() ?? lora.path}` },
        };
        modelLink = [id, 0];
        clipLink = [id, 1];
      } else {
        out[id] = {
          class_type: 'LoraLoaderModelOnly',
          inputs: {
            lora_name: lora.path,
            strength_model: lora.weight,
            model: [...modelLink],
          },
          _meta: { title: `LoRA: ${lora.path.split('/').pop() ?? lora.path}` },
        };
        modelLink = [id, 0];
      }
      inserted.push(id);
    }
    const skip = new Set(inserted);
    for (const [id, node] of Object.entries(out)) {
      if (skip.has(id) || id === unetId || id === clipId) continue;
      for (const [field, value] of Object.entries(node.inputs)) {
        if (!isLink(value)) continue;
        const src = String(value[0]);
        if (src === unetId && value[1] === 0) node.inputs[field] = [...modelLink];
        else if (clipId && clipLink && src === clipId && value[1] === 0) node.inputs[field] = [...clipLink];
      }
    }
    return { workflow: out, warnings };
  }

  warnings.push('工作流里没有 CheckpointLoader，LoRA 没有可插入的位置');
  return { workflow: out, warnings };
}

export function buildForPreset(
  preset: WorkflowPreset,
  params: GenerateParams,
  loras: Array<{ path: string; weight: number; clip_weight?: number }>,
): BuildWorkflowResult {
  const applied = applyParams(preset.workflow as unknown as Workflow, preset.param_mapping, params);
  const injected = injectLoRAs(applied, loras);
  const save = Object.values(injected.workflow).find((node) => node.class_type === 'SaveImage');
  if (save) save.inputs.filename_prefix = 'coo-gen';
  return injected;
}

/* --------------------------------------------------------------- detect */

function linkedTextNode(workflow: Workflow, value: unknown): { id: string; field: string } | null {
  if (!isLink(value)) return null;
  const id = String(value[0]);
  const node = workflow[id];
  if (!node) return null;
  if ('text' in node.inputs) return { id, field: 'text' };
  if ('text_g' in node.inputs) return { id, field: 'text_g' };
  return null;
}

/** 从 API 工作流里识别可调参数；识别不到的不猜。 */
export function detectParamMapping(workflow: Workflow): { mapping: ParamMapping[]; warnings: string[] } {
  const mapping: ParamMapping[] = [];
  const warnings: string[] = [];
  const add = (item: ParamMapping): void => {
    if (mapping.some((existing) => existing.param === item.param)) return;
    mapping.push(item);
  };

  const samplers = Object.entries(workflow).filter(([, node]) => (
    node.class_type === 'KSampler' || node.class_type === 'KSamplerAdvanced' || node.class_type === 'SamplerCustom'
  ));
  if (!samplers.length) warnings.push('没有识别到 KSampler');
  if (samplers.length > 1) warnings.push(`有 ${samplers.length} 个采样节点，只映射第一个`);
  const sampler = samplers[0];
  if (sampler) {
    const [id, node] = sampler;
    if ('steps' in node.inputs) add({ param: 'steps', node_id: id, field: 'steps', ui_label: '步数', ui_type: 'slider', min: 1, max: 100, default: num(node.inputs.steps, 20) });
    if ('cfg' in node.inputs) add({ param: 'cfg', node_id: id, field: 'cfg', ui_label: 'CFG', ui_type: 'slider', min: 1, max: 30, default: num(node.inputs.cfg, 7) });
    if ('seed' in node.inputs) add({ param: 'seed', node_id: id, field: 'seed', ui_label: '种子', ui_type: 'seed', default: -1 });
    else if ('noise_seed' in node.inputs) add({ param: 'seed', node_id: id, field: 'noise_seed', ui_label: '种子', ui_type: 'seed', default: -1 });
    if ('sampler_name' in node.inputs) add({ param: 'sampler', node_id: id, field: 'sampler_name', ui_label: '采样器', ui_type: 'dropdown', default: text(node.inputs.sampler_name, 'euler_ancestral') });
    if ('scheduler' in node.inputs) add({ param: 'scheduler', node_id: id, field: 'scheduler', ui_label: '调度器', ui_type: 'dropdown', default: text(node.inputs.scheduler, 'normal') });
    if ('denoise' in node.inputs) add({ param: 'denoise', node_id: id, field: 'denoise', ui_label: '重绘幅度', ui_type: 'slider', min: 0.05, max: 1, default: num(node.inputs.denoise, 1) });

    const positive = linkedTextNode(workflow, node.inputs.positive);
    const negative = linkedTextNode(workflow, node.inputs.negative);
    if (positive) add({ param: 'positive', node_id: positive.id, field: positive.field, ui_label: '正向提示词', ui_type: 'text', default: '' });
    else warnings.push('没有识别到正向提示词节点');
    if (negative) add({ param: 'negative', node_id: negative.id, field: negative.field, ui_label: '反向提示词', ui_type: 'text', default: '' });
    else warnings.push('没有识别到反向提示词节点');
  }

  const checkpoint = Object.entries(workflow).find(([, node]) => node.class_type.startsWith('CheckpointLoader'));
  if (checkpoint) {
    const [id, node] = checkpoint;
    const field = 'ckpt_name' in node.inputs ? 'ckpt_name' : 'config_name';
    add({ param: 'checkpoint', node_id: id, field, ui_label: '模型', ui_type: 'dropdown', default: text(node.inputs[field], '') });
  } else if (!unetLoaderNode(workflow)) {
    warnings.push('没有识别到 CheckpointLoader；LoRA 无法插入');
  }

  const latent = Object.entries(workflow).find(([, node]) => node.class_type === 'EmptyLatentImage');
  if (latent) {
    const [id, node] = latent;
    add({ param: 'width', node_id: id, field: 'width', ui_label: '宽度', ui_type: 'number', min: 64, max: 4096, default: num(node.inputs.width, 768) });
    add({ param: 'height', node_id: id, field: 'height', ui_label: '高度', ui_type: 'number', min: 64, max: 4096, default: num(node.inputs.height, 1152) });
    add({ param: 'batch', node_id: id, field: 'batch_size', ui_label: '批次', ui_type: 'number', min: 1, max: 8, default: num(node.inputs.batch_size, 1) });
  } else {
    warnings.push('没有识别到 EmptyLatentImage，宽高/批次不映射');
  }

  const loadImages = Object.entries(workflow).filter(([, node]) => node.class_type === 'LoadImage');
  loadImages.forEach(([id, node], index) => {
    if (index === 0) add({ param: 'inputImage', node_id: id, field: 'image', ui_label: '输入图', ui_type: 'image', default: text(node.inputs.image, '') });
    else add({ param: 'controlImage', node_id: id, field: 'image', ui_label: '控制图', ui_type: 'image', default: text(node.inputs.image, '') });
  });

  const controlNet = Object.entries(workflow).find(([, node]) => node.class_type === 'ControlNetLoader');
  if (controlNet) {
    add({ param: 'controlNet', node_id: controlNet[0], field: 'control_net_name', ui_label: 'ControlNet 模型', ui_type: 'dropdown', default: text(controlNet[1].inputs.control_net_name, '') });
  }

  return { mapping, warnings };
}

export function validateApiWorkflow(value: unknown): { workflow: Workflow } | { error: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { error: '工作流必须是 JSON 对象' };
  const entries = Object.entries(value as Record<string, unknown>);
  if (!entries.length) return { error: '工作流是空的' };
  const workflow: Workflow = {};
  for (const [id, raw] of entries) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { error: `节点 ${id} 不是对象` };
    const node = raw as Record<string, unknown>;
    if (typeof node.class_type !== 'string' || !node.class_type) return { error: `节点 ${id} 缺 class_type` };
    if (!node.inputs || typeof node.inputs !== 'object' || Array.isArray(node.inputs)) return { error: `节点 ${id} 缺 inputs` };
    workflow[id] = {
      class_type: node.class_type,
      inputs: node.inputs as Record<string, unknown>,
      ...(node._meta && typeof node._meta === 'object' ? { _meta: node._meta as { title?: string } } : {}),
    };
  }
  return { workflow };
}

/* ----------------------------------------------------------- UI -> API */

type UiInput = { name: string; type?: string; link?: number | null };
type UiNode = {
  id: number;
  type: string;
  inputs?: UiInput[];
  outputs?: Array<{ name?: string; type?: string; links?: number[] | null }>;
  widgets_values?: unknown;
  title?: string;
  mode?: number;
};
type UiWorkflow = {
  nodes?: UiNode[];
  links?: Array<Array<number | string> | { id: number; origin_id: number; origin_slot: number; target_id: number; target_slot: number; type?: string }>;
};

export interface ObjectInfoNode {
  input?: {
    required?: Record<string, unknown>;
    optional?: Record<string, unknown>;
  };
  input_order?: { required?: string[]; optional?: string[] };
}
export type ObjectInfo = Record<string, ObjectInfoNode>;

const FALLBACK_SCHEMA: Record<string, string[]> = {
  CheckpointLoaderSimple: ['ckpt_name'],
  UNETLoader: ['unet_name', 'weight_dtype'],
  CLIPLoader: ['clip_name', 'type'],
  DualCLIPLoader: ['clip_name1', 'clip_name2', 'type'],
  VAELoader: ['vae_name'],
  CLIPTextEncode: ['text'],
  EmptyLatentImage: ['width', 'height', 'batch_size'],
  EmptySD3LatentImage: ['width', 'height', 'batch_size'],
  KSampler: ['seed', 'steps', 'cfg', 'sampler_name', 'scheduler', 'denoise'],
  KSamplerAdvanced: ['add_noise', 'noise_seed', 'steps', 'cfg', 'sampler_name', 'scheduler', 'start_at_step', 'end_at_step', 'return_with_leftover_noise'],
  VAEDecode: [],
  VAEEncode: [],
  SaveImage: ['filename_prefix'],
  LoadImage: ['image'],
  LoraLoader: ['lora_name', 'strength_model', 'strength_clip'],
  LoraLoaderModelOnly: ['lora_name', 'strength_model'],
  ControlNetLoader: ['control_net_name'],
  ControlNetApplyAdvanced: ['strength', 'start_percent', 'end_percent'],
  CLIPSetLastLayer: ['stop_at_clip_layer'],
  ImageScale: ['upscale_method', 'width', 'height', 'crop'],
  LatentUpscale: ['upscale_method', 'width', 'height', 'crop'],
  ImageUpscaleWithModel: [],
  UpscaleModelLoader: ['model_name'],
};

const SEED_CONTROL = new Set(['fixed', 'increment', 'decrement', 'randomize']);
const SKIP_TYPES = new Set(['Note', 'MarkdownNote', 'Reroute', 'PrimitiveNode']);
const IGNORED_WIDGETS = new Set(['control_after_generate', 'upload', 'image_upload']);

function widgetNames(definition: ObjectInfoNode | undefined, fallback: string[] | undefined): string[] {
  if (!definition?.input) return fallback ?? [];
  const required = definition.input.required ?? {};
  const optional = definition.input.optional ?? {};
  const order = [
    ...(definition.input_order?.required ?? Object.keys(required)),
    ...(definition.input_order?.optional ?? Object.keys(optional)),
  ];
  const names: string[] = [];
  for (const name of order) {
    const spec = (required[name] ?? optional[name]) as unknown;
    // 形如 [[...], {...}] 的输入是下拉/数值等 widget；形如 ["MODEL"] 的是连线。
    if (!Array.isArray(spec) || !spec.length) continue;
    const first = spec[0];
    const isLink = typeof first === 'string' && ['MODEL', 'CLIP', 'VAE', 'LATENT', 'IMAGE', 'CONDITIONING', 'CONTROL_NET', 'MASK', 'UPSCALE_MODEL'].includes(first);
    if (isLink) continue;
    if (IGNORED_WIDGETS.has(name)) continue;
    names.push(name);
  }
  return names;
}

/**
 * ComfyUI 的「Save」默认导出 UI 格式（nodes/links/widgets_values），而 /prompt 需要 API 格式。
 * 这里按 /object_info 的输入顺序还原 API 节点；没有 object_info 时用常见节点表兜底。
 */
export function convertUiWorkflow(
  ui: unknown,
  objectInfo: ObjectInfo = {},
): { workflow: Workflow; warnings: string[] } | { error: string } {
  if (!ui || typeof ui !== 'object' || Array.isArray(ui)) return { error: '不是 ComfyUI 工作流 JSON' };
  const root = ui as UiWorkflow;
  if (!Array.isArray(root.nodes) || !root.nodes.length) return { error: '工作流里没有 nodes（可能是 API 格式，请直接导入）' };
  const warnings: string[] = [];
  const nodes = new Map<number, UiNode>();
  for (const node of root.nodes) {
    if (!node || typeof node.id !== 'number' || typeof node.type !== 'string') continue;
    nodes.set(node.id, node);
  }
  const links = new Map<number, { origin: number; slot: number }>();
  for (const link of root.links ?? []) {
    if (Array.isArray(link) && link.length >= 5) {
      links.set(Number(link[0]), { origin: Number(link[1]), slot: Number(link[2]) });
    } else if (link && typeof link === 'object' && !Array.isArray(link)) {
      links.set(link.id, { origin: link.origin_id, slot: link.origin_slot });
    }
  }

  const primitive = (node: UiNode): unknown => {
    const values = node.widgets_values;
    if (Array.isArray(values)) return values[0];
    if (values && typeof values === 'object') return Object.values(values as Record<string, unknown>)[0];
    return undefined;
  };

  const resolveOrigin = (linkId: number, seen = new Set<number>()): { id: number; slot: number } | null => {
    if (seen.has(linkId)) return null;
    seen.add(linkId);
    const link = links.get(linkId);
    if (!link) return null;
    const origin = nodes.get(link.origin);
    if (!origin) return null;
    if (origin.type === 'Reroute') {
      const upstream = origin.inputs?.find((input) => input.link != null);
      return upstream ? resolveOrigin(upstream.link!, seen) : null;
    }
    return { id: origin.id, slot: link.slot };
  };

  const out: Workflow = {};
  for (const node of nodes.values()) {
    if (SKIP_TYPES.has(node.type) || node.mode === 2) continue;
    const definition = objectInfo[node.type];
    const fallback = FALLBACK_SCHEMA[node.type];
    if (!definition && !fallback) {
      warnings.push(`节点 ${node.id}（${node.type}）没有 schema，已跳过`);
      continue;
    }
    const names = widgetNames(definition, fallback);
    const widgets: unknown[] = Array.isArray(node.widgets_values)
      ? node.widgets_values
      : node.widgets_values && typeof node.widgets_values === 'object'
        ? names.map((name) => (node.widgets_values as Record<string, unknown>)[name])
        : [];
    const inputs: Record<string, unknown> = {};
    let widgetIndex = 0;
    for (const name of names) {
      const value = widgets[widgetIndex++];
      if (value === undefined) continue;
      inputs[name] = value;
      // UI 里 seed 后面常跟一个 control_after_generate 值，它不是 API 字段。
      if (typeof value === 'number' && SEED_CONTROL.has(String(widgets[widgetIndex]))) widgetIndex++;
    }
    for (const input of node.inputs ?? []) {
      if (input.link == null) continue;
      const origin = resolveOrigin(input.link);
      if (!origin) {
        warnings.push(`节点 ${node.id} 的输入 ${input.name} 连线解析失败`);
        continue;
      }
      const originNode = nodes.get(origin.id)!;
      if (originNode.type === 'PrimitiveNode') {
        inputs[input.name] = primitive(originNode);
      } else {
        inputs[input.name] = [String(origin.id), origin.slot];
      }
    }
    out[String(node.id)] = {
      class_type: node.type,
      inputs,
      ...(node.title ? { _meta: { title: node.title } } : {}),
    };
  }
  if (!Object.keys(out).length) return { error: '转换后没有任何可执行节点' };
  const save = Object.values(out).find((node) => node.class_type === 'SaveImage');
  if (save) save.inputs.filename_prefix = 'coo-gen';
  return { workflow: out, warnings };
}

export function looksLikeUiWorkflow(value: unknown): boolean {
  return !!value && typeof value === 'object' && !Array.isArray(value) && Array.isArray((value as UiWorkflow).nodes);
}
