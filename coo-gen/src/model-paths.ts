/** 把用户配置的模型根目录写进 ComfyUI 的 extra_model_paths.yaml。 */
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { ensureDir } from './fs-util.ts';

export interface ModelPathsResult {
  ok: boolean;
  path: string;
  created: boolean;
  message: string;
}

const MARKER = '# Added by coo-gen';

function yamlSection(modelsDir: string): string {
  const base = modelsDir.replace(/\\/g, '/').replace(/"/g, '');
  return `${MARKER}
coo_gen:
  base_path: "${base}"
  checkpoints: checkpoints
  loras: loras
  diffusion_models: |
       .
       diffusion_models
  text_encoders: |
       text_encoders
       clip
  vae: vae
  controlnet: controlnet
  embeddings: embeddings
  clip_vision: clip_vision
  style_models: style_models
  upscale_models: upscale_models
`;
}

/**
 * 写入/追加 extra_model_paths.yaml。已有同名 base_path 时不重复写。
 * 不自动重启 ComfyUI；调用方提示用户重启或调用 stop/start。
 */
export function ensureExtraModelPaths(comfyDir: string, modelsDir: string): ModelPathsResult {
  const root = resolve(comfyDir || '');
  const models = resolve(modelsDir || '');
  const file = join(root, 'extra_model_paths.yaml');
  if (!comfyDir.trim()) return { ok: false, path: file, created: false, message: '没有配置 ComfyUI 根目录，无法写入 extra_model_paths.yaml。' };
  if (!modelsDir.trim()) return { ok: false, path: file, created: false, message: '没有配置模型根目录。' };
  if (!existsSync(root)) return { ok: false, path: file, created: false, message: `ComfyUI 根目录不存在：${root}` };
  if (!existsSync(models)) return { ok: false, path: file, created: false, message: `模型根目录不存在：${models}` };

  const section = yamlSection(models);
  if (existsSync(file)) {
    const current = readFileSync(file, 'utf8');
    if (current.includes(MARKER) || current.includes(`base_path: "${models.replace(/\\/g, '/')}"`)) {
      return { ok: true, path: file, created: false, message: 'extra_model_paths.yaml 已经包含这个模型目录，重启 ComfyUI 生效。' };
    }
    try {
      copyFileSync(file, `${file}.bak-coogen`);
    } catch { /* 备份失败不阻塞追加 */ }
    const next = `${current.replace(/\s+$/, '')}\n\n${section}`;
    writeFileSync(file, next, 'utf8');
    return { ok: true, path: file, created: false, message: '已把模型目录追加到 extra_model_paths.yaml；重启 ComfyUI 生效。' };
  }

  ensureDir(dirname(file));
  writeFileSync(file, section, 'utf8');
  return { ok: true, path: file, created: true, message: '已创建 extra_model_paths.yaml；重启 ComfyUI 生效。' };
}
