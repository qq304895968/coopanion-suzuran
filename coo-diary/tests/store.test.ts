import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  DiaryError, appendEntry, countEntries, entryPath, isRealDate, listEntries, partsIn, readEntry, weekdayIn,
} from '../src/store.ts';

let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'coo-diary-store-')); });
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const write = (date: string, body: string) =>
  appendEntry({ dir, date, weekday: weekdayIn('Asia/Shanghai', date), stamp: '21:30', body });

describe('日期与时刻', () => {
  it('只接受真实存在的 YYYY-MM-DD', () => {
    expect(isRealDate('2026-10-27')).toBe(true);
    expect(isRealDate('2024-02-29')).toBe(true);
    expect(isRealDate('2026-02-29')).toBe(false);
    expect(isRealDate('2026-02-30')).toBe(false);
    expect(isRealDate('2026-13-01')).toBe(false);
    expect(isRealDate('2026-1-1')).toBe(false);
    expect(isRealDate('../../etc/passwd')).toBe(false);
  });

  it('partsIn 按部署时区给日期、时刻与星期', () => {
    const at = new Date('2026-10-27T14:05:00Z');
    expect(partsIn('Asia/Shanghai', at)).toEqual({ date: '2026-10-27', time: '22:05', weekday: '星期二' });
    expect(partsIn('UTC', at)).toEqual({ date: '2026-10-27', time: '14:05', weekday: '星期二' });
    expect(partsIn('Asia/Shanghai', new Date('2026-10-27T16:30:00Z')).date).toBe('2026-10-28');
  });

  it('weekdayIn 给某天的星期', () => {
    expect(weekdayIn('Asia/Shanghai', '2026-10-27')).toBe('星期二');
    expect(weekdayIn('Asia/Shanghai', '2026-10-25')).toBe('星期日');
  });
});

describe('路径落点', () => {
  it('只有日期本身能决定文件名', () => {
    expect(entryPath(dir, '2026-10-27')).toBe(resolve(dir, '2026-10-27.md'));
    for (const bad of ['../../evil', '2026-10-27/../../x', '../2026-10-27', 'notes']) {
      expect(() => entryPath(dir, bad)).toThrow(DiaryError);
    }
  });

  it('目录没设置或不是绝对路径时拒绝', () => {
    expect(() => entryPath('', '2026-10-27')).toThrow(/还没设置/);
    expect(() => entryPath('  ', '2026-10-27')).toThrow(/还没设置/);
    expect(() => entryPath('diary', '2026-10-27')).toThrow(/绝对路径/);
  });
});

describe('追加', () => {
  it('第一篇新建文件并写日期标题,第二篇只追加小节', () => {
    const first = write('2026-10-27', '今天去看了海。');
    expect(first.index).toBe(1);
    const text = readFileSync(join(dir, '2026-10-27.md'), 'utf8');
    expect(text.startsWith('# 2026-10-27 星期二\n\n## 21:30\n\n今天去看了海。\n')).toBe(true);

    const second = appendEntry({ dir, date: '2026-10-27', weekday: '星期二', stamp: '23:10', mood: '平静', body: '睡前补一句。' });
    expect(second.index).toBe(2);
    const after = readFileSync(join(dir, '2026-10-27.md'), 'utf8');
    expect(after).toBe(`${text}## 23:10 · 平静\n\n睡前补一句。\n\n`);
    expect(countEntries(after)).toBe(2);
  });

  it('已写下的内容不会被后一次写入改动', () => {
    write('2026-10-27', '第一件。');
    const before = readFileSync(join(dir, '2026-10-27.md'), 'utf8');
    write('2026-10-27', '第二件。');
    const after = readFileSync(join(dir, '2026-10-27.md'), 'utf8');
    expect(after.startsWith(before)).toBe(true);
  });

  it('拒绝空正文、超长正文和超长心情,且不留下文件', () => {
    expect(() => write('2026-10-27', '   ')).toThrow(/正文是空的/);
    expect(() => write('2026-10-27', 'x'.repeat(20_001))).toThrow(/超过单篇上限/);
    expect(() => appendEntry({ dir, date: '2026-10-27', weekday: '星期二', stamp: '21:30', mood: '长'.repeat(41), body: '正文' })).toThrow(/心情/);
    expect(readEntry(dir, '2026-10-27')).toBeNull();
  });

  it('目录还不存在时建出来', () => {
    const nested = join(dir, 'a', 'b');
    appendEntry({ dir: nested, date: '2026-10-27', weekday: '星期二', stamp: '21:30', body: '你好' });
    expect(readEntry(nested, '2026-10-27')).toContain('你好');
  });
});

describe('读取与列出', () => {
  it('没有写的天读回 null', () => {
    expect(readEntry(dir, '2026-10-27')).toBeNull();
  });

  it('列表按日期从新到旧,带上篇数与字数', () => {
    write('2026-10-20', '补记一下。');
    write('2026-10-27', '今天去看了海。');
    write('2026-10-27', '又是海边。');
    writeFileSync(join(dir, 'notes.md'), '# 不是日记\n', 'utf8');
    writeFileSync(join(dir, 'README.txt'), 'ignore me', 'utf8');

    const summaries = listEntries(dir, { limit: 10 });
    expect(summaries.map((s) => s.date)).toEqual(['2026-10-27', '2026-10-20']);
    expect(summaries[0]).toMatchObject({ entries: 2 });
    expect(summaries[0]!.chars).toBeGreaterThan(summaries[1]!.chars);
  });

  it('from / to / limit 都生效', () => {
    for (const date of ['2026-10-01', '2026-10-10', '2026-10-20']) write(date, '一句。');
    expect(listEntries(dir, { from: '2026-10-10', limit: 10 }).map((s) => s.date)).toEqual(['2026-10-20', '2026-10-10']);
    expect(listEntries(dir, { to: '2026-10-10', limit: 10 }).map((s) => s.date)).toEqual(['2026-10-10', '2026-10-01']);
    expect(listEntries(dir, { limit: 1 }).map((s) => s.date)).toEqual(['2026-10-20']);
  });

  it('同名的目录不会被当成日记读', () => {
    mkdirSync(join(dir, '2026-10-27.md'));
    expect(() => readEntry(dir, '2026-10-27')).toThrow(/不是普通文件/);
    expect(listEntries(dir, { limit: 10 })).toEqual([]);
  });

  it('目录还不存在时列表是空的', () => {
    expect(listEntries(join(dir, 'missing'), { limit: 10 })).toEqual([]);
  });
});
