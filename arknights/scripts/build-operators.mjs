#!/usr/bin/env node
/**
 * 开发期脚本：从 PRTS wiki 抓取干员页面的技能与天赋数据，生成 src/data/operators.json。
 * 不随包发布、运行时也不执行；扩展只读生成后的 JSON。
 *
 * 数据来源：https://prts.wiki/ （社区维护，CC BY-SA，详见 DATA-NOTICE.md）
 * 只保留战斗相关字段：名称、职业、分支、星级、特性、属性、天赋、技能。剧情/档案/语音一律丢弃。
 *
 * 用法：
 *   node scripts/build-operators.mjs            # 全量
 *   node scripts/build-operators.mjs --limit 3  # 只取前 3 个，用于核对解析
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const API = 'https://prts.wiki/api.php';
const UA = 'cortico-world-arknights/0.1 (dev data build; contact: local)';
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'operators.json');

const limitArg = process.argv.indexOf('--limit');
const LIMIT = limitArg > -1 ? Number(process.argv[limitArg + 1]) : 0;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(params) {
  const url = new URL(API);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, { headers: { 'user-agent': UA } });
  if (!res.ok) throw new Error(`PRTS API ${res.status} for ${url.searchParams.get('titles') ?? ''}`);
  return res.json();
}

/* ---------------------------------------------------------------- wikitext */

/** 找 `{{name ...}}` 模板，返回内层文本与在原文中的位置。 */
function findTemplateSpans(text, name) {
  const out = [];
  const open = `{{${name}`;
  let idx = 0;
  while ((idx = text.indexOf(open, idx)) !== -1) {
    const after = text[idx + open.length];
    if (after && !/[\s|}]/.test(after)) {
      idx += open.length;
      continue;
    }
    let depth = 0;
    let i = idx;
    for (; i < text.length - 1; i++) {
      if (text[i] === '{' && text[i + 1] === '{') { depth++; i++; continue; }
      if (text[i] === '}' && text[i + 1] === '}') {
        depth--;
        i++;
        if (depth === 0) break;
      }
    }
    out.push({ inner: text.slice(idx + 2, i - 1), start: idx });
    idx = i + 1;
  }
  return out;
}

/** 找 `{{name ...}}` 模板，返回内层文本（不含外层花括号）。 */
function findTemplates(text, name) {
  return findTemplateSpans(text, name).map((span) => span.inner);
}

/** 按顶层 `|` 切分模板参数。 */
function splitParams(inner) {
  const parts = [];
  let depth = 0;
  let cur = '';
  for (let i = 0; i < inner.length; i++) {
    const c = inner[i];
    if (c === '{' && inner[i + 1] === '{') { depth++; cur += '{{'; i++; continue; }
    if (c === '}' && inner[i + 1] === '}') { depth--; cur += '}}'; i++; continue; }
    if (c === '[' && inner[i + 1] === '[') { depth++; cur += '[['; i++; continue; }
    if (c === ']' && inner[i + 1] === ']') { depth--; cur += ']]'; i++; continue; }
    if (c === '|' && depth === 0) { parts.push(cur); cur = ''; continue; }
    cur += c;
  }
  parts.push(cur);
  return parts;
}

function toParams(inner) {
  const params = {};
  const positional = [];
  for (const part of splitParams(inner).slice(1)) {
    const eq = topLevelEquals(part);
    if (eq === -1) positional.push(part);
    else params[part.slice(0, eq).trim()] = part.slice(eq + 1);
  }
  params.__positional = positional;
  return params;
}

function topLevelEquals(s) {
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '{' && s[i + 1] === '{') { depth++; i++; continue; }
    if (s[i] === '}' && s[i + 1] === '}') { depth--; i++; continue; }
    if (s[i] === '[' && s[i + 1] === '[') { depth++; i++; continue; }
    if (s[i] === ']' && s[i + 1] === ']') { depth--; i++; continue; }
    if (s[i] === '=' && depth === 0) return i;
  }
  return -1;
}

/** 去掉 wiki 标记，保留可读文本。 */
function clean(input) {
  if (!input) return '';
  let s = String(input);
  // 由内向外反复替换 {{...}}
  for (let guard = 0; guard < 20 && s.includes('{{'); guard++) {
    const before = s;
    s = s.replace(/\{\{[^{}]*\}\}/g, (m) => {
      const inner = m.slice(2, -2);
      const parts = splitParams(inner).slice(1);
      const positional = parts.filter((p) => topLevelEquals(p) === -1);
      const pick = positional.length ? positional[positional.length - 1] : '';
      return pick.trim();
    });
    if (s === before) break;
  }
  s = s
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?[^>]+>/g, '')
    .replace(/\[\[([^\]|]*)\|([^\]]*)\]\]/g, '$2')
    .replace(/\[\[([^\]]*)\]\]/g, '$1')
    .replace(/'''?/g, '')
    .replace(/\[https?:\/\/[^\s\]]+\s+([^\]]*)\]/g, '$1')
    .replace(/\[(https?:\/\/[^\s\]]+)\]/g, '$1')
    .replace(/\{\{|\}\}/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n');
  return s.trim();
}

function num(v) {
  if (v === undefined || v === null) return undefined;
  const s = String(v).replace(/[^\d.-]/g, '');
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

/* ---------------------------------------------------------------- parsing */

function parseOperator(title, wikitext) {
  const info = toParams(findTemplates(wikitext, 'CharinfoV2')[0] ?? '');
  if (!info['干员id']) return null;

  const attr = toParams(findTemplates(wikitext, '属性')[0] ?? '');
  // 不同稀有度的等级键不一样（精0/精1/精2、1级/满级），取该字段的最大值即满级值。
  const pickStat = (label) => {
    const values = Object.entries(attr)
      .filter(([key]) => key === label || key.endsWith(`_${label}`))
      .map(([, value]) => num(value))
      .filter((value) => value !== undefined && value > 0);
    return values.length ? Math.max(...values) : undefined;
  };

  const talents = [];
  for (const raw of findTemplates(wikitext, '天赋列表3')) {
    const p = toParams(raw);
    for (let i = 1; i <= 6; i++) {
      const name = clean(p[`天赋${i}`]);
      if (!name || name === '？' || name === '???') continue;
      talents.push({
        name,
        condition: clean(p[`天赋${i}条件`]) || '—',
        effect: clean(p[`天赋${i}效果`]),
      });
    }
    break;
  }

  // PRTS 用 {{技能}} / {{技能2}} 两种模板装技能，字段名相同；按原文位置排回技能顺序。
  const skillTemplates = [
    ...findTemplateSpans(wikitext, '技能2'),
    ...findTemplateSpans(wikitext, '技能'),
  ].sort((a, b) => a.start - b.start);
  const skills = [];
  for (const { inner: raw } of skillTemplates) {
    const p = toParams(raw);
    const name = clean(p['技能名']);
    if (!name) continue;
    const spOf = (suffix) => ({
      initial: num(p[`技能${suffix}初始`]),
      cost: num(p[`技能${suffix}消耗`]),
      duration: num(p[`技能${suffix}持续`]),
    });
    skills.push({
      name,
      charge: clean(p['技能类型1']),
      trigger: clean(p['技能类型2']) || clean(p['技能类型']),
      description: clean(p['技能7描述'] ?? p['技能1描述']),
      descriptionM3: clean(p['技能专精3描述']),
      sp: spOf('7'),
      spM3: spOf('专精3'),
      range: clean(p['技能范围']) || undefined,
      remark: clean(p['备注']) || undefined,
    });
  }

  const stars = info['稀有度'] !== undefined ? num(info['稀有度']) + 1 : undefined;

  return {
    id: clean(info['干员id']),
    name: clean(info['干员名']) || title,
    stars,
    profession: clean(info['职业']),
    branch: clean(info['分支']),
    position: clean(info['位置']),
    tags: clean(info['标签']).split(/[,，、]/).map((x) => x.trim()).filter(Boolean),
    trait: clean(info['特性']),
    stats: {
      hp: pickStat('生命上限'),
      atk: pickStat('攻击'),
      def: pickStat('防御'),
      res: pickStat('法术抗性'),
      cost: clean(attr['部署费用']),
      block: num(attr['阻挡数']),
      interval: clean(attr['攻击速度']),
      redeploy: clean(attr['再部署']),
    },
    talents,
    skills,
    source: `https://prts.wiki/w/${encodeURIComponent(title)}`,
  };
}

/* ---------------------------------------------------------------- fetching */

async function listOperatorTitles() {
  const titles = [];
  let cont = {};
  do {
    const data = await api({
      action: 'query',
      list: 'categorymembers',
      cmtitle: 'Category:干员',
      cmlimit: '500',
      format: 'json',
      ...cont,
    });
    for (const m of data.query?.categorymembers ?? []) titles.push(m.title);
    cont = data.continue ? { cmcontinue: data.continue.cmcontinue } : null;
    await sleep(120);
  } while (cont);
  return titles;
}

async function fetchWikitext(titles) {
  const data = await api({
    action: 'query',
    prop: 'revisions',
    rvprop: 'content',
    rvslots: 'main',
    titles: titles.join('|'),
    format: 'json',
    formatversion: '2',
  });
  const byTitle = new Map();
  for (const page of data.query?.pages ?? []) {
    const text = page.revisions?.[0]?.slots?.main?.content;
    if (text) byTitle.set(page.title, text);
  }
  return byTitle;
}

/* ---------------------------------------------------------------- main */

const titles = await listOperatorTitles();
console.log(`category members: ${titles.length}`);
const wanted = LIMIT ? titles.slice(0, LIMIT) : titles;

const operators = [];
for (let i = 0; i < wanted.length; i += 20) {
  const batch = wanted.slice(i, i + 20);
  const pages = await fetchWikitext(batch);
  for (const title of batch) {
    const text = pages.get(title);
    if (!text) continue;
    try {
      const op = parseOperator(title, text);
      if (op) operators.push(op);
    } catch (err) {
      console.warn(`parse failed: ${title}: ${err.message}`);
    }
  }
  console.log(`${Math.min(i + 20, wanted.length)}/${wanted.length} pages, ${operators.length} operators`);
  await sleep(250);
}

// 同一干员可能有多个页面（升变、异格），按 id 去重，保留字段更全的一份。
const byId = new Map();
for (const op of operators) {
  const prev = byId.get(op.id);
  if (!prev || score(op) > score(prev)) byId.set(op.id, op);
}
function score(op) {
  return op.skills.length * 2 + op.talents.length;
}

const list = [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));
const payload = {
  source: 'https://prts.wiki/',
  license: 'CC BY-SA 4.0（数据结构化整理；见 DATA-NOTICE.md）',
  generatedAt: new Date().toISOString(),
  count: list.length,
  operators: list,
};
await mkdir(dirname(OUT), { recursive: true });
const json = JSON.stringify(payload);
await writeFile(OUT, json, 'utf8');

const withSkills = list.filter((o) => o.skills.length).length;
const bytes = Buffer.byteLength(json);
console.log(`written ${OUT}`);
console.log(`operators: ${list.length} (with skills: ${withSkills}), size: ${(bytes / 1024 / 1024).toFixed(2)} MB`);
console.log('sample:', JSON.stringify(list[0], null, 1).slice(0, 700));
