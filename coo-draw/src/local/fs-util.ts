import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';

/** 创建目录，返回是否新建。 */
export function ensureDir(dir: string): boolean {
  if (existsSync(dir)) return false;
  mkdirSync(dir, { recursive: true });
  return true;
}

/** 先写临时文件再 rename，避免进程被杀时留下半个 JSON。 */
export function writeJsonAtomic(file: string, value: unknown): void {
  ensureDir(dirname(file));
  const tmp = `${file}.tmp-${process.pid}-${Date.now()}`;
  writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  renameSync(tmp, file);
}

export function writeTextAtomic(file: string, text: string): void {
  ensureDir(dirname(file));
  const tmp = `${file}.tmp-${process.pid}-${Date.now()}`;
  writeFileSync(tmp, text, 'utf8');
  renameSync(tmp, file);
}

export function readJson<T>(file: string): T | null {
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as T;
  } catch {
    return null;
  }
}

export function safeMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

/** 子路径必须在 root 内；相对路径也允许，返回解析后的绝对路径。 */
export function resolveInside(root: string, child: string): string | null {
  if (!child || child.includes('\0')) return null;
  const base = resolve(root);
  const target = resolve(base, child);
  const rel = relative(base, target);
  if (rel === '') return target;
  if (rel.startsWith('..') || isAbsolute(rel)) return null;
  return target;
}

export function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/** 文件名里去掉 Windows 不允许的字符，并限制长度。 */
export function safeFilenamePart(value: string, fallback = 'image'): string {
  const cleaned = value
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
    .replace(/\s+/g, ' ')
    .replace(/^[. ]+|[. ]+$/g, '')
    .slice(0, 80);
  return cleaned || fallback;
}
