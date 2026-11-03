/**
 * Write describe.json. Equivalent to Cortico's `pnpm describe:extension <dir>`,
 * using the npm `cortico` package rather than a full Cortico checkout.
 */
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseExtensionManifest } from 'cortico/extensions/manifest.ts';
import { registerFrameworkResolver } from 'cortico/extensions/runtime.ts';
import {
  DEFAULT_DESCRIBE_FILE,
  MISSING_DESCRIBE,
  exportDescribe,
} from 'cortico/extensions/describe-export.ts';

function exit(message: string): void {
  console.error(message);
  process.exitCode = 1;
}

function looksLikeWorld(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const def = value as Record<string, unknown>;
  return typeof def.id === 'string' && typeof def.label === 'string'
    && typeof def.defaults === 'function' && typeof def.create === 'function';
}

async function main(): Promise<void> {
  const arg = process.argv[2] ?? '.';
  const pkgDir = resolve(process.cwd(), arg);
  const pkgFile = join(pkgDir, 'package.json');
  if (!existsSync(pkgFile)) return exit(`${pkgFile} does not exist.`);
  const pkg = JSON.parse(readFileSync(pkgFile, 'utf8')) as import('cortico/extensions/manifest.ts').ExtensionPackageJson & {
    main?: string;
    files?: string[];
  };

  const parsed = parseExtensionManifest(pkg, 'en');
  for (const warning of parsed.warnings) console.log(`warning: ${warning}`);
  if (!parsed.ok) return exit(parsed.reasons.map((reason) => `error: ${reason}`).join('\n'));
  const { manifest } = parsed;
  const block = ((pkg as { cortico?: Record<string, unknown> }).cortico ??= {});
  if (block.describe !== undefined && manifest.describe === undefined) {
    return exit('Fix cortico.describe or remove it to use describe.json.');
  }

  const main = typeof pkg.main === 'string' ? pkg.main : '';
  if (!main) return exit('package.json has no main entry.');
  const entry = resolve(pkgDir, main);
  if (!existsSync(entry)) return exit(`Entry ${entry} does not exist.`);

  registerFrameworkResolver();
  const exported = ((await import(pathToFileURL(entry).href)) as { default?: unknown }).default;
  if (!looksLikeWorld(exported)) return exit('The default export does not look like a WorldDefinition.');

  const scratchDir = mkdtempSync(join(tmpdir(), 'cortico-describe-api-balance-'));
  try {
    const describe = await exportDescribe(manifest.kind, exported, {
      scratchDir,
      packageDir: pkgDir,
      repoRoot: pkgDir,
      language: 'en',
    });
    if (!describe) return exit(MISSING_DESCRIBE[manifest.kind]);
    const target = manifest.describe ?? DEFAULT_DESCRIBE_FILE;
    writeFileSync(join(pkgDir, target), `${JSON.stringify(describe, null, 2)}\n`, 'utf8');
    console.log(`Wrote ${join(pkgDir, target)}: tools ${describe.tools?.length ?? 0}, events ${describe.events?.length ?? 0}, prompts ${describe.prompts?.length ?? 0}.`);
    if (block.describe === undefined) {
      block.describe = target;
      writeFileSync(pkgFile, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
      console.log(`Added "describe": "${target}" to package.json.`);
    }
    if (Array.isArray(pkg.files) && !pkg.files.includes(target)) {
      console.log(`warning: package.json files does not list ${target}.`);
    }
  } finally {
    rmSync(scratchDir, { recursive: true, force: true });
  }
}

await main();
