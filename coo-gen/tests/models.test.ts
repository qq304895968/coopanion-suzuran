import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ensureExtraModelPaths } from '../src/model-paths.ts';
import { classifyModel, missingFromApi, modelNames, scanModelFiles } from '../src/models.ts';
import { removeDir, tempDir } from './helpers.ts';

const dirs: string[] = [];
afterEach(() => {
  while (dirs.length) removeDir(dirs.pop()!);
});

function fakeSafetensors(file: string, keys: string[]): void {
  mkdirSync(dirname(file), { recursive: true });
  const header = JSON.stringify(Object.fromEntries(keys.map((key) => [key, {
    dtype: 'F16', shape: [1], data_offsets: [0, 2],
  }])));
  const headerBytes = Buffer.byteLength(header);
  const out = Buffer.alloc(8 + headerBytes + 2);
  out.writeBigUInt64LE(BigInt(headerBytes), 0);
  out.write(header, 8, headerBytes, 'utf8');
  writeFileSync(file, out);
}

describe('模型目录扫描', () => {
  it('按文件头识别 checkpoint / diffusion / lora / vae', () => {
    const root = tempDir();
    dirs.push(root);
    const checkpoint = join(root, 'checkpoints', 'sd.safetensors');
    const diffusion = join(root, 'diffusion_models', 'flux.safetensors');
    const lora = join(root, 'loras', 'char.safetensors');
    const vae = join(root, 'vae', 'vae.safetensors');
    fakeSafetensors(checkpoint, [
      'model.diffusion_model.input_blocks.0.weight',
      'cond_stage_model.transformer.text_model.final_layer_norm.weight',
      'first_stage_model.decoder.conv_in.weight',
    ]);
    fakeSafetensors(diffusion, ['blocks.0.attn.wq.weight', 'blocks.1.mlp.up.weight']);
    fakeSafetensors(lora, ['lora_unet_blocks_0_attn_wq.lora_down.weight', 'lora_unet_blocks_0_attn_wq.lora_up.weight']);
    fakeSafetensors(vae, ['first_stage_model.decoder.conv_in.weight']);

    expect(classifyModel(checkpoint)).toBe('checkpoint');
    expect(classifyModel(diffusion)).toBe('diffusion_model');
    expect(classifyModel(lora)).toBe('lora');
    expect(classifyModel(vae)).toBe('vae');

    const scan = scanModelFiles(root);
    expect(scan.warnings).toEqual([]);
    expect(modelNames(scan.items, 'checkpoint')).toEqual(['checkpoints/sd.safetensors']);
    expect(modelNames(scan.items, 'diffusion_model')).toEqual(['diffusion_models/flux.safetensors']);
    expect(scan.items).toHaveLength(4);
  });

  it('识别模型是否被 ComfyUI 列表漏掉', () => {
    expect(missingFromApi(['checkpoints/sd.safetensors'], ['checkpoints\\sd.safetensors'])).toEqual([]);
    expect(missingFromApi(['krea.safetensors'], [])).toEqual(['krea.safetensors']);
  });
});

describe('extra_model_paths.yaml', () => {
  it('创建后再调用不重复追加', () => {
    const root = tempDir();
    dirs.push(root);
    const comfy = join(root, 'ComfyUI');
    const models = join(root, 'models');
    mkdirSync(comfy, { recursive: true });
    mkdirSync(join(models, 'checkpoints'), { recursive: true });
    const first = ensureExtraModelPaths(comfy, models);
    expect(first.ok).toBe(true);
    expect(first.created).toBe(true);
    const second = ensureExtraModelPaths(comfy, models);
    expect(second.ok).toBe(true);
    expect(second.created).toBe(false);
    expect(second.message).toContain('已经包含');
  });

  it('已有 yaml 时追加而不是覆盖', () => {
    const root = tempDir();
    dirs.push(root);
    const comfy = join(root, 'ComfyUI');
    const models = join(root, 'models');
    mkdirSync(comfy, { recursive: true });
    mkdirSync(models, { recursive: true });
    writeFileSync(join(comfy, 'extra_model_paths.yaml'), 'existing:\n  base_path: D:/other\n', 'utf8');
    const result = ensureExtraModelPaths(comfy, models);
    expect(result.ok).toBe(true);
    expect(result.message).toContain('追加');
  });
});
