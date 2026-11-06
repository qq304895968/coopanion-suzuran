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

  it('保存时写入解析到的模型三件，缺省回退到 params', () => {
    const { store: instance } = store();
    const entry = instance.save({
      bytes: pngBytes(),
      mime: 'image/png',
      params: { ...params, checkpoint: '' },
      loras: [],
      models: { checkpoint: 'krea2_turbo_nvfp4.safetensors', textEncoder: 'qwen3vl_4b_fp8_scaled.safetensors', vae: 'qwen_image_vae.safetensors' },
      promptId: 'p1',
      taskId: 't1',
      workflow: 'Krea2',
      index: 0,
      batch: 1,
      seed: 42,
    });
    expect(entry.checkpoint).toBe('krea2_turbo_nvfp4.safetensors');
    expect(entry.text_encoder).toBe('qwen3vl_4b_fp8_scaled.safetensors');
    expect(entry.vae).toBe('qwen_image_vae.safetensors');
    const text = readPngText(readFileSync(entry.path));
    const meta = JSON.parse(text.find((item) => item.keyword === 'coo-gen')!.text);
    expect(meta.checkpoint).toBe('krea2_turbo_nvfp4.safetensors');
    expect(meta.text_encoder).toBe('qwen3vl_4b_fp8_scaled.safetensors');
    expect(meta.vae).toBe('qwen_image_vae.safetensors');

    const fallback = instance.save({
      bytes: pngBytes(), mime: 'image/png', params, loras: [], promptId: 'p2', taskId: 't2',
      workflow: 'w', index: 0, batch: 1, seed: 7,
    });
    expect(fallback.checkpoint).toBe('anything_v5.safetensors');
    expect(fallback.text_encoder).toBeUndefined();
    expect(fallback.vae).toBeUndefined();
  });

  it('收藏状态持久化到 history.json，跨实例可读', () => {
    const { data, store: instance } = store();
    const entry = instance.save({
      bytes: pngBytes(), mime: 'image/png', params, loras: [], promptId: 'p', taskId: 't',
      workflow: 'w', index: 0, batch: 1, seed: 7,
    });
    expect(entry.is_favorite).toBeUndefined();
    const updated = instance.setFavorite(entry.id, true);
    expect(updated?.is_favorite).toBe(true);
    expect(updated?.favorite_at).toBeGreaterThan(0);
    const reopened = new OutputStore({ dataDir: data, outputDir: join(data, 'output'), timezone: 'Asia/Shanghai', historyLimit: 50 });
    expect(reopened.get(entry.id)?.is_favorite).toBe(true);
    expect(instance.setFavorite(entry.id, false)?.is_favorite).toBe(false);
    expect(instance.get(entry.id)?.favorite_at).toBeUndefined();
    expect(instance.setFavorite('missing', true)).toBeNull();
  });

  it('删除作品：必删索引，按需删文件，缺失 id 计入 missing', () => {
    const { store: instance } = store();
    const saveOne = (seed: number) => instance.save({
      bytes: pngBytes(), mime: 'image/png', params, loras: [], promptId: `p${seed}`, taskId: `t${seed}`,
      workflow: 'w', index: 0, batch: 1, seed,
    });
    const recordOnly = saveOne(11);
    const withFile = saveOne(12);
    const normal = saveOne(13);
    expect(existsSync(recordOnly.path)).toBe(true);

    const r1 = instance.deleteWorks([recordOnly.id], false);
    expect(r1).toEqual({ deleted: [recordOnly.id], missing: [] });
    expect(instance.get(recordOnly.id)).toBeNull();
    expect(existsSync(recordOnly.path)).toBe(true);

    const r2 = instance.deleteWorks([withFile.id], true);
    expect(r2).toEqual({ deleted: [withFile.id], missing: [] });
    expect(instance.get(withFile.id)).toBeNull();
    expect(existsSync(withFile.path)).toBe(false);

    const r3 = instance.deleteWorks([normal.id, normal.id, 'ghost'], true);
    expect(r3.deleted).toEqual([normal.id]);
    expect(r3.missing).toEqual(['ghost']);
    expect(instance.get(normal.id)).toBeNull();
  });
});
