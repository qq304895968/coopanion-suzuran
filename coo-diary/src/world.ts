/**
 * 日记 World:五个工具(写、读、列、回想画、回想深刻瞬间)、一条挂载事件、一条到点提醒,以及进 system 前缀的环境描述。
 * 日记目录与提醒都在调用时现读 `worlds.diary`,不缓存。
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ToolDef, ToolOutcome, World, WorldHost, WorldWebUiDecl } from 'cortico/core/types.ts';
import type { Language } from 'cortico/core/language.ts';
import { nowIso } from 'cortico/core/util.ts';
import { diaryConfigGroup, type DiaryConfigSection } from './config.ts';
import {
  ART_RATINGS, artFolder, artTime, artsOnDate, copyArtIntoDiary, findArt, loadArtIndex,
  markdownForArt, ratingLabel, readArtBytes, type ArtEntry, type ArtRating,
} from './art.ts';
import {
  copyMomentIntoDiary, findMoment, loadMoments, momentBlock, momentTime, momentsOnDate,
  readMomentBytes, type ScreenMoment,
} from './moment.ts';
import {
  TIME_PATTERN, appendEntry, countEntries, diaryRoot, isRealDate, listEntries, partsIn, readEntry, weekdayIn,
} from './store.ts';

const ENV_PROMPT_FILE = fileURLToPath(new URL('./ENV_PROMPT.md', import.meta.url));

/** 提醒的检查间隔:每次现读部署时区里的时钟,配置改了下一拍就生效。 */
const TICK_MS = 30_000;

/** 在系统文件管理器里打开目录;打不开就算了,客户端还有「复制路径」兜底。 */
function openInFileManager(dir: string): void {
  // 官方 Coopanion 0.2.17 不处理 companion:open-folder；process.send 的布尔值
  // 只反映 IPC 的发送/队列状态，不能证明打开成功，也不能据此跳过系统命令。
  if (process.platform === 'win32') {
    // 请求资源管理器 COM 打开；实际窗口是否可见仍取决于交互桌面。
    const ps = join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
    const escaped = dir.replace(/'/g, "''");
    const script = `$shell = New-Object -ComObject Shell.Application; $shell.ShellExecute('${escaped}', '', '', 'open', 1)`;
    const child = spawn(ps, ['-NoProfile', '-NonInteractive', '-Command', script], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });
    child.on('error', () => {});
    child.unref();
    return;
  }
  const command = process.platform === 'darwin' ? 'open' : 'xdg-open';
  const child = spawn(command, [dir], {
    detached: true,
    stdio: 'ignore',
  });
  child.on('error', () => {});
  child.unref();
}

export interface DiaryWorldOptions {
  /** `worlds.diary` 的活引用。 */
  cfg: DiaryConfigSection;
  timezone: string;
  /** 部署目录:从这里读 config.json 的 `worlds.draw.saveDir`(兼容旧 `worlds.pet-draw.saveDir`)。 */
  botDir?: string;
  /** 部署数据目录:画画插件没设 saveDir 时,画夹默认在 `<dataDir>/pet-draw`。 */
  dataDir?: string;
  /** 测试注入:打开目录;缺省用资源管理器 / open / xdg-open。 */
  openPath?: (dir: string) => void;
}

/** 全部工具的声明;定义里的 describe 与 `tools()` 都取它。 */
export const DIARY_TOOL_DECLS: ReadonlyArray<Omit<ToolDef, 'handler'>> = [
  {
    name: 'diary_write',
    description:
      '把一篇日记追加到当天文件(<YYYY-MM-DD>.md)末尾。文件不存在时新建并写日期标题。已有内容一律不覆盖。回执给出文件名、日期与当天第几篇。想引用画画插件里的画时,先用 diary_art 看 id,再把 id 填进 arts:图会复制进日记的 images/<日期>/ 并在正文末尾用 Markdown 引用。想写「看一眼」留下的深刻瞬间时,先用 diary_moment 看 id,再把 id 填进 moments;截图同样会复制进日记。',
    tags: ['write'],
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        text: { type: 'string', description: '日记正文,Markdown。用第一人称写具体的事和当时的心情。' },
        date: { type: 'string', description: '要写的日期 YYYY-MM-DD;省略时是部署时区的今天。' },
        time: { type: 'string', description: '这一篇的时刻 HH:mm;省略时今天写就用此刻,补写往日写「补记」。' },
        mood: { type: 'string', description: '一个词的心情,写在标题里;省略时标题只有时刻。' },
        arts: {
          type: 'array',
          items: { type: 'string' },
          description: '要引用进这篇日记的画 id(来自 diary_art 或 pet_draw 回执)。每张会复制进 images/<日期>/ 并在正文末尾加一行 Markdown 图片。',
        },
        includeDayArt: {
          type: 'boolean',
          description: 'true 时把这个日期当天画过的画全部引用进来(和 arts 合并去重)。默认 false。',
        },
        moments: {
          type: 'array',
          items: { type: 'string' },
          description: '要写进这篇日记的「深刻瞬间」id(来自 diary_moment 或 screen_memories)。截图会复制进 images/<日期>/ 并写成一段引用。',
        },
        includeMemorable: {
          type: 'boolean',
          description: 'true 时把这个日期所有的深刻瞬间都写进来(和 moments 合并去重)。默认 false。',
        },
      },
      required: ['text'],
    },
  },
  {
    name: 'diary_read',
    description:
      '读回日记原文。给 date 读那一天;不给 date 时按 days 读最近几篇(按日期从新到旧挑,跳过没写的天)。回执最多带 maxChars 字,超出部分截断并说明。',
    tags: ['read'],
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        date: { type: 'string', description: '读这一天,YYYY-MM-DD。' },
        days: { type: 'integer', minimum: 1, maximum: 60, description: '不给 date 时读最近几篇,缺省 1。' },
        maxChars: { type: 'integer', minimum: 500, maximum: 40000, description: '回执最多带回多少字,缺省 8000。' },
      },
    },
  },
  {
    name: 'diary_list',
    description:
      '列出日记目录里哪些天有日记,按日期从新到旧。每条给出当天的篇数与字数,用来决定读哪几天。',
    tags: ['read'],
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        from: { type: 'string', description: '只看这天及以后,YYYY-MM-DD。' },
        to: { type: 'string', description: '只看这天及以前,YYYY-MM-DD。' },
        limit: { type: 'integer', minimum: 1, maximum: 200, description: '最多列多少天,缺省 30。' },
      },
    },
  },
  {
    name: 'diary_art',
    description:
      '回想某一天画过的画:从画画插件的画夹索引里按日期列出 id、时刻、评价和画的主题,可选把图作为附件交回来,方便看着画写日记。默认看今天。要把画引用进日记,把 id 填进 diary_write 的 arts;要把当天所有画都收进去,用 includeDayArt: true。',
    tags: ['read'],
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        date: { type: 'string', description: '看哪一天,YYYY-MM-DD;省略时是部署时区的今天。' },
        rating: {
          type: 'string',
          enum: ['all', ...ART_RATINGS],
          description: '只看某种评价;默认 all。',
        },
        limit: { type: 'integer', minimum: 1, maximum: 20, description: '最多列几张,缺省 8。' },
        attach: { type: 'boolean', description: '是否把图作为附件交回来(最多 4 张);默认 true。' },
      },
    },
  },
  {
    name: 'diary_moment',
    description:
      '回想某一天「看一眼」留下的深刻瞬间(桌宠用 screen_rate 打到阈值以上的屏幕画面):列出 id、时刻、分数、摘要和原图绝对路径,可选把原图作为附件交回来。默认今天。要把这一刻写进日记,把 id 填进 diary_write 的 moments;想把这一刻画下来,调用 pet_draw 时带 purpose: "diary",把原图路径填进 referencePath,不要用关键词搜图。',
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

const isEmpty = (value: string | undefined): boolean => value === undefined || value.trim() === '';

function fail(text: string): ToolOutcome {
  return { text, failed: true };
}

function reasonOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function clampInt(value: unknown, minimum: number, maximum: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.round(value)));
}

function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const rest = text.length - maxChars;
  return `${text.slice(0, maxChars)}\n\n…(后面还有 ${rest} 字没带回;缩小范围,或把 maxChars 调大)`;
}

const UI_TEXT = {
  zh: {
    label: '日记',
    lamp: '日记目录',
    notSet: '还没设置,工具会提示去填',
    promptTitle: '日记 · 环境提示词',
    promptDescription: '日记 World 进 system 前缀的那一段。',
    dirVar: '日记目录的绝对路径,此刻的值。',
    todayVar: '部署时区的今天与星期。',
    statusVar: '今天的日记状态,此刻的事实。',
    artVar: '今天画过的画与画夹状态,供 diary_art 与 diary_write 引用。',
    momentVar: '今天「看一眼」留下的深刻瞬间数量。',
    folderTitle: '日记目录',
    folderDescription: '当前日记目录和今天的文件;可以直接在资源管理器里打开。',
  },
  en: {
    label: 'Diary',
    lamp: 'Diary directory',
    notSet: 'not set; the tools ask for one',
    promptTitle: 'Diary · environment prompt',
    promptDescription: 'The section this World adds to the system prefix.',
    dirVar: 'The diary directory, as configured right now.',
    todayVar: 'Today and the weekday in the deployment timezone.',
    statusVar: 'The state of today\u2019s diary, right now.',
    artVar: 'Drawings made today and the drawing folder, for diary_art and diary_write.',
    momentVar: 'How many memorable “Glance” moments were kept today.',
    folderTitle: 'Diary folder',
    folderDescription: 'The current diary folder; open it in your file manager.',
  },
};

export interface DiaryFolderInfo {
  path: string;
  assigned: boolean;
  exists: boolean;
  today: string;
  todayFile: boolean;
  error?: string;
}

export class DiaryWorld implements World {
  readonly id = 'diary';

  private host: WorldHost | null = null;
  private ticker: NodeJS.Timeout | null = null;
  /** 已经提醒过的那一天,避免一天催多次。 */
  private remindedOn = '';

  constructor(private readonly options: DiaryWorldOptions) {}

  /** 只报值;前缀文本一律来自 ENV_PROMPT.md 模板。 */
  envPromptVars(): Record<string, string> {
    const cfg = this.options.cfg;
    const clock = partsIn(this.options.timezone);
    const dir = cfg.dir.trim();
    let status = '还没设置目录';
    if (dir) {
      try {
        const text = readEntry(dir, clock.date);
        status = text === null ? '今天还没写' : `今天写了 ${countEntries(text)} 篇`;
      } catch (error) {
        status = `目录不可用:${reasonOf(error)}`;
      }
    }
    let art = '今天还没画';
    try {
      const folder = artFolder(this.options.botDir, this.options.dataDir);
      if (folder) {
        const entries = loadArtIndex(folder);
        const count = artsOnDate(entries, this.options.timezone, clock.date).length;
        if (count > 0) art = `今天画过 ${count} 张`;
      }
    } catch (error) {
      art = `画夹读不了:${reasonOf(error)}`;
    }
    let memorable = '今天还没有';
    try {
      const count = momentsOnDate(loadMoments(this.options.dataDir), this.options.timezone, clock.date).length;
      if (count > 0) memorable = `今天 ${count} 个`;
    } catch (error) {
      memorable = `读不了:${reasonOf(error)}`;
    }
    return {
      'diary.dir': dir || '(未设置)',
      'diary.today': `${clock.date} ${clock.weekday}`,
      'diary.status': status,
      'diary.art': art,
      'diary.moments': memorable,
    };
  }

  tools(): ToolDef[] {
    return [this.writeTool(), this.readTool(), this.listTool(), this.artTool(), this.momentTool()];
  }

  webUi(language: Language = 'zh'): WorldWebUiDecl {
    const t = language === 'en' ? UI_TEXT.en : UI_TEXT.zh;
    const dir = this.options.cfg.dir.trim();
    return {
      label: t.label,
      config: [diaryConfigGroup(language)],
      lamps: [{ label: t.lamp, state: dir ? 'online' : 'offline', hint: dir || t.notSet }],
      panels: [{
        id: 'folder',
        title: t.folderTitle,
        description: t.folderDescription,
        // 浏览器用隐藏 iframe 发 GET;GET 路由只放行这里列出的方法。
        getMethods: ['open'],
      }],
      invoke: async (panel, method) => {
        if (panel !== 'folder') throw new Error(`unknown panel: ${panel}`);
        if (method === 'info') return this.folderInfo();
        if (method === 'open') return this.openFolder();
        throw new Error(`unknown method: ${method}`);
      },
      promptDocs: [
        {
          key: 'worlds.diary.envPrompt',
          title: t.promptTitle,
          description: t.promptDescription,
          path: ENV_PROMPT_FILE,
          role: 'envPrompt',
          vars: [
            { name: 'diary.dir', description: t.dirVar },
            { name: 'diary.today', description: t.todayVar },
            { name: 'diary.status', description: t.statusVar },
            { name: 'diary.art', description: t.artVar },
            { name: 'diary.moments', description: t.momentVar },
          ],
        },
      ],
    };
  }

  private folderInfo(): DiaryFolderInfo {
    const clock = partsIn(this.options.timezone);
    const raw = this.options.cfg.dir.trim();
    if (!raw) {
      return { path: '', assigned: false, exists: false, today: clock.date, todayFile: false };
    }
    try {
      const root = diaryRoot(raw);
      const exists = existsSync(root);
      // 只 stat 文件,不把整篇日记读进内存。
      const todayFile = exists ? existsSync(join(root, `${clock.date}.md`)) : false;
      return { path: root, assigned: true, exists, today: clock.date, todayFile };
    } catch (error) {
      return {
        path: raw,
        assigned: true,
        exists: false,
        today: clock.date,
        todayFile: false,
        error: reasonOf(error),
      };
    }
  }

  private openFolder(): { ok: boolean; path: string; error?: string } {
    const info = this.folderInfo();
    if (!info.assigned) {
      return { ok: false, path: '', error: '日记目录还没设置。请先在「日记」配置里填一个绝对路径。' };
    }
    if (info.error) return { ok: false, path: info.path, error: info.error };

    try {
      const root = diaryRoot(this.options.cfg.dir);
      if (!existsSync(root)) mkdirSync(root, { recursive: true });
      (this.options.openPath ?? openInFileManager)(root);
      return { ok: true, path: root };
    } catch (error) {
      return { ok: false, path: info.path, error: reasonOf(error) };
    }
  }

  async start(host: WorldHost): Promise<void> {
    this.host = host;
    this.remindedOn = '';
    this.ticker = setInterval(() => { void this.remind(); }, TICK_MS);
    this.ticker.unref?.();
    await host.pushEvent({
      type: 'diary.started',
      ts: nowIso(this.options.timezone),
      source: this.id,
      origin: 'internal',
      senderKey: this.id,
      text: this.options.cfg.dir.trim() ? '日记 World 已挂载,diary_write / diary_read / diary_list / diary_art / diary_moment 可用。' : '日记 World 已挂载,但还没设置目录。',
    });
  }

  async stop(): Promise<void> {
    if (this.ticker) clearInterval(this.ticker);
    this.ticker = null;
    this.host = null;
  }

  private writeTool(): ToolDef {
    return {
      ...DIARY_TOOL_DECLS[0]!,
      handler: async (args) => {
        const cfg = this.options.cfg;
        const clock = partsIn(this.options.timezone);
        const date = typeof args.date === 'string' && !isEmpty(args.date) ? args.date.trim() : clock.date;
        if (!isRealDate(date)) return fail(`date 要写成 YYYY-MM-DD 的真实日期,收到「${date}」。`);
        const given = typeof args.time === 'string' ? args.time.trim() : '';
        if (given && !TIME_PATTERN.test(given)) return fail(`time 要写成 HH:mm,收到「${given}」。`);
        const stamp = given || (date === clock.date ? clock.time : '补记');
        const weekday = weekdayIn(this.options.timezone, date);
        const text = typeof args.text === 'string' ? args.text : '';
        const includeDayArt = args.includeDayArt === true;
        const includeMemorable = args.includeMemorable === true;
        const wanted: string[] = [];
        if (Array.isArray(args.arts)) {
          for (const value of args.arts) {
            if (typeof value === 'string' && value.trim() && !wanted.includes(value.trim())) wanted.push(value.trim());
          }
        }
        const wantedMoments: string[] = [];
        if (Array.isArray(args.moments)) {
          for (const value of args.moments) {
            if (typeof value === 'string' && value.trim() && !wantedMoments.includes(value.trim())) wantedMoments.push(value.trim());
          }
        }
        try {
          const root = diaryRoot(cfg.dir);
          const copied: Array<{ art: ArtEntry; path: string }> = [];
          let artNote = '';
          if (wanted.length || includeDayArt) {
            const folder = artFolder(this.options.botDir, this.options.dataDir);
            if (!folder) return fail('没有找到画画插件的画夹,不能引用画。先确认画画 World 已安装并启用。');
            const entries = loadArtIndex(folder);
            const missing = wanted.filter((id) => !findArt(entries, id));
            if (missing.length) {
              return fail(`画夹里没有这些画 id:${missing.join('、')}。先用 diary_art 看今天的画,或先用 pet_draw 画一张,不要编造 id。`);
            }
            const chosen: ArtEntry[] = [];
            const seen = new Set<string>();
            for (const id of wanted) {
              const art = findArt(entries, id)!;
              if (seen.has(art.id)) continue;
              seen.add(art.id);
              chosen.push(art);
            }
            if (includeDayArt) {
              for (const art of artsOnDate(entries, this.options.timezone, date)) {
                if (seen.has(art.id)) continue;
                seen.add(art.id);
                chosen.push(art);
              }
            }
            if (chosen.length > 20) return fail(`一次最多引用 20 张画,现在有 ${chosen.length} 张。分开写或减少 arts。`);
            for (const art of chosen) {
              copied.push({ art, path: copyArtIntoDiary(art, root, date) });
            }
            if (!chosen.length) artNote = '\n这天画夹里没有画,没有引用。';
          }

          const copiedMoments: Array<{ moment: ScreenMoment; path: string }> = [];
          let momentNote = '';
          if (wantedMoments.length || includeMemorable) {
            const entries = loadMoments(this.options.dataDir);
            const missing = wantedMoments.filter((id) => !findMoment(entries, id));
            if (missing.length) {
              return fail(`没有找到这些深刻瞬间:${missing.join('、')}。先用 diary_moment 看今天的瞬间,不要编造 id。`);
            }
            const chosen: ScreenMoment[] = [];
            const seen = new Set<string>();
            for (const id of wantedMoments) {
              const moment = findMoment(entries, id)!;
              if (seen.has(moment.id)) continue;
              seen.add(moment.id);
              chosen.push(moment);
            }
            if (includeMemorable) {
              for (const moment of momentsOnDate(entries, this.options.timezone, date)) {
                if (seen.has(moment.id)) continue;
                seen.add(moment.id);
                chosen.push(moment);
              }
            }
            if (chosen.length > 10) return fail(`一篇日记最多写 10 个深刻瞬间,现在有 ${chosen.length} 个。分开写或减少 moments。`);
            for (const moment of chosen) {
              copiedMoments.push({ moment, path: copyMomentIntoDiary(moment, root, date) });
            }
            if (!chosen.length) momentNote = '\n这天没有留下深刻瞬间。';
          }

          const blocks: string[] = [];
          if (text.trim()) blocks.push(text.trimEnd());
          blocks.push(...copiedMoments.map(({ moment, path }) => momentBlock(moment, path)));
          const artLines = copied.map(({ art, path }) => markdownForArt(path, art.subject));
          if (artLines.length) blocks.push(artLines.join('\n'));
          const result = appendEntry({
            dir: cfg.dir,
            date,
            weekday,
            stamp,
            mood: typeof args.mood === 'string' ? args.mood : undefined,
            body: blocks.join('\n\n'),
          });
          const citations: string[] = [];
          if (copiedMoments.length) {
            citations.push(`记录了 ${copiedMoments.length} 个深刻瞬间:${copiedMoments.map(({ moment }) => moment.id).join('、')}(截图复制到 images/${date}/)。`);
          } else if (momentNote) {
            citations.push(momentNote.trim());
          }
          if (copied.length) {
            citations.push(`引用了 ${copied.length} 张画:${copied.map(({ art }) => art.id).join('、')}(复制到 images/${date}/)。`);
          } else if (artNote) {
            citations.push(artNote.trim());
          }
          const cited = citations.length ? `\n${citations.join('\n')}` : '';
          return `已写入 ${basename(result.file)}(${date} ${weekday},${stamp}),当天第 ${result.index} 篇。${cited}`;
        } catch (error) {
          return fail(reasonOf(error));
        }
      },
    };
  }

  private readTool(): ToolDef {
    return {
      ...DIARY_TOOL_DECLS[1]!,
      handler: async (args) => {
        const cfg = this.options.cfg;
        const maxChars = clampInt(args.maxChars, 500, 40_000, 8_000);
        try {
          if (typeof args.date === 'string' && !isEmpty(args.date)) {
            const date = args.date.trim();
            const text = readEntry(cfg.dir, date);
            return text === null ? `${date} 没有日记。` : truncate(text, maxChars);
          }
          const days = clampInt(args.days, 1, 60, 1);
          const summaries = listEntries(cfg.dir, { limit: days });
          if (!summaries.length) return '日记目录里还没有日记。';
          const blocks: string[] = [];
          for (const summary of [...summaries].reverse()) {
            const text = readEntry(cfg.dir, summary.date);
            if (text !== null) blocks.push(text.trimEnd());
          }
          if (!blocks.length) return '这几天没有可读的日记。';
          return truncate(blocks.join('\n\n---\n\n'), maxChars);
        } catch (error) {
          return fail(reasonOf(error));
        }
      },
    };
  }

  private listTool(): ToolDef {
    return {
      ...DIARY_TOOL_DECLS[2]!,
      handler: async (args) => {
        const cfg = this.options.cfg;
        const from = typeof args.from === 'string' && !isEmpty(args.from) ? args.from.trim() : undefined;
        const to = typeof args.to === 'string' && !isEmpty(args.to) ? args.to.trim() : undefined;
        for (const [name, value] of [['from', from], ['to', to]] as const) {
          if (value !== undefined && !isRealDate(value)) return fail(`${name} 要写成 YYYY-MM-DD 的真实日期,收到「${value}」。`);
        }
        const limit = clampInt(args.limit, 1, 200, 30);
        try {
          const summaries = listEntries(cfg.dir, { from, to, limit });
          if (!summaries.length) return '日记目录里还没有日记。';
          const lines = summaries.map((s) => `${s.date}  ${s.entries} 篇  ${s.chars} 字`);
          const more = summaries.length >= limit ? `(只列了最近 ${limit} 天,可能还有更早的)` : '';
          return `${lines.join('\n')}\n\n共 ${summaries.length} 天${more}。`;
        } catch (error) {
          return fail(reasonOf(error));
        }
      },
    };
  }

  private artTool(): ToolDef {
    return {
      ...DIARY_TOOL_DECLS[3]!,
      handler: async (args) => {
        const clock = partsIn(this.options.timezone);
        const date = typeof args.date === 'string' && !isEmpty(args.date) ? args.date.trim() : clock.date;
        if (!isRealDate(date)) return fail(`date 要写成 YYYY-MM-DD 的真实日期,收到「${date}」。`);
        const ratingRaw = typeof args.rating === 'string' && args.rating.trim() ? args.rating.trim() : 'all';
        if (ratingRaw !== 'all' && !(ART_RATINGS as readonly string[]).includes(ratingRaw)) {
          return fail(`rating 只能是 all / ${ART_RATINGS.join(' / ')},收到「${ratingRaw}」。`);
        }
        const rating = ratingRaw as ArtRating | 'all';
        const limit = clampInt(args.limit, 1, 20, 8);
        const attach = args.attach !== false;
        const folder = artFolder(this.options.botDir, this.options.dataDir);
        if (!folder) return fail('没有找到画画插件的画夹。先确认画画 World 已安装并启用。');
        let entries: ArtEntry[];
        try {
          entries = loadArtIndex(folder);
        } catch (error) {
          return fail(reasonOf(error));
        }
        const list = artsOnDate(entries, this.options.timezone, date)
          .filter((art) => rating === 'all' || art.rating === rating)
          .slice(0, limit);
        if (!list.length) {
          const scope = rating === 'all' ? '' : `(${ratingLabel(rating)})`;
          return {
            text: `${date} ${scope}还没有画过画。想给日记配一张新画,先调用 pet_draw(带 purpose: "diary";如果绘画 World 开着),再把回执里的 id 填进 diary_write 的 arts。画夹:${folder.dir}`,
          };
        }
        const lines = list.map((art) => {
          const note = art.note ? ` · 备注:${art.note}` : '';
          return `- ${art.id} · ${artTime(art, this.options.timezone)} · ${ratingLabel(art.rating)} · ${art.subject}${note}`;
        });
        const blobs: Array<{ bytes: Uint8Array; mime: string; name: string; fallbackText: string }> = [];
        let attachNote = '';
        if (attach) {
          const wanted = list.slice(0, 4);
          for (const art of wanted) {
            try {
              const read = readArtBytes(art);
              blobs.push({
                bytes: read.bytes,
                mime: read.mime,
                name: read.name,
                fallbackText: `画夹里的画:${art.subject}(${art.width}×${art.height},${art.style})`,
              });
            } catch {
              // 单张读不了就跳过,不影响列表。
            }
          }
          if (blobs.length) {
            attachNote = `\n图在附件里${list.length > blobs.length ? `(只附了前 ${blobs.length} 张,要别的给 id 或用 limit)` : ''}。`;
          }
        }
        const header = `${date} 画过 ${list.length} 张(画夹:${folder.dir}):`;
        const hint = '要引用哪张,把 id 填进 diary_write 的 arts;想把这一天所有画都收进去,用 includeDayArt: true。';
        const drawHint = '想配一张新画,先调用 pet_draw(带 purpose: "diary";如果绘画 World 开着),再把回执里的 id 填进 diary_write 的 arts。';
        return {
          text: [header, ...lines, '', hint, drawHint].join('\n') + attachNote,
          ...(blobs.length ? { blobs } : {}),
        };
      },
    };
  }

  private momentTool(): ToolDef {
    return {
      ...DIARY_TOOL_DECLS[4]!,
      handler: async (args) => {
        const clock = partsIn(this.options.timezone);
        const date = typeof args.date === 'string' && !isEmpty(args.date) ? args.date.trim() : clock.date;
        if (!isRealDate(date)) return fail(`date 要写成 YYYY-MM-DD 的真实日期,收到「${date}」。`);
        const limit = clampInt(args.limit, 1, 20, 8);
        const attach = args.attach !== false;
        let entries: ScreenMoment[];
        try {
          entries = loadMoments(this.options.dataDir);
        } catch (error) {
          return fail(reasonOf(error));
        }
        const list = momentsOnDate(entries, this.options.timezone, date).slice(0, limit);
        if (!list.length) {
          return {
            text: `${date} 还没有留下深刻瞬间。看一眼后让 Coo 用 screen_rate 给那一帧打分,达到阈值就会出现在这里。`,
          };
        }
        const lines: string[] = [`${date} 有 ${list.length} 个深刻瞬间:`];
        for (const moment of list) {
          lines.push(`- ${moment.id} · ${momentTime(moment, this.options.timezone)} · ${moment.score}/10 · ${moment.summary || '(没有摘要)'}`);
          lines.push(`  原图:${moment.absPath}`);
        }
        lines.push('');
        lines.push('写进日记:把 id 填进 diary_write 的 moments;想把这一刻画下来,调用 pet_draw 时带 purpose: "diary",把原图路径填进 referencePath,不要用关键词搜图。');
        const blobs: Array<{ bytes: Uint8Array; mime: string; name: string; fallbackText: string }> = [];
        if (attach) {
          for (const moment of list.slice(0, 4)) {
            try {
              const read = readMomentBytes(moment);
              blobs.push({
                bytes: read.bytes,
                mime: read.mime,
                name: read.name,
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

  /** 到了提醒时刻、今天还没有日记时推一条事实事件;一天最多一次。 */
  private async remind(): Promise<void> {
    const cfg = this.options.cfg;
    const host = this.host;
    if (!host || !cfg.reminderEnabled) return;
    if (!TIME_PATTERN.test(cfg.reminderTime)) return;
    const clock = partsIn(this.options.timezone);
    if (this.remindedOn === clock.date || clock.time < cfg.reminderTime) return;
    this.remindedOn = clock.date;
    try {
      if (readEntry(cfg.dir, clock.date) !== null) return;
    } catch {
      return;
    }
    await host.pushEvent({
      type: 'diary.reminder',
      ts: nowIso(this.options.timezone),
      source: this.id,
      origin: 'internal',
      senderKey: this.id,
      text: `${clock.date} ${clock.weekday} 的日记还没写。`,
    });
  }
}
