import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../../patch-pet-host.ps1', import.meta.url));
const source = readFileSync(script, 'utf8');
const dirs = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });
function hostFixture() {
  const root = mkdtempSync(join(tmpdir(), 'host-patch-test-')); dirs.push(root);
  mkdirSync(join(root, 'src')); mkdirSync(join(root, 'web'));
  const here = name => source.match(new RegExp(`\\$${name} = @'\\n([\\s\\S]*?)\\n'@`))[1];
  const quoted = name => source.match(new RegExp(`\\$${name} = "([^\\n]*)"`))[1];
  writeFileSync(join(root, 'src/server.ts'), `${quoted('serverRouteAnchor')}\n${here('bodyOld')}\n`);
  writeFileSync(join(root, 'web/pet-app.js'), `${quoted('caseOld')}\n${here('fnOld')}\n${here('stepOld')}\n`);
  writeFileSync(join(root, 'web/pet.css'), '.bubble { color: black; }\n');
  return root;
}
const invoke = (root, ...args) => execFileSync('pwsh', ['-NoProfile', '-File', script, '-HostRoot', root, ...args], { encoding: 'utf8' });

test('patch source requires explicit apply and uses precise idempotency markers', () => {
  assert.match(source, /\[switch\]\$Apply/);
  assert.match(source, /ShouldProcess/);
  assert.match(source, /'const IMAGE_BUBBLE_MAX ='/);
  assert.match(source, /'\/\/ a picture leaves on its own clock'/);
  assert.doesNotMatch(source, /D:\\daily use/);
});
test('PowerShell patch: dry run, backup, apply and second-run idempotency on fixture', { skip: process.platform !== 'win32' }, () => {
  const root = hostFixture();
  const file = join(root, 'src/server.ts');
  const original = readFileSync(file, 'utf8');
  assert.match(invoke(root), /DRY RUN/);
  assert.equal(readFileSync(file, 'utf8'), original);
  assert.equal(readdirSync(join(root, 'src')).length, 1);
  invoke(root, '-Apply', '-Confirm:$false');
  const patched = readFileSync(file, 'utf8');
  assert.match(patched, /const IMAGE_BUBBLE_MAX =/);
  assert.match(patched, /path === '\/api\/image-bubble'/);
  assert.match(readFileSync(join(root, 'web/pet-app.js'), 'utf8'), /a picture leaves on its own clock/);
  assert.equal(readdirSync(join(root, 'src')).filter(name => name.includes('.bak-')).length, 1);
  assert.match(invoke(root, '-Apply', '-Confirm:$false'), /Already patched/);
  assert.equal(readFileSync(file, 'utf8'), patched);
});
test('PowerShell patch preflights every anchor before any writes', { skip: process.platform !== 'win32' }, () => {
  const root = hostFixture();
  const file = join(root, 'src/server.ts');
  const original = readFileSync(file, 'utf8');
  writeFileSync(join(root, 'web/pet-app.js'), '// incompatible host version\n');
  assert.throws(() => invoke(root, '-Apply', '-Confirm:$false'));
  assert.equal(readFileSync(file, 'utf8'), original);
  assert.equal(readdirSync(join(root, 'src')).length, 1);
  assert.equal(existsSync(join(root, 'backup')), false);
});
