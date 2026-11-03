/**
 * Generate describe.json without a TS runtime or a bundler.
 *
 * The World source is transpiled one file at a time with the TypeScript API,
 * the few runtime imports from cortico are replaced by tiny stubs, and the
 * resulting modules are imported to read the definition and the env prompt.
 * This keeps `pnpm describe` working in environments where esbuild/tsx cannot
 * spawn a worker process.
 */
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const root = process.cwd();
const build = join(root, '.tmp-assets', 'describe');
rmSync(build, { recursive: true, force: true });
mkdirSync(build, { recursive: true });

const rewrite = (text) => text
  .replaceAll("from 'cortico/core/util.ts'", "from './stub-util.mjs'")
  .replaceAll("from 'cortico/core/language.ts'", "from './stub-language.mjs'")
  .replaceAll("from 'cortico/world.ts'", "from './stub-world.mjs'")
  .replaceAll(/from '\.\/([^']+)\.ts'/g, "from './$1.mjs'");

for (const file of ['src/config.ts', 'src/model.ts', 'src/store.ts', 'src/gal.ts', 'src/world.ts', 'src/definition.ts']) {
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
writeFileSync(join(build, 'stub-world.mjs'), [
  'export const describeTools = (decls, summaries) => decls.map(({ name, description, parameters, tags }) => ({',
  '  name, description, parameters, tags, summary: summaries[name],',
  '}));',
  '',
].join('\n'), 'utf8');

const { MOOD } = await import(pathToFileURL(join(build, 'definition.mjs')).href);
const fakeCtx = {
  id: 'mood',
  cfg: { ...MOOD.defaults(), enabled: true },
  timezone: 'Asia/Shanghai',
  botName: 'Coo',
  botDir: root,
  packageDir: root,
  dataDir: root,
  repoRoot: root,
  secret: () => '',
  storeSecret: () => {},
  persist: () => {},
  restart: async () => {},
};
const instance = MOOD.create(fakeCtx);
const ui = instance.webUi('en');
const doc = ui.promptDocs?.find((item) => item.role === 'envPrompt');
if (!doc) throw new Error('webUi("en") has no role=envPrompt prompt doc.');
const content = readFileSync(doc.path, 'utf8').trim();
const describe = {
  tools: MOOD.describe.tools,
  events: MOOD.describe.events,
  prompts: [{ key: doc.key, title: doc.title, role: doc.role, content }],
};
writeFileSync(join(root, 'describe.json'), `${JSON.stringify(describe, null, 2)}\n`, 'utf8');
console.log(`Wrote describe.json: tools ${describe.tools.length}, events ${describe.events.length}, prompts ${describe.prompts.length}.`);
