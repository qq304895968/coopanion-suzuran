# 本地移植与验证统一交接手册（给用户 / dsh）

版本：2026-11-04 / v1。成果分支：`arena/13094e18-coopanion-suzuran`。

**用途：把当前已经实现的成果迁到本地，不再重做代码审查或凭描述重新实现。** 本手册整合修改定位、取代码、保留数据、验证、接入宿主和回滚。默认先做代码级迁移；真实部署操作另设确认门槛。

阅读约定：dsh 先读 **§0—§2**，随后按路径只读当前步骤；无冲突无需展开 §4 的源码细节。旧报告只作证据，不必全部送入上下文。本文不假设 dsh 有任何专用 CLI。

**省 token 的交接方式：文件保存在本地，只把 §0 短指令和文件路径发给 dsh，不要把全文及历史聊天反复粘贴。** 它可先用 `Select-String -Path docs/LOCAL_MIGRATION.md -Pattern '^## '`（或 `rg -n '^## ' docs/LOCAL_MIGRATION.md`）取得章节行号，再按当前阶段分段读取。

## 0. 可直接复制给 dsh 的短指令

```text
任务：按 docs/LOCAL_MIGRATION.md 移植并验证已经实现的当前分支成果，不重新审查全仓，不重写现有修复。
1. 先读本手册 §1—§2，确认拿到完整工作区快照或已确认包含成果的提交。初稿记录的 HEAD 784b9e9 不是修复提交；若远端分支已含本手册及完整源码，直接使用该成果提交，不再索取旧快照。
2. 默认走 §3A：新目录验证，保留旧 F:\study\coopanion。不要覆盖用户的未提交改动、部署配置、密钥、人格、日记、图片、模型、存档或 .git。
3. 源码以交接快照为准；本地有额外修改才走 §3B，按 §4 对应文件组移植。不要仅根据文字重新写一套实现。冲突只报告相关文件和最小问题。
4. 按 §5 使用 Node 22.22.3、pnpm 11.28.6、冻结锁安装并运行 validate、Python AST 检查。开发 SDK 仍为 Cortico 0.2.8，不升级到 0.2.12 来凑通过。
5. 需要宿主源码检查才做 §6；真正切换部署、启用 World、打补丁、连接 QQ、截图、出图或启动模型前，按 §7 取得确认。
6. 不执行 git reset --hard、git clean、强推、无关历史合并或目录镜像删除；不打印 .env/token/完整部署配置；不因测试失败关闭 strict、删测试或改预期结果。
7. 失败只读取对应文件、测试和日志末尾约 80 行。先定点测试，修完再全量一次；不扫描 node_modules/.cache/大图片/离线数据正文，不重复读历史聊天。
8. 维护 §10 的短状态记录，每阶段记来源、备份、改动文件、命令退出码、下一步。525/8 是已有 Linux 基线，不是本机已通过；跳过与未执行必须单列。
默认允许范围：隔离的新源码目录、依赖安装/构建/检查。生产部署变更、全局软件安装、Git 发布和付费/外发行为均非默认授权。
```

**最短主线：**取得完整成果 → 新目录放源码 → 确认 Git / 工具环境 → `install --frozen-lockfile` → `validate` → Python AST → 输出结果。只有需要真实运行时，才继续宿主接入。

## 1. 不需要重新分析的事实

### 1.1 成果与 Git 状态必须分开

初稿编写时，本会话分支为上述固定名称，HEAD 是 `784b9e9`，大量成果尚未提交；这是历史状态，不是固定的交付提交号。

**后续用户已要求提交并推送完整成果。** 本次交付沿用固定分支，并保留远端原始上传提交 `ebd11017ec7836e608182660b5ee49fbf3862649` 的历史；不强推、不修改 main。最终可获取性以远端分支为准：按 §2 查询并核对完整文件，若已包含本手册及完整源码，就直接使用该提交。旧报告中的“未推送”描述对应各自的验证轮次，不能据此否定后续提交。

因此：

- 在仍未提交或停留于旧初始 HEAD 的副本中，`git archive HEAD`、普通 `git diff` 或远端旧 ZIP **可能只得到初始 README / 极少数改动，遗漏未跟踪源码**；不要把旧副本当成果。
- 需要的是**包含当前工作区文件的完整源码快照**，或随后经用户确认提交、推送并核对过的成果提交。
- 旧报告记录过一次 `1751a7d…` 本地历史合并；它不是当前交接基准，不能据此重新合并无关历史或 cherry-pick。
- 没拿到完整源码时，dsh 应明确请求源码，不根据本手册猜写几百个文件。
- 不擅自发布本仓库。若之后授权推送，只使用 `arena/13094e18-coopanion-suzuran`，不改分支名、不强推、不修改远端 main。

### 1.2 固定版本与已验证范围

| 项目 | 交接值 |
| --- | --- |
| 工作区 | 8 个独立 World 扩展；不是完整桌面应用，没有根 `npm start` |
| Node | 清单最低 ≥22.15；**复现统一用 22.22.3**，宿主探针还需要该 Node 的代理/CA 参数 |
| pnpm / TS / Vitest | **11.28.6 / 5.7.3 / 2.1.9** |
| 开发 SDK / Node 类型 / tsx | **Cortico 0.2.8 / @types/node 22.19.0 / tsx 4.19.2** |
| 锁文件 | 根 `pnpm-lock.yaml`，必须和根及八包清单一起同步 |
| 宿主源码检查对象 | Coopanion **0.2.17**，固定 Cortico **0.2.12**，World **API 6** |
| 最近整仓 Linux 结果 | **525 通过、8 跳过**：494 个 Vitest + 31 个脚本测试；另有类型、构建、smoke 等 |
| 宿主 SDK 复核 | 八包加载/自描述、18 组类型检查；同一批 **494 通过、6 跳过**；8 个面板资源可索引 |

本手册编写是文档交接，不是又一次本机实测。上表是已有记录，dsh 必须重新记录本机结果。不要把两个 SDK 下的同一批测试相加，也不要按旧报告的“源文件数”判断成功。

**两个宿主差异已查明，不必反复猜测：**

1. 官方 v0.2.17 被测源码没有 `POST /api/image-bubble`，真实 PetServer 探针返回 **405**；正常接口 200、外部 Origin 写请求 421。独立窗口降级保留。补丁五个内容锚点匹配，但没有应用或验证渲染。
2. 官方 CoreHost 不处理 `companion:open-folder`；真实 IPC 已复现“消息到达、`process.send()` 返回 true、处理器未转发”。五处扩展已改走原有系统命令。**发起命令不等于窗口已经显示。**旧 0.2.13 的主进程支持是私有补丁，不是官方承诺。

没有取得官方发布安装包，没有跑通 Electron 桌面、Windows 原生截图、真实 QQ/语音/GPU；远端 CI 也未运行。不得把这些写成已通过。

## 2. 只收集必要输入，禁止猜部署路径

先完成代码级检查；部署路径未知时，不必一开始卡住全部工作。

| 变量 | 含义 / 约束 |
| --- | --- |
| `OldCodeRoot` | 用户原代码，已知示例 `F:\study\coopanion`；先确认真实存在，不默认覆盖 |
| `SourceRoot` | 拿到的完整当前成果源码；原地移植时作为只读参考，不能与旧代码混成一份 |
| `CodeRoot` | 本次验证的目标源码；推荐独立兄弟目录，如 `F:\study\coopanion-verified`，可直接是新解压/clone 的源码目录 |
| `BackupRoot` | 外部私密备份目录，不能放在任一源码或被备份目录内部；不得上传/纳入 Git |
| `BotDir` | **实际含部署 `config.json` 的目录**；不一定等于宿主安装根或 `CORTICO_HOME` |
| `ExtensionsDir` | 宿主实际读取的扩展工作区，含自己的 `package.json` 和 `node_modules`；不是源码根 |
| `HostSourceRoot` | 可选：官方源码树，含固定 `vendor/cortico`；仅供 `check:host` |
| `PetPackageRoot` | 可选：实际宿主/测试副本中的 `cortico-world-desktop-pet` 包目录；仅供图片气泡补丁 |

另记：本机宿主版本、当前启用的绘图方案、扩展安装方式（本地链接/复制安装/包管理器）、是否有 0.2.13 私有宿主补丁。只记录路径、版本和布尔状态，不把密钥/完整配置写入交接记录。

### 2.1 拿源码：两条互斥路径

**路径一：工作区快照（远端尚未包含成果时使用）。**导出必须包含未跟踪文件及点文件，保留源素材/离线数据；不带 `.git`、依赖、构建、缓存、真实部署数据或密钥。至少应有：

- 根 `package.json`、`pnpm-lock.yaml`、`pnpm-workspace.yaml`、`.npmrc`、`.gitignore`、`.gitattributes`；
- §4.1 的八个包，含清单、源码、测试、脚本、`describe.json` 和必要素材；
- `scripts/`、`patch-pet-host.ps1`、`.github/workflows/validate.yml`、本手册与现有报告。

仅有文档、一个补丁片段或 `README.md` 不是完整成果。记录快照来源/日期；如有压缩包，用 `Get-FileHash -Algorithm SHA256` 记录摘要，摘要不能替代来源确认。

**路径二：分支已经由用户确认发布。**先查远端，不默认存在：

```powershell
$ErrorActionPreference = 'Stop'
if (-not $CodeRoot -or (Test-Path -LiteralPath $CodeRoot)) { throw '先指定不存在的新 CodeRoot' }
$Branch = 'arena/13094e18-coopanion-suzuran'
$Repo = 'https://github.com/qq304895968/coopanion-suzuran.git'
$Ref = git ls-remote --heads $Repo "refs/heads/$Branch"
if ($LASTEXITCODE -ne 0) { throw '无法查询远端；先处理连接，不索取或粘贴 token' }
if (-not $Ref) { throw '成果分支尚不可获取；使用完整工作区快照，不改拉旧 main' }
# 仅当用户确认该提交包含成果，且 CodeRoot 是不存在的新目录时：
git clone --depth 1 --branch $Branch --single-branch $Repo "$CodeRoot"
if ($LASTEXITCODE -ne 0) { throw 'clone 失败，停止' }
git -C "$CodeRoot" log -1 --oneline
```

核对实际提交及上述文件是否齐全；分支存在不证明包含所有工作区修改。不要借此切换或覆盖旧本地仓库。

## 3. 移植方式与数据保护

### 3A. 推荐：旁路新目录，旧代码不动

1. 将完整源码直接解压/clone 到新的 `CodeRoot`；已有独立完整目录可以直接作为 `CodeRoot`。
2. 不复制 Windows/Linux 之间的 `node_modules`，不复制旧 `dist`。在新目录用根锁重新安装/构建。
3. 不把旧目录整包反向覆盖到新目录。用户额外源码修改按 §3B 单独合入；额外数据按下表保留原路径。
4. 验证通过前，**宿主扩展链接仍指旧目录**；源码准备不需要启动宿主。

如果需要从一个工作区目录复制到新目录，下面仅用于**新目标**，不是覆盖旧目录的通用命令：

```powershell
# 先填 SourceRoot / CodeRoot。目标必须不存在；不要把备份放进这两个目录。
$ErrorActionPreference = 'Stop'
if (-not $SourceRoot -or -not $CodeRoot) { throw '先指定完整来源和新目标目录' }
if (-not (Test-Path -LiteralPath "$SourceRoot\pnpm-workspace.yaml")) { throw '来源不完整' }
if (Test-Path -LiteralPath $CodeRoot) { throw '目标已存在；不要批量覆盖，改用完整现成副本或 §3B' }
$Exclude = @('/E','/XJ','/R:1','/W:1',
  '/XD','.git','node_modules','.pnpm-store','.npm','dist','build','out','coverage','.cache','.tmp','.tmp-*','.preview','__pycache__','.venv','venv','.vite',
  '/XF','.git','.env','.env.*','*.local.*','*.pem','*.key','*.p12','*.pfx','reverse-token.txt','*.log','*.bak-*','*.pyc','*.pyo')
# 预览，核对来源和目标；/L 不实际复制。
robocopy.exe $SourceRoot $CodeRoot @Exclude /L
if ($LASTEXITCODE -ge 8) { throw '复制预览失败' }
# 仅在计划无误后执行同一复制；没有 /MIR、/PURGE 或 /MOVE。
robocopy.exe $SourceRoot $CodeRoot @Exclude
if ($LASTEXITCODE -ge 8) { throw '复制失败，停止验证' }
```

Robocopy 的 0—7 属于非失败状态，不能按“非零即失败”套用。此复制只适用于已经整理好的源码，不能拿宿主数据根当 `SourceRoot`；`/XJ` 不复制 junction 所指内容。若源码含无密钥的 `.env.example` / `.env.template`，可核对后单独补入模板，不复制真实 `.env`。

**快照没有 `.git` 的特殊情况：**`check:repo` 使用 Git 列出源码，解压包需要在新副本建立 Git 环境。只在已确认的旁路 `CodeRoot`、且没有自己的 `.git` 时运行：

```powershell
$ErrorActionPreference = 'Stop'
if (-not $CodeRoot -or -not (Test-Path -LiteralPath "$CodeRoot\pnpm-workspace.yaml")) { throw '先确认新源码副本路径' }
Set-Location -LiteralPath $CodeRoot
if (-not (Test-Path -LiteralPath '.git')) {
  git init -b arena/13094e18-coopanion-suzuran
  if ($LASTEXITCODE -ne 0) { throw 'Git 初始化失败' }
}
git branch --show-current
node scripts/check-repository.mjs
if ($LASTEXITCODE -ne 0) { throw '源码/工具链结构不完整，先修复再安装' }
```

不需要提交即可检查未跟踪源码；新副本没有 HEAD 是正常的。这个初始化**不恢复上传历史，也不证明远端已有此成果**。不要重新初始化旧仓库或改名已有分支。

### 3B. 只有本地存在额外源码修改时才原地合入

- 先在仓库外备份旧源码（包括未跟踪/用户自改文件），记录 `git status --short` 和现有暂存状态；若宿主通过链接读取旧代码，修改前先停止宿主。
- 参考快照保持只读，按 §4 的文件组比较。优先看路径和 diff 统计，只有冲突才读函数正文，例如：
  `git diff --no-index --stat -- "<旧目录>/qq-final/src" "<参考目录>/qq-final/src"`。此命令退出 1 通常只是“有差异”，不是执行故障。
- 根工具链、八包清单/配置与根锁作为一组同步；QQ World 和抽出的模块作为一组同步；不要只复制 `world.ts`。
- 共同基线可靠时做三方合并；没有基线时逐个冲突文件确认，不用“强行覆盖”或无关历史合并冒充三方合并。
- 绘图镜像已清空（旧 `pet-draw` / `coo-gen` 已删除），绘图只有 `coo-draw` 一个来源，不再需要合并镜像。
- 本地额外的包、私有 provider / Bot / 人格扩展不删除。推荐保留旧目录、使用干净八包工作区；纳入新工作区属于额外改动，需另行更新清单/锁/检查。
- 冲突解决后先做对应定点检查，再跑全量。新行为超过 §4 范围时标明“本地额外修改”，不要宣称和已验证快照完全相同。

### 3.1 必须保留的内容：代码路径变了不等于数据也应搬走

| 内容 | 操作规则 |
| --- | --- |
| 部署 `config.json`、密钥库、`.env`、QQ `reverse-token.txt` | 外部私密备份；不覆盖、不打印、不提交，不重新随机生成 token |
| 人格 / 提示词覆盖、`workspace/CONSTITUTION.md` | 保留部署覆盖，不把私人提示词自动复制进源码/自描述 |
| 日记、心情状态、绘画索引/配额/评分、截图记忆、工作流/LoRA 设置 | 保留存储根与 World id；先备份，不运行“重置数据” |
| QQ 用户图片与资料 | 重点核对 `worlds.qqbot.emojiDir`、`imageDir`、`extraImageDirs`、`fileDir`、`vision.videoDir`；相对路径会随源码链接位置变化 |
| 表情图、参考图、ComfyUI 模型/LoRA、启动脚本、ffmpeg/语音模型 | 保留实际路径，不从示例磁盘路径推断，不复制大模型来凑测试 |
| Arknights 离线资料、仓库原始图片、工作流模板 | 属于源码/必要资产，不是可批量删除的缓存；无需让 dsh 阅读二进制或大 JSON 正文 |
| `.git`、原分支、用户未提交改动 | 不覆盖、不移动、不删除，不使用 `reset --hard` / `clean` / 自动 stash |

**旁路迁移特别检查：**QQ 默认 `emoji` / `images` / `files` / `videos` 可相对于扩展目录。链接到新源码后，它们可能指向新空目录。先列出实际路径；经用户确认，可将配置固定到原数据的绝对路径，或单独迁移已备份的用户数据。不要为了省事把旧包目录整体覆盖到新包，也不要把用户素材当源码自动上传。

### 3.2 仅旧仓库报缓存/锁污染时：按清单清理索引

A 路径的干净快照一般不用本节。`.gitignore` 不会自动取消已经跟踪的文件；另一方面，单独 `git rm --cached` 也不会让未忽略的旧子包锁消失。

先同步成果中的 `.gitignore` 和 `scripts/check-repository.mjs`。随后在**已备份的旧源码仓库根**生成待取消跟踪清单，不修改索引：

```powershell
@'
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { forbiddenPath } from './scripts/check-repository.mjs';
const paths = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const bad = paths.filter(path => forbiddenPath(path));
mkdirSync('.cache', { recursive: true });
writeFileSync('.cache/untrack-paths.nul', bad.map(path => `:(literal)${path}\0`).join(''));
console.log(JSON.stringify({ count: bad.length, sample: bad.slice(0, 12) }, null, 2));
'@ | node --input-type=module
if ($LASTEXITCODE -ne 0) { throw '清单生成失败' }
```

确认清单、且没有未处理的用户暂存冲突后，才执行：

```powershell
if ((Get-Item -LiteralPath '.cache/untrack-paths.nul').Length -gt 0) {
  git rm --cached --pathspec-from-file=.cache/untrack-paths.nul --pathspec-file-nul
  if ($LASTEXITCODE -ne 0) { throw '索引操作失败；不要追加 -f 强行覆盖暂存变更' }
}
```

这只取消选中文件的跟踪，不删磁盘内容。按 §4.1 的**十个源码包**逐个核对旧 `pnpm-lock.yaml` / `pnpm-workspace.yaml` / `package-lock.json` / `yarn.lock`；与成果不符的旧子包工具配置应先移到外部备份，根只保留统一锁/工作区文件。根级 npm/yarn 竞争锁也需同样处理。不要递归清理 `ExtensionsDir` 或宿主自己的锁，它们是另一个工作区。

不执行 `git rm --cached .`，不删除所有 JSON/图片/模型，不重写历史。历史中若有真实密钥，取消跟踪不等于清除泄漏，需要单独轮换与审计。

## 4. 修改定位表：按文件组同步，不再设计实现

本节是**移植/冲突定位索引**，不是针对任意旧版本的可直接应用 diff；完整成果必须来自 §2。通配符表示同步范围，不能据此删除本地额外文件。

### 4.1 目录、真实包名、配置键

| 源码目录 | `package.json.name` | 配置节 | 面板产物（包内） |
| --- | --- | --- | --- |
| api-balance | cortico-world-api-balance | `worlds.api-balance` | `dist/webui.js` |
| arknights | cortico-world-arknights | `worlds.arknights` | 无 |
| coo-diary | cortico-world-coo-diary | `worlds.diary` | `dist/webui.js` |
| coo-draw | cortico-world-coo-draw | `worlds.draw` | `dist/webui.js`、`dist/webui.css` |
| coo-mood | cortico-world-coo-mood | `worlds.mood` | `dist/webui.js` |
| coo-screen | cortico-world-coo-screen | `worlds.screen` | 无；Windows 限定 |
| emote-pics | cortico-world-emote-pics | `worlds.emote-pics` | `dist/webui-20261029-3.js`、同名 `.css` |
| qq-final | **cortico-world-qq-local** | **`worlds.qqbot`** | `dist/console.js`、`dist/console.css` |

QQ 旧 README 仍有上游 `qq-final` / `qq-better` 的历史称呼；本次安装/过滤应以实际 manifest 为准。不要误装同名上游包，也不要把配置键改成目录名。所有包仍为 World API 6，版本未作为新发行版发布。

### 4.2 已落地修改与必须保留的行为

| 编号 | 同步 / 查看位置 | 已实现内容；移植时不可退化 |
| --- | --- | --- |
| M01 工具链 | 根 `package.json`、`pnpm-lock.yaml`、`pnpm-workspace.yaml`、`.npmrc`、`.gitignore`、`.gitattributes` | 私有八包工作区、固定版本、hoisted 布局、统一锁；源码素材保留，依赖/构建/缓存不入 Git |
| M02 包配置 | 八包 `package.json`、`tsconfig*.json`、`vitest.config.ts`；各包已有 `scripts/` | Node/Web 类型检查与测试入口一致；不要回退成每包随意装最新 SDK，或删 Windows `os` 限制 |
| M03 仓库检查 | `scripts/check-repository.mjs`、`check-metadata.mjs`、`check-python.py`、`.github/workflows/validate.yml` | 校验源码政策/资源/固定工具链/自描述；Python 仅 AST；CI 配置不等于已在远端通过 |
| M04 QQ 拆分 | `qq-final/src/sender.ts`、`admin-tools.ts`、`console/declaration.ts` 与 `world.ts` | 发送队列、群管工具、面板声明已抽出；一起同步。保持日语语音→中文正文→下一条消息、失败恢复、去重/限速/权限保护，不继续为减行数大改 World |
| M05 QQ 脱敏 | `qq-final/src/logging.ts`、`driver.ts`；`tests/driver.test.ts` | URL 日志不带 userinfo/query/hash，错误遮罩已知 token 及编码形式；连接鉴权逻辑保留，异常传播也不能漏密钥 |
| M06 QQ 类型/运行时 | `qq-final/src/config.ts`、`types.ts`、`normalize.ts`、`proactive.ts`、`qzone.ts`、`sticker.ts`、`world.ts`、`console/client.ts`；`tests/contracts.test.ts` 等 | 默认子配置独立深拷贝、规范化时保留热更新引用；主动发话首轮状态修正、空间 notice 优先分流、提醒失败为 ToolOutcome；处理 SDK 类型/空 driver/可选 `isPaused()`，Uint8Array 转 Buffer 后再检测签名；不关闭 strict |
| M07 QQ 构建 | `qq-final/scripts/build-webui.mjs`、`src/console/client.ts`、`src/console/style.css` | CSS 恢复为源码并导入，按 manifest 输出 JS/CSS；不复制旧 dist，不改公开资源 URL 来掩盖构建缺失 |
| M08 日记 | `coo-diary/src/store.ts`、`tests/store.test.ts`、`tests/world.test.ts` | 先筛真实日期/普通文件并降序排序，再限制读取 400 候选；日历日期按 UTC 算星期，不重复跨时区；测试固定时区，保留追加写与路径/大小保护 |
| M09 余额 | `api-balance/src/balance.ts`、`src/webui/client.ts`、`tests/`、文档/自描述 | 负金额为 `-$1,234.50`；保留更严格的密钥全值脱敏，修测试错误假设；浏览器 SDK 类型对齐 |
| M10 表情图 | `emote-pics/scripts/build-webui.mjs`、清单/TS/Vitest 配置、`tests/` | 补齐原来缺失的构建与 7 项概率/冷却/强制/格式大小/来源测试；不是重写表情行为，不改带日期的产物名 |
| M11 绘图镜像 | `scripts/drawing-mirrors.json`、`sync-drawing.mjs` | 清单为空：旧 `pet-draw` / `coo-gen` 已删除，`coo-draw/src/api/`、`src/local/` 是唯一实现，不建立运行时跨包相对导入 |
| M12 预览脚本 | `coo-draw/scripts/preview-options.ts`、`persona-samples.ts`、`reference-img2img.ts`；对应预览测试 | 显式配置/输出路径，默认只计划；`--run` 才生成，默认 `.preview`；不重新写死作者磁盘 |
| M13 心情安装 | `coo-mood/scripts/install-into-coopanion.mjs`、`scripts/tests/install-mood.test.mjs` | 显式 `--home/--extensions`，默认 dry-run；冲突拒绝、先备份、失败回滚。原有原子存储不改。不是通用升级器 |
| M14 宿主补丁 | `patch-pet-host.ps1`、`scripts/tests/patch-host.test.mjs` | 显式 `-HostRoot`，`-Apply` 才应用；先验证全计划，精确幂等标记、备份/回滚。源码锚点匹配不是渲染验收 |
| M15 自描述 | 八包 manifest 所指 `describe.json`、根 `check-metadata.mjs` | 补齐余额文档/描述，刷新 coo-mood、emote-pics、QQ 的过期描述；变化后用导出器生成，不手写 JSON 掩盖差异 |
| M16 原生测试隔离 | `coo-screen/tests/`、`scripts/check-python.py`、CI 环境 | 6 项截屏集成需 Windows + 显式 `COOPANION_SCREEN_INTEGRATION=1`；普通验证不抓屏、不启动侧车 |
| M17 目录 IPC 修正 | `coo-diary/src/world.ts`、`coo-draw/src/api/world.ts`、`coo-draw/src/local/world.ts` | 三处不再因 `process.send()` true 跳过系统命令；保留 Windows COM / macOS open / Linux xdg-open；API 绘图日志是 `folder open requested`，不冒充窗口已显示 |
| M18 新兼容回归 | `scripts/tests/folder-compat.test.mjs`、相关包 CHANGELOG / 日记 README | 函数分支测试覆盖三处×三平台（删除旧绘图包前是五处、15 项），模拟 IPC 成功但仍要求原生调用；不是三平台桌面实测，不能删它恢复旧私有 IPC 判断 |
| M19 宿主探针 | `scripts/check-host.mjs`、`scripts/tests/host-check.test.mjs`、`docs/HOST_VALIDATION*` | 指定实际宿主 SDK，临时安装链接、真实源码 HTTP/IPC 探针；6 项工具保护测试；`--full` 才加类型/测试，不启动真实 Core/桌面 |

源码/测试不要遗漏的耦合关系：M04—M07 一起处理 QQ；M01—M03 与所有包清单一起处理；M11 不包含 World 文件，**不能代替 M17**。日记/余额/QQ 的保护逻辑与对应回归测试一起迁。

绘图共享模块的登记表 `scripts/drawing-mirrors.json` 现在是空数组：合并前登记的 25 个基名（API 9 个、本地 16 个）全部只在 `coo-draw/src/api/` 与 `coo-draw/src/local/` 里维护一次。

## 5. 代码级验证：先做，不需要部署路径

### 5.1 Windows 前置检查

推荐在 PowerShell 7 中执行。**`pwsh` 必须在 PATH**：Windows 上两个宿主补丁夹具测试实际调用它，只有 `powershell.exe` 不够。

```powershell
$ErrorActionPreference = 'Stop'
if (-not $CodeRoot -or -not (Test-Path -LiteralPath "$CodeRoot\pnpm-workspace.yaml")) { throw '先确认待验证源码路径' }
Set-Location -LiteralPath $CodeRoot
Get-Command node, npm.cmd, git, pwsh, python -ErrorAction Stop | Select-Object Name, Source
node --version
if ($LASTEXITCODE -ne 0) { throw 'Node 不可用' }
python --version
if ($LASTEXITCODE -ne 0) { throw 'Python 不可用' }
pwsh -NoProfile -Command '$PSVersionTable.PSVersion.ToString()'
if ($LASTEXITCODE -ne 0) { throw 'PowerShell 7 不可用' }

# 避免依赖全局 pnpm；Windows 外部命令必须显式检查 LASTEXITCODE。
function Invoke-Pnpm {
  & npm.cmd exec --yes --package=pnpm@11.28.6 -- pnpm @args
  if ($LASTEXITCODE -ne 0) { throw "pnpm 失败，退出码 $LASTEXITCODE；停止后续阶段" }
}
Invoke-Pnpm --version
```

核对 Node 为 22.22.3、pnpm 为 11.28.6。Python 推荐 3.11；若仅有 Windows `py` 启动器，可把本节 Python 命令明确换成 `py -3.11 ...`。缺全局工具先报告并确认安装，不自动修改系统执行策略或关闭安全软件。

### 5.2 一次完整验证

```powershell
$PreviousCapture = $env:COOPANION_SCREEN_INTEGRATION
try {
  $env:COOPANION_SCREEN_INTEGRATION = '0'
  Invoke-Pnpm install --frozen-lockfile
  Invoke-Pnpm validate
  python scripts/check-python.py
  if ($LASTEXITCODE -ne 0) { throw 'Python AST 检查失败' }
  git diff --check
  if ($LASTEXITCODE -ne 0) { throw '工作区补丁格式检查失败' }
  git diff --cached --check
  if ($LASTEXITCODE -ne 0) { throw '暂存区补丁格式检查失败' }
} finally {
  if ($null -eq $PreviousCapture) { Remove-Item Env:COOPANION_SCREEN_INTEGRATION -ErrorAction SilentlyContinue }
  else { $env:COOPANION_SCREEN_INTEGRATION = $PreviousCapture }
}
```

`install` 可能访问 npm registry，并执行工作区批准的依赖构建；这不是离线安装。**不要**用非冻结安装或升级依赖来掩盖清单与锁不匹配。

`validate` 已包含：仓库政策→脚本测试→八包 Node/Web 类型→Vitest→心情 smoke→八包面板构建→资源/元数据→各包局部检查。成功后不必把每一步再重复全跑一遍；Python AST 另跑一次即可。

Linux / macOS 可用同样的根命令，外部命令串行短路，保留原环境变量：

```sh
npm exec --yes --package=pnpm@11.28.6 -- pnpm install --frozen-lockfile &&
COOPANION_SCREEN_INTEGRATION=0 npm exec --yes --package=pnpm@11.28.6 -- pnpm validate &&
python3 scripts/check-python.py &&
git diff --check && git diff --cached --check
```

结果判读：

- Linux 已有基线是 **525 通过 / 8 跳过**；Windows 的两个 PowerShell 夹具通常会运行，数量可能不同。**检查失败为 0 和跳过原因，不人为凑总数。**
- 六个截图测试默认跳过是有意行为，不为“全绿”打开真实截图；Linux `coo-screen` 平台警告正常。
- 八个面板应由本机重新构建；表情包和 QQ 的 JS/CSS 文件名以 §4.1 为准。资源存在不等于页面已渲染。
- `git diff --check` 不覆盖未跟踪文件，不把它单独当成全部源码合格；依赖仓库/类型/测试检查一起判断。
- 完整日志留在本机 `.cache/` 或外部备份目录；给 dsh 的上下文只贴退出码、失败测试名和末尾约 80 行，先检查是否含敏感内容。

### 5.3 有失败才用的定点命令

下表使用已定义的 `Invoke-Pnpm`；其他终端替换成固定版本的 pnpm 调用。

| 失败范围 | 优先执行 |
| --- | --- |
| QQ | `Invoke-Pnpm --filter cortico-world-qq-local typecheck`；`Invoke-Pnpm --filter cortico-world-qq-local test` |
| 日记 | `Invoke-Pnpm --filter cortico-world-coo-diary test` |
| 余额 | `Invoke-Pnpm --filter cortico-world-api-balance test` |
| 绘图 | `Invoke-Pnpm --filter cortico-world-coo-draw test` |
| 表情图 | `Invoke-Pnpm --filter cortico-world-emote-pics test` / `build` |
| 文件夹 IPC | `node --test scripts/tests/folder-compat.test.mjs` |
| 安装/补丁/探针保护 | `Invoke-Pnpm test:tooling` |
| 镜像 | `node scripts/sync-drawing.mjs --check`（清单为空，恒通过） |
| 过期自描述 | 先 `Invoke-Pnpm check:metadata`；确认源码变更属实后才 `Invoke-Pnpm describe:all`，检查生成 diff |

有意修改源码默认工具/事件/提示词才重新生成元数据；别把部署私人提示词移进源码。只修失败范围，随后全量复核一次并记录结果。

## 6. 可选：对照官方宿主源码，不替代安装包/GUI 验收

无须把开发依赖升级为 0.2.12。源码副本应放 `CodeRoot/.cache/`，含固定子模块；不克隆到八包内部或源码根旁冒充第 9 个包。

```powershell
$HostSourceRoot = Join-Path $CodeRoot '.cache\host-source-v0.2.17'
# 首次获取才 clone；已存在时先核对，不删除或覆盖。
if (Test-Path -LiteralPath $HostSourceRoot) { throw '目录已存在；核对后复用，勿重复 clone' }
git clone --depth 1 --branch v0.2.17 --recurse-submodules --shallow-submodules https://github.com/Pal-AI-Lab/Coopanion.git "$HostSourceRoot"
if ($LASTEXITCODE -ne 0) { throw '宿主源码获取失败' }
$HostSha = git -C "$HostSourceRoot" rev-parse HEAD
if ($LASTEXITCODE -ne 0) { throw '宿主提交读取失败' }
$SdkSha = git -C "$HostSourceRoot\vendor\cortico" rev-parse HEAD
if ($LASTEXITCODE -ne 0) { throw 'SDK 子模块读取失败' }
if ($HostSha -ne 'dbc06466edbe4d6328d61bbedaa4d9e312c16497') { throw '宿主提交不符，不能套用现有结论' }
if ($SdkSha -ne 'e77b6617a3c622c0f4fb09750ff9ceabf49439ac') { throw 'SDK 提交不符' }
$Report = Join-Path $CodeRoot ('.cache\host-check-' + [guid]::NewGuid().ToString('N') + '.json')
Invoke-Pnpm check:host --host-root "$HostSourceRoot" --full --report "$Report"
```

先前 `validate` 已构建面板；若跳过了它，先 `Invoke-Pnpm build`。报告路径必须是**新文件**，且不能位于宿主源码树内。既有宿主探针结果来自 Linux；上面的 Windows 命令是复现步骤，不是已经在 Windows 实测通过的声明，必须记录本机实际结果。

验收看：八包定义/元数据/加载、18 组类型、既有测试基线、8 个面板资产以及 `LIMIT` 内容。退出 0 表示探针完成，不表示图片气泡或桌面已经通过。不要把 405 改成 200、去掉 Origin 检查或关闭测试来制造通过。

此命令只接受完整源码树，不接受安装器/`.asar`；它不执行正式 `core/boot.ts`，不启动 Electron。官方发布包在本次沙箱下载失败，本地若已取得包可另做包级检查，但不能用源码结果冒充。实际宿主不是 v0.2.17 时，另行对照该版本，不强套上述 SHA。

## 7. 经确认后才接入真实/测试宿主

### 7.1 切换前检查清单

- [ ] 用户已同意本次操作范围；优先用隔离测试部署/账号，不能默认连接生产 QQ 或计费模型。
- [ ] 完全退出 Coopanion / Core / popup 子进程，不只是关闭主窗口；只处理自己确认的进程，不批量杀所有 Node。
- [ ] 私密备份实际 `BotDir/config.json`、密钥/人格文件、World 数据、`ExtensionsDir/package.json`、该工作区锁文件与原安装/链接目标；记录实际应用版本及私有补丁。
- [ ] 全部自动检查通过；新源码的依赖、面板产物已生成；没有把源码根或宿主目录的 package.json 搞混。
- [ ] 已处理相对图片/资料路径，原日记/画夹/心情/模型目录仍可达。
- [ ] 绘图只安装 `coo-draw`。若部署里还装着旧的 `cortico-world-pet-draw` / `cortico-world-coo-gen`，停用（或卸下）它们，但保留其安装目录与画夹数据。

启动宿主可能触发主动发话、模型调用、ASR 或 ComfyUI 自动启动。即使“只打开界面”，也不能默认是无外部副作用操作；测试配置先审查这些开关，不放宽群管权限。

确认路径后，可用以下命令备份安装元数据；它不打印文件内容，也不修改源文件：

```powershell
$ErrorActionPreference = 'Stop'
if (-not $BotDir -or -not $ExtensionsDir -or -not $BackupRoot) { throw '先确认三个实际目录' }
if (-not (Test-Path -LiteralPath "$BotDir\config.json")) { throw '不是实际部署目录' }
if (-not (Test-Path -LiteralPath "$ExtensionsDir\package.json")) { throw '不是扩展工作区' }
# BackupRoot 必须已确认位于源码/部署之外；可含本次源码备份，但不覆盖旧 metadata。
if (Test-Path -LiteralPath "$BackupRoot\metadata") { throw '元数据备份已存在，请为本轮另选备份位置' }
New-Item -ItemType Directory -Path "$BackupRoot\metadata" -Force | Out-Null
Copy-Item -LiteralPath "$BotDir\config.json" -Destination "$BackupRoot\metadata\deployment-config.json"
Copy-Item -LiteralPath "$ExtensionsDir\package.json" -Destination "$BackupRoot\metadata\extensions-package.json"
foreach ($Lock in @('pnpm-lock.yaml', 'package-lock.json', 'yarn.lock')) {
  $File = Join-Path $ExtensionsDir $Lock
  if (Test-Path -LiteralPath $File) { Copy-Item -LiteralPath $File -Destination "$BackupRoot\metadata\$Lock" }
}
```

**这只是元数据备份，不等于全部数据已备份。** 密钥库、人格及实际使用的各 World 数据目录必须另外保全；存在 junction 的数据目录要核对真实目标，不能只备份链接。记录原安装目标；在这些检查完成前不要执行切换或 `--apply`。备份可能含秘密，只留在本机私密目录。

### 7.2 更新扩展安装目标，保留其它依赖与配置

1. 用 §4.1 的真实包名核对现有安装；宿主原有 desktop-pet、其它 provider / Bot / 人格扩展全部保留。
2. 按原来的安装机制更新：宿主支持“从本机目录安装”时选新源码包目录；包管理器管理的安装沿用该工作区管理器。不要在 npm 管理的 `ExtensionsDir` 突然创建 pnpm 竞争锁。
3. `link:` / junction 与 `file:` 安装不是一回事。前者可直接读取源目录，后者可能是存储/复制副本；**改源码不一定自动更新已经安装的副本**，应通过同一安装流程重新安装。
4. 只改变选定包的来源，保留现有 `worlds.<id>` 配置。不要用仓库 defaults 整份覆盖部署配置，也不要把 World id 改成目录名。

只在**既有 pnpm 扩展工作区、宿主已停且用户确认**时，本地链接命令示例：

```powershell
# ExtensionsDir 已确认；旧依赖与锁已备份。只示范 QQ，别一次启用所有包。
if (-not $ExtensionsDir -or -not (Test-Path -LiteralPath "$ExtensionsDir\package.json")) { throw '先确认扩展工作区' }
if ((Resolve-Path -LiteralPath $ExtensionsDir).Path -eq (Resolve-Path -LiteralPath $CodeRoot).Path) { throw '扩展工作区不能是源码根' }
$PackageDir = (Resolve-Path -LiteralPath (Join-Path $CodeRoot 'qq-final')).Path.Replace('\','/')
Invoke-Pnpm --dir "$ExtensionsDir" add "cortico-world-qq-local@link:$PackageDir"
```

这会写扩展工作区清单/锁/安装目录，不是 dry-run。`link:` 不替源目录安装依赖，所以 §5 的根安装不能省略。若存在手工 junction/私有安装且管理器不能安全替换，停下核对；不递归删除链接目标来强行安装。

只检查安装信息，不打印其它配置/密钥：

```powershell
@'
const fs = require('node:fs'), path = require('node:path');
const root = process.argv[2];
const name = 'cortico-world-qq-local';
const target = fs.realpathSync(path.join(root, 'node_modules', name));
const pkg = JSON.parse(fs.readFileSync(path.join(target, 'package.json'), 'utf8').replace(/^\uFEFF/, ''));
console.log(JSON.stringify({ name: pkg.name, version: pkg.version, target, main: pkg.main, webUiClient: pkg.cortico?.webUiClient }, null, 2));
'@ | node - "$ExtensionsDir"
if ($LASTEXITCODE -ne 0) { throw '安装目标无法解析；先处理链接/安装，不启动宿主' }
```

核对目标是新源码或已更新的安装副本，而非旧目录；`package.json.version` 没有为本轮发布而变更，**只看版本号不够**。确认构建产物与源文件；随后整进程重启，必要时刷新该扩展页面缓存。Windows 错误包名、旧链接和旧浏览器 bundle 是优先排查项，不先重写代码。

合并画室首次启用会保留旧配置并补充默认键，使用 `draw-migrated.json` 标记；旧画夹（`worlds.pet-draw.saveDir`，留空时落到 `<dataDir>/pet-draw`）与本地出图数据目录继续可读。不要删标记来强制重迁，不批量搬/清历史图，验收前备份数据与配置。

### 7.3 特殊脚本不是常规升级必选项

| 脚本 | 安全预览方式 | 应用边界 |
| --- | --- | --- |
| 心情安装器 | `node coo-mood/scripts/install-into-coopanion.mjs --home "<BotDir>" --extensions "<ExtensionsDir>"` | 默认只计划；`--apply` 会建立链接、合并并启用 mood、备份两份 JSON。已有目标不同会拒绝，不能当通用换路径升级器或加 force 绕过 |
| 图片气泡宿主补丁 | `pwsh -File .\patch-pet-host.ps1 -HostRoot "<PetPackageRoot>"` | 默认只预览；`-Apply` 才备份/写入并请求确认。只在用户选用且缺接口时对副本试验；不是参数传 `CodeRoot` 或整个安装目录 |
| 绘图预览 | `Invoke-Pnpm --dir coo-draw exec tsx scripts/persona-samples.ts` | 默认只计划；参考图脚本同理。`--run` + 显式配置才生成，可能调用计费 API / 启动本地服务，必须另行确认 |

宿主补丁不支持直接把 `.asar` 当目录写。打过私有补丁的宿主、升级后锚点不同的宿主都先停下比较，不强套旧文本。未打图片补丁时，保持独立窗口降级也是正常选择。

### 7.4 最小实机验收，逐项记录

| 目标 | 必查行为 / 限制 |
| --- | --- |
| 基础加载 | 无扩展导入错误；面板 JS/CSS 正常，保存后配置仍在；没有重复绘图工具或误启用其它包 |
| 日记/目录 | 用测试日记确认最近记录、跨时区星期、追加不覆盖；点击目录确实有文件管理器。命令已发起但没窗口仍算待解决 |
| QQ | 测试账号/群验证正反向鉴权、拒绝错误 token、日志不漏 token、发图/语音顺序、热更新；高影响群管仅在明确授权下验证 |
| 绘图/表情 | 保留原画夹/工作流/评分；验证选定 API 或本地路径、失败降级、独立窗口大小/跟随/过期；出图费用、GPU 与服务启停需确认 |
| 心情 | 重启可恢复原数据；与日记/截图联动正常，不重置存储 |
| Windows 截屏 | 先关闭私密窗口、确认允许抓屏，再单独开启测试；检查热键、DPI、多显示器、停止后无残留侧车 |

真实截图专用命令（**不是 §5 的自动步骤**）：

```powershell
$PreviousCapture = $env:COOPANION_SCREEN_INTEGRATION
try {
  $env:COOPANION_SCREEN_INTEGRATION = '1'
  Invoke-Pnpm --filter cortico-world-coo-screen test
} finally {
  if ($null -eq $PreviousCapture) { Remove-Item Env:COOPANION_SCREEN_INTEGRATION -ErrorAction SilentlyContinue }
  else { $env:COOPANION_SCREEN_INTEGRATION = $PreviousCapture }
}
```

ASR/TTS、ffmpeg、音频设备、NapCat 协议差异、ComfyUI 模型/GPU需要分别验收。没条件运行的项目标记“未执行”，不要模拟成功后声称实机通过。

## 8. 回滚：先回代码/配置，不用旧备份盖掉新增用户数据

1. 停止本次测试宿主及已确认属于它的进程。
2. 旁路方案：通过原安装机制把选定扩展指回旧源码/旧安装；原地方案：只恢复本次变更的源码文件。旧目录、`.git` 和原数据应一直保留。
3. 恢复本次备份的扩展清单/对应锁、确实被修改的部署配置和启用状态。恢复清单不一定同步物理链接/复制副本，必须重新核对实际安装目标；保留其它扩展。
4. 心情安装器使用同一次 `*.bak-mood-*`；只移除本次新建的链接，不递归删除其源目录。不能用它的备份覆盖之后用户新增的其它配置而不检查差异。
5. 若应用了图片补丁，恢复同一次 `*.bak-image-bubble-*` 的 `src/server.ts`、`web/pet-app.js`、`web/pet.css`，再整进程启动；未打补丁则无需这一步。
6. 新日记/画作/资料/心情变化不能直接被旧数据备份覆盖；先单独保全，再决定数据级回滚。保持原 World id 与目录关系。
7. 若做过索引取消跟踪，按之前记录恢复必要的跟踪/暂存状态，不运行全仓 reset 或清理。不能用一次合并/强推“回滚”工作区迁移。
8. 重启旧部署、刷新相关页面，验证原功能和数据仍在；记录已回滚项及尚未处理的问题。

## 9. 失败定位表：先看这一行，不重新读全仓

| 现象 | 最先检查 / 禁止的捷径 |
| --- | --- |
| 拉分支后只有 README / 缺根锁 | §1、§2：成果没发布或没导出未跟踪文件；索取完整源码，不自己补写整个仓库 |
| `not a git repository` | §3A：快照新副本初始化 Git；不对旧目录重置/重新克隆覆盖 |
| `check:repo` 报生成物/子包锁 | §3.2：索引与磁盘残留分别处理；不能 `git clean` 或清整个部署目录 |
| 冻结安装失败 | 根和八包 package.json / workspace / lock 是否为同一成果；检查 pnpm 版本，不删除锁或升级 SDK |
| Windows `spawnSync pwsh ENOENT` | §5.1：PowerShell 7 未进入 PATH；不是业务代码错误，不删两个夹具测试 |
| `registerHooks` / `--use-env-proxy` 不支持 | `node --version` / PATH；使用 22.22.3，不改 SDK 源码绕过 |
| 新版面板缺样式/仍旧布局 | 本机 build、manifest 文件名、实际安装链接/副本、浏览器缓存；不从旧 dist 拼产物 |
| 找不到 QQ 包 / 配置失效 | 实际包名 `cortico-world-qq-local`，配置 `worlds.qqbot`；不要照旧上游 README 改名 |
| 图片/资料库突然空了 | §3.1：新源码根导致相对路径变化；不要当作数据被删除去重建/覆盖 |
| 两套绘图重复工具 / 迁移异常 | §7：只启用合并包或旧方案；保护旧数据和迁移标记，不为测试删除标记 |
| 镜像/元数据不一致 | §4、§5.3：合并 canonical / 确认源码变化后生成；不直接改快照断言或忽略失败 |
| 图片气泡 405 / 目录没弹出 | §1、§7：已知宿主能力边界；窗口是否显示需实机确认，不能重新用 process.send true 当确认 |
| 宿主报告文件已存在 | 换新 `--report` 路径；不覆盖前次证据，也不写入宿主源码 |
| 新工具类型/用例不通过 | 只看失败测试与 §4 对应组；保留 strict/权限/secret-store/外部内容标记，不批量 any/ts-ignore |

## 10. 完成标准与低 token 续接记录

以下记录保存在 `BackupRoot` 或本机 `.cache/local-migration/`，不提交含部署路径/私有信息的报告。每阶段只更新一次，下一次 dsh 从此处续接，不再读全部历史。

```text
来源：完整工作区快照（来源/摘要）或已确认成果提交 SHA；不是旧初始 HEAD
路径：OldCodeRoot / SourceRoot / CodeRoot；部署相关路径仅在进入部署阶段后记录
方式：A 旁路 / B 合入；备份位置：...
阶段：S0 来源确认 → S1 备份/源码就位 → S2 自动验证 → S3 可选宿主源码验证 → S4 已授权部署 → S5 实机验收
已完成：...；当前阻塞：...；下一条命令/所需用户决定：...
改动文件/本地冲突：只列实际路径与一句处理结果
命令与退出码：冻结安装 / validate / Python AST / 可选 check:host
实测数量：通过 ...；跳过 ...（原因）；失败 ...；不得照抄历史 525/8
宿主情况：版本、官方/私有补丁、实际链接/安装副本、启用的绘图方案
实机通过：...；未执行：...；仍有风险：...
配置/数据：保留项、明确改过的键名（不记录值/密钥）、是否需回滚
发布状态：未发布 / 用户已另行授权执行；不能默认推送
```

最低交付要求：来源完整、保留本地私有改动/数据、自动验证无失败、实际命令结果可查、已知限制与未验项目列清楚。若仅完成代码级迁移，写“代码级就绪，部署未切换”，不写“迁移全部成功”。

按需证据入口（**不要默认全部阅读**）：

- 初轮修复原因：[REPAIR_PLAN.md](REPAIR_PLAN.md)。其 **504/8 是历史记录**，最新已测 Linux 总数为 525/8。
- 宿主源码证据：[HOST_VALIDATION.md](HOST_VALIDATION.md)；[机器结果](HOST_VALIDATION_RESULTS.json)。只查需要的字段，不把整份 JSON 贴入提示词。
- 更细的人工验收/备份说明：[ACCEPTANCE.md](ACCEPTANCE.md)。
- 要发布扩展而非本地移植时，再读相关包 `AGENTS.md` 和官方发布检查；本手册不等于市场认证或发布授权。
