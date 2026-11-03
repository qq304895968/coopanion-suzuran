import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ToolCallContext } from 'cortico/core/types.ts';
import { fakeWorldContext } from 'cortico/extensions/dry-mount.ts';
import { ARKNIGHTS } from '../src/definition.ts';
import { ArknightsWorld } from '../src/world.ts';
import { FakeHost } from './helpers/fake-host.ts';

const FIXTURE = fileURLToPath(new URL('./fixtures/blackstream.json', import.meta.url));
const call = {} as ToolCallContext;

beforeAll(() => {
  process.env.ARKNIGHTS_BLACKSTREAM_DATA = FIXTURE;
});
afterAll(() => {
  delete process.env.ARKNIGHTS_BLACKSTREAM_DATA;
});

function makeWorld() {
  const scratchDir = mkdtempSync(join(tmpdir(), 'arknights-proactive-'));
  const ctx = fakeWorldContext(ARKNIGHTS, { scratchDir });
  const world = ARKNIGHTS.create(ctx) as ArknightsWorld;
  return { world, ctx, scratchDir };
}

async function run(world: ArknightsWorld, name: string, args: Record<string, unknown> = {}) {
  const tool = world.tools().find((item) => item.name === name);
  if (!tool) throw new Error(`tool ${name} missing`);
  const result = await tool.handler(args, call);
  return typeof result === 'string' ? { text: result, failed: false } : { text: result.text, failed: Boolean(result.failed) };
}

describe('主动性', () => {
  it('更新进展时直接给建议，不用再问', async () => {
    const { world, scratchDir } = makeWorld();
    await run(world, 'arknights_run_start', { theme: 'black', squad: '后勤分队' });
    const updated = await run(world, 'arknights_run_update', { node: '商店' });

    expect(updated.text).toContain('当前节点：商店');
    expect(updated.text).toContain('先别急着买');
    expect(updated.text).toContain('这一层的节点构成');
    rmSync(scratchDir, { recursive: true, force: true });
  });

  it('商店候选按稀有度和当前资源排序', async () => {
    const { world, scratchDir } = makeWorld();
    await run(world, 'arknights_run_start', { theme: 'black' });
    await run(world, 'arknights_run_update', { life: 1 });

    const ranked = await run(world, 'arknights_shop_advise', { offers: ['测试藏品A', '测试藏品B'] });
    expect(ranked.failed).toBe(false);
    expect(ranked.text.indexOf('测试藏品B')).toBeLessThan(ranked.text.indexOf('测试藏品A'));
    expect(ranked.text).toContain('超稀有');
    rmSync(scratchDir, { recursive: true, force: true });
  });

  it('超过设定时间没更新就主动催一次，且不连续刷屏', async () => {
    const { world, scratchDir } = makeWorld();
    const host = new FakeHost();
    await world.start(host);
    await run(world, 'arknights_run_start', { theme: 'black' });

    const later = Date.now() + 4 * 60_000;
    expect(await world.checkNudge(later)).toBe(true);
    const nudge = host.events.find((event) => event.type === 'arknights.nudge');
    expect(nudge?.text).toContain('分钟没更新');
    expect(nudge?.text).toContain('第 1 层');

    expect(await world.checkNudge(later + 1_000)).toBe(false);
    await world.stop();
    rmSync(scratchDir, { recursive: true, force: true });
  });

  it('关掉 proactive 后不再催', async () => {
    const { world, ctx, scratchDir } = makeWorld();
    const host = new FakeHost();
    await world.start(host);
    await run(world, 'arknights_run_start', { theme: 'black' });
    ctx.cfg.proactive = false;

    expect(await world.checkNudge(Date.now() + 10 * 60_000)).toBe(false);
    expect(host.events.some((event) => event.type === 'arknights.nudge')).toBe(false);

    await world.stop();
    rmSync(scratchDir, { recursive: true, force: true });
  });
});
