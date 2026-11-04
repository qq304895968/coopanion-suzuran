## Unreleased

- 对照官方 Coopanion 0.2.17 确认其不处理 `companion:open-folder`；不再用 `process.send()` 的布尔值跳过系统文件管理器。保留原生打开与复制路径兜底，桌面可见性仍须实机验收。旧的 0.2.13 私有宿主 IPC 不再作为默认路径。

## 0.6.3

- 修复「打开当前文件夹」在 Windows 上不弹窗口:Core 是 Electron-as-Node,自己 spawn 的子进程会被隔离在无交互桌面上。改为用 `process.send({ type: 'companion:open-folder', path })` 交给 Coopanion 主进程的 `shell.openPath`;非 Coopanion 宿主保留 PowerShell `Shell.Application` 兜底。
- 本机 Coopanion 0.2.13 的 `app/core-host.cjs` 与 `app/main.cjs` 已加 `companion:open-folder` 处理;升级 Coopanion 后需要重新应用这段宿主补丁。

## 0.6.2

- 有参考图时，图片提示词缩短为两行：画风 + 画什么 + 人数/参考约束；不再把整段人设气质、纸张纹理和内容守则塞进去，减少大段文字和参考图抢权重。
- 参考图提示里明确“人数以画的内容为准，不要额外复制同一个角色”，避免把一个人画成两个相似的人。

## 0.6.1

- `pet_draw` 新增 `referencePath`：直接把一张本地图片的绝对路径作为参考图，优先级高于搜图和截屏；读不到时按文字画，并明确说「参考图文件没读到」，不再退回关键词搜图。
- 给「看一眼」的深刻瞬间、日记截图当参考图用；参考图仍只进这一次请求，不落盘。
- 截图意图不再要求说出“截图”：说“记下这一刻 / 参考这一瞬间 / 照着他的样子 / 现在这个画面”也会按当前屏幕处理；若只是点名一个人、当前屏幕和聊天内容与 TA 无关，仍走搜图或纯文字。

## 0.6.0

- `pet_draw` 新增 `referenceName / referenceQuery / referenceMode / referenceImage`：玩家说“给X画幅画”时，先取参考图再画，不再只靠关键词猜长相。
- 优先级：对话附件 > 屏幕截图（仅明确要求）> 网络搜图（Bing 中国区结果按相关性排序，过滤广告/素材，Wikipedia 兜底）；搜不到按文字画并如实说明。
- 参考图只作为图生图输入，输出仍是 512×512 和固定笔触；参考图不落盘，画夹索引只记来源说明。
- 配置新增 `referenceSearch` / `referenceScreen` 两个开关，默认开。

## 0.5.1

- 「打开当前文件夹」改成原生链接 + 隐藏 iframe 发 GET，不再依赖客户端 `ctx.invoke`；同时加「复制路径」按钮兜底。
- 服务端 `folder.open` 允许 GET（`getMethods: ['open']`），Core 日志继续记录 opening/opened。

## 0.5.0

- 去掉「人设档位」（`personaKind`），只保留「画风」（`style`）；默认蜡笔涂鸦，面板下拉显示中文。
  - 不再有「跟随人设档位」这个选项；画风就是实际笔触。
  - 画夹索引里的 `personaKind` 改为 `styleId`，新画记录具体画风。
- 修复画夹页「打开当前文件夹」按钮：改用按钮 `onClick`，点击立刻显示「正在打开」，成功/失败都有可见反馈；Core 日志记录打开动作。

## 0.4.1

- 把「画风类型」改成「人设档位」，「画风」改成「具体画风」，避免两个名字听起来一样。
- 两个下拉的选项改为中文标签（小孩子 / 中学生 / 成年人 / 老年人 / 战士 / 学者 / 机器人 / 自定义；跟随人设档位 / 蜡笔涂鸦 / 铅笔速写 / 马克笔小插画 / 水墨小品 / 炭笔速写 / 钢笔淡彩 / 像素画 / 自定义画风）。

## 0.4.0

- 人设不再由玩家手填：删除配置页的「人设名字」和「性格关键词」，改为每次画之前读部署的 `workspace/CONSTITUTION.md`。
  - `# 我是谁` 的第一句取名字，`# 性子` 的第一段取性格；读不到时用显示名和通用笔触。
  - `personaKind` 改名为「画风类型」，只决定笔触，不再是「人设内容」。

## 0.3.2

- 去掉配置页的「API Key 环境变量名」一项；Key 现在固定从部署 `.env` 的 `QWEN_API_KEY` 读取，配置里不再出现这个字段。

## 0.3.1

- 画夹面板读取失败时直接显示错误，不把空路径当正常。
- 弹图清理只在 Windows 上尝试 `taskkill`；其他平台只 `kill()`。
- 弹图进程从 Core 拉起时带 `--no-sandbox`：这个窗口只加载本机 `data:image` 页面，不带时 Electron 会在启动阶段直接退出。

## 0.3.0

- 画完自动弹图：桌面弹一张（只弹第一张），透明、点击穿透，默认 5 秒后自己消失；`popupEnabled / popupSeconds / popupScale` 可调。弹图日志写 `data/pet-draw-popup.log`。
- 自动展开话题：保存后推 `petdraw.drawn` 事件，提醒桌宠用 `pet_say.images` 展示、用 `pet_ask` 问「喜欢 / 一般 / 不喜欢」，收到回答后用 `pet_draw_rate` 记下，再顺着画聊一两句。
- 画夹页：World 页新增「画夹」面板，显示当前目录与各评价数量，提供「打开当前文件夹」「选择文件夹」「刷新」按钮；`dist/webui.js` 随包发布。
- 包版本 0.3.0；新增 `dist` 到 files，`pnpm build` 生成面板 bundle。

## 0.2.0

- 每次出图数量：`maxImagesPerCall`（1–4），`pet_draw` 的 `count` 会被夹到这个上限；默认仍是 1 张。
- 玩家可以在对话里用 `pet_draw_settings` 改每日上限、每次上限、画夹目录、月度预算，写回 `worlds.pet-draw`。
- 画夹：图片按评价存进 `unrated / favorite / like / neutral / dislike`，根目录写 `index.json`，给日记等其他插件读；另有 `pet_draw_gallery` 让桌宠自己翻画、把旧画重新作为附件。
- 评价：`pet_draw_rate` 只在玩家明确说喜欢/不喜欢/一般后调用；支持单张、多张和一次画的所有张。
- 额度：`pet_draw_quota` 查千问 `/quotas` 的真实限流和 `/models` 的当前单价；有预算时折算成“大约还能画几张”，回答只说张数，不报金额。账户余额没有 API Key 接口，会如实说明。
- 本地计数增加按月估算花费（只用于预算折算），数据页清除计数不会动画夹里的图片。

## 0.1.0

- 首个版本：`pet_draw` 让桌宠按人设画一张 512×512 的小画。
- 人设笔触：child 蜡笔涂鸦、teen 铅笔速写、adult 马克笔、elder 水墨、warrior 炭笔、scholar 钢笔淡彩、robot 像素画、custom 自定义。
- 只做图：固定 `qwen-image-3.0` 与 `512*512`，不做视频、动图、高清、照片/写实、改图/修图；返回尺寸与真实像素双重核对。
- 画完作为附件交给 Core，可用 `pet_say.images` 展示。
- 本地计数：每日上限、冷却、最近 20 条元数据；数据页可清零。
- API Key 只从部署 `.env` 的 `QWEN_API_KEY` 读取，日志与错误信息不含 Key。
- 环境提示词、配置面板、describe.json 与本机检查脚本。
