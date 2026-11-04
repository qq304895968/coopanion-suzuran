/**
 * 画夹：图片按评价分目录保存，根目录的 index.json 给其他插件读。
 *
 *   <saveDir>/index.json
 *   <saveDir>/unrated/<id>.<ext>
 *   <saveDir>/favorite|like|neutral|dislike/<id>.<ext>
 *
 * 评价只由玩家说出口后由桌宠调用；没评价的留在 unrated。
 */
import { randomBytes } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { nowIso } from 'cortico/core/util.ts';

export type ArtRating = 'unrated' | 'favorite' | 'like' | 'neutral' | 'dislike';

export const ART_RATINGS: readonly ArtRating[] = ['unrated', 'favorite', 'like', 'neutral', 'dislike'];

export interface SavedArt {
  id: string;
  /** 相对 saveDir 的路径，用 / 分隔，方便其他插件跨平台读。 */
  file: string;
  mime: string;
  width: number;
  height: number;
  bytes: number;
  createdAt: string;
  subject: string;
  style: string;
  /** 画风 id；旧索引可能没有。 */
  styleId?: string;
  /** 这次用的参考图来源说明（不存参考图本身）。 */
  reference?: string;
  rating: ArtRating;
  ratedAt?: string;
  note?: string;
}

export interface ArtIndex {
  version: 1;
  updatedAt: string;
  drawings: SavedArt[];
}

export interface ArtSaveMeta {
  subject: string;
  style: string;
  styleId: string;
  reference?: string;
  width: number;
  height: number;
}

export interface ArtListOptions {
  rating?: ArtRating | 'all';
  query?: string;
  limit?: number;
}

const INDEX_FILE = 'index.json';
const MAX_NOTE_CHARS = 500;
const MAX_INDEX_ENTRIES = 5000;

function isRating(value: unknown): value is ArtRating {
  return typeof value === 'string' && (ART_RATINGS as readonly string[]).includes(value);
}

function extFor(mime: string): string {
  return mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
}

function isInside(root: string, target: string): boolean {
  const rel = relative(root, target);
  return rel !== '' && !rel.startsWith('..') && !isAbsolute(rel);
}

export class ArtStore {
  private readonly indexFile: string;

  constructor(
    private readonly rootDir: string,
    private readonly timeZone: string,
    private readonly now: () => Date = () => new Date(),
  ) {
    this.indexFile = join(rootDir, INDEX_FILE);
    this.ensureRoot();
  }

  indexPath(): string {
    return this.indexFile;
  }

  root(): string {
    return this.rootDir;
  }

  private ensureRoot(): void {
    mkdirSync(this.rootDir, { recursive: true });
  }

  private ensureFolder(rating: ArtRating): void {
    mkdirSync(join(this.rootDir, rating), { recursive: true });
  }

  private readIndex(): ArtIndex {
    try {
      if (!existsSync(this.indexFile)) return { version: 1, updatedAt: nowIso(this.timeZone, this.now()), drawings: [] };
      const parsed = JSON.parse(readFileSync(this.indexFile, 'utf8')) as Partial<ArtIndex>;
      const drawings = Array.isArray(parsed.drawings)
        ? parsed.drawings.filter((item): item is SavedArt => {
            if (!item || typeof item !== 'object') return false;
            const art = item as SavedArt;
            return typeof art.id === 'string' && typeof art.file === 'string'
              && typeof art.createdAt === 'string' && isRating(art.rating);
          })
        : [];
      return {
        version: 1,
        updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : nowIso(this.timeZone, this.now()),
        drawings,
      };
    } catch {
      // 坏掉的索引不覆盖、不丢：挪到旁边，下一次保存重新写一份干净的。
      try {
        if (existsSync(this.indexFile)) {
          renameSync(this.indexFile, `${this.indexFile}.corrupt-${Date.now()}`);
        }
      } catch {
        // 只读目录或文件被占用时，退回空索引。
      }
      return { version: 1, updatedAt: nowIso(this.timeZone, this.now()), drawings: [] };
    }
  }

  private writeIndex(index: ArtIndex, updatedAt = nowIso(this.timeZone, this.now())): void {
    this.ensureRoot();
    const next: ArtIndex = {
      version: 1,
      updatedAt,
      drawings: index.drawings.slice(0, MAX_INDEX_ENTRIES),
    };
    const tmp = `${this.indexFile}.tmp`;
    writeFileSync(tmp, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
    renameSync(tmp, this.indexFile);
  }

  /** 把一张新画存进 unrated/，返回写进索引的那条记录。 */
  save(bytes: Uint8Array, mime: string, meta: ArtSaveMeta): SavedArt {
    this.ensureFolder('unrated');
    const createdAt = nowIso(this.timeZone, this.now());
    const stamp = createdAt.replace(/[-:]/g, '').slice(0, 15);
    const id = `d-${stamp}-${randomBytes(3).toString('hex')}`;
    const fileName = `${id}.${extFor(mime)}`;
    const abs = join(this.rootDir, 'unrated', fileName);
    writeFileSync(abs, bytes);

    const art: SavedArt = {
      id,
      file: `unrated/${fileName}`,
      mime,
      width: meta.width,
      height: meta.height,
      bytes: bytes.byteLength,
      createdAt,
      subject: meta.subject,
      style: meta.style,
      styleId: meta.styleId,
      ...(meta.reference ? { reference: meta.reference } : {}),
      rating: 'unrated',
    };
    const index = this.readIndex();
    index.drawings.unshift(art);
    this.writeIndex(index);
    return art;
  }

  /** 按评价把文件挪到对应目录；找不到 id 时返回 null。 */
  rate(id: string, rating: ArtRating, note?: string): SavedArt | null {
    const index = this.readIndex();
    const art = index.drawings.find((item) => item.id === id);
    if (!art) return null;

    this.ensureFolder(rating);
    const oldAbs = resolve(this.rootDir, art.file);
    const newAbs = join(this.rootDir, rating, basename(art.file));
    if (!isInside(this.rootDir, oldAbs) || !existsSync(oldAbs)) return null;
    if (oldAbs !== newAbs) {
      try {
        renameSync(oldAbs, newAbs);
      } catch {
        copyFileSync(oldAbs, newAbs);
        unlinkSync(oldAbs);
      }
    }
    art.rating = rating;
    art.ratedAt = nowIso(this.timeZone, this.now());
    art.file = relative(this.rootDir, newAbs).split(sep).join('/');
    if (note !== undefined) art.note = note.trim().slice(0, MAX_NOTE_CHARS);
    this.writeIndex(index);
    return art;
  }

  list(opts: ArtListOptions = {}): SavedArt[] {
    const rating = opts.rating ?? 'all';
    const query = (opts.query ?? '').trim().toLowerCase();
    const limit = Math.max(1, Math.min(50, Math.trunc(opts.limit ?? 5)));
    return this.readIndex().drawings
      .filter((art) => rating === 'all' || art.rating === rating)
      .filter((art) => !query || art.subject.toLowerCase().includes(query))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  get(id: string): SavedArt | undefined {
    return this.readIndex().drawings.find((art) => art.id === id);
  }

  latestUnrated(ids?: readonly string[]): SavedArt | undefined {
    const drawings = this.readIndex().drawings;
    const pool = ids?.length
      ? drawings.filter((art) => ids.includes(art.id))
      : drawings;
    return pool
      .filter((art) => art.rating === 'unrated')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  }

  count(rating: ArtRating | 'all' = 'all'): number {
    return this.readIndex().drawings.filter((art) => rating === 'all' || art.rating === rating).length;
  }

  /** 读回一张画的字节；索引里没有或文件丢了返回 null。 */
  read(id: string): { bytes: Uint8Array; mime: string; art: SavedArt } | null {
    const art = this.get(id);
    if (!art) return null;
    const abs = resolve(this.rootDir, art.file);
    if (!isInside(this.rootDir, abs) || !existsSync(abs)) return null;
    return { bytes: new Uint8Array(readFileSync(abs)), mime: art.mime, art };
  }
}
