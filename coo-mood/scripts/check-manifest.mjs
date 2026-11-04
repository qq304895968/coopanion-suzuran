/**
 * Local subset of the framework's manifest check: the fields the loader reads
 * before installing a World, plus the files this package promises to ship.
 * The full `pnpm check:extension <dir>` still runs from a Cortico checkout.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const problems = [];
const warn = [];

if (pkg.type !== 'module') problems.push('package.json: type must be "module"');
if (typeof pkg.main !== 'string' || !existsSync(join(root, pkg.main))) problems.push(`package.json: main is missing (${pkg.main})`);
if (!pkg.cortico || pkg.cortico.kind !== 'world') problems.push('package.json: cortico.kind must be "world"');
if (pkg.cortico?.api !== 6) problems.push(`package.json: cortico.api must be 6 (found ${pkg.cortico?.api})`);
if (!pkg.cortico?.describe) problems.push('package.json: cortico.describe is not set');
if (!pkg.cortico?.webUiClient) warn.push('package.json: no webUiClient; the panel will not load');
if (!Array.isArray(pkg.files) || !pkg.files.includes('src') || !pkg.files.includes('dist')) problems.push('package.json: files must include src and dist');
if (!existsSync(join(root, 'src', 'index.ts'))) problems.push('src/index.ts is missing');
if (!existsSync(join(root, 'README.md'))) warn.push('README.md is missing');
if (!existsSync(join(root, 'CHANGELOG.md'))) warn.push('CHANGELOG.md is missing');
if (!existsSync(join(root, pkg.cortico?.describe ?? 'describe.json'))) problems.push('describe.json is missing; run `pnpm describe`');

if (existsSync(join(root, 'describe.json'))) {
  const describe = JSON.parse(readFileSync(join(root, 'describe.json'), 'utf8'));
  if (!Array.isArray(describe.tools) || describe.tools.length === 0) problems.push('describe.json: tools is empty');
  if (!Array.isArray(describe.events)) problems.push('describe.json: events is not an array');
  if (!Array.isArray(describe.prompts) || !describe.prompts.some((p) => p.role === 'envPrompt')) problems.push('describe.json: no envPrompt');
}

for (const warning of warn) console.log(`⚠ ${warning}`);
if (problems.length) {
  for (const problem of problems) console.error(`✗ ${problem}`);
  process.exit(1);
}
console.log(`manifest ok: kind=${pkg.cortico.kind}, api=${pkg.cortico.api}, describe=${pkg.cortico.describe}`);
