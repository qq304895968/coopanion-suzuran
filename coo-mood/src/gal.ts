/**
 * 情境问答（Galgame）的纯数据与校验。
 *
 * 显示层复用桌面宠的 `pet_ask`：一个问题气泡 + 最多三个按钮，按钮回答以
 * `desktop-pet.answer` 回来。这里只负责把模型给出的情境/问题/选项校验成
 * 一次性题目，并在回答时把 index 映射回 mood_delta。
 */

export type GalSource = 'user' | 'auto';
export type GalLabel = 'A' | 'B' | 'C';

export interface GalChoice {
  label: GalLabel;
  text: string;
  /** -5..5，归入对话通道。 */
  moodDelta: number;
}

export interface GalDraft {
  situation: string;
  question: string;
  choices: GalChoice[];
}

export interface GalActive extends GalDraft {
  id: string;
  source: GalSource;
  startedAt: number;
  /** `pet_ask` 的 askId；绑定前为 null。 */
  askId: string | null;
}

export type GalValidation =
  | { ok: true; value: GalDraft }
  | { ok: false; error: string };

/** pet_ask 的选项上限是 40 字；留 4 个字给 “A. ” 前缀，按钮文字才不会被截断。 */
export const GAL_CHOICE_MAX = 36;
export const GAL_SITUATION_MIN = 10;
export const GAL_SITUATION_MAX = 300;
export const GAL_QUESTION_MIN = 3;
export const GAL_QUESTION_MAX = 200;

const LABELS: GalLabel[] = ['A', 'B', 'C'];

const clean = (value: unknown, maxChars: number): string =>
  (typeof value === 'string' ? value : '').replace(/\s+/g, ' ').trim().slice(0, maxChars);

/** 去掉模型可能带上的“📖 / ❓ / A.”前缀，用于匹配 pet_ask 的选项。 */
export function normalizeOption(value: string): string {
  return value
    .toLowerCase()
    .replace(/^[📖❓]\s*/u, '')
    .replace(/^[a-c]\s*[.、)）:：]\s*/i, '')
    .replace(/[\s。.!！?？,，、;；:：'"“”‘’]+/g, '')
    .trim();
}

/** pet_ask 实际显示的选项是否就是这次题目的三个选项。 */
export function optionsMatch(choices: readonly GalChoice[], askOptions: readonly string[]): boolean {
  if (askOptions.length !== choices.length) return false;
  const wanted = choices.map((choice) => normalizeOption(choice.text));
  let matched = 0;
  for (let i = 0; i < choices.length; i += 1) {
    if (normalizeOption(askOptions[i] ?? '') === wanted[i]) matched += 1;
  }
  if (matched >= 2) return true;
  // The model may shorten an option; accept a unique prefix on each side.
  let prefixMatched = 0;
  for (let i = 0; i < choices.length; i += 1) {
    const got = normalizeOption(askOptions[i] ?? '');
    const want = wanted[i] ?? '';
    if (got && want && (got.startsWith(want) || want.startsWith(got))) prefixMatched += 1;
  }
  return prefixMatched >= 2;
}

/** 把模型返回的 JSON 校验成一道题；失败时给出可直接照做的修正提示。 */
export function validateGalDraft(raw: Record<string, unknown>): GalValidation {
  const situation = clean(raw.situation, GAL_SITUATION_MAX);
  const question = clean(raw.question, GAL_QUESTION_MAX);
  if (situation.length < GAL_SITUATION_MIN) {
    return { ok: false, error: `situation 至少 ${GAL_SITUATION_MIN} 字，收到 ${situation.length} 字。` };
  }
  if (question.length < GAL_QUESTION_MIN) {
    return { ok: false, error: `question 至少 ${GAL_QUESTION_MIN} 字，收到 ${question.length} 字。` };
  }
  const rawChoices = Array.isArray(raw.choices) ? raw.choices : [];
  if (rawChoices.length !== 3) {
    return { ok: false, error: `choices 必须正好 3 个，收到 ${rawChoices.length} 个。` };
  }
  const choices: GalChoice[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < 3; i += 1) {
    const item = rawChoices[i];
    if (!item || typeof item !== 'object') {
      return { ok: false, error: `choices[${i}] 必须是 { text, mood_delta } 对象。` };
    }
    const record = item as Record<string, unknown>;
    const text = clean(record.text, GAL_CHOICE_MAX);
    if (!text) return { ok: false, error: `choices[${i}].text 不能为空。` };
    if (text.length > GAL_CHOICE_MAX) {
      return { ok: false, error: `choices[${i}].text 最多 ${GAL_CHOICE_MAX} 字。` };
    }
    const key = normalizeOption(text);
    if (seen.has(key)) return { ok: false, error: '三个选项的文字不能重复。' };
    seen.add(key);
    const rawDelta = Number(record.mood_delta ?? record.moodDelta ?? record.delta);
    if (!Number.isFinite(rawDelta)) {
      return { ok: false, error: `choices[${i}].mood_delta 需要是 -5..5 的数字。` };
    }
    const moodDelta = Math.max(-5, Math.min(5, Math.round(rawDelta)));
    choices.push({ label: LABELS[i]!, text, moodDelta });
  }
  const deltas = choices.map((choice) => choice.moodDelta);
  const max = Math.max(...deltas);
  const min = Math.min(...deltas);
  if (max <= 0 || min >= 0) {
    return { ok: false, error: '三个选项里至少要有一个正 delta 和一个负 delta（一个最好、一个最差）。' };
  }
  if (max - min < 3) {
    return { ok: false, error: `最好和最差的 delta 差距至少 3，现在是 ${max - min}。` };
  }
  return { ok: true, value: { situation, question, choices } };
}

/** pet_ask 的 question 字段：情境 + 问题显示在同一个气泡里。 */
export function galAskQuestion(active: Pick<GalActive, 'situation' | 'question'>): string {
  return `📖 ${active.situation}\n\n❓ ${active.question}`;
}

/**
 * pet_ask 的 options 字段。桌宠页给按钮加的是数字快捷键，所以把 A/B/C
 * 写进选项正文；按钮会显示成 “1 A. …”。顺序仍是 A/B/C。
 */
export function galAskOptions(choices: readonly GalChoice[]): string[] {
  return choices.map((choice) => `${choice.label}. ${choice.text}`);
}

export function findChoiceByText(choices: readonly GalChoice[], text: string): GalChoice | null {
  const wanted = normalizeOption(text);
  if (!wanted) return null;
  return choices.find((choice) => {
    const got = normalizeOption(choice.text);
    return got === wanted || got.startsWith(wanted) || wanted.startsWith(got);
  }) ?? null;
}

/** 选择后的反应语气建议；模型用它来决定短句和表情。 */
export function reactionGuidance(delta: number, mood: number): string {
  if (delta >= 4) {
    return `高兴 / 感动（+${delta}）：用 <happy> 或 <love>，说一句 10–20 字的开心反应；语气可以比平时更软。`;
  }
  if (delta >= 1) {
    return `平淡认可（+${delta}）：用 <neutral>，说一句 10–20 字的“也行 / 还不错”。`;
  }
  if (delta >= -2) {
    return `轻微失落（${delta}）：用 <sad>，说一句 10–20 字的“……哦，这样啊”；不要演苦情戏。`;
  }
  return `明显不高兴（${delta}）：用 <sad> 或 <shake>，说一句 10–20 字的气话；可以嘴硬，但不要辱骂用户。`;
}

/** 当前心情对反应的影响，附在 reactionGuidance 后面。 */
export function moodReactionNote(mood: number): string {
  if (mood >= 81) return '现在心情很好，反应可以更活泼，但别把负 delta 演成正面。';
  if (mood <= 20) return '现在心情很低，反应会更安静、更短；不要强行撒娇。';
  if (mood <= 40) return '现在心情偏低，反应收一点，不要过度热情。';
  return '按你平时的人设语气反应。';
}
