/**
 * 桌面弹图：每张图一个本地 http 页面 + 一个 `Coopanion.exe --pet-host` 透明窗口。
 * 思路与 cortico-world-emote-pics 的桌面弹图一致（MIT）：窗口点击穿透、showInactive 显示、
 * 停留几秒自己关；失败只记日志，不影响画图和回执。
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { appendFileSync, mkdirSync, rmSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { dirname, join } from 'node:path';

const MAX_DATA_URL_CHARS = 8 * 1024 * 1024;
const DEFAULT_RADIUS = 16;

export interface PopupShowOptions {
  duration: number;
  scale: number;
  radius?: number;
}

export interface PopupHealth {
  running: boolean;
  failures: number;
  lastError: string | null;
}

export interface PopupLike {
  showData(dataUrl: string, opts: PopupShowOptions): Promise<boolean>;
  stop?(): void;
  health?(): PopupHealth;
}

export interface PopupHostOptions {
  /** 临时 profile 的父目录。 */
  profileRoot: string;
  /** 追加日志的文件；父目录会建。 */
  logFile?: string;
  warn(message: string, data?: unknown): void;
  spawnImpl?: typeof spawn;
}

interface PopupEntry {
  child: ChildProcess;
  server: Server;
  dir: string;
  startedAt: number;
  timer: NodeJS.Timeout;
  killTimer: NodeJS.Timeout | null;
  done: boolean;
  stderr: string[];
}

/** 一张图一份 HTML；位置、尺寸和动画都在页面里算。 */
export function popupHtml(
  dataUrl: string,
  popup: { duration: number; scale: number; radius?: number },
): string {
  const duration = Math.max(1, Math.min(30, popup.duration));
  const scale = Math.max(0.3, Math.min(2, popup.scale));
  const radius = Math.max(0, Math.min(64, popup.radius ?? DEFAULT_RADIUS));
  return `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;padding:0;width:100%;height:100%;background:transparent;overflow:hidden}
#b{position:absolute;visibility:hidden;overflow:hidden;will-change:transform,opacity;transform-origin:bottom center}
#b img{display:block;width:100%;height:100%;object-fit:contain;user-select:none;-webkit-user-drag:none}
@keyframes pop{from{transform:scale(.72);opacity:0}to{transform:scale(1);opacity:1}}
</style></head><body><div id="b"><img alt="" src="${dataUrl}"></div>
<script>
(() => {
  console.log('[pet-draw-popup] page-load');
  const box=document.getElementById('b'), img=box.querySelector('img');
  try{window.petHost&&window.petHost.setInteractive&&window.petHost.setInteractive(false)}catch(e){}
  const DURATION=${duration}, SCALE=${scale}, RADIUS=${radius};
  const wait=(ms)=>new Promise(r=>setTimeout(r,ms));
  let w=0, h=0, shown=false;
  function layout(){
    if(!w||!h) return;
    const nx=0.86, ny=0.66;
    const maxLeft=Math.max(0,innerWidth-w), maxTop=Math.max(0,innerHeight-h);
    const left=Math.min(Math.max(0,Math.round((innerWidth-w)*nx)),maxLeft);
    const top=Math.min(Math.max(0,Math.round((innerHeight-h)*ny)),maxTop);
    box.style.left=left+'px'; box.style.top=top+'px';
    console.log('[pet-draw-popup] layout '+left+','+top+' '+w+'x'+h+' win '+innerWidth+'x'+innerHeight);
  }
  async function reveal(){
    if(shown) return;
    try{ await img.decode(); }catch(e){}
    const maxEdge=Math.min(innerWidth,innerHeight)/3;
    const nw=img.naturalWidth||maxEdge, nh=img.naturalHeight||maxEdge;
    const fit=Math.min(1,maxEdge/nw,maxEdge/nh);
    w=Math.max(1,Math.round(nw*fit*SCALE)); h=Math.max(1,Math.round(nh*fit*SCALE));
    const r=Math.min(RADIUS,Math.round(Math.max(w,h)*0.12),Math.round(Math.min(w,h)*0.25));
    box.style.width=w+'px'; box.style.height=h+'px';
    box.style.borderRadius=r+'px'; img.style.borderRadius=r+'px';
    layout();
    box.style.visibility='visible';
    box.style.animation='pop .34s cubic-bezier(.34,1.56,.64,1)';
    shown=true;
    setTimeout(()=>{box.style.transition='opacity .35s';box.style.opacity='0'},Math.max(0,(DURATION-0.5)*1000));
    setTimeout(()=>{try{window.petHost&&window.petHost.hide&&window.petHost.hide()}catch(e){}try{window.close()}catch(e){}},DURATION*1000);
    try{ window.petHost&&window.petHost.followCursor&&Promise.race([window.petHost.followCursor(),wait(350)]).then(layout,layout); }catch(e){}
  }
  window.addEventListener('resize',layout);
  if(img.complete&&img.naturalWidth) reveal();
  else {
    img.addEventListener('load',reveal,{once:true});
    img.addEventListener('error',()=>console.error('[pet-draw-popup] img-error '+String(img.src).slice(0,120)),{once:true});
  }
})();
</script></body></html>`;
}

export class PopupHost implements PopupLike {
  private readonly children = new Map<ChildProcess, PopupEntry>();
  private readonly spawnImpl: typeof spawn;
  private failures = 0;
  private lastError: string | null = null;
  private stopped = false;

  constructor(private readonly opts: PopupHostOptions) {
    this.spawnImpl = opts.spawnImpl ?? spawn;
    this.log('log file ready');
  }

  health(): PopupHealth {
    return { running: this.children.size > 0, failures: this.failures, lastError: this.lastError };
  }

  async showData(dataUrl: string, opts: PopupShowOptions): Promise<boolean> {
    if (this.stopped) return false;
    if (!dataUrl.startsWith('data:image/') || dataUrl.length > MAX_DATA_URL_CHARS) {
      this.fail('图片不是 data:image 或太大');
      return false;
    }
    this.log(`show dataUrl=${dataUrl.length} duration=${opts.duration} scale=${opts.scale}`);
    try {
      const dir = join(this.opts.profileRoot, `p${Date.now()}-${randomUUID().slice(0, 8)}`);
      mkdirSync(dir, { recursive: true });
      const html = popupHtml(dataUrl, {
        duration: opts.duration,
        scale: opts.scale,
        radius: opts.radius ?? DEFAULT_RADIUS,
      });
      const server = createServer((req, res) => {
        if ((req.method ?? 'GET') !== 'GET') {
          res.writeHead(405, { allow: 'GET' });
          res.end();
          return;
        }
        this.log(`http GET ${req.url ?? '/'} -> 200`);
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
        res.end(html);
      });
      server.on('upgrade', (_req, socket) => socket.destroy());
      await new Promise<void>((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', () => resolve());
      }).catch((err) => {
        this.fail(`本地页面起不来: ${err instanceof Error ? err.message : String(err)}`);
        throw err;
      });
      server.unref();
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close();
        this.fail('本地页面没有端口');
        return false;
      }

      const env = { ...process.env };
      delete env.ELECTRON_RUN_AS_NODE;
      const url = `http://127.0.0.1:${address.port}/`;
      let child: ChildProcess;
      try {
        child = this.spawnImpl(process.execPath, [
          '--pet-host',
          // 这个窗口只渲染本机 data:image 页面；从 Core 的 Node 侧拉起 Electron 时
          // 没有浏览器沙箱的 broker，不带 --no-sandbox 会在启动阶段直接退出。
          '--no-sandbox',
          `--pet-url=${url}`,
          `--parent-pid=${process.pid}`,
        ], { env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: false });
      } catch (err) {
        try { server.close(); } catch { /* already closed */ }
        rmSync(dir, { recursive: true, force: true });
        this.fail(`窗口进程起不来: ${err instanceof Error ? err.message : String(err)}`);
        return false;
      }
      this.log(`spawn pid=${child.pid ?? '?'} url=${url} profile=${dir}`);

      const entry: PopupEntry = {
        child,
        server,
        dir,
        startedAt: Date.now(),
        timer: setTimeout(() => {
          this.log(`timeout after ${opts.duration}s -> destroy`);
          this.finish(entry, 'timeout');
        }, (Math.max(1, Math.min(30, opts.duration)) + 1.5) * 1000),
        killTimer: null,
        done: false,
        stderr: [],
      };
      entry.timer.unref?.();
      this.children.set(child, entry);
      this.failures = 0;
      this.lastError = null;

      const collect = (chunk: Buffer): void => {
        for (const line of chunk.toString().split(/\r?\n/)) {
          if (!line.trim()) continue;
          entry.stderr.push(line);
          if (entry.stderr.length > 20) entry.stderr.shift();
          this.log(`child: ${line}`);
        }
      };
      child.stderr?.on('data', collect);
      child.stdout?.on('data', collect);
      child.on('error', (err) => {
        this.fail(`窗口进程错误: ${err.message}`);
        this.finish(entry, 'error');
      });
      child.on('exit', (code, signal) => this.finish(entry, `exit ${code ?? signal ?? '?'}`));
      return true;
    } catch (err) {
      this.fail(`弹图失败: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
  }

  stopAll(): void {
    for (const entry of [...this.children.values()]) this.finish(entry, 'stopAll');
  }

  stop(): void {
    this.stopped = true;
    this.stopAll();
  }

  private finish(entry: PopupEntry, reason: string): void {
    if (entry.done) return;
    entry.done = true;
    clearTimeout(entry.timer);
    this.children.delete(entry.child);
    const lived = Date.now() - entry.startedAt;
    this.log(`finish reason=${reason} pid=${entry.child.pid ?? '?'} lived=${lived}ms`);
    try { entry.child.kill(); } catch { /* already gone */ }
    entry.killTimer = setTimeout(() => {
      if (process.platform === 'win32' && entry.child.exitCode === null && entry.child.pid) {
        this.log(`force kill pid=${entry.child.pid}`);
        const killer = spawn('taskkill', ['/PID', String(entry.child.pid), '/T', '/F'], { windowsHide: true });
        killer.on('error', () => { /* logged by finish */ });
      }
    }, 1200);
    entry.killTimer.unref?.();
    try { entry.server.close(); } catch { /* already closed */ }
    setTimeout(() => {
      try {
        rmSync(entry.dir, { recursive: true, force: true });
      } catch (err) {
        this.log(`profile remove failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }, 500).unref?.();
  }

  private fail(reason: string): void {
    this.failures += 1;
    this.lastError = reason;
    this.log(`ERROR ${reason}`);
    this.opts.warn(`[pet-draw-popup] ${reason}`);
  }

  private log(line: string): void {
    if (!this.opts.logFile) return;
    try {
      mkdirSync(dirname(this.opts.logFile), { recursive: true });
      appendFileSync(this.opts.logFile, `${new Date().toISOString()} ${line}\n`, 'utf8');
    } catch {
      // 日志写不进去不影响弹图。
    }
  }
}
