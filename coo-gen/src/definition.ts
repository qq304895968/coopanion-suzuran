import type { Language } from 'cortico/core/language.ts';
import { describeTools, type WorldDefinition } from 'cortico/world.ts';
import { COO_GEN_DEFAULTS, type CooGenConfigSection } from './config.ts';
import { COO_GEN_TOOL_DECLS, COO_GEN_TOOL_SUMMARIES } from './tools.ts';
import { CooGenWorld } from './world.ts';

export const COO_GEN: WorldDefinition<CooGenConfigSection> = {
  id: 'coo-gen',
  label: '出图',
  defaults: () => ({ ...COO_GEN_DEFAULTS }),
  configOptions: (_kind: string, _language: Language) => [],
  // `ctx.cfg` 是 `worlds.coo-gen` 的活引用；改地址、默认模型和保存目录后下一次调用立即生效。
  create: (ctx) => new CooGenWorld({
    cfg: ctx.cfg,
    timezone: ctx.timezone,
    dataDir: ctx.dataDir,
    botDir: ctx.botDir,
    botName: ctx.botName,
    secret: ctx.secret,
    persist: (patch) => ctx.persist(patch),
  }),
  describe: {
    tools: describeTools(COO_GEN_TOOL_DECLS, COO_GEN_TOOL_SUMMARIES),
    events: [
      {
        type: 'coogen.done',
        description: {
          zh: '出图任务完成并已保存：提醒桌宠用 coo_gen_result 取回附件，把图展示在对话页，再顺着图聊一句。',
          en: 'A generation task finished and was saved; prompts the pet to fetch the attachment with coo_gen_result, show it, and continue the topic.',
        },
      },
      {
        type: 'coogen.failed',
        description: {
          zh: '出图任务失败（ComfyUI 报错、超时或保存失败）：提醒桌宠如实说明原因，别假装画好了，也别反复重试同一张。',
          en: 'A generation task failed (ComfyUI error, timeout or save failure); tells the pet to explain honestly without pretending the picture exists.',
        },
      },
    ],
  },
};
