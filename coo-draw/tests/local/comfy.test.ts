import { describe, expect, it, vi } from 'vitest';
import { createServer } from 'node:http';
import {
  ComfyClient, ComfyError, normalizeBaseUrl, type WebSocketLike,
} from '../../src/local/comfy.ts';
import { pngBytes } from './helpers.ts';

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });
}

class FakeSocket implements WebSocketLike {
  static instances: FakeSocket[] = [];
  onopen: ((event: unknown) => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onclose: ((event: unknown) => void) | null = null;
  readyState = 0;
  closed = false;
  readonly url: string;

  constructor(url: string) {
    this.url = url;
    FakeSocket.instances.push(this);
  }

  open(): void {
    this.readyState = 1;
    this.onopen?.({});
  }

  send(data: unknown): void {
    this.onmessage?.({ data: JSON.stringify(data) });
  }

  close(): void {
    this.closed = true;
    this.readyState = 3;
    this.onclose?.({});
  }
}

describe('ComfyClient', () => {
  it('规范化地址', () => {
    expect(normalizeBaseUrl('127.0.0.1:8188///')).toBe('http://127.0.0.1:8188');
    expect(normalizeBaseUrl('https://x.test/api/')).toBe('https://x.test/api');
  });

  it('读取 system_stats 和模型列表', async () => {
    const calls: string[] = [];
    const fetchImpl = vi.fn(async (input: string | URL) => {
      const url = String(input);
      calls.push(url);
      if (url.endsWith('/system_stats')) return json({ system: { comfyui_version: '0.3.40', os: 'nt' }, devices: [{ name: 'RTX', vram_total: 8589934592 }] });
      if (url.includes('/object_info/CheckpointLoaderSimple')) return json({
        CheckpointLoaderSimple: { input: { required: { ckpt_name: [['a.safetensors', 'b.safetensors']] } } },
      });
      if (url.includes('/object_info/LoraLoader')) return json({
        LoraLoader: { input: { required: { lora_name: [['风格/a.safetensors']] } } },
      });
      return json({}, 404);
    });
    const client = new ComfyClient({ url: '127.0.0.1:8188', fetchImpl: fetchImpl as typeof fetch });
    const health = await client.health(true);
    expect(health.ok).toBe(true);
    expect(health.devices?.[0]).toContain('RTX');
    expect(await client.checkpoints()).toEqual(['a.safetensors', 'b.safetensors']);
    expect(await client.loras()).toEqual(['风格/a.safetensors']);
    expect(calls[0]).toContain('http://127.0.0.1:8188/system_stats');
  });

  it('提交工作流并解析 prompt_id，节点错误会抛错', async () => {
    const fetchImpl = vi.fn(async (input: string | URL, init?: RequestInit) => {
      if (String(input).endsWith('/prompt')) {
        const body = JSON.parse(String(init?.body)) as { prompt: unknown; client_id: string };
        expect(body.prompt).toEqual({ '1': { class_type: 'X', inputs: {} } });
        expect(body.client_id).toBe('client-test');
        return json({ prompt_id: 'p1', number: 3 });
      }
      return json({}, 404);
    });
    const client = new ComfyClient({ url: 'http://x.test', clientId: 'client-test', fetchImpl: fetchImpl as typeof fetch });
    expect(await client.submit({ '1': { class_type: 'X', inputs: {} } })).toEqual({ prompt_id: 'p1', number: 3 });

    const bad = new ComfyClient({
      url: 'http://x.test',
      fetchImpl: (async () => json({ prompt_id: 'p2', node_errors: { '1': { errors: ['bad'] } } })) as typeof fetch,
    });
    await expect(bad.submit({})).rejects.toBeInstanceOf(ComfyError);
  });

  it('取图并返回 mime/bytes', async () => {
    const fetchImpl = vi.fn(async () => new Response(new Uint8Array(pngBytes()), {
      status: 200,
      headers: { 'content-type': 'image/png' },
    }));
    const client = new ComfyClient({ url: 'http://x.test', fetchImpl: fetchImpl as typeof fetch });
    const image = await client.view({ filename: 'a.png', subfolder: 'sub', type: 'output' });
    expect(image.mime).toBe('image/png');
    expect(image.bytes.byteLength).toBeGreaterThan(0);
  });

  it('WebSocket 连接、解析帧并在断开后重连', async () => {
    FakeSocket.instances = [];
    const client = new ComfyClient({
      url: 'http://127.0.0.1:8188',
      WebSocketImpl: FakeSocket,
      reconnectMs: 10,
      fetchImpl: (async () => json({})) as typeof fetch,
    });
    const events: string[] = [];
    const connected: boolean[] = [];
    const watch = client.watch({
      event: (event) => events.push(`${event.type}:${event.prompt_id ?? ''}`),
      connected: (value) => connected.push(value),
    });
    expect(FakeSocket.instances).toHaveLength(1);
    expect(FakeSocket.instances[0]!.url).toContain('/ws?clientId=');
    FakeSocket.instances[0]!.open();
    FakeSocket.instances[0]!.send({ type: 'progress', data: { value: 3, max: 10, prompt_id: 'p1' } });
    expect(events).toEqual(['progress:p1']);
    expect(connected).toEqual([true]);

    FakeSocket.instances[0]!.close();
    expect(connected).toEqual([true, false]);
    await new Promise((resolve) => setTimeout(resolve, 1100));
    expect(FakeSocket.instances.length).toBeGreaterThanOrEqual(2);
    watch.dispose();
  });

  it('对真实 HTTP 服务完成健康检查、提交、历史和取图', async () => {
    let submitted = '';
    const server = createServer((req, res) => {
      const url = req.url ?? '/';
      if (url === '/system_stats') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ system: { comfyui_version: '0.3.40', os: 'nt' }, devices: [] }));
        return;
      }
      if (url === '/object_info/CheckpointLoaderSimple') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ CheckpointLoaderSimple: { input: { required: { ckpt_name: [['m.safetensors']] } } } }));
        return;
      }
      if (url === '/prompt') {
        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', () => {
          submitted = body;
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ prompt_id: 'p1' }));
        });
        return;
      }
      if (url === '/history/p1') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ p1: { outputs: { '9': { images: [{ filename: 'a.png', type: 'output' }] } } } }));
        return;
      }
      if (url.startsWith('/view')) {
        res.writeHead(200, { 'content-type': 'image/png' });
        res.end(pngBytes());
        return;
      }
      res.writeHead(404);
      res.end();
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('no port');
    try {
      const client = new ComfyClient({ url: `http://127.0.0.1:${address.port}` });
      expect((await client.health(true)).ok).toBe(true);
      expect(await client.checkpoints()).toEqual(['m.safetensors']);
      const result = await client.submit({ '1': { class_type: 'X', inputs: {} } });
      expect(result.prompt_id).toBe('p1');
      expect(JSON.parse(submitted).prompt).toEqual({ '1': { class_type: 'X', inputs: {} } });
      const history = await client.history('p1');
      expect(history?.outputs?.['9']?.images?.[0]?.filename).toBe('a.png');
      const image = await client.view({ filename: 'a.png', type: 'output' });
      expect(image.mime).toBe('image/png');
      expect(image.bytes.byteLength).toBe(pngBytes().byteLength);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('离线时 health 返回 ok=false 而不是抛错', async () => {
    const client = new ComfyClient({
      url: 'http://x.test',
      fetchImpl: (async () => { throw new Error('ECONNREFUSED'); }) as typeof fetch,
    });
    const health = await client.health(true);
    expect(health.ok).toBe(false);
    expect(health.error).toContain('连不上');
  });
});
