# 数据来源与许可

本包的**代码**以 MIT 许可发布（见 `LICENSE`）。以下**数据文件**单独授权，不适用 MIT：

- `src/data/operators.json`
- `src/data/is.json` 中的主题名称与来源链接
- `src/data/blackstream.local.json`（仅本机导入，不随包分发）
- `src/data/blackstream-topology.local.json`（仅本机导入，不随包分发）

## 干员数据（`src/data/operators.json`）

- 来源：[PRTS wiki](https://prts.wiki/)，通过其 MediaWiki API 读取干员页面的 wikitext，由
  `scripts/build-operators.mjs` 抽取结构化字段后生成。
- 抽取范围：干员名、内部 id、稀有度、职业、分支、位置、标签、特性、满级属性、天赋、技能。
  **不包含**剧情、档案、语音、立绘、模组文案。
- 许可：PRTS 的内容以其站点声明的「署名 + 相同方式共享」方式提供，本文件按
  [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) 发布。转载或再分发这份数据时，
  请保留本说明、署名 PRTS wiki 贡献者，并以相同方式共享。
- 每个干员条目带 `source` 字段，指向其 PRTS 页面。

## 游戏素材

《明日方舟》的名称、角色、技能与相关素材版权归上海鹰角网络科技有限公司及其关联方
（含 YOSTAR 等）所有。本包只收录文本性的数值与技能说明，用于个人游玩辅助；不包含任何
图片、音频或剧情文本。

## 集成战略资料（`src/data/is.json`）

主题名称与顺序为公开事实，条目中的「思路」部分为本项目自行撰写（MIT），并标注为民间整理、
非官方。具体数值、分队效果与结局条件以游戏内为准。

## 黑流树海资料（`src/data/blackstream.local.json`）

- 来源：[路标档案馆](https://www.lubiao.wiki/tools/blackstream-route)，由 `scripts/import-blackstream.mjs`
  读取站点公开的静态数据文件生成。
- **不随包分发**：该文件写进 `.gitignore`，并在 `package.json` 的 `files` 里排除；`npm pack` 不含它。
  没有导入时，相关工具回报「还没导入」。
- 站点授权页原文：个人身份分析、引用数据无需授权，但在发布的视频、图文、动态中请注明数据来源于
  路标档案馆；团队项目、程序、盈利项目需发邮件至 contact@mail.lubiao.wiki 申请。
- 本项目按「个人使用、本机导入、不再分发」使用这份数据。你如果要把它用于团队项目、对外发布的程序
  或盈利项目，请先按上面的邮箱申请授权。
- 引用时注明：数据来源「路标档案馆」。

## 主地图拓扑（`src/data/blackstream-topology.local.json`）

- 来源：[路标档案馆](https://www.lubiao.wiki/tools/blackstream-route)，由 `scripts/import-topologies.mjs`
  读取站点当前打包 chunk 里的地图构造数据（节点、连线、起点、尽头）生成。
- **不随包分发**：该文件写进 `.gitignore`，并在 `package.json` 的 `files` 里排除；`npm pack` 不含它。
  没有导入时，截图识别、尽头查询与步数查询会回报「还没导入」。
- 授权与引用要求同下面的「黑流树海资料」：个人使用、本机导入、不再分发；引用注明「路标档案馆」。
- 站点新增/调整地图后重新跑 `import:topologies` 更新；旧数据不会被包更新覆盖。

## 再生成

`build:data` 会联网访问 `prts.wiki`，只读干员页面，不带任何用户数据。生成结果写入
`src/data/operators.json`，请连同本说明一起分发。

`import:blackstream` 会联网访问 `lubiao.wiki` 的公开数据文件；`import:topologies` 会读取站点
公开的打包脚本。两者都只读、不带用户数据，结果只写本机。
