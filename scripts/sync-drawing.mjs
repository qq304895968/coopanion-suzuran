/** Shared coo-draw modules used to be mirrored into standalone legacy packages; the register is now empty. */
import { existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
export const drawingMirrors = JSON.parse(readFileSync(new URL('./drawing-mirrors.json', import.meta.url), 'utf8'));

function safePath(root, name) {
  if (isAbsolute(name) || name.includes('\\') || name.split('/').some(p => !p || p === '.' || p === '..')) throw new Error(`Unsafe mirror path: ${name}`);
  const path = resolve(root, name);
  let parent = path;
  while (!existsSync(parent)) parent = dirname(parent);
  const rel = relative(realpathSync(root), realpathSync(parent));
  if (isAbsolute(rel) || rel === '..' || rel.startsWith(`..${sep}`)) throw new Error(`Mirror escapes repository: ${name}`);
  if (existsSync(path) && !lstatSync(path).isFile()) throw new Error(`Expected regular mirror file: ${name}`);
  return path;
}

export function syncDrawing({ root = repositoryRoot, pairs = drawingMirrors, check = true } = {}) {
  // Validate and read every source before making any changes.
  const plan = pairs.map(({ source, mirror }) => {
    const from = safePath(root, source);
    const to = safePath(root, mirror);
    const bytes = readFileSync(from);
    const drift = !existsSync(to) || !readFileSync(to).equals(bytes);
    return { source, mirror, to, bytes, drift };
  }).filter(item => item.drift);
  if (!check) for (const item of plan) {
    mkdirSync(dirname(item.to), { recursive: true });
    writeFileSync(item.to, item.bytes);
  }
  return plan.map(({ source, mirror }) => ({ source, mirror }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--check')) throw new Error('Usage: node scripts/sync-drawing.mjs [--check]');
  const check = args.includes('--check');
  const drift = syncDrawing({ check });
  for (const item of drift) console.log(`${check ? 'DRIFT' : 'SYNC'} ${item.source} -> ${item.mirror}`);
  if (!drawingMirrors.length) {
    console.log('No drawing mirrors registered: coo-draw is the only drawing package.');
  } else {
    console.log(`${drawingMirrors.length} drawing mirrors; ${drift.length} ${check ? 'out of sync' : 'updated'}.`);
  }
  if (check && drift.length) process.exitCode = 1;
}
