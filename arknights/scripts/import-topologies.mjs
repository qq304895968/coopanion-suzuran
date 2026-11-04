#!/usr/bin/env node
/**
 * 个人使用：把「路标档案馆」黑流树海主地图构造（节点/连线/尽头）导入本机。
 *
 * 数据不随包分发：产物写到 src/data/blackstream-topology.local.json，已 gitignore、
 * 且从 npm 包里排除。站点授权页写明个人身份分析、引用数据无需授权，请注明来源；
 * 团队项目、程序、盈利项目需另行申请。
 *
 * 用法：node scripts/import-topologies.mjs
 *
 * 站点是 Nuxt 打包的 SPA，构造数据在某个 _nuxt/*.js chunk 里；这里按页面 → 路由 chunk
 * → 数据 chunk 的顺序找 `var s=[...]`，不需要写死每次构建都会变的文件名。
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const SITE = 'https://www.lubiao.wiki';
const PAGE = `${SITE}/tools/blackstream-route`;
const UA = 'cortico-world-arknights/0.5 (personal use; data stays local)';
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'blackstream-topology.local.json');

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'user-agent': UA } });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.text();
}

function chunkNames(source) {
  return [...new Set([...source.matchAll(/\.\/([A-Za-z0-9_-]+\.js)/g)].map((match) => match[1]))];
}

async function findTopologyChunk() {
  const html = await fetchText(PAGE);
  const entry = /src="(\/_nuxt\/[^"]+\.js)"/.exec(html)?.[1];
  if (!entry) throw new Error('页面里找不到 _nuxt 入口脚本');
  const entrySource = await fetchText(SITE + entry);

  // 路由表里 tools-blackstream-route 后面紧跟着它自己的 chunk。
  const route = /tools-blackstream-route[\s\S]{0,800}?import\(`\.\/([^`]+)`\)/.exec(entrySource)?.[1];
  if (!route) throw new Error('入口脚本里找不到 blackstream-route 的路由 chunk');
  const routeSource = await fetchText(`${SITE}/_nuxt/${route}`);

  // 路由 chunk 直接或隔一层 import 数据 chunk；逐个看，找不到再递归一层。
  const seen = new Set();
  const queue = chunkNames(routeSource);
  for (let depth = 0; depth < 3 && queue.length; depth += 1) {
    const next = [];
    for (const name of queue) {
      if (seen.has(name)) continue;
      seen.add(name);
      const url = `${SITE}/_nuxt/${name}`;
      let source;
      try {
        source = await fetchText(url);
      } catch {
        continue;
      }
      if (source.includes('var s=[')) return source;
      next.push(...chunkNames(source));
    }
    queue.length = 0;
    queue.push(...next);
  }
  throw new Error('没有在站点 chunk 里找到构造数据（站点可能改版）');
}

function extractArray(source) {
  const start = source.indexOf('var s=[');
  if (start < 0) throw new Error('构造数据里找不到 var s=[');
  let index = source.indexOf('[', start);
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }
    if (char === '[') depth += 1;
    else if (char === ']') {
      depth -= 1;
      if (depth === 0) {
        index += 1;
        break;
      }
    }
  }
  return source.slice(start + 'var s='.length, index);
}

function slotKey([x, y]) {
  return `${x}:${y}`;
}
function edgeKey(a, b) {
  return [slotKey(a), slotKey(b)].sort().join('|');
}

/** 站点里树洞构造用 o() 从 occupiedSlots 生成边；这里照抄同一规则。 */
function withGeneratedEdges(entry) {
  const { excludedEdges = [], ...topology } = entry;
  const occupied = new Set(topology.occupiedSlots.map(slotKey));
  const excluded = new Set(excludedEdges.map(([a, b]) => edgeKey(a, b)));
  const edges = [];
  for (const slot of topology.occupiedSlots) {
    const [x, y] = slot;
    for (const next of [[x + 1, y], [x, y + 1]]) {
      if (occupied.has(slotKey(next)) && !excluded.has(edgeKey(slot, next))) edges.push([slot, next]);
    }
  }
  return { ...topology, edges };
}

const source = await findTopologyChunk();
const literal = extractArray(source);
const context = Object.create(null);
context.o = withGeneratedEdges;
const raw = vm.runInNewContext(`(${literal})`, context, { timeout: 2000 });
if (!Array.isArray(raw) || raw.length < 10) throw new Error('构造数据为空或格式不对');

const floorLabels = ['I', 'II', 'III', 'IV', 'V', 'VI'];
const floors = [];
for (let layer = 0; layer <= 5; layer += 1) {
  const constructions = raw
    .filter((entry) => entry.layerIndex === layer)
    .map((entry) => {
      const [cols, rows] = entry.gridShape;
      const fixedNodes = {};
      for (const node of entry.fixedNodes ?? []) fixedNodes[node.slot.join(',')] = node.type;
      return {
        template: entry.sourceId,
        id: entry.id,
        cols,
        rows,
        start: entry.startSlot,
        ends: entry.terminalSlots,
        nodes: entry.occupiedSlots,
        edges: entry.edges,
        ...(Object.keys(fixedNodes).length ? { fixedNodes } : {}),
      };
    });
  if (constructions.length) floors.push({ floor: layer + 1, label: floorLabels[layer], constructions });
}

const special = raw
  .filter((entry) => entry.layerIndex === 6)
  .map((entry) => ({
    id: entry.id,
    floors: entry.entranceFloors ?? [],
    cols: entry.gridShape[0],
    rows: entry.gridShape[1],
    start: entry.startSlot,
    nodes: entry.occupiedSlots,
    edges: entry.edges,
    portals: entry.utopiaPortals ?? (entry.utopiaPortal ? [entry.utopiaPortal] : []),
  }));

const payload = {
  source: '路标档案馆',
  sourceUrl: PAGE,
  notice: '个人使用导入；不随包分发。引用请注明来源「路标档案馆」。坐标 x 向右、y 向下，单位一格。',
  updatedAt: new Date().toISOString(),
  counts: {
    constructions: floors.reduce((sum, floor) => sum + floor.constructions.length, 0),
    floors: floors.length,
    special: special.length,
  },
  floors,
  special,
};

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, JSON.stringify(payload, null, 2), 'utf8');
console.log(`wrote ${OUT}`);
console.log(
  `${payload.counts.constructions} 套构造 / ${payload.counts.floors} 层 / ${payload.counts.special} 个树洞特殊图；来源：路标档案馆。`,
);
