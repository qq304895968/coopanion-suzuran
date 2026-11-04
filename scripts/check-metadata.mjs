/** Compare the checked-in description with the SDK exporter; does not start any World. */
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { isWorldDefinition } from 'cortico/extensions.ts';
import { parseExtensionManifest } from 'cortico/extensions/manifest.ts';
import { registerFrameworkResolver } from 'cortico/extensions/runtime.ts';
import { exportDescribe } from 'cortico/extensions/describe-export.ts';
import { repositoryRoot, workspacePackages } from './check-repository.mjs';

if (process.argv.slice(2).some(arg => arg !== '--write')) throw new Error('Usage: node --import tsx scripts/check-metadata.mjs [--write]');
const write = process.argv.includes('--write');
const scratchDir = mkdtempSync(join(tmpdir(), 'coopanion-metadata-'));
let errors = 0;
registerFrameworkResolver();
try {
  for (const name of workspacePackages()) {
    const packageDir = join(repositoryRoot, name);
    const pkg = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'));
    const manifest = parseExtensionManifest(pkg, 'en');
    if (!manifest.ok) throw new Error(`${name}: ${manifest.reasons.join('; ')}`);
    const definition = (await import(pathToFileURL(join(packageDir, pkg.main)).href)).default;
    if (!isWorldDefinition(definition)) throw new Error(`${name}: default export is not a WorldDefinition`);
    const generated = await exportDescribe('world', definition, { scratchDir, packageDir, repoRoot: repositoryRoot, language: 'en' });
    if (!generated) throw new Error(`${name}: empty self-description`);
    const expected = JSON.parse(JSON.stringify(generated));
    const path = join(packageDir, pkg.cortico.describe);
    const current = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null;
    if (isDeepStrictEqual(current, expected)) { console.log(`OK ${name}/describe.json`); continue; }
    if (write) {
      writeFileSync(path, `${JSON.stringify(expected, null, 2)}\n`);
      console.log(`UPDATED ${name}/describe.json`);
    } else {
      console.error(`STALE ${name}/describe.json (run pnpm describe:all)`);
      errors++;
    }
  }
} finally { rmSync(scratchDir, { recursive: true, force: true }); }
if (errors) process.exitCode = 1;
