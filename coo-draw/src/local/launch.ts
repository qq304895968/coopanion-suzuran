/** ComfyUI 一键启动：只运行用户明确配置的脚本，等待 /system_stats 就绪。 */
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { dirname, extname } from 'node:path';
import type { ComfyHealth } from './types.ts';

export interface LaunchConfig {
  script: string;
  args: string;
  cwd: string;
  waitSeconds: number;
  /** 关闭脚本；留空时面板/工具不提供关闭。 */
  stopScript: string;
}

export interface LaunchResult {
  ok: boolean;
  message: string;
  already?: boolean;
}

/** 简单的命令行拆分：空格分隔，双引号包住空格，`\"` 转义。 */
export function parseArgs(raw: string): string[] {
  const out: string[] = [];
  let current = '';
  let quote = false;
  let escaped = false;
  for (const ch of raw) {
    if (escaped) {
      current += ch;
      escaped = false;
      continue;
    }
    if (ch === '\\' && quote) {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      quote = !quote;
      continue;
    }
    if (/\s/.test(ch) && !quote) {
      if (current) { out.push(current); current = ''; }
      continue;
    }
    current += ch;
  }
  if (current) out.push(current);
  return out;
}

export interface LaunchManagerOptions {
  getConfig(): LaunchConfig;
  health(force?: boolean): Promise<ComfyHealth>;
  log?(message: string, data?: unknown): void;
  spawnImpl?: typeof spawn;
}

export class LaunchManager {
  private child: ChildProcess | null = null;
  private lastError: string | null = null;
  private lastStart = 0;

  constructor(private readonly opts: LaunchManagerOptions) {}

  configured(): boolean {
    const config = this.opts.getConfig();
    return Boolean(config.script.trim()) && existsSync(config.script.trim());
  }

  stopConfigured(): boolean {
    const config = this.opts.getConfig();
    return Boolean(config.stopScript.trim()) && existsSync(config.stopScript.trim());
  }

  running(): boolean {
    // 启动脚本可能在拉起服务后自己退出，子进程句柄不等于服务还活着；
    // 超过一个启动窗口就不再把它当作“正在启动”，以 /system_stats 为准。
    return this.child !== null && this.child.exitCode === null && Date.now() - this.lastStart < 30_000;
  }

  lastErrorText(): string | undefined {
    return this.lastError ?? undefined;
  }

  async launch(): Promise<LaunchResult> {
    const config = this.opts.getConfig();
    const script = config.script.trim();
    if (!script) return { ok: false, message: '还没有配置 ComfyUI 启动脚本；请在 World 设置里填 .bat / .exe / .py 的完整路径。' };
    if (!existsSync(script)) return { ok: false, message: `启动脚本不存在：${script}` };
    const health = await this.opts.health(true);
    if (health.ok) {
      this.child = null;
      return { ok: true, already: true, message: 'ComfyUI 已经在运行。' };
    }
    if (this.running()) return { ok: true, message: 'ComfyUI 正在启动，稍等片刻。' };
    const now = Date.now();
    if (now - this.lastStart < 5000) return { ok: false, message: '刚点过一次，先等 5 秒再试。' };
    this.lastStart = now;
    this.lastError = null;

    const args = parseArgs(config.args);
    const cwd = config.cwd.trim() || dirname(script);
    const ext = extname(script).toLowerCase();
    const spawnImpl = this.opts.spawnImpl ?? spawn;
    try {
      if (ext === '.bat' || ext === '.cmd') {
        // cmd /s /c 后面不要再手动拼引号：Node 会按参数正确引用含空格的脚本路径；
        // 手动拼成一个字符串会被 cmd 当成带反斜杠的可执行文件名，进程立刻以 1 退出。
        this.child = spawnImpl(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', script, ...args], {
          cwd,
          windowsHide: true,
          detached: true,
          stdio: 'ignore',
        });
      } else if (ext === '.ps1') {
        const ps = `${process.env.SystemRoot ?? 'C:\\Windows'}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`;
        this.child = spawnImpl(ps, ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script, ...args], {
          cwd,
          windowsHide: true,
          detached: true,
          stdio: 'ignore',
        });
      } else if (ext === '.py') {
        this.child = spawnImpl('python', [script, ...args], {
          cwd,
          windowsHide: true,
          detached: true,
          stdio: 'ignore',
        });
      } else {
        this.child = spawnImpl(script, args, {
          cwd,
          windowsHide: true,
          detached: true,
          stdio: 'ignore',
        });
      }
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
      return { ok: false, message: `启动失败：${this.lastError}` };
    }
    const child = this.child;
    child.on('error', (error) => {
      this.lastError = error.message;
      this.opts.log?.('ComfyUI 启动进程错误', { error: error.message });
    });
    child.on('exit', (code) => {
      if (code !== 0 && code !== null) this.lastError = `启动进程退出码 ${code}`;
      this.opts.log?.('ComfyUI 启动进程退出', { code });
    });
    child.unref();
    this.opts.log?.('ComfyUI 启动中', { script, args, cwd, pid: child.pid });

    const deadline = Date.now() + Math.max(10, config.waitSeconds) * 1000;
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const probe = await this.opts.health(true);
      if (probe.ok) {
        this.child = null;
        return { ok: true, message: `ComfyUI 已就绪（${probe.system ?? probe.url}）。` };
      }
      if (this.lastError) return { ok: false, message: `启动进程报错：${this.lastError}` };
    }
    return { ok: false, message: `等了 ${config.waitSeconds} 秒还没连上 ${health.url}；看看 ComfyUI 控制台或启动参数。` };
  }

  /** 运行用户配置的关闭脚本，并等待 /system_stats 变为离线。 */
  async stop(): Promise<LaunchResult> {
    const config = this.opts.getConfig();
    const script = config.stopScript.trim();
    if (!script) return { ok: false, message: '还没有配置 ComfyUI 关闭脚本；请在 World 设置里填 stop 脚本的完整路径。' };
    if (!existsSync(script)) return { ok: false, message: `关闭脚本不存在：${script}` };
    const health = await this.opts.health(true);
    if (!health.ok) {
      this.child = null;
      return { ok: true, already: true, message: 'ComfyUI 本来就没有运行。' };
    }
    const cwd = config.cwd.trim() || dirname(script);
    this.opts.log?.('ComfyUI 关闭中', { script, cwd });
    const result = await this.runOnce(script, cwd);
    if (result.error) return { ok: false, message: `关闭脚本执行失败：${result.error}` };
    for (let i = 0; i < 20; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const probe = await this.opts.health(true);
      if (!probe.ok) {
        this.child = null;
        return { ok: true, message: 'ComfyUI 已关闭。' };
      }
    }
    return { ok: false, message: `关闭脚本退出码 ${result.code ?? '?'}，但 ${health.url} 还在响应；检查脚本或手动结束进程。` };
  }

  private runOnce(script: string, cwd: string): Promise<{ code: number | null; error?: string }> {
    return new Promise((resolve) => {
      const spawnImpl = this.opts.spawnImpl ?? spawn;
      const ext = extname(script).toLowerCase();
      let child: ChildProcess;
      try {
        if (ext === '.bat' || ext === '.cmd') {
          child = spawnImpl(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', script], {
            cwd,
            windowsHide: true,
            stdio: 'ignore',
          });
        } else if (ext === '.ps1') {
          const ps = `${process.env.SystemRoot ?? 'C:\\Windows'}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`;
          child = spawnImpl(ps, ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script], {
            cwd,
            windowsHide: true,
            stdio: 'ignore',
          });
        } else if (ext === '.py') {
          child = spawnImpl('python', [script], { cwd, windowsHide: true, stdio: 'ignore' });
        } else {
          child = spawnImpl(script, [], { cwd, windowsHide: true, stdio: 'ignore' });
        }
      } catch (error) {
        resolve({ code: null, error: error instanceof Error ? error.message : String(error) });
        return;
      }
      let settled = false;
      const finish = (code: number | null, error?: string): void => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve({ code, ...(error ? { error } : {}) });
      };
      const timer = setTimeout(() => {
        try { child.kill(); } catch { /* ignore */ }
        finish(null, '关闭脚本超过 30 秒');
      }, 30_000);
      timer.unref?.();
      child.on('error', (error) => finish(null, error.message));
      child.on('exit', (code) => finish(code));
    });
  }

  /** 仅用于测试：把子进程记录清掉，不杀进程。 */
  detach(): void {
    this.child = null;
  }

  scriptSize(): number {
    try {
      return statSync(this.opts.getConfig().script.trim()).size;
    } catch {
      return 0;
    }
  }
}
