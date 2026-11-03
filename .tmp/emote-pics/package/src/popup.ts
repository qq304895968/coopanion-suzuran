/** 桌面弹图:每张图一个本地 http 页面 + 一个 `Coopanion.exe --pet-host` 窗口进程;失败只记日志。 */
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer, type Server } from 'node:http';
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { extname, dirname, join } from 'node:path';
import { randomInt, randomUUID } from 'node:crypto';
import type { ResolvedPopup } from './config.ts';

const IMAGE_MIMES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export interface PopupHostOptions {
  /** 弹图临时 profile 的父目录。 */
  profileRoot: string;
  /** 追加日志的文件;父目录会建。 */
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

export interface PopupHealth {
  running: boolean;
  failures: number;
  stalled: boolean;
  lastError: string | null;
}

export interface PopupFollow {
  petX: number;
  side: 'auto' | 'left' | 'right';
  gap: number;
  offsetY: number;
  slot: number;
  block?: { x: number; y: number; w: number; h: number };
  stripTop?: number;
  estimatedBlockW?: number;
}

/** 一张图一份 HTML;位置、尺寸和动画都在页面里算。 */
export function popupHtml(
  dataUrl: string,
  popup: { x: number | null; y: number | null; duration: number; scale: number; radius: number },
  follow?: PopupFollow,
): string {
  if (follow) return followHtml(dataUrl, popup, follow);
  const x = popup.x === null ? 'null' : String(popup.x);
  const y = popup.y === null ? 'null' : String(popup.y);
  const duration = Math.max(0.5, popup.duration);
  const scale = Math.max(0.1, Math.min(3, popup.scale));
  const radius = Math.max(0, Math.min(64, popup.radius));
  return `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;padding:0;width:100%;height:100%;background:transparent;overflow:hidden}
#b{position:absolute;visibility:hidden;overflow:hidden;will-change:transform,opacity;transform-origin:bottom center}
#b img{display:block;width:100%;height:100%;object-fit:contain;user-select:none;-webkit-user-drag:none}
@keyframes pop{from{transform:scale(.72);opacity:0}to{transform:scale(1);opacity:1}}
</style></head><body><div id="b"><img alt="" src="${dataUrl}"></div>
<script>
(() => {
  console.log('[emote-popup] page-load');
  const box=document.getElementById('b'), img=box.querySelector('img');
  try{window.petHost&&window.petHost.setInteractive&&window.petHost.setInteractive(false)}catch(e){}
  const X=${x}, Y=${y}, DURATION=${duration}, SCALE=${scale}, RADIUS=${radius};
  const wait=(ms)=>new Promise(r=>setTimeout(r,ms));
  let w=0, h=0, shown=false;
  function layout(){
    if(!w||!h) return;
    const nx=X===null?0.86:X, ny=Y===null?0.66:Y;
    const maxLeft=Math.max(0,innerWidth-w), maxTop=Math.max(0,innerHeight-h);
    const left=Math.min(Math.max(0,Math.round((innerWidth-w)*nx)),maxLeft);
    const top=Math.min(Math.max(0,Math.round((innerHeight-h)*ny)),maxTop);
    box.style.left=left+'px'; box.style.top=top+'px';
    console.log('[emote-popup] layout '+left+','+top+' '+w+'x'+h+' win '+innerWidth+'x'+innerHeight);
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
    setTimeout(()=>{console.log('[emote-popup] hide');try{window.petHost&&window.petHost.hide&&window.petHost.hide()}catch(e){}try{window.close()}catch(e){}},DURATION*1000);
    // 换屏/移动窗口后重新算一次;followCursor 可能不返回,不能挡住显示。
    try{ window.petHost&&window.petHost.followCursor&&Promise.race([window.petHost.followCursor(),wait(350)]).then(layout,layout); }catch(e){}
  }
  window.addEventListener('resize',layout);
  if(img.complete&&img.naturalWidth) reveal();
  else {
    img.addEventListener('load',reveal,{once:true});
    img.addEventListener('error',()=>console.error('[emote-popup] img-error '+String(img.src).slice(0,120)),{once:true});
  }
})();
</script></body></html>`;
}

/** 跟随模式:桌宠上次停下的位置由 `petX` 给出,图放在她脚边;不轮询、不挪窗口。 */
function followHtml(
  dataUrl: string,
  popup: { duration: number; scale: number; radius: number },
  follow: PopupFollow,
): string {
  const duration = Math.max(0.5, popup.duration);
  const scale = Math.max(0.1, Math.min(3, popup.scale));
  const radius = Math.max(0, Math.min(64, popup.radius));
  const petX = Math.max(0, Math.min(1, follow.petX));
  const side = follow.side === 'left' || follow.side === 'right' ? follow.side : 'auto';
  const gap = Math.max(0, Math.min(200, follow.gap));
  const offsetY = Math.max(0, Math.min(200, follow.offsetY));
  const slot = 0;
  const bodyHalf = 48;
  const block = follow.block
    ? {
      x: Math.max(0, follow.block.x),
      y: Math.max(0, follow.block.y),
      w: Math.max(1, follow.block.w),
      h: Math.max(1, follow.block.h),
    }
    : null;
  const stripTop = Math.max(0, follow.stripTop ?? 0);
  return `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;padding:0;width:100%;height:100%;background:transparent;overflow:hidden}
#b{position:absolute;visibility:hidden;overflow:hidden;will-change:transform,opacity;transform-origin:bottom center}
#b img{display:block;width:100%;height:100%;object-fit:contain;user-select:none;-webkit-user-drag:none}
@keyframes pop{from{transform:scale(.72);opacity:0}to{transform:scale(1);opacity:1}}
</style></head><body><div id="b"><img alt="" src="${dataUrl}"></div>
<script>
(() => {
  console.log('[emote-popup] page-load follow');
  const box=document.getElementById('b'), img=box.querySelector('img');
  try{window.petHost&&window.petHost.setInteractive&&window.petHost.setInteractive(false)}catch(e){}
  const PETX=${petX}, SIDE='${side}', GAP=${gap}, OFFSETY=${offsetY}, SLOT=0, HALF=${bodyHalf};
  const BLOCK=${JSON.stringify(block)}, STRIPTOP=${stripTop};
  const DURATION=${duration}, SCALE=${scale}, RADIUS=${radius};
  let w=0, h=0, shown=false;
  function place(){
    const maxEdge=Math.min(innerWidth,innerHeight)/3;
    const nw=img.naturalWidth||maxEdge, nh=img.naturalHeight||maxEdge;
    const fit=Math.min(1,maxEdge/nw,maxEdge/nh);
    w=Math.max(1,Math.round(nw*fit*SCALE)); h=Math.max(1,Math.round(nh*fit*SCALE));
    const r=Math.min(RADIUS,Math.round(Math.max(w,h)*0.12),Math.round(Math.min(w,h)*0.25));
    box.style.width=w+'px'; box.style.height=h+'px';
    box.style.borderRadius=r+'px'; img.style.borderRadius=r+'px';
    let chosen=SIDE;
    if(SIDE==='auto') chosen = PETX<0.38 ? 'right' : PETX>0.62 ? 'left' : (PETX<0.5 ? 'right' : 'left');
    const blockCenter = BLOCK ? BLOCK.x + BLOCK.w / 2 : null;
    const px = Number(PETX);
    let center = Number.isFinite(px) ? px * innerWidth : innerWidth / 2;
    // petX is stable across poses; only use the block center when they disagree badly.
    if (blockCenter !== null && Math.abs(blockCenter - center) > 80) center = blockCenter;
    let left = chosen==='left' ? center-HALF-GAP-w : center+HALF+GAP;
    if(SIDE==='auto'){
      if(left<0) left=center+HALF+GAP;
      else if(left+w>innerWidth) left=center-HALF-GAP-w;
    }
    const rawLeft=Math.round(left);
    const scr=window.screen||{};
    const availBottom = Math.min(innerHeight, (scr.availTop||0) + (scr.availHeight||innerHeight));
    const rawTop=Math.round(availBottom-OFFSETY-h-SLOT*(h+8));
    left=Math.min(Math.max(0,Math.round(left)),Math.max(0,innerWidth-w));
    const top=Math.min(Math.max(0,Math.round(rawTop)),Math.max(0,innerHeight-h));
    box.style.left=left+'px'; box.style.top=top+'px';
    console.log('[emote-popup] follow layout '+left+','+top+' '+w+'x'+h+' win '+innerWidth+'x'+innerHeight
      +' petX='+PETX+' side='+SIDE+' chosen='+chosen+' rawLeft='+rawLeft+' left='+left
      +' rawTop='+rawTop+' top='+top+' block='+JSON.stringify(BLOCK)+' stripTop='+STRIPTOP
      +' center='+center+' blockCenter='+(blockCenter===null?'null':blockCenter)
      +' half='+HALF+' ground='+availBottom+' space=css dpr='+devicePixelRatio
      +' winAt='+screenX+','+screenY+' avail='+scr.availLeft+','+scr.availTop+','+scr.availWidth+'x'+scr.availHeight);
  }
  async function reveal(){
    if(shown) return;
    try{ await img.decode(); }catch(e){}
    if(!img.naturalWidth){ console.error('[emote-popup] img-error follow'); return; }
    place();
    box.style.visibility='visible';
    box.style.animation='pop .34s cubic-bezier(.34,1.56,.64,1)';
    shown=true;
    setTimeout(()=>{box.style.transition='opacity .35s';box.style.opacity='0'},Math.max(0,(DURATION-0.5)*1000));
    setTimeout(()=>{console.log('[emote-popup] hide');try{window.petHost&&window.petHost.hide&&window.petHost.hide()}catch(e){}try{window.close()}catch(e){}},DURATION*1000);
  }
  window.addEventListener('resize',()=>{ if(shown) place(); });
  if(img.complete&&img.naturalWidth) reveal();
  else {
    img.addEventListener('load',reveal,{once:true});
    img.addEventListener('error',()=>console.error('[emote-popup] img-error follow'),{once:true});
  }
})();
</script></body></html>`;
}

/** 读图成 data URL;越界、非图片、读不出都返回 null。 */
export function imageDataUrl(path: string): string | null {
  const mime = IMAGE_MIMES[extname(path).toLowerCase()];
  if (!mime || !existsSync(path)) return null;
  try {
    const st = statSync(path);
    if (!st.isFile() || st.size > MAX_IMAGE_BYTES) return null;
    return `data:${mime};base64,${readFileSync(path).toString('base64')}`;
  } catch {
    return null;
  }
}

export class PopupHost {
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
    return {
      running: this.children.size > 0,
      failures: this.failures,
      stalled: this.failures >= 10,
      lastError: this.lastError,
    };
  }

  /** 面板/启动状态写进同一个日志文件。 */
  note(line: string): void {
    this.log(line);
  }

  /** 弹一张。失败只记日志并返回 false,不抛。 */
  async show(
    imagePath: string,
    popup: ResolvedPopup,
    followPosition?: { petX: number; block?: { x: number; y: number; w: number; h: number }; stripTop?: number; estimatedBlockW?: number },
  ): Promise<boolean> {
    if (this.stopped) return false;
    this.log(`show path=${imagePath} x=${popup.x} y=${popup.y} duration=${popup.duration} scale=${popup.scale} queue=${popup.queue} follow=${popup.followPet}`);
    try {
      const dataUrl = imageDataUrl(imagePath);
      if (!dataUrl) {
        this.fail(`图片读不出来或超过 5MiB: ${imagePath}`);
        return false;
      }
      this.log(`image loaded bytes=${dataUrl.length}`);
      const dir = join(this.opts.profileRoot, `p${Date.now()}-${randomUUID().slice(0, 8)}`);
      mkdirSync(dir, { recursive: true });
      const follow = popup.followPet && followPosition && typeof followPosition.petX === 'number'
        ? {
          petX: followPosition.petX,
          side: popup.followSide,
          gap: popup.followGap,
          offsetY: popup.followOffsetY,
          slot: 0,
          block: followPosition.block,
          stripTop: followPosition.stripTop,
          estimatedBlockW: followPosition.estimatedBlockW,
        }
        : undefined;
      const html = popupHtml(dataUrl, {
        x: popup.x,
        y: popup.y,
        duration: popup.duration,
        scale: popup.scale,
        radius: popup.radius,
      }, follow);
      const server = createServer((req, res) => {
        this.log(`http ${req.method ?? 'GET'} ${req.url ?? '/'} -> 200`);
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
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
          `--pet-url=${url}`,
          `--parent-pid=${process.pid}`,
          `--user-data-dir=${dir}`,
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
          this.log(`timeout after ${popup.duration}s -> destroy`);
          this.finish(entry, 'timeout');
        }, (popup.duration + 1.5) * 1000),
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

  /** queue=false 时用:把已经在弹的都收掉。 */
  stopAll(): void {
    for (const entry of [...this.children.values()]) this.finish(entry, 'stopAll');
  }

  /** 卸载/关闭:杀进程、关 server、删临时 profile。 */
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
    // Windows: kill() may leave the Electron tree; force it if it is still there.
    entry.killTimer = setTimeout(() => {
      if (entry.child.exitCode === null && entry.child.pid) {
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
    this.opts.warn(`[emote-popup] ${reason}`);
  }

  private log(line: string): void {
    if (!this.opts.logFile) return;
    try {
      mkdirSync(dirname(this.opts.logFile), { recursive: true });
      appendFileSync(this.opts.logFile, `${new Date().toISOString()} ${line}\n`, 'utf8');
    } catch {
      // 日志写不进去不能影响弹图。
    }
  }
}

/** 所有已配置表情文件夹(含子文件夹)里的合格图片。 */
export function listImagesRecursive(dirs: readonly string[]): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(path);
        continue;
      }
      if (!entry.isFile() || !IMAGE_MIMES[extname(entry.name).toLowerCase()]) continue;
      try {
        if (statSync(path).size <= MAX_IMAGE_BYTES) out.push(path);
      } catch {
        // 单个文件读不到就跳过。
      }
    }
  };
  for (const dir of dirs) {
    if (!dir || !existsSync(dir)) continue;
    walk(dir);
  }
  return out;
}

/** 从这些文件夹里随机挑一张;没有就返回 null。 */
export function pickRandomImage(dirs: readonly string[]): string | null {
  const images = listImagesRecursive(dirs);
  if (!images.length) return null;
  return images[randomInt(images.length)] ?? null;
}
