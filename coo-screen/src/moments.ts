/**
 * 「看一眼」的深刻瞬间:每帧先落盘,桌宠用 screen_rate 打分;
 * 达到阈值才留在 moments.json 与 moments/ 里,供日记引用、也供绘画当参考图。
 *
 * 没到阈值的图在评分时删掉,避免截屏把磁盘塞满;没人评分的图只留最近十几张。
 */
import { randomBytes } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { nowIso } from 'cortico/core/util.ts';
import { clockIn } from './schedule.ts';

export type MomentSource = 'hotkey' | 'double' | 'proactive' | 'tool';

export interface ScreenMoment {
  id: string;
  /** 部署时区的 ISO 时间。 */
  createdAt: string;
  source: MomentSource;
  /** 相对 coo-screen 目录的路径,用 / 分隔。 */
  file: string;
  width: number;
  height: number;
  monitor: string;
  /** 1–10;还没评分时是 null。 */
  score: number | null;
  summary: string;
  note?: string;
  /** 评分时是否达到当时的阈值。 */
  memorable: boolean;
  ratedAt?: string;
}

interface MomentIndex {
  version: 1;
  updatedAt: string;
  moments: ScreenMoment[];
}

export interface SaveMomentMeta {
  source: MomentSource;
  width: number;
  height: number;
  monitor: string;
}

export interface RateMomentResult {
  moment: ScreenMoment;
  threshold: number;
  memorable: boolean;
}

export interface MomentListOptions {
  /** 只看这一天,YYYY-MM-DD。 */
  date?: string;
  limit?: number;
  /** 只列印象深刻的;默认 false。 */
  memorableOnly?: boolean;
}

const INDEX_FILE = 'moments.json';
const FRAMES_DIR = 'moments';
/** 单帧上限:正常 1600 长边的 PNG 远小于这个数。 */
const MAX_FRAME_BYTES = 12 * 1024 * 1024;
/** 没人评分的图最多留这么多张,防止一直不打分把磁盘占满。 */
const MAX_UNRATED = 12;
/** 印象深刻的图最多留这么多张。 */
const MAX_MEMORABLE = 300;
const MAX_SUMMARY_CHARS = 300;
const MAX_NOTE_CHARS = 300;

export class MomentError extends Error {
  override readonly name = 'MomentError';
}

function isInside(root: string, target: string): boolean {
  const rel = relative(root, target);
  return rel !== '' && !rel.startsWith('..') && !isAbsolute(rel);
}

function cleanText(value: unknown, maxChars: number): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, maxChars) : '';
}

/** 每帧的落盘、索引与评分。所有写操作同步完成,索引先写临时文件再换名。 */
export class MomentStore {
  private readonly framesDir: string;

  constructor(
    private readonly rootDir: string,
    private readonly timeZone: string,
    private readonly now: () => Date = () => new Date(),
  ) {
    this.framesDir = join(rootDir, FRAMES_DIR);
    mkdirSync(this.framesDir, { recursive: true });
  }

  root(): string {
    return this.rootDir;
  }

  dir(): string {
    return this.framesDir;
  }

  indexPath(): string {
    return join(this.rootDir, INDEX_FILE);
  }

  /** 相对 coo-screen 目录的路径写成绝对路径。 */
  pathOf(moment: Pick<ScreenMoment, 'file'>): string {
    return resolve(this.rootDir, moment.file);
  }

  private readIndex(): MomentIndex {
    const indexFile = this.indexPath();
    try {
      if (!existsSync(indexFile)) return { version: 1, updatedAt: nowIso(this.timeZone, this.now()), moments: [] };
      const parsed = JSON.parse(readFileSync(indexFile, 'utf8')) as Partial<MomentIndex>;
      const moments = Array.isArray(parsed.moments)
        ? parsed.moments.filter((item): item is ScreenMoment => {
            if (!item || typeof item !== 'object') return false;
            const moment = item as ScreenMoment;
            if (typeof moment.id !== 'string' || !moment.id) return false;
            if (typeof moment.createdAt !== 'string' || !moment.createdAt) return false;
            if (typeof moment.file !== 'string' || !moment.file) return false;
            if (!['hotkey', 'double', 'proactive', 'tool'].includes(moment.source)) return false;
            return typeof moment.score === 'number' || moment.score === null;
          })
        : [];
      return {
        version: 1,
        updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : nowIso(this.timeZone, this.now()),
        moments,
      };
    } catch {
      // 坏索引不覆盖:挪到旁边,下一次写入重新开始。
      try {
        if (existsSync(indexFile)) renameSync(indexFile, `${indexFile}.corrupt-${Date.now()}`);
      } catch {
        // 只读或占用时退回空索引。
      }
      return { version: 1, updatedAt: nowIso(this.timeZone, this.now()), moments: [] };
    }
  }

  private writeIndex(index: MomentIndex): void {
    mkdirSync(this.rootDir, { recursive: true });
    const next: MomentIndex = {
      version: 1,
      updatedAt: nowIso(this.timeZone, this.now()),
      moments: index.moments.slice(0, MAX_MEMORABLE + MAX_UNRATED),
    };
    const tmp = `${this.indexPath()}.tmp`;
    writeFileSync(tmp, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
    renameSync(tmp, this.indexPath());
  }

  private removeFile(moment: Pick<ScreenMoment, 'file'>): void {
    try {
      const abs = this.pathOf(moment);
      if (isInside(this.rootDir, abs)) rmSync(abs, { force: true });
    } catch {
      // 删不掉不影响索引整理。
    }
  }

  /** 新抓的一帧先存成未评分;太大或写不进去时返回 null。 */
  save(bytes: Uint8Array, meta: SaveMomentMeta): ScreenMoment | null {
    if (!bytes.byteLength || bytes.byteLength > MAX_FRAME_BYTES) return null;
    const createdAt = nowIso(this.timeZone, this.now());
    const stamp = createdAt.replace(/[-:]/g, '').slice(0, 15);
    const id = `m-${stamp}-${randomBytes(3).toString('hex')}`;
    const file = `${FRAMES_DIR}/${id}.png`;
    const abs = join(this.rootDir, file);
    mkdirSync(this.framesDir, { recursive: true });
    writeFileSync(abs, bytes);

    const moment: ScreenMoment = {
      id,
      createdAt,
      source: meta.source,
      file,
      width: meta.width,
      height: meta.height,
      monitor: meta.monitor,
      score: null,
      summary: '',
      memorable: false,
    };
    const index = this.readIndex();
    index.moments.unshift(moment);
    // 未评分的只留最近几张;旧的连同文件一起删。
    const unrated = index.moments.filter((item) => item.score === null);
    for (const old of unrated.slice(MAX_UNRATED)) {
      this.removeFile(old);
      index.moments = index.moments.filter((item) => item.id !== old.id);
    }
    const memorable = index.moments.filter((item) => item.memorable);
    for (const old of memorable.slice(MAX_MEMORABLE)) {
      this.removeFile(old);
      index.moments = index.moments.filter((item) => item.id !== old.id);
    }
    this.writeIndex(index);
    return moment;
  }

  latestUnrated(): ScreenMoment | undefined {
    return this.readIndex().moments
      .filter((item) => item.score === null)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  }

  get(id: string): ScreenMoment | undefined {
    return this.readIndex().moments.find((item) => item.id === id);
  }

  /**
   * 打分。达到阈值就保留;没达到就删图和索引项。
   * 返回的 moment 仍带着刚打的分,方便回执说明。
   */
  rate(id: string, score: number, summary: string, threshold: number, note?: string): RateMomentResult | null {
    const index = this.readIndex();
    const moment = index.moments.find((item) => item.id === id);
    if (!moment) return null;
    moment.score = Math.max(1, Math.min(10, Math.trunc(score)));
    moment.summary = cleanText(summary, MAX_SUMMARY_CHARS);
    moment.note = cleanText(note, MAX_NOTE_CHARS) || undefined;
    moment.ratedAt = nowIso(this.timeZone, this.now());
    moment.memorable = moment.score >= threshold;
    if (!moment.memorable) {
      this.removeFile(moment);
      index.moments = index.moments.filter((item) => item.id !== moment.id);
    }
    this.writeIndex(index);
    return { moment, threshold, memorable: moment.memorable };
  }

  list(options: MomentListOptions = {}): ScreenMoment[] {
    const limit = Math.max(1, Math.min(300, Math.trunc(options.limit ?? 20)));
    const day = options.date;
    return this.readIndex().moments
      .filter((moment) => !options.memorableOnly || moment.memorable)
      .filter((moment) => !day || this.dateOf(moment) === day)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  private dateOf(moment: Pick<ScreenMoment, 'createdAt'>): string {
    const at = new Date(moment.createdAt);
    if (Number.isNaN(at.getTime())) return '';
    return clockIn(this.timeZone, at).date;
  }

  /** 某天印象深刻的瞬间数量,给环境提示词/徽标用。 */
  countMemorable(date: string): number {
    return this.list({ date, limit: 300, memorableOnly: true }).length;
  }

  read(id: string): { bytes: Uint8Array; mime: string; moment: ScreenMoment } | null {
    const moment = this.get(id);
    if (!moment) return null;
    const abs = this.pathOf(moment);
    if (!isInside(this.rootDir, abs) || !existsSync(abs)) return null;
    try {
      if (!lstatSync(abs).isFile()) return null;
      return { bytes: new Uint8Array(readFileSync(abs)), mime: 'image/png', moment };
    } catch {
      return null;
    }
  }

  clear(): void {
    rmSync(this.framesDir, { recursive: true, force: true });
    rmSync(this.indexPath(), { force: true });
    mkdirSync(this.framesDir, { recursive: true });
  }
}
