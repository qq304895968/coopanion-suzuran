/**
 * 随包发布的本地资料：干员技能/天赋（由 `scripts/build-operators.mjs` 从 PRTS 生成）
 * 与集成战略主题/通用思路（人工整理）。运行时不联网。
 */
import { readFileSync } from 'node:fs';

export interface OperatorSkill {
  name: string;
  charge: string;
  trigger: string;
  /** 七级时的描述。 */
  description: string;
  /** 专精三时的描述（没有专精数据时为空）。 */
  descriptionM3: string;
  sp: { initial?: number; cost?: number; duration?: number };
  spM3: { initial?: number; cost?: number; duration?: number };
  range?: string;
  remark?: string;
}

export interface OperatorTalent {
  name: string;
  condition: string;
  effect: string;
}

export interface OperatorRecord {
  id: string;
  name: string;
  stars?: number;
  profession: string;
  branch: string;
  position: string;
  tags: string[];
  trait: string;
  stats: {
    hp?: number;
    atk?: number;
    def?: number;
    res?: number;
    cost: string;
    block?: number;
    interval: string;
    redeploy: string;
  };
  talents: OperatorTalent[];
  skills: OperatorSkill[];
  source: string;
}

export interface IsTheme {
  id: string;
  name: string;
  order: number;
  summary: string;
  prts: string;
}

export type TipPhase = 'early' | 'mid' | 'late' | 'any';

export interface IsTip {
  id: string;
  phase: TipPhase;
  tags: string[];
  text: string;
}

interface OperatorsFile {
  generatedAt: string;
  count: number;
  operators: OperatorRecord[];
}

interface IsFile {
  note: string;
  source: string;
  themes: IsTheme[];
  tips: IsTip[];
}

let operatorsCache: OperatorsFile | undefined;
let isCache: IsFile | undefined;
let operatorIndex: Map<string, OperatorRecord> | undefined;

function readJson<T>(relative: string): T {
  const url = new URL(relative, import.meta.url);
  return JSON.parse(readFileSync(url, 'utf8')) as T;
}

export function operatorsData(): OperatorsFile {
  operatorsCache ??= readJson<OperatorsFile>('./data/operators.json');
  return operatorsCache;
}

export function isData(): IsFile {
  isCache ??= readJson<IsFile>('./data/is.json');
  return isCache;
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '');
}

function index(): Map<string, OperatorRecord> {
  if (!operatorIndex) {
    operatorIndex = new Map();
    for (const op of operatorsData().operators) {
      operatorIndex.set(normalize(op.name), op);
      operatorIndex.set(normalize(op.id), op);
    }
  }
  return operatorIndex;
}

export function operatorCount(): number {
  return operatorsData().operators.length;
}

export function dataGeneratedAt(): string {
  return operatorsData().generatedAt.slice(0, 10);
}

/** 精确命中优先，其次名称包含、职业/分支/标签包含。 */
export function searchOperators(query: string, limit = 8): OperatorRecord[] {
  const q = normalize(query);
  if (!q) return [];
  const exact = index().get(q);
  const scored: Array<{ op: OperatorRecord; score: number }> = [];
  for (const op of operatorsData().operators) {
    const name = normalize(op.name);
    let score = 0;
    if (name === q) score = 100;
    else if (name.startsWith(q)) score = 80;
    else if (name.includes(q)) score = 60;
    else if (normalize(op.branch).includes(q)) score = 40;
    else if (normalize(op.profession).includes(q)) score = 30;
    else if (op.tags.some((tag) => normalize(tag).includes(q))) score = 20;
    else if (normalize(op.id).includes(q)) score = 10;
    if (score > 0) scored.push({ op, score });
  }
  scored.sort((a, b) => b.score - a.score || (b.op.stars ?? 0) - (a.op.stars ?? 0));
  const results = exact ? [exact, ...scored.filter((s) => s.op !== exact).map((s) => s.op)] : scored.map((s) => s.op);
  return results.slice(0, limit);
}

export function findOperator(query: string): OperatorRecord | undefined {
  return index().get(normalize(query));
}

export function findTheme(query: string): IsTheme | undefined {
  const q = normalize(query);
  const themes = isData().themes;
  return themes.find((t) => normalize(t.id) === q || normalize(t.name) === q) ?? themes.find((t) => normalize(t.name).includes(q));
}

export function phaseForFloor(floor: number): Exclude<TipPhase, 'any'> {
  if (floor <= 1) return 'early';
  if (floor <= 3) return 'mid';
  return 'late';
}

export interface AdviceInput {
  theme?: string;
  floor?: number;
  squad?: string;
}

/** 这一局当前阶段用得上的思路：主题一句 + 阶段 tips + 通用 tips。 */
export function adviceFor(input: AdviceInput, limit = 6): { theme?: IsTheme; tips: IsTip[] } {
  const theme = input.theme ? findTheme(input.theme) : undefined;
  const phase = phaseForFloor(input.floor ?? 1);
  const tips = isData().tips.filter((tip) => tip.phase === phase || tip.phase === 'any');
  return { theme, tips: tips.slice(0, limit) };
}

export function searchTips(query: string, limit = 6): IsTip[] {
  const q = normalize(query);
  if (!q) return [];
  return isData()
    .tips.filter((tip) => normalize(tip.text).includes(q) || tip.tags.some((tag) => normalize(tag).includes(q)))
    .slice(0, limit);
}

export function searchThemes(query: string, limit = 6): IsTheme[] {
  const q = normalize(query);
  if (!q) return isData().themes.slice(0, limit);
  return isData()
    .themes.filter(
      (theme) =>
        normalize(theme.name).includes(q) || normalize(theme.id).includes(q) || normalize(theme.summary).includes(q),
    )
    .slice(0, limit);
}

/* ------------------------------------------------------------- formatting */

const np = (value: number | undefined) => (value === undefined ? '—' : String(value));

function spText(sp: OperatorSkill['spM3'] | OperatorSkill['sp']): string {
  const parts: string[] = [];
  if (sp.initial !== undefined) parts.push(`初动 ${sp.initial}`);
  if (sp.cost !== undefined) parts.push(`消耗 ${sp.cost}`);
  if (sp.duration !== undefined) parts.push(`持续 ${sp.duration} 秒`);
  return parts.length ? parts.join(' / ') : '—';
}

export function formatOperator(op: OperatorRecord): string {
  const head = `${op.name}（${op.stars ? `${op.stars}★ ` : ''}${op.profession}·${op.branch}，${op.position || '—'}）`;
  const stats = [
    `生命 ${np(op.stats.hp)}`,
    `攻击 ${np(op.stats.atk)}`,
    `防御 ${np(op.stats.def)}`,
    `法抗 ${np(op.stats.res)}`,
  ].join(' / ');
  const lines = [head, `特性：${op.trait || '—'}`, `属性（满级）：${stats}；部署费用 ${op.stats.cost || '—'}；阻挡 ${np(op.stats.block)}`];

  if (op.talents.length) {
    lines.push('天赋：');
    for (const talent of op.talents) lines.push(`- ${talent.name}（${talent.condition}）：${talent.effect || '—'}`);
  }
  if (op.skills.length) {
    lines.push('技能：');
    op.skills.forEach((skill, i) => {
      const type = [skill.charge, skill.trigger].filter(Boolean).join('/');
      const text = skill.descriptionM3 || skill.description || '—';
      const sp = spText(skill.spM3.cost !== undefined ? skill.spM3 : skill.sp);
      lines.push(`${i + 1}. ${skill.name}（${type}；${sp}）：${text}`);
    });
  } else {
    lines.push('技能：该干员没有技能。');
  }
  lines.push(`来源：${op.source}`);
  return lines.join('\n');
}

export function formatTheme(theme: IsTheme): string {
  return `${theme.name}（集成战略 #${theme.order}）：${theme.summary}\n来源：${theme.prts}`;
}

export function formatTip(tip: IsTip): string {
  return `- [${tip.tags.join('、')}] ${tip.text}`;
}
