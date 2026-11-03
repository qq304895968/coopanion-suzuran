/**
 * 人设笔触的本地工作流。
 *
 * 不依赖用户导入的工作流：内置一条 Krea2 的 UNET + CLIP + VAE + KSampler 链，
 * 尺寸固定 512、一次一张；模型文件名来自配置，换模型只改三个字符串。
 *
 * 图生图由文生图派生：加 LoadImage + VAEEncode，把 KSampler 的 latent 换成编码图，
 * denoise 走配置。这样人设场景不需要用户额外维护第二条工作流。
 */
import type { ParamMapping, WorkflowPreset } from './types.ts';
import type { Workflow, WorkflowNode } from './workflow.ts';

export interface PersonaWorkflowOptions {
  unet: string;
  clip: string;
  vae: string;
  steps: number;
  cfg: number;
  sampler: string;
  scheduler: string;
}

const PERSONA_MAPPING: ParamMapping[] = [
  { param: 'positive', node_id: '6', field: 'text', ui_label: '正向提示词', ui_type: 'text', default: '' },
  { param: 'negative', node_id: '13', field: 'text', ui_label: '反向提示词', ui_type: 'text', default: '' },
  { param: 'seed', node_id: '3', field: 'seed', ui_label: '种子', ui_type: 'seed', default: -1 },
  { param: 'steps', node_id: '3', field: 'steps', ui_label: '步数', ui_type: 'slider', min: 1, max: 100, default: 8 },
  { param: 'cfg', node_id: '3', field: 'cfg', ui_label: 'CFG', ui_type: 'slider', min: 1, max: 30, default: 1 },
  { param: 'sampler', node_id: '3', field: 'sampler_name', ui_label: '采样器', ui_type: 'dropdown', default: 'euler' },
  { param: 'scheduler', node_id: '3', field: 'scheduler', ui_label: '调度器', ui_type: 'dropdown', default: 'simple' },
  { param: 'width', node_id: '5', field: 'width', ui_label: '宽度', ui_type: 'number', min: 64, max: 4096, default: 512 },
  { param: 'height', node_id: '5', field: 'height', ui_label: '高度', ui_type: 'number', min: 64, max: 4096, default: 512 },
  { param: 'batch', node_id: '5', field: 'batch_size', ui_label: '批次', ui_type: 'number', min: 1, max: 4, default: 1 },
];

export const PERSONA_TXT2IMG_ID = 'persona-krea2';
export const PERSONA_IMG2IMG_ID = 'persona-krea2-img2img';

/** 内置人设文生图：Krea2 三件套 + 512×512 + 单张。 */
export function personaTxt2Img(options: PersonaWorkflowOptions): WorkflowPreset {
  const workflow: Workflow = {
    '10': { class_type: 'UNETLoader', inputs: { unet_name: options.unet, weight_dtype: 'default' }, _meta: { title: '人设模型' } },
    '11': { class_type: 'CLIPLoader', inputs: { clip_name: options.clip, type: 'krea2' }, _meta: { title: '人设文本编码器' } },
    '12': { class_type: 'VAELoader', inputs: { vae_name: options.vae }, _meta: { title: '人设 VAE' } },
    '6': { class_type: 'CLIPTextEncode', inputs: { text: '', clip: ['11', 0] }, _meta: { title: '正向提示词' } },
    '13': { class_type: 'CLIPTextEncode', inputs: { text: '', clip: ['11', 0] }, _meta: { title: '反向提示词' } },
    '5': { class_type: 'EmptyLatentImage', inputs: { width: 512, height: 512, batch_size: 1 }, _meta: { title: '512×512' } },
    '3': {
      class_type: 'KSampler',
      inputs: {
        seed: 0,
        steps: options.steps,
        cfg: options.cfg,
        sampler_name: options.sampler,
        scheduler: options.scheduler,
        denoise: 1,
        model: ['10', 0],
        positive: ['6', 0],
        negative: ['13', 0],
        latent_image: ['5', 0],
      },
      _meta: { title: 'KSampler' },
    },
    '8': { class_type: 'VAEDecode', inputs: { samples: ['3', 0], vae: ['12', 0] }, _meta: { title: '解码' } },
    '9': { class_type: 'SaveImage', inputs: { filename_prefix: 'draw-persona', images: ['8', 0] }, _meta: { title: '保存' } },
  };
  return {
    id: PERSONA_TXT2IMG_ID,
    name: '人设笔触（Krea2）',
    builtin: true,
    kind: 'txt2img',
    workflow,
    param_mapping: PERSONA_MAPPING.map((item) => ({ ...item })),
    created_at: 0,
  };
}

/** 从文生图派生图生图：LoadImage + VAEEncode + denoise。 */
export function withImg2Img(preset: WorkflowPreset, denoise: number): WorkflowPreset {
  const workflow = JSON.parse(JSON.stringify(preset.workflow)) as Workflow;
  const sampler = Object.entries(workflow).find(([, node]) => (
    node.class_type === 'KSampler' || node.class_type === 'KSamplerAdvanced'
  ));
  if (!sampler) return preset;
  const [samplerId, samplerNode] = sampler;
  const vaeLink = findVaeLink(workflow);
  if (!vaeLink) return preset;

  const loadId = '90';
  const scaleId = '92';
  const encodeId = '91';
  workflow[loadId] = { class_type: 'LoadImage', inputs: { image: '' }, _meta: { title: '参考图' } };
  // 参考图可能是 1440p 截图；先缩到人设固定的 512，避免 VAEEncode 把原图尺寸带进采样。
  workflow[scaleId] = {
    class_type: 'ImageScale',
    inputs: {
      image: [loadId, 0],
      upscale_method: 'lanczos',
      width: 512,
      height: 512,
      crop: 'disabled',
    },
    _meta: { title: '参考图缩到 512×512' },
  };
  workflow[encodeId] = {
    class_type: 'VAEEncode',
    inputs: { pixels: [scaleId, 0], vae: vaeLink },
    _meta: { title: '参考图编码' },
  };
  samplerNode.inputs.latent_image = [encodeId, 0];
  samplerNode.inputs.denoise = denoise;

  const mapping: ParamMapping[] = [
    ...preset.param_mapping.filter((item) => item.param !== 'inputImage' && item.param !== 'denoise'),
    { param: 'inputImage', node_id: loadId, field: 'image', ui_label: '参考图', ui_type: 'image', default: '' },
    { param: 'denoise', node_id: samplerId, field: 'denoise', ui_label: '重绘幅度', ui_type: 'slider', min: 0.05, max: 1, default: denoise },
  ];
  return {
    ...preset,
    id: PERSONA_IMG2IMG_ID,
    name: `${preset.name} · 图生图`,
    kind: 'img2img',
    workflow,
    param_mapping: mapping,
  };
}

function findVaeLink(workflow: Workflow): [string, number] | null {
  for (const node of Object.values(workflow)) {
    if (node.class_type !== 'VAEDecode') continue;
    const vae = node.inputs.vae;
    if (Array.isArray(vae) && vae.length === 2) return [String(vae[0]), Number(vae[1])];
  }
  for (const [id, node] of Object.entries(workflow)) {
    if (node.class_type === 'VAELoader') return [id, 0];
  }
  return null;
}

/**
 * Krea2 这类「UNETLoader + 独立 CLIPLoader」的工作流没有 CheckpointLoaderSimple，
 * 通用 injectLoRAs 找不到挂点。这里按 model/clip 两条输入分别接 LoraLoader 链。
 */
export function injectSplitLoRAs(
  workflow: Workflow,
  loras: Array<{ path: string; weight: number }>,
): { workflow: Workflow; warnings: string[] } {
  const out = JSON.parse(JSON.stringify(workflow)) as Workflow;
  const warnings: string[] = [];
  if (!loras.length) return { workflow: out, warnings };

  const unet = Object.entries(out).find(([, node]) => node.class_type === 'UNETLoader');
  const clip = Object.entries(out).find(([, node]) => node.class_type === 'CLIPLoader');
  if (!unet || !clip) return { workflow: out, warnings: ['工作流里没有 UNETLoader/CLIPLoader，人设 LoRA 跳过'] };

  let next = maxNodeId(out) + 1;
  let modelLink: [string, number] = [unet[0], 0];
  let clipLink: [string, number] = [clip[0], 0];
  const skip = new Set<string>();

  for (const lora of loras) {
    const id = String(next++);
    skip.add(id);
    out[id] = {
      class_type: 'LoraLoader',
      inputs: {
        lora_name: lora.path,
        strength_model: lora.weight,
        strength_clip: lora.weight,
        model: [...modelLink],
        clip: [...clipLink],
      },
      _meta: { title: `人设 LoRA: ${lora.path.split('/').pop() ?? lora.path}` },
    };
    modelLink = [id, 0];
    clipLink = [id, 1];
  }

  for (const [id, node] of Object.entries(out)) {
    if (skip.has(id)) continue;
    if (id === unet[0] || id === clip[0]) continue;
    for (const [field, value] of Object.entries(node.inputs)) {
      if (!Array.isArray(value) || value.length !== 2) continue;
      const source = String(value[0]);
      if (source === unet[0] && Number(value[1]) === 0) node.inputs[field] = [...modelLink];
      else if (source === clip[0] && Number(value[1]) === 0) node.inputs[field] = [...clipLink];
    }
  }
  return { workflow: out, warnings };
}

function maxNodeId(workflow: Workflow): number {
  let max = 0;
  for (const id of Object.keys(workflow)) {
    const n = Number(id);
    if (Number.isFinite(n)) max = Math.max(max, n);
  }
  return max;
}
