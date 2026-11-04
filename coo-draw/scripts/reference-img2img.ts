import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { EventEnvelope, ToolCallContext, ToolOutcome, WorldHost } from 'cortico/core/types.ts';
import { DRAW_DEFAULTS, type DrawConfigSection } from '../src/config.ts';
import { DrawWorld } from '../src/world.ts';

import { loadPreviewConfig, previewOptions, PREVIEW_USAGE } from './preview-options.ts';

const options = previewOptions('reference-retry');
if (options.help) { console.log(PREVIEW_USAGE); process.exit(0); }
const ROOT = options.output;
const REF = options.reference;
const SUBJECT = '洞窟里的瀑布、彩虹和石柱，秋天的红树，铃兰站在左下角抬头看';
const PROMPT = '洞窟内部：右侧一条很高的白色瀑布从洞顶落下，水雾弥漫；洞心一座灰白色石笋，'
  + '顶上长着一棵黑色的枯树；一道淡绿色的彩虹横跨洞窟；周围是秋天的红色和橙色树木；'
  + '左下角站着铃兰——金发、狐耳、九条尾巴、白蓝色连衣裙、红色伞，抬头看瀑布。'
  + '整个画面是蜡笔画，粗蜡笔笔触，纸面颗粒；不要游戏界面、按钮、文字、水印。';

const log = {
  trace: () => undefined, debug: () => undefined,
  info: () => undefined, warn: () => undefined, error: () => undefined,
  emit: () => undefined, child: () => log,
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

const real = loadPreviewConfig(options);
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
  personaWorkflow: 'persona-krea2',
  personaReferenceMode: 'img2img',
  personaLoras: '',
};
console.log(`Reference: ${REF}\nPreview directory: ${ROOT}`);
if (!options.run) {
  console.log(PREVIEW_USAGE);
  console.log(`Planned denoise: ${options.denoise ?? '0.45, 0.6, 0.72'}`);
  process.exit(0);
}
mkdirSync(ROOT, { recursive: true });
const only = options.denoise;
for (const denoise of only !== undefined ? [only] : [0.45, 0.6, 0.72]) {
  console.log(`\n=== img2img denoise ${denoise} ===`);
  const pushed: EventEnvelope[] = [];
  const cfg: DrawConfigSection = { ...base, personaImg2imgDenoise: denoise };
  const world = new DrawWorld({
    cfg,
    timezone: 'Asia/Shanghai',
    dataDir: join(ROOT, 'data'),
    botDir: options.botDir,
    botName: '铃兰',
    secret: () => '',
    popup: { showData: async () => true },
  });
  try {
    await world.start(fakeHost(pushed));
    const tool = world.tools().find((entry) => entry.name === 'pet_draw');
    if (!tool) throw new Error('pet_draw missing');
    const out = (await tool.handler({
      subject: SUBJECT,
      prompt: PROMPT,
      referencePath: REF,
      purpose: 'pet',
      count: 1,
    }, ctx())) as ToolOutcome;
    console.log(out.text);
    const indexFile = join(base.saveDir, 'index.json');
    if (existsSync(indexFile)) {
      const index = JSON.parse(readFileSync(indexFile, 'utf8')) as { drawings: Array<{ file: string }> };
      const newest = index.drawings[0];
      if (newest) {
        const dst = join(ROOT, `img2img-${denoise}.png`);
        copyFileSync(join(base.saveDir, newest.file), dst);
        console.log(`saved ${dst}`);
      }
    }
  } catch (error) {
    process.exitCode = 1;
    console.log(`failed: ${error instanceof Error ? error.message : String(error)}`);
    writeFileSync(join(ROOT, `img2img-${denoise}.error.txt`), String(error));
  } finally {
    await world.stop();
  }
}
