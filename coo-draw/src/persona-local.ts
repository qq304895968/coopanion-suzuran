/**
 * 人设笔触 → 本地 ComfyUI 的提示词。
 *
 * API 的画风提示词是给千问写的中文长句；本地 Krea2 的文本编码器是 Qwen3-VL，中文也能读，
 * 但手绘笔触在英文 tag 上更稳。所以这里做「中文人设 + 英文笔触 tag」的混合：
 * 画什么、什么气质、什么不能出现，仍然由人设决定；英文 tag 只负责把笔触钉住。
 *
 * 参考图有两种处理方式：
 * - describe：铃兰先看参考图写一句画什么，再按文字画（插件不碰图像理解）；
 * - img2img：参考图交给 ComfyUI 重绘，重绘幅度由配置决定。
 */
import type { StyleId } from './api/config.ts';
import type { StyleProfile } from './api/style.ts';

const STYLE_TAGS: Readonly<Record<StyleId, string>> = {
  crayon:
    'a child\'s crayon drawing on plain picture paper, thick waxy crayon strokes, wobbly uneven lines, '
    + 'colors scribbled outside the outlines, visible paper grain, naive childlike proportions, '
    + 'simple flat composition, mostly white background, earnest and innocent',
  pencil:
    'a pencil sketch on the back of a lined school notebook, soft graphite lines, a little hatching, '
    + 'eraser smudges, no color, paper creases, simple honest composition',
  marker:
    'a marker and colored-pencil sketch in a real sketchbook, clean flat color blocks, few colors, '
    + 'lots of white space, casual and restrained',
  ink:
    'a small ink-wash painting on rice paper, soft brush strokes, diluted ink with tonal variation, '
    + 'generous empty space, few details, quiet and understated',
  charcoal:
    'a charcoal sketch on rough paper, coarse strokes, strong light and shadow, charcoal dust at the edges, '
    + 'direct composition',
  pen:
    'a fine pen line drawing with a touch of pale wash on writing paper, thin steady lines, very few colors, '
    + 'sketchbook-like and restrained',
  pixel:
    'old handheld-console pixel art, low resolution, limited palette, hard pixel edges, no anti-aliasing, '
    + 'simple readable shapes',
};

const GENERIC_TAGS =
  'a hand-made picture by the persona, not an AI render, not a professional illustration, '
  + 'simple materials, imperfect but earnest';

const NEGATIVE_TAIL =
  'no text, no letters, no numbers, no signature, no watermark, no border, '
  + 'no photograph, no photorealism, no 3D render, no CGI, no HDR, no sharp focus, '
  + 'no cinematic lighting, no professional digital painting';

/** 当前画风对应的英文笔触 tag；自定义画风退回通用手绘。 */
export function styleTags(profile: StyleProfile): string {
  return profile.id === 'custom' ? GENERIC_TAGS : STYLE_TAGS[profile.id] ?? GENERIC_TAGS;
}

export interface LocalPersonaPromptInput {
  subject: string;
  /** 铃兰看参考图后写下的描述/提示词；有就优先用它当“画什么”。 */
  agentPrompt?: string;
  profile: StyleProfile;
  personaTraits: string;
  extra: string;
  hasReference: boolean;
}

/** 拼一条给本地模型的混合提示词。 */
export function buildLocalPersonaPrompt(input: LocalPersonaPromptInput): string {
  const content = (input.agentPrompt?.trim() || input.subject).trim();
  const traits = input.personaTraits.trim();
  const extra = input.extra.trim();
  const lines = [
    `${styleTags(input.profile)}.`,
    `画的内容：${content}。`,
    `这是${input.profile.label}，是画画的人自己动手画的，不是 AI 渲染。`,
  ];
  if (traits) lines.push(`气质：${traits}；这份感觉要留在笔触和构图上。`);
  if (input.hasReference) {
    lines.push('参考图只用来认人和记住场景，不要照抄照片质感、界面、文字、logo 或边框，也不要多画一个人。');
  }
  lines.push(input.profile.content);
  lines.push(NEGATIVE_TAIL);
  if (extra) lines.push(extra);
  return lines.join('\n');
}

function profileArtist(profile: StyleProfile): string {
  return profile.id === 'custom' ? '这个人自己' : profile.intro.replace(/^这幅画是/, '').replace(/，不是.*$/, '');
}


export interface ParsedLora {
  path: string;
  weight: number;
}

/** 解析 `文件名:权重, 文件名2:0.5`；最多 3 个，权重夹在 0.05–2。 */
export function parsePersonaLoras(text: string, max = 3): ParsedLora[] {
  const out: ParsedLora[] = [];
  for (const piece of text.split(/[,，;；\n]/)) {
    const item = piece.trim();
    if (!item) continue;
    const split = item.lastIndexOf(':');
    let path = item;
    let weight = 0.6;
    if (split > 0) {
      const parsed = Number(item.slice(split + 1));
      if (Number.isFinite(parsed)) {
        path = item.slice(0, split).trim();
        weight = Math.max(0.05, Math.min(2, parsed));
      }
    }
    if (!path) continue;
    out.push({ path, weight });
    if (out.length >= max) break;
  }
  return out;
}
