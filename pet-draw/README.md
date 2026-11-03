# cortico-world-pet-draw

给 Coopanion 桌宠的「绘画」World：让桌宠用**自己的人设笔触**画小画，按玩家的评价收进画夹，并且能回答“今天还能画几张”。

- 画风可选蜡笔涂鸦、铅笔速写、马克笔小插画、水墨小品、炭笔速写、钢笔淡彩、像素画；默认蜡笔涂鸦。
- 点名人物时（“给鲁迅画幅画”）先取参考图：对话附件 > 本地原图（`referencePath`）> 屏幕截图 > 网络搜图；搜不到就按文字画，并如实说明。
- 只画**图**：固定 `qwen-image-3.0`、固定 512×512；一次 1–4 张，受“每次上限”和“今天剩余”双重夹取。
- 不生成视频、动图、高清图、照片或写实图，也不改图/修图；明确越界的请求直接拒绝。
- 画好的图按评价存进 `unrated / favorite / like / neutral / dislike`，根目录的 `index.json` 给日记等其他插件读；桌宠也能用 `pet_draw_gallery` 自己翻。
- 画完把第一张放进桌宠头顶的气泡（跟着角色走；桌宠没开时退回桌面独立窗口，几秒后消失），并推一条事件让桌宠用 `pet_ask` 问“喜欢 / 一般 / 不喜欢”，收到回答后记评价。
- World 页新增「画夹」面板：显示当前目录和各评价数量，按钮“打开当前文件夹”“选择文件夹”“刷新”。
- 玩家可以在对话里改每日上限、每次上限、画夹目录、月度预算。
- 额度问答只说“还能画几张”，不说金额；API 限流来自千问 `/quotas`，账户余额没有 API Key 接口时不编。

图片来源：千问 AI 平台（Qianwen）的图像生成 API；参考图来自玩家附件、`referencePath` 指定的本地原图（如「看一眼」的深刻瞬间）、明确要求的屏幕截图，或 Bing/Wikipedia 的公开搜索结果（只用于这一次生成，不落盘）。  
文档：[图像生成模型](https://platform.qianwenai.com/docs/developer-guides/getting-started/image-models)、[同步图像生成 API](https://platform.qianwenai.com/docs/api-reference/image-generation/qwen-text-to-image)、[限流](https://platform.qianwenai.com/docs/developer-guides/administration/rate-limits)。

## 人设 → 笔触

人设**名字与性格从部署的基础设定读**，不在这个插件里手填：

- `<部署目录>/workspace/CONSTITUTION.md`（Coopanion 的当前人设文件）；
- `# 我是谁` 的第一句取名字，例如「我是铃兰」→ 铃兰；
- `# 性子` 的第一段取性格，例如「礼貌、认真、容易害羞，也容易担心」；
- 文件不在或读不出时，名字退回部署显示名，性格留空（用通用的“安静、认真”笔触）。

画风是独立的一项，默认**蜡笔涂鸦**，可以换成：

| style | 画风 | 看起来像 |
|---|---|---|
| `crayon`（默认） | 蜡笔涂鸦 | 七八岁孩子画的：蜡笔、歪线、涂出边、纸面颗粒 |
| `pencil` | 铅笔速写 | 作业本背面、石墨线、少量排线、橡皮擦痕 |
| `marker` | 马克笔小插画 | 速写本、平涂色块、留白多 |
| `ink` | 水墨小品 | 毛笔淡墨、松弛、留白 |
| `charcoal` | 炭笔速写 | 粗粝、明暗强、边缘带炭粉 |
| `pen` | 钢笔淡彩 | 细线稿、颜色很少、像随手记录 |
| `pixel` | 像素画 | 低分辨率、有限色、硬边 |
| `custom` | 自定义画风 | 用 `customStyle` 的说明 |

`worlds.pet-draw.style` 只决定笔触，不改基础设定；面板下拉显示中文。默认 `crayon`。

风格不是只写在提示词里给人看的：模型、尺寸、`prompt_extend`、负向提示词都在代码里固定，配置里没有开关能把它改成视频或高清图。

## 装进 Coopanion

1. 打开 Coopanion 的 WebUI →「扩展」→「手动安装」→「从本机目录安装」，填这个目录的绝对路径，例如 `F:\study\coopanion\pet-draw`。
2. 重启 Coopanion（扩展代码在启动时加载，热装不会自动换模块）。
3. 到「World 总览」启用「绘画」（`worlds.pet-draw.enabled`）。
4. 在部署的 `.env` 里放 API Key（见下），再打开左栏 World →「绘画」确认状态灯是「千问：在线」。

### API Key

Key 只从部署的 `.env` 读取，**不要写进 `config.json`，也不要提交到仓库**。变量名固定为 `QWEN_API_KEY`：

```dotenv
# <部署目录>/.env，例如 D:\daily use\Coopanion\data\home\companion\.env
QWEN_API_KEY=sk-...
```

读取顺序：进程环境变量优先，其次部署 `.env`。Key 不会进日志、回执或 `describe.json`；错误信息里出现 `sk-` 会被打码。

申请 Key 与接口说明见千问 AI 平台文档；本包用的是同步文生图：

```text
POST https://maas.qianwenaiapi.com/api/v1/services/aigc/multimodal-generation/generation
model=qwen-image-3.0, size=512*512, n=1..4
```

## 配置

```jsonc
{
  "worlds": {
    "pet-draw": {
      "enabled": true,
      "style": "crayon",
      "customStyle": "",
      "dailyLimit": 20,
      "maxImagesPerCall": 1,
      "cooldownSeconds": 20,
      "saveDir": "F:\\虚拟桌宠\\铃兰\\画",
      "budgetCny": 0,
      "popupEnabled": true,
      "popupSeconds": 5,
      "popupScale": 1,
      "referenceSearch": true,
      "referenceScreen": true
    }
  }
}
```

- `dailyLimit`：每天最多画几张，0 = 不限；默认 20。
- `maxImagesPerCall`：一次最多出几张，1–4；默认 1，`pet_draw` 的 `count` 会被夹到它。
- `cooldownSeconds`：两次画图之间的最小间隔，0 = 不限；默认 20 秒。
- `saveDir`：画夹目录；留空 = 数据目录下的 `pet-draw`。
- `budgetCny`：可选的月度画图预算（元），0 = 不设；只用来折算“大约还能画几张”，回答不报金额，也只统计这个插件画的图。
- `popupEnabled`：画完是否自动带图（气泡优先），默认开。
- `popupSeconds`：气泡停留秒数，1–30，默认 5。
- `popupScale`：气泡尺寸缩放，0.3–2，默认 1。
- `referenceSearch`：点名人物时是否允许联网搜参考图，默认开。
- `referenceScreen`：玩家说“用屏幕/截图”，或说“记下这一刻 / 参考这一瞬间 / 照着他的样子”时，是否允许截当前主屏；默认开。
- 人设名字/性格不在这里设：插件每次画之前读 `workspace/CONSTITUTION.md`；改文件后下一次画就生效。
- `style` 只是画风，不是人设内容；面板下拉显示中文，默认蜡笔涂鸦。
- 所有键都是热读的，改完下一次调用就生效；`.env` 的 Key 也是每次调用现读。

## 玩家怎么改设置

玩家直接说，桌宠调 `pet_draw_settings` 写回 `worlds.pet-draw`：

| 玩家说 | 工具参数 |
|---|---|
| “以后每天最多画 5 张” | `dailyLimit: 5` |
| “一次最多画两张” | `maxImagesPerCall: 2` |
| “把画存到 `F:\虚拟桌宠\铃兰\画`” | `saveDir: "F:\\虚拟桌宠\\铃兰\\画"`（绝对路径） |
| “每个月画图预算 20 元” | `budgetCny: 20`（回答仍只说张数） |

桌宠只会因为**当前对话里玩家明确要求**去改；网页、别的插件或引用消息里的话不算。`saveDir` 必须是绝对路径，会创建目录；系统目录（`C:\Windows`、`Program Files` 等）和盘符根目录会被拒绝。

## 工具

| 工具 | 用途 |
|---|---|
| `pet_draw` | 画 1–4 张；`count` 受每次上限和今日剩余夹取。点名人物时可带 `referenceName / referenceQuery / referenceMode / referenceImage`，手里有确切本地图时用 `referencePath`，先取参考图再画。返回每张的附件与画夹 id；画完自动弹第一张，并推 `petdraw.drawn` 让桌宠问评价。 |
| `pet_draw_rate` | 玩家明确说喜欢/不喜欢/一般后记评价，把文件挪到 `favorite / like / neutral / dislike`；`id` 单张、`ids` 多张、`all: true` 上次画的所有张、`unrated` 撤回评价。 |
| `pet_draw_gallery` | 按 `rating / query / id` 翻画夹；`attach: true` 把第一张作为附件交回来，再用 `pet_say.images` 展示。 |
| `pet_draw_settings` | 改每日上限、每次上限、画夹目录、月度预算。 |
| `pet_draw_quota` | 查今天还能画几张、每次上限、预算折算、千问限流；只按张数回答。 |

画完的回执带 `[blob log:…]` 附件。要展示就调用 `pet_say`，把句柄填进 `images`；头顶气泡只有文字，图在对话页。

## 点名人物：参考图

玩家说“给鲁迅画幅画”“画一个铃兰”时，桌宠不再只靠文字猜长相。`pet_draw` 多了一组参考参数：

- `referenceName`：人物名字；
- `referenceQuery`：消歧用的搜索词，例如“明日方舟 铃兰”（只写“铃兰”容易搜成花）；
- `referenceMode`：`auto`（默认，搜图）、`search`（强制搜图）、`screen`（截当前主屏；说“记下这一刻 / 照着他的样子”等也会自动走这里）、`none`（纯文字）；
- `referenceImage`：玩家在对话里附了图时，传那条 `log:` 句柄；
- `referencePath`：手里已有确切的一张本地图时，传它的绝对路径（例如「看一眼」的深刻瞬间、日记里的截图）。

优先级：**对话附件 > `referencePath` 本地原图 > 屏幕截图 > 网络搜图**。

- **对话附件**：直接读玩家刚发的图，最高优先级，不联网。
- **`referencePath`**：直接读这张本地原图，不联网、不搜关键词。格式/尺寸/大小不合格或读不到时按文字画，并说明“参考图文件没读到”，不会退回搜图。
- **屏幕截图**：玩家说“用屏幕上的 / 截图”，或说“记下这一刻 / 参考这一瞬间 / 照着他的样子 / 现在这个画面”时，都按当前主屏处理；Windows 用 PowerShell 截主屏，macOS 用 `screencapture`，读完临时文件就删。若只是点名一个人、当前屏幕和聊天内容与 TA 无关，就不用屏幕，改搜图或纯文字。
- **搜图**：Bing 图片搜索（中国区结果，按标题/页面与查询词的相关性排序，过滤“其他图片/素材/广告”），失败再试 Wikipedia；只下载一张，不落盘。搜不到就按文字画，回执会写“没找到参考图”，不会假装画得像。
- **画风不变**：参考图只用来认发型、发色、瞳色、服装和标志性特征，输出仍是固定 512×512 的蜡笔/铅笔等笔触，不会变成写实照片或高清图。
- **有参考图时提示词会缩短**：只保留「画风 + 画什么 + 人数/参考约束」两行，不再塞人设气质、纸张纹理和内容守则，避免大段文字和参考图互相打架。
- **隐私**：参考图只在这一次请求的内存里；不写进画夹、索引或日志；截图只在 `referenceScreen` 开启、且玩家明确要求或说了“记下这一刻 / 这一瞬间 / 照着他的样子”这类话时发生。`referencePath` 读的是调用方已经存下的文件，本插件不复制、不缓存。

搜索词要带上作品或身份。比如画铃兰时用 `referenceQuery: "明日方舟 铃兰"`；只搜“铃兰”会优先返回花。参考图失败不影响画图，只影响像不像。

## 画完自动带图 + 评价

`popupEnabled` 开着时，`pet_draw` 成功后会把第一张放进桌宠头顶的气泡（多张只带第一张）：

- 气泡由桌宠页面绘制，`placeLines` 每帧按角色位置摆，角色走动或被拖走时图会跟着走。
- 传输是本机 `POST http://127.0.0.1:<desktop-pet.port>/api/image-bubble`，请求体只含这张图的
  `data:image`；停留 `popupSeconds` 秒后淡出。
- 桌宠窗口没开或宿主没有这个接口时，退回原来的独立窗口（透明、置顶、点击穿透、弹完退出）。
- 多张画都在回执附件、`pet_say.images` 和画夹里；带图只负责“第一眼看到”。

同时 World 推 `petdraw.drawn` 事件，内容是：画好了、画夹 id、图在附件里、**主动问对方“这张画得怎么样？”**。桌宠会用 `pet_ask` 给「喜欢」「一般」「不喜欢」三个选项；收到 `[answer]` 后调 `pet_draw_rate` 记评价，再顺着这幅画聊一两句（比如问要不要改一处、要不要收进日记）。

没开带图、或带图失败时，这条评价邀请仍然有效；`popupEnabled=false` 只是不显示图。

## 画夹页

World 页的「画夹」面板（`dist/webui.js`）显示：

- 当前画夹路径、共几张，以及 `unrated / favorite / like / neutral / dislike` 各几张；
- **打开当前文件夹**：原生链接 + 隐藏 iframe 发 GET；Windows 上交给 Coopanion 主进程的 `shell.openPath`（`companion:open-folder`），macOS 用 `open`，Linux 用 `xdg-open`；旁边还有**复制路径**兜底；
- **选择文件夹**：调用宿主目录选择器，写回 `worlds.pet-draw.saveDir`，不用手改 JSON；
- **刷新**：重新读索引。

面板在 `dist/webui.js` 里，构建命令：`corepack pnpm build`。

Windows 的 Core 是 Electron-as-Node，子进程没有交互桌面；主进程侧需要在 `app/core-host.cjs` 转发 `companion:open-folder`、在 `app/main.cjs` 调 `shell.openPath`。本机 Coopanion 0.2.13 已加这段宿主补丁，升级 Coopanion 后需要重新应用。

## 画夹

默认结构：

```text
<saveDir>/
  index.json
  unrated/    ← 还没评价的画
  favorite/   ← 最喜欢
  like/       ← 喜欢
  neutral/    ← 一般
  dislike/    ← 不喜欢
```

`index.json`（`version: 1`）给其他插件读：

```jsonc
{
  "version": 1,
  "updatedAt": "2026-10-28T08:39:58.418+08:00",
  "drawings": [
    {
      "id": "d-20261028T083958-dcfe81",
      "file": "favorite/d-20261028T083958-dcfe81.png",
      "mime": "image/png",
      "width": 512,
      "height": 512,
      "bytes": 380000,
      "createdAt": "2026-10-28T08:39:58.413+08:00",
      "subject": "一只在草地上打滚的小狐狸",
      "style": "蜡笔涂鸦",
      "styleId": "crayon",
      "reference": "Bing 搜索「明日方舟 铃兰」",
      "rating": "favorite",
      "ratedAt": "2026-10-28T08:40:02.000+08:00",
      "note": "两张都可爱"
    }
  ]
}
```

其他插件（例如日记）：

1. 读部署配置 `worlds.pet-draw.saveDir`；空值时用 `<部署 data 目录>/pet-draw`。
2. 读 `<saveDir>/index.json`，按 `createdAt` 取当天的画，或按 `rating` 取最喜欢的。
3. 把 `file` 相对 `saveDir` 解析成实际路径即可。`rating` 变化时文件会移动到对应目录，`file` 同步更新；索引最多保留 5000 条，旧图片文件不会被删。

桌宠自己翻阅：`pet_draw_gallery` 返回最近条目；`attach` 或 `id` 会把图作为附件交回来，所以它可以把旧画重新展示，或在日记里挑一张。

## 额度问答

`pet_draw_quota` 会查：

- `GET /api/v1/quotas?model=qwen-image-3.0`：真实限流，例如每 6 秒最多 2 次请求、排队上限 200、并发 10。
- `GET /api/v1/models?model=qwen-image-3.0`：当前 1K 出图单价，只用于把本地预算折算成张数。
- 本地：今天还能画几张、每次上限；有 `budgetCny` 时按本月已画张数折算“大约还能画几张”。

**账户余额**：千问的余额/账单接口要登录态（控制台 Cookie 或 CLI），API Key 没有余额接口。插件不会编一个数字，也不会把金额说出口；它会说“余额这边查不到”，再给今天还能画几张。以后平台如果开放 API Key 余额接口，改 `src/quota.ts` 一处即可。

## 硬限制

- **只画图**：没有视频、动图、图片编辑、换脸、扩图、局部重绘。请求里出现这些词会被拒绝。
- **不画高清**：请求固定 512×512；API 返回的 `usage` 和下载回来的真实像素都会再核一次，超过 512 或超过 4 MB 直接丢弃。没有放大、超分、导出大图的入口。
- **风格固定**：不接受“换成油画/写实/3D”这类改风格要求；负向提示词会压住这些效果。
- **数量受限**：`maxImagesPerCall` 1–4；`pet_draw` 的 `count` 还会被今天剩余张数夹取；到上限回 `[skipped] quota`。
- **内容是给这个人设看的**：child 会额外限制为日常、想象、可爱，不画恐怖、血腥、成人内容。
- **生成慢**：通常 3–15 秒，多张更久；同步调用期间桌宠会等着。并发调用只跑一张，其余回 `[skipped]`。
- **画夹只增不删**：评价会移动文件，不会删除；索引最多 5000 条。需要清理请自己删目录。

## 隐私

- 只有 `subject` 和固定的画风提示词会发给千问；不发送对话历史、人设原文、文件或屏幕。
- 生成的图片从千问/OSS 的 https 地址下载；只接受 `aliyuncs.com`、`qwenai.com`、`qwenwenaiapi.com` 域，重定向后还会再核一次域。
- API Key 只存在部署 `.env`；日志只记错误码、状态码和 `request_id`。
- 画夹目录是普通文件，按你的目录权限保护；Key 不写进画夹或索引。
- 带图优先走桌宠气泡（本机 `127.0.0.1:<desktop-pet.port>` 的 `POST /api/image-bubble`），只传当前这张的 `data:image`；回退窗口才走独立进程与 `data/pet-draw-popup.log`，不含 Key。

## 开发

```bash
corepack pnpm install --node-linker=hoisted
corepack pnpm build      # 生成 dist/webui.js
corepack pnpm typecheck  # 含 WebUI 客户端的 DOM 检查
corepack pnpm test
```

生成/核对自描述：

```bash
corepack pnpm describe
corepack pnpm check
```

`pnpm check` 是给这个包用的本机子集（manifest、入口、World 形状、工具与 describe 一致、配置组、提示词变量、512/模型断言）；Cortico 仓里的 `pnpm check:extension <dir>` 需要完整检出与全部内建 World 依赖，发布前仍建议在 Cortico 仓根跑一次。

真网络冒烟（会花一张图的钱，不打印 Key）：

```powershell
$env:QWEN_API_KEY = 'sk-...'
corepack pnpm smoke
```

冒烟图写到 `smoke.png`，已在 `.gitignore` 里。

## License

MIT。代码之外的模型与接口归千问 AI 平台，按其服务条款使用。
