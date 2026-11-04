import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { installMood } from '../../coo-mood/scripts/install-into-coopanion.mjs';

const dirs = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'mood-install-test-')); dirs.push(root);
  const home = join(root, 'home'), extensions = join(root, 'extensions');
  mkdirSync(home); mkdirSync(extensions);
  writeFileSync(join(home, 'config.json'), '{"worlds":{"other":{"enabled":true},"mood":{"custom":"retained"}}}\n');
  writeFileSync(join(extensions, 'package.json'), '{"private":true}\n');
  return { home, extensions };
}

test('installer requires explicit deployment paths', async () => {
  await assert.rejects(installMood({}), /Provide --home/);
});
test('installer dry-run changes neither config nor dependencies or links', async () => {
  const options = fixture();
  const before = readFileSync(join(options.home, 'config.json'), 'utf8');
  const plan = await installMood(options);
  assert.equal(plan.apply, false);
  assert.equal(readFileSync(join(options.home, 'config.json'), 'utf8'), before);
  assert.equal(readFileSync(join(options.extensions, 'package.json'), 'utf8'), '{"private":true}\n');
  assert.equal(existsSync(join(options.extensions, 'node_modules')), false);
});
test('an invalid config cannot partially install the dependency', async () => {
  const options = fixture();
  writeFileSync(join(options.home, 'config.json'), '{invalid');
  await assert.rejects(installMood({ ...options, apply: true }));
  assert.equal(readFileSync(join(options.extensions, 'package.json'), 'utf8'), '{"private":true}\n');
  assert.equal(existsSync(join(options.extensions, 'node_modules')), false);
});
test('applying to a disposable fixture keeps backups, custom config and idempotency', async () => {
  const options = fixture();
  const before = readFileSync(join(options.home, 'config.json'), 'utf8');
  const plan = await installMood({ ...options, apply: true });
  assert.equal(plan.backups.length, 2);
  assert.equal(readFileSync(plan.backups.find(path => path.includes('config.json')), 'utf8'), before);
  const cfg = JSON.parse(readFileSync(join(options.home, 'config.json'), 'utf8'));
  assert.equal(cfg.worlds.mood.enabled, true);
  assert.equal(cfg.worlds.mood.custom, 'retained');
  assert.equal(cfg.worlds.other.enabled, true);
  assert.equal(realpathSync(plan.link), realpathSync(fileURLToPath(new URL('../../coo-mood', import.meta.url))));
  const again = await installMood({ ...options, apply: true });
  assert.deepEqual(again.files, []);
  assert.equal(again.link, null);
});
