/**
 * 看一眼 World:全局热键 → 侧车抓当前这一帧 → 事件带图进上下文。
 * 另外两种触发:用户直接说"看一眼"(screen_look 工具),以及桌宠自己想看(定时主动抓)。
 *
 * Cortico World 是 Node 进程,拿不到全局热键也抓不了屏,所以真正的抓屏在
 * `sidecar/screen_sidecar.py` 里(和 qq-final 的 asr_sidecar 同一套路):
 * 本 World 拉起侧车、长轮询 `/wait`、把回来的 PNG 当事件附件推上去。
 *
 * 配置改了不用重启插件:每两秒比对一次签名,变了就重启侧车。
 *
 * 事件按 external 落库:屏幕上是别人的内容,可能是网页上的提示注入,不能当内部指令。
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import type { RunPhase, ToolDef, ToolOutcome, World, WorldHost, WorldWebUiDecl } from 'cortico/core/types.ts';
import type { Language } from 'cortico/core/language.ts';
import { nowIso } from 'cortico/core/util.ts';
import { monitorLabel, screenConfigGroup, type ScreenConfigSection } from './config.ts';
import { parseHotkey } from './hotkey.ts';
import { MomentStore, type MomentSource, type ScreenMoment } from './moments.ts';
import { clockIn, inQuietHours, parseQuietHours, shouldGlance } from './schedule.ts';

const SIDECAR = fileURLToPath(new URL('../sidecar/screen_sidecar.py', import.meta.url));
const ENV_PROMPT_FILE = fileURLToPath(new URL('./ENV_PROMPT.md', import.meta.url));

/** 长轮询一次等多久;侧车那边上限 120s。 */
const WAIT_SECONDS = 25;
const WAIT_TIMEOUT_MS = 35_000;
/** 观察配置变化与主动看一眼的节拍。 */
const TICK_MS = 2_000;
/** 侧车意外退出后的重拉间隔;用完就认输,不再骚扰。 */
const RELAUNCH_DELAYS_MS = [2_000, 5_000, 15_000];
const KEEP_FRAMES = 5;
/** 人多久没碰键鼠就算"不在",别对着空屏说话。 */
const MAX_IDLE_MS = 3 * 60_000;
/** 桌宠的触摸事件:desktop-pet 世界每戳一下发一条,带真实时间戳。 */
const PET_TOUCH = 'desktop-pet.touch';
/** 两次触摸间隔小于这个值算双击。 */
const DOUBLE_CLICK_MS = 450;
/** 事件库的轮询间隔。要快于双击窗口的一半,不然两次点击会落在同一拍里。 */
const TOUCH_POLL_MS = 120;

export interface ScreenWorldOptions {
  /** `worlds.screen` 的活引用。 */
  cfg: ScreenConfigSection;
  timezone: string;
  /** 部署数据目录;截图落在这里,不给就落到系统临时目录。 */
  dataDir?: string;
}

/** 侧车回给我们的那一帧。字段全部按不可信处理。 */
export interface SidecarFrame {
  ok: boolean;
  seq?: number;
  empty?: boolean;
  path?: string;
  width?: number;
  height?: number;
  bytes?: number;
  monitor?: string;
  ts?: string;
  ms?: number;
  error?: string;
}

export const SCREEN_TOOL_DECLS: ReadonlyArray<Omit<ToolDef, 'handler'>> = [
  {
    name: 'screen_look',
    description:
      '现在抓一帧用户当前的屏幕,图会随回执交回来。用户没按热键、但明确让你"看一眼屏幕"时用它;'
      + '热键截图和主动看都会自己作为事件到达,不需要再调用它。抓不到时回执会说明原因(比如侧车没起来、显示器被 DRM 挡住)。',
    tags: ['read'],
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        question: {
          type: 'string',
          description: '你想在这帧上确认什么;会附在回执里,省得再问一遍。',
        },
      },
    },
  },
  {
    name: 'screen_rate',
    description:
      '给刚看到的一帧打 1–10 分,并写一句摘要。分数达到配置的阈值就记成「深刻瞬间」,原图会留给日记引用,也可以让 pet_draw 用 referencePath 照着画;没到阈值的图会删掉。每看一帧评一次,不要为了多记而抬分。省略 id 时评最近一张还没评分的截图。',
    tags: ['write'],
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        id: { type: 'string', description: '事件或 screen_look 回执里的截图 id(形如 m-...),省略时评最近一张未评分的。' },
        score: { type: 'integer', minimum: 1, maximum: 10, description: '印象分。1–3 平常或看不清,5 有点意思,8 以上才值得记住、画下来。' },
        summary: { type: 'string', description: '一句话说清这一帧是什么、为什么值得记;会写进日记。' },
        note: { type: 'string', description: '可选的补充,记录当时的感受或上下文。' },
      },
      required: ['score', 'summary'],
    },
  },
  {
    name: 'screen_memories',
    description:
      '回想某一天印象深刻的瞬间:列 id、时刻、分数、摘要和原图绝对路径,可选把原图作为附件交回来。默认今天。写日记时把 id 填进 diary_write 的 moments;想让绘画照着原图画,把原图路径填进 pet_draw 的 referencePath。',
    tags: ['read'],
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        date: { type: 'string', description: '看哪一天,YYYY-MM-DD;省略时是部署时区的今天。' },
        limit: { type: 'integer', minimum: 1, maximum: 20, description: '最多列几个,缺省 8。' },
        attach: { type: 'boolean', description: '是否把原图作为附件交回来(最多 4 张);默认 true。' },
      },
    },
  },
];

function fail(text: string): ToolOutcome {
  return { text, failed: true };
}

function reasonOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isRealDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number) as [number, number, number];
  const probe = new Date(Date.UTC(year, month - 1, day));
  return probe.getUTCFullYear() === year && probe.getUTCMonth() === month - 1 && probe.getUTCDate() === day;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    timer.unref?.();
  });
}

type Status = 'off' | 'starting' | 'ready' | 'error';

export class ScreenWorld implements World {
  readonly id = 'screen';

  private readonly options: ScreenWorldOptions;
  private host: WorldHost | null = null;
  private proc: ChildProcess | null = null;
  private port = 0;
  private seq = 0;
  private status: Status = 'off';
  private statusText = '还没启动';
  private lastShot = '';
  private stopped = false;
  private relaunchIndex = 0;
  private readonly framesDir: string;
  private readonly moments: MomentStore;

  /** 配置签名:热键、显示器、反馈这些要传给侧车的东西变了就重启它。 */
  private appliedSig = '';
  private badHotkey = '';
  private restarting = false;

  /** 主动看一眼。 */
  private timer: NodeJS.Timeout | null = null;
  private runPhase: RunPhase['state'] = 'idle';
  /** 正在抓(主动看、双击都算),同一时刻只抓一次。 */
  private capturing = false;
  private glanceDay = '';
  private glanceCount = 0;
  private lastGlanceAt = 0;
  private lastShotAt = 0;
  private glanceNote = '还没主动看过';

  /** 双击桌宠:监听事件库里的 desktop-pet.touch。 */
  private touchTimer: NodeJS.Timeout | null = null;
  private touchCursor = 0;
  private lastTouchAt = 0;

  constructor(options: ScreenWorldOptions) {
    this.options = options;
    const root = join(options.dataDir ?? tmpdir(), 'coo-screen');
    this.framesDir = join(root, 'frames');
    this.moments = new MomentStore(root, options.timezone);
  }

  private threshold(): number {
    const value = Math.trunc(Number(this.options.cfg.memorableScore));
    return Number.isFinite(value) ? Math.max(1, Math.min(10, value)) : 8;
  }

  private todayMemorable(): number {
    const day = clockIn(this.options.timezone).date;
    return this.moments.countMemorable(day);
  }

  // ------------------------------------------------------------------ 契约 //

  envPromptVars(): Record<string, string> {
    const cfg = this.options.cfg;
    return {
      'screen.hotkey': cfg.hotkey.trim() || '(没设热键,只靠双击桌宠)',
      'screen.monitor': monitorLabel(cfg.monitor),
      'screen.status': this.statusText,
      'screen.last': this.lastShot || '还没截过',
      'screen.proactive': cfg.proactive
        ? `开着(最短 ${cfg.proactiveEveryMinutes} 分钟一次,今天已看 ${this.glanceCount} 次,上限 ${cfg.proactiveDailyQuota})`
        : '关着,只有用户按热键或开口时才看',
      'screen.threshold': String(this.threshold()),
      'screen.memorable': this.todayMemorable() > 0 ? `今天 ${this.todayMemorable()} 个` : '今天还没有',
    };
  }

  tools(): ToolDef[] {
    return [this.lookTool(), this.rateTool(), this.memoriesTool()];
  }

  /** 主模型忙的时候别让桌宠插嘴。 */
  onRunPhase(phase: RunPhase): void {
    this.runPhase = phase.state;
  }

  webUi(language: Language = 'zh'): WorldWebUiDecl {
    const en = language === 'en';
    const cfg = this.options.cfg;
    return {
      label: en ? 'Glance' : '看一眼',
      lamps: [
        {
          label: en ? 'Sidecar' : '抓屏侧车',
          state: this.status === 'ready' ? 'online' : this.status === 'error' ? 'error' : this.status === 'starting' ? 'loading' : 'offline',
          hint: this.statusText,
        },
      ],
      badges: [
        { label: en ? 'Trigger' : '触发', value: cfg.hotkey.trim() ? cfg.hotkey : (en ? 'double-click' : '双击'), tone: 'plain' },
        {
          label: en ? 'Self-initiated' : '主动看',
          value: cfg.proactive ? `${this.glanceCount}/${cfg.proactiveDailyQuota}` : (en ? 'off' : '关'),
          tone: cfg.proactive ? 'on' : 'off',
        },
        {
          label: en ? 'Memorable' : '深刻瞬间',
          value: String(this.todayMemorable()),
          tone: this.todayMemorable() > 0 ? 'on' : 'plain',
        },
      ],
      config: [screenConfigGroup(language)],
      promptDocs: [
        {
          key: 'worlds.screen.envPrompt',
          title: en ? 'Glance · environment prompt' : '看一眼 · 环境提示词',
          description: en
            ? 'Tells the bot when a screenshot event arrives and what to do with it.'
            : '告诉 Coo:什么时候会有截图事件、收到之后该怎么处理。',
          path: ENV_PROMPT_FILE,
          role: 'envPrompt',
          vars: [
            { name: 'screen.hotkey', description: en ? 'The configured hotkey.' : '当前配置的热键。' },
            { name: 'screen.monitor', description: en ? 'Which screen gets captured.' : '抓的是哪块屏。' },
            { name: 'screen.status', description: en ? 'Sidecar state.' : '侧车当前状态。' },
            { name: 'screen.last', description: en ? 'When the last shot was taken.' : '最近一次截图的时间与尺寸。' },
            { name: 'screen.proactive', description: en ? 'Whether the pet peeks on its own.' : '桌宠会不会自己看一眼。' },
            { name: 'screen.threshold', description: en ? 'The memorable-moment score threshold.' : '深刻瞬间的分数线。' },
            { name: 'screen.memorable', description: en ? 'How many memorable moments were kept today.' : '今天留下了几个深刻瞬间。' },
          ],
        },
      ],
      storage: [
        {
          key: 'frames',
          label: en ? 'Captured frames on disk' : '磁盘上的截图',
          kind: 'disk',
          location: this.framesDir,
          note: en
            ? 'Deletes the PNGs the sidecar left on disk. Images already inside a session context are not affected.'
            : '删掉侧车落在磁盘上的 PNG;已经进过 session 上下文的图不受影响。',
          stat: () => {
            try {
              const n = readdirSync(this.framesDir).filter((f) => f.endsWith('.png')).length;
              return en ? `${n} files` : `${n} 个文件`;
            } catch {
              return en ? 'empty' : '空';
            }
          },
          clear: async () => {
            await rm(this.framesDir, { recursive: true, force: true });
            await mkdir(this.framesDir, { recursive: true });
            return en ? 'Captured frames deleted' : '已清空磁盘上的截图';
          },
        },
        {
          key: 'moments',
          label: en ? 'Memorable moments' : '深刻瞬间',
          kind: 'disk',
          location: this.moments.dir(),
          note: en
            ? 'Deletes the kept screenshots and their index. Diary entries that already copied an image keep their own copy.'
            : '删掉留下的截图和索引;已经复制进日记的图不受影响。',
          stat: () => (en ? `${this.todayMemorable()} today` : `今天 ${this.todayMemorable()} 个`),
          clear: () => {
            this.moments.clear();
            return en ? 'Memorable moments deleted' : '已清空深刻瞬间';
          },
        },
      ],
    };
  }

  async start(host: WorldHost): Promise<void> {
    this.host = host;
    this.stopped = false;
    this.relaunchIndex = 0;
    await mkdir(this.framesDir, { recursive: true });
    this.appliedSig = this.signature();
    // 刚挂上别立刻开口:第一次自己看一眼排到一个间隔之后(至少一分钟),
    // 免得每次重开 Coopanion 都先冒一句。
    const interval = Math.max(1, this.options.cfg.proactiveEveryMinutes) * 60_000;
    this.lastGlanceAt = Date.now() - Math.max(0, interval - 60_000);
    this.launch();
    this.timer = setInterval(() => { void this.tick(); }, TICK_MS);
    this.timer.unref?.();
    this.syncTouchWatch();
    try {
      await host.pushEvent({
        type: 'screen.shot',
        ts: nowIso(this.options.timezone),
        source: this.id,
        origin: 'internal',
        senderKey: this.id,
        text: `看一眼 World 已挂载。${this.describeTrigger()}会把当前这一屏( ${monitorLabel(this.options.cfg.monitor)} )交给你看。`
          + '看完后用 screen_rate 给这一帧打分;达到阈值的会记成今天的深刻瞬间。'
          + (this.options.cfg.proactive ? '你也开着"自己看一眼",会按节奏主动抓。' : ''),
      });
    } catch (error) {
      host.log.warn('screen: started 事件推送失败', { error: reasonOf(error) });
    }
  }

  async stop(): Promise<void> {
    this.stopped = true;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.touchTimer) clearInterval(this.touchTimer);
    this.touchTimer = null;
    this.status = 'off';
    this.statusText = '已停止';
    await this.killSidecar();
    this.host = null;
  }

  // ------------------------------------------------------------------ 侧车 //

  private signature(): string {
    const c = this.options.cfg;
    return JSON.stringify([c.python, c.hotkey, c.monitor, c.maxEdge, c.feedback, c.sound]);
  }

  private url(path: string): string {
    return `http://127.0.0.1:${this.port}${path}`;
  }

  /** 每两秒跑一次:配置变了重启侧车,顺手看看该不该主动看一眼。 */
  private async tick(): Promise<void> {
    if (this.stopped) return;
    this.reconcile();
    this.syncTouchWatch();
    await this.maybeGlance();
  }

  private reconcile(): void {
    const sig = this.signature();
    if (sig === this.appliedSig) return;
    const cfg = this.options.cfg;
    // 空热键是合法的:只靠双击触发,侧车就不注册热键。
    if (cfg.hotkey.trim()) {
      try {
        parseHotkey(cfg.hotkey);
      } catch (error) {
        // 热键写成残句就保留正在用的那个,别把能用的侧车重启掉。
        if (this.badHotkey !== cfg.hotkey) {
          this.badHotkey = cfg.hotkey;
          void this.announce(`热键「${cfg.hotkey}」不能用:${reasonOf(error)}。还在用的热键没变。`);
        }
        return;
      }
    }
    this.badHotkey = '';
    this.appliedSig = sig;
    void this.restart();
  }

  private async restart(): Promise<void> {
    if (this.restarting) return;
    this.restarting = true;
    try {
      await this.killSidecar();
      if (!this.stopped) this.launch();
    } catch (error) {
      this.onFatal(`重启侧车失败:${reasonOf(error)}`);
    } finally {
      this.restarting = false;
    }
  }

  private async killSidecar(): Promise<void> {
    const proc = this.proc;
    const port = this.port;
    this.proc = null;
    this.port = 0;
    if (!proc) return;
    if (port) {
      try {
        await fetch(`http://127.0.0.1:${port}/quit`, { method: 'POST', signal: AbortSignal.timeout(2_000) });
      } catch {
        // 已经死了就往下走。
      }
    }
    if (proc.exitCode === null && proc.signalCode === null) {
      await new Promise<void>((resolve) => {
        const timer = setTimeout(() => {
          proc.kill();
          resolve();
        }, 1_500);
        timer.unref?.();
        proc.once('exit', () => {
          clearTimeout(timer);
          resolve();
        });
      });
    }
  }

  private launch(): void {
    const cfg = this.options.cfg;
    const python = cfg.python.trim() || (process.platform === 'win32' ? 'python' : 'python3');
    const args = [
      SIDECAR,
      '--port', '0',
      '--hotkey', cfg.hotkey,
      '--monitor', cfg.monitor,
      '--max-edge', String(cfg.maxEdge),
      '--feedback', cfg.feedback,
      '--sound', cfg.sound,
      '--frames-dir', this.framesDir,
      '--keep', String(KEEP_FRAMES),
    ];
    this.status = 'starting';
    this.statusText = '侧车启动中';

    let proc: ChildProcess;
    try {
      proc = spawn(python, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (error) {
      this.onFatal(`拉不起 ${python}:${reasonOf(error)}`);
      return;
    }
    this.proc = proc;

    proc.on('error', (error) => {
      this.onFatal(`拉不起 ${python}:${reasonOf(error)}`);
    });

    if (proc.stderr) {
      proc.stderr.setEncoding('utf8');
      proc.stderr.on('data', (chunk: string) => {
        const text = chunk.trim();
        if (text) this.host?.log.warn('screen sidecar stderr', { text: text.slice(0, 2_000) });
      });
    }

    if (proc.stdout) {
      const lines = createInterface({ input: proc.stdout });
      let announced = false;
      lines.on('line', (line) => {
        if (announced) return; // 第一行讲端口,后面不再关心
        const text = line.trim();
        if (!text.startsWith('{')) return;
        announced = true;
        let info: { port?: unknown; hotkey?: unknown; monitor?: unknown; hotkeyError?: unknown };
        try {
          info = JSON.parse(text);
        } catch {
          this.onFatal('侧车启动信息不是合法 JSON');
          return;
        }
        if (typeof info.port !== 'number' || !Number.isInteger(info.port)) {
          this.onFatal('侧车没有报端口');
          return;
        }
        this.port = info.port;
        this.status = 'ready';
        this.statusText = `侧车就绪,热键 ${String(info.hotkey ?? cfg.hotkey)}`;
        this.relaunchIndex = 0;
        if (typeof info.hotkeyError === 'string' && info.hotkeyError) {
          this.status = 'error';
          this.statusText = info.hotkeyError;
          void this.announce(`热键 ${cfg.hotkey} 注册失败:${info.hotkeyError}。换一个键就行,改完两秒内生效。`);
        }
        void this.poll();
      });
    }

    proc.once('exit', (code, signal) => {
      if (this.proc === proc) this.proc = null;
      if (this.stopped || this.restarting) return;
      this.port = 0;
      this.status = 'error';
      this.statusText = `侧车退出了(code ${code ?? 'null'}${signal ? `, ${signal}` : ''})`;
      const delay = RELAUNCH_DELAYS_MS[this.relaunchIndex];
      if (delay === undefined) {
        void this.announce('抓屏侧车反复退出,已经不再重试。检查 Python 是否可用,或在 World 页把截图热键改一下。');
        return;
      }
      this.relaunchIndex += 1;
      setTimeout(() => {
        if (!this.stopped) this.launch();
      }, delay).unref?.();
    });
  }

  /** 起不来 / 反复退出:记状态并让 Coo 知道,不抛。 */
  private onFatal(message: string): void {
    this.status = 'error';
    this.statusText = message;
    this.host?.log.warn('screen: 侧车问题', { message });
    void this.announce(message);
  }

  private async announce(message: string): Promise<void> {
    const host = this.host;
    if (!host || this.stopped) return;
    try {
      await host.pushEvent({
        type: 'screen.shot',
        ts: nowIso(this.options.timezone),
        source: this.id,
        origin: 'internal',
        senderKey: this.id,
        text: `[看一眼] ${message}`,
      }, { trigger: 'flush' });
    } catch {
      // 推送失败不改变侧车状态。
    }
  }

  // ------------------------------------------------------------------ 轮询 //

  private async poll(): Promise<void> {
    while (!this.stopped) {
      const proc = this.proc;
      if (!proc || !this.port) return;
      try {
        const res = await fetch(this.url(`/wait?after=${this.seq}&timeout=${WAIT_SECONDS}`), {
          signal: AbortSignal.timeout(WAIT_TIMEOUT_MS),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const frame = (await res.json()) as SidecarFrame;
        if (this.stopped) return;
        if (frame.empty) continue;
        if (typeof frame.seq === 'number' && Number.isInteger(frame.seq)) this.seq = frame.seq;
        await this.ingest(frame);
      } catch (error) {
        if (this.stopped || this.proc !== proc) return;
        // 侧车刚起来时偶尔 ECONNREFUSED,隔一下再来;真死了 exit 处理器会重拉。
        this.host?.log.debug('screen: 长轮询失败', { error: reasonOf(error) });
        await sleep(1_000);
      }
    }
  }

  private async ingest(frame: SidecarFrame): Promise<void> {
    const host = this.host;
    if (!host || this.stopped) return;

    if (!frame.ok || typeof frame.path !== 'string') {
      await this.announce(`按了热键,但没抓到屏:${frame.error ?? '原因不明'}。`);
      return;
    }

    const cfg = this.options.cfg;
    const width = typeof frame.width === 'number' ? frame.width : 0;
    const height = typeof frame.height === 'number' ? frame.height : 0;
    const monitor = typeof frame.monitor === 'string' ? frame.monitor : '显示器不明';

    const bytes = await this.takeFile(frame.path);
    this.lastShotAt = Date.now();

    const prompt = cfg.prompt.trim();
    const head = `[看一眼] 用户按下了 ${cfg.hotkey}。这是那一刻的屏幕:${width}×${height},${monitor}。`;
    const text = prompt ? `${head}\n${prompt}` : head;
    if (bytes) this.lastShot = `${this.stamp()} ${width}×${height}`;
    await this.pushShot(host, text, bytes, width, height, monitor, 'hotkey');
  }

  private async pushShot(
    host: WorldHost,
    text: string,
    bytes: Uint8Array | null,
    width: number,
    height: number,
    monitor: string,
    source: MomentSource,
  ): Promise<void> {
    let moment: ScreenMoment | null = null;
    if (bytes) {
      try {
        moment = this.moments.save(bytes, { source, width, height, monitor });
      } catch (error) {
        this.host?.log.warn('screen: 截图落盘失败', { error: reasonOf(error) });
      }
    }
    const ratedText = moment
      ? `${text}\n截图 id：${moment.id}。看完后用 screen_rate 给这一帧打分。`
      : text;
    try {
      await host.pushEvent({
        type: 'screen.shot',
        ts: nowIso(this.options.timezone),
        source: this.id,
        origin: 'external',
        senderKey: this.id,
        text: ratedText,
        ...(bytes
          ? {
            blobs: [{
              bytes,
              mime: 'image/png',
              name: 'screen.png',
              fallbackText: `屏幕截图 ${width}×${height}(${monitor})`,
            }],
          }
          : {}),
      }, { trigger: 'flush' });
    } catch (error) {
      this.host?.log.warn('screen: 截图事件推送失败', { error: reasonOf(error) });
    }
  }

  private async takeFile(path: string): Promise<Uint8Array | null> {
    let bytes: Uint8Array | null = null;
    try {
      bytes = await readFile(path);
    } catch (error) {
      this.host?.log.warn('screen: 读截图文件失败', { path, error: reasonOf(error) });
    }
    await rm(path, { force: true }).catch(() => undefined);
    return bytes;
  }

  private stamp(): string {
    return new Date().toLocaleTimeString('zh-CN', { hour12: false });
  }

  /** 给人和模型看的一句话:现在靠什么触发。 */
  private describeTrigger(): string {
    const cfg = this.options.cfg;
    const parts: string[] = [];
    if (cfg.hotkey.trim()) parts.push(`按 ${cfg.hotkey}`);
    if (cfg.doubleClick !== false) parts.push('双击桌宠');
    if (!parts.length) return '暂时没有触发方式(热键和双击都关着)';
    return parts.join(' 或 ');
  }

  // -------------------------------------------------------------- 主动看一眼 //

  private async maybeGlance(): Promise<void> {
    const cfg = this.options.cfg;
    if (!cfg.proactive || this.capturing || this.status !== 'ready' || !this.port) return;

    const clock = clockIn(this.options.timezone);
    if (this.glanceDay !== clock.date) {
      this.glanceDay = clock.date;
      this.glanceCount = 0;
    }
    // 先挡掉显然不该看的,免得每两秒都去问一次"人在不在"。
    if (this.glanceCount >= cfg.proactiveDailyQuota) {
      this.glanceNote = `今天主动看过的次数用完了(${cfg.proactiveDailyQuota})`;
      return;
    }
    const interval = Math.max(1, cfg.proactiveEveryMinutes) * 60_000;
    if (this.lastGlanceAt && Date.now() - this.lastGlanceAt < interval) {
      this.glanceNote = `距上次主动看还不够 ${cfg.proactiveEveryMinutes} 分钟`;
      return;
    }
    const quiet = inQuietHours(parseQuietHours(cfg.proactiveQuiet), clock.minutes);
    if (quiet) {
      this.glanceNote = '在安静时段';
      return;
    }
    const idleMs = await this.probeIdle();
    const decision = shouldGlance({
      enabled: cfg.proactive,
      ready: this.status === 'ready',
      modelBusy: this.runPhase !== 'idle',
      todayCount: this.glanceCount,
      dailyQuota: cfg.proactiveDailyQuota,
      nowMs: Date.now(),
      lastGlanceMs: this.lastGlanceAt,
      lastShotMs: this.lastShotAt,
      everyMinutes: cfg.proactiveEveryMinutes,
      idleMs,
      maxIdleMs: MAX_IDLE_MS,
      quiet,
    });
    if (!decision.ok) {
      this.glanceNote = decision.reason;
      return;
    }

    this.capturing = true;
    try {
      const frame = await this.capture();
      if (!frame.ok || typeof frame.path !== 'string') {
        this.glanceNote = `抓屏失败:${frame.error ?? '原因不明'}`;
        await this.announce(`自己想看一眼,但没抓到屏:${frame.error ?? '原因不明'}。`);
        return;
      }
      const width = typeof frame.width === 'number' ? frame.width : 0;
      const height = typeof frame.height === 'number' ? frame.height : 0;
      const monitor = typeof frame.monitor === 'string' ? frame.monitor : '显示器不明';
      const bytes = await this.takeFile(frame.path);
      const host = this.host;
      if (!host) return;

      this.glanceCount += 1;
      this.lastGlanceAt = Date.now();
      this.lastShotAt = Date.now();
      this.glanceNote = `刚自己看了一眼(${width}×${height})`;
      this.lastShot = `${this.stamp()} ${width}×${height}`;

      const note = cfg.proactiveNote.trim();
      const head = `[看一眼] 这次不是用户按的:是你自己刚才起意,想看一眼他在干什么(每 ${cfg.proactiveEveryMinutes} 分钟最多一次,今天这是第 ${this.glanceCount} 次)。这是此刻的屏幕:${width}×${height},${monitor}。`;
      await this.pushShot(host, note ? `${head}\n${note}` : head, bytes, width, height, monitor, 'proactive');
    } catch (error) {
      this.glanceNote = `主动看一下失败:${reasonOf(error)}`;
      this.host?.log.warn('screen: 主动看一眼失败', { error: reasonOf(error) });
    } finally {
      this.capturing = false;
    }
  }

  private async probeIdle(): Promise<number> {
    if (!this.port) return 0;
    try {
      const res = await fetch(this.url('/idle'), { signal: AbortSignal.timeout(3_000) });
      if (!res.ok) return 0;
      const body = (await res.json()) as { idleMs?: unknown };
      return typeof body.idleMs === 'number' ? body.idleMs : 0;
    } catch {
      return 0; // 读不到就当人在,免得一直不敢开口
    }
  }

  // -------------------------------------------------------------- 双击桌宠 //

  /**
   * 双击不是我们监听鼠标:桌宠的点击由 desktop-pet 世界发成 `desktop-pet.touch` 事件,
   * 我们只读事件库,两条靠得很近就算双击。这样不用挂钩子,也不用去猜桌宠身体在屏幕哪块。
   */
  private syncTouchWatch(): void {
    // 老配置里没有这个键 → 当作开(默认就是开),只有显式 false 才关。
    const want = this.options.cfg.doubleClick !== false && !!this.host?.store && !this.stopped;
    if (want && !this.touchTimer) {
      const store = this.host!.store;
      this.touchCursor = store.latestCursor(); // 只认挂上之后的点击
      this.lastTouchAt = 0;
      this.touchTimer = setInterval(() => this.scanTouches(), TOUCH_POLL_MS);
      this.touchTimer.unref?.();
      return;
    }
    if (!want && this.touchTimer) {
      clearInterval(this.touchTimer);
      this.touchTimer = null;
    }
  }

  private scanTouches(): void {
    const store = this.host?.store;
    if (!store || this.stopped) return;
    let latest: number;
    try {
      latest = store.latestCursor();
    } catch {
      return;
    }
    if (latest <= this.touchCursor) return;
    const from = this.touchCursor + 1;
    this.touchCursor = latest;
    let events: ReturnType<typeof store.range>;
    try {
      events = store.range({ fromCursor: from, toCursor: latest });
    } catch {
      return;
    }
    for (const event of events) {
      if (event.type !== PET_TOUCH) continue;
      const at = Date.parse(event.ts);
      if (Number.isFinite(at)) this.onTouch(at, event.meta);
    }
  }

  /**
   * 桌宠戳一下发一条 `desktop-pet.touch`,meta 里带 `{kind, count}`。
   * 双击有两种可能:两条 count=1 的挨得很近,或者桌宠自己把连击并成一条 count=2 —— 两条路都认。
   */
  private onTouch(at: number, meta: unknown): void {
    const touch = (meta as { touch?: { kind?: unknown; count?: unknown } } | undefined)?.touch;
    const kind = typeof touch?.kind === 'string' ? touch.kind : '';
    const count = typeof touch?.count === 'number' && touch.count > 0 ? touch.count : 1;
    // 摸、拎起来甩、落地这些不算;认不出 kind 时保守地当戳。
    if (kind && kind !== 'poke') return;
    if (count >= 2) {
      this.lastTouchAt = 0;
      void this.doubleClicked();
      return;
    }
    const previous = this.lastTouchAt;
    this.lastTouchAt = at;
    if (!previous || at - previous > DOUBLE_CLICK_MS) return;
    this.lastTouchAt = 0; // 三连击只算一次
    void this.doubleClicked();
  }

  private async doubleClicked(): Promise<void> {
    if (this.capturing || this.stopped) return;
    const host = this.host;
    if (!host) return;
    this.capturing = true;
    try {
      // 带 feedback:侧车先响一声再抓,抓完冒提示。
      const frame = await this.capture(true);
      if (!frame.ok || typeof frame.path !== 'string') {
        await this.announce(`双击了桌宠,但没抓到屏:${frame.error ?? '原因不明'}。`);
        return;
      }
      const width = typeof frame.width === 'number' ? frame.width : 0;
      const height = typeof frame.height === 'number' ? frame.height : 0;
      const monitor = typeof frame.monitor === 'string' ? frame.monitor : '显示器不明';
      const bytes = await this.takeFile(frame.path);
      this.lastShotAt = Date.now();
      if (bytes) this.lastShot = `${this.stamp()} ${width}×${height}`;
      const prompt = this.options.cfg.prompt.trim();
      const head = `[看一眼] 用户双击了你的身体(桌宠),要你看一眼屏幕。这是那一刻的画面:${width}×${height},${monitor}。`;
      await this.pushShot(host, prompt ? `${head}\n${prompt}` : head, bytes, width, height, monitor, 'double');
    } catch (error) {
      this.host?.log.warn('screen: 双击抓屏失败', { error: reasonOf(error) });
    } finally {
      this.capturing = false;
    }
  }

  // ------------------------------------------------------------------ 工具 //

  private async capture(feedback = false): Promise<SidecarFrame> {
    if (!this.port) throw new Error(this.statusText || '侧车还没起来');
    const path = feedback ? '/trigger?feedback=1' : '/trigger';
    const res = await fetch(this.url(path), { method: 'POST', signal: AbortSignal.timeout(20_000) });
    if (!res.ok) throw new Error(`侧车回了 HTTP ${res.status}`);
    return (await res.json()) as SidecarFrame;
  }

  private lookTool(): ToolDef {
    return {
      ...SCREEN_TOOL_DECLS[0]!,
      handler: async (args) => {
        let frame: SidecarFrame;
        try {
          frame = await this.capture();
        } catch (error) {
          return fail(`抓屏失败:${reasonOf(error)}。`);
        }
        if (!frame.ok || typeof frame.path !== 'string') {
          return fail(`抓屏失败:${frame.error ?? '原因不明'}。`);
        }
        const width = typeof frame.width === 'number' ? frame.width : 0;
        const height = typeof frame.height === 'number' ? frame.height : 0;
        const monitor = typeof frame.monitor === 'string' ? frame.monitor : '显示器不明';
        const bytes = await this.takeFile(frame.path);
        if (!bytes) return fail('抓到了但读不出来。');
        this.lastShotAt = Date.now();
        this.lastShot = `${this.stamp()} ${width}×${height}`;
        let moment: ScreenMoment | null = null;
        try {
          moment = this.moments.save(bytes, { source: 'tool', width, height, monitor });
        } catch (error) {
          this.host?.log.warn('screen: 截图落盘失败', { error: reasonOf(error) });
        }
        const question = typeof args.question === 'string' ? args.question.trim() : '';
        const idLine = moment
          ? `\n截图 id：${moment.id}。原图:${this.moments.pathOf(moment)}。看完后用 screen_rate 打分;想照着画就把这个原图路径交给 pet_draw。`
          : '';
        return {
          text: `刚抓的一帧:${width}×${height},${monitor}。${question ? `\n想确认的:${question}` : ''}${idLine}`,
          blobs: [{
            bytes,
            mime: 'image/png',
            name: 'screen.png',
            fallbackText: `屏幕截图 ${width}×${height}(${monitor})`,
          }],
        };
      },
    };
  }

  private rateTool(): ToolDef {
    return {
      ...SCREEN_TOOL_DECLS[1]!,
      handler: async (args) => {
        const score = typeof args.score === 'number' && Number.isFinite(args.score)
          ? Math.trunc(args.score)
          : Number.NaN;
        if (!Number.isFinite(score) || score < 1 || score > 10) {
          return fail(`score 要给 1–10 的整数,收到「${String(args.score)}」。`);
        }
        const summary = typeof args.summary === 'string' ? args.summary.replace(/\s+/g, ' ').trim() : '';
        if (!summary) return fail('summary 要一句话说清这一帧是什么、为什么值得记。');
        const id = typeof args.id === 'string' && args.id.trim() ? args.id.trim() : '';
        const target = id ? this.moments.get(id) : this.moments.latestUnrated();
        if (!target) {
          return fail(id
            ? `没有找到截图 ${id};可能已经被清理,或者 id 写错了。`
            : '现在没有待打分的截图。等下一次「看一眼」事件,或先用 screen_look 抓一帧。');
        }
        let result;
        try {
          result = this.moments.rate(
            target.id,
            score,
            summary,
            this.threshold(),
            typeof args.note === 'string' ? args.note : undefined,
          );
        } catch (error) {
          return fail(`记录评分失败:${reasonOf(error)}。`);
        }
        if (!result) return fail(`没有找到截图 ${target.id},没有记下评分。`);
        const path = this.moments.pathOf(result.moment);
        const head = `记下了 ${result.moment.id}:${result.moment.score}/10(阈值 ${result.threshold})`;
        if (!result.memorable) {
          return {
            text: `${head}——还不到深刻瞬间,不写进日记;这张图不留了。`,
          };
        }
        return {
          text: [
            `${head}——算今天的深刻瞬间,原图留下了。`,
            `摘要:${result.moment.summary}`,
            `原图:${path}`,
            '写日记时用 diary_moment 挑出来,再把 id 填进 diary_write 的 moments。',
            `想照着这张图画,调用 pet_draw 时把 referencePath 填成上面这个原图路径;不要用 referenceName / referenceQuery 搜关键词。`,
          ].join('\n'),
        };
      },
    };
  }

  private memoriesTool(): ToolDef {
    return {
      ...SCREEN_TOOL_DECLS[2]!,
      handler: async (args) => {
        const day = typeof args.date === 'string' && args.date.trim()
          ? args.date.trim()
          : clockIn(this.options.timezone).date;
        if (!isRealDate(day)) {
          return fail(`date 要写成 YYYY-MM-DD 的真实日期,收到「${day}」。`);
        }
        const limit = typeof args.limit === 'number' && Number.isFinite(args.limit)
          ? Math.max(1, Math.min(20, Math.trunc(args.limit)))
          : 8;
        const attach = args.attach !== false;
        let list: ScreenMoment[];
        try {
          list = this.moments.list({ date: day, limit, memorableOnly: true });
        } catch (error) {
          return fail(`读深刻瞬间失败:${reasonOf(error)}。`);
        }
        if (!list.length) {
          return {
            text: `${day} 还没有印象深刻的瞬间。看完一帧后用 screen_rate 打 1–10 分,达到 ${this.threshold()} 分才会留下。`,
          };
        }
        const lines: string[] = [`${day} 有 ${list.length} 个深刻瞬间:`];
        for (const moment of list) {
          lines.push(`- ${moment.id} · ${clockIn(this.options.timezone, new Date(moment.createdAt)).time} · ${moment.score}/10 · ${moment.summary}`);
          lines.push(`  原图:${this.moments.pathOf(moment)}`);
        }
        lines.push('');
        lines.push('写日记时把 id 填进 diary_write 的 moments;想让绘画照着原图画,把原图路径填进 pet_draw 的 referencePath,不要用关键词搜图。');
        const blobs: Array<{ bytes: Uint8Array; mime: string; name: string; fallbackText: string }> = [];
        if (attach) {
          for (const moment of list.slice(0, 4)) {
            try {
              const found = this.moments.read(moment.id);
              if (!found) continue;
              blobs.push({
                bytes: found.bytes,
                mime: found.mime,
                name: `${moment.id}.png`,
                fallbackText: `深刻瞬间:${moment.summary}(${moment.score}/10)`,
              });
            } catch {
              // 单张读不了就跳过。
            }
          }
          if (blobs.length) {
            lines.push(`图在附件里${list.length > blobs.length ? `(只附了前 ${blobs.length} 张)` : ''}。`);
          }
        }
        return { text: lines.join('\n'), ...(blobs.length ? { blobs } : {}) };
      },
    };
  }
}
