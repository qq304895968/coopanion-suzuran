import { afterEach, describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { OutputStore } from '../../src/local/output.ts';
import { TaskManager } from '../../src/local/tasks.ts';
import type { GenerateTaskView, HistoryEntry } from '../../src/local/types.ts';
import { FakeComfy, removeDir, tempDir } from './helpers.ts';

const dirs: string[] = [];
afterEach(() => {
  while (dirs.length) removeDir(dirs.pop()!);
});

function setup(timeoutMs = 10_000) {
  const dir = tempDir();
  dirs.push(dir);
  const store = new OutputStore({
    dataDir: dir,
    outputDir: join(dir, 'output'),
    timezone: 'Asia/Shanghai',
    historyLimit: 50,
  });
  const client = new FakeComfy();
  const done: Array<{ task: GenerateTaskView; entries: HistoryEntry[] }> = [];
  const failed: GenerateTaskView[] = [];
  const manager = new TaskManager({
    client,
    store,
    timeoutMs,
    pollMs: 1000,
    onDone: (task, entries) => { done.push({ task, entries }); },
    onFailed: (task) => { failed.push(task); },
  });
  client.watch({ event: (event) => manager.onEvent(event), connected: () => {} });
  return { dir, store, client, manager, done, failed };
}

const params = {
  positive: 'cat',
  negative: 'bad',
  checkpoint: 'm.safetensors',
  sampler: 'euler',
  scheduler: 'normal',
  steps: 20,
  cfg: 7,
  width: 512,
  height: 512,
  batch: 1,
  seed: 5,
};

describe('TaskManager', () => {
  it('提交、进度、完成并保存图片', async () => {
    const { client, manager, done, store } = setup();
    client.makeDone(['a.png']);
    const task = await manager.submit({
      params,
      loras: [],
      workflow: { '1': { class_type: 'X', inputs: {} } },
      workflowName: 'test',
      seed: 5,
      batch: 1,
    });
    expect(task.status).toBe('running');
    expect(client.workflow).toEqual({ '1': { class_type: 'X', inputs: {} } });

    client.emit({ type: 'progress', data: { value: 10, max: 20 }, prompt_id: 'prompt-1' });
    expect(manager.get(task.id)!.progress.current).toBe(10);

    client.emit({ type: 'executing', data: { node: null }, prompt_id: 'prompt-1' });
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(done).toHaveLength(1);
    const view = manager.get(task.id)!;
    expect(view.status).toBe('done');
    expect(view.images).toHaveLength(1);
    expect(store.list()).toHaveLength(1);
    expect(done[0]!.entries[0]!.positive).toBe('cat');
    manager.dispose();
  });

  it('execution_error 标记失败并回调', async () => {
    const { client, manager, failed } = setup();
    const task = await manager.submit({
      params,
      loras: [],
      workflow: {},
      workflowName: 'test',
      seed: 5,
      batch: 1,
    });
    client.emit({
      type: 'execution_error',
      data: { exception_message: 'CUDA out of memory', node_type: 'KSampler' },
      prompt_id: 'prompt-1',
    });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(failed).toHaveLength(1);
    expect(manager.get(task.id)!.status).toBe('error');
    expect(manager.get(task.id)!.error).toContain('CUDA');
    manager.dispose();
  });

  it('取消当前任务', async () => {
    const { client, manager } = setup();
    const task = await manager.submit({
      params,
      loras: [],
      workflow: {},
      workflowName: 'test',
      seed: 5,
      batch: 1,
    });
    expect(await manager.cancel(task.id)).toBe(true);
    expect(manager.get(task.id)!.status).toBe('cancelled');
    expect(client.events).toEqual([]);
    manager.dispose();
  });

  it('提交失败直接返回 error 任务', async () => {
    const { client, manager } = setup();
    client.submitError = new Error('bad workflow');
    const task = await manager.submit({
      params,
      loras: [],
      workflow: {},
      workflowName: 'test',
      seed: 5,
      batch: 1,
    });
    expect(task.status).toBe('error');
    expect(task.error).toContain('bad workflow');
    manager.dispose();
  });

  it('随机种子：-1 会换成非负种子', async () => {
    const { client, manager } = setup();
    client.makeDone();
    const task = await manager.submit({
      params: { ...params, seed: -1 },
      loras: [],
      workflow: {},
      workflowName: 'test',
      seed: -1,
      batch: 1,
    });
    expect(task.params.seed).toBeGreaterThanOrEqual(0);
    manager.dispose();
  });
});
