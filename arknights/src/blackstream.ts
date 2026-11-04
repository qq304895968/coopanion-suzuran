/**
 * 黑流树海（集成战略 #6）资料：地图结构、藏品池、节点推测。
 *
 * 数据不在包里：由 `scripts/import-blackstream.mjs` 从路标档案馆导入到
 * `src/data/blackstream.local.json`（gitignore、npm files 排除）。没有导入时，
 * 相关工具回报「未导入」而不是给假数据。
 * 来源：https://www.lubiao.wiki/tools/blackstream-route
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export interface BlackstreamItem {
  id: string;
  name: string;
  dataType?: string;
  rarity?: string;
  category?: string;
  effect?: string;
  description?: string;
}

export interface BlackstreamPool {
  id: string;
  name: string;
  count: number;
  items: string[];
}

export interface BlackstreamFloor {
  floor: number;
  name: string;
  zoneId?: string;
  zoneName?: string;
  description?: string;
  stageIds: string[];
  bossStageId?: string;
}

export interface NodeDistanceRow {
  name: string;
  counts: Record<string, number>;
}

export interface NodeDistanceFloor {
  id: string;
  label: string;
  mapSampleCount: number;
  sampleCount: number;
  rows: NodeDistanceRow[];
}

export interface MapConstructionFloor {
  id: string;
  label: string;
  sampleCount: number;
  rows: Array<{ templateId: string; count: number; frequency: number }>;
}

export interface BlackstreamData {
  source: string;
  sourceUrl: string;
  notice?: string;
  importedAt: string;
  siteUpdatedAt?: string;
  counts: { items: number; pools: number; floors: number };
  floors: BlackstreamFloor[];
  nodeDistance: NodeDistanceFloor[];
  mapConstructions: MapConstructionFloor[];
  items: BlackstreamItem[];
  pools: BlackstreamPool[];
}

const DEFAULT_PATH = fileURLToPath(new URL('./data/blackstream.local.json', import.meta.url));

let cache: { path: string; data?: BlackstreamData } | undefined;

/** 数据文件位置；测试用 `ARKNIGHTS_BLACKSTREAM_DATA` 指向合成样本。 */
export function blackstreamPath(): string {
  return process.env.ARKNIGHTS_BLACKSTREAM_DATA || DEFAULT_PATH;
}

export function blackstream(): BlackstreamData | undefined {
  const path = blackstreamPath();
  if (cache?.path === path) return cache.data;
  let data: BlackstreamData | undefined;
  try {
    data = JSON.parse(readFileSync(path, 'utf8')) as BlackstreamData;
  } catch {
    data = undefined;
  }
  cache = { path, data };
  return data;
}

export function hasBlackstreamData(): boolean {
  return blackstream() !== undefined;
}

const RARITY: Record<string, string> = {
  SUPER_RARE: '超稀有',
  RARE: '稀有',
  NORMAL: '普通',
};

function rarityLabel(value: string | undefined): string {
  if (!value) return '';
  return RARITY[value] ?? value;
}

export function findFloor(value: string | number): BlackstreamFloor | undefined {
  const data = blackstream();
  if (!data) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) return undefined;
  return data.floors.find((floor) => floor.floor === n);
}

export function floorLabel(floor: BlackstreamFloor): string {
  const dist = blackstream()?.nodeDistance.find((entry) => Number(entry.id) === floor.floor);
  return dist ? `${floor.name}（${dist.label}）` : floor.name;
}

/** 这一层的地图结构：区域、说明、关卡、常见地图模板。 */
export function describeFloor(value: string | number, templateLimit = 5): string | undefined {
  const data = blackstream();
  const floor = findFloor(value);
  if (!data || !floor) return undefined;
  const lines = [
    `${floorLabel(floor)}：${floor.zoneName ?? '—'}`,
    floor.description ? `说明：${floor.description}` : '说明：—',
    `关卡：${floor.stageIds.length} 个${floor.bossStageId ? `（首领 ${floor.bossStageId}）` : ''}`,
  ];
  const constructions = data.mapConstructions.find((entry) => Number(entry.id) === floor.floor);
  if (constructions?.rows.length) {
    const top = [...constructions.rows].sort((a, b) => b.frequency - a.frequency).slice(0, templateLimit);
    lines.push(`常见地图模板（${constructions.sampleCount} 份样本）：`);
    for (const row of top) lines.push(`- ${row.templateId}：${(row.frequency * 100).toFixed(1)}%`);
  }
  const names = nodeTypeNames(floor.floor);
  if (names.length) lines.push(`这一层出现过的节点：${names.join('、')}。`);
  return lines.join('\n');
}

export function searchPools(query: string, limit = 5): BlackstreamPool[] {
  const data = blackstream();
  if (!data) return [];
  const q = query.trim().toLowerCase();
  if (!q) return data.pools.slice(0, limit);
  const exact = data.pools.filter((pool) => pool.name === query.trim());
  const partial = data.pools.filter((pool) => pool.name.toLowerCase().includes(q));
  return [...exact, ...partial.filter((pool) => !exact.includes(pool))].slice(0, limit);
}

export function findItem(query: string): BlackstreamItem | undefined {
  const data = blackstream();
  if (!data) return undefined;
  const q = query.trim();
  return data.items.find((item) => item.name === q) ?? data.items.find((item) => item.id === q);
}

export function itemsInPool(pool: BlackstreamPool): BlackstreamItem[] {
  const data = blackstream();
  if (!data) return [];
  const byId = new Map(data.items.map((item) => [item.id, item]));
  return pool.items.map((id) => byId.get(id)).filter((item): item is BlackstreamItem => Boolean(item));
}

export function poolsWithItem(itemId: string): BlackstreamPool[] {
  return (blackstream()?.pools ?? []).filter((pool) => pool.items.includes(itemId));
}

export function formatItem(item: BlackstreamItem): string {
  const meta = [item.dataType, rarityLabel(item.rarity), item.category].filter((part) => part && part !== '待确认');
  return `- ${item.name}${meta.length ? `（${meta.join('·')}）` : ''}：${item.effect || item.description || '—'}`;
}

export function formatPool(pool: BlackstreamPool, limit = 8): string {
  const items = itemsInPool(pool);
  const lines = [`${pool.name}（${pool.count} 件）`];
  for (const item of items.slice(0, limit)) lines.push(formatItem(item));
  if (items.length > limit) lines.push(`……还有 ${items.length - limit} 件，可再按名称查。`);
  return lines.join('\n');
}

/** 整层节点类型分布：按样本里每种节点出现次数归一。 */
export function nodeTypeShare(floorId: string | number): Array<{ name: string; share: number; count: number }> {
  const data = blackstream();
  const entry = data?.nodeDistance.find((row) => Number(row.id) === Number(floorId));
  if (!entry) return [];
  const totals = entry.rows
    .map((row) => ({
      name: row.name,
      count: Object.values(row.counts).reduce((sum, value) => sum + value, 0),
    }))
    .filter((row) => row.count > 0);
  const total = totals.reduce((sum, row) => sum + row.count, 0) || 1;
  return totals
    .map((row) => ({ ...row, share: row.count / total }))
    .sort((a, b) => b.count - a.count);
}

/**
 * 沿一条走廊走 `distance` 步时，下一个节点是什么类型的分布。
 * 数据是各类型在各距离上的频次，这里按距离归一；样本量写在回执里。
 */
export function nodeTypeAtDistance(
  floorId: string | number,
  distance: number,
): Array<{ name: string; probability: number; samples: number }> {
  const data = blackstream();
  const entry = data?.nodeDistance.find((row) => Number(row.id) === Number(floorId));
  if (!entry) return [];
  const key = String(distance);
  const rows = entry.rows
    .map((row) => ({ name: row.name, count: row.counts[key] ?? 0 }))
    .filter((row) => row.count > 0);
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  if (!total) return [];
  return rows
    .map((row) => ({ name: row.name, probability: row.count / total, samples: row.count }))
    .sort((a, b) => b.probability - a.probability);
}

export function nodeDistanceMeta(
  floorId: string | number,
): { mapSampleCount: number; sampleCount: number; label: string } | undefined {
  const entry = blackstream()?.nodeDistance.find((row) => Number(row.id) === Number(floorId));
  return entry ? { mapSampleCount: entry.mapSampleCount, sampleCount: entry.sampleCount, label: entry.label } : undefined;
}

export function dataSummary(): string | undefined {
  const data = blackstream();
  if (!data) return undefined;
  return `黑流树海资料：${data.counts.items} 件藏品、${data.counts.pools} 个藏品池、${data.counts.floors} 层地图（导入于 ${data.importedAt.slice(0, 10)}，来源：${data.source}）。`;
}

export function nodeTypeNames(floorId: string | number): string[] {
  const entry = blackstream()?.nodeDistance.find((row) => Number(row.id) === Number(floorId));
  return entry ? entry.rows.map((row) => row.name) : [];
}

export interface NodeTypeDistance {
  name: string;
  total: number;
  mapSampleCount: number;
  distances: Array<{ distance: number; count: number; share: number }>;
}

/**
 * 反查：某类节点在这一层出现在哪些距离上。
 * `share` 用该层样本地图数做分母（一次出现在多少比例的地图里）。
 */
export function nodeTypeDistances(floorId: string | number, nodeName: string): NodeTypeDistance | undefined {
  const entry = blackstream()?.nodeDistance.find((row) => Number(row.id) === Number(floorId));
  if (!entry) return undefined;
  const name = nodeName.trim();
  const row =
    entry.rows.find((item) => item.name === name) ??
    entry.rows.find((item) => item.name.includes(name) || name.includes(item.name));
  if (!row) return undefined;
  const distances = Object.entries(row.counts)
    .map(([distance, count]) => ({ distance: Number(distance), count }))
    .filter((item) => item.count > 0)
    .sort((a, b) => a.distance - b.distance)
    .map((item) => ({ ...item, share: entry.mapSampleCount ? item.count / entry.mapSampleCount : 0 }));
  return {
    name: row.name,
    total: distances.reduce((sum, item) => sum + item.count, 0),
    mapSampleCount: entry.mapSampleCount,
    distances,
  };
}
