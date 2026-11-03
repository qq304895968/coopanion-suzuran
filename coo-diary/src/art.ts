/**
 * 和画画 World 的只读联动。
 *
 * 画画插件把画存进 `worlds.draw.saveDir`(旧版是 `worlds.pet-draw.saveDir`;留空时是 `<dataDir>/pet-draw`),
 * 并在根目录写一份 `index.json`。日记不调用对方的工具,只读这份索引:
 * 按日期挑画、把引用的图复制进 `<日记目录>/images/<日期>/`,再在 Markdown 里用相对路径引用。
 */
import { copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync } from 'node:fs';
import { basename, isAbsolute, join, relative, resolve } from 'node:path';
import { partsIn } from './store.ts';

export type ArtRating = 'unrated' | 'favorite' | 'like' | 'neutral' | 'dislike';

export const ART_RATINGS: readonly ArtRating[] = ['unrated', 'favorite', 'like', 'neutral', 'dislike'];

const RATING_LABELS: Readonly<Record<ArtRating, string>> = {
  unrated: '未评价',
  favorite: '最喜欢',
  like: '喜欢',
  neutral: '一般',
  dislike: '不喜欢',
};

/** 索引文件的上限;正常几百张也只有几十 KB。 */
const MAX_INDEX_BYTES = 5 * 1024 * 1024;
/** 单张图复制的上限,防止把巨大的文件拖进日记。 */
const MAX_ART_BYTES = 25 * 1024 * 1024;
/** 索引里最多看多少条。 */
const MAX_INDEX_ENTRIES = 5000;

/** 画夹或索引不能用;message 原样进工具回执。 */
export class ArtError extends Error {
  override readonly name = 'ArtError';
}

export interface ArtFolder {
  /** 画夹的绝对路径。 */
  dir: string;
  /** true = 用户显式设置过 saveDir;false = 用 dataDir 下的默认目录。 */
  configured: boolean;
}

export interface ArtEntry {
  id: string;
  /** 相对画夹的路径,用 / 分隔。 */
  file: string;
  /** 绝对路径。 */
  absPath: string;
  mime: string;
  width: number;
  height: number;
  createdAt: string;
  subject: string;
  style: string;
  rating: ArtRating;
  note?: string;
}

function isRating(value: unknown): value is ArtRating {
  return typeof value === 'string' && (ART_RATINGS as readonly string[]).includes(value);
}

function isInside(root: string, target: string): boolean {
  const rel = relative(root, target);
  return rel !== '' && !rel.startsWith('..') && !isAbsolute(rel);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * 从部署的 config.json 读画夹目录。
 * 合并后的「画室」写在 `worlds.draw.saveDir`；旧版 `worlds.pet-draw.saveDir` 仍然兼容。
 */
export function petDrawSaveDir(botDir: string): string {
  try {
    const raw = readFileSync(join(botDir, 'config.json'), 'utf8').replace(/^\uFEFF/, '');
    const config = JSON.parse(raw) as unknown;
    if (!isPlainObject(config)) return '';
    const worlds = config.worlds;
    if (!isPlainObject(worlds)) return '';
    for (const id of ['draw', 'pet-draw']) {
      const section = worlds[id];
      if (!isPlainObject(section)) continue;
      const saveDir = section.saveDir;
      if (typeof saveDir === 'string' && saveDir.trim()) return saveDir.trim();
    }
    return '';
  } catch {
    return '';
  }
}

/**
 * 画画插件的画夹在哪。`dataDir` 缺失时返回 null(没有可推断的默认目录)。
 * 相对路径按画画插件的规则解析到 dataDir 下。
 */
export function artFolder(botDir: string | undefined, dataDir: string | undefined): ArtFolder | null {
  if (!dataDir) return null;
  const configured = botDir ? petDrawSaveDir(botDir) : '';
  if (configured) {
    return {
      dir: isAbsolute(configured) ? resolve(configured) : resolve(dataDir, configured),
      configured: true,
    };
  }
  return { dir: join(dataDir, 'pet-draw'), configured: false };
}

/** 画夹根目录的 index.json;没有这个文件时返回空数组。 */
export function loadArtIndex(folder: ArtFolder): ArtEntry[] {
  const indexFile = join(folder.dir, 'index.json');
  if (!existsSync(indexFile)) return [];
  const stat = lstatSync(indexFile);
  if (!stat.isFile()) throw new ArtError(`${indexFile} 不是普通文件,不读。`);
  if (stat.size > MAX_INDEX_BYTES) {
    throw new ArtError(`画夹索引有 ${Math.round(stat.size / 1024)} KB,超过上限,不读。`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(indexFile, 'utf8'));
  } catch (error) {
    throw new ArtError(`画夹索引读不了:${error instanceof Error ? error.message : String(error)}`);
  }
  if (!isPlainObject(parsed) || !Array.isArray(parsed.drawings)) return [];

  const entries: ArtEntry[] = [];
  for (const raw of parsed.drawings.slice(0, MAX_INDEX_ENTRIES)) {
    if (!isPlainObject(raw)) continue;
    const { id, file, mime, width, height, createdAt, subject, style, rating } = raw;
    if (typeof id !== 'string' || !id) continue;
    if (typeof file !== 'string' || !file) continue;
    if (typeof createdAt !== 'string' || !createdAt) continue;
    if (!isRating(rating)) continue;
    const absPath = resolve(folder.dir, file);
    if (!isInside(folder.dir, absPath)) continue;
    if (!existsSync(absPath)) continue;
    try {
      if (!lstatSync(absPath).isFile()) continue;
    } catch {
      continue;
    }
    entries.push({
      id,
      file,
      absPath,
      mime: typeof mime === 'string' && mime.startsWith('image/') ? mime : 'image/png',
      width: typeof width === 'number' ? width : 0,
      height: typeof height === 'number' ? height : 0,
      createdAt,
      subject: typeof subject === 'string' ? subject : '',
      style: typeof style === 'string' ? style : '',
      rating,
      ...(typeof raw.note === 'string' && raw.note ? { note: raw.note } : {}),
    });
  }
  return entries;
}

/** 索引里的 `createdAt` 换算到部署时区后是哪一天。 */
export function artDate(entry: ArtEntry, timezone: string): string {
  const at = new Date(entry.createdAt);
  if (Number.isNaN(at.getTime())) return entry.createdAt.slice(0, 10);
  return partsIn(timezone, at).date;
}

/** 某一天画过的画,按创建时间从新到旧。 */
export function artsOnDate(entries: readonly ArtEntry[], timezone: string, date: string): ArtEntry[] {
  return entries
    .filter((entry) => artDate(entry, timezone) === date)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function findArt(entries: readonly ArtEntry[], id: string): ArtEntry | undefined {
  return entries.find((entry) => entry.id === id);
}

export function ratingLabel(rating: ArtRating): string {
  return RATING_LABELS[rating];
}

/** `HH:mm`,按部署时区。 */
export function artTime(entry: ArtEntry, timezone: string): string {
  const at = new Date(entry.createdAt);
  if (Number.isNaN(at.getTime())) return '';
  return partsIn(timezone, at).time;
}

/** 把一张画复制进 `<日记目录>/images/<日期>/`,返回相对日记目录的 Markdown 路径。 */
export function copyArtIntoDiary(entry: ArtEntry, diaryDir: string, date: string): string {
  const stat = lstatSync(entry.absPath);
  if (!stat.isFile()) throw new ArtError(`${entry.absPath} 不是普通文件,不能引用。`);
  if (stat.size > MAX_ART_BYTES) {
    throw new ArtError(`这张画有 ${Math.round(stat.size / 1024 / 1024)} MB,超过引用上限,没有复制。`);
  }
  const fileName = basename(entry.file);
  if (!fileName || fileName.startsWith('.')) throw new ArtError('这张画的文件名不能用,没有引用。');
  const dir = join(diaryDir, 'images', date);
  mkdirSync(dir, { recursive: true });
  const target = join(dir, fileName);
  if (!existsSync(target)) copyFileSync(entry.absPath, target);
  return `images/${date}/${fileName}`;
}

/** Markdown 图片行;alt 里的方括号与换行会破坏语法,统一压成空格。 */
export function markdownForArt(relativePath: string, subject: string): string {
  const alt = subject.replace(/[[\]\r\n]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || '画';
  return `![${alt}](${relativePath})`;
}

export function readArtBytes(entry: ArtEntry): { bytes: Uint8Array; mime: string; name: string } {
  const stat = lstatSync(entry.absPath);
  if (!stat.isFile()) throw new ArtError(`${entry.absPath} 不是普通文件。`);
  if (stat.size > MAX_ART_BYTES) throw new ArtError('这张画太大,没有读进附件。');
  return {
    bytes: new Uint8Array(readFileSync(entry.absPath)),
    mime: entry.mime,
    name: basename(entry.file),
  };
}
