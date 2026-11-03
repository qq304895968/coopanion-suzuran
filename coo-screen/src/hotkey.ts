/**
 * 热键字符串的解析,和 `sidecar/screen_sidecar.py` 的 `parse_hotkey` 保持同一套规则与同一套报错话术。
 *
 * 放在 TS 这一侧只为一件事:用户在设置页把热键改成 `ctrl+` 这种残句时,当场告诉他哪里不对,
 * 而不是等他重启侧车、看到状态灯变红。真正注册热键的仍然是侧车。
 */

const MODS: Record<string, number> = {
  ctrl: 1,
  control: 1,
  alt: 2,
  shift: 4,
  win: 8,
  super: 8,
  meta: 8,
};

const MOD_LABELS: ReadonlyArray<[string, number]> = [
  ['ctrl', 1],
  ['alt', 2],
  ['shift', 4],
  ['win', 8],
];

const VK_NAMES: Record<string, number> = {
  space: 0x20, tab: 0x09, enter: 0x0d, return: 0x0d, esc: 0x1b, escape: 0x1b,
  backspace: 0x08, insert: 0x2d, ins: 0x2d, delete: 0x2e, del: 0x2e,
  home: 0x24, end: 0x23, pageup: 0x21, pagedown: 0x22,
  up: 0x26, down: 0x28, left: 0x25, right: 0x27,
  printscreen: 0x2c, prtsc: 0x2c, pause: 0x13, capslock: 0x14,
  '`': 0xc0, '-': 0xbd, '=': 0xbb, '[': 0xdb, ']': 0xdd, '\\': 0xdc,
  ';': 0xba, "'": 0xde, ',': 0xbc, '.': 0xbe, '/': 0xbf,
};
for (let i = 1; i <= 24; i += 1) VK_NAMES[`f${i}`] = 0x6f + i;

export interface ParsedHotkey {
  /** RegisterHotKey 用的修饰键位。 */
  mods: number;
  /** 虚拟键码。 */
  vk: number;
  /** 规范化后的写法,比如 `ctrl+alt+q`。 */
  name: string;
}

export function parseHotkey(text: string): ParsedHotkey {
  const raw = (text ?? '').trim().toLowerCase().replace(/\s+/g, '');
  if (!raw) throw new Error('热键为空');
  const parts = raw.split('+').filter(Boolean);
  if (!parts.length) throw new Error(`看不懂的热键:${text}`);

  let mods = 0;
  let key = '';
  for (const part of parts) {
    if (part in MODS) {
      mods |= MODS[part]!;
      continue;
    }
    if (part.length === 1 || part in VK_NAMES) {
      if (key) throw new Error(`热键里只能有一个主键:${text}`);
      key = part;
      continue;
    }
    throw new Error(`不认识的键:${part}`);
  }
  if (!key) throw new Error(`热键缺主键:${text}`);

  let vk: number;
  if (key in VK_NAMES) {
    vk = VK_NAMES[key]!;
  } else {
    const upper = key.toUpperCase();
    if (!/^[A-Z0-9]$/.test(upper)) throw new Error(`不认识的键:${key}`);
    vk = upper.charCodeAt(0);
  }
  if (mods === 0 && !key.startsWith('f')) {
    throw new Error('热键必须带 ctrl/alt/shift/win 之一,否则会抢掉正常打字');
  }
  const name = [...MOD_LABELS.filter(([, bit]) => mods & bit).map(([label]) => label), key].join('+');
  return { mods, vk, name };
}
