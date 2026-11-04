# Coopanion · Suzuran 扩展工作区

这是 **10 个 Cortico World API 6 扩展**的源码仓库，不包含 Coopanion / Electron 桌面宿主本身。不能把它当作一个 `npm start` 就能运行的完整桌宠应用。

- **本地移植与验证统一入口（含可直接交给 dsh 的短指令）**：[本地迁移手册](docs/LOCAL_MIGRATION.md)
- **本次审查的问题、修改方法、验证结果与剩余边界**：[修复清单](docs/REPAIR_PLAN.md)
- **部署前的人工验收与回滚**：[验收指南](docs/ACCEPTANCE.md)
- **官方 v0.2.17 的源码模块兼容验证与新发现**：[宿主验证报告](docs/HOST_VALIDATION.md)（不是发布包/桌面验收）

获取已提交成果时，使用 `arena/13094e18-coopanion-suzuran`，并确认该提交包含上述迁移手册与完整十包源码。旧报告中的“尚未提交/推送”是当轮检查记录；当前交付状态以远端分支和实际提交号为准。源码获取、备份及本地验证步骤统一见迁移手册，不要把初始提交 `784b9e9` 当成修复版本。

## 目录与选择

| 目录 | 功能 | 注意事项 |
| --- | --- | --- |
| `api-balance` | 查询模型服务账户余额 | 密钥通过部署密钥库保存 |
| `arknights` | 明日方舟离线知识 / 黑流拓扑 | 内置数据和源素材不是缓存，不要随意删除 |
| `coo-diary` | 按天追加 Markdown 日记、回忆绘画与截图 | 配置自己的绝对目录 |
| `coo-draw` | 合并的画室：API 绘画 + 本地 ComfyUI | **新安装优先选择** |
| `coo-gen` | 独立旧版 ComfyUI 出图 | 兼容保留，不与合并画室同时启用 |
| `pet-draw` | 独立旧版人设绘画 | 兼容保留，不与合并画室同时启用 |
| `coo-mood` | 心情状态与情境互动 | 状态保存在部署数据目录 |
| `coo-screen` | Windows 热键截屏、记忆瞬间 | 真实截屏需要 Windows 交互桌面与 Python |
| `emote-pics` | 对话表情图 / 桌面弹图 | 配置图片目录；桌面行为需宿主验收 |
| `qq-final` | OneBot / NapCat QQ 接入、语音、群管理等 | 需要自己的 NapCat，先用测试账号/测试群验收 |
| `scripts` | 工作区检查、绘图镜像、元数据生成、脚本安全测试 | 默认检查不访问真实模型服务 |

## 开发环境

- Node.js **≥ 22.15**；本次 Linux 验证使用 **22.22.3**。
- pnpm **11.28.6**，由根 `package.json` 的 `packageManager` 固定。
- Cortico **0.2.8**、TypeScript **5.7.3**、Vitest **2.1.9**，共用根 `pnpm-lock.yaml`。
- Python 3.11 用于 CI 的侧车语法检查；真实截屏 / ASR 另见对应包说明。

以下命令均从仓库根目录执行，PowerShell 也适用：

```sh
npm install --global pnpm@11.28.6
pnpm install --frozen-lockfile
pnpm validate
```

不想全局安装 pnpm，可以把 `pnpm <命令>` 换成：

```sh
npm exec --yes --package=pnpm@11.28.6 -- pnpm <命令>
```

Linux 安装时 `coo-screen` 的 Windows 平台提示是预期行为：其纯逻辑测试可以运行，但这不意味着 Linux 可以使用这个 Windows 截屏扩展。不要为了消除提示删除包的 `os` 限制。

## 常用命令

| 命令 | 范围 |
| --- | --- |
| `pnpm validate` | 仓库策略 → 绘图镜像 → 脚本测试 → 全量类型检查 → 单元/契约测试 → 心情 smoke → 构建 → 资源/元数据/扩展局部检查 |
| `pnpm typecheck` | 十个包的 Node 代码，以及有浏览器端的包的独立浏览器配置 |
| `pnpm test` | 十个包的 Vitest 测试；不会主动连接真实 NapCat、调用付费绘画或抓屏 |
| `pnpm test:tooling` | 镜像、安装器与宿主补丁的安全测试，只使用临时夹具 |
| `pnpm test:smoke` | 心情模块已有的纯本地 smoke（模型、存储、World 回合、小故事） |
| `pnpm build` | 构建八个浏览器面板；余额包同时生成自描述 |
| `pnpm check:artifacts` | 核对 manifest 声明的 JS / CSS / 图标 / 自描述文件存在且非空 |
| `pnpm check:host --host-root <宿主源码目录> --full` | 显式使用该宿主的 SDK 验证加载、HTTP/IPC、类型和测试；需要含固定 Cortico 子模块的源码，不启动 Electron |
| `pnpm check:metadata` | 使用 SDK 导出器检查十个包的 `describe.json` 是否与源码一致，不启动 World |
| `pnpm describe:all` | 明确重新生成有差异的 `describe.json`；修改工具、事件或提示词后执行 |
| `pnpm check:packages` | 执行各包现有的本地 `check` / `check:manifest`；不等同于官方发布认证 |
| `pnpm sync:drawing` | 从 `coo-draw` 同步明确登记的 25 个共享文件到旧包 |
| `pnpm check:mirrors` | 只报告镜像差异，绝不写文件 |
| `python scripts/check-python.py` | 只解析三个 Python 侧车文件，不启动侧车 |

只检查一个包：

```sh
pnpm --filter cortico-world-qq-local test
pnpm --filter cortico-world-qq-local typecheck
pnpm --filter cortico-world-emote-pics build
```

## 为什么保留三个绘图包

`coo-draw/src/api/` 和 `coo-draw/src/local/` 是登记的共享模块的唯一维护来源，映射见 `scripts/drawing-mirrors.json`。

- 改共享文件后执行 `pnpm sync:drawing`，再运行测试。
- 不要直接编辑映射中的旧包文件；CI 会发现漂移。
- 各包的 World、definition、配置适配和独有模块仍独立维护，**不能盲目整目录覆盖**。
- 不改成跨包相对路径导入，是为了保留旧包复制/打包后独立安装的能力。
- 合并画室与旧包同时启用会产生重复工具；选择一套，不要都启用。

## 构建与安装边界

`dist/` 不再纳入 Git。安装源码包或打包前，先安装依赖并构建。QQ 的 CSS 已恢复为源码；表情包构建按 manifest 输出原有的带日期 JS/CSS 文件名，不依赖残留的旧 `dist`。

各包仍保留自己的 `package.json`、开发依赖和扩展入口，运行时不从仓库根目录加载共享业务代码。独立复制的包不使用本工作区锁文件，其重新解析的传递依赖不具有整仓冻结安装的同等保证；要复现本次验证，应在整个工作区使用根锁文件。发布包还应遵循各包的 `AGENTS.md` 与官方 `check:extension` 流程。

本仓库中的脚本不能代替真实桌面宿主。没有自动改你的部署配置、打真实宿主补丁、启动模型服务、发布扩展版本或修改远端 main。

## 安全的开发辅助脚本

默认只预览；路径必须自己指定，不再假定作者的 `D:` / `F:` 目录。具体应用与回滚方法见 [验收指南](docs/ACCEPTANCE.md)。

```sh
# 心情安装器：默认 dry-run，显式 --apply 才写部署；先停止宿主
node coo-mood/scripts/install-into-coopanion.mjs --home "<部署目录>" --extensions "<扩展工作区>"

# 绘图：默认只列计划；--run 之前必须指定实际配置
pnpm --dir coo-draw exec tsx scripts/persona-samples.ts
pnpm --dir coo-draw exec tsx scripts/reference-img2img.ts --reference "<参考图路径>"
```

Windows 宿主补丁：

```powershell
pwsh -File .\patch-pet-host.ps1 -HostRoot "<cortico-world-desktop-pet 包目录>"
```

上述补丁默认不写入；`-Apply` 才会在验证所有锚点并备份后修改。应用升级可能改变锚点，失败时不要强行套用。

## 仓库卫生与密钥

- `.pnpm-store`、`node_modules`、`dist`、`.tmp*`、`.preview`、Python 字节码、日志不提交。
- `.env*`、私钥、接入 token 与本地备份不提交；只有不含实际密钥的 `.env.example` 等模板可纳入版本控制。
- 不在日志、聊天或 issue 里贴完整 OneBot URL / token。QQ 的连接日志已删除 URL 的 userinfo、全部查询参数与 fragment；错误文本也会对已知凭据脱敏。
- 取消跟踪不等于擦除历史。以前提交的大文件仍在旧提交里；本轮未重写历史。若旧提交包含真实密钥，应轮换密钥并另行制定历史清理计划。
- 根目录不新增或推定许可授权；各包及离线素材遵循其现有声明。

CI 位于 `.github/workflows/validate.yml`，配置了 Linux / Windows 双平台。它只能在提交推送后由远端运行；本地通过不等于远端 CI 已运行，也不等于真实宿主集成验收通过。
