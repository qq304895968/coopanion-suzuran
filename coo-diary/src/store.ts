/**
 * 日记目录的读写:时区换算、日期校验、路径落点、追加、读取、列出。
 * 只碰 `<dir>/YYYY-MM-DD.md`,只追加,不覆盖、不删除、不改名。
 */
import { appendFileSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';

export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** 单篇正文上限:模型一次写爆文件时挡在边界上。 */
export const MAX_BODY_CHARS = 20_000;
/** 单个日记文件读取上限,超过就不读。 */
export const MAX_FILE_BYTES = 4 * 1024 * 1024;
/** 排序之后最多读取多少个日记文件；不能在按日期排序前截断文件名。 */
export const MAX_SCAN_FILES = 400;

/** 目录或参数不能用;message 原样进工具回执。 */
export class DiaryError extends Error {
  override readonly name = 'DiaryError';
}

export interface ClockParts {
  /** `YYYY-MM-DD`,按部署时区。 */
  date: string;
  /** `HH:mm`,按部署时区。 */
  time: string;
  /** 「星期二」。 */
  weekday: string;
}

const dateFormatters = new Map<string, Intl.DateTimeFormat>();
const weekdayFormatters = new Map<string, Intl.DateTimeFormat>();

function dateFormatter(timezone: string): Intl.DateTimeFormat {
  let formatter = dateFormatters.get(timezone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    dateFormatters.set(timezone, formatter);
  }
  return formatter;
}

function weekdayFormatter(timezone: string): Intl.DateTimeFormat {
  let formatter = weekdayFormatters.get(timezone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('zh-CN', { timeZone: timezone, weekday: 'long' });
    weekdayFormatters.set(timezone, formatter);
  }
  return formatter;
}

/** 部署时区里的日期与时刻;`at` 缺省是此刻。 */
export function partsIn(timezone: string, at: Date = new Date()): ClockParts {
  const parts = dateFormatter(timezone).formatToParts(at);
  const pickPart = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? '';
  return {
    date: `${pickPart('year')}-${pickPart('month')}-${pickPart('day')}`,
    time: `${pickPart('hour')}:${pickPart('minute')}`,
    weekday: weekdayFormatter(timezone).format(at),
  };
}

/**
 * `date` 已经是部署时区的日历日期，不能再当作 UTC 时刻转换时区。
 * 保留 timezone 参数以兼容调用方；按 UTC 格式化只是为了固定这个日历日期。
 */
export function weekdayIn(_timezone: string, date: string): string {
  if (!isRealDate(date)) throw new DiaryError('日期要写成 YYYY-MM-DD 的真实日期。');
  return weekdayFormatter('UTC').format(new Date(`${date}T00:00:00Z`));
}

/** `YYYY-MM-DD` 且是真实存在的一天。 */
export function isRealDate(date: string): boolean {
  if (!DATE_PATTERN.test(date)) return false;
  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  const probe = new Date(Date.UTC(year, month - 1, day));
  return probe.getUTCFullYear() === year && probe.getUTCMonth() === month - 1 && probe.getUTCDate() === day;
}

/** 配置里的目录;空、非绝对路径都拒绝,原因写进 message。 */
export function diaryRoot(dir: string): string {
  const trimmed = dir.trim();
  if (!trimmed) throw new DiaryError('日记目录还没设置。请在 Coopanion 的「日记」设置里填一个目录。');
  if (!isAbsolute(trimmed)) {
    throw new DiaryError(`日记目录要填绝对路径,现在是「${trimmed}」。`);
  }
  return resolve(trimmed);
}

/** 某一天的日记文件;日期不合法或拼出的路径不在目录里时拒绝。 */
export function entryPath(dir: string, date: string): string {
  const root = diaryRoot(dir);
  if (!isRealDate(date)) {
    throw new DiaryError(`日期要写成 YYYY-MM-DD 的真实日期,收到「${date}」。`);
  }
  const file = resolve(root, `${date}.md`);
  if (relative(root, file) !== `${date}.md`) {
    throw new DiaryError('拼出来的文件不在日记目录里,没有写。');
  }
  return file;
}

function readText(file: string): string {
  const stat = lstatSync(file);
  if (!stat.isFile()) throw new DiaryError(`${file} 不是普通文件,不读。`);
  if (stat.size > MAX_FILE_BYTES) {
    throw new DiaryError(`这个日记文件有 ${Math.round(stat.size / 1024)} KB,超过 ${MAX_FILE_BYTES / 1024 / 1024} MB,没有读。`);
  }
  return readFileSync(file, 'utf8');
}

/** `## ` 起头的小节数,即这一天写了几篇。 */
export function countEntries(text: string): number {
  let count = 0;
  for (const line of text.split('\n')) if (line.startsWith('## ')) count += 1;
  return count;
}

/** 正文字数:不算标题行与空白。 */
export function bodyChars(text: string): number {
  let count = 0;
  for (const line of text.split('\n')) {
    if (line.startsWith('#')) continue;
    for (const char of line) if (!/\s/.test(char)) count += 1;
  }
  return count;
}

/** 当天文件的内容;没有这个文件时返回 null。 */
export function readEntry(dir: string, date: string): string | null {
  const file = entryPath(dir, date);
  if (!existsSync(file)) return null;
  return readText(file);
}

export interface AppendInput {
  dir: string;
  date: string;
  /** 新建文件时日期标题里的星期,由调用方按部署时区算好。 */
  weekday: string;
  /** `HH:mm`,或「补记」这类不含时刻的标题。 */
  stamp: string;
  mood?: string;
  body: string;
}

export interface AppendResult {
  /** 写进去的文件的绝对路径。 */
  file: string;
  /** 这是这一天的第几篇。 */
  index: number;
}

/** 把一篇日记追加到当天的文件末尾;文件是新建时先写日期标题。 */
export function appendEntry(input: AppendInput): AppendResult {
  const body = input.body.replace(/\r\n/g, '\n').trim();
  if (!body) throw new DiaryError('正文是空的,没有写。');
  if (body.length > MAX_BODY_CHARS) {
    throw new DiaryError(`正文有 ${body.length} 字,超过单篇上限 ${MAX_BODY_CHARS} 字,没有写。`);
  }
  const mood = input.mood?.replace(/\s+/g, ' ').trim() ?? '';
  if (mood.length > 40) throw new DiaryError('心情最多 40 个字。');

  const file = entryPath(input.dir, input.date);
  const root = diaryRoot(input.dir);
  mkdirSync(root, { recursive: true });

  const existing = existsSync(file) ? readText(file) : '';
  const heading = mood ? `## ${input.stamp} · ${mood}` : `## ${input.stamp}`;
  const section = `${heading}\n\n${body}\n\n`;
  const head = existing === ''
    ? `# ${input.date} ${input.weekday}\n\n`
    : existing.endsWith('\n\n') ? '' : existing.endsWith('\n') ? '\n' : '\n\n';

  appendFileSync(file, head + section, 'utf8');
  return { file, index: countEntries(existing) + 1 };
}

export interface ListOptions {
  from?: string;
  to?: string;
  limit: number;
}

export interface EntrySummary {
  date: string;
  entries: number;
  chars: number;
}

/** 目录里有日记的日子,按日期从新到旧。 */
export function listEntries(dir: string, options: ListOptions): EntrySummary[] {
  const root = diaryRoot(dir);
  if (!existsSync(root)) return [];

  const from = options.from && isRealDate(options.from) ? options.from : undefined;
  const to = options.to && isRealDate(options.to) ? options.to : undefined;

  const dates: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    // 普通目录/符号链接不能挤掉可读的日记；readText 仍会再次检查文件类型。
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
    const date = entry.name.slice(0, -3);
    if (!isRealDate(date)) continue;
    if (from && date < from) continue;
    if (to && date > to) continue;
    dates.push(date);
  }
  dates.sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));

  const summaries: EntrySummary[] = [];
  const limit = Math.max(0, Math.min(MAX_SCAN_FILES, Math.trunc(options.limit) || 0));
  for (const date of dates.slice(0, MAX_SCAN_FILES)) {
    if (summaries.length >= limit) break;
    let text = '';
    try {
      text = readText(entryPath(root, date));
    } catch {
      continue;
    }
    summaries.push({ date, entries: countEntries(text), chars: bodyChars(text) });
  }
  return summaries;
}
