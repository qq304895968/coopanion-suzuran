import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ToolCallContext } from 'cortico/core/types.ts';
import { fakeWorldContext } from 'cortico/extensions/dry-mount.ts';
import { ARKNIGHTS } from '../src/definition.ts';
import {
  describeFloor,
  findItem,
  formatPool,
  hasBlackstreamData,
  nodeTypeAtDistance,
  nodeTypeShare,
  poolsWithItem,
  searchPools,
} from '../src/blackstream.ts';
import { ArknightsWorld } from '../src/world.ts';

const FIXTURE = fileURLToPath(new URL('./fixtures/blackstream.json', import.meta.url));
const call = {} as ToolCallContext;

beforeAll(() => {
  process.env.ARKNIGHTS_BLACKSTREAM_DATA = FIXTURE;
});
afterAll(() => {
  delete process.env.ARKNIGHTS_BLACKSTREAM_DATA;
});

function makeWorld() {
  const scratchDir = mkdtempSync(join(tmpdir(), 'arknights-blackstream-'));
  const world = ARKNIGHTS.create(fakeWorldContext(ARKNIGHTS, { scratchDir })) as ArknightsWorld;
  return { world, scratchDir };
}

async function run(world: ArknightsWorld, name: string, args: Record<string, unknown>) {
  const tool = world.tools().find((item) => item.name === name);
  if (!tool) throw new Error(`tool ${name} missing`);
  const result = await tool.handler(args, call);
  return typeof result === 'string' ? { text: result, failed: false } : { text: result.text, failed: Boolean(result.failed) };
}

describe('黑流树海资料', () => {
  it('读到本地数据，能描述一层的地图结构', () => {
    expect(hasBlackstreamData()).toBe(true);
    const text = describeFloor(1)!;
    expect(text).toContain('测试区');
    expect(text).toContain('F1-T01');
    expect(text).toContain('60.0%');
  });

  it('节点分布按样本归一，按距离也给概率', () => {
    const share = nodeTypeShare('1');
    expect(share.map((row) => row.name)).toEqual(['作战', '不期而遇']);
    expect(share[0]?.share).toBeCloseTo(0.5, 5);

    const atOne = nodeTypeAtDistance('1', 1);
    expect(atOne[0]?.name).toBe('作战');
    expect(atOne[0]?.probability).toBeCloseTo(0.75, 5);
  });

  it('藏品池能按池名查，也能反查某件藏品属于哪些池', () => {
    const pools = searchPools('测试');
    expect(pools).toHaveLength(1);
    expect(formatPool(pools[0]!)).toContain('测试藏品A');

    const item = findItem('测试藏品A')!;
    expect(item.effect).toBe('效果A');
    expect(poolsWithItem(item.id).map((pool) => pool.name)).toEqual(['测试池']);
  });

  it('三个工具都能用，且推测会标明是推测', async () => {
    const { world, scratchDir } = makeWorld();

    const map = await run(world, 'arknights_blackstream_map', { floor: 1 });
    expect(map.failed).toBe(false);
    expect(map.text).toContain('测试区');
    expect(map.text).toContain('路标档案馆');

    const pool = await run(world, 'arknights_blackstream_pool', { query: '测试藏品A' });
    expect(pool.text).toContain('效果A');
    expect(pool.text).toContain('测试池');

    const predict = await run(world, 'arknights_blackstream_predict', { floor: 1, distance: 1 });
    expect(predict.text).toContain('75.0%');
    expect(predict.text).toContain('推测');

    rmSync(scratchDir, { recursive: true, force: true });
  });

  it('能反查某类节点出现在哪些距离', async () => {
    const { world, scratchDir } = makeWorld();
    const byNode = await run(world, 'arknights_blackstream_predict', { floor: 1, node: '作战' });
    expect(byNode.failed).toBe(false);
    expect(byNode.text).toContain('距离 1：30 次');
    expect(byNode.text).toContain('距离 2：10 次');

    const missing = await run(world, 'arknights_blackstream_predict', { floor: 1, node: '不存在的节点' });
    expect(missing.failed).toBe(true);
    expect(missing.text).toContain('作战');

    rmSync(scratchDir, { recursive: true, force: true });
  });

  it('没有导入数据时，工具回报「还没导入」而不是编数据', async () => {
    const { world, scratchDir } = makeWorld();
    const previous = process.env.ARKNIGHTS_BLACKSTREAM_DATA;
    process.env.ARKNIGHTS_BLACKSTREAM_DATA = join(scratchDir, 'missing.json');

    const map = await run(world, 'arknights_blackstream_map', { floor: 1 });
    expect(map.failed).toBe(true);
    expect(map.text).toContain('导入');

    process.env.ARKNIGHTS_BLACKSTREAM_DATA = previous;
    rmSync(scratchDir, { recursive: true, force: true });
  });
});
