/** Explicit, backup-first local installer. No deployment writes without --apply. */
import { copyFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import ts from 'typescript';

const ownPackageDir = fileURLToPath(new URL('../', import.meta.url));
const readJson = file => JSON.parse(readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const canonical = path => process.platform === 'win32' ? realpathSync(path).toLowerCase() : realpathSync(path);

async function loadDefaults(packageDir) {
  const scratch = mkdtempSync(join(tmpdir(), 'coo-mood-install-'));
  try {
    const source = readFileSync(join(packageDir, 'src/config.ts'), 'utf8');
    const output = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, isolatedModules: true, verbatimModuleSyntax: false },
      fileName: 'src/config.ts',
    }).outputText.replaceAll("from 'cortico/core/language.ts'", "from './stub-language.mjs'");
    writeFileSync(join(scratch, 'config.mjs'), output);
    writeFileSync(join(scratch, 'stub-language.mjs'), "export const pick = (language, table) => table[language === 'zh' ? 'zh' : 'en'] ?? table.zh;\n");
    return (await import(pathToFileURL(join(scratch, 'config.mjs')).href)).MOOD_DEFAULTS;
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

export async function installMood({ home, extensions, packageDir = ownPackageDir, apply = false }) {
  if (!home || !extensions) throw new Error('Provide --home and --extensions (or COOPANION_HOME / COOPANION_EXTENSIONS).');
  home = resolve(home); extensions = resolve(extensions); packageDir = resolve(packageDir);
  const packageName = readJson(join(packageDir, 'package.json')).name;
  const extPkgFile = join(extensions, 'package.json');
  const configFile = join(home, 'config.json');
  // Preflight BOTH JSON documents and the existing link before changing either document.
  const extPkg = readJson(extPkgFile);
  const config = readJson(configFile);
  if (!extPkg || typeof extPkg !== 'object' || Array.isArray(extPkg) || !config || typeof config !== 'object' || Array.isArray(config)) throw new Error('Deployment files must be JSON objects.');
  extPkg.dependencies ??= {};
  const spec = `link:${packageDir.replaceAll('\\', '/')}`;
  if (extPkg.dependencies[packageName] && extPkg.dependencies[packageName] !== spec) throw new Error(`Refusing to replace existing dependency ${packageName}; review extensions/package.json first.`);
  const link = join(extensions, 'node_modules', ...packageName.split('/'));
  let hasLink = false;
  try {
    lstatSync(link);
    hasLink = true;
    if (canonical(link) !== canonical(packageDir)) throw new Error(`Existing installation points elsewhere: ${link}`);
  } catch (error) {
    if (hasLink || error.code !== 'ENOENT') throw error;
  }
  const defaults = await loadDefaults(packageDir);
  extPkg.dependencies[packageName] = spec;
  config.worlds ??= {};
  config.worlds.mood = { ...defaults, ...(config.worlds.mood ?? {}), enabled: true };
  const changes = [[extPkgFile, extPkg], [configFile, config]]
    .map(([file, json]) => ({ file, text: `${JSON.stringify(json, null, 2)}\n` }))
    .filter(({ file, text }) => readFileSync(file, 'utf8') !== text);
  const plan = { apply, files: changes.map(change => change.file), link: hasLink ? null : link, packageName, enablesMood: true };
  if (!apply) return plan;
  const suffix = `.bak-mood-${Date.now()}-${randomUUID().slice(0, 8)}`;
  // All backups exist before the first write. Roll back files/new link on failure.
  for (const change of changes) copyFileSync(change.file, change.file + suffix);
  let linked = false;
  try {
    if (!hasLink) {
      mkdirSync(dirname(link), { recursive: true });
      symlinkSync(packageDir, link, process.platform === 'win32' ? 'junction' : 'dir');
      linked = true;
    }
    for (const change of changes) writeFileSync(change.file, change.text, 'utf8');
  } catch (error) {
    for (const change of changes) copyFileSync(change.file + suffix, change.file);
    if (linked) unlinkSync(link);
    throw error;
  }
  return { ...plan, backups: changes.map(change => change.file + suffix) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const { values } = parseArgs({ options: { home: { type: 'string' }, extensions: { type: 'string' }, apply: { type: 'boolean' }, help: { type: 'boolean' } } });
  if (values.help) console.log('Usage: node scripts/install-into-coopanion.mjs --home <deployment> --extensions <extensions> [--apply]\nDefault: dry run. Stop Coopanion before applying. Existing JSON files are backed up.');
  else {
    const plan = await installMood({ home: values.home ?? process.env.COOPANION_HOME, extensions: values.extensions ?? process.env.COOPANION_EXTENSIONS, apply: values.apply === true });
    console.log(JSON.stringify(plan, null, 2));
    console.log(values.apply ? 'Applied. Restart Coopanion; keep backups for rollback.' : 'DRY RUN: deployment unchanged. Review paths, stop Coopanion, then add --apply.');
  }
}
