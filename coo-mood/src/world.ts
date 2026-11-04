/**
 * 心情 World:一个会自然回归的心情值,对话 / 浏览 / 搭理三个通道驱动它,
 * 它反过来改变说法、想法、待机表现与主动程度。
 *
 * Core 的 system 前缀只在 session 开始 / 交接时重建,所以除了环境段之外,
 * 每轮用一条 piggyback 内部事件把当前心情快照送到下一轮模型请求之前。
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  EventEnvelope, EventTag, OutputTap, ToolDef, ToolOutcome, TriggerMode, World, WorldHost, WorldWebUiDecl,
} from 'cortico/core/types.ts';
import type { Language } from 'cortico/core/language.ts';
import type { StreamEvent } from 'cortico/protocol/open-responses/index.ts';
import type { DeepPartial } from 'cortico/world.ts';
import { nowIso } from 'cortico/core/util.ts';
import { MOOD_DEFAULTS, moodConfigGroups, moodConfigOptions, type MoodConfigSection } from './config.ts';
import {
  findChoiceByText, galAskOptions, galAskQuestion, moodReactionNote, optionsMatch,
  validateGalDraft, type GalActive, type GalSource,
} from './gal.ts';
import {
  analyzePersonaText, analyzeTone, attentionPenalty, bandInfo, bandLabel, clamp,
  emotionActing, emotionDistribution, estimateDialogueDelta, formatProbabilities, formatSigned,
  historyLine, idleHours, moodTagValence, rollEmotion, resolvedPersona, snapshotText, statusText,
  type Band, type Emotion,
} from './model.ts';
import { MoodStore, dateIn, type ApplyResult, type DeltaSource, type MoodHistoryEntry, type RolloverResult } from './store.ts';

const ENV_PROMPT_FILE = fileURLToPath(new URL('./ENV_PROMPT.md', import.meta.url));

/** 每分钟看一次日期和搭理阈值;真正的扣分只在跨过单位时发生。 */
const TICK_MS = 60_000;
const MAX_CONSTITUTION_BYTES = 256 * 1024;

const clampInt = (value: unknown, minimum: number, maximum: number, fallback: number): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.round(value)));
};

const numberOr = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const textOr = (value: unknown, fallback = ''): string => (typeof value === 'string' ? value : fallback);

function fail(text: string): ToolOutcome {
  return { text, failed: true };
}

export interface MoodWorldOptions {
  cfg: MoodConfigSection;
  timezone: string;
  botDir: string;
  dataDir: string;
  /** 写回 worlds.mood;用于面板的「从人设识别」。 */
  persist: (patch: DeepPartial<MoodConfigSection>) => void;
  now?: () => Date;
  random?: () => number;
}

/** 全部可能出现的工具声明;`tools()` 会按配置删掉 mood_feel。 */
export const MOOD_TOOL_DECLS: ReadonlyArray<Omit<ToolDef, 'handler'>> = [
  {
    name: 'mood_status',
    description:
      '查看当前心情值、区间、思维方式、表达/行为指引、今日三个通道的变化与最近几天趋势。用户问“你最近心情怎么样”、或你想确认自己现在的底色时用它。这是给你自己看的；聊天里不要直接报数字，除非用户明确要求。',
    tags: ['read'],
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        days: {
          type: 'integer',
          minimum: 0,
          maximum: 30,
          description: '附带最近几天的每日结算；0 = 只看今天。缺省 7。',
        },
      },
    },
  },
  {
    name: 'mood_apply',
    description:
      '给心情记一笔外部影响。source=browse 表示刚看完屏幕内容；source=event 表示别的插件或事件注入；source=dialogue 表示这一轮对话（只有 mood_feel 不可用时才用）。delta 是期望变化量，插件会再按人设系数、边际递减和单日上限折算。不要为了讨好用户反复调用。',
    tags: ['write'],
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        source: {
          type: 'string',
          enum: ['browse', 'event', 'dialogue'],
          description: '变化来自哪个通道。',
        },
        delta: {
          type: 'number',
          minimum: -10,
          maximum: 10,
          description: '期望变化量；负数变差，正数变好。',
        },
        reason: {
          type: 'string',
          description: '一句原因，会写进最近变化；不要写成长篇。',
        },
      },
      required: ['source', 'delta'],
    },
  },
  {
    name: 'mood_roll',
    description:
      '按当前心情值、人设和用户语气抽一个心情标签（happy/neutral/sad/angry/tender），并给出可用的桌宠表情/动作词和给 emote_pic 的图片标签。说话前想带情绪标记时用它，例如把返回的 happy 写成 <happy>；不要每次说话都抽，只在这句确实有情绪时用。',
    tags: ['read'],
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        user_tone: {
          type: 'number',
          minimum: -5,
          maximum: 5,
          description: '可选的用户语气；省略时沿用上一轮自动判断。',
        },
        reason: {
          type: 'string',
          description: '可选：为什么这次要抽标签。',
        },
      },
    },
  },
  {
    name: 'mood_feel',
    description:
      '（需在配置里开启“允许模型自报”）每轮真正回完话后，报一下这一轮用户的语气：user_tone -5..5，负数=冷漠/攻击，正数=夸奖/亲近。cause 写一句原因。插件会自己折算成人设系数与单日上限；不要用它给自己刷好感。',
    tags: ['write'],
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        user_tone: {
          type: 'number',
          minimum: -5,
          maximum: 5,
          description: '这一轮用户的语气，-5（很负面）..+5（很正面）。',
        },
        cause: {
          type: 'string',
          description: '一句原因，例如“用户夸我可爱”“用户很不耐烦”。',
        },
      },
      required: ['user_tone'],
    },
  },
  {
    name: 'gal_start',
    description:
      '准备一道情境问答（Galgame）。用户说“来个小故事 / 考考我 / 出个题”，或收到 [小游戏] 提示且你想开始时调用。传入情境、问题、三个选项（delta -5..+5，一个最好、一个最差、一个中间）。校验通过后回执会给你 pet_ask 的准确参数；按回执显示，不要自己把 delta 说给用户。',
    tags: ['write'],
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        situation: {
          type: 'string',
          description: '情境描述，50–100 字，第一人称，符合你的人设和近期记忆。',
        },
        question: {
          type: 'string',
          description: '一句问题，问用户会怎么做。',
        },
        choices: {
          type: 'array',
          minItems: 3,
          maxItems: 3,
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              text: { type: 'string', description: '选项正文，最多 36 字；不要带 A./B./C. 前缀。' },
              mood_delta: { type: 'integer', minimum: -5, maximum: 5, description: '选这个选项的心情变化，-5..+5。' },
            },
            required: ['text', 'mood_delta'],
          },
          description: '按 A/B/C 顺序的三个选项：一个最好、一个最差、一个中间。',
        },
        source: {
          type: 'string',
          enum: ['user', 'auto'],
          description: '用户主动要求用 user；收到 [小游戏] 提示用 auto。缺省 user。',
        },
      },
      required: ['situation', 'question', 'choices'],
    },
  },
];

const UI_TEXT = {
  zh: {
    label: '心情',
    lamp: '心情',
    offline: '尚未加载',
    promptTitle: '心情 · 环境提示词',
    promptDescription: '心情 World 进 system 前缀的那一段；当前区间由每轮快照事件补充。',
    valueVar: '当前心情值与区间。',
    bandVar: '当前区间的中文名。',
    thinkingVar: '当前区间的思维方式描述。',
    styleVar: '当前区间的说话风格。',
    behaviorVar: '当前区间的待机与互动表现。',
    featuresVar: '当前区间解锁或限制的功能。',
    personaVar: '当前人设参数。',
    todayVar: '今天的三个通道变化、最高与最低值。',
    reportVar: '是否要模型手动上报用户语气。',
    browseVar: '浏览通道如何记录。',
    historyVar: '最近七天的每日结算。',
    visibilityVar: '用户能看到心情的方式。',
    expressionVar: '当前区间倾向使用的桌宠表情词。',
    galVar: '情境问答（Galgame）的生成与显示规则；关闭时只有一句说明。',
    panelTitle: '心情概览',
    panelDescription: '当前值、区间、今日变化、最近几天趋势；可以从 CONSTITUTION.md 识别人设参数。',
  },
  en: {
    label: 'Mood',
    lamp: 'Mood',
    offline: 'not loaded',
    promptTitle: 'Mood · environment prompt',
    promptDescription: 'The section this World adds to the system prefix; the per-turn snapshot fills in the current band.',
    valueVar: 'The current value and band.',
    bandVar: 'The band name.',
    thinkingVar: 'The thinking style of the current band.',
    styleVar: 'The speaking style of the current band.',
    behaviorVar: 'Idle and interaction behaviour of the current band.',
    featuresVar: 'What the current band unlocks or refuses.',
    personaVar: 'The resolved persona parameters.',
    todayVar: 'Today’s channel changes, high and low.',
    reportVar: 'Whether the model should report the person’s tone.',
    browseVar: 'How the browsing channel is recorded.',
    historyVar: 'Daily settlements of the last seven days.',
    visibilityVar: 'How the person can see the mood.',
    expressionVar: 'Pet expression words this band tends to use.',
    galVar: 'How the situation quiz is generated and shown; one line when it is off.',
    panelTitle: 'Mood overview',
    panelDescription: 'The current value, band, today’s changes and recent trend; detect persona parameters from CONSTITUTION.md.',
  },
};

/** 面板返回的形状；客户端只按这个读。 */
export interface MoodOverview {
  value: number;
  band: string;
  bandLabel: string;
  range: string;
  thinking: string[];
  dialogue: string;
  topics: string;
  behavior: string;
  features: string;
  persona: {
    preset: string;
    label: string;
    neutralPoint: number;
    positiveCoeff: number;
    negativeCoeff: number;
    attentionMultiplier: number;
    note: string;
  };
  today: {
    dialogue: number;
    browse: number;
    attention: number;
    event: number;
    high: number;
    low: number;
    galStarted: number;
    galAnswered: number;
    galDismissed: number;
  };
  gal: {
    enabled: boolean;
    active: boolean;
    startedToday: number;
    answeredToday: number;
    dismissedToday: number;
    dailyLimit: number;
    remainingAuto: number;
  };
  history: Array<{ date: string; final_value: number; high: number; low: number }>;
  recent: Array<{ at: string; source: string; delta: number; before: number; after: number; reason: string; capped?: boolean }>;
  visibility: string;
  modelReport: boolean;
  autoDialogue: boolean;
  autoBrowse: boolean;
  lowDays: number;
  selfRescueAt: string | null;
  lastEmotion: { emotion: string; at: string } | null;
  updatedAt: string;
}

export interface PersonaDetectionResult {
  ok: true;
  path: string;
  textLength: number;
  detection: ReturnType<typeof analyzePersonaText>;
}

export class MoodWorld implements World {
  readonly id = 'mood';

  private host: WorldHost | null = null;
  private store: MoodStore | null = null;
  private ticker: NodeJS.Timeout | null = null;
  /** 上次用户互动（或本次启动）的时刻，用于搭理通道。 */
  private attentionSince = 0;
  /** 已处理到的事件游标；避免同一轮重复计算。 */
  private lastTurnCursor = 0;
  /** 外部插件通过 mood.external 注入的游标。 */
  private lastMoodEventCursor = 0;
  /** 最近一条尚未投递的 mood.snapshot 游标；推新的之前撤回旧的，避免积压多条状态。 */
  private lastSnapshotCursor = 0;
  /** 当前进行中的情境问答；只在内存里，重启即丢弃。 */
  private activeGal: GalActive | null = null;
  /** 本轮 assistant 的纯文本输出；桌宠用 pet_say 时通常是空。 */
  private turnText = '';
  /** 本轮是否已经由模型显式报了对话 / 浏览，避免自动估算重复。 */
  private explicitDialogue = false;
  private explicitBrowse = false;
  /** 最近一次用户语气，供 mood_status / mood_roll 使用。 */
  private lastTone = 0;
  private selfRescueAnnounced = '';

  constructor(private readonly options: MoodWorldOptions) {}

  private get cfg(): MoodConfigSection {
    // A deployment may add only `enabled` and leave the rest to the defaults;
    // merge on every read so a partial section is still safe.
    return { ...MOOD_DEFAULTS, ...this.options.cfg };
  }

  private get now(): () => Date {
    return this.options.now ?? (() => new Date());
  }

  private get random(): () => number {
    return this.options.random ?? Math.random;
  }

  private currentValue(): number {
    if (this.store) return this.store.data.value;
    const persona = resolvedPersona(this.cfg);
    return clamp(Math.round(this.cfg.initialValue > 0 ? this.cfg.initialValue : persona.neutralPoint), 0, 100);
  }

  // -------------------------------------------------------------------------
  // Public API for embedding/tests. Cross-World integration uses the
  // `mood.external` event instead, because Worlds do not share instances.
  // -------------------------------------------------------------------------

  /** 当前心情值 0–100。 */
  getValue(): number {
    return this.currentValue();
  }

  /** 施加一次变化；和模型工具走同一套系数、递减与上限。 */
  applyDelta(source: DeltaSource, delta: number, reason = '外部调用'): ApplyResult | null {
    return this.applyMood(source, delta, reason);
  }

  /** 当前心情标签概率（总和 100）。 */
  getEmotionProbabilities(userTone = 0): Record<Emotion, number> {
    return emotionDistribution(this.currentValue(), resolvedPersona(this.cfg), userTone);
  }

  /** 当前区间的思维方式 / 说法 / 行为 / 可用表情。 */
  getThinkingStyle(): {
    band: Band;
    value: number;
    thinking: string[];
    dialogue: string;
    behavior: string;
    features: string;
    expressions: string[];
  } {
    const info = bandInfo(this.currentValue());
    return {
      band: info.id,
      value: this.currentValue(),
      thinking: info.thinking,
      dialogue: info.dialogue,
      behavior: info.behavior,
      features: info.features,
      expressions: info.expressions,
    };
  }

  /** 最近几天的每日结算，旧→新。 */
  getHistory(days = 30): MoodHistoryEntry[] {
    return this.store?.history(days) ?? [];
  }

  /** 只报值；文本一律来自 ENV_PROMPT.md 模板。 */
  envPromptVars(): Record<string, string> {
    const cfg = this.cfg;
    const persona = resolvedPersona(cfg);
    const value = this.currentValue();
    const info = bandInfo(value);
    const today = this.store?.today() ?? { dialogue: 0, browse: 0, attention: 0, event: 0, high: value, low: value };
    const history = this.store?.history(7) ?? [];
    const visibility = cfg.visibility === 'hidden' ? '完全隐藏（用户只能从表现感知）'
      : cfg.visibility === 'fuzzy' ? '模糊展示（表情 / 颜色暗示）' : '精确展示（面板有数值）';
    const report = cfg.modelReport
      ? '开启。每轮真正回完话后，用 mood_feel 报 user_tone（-5..5）和一句 cause；插件会再折算。'
      : '关闭。对话变化由插件自动估算，不需要你手动上报；不要为了改心情而调用工具。';
    const browse = cfg.autoBrowse
      ? '有「看一眼」事件时，插件会用这一轮回复的语气自动估一个浏览变化；你也可以在看完内容后用 mood_apply(source=browse) 说明更准确的变化。'
      : '自动浏览估算关闭；看完内容后需要你调用 mood_apply(source=browse, delta, reason)。';
    const historyText = history.length
      ? history.slice(-7).map(historyLine).join('\n')
      : '（还没有每日结算）';
    const gal = this.galPrompt();
    return {
      'mood.value': `${value}/100`,
      'mood.band': `${info.label}（${info.min}–${info.max}）`,
      'mood.thinking': info.thinking.join('；'),
      'mood.style': info.dialogue,
      'mood.behavior': info.behavior,
      'mood.features': info.features,
      'mood.persona': `${persona.label}；中性锚点 ${persona.neutralPoint}；正面 ×${persona.positiveCoeff.toFixed(2)}；负面 ×${persona.negativeCoeff.toFixed(2)}；搭理 ×${persona.attentionMultiplier.toFixed(2)}${persona.note ? `；${persona.note}` : ''}`,
      'mood.today': `对话 ${formatSigned(today.dialogue)}；浏览 ${formatSigned(today.browse)}；搭理 ${formatSigned(today.attention)}；今日高 ${today.high} / 低 ${today.low}`,
      'mood.report': report,
      'mood.browse': browse,
      'mood.history': historyText,
      'mood.visibility': `${visibility}。不要在聊天里主动报数字，除非用户明确要求调试。`,
      'mood.expressions': info.expressions.join(' / '),
      'mood.gal': gal,
    };
  }

  /** 小游戏说明；关掉时只留一句，不占太多前缀。 */
  private galPrompt(): string {
    const cfg = this.cfg;
    if (!cfg.galEnabled) return '情境问答小游戏已关闭。';
    return [
      '用户说“来个小故事 / 考考我 / 出个题”时，调用 gal_start 生成一道情境问答。收到 [小游戏] 提示时，如果手边没有正在进行的任务，就主动发起一个；正在处理别的事可以忽略。',
      '生成要求：情境 50–100 字，第一人称，符合你的人设和近期记忆；问题一句；三个选项的 mood_delta 在 -5..+5，一个最好、一个最差、一个中间，不要暗示“正确 / 错误”。',
      'gal_start 之后按回执用 pet_ask 显示（question 里同时放情境和问题，options 按 A/B/C 顺序，allowOwnAnswer: false）；不要把 delta 说给用户。',
      '收到 [answer] 后，用一句 10–20 字反应 + 表情：+4~+5 开心 / 感动，+1~+3 平淡认可，-1~-2 轻微失落，-3~-5 明显不高兴；语气受当前心情和人设影响。',
      `自动提示每天最多 ${cfg.galDailyLimit} 次；用户主动要求不受这个限制。超时或关闭无惩罚。`,
    ].join('\n');
  }

  tools(): ToolDef[] {
    const list: ToolDef[] = [this.statusTool(), this.applyTool(), this.rollTool()];
    // 工具表在装配时读取；切换 modelReport / galEnabled 后需要重启 World 才会增加/移除工具。
    if (this.cfg.modelReport) list.push(this.feelTool());
    if (this.cfg.galEnabled) list.push(this.galTool());
    return list;
  }

  webUi(language: Language = 'zh'): WorldWebUiDecl {
    const t = language === 'en' ? UI_TEXT.en : UI_TEXT.zh;
    const persona = resolvedPersona(this.cfg);
    const value = this.currentValue();
    const info = bandInfo(value);
    return {
      label: t.label,
      config: moodConfigGroups(language),
      lamps: [{
        label: t.lamp,
        state: this.store ? 'online' : 'offline',
        hint: this.store ? `${value}/100 · ${info.label}` : t.offline,
      }],
      badges: [{ label: t.label, value: `${value}`, tone: 'plain' }],
      panels: [{
        id: 'overview',
        title: t.panelTitle,
        description: t.panelDescription,
        getMethods: ['state'],
      }],
      invoke: async (panel, method, args) => {
        if (panel !== 'overview') throw new Error(`unknown panel: ${panel}`);
        return this.invoke(panel, method, args);
      },
      promptDocs: [{
        key: 'worlds.mood.envPrompt',
        title: t.promptTitle,
        description: t.promptDescription,
        path: ENV_PROMPT_FILE,
        role: 'envPrompt',
        vars: [
          { name: 'mood.value', description: t.valueVar },
          { name: 'mood.band', description: t.bandVar },
          { name: 'mood.thinking', description: t.thinkingVar, multiline: true },
          { name: 'mood.style', description: t.styleVar },
          { name: 'mood.behavior', description: t.behaviorVar },
          { name: 'mood.features', description: t.featuresVar },
          { name: 'mood.persona', description: t.personaVar },
          { name: 'mood.today', description: t.todayVar },
          { name: 'mood.report', description: t.reportVar },
          { name: 'mood.browse', description: t.browseVar },
          { name: 'mood.history', description: t.historyVar, multiline: true },
          { name: 'mood.visibility', description: t.visibilityVar },
          { name: 'mood.expressions', description: t.expressionVar },
          { name: 'mood.gal', description: t.galVar, multiline: true },
        ],
      }],
      storage: [{
        key: 'state',
        label: '心情状态',
        kind: 'disk',
        location: this.store?.path ?? join(this.options.dataDir, 'mood', 'state.json'),
        note: '把当前心情重置到中性锚点；历史记录保留。',
        stat: () => `${this.currentValue()}/100 · ${this.store?.data.history.length ?? 0} 天历史`,
        clear: () => {
          const p = resolvedPersona(this.cfg);
          this.store?.setValue(p.neutralPoint, '面板清空存储');
          void this.pushSnapshot();
          return `已重置到 ${p.neutralPoint}/100；历史保留。`;
        },
      }],
    };
  }

  async start(host: WorldHost): Promise<void> {
    this.host = host;
    this.selfRescueAnnounced = '';
    this.store = new MoodStore({
      dataDir: this.options.dataDir,
      timezone: this.options.timezone,
      now: this.now,
      random: this.random,
    });
    const persona = resolvedPersona(this.cfg);
    const roll = this.store.load(this.cfg, persona);
    this.selfRescueAnnounced = this.store.data.selfRescueAt ?? '';
    this.attentionSince = Math.max(this.store.data.day.lastUserAt, this.now().getTime());
    this.store.skipIdleUntilNow(idleHours(this.now().getTime(), this.attentionSince), this.cfg);
    this.lastTurnCursor = host.store.latestCursor();
    this.lastMoodEventCursor = this.lastTurnCursor;
    await this.push('mood.started', `心情 World 已挂载；当前 ${this.store.data.value}/100（${bandLabel(this.store.data.value)}）。`, 'piggyback', false);
    await this.handleRollover(roll);
    // A resumed session keeps its old system prefix; this snapshot is what the
    // first turn after a restart sees before the mood can be recomputed.
    void this.pushSnapshot();
    this.ticker = setInterval(() => { void this.tick(); }, TICK_MS);
    this.ticker.unref?.();
    host.log.info(`心情 World 已启动：${this.store.data.value}/100（${bandLabel(this.store.data.value)}）`);
  }

  async stop(): Promise<void> {
    if (this.ticker) clearInterval(this.ticker);
    this.ticker = null;
    this.activeGal = null;
    this.store?.save();
    this.host = null;
  }

  outputTap(): OutputTap | undefined {
    if (!this.store) return undefined;
    return {
      onEvent: (event: StreamEvent) => {
        if (event.type === 'response.output_text.delta' && typeof event.delta === 'string') this.turnText += event.delta;
      },
      onAbort: () => { this.turnText = ''; },
      onRoundEnd: () => {},
    };
  }

  /** assistant 自然结束、LLM 失败或轮数达到硬上限时调用。 */
  onTurnEnded(): void {
    try {
      this.consumeTurn();
    } catch (error) {
      this.host?.log.warn('心情回合结算失败', { err: error });
    } finally {
      this.turnText = '';
      this.explicitDialogue = false;
      this.explicitBrowse = false;
    }
  }

  private consumeTurn(): void {
    const host = this.host;
    const store = this.store;
    if (!host || !store) return;
    this.consumeMoodEvents();
    const latest = host.store.latestCursor();
    let events: EventEnvelope[] = [];
    try {
      events = host.store.range({ fromCursor: this.lastTurnCursor + 1, toCursor: latest });
    } catch (error) {
      host.log.debug('心情读取事件失败', { err: error });
    }
    this.lastTurnCursor = Math.max(this.lastTurnCursor, latest);

    const userTexts: string[] = [];
    const replyTexts: string[] = [];
    const replyMoods: string[] = [];
    let userEventSeen = false;
    let answerSeen = false;
    let screenSeen = false;

    for (const event of events) {
      const meta = (event.meta ?? {}) as Record<string, unknown>;
      let handled = false;

      if (event.type === 'desktop-pet.self' && meta.kind === 'say' && Array.isArray(meta.beats)) {
        for (const beat of meta.beats) {
          if (!beat || typeof beat !== 'object') continue;
          const record = beat as Record<string, unknown>;
          if (typeof record.text === 'string') replyTexts.push(record.text);
          const mood = record.mood;
          if (mood && typeof mood === 'object' && typeof (mood as Record<string, unknown>).id === 'string') {
            replyMoods.push((mood as Record<string, unknown>).id as string);
          }
        }
        handled = true;
      } else if (event.type === 'desktop-pet.self' && meta.kind === 'ask' && typeof meta.question === 'string') {
        replyTexts.push(meta.question);
        const askId = typeof meta.askId === 'string' ? meta.askId : '';
        const options = Array.isArray(meta.options) ? meta.options.filter((item): item is string => typeof item === 'string') : [];
        if (askId) this.handleGalAsk(askId, meta.question, options);
        handled = true;
      } else if (event.type === 'desktop-pet.message' || event.type === 'desktop-pet.speech') {
        const text = typeof meta.text === 'string' ? meta.text : event.text;
        if (text.trim()) userTexts.push(text.trim());
        userEventSeen = true;
        handled = true;
      } else if (event.type === 'desktop-pet.answer') {
        userEventSeen = true;
        answerSeen = true;
        const askId = typeof meta.askId === 'string' ? meta.askId : '';
        const index = typeof meta.index === 'number' ? meta.index : undefined;
        const text = typeof meta.text === 'string' ? meta.text : '';
        const dismissed = meta.dismissed === true;
        if (askId) this.handleGalAnswer(askId, index, text, dismissed);
        handled = true;
      } else if (event.type === 'desktop-pet.touch') {
        userEventSeen = true;
        handled = true;
      } else if (event.type === 'screen.shot') {
        if ((event.blobs?.length ?? 0) > 0 || /截图|screen|shot/i.test(event.text)) screenSeen = true;
        handled = true;
      } else if (event.type.startsWith('mood.')) {
        handled = true;
      } else if (event.type === 'desktop-pet.self') {
        // activity / figure / delivered / withdrawn records are the pet's own
        // bookkeeping, never the person's words.
        handled = true;
      }

      if (!handled && event.origin === 'external'
        && event.source !== 'desktop-pet' && event.source !== 'screen' && event.source !== 'mood') {
        const metaText = typeof meta.text === 'string' ? meta.text.trim() : '';
        const looksLikeMessage = /(?:^|\.)(?:message|speech|chat|msg)$/i.test(event.type);
        if (metaText || looksLikeMessage) {
          const text = metaText || event.text.trim();
          if (text) userTexts.push(text);
          userEventSeen = true;
        }
      }
    }

    const userText = userTexts.join('\n').trim();
    const replyText = (replyTexts.join('\n').trim() || this.turnText.trim());
    const replyValence = moodTagValence(replyMoods);
    host.log.debug('心情回合采样', {
      userText: userText.slice(0, 120),
      replyText: replyText.slice(0, 120),
      replyMoods,
      replyValence,
      screenSeen,
      answerSeen,
    });
    if (!userEventSeen && !replyText) return;

    const nowMs = this.now().getTime();
    const idleBefore = idleHours(nowMs, this.attentionSince);

    if (userEventSeen) {
      store.markInteraction(nowMs);
      this.attentionSince = nowMs;
      const pending = store.proactivePending();
      if (pending !== null) {
        if (nowMs - pending <= this.cfg.proactiveWindowMinutes * 60_000) {
          this.applyMood('attention', Math.max(2, this.cfg.attentionReturnBonus), '主动招呼后得到回应');
          store.clearProactive();
          store.markAttentionBonus(nowMs);
        } else {
          store.clearProactive();
        }
      } else if (idleBefore >= this.cfg.attentionHoursA) {
        const bonus = Math.max(1, this.cfg.attentionReturnBonus) * (idleBefore >= this.cfg.attentionHoursB ? 1.5 : 1);
        this.applyMood('attention', bonus, `离开 ${idleBefore.toFixed(1)} 小时后回来搭理`);
        store.markAttentionBonus(nowMs);
      } else if (userText && !answerSeen
        && nowMs - store.data.day.lastAttentionBonusAt >= this.cfg.attentionCooldownMinutes * 60_000) {
        this.applyMood('attention', 1, '用户主动发起对话');
        store.markAttentionBonus(nowMs);
      }
    } else if (replyText && idleBefore >= this.cfg.proactiveAfterMinutes) {
      store.noteProactive(nowMs);
    }

    if (this.cfg.autoDialogue && !this.explicitDialogue && userText) {
      const estimate = estimateDialogueDelta(userText, replyText, store.data.value, this.cfg, replyValence);
      this.lastTone = estimate.tone.score;
      if (estimate.delta !== 0) this.applyMood('dialogue', estimate.delta, estimate.reason);
    } else if (userText) {
      this.lastTone = analyzeTone(userText).score;
    }

    if (this.cfg.autoBrowse && !this.explicitBrowse && screenSeen) {
      const textTone = analyzeTone(replyText || userText);
      // 有表情标签时以角色的实际反应为主，文字只做小幅修正；避免把
      // 「复述网页里的垃圾话」当成角色自己的负面情绪。
      const browseDelta = replyValence !== null
        ? replyValence * 2 + textTone.score * 0.2
        : textTone.score * (replyText ? 0.6 : 0.3);
      const clamped = clamp(browseDelta, -3, 3);
      if (Math.abs(clamped) >= 0.5) this.applyMood('browse', clamped, '看一眼后的表情与语气');
    }

    if (store.shouldSnapshot(this.cfg, nowMs)) void this.pushSnapshot();
  }

  /**
   * 外部插件注入接口：推一条 `mood.external` 事件，meta.delta 是期望变化量，
   * meta.reason 是一句原因。仍然受单日总波动上限约束。
   */
  private consumeMoodEvents(): void {
    const host = this.host;
    if (!host) return;
    const latest = host.store.latestCursor();
    if (latest <= this.lastMoodEventCursor) return;
    let events: EventEnvelope[] = [];
    try {
      events = host.store.range({ fromCursor: this.lastMoodEventCursor + 1, toCursor: latest });
    } catch (error) {
      host.log.debug('心情读取外部注入事件失败', { err: error });
    }
    this.lastMoodEventCursor = latest;
    for (const event of events) {
      if (event.type !== 'mood.external') continue;
      const meta = (event.meta ?? {}) as Record<string, unknown>;
      const delta = Number(meta.delta);
      if (!Number.isFinite(delta) || delta === 0) continue;
      const reason = typeof meta.reason === 'string' && meta.reason.trim() ? meta.reason.trim() : '外部事件';
      this.applyMood('event', delta, reason);
    }
  }

  /** 把 pet_ask 真实显示的选项绑定到当前题目；选项或问题对得上才认。 */
  private handleGalAsk(askId: string, question: string, options: readonly string[]): void {
    const gal = this.activeGal;
    if (!gal) return;
    if (optionsMatch(gal.choices, options)) {
      gal.askId = askId;
      return;
    }
    const compact = (value: string): string => value.replace(/\s+/g, '');
    const wanted = compact(gal.question);
    if (wanted.length >= 4 && compact(question).includes(wanted)) {
      gal.askId = askId;
      return;
    }
    // 桌宠弹了另一条提问，原来的情境气泡已经被替换；直接丢弃，不扣心情。
    this.activeGal = null;
    this.host?.log.debug('情境问答被另一条提问替换，已丢弃', { askId });
  }

  /** 用户选了 A/B/C；index 是 0 基，text 是为自定义回答兜底。 */
  private handleGalAnswer(askId: string, index: number | undefined, text: string, dismissed: boolean): void {
    const gal = this.activeGal;
    if (!gal || !gal.askId) return;
    if (gal.askId !== askId) return;
    if (dismissed) {
      this.activeGal = null;
      this.store?.noteGalDismissed();
      return;
    }
    const choice = index !== undefined && gal.choices[index]
      ? gal.choices[index]!
      : text
        ? findChoiceByText(gal.choices, text)
        : null;
    if (!choice) return;
    this.activeGal = null;
    this.store?.noteGalAnswered();
    const result = this.applyMood('dialogue', choice.moodDelta, `小游戏选择 ${choice.label}：${choice.text}`);
    if (result) {
      this.host?.log.info(`情境问答选择 ${choice.label}：心情 ${result.before} → ${result.after}`);
    }
  }

  /** 超过 galTimeoutMinutes 没被回答/关闭，场景直接消失，无惩罚。 */
  private expireGal(nowMs: number): void {
    const gal = this.activeGal;
    if (!gal) return;
    if (nowMs - gal.startedAt < Math.max(1, this.cfg.galTimeoutMinutes) * 60_000) return;
    this.activeGal = null;
    this.store?.noteGalDismissed();
    this.host?.log.debug('情境问答超时，无惩罚');
  }

  /** 待机时低概率提示模型主动发起；每日上限只约束 auto。 */
  private maybeHintGal(nowMs: number): void {
    const cfg = this.cfg;
    const store = this.store;
    const host = this.host;
    if (!host || !store || !cfg.galEnabled || this.activeGal) return;
    const day = store.data.day;
    if (day.galStarted >= cfg.galDailyLimit) return;
    if (nowMs - day.galLastHintAt < Math.max(1, cfg.galHintCooldownMinutes) * 60_000) return;
    if (idleHours(nowMs, this.attentionSince) < Math.max(1, cfg.galIdleMinutes)) return;
    let chance = clamp(Number(cfg.galIdleChance), 0, 1);
    if (store.data.value < 30 || store.data.value > 80) chance *= Math.max(1, Number(cfg.galMoodBoost));
    if (chance <= 0 || this.random() >= chance) return;
    store.noteGalHint(nowMs);
    const remaining = Math.max(0, cfg.galDailyLimit - store.data.day.galStarted);
    const text = `[小游戏] 现在适合主动来一个短小的情境问答。请调用 gal_start(source="auto") 生成题目，再按回执用 pet_ask 显示；今天自动小游戏还可以 ${remaining} 次。正在处理别的事就忽略这条。`;
    void this.push('mood.gal_hint', text, cfg.galWake ? 'flush' : 'piggyback');
  }

  private async tick(): Promise<void> {
    const host = this.host;
    const store = this.store;
    if (!host || !store) return;
    try {
      this.consumeMoodEvents();
      const now = this.now();
      const today = dateIn(this.options.timezone, now);
      if (store.data.day.date !== today) {
        const persona = resolvedPersona(this.cfg);
        const roll = store.rollover(today, this.cfg, persona);
        await this.handleRollover(roll);
      }

      const nowMs = now.getTime();
      const idle = idleHours(nowMs, this.attentionSince);
      const penalty = attentionPenalty(idle, store.data.day.idleSteps, store.data.day.extraCharged, this.cfg);
      if (penalty.delta !== 0) {
        this.applyMood('attention', penalty.delta, `已经 ${idle.toFixed(1)} 小时没有互动`);
        store.noteAttentionCharge(penalty.steps, penalty.extra);
      }

      const pending = store.proactivePending();
      if (pending !== null && nowMs - pending > this.cfg.proactiveWindowMinutes * 60_000) {
        store.clearProactive();
        this.applyMood('attention', -Math.max(2, this.cfg.attentionExtraPenalty), '主动招呼后没有得到回应');
      }

      this.expireGal(nowMs);
      this.maybeHintGal(nowMs);
      if (store.shouldSnapshot(this.cfg, nowMs)) void this.pushSnapshot();
    } catch (error) {
      host.log.warn('心情定时检查失败', { err: error });
    }
  }

  private applyMood(source: DeltaSource, delta: number, reason: string): ApplyResult | null {
    const store = this.store;
    if (!store) return null;
    const persona = resolvedPersona(this.cfg);
    const result = store.apply(source, delta, reason, this.cfg, persona);
    if (result.bandChanged) void this.notifyThreshold(result, persona);
    return result;
  }

  private async notifyThreshold(result: ApplyResult, persona = resolvedPersona(this.cfg)): Promise<void> {
    if (!this.cfg.thresholdNotify) return;
    const text = `[心情] 区间变化：${result.before}（${bandLabel(result.bandBefore)}）→ ${result.after}（${bandLabel(result.bandAfter)}）\n${snapshotText(result.after, persona, this.cfg)}`;
    this.store?.noteSnapshot();
    await this.push('mood.threshold', text, this.cfg.thresholdWake ? 'flush' : 'piggyback', true, ['snapshot']);
  }

  private async pushSnapshot(): Promise<void> {
    const store = this.store;
    const host = this.host;
    if (!store || !host) return;
    const persona = resolvedPersona(this.cfg);
    // 底色决定概率，快照替下一轮抽一个具体标签；模型也可以按句再调 mood_roll。
    const { emotion } = rollEmotion(store.data.value, persona, this.lastTone, this.random);
    const acting = emotionActing(emotion);
    const text = `${snapshotText(store.data.value, persona, this.cfg)}\n本轮情绪标签倾向：${emotion}（${acting.hint}）。`;
    store.setEmotion(emotion);
    store.noteSnapshot();
    if (this.lastSnapshotCursor) {
      try {
        await host.withdrawPending?.(this.lastSnapshotCursor);
      } catch {
        // already delivered or withdrawn; the new one still goes out
      }
      this.lastSnapshotCursor = 0;
    }
    const event = await this.push('mood.snapshot', text, 'piggyback', true, ['snapshot']);
    if (event) this.lastSnapshotCursor = event.cursor;
  }

  private async handleRollover(roll: RolloverResult): Promise<void> {
    const reset = roll.reset;
    if (reset && this.cfg.dailyResetNotify) {
      const noise = reset.noise >= 0 ? `+${reset.noise}` : `${reset.noise}`;
      await this.push(
        'mood.daily_reset',
        `[心情] 新的一天：昨日 ${reset.from} → 今日基线 ${reset.baseline}（随机扰动 ${noise}），现在是 ${reset.value}/100（${bandLabel(reset.value)}）。按今天的底色继续，不要主动提“心情值”这个词。`,
        'piggyback',
      );
    }
    if (roll.selfRescue) await this.runSelfRescue();
  }

  private async runSelfRescue(): Promise<void> {
    const store = this.store;
    if (!store || !this.cfg.selfRescue) return;
    const stamp = store.data.selfRescueAt ?? '';
    if (!stamp || this.selfRescueAnnounced === stamp) return;
    this.selfRescueAnnounced = stamp;
    this.applyMood('event', 2, '连续低落自救：给自己一点力气');
    const text = `[心情] 连续低落自救：已经连续 ${store.data.lowDays} 天最终值 ≤10。这不是系统故障，是角色自己想改变。今天可以主动说一句“我想试着好起来”，或者接受用户的关心；不要提“心情值”这个词。`;
    await this.push('mood.self_rescue', text, this.cfg.selfRescueWake ? 'flush' : 'piggyback');
  }

  private async push(
    type: string,
    text: string,
    trigger: TriggerMode = 'piggyback',
    deliver = true,
    tags?: readonly EventTag[],
  ): Promise<EventEnvelope | null> {
    const host = this.host;
    if (!host) return null;
    try {
      return await host.pushEvent({
        type,
        ts: nowIso(this.options.timezone, this.now()),
        source: this.id,
        origin: 'internal',
        senderKey: this.id,
        text,
        ...(tags ? { tags } : {}),
      }, deliver ? { trigger } : { deliver: false });
    } catch (error) {
      host.log.warn(`心情事件 ${type} 投递失败`, { err: error });
      return null;
    }
  }

  private overview(): MoodOverview {
    const store = this.store;
    const persona = resolvedPersona(this.cfg);
    const value = this.currentValue();
    const info = bandInfo(value);
    const today = store?.today() ?? {
      dialogue: 0, browse: 0, attention: 0, event: 0, high: value, low: value,
      galStarted: 0, galAnswered: 0, galDismissed: 0,
    };
    return {
      value,
      band: info.id,
      bandLabel: info.label,
      range: `${info.min}–${info.max}`,
      thinking: info.thinking,
      dialogue: info.dialogue,
      topics: info.topics,
      behavior: info.behavior,
      features: info.features,
      persona: {
        preset: persona.preset,
        label: persona.label,
        neutralPoint: persona.neutralPoint,
        positiveCoeff: persona.positiveCoeff,
        negativeCoeff: persona.negativeCoeff,
        attentionMultiplier: persona.attentionMultiplier,
        note: persona.note,
      },
      today,
      gal: {
        enabled: this.cfg.galEnabled,
        active: this.activeGal !== null,
        startedToday: today.galStarted,
        answeredToday: today.galAnswered,
        dismissedToday: today.galDismissed,
        dailyLimit: this.cfg.galDailyLimit,
        remainingAuto: Math.max(0, this.cfg.galDailyLimit - today.galStarted),
      },
      history: store?.history(14).slice().reverse().map((entry) => ({
        date: entry.date,
        final_value: entry.final_value,
        high: entry.high,
        low: entry.low,
      })) ?? [],
      recent: (store?.recentChanges(12) ?? []).map((change) => ({
        at: change.at,
        source: change.source,
        delta: change.delta,
        before: change.before,
        after: change.after,
        reason: change.reason,
        ...(change.capped ? { capped: true } : {}),
      })),
      visibility: this.cfg.visibility,
      modelReport: this.cfg.modelReport,
      autoDialogue: this.cfg.autoDialogue,
      autoBrowse: this.cfg.autoBrowse,
      lowDays: store?.data.lowDays ?? 0,
      selfRescueAt: store?.data.selfRescueAt ?? null,
      lastEmotion: store?.data.lastEmotion ?? null,
      updatedAt: store?.data.lastUpdated ?? '',
    };
  }

  private async invoke(panel: string, method: string, args: unknown[]): Promise<unknown> {
    const store = this.store;
    switch (method) {
      case 'state':
      case 'refresh':
        return this.overview();
      case 'history': {
        const days = clampInt(args[0], 1, 90, 30);
        return store?.history(days) ?? [];
      }
      case 'recent':
        return store?.recentChanges(clampInt(args[0], 1, 40, 20)) ?? [];
      case 'analyzePersona':
        return this.readConstitution();
      case 'applyPersona': {
        const detected = this.readConstitution();
        if (!detected.ok) return detected;
        const d = detected.detection;
        const note = `识别自 CONSTITUTION.md：${d.label}${d.evidence.length ? `（${d.evidence.join('、')}）` : ''}`;
        this.options.persist({
          personaPreset: 'custom',
          attachment: d.attachment,
          neutralPoint: d.neutralPoint,
          positiveCoeff: d.positiveCoeff,
          negativeCoeff: d.negativeCoeff,
          personaNote: note.slice(0, 300),
        });
        return { ok: true, detection: d, state: this.overview() };
      }
      case 'setValue': {
        if (!store) return { ok: false, error: '心情尚未加载' };
        const value = Number(args[0]);
        if (!Number.isFinite(value)) return { ok: false, error: '需要 0–100 的数值' };
        const result = store.setValue(value, '面板手动调整');
        if (result.bandChanged) await this.notifyThreshold(result);
        else await this.pushSnapshot();
        return { ok: true, state: this.overview() };
      }
      case 'reset': {
        if (!store) return { ok: false, error: '心情尚未加载' };
        const persona = resolvedPersona(this.cfg);
        const result = store.setValue(persona.neutralPoint, '面板重置到中性锚点');
        if (result.bandChanged) await this.notifyThreshold(result);
        else await this.pushSnapshot();
        return { ok: true, state: this.overview() };
      }
      default:
        throw new Error(`unknown method: ${method}`);
    }
  }

  private readConstitution(): PersonaDetectionResult | { ok: false; error: string } {
    const candidates = [
      join(this.options.botDir, 'workspace', 'CONSTITUTION.md'),
      join(this.options.botDir, 'CONSTITUTION.md'),
    ];
    const path = candidates.find((file) => existsSync(file));
    if (!path) {
      return { ok: false, error: `没有找到 CONSTITUTION.md（找过 ${candidates.join('、')}）。` };
    }
    try {
      const text = readFileSync(path, 'utf8').slice(0, MAX_CONSTITUTION_BYTES);
      return { ok: true, path, textLength: text.length, detection: analyzePersonaText(text) };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  // -------------------------------------------------------------------------
  // Tools
  // -------------------------------------------------------------------------

  private statusTool(): ToolDef {
    return {
      ...MOOD_TOOL_DECLS[0]!,
      handler: async (args) => {
        const store = this.store;
        if (!store) return fail('心情 World 还没加载。');
        const days = clampInt(args.days, 0, 30, 7);
        const persona = resolvedPersona(this.cfg);
        const today = store.today();
        const text = statusText(store.data.value, persona, this.cfg, today, this.lastTone);
        const parts = [text];
        if (today.event !== 0) parts.push(`外部事件：${formatSigned(today.event)}`);
        if (days > 0) {
          const history = store.history(days);
          if (history.length) {
            parts.push('', `最近 ${history.length} 天（新→旧）：`, ...history.slice().reverse().map(historyLine));
          }
        }
        const recent = store.recentChanges(6);
        if (recent.length) {
          parts.push('', '最近变化：', ...recent.map((change) =>
            `${change.at.slice(11, 16)} ${change.source} ${formatSigned(change.delta)} → ${change.after}（${change.reason}）${change.capped ? ' [达到上限]' : ''}`));
        }
        if (store.data.selfRescueAt) parts.push('', `连续低落自救已触发：${store.data.selfRescueAt}（连续 ${store.data.lowDays} 天 ≤10）。`);
        if (this.cfg.galEnabled) {
          parts.push('', `小游戏：今天 ${store.data.day.galStarted}/${this.cfg.galDailyLimit} 次（已回答 ${store.data.day.galAnswered}，已关闭 ${store.data.day.galDismissed}）；${this.activeGal ? '有一题进行中' : '当前没有进行中'}。`);
        }
        return parts.join('\n');
      },
    };
  }

  private applyTool(): ToolDef {
    return {
      ...MOOD_TOOL_DECLS[1]!,
      handler: async (args) => {
        if (!this.store) return fail('心情 World 还没加载。');
        const sourceRaw = textOr(args.source, 'event');
        if (sourceRaw !== 'browse' && sourceRaw !== 'event' && sourceRaw !== 'dialogue') {
          return fail(`source 只能是 browse / event / dialogue，收到「${sourceRaw}」。`);
        }
        const delta = Number(args.delta);
        if (!Number.isFinite(delta)) return fail('delta 需要是数字。');
        const reason = textOr(args.reason, '模型记录').slice(0, 200) || '模型记录';
        if (sourceRaw === 'dialogue') this.explicitDialogue = true;
        if (sourceRaw === 'browse') this.explicitBrowse = true;
        const result = this.applyMood(sourceRaw as DeltaSource, delta, reason);
        if (!result) return fail('心情 World 还没加载。');
        const sign = result.applied >= 0 ? '+' : '';
        if (result.applied === 0) {
          return `这次没有生效：${result.capped ? '已达到单日上限或边际递减' : '变化量太小'}。当前 ${result.after}/100（${bandLabel(result.bandAfter)}）。`;
        }
        return `已记录 ${sourceRaw} ${sign}${result.applied}：${result.before} → ${result.after}/100（${bandLabel(result.bandAfter)}）${result.capped ? '，已受单日上限限制' : ''}。`;
      },
    };
  }

  private feelTool(): ToolDef {
    return {
      ...MOOD_TOOL_DECLS[3]!,
      handler: async (args) => {
        if (!this.store) return fail('心情 World 还没加载。');
        if (!this.cfg.modelReport) return fail('模型自报已关闭；这次没有记录。');
        const tone = clampInt(args.user_tone, -5, 5, 0);
        const cause = textOr(args.cause, '模型自报').slice(0, 200) || '模型自报';
        this.explicitDialogue = true;
        this.lastTone = tone;
        const result = this.applyMood('dialogue', tone, cause);
        if (!result) return fail('心情 World 还没加载。');
        return `已记录对话 ${tone >= 0 ? '+' : ''}${tone}（人设折算 ${result.applied >= 0 ? '+' : ''}${result.applied}）：${result.before} → ${result.after}/100（${bandLabel(result.bandAfter)}）。`;
      },
    };
  }

  private rollTool(): ToolDef {
    return {
      ...MOOD_TOOL_DECLS[2]!,
      handler: async (args) => {
        if (!this.store) return fail('心情 World 还没加载。');
        const tone = clampInt(args.user_tone, -5, 5, 0);
        const useTone = args.user_tone === undefined ? this.lastTone : tone;
        const persona = resolvedPersona(this.cfg);
        const { emotion, probabilities } = rollEmotion(this.store.data.value, persona, useTone, this.random);
        const acting = emotionActing(emotion);
        const picture = emotion === 'tender' ? 'love' : emotion;
        this.store.setEmotion(emotion);
        const reason = textOr(args.reason, '');
        return [
          `rolled: ${emotion}${reason ? `（${reason}）` : ''}`,
          acting.hint,
          `图片标签：${picture}（给 emote_pic 的 emotion 用；tender 对应 love）`,
          `概率：${formatProbabilities(probabilities)}`,
          `用法：在 pet_say / pet_act 里用 <${acting.expression}> 或中文名；生气时也可以用 <${acting.motion}>。只在这句确实有情绪时用，不要每句都抽。`,
        ].join('\n');
      },
    };
  }

  private galTool(): ToolDef {
    return {
      ...MOOD_TOOL_DECLS[4]!,
      handler: async (args) => {
        const store = this.store;
        if (!store) return fail('心情 World 还没加载。');
        if (!this.cfg.galEnabled) return fail('情境问答已关闭。');
        const source: GalSource = args.source === 'auto' ? 'auto' : 'user';
        const validation = validateGalDraft(args);
        if (!validation.ok) return fail(validation.error);
        const draft = validation.value;
        const day = store.data.day;
        if (source === 'auto' && day.galStarted >= this.cfg.galDailyLimit) {
          return fail(`今天自动小游戏已经到上限（${this.cfg.galDailyLimit} 次）。这次不要开始，也不要改成 user 绕过；只有用户明确要求时才用 user。`);
        }
        if (this.activeGal && source === 'auto') {
          return fail('已经有一个情境问答在进行中；等它结束或超时，不要连续弹两个。');
        }
        // A user-requested quiz replaces a pending one; the old scene just disappears.
        this.activeGal = null;
        const nowMs = this.now().getTime();
        const active: GalActive = {
          ...draft,
          id: `g-${nowMs.toString(36)}`,
          source,
          startedAt: nowMs,
          askId: null,
        };
        this.activeGal = active;
        store.noteGalStarted(nowMs);
        const remaining = Math.max(0, this.cfg.galDailyLimit - store.data.day.galStarted);
        const payload = JSON.stringify({
          question: galAskQuestion(active),
          options: galAskOptions(active.choices),
          allowOwnAnswer: false,
        }, null, 2);
        const choiceLine = active.choices
          .map((choice) => `${choice.label}. ${choice.text} → ${formatSigned(choice.moodDelta)}`)
          .join('\n');
        return [
          `情境问答已准备好（今天第 ${store.data.day.galStarted} 次；自动还可以 ${remaining} 次）。`,
          '下一步：调用 pet_ask，参数如下（question 已包含情境和问题；options 按 A/B/C 顺序；不要改选项文字）：',
          payload,
          '',
          '选项与 delta（只给你自己参考，不要把 delta 说给用户）：',
          choiceLine,
          '',
          '收到 [answer] 后：用 pet_say 说一句 10–20 字反应，并带表情。+4~+5 用 <happy>/<love>；+1~+3 用 <neutral>；-1~-2 用 <sad>；-3~-5 用 <sad> 或 <shake>。',
          moodReactionNote(store.data.value),
        ].join('\n');
      },
    };
  }
}
