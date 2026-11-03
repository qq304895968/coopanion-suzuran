import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { EventEnvelope, WorldHost } from 'cortico/core/types.ts';
import type { PetDrawConfigSection } from '../../src/api/config.ts';
import { DRAW } from '../../src/definition.ts';
import { callDraw, callTool, fakeCtx, fakeQwen, makeWorld, pngBytes } from './helpers.ts';

const roots: string[] = [];

function root(): string {
  const dir = mkdtempSync(join(tmpdir(), 'pet-draw-world-'));
  roots.push(dir);
  return dir;
}

function readIndex(dir: string): { drawings: Array<{ id: string; file: string; rating: string; subject: string }> } {
  return JSON.parse(readFileSync(join(dir, 'index.json'), 'utf8')) as { drawings: Array<{ id: string; file: string; rating: string; subject: string }> };
}

afterEach(() => {
  for (const dir of roots.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function fakeHost(pushed: EventEnvelope[]): WorldHost {
  return {
    pushEvent: async (event: Parameters<WorldHost['pushEvent']>[0]) => {
      const saved = { ...event, cursor: pushed.length + 1, origin: event.origin ?? 'external' } as EventEnvelope;
      pushed.push(saved);
      return saved;
    },
    log: fakeCtx().log,
    store: {} as never,
    drainPendingEvents: async () => [],
    blob: () => null,
    reportUsage: () => undefined,
    modelFacts: { model: () => 'test', accepts: () => true, contextWindow: () => undefined },
  } as unknown as WorldHost;
}

describe('config labels', () => {
  it('shows Chinese labels for the style select', () => {
    const styles = DRAW.configOptions?.('pet-draw-style', 'zh');
    expect(styles).toContainEqual({ value: 'crayon', label: '蜡笔涂鸦' });
    expect(styles).toContainEqual({ value: 'pixel', label: '像素画' });
    expect(styles).toContainEqual({ value: 'custom', label: '自定义画风' });
    expect(styles?.some((option) => option.value === 'auto')).toBe(false);
    expect(DRAW.configOptions?.('unknown', 'zh')).toEqual([]);
  });
});

describe('persona from the base setting', () => {
  it('reads the name and traits from workspace/CONSTITUTION.md', async () => {
    const base = root();
    mkdirSync(join(base, 'workspace'), { recursive: true });
    writeFileSync(join(base, 'workspace', 'CONSTITUTION.md'), `# 我是谁\n\n我是铃兰，干员铃兰！\n\n# 性子\n\n礼貌、认真、容易害羞，也容易担心。\n`, 'utf8');
    const fake = fakeQwen();
    const { world } = makeWorld({
      dataDir: base,
      botDir: base,
      fetchImpl: fake.fetchImpl,
      cfg: { dailyLimit: 10, cooldownSeconds: 0 },
    });
    const vars = await world.envPromptVars();
    expect(vars!['petDraw.persona']).toBe('铃兰');

    await callDraw(world, '一只猫');
    const body = JSON.parse(String(fake.calls[0]!.init?.body)) as { input: { messages: Array<{ content: Array<{ text: string }> }> } };
    expect(body.input.messages[0]!.content[0]!.text).toContain('礼貌、认真、容易害羞');
  });
});

describe('reference image', () => {
  it('searches a named person and sends the image to Qwen', async () => {
    const fake = fakeQwen();
    const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('bing.com/images/search')) {
        return new Response('<a class="iusc" m="{&quot;murl&quot;:&quot;https://img.example.com/ref.png&quot;,&quot;t&quot;:&quot;鲁迅 画像&quot;,&quot;purl&quot;:&quot;https://example.com/ref&quot;}"></a>', { status: 200 });
      }
      if (url === 'https://img.example.com/ref.png') {
        return new Response(pngBytes(512, 512), { status: 200, headers: { 'content-type': 'image/png' } });
      }
      return fake.fetchImpl(input, init);
    }) as typeof fetch;
    const { world } = makeWorld({
      fetchImpl,
      cfg: { dailyLimit: 10, cooldownSeconds: 0 },
    });

    const out = await callDraw(world, '鲁迅在书房里', fakeCtx(), { referenceName: '鲁迅' });
    expect(out.text).toContain('参考图：Bing 搜索「鲁迅」');

    const qwenCall = fake.calls.find((call) => call.url.includes('maas.qianwenaiapi.com'));
    expect(qwenCall).toBeTruthy();
    const body = JSON.parse(String(qwenCall!.init?.body)) as {
      input: { messages: Array<{ content: Array<{ text?: string; image?: string }> }> };
    };
    const content = body.input.messages[0]!.content;
    expect(content[0]!.image).toMatch(/^data:image\/png;base64,/);
    expect(content[1]!.text).toContain('参考图只用来认人');
  });
});

describe('popup and review prompt', () => {
  it('pops the first picture and asks the pet to request a rating', async () => {
    const fake = fakeQwen();
    const shown: Array<{ dataUrl: string; opts: { duration: number; scale: number } }> = [];
    const pushed: EventEnvelope[] = [];
    const { world } = makeWorld({
      fetchImpl: fake.fetchImpl,
      popup: {
        showData: async (dataUrl, opts) => {
          shown.push({ dataUrl, opts });
          return true;
        },
      },
      cfg: { maxImagesPerCall: 2, dailyLimit: 10, cooldownSeconds: 0 },
    });
    await world.start(fakeHost(pushed));

    await callDraw(world, '一只猫', undefined, { count: 2 });
    expect(shown).toHaveLength(1);
    expect(shown[0]!.dataUrl).toMatch(/^data:image\/png;base64,/);
    expect(shown[0]!.opts).toMatchObject({ duration: 5, scale: 1 });

    const event = pushed.find((item) => item.type === 'petdraw.drawn');
    expect(event?.origin).toBe('internal');
    expect(event?.text).toContain('pet_ask');
    expect(event?.text).toContain('喜欢');
    expect(event?.text).toContain('pet_draw_rate');
    await world.stop();
  });

  it('does not pop when the switch is off', async () => {
    const fake = fakeQwen();
    let calls = 0;
    const { world } = makeWorld({
      fetchImpl: fake.fetchImpl,
      popup: { showData: async () => { calls += 1; return true; } },
      cfg: { popupEnabled: false, dailyLimit: 10, cooldownSeconds: 0 },
    });
    await callDraw(world, '一只猫');
    expect(calls).toBe(0);
  });

  it('declares the folder panel and reports its path and counts', async () => {
    const base = root();
    const saveDir = join(base, 'art');
    const fake = fakeQwen();
    const { world } = makeWorld({
      dataDir: base,
      fetchImpl: fake.fetchImpl,
      cfg: { saveDir, dailyLimit: 10, cooldownSeconds: 0 },
    });
    const ui = world.webUi!('zh');
    expect(ui.panels?.map((panel) => panel.id)).toContain('folder');

    const before = await ui.invoke!('folder', 'info', []) as { path: string; total: number };
    expect(before.path).toBe(saveDir);
    expect(before.total).toBe(0);

    await callDraw(world, '一只猫');
    const after = await ui.invoke!('folder', 'info', []) as { total: number; counts: Record<string, number> };
    expect(after.total).toBe(1);
    expect(after.counts.unrated).toBe(1);
  });
});

describe('pet_draw multi-image and allowance', () => {
  it('draws the requested count, saves every picture and counts them', async () => {
    const base = root();
    const saveDir = join(base, 'art');
    const fake = fakeQwen();
    const { world } = makeWorld({
      dataDir: base,
      fetchImpl: fake.fetchImpl,
      cfg: { saveDir, maxImagesPerCall: 3, dailyLimit: 10, cooldownSeconds: 0 },
    });

    const out = await callDraw(world, '一只在草地上打滚的小狐狸', undefined, { count: 3 });
    expect(out.failed).toBeUndefined();
    expect(out.blobs).toHaveLength(3);
    expect(out.text).toContain('3 张');
    expect(out.text).toContain('存进画夹');
    expect(fake.calls).toHaveLength(4);

    const index = readIndex(saveDir);
    expect(index.drawings).toHaveLength(3);
    expect(index.drawings.every((art) => art.rating === 'unrated')).toBe(true);
    expect(readdirSync(join(saveDir, 'unrated'))).toHaveLength(3);
    const vars = await world.envPromptVars();
    expect(vars!['petDraw.today']).toBe('3/10');
  });

  it('clamps count to the per-call cap', async () => {
    const fake = fakeQwen();
    const { world } = makeWorld({
      fetchImpl: fake.fetchImpl,
      cfg: { maxImagesPerCall: 1, dailyLimit: 10, cooldownSeconds: 0 },
    });
    const out = await callDraw(world, '一只猫', undefined, { count: 3 });
    expect(out.blobs).toHaveLength(1);
    expect(out.text).toContain('每次最多 1 张');
    expect(fake.calls).toHaveLength(2);
  });

  it('clamps count to the remaining daily allowance', async () => {
    const fake = fakeQwen();
    const { world } = makeWorld({
      fetchImpl: fake.fetchImpl,
      cfg: { maxImagesPerCall: 4, dailyLimit: 2, cooldownSeconds: 0 },
    });
    const out = await callDraw(world, '一只猫', undefined, { count: 4 });
    expect(out.blobs).toHaveLength(2);
    expect(out.text).toContain('今天只剩 2 张');
    const vars = await world.envPromptVars();
    expect(vars!['petDraw.today']).toBe('2/2');
  });

  it('uses the data-directory fallback when saveDir is empty', async () => {
    const base = root();
    const fake = fakeQwen();
    const { world } = makeWorld({
      dataDir: base,
      fetchImpl: fake.fetchImpl,
      cfg: { saveDir: '', maxImagesPerCall: 1, dailyLimit: 10, cooldownSeconds: 0 },
    });
    await callDraw(world, '一只猫');
    expect(existsSync(join(base, 'pet-draw', 'index.json'))).toBe(true);
    const vars = await world.envPromptVars();
    expect(vars!['petDraw.folder']).toContain('数据目录下的 pet-draw');
  });
});

describe('rating and gallery', () => {
  it('moves all pictures of the last drawing into favorite', async () => {
    const base = root();
    const saveDir = join(base, 'art');
    const fake = fakeQwen();
    const { world } = makeWorld({
      dataDir: base,
      fetchImpl: fake.fetchImpl,
      cfg: { saveDir, maxImagesPerCall: 2, dailyLimit: 10, cooldownSeconds: 0 },
    });
    await callDraw(world, '一只猫', undefined, { count: 2 });
    const before = readIndex(saveDir).drawings;
    const rated = await callTool(world, 'pet_draw_rate', { rating: 'favorite', all: true, note: '都喜欢' });

    expect(rated.failed).toBeUndefined();
    expect(rated.text).toContain('最喜欢');
    expect(readdirSync(join(saveDir, 'favorite'))).toHaveLength(2);
    expect(readdirSync(join(saveDir, 'unrated'))).toHaveLength(0);
    const after = readIndex(saveDir).drawings;
    expect(after.map((art) => art.id)).toEqual(expect.arrayContaining(before.map((art) => art.id)));
    expect(after.every((art) => art.rating === 'favorite')).toBe(true);
  });

  it('rates one specific drawing and rejects an unknown id', async () => {
    const base = root();
    const saveDir = join(base, 'art');
    const fake = fakeQwen();
    const { world } = makeWorld({
      dataDir: base,
      fetchImpl: fake.fetchImpl,
      cfg: { saveDir, maxImagesPerCall: 2, dailyLimit: 10, cooldownSeconds: 0 },
    });
    await callDraw(world, '一只猫', undefined, { count: 2 });
    const [first, second] = readIndex(saveDir).drawings;
    const rated = await callTool(world, 'pet_draw_rate', { rating: 'like', id: first!.id });
    expect(rated.text).toContain(first!.id);
    expect(readIndex(saveDir).drawings.find((art) => art.id === first!.id)?.rating).toBe('like');
    expect(readIndex(saveDir).drawings.find((art) => art.id === second!.id)?.rating).toBe('unrated');

    const missing = await callTool(world, 'pet_draw_rate', { rating: 'like', id: 'nope' });
    expect(missing.text).toContain('没找到');
  });

  it('browses the folder, filters by rating and attaches one picture', async () => {
    const base = root();
    const saveDir = join(base, 'art');
    const fake = fakeQwen();
    const { world } = makeWorld({
      dataDir: base,
      fetchImpl: fake.fetchImpl,
      cfg: { saveDir, maxImagesPerCall: 2, dailyLimit: 10, cooldownSeconds: 0 },
    });
    await callDraw(world, '一只猫', undefined, { count: 2 });
    const [first] = readIndex(saveDir).drawings;
    await callTool(world, 'pet_draw_rate', { rating: 'like', id: first!.id });

    const all = await callTool(world, 'pet_draw_gallery', { rating: 'all', limit: 10 });
    expect(all.text).toContain('共 2 张');
    expect(all.text).toContain(first!.id);

    const liked = await callTool(world, 'pet_draw_gallery', { rating: 'like', attach: true });
    expect(liked.blobs).toHaveLength(1);
    const blob = liked.blobs![0]!;
    expect('bytes' in blob ? blob.mime : undefined).toBe('image/png');

    const one = await callTool(world, 'pet_draw_gallery', { id: first!.id });
    expect(one.blobs).toHaveLength(1);
    expect(one.text).toContain('图在附件里');
  });
});

describe('settings', () => {
  it('lets the player change the limits and saves them', async () => {
    const base = root();
    const next = join(base, 'next-art');
    const patches: Array<Partial<PetDrawConfigSection>> = [];
    const { world, cfg } = makeWorld({
      dataDir: base,
      persist: (patch) => patches.push(patch),
      cfg: { dailyLimit: 20, maxImagesPerCall: 1, cooldownSeconds: 0 },
    });

    const out = await callTool(world, 'pet_draw_settings', {
      dailyLimit: 5,
      maxImagesPerCall: 2,
      saveDir: next,
      budgetCny: 10,
    });
    expect(out.failed).toBeUndefined();
    expect(patches).toEqual([{ dailyLimit: 5, maxImagesPerCall: 2, saveDir: next, budgetCny: 10 }]);
    expect(cfg.dailyLimit).toBe(5);
    expect(cfg.maxImagesPerCall).toBe(2);
    expect(cfg.budgetCny).toBe(10);
    expect(cfg.saveDir).toBe(next);
    expect(existsSync(next)).toBe(true);
    expect(out.text).toContain('每天最多 5 张');
    expect(out.text).toContain('每次最多 2 张');
  });

  it('rejects an out-of-range per-call cap and a system folder', async () => {
    const { world } = makeWorld();
    await expect(callTool(world, 'pet_draw_settings', { maxImagesPerCall: 5 })).resolves.toMatchObject({ failed: true });
    await expect(callTool(world, 'pet_draw_settings', { saveDir: 'C:\\Windows' })).resolves.toMatchObject({ failed: true });
    await expect(callTool(world, 'pet_draw_settings', { saveDir: 'relative\\art' })).resolves.toMatchObject({ failed: true });
  });

  it('resets saveDir with an empty string', async () => {
    const { world, cfg } = makeWorld({ cfg: { saveDir: root(), cooldownSeconds: 0 } });
    const out = await callTool(world, 'pet_draw_settings', { saveDir: '' });
    expect(out.failed).toBeUndefined();
    expect(cfg.saveDir).toBe('');
  });
});

describe('quota', () => {
  it('answers in pictures, includes the API rate limit and hides money', async () => {
    const fake = fakeQwen();
    const { world } = makeWorld({
      fetchImpl: fake.fetchImpl,
      cfg: { dailyLimit: 5, maxImagesPerCall: 2, cooldownSeconds: 0, budgetCny: 10 },
    });
    const out = await callTool(world, 'pet_draw_quota', {});
    expect(out.failed).toBeUndefined();
    expect(out.text).toContain('今天还能画 5 张');
    expect(out.text).toContain('每次最多 2 张');
    expect(out.text).toContain('每 6 秒最多 2 次请求');
    expect(out.text).toContain('大约还能画 55 张');
    expect(out.text).not.toContain('0.18');
    expect(out.text).not.toContain('元');
    expect(out.text).toContain('账户余额我这边查不到');
  });

  it('caches the query and can refresh it', async () => {
    const fake = fakeQwen();
    const { world } = makeWorld({ fetchImpl: fake.fetchImpl, cfg: { dailyLimit: 5 } });
    await callTool(world, 'pet_draw_quota', {});
    await callTool(world, 'pet_draw_quota', {});
    expect(fake.calls.filter((call) => call.url.includes('/quotas')).length).toBe(1);
    await callTool(world, 'pet_draw_quota', { refresh: true });
    expect(fake.calls.filter((call) => call.url.includes('/quotas')).length).toBe(2);
  });

  it('reports missing key and partial API failure without inventing a balance', async () => {
    const noKey = makeWorld({ secret: '', cfg: { dailyLimit: 5 } });
    const missing = await callTool(noKey.world, 'pet_draw_quota', {});
    expect(missing.failed).toBe(true);
    expect(missing.text).toContain('还没配 API Key');

    const fake = fakeQwen({ quotaStatus: 500, modelsStatus: 500 });
    const { world } = makeWorld({ fetchImpl: fake.fetchImpl, cfg: { dailyLimit: 5 } });
    const out = await callTool(world, 'pet_draw_quota', {});
    expect(out.text).toContain('API 额度这次没查全');
    expect(out.text).not.toMatch(/\d+(\.\d+)?\s*元/);
  });

  it('shows the drawing folder and per-call cap in the WebUI', async () => {
    const base = root();
    const saveDir = join(base, 'art');
    const fake = fakeQwen();
    const { world } = makeWorld({
      dataDir: base,
      fetchImpl: fake.fetchImpl,
      cfg: { saveDir, maxImagesPerCall: 2, dailyLimit: 5, cooldownSeconds: 0 },
    });
    await callDraw(world, '一只猫');
    const ui = world.webUi!('zh');
    expect(ui.lamps?.find((lamp) => lamp.label === '画夹')?.state).toBe('online');
    expect(ui.badges?.find((badge) => badge.label === '每次')?.value).toBe('最多 2 张');
  });
});
