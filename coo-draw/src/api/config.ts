import type { ConfigGroup } from 'cortico/core/types.ts';

/** 画风 id，与 `style` 配置的枚举值一致。 */
export type StyleId = 'crayon' | 'pencil' | 'marker' | 'ink' | 'charcoal' | 'pen' | 'pixel';

/** `worlds.pet-draw` 段。 */
export interface PetDrawConfigSection {
  enabled: boolean;
  /** 画风；默认蜡笔涂鸦。 */
  style: StyleId | 'custom';
  /** 自定义画风；style=custom 时用，最多 600 字。 */
  customStyle: string;
  /** 每天最多画几张；0 = 不限。 */
  dailyLimit: number;
  /** 一次调用最多出几张，1–4。pet_draw 的 count 会被夹到这个上限。 */
  maxImagesPerCall: number;
  /** 两次画图之间的最小间隔（秒）；0 = 不限。 */
  cooldownSeconds: number;
  /** 画夹目录；留空 = 数据目录下的 pet-draw。 */
  saveDir: string;
  /** 可选的月度画图预算（元）；0 = 不设。只用来折算“还能画大约几张”，不会把金额说出去。 */
  budgetCny: number;
  /** 画完是否在桌面自动弹一张图。 */
  popupEnabled: boolean;
  /** 弹图停留秒数，1–30。 */
  popupSeconds: number;
  /** 弹图缩放，0.3–2。 */
  popupScale: number;
  /** 点名人物时，是否允许联网搜一张参考图。 */
  referenceSearch: boolean;
  /** 用户明确要求“用屏幕/截图”时，是否允许截当前主屏作参考。 */
  referenceScreen: boolean;
}

export const PET_DRAW_DEFAULTS: PetDrawConfigSection = {
  enabled: false,
  style: 'crayon',
  customStyle: '',
  dailyLimit: 20,
  maxImagesPerCall: 1,
  cooldownSeconds: 20,
  saveDir: '',
  budgetCny: 0,
  popupEnabled: true,
  popupSeconds: 5,
  popupScale: 1,
  referenceSearch: true,
  referenceScreen: true,
};

export const PET_DRAW_CONFIG_GROUP: ConfigGroup = {
  id: 'world:pet-draw',
  owner: 'world:pet-draw',
  schema: {
    type: 'object',
    title: '绘画',
    description: '桌宠按自己的人设画小画。图片固定 512×512；不生成视频、高清图或写实照片。API Key 只从部署的 .env 读取，不写进 config.json。',
    properties: {
      'worlds.pet-draw.style': {
        type: 'string',
        title: '画风',
        description: '实际使用的画风；固定后不会因为别人要求就换风格。人设名字/性格仍从基础设定读。',
        enum: ['crayon', 'pencil', 'marker', 'ink', 'charcoal', 'pen', 'pixel', 'custom'],
        'x-options': 'pet-draw-style',
        'x-hot': true,
      },
      'worlds.pet-draw.customStyle': {
        type: 'string',
        title: '自定义画风说明',
        description: '画风选「自定义」时使用；写成一段画风说明，最多 600 字。留空会退回蜡笔涂鸦。',
        'x-hot': true,
      },
      'worlds.pet-draw.dailyLimit': {
        type: 'integer',
        title: '每天最多画几张',
        description: '0 表示不限。到上限后当天不再调用千问，回执是 [skipped]。玩家也可以在对话里让你调它。',
        minimum: 0,
        maximum: 200,
        'x-hot': true,
      },
      'worlds.pet-draw.maxImagesPerCall': {
        type: 'integer',
        title: '每次最多出几张',
        description: '1–4。pet_draw 的 count 会被夹到这个上限；默认 1，最省额度。',
        minimum: 1,
        maximum: 4,
        'x-hot': true,
      },
      'worlds.pet-draw.saveDir': {
        type: 'string',
        title: '画夹目录',
        description: '画好的图按评价存进这里（unrated / favorite / like / neutral / dislike），并写一份 index.json 给其他插件读。留空 = 数据目录下的 pet-draw。',
        'x-path': { kind: 'directory' },
        'x-hot': true,
      },
      'worlds.pet-draw.budgetCny': {
        type: 'number',
        title: '月度画图预算（元）',
        description: '0 = 不设。只用来把预算折算成“还能画大约几张”，回答时只说张数，不说金额；只统计这个插件画的图。',
        minimum: 0,
        maximum: 100000,
        'x-suffix': '元',
        'x-hot': true,
      },
      'worlds.pet-draw.popupEnabled': {
        type: 'boolean',
        title: '画完自动带图',
        description: '画好后把第一张放进桌宠头顶的气泡，气泡跟着角色走；桌宠没开时退回桌面独立窗口。多张都在对话页和画夹里。',
        'x-hot': true,
      },
      'worlds.pet-draw.popupSeconds': {
        type: 'integer',
        title: '气泡停留（秒）',
        description: '1–30；默认 5 秒。气泡按这个时间淡出。',
        minimum: 1,
        maximum: 30,
        'x-hot': true,
      },
      'worlds.pet-draw.popupScale': {
        type: 'number',
        title: '气泡尺寸缩放',
        description: '0.3–2；默认 1。长边约屏幕短边的 1/3 × 这个值。',
        minimum: 0.3,
        maximum: 2,
        'x-hot': true,
      },
      'worlds.pet-draw.referenceSearch': {
        type: 'boolean',
        title: '允许搜图参考',
        description: '玩家点名一个人物时，允许联网搜一张参考图（Bing/维基百科），只用于这一次生成，不写进画夹。',
        'x-hot': true,
      },
      'worlds.pet-draw.referenceScreen': {
        type: 'boolean',
        title: '允许截图参考',
        description: '玩家说“用屏幕/截图”，或说“记下这一刻 / 参考这一瞬间 / 照着他的样子”时，允许截当前主屏作参考；截图只留在临时文件里，读完就删。',
        'x-hot': true,
      },
      'worlds.pet-draw.cooldownSeconds': {
        type: 'integer',
        title: '两次画图的最小间隔（秒）',
        description: '0 表示不限。冷却期内回执是 [skipped]，不会调用千问。',
        minimum: 0,
        maximum: 3600,
        'x-hot': true,
      },
    },
  },
};
