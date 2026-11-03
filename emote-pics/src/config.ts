/** 19 个表情键;父文件夹下的子文件夹名就是这些键(也认中文名,如「开心」)。 */
export const EMOTIONS = [
  'neutral',
  'happy',
  'wink',
  'love',
  'shy',
  'surprised',
  'angry',
  'sad',
  'sleepy',
  'thinking',
  'smug',
  'pout',
  'worried',
  'determined',
  'flustered',
  'scared',
  'excited',
  'cry',
  'confused',
] as const;

export type Emotion = (typeof EMOTIONS)[number];

/** 面板上的名字:中文在前,英文键在后。 */
export const EMOTION_LABELS: Record<Emotion, { zh: string; en: string }> = {
  neutral: { zh: '平静', en: 'neutral' },
  happy: { zh: '开心', en: 'happy' },
  wink: { zh: '眨眼', en: 'wink' },
  love: { zh: '喜欢', en: 'love' },
  shy: { zh: '害羞', en: 'shy' },
  surprised: { zh: '惊讶', en: 'surprised' },
  angry: { zh: '生气', en: 'angry' },
  sad: { zh: '难过', en: 'sad' },
  sleepy: { zh: '困倦', en: 'sleepy' },
  thinking: { zh: '思考', en: 'thinking' },
  smug: { zh: '得意', en: 'smug' },
  pout: { zh: '嘟嘴', en: 'pout' },
  worried: { zh: '担心', en: 'worried' },
  determined: { zh: '坚定', en: 'determined' },
  flustered: { zh: '慌张', en: 'flustered' },
  scared: { zh: '害怕', en: 'scared' },
  excited: { zh: '兴奋', en: 'excited' },
  cry: { zh: '哭泣', en: 'cry' },
  confused: { zh: '困惑', en: 'confused' },
};

export const DEFAULT_CHANCE = 0.5;
export const DEFAULT_COOLDOWN_SECONDS = 30;
/** 弹图默认长边(px)。 */
export const DEFAULT_POPUP_SIZE = 220;

/** `worlds.emote-pics` 的全部设置。老配置里的 `emotions` / `prompt` / 心情字段都不再读。 */
export interface EmotePicsConfigSection {
  enabled: boolean;
  /** 表情包的父文件夹;每个情绪是它下面的同名子文件夹。 */
  dir: string;
  /** 每次出图的概率 0~1。 */
  chance: number;
  /** 同一情绪两次出图的最小间隔(秒);0 = 不限制。 */
  cooldownSeconds: number;
  /** 扫到气泡里的表情标记就自己弹;`false` = 只等模型调 `emote_pic`。 */
  autoPopup?: boolean;
  popupEnabled?: boolean;
  /** 气泡里停留几秒。 */
  popupDuration?: number;
  /** 图片长边(px);0 = 自动(窗口短边的 1/3)。 */
  popupSize?: number;
  popupRadius?: number;
  /** 桌宠身上那条路走不通时,把独立窗口摆到角色脚边;缺省开。 */
  popupFollow?: boolean;
}

export interface ResolvedPopup {
  enabled: boolean;
  duration: number;
  /** 长边像素;0 = 自动。 */
  size: number;
  radius: number;
  /** 失败回退到独立窗口时跟随桌宠位置。 */
  follow: boolean;
}

/** 读到配置后的规整形状:坏值、缺省值都在这里处理掉。 */
export interface ResolvedConfig {
  dir: string;
  chance: number;
  cooldownSeconds: number;
  autoPopup: boolean;
  popup: ResolvedPopup;
}

export const EMOTE_PICS_DEFAULTS: EmotePicsConfigSection = {
  enabled: false,
  dir: '',
  chance: DEFAULT_CHANCE,
  cooldownSeconds: DEFAULT_COOLDOWN_SECONDS,
  autoPopup: true,
  popupEnabled: true,
  popupDuration: 8,
  popupSize: DEFAULT_POPUP_SIZE,
  popupRadius: 16,
  popupFollow: true,
};

export function isEmotion(value: string): value is Emotion {
  return (EMOTIONS as readonly string[]).includes(value);
}

/** 0~1;不是有限数时用 fallback。 */
export function clampChance(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(1, Math.max(0, value));
}

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function resolveConfig(cfg: EmotePicsConfigSection): ResolvedConfig {
  const chance = clampChance(cfg.chance, DEFAULT_CHANCE);
  const cooldownSeconds = Math.max(0, finite(cfg.cooldownSeconds, DEFAULT_COOLDOWN_SECONDS));
  const duration = Math.min(60, Math.max(0.5, finite(cfg.popupDuration, 8)));
  const rawSize = finite(cfg.popupSize, DEFAULT_POPUP_SIZE);
  const size = rawSize > 0 ? Math.min(2000, Math.max(80, Math.round(rawSize))) : 0;
  const radius = Math.min(64, Math.max(0, finite(cfg.popupRadius, 16)));
  return {
    dir: typeof cfg.dir === 'string' ? cfg.dir.trim() : '',
    chance,
    cooldownSeconds,
    autoPopup: cfg.autoPopup !== false,
    popup: {
      enabled: cfg.popupEnabled !== false,
      duration,
      size,
      radius,
      follow: cfg.popupFollow !== false,
    },
  };
}
