/**
 * 明日方舟 World：集成战略的本地资料 + 对局账本 + 提醒。
 *
 * 不读游戏进程、不主动截屏、不联网。对局进展只来自操作者通过工具报告的内容；
 * 操作者发来的黑流树海截图由模型读成节点坐标，World 只做拓扑归一化、匹配和 BFS。
 * 事件文案只说 World 能确认的事实（谁在第几层、记了什么），不做游戏判断。
 */
import { fileURLToPath } from 'node:url';
import type { PushOptions, ToolDef, World, WorldHost, WorldWebUiDecl } from 'cortico/core/types.ts';
import { nowIso } from 'cortico/core/util.ts';
import { ARKNIGHTS_CONFIG_GROUP, type ArknightsConfigSection } from './config.ts';
import {
  dataSummary,
  describeFloor,
  findItem,
  formatItem,
  formatPool,
  hasBlackstreamData,
  nodeDistanceMeta,
  nodeTypeAtDistance,
  nodeTypeDistances,
  nodeTypeNames,
  nodeTypeShare,
  poolsWithItem,
  searchPools,
} from './blackstream.ts';
import {
  adviceFor,
  dataGeneratedAt,
  findOperator,
  findTheme,
  formatOperator,
  formatTheme,
  formatTip,
  isData,
  operatorCount,
  phaseForFloor,
  searchOperators,
  searchThemes,
  searchTips,
} from './knowledge.ts';
import { ArknightsStore, type Reminder, type RunOutcome, type RunState } from './store.ts';
import { nextStepAdvice, nudgeText, rankShopOffers } from './proactive.ts';
import {
  describeEnds,
  distanceOn,
  formatScan,
  hasTopologyData,
  scanTopology,
  topologySummary,
  type ScanNode,
  type ScanResult,
} from './blackstream-topology.ts';

const ENV_PROMPT_FILE = fileURLToPath(new URL('./ENV_PROMPT.md', import.meta.url));

export interface ArknightsWorldOptions {
  /** `worlds.arknights` 的活引用。 */
  cfg: ArknightsConfigSection;
  timezone: string;
  dataDir: string;
}

type Outcome = { text: string; failed?: true };
type Args = Record<string, unknown>;

const str = (args: Args, key: string): string | undefined => {
  const value = args[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
};

const int = (args: Args, key: string): number | undefined => {
  const value = args[key];
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Math.trunc(Number(value));
  return undefined;
};

const list = (args: Args, key: string): string[] | undefined => {
  const value = args[key];
  if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean);
  const single = str(args, key);
  return single ? single.split(/[,，、]/).map((item) => item.trim()).filter(Boolean) : undefined;
};

/** 全部工具的声明；`describe` 与 `tools()` 都从这里取，避免两处漂移。 */
export const ARKNIGHTS_TOOL_DECLS: ReadonlyArray<Omit<ToolDef, 'handler'>> = [
  {
    name: 'arknights_operator',
    description:
      'Look up one Arknights operator in the bundled offline database: rarity, profession, trait, max-level stats, talents and skills (with the M3 description). Use it whenever the player asks what an operator or skill does. Returns a short factual sheet, or a list of similar names when the name is ambiguous.',
    tags: ['read'],
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        name: { type: 'string', description: 'Operator name in Chinese or the internal id, e.g. 银灰 or char_172_svrash.' },
        skill: { type: 'string', description: 'Only return this skill (name contains the given text).' },
      },
      required: ['name'],
    },
  },
  {
    name: 'arknights_kb_search',
    description:
      'Search the bundled Integrated Strategies knowledge: the six themes and the curated general tips. Use it for questions like "which theme is this", "how should I play the early floors" or "how do endings work". Returns matching themes and tips with their source links.',
    tags: ['read'],
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        query: { type: 'string', description: 'Free-text query in Chinese; empty lists the themes.' },
        kind: { type: 'string', enum: ['all', 'theme', 'tip'], description: 'Restrict the result kind. Defaults to all.' },
      },
    },
  },
  {
    name: 'arknights_run_advice',
    description:
      'Give advice for the current run: theme summary plus the tips that fit the current floor. Reads the recorded run state, so call arknights_run_update first when the player reports progress. Returns at most six short tips.',
    tags: ['read'],
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        focus: { type: 'string', description: 'Optional focus, e.g. 招募 or 结局; tips matching it are preferred.' },
      },
    },
  },
  {
    name: 'arknights_run_start',
    description:
      'Record that a new Integrated Strategies run started: theme, squad, difficulty and the ending the player is aiming for. Overwrites a previous unfinished record and reports it. Call this before recording any progress.',
    tags: ['write'],
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        theme: { type: 'string', description: 'Theme id or name, e.g. phantom / 傀影与猩红孤钻.' },
        squad: { type: 'string', description: 'Squad name, free text.' },
        difficulty: { type: 'string', description: 'Difficulty label, free text, e.g. 难度3.' },
        goalEnding: { type: 'string', description: 'Ending the player is aiming for, free text.' },
      },
      required: ['theme'],
    },
  },
  {
    name: 'arknights_run_update',
    description:
      'Update the current run with what the player just told you: floor, life, hope, ingots, keys, recruited operators, relics or a note. Only pass what changed. Pushes a progress event so Coo can react; returns the new snapshot.',
    tags: ['write'],
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        floor: { type: 'integer', minimum: 1, maximum: 20, description: 'Current floor/layer.' },
        node: { type: 'string', description: 'Node type the player just reached, e.g. 商店, 紧急作战, 不期而遇.' },
        life: { type: 'integer', minimum: 0, description: 'Remaining life points.' },
        hope: { type: 'integer', minimum: 0, description: 'Hope.' },
        ingots: { type: 'integer', minimum: 0, description: 'Originium ingots.' },
        keys: { type: 'integer', minimum: 0, description: 'Keys.' },
        squad: { type: 'string', description: 'Squad name.' },
        difficulty: { type: 'string', description: 'Difficulty label.' },
        goalEnding: { type: 'string', description: 'Targeted ending.' },
        operators: { type: 'array', items: { type: 'string' }, description: 'Replace the recruited operator list.' },
        addOperators: { type: 'array', items: { type: 'string' }, description: 'Append newly recruited operators.' },
        relics: { type: 'array', items: { type: 'string' }, description: 'Replace the relic list.' },
        addRelics: { type: 'array', items: { type: 'string' }, description: 'Append newly obtained relics.' },
        note: { type: 'string', description: 'One short note to remember, e.g. 漏了个飞行单位.' },
      },
    },
  },
  {
    name: 'arknights_run_end',
    description:
      'Close the current run with its outcome and move it to the local history. Returns the record and the overall statistics. Use it as soon as the player says the run is over, cleared or abandoned.',
    tags: ['write'],
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        outcome: { type: 'string', enum: ['cleared', 'failed', 'abandoned'], description: 'How the run ended.' },
        summary: { type: 'string', description: 'One line on how it went.' },
      },
      required: ['outcome'],
    },
  },
  {
    name: 'arknights_run_status',
    description:
      'Read the current run snapshot (theme, squad, floor, resources, operators, relics, notes). Use it before answering questions about "this run" when you are not sure what is recorded.',
    tags: ['read'],
    parameters: { type: 'object', additionalProperties: false, properties: {} },
  },
  {
    name: 'arknights_run_history',
    description:
      'Read recent finished runs and the overall statistics (clear rate, best floor). Use it for review questions like "how have I been doing".',
    tags: ['read'],
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        limit: { type: 'integer', minimum: 1, maximum: 50, description: 'How many recent runs to list. Defaults to 5.' },
      },
    },
  },
  {
    name: 'arknights_remind',
    description:
      'Manage local reminders: add a one-shot reminder (in N minutes or at an ISO time), list pending ones, or cancel one by id. When a reminder is due the World pushes an event, so it works even if the conversation moved on.',
    tags: ['write'],
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        action: { type: 'string', enum: ['add', 'list', 'cancel'], description: 'Defaults to list.' },
        text: { type: 'string', description: 'What to remind about, for add.' },
        inMinutes: { type: 'integer', minimum: 1, maximum: 1440, description: 'Delay in minutes, for add.' },
        at: { type: 'string', description: 'Absolute ISO-8601 time, for add. Takes precedence over inMinutes.' },
        id: { type: 'string', description: 'Reminder id, for cancel.' },
      },
    },
  },
  {
    name: 'arknights_blackstream_map',
    description:
      'Describe one floor of the Blackstream (黑流树海, ROGUE 6) map: zone, flavour text, stage ids, and the most common map templates with their frequency. Uses the locally imported community dataset; returns an instruction instead when the data was not imported.',
    tags: ['read'],
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        floor: { type: 'integer', minimum: 1, maximum: 6, description: 'Floor number, 1-6. Defaults to 1.' },
      },
    },
  },
  {
    name: 'arknights_blackstream_pool',
    description:
      'Look up the Blackstream relic pools: either list what a named pool contains, or find an item by name and show its effect plus every pool it belongs to. Pool data comes from the locally imported community dataset.',
    tags: ['read'],
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        query: { type: 'string', description: 'Pool name (e.g. 珍宝池) or item name (e.g. Blaze的电锯).' },
        limit: { type: 'integer', minimum: 1, maximum: 30, description: 'How many entries to list. Defaults to 8.' },
      },
      required: ['query'],
    },
  },
  {
    name: 'arknights_blackstream_predict',
    description:
      'Estimate what node type comes next on a Blackstream floor, from the community sample statistics: the whole-floor mix, the mix at a given corridor distance, or the distances where one named node type appears (pass node). Always report it as an estimate with the sample size; it is not an in-game rule.',
    tags: ['read'],
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        floor: { type: 'integer', minimum: 1, maximum: 6, description: 'Floor number, 1-6.' },
        distance: { type: 'integer', minimum: 1, maximum: 20, description: 'Optional distance in nodes from the start.' },
        node: {
          type: 'string',
          description: 'Optional node type to reverse-look-up, e.g. 误入奇境 or 商店. Returns the distances where it appears.',
        },
      },
      required: ['floor'],
    },
  },
  {
    name: 'arknights_blackstream_scan',
    description:
      'Turn a Blackstream (黑流树海, ROGUE 6) map screenshot into a topology and identify which known construction it is. Read every round node on the main map (including the small path dots) as an integer grid cell, give the start node index, and this tool normalizes the start to (0,0), drops every component not connected to the start as a special map, matches the topology library, and returns the floor/template, all 险路尽头 cells and their BFS step counts. Pass target {x,y} to also get that node’s true distance from the start. Coordinates: x right, y down, one cell per adjacent node. Do not compute distances from coordinate differences yourself.',
    tags: ['read'],
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        floor: { type: 'integer', minimum: 1, maximum: 6, description: 'Floor shown in the screenshot title, if known. Restricts matching to that floor.' },
        nodes: {
          type: 'array',
          minItems: 3,
          description:
            'Every node on the main map, in grid cells. Include big icons and the small dots between them; one adjacent node = one cell. Coordinates may be cell indexes from the screenshot (e.g. 0,1,2...) or pixels if unit/unitX/unitY is given.',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              x: { type: 'number', description: 'Column; increases to the right.' },
              y: { type: 'number', description: 'Row; increases downward.' },
              label: { type: 'string', description: 'Node text if visible, e.g. 险路尽头, 商店, 未知的诡秘.' },
              type: { type: 'string', description: 'Node type if the icon is recognized.' },
            },
            required: ['x', 'y'],
          },
        },
        edges: {
          type: 'array',
          description: 'Optional connections as [fromIndex,toIndex]. Omit to connect orthogonally adjacent cells automatically.',
          items: { type: 'array', items: { type: 'integer', minimum: 0 }, minItems: 2, maxItems: 2 },
        },
        start: { type: 'integer', minimum: 0, description: 'Index of the player/start node in nodes.' },
        unit: { type: 'number', minimum: 0.0001, description: 'Optional pixels per grid cell when nodes are in screenshot pixels.' },
        unitX: { type: 'number', minimum: 0.0001, description: 'Optional horizontal pixels per cell.' },
        unitY: { type: 'number', minimum: 0.0001, description: 'Optional vertical pixels per cell.' },
        target: {
          type: 'object',
          additionalProperties: false,
          description: 'Optional target node, in the same coordinate system as nodes. Returns its BFS distance and path from the start.',
          properties: {
            x: { type: 'number' },
            y: { type: 'number' },
            label: { type: 'string', description: 'Target node label/type, used when coordinates are not exact.' },
          },
        },
      },
      required: ['nodes', 'start'],
    },
  },
  {
    name: 'arknights_blackstream_distance',
    description:
      'Given the last arknights_blackstream_scan result (or a floor+template), return the true grid distance and path from the start to one target node. Uses BFS over the construction’s edges, not coordinate difference, so detours around missing cells are counted. Target coordinates are relative to the start, x right, y down.',
    tags: ['read'],
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        x: { type: 'integer', description: 'Target column relative to the start.' },
        y: { type: 'integer', description: 'Target row relative to the start.' },
        floor: { type: 'integer', minimum: 1, maximum: 6, description: 'Optional floor when no scan is stored; requires template.' },
        template: { type: 'string', description: 'Optional construction label, e.g. F4-T07, when no scan is stored.' },
      },
      required: ['x', 'y'],
    },
  },
  {
    name: 'arknights_shop_advise',
    description:
      'Rank the items offered by a Blackstream shop against the current run: rarity, whether the item sits in a high-value pool, and what the run currently lacks (life, hope, ingots). Returns an ordered list with one reason per item. Call it as soon as the player names the shop candidates.',
    tags: ['read'],
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        offers: {
          type: 'array',
          items: { type: 'string' },
          description: 'Item names shown in the shop, 2-4 entries.',
        },
      },
      required: ['offers'],
    },
  },
  {
    name: 'arknights_blackstream_end',
    description:
      'List the 险路尽头 (ends) of Blackstream main-map constructions from the imported topology library: every end cell relative to the start (0,0) with its BFS step count and path. Accepts a construction label like F2-T05 or 2.5; omit template to list every construction on that floor. Prefer arknights_blackstream_scan when you have a screenshot; this tool answers without one.',
    tags: ['read'],
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        floor: { type: 'integer', minimum: 1, maximum: 6, description: 'Floor number, 1-6.' },
        template: { type: 'string', description: 'Construction label, e.g. F2-T05 or 2.5. Omit to list the floor.' },
      },
      required: ['floor'],
    },
  },
];

export class ArknightsWorld implements World {
  readonly id = 'arknights';
  private readonly store: ArknightsStore;
  private host: WorldHost | undefined;
  private timer: ReturnType<typeof setInterval> | undefined;
  private lastNudgeAt = 0;
  /** 最近一次截图识别结果；只在本进程内有效，够回答「刚才那张图里 X 多远」。 */
  private lastScan: Pick<ScanResult, 'floor' | 'template'> | undefined;

  constructor(private readonly opts: ArknightsWorldOptions) {
    this.store = new ArknightsStore(opts.dataDir);
  }

  envPromptVars(): Record<string, string> {
    return {
      'arknights.operatorCount': String(operatorCount()),
      'arknights.dataDate': dataGeneratedAt(),
      'arknights.themes': isData().themes.map((theme) => theme.name).join('、'),
      'arknights.blackstream': dataSummary() ?? '未导入（只能查主题与通用思路）',
      'arknights.topology': topologySummary() ?? '未导入（不能识别截图里的地图构造）',
    };
  }

  tools(): ToolDef[] {
    const handlers: Record<string, (args: Args) => Outcome | Promise<Outcome>> = {
      arknights_operator: (args) => this.operatorTool(args),
      arknights_kb_search: (args) => this.kbSearchTool(args),
      arknights_run_advice: (args) => this.adviceTool(args),
      arknights_run_start: (args) => this.startTool(args),
      arknights_run_update: (args) => this.updateTool(args),
      arknights_run_end: (args) => this.endTool(args),
      arknights_run_status: () => this.statusTool(),
      arknights_run_history: (args) => this.historyTool(args),
      arknights_remind: (args) => this.remindTool(args),
      arknights_blackstream_map: (args) => this.blackstreamMapTool(args),
      arknights_blackstream_pool: (args) => this.blackstreamPoolTool(args),
      arknights_blackstream_predict: (args) => this.blackstreamPredictTool(args),
      arknights_blackstream_scan: (args) => this.blackstreamScanTool(args),
      arknights_blackstream_distance: (args) => this.blackstreamDistanceTool(args),
      arknights_shop_advise: (args) => this.shopTool(args),
      arknights_blackstream_end: (args) => this.blackstreamEndTool(args),
    };
    return ARKNIGHTS_TOOL_DECLS.map((decl) => ({ ...decl, handler: async (args) => handlers[decl.name]!(args ?? {}) }));
  }

  webUi(_language?: string): WorldWebUiDecl {
    return {
      config: [ARKNIGHTS_CONFIG_GROUP],
      promptDocs: [
        {
          key: 'worlds.arknights.envPrompt',
          title: '明日方舟 · 环境提示词',
          description: '方舟 World 进 system 前缀的那一段：资料库范围、工具用法与边界。',
          path: ENV_PROMPT_FILE,
          role: 'envPrompt',
          vars: [
            { name: 'arknights.operatorCount', description: '随包资料里的干员条数。' },
            { name: 'arknights.dataDate', description: '干员资料的生成日期。' },
            { name: 'arknights.themes', description: '资料里收录的集成战略主题名。' },
            { name: 'arknights.blackstream', description: '黑流树海本地资料的概况，未导入时说明只有主题与思路。' },
            { name: 'arknights.topology', description: '黑流树海地图拓扑库的概况，未导入时说明不能识别截图。' },
          ],
        },
      ],
    };
  }

  async start(host: WorldHost): Promise<void> {
    this.host = host;
    await this.push('arknights.mounted', '明日方舟 World 已挂载：集成战略资料、对局账本与提醒可用。', 'flush', 'internal');
    const seconds = Math.max(5, this.opts.cfg.reminderPollSeconds ?? 30);
    this.timer = setInterval(() => {
      void this.checkReminders();
      void this.checkNudge();
    }, seconds * 1000);
    this.timer.unref?.();
  }

  async stop(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    this.host = undefined;
  }

  /** 定时器与测试共用：到期的提醒推事件后从盘上删掉。 */
  async checkReminders(now = new Date()): Promise<Reminder[]> {
    const due = this.store.dueReminders(now);
    if (!due.length) return [];
    this.store.removeReminders(due.map((reminder) => reminder.id));
    for (const reminder of due) {
      await this.push('arknights.reminder', `提醒：${reminder.text}`, 'flush', 'internal');
    }
    return due;
  }

  /** 对局进行中、超过 nudgeMinutes 没更新时催一次；同一段空闲只催一次。 */
  async checkNudge(nowMs = Date.now()): Promise<boolean> {
    if (!this.opts.cfg.proactive) return false;
    const run = this.store.currentRun();
    if (!run) return false;
    const minutes = Math.max(1, this.opts.cfg.nudgeMinutes ?? 3);
    const idle = nowMs - Date.parse(run.updatedAt);
    if (!Number.isFinite(idle) || idle < minutes * 60_000) return false;
    if (nowMs - this.lastNudgeAt < minutes * 60_000) return false;
    this.lastNudgeAt = nowMs;
    await this.push('arknights.nudge', nudgeText(run, Math.round(idle / 60_000)), 'flush');
    return true;
  }

  private async push(
    type: string,
    text: string,
    trigger: NonNullable<PushOptions['trigger']>,
    origin: 'internal' | 'external' = 'external',
  ): Promise<void> {
    if (!this.host) return;
    await this.host.pushEvent(
      {
        type,
        ts: nowIso(this.opts.timezone),
        source: this.id,
        origin,
        senderKey: this.id,
        text,
      },
      { trigger },
    );
  }

  private async narrate(type: string, text: string, trigger: NonNullable<PushOptions['trigger']>): Promise<void> {
    if (!this.opts.cfg.commentary) return;
    await this.push(type, text, trigger);
  }

  /* ----------------------------------------------------------------- tools */

  private operatorTool(args: Args): Outcome {
    const query = str(args, 'name');
    if (!query) return { text: '缺少 name 参数。', failed: true };
    const exact = findOperator(query);
    if (!exact) {
      const similar = searchOperators(query, 5);
      if (!similar.length) {
        return { text: `资料库里没有「${query}」。可以换个名字试试，或确认不是剧情角色。`, failed: true };
      }
      return {
        text: `没有精确匹配「${query}」，相近的有：${similar.map((op) => `${op.name}（${op.profession}）`).join('、')}。请用完整名字再查一次。`,
      };
    }
    const skillFilter = str(args, 'skill');
    if (skillFilter) {
      const filtered = exact.skills.filter((skill) => skill.name.includes(skillFilter));
      if (!filtered.length) {
        return { text: `${exact.name} 没有名字含「${skillFilter}」的技能。现有技能：${exact.skills.map((s) => s.name).join('、') || '无'}。` };
      }
      return { text: formatOperator({ ...exact, skills: filtered }) };
    }
    return { text: formatOperator(exact) };
  }

  private kbSearchTool(args: Args): Outcome {
    const query = str(args, 'query') ?? '';
    const kind = (str(args, 'kind') ?? 'all') as 'all' | 'theme' | 'tip';
    const themes = kind === 'tip' ? [] : searchThemes(query, 6);
    const tips = kind === 'theme' ? [] : searchTips(query, 6);
    if (!themes.length && !tips.length && query) {
      return { text: `资料里没有匹配「${query}」的主题或思路。可查的主题：${isData().themes.map((t) => t.name).join('、')}。` };
    }
    const lines: string[] = [];
    if (themes.length) lines.push('主题：', ...themes.map((theme) => formatTheme(theme)));
    if (tips.length) lines.push('思路：', ...tips.map((tip) => formatTip(tip)));
    return { text: lines.join('\n') };
  }

  private adviceTool(args: Args): Outcome {
    const run = this.store.currentRun();
    if (!run) {
      const fallback = adviceFor({}, 4);
      return {
        text: `还没有记录中的对局。先开一局（arknights_run_start）再问会更准。以下是通用思路：\n${fallback.tips.map((tip) => formatTip(tip)).join('\n')}`,
      };
    }
    const theme = findTheme(run.theme);
    const advice = adviceFor({ theme: run.theme, floor: run.floor, squad: run.squad }, 6);
    const focus = str(args, 'focus');
    const tips = focus
      ? [...advice.tips].sort(
          (a, b) =>
            Number(Boolean(b.tags.some((tag) => tag.includes(focus)) || b.text.includes(focus))) -
            Number(Boolean(a.tags.some((tag) => tag.includes(focus)) || a.text.includes(focus))),
        )
      : advice.tips;
    const lines = [`当前：${run.themeName}${run.squad ? ` · ${run.squad}` : ''}，第 ${run.floor} 层（${phaseForFloor(run.floor)} 阶段）。`];
    if (theme) lines.push(formatTheme(theme));
    lines.push('建议：', ...tips.map((tip) => formatTip(tip)));
    return { text: lines.join('\n') };
  }

  private async startTool(args: Args): Promise<Outcome> {
    const input = str(args, 'theme');
    if (!input) return { text: '缺少 theme 参数。', failed: true };
    const theme = findTheme(input);
    if (!theme) {
      return {
        text: `不认识主题「${input}」。现有：${isData().themes.map((t) => `${t.name}（${t.id}）`).join('、')}。`,
        failed: true,
      };
    }
    const { run, previous } = this.store.startRun({
      theme: theme.id,
      themeName: theme.name,
      squad: str(args, 'squad'),
      difficulty: str(args, 'difficulty'),
      goalEnding: str(args, 'goalEnding'),
    });
    await this.narrate(
      'arknights.run_started',
      `新的集成战略对局：${run.themeName}${run.squad ? ` · ${run.squad}` : ''}${run.difficulty ? ` · ${run.difficulty}` : ''}。`,
      'flush',
    );
    const lines = [
      `已开局：${run.themeName}${run.squad ? ` · ${run.squad}` : ''}${run.difficulty ? ` · ${run.difficulty}` : ''}，第 1 层。`,
    ];
    if (previous) lines.push(`（覆盖了上一局未结束的记录：${previous.themeName}，第 ${previous.floor} 层。）`);
    if (run.goalEnding) lines.push(`目标结局：${run.goalEnding}。`);
    lines.push(nextStepAdvice(run));
    return { text: lines.join('\n') };
  }

  private async updateTool(args: Args): Promise<Outcome> {
    const run = this.store.currentRun();
    if (!run) return { text: '现在没有进行中的对局。先用 arknights_run_start 开一局。', failed: true };
    const patch = {
      floor: int(args, 'floor'),
      node: str(args, 'node'),
      life: int(args, 'life'),
      hope: int(args, 'hope'),
      ingots: int(args, 'ingots'),
      keys: int(args, 'keys'),
      squad: str(args, 'squad'),
      difficulty: str(args, 'difficulty'),
      goalEnding: str(args, 'goalEnding'),
      operators: list(args, 'operators'),
      addOperators: list(args, 'addOperators'),
      relics: list(args, 'relics'),
      addRelics: list(args, 'addRelics'),
      note: str(args, 'note'),
    };
    const changed = Object.entries(patch).filter(([, value]) => value !== undefined);
    if (!changed.length) return { text: '没有可更新的字段。', failed: true };
    const updated = this.store.updateRun(patch);
    if (!updated) return { text: '更新失败：当前对局记录读不出来。', failed: true };
    const advice = nextStepAdvice(updated);
    await this.narrate('arknights.run_progress', `${this.describeRun(updated)}\n${advice}`, 'debounce');
    return { text: `${this.describeRun(updated)}\n已记录 ${changed.map(([key]) => key).join('、')}。\n${advice}` };
  }

  private async endTool(args: Args): Promise<Outcome> {
    const outcome = str(args, 'outcome') as RunOutcome | undefined;
    if (!outcome || !['cleared', 'failed', 'abandoned'].includes(outcome)) {
      return { text: 'outcome 只能是 cleared、failed 或 abandoned。', failed: true };
    }
    const result = this.store.endRun(outcome, str(args, 'summary'), this.opts.cfg.maxHistory ?? 50);
    if (!result) return { text: '现在没有进行中的对局，没什么可结束的。', failed: true };
    const label = outcome === 'cleared' ? '通关' : outcome === 'failed' ? '失败' : '放弃';
    const stats = this.store.stats();
    await this.narrate(
      'arknights.run_ended',
      `这局${label}：${result.run.themeName}，第 ${result.run.floor} 层。累计 ${stats.total} 局，通关 ${stats.cleared} 局。`,
      'flush',
    );
    const rate = stats.total ? Math.round(stats.clearRate * 100) : 0;
    return {
      text: `已记录：${result.run.themeName} 第 ${result.run.floor} 层，${label}。\n累计 ${stats.total} 局（通关 ${stats.cleared}、失败 ${stats.failed}、放弃 ${stats.abandoned}），通关率 ${rate}%，最远 ${stats.bestFloor} 层。`,
    };
  }

  private statusTool(): Outcome {
    const run = this.store.currentRun();
    if (!run) return { text: '现在没有进行中的对局。' };
    return { text: this.describeRun(run) };
  }

  private historyTool(args: Args): Outcome {
    const limit = int(args, 'limit') ?? 5;
    const stats = this.store.stats();
    const recent = this.store.history(limit);
    if (!stats.total) return { text: '还没有已结束的对局记录。' };
    const rate = Math.round(stats.clearRate * 100);
    const lines = [
      `累计 ${stats.total} 局：通关 ${stats.cleared}、失败 ${stats.failed}、放弃 ${stats.abandoned}；通关率 ${rate}%，最远 ${stats.bestFloor} 层。`,
    ];
    if (recent.length) {
      lines.push('最近几局：');
      for (const record of recent) {
        const label = record.outcome === 'cleared' ? '通关' : record.outcome === 'failed' ? '失败' : '放弃';
        const date = record.endedAt.slice(0, 10);
        lines.push(`- ${date} ${record.themeName} 第 ${record.floor} 层 ${label}${record.summary ? `：${record.summary}` : ''}`);
      }
    }
    return { text: lines.join('\n') };
  }

  private remindTool(args: Args): Outcome {
    const action = str(args, 'action') ?? 'list';
    if (action === 'add') {
      const text = str(args, 'text');
      if (!text) return { text: 'add 需要 text。', failed: true };
      const at = str(args, 'at');
      const minutes = int(args, 'inMinutes');
      let due: Date;
      if (at) {
        const parsed = new Date(at);
        if (Number.isNaN(parsed.getTime())) {
          return { text: `看不懂时间「${at}」，用 ISO-8601，例如 2026-10-28T20:00:00+08:00。`, failed: true };
        }
        due = parsed;
      } else if (minutes) {
        due = new Date(Date.now() + minutes * 60_000);
      } else {
        return { text: 'add 需要 inMinutes 或 at。', failed: true };
      }
      const reminder = this.store.addReminder(text, due);
      return { text: `已记下提醒 ${reminder.id}：${text}，${due.toISOString()} 到点。` };
    }
    if (action === 'cancel') {
      const id = str(args, 'id');
      if (!id) return { text: 'cancel 需要 id。', failed: true };
      const removed = this.store.cancelReminder(id);
      return removed ? { text: `已取消提醒 ${id}。` } : { text: `没有找到提醒 ${id}。`, failed: true };
    }
    const pending = this.store.listReminders();
    if (!pending.length) return { text: '没有待触发的提醒。' };
    return {
      text: ['待触发的提醒：', ...pending.map((reminder) => `- ${reminder.id} ${reminder.dueAt}：${reminder.text}`)].join('\n'),
    };
  }

  private blackstreamMissing(): Outcome {
    return {
      text: '本机还没导入黑流树海资料。运行 node scripts/import-blackstream.mjs（或 corepack pnpm import:blackstream）导入后再查；数据只放在本机，不随包分发。',
      failed: true,
    };
  }

  private blackstreamMapTool(args: Args): Outcome {
    if (!hasBlackstreamData()) return this.blackstreamMissing();
    const floor = int(args, 'floor') ?? 1;
    const text = describeFloor(floor);
    if (!text) return { text: `没有第 ${floor} 层的资料（现有 1–6 层）。`, failed: true };
    const end = nodeTypeDistances(floor, '险路尽头');
    const endLine =
      end && end.distances.length
        ? `险路尽头：出现在距离 ${end.distances.map((item) => `${item.distance}（${item.count} 次）`).join('、')}，共 ${end.total} 次样本。这是整层样本的分布；具体尽头位置用 arknights_blackstream_end（按构造）或 arknights_blackstream_scan（按截图）查。`
        : '险路尽头：这一层没有它的距离样本。';
    const topologyLine = hasTopologyData()
      ? '拓扑库已导入：可用 arknights_blackstream_end 查具体构造的尽头与步数，或 arknights_blackstream_scan 从截图认地图。'
      : '拓扑库未导入：只能看上面的样本分布，不能按具体构造定位尽头。';
    return { text: `${text}\n${endLine}\n${topologyLine}\n数据来源：路标档案馆（个人使用导入）。` };
  }

  private blackstreamPoolTool(args: Args): Outcome {
    if (!hasBlackstreamData()) return this.blackstreamMissing();
    const query = str(args, 'query');
    if (!query) return { text: '缺少 query（池名或藏品名）。', failed: true };
    const limit = int(args, 'limit') ?? 8;

    const item = findItem(query);
    if (item) {
      const pools = poolsWithItem(item.id).map((pool) => pool.name);
      const lines = [formatItem(item)];
      if (item.description && item.description !== item.effect) lines.push(`描述：${item.description}`);
      lines.push(pools.length ? `出现在这些池：${pools.join('、')}` : '没查到它属于哪个池。');
      return { text: lines.join('\n') };
    }

    const pools = searchPools(query, 3);
    if (!pools.length) {
      return { text: `没有匹配「${query}」的池或藏品。可以试试池名（如 珍宝池）或完整藏品名。`, failed: true };
    }
    return { text: pools.map((pool) => formatPool(pool, limit)).join('\n\n') };
  }

  private blackstreamPredictTool(args: Args): Outcome {
    if (!hasBlackstreamData()) return this.blackstreamMissing();
    const floor = int(args, 'floor');
    if (!floor) return { text: '缺少 floor（1–6）。', failed: true };
    const meta = nodeDistanceMeta(floor);
    if (!meta) return { text: `没有第 ${floor} 层的样本。`, failed: true };

    const nodeName = str(args, 'node');
    if (nodeName) {
      const found = nodeTypeDistances(floor, nodeName);
      if (!found) {
        return {
          text: `第 ${floor} 层没有「${nodeName}」的记录（或名字不完全一致）。这层出现过的节点：${nodeTypeNames(floor).join('、')}。`,
          failed: true,
        };
      }
      const lines = [
        `第 ${floor} 层「${found.name}」出现的距离（${found.mapSampleCount} 张地图）：`,
        ...found.distances.map(
          (item) => `- 距离 ${item.distance}：${item.count} 次（约 ${(item.share * 100).toFixed(1)}% 的地图）`,
        ),
        `合计 ${found.total} 次；这是社区样本统计，不是游戏内保底规则。`,
      ];
      return { text: lines.join('\n') };
    }

    const distance = int(args, 'distance');
    if (distance) {
      const rows = nodeTypeAtDistance(floor, distance).slice(0, 6);
      if (!rows.length) return { text: `第 ${floor} 层没有距离 ${distance} 的样本。`, failed: true };
      const lines = [
        `第 ${floor} 层（${meta.label}）徒步距离为 ${distance} 时，各类节点的出现频率（${meta.mapSampleCount} 张地图）：`,
        ...rows.map((row) => `- ${row.name}：${(row.probability * 100).toFixed(1)}%（${row.samples} 次）`),
        '这是该距离上的出现频率，不是「你现在站在这里、下一格是它」的概率；是社区样本的统计推测，不是游戏内保底规则。',
      ];
      return { text: lines.join('\n') };
    }

    const rows = nodeTypeShare(String(floor)).slice(0, 8);
    const lines = [
      `第 ${floor} 层（${meta.label}）整体节点构成（${meta.mapSampleCount} 张地图、${meta.sampleCount} 个节点）：`,
      ...rows.map((row) => `- ${row.name}：${(row.share * 100).toFixed(1)}%（${row.count} 个）`),
      '这是社区样本统计的推测，不是游戏内保底规则。',
    ];
    return { text: lines.join('\n') };
  }

  private blackstreamScanTool(args: Args): Outcome {
    if (!hasTopologyData()) {
      return {
        text: '本机还没导入黑流树海地图拓扑。先跑 node scripts/import-topologies.mjs（或 corepack pnpm import:topologies）导入，再识别截图。',
        failed: true,
      };
    }
    const rawNodes = args.nodes;
    if (!Array.isArray(rawNodes) || !rawNodes.length) {
      return { text: '缺少 nodes：把截图里主地图的节点按格子坐标读出来。', failed: true };
    }
    const nodes: ScanNode[] = [];
    for (const item of rawNodes) {
      if (Array.isArray(item)) {
        const x = Number(item[0]);
        const y = Number(item[1]);
        if (Number.isFinite(x) && Number.isFinite(y)) nodes.push({ x, y });
        continue;
      }
      if (item && typeof item === 'object') {
        const record = item as Record<string, unknown>;
        const x = Number(record.x ?? record.col ?? record.column);
        const y = Number(record.y ?? record.row);
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
        const label = typeof record.label === 'string' ? record.label : undefined;
        const type = typeof record.type === 'string' ? record.type : undefined;
        nodes.push({ x, y, label, type });
      }
    }
    if (nodes.length < 3) return { text: 'nodes 至少要有 3 个有效节点。', failed: true };

    const start = int(args, 'start');
    if (start === undefined) return { text: '缺少 start：给起点节点在 nodes 里的下标。', failed: true };

    const rawEdges = args.edges;
    const edges: Array<[number, number]> = [];
    if (Array.isArray(rawEdges)) {
      for (const item of rawEdges) {
        if (!Array.isArray(item) || item.length < 2) continue;
        const from = Number(item[0]);
        const to = Number(item[1]);
        if (Number.isInteger(from) && Number.isInteger(to)) edges.push([from, to]);
      }
    }

    const unitX = typeof args.unitX === 'number' ? args.unitX : undefined;
    const unitY = typeof args.unitY === 'number' ? args.unitY : undefined;
    const unit = typeof args.unit === 'number' ? args.unit : unitX && unitY ? { x: unitX, y: unitY } : undefined;

    const rawTarget = args.target;
    let target: { x: number; y: number; label?: string } | undefined;
    if (rawTarget && typeof rawTarget === 'object') {
      const record = rawTarget as Record<string, unknown>;
      const x = Number(record.x ?? record.col ?? record.column);
      const y = Number(record.y ?? record.row);
      const label = typeof record.label === 'string' ? record.label : undefined;
      if (Number.isFinite(x) && Number.isFinite(y)) target = { x, y, label };
      else if (label) target = { x: Number.NaN, y: Number.NaN, label };
    }

    const result = scanTopology({
      nodes,
      start,
      edges,
      floor: int(args, 'floor'),
      unit,
      target,
    });
    if (result.ok && result.floor !== undefined && result.template) {
      this.lastScan = { floor: result.floor, template: result.template };
    }
    return formatScan(result);
  }

  private blackstreamDistanceTool(args: Args): Outcome {
    const x = int(args, 'x');
    const y = int(args, 'y');
    if (x === undefined || y === undefined) return { text: '需要 x 和 y（相对起点，x 向右、y 向下）。', failed: true };
    let context = this.lastScan;
    if (!context) {
      const floor = int(args, 'floor');
      const template = str(args, 'template');
      if (floor !== undefined && template) context = { floor, template };
    }
    if (!context) {
      return { text: '还没有识别出的地图。先跑 arknights_blackstream_scan，或同时给 floor + template。', failed: true };
    }
    return distanceOn(context, [x, y]);
  }

  private blackstreamEndTool(args: Args): Outcome {
    if (!hasTopologyData()) {
      return {
        text: '本机还没导入黑流树海地图拓扑。先跑 node scripts/import-topologies.mjs（或 corepack pnpm import:topologies）导入，再查尽头。',
        failed: true,
      };
    }
    const floor = int(args, 'floor');
    if (floor === undefined) return { text: '需要 floor（1–6）。', failed: true };
    const template = str(args, 'template');
    const result = describeEnds(floor, template);
    if (!result) return { text: `第 ${floor} 层的拓扑还没导入。`, failed: true };
    return result;
  }

  private shopTool(args: Args): Outcome {
    if (!hasBlackstreamData()) return this.blackstreamMissing();
    const offers = list(args, 'offers');
    if (!offers?.length) return { text: '把商店里的候选名字给我（offers）。', failed: true };
    const run = this.store.currentRun();
    if (!run) return { text: '现在没有进行中的对局；先开局，才能按你的资源排序。', failed: true };

    const ranked = rankShopOffers(offers, run);
    const lines = ['商店候选排序（稀有度 + 所属池 + 你当前的资源）：'];
    ranked.forEach((offer, index) => {
      lines.push(`${index + 1}. ${offer.name}：${offer.reasons.join('，') || '没有特别理由，按价格决定'}`);
    });
    lines.push('只买能马上改变战力的；买完把结果告诉我，我记进账本。');
    return { text: lines.join('\n') };
  }

  private describeRun(run: RunState): string {
    const parts = [`${run.themeName}${run.squad ? ` · ${run.squad}` : ''}${run.difficulty ? ` · ${run.difficulty}` : ''}`];
    parts.push(`第 ${run.floor} 层`);
    if (run.node) parts.push(`当前节点：${run.node}`);
    const resources: string[] = [];
    if (run.life !== undefined) resources.push(`生命 ${run.life}`);
    if (run.hope !== undefined) resources.push(`希望 ${run.hope}`);
    if (run.ingots !== undefined) resources.push(`源石锭 ${run.ingots}`);
    if (run.keys !== undefined) resources.push(`钥匙 ${run.keys}`);
    if (resources.length) parts.push(resources.join('｜'));
    if (run.operators.length) parts.push(`干员：${run.operators.join('、')}`);
    if (run.relics.length) parts.push(`收藏品：${run.relics.join('、')}`);
    if (run.notes.length) parts.push(`备注：${run.notes.join(' / ')}`);
    if (run.goalEnding) parts.push(`目标结局：${run.goalEnding}`);
    return parts.join('；');
  }
}
