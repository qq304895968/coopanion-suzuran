/**
 * Fast, dependency-free smoke test for the pure math, the store and one World
 * turn. It transpiles the TS sources with the TypeScript API and stubs the two
 * cortico runtime helpers, so it runs even where vitest/esbuild cannot spawn.
 */
import assert from 'node:assert/strict';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const root = process.cwd();
const build = join(root, '.tmp-assets', 'smoke');
rmSync(build, { recursive: true, force: true });
mkdirSync(build, { recursive: true });

const rewrite = (text) => text
  .replaceAll("from 'cortico/core/util.ts'", "from './stub-util.mjs'")
  .replaceAll("from 'cortico/core/language.ts'", "from './stub-language.mjs'")
  .replaceAll("from 'cortico/world.ts'", "from './stub-world.mjs'")
  .replaceAll(/from '\.\/([^']+)\.ts'/g, "from './$1.mjs'");

for (const file of ['src/config.ts', 'src/model.ts', 'src/store.ts', 'src/gal.ts', 'src/world.ts']) {
  const source = readFileSync(join(root, file), 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      isolatedModules: true,
      verbatimModuleSyntax: false,
    },
    fileName: file,
  }).outputText;
  writeFileSync(join(build, file.split('/').pop().replace(/\.ts$/, '.mjs')), rewrite(output), 'utf8');
}
copyFileSync(join(root, 'src', 'ENV_PROMPT.md'), join(build, 'ENV_PROMPT.md'));
writeFileSync(join(build, 'stub-util.mjs'), 'export const nowIso = (_timezone, d = new Date()) => d.toISOString();\n', 'utf8');
writeFileSync(join(build, 'stub-language.mjs'), 'export const pick = (language, table) => table[language === \'zh\' ? \'zh\' : \'en\'] ?? table.zh;\n', 'utf8');
writeFileSync(join(build, 'stub-world.mjs'), 'export const describeTools = (decls) => decls;\n', 'utf8');

const model = await import(pathToFileURL(join(build, 'model.mjs')).href);
const { MoodStore } = await import(pathToFileURL(join(build, 'store.mjs')).href);
const { MoodWorld } = await import(pathToFileURL(join(build, 'world.mjs')).href);
const { MOOD_DEFAULTS } = await import(pathToFileURL(join(build, 'config.mjs')).href);

const cfg = (patch = {}) => ({
  ...structuredClone(MOOD_DEFAULTS),
  enabled: true,
  noiseStd: 0,
  diminishWindowMinutes: 0,
  ...patch,
});
const persona = model.resolvedPersona(cfg());

// Bands.
assert.equal(model.bandFor(20), 'critical_low');
assert.equal(model.bandFor(21), 'low');
assert.equal(model.bandFor(40), 'low');
assert.equal(model.bandFor(41), 'neutral');
assert.equal(model.bandFor(60), 'neutral');
assert.equal(model.bandFor(61), 'high');
assert.equal(model.bandFor(80), 'high');
assert.equal(model.bandFor(81), 'euphoric');

// Emotion probabilities.
const lowProb = model.emotionDistribution(10, persona);
const highProb = model.emotionDistribution(95, persona);
assert.equal(Math.round(Object.values(lowProb).reduce((a, b) => a + b, 0)), 100);
assert.equal(Math.round(Object.values(highProb).reduce((a, b) => a + b, 0)), 100);
assert.ok(highProb.happy > lowProb.happy, 'high mood should raise happy');
assert.ok(lowProb.sad > highProb.sad, 'low mood should raise sad');

// Sentiment.
assert.ok(model.analyzeTone('谢谢你，好喜欢你').score > 0);
assert.ok(model.analyzeTone('你真没用，滚').score < 0);
assert.equal(model.analyzeTone('哦').cold, true);
assert.ok(model.estimateDialogueDelta('谢谢你，好喜欢你', '嘿嘿。', 60, cfg()).delta > 0);

// Persona detection.
const detected = model.analyzePersonaText('礼貌、认真、容易害羞，也容易担心。我相信事情会变好。被夸会脸红，难过的时候会安静一点。');
assert.equal(detected.preset, 'gentle');
assert.ok(detected.confidence > 0);

// Store caps and daily settlement.
const dir = mkdtempSync(join(tmpdir(), 'coo-mood-smoke-'));
try {
  let clock = new Date('2026-10-29T12:00:00+08:00');
  const store = new MoodStore({
    dataDir: dir,
    timezone: 'Asia/Shanghai',
    now: () => clock,
    random: () => 0.5,
  });
  const initialCfg = cfg({ dailySwingCap: 15, dialogueDailyCap: 20 });
  const loaded = store.load(initialCfg, persona);
  assert.equal(loaded.reset, null);
  const start = store.data.value;
  for (let i = 0; i < 6; i += 1) store.apply('event', 5, `test ${i}`, initialCfg, persona);
  const total = store.today().event;
  assert.ok(total <= 15 + 1e-9, `event total ${total} should stop at 15`);
  assert.equal(store.data.value, start + Math.round(total));

  clock = new Date('2026-10-30T12:00:00+08:00');
  const roll = store.rollover('2026-10-30', initialCfg, persona);
  assert.equal(roll.settled.length, 1);
  assert.equal(store.data.history.length, 1);
  assert.equal(store.data.history[0].date, '2026-10-29');
  assert.equal(store.data.history[0].final_value, start + Math.round(total));
  assert.ok(store.data.value < start + Math.round(total), 'new day should drift back to the anchor');
} finally {
  rmSync(dir, { recursive: true, force: true });
}

// One World turn with a fake host.
class FakeHost {
  events = [];
  cursor = 0;
  pushOpts = [];
  store = {
    get: (cursor) => this.events.find((event) => event.cursor === cursor),
    latestCursor: () => this.cursor,
    range: (query = {}) => this.events.filter((event) => (query.fromCursor === undefined || event.cursor >= query.fromCursor)
      && (query.toCursor === undefined || event.cursor <= query.toCursor)),
    around: () => [],
    grep: () => [],
  };
  blob = () => null;
  modelFacts = { model: () => 'test', accepts: () => false, contextWindow: () => 128000 };
  log = { child() { return this; }, info() {}, warn() {}, error() {}, debug() {}, trace() {}, emit() {} };
  async pushEvent(event, opts) {
    const full = { ...event, cursor: ++this.cursor, origin: event.origin ?? 'external' };
    this.events.push(full);
    this.pushOpts.push(opts);
    return full;
  }
  async drainPendingEvents() { return []; }
  reportUsage() {}
  add(event) {
    const full = { ...event, cursor: ++this.cursor, origin: event.origin ?? 'external' };
    this.events.push(full);
    return full;
  }
}

const worldDir = mkdtempSync(join(tmpdir(), 'coo-mood-world-'));
try {
  const worldCfg = cfg({ autoDialogue: true, autoBrowse: true, personality: undefined });
  const host = new FakeHost();
  const world = new MoodWorld({
    cfg: worldCfg,
    timezone: 'Asia/Shanghai',
    botDir: root,
    dataDir: worldDir,
    persist: () => {},
    now: () => new Date('2026-10-29T12:00:00+08:00'),
    random: () => 0.5,
  });
  await world.start(host);
  assert.equal(world.tools().length, 4, 'status, apply, roll and gal_start are on; mood_feel is off');
  assert.equal(world.webUi('zh').panels?.[0]?.id, 'overview');
  assert.ok(world.envPromptVars()['mood.gal'].includes('gal_start'));
  const before = world.envPromptVars()['mood.value'];

  host.add({
    type: 'desktop-pet.message',
    ts: '2026-10-29T12:00:01+08:00',
    source: 'desktop-pet',
    origin: 'external',
    text: '[12:00] 博士：谢谢你，好喜欢你',
    meta: { text: '谢谢你，好喜欢你' },
  });
  host.add({
    type: 'desktop-pet.self',
    ts: '2026-10-29T12:00:02+08:00',
    source: 'desktop-pet',
    text: 'desktop-pet.self',
    meta: { kind: 'say', beats: [{ text: '嘿嘿，被夸了。' }] },
  });
  world.onTurnEnded();
  const after = world.envPromptVars()['mood.value'];
  assert.notEqual(after, before, 'a positive dialogue should move the mood');
  assert.ok(host.events.some((event) => event.type === 'mood.snapshot'), 'a changed mood should push a snapshot');

  // Situation quiz: start it, bind the pet_ask by its options, answer A and settle.
  const galTool = world.tools().find((tool) => tool.name === 'gal_start');
  assert.ok(galTool, 'gal_start is registered');
  const situation = '今天收拾东西的时候翻到一张旧照片，上面的人我好像认识，但怎么也想不起来了……';
  const question = '你会怎么做？';
  const choices = [
    { text: '我帮你一起想，慢慢来。', mood_delta: 5 },
    { text: '想不起来就算了，别纠结。', mood_delta: -2 },
    { text: '拍下来发给我，我帮你查查！', mood_delta: 3 },
  ];
  const galReceipt = await galTool.handler({ situation, question, choices, source: 'user' }, { role: 'test', log: host.log });
  assert.equal(typeof galReceipt, 'string');
  assert.ok(galReceipt.includes('pet_ask'));
  const badReceipt = await galTool.handler({ situation: '太短', question: '?', choices: [] }, { role: 'test', log: host.log });
  assert.equal(typeof badReceipt === 'object' && badReceipt.failed, true);

  const beforeGal = Number(world.envPromptVars()['mood.value'].split('/')[0]);
  const askQuestion = `📖 ${situation}\n\n❓ ${question}`;
  host.add({
    type: 'desktop-pet.self',
    ts: '2026-10-29T12:00:03+08:00',
    source: 'desktop-pet',
    text: 'desktop-pet.self',
    meta: { kind: 'ask', askId: 'a-test', question: askQuestion, options: choices.map((choice, index) => `${'ABC'[index]}. ${choice.text}`), own: false },
  });
  host.add({
    type: 'desktop-pet.answer',
    ts: '2026-10-29T12:00:04+08:00',
    source: 'desktop-pet',
    origin: 'external',
    text: 'desktop-pet.answer',
    meta: { askId: 'a-test', index: 0 },
  });
  world.onTurnEnded();
  const afterGal = Number(world.envPromptVars()['mood.value'].split('/')[0]);
  assert.ok(afterGal > beforeGal, 'choice A should raise the mood');
  assert.equal(world.overview().gal.active, false, 'the quiz is consumed after the answer');
  assert.equal(world.overview().gal.startedToday, 1);

  // Regression: a double-click glance produces touch + screen.shot + self activity
  // events, but no user message. The activity record must not become a dialogue
  // sample; only the browsing channel may move.
  host.add({
    type: 'desktop-pet.touch',
    ts: '2026-10-29T12:00:05+08:00',
    source: 'desktop-pet',
    origin: 'external',
    text: '[12:00] [touch] 博士戳了你 2 下',
    meta: { touch: { kind: 'poke', count: 2, woke: false, crashed: false } },
  });
  host.add({
    type: 'screen.shot',
    ts: '2026-10-29T12:00:06+08:00',
    source: 'screen',
    origin: 'external',
    text: '[看一眼] 用户双击了你的身体,要你看一眼屏幕。截图 id：m-test。',
    meta: {},
    blobs: [{ handle: 'log:test', mime: 'image/png', fallbackText: '屏幕截图' }],
  });
  host.add({
    type: 'desktop-pet.self',
    ts: '2026-10-29T12:00:07+08:00',
    source: 'desktop-pet',
    origin: 'external',
    text: '做了:screen_rate',
    meta: { kind: 'activity', steps: ['screen_rate'], ms: 1 },
  });
  host.add({
    type: 'desktop-pet.self',
    ts: '2026-10-29T12:00:08+08:00',
    source: 'desktop-pet',
    origin: 'external',
    text: '楼主嫌他满嘴垃圾话。',
    meta: { kind: 'say', beats: [{ text: '楼主嫌他满嘴垃圾话。', mood: { id: 'thinking', zh: '思考' } }] },
  });
  world.onTurnEnded();
  const fresh = world.overview().recent.slice(0, 2);
  assert.equal(fresh[0]?.source, 'browse', 'a glance should use the browsing channel');
  assert.ok(!fresh.some((change) => change.source === 'dialogue' && change.reason === '普通闲聊'),
    'self activity must not become user dialogue');

  worldCfg.modelReport = true;
  assert.equal(world.tools().length, 5, 'mood_feel appears when model self-report is on');
  await world.stop();
} finally {
  rmSync(worldDir, { recursive: true, force: true });
}

console.log('smoke ok: bands, probabilities, sentiment, persona, caps, rollover, world turn, situation quiz');
