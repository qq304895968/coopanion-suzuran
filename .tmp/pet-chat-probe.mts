import { createRequire } from 'node:module';
const require = createRequire('F:/study/coopanion/coo-draw/package.json');
const WebSocket = require('ws') as typeof import('ws');

const url = 'ws://127.0.0.1:17788/ws/providers/world%3Adesktop-pet/panels/chat';
const ws = new WebSocket(url);
const timer = setTimeout(() => { console.log('timeout'); ws.close(); }, 15000);
ws.on('open', () => {
  console.log('open');
  ws.send(JSON.stringify({ t: 'hello' }));
});
ws.on('message', (data: Buffer) => {
  const text = data.toString();
  console.log('frame', text.slice(0, 500));
  try {
    const frame = JSON.parse(text) as { t?: string };
    if (frame.t === 'init') {
      clearTimeout(timer);
      setTimeout(() => ws.close(), 1000);
    }
  } catch { /* ignore */ }
});
ws.on('error', (error: Error) => { console.log('error', error.message); clearTimeout(timer); });
ws.on('close', () => { console.log('closed'); process.exit(0); });
