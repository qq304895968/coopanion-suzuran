#!/usr/bin/env node
/**
 * 形象包自检：把 figure.json 按主机的规则一条条过一遍，再逐个打开 skins/ 里的骨骼和图集，
 * 确认每个附件都能在图集里找到、每个动作都在、每个兜底模块和原文件一致。
 *
 * 用法：node tools/check.mjs        （全绿才说明主机能读、插件不会因为缺图而白屏）
 *
 * 规则来自 cortico-world-desktop-pet 的 src/packs.ts（readManifest）与 web/figure-frame.js，
 * 这里照着抄了一遍，主机升级时比对这两处即可。
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { SkeletonBinary, Skeleton } from '../spine38.js';
import { parseAtlas, createAttachmentLoader } from '../atlas.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PACK = path.resolve(HERE, '..');
const problems = [];
const notes = [];
const fail = (m) => problems.push(m);
const ok = (m) => notes.push(m);

/* ---------- 主机的正则与常量（src/packs.ts） ---------- */
const MANIFEST_OLDEST = 2, MANIFEST_VERSION = 2, FIGURE_API_OLDEST = 2, FIGURE_API = 2;
const ID = /^[a-z0-9][a-z0-9-]{0,31}$/;
const OPTION_ID = /^[a-z0-9]{1,24}$/;
const SOUND_NAME = /^[a-z][a-zA-Z0-9-]{0,31}$/;
const PARAM_ID = /^[a-z][a-zA-Z0-9]{0,23}$/;
const HEX = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const NAME_BREAK = /[,，、\s【】<>＜＞]/;
const INLINE_TAG_MAX = 32;
const WORD_KINDS = new Set(['expression', 'motion']);
const PACK_SOUND_KINDS = ['move', 'touch', 'face', 'snore', 'talk'];
const PACK_NEEDS = ['windows'];
const VOICE_PITCH = { min: .5, max: 2 };
const EFFECTS_REACH_MAX = 2;
const MOVES_MAX = 8, MOVE_PARAMS_MAX = 2;
const DEFAULT_TARGETS = ['left', 'center', 'right', 'cursor'];
const AUDIO = new Set(['.ogg', '.mp3', '.wav']);
const KIT_EXPRESSIONS = ['neutral', 'happy', 'wink', 'love', 'shy', 'surprised', 'angry', 'sad', 'sleepy', 'thinking',
  'smug', 'pout', 'worried', 'determined', 'flustered', 'scared', 'excited', 'cry', 'confused'];
const KIT_MOTIONS = ['stand', 'jump', 'hop', 'look', 'turn', 'nod', 'shake', 'spin', 'sit', 'sleep', 'dizzy', 'walk', 'run',
  'wave', 'bow', 'shiver', 'flap', 'dance'];

const inside = (p) => typeof p === 'string' && p !== '' && !p.startsWith('/') && !p.split(/[\\/]/).includes('..')
  && !/^[a-z]+:/i.test(p) && !/[<>"\x00-\x1f]/.test(p);
const namesOf = (v) => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const out = {};
  for (const [k, s] of Object.entries(v)) if (typeof s === 'string' && s.trim()) out[k] = s.trim();
  return Object.keys(out).length ? out : null;
};

/* ---------- 1. figure.json ---------- */
const manifestFile = path.join(PACK, 'figure.json');
if (!fs.existsSync(manifestFile)) { console.error('没有 figure.json'); process.exit(1); }
let raw;
try { raw = JSON.parse(fs.readFileSync(manifestFile, 'utf8')); } catch (e) { console.error('figure.json 不是 JSON:', e.message); process.exit(1); }

for (const [key, oldest, now] of [['manifest', MANIFEST_OLDEST, MANIFEST_VERSION], ['api', FIGURE_API_OLDEST, FIGURE_API]]) {
  const v = raw[key];
  if (typeof v !== 'number' || !Number.isInteger(v)) fail(`${key} 不是整数`);
  else if (v > now) fail(`${key} 太新（${v} > ${now}）`);
  else if (v < oldest) fail(`${key} 太旧（${v} < ${oldest}）`);
}
if (typeof raw.id !== 'string' || !ID.test(raw.id)) fail(`id 不合规: ${JSON.stringify(raw.id)}`);
if (['coo', 'whale'].includes(raw.id)) fail('id 不能用 coo / whale（主机保留）');
if (!namesOf(raw.name)) fail('name 空');
if (!namesOf(raw.about)) fail('about 空');
if (!inside(raw.entry) || typeof raw.export !== 'string' || !raw.export) fail('entry / export 不合规');
if (raw.model !== undefined && !inside(raw.model)) fail('model 路径不合规');
if (raw.thumb !== undefined && !inside(raw.thumb)) fail('thumb 路径不合规');
for (const p of [raw.entry, raw.model, raw.thumb].filter(Boolean)) {
  if (!fs.existsSync(path.join(PACK, p))) fail(`文件不存在: ${p}`);
}

/* axes / options */
const axes = Array.isArray(raw.axes) ? raw.axes : [];
if (!axes.length) fail('没有 axes');
const optionIds = new Map();
for (const a of axes) {
  if (typeof a?.id !== 'string' || !ID.test(a.id)) fail(`轴 id 不合规: ${JSON.stringify(a?.id)}`);
  const an = namesOf(a?.name);
  if (!an) fail(`轴 ${a?.id} 没有 name`);
  if (!Array.isArray(a?.options) || !a.options.length) fail(`轴 ${a.id} 没有 options`);
  const ids = new Set();
  for (const o of a.options || []) {
    if (typeof o?.id !== 'string' || !OPTION_ID.test(o.id)) fail(`选项 id 不合规: ${a.id}/${JSON.stringify(o?.id)}`);
    if (ids.has(o?.id)) fail(`选项 id 重复: ${a.id}/${o?.id}`);
    ids.add(o?.id);
    if (!namesOf(o?.name)) fail(`选项 ${a.id}/${o?.id} 没有 name`);
    if (o?.thumb !== undefined) {
      if (!inside(o.thumb)) fail(`选项缩略图路径不合规: ${a.id}/${o.id}`);
      else if (!fs.existsSync(path.join(PACK, o.thumb))) fail(`选项缩略图不存在: ${o.thumb}`);
    }
    if (o?.accent !== undefined && !HEX.test(o.accent)) fail(`选项 accent 不是颜色: ${a.id}/${o.id}`);
  }
  optionIds.set(a.id, ids);
}

/* presets */
for (const p of Array.isArray(raw.presets) ? raw.presets : []) {
  if (typeof p?.id !== 'string' || !ID.test(p.id)) fail(`预设 id 不合规: ${JSON.stringify(p?.id)}`);
  if (!p?.pick || typeof p.pick !== 'object') fail(`预设 ${p?.id} 没有 pick`);
  for (const a of axes) {
    const pick = p?.pick?.[a.id];
    if (!optionIds.get(a.id)?.has(pick)) fail(`预设 ${p.id} 的 ${a.id} 选了不存在的选项 ${JSON.stringify(pick)}`);
  }
  if (p?.accent !== undefined && !HEX.test(p.accent)) fail(`预设 accent 不是颜色: ${p?.id}`);
  if (p?.bubble !== undefined) {
    for (const theme of ['light', 'dark']) {
      const c = p.bubble?.[theme];
      if (!c || !['fill', 'text', 'line'].every(k => typeof c[k] === 'string' && HEX.test(c[k]))) fail(`预设 ${p.id} 的 bubble.${theme} 不合规`);
    }
  }
}

/* vocab */
const vocab = Array.isArray(raw.vocab) ? raw.vocab : [];
if (!vocab.length) fail('没有 vocab');
const taken = new Set();
const kinds = new Map();
for (const w of vocab) {
  if (typeof w?.id !== 'string' || !ID.test(w.id)) { fail(`词 id 不合规: ${JSON.stringify(w?.id)}`); continue; }
  if (!WORD_KINDS.has(w.kind)) { fail(`词 ${w.id} 的 kind 不合规: ${JSON.stringify(w.kind)}`); continue; }
  const about = namesOf(w.about);
  if (!about) fail(`词 ${w.id} 没有 about`);
  if (typeof w.seconds !== 'number' || !(w.seconds > 0) || !Number.isFinite(w.seconds)) fail(`词 ${w.id} 的 seconds 不合规`);
  if (w.lasting !== undefined && typeof w.lasting !== 'boolean') fail(`词 ${w.id} 的 lasting 不合规`);
  const names = [];
  for (const [lang, list] of Object.entries(w.names || {})) {
    if (!Array.isArray(list)) { fail(`词 ${w.id} 的 names.${lang} 不是数组`); continue; }
    for (const n of list) {
      if (typeof n !== 'string' || !n.trim() || n.length > INLINE_TAG_MAX || NAME_BREAK.test(n)) fail(`词 ${w.id} 的名字不合规: ${JSON.stringify(n)}`);
      names.push(n);
    }
  }
  if (!names.length) fail(`词 ${w.id} 没有任何名字`);
  for (const n of [w.id, ...names]) {
    if (taken.has(n)) fail(`词名重复: ${n}`);
    taken.add(n);
  }
  kinds.set(w.id, w.kind);
}
// 套件自己的词必须都在（不然机器人叫不动）
for (const k of [...KIT_EXPRESSIONS, ...KIT_MOTIONS]) {
  if (!kinds.has(k)) fail(`缺套件的词 ${k}（主机内置动作/表情，vocab 里必须列出来机器人才叫得到）`);
  else if (kinds.get(k) !== (KIT_EXPRESSIONS.includes(k) ? 'expression' : 'motion')) fail(`词 ${k} 的 kind 不对`);
}
const kitWords = new Set([...KIT_EXPRESSIONS, ...KIT_MOTIONS]);
ok(`vocab ${vocab.length} 条（套件 ${kitWords.size} + 本包 ${[...kinds.keys()].filter(k => !kitWords.has(k)).length}）`);

/* sounds / can / moves / needs / voice / effects */
const sounds = raw.sounds ?? {};
if (typeof sounds !== 'object' || Array.isArray(sounds)) fail('sounds 不是对象');
for (const [name, d] of Object.entries(sounds)) {
  if (!SOUND_NAME.test(name)) fail(`音效名不合规: ${name}`);
  if (!inside(d?.file)) fail(`音效 ${name} 的文件路径不合规`);
  else if (!fs.existsSync(path.join(PACK, d.file))) fail(`音效 ${name} 的文件不存在: ${d.file}`);
  else if (!AUDIO.has(path.extname(d.file).toLowerCase())) fail(`音效 ${name} 的文件类型主机不解码: ${d.file}`);
  if (!PACK_SOUND_KINDS.includes(d?.kind)) fail(`音效 ${name} 的 kind 不合规`);
  if (d.volume !== undefined && !(typeof d.volume === 'number' && d.volume >= 0 && d.volume <= 1)) fail(`音效 ${name} 的 volume 不合规`);
}
if (raw.can !== undefined && typeof raw.can.walk !== 'boolean') fail('can.walk 不是布尔');
const moves = raw.moves ?? [];
if (!Array.isArray(moves)) fail('moves 不是数组');
else if (moves.length > MOVES_MAX) fail(`moves 超过 ${MOVES_MAX} 个`);
else for (const m of moves) {
  if (typeof m?.id !== 'string' || !ID.test(m.id) || DEFAULT_TARGETS.includes(m.id) || Number.isFinite(Number(m.id))) fail(`move id 不合规: ${JSON.stringify(m?.id)}`);
  if (!namesOf(m?.name) || !namesOf(m?.about)) fail(`move ${m?.id} 缺名字或说明`);
  const ps = m?.params ?? [];
  if (!Array.isArray(ps) || ps.length > MOVE_PARAMS_MAX) fail(`move ${m?.id} 的 params 不合规`);
  for (const p of ps) {
    if (typeof p?.id !== 'string' || !PARAM_ID.test(p.id) || !namesOf(p?.about)
      || typeof p.min !== 'number' || typeof p.max !== 'number' || !(p.min < p.max)) fail(`move ${m?.id} 的参数不合规: ${p?.id}`);
  }
}
const needs = raw.needs ?? [];
if (!Array.isArray(needs) || needs.some(n => !PACK_NEEDS.includes(n))) fail('needs 里有主机不提供的项');
const pitch = raw.voice?.pitch;
if (pitch !== undefined && !(typeof pitch === 'number' && pitch >= VOICE_PITCH.min && pitch <= VOICE_PITCH.max)) fail('voice.pitch 超范围');
const reach = raw.effects?.reach;
if (reach !== undefined && !(typeof reach === 'number' && reach >= 0 && reach <= EFFECTS_REACH_MAX)) fail('effects.reach 超范围');

/* ---------- 2. 模块能 import ---------- */
try {
  const mod = await import(pathToFileURL(path.join(PACK, raw.entry)).href);
  if (typeof mod[raw.export] !== 'function') fail(`${raw.entry} 没有导出函数 ${raw.export}`);
  else ok(`${raw.entry} 导出了 ${raw.export}`);
} catch (e) {
  fail(`${raw.entry} 无法 import: ${e.message}`);
}

/* ---------- 3. model.json 与 skins/ ---------- */
const modelPath = path.join(PACK, raw.model || 'model.json');
let model = null;
try { model = JSON.parse(fs.readFileSync(modelPath, 'utf8')); } catch (e) { fail('model.json 读不了: ' + e.message); }
if (model) {
  const ids = (model.outfits || []).map(o => o.id);
  const axisIds = (axes[0]?.options || []).map(o => o.id);
  for (const id of axisIds) if (!ids.includes(id)) fail(`轴选项 ${id} 在 model.json 里没有对应服装`);
  for (const id of ids) if (!axisIds.includes(id)) fail(`服装 ${id} 没有出现在轴选项里（用户选不到）`);

  for (const o of model.outfits || []) {
    const dir = path.join(PACK, o.dir);
    for (const f of [o.skel, o.atlas, o.page]) if (!fs.existsSync(path.join(dir, f))) fail(`${o.id}: 缺文件 ${f}`);
    const png = fs.readFileSync(path.join(dir, o.page));
    const size = { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
    if (size.width !== o.pageSize[0] || size.height !== o.pageSize[1]) fail(`${o.id}: 页面尺寸和 model.json 不一致`);

    const atlasText = fs.readFileSync(path.join(dir, o.atlas), 'utf8');
    const atlas = parseAtlas(atlasText);
    const skelBytes = fs.readFileSync(path.join(dir, o.skel));

    const missing = [];
    const loader = createAttachmentLoader(atlas, size, (p) => missing.push(p));
    let data;
    try { data = new SkeletonBinary(loader).readSkeletonData(new Uint8Array(skelBytes)); }
    catch (e) { fail(`${o.id}: 骨骼解析失败 ${e.message}`); continue; }
    if (missing.length) fail(`${o.id}: 图集缺 ${missing.length} 个区域（${[...new Set(missing)].slice(0, 5).join(', ')}）`);

    // 动画里临时换上的附件也必须在图集里
    const swapped = new Set();
    for (const anim of data.animations) {
      for (const tl of anim.timelines) {
        if (tl.constructor.name === 'AttachmentTimeline' && tl.attachmentNames) {
          for (const n of tl.attachmentNames) if (n) swapped.add(n);
        }
      }
    }
    const missingSwapped = [...swapped].filter(n => !atlas.find(n));
    // 只在皮肤里存在、图集里没有的附件才是问题
    const inSkin = new Set();
    const skin = data.defaultSkin;
    const atts = skin?.attachments;
    const collect = (table) => { for (const k of Object.keys(table || {})) inSkin.add(k); };
    if (Array.isArray(atts)) for (const e of atts) collect(e.attachments);
    else for (const table of Object.values(atts || {})) collect(table);
    const bad = missingSwapped.filter(n => inSkin.has(n));
    if (bad.length) fail(`${o.id}: 动画会用到但图集里没有的附件 ${bad.slice(0, 5).join(', ')}`);

    // 骨骼 / 肢体 / 脸的槽位都得真的存在
    const boneNames = new Set(data.bones.map(b => b.name));
    const slotNames = new Set(data.slots.map(s => s.name));
    for (const [role, name] of Object.entries(o.bones || {})) if (name && !boneNames.has(name)) fail(`${o.id}: 骨骼 ${role}=${name} 不存在`);
    for (const [role, name] of Object.entries(o.limbs || {})) if (name && !boneNames.has(name)) fail(`${o.id}: 肢体 ${role}=${name} 不存在`);
    for (const [group, list] of Object.entries(o.face || {})) {
      if (!Array.isArray(list)) continue;
      for (const n of list) if (!slotNames.has(n)) fail(`${o.id}: 脸的槽位 ${group}/${n} 不存在`);
    }

    // 动作都在
    for (const [role, name] of Object.entries(o.roleAnim || {})) {
      if (name === null) continue;
      if (!data.animations.some(a => a.name === name)) fail(`${o.id}: 动作 ${role}=${name} 不在骨骼里`);
    }
    if (!o.roleAnim?.idle) fail(`${o.id}: 没有 idle 动作`);

    // 兜底模块
    const skelJs = path.join(dir, `${o.skel}.js`);
    const atlasJs = path.join(dir, `${o.atlas}.js`);
    if (!fs.existsSync(skelJs) || !fs.existsSync(atlasJs)) fail(`${o.id}: 缺兜底模块`);
    else {
      const b64 = fs.readFileSync(skelJs, 'utf8').match(/'([A-Za-z0-9+/=]+)'/)?.[1];
      const back = b64 ? zlib.gunzipSync(Buffer.from(b64, 'base64')) : null;
      if (!back || Buffer.compare(back, skelBytes) !== 0) fail(`${o.id}: 兜底骨骼和原文件不一致`);
      const text = fs.readFileSync(atlasJs, 'utf8').match(/export default (".*");/s)?.[1];
      if (!text || JSON.parse(text) !== atlasText) fail(`${o.id}: 兜底图集和原文件不一致`);
    }

    // 尺寸合理性
    const [x0, y0, x1, y1] = o.extent;
    if (!(x1 > x0 && y1 > y0)) fail(`${o.id}: extent 不合理`);
    if (o.hits?.some(([x, y, r]) => !(x > x0 - 40 && x < x1 + 40 && y > y0 - 40 && y < y1 + 40 && r > 0))) fail(`${o.id}: hits 落到了 extent 外`);
    if (!(o.scale > 0)) fail(`${o.id}: scale 必须为正`);
    for (const k of ['gaze', 'bubble', 'hearts', 'tear', 'z']) {
      const p = o.anchors?.[k];
      if (!Array.isArray(p) || p.length !== 2 || !p.every(Number.isFinite)) fail(`${o.id}: anchors.${k} 不合规`);
    }
    ok(`${o.id}: ${data.bones.length} 骨 / ${data.slots.length} 槽 / ${data.animations.length} 动作 / extent ${o.extent.join(',')} / 缩放 ${o.scale}`);
  }
}

/* ---------- 4. 文件清单 ---------- */
const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
};
const files = walk(PACK);
let bytes = 0;
for (const f of files) bytes += fs.statSync(f).size;
const bad = files.filter(f => /[<>"\x00-\x1f]/.test(f) || path.relative(PACK, f).split(path.sep).includes('..'));
if (bad.length) fail(`文件名不合规: ${bad.slice(0, 3).join(', ')}`);
ok(`${files.length} 个文件，共 ${(bytes / 1048576).toFixed(2)} MB`);

/* ---------- 结果 ---------- */
for (const n of notes) console.log('  ·', n);
if (problems.length) {
  console.log(`\n✗ ${problems.length} 个问题：`);
  for (const p of problems) console.log('  -', p);
  process.exit(1);
}
console.log('\n✓ 形象包自检通过');
