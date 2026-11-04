/**
 * 主动性：每一步的建议、商店排序、催更文案。
 *
 * 全部是启发式，输入只有操作者报来的对局状态 + 本机导入的黑流树海统计。
 * 文案里必须能看出「依据是什么」，不把推测说成规则。
 */
import { findItem, nodeTypeShare, poolsWithItem } from './blackstream.ts';
import type { RunState } from './store.ts';

const RARITY_SCORE: Record<string, number> = { SUPER_RARE: 3, RARE: 2, NORMAL: 1 };
const RARITY_LABEL: Record<string, string> = { SUPER_RARE: '超稀有', RARE: '稀有', NORMAL: '普通' };

const NODE_RULES: Array<{ match: RegExp; advice: string }> = [
  { match: /紧急/, advice: '紧急作战收益高但翻车成本也高；血少或阵容没齐时可以先绕。' },
  { match: /作战/, advice: '作战是这一层的主要资源来源，阵容能打就优先吃。' },
  { match: /商店|行商|商/, advice: '先别急着买：把候选报给我，用 arknights_shop_advise 排个序，再决定花多少。' },
  { match: /不期而遇|事件/, advice: '事件选项先看代价：掉生命、掉希望或加负面状态的，先算这局还扛不扛得住。' },
  { match: /安全|空地|休息|补给/, advice: '补给点优先补短板：血、希望、或者缺的那个位置。' },
  { match: /险路|恶敌|首领|boss/i, advice: '高风险节点，进去前确认阵容完整、血够，别为了贪一步把整局送掉。' },
];

export function nodeRule(node: string | undefined): string | undefined {
  if (!node) return undefined;
  return NODE_RULES.find((rule) => rule.match.test(node))?.advice;
}

function floorShare(floor: number): string {
  const rows = nodeTypeShare(floor).slice(0, 3);
  if (!rows.length) return '';
  return rows.map((row) => `${row.name} ${(row.share * 100).toFixed(0)}%`).join('、');
}

/** 每次状态更新后立刻给的建议：现状 + 依据 + 下一步。 */
export function nextStepAdvice(run: RunState): string {
  const lines: string[] = [];
  const share = floorShare(run.floor);
  if (share) lines.push(`这一层的节点构成（社区样本）：${share}。`);

  if (run.node) {
    const rule = nodeRule(run.node);
    lines.push(rule ? `你当前在「${run.node}」：${rule}` : `你当前在「${run.node}」。`);
  }

  const hints: string[] = [];
  if (run.life !== undefined && run.life <= 2) hints.push('血只剩一点，接下来优先保命节点，别硬吃紧急作战');
  if (run.hope !== undefined && run.hope <= 2) hints.push('希望紧张，招募要挑能立刻上场的');
  if (run.ingots !== undefined && run.ingots >= 20) hints.push('源石锭不少，商店里可以挑能改变战力的而不是纯数值');
  if (!run.operators.length) hints.push('还没记阵容，报一下已招的干员，我才能判断缺什么');

  if (hints.length) lines.push(`按你现在的情况：${hints.join('；')}。`);
  if (run.node && /商店|行商|商/.test(run.node)) lines.push('把店里的候选报给我（或直接说三个名字），我按稀有度、所属池和你的资源排序。');
  if (!run.node) lines.push('下一步准备走哪种节点？报一句就行，我直接说走不走、为什么。');
  return lines.join('\n');
}

/** 3 分钟没动静时主动催一次：带上一层的节点构成，别只问「在吗」。 */
export function nudgeText(run: RunState, minutes: number): string {
  const share = floorShare(run.floor);
  const where = `${run.themeName}${run.squad ? ` · ${run.squad}` : ''}，第 ${run.floor} 层`;
  const parts = [`已经 ${minutes} 分钟没更新了（${where}）。`];
  if (share) parts.push(`这一层目前样本里常见的是：${share}。`);
  parts.push(run.node ? `还在「${run.node}」吗？下一步走哪边？` : '下一步走哪种节点？说一句我就给建议。');
  return parts.join('');
}

export interface ShopOffer {
  name: string;
  found: boolean;
  score: number;
  rarity?: string;
  reasons: string[];
}

const SYNERGY: Array<{ test: (run: RunState) => boolean; words: string[]; reason: string }> = [
  { test: (run) => (run.life ?? 99) <= 2, words: ['生命', '防御', '护盾', '阻挡'], reason: '血少，保命优先' },
  { test: (run) => (run.hope ?? 99) <= 2, words: ['希望'], reason: '希望紧张' },
  { test: (run) => (run.ingots ?? 0) >= 20, words: ['源石锭', '商店', '购买'], reason: '钱多，可考虑经济类' },
];

/** 商店候选排序：稀有度打底，再按当前资源补正；每一条都给理由。 */
export function rankShopOffers(offers: string[], run: RunState): ShopOffer[] {
  return offers
    .map((name) => {
      const item = findItem(name) ?? findItem(name.replace(/\s+/g, ''));
      if (!item) {
        return { name, found: false, score: 0, reasons: ['资料里没这件，名字可能不完整；按优先级自己判断'] };
      }
      const reasons: string[] = [];
      let score = RARITY_SCORE[item.rarity ?? ''] ?? 0;
      if (item.rarity) reasons.push(RARITY_LABEL[item.rarity] ?? item.rarity);

      const pools = poolsWithItem(item.id).map((pool) => pool.name);
      if (pools.some((pool) => /珍宝|收藏品/.test(pool))) {
        score += 1;
        reasons.push('属于高价值池');
      }

      const effect = item.effect ?? '';
      for (const rule of SYNERGY) {
        if (!rule.test(run)) continue;
        if (rule.words.some((word) => effect.includes(word))) {
          score += 1;
          reasons.push(rule.reason);
        }
      }

      return { name: item.name, found: true, score, rarity: item.rarity, reasons };
    })
    .sort((a, b) => b.score - a.score);
}
