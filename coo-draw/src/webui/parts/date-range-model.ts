/**
 * 日期范围选择器的纯状态机与日期工具（不含 DOM，便于单测）。
 *
 * 交互规范（第七/八轮验收）：
 * - 第一次点击只记起点，不关闭面板；
 * - 第二次点击记终点，若早于起点则自动反转，仍不关闭；
 * - 只有点「确定」才把 [start, end] 写回筛选条件；「取消」丢弃本次草稿。
 */

export interface DateRange {
  start: Date | null;
  end: Date | null;
}

export interface DateBounds {
  from: Date;
  to: Date;
}

export type QuickRangeKey = 'today' | '7days' | '30days' | '90days' | 'month' | 'all';

export const EMPTY_RANGE: DateRange = { start: null, end: null };

/** 当天 00:00 的本地时间副本（不修改入参）。 */
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function isComplete(range: DateRange): boolean {
  return range.start !== null && range.end !== null;
}

/**
 * 点击某一天后的新草稿。
 * - 空：记起点；
 * - 只有起点：记终点，必要时反转；
 * - 已完整：视为重新开始，只留新起点。
 */
export function clickRangeDay(range: DateRange, day: Date): DateRange {
  const picked = startOfDay(day);
  if (!range.start) return { start: picked, end: null };
  if (!range.end) {
    const start = startOfDay(range.start);
    return picked.getTime() >= start.getTime()
      ? { start, end: picked }
      : { start: picked, end: start };
  }
  return { start: picked, end: null };
}

/** 归一化后的闭区间；未选全返回 null。 */
export function normalize(range: DateRange): DateBounds | null {
  if (!range.start || !range.end) return null;
  const a = startOfDay(range.start);
  const b = startOfDay(range.end);
  return a.getTime() <= b.getTime() ? { from: a, to: b } : { from: b, to: a };
}

export function containsDay(range: DateRange, day: Date): boolean {
  const bounds = normalize(range);
  if (!bounds) return false;
  const t = startOfDay(day).getTime();
  return t >= bounds.from.getTime() && t <= bounds.to.getTime();
}

/** 起点已选、终点未选时的悬浮预览区间。 */
export function previewRange(range: DateRange, hover: Date | null): DateBounds | null {
  if (!range.start || range.end || !hover) return null;
  return normalize({ start: range.start, end: hover });
}

/** 左侧快捷项；`now` 只取日期部分。 */
export function quickRange(key: QuickRangeKey, now: Date): DateRange {
  const today = startOfDay(now);
  const daysAgo = (days: number): Date => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    d.setDate(d.getDate() - days);
    return d;
  };
  switch (key) {
    case 'today':
      return { start: new Date(today), end: new Date(today) };
    case '7days':
      return { start: daysAgo(6), end: new Date(today) };
    case '30days':
      return { start: daysAgo(29), end: new Date(today) };
    case '90days':
      return { start: daysAgo(89), end: new Date(today) };
    case 'month':
      return {
        start: new Date(today.getFullYear(), today.getMonth(), 1),
        end: new Date(today.getFullYear(), today.getMonth() + 1, 0),
      };
    case 'all':
    default:
      return { start: null, end: null };
  }
}

export interface MonthCell {
  date: Date;
  outside: boolean;
}

/** 固定 6×7 网格（周日起），跨月补位。 */
export function monthCells(year: number, month: number): MonthCell[] {
  const first = new Date(year, month, 1);
  const lead = first.getDay();
  const cells: MonthCell[] = [];
  for (let i = 0; i < 42; i += 1) {
    const date = new Date(year, month, 1 - lead + i);
    cells.push({ date, outside: date.getMonth() !== month });
  }
  return cells;
}

const pad = (n: number): string => String(n).padStart(2, '0');

/** `YYYY-MM-DD`（本地日期，不用 toISOString 以免时区偏移）。 */
export function formatDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** `YYYY/MM/DD` 展示格式。 */
export function formatDisplay(date: Date): string {
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())}`;
}

/** 严格解析 `YYYY-MM-DD`，非法或溢出（如 2026-02-31）返回 null。 */
export function parseDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

/** 本地当天 00:00 的时间戳，用于历史记录筛选。 */
export function dayStartValue(value: Date): number {
  return startOfDay(value).getTime();
}

/** 本地次日 00:00 的时间戳（右开区间），避免漏掉当天较晚的作品。 */
export function dayEndExclusiveValue(value: Date): number {
  const d = startOfDay(value);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
}
