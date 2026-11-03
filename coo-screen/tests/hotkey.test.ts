import { describe, expect, it } from 'vitest';
import { parseHotkey } from '../src/hotkey.ts';

describe('parseHotkey', () => {
  it('normalises modifiers and the key', () => {
    expect(parseHotkey('ctrl+alt+q')).toMatchObject({ mods: 3, vk: 0x51, name: 'ctrl+alt+q' });
    expect(parseHotkey('ALT+SHIFT+S')).toMatchObject({ mods: 6, name: 'alt+shift+s' });
    expect(parseHotkey(' Win + Space ')).toMatchObject({ mods: 8, name: 'win+space' });
    expect(parseHotkey('ctrl+1').name).toBe('ctrl+1');
  });

  it('lets a bare function key through', () => {
    expect(parseHotkey('f9')).toMatchObject({ mods: 0, vk: 0x78, name: 'f9' });
  });

  it('refuses a bare letter, which would eat normal typing', () => {
    expect(() => parseHotkey('a')).toThrow(/必须带/);
  });

  it('reports the broken part instead of guessing', () => {
    expect(() => parseHotkey('')).toThrow(/为空/);
    expect(() => parseHotkey('ctrl')).toThrow(/缺主键/);
    expect(() => parseHotkey('ctrl+')).toThrow(/缺主键/);
    expect(() => parseHotkey('ctrl+foo')).toThrow(/不认识的键/);
    expect(() => parseHotkey('ctrl+alt+a+b')).toThrow(/只能有一个主键/);
  });
});
