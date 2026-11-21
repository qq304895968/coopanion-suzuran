import { describe, expect, it } from 'vitest';
import {
  applyCustomParams, applyParams, buildForPreset, builtinPresets, convertUiWorkflow, detectParamMapping,
  extractWorkflowModels, injectLoRAs, listWorkflowLoRAs, validateApiWorkflow, type Workflow,
} from '../../src/local/workflow.ts';

const quick = () => builtinPresets().find((preset) => preset.id === 'quick-txt2img')!;

describe('内置工作流与参数', () => {
  it('三个内置模板都有参数映射', () => {
    const presets = builtinPresets();
    expect(presets.map((preset) => preset.id)).toEqual(['quick-txt2img', 'img2img', 'controlnet']);
    for (const preset of presets) expect(preset.param_mapping.length).toBeGreaterThan(5);
  });

  it('applyParams 写入文本、数值和种子', () => {
    const preset = quick();
    const out = applyParams(preset.workflow as unknown as Workflow, preset.param_mapping, {
      positive: 'a cat',
      negative: 'blurry',
      steps: 30,
      cfg: 8.5,
      width: 640,
      height: 960,
      batch: 2,
      seed: 123,
      checkpoint: 'model.safetensors',
      sampler: 'euler',
      scheduler: 'karras',
    });
    expect(out['6']!.inputs.text).toBe('a cat');
    expect(out['7']!.inputs.text).toBe('blurry');
    expect(out['3']!.inputs.steps).toBe(30);
    expect(out['3']!.inputs.cfg).toBe(8.5);
    expect(out['3']!.inputs.seed).toBe(123);
    expect(out['5']!.inputs.width).toBe(640);
    expect(out['5']!.inputs.height).toBe(960);
    expect(out['5']!.inputs.batch_size).toBe(2);
    expect(out['4']!.inputs.ckpt_name).toBe('model.safetensors');
  });

  it('LoRA 注入到 checkpoint 与所有下游之间', () => {
    const preset = quick();
    const out = injectLoRAs(preset.workflow as unknown as Workflow, [
      { path: '风格/a.safetensors', weight: 0.6 },
      { path: '角色/b.safetensors', weight: 0.8 },
    ]);
    expect(out.warnings).toEqual([]);
    const loras = Object.entries(out.workflow).filter(([, node]) => node.class_type === 'LoraLoader');
    expect(loras).toHaveLength(2);
    const [firstId, first] = loras[0]!;
    const [secondId, second] = loras[1]!;
    expect(first.inputs.model).toEqual(['4', 0]);
    expect(second.inputs.model).toEqual([firstId, 0]);
    expect(second.inputs.clip).toEqual([firstId, 1]);
    // KSampler 的 model、CLIPTextEncode 的 clip 都改到链尾。
    expect(out.workflow['3']!.inputs.model).toEqual([secondId, 0]);
    expect(out.workflow['6']!.inputs.clip).toEqual([secondId, 1]);
  });

  it('没有 checkpoint 时 LoRA 注入返回提醒而不是抛错', () => {
    const result = injectLoRAs({ '1': { class_type: 'SaveImage', inputs: {} } }, [{ path: 'a', weight: 1 }]);
    expect(result.warnings[0]).toContain('CheckpointLoader');
  });

  it('Krea2 等 UNETLoader + CLIPLoader 分离式工作流无需 CheckpointLoader 也能正常挂载 LoRA 且不报警告', () => {
    const kreaWorkflow: Workflow = {
      '10': { class_type: 'UNETLoader', inputs: { unet_name: 'krea2.safetensors', weight_dtype: 'default' } },
      '11': { class_type: 'CLIPLoader', inputs: { clip_name: 't5.safetensors', type: 'krea2' } },
      '6': { class_type: 'CLIPTextEncode', inputs: { text: 'girl', clip: ['11', 0] } },
      '7': { class_type: 'CLIPTextEncode', inputs: { text: 'bad', clip: ['11', 0] } },
      '3': { class_type: 'KSampler', inputs: { model: ['10', 0], positive: ['6', 0], negative: ['7', 0], steps: 8, cfg: 1, seed: 1 } },
      '9': { class_type: 'SaveImage', inputs: { images: ['3', 0] } },
    };
    const detected = detectParamMapping(kreaWorkflow);
    expect(detected.mapping.some((m) => m.param === 'checkpoint')).toBe(false);
    expect(detected.warnings.some((w) => w.includes('CheckpointLoader'))).toBe(false);

    const injected = injectLoRAs(kreaWorkflow, [
      { path: '角色/suzuran.safetensors', weight: 0.8 },
      { path: '风格/soft.safetensors', weight: 0.5 },
    ]);
    expect(injected.warnings).toEqual([]);
    const loraNodes = Object.entries(injected.workflow).filter(([, n]) => n.class_type === 'LoraLoader');
    expect(loraNodes).toHaveLength(2);
    const [firstId, firstNode] = loraNodes[0]!;
    const [secondId, secondNode] = loraNodes[1]!;
    expect(firstNode.inputs.model).toEqual(['10', 0]);
    expect(firstNode.inputs.clip).toEqual(['11', 0]);
    expect(secondNode.inputs.model).toEqual([firstId, 0]);
    expect(secondNode.inputs.clip).toEqual([firstId, 1]);
    expect(injected.workflow['3']!.inputs.model).toEqual([secondId, 0]);
    expect(injected.workflow['6']!.inputs.clip).toEqual([secondId, 1]);
  });

  it('自定义参数按映射写入节点', () => {
    const workflow = quick().workflow as unknown as Workflow;
    const out = applyCustomParams(workflow, [
      { param: 'customField', node_id: '6', field: 'text', ui_label: 'x', ui_type: 'text' },
      { param: 'customNum', node_id: '3', field: 'cfg', ui_label: 'x', ui_type: 'number', min: 1, max: 10 },
    ], { customField: 'hello', customNum: 9 });
    expect(out['6']!.inputs.text).toBe('hello');
    expect(out['3']!.inputs.cfg).toBe(9);
    expect(workflow['6']!.inputs.text).toBe('');
  });

  it('工作流自带 LoRA 会被识别，生成时复用原节点而不是重复叠加', () => {
    const workflow: Workflow = {
      '10': { class_type: 'UNETLoader', inputs: { unet_name: 'krea2.safetensors', weight_dtype: 'default' } },
      '11': { class_type: 'CLIPLoader', inputs: { clip_name: 't5.safetensors', type: 'krea2' } },
      '20': {
        class_type: 'LoraLoader',
        inputs: { lora_name: '风格/krea2-masterpieces-v51.safetensors', strength_model: 0.7, strength_clip: 1, model: ['10', 0], clip: ['11', 0] },
      },
      '6': { class_type: 'CLIPTextEncode', inputs: { text: 'girl', clip: ['20', 1] } },
      '3': { class_type: 'KSampler', inputs: { model: ['20', 0], positive: ['6', 0], steps: 8 } },
      '9': { class_type: 'SaveImage', inputs: { images: ['3', 0] } },
    };
    const listed = listWorkflowLoRAs(workflow);
    expect(listed).toHaveLength(1);
    expect(listed[0]).toMatchObject({ node_id: '20', name: 'krea2-masterpieces-v51', weight: 0.7, clip_weight: 1 });

    const result = injectLoRAs(workflow, [
      { path: 'krea2-masterpieces-v51.safetensors', weight: 0.5 },
      { path: 'extra/new.safetensors', weight: 0.6 },
      { path: 'extra/new.safetensors', weight: 0.6 },
    ]);
    const loraNodes = Object.entries(result.workflow).filter(([, node]) => node.class_type === 'LoraLoader');
    // 已有的 1 个 + 新增 1 个；同一 LoRA 不会被叠两遍
    expect(loraNodes).toHaveLength(2);
    // 已有节点只改 strength_model，CLIP 强度保持工作流原样
    expect(result.workflow['20']!.inputs.strength_model).toBe(0.5);
    expect(result.workflow['20']!.inputs.strength_clip).toBe(1);
    const added = loraNodes.find(([id]) => id !== '20')!;
    expect(added[1].inputs.model).toEqual(['10', 0]);
    expect(added[1].inputs.clip).toEqual(['11', 0]);
    // 原有 LoRA 节点被串到新链尾，整条链仍然只应用一次
    expect(result.workflow['20']!.inputs.model).toEqual([added[0], 0]);
    expect(result.workflow['3']!.inputs.model).toEqual(['20', 0]);
  });

  it('buildForPreset 同时应用参数和 LoRA', () => {
    const built = buildForPreset(quick(), {
      positive: 'cat', negative: 'bad', steps: 12, cfg: 5, width: 512, height: 512,
      batch: 1, seed: 7, checkpoint: 'm.safetensors', sampler: 'euler', scheduler: 'normal',
    }, [{ path: '风格/a.safetensors', weight: 0.6 }]);
    expect(built.workflow['6']!.inputs.text).toBe('cat');
    expect(Object.values(built.workflow).some((node) => node.class_type === 'LoraLoader')).toBe(true);
    expect(Object.values(built.workflow).find((node) => node.class_type === 'SaveImage')!.inputs.filename_prefix).toBe('coo-gen');
  });
});

describe('参数识别', () => {
  it('从内置工作流识别正向/反向/模型/采样参数', () => {
    const preset = quick();
    const detected = detectParamMapping(preset.workflow as unknown as Workflow);
    const params = detected.mapping.map((item) => item.param);
    expect(params).toContain('positive');
    expect(params).toContain('negative');
    expect(params).toContain('checkpoint');
    expect(params).toContain('steps');
    expect(params).toContain('width');
    expect(detected.warnings).toEqual([]);
    expect(detected.mapping.find((item) => item.param === 'positive')!.node_id).toBe('6');
  });

  it('拒绝数组或缺少 inputs 的工作流', () => {
    expect('error' in validateApiWorkflow([])).toBe(true);
    expect('error' in validateApiWorkflow({ '1': { class_type: 'X' } })).toBe(true);
    expect('error' in validateApiWorkflow({ '1': { class_type: 'X', inputs: {} } })).toBe(false);
  });
});

describe('UI 格式导入', () => {
  it('按内置 schema 还原 API 节点并跳过 seed 控制值', () => {
    const converted = convertUiWorkflow({
      nodes: [
        { id: 1, type: 'CheckpointLoaderSimple', widgets_values: ['model.safetensors'] },
        { id: 2, type: 'CLIPTextEncode', widgets_values: ['a cat'] },
        {
          id: 3,
          type: 'KSampler',
          inputs: [
            { name: 'model', type: 'MODEL', link: 1 },
            { name: 'positive', type: 'CONDITIONING', link: 2 },
          ],
          widgets_values: [123, 'randomize', 20, 7, 'euler', 'normal', 1],
        },
      ],
      links: [
        [1, 1, 0, 3, 0, 'MODEL'],
        [2, 2, 0, 3, 3, 'CONDITIONING'],
      ],
    });
    expect('error' in converted).toBe(false);
    if ('error' in converted) return;
    expect(converted.workflow['1']!.inputs.ckpt_name).toBe('model.safetensors');
    expect(converted.workflow['2']!.inputs.text).toBe('a cat');
    expect(converted.workflow['3']!.inputs.seed).toBe(123);
    expect(converted.workflow['3']!.inputs.steps).toBe(20);
    expect(converted.workflow['3']!.inputs.positive).toEqual(['2', 0]);
    expect(converted.workflow['3']!.inputs.model).toEqual(['1', 0]);
  });

  it('Reroute 会透传到上游', () => {
    const converted = convertUiWorkflow({
      nodes: [
        { id: 1, type: 'CheckpointLoaderSimple', widgets_values: ['m.safetensors'] },
        { id: 2, type: 'Reroute', inputs: [{ name: '', link: 1 }] },
        { id: 3, type: 'KSampler', inputs: [{ name: 'model', link: 2 }], widgets_values: [1, 'fixed', 20, 7, 'euler', 'normal', 1] },
      ],
      links: [
        [1, 1, 0, 2, 0, 'MODEL'],
        [2, 2, 0, 3, 0, 'MODEL'],
      ],
    });
    expect('error' in converted).toBe(false);
    if ('error' in converted) return;
    expect(converted.workflow['3']!.inputs.model).toEqual(['1', 0]);
  });
});

describe('LoRA 双强度（strength_model / strength_clip）', () => {
  it('injectLoRAs 把 clip_weight 写入 strength_clip，缺省跟随 weight', () => {
    const preset = quick();
    const out = injectLoRAs(preset.workflow as unknown as Workflow, [
      { path: '风格/a.safetensors', weight: 0.6, clip_weight: 0.9 },
      { path: '角色/b.safetensors', weight: 0.8 },
    ]);
    expect(out.warnings).toEqual([]);
    const loras = Object.entries(out.workflow).filter(([, node]) => node.class_type === 'LoraLoader');
    expect(loras).toHaveLength(2);
    expect(loras[0]![1].inputs.strength_model).toBe(0.6);
    expect(loras[0]![1].inputs.strength_clip).toBe(0.9);
    expect(loras[1]![1].inputs.strength_model).toBe(0.8);
    expect(loras[1]![1].inputs.strength_clip).toBe(0.8);
  });

  it('工作流自带 LoRA：只在显式给出 clip_weight 时才改 strength_clip', () => {
    const workflow: Workflow = {
      '4': { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: 'm.safetensors' } },
      '20': {
        class_type: 'LoraLoader',
        inputs: { lora_name: 'a.safetensors', strength_model: 0.7, strength_clip: 1, model: ['4', 0], clip: ['4', 1] },
      },
      '6': { class_type: 'CLIPTextEncode', inputs: { text: 'girl', clip: ['20', 1] } },
      '3': { class_type: 'KSampler', inputs: { model: ['20', 0], positive: ['6', 0], steps: 8 } },
      '9': { class_type: 'SaveImage', inputs: { images: ['3', 0] } },
    };
    const keep = injectLoRAs(workflow, [{ path: 'a.safetensors', weight: 0.5 }]);
    expect(keep.workflow['20']!.inputs.strength_model).toBe(0.5);
    expect(keep.workflow['20']!.inputs.strength_clip).toBe(1);
    const override = injectLoRAs(workflow, [{ path: 'a.safetensors', weight: 0.5, clip_weight: 0.3 }]);
    expect(override.workflow['20']!.inputs.strength_model).toBe(0.5);
    expect(override.workflow['20']!.inputs.strength_clip).toBe(0.3);
  });

  it('buildForPreset 透传 clip_weight', () => {
    const built = buildForPreset(quick(), {
      positive: 'cat', negative: 'bad', steps: 12, cfg: 5, width: 512, height: 512,
      batch: 1, seed: 7, checkpoint: 'm.safetensors', sampler: 'euler', scheduler: 'normal',
    }, [{ path: '风格/a.safetensors', weight: 0.6, clip_weight: 0.4 }]);
    const node = Object.values(built.workflow).find((item) => item.class_type === 'LoraLoader')!;
    expect(node.inputs.strength_model).toBe(0.6);
    expect(node.inputs.strength_clip).toBe(0.4);
  });
});

describe('工作流模型三件解析', () => {
  it('Checkpoint 工作流解析主模型，无独立编码器/VAE 节点时为空', () => {
    const preset = quick();
    const applied = applyParams(preset.workflow as unknown as Workflow, preset.param_mapping, {
      positive: 'cat', checkpoint: 'anything_v5.safetensors',
    });
    const models = extractWorkflowModels(applied, 'anything_v5.safetensors');
    expect(models.checkpoint).toBe('anything_v5.safetensors');
    expect(models.textEncoder).toBe('');
    expect(models.vae).toBe('');
  });

  it('分离式工作流解析 UNET / CLIP / VAE 三件', () => {
    const workflow: Workflow = {
      '10': { class_type: 'UNETLoader', inputs: { unet_name: 'krea2_turbo_nvfp4.safetensors', weight_dtype: 'default' } },
      '11': { class_type: 'CLIPLoader', inputs: { clip_name: 'qwen3vl_4b_fp8_scaled.safetensors', type: 'krea2' } },
      '12': { class_type: 'VAELoader', inputs: { vae_name: 'qwen_image_vae.safetensors' } },
      '3': { class_type: 'KSampler', inputs: { model: ['10', 0], steps: 8 } },
      '9': { class_type: 'SaveImage', inputs: { images: ['3', 0] } },
    };
    expect(extractWorkflowModels(workflow)).toEqual({
      checkpoint: 'krea2_turbo_nvfp4.safetensors',
      textEncoder: 'qwen3vl_4b_fp8_scaled.safetensors',
      vae: 'qwen_image_vae.safetensors',
    });
  });

  it('节点里没写模型名时回退到面板 checkpoint', () => {
    const preset = quick();
    const models = extractWorkflowModels(preset.workflow as unknown as Workflow, 'fallback.safetensors');
    expect(models.checkpoint).toBe('fallback.safetensors');
  });
});
