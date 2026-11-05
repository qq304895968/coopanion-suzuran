/** 生成任务：提交、WebSocket 进度、/history 轮询、超时、取消、保存结果。 */
import { randomUUID } from 'node:crypto';
import type {
  ComfyApi, ComfyEvent, ComfyImageRef,
} from './comfy.ts';
import type { OutputStore } from './output.ts';
import type {
  GenerateParams, GenerateTaskView, HistoryEntry, LoRASource, TaskProgress, TaskStatus,
} from './types.ts';

interface TaskInternal {
  id: string;
  prompt_id: string;
  status: TaskStatus;
  progress: TaskProgress;
  params: GenerateParams;
  loras: Array<{ path: string; name: string; weight: number; source: LoRASource }>;
  workflow: Record<string, unknown>;
  workflowName: string;
  seed: number;
  batch: number;
  images: Array<{ id: string; filename: string; width: number; height: number }>;
  entries: HistoryEntry[];
  error?: string;
  created_at: number;
  finished_at?: number;
  started_at: number;
  pollTimer: NodeJS.Timeout | null;
  timeoutTimer: NodeJS.Timeout | null;
  finishing: boolean;
  cancelled: boolean;
}

export interface TaskManagerOptions {
  client: ComfyApi;
  store: OutputStore;
  timeoutMs: number;
  pollMs: number;
  onDone?(task: GenerateTaskView, entries: HistoryEntry[]): void | Promise<void>;
  onFailed?(task: GenerateTaskView): void | Promise<void>;
  onProgress?(task: GenerateTaskView): void;
  onConnection?(connected: boolean): void;
  log?(message: string, data?: unknown): void;
}

export interface SubmitInput {
  params: GenerateParams;
  loras: Array<{ path: string; name: string; weight: number; source: LoRASource }>;
  workflow: Record<string, unknown>;
  workflowName: string;
  seed: number;
  batch: number;
}

const RUNNING: TaskStatus[] = ['queued', 'running'];

export function randomSeed(): number {
  return Math.floor(Math.random() * 0xffffffff);
}

export class TaskManager {
  private task: TaskInternal | null = null;
  private last: TaskInternal | null = null;

  constructor(private readonly opts: TaskManagerOptions) {}

  view(task: TaskInternal | null = this.task ?? this.last): GenerateTaskView | null {
    if (!task) return null;
    return {
      id: task.id,
      prompt_id: task.prompt_id,
      status: task.status,
      ...(task.params.source ? { source: task.params.source } : {}),
      progress: { ...task.progress },
      params: { ...task.params },
      loras: task.loras.map((item) => ({ ...item })),
      images: task.images.map((item) => ({ ...item })),
      ...(task.error ? { error: task.error } : {}),
      created_at: task.created_at,
      ...(task.finished_at ? { finished_at: task.finished_at } : {}),
      ...(task.finished_at ? { elapsed_ms: task.finished_at - task.started_at } : {}),
    };
  }

  active(): GenerateTaskView | null {
    return this.task && RUNNING.includes(this.task.status) ? this.view(this.task) : null;
  }

  latest(): GenerateTaskView | null {
    return this.view();
  }

  get(id: string): GenerateTaskView | null {
    if (this.task?.id === id) return this.view(this.task);
    if (this.last?.id === id) return this.view(this.last);
    return null;
  }

  async submit(input: SubmitInput): Promise<GenerateTaskView> {
    if (this.task && RUNNING.includes(this.task.status)) {
      throw new Error(`上一张还在生成（${this.task.progress.message ?? this.task.status}），等它画完或先取消。`);
    }
    const seed = Number.isFinite(input.seed) && input.seed >= 0 ? Math.trunc(input.seed) : randomSeed();
    const params: GenerateParams = {
      ...input.params,
      seed,
      batch: Math.max(1, Math.min(8, Math.trunc(input.batch || 1))),
    };
    const pending: TaskInternal = {
      id: randomUUID(),
      prompt_id: '',
      status: 'queued',
      progress: { current: 0, total: params.steps ?? 20, message: '已提交，等 ComfyUI 接单' },
      params,
      loras: input.loras,
      workflow: input.workflow,
      workflowName: input.workflowName,
      seed,
      batch: Math.max(1, Math.min(8, Math.trunc(input.batch || 1))),
      images: [],
      entries: [],
      created_at: Date.now(),
      started_at: Date.now(),
      pollTimer: null,
      timeoutTimer: null,
      finishing: false,
      cancelled: false,
    };
    this.last = pending;
    this.task = pending;

    let result;
    try {
      result = await this.opts.client.submit(input.workflow);
    } catch (error) {
      pending.status = 'error';
      pending.error = error instanceof Error ? error.message : String(error);
      pending.finished_at = Date.now();
      this.cleanup(pending);
      void this.failed(pending);
      return this.view(pending)!;
    }
    pending.prompt_id = result.prompt_id;
    pending.status = 'running';
    pending.progress = { current: 0, total: params.steps ?? 20, message: 'ComfyUI 已接单' };
    this.start(pending);
    return this.view(pending)!;
  }

  private start(task: TaskInternal): void {
    task.pollTimer = setInterval(() => { void this.poll(task); }, Math.max(1000, this.opts.pollMs));
    task.pollTimer.unref?.();
    task.timeoutTimer = setTimeout(() => {
      if (!RUNNING.includes(task.status)) return;
      task.status = 'error';
      task.error = '画太久了，可能卡住了；已经帮你取消，可以降低分辨率或步数再试。';
      task.finished_at = Date.now();
      this.cleanup(task);
      void this.opts.client.cancel(task.prompt_id).catch(() => {});
      void this.failed(task);
    }, Math.max(30_000, this.opts.timeoutMs));
    task.timeoutTimer.unref?.();
    this.emitProgress(task);
  }

  private cleanup(task: TaskInternal): void {
    if (task.pollTimer) clearInterval(task.pollTimer);
    if (task.timeoutTimer) clearTimeout(task.timeoutTimer);
    task.pollTimer = null;
    task.timeoutTimer = null;
    if (this.task === task) this.task = null;
    this.last = task;
  }

  private emitProgress(task: TaskInternal): void {
    try {
      this.opts.onProgress?.(this.view(task)!);
    } catch { /* ignore */ }
  }

  onEvent(event: ComfyEvent): void {
    const task = this.task;
    if (!task) return;
    if (event.prompt_id && task.prompt_id && event.prompt_id !== task.prompt_id) return;
    const data = event.data;
    switch (event.type) {
      case 'status': {
        const status = data.status as { exec_info?: { queue_remaining?: unknown } } | undefined;
        const remaining = Number(status?.exec_info?.queue_remaining);
        if (Number.isFinite(remaining)) {
          task.progress.message = remaining > 0 ? `队列里还有 ${remaining} 个任务` : '轮到这张了';
          this.emitProgress(task);
        }
        break;
      }
      case 'execution_start':
        task.status = 'running';
        task.progress.message = '开始采样';
        this.emitProgress(task);
        break;
      case 'execution_cached':
        task.progress.message = '复用缓存节点';
        this.emitProgress(task);
        break;
      case 'progress': {
        const current = Number(data.value);
        const total = Number(data.max);
        if (Number.isFinite(current)) task.progress.current = Math.max(0, current);
        if (Number.isFinite(total) && total > 0) task.progress.total = total;
        const node = data.node;
        if (typeof node === 'string' || typeof node === 'number') task.progress.node = String(node);
        task.progress.message = `采样 ${task.progress.current}/${task.progress.total}`;
        this.emitProgress(task);
        break;
      }
      case 'executing': {
        const node = data.node;
        if (node === null) {
          task.progress.message = '执行完毕，正在取图';
          void this.finish(task);
        }
        break;
      }
      case 'execution_error': {
        const message = data.exception_message;
        const nodeType = data.node_type;
        task.status = 'error';
        task.error = `ComfyUI 报错：${typeof message === 'string' ? message : '未知错误'}${typeof nodeType === 'string' ? `（${nodeType}）` : ''}`;
        task.finished_at = Date.now();
        this.cleanup(task);
        void this.failed(task);
        break;
      }
      case 'execution_interrupted':
        if (task.status === 'cancelled') return;
        task.status = 'cancelled';
        task.error = '任务被取消';
        task.finished_at = Date.now();
        this.cleanup(task);
        break;
      default:
        break;
    }
  }

  private async poll(task: TaskInternal): Promise<void> {
    if (task !== this.task || !RUNNING.includes(task.status)) return;
    try {
      const history = await this.opts.client.history(task.prompt_id);
      if (history) {
        if (history.status?.status_str === 'error') {
          task.status = 'error';
          task.error = 'ComfyUI 历史记录显示执行失败';
          task.finished_at = Date.now();
          this.cleanup(task);
          void this.failed(task);
          return;
        }
        if (history.outputs && Object.keys(history.outputs).length) {
          await this.finish(task, history);
        }
      }
    } catch {
      // 轮询失败不改变任务状态，WS 仍可能到达。
    }
  }

  private async finish(task: TaskInternal, known?: Awaited<ReturnType<ComfyApi['history']>>): Promise<void> {
    if (task.finishing || task.status === 'done') return;
    task.finishing = true;
    try {
      let history = known;
      for (let i = 0; i < 12 && !history; i++) {
        try {
          history = await this.opts.client.history(task.prompt_id);
        } catch { /* retry */ }
        if (!history) await new Promise((resolve) => setTimeout(resolve, 500));
      }
      if (!history) {
        task.status = 'error';
        task.error = '执行结束但取不到 /history 输出';
        task.finished_at = Date.now();
        this.cleanup(task);
        await this.failed(task);
        return;
      }
      const refs: ComfyImageRef[] = [];
      for (const output of Object.values(history.outputs ?? {})) {
        for (const image of output.images ?? []) {
          if (image.type && image.type !== 'output') continue;
          refs.push(image);
        }
      }
      if (!refs.length) {
        task.status = 'error';
        task.error = '工作流没有输出图片节点（需要 SaveImage）';
        task.finished_at = Date.now();
        this.cleanup(task);
        await this.failed(task);
        return;
      }
      const entries: HistoryEntry[] = [];
      for (let index = 0; index < refs.length; index++) {
        const image = await this.opts.client.view(refs[index]!);
        const entry = this.opts.store.save({
          bytes: image.bytes,
          mime: image.mime,
          params: task.params,
          loras: task.loras,
          promptId: task.prompt_id,
          taskId: task.id,
          workflow: task.workflowName,
          index,
          batch: refs.length,
          seed: task.seed,
        });
        entries.push(entry);
        task.images.push({ id: entry.id, filename: entry.filename, width: entry.width, height: entry.height });
      }
      task.entries = entries;
      task.status = 'done';
      task.progress.current = task.progress.total;
      task.progress.message = '画好了';
      task.finished_at = Date.now();
      this.cleanup(task);
      try {
        await this.opts.onDone?.(this.view(task)!, entries);
      } catch (error) {
        this.opts.log?.('coo-gen: onDone failed', error);
      }
    } catch (error) {
      task.status = 'error';
      task.error = `保存结果失败：${error instanceof Error ? error.message : String(error)}`;
      task.finished_at = Date.now();
      this.cleanup(task);
      await this.failed(task);
    } finally {
      task.finishing = false;
    }
  }

  private async failed(task: TaskInternal): Promise<void> {
    try {
      await this.opts.onFailed?.(this.view(task)!);
    } catch (error) {
      this.opts.log?.('coo-gen: onFailed failed', error);
    }
  }

  async cancel(id?: string): Promise<boolean> {
    const task = this.task;
    if (!task || (id && task.id !== id) || !RUNNING.includes(task.status)) return false;
    task.cancelled = true;
    task.status = 'cancelled';
    task.error = '已取消';
    task.finished_at = Date.now();
    this.cleanup(task);
    try {
      await this.opts.client.cancel(task.prompt_id);
    } catch (error) {
      this.opts.log?.('coo-gen: cancel failed', error);
    }
    return true;
  }

  /** 连接状态由 World 的 watch 转发，这里只记日志。 */
  connection(connected: boolean): void {
    try {
      this.opts.onConnection?.(connected);
    } catch { /* ignore */ }
  }

  dispose(): void {
    if (this.task) {
      if (this.task.pollTimer) clearInterval(this.task.pollTimer);
      if (this.task.timeoutTimer) clearTimeout(this.task.timeoutTimer);
      this.task.pollTimer = null;
      this.task.timeoutTimer = null;
    }
  }
}
