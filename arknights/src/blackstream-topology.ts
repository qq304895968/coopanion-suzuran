/**
 * 黑流树海「截图 → 拓扑 → 地图」：把截图里读出的节点/连线归一化成以起点为 (0,0) 的格子图，
 * 丢掉不与起点连通的小地图，匹配已知地图构造，再用 BFS 算真实步数。
 *
 * 坐标约定：x 向右、y 向下，单位一格，起点 (0,0)。与游戏截图和路标档案馆的构造数据一致。
 *
 * 数据：`src/data/blackstream-topology.local.json` 由本机导入，不随包分发。
 * 来源：https://www.lubiao.wiki/tools/blackstream-route
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export type Cell = [number, number];
export type Edge = [Cell, Cell];

export interface TopologyConstruction {
  /** 构造编号，例如 F4-T07。 */
  template: string;
  /** 站点内部 id，仅用于去重/诊断。 */
  id: string;
  cols: number;
  rows: number;
  /** 起点格子 [x,y]。 */
  start: Cell;
  /** 险路尽头格子 [x,y]。 */
  ends: Cell[];
  /** 全部可通行格子。 */
  nodes: Cell[];
  edges: Edge[];
  /** 固定节点类型，键为 "x,y"。 */
  fixedNodes?: Record<string, string>;
  special?: boolean;
}

export interface TopologyFloor {
  floor: number;
  label: string;
  constructions: TopologyConstruction[];
}

export interface TopologyData {
  source: string;
  sourceUrl: string;
  notice?: string;
  updatedAt?: string;
  counts?: { constructions: number; floors: number; special: number };
  floors: TopologyFloor[];
  special: Array<{
    id: string;
    floors: number[];
    cols: number;
    rows: number;
    start: Cell;
    nodes: Cell[];
    edges: Edge[];
    portals: number[];
  }>;
}

export interface ScanNode {
  x: number;
  y: number;
  label?: string;
  type?: string;
}

export interface ScanInput {
  nodes: ScanNode[];
  edges?: Array<[number, number]>;
  start: number;
  floor?: number;
  /** 截图像素坐标时，一格多少像素；不传则按整数格/最近邻推断。 */
  unit?: number | { x: number; y: number };
  target?: { x: number; y: number; label?: string };
}

export interface DistanceInfo {
  x: number;
  y: number;
  distance: number;
  manhattan: number;
  path: Cell[];
}

export interface ScanCandidate {
  floor: number;
  template: string;
  score: number;
  nodeScore: number;
  edgeScore: number;
  matchedNodes: number;
  observedNodes: number;
  templateNodes: number;
}

export interface ScanResult {
  ok: boolean;
  reason?: string;
  /** 命中的层；失败时也可能给候选。 */
  floor?: number;
  template?: string;
  score?: number;
  confidence?: 'high' | 'medium';
  start?: { x: number; y: number };
  ends?: DistanceInfo[];
  target?: DistanceInfo;
  nodes?: Array<{ x: number; y: number; label?: string; type?: string }>;
  edges?: number;
  ignored?: { count: number; nodes: Array<{ x: number; y: number; label?: string }> };
  candidates?: ScanCandidate[];
  topology?: string;
  warning?: string;
}

export interface RecognitionText {
  text: string;
  failed?: true;
}

const DEFAULT_PATH = fileURLToPath(new URL('./data/blackstream-topology.local.json', import.meta.url));
let cache: { path: string; data?: TopologyData } | undefined;

/** 数据文件位置；测试用 `ARKNIGHTS_TOPOLOGY_DATA` 指向合成样本。 */
export function topologyPath(): string {
  return process.env.ARKNIGHTS_TOPOLOGY_DATA || DEFAULT_PATH;
}

export function topologyData(): TopologyData | undefined {
  const path = topologyPath();
  if (cache?.path === path) return cache.data;
  let data: TopologyData | undefined;
  try {
    data = JSON.parse(readFileSync(path, 'utf8')) as TopologyData;
  } catch {
    data = undefined;
  }
  cache = { path, data };
  return data;
}

export function hasTopologyData(): boolean {
  return topologyData() !== undefined;
}

export function topologySummary(): string | undefined {
  const data = topologyData();
  if (!data) return undefined;
  const n = data.counts?.constructions ?? data.floors.reduce((sum, floor) => sum + floor.constructions.length, 0);
  return `拓扑库：${n} 套地图构造，覆盖第 1–6 层（导入于 ${data.updatedAt?.slice(0, 10) ?? '—'}，来源：${data.source}）。`;
}

export function findFloor(floor: number): TopologyFloor | undefined {
  return topologyData()?.floors.find((entry) => entry.floor === floor);
}

export function findConstruction(floor: number, template: string): TopologyConstruction | undefined {
  const wanted = normalizeTemplate(template);
  return findFloor(floor)?.constructions.find((entry) => entry.template === wanted);
}

/** `F4-T07` / `4.7` / `4-7` 都认。 */
export function normalizeTemplate(input: string): string {
  const text = input.trim();
  const f = /^F(\d+)-T(\d+)$/i.exec(text);
  if (f) return `F${Number(f[1])}-T${String(Number(f[2])).padStart(2, '0')}`;
  const dashed = /^(\d+)[.\-](\d+)$/.exec(text);
  if (dashed) return `F${Number(dashed[1])}-T${String(Number(dashed[2])).padStart(2, '0')}`;
  return text.toUpperCase();
}

const key = (x: number, y: number): string => `${x},${y}`;
const edgeKey = (a: Cell, b: Cell): string => {
  const first = key(a[0], a[1]);
  const second = key(b[0], b[1]);
  return first < second ? `${first}|${second}` : `${second}|${first}`;
};
const round = (value: number): number => Math.round(value);

interface NormalizedNode {
  x: number;
  y: number;
  label?: string;
  type?: string;
  original: number[];
}

interface NormalizedGraph {
  nodes: NormalizedNode[];
  edges: Set<string>;
  /** 按归一化后的节点下标。 */
  adjacency: number[][];
  start: number;
  kept: Set<number>;
  ignored: number[];
  unitX: number;
  unitY: number;
}

function inferUnit(values: number[], fallback: number): number {
  if (values.length < 2) return fallback;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  if (span < 2) return fallback;
  const from = Math.max(2, span / 40);
  let bestUnit = fallback;
  let bestInliers = -1;
  // 截图里的像素中心会有几像素抖动，格距不一定正好等于某两个节点的差；
  // 直接按 0.5 像素扫一遍，取能让最多节点落回格点的周期。同样贴合时取更大的周期：
  // 只有两行节点时，半格 77 和整格 155 都能贴合，真正的一格是 155。
  for (let unit = from; unit <= span; unit += 0.5) {
    const tolerance = Math.max(1.5, unit * 0.06);
    let inliers = 0;
    for (const value of values) {
      const remainder = (((value - min) % unit) + unit) % unit;
      if (Math.min(remainder, unit - remainder) <= tolerance) inliers += 1;
    }
    if (inliers > bestInliers || (inliers === bestInliers && unit > bestUnit)) {
      bestUnit = unit;
      bestInliers = inliers;
    }
  }
  return Math.max(1, bestUnit);
}

function normalise(input: ScanInput): NormalizedGraph | { error: string } {
  const raw = input.nodes;
  if (!Array.isArray(raw) || raw.length === 0) return { error: '没有节点。' };
  if (!Number.isInteger(input.start) || input.start < 0 || input.start >= raw.length) {
    return { error: 'start 必须是节点数组里起点的下标。' };
  }

  const origin = raw[input.start]!;
  const unitX = typeof input.unit === 'number' ? input.unit : input.unit?.x;
  const unitY = typeof input.unit === 'number' ? input.unit : input.unit?.y;
  const rawX = raw.map((node) => node.x - origin.x);
  const rawY = raw.map((node) => node.y - origin.y);
  const allIntegers = rawX.every((value) => Math.abs(value - round(value)) < 1e-6)
    && rawY.every((value) => Math.abs(value - round(value)) < 1e-6);
  const span = Math.max(...rawX.map(Math.abs), ...rawY.map(Math.abs));
  const stepX = unitX && unitX > 0 ? unitX : allIntegers && span <= 60 ? 1 : inferUnit(rawX, 1);
  const stepY = unitY && unitY > 0 ? unitY : allIntegers && span <= 60 ? 1 : inferUnit(rawY, 1);

  const offGrid = rawX.filter((value, index) => {
    const x = value / stepX;
    const y = rawY[index]! / stepY;
    return Math.abs(x - round(x)) > 0.34 || Math.abs(y - round(y)) > 0.34;
  }).length;
  if (offGrid > Math.max(1, Math.floor(raw.length * 0.2))) {
    return { error: '节点坐标离格点太远，像是把像素坐标当成了格子。按「相邻节点差 1」的格子坐标重读，或给 unit/unitX/unitY（截图里一格多少像素）。' };
  }

  const nodes: NormalizedNode[] = [];
  const byCell = new Map<string, number>();
  const originalToNormalized = new Map<number, number>();
  for (let i = 0; i < raw.length; i += 1) {
    const node = raw[i]!;
    const x = round((node.x - origin.x) / stepX);
    const y = round((node.y - origin.y) / stepY);
    const cellKey = key(x, y);
    const existing = byCell.get(cellKey);
    if (existing !== undefined) {
      const target = nodes[existing]!;
      if (!target.label && (node.label || node.type)) target.label = node.label ?? node.type;
      originalToNormalized.set(i, existing);
      continue;
    }
    byCell.set(cellKey, nodes.length);
    originalToNormalized.set(i, nodes.length);
    nodes.push({ x, y, label: node.label ?? node.type, type: node.type, original: [node.x, node.y] });
  }

  const start = originalToNormalized.get(input.start);
  if (start === undefined) return { error: '起点节点没有落进图里。' };

  const edges = new Set<string>();
  const adjacency: number[][] = Array.from({ length: nodes.length }, () => []);
  const addEdge = (a: number, b: number) => {
    if (a === b || a < 0 || b < 0 || a >= nodes.length || b >= nodes.length) return;
    edges.add(edgeKey([nodes[a]!.x, nodes[a]!.y], [nodes[b]!.x, nodes[b]!.y]));
    if (!adjacency[a]!.includes(b)) adjacency[a]!.push(b);
    if (!adjacency[b]!.includes(a)) adjacency[b]!.push(a);
  };

  if (Array.isArray(input.edges) && input.edges.length) {
    for (const [from, to] of input.edges) {
      const a = originalToNormalized.get(from);
      const b = originalToNormalized.get(to);
      if (a !== undefined && b !== undefined) addEdge(a, b);
    }
  } else {
    // 截图里的小圆点也是格点；没有连线数据时，按上下左右相邻补齐。
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const dx = Math.abs(nodes[i]!.x - nodes[j]!.x);
        const dy = Math.abs(nodes[i]!.y - nodes[j]!.y);
        if (dx + dy === 1) addEdge(i, j);
      }
    }
  }

  const kept = new Set<number>();
  const queue = [start];
  kept.add(start);
  while (queue.length) {
    const current = queue.shift()!;
    for (const next of adjacency[current] ?? []) {
      if (kept.has(next)) continue;
      kept.add(next);
      queue.push(next);
    }
  }
  const ignored = nodes.map((_, index) => index).filter((index) => !kept.has(index));
  return { nodes, edges, adjacency, start, kept, ignored, unitX: stepX, unitY: stepY };
}

function bfs(adjacency: number[][], start: number): { dist: number[]; parent: number[] } {
  const dist = new Array<number>(adjacency.length).fill(-1);
  const parent = new Array<number>(adjacency.length).fill(-1);
  dist[start] = 0;
  const queue = [start];
  while (queue.length) {
    const current = queue.shift()!;
    for (const next of adjacency[current] ?? []) {
      if (dist[next] !== -1) continue;
      dist[next] = dist[current]! + 1;
      parent[next] = current;
      queue.push(next);
    }
  }
  return { dist, parent };
}

function pathTo(parent: number[], start: number, target: number, nodes: Cell[]): Cell[] {
  const out: Cell[] = [];
  let current = target;
  while (current !== -1 && current !== start) {
    out.push(nodes[current]!);
    current = parent[current]!;
  }
  out.push(nodes[start]!);
  return out.reverse();
}

interface TemplateGraph {
  floor: number;
  construction: TopologyConstruction;
  nodes: Cell[];
  edges: Set<string>;
  adjacency: number[][];
  index: Map<string, number>;
  start: number;
  ends: Array<{ cell: Cell; distance: number; path: Cell[] }>;
}

function templateGraph(floor: number, construction: TopologyConstruction): TemplateGraph {
  const nodes = construction.nodes.map(([x, y]) => [x, y] as Cell);
  const index = new Map<string, number>();
  nodes.forEach(([x, y], i) => index.set(key(x, y), i));
  const adjacency: number[][] = Array.from({ length: nodes.length }, () => []);
  const edges = new Set<string>();
  for (const [a, b] of construction.edges) {
    const from = index.get(key(a[0], a[1]));
    const to = index.get(key(b[0], b[1]));
    if (from === undefined || to === undefined || from === to) continue;
    edges.add(edgeKey(a, b));
    if (!adjacency[from]!.includes(to)) adjacency[from]!.push(to);
    if (!adjacency[to]!.includes(from)) adjacency[to]!.push(from);
  }
  const start = index.get(key(construction.start[0], construction.start[1]));
  if (start === undefined) throw new Error(`构造 ${construction.template} 的起点不在 nodes 里`);
  const { dist, parent } = bfs(adjacency, start);
  const ends = construction.ends.map((cell) => {
    const target = index.get(key(cell[0], cell[1]));
    if (target === undefined) throw new Error(`构造 ${construction.template} 的尽头不在 nodes 里`);
    return { cell, distance: dist[target]!, path: pathTo(parent, start, target, nodes) };
  });
  return { floor, construction, nodes, edges, adjacency, index, start, ends };
}

function relativeNodeSet(graph: TemplateGraph): Set<string> {
  const [sx, sy] = graph.construction.start;
  return new Set(graph.nodes.map(([x, y]) => key(x - sx, y - sy)));
}

function relativeEdgeSet(graph: TemplateGraph): Set<string> {
  const [sx, sy] = graph.construction.start;
  const out = new Set<string>();
  for (const [a, b] of graph.construction.edges) {
    out.add(edgeKey([a[0] - sx, a[1] - sy], [b[0] - sx, b[1] - sy]));
  }
  return out;
}

function scoreAgainst(
  graph: TemplateGraph,
  observedNodes: Set<string>,
  observedEdges: Set<string>,
  observedEnds: Set<string>,
): ScanCandidate {
  const templateNodes = relativeNodeSet(graph);
  const templateEdges = relativeEdgeSet(graph);
  let matchedNodes = 0;
  for (const cell of observedNodes) if (templateNodes.has(cell)) matchedNodes += 1;
  let matchedEdges = 0;
  for (const edge of observedEdges) if (templateEdges.has(edge)) matchedEdges += 1;

  const nodePrecision = observedNodes.size ? matchedNodes / observedNodes.size : 0;
  const nodeCoverage = templateNodes.size ? matchedNodes / templateNodes.size : 0;
  const nodeScore = nodePrecision + nodeCoverage ? (2 * nodePrecision * nodeCoverage) / (nodePrecision + nodeCoverage) : 0;
  const edgePrecision = observedEdges.size ? matchedEdges / observedEdges.size : 0;
  const edgeCoverage = templateEdges.size ? matchedEdges / templateEdges.size : 0;
  const edgeScore = edgePrecision + edgeCoverage ? (2 * edgePrecision * edgeCoverage) / (edgePrecision + edgeCoverage) : 0;
  const structural = templateEdges.size ? nodeScore * 0.62 + edgeScore * 0.38 : nodeScore;

  // 截图上能看到的「险路尽头」是强锚点：对不上就把整套构造压下去。
  let score = structural;
  if (observedEnds.size) {
    const templateEnds = new Set(
      graph.construction.ends.map(([x, y]) => key(x - graph.construction.start[0], y - graph.construction.start[1])),
    );
    let matchedEnds = 0;
    for (const cell of observedEnds) if (templateEnds.has(cell)) matchedEnds += 1;
    const endPrecision = matchedEnds / observedEnds.size;
    score = structural * 0.72 + endPrecision * 0.28;
    if (endPrecision < 0.5) score *= 0.6;
  }

  return {
    floor: graph.floor,
    template: graph.construction.template,
    score,
    nodeScore,
    edgeScore,
    matchedNodes,
    observedNodes: observedNodes.size,
    templateNodes: templateNodes.size,
  };
}

function candidatesFor(
  normalized: NormalizedGraph,
  floor: number | undefined,
): { candidates: ScanCandidate[]; graphs: Map<string, TemplateGraph> } {
  const data = topologyData();
  if (!data) return { candidates: [], graphs: new Map() };
  const observedNodes = new Set<string>();
  const observedEnds = new Set<string>();
  for (const index of normalized.kept) {
    const node = normalized.nodes[index]!;
    const cell = key(node.x, node.y);
    observedNodes.add(cell);
    if ((node.label ?? node.type ?? '').includes('尽头')) observedEnds.add(cell);
  }
  const observedEdges = new Set<string>();
  for (const edge of normalized.edges) {
    const [a, b] = edge.split('|');
    if (!a || !b) continue;
    const [ax, ay] = a.split(',').map(Number);
    const [bx, by] = b.split(',').map(Number);
    if (observedNodes.has(key(ax!, ay!)) && observedNodes.has(key(bx!, by!))) observedEdges.add(edge);
  }

  const candidates: ScanCandidate[] = [];
  const graphs = new Map<string, TemplateGraph>();
  for (const entry of data.floors) {
    if (floor !== undefined && entry.floor !== floor) continue;
    for (const construction of entry.constructions) {
      try {
        const graph = templateGraph(entry.floor, construction);
        graphs.set(`${entry.floor}:${construction.template}`, graph);
        candidates.push(scoreAgainst(graph, observedNodes, observedEdges, observedEnds));
      } catch {
        // 单套构造数据坏了不影响其它构造；导入脚本会在数据里留下原样。
      }
    }
  }
  candidates.sort((a, b) => b.score - a.score || a.template.localeCompare(b.template, 'en', { numeric: true }));
  return { candidates, graphs };
}

function renderTopology(
  nodes: Cell[],
  start: Cell,
  ends: Cell[],
  target?: Cell,
): string {
  if (!nodes.length) return '';
  const xs = nodes.map(([x]) => x);
  const ys = nodes.map(([, y]) => y);
  const minX = Math.min(...xs, start[0], ...ends.map(([x]) => x), target?.[0] ?? start[0]);
  const maxX = Math.max(...xs, start[0], ...ends.map(([x]) => x), target?.[0] ?? start[0]);
  const minY = Math.min(...ys, start[1], ...ends.map(([, y]) => y), target?.[1] ?? start[1]);
  const maxY = Math.max(...ys, start[1], ...ends.map(([, y]) => y), target?.[1] ?? start[1]);
  const occupied = new Set(nodes.map(([x, y]) => key(x, y)));
  const endSet = new Set(ends.map(([x, y]) => key(x, y)));
  const lines: string[] = [];
  const header: string[] = ['     '];
  for (let x = minX; x <= maxX; x += 1) header.push(String(x).padStart(3));
  lines.push(header.join(''));
  for (let y = minY; y <= maxY; y += 1) {
    const row: string[] = [String(y).padStart(3), ' '];
    for (let x = minX; x <= maxX; x += 1) {
      const cell = key(x, y);
      let mark = '·';
      if (occupied.has(cell)) mark = '#';
      if (endSet.has(cell)) mark = 'E';
      if (target && target[0] === x && target[1] === y) mark = '*';
      if (start[0] === x && start[1] === y) mark = 'S';
      row.push(mark.padStart(3));
    }
    lines.push(row.join(''));
  }
  lines.push('图例：S 起点　E 险路尽头　* 目标　# 节点　· 空格');
  return lines.join('\n');
}

function distanceInfo(graph: TemplateGraph, target: Cell): DistanceInfo | undefined {
  const index = graph.index.get(key(target[0], target[1]));
  if (index === undefined) return undefined;
  const { dist, parent } = bfs(graph.adjacency, graph.start);
  const distance = dist[index]!;
  if (distance < 0) return undefined;
  return {
    x: target[0] - graph.construction.start[0],
    y: target[1] - graph.construction.start[1],
    distance,
    manhattan: Math.abs(target[0] - graph.construction.start[0]) + Math.abs(target[1] - graph.construction.start[1]),
    path: pathTo(parent, graph.start, index, graph.nodes).map(([x, y]) => [
      x - graph.construction.start[0],
      y - graph.construction.start[1],
    ]),
  };
}

function nearestNodes(graph: TemplateGraph, target: Cell, limit = 3): Array<{ x: number; y: number; distance: number }> {
  const sx = graph.construction.start[0];
  const sy = graph.construction.start[1];
  const { dist } = bfs(graph.adjacency, graph.start);
  return graph.nodes
    .map(([x, y], index) => ({
      x: x - sx,
      y: y - sy,
      distance: dist[index]!,
      gap: Math.abs(x - target[0]) + Math.abs(y - target[1]),
    }))
    .filter((row) => row.distance >= 0)
    .sort((a, b) => a.gap - b.gap || a.distance - b.distance)
    .slice(0, limit)
    .map(({ x, y, distance }) => ({ x, y, distance }));
}

/** 标准构造的尽头位置，在截图里却被读成别的节点：提示可能是追忆/新图或读错。 */
function endConflicts(graph: TemplateGraph, normalized: NormalizedGraph): string[] {
  const [sx, sy] = graph.construction.start;
  const byCell = new Map<string, NormalizedNode>();
  for (const index of normalized.kept) {
    const node = normalized.nodes[index]!;
    byCell.set(key(node.x, node.y), node);
  }
  const conflicts: string[] = [];
  for (const end of graph.ends) {
    const relative: Cell = [end.cell[0] - sx, end.cell[1] - sy];
    const node = byCell.get(key(relative[0], relative[1]));
    const label = node?.label ?? node?.type;
    if (!label || label.includes('尽头')) continue;
    conflicts.push(`${formatCell(relative)} 读成「${label}」`);
  }
  return conflicts;
}

export function scanTopology(input: ScanInput): ScanResult {
  const data = topologyData();
  if (!data) {
    return {
      ok: false,
      reason: '本机还没导入地图拓扑数据。先跑 node scripts/import-topologies.mjs（或 corepack pnpm import:topologies），再识别截图。',
    };
  }
  const attemptFor = (startIndex: number) => {
    const graph = normalise({ ...input, start: startIndex });
    if ('error' in graph) return { error: graph.error };
    const matched = candidatesFor(graph, input.floor);
    return { normalized: graph, candidates: matched.candidates, graphs: matched.graphs, best: matched.candidates[0] };
  };

  let attempt = attemptFor(input.start);
  if ('error' in attempt) return { ok: false, reason: attempt.error };
  const initialNormalized = attempt.normalized;
  if (initialNormalized.kept.size < 3) {
    return {
      ok: false,
      reason: '与起点连通的节点太少（少于 3 个）。截图里的小圆点也是格点，请把整张主地图的节点都读出来；与主图不连通的部分不用管。',
      ignored: {
        count: initialNormalized.ignored.length,
        nodes: initialNormalized.ignored.map((index) => {
          const node = initialNormalized.nodes[index]!;
          return { x: node.x, y: node.y, label: node.label };
        }),
      },
    };
  }

  // 起点偶尔会被读偏一格（白色小人贴着节点，标的是旁边的小点）。初始匹配不到高置信时，
  // 换另一个节点当起点再试；只有明显更像、且非常贴合时才采用，并在回执里说明修正。
  let startCorrection: { fromIndex: number; toIndex: number; from: Cell; to: Cell } | undefined;
  const initialScore = attempt.best?.score ?? 0;
  if (initialScore < 0.82) {
    for (let index = 0; index < input.nodes.length; index += 1) {
      if (index === input.start) continue;
      const alt = attemptFor(index);
      if ('error' in alt || !alt.best) continue;
      if (alt.best.score < 0.9 || alt.best.score <= (attempt.best?.score ?? 0) + 0.06) continue;
      const from = input.nodes[input.start]!;
      const to = input.nodes[index]!;
      startCorrection = { fromIndex: input.start, toIndex: index, from: [from.x, from.y], to: [to.x, to.y] };
      attempt = alt;
    }
  }

  const { normalized, candidates, graphs } = attempt;
  const best = attempt.best;
  if (!best) return { ok: false, reason: input.floor ? `第 ${input.floor} 层没有可用的地图构造。` : '拓扑库里没有地图构造。' };

  const roundedScore = Number(best.score.toFixed(3));
  const confidence: ScanResult['confidence'] = best.score >= 0.82 ? 'high' : best.score >= 0.65 ? 'medium' : undefined;
  // 只有高置信才直接给尽头；中等置信说明读漏/截不全，给候选让人核对，不拿错误地图算距离。
  if (confidence !== 'high') {
    return {
      ok: false,
      reason: confidence
        ? `匹配度 ${(best.score * 100).toFixed(1)}%，还不能确定是哪张图，先不给尽头。最接近的是第 ${best.floor} 层 ${best.template}；补读漏掉的节点/连线，或把截图截全一点再试。`
        : `匹配度只有 ${(best.score * 100).toFixed(1)}%，还认不出是哪张图。最接近的是第 ${best.floor} 层 ${best.template}，请补读漏掉的节点/连线后再试。`,
      candidates: candidates.slice(0, 3),
      nodes: [...normalized.kept].map((index) => {
        const node = normalized.nodes[index]!;
        return { x: node.x, y: node.y, label: node.label, type: node.type };
      }),
      ignored: {
        count: normalized.ignored.length,
        nodes: normalized.ignored.map((index) => {
          const node = normalized.nodes[index]!;
          return { x: node.x, y: node.y, label: node.label };
        }),
      },
    };
  }

  const graph = graphs.get(`${best.floor}:${best.template}`);
  if (!graph) return { ok: false, reason: '内部错误：匹配到的构造读不出来。' };

  const ignoredNodes = normalized.ignored.map((index) => {
    const node = normalized.nodes[index]!;
    return { x: node.x, y: node.y, label: node.label };
  });

  const result: ScanResult = {
    ok: true,
    floor: best.floor,
    template: best.template,
    score: roundedScore,
    confidence,
    start: { x: 0, y: 0 },
    ends: graph.ends.map((end) => distanceInfo(graph, end.cell)!),
    nodes: [...normalized.kept].map((index) => {
      const node = normalized.nodes[index]!;
      return { x: node.x, y: node.y, label: node.label, type: node.type };
    }),
    edges: normalized.edges.size,
    ignored: { count: ignoredNodes.length, nodes: ignoredNodes },
    candidates: candidates.slice(0, 3),
    topology: renderTopology(
      graph.nodes.map(([x, y]) => [x - graph.construction.start[0], y - graph.construction.start[1]] as Cell),
      [0, 0],
      graph.ends.map((end) => [end.cell[0] - graph.construction.start[0], end.cell[1] - graph.construction.start[1]] as Cell),
    ),
  };
  if (startCorrection) {
    result.warning = [
      `截图起点（下标 ${startCorrection.fromIndex}，原坐标 ${formatCell(startCorrection.from)}）按拓扑对齐后应是下标 ${startCorrection.toIndex}（原坐标 ${formatCell(startCorrection.to)}）。`,
      '下面坐标以修正后的起点为 (0,0)，请对照截图核对。',
    ].join('');
  }

  const conflicts = endConflicts(graph, normalized);
  if (conflicts.length) {
    const warning = [
      `拓扑形状匹配 ${best.template}，但截图里有尽头位置读成了别的节点：${conflicts.join('；')}。`,
      '可能是追忆/新地图，或该节点读错了。下面按标准构造给尽头，使用前请对照截图核对。',
    ].join('');
    result.warning = [result.warning, warning].filter(Boolean).join(' ');
  }

  if (input.target) {
    const targetInput = startCorrection ? { ...input, start: startCorrection.toIndex } : input;
    const target = normaliseTarget(input.target, targetInput, normalized, graph);
    if ('error' in target) {
      result.warning = [result.warning, target.error].filter(Boolean).join(' ');
    } else {
      const info = distanceInfo(graph, target.cell);
      if (info) {
        result.target = info;
        result.topology = renderTopology(
          graph.nodes.map(([x, y]) => [x - graph.construction.start[0], y - graph.construction.start[1]] as Cell),
          [0, 0],
          graph.ends.map((end) => [end.cell[0] - graph.construction.start[0], end.cell[1] - graph.construction.start[1]] as Cell),
          [info.x, info.y],
        );
      } else {
        result.warning = [result.warning, `目标 ${formatCell(target.cell)} 不在 ${best.template} 的可通行格上。`].filter(Boolean).join(' ');
      }
    }
  }
  return result;
}

function normaliseTarget(
  target: { x: number; y: number; label?: string },
  input: ScanInput,
  normalized: NormalizedGraph,
  graph: TemplateGraph,
): { cell: Cell } | { error: string } {
  if (target.label) {
    const wanted = target.label.trim();
    const [sx, sy] = graph.construction.start;
    // 先按截图里读到的文字定位，再按构造数据里的固定节点类型定位。
    for (const index of normalized.kept) {
      const node = normalized.nodes[index]!;
      const label = node.label ?? node.type;
      if (!label || !(label.includes(wanted) || wanted.includes(label))) continue;
      const cell: Cell = [node.x + sx, node.y + sy];
      if (graph.index.has(key(cell[0], cell[1]))) return { cell };
    }
    const fixed = graph.nodes.find(([x, y]) => {
      const type = graph.construction.fixedNodes?.[key(x, y)];
      return type === wanted || type?.includes(wanted);
    });
    if (fixed) return { cell: fixed };
    const terminal = graph.construction.ends.find(([x, y]) => wanted.includes('尽头') && graph.index.has(key(x, y)));
    if (terminal) return { cell: terminal };
  }
  if (!Number.isFinite(target.x) || !Number.isFinite(target.y)) return { error: '目标坐标不是数字。' };
  const origin = input.nodes[input.start]!;
  const unitX = normalized.unitX;
  const unitY = normalized.unitY;
  const x = round((target.x - origin.x) / unitX) + graph.construction.start[0];
  const y = round((target.y - origin.y) / unitY) + graph.construction.start[1];
  if (graph.index.has(key(x, y))) return { cell: [x, y] };
  // 像素坐标四舍五入可能差一格：找最近的格点，但要求确实很近。
  const nearest = graph.nodes
    .map(([nx, ny]) => ({ cell: [nx, ny] as Cell, gap: Math.abs(nx - x) + Math.abs(ny - y) }))
    .sort((a, b) => a.gap - b.gap)[0];
  if (nearest && nearest.gap <= 1) return { cell: nearest.cell };
  return { error: `目标 ${formatCell([x - graph.construction.start[0], y - graph.construction.start[1]])} 不在这次识别出的地图上。` };
}

export function formatCell(cell: Cell): string {
  return `(${cell[0]},${cell[1]})`;
}

function formatPath(path: Cell[]): string {
  return path.map(formatCell).join(' → ');
}

export function formatScan(result: ScanResult): RecognitionText {
  if (!result.ok) {
    const lines = [`识别失败：${result.reason ?? '未知原因'}`];
    if (result.candidates?.length) {
      lines.push('最接近的构造：');
      for (const candidate of result.candidates) {
        lines.push(
          `- 第 ${candidate.floor} 层 ${candidate.template}：匹配 ${(candidate.score * 100).toFixed(1)}%（节点 ${candidate.matchedNodes}/${candidate.observedNodes}，模板共 ${candidate.templateNodes} 格）`,
        );
      }
    }
    if (result.ignored?.count) {
      lines.push(`另有 ${result.ignored.count} 个节点不与起点连通，按特殊地图忽略。`);
    }
    return { text: lines.join('\n'), failed: true };
  }

  const lines = [
    `识别为第 ${result.floor} 层 ${result.template}（匹配 ${(result.score! * 100).toFixed(1)}%，${result.confidence === 'high' ? '高置信' : '中等置信'}）。`,
    `起点 (0,0)；坐标 x 向右、y 向下，一格一步。`,
  ];
  if (result.warning) lines.push(`注意：${result.warning}`);
  lines.push(`尽头 ${result.ends?.length ?? 0} 个：`);
  for (const end of result.ends ?? []) {
    lines.push(`- ${formatCell([end.x, end.y])}：${end.distance} 步（曼哈顿 ${end.manhattan} 格）`);
  }
  if (result.target) {
    lines.push(
      `目标 ${formatCell([result.target.x, result.target.y])}：距起点 ${result.target.distance} 步（直线/坐标差 ${result.target.manhattan} 格，绕路 ${result.target.distance - result.target.manhattan} 格）。`,
      `路径：${formatPath(result.target.path)}`,
    );
  }
  if (result.ignored?.count) {
    lines.push(`特殊地图：${result.ignored.count} 个节点不与起点连通，已忽略（${result.ignored.nodes.slice(0, 6).map((node) => formatCell([node.x, node.y])).join('、')}${result.ignored.count > 6 ? '…' : ''}）。`);
  }
  if (result.topology) lines.push('拓扑：', result.topology);
  return { text: lines.join('\n') };
}

/** 已有识别结果时，单独算某个目标到起点的步数。 */
export function distanceOn(
  result: Pick<ScanResult, 'floor' | 'template'>,
  target: Cell,
): { text: string; failed?: true } {
  if (result.floor === undefined || !result.template) return { text: '还没有识别出的地图。先跑 arknights_blackstream_scan。', failed: true };
  const construction = findConstruction(result.floor, result.template);
  if (!construction) return { text: `找不到第 ${result.floor} 层 ${result.template} 的构造。`, failed: true };
  const graph = templateGraph(result.floor, construction);
  const [sx, sy] = construction.start;
  const absolute: Cell = [target[0] + sx, target[1] + sy];
  const info = distanceInfo(graph, absolute);
  if (!info) {
    const near = nearestNodes(graph, absolute);
    return {
      text: `${formatCell(target)} 不在 ${result.template} 的节点上。最近的节点：${near.map((node) => `${formatCell([node.x, node.y])}（${node.distance} 步）`).join('、')}。`,
      failed: true,
    };
  }
  return {
    text: [
      `第 ${result.floor} 层 ${result.template}：目标 ${formatCell([info.x, info.y])} 距起点 ${info.distance} 步（坐标差 ${info.manhattan} 格，绕路 ${info.distance - info.manhattan} 格）。`,
      `路径：${formatPath(info.path)}`,
    ].join('\n'),
  };
}

/** 按层/构造列出尽头；没有拓扑数据时返回 undefined。 */
export function describeEnds(floor: number, template?: string): { text: string; failed?: true } | undefined {
  if (!hasTopologyData()) return undefined;
  const entry = findFloor(floor);
  if (!entry) return { text: `第 ${floor} 层的拓扑还没导入。`, failed: true };
  if (!template) {
    const lines = [`第 ${floor} 层（${entry.label}）共有 ${entry.constructions.length} 套构造：`];
    for (const construction of entry.constructions) {
      const graph = templateGraph(floor, construction);
      const [sx, sy] = construction.start;
      const ends = graph.ends.map((end) => `${formatCell([end.cell[0] - sx, end.cell[1] - sy])}（${end.distance} 步）`).join('、');
      lines.push(`- ${construction.template}：起点 (0,0)，尽头 ${ends}`);
    }
    return { text: lines.join('\n') };
  }
  const construction = findConstruction(floor, template);
  if (!construction) {
    return {
      text: `第 ${floor} 层没有「${template}」这套构造。现有：${entry.constructions.map((item) => item.template).join('、')}。`,
      failed: true,
    };
  }
  const graph = templateGraph(floor, construction);
  const [sx, sy] = construction.start;
  const lines = [`第 ${floor} 层 ${construction.template}：起点 (0,0)；尽头 ${graph.ends.length} 个：`];
  for (const end of graph.ends) {
    lines.push(`- ${formatCell([end.cell[0] - sx, end.cell[1] - sy])}：${end.distance} 步，路径 ${formatPath(end.path.map(([x, y]) => [x - sx, y - sy]))}`);
  }
  const topology = renderTopology(
    graph.nodes.map(([x, y]) => [x - sx, y - sy] as Cell),
    [0, 0],
    graph.ends.map((end) => [end.cell[0] - sx, end.cell[1] - sy] as Cell),
  );
  lines.push('拓扑：', topology);
  return { text: lines.join('\n') };
}
