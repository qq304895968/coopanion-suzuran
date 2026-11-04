/**
 * 本地对局账本与提醒。所有文件写在部署的 dataDir 下，文件名以 World id 开头，
 * 与 Core 和其他 World 共用目录时不撞名。
 */
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export type RunOutcome = 'cleared' | 'failed' | 'abandoned';

/** 预留 `mode`，以后加卫戍协议等模式不用改结构。 */
export type RunMode = 'is';

export interface RunState {
  id: string;
  mode: RunMode;
  theme: string;
  themeName: string;
  squad?: string;
  difficulty?: string;
  goalEnding?: string;
  floor: number;
  /** 当前所在节点类型（操作者报的，如 商店、紧急作战）。 */
  node?: string;
  life?: number;
  hope?: number;
  ingots?: number;
  keys?: number;
  operators: string[];
  relics: string[];
  notes: string[];
  startedAt: string;
  updatedAt: string;
}

export interface RunRecord extends RunState {
  outcome: RunOutcome;
  endedAt: string;
  summary?: string;
}

export interface Reminder {
  id: string;
  text: string;
  dueAt: string;
  createdAt: string;
}

export interface RunStats {
  total: number;
  cleared: number;
  failed: number;
  abandoned: number;
  clearRate: number;
  bestFloor: number;
}

export interface StartRunInput {
  theme: string;
  themeName: string;
  squad?: string;
  difficulty?: string;
  goalEnding?: string;
  floor?: number;
}

export interface UpdateRunPatch {
  floor?: number;
  node?: string;
  life?: number;
  hope?: number;
  ingots?: number;
  keys?: number;
  operators?: string[];
  addOperators?: string[];
  relics?: string[];
  addRelics?: string[];
  note?: string;
  squad?: string;
  difficulty?: string;
  goalEnding?: string;
}

const RUN_FILE = 'arknights-run.json';
const HISTORY_FILE = 'arknights-history.json';
const REMINDER_FILE = 'arknights-reminders.json';

export class ArknightsStore {
  constructor(private readonly dataDir: string) {}

  private file(name: string): string {
    return join(this.dataDir, name);
  }

  /** 读坏了就当没有：账本不该让 World 起不来。 */
  private read<T>(name: string, fallback: T): T {
    try {
      return JSON.parse(readFileSync(this.file(name), 'utf8')) as T;
    } catch {
      return fallback;
    }
  }

  /** 先写临时文件再改名，进程中途被杀也不会留下半份 JSON。 */
  private write(name: string, value: unknown): void {
    mkdirSync(this.dataDir, { recursive: true });
    const target = this.file(name);
    const tmp = `${target}.tmp`;
    writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    renameSync(tmp, target);
  }

  /* ------------------------------------------------------------------ run */

  currentRun(): RunState | undefined {
    return this.read<RunState | null>(RUN_FILE, null) ?? undefined;
  }

  startRun(input: StartRunInput): { run: RunState; previous?: RunState } {
    const previous = this.currentRun();
    const now = new Date().toISOString();
    const run: RunState = {
      id: `run-${Date.now().toString(36)}`,
      mode: 'is',
      theme: input.theme,
      themeName: input.themeName,
      squad: input.squad,
      difficulty: input.difficulty,
      goalEnding: input.goalEnding,
      floor: input.floor ?? 1,
      operators: [],
      relics: [],
      notes: [],
      startedAt: now,
      updatedAt: now,
    };
    this.write(RUN_FILE, run);
    return { run, previous };
  }

  updateRun(patch: UpdateRunPatch): RunState | undefined {
    const run = this.currentRun();
    if (!run) return undefined;
    if (patch.floor !== undefined) run.floor = patch.floor;
    if (patch.node !== undefined) run.node = patch.node;
    if (patch.life !== undefined) run.life = patch.life;
    if (patch.hope !== undefined) run.hope = patch.hope;
    if (patch.ingots !== undefined) run.ingots = patch.ingots;
    if (patch.keys !== undefined) run.keys = patch.keys;
    if (patch.squad !== undefined) run.squad = patch.squad;
    if (patch.difficulty !== undefined) run.difficulty = patch.difficulty;
    if (patch.goalEnding !== undefined) run.goalEnding = patch.goalEnding;
    if (patch.operators) run.operators = patch.operators;
    if (patch.addOperators) run.operators = [...run.operators, ...patch.addOperators];
    if (patch.relics) run.relics = patch.relics;
    if (patch.addRelics) run.relics = [...run.relics, ...patch.addRelics];
    if (patch.note) run.notes = [...run.notes, patch.note];
    run.updatedAt = new Date().toISOString();
    this.write(RUN_FILE, run);
    return run;
  }

  endRun(outcome: RunOutcome, summary: string | undefined, maxHistory: number): { record: RunRecord; run: RunState } | undefined {
    const run = this.currentRun();
    if (!run) return undefined;
    const record: RunRecord = {
      ...run,
      outcome,
      endedAt: new Date().toISOString(),
      summary,
    };
    const history = this.read<RunRecord[]>(HISTORY_FILE, []);
    history.push(record);
    const kept = maxHistory > 0 ? history.slice(-maxHistory) : [];
    this.write(HISTORY_FILE, kept);
    this.write(RUN_FILE, null);
    return { record, run };
  }

  history(limit = 10): RunRecord[] {
    const all = this.read<RunRecord[]>(HISTORY_FILE, []);
    return all.slice(-limit).reverse();
  }

  stats(): RunStats {
    const all = this.read<RunRecord[]>(HISTORY_FILE, []);
    const cleared = all.filter((r) => r.outcome === 'cleared').length;
    const failed = all.filter((r) => r.outcome === 'failed').length;
    const abandoned = all.filter((r) => r.outcome === 'abandoned').length;
    return {
      total: all.length,
      cleared,
      failed,
      abandoned,
      clearRate: all.length ? cleared / all.length : 0,
      bestFloor: all.reduce((best, r) => Math.max(best, r.floor), 0),
    };
  }

  /* ------------------------------------------------------------- reminders */

  private reminders(): Reminder[] {
    const list = this.read<Reminder[]>(REMINDER_FILE, []);
    return Array.isArray(list) ? list : [];
  }

  addReminder(text: string, dueAt: Date): Reminder {
    const now = new Date();
    const reminder: Reminder = {
      id: `rem-${Date.now().toString(36)}`,
      text,
      dueAt: dueAt.toISOString(),
      createdAt: now.toISOString(),
    };
    this.write(REMINDER_FILE, [...this.reminders(), reminder]);
    return reminder;
  }

  listReminders(): Reminder[] {
    return [...this.reminders()].sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  }

  dueReminders(now: Date): Reminder[] {
    return this.reminders().filter((reminder) => new Date(reminder.dueAt).getTime() <= now.getTime());
  }

  cancelReminder(id: string): Reminder | undefined {
    const all = this.reminders();
    const found = all.find((reminder) => reminder.id === id);
    if (!found) return undefined;
    this.write(
      REMINDER_FILE,
      all.filter((reminder) => reminder.id !== id),
    );
    return found;
  }

  removeReminders(ids: string[]): void {
    const drop = new Set(ids);
    this.write(
      REMINDER_FILE,
      this.reminders().filter((reminder) => !drop.has(reminder.id)),
    );
  }
}
