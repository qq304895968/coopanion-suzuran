/**
 * Local extension check. Covers the parts of `check:extension` that matter here:
 * manifest, entry, World shape, tools vs describe, config group, prompt docs and
 * vars, describe.json freshness, and the key-safety invariants.
 */
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { isConfigGroup } from 'cortico/core/config-schema.ts';
import { parseExtensionManifest } from 'cortico/extensions/manifest.ts';
import { registerFrameworkResolver } from 'cortico/extensions/runtime.ts';
import { exportDescribe } from 'cortico/extensions/describe-export.ts';
import type { WorldDefinition } from 'cortico/world.ts';
import { API_BALANCE } from '../src/index.ts';
import { API_BALANCE_DEFAULTS, type ApiBalanceConfigSection } from '../src/config.ts';
import { PROVIDERS, isProviderId } from '../src/providers.ts';

let failures = 0;
const ok = (message: string): void => console.log(`  ok   ${message}`);
const fail = (message: string): void => { failures += 1; console.log(`  FAIL ${message}`); };

function fakeContext(pkgDir: string, dataDir: string) {
  return {
    id: 'api-balance',
    cfg: { ...API_BALANCE_DEFAULTS },
    timezone: 'Asia/Shanghai',
    botName: 'Coo',
    botDir: dataDir,
    packageDir: pkgDir,
    dataDir,
    repoRoot: pkgDir,
    secret: () => '',
    storeSecret: () => undefined,
    persist: () => undefined,
    restart: async () => undefined,
  };
}

async function main(): Promise<void> {
  const pkgDir = resolve(process.cwd(), process.argv[2] ?? '.');
  const pkgFile = join(pkgDir, 'package.json');
  if (!existsSync(pkgFile)) {
    console.error(`${pkgFile} does not exist.`);
    process.exitCode = 1;
    return;
  }
  const pkg = JSON.parse(readFileSync(pkgFile, 'utf8')) as {
    name?: string;
    version?: string;
    main?: string;
    files?: unknown;
    cortico?: Record<string, unknown>;
  };

  console.log(`Directory: ${pkgDir}`);
  console.log(`Package:   ${pkg.name ?? '(none)'}@${pkg.version ?? '(none)'}`);
  console.log('');

  const parsed = parseExtensionManifest(pkg, 'en');
  for (const warning of parsed.warnings) console.log(`  warn ${warning}`);
  if (!parsed.ok) {
    for (const reason of parsed.reasons) fail(reason);
    verdict();
    return;
  }
  const { manifest } = parsed;
  ok(`manifest: kind=${manifest.kind}, api=${manifest.api}`);

  if (!pkg.name) fail('package.json has no name.');
  if (!pkg.version) fail('package.json has no version.');
  if (manifest.describe === undefined) fail('cortico.describe is missing.');
  if (Array.isArray(pkg.files) && !pkg.files.includes('describe.json')) fail('files does not include describe.json.');

  const entry = resolve(pkgDir, pkg.main ?? 'src/index.ts');
  if (!existsSync(entry)) {
    fail(`entry ${entry} does not exist.`);
    verdict();
    return;
  }
  ok(`entry: ${entry}`);

  registerFrameworkResolver();
  let exported: unknown;
  try {
    exported = ((await import(pathToFileURL(entry).href)) as { default?: unknown }).default;
  } catch (error) {
    fail(`importing the entry threw: ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
    verdict();
    return;
  }
  const def = exported as WorldDefinition<ApiBalanceConfigSection>;
  if (!def || def.id !== 'api-balance' || typeof def.create !== 'function' || typeof def.defaults !== 'function') {
    fail('default export is not a WorldDefinition for id api-balance.');
    verdict();
    return;
  }
  if (!def.describe) {
    fail('WorldDefinition has no describe.');
    verdict();
    return;
  }
  ok('WorldDefinition shape');

  if (!isProviderId(API_BALANCE_DEFAULTS.provider)) {
    fail(`default provider is not known: ${API_BALANCE_DEFAULTS.provider}.`);
  } else {
    ok(`default provider: ${API_BALANCE_DEFAULTS.provider}`);
  }
  if (API_BALANCE_DEFAULTS.cacheSeconds < 0 || API_BALANCE_DEFAULTS.cacheSeconds > 300) {
    fail(`default cacheSeconds is out of range: ${API_BALANCE_DEFAULTS.cacheSeconds}.`);
  } else {
    ok(`default cache: ${API_BALANCE_DEFAULTS.cacheSeconds}s`);
  }
  if (API_BALANCE_DEFAULTS.timeoutSeconds < 3 || API_BALANCE_DEFAULTS.timeoutSeconds > 30) {
    fail(`default timeoutSeconds is out of range: ${API_BALANCE_DEFAULTS.timeoutSeconds}.`);
  } else {
    ok(`default timeout: ${API_BALANCE_DEFAULTS.timeoutSeconds}s`);
  }

  for (const provider of PROVIDERS) {
    if (!provider.envName.startsWith('API_BALANCE_')) {
      fail(`provider ${provider.id} key slot must start with API_BALANCE_: ${provider.envName}`);
    }
    if (!provider.url.startsWith('https://')) {
      fail(`provider ${provider.id} URL is not https: ${provider.url}`);
    }
  }
  ok('provider key slots and endpoints');

  const scratch = mkdtempSync(join(tmpdir(), 'cortico-check-api-balance-'));
  try {
    const world = def.create(fakeContext(pkgDir, scratch));
    const tools = world.tools();
    const declared = new Set(def.describe.tools.map((tool) => tool.name));
    const live = new Set(tools.map((tool) => tool.name));
    if (tools.length !== declared.size || [...live].some((name) => !declared.has(name))) {
      fail(`tools() and describe.tools differ: live=${[...live].join(', ')} declared=${[...declared].join(', ')}`);
    } else {
      ok(`tools: ${[...live].join(', ')}`);
    }
    for (const tool of def.describe.tools) {
      if (!tool.tags.length) fail(`tool ${tool.name} has no tags.`);
      if (!tool.summary) fail(`tool ${tool.name} has no summary.`);
      const properties = (tool.parameters as { properties?: Record<string, unknown> } | undefined)?.properties ?? {};
      if ('apiKey' in properties || 'key' in properties) {
        fail(`tool ${tool.name} must not accept an API key; use the panel.`);
      }
    }
    ok('tool descriptions do not accept keys');

    const ui = world.webUi?.('zh');
    if (!ui) {
      fail('webUi() returned nothing.');
    } else {
      for (const group of ui.config ?? []) {
        const candidate: unknown = group;
        if (!isConfigGroup(candidate)) {
          fail(`config group ${(candidate as { id?: unknown }).id ?? '(unknown)'} is not a valid ConfigGroup.`);
          continue;
        }
        for (const path of Object.keys(candidate.schema.properties)) {
          if (!path.startsWith('worlds.api-balance.')) fail(`config key ${path} is outside worlds.api-balance.`);
        }
      }
      ok(`config groups: ${(ui.config ?? []).length}`);

      const panels = ui.panels ?? [];
      if (!panels.some((panel) => panel.id === 'balance')) fail('webUi() does not declare the balance panel.');
      else ok('balance panel declared');

      const vars = await world.envPromptVars();
      if (!vars) {
        fail('envPromptVars() returned null; prompt docs declare vars.');
      } else {
        for (const doc of ui.promptDocs ?? []) {
          if (!existsSync(doc.path)) {
            fail(`prompt doc ${doc.key} path does not exist: ${doc.path}`);
            continue;
          }
          for (const variable of doc.vars ?? []) {
            if (!(variable.name in vars)) fail(`prompt var ${variable.name} is not provided by envPromptVars().`);
          }
        }
        ok('prompt docs and vars');
      }
    }

    const described = await exportDescribe('world', exported, {
      scratchDir: scratch,
      packageDir: pkgDir,
      repoRoot: pkgDir,
      language: 'en',
    });
    if (!described) {
      fail('exportDescribe returned null.');
    } else {
      const target = join(pkgDir, manifest.describe ?? 'describe.json');
      if (!existsSync(target)) {
        fail(`${target} does not exist. Run pnpm describe.`);
      } else {
        const written = JSON.parse(readFileSync(target, 'utf8')) as unknown;
        if (!isDeepStrictEqual(written, JSON.parse(JSON.stringify(described)))) {
          fail('describe.json differs from the code. Run pnpm describe.');
        } else {
          ok('describe.json matches the code');
        }
      }
    }
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }

  verdict();
}

function verdict(): void {
  console.log('');
  if (failures === 0) {
    console.log('Local extension check passed.');
    return;
  }
  console.log(`Failed checks: ${failures}.`);
  process.exitCode = 1;
}

await main();
