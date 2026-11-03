import { describeTools, type WorldDefinition } from 'cortico/world.ts';
import { moodConfigOptions, MOOD_DEFAULTS, type MoodConfigSection } from './config.ts';
import { MOOD_TOOL_DECLS, MoodWorld } from './world.ts';

export const MOOD: WorldDefinition<MoodConfigSection> = {
  id: 'mood',
  label: '心情',
  defaults: () => ({ ...MOOD_DEFAULTS }),
  // ctx.cfg 是 worlds.mood 的活引用；系数、上限与可见性改完下一拍生效。
  create: (ctx) => new MoodWorld({
    cfg: ctx.cfg,
    timezone: ctx.timezone,
    botDir: ctx.botDir,
    dataDir: ctx.dataDir,
    persist: ctx.persist,
  }),
  configOptions: (kind, language) => moodConfigOptions(kind, language),
  // 自描述:可能出现的全部工具与会推出的全部事件,不进提示词。
  describe: {
    tools: describeTools(MOOD_TOOL_DECLS, {
      mood_status: { zh: '查看当前心情值、区间、思维方式与最近趋势。', en: 'Reads the current mood, band, thinking style and recent trend.' },
      mood_apply: { zh: '给心情记一笔浏览、事件或对话影响。', en: 'Records a browsing, event or dialogue influence on the mood.' },
      mood_roll: { zh: '按当前心情抽一个情绪标签和可用的桌宠表情。', en: 'Rolls an emotion tag and a usable pet expression for the current mood.' },
      mood_feel: { zh: '（可选）让模型上报这一轮用户的语气。', en: '(Optional) reports the person’s tone for this turn.' },
      gal_start: { zh: '准备一道情境问答，并给出 pet_ask 的显示参数。', en: 'Prepares a situation quiz and returns the pet_ask payload.' },
    }),
    events: [
      { type: 'mood.started', description: { zh: 'World 挂载完成。', en: 'The World was mounted.' } },
      { type: 'mood.external', description: { zh: '外部插件注入的心情变化；meta.delta 与 meta.reason。', en: 'A mood change injected by another World; meta.delta and meta.reason.' }, trigger: 'piggyback' },
      { type: 'mood.gal_hint', description: { zh: '待机时提示可以主动发起情境问答。', en: 'An idle offer to start a situation quiz.' }, trigger: 'flush' },
      { type: 'mood.snapshot', description: { zh: '每轮带给模型的当前心情快照。', en: 'The current mood snapshot handed to the model between turns.' }, trigger: 'piggyback', tags: ['snapshot'] },
      { type: 'mood.threshold', description: { zh: '心情跨过 20 / 40 / 60 / 80 的区间。', en: 'Mood crossed the 20 / 40 / 60 / 80 band boundary.' }, trigger: 'piggyback', tags: ['snapshot'] },
      { type: 'mood.daily_reset', description: { zh: '新的一天算出了衰减基线与随机扰动。', en: 'A new day’s decay baseline and noise were computed.' }, trigger: 'piggyback' },
      { type: 'mood.self_rescue', description: { zh: '连续三天最终值 ≤10，角色想自己改变。', en: 'Three days ended at or below 10; the character wants to change.' }, trigger: 'piggyback' },
    ],
  },
};
