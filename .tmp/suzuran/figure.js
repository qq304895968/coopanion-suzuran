/**
 * 铃兰（明日方舟 char_358_lisa）的桌宠形象包。
 *
 * 模型来自 PRTS Wiki「干员模型」的 Spine 3.8 数据：在 Idle 首帧的姿态下，按插槽颜色的
 * 透明度把每个部件（身体、衣服、九条尾巴、头发、脸部件）烘焙成 tex/ 里的贴图；
 * model.json 保留骨骼层级（deformers，以骨骼原点为转轴的旋转）与部件盒子。运行时不依赖
 * Spine 运行时，按骨骼旋转用 Canvas 2D 重绘。
 *
 * 铃兰的脸是一层层叠出来的（眼白 / 虹膜 / 高光 / 睫毛 / 腮 / 嘴），没有闭眼贴图，所以
 * 眨眼与表情靠"把眼睛部件压扁"实现；模型自带 Stun（转圈眼）部件，用于眩晕表情。
 */
const SVGNS = 'http://www.w3.org/2000/svg';
const UNIT = 2;

const EYES = ['F_Face_Default_l', 'F_Face_Default_j', 'F_Face_Default_k', 'F_Face_Default_m'];
const LASHES = ['F_Face_Default_d', 'F_Face_Default_f'];
const MOUTH = 'F_Face_Default_g';
const STUN = ['F_Face_Stun_a', 'F_Face_Stun_b', 'F_Face_Stun_c'];

const TAILS = [
  'F_Tail_b2', 'F_Tail_b4', 'F_Tail_b6', 'F_Tail_b8', 'F_Tail_b10', 'F_Tail_b12',
  'F_Tail_f2', 'F_Tail_e2', 'F_Tail_i2',
];
const HAIR = ['F_Hair', 'F_Hair_a3', 'F_Hair_b3', 'F_Hair_d2', 'F_Hair_e2', 'F_Hair_f2', 'F_Hair_h', 'F_Hair_i'];
const EARS = ['F_L_Ear2', 'F_R_Ear2'];

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (rate, dt) => 1 - Math.exp(-rate * dt);

/** 部件矩阵：先在 rest 空间按(pivot, sx, sy)缩放，再过它自己的骨骼链 */
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

function createFigure(kit, model, tex) {
  const parts = model.parts;
  const defs = model.deformers;
  const zOrder = parts.slice().sort((p, q) => p.z - q.z);
  const byId = new Map(parts.map(p => [p.id, p]));
  const chains = new Map();
  for (const p of parts) {
    const c = [];
    for (let id = p.parent; id; id = defs[id].parent) c.push(id);
    chains.set(p.id, c);
  }
  const baseAlpha = {};
  for (const p of parts) baseAlpha[p.id] = p.visible === false ? 0 : (p.alpha ?? 1);

  let ctx = null;
  let mounted = null;
  let lastT = 0;
  let blinkAt = 2.4;
  let blinkT = -1;
  let mouth = 0;

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

  /** 压扁某个部件的中心点 */
  function squash(id, sy, sx = 1) {
    const p = byId.get(id);
    if (!p) return null;
    return { cx: p.box[0] + p.box[2] / 2, cy: p.box[1] + p.box[3] / 2, sx, sy };
  }

  function draw(petG, face, frame) {
    if (mounted !== petG || !ctx) mount(petG);
    const t = frame.t || 0;
    const dt = clamp(t - lastT, 0, 0.1);
    lastT = t;

    if (t > blinkAt) { blinkT = t; blinkAt = t + 2.4 + Math.random() * 3.2; }
    const blinking = blinkT >= 0 && t - blinkT < 0.13;

    const ex = frame.face || 'neutral';
    const dizzy = ex === 'dizzy' || frame.mode === 'dizzy' || frame.mode === 'stun';
    const happy = ex === 'happy' || ex === 'love' || ex === 'smug' || ex === 'excited';
    const sleepy = ex === 'sleepy' || ex === 'sleep';
    const surprised = ex === 'surprised';
    const wink = ex === 'wink';

    let eyeY = 1;
    if (blinking) eyeY = 0.06;
    else if (happy) eyeY = 0.28;
    else if (sleepy) eyeY = 0.18;
    else if (ex === 'sad' || ex === 'shy' || ex === 'thinking') eyeY = 0.62;
    else if (surprised) eyeY = 1.18;

    const alpha = {};
    for (const p of parts) alpha[p.id] = baseAlpha[p.id];
    for (const id of STUN) alpha[id] = dizzy ? 1 : 0;
    if (dizzy) {
      for (const id of [...EYES, ...LASHES]) alpha[id] = 0;
      alpha[MOUTH] = 0;
    }

    const talking = (frame.talk || 0) > 0.06 || ex === 'surprised' || happy;
    mouth += ((talking ? 1 : 0) - mouth) * ease(16, dt);

    const angles = {};
    const breathe = Math.sin(t * 1.9);
    const sway = Math.sin(t * 1.15);
    const look = frame.look || [0, 0];
    const lx = clamp(Number(look[0]) || 0, -1, 1);

    angles.F_Waist = breathe * 0.5;
    angles.F_Chest = breathe * 0.4;
    angles.F_Head = lx * 5 + sway * 0.8;
    if (sleepy || (frame.drowse || 0) > 0.6) angles.F_Head += 5;

    TAILS.forEach((bone, i) => {
      if (!defs[bone]) return;
      angles[bone] = Math.sin(t * 1.35 - i * 0.8) * (0.8 + (i % 3) * 0.25);
    });
    HAIR.forEach((bone, i) => {
      if (!defs[bone]) return;
      angles[bone] = Math.sin(t * 1.2 - i * 0.5) * 0.55;
    });
    for (const bone of EARS) {
      if (defs[bone]) angles[bone] = Math.sin(t * 1.6 + 1) * 1.2;
    }

    angles.F_R_Arm = Math.sin(t * 1.1) * 0.6;
    angles.F_L_Arm = Math.sin(t * 1.1 + 1.5) * 0.6;

    if (frame.mode === 'walk' || frame.mode === 'run') {
      const speed = frame.mode === 'run' ? 12 : 7.5;
      const amp = frame.mode === 'run' ? 8 : 5;
      const swing = Math.sin(t * speed) * amp;
      angles.F_R_Leg = swing;
      angles.F_L_Leg = -swing;
      angles.F_R_Arm = -swing * 0.5;
      angles.F_L_Arm = swing * 0.5;
      angles.F_Waist = (angles.F_Waist || 0) + Math.sin(t * speed * 2) * 0.8;
    }

    const pre = {};
    for (const id of EYES) pre[id] = squash(id, eyeY);
    for (const id of LASHES) pre[id] = squash(id, blinking ? 0.4 : 1);
    if (wink) pre.F_Face_Default_j = squash('F_Face_Default_j', 0.06);
    pre[MOUTH] = squash(MOUTH, 1 + mouth * 2.2, 1 + mouth * 0.25);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, 256 * UNIT, 256 * UNIT);
    for (const p of zOrder) {
      const a = alpha[p.id];
      if (a == null || a <= 0.01) continue;
      const img = tex[p.tex];
      if (!img) continue;
      const m = partMatrix(defs, chains.get(p.id), angles, pre[p.id] || null);
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
    dispose() { ctx = null; mounted = null; },
    get extent() { return [24, 6, 236, 256]; },
    get hits() { return [[150, 150, 86], [150, 92, 52]]; },
    colors: { z: '#c9a227' },
    anchors: { bubble: [150, 10], gaze: [150, 92], hearts: [150, 150, 38], tear: [128, 100], z: [206, 44] },
  };
}

export async function createSuzuranBody(base, { kit, host, model, loadImage, asset } = {}) {
  const m = model || await (await fetch(new URL('model.json', base))).json();
  const load = loadImage || ((url) => new Promise((ok, bad) => {
    const im = new Image();
    im.onload = () => ok(im);
    im.onerror = () => bad(new Error('image failed: ' + url));
    im.src = String(url);
  }));
  const assetOf = asset || ((p) => new URL(p, base));
  const tex = {};
  await Promise.all(m.parts.map(async (p) => {
    if (!tex[p.tex]) tex[p.tex] = await load(assetOf(`tex/${p.tex}.png`));
  }));
  const figure = createFigure(kit, m, tex);
  return kit.createBody(host, { figure });
}
