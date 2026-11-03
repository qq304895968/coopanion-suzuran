# cortico-world-emote-pics

Owner: `src/definition.ts`

World id 是 `emote-pics`,配置段 `worlds.emote-pics`,页面路由 `world:emote-pics`。

`emote_pic({ emotion?, avoid?, force? })` 按配置的概率决定这次出不出图;出图时从该表情的文件夹里
随机挑一张,把字节作为这次对话的附件交给 Core。`emotion` 可以省略,省略时用当前心情;两者都没有
就正常跳过。回执正文给 `emotion` / `name` / `bytes` / `path`,句柄是 Core 追加的
`[blob log:… image/png 文件名]` 行;把它填进 `pet_say.images`,图就挂在对话页那条消息上(头顶气泡
只有文字)。没出图时回执以 `[skipped]` 开头,带 `{skipped, reason, chance}`,不带附件,也不算失败。

装好后它还会往系统前缀里写一段「情绪配图」说明,让桌宠自己知道有这个工具、什么时候用。这段可以
在面板里改或关掉,见下面「提示词注入」。

另有一个 `emote_mood({ emotion })`:只记下「当前心情」,不发图、不产生附件句柄。记下的心情会以
`{{emotePics.mood}}` 出现在同一段环境说明里(例如 `happy（12 分钟前设的）`),默认 30 分钟后
失效。它只是给模型的参考,配不配图仍由模型自己决定。

## 配置

```jsonc
{
  "worlds.emote-pics": {
    "emotions": {
      "happy": { "dir": "G:\\表情包\\开心", "chance": 0.35 },
      "thinking": { "dir": "G:\\表情包\\思考" }
    },
    "defaultChance": 0.3,
    "cooldownSeconds": 90,
    "moodTtlMinutes": 30,
    "popupEnabled": true,
    "popupX": null,
    "popupY": null,
    "popupDuration": 3,
    "popupScale": 0.25,
    "popupQueue": true,
    "popupFollowPet": true,
    "popupFollowSide": "auto",
    "popupFollowGap": 20,
    "popupFollowOffsetY": 20,
    "popup": { "radius": 20 },
    "prompt": { "enabled": true, "text": "……面板里保存的说明……" }
  }
}
```

19 个键固定:`neutral`、`happy`、`wink`、`love`、`shy`、`surprised`、`angry`、`sad`、`sleepy`、
`thinking`、`smug`、`pout`、`worried`、`determined`、`flustered`、`scared`、`excited`、`cry`、
`confused`。别的键不读。

- `chance` 是 0~1;某个表情没写就用 `defaultChance`。
- `cooldownSeconds` 是同一表情两次出图的最小间隔,0 = 关。
- 旧版 `folders: { "happy": "G:\\…" }` 仍然能读:当成 `dir`,概率用 `defaultChance`。面板保存会
  写进 `emotions`,旧键留在原地,不丢配置。
- `prompt` 是注入系统前缀的那段说明:`enabled` 缺省为 `true`,`text` 缺省是内置默认文本,上限
  2000 字;没有这一项时(旧配置)按默认值注入。
- `moodTtlMinutes` 是 `emote_mood` 记下的心情的有效期,缺省 30 分钟;0 表示记下就过期。
- `moodFromPic` 缺省 `true`:某次 `emote_pic` 真的取到图时,顺手把用到的 emotion 写成当前心情;
  关掉后心情只由 `emote_mood` 写。
- `moodWatchNoMoodCount` 缺省 `10`:连续这么多条气泡都没读到表情就告警;0 = 关。
- `moodWatchSilentMinutes` 缺省 `30`:这么多分钟没扫到气泡事件就告警;0 = 关。
- `popupEnabled` 缺省 `true`;`popupX` / `popupY` 是 0~1 的归一化坐标,两个都有值才用,否则用默认位置
  `0.86 / 0.66`;`popupDuration` 缺省 3 秒;`popupScale` 缺省 0.25;`popupQueue` 缺省 `true`;
  `popup.radius` 是弹图圆角(px,0~64,缺省 20);`popupFollowPet` 缺省 `true`,
  `popupFollowSide` 缺省 `auto`(或 `left` / `right`),`popupFollowGap` 缺省 20px,
  `popupFollowOffsetY` 缺省 20px。开启跟随后 `popupX` / `popupY` 不生效。

不要手改 JSON:装好后在 WebUI 左栏 World →「对话表情包」。19 行表格,每行「表情 / 概率(%) /
文件夹 / 选择文件夹 / 清空」;顶部是「默认概率」与「冷却秒数」,心情显示在面板最上面(中文名 +
英文键),旁边有「清除」按钮。下面还有一块「情绪配图提示词」:
注入开关、多行正文、「恢复默认」、「保存」。面板用宿主提供的目录选择器;宿主没有选择器时自动
改成手填输入框,保存时校验「存在且是目录」。改完立即写回,下一句就生效,不用重启。

## 提示词注入

- 每次请求拼进系统前缀一段环境说明:标题「情绪配图」,正文就是面板里保存的 `text`,原样注入,
  不改写。上面那行「## emote-pics」是框架给每个 World 加的外层标题。
- 只注入 `text` 和当前心情;路径、概率、冷却都不进提示词。
- 心情行形如「当前心情:happy（约 18 分钟前设的，还未过期）」;没设或已过期是「未设置」。
- 默认正文更新过:配置里如果还是旧默认全文(或空白),视为没自定义,注入新默认;自己写过的正文
  原样用,不会被覆盖。面板「恢复默认」恢复的是新默认。
- 提示词块的「保存 / 恢复默认」反馈在按钮行下面单独一行,成功约 3 秒消失,失败标红并保留;
  这一行预留了固定高度,出现/消失不会推动上面按钮和文本框。
- 心情那段明确写:它只是参考,要配图仍然要模型自己调 `emote_pic`;心情和 `emotion` 参数不一致时
  以心情标签为准;不是每条都必须配图。
- `enabled=false` 或正文为空时整段不出现,工具照旧可用。
- 注入失败(配置读不出、模板文件不在、超长)只写日志,对话照常;手改超过 2000 字的正文会被截到
  2000 字再注入,并记一条日志。面板保存超过 2000 字会直接拒绝并提示,不会写盘。

## 工具

1. `emotion` 可选,传了只接受 19 个键;不传就用当前心情。传了非法值返回错误并列出可用键;
   不传且心情未设置/已过期时返回 `[skipped] {"reason":"no_mood"}` 与「没有当前心情,也没指定
   emotion」,不发图、不猜、不退化成随机情绪。
2. 配置/目录问题(没配、不是绝对路径、不存在、没有可用图片)总是报出来,不会因为掷骰没中就被
   掩盖——先确认「有图可发」,再掷骰。
3. `chance <= 0` 直接跳过;`chance >= 1` 必出;否则 `Math.random() < chance` 才出。
4. 冷却期内(同一表情上次出图后 `cooldownSeconds` 秒内)跳过。
5. `force: true` 绕过概率与冷却,随机、`avoid`、最近 3 次去重、≤5 MiB、扩展名白名单照旧。
6. `avoid` 是可选的文件名数组,按 basename 比较。
7. 跳过回执形如:

   ```text
   [skipped] {"skipped":true,"reason":"chance","chance":0.35}
   happy 这次不出图:概率 35%,掷骰 0.512。不是错误,是故意跳过。
   ```

   冷却时 `reason` 是 `cooldown`,正文写还剩几秒。
8. 成功回执带 `emotion` / `name` / `bytes` / `path`,字节作为附件交给 Core,句柄是 `log:`。
9. 只读本地磁盘,不联网,不写外部服务;不依赖 image_attach。

`emote_mood({ emotion })` 是另一个工具:

- 只记录 `{ emotion, setAt }`,写进部署的 `data/emote-pics-mood.json`;重启后还在。
- 不读图片、不发图、不产生 `[blob]` 句柄、不碰 `pet_say`。
- 返回一句「记下了:happy(30 分钟内有效)」。
- 传 `clear: true` 清空当前心情,回执「心情已清空」;`clear` 和 `emotion` 同时给会报错,
  两个都不给也报错。
- 超过 `moodTtlMinutes` 视同没设,不拿旧值参与判断。
- 取图成功时(`moodFromPic` 开着)会自动写一次心情,所以不用每次手动记。

## 自动读心情

桌宠说一句话时,它会把气泡里解析好的表情存进自己的 `desktop-pet.self` 事件:
`meta.kind === "say"`,`meta.beats[].mood` 形如 `{ "id": "happy", "zh": "开心", "en": "happy" }`
(动作词如 `walk` 在它那一侧就不是表情,不会出现在 `mood` 里)。扩展:

- 挂载后每秒扫一次新事件,并在每次 `emote_pic` 开始时也扫一次,所以同一轮先说话后取图也能用上新心情。
- 取第一段能认出的 `mood`,按 `id` / 中文名 / 英文键映射到 19 个键;`determined` 同时认「认真」和「坚定」。
- 更新心情并记来源 `script`;没有标记、认不出、或不是 `say` 事件时什么都不做(不猜、不清空)。
- 只看挂载之后的新事件,不拿历史气泡里的旧表情当现在。

这依赖桌面宠 World 存在并推送这类事件;没有它的部署不会自动更新,但工具和面板照常。心情来源会在
面板上显示为 `script` / `pic` / `manual`,并显示多久之前写的。

自动感知自己会喊:面板心情下面一行写「自动感知:运行中/未启动 · 最近一次扫描时间 · 读到 X /
这句没带标记」;连续 `moodWatchNoMoodCount` 条没读到表情,会记一条 warn「自动感知:最近 N 条气泡
都没读到表情标记,心情不会自动更新」;超过 `moodWatchSilentMinutes` 没扫到事件,记一条 warn
「自动感知:已 T 分钟没扫到气泡事件,可能桌面宠事件已改名/改字段」。同一状态只报一次,恢复时各记
一条 info;不弹窗、不打断、不发消息。

## 桌面弹图

发图成功时,桌面上同步弹一张同样的图。配置在独立的「桌面弹图」页,不和表情文件夹混排:

- 开关;横向/纵向 0~1(留空用默认位置 `0.86 / 0.66`,避开桌宠气泡);停留秒数(默认 3);
  缩放;圆角(px,0~64,默认 16)。
- 「跟随桌宠的位置」:每次弹图时截主屏工作区底部 260px,在本地按 DeepSeek 蓝阈值扫列找出桌宠,
  不联网、不调用模型。横向主用 `petX * 窗口宽`,块中心只在偏差超过 80px 时兜底;纵向用工作区底边减偏移;
  截图失败时先用 3 秒内的上次成功值,再用部署 `config.json` 的 `worlds.desktop-pet.petX`,最后才退回固定位置。
  多显示器只扫描主屏;开启后横向/纵向坐标不生效,图可能被桌宠挡住。截图在 PowerShell 里按物理像素
  抓取,识别后再按 dpr 转回弹图页面的 CSS。
- 「立即弹一张测试图」从当前所有表情文件夹(含子文件夹)随机挑一张,按当前设置弹一次;没配目录、没有可用
  图片、窗口打不开都会在按钮旁边给一句提示。不依赖面板的入口是工具 `emote_popup_test`。

实现上照 `cortico-world-sticker-window` 的路子:每张图起一个本地 `http://127.0.0.1:随机端口`
页面,再 `spawn(process.execPath, ['--pet-host', '--pet-url=…', '--parent-pid=…',
'--user-data-dir=临时目录'])` 让 Coopanion 自己开一个窗口。扩展不建 BrowserWindow、不轮询文件;
每个窗口弹完自己关,进程退出码非 0 时把 stderr 末尾记进日志。窗口是宿主的透明、无边框、置顶、
点击穿透窗口,`showInactive()` 显示,不抢焦点。连发时每张一个窗口(`popupQueue`),互不顶掉;
关掉开关或卸载会杀掉所有弹图进程并删临时 profile。

位置按工作区宽高算并 clamp 进屏幕;`popupX`/`popupY` 留空用 `0.86 / 0.66`。尺寸按原图宽高比,
长边不超过工作区短边的 1/3,再乘 `popupScale`。动画是 `scale(.72)→1` 的
`cubic-bezier(.34,1.56,.64,1)`,`transform-origin: bottom center`,收起先淡出 0.35 秒再关窗。
GIF / WebP 交给原生 `<img>` 播放。面板显示 `ready / disabled / error: <原因>`。
圆角同时作用在容器和 `<img>` 上(`overflow:hidden`),实际半径是
`min(配置值, 长边 12%, 短边 25%)`,所以 500×500 和竖长图默认都是 16px,小图也不会被修成圆球;
`0` = 直角。

**对话页里 `pet_say.images` 的缩略图是宿主渲染的**,宿主样式 `.chat-thumb` 固定
`border-radius:10px`;扩展没有给图片带样式元数据的入口(`images` 只认 `log:` 句柄),所以对话页
圆角改不了,要改只能改宿主。本包不对对话页注入样式。

每次弹图追加日志到 `data/emote-pics-popup.log`(Coopanion 实际路径是
`data\home\companion\data\emote-pics-popup.log`,面板会显示):`spawn pid=… url=…` 是窗口进程与页面地址;
`http GET / -> 200` 是本地页面请求;`page-load` 是页面脚本起来;`layout left,top wxh win WxH` 是
页面算出的图片左上角、图片尺寸和宿主窗口工作区;`img-error` 是图片读不出;`finish reason=… lived=…ms`
是关窗原因(超时/退出/stopAll)与从 spawn 到关闭的毫秒数;`child:` 是宿主/页面输出,含
`did-fail-load`。`ready-to-show`、`isVisible`、`getBounds` 是宿主窗口内部状态,扩展进程拿不到。

注意:这条路每弹一张会短暂多一个 `Coopanion.exe` 进程(和表情窗户一样),弹完就退出。

弹图只挂在 `emote_pic` 成功之后(一次成功调用最多弹一张),失败只记日志,绝不影响回执和消息。
关掉开关或 World 卸载时会停掉宿主进程,不留孤儿窗口。

## 装进 Coopanion

1. 打开 Coopanion 的 WebUI,「扩展」页 →「手动安装」→「从本机目录安装」,填这个目录的绝对路径,
   重启进程。
2. 在 World 总览里启用「Emote Pics」(`worlds.emote-pics.enabled`)。
3. 左栏 World →「对话表情包」,给至少一个表情选文件夹、设概率。
4. 确认:扩展页卡片「已加载」;World 总览有这张卡;工具表里有 `emote_pic` 与 `emote_mood`。

## 怎么测

提示词的验收:

- **A** 装好不改配置 → 桌宠自己会带图,没人提醒。
- **B** 面板关掉「注入这段提示词」→ 系统前缀里这一段消失,`emote_pic` 仍可手动调。
- **C** 改正文并保存 → 下一句就生效,不用重启。
- **D** 正文填 3000 字 → 保存被拒绝,提示上限 2000 字,配置不变。
- **E** 点「恢复默认」→ 文本框回到默认文本;没点「保存」前不写盘。
- **F** 注入出错(比如配置被改坏)→ 对话照常,运行日志里有 `[emote-pics]` 的 warn。

心情的验收:

- **M1** 调 `emote_mood({emotion:"happy"})` → 回执「记下了:happy」,没有附件;前缀里出现
  `happy（刚刚设的）`。
- **M2** 面板里能看到当前心情与剩余分钟;过期(或把 `moodTtlMinutes` 设成 0)后变回「未设置」。
- **M3** 重启 Coopanion 后,还没过期的心情仍然在。
- **M4** 不传 `emotion` 调 `emote_pic` → 用当前心情取图,回执写明「按当前心情 happy 取的图」。
- **M5** 没有心情时不传 `emotion` → `[skipped] {"reason":"no_mood"}`,不报错、不发图。
- **M6** 取图成功后心情自动变成那张图的 emotion;跳过时不变;面板「清除」或
  `emote_mood({ clear: true })` 能清空。

原来的 A~F 照旧(只配 happy、空文件夹、8 MiB 跳过、连调不重复、pet_say 出图、面板改路径不重启)。
概率与冷却的验收:

- **G** `chance = 0` → 连调 10 次一次都不出图,回执都是 `skipped/chance`。
- **H** `chance = 1`、`cooldownSeconds = 0` → 每次都出图。注意冷却默认是 90 秒,`chance = 1`
  连着调时第二张会被冷却拦下;验收 H 时把冷却设成 0。
- **I** `chance = 0.3` → 连调 100 次,出图次数落在 20~40。
- **J** 出图后立刻再调同一表情 → `skipped/cooldown`;换另一个表情不受影响。
- **K** `force: true` 时 `chance = 0` 也出图。

## 开发

```bash
corepack pnpm install
pnpm build          # 生成 dist/webui.js 与 dist/webui.css
pnpm typecheck && pnpm test
```

在 Cortico 检出根下重写自描述并校验:

```bash
pnpm describe:extension <这个目录>
pnpm check:extension <这个目录>
```

`cortico.api` 是 world 6。改了面板或工具后记得 `pnpm build`;`check:extension` 会核对
`cortico.webUiClient` 指的产物在不在。
