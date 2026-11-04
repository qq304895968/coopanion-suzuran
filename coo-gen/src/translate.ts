/** 提示词翻译：词典精确/包含命中优先，其次可选的 OpenAI 兼容端点，最后原文直出。 */

export interface TranslateOptions {
  dictionary: Record<string, string>;
  /** OpenAI 兼容的根地址，例如 http://127.0.0.1:11434/v1 */
  url?: string;
  model?: string;
  apiKey?: string;
  timeoutSeconds?: number;
  fetchImpl?: typeof fetch;
}

export interface TranslateResult {
  prompt: string;
  source: 'dictionary' | 'llm' | 'raw';
  body: string;
  warnings: string[];
}

function cleanTags(text: string): string {
  return text
    .replace(/^```[a-z]*\s*/i, '')
    .replace(/```$/i, '')
    .replace(/^\s*(prompt|tags|output)\s*[:：]\s*/i, '')
    .replace(/\s+/g, ' ')
    .replace(/[。；;]+/g, ',')
    .split(',')
    .map((tag) => tag.trim().replace(/^["'`]+|["'`]+$/g, ''))
    .filter((tag) => tag.length > 0 && tag.length <= 120)
    .filter((tag) => !/^(here|sure|certainly|the translated|translation)/i.test(tag))
    .slice(0, 80)
    .join(', ');
}

/** 用词典把中文短语翻成 tag；长词优先，避免「猫」先于「猫猫」。 */
export function dictionaryTranslate(raw: string, dictionary: Record<string, string>): { text: string; hits: string[] } {
  const text = raw.normalize('NFKC');
  const entries = Object.entries(dictionary)
    .filter(([key, value]) => key && value)
    .sort((a, b) => b[0].length - a[0].length);
  const exact = entries.find(([key]) => key.toLowerCase() === text.trim().toLowerCase());
  if (exact) return { text: exact[1], hits: [exact[0]] };
  const pieces: string[] = [];
  const hits: string[] = [];
  for (const [key, value] of entries) {
    if (key.length >= 1 && text.includes(key)) {
      pieces.push(value);
      hits.push(key);
    }
  }
  return { text: pieces.join(', '), hits };
}

function endpoint(url: string): string {
  const base = url.replace(/\/+$/, '');
  if (/\/chat\/completions$/i.test(base)) return base;
  return `${base}/chat/completions`;
}

async function llmTranslate(raw: string, opts: TranslateOptions): Promise<string | null> {
  if (!opts.url || !opts.model) return null;
  const fetchImpl = opts.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.max(3, opts.timeoutSeconds ?? 12) * 1000);
  timeout.unref?.();
  try {
    const response = await fetchImpl(endpoint(opts.url), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(opts.apiKey ? { authorization: `Bearer ${opts.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: opts.model,
        temperature: 0.2,
        max_tokens: 300,
        messages: [
          {
            role: 'system',
            content: 'You translate an image request into comma-separated English Danbooru/Stable Diffusion tags. Keep names, works and visual details. Output tags only, no explanation, no quotes.',
          },
          { role: 'user', content: raw },
        ],
      }),
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const body = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = body.choices?.[0]?.message?.content;
    if (typeof content !== 'string') return null;
    const cleaned = cleanTags(content);
    return cleaned || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function uniqueTags(parts: string[]): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of parts) {
    for (const tag of part.split(',')) {
      const key = tag.trim();
      if (!key) continue;
      const lower = key.toLowerCase();
      if (seen.has(lower)) continue;
      seen.add(lower);
      out.push(key);
    }
  }
  return out.join(', ');
}

export async function translatePrompt(
  subject: string,
  styleHint: string | undefined,
  extraTags: string[],
  opts: TranslateOptions,
): Promise<TranslateResult> {
  const warnings: string[] = [];
  const raw = [subject, styleHint ?? '', ...extraTags].filter((part) => part && part.trim()).join(', ');
  if (!raw.trim()) return { prompt: '', source: 'raw', body: '', warnings };
  const dict = dictionaryTranslate(raw, opts.dictionary);
  let body = dict.text;
  let source: TranslateResult['source'] = dict.hits.length ? 'dictionary' : 'raw';
  if (!decided(dict.hits, raw) && opts.url && opts.model) {
    const translated = await llmTranslate(raw, opts);
    if (translated) {
      body = uniqueTags([dict.text, translated]);
      source = 'llm';
    } else {
      warnings.push('翻译端点没返回可用结果，原文直接作为 prompt');
    }
  }
  if (!body.trim()) {
    body = raw;
    source = 'raw';
  }
  return { prompt: body.trim(), source, body: body.trim(), warnings };
}

/** 词典命中是否已经覆盖全部中文：没有中文残留就不再调用 LLM。 */
function decided(hits: string[], raw: string): boolean {
  if (!hits.length) return false;
  // 命中至少一个两字以上的词，且剩余文本里没有连续中文时，认为翻完了。
  const stripped = hits.reduce((text, hit) => text.replace(hit, ' '), raw);
  return !/[\u3400-\u9fff]{2,}/.test(stripped);
}

export function composePrompt(prefix: string, body: string, suffix: string): string {
  return uniqueTags([prefix, body, suffix]);
}

export interface LoRACandidate {
  path: string;
  name: string;
  category?: string;
  aliases?: string[];
  trigger_words?: string[];
}

export interface LoRAPick {
  name: string;
  weight: number;
  reason: string;
}

/** 兜底语义匹配：把 LoRA 列表发给已配置的 OpenAI 兼容端点，让它选 0–2 个。 */
export async function selectLorasWithLlm(
  request: string,
  candidates: LoRACandidate[],
  opts: TranslateOptions,
): Promise<LoRAPick[]> {
  if (!opts.url || !opts.model || !candidates.length) return [];
  const fetchImpl = opts.fetchImpl ?? fetch;
  const list = candidates.slice(0, 60).map((item) => {
    const bits = [item.path];
    if (item.aliases?.length) bits.push(`aliases=${item.aliases.join('/')}`);
    if (item.trigger_words?.length) bits.push(`triggers=${item.trigger_words.slice(0, 6).join('/')}`);
    return `- ${bits.join(' | ')}`;
  }).join('\n');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.max(3, opts.timeoutSeconds ?? 12) * 1000);
  timeout.unref?.();
  try {
    const response = await fetchImpl(endpoint(opts.url), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(opts.apiKey ? { authorization: `Bearer ${opts.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: opts.model,
        temperature: 0.1,
        max_tokens: 300,
        messages: [
          {
            role: 'system',
            content: 'You pick LoRAs for an image-generation request. Return JSON only, exactly: {"selected":[{"name":"lora_filename","weight":0.7,"reason":"..."}]}. Pick 0-2. If nothing fits, return {"selected":[]}. Never invent a name.',
          },
          { role: 'user', content: `用户想要一张图片，描述为: "${request}"\n\n以下是可用的 LoRA 列表：\n${list}\n\n请从中选择 0-2 个最匹配的 LoRA。` },
        ],
      }),
      signal: controller.signal,
    });
    if (!response.ok) return [];
    const body = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = body.choices?.[0]?.message?.content ?? '';
    const start = content.indexOf('{');
    const end = content.lastIndexOf('}');
    if (start < 0 || end <= start) return [];
    const parsed = JSON.parse(content.slice(start, end + 1)) as { selected?: unknown };
    if (!Array.isArray(parsed.selected)) return [];
    const out: LoRAPick[] = [];
    for (const item of parsed.selected.slice(0, 2)) {
      if (!item || typeof item !== 'object') continue;
      const entry = item as Record<string, unknown>;
      const name = typeof entry.name === 'string' ? entry.name.trim() : '';
      if (!name) continue;
      const weight = Math.min(2, Math.max(0.05, Number(entry.weight) || 0.7));
      out.push({ name, weight, reason: typeof entry.reason === 'string' ? entry.reason.slice(0, 120) : 'LLM 语义' });
    }
    return out;
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}
