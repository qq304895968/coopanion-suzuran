import { afterEach, describe, expect, it } from 'vitest';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { CooGenWorld } from '../../src/local/world.ts';
import type { CooGenBootstrap, GenerateTaskView } from '../../src/local/types.ts';
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

  it('面板生成透传 LoRA 双强度：strength_model 与 strength_clip 分别写入节点', async () => {
    const { fake, world } = await setup();
    fake.makeDone(['clip.png']);
    const ui = world.webUi('zh');
    const res = await ui.invoke!('studio', 'generate', [{
      positive: 'a cat',
      negative: 'bad',
      checkpoint: 'anything_v5.safetensors',
      loras: [{ path: '角色/zelda_botw_style.safetensors', weight: 0.8, clip_weight: 0.5 }],
      steps: 20,
      cfg: 7,
      width: 512,
      height: 512,
      batch: 1,
      seed: 9,
    }]) as { ok: boolean; task?: GenerateTaskView; error?: string };
    expect(res.ok).toBe(true);
    expect(res.task?.loras[0]).toMatchObject({ weight: 0.8, clip_weight: 0.5 });
    const nodes = Object.values((fake.workflow ?? {}) as Record<string, { class_type: string; inputs: Record<string, unknown> }>);
    const lora = nodes.find((node) => node.class_type === 'LoraLoader')!;
    expect(lora.inputs.strength_model).toBe(0.8);
    expect(lora.inputs.strength_clip).toBe(0.5);
    await world.stop();
  });

  it('作品收藏经面板接口持久化', async () => {
    const { fake, world } = await setup();
    fake.makeDone(['fav.png']);
    const ui = world.webUi('zh');
    const gen = await ui.invoke!('studio', 'generate', [{
      positive: 'a cat', negative: 'bad', checkpoint: 'anything_v5.safetensors',
      loras: [], steps: 20, cfg: 7, width: 512, height: 512, batch: 1, seed: 9,
    }]) as { ok: boolean };
    expect(gen.ok).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 60));
    const before = await ui.invoke!('studio', 'history', [10]) as { history: Array<{ id: string; is_favorite?: boolean }> };
    expect(before.history.length).toBeGreaterThan(0);
    const id = before.history[0]!.id;
    const fav = await ui.invoke!('studio', 'setFavorite', [id, true]) as { ok: boolean; entry?: { is_favorite?: boolean; favorite_at?: number } };
    expect(fav.ok).toBe(true);
    expect(fav.entry?.is_favorite).toBe(true);
    expect(fav.entry?.favorite_at).toBeGreaterThan(0);
    const after = await ui.invoke!('studio', 'history', [10]) as { history: Array<{ id: string; is_favorite?: boolean }> };
    expect(after.history.find((h) => h.id === id)?.is_favorite).toBe(true);
    const missing = await ui.invoke!('studio', 'setFavorite', ['nope', true]) as { ok: boolean };
    expect(missing.ok).toBe(false);
    await world.stop();
  });

  it('作品经面板接口删除：去重、缺失计入 missing、空列表拒绝', async () => {
    const { fake, world } = await setup();
    fake.makeDone(['gone.png']);
    const ui = world.webUi('zh');
    const gen = await ui.invoke!('studio', 'generate', [{
      positive: 'a cat', negative: 'bad', checkpoint: 'anything_v5.safetensors',
      loras: [], steps: 20, cfg: 7, width: 512, height: 512, batch: 1, seed: 9,
    }]) as { ok: boolean };
    expect(gen.ok).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 60));
    const before = await ui.invoke!('studio', 'history', [10]) as { history: Array<{ id: string }> };
    expect(before.history).toHaveLength(1);
    const id = before.history[0]!.id;
    const del = await ui.invoke!('studio', 'deleteWorks', [[id, id, 'ghost'], false]) as { ok: boolean; deleted: string[]; missing: string[] };
    expect(del.ok).toBe(true);
    expect(del.deleted).toEqual([id]);
    expect(del.missing).toEqual(['ghost']);
    const after = await ui.invoke!('studio', 'history', [10]) as { history: Array<{ id: string }> };
    expect(after.history).toHaveLength(0);
    const empty = await ui.invoke!('studio', 'deleteWorks', [[], false]) as { ok: boolean };
    expect(empty.ok).toBe(false);
    await world.stop();
  });

  it('无需 Checkpoint 的导入工作流（如 Krea2 分离式加载器）挂载 LoRA 生图时不弹 CheckpointLoader 提醒', async () => {
    const { data, fake, world } = await setup();
    fake.checkpointNames = [];
    fake.makeDone(['krea.png']);
    const kreaPath = join(data, 'krea2.json');
    writeJson(kreaPath, {
      '10': { class_type: 'UNETLoader', inputs: { unet_name: 'krea2.safetensors', weight_dtype: 'default' } },
      '11': { class_type: 'CLIPLoader', inputs: { clip_name: 't5.safetensors', type: 'krea2' } },
      '12': { class_type: 'VAELoader', inputs: { vae_name: 'ae.safetensors' } },
      '5': { class_type: 'EmptyLatentImage', inputs: { width: 768, height: 1152, batch_size: 1 } },
      '6': { class_type: 'CLIPTextEncode', inputs: { text: '', clip: ['11', 0] } },
      '7': { class_type: 'CLIPTextEncode', inputs: { text: '', clip: ['11', 0] } },
      '3': { class_type: 'KSampler', inputs: { seed: 1, steps: 8, cfg: 1, sampler_name: 'euler', scheduler: 'normal', denoise: 1, model: ['10', 0], positive: ['6', 0], negative: ['7', 0], latent_image: ['5', 0] } },
      '8': { class_type: 'VAEDecode', inputs: { samples: ['3', 0], vae: ['12', 0] } },
      '9': { class_type: 'SaveImage', inputs: { filename_prefix: 'krea', images: ['8', 0] } },
    });

    const ui = world.webUi('zh');
    const imported = await ui.invoke!('workflows', 'importWorkflow', [kreaPath, 'Krea2二次元图片']) as {
      ok: boolean;
      preset?: { id: string; needs_checkpoint?: boolean };
      warnings?: string[];
    };
    expect(imported.ok).toBe(true);
    expect(imported.preset?.needs_checkpoint).toBe(false);
    expect((imported.warnings ?? []).some((w) => w.includes('CheckpointLoader'))).toBe(false);

    const res = await ui.invoke!('studio', 'generate', [{
      workflow: imported.preset!.id,
      positive: '大肥鱼，女仆装，可爱，kawaii',
      negative: 'low quality, blurry',
      checkpoint: '',
      loras: [{ path: '角色/zelda_botw_style.safetensors', weight: 0.8 }],
      steps: 8,
      cfg: 1,
      width: 768,
      height: 1152,
      batch: 1,
      seed: 42,
    }]) as { ok: boolean; warnings?: string[]; error?: string };

    expect(res.ok).toBe(true);
    expect(res.warnings ?? []).toEqual([]);
    const submittedNodes = Object.values((fake.workflow ?? {}) as Record<string, { class_type: string }>);
    expect(submittedNodes.some((n) => n.class_type === 'LoraLoader')).toBe(true);
    await world.stop();
  });

  it('点击生成即使离线失败或校验拦截也会持久化保存参数，重启后 bootstrap 原样恢复', async () => {
    const dir = tempDir();
    dirs.push(dir);
    const offline = new FakeComfy();
    offline.health = async () => ({ ok: false, url: 'http://127.0.0.1:8188', error: 'offline', checked_at: Date.now() });

    const world1 = new CooGenWorld({
      cfg: testCfg({ defaultCheckpoint: 'sdxl.safetensors' }),
      timezone: 'Asia/Shanghai',
      dataDir: dir,
      botDir: dir,
      botName: 'Coo',
      secret: () => '',
      clientFactory: () => offline,
    });
    const ui1 = world1.webUi('zh');
    const failedGen = await ui1.invoke!('studio', 'generate', [{
      workflow: 'quick-txt2img',
      positive: '星空下的铃兰',
      negative: 'blurry',
      checkpoint: 'sdxl.safetensors',
      loras: [{ path: '角色/suzuran.safetensors', weight: 0.75 }],
      sampler: 'dpmpp_2m',
      scheduler: 'karras',
      steps: 28,
      cfg: 6.5,
      width: 832,
      height: 1216,
      batch: 2,
      seed: 123456,
    }]) as { ok: boolean };
    expect(failedGen.ok).toBe(false);
    await world1.stop();

    // 模拟重启：新建 World 实例后 bootstrap 应完整恢复上次点击生成时的参数
    const world2 = new CooGenWorld({
      cfg: testCfg({ defaultCheckpoint: 'sdxl.safetensors' }),
      timezone: 'Asia/Shanghai',
      dataDir: dir,
      botDir: dir,
      botName: 'Coo',
      secret: () => '',
      clientFactory: () => offline,
    });
    const boot2 = await world2.webUi('zh').invoke!('studio', 'bootstrap', []) as {
      last_params?: {
        positive?: string;
        negative?: string;
        checkpoint?: string;
        sampler?: string;
        scheduler?: string;
        steps?: number;
        cfg?: number;
        width?: number;
        height?: number;
        batch?: number;
        seed?: number;
        loras?: Array<{ path: string; weight: number }>;
      };
    };
    expect(boot2.last_params).toMatchObject({
      positive: '星空下的铃兰',
      negative: 'blurry',
      checkpoint: 'sdxl.safetensors',
      sampler: 'dpmpp_2m',
      scheduler: 'karras',
      steps: 28,
      cfg: 6.5,
      width: 832,
      height: 1216,
      batch: 2,
      seed: 123456,
      loras: [{ path: '角色/suzuran.safetensors', weight: 0.75 }],
    });
    await world2.stop();
  });

  it('作品页发送到桌宠时同步触发头顶气泡弹图与 coogen.shared 观看动作及感想事件', async () => {
    const dir = tempDir();
    dirs.push(dir);
    const fake = new FakeComfy();
    fake.historyEntry = {
      outputs: { '7': { images: [{ filename: 'out_0001.png', type: 'output' }] } },
      status: { status_str: 'success', completed: true },
    };
    const bubbleRequests: string[] = [];
    const { host, events } = testHost();
    const world = new CooGenWorld({
      cfg: testCfg({ defaultCheckpoint: 'anything_v5.safetensors', popupEnabled: false }),
      timezone: 'Asia/Shanghai',
      dataDir: dir,
      botDir: dir,
      botName: '铃兰',
      secret: () => '',
      clientFactory: () => fake,
      fetchImpl: (async (input: string | URL | Request) => {
        bubbleRequests.push(String(input));
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }) as typeof fetch,
    });
    await world.start(host);

    const genTool = world.tools().find((t) => t.name === 'coo_gen')!;
    await genTool.handler({ subject: '海边日落', wait: true }, { role: 'test' } as never);

    const ui = world.webUi('zh');
    const hist = await ui.invoke!('studio', 'history', [5]) as { history: Array<{ id: string }> };
    expect(hist.history.length).toBeGreaterThanOrEqual(1);

    const sent = await ui.invoke!('studio', 'sendToPet', [hist.history[0]!.id]) as { ok: boolean; message: string };
    expect(sent.ok).toBe(true);
    expect(sent.message).toContain('感想');
    expect(bubbleRequests.some((u) => u.includes('/api/image-bubble'))).toBe(true);

    const sharedEvent = events.find((e) => e.type === 'coogen.shared');
    expect(sharedEvent).toBeTruthy();
    expect(sharedEvent!.text).toContain('pet_act');
    expect(sharedEvent!.text).toContain('pet_say');
    expect((sharedEvent as unknown as { blobs?: unknown[] }).blobs?.length).toBe(1);
    await world.stop();
  });
});
