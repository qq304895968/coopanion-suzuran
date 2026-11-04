/**
 * `worlds.screen` 段的形状、默认值与 WebUI 配置声明。
 *
 * 全部标 x-hot: true —— 热键、抓哪块屏、即时反馈这些改了之后由 World 自己在两秒内
 * 重启侧车生效,不需要重启插件(更不需要重启 Coopanion)。
 */
import type { ConfigGroup } from 'cortico/core/types.ts';
import type { Language } from 'cortico/core/language.ts';
import { pick } from 'cortico/core/language.ts';

export type MonitorMode = 'cursor' | 'primary' | 'all';
export type FeedbackMode = 'sound,toast' | 'sound' | 'toast' | 'off';

/** config.json 的 worlds.screen 段。 */
export interface ScreenConfigSection {
  enabled: boolean;
  /** 全局热键,形如 `ctrl+alt+q`、`alt+shift+s`、`f9`;空串表示不注册热键。 */
  hotkey: string;
  /** 双击桌宠触发一次。桌宠的触摸事件由 desktop-pet 世界发出,这里只听不看。 */
  doubleClick: boolean;
  /** 抓哪块屏:cursor=光标所在显示器,primary=主显示器,all=所有显示器拼起来。 */
  monitor: MonitorMode;
  /** 长边缩到这个像素再交给模型;0 表示不缩。 */
  maxEdge: number;
  /** 跑侧车的 Python 解释器;空串表示用 PATH 里的 `python`。 */
  python: string;
  /** 按下热键那一刻的即时反馈:轻响、光标旁的小提示、两者都要、都不要。 */
  feedback: FeedbackMode;
  /** 自定义提示音的 wav 路径;空串用内置的那声轻响。 */
  sound: string;
  /** 桌宠自己想看屏幕:按下面的节奏主动抓一帧并先开口。 */
  proactive: boolean;
  /** 两次主动看之间的最小间隔(分钟)。 */
  proactiveEveryMinutes: number;
  /** 每天最多主动看几次。 */
  proactiveDailyQuota: number;
  /** 安静时段 `HH:MM-HH:MM`,跨午夜也认;留空表示没有。 */
  proactiveQuiet: string;
  /** 主动看时附加的那句话。 */
  proactiveNote: string;
  /** 热键截图时附加的那句话。 */
  prompt: string;
  /** 桌宠给一帧打 1–10 分;达到这个分数就记成「深刻瞬间」,供日记引用、绘画当参考。 */
  memorableScore: number;
}

export const SCREEN_DEFAULTS: ScreenConfigSection = {
  enabled: false,
  hotkey: 'ctrl+alt+q',
  doubleClick: true,
  monitor: 'cursor',
  maxEdge: 1600,
  python: '',
  feedback: 'sound,toast',
  sound: '',
  proactive: false,
  proactiveEveryMinutes: 20,
  proactiveDailyQuota: 6,
  proactiveQuiet: '23:00-08:00',
  proactiveNote: '就自然地评论一句他在做什么;如果他在做容易走神的事,轻轻推一把。别念屏上的字。',
  prompt: '先用一两句话说清楚这一屏是什么、我在干什么,然后直接回答:我下一步该怎么做。看不清的地方就说看不清。',
  memorableScore: 8,
};

const MONITOR_OPTIONS: ReadonlyArray<{ value: MonitorMode; zh: string; en: string }> = [
  { value: 'cursor', zh: '光标所在的显示器', en: 'The monitor under the cursor' },
  { value: 'primary', zh: '主显示器', en: 'The primary monitor' },
  { value: 'all', zh: '所有显示器拼起来', en: 'All monitors stitched together' },
];

const FEEDBACK_OPTIONS: ReadonlyArray<{ value: FeedbackMode; zh: string; en: string }> = [
  { value: 'sound,toast', zh: '轻响 + 提示', en: 'Chime and a hint' },
  { value: 'sound', zh: '只要轻响', en: 'Chime only' },
  { value: 'toast', zh: '只要提示', en: 'Hint only' },
  { value: 'off', zh: '都不要', en: 'Neither' },
];

/** 给 WebUI 的 x-options 选项表。 */
export function monitorOptions(language: Language): Array<{ value: string; label: string }> {
  return MONITOR_OPTIONS.map((o) => ({ value: o.value, label: language === 'en' ? o.en : o.zh }));
}

export function feedbackOptions(language: Language): Array<{ value: string; label: string }> {
  return FEEDBACK_OPTIONS.map((o) => ({ value: o.value, label: language === 'en' ? o.en : o.zh }));
}

export function monitorLabel(mode: string, language: Language = 'zh'): string {
  const hit = MONITOR_OPTIONS.find((o) => o.value === mode);
  if (!hit) return mode;
  return language === 'en' ? hit.en : hit.zh;
}

const TEXT = {
  zh: {
    group: '看一眼',
    groupDescription: '按热键,把当前这一屏交给 Coo 看;也可以让它自己隔一阵看一眼。',
    hotkeyTitle: '抓屏热键',
    hotkeyDescription: '形如 ctrl+alt+q、alt+shift+s、f9。留空 = 不用热键,只靠双击桌宠。被别的软件占用时会提示你换一个。改完两秒内生效,不用重启。',
    doubleClickTitle: '双击桌宠看一眼',
    doubleClickDescription: '双击桌宠的身体就抓一帧。听的是桌宠发出的触摸事件,只在你双击得很近(450 毫秒内)才算。改完两秒内生效。',
    monitorTitle: '抓哪块屏',
    monitorDescription: '多显示器时默认抓光标所在的那块。改完两秒内生效。',
    maxEdgeTitle: '长边像素',
    maxEdgeDescription: '截图先缩到这个长边再交给模型,越小越快越省 token,越小字越糊。改完两秒内生效。',
    pythonTitle: 'Python 解释器',
    pythonDescription: '留空用 PATH 里的 python。侧车只用标准库,不需要 pip install。改完两秒内生效。',
    feedbackTitle: '按下时的反馈',
    feedbackDescription: '按下去到 Coo 开口有几秒,这段时间里给个动静:一声轻响、光标旁 1.4 秒的小提示。',
    soundTitle: '提示音文件',
    soundDescription: '自定义 wav 的绝对路径。留空用内置的那声轻响(winsound 合成,不带资源文件)。',
    proactiveTitle: '让它自己看一眼',
    proactiveDescription: '开着时,桌宠会按下面的节奏自己抓一帧并先开口,不是等你按热键。默认关闭。',
    everyMinutesTitle: '最短间隔',
    everyMinutesDescription: '两次主动看之间至少隔多少分钟。',
    quotaTitle: '每天上限',
    quotaDescription: '一天最多主动看几次;重启进程会重新计数。',
    quietTitle: '安静时段',
    quietDescription: 'HH:MM-HH:MM,跨午夜也认。留空表示没有。',
    proactiveNoteTitle: '主动看时说什么',
    proactiveNoteDescription: '主动抓帧时跟图一起进上下文的那句话。',
    promptTitle: '按热键时说什么',
    promptDescription: '每次热键截图时跟图一起进上下文的那句话,决定 Coo 看到图先做什么。',
    memorableTitle: '深刻瞬间分数线',
    memorableDescription: 'Coo 看完一帧会打 1–10 分。达到这个分数就记成「深刻瞬间」,写日记时可以引用,也可以让绘画插件照着这张图画。分数在评分时生效。',
  },
  en: {
    group: 'Glance',
    groupDescription: 'Press a hotkey and hand the current screen to Coo; or let it peek on its own now and then.',
    hotkeyTitle: 'Capture hotkey',
    hotkeyDescription: 'Like ctrl+alt+q, alt+shift+s or f9. Empty means no hotkey; double-click the pet instead. A conflict is reported instead of silently failing. Takes effect within two seconds.',
    doubleClickTitle: 'Double-click the pet',
    doubleClickDescription: 'Two touches on the pet within 450 ms capture a frame. This listens to the touch events the desktop-pet World already emits. Takes effect within two seconds.',
    monitorTitle: 'Which screen',
    monitorDescription: 'With several monitors the default is the one under the cursor. Takes effect within two seconds.',
    maxEdgeTitle: 'Longest edge (px)',
    maxEdgeDescription: 'The shot is scaled down to this before it reaches the model: smaller is faster and cheaper, larger keeps text sharp.',
    pythonTitle: 'Python interpreter',
    pythonDescription: 'Empty means the `python` on PATH. The sidecar uses only the standard library, so no pip install.',
    feedbackTitle: 'Feedback on press',
    feedbackDescription: 'It takes a few seconds before Coo speaks; give the press a sign: a chime, and a hint next to the cursor for 1.4s.',
    soundTitle: 'Chime file',
    soundDescription: 'Absolute path to a .wav. Empty uses the built-in chime, synthesised with winsound, no asset shipped.',
    proactiveTitle: 'Let it peek on its own',
    proactiveDescription: 'While on, the pet captures a frame on the schedule below and speaks first instead of waiting for the hotkey. Off by default.',
    everyMinutesTitle: 'Minimum interval',
    everyMinutesDescription: 'At least this many minutes between two self-initiated looks.',
    quotaTitle: 'Daily quota',
    quotaDescription: 'How many self-initiated looks per day; restarting resets the count.',
    quietTitle: 'Quiet hours',
    quietDescription: 'HH:MM-HH:MM, midnight wrap supported. Empty means none.',
    proactiveNoteTitle: 'Note for a self-initiated look',
    proactiveNoteDescription: 'The sentence that rides along with the frame when the pet looks on its own.',
    promptTitle: 'Note for the hotkey',
    promptDescription: 'The sentence that rides along with the image and tells Coo what to do with it.',
    memorableTitle: 'Memorable moment threshold',
    memorableDescription: 'Coo scores each frame from 1–10. At or above this score it is kept as a memorable moment, which the diary can cite and the drawing tool can use as a reference. The threshold applies when scoring.',
  },
};

/** World 配置组:owner 须是 `world:screen`,每条路径须落在 `worlds.screen.` 下。 */
export function screenConfigGroup(language: Language): ConfigGroup {
  const t = pick(language, TEXT);
  return {
    id: 'world:screen',
    owner: 'world:screen',
    schema: {
      type: 'object',
      title: t.group,
      description: t.groupDescription,
      properties: {
        'worlds.screen.hotkey': {
          type: 'string',
          title: t.hotkeyTitle,
          description: t.hotkeyDescription,
          'x-hot': true,
        },
        'worlds.screen.doubleClick': {
          type: 'boolean',
          title: t.doubleClickTitle,
          description: t.doubleClickDescription,
          'x-hot': true,
        },
        'worlds.screen.monitor': {
          type: 'string',
          enum: ['cursor', 'primary', 'all'],
          title: t.monitorTitle,
          description: t.monitorDescription,
          'x-options': 'screen.monitor',
          'x-hot': true,
        },
        'worlds.screen.maxEdge': {
          type: 'integer',
          minimum: 480,
          maximum: 4096,
          title: t.maxEdgeTitle,
          description: t.maxEdgeDescription,
          'x-suffix': 'px',
          'x-hot': true,
        },
        'worlds.screen.feedback': {
          type: 'string',
          enum: ['sound,toast', 'sound', 'toast', 'off'],
          title: t.feedbackTitle,
          description: t.feedbackDescription,
          'x-options': 'screen.feedback',
          'x-hot': true,
        },
        'worlds.screen.sound': {
          type: 'string',
          title: t.soundTitle,
          description: t.soundDescription,
          'x-path': { kind: 'file' },
          'x-hot': true,
        },
        'worlds.screen.prompt': {
          type: 'string',
          title: t.promptTitle,
          description: t.promptDescription,
          'x-hot': true,
        },
        'worlds.screen.memorableScore': {
          type: 'integer',
          minimum: 1,
          maximum: 10,
          title: t.memorableTitle,
          description: t.memorableDescription,
          'x-hot': true,
        },
        'worlds.screen.proactive': {
          type: 'boolean',
          title: t.proactiveTitle,
          description: t.proactiveDescription,
          'x-hot': true,
        },
        'worlds.screen.proactiveEveryMinutes': {
          type: 'integer',
          minimum: 5,
          maximum: 240,
          title: t.everyMinutesTitle,
          description: t.everyMinutesDescription,
          'x-suffix': 'min',
          'x-hot': true,
        },
        'worlds.screen.proactiveDailyQuota': {
          type: 'integer',
          minimum: 0,
          maximum: 50,
          title: t.quotaTitle,
          description: t.quotaDescription,
          'x-hot': true,
        },
        'worlds.screen.proactiveQuiet': {
          type: 'string',
          title: t.quietTitle,
          description: t.quietDescription,
          'x-hot': true,
        },
        'worlds.screen.proactiveNote': {
          type: 'string',
          title: t.proactiveNoteTitle,
          description: t.proactiveNoteDescription,
          'x-hot': true,
        },
        'worlds.screen.python': {
          type: 'string',
          title: t.pythonTitle,
          description: t.pythonDescription,
          'x-hot': true,
        },
      },
    },
  };
}
