import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { addPngText, pngSize } from './png.ts';
import { ensureDir, readJson, safeFilenamePart, writeJsonAtomic } from './fs-util.ts';
import type { GenerateParams, HistoryEntry, LoRASource } from './types.ts';

export interface SaveImageInput {
  bytes: Uint8Array;
  mime: string;
  params: GenerateParams;
  loras: Array<{ path: string; name: string; weight: number; source: LoRASource }>;
  promptId: string;
  taskId: string;
  workflow: string;
  index: number;
  batch: number;
  /** 实际生效的种子。 */
  seed: number;
}

export interface OutputStoreOptions {
  dataDir: string;
  outputDir: string;
  timezone: string;
  historyLimit: number;
  now?: () => Date;
}

const EXT_BY_MIME: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

function timestamp(date: Date, timezone: string): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  const fallback = (): string => `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);
    const get = (type: string): string => parts.find((part) => part.type === type)?.value ?? '00';
    const year = get('year');
    const candidate = `${year}${get('month')}${get('day')}-${get('hour')}${get('minute')}${get('second')}`;
    // 防御：若 Intl 因时区数据错误或注入的 now 返回异常年份（例如 2026 当预期 2025），用本地 fallback 校验
    const y = Number(year);
    if (Number.isFinite(y) && (y < 2020 || y > 2030)) {
      // 年份异常时回退到本地时间，避免文件名出现 2026 这种可疑值
      return fallback();
    }
    return candidate;
  } catch {
    return fallback();
  }
}

function a1111(params: GenerateParams, loras: Array<{ name: string; weight: number }>, seed: number): string {
  const loraTags = loras.map((lora) => `<lora:${lora.name}:${lora.weight}>`).join(' ');
  return [
    `${params.positive}${loraTags ? ` ${loraTags}` : ''}`,
    `Negative prompt: ${params.negative ?? ''}`,
    `Steps: ${params.steps ?? 20}, Sampler: ${params.sampler ?? 'euler_ancestral'}, CFG scale: ${params.cfg ?? 7}, Seed: ${seed}, Size: ${params.width ?? 768}x${params.height ?? 1152}, Model: ${params.checkpoint ?? ''}`,
  ].join('\n');
}

export class OutputStore {
  readonly dataDir: string;
  readonly dir: string;
  readonly historyFile: string;
  private readonly timezone: string;
  private readonly now: () => Date;
  private limit: number;
  private entries: HistoryEntry[] = [];

  constructor(options: OutputStoreOptions) {
    this.dataDir = options.dataDir;
    this.dir = resolve(options.outputDir);
    this.historyFile = join(options.dataDir, 'coo-gen', 'history.json');
    this.timezone = options.timezone;
    this.now = options.now ?? (() => new Date());
    this.limit = Math.max(1, Math.floor(Number(options.historyLimit) || 50));
    ensureDir(this.dir);
    ensureDir(join(options.dataDir, 'coo-gen'));
    const raw = readJson<{ entries?: HistoryEntry[] }>(this.historyFile);
    if (raw && Array.isArray(raw.entries)) {
      this.entries = raw.entries.filter((entry) => (
        entry && typeof entry.id === 'string' && typeof entry.path === 'string' && existsSync(entry.path)
      ));
    }
  }

  setLimit(limit: number): void {
    const next = Math.max(1, Math.floor(Number(limit) || this.limit));
    if (next === this.limit) return;
    this.limit = next;
    this.trim();
  }

  outputDir(): string {
    return this.dir;
  }

  list(limit = this.limit): HistoryEntry[] {
    return this.entries.slice(0, Math.max(1, Math.min(this.limit, Math.floor(limit))));
  }

  get(id: string): HistoryEntry | null {
    return this.entries.find((entry) => entry.id === id) ?? null;
  }

  private trim(): void {
    if (this.entries.length > this.limit) this.entries = this.entries.slice(0, this.limit);
    this.persist();
  }

  private persist(): void {
    writeJsonAtomic(this.historyFile, { version: 1, entries: this.entries });
  }

  /** 保存一张图，写 PNG 元数据，并放进最近历史。 */
  save(input: SaveImageInput): HistoryEntry {
    if (!existsSync(this.dir)) mkdirSync(this.dir, { recursive: true });
    const ext = EXT_BY_MIME[input.mime] ?? '.png';
    const model = safeFilenamePart(basename((input.params.checkpoint ?? 'model').replace(/\\/g, '/')).replace(extname(input.params.checkpoint ?? ''), ''), 'model');
    const base = `${timestamp(this.now(), this.timezone)}_${input.seed}_${model}${input.batch > 1 ? `_${input.index + 1}` : ''}`;
    let filename = `${base}${ext}`;
    let absolute = join(this.dir, filename);
    let suffix = 2;
    while (existsSync(absolute) && suffix < 1000) {
      filename = `${base}-${suffix}${ext}`;
      absolute = join(this.dir, filename);
      suffix++;
    }

    let bytes: Uint8Array = Buffer.from(input.bytes);
    const meta: Record<string, string> = {
      'coo-gen': JSON.stringify({
        version: 1,
        task_id: input.taskId,
        prompt_id: input.promptId,
        positive: input.params.positive,
        negative: input.params.negative ?? '',
        checkpoint: input.params.checkpoint ?? '',
        loras: input.loras.map((lora) => ({ name: lora.name, path: lora.path, weight: lora.weight, source: lora.source })),
        sampler: input.params.sampler ?? 'euler_ancestral',
        scheduler: input.params.scheduler ?? 'normal',
        steps: input.params.steps ?? 20,
        cfg: input.params.cfg ?? 7,
        width: input.params.width ?? 768,
        height: input.params.height ?? 1152,
        batch: input.params.batch ?? 1,
        seed: input.seed,
        workflow: input.workflow,
        ...(input.params.source ? { source: input.params.source } : {}),
        created_at: this.now().toISOString(),
      }),
      parameters: a1111(input.params, input.loras, input.seed),
      software: 'Coopanion coo-gen',
    };
    const size = input.mime === 'image/png' ? pngSize(bytes) : null;
    if (input.mime === 'image/png') {
      try {
        bytes = addPngText(bytes, meta);
      } catch {
        // 元数据写不进去也不影响图本身。
      }
    }
    const tmp = `${absolute}.tmp-${process.pid}-${Date.now()}`;
    writeFileSync(tmp, bytes);
    renameSync(tmp, absolute);
    if (input.mime !== 'image/png') {
      try {
        writeJsonAtomic(`${absolute}.json`, JSON.parse(meta['coo-gen']!));
      } catch { /* sidecar 只是方便，不阻塞 */ }
    }

    const entry: HistoryEntry = {
      id: randomUUID(),
      filename,
      path: absolute,
      positive: input.params.positive,
      negative: input.params.negative ?? '',
      checkpoint: input.params.checkpoint ?? '',
      loras: input.loras.map(({ name, path, weight, source }) => ({ name, path, weight, source })),
      sampler: input.params.sampler ?? 'euler_ancestral',
      scheduler: input.params.scheduler ?? 'normal',
      steps: input.params.steps ?? 20,
      cfg: input.params.cfg ?? 7,
      width: size?.width ?? input.params.width ?? 768,
      height: size?.height ?? input.params.height ?? 1152,
      seed: input.seed,
      batch: input.batch,
      created_at: this.now().getTime(),
      workflow: input.workflow,
      ...(input.params.workflow ? { workflow_id: input.params.workflow } : {}),
      prompt_id: input.promptId,
      task_id: input.taskId,
      ...(input.params.note ? { note: input.params.note } : {}),
      ...(input.params.source ? { source: input.params.source } : {}),
      ...(input.params.inputImage ? { inputImage: input.params.inputImage } : {}),
      ...(input.params.controlImage ? { controlImage: input.params.controlImage } : {}),
      ...(input.params.controlNet ? { controlNet: input.params.controlNet } : {}),
      ...(input.params.denoise !== undefined ? { denoise: input.params.denoise } : {}),
      ...(input.params.controlStrength !== undefined ? { controlStrength: input.params.controlStrength } : {}),
      ...(input.params.custom ? { custom: { ...input.params.custom } } : {}),
    };
    this.entries.unshift(entry);
    this.trim();
    return entry;
  }

  clear(): string {
    this.entries = [];
    this.persist();
    return '历史索引已清空；output 文件夹里的图片没有被删除。';
  }

  /** 历史索引 + 文件列表的简要统计。 */
  stats(): { count: number; dir: string; sizeBytes: number } {
    let sizeBytes = 0;
    for (const entry of this.entries) {
      try { sizeBytes += statSync(entry.path).size; } catch { /* ignore */ }
    }
    return { count: this.entries.length, dir: this.dir, sizeBytes };
  }
}
