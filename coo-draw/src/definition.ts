/**
 * 「画室」的自描述：一个 World、两套引擎、两类事件。
 */
import type { Language } from 'cortico/core/language.ts';
import { describeTools, type WorldDefinition } from 'cortico/world.ts';
import { DRAW_DEFAULTS, type DrawConfigSection } from './config.ts';
import { DrawWorld } from './world.ts';
import { PET_DRAW_TOOL_DECLS } from './api/world.ts';
import { COO_GEN_TOOL_DECLS, COO_GEN_TOOL_SUMMARIES } from './local/tools.ts';

const TOOL_SUMMARIES: Record<string, { zh: string; en: string }> = {
  pet_draw: {
    zh: '按固定人设笔触画 1–4 张 512×512 的小画；画法按「桌宠主动画 / 日记配图」的路由走 API 或本地。点名人物时可搜图或截图作参考；本地参考图可先写提示词或图生图。只画图，不做视频和高清图。',
    en: 'Draw 1–4 persona-styled 512x512 pictures; the backend follows the pet/diary route (API or local). References may be searched, captured, described first or fed to img2img. Pictures only.',
  },
  pet_draw_rate: {
    zh: '把玩家对画的评价记下来，并按 favorite / like / neutral / dislike 归档到画夹。',
    en: 'Record the person\'s rating and file the drawing under favorite / like / neutral / dislike.',
  },
  pet_draw_gallery: {
    zh: '按评价、关键词或 id 翻画夹，或把某张旧画重新作为附件交回来。',
    en: 'Browse the drawing folder by rating, keyword or id, and bring an old picture back as an attachment.',
  },
  pet_draw_settings: {
    zh: '按玩家明确要求改两处画法路由、每日上限、每次最多几张、画夹目录或月度预算。',
    en: 'Change the two routes, daily limit, per-call cap, drawing folder or monthly budget when the person explicitly asks.',
  },
  pet_draw_quota: {
    zh: '查今天还能画几张、千问限流和预算折算；只按张数回答，不报金额。',
    en: 'Check remaining pictures today, the Qwen rate limit and the budget estimate; answer in pictures, never money.',
  },
  ...COO_GEN_TOOL_SUMMARIES,
};

export const DRAW: WorldDefinition<DrawConfigSection> = {
  id: 'draw',
  label: '画室',
  defaults: () => ({ ...DRAW_DEFAULTS }),
  configOptions: (kind: string, language: Language) => {
    const zh = language.startsWith('zh');
    if (kind === 'pet-draw-style') {
      return [
        { value: 'crayon', label: zh ? '蜡笔涂鸦' : 'Crayon doodle' },
        { value: 'pencil', label: zh ? '铅笔速写' : 'Pencil sketch' },
        { value: 'marker', label: zh ? '马克笔小插画' : 'Marker sketch' },
        { value: 'ink', label: zh ? '水墨小品' : 'Ink wash' },
        { value: 'charcoal', label: zh ? '炭笔速写' : 'Charcoal sketch' },
        { value: 'pen', label: zh ? '钢笔淡彩' : 'Pen and wash' },
        { value: 'pixel', label: zh ? '像素画' : 'Pixel art' },
        { value: 'custom', label: zh ? '自定义画风' : 'Custom style' },
      ];
    }
    if (kind === 'draw-route') {
      return [
        { value: 'api', label: zh ? 'API 绘画（千问）' : 'API (Qianwen)' },
        { value: 'local', label: zh ? '本地出图（ComfyUI）' : 'Local ComfyUI' },
      ];
    }
    if (kind === 'draw-persona-reference') {
      return [
        { value: 'describe', label: zh ? '先看参考图写提示词' : 'Describe first' },
        { value: 'img2img', label: zh ? '图生图' : 'img2img' },
      ];
    }
    return [];
  },
  create: (ctx) => new DrawWorld({
    cfg: ctx.cfg,
    timezone: ctx.timezone,
    dataDir: ctx.dataDir,
    botDir: ctx.botDir,
    botName: ctx.botName,
    secret: ctx.secret,
    persist: (patch) => ctx.persist(patch),
  }),
  describe: {
    tools: describeTools([...PET_DRAW_TOOL_DECLS, ...COO_GEN_TOOL_DECLS], TOOL_SUMMARIES),
    events: [
      {
        type: 'petdraw.drawn',
        description: {
          zh: '画好并保存后提醒桌宠：主动把图给对方看，用 pet_ask 问评价，再顺着画聊一句。API 和本地人设出图都会发。',
          en: 'A persona drawing was saved; prompts the pet to show it, ask for a rating with pet_ask, and continue the topic.',
        },
      },
      {
        type: 'coogen.done',
        description: {
          zh: '本地出图任务完成并已保存：提醒桌宠用 coo_gen_result 取回附件，把图展示在对话页，再顺着图聊一句。',
          en: 'A local generation task finished and was saved; prompts the pet to fetch the attachment with coo_gen_result, show it, and continue the topic.',
        },
      },
      {
        type: 'coogen.failed',
        description: {
          zh: '本地出图任务失败（ComfyUI 报错、超时或保存失败）：提醒桌宠如实说明原因，别假装画好了，也别反复重试同一张。',
          en: 'A local generation task failed (ComfyUI error, timeout or save failure); tells the pet to explain honestly without pretending the picture exists.',
        },
      },
    ],
  },
};
