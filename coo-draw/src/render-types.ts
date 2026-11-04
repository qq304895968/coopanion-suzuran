/**
 * API 引擎与本地引擎之间的桥：只放类型，不引入任何一边的实现，避免循环依赖。
 */
import type { StyleProfile } from './api/style.ts';
import type { ReferenceImage } from './api/reference.ts';

export type DrawPurpose = 'pet' | 'diary';
export type DrawRoute = 'api' | 'local';

export interface RenderedImage {
  bytes: Uint8Array;
  mime: string;
  width: number;
  height: number;
  fileName: string;
}

export interface LocalPersonaRequest {
  subject: string;
  /** 铃兰看完参考图后写下的描述/提示词；没有就按 subject。 */
  prompt?: string;
  profile: StyleProfile;
  personaTraits: string;
  reference: ReferenceImage | null;
  purpose: DrawPurpose;
  count: number;
  signal?: AbortSignal;
}

export type LocalPersonaResult =
  | { kind: 'needPrompt'; note: string }
  | { kind: 'images'; images: RenderedImage[]; notes: string[] };

/** 本地人设笔触的运行时配置；由合并层从 `worlds.draw.persona*` 投影出来。 */
export interface PersonaRenderConfig {
  workflow: string;
  unet: string;
  clip: string;
  vae: string;
  steps: number;
  cfg: number;
  sampler: string;
  scheduler: string;
  loras: string;
  negative: string;
  extra: string;
  referenceMode: 'describe' | 'img2img';
  denoise: number;
}
