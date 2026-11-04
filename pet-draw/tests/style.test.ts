import { describe, expect, it } from 'vitest';
import { PET_DRAW_DEFAULTS, type PetDrawConfigSection } from '../src/config.ts';
import {
  buildPrompt,
  negativeFor,
  normalizeSubject,
  profileFor,
  refusalFor,
  styleLabel,
} from '../src/style.ts';

const cfg = (patch: Partial<PetDrawConfigSection> = {}): PetDrawConfigSection => ({ ...PET_DRAW_DEFAULTS, ...patch });

describe('style mapping', () => {
  it('defaults to a crayon doodle', () => {
    expect(profileFor(cfg()).id).toBe('crayon');
    expect(styleLabel(cfg())).toBe('蜡笔涂鸦');
  });

  it('honours every explicit style', () => {
    const expected = ['crayon', 'pencil', 'marker', 'ink', 'charcoal', 'pen', 'pixel'] as const;
    for (const style of expected) {
      expect(profileFor(cfg({ style })).id).toBe(style);
    }
  });

  it('uses customStyle only when asked, and falls back when empty', () => {
    expect(profileFor(cfg({ style: 'custom', customStyle: '用粉笔在水泥地上画' })).body).toBe('用粉笔在水泥地上画');
    expect(profileFor(cfg({ style: 'custom', customStyle: '   ' })).id).toBe('crayon');
  });
});

describe('image prompt', () => {
  it('puts the persona style before the subject and keeps the persona name out', () => {
    const prompt = buildPrompt('一只在草地上打滚的小狐狸', cfg(), '认真、温柔');
    expect(prompt).toContain('蜡笔');
    expect(prompt).toContain('画的内容：一只在草地上打滚的小狐狸。');
    expect(prompt.indexOf('蜡笔')).toBeLessThan(prompt.indexOf('画的内容：'));
    expect(prompt).not.toContain('铃兰');
    expect(prompt).toContain('认真、温柔');
  });

  it('keeps the reference prompt short instead of stacking style and persona text', () => {
    const withRef = buildPrompt('一个叫鲁迅的人', cfg(), '礼貌、认真、容易害羞', true);
    expect(withRef).toContain('蜡笔涂鸦');
    expect(withRef).toContain('参考图只用来认人');
    expect(withRef).toContain('一个叫鲁迅的人');
    expect(withRef).not.toContain('画面的气质');
    expect(withRef).not.toContain('线条歪歪扭扭');
    expect(withRef.split('\n')).toHaveLength(2);
    expect(buildPrompt('一只猫', cfg())).not.toContain('参考图只用来认人');
  });

  it('adds a child-appropriate content guard and a bounded negative prompt', () => {
    const prompt = buildPrompt('一只猫', cfg());
    expect(prompt).toContain('适合小孩子');
    expect(negativeFor(cfg()).length).toBeLessThanOrEqual(500);
  });

  it('normalizes whitespace and caps the subject length', () => {
    expect(normalizeSubject('  一只\n猫\t在窗台  ')).toBe('一只 猫 在窗台');
    const long = '猫'.repeat(400);
    expect(Array.from(normalizeSubject(long))).toHaveLength(240);
    expect(normalizeSubject(42)).toBe('');
  });
});

describe('refusal policy', () => {
  it('refuses video, HD/photo, editing, adult and gore requests', () => {
    for (const text of ['一段视频', '生成一个动图', '4K 高清大图', '一张照片', '把这张图修一下', '血腥场面', '成人内容']) {
      expect(refusalFor(text), text).not.toBeNull();
    }
  });

  it('lets ordinary subjects through', () => {
    for (const text of ['一只在草地上打滚的小狐狸', '窗台上的小猫', '我和九条尾巴', '一朵云']) {
      expect(refusalFor(text), text).toBeNull();
    }
  });
});
