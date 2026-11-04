import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ToolOutcome } from 'cortico/core/types.ts';
import { SCREEN_DEFAULTS } from '../src/config.ts';
import { clockIn } from '../src/schedule.ts';
import { MomentStore } from '../src/moments.ts';
import { ScreenWorld } from '../src/world.ts';

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lw5G9QAAAABJRU5ErkJggg==',
  'base64',
);
const TZ = 'Asia/Shanghai';
const today = (): string => clockIn(TZ).date;

let root: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'coo-screen-moments-'));
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

function store(): MomentStore {
  return new MomentStore(join(root, 'coo-screen'), TZ);
}

function world(): ScreenWorld {
  return new ScreenWorld({
    cfg: { ...SCREEN_DEFAULTS, enabled: true, memorableScore: 8, hotkey: '' },
    timezone: TZ,
    dataDir: root,
  });
}

async function call(w: ScreenWorld, name: string, args: Record<string, unknown>): Promise<ToolOutcome> {
  const tool = w.tools().find((item) => item.name === name);
  if (!tool) throw new Error(`missing ${name}`);
  const result = await tool.handler(args, {} as never);
  return typeof result === 'string' ? { text: result } : result;
}

describe('MomentStore', () => {
  it('达到阈值留下图,没达到就删掉', () => {
    const s = store();
    const high = s.save(PNG, { source: 'hotkey', width: 1, height: 1, monitor: '主显示器' })!;
    expect(existsSync(s.pathOf(high))).toBe(true);
    const kept = s.rate(high.id, 9, '他做成了一件事', 8)!;
    expect(kept.memorable).toBe(true);
    expect(s.list({ date: today(), memorableOnly: true }).map((m) => m.id)).toEqual([high.id]);

    const low = s.save(PNG, { source: 'proactive', width: 1, height: 1, monitor: '主显示器' })!;
    const dropped = s.rate(low.id, 5, '普通的工具界面', 8)!;
    expect(dropped.memorable).toBe(false);
    expect(existsSync(s.pathOf(low))).toBe(false);
    expect(s.get(low.id)).toBeUndefined();
  });

  it('默认取最近一张未评分,评分后不再出现', () => {
    const s = store();
    const first = s.save(PNG, { source: 'tool', width: 1, height: 1, monitor: '屏' })!;
    const second = s.save(PNG, { source: 'tool', width: 1, height: 1, monitor: '屏' })!;
    expect(s.latestUnrated()?.id).toBe(second.id);
    s.rate(second.id, 6, '一般', 8);
    expect(s.latestUnrated()?.id).toBe(first.id);
  });
});

describe('screen_rate / screen_memories', () => {
  it('评分达到阈值后,深刻瞬间能被回想并带图', async () => {
    const s = store();
    const moment = s.save(PNG, { source: 'hotkey', width: 1, height: 1, monitor: '主显示器' })!;
    const w = world();
    const rated = await call(w, 'screen_rate', {
      id: moment.id,
      score: 9,
      summary: '他终于在游戏里通关了',
    });
    expect(rated.failed).toBeUndefined();
    expect(rated.text).toContain('深刻瞬间');
    expect(rated.text).toContain(moment.id);

    const memories = await call(w, 'screen_memories', { date: today() });
    expect(memories.failed).toBeUndefined();
    expect(memories.text).toContain('他终于在游戏里通关了');
    expect(memories.text).toContain('9/10');
    expect(memories.blobs?.length).toBe(1);
  });

  it('低于阈值不留下,也不进日记', async () => {
    const s = store();
    const moment = s.save(PNG, { source: 'proactive', width: 1, height: 1, monitor: '屏' })!;
    const w = world();
    const rated = await call(w, 'screen_rate', {
      id: moment.id,
      score: 6,
      summary: '只是在看网页',
    });
    expect(rated.text).toContain('还不到深刻瞬间');
    const memories = await call(w, 'screen_memories', { date: today() });
    expect(memories.text).toContain('还没有印象深刻的瞬间');
    expect(memories.blobs).toBeUndefined();
  });

  it('缺少 summary、分数越界、未知 id 都拒绝', async () => {
    const w = world();
    expect((await call(w, 'screen_rate', { score: 9, summary: ' ' })).failed).toBe(true);
    expect((await call(w, 'screen_rate', { score: 11, summary: '太高' })).failed).toBe(true);
    expect((await call(w, 'screen_rate', { id: 'm-nope', score: 9, summary: '不存在' })).failed).toBe(true);
  });
});
