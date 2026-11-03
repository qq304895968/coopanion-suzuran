/**
 * 铃兰（明日方舟 char_358_lisa）的多套服装桌宠形象包。
 *
 * 四套衣服（默认 / 春之颂 / 雪霁 / 弃土花开）是四个独立的 Spine 模型：每套都按 Idle 首帧
 * 的姿态、按插槽颜色的透明度烘焙成 tex/<服装>/ 里的贴图，model.json 里每套各有一份
 * parts + deformers。运行时按当前服装取对应的一套，用 Canvas 2D 按骨骼旋转重绘。
 *
 * 换装通过 figure.setScheme(id) 完成（设置界面里的「服装」轴），切换时惰性加载那一套的贴图。
 */
const SVGNS = 'http://www.w3.org/2000/svg';
const UNIT = 2;
const LOOKS = ['default', 'spring', 'snow', 'wild'];

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (rate, dt) => 1 - Math.exp(-rate * dt);

function partMatrix(defs, chain, angles, pre) {
  const apply = (x, y) => {
    if (pre) {
      x = pre.cx + (x - pre.cx) * pre.sx;
      y = pre.cy + (y - pre.cy) * pre.sy;
    }
    for (const id of chain) {
      const d = defs[id];
      const a = (angles[id] || 0) * Math.PI / 180;
      if (!a) continue;
      const [px, py] = d.pivot;
      const c = Math.cos(a), s = Math.sin(a);
      const dx = x - px, dy = y - py;
      x = px + dx * c - dy * s;
      y = py + dx * s + dy * c;
    }
    return [x, y];
  };
  const p0 = apply(0, 0), p1 = apply(1, 0), p2 = apply(0, 1);
  return { a: p1[0] - p0[0], b: p1[1] - p0[1], c: p2[0] - p0[0], d: p2[1] - p0[1], e: p0[0], f: p0[1] };
}

function createFigure(kit, model, load, assetOf) {
  const defsByLook = {};
  for (const id of Object.keys(model.looks)) {
    const defs = model.looks[id].deformers;
    for (const p of model.looks[id].parts) {
      if (p.parent && !defs[p.parent]) throw new Error(`${id}: missing deformer ${p.parent}`);
    }
    defsByLook[id] = defs;
  }

  const cache = new Map();
  let current = null;
  let ctx = null;
  let mounted = null;
  let lastT = 0;
  let blinkAt = 2.4, blinkT = -1, mouth = 0;

  /** 每套服装的骨骼语义：头、胸、腰、尾巴、头发、耳朵、手、腿 */
  function semantics(parts, defs) {
    const bones = Object.keys(defs);
    const cfg = model.face[currentId] || {};
    const eye = parts.find(p => p.id === (cfg.eyes || [])[0]);
    let head = null;
    for (let id = eye && eye.parent; id; id = defs[id] && defs[id].parent) {
      if (/Head/i.test(id) && !/Headwear|Headband/i.test(id)) { head = id; break; }
      if (!head) head = id;
    }
    if (!head) head = bones.find(b => /^F_Head$/.test(b)) || null;
    const chest = head ? defs[head]?.parent ?? null : null;
    const waist = chest ? defs[chest]?.parent ?? null : null;
    return {
      head, chest, waist,
      tails: bones.filter(b => /^F_Tail_/.test(b)),
      hair: bones.filter(b => /^F_Hair/.test(b)),
      ears: bones.filter(b => /^F_[LR]_Ear/.test(b)),
      arms: bones.filter(b => /^F_[LR]_Arm(_\d+)?$/.test(b)),
      legs: bones.filter(b => /^F_[LR]_Leg(_\d+)?$/.test(b)),
    };
  }

  let currentId = null;

  async function loadLook(id) {
    if (cache.has(id)) return cache.get(id);
    const data = model.looks[id];
    const tex = {};
    await Promise.all(data.parts.map(async (p) => {
      const key = p.tex;
      if (tex[key]) return;
      tex[key] = await load(assetOf(`tex/${id}/${p.tex}.png`));
    }));
    const chains = new Map();
    for (const p of data.parts) {
      const c = [];
      for (let pid = p.parent; pid; pid = defsByLook[id][pid].parent) c.push(pid);
      chains.set(p.id, c);
    }
    const baseAlpha = {};
    for (const p of data.parts) baseAlpha[p.id] = p.visible === false ? 0 : (p.alpha ?? 1);
    currentId = id;
    const look = {
      id, parts: data.parts, defs: defsByLook[id], tex, chains, baseAlpha,
      zOrder: data.parts.slice().sort((a, b) => a.z - b.z),
      sem: semantics(data.parts, defsByLook[id]),
      cfg: model.face[id] || {},
    };
    cache.set(id, look);
    return look;
  }

  function mount(petG) {
    petG.textContent = '';
    const fo = document.createElementNS(SVGNS, 'foreignObject');
    fo.setAttribute('x', 0);
    fo.setAttribute('y', 0);
    fo.setAttribute('width', 256);
    fo.setAttribute('height', 256);
    const canvas = document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas');
    canvas.width = 256 * UNIT;
    canvas.height = 256 * UNIT;
    canvas.style.cssText = 'width:100%;height:100%;display:block';
    fo.appendChild(canvas);
    petG.appendChild(fo);
    ctx = canvas.getContext('2d');
    mounted = petG;
  }

  function boxOf(look, id) {
    const p = look.parts.find(q => q.id === id);
    return p ? { cx: p.box[0] + p.box[2] / 2, cy: p.box[1] + p.box[3] / 2 } : null;
  }

  function draw(petG, face, frame) {
    if (mounted !== petG || !ctx) mount(petG);
    const look = current;
    if (!look) return;
    const t = frame.t || 0;
    const dt = clamp(t - lastT, 0, 0.1);
    lastT = t;

    if (t > blinkAt) { blinkT = t; blinkAt = t + 2.4 + Math.random() * 3.2; }
    const blinking = blinkT >= 0 && t - blinkT < 0.13;

    const ex = frame.face || 'neutral';
    const cfg = look.cfg;
    const dizzy = (ex === 'dizzy' || frame.mode === 'dizzy' || frame.mode === 'stun') && (cfg.stun || []).length > 0;
    const happy = ex === 'happy' || ex === 'love' || ex === 'smug' || ex === 'excited';
    const sleepy = ex === 'sleepy' || ex === 'sleep';
    const surprised = ex === 'surprised';
    const hasClosed = (cfg.closed || []).length > 0;
    const closedNow = blinking && hasClosed;

    let eyeY = 1;
    if (blinking) eyeY = hasClosed ? 1 : 0.06;
    else if (happy) eyeY = 0.3;
    else if (sleepy) eyeY = 0.18;
    else if (ex === 'sad' || ex === 'shy' || ex === 'thinking') eyeY = 0.62;
    else if (surprised) eyeY = 1.16;

    const alpha = {};
    for (const p of look.parts) alpha[p.id] = look.baseAlpha[p.id];
    if (dizzy) {
      for (const id of cfg.eyes || []) alpha[id] = 0;
      for (const id of cfg.lashes || []) alpha[id] = 0;
      if (cfg.mouth) alpha[cfg.mouth] = 0;
      for (const id of cfg.stun || []) alpha[id] = 1;
    }
    if (closedNow) {
      for (const id of cfg.eyes || []) alpha[id] = 0;
      for (const id of cfg.lashes || []) alpha[id] = 0;
      for (const id of cfg.closed || []) alpha[id] = 1;
    }

    const talking = (frame.talk || 0) > 0.06 || surprised || happy;
    mouth += ((talking ? 1 : 0) - mouth) * ease(16, dt);
    if (cfg.mouth && cfg.mouthOpen) {
      alpha[cfg.mouth] = mouth > 0.45 ? 0 : 1;
      alpha[cfg.mouthOpen] = mouth > 0.45 ? 1 : 0;
    }

    const sem = look.sem;
    const angles = {};
    const breathe = Math.sin(t * 1.9);
    const sway = Math.sin(t * 1.15);
    const lookAt = frame.look || [0, 0];
    const lx = clamp(Number(lookAt[0]) || 0, -1, 1);

    if (sem.chest) angles[sem.chest] = breathe * 0.4;
    if (sem.waist) angles[sem.waist] = breathe * 0.5;
    if (sem.head) angles[sem.head] = lx * 5 + sway * 0.8;
    if (sem.head && (sleepy || (frame.drowse || 0) > 0.6)) angles[sem.head] += 5;

    sem.tails.forEach((b, i) => { angles[b] = Math.sin(t * 1.3 - i * 0.45) * 0.55; });
    sem.hair.forEach((b, i) => { angles[b] = Math.sin(t * 1.2 - i * 0.4) * 0.35; });
    sem.ears.forEach((b, i) => { angles[b] = Math.sin(t * 1.6 + i * 0.6) * 0.8; });
    sem.arms.forEach((b, i) => { angles[b] = Math.sin(t * 1.1 + i) * 0.6; });

    if (frame.mode === 'walk' || frame.mode === 'run') {
      const speed = frame.mode === 'run' ? 12 : 7.5;
      const amp = frame.mode === 'run' ? 8 : 5;
      const swing = Math.sin(t * speed) * amp;
      sem.legs.forEach((b, i) => { angles[b] = (i % 2 ? -1 : 1) * swing; });
      sem.arms.forEach((b, i) => { angles[b] = (i % 2 ? 1 : -1) * swing * 0.4; });
    }

    const pre = {};
    for (const id of cfg.eyes || []) {
      const b = boxOf(look, id);
      if (b) pre[id] = { ...b, sx: 1, sy: eyeY };
    }
    if (blinking && !hasClosed) for (const id of cfg.lashes || []) {
      const b = boxOf(look, id);
      if (b) pre[id] = { ...b, sx: 1, sy: 0.45 };
    }
    if (cfg.mouth && !cfg.mouthOpen && mouth > 0.05) {
      const b = boxOf(look, cfg.mouth);
      if (b) pre[cfg.mouth] = { ...b, sx: 1 + mouth * 0.2, sy: 1 + mouth * 1.8 };
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, 256 * UNIT, 256 * UNIT);
    for (const p of look.zOrder) {
      const a = alpha[p.id];
      if (a == null || a <= 0.01) continue;
      const img = look.tex[p.tex];
      if (!img) continue;
      const m = partMatrix(look.defs, look.chains.get(p.id), angles, pre[p.id] || null);
      const [x, y, w, h] = p.box;
      ctx.setTransform(m.a * UNIT, m.b * UNIT, m.c * UNIT, m.d * UNIT, m.e * UNIT, m.f * UNIT);
      ctx.globalAlpha = a;
      ctx.drawImage(img, x, y, w, h);
    }
    ctx.globalAlpha = 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  return {
    draw,
    async setScheme(id) {
      const want = String(id || '').split('-')[0];
      const key = LOOKS.includes(want) ? want : 'default';
      if (cache.has(key)) { current = cache.get(key); currentId = key; return; }
      const look = await loadLook(key);
      current = look;
      currentId = look.id;
    },
    async load(id) {
      const key = LOOKS.includes(id) ? id : 'default';
      current = await loadLook(key);
      currentId = key;
      return current;
    },
    dispose() { ctx = null; mounted = null; },
    get extent() { return [24, 6, 236, 256]; },
    get hits() { return [[150, 150, 86], [150, 92, 52]]; },
    colors: { z: '#c9a227' },
    anchors: { bubble: [150, 10], gaze: [150, 92], hearts: [150, 150, 38], tear: [128, 100], z: [206, 44] },
  };
}

export async function createSuzuranBody(base, { kit, host, model, scheme, loadImage, asset } = {}) {
  const m = model || await (await fetch(new URL('model.json', base))).json();
  const load = loadImage || ((url) => new Promise((ok, bad) => {
    const im = new Image();
    im.onload = () => ok(im);
    im.onerror = () => bad(new Error('image failed: ' + url));
    im.src = String(url);
  }));
  const assetOf = asset || ((p) => new URL(p, base));
  const figure = createFigure(kit, m, load, assetOf);
  const want = String(scheme || '').split('-')[0];
  await figure.load(LOOKS.includes(want) ? want : 'default');
  return kit.createBody(host, { figure });
}
