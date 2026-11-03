import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ToolCallContext } from 'cortico/core/types.ts';
import { fakeWorldContext } from 'cortico/extensions/dry-mount.ts';
import { ARKNIGHTS } from '../src/definition.ts';
import { scanTopology, distanceOn, describeEnds } from '../src/blackstream-topology.ts';
import { ArknightsWorld } from '../src/world.ts';

const FIXTURE = fileURLToPath(new URL('./fixtures/blackstream-topology.json', import.meta.url));
const call = {} as ToolCallContext;

beforeAll(() => {
  process.env.ARKNIGHTS_TOPOLOGY_DATA = FIXTURE;
});
afterAll(() => {
  delete process.env.ARKNIGHTS_TOPOLOGY_DATA;
});

/** F1-T02：起点在 (0,0)，到 (3,0) 要绕 5 步，坐标差只有 3。 */
const DETOUR = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 2, y: 1 },
  { x: 3, y: 1 },
  { x: 3, y: 0 },
  { x: 0, y: 1 },
];

const DETOUR_EDGES: Array<[number, number]> = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
  [0, 6],
];

function makeWorld() {
  const scratchDir = mkdtempSync(join(tmpdir(), 'arknights-topology-'));
  const world = ARKNIGHTS.create(fakeWorldContext(ARKNIGHTS, { scratchDir })) as ArknightsWorld;
  return { world, scratchDir };
}

async function run(world: ArknightsWorld, name: string, args: Record<string, unknown>) {
  const tool = world.tools().find((item) => item.name === name);
  if (!tool) throw new Error(`tool ${name} missing`);
  const result = await tool.handler(args, call);
  return typeof result === 'string' ? { text: result, failed: false } : { text: result.text, failed: Boolean(result.failed) };
}

describe('黑流树海截图拓扑', () => {
  it('把起点归一成 (0,0)，认出构造并给出全部尽头', () => {
    const result = scanTopology({ nodes: DETOUR, edges: DETOUR_EDGES, start: 0, floor: 1 });
    expect(result.ok).toBe(true);
    expect(result.template).toBe('F1-T02');
    expect(result.score).toBe(1);
    expect(result.start).toEqual({ x: 0, y: 0 });
    expect(result.ends?.map((end) => [end.x, end.y])).toEqual([
      [3, 0],
      [0, 1],
    ]);
    expect(result.ends?.find((end) => end.x === 3)?.distance).toBe(5);
  });

  it('目标距离按结构算：到 (3,0) 是 5 步，不是坐标差的 3 步', () => {
    const result = scanTopology({ nodes: DETOUR, edges: DETOUR_EDGES, start: 0, target: { x: 3, y: 0 } });
    expect(result.ok).toBe(true);
    expect(result.target?.distance).toBe(5);
    expect(result.target?.manhattan).toBe(3);
    expect(result.target?.path).toHaveLength(6);
    expect(result.target?.path[0]).toEqual([0, 0]);
    expect(result.target?.path.at(-1)).toEqual([3, 0]);
  });

  it('不连通的小地图默认是特殊地图：丢掉，不参与匹配和距离', () => {
    const nodes = [
      ...DETOUR,
      { x: 6, y: 0 },
      { x: 7, y: 0 },
      { x: 8, y: 0 },
    ];
    const result = scanTopology({ nodes, edges: DETOUR_EDGES, start: 0, floor: 1 });
    expect(result.ok).toBe(true);
    expect(result.template).toBe('F1-T02');
    expect(result.ignored?.count).toBe(3);
    expect(result.ignored?.nodes.map((node) => [node.x, node.y])).toEqual([
      [6, 0],
      [7, 0],
      [8, 0],
    ]);
  });

  it('没有连线时按上下左右相邻自动补，小圆点不会被漏成断路', () => {
    const result = scanTopology({ nodes: DETOUR, start: 0, floor: 1 });
    expect(result.ok).toBe(true);
    expect(result.template).toBe('F1-T02');
  });

  it('截图像素坐标可以按 unit 折算成格子', () => {
    const pixels = DETOUR.map((node) => ({ x: node.x * 150 + 37, y: node.y * 150 + 91 }));
    const result = scanTopology({ nodes: pixels, edges: DETOUR_EDGES, start: 0, unit: 150, floor: 1, target: { x: 487, y: 91 } });
    expect(result.ok).toBe(true);
    expect(result.template).toBe('F1-T02');
    expect(result.target?.distance).toBe(5);
  });

  it('少读几个节点也能按剩下的结构认出地图，并说明匹配度', () => {
    // 只读到起点、第一段和两个拐点，目标/尽头还没读出来。
    const result = scanTopology({
      nodes: DETOUR.slice(0, 4),
      edges: DETOUR_EDGES.slice(0, 3),
      start: 0,
      floor: 1,
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('不能确定');
    expect(result.candidates?.[0]?.template).toBe('F1-T02');
    expect(result.candidates?.[0]?.score).toBeGreaterThan(0.65);
  });

  it('构造的尽头距离与路径可直接查，不依赖截图', () => {
    const described = describeEnds(1, 'F1-T02')!;
    expect(described.failed).toBeUndefined();
    expect(described.text).toContain('(3,0)');
    expect(described.text).toContain('5 步');
    expect(described.text).toContain('路径');
    expect(described.text).toContain('S');
  });

  it('识别后可以用 distance 工具追问目标，不必重发整张图', async () => {
    const { world, scratchDir } = makeWorld();
    const scanned = await run(world, 'arknights_blackstream_scan', {
      nodes: DETOUR,
      edges: DETOUR_EDGES,
      start: 0,
      floor: 1,
    });
    expect(scanned.failed).toBe(false);
    expect(scanned.text).toContain('F1-T02');
    expect(scanned.text).toContain('尽头');

    const distance = await run(world, 'arknights_blackstream_distance', { x: 3, y: 0 });
    expect(distance.failed).toBe(false);
    expect(distance.text).toContain('5 步');
    expect(distance.text).toContain('绕路 2 格');
    rmSync(scratchDir, { recursive: true, force: true });
  });

  it('起点被读偏一格时，按拓扑对齐修正并在回执里说明', () => {
    const result = scanTopology({ nodes: DETOUR, edges: DETOUR_EDGES, start: 1, floor: 1 });
    expect(result.ok).toBe(true);
    expect(result.template).toBe('F1-T02');
    expect(result.warning).toContain('按拓扑对齐');
    expect(result.start).toEqual({ x: 0, y: 0 });
  });

  it('构造的尽头位置在截图里读成别的节点时，照样给尽头但明确警告', () => {
    const nodes = DETOUR.map((node) => ({ ...node, label: node.x === 3 && node.y === 0 ? '商店' : undefined }));
    const result = scanTopology({ nodes, edges: DETOUR_EDGES, start: 0, floor: 1 });
    expect(result.ok).toBe(true);
    expect(result.template).toBe('F1-T02');
    expect(result.warning).toContain('尽头位置读成了别的节点');
    expect(result.warning).toContain('(3,0)');
  });

  it('没有拓扑数据时明确回报，不编地图', async () => {
    const previous = process.env.ARKNIGHTS_TOPOLOGY_DATA;
    process.env.ARKNIGHTS_TOPOLOGY_DATA = join(tmpdir(), 'missing-topology.json');
    const result = scanTopology({ nodes: DETOUR, start: 0 });
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('导入');
    process.env.ARKNIGHTS_TOPOLOGY_DATA = previous;
  });

  it('distanceOn 拒绝不在地图上的坐标，并给出最近节点', () => {
    const result = distanceOn({ floor: 1, template: 'F1-T02' }, [9, 9]);
    expect(result.failed).toBe(true);
    expect(result.text).toContain('最近');
  });
});
