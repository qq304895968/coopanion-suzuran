/**
 * 和「看一眼」的深刻瞬间联动。
 *
 * 看一眼插件把评分达标的截图存进 `<dataDir>/coo-screen/moments.json` 与 `moments/`。
 * 日记只读这份索引:按日期挑瞬间、把截图复制进 `<日记目录>/images/<日期>/`,再写进正文。
 */
import { copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync } from 'node:fs';
import { basename, isAbsolute, join, relative, resolve } from 'node:path';
import { partsIn } from './store.ts';

const INDEX_FILE = 'moments.json';
const MAX_INDEX_BYTES = 5 * 1024 * 1024;
const MAX_MOMENT_BYTES = 25 * 1024 * 1024;
const MAX_INDEX_ENTRIES = 2000;

export class MomentError extends Error {
  override readonly name = 'MomentError';
}

export interface ScreenMoment {
  id: string;
  createdAt: string;
  file: string;
  absPath: string;
  width: number;
  height: number;
  monitor: string;
  score: number;
  summary: string;
  note?: string;
  memorable: boolean;
}

function isInside(root: string, target: string): boolean {
  const rel = relative(root, target);
  return rel !== '' && !rel.startsWith('..') && !isAbsolute(rel);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** 深刻瞬间的根目录;没有 dataDir 时返回 null。 */
export function momentRoot(dataDir: string | undefined): string | null {
  return dataDir ? join(dataDir, 'coo-screen') : null;
}

/**
 * 读「看一眼」留下的深刻瞬间。坏条目、文件丢了、路径越界的都跳过;
 * 索引不存在时返回空数组。
 */
export function loadMoments(dataDir: string | undefined): ScreenMoment[] {
  const root = momentRoot(dataDir);
  if (!root) return [];
  const indexFile = join(root, INDEX_FILE);
  if (!existsSync(indexFile)) return [];
  const stat = lstatSync(indexFile);
  if (!stat.isFile()) throw new MomentError(`${indexFile} 不是普通文件,不读。`);
  if (stat.size > MAX_INDEX_BYTES) throw new MomentError('深刻瞬间索引太大,不读。');
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(indexFile, 'utf8'));
  } catch (error) {
    throw new MomentError(`深刻瞬间索引读不了:${error instanceof Error ? error.message : String(error)}`);
  }
  if (!isPlainObject(parsed) || !Array.isArray(parsed.moments)) return [];

  const moments: ScreenMoment[] = [];
  for (const raw of parsed.moments.slice(0, MAX_INDEX_ENTRIES)) {
    if (!isPlainObject(raw)) continue;
    const { id, createdAt, file, score, summary, memorable } = raw;
    if (typeof id !== 'string' || !id) continue;
    if (typeof createdAt !== 'string' || !createdAt) continue;
    if (Number.isNaN(new Date(createdAt).getTime())) continue;
    if (typeof file !== 'string' || !file) continue;
    if (typeof score !== 'number' || !Number.isFinite(score)) continue;
    if (memorable !== true) continue;
    const absPath = resolve(root, file);
    if (!isInside(root, absPath) || !existsSync(absPath)) continue;
    try {
      if (!lstatSync(absPath).isFile()) continue;
    } catch {
      continue;
    }
    moments.push({
      id,
      createdAt,
      file,
      absPath,
      width: typeof raw.width === 'number' ? raw.width : 0,
      height: typeof raw.height === 'number' ? raw.height : 0,
      monitor: typeof raw.monitor === 'string' ? raw.monitor : '',
      score,
      summary: typeof summary === 'string' ? summary : '',
      ...(typeof raw.note === 'string' && raw.note ? { note: raw.note } : {}),
      memorable: true,
    });
  }
  return moments;
}

/** 某一天的深刻瞬间,按时间从新到旧。 */
export function momentsOnDate(moments: readonly ScreenMoment[], timezone: string, date: string): ScreenMoment[] {
  return moments
    .filter((moment) => partsIn(timezone, new Date(moment.createdAt)).date === date)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function findMoment(moments: readonly ScreenMoment[], id: string): ScreenMoment | undefined {
  return moments.find((moment) => moment.id === id);
}

/** `HH:mm`,按部署时区。 */
export function momentTime(moment: ScreenMoment, timezone: string): string {
  return partsIn(timezone, new Date(moment.createdAt)).time;
}

function altText(summary: string): string {
  return summary.replace(/[[\]\r\n]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || '深刻瞬间';
}

/** 把截图复制进 `<日记目录>/images/<日期>/`,文件名加 `moment-` 前缀,避免和画撞名。 */
export function copyMomentIntoDiary(moment: ScreenMoment, diaryDir: string, date: string): string {
  const stat = lstatSync(moment.absPath);
  if (!stat.isFile()) throw new MomentError(`${moment.absPath} 不是普通文件,不能引用。`);
  if (stat.size > MAX_MOMENT_BYTES) {
    throw new MomentError('这张截图太大,没有复制进日记。');
  }
  const fileName = `moment-${basename(moment.file)}`;
  const dir = join(diaryDir, 'images', date);
  mkdirSync(dir, { recursive: true });
  const target = join(dir, fileName);
  if (!existsSync(target)) copyFileSync(moment.absPath, target);
  return `images/${date}/${fileName}`;
}

/** 日记里的「深刻瞬间」块:一句摘要加一张当时的屏幕。 */
export function momentBlock(moment: ScreenMoment, relativePath: string): string {
  const summary = moment.summary.trim() || '（没有写摘要）';
  return `> 深刻瞬间 ${moment.score}/10:${summary}\n\n![${altText(summary)}](${relativePath})`;
}

export function readMomentBytes(moment: ScreenMoment): { bytes: Uint8Array; mime: string; name: string } {
  const stat = lstatSync(moment.absPath);
  if (!stat.isFile()) throw new MomentError(`${moment.absPath} 不是普通文件。`);
  if (stat.size > MAX_MOMENT_BYTES) throw new MomentError('这张截图太大,没有读进附件。');
  return {
    bytes: new Uint8Array(readFileSync(moment.absPath)),
    mime: 'image/png',
    name: `moment-${basename(moment.file)}`,
  };
}
