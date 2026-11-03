import { describeTools, type WorldDefinition } from 'cortico/world.ts';
import { DIARY_DEFAULTS, type DiaryConfigSection } from './config.ts';
import { DIARY_TOOL_DECLS, DiaryWorld } from './world.ts';

export const DIARY: WorldDefinition<DiaryConfigSection> = {
  id: 'diary',
  label: '日记',
  defaults: () => ({ ...DIARY_DEFAULTS }),
  // `ctx.cfg` 是 `worlds.diary` 的活引用:改目录与提醒立即生效,不用重启实例。
  create: (ctx) => new DiaryWorld({
    cfg: ctx.cfg,
    timezone: ctx.timezone,
    botDir: ctx.botDir,
    dataDir: ctx.dataDir,
  }),
  // 自描述:可能出现的全部工具与会推出的全部事件,不进提示词。
  describe: {
    tools: describeTools(DIARY_TOOL_DECLS, {
      diary_write: { zh: '把一篇日记追加到当天的 Markdown 文件末尾。', en: 'Appends one diary entry to the end of that day\u2019s Markdown file.' },
      diary_read: { zh: '读回某一天或最近几篇日记的原文。', en: 'Reads back one day\u2019s or the latest few diary entries.' },
      diary_list: { zh: '列出哪些天写过日记,各有多少篇。', en: 'Lists the days that have diary entries, with entry counts.' },
      diary_art: { zh: '回想某一天画过的画,可把图作为附件交回来。', en: 'Recalls the drawings made on a day, optionally returning them as attachments.' },
      diary_moment: { zh: '回想某一天「看一眼」留下的深刻瞬间,可把原图作为附件交回来。', en: 'Recalls the memorable “Glance” moments of a day, optionally returning their screenshots as attachments.' },
    }),
    events: [
      { type: 'diary.started', description: { zh: 'World 挂载完成。', en: 'The World was mounted.' } },
      { type: 'diary.reminder', description: { zh: '到了配置的提醒时刻,当天还没有日记。', en: 'The reminder time passed and that day still has no entry.' } },
    ],
  },
};
