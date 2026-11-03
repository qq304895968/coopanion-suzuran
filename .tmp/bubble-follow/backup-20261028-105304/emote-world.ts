/** `emote_pic`:按概率从表情文件夹里挑一张图;没出图时返回 skipped 回执。 */
import { randomInt } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, extname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Language } from 'cortico/core/language.ts';
import type { EventEnvelope, ToolDef, ToolOutcome, World, WorldHost, WorldWebUiDecl } from 'cortico/core/types.ts';
import type { DeepPartial } from 'cortico/world.ts';
import { PopupHost, imageDataUrl, listImagesRecursive, pickRandomImage } from './popup.ts';
import {
  EMOTIONS,
  EMOTION_LABELS,
  PROMPT_MAX_LENGTH,
  clampChance,
  isEmotion,
  resolveConfig,
  type EmotePicsConfigSection,
  type Emotion,
  type ResolvedConfig,
  type ResolvedPopup,
} from './config.ts';

const ENV_PROMPT_FILE = fileURLToPath(new URL('./ENV_PROMPT.md', import.meta.url));

/** 这个 World 在部署 dataDir 里的心情存档;文件名带 World id,避免和别的 World 撞。 */
const MOOD_FILE = 'emote-pics-mood.json';
/** 5 MiB;再大的图跳过。 */
const MAX_BYTES = 5 * 1024 * 1024;

/** 同一表情最近发过几张不重复。 */
const RECENT_LIMIT = 3;

const MIME_BY_EXTENSION: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

/** 全部工具的声明;定义里的 describe 与 `tools()` 都取它。 */
export const EMOTE_PIC_DECLS: ReadonlyArray<Omit<ToolDef, 'handler'>> = [
  {
    name: 'emote_pic',
    description: 'Maybe attach one random picture from the folder configured for an emotion. '
      + 'The call first rolls the emotion\'s chance (and its cooldown); when it does not fire, the receipt says '
      + 'skipped with a reason and carries no image. Omit emotion to use the current mood from emote_mood; '
      + 'without a valid mood the call is skipped. Use force to bypass chance and cooldown while testing. '
      + 'When it fires, the receipt carries the image as a [blob ...] line with a log: handle for image-sending tools. '
      + 'Only png, jpg, jpeg, gif and webp up to 5 MB are used.',
    tags: ['read'],
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        emotion: {
          type: 'string',
          enum: [...EMOTIONS],
          description: 'Which emotion folder to draw from. Omit to use the current mood.',
        },
        avoid: {
          type: 'array',
          items: { type: 'string' },
          description: 'File names not to pick, e.g. the last picture you sent.',
        },
        force: {
          type: 'boolean',
          description: 'Bypass the chance roll and the cooldown; the other rules still apply. For testing.',
        },
      },
      // emotion 可选:省略时用当前心情,所以这里不能写 required。
    },
  },
];

/** 只记心情,不发图:不产生 blob,也不碰 pet_say。 */
export const EMOTE_MOOD_DECLS: ReadonlyArray<Omit<ToolDef, 'handler'>> = [
  {
    name: 'emote_mood',
    description: 'Record the emotion you are in right now, so your next replies know it. '
      + 'Stores only { emotion, setAt }; it sends no image and attaches no blob. '
      + 'The mood expires after the configured minutes. Pass clear: true to clear it instead.',
    tags: ['write'],
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        emotion: {
          type: 'string',
          enum: [...EMOTIONS],
          description: 'The emotion you are in right now.',
        },
        clear: {
          type: 'boolean',
          default: false,
          description: 'Clear the current mood instead of setting one.',
        },
      },
    },
  },
];

/** 不经过面板的弹图测试入口;从当前表情目录随机挑一张弹一次。 */
export const EMOTE_POPUP_TEST_DECLS: ReadonlyArray<Omit<ToolDef, 'handler'>> = [
  {
    name: 'emote_popup_test',
    description: 'Pop one random picture from the configured emotion folders on the desktop, '
      + 'without sending a chat message. Use when the panel is unavailable or to check the popup.',
    tags: ['read'],
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {},
    },
  },
];

export interface EmotePicsWorldOptions {
  /** `worlds.emote-pics` 的活引用。 */
  cfg: EmotePicsConfigSection;
  /** 深合并进 `worlds.emote-pics`;面板保存走这里,立即生效。 */
  persist(patch: DeepPartial<EmotePicsConfigSection>): void;
  /** 概率掷骰;测试可注入,默认 `Math.random`。 */
  random?: () => number;
  /** 冷却计时;测试可注入,默认 `Date.now`。 */
  now?: () => number;
  /** 注入失败时的日志出口;默认 `console.warn`,挂载后换成 World 的 logger。 */
  warn?: (message: string, data?: unknown) => void;
  /** 部署数据目录;给了才把心情落盘。 */
  dataDir?: string;
  /** 测试可注入的弹图宿主;缺省按 dataDir 建。 */
  popup?: PopupHost;
}

type SaveResult = { ok: true; state: ResolvedConfig } | { ok: false; error: string };
type SkipReason = 'chance' | 'cooldown';
type MoodSource = 'script' | 'pic' | 'manual';

interface MoodState {
  emotion: Emotion;
  setAt: number;
  from: MoodSource;
}

/** 桌面宠说一句话时存的事件类型与扫描间隔(ms)。 */
const SAY_EVENT_TYPE = 'desktop-pet.self';
const SAY_SCAN_MS = 1000;

/** 名称 → 19 个键:id、英文键、中文名都认;`determined` 两种旧中文名都收。 */
const EMOTION_BY_NAME = new Map<string, Emotion>();
for (const emotion of EMOTIONS) {
  EMOTION_BY_NAME.set(emotion, emotion);
  EMOTION_BY_NAME.set(EMOTION_LABELS[emotion].zh, emotion);
  EMOTION_BY_NAME.set(EMOTION_LABELS[emotion].en, emotion);
}
EMOTION_BY_NAME.set('认真', 'determined');
EMOTION_BY_NAME.set('坚定', 'determined');

/** 一个 `mood` 对象(桌面宠事件里的 `{ id, zh, en }`)对应哪个情绪;认不出返回 null。 */
export function emotionFromMood(mood: unknown): Emotion | null {
  if (!mood || typeof mood !== 'object') return null;
  const record = mood as Record<string, unknown>;
  for (const key of ['id', 'zh', 'en']) {
    const value = record[key];
    if (typeof value !== 'string') continue;
    const hit = EMOTION_BY_NAME.get(value.trim());
    if (hit) return hit;
  }
  return null;
}

/**
 * 从桌面宠的 `desktop-pet.self` 说句话事件里取第一段表情。
 * 标记由桌面宠解析成 `meta.beats[].mood`(动作词在它那一侧就被过滤掉了),这里只做名称映射。
 */
export function scriptMoodFromEvent(event: EventEnvelope): Emotion | null {
  if (event.type !== SAY_EVENT_TYPE) return null;
  const meta = event.meta as Record<string, unknown> | undefined;
  if (!meta || meta.kind !== 'say' || !Array.isArray(meta.beats)) return null;
  for (const raw of meta.beats) {
    if (!raw || typeof raw !== 'object') continue;
    const emotion = emotionFromMood((raw as Record<string, unknown>).mood);
    if (emotion) return emotion;
  }
  return null;
}

export class EmotePicsWorld implements World {
  readonly id = 'emote-pics';

  /** 每个表情最近发过的文件名,最多 `RECENT_LIMIT` 个;进程重启后清空。 */
  private readonly recent = new Map<Emotion, string[]>();
  /** 每个表情上次出图的时间(ms);冷却用。 */
  private readonly lastSent = new Map<Emotion, number>();
  /** 注入失败往哪写;挂载后换成宿主 logger。 */
  private warn: (message: string, data?: unknown) => void;
  private info: (message: string, data?: unknown) => void;
  /** 最近一次 emote_mood;有 dataDir 时落盘,重启后还在。 */
  private mood: MoodState | null = null;
  private host: WorldHost | null = null;
  /** 已经扫到的事件游标;只读这之后的新事件。 */
  private lastCursor = 0;
  private scanTimer: ReturnType<typeof setInterval> | null = null;
  /** 自动感知的健康状态:面板展示,也决定告警何时喊、恢复时何时收。 */
  private watchStartedAt = 0;
  private lastScanAt: number | null = null;
  private lastScanMood: Emotion | null = null;
  private noMoodRun = 0;
  private warnedNoMood = false;
  private warnedSilent = false;
  private readonly popupHost: PopupHost | null;

  constructor(private readonly opts: EmotePicsWorldOptions) {
    const fallbackWarn = (message: string, data?: unknown): void => {
      console.warn(`[emote-pics] ${message}`, data ?? '');
    };
    this.warn = opts.warn ?? fallbackWarn;
    this.info = (message, data) => console.info(`[emote-pics] ${message}`, data ?? '');
    this.mood = this.loadMood();
    this.popupHost = opts.popup ?? (opts.dataDir
      ? new PopupHost({
        profileRoot: join(opts.dataDir, 'emote-pics-popup'),
        logFile: join(opts.dataDir, 'emote-pics-popup.log'),
        warn: (message, data) => this.warn(message, data),
      })
      : null);
  }

  /**
   * 把面板里保存的提示词交给模板 `{{emotePics.text}}`。
   * 关闭或文本为空时返回 null,整段(连同标题)不出现;任何异常只记日志,不打断前缀组装。
   */
  envPromptVars(): Record<string, string> | null {
    try {
      if (!existsSync(ENV_PROMPT_FILE)) {
        this.warn('环境提示词模板不在,跳过注入', { path: ENV_PROMPT_FILE });
        return null;
      }
      const raw = this.opts.cfg.prompt as Record<string, unknown> | undefined;
      const rawText = typeof raw?.text === 'string' ? raw.text : null;
      if (rawText !== null && rawText.length > PROMPT_MAX_LENGTH) {
        this.warn('提示词超过上限,注入时截断', { length: rawText.length, max: PROMPT_MAX_LENGTH });
      }
      const prompt = resolveConfig(this.opts.cfg).prompt;
      if (!prompt.enabled || !prompt.text.trim()) return null;
      return { 'emotePics.text': prompt.text, 'emotePics.mood': this.moodText() };
    } catch (err) {
      this.warn('注入情绪配图提示词失败,这次不注入', {
        err: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }

  tools(): ToolDef[] {
    return [
      { ...EMOTE_PIC_DECLS[0], handler: async (args) => this.pick(args) },
      { ...EMOTE_MOOD_DECLS[0], handler: async (args) => this.recordMood(args) },
      { ...EMOTE_POPUP_TEST_DECLS[0], handler: async () => this.testPopupTool() },
    ];
  }

  webUi(language: Language = 'zh'): WorldWebUiDecl {
    const zh = language.startsWith('zh');
    return {
      label: zh ? '对话表情包' : 'Emote pictures',
      panels: [{
        id: 'folders',
        title: zh ? '表情文件夹' : 'Emotion folders',
        description: zh
          ? '给每个表情选一个图片文件夹、设一个出图概率;改完立即生效,不用重启。'
          : 'Pick one picture folder and a send chance per emotion; changes apply at once without a restart.',
      }, {
        id: 'popup',
        title: zh ? '桌面弹图' : 'Desktop popup',
        description: zh
          ? '发图时在桌面上同步弹一张;位置、时长与测试都在这一页。'
          : 'Show the same picture on the desktop when a picture is sent; position, duration and a test live here.',
      }],
      promptDocs: [{
        key: 'worlds.emote-pics.envPrompt',
        title: zh ? '情绪配图' : 'Emotion pictures',
        description: zh
          ? '每次请求拼进系统前缀的那段说明;正文在「对话表情包」面板里编辑。'
          : 'The note added to the system prefix on every request; edit its text in the Emote pictures panel.',
        path: ENV_PROMPT_FILE,
        role: 'envPrompt',
        vars: [{
          name: 'emotePics.text',
          description: zh ? '面板里保存的提示词正文;关闭或为空时整段不出现。' : 'The prompt text saved in the panel; off or empty means the section is absent.',
        }, {
          name: 'emotePics.mood',
          description: zh
            ? '当前心情标签,如「happy（12 分钟前设的）」;没设或已过期是「未设置」。'
            : 'The current mood label such as "happy (set 12 minutes ago)"; "not set" when absent or expired.',
        }],
      }],
      invoke: async (panel, method, args) => {
        if (panel !== 'folders' && panel !== 'popup') {
          this.warn('WebUI 请求了未注册的面板', { panel });
          this.popupHost?.note(`WebUI unknown panel: ${panel}`);
          throw new Error(`unknown panel: ${panel}`);
        }
        if (method === 'state') return { ok: true, state: resolveConfig(this.opts.cfg) };
        if (method === 'mood') return this.moodInfo();
        if (method === 'clearMood') {
          this.clearMoodState();
          return this.moodInfo();
        }
        if (method === 'setDir') return this.setDir(args);
        if (method === 'setChance') return this.setChance(args);
        if (method === 'setDefaults') return this.setDefaults(args);
        if (method === 'setPromptEnabled') return this.setPromptEnabled(args);
        if (method === 'setPromptText') return this.setPromptText(args);
        if (method === 'setPopup') return this.setPopup(args);
        if (method === 'sampleImage') return this.sampleImage(args);
        if (method === 'testPopup') return this.testPopup();
        if (method === 'popupHealth') return this.popupHealthInfo();
        throw new Error(`unknown method: ${method}`);
      },
    };
  }

  async start(host: WorldHost): Promise<void> {
    this.warn = (message, data) => host.log.warn(message, data);
    this.info = (message, data) => host.log.info(message, data);
    this.host = host;
    const panelIds = this.webUi('zh').panels?.map((panel) => panel.id).join(', ') ?? '(none)';
    this.info(`WebUI panels: ${panelIds}`);
    this.popupHost?.note(`start: WebUI panels ${panelIds}`);
    // 从此刻起只看新事件,别拿历史气泡里的旧表情当现在。
    try {
      this.lastCursor = host.store.latestCursor();
    } catch {
      this.lastCursor = 0;
    }
    this.watchStartedAt = this.now();
    this.lastScanAt = null;
    this.lastScanMood = null;
    this.noMoodRun = 0;
    this.warnedNoMood = false;
    this.warnedSilent = false;
    this.scanTimer = setInterval(() => this.scanSaid(), SAY_SCAN_MS);
    this.scanTimer.unref?.();
  }

  async stop(): Promise<void> {
    if (this.scanTimer) {
      clearInterval(this.scanTimer);
      this.scanTimer = null;
    }
    this.popupHost?.stop();
    this.host = null;
    this.warn = (message, data) => console.warn(`[emote-pics] ${message}`, data ?? '');
    this.info = (message, data) => console.info(`[emote-pics] ${message}`, data ?? '');
  }

  /**
   * 只看桌面宠新存的 `desktop-pet.self` 事件。它说一句话时会把气泡里解析出的表情写进
   * `meta.beats[].mood`(动作词已被它过滤),这里取第一段能认出的情绪更新心情。
   */
  private scanSaid(): void {
    const host = this.host;
    if (!host) return;
    const config = resolveConfig(this.opts.cfg);
    try {
      const latest = host.store.latestCursor();
      if (latest > this.lastCursor) {
        const events = host.store.range({ fromCursor: this.lastCursor + 1, toCursor: latest });
        this.lastCursor = latest;
        for (const event of events) {
          if (event.type !== SAY_EVENT_TYPE) continue;
          this.noteScan(scriptMoodFromEvent(event), config);
        }
      }
      this.checkSilence(config);
    } catch (err) {
      this.warn('读取气泡事件失败,这次不更新心情', {
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /** 记一次气泡扫描;没 mood 的连续计数与告警、恢复都在这里。 */
  private noteScan(emotion: Emotion | null, config: ResolvedConfig): void {
    const at = this.now();
    if (this.warnedSilent) {
      this.warnedSilent = false;
      this.info('自动感知:又扫到气泡事件了,自动感知恢复');
    }
    this.lastScanAt = at;
    this.lastScanMood = emotion;
    if (emotion) {
      this.setMood(emotion, 'script', at);
      this.noMoodRun = 0;
      if (this.warnedNoMood) {
        this.warnedNoMood = false;
        this.info(`自动感知:又读到表情标记了(最近:${emotion}),心情恢复自动更新`);
      }
      return;
    }
    this.noMoodRun += 1;
    if (config.moodWatchNoMoodCount > 0
      && !this.warnedNoMood
      && this.noMoodRun >= config.moodWatchNoMoodCount) {
      this.warnedNoMood = true;
      this.warn(`自动感知:最近 ${config.moodWatchNoMoodCount} 条气泡都没读到表情标记,心情不会自动更新`);
    }
  }

  /** 隔多久没扫到气泡事件就喊一次;0 = 关。 */
  private checkSilence(config: ResolvedConfig): void {
    if (config.moodWatchSilentMinutes <= 0 || this.warnedSilent) return;
    const since = this.lastScanAt ?? this.watchStartedAt;
    if (since <= 0) return;
    if (this.now() - since >= config.moodWatchSilentMinutes * 60_000) {
      this.warnedSilent = true;
      this.warn(`自动感知:已 ${config.moodWatchSilentMinutes} 分钟没扫到气泡事件,可能桌面宠事件已改名/改字段`);
    }
  }

  private setMood(emotion: Emotion, from: MoodSource, at?: number): void {
    this.mood = { emotion, setAt: at ?? this.now(), from };
    this.saveMood();
  }

  private setDir(args: unknown[]): SaveResult {
    const emotion = String(args[0] ?? '');
    if (!isEmotion(emotion)) return { ok: false, error: `未知表情: ${emotion}` };
    const path = String(args[1] ?? '').trim();
    if (path) {
      if (!isAbsolute(path)) return { ok: false, error: `请填绝对路径: ${path}` };
      let stat;
      try {
        stat = statSync(path);
      } catch {
        return { ok: false, error: `文件夹不存在: ${path}` };
      }
      if (!stat.isDirectory()) return { ok: false, error: `不是文件夹: ${path}` };
    }
    this.opts.persist({ emotions: { [emotion]: { dir: path } } } as DeepPartial<EmotePicsConfigSection>);
    return { ok: true, state: resolveConfig(this.opts.cfg) };
  }

  private setChance(args: unknown[]): SaveResult {
    const emotion = String(args[0] ?? '');
    if (!isEmotion(emotion)) return { ok: false, error: `未知表情: ${emotion}` };
    const value = Number(args[1]);
    if (!Number.isFinite(value)) return { ok: false, error: `概率必须是 0~1 的数字: ${String(args[1] ?? '')}` };
    const chance = clampChance(value, 0);
    this.opts.persist({ emotions: { [emotion]: { chance } } } as DeepPartial<EmotePicsConfigSection>);
    return { ok: true, state: resolveConfig(this.opts.cfg) };
  }

  private setDefaults(args: unknown[]): SaveResult {
    const patch = (args[0] ?? {}) as Record<string, unknown>;
    const next: { defaultChance?: number; cooldownSeconds?: number } = {};
    if (patch.defaultChance !== undefined) {
      const value = Number(patch.defaultChance);
      if (!Number.isFinite(value)) return { ok: false, error: `默认概率必须是 0~1 的数字: ${String(patch.defaultChance)}` };
      next.defaultChance = clampChance(value, 0);
    }
    if (patch.cooldownSeconds !== undefined) {
      const value = Number(patch.cooldownSeconds);
      if (!Number.isFinite(value) || value < 0) {
        return { ok: false, error: `冷却秒数必须是不小于 0 的数字: ${String(patch.cooldownSeconds)}` };
      }
      next.cooldownSeconds = value;
    }
    this.opts.persist(next as DeepPartial<EmotePicsConfigSection>);
    return { ok: true, state: resolveConfig(this.opts.cfg) };
  }

  private setPromptEnabled(args: unknown[]): SaveResult {
    const enabled = args[0] === true;
    this.opts.persist({ prompt: { enabled } } as DeepPartial<EmotePicsConfigSection>);
    return { ok: true, state: resolveConfig(this.opts.cfg) };
  }

  private setPromptText(args: unknown[]): SaveResult {
    const text = String(args[0] ?? '');
    if (text.length > PROMPT_MAX_LENGTH) {
      return {
        ok: false,
        error: `提示词最多 ${PROMPT_MAX_LENGTH} 字(现在 ${text.length} 字),删短一些再保存。`,
      };
    }
    this.opts.persist({ prompt: { text } } as DeepPartial<EmotePicsConfigSection>);
    return { ok: true, state: resolveConfig(this.opts.cfg) };
  }

  /** 桌面弹图设置;坐标空串/null 表示用默认位置。 */
  private setPopup(args: unknown[]): SaveResult {
    const patch = (args[0] ?? {}) as Record<string, unknown>;
    const next: {
      popupEnabled?: boolean;
      popupX?: number | null;
      popupY?: number | null;
      popupDuration?: number;
      popupScale?: number;
      popupSize?: number;
      popupQueue?: boolean;
    } = {};
    if (patch.enabled !== undefined) next.popupEnabled = patch.enabled === true;
    for (const key of ['x', 'y'] as const) {
      if (patch[key] === undefined) continue;
      const raw = patch[key];
      if (raw === null || raw === '') {
        if (key === 'x') next.popupX = null; else next.popupY = null;
        continue;
      }
      const value = Number(raw);
      if (!Number.isFinite(value) || value < 0 || value > 1) {
        return { ok: false, error: `${key === 'x' ? '横' : '纵'}坐标要在 0~1 之间: ${String(raw)}` };
      }
      if (key === 'x') next.popupX = value; else next.popupY = value;
    }
    if (patch.duration !== undefined) {
      const value = Number(patch.duration);
      if (!Number.isFinite(value) || value < 0.5 || value > 60) {
        return { ok: false, error: `停留时长要在 0.5~60 秒之间: ${String(patch.duration)}` };
      }
      next.popupDuration = value;
    }
    if (patch.scale !== undefined) {
      const value = Number(patch.scale);
      if (!Number.isFinite(value) || value < 0.1 || value > 3) {
        return { ok: false, error: `缩放要在 0.1~3 之间: ${String(patch.scale)}` };
      }
      next.popupScale = value;
    }
    if (patch.size !== undefined) {
      const value = Number(patch.size);
      if (!Number.isFinite(value) || value < 0 || value > 2000) {
        return { ok: false, error: `尺寸要在 0~2000 px 之间(0 = 自动): ${String(patch.size)}` };
      }
      next.popupSize = value === 0 ? 0 : Math.max(80, Math.round(value));
    }
    if (patch.queue !== undefined) next.popupQueue = patch.queue === true;
    let radius: number | undefined;
    if (patch.radius !== undefined) {
      const value = Number(patch.radius);
      if (!Number.isFinite(value) || value < 0 || value > 64) {
        return { ok: false, error: `圆角半径要在 0~64 px 之间: ${String(patch.radius)}` };
      }
      radius = value;
    }
    const persisted: DeepPartial<EmotePicsConfigSection> = { ...next };
    if (radius !== undefined) persisted.popup = { radius };
    this.opts.persist(persisted);
    if (next.popupEnabled === false) this.popupHost?.stop();
    return { ok: true, state: resolveConfig(this.opts.cfg) };
  }

  /** 面板预览用:从已配置的表情目录里取一张图,返回 data URL;传当前文件名可换一张。 */
  private sampleImage(args: unknown[]): { ok: true; dataUrl: string; name: string } | { ok: false; error: string } {
    const config = resolveConfig(this.opts.cfg);
    const dirs = EMOTIONS
      .map((emotion) => config.emotions[emotion].dir)
      .filter((dir) => dir.length > 0);
    const images = listImagesRecursive(dirs);
    if (!images.length) return { ok: false, error: '还没有可用图片:先在「对话表情包」里给情绪绑定文件夹' };
    const avoid = typeof args[0] === 'string' ? basename(args[0]) : '';
    const pool = avoid ? images.filter((path) => basename(path) !== avoid) : images;
    const list = pool.length ? pool : images;
    const path = avoid ? list[randomInt(list.length)]! : list[0]!;
    const dataUrl = imageDataUrl(path);
    if (!dataUrl) return { ok: false, error: `这张图读不出来或超过 5 MiB: ${basename(path)}` };
    return { ok: true, dataUrl, name: basename(path) };
  }

  /** 从当前表情目录(含子文件夹)随机挑一张,按当前设置弹一次。 */
  private async testPopup(): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
    const config = resolveConfig(this.opts.cfg);
    const dirs = EMOTIONS
      .map((emotion) => config.emotions[emotion].dir)
      .filter((dir) => dir.length > 0);
    if (!dirs.length) return { ok: false, error: '还没有配置任何表情文件夹' };
    const path = pickRandomImage(dirs);
    if (!path) return { ok: false, error: '表情文件夹里没有可用图片(含子文件夹)' };
    if (!this.popupHost) return { ok: false, error: '弹图宿主不可用(缺少部署数据目录)' };
    try {
      if (!await this.popupHost.show(path, { ...config.popup, enabled: true })) {
        return { ok: false, error: '弹图窗口没能打开(看运行日志里的 warn)' };
      }
    } catch (err) {
      return { ok: false, error: `弹图失败: ${err instanceof Error ? err.message : String(err)}` };
    }
    return { ok: true, path };
  }

  private async testPopupTool(): Promise<ToolOutcome> {
    const res = await this.testPopup();
    if (res.ok) return { text: `已在桌面弹出测试图: ${res.path}` };
    return { text: `弹图测试失败: ${res.error}`, failed: true };
  }

  private maybePopup(path: string, popup: ResolvedPopup): void {
    try {
      if (!popup.queue) this.popupHost?.stopAll();
      void this.popupHost?.show(path, popup).catch((err) => {
        this.warn('弹图失败,不影响发图', {
          path,
          err: err instanceof Error ? err.message : String(err),
        });
      });
    } catch (err) {
      this.warn('弹图失败,不影响发图', {
        path,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  private popupHealthInfo(): {
    ok: true;
    status: string;
    running: boolean;
    failures: number;
    stalled: boolean;
    lastError: string | null;
    logPath: string | null;
  } {
    const config = resolveConfig(this.opts.cfg);
    const health = this.popupHost?.health() ?? {
      running: false,
      failures: 0,
      stalled: false,
      lastError: null,
    };
    const status = !config.popup.enabled
      ? 'disabled'
      : health.lastError
        ? `error: ${health.lastError}`
        : 'ready';
    return {
      ok: true,
      status,
      ...health,
      logPath: this.opts.dataDir ? join(this.opts.dataDir, 'emote-pics-popup.log') : null,
    };
  }

  /** `emote_mood`:只记 { emotion, setAt };不读图、不发图、不产生 blob。 */
  private recordMood(args: Record<string, unknown>): ToolOutcome {
    const hasEmotion = args.emotion !== undefined;
    const clear = args.clear === true;
    if (clear && hasEmotion) {
      return fail('clear 和 emotion 不能同时给;要清空就只传 clear: true,要记心情就只传 emotion。');
    }
    if (clear) {
      this.clearMoodState();
      return { text: '心情已清空' };
    }
    if (!hasEmotion) {
      return fail('emotion 必填;要清空当前心情就传 clear: true。');
    }
    const emotion = String(args.emotion).trim();
    if (!isEmotion(emotion)) {
      return fail(`emotion 只接受 ${EMOTIONS.join('、')} 之一;收到 "${emotion}"。`);
    }
    this.mood = { emotion, setAt: this.now(), from: 'manual' };
    this.saveMood();
    const ttl = resolveConfig(this.opts.cfg).moodTtlMinutes;
    return { text: `记下了:${emotion}(${ttl} 分钟内有效)` };
  }

  private clearMoodState(): void {
    this.mood = null;
    this.clearMoodFile();
  }

  /** 面板用的心情快照;过期视同没设。 */
  private moodInfo(): {
    ok: true;
    mood: { emotion: Emotion; setAt: number; remainingSeconds: number; from: MoodSource } | null;
    ttlMinutes: number;
    watch: {
      running: boolean;
      lastScanAt: number | null;
      lastScanMood: Emotion | null;
      noMoodRun: number;
      warnedNoMood: boolean;
      warnedSilent: boolean;
      noMoodCount: number;
      silentMinutes: number;
    };
  } {
    const config = resolveConfig(this.opts.cfg);
    const mood = this.currentMood(config.moodTtlMinutes);
    return {
      ok: true,
      mood: mood
        ? {
          emotion: mood.emotion,
          setAt: mood.setAt,
          remainingSeconds: Math.max(0, Math.round(
            (config.moodTtlMinutes * 60_000 - (this.now() - mood.setAt)) / 1000,
          )),
          from: mood.from,
        }
        : null,
      ttlMinutes: config.moodTtlMinutes,
      watch: {
        running: this.scanTimer !== null,
        lastScanAt: this.lastScanAt,
        lastScanMood: this.lastScanMood,
        noMoodRun: this.noMoodRun,
        warnedNoMood: this.warnedNoMood,
        warnedSilent: this.warnedSilent,
        noMoodCount: config.moodWatchNoMoodCount,
        silentMinutes: config.moodWatchSilentMinutes,
      },
    };
  }

  /** 过了 `moodTtlMinutes` 就当成没设,不再拿旧值参与判断。 */
  private currentMood(ttlMinutes: number): MoodState | null {
    if (!this.mood) return null;
    if (this.now() - this.mood.setAt >= ttlMinutes * 60_000) return null;
    return this.mood;
  }

  /** 注入用的纯文字,例如 `happy（12 分钟前设的）`。 */
  private moodText(): string {
    const mood = this.currentMood(resolveConfig(this.opts.cfg).moodTtlMinutes);
    if (!mood) return '未设置';
    const minutes = Math.floor((this.now() - mood.setAt) / 60_000);
    return minutes <= 0
      ? `${mood.emotion}（刚刚设的，还未过期）`
      : `${mood.emotion}（约 ${minutes} 分钟前设的，还未过期）`;
  }

  private moodFile(): string | null {
    return this.opts.dataDir ? join(this.opts.dataDir, MOOD_FILE) : null;
  }

  private loadMood(): MoodState | null {
    const file = this.moodFile();
    if (!file || !existsSync(file)) return null;
    try {
      const raw = JSON.parse(readFileSync(file, 'utf8')) as { emotion?: unknown; setAt?: unknown; from?: unknown };
      if (typeof raw.emotion === 'string' && isEmotion(raw.emotion)
        && typeof raw.setAt === 'number' && Number.isFinite(raw.setAt)) {
        const from: MoodSource = raw.from === 'script' || raw.from === 'pic' ? raw.from : 'manual';
        return { emotion: raw.emotion, setAt: raw.setAt, from };
      }
      this.warn('心情文件内容不认识,忽略', { file });
    } catch (err) {
      this.warn('心情文件读取失败,忽略', { file, err: err instanceof Error ? err.message : String(err) });
    }
    return null;
  }

  private saveMood(): void {
    const file = this.moodFile();
    const dir = this.opts.dataDir;
    if (!file || !dir || !this.mood) return;
    try {
      mkdirSync(dir, { recursive: true });
      writeFileSync(file, JSON.stringify(this.mood), 'utf8');
    } catch (err) {
      this.warn('心情写盘失败,只留在内存', { file, err: err instanceof Error ? err.message : String(err) });
    }
  }

  private clearMoodFile(): void {
    const file = this.moodFile();
    if (!file) return;
    try {
      rmSync(file, { force: true });
    } catch (err) {
      this.warn('心情存档删除失败', { file, err: err instanceof Error ? err.message : String(err) });
    }
  }

  private pick(args: Record<string, unknown>): ToolOutcome {
    // 模型刚说过话的话,这里先把新气泡事件读掉,同轮取图就能用上新心情。
    this.scanSaid();
    const config = resolveConfig(this.opts.cfg);
    const requested = String(args.emotion ?? '').trim();
    let emotion: Emotion;
    let fromMood = false;
    if (requested) {
      if (!isEmotion(requested)) {
        return fail(`emotion 只接受 ${EMOTIONS.join('、')} 之一;收到 "${requested}"。`);
      }
      emotion = requested;
    } else {
      const mood = this.currentMood(config.moodTtlMinutes);
      if (!mood) return this.skipNoMood();
      emotion = mood.emotion;
      fromMood = true;
    }

    const setting = config.emotions[emotion];
    if (!setting.dir) {
      return fail(`${emotion} 还没有配置文件夹。到 WebUI 的「对话表情包」面板里给它选一个。`);
    }
    if (!isAbsolute(setting.dir)) return fail(`${emotion} 配置的文件夹不是绝对路径: ${setting.dir}`);

    let stat;
    try {
      stat = statSync(setting.dir);
    } catch {
      return fail(`${emotion} 的文件夹不存在: ${setting.dir}`);
    }
    if (!stat.isDirectory()) return fail(`${emotion} 的文件夹不是目录: ${setting.dir}`);

    const avoid = new Set(
      (Array.isArray(args.avoid) ? args.avoid : [])
        .filter((value): value is string => typeof value === 'string')
        .map((value) => basename(value)),
    );
    const images = this.imagesIn(setting.dir, avoid);
    if (!images.length) {
      return fail(`${emotion} 的文件夹里没有可用图片(只收 png/jpg/jpeg/gif/webp,每张不超过 5 MB)`
        + (avoid.size ? `;avoid 还排除了 ${avoid.size} 个文件名。` : '。'));
    }

    if (args.force !== true) {
      const chance = setting.chance;
      if (chance <= 0) return this.skip(emotion, 'chance', chance, `概率 0%`, fromMood);
      const roll = this.random();
      if (roll >= chance) {
        return this.skip(emotion, 'chance', chance, `概率 ${Math.round(chance * 100)}%,掷骰 ${roll.toFixed(3)}`, fromMood);
      }
      const left = this.cooldownLeftMs(emotion, config.cooldownSeconds);
      if (left > 0) {
        return this.skip(emotion, 'cooldown', chance,
          `刚发过一张,冷却还剩 ${Math.ceil(left / 1000)} 秒(间隔 ${config.cooldownSeconds} 秒)`, fromMood);
      }
    }

    const recent = this.recent.get(emotion) ?? [];
    let pool = images.filter((image) => !recent.includes(image.name));
    if (!pool.length) pool = images.filter((image) => image.name !== recent[recent.length - 1]);
    if (!pool.length) pool = images;
    const chosen = pool[randomInt(pool.length)]!;

    let bytes: Uint8Array;
    try {
      bytes = readFileSync(chosen.path);
    } catch (err) {
      return fail(`读取 ${chosen.path} 失败: ${err instanceof Error ? err.message : String(err)}`);
    }

    this.remember(emotion, chosen.name);
    const now = this.now();
    this.lastSent.set(emotion, now);
    // 真正取到图才刷新心情;跳过或出错都不动。
    if (config.moodFromPic) {
      this.setMood(emotion, 'pic', now);
    }
    // 弹图是锦上添花:失败只记日志,不影响回执。
    if (config.popup.enabled) this.maybePopup(chosen.path, config.popup);
    const source = fromMood ? `按当前心情 ${emotion} 取的图。\n` : '';
    return {
      text: `${source}已选 ${emotion}:${chosen.name}(${bytes.byteLength} 字节,${chosen.mime},概率 ${Math.round(setting.chance * 100)}%)\n`
        + `path=${chosen.path}\n`
        + '句柄在下一行 [blob …] 里,把它填进 pet_say 的 images。',
      blobs: [{ bytes, mime: chosen.mime, name: chosen.name, fallbackText: `原路径 ${chosen.path}` }],
    };
  }

  /** 没指定 emotion,当前心情也没有或过期:正常跳过,不猜、不退化成随机情绪。 */
  private skipNoMood(): ToolOutcome {
    return {
      text: `[skipped] ${JSON.stringify({ skipped: true, reason: 'no_mood' })}\n`
        + '没有当前心情,也没指定 emotion;这次不发图。不是错误,是故意跳过。',
    };
  }

  /** 跳过不是错误:回执里带 `{skipped, reason, chance}`,不带附件。 */
  private skip(
    emotion: Emotion,
    reason: SkipReason,
    chance: number,
    detail: string,
    fromMood = false,
  ): ToolOutcome {
    const payload = JSON.stringify({ skipped: true, reason, chance });
    const source = fromMood ? `(按当前心情 ${emotion} 取)` : '';
    return {
      text: `[skipped] ${payload}\n${emotion}${source} 这次不出图:${detail}。不是错误,是故意跳过。`,
    };
  }

  private cooldownLeftMs(emotion: Emotion, cooldownSeconds: number): number {
    if (cooldownSeconds <= 0) return 0;
    const last = this.lastSent.get(emotion);
    if (last === undefined) return 0;
    return Math.max(0, cooldownSeconds * 1000 - (this.now() - last));
  }

  /** 文件夹里合格、且不在 avoid 名单里的图片。 */
  private imagesIn(
    folder: string,
    avoid: ReadonlySet<string>,
  ): Array<{ name: string; path: string; mime: string }> {
    let names: string[];
    try {
      names = readdirSync(folder);
    } catch {
      return [];
    }
    const out: Array<{ name: string; path: string; mime: string }> = [];
    for (const name of names) {
      if (name.startsWith('.') || avoid.has(name)) continue;
      const mime = MIME_BY_EXTENSION[extname(name).toLowerCase()];
      if (!mime) continue;
      const path = join(folder, name);
      try {
        const stat = statSync(path);
        if (!stat.isFile() || stat.size > MAX_BYTES) continue;
      } catch {
        continue;
      }
      out.push({ name, path, mime });
    }
    return out;
  }

  private remember(emotion: Emotion, name: string): void {
    const list = this.recent.get(emotion) ?? [];
    list.push(name);
    if (list.length > RECENT_LIMIT) list.splice(0, list.length - RECENT_LIMIT);
    this.recent.set(emotion, list);
  }

  private random(): number {
    return (this.opts.random ?? Math.random)();
  }

  private now(): number {
    return (this.opts.now ?? Date.now)();
  }
}

function fail(text: string): ToolOutcome {
  return { text, failed: true };
}
