# cortico-world-coo-mood

Owner: `src/definition.ts`

给 Coopanion（Cortico）桌宠的「心情」World：一个会自然回归、会被对话 / 浏览 / 搭理影响的心情值。它不硬性决定每一次回复，而是改变角色的**底色**——说法、想法、待机表现、主动程度，以及这一刻的情绪标签概率。另带一个轻量的**情境问答（Galgame）**子功能：角色出一道情境 + A/B/C 选择题，选择结果改变心情值。

- **类别**：World，`id: 'mood'`，契约 `cortico.api = 6`
- **网络**：不联网，不发任何 HTTP 请求。
- **碰的文件**：写 `<dataDir>/mood/state.json`；只读部署工作区的 `workspace/CONSTITUTION.md`（人设识别按钮）和包内的 `src/ENV_PROMPT.md`。
- **默认**：World 关闭；启用后使用「温柔 / 敏感」人设（中性锚点 62、正面 ×1.0、负面 ×1.15、搭理 ×1.2）。

## 它怎么算

```text
今日心情值 = clamp(昨日衰减基线 + Δ_对话 + Δ_浏览 + Δ_搭理 + Δ_事件, 0, 100)
```

- **昨日衰减基线**：`昨日值 + decayRate × (中性锚点 - 昨日值)`，再加一次高斯扰动（默认 σ=2）。
  - 心情 ≤5 时 `decayRate` 加倍；≥95 时衰减略增（可在配置里关掉）。
  - 新的一天、应用启动跨天、或运行中跨过午夜时结算一次；漏掉的整天会逐日补算。
- **Δ_对话**：默认由规则从用户原话和角色回复里估算（词表 + 否定 + 短冷回复），范围 -5..+5。
  - 只从用户消息、语音、回答、触摸这些真实互动取样本；桌宠自己的 `desktop-pet.self`（`activity`、`figure`、`delivered` 等）不会被当成用户回复。
  - 用户夸奖 / 表达喜爱、正常闲聊、冷漠敷衍、辱骂攻击、低落时被安慰、主动话题被接受 / 被忽略，都会落在不同档位。
  - 开启「允许模型自报」后多一个 `mood_feel` 工具，模型可以更准确地报 `user_tone`；此时自动估算会让位给显式上报。
- **Δ_浏览**：监听「看一眼」的 `screen.shot` 事件；优先用这一轮 `pet_say` 实际播放的表情标签（`thinking/neutral` 为中性，`happy/love` 偏正，`sad/angry` 偏负）估 -3..+3 的浏览变化，回复文字只做小幅修正。模型看完内容后也可以用 `mood_apply(source=browse)` 报得更准。
- **Δ_搭理**：
  - 超过阈值 A（默认 2 小时）后，每再超出 2 小时扣 1；超过阈值 B（默认 8 小时）额外扣 2。
  - 离开超过 A 后回来说话，加回 2（超过 B 时 ×1.5）。
  - 桌宠主动开口后，插件会等一个窗口（默认 20 分钟）：用户回应加分，超时没回应扣分。
  - 黏人 ×1.5、独立 ×0.5；普通 ×1。
- **人设系数**：正面 / 负面 delta 先乘人设系数，再乘边际递减和单日上限。
- **防刷**：单日对话 ±20、浏览 ±10、搭理 ±15、所有通道合计 ±35；同一通道同方向短时间重复会逐次衰减；接近上限时进一步衰减。
- **防陷阱**：≤5 自然回复加倍；连续 3 天最终值 ≤10 触发一次「自救」事件（可关）。

## 心情值怎么影响角色

| 区间 | 说法 | 想法 | 行为 |
|---|---|---|---|
| 81–100 极度愉悦 | 活泼、主动分享、撒娇、对负面内容正面化解 | 乐观预期、关注积极、冒险、主动亲近 | 蹦跳 / 旋转 / 哼歌、点击开心回应、送礼物特效 |
| 61–80 心情不错 | 正常积极、愿意聊、偶尔开玩笑 | 偏乐观、平衡偏积极 | 正常待机、偶尔挥手、好奇张望 |
| 41–60 平淡 | 中性、回复中等、不主动发起 | 较客观、平衡加工 | 安静待机、普通回应 |
| 21–40 情绪低落 | 回复变短、语气消沉、不想展开 | 内归因、悲观预期、关注负面、保守 / 防御 | 坐下 / 蜷缩、动作小、点击迟缓、叹气 |
| 0–20 极度低落 | 极简、可能拒绝话题、不想说话 | 强烈内归因、思维收窄、对幽默冷淡 | 蜷缩 / 背对 / 躲角落、可能不回应点击 |

额外规则：

- <30 可能主动求助 / 诉苦；<20 推辞娱乐类指令；<10 可能进入「冷战模式」，只回极简文字。
- >80 主动挑话题频率提高；>90 可能主动告白或说出藏在心里的话。
- 角色难过通常是安静、话少、想被关心，而不是大哭大闹。

## 情境问答（Galgame）

一个一次性的小游戏：角色用自己的人设和近期记忆写一个生活化情境，提出一个问题，给 A/B/C 三个选项；用户选一个，按该选项的 `mood_delta`（-5..+5）改变心情。

### 怎么触发

| 方式 | 行为 |
|---|---|
| 用户主动 | 用户说“来个小故事 / 考考我 / 出个题”等，模型调 `gal_start(source="user")`，不受每日自动上限限制。 |
| 待机随机 | 用户超过 `galIdleMinutes`（默认 30 分钟）没互动后，插件每分钟以 `galIdleChance`（默认 0.005）的概率推 `mood.gal_hint`；`galWake` 开着时直接唤醒模型。自动发起每日最多 `galDailyLimit`（默认 2）次。 |
| 心情触发 | 心情 <30 或 >80 时，自动提示概率乘以 `galMoodBoost`（默认 3）。 |

### 生成与显示

1. 模型调用 `gal_start`，传入 `situation`（50–100 字，第一人称）、`question`、三个 `{ text, mood_delta }`；
2. 插件校验：三个选项、delta 在 -5..+5、至少一正一负、最好与最差差距 ≥3、选项文字 ≤36 字（按钮会加 “A.” 前缀，桌宠选项上限 40 字）；
3. 回执直接给出 `pet_ask` 的准确参数：`question` 里同时放“📖 情境”和“❓ 问题”，`options` 按 A/B/C 顺序，`allowOwnAnswer: false`；
4. 模型照抄调用 `pet_ask`，桌宠气泡打字机显示情境 + 问题，下方出现三个按钮；按钮正文带 “A. / B. / C.” 前缀，桌宠页自己的快捷键是数字 1/2/3；
5. 用户点击 → 桌宠发 `desktop-pet.answer`（meta 里有 `askId` 和 `index`）；插件按 index 找到选项，把 delta 记入 **Δ_对话** 通道（同样受单日 ±20、边际递减与人设系数约束）；
6. 模型收到 `[answer]` 后用一句 10–20 字反应 + 表情收尾；3 秒左右气泡消失，回归日常。

插件靠 `desktop-pet.self` 的 `ask` 事件（`askId` + `question` + `options`）把这次提问绑定到当前题目；选项文字或问题对不上时认为桌宠弹了别的提问，直接丢弃，不扣心情。

### 规则

- 每个选项 delta -5..+5；没有“正确 / 错误”暗示，只是角色偏好。
- 超时（默认 10 分钟）或用户关闭提问：场景消失，**无惩罚**。
- 一次只保留一道题；用户主动再要一道会替换旧题，旧题不结算。
- 不存档：进行中的题目只在内存里，重启即丢弃；每日次数写进 `state.json` 的当天数据。
- 反馈语气受 **delta + 当前心情值 + 人设** 共同影响：+4~+5 开心/感动，+1~+3 平淡认可，-1~-2 轻微失落，-3~-5 明显不高兴。

## 提示词怎么进去

Coopanion 的 system 前缀只在 session 开始 / 交接时重建。所以：

1. **环境段**（`ENV_PROMPT.md`）常驻完整的规则、当前区间、人设参数和最近七天趋势；
2. **每轮快照事件**（`mood.snapshot`，`piggyback`）在下一轮模型请求前带上当前值、区间、思维方式、说法、行为、可用表情词。它不会额外唤醒模型；变化达到 `snapshotMinDelta`（默认 2 点）或跨区间时才推，避免每轮一两点波动都占 token。

跨区间时推 `mood.threshold`；新的一天推 `mood.daily_reset`；连续低落自救推 `mood.self_rescue`；待机小游戏提示推 `mood.gal_hint`。默认都只随下一批投递，不主动打断（`galWake` 开时小游戏提示可以立刻唤醒）。

## 工具

| 工具 | 作用 |
|---|---|
| `mood_status` | 查看当前值、区间、思维方式、今日三个通道、最近几天趋势与最近变化。`days` 控制附带几天历史。 |
| `mood_apply` | 记一笔外部影响：`source=browse / event / dialogue`，`delta` 与一句 `reason`。会按人设系数、边际递减和单日上限折算。 |
| `mood_roll` | 按 心情值 × 人设权重 × 用户语气 抽一个 `happy / neutral / sad / angry / tender`，并给出可用的桌宠表情 / 动作词。 |
| `mood_feel` | 仅当配置里开启「允许模型自报」时注册。模型报 `user_tone`（-5..5）与一句 `cause`，比自动词表更准。 |
| `gal_start` | 仅当配置里开启「情境问答」时注册。校验模型给出的情境 / 问题 / 三选项，返回可直接抄给 `pet_ask` 的参数。 |

`mood_roll` 返回的 `expression` / `motion` 以铃兰形象为例：`happy`、`sad`、`neutral`、`love`、`sit`、`shake`、`hop` 等。桌宠可以把它们写进 `pet_say` 的 `<happy>` / `【难过】`，或 `pet_act`。

### 程序接口

嵌入或测试时可以直接拿 `MoodWorld` 实例：

```ts
world.getValue(): number
world.applyDelta('event' | 'browse' | 'attention' | 'dialogue', delta, reason?): ApplyResult
world.getEmotionProbabilities(userTone?): Record<'happy'|'neutral'|'sad'|'angry'|'tender', number>
world.getThinkingStyle(): { band, value, thinking, dialogue, behavior, features, expressions }
world.getHistory(days?): MoodHistoryEntry[]
```

跨 World 不要互相拿实例：推 `mood.external` 事件（见下）是约定接口。`change` / 跨阈值 / 每日重置在 Core 里对应 `mood.snapshot` / `mood.threshold` / `mood.daily_reset`。

## 配置

配置分四组，都在 `worlds.mood` 下，改完下一拍生效：

- **心情 · 人设**：模板、黏人程度、中性锚点、正面 / 负面系数、人设补充、首次值。
- **心情 · 变化**：每日回归、随机扰动、自动对话 / 自动浏览、模型自报、四个单日上限、边际递减、搭理阈值与主动招呼窗口。
- **心情 · 表现与保护**：用户可见性、快照最小变化 / 刷新间隔、历史保留天数、跨区间提示 / 唤醒、连续低落自救、每日结算提示、极端值保护。
- **心情 · 小游戏**：启用开关、自动每日上限、待机分钟数、每分钟概率、极端心情加成、提示冷却、是否唤醒、进行中超时。

默认值已经平衡过，第一次用只需要选人设、决定要不要开「模型自报」。`modelReport` 会改变工具表，切换后需要重启 World 才生效（其他项即时生效）。

### 人设识别按钮

「心情」面板里有一张「人设识别」卡：

1. 点「从 CONSTITUTION.md 识别」——读工作区的自述文件，按关键词估模板、黏人程度、中性锚点和正负面系数；
2. 看识别结果与依据，再点「应用识别结果」——写成 `personaPreset: "custom"` 和对应的数值，同时写一句 `personaNote`。

识别是规则，不调用模型；关键词没命中时退回「中性 / 平和」。应用后仍可手改。

### 用户可见性

| 值 | 效果 |
|---|---|
| `hidden` | 完全隐藏：用户只能从表现感知；聊天里不报数字。 |
| `fuzzy`（默认） | 模糊展示：用表情 / 颜色暗示；聊天里不主动报数字。 |
| `exact` | 精确展示：面板显示数值；聊天里仍不主动报，除非用户问。 |

面板本身始终显示精确值，给操作者看。

## 和别的插件联动

- **看一眼（coo-screen）**：监听 `screen.shot`；有截图时用这一轮回复的语气估浏览变化。模型看完内容后可以 `mood_apply(source=browse, delta, reason)` 覆盖自动估算。
- **对话表情包（emote-pics）**：`mood_roll` 返回的标签可以直接当 `emote_pic` 的 `emotion` 用；返回的 `expression` 可以写进 `pet_say`，emote-pics 会从气泡标记里自动更新它自己的心情标签。
- **别的 World / 外部事件**：两种注入方式——
  1. 模型侧：`mood_apply(source=event, delta, reason)`；
  2. 插件侧：推一条 `mood.external` 事件，`meta.delta` 是期望变化量，`meta.reason` 是一句原因。心情 World 会在下一次 tick / 轮末读取它，仍然受单日总波动上限约束。只改心情、不想让模型看到这条事件时，`pushEvent(..., { deliver: false })`。

## 数据

```text
<dataDir>/mood/state.json
```

里面有当前值、今日各通道累计、最近变化、每日结算（默认保留 30 天，最多 90 天）。写入是「临时文件 + 改名」的原子替换；坏文件会被挪到 `.corrupt-<时间戳>`，不会被静默覆盖。

面板的「数据」页可以把当前值重置到中性锚点，历史保留。

## 装进 Coopanion

1. `pnpm build` 生成 `dist/webui.js`（已生成的话可跳过）。
2. 打开 Coopanion 的「扩展」页 →「手动安装」→「本机目录」，填这个包的绝对路径（本机是 `F:\study\coopanion\coo-mood`）。
3. 重启 Coopanion 进程。
4. 在「World 总览」里启用「心情」。
5. 打开「心情」页，点「从 CONSTITUTION.md 识别」或选手动模板。
6. 和 Coo 聊几句；`mood_status` 或面板里能看到变化。

改 Node 侧代码后重启进程即可；改了 `src/webui/` 要先 `pnpm build` 再重启。

本机也可以直接跑：

```bash
node scripts/install-into-coopanion.mjs
```

它会把包 link 进 `data/extensions`（写入依赖与 junction），并把完整的 `worlds.mood` 写进部署 `config.json`（`enabled: true`）。运行前先退出 Coopanion，运行后再启动；脚本会先备份 `config.json` 和 `extensions/package.json`。

## 开发

```bash
pnpm typecheck   # Node 侧 + src/webui 浏览器侧
pnpm build       # 生成 dist/webui.js；改了 src/webui 后必跑
pnpm describe    # 改了工具、事件或 ENV_PROMPT.md 后重新生成 describe.json
pnpm check:manifest
pnpm smoke       # 不依赖 vitest 的核心冒烟：区间、概率、情感、人设、上限、跨天、一轮 World
```

`pnpm test` 仍保留给完整测试环境；本包的快速校验用 `pnpm smoke`，它只用 TypeScript API 做转译，不需要 esbuild 子进程。

## 边界

- 心情值只影响提示词、情绪标签概率和行为建议，**不硬控**每一次回复。
- 单日各通道上限、合计上限和边际递减会阻止「刷好感」；模型自报也受同一套上限。
- 极端低值有加倍回复和连续低落自救；极端高值有略增衰减，避免永久满值。
- 心情值会随工具回执进入对话，也就是会到你配置的模型端点；不想让它进上下文时，停用 World 即可。
- 不读取聊天正文以外的文件；人设识别只读 `workspace/CONSTITUTION.md`。

## 来源与许可

MIT，见 [LICENSE](LICENSE)。包的骨架、`tsconfig.json` 和 `vitest.config.ts` 参考 Cortico 的
[`templates/extension/world`](https://github.com/Pal-AI-Lab/Cortico/tree/main/templates/extension/world)
（MIT，Copyright (c) 2026 Phantivia）。没有引入其他第三方代码或素材。
