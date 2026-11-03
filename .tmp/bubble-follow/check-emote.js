// D:/daily use/Coopanion/data/extensions/node_modules/.pnpm/cortico-world-emote-pics@0.3.0/node_modules/cortico-world-emote-pics/src/definition.ts
import { describeTools } from "cortico/world.ts";

// D:/daily use/Coopanion/data/extensions/node_modules/.pnpm/cortico-world-emote-pics@0.3.0/node_modules/cortico-world-emote-pics/src/config.ts
var EMOTIONS = [
  "neutral",
  "happy",
  "wink",
  "love",
  "shy",
  "surprised",
  "angry",
  "sad",
  "sleepy",
  "thinking",
  "smug",
  "pout",
  "worried",
  "determined",
  "flustered",
  "scared",
  "excited",
  "cry",
  "confused"
];
var EMOTION_LABELS = {
  neutral: { zh: "\u5E73\u9759", en: "neutral" },
  happy: { zh: "\u5F00\u5FC3", en: "happy" },
  wink: { zh: "\u7728\u773C", en: "wink" },
  love: { zh: "\u559C\u6B22", en: "love" },
  shy: { zh: "\u5BB3\u7F9E", en: "shy" },
  surprised: { zh: "\u60CA\u8BB6", en: "surprised" },
  angry: { zh: "\u751F\u6C14", en: "angry" },
  sad: { zh: "\u96BE\u8FC7", en: "sad" },
  sleepy: { zh: "\u56F0\u5026", en: "sleepy" },
  thinking: { zh: "\u601D\u8003", en: "thinking" },
  smug: { zh: "\u5F97\u610F", en: "smug" },
  pout: { zh: "\u561F\u5634", en: "pout" },
  worried: { zh: "\u62C5\u5FC3", en: "worried" },
  determined: { zh: "\u575A\u5B9A", en: "determined" },
  flustered: { zh: "\u614C\u5F20", en: "flustered" },
  scared: { zh: "\u5BB3\u6015", en: "scared" },
  excited: { zh: "\u5174\u594B", en: "excited" },
  cry: { zh: "\u54ED\u6CE3", en: "cry" },
  confused: { zh: "\u56F0\u60D1", en: "confused" }
};
var DEFAULT_CHANCE = 0.3;
var DEFAULT_COOLDOWN_SECONDS = 90;
var DEFAULT_MOOD_TTL_MINUTES = 30;
var PROMPT_MAX_LENGTH = 2e3;
var LEGACY_DEFAULT_TEXT_V1 = "\u4F60\u5728\u8BF4\u8BDD\u65F6\uFF0C\u5982\u679C\u8FD9\u53E5\u672C\u8EAB\u5E26\u7740\u60C5\u7EEA\uFF08\u5F00\u5FC3\u3001\u5BB3\u7F9E\u3001\u5F97\u610F\u3001\u96BE\u8FC7\u3001\u62C5\u5FC3\u3001\u72AF\u56F0\u2026\u2026\uFF09\uFF0C\u53EF\u4EE5\u7ED9\u5B83\u914D\u4E00\u5F20\u56FE\uFF1A\u8C03 emote_pic({ emotion })\uFF0C\u56DE\u6267\u91CC\u4F1A\u7ED9\u4E00\u4E2A\u56FE\u7247\u53E5\u67C4\uFF0C\u586B\u8FDB pet_say.images\uFF0C\u56FE\u5C31\u6302\u5728\u5BF9\u8BDD\u9875\u90A3\u6761\u6D88\u606F\u4E0A\u3002\nemotion \u53EA\u4ECE\u90A3 19 \u4E2A\u91CC\u6311\u3002\u6269\u5C55\u81EA\u5DF1\u4F1A\u63B7\u9AB0\u5B50\uFF0C\u8FD4\u56DE skipped \u662F\u6B63\u5E38\u7684\u300C\u8FD9\u6B21\u4E0D\u53D1\u300D\uFF0C\u4E0D\u662F\u51FA\u9519\uFF0C\u522B\u91CD\u8BD5\u3001\u522B\u9053\u6B49\u3002\u4E0D\u662F\u6BCF\u6761\u90FD\u5E26\uFF0C\u6709\u60C5\u7EEA\u53C8\u5408\u9002\u7684\u65F6\u5019\u5E26\u4E00\u5F20\u5C31\u591F\u4E86\uFF0C\u8FDE\u7740\u51E0\u6761\u90FD\u5E26\u4F1A\u663E\u5F97\u5435\u3002\u5BF9\u65B9\u5728\u96BE\u53D7\u6216\u8BF4\u6B63\u4E8B\u65F6\u522B\u5E26\u56FE\u3002\u6587\u4EF6\u5939\u5728\u54EA\u3001\u6982\u7387\u591A\u5C11\u4E0D\u7528\u4F60\u77E5\u9053\u3002";
var DEFAULT_PROMPT_TEXT = "\u4F60\u5728\u8BF4\u8BDD\u65F6\uFF0C\u5148\u8BF4\u4E4B\u524D\u60F3\u4E00\u53E5\uFF1A\u8FD9\u53E5\u662F\u4E0D\u662F\u5E26\u7740\u60C5\u7EEA\u3002\n\n\u5E26\u60C5\u7EEA\u7684\u8BDD\uFF0C**\u5148\u8C03 `emote_pic()`\uFF08\u4E0D\u4F20 emotion\uFF09**\u2014\u2014\u5B83\u4F1A\u6309\u4F60\u73B0\u5728\u7684\u5FC3\u60C5\u4ECE\u5BF9\u5E94\u6587\u4EF6\u5939\u91CC\u6311\u4E00\u5F20\uFF0C\u56DE\u6267\u91CC\u7ED9\u4E00\u4E2A\u56FE\u7247\u53E5\u67C4\uFF0C\u628A\u8FD9\u4E2A\u53E5\u67C4\u586B\u8FDB\u8FD9\u6B21 `pet_say` \u7684 `images`\u3002\u56FE\u6302\u5728\u5BF9\u8BDD\u9875\u90A3\u6761\u6D88\u606F\u4E0A\uFF0C\u5934\u9876\u6C14\u6CE1\u91CC\u8FD8\u662F\u53EA\u6709\u5B57\u3002\n\n\u5FC3\u60C5\u662F\u8C01\u7BA1\u7684\uFF1A\u4F60\u8BF4\u8BDD\u65F6\u5E26\u7684**\u8868\u60C5\u6807\u8BB0**\uFF08\u3010\u5F00\u5FC3\u3011\u3001<\u7728\u773C> \u8FD9\u79CD\uFF09\u6269\u5C55\u4F1A\u81EA\u5DF1\u8BFB\u5230\uFF0C\u81EA\u52A8\u66F4\u65B0\u5FC3\u60C5\uFF1B\u4E0D\u5E26\u6807\u8BB0\uFF0C\u5FC3\u60C5\u5C31\u4E0D\u4F1A\u52A8\u3002\u6240\u4EE5\u8BF4\u8BDD\u5C3D\u91CF\u5E26\u6807\u8BB0\u3002\u5FC3\u60C5\u4E3A\u7A7A\u65F6\u8C03 `emote_pic` \u4F1A\u8FD4\u56DE `skipped, reason: no_mood`\uFF0C\u90A3\u65F6\u624D\u663E\u5F0F\u5E26 emotion\u3002\n\n\u9891\u7387\u4F60\u4E0D\u7528\u64CD\u5FC3\uFF1A\u6269\u5C55\u81EA\u5DF1\u4F1A\u63B7\u9AB0\u5B50\uFF0C\u6982\u7387\u548C\u51B7\u5374\u5728\u9762\u677F\u91CC\u914D\u3002\u56DE\u6267 `skipped` \u662F\u6B63\u5E38\u7684\u300C\u8FD9\u6B21\u4E0D\u53D1\u300D\uFF0C\u4E0D\u662F\u51FA\u9519\uFF0C\u522B\u91CD\u8BD5\u3001\u522B\u9053\u6B49\u3002\n\n\u4E0D\u662F\u6BCF\u6761\u90FD\u8981\u5E26\uFF1A\u5BF9\u65B9\u5728\u96BE\u53D7\u3001\u5728\u8BF4\u6B63\u4E8B\u3001\u6216\u8005\u521A\u8FDE\u7740\u53D1\u8FC7\u56FE\u7684\u65F6\u5019\uFF0C\u522B\u5E26\u3002";
function defaultPrompt() {
  return { enabled: true, text: DEFAULT_PROMPT_TEXT };
}
function emptyEmotions() {
  const out = {};
  for (const emotion of EMOTIONS) out[emotion] = {};
  return out;
}
var EMOTE_PICS_DEFAULTS = {
  enabled: false,
  emotions: emptyEmotions(),
  defaultChance: DEFAULT_CHANCE,
  cooldownSeconds: DEFAULT_COOLDOWN_SECONDS,
  moodTtlMinutes: DEFAULT_MOOD_TTL_MINUTES,
  moodFromPic: true,
  moodWatchNoMoodCount: 10,
  moodWatchSilentMinutes: 30,
  popupEnabled: true,
  popupX: null,
  popupY: null,
  popupDuration: 3,
  popupScale: 1,
  popupSize: 0,
  popupQueue: true,
  popup: { radius: 16 },
  prompt: defaultPrompt()
};
function isEmotion(value) {
  return EMOTIONS.includes(value);
}
function clampChance(value, fallback) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(1, Math.max(0, value));
}
function resolvePrompt(value) {
  const raw = typeof value === "object" && value !== null ? value : {};
  const enabled = raw.enabled !== false;
  const rawText = typeof raw.text === "string" ? raw.text : "";
  const normalized = rawText.replace(/\r\n/g, "\n").trim();
  const custom = normalized !== "" && normalized !== LEGACY_DEFAULT_TEXT_V1.replace(/\r\n/g, "\n").trim();
  const text = custom ? rawText : DEFAULT_PROMPT_TEXT;
  return { enabled, text: text.slice(0, PROMPT_MAX_LENGTH) };
}
function coordOrNull(value) {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : null;
}
function resolvePopup(cfg) {
  const duration = typeof cfg.popupDuration === "number" && Number.isFinite(cfg.popupDuration) && cfg.popupDuration > 0 ? Math.min(60, Math.max(0.5, cfg.popupDuration)) : 3;
  const scale = typeof cfg.popupScale === "number" && Number.isFinite(cfg.popupScale) && cfg.popupScale > 0 ? Math.min(3, Math.max(0.1, cfg.popupScale)) : 1;
  const radius = typeof cfg.popup?.radius === "number" && Number.isFinite(cfg.popup.radius) ? Math.min(64, Math.max(0, cfg.popup.radius)) : 16;
  const size = typeof cfg.popupSize === "number" && Number.isFinite(cfg.popupSize) && cfg.popupSize > 0 ? Math.min(2e3, Math.max(80, Math.round(cfg.popupSize))) : 0;
  return {
    enabled: cfg.popupEnabled !== false,
    x: coordOrNull(cfg.popupX),
    y: coordOrNull(cfg.popupY),
    duration,
    scale,
    size,
    queue: cfg.popupQueue !== false,
    radius
  };
}
function resolveConfig(cfg) {
  const defaultChance = clampChance(cfg.defaultChance, DEFAULT_CHANCE);
  const cooldownSeconds = typeof cfg.cooldownSeconds === "number" && Number.isFinite(cfg.cooldownSeconds) && cfg.cooldownSeconds >= 0 ? cfg.cooldownSeconds : DEFAULT_COOLDOWN_SECONDS;
  const moodTtlMinutes = typeof cfg.moodTtlMinutes === "number" && Number.isFinite(cfg.moodTtlMinutes) && cfg.moodTtlMinutes >= 0 ? cfg.moodTtlMinutes : DEFAULT_MOOD_TTL_MINUTES;
  const moodWatchNoMoodCount = typeof cfg.moodWatchNoMoodCount === "number" && Number.isFinite(cfg.moodWatchNoMoodCount) && cfg.moodWatchNoMoodCount >= 0 ? Math.floor(cfg.moodWatchNoMoodCount) : 10;
  const moodWatchSilentMinutes = typeof cfg.moodWatchSilentMinutes === "number" && Number.isFinite(cfg.moodWatchSilentMinutes) && cfg.moodWatchSilentMinutes >= 0 ? cfg.moodWatchSilentMinutes : 30;
  const rawEmotions = cfg.emotions ?? {};
  const legacy = cfg.folders ?? {};
  const emotions = {};
  for (const emotion of EMOTIONS) {
    const entry = typeof rawEmotions[emotion] === "object" && rawEmotions[emotion] !== null ? rawEmotions[emotion] : {};
    const legacyDir = typeof legacy[emotion] === "string" ? legacy[emotion] : "";
    const dir = typeof entry.dir === "string" ? entry.dir.trim() : legacyDir.trim();
    const chanceSet = typeof entry.chance === "number" && Number.isFinite(entry.chance);
    emotions[emotion] = {
      dir,
      chance: chanceSet ? clampChance(entry.chance, defaultChance) : defaultChance,
      chanceSet
    };
  }
  return {
    emotions,
    defaultChance,
    cooldownSeconds,
    moodTtlMinutes,
    moodFromPic: cfg.moodFromPic !== false,
    moodWatchNoMoodCount,
    moodWatchSilentMinutes,
    popup: resolvePopup(cfg),
    prompt: resolvePrompt(cfg.prompt)
  };
}

// D:/daily use/Coopanion/data/extensions/node_modules/.pnpm/cortico-world-emote-pics@0.3.0/node_modules/cortico-world-emote-pics/src/world.ts
import { randomInt as randomInt2 } from "node:crypto";
import { existsSync as existsSync2, mkdirSync as mkdirSync2, readFileSync as readFileSync2, readdirSync as readdirSync2, rmSync as rmSync2, statSync as statSync2, writeFileSync } from "node:fs";
import { basename, extname as extname2, isAbsolute, join as join2 } from "node:path";
import { fileURLToPath } from "node:url";

// D:/daily use/Coopanion/data/extensions/node_modules/.pnpm/cortico-world-emote-pics@0.3.0/node_modules/cortico-world-emote-pics/src/popup.ts
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { extname, dirname, join } from "node:path";
import { randomInt, randomUUID } from "node:crypto";
var IMAGE_MIMES = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp"
};
var MAX_IMAGE_BYTES = 5 * 1024 * 1024;
function popupHtml(dataUrl, popup) {
  const x = popup.x === null ? "null" : String(popup.x);
  const y = popup.y === null ? "null" : String(popup.y);
  const duration = Math.max(0.5, popup.duration);
  const scale = Math.max(0.1, Math.min(3, popup.scale));
  const size = popup.size > 0 ? Math.min(2e3, Math.max(80, Math.round(popup.size))) : 0;
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
  const X=${x}, Y=${y}, DURATION=${duration}, SCALE=${scale}, SIZE=${size}, RADIUS=${radius};
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
    if(SIZE>0){
      // \u56FA\u5B9A\u957F\u8FB9;\u56FE\u6BD4\u76EE\u6807\u5C0F\u65F6\u4E5F\u653E\u5927\u5230\u76EE\u6807\u5C3A\u5BF8,\u4F46\u4E0D\u8D85\u8FC7\u5DE5\u4F5C\u533A\u7684 92%\u3002
      const fit=Math.min(SIZE/Math.max(nw,nh),(innerWidth*0.92)/nw,(innerHeight*0.92)/nh);
      w=Math.max(1,Math.round(nw*fit)); h=Math.max(1,Math.round(nh*fit));
    } else {
      const fit=Math.min(1,maxEdge/nw,maxEdge/nh);
      w=Math.max(1,Math.round(nw*fit*SCALE)); h=Math.max(1,Math.round(nh*fit*SCALE));
    }
    const r=Math.min(RADIUS,Math.round(Math.max(w,h)*0.12),Math.round(Math.min(w,h)*0.25));
    box.style.width=w+'px'; box.style.height=h+'px';
    box.style.borderRadius=r+'px'; img.style.borderRadius=r+'px';
    layout();
    box.style.visibility='visible';
    box.style.animation='pop .34s cubic-bezier(.34,1.56,.64,1)';
    shown=true;
    setTimeout(()=>{box.style.transition='opacity .35s';box.style.opacity='0'},Math.max(0,(DURATION-0.5)*1000));
    setTimeout(()=>{console.log('[emote-popup] hide');try{window.petHost&&window.petHost.hide&&window.petHost.hide()}catch(e){}try{window.close()}catch(e){}},DURATION*1000);
    // \u6362\u5C4F/\u79FB\u52A8\u7A97\u53E3\u540E\u91CD\u65B0\u7B97\u4E00\u6B21;followCursor \u53EF\u80FD\u4E0D\u8FD4\u56DE,\u4E0D\u80FD\u6321\u4F4F\u663E\u793A\u3002
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
function imageDataUrl(path) {
  const mime = IMAGE_MIMES[extname(path).toLowerCase()];
  if (!mime || !existsSync(path)) return null;
  try {
    const st = statSync(path);
    if (!st.isFile() || st.size > MAX_IMAGE_BYTES) return null;
    return `data:${mime};base64,${readFileSync(path).toString("base64")}`;
  } catch {
    return null;
  }
}
var PopupHost = class {
  constructor(opts) {
    this.opts = opts;
    this.spawnImpl = opts.spawnImpl ?? spawn;
    this.log("log file ready");
  }
  opts;
  children = /* @__PURE__ */ new Map();
  spawnImpl;
  failures = 0;
  lastError = null;
  stopped = false;
  health() {
    return {
      running: this.children.size > 0,
      failures: this.failures,
      stalled: this.failures >= 10,
      lastError: this.lastError
    };
  }
  /** 面板/启动状态写进同一个日志文件。 */
  note(line) {
    this.log(line);
  }
  /** 弹一张。失败只记日志并返回 false,不抛。 */
  async show(imagePath, popup) {
    if (this.stopped) return false;
    this.log(`show path=${imagePath} x=${popup.x} y=${popup.y} duration=${popup.duration} scale=${popup.scale} size=${popup.size} queue=${popup.queue}`);
    try {
      const dataUrl = imageDataUrl(imagePath);
      if (!dataUrl) {
        this.fail(`\u56FE\u7247\u8BFB\u4E0D\u51FA\u6765\u6216\u8D85\u8FC7 5MiB: ${imagePath}`);
        return false;
      }
      this.log(`image loaded bytes=${dataUrl.length}`);
      const dir = join(this.opts.profileRoot, `p${Date.now()}-${randomUUID().slice(0, 8)}`);
      mkdirSync(dir, { recursive: true });
      const html = popupHtml(dataUrl, {
        x: popup.x,
        y: popup.y,
        duration: popup.duration,
        scale: popup.scale,
        size: popup.size,
        radius: popup.radius
      });
      const server = createServer((req, res) => {
        this.log(`http ${req.method ?? "GET"} ${req.url ?? "/"} -> 200`);
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        res.end(html);
      });
      server.on("upgrade", (_req, socket) => socket.destroy());
      await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", () => resolve());
      }).catch((err) => {
        this.fail(`\u672C\u5730\u9875\u9762\u8D77\u4E0D\u6765: ${err instanceof Error ? err.message : String(err)}`);
        throw err;
      });
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        this.fail("\u672C\u5730\u9875\u9762\u6CA1\u6709\u7AEF\u53E3");
        return false;
      }
      const env = { ...process.env };
      delete env.ELECTRON_RUN_AS_NODE;
      const url = `http://127.0.0.1:${address.port}/`;
      let child;
      try {
        child = this.spawnImpl(process.execPath, [
          "--pet-host",
          `--pet-url=${url}`,
          `--parent-pid=${process.pid}`,
          `--user-data-dir=${dir}`
        ], { env, stdio: ["ignore", "pipe", "pipe"], windowsHide: false });
      } catch (err) {
        try {
          server.close();
        } catch {
        }
        rmSync(dir, { recursive: true, force: true });
        this.fail(`\u7A97\u53E3\u8FDB\u7A0B\u8D77\u4E0D\u6765: ${err instanceof Error ? err.message : String(err)}`);
        return false;
      }
      this.log(`spawn pid=${child.pid ?? "?"} url=${url} profile=${dir}`);
      const entry = {
        child,
        server,
        dir,
        startedAt: Date.now(),
        timer: setTimeout(() => {
          this.log(`timeout after ${popup.duration}s -> destroy`);
          this.finish(entry, "timeout");
        }, (popup.duration + 1.5) * 1e3),
        killTimer: null,
        done: false,
        stderr: []
      };
      entry.timer.unref?.();
      this.children.set(child, entry);
      this.failures = 0;
      this.lastError = null;
      const collect = (chunk) => {
        for (const line of chunk.toString().split(/\r?\n/)) {
          if (!line.trim()) continue;
          entry.stderr.push(line);
          if (entry.stderr.length > 20) entry.stderr.shift();
          this.log(`child: ${line}`);
        }
      };
      child.stderr?.on("data", collect);
      child.stdout?.on("data", collect);
      child.on("error", (err) => {
        this.fail(`\u7A97\u53E3\u8FDB\u7A0B\u9519\u8BEF: ${err.message}`);
        this.finish(entry, "error");
      });
      child.on("exit", (code, signal) => this.finish(entry, `exit ${code ?? signal ?? "?"}`));
      return true;
    } catch (err) {
      this.fail(`\u5F39\u56FE\u5931\u8D25: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
  }
  /** queue=false 时用:把已经在弹的都收掉。 */
  stopAll() {
    for (const entry of [...this.children.values()]) this.finish(entry, "stopAll");
  }
  /** 卸载/关闭:杀进程、关 server、删临时 profile。 */
  stop() {
    this.stopped = true;
    this.stopAll();
  }
  finish(entry, reason) {
    if (entry.done) return;
    entry.done = true;
    clearTimeout(entry.timer);
    this.children.delete(entry.child);
    const lived = Date.now() - entry.startedAt;
    this.log(`finish reason=${reason} pid=${entry.child.pid ?? "?"} lived=${lived}ms`);
    try {
      entry.child.kill();
    } catch {
    }
    entry.killTimer = setTimeout(() => {
      if (entry.child.exitCode === null && entry.child.pid) {
        this.log(`force kill pid=${entry.child.pid}`);
        const killer = spawn("taskkill", ["/PID", String(entry.child.pid), "/T", "/F"], { windowsHide: true });
        killer.on("error", () => {
        });
      }
    }, 1200);
    entry.killTimer.unref?.();
    try {
      entry.server.close();
    } catch {
    }
    setTimeout(() => {
      try {
        rmSync(entry.dir, { recursive: true, force: true });
      } catch (err) {
        this.log(`profile remove failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }, 500).unref?.();
  }
  fail(reason) {
    this.failures += 1;
    this.lastError = reason;
    this.log(`ERROR ${reason}`);
    this.opts.warn(`[emote-popup] ${reason}`);
  }
  log(line) {
    if (!this.opts.logFile) return;
    try {
      mkdirSync(dirname(this.opts.logFile), { recursive: true });
      appendFileSync(this.opts.logFile, `${(/* @__PURE__ */ new Date()).toISOString()} ${line}
`, "utf8");
    } catch {
    }
  }
};
function listImagesRecursive(dirs) {
  const out = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(path);
        continue;
      }
      if (!entry.isFile() || !IMAGE_MIMES[extname(entry.name).toLowerCase()]) continue;
      try {
        if (statSync(path).size <= MAX_IMAGE_BYTES) out.push(path);
      } catch {
      }
    }
  };
  for (const dir of dirs) {
    if (!dir || !existsSync(dir)) continue;
    walk(dir);
  }
  return out;
}
function pickRandomImage(dirs) {
  const images = listImagesRecursive(dirs);
  if (!images.length) return null;
  return images[randomInt(images.length)] ?? null;
}

// D:/daily use/Coopanion/data/extensions/node_modules/.pnpm/cortico-world-emote-pics@0.3.0/node_modules/cortico-world-emote-pics/src/world.ts
var ENV_PROMPT_FILE = fileURLToPath(new URL("./ENV_PROMPT.md", import.meta.url));
var MOOD_FILE = "emote-pics-mood.json";
var MAX_BYTES = 5 * 1024 * 1024;
var RECENT_LIMIT = 3;
var MIME_BY_EXTENSION = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp"
};
var EMOTE_PIC_DECLS = [
  {
    name: "emote_pic",
    description: "Maybe attach one random picture from the folder configured for an emotion. The call first rolls the emotion's chance (and its cooldown); when it does not fire, the receipt says skipped with a reason and carries no image. Omit emotion to use the current mood from emote_mood; without a valid mood the call is skipped. Use force to bypass chance and cooldown while testing. When it fires, the receipt carries the image as a [blob ...] line with a log: handle for image-sending tools. Only png, jpg, jpeg, gif and webp up to 5 MB are used.",
    tags: ["read"],
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        emotion: {
          type: "string",
          enum: [...EMOTIONS],
          description: "Which emotion folder to draw from. Omit to use the current mood."
        },
        avoid: {
          type: "array",
          items: { type: "string" },
          description: "File names not to pick, e.g. the last picture you sent."
        },
        force: {
          type: "boolean",
          description: "Bypass the chance roll and the cooldown; the other rules still apply. For testing."
        }
      }
      // emotion 可选:省略时用当前心情,所以这里不能写 required。
    }
  }
];
var EMOTE_MOOD_DECLS = [
  {
    name: "emote_mood",
    description: "Record the emotion you are in right now, so your next replies know it. Stores only { emotion, setAt }; it sends no image and attaches no blob. The mood expires after the configured minutes. Pass clear: true to clear it instead.",
    tags: ["write"],
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        emotion: {
          type: "string",
          enum: [...EMOTIONS],
          description: "The emotion you are in right now."
        },
        clear: {
          type: "boolean",
          default: false,
          description: "Clear the current mood instead of setting one."
        }
      }
    }
  }
];
var EMOTE_POPUP_TEST_DECLS = [
  {
    name: "emote_popup_test",
    description: "Pop one random picture from the configured emotion folders on the desktop, without sending a chat message. Use when the panel is unavailable or to check the popup.",
    tags: ["read"],
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {}
    }
  }
];
var SAY_EVENT_TYPE = "desktop-pet.self";
var SAY_SCAN_MS = 1e3;
var EMOTION_BY_NAME = /* @__PURE__ */ new Map();
for (const emotion of EMOTIONS) {
  EMOTION_BY_NAME.set(emotion, emotion);
  EMOTION_BY_NAME.set(EMOTION_LABELS[emotion].zh, emotion);
  EMOTION_BY_NAME.set(EMOTION_LABELS[emotion].en, emotion);
}
EMOTION_BY_NAME.set("\u8BA4\u771F", "determined");
EMOTION_BY_NAME.set("\u575A\u5B9A", "determined");
function emotionFromMood(mood) {
  if (!mood || typeof mood !== "object") return null;
  const record = mood;
  for (const key of ["id", "zh", "en"]) {
    const value = record[key];
    if (typeof value !== "string") continue;
    const hit = EMOTION_BY_NAME.get(value.trim());
    if (hit) return hit;
  }
  return null;
}
function scriptMoodFromEvent(event) {
  if (event.type !== SAY_EVENT_TYPE) return null;
  const meta = event.meta;
  if (!meta || meta.kind !== "say" || !Array.isArray(meta.beats)) return null;
  for (const raw of meta.beats) {
    if (!raw || typeof raw !== "object") continue;
    const emotion = emotionFromMood(raw.mood);
    if (emotion) return emotion;
  }
  return null;
}
var EmotePicsWorld = class {
  constructor(opts) {
    this.opts = opts;
    const fallbackWarn = (message, data) => {
      console.warn(`[emote-pics] ${message}`, data ?? "");
    };
    this.warn = opts.warn ?? fallbackWarn;
    this.info = (message, data) => console.info(`[emote-pics] ${message}`, data ?? "");
    this.mood = this.loadMood();
    this.popupHost = opts.popup ?? (opts.dataDir ? new PopupHost({
      profileRoot: join2(opts.dataDir, "emote-pics-popup"),
      logFile: join2(opts.dataDir, "emote-pics-popup.log"),
      warn: (message, data) => this.warn(message, data)
    }) : null);
  }
  opts;
  id = "emote-pics";
  /** 每个表情最近发过的文件名,最多 `RECENT_LIMIT` 个;进程重启后清空。 */
  recent = /* @__PURE__ */ new Map();
  /** 每个表情上次出图的时间(ms);冷却用。 */
  lastSent = /* @__PURE__ */ new Map();
  /** 注入失败往哪写;挂载后换成宿主 logger。 */
  warn;
  info;
  /** 最近一次 emote_mood;有 dataDir 时落盘,重启后还在。 */
  mood = null;
  host = null;
  /** 已经扫到的事件游标;只读这之后的新事件。 */
  lastCursor = 0;
  scanTimer = null;
  /** 自动感知的健康状态:面板展示,也决定告警何时喊、恢复时何时收。 */
  watchStartedAt = 0;
  lastScanAt = null;
  lastScanMood = null;
  noMoodRun = 0;
  warnedNoMood = false;
  warnedSilent = false;
  popupHost;
  /**
   * 把面板里保存的提示词交给模板 `{{emotePics.text}}`。
   * 关闭或文本为空时返回 null,整段(连同标题)不出现;任何异常只记日志,不打断前缀组装。
   */
  envPromptVars() {
    try {
      if (!existsSync2(ENV_PROMPT_FILE)) {
        this.warn("\u73AF\u5883\u63D0\u793A\u8BCD\u6A21\u677F\u4E0D\u5728,\u8DF3\u8FC7\u6CE8\u5165", { path: ENV_PROMPT_FILE });
        return null;
      }
      const raw = this.opts.cfg.prompt;
      const rawText = typeof raw?.text === "string" ? raw.text : null;
      if (rawText !== null && rawText.length > PROMPT_MAX_LENGTH) {
        this.warn("\u63D0\u793A\u8BCD\u8D85\u8FC7\u4E0A\u9650,\u6CE8\u5165\u65F6\u622A\u65AD", { length: rawText.length, max: PROMPT_MAX_LENGTH });
      }
      const prompt = resolveConfig(this.opts.cfg).prompt;
      if (!prompt.enabled || !prompt.text.trim()) return null;
      return { "emotePics.text": prompt.text, "emotePics.mood": this.moodText() };
    } catch (err) {
      this.warn("\u6CE8\u5165\u60C5\u7EEA\u914D\u56FE\u63D0\u793A\u8BCD\u5931\u8D25,\u8FD9\u6B21\u4E0D\u6CE8\u5165", {
        err: err instanceof Error ? err.message : String(err)
      });
      return null;
    }
  }
  tools() {
    return [
      { ...EMOTE_PIC_DECLS[0], handler: async (args) => this.pick(args) },
      { ...EMOTE_MOOD_DECLS[0], handler: async (args) => this.recordMood(args) },
      { ...EMOTE_POPUP_TEST_DECLS[0], handler: async () => this.testPopupTool() }
    ];
  }
  webUi(language = "zh") {
    const zh = language.startsWith("zh");
    return {
      label: zh ? "\u5BF9\u8BDD\u8868\u60C5\u5305" : "Emote pictures",
      panels: [{
        id: "folders",
        title: zh ? "\u8868\u60C5\u6587\u4EF6\u5939" : "Emotion folders",
        description: zh ? "\u7ED9\u6BCF\u4E2A\u8868\u60C5\u9009\u4E00\u4E2A\u56FE\u7247\u6587\u4EF6\u5939\u3001\u8BBE\u4E00\u4E2A\u51FA\u56FE\u6982\u7387;\u6539\u5B8C\u7ACB\u5373\u751F\u6548,\u4E0D\u7528\u91CD\u542F\u3002" : "Pick one picture folder and a send chance per emotion; changes apply at once without a restart."
      }, {
        id: "popup",
        title: zh ? "\u684C\u9762\u5F39\u56FE" : "Desktop popup",
        description: zh ? "\u53D1\u56FE\u65F6\u5728\u684C\u9762\u4E0A\u540C\u6B65\u5F39\u4E00\u5F20;\u4F4D\u7F6E\u3001\u65F6\u957F\u4E0E\u6D4B\u8BD5\u90FD\u5728\u8FD9\u4E00\u9875\u3002" : "Show the same picture on the desktop when a picture is sent; position, duration and a test live here."
      }],
      promptDocs: [{
        key: "worlds.emote-pics.envPrompt",
        title: zh ? "\u60C5\u7EEA\u914D\u56FE" : "Emotion pictures",
        description: zh ? "\u6BCF\u6B21\u8BF7\u6C42\u62FC\u8FDB\u7CFB\u7EDF\u524D\u7F00\u7684\u90A3\u6BB5\u8BF4\u660E;\u6B63\u6587\u5728\u300C\u5BF9\u8BDD\u8868\u60C5\u5305\u300D\u9762\u677F\u91CC\u7F16\u8F91\u3002" : "The note added to the system prefix on every request; edit its text in the Emote pictures panel.",
        path: ENV_PROMPT_FILE,
        role: "envPrompt",
        vars: [{
          name: "emotePics.text",
          description: zh ? "\u9762\u677F\u91CC\u4FDD\u5B58\u7684\u63D0\u793A\u8BCD\u6B63\u6587;\u5173\u95ED\u6216\u4E3A\u7A7A\u65F6\u6574\u6BB5\u4E0D\u51FA\u73B0\u3002" : "The prompt text saved in the panel; off or empty means the section is absent."
        }, {
          name: "emotePics.mood",
          description: zh ? "\u5F53\u524D\u5FC3\u60C5\u6807\u7B7E,\u5982\u300Chappy\uFF0812 \u5206\u949F\u524D\u8BBE\u7684\uFF09\u300D;\u6CA1\u8BBE\u6216\u5DF2\u8FC7\u671F\u662F\u300C\u672A\u8BBE\u7F6E\u300D\u3002" : 'The current mood label such as "happy (set 12 minutes ago)"; "not set" when absent or expired.'
        }]
      }],
      invoke: async (panel, method, args) => {
        if (panel !== "folders" && panel !== "popup") {
          this.warn("WebUI \u8BF7\u6C42\u4E86\u672A\u6CE8\u518C\u7684\u9762\u677F", { panel });
          this.popupHost?.note(`WebUI unknown panel: ${panel}`);
          throw new Error(`unknown panel: ${panel}`);
        }
        if (method === "state") return { ok: true, state: resolveConfig(this.opts.cfg) };
        if (method === "mood") return this.moodInfo();
        if (method === "clearMood") {
          this.clearMoodState();
          return this.moodInfo();
        }
        if (method === "setDir") return this.setDir(args);
        if (method === "setChance") return this.setChance(args);
        if (method === "setDefaults") return this.setDefaults(args);
        if (method === "setPromptEnabled") return this.setPromptEnabled(args);
        if (method === "setPromptText") return this.setPromptText(args);
        if (method === "setPopup") return this.setPopup(args);
        if (method === "sampleImage") return this.sampleImage(args);
        if (method === "testPopup") return this.testPopup();
        if (method === "popupHealth") return this.popupHealthInfo();
        throw new Error(`unknown method: ${method}`);
      }
    };
  }
  async start(host) {
    this.warn = (message, data) => host.log.warn(message, data);
    this.info = (message, data) => host.log.info(message, data);
    this.host = host;
    const panelIds = this.webUi("zh").panels?.map((panel) => panel.id).join(", ") ?? "(none)";
    this.info(`WebUI panels: ${panelIds}`);
    this.popupHost?.note(`start: WebUI panels ${panelIds}`);
    try {
      this.lastCursor = host.store.latestCursor();
    } catch {
      this.lastCursor = 0;
    }
    this.watchStartedAt = this.now();
    this.lastScanAt = null;
    this.lastScanMood = null;
    this.noMoodRun = 0;
    this.warnedNoMood = false;
    this.warnedSilent = false;
    this.scanTimer = setInterval(() => this.scanSaid(), SAY_SCAN_MS);
    this.scanTimer.unref?.();
  }
  async stop() {
    if (this.scanTimer) {
      clearInterval(this.scanTimer);
      this.scanTimer = null;
    }
    this.popupHost?.stop();
    this.host = null;
    this.warn = (message, data) => console.warn(`[emote-pics] ${message}`, data ?? "");
    this.info = (message, data) => console.info(`[emote-pics] ${message}`, data ?? "");
  }
  /**
   * 只看桌面宠新存的 `desktop-pet.self` 事件。它说一句话时会把气泡里解析出的表情写进
   * `meta.beats[].mood`(动作词已被它过滤),这里取第一段能认出的情绪更新心情。
   */
  scanSaid() {
    const host = this.host;
    if (!host) return;
    const config = resolveConfig(this.opts.cfg);
    try {
      const latest = host.store.latestCursor();
      if (latest > this.lastCursor) {
        const events = host.store.range({ fromCursor: this.lastCursor + 1, toCursor: latest });
        this.lastCursor = latest;
        for (const event of events) {
          if (event.type !== SAY_EVENT_TYPE) continue;
          this.noteScan(scriptMoodFromEvent(event), config);
        }
      }
      this.checkSilence(config);
    } catch (err) {
      this.warn("\u8BFB\u53D6\u6C14\u6CE1\u4E8B\u4EF6\u5931\u8D25,\u8FD9\u6B21\u4E0D\u66F4\u65B0\u5FC3\u60C5", {
        err: err instanceof Error ? err.message : String(err)
      });
    }
  }
  /** 记一次气泡扫描;没 mood 的连续计数与告警、恢复都在这里。 */
  noteScan(emotion, config) {
    const at = this.now();
    if (this.warnedSilent) {
      this.warnedSilent = false;
      this.info("\u81EA\u52A8\u611F\u77E5:\u53C8\u626B\u5230\u6C14\u6CE1\u4E8B\u4EF6\u4E86,\u81EA\u52A8\u611F\u77E5\u6062\u590D");
    }
    this.lastScanAt = at;
    this.lastScanMood = emotion;
    if (emotion) {
      this.setMood(emotion, "script", at);
      this.noMoodRun = 0;
      if (this.warnedNoMood) {
        this.warnedNoMood = false;
        this.info(`\u81EA\u52A8\u611F\u77E5:\u53C8\u8BFB\u5230\u8868\u60C5\u6807\u8BB0\u4E86(\u6700\u8FD1:${emotion}),\u5FC3\u60C5\u6062\u590D\u81EA\u52A8\u66F4\u65B0`);
      }
      return;
    }
    this.noMoodRun += 1;
    if (config.moodWatchNoMoodCount > 0 && !this.warnedNoMood && this.noMoodRun >= config.moodWatchNoMoodCount) {
      this.warnedNoMood = true;
      this.warn(`\u81EA\u52A8\u611F\u77E5:\u6700\u8FD1 ${config.moodWatchNoMoodCount} \u6761\u6C14\u6CE1\u90FD\u6CA1\u8BFB\u5230\u8868\u60C5\u6807\u8BB0,\u5FC3\u60C5\u4E0D\u4F1A\u81EA\u52A8\u66F4\u65B0`);
    }
  }
  /** 隔多久没扫到气泡事件就喊一次;0 = 关。 */
  checkSilence(config) {
    if (config.moodWatchSilentMinutes <= 0 || this.warnedSilent) return;
    const since = this.lastScanAt ?? this.watchStartedAt;
    if (since <= 0) return;
    if (this.now() - since >= config.moodWatchSilentMinutes * 6e4) {
      this.warnedSilent = true;
      this.warn(`\u81EA\u52A8\u611F\u77E5:\u5DF2 ${config.moodWatchSilentMinutes} \u5206\u949F\u6CA1\u626B\u5230\u6C14\u6CE1\u4E8B\u4EF6,\u53EF\u80FD\u684C\u9762\u5BA0\u4E8B\u4EF6\u5DF2\u6539\u540D/\u6539\u5B57\u6BB5`);
    }
  }
  setMood(emotion, from, at) {
    this.mood = { emotion, setAt: at ?? this.now(), from };
    this.saveMood();
  }
  setDir(args) {
    const emotion = String(args[0] ?? "");
    if (!isEmotion(emotion)) return { ok: false, error: `\u672A\u77E5\u8868\u60C5: ${emotion}` };
    const path = String(args[1] ?? "").trim();
    if (path) {
      if (!isAbsolute(path)) return { ok: false, error: `\u8BF7\u586B\u7EDD\u5BF9\u8DEF\u5F84: ${path}` };
      let stat;
      try {
        stat = statSync2(path);
      } catch {
        return { ok: false, error: `\u6587\u4EF6\u5939\u4E0D\u5B58\u5728: ${path}` };
      }
      if (!stat.isDirectory()) return { ok: false, error: `\u4E0D\u662F\u6587\u4EF6\u5939: ${path}` };
    }
    this.opts.persist({ emotions: { [emotion]: { dir: path } } });
    return { ok: true, state: resolveConfig(this.opts.cfg) };
  }
  setChance(args) {
    const emotion = String(args[0] ?? "");
    if (!isEmotion(emotion)) return { ok: false, error: `\u672A\u77E5\u8868\u60C5: ${emotion}` };
    const value = Number(args[1]);
    if (!Number.isFinite(value)) return { ok: false, error: `\u6982\u7387\u5FC5\u987B\u662F 0~1 \u7684\u6570\u5B57: ${String(args[1] ?? "")}` };
    const chance = clampChance(value, 0);
    this.opts.persist({ emotions: { [emotion]: { chance } } });
    return { ok: true, state: resolveConfig(this.opts.cfg) };
  }
  setDefaults(args) {
    const patch = args[0] ?? {};
    const next = {};
    if (patch.defaultChance !== void 0) {
      const value = Number(patch.defaultChance);
      if (!Number.isFinite(value)) return { ok: false, error: `\u9ED8\u8BA4\u6982\u7387\u5FC5\u987B\u662F 0~1 \u7684\u6570\u5B57: ${String(patch.defaultChance)}` };
      next.defaultChance = clampChance(value, 0);
    }
    if (patch.cooldownSeconds !== void 0) {
      const value = Number(patch.cooldownSeconds);
      if (!Number.isFinite(value) || value < 0) {
        return { ok: false, error: `\u51B7\u5374\u79D2\u6570\u5FC5\u987B\u662F\u4E0D\u5C0F\u4E8E 0 \u7684\u6570\u5B57: ${String(patch.cooldownSeconds)}` };
      }
      next.cooldownSeconds = value;
    }
    this.opts.persist(next);
    return { ok: true, state: resolveConfig(this.opts.cfg) };
  }
  setPromptEnabled(args) {
    const enabled = args[0] === true;
    this.opts.persist({ prompt: { enabled } });
    return { ok: true, state: resolveConfig(this.opts.cfg) };
  }
  setPromptText(args) {
    const text = String(args[0] ?? "");
    if (text.length > PROMPT_MAX_LENGTH) {
      return {
        ok: false,
        error: `\u63D0\u793A\u8BCD\u6700\u591A ${PROMPT_MAX_LENGTH} \u5B57(\u73B0\u5728 ${text.length} \u5B57),\u5220\u77ED\u4E00\u4E9B\u518D\u4FDD\u5B58\u3002`
      };
    }
    this.opts.persist({ prompt: { text } });
    return { ok: true, state: resolveConfig(this.opts.cfg) };
  }
  /** 桌面弹图设置;坐标空串/null 表示用默认位置。 */
  setPopup(args) {
    const patch = args[0] ?? {};
    const next = {};
    if (patch.enabled !== void 0) next.popupEnabled = patch.enabled === true;
    for (const key of ["x", "y"]) {
      if (patch[key] === void 0) continue;
      const raw = patch[key];
      if (raw === null || raw === "") {
        if (key === "x") next.popupX = null;
        else next.popupY = null;
        continue;
      }
      const value = Number(raw);
      if (!Number.isFinite(value) || value < 0 || value > 1) {
        return { ok: false, error: `${key === "x" ? "\u6A2A" : "\u7EB5"}\u5750\u6807\u8981\u5728 0~1 \u4E4B\u95F4: ${String(raw)}` };
      }
      if (key === "x") next.popupX = value;
      else next.popupY = value;
    }
    if (patch.duration !== void 0) {
      const value = Number(patch.duration);
      if (!Number.isFinite(value) || value < 0.5 || value > 60) {
        return { ok: false, error: `\u505C\u7559\u65F6\u957F\u8981\u5728 0.5~60 \u79D2\u4E4B\u95F4: ${String(patch.duration)}` };
      }
      next.popupDuration = value;
    }
    if (patch.scale !== void 0) {
      const value = Number(patch.scale);
      if (!Number.isFinite(value) || value < 0.1 || value > 3) {
        return { ok: false, error: `\u7F29\u653E\u8981\u5728 0.1~3 \u4E4B\u95F4: ${String(patch.scale)}` };
      }
      next.popupScale = value;
    }
    if (patch.size !== void 0) {
      const value = Number(patch.size);
      if (!Number.isFinite(value) || value < 0 || value > 2e3) {
        return { ok: false, error: `\u5C3A\u5BF8\u8981\u5728 0~2000 px \u4E4B\u95F4(0 = \u81EA\u52A8): ${String(patch.size)}` };
      }
      next.popupSize = value === 0 ? 0 : Math.max(80, Math.round(value));
    }
    if (patch.queue !== void 0) next.popupQueue = patch.queue === true;
    let radius;
    if (patch.radius !== void 0) {
      const value = Number(patch.radius);
      if (!Number.isFinite(value) || value < 0 || value > 64) {
        return { ok: false, error: `\u5706\u89D2\u534A\u5F84\u8981\u5728 0~64 px \u4E4B\u95F4: ${String(patch.radius)}` };
      }
      radius = value;
    }
    const persisted = { ...next };
    if (radius !== void 0) persisted.popup = { radius };
    this.opts.persist(persisted);
    if (next.popupEnabled === false) this.popupHost?.stop();
    return { ok: true, state: resolveConfig(this.opts.cfg) };
  }
  /** 面板预览用:从已配置的表情目录里取一张图,返回 data URL;传当前文件名可换一张。 */
  sampleImage(args) {
    const config = resolveConfig(this.opts.cfg);
    const dirs = EMOTIONS.map((emotion) => config.emotions[emotion].dir).filter((dir) => dir.length > 0);
    const images = listImagesRecursive(dirs);
    if (!images.length) return { ok: false, error: "\u8FD8\u6CA1\u6709\u53EF\u7528\u56FE\u7247:\u5148\u5728\u300C\u5BF9\u8BDD\u8868\u60C5\u5305\u300D\u91CC\u7ED9\u60C5\u7EEA\u7ED1\u5B9A\u6587\u4EF6\u5939" };
    const avoid = typeof args[0] === "string" ? basename(args[0]) : "";
    const pool = avoid ? images.filter((path2) => basename(path2) !== avoid) : images;
    const list = pool.length ? pool : images;
    const path = avoid ? list[randomInt2(list.length)] : list[0];
    const dataUrl = imageDataUrl(path);
    if (!dataUrl) return { ok: false, error: `\u8FD9\u5F20\u56FE\u8BFB\u4E0D\u51FA\u6765\u6216\u8D85\u8FC7 5 MiB: ${basename(path)}` };
    return { ok: true, dataUrl, name: basename(path) };
  }
  /** 桌宠气泡接口:部署 config.json 的 worlds.desktop-pet.port,缺省 7797。 */
  petBubbleUrl() {
    let port = 7797;
    try {
      const file = this.opts.dataDir ? join2(this.opts.dataDir, "..", "config.json") : "";
      if (file) {
        const raw = JSON.parse(readFileSync2(file, "utf8"));
        const value = Number(raw.worlds?.["desktop-pet"]?.port);
        if (Number.isFinite(value) && value > 0) port = value;
      }
    } catch {
    }
    return `http://127.0.0.1:${port}/api/image-bubble`;
  }
  /**
   * 把图塞进桌宠头顶的气泡;桌宠页面每帧按角色位置摆气泡,所以图会跟着角色走。
   * 桌宠没开或宿主没有这个接口时返回 false,调用方回退到独立窗口。
   */
  async showInPetBubble(path, popup) {
    const dataUrl = imageDataUrl(path);
    if (!dataUrl) return false;
    try {
      const res = await fetch(this.petBubbleUrl(), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          dataUrl,
          duration: popup.duration,
          size: popup.size,
          scale: popup.scale,
          radius: popup.radius
        }),
        signal: AbortSignal.timeout(2500)
      });
      return res.ok;
    } catch {
      return false;
    }
  }
  /** 从当前表情目录(含子文件夹)随机挑一张,按当前设置弹一次。 */
  async testPopup() {
    const config = resolveConfig(this.opts.cfg);
    const dirs = EMOTIONS.map((emotion) => config.emotions[emotion].dir).filter((dir) => dir.length > 0);
    if (!dirs.length) return { ok: false, error: "\u8FD8\u6CA1\u6709\u914D\u7F6E\u4EFB\u4F55\u8868\u60C5\u6587\u4EF6\u5939" };
    const path = pickRandomImage(dirs);
    if (!path) return { ok: false, error: "\u8868\u60C5\u6587\u4EF6\u5939\u91CC\u6CA1\u6709\u53EF\u7528\u56FE\u7247(\u542B\u5B50\u6587\u4EF6\u5939)" };
    const popup = { ...config.popup, enabled: true };
    try {
      if (await this.showInPetBubble(path, popup)) return { ok: true, path };
      if (!this.popupHost) return { ok: false, error: "\u5F39\u56FE\u5BBF\u4E3B\u4E0D\u53EF\u7528(\u7F3A\u5C11\u90E8\u7F72\u6570\u636E\u76EE\u5F55)" };
      if (!await this.popupHost.show(path, popup)) {
        return { ok: false, error: "\u5F39\u56FE\u7A97\u53E3\u6CA1\u80FD\u6253\u5F00(\u770B\u8FD0\u884C\u65E5\u5FD7\u91CC\u7684 warn)" };
      }
    } catch (err) {
      return { ok: false, error: `\u5F39\u56FE\u5931\u8D25: ${err instanceof Error ? err.message : String(err)}` };
    }
    return { ok: true, path };
  }
  async testPopupTool() {
    const res = await this.testPopup();
    if (res.ok) return { text: `\u5DF2\u5728\u684C\u9762\u5F39\u51FA\u6D4B\u8BD5\u56FE: ${res.path}` };
    return { text: `\u5F39\u56FE\u6D4B\u8BD5\u5931\u8D25: ${res.error}`, failed: true };
  }
  maybePopup(path, popup) {
    try {
      if (!popup.queue) this.popupHost?.stopAll();
      void this.showInPetBubble(path, popup).then((shown) => {
        if (shown) return;
        return this.popupHost?.show(path, popup);
      }).catch((err) => {
        this.warn("\u5F39\u56FE\u5931\u8D25,\u4E0D\u5F71\u54CD\u53D1\u56FE", {
          path,
          err: err instanceof Error ? err.message : String(err)
        });
      });
    } catch (err) {
      this.warn("\u5F39\u56FE\u5931\u8D25,\u4E0D\u5F71\u54CD\u53D1\u56FE", {
        path,
        err: err instanceof Error ? err.message : String(err)
      });
    }
  }
  popupHealthInfo() {
    const config = resolveConfig(this.opts.cfg);
    const health = this.popupHost?.health() ?? {
      running: false,
      failures: 0,
      stalled: false,
      lastError: null
    };
    const status = !config.popup.enabled ? "disabled" : health.lastError ? `error: ${health.lastError}` : "ready";
    return {
      ok: true,
      status,
      ...health,
      logPath: this.opts.dataDir ? join2(this.opts.dataDir, "emote-pics-popup.log") : null
    };
  }
  /** `emote_mood`:只记 { emotion, setAt };不读图、不发图、不产生 blob。 */
  recordMood(args) {
    const hasEmotion = args.emotion !== void 0;
    const clear = args.clear === true;
    if (clear && hasEmotion) {
      return fail("clear \u548C emotion \u4E0D\u80FD\u540C\u65F6\u7ED9;\u8981\u6E05\u7A7A\u5C31\u53EA\u4F20 clear: true,\u8981\u8BB0\u5FC3\u60C5\u5C31\u53EA\u4F20 emotion\u3002");
    }
    if (clear) {
      this.clearMoodState();
      return { text: "\u5FC3\u60C5\u5DF2\u6E05\u7A7A" };
    }
    if (!hasEmotion) {
      return fail("emotion \u5FC5\u586B;\u8981\u6E05\u7A7A\u5F53\u524D\u5FC3\u60C5\u5C31\u4F20 clear: true\u3002");
    }
    const emotion = String(args.emotion).trim();
    if (!isEmotion(emotion)) {
      return fail(`emotion \u53EA\u63A5\u53D7 ${EMOTIONS.join("\u3001")} \u4E4B\u4E00;\u6536\u5230 "${emotion}"\u3002`);
    }
    this.mood = { emotion, setAt: this.now(), from: "manual" };
    this.saveMood();
    const ttl = resolveConfig(this.opts.cfg).moodTtlMinutes;
    return { text: `\u8BB0\u4E0B\u4E86:${emotion}(${ttl} \u5206\u949F\u5185\u6709\u6548)` };
  }
  clearMoodState() {
    this.mood = null;
    this.clearMoodFile();
  }
  /** 面板用的心情快照;过期视同没设。 */
  moodInfo() {
    const config = resolveConfig(this.opts.cfg);
    const mood = this.currentMood(config.moodTtlMinutes);
    return {
      ok: true,
      mood: mood ? {
        emotion: mood.emotion,
        setAt: mood.setAt,
        remainingSeconds: Math.max(0, Math.round(
          (config.moodTtlMinutes * 6e4 - (this.now() - mood.setAt)) / 1e3
        )),
        from: mood.from
      } : null,
      ttlMinutes: config.moodTtlMinutes,
      watch: {
        running: this.scanTimer !== null,
        lastScanAt: this.lastScanAt,
        lastScanMood: this.lastScanMood,
        noMoodRun: this.noMoodRun,
        warnedNoMood: this.warnedNoMood,
        warnedSilent: this.warnedSilent,
        noMoodCount: config.moodWatchNoMoodCount,
        silentMinutes: config.moodWatchSilentMinutes
      }
    };
  }
  /** 过了 `moodTtlMinutes` 就当成没设,不再拿旧值参与判断。 */
  currentMood(ttlMinutes) {
    if (!this.mood) return null;
    if (this.now() - this.mood.setAt >= ttlMinutes * 6e4) return null;
    return this.mood;
  }
  /** 注入用的纯文字,例如 `happy（12 分钟前设的）`。 */
  moodText() {
    const mood = this.currentMood(resolveConfig(this.opts.cfg).moodTtlMinutes);
    if (!mood) return "\u672A\u8BBE\u7F6E";
    const minutes = Math.floor((this.now() - mood.setAt) / 6e4);
    return minutes <= 0 ? `${mood.emotion}\uFF08\u521A\u521A\u8BBE\u7684\uFF0C\u8FD8\u672A\u8FC7\u671F\uFF09` : `${mood.emotion}\uFF08\u7EA6 ${minutes} \u5206\u949F\u524D\u8BBE\u7684\uFF0C\u8FD8\u672A\u8FC7\u671F\uFF09`;
  }
  moodFile() {
    return this.opts.dataDir ? join2(this.opts.dataDir, MOOD_FILE) : null;
  }
  loadMood() {
    const file = this.moodFile();
    if (!file || !existsSync2(file)) return null;
    try {
      const raw = JSON.parse(readFileSync2(file, "utf8"));
      if (typeof raw.emotion === "string" && isEmotion(raw.emotion) && typeof raw.setAt === "number" && Number.isFinite(raw.setAt)) {
        const from = raw.from === "script" || raw.from === "pic" ? raw.from : "manual";
        return { emotion: raw.emotion, setAt: raw.setAt, from };
      }
      this.warn("\u5FC3\u60C5\u6587\u4EF6\u5185\u5BB9\u4E0D\u8BA4\u8BC6,\u5FFD\u7565", { file });
    } catch (err) {
      this.warn("\u5FC3\u60C5\u6587\u4EF6\u8BFB\u53D6\u5931\u8D25,\u5FFD\u7565", { file, err: err instanceof Error ? err.message : String(err) });
    }
    return null;
  }
  saveMood() {
    const file = this.moodFile();
    const dir = this.opts.dataDir;
    if (!file || !dir || !this.mood) return;
    try {
      mkdirSync2(dir, { recursive: true });
      writeFileSync(file, JSON.stringify(this.mood), "utf8");
    } catch (err) {
      this.warn("\u5FC3\u60C5\u5199\u76D8\u5931\u8D25,\u53EA\u7559\u5728\u5185\u5B58", { file, err: err instanceof Error ? err.message : String(err) });
    }
  }
  clearMoodFile() {
    const file = this.moodFile();
    if (!file) return;
    try {
      rmSync2(file, { force: true });
    } catch (err) {
      this.warn("\u5FC3\u60C5\u5B58\u6863\u5220\u9664\u5931\u8D25", { file, err: err instanceof Error ? err.message : String(err) });
    }
  }
  pick(args) {
    this.scanSaid();
    const config = resolveConfig(this.opts.cfg);
    const requested = String(args.emotion ?? "").trim();
    let emotion;
    let fromMood = false;
    if (requested) {
      if (!isEmotion(requested)) {
        return fail(`emotion \u53EA\u63A5\u53D7 ${EMOTIONS.join("\u3001")} \u4E4B\u4E00;\u6536\u5230 "${requested}"\u3002`);
      }
      emotion = requested;
    } else {
      const mood = this.currentMood(config.moodTtlMinutes);
      if (!mood) return this.skipNoMood();
      emotion = mood.emotion;
      fromMood = true;
    }
    const setting = config.emotions[emotion];
    if (!setting.dir) {
      return fail(`${emotion} \u8FD8\u6CA1\u6709\u914D\u7F6E\u6587\u4EF6\u5939\u3002\u5230 WebUI \u7684\u300C\u5BF9\u8BDD\u8868\u60C5\u5305\u300D\u9762\u677F\u91CC\u7ED9\u5B83\u9009\u4E00\u4E2A\u3002`);
    }
    if (!isAbsolute(setting.dir)) return fail(`${emotion} \u914D\u7F6E\u7684\u6587\u4EF6\u5939\u4E0D\u662F\u7EDD\u5BF9\u8DEF\u5F84: ${setting.dir}`);
    let stat;
    try {
      stat = statSync2(setting.dir);
    } catch {
      return fail(`${emotion} \u7684\u6587\u4EF6\u5939\u4E0D\u5B58\u5728: ${setting.dir}`);
    }
    if (!stat.isDirectory()) return fail(`${emotion} \u7684\u6587\u4EF6\u5939\u4E0D\u662F\u76EE\u5F55: ${setting.dir}`);
    const avoid = new Set(
      (Array.isArray(args.avoid) ? args.avoid : []).filter((value) => typeof value === "string").map((value) => basename(value))
    );
    const images = this.imagesIn(setting.dir, avoid);
    if (!images.length) {
      return fail(`${emotion} \u7684\u6587\u4EF6\u5939\u91CC\u6CA1\u6709\u53EF\u7528\u56FE\u7247(\u53EA\u6536 png/jpg/jpeg/gif/webp,\u6BCF\u5F20\u4E0D\u8D85\u8FC7 5 MB)` + (avoid.size ? `;avoid \u8FD8\u6392\u9664\u4E86 ${avoid.size} \u4E2A\u6587\u4EF6\u540D\u3002` : "\u3002"));
    }
    if (args.force !== true) {
      const chance = setting.chance;
      if (chance <= 0) return this.skip(emotion, "chance", chance, `\u6982\u7387 0%`, fromMood);
      const roll = this.random();
      if (roll >= chance) {
        return this.skip(emotion, "chance", chance, `\u6982\u7387 ${Math.round(chance * 100)}%,\u63B7\u9AB0 ${roll.toFixed(3)}`, fromMood);
      }
      const left = this.cooldownLeftMs(emotion, config.cooldownSeconds);
      if (left > 0) {
        return this.skip(
          emotion,
          "cooldown",
          chance,
          `\u521A\u53D1\u8FC7\u4E00\u5F20,\u51B7\u5374\u8FD8\u5269 ${Math.ceil(left / 1e3)} \u79D2(\u95F4\u9694 ${config.cooldownSeconds} \u79D2)`,
          fromMood
        );
      }
    }
    const recent = this.recent.get(emotion) ?? [];
    let pool = images.filter((image) => !recent.includes(image.name));
    if (!pool.length) pool = images.filter((image) => image.name !== recent[recent.length - 1]);
    if (!pool.length) pool = images;
    const chosen = pool[randomInt2(pool.length)];
    let bytes;
    try {
      bytes = readFileSync2(chosen.path);
    } catch (err) {
      return fail(`\u8BFB\u53D6 ${chosen.path} \u5931\u8D25: ${err instanceof Error ? err.message : String(err)}`);
    }
    this.remember(emotion, chosen.name);
    const now = this.now();
    this.lastSent.set(emotion, now);
    if (config.moodFromPic) {
      this.setMood(emotion, "pic", now);
    }
    if (config.popup.enabled) this.maybePopup(chosen.path, config.popup);
    const source = fromMood ? `\u6309\u5F53\u524D\u5FC3\u60C5 ${emotion} \u53D6\u7684\u56FE\u3002
` : "";
    return {
      text: `${source}\u5DF2\u9009 ${emotion}:${chosen.name}(${bytes.byteLength} \u5B57\u8282,${chosen.mime},\u6982\u7387 ${Math.round(setting.chance * 100)}%)
path=${chosen.path}
\u53E5\u67C4\u5728\u4E0B\u4E00\u884C [blob \u2026] \u91CC,\u628A\u5B83\u586B\u8FDB pet_say \u7684 images\u3002`,
      blobs: [{ bytes, mime: chosen.mime, name: chosen.name, fallbackText: `\u539F\u8DEF\u5F84 ${chosen.path}` }]
    };
  }
  /** 没指定 emotion,当前心情也没有或过期:正常跳过,不猜、不退化成随机情绪。 */
  skipNoMood() {
    return {
      text: `[skipped] ${JSON.stringify({ skipped: true, reason: "no_mood" })}
\u6CA1\u6709\u5F53\u524D\u5FC3\u60C5,\u4E5F\u6CA1\u6307\u5B9A emotion;\u8FD9\u6B21\u4E0D\u53D1\u56FE\u3002\u4E0D\u662F\u9519\u8BEF,\u662F\u6545\u610F\u8DF3\u8FC7\u3002`
    };
  }
  /** 跳过不是错误:回执里带 `{skipped, reason, chance}`,不带附件。 */
  skip(emotion, reason, chance, detail, fromMood = false) {
    const payload = JSON.stringify({ skipped: true, reason, chance });
    const source = fromMood ? `(\u6309\u5F53\u524D\u5FC3\u60C5 ${emotion} \u53D6)` : "";
    return {
      text: `[skipped] ${payload}
${emotion}${source} \u8FD9\u6B21\u4E0D\u51FA\u56FE:${detail}\u3002\u4E0D\u662F\u9519\u8BEF,\u662F\u6545\u610F\u8DF3\u8FC7\u3002`
    };
  }
  cooldownLeftMs(emotion, cooldownSeconds) {
    if (cooldownSeconds <= 0) return 0;
    const last = this.lastSent.get(emotion);
    if (last === void 0) return 0;
    return Math.max(0, cooldownSeconds * 1e3 - (this.now() - last));
  }
  /** 文件夹里合格、且不在 avoid 名单里的图片。 */
  imagesIn(folder, avoid) {
    let names;
    try {
      names = readdirSync2(folder);
    } catch {
      return [];
    }
    const out = [];
    for (const name of names) {
      if (name.startsWith(".") || avoid.has(name)) continue;
      const mime = MIME_BY_EXTENSION[extname2(name).toLowerCase()];
      if (!mime) continue;
      const path = join2(folder, name);
      try {
        const stat = statSync2(path);
        if (!stat.isFile() || stat.size > MAX_BYTES) continue;
      } catch {
        continue;
      }
      out.push({ name, path, mime });
    }
    return out;
  }
  remember(emotion, name) {
    const list = this.recent.get(emotion) ?? [];
    list.push(name);
    if (list.length > RECENT_LIMIT) list.splice(0, list.length - RECENT_LIMIT);
    this.recent.set(emotion, list);
  }
  random() {
    return (this.opts.random ?? Math.random)();
  }
  now() {
    return (this.opts.now ?? Date.now)();
  }
};
function fail(text) {
  return { text, failed: true };
}

// D:/daily use/Coopanion/data/extensions/node_modules/.pnpm/cortico-world-emote-pics@0.3.0/node_modules/cortico-world-emote-pics/src/definition.ts
var EMOTE_PICS = {
  id: "emote-pics",
  label: "Emote Pics",
  defaults: () => ({ ...EMOTE_PICS_DEFAULTS, emotions: emptyEmotions(), prompt: defaultPrompt() }),
  // `ctx.cfg` 是 `worlds.emote-pics` 的活引用;面板保存经 ctx.persist 写回。
  // `ctx.dataDir` 是部署共享的数据目录;心情存档的文件名带 World id。
  create: (ctx) => new EmotePicsWorld({
    cfg: ctx.cfg,
    persist: (patch) => ctx.persist(patch),
    dataDir: ctx.dataDir
  }),
  // 自描述:全部工具;这个 World 不推事件。
  describe: {
    tools: describeTools([...EMOTE_PIC_DECLS, ...EMOTE_MOOD_DECLS, ...EMOTE_POPUP_TEST_DECLS], {
      emote_pic: {
        zh: "\u6309\u914D\u7F6E\u7684\u6982\u7387\u51B3\u5B9A\u8FD9\u6B21\u51FA\u4E0D\u51FA\u56FE;\u51FA\u56FE\u65F6\u4ECE\u8BE5\u8868\u60C5\u7684\u6587\u4EF6\u5939\u968F\u673A\u6311\u4E00\u5F20,\u4F5C\u4E3A\u9644\u4EF6\u4EA4\u7ED9\u8FD9\u6B21\u5BF9\u8BDD\u3002",
        en: "Rolls the configured chance; when it fires, picks a random picture from that emotion folder and attaches it."
      },
      emote_mood: {
        zh: "\u8BB0\u4E0B\u5F53\u524D\u5FC3\u60C5,\u4F9B\u4E4B\u540E\u7684\u73AF\u5883\u8BF4\u660E\u53C2\u8003;\u4E0D\u53D1\u56FE,\u4E5F\u4E0D\u4EA7\u751F\u53E5\u67C4\u3002",
        en: "Records the current mood for later environment notes; sends no image and produces no handle."
      },
      emote_popup_test: {
        zh: "\u4E0D\u7ECF\u8FC7\u9762\u677F,\u76F4\u63A5\u4ECE\u8868\u60C5\u76EE\u5F55\u968F\u673A\u5F39\u4E00\u5F20\u6D4B\u8BD5\u56FE\u3002",
        en: "Pops a random test picture from the emotion folders without the panel."
      }
    }),
    events: []
  }
};

// D:/daily use/Coopanion/data/extensions/node_modules/.pnpm/cortico-world-emote-pics@0.3.0/node_modules/cortico-world-emote-pics/src/index.ts
var src_default = EMOTE_PICS;
export {
  EMOTE_PICS,
  src_default as default
};
