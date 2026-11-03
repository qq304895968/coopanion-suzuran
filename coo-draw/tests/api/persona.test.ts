import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { loadPersona, parsePersona } from '../../src/api/persona.ts';

const dirs: string[] = [];

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const sample = `# 我是谁

我是铃兰，本名丽萨……啊不对，铃兰，干员铃兰！是我自己挑的代号喔。

一百三十七厘米，生日十月九日。

# 性子

礼貌、认真、容易害羞，也容易担心。

我说话小声，怕打扰别人。

# 做事

叫博士「博士」。
`;

describe('persona', () => {
  it('reads the name and the first paragraph of 性子', () => {
    const profile = parsePersona(sample, 'fallback');
    expect(profile.name).toBe('铃兰');
    expect(profile.traits).toBe('礼貌、认真、容易害羞，也容易担心');
  });

  it('falls back to the given name and empty traits', () => {
    const profile = parsePersona('# 我是谁\n\n一个没有名字的人。\n', '铃兰');
    expect(profile.name).toBe('铃兰');
    expect(profile.traits).toBe('');
  });

  it('reads workspace/CONSTITUTION.md from the deployment', () => {
    const botDir = mkdtempSync(join(tmpdir(), 'pet-draw-persona-'));
    dirs.push(botDir);
    mkdirSync(join(botDir, 'workspace'), { recursive: true });
    writeFileSync(join(botDir, 'workspace', 'CONSTITUTION.md'), sample, 'utf8');

    const profile = loadPersona(botDir, '显示名');
    expect(profile.name).toBe('铃兰');
    expect(profile.traits).toContain('礼貌、认真');
    expect(profile.source).toContain('CONSTITUTION.md');
  });

  it('returns displayName when the file is missing', () => {
    const botDir = mkdtempSync(join(tmpdir(), 'pet-draw-persona-'));
    dirs.push(botDir);
    expect(loadPersona(botDir, '铃兰')).toEqual({ name: '铃兰', traits: '' });
  });
});
