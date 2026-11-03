/**
 * 对话表情包:扫到桌宠气泡里的表情标记,按概率从父文件夹的子文件夹里挑一张,弹在桌宠身上。
 * 只要一个父文件夹;子文件夹名就是情绪键(happy/sad/…),也认中文名(开心/难过/…)。
 */
import { randomInt } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, extname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Language } from 'cortico/core/language.ts';
import type { EventEnvelope, ToolDef, ToolOutcome, World, WorldHost, WorldWebUiDecl } from 'cortico/core/types.ts';
import type { DeepPartial } from 'cortico/world.ts';
import { PopupHost, imageDataUrl, pickRandomImage, type PopupFollow } from './popup.ts';
import {
  PetConfigPositionSource,
  PetPositionResolver,
  PetScreenPositionSource,
  type PetPositionResult,
} from './follow.ts';
import {
  EMOTIONS,
  EMOTION_LABELS,
  clampChance,
  isEmotion,
  resolveConfig,
  type EmotePicsConfigSection,
  type Emotion,
  type ResolvedConfig,
  type ResolvedPopup,
} from './config.ts';

/** 这个 World 在部署 dataDir 里的弹图日志与临时窗口目录。 */
const POPUP_LOG = 'emote-pics-popup.log';
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

/** 桌宠说一句话时存的事件类型与扫描间隔(ms)。 */
const SAY_EVENT_TYPE = 'desktop-pet.self';
const SAY_SCAN_MS = 1000;

/** 全部工具的声明;定义里的 describe 与 `tools()` 都取它。 */
export const EMOTE_PIC_DECLS: ReadonlyArray<Omit<ToolDef, 'handler'>> = [
  {
    name: 'emote_pic',
    description: 'Attach one random picture from the folder of an emotion to this reply; it shows on the chat page only '
      + '(the pet bubble pops on its own). Rolls the configured chance and cooldown; when it does not fire the receipt says '
      + 'skipped with a reason and carries no image. Only png, jpg, jpeg, gif and webp up to 5 MB are used.',
    tags: ['read'],
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['emotion'],
      properties: {
        emotion: {
          type: 'string',
          enum: [...EMOTIONS],
          description: 'Which emotion folder to draw from.',
        },
        force: {
          type: 'boolean',
          description: 'Bypass the chance roll and the cooldown. For testing.',
        },
      },
    },
  },
];

/** 不经过面板的弹图测试入口;从父文件夹下所有情绪子文件夹里随机挑一张弹一次。 */
export const EMOTE_POPUP_TEST_DECLS: ReadonlyArray<Omit<ToolDef, 'handler'>> = [
  {
    name: 'emote_popup_test',
    description: 'Pop one random picture from the configured emotion folders on the desktop, '
      + 'without sending a chat message. Use when the panel is unavailable or to check the popup.',
    tags: ['read'],
    parameters: { type: 'object', additionalProperties: false, properties: {} },
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
  /** 部署数据目录;给了才建弹图宿主。 */
  dataDir?: string;
  /** 部署根目录(config.json 所在);给了才建跟随位置源。 */
  botDir?: string;
  /** 测试可注入的弹图宿主;缺省按 dataDir 建。 */
  popup?: PopupHost;
}

type SaveResult = { ok: true; state: ResolvedConfig } | { ok: false; error: string };
type SkipReason = 'chance' | 'cooldown';

/** 名称 → 19 个键:id、英文键、中文名都认。 */
const EMOTION_BY_NAME = new Map<string, Emotion>();
for (const emotion of EMOTIONS) {
  EMOTION_BY_NAME.set(emotion, emotion);
  EMOTION_BY_NAME.set(EMOTION_LABELS[emotion].zh, emotion);
  EMOTION_BY_NAME.set(EMOTION_LABELS[emotion].en, emotion);
}
EMOTION_BY_NAME.set('认真', 'determined');
EMOTION_BY_NAME.set('坚定', 'determined');

/** 一个 `mood` 对象(桌宠事件里的 `{ id, zh, en }`)对应哪个情绪;认不出返回 null。 */
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
  private warn: (message: string, data?: unknown) => void;
  private info: (message: string, data?: unknown) => void;
  private host: WorldHost | null = null;
  /** 已经扫到的事件游标;只读这之后的新事件。 */
  private lastCursor = 0;
  private scanTimer: ReturnType<typeof setInterval> | null = null;
  private readonly popupHost: PopupHost | null;
  /** 桌宠位置来源:截屏识别,失败再读 config.json;没有部署目录时为 null。 */
  private readonly followSource: PetPositionResolver | null;
  private lastFollowWarn: string | null = null;

  constructor(private readonly opts: EmotePicsWorldOptions) {
    this.warn = opts.warn ?? ((message, data) => console.warn(`[emote-pics] ${message}`, data ?? ''));
    this.info = (message, data) => console.info(`[emote-pics] ${message}`, data ?? '');
    this.popupHost = opts.popup ?? (opts.dataDir
      ? new PopupHost({
        profileRoot: join(opts.dataDir, 'emote-pics-popup'),
        logFile: join(opts.dataDir, POPUP_LOG),
        warn: (message, data) => this.warn(message, data),
      })
      : null);
    this.followSource = opts.dataDir || opts.botDir
      ? new PetPositionResolver(
        new PetScreenPositionSource({ log: (message) => this.logFollow(message) }),
        new PetConfigPositionSource({ dataDir: opts.dataDir, botDir: opts.botDir }),
        { log: (message) => this.logFollow(message) },
      )
      : null;
  }

  /** 跟随位置源的诊断:同时进运行日志和弹图日志。 */
  private logFollow(message: string): void {
    this.info(message);
    this.popupHost?.note(message);
  }

  /** 这个 World 不往系统前缀里加任何东西(提示词注入已经删掉)。 */
  envPromptVars(): Record<string, string> | null {
    return null;
  }

  tools(): ToolDef[] {
    return [
      { ...EMOTE_PIC_DECLS[0], handler: async (args) => this.pick(args) },
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
          ? '选一个父文件夹,里面按情绪建子文件夹;改完立即生效,不用重启。'
          : 'Pick one parent folder with one sub-folder per emotion; changes apply at once.',
      }, {
        id: 'popup',
        title: zh ? '弹图' : 'Popup',
        description: zh
          ? '图片弹在桌宠身上,跟着角色走;尺寸、停留与测试都在这一页。'
          : 'Pictures pop on the pet and move with it; size, duration and a test live here.',
      }],
      invoke: async (panel, method, args) => {
        if (panel !== 'folders' && panel !== 'popup') {
          this.warn('WebUI 请求了未注册的面板', { panel });
          throw new Error(`unknown panel: ${panel}`);
        }
        if (method === 'state') return { ok: true, state: resolveConfig(this.opts.cfg) };
        if (method === 'scan') return this.scanFolders();
        if (method === 'setDir') return this.setDir(args);
        if (method === 'setChance') return this.setChance(args);
        if (method === 'setCooldown') return this.setCooldown(args);
        if (method === 'setAutoPopup') return this.setAutoPopup(args);
        if (method === 'setPopup') return this.setPopup(args);
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
    const config = resolveConfig(this.opts.cfg);
    const panelIds = this.webUi('zh').panels?.map((panel) => panel.id).join(', ') ?? '(none)';
    this.info(`面板: ${panelIds}`);
    this.info(`父文件夹: ${config.dir || '(未配置)'}`);
    this.info(`自动弹图: ${config.autoPopup ? 'on' : 'off'}(概率 ${Math.round(config.chance * 100)}%,冷却 ${config.cooldownSeconds} 秒)`);
    this.popupHost?.note(`start: panels ${panelIds}`);
    try {
      this.lastCursor = host.store.latestCursor();
    } catch {
      this.lastCursor = 0;
    }
    this.scanTimer = setInterval(() => this.scanSaid(), SAY_SCAN_MS);
    this.scanTimer.unref?.();
  }

  async stop(): Promise<void> {
    if (this.scanTimer) {
      clearInterval(this.scanTimer);
      this.scanTimer = null;
    }
    this.popupHost?.stop();
    this.followSource?.dispose();
    this.host = null;
    this.warn = (message, data) => console.warn(`[emote-pics] ${message}`, data ?? '');
    this.info = (message, data) => console.info(`[emote-pics] ${message}`, data ?? '');
  }

  /** 每秒扫一次新气泡:带表情标记就自己弹一张,不经过模型。 */
  private scanSaid(): void {
    const host = this.host;
    if (!host) return;
    try {
      const latest = host.store.latestCursor();
      if (latest <= this.lastCursor) return;
      const events = host.store.range({ fromCursor: this.lastCursor + 1, toCursor: latest });
      this.lastCursor = latest;
      for (const event of events) {
        if (event.type !== SAY_EVENT_TYPE) continue;
        const emotion = scriptMoodFromEvent(event);
        if (emotion) this.autoPop(emotion);
      }
    } catch (err) {
      this.warn('读取气泡事件失败,这次不弹', {
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /** 机械弹图:按概率和冷却挑一张,直接弹在桌宠身上。 */
  private autoPop(emotion: Emotion): void {
    const config = resolveConfig(this.opts.cfg);
    if (!config.autoPopup || !config.popup.enabled) return;
    if (config.chance <= 0 || this.random() >= config.chance) return;
    if (this.cooldownLeftMs(emotion, config.cooldownSeconds) > 0) return;
    const folder = this.folderOf(emotion);
    if (!folder) return;
    const images = this.imagesIn(folder);
    if (!images.length) return;
    const chosen = this.pickFrom(emotion, images);
    this.remember(emotion, chosen.name);
    this.lastSent.set(emotion, this.now());
    this.info('自动弹图', { emotion, name: chosen.name });
    this.maybePopup(chosen.path, config.popup);
  }

  private folderOf(emotion: Emotion): string | null {
    const dir = resolveConfig(this.opts.cfg).dir;
    if (!dir) return null;
    for (const name of [emotion, EMOTION_LABELS[emotion].zh]) {
      const full = join(dir, name);
      try {
        if (statSync(full).isDirectory()) return full;
      } catch {
        // 没有这个子文件夹就看下一个名字。
      }
    }
    return null;
  }

  /** 面板「检测到的子文件夹」;只读,不改配置。 */
  private scanFolders(): {
    ok: true;
    dir: string;
    rows: Array<{ emotion: Emotion; zh: string; folder: string; count: number }>;
  } {
    const config = resolveConfig(this.opts.cfg);
    const rows = EMOTIONS.map((emotion) => {
      const folder = this.folderOf(emotion);
      return {
        emotion,
        zh: EMOTION_LABELS[emotion].zh,
        folder: folder ? basename(folder) : '',
        count: folder ? this.imagesIn(folder).length : 0,
      };
    });
    return { ok: true, dir: config.dir, rows };
  }

  private setDir(args: unknown[]): SaveResult {
    const path = String(args[0] ?? '').trim();
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
    this.opts.persist({ dir: path } as DeepPartial<EmotePicsConfigSection>);
    return { ok: true, state: resolveConfig(this.opts.cfg) };
  }

  private setChance(args: unknown[]): SaveResult {
    const value = Number(args[0]);
    if (!Number.isFinite(value)) return { ok: false, error: `概率必须是 0~1 的数字: ${String(args[0] ?? '')}` };
    this.opts.persist({ chance: clampChance(value, 0) } as DeepPartial<EmotePicsConfigSection>);
    return { ok: true, state: resolveConfig(this.opts.cfg) };
  }

  private setCooldown(args: unknown[]): SaveResult {
    const value = Number(args[0]);
    if (!Number.isFinite(value) || value < 0) {
      return { ok: false, error: `冷却秒数必须是不小于 0 的数字: ${String(args[0] ?? '')}` };
    }
    this.opts.persist({ cooldownSeconds: value } as DeepPartial<EmotePicsConfigSection>);
    return { ok: true, state: resolveConfig(this.opts.cfg) };
  }

  private setAutoPopup(args: unknown[]): SaveResult {
    this.opts.persist({ autoPopup: args[0] === true } as DeepPartial<EmotePicsConfigSection>);
    return { ok: true, state: resolveConfig(this.opts.cfg) };
  }

  /** 弹图设置:开关、停留、长边像素、圆角。 */
  private setPopup(args: unknown[]): SaveResult {
    const patch = (args[0] ?? {}) as Record<string, unknown>;
    const next: {
      popupEnabled?: boolean;
      popupDuration?: number;
      popupSize?: number;
      popupRadius?: number;
      popupFollow?: boolean;
    } = {};
    if (patch.enabled !== undefined) next.popupEnabled = patch.enabled === true;
    if (patch.follow !== undefined) next.popupFollow = patch.follow === true;
    if (patch.duration !== undefined) {
      const value = Number(patch.duration);
      if (!Number.isFinite(value) || value < 0.5 || value > 60) {
        return { ok: false, error: `停留时长要在 0.5~60 秒之间: ${String(patch.duration)}` };
      }
      next.popupDuration = value;
    }
    if (patch.size !== undefined) {
      const value = Number(patch.size);
      if (!Number.isFinite(value) || value < 0 || value > 2000) {
        return { ok: false, error: `尺寸要在 0~2000 px 之间(0 = 自动): ${String(patch.size)}` };
      }
      next.popupSize = value === 0 ? 0 : Math.max(80, Math.round(value));
    }
    if (patch.radius !== undefined) {
      const value = Number(patch.radius);
      if (!Number.isFinite(value) || value < 0 || value > 64) {
        return { ok: false, error: `圆角半径要在 0~64 px 之间: ${String(patch.radius)}` };
      }
      next.popupRadius = value;
    }
    this.opts.persist(next as DeepPartial<EmotePicsConfigSection>);
    if (next.popupEnabled === false) this.popupHost?.stop();
    return { ok: true, state: resolveConfig(this.opts.cfg) };
  }

  /** 桌宠气泡接口:部署 config.json 的 worlds.desktop-pet.port,缺省 7797。 */
  private petBubbleUrl(): string {
    let port = 7797;
    try {
      const file = this.opts.dataDir ? join(this.opts.dataDir, '..', 'config.json') : '';
      if (file) {
        const raw = JSON.parse(readFileSync(file, 'utf8')) as {
          worlds?: Record<string, { port?: unknown }>;
        };
        const value = Number(raw.worlds?.['desktop-pet']?.port);
        if (Number.isFinite(value) && value > 0) port = value;
      }
    } catch { /* 读不到就走默认端口 */ }
    return `http://127.0.0.1:${port}/api/image-bubble`;
  }

  /**
   * 把图塞进桌宠身上的气泡;桌宠页面每帧按角色位置摆气泡,所以图会跟着角色走。
   * 桌宠没开或宿主没有这个接口时返回 false,调用方回退到独立窗口。
   */
  private async showInPetBubble(path: string, popup: ResolvedPopup): Promise<boolean> {
    const dataUrl = imageDataUrl(path);
    if (!dataUrl) return false;
    try {
      const res = await fetch(this.petBubbleUrl(), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          dataUrl,
          duration: popup.duration,
          size: popup.size,
          scale: 1,
          radius: popup.radius,
        }),
        signal: AbortSignal.timeout(2500),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /** 从当前配置的表情目录里随机挑一张,按当前设置弹一次。 */
  private async testPopup(): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
    const config = resolveConfig(this.opts.cfg);
    if (!config.dir) return { ok: false, error: '还没有设置父文件夹' };
    const dirs = EMOTIONS.map((emotion) => this.folderOf(emotion)).filter((dir): dir is string => dir !== null);
    if (!dirs.length) {
      return { ok: false, error: `父文件夹里还没有任何一个情绪子文件夹: ${config.dir}` };
    }
    const path = pickRandomImage(dirs);
    if (!path) return { ok: false, error: '子文件夹里没有可用图片(png/jpg/jpeg/gif/webp,单张不超过 5 MB)' };
    const popup = { ...config.popup, enabled: true };
    try {
      if (await this.showInPetBubble(path, popup)) return { ok: true, path };
      if (!this.popupHost) return { ok: false, error: '弹图宿主不可用(缺少部署数据目录)' };
      const follow = await this.followPetX(popup);
      if (!await this.popupHost.show(path, popup, follow)) {
        return { ok: false, error: '弹图窗口没能打开(看运行日志里的 warn)' };
      }
    } catch (err) {
      return { ok: false, error: `弹图失败: ${err instanceof Error ? err.message : String(err)}` };
    }
    return { ok: true, path };
  }

  private async testPopupTool(): Promise<ToolOutcome> {
    const res = await this.testPopup();
    if (res.ok) return { text: `已在桌宠身上弹出测试图: ${res.path}` };
    return { text: `弹图测试失败: ${res.error}`, failed: true };
  }

  private maybePopup(path: string, popup: ResolvedPopup): void {
    void (async () => {
      try {
        if (await this.showInPetBubble(path, popup)) return;
        const follow = await this.followPetX(popup);
        await this.popupHost?.show(path, popup, follow);
      } catch (err) {
        this.warn('弹图失败,不影响其它', {
          path,
          err: err instanceof Error ? err.message : String(err),
        });
      }
    })();
  }

  /** 每次回退到独立窗口前读一次桌宠位置;不在跟随、读不到或超时就返回 undefined(退回固定位置)。 */
  private async followPetX(popup: ResolvedPopup): Promise<PopupFollow | undefined> {
    if (!popup.follow) return undefined;
    const resolver = this.followSource;
    if (!resolver) return undefined;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const timeout = new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), 6000);
      timer.unref?.();
    });
    const result: PetPositionResult | null = await Promise.race([resolver.read(), timeout]);
    if (timer) clearTimeout(timer);
    if (result?.ok) {
      this.lastFollowWarn = null;
      return {
        petX: result.petX,
        side: 'auto',
        gap: 20,
        offsetY: 20,
        block: result.block,
        stripTop: result.stripTop,
        estimatedBlockW: result.estimatedBlockW,
      };
    }
    const reason = result ? result.reason : '读位置超时';
    if (reason !== this.lastFollowWarn) {
      this.lastFollowWarn = reason;
      this.warn('跟随桌宠位置不可用,退回固定位置', { reason });
    }
    return undefined;
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
      logPath: this.opts.dataDir ? join(this.opts.dataDir, POPUP_LOG) : null,
    };
  }

  private pick(args: Record<string, unknown>): ToolOutcome {
    const config = resolveConfig(this.opts.cfg);
    const requested = String(args.emotion ?? '').trim();
    if (!isEmotion(requested)) {
      return fail(`emotion 只接受 ${EMOTIONS.join('、')} 之一;收到 "${requested}"。`);
    }
    if (!config.dir) return fail('还没有设置父文件夹。到「对话表情包」面板里选一个。');
    const folder = this.folderOf(requested);
    if (!folder) {
      return fail(`没有找到 ${requested} 的子文件夹;把图放进父文件夹下的「${requested}」里。`);
    }
    const images = this.imagesIn(folder);
    if (!images.length) {
      return fail(`${basename(folder)} 里没有可用图片(只收 png/jpg/jpeg/gif/webp,每张不超过 5 MB)。`);
    }

    if (args.force !== true) {
      const chance = config.chance;
      if (chance <= 0) return this.skip(requested, 'chance', chance, '概率 0%');
      const roll = this.random();
      if (roll >= chance) {
        return this.skip(requested, 'chance', chance, `概率 ${Math.round(chance * 100)}%,掷骰 ${roll.toFixed(3)}`);
      }
      const left = this.cooldownLeftMs(requested, config.cooldownSeconds);
      if (left > 0) {
        return this.skip(requested, 'cooldown', chance,
          `刚发过一张,冷却还剩 ${Math.ceil(left / 1000)} 秒(间隔 ${config.cooldownSeconds} 秒)`);
      }
    }

    const chosen = this.pickFrom(requested, images);
    let bytes: Uint8Array;
    try {
      bytes = readFileSync(chosen.path);
    } catch (err) {
      return fail(`读取 ${chosen.path} 失败: ${err instanceof Error ? err.message : String(err)}`);
    }

    this.remember(requested, chosen.name);
    this.lastSent.set(requested, this.now());
    if (config.popup.enabled) this.maybePopup(chosen.path, config.popup);
    return {
      text: `已选 ${requested}:${chosen.name}(${bytes.byteLength} 字节,${chosen.mime},概率 ${Math.round(config.chance * 100)}%)\n`
        + `path=${chosen.path}\n`
        + '句柄在下一行 [blob …] 里,把它填进 pet_say 的 images。',
      blobs: [{ bytes, mime: chosen.mime, name: chosen.name, fallbackText: `原路径 ${chosen.path}` }],
    };
  }

  /** 跳过不是错误:回执里带 `{skipped, reason, chance}`,不带附件。 */
  private skip(emotion: Emotion, reason: SkipReason, chance: number, detail: string): ToolOutcome {
    const payload = JSON.stringify({ skipped: true, reason, chance });
    return {
      text: `[skipped] ${payload}\n${emotion} 这次不出图:${detail}。不是错误,是故意跳过。`,
    };
  }

  /** 从候选里挑一张,尽量避开最近发过的三张。 */
  private pickFrom(emotion: Emotion, images: Array<{ name: string; path: string; mime: string }>): {
    name: string;
    path: string;
    mime: string;
  } {
    const recent = this.recent.get(emotion) ?? [];
    let pool = images.filter((image) => !recent.includes(image.name));
    if (!pool.length) pool = images.filter((image) => image.name !== recent[recent.length - 1]);
    if (!pool.length) pool = images;
    return pool[randomInt(pool.length)]!;
  }

  private cooldownLeftMs(emotion: Emotion, cooldownSeconds: number): number {
    if (cooldownSeconds <= 0) return 0;
    const last = this.lastSent.get(emotion);
    if (last === undefined) return 0;
    return Math.max(0, cooldownSeconds * 1000 - (this.now() - last));
  }

  /** 文件夹里合格的图片(单层;只收常见格式、不超过 5 MiB)。 */
  private imagesIn(folder: string): Array<{ name: string; path: string; mime: string }> {
    let names: string[];
    try {
      names = readdirSync(folder);
    } catch {
      return [];
    }
    const out: Array<{ name: string; path: string; mime: string }> = [];
    for (const name of names) {
      if (name.startsWith('.')) continue;
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
