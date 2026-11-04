#!/usr/bin/env node
/**
 * 个人使用：把「路标档案馆」的黑流树海数据导入本机，供这个扩展查询。
 *
 * 数据不随包分发：产物写到 src/data/blackstream.local.json，已 gitignore、且从 npm 包里排除。
 * 站点授权页写明「个人身份分析、引用数据无需授权，请注明来源」；团队项目、程序、盈利项目需另行申请。
 * 来源：https://www.lubiao.wiki/tools/blackstream-route
 *
 * 用法：node scripts/import-blackstream.mjs
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SITE = 'https://www.lubiao.wiki';
const UA = 'cortico-world-arknights/0.2 (personal use; data stays local)';
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'blackstream.local.json');

const FILES = {
  archive: '/data/archives/blackstream.json',
  floors: '/data/foundation-floors-rogue_6.json',
  nodeDistance: '/data/node-distance-frequencies-rogue_6.json',
  mapConstructions: '/data/foundation-map-constructions-rogue_6.json',
  dangerNodes: '/data/foundation-danger-nodes-rogue_6.json',
  stageFrequencies: '/data/foundation-battle-stage-frequencies-rogue_6.json',
};

async function fetchJson(path) {
  const res = await fetch(SITE + path, { headers: { 'user-agent': UA } });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${path}: not JSON (${text.slice(0, 80)})`);
  }
}

const raw = {};
for (const [key, path] of Object.entries(FILES)) {
  try {
    raw[key] = await fetchJson(path);
    console.log(`ok ${key} ${path}`);
  } catch (err) {
    console.warn(`skip ${key}: ${err.message}`);
  }
}

const items = (raw.archive?.classifier?.items ?? []).map((item) => ({
  id: item.itemId ?? item.id,
  name: item.name ?? item.baseName,
  dataType: item.dataType,
  rarity: item.rarity,
  category: item.category,
  effect: item.rawEffect ?? item.topicItem?.usage ?? '',
  description: item.topicItem?.description ?? '',
}));

const pools = (raw.archive?.pools?.pools ?? []).map((pool) => ({
  id: pool.id,
  name: pool.name,
  count: pool.count,
  items: pool.collectibles ?? [],
}));

const floors = (raw.floors?.floors ?? []).map((floor) => ({
  floor: floor.floor,
  name: floor.name,
  zoneId: floor.zoneId,
  zoneName: floor.zoneName,
  description: floor.description,
  stageIds: floor.stageIds ?? [],
  bossStageId: floor.bossStageId,
}));

const nodeDistance = (raw.nodeDistance?.floors ?? []).map((floor) => ({
  id: floor.id,
  label: floor.label,
  mapSampleCount: floor.mapSampleCount,
  sampleCount: floor.sampleCount,
  rows: (floor.rows ?? []).map((row) => ({ name: row.name, counts: row.counts })),
}));

const mapConstructions = (raw.mapConstructions?.floors ?? []).map((floor) => ({
  id: floor.id,
  label: floor.label,
  sampleCount: floor.sampleCount,
  rows: (floor.rows ?? []).map((row) => ({ templateId: row.templateId, count: row.count, frequency: row.frequency })),
}));

const payload = {
  source: '路标档案馆',
  sourceUrl: `${SITE}/tools/blackstream-route`,
  notice: '个人使用导入；数据不随包分发。引用请注明来源「路标档案馆」。',
  topicId: 'rogue_6',
  importedAt: new Date().toISOString(),
  siteUpdatedAt: raw.archive?.prts?.syncedAt ?? raw.floors?.updatedAt,
  counts: { items: items.length, pools: pools.length, floors: floors.length },
  floors,
  nodeDistance,
  mapConstructions,
  dangerNodes: raw.dangerNodes ?? null,
  stageFrequencies: raw.stageFrequencies ?? null,
  items,
  pools,
};

await mkdir(dirname(OUT), { recursive: true });
const json = JSON.stringify(payload);
await writeFile(OUT, json, 'utf8');
console.log(`\nwrote ${OUT}`);
console.log(`items ${items.length}, pools ${pools.length}, floors ${floors.length}, ${(Buffer.byteLength(json) / 1024 / 1024).toFixed(2)} MB`);
console.log('sample:', JSON.stringify(items[0]).slice(0, 200));
