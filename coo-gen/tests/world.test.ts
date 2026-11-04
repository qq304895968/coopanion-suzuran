import { afterEach, describe, expect, it } from 'vitest';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { CooGenWorld } from '../src/world.ts';
import type { CooGenBootstrap, GenerateTaskView } from '../src/types.ts';
import type { ToolOutcome } from 'cortico/core/types.ts';
import {
  FakeComfy, makeComfyDir, removeDir, tempDir, testCfg, testHost, writeJson,
} from './helpers.ts';

const dirs: string[] = [];
afterEach(() => {
  while (dirs.length) removeDir(dirs.pop()!);
});

function asOutcome(value: string | ToolOutcome): ToolOutcome {
  return typeof value === 'string' ? { text: value } : value;
}

async function setup() {
  const data = tempDir();
  const comfyRoot = tempDir();
  dirs.push(data, comfyRoot);
  const lorasRoot = makeComfyDir(comfyRoot);
  writeJson(join(data, 'coo-gen', 'settings.json'), {
    version: 1,
    default_loras: [
      { name: 'soft_lighting', path: '风格/soft_lighting.safetensors', weight: 0.5, trigger_words: [] },
    ],
    lora_aliases: { 塞尔达: ['角色/zelda_botw_style.safetensors'] },
    lora_meta: {},
    dictionary: {},
  });
  const fake = new FakeComfy();
  fake.loraNames = [
    '风格/soft_lighting.safetensors',
    '角色/zelda_botw_style.safetensors',
    '角色/hatsune_miku_v4.safetensors',
    '风格/cyberpunk_neon.safetensors',
    '风格/mecha_detail.safetensors',
  ];
  fake.makeDone(['zelda_00001_.png']);
  const original = fake.submit.bind(fake);
  fake.submit = async (workflow) => {
    const result = await original(workflow);
    setTimeout(() => {
      fake.emit({ type: 'progress', data: { value: 10, max: 20 }, prompt_id: fake.promptId });
      fake.emit({ type: 'executing', data: { node: null }, prompt_id: fake.promptId });
    }, 30);
    return result;
  };
  const { host, events } = testHost();
  const world = new CooGenWorld({
    cfg: testCfg({
      comfyDir: comfyRoot,
      outputDir: join(data, 'out'),
      defaultCheckpoint: 'anything_v5.safetensors',
      pollSeconds: 1,
      timeoutSeconds: 30,
      historyLimit: 10,
    }),
    timezone: 'Asia/Shanghai',
    dataDir: data,
    botDir: data,
    botName: 'Coo',
    secret: () => '',
    clientFactory: () => fake,
    now: () => new Date('2026-11-03T02:00:00+08:00'),
  });
  await world.start(host);
  await new Promise((resolve) => setTimeout(resolve, 60));
  return { data, comfyRoot, lorasRoot, fake, host, events, world };
}

describe('CooGenWorld', () => {
  it('对话触发出图：翻译、别名匹配、默认叠加、保存和事件', async () => {
    const { data, fake, events, world } = await setup();
    const tool = world.tools().find((item) => item.name === 'coo_gen')!;
    const outcome = asOutcome(await tool.handler({
      subject: '发我一张塞尔达的图',
      wait: true,
    }, {
      role: 'main',
      log: { info: () => {}, warn: () => {}, debug: () => {}, error: () => {} } as never,
    }));
    expect(outcome.failed).toBeUndefined();
    expect(outcome.text).toContain('画好了');
    expect(outcome.blobs).toHaveLength(1);
    expect(fake.workflow).not.toBeNull();
    const loras = Object.values(fake.workflow!).filter((node) => (node as { class_type?: string }).class_type === 'LoraLoader');
    expect(loras.length).toBe(2);
    const positive = (fake.workflow!['6'] as { inputs: { text: string } }).inputs.text;
    expect(positive).toContain('zelda');
    expect(positive).not.toContain('soft_lighting');

    const files = readdirSync(join(data, 'out'));
    expect(files).toHaveLength(1);
    expect(files[0]).toMatch(/20261103-020000_\d+_anything_v5\.png/);
    expect(existsSync(join(data, 'out', files[0]!))).toBe(true);

    await new Promise((resolve) => setTimeout(resolve, 20));
    const done = events.find((event) => event.type === 'coogen.done');
    expect(done).toBeTruthy();
    expect((done!.blobs as unknown[]).length).toBe(1);
    expect((done!.meta as Record<string, unknown>).task_id).toBeTruthy();
    await world.stop();
  });

  it('coo_gen_result 能取回最新任务', async () => {
    const { world } = await setup();
    const gen = world.tools().find((item) => item.name === 'coo_gen')!;
    const result = world.tools().find((item) => item.name === 'coo_gen_result')!;
    const outcome = asOutcome(await gen.handler({ subject: '塞尔达', wait: true }, {
      role: 'main',
      log: { info: () => {}, warn: () => {}, debug: () => {}, error: () => {} } as never,
    }));
    const taskId = (outcome.text.match(/task ([\w-]+)/)?.[1]) ?? '';
    const res = asOutcome(await result.handler({ task_id: taskId, attach: true }, {
      role: 'main',
      log: { info: () => {}, warn: () => {}, debug: () => {}, error: () => {} } as never,
    }));
    expect(res.blobs).toHaveLength(1);
    await world.stop();
  });

  it('面板 bootstrap 和 LoRA 搜索', async () => {
    const { world } = await setup();
    const ui = world.webUi('zh');
    const boot = await ui.invoke!('studio', 'bootstrap', []) as CooGenBootstrap;
    expect(boot.health.ok).toBe(true);
    expect(boot.loras.length).toBe(5);
    expect(boot.defaults).toHaveLength(1);
    expect(boot.config.output_dir).toContain('out');
    expect(boot.lora_root).toContain('loras');
    expect(boot.presets.length).toBeGreaterThanOrEqual(3);
    const loras = world.tools().find((item) => item.name === 'coo_gen_loras')!;
    const found = asOutcome(await loras.handler({ query: '塞尔达' }, {
      role: 'main',
      log: { info: () => {}, warn: () => {}, debug: () => {}, error: () => {} } as never,
    }));
    expect(found.text).toContain('zelda_botw_style');
    await world.stop();
  });

  it('没有配置启停脚本时，对话工具给出明确配置提示', async () => {
    const { world } = await setup();
    const start = world.tools().find((item) => item.name === 'coo_gen_start')!;
    const stop = world.tools().find((item) => item.name === 'coo_gen_stop')!;
    const started = asOutcome(await start.handler({}, {
      role: 'main',
      log: { info: () => {}, warn: () => {}, debug: () => {}, error: () => {} } as never,
    }));
    const stopped = asOutcome(await stop.handler({}, {
      role: 'main',
      log: { info: () => {}, warn: () => {}, debug: () => {}, error: () => {} } as never,
    }));
    expect(started.failed).toBe(true);
    expect(started.text).toContain('启动脚本');
    expect(stopped.failed).toBe(true);
    expect(stopped.text).toContain('关闭脚本');
    await world.stop();
  });

  it('ComfyUI 离线时明确告诉用户，不假装出图', async () => {
    const { host, fake, world } = await setup();
    fake.health = async () => ({ ok: false, url: 'http://127.0.0.1:8188', error: 'ECONNREFUSED', checked_at: Date.now() });
    const tool = world.tools().find((item) => item.name === 'coo_gen')!;
    const outcome = asOutcome(await tool.handler({ subject: '猫猫' }, {
      role: 'main',
      log: { info: () => {}, warn: () => {}, debug: () => {}, error: () => {} } as never,
    }));
    expect(outcome.failed).toBe(true);
    expect(outcome.text).toContain('ComfyUI');
    expect(outcome.blobs).toBeUndefined();
    await world.stop();
    expect(host).toBeTruthy();
  });

  it('标准部署的默认输出目录是安装目录/data/output', () => {
    const root = tempDir();
    dirs.push(root);
    const botDir = join(root, 'data', 'home', 'companion');
    const dataDir = join(botDir, 'data');
    const world = new CooGenWorld({
      cfg: testCfg({ outputDir: '', comfyDir: '' }),
      timezone: 'Asia/Shanghai',
      dataDir,
      botDir,
      botName: 'Coo',
      secret: () => '',
      clientFactory: () => new FakeComfy(),
    });
    expect(world.envPromptVars()['cooGen.folder']).toBe(join(root, 'data', 'output'));
  });

  it('参数面板生成走同一套任务队列', async () => {
    const { fake, world } = await setup();
    fake.makeDone(['panel.png']);
    const ui = world.webUi('zh');
    const res = await ui.invoke!('studio', 'generate', [{
      positive: 'a cat',
      negative: 'bad',
      checkpoint: 'anything_v5.safetensors',
      loras: [],
      steps: 20,
      cfg: 7,
      width: 512,
      height: 512,
      batch: 1,
      seed: 9,
    }]) as { ok: boolean; task?: GenerateTaskView; error?: string };
    expect(res.ok).toBe(true);
    expect(res.task?.status).toBe('running');
    await new Promise((resolve) => setTimeout(resolve, 60));
    const status = await ui.invoke!('studio', 'status', []) as { task: GenerateTaskView };
    expect(status.task.status).toBe('done');
    await world.stop();
  });
});
