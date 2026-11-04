import { afterEach, describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { OutputStore } from '../../src/local/output.ts';
import { readPngText } from '../../src/local/png.ts';
import { pngBytes, removeDir, tempDir } from './helpers.ts';

const dirs: string[] = [];
afterEach(() => {
  while (dirs.length) removeDir(dirs.pop()!);
});

function store(limit = 50): { data: string; out: string; store: OutputStore } {
  const data = tempDir();
  dirs.push(data);
  const out = join(data, 'output');
  const instance = new OutputStore({
    dataDir: data,
    outputDir: out,
    timezone: 'Asia/Shanghai',
    historyLimit: limit,
    now: () => new Date('2026-11-03T02:00:00+08:00'),
  });
  return { data, out, store: instance };
}

const params = {
  positive: 'zelda, 塞尔达, sunset',
  negative: 'blurry',
  checkpoint: 'anything_v5.safetensors',
  sampler: 'euler_ancestral',
  scheduler: 'normal',
  steps: 20,
  cfg: 7,
  width: 1,
  height: 1,
  batch: 1,
  seed: 42,
};

describe('OutputStore', () => {
  it('按时间_种子_模型命名并写 PNG 元数据', () => {
    const { out, store: instance } = store();
    const entry = instance.save({
      bytes: pngBytes(),
      mime: 'image/png',
      params,
      loras: [{ path: '角色/zelda_botw_style.safetensors', name: 'zelda_botw_style', weight: 0.8, source: 'auto' }],
      promptId: 'p1',
      taskId: 't1',
      workflow: '快速文生图',
      index: 0,
      batch: 1,
      seed: 42,
    });
    expect(entry.filename).toMatch(/^20261103-020000_42_anything_v5\.png$/);
    expect(existsSync(join(out, entry.filename))).toBe(true);
    const text = readPngText(readFileSync(entry.path));
    const meta = JSON.parse(text.find((item) => item.keyword === 'coo-gen')!.text);
    expect(meta.positive).toContain('塞尔达');
    expect(meta.seed).toBe(42);
    expect(meta.loras[0].name).toBe('zelda_botw_style');
    expect(entry.width).toBe(1);
    expect(entry.height).toBe(1);
  });

  it('历史按上限裁剪，清空只清索引', () => {
    const { out, store: instance } = store(2);
    for (let i = 0; i < 3; i++) {
      instance.save({
        bytes: pngBytes(), mime: 'image/png', params, loras: [], promptId: `p${i}`, taskId: `t${i}`,
        workflow: 'w', index: i, batch: 1, seed: i,
      });
    }
    expect(instance.list(10)).toHaveLength(2);
    const first = join(out, instance.list(1)[0]!.filename);
    instance.clear();
    expect(instance.list()).toHaveLength(0);
    expect(existsSync(first)).toBe(true);
  });

  it('批次图加序号避免覆盖', () => {
    const { store: instance } = store();
    const a = instance.save({ bytes: pngBytes(), mime: 'image/png', params, loras: [], promptId: 'p', taskId: 't', workflow: 'w', index: 0, batch: 2, seed: 7 });
    const b = instance.save({ bytes: pngBytes(), mime: 'image/png', params, loras: [], promptId: 'p', taskId: 't', workflow: 'w', index: 1, batch: 2, seed: 7 });
    expect(a.filename).not.toBe(b.filename);
    expect(a.filename).toContain('_1.png');
    expect(b.filename).toContain('_2.png');
  });
});
