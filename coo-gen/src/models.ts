/** 模型目录扫描：把 checkpoints / loras / diffusion_models 从用户配置的模型根目录里找出来。 */
import { closeSync, existsSync, openSync, readdirSync, readSync, statSync } from 'node:fs';
import { basename, extname, join, relative, resolve } from 'node:path';

export type ModelKind = 'checkpoint' | 'diffusion_model' | 'lora' | 'vae' | 'unknown';

export interface ModelFile {
  /** 相对模型根目录的路径，统一 `/`。 */
  path: string;
  name: string;
  kind: ModelKind;
  size: number;
  /** 文件绝对路径。 */
  file: string;
}

const MODEL_EXTENSIONS = new Set(['.safetensors', '.ckpt', '.pt', '.pth']);
const MAX_HEADER = 4 * 1024 * 1024;
const MAX_DEPTH = 5;

/** 读取 safetensors 的 header key 列表；失败返回空数组。 */
export function safetensorsKeys(file: string): string[] {
  if (extname(file).toLowerCase() !== '.safetensors') return [];
  let fd: number | undefined;
  try {
    const size = statSync(file).size;
    if (size < 16) return [];
    fd = openSync(file, 'r');
    const head = Buffer.alloc(8);
    readSync(fd, head, 0, 8, 0);
    const length = Number(head.readBigUInt64LE(0));
    if (!Number.isFinite(length) || length <= 0 || length > MAX_HEADER || length + 8 > size) return [];
    const bytes = Buffer.alloc(length);
    readSync(fd, bytes, 0, length, 8);
    const parsed = JSON.parse(bytes.toString('utf8')) as Record<string, unknown>;
    return Object.keys(parsed).filter((key) => key !== '__metadata__');
  } catch {
    return [];
  } finally {
    if (fd !== undefined) {
      try { closeSync(fd); } catch { /* ignore */ }
    }
  }
}

/** 根据文件头里的 key 判断是完整 checkpoint、UNet/diffusion 还是 LoRA。 */
export function classifyModel(file: string): ModelKind {
  const ext = extname(file).toLowerCase();
  if (ext === '.ckpt') return 'checkpoint';
  if (ext !== '.safetensors') return 'unknown';
  const keys = safetensorsKeys(file);
  if (!keys.length) return 'unknown';
  const has = (needle: string): boolean => keys.some((key) => key.includes(needle));
  if (keys.some((key) => /lora[._-]?(down|up|a|b|mid)|lora_unet|lora_te/i.test(key))) return 'lora';
  if (keys.some((key) => key.startsWith('first_stage_model') || key.startsWith('vae.')) && !has('model.diffusion_model')) return 'vae';
  const diffusion = has('model.diffusion_model') || keys.some((key) => /^(blocks|double_blocks|single_blocks|joint_blocks)\./i.test(key));
  const textEncoder = has('cond_stage_model') || keys.some((key) => /^(text_encoders|conditioner|clip)\./i.test(key));
  if (diffusion && textEncoder) return 'checkpoint';
  if (diffusion) return 'diffusion_model';
  return 'unknown';
}

function walk(root: string, dir: string, depth: number, out: ModelFile[]): void {
  if (depth > MAX_DEPTH) return;
  let entries: import('node:fs').Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(root, full, depth + 1, out);
      continue;
    }
    if (!entry.isFile() || !MODEL_EXTENSIONS.has(extname(entry.name).toLowerCase())) continue;
    let size = 0;
    try { size = statSync(full).size; } catch { /* ignore */ }
    const path = relative(resolve(root), resolve(full)).replace(/\\/g, '/');
    out.push({
      path,
      name: basename(entry.name, extname(entry.name)),
      kind: classifyModel(full),
      size,
      file: full,
    });
  }
}

/** 递归扫描模型根目录；按文件头分类。 */
export function scanModelFiles(root: string): { root: string; items: ModelFile[]; warnings: string[] } {
  const warnings: string[] = [];
  if (!root || !existsSync(root)) {
    return { root, items: [], warnings: [`模型目录不存在：${root || '(未配置)'}`] };
  }
  const items: ModelFile[] = [];
  walk(resolve(root), resolve(root), 0, items);
  items.sort((a, b) => a.kind.localeCompare(b.kind) || a.path.localeCompare(b.path));
  return { root: resolve(root), items, warnings };
}

export function modelNames(items: ModelFile[], kind: ModelKind): string[] {
  return [...new Set(items.filter((item) => item.kind === kind).map((item) => item.path))].sort((a, b) => a.localeCompare(b));
}

/** 兼容检查：文件在本地被识别，但 ComfyUI 的 /object_info 没有列出时提醒用户配置 extra_model_paths.yaml。 */
export function missingFromApi(local: string[], api: string[]): string[] {
  const normalize = (value: string): string => value.replace(/\\/g, '/').replace(/^\.\//, '').toLowerCase();
  const apiSet = new Set(api.map(normalize));
  return local.filter((item) => !apiSet.has(normalize(item)));
}
