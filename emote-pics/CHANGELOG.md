## 0.3.0-local.1

- 桌面弹图新增长边尺寸 `worlds.emote-pics.popupSize`(px,`0` = 自动);填了就直接按它定长边,
  `popupScale` 只在自动尺寸时生效。
- 「桌面弹图」页加尺寸输入(自动 / 240 / 360 / 520 预设)和实时预览:按实际像素与圆角画出弹窗大小,
  面板窄时等比缩小并标出比例;预览图从已配置的文件夹里取,可「换一张」。
- 面板构建产物改用带日期的文件名(`dist/webui-20261028.js`),避开 WebUI 对扩展资源
  `immutable` 一年的缓存。

## 0.3.0

- 桌面弹图收口:每张图一个本地 http 页面 + 一个 `--pet-host` 窗口,独立「桌面弹图」页、运行状态、
  文件日志与 `emote_popup_test` 测试工具。
- 弹图圆角:`worlds.emote-pics.popup.radius`(px,0–64,默认 16)。圆角同时落在容器和
  `<img>` 上,容器 `overflow:hidden`;半径按长边 12%、短边 25% 封顶,小图不会变圆球。
- 「桌面弹图」页加「圆角(px)」输入,改完立即生效,不用重启。
- 对话页 `pet_say.images` 的缩略图仍由宿主 `.chat-thumb` 固定 `border-radius:10px` 渲染;
  扩展没有样式元数据入口,这一项要改宿主,不在本包改。

## 0.2.4

- 修复「桌面弹图」面板 `unknown panel: popup`:面板声明了 `popup`,但 `invoke` 仍只认
  `folders`;现在两个 id 都接受,启动时把已注册的 panel id 写一行日志。
- 新增不依赖面板的 `emote_popup_test` 工具:从当前表情目录随机弹一张,面板坏了也能测。
- 弹图页图片在 `reveal()` 前保持不可见,算完尺寸/位置后再显示,避免露脸瞬间出现在左上角
  或整屏;`followCursor()` 超时不影响显示,位置留在当前屏的 `0.86/0.66`。

## 0.2.3

- 弹图页面不再等 `followCursor()`:图先按当前工作区摆好并显示,换屏调用最多等 350ms,
  回来或超时都重算位置;窗口 `resize` 也重算,避免“页面卡住 → 窗口一直透明”。
- 默认位置改成 `(0.86, 0.66)`,并按“可用空间”定位:`left=(workW-w)*x`、
  `top=(workH-h)*y`,再 clamp,大图不会被顶出屏幕/贴任务栏。
- 每次弹图写 `data/emote-pics-popup.log`:spawn 参数与 pid、HTTP 请求路径/状态码、子进程
  stdout/stderr(含页面 console、`did-fail-load`、`img-error`)、页面算出的 bounds、退出码、
  关闭原因与存活时间;`ready-to-show`/`isVisible`/`getBounds` 是宿主窗口内部状态,扩展拿不到,
  只能由页面日志和进程退出侧写。
- 关闭改成 `kill` 后 1.2s 还在就 `taskkill /T /F`;server close、临时 profile 500ms 后删除都
  在收尾里做,日志记录关闭原因。
- 面板按钮改名「立即弹一张测试图」,并显示日志路径;GIF 动画在 0.2.8 上仍标未验证。

## 0.2.2

- 弹图改为每张一个 `Coopanion.exe --pet-host` 窗口 + 一段本地 `http://127.0.0.1` 页面,不再用
  `file://` 轮询 `state.js`。这修复了 0.2.1 每次弹图都出系统错误框(空 WebSocket 地址)的问题。
- 页面在主进程里按工作区算位置与尺寸,`popupX`/`popupY` 留空用 `0.86/0.74`,长边不超过工作区
  短边的 1/3,新增 `popupScale` 与 `popupQueue`。
- 弹图状态在面板显示 `ready / disabled / error: <原因>`;spawn 失败、非 0 退出、页面起不来都只记
  `[emote-popup]` 日志,非 0 退出带 stderr 末尾;临时 profile 随窗口退出删除。
- GIF / WebP 用原生 `<img>` 播放。

## 0.2.1

- 弹图宿主确认点击穿透(`setIgnoreMouseEvents(true, {forward:true})`)且用 `showInactive()` 显示,
  不抢焦点;弹图页补 `setInteractive(false)` 兜底。
- 确认第二个 `--pet-host` 进程走单实例锁之前的分支,不抢锁、跳过任务栏、`--parent-pid` 随
  Coopanion 一起退出。
- `state.js` 轮询加失败计数:连续 10 次失败停止轮询、写 warn,并在「桌面弹图」页显示通道状态。
- 连续发图改为排队,每张各显示自己的时长,不再互相顶掉。
- GIF / WebP 动图用原生 `<img>` 播放。

## 0.2.0

- 新增「情绪配图」提示词:每次请求拼进系统前缀,让桌宠自己知道什么时候调 `emote_pic`;面板可开关、
  改正文、恢复默认、保存,注入失败只记日志。
- 新增 `emote_mood({ emotion })`:只记录当前心情(落盘 `data/emote-pics-mood.json`),不发图、
  不产生句柄;心情以 `{{emotePics.mood}}` 出现在环境说明里,默认 30 分钟失效(`moodTtlMinutes`)。
- 面板显示当前心情与剩余有效期。
- `emote_pic` 的 `emotion` 改为可选:省略时用当前心情;没有心情就 `skipped/no_mood`,不发图。
- 取图成功时顺手刷新心情(`moodFromPic`,默认开);`emote_mood({ clear: true })` 清空心情;
  面板顶部显示中文心情并带「清除」。
- 心情可以自动更新:读桌面宠 `desktop-pet.self` 事件里 `meta.beats[].mood`(气泡标记解析结果),
  每秒扫一次、`emote_pic` 开始时再扫一次;来源记 `script`,面板显示来源与写入时间。
- 自动感知可观测:面板第二行显示运行状态、最近扫描时间、有没有读到情绪;连续 N 条无表情或
  T 分钟无事件时各记一次 warn,恢复记 info;阈值 `moodWatchNoMoodCount` / `moodWatchSilentMinutes`
  可配,0 = 关。
- 默认提示词换成「说话前先想一句、带情绪先调 emote_pic、心情从表情标记自动更新」的版本;配置里
  还存着旧默认全文或空白时视为未自定义,注入新默认,自己写过的不覆盖。
- 提示词的保存/恢复反馈挪到按钮行下面,固定预留高度,成功 3 秒消失、失败标红保留。
- 新增桌面弹图:发图成功时在桌面同步弹一张,独立的「桌面弹图」页配开关、坐标与时长,带
  「弹出测试」;复用同一个透明宿主窗口,不按图起进程、不起本地服务,失败只记日志。

## 0.1.1

- 图标与中文简介。

## 0.1.0

- `emote_pic` 按概率决定这次出不出图:`chance`(每个表情)、`defaultChance`、`cooldownSeconds`;
  跳过时回执 `[skipped] {skipped, reason, chance}`,不是错误。工具新增 `force`,绕过概率与冷却。
- 配置是 `emotions: { <表情>: { dir, chance } }`;旧 `folders` 仍按 `defaultChance` 读取。
- 出图时从该表情的文件夹随机挑一张,作为附件交给 Core;WebUI 的对话表情包面板给 19 个表情各选一个
  文件夹、设一个概率,顶部调默认概率与冷却。
