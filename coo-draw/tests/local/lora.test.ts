import { afterEach, describe, expect, it } from 'vitest';
import { join } from 'node:path';
import {
  applyUserLoRAMeta, describeLoRAsForPrompt, matchLoRAs, mergeLoRAs, normalizeLoraPath,
  resolveDefaults, scanLoRAs,
} from '../../src/local/lora.ts';
import { makeComfyDir, removeDir, tempDir } from './helpers.ts';
import type { LoRARecord, MatchedLoRA } from '../../src/local/types.ts';

const dirs: string[] = [];
afterEach(() => {
  while (dirs.length) removeDir(dirs.pop()!);
});

function scanned() {
  const dir = tempDir();
  dirs.push(dir);
  const lorasRoot = makeComfyDir(join(dir, 'comfy'));
  const result = scanLoRAs(lorasRoot);
  return { dir, lorasRoot, result };
}

describe('LoRA 扫描', () => {
  it('递归扫描、分类、预览图和侧车触发词', () => {
    const { result } = scanned();
    expect(result.items).toHaveLength(5);
    const zelda = result.items.find((item) => item.name === 'zelda_botw_style')!;
    expect(zelda.category).toBe('角色');
    expect(zelda.preview).toBe('角色/zelda_botw_style.png');
    const miku = result.items.find((item) => item.name === 'hatsune_miku_v4')!;
    expect(miku.trigger_words).toContain('vocaloid');
    expect(result.warnings).toHaveLength(0);
  });

  it('用户别名和权重复合到记录上', () => {
    const { result } = scanned();
    const records = applyUserLoRAMeta(result.items, { 塞尔达: ['角色/zelda_botw_style.safetensors'] }, {
      '角色/hatsune_miku_v4.safetensors': { weight: 0.7, aliases: ['初音'] },
    });
    const zelda = records.find((item) => item.name === 'zelda_botw_style')!;
    expect(zelda.aliases).toContain('塞尔达');
    const miku = records.find((item) => item.name === 'hatsune_miku_v4')!;
    expect(miku.aliases).toContain('初音');
    expect(miku.weight).toBe(0.7);
  });
});

describe('LoRA 匹配', () => {
  it('别名优先命中', () => {
    const { result } = scanned();
    const records = applyUserLoRAMeta(result.items, { 塞尔达: ['角色/zelda_botw_style.safetensors'] }, {});
    const matched = matchLoRAs(records, { 塞尔达: ['角色/zelda_botw_style.safetensors'] }, { subject: '发我一张塞尔达的图' });
    expect(matched[0]!.name).toBe('zelda_botw_style');
    expect(matched[0]!.reason).toContain('塞尔达');
  });

  it('文件名和触发词命中', () => {
    const { result } = scanned();
    const records = applyUserLoRAMeta(result.items, {}, {});
    const mecha = matchLoRAs(records, {}, { subject: 'a mecha robot in rain' });
    expect(mecha.some((item) => item.name === 'mecha_detail')).toBe(true);
    const miku = matchLoRAs(records, {}, { subject: 'vocaloid song' });
    expect(miku.some((item) => item.name === 'hatsune_miku_v4')).toBe(true);
  });

  it('显式选择走 llm 策略', () => {
    const { result } = scanned();
    const records = applyUserLoRAMeta(result.items, {}, {});
    const matched = matchLoRAs(records, {}, {
      subject: '随便画',
      explicit: [{ name: 'soft_lighting', weight: 0.4 }],
    });
    const pick = matched.find((item) => item.name === 'soft_lighting')!;
    expect(pick.weight).toBe(0.4);
    expect(pick.reason).toContain('语义');
  });
});

function entry(path: string, weight: number, source: MatchedLoRA['source'] = 'default', confidence = 0): MatchedLoRA {
  return { path, name: path.split('/').pop()!, weight, source, reason: '', confidence };
}

describe('LoRA 合并', () => {
  it('默认与对话匹配叠加', () => {
    const merged = mergeLoRAs(
      [entry('soft_lighting', 0.5)],
      [entry('zelda_botw', 0.8, 'auto', 0.9)],
      { maxCount: 3 },
    );
    expect(merged.map((item) => item.name)).toEqual(['zelda_botw', 'soft_lighting']);
  });

  it('同名取较高权重', () => {
    const merged = mergeLoRAs(
      [entry('anime_style', 0.6)],
      [entry('anime_style', 0.8, 'auto', 0.9)],
      { maxCount: 3 },
    );
    expect(merged).toHaveLength(1);
    expect(merged[0]!.weight).toBe(0.8);
  });

  it('超上限时淘汰默认 LoRA', () => {
    const merged = mergeLoRAs(
      [entry('a', 0.5), entry('b', 0.5), entry('c', 0.5)],
      [entry('d', 0.8, 'auto', 0.9), entry('e', 0.7, 'auto', 0.8)],
      { maxCount: 3 },
    );
    expect(merged.map((item) => item.name)).toEqual(['d', 'e', 'a']);
  });

  it('默认文件丢失时单独返回', () => {
    const { result } = scanned();
    const resolved = resolveDefaults(result.items, [
      { name: 'soft_lighting', path: '风格/soft_lighting.safetensors', weight: 0.5, trigger_words: [] },
      { name: 'missing', path: '不存在/missing.safetensors', weight: 0.5, trigger_words: [] },
    ]);
    expect(resolved.loras).toHaveLength(1);
    expect(resolved.missing).toHaveLength(1);
  });

  it('环境提示词列表包含别名和触发词', () => {
    const { result } = scanned();
    const text = describeLoRAsForPrompt(result.items, { 初音: ['角色/hatsune_miku_v4.safetensors'] });
    expect(text).toContain('hatsune_miku_v4');
    expect(text).toContain('别名:初音');
    expect(text).toContain('vocaloid');
  });

  it('路径统一用正斜杠', () => {
    expect(normalizeLoraPath('角色\\a.safetensors')).toBe('角色/a.safetensors');
  });
});
