import { describeTools, type WorldDefinition } from 'cortico/world.ts';
import { EMOTE_PICS_DEFAULTS, defaultPrompt, emptyEmotions, type EmotePicsConfigSection } from './config.ts';
import { EMOTE_MOOD_DECLS, EMOTE_PIC_DECLS, EMOTE_POPUP_TEST_DECLS, EmotePicsWorld } from './world.ts';

export const EMOTE_PICS: WorldDefinition<EmotePicsConfigSection> = {
  id: 'emote-pics',
  label: 'Emote Pics',
  defaults: () => ({ ...EMOTE_PICS_DEFAULTS, emotions: emptyEmotions(), prompt: defaultPrompt() }),
  // `ctx.cfg` 是 `worlds.emote-pics` 的活引用;面板保存经 ctx.persist 写回。
  // `ctx.dataDir` 是部署共享的数据目录;心情存档的文件名带 World id。
  create: (ctx) => new EmotePicsWorld({
    cfg: ctx.cfg,
    persist: (patch) => ctx.persist(patch),
    dataDir: ctx.dataDir,
    botDir: ctx.botDir,
    repoRoot: ctx.repoRoot,
  }),
  // 自描述:全部工具;这个 World 不推事件。
  describe: {
    tools: describeTools([...EMOTE_PIC_DECLS, ...EMOTE_MOOD_DECLS, ...EMOTE_POPUP_TEST_DECLS], {
      emote_pic: {
        zh: '按配置的概率决定这次出不出图;出图时从该表情的文件夹随机挑一张,作为附件交给这次对话。',
        en: 'Rolls the configured chance; when it fires, picks a random picture from that emotion folder and attaches it.',
      },
      emote_mood: {
        zh: '记下当前心情,供之后的环境说明参考;不发图,也不产生句柄。',
        en: 'Records the current mood for later environment notes; sends no image and produces no handle.',
      },
      emote_popup_test: {
        zh: '不经过面板,直接从表情目录随机弹一张测试图。',
        en: 'Pops a random test picture from the emotion folders without the panel.',
      },
    }),
    events: [],
  },
};
