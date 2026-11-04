import { describeTools, type WorldDefinition } from 'cortico/world.ts';
import { ARKNIGHTS_DEFAULTS, type ArknightsConfigSection } from './config.ts';
import { ARKNIGHTS_TOOL_DECLS, ArknightsWorld } from './world.ts';

/** 工具的一句话说明，给人看；工具描述本身是给模型的。 */
const TOOL_SUMMARIES = {
  arknights_operator: {
    zh: '查一名干员的职业、属性、天赋与技能（含专精三数值）。',
    en: 'Fact sheet for one operator: class, stats, talents and skills with M3 values.',
  },
  arknights_kb_search: {
    zh: '查集成战略主题与通用思路。',
    en: 'Search the Integrated Strategies themes and curated tips.',
  },
  arknights_run_advice: {
    zh: '按当前层数给出这一局用得上的建议。',
    en: 'Advice that fits the current floor of the recorded run.',
  },
  arknights_run_start: {
    zh: '开一局：记主题、分队、难度与目标结局。',
    en: 'Record the start of a run.',
  },
  arknights_run_update: {
    zh: '更新当前对局：层数、资源、干员、收藏品或备注。',
    en: 'Update the current run with what changed.',
  },
  arknights_run_end: {
    zh: '结束当前对局并写入本地战绩。',
    en: 'Close the run and add it to the local history.',
  },
  arknights_run_status: {
    zh: '读当前对局快照。',
    en: 'Read the current run snapshot.',
  },
  arknights_run_history: {
    zh: '读最近战绩与通关统计。',
    en: 'Recent runs and overall statistics.',
  },
  arknights_remind: {
    zh: '增加、列出或取消本地提醒。',
    en: 'Add, list or cancel local reminders.',
  },
  arknights_blackstream_map: {
    zh: '看黑流树海某一层的地图结构、关卡与常见地图模板。',
    en: 'Blackstream floor structure, stages and common map templates.',
  },
  arknights_blackstream_pool: {
    zh: '查黑流树海藏品池，或某件藏品属于哪些池。',
    en: 'Blackstream relic pools, or which pools an item belongs to.',
  },
  arknights_blackstream_predict: {
    zh: '按社区样本推测黑流树海下一段可能出现的节点类型。',
    en: 'Estimate the next node type on a Blackstream floor from community samples.',
  },
  arknights_shop_advise: {
    zh: '按稀有度、所属池和当前资源给商店候选排序。',
    en: 'Rank shop offers against the current run.',
  },
  arknights_blackstream_scan: {
    zh: '把黑流树海截图读成拓扑：认地图、找全部尽头、按结构算步数。',
    en: 'Turn a Blackstream screenshot into a topology: identify the map, find every end, and measure true step distances.',
  },
  arknights_blackstream_distance: {
    zh: '按拓扑结构算某个节点到起点的真实步数。',
    en: 'True grid distance from the start to one node, over the map graph.',
  },
  arknights_blackstream_end: {
    zh: '查某层某套主地图构造的起点与全部尽头（含步数与路径）。',
    en: 'Start and end cells of a Blackstream construction, with step counts and paths.',
  },
} as const;

export const ARKNIGHTS: WorldDefinition<ArknightsConfigSection> = {
  id: 'arknights',
  label: '明日方舟',
  defaults: () => ({ ...ARKNIGHTS_DEFAULTS }),
  // `ctx.cfg` 是 `worlds.arknights` 的活引用：热改的键现读即生效。
  create: (ctx) => new ArknightsWorld({ cfg: ctx.cfg, timezone: ctx.timezone, dataDir: ctx.dataDir }),
  describe: {
    tools: describeTools(ARKNIGHTS_TOOL_DECLS, TOOL_SUMMARIES),
    events: [
      { type: 'arknights.mounted', description: { zh: 'World 挂载完成。', en: 'The World was mounted.' } },
      {
        type: 'arknights.run_started',
        description: { zh: '记录了一局新的集成战略对局。', en: 'A new Integrated Strategies run was recorded.' },
      },
      {
        type: 'arknights.run_progress',
        description: { zh: '对局状态有更新（层数、资源、干员等）。', en: 'The recorded run changed.' },
      },
      {
        type: 'arknights.run_ended',
        description: { zh: '当前对局结束并写入战绩。', en: 'The run ended and was written to history.' },
      },
      {
        type: 'arknights.reminder',
        description: { zh: '一条本地提醒到点了。', en: 'A local reminder became due.' },
      },
      {
        type: 'arknights.nudge',
        description: {
          zh: '对局进行中太久没更新，World 主动催一句并给出当前层的节点构成。',
          en: 'The run has been idle too long; the World prompts with the floor mix.',
        },
      },
    ],
  },
};
