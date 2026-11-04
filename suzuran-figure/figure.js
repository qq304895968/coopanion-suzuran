// API 2 figure for 铃兰 / Suzuran (Arknights): three registered 1024x1024 artworks — the default
// illustration, the E2 illustration and the 雪霁 (nian#11) skin — each with a closed-eye variant used
// for blinking and sleeping. Art is extracted from the game's official illustrations.
//
// Coopanion's body kit does the walking, breathing and particles; this module picks the artwork for
// the chosen skin with a short cross-fade, swaps in the closed-eye variant while blinking/sleeping,
// and squashes the drawing a little when sitting.
const NS = 'http://www.w3.org/2000/svg';
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

// --- the artwork's own pixel space (1024x1024 PNGs, feet on the bottom edge) --------------------
const ART = 1024;

// --- how the artwork is mapped into the kit's logo space ----------------------------------------
const DRAW = 290;          // units for the 1024px artwork
const DRAW_X = -17;
const DRAW_Y = -34;

const SKINS = ['default', 'e2', 'xueji'];
const FADE = 0.25;         // cross-fade between skins (~6-15 frames)

export async function createSuzuranBody(base, { kit, host, loadImage, asset, scheme }) {
  const files = SKINS.flatMap((s) => [`tex/skin-${s}.png`, `tex/skin-${s}-closed.png`]);
  const images = await Promise.all(files.map((f) => loadImage(String(asset(f)))));
  const img = (skin, closed) => images[SKINS.indexOf(skin) * 2 + (closed ? 1 : 0)];

  const doc = host.root.ownerDocument;
  const canvas = doc.createElement('canvas');
  canvas.width = 640;
  canvas.height = 640;
  canvas.style.cssText = 'display:block;width:100%;height:100%';
  const ctx = canvas.getContext('2d');
  const surface = doc.createElementNS(NS, 'foreignObject');
  surface.setAttribute('x', String(DRAW_X));
  surface.setAttribute('y', String(DRAW_Y));
  surface.setAttribute('width', String(DRAW));
  surface.setAttribute('height', String(DRAW));
  surface.appendChild(canvas);
  let mounted = false;

  let current = SKINS.includes(scheme) ? scheme : 'default';
  let previous = current;
  let fadeAt = -1e9;

  const figure = {
    colors: { z: '#8d7bd8' },
    get extent() { return [DRAW_X, DRAW_Y, DRAW_X + DRAW, 256]; },
    hits: [[124, 40, 46], [128, 120, 62], [128, 205, 52]],
    get anchors() {
      return {
        gaze: [128, 52], tear: [150, 66], tears: [[106, 68], [150, 66]],
        z: [128, -18], hearts: [128, 110, 30], bubble: [128, -24],
      };
    },
    setScheme(id) {
      if (!SKINS.includes(id) || id === current) return;
      previous = current;
      current = id;
      fadeAt = -1e9; // redrawn on next frame's clock
    },
    draw(group, face, f) {
      if (!mounted) { group.appendChild(surface); mounted = true; }
      const t = f.t;
      if (fadeAt < -1e8) fadeAt = t;
      const fade = clamp((t - fadeAt) / FADE, 0, 1);
      const sleepy =
        ['sleep', 'sleepy', 'bowing'].includes(f.face) ||
        (f.face === 'content' && f.drowse > 0.7);
      const blink = Math.max(f.blink || 0, f.eyeClose || 0) > 0.45;
      const closed = sleepy || blink;
      const sit = clamp(f.sit || 0, 0, 1);

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, 640, 640);
      ctx.scale(640 / ART, 640 / ART);
      ctx.save();
      // Sitting: the body sinks and squashes a little, feet stay on the ground.
      ctx.translate(ART / 2, ART);
      ctx.scale(1 + 0.04 * sit, 1 - 0.12 * sit);
      ctx.translate(-ART / 2, -ART);
      // Idle sway: a gentle breathing-like lean.
      const sway = Math.sin(2 * Math.PI * t / 3.2) * 0.012;
      ctx.translate(ART / 2, ART);
      ctx.rotate(sway * (1 - 0.7 * sit));
      ctx.translate(-ART / 2, -ART);

      const drawSkin = (skin, alpha) => {
        if (alpha <= 0.001) return;
        ctx.globalAlpha = alpha;
        ctx.drawImage(img(skin, closed), 0, 0);
        ctx.globalAlpha = 1;
      };
      if (fade < 1) drawSkin(previous, 1 - fade);
      drawSkin(current, fade);
      ctx.restore();
    },
  };
  const body = kit.createBody(host, { figure });
  return body;
}
