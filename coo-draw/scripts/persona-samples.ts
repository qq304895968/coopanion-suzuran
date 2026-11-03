/**
 * 人设笔触对照图：用合并后的「画室」以本地路由画同一内容，比较不同 LoRA。
 * 只改预览目录，不动真实画夹；需要本机 ComfyUI 已启动。
 *
 *   node --import tsx scripts/persona-samples.ts          # 只列计划
 *   node --import tsx scripts/persona-samples.ts --run    # 真出图
 *
 * 在 Node 24 下跑（Coopanion 自带）：
 *   $env:ELECTRON_RUN_AS_NODE='1'
 *   & 'D:\daily use\Coopanion\Coopanion.exe' "<tsx>\dist\cli.mjs" scripts/persona-samples.ts --run
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { EventEnvelope, ToolCallContext, ToolOutcome, WorldHost } from 'cortico/core/types.ts';
import { DRAW_DEFAULTS, type DrawConfigSection } from '../src/config.ts';
import { DrawWorld } from '../src/world.ts';

const ROOT = 'F:/study/coopanion/.preview/persona-samples';
const CONFIG = 'D:/daily use/Coopanion/data/home/companion/config.json';

interface Variant {
  id: string;
  title: string;
  loras: string;
  note: string;
}

const VARIANTS: Variant[] = [
  { id: 'a-pure', title: '纯 Krea2', loras: '', note: '不叠任何 LoRA，看模型自身的手绘倾向' },
  { id: 'b-quality', title: 'Krea2 + masterpieces 0.35', loras: 'krea2-masterpieces-v51.safetensors:0.35', note: '只加画质 LoRA，压低动漫/写实倾向' },
  { id: 'c-artist', title: 'Krea2 + kazutake 0.4', loras: 'kazutake-hazano_k2_v1.safetensors:0.4', note: '画师风 LoRA，观察是否还能保住蜡笔感' },
];

const SUBJECT = '一只在窗台上打盹的小狐狸';
const PROMPT = 'a small fox curled up asleep on a wooden windowsill at dusk, warm orange light, '
  + 'only the fox and the window, simple background';

const log = {
  trace: () => undefined,
  debug: () => undefined,
  info: (message: string, data?: unknown) => console.log(`  [info] ${message}`, data ?? ''),
  warn: (message: string, data?: unknown) => console.log(`  [warn] ${message}`, data ?? ''),
  error: (message: string, data?: unknown) => console.log(`  [error] ${message}`, data ?? ''),
  emit: () => undefined,
  child: () => log,
};

function fakeHost(pushed: EventEnvelope[]): WorldHost {
  return {
    pushEvent: async (event: Parameters<WorldHost['pushEvent']>[0]) => {
      const saved = { ...event, cursor: pushed.length + 1, origin: event.origin ?? 'external' } as EventEnvelope;
      pushed.push(saved);
      return saved;
    },
    log,
    store: {} as never,
    drainPendingEvents: async () => [],
    blob: () => null,
    reportUsage: () => undefined,
    modelFacts: { model: () => 'test', accepts: () => true, contextWindow: () => undefined },
  } as unknown as WorldHost;
}

function ctx(): ToolCallContext {
  return { role: 'test', log } as unknown as ToolCallContext;
}

async function main(): Promise<void> {
  const run = process.argv.includes('--run');
  const real = JSON.parse(readFileSync(CONFIG, 'utf8')) as { worlds?: Record<string, Partial<DrawConfigSection>> };
  const base: DrawConfigSection = {
    ...DRAW_DEFAULTS,
    ...(real.worlds?.draw ?? {}),
    enabled: true,
    routePet: 'local',
    routeDiary: 'local',
    saveDir: join(ROOT, 'art'),
    popupEnabled: false,
    dailyLimit: 500,
    cooldownSeconds: 0,
    localPopupEnabled: false,
    personaLoras: '',
    personaWorkflow: 'persona-krea2',
  };
  mkdirSync(ROOT, { recursive: true });
  console.log(`输出目录：${ROOT}`);
  console.log(`模型：${base.personaUnet} / ${base.personaClip} / ${base.personaVae}`);
  console.log(`提示词：${PROMPT}`);
  if (!run) {
    for (const variant of VARIANTS) console.log(`- ${variant.id}: ${variant.title}${variant.loras ? ` (${variant.loras})` : ''}`);
    console.log('\n加 --run 才会真正出图。');
    return;
  }

  const report: string[] = ['# 人设笔触对照图', '', `- 内容：${SUBJECT}`, `- 提示词：${PROMPT}`, ''];
  for (const variant of VARIANTS) {
    console.log(`\n=== ${variant.title} ===`);
    const pushed: EventEnvelope[] = [];
    const cfg: DrawConfigSection = { ...base, personaLoras: variant.loras };
    const world = new DrawWorld({
      cfg,
      timezone: 'Asia/Shanghai',
      dataDir: join(ROOT, 'data'),
      botDir: 'D:/daily use/Coopanion/data/home/companion',
      botName: '铃兰',
      secret: () => '',
      popup: { showData: async () => true },
    });
    try {
      await world.start(fakeHost(pushed));
      const tool = world.tools().find((entry) => entry.name === 'pet_draw');
      if (!tool) throw new Error('pet_draw missing');
      const out = (await tool.handler({ subject: SUBJECT, prompt: PROMPT, purpose: 'pet', count: 1 }, ctx())) as ToolOutcome;
      console.log(out.text);
      report.push(`## ${variant.title}`, '', `- LoRA：${variant.loras || '无'}`, `- 说明：${variant.note}`, '', '```text', out.text, '```', '');
      const indexFile = join(base.saveDir, 'index.json');
      if (existsSync(indexFile)) {
        const index = JSON.parse(readFileSync(indexFile, 'utf8')) as { drawings: Array<{ file: string; createdAt: string }> };
        const newest = index.drawings[0];
        if (newest) {
          const src = join(base.saveDir, newest.file);
          const dst = join(ROOT, `${variant.id}.png`);
          copyFileSync(src, dst);
          console.log(`  保存：${dst}`);
          report.push(`![${variant.title}](${variant.id}.png)`, '');
        }
      }
    } catch (error) {
      console.log(`  失败：${error instanceof Error ? error.message : String(error)}`);
      report.push(`## ${variant.title}`, '', `失败：${error instanceof Error ? error.message : String(error)}`, '');
    } finally {
      await world.stop();
    }
  }
  writeFileSync(join(ROOT, 'report.md'), `${report.join('\n')}\n`, 'utf8');
  console.log(`\n报告：${resolve(ROOT, 'report.md')}`);
}

await main();
