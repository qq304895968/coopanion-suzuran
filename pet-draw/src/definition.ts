import type { Language } from 'cortico/core/language.ts';
import { describeTools, type WorldDefinition } from 'cortico/world.ts';
import { PET_DRAW_DEFAULTS, type PetDrawConfigSection } from './config.ts';
import { PET_DRAW_TOOL_DECLS, PetDrawWorld } from './world.ts';

/** 工具的一句话说明，给人看；工具描述本身是给模型的。 */
const TOOL_SUMMARIES = {
  pet_draw: {
    zh: '按固定画风画 1–4 张 512×512 的小画（默认蜡笔涂鸦）；点名人物时可搜图或截图作参考，搜不到就按文字画。只画图，不做视频和高清图。',
    en: 'Draw 1–4 512x512 pictures in the configured style (crayon doodle by default); when a named person is requested, search or screenshot a reference first, otherwise draw from text. Pictures only, never video or HD.',
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
    zh: '按玩家明确要求改每日上限、每次最多几张、画夹目录或月度预算。',
    en: 'Change the daily limit, per-call cap, drawing folder or monthly budget when the person explicitly asks.',
  },
  pet_draw_quota: {
    zh: '查今天还能画几张、千问限流和预算折算；只按张数回答，不报金额。',
    en: 'Check remaining pictures today, the Qwen rate limit and the budget estimate; answer in pictures, never money.',
  },
} as const;

const STYLE_OPTIONS = (zh: boolean): Array<{ value: string; label: string }> => [
  { value: 'crayon', label: zh ? '蜡笔涂鸦' : 'Crayon doodle' },
  { value: 'pencil', label: zh ? '铅笔速写' : 'Pencil sketch' },
  { value: 'marker', label: zh ? '马克笔小插画' : 'Marker sketch' },
  { value: 'ink', label: zh ? '水墨小品' : 'Ink wash' },
  { value: 'charcoal', label: zh ? '炭笔速写' : 'Charcoal sketch' },
  { value: 'pen', label: zh ? '钢笔淡彩' : 'Pen and wash' },
  { value: 'pixel', label: zh ? '像素画' : 'Pixel art' },
  { value: 'custom', label: zh ? '自定义画风' : 'Custom style' },
];

export const PET_DRAW: WorldDefinition<PetDrawConfigSection> = {
  id: 'pet-draw',
  label: '绘画',
  defaults: () => ({ ...PET_DRAW_DEFAULTS }),
  configOptions: (kind: string, language: Language) => {
    if (kind === 'pet-draw-style') return STYLE_OPTIONS(language.startsWith('zh'));
    return [];
  },
  // `ctx.cfg` 是 `worlds.pet-draw` 的活引用：改人设、画风和上限后下一次调用立即生效。
  create: (ctx) => new PetDrawWorld({
    cfg: ctx.cfg,
    timezone: ctx.timezone,
    dataDir: ctx.dataDir,
    botDir: ctx.botDir,
    botName: ctx.botName,
    secret: ctx.secret,
  }),
  describe: {
    tools: describeTools(PET_DRAW_TOOL_DECLS, TOOL_SUMMARIES),
    events: [
      {
        type: 'petdraw.drawn',
        description: {
          zh: '画好并保存后提醒桌宠：主动把图给对方看，用 pet_ask 问评价，再顺着画聊一句。',
          en: 'A drawing was saved; prompts the pet to show it, ask for a rating with pet_ask, and continue the topic.',
        },
      },
    ],
  },
};
