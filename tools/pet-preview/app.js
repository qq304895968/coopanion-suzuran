/**
 * 形象包预览页 —— 用真正的浏览器 + 真 WebGL，把包跑在主机那套 kit 上。
 *
 * 和 Coopanion 里的 `web/figure-frame.js` 做的事一样：
 * 把 `host`（画在哪、舞台多大、怎么发事件）和 `kit` 交给包的工厂，拿到 body 后每帧 step。
 * 所以这里看到的样子，就是装进宠物 App 后的样子（同一套 kit，同一个渲染器）。
 */
import * as kit from './kit/body.js';

const PACK = new URL('../../suzuran-figure/', location.href);
const stage = document.getElementById('stage');
const root = document.getElementById('root');
const hud = document.getElementById('hud');
const logEl = document.getElementById('log');
const errEl = document.getElementById('err');
const outfitSel = document.getElementById('outfit');
const slowmo = document.getElementById('slowmo');
const lines = document.getElementById('lines');

const FLOOR = 60;          // 地板离底边多少像素
const linesSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
linesSvg.setAttribute('style', 'position:absolute;inset:0;pointer-events:none;overflow:visible');
linesSvg.style.display = 'none';
stage.appendChild(linesSvg);

function stageSize() {
  return { W: stage.clientWidth, H: stage.clientHeight };
}
function scale() {
  const { W, H } = stageSize();
  return Math.max(.55, Math.min(1.7, Math.min(W / 460, H / 420)));
}
function bounds() {
  const { W, H } = stageSize();
  return { W, H, floorY: H - FLOOR, S: scale() };
}

let body = null;
let scheme = outfitSel.value;
let last = 0, frames = 0, fpsAt = 0, fps = 0;
let currentWord = '';

function log(line) {
  logEl.textContent = (line + '\n' + logEl.textContent).split('\n').slice(0, 40).join('\n');
}

const host = {
  root,
  bounds,
  emit(kind, detail) {
    if (kind === 'mode') { currentWord = detail?.mode ?? ''; }
    else if (kind === 'done') { currentWord = ''; }
    log(`emit ${kind} ${detail ? JSON.stringify(detail) : ''}`);
  },
  sound(name, kind) { log(`sound ${name} (${kind})`); },
  start: { x: 0, facing: 1, enter: 'drop', skin: scheme },
};

async function boot() {
  errEl.style.display = 'none';
  try {
    if (body) { body.dispose(); body = null; }
    const { createSuzuranBody } = await import(new URL('../../suzuran-figure/figure.js', location.href).href);
    const { W } = stageSize();
    host.start = { x: W * .5, facing: 1, enter: 'drop', skin: scheme };
    body = await createSuzuranBody(PACK, {
      model: 'model.json',
      scheme,
      kit,
      loadImage: (u) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('image failed: ' + u)); im.src = u; }),
      asset: (p) => new URL(p, PACK),
      host,
    });
    log(`loaded · scheme=${scheme} · words=${body.words?.length ?? '?'}`);
  } catch (e) {
    errEl.style.display = 'grid';
    errEl.textContent = '加载失败：\n' + (e && e.stack || e);
    console.error(e);
  }
}

function tick(now) {
  requestAnimationFrame(tick);
  if (!body) return;
  const dt = Math.min(.05, (now - (last || now)) / 1000) * (slowmo.checked ? .25 : 1);
  last = now;
  try { body.step(dt); } catch (e) { errEl.style.display = 'grid'; errEl.textContent = 'step 出错：\n' + (e.stack || e); body = null; return; }

  frames++;
  if (now - fpsAt > 500) { fps = Math.round(frames * 1000 / (now - fpsAt)); frames = 0; fpsAt = now; }
  const L = body.layout ? body.layout() : null;
  const f = body.pet?.mode != null ? body.pet : null;
  hud.textContent = `${fps} fps · ${L ? L.mode : '?'} · x=${L ? Math.round(L.x) : '?'} y=${L ? Math.round(L.y ?? 0) : '?'} · facing=${L?.facing ?? 1} · S=${scale().toFixed(2)}${currentWord ? ' · ' + currentWord : ''}`;

  if (lines.checked && L?.box) {
    linesSvg.style.display = '';
    const b = L.box;
    linesSvg.innerHTML = `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="none" stroke="#e0567a" stroke-dasharray="4 3"/>
      ${(L.hit || []).map((c) => `<circle cx="${c.x}" cy="${c.y}" r="${c.r}" fill="none" stroke="#5aa0e0" stroke-dasharray="3 3"/>`).join('')}
      <circle cx="${L.x}" cy="${L.y ?? 0}" r="3" fill="#2f6d5b"/>`;
  } else {
    linesSvg.style.display = 'none';
  }
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-do]');
  if (!btn || !body) return;
  const word = btn.dataset.do;
  if (word === 'walk' || word === 'run') {
    const { W } = stageSize();
    const x = body.layout().x < W / 2 ? W * .78 : W * .22;
    body.walk(x, word === 'run', Math.random());
  } else {
    body.do(word);
  }
});

outfitSel.addEventListener('change', async () => {
  scheme = outfitSel.value;
  if (body?.setScheme) await body.setScheme(scheme);
  else await boot();
});

addEventListener('resize', () => { body?.resize?.(); });
document.addEventListener('keydown', (e) => {
  if (e.key === 'w') body?.walk(stageSize().W * .8, false, 1);
});

boot();
requestAnimationFrame(tick);
