import {
  closeSync, existsSync, openSync, readFileSync, readdirSync, readSync, statSync,
} from 'node:fs';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';
import { resolveInside } from './fs-util.ts';
import type {
  DefaultLoRA, LoRAMatchInput, LoRAMergeOptions, LoRARecord, MatchedLoRA,
} from './types.ts';

export const LORA_EXTENSIONS = ['.safetensors', '.ckpt', '.pt', '.pth'] as const;
const MAX_DEPTH = 8;
const MAX_HEADER_BYTES = 4 * 1024 * 1024;
const PREVIEW_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];

export interface ScanResult {
  root: string;
  items: LoRARecord[];
  warnings: string[];
}

export function isLoraPath(file: string): boolean {
  return LORA_EXTENSIONS.includes(extname(file).toLowerCase() as typeof LORA_EXTENSIONS[number]);
}

export function normalizeLoraPath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\.?\//, '');
}

/** 从 safetensors 头里读 `__metadata__`；失败返回空对象，不抛错。 */
export function readSafetensorsMetadata(file: string): Record<string, unknown> {
  if (extname(file).toLowerCase() !== '.safetensors') return {};
  let fd: number | undefined;
  try {
    const size = statSync(file).size;
    if (size < 16) return {};
    fd = openSync(file, 'r');
    const head = Buffer.alloc(8);
    readSync(fd, head, 0, 8, 0);
    const length = Number(head.readBigUInt64LE(0));
    if (!Number.isFinite(length) || length <= 0 || length > MAX_HEADER_BYTES || length + 8 > size) return {};
    const bytes = Buffer.alloc(length);
    readSync(fd, bytes, 0, length, 8);
    const parsed = JSON.parse(bytes.toString('utf8')) as { __metadata__?: unknown };
    const meta = parsed.__metadata__;
    return meta && typeof meta === 'object' && !Array.isArray(meta) ? meta as Record<string, unknown> : {};
  } catch {
    return {};
  } finally {
    if (fd !== undefined) {
      try { closeSync(fd); } catch { /* ignore */ }
    }
  }
}

function stringsFrom(value: unknown): string[] {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        return stringsFrom(JSON.parse(trimmed) as unknown);
      } catch {
        return [trimmed];
      }
    }
    return trimmed.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
  }
  if (Array.isArray(value)) return value.flatMap(stringsFrom);
  if (value && typeof value === 'object') return [];
  return [];
}

function metadataTriggers(file: string): string[] {
  const meta = readSafetensorsMetadata(file);
  const out: string[] = [];
  for (const key of ['ss_trigger_words', 'trigger_words', 'triggerWords', 'modelspec.trigger_phrase', 'trainedWords']) {
    out.push(...stringsFrom(meta[key]));
  }
  if (!out.length) {
    // A1111 风格的 ss_tag_frequency 不是触发词，只在没有其它元数据时取最常见的 8 个 tag。
    const raw = meta.ss_tag_frequency;
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw) as Record<string, Record<string, number>>;
        const counts = new Map<string, number>();
        for (const tags of Object.values(parsed)) {
          if (!tags || typeof tags !== 'object') continue;
          for (const [tag, count] of Object.entries(tags)) {
            if (typeof count !== 'number') continue;
            counts.set(tag, (counts.get(tag) ?? 0) + count);
          }
        }
        out.push(...[...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([tag]) => tag));
      } catch { /* ignore */ }
    }
  }
  return [...new Set(out.map((s) => s.trim()).filter((s) => s.length >= 1 && s.length <= 80))].slice(0, 40);
}

function sidecarTriggers(file: string): string[] {
  const base = file.slice(0, -extname(file).length);
  for (const ext of ['.json', '.txt']) {
    const candidate = `${base}${ext}`;
    if (!existsSync(candidate)) continue;
    try {
      const raw = statSync(candidate).size > 512 * 1024 ? '' : readFileSync(candidate, 'utf8');
      if (!raw) continue;
      if (ext === '.txt') {
        return raw.split(/[,;\n]/).map((s) => s.trim()).filter((s) => s && s.length <= 80).slice(0, 40);
      }
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      for (const key of ['trigger_words', 'triggerWords', 'trainedWords', 'activation_text']) {
        const list = stringsFrom(parsed[key]);
        if (list.length) return [...new Set(list)].slice(0, 40);
      }
    } catch { /* ignore broken sidecars */ }
  }
  return [];
}

function previewFor(file: string, root: string): string | null {
  const dir = dirname(file);
  const base = basename(file).slice(0, -extname(file).length);
  for (const ext of PREVIEW_EXTENSIONS) {
    for (const name of [`${base}${ext}`, `${base}.preview${ext}`, `${base}.preview.${ext.slice(1)}`]) {
      const candidate = join(dir, name);
      if (existsSync(candidate)) return normalizeLoraPath(relative(root, candidate));
    }
  }
  return null;
}

function walk(root: string, dir: string, depth: number, out: string[], warnings: string[]): void {
  if (depth > MAX_DEPTH) return;
  let entries: import('node:fs').Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch (error) {
    warnings.push(`读不到目录 ${dir}：${error instanceof Error ? error.message : String(error)}`);
    return;
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(root, full, depth + 1, out, warnings);
      continue;
    }
    if (entry.isFile() && isLoraPath(entry.name)) out.push(full);
  }
}

/** 递归扫描 loras 目录；不跟符号链接，深度上限 8。 */
export function scanLoRAs(root: string): ScanResult {
  const warnings: string[] = [];
  if (!root || !existsSync(root)) {
    return { root, items: [], warnings: [`LoRA 目录不存在：${root || '(未配置)'}`] };
  }
  const files: string[] = [];
  walk(resolve(root), resolve(root), 0, files, warnings);
  const items: LoRARecord[] = [];
  for (const file of files) {
    const rel = normalizeLoraPath(relative(resolve(root), file));
    const category = normalizeLoraPath(dirname(rel)) === '.' ? '' : normalizeLoraPath(dirname(rel));
    let size = 0;
    try { size = statSync(file).size; } catch { /* ignore */ }
    const triggers = [...new Set([...sidecarTriggers(file), ...metadataTriggers(file)])].slice(0, 40);
    items.push({
      path: rel,
      name: basename(file, extname(file)),
      category,
      size,
      preview: previewFor(file, resolve(root)),
      trigger_words: triggers,
      aliases: [],
      weight: null,
    });
  }
  items.sort((a, b) => (a.category === b.category ? a.name.localeCompare(b.name) : a.category.localeCompare(b.category)));
  return { root, items, warnings };
}

/** 只保留路径仍在 root 内的预览图。 */
export function resolvePreview(root: string, preview: string): string | null {
  return resolveInside(root, preview);
}

export function applyUserLoRAMeta(
  items: LoRARecord[],
  aliases: Record<string, string[]>,
  meta: Record<string, { aliases?: string[]; trigger_words?: string[]; weight?: number }>,
): LoRARecord[] {
  const aliasByPath = new Map<string, string[]>();
  for (const [alias, paths] of Object.entries(aliases)) {
    for (const path of paths) {
      const key = normalizeLoraPath(path).toLowerCase();
      const list = aliasByPath.get(key) ?? [];
      if (!list.includes(alias)) list.push(alias);
      aliasByPath.set(key, list);
    }
  }
  return items.map((item) => {
    const key = item.path.toLowerCase();
    const own = meta[item.path] ?? meta[key] ?? {};
    const aliasSet = new Set([...(own.aliases ?? []), ...(aliasByPath.get(key) ?? [])]);
    return {
      ...item,
      aliases: [...aliasSet],
      trigger_words: [...new Set([...item.trigger_words, ...(own.trigger_words ?? [])])],
      weight: own.weight ?? item.weight,
    };
  });
}

interface Candidate {
  item: LoRARecord;
  weight: number;
  source: 'default' | 'auto' | 'manual';
  reason: string;
  confidence: number;
}

function textOf(input: LoRAMatchInput): string {
  return [input.subject, input.styleHint ?? '', ...(input.extraTags ?? [])].join(' ').normalize('NFKC').toLowerCase();
}

function squash(value: string): string {
  return value.normalize('NFKC').toLowerCase().replace(/[_\-.\s]+/g, ' ').trim();
}

function terms(value: string): string[] {
  const normalized = squash(value);
  const set = new Set<string>();
  for (const token of normalized.split(/[\s,，、;；:：/\\|()[\]{}<>《》"']+/)) {
    if (token.length >= 2) set.add(token);
  }
  // 中文没有空格：把整段也作为一个词，并补 2–6 字的子串用于文件名/别名命中。
  const cjk = normalized.match(/[\u3400-\u9fff]+/g) ?? [];
  for (const run of cjk) {
    set.add(run);
    if (run.length > 2 && run.length <= 10) {
      for (let i = 0; i + 2 <= run.length; i++) set.add(run.slice(i, i + 2));
      for (let i = 0; i + 3 <= run.length; i++) set.add(run.slice(i, i + 3));
    }
  }
  return [...set];
}

function resolveRecord(records: LoRARecord[], name: string): LoRARecord | undefined {
  const wanted = normalizeLoraPath(name).toLowerCase();
  const bare = wanted.replace(/\.(safetensors|ckpt|pt|pth)$/i, '');
  return records.find((r) => r.path.toLowerCase() === wanted)
    ?? records.find((r) => r.name.toLowerCase() === bare)
    ?? records.find((r) => r.path.toLowerCase().endsWith(`/${wanted}`))
    ?? records.find((r) => r.name.toLowerCase().includes(bare))
    ?? records.find((r) => squash(r.path).includes(squash(bare)));
}

function weightFor(item: LoRARecord, explicit?: number): number {
  const n = Number(explicit ?? item.weight ?? 0.75);
  const safe = Number.isFinite(n) ? n : 0.75;
  return Math.round(Math.min(2, Math.max(0.05, safe)) * 100) / 100;
}

export interface MatchOptions {
  strategies?: Array<'alias' | 'filename' | 'trigger' | 'llm'>;
  explicitSource?: 'auto' | 'manual';
}

/**
 * 多策略匹配：别名 > 文件名 > 触发词 > 调用方给的语义选择（llm 策略）。
 * 每条记录只保留最高置信度的命中。
 */
export function matchLoRAs(
  records: LoRARecord[],
  aliases: Record<string, string[]>,
  input: LoRAMatchInput,
  options: MatchOptions = {},
): MatchedLoRA[] {
  const strategies = options.strategies ?? ['alias', 'filename', 'trigger', 'llm'];
  const haystack = textOf(input);
  const hayTerms = terms(haystack);
  const byPath = new Map<string, Candidate>();

  const add = (candidate: Candidate): void => {
    const key = candidate.item.path;
    const old = byPath.get(key);
    if (!old || candidate.confidence > old.confidence || (candidate.confidence === old.confidence && candidate.weight > old.weight)) {
      byPath.set(key, candidate);
    }
  };

  // 1. 别名表：用户预设的中文 -> LoRA。
  if (strategies.includes('alias')) {
    for (const [alias, paths] of Object.entries(aliases)) {
      if (!alias) continue;
      const normalized = squash(alias);
      const hit = haystack.includes(alias.normalize('NFKC').toLowerCase())
        || (normalized.length >= 2 && hayTerms.includes(normalized));
      if (!hit) continue;
      for (const path of paths) {
        const item = resolveRecord(records, path);
        if (!item) continue;
        add({
          item,
          weight: weightFor(item),
          source: 'auto',
          reason: `别名「${alias}」`,
          confidence: normalized === squash(haystack) ? 1 : 0.95,
        });
      }
    }
  }

  // 2. 文件名 / 目录名包含关键词。
  if (strategies.includes('filename')) {
    for (const item of records) {
      const name = squash(`${item.category} ${item.name}`);
      let best = 0;
      let hit = '';
      for (const term of hayTerms) {
        if (term.length < 2) continue;
        if (name.includes(term)) {
          const score = Math.min(0.85, 0.55 + term.length * 0.04);
          if (score > best) { best = score; hit = term; }
        } else {
          const token = name.split(' ').find((part) => part.length >= 3 && term.includes(part));
          if (token) {
            const score = 0.6;
            if (score > best) { best = score; hit = token; }
          }
        }
      }
      if (best > 0) {
        add({
          item,
          weight: weightFor(item),
          source: 'auto',
          reason: `文件名命中「${hit}」`,
          confidence: best,
        });
      }
    }
  }

  // 3. 触发词。
  if (strategies.includes('trigger')) {
    for (const item of records) {
      for (const trigger of item.trigger_words) {
        const t = squash(trigger);
        if (t.length < 2) continue;
        if (haystack.includes(t) || hayTerms.includes(t)) {
          add({
            item,
            weight: weightFor(item),
            source: 'auto',
            reason: `触发词「${trigger}」`,
            confidence: 0.68,
          });
          break;
        }
      }
    }
  }

  // 4. 调用方（对话模型）显式挑选的语义结果。
  if (strategies.includes('llm') && input.explicit?.length) {
    for (const pick of input.explicit) {
      const item = resolveRecord(records, pick.name);
      if (!item) continue;
      add({
        item,
        weight: weightFor(item, pick.weight),
        source: options.explicitSource ?? 'auto',
        reason: '对话语义选择',
        confidence: 0.9,
      });
    }
  }

  return [...byPath.values()]
    .sort((a, b) => b.confidence - a.confidence || a.item.name.localeCompare(b.item.name))
    .map(({ item, weight, source, reason, confidence }) => ({
      path: item.path,
      name: item.name,
      weight,
      source,
      reason,
      confidence,
    }));
}

export interface ResolvedDefaults {
  loras: MatchedLoRA[];
  missing: DefaultLoRA[];
}

export function resolveDefaults(records: LoRARecord[], defaults: DefaultLoRA[]): ResolvedDefaults {
  const loras: MatchedLoRA[] = [];
  const missing: DefaultLoRA[] = [];
  const seen = new Set<string>();
  for (const def of defaults) {
    const item = resolveRecord(records, def.path) ?? resolveRecord(records, def.name);
    if (!item) {
      missing.push(def);
      continue;
    }
    if (seen.has(item.path)) continue;
    seen.add(item.path);
    loras.push({
      path: item.path,
      name: item.name,
      weight: weightFor(item, def.weight),
      source: 'default',
      reason: '默认 LoRA',
      confidence: 0,
    });
  }
  return { loras, missing };
}

/**
 * 合并去重：同名取较高权重；对话匹配优先于默认；超上限时先淘汰默认。
 * 传入的 matched 应已按置信度排序。
 */
export function mergeLoRAs(
  defaults: MatchedLoRA[],
  matched: MatchedLoRA[],
  options: LoRAMergeOptions,
): MatchedLoRA[] {
  const max = Math.max(1, Math.floor(options.maxCount));
  const autoFirst = options.autoFirst !== false;
  const ordered = autoFirst ? [...matched, ...defaults] : [...defaults, ...matched];
  const map = new Map<string, MatchedLoRA>();
  const priority: Record<MatchedLoRA['source'], number> = { manual: 3, auto: 2, default: 1 };

  for (const entry of ordered) {
    const key = normalizeLoraPath(entry.path).toLowerCase();
    const old = map.get(key);
    if (!old) {
      map.set(key, { ...entry });
      continue;
    }
    const weight = Math.max(old.weight, entry.weight);
    const source = priority[entry.source] > priority[old.source] ? entry.source : old.source;
    const reason = old.reason === entry.reason ? old.reason : `${old.reason} / ${entry.reason}`;
    map.set(key, { ...old, weight, source, reason });
  }

  let list = [...map.values()];
  if (list.length > max) {
    const autos = list.filter((item) => item.source !== 'default');
    const defs = list.filter((item) => item.source === 'default');
    list = [...autos, ...defs].slice(0, max);
  }
  return list.sort((a, b) => {
    if (a.source !== b.source) return (priority[b.source] ?? 0) - (priority[a.source] ?? 0);
    return b.confidence - a.confidence;
  });
}

/** 给面板/环境提示词用的紧凑 LoRA 列表。 */
export function describeLoRAsForPrompt(records: LoRARecord[], aliases: Record<string, string[]>, limit = 60): string {
  const aliasIndex = new Map<string, string[]>();
  for (const [alias, paths] of Object.entries(aliases)) {
    for (const path of paths) {
      const key = normalizeLoraPath(path).toLowerCase();
      const list = aliasIndex.get(key) ?? [];
      list.push(alias);
      aliasIndex.set(key, list);
    }
  }
  return records.slice(0, limit).map((item) => {
    const bits = [item.path];
    const alias = aliasIndex.get(item.path.toLowerCase());
    if (alias?.length) bits.push(`别名:${alias.join('/')}`);
    if (item.trigger_words.length) bits.push(`触发词:${item.trigger_words.slice(0, 4).join('/')}`);
    return `- ${bits.join(' | ')}`;
  }).join('\n');
}
