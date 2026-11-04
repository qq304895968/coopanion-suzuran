/**
 * 铃兰（Suzuran）桌宠形象 · figure api 2
 *
 * 和上一版把动作烤成一张张大图不同，这一版直接把游戏里的 Spine 战斗模型搬进来：
 * 四套服装各一套骨骼（117~368 根骨、75~190 个槽位），动画由 Spine 运行时逐帧求值，
 * 再由本包的 WebGL 渲染器画进自己的一块 canvas。呼吸、头发、尾巴、伞面因此都是原始动画。
 *
 * 契约见 cortico-world-desktop-pet `web/figure-frame.js`：
 *   `factory(base, { model, scheme, kit, loadImage, asset, host })` → body
 * 身体由 `kit.createBody(host, { figure, words })` 造出来，本文件负责其中的 `figure`：
 *   draw(petG, face, frame) 画一帧；extent / hits / anchors / colors / gestures 每帧读；
 *   setScheme(scheme) 换服装；dispose() 收尾。
 *
 * 坐标：模型自己的骨骼空间 → 逻辑空间（256 单位的方格，脚底 y≈250，水平中心 x=128）。
 * 每套服装的 `scale`（每骨骼单位多少逻辑单位）与 `origin`（骨骼原点落在逻辑空间的哪里）
 * 由 tools/build-model.mjs 按 Idle 第一帧的身体包围盒算出，所以四套服装站在一起一样高。
 */

import { SkeletonBinary, Skeleton, AnimationState, AnimationStateData } from './spine38.js';
import { parseAtlas, createAttachmentLoader } from './atlas.js';
import { createRenderer } from './gl.js';
import MODEL_FALLBACK from './model-data.js';

const XHTML = 'http://www.w3.org/1999/xhtml';
const SVGNS = 'http://www.w3.org/2000/svg';
/**
 * 画布在逻辑空间里盖住的范围。套件给的方格是 256×256，但铃兰的伞尖会伸到框外、狐狸还会往右坐，
 * 所以画布比 256 大；放大倍率固定 2（后备像素是 2 的幂，WebGL1 也能 mipmap）。
 */
const KNEE = 1;          // 膝盖弯曲方向（+1 朝前）
const KIT_FOOT_Y = 241;  // 套件里脚休息时的逻辑 y（HIPS 212 + 29）
const VIEW = { x: -104, y: -136, w: 512, h: 512 };
const CANVAS_SCALE = 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, k) => a + (b - a) * k;

/** 本包自己的动作词：模型里真实存在的整套战斗动画，旧版形象没有这些。 */
const WORDS = {
  attack: { motion: { seconds: 1.6, face: 'determined' } },
  cast: { motion: { seconds: 1.9, face: 'happy' } },
  twirl: { motion: { seconds: 2.8, face: 'excited' } },
  flop: { motion: { seconds: 1.3, face: 'sleepy' } },
};

/** 动作词 → 动画序列（名字走 model.json 的 roleAnim，按服装解析）。 */
const GESTURE_ANIM = {
  attack: ['attack'],
  cast: ['skill2'],
  twirl: ['skill3', 'skill3loop', 'skill3loop', 'skill3end'],
  flop: ['die'],
};

/** 表情 → 姿势倾向。幅度都很小：这是换神情，不是换动作。 */
const FACE_POSE = {
  neutral: {},
  happy: { headUp: 3, earPerk: 8, tail: 1.4, armLift: 6, squint: .18 },
  content: { headUp: 1.5, earPerk: 4, tail: .9, squint: .35 },
  smug: { headUp: 2, headTilt: -6, earPerk: 5, squint: .3 },
  love: { headTilt: 5, earPerk: 10, tail: 2, squint: .45 },
  shy: { headDown: 4, headTilt: 7, earDroop: 6, armIn: 8, squint: .2 },
  confused: { headTilt: -10, earDroop: 4 },
  thinking: { headTilt: 8, headUp: 2, earDroop: 2 },
  surprised: { headUp: 6, earPerk: 14, wide: 1, armLift: 10 },
  scared: { headDown: 3, earDroop: 14, armIn: 12, wide: .6, shiver: 1 },
  angry: { headDown: 4, earDroop: 8, armIn: 6, tail: -1.2 },
  pout: { headDown: 2, headTilt: -5, earDroop: 5 },
  determined: { headDown: 2, earPerk: 6, armIn: 4 },
  flustered: { headTilt: -8, earDroop: 3, squint: .25 },
  sad: { headDown: 7, earDroop: 16, tail: -.8, lean: 3 },
  worried: { headDown: 4, earDroop: 10, lean: 2 },
  cry: { headDown: 8, earDroop: 18, squint: .7, lean: 4, shiver: .6 },
  sleepy: { headDown: 5, earDroop: 12, squint: .8, lean: 2 },
  listening: { headTilt: 6, earPerk: 10, headUp: 2 },
  wink: { headTilt: -4, earPerk: 6 },
  dragged: { earDroop: 10, armLift: 14 },
  walking: {},
};

/** scheme → 服装。scheme 是按轴顺序用 `-` 连起来的选项（本包只有一根轴），或预设 id。 */
export function pickOutfit(outfits, scheme) {
  const s = String(scheme || '').trim();
  if (!s) return outfits[0];
  const exact = outfits.find(o => o.id === s || (o.alias || []).includes(s));
  if (exact) return exact;
  for (const part of s.split(/[-+]/)) {
    const hit = outfits.find(o => o.id === part || (o.alias || []).includes(part));
    if (hit) return hit;
  }
  return outfits[0];
}

async function readJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${url}: ${res.status}`);
  return res.json();
}

async function readText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${url}: ${res.status}`);
  return res.text();
}

async function readBytes(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${url}: ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

/** gzip+base64 → 字节（老主机不放行 fetch 时用；Chromium 80+ 才有 DecompressionStream）。 */
async function inflateBase64(b64) {
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  if (typeof DecompressionStream !== 'function') throw new Error('DecompressionStream unavailable');
  const stream = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function createSuzuranBody(base, options = {}) {
  const { kit, loadImage, asset, host } = options;
  const url = (p) => (asset ? asset(p) : new URL(p, base));
  const modelPath = typeof options.model === 'string' ? options.model : 'model.json';

  // model.json 是生成出来的镜像；读不到就用模块里内嵌的同一份，形象不会因为一次 fetch 失败而变空白。
  let MODEL;
  try {
    MODEL = await readJSON(url(modelPath));
  } catch (err) {
    MODEL = MODEL_FALLBACK;
    console.warn('[suzuran] model.json 读取失败，改用内嵌数据：', err && err.message);
  }
  if (!MODEL || !Array.isArray(MODEL.outfits) || !MODEL.outfits.length) throw new Error('model.json 里没有 outfits');

  const scene = createScene({ loadImage, url });
  const figure = createFigure(MODEL, scene, url);
  await figure.setScheme(options.scheme);
  const body = kit.createBody(host, { figure, words: WORDS });
  const dispose = body.dispose;
  body.dispose = () => {
    try { dispose?.(); } finally { figure.dispose(); }
  };
  return body;
}

/* ───────────────────────── 画布与贴图 ───────────────────────── */

function createScene({ loadImage, url }) {
  let canvas = null, fo = null, renderer = null, parent = null;
  const images = new Map();      // 服装 id → 图集页面
  const uploaded = new Set();    // 已经传到 GPU 的服装 id

  function mount(petG) {
    if (canvas) return;
    canvas = document.createElementNS(XHTML, 'canvas');
    canvas.width = VIEW.w * CANVAS_SCALE;
    canvas.height = VIEW.h * CANVAS_SCALE;
    canvas.style.cssText = `width:${VIEW.w}px;height:${VIEW.h}px;display:block;pointer-events:none`;
    fo = document.createElementNS(SVGNS, 'foreignObject');
    fo.setAttribute('x', String(VIEW.x)); fo.setAttribute('y', String(VIEW.y));
    fo.setAttribute('width', String(VIEW.w)); fo.setAttribute('height', String(VIEW.h));
    fo.setAttribute('pointer-events', 'none');
    fo.appendChild(canvas);
    petG.appendChild(fo);
    parent = petG;
    renderer = createRenderer(canvas, VIEW);
    uploaded.clear();
  }

  async function page(outfit) {
    if (!images.has(outfit.id)) images.set(outfit.id, await loadImage(url(`${outfit.dir}/${outfit.page}`)));
    return images.get(outfit.id);
  }

  return {
    mount,
    page,
    get ready() { return !!renderer; },
    ensureUpload(outfit, img) {
      if (!renderer || uploaded.has(outfit.id)) return;
      renderer.upload(outfit.page, img);
      uploaded.add(outfit.id);
    },
    draw(batches) { if (renderer) renderer.draw(batches); },
    forget(id) { uploaded.delete(id); },
    dispose() {
      renderer?.dispose();
      renderer = null;
      if (fo && parent) { try { parent.removeChild(fo); } catch { /* 已拆 */ } }
      fo = null; canvas = null; parent = null;
      images.clear(); uploaded.clear();
    },
  };
}

/* ───────────────────────── 一套服装的加载 ───────────────────────── */

async function loadOutfit(outfit, scene, url) {
  const dir = `${outfit.dir}/`;
  const img = await scene.page(outfit);
  const size = { width: img.naturalWidth || img.width, height: img.naturalHeight || img.height };

  // url() 可能给的是 URL 对象，也可能已经被 asset() 变成字符串
  const href = (u) => (typeof u === 'string' ? u : u.href);

  let atlasText;
  try {
    atlasText = await readText(url(dir + outfit.atlas));
  } catch {
    atlasText = (await import(href(url(`${dir}${outfit.atlas}.js`)))).default;
  }
  const atlas = parseAtlas(atlasText);

  let bytes;
  try {
    bytes = await readBytes(url(dir + outfit.skel));
  } catch {
    bytes = await inflateBase64((await import(href(url(`${dir}${outfit.skel}.js`)))).default);
  }

  const missing = [];
  const loader = createAttachmentLoader(atlas, size, (p) => missing.push(p));
  let data;
  try {
    data = new SkeletonBinary(loader).readSkeletonData(bytes);
  } catch (err) {
    const hint = missing.length ? `；图集缺少区域：${missing.slice(0, 6).join(', ')}` : '';
    throw new Error(`${outfit.id}: 骨骼解析失败（${err.message}）${hint}`);
  }
  if (missing.length) console.warn(`[suzuran] ${outfit.id}：图集缺 ${missing.length} 个区域`, missing.slice(0, 8));
  return { data, atlas, img, size };
}

/* ───────────────────────── figure ───────────────────────── */

function createFigure(MODEL, scene, url) {
  const outfits = MODEL.outfits;
  const loaded = new Map();        // 服装 id → Promise<{ data, atlas, img, size }>
  let outfit = outfits[0];
  let rec = null;

  let skel = null, state = null;
  let bones = {};
  let legRest = null;                    // 两侧踝关节在模型空间里的休息位置 [[x,y],[x,y]]
  let tailRoots = [], tailLeaves = [];   // 尾巴的根骨 / 尾巴中段
  let post = new Map();
  let pivotEye = null, pivotMouth = null;
  let eyeSide = [null, null];      // 左/右眼各自的中点
  let stunSlots = [];              // [{ slot, att }]
  let hideOnDizzy = [];
  let pendingNext = false, seq = [];

  const pose = { headTilt: 0, headUp: 0, lean: 0, squint: 0, eyeWide: 0, armLift: 0, armIn: 0, earPerk: 0, earDroop: 0, tail: 0, shiver: 0, mouth: 0 };
  const want = { ...pose };
  let lastT = -1;
  let blinkK = 0, blinkL = 0, blinkR = 0, talkK = 0, dizzyK = 0, lookX = 0, lookY = 0, eyeWidePose = 0;
  let sleepK = 0;                  // 睡觉闭眼程度 0..1
  let closedArt = [];              // 模型自带的闭眼图 [{ slot, att }]
  let openEyeSlots = [];           // 闭眼时要藏起来的睁眼零件
  let sleepEyes = { keep: new Set(), hide: new Set() };   // 没有闭眼图时，睡觉留哪块、藏哪块
  let mounted = false;

  const animOf = (role) => outfit.roleAnim?.[role] || null;

  function startAnim(role, loop) {
    const name = animOf(role);
    if (!state || !name || !rec?.data.animations.find(a => a.name === name)) return;
    state.setAnimation(0, name, loop);
  }
  function playSequence(roles) {
    seq = roles.slice();
    startAnim(seq.shift(), false);
  }
  const backToIdle = () => startAnim('idle', true);

  async function use(id) {
    const next = outfits.find(o => o.id === id) || outfits[0];
    if (!loaded.has(next.id)) loaded.set(next.id, loadOutfit(next, scene, url));
    const data = await loaded.get(next.id);
    outfit = next;
    rec = data;
    skel = new Skeleton(rec.data);
    skel.setToSetupPose();

    const stateData = new AnimationStateData(rec.data);
    stateData.defaultMix = 0.16;
    state = new AnimationState(stateData);
    state.addListener({ complete: (entry) => { if (entry.trackIndex === 0) pendingNext = true; } });

    bones = {};
    for (const role of ['head', 'chest', 'waist', 'hips']) {
      bones[role] = next.bones?.[role] ? skel.findBone(next.bones[role]) : null;
    }
    for (const role of ['armL', 'armR', 'legL', 'legR', 'earL', 'earR', 'tail']) {
      bones[role] = next.limbs?.[role] ? skel.findBone(next.limbs[role]) : null;
    }

    // 尾巴骨：根骨（父骨不是尾巴）各摆各的，中段再叠一层相位
    tailRoots = [];
    tailLeaves = [];
    for (const b of skel.bones) {
      if (!/Tail/i.test(b.data.name)) continue;
      const parentIsTail = b.data.parent && /Tail/i.test(b.data.parent.name);
      (parentIsTail ? tailLeaves : tailRoots).push(b);
    }

    // 量一次两侧踝关节：腿长各套服装不一样，IK 要照着它自己的骨架来
    legRest = null;
    if (bones.legL && bones.legR) {
      const pick = (thigh) => {
        const calf = childBone(thigh);
        if (!calf) return null;
        const foot = childBone(calf);
        const end = foot || calf;
        const len = Math.abs(end === calf ? calf.data.length : 0);
        return foot
          ? [foot.worldX, foot.worldY]
          : [calf.worldX + Math.cos(calf.getWorldRotationX() * Math.PI / 180) * len,
             calf.worldY + Math.sin(calf.getWorldRotationX() * Math.PI / 180) * len];
      };
      const l = pick(bones.legL), r = pick(bones.legR);
      if (l && r) legRest = [l, r];
    }

    // 脸：眨眼/张嘴是"一组槽位绕公共中心压扁"，不依赖骨骼支点，四套服装通用
    const face = next.face || {};
    // 睡觉要闭眼：有的皮肤自带闭眼图（春之颂的 F_L/R_Eyeclose），有就直接换上，
    // 没有就把眼睛压成一条线（下面的 blinkK）。
    closedArt = [];
    openEyeSlots = [];
    if (face.closed?.length) {
      const art = [];
      for (const name of face.closed) {
        const slot = skel.findSlot(name);
        if (!slot) continue;
        const att = rec.data.defaultSkin?.getAttachment(slot.data.index, name) || slot.getAttachment();
        if (att) art.push({ slot, att, name });
      }
      if (art.length) {
        closedArt = art;
        const closedNames = new Set(art.map(a => a.name));
        openEyeSlots = (face.eyes || []).filter(n => !closedNames.has(n));
      }
    }

    // 量一次 Idle 第一帧：每个脸的槽位画在哪儿，合起来的中心就是眨眼/张嘴的支点
    const boxes = new Map();
    const measure = (list) => {
      skel.setToSetupPose();
      const anim = rec.data.findAnimation(animOf('idle') || 'Idle') || rec.data.animations[0];
      if (anim) anim.apply(skel, 0, 0, false, [], 1, 0, 0);
      skel.updateWorldTransform();
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, n = 0;
      for (const name of list) {
        const slot = skel.findSlot(name);
        const att = slot?.getAttachment();
        if (!att || att.type > 2) continue;
        const verts = new Float32Array(att.type === 0 ? 8 : att.worldVerticesLength);
        if (att.type === 0) { att.updateOffset(); att.computeWorldVertices(slot, verts, 0, 2); }
        else att.computeWorldVertices(slot, 0, verts.length, verts, 0, 2);
        let bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9;
        for (let i = 0; i < verts.length; i += 2) {
          bx0 = Math.min(bx0, verts[i]); bx1 = Math.max(bx1, verts[i]);
          by0 = Math.min(by0, verts[i + 1]); by1 = Math.max(by1, verts[i + 1]);
        }
        boxes.set(name, { cx: (bx0 + bx1) / 2, cy: (by0 + by1) / 2, w: bx1 - bx0, h: by1 - by0, area: (bx1 - bx0) * (by1 - by0) });
        x0 = Math.min(x0, bx0); x1 = Math.max(x1, bx1);
        y0 = Math.min(y0, by0); y1 = Math.max(y1, by1);
        n++;
      }
      return n ? { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 } : null;
    };
    pivotEye = measure(face.eyes || []);
    pivotMouth = measure(face.mouth || []);
    post = new Map();
    for (const name of face.eyes || []) {
      const b = boxes.get(name);
      post.set(name, { kind: 'eye', side: b && pivotEye ? (b.cx < pivotEye.cx ? 0 : 1) : 0, soft: /lash|lid/i.test(name) });
    }
    for (const name of face.mouth || []) post.set(name, { kind: 'mouth' });

    // 左右眼各算一个支点：两只眼睛分开压，才不会往脸中间挤
    for (const side of [0, 1]) {
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, n = 0;
      for (const [name, it] of post) {
        if (it.kind !== 'eye' || it.side !== side) continue;
        const b = boxes.get(name);
        if (!b) continue;
        x0 = Math.min(x0, b.cx - b.w / 2); x1 = Math.max(x1, b.cx + b.w / 2);
        y0 = Math.min(y0, b.cy - b.h / 2); y1 = Math.max(y1, b.cy + b.h / 2);
        n++;
      }
      eyeSide[side] = n ? { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 } : null;
    }

    // 没有自带闭眼图的皮肤（默认/雪霁/弃土花开）：整只眼睛一起压成一条线，
    // 只把比主眼小很多的碎零件（高光等）藏掉，免得压扁以后糊成一块灰斑。
    sleepEyes = { keep: new Set(), hide: new Set() };
    if (!closedArt.length) {
      const bySide = [[], []];
      for (const name of face.eyes || []) {
        const b = boxes.get(name);
        const it = post.get(name);
        if (!b || !it) continue;
        bySide[it.side].push({ name, b, soft: it.soft });
      }
      for (const list of bySide) {
        if (!list.length) continue;
        // 整只眼睛一起压成一条线；只把比主眼小很多的碎零件（高光、眉毛残片）藏掉，
        // 免得它们被压扁以后变成一块糊在脸侧的灰斑。
        const maxArea = Math.max(...list.map(x => x.b.area));
        for (const o of list) {
          if (o.b.area < maxArea * .35) sleepEyes.hide.add(o.name);
          else sleepEyes.keep.add(o.name);
        }
      }
    }

    // 晕：有的服装自带螺旋眼。螺旋图在皮肤里，但平时挂在一个空槽位上、绘制顺序在脸皮下面，
    // 所以直接按左右两边换到"最大的那只眼睛"的槽位上，再把它同侧其余的零件藏掉（睫毛留着）。
    stunSlots = [];
    hideOnDizzy = [];
    if (face.stun?.length && face.eyes?.length) {
      const art = [];
      for (const name of face.stun) {
        const slot = skel.findSlot(name);
        if (!slot) continue;
        const attName = slot.data.attachmentName || slot.data.name;
        const att = rec.data.defaultSkin?.getAttachment(slot.data.index, attName) || slot.getAttachment();
        if (att) art.push({ att, b: boxes.get(name) });
      }
      // 左边一张、右边一张，按螺旋图各自的位置配给同侧的槽位
      const bySide = [[], []];
      for (const name of face.eyes) {
        const b = boxes.get(name);
        const item = post.get(name);
        if (!b || !item || item.soft) continue;
        bySide[item.side].push({ name, b });
      }
      for (const list of bySide) list.sort((a, b2) => b2.b.area - a.b.area);
      const hidden = new Set();
      for (const side of [0, 1]) {
        const target = bySide[side][0];
        const a = art.find(x => !x.used && x.b && (x.b.cx < pivotEye.cx) === (side === 0)) || art.find(x => !x.used);
        if (!target || !a) continue;
        a.used = true;
        stunSlots.push({ slot: skel.findSlot(target.name), att: a.att });
        for (const other of bySide[side].slice(1)) hidden.add(other.name);
      }
      hideOnDizzy = [...hidden];
    }

    scene.forget(next.id);
    scene.ensureUpload(next, rec.img);
    backToIdle();
  }

  /* 每帧：动画求值 → 叠姿势 → 求世界变换 */
  function step(dt, frame) {
    if (!skel) return;
    const speed = frame.mode === 'sleep' ? .45 : frame.mode === 'dizzy' ? .72 : 1;
    state.timeScale = speed;
    state.update(dt);
    if (pendingNext) {
      pendingNext = false;
      if (seq.length) startAnim(seq.shift(), false);
      else backToIdle();
    }
    skel.setToSetupPose();
    state.apply(skel);
    poseBones(frame);
    skel.updateWorldTransform();
  }

  const childBone = (bone) => {
    if (!bone) return null;
    let best = null;
    for (const c of bone.children) if (!best || Math.abs(c.data.length) > Math.abs(best.data.length)) best = c;
    return best && Math.abs(best.data.length) > .5 ? best : null;
  };
  const wrap180 = (a) => { a = (a + 180) % 360; if (a < 0) a += 360; return a - 180; };

  /** 两段骨骼 IK：让 thigh→calf 的末端落在 (tx, ty)（骨骼空间），膝盖朝前弯。 */
  function ikLeg(thigh, tx, ty) {
    const calf = childBone(thigh);
    if (!calf) return;
    const foot = childBone(calf);
    const L1 = Math.abs(thigh.data.length), L2 = Math.abs(calf.data.length);
    if (!(L1 > .5 && L2 > .5)) return;
    const ax = thigh.worldX, ay = thigh.worldY;
    const dx = tx - ax, dy = ty - ay;
    const dist = Math.hypot(dx, dy);
    const d = Math.min(L1 + L2 - .6, Math.max(Math.abs(L1 - L2) + .6, dist));
    const at = Math.atan2(dy, dx) * 180 / Math.PI;
    const cos1 = (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d);
    const a1 = Math.acos(Math.max(-1, Math.min(1, cos1))) * 180 / Math.PI;
    // 膝盖朝角色面朝的那一侧弯（骨骼空间 +x）
    const facing = Math.cos(at * Math.PI / 180) >= 0 ? 1 : -1;
    const thighWorld = at + a1 * KNEE * facing;
    thigh.rotation += wrap180(thighWorld - thigh.getWorldRotationX());
    thigh.updateWorldTransform();

    const kx = ax + L1 * Math.cos(thighWorld * Math.PI / 180);
    const ky = ay + L1 * Math.sin(thighWorld * Math.PI / 180);
    const calfWorld = Math.atan2(ty - ky, tx - kx) * 180 / Math.PI;
    const footWorld = foot ? foot.getWorldRotationX() : null;
    calf.rotation += wrap180(calfWorld - calf.getWorldRotationX());
    calf.updateWorldTransform();
    // 脚掌保持原来的朝向（别跟着膝盖一起翻过去）
    if (foot && footWorld !== null) {
      foot.rotation += wrap180(footWorld - foot.getWorldRotationX());
      foot.updateWorldTransform();
    }
  }

  function poseBones(frame) {
    const t = frame.t || 0;
    const add = (bone, rot, dx = 0, dy = 0) => {
      if (!bone) return;
      bone.rotation += rot;
      if (dx || dy) { bone.x += dx; bone.y += dy; }
    };

    // 看鼠标 / 仰头低头：都只动一点点，整组的角度由套件负责
    add(bones.head, pose.headTilt * .6 + lookX * .35, lookX * 2.4, pose.headUp * .5 + lookY * 1.3);
    add(bones.chest, pose.lean * .18);
    add(bones.waist, pose.lean * .32 + lookX * .08);

    // 走路/坐下：套件的 frame.legs 给了髋→脚的落点（逻辑单位）。
    // 单纯转大腿会让脚在半空划弧、膝盖也不弯，看着像在“滑”。这里按两段骨骼做一次 IK：
    // 大腿指向膝盖、膝盖弯到脚正好落在目标点上，脚掌再转回原来的朝向。
    // 走路/跑：这只小人的腿是画在长袍里的（F_Coat_* 蒙皮网格），腿骨上那几块 F_L/R_Leg 小图
    // 被衣服完全盖住，转腿骨屏幕上什么也看不见（量过）。所以位移靠身体来演：
    // 上下颠、左右晃、前倾，配合手臂摆动，就是“一颠一颠地跑”。
    const legs = Array.isArray(frame.legs) ? frame.legs : null;
    if (frame.mode === 'walk' || frame.mode === 'run') {
      const run = frame.mode === 'run';
      const ph = (frame.t || 0) * (run ? 12.5 : 8);
      const root = skel.bones[0];
      if (root) {
        const hop = Math.abs(Math.sin(ph));          // 0=落地 1=腾空
        const land = Math.max(0, 1 - hop * 3);        // 落地瞬间那一下
        root.y += hop * (run ? 8 : 4.5) - land * (run ? 2.6 : 1.4);
        // 侧倾：每一步换一次重心
        root.rotation += Math.sin(ph * 2) * (run ? 1.8 : .9) + (run ? 3.4 : 1.2);
        // 压扁/拉长：落地压一点，腾空拉一点
        const sq = (run ? 1 : .7) * (hop - .5);
        root.scaleY *= 1 + sq * .035;
        root.scaleX *= 1 - sq * .028;
      }
      add(bones.hips, Math.sin(ph * 2) * (run ? -3 : -1.5));
      add(bones.chest, Math.sin(ph * 2 + .6) * (run ? 2.2 : 1.2));
      add(bones.head, -Math.sin(ph * 2 + .9) * (run ? 2 : 1));     // 头比身子慢半拍
      add(bones.armL, Math.sin(ph * 2) * (run ? 4 : 2));
      add(bones.armR, -Math.sin(ph * 2) * (run ? 4 : 2));
    } else if (frame.mode === 'sit' && legs && legs.length >= 2 && legRest) {
      skel.updateWorldTransform();
      const k = outfit.scale;
      for (let i = 0; i < 2; i++) {
        const seg = legs[i], thigh = i === 0 ? bones.legL : bones.legR, rest = legRest[i];
        if (!seg || !thigh || !rest) continue;
        ikLeg(thigh, rest[0] + (seg[2] - seg[0]) / k, rest[1] + (KIT_FOOT_Y - seg[3]) / k);
      }
    } else if (frame.mode === 'air' || frame.mode === 'drag') {
      add(bones.legL, -12); add(bones.legR, 9);
    } else if (frame.mode === 'sleep') {
      add(bones.legL, -7); add(bones.legR, 5);
    }

    const swing = clamp(frame.swing ?? 0, -1, 1);
    const armBase = pose.armLift - pose.armIn;
    add(bones.armL, -swing * 15 - armBase);
    add(bones.armR, swing * 15 - armBase);

    const ear = pose.earPerk - pose.earDroop;
    add(bones.earL, ear * .5 + Math.sin(t * 1.7) * 1.2);
    add(bones.earR, -ear * .5 + Math.sin(t * 1.7 + 1.1) * 1.2);
    // 尾巴：绕根骨慢摆（0.25~0.4 Hz），每条尾巴再各自带一点相位差；
    // 不再整团上下平移——那是把摆幅全压在根骨上的结果。
    const tailEnergy = Math.abs(pose.tail);
    const tw = 1.5 + tailEnergy * 1.1;                    // 角速度 rad/s（慢）
    const tamp = 1.2 + tailEnergy * 1.9;                  // 单条尾巴的摆幅（度）
    const rootAmp = tailRoots.length > 2 ? tamp * .4 : tamp * .5;
    for (let i = 0; i < tailRoots.length; i++) {
      add(tailRoots[i], Math.sin(t * tw + i * .8) * rootAmp + pose.tail * 1.2);
    }
    for (let i = 0; i < tailLeaves.length; i++) {
      add(tailLeaves[i], Math.sin(t * tw + i * 1.15 + .7) * tamp * .45);
    }

    if (frame.mode === 'dizzy') add(bones.head, Math.sin(t * 9) * 5);
    if (pose.shiver) {
      const s = Math.sin(t * 47) * 1.6 * pose.shiver;
      add(bones.head, s, s * .5, 0);
    }
  }

  /* 顶点 → 逻辑空间，顺带做眨眼/张嘴的逐顶点变形 */
  const scratch = new Map();
  const vertsFor = (capacity) => {
    let a = scratch.get(capacity);
    if (!a) { a = new Float32Array(capacity); scratch.set(capacity, a); }
    return a;
  };

  function buildBatches() {
    const batches = [];
    let cur = null;
    const k = outfit.scale, ox = outfit.origin[0], oy = outfit.origin[1];
    let hideSet = dizzyK > .5 && hideOnDizzy.length ? new Set(hideOnDizzy) : null;
    let overrides = dizzyK > .5 && stunSlots.length ? new Map(stunSlots.map(s => [s.slot.data.name, s.att])) : null;

    // 睡觉：没有闭眼图的皮肤只留一条线
    if (sleepK > .5 && !closedArt.length && sleepEyes.hide.size) {
      hideSet = hideSet || new Set();
      for (const n of sleepEyes.hide) hideSet.add(n);
    }

    // 睡觉：换成模型自带的闭眼图（春之颂那种），顺手把睁眼的零件藏掉
    if (sleepK > .5 && closedArt.length) {
      hideSet = hideSet || new Set();
      for (const n of openEyeSlots) hideSet.add(n);
      overrides = overrides || new Map();
      for (const a of closedArt) overrides.set(a.slot.data.name, a.att);
    }

    for (const slot of skel.drawOrder) {
      const name = slot.data.name;
      if (hideSet && hideSet.has(name)) continue;
      const att = (overrides && overrides.get(name)) || slot.getAttachment();
      if (!att || (att.type !== 0 && att.type !== 2)) continue;
      const alpha = slot.color.a * (att.color ? att.color.a : 1);
      if (alpha <= .004) continue;

      let n, verts;
      if (att.type === 0) {
        att.updateOffset();
        verts = vertsFor(8);
        att.computeWorldVertices(slot, verts, 0, 2);
        n = 4;
      } else {
        n = att.worldVerticesLength >> 1;
        verts = vertsFor(n * 2);
        att.computeWorldVertices(slot, 0, n * 2, verts, 0, 2);
      }

      const item = post.get(name);
      if (item && item.kind === 'eye' && pivotEye && !outfit.face.nativeBlink) {
        const shut = item.side === 0 ? blinkL : blinkR;
        const deep = sleepK > .5 && !closedArt.length ? .9 : (item.soft ? .55 : .92);
        const kk = 1 - deep * shut;
        const wide = 1 + .10 * eyeWidePose;
        const pe = eyeSide[item.side] || pivotEye;
        for (let i = 0; i < n * 2; i += 2) {
          verts[i] = pe.cx + (verts[i] - pe.cx) * wide;
          verts[i + 1] = pe.cy + (verts[i + 1] - pe.cy) * kk;
        }
      } else if (item && item.kind === 'mouth' && pivotMouth) {
        const open = clamp(talkK, 0, 1) * .9 + clamp(pose.mouth, 0, 1) * .45;
        const kk = 1 + open * 1.45;
        for (let i = 0; i < n * 2; i += 2) {
          verts[i] = pivotMouth.cx + (verts[i] - pivotMouth.cx) * (1 + open * .3);
          verts[i + 1] = pivotMouth.cy + (verts[i + 1] - pivotMouth.cy) * kk;
        }
      }

      if (!cur || cur.alpha !== alpha) {
        cur = { tex: outfit.page, alpha, nv: 0, pos: [], uv: [], idx: [] };
        batches.push(cur);
      }
      const base = cur.nv;
      const uv = uvOf(att, n);
      for (let i = 0; i < n * 2; i += 2) {
        cur.pos.push(ox + verts[i] * k, oy - verts[i + 1] * k);
        cur.uv.push(uv[i], uv[i + 1]);
      }
      const idx = idxOf(att, n);
      for (let i = 0; i < idx.length; i++) cur.idx.push(base + idx[i]);
      cur.nv += n;
    }
    return batches.map(b => ({
      tex: b.tex, alpha: b.alpha,
      pos: Float32Array.from(b.pos), uv: Float32Array.from(b.uv), idx: Uint16Array.from(b.idx),
    }));
  }

  const uvCache = new WeakMap(), idxCache = new WeakMap();
  const REGION_IDX = Uint16Array.from([0, 1, 2, 2, 3, 0]);

  function uvOf(att, n) {
    if (att.type === 0) return att.uvs;
    const uvs0 = uvCache.get(att);
    if (uvs0 && uvs0.length === n * 2) return uvs0;
    const reg = att.region, ru = att.regionUVs;
    const uvs = new Float32Array(n * 2);
    uvCache.set(att, uvs);
    const du = reg.u2 - reg.u, dv = reg.v2 - reg.v;
    // 图集里的图可能是 0/90/180/270 度躺着的。regionUVs 存的是没转的自然坐标，
    // 采样时按旋转角度把 (x, y) 换到页面上的位置：
    //   0   → (x, y)        90  → (y, 1-x)
    //   180 → (1-x, 1-y)    270 → (1-y, x)
    const rot = reg.rotate || 0;
    if (rot === 90 || rot === 270) {
      for (let i = 0; i < n * 2; i += 2) {
        const rx = ru[i], ry = ru[i + 1];
        if (rot === 90) { uvs[i] = reg.u + du * ry; uvs[i + 1] = reg.v + dv * (1 - rx); }
        else { uvs[i] = reg.u + du * (1 - ry); uvs[i + 1] = reg.v + dv * rx; }
      }
    } else if (rot === 180) {
      for (let i = 0; i < n * 2; i += 2) {
        uvs[i] = reg.u + du * (1 - ru[i]);
        uvs[i + 1] = reg.v + dv * (1 - ru[i + 1]);
      }
    } else {
      for (let i = 0; i < n * 2; i += 2) {
        uvs[i] = reg.u + ru[i] * du;
        uvs[i + 1] = reg.v + ru[i + 1] * dv;
      }
    }
    uvCache.set(att, uvs);
    return uvs;
  }
  function idxOf(att, n) {
    if (att.type === 0) return REGION_IDX;
    let idx = idxCache.get(att);
    if (idx && idx.length === att.triangles.length) return idx;
    idx = Uint16Array.from(att.triangles);
    idxCache.set(att, idx);
    void n;
    return idx;
  }

  let gestureOpen = false;

  const figure = {
    draw(petG, face, frame) {
      if (!mounted) { scene.mount(petG); mounted = true; }
      if (!skel) return;
      scene.ensureUpload(outfit, rec.img);

      const t = typeof frame.t === 'number' ? frame.t : 0;
      const dt = lastT < 0 ? 0 : clamp(t - lastT, 0, .12);
      lastT = t;

      const key = String(frame.face || 'neutral');
      const target = FACE_POSE[key] || FACE_POSE.neutral;
      want.headUp = (target.headUp || 0) - (target.headDown || 0);
      want.headTilt = target.headTilt || 0;
      want.lean = target.lean || 0;
      want.squint = target.squint || 0;
      want.eyeWide = target.wide || 0;
      want.armLift = target.armLift || 0;
      want.armIn = target.armIn || 0;
      want.earPerk = target.earPerk || 0;
      want.earDroop = target.earDroop || 0;
      want.tail = target.tail || 0;
      want.shiver = target.shiver || 0;
      if (frame.mode === 'dizzy') { want.headTilt += Math.sin(t * 6) * 6; want.earDroop += 6; }
      if (frame.mode === 'drag') { want.armLift += 20; want.earDroop -= 4; }
      if (frame.mode === 'sleep') { want.squint = Math.max(want.squint, .95); want.lean += 4; }
      if (frame.mode === 'sit') want.lean += 2;

      const k = 1 - Math.exp(-dt * 10);
      for (const key2 in pose) pose[key2] = lerp(pose[key2], want[key2], k);

      const auto = clamp(Math.max(frame.blink || 0, frame.eyeClose || 0), 0, 1);
      // 睡觉：一直闭着（不是眨一下就睁），0.45 秒内合上，醒了再睁开
      const sleepWant = frame.mode === 'sleep' ? 1 : 0;
      sleepK += (sleepWant - sleepK) * (1 - Math.exp(-dt * 5));
      if (sleepK < .002) sleepK = 0;
      blinkK = Math.max(auto, pose.squint, sleepK * (closedArt.length ? 0 : .985));
      blinkL = blinkK;
      blinkR = blinkK;
      if (key === 'wink') blinkR = Math.max(blinkR, .95);
      if (key === 'smug') blinkL = Math.max(blinkL, .55);
      if (key === 'happy' || key === 'content' || key === 'love') { blinkL = Math.max(blinkL, .35); blinkR = Math.max(blinkR, .35); }
      eyeWidePose = pose.eyeWide;
      talkK = clamp(frame.talk || 0, 0, 1);
      dizzyK = frame.mode === 'dizzy' ? 1 : 0;

      const look = frame.look || [0, 0];
      lookX = clamp(look[0] / 5, -1.4, 1.4);
      lookY = clamp(look[1] / 4, -1.2, 1.2);

      // 自己的动作词：一个 gesture 只触发一次
      const g = frame.gesture;
      if (g && g.kind && GESTURE_ANIM[g.kind]) {
        if (!gestureOpen || figure._gesture !== g.kind) {
          gestureOpen = true;
          figure._gesture = g.kind;
          playSequence(GESTURE_ANIM[g.kind]);
        }
      } else {
        gestureOpen = false;
        figure._gesture = null;
      }

      step(dt, frame);
      scene.draw(buildBatches());
    },

    setScheme(scheme) {
      return use(pickOutfit(outfits, scheme).id);
    },

    setSkin() { /* 页面主题切换，与服装无关 */ },

    get extent() { return outfit.extent; },
    get hits() { return outfit.hits; },
    get anchors() { return outfit.anchors; },
    get gestures() { return Object.keys(WORDS); },
    get colors() { return { z: '#86b6d9' }; },
    get outfit() { return outfit.id; },
    __debug: () => ({ anim: state?.getCurrent(0)?.animation?.name, t: state?.getCurrent(0)?.trackTime, seq: seq.length, pending: pendingNext }),
    dispose() { scene.dispose(); },
  };
  figure._gesture = null;
  return figure;
}
