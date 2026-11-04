/** 本地计数：今天的张数、上次画完的时间、最近几张的元数据。图本身不落盘。 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { nowIso } from 'cortico/core/util.ts';
import type { PetDrawConfigSection } from './config.ts';

export interface DrawHistoryEntry {
  ts: string;
  subject: string;
  style: string;
  width: number;
  height: number;
  bytes: number;
  ms: number;
}

export interface DrawState {
  day: string;
  count: number;
  lastAt?: string;
  history: DrawHistoryEntry[];
  /** 本月这个插件估算花掉的额度（元）；只用于预算折算，不进给模型看的正文。 */
  spentCny: number;
  spendMonth: string;
}

export type DrawCheck =
  | { ok: true; used: number; limit: number }
  | { ok: false; code: 'quota'; used: number; limit: number }
  | { ok: false; code: 'cooldown'; used: number; limit: number; waitSeconds: number };

const HISTORY_MAX = 20;

function emptyState(day: string): DrawState {
  return { day, count: 0, history: [], spentCny: 0, spendMonth: day.slice(0, 7) };
}

function asCount(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/** 部署时区的“今天”，用 YYYY-MM-DD；时区写坏时退回 UTC 日期。 */
export function localDay(now: Date, timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now);
    const get = (type: string): string => parts.find((part) => part.type === type)?.value ?? '';
    const year = get('year');
    const month = get('month');
    const day = get('day');
    if (year && month && day) return `${year}-${month}-${day}`;
  } catch {
    // 交给下面的 UTC 兜底。
  }
  return now.toISOString().slice(0, 10);
}

export class DrawStore {
  private readonly file: string;
  private state: DrawState;
  private lastWriteError: unknown;

  constructor(
    dataDir: string,
    private readonly timeZone: string,
    now: () => Date = () => new Date(),
  ) {
    this.file = join(dataDir, 'pet-draw-state.json');
    this.state = this.load(localDay(now(), timeZone));
  }

  private load(day: string): DrawState {
    try {
      if (!existsSync(this.file)) return emptyState(day);
      const raw = JSON.parse(readFileSync(this.file, 'utf8')) as Partial<DrawState>;
      const history = Array.isArray(raw.history)
        ? raw.history.filter((item): item is DrawHistoryEntry =>
            Boolean(item) && typeof item === 'object' && typeof (item as DrawHistoryEntry).ts === 'string')
          .slice(0, HISTORY_MAX)
        : [];
      return {
        day: typeof raw.day === 'string' && raw.day ? raw.day : day,
        count: asCount(raw.count),
        lastAt: typeof raw.lastAt === 'string' ? raw.lastAt : undefined,
        history,
        spentCny: Number.isFinite(Number(raw.spentCny)) && Number(raw.spentCny) > 0 ? Number(raw.spentCny) : 0,
        spendMonth: typeof raw.spendMonth === 'string' && raw.spendMonth
          ? raw.spendMonth
          : (typeof raw.day === 'string' && raw.day ? raw.day.slice(0, 7) : day.slice(0, 7)),
      };
    } catch {
      return emptyState(day);
    }
  }

  private today(now: () => Date): DrawState {
    const day = localDay(now(), this.timeZone);
    if (this.state.day !== day) {
      const month = day.slice(0, 7);
      const sameMonth = this.state.spendMonth === month;
      this.state = {
        ...emptyState(day),
        history: this.state.history,
        spendMonth: month,
        spentCny: sameMonth ? this.state.spentCny : 0,
      };
    }
    return this.state;
  }

  filePath(): string {
    return this.file;
  }

  /** 当天快照（跨天自动归零，不写盘）。 */
  read(now: () => Date = () => new Date()): DrawState {
    const state = this.today(now);
    return { ...state, history: [...state.history] };
  }

  used(now: () => Date = () => new Date()): number {
    return this.today(now).count;
  }

  check(cfg: Pick<PetDrawConfigSection, 'dailyLimit' | 'cooldownSeconds'>, now: () => Date = () => new Date()): DrawCheck {
    const state = this.today(now);
    const limit = Math.max(0, Math.floor(cfg.dailyLimit ?? 0));
    if (limit > 0 && state.count >= limit) {
      return { ok: false, code: 'quota', used: state.count, limit };
    }
    const cooldownSeconds = Math.max(0, Math.floor(cfg.cooldownSeconds ?? 0));
    if (cooldownSeconds > 0 && state.lastAt) {
      const elapsed = now().getTime() - Date.parse(state.lastAt);
      if (Number.isFinite(elapsed) && elapsed < cooldownSeconds * 1000) {
        return {
          ok: false,
          code: 'cooldown',
          used: state.count,
          limit,
          waitSeconds: Math.max(1, Math.ceil((cooldownSeconds * 1000 - elapsed) / 1000)),
        };
      }
    }
    return { ok: true, used: state.count, limit };
  }

  /** 画成功后才调用；写盘失败不影响这一张的回执。 */
  record(
    entry: Omit<DrawHistoryEntry, 'ts'>,
    now: () => Date = () => new Date(),
    costCny = 0,
  ): DrawState {
    const state = this.today(now);
    state.count += 1;
    state.lastAt = nowIso(this.timeZone, now());
    state.history = [{ ts: state.lastAt, ...entry }, ...state.history].slice(0, HISTORY_MAX);
    if (Number.isFinite(costCny) && costCny > 0) state.spentCny += costCny;
    this.persist();
    return { ...state, history: [...state.history] };
  }

  /** 本自然月由这个插件估算花掉的额度（元）；只用于预算折算。 */
  spentThisMonth(now: () => Date = () => new Date()): number {
    const state = this.today(now);
    return state.spendMonth === localDay(now(), this.timeZone).slice(0, 7) ? state.spentCny : 0;
  }

  /** 清空今天的计数与历史（数据页的“清除”）。 */
  reset(now: () => Date = () => new Date()): void {
    this.state = emptyState(localDay(now(), this.timeZone));
    this.persist();
  }

  private persist(): void {
    try {
      mkdirSync(dirname(this.file), { recursive: true });
      const tmp = `${this.file}.tmp`;
      writeFileSync(tmp, `${JSON.stringify(this.state, null, 2)}\n`, 'utf8');
      renameSync(tmp, this.file);
      this.lastWriteError = undefined;
    } catch (error) {
      this.lastWriteError = error;
    }
  }

  /** 最近一次写盘错误；World 在回执后取走并记日志。 */
  takeWriteError(): unknown {
    const error = this.lastWriteError;
    this.lastWriteError = undefined;
    return error;
  }
}
