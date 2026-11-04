import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import {
  artDate, artFolder, artsOnDate, copyArtIntoDiary, loadArtIndex, markdownForArt,
} from '../src/art.ts';

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lw5G9QAAAABJRU5ErkJggg==',
  'base64',
);

let scratch: string;
let botDir: string;
let dataDir: string;

beforeEach(() => {
  scratch = mkdtempSync(join(tmpdir(), 'coo-diary-art-'));
  botDir = join(scratch, 'deployment');
  dataDir = join(botDir, 'data');
  mkdirSync(dataDir, { recursive: true });
});
afterEach(() => rmSync(scratch, { recursive: true, force: true }));

function writeConfig(saveDir: string): void {
  writeFileSync(join(botDir, 'config.json'), `${JSON.stringify({ worlds: { 'pet-draw': { saveDir } } })}\n`);
}

function seed(root: string, id: string, file: string, createdAt: string): void {
  mkdirSync(dirname(join(root, file)), { recursive: true });
  writeFileSync(join(root, file), PNG);
  const indexFile = join(root, 'index.json');
  const index = existsSync(indexFile)
    ? JSON.parse(readFileSync(indexFile, 'utf8')) as { version: number; updatedAt: string; drawings: unknown[] }
    : { version: 1, updatedAt: '', drawings: [] as unknown[] };
  index.drawings.push({
    id,
    file,
    mime: 'image/png',
    width: 1,
    height: 1,
    bytes: PNG.length,
    createdAt,
    subject: id,
    style: '蜡笔涂鸦',
    personaKind: 'child',
    rating: 'unrated',
  });
  writeFileSync(indexFile, `${JSON.stringify(index, null, 2)}\n`);
}

describe('找画夹', () => {
  it('优先用 worlds.pet-draw.saveDir,绝对路径原样', () => {
    const dir = join(scratch, 'pictures');
    writeConfig(dir);
    expect(artFolder(botDir, dataDir)).toEqual({ dir, configured: true });
  });

  it('相对路径按画画插件的规则落到 dataDir 下', () => {
    writeConfig('pictures');
    expect(artFolder(botDir, dataDir)).toEqual({ dir: join(dataDir, 'pictures'), configured: true });
  });

  it('优先读合并后的 worlds.draw.saveDir,旧配置仍然兼容', () => {
    const merged = join(scratch, 'draw');
    const legacy = join(scratch, 'legacy');
    writeFileSync(join(botDir, 'config.json'), `${JSON.stringify({
      worlds: { draw: { saveDir: merged }, 'pet-draw': { saveDir: legacy } },
    })}\n`);
    expect(artFolder(botDir, dataDir)).toEqual({ dir: merged, configured: true });
  });

  it('没设置时退回 <dataDir>/pet-draw', () => {
    expect(artFolder(botDir, dataDir)).toEqual({ dir: join(dataDir, 'pet-draw'), configured: false });
  });
});

describe('读画夹索引', () => {
  it('只保留文件还在、路径在画夹内的条目', () => {
    const root = join(scratch, 'art');
    mkdirSync(root, { recursive: true });
    seed(root, 'ok', 'unrated/ok.png', '2026-10-28T09:30:00+08:00');
    seed(root, 'gone', 'unrated/gone.png', '2026-10-28T10:00:00+08:00');
    rmSync(join(root, 'unrated', 'gone.png'));
    const index = JSON.parse(readFileSync(join(root, 'index.json'), 'utf8')) as { drawings: unknown[] };
    index.drawings.push({ id: 'escape', file: '../outside.png', createdAt: '2026-10-28T11:00:00+08:00', rating: 'unrated' });
    writeFileSync(join(root, 'index.json'), JSON.stringify(index));
    const entries = loadArtIndex({ dir: root, configured: true });
    expect(entries.map((entry) => entry.id)).toEqual(['ok']);
  });

  it('按部署时区把 createdAt 归到某一天', () => {
    const root = join(scratch, 'art');
    mkdirSync(root, { recursive: true });
    seed(root, 'late', 'unrated/late.png', '2026-10-27T23:30:00+08:00');
    seed(root, 'utc', 'unrated/utc.png', '2026-10-27T16:30:00Z'); // 北京时间 10-28 00:30
    const entries = loadArtIndex({ dir: root, configured: true });
    expect(artDate(entries.find((entry) => entry.id === 'late')!, 'Asia/Shanghai')).toBe('2026-10-27');
    expect(artsOnDate(entries, 'Asia/Shanghai', '2026-10-28').map((entry) => entry.id)).toEqual(['utc']);
  });
});

describe('引用进日记', () => {
  it('复制到 images/<日期>/,并生成相对路径的 Markdown', () => {
    const root = join(scratch, 'art');
    mkdirSync(join(root, 'unrated'), { recursive: true });
    seed(root, 'd-1', 'unrated/d-1.png', '2026-10-28T09:30:00+08:00');
    const entry = loadArtIndex({ dir: root, configured: true })[0]!;
    const diary = join(scratch, 'diary');
    const relative = copyArtIntoDiary(entry, diary, '2026-10-28');
    expect(relative).toBe('images/2026-10-28/d-1.png');
    expect(existsSync(join(diary, relative))).toBe(true);
    expect(markdownForArt(relative, '一只[小]狐狸')).toBe('![一只 小 狐狸](images/2026-10-28/d-1.png)');
  });

  it('alt 里的换行和方括号不会破坏 Markdown', () => {
    expect(markdownForArt('images/2026-10-28/d-1.png', '第一行\n第二行]')).toBe('![第一行 第二行](images/2026-10-28/d-1.png)');
  });
});
