/** Exercise the existing private adapters without importing/starting a World or opening a real folder. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, win32 } from 'node:path';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { repositoryRoot } from '../check-repository.mjs';

const files = [
  'coo-diary/src/world.ts',
  'coo-draw/src/api/world.ts',
  'coo-draw/src/local/world.ts',
  'pet-draw/src/world.ts',
  'coo-gen/src/world.ts',
];

for (const file of files) {
  const source = ts.createSourceFile(file, readFileSync(join(repositoryRoot, file), 'utf8'), ts.ScriptTarget.Latest, true);
  const adapter = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'openInFileManager');
  assert.ok(adapter, `${file}: update the regression test if this adapter is moved`);
  const js = ts.transpileModule(adapter.getText(source), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;

  for (const platform of ['linux', 'darwin', 'win32']) {
    test(`${file}: ${platform} requests native opening even when IPC transport would accept a message`, () => {
      const calls = [];
      let ipcCalls = 0;
      const fakeChild = { on() { return this; }, unref() {} };
      const native = (command, args, options) => {
        calls.push({ command, args: Array.from(args), options });
        return fakeChild;
      };
      const open = runInNewContext(`${js}\nopenInFileManager;`, {
        process: { platform, env: {}, send() { ipcCalls++; return true; } },
        spawn: native,
        execFile: native,
        join: platform === 'win32' ? win32.join : join,
      }, { timeout: 1000 });
      const folder = platform === 'win32' ? "C:\\Coo's notes" : '/tmp/Coo notes';
      open(folder);
      assert.equal(ipcCalls, 0, 'transport success is not an acknowledgement from the official host');
      assert.equal(calls.length, 1, 'the native fallback must not be suppressed');
      const call = calls[0];
      if (platform === 'win32') {
        assert.equal(call.command, 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe');
        assert.deepEqual(call.args.slice(0, 3), ['-NoProfile', '-NonInteractive', '-Command']);
        assert.ok(call.args[3].includes("ShellExecute('C:\\Coo''s notes'"), 'PowerShell single quotes stay escaped');
        assert.equal(call.options.windowsHide, true);
      } else {
        assert.equal(call.command, platform === 'darwin' ? 'open' : 'xdg-open');
        assert.deepEqual(call.args, [folder]);
        assert.equal(call.options.stdio, 'ignore');
      }
    });
  }
}
