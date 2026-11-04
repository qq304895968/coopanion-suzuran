# cortico-world-arknights

给 Coopanion / Cortico 的「明日方舟」World：陪博士打**集成战略**。

- 本地干员资料：463 个干员页面，职业、属性、天赋、技能（含专精三数值），离线可查。
- 对局账本：主题、分队、难度、层数、生命/希望/源石锭、干员、收藏品、备注，写在本机。
- 战绩复盘：通关率、最远层数、最近几局。
- 提醒：一次性提醒，到点由 World 推事件，不依赖对话还在不在。
- 主动吐槽：对局状态变化时推事件，Coo 可以主动开口（可关）。
- **主动性**：每报一步就立刻给「怎么走、为什么」；3 分钟没动静主动催；商店候选直接排序。
- 黑流树海（ROGUE 6）资料：地图结构、藏品池、节点推测——数据**由你自己在本机导入**，不随包分发（见下）。
- **截图认地图**：发一张黑流树海地图截图，Coo 把主图读成节点/连线拓扑，插件把起点归一成 `(0,0)`、丢掉不连通的特殊小地图、认出是哪一层哪套构造，给出全部险路尽头和真实步数；也能按拓扑算某个节点到起点几步，而不是坐标差。

**它不做什么**：不读游戏进程、不主动截屏、运行时零网络、不碰剧情/档案/语音。截图是博士自己发的；对局进展只有博士通过工具报给你的部分。

## 装进 Coopanion 试用（不发布 npm 也能装）

1. 在 Coopanion 的 WebUI 打开「扩展」页。
2. 选「手动安装 → 本机目录」，填这个包目录的绝对路径，例如 `F:\study\coopanion`。
3. 安装后重启进程（本机目录以 link 方式装入，改代码后重启即可生效）。
4. 到「World 总览」启用「明日方舟」。

配置文件在部署的 `config.json`：

```jsonc
{
  "worlds": {
    "arknights": {
      "enabled": true,
      "commentary": true,
      "maxHistory": 50,
      "reminderPollSeconds": 30,
      "proactive": true,
      "nudgeMinutes": 3
    }
  }
}
```

## 工具

| 工具 | 用途 |
|---|---|
| `arknights_operator` | 查干员：星级、职业/分支、特性、满级属性、天赋、技能（七级与专精三） |
| `arknights_kb_search` | 查集成战略主题与通用思路 |
| `arknights_run_advice` | 按当前层数给建议 |
| `arknights_run_start` | 开一局（主题、分队、难度、目标结局） |
| `arknights_run_update` | 更新层数、资源、干员、收藏品、备注 |
| `arknights_run_end` | 结束一局并写入战绩 |
| `arknights_run_status` | 读当前局快照 |
| `arknights_run_history` | 读最近战绩与统计 |
| `arknights_remind` | 增加 / 列出 / 取消提醒 |
| `arknights_blackstream_map` | 黑流树海某一层的地图结构、关卡、常见地图模板 |
| `arknights_blackstream_pool` | 黑流树海藏品池，或反查某件藏品属于哪些池 |
| `arknights_blackstream_predict` | 按社区样本推测下一段可能出现的节点类型（给概率与样本量） |
| `arknights_blackstream_scan` | 截图拓扑 → 认地图：起点归一 `(0,0)`、忽略不连通的小地图、给出全部尽头与 BFS 步数；可带目标坐标 |
| `arknights_blackstream_distance` | 用刚识别的（或指定构造的）拓扑，算目标节点到起点的真实步数与路径 |
| `arknights_blackstream_end` | 不依赖截图，按层/构造查全部尽头、步数与路径 |
| `arknights_shop_advise` | 给商店候选排序：稀有度 + 所属池 + 当前生命/希望/源石锭，每条带理由 |

事件：`arknights.mounted`、`arknights.run_started`、`arknights.run_progress`、`arknights.run_ended`、`arknights.reminder`、`arknights.nudge`。

## 主动性

- **每报一步就给判断**：`arknights_run_update` 接受 `node`（商店、紧急作战、不期而遇……），回执和 `arknights.run_progress` 事件里直接带「这一层的节点构成 + 你当前节点该怎么处理 + 按你资源的提醒」，不需要你追问。
- **催更**：对局进行中，超过 `nudgeMinutes`（默认 3 分钟）没更新，推 `arknights.nudge`，内容是「已经 N 分钟没更新 + 这一层常见节点 + 下一步走哪边」。同一段空闲只催一次；`proactive: false` 可关。
- **商店**：走到商店时报一句候选，`arknights_shop_advise` 按稀有度、所属池、生命/希望/源石锭排序，每条给理由。

注意：对局进展仍靠你报一句「到哪了」；截图只用于认当前这张黑流树海地图，不会替你记账。

## 截图认地图 / 拓扑分析

1. 把黑流树海地图截图发给 Coo（当前模型要能看图）。
2. Coo 读出主地图上每个圆形节点（包括大图标之间的小点）的格子坐标和起点下标，调用 `arknights_blackstream_scan`。
3. 插件做四件事：
   - 起点归一成 `(0,0)`，坐标 `x` 向右、`y` 向下，一格一步；
   - 只保留与起点连通的节点，其余（例如最右边单独的一小段）按**特殊地图**忽略；
   - 和本机拓扑库逐套比对，认出第几层哪套构造，给出全部**险路尽头**；
   - 在构造的连线上跑 BFS，给出每个尽头/目标到起点的真实步数和路径，不用坐标差。
4. 追问「那个节点几步」时用 `arknights_blackstream_distance`，不必重发截图。

回执会带匹配度、拓扑小图和特殊地图说明。截图只截到一部分、或节点读漏时，插件会给候选并标明置信度，不会硬认。

## 黑流树海资料（个人使用导入）

数据来自 [路标档案馆](https://www.lubiao.wiki/tools/blackstream-route)，**不随包分发**：

```bash
corepack pnpm import:blackstream
# 等价于 node scripts/import-blackstream.mjs

corepack pnpm import:topologies
# 等价于 node scripts/import-topologies.mjs
```

`import:blackstream` 读取站点公开的 6 个数据文件（总档案、楼层、节点距离频次、地图模板频次、危险节点、关卡频次），
生成 `src/data/blackstream.local.json`。`import:topologies` 从站点当前的 Nuxt chunk 里抽主地图构造
（节点、连线、起点、尽头），生成 `src/data/blackstream-topology.local.json`。两个文件：

- 都已写进 `.gitignore`，不会进版本库；
- 都在 `package.json` 的 `files` 里被排除，`npm pack` 不会带上；
- 没有对应文件时，相关工具会明确回报「还没导入」，不会编数据。

导入后可查：6 层区域与关卡、70 个藏品池 / 450 件藏品、按层的节点构成、按距离的节点概率、常见地图模板；
以及 45 套主地图构造的完整拓扑（第 1–6 层），另导入 9 张树洞特殊图。截图识别和尽头/步数查询依赖后者。

**授权说明**：站点授权页写明个人身份分析、引用数据无需授权，但发布内容要注明来源；团队项目、程序、盈利项目需发邮件申请。
本包只做「你本机导入、自己用」，引用时请注明「数据来源：路标档案馆」。详见 `DATA-NOTICE.md`。

## 本地文件

只写部署数据目录下的三个文件，不碰别的：

- `arknights-run.json`：当前局
- `arknights-history.json`：已结束的战绩（按 `maxHistory` 截断）
- `arknights-reminders.json`：待触发的提醒

运行时零网络请求（导入脚本是开发期手动跑的，不在运行时）。

## 数据来源与许可

- 代码：MIT（见 `LICENSE`）。
- 干员数据：从 [PRTS wiki](https://prts.wiki/) 抓取并结构化，按站点许可以 **CC BY-SA 4.0** 提供（见 `DATA-NOTICE.md`）。
- 集成战略主题与思路：人工整理，非官方；数值与机制以游戏内为准。
- 黑流树海数据：来自路标档案馆，仅个人使用、本机导入、不随包分发。

重新生成干员数据（开发期，需要联网）：

```bash
corepack pnpm build:data                     # 全量，写 src/data/operators.json
node scripts/build-operators.mjs --limit 5   # 小样本，核对解析
```

改过工具、事件或环境提示词后重新生成 `describe.json`：

```bash
corepack pnpm build:describe
```

## 开发

```bash
corepack pnpm install
corepack pnpm typecheck
corepack pnpm test
```

在 Cortico 仓库根下还可以跑 `pnpm check:extension <本目录>` 校验声明。

## 已知边界

- 只做集成战略；数据模型里的 `mode` 字段已预留其他模式（卫戍协议等）。
- 集成战略通用资料只有主题与 12 条思路，分队/收藏品明细还没录；`src/data/is.json` 按同一结构补条目即可。
- 黑流树海的节点推测是社区样本统计（每层几千张地图），不是游戏内保底规则，回执里会写明样本量。
- **视觉识别在模型侧**：插件不跑 OCR/图像识别，也不会主动截屏；它接收 Coo 从截图读出的节点格子坐标，负责归一化、匹配、BFS。当前模型必须能看图；读漏节点、截图被裁掉一部分时，匹配度会下降，插件会标置信度而不是硬认。
- 匹配只认拓扑库里有的构造；站点新增地图后要重跑 `import:topologies`。不连通的小地图按特殊地图忽略，不会参与尽头/距离计算。
- 干员资料是抓取快照（见文件里的 `generatedAt`），新干员要重新跑 `build:data`。
