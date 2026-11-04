import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ToolCallContext } from 'cortico/core/types.ts';
import { dryMountWorld, fakeWorldContext } from 'cortico/extensions/dry-mount.ts';
import { ARKNIGHTS } from '../src/definition.ts';
import { ArknightsWorld } from '../src/world.ts';
import { FakeHost } from './helpers/fake-host.ts';

const call = {} as ToolCallContext;

let scratchDir: string;
beforeEach(() => {
  scratchDir = mkdtempSync(join(tmpdir(), 'arknights-world-'));
});
afterEach(() => rmSync(scratchDir, { recursive: true, force: true }));

function makeWorld(dir = scratchDir) {
  const ctx = fakeWorldContext(ARKNIGHTS, { scratchDir: dir });
  const world = ARKNIGHTS.create(ctx) as ArknightsWorld;
  return { world, ctx };
}

function tool(world: ArknightsWorld, name: string) {
  const found = world.tools().find((item) => item.name === name);
  if (!found) throw new Error(`tool ${name} missing`);
  return found;
}

async function run(world: ArknightsWorld, name: string, args: Record<string, unknown> = {}) {
  const result = await tool(world, name).handler(args, call);
  return typeof result === 'string' ? result : result.text;
}

describe('arknights World', () => {
  it('干装载不报失败：装载器会接受它', async () => {
    const report = await dryMountWorld(ARKNIGHTS, { scratchDir });
    expect(report.failures).toEqual([]);
  });

  it('挂载时投一条 arknights.mounted 事件，origin 是 internal', async () => {
    const { world } = makeWorld();
    const host = new FakeHost();
    await world.start(host);
    expect(host.events.map((event) => event.type)).toEqual(['arknights.mounted']);
    expect(host.events[0]?.origin).toBe('internal');
    await world.stop();
  });

  it('arknights_operator 返回干员的技能与天赋，查不到时给出相近名字', async () => {
    const { world } = makeWorld();
    const sheet = await run(world, 'arknights_operator', { name: '银灰' });
    expect(sheet).toContain('银灰');
    expect(sheet).toContain('真银斩');
    expect(sheet).toContain('天赋：');
    expect(sheet).toContain('prts.wiki');

    const fuzzy = await run(world, 'arknights_operator', { name: '银' });
    expect(fuzzy).toMatch(/相近|银灰/);

    const missing = (await tool(world, 'arknights_operator').handler({ name: '不存在的干员' }, call)) as {
      text: string;
      failed?: boolean;
    };
    expect(missing.failed).toBe(true);
  });

  it('arknights_kb_search 能查到主题与思路', async () => {
    const { world } = makeWorld();
    const themes = await run(world, 'arknights_kb_search', { query: '傀影', kind: 'theme' });
    expect(themes).toContain('傀影与猩红孤钻');

    const tips = await run(world, 'arknights_kb_search', { query: '希望', kind: 'tip' });
    expect(tips).toContain('希望');
  });

  it('开一局、更新、结束：账本与事件都对得上', async () => {
    const { world } = makeWorld();
    const host = new FakeHost();
    await world.start(host);

    const started = await run(world, 'arknights_run_start', {
      theme: '傀影与猩红孤钻',
      squad: '后勤分队',
      difficulty: '难度3',
    });
    expect(started).toContain('傀影与猩红孤钻');

    const updated = await run(world, 'arknights_run_update', {
      floor: 2,
      life: 7,
      hope: 3,
      addOperators: ['银灰', '夜莺'],
      note: '漏了个飞行单位',
    });
    expect(updated).toContain('第 2 层');
    expect(updated).toContain('银灰、夜莺');

    const status = await run(world, 'arknights_run_status');
    expect(status).toContain('生命 7');
    expect(status).toContain('备注：漏了个飞行单位');

    const advice = await run(world, 'arknights_run_advice');
    expect(advice).toContain('第 2 层');
    expect(advice).toContain('建议：');

    const ended = await run(world, 'arknights_run_end', { outcome: 'failed', summary: '第二层翻了' });
    expect(ended).toContain('累计 1 局');
    expect(ended).toContain('通关率 0%');

    expect(host.events.map((event) => event.type)).toEqual([
      'arknights.mounted',
      'arknights.run_started',
      'arknights.run_progress',
      'arknights.run_ended',
    ]);

    expect(await run(world, 'arknights_run_status')).toContain('没有进行中的对局');
    const history = await run(world, 'arknights_run_history', { limit: 5 });
    expect(history).toContain('失败');
    expect(history).toContain('第二层翻了');
    await world.stop();
  });

  it('没有进行中的对局时，更新与结束给失败回执', async () => {
    const { world } = makeWorld();
    const update = (await tool(world, 'arknights_run_update').handler({ floor: 3 }, call)) as {
      text: string;
      failed?: boolean;
    };
    expect(update.failed).toBe(true);
    expect(update.text).toContain('arknights_run_start');

    const end = (await tool(world, 'arknights_run_end').handler({ outcome: 'cleared' }, call)) as {
      text: string;
      failed?: boolean;
    };
    expect(end.failed).toBe(true);
  });

  it('账本跨实例持久化：重启后还能读到当前局与战绩', async () => {
    const first = makeWorld();
    await run(first.world, 'arknights_run_start', { theme: '水月与深蓝之树' });
    await run(first.world, 'arknights_run_update', { floor: 3, ingots: 12 });

    const second = makeWorld();
    const status = await run(second.world, 'arknights_run_status');
    expect(status).toContain('水月与深蓝之树');
    expect(status).toContain('第 3 层');
    expect(status).toContain('源石锭 12');
  });

  it('关掉主动吐槽后照样记账，只是不推对局事件', async () => {
    const { world, ctx } = makeWorld();
    ctx.cfg.commentary = false;
    const host = new FakeHost();
    await world.start(host);
    await run(world, 'arknights_run_start', { theme: 'sami' });
    await run(world, 'arknights_run_update', { floor: 2 });

    expect(host.events.map((event) => event.type)).toEqual(['arknights.mounted']);
    expect(await run(world, 'arknights_run_status')).toContain('探索者的银凇止境');
    await world.stop();
  });

  it('提醒到点后推事件并从盘上删掉', async () => {
    const { world } = makeWorld();
    const host = new FakeHost();
    await world.start(host);

    const past = new Date(Date.now() - 60_000).toISOString();
    const added = await run(world, 'arknights_remind', { action: 'add', text: '该看基建了', at: past });
    expect(added).toContain('该看基建了');

    const due = await world.checkReminders();
    expect(due).toHaveLength(1);
    expect(host.events.map((event) => event.type)).toContain('arknights.reminder');
    expect(host.events.at(-1)?.text).toContain('该看基建了');

    expect(await run(world, 'arknights_remind', { action: 'list' })).toContain('没有待触发的提醒');
    await world.stop();
  });

  it('maxHistory 热改后立刻决定保留几局', async () => {
    const { world, ctx } = makeWorld();
    ctx.cfg.maxHistory = 1;

    for (const theme of ['phantom', 'mizuki']) {
      await run(world, 'arknights_run_start', { theme });
      await run(world, 'arknights_run_end', { outcome: 'cleared' });
    }

    const history = await run(world, 'arknights_run_history', { limit: 10 });
    expect(history).toContain('累计 1 局');
  });
});
