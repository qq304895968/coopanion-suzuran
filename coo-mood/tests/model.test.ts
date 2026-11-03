import { describe, expect, it } from 'vitest';
import { MOOD_DEFAULTS } from '../src/config.ts';
import {
  analyzePersonaText, analyzeTone, bandFor, emotionDistribution, estimateDialogueDelta,
  resolvedPersona,
} from '../src/model.ts';

const cfg = { ...MOOD_DEFAULTS, enabled: true, personaPreset: 'gentle' as const };
const persona = resolvedPersona(cfg);

describe('mood model', () => {
  it('maps the five bands at their boundaries', () => {
    expect([20, 21, 40, 41, 60, 61, 80, 81].map(bandFor)).toEqual([
      'critical_low', 'low', 'low', 'neutral', 'neutral', 'high', 'high', 'euphoric',
    ]);
  });

  it('normalizes emotion probabilities and shifts them with mood', () => {
    const low = emotionDistribution(10, persona);
    const high = emotionDistribution(95, persona);
    expect(Math.round(Object.values(low).reduce((a, b) => a + b, 0))).toBe(100);
    expect(Math.round(Object.values(high).reduce((a, b) => a + b, 0))).toBe(100);
    expect(high.happy).toBeGreaterThan(low.happy);
    expect(low.sad).toBeGreaterThan(high.sad);
  });

  it('reads praise, insults and cold replies', () => {
    expect(analyzeTone('谢谢你，好喜欢你').score).toBeGreaterThan(0);
    expect(analyzeTone('你真没用，滚').score).toBeLessThan(0);
    expect(analyzeTone('哦').cold).toBe(true);
  });

  it('estimates a positive dialogue delta for praise', () => {
    const result = estimateDialogueDelta('谢谢你，好喜欢你', '嘿嘿。', 60, cfg);
    expect(result.delta).toBeGreaterThan(0);
  });

  it('detects a gentle persona from a constitution excerpt', () => {
    const result = analyzePersonaText('礼貌、认真、容易害羞，也容易担心。我相信事情会变好。被夸会脸红，难过的时候会安静一点。');
    expect(result.preset).toBe('gentle');
    expect(result.confidence).toBeGreaterThan(0);
  });
});
