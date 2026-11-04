/**
 * `worlds.mood` 段的形状、默认值与 WebUI 配置声明。
 * 所有项都标 x-hot: true —— World 在每次读取时现取 cfg，改完下一拍生效。
 */
import type { ConfigGroup } from 'cortico/core/types.ts';
import type { Language } from 'cortico/core/language.ts';
import { pick } from 'cortico/core/language.ts';

export type PersonaPreset = 'gentle' | 'neutral' | 'optimistic' | 'pessimistic' | 'tsundere' | 'irritable' | 'custom';
export type AttachmentStyle = 'normal' | 'clingy' | 'independent';
export type MoodVisibility = 'hidden' | 'fuzzy' | 'exact';

/** config.json 的 worlds.mood 段。 */
export interface MoodConfigSection {
  enabled: boolean;

  /** 人设模板；custom 时用下面三项自定义值。 */
  personaPreset: PersonaPreset;
  /** 黏人 / 独立影响「搭理」通道；不影响对话与浏览。 */
  attachment: AttachmentStyle;
  /** 人设中性锚点，0–100；personaPreset=custom 时使用。 */
  neutralPoint: number;
  /** 正面 delta 系数，0.1–3；personaPreset=custom 时使用。 */
  positiveCoeff: number;
  /** 负面 delta 系数，0.1–3；personaPreset=custom 时使用。 */
  negativeCoeff: number;
  /** 人设补充说明，会进提示词；可写「容易担心、被夸会害羞」这类具体倾向。 */
  personaNote: string;
  /** 全新角色第一次启用的心情值；0 = 使用中性锚点。 */
  initialValue: number;

  /** 每日向中性锚点回归的比例，0–0.5。 */
  decayRate: number;
  /** 每日一次的高斯扰动标准差，0–10。 */
  noiseStd: number;

  /** 每轮对话结束后，用规则从用户原话与回复里估算 Δ_对话。 */
  autoDialogue: boolean;
  /** 有「看一眼」事件时，用回复语气估算 Δ_浏览。 */
  autoBrowse: boolean;
  /** 注册 mood_feel 工具，让模型自己报用户语气；默认关闭以省 token。 */
  modelReport: boolean;

  /** 单日对话正向/负向各自的上限。 */
  dialogueDailyCap: number;
  /** 单日浏览正向/负向各自的上限。 */
  browseDailyCap: number;
  /** 单日搭理正向/负向各自的上限。 */
  attentionDailyCap: number;
  /** 单日所有通道合计的正向/负向上限，防止极端叠加。 */
  dailySwingCap: number;
  /** 同通道同方向短时间重复时的边际递减窗口（分钟）。 */
  diminishWindowMinutes: number;

  /** 超过这么多小时没互动，开始扣「搭理」。 */
  attentionHoursA: number;
  /** 超过这么多小时没互动，额外扣一次。 */
  attentionHoursB: number;
  /** 每超出多少小时扣一次。 */
  attentionUnitHours: number;
  /** 每次扣多少。 */
  attentionPenalty: number;
  /** 超过阈值 B 的额外扣分。 */
  attentionExtraPenalty: number;
  /** 用户离开一段时间后回来搭理，加多少。 */
  attentionReturnBonus: number;
  /** 两次「主动发起对话」加分之间的最短间隔（分钟）。 */
  attentionCooldownMinutes: number;
  /** 桌宠自己开口时，距上次用户互动超过多少分钟算「主动」。 */
  proactiveAfterMinutes: number;
  /** 主动开口后等多久；这段时间内用户回应加回，超时则扣分。 */
  proactiveWindowMinutes: number;

  /** 启用情境问答（Galgame）小游戏。 */
  galEnabled: boolean;
  /** 自动发起每日上限；用户主动要求不受此限。 */
  galDailyLimit: number;
  /** 待机多少分钟后才可能自动提示。 */
  galIdleMinutes: number;
  /** 满足条件时每分钟的自动提示概率（0–1）。 */
  galIdleChance: number;
  /** 心情 <30 或 >80 时，自动提示概率的倍数。 */
  galMoodBoost: number;
  /** 两次自动提示之间的最短间隔（分钟）。 */
  galHintCooldownMinutes: number;
  /** 自动提示是否立刻唤醒模型。 */
  galWake: boolean;
  /** 进行中的情境问答多久无操作算超时（分钟）；超时无惩罚。 */
  galTimeoutMinutes: number;

  /** 用户看到心情的方式；不影响模型自己知道的精确值。 */
  visibility: MoodVisibility;
  /** 心情变化达到多少点才推一次快照；跨区间不受这个限制。 */
  snapshotMinDelta: number;
  /** 心情没变时，最多多少分钟刷新一次给模型的快照。 */
  snapshotRefreshMinutes: number;
  /** 历史保留天数，1–90。 */
  historyDays: number;

  /** 跨区间时推一条提示给模型。 */
  thresholdNotify: boolean;
  /** 跨区间时是否立刻唤醒模型（默认只在下一次对话时带上）。 */
  thresholdWake: boolean;
  /** 连续 3 天心情 ≤10 时触发自救事件。 */
  selfRescue: boolean;
  /** 自救事件是否立刻唤醒模型。 */
  selfRescueWake: boolean;
  /** 每日结算时推一条「新的一天」提示。 */
  dailyResetNotify: boolean;
  /** 心情 ≤5 时自然回复速率加倍；≥95 时衰减略增。 */
  lowGuard: boolean;
}

export const MOOD_DEFAULTS: MoodConfigSection = {
  enabled: false,
  personaPreset: 'gentle',
  attachment: 'normal',
  neutralPoint: 62,
  positiveCoeff: 1,
  negativeCoeff: 1.15,
  personaNote: '',
  initialValue: 0,
  decayRate: 0.1,
  noiseStd: 2,
  autoDialogue: true,
  autoBrowse: true,
  modelReport: false,
  dialogueDailyCap: 20,
  browseDailyCap: 10,
  attentionDailyCap: 15,
  dailySwingCap: 35,
  diminishWindowMinutes: 30,
  attentionHoursA: 2,
  attentionHoursB: 8,
  attentionUnitHours: 2,
  attentionPenalty: 1,
  attentionExtraPenalty: 2,
  attentionReturnBonus: 2,
  attentionCooldownMinutes: 30,
  proactiveAfterMinutes: 30,
  proactiveWindowMinutes: 20,
  galEnabled: true,
  galDailyLimit: 2,
  galIdleMinutes: 30,
  galIdleChance: 0.005,
  galMoodBoost: 3,
  galHintCooldownMinutes: 30,
  galWake: true,
  galTimeoutMinutes: 10,
  visibility: 'fuzzy',
  snapshotMinDelta: 2,
  snapshotRefreshMinutes: 30,
  historyDays: 30,
  thresholdNotify: true,
  thresholdWake: false,
  selfRescue: true,
  selfRescueWake: false,
  dailyResetNotify: true,
  lowGuard: true,
};

/** 一套人设模板的默认参数。 */
export interface PersonaPresetDef {
  id: Exclude<PersonaPreset, 'custom'>;
  neutralPoint: number;
  positiveCoeff: number;
  negativeCoeff: number;
}

export const PERSONA_PRESETS: Readonly<Record<Exclude<PersonaPreset, 'custom'>, PersonaPresetDef>> = {
  gentle: { id: 'gentle', neutralPoint: 62, positiveCoeff: 1, negativeCoeff: 1.15 },
  neutral: { id: 'neutral', neutralPoint: 60, positiveCoeff: 1, negativeCoeff: 1 },
  optimistic: { id: 'optimistic', neutralPoint: 70, positiveCoeff: 1.2, negativeCoeff: 0.7 },
  pessimistic: { id: 'pessimistic', neutralPoint: 45, positiveCoeff: 0.7, negativeCoeff: 1.3 },
  tsundere: { id: 'tsundere', neutralPoint: 55, positiveCoeff: 0.8, negativeCoeff: 0.9 },
  irritable: { id: 'irritable', neutralPoint: 50, positiveCoeff: 0.9, negativeCoeff: 1.4 },
};

export const ATTACHMENT_MULTIPLIERS: Readonly<Record<AttachmentStyle, number>> = {
  normal: 1,
  clingy: 1.5,
  independent: 0.5,
};

const TEXT = {
  zh: {
    persona: '心情 · 人设',
    personaDescription: '同一件事，不同人设的角色感受不同。这里决定心情向哪里回归、正负面事件影响多大。',
    presetTitle: '人设模板',
    presetDescription: '温柔/敏感、乐观、悲观、傲娇、易怒；选「自定义」时用下面的三个数值。可以在下方面板点「从人设识别」自动填。',
    attachmentTitle: '黏人程度',
    attachmentDescription: '只影响「是否被搭理」这一通道：黏人型 ×1.5，独立型 ×0.5，普通 ×1。',
    neutralTitle: '中性锚点',
    neutralDescription: '心情自然回归的目标值，0–100。温柔敏感 62、乐观 70、悲观 45。仅自定义时使用。',
    positiveTitle: '正面 delta 系数',
    positiveDescription: '开心事件被放大或缩小的倍数，0.1–3。仅自定义时使用。',
    negativeTitle: '负面 delta 系数',
    negativeDescription: '难过事件被放大或缩小的倍数，0.1–3。仅自定义时使用。',
    noteTitle: '人设补充',
    noteDescription: '会进提示词的一句话，写具体的性子，例如「容易担心、被夸会害羞、难过时安静」。',
    initialTitle: '首次心情值',
    initialDescription: '全新角色第一次启用时的值；0 = 使用中性锚点。',

    dynamics: '心情 · 变化',
    dynamicsDescription: '对话、浏览、搭理三个通道的上限与节奏；默认值已经做过平衡，先不用改。',
    decayTitle: '每日回归比例',
    decayDescription: '每天向中性锚点靠近多少，0–0.5。0.1 表示一天走完差距的 10%。',
    noiseTitle: '每日随机扰动',
    noiseDescription: '每天一次高斯扰动的标准差，0–10。0 = 不扰动。',
    autoDialogueTitle: '自动估算对话',
    autoDialogueDescription: '每轮结束后用规则从用户原话和回复里估算变化。关掉后只有模型调 mood_feel 才记录对话。',
    autoBrowseTitle: '自动估算浏览',
    autoBrowseDescription: '检测到「看一眼」事件时，用这一轮回复的语气估算变化。关掉后只能由模型调 mood_apply(source=browse)。',
    modelReportTitle: '允许模型自报',
    modelReportDescription: '开启后注册 mood_feel 工具，让模型更准确地报用户语气；会多一个工具描述和每轮一次调用，默认关闭。改完需要重启 World 才改变工具表。',
    dialogueCapTitle: '对话单日上限',
    dialogueCapDescription: '单日对话正向/负向各自最多累计多少。',
    browseCapTitle: '浏览单日上限',
    browseCapDescription: '单日浏览正向/负向各自最多累计多少。',
    attentionCapTitle: '搭理单日上限',
    attentionCapDescription: '单日搭理正向/负向各自最多累计多少。',
    swingCapTitle: '单日总波动上限',
    swingCapDescription: '所有通道合计的正向/负向各自上限，默认 35。',
    diminishTitle: '边际递减窗口',
    diminishDescription: '同一通道、同一方向在这么多分钟内重复时，效果逐次衰减；0 = 不递减。',
    hoursATitle: '开始扣分的时长',
    hoursADescription: '用户超过这么多小时没互动，开始扣「搭理」。',
    hoursBTitle: '额外扣分的时长',
    hoursBDescription: '超过这么多小时，再额外扣一次。',
    unitTitle: '每单位小时',
    unitDescription: '超过阈值 A 后，每再超出这么多小时扣一次。',
    penaltyTitle: '每次扣分',
    penaltyDescription: '每单位时间扣多少（黏人/独立系数会再乘上去）。',
    extraTitle: '超长未互动额外扣分',
    extraDescription: '超过阈值 B 时一次性额外扣多少。',
    returnTitle: '回来搭理加分',
    returnDescription: '用户离开超过阈值 A 后回来说话，加多少。',
    cooldownTitle: '主动发起冷却',
    cooldownDescription: '两次「用户主动发起对话」加分之间至少隔多少分钟，防止连续刷。',
    proactiveAfterTitle: '多久算主动开口',
    proactiveAfterDescription: '桌宠自己说话时，距上次用户互动超过这么多分钟，就算一次主动招呼。',
    proactiveWindowTitle: '主动招呼等待窗',
    proactiveWindowDescription: '主动招呼后等这么久；窗内用户回应加分，超时没回应扣分。',

    presentation: '心情 · 表现与保护',
    presentationDescription: '用户看到多少、模型多久收到一次快照、跨区间与连续低落的处理。',
    visibilityTitle: '用户可见性',
    visibilityDescription: '完全隐藏：只靠表现感知；模糊展示：表情/颜色暗示；精确展示：面板显示数值。默认模糊。',
    snapshotTitle: '快照刷新间隔',
    snapshotDescription: '心情没变时，最多多少分钟给模型带一次当前心情快照；0 = 只在变化时带。',
    snapshotDeltaTitle: '快照最小变化',
    snapshotDeltaDescription: '心情变化达到多少点才推一次快照，减少每轮的小幅波动占用的 token；跨区间仍会立刻推。0 按 1 计。',
    historyTitle: '历史保留天数',
    historyDescription: '保留最近多少天的每日结算，1–90。',
    thresholdNotifyTitle: '跨区间提示',
    thresholdNotifyDescription: '心情跨过 20/40/60/80 时，给模型一条时区提示。',
    thresholdWakeTitle: '跨区间立刻唤醒',
    thresholdWakeDescription: '开着时跨区间会直接叫醒模型（可能主动说话）；默认只等下一次对话。',
    selfRescueTitle: '连续低落自救',
    selfRescueDescription: '连续 3 天最终心情 ≤10 时触发一次自救事件，避免永久困在低谷。',
    selfRescueWakeTitle: '自救立刻唤醒',
    selfRescueWakeDescription: '自救事件是否立刻叫醒模型，让它主动表达想改变。默认只等下一次对话。',
    dailyResetTitle: '每日结算提示',
    dailyResetDescription: '新的一天算出衰减基线后，给模型一条「新的一天」提示。',
    lowGuardTitle: '极端值保护',
    lowGuardDescription: '心情 ≤5 时自然回复加倍；≥95 时衰减略增，避免永久满值。',

    gal: '心情 · 小游戏',
    galDescription: '情境问答（Galgame）：桌宠用自身人设和记忆生成一个情境 + 问题 + A/B/C 三个选项，选择后按选项的 delta 改变心情。显示复用桌宠的 pet_ask，不另建 UI。',
    galEnabledTitle: '启用情境问答',
    galEnabledDescription: '开启后注册 gal_start 工具，并在待机时低概率提示桌宠发起。关闭后不改工具表，需要重启 World。',
    galDailyLimitTitle: '自动发起每日上限',
    galDailyLimitDescription: '随机/心情触发的每日最多几次；用户主动说“来个小故事”不受这个限制。0 = 不自动发起。',
    galIdleTitle: '待机多久才提示',
    galIdleDescription: '用户超过这么多分钟没互动，才可能收到自动提示。',
    galChanceTitle: '每分钟自动概率',
    galChanceDescription: '0–1；满足待机条件时每分钟掷一次。0.005 约等于待机半小时后有百分之十几的概率提示。',
    galBoostTitle: '极端心情加成',
    galBoostDescription: '心情 <30 或 >80 时，自动概率乘以这个倍数；默认 3。',
    galHintCooldownTitle: '自动提示冷却',
    galHintCooldownDescription: '两次自动提示之间至少隔多少分钟，避免连续冒泡。',
    galWakeTitle: '自动提示时唤醒',
    galWakeDescription: '开着时自动提示会直接叫醒模型，让它有机会主动发起；关闭时只在下一次对话时带上。',
    galTimeoutTitle: '进行中超时',
    galTimeoutDescription: '情境问答弹出后多少分钟没有选择算超时；超时或关闭都不扣心情。',

    optGentle: '温柔 / 敏感',
    optNeutral: '中性 / 平和',
    optOptimistic: '乐观 / 开朗',
    optPessimistic: '悲观 / 忧郁',
    optTsundere: '傲娇',
    optIrritable: '易怒 / 暴躁',
    optCustom: '自定义',
    optNormal: '普通',
    optClingy: '黏人（×1.5）',
    optIndependent: '独立（×0.5）',
    optHidden: '完全隐藏',
    optFuzzy: '模糊展示（推荐）',
    optExact: '精确展示',
  },
  en: {
    persona: 'Mood · persona',
    personaDescription: 'The same event lands differently on different personas. This decides where mood drifts back to and how strongly it reacts.',
    presetTitle: 'Persona preset',
    presetDescription: 'Gentle, optimistic, pessimistic, tsundere or irritable; choose Custom to use the three values below. The panel can detect one from CONSTITUTION.md.',
    attachmentTitle: 'Attachment',
    attachmentDescription: 'Affects only the attention channel: clingy ×1.5, independent ×0.5, normal ×1.',
    neutralTitle: 'Neutral anchor',
    neutralDescription: 'The value mood drifts back to, 0–100. Used when the preset is Custom.',
    positiveTitle: 'Positive coefficient',
    positiveDescription: 'How much good events count, 0.1–3. Used when the preset is Custom.',
    negativeTitle: 'Negative coefficient',
    negativeDescription: 'How much bad events count, 0.1–3. Used when the preset is Custom.',
    noteTitle: 'Persona note',
    noteDescription: 'One line that goes into the prompt, such as "easily worried, shy when praised, quiet when sad".',
    initialTitle: 'Initial value',
    initialDescription: 'The first value for a brand-new character; 0 = use the neutral anchor.',

    dynamics: 'Mood · dynamics',
    dynamicsDescription: 'Caps and pacing for dialogue, browsing and attention. The defaults are balanced; leave them alone at first.',
    decayTitle: 'Daily drift',
    decayDescription: 'How much of the gap to the anchor closes each day, 0–0.5. 0.1 covers 10% of the gap per day.',
    noiseTitle: 'Daily noise',
    noiseDescription: 'Standard deviation of one Gaussian nudge per day, 0–10. 0 = off.',
    autoDialogueTitle: 'Estimate dialogue automatically',
    autoDialogueDescription: 'Estimate a delta from the person’s words and the reply after each turn. Turning this off leaves dialogue changes to the model’s mood_feel.',
    autoBrowseTitle: 'Estimate browsing automatically',
    autoBrowseDescription: 'After a Glance event, estimate a delta from this turn’s reply tone. Turning this off leaves it to mood_apply(source=browse).',
    modelReportTitle: 'Let the model self-report',
    modelReportDescription: 'Registers mood_feel so the model can report the person’s tone more accurately; costs one tool description and one call per turn. Off by default. Restart the World after changing this to rebuild the tool table.',
    dialogueCapTitle: 'Dialogue daily cap',
    dialogueCapDescription: 'Positive and negative dialogue deltas each stop at this per day.',
    browseCapTitle: 'Browsing daily cap',
    browseCapDescription: 'Positive and negative browsing deltas each stop at this per day.',
    attentionCapTitle: 'Attention daily cap',
    attentionCapDescription: 'Positive and negative attention deltas each stop at this per day.',
    swingCapTitle: 'Total daily swing cap',
    swingCapDescription: 'Positive and negative deltas across all channels each stop at this, 35 by default.',
    diminishTitle: 'Diminishing window',
    diminishDescription: 'Repeats of the same channel and direction within this many minutes decay; 0 = off.',
    hoursATitle: 'Start charging after',
    hoursADescription: 'Hours without interaction before attention starts to drop.',
    hoursBTitle: 'Extra charge after',
    hoursBDescription: 'Hours without interaction before the one-off extra penalty.',
    unitTitle: 'Hours per step',
    unitDescription: 'After threshold A, another step every this many hours.',
    penaltyTitle: 'Penalty per step',
    penaltyDescription: 'How much each step costs, before the clingy/independent multiplier.',
    extraTitle: 'Extra long-absence penalty',
    extraDescription: 'The one-off extra penalty past threshold B.',
    returnTitle: 'Return bonus',
    returnDescription: 'How much the person earns back by speaking after more than threshold A away.',
    cooldownTitle: 'Initiative cooldown',
    cooldownDescription: 'Minimum minutes between two "the person started a conversation" bonuses.',
    proactiveAfterTitle: 'When a line is proactive',
    proactiveAfterDescription: 'The pet speaking after this many minutes without the person counts as reaching out.',
    proactiveWindowTitle: 'Proactive wait window',
    proactiveWindowDescription: 'How long a reach-out waits; a reply inside earns a bonus, silence past it costs.',

    presentation: 'Mood · presence and safety',
    presentationDescription: 'How much the person sees, how often the model gets a snapshot, and how thresholds and long lows are handled.',
    visibilityTitle: 'Person-facing visibility',
    visibilityDescription: 'Hidden: only behaviour; Fuzzy: expression/colour hints; Exact: numbers in the panel. Fuzzy by default.',
    snapshotTitle: 'Snapshot interval',
    snapshotDescription: 'When mood has not changed, how often to show the model a fresh snapshot; 0 = only when it changes.',
    snapshotDeltaTitle: 'Minimum snapshot change',
    snapshotDeltaDescription: 'How many points of change justify a new snapshot, to keep small per-turn movements from costing tokens; band crossings always push. 0 counts as 1.',
    historyTitle: 'History days',
    historyDescription: 'Days of daily settlements to keep, 1–90.',
    thresholdNotifyTitle: 'Threshold notices',
    thresholdNotifyDescription: 'Tell the model when mood crosses 20/40/60/80.',
    thresholdWakeTitle: 'Wake on threshold',
    thresholdWakeDescription: 'Wake the model on a crossing (it may speak first); off by default, so it sees the notice next turn.',
    selfRescueTitle: 'Long-low self-rescue',
    selfRescueDescription: 'After three days ending at or below 10, trigger one self-rescue event so mood cannot stay stuck forever.',
    selfRescueWakeTitle: 'Wake for self-rescue',
    selfRescueWakeDescription: 'Whether the self-rescue event wakes the model immediately; off by default.',
    dailyResetTitle: 'Daily reset notice',
    dailyResetDescription: 'After the new day’s baseline, give the model a short "a new day" notice.',
    lowGuardTitle: 'Extreme-value guard',
    lowGuardDescription: 'At or below 5 the daily recovery doubles; at or above 95 decay rises slightly, so neither extreme becomes permanent.',

    gal: 'Mood · mini-game',
    galDescription: 'A situation quiz (Galgame): the pet writes a small situation, a question and three A/B/C choices from its persona and memory; the chosen option changes mood. The UI reuses the pet\'s pet_ask instead of a new panel.',
    galEnabledTitle: 'Enable the situation quiz',
    galEnabledDescription: 'Registers gal_start and lets the pet offer one while idle. Turning it off changes the tool table only after a World restart.',
    galDailyLimitTitle: 'Daily automatic limit',
    galDailyLimitDescription: 'How many random/mood-triggered quizzes per day; a person explicitly asking for one is not limited. 0 = no automatic offers.',
    galIdleTitle: 'Idle before offering',
    galIdleDescription: 'Minutes without interaction before an automatic offer can happen.',
    galChanceTitle: 'Chance per minute',
    galChanceDescription: '0–1 rolled once a minute while idle. 0.005 gives roughly a one-in-six chance after half an hour of idling.',
    galBoostTitle: 'Extreme-mood boost',
    galBoostDescription: 'Multiplies the chance when mood is below 30 or above 80; default 3.',
    galHintCooldownTitle: 'Offer cooldown',
    galHintCooldownDescription: 'Minutes between two automatic offers, so the pet does not keep popping one up.',
    galWakeTitle: 'Wake for an offer',
    galWakeDescription: 'Whether an automatic offer wakes the model immediately; off means it arrives with the next turn.',
    galTimeoutTitle: 'Quiz timeout',
    galTimeoutDescription: 'Minutes before an unanswered quiz expires; timeout or closing never costs mood.',

    optGentle: 'Gentle / sensitive',
    optNeutral: 'Neutral / calm',
    optOptimistic: 'Optimistic / cheerful',
    optPessimistic: 'Pessimistic / melancholy',
    optTsundere: 'Tsundere',
    optIrritable: 'Irritable / short-tempered',
    optCustom: 'Custom',
    optNormal: 'Normal',
    optClingy: 'Clingy (×1.5)',
    optIndependent: 'Independent (×0.5)',
    optHidden: 'Hidden',
    optFuzzy: 'Fuzzy (recommended)',
    optExact: 'Exact',
  },
};

/** 给 WebUI 的 x-options 选项表；未知 kind 返回空数组，框架会继续问别的 World。 */
export function moodConfigOptions(kind: string, language: Language): Array<{ value: string; label: string }> {
  const t = pick(language, TEXT);
  if (kind === 'mood.personaPreset') {
    return [
      { value: 'gentle', label: t.optGentle },
      { value: 'neutral', label: t.optNeutral },
      { value: 'optimistic', label: t.optOptimistic },
      { value: 'pessimistic', label: t.optPessimistic },
      { value: 'tsundere', label: t.optTsundere },
      { value: 'irritable', label: t.optIrritable },
      { value: 'custom', label: t.optCustom },
    ];
  }
  if (kind === 'mood.attachment') {
    return [
      { value: 'normal', label: t.optNormal },
      { value: 'clingy', label: t.optClingy },
      { value: 'independent', label: t.optIndependent },
    ];
  }
  if (kind === 'mood.visibility') {
    return [
      { value: 'hidden', label: t.optHidden },
      { value: 'fuzzy', label: t.optFuzzy },
      { value: 'exact', label: t.optExact },
    ];
  }
  return [];
}

/** 三个配置组共用 owner `world:mood`，每条路径都落在 `worlds.mood.` 下。 */
export function moodConfigGroups(language: Language): ConfigGroup[] {
  const t = pick(language, TEXT);
  return [
    {
      id: 'world:mood-persona',
      owner: 'world:mood',
      schema: {
        type: 'object',
        title: t.persona,
        description: t.personaDescription,
        properties: {
          'worlds.mood.personaPreset': {
            type: 'string',
            title: t.presetTitle,
            description: t.presetDescription,
            enum: ['gentle', 'neutral', 'optimistic', 'pessimistic', 'tsundere', 'irritable', 'custom'],
            'x-options': 'mood.personaPreset',
            'x-hot': true,
          },
          'worlds.mood.attachment': {
            type: 'string',
            title: t.attachmentTitle,
            description: t.attachmentDescription,
            enum: ['normal', 'clingy', 'independent'],
            'x-options': 'mood.attachment',
            'x-hot': true,
          },
          'worlds.mood.neutralPoint': {
            type: 'integer',
            title: t.neutralTitle,
            description: t.neutralDescription,
            minimum: 0,
            maximum: 100,
            'x-hot': true,
          },
          'worlds.mood.positiveCoeff': {
            type: 'number',
            title: t.positiveTitle,
            description: t.positiveDescription,
            minimum: 0.1,
            maximum: 3,
            'x-hot': true,
          },
          'worlds.mood.negativeCoeff': {
            type: 'number',
            title: t.negativeTitle,
            description: t.negativeDescription,
            minimum: 0.1,
            maximum: 3,
            'x-hot': true,
          },
          'worlds.mood.personaNote': {
            type: 'string',
            title: t.noteTitle,
            description: t.noteDescription,
            'x-hot': true,
          },
          'worlds.mood.initialValue': {
            type: 'integer',
            title: t.initialTitle,
            description: t.initialDescription,
            minimum: 0,
            maximum: 100,
            'x-hot': true,
          },
        },
      },
    },
    {
      id: 'world:mood-dynamics',
      owner: 'world:mood',
      schema: {
        type: 'object',
        title: t.dynamics,
        description: t.dynamicsDescription,
        properties: {
          'worlds.mood.decayRate': {
            type: 'number',
            title: t.decayTitle,
            description: t.decayDescription,
            minimum: 0,
            maximum: 0.5,
            'x-hot': true,
          },
          'worlds.mood.noiseStd': {
            type: 'number',
            title: t.noiseTitle,
            description: t.noiseDescription,
            minimum: 0,
            maximum: 10,
            'x-hot': true,
          },
          'worlds.mood.autoDialogue': {
            type: 'boolean',
            title: t.autoDialogueTitle,
            description: t.autoDialogueDescription,
            'x-hot': true,
          },
          'worlds.mood.autoBrowse': {
            type: 'boolean',
            title: t.autoBrowseTitle,
            description: t.autoBrowseDescription,
            'x-hot': true,
          },
          'worlds.mood.modelReport': {
            type: 'boolean',
            title: t.modelReportTitle,
            description: t.modelReportDescription,
            'x-hot': true,
          },
          'worlds.mood.dialogueDailyCap': {
            type: 'integer',
            title: t.dialogueCapTitle,
            description: t.dialogueCapDescription,
            minimum: 0,
            maximum: 100,
            'x-hot': true,
          },
          'worlds.mood.browseDailyCap': {
            type: 'integer',
            title: t.browseCapTitle,
            description: t.browseCapDescription,
            minimum: 0,
            maximum: 100,
            'x-hot': true,
          },
          'worlds.mood.attentionDailyCap': {
            type: 'integer',
            title: t.attentionCapTitle,
            description: t.attentionCapDescription,
            minimum: 0,
            maximum: 100,
            'x-hot': true,
          },
          'worlds.mood.dailySwingCap': {
            type: 'integer',
            title: t.swingCapTitle,
            description: t.swingCapDescription,
            minimum: 0,
            maximum: 100,
            'x-hot': true,
          },
          'worlds.mood.diminishWindowMinutes': {
            type: 'integer',
            title: t.diminishTitle,
            description: t.diminishDescription,
            minimum: 0,
            maximum: 1440,
            'x-suffix': 'min',
            'x-hot': true,
          },
          'worlds.mood.attentionHoursA': {
            type: 'number',
            title: t.hoursATitle,
            description: t.hoursADescription,
            minimum: 0.5,
            maximum: 72,
            'x-suffix': 'h',
            'x-hot': true,
          },
          'worlds.mood.attentionHoursB': {
            type: 'number',
            title: t.hoursBTitle,
            description: t.hoursBDescription,
            minimum: 1,
            maximum: 168,
            'x-suffix': 'h',
            'x-hot': true,
          },
          'worlds.mood.attentionUnitHours': {
            type: 'number',
            title: t.unitTitle,
            description: t.unitDescription,
            minimum: 0.5,
            maximum: 24,
            'x-suffix': 'h',
            'x-hot': true,
          },
          'worlds.mood.attentionPenalty': {
            type: 'number',
            title: t.penaltyTitle,
            description: t.penaltyDescription,
            minimum: 0,
            maximum: 10,
            'x-hot': true,
          },
          'worlds.mood.attentionExtraPenalty': {
            type: 'number',
            title: t.extraTitle,
            description: t.extraDescription,
            minimum: 0,
            maximum: 10,
            'x-hot': true,
          },
          'worlds.mood.attentionReturnBonus': {
            type: 'number',
            title: t.returnTitle,
            description: t.returnDescription,
            minimum: 0,
            maximum: 10,
            'x-hot': true,
          },
          'worlds.mood.attentionCooldownMinutes': {
            type: 'integer',
            title: t.cooldownTitle,
            description: t.cooldownDescription,
            minimum: 0,
            maximum: 1440,
            'x-suffix': 'min',
            'x-hot': true,
          },
          'worlds.mood.proactiveAfterMinutes': {
            type: 'integer',
            title: t.proactiveAfterTitle,
            description: t.proactiveAfterDescription,
            minimum: 5,
            maximum: 1440,
            'x-suffix': 'min',
            'x-hot': true,
          },
          'worlds.mood.proactiveWindowMinutes': {
            type: 'integer',
            title: t.proactiveWindowTitle,
            description: t.proactiveWindowDescription,
            minimum: 1,
            maximum: 1440,
            'x-suffix': 'min',
            'x-hot': true,
          },
        },
      },
    },
    {
      id: 'world:mood-presentation',
      owner: 'world:mood',
      schema: {
        type: 'object',
        title: t.presentation,
        description: t.presentationDescription,
        properties: {
          'worlds.mood.visibility': {
            type: 'string',
            title: t.visibilityTitle,
            description: t.visibilityDescription,
            enum: ['hidden', 'fuzzy', 'exact'],
            'x-options': 'mood.visibility',
            'x-hot': true,
          },
          'worlds.mood.snapshotRefreshMinutes': {
            type: 'integer',
            title: t.snapshotTitle,
            description: t.snapshotDescription,
            minimum: 0,
            maximum: 1440,
            'x-suffix': 'min',
            'x-hot': true,
          },
          'worlds.mood.snapshotMinDelta': {
            type: 'integer',
            title: t.snapshotDeltaTitle,
            description: t.snapshotDeltaDescription,
            minimum: 0,
            maximum: 10,
            'x-hot': true,
          },
          'worlds.mood.historyDays': {
            type: 'integer',
            title: t.historyTitle,
            description: t.historyDescription,
            minimum: 1,
            maximum: 90,
            'x-suffix': 'd',
            'x-hot': true,
          },
          'worlds.mood.thresholdNotify': {
            type: 'boolean',
            title: t.thresholdNotifyTitle,
            description: t.thresholdNotifyDescription,
            'x-hot': true,
          },
          'worlds.mood.thresholdWake': {
            type: 'boolean',
            title: t.thresholdWakeTitle,
            description: t.thresholdWakeDescription,
            'x-hot': true,
          },
          'worlds.mood.selfRescue': {
            type: 'boolean',
            title: t.selfRescueTitle,
            description: t.selfRescueDescription,
            'x-hot': true,
          },
          'worlds.mood.selfRescueWake': {
            type: 'boolean',
            title: t.selfRescueWakeTitle,
            description: t.selfRescueWakeDescription,
            'x-hot': true,
          },
          'worlds.mood.dailyResetNotify': {
            type: 'boolean',
            title: t.dailyResetTitle,
            description: t.dailyResetDescription,
            'x-hot': true,
          },
          'worlds.mood.lowGuard': {
            type: 'boolean',
            title: t.lowGuardTitle,
            description: t.lowGuardDescription,
            'x-hot': true,
          },
        },
      },
    },
    {
      id: 'world:mood-gal',
      owner: 'world:mood',
      schema: {
        type: 'object',
        title: t.gal,
        description: t.galDescription,
        properties: {
          'worlds.mood.galEnabled': {
            type: 'boolean',
            title: t.galEnabledTitle,
            description: t.galEnabledDescription,
            'x-hot': true,
          },
          'worlds.mood.galDailyLimit': {
            type: 'integer',
            title: t.galDailyLimitTitle,
            description: t.galDailyLimitDescription,
            minimum: 0,
            maximum: 20,
            'x-suffix': '次/天',
            'x-hot': true,
          },
          'worlds.mood.galIdleMinutes': {
            type: 'integer',
            title: t.galIdleTitle,
            description: t.galIdleDescription,
            minimum: 1,
            maximum: 1440,
            'x-suffix': 'min',
            'x-hot': true,
          },
          'worlds.mood.galIdleChance': {
            type: 'number',
            title: t.galChanceTitle,
            description: t.galChanceDescription,
            minimum: 0,
            maximum: 1,
            'x-hot': true,
          },
          'worlds.mood.galMoodBoost': {
            type: 'number',
            title: t.galBoostTitle,
            description: t.galBoostDescription,
            minimum: 1,
            maximum: 10,
            'x-hot': true,
          },
          'worlds.mood.galHintCooldownMinutes': {
            type: 'integer',
            title: t.galHintCooldownTitle,
            description: t.galHintCooldownDescription,
            minimum: 1,
            maximum: 1440,
            'x-suffix': 'min',
            'x-hot': true,
          },
          'worlds.mood.galWake': {
            type: 'boolean',
            title: t.galWakeTitle,
            description: t.galWakeDescription,
            'x-hot': true,
          },
          'worlds.mood.galTimeoutMinutes': {
            type: 'integer',
            title: t.galTimeoutTitle,
            description: t.galTimeoutDescription,
            minimum: 1,
            maximum: 120,
            'x-suffix': 'min',
            'x-hot': true,
          },
        },
      },
    },
  ];
}
