import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { forbiddenPath, workspacePackages } from '../check-repository.mjs';
import { drawingMirrors, syncDrawing } from '../sync-drawing.mjs';

const dirs = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'mirror-test-')); dirs.push(root);
  mkdirSync(join(root, 'source')); mkdirSync(join(root, 'mirror'));
  writeFileSync(join(root, 'source/code.ts'), 'export const value = 1;\n');
  writeFileSync(join(root, 'mirror/code.ts'), 'stale');
  return { root, pairs: [{ source: 'source/code.ts', mirror: 'mirror/code.ts' }] };
}

test('repository policy blocks generated files, credentials and competing locks', () => {
  for (const path of ['.pnpm-store/a', 'qq-final/dist/a.js', 'x/node_modules/a', 'a/.tmp-test/picture.png', 'a/.env.local', '.env', 'a/private.pem', 'x/reverse-token.txt', 'coo-diary/pnpm-lock.yaml', 'package-lock.json']) assert.ok(forbiddenPath(path), path);
  for (const path of ['pnpm-lock.yaml', '.env.example', 'a/.env.template', 'arknights/data/operators.json', 'coo-screen/sidecar/capture.py', 'qq-final/src/console/style.css']) assert.equal(forbiddenPath(path), null, path);
});

test('all ten packages and the 25 reviewed source mirrors are declared', () => {
  assert.equal(workspacePackages().length, 10);
  assert.equal(drawingMirrors.length, 25);
  assert.equal(new Set(drawingMirrors.map(pair => pair.mirror)).size, 25);
});

test('mirror checking never modifies a divergent destination', () => {
  const options = fixture();
  assert.equal(syncDrawing({ ...options, check: true }).length, 1);
  assert.equal(readFileSync(join(options.root, 'mirror/code.ts'), 'utf8'), 'stale');
});

test('sync copies only from canonical source and is idempotent', () => {
  const options = fixture();
  assert.equal(syncDrawing({ ...options, check: false }).length, 1);
  assert.equal(readFileSync(join(options.root, 'mirror/code.ts'), 'utf8'), 'export const value = 1;\n');
  assert.equal(syncDrawing(options).length, 0);
});

test('invalid or missing sources cause no partial mirror writes', () => {
  const options = fixture();
  assert.throws(() => syncDrawing({ ...options, check: false, pairs: [...options.pairs, { source: 'source/missing.ts', mirror: 'mirror/other.ts' }] }));
  assert.equal(readFileSync(join(options.root, 'mirror/code.ts'), 'utf8'), 'stale');
  assert.throws(() => syncDrawing({ ...options, pairs: [{ source: '../outside.ts', mirror: 'mirror/code.ts' }] }), /Unsafe mirror path/);
});
