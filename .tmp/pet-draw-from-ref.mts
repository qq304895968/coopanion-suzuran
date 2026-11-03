import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire('F:/study/coopanion/coo-draw/package.json');
const WebSocket = require('ws') as typeof import('ws');

const REF = 'C:/Users/BBQ/.dsh/attachments/v1/objects/ae/aec4910f29723ada05f703c12246e8a62cfdecd7298e447ce3b85af980cff9fb';
const OUT = 'F:/study/coopanion/.preview/reference-retry';
const GALLERY = 'F:/虚拟桌宠/铃兰/画';
mkdirSync(OUT, { recursive: true });
const base64 = readFileSync(REF).toString('base64');
const startedAt = Date.now();
const log: string[] = [];

const ws = new WebSocket('ws://127.0.0.1:17788/ws/providers/world%3Adesktop-pet/panels/chat');
let sent = false;
let sawDraw = false;
let finished = false;

const timer = setTimeout(finish, 150_000);

function finish(): void {
  if (finished) return;
  finished = true;
  clearTimeout(timer);
  try { ws.close(); } catch { /* ignore */ }
  writeFileSync(join(OUT, 'chat.log'), `${log.join('\n')}\n`, 'utf8');
  const indexFile = join(GALLERY, 'index.json');
  if (!existsSync(indexFile)) {
    console.log('no index.json');
    process.exit(0);
  }
  const index = JSON.parse(readFileSync(indexFile, 'utf8')) as {
    drawings: Array<{ id: string; file: string; createdAt: string; subject: string }>;
  };
  const fresh = index.drawings.filter((item) => Date.parse(item.createdAt) >= startedAt - 5000);
  console.log(`new drawings: ${fresh.length}`);
  for (const [i, item] of fresh.entries()) {
    const src = join(GALLERY, item.file);
    const dst = join(OUT, `result-${i + 1}.png`);
    if (existsSync(src)) {
      copyFileSync(src, dst);
      console.log(`copied ${dst}  ${item.subject}`);
    }
  }
}

ws.on('open', () => {
  console.log('open');
  ws.send(JSON.stringify({ t: 'hello' }));
});

ws.on('message', (data: Buffer) => {
  const text = data.toString();
  const line = text.length > 800 ? `${text.slice(0, 800)}...` : text;
  log.push(line);
  let frame: Record<string, unknown> = {};
  try { frame = JSON.parse(text) as Record<string, unknown>; } catch { /* ignore */ }
  const t = String(frame.t ?? '');
  if (t === 'init' && !sent) {
    sent = true;
    console.log('chat init; sending reference...');
    ws.send(JSON.stringify({
      t: 'send',
      id: `coodraw-ref-${startedAt}`,
      text: '铃兰，照这张参考图画一张你的蜡笔小画：洞窟瀑布、彩虹、石柱、秋天的树，把你自己画在左下角。用 pet_draw，referenceImage 用这张附件；只画一张，保持你的蜡笔手笔，画完给我看。',
      images: [{ mime: 'image/png', base64, name: 'reference.png' }],
    }));
    return;
  }
  if (t === 'sent') console.log('message delivered', JSON.stringify(frame));
  if (t === 'rejected') console.log('message rejected', JSON.stringify(frame));
  if (t === 'activity') {
    const steps = Array.isArray(frame.steps) ? frame.steps.map(String) : [];
    console.log('activity', steps.join(' → '));
    if (steps.includes('pet_draw')) sawDraw = true;
  }
  if (t === 'line' || t === 'say') {
    const body = JSON.stringify(frame);
    console.log('chat', body.slice(0, 400));
    if (sawDraw && /画好|画完|好啦|看看/.test(body)) {
      setTimeout(finish, 12_000);
    }
  }
});

ws.on('error', (error: Error) => { console.log('ws error', error.message); finish(); });
ws.on('close', () => { console.log('closed'); finish(); });
