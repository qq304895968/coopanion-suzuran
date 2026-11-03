/**
 * Local installer used by this checkout: link the package into Coopanion's
 * extensions workspace (if needed) and add a full `worlds.mood` section with
 * `enabled: true`. It only edits the deployment's config and package.json;
 * stop Coopanion before running it, then start it again.
 *
 * Paths can be overridden with COOPANION_HOME / COOPANION_EXTENSIONS.
 */
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const home = process.env.COOPANION_HOME ?? 'D:\\daily use\\Coopanion\\data\\home\\companion';
const extensions = process.env.COOPANION_EXTENSIONS ?? 'D:\\daily use\\Coopanion\\data\\extensions';
const packageDir = process.cwd();
const packageName = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8')).name;

// --- 1. dependency entry ---------------------------------------------------
const readJson = (file) => JSON.parse(readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const extPkgFile = join(extensions, 'package.json');
const extPkg = readJson(extPkgFile);
extPkg.dependencies ??= {};
const spec = `link:${packageDir.replaceAll('\\', '/')}`;
if (!extPkg.dependencies[packageName]) {
  extPkg.dependencies[packageName] = spec;
  copyFileSync(extPkgFile, `${extPkgFile}.bak-mood-${Date.now()}`);
  writeFileSync(extPkgFile, `${JSON.stringify(extPkg, null, 2)}\n`, 'utf8');
  console.log(`added ${packageName} -> ${spec}`);
} else {
  console.log(`${packageName} already in extensions/package.json`);
}

// --- 2. node_modules link --------------------------------------------------
const link = join(extensions, 'node_modules', ...packageName.split('/'));
if (!existsSync(link)) {
  mkdirSync(dirname(link), { recursive: true });
  symlinkSync(packageDir, link, 'junction');
  console.log(`linked ${link}`);
} else {
  console.log(`${link} already exists`);
}

// --- 3. full worlds.mood section ------------------------------------------
const scratch = mkdtempSync(join(tmpdir(), 'coo-mood-install-'));
let defaults;
try {
  const source = readFileSync(join(packageDir, 'src', 'config.ts'), 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      isolatedModules: true,
      verbatimModuleSyntax: false,
    },
    fileName: 'src/config.ts',
  }).outputText
    .replaceAll("from 'cortico/core/language.ts'", "from './stub-language.mjs'");
  writeFileSync(join(scratch, 'config.mjs'), output, 'utf8');
  writeFileSync(join(scratch, 'stub-language.mjs'), 'export const pick = (language, table) => table[language === \'zh\' ? \'zh\' : \'en\'] ?? table.zh;\n', 'utf8');
  const mod = await import(pathToFileURL(join(scratch, 'config.mjs')).href);
  defaults = mod.MOOD_DEFAULTS;
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

const configFile = join(home, 'config.json');
const config = readJson(configFile);
config.worlds ??= {};
config.worlds.mood = { ...defaults, ...(config.worlds.mood ?? {}), enabled: true };
copyFileSync(configFile, `${configFile}.bak-mood-${Date.now()}`);
writeFileSync(configFile, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
console.log(`worlds.mood written to ${configFile} (enabled: true)`);
