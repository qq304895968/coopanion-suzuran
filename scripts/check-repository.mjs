/** Fast, offline guardrails. This is not a full secret/history audit or host certification. */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const generated = /(^|\/)(node_modules|build|out|\.npm|\.pnpm-store|\.tmp(?:-[^/]*)?|\.preview|\.vite|\.cache|dist|coverage|__pycache__)(\/|$)/;
export function forbiddenPath(path) {
  const normalized = path.replaceAll('\\', '/');
  if (generated.test(normalized)) return 'generated/cache/dependency content';
  const name = basename(normalized);
  if (/^\.env(?:\.|$)/.test(name) && !/^\.env\.(?:example|sample|template)$/.test(name)) return 'deployment environment file';
  if (/\.(?:pem|key|p12|pfx)$/.test(name) || name === 'reverse-token.txt') return 'credential file';
  if (normalized !== 'pnpm-lock.yaml' && /(?:^|\/)(?:pnpm-lock\.yaml|package-lock\.json|yarn\.lock)$/.test(normalized)) return 'competing workspace lockfile';
  return null;
}

export function workspacePackages(root = repositoryRoot) {
  const yaml = readFileSync(resolve(root, 'pnpm-workspace.yaml'), 'utf8');
  const section = yaml.match(/^packages:\s*\n((?:[ \t].*\n|\n)+)/m)?.[1] ?? '';
  const names = [...section.matchAll(/^  - ([\w-]+)\s*$/gm)].map(match => match[1]);
  if (!names.length || new Set(names).size !== names.length) throw new Error('Expected unique, explicit workspace package directories');
  return names;
}

function inside(base, path) {
  const rel = relative(base, resolve(base, path));
  return !isAbsolute(rel) && rel !== '..' && !rel.startsWith(`..${sep}`);
}

export function checkRepository({ root = repositoryRoot, artifacts = false } = {}) {
  const errors = [];
  const files = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).split('\0').filter(Boolean);
  for (const file of new Set(files)) {
    const violation = forbiddenPath(file);
    if (violation) errors.push(`${file}: ${violation}`);
  }
  const rootManifest = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
  if (rootManifest.private !== true) errors.push('Root workspace must be private');
  if (!existsSync(resolve(root, 'pnpm-lock.yaml'))) errors.push('Missing root pnpm-lock.yaml');
  const packages = workspacePackages(root);
  const found = readdirSync(root, { withFileTypes: true }).filter(entry => entry.isDirectory() && entry.name !== 'node_modules' && existsSync(resolve(root, entry.name, 'package.json'))).map(entry => entry.name);
  for (const name of found) if (!packages.includes(name)) errors.push(`Package not in workspace: ${name}`);
  for (const name of packages) {
    const base = resolve(root, name);
    const manifest = JSON.parse(readFileSync(resolve(base, 'package.json'), 'utf8'));
    if (manifest.packageManager !== rootManifest.packageManager) errors.push(`${name}: packageManager differs from root`);
    if (manifest.engines?.node !== rootManifest.engines?.node) errors.push(`${name}: Node engine differs from root`);
    for (const [dep, version] of Object.entries(rootManifest.devDependencies)) {
      const required = ['@types/node', 'cortico', 'typescript', 'vitest'].includes(dep);
      if ((required || manifest.devDependencies?.[dep]) && manifest.devDependencies?.[dep] !== version) errors.push(`${name}: ${dep} must be pinned to ${version}`);
    }
    for (const script of ['typecheck', 'test']) if (!manifest.scripts?.[script]) errors.push(`${name}: missing ${script} script`);
    if (manifest.cortico?.api !== 6 || manifest.cortico?.kind !== 'world') errors.push(`${name}: expected World API 6`);
    if (manifest.cortico.webUiClient && !manifest.scripts?.build) errors.push(`${name}: browser client has no build script`);
    const resources = [manifest.main, ...(artifacts ? ['describe', 'webUiClient', 'webUiStyle', 'icon'].map(key => manifest.cortico[key]).filter(Boolean) : [])];
    for (const resource of resources) {
      if (typeof resource !== 'string' || !inside(base, resource)) errors.push(`${name}: invalid resource path ${String(resource)}`);
      else if (!existsSync(resolve(base, resource)) || !statSync(resolve(base, resource)).isFile() || !statSync(resolve(base, resource)).size) errors.push(`${name}: missing/empty resource ${resource} (run pnpm build)`);
    }
    if (artifacts && manifest.cortico.describe && existsSync(resolve(base, manifest.cortico.describe))) {
      try { JSON.parse(readFileSync(resolve(base, manifest.cortico.describe), 'utf8')); }
      catch { errors.push(`${name}: describe metadata is not valid JSON`); }
    }
  }
  return { errors, packages: packages.length, files: new Set(files).size };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv.slice(2).some(arg => arg !== '--artifacts')) throw new Error('Usage: node scripts/check-repository.mjs [--artifacts]');
  const result = checkRepository({ artifacts: process.argv.includes('--artifacts') });
  for (const error of result.errors) console.error(error);
  console.log(`${result.packages} packages, ${result.files} source files, ${result.errors.length} repository errors.`);
  if (result.errors.length) process.exitCode = 1;
}
