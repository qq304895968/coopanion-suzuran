import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ArtStore } from '../src/art-store.ts';
import { pngBytes } from './helpers.ts';

const dirs: string[] = [];

function makeStore(start = '2026-10-28T08:30:00+08:00') {
  const dir = mkdtempSync(join(tmpdir(), 'pet-draw-art-'));
  dirs.push(dir);
  let time = new Date(start).getTime();
  const store = new ArtStore(dir, 'Asia/Shanghai', () => new Date(time));
  return {
    dir,
    store,
    advance: (ms: number) => { time += ms; },
  };
}

const meta = { subject: '一只在草地上打滚的小狐狸', style: '蜡笔涂鸦', styleId: 'crayon', width: 512, height: 512 };

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('ArtStore', () => {
  it('saves under unrated and writes a readable index', () => {
    const { dir, store } = makeStore();
    const art = store.save(pngBytes(), 'image/png', meta);

    expect(art.id).toMatch(/^d-/);
    expect(art.file).toBe(`unrated/${art.id}.png`);
    expect(existsSync(join(dir, art.file))).toBe(true);
    expect(store.count()).toBe(1);
    expect(store.list()).toHaveLength(1);

    const index = JSON.parse(readFileSync(join(dir, 'index.json'), 'utf8')) as { version: number; drawings: Array<{ id: string }> };
    expect(index.version).toBe(1);
    expect(index.drawings[0]!.id).toBe(art.id);
    expect(JSON.stringify(index)).not.toContain('sk-');
  });

  it('moves the file into the rating folder and updates the index', () => {
    const { dir, store } = makeStore();
    const art = store.save(pngBytes(), 'image/png', meta);
    const rated = store.rate(art.id, 'favorite', '这张好可爱');

    expect(rated).toMatchObject({ rating: 'favorite', note: '这张好可爱' });
    expect(rated!.file).toBe(`favorite/${art.id}.png`);
    expect(existsSync(join(dir, 'unrated', `${art.id}.png`))).toBe(false);
    expect(existsSync(join(dir, 'favorite', `${art.id}.png`))).toBe(true);
    expect(store.list({ rating: 'favorite' })).toHaveLength(1);
    expect(store.list({ rating: 'unrated' })).toHaveLength(0);
    expect(store.latestUnrated()).toBeUndefined();
    expect(store.rate(art.id, 'dislike')?.file).toBe(`dislike/${art.id}.png`);
  });

  it('reads a saved picture back', () => {
    const { store } = makeStore();
    const art = store.save(pngBytes(), 'image/png', meta);
    const found = store.read(art.id);
    expect(found?.mime).toBe('image/png');
    expect(found?.bytes).toEqual(pngBytes());
    expect(store.read('missing')).toBeNull();
  });

  it('filters by query and keeps the latest unrated', () => {
    const { store, advance } = makeStore();
    const first = store.save(pngBytes(), 'image/png', { ...meta, subject: '一只猫' });
    advance(1000);
    const second = store.save(pngBytes(), 'image/png', { ...meta, subject: '一只狗' });
    advance(1000);

    expect(store.list({ query: '猫' }).map((item) => item.id)).toEqual([first.id]);
    expect(store.latestUnrated()?.id).toBe(second.id);
    expect(store.latestUnrated([first.id])?.id).toBe(first.id);
  });

  it('backs up a corrupt index instead of destroying it', () => {
    const { dir, store } = makeStore();
    writeFileSync(join(dir, 'index.json'), '{ not json', 'utf8');
    const art = store.save(pngBytes(), 'image/png', meta);
    const files = readFileSync(join(dir, 'index.json'), 'utf8');
    expect(files).toContain(art.id);
    const entries = readdirSync(dir);
    expect(entries.some((name) => name.startsWith('index.json.corrupt-'))).toBe(true);
  });
});
