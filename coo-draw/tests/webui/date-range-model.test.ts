import { describe, expect, it } from 'vitest';
import {
  clickRangeDay,
  containsDay,
  dayEndExclusiveValue,
  dayStartValue,
  formatDate,
  formatDisplay,
  monthCells,
  normalize,
  parseDate,
  previewRange,
  quickRange,
  sameDay,
  startOfDay,
  type DateRange,
} from '../../src/webui/parts/date-range-model.ts';

const day = (y: number, m: number, d: number): Date => new Date(y, m - 1, d);

describe('日期范围状态机', () => {
  it('第一次点击只记起点，不产生终点', () => {
    const first = clickRangeDay({ start: null, end: null }, day(2026, 11, 5));
    expect(formatDate(first.start!)).toBe('2026-11-05');
    expect(first.end).toBeNull();
  });

  it('第二次点击补终点，且不会清空起点', () => {
    const a = clickRangeDay({ start: null, end: null }, day(2026, 11, 5));
    const b = clickRangeDay(a, day(2026, 11, 12));
    expect(formatDate(b.start!)).toBe('2026-11-05');
    expect(formatDate(b.end!)).toBe('2026-11-12');
  });

  it('第二次点击早于起点时自动反转', () => {
    const a = clickRangeDay({ start: null, end: null }, day(2026, 11, 12));
    const b = clickRangeDay(a, day(2026, 11, 5));
    expect(formatDate(b.start!)).toBe('2026-11-05');
    expect(formatDate(b.end!)).toBe('2026-11-12');
  });

  it('同一天点两次得到单日范围', () => {
    const a = clickRangeDay({ start: null, end: null }, day(2026, 11, 5));
    const b = clickRangeDay(a, day(2026, 11, 5));
    expect(formatDate(b.start!)).toBe('2026-11-05');
    expect(formatDate(b.end!)).toBe('2026-11-05');
  });

  it('范围已完成后再点，重新从新起点开始', () => {
    const complete: DateRange = { start: day(2026, 11, 1), end: day(2026, 11, 3) };
    const next = clickRangeDay(complete, day(2026, 11, 20));
    expect(formatDate(next.start!)).toBe('2026-11-20');
    expect(next.end).toBeNull();
  });

  it('不修改传入的状态对象', () => {
    const original: DateRange = { start: day(2026, 11, 1), end: null };
    clickRangeDay(original, day(2026, 11, 9));
    expect(original.end).toBeNull();
  });
});

describe('范围预览与包含判断', () => {
  it('只选起点时按悬浮日期生成预览区间（含反向悬浮）', () => {
    const draft: DateRange = { start: day(2026, 11, 10), end: null };
    const forward = previewRange(draft, day(2026, 11, 14))!;
    expect(formatDate(forward.from)).toBe('2026-11-10');
    expect(formatDate(forward.to)).toBe('2026-11-14');

    const backward = previewRange(draft, day(2026, 11, 4))!;
    expect(formatDate(backward.from)).toBe('2026-11-04');
    expect(formatDate(backward.to)).toBe('2026-11-10');
  });

  it('终点已选或没有悬浮时不产生预览', () => {
    expect(previewRange({ start: day(2026, 11, 1), end: day(2026, 11, 3) }, day(2026, 11, 5))).toBeNull();
    expect(previewRange({ start: day(2026, 11, 1), end: null }, null)).toBeNull();
    expect(previewRange({ start: null, end: null }, day(2026, 11, 5))).toBeNull();
  });

  it('包含判断按天粒度，边界日都算在范围内', () => {
    const range: DateRange = { start: day(2026, 11, 5), end: day(2026, 11, 8) };
    expect(containsDay(range, day(2026, 11, 4))).toBe(false);
    expect(containsDay(range, day(2026, 11, 5))).toBe(true);
    expect(containsDay(range, day(2026, 11, 8))).toBe(true);
    expect(containsDay(range, new Date(2026, 10, 8, 23, 59, 59))).toBe(true);
    expect(containsDay(range, day(2026, 11, 9))).toBe(false);
  });

  it('未选全的范围归一化为 null', () => {
    expect(normalize({ start: day(2026, 11, 5), end: null })).toBeNull();
    expect(normalize({ start: null, end: null })).toBeNull();
  });
});

describe('快捷区间', () => {
  const now = day(2026, 11, 5);

  it('今天 / 近 7 天 / 近 30 天 / 近 90 天', () => {
    const today = quickRange('today', now);
    expect(formatDate(today.start!)).toBe('2026-11-05');
    expect(formatDate(today.end!)).toBe('2026-11-05');

    expect(formatDate(quickRange('7days', now).start!)).toBe('2026-10-30');
    expect(formatDate(quickRange('30days', now).start!)).toBe('2026-10-07');
    expect(formatDate(quickRange('90days', now).start!)).toBe('2026-08-08');
  });

  it('本月覆盖整月，跨年也正确', () => {
    const thisMonth = quickRange('month', day(2026, 2, 14));
    expect(formatDate(thisMonth.start!)).toBe('2026-02-01');
    expect(formatDate(thisMonth.end!)).toBe('2026-02-28');
  });

  it('全部表示清空', () => {
    const all = quickRange('all', now);
    expect(all.start).toBeNull();
    expect(all.end).toBeNull();
  });
});

describe('月历网格', () => {
  it('固定 6×7，跨月补位标记正确', () => {
    const cells = monthCells(2026, 10); // 2026 年 11 月
    expect(cells).toHaveLength(42);
    expect(cells[0]!.date.getDay()).toBe(0);
    const inside = cells.filter((c) => !c.outside);
    expect(inside).toHaveLength(30);
    expect(formatDate(inside[0]!.date)).toBe('2026-11-01');
    expect(formatDate(inside.at(-1)!.date)).toBe('2026-11-30');
  });

  it('跨年月份也能连续排列', () => {
    const cells = monthCells(2026, 0); // 2026 年 1 月
    const insideDates = cells.filter((c) => !c.outside).map((c) => formatDate(c.date));
    expect(insideDates[0]).toBe('2026-01-01');
    expect(insideDates.at(-1)).toBe('2026-01-31');
  });
});

describe('日期格式与解析', () => {
  it('格式化使用本地日期，不受 UTC 偏移影响', () => {
    expect(formatDate(day(2026, 11, 5))).toBe('2026-11-05');
    expect(formatDisplay(day(2026, 11, 5))).toBe('2026/11/05');
    expect(sameDay(new Date(2026, 10, 5, 23, 59), day(2026, 11, 5))).toBe(true);
  });

  it('严格解析，拒绝非法日期', () => {
    expect(formatDate(parseDate('2026-11-05')!)).toBe('2026-11-05');
    expect(parseDate('2026-02-31')).toBeNull();
    expect(parseDate('2026-13-01')).toBeNull();
    expect(parseDate('2026/11/05')).toBeNull();
    expect(parseDate('')).toBeNull();
  });

  it('筛选边界用本地零点，右边界为次日零点', () => {
    const d = new Date(2026, 10, 5, 18, 30);
    expect(dayStartValue(d)).toBe(new Date(2026, 10, 5, 0, 0, 0, 0).getTime());
    expect(dayEndExclusiveValue(d)).toBe(new Date(2026, 10, 6, 0, 0, 0, 0).getTime());
    expect(startOfDay(d).getHours()).toBe(0);
  });
});
