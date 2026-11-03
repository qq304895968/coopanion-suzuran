/**
 * 本机版扩展检查。覆盖 check:extension 里对这个包有意义的部分：
 * manifest、入口、World 形状、工具与自描述一致、配置组、提示词路径与变量、describe.json 一致。
 * 不跑 Cortico 仓的完整检查（那需要把仓内所有 World 的依赖装齐）。
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
import type { PetDrawConfigSection } from '../src/config.ts';
import { PET_DRAW_DEFAULTS } from '../src/config.ts';
import { DEFAULT_TIMEOUT_MS, DRAW_HEIGHT, DRAW_SIZE, DRAW_WIDTH, QWEN_IMAGE_MODEL } from '../src/draw.ts';

let failures = 0;
const ok = (message: string): void => console.log(`  ok   ${message}`);
const fail = (message: string): void => { failures += 1; console.log(`  FAIL ${message}`); };

function fakeContext(pkgDir: string, dataDir: string) {
  return {
    id: 'pet-draw',
    cfg: { ...PET_DRAW_DEFAULTS },
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
  const def = exported as WorldDefinition<PetDrawConfigSection>;
  if (!def || def.id !== 'pet-draw' || typeof def.create !== 'function' || typeof def.defaults !== 'function') {
    fail('default export is not a WorldDefinition for id pet-draw.');
    verdict();
    return;
  }
  if (!def.describe) {
    fail('WorldDefinition has no describe.');
    verdict();
    return;
  }
  ok('WorldDefinition shape');

  if (DRAW_SIZE !== '512*512' || DRAW_WIDTH !== 512 || DRAW_HEIGHT !== 512) {
    fail(`image size drifted: ${DRAW_SIZE} (${DRAW_WIDTH}x${DRAW_HEIGHT}).`);
  } else {
    ok('image size is fixed at 512x512');
  }
  if (QWEN_IMAGE_MODEL !== 'qwen-image-3.0') fail(`unexpected image model: ${QWEN_IMAGE_MODEL}`);
  else ok(`image model: ${QWEN_IMAGE_MODEL}`);
  if (DEFAULT_TIMEOUT_MS > 120_000) fail('default timeout is over 120 s.');
  else ok(`timeout: ${DEFAULT_TIMEOUT_MS} ms`);

  const scratch = mkdtempSync(join(tmpdir(), 'cortico-check-pet-draw-'));
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
    }

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
        for (const [path, prop] of Object.entries(candidate.schema.properties)) {
          if (!prop['x-options']) continue;
          const options = def.configOptions?.(prop['x-options'], 'zh') ?? [];
          if (!options.length) fail(`config ${path} uses x-options ${prop['x-options']} but configOptions() returned nothing`);
        }
      }
      ok(`config groups: ${(ui.config ?? []).length}`);
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
