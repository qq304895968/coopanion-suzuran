/**
 * Mood persistence and the daily lifecycle.
 *
 * One JSON file holds the live value, today's channel totals, the last few changes and
 * up to 90 daily settlements. Writes are atomic (temp file + rename). A corrupt file is
 * moved aside rather than overwritten, so a bad read never destroys history silently.
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { nowIso } from 'cortico/core/util.ts';
import {
  bandFor,
  clamp,
  nextBaseline,
  round1,
  type Band,
  type Emotion,
  type ResolvedPersona,
} from './model.ts';
import type { MoodConfigSection } from './config.ts';

export type DeltaSource = 'dialogue' | 'browse' | 'attention' | 'event';
export type Channel = 'dialogue' | 'browse' | 'attention' | 'event';

export interface ChannelTotals {
  pos: number;
  neg: number;
}

export interface DayState {
  /** Deployment-timezone date, YYYY-MM-DD. */
  date: string;
  /** Baseline this day started from (after the drift, before noise). */
  baseline: number;
  /** Previous day's final value. */
  baselineFrom: number;
  /** Daily Gaussian nudge. */
  noise: number;
  high: number;
  low: number;
  dialogue: ChannelTotals;
  browse: ChannelTotals;
  attention: ChannelTotals;
  event: ChannelTotals;
  /** Attention steps already charged today. */
  idleSteps: number;
  /** Whether the one-off "very long absence" penalty was charged. */
  extraCharged: boolean;
  /** ms timestamp: the pet reached out and is waiting for a reply. */
  proactiveAt: number | null;
  /** ms timestamp: last "the person started a conversation" bonus. */
  lastAttentionBonusAt: number;
  /** ms timestamp: last user interaction. */
  lastUserAt: number;
  /** Number of user messages seen today. */
  interactions: number;
  /** Situation quizzes started today (user or automatic). */
  galStarted: number;
  /** Situation quizzes answered today. */
  galAnswered: number;
  /** Situation quizzes closed/timed out today. */
  galDismissed: number;
  /** ms timestamp: last automatic quiz hint. */
  galLastHintAt: number;
  /** ms timestamp: last quiz started. */
  galLastStartedAt: number;
}

export interface MoodHistoryEntry {
  date: string;
  final_value: number;
  high: number;
  low: number;
  delta_breakdown: {
    dialogue: number;
    browse: number;
    attention: number;
    event: number;
    persona_regression: number;
    noise: number;
  };
  baseline: number;
  interactions: number;
}

export interface RecentChange {
  at: string;
  atMs: number;
  source: DeltaSource;
  delta: number;
  before: number;
  after: number;
  reason: string;
  capped?: boolean;
}

export interface MoodState {
  version: 1;
  value: number;
  /** Fractional carry so a sequence of small deltas still moves an integer value. */
  pending: number;
  lastUpdated: string;
  day: DayState;
  history: MoodHistoryEntry[];
  recent: RecentChange[];
  /** Consecutive settled days ending at or below 10. */
  lowDays: number;
  lastLowDate: string;
  selfRescueAt: string | null;
  lastEmotion: { emotion: Emotion; at: string } | null;
  lastSnapshotValue: number;
  lastSnapshotAt: string;
}

export interface ApplyResult {
  before: number;
  after: number;
  applied: number;
  capped: boolean;
  bandBefore: Band;
  bandAfter: Band;
  bandChanged: boolean;
}

export interface RolloverResult {
  settled: MoodHistoryEntry[];
  reset: { date: string; from: number; baseline: number; noise: number; value: number } | null;
  selfRescue: boolean;
}

export interface MoodStoreOptions {
  dataDir: string;
  timezone: string;
  now?: () => Date;
  random?: () => number;
}

const STATE_FILE = 'mood/state.json';
const MAX_RECENT = 40;
const MAX_HISTORY = 90;

export function dateIn(timezone: string, at: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(at);
  const pick = (type: Intl.DateTimeFormatPartTypes): string => parts.find((part) => part.type === type)?.value ?? '';
  return `${pick('year')}-${pick('month')}-${pick('day')}`;
}

export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`;
}

function emptyTotals(): ChannelTotals {
  return { pos: 0, neg: 0 };
}

function emptyDay(date: string, value: number, lastUserAt: number): DayState {
  return {
    date,
    baseline: value,
    baselineFrom: value,
    noise: 0,
    high: value,
    low: value,
    dialogue: emptyTotals(),
    browse: emptyTotals(),
    attention: emptyTotals(),
    event: emptyTotals(),
    idleSteps: 0,
    extraCharged: false,
    proactiveAt: null,
    lastAttentionBonusAt: 0,
    lastUserAt,
    interactions: 0,
    galStarted: 0,
    galAnswered: 0,
    galDismissed: 0,
    galLastHintAt: 0,
    galLastStartedAt: 0,
  };
}

function freshState(date: string, value: number, lastUserAt: number): MoodState {
  return {
    version: 1,
    value,
    pending: 0,
    lastUpdated: '',
    day: emptyDay(date, value, lastUserAt),
    history: [],
    recent: [],
    lowDays: 0,
    lastLowDate: '',
    selfRescueAt: null,
    lastEmotion: null,
    lastSnapshotValue: -1,
    lastSnapshotAt: '',
  };
}

const finite = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

function totalsOf(raw: unknown): ChannelTotals {
  const record = (raw ?? {}) as Record<string, unknown>;
  return { pos: Math.max(0, finite(record.pos, 0)), neg: Math.max(0, finite(record.neg, 0)) };
}

function sanitizeDay(raw: unknown, fallbackDate: string, value: number, lastUserAt: number): DayState {
  if (!raw || typeof raw !== 'object') return emptyDay(fallbackDate, value, lastUserAt);
  const day = raw as Record<string, unknown>;
  const date = typeof day.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day.date) ? day.date : fallbackDate;
  const high = finite(day.high, value);
  const low = finite(day.low, value);
  return {
    date,
    baseline: finite(day.baseline, value),
    baselineFrom: finite(day.baselineFrom, value),
    noise: finite(day.noise, 0),
    high: clamp(high, 0, 100),
    low: clamp(low, 0, 100),
    dialogue: totalsOf(day.dialogue),
    browse: totalsOf(day.browse),
    attention: totalsOf(day.attention),
    event: totalsOf(day.event),
    idleSteps: Math.max(0, Math.floor(finite(day.idleSteps, 0))),
    extraCharged: day.extraCharged === true,
    proactiveAt: typeof day.proactiveAt === 'number' ? day.proactiveAt : null,
    lastAttentionBonusAt: finite(day.lastAttentionBonusAt, 0),
    lastUserAt: finite(day.lastUserAt, lastUserAt),
    interactions: Math.max(0, Math.floor(finite(day.interactions, 0))),
    galStarted: Math.max(0, Math.floor(finite(day.galStarted, 0))),
    galAnswered: Math.max(0, Math.floor(finite(day.galAnswered, 0))),
    galDismissed: Math.max(0, Math.floor(finite(day.galDismissed, 0))),
    galLastHintAt: finite(day.galLastHintAt, 0),
    galLastStartedAt: finite(day.galLastStartedAt, 0),
  };
}

function sanitizeHistory(raw: unknown): MoodHistoryEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: MoodHistoryEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const entry = item as Record<string, unknown>;
    if (typeof entry.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) continue;
    const breakdown = (entry.delta_breakdown ?? {}) as Record<string, unknown>;
    out.push({
      date: entry.date,
      final_value: clamp(finite(entry.final_value, 0), 0, 100),
      high: clamp(finite(entry.high, 0), 0, 100),
      low: clamp(finite(entry.low, 0), 0, 100),
      delta_breakdown: {
        dialogue: finite(breakdown.dialogue, 0),
        browse: finite(breakdown.browse, 0),
        attention: finite(breakdown.attention, 0),
        event: finite(breakdown.event, 0),
        persona_regression: finite(breakdown.persona_regression, 0),
        noise: finite(breakdown.noise, 0),
      },
      baseline: finite(entry.baseline, 0),
      interactions: Math.max(0, Math.floor(finite(entry.interactions, 0))),
    });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date)).slice(-MAX_HISTORY);
}

function sanitizeRecent(raw: unknown): RecentChange[] {
  if (!Array.isArray(raw)) return [];
  const out: RecentChange[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const change = item as Record<string, unknown>;
    if (typeof change.at !== 'string') continue;
    const source = change.source;
    if (source !== 'dialogue' && source !== 'browse' && source !== 'attention' && source !== 'event') continue;
    out.push({
      at: change.at,
      atMs: finite(change.atMs, Date.parse(change.at) || 0),
      source,
      delta: finite(change.delta, 0),
      before: finite(change.before, 0),
      after: finite(change.after, 0),
      reason: typeof change.reason === 'string' ? change.reason : '',
      ...(change.capped === true ? { capped: true } : {}),
    });
  }
  return out.slice(-MAX_RECENT);
}

function sanitizeState(raw: unknown, date: string, lastUserAt: number): MoodState {
  const record = (raw ?? {}) as Record<string, unknown>;
  const value = clamp(Math.round(finite(record.value, 0)), 0, 100);
  return {
    version: 1,
    value,
    pending: finite(record.pending, 0),
    lastUpdated: typeof record.lastUpdated === 'string' ? record.lastUpdated : '',
    day: sanitizeDay(record.day, date, value, lastUserAt),
    history: sanitizeHistory(record.history),
    recent: sanitizeRecent(record.recent),
    lowDays: Math.max(0, Math.floor(finite(record.lowDays, 0))),
    lastLowDate: typeof record.lastLowDate === 'string' ? record.lastLowDate : '',
    selfRescueAt: typeof record.selfRescueAt === 'string' ? record.selfRescueAt : null,
    lastEmotion: record.lastEmotion && typeof record.lastEmotion === 'object'
      && typeof (record.lastEmotion as Record<string, unknown>).emotion === 'string'
      ? {
          emotion: (record.lastEmotion as Record<string, unknown>).emotion as Emotion,
          at: typeof (record.lastEmotion as Record<string, unknown>).at === 'string'
            ? (record.lastEmotion as Record<string, unknown>).at as string
            : '',
        }
      : null,
    lastSnapshotValue: finite(record.lastSnapshotValue, -1),
    lastSnapshotAt: typeof record.lastSnapshotAt === 'string' ? record.lastSnapshotAt : '',
  };
}

export class MoodStore {
  private state: MoodState;
  private readonly file: string;
  private readonly now: () => Date;
  private readonly random: () => number;
  private loaded = false;

  constructor(private readonly options: MoodStoreOptions) {
    this.file = join(options.dataDir, STATE_FILE);
    this.now = options.now ?? (() => new Date());
    this.random = options.random ?? Math.random;
    this.state = freshState(dateIn(options.timezone, this.now()), 50, this.now().getTime());
  }

  get data(): MoodState {
    return this.state;
  }

  get path(): string {
    return this.file;
  }

  /** Load and advance to `today`; must be called once before use. */
  load(cfg: MoodConfigSection, persona: ResolvedPersona): RolloverResult {
    const now = this.now();
    const today = dateIn(this.options.timezone, now);
    const lastUserAt = now.getTime();
    let raw: unknown = null;
    if (existsSync(this.file)) {
      try {
        raw = JSON.parse(readFileSync(this.file, 'utf8'));
      } catch {
        try {
          renameSync(this.file, `${this.file}.corrupt-${Date.now()}`);
        } catch {
          // If moving fails, start fresh without touching the bad file.
        }
        raw = null;
      }
    }
    this.state = sanitizeState(raw, today, lastUserAt);
    if (!this.loaded && raw === null) {
      const initial = cfg.initialValue > 0 ? cfg.initialValue : persona.neutralPoint;
      const value = clamp(Math.round(initial), 0, 100);
      this.state = freshState(today, value, lastUserAt);
      this.state.lastUpdated = nowIso(this.options.timezone, now);
    }
    this.loaded = true;
    return this.advanceTo(today, cfg, persona);
  }

  /** Settle every missing day and start today; safe to call from the ticker at midnight. */
  rollover(today: string, cfg: MoodConfigSection, persona: ResolvedPersona): RolloverResult {
    return this.advanceTo(today, cfg, persona);
  }

  /** Settle every missing day and start today. */
  private advanceTo(today: string, cfg: MoodConfigSection, persona: ResolvedPersona): RolloverResult {
    const settled: MoodHistoryEntry[] = [];
    let reset: RolloverResult['reset'] = null;
    let selfRescue = false;
    if (this.state.day.date > today) {
      // Clock moved backwards. Do not settle the future; restart today's counters.
      this.state.day.date = today;
      this.state.day.high = this.state.value;
      this.state.day.low = this.state.value;
      this.save();
      return { settled, reset, selfRescue };
    }
    let guard = 0;
    while (this.state.day.date < today && guard < 370) {
      guard += 1;
      const entry = this.settleCurrentDay();
      settled.push(entry);
      this.afterSettle(entry, cfg);
      if (this.state.selfRescueAt) selfRescue = true;
      const baseline = nextBaseline(this.state.value, cfg, persona, this.random);
      const nextDate = addDays(this.state.day.date, 1);
      const previousFinal = this.state.value;
      this.state.value = baseline.value;
      this.state.pending = 0;
      this.state.day = emptyDay(nextDate, baseline.value, this.state.day.lastUserAt);
      this.state.day.baseline = baseline.baseline;
      this.state.day.baselineFrom = previousFinal;
      this.state.day.noise = baseline.noise;
      this.state.lastUpdated = nowIso(this.options.timezone, this.now());
      reset = { date: nextDate, from: previousFinal, baseline: baseline.baseline, noise: baseline.noise, value: baseline.value };
      this.pruneHistory(cfg.historyDays);
      this.save();
    }
    if (this.state.day.high < this.state.value) this.state.day.high = this.state.value;
    if (this.state.day.low > this.state.value) this.state.day.low = this.state.value;
    this.save();
    return { settled, reset, selfRescue };
  }

  /** Record the day that just ended; returns the entry written. */
  private settleCurrentDay(): MoodHistoryEntry {
    const day = this.state.day;
    const entry: MoodHistoryEntry = {
      date: day.date,
      final_value: clamp(Math.round(this.state.value), 0, 100),
      high: clamp(Math.round(Math.max(day.high, this.state.value)), 0, 100),
      low: clamp(Math.round(Math.min(day.low, this.state.value)), 0, 100),
      delta_breakdown: {
        dialogue: round1(day.dialogue.pos - day.dialogue.neg),
        browse: round1(day.browse.pos - day.browse.neg),
        attention: round1(day.attention.pos - day.attention.neg),
        event: round1(day.event.pos - day.event.neg),
        persona_regression: round1(day.baseline - day.baselineFrom),
        noise: day.noise,
      },
      baseline: round1(day.baseline),
      interactions: day.interactions,
    };
    this.state.history.push(entry);
    this.pruneHistory(MAX_HISTORY);
    return entry;
  }

  private afterSettle(entry: MoodHistoryEntry, cfg: MoodConfigSection): void {
    if (entry.final_value <= 10) {
      if (this.state.lastLowDate !== entry.date) {
        this.state.lowDays += 1;
        this.state.lastLowDate = entry.date;
      }
      if (cfg.selfRescue && this.state.lowDays >= 3 && !this.state.selfRescueAt) {
        this.state.selfRescueAt = nowIso(this.options.timezone, this.now());
      }
    } else {
      this.state.lowDays = 0;
      this.state.lastLowDate = '';
      this.state.selfRescueAt = null;
    }
  }

  private pruneHistory(days: number): void {
    const keep = Math.max(1, Math.min(MAX_HISTORY, Math.floor(days) || 30));
    if (this.state.history.length > keep) this.state.history = this.state.history.slice(-keep);
  }

  /** Number of steps already charged, for the idle clock at startup. */
  skipIdleUntilNow(idleHoursNow: number, cfg: MoodConfigSection): void {
    const steps = idleHoursNow < Math.max(0, cfg.attentionHoursA) + Math.max(0.1, cfg.attentionUnitHours)
      ? 0
      : Math.floor((idleHoursNow - Math.max(0, cfg.attentionHoursA)) / Math.max(0.1, cfg.attentionUnitHours));
    this.state.day.idleSteps = Math.max(this.state.day.idleSteps, steps);
    this.state.day.extraCharged = this.state.day.extraCharged || idleHoursNow >= Math.max(0, cfg.attentionHoursB);
    this.save();
  }

  markInteraction(atMs: number): void {
    this.state.day.lastUserAt = atMs;
    this.state.day.interactions += 1;
    this.save();
  }

  noteProactive(atMs: number): void {
    if (this.state.day.proactiveAt !== null) return;
    this.state.day.proactiveAt = atMs;
    this.save();
  }

  clearProactive(): void {
    if (this.state.day.proactiveAt === null) return;
    this.state.day.proactiveAt = null;
    this.save();
  }

  proactivePending(): number | null {
    return this.state.day.proactiveAt;
  }

  markAttentionBonus(atMs: number): void {
    this.state.day.lastAttentionBonusAt = atMs;
  }

  noteAttentionCharge(steps: number, extra: boolean): void {
    this.state.day.idleSteps = Math.max(this.state.day.idleSteps, steps);
    if (extra) this.state.day.extraCharged = true;
    this.save();
  }

  noteGalStarted(atMs: number): void {
    this.state.day.galStarted += 1;
    this.state.day.galLastStartedAt = atMs;
    this.save();
  }

  noteGalAnswered(): void {
    this.state.day.galAnswered += 1;
    this.save();
  }

  noteGalDismissed(): void {
    this.state.day.galDismissed += 1;
    this.save();
  }

  noteGalHint(atMs: number): void {
    this.state.day.galLastHintAt = atMs;
    this.save();
  }

  apply(
    source: DeltaSource,
    rawDelta: number,
    reason: string,
    cfg: MoodConfigSection,
    persona: ResolvedPersona,
    atMs = this.now().getTime(),
  ): ApplyResult {
    const before = this.state.value;
    const bandBefore = bandFor(before);
    const sign = rawDelta > 0 ? 1 : rawDelta < 0 ? -1 : 0;
    if (sign === 0) {
      return { before, after: before, applied: 0, capped: false, bandBefore, bandAfter: bandBefore, bandChanged: false };
    }

    const channel: Channel = source === 'event' ? 'event' : source;
    const max = source === 'dialogue' ? 5 : source === 'browse' ? 5 : 10;
    let adjusted = clamp(Math.abs(rawDelta), 0, max);
    adjusted *= sign > 0 ? persona.positiveCoeff : persona.negativeCoeff;
    if (source === 'attention') adjusted *= persona.attentionMultiplier;

    // Diminishing returns for repeats of the same channel and direction.
    const windowMs = Math.max(0, cfg.diminishWindowMinutes) * 60_000;
    let repeats = 0;
    if (windowMs > 0) {
      for (let i = this.state.recent.length - 1; i >= 0; i -= 1) {
        const change = this.state.recent[i]!;
        if (atMs - change.atMs > windowMs) break;
        if (change.source === source && Math.sign(change.delta) === sign) repeats += 1;
      }
    }
    const factors = [1, 0.7, 0.5, 0.3, 0.15, 0];
    adjusted *= factors[Math.min(repeats, factors.length - 1)] ?? 0;

    // The same channel's daily cap; event only uses the total swing cap.
    const totals = this.state.day[channel];
    const channelCap = channel === 'dialogue' ? cfg.dialogueDailyCap
      : channel === 'browse' ? cfg.browseDailyCap
      : channel === 'attention' ? cfg.attentionDailyCap
      : Number.POSITIVE_INFINITY;
    const channelRemaining = Math.max(0, channelCap - (sign > 0 ? totals.pos : totals.neg));

    const totalPos = this.state.day.dialogue.pos + this.state.day.browse.pos + this.state.day.attention.pos + this.state.day.event.pos;
    const totalNeg = this.state.day.dialogue.neg + this.state.day.browse.neg + this.state.day.attention.neg + this.state.day.event.neg;
    const swingRemaining = Math.max(0, cfg.dailySwingCap - (sign > 0 ? totalPos : totalNeg));

    // Past 60% of a cap, effort decays; past 85%, it nearly stops.
    const used = sign > 0 ? totals.pos : totals.neg;
    if (channelCap > 0) {
      const ratio = used / channelCap;
      if (ratio >= 0.85) adjusted *= 0.2;
      else if (ratio >= 0.6) adjusted *= 0.5;
    }

    const allowed = Math.min(adjusted, channelRemaining, swingRemaining);
    const capped = allowed + 1e-9 < adjusted;
    const applied = sign * allowed;

    if (applied !== 0) {
      if (sign > 0) totals.pos += applied;
      else totals.neg += Math.abs(applied);
      this.state.pending += applied;
      // Move whole units into the integer value; keep the remainder for later.
      let whole = Math.trunc(this.state.pending);
      if (whole !== 0) {
        this.state.value = clamp(this.state.value + whole, 0, 100);
        this.state.pending -= whole;
      }
      if (this.state.value <= 0 && this.state.pending < 0) this.state.pending = 0;
      if (this.state.value >= 100 && this.state.pending > 0) this.state.pending = 0;
      this.state.day.high = Math.max(this.state.day.high, this.state.value);
      this.state.day.low = Math.min(this.state.day.low, this.state.value);
    }

    this.state.lastUpdated = nowIso(this.options.timezone, new Date(atMs));
    if (applied !== 0) {
      this.state.recent.push({
        at: this.state.lastUpdated,
        atMs,
        source,
        delta: round1(applied),
        before,
        after: this.state.value,
        reason: reason.slice(0, 240),
        ...(capped ? { capped: true } : {}),
      });
      if (this.state.recent.length > MAX_RECENT) this.state.recent = this.state.recent.slice(-MAX_RECENT);
    }
    this.save();

    const bandAfter = bandFor(this.state.value);
    return {
      before,
      after: this.state.value,
      applied: round1(applied),
      capped,
      bandBefore,
      bandAfter,
      bandChanged: bandBefore !== bandAfter,
    };
  }

  /** Panel/debug adjustment; bypasses caps and coefficients. */
  setValue(value: number, reason: string): ApplyResult {
    const before = this.state.value;
    const bandBefore = bandFor(before);
    this.state.value = clamp(Math.round(value), 0, 100);
    this.state.pending = 0;
    this.state.day.high = Math.max(this.state.day.high, this.state.value);
    this.state.day.low = Math.min(this.state.day.low, this.state.value);
    this.state.lastUpdated = nowIso(this.options.timezone, this.now());
    this.state.recent.push({
      at: this.state.lastUpdated,
      atMs: this.now().getTime(),
      source: 'event',
      delta: this.state.value - before,
      before,
      after: this.state.value,
      reason: reason.slice(0, 240),
    });
    if (this.state.recent.length > MAX_RECENT) this.state.recent = this.state.recent.slice(-MAX_RECENT);
    this.save();
    const bandAfter = bandFor(this.state.value);
    return {
      before,
      after: this.state.value,
      applied: this.state.value - before,
      capped: false,
      bandBefore,
      bandAfter,
      bandChanged: bandBefore !== bandAfter,
    };
  }

  setEmotion(emotion: Emotion): void {
    this.state.lastEmotion = { emotion, at: nowIso(this.options.timezone, this.now()) };
    this.save();
  }

  shouldSnapshot(cfg: MoodConfigSection, atMs = this.now().getTime()): boolean {
    if (this.state.lastSnapshotValue < 0) return true;
    const minDelta = Math.max(1, Math.floor(cfg.snapshotMinDelta ?? 1));
    if (Math.abs(this.state.value - this.state.lastSnapshotValue) >= minDelta) return true;
    if (!this.state.lastSnapshotAt) return true;
    if (cfg.snapshotRefreshMinutes <= 0) return false;
    const last = Date.parse(this.state.lastSnapshotAt);
    return Number.isNaN(last) || atMs - last >= cfg.snapshotRefreshMinutes * 60_000;
  }

  noteSnapshot(): void {
    this.state.lastSnapshotValue = this.state.value;
    this.state.lastSnapshotAt = nowIso(this.options.timezone, this.now());
    this.save();
  }

  /** Today's net contributions, for status output and the panel. */
  today(): {
    dialogue: number;
    browse: number;
    attention: number;
    event: number;
    high: number;
    low: number;
    galStarted: number;
    galAnswered: number;
    galDismissed: number;
  } {
    const day = this.state.day;
    return {
      dialogue: round1(day.dialogue.pos - day.dialogue.neg),
      browse: round1(day.browse.pos - day.browse.neg),
      attention: round1(day.attention.pos - day.attention.neg),
      event: round1(day.event.pos - day.event.neg),
      high: day.high,
      low: day.low,
      galStarted: day.galStarted,
      galAnswered: day.galAnswered,
      galDismissed: day.galDismissed,
    };
  }

  history(days: number): MoodHistoryEntry[] {
    const count = Math.max(1, Math.min(MAX_HISTORY, Math.floor(days) || 7));
    return this.state.history.slice(-count);
  }

  recentChanges(limit = 12): RecentChange[] {
    return this.state.recent.slice(-Math.max(1, limit)).reverse();
  }

  save(): void {
    try {
      mkdirSync(join(this.options.dataDir, 'mood'), { recursive: true });
      const tmp = `${this.file}.tmp`;
      writeFileSync(tmp, `${JSON.stringify(this.state, null, 2)}\n`, 'utf8');
      renameSync(tmp, this.file);
    } catch {
      // A failed save must never take the World down; the next change retries.
    }
  }
}
