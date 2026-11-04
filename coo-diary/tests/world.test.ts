import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ToolCallContext, ToolDef, ToolOutcome, World } from 'cortico/core/types.ts';
import { dryMountWorld, fakeWorldContext } from 'cortico/extensions/dry-mount.ts';
import { DIARY } from '../src/definition.ts';
import { DIARY_DEFAULTS, type DiaryConfigSection } from '../src/config.ts';
import { DiaryWorld } from '../src/world.ts';
import { FakeHost } from './helpers/fake-host.ts';

const TIMEZONE = 'Asia/Shanghai';
const call = {} as ToolCallContext;

let scratchDir: string;
let diaryDir: string;
let botDir: string;
let dataDir: string;
beforeEach(() => {
  scratchDir = mkdtempSync(join(tmpdir(), 'coo-diary-world-'));
  diaryDir = join(scratchDir, 'diary');
  botDir = scratchDir;
  dataDir = join(scratchDir, 'data');
  mkdirSync(dataDir, { recursive: true });
});
afterEach(() => {
  vi.useRealTimers();
  rmSync(scratchDir, { recursive: true, force: true });
});

function build(patch: Partial<DiaryConfigSection> = {}): { cfg: DiaryConfigSection; world: DiaryWorld } {
  const cfg: DiaryConfigSection = { ...DIARY_DEFAULTS, enabled: true, dir: diaryDir, ...patch };
  return { cfg, world: new DiaryWorld({ cfg, timezone: TIMEZONE, botDir, dataDir }) };
}

function toolNamed(world: World, name: string): ToolDef {
  const tool = world.tools().find((t) => t.name === name);
  if (!tool) throw new Error(`no tool ${name}`);
  return tool;
}

const asOutcome = (result: string | ToolOutcome): ToolOutcome =>
  typeof result === 'string' ? { text: result } : result;

/** 1×1 的 PNG,只用来验证复制与附件,不需要真的能显示。 */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lw5G9QAAAABJRU5ErkJggg==',
  'base64',
);

function configurePetDraw(saveDir: string): void {
  writeFileSync(
    join(botDir, 'config.json'),
    `${JSON.stringify({ worlds: { 'pet-draw': { saveDir } } }, null, 2)}\n`,
    'utf8',
  );
}

interface SeedArt {
  id: string;
  date: string;
  subject: string;
  rating?: 'unrated' | 'favorite' | 'like' | 'neutral' | 'dislike';
  note?: string;
}

function seedArt(dir: string, seed: SeedArt): void {
  const rating = seed.rating ?? 'unrated';
  mkdirSync(join(dir, rating), { recursive: true });
  const file = `${rating}/${seed.id}.png`;
  writeFileSync(join(dir, file), PNG);
  const indexFile = join(dir, 'index.json');
  const index = existsSync(indexFile)
    ? JSON.parse(readFileSync(indexFile, 'utf8')) as { version: number; updatedAt: string; drawings: unknown[] }
    : { version: 1, updatedAt: '', drawings: [] as unknown[] };
  index.drawings.unshift({
    id: seed.id,
    file,
    mime: 'image/png',
    width: 1,
    height: 1,
    bytes: PNG.length,
    createdAt: `${seed.date}T09:30:00+08:00`,
    subject: seed.subject,
    style: '蜡笔涂鸦',
    personaKind: 'child',
    rating,
    ...(seed.note ? { note: seed.note } : {}),
  });
  writeFileSync(indexFile, `${JSON.stringify(index, null, 2)}\n`, 'utf8');
}

interface SeedMoment {
  id: string;
  date: string;
  score: number;
  summary: string;
}

function seedMoment(seed: SeedMoment): void {
  const root = join(dataDir, 'coo-screen');
  mkdirSync(join(root, 'moments'), { recursive: true });
  const file = `moments/${seed.id}.png`;
  writeFileSync(join(root, file), PNG);
  const indexFile = join(root, 'moments.json');
  const index = existsSync(indexFile)
    ? JSON.parse(readFileSync(indexFile, 'utf8')) as { version: number; updatedAt: string; moments: unknown[] }
    : { version: 1, updatedAt: '', moments: [] as unknown[] };
  index.moments.unshift({
    id: seed.id,
    createdAt: `${seed.date}T10:00:00+08:00`,
    source: 'hotkey',
    file,
    width: 1,
    height: 1,
    monitor: '主显示器',
    score: seed.score,
    summary: seed.summary,
    memorable: true,
    ratedAt: `${seed.date}T10:01:00+08:00`,
  });
  writeFileSync(indexFile, `${JSON.stringify(index, null, 2)}\n`, 'utf8');
}

describe('装配', () => {
  it('干装载不报失败:装载器会接受它', async () => {
    const report = await dryMountWorld(DIARY, { scratchDir });
    expect(report.failures).toEqual([]);
  });

  it('tools() 的五个工具都写在 describe.tools 里', () => {
    const { world } = build();
    const declared = new Set((DIARY.describe?.tools ?? []).map((tool) => tool.name));
    expect(world.tools().map((tool) => tool.name)).toEqual(['diary_write', 'diary_read', 'diary_list', 'diary_art', 'diary_moment']);
    for (const tool of world.tools()) expect(declared.has(tool.name)).toBe(true);
  });

  it('挂载时投一条 diary.started 事件,origin 是 internal', async () => {
    const { world } = build();
    const host = new FakeHost();
    await world.start(host);
    expect(host.events.map((e) => e.type)).toEqual(['diary.started']);
    expect(host.events[0]!.origin).toBe('internal');
    await world.stop();
  });

  it('create() 拿到的是 worlds.diary 的活引用:改目录立即写别处', async () => {
    const ctx = { ...fakeWorldContext(DIARY, { scratchDir }), timezone: TIMEZONE };
    const world = DIARY.create(ctx);
    ctx.persist({ dir: diaryDir });
    await toolNamed(world, 'diary_write').handler({ text: '活引用。' }, call);
    expect(existsSync(join(diaryDir, `${todayIn()}.md`))).toBe(true);
  });
});

describe('diary_write', () => {
  it('写第一篇时建目录、写日期标题,回执给出文件名与篇数', async () => {
    const { world } = build();
    const outcome = asOutcome(await toolNamed(world, 'diary_write').handler({
      text: '今天去看了海。\n风很大。',
      date: '2026-10-27',
      time: '21:30',
    }, call));
    expect(outcome.failed).toBeUndefined();
    expect(outcome.text).toContain('2026-10-27.md');
    expect(outcome.text).toContain('第 1 篇');

    const text = readFileSync(join(diaryDir, '2026-10-27.md'), 'utf8');
    expect(text).toBe('# 2026-10-27 星期二\n\n## 21:30\n\n今天去看了海。\n风很大。\n\n');
  });

  it('同一天再写一篇是追加,标题带心情', async () => {
    const { world } = build();
    const write = toolNamed(world, 'diary_write');
    await write.handler({ text: '第一件。', date: '2026-10-27', time: '09:00' }, call);
    const second = asOutcome(await write.handler({ text: '第二件。', date: '2026-10-27', time: '23:10', mood: '平静' }, call));
    expect(second.text).toContain('第 2 篇');
    const text = readFileSync(join(diaryDir, '2026-10-27.md'), 'utf8');
    expect(text).toContain('## 09:00\n\n第一件。');
    expect(text.endsWith('## 23:10 · 平静\n\n第二件。\n\n')).toBe(true);
    expect(text.match(/^# /gm) ?? []).toHaveLength(1);
  });

  it('补写往日不给时刻时标题写「补记」', async () => {
    const { world } = build();
    await toolNamed(world, 'diary_write').handler({ text: '前几天的事。', date: '2026-10-20' }, call);
    expect(readFileSync(join(diaryDir, '2026-10-20.md'), 'utf8')).toContain('## 补记\n\n前几天的事。');
  });

  it('目录没设置时给失败回执并提示去填,不写任何文件', async () => {
    const { world } = build({ dir: '' });
    const outcome = asOutcome(await toolNamed(world, 'diary_write').handler({ text: '写不了。' }, call));
    expect(outcome.failed).toBe(true);
    expect(outcome.text).toContain('日记目录还没设置');
    expect(existsSync(scratchDir)).toBe(true);
    expect(existsSync(diaryDir)).toBe(false);
  });

  it('日期或时刻不合法时拒绝,不写文件', async () => {
    const { world } = build();
    const write = toolNamed(world, 'diary_write');
    const badDate = asOutcome(await write.handler({ text: '正文。', date: '../../evil' }, call));
    expect(badDate.failed).toBe(true);
    expect(badDate.text).toContain('YYYY-MM-DD');
    const badTime = asOutcome(await write.handler({ text: '正文。', date: '2026-10-27', time: '9:00' }, call));
    expect(badTime.failed).toBe(true);
    expect(existsSync(join(diaryDir, '2026-10-27.md'))).toBe(false);
  });

  it('空正文被拒绝', async () => {
    const { world } = build();
    const outcome = asOutcome(await toolNamed(world, 'diary_write').handler({ text: '  ' }, call));
    expect(outcome.failed).toBe(true);
    expect(outcome.text).toContain('正文是空的');
  });
});

describe('diary_read / diary_list', () => {
  it('读回某一天的原文', async () => {
    const { world } = build();
    await toolNamed(world, 'diary_write').handler({ text: '今天去看了海。', date: '2026-10-27', time: '21:30' }, call);
    const read = asOutcome(await toolNamed(world, 'diary_read').handler({ date: '2026-10-27' }, call));
    expect(read.text).toContain('# 2026-10-27 星期二');
    expect(read.text).toContain('今天去看了海。');
  });

  it('没有写的天说明没有日记', async () => {
    const { world } = build();
    const read = asOutcome(await toolNamed(world, 'diary_read').handler({ date: '2026-10-27' }, call));
    expect(read.text).toContain('没有日记');
  });

  it('不给日期时读最近几篇,按日期从早到晚拼起来', async () => {
    const { world } = build();
    const write = toolNamed(world, 'diary_write');
    for (const [date, body] of [['2026-10-25', '前天的事。'], ['2026-10-26', '昨天的事。'], ['2026-10-27', '今天的事。']] as const) {
      await write.handler({ text: body, date, time: '21:30' }, call);
    }
    const read = asOutcome(await toolNamed(world, 'diary_read').handler({ days: 2 }, call));
    expect(read.text.indexOf('昨天的事。')).toBeLessThan(read.text.indexOf('今天的事。'));
    expect(read.text).not.toContain('前天的事。');
  });

  it('超过 maxChars 时截断并说明', async () => {
    const { world } = build();
    await toolNamed(world, 'diary_write').handler({ text: '字'.repeat(3000), date: '2026-10-27', time: '21:30' }, call);
    const read = asOutcome(await toolNamed(world, 'diary_read').handler({ date: '2026-10-27', maxChars: 500 }, call));
    expect(read.text.length).toBeLessThan(700);
    expect(read.text).toContain('没带回');
  });

  it('列出写过的天,带篇数与字数', async () => {
    const { world } = build();
    const write = toolNamed(world, 'diary_write');
    await write.handler({ text: '一句话。', date: '2026-10-20', time: '21:30' }, call);
    await write.handler({ text: '两句话。今天很好。', date: '2026-10-27', time: '21:30' }, call);
    const list = asOutcome(await toolNamed(world, 'diary_list').handler({}, call));
    const lines = list.text.split('\n');
    expect(lines[0]).toMatch(/^2026-10-27 {2}1 篇 {2}\d+ 字$/);
    expect(lines[1]).toMatch(/^2026-10-20 {2}1 篇 {2}\d+ 字$/);
  });

  it('空目录时读者两个工具都说还没有日记', async () => {
    const { world } = build();
    expect(asOutcome(await toolNamed(world, 'diary_read').handler({ days: 3 }, call)).text).toContain('还没有日记');
    expect(asOutcome(await toolNamed(world, 'diary_list').handler({}, call)).text).toContain('还没有日记');
  });
});

describe('和画画插件联动', () => {
  const day = '2026-10-28';
  let artDir: string;

  beforeEach(() => {
    artDir = join(scratchDir, 'art');
    mkdirSync(artDir, { recursive: true });
    configurePetDraw(artDir);
  });

  it('diary_art 只列当天的画,并把图作为附件交回来', async () => {
    seedArt(artDir, { id: 'd-1', date: day, subject: '一只看星星的小狐狸', rating: 'like', note: '喜欢' });
    seedArt(artDir, { id: 'd-2', date: '2026-10-27', subject: '昨天画的画' });
    const outcome = asOutcome(await toolNamed(build().world, 'diary_art').handler({ date: day }, call));
    expect(outcome.failed).toBeUndefined();
    expect(outcome.text).toContain(`${day} 画过 1 张`);
    expect(outcome.text).toContain('d-1');
    expect(outcome.text).toContain('一只看星星的小狐狸');
    // 只看列表部分:结尾的操作提示里含有工具名 pet_draw,不能用整段文本判断。
    const listPart = outcome.text
      .split('\n')
      .filter((line) => !/diary_write 的 arts|pet_draw/.test(line))
      .join('\n');
    expect(listPart).not.toContain('d-2');
    expect(outcome.blobs).toHaveLength(1);
    const blob = outcome.blobs![0]!;
    expect('bytes' in blob && blob.bytes.length).toBe(PNG.length);
  });

  it('diary_write 用 arts 复制图片,并在正文末尾写 Markdown 引用', async () => {
    seedArt(artDir, { id: 'd-1', date: day, subject: '一只看星星的小狐狸', rating: 'like' });
    const outcome = asOutcome(await toolNamed(build().world, 'diary_write').handler({
      text: '今天画了一只小狐狸。',
      date: day,
      time: '21:00',
      arts: ['d-1'],
    }, call));
    expect(outcome.failed).toBeUndefined();
    expect(outcome.text).toContain('引用了 1 张画');
    const markdown = readFileSync(join(diaryDir, `${day}.md`), 'utf8');
    expect(markdown).toContain('今天画了一只小狐狸。');
    expect(markdown).toContain(`![一只看星星的小狐狸](images/${day}/d-1.png)`);
    const copied = join(diaryDir, 'images', day, 'd-1.png');
    expect(existsSync(copied)).toBe(true);
    expect(readFileSync(copied).equals(PNG)).toBe(true);
  });

  it('includeDayArt 把这一天画过的画全部引用,并与 arts 去重', async () => {
    seedArt(artDir, { id: 'd-1', date: day, subject: '第一张' });
    seedArt(artDir, { id: 'd-2', date: day, subject: '第二张' });
    const outcome = asOutcome(await toolNamed(build().world, 'diary_write').handler({
      text: '今天画了两张。',
      date: day,
      time: '21:00',
      arts: ['d-1'],
      includeDayArt: true,
    }, call));
    expect(outcome.text).toContain('引用了 2 张画');
    const markdown = readFileSync(join(diaryDir, `${day}.md`), 'utf8');
    expect(markdown).toContain(`images/${day}/d-1.png`);
    expect(markdown).toContain(`images/${day}/d-2.png`);
    expect(markdown.match(/images\//g)).toHaveLength(2);
  });

  it('未知的 id 直接拒绝,不写日记也不复制文件', async () => {
    const outcome = asOutcome(await toolNamed(build().world, 'diary_write').handler({
      text: '正文。',
      date: day,
      arts: ['d-nope'],
    }, call));
    expect(outcome.failed).toBe(true);
    expect(outcome.text).toContain('d-nope');
    expect(existsSync(join(diaryDir, `${day}.md`))).toBe(false);
    expect(existsSync(join(diaryDir, 'images'))).toBe(false);
  });

  it('没有画夹时 diary_art 给提示,写纯文字不受影响', async () => {
    rmSync(join(botDir, 'config.json'), { force: true });
    const { world } = build();
    const art = asOutcome(await toolNamed(world, 'diary_art').handler({ date: day }, call));
    expect(art.failed).toBeUndefined();
    expect(art.text).toContain('还没有画过画');
    expect(art.text).toContain('pet_draw');
    const written = asOutcome(await toolNamed(world, 'diary_write').handler({ text: '只写文字。', date: day }, call));
    expect(written.failed).toBeUndefined();
    expect(readFileSync(join(diaryDir, `${day}.md`), 'utf8')).toContain('只写文字。');
  });

  it('环境提示词报今天画过几张', () => {
    seedArt(artDir, { id: 'd-today', date: todayIn(), subject: '今天的画' });
    expect(build().world.envPromptVars()['diary.art']).toBe('今天画过 1 张');
  });
});

describe('和「看一眼」联动', () => {
  const day = '2026-10-28';

  it('diary_moment 只列当天的深刻瞬间,并带原图附件', async () => {
    seedMoment({ id: 'm-1', date: day, score: 9, summary: '他终于在游戏里通关了' });
    seedMoment({ id: 'm-2', date: '2026-10-27', score: 8, summary: '昨天的晚霞' });
    const outcome = asOutcome(await toolNamed(build().world, 'diary_moment').handler({ date: day }, call));
    expect(outcome.failed).toBeUndefined();
    expect(outcome.text).toContain(`${day} 有 1 个深刻瞬间`);
    expect(outcome.text).toContain('m-1');
    expect(outcome.text).toContain('9/10');
    expect(outcome.text).toContain('他终于在游戏里通关了');
    expect(outcome.text).toContain(join(dataDir, 'coo-screen', 'moments', 'm-1.png'));
    expect(outcome.text).not.toContain('m-2');
    expect(outcome.blobs).toHaveLength(1);
    expect(outcome.blobs![0]!.fallbackText).toContain('他终于在游戏里通关了');
  });

  it('diary_write 用 moments 复制截图,并写成「深刻瞬间」块', async () => {
    seedMoment({ id: 'm-1', date: day, score: 9, summary: '他终于在游戏里通关了' });
    const outcome = asOutcome(await toolNamed(build().world, 'diary_write').handler({
      text: '今天他打了好久,最后终于通关了。',
      date: day,
      time: '21:00',
      moments: ['m-1'],
    }, call));
    expect(outcome.failed).toBeUndefined();
    expect(outcome.text).toContain('记录了 1 个深刻瞬间');
    const markdown = readFileSync(join(diaryDir, `${day}.md`), 'utf8');
    expect(markdown).toContain('> 深刻瞬间 9/10:他终于在游戏里通关了');
    expect(markdown).toContain(`![他终于在游戏里通关了](images/${day}/moment-m-1.png)`);
    const copied = join(diaryDir, 'images', day, 'moment-m-1.png');
    expect(existsSync(copied)).toBe(true);
    expect(readFileSync(copied).equals(PNG)).toBe(true);
  });

  it('includeMemorable 收录这一天全部深刻瞬间,和 moments 去重', async () => {
    seedMoment({ id: 'm-1', date: day, score: 9, summary: '第一刻' });
    seedMoment({ id: 'm-2', date: day, score: 8, summary: '第二刻' });
    const outcome = asOutcome(await toolNamed(build().world, 'diary_write').handler({
      text: '今天有两件事。',
      date: day,
      time: '21:00',
      moments: ['m-1'],
      includeMemorable: true,
    }, call));
    expect(outcome.text).toContain('记录了 2 个深刻瞬间');
    const markdown = readFileSync(join(diaryDir, `${day}.md`), 'utf8');
    expect(markdown).toContain('moment-m-1.png');
    expect(markdown).toContain('moment-m-2.png');
    expect(markdown.match(/moment-m-/g)).toHaveLength(2);
  });

  it('未知的瞬间 id 直接拒绝,不写日记', async () => {
    const outcome = asOutcome(await toolNamed(build().world, 'diary_write').handler({
      text: '正文。',
      date: day,
      moments: ['m-nope'],
    }, call));
    expect(outcome.failed).toBe(true);
    expect(outcome.text).toContain('m-nope');
    expect(existsSync(join(diaryDir, `${day}.md`))).toBe(false);
  });

  it('没有深刻瞬间时给提示,并影响环境提示词', async () => {
    const { world } = build();
    const empty = asOutcome(await toolNamed(world, 'diary_moment').handler({ date: day }, call));
    expect(empty.text).toContain('还没有留下深刻瞬间');
    expect(world.envPromptVars()['diary.moments']).toBe('今天还没有');

    seedMoment({ id: 'm-today', date: todayIn(), score: 9, summary: '今天的一刻' });
    expect(build().world.envPromptVars()['diary.moments']).toBe('今天 1 个');
  });
});

describe('日记目录面板', () => {
  it('声明了目录面板,info 报路径和今天状态,open 调注入的 opener', async () => {
    const opened: string[] = [];
    const cfg: DiaryConfigSection = { ...DIARY_DEFAULTS, enabled: true, dir: diaryDir };
    const world = new DiaryWorld({
      cfg,
      timezone: TIMEZONE,
      botDir,
      dataDir,
      openPath: (dir) => opened.push(dir),
    });

    await toolNamed(world, 'diary_write').handler({ text: '今天写了。' }, call);

    const ui = world.webUi('zh');
    expect(ui.panels?.[0]).toMatchObject({
      id: 'folder',
      getMethods: ['open'],
    });

    const info = await ui.invoke!('folder', 'info', []) as {
      assigned: boolean;
      exists: boolean;
      todayFile: boolean;
      path: string;
    };
    expect(info).toMatchObject({ assigned: true, exists: true, todayFile: true });
    expect(info.path).toBe(diaryDir);

    const openResult = await ui.invoke!('folder', 'open', []) as { ok: boolean; path: string };
    expect(openResult.ok).toBe(true);
    expect(openResult.path).toBe(diaryDir);
    expect(opened).toEqual([diaryDir]);
  });

  it('没有设置目录时,open 返回失败而不是抛错', async () => {
    const { world } = build({ dir: '' });
    const ui = world.webUi('zh');
    const info = await ui.invoke!('folder', 'info', []) as { assigned: boolean };
    expect(info.assigned).toBe(false);

    const result = await ui.invoke!('folder', 'open', []) as { ok: boolean; error?: string };
    expect(result.ok).toBe(false);
    expect(result.error).toContain('还没设置');
  });

  it('未知 panel 或 method 直接报错', async () => {
    const { world } = build();
    const ui = world.webUi('zh');
    await expect(ui.invoke!('nope', 'info', [])).rejects.toThrow('unknown panel');
    await expect(ui.invoke!('folder', 'nope', [])).rejects.toThrow('unknown method');
  });
});

describe('环境提示词', () => {
  it('报目录、今天与今天的状态', async () => {
    const { world, cfg } = build();
    cfg.dir = '';
    expect(world.envPromptVars()).toMatchObject({ 'diary.dir': '(未设置)', 'diary.status': '还没设置目录' });

    cfg.dir = diaryDir;
    const before = world.envPromptVars();
    expect(before['diary.status']).toBe('今天还没写');
    expect(before['diary.today']).toMatch(/^\d{4}-\d{2}-\d{2} 星期[一二三四五六日]$/);

    await toolNamed(world, 'diary_write').handler({ text: '写了。' }, call);
    expect(world.envPromptVars()['diary.status']).toBe('今天写了 1 篇');
  });
});

describe('每日提醒', () => {
  it('到点且当天没写时推一条 diary.reminder,一天只推一次', async () => {
    vi.useFakeTimers({ now: new Date('2026-10-27T13:55:00Z') });
    const { world } = build({ reminderEnabled: true, reminderTime: '22:00' });
    const host = new FakeHost();
    await world.start(host);

    await vi.advanceTimersByTimeAsync(60_000);
    expect(host.events.map((e) => e.type)).toEqual(['diary.started']);

    vi.setSystemTime(new Date('2026-10-27T14:00:05Z'));
    await vi.advanceTimersByTimeAsync(30_000);
    expect(host.events.map((e) => e.type)).toEqual(['diary.started', 'diary.reminder']);
    expect(host.events[1]!.text).toContain('2026-10-27');

    await vi.advanceTimersByTimeAsync(6 * 60 * 60_000);
    expect(host.events.filter((e) => e.type === 'diary.reminder')).toHaveLength(1);
    await world.stop();
  });

  it('开关关着、还没到点、或当天已经写过时不推', async () => {
    vi.useFakeTimers({ now: new Date('2026-10-27T13:55:00Z') });

    const off = build({ reminderEnabled: false });
    const offHost = new FakeHost();
    await off.world.start(offHost);
    await vi.advanceTimersByTimeAsync(6 * 60 * 60_000);
    expect(offHost.events.map((e) => e.type)).toEqual(['diary.started']);
    await off.world.stop();

    vi.setSystemTime(new Date('2026-10-27T13:55:00Z'));
    const early = build({ reminderEnabled: true, reminderTime: '23:30' });
    const earlyHost = new FakeHost();
    await early.world.start(earlyHost);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(earlyHost.events.map((e) => e.type)).toEqual(['diary.started']);
    await early.world.stop();

    vi.setSystemTime(new Date('2026-10-27T13:55:00Z'));
    const written = build({ reminderEnabled: true, reminderTime: '22:00' });
    await toolNamed(written.world, 'diary_write').handler({ text: '已经写了。', date: '2026-10-27' }, call);
    const writtenHost = new FakeHost();
    await written.world.start(writtenHost);
    vi.setSystemTime(new Date('2026-10-27T14:00:05Z'));
    await vi.advanceTimersByTimeAsync(60_000);
    expect(writtenHost.events.map((e) => e.type)).toEqual(['diary.started']);
    await written.world.stop();
  });
});

function todayIn(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date());
}
