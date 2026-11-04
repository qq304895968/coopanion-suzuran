import { describe, expect, it } from 'vitest';
import { clockIn, inQuietHours, parseQuietHours, shouldGlance, type GlanceState } from '../src/schedule.ts';

describe('clockIn', () => {
  it('reads the wall clock in the deployment timezone', () => {
    const at = new Date('2026-10-28T15:41:10+08:00');
    expect(clockIn('Asia/Shanghai', at)).toEqual({ date: '2026-10-28', minutes: 941, time: '15:41' });
    expect(clockIn('UTC', at)).toEqual({ date: '2026-10-28', minutes: 461, time: '07:41' });
  });
});

describe('quiet hours', () => {
  it('parses both shapes', () => {
    expect(parseQuietHours('23:00-08:00')).toEqual({ start: 1380, end: 480 });
    expect(parseQuietHours('12:00-14:00')).toEqual({ start: 720, end: 840 });
    expect(parseQuietHours('')).toBeNull();
    expect(parseQuietHours('25:00-08:00')).toBeNull();
    expect(parseQuietHours('23:00')).toBeNull();
  });

  it('wraps past midnight', () => {
    const night = parseQuietHours('23:00-08:00');
    expect(inQuietHours(night, 23 * 60 + 30)).toBe(true);
    expect(inQuietHours(night, 2 * 60)).toBe(true);
    expect(inQuietHours(night, 12 * 60)).toBe(false);
    expect(inQuietHours(null, 12 * 60)).toBe(false);
  });
});

describe('shouldGlance', () => {
  const base: GlanceState = {
    enabled: true,
    ready: true,
    modelBusy: false,
    todayCount: 0,
    dailyQuota: 6,
    nowMs: 1_000_000_000,
    lastGlanceMs: 0,
    lastShotMs: 0,
    everyMinutes: 20,
    idleMs: 5_000,
    maxIdleMs: 180_000,
    quiet: false,
  };

  it('goes ahead when everything lines up', () => {
    expect(shouldGlance(base)).toEqual({ ok: true });
  });

  it('stops for each reason it should', () => {
    const cases: Array<[Partial<GlanceState>, RegExp]> = [
      [{ enabled: false }, /没开/],
      [{ ready: false }, /侧车没就绪/],
      [{ modelBusy: true }, /模型正在跑/],
      [{ quiet: true }, /安静时段/],
      [{ todayCount: 6 }, /次数用完/],
      [{ lastGlanceMs: base.nowMs - 5 * 60_000 }, /还不够 20 分钟/],
      [{ lastShotMs: base.nowMs - 60_000 }, /十分钟内刚看过/],
      [{ idleMs: 10 * 60_000 }, /可能不在/],
    ];
    for (const [patch, reason] of cases) {
      const decision = shouldGlance({ ...base, ...patch });
      expect(decision.ok).toBe(false);
      if (!decision.ok) expect(decision.reason).toMatch(reason);
    }
  });

  it('lets the interval pass', () => {
    expect(shouldGlance({ ...base, lastGlanceMs: base.nowMs - 21 * 60_000 })).toEqual({ ok: true });
  });
});
