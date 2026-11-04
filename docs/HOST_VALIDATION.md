# Coopanion v0.2.17 宿主源码兼容验证

日期：2026-11-04。工作分支：`arena/13094e18-coopanion-suzuran`。

[机器可读的本轮结果](HOST_VALIDATION_RESULTS.json)记录了模块探针、逐包类型/测试结果、关键文件摘要与验证边界。

## 结论先行

**已验证对应官方版本的源码模块，不是已运行官方下载的桌面程序。**

- 十个扩展能够通过该宿主所用 Cortico 0.2.12 的 manifest、入口、定义、自描述和扩展加载器检查；八个浏览器面板的构建文件及声明的 CSS 能被加载器索引。
- 对该 SDK 的 18 组类型检查通过；扩展测试 **494 通过、6 跳过**。这里没有把仓库原先固定的 Cortico 0.2.8 当成新宿主 SDK。
- 发现并复现了两个先前模拟检查未覆盖的宿主能力差异：**官方没有图片气泡 HTTP 接口，也没有打开文件夹的自定义 IPC 处理器**。
- 已修正扩展端“IPC 发送成功就提前返回”的问题，恢复原有系统文件管理器路径。**这不等于已经证明真实 Windows 桌面会弹出窗口。**
- 图片气泡仍是可选宿主补丁能力；本次没有给官方源码、发布包或用户安装打补丁。原有独立窗口降级逻辑保留，真实显示待验收。

## 1. 实际检查了什么版本

| 项目 | 实际值 / 来源 |
| --- | --- |
| 官网 | <https://coo.palailab.org/> |
| 官方发布 | [v0.2.17](https://github.com/Pal-AI-Lab/Coopanion/releases/tag/v0.2.17)，发布元数据时间 `2026-11-01T00:50:34Z` |
| 宿主源码提交 | [`dbc06466edbe4d6328d61bbedaa4d9e312c16497`](https://github.com/Pal-AI-Lab/Coopanion/commit/dbc06466edbe4d6328d61bbedaa4d9e312c16497) |
| 该提交固定的 Cortico 子模块 | [`e77b6617a3c622c0f4fb09750ff9ceabf49439ac`](https://github.com/Pal-AI-Lab/Cortico/commit/e77b6617a3c622c0f4fb09750ff9ceabf49439ac)，声明版本 **0.2.12** |
| World 契约 | **API 6** |
| 内置桌宠包 | `cortico-world-desktop-pet` **0.2.0** |
| Electron 声明版本 | **44.4.4**，只读取清单，**未运行** |
| 本次模块执行环境 | Linux x64、Node **22.22.3**、工作区已冻结安装的依赖；包括 tsx 4.19.2、TypeScript 5.7.3、Vitest 2.1.9、ws 8.22.1 |

宿主和子模块分别从官方 codeload 下载。两个 tar 包的 PAX `comment` 均与上表提交号一致；宿主 Git tree 也明确固定了上述子模块 SHA。下载内容放在被忽略的 `.cache/host-validation/`，不作为本仓库源码或发布资产纳入 Git。

本次源码压缩包的本地 SHA256（**不是桌面发布包校验值**）：

```text
Coopanion 源码：1619e1ca788dd3a8d390ca751f953e012dea18813ed689663644429f59e48746
Cortico   源码：2dfe902058c5c68ff72b9121f01f770a8eb07782634a3c98686895a4c7bf86fb
```

**边界：**没有安装宿主的完整依赖树，模块探针借用当前工作区依赖；没有执行打包/staging 流程，也没有验证发布包是否与源码逐字对应。工作区开发基线继续固定 Cortico **0.2.8**，不因检查新宿主就盲目升级所有依赖。

## 2. 验证方法与结果

### 2.1 SDK / 加载层

1. 先注册指定宿主的 `vendor/cortico/src/extensions/runtime.ts`，并断言 `cortico/core/types.ts` 解析到该目录，而非根 `node_modules/cortico`。
2. 使用该 SDK 的 manifest 解析器、入口解析器、`isWorldDefinition`、自描述导出器与 `loadExtensions`。
3. 在独立临时扩展目录创建 `file:` 依赖和链接，执行真实加载器；不启动这些 World，不读取用户部署配置。
4. 用临时 TS `paths` 和 Vitest `resolve.alias` 将全部 `cortico/*` 导入指向指定 SDK；不改包的原有配置或锁文件。

| 扩展 | API / 入口 / 自描述 / loader | Node/Web 类型配置数 | Vitest 通过 | 跳过 |
| --- | --- | ---: | ---: | ---: |
| api-balance | 通过 | 2 | 16 | 0 |
| arknights | 通过 | 1 | 35 | 0 |
| coo-diary | 通过 | 2 | 66 | 0 |
| coo-draw | 通过 | 2 | 169 | 0 |
| coo-gen | 通过 | 2 | 61 | 0 |
| coo-mood | 通过 | 2 | 5 | 0 |
| coo-screen | 通过，仅定义/纯逻辑 | 1 | 19 | 6 |
| emote-pics | 通过 | 2 | 7 | 0 |
| pet-draw | 通过 | 2 | 86 | 0 |
| qq-final | 通过 | 2 | 30 | 0 |
| **合计** | **10 包** | **18** | **494** | **6** |

十份现有 `describe.json` 与 0.2.12 导出结果也一致。八个浏览器包构建后，真实加载器记录为 `webUi: served`；这是资源发现结果，**不是浏览器渲染或点击测试**。

- 临时链接模拟安装不等于执行 npm 安装。`coo-screen` 仍只支持 Windows，不能因其定义可加载就声称 Linux 支持截图。
- 加载定义不等于同时启用所有包；合并 `coo-draw` 仍不可与旧 `pet-draw` / `coo-gen` 同时启用。
- `--full` 会运行现有的隔离单元/契约测试，其中有假的 WorldHost 和模拟生命周期；不启动真实 QQ、模型、ComfyUI 或截屏侧车。

### 2.2 官方 PetServer 的真实 HTTP / WebSocket

直接导入官方 `packages/cortico-world-desktop-pet/src/server.ts`，用临时端口启动短时回环测试服务，并连接一个测试 WebSocket 客户端。没有修改绑定地址、Host/Origin 校验或开启桌面预览。

| 探针 | 观察结果 |
| --- | --- |
| WebSocket `role=pet` | 连接成功，`petConnected = true`；它是测试客户端，不是 Electron 窗口 |
| `GET /api/state` | **200** |
| `POST /api/prefs` | **200** |
| 带外部浏览器 Origin 的 `POST /api/prefs` | **421**，来源保护保留 |
| `POST /api/image-bubble` | **405** |

正向对照排除了“服务没启动/没有 pet 连接”的混淆；源码路由也没有 `/api/image-bubble` 分支。

### 2.3 官方 CoreHost 的真实进程 IPC

使用官方 `app/core-host.cjs` 的 `CoreHost`，让它 fork 一个**只发送固定测试消息的临时子进程**，而不是宿主真正的 `core/boot.ts`。

```text
companion:open-folder 到达父进程：true
子进程 process.send() 返回：true
CoreHost 转发 open-folder 事件次数：0
正向对照 companion:open 被转发：true
```

这验证了实际进程间传输与官方处理器行为，但**没有启动真实 Core / Electron / shell.openPath**。

## 3. 新发现、处理与剩余风险

### H01：官方版没有自定义图片气泡接口

**影响：**表情图及绘图扩展使用的 `/api/image-bubble` 无法在未修改的 v0.2.17 上实现“图片进入桌宠气泡栈”。不等于绘画工具整体不可用；相关调用遇到失败会走已有的独立窗口降级路径。

**本次处理：**保留降级，不擅自修改官方宿主。对仓库 `patch-pet-host.ps1` 做只读比对：

- `server.ts` 的路由、body 上限两个替换锚点匹配。
- `pet-app.js` 的消息分支、图片渲染、淡出三个替换锚点匹配。
- `pet.css` 存在。
- **五个内容锚点全部匹配，但没有执行 PowerShell、应用补丁、检查补丁后的完整编译或渲染。**不能把锚点匹配写成“补丁验收通过”。

后续需要时，先在真实安装的**副本**执行 dry-run，再由用户确认应用、备份和回滚；参见 [验收指南](ACCEPTANCE.md#6-可选桌宠图片气泡补丁)。整进程重启后再验图片、布局、跟随、过期关闭和断连降级。

### H02：IPC 传输成功被误当成“目录已打开”

**根因：**旧代码在 `process.send?.(...)` 返回 `true` 时立即返回。这个布尔值不是应用层确认；官方处理器忽略该自定义消息，系统命令因此永远没有机会执行。

旧 README / changelog 中的 `companion:open-folder` 支持属于作者本机 **0.2.13 的私有宿主补丁**，不能推广到官方发布版。

**已修改五处：**

- `coo-diary/src/world.ts`
- `coo-draw/src/api/world.ts`
- `coo-draw/src/local/world.ts`
- `pet-draw/src/world.ts`
- `coo-gen/src/world.ts`

不再发送未获能力确认的自定义 IPC 并据此早退；直接使用原有 Windows PowerShell COM / macOS `open` / Linux `xdg-open` 路径。API 绘图日志由 `opened folder` 改为 `folder open requested`，避免把发起请求描述成窗口已显示。同步更新日记说明和四个包的 Unreleased 记录；不改 World API、工具名或配置键。

**回归：**新增 15 项隔离测试，覆盖五处代码的三个平台分支。测试把 IPC 传输设为“可以成功”，同时拦截所有原生进程调用：修改前 **15/15 失败**，修改后 **15/15 通过**。Windows 分支还检查 PowerShell 单引号转义。这是函数/平台分支测试，**不是三种操作系统的真实桌面实测**。

**仍需实机确认：**系统命令是否真的显示窗口、Linux 是否有桌面与 `xdg-open`、Windows COM/桌面会话是否可用。失败时仍有“复制路径”；依赖旧私有宿主 `shell.openPath` 行为的部署也应重新验收，不能假定完全等价。

## 4. 可复现入口

新增 `scripts/check-host.mjs` 与根命令 `pnpm check:host`。默认只跑模块探针；`--full` 才追加 18 组类型检查和十包 Vitest。它不下载、不安装、不启动 Electron、不修改宿主，也不会替换原工作区 SDK。

先在仓库根准备工作区：

```sh
pnpm install --frozen-lockfile
pnpm build
```

可以将完整官方源码（含固定子模块）放在被忽略的目录中，例如下面的**独立源码副本**，不要切换本仓库工作分支：

```sh
git clone --depth 1 --branch v0.2.17 --recurse-submodules --shallow-submodules https://github.com/Pal-AI-Lab/Coopanion.git .cache/host-source-v0.2.17
git -C .cache/host-source-v0.2.17 rev-parse HEAD
git -C .cache/host-source-v0.2.17/vendor/cortico rev-parse HEAD
```

两个 SHA 应分别与本报告第一节一致。如果目录已经存在，不要重复 clone 或覆盖自己的副本。本次实际使用的是 codeload 压缩包，以上 Git 命令是复现方法，不是声称本次执行过 clone。

```sh
pnpm check:host --host-root .cache/host-source-v0.2.17 --full --report .cache/host-v0.2.17-report.json
```

- `--host-root` 必须显式指定 **源码树**，不是安装器、`.asar` 或运行中的数据目录。
- Node 必须支持该版 CoreHost 使用的 `--use-env-proxy` / `--use-system-ca`；本次使用 22.22.3。
- 类型和测试覆盖配置生成在临时 `.cache/host-check-*`，执行后清理；原包配置不改。
- `--report` 只允许新 JSON 文件，拒绝覆盖已有文件，也拒绝写入宿主源码树；重跑请换输出名。
- `--full` 强制关闭真实截屏集成测试开关；原生截图要按人工验收步骤单独授权。
- 退出码 0 表示**探针及请求的检查完成**；能力差异放在 JSON 和终端 `LIMIT` 中，不等于完整宿主功能已通过。错误的 SDK 解析、入口、元数据、类型或测试会退出 1。
- 没有把它塞进默认 `validate` / CI，因为默认验证不应下载或依赖一个外部宿主。

新增六项探针工具自测，验证显式目录、拒绝应用开关、报告输出保护、SDK 覆盖配置和禁止自动抓屏。

### 本轮修改后的最终复核

两条完整命令均在本轮修改后实际执行，退出码都为 **0**：

| 最终复核 | 实际结果 |
| --- | --- |
| `pnpm validate`，原工作区 SDK 0.2.8 | **494 个 Vitest + 31 个脚本测试通过 = 525 通过**；6 个原生截屏 + 2 个 Windows PowerShell 夹具跳过 = **8 跳过** |
| `pnpm check:host --host-root <上述源码> --full --report <新文件>` | 指定 SDK 0.2.12；10 包加载/元数据检查、18 组类型检查、**62 文件 / 494 测试通过、6 跳过**；8 个面板资源可索引 |
| 根验证的其它阶段 | 十包类型、八包构建、25 组镜像、十包元数据、心情 smoke、4 个局部扩展检查与 2 个 manifest 检查通过 |
| 新增回归 | 15 个打开目录分支测试 + 6 个探针保护测试通过，已包含在上面的 31 个脚本测试中 |
| Python | 3 个侧车通过 AST 解析，未执行侧车 |
| 仓库检查 | 405 个源/文档文件，策略错误 0；工作区及暂存区 `git diff --check` 通过 |
| 官方源码保持原样 | 与原始压缩包逐文件核对：宿主 **1,413** 个、Cortico **1,189** 个原始文件均未更改 |

两组 Vitest 结果是同一批测试在两个 SDK 下的复核，**不能相加冒充新增覆盖**。源码宿主探针成功结束仍然保留 H01/H02 的能力差异提示；没有因此声称桌面端完整通过。远端 CI 未运行，也没有提交、推送或发布。

## 5. 发布包与真实部署：还没有验证

`gh release download` 访问发布附件时重定向到 `release-assets.githubusercontent.com`，在当前网络环境返回 EOF；因此没有取得安装包或 `SHA256SUMS.txt`。本次没有尝试把官网内嵌的 AI 安装提示当作用户命令运行。

发布 API 给出的两个可供后续上传的官方文件如下。**这些是发布元数据中的摘要，不是已下载文件的实测校验。**

| 文件 | 大小（字节） | 发布元数据 SHA256 |
| --- | ---: | --- |
| `Coopanion-0.2.17-linux-x64.deb` | 142,040,168 | `4474edbace8309c786d307756926000a1227029ef806650198f4e7ea3af46615` |
| `Coopanion-0.2.17-win-x64-portable.zip` | 230,696,198 | `4c765087664d0a1e88ca2ea3ef879e2e01b83c1145930e9dfb11ca25dea48bcd` |

下载位置：[官方 v0.2.17 发布页](https://github.com/Pal-AI-Lab/Coopanion/releases/tag/v0.2.17)。

若继续做**发布包级别**验证，可以上传 Linux `.deb`，或 Windows 便携版中的 `resources/app.asar` / `resources/app` 压缩包。完整便携 ZIP 也可以，但体积更大。不要附带真实 `.env`、token、聊天/日记记录或部署数据。若实际使用的版本不同，需按该版本重新对照，不能把 v0.2.17 的结果直接套用。

即使拿到包，当前 Linux 沙箱也没有可用桌面显示环境；以下仍需用户测试机或专门的交互桌面 CI：

- Electron 完整启动、扩展面板点击与保存、图片窗口及气泡实际显示。
- Windows 文件管理器、截图/热键、DPI、多显示器。
- NapCat 实际账号连接、QQ 发图/语音、ASR/TTS 音频设备。
- ComfyUI、模型、LoRA、GPU，以及经用户授权的真实/付费请求。

本轮没有更改真实部署、推送分支、创建 PR、发布版本或修改远端 main。
