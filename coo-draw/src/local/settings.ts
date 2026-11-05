import { join } from 'node:path';
import { ensureDir, readJson, writeJsonAtomic } from './fs-util.ts';
import type { DefaultLoRA, SavedStudioParams } from './types.ts';

/** 内置翻译词典：精确命中优先生效；用户可在 settings.json 的 dictionary 里覆盖。 */
export const BUILTIN_DICTIONARY: Readonly<Record<string, string>> = {
  塞尔达: 'zelda, princess zelda, blonde hair, pointy ears, the legend of zelda',
  林克: 'link, hero of hyrule, blonde hair, pointy ears, green tunic, the legend of zelda',
  初音未来: 'hatsune miku, twintails, aqua hair, vocaloid',
  初音: 'hatsune miku, twintails, aqua hair, vocaloid',
  猫: 'cat, cute, fluffy',
  猫猫: 'cat, cute, fluffy, kitten',
  狗: 'dog, cute, fluffy',
  海边日落: 'seaside, sunset, ocean, golden hour, horizon',
  日落: 'sunset, golden hour, sky, clouds',
  海边: 'seaside, beach, ocean, waves',
  星空: 'starry sky, night, galaxy, stars',
  樱花: 'cherry blossoms, sakura, spring, petals',
  赛博朋克: 'cyberpunk, neon lights, futuristic city, rain, night',
  机甲: 'mecha, robot, mechanical armor, science fiction',
  古风: 'chinese ancient style, hanfu, traditional, ink painting',
  水墨: 'ink wash painting, chinese painting, monochrome',
  油画: 'oil painting, textured brush strokes, classical',
  水彩: 'watercolor, soft washes, paper texture',
  像素: 'pixel art, low resolution, limited palette',
  动漫: 'anime style, cel shading, illustration',
  少女: 'young girl, cute, detailed face, anime',
  少年: 'young boy, handsome, anime',
  风景: 'landscape, scenery, detailed background',
  壁纸: 'wallpaper, wide shot, detailed background, high resolution',
  头像: 'portrait, upper body, centered, simple background',
  全身: 'full body, standing, detailed',
  铃兰: 'suzuran, arknights, fox girl, white hair, nine tails',
  明日方舟: 'arknights, anime game style',
  原神: 'genshin impact, anime style',
  春天: 'spring, flowers, fresh green, warm light',
  夏天: 'summer, blue sky, sunlight, cicada',
  秋天: 'autumn, fallen leaves, orange, golden light',
  冬天: 'winter, snow, cold light, breath',
  下雨: 'rain, wet ground, reflections, cloudy',
  雪: 'snow, winter, white, soft light',
};

export interface LoRAMeta {
  aliases?: string[];
  trigger_words?: string[];
  weight?: number;
}

export interface SettingsFile {
  version: 1;
  default_loras: DefaultLoRA[];
  lora_aliases: Record<string, string[]>;
  lora_meta: Record<string, LoRAMeta>;
  /** 用户自定义翻译，覆盖内置词典。 */
  dictionary: Record<string, string>;
  /** 出图页最后一次点击「生成」时保存的参数快照。 */
  last_params?: SavedStudioParams;
}

export const EMPTY_SETTINGS: SettingsFile = {
  version: 1,
  default_loras: [],
  lora_aliases: {},
  lora_meta: {},
  dictionary: {},
};

const MAX_ALIASES = 40;
const MAX_TEXT = 120;
const MAX_DEFAULT_LORAS = 20;

const cleanText = (value: unknown): string => (typeof value === 'string' ? value.trim().slice(0, MAX_TEXT) : '');

function cleanStringArray(value: unknown, max = MAX_ALIASES): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of value) {
    const text = cleanText(item);
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
    if (out.length >= max) break;
  }
  return out;
}

function cleanWeight(value: unknown, fallback = 0.8): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.round(Math.min(2, Math.max(0, n)) * 100) / 100;
}

export function normalizeSettings(raw: unknown): SettingsFile {
  const obj = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  const defaults: DefaultLoRA[] = [];
  if (Array.isArray(obj.default_loras)) {
    for (const item of obj.default_loras.slice(0, MAX_DEFAULT_LORAS)) {
      if (!item || typeof item !== 'object') continue;
      const entry = item as Record<string, unknown>;
      const path = cleanText(entry.path).replace(/\\/g, '/');
      if (!path) continue;
      const name = cleanText(entry.name) || path.split('/').pop()!.replace(/\.(safetensors|ckpt|pt|pth)$/i, '');
      defaults.push({
        name,
        path,
        weight: cleanWeight(entry.weight),
        trigger_words: cleanStringArray(entry.trigger_words, 24),
      });
    }
  }
  const aliases: Record<string, string[]> = {};
  if (obj.lora_aliases && typeof obj.lora_aliases === 'object' && !Array.isArray(obj.lora_aliases)) {
    for (const [key, value] of Object.entries(obj.lora_aliases as Record<string, unknown>).slice(0, 300)) {
      const name = cleanText(key);
      if (!name) continue;
      const list = cleanStringArray(value);
      if (list.length) aliases[name] = list;
    }
  }
  const meta: Record<string, LoRAMeta> = {};
  if (obj.lora_meta && typeof obj.lora_meta === 'object' && !Array.isArray(obj.lora_meta)) {
    for (const [key, value] of Object.entries(obj.lora_meta as Record<string, unknown>).slice(0, 500)) {
      const path = cleanText(key).replace(/\\/g, '/');
      if (!path || !value || typeof value !== 'object' || Array.isArray(value)) continue;
      const entry = value as Record<string, unknown>;
      const item: LoRAMeta = {};
      const a = cleanStringArray(entry.aliases);
      const t = cleanStringArray(entry.trigger_words, 40);
      if (a.length) item.aliases = a;
      if (t.length) item.trigger_words = t;
      if (entry.weight !== undefined) item.weight = cleanWeight(entry.weight);
      meta[path] = item;
    }
  }
  const dictionary: Record<string, string> = {};
  if (obj.dictionary && typeof obj.dictionary === 'object' && !Array.isArray(obj.dictionary)) {
    for (const [key, value] of Object.entries(obj.dictionary as Record<string, unknown>).slice(0, 500)) {
      const name = cleanText(key);
      const text = cleanText(value);
      if (name && text) dictionary[name] = text;
    }
  }
  const lastParams = normalizeLastParams(obj.last_params);
  return {
    version: 1,
    default_loras: defaults,
    lora_aliases: aliases,
    lora_meta: meta,
    dictionary,
    ...(lastParams ? { last_params: lastParams } : {}),
  };
}

function normalizeLastParams(raw: unknown): SavedStudioParams | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const src = raw as Record<string, unknown>;
  const out: SavedStudioParams = {};
  if (typeof src.workflow === 'string') out.workflow = src.workflow.trim().slice(0, 120);
  if (typeof src.positive === 'string') out.positive = src.positive.slice(0, 4000);
  if (typeof src.negative === 'string') out.negative = src.negative.slice(0, 4000);
  if (typeof src.checkpoint === 'string') out.checkpoint = src.checkpoint.trim().slice(0, 260);
  if (typeof src.sampler === 'string') out.sampler = src.sampler.trim().slice(0, 80);
  if (typeof src.scheduler === 'string') out.scheduler = src.scheduler.trim().slice(0, 80);
  if (Number.isFinite(Number(src.steps)) && src.steps !== '' && src.steps !== null && src.steps !== undefined) {
    out.steps = Math.max(1, Math.min(100, Math.round(Number(src.steps))));
  }
  if (Number.isFinite(Number(src.cfg)) && src.cfg !== '' && src.cfg !== null && src.cfg !== undefined) {
    out.cfg = Math.max(1, Math.min(30, Math.round(Number(src.cfg) * 100) / 100));
  }
  if (Number.isFinite(Number(src.width)) && src.width !== '' && src.width !== null && src.width !== undefined) {
    out.width = Math.max(64, Math.min(4096, Math.round(Number(src.width))));
  }
  if (Number.isFinite(Number(src.height)) && src.height !== '' && src.height !== null && src.height !== undefined) {
    out.height = Math.max(64, Math.min(4096, Math.round(Number(src.height))));
  }
  if (Number.isFinite(Number(src.batch)) && src.batch !== '' && src.batch !== null && src.batch !== undefined) {
    out.batch = Math.max(1, Math.min(8, Math.round(Number(src.batch))));
  }
  if (Number.isFinite(Number(src.seed)) && src.seed !== '' && src.seed !== null && src.seed !== undefined) {
    out.seed = Math.trunc(Number(src.seed));
  }
  if (Array.isArray(src.loras)) {
    out.loras = src.loras
      .slice(0, 50)
      .flatMap((item) => {
        if (!item || typeof item !== 'object') return [];
        const rec = item as Record<string, unknown>;
        const path = typeof rec.path === 'string' ? rec.path.trim().replace(/\\/g, '/').slice(0, 260) : '';
        if (!path) return [];
        const w = Number(rec.weight);
        const weight = Number.isFinite(w) ? Math.round(Math.min(2, Math.max(-2, w)) * 100) / 100 : 0.75;
        return [{ path, weight }];
      });
  }
  if (typeof src.inputImage === 'string') out.inputImage = src.inputImage.trim().slice(0, 500);
  if (typeof src.controlImage === 'string') out.controlImage = src.controlImage.trim().slice(0, 500);
  if (typeof src.controlNet === 'string') out.controlNet = src.controlNet.trim().slice(0, 260);
  if (Number.isFinite(Number(src.denoise)) && src.denoise !== undefined && src.denoise !== null && src.denoise !== '') {
    out.denoise = Math.max(0.05, Math.min(1, Math.round(Number(src.denoise) * 100) / 100));
  }
  if (Number.isFinite(Number(src.controlStrength)) && src.controlStrength !== undefined && src.controlStrength !== null && src.controlStrength !== '') {
    out.controlStrength = Math.max(0, Math.min(2, Math.round(Number(src.controlStrength) * 100) / 100));
  }
  if (src.custom && typeof src.custom === 'object' && !Array.isArray(src.custom)) {
    const custom: Record<string, string | number> = {};
    for (const [k, v] of Object.entries(src.custom as Record<string, unknown>).slice(0, 80)) {
      const key = k.trim().slice(0, 80);
      if (!key) continue;
      if (typeof v === 'number' && Number.isFinite(v)) custom[key] = v;
      else if (typeof v === 'string') custom[key] = v.slice(0, 500);
    }
    if (Object.keys(custom).length) out.custom = custom;
  }
  return Object.keys(out).length ? out : undefined;
}

/** settings.json 的读写与内存缓存；写失败时抛错，由面板显示。 */
export class SettingsStore {
  readonly file: string;
  private data: SettingsFile;
  private dirty = false;

  constructor(readonly dataDir: string) {
    this.file = join(dataDir, 'coo-gen', 'settings.json');
    ensureDir(join(dataDir, 'coo-gen'));
    const raw = readJson<unknown>(this.file);
    this.data = raw ? normalizeSettings(raw) : { ...EMPTY_SETTINGS };
    this.dirty = raw === null;
  }

  get(): SettingsFile {
    return this.data;
  }

  dictionary(): Record<string, string> {
    return { ...BUILTIN_DICTIONARY, ...this.data.dictionary };
  }

  save(next: SettingsFile): void {
    this.data = normalizeSettings(next);
    writeJsonAtomic(this.file, this.data);
    this.dirty = false;
  }

  setDefaults(defaults: DefaultLoRA[]): DefaultLoRA[] {
    this.data = normalizeSettings({ ...this.data, default_loras: defaults });
    writeJsonAtomic(this.file, this.data);
    return this.data.default_loras;
  }

  setAliases(aliases: Record<string, string[]>): Record<string, string[]> {
    this.data = normalizeSettings({ ...this.data, lora_aliases: aliases });
    writeJsonAtomic(this.file, this.data);
    return this.data.lora_aliases;
  }

  setLastParams(params: SavedStudioParams): SavedStudioParams | undefined {
    this.data = normalizeSettings({ ...this.data, last_params: params });
    writeJsonAtomic(this.file, this.data);
    return this.data.last_params;
  }

  setMeta(path: string, patch: LoRAMeta): SettingsFile {
    const key = path.replace(/\\/g, '/');
    const meta = { ...this.data.lora_meta };
    const next: LoRAMeta = { ...(meta[key] ?? {}) };
    if (patch.aliases !== undefined) next.aliases = cleanStringArray(patch.aliases);
    if (patch.trigger_words !== undefined) next.trigger_words = cleanStringArray(patch.trigger_words, 40);
    if (patch.weight !== undefined) next.weight = cleanWeight(patch.weight);
    if (!next.aliases?.length && !next.trigger_words?.length && next.weight === undefined) delete meta[key];
    else meta[key] = next;
    this.data = normalizeSettings({ ...this.data, lora_meta: meta });
    writeJsonAtomic(this.file, this.data);
    return this.data;
  }

  /** 把用户别名展开成「别名 -> 路径」。 */
  aliasIndex(): Record<string, string[]> {
    const out: Record<string, string[]> = {};
    for (const [alias, values] of Object.entries(this.data.lora_aliases)) {
      out[alias] = [...values];
    }
    for (const [path, meta] of Object.entries(this.data.lora_meta)) {
      for (const alias of meta.aliases ?? []) {
        (out[alias] ??= []).push(path);
      }
    }
    return out;
  }

  isDirty(): boolean {
    return this.dirty;
  }
}
