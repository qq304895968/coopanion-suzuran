/**
 * 契约形状 + 真起一次侧车 + 双击桌宠。
 * - 契约:默认值、配置组路径、工具声明、describe.json 同步。
 * - 集成:spawn → 端口握手 → screen_look → PNG 附件;改热键 → 侧车自动重启。
 * - 双击:往假事件库塞两条 `desktop-pet.touch`,靠得够近就该抓一帧。
 *   真按下热键那条分支由 `python sidecar/selftest.py` 覆盖。
 */
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import type { EventStoreReader, ToolOutcome, WorldHost } from 'cortico/core/types.ts';
import { SCREEN } from '../src/definition.ts';
import { feedbackOptions, monitorOptions, SCREEN_DEFAULTS } from '../src/config.ts';
import { ScreenWorld } from '../src/world.ts';

const PNG_MAGIC = '89504e470d0a1a0a';

interface Pushed {
  type: string;
  text: string;
  origin?: string;
  blobs?: Array<{ bytes: Uint8Array; mime: string }>;
}

interface Stored {
  cursor: number;
  type: string;
  ts: string;
  meta?: unknown;
}

/** 够用的内存事件库:只实现 World 真会用到的那几个方法。 */
class MemoryStore {
  private items: Stored[] = [];

  latestCursor(): number {
    return this.items.length;
  }

  get(cursor: number): Stored | undefined {
    return this.items[cursor - 1];
  }

  range(query: { fromCursor?: number; toCursor?: number }): Stored[] {
    return this.items.filter((e) => (query.fromCursor === undefined || e.cursor >= query.fromCursor)
      && (query.toCursor === undefined || e.cursor <= query.toCursor));
  }

  around(): Stored[] {
    return [];
  }

  grep(): never[] {
    return [];
  }

  append(type: string, ts: string, meta?: unknown): void {
    this.items.push({ cursor: this.items.length + 1, type, ts, ...(meta === undefined ? {} : { meta }) });
  }
}

function fakeHost(): { host: WorldHost; events: Pushed[]; store: MemoryStore } {
  const events: Pushed[] = [];
  const store = new MemoryStore();
  const host = {
    pushEvent: async (event: Pushed) => {
      events.push(event);
      store.append(event.type, new Date().toISOString());
      return { ...event, cursor: store.latestCursor(), origin: event.origin ?? 'external' };
    },
    store: store as unknown as EventStoreReader,
    log: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} },
  } as unknown as WorldHost;
  return { host, events, store };
}

function mount(cfg = { ...SCREEN_DEFAULTS, enabled: true }) {
  return new ScreenWorld({ cfg, timezone: 'Asia/Shanghai', dataDir: tmpdir() });
}

async function lookUntilReady(world: ScreenWorld, deadlineMs: number): Promise<ToolOutcome> {
  const deadline = Date.now() + deadlineMs;
  let last: ToolOutcome | null = null;
  while (Date.now() < deadline) {
    const outcome = await world.tools()[0]!.handler({}, {} as never);
    if (typeof outcome !== 'string') {
      last = outcome;
      if (!outcome.failed) return outcome;
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw last ?? new Error('侧车一直没起来');
}

/** 等到出现满足条件的推送,返回它。 */
async function waitFor(events: Pushed[], match: (e: Pushed) => boolean, timeoutMs: number): Promise<Pushed | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const hit = events.find(match);
    if (hit) return hit;
    await new Promise((r) => setTimeout(r, 100));
  }
  return null;
}

/** 只认 `from` 之后新冒出来的推送,免得撞上上一轮的结果。 */
async function waitForNew(
  events: Pushed[],
  from: number,
  match: (e: Pushed) => boolean,
  timeoutMs: number,
): Promise<Pushed | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const hit = events.slice(from).find(match);
    if (hit) return hit;
    await new Promise((r) => setTimeout(r, 100));
  }
  return null;
}

const isDoubleClickShot = (e: Pushed): boolean => e.text.includes('双击了你的身体');
const pokeMeta = (count: number, kind = 'poke'): unknown => ({ touch: { kind, count, woke: false, crashed: false } });

describe('definition', () => {
  it('keeps a usable default config', () => {
    expect(SCREEN.id).toBe('screen');
    expect(SCREEN.defaults().enabled).toBe(false);
    expect(SCREEN.defaults().hotkey).toMatch(/^[a-z+0-9]+$/);
    expect(SCREEN.defaults().doubleClick).toBe(true);
    expect(SCREEN.defaults().maxEdge).toBeGreaterThanOrEqual(480);
    // 默认值必须落在选项表里,否则 WebUI 一打开就是红框。
    expect(monitorOptions('zh').map((o) => o.value)).toContain(SCREEN.defaults().monitor);
    expect(feedbackOptions('zh').map((o) => o.value)).toContain(SCREEN.defaults().feedback);
    // 主动看默认必须是关的。
    expect(SCREEN.defaults().proactive).toBe(false);
    expect(SCREEN.defaults().memorableScore).toBe(8);
  });

  it('declares config keys under worlds.screen and reaches WebUI', () => {
    const world = mount();
    const decl = world.webUi?.('zh');
    expect(decl?.config?.[0]?.owner).toBe('world:screen');
    const keys = Object.keys((decl?.config?.[0]?.schema.properties ?? {}) as Record<string, unknown>);
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) expect(key.startsWith('worlds.screen.')).toBe(true);
    // 环境提示词里引用的变量都得在 vars 里声明,否则模板渲染会留占位符。
    const vars = decl?.promptDocs?.[0]?.vars?.map((v) => v.name) ?? [];
    expect(vars.sort()).toEqual([
      'screen.hotkey', 'screen.last', 'screen.memorable', 'screen.monitor',
      'screen.proactive', 'screen.status', 'screen.threshold',
    ]);
  });

  it('exposes the look, rate and memories tools', () => {
    const world = mount();
    const tools = world.tools();
    expect(tools.map((t) => t.name)).toEqual(['screen_look', 'screen_rate', 'screen_memories']);
    for (const tool of tools) expect(typeof tool.handler).toBe('function');
    expect(SCREEN.describe?.tools.map((t) => t.name)).toEqual(tools.map((t) => t.name));
  });

  it('keeps describe.json in sync with the definition', () => {
    // describe.json 是发布物,`pnpm describe:extension` 才会重写它;这里防手改漏。
    const described = JSON.parse(readFileSync(new URL('../describe.json', import.meta.url), 'utf8')) as {
      tools: unknown;
      events: unknown;
      prompts: Array<{ content: string }>;
    };
    expect(described.tools).toEqual(SCREEN.describe?.tools);
    expect(described.events).toEqual(SCREEN.describe?.events);
    // 提示词正文在文件里,describe.json 是它的镜像,两边必须一字不差。
    const envPrompt = readFileSync(new URL('../src/ENV_PROMPT.md', import.meta.url), 'utf8');
    expect(described.prompts[0]!.content).toBe(envPrompt);
  });
});

describe.skipIf(process.platform !== 'win32' || process.env.COOPANION_SCREEN_INTEGRATION !== '1')('sidecar integration (Windows desktop opt-in)', () => {
  const dir = process.platform === 'win32' && process.env.COOPANION_SCREEN_INTEGRATION === '1'
    ? mkdtempSync(join(tmpdir(), 'coo-screen-test-')) : join(tmpdir(), 'coo-screen-not-started');
  // 空热键:测试不跟正在跑的 Coopanion 抢 ctrl+alt+q。
  const cfg = { ...SCREEN_DEFAULTS, enabled: true, hotkey: '' };
  const world = new ScreenWorld({ cfg, timezone: 'Asia/Shanghai', dataDir: dir });
  const { host, events, store } = fakeHost();

  afterAll(async () => {
    await world.stop();
    rmSync(dir, { recursive: true, force: true });
  });

  it('mounts with no hotkey at all', async () => {
    await world.start(host);
    expect(events[0]?.text).toContain('已挂载');
    expect(events[0]?.text).toContain('双击桌宠');
  });

  it('captures through screen_look and returns a PNG blob', async () => {
    const result = await lookUntilReady(world, 20_000);
    expect(result.failed).toBeUndefined();
    expect(result.text).toMatch(/\d+×\d+/);
    expect(result.text).toContain('截图 id');
    expect(result.blobs?.length).toBe(1);
    const blob = result.blobs![0]!;
    expect(blob).toHaveProperty('mime', 'image/png');
    const bytes = (blob as { bytes: Uint8Array }).bytes;
    expect(Buffer.from(bytes.subarray(0, 8)).toString('hex')).toBe(PNG_MAGIC);
    expect(bytes.length).toBeGreaterThan(10_000);
    expect(bytes.length).toBeLessThan(8_000_000);
  }, 40_000);

  it('ignores a single poke, and ignores petting', async () => {
    const from = events.length;
    store.append('desktop-pet.touch', new Date().toISOString(), pokeMeta(1));
    // 连着摸两下也不算双击:kind 不是 poke。
    const now = Date.now();
    store.append('desktop-pet.touch', new Date(now).toISOString(), pokeMeta(1, 'pet'));
    store.append('desktop-pet.touch', new Date(now + 100).toISOString(), pokeMeta(1, 'pet'));
    await new Promise((r) => setTimeout(r, 1_200));
    expect(events.slice(from).some(isDoubleClickShot)).toBe(false);
  });

  it('treats two quick pokes as a double-click and captures', async () => {
    const from = events.length;
    const now = Date.now();
    store.append('desktop-pet.touch', new Date(now).toISOString(), pokeMeta(1));
    store.append('desktop-pet.touch', new Date(now + 120).toISOString(), pokeMeta(1));

    const shot = await waitForNew(events, from, isDoubleClickShot, 8_000);
    expect(shot).not.toBeNull();
    expect(shot!.blobs?.length).toBe(1);
    expect(shot!.blobs![0]!.mime).toBe('image/png');
    expect(Buffer.from(shot!.blobs![0]!.bytes.subarray(0, 8)).toString('hex')).toBe(PNG_MAGIC);
    // 截图上带的是 external:屏幕内容是外来的,不是内部指令。
    expect(shot!.origin).toBe('external');
  }, 20_000);

  it('also accepts a coalesced count=2 poke', async () => {
    const from = events.length;
    store.append('desktop-pet.touch', new Date().toISOString(), pokeMeta(2));

    const shot = await waitForNew(events, from, isDoubleClickShot, 8_000);
    expect(shot).not.toBeNull();
    expect(shot!.blobs?.length).toBe(1);
  }, 20_000);

  it('restarts the sidecar by itself when the hotkey changes', async () => {
    cfg.hotkey = 'ctrl+alt+z';
    cfg.feedback = 'off';
    // 两秒一拍,重启一次最多等它握手两三秒。
    await new Promise((r) => setTimeout(r, 3_000));
    const result = await lookUntilReady(world, 25_000);
    expect(result.failed).toBeUndefined();
    expect(result.blobs?.length).toBe(1);

    // 残句不能让侧车停摆:校验失败时保留正在跑的那个。
    cfg.hotkey = 'ctrl+';
    await new Promise((r) => setTimeout(r, 3_000));
    const still = await world.tools()[0]!.handler({}, {} as never);
    expect(typeof still === 'string' ? still : still.failed).toBeFalsy();
  }, 60_000);
});
