# 给内置桌宠打 /api/image-bubble 补丁（幂等：已打过就跳过）
#
# 作用：让对话表情包 / 绘画把图放进桌宠自己的气泡栈（跟着角色走、和聊天气泡一起排）。
# 位置：Coopanion 内置的 cortico-world-desktop-pet（resources/app 里，应用升级会覆盖）。
# 用法：pwsh -File patch-pet-host.ps1 -HostRoot "<desktop-pet package>" [-Apply]
# 默认只检查并打印计划；-Apply 才备份并修改。先退出 Coopanion。
# 改完必须重启 Coopanion（整进程重启，面板里的「重启 World」不够）。

[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'High')]
param(
  [string]$HostRoot = $env:COOPANION_DESKTOP_PET_ROOT,
  [switch]$Apply
)
$ErrorActionPreference = 'Stop'
if ([string]::IsNullOrWhiteSpace($HostRoot)) { throw 'Specify -HostRoot or COOPANION_DESKTOP_PET_ROOT; no default deployment is modified.' }
$root = (Resolve-Path -LiteralPath $HostRoot).ProviderPath
$server = Join-Path $root 'src\server.ts'
$app = Join-Path $root 'web\pet-app.js'
$css = Join-Path $root 'web\pet.css'

foreach ($f in @($server, $app, $css)) {
  if (-not (Test-Path $f)) { throw "找不到宿主文件: $f（应用路径变了？）" }
}

$enc = New-Object System.Text.UTF8Encoding($false)
$changed = 0
$script:plan = @{}

function Read-Text($path) {
  if ($script:plan.ContainsKey($path)) { return $script:plan[$path] }
  return ([IO.File]::ReadAllText($path, [Text.Encoding]::UTF8)).Replace("`r`n", "`n")
}
function Write-Text($path, $text) { [IO.File]::WriteAllText($path, $text, $enc) }
function Patch-File($path, $marker, $old, $new, $label) {
  $text = Read-Text $path
  if ($text.Contains($marker)) { Write-Host "skip  $label（已打过）"; return }
  if (-not $text.Contains($old)) { throw "锚点变了，$label 打不上：$path`n请对照探针里的补丁手工处理。" }
  $script:plan[$path] = $text.Replace($old, $new)
  $script:changed++
  Write-Host "patch $label"
}

# ---- 1) server.ts: /api/image-bubble 路由 ----
$serverRouteAnchor = "    if (req.method === 'POST' && (path === '/api/skin' || path === '/api/prefs')) {"
Write-Host ('route anchor found: ' + (Read-Text $server).Contains($serverRouteAnchor))

$routeOld = $serverRouteAnchor
$routeNew = @'
    // A World's picture above Coo: the pet page puts it in the same stack as the person's lines, so it
    // follows the figure like a speech bubble. 200 once the page has it, 409 while no page is connected
    // (the caller then falls back to its own window).
    if (req.method === 'POST' && path === '/api/image-bubble') {
      if (!this.petConnected) return json(res, 409, { error: 'pet not connected' });
      const msg = parse(await readBody(req, IMAGE_BUBBLE_MAX) ?? '');
      const dataUrl = typeof msg?.dataUrl === 'string' ? msg.dataUrl : '';
      if (!dataUrl.startsWith('data:image/')) return json(res, 400, { error: 'bad json' });
      const num = (value: unknown, fallback: number): number => (typeof value === 'number' && Number.isFinite(value) ? value : fallback);
      const sent = this.sendPet({
        t: 'image-bubble',
        dataUrl,
        duration: num(msg.duration, 3),
        size: num(msg.size, 0),
        scale: num(msg.scale, 1),
        radius: num(msg.radius, 16),
      });
      return json(res, sent ? 200 : 409, sent ? { ok: true } : { error: 'pet not connected' });
    }
    if (req.method === 'POST' && (path === '/api/skin' || path === '/api/prefs')) {
'@
Patch-File $server "path === '/api/image-bubble'" $routeOld $routeNew 'server.ts 路由'

# ---- 2) server.ts: readBody 上限参数 ----
$bodyOld = @'
const MAX_BODY = 64 * 1024;
function readBody(req: IncomingMessage): Promise<string | null> {
  return new Promise((done) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => {
      size += c.length;
      if (size > MAX_BODY) { req.destroy(); done(null); return; }
      chunks.push(c);
    });
'@
$bodyNew = @'
const MAX_BODY = 64 * 1024;
/** A picture bubble: a 5 MiB image as base64 is about 7 MB, plus the JSON around it. */
const IMAGE_BUBBLE_MAX = 8 * 1024 * 1024;
function readBody(req: IncomingMessage, max = MAX_BODY): Promise<string | null> {
  return new Promise((done) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => {
      size += c.length;
      if (size > max) { req.destroy(); done(null); return; }
      chunks.push(c);
    });
'@
Patch-File $server 'const IMAGE_BUBBLE_MAX =' $bodyOld $bodyNew 'server.ts readBody'

# ---- 3) pet-app.js: 收 image-bubble 消息 ----
$caseOld = "    case 'said': if (prefs.saidBubbles) addLine('chat', typeof m.text === 'string' ? m.text : '', false, { images: Number(m.images) || 0, cursor: m.cursor ?? null }); break;"
$caseNew = $caseOld + "`n    case 'image-bubble': addImageBubble(m); break;"
Patch-File $app "case 'image-bubble'" $caseOld $caseNew 'pet-app.js 消息'

# ---- 4) pet-app.js: 图片气泡 ----
$fnOld = @'
function settleLine(line, text) {
  line.live = false; line.text = text; line.settledAt = T;
  drawLine(line);
}
'@
$fnNew = @'
/**
 * A picture a World puts above Coo (`POST /api/image-bubble`): the emote pictures and the drawings.
 * It joins the same stack as the person's lines, so it follows the figure like a speech bubble, and
 * leaves after `duration` seconds. `size > 0` fixes the long edge; `0` keeps the image at `scale` of
 * a third of the view's short edge.
 */
function addImageBubble(m) {
  const dataUrl = typeof m.dataUrl === 'string' ? m.dataUrl : '';
  if (!dataUrl.startsWith('data:image/')) return;
  const num = (v, d) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
  const duration = Math.min(60, Math.max(.5, num(m.duration, 3)));
  const size = Math.min(2000, Math.max(0, Math.round(num(m.size, 0))));
  const scale = Math.min(3, Math.max(.1, num(m.scale, 1)));
  const radius = Math.min(64, Math.max(0, num(m.radius, 16)));
  const el = document.createElement('div');
  el.className = 'bubble image pop';
  el.setAttribute('role', 'img');
  const img = document.createElement('img');
  img.alt = ''; img.decoding = 'async'; img.draggable = false; img.src = dataUrl;
  el.append(img);
  const line = { el, src: 'image', text: '', live: false, settledAt: T, reply: null, fadeAt: null, ox: null, oy: null, images: 0, cursor: null, image: true, expireAt: T + duration };
  el.addEventListener('click', () => { if (line.fadeAt === null) fadeLine(line); });
  document.body.append(el);
  const fit = () => {
    const nw = img.naturalWidth || 0, nh = img.naturalHeight || 0;
    if (!nw || !nh) return;
    const edge = Math.min(innerWidth, innerHeight) / 3;
    const k = size > 0
      ? Math.min(size / Math.max(nw, nh), (innerWidth * .92) / nw, (innerHeight * .92) / nh)
      : Math.min(1, edge / nw, edge / nh) * scale;
    const w = Math.max(1, Math.round(nw * k)), h = Math.max(1, Math.round(nh * k));
    img.style.width = w + 'px'; img.style.height = h + 'px';
    const r = Math.min(radius, Math.round(Math.max(w, h) * .12), Math.round(Math.min(w, h) * .25));
    img.style.borderRadius = r + 'px';
  };
  if (img.complete && img.naturalWidth) fit(); else img.addEventListener('load', fit, { once: true });
  lines.push(line);
}
function settleLine(line, text) {
  line.live = false; line.text = text; line.settledAt = T;
  drawLine(line);
}
'@
Patch-File $app 'function addImageBubble' $fnOld $fnNew 'pet-app.js 气泡'

# ---- 5) pet-app.js: 图片按自己的时间淡出 ----
$stepOld = @'
  lines.forEach((line, i) => {
    if (line.live) return;
    const r = line.reply;
    if (r ? r.endedAt === undefined : busy) held = i;
    else if (r && T >= r.endedAt + REPLIED_FADE) answered = i;
  });
  lines.forEach((line, i) => {
    if (line.fadeAt !== null || line.live || i <= held) return;
    if (i <= answered || (!line.reply && T >= line.settledAt + UNANSWERED_FADE)) fadeLine(line);
  });
'@
$stepNew = @'
  lines.forEach((line, i) => {
    // a picture neither holds nor answers a line
    if (line.live || line.image) return;
    const r = line.reply;
    if (r ? r.endedAt === undefined : busy) held = i;
    else if (r && T >= r.endedAt + REPLIED_FADE) answered = i;
  });
  lines.forEach((line, i) => {
    if (line.fadeAt !== null || line.live) return;
    // a picture leaves on its own clock, whatever Coo is doing
    if (line.image) {
      if (line.expireAt !== null && T >= line.expireAt) fadeLine(line);
      return;
    }
    if (i <= held) return;
    if (i <= answered || (!line.reply && T >= line.settledAt + UNANSWERED_FADE)) fadeLine(line);
  });
'@
Patch-File $app '// a picture leaves on its own clock' $stepOld $stepNew 'pet-app.js 淡出'

# ---- 6) pet.css: 图片气泡去掉底色 ----
$cssMarker = '.bubble.image{'
$cssOld = '/* A picture a World puts above Coo (emote pictures, drawings): no bubble chrome, just the image,'
$cssNew = @'

/* A picture a World puts above Coo (emote pictures, drawings): no bubble chrome, just the image,
   in the same stack as the person's lines so it follows the figure. */
.bubble.image{width:max-content; min-width:0; max-width:none; padding:0; background:none; border:0; box-shadow:none; cursor:pointer}
.bubble.image::before, .bubble.image::after{display:none}
.bubble.image img{display:block; max-width:none; user-select:none; -webkit-user-drag:none}
.bubble.image.fading{opacity:0; transition:opacity .35s ease; pointer-events:none}
'@
$cssText = Read-Text $css
if ($cssText.Contains($cssMarker)) { Write-Host 'skip  pet.css（已打过）' }
else { $script:plan[$css] = $cssText.TrimEnd() + "`n" + $cssNew; $changed++; Write-Host 'plan pet.css' }

if ($changed -eq 0) { Write-Host 'Already patched; no changes.'; return }
Write-Host "Validated $changed patches in $($script:plan.Count) files."
if (-not $Apply) { Write-Host 'DRY RUN: no files written. Stop Coopanion and add -Apply to make backups and apply.'; return }
if (-not $PSCmdlet.ShouldProcess($root, 'Back up and apply desktop-pet patches')) { return }

$suffix = '.bak-image-bubble-' + [DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss') + '-' + [guid]::NewGuid().ToString('N').Substring(0, 8)
$backups = @{}
# Preflight above was entirely in memory; back up ALL files before the first write.
foreach ($file in $script:plan.Keys) {
  $backup = $file + $suffix
  Copy-Item -LiteralPath $file -Destination $backup -ErrorAction Stop
  $backups[$file] = $backup
}
try {
  foreach ($file in $script:plan.Keys) { Write-Text $file ($script:plan[$file]) }
} catch {
  $failure = $_
  foreach ($file in $backups.Keys) { Copy-Item -LiteralPath $backups[$file] -Destination $file -Force }
  throw $failure
}
Write-Host "Applied $changed patches. Restart the entire Coopanion process. Backup suffix: $suffix"
