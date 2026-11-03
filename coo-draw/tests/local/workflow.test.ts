import { describe, expect, it } from 'vitest';
import {
  applyCustomParams, applyParams, buildForPreset, builtinPresets, convertUiWorkflow, detectParamMapping,
  injectLoRAs, validateApiWorkflow, type Workflow,
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
