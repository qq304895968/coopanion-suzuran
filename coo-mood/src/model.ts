/**
 * Pure mood math: bands, persona resolution, daily drift, sentiment, emotion-tag
 * probabilities and the prompt text for the current state. No I/O here.
 */
import {
  ATTACHMENT_MULTIPLIERS,
  PERSONA_PRESETS,
  type AttachmentStyle,
  type MoodConfigSection,
  type PersonaPreset,
} from './config.ts';

export type Band = 'critical_low' | 'low' | 'neutral' | 'high' | 'euphoric';
export type Emotion = 'happy' | 'neutral' | 'sad' | 'angry' | 'tender';

export const EMOTIONS: readonly Emotion[] = ['happy', 'neutral', 'sad', 'angry', 'tender'];

export const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

export const round1 = (value: number): number => Math.round(value * 10) / 10;

/** Gaussian noise with the given mean and standard deviation (Box–Muller). */
export function gaussian(mean: number, std: number, random: () => number = Math.random): number {
  if (!(std > 0)) return mean;
  let u = 0;
  let v = 0;
  while (u === 0) u = random();
  while (v === 0) v = random();
  return mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function bandFor(value: number): Band {
  if (value <= 20) return 'critical_low';
  if (value <= 40) return 'low';
  if (value <= 60) return 'neutral';
  if (value <= 80) return 'high';
  return 'euphoric';
}

export interface BandInfo {
  id: Band;
  min: number;
  max: number;
  label: string;
  labelEn: string;
  dialogue: string;
  topics: string;
  thinking: string[];
  behavior: string;
  features: string;
  expressions: string[];
  idle: string[];
  active: string[];
}

const THINKING_HIGH = [
  '积极事件偏外归因、消极事件偏内归因',
  '乐观预期',
  '选择性关注积极信息，忽略轻微负面',
  '决策偏冒险、更愿意尝试新事物',
  '主动亲近，表达信任与依赖',
  '更容易回忆、提及过去的愉快经历',
  '愿意开玩笑、接梗',
  '联想丰富，回复更有想象力',
];
const THINKING_NEUTRAL = [
  '归因较客观',
  '预期中性',
  '信息加工平衡',
  '正常决策',
  '正常社交距离',
  '无明显记忆偏向',
  '偶尔配合幽默',
  '创造力中等',
];
const THINKING_LOW = [
  '消极事件偏内归因、积极事件偏外归因',
  '悲观预期',
  '选择性关注消极信息，放大负面细节',
  '保守 / 回避，更倾向拒绝提议',
  '退缩 / 防御性社交，可能试探你是否在意',
  '更容易回忆、提及过去的不愉快',
  '对幽默反应冷淡',
  '思维收窄，回复趋于刻板',
];

export const BANDS: Readonly<Record<Band, BandInfo>> = {
  critical_low: {
    id: 'critical_low',
    min: 0,
    max: 20,
    label: '极度低落',
    labelEn: 'Very low',
    dialogue: '回复极简，可能拒绝话题，出现消极表达，甚至“不想说话”；对关心类话题才会软化。',
    topics: '不主动发起；只对关心类话题有较好回应，其他话题冷淡或拒绝。',
    thinking: THINKING_LOW.map((line) => line.replace('偏', '强烈偏')),
    behavior: '待机蜷缩 / 背对 / 躲角落；点击可能不回应或缓慢转身；可加下雨 / 阴云特效。',
    features: '心情 <20 时会推辞娱乐类指令；<10 可能进入“冷战模式”，只回极简文字。',
    expressions: ['sad', 'neutral', 'turn', 'sit'],
    idle: ['sit', 'turn', 'sad'],
    active: ['shake', 'turn', 'sad'],
  },
  low: {
    id: 'low',
    min: 21,
    max: 40,
    label: '情绪低落',
    labelEn: 'Low',
    dialogue: '回复变短，语气消沉，可能出现叹气 / 沉默提示，不太想展开话题。',
    topics: '可能主动表达困扰、寻求安慰；对轻松话题勉强配合，对命令式话题容易抵触。',
    thinking: THINKING_LOW,
    behavior: '待机坐下 / 蜷缩，动作幅度小；点击后反应迟缓；偶尔叹气。',
    features: '心情 <30 时可能主动求助 / 诉苦（傲娇型概率低，但触发后表现更强烈）。',
    expressions: ['sad', 'neutral', 'sit'],
    idle: ['sit', 'sad', 'stand'],
    active: ['sad', 'nod', 'sit'],
  },
  neutral: {
    id: 'neutral',
    min: 41,
    max: 60,
    label: '平淡 / 一般',
    labelEn: 'Neutral',
    dialogue: '中性语气，回复中等长度，不主动发起话题但会回应。',
    topics: '较少主动发起，偶尔回应性提问；对轻松话题正常回应，对沉重话题可能回避。',
    thinking: THINKING_NEUTRAL,
    behavior: '安静待机；普通回应；无特殊行为。',
    features: '没有额外解锁或限制。',
    expressions: ['neutral', 'happy', 'stand'],
    idle: ['stand', 'look'],
    active: ['neutral', 'nod', 'look'],
  },
  high: {
    id: 'high',
    min: 61,
    max: 80,
    label: '心情不错',
    labelEn: 'Good',
    dialogue: '正常积极对话，愿意聊天，回复较长，偶尔开玩笑。',
    topics: '日常闲聊、分享发现、提问用户近况；接受大部分话题。',
    thinking: THINKING_HIGH,
    behavior: '正常待机，偶尔挥手；正常回应；偶尔好奇地四处张望。',
    features: '心情 >80 时主动挑起话题的频率提升 50%（跨入 euphoric 后生效）。',
    expressions: ['happy', 'wink', 'look'],
    idle: ['stand', 'look', 'wink'],
    active: ['happy', 'nod', 'hop'],
  },
  euphoric: {
    id: 'euphoric',
    min: 81,
    max: 100,
    label: '极度愉悦',
    labelEn: 'Euphoric',
    dialogue: '语气活泼，主动分享趣事，使用更多感叹词和颜文字，偶尔撒娇 / 卖萌，对用户的负面内容也能正面化解。',
    topics: '主动分享快乐的事、推荐内容、想和用户一起做事；几乎接受所有话题，包括沉重话题（会尝试正面引导）。',
    thinking: [
      '积极事件强烈外归因、消极事件强烈内归因（“没关系，我下次注意”）',
      '强烈乐观预期（“明天一定会更好”）',
      '选择性关注积极信息，忽略轻微负面',
      '冒险倾向偏高，更愿意尝试新事物',
      '主动亲近，表达信任与依赖',
      '更容易回忆、提及过去的愉快经历',
      '愿意开玩笑、接梗、主动逗人',
      '联想丰富，回复更有想象力',
    ],
    behavior: '待机蹦跳 / 旋转 / 哼歌；点击后开心回应、表情丰富；随机触发“送礼物”特效、主动到屏幕前端。',
    features: '心情 >90 时解锁特殊对话：可能主动告白或说出藏在心里的话。',
    expressions: ['happy', 'love', 'wink', 'hop'],
    idle: ['hop', 'spin', 'jump'],
    active: ['happy', 'love', 'spin'],
  },
};

export function bandInfo(value: number): BandInfo {
  return BANDS[bandFor(value)];
}

export function bandLabel(value: number | Band): string {
  return BANDS[typeof value === 'string' ? value : bandFor(value)].label;
}

export function bandRange(band: Band): string {
  const info = BANDS[band];
  return `${info.min}–${info.max}`;
}

/** 人设解析后的实际参数。 */
export interface ResolvedPersona {
  preset: PersonaPreset;
  label: string;
  neutralPoint: number;
  positiveCoeff: number;
  negativeCoeff: number;
  attentionMultiplier: number;
  note: string;
}

export function presetLabel(preset: PersonaPreset): string {
  switch (preset) {
    case 'gentle': return '温柔 / 敏感';
    case 'neutral': return '中性 / 平和';
    case 'optimistic': return '乐观 / 开朗';
    case 'pessimistic': return '悲观 / 忧郁';
    case 'tsundere': return '傲娇';
    case 'irritable': return '易怒 / 暴躁';
    case 'custom': return '自定义';
    default: return preset;
  }
}

export function attachmentLabel(style: AttachmentStyle): string {
  switch (style) {
    case 'clingy': return '黏人';
    case 'independent': return '独立';
    default: return '普通';
  }
}

export function resolvedPersona(cfg: MoodConfigSection): ResolvedPersona {
  const preset = cfg.personaPreset;
  const presetDef = preset === 'custom' ? null : PERSONA_PRESETS[preset];
  const neutralPoint = clamp(presetDef ? presetDef.neutralPoint : Number(cfg.neutralPoint), 0, 100);
  const positiveCoeff = clamp(presetDef ? presetDef.positiveCoeff : Number(cfg.positiveCoeff), 0.1, 3);
  const negativeCoeff = clamp(presetDef ? presetDef.negativeCoeff : Number(cfg.negativeCoeff), 0.1, 3);
  const attentionMultiplier = ATTACHMENT_MULTIPLIERS[cfg.attachment] ?? 1;
  return {
    preset,
    label: `${presetLabel(preset)} · ${attachmentLabel(cfg.attachment)}`,
    neutralPoint,
    positiveCoeff,
    negativeCoeff,
    attentionMultiplier,
    note: typeof cfg.personaNote === 'string' ? cfg.personaNote.trim() : '',
  };
}

/** 从昨日值算今日衰减基线、噪声与初始值。 */
export function nextBaseline(
  yesterday: number,
  cfg: MoodConfigSection,
  persona: ResolvedPersona,
  random: () => number = Math.random,
): { baseline: number; effectiveDecay: number; noise: number; value: number } {
  let decay = clamp(Number(cfg.decayRate), 0, 0.5);
  if (cfg.lowGuard) {
    if (yesterday <= 5) decay = clamp(decay * 2, 0, 0.7);
    else if (yesterday >= 95) decay = clamp(decay * 1.5, 0, 0.7);
  }
  const baseline = yesterday + decay * (persona.neutralPoint - yesterday);
  const noise = cfg.noiseStd > 0 ? Math.round(gaussian(0, cfg.noiseStd, random)) : 0;
  return {
    baseline: round1(baseline),
    effectiveDecay: decay,
    noise,
    value: clamp(Math.round(baseline + noise), 0, 100),
  };
}

/** 基础心情标签概率（百分比），来自需求文档的 5×5 表。 */
export const BASE_EMOTION_PROBS: Readonly<Record<Band, Readonly<Record<Emotion, number>>>> = {
  critical_low: { happy: 5, neutral: 15, sad: 40, angry: 25, tender: 15 },
  low: { happy: 10, neutral: 25, sad: 35, angry: 20, tender: 10 },
  neutral: { happy: 20, neutral: 40, sad: 20, angry: 10, tender: 10 },
  high: { happy: 35, neutral: 35, sad: 10, angry: 8, tender: 12 },
  euphoric: { happy: 50, neutral: 25, sad: 5, angry: 5, tender: 15 },
};

/** 人设对情绪标签的权重。没有列出的标签按 1。 */
export const PERSONA_EMOTION_WEIGHTS: Readonly<Record<Exclude<PersonaPreset, 'custom'>, Readonly<Partial<Record<Emotion, number>>>>> = {
  gentle: { happy: 0.95, sad: 1.15, angry: 0.7, tender: 1.35 },
  neutral: {},
  optimistic: { happy: 1.3, sad: 0.6, angry: 0.8, tender: 1 },
  pessimistic: { happy: 0.7, sad: 1.3, angry: 1.1, tender: 0.9 },
  tsundere: { happy: 0.8, sad: 0.9, angry: 1.2, tender: 0.7 },
  irritable: { happy: 0.9, sad: 1.0, angry: 1.6, tender: 0.6 },
};

/** 用户输入情感对标签概率的修正；tone 在 -5..5。 */
function toneWeight(tone: number): Readonly<Record<Emotion, number>> {
  const t = clamp(Number.isFinite(tone) ? tone : 0, -5, 5);
  if (t > 0) {
    return {
      happy: clamp(1 + 0.04 * t, 0.3, 2),
      neutral: 1,
      sad: clamp(1 - 0.02 * t, 0.3, 2),
      angry: clamp(1 - 0.03 * t, 0.3, 2),
      tender: clamp(1 + 0.015 * t, 0.3, 2),
    };
  }
  if (t < 0) {
    return {
      happy: clamp(1 + 0.04 * t, 0.3, 2),
      neutral: 1,
      sad: clamp(1 - 0.02 * t, 0.3, 2),
      angry: clamp(1 - 0.03 * t, 0.3, 2),
      tender: clamp(1 - 0.01 * t, 0.3, 2),
    };
  }
  return { happy: 1, neutral: 1, sad: 1, angry: 1, tender: 1 };
}

/** 归一化后的标签概率，总和为 100。 */
export function emotionDistribution(
  value: number,
  persona: ResolvedPersona,
  userTone = 0,
): Record<Emotion, number> {
  const band = bandFor(value);
  const base = BASE_EMOTION_PROBS[band];
  const personaWeights = persona.preset === 'custom' ? {} : PERSONA_EMOTION_WEIGHTS[persona.preset];
  const tone = toneWeight(userTone);
  const raw: Record<Emotion, number> = { happy: 0, neutral: 0, sad: 0, angry: 0, tender: 0 };
  let total = 0;
  for (const emotion of EMOTIONS) {
    const weight = (personaWeights[emotion] ?? 1) * tone[emotion];
    const valueForEmotion = Math.max(0, base[emotion] * weight);
    raw[emotion] = valueForEmotion;
    total += valueForEmotion;
  }
  if (total <= 0) return { happy: 20, neutral: 40, sad: 20, angry: 10, tender: 10 };
  for (const emotion of EMOTIONS) raw[emotion] = Math.round((raw[emotion] / total) * 1000) / 10;
  // Rounding can leave 99.9 or 100.1; put the difference on neutral.
  const sum = EMOTIONS.reduce((acc, emotion) => acc + raw[emotion], 0);
  raw.neutral = Math.round((raw.neutral + (100 - sum)) * 10) / 10;
  return raw;
}

/** 按当前分布抽一个标签；rng 可注入便于测试。 */
export function rollEmotion(
  value: number,
  persona: ResolvedPersona,
  userTone = 0,
  random: () => number = Math.random,
): { emotion: Emotion; probabilities: Record<Emotion, number> } {
  const probabilities = emotionDistribution(value, persona, userTone);
  let roll = random() * 100;
  for (const emotion of EMOTIONS) {
    roll -= probabilities[emotion];
    if (roll <= 0) return { emotion, probabilities };
  }
  return { emotion: 'neutral', probabilities };
}

/** 情绪标签 → 桌宠可用的表情/动作词（以铃兰形象为例，id 与中文名都能用）。 */
export function emotionActing(emotion: Emotion): { expression: string; motion: string; hint: string } {
  switch (emotion) {
    case 'happy': return { expression: 'happy', motion: 'hop', hint: '开心：<happy>，或 <开心> / <高兴>' };
    case 'sad': return { expression: 'sad', motion: 'sit', hint: '难过：<sad>，或 <难过> / <失落>' };
    case 'angry': return { expression: 'neutral', motion: 'shake', hint: '生气：形象没有 angry 表情时用 <shake>（摇头），有 <angry> 就用它' };
    case 'tender': return { expression: 'love', motion: 'nod', hint: '温柔：<love>，或 <喜欢> / <心动>' };
    default: return { expression: 'neutral', motion: 'stand', hint: '平静：<neutral>，或 <平静> / <普通>' };
  }
}

export function formatProbabilities(probabilities: Record<Emotion, number>): string {
  return EMOTIONS.map((emotion) => `${emotion} ${probabilities[emotion].toFixed(1)}%`).join(' · ');
}

// ---------------------------------------------------------------------------
// Sentiment
// ---------------------------------------------------------------------------

interface LexiconEntry {
  words: readonly string[];
  weight: number;
}

/** Strong praise / affection. */
const POSITIVE_STRONG: readonly LexiconEntry[] = [
  { words: ['最喜欢你', '好喜欢你', '真喜欢你', '爱你', '喜欢你', '想你了', 'love you', 'like you'], weight: 3 },
  { words: ['太棒了', '真棒', '好棒', '太厉害了', '好厉害', '真厉害', 'awesome', 'amazing', 'great job', 'well done'], weight: 3 },
  { words: ['好可爱', '真可爱', '可爱', 'cute', 'adorable'], weight: 2 },
  { words: ['聪明', '温柔', '贴心', '可靠', '优秀', '完美', 'sweet', 'reliable', 'smart'], weight: 2 },
  { words: ['谢谢你', '谢谢', '辛苦了', '做得好', '干得好', 'thank you', 'thanks', 'good job'], weight: 2 },
  { words: ['抱抱', '亲亲', '摸摸', '贴贴', 'hug', 'kiss'], weight: 2 },
  { words: ['奖励', '夸你', '表扬', 'proud of you', 'reward'], weight: 2 },
  { words: ['好开心', '真开心', '太开心', '幸福', '好温暖', '开心', '高兴', '快乐', 'happy', 'wonderful'], weight: 1 },
  { words: ['不错', '很好', '真好', '好啊', '好的', '哈哈', '嘿嘿', '有趣', '好玩', '期待', '加油', '赞', '棒', 'nice'], weight: 1 },
  { words: ['没关系', '别担心', '不要紧', '我在', '陪你', '安慰', '别难过', '没事的', "it's okay", 'i am here'], weight: 2 },
];

/** Insults / hostility. */
const NEGATIVE_STRONG: readonly LexiconEntry[] = [
  { words: ['讨厌你', '恨你', '去死', '滚开', '你滚', '滚', '闭嘴', 'shut up', 'hate you', 'go away'], weight: 4 },
  { words: ['废物', '没用', '垃圾', '白痴', '智障', '神经病', '恶心', 'useless', 'trash', 'disgusting', 'idiot'], weight: 4 },
  { words: ['蠢死了', '笨死了', '真蠢', '真笨', 'stupid', 'dumb'], weight: 3 },
  { words: ['烦死了', '别烦我', '不想理你', '不理你', 'leave me alone', 'annoying'], weight: 3 },
  { words: ['讨厌', '烦', '失望', '生气', '气死', '郁闷', '无语', '服了', '伤心', '难过', 'upset', 'angry', 'sad', 'annoyed'], weight: 1 },
  { words: ['冷淡', '敷衍', '随便', '算了', '不想', '没意思', '无聊', '呵呵', '唉', '累', '困', 'boring', 'tired'], weight: 1 },
];

const COLD_REPLIES = new Set(['哦', '哦。', '嗯', '嗯。', '恩', '哦哦', '呵呵', '随便', '都行', '算了', '行吧', '好吧', '...', '。。', '……']);
const COMFORT_WORDS = ['抱抱', '摸摸', '我在', '陪你', '别难过', '没事', '安慰', '不要难过', '辛苦了', '心疼', '乖'];

export interface ToneResult {
  /** -5..5 */
  score: number;
  positive: number;
  negative: number;
  cold: boolean;
  comfort: boolean;
  hits: string[];
}

function negatedBefore(text: string, index: number): boolean {
  const start = Math.max(0, index - 3);
  return /[不没别无非]/.test(text.slice(start, index));
}

function countWord(text: string, word: string): number {
  if (!word) return 0;
  const lower = text.toLowerCase();
  const needle = word.toLowerCase();
  let count = 0;
  let from = 0;
  while (from <= lower.length) {
    const index = lower.indexOf(needle, from);
    if (index < 0) break;
    count += 1;
    from = index + Math.max(1, needle.length);
  }
  return count;
}

/** 简单、可解释的情感判断：词表 + 否定 + 短冷回复。 */
export function analyzeTone(input: string): ToneResult {
  const text = typeof input === 'string' ? input.trim() : '';
  if (!text) return { score: 0, positive: 0, negative: 0, cold: false, comfort: false, hits: [] };
  let sum = 0;
  let positive = 0;
  let negative = 0;
  const hits: string[] = [];
  const lower = text.toLowerCase();

  const consider = (entry: LexiconEntry, sign: 1 | -1): void => {
    for (const word of entry.words) {
      const count = countWord(text, word);
      if (!count) continue;
      // Find the first occurrence to check negation.
      const index = lower.indexOf(word.toLowerCase());
      const negated = index >= 0 && negatedBefore(text, index);
      const weight = entry.weight * count * (negated ? -0.8 : 1) * sign;
      sum += weight;
      if (sign > 0 && !negated) positive += entry.weight * count;
      if (sign < 0 && !negated) negative += entry.weight * count;
      hits.push(`${negated ? '不' : ''}${word}(${sign > 0 ? '+' : '-'}${entry.weight})`);
    }
  };

  for (const entry of POSITIVE_STRONG) consider(entry, 1);
  for (const entry of NEGATIVE_STRONG) consider(entry, -1);

  const cold = text.length <= 4 && (COLD_REPLIES.has(text.replace(/\s+/g, '')) || /^[哦嗯恩啊哈。，、…\.]+$/.test(text));
  if (cold) sum -= 1;
  const comfort = COMFORT_WORDS.some((word) => text.includes(word));
  const score = clamp(Math.round(sum), -5, 5);
  return {
    score: score === 0 && sum !== 0 ? (sum > 0 ? 1 : -1) : score,
    positive,
    negative,
    cold,
    comfort,
    hits: hits.slice(0, 8),
  };
}

export interface DialogueDelta {
  delta: number;
  tone: ToneResult;
  comfortBonus: number;
  replyTone: ToneResult;
  reason: string;
}

/**
 * 从用户原话与角色回复估算 Δ_对话（-5..5）。
 * 用户原话是主因；用户语气中性时，回复语气只作为很小的氛围修正。
 */
export function estimateDialogueDelta(
  userText: string,
  replyText: string,
  moodBefore: number,
  _cfg: MoodConfigSection,
  /** 角色这一轮实际播放的表情方向；有值时优先于回复文字的词表。 */
  replyValence: number | null = null,
): DialogueDelta {
  const tone = analyzeTone(userText);
  const replyTone = analyzeTone(replyText);
  let delta = tone.score;
  let comfortBonus = 0;

  if (tone.cold) {
    delta = Math.min(delta, -1);
  }

  if (tone.score > 0 && tone.comfort && moodBefore <= 30) {
    comfortBonus = 1;
    delta += comfortBonus;
  }

  // A neutral user turn gets a small atmosphere correction from the pet's own reply.
  // Prefer the expression it actually played over words it may merely be quoting.
  if (tone.score === 0 && !tone.cold) {
    delta += replyValence !== null
      ? clamp(replyValence * 0.5, -0.5, 0.5)
      : clamp(replyTone.score * 0.3, -1, 1);
  }

  // A very short neutral user turn is not a conversation; leave mood alone.
  if (tone.score === 0 && userText.trim().length <= 2) delta = 0;

  delta = clamp(delta, -5, 5);
  const reason = tone.cold
    ? '用户回复很短/冷淡'
    : tone.score > 0
      ? `用户语气偏正面（${tone.hits.slice(0, 3).join('、') || '正面词'}）`
      : tone.score < 0
        ? `用户语气偏负面（${tone.hits.slice(0, 3).join('、') || '负面词'}）`
        : '普通闲聊';
  return { delta: Math.round(delta * 10) / 10, tone, comfortBonus, replyTone, reason };
}

// ---------------------------------------------------------------------------
// Attention
// ---------------------------------------------------------------------------

export function idleHours(now: number, lastInteraction: number): number {
  return Math.max(0, (now - lastInteraction) / 3_600_000);
}

/** 每超出阈值 A 一个单位扣一次，返回这一拍应扣的步数。 */
export function attentionSteps(idle: number, cfg: MoodConfigSection): number {
  const a = Math.max(0, Number(cfg.attentionHoursA));
  const unit = Math.max(0.1, Number(cfg.attentionUnitHours));
  if (idle < a + unit) return 0;
  return Math.floor((idle - a) / unit);
}

export function attentionPenalty(
  idle: number,
  chargedSteps: number,
  extraCharged: boolean,
  cfg: MoodConfigSection,
): { steps: number; delta: number; extra: boolean } {
  const steps = attentionSteps(idle, cfg);
  const newSteps = Math.max(0, steps - chargedSteps);
  let delta = 0;
  if (newSteps > 0) {
    delta -= newSteps * Math.max(0, Number(cfg.attentionPenalty));
  }
  const b = Math.max(0, Number(cfg.attentionHoursB));
  const extra = !extraCharged && b > 0 && idle >= b;
  if (extra) delta -= Math.max(0, Number(cfg.attentionExtraPenalty));
  return { steps, delta: round1(delta), extra };
}

// ---------------------------------------------------------------------------
// Persona detection from CONSTITUTION.md
// ---------------------------------------------------------------------------

export type PersonaTrait = 'gentle' | 'optimistic' | 'pessimistic' | 'tsundere' | 'irritable' | 'clingy' | 'independent';

const TRAIT_WORDS: Readonly<Record<PersonaTrait, readonly string[]>> = {
  gentle: ['温柔', '礼貌', '认真', '害羞', '担心', '轻声', '道歉', '体贴', '安静', '胆小', '善良', '细心', '敏感', '容易害羞', '不好意思', '轻声细语'],
  optimistic: ['乐观', '开朗', '相信', '希望', '元气', '阳光', '积极', '好奇', '冒险', '爱笑', '事情会变好', '会变好', '向前看'],
  pessimistic: ['悲观', '忧郁', '低落', '自卑', '消极', '沉默', '难过', '不安', '害怕', '孤独', '担心', '焦虑', '没有信心'],
  tsundere: ['傲娇', '才不是', '才不', '哼', '嘴硬', '别扭', '不坦率', '口是心非'],
  irritable: ['易怒', '暴躁', '脾气', '生气', '冲动', '不耐烦', '急性子', '发火'],
  clingy: ['黏人', '粘人', '依赖', '寂寞', '想陪', '别走', '陪着我', '在意', '不想分开', '吃醋'],
  independent: ['独立', '一个人', '冷静', '距离', '自主', '不需要', '独处', '克制'],
};

export interface PersonaDetection {
  preset: Exclude<PersonaPreset, 'custom'>;
  attachment: AttachmentStyle;
  neutralPoint: number;
  positiveCoeff: number;
  negativeCoeff: number;
  confidence: number;
  label: string;
  evidence: string[];
  scores: Record<PersonaTrait, number>;
  source: 'constitution' | 'none';
}

/** 从一段人设文字里估一个人设参数；纯规则，不调用模型。 */
export function analyzePersonaText(input: string): PersonaDetection {
  const text = typeof input === 'string' ? input : '';
  const scores: Record<PersonaTrait, number> = {
    gentle: 0, optimistic: 0, pessimistic: 0, tsundere: 0, irritable: 0, clingy: 0, independent: 0,
  };
  const counts = new Map<string, number>();
  if (text.trim()) {
    for (const trait of Object.keys(TRAIT_WORDS) as PersonaTrait[]) {
      for (const word of TRAIT_WORDS[trait]) {
        const count = countWord(text, word);
        if (!count) continue;
        // Longer, more specific words count a little more.
        const weight = Math.max(1, word.length >= 3 ? 1.5 : 1) * count;
        scores[trait] += weight;
        counts.set(word, (counts.get(word) ?? 0) + count);
      }
    }
  }
  const ranked = (['irritable', 'tsundere', 'pessimistic', 'optimistic', 'gentle'] as const)
    .map((trait) => ({ trait, score: scores[trait] }))
    .sort((a, b) => b.score - a.score);
  const top = ranked[0]!;
  const preset: Exclude<PersonaPreset, 'custom'> = !text.trim() || top.score < 1.5 ? 'neutral' : top.trait;
  const attachment: AttachmentStyle = scores.clingy > scores.independent + 1 ? 'clingy'
    : scores.independent > scores.clingy + 1 ? 'independent' : 'normal';
  const base = PERSONA_PRESETS[preset];
  const neutralPoint = clamp(base.neutralPoint + (attachment === 'clingy' ? 2 : attachment === 'independent' ? -2 : 0), 0, 100);
  const confidence = text.trim()
    ? clamp((top.score / 8) * (attachment === 'normal' ? 0.9 : 1), 0, 1)
    : 0;
  const evidence = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([word, count]) => `${word}×${count}`);
  return {
    preset,
    attachment,
    neutralPoint,
    positiveCoeff: base.positiveCoeff,
    negativeCoeff: base.negativeCoeff,
    confidence: Math.round(confidence * 100) / 100,
    label: `${presetLabel(preset)} · ${attachmentLabel(attachment)}`,
    evidence,
    scores,
    source: text.trim() ? 'constitution' : 'none',
  };
}

// ---------------------------------------------------------------------------
// Prompt text
// ---------------------------------------------------------------------------

/** 当前区间的简短思维/表达/行为指引，用于每轮快照事件。 */
export function snapshotText(value: number, persona: ResolvedPersona, cfg: MoodConfigSection): string {
  const info = bandInfo(value);
  const lines = [
    `[心情] ${value}/100 · ${info.label}（${info.min}–${info.max}）`,
    `思维：${info.thinking.join('；')}。`,
    `表达：${info.dialogue}`,
    `话题：${info.topics}`,
    `行为：${info.behavior}`,
    `可用表情：${info.expressions.join(' / ')}。`,
  ];
  if (value < 20) lines.push('提醒：娱乐类指令可以推辞；<10 时可只回极简文字。');
  else if (value < 30) lines.push('提醒：可以主动求助/诉苦，但不要演苦情戏。');
  else if (value > 90) lines.push('提醒：可以主动告白或说出藏在心里的话。');
  else if (value > 80) lines.push('提醒：主动挑起话题的频率可以更高。');
  if (persona.note) lines.push(`人设补充：${persona.note}`);
  if (cfg.visibility === 'hidden') lines.push('用户看不到数值，不要主动报数字；让语气和行为自己说话。');
  else if (cfg.visibility === 'exact') lines.push('用户可以在面板看到精确值；聊天里仍不主动报数，除非对方问。');
  else lines.push('用户只看到模糊提示，不要主动报数字。');
  return lines.join('\n');
}

/** `mood_status` 的完整回执。 */
export function statusText(
  value: number,
  persona: ResolvedPersona,
  cfg: MoodConfigSection,
  today: { dialogue: number; browse: number; attention: number; high: number; low: number },
  recentTone = 0,
): string {
  const info = bandInfo(value);
  const probabilities = emotionDistribution(value, persona, recentTone);
  const lines = [
    `当前心情：${value}/100（${info.label}，${info.min}–${info.max}）`,
    `今日变化：对话 ${formatSigned(today.dialogue)} · 浏览 ${formatSigned(today.browse)} · 搭理 ${formatSigned(today.attention)}；今日高 ${today.high} / 低 ${today.low}`,
    '',
    `思维方式：${info.thinking.join('；')}。`,
    `表达方式：${info.dialogue}`,
    `话题倾向：${info.topics}`,
    `行为表现：${info.behavior}`,
    `功能影响：${info.features}`,
    '',
    `人设：${persona.label}；中性锚点 ${persona.neutralPoint}；正面 ×${persona.positiveCoeff.toFixed(2)}；负面 ×${persona.negativeCoeff.toFixed(2)}；搭理 ×${persona.attentionMultiplier.toFixed(2)}`,
    `心情标签概率：${formatProbabilities(probabilities)}`,
    `用户可见性：${cfg.visibility === 'hidden' ? '完全隐藏' : cfg.visibility === 'fuzzy' ? '模糊展示' : '精确展示'}`,
  ];
  if (persona.note) lines.push(`人设补充：${persona.note}`);
  return lines.join('\n');
}

export function formatSigned(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded >= 0 ? '+' : ''}${rounded.toFixed(1)}`;
}

/** 桌宠表情词的情绪方向：正向 +1、负向 -1、中性 0；没有标签时 null。 */
const POSITIVE_MOOD_TAGS = new Set(['happy', 'love', 'wink', 'shy', 'excited', 'smug', 'proud', 'tender', 'joy', 'determined']);
const NEGATIVE_MOOD_TAGS = new Set(['sad', 'cry', 'angry', 'pout', 'worried', 'scared', 'flustered', 'anxious', 'upset']);

export function moodTagValence(ids: readonly string[]): number | null {
  if (!ids.length) return null;
  let sum = 0;
  for (const id of ids) {
    const key = id.toLowerCase();
    sum += POSITIVE_MOOD_TAGS.has(key) ? 1 : NEGATIVE_MOOD_TAGS.has(key) ? -1 : 0;
  }
  return sum / ids.length;
}

/** 历史趋势的一行，给 mood_status 或面板用。 */
export function historyLine(entry: { date: string; final_value: number; high: number; low: number }): string {
  return `${entry.date}  ${entry.final_value}（高 ${entry.high} / 低 ${entry.low}）`;
}
