/**
 * 人设 → 笔触。图片提示词只描述「这是谁画的、怎么画的、画了什么」，
 * 不写人设的名字与外貌：名字一进提示词，模型就容易把角色本人画进每一张图。
 */
import type { PetDrawConfigSection, StyleId } from './config.ts';

export interface StyleProfile {
  id: StyleId | 'custom';
  /** 给人看的名字。 */
  label: string;
  /** 环境提示词里的一行短说明。 */
  short: string;
  /** 这幅画是谁、以什么态度画的。 */
  intro: string;
  /** 具体笔触、材料、纸张。 */
  body: string;
  /** 内容边界。 */
  content: string;
  /** 不希望在画面里出现的东西；最多 500 字。 */
  negative: string;
}

/** 所有画风共用的排除项。 */
const COMMON_NEGATIVE = [
  '摄影', '照片', '写实', '真实感', '3D渲染', 'CGI', '高清', '4K', '8K', 'HDR',
  '锐利对焦', '电影感', '专业插画', '精细细节', '文字', '字母', '数字', '签名',
  '水印', '印章', '边框', '视频', '分镜', '裸露', '血腥', '恐怖',
].join(', ');

const CRAYON: StyleProfile = {
  id: 'crayon',
  label: '蜡笔涂鸦',
  short: '小孩子的手笔：蜡笔、歪线、涂出边',
  intro: '这幅画是一个七八岁的小孩子自己画的，不是 AI 作品，也不是专业插画。',
  body:
    '画的是蜡笔画，画在普通的图画纸上：蜡笔笔触粗糙，线条歪歪扭扭、粗细不匀，涂色常常涂出轮廓；'
    + '颜色是明亮的基础色；比例稚拙可爱，纸面有纤维和蜡笔颗粒；构图简单直白，只画主体，背景留白或只加几笔。'
    + '整张画认真又天真。',
  content: '画面要适合小孩子：日常、想象、可爱；不画恐怖、血腥、成人内容。',
  negative: `${COMMON_NEGATIVE}, 彩铅画, 水彩, 油画, 数字绘画, 矢量图`,
};

const PENCIL: StyleProfile = {
  id: 'pencil',
  label: '铅笔速写',
  short: '中学生的铅笔速写：生涩、少量排线、本子背面',
  intro: '这幅画是一个中学生用铅笔随手画的，不是 AI 作品，也不是专业插画。',
  body:
    '画在横线作业本的背面：石墨线条生涩但认真，少量排线，偶尔有橡皮擦痕；没有上色，'
    + '纸面有横线和一点褶皱；构图简单，只画主体。',
  content: '画面像中学生的随手涂鸦：校园、朋友、想象；不画成人内容。',
  negative: `${COMMON_NEGATIVE}, 彩色, 上色, 蜡笔, 水彩, 马克笔`,
};

const MARKER: StyleProfile = {
  id: 'marker',
  label: '马克笔小插画',
  short: '成年人的速写本：马克笔、平涂、留白',
  intro: '这幅画是一个成年人随手画的，不是 AI 作品，也不是专业作品。',
  body:
    '用马克笔和一点彩铅画的小插画：线条利落但不炫技，平涂色块，颜色不多；'
    + '构图简单，留白多，像随手画在速写本上的。',
  content: '画面克制、日常，不追求写实。',
  negative: `${COMMON_NEGATIVE}, 厚涂, 超写实, 摄影级`,
};

const INK: StyleProfile = {
  id: 'ink',
  label: '水墨小品',
  short: '老人的水墨小品：淡墨、松弛、留白',
  intro: '这幅画是一位上了年纪的人随手画的小品，不是 AI 作品，也不是专业作品。',
  body:
    '用毛笔和淡墨在宣纸上画的小写意：笔触松弛，墨色有浓淡，留白多，细节少；'
    + '题材朴素，像老人随手画的。',
  content: '画面朴素、安静。',
  negative: `${COMMON_NEGATIVE}, 彩色照片, 油画, 3D, 浓艳`,
};

const CHARCOAL: StyleProfile = {
  id: 'charcoal',
  label: '炭笔速写',
  short: '粗粝的炭笔速写：明暗强、带炭粉',
  intro: '这幅画是在任务间隙用炭笔随手画的，不是 AI 作品，也不是专业作品。',
  body:
    '用炭笔在粗纸上画的速写：线条粗粝，明暗对比强，边缘有炭粉；'
    + '构图直接，像在营地随手画的。',
  content: '画面硬朗、粗粝，可以有力量感；不画血腥。',
  negative: `${COMMON_NEGATIVE}, 彩色, 干净线稿, 细腻`,
};

const PEN: StyleProfile = {
  id: 'pen',
  label: '钢笔淡彩',
  short: '钢笔线稿加一点淡彩：细、稳、像随手记录',
  intro: '这幅画是用钢笔随手记下的，不是 AI 作品，也不是专业作品。',
  body:
    '用钢笔和一点淡彩在稿纸上画的线稿：线条细而稳，颜色很少；'
    + '构图像随手记录的示意图，留白多。',
  content: '画面像随手记录的线稿，克制、准确。',
  negative: `${COMMON_NEGATIVE}, 厚涂, 油画, 3D, 浓艳`,
};

const PIXEL: StyleProfile = {
  id: 'pixel',
  label: '像素画',
  short: '老式掌机像素画：低分辨率、有限色、硬边',
  intro: '这张图像是老式掌机游戏里的画面，是自己一格一格点出来的。',
  body:
    '低分辨率像素画：有限调色板，明显的像素块，边缘没有抗锯齿，'
    + '像老式掌机游戏里的画面。',
  content: '画面像老式游戏画面，简单、有限色。',
  negative: `${COMMON_NEGATIVE}, 抗锯齿, 渐变, 高清, 写实, 3D, 厚涂`,
};

const PROFILES: Readonly<Record<StyleId, StyleProfile>> = {
  crayon: CRAYON,
  pencil: PENCIL,
  marker: MARKER,
  ink: INK,
  charcoal: CHARCOAL,
  pen: PEN,
  pixel: PIXEL,
};

const GENERIC_INTRO = '这幅画是这个人自己画的，不是 AI 作品，也不是专业插画。';
const GENERIC_CONTENT = '画面朴素、日常，不追求写实。';

function customProfile(text: string): StyleProfile {
  return {
    id: 'custom',
    label: '自定义画风',
    short: text.slice(0, 80),
    intro: GENERIC_INTRO,
    body: text,
    content: GENERIC_CONTENT,
    negative: COMMON_NEGATIVE,
  };
}

/** 当前配置下实际用的画风。style=custom 但没写内容时退回蜡笔涂鸦。 */
export function profileFor(cfg: PetDrawConfigSection): StyleProfile {
  const picked = cfg.style;
  if (picked === 'custom') {
    const text = cfg.customStyle.trim().slice(0, 600);
    return text ? customProfile(text) : CRAYON;
  }
  return PROFILES[picked] ?? CRAYON;
}

/** 当前画风的名字，用于回执、面板与环境提示词。 */
export function styleLabel(cfg: PetDrawConfigSection): string {
  return profileFor(cfg).label;
}

/** 拼图片提示词：先定「谁画的、怎么画的」，最后才是画什么。性格来自基础设定，不来自配置。 */
export function buildPrompt(subject: string, cfg: PetDrawConfigSection, personaTraits = '', hasReference = false): string {
  const profile = profileFor(cfg);

  // 有参考图时，参考图本身已经承载了外貌信息；只留画风和“画什么”，
  // 不再把整段人设、气质、纸张纹理、内容守则都塞进去，免得文字互相打架。
  if (hasReference) {
    return [
      `用${profile.label}（${profile.short}）画：${subject}。`,
      '画面里的人数以「画的内容」为准，不要额外复制同一个角色；参考图只用来认人，保留主要人物的外貌，不要照抄背景、文字、界面、logo 或边框，也不要复制第二个人物。',
    ].join('\n');
  }

  const traits = personaTraits.trim();
  const traitLine = traits
    ? `画面的气质是${traits}的，这份感觉要留在笔触里。`
    : '画面要安静、认真，不慌不忙。';
  return [
    profile.intro,
    traitLine,
    profile.body,
    `画的内容：${subject}。`,
    profile.content,
    '画面里不要出现任何文字、字母、数字、签名、水印或边框。',
  ].join('\n');
}

export function negativeFor(cfg: PetDrawConfigSection): string {
  return profileFor(cfg).negative.slice(0, 500);
}

/** 去掉换行与控制字符，留一句干净的描述。 */
export function normalizeSubject(input: unknown): string {
  if (typeof input !== 'string') return '';
  const clean = input
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return Array.from(clean).slice(0, 240).join('');
}

export type RefusalCode = 'video' | 'hd' | 'edit' | 'adult' | 'gore';

const PATTERNS: ReadonlyArray<{ code: RefusalCode; re: RegExp; reason: string }> = [
  {
    code: 'video',
    re: /视频|短片|影片|动画|动图|会动|gif|video|animation|animate|clip|mp4|webm/i,
    reason: '只会画画，不会视频、动图或者会动的画面。',
  },
  {
    code: 'hd',
    re: /高清|超清|4k|8k|2160p|1080p|蓝光|写真|照片|摄影|写实|真实照片|photo|photograph|realistic|hyperreal|\bhd\b|\buhd\b/i,
    reason: '只会画这种小画，不画高清图、照片或写实图。',
  },
  {
    code: 'edit',
    re: /修图|修一下|改图|改一下|编辑|p掉|抠图|换脸|扩图|局部重绘|image edit|retouch/i,
    reason: '只会从头画一张，不改图、不修图。',
  },
  {
    code: 'adult',
    re: /裸|色情|成人内容|nsfw|\br18\b|18\+/i,
    reason: '这个不画。',
  },
  {
    code: 'gore',
    re: /血腥|断肢|开膛|虐杀|恐怖|鬼片|gore|horror/i,
    reason: '这个不画。',
  },
];

/** 明确越界的请求直接拒绝；风格词不拦，交给固定的画风提示词压住。 */
export function refusalFor(subject: string): { code: RefusalCode; reason: string } | null {
  for (const { code, re, reason } of PATTERNS) {
    if (re.test(subject)) return { code, reason };
  }
  return null;
}
