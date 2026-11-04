import { describe, expect, it } from 'vitest';
import { addPngText, pngSize, readPngText } from '../src/png.ts';
import { pngBytes } from './helpers.ts';

describe('PNG 文本块', () => {
  it('写入并读回 UTF-8 元数据，保留原图块', () => {
    const out = addPngText(pngBytes(), {
      'coo-gen': JSON.stringify({ positive: '塞尔达', seed: 42 }),
      software: 'Coopanion coo-gen',
    });
    const entries = readPngText(out);
    const meta = entries.find((entry) => entry.keyword === 'coo-gen');
    expect(meta?.kind).toBe('iTXt');
    expect(JSON.parse(meta!.text)).toEqual({ positive: '塞尔达', seed: 42 });
    expect(entries.find((entry) => entry.keyword === 'software')?.text).toBe('Coopanion coo-gen');
    expect(pngSize(out)).toEqual({ width: 1, height: 1 });
  });

  it('同名关键字替换而不是重复', () => {
    const once = addPngText(pngBytes(), { 'coo-gen': 'a' });
    const twice = addPngText(once, { 'coo-gen': 'b' });
    const values = readPngText(twice).filter((entry) => entry.keyword === 'coo-gen');
    expect(values).toHaveLength(1);
    expect(values[0]!.text).toBe('b');
  });

  it('拒绝非 PNG', () => {
    expect(() => addPngText(Buffer.from('not png'), { a: 'b' })).toThrow('不是 PNG');
    expect(pngSize(Buffer.from('not png'))).toBeNull();
  });
});
