import { EventEmitter } from 'node:events';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { LaunchManager, parseArgs } from '../../src/local/launch.ts';
import type { ComfyHealth } from '../../src/local/types.ts';
import { removeDir, tempDir } from './helpers.ts';

const dirs: string[] = [];
afterEach(() => {
  while (dirs.length) removeDir(dirs.pop()!);
});

class FakeChild extends EventEmitter {
  pid = 4242;
  exitCode: number | null = null;
  killed = false;

  kill(): boolean {
    this.killed = true;
    return true;
  }

  unref(): void {}
}

describe('LaunchManager', () => {
  it('拆分启动参数', () => {
    expect(parseArgs('--port 8188 --listen "127.0.0.1"')).toEqual(['--port', '8188', '--listen', '127.0.0.1']);
    expect(parseArgs('')).toEqual([]);
  });

  it('bat 用参数数组启动，不把整条命令拼成字符串', async () => {
    const dir = tempDir();
    dirs.push(dir);
    const script = join(dir, 'start.bat');
    const stop = join(dir, 'stop.bat');
    writeFileSync(script, '@echo off\r\n');
    writeFileSync(stop, '@echo off\r\n');
    const calls: Array<{ command: string; args: string[] }> = [];
    const children: FakeChild[] = [];
    let healthy = false;
    const spawnImpl = ((command: string, args: string[]) => {
      calls.push({ command, args });
      const child = new FakeChild();
      children.push(child);
      healthy = true;
      return child;
    }) as never;
    const health = async (): Promise<ComfyHealth> => ({
      ok: healthy,
      url: 'http://127.0.0.1:8188',
      ...(healthy ? {} : { error: 'offline' }),
      checked_at: Date.now(),
    });
    const manager = new LaunchManager({
      getConfig: () => ({ script, args: '--port 8188', cwd: dir, waitSeconds: 10, stopScript: stop }),
      health,
      spawnImpl,
    });
    const launched = await manager.launch();
    expect(launched.ok).toBe(true);
    expect(calls[0]!.command).toContain('cmd.exe');
    expect(calls[0]!.args.slice(0, 3)).toEqual(['/d', '/s', '/c']);
    expect(calls[0]!.args[3]).toBe(script);
    expect(calls[0]!.args.slice(4)).toEqual(['--port', '8188']);
    expect(children[0]!.killed).toBe(false);
  }, 10_000);

  it('关闭脚本执行后等待离线', async () => {
    const dir = tempDir();
    dirs.push(dir);
    const script = join(dir, 'start.bat');
    const stop = join(dir, 'stop.bat');
    writeFileSync(script, '@echo off\r\n');
    writeFileSync(stop, '@echo off\r\n');
    const calls: Array<{ command: string; args: string[] }> = [];
    const spawnImpl = ((command: string, args: string[]) => {
      calls.push({ command, args });
      const child = new FakeChild();
      if (command.toLowerCase().includes('cmd.exe')) {
        queueMicrotask(() => child.emit('exit', 0, null));
      }
      return child;
    }) as never;
    let healthy = true;
    const health = async (): Promise<ComfyHealth> => ({
      ok: healthy,
      url: 'http://127.0.0.1:8188',
      ...(healthy ? {} : { error: 'offline' }),
      checked_at: Date.now(),
    });
    const manager = new LaunchManager({
      getConfig: () => ({ script, args: '', cwd: dir, waitSeconds: 10, stopScript: stop }),
      health,
      spawnImpl,
    });
    setTimeout(() => { healthy = false; }, 200);
    const result = await manager.stop();
    expect(result.ok).toBe(true);
    expect(calls[0]!.args.slice(0, 3)).toEqual(['/d', '/s', '/c']);
    expect(calls[0]!.args[3]).toBe(stop);
  }, 10_000);
});
