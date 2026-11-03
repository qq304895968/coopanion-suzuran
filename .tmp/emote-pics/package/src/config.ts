/** 19 个表情键;`worlds.emote-pics.emotions` 的键就是这 19 个,别的键不读。 */
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

export const DEFAULT_CHANCE = 0.3;
export const DEFAULT_COOLDOWN_SECONDS = 90;
/** `emote_mood` 记下的心情多久后失效。 */
export const DEFAULT_MOOD_TTL_MINUTES = 30;

/** 注入系统前缀的那段提示词的字数上限。 */
export const PROMPT_MAX_LENGTH = 2000;

/** 旧默认提示词:配置里还存着这一段的,视为用户没自定义过。 */
export const LEGACY_DEFAULT_TEXT_V1 = '你在说话时，如果这句本身带着情绪（开心、害羞、得意、难过、担心、犯困……），可以给它配一张图：调 emote_pic({ emotion })，回执里会给一个图片句柄，填进 pet_say.images，图就挂在对话页那条消息上。\n'
  + 'emotion 只从那 19 个里挑。扩展自己会掷骰子，返回 skipped 是正常的「这次不发」，不是出错，别重试、别道歉。不是每条都带，有情绪又合适的时候带一张就够了，连着几条都带会显得吵。对方在难受或说正事时别带图。文件夹在哪、概率多少不用你知道。';

/** 默认提示词:第一人称写给桌宠,只讲怎么用,不讲路径/概率/冷却。 */
export const DEFAULT_PROMPT_TEXT = '你在说话时，先说之前想一句：这句是不是带着情绪。\n'
  + '\n'
  + '带情绪的话，**先调 `emote_pic()`（不传 emotion）**——它会按你现在的心情从对应文件夹里挑一张，回执里给一个图片句柄，把这个句柄填进这次 `pet_say` 的 `images`。图挂在对话页那条消息上，头顶气泡里还是只有字。\n'
  + '\n'
  + '心情是谁管的：你说话时带的**表情标记**（【开心】、<眨眼> 这种）扩展会自己读到，自动更新心情；不带标记，心情就不会动。所以说话尽量带标记。心情为空时调 `emote_pic` 会返回 `skipped, reason: no_mood`，那时才显式带 emotion。\n'
  + '\n'
  + '频率你不用操心：扩展自己会掷骰子，概率和冷却在面板里配。回执 `skipped` 是正常的「这次不发」，不是出错，别重试、别道歉。\n'
  + '\n'
  + '不是每条都要带：对方在难受、在说正事、或者刚连着发过图的时候，别带。';

/** 默认提示词配置;每次返回新对象,避免多个实例共用同一份。 */
export function defaultPrompt(): PromptSetting {
  return { enabled: true, text: DEFAULT_PROMPT_TEXT };
}

/** `worlds.emote-pics.prompt`;缺省时按默认值注入。 */
export interface PromptSetting {
  enabled?: boolean;
  text?: string;
}

/** 一个表情的配置。`chance` 缺省时用 `defaultChance`;`dir` 缺省时看旧的 `folders`。 */
export interface EmotionSetting {
  dir?: string;
  chance?: number | null;
}

export interface EmotePicsConfigSection {
  enabled: boolean;
  emotions: Record<Emotion, EmotionSetting>;
  defaultChance: number;
  /** 同一表情两次出图的最小间隔;0 = 关。 */
  cooldownSeconds: number;
  /** `emote_mood` 记下的心情的有效期(分钟);缺省 30。 */
  moodTtlMinutes?: number;
  /** 取图成功时顺手刷新心情;缺省 true。 */
  moodFromPic?: boolean;
  /** 连续多少条气泡都没读到表情就告警;缺省 10,0 = 关。 */
  moodWatchNoMoodCount?: number;
  /** 多少分钟没扫到气泡事件就告警;缺省 30,0 = 关。 */
  moodWatchSilentMinutes?: number;
  /** 桌面上同步弹一张图;缺省开。 */
  popupEnabled?: boolean;
  /** 归一化横坐标 0~1;与 popupY 都给才用,否则用默认位置。 */
  popupX?: number | null;
  /** 归一化纵坐标 0~1。 */
  popupY?: number | null;
  /** 弹出停留秒数;缺省 3。 */
  popupDuration?: number;
  /** 尺寸缩放;缺省 0.25。 */
  popupScale?: number;
  /** 连发时排队各显示各的;缺省 true。 */
  popupQueue?: boolean;
  /** 跟随桌宠位置;缺省 true。 */
  popupFollowPet?: boolean;
  /** 内部标记:用户经面板显式设置过跟随开关;旧配置没有这一项。 */
  popupFollowPetSet?: boolean;
  /** 跟随时的左右偏好;缺省 auto。 */
  popupFollowSide?: 'auto' | 'left' | 'right';
  /** 跟随图与桌宠之间的水平间距(px);缺省 20。 */
  popupFollowGap?: number;
  /** 跟随图距离工作区底边的垂直偏移(px);缺省 20。 */
  popupFollowOffsetY?: number;
  /** 弹图自己的设置;目前只有圆角。 */
  popup?: { radius?: number };
  /** 注入系统前缀的情绪配图说明;旧配置没有这一项时用默认值。 */
  prompt?: PromptSetting;
  /** 上一版的格式,只读兼容:读到就当成 `defaultChance` 的概率。 */
  folders?: Record<string, string>;
}

/** 19 个键都给空对象,让 config.json 的形状稳定;`dir` 留空才看旧 `folders`。每次返回新对象。 */
export function emptyEmotions(): Record<Emotion, EmotionSetting> {
  const out = {} as Record<Emotion, EmotionSetting>;
  for (const emotion of EMOTIONS) out[emotion] = {};
  return out;
}

export const EMOTE_PICS_DEFAULTS: EmotePicsConfigSection = {
  enabled: false,
  emotions: emptyEmotions(),
  defaultChance: DEFAULT_CHANCE,
  cooldownSeconds: DEFAULT_COOLDOWN_SECONDS,
  moodTtlMinutes: DEFAULT_MOOD_TTL_MINUTES,
  moodFromPic: true,
  moodWatchNoMoodCount: 10,
  moodWatchSilentMinutes: 30,
  popupEnabled: true,
  popupX: null,
  popupY: null,
  popupDuration: 3,
  popupScale: 0.25,
  popupQueue: true,
  popupFollowPet: true,
  popupFollowSide: 'auto',
  popupFollowGap: 20,
  popupFollowOffsetY: 20,
  popup: { radius: 20 },
  prompt: defaultPrompt(),
};

export function isEmotion(value: string): value is Emotion {
  return (EMOTIONS as readonly string[]).includes(value);
}

/** 0~1;不是有限数时用 fallback。 */
export function clampChance(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(1, Math.max(0, value));
}

export interface ResolvedEmotion {
  dir: string;
  /** 实际用的概率 0~1。 */
  chance: number;
  /** 这个值是不是这个表情自己写的(`false` = 跟随 `defaultChance`)。 */
  chanceSet: boolean;
}

/** 读到配置后的规整形状:旧 `folders`、坏值、缺省值都在这里处理掉。 */
export interface ResolvedPrompt {
  enabled: boolean;
  text: string;
}

export interface ResolvedConfig {
  emotions: Record<Emotion, ResolvedEmotion>;
  defaultChance: number;
  cooldownSeconds: number;
  moodTtlMinutes: number;
  moodFromPic: boolean;
  moodWatchNoMoodCount: number;
  moodWatchSilentMinutes: number;
  popup: ResolvedPopup;
  prompt: ResolvedPrompt;
}

/** 缺省、空文本、或旧默认全文都视为「用户没自定义过」,用新默认;别的原样用,超长截断。 */
export function resolvePrompt(value: unknown): ResolvedPrompt {
  const raw = typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};
  const enabled = raw.enabled !== false;
  const rawText = typeof raw.text === 'string' ? raw.text : '';
  const normalized = rawText.replace(/\r\n/g, '\n').trim();
  const custom = normalized !== '' && normalized !== LEGACY_DEFAULT_TEXT_V1.replace(/\r\n/g, '\n').trim();
  const text = custom ? rawText : DEFAULT_PROMPT_TEXT;
  return { enabled, text: text.slice(0, PROMPT_MAX_LENGTH) };
}

/** 读配置后的弹出设置;坐标两个都给才生效,否则用默认位置。 */
export interface ResolvedPopup {
  enabled: boolean;
  x: number | null;
  y: number | null;
  duration: number;
  scale: number;
  queue: boolean;
  radius: number;
  followPet: boolean;
  followSide: 'auto' | 'left' | 'right';
  followGap: number;
  followOffsetY: number;
}

function coordOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(1, Math.max(0, value))
    : null;
}

export function resolvePopup(cfg: EmotePicsConfigSection): ResolvedPopup {
  const rawDuration = cfg.popupDuration;
  const duration = rawDuration === 3
    ? 3
    : typeof rawDuration === 'number' && Number.isFinite(rawDuration) && rawDuration > 0
      ? Math.min(60, Math.max(0.5, rawDuration))
      : 3;
  const rawScale = cfg.popupScale;
  const scale = rawScale === 1
    ? 0.25
    : typeof rawScale === 'number' && Number.isFinite(rawScale) && rawScale > 0
      ? Math.min(3, Math.max(0.1, rawScale))
      : 0.25;
  const rawRadius = cfg.popup?.radius;
  const radius = rawRadius === 16
    ? 20
    : typeof rawRadius === 'number' && Number.isFinite(rawRadius)
      ? Math.min(64, Math.max(0, rawRadius))
      : 20;
  const side = cfg.popupFollowSide === 'left' || cfg.popupFollowSide === 'right'
    ? cfg.popupFollowSide
    : 'auto';
  const rawGap = cfg.popupFollowGap;
  const gap = rawGap === 20
    ? 20
    : typeof rawGap === 'number' && Number.isFinite(rawGap) && rawGap >= 0
      ? Math.min(200, rawGap)
      : 20;
  const rawOffsetY = cfg.popupFollowOffsetY;
  const offsetY = rawOffsetY === 8
    ? 20
    : typeof rawOffsetY === 'number' && Number.isFinite(rawOffsetY) && rawOffsetY >= 0
      ? Math.min(200, rawOffsetY)
      : 20;
  // Old configs stored false as the built-in default; only an explicit panel write (set flag)
  // keeps false. Missing/legacy false both become true.
  const followPet = cfg.popupFollowPetSet === true ? cfg.popupFollowPet !== false : true;
  return {
    enabled: cfg.popupEnabled !== false,
    x: coordOrNull(cfg.popupX),
    y: coordOrNull(cfg.popupY),
    duration,
    scale,
    queue: cfg.popupQueue !== false,
    radius,
    followPet,
    followSide: side,
    followGap: gap,
    followOffsetY: offsetY,
  };
}

/** 把配置规整成 19 个表情的实际设置;旧格式 `folders` 当 `defaultChance` 读。 */
export function resolveConfig(cfg: EmotePicsConfigSection): ResolvedConfig {
  const defaultChance = clampChance(cfg.defaultChance, DEFAULT_CHANCE);
  const cooldownSeconds = typeof cfg.cooldownSeconds === 'number'
    && Number.isFinite(cfg.cooldownSeconds)
    && cfg.cooldownSeconds >= 0
    ? cfg.cooldownSeconds
    : DEFAULT_COOLDOWN_SECONDS;
  const moodTtlMinutes = typeof cfg.moodTtlMinutes === 'number'
    && Number.isFinite(cfg.moodTtlMinutes)
    && cfg.moodTtlMinutes >= 0
    ? cfg.moodTtlMinutes
    : DEFAULT_MOOD_TTL_MINUTES;
  const moodWatchNoMoodCount = typeof cfg.moodWatchNoMoodCount === 'number'
    && Number.isFinite(cfg.moodWatchNoMoodCount)
    && cfg.moodWatchNoMoodCount >= 0
    ? Math.floor(cfg.moodWatchNoMoodCount)
    : 10;
  const moodWatchSilentMinutes = typeof cfg.moodWatchSilentMinutes === 'number'
    && Number.isFinite(cfg.moodWatchSilentMinutes)
    && cfg.moodWatchSilentMinutes >= 0
    ? cfg.moodWatchSilentMinutes
    : 30;

  const rawEmotions = (cfg.emotions ?? {}) as Record<string, unknown>;
  const legacy = (cfg.folders ?? {}) as Record<string, unknown>;
  const emotions = {} as Record<Emotion, ResolvedEmotion>;
  for (const emotion of EMOTIONS) {
    const entry = typeof rawEmotions[emotion] === 'object' && rawEmotions[emotion] !== null
      ? rawEmotions[emotion] as Record<string, unknown>
      : {};
    const legacyDir = typeof legacy[emotion] === 'string' ? (legacy[emotion] as string) : '';
    // 写了 dir(哪怕是空串)就以它为准;没写才回落到旧的 folders。
    const dir = typeof entry.dir === 'string' ? entry.dir.trim() : legacyDir.trim();
    const chanceSet = typeof entry.chance === 'number' && Number.isFinite(entry.chance);
    emotions[emotion] = {
      dir,
      chance: chanceSet ? clampChance(entry.chance, defaultChance) : defaultChance,
      chanceSet,
    };
  }
  return {
    emotions,
    defaultChance,
    cooldownSeconds,
    moodTtlMinutes,
    moodFromPic: cfg.moodFromPic !== false,
    moodWatchNoMoodCount,
    moodWatchSilentMinutes,
    popup: resolvePopup(cfg),
    prompt: resolvePrompt(cfg.prompt),
  };
}
