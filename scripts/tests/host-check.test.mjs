import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { parseHostArgs, sdkTypecheckConfig, sdkVitestConfig } from '../check-host.mjs';
import { repositoryRoot } from '../check-repository.mjs';

const dirs = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'host-check-test-'));
  dirs.push(root);
  // Deliberately not executable source: rejected arguments must never import these files.
  for (const file of ['app/core-host.cjs', 'vendor/cortico/src/extensions/runtime.ts', 'packages/cortico-world-desktop-pet/src/server.ts']) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), 'THIS MUST NEVER EXECUTE');
  }
  return root;
}

function run(args) {
  return spawnSync(process.execPath, [join(repositoryRoot, 'scripts/check-host.mjs'), ...args], { encoding: 'utf8', timeout: 5000 });
}

test('host checks require an explicit source tree; no implicit deployment or apply flag', () => {
  assert.throws(() => parseHostArgs([]), /host-root/);
  assert.throws(() => parseHostArgs(['--host-root', ' ']), /host-root/);
  assert.throws(() => parseHostArgs(['--host-root', '/fixture', '--apply']), /Unknown option/);
  assert.equal(parseHostArgs(['--help']).help, true);
  assert.equal(parseHostArgs(['--host-root', '/fixture', '--full']).full, true);
});

test('report output must be JSON', () => {
  assert.throws(() => parseHostArgs(['--host-root', '/fixture', '--report', 'server.ts']), /JSON/);
  assert.equal(parseHostArgs(['--host-root', '/fixture', '--report', 'report.json']).report, 'report.json');
});

test('type overrides select the supplied SDK, not node_modules/cortico', () => {
  const sdk = resolve('fixture/vendor/cortico');
  const original = resolve('fixture/extension/tsconfig.json');
  const config = sdkTypecheckConfig(original, sdk);
  assert.equal(config.extends, original);
  assert.deepEqual(config.compilerOptions.paths['cortico/*'], [join(sdk, 'src/*')]);
  assert.deepEqual(config.compilerOptions.paths.cortico, [join(sdk, 'src/index.ts')]);
});

test('Vitest override preserves package config, selects supplied SDK and disables real capture', () => {
  const sdk = resolve('fixture/vendor/cortico');
  const extension = resolve('fixture/extension');
  const config = sdkVitestConfig(extension, sdk);
  assert.ok(config.includes(JSON.stringify(join(extension, 'vitest.config.ts').replaceAll('\\', '/'))));
  assert.ok(config.includes(JSON.stringify(join(sdk, 'src').replaceAll('\\', '/'))));
  assert.ok(config.includes('find: /^cortico\\//'));
  assert.ok(config.includes("COOPANION_SCREEN_INTEGRATION: '0'"));
});

test('existing reports cannot be overwritten and host code is not imported on rejection', () => {
  const host = fixture();
  const report = join(host, 'existing.json');
  writeFileSync(report, '{"keep":true}\n');
  const result = run(['--host-root', host, '--report', report]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /must be a new file/);
  assert.equal(readFileSync(report, 'utf8'), '{"keep":true}\n');
});

test('report output cannot add files inside the host source tree', () => {
  const host = fixture();
  const result = run(['--host-root', host, '--report', join(host, 'new-report.json')]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /cannot be inside the host source tree/);
});
