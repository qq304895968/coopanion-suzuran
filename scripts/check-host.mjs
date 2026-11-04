/** Opt-in SOURCE-level probes; --full adds isolated tests. No Electron/real Core startup, dependency installation, or host patching. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual, parseArgs } from 'node:util';
import { repositoryRoot, workspacePackages } from './check-repository.mjs';

const require = createRequire(import.meta.url);
const usage = 'node --import tsx scripts/check-host.mjs --host-root <Coopanion SOURCE tree with pinned vendor/cortico> [--full] [--report <new.json>]';
const json = file => JSON.parse(readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const sha256 = file => createHash('sha256').update(readFileSync(file)).digest('hex');

export function parseHostArgs(args) {
  const { values } = parseArgs({ args, options: {
    'host-root': { type: 'string' }, full: { type: 'boolean' }, report: { type: 'string' }, help: { type: 'boolean' },
  } });
  if (!values.help && !values['host-root']?.trim()) throw new Error(usage);
  if (values.report && !values.report.endsWith('.json')) throw new Error('--report must name a JSON file');
  return values;
}

export function sdkTypecheckConfig(original, sdkRoot) {
  return { extends: original, compilerOptions: { baseUrl: repositoryRoot, paths: {
    'cortico/*': [join(sdkRoot, 'src/*')], cortico: [join(sdkRoot, 'src/index.ts')],
  } } };
}

export function sdkVitestConfig(packageDir, sdkRoot) {
  // Vite bundles this config; slash paths work with its resolver on either platform.
  const quote = path => JSON.stringify(path.replaceAll('\\', '/'));
  return `import { mergeConfig } from 'vitest/config';
import base from ${quote(join(packageDir, 'vitest.config.ts'))};
export default mergeConfig(base, {
  root: ${quote(packageDir)},
  resolve: {alias: [{find: /^cortico\\//, replacement: ${quote(join(sdkRoot, 'src'))} + '/'}]},
  test: {maxWorkers: 2, minWorkers: 1, env: {COOPANION_SCREEN_INTEGRATION: '0'}},
});\n`;
}

function runSdkChecks(sdkRoot, scratch) {
  const result = { typechecks: [], tests: [] };
  const run = (cli, args, cwd) => {
    try {
      return execFileSync(process.execPath, [require.resolve(cli), ...args], {
        cwd, encoding: 'utf8', timeout: 120_000, maxBuffer: 8 * 1024 * 1024,
        env: { ...process.env, COOPANION_SCREEN_INTEGRATION: '0' },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (error) {
      throw new Error(`${cli} failed in ${cwd}\n${error.stdout ?? ''}\n${error.stderr ?? error.message}`);
    }
  };
  for (const name of workspacePackages()) {
    const packageDir = join(repositoryRoot, name);
    for (const file of ['tsconfig.json', 'tsconfig.web.json']) {
      const original = join(packageDir, file);
      if (!existsSync(original)) continue;
      const override = join(scratch, `${name}-${file}`);
      writeFileSync(override, JSON.stringify(sdkTypecheckConfig(original, sdkRoot)));
      run('typescript/bin/tsc', ['--noEmit', '-p', override], packageDir);
      result.typechecks.push({ package: name, config: file, passed: true });
      console.log(`TYPE OK ${name}/${file} against the supplied SDK`);
    }
    const config = join(scratch, `${name}.config.mjs`);
    const output = join(scratch, `${name}-vitest.json`);
    writeFileSync(config, sdkVitestConfig(packageDir, sdkRoot));
    run('vitest/vitest.mjs', ['run', '--config', config, '--reporter=json', '--outputFile', output], packageDir);
    const tests = json(output);
    assert.equal(tests.success, true, `${name}: Vitest did not succeed`);
    const item = { package: name, passed: tests.numPassedTests, skipped: tests.numPendingTests, files: tests.testResults.length };
    result.tests.push(item);
    console.log(`TEST OK ${name}: ${item.passed} passed, ${item.skipped} skipped`);
  }
  return result;
}

async function probeExtensions(sdkRoot, scratch) {
  // Import the SUPPLIED framework first. Its resolver must win over the workspace's baseline npm SDK.
  await import(pathToFileURL(join(sdkRoot, 'src/extensions/runtime.ts')).href);
  const resolved = import.meta.resolve('cortico/core/types.ts');
  assert.equal(resolved, pathToFileURL(join(sdkRoot, 'src/core/types.ts')).href, 'wrong Cortico SDK resolved');
  const { parseExtensionManifest } = await import('cortico/extensions/manifest.ts');
  const { isWorldDefinition, loadExtensions, resolveExtensionEntry, PACKAGE_NAME } = await import('cortico/extensions.ts');
  const { exportDescribe } = await import('cortico/extensions/describe-export.ts');
  const dependencies = {};
  const packages = [];
  for (const name of workspacePackages()) {
    const packageDir = join(repositoryRoot, name);
    const pkg = json(join(packageDir, 'package.json'));
    assert.ok(PACKAGE_NAME.test(pkg.name), `${name}: invalid npm name`);
    const parsed = parseExtensionManifest(pkg, 'en');
    assert.ok(parsed.ok, `${name}: manifest rejected`);
    const definition = (await import(pathToFileURL(resolveExtensionEntry(packageDir, pkg)).href)).default;
    assert.ok(isWorldDefinition(definition), `${name}: WorldDefinition rejected`);
    const described = await exportDescribe('world', definition, { scratchDir: scratch, packageDir, repoRoot: repositoryRoot, language: 'en' });
    assert.ok(described, `${name}: empty self-description`);
    const matches = isDeepStrictEqual(json(join(packageDir, pkg.cortico.describe)), JSON.parse(JSON.stringify(described)));
    assert.ok(matches, `${name}: checked-in description differs from the supplied SDK exporter`);
    packages.push({ package: name, name: pkg.name, api: parsed.manifest.api, definition: true, metadataMatches: matches,
      tools: described.tools?.length ?? 0, events: described.events?.length ?? 0, os: pkg.os ?? ['all'] });
    dependencies[pkg.name] = `file:${packageDir}`;
    const link = join(process.env.CORTICO_EXTENSIONS_DIR, 'node_modules', ...pkg.name.split('/'));
    mkdirSync(dirname(link), { recursive: true });
    symlinkSync(packageDir, link, 'junction');
  }
  writeFileSync(join(process.env.CORTICO_EXTENSIONS_DIR, 'package.json'), JSON.stringify({ private: true, dependencies }));
  const loaded = await loadExtensions(repositoryRoot);
  assert.equal(loaded.records.length, packages.length);
  for (const item of packages) {
    const record = loaded.records.find(record => record.name === item.name);
    assert.ok(record?.loaded, `${item.package}: loader rejected the definition`);
    assert.notEqual(record.webUi, 'missing', `${item.package}: run pnpm build before host checks`);
    item.loader = true;
    item.webUi = record.webUi;
    console.log(`SDK OK ${item.package}: API ${item.api}, metadata match, WebUI ${item.webUi}`);
  }
  for (const asset of loaded.webUiAssets) {
    const pkg = json(join(repositoryRoot, packages.find(item => item.name === asset.packageName).package, 'package.json'));
    if (pkg.cortico.webUiStyle) assert.ok(asset.cssFile, `${asset.packageName}: missing built CSS`);
  }
  return { resolution: relative(repositoryRoot, join(sdkRoot, 'src/core/types.ts')), packages, webUiAssets: loaded.webUiAssets.length };
}

async function probePetServer(petRoot) {
  const { WebSocket } = await import('ws');
  const { PetServer } = await import(pathToFileURL(join(petRoot, 'src/server.ts')).href);
  const noop = () => {};
  const server = new PetServer({ port: () => 0, webDir: join(petRoot, 'web'), snapshot: () => ({ fixture: true }),
    onPetMessage: noop, onAudio: noop, onPetConnect: noop, onPetDisconnect: noop, onSkin: noop, onPrefs: noop });
  let socket;
  try {
    await server.start(); // A short-lived loopback fixture, NOT a browser preview or desktop host.
    socket = new WebSocket(`${server.origin.replace('http:', 'ws:')}/socket?role=pet`);
    socket.on('error', noop);
    await once(socket, 'open', { signal: AbortSignal.timeout(5000) });
    const request = async (path, data, headers = {}) => {
      const response = await fetch(server.origin + path, {
        ...(data ? { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(data) } : {}),
        signal: AbortSignal.timeout(5000),
      });
      await response.arrayBuffer();
      return response.status;
    };
    const result = { petConnected: server.petConnected, state: await request('/api/state'),
      prefs: await request('/api/prefs', { fixture: true }),
      foreignOrigin: await request('/api/prefs', { fixture: true }, { origin: 'https://untrusted.example' }),
      imageBubble: await request('/api/image-bubble', {
        dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRz8AAAAASUVORK5CYII=', duration: 1,
      }),
    };
    assert.equal(result.petConnected, true);
    assert.equal(result.state, 200);
    assert.equal(result.prefs, 200);
    assert.ok(result.foreignOrigin >= 400, 'host must still reject foreign browser origins');
    return result;
  } finally { socket?.terminate(); await server.stop(); }
}

async function probeIpc(hostRoot, scratch) {
  const { CoreHost } = require(join(hostRoot, 'app/core-host.cjs'));
  const fixture = join(scratch, 'ipc');
  mkdirSync(join(fixture, 'core'), { recursive: true });
  symlinkSync(join(repositoryRoot, 'node_modules'), join(fixture, 'node_modules'), 'junction');
  writeFileSync(join(fixture, 'core/boot.ts'), `
process.on('disconnect', () => process.exit(0));
process.on('message', msg => { if (msg.type === 'companion:shutdown') process.exit(0); });
const accepted = process.send({ type: 'companion:open-folder', path: process.cwd() });
process.send({ type: 'fixture:delivery', accepted });
process.send({ type: 'companion:open', path: '/fixture' });
process.send({ type: 'companion:ready', port: 1, dataDir: process.cwd() });
`);
  const host = new CoreHost({ appRoot: fixture, logDir: join(fixture, 'logs'), env: { PATH: process.env.PATH }, resolveProxy: async () => 'DIRECT' });
  const raw = [], opened = [], folders = [];
  host.on('open', path => opened.push(path));
  host.on('open-folder', path => folders.push(path));
  try {
    const ready = once(host, 'ready', { signal: AbortSignal.timeout(10_000) });
    await host.start();
    host.child.on('message', msg => raw.push(msg));
    await ready;
    const result = { realCoreHost: true, fixtureCoreChild: true,
      openFolderDelivered: raw.some(msg => msg.type === 'companion:open-folder'),
      processSendReturned: raw.find(msg => msg.type === 'fixture:delivery')?.accepted,
      openFolderForwarded: folders.length, supportedOpenForwarded: opened.includes('/fixture'),
    };
    assert.equal(result.openFolderDelivered, true);
    assert.equal(result.supportedOpenForwarded, true);
    return result;
  } finally { await host.stop(1000); }
}

function patchAnchors(petRoot) {
  const script = readFileSync(join(repositoryRoot, 'patch-pet-host.ps1'), 'utf8').replaceAll('\r\n', '\n');
  const literal = name => {
    const body = script.match(new RegExp(`\\$${name} = @'\\n([\\s\\S]*?)\\n'@`))?.[1]
      ?? script.match(new RegExp(`\\$${name} = "([^\\n]*)"`))?.[1];
    assert.ok(body, `cannot read patch literal ${name}`);
    return body;
  };
  const pairs = [
    ['src/server.ts', "path === '/api/image-bubble'", 'serverRouteAnchor'],
    ['src/server.ts', 'const IMAGE_BUBBLE_MAX =', 'bodyOld'],
    ['web/pet-app.js', "case 'image-bubble'", 'caseOld'],
    ['web/pet-app.js', 'function addImageBubble', 'fnOld'],
    ['web/pet-app.js', '// a picture leaves on its own clock', 'stepOld'],
  ];
  return { applied: false, powershellExecuted: false, cssExists: existsSync(join(petRoot, 'web/pet.css')),
    replacements: pairs.map(([file, marker, name]) => {
      const text = readFileSync(join(petRoot, file), 'utf8').replaceAll('\r\n', '\n');
      return { file, anchor: name, status: text.includes(marker) ? 'already-present' : text.includes(literal(name)) ? 'applicable' : 'incompatible' };
    }),
  };
}

async function main(args) {
  const options = parseHostArgs(args);
  if (options.help) { console.log(usage); return; }
  const hostRoot = resolve(options['host-root']);
  const sdkRoot = join(hostRoot, 'vendor/cortico');
  const petRoot = join(hostRoot, 'packages/cortico-world-desktop-pet');
  for (const file of ['app/core-host.cjs', 'vendor/cortico/src/extensions/runtime.ts', 'packages/cortico-world-desktop-pet/src/server.ts']) {
    assert.ok(existsSync(join(hostRoot, file)), `source tree or pinned submodule incomplete: ${file}`);
  }
  // An exclusive report file also prevents accidentally overwriting a manifest or an existing result.
  const reportPath = options.report ? resolve(options.report) : null;
  if (reportPath) {
    assert.ok(!existsSync(reportPath), '--report must be a new file; choose a different output name');
    const insideHost = relative(hostRoot, reportPath);
    assert.ok(isAbsolute(insideHost) || insideHost.startsWith(`..${sep}`), '--report cannot be inside the host source tree');
  }
  const cache = join(repositoryRoot, '.cache');
  mkdirSync(cache, { recursive: true });
  const scratch = mkdtempSync(join(cache, 'host-check-'));
  const keys = ['CORTICO_HOME', 'CORTICO_EXTENSIONS_DIR'];
  const saved = keys.map(key => process.env[key]);
  process.env.CORTICO_HOME = join(scratch, 'home');
  process.env.CORTICO_EXTENSIONS_DIR = join(scratch, 'extensions');
  try {
    const report = { level: 'source-modules-not-release-binary-or-GUI', node: process.version,
      hostVersion: json(join(hostRoot, 'package.json')).version, sdkVersion: json(join(sdkRoot, 'package.json')).version,
      hostFiles: Object.fromEntries(['app/core-host.cjs', 'vendor/cortico/src/extensions.ts', 'packages/cortico-world-desktop-pet/src/server.ts']
        .map(file => [file, sha256(join(hostRoot, file))])),
      warnings: ['Uses workspace dependencies and Node, not the released Electron runtime. No World.start() in module probes; --full runs isolated tests, not live deployment acceptance. No Electron desktop or paid API.'],
    };
    report.extensions = await probeExtensions(sdkRoot, scratch);
    report.petServer = await probePetServer(petRoot);
    report.ipc = await probeIpc(hostRoot, scratch);
    report.patch = patchAnchors(petRoot);
    if (report.petServer.imageBubble !== 200) report.warnings.push(`Optional image-bubble endpoint returned ${report.petServer.imageBubble}; in-pet images need a host change. Standalone popup rendering was NOT tested.`);
    if (!report.ipc.openFolderForwarded) report.warnings.push('Official wrapper did not forward companion:open-folder. Extensions must use native opening, not process.send() as an acknowledgement.');
    if (report.patch.replacements.some(item => item.status === 'incompatible')) report.warnings.push('Some optional patch anchors are incompatible. Do not force-apply the patch.');
    if (options.full) report.sdkChecks = runSdkChecks(sdkRoot, scratch);
    if (reportPath) {
      mkdirSync(dirname(reportPath), { recursive: true });
      writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
      console.log(`Source-level report: ${reportPath}`);
    } else console.log(JSON.stringify(report, null, 2));
    for (const warning of report.warnings) console.warn(`LIMIT: ${warning}`);
  } finally {
    keys.forEach((key, index) => { if (saved[index] === undefined) delete process.env[key]; else process.env[key] = saved[index]; });
    rmSync(scratch, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
}
