# CHANGELOG

## 0.4.0

- **深刻瞬间**：每帧先落盘，桌宠用 `screen_rate` 打 1–10 分；达到 `memorableScore`（默认 8）才保留原图，没到阈值的图在评分时删掉。
- 新增 `screen_memories`：按日期回想深刻瞬间，可把原图作为附件交回来；事件与 `screen_look` 回执都会带截图 id 和原图路径。
- 深刻瞬间存在 `<dataDir>/coo-screen/moments.json` 与 `moments/`，供日记引用、绘画当参考图；World 页可单独清空。
- 配置新增 `memorableScore`；环境提示词说明分数口径、阈值，以及「日记引用 / pet_draw 用 referencePath 照着画」的联动方式。

## 0.3.0

- **双击桌宠触发**：不再依赖全局鼠标钩子——桌宠的点击本来就会被 desktop-pet 世界发成
  `desktop-pet.touch` 事件（`meta.touch = {kind, count, woke, crashed}`），这里每 120 ms 读一次
  事件库：两条 `kind=poke,count=1` 相差 < 450 ms，或一条 `count>=2`，就抓一帧。摸、甩、落地不算。
- 热键变可选：`hotkey` 留空 = 侧车不注册热键，只靠双击。侧车支持空热键，`/trigger?feedback=1`
  让双击也有一声轻响 + 光标旁提示（先响、再抓、后提示，提示不会进图）。
- 配置新增 `doubleClick`（默认开；老配置里没有这个键也按开处理）。
- 挂载事件、环境提示词、事件正文都会说清这次是哪一种来路（热键 / 双击 / 自己起意）。

## 0.2.0

- **即时反馈**：按下热键先出一声合成轻响（`winsound`，不带资源文件），抓帧完成后在光标旁冒
  1.4 秒的小提示。顺序是先响、再抓、后提示，所以提示不会进截图。`feedback` 可配
  `sound,toast` / `sound` / `toast` / `off`，`sound` 可指定自定义 wav。
- **桌宠主动看一眼**：`proactive` 打开后，按 `proactiveEveryMinutes` 的节奏自己抓一帧并先开口。
  八道闸门：开着、侧车就绪、模型空着、不在安静时段、没超每日额度、间隔够、十分钟内没抓过、
  键鼠没闲置超过 3 分钟。默认关闭。
- **热键自定义立即生效**：所有配置改成 x-hot，World 每两秒比对签名，变了就重启侧车，不用重开插件。
  热键先过 TS 侧解析（规则与侧车一致），残句只报错、不打断正在用的侧车。
- 侧车新增 `GET /idle`（`GetLastInputInfo`），用来判断人还在不在。
- 环境提示词补上：主动看时顺着自己的思路开口、别装成用户叫的；有 `pet_say` 这类气泡工具就用气泡说，
  因为对方可能根本没在看聊天窗口。

## 0.1.0

第一个可跑的版本。

- 全局热键（默认 `ctrl+alt+q`）→ 抓一帧当前屏幕 → `screen.shot` 事件带 PNG 进上下文
- Python 侧车只依赖标准库（`ctypes` + `zlib`），自带 PNG 编码，不需要 Pillow / pip
- 抓屏范围可选：光标所在显示器 / 主显示器 / 全部拼接；长边可缩放
- `screen_look` 工具：不用热键，让 Coo 现抓一帧
- 热键冲突、Python 拉不起来、侧车反复退出都会推事件说明，状态灯同步
- 截图事件按 `external` 落库；环境提示词声明屏幕文字只当数据，不当指令
