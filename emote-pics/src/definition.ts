import { describeTools, type WorldDefinition } from 'cortico/world.ts';
import { EMOTE_PICS_DEFAULTS, type EmotePicsConfigSection } from './config.ts';
import { EMOTE_PIC_DECLS, EMOTE_POPUP_TEST_DECLS, EmotePicsWorld } from './world.ts';

export const EMOTE_PICS: WorldDefinition<EmotePicsConfigSection> = {
  id: 'emote-pics',
  label: 'Emote Pics',
  defaults: () => ({ ...EMOTE_PICS_DEFAULTS }),
  // `ctx.cfg` 是 `worlds.emote-pics` 的活引用;面板保存经 ctx.persist 写回。
  create: (ctx) => new EmotePicsWorld({
    cfg: ctx.cfg,
    persist: (patch) => ctx.persist(patch),
    dataDir: ctx.dataDir,
    botDir: ctx.botDir,
  }),
  // 自描述:全部工具;这个 World 不推事件。
  describe: {
    tools: describeTools([...EMOTE_PIC_DECLS, ...EMOTE_POPUP_TEST_DECLS], {
      emote_pic: {
        zh: '按概率从该情绪的子文件夹挑一张图,作为附件交给这次对话(只显示在对话页);跳过不是错误。',
        en: 'Rolls the configured chance and attaches one picture from that emotion folder to this reply (chat page only); a skip is not an error.',
      },
      emote_popup_test: {
        zh: '不经过面板,从已配置的情绪子文件夹里随机弹一张测试图到桌宠身上。',
        en: 'Pops a random test picture from the configured emotion folders onto the pet, without the panel.',
      },
    }),
    events: [],
  },
};
