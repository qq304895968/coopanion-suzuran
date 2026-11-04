# 人工验收与回滚

自动检查只覆盖源码、契约、模拟传输和隔离文件夹。以下步骤需要在你自己的测试部署执行；**本次没有连接你的真实宿主，也没有执行这些真实部署操作**。

官方 v0.2.17 的源码模块验证另见 [HOST_VALIDATION.md](HOST_VALIDATION.md)。其中已确认两项自定义接口并非官方能力；源码探针不代替以下实机步骤。

## 0. 先做准备

1. 停止 Coopanion，备份部署 `config.json`、扩展工作区 `package.json` 和扩展数据目录。
2. 用测试副本，不要让第一轮验收写生产日记、发真实群公告或修改真实群成员。
3. 在仓库根执行 `pnpm install --frozen-lockfile`、`pnpm validate`。
4. 安装源码包前构建 `dist`。加载 API 6 兼容宿主；新包使用合并画室时停用 `pet-draw` / `coo-gen`。
5. 如果已有面板资源被浏览器强缓存，重载/清除该扩展资源缓存；本轮保留了原来的资源 URL，不冒充已发布的新版本。

## 1. QQ / NapCat

- [ ] 正向连接：带 token 能成功登录；查看日志，不能看到完整 token、URL 查询值、userinfo 或 fragment。
- [ ] 反向连接：正确 token 允许接入，错误 token 拒绝；第二条连接替换第一条时同样不泄漏 URL 中的 token。
- [ ] 不设 token 时不能把反向监听暴露到非回环地址。
- [ ] 文本、引用、@、图片各自能发；失败回执不能说成“已送达”。
- [ ] `voice_text` 场景保持“日语语音 → 中文正文 → 下一条消息”，TTS 失败可降级，前一任务失败不会堵住队列。
- [ ] 监听名单和热更新配置仍立即生效；重启连接不丢已有配置。
- [ ] 在测试群验证管理员白名单、消息身份有效期、群主保护、禁止自主踢人的限制。**本轮保留原有授权配置，不将模拟权限测试等同于真实账号安全审计。**
- [ ] 空间 notice 能进入空间处理流程；主动说话第一次触发后使用稳定概率，不一直停留在热身状态。
- [ ] ASR/TTS 的 Python、ffmpeg、模型、NapCat 版本与端点单独验收。自动测试不会下载模型。

## 2. 日记

- [ ] 将测试日记目录准备为超过 400 个不同日期的文件，最近记录出现在列表最前。
- [ ] 超大文件、无效日期、目录或符号链接不挤掉正常记录，也不被当正文读取。
- [ ] Shanghai / Auckland / Kiritimati 等时区补记同一个日历日期，标题星期一致。
- [ ] 一天追加两次不会覆盖旧内容；目录变更立即生效。
- [ ] 截图与绘画回忆工具仍能关联原有数据目录。
- [ ] 点击“打开当前文件夹”确实显示系统文件管理器；官方 v0.2.17 没有 `companion:open-folder` 处理器，本轮已改为原有系统命令路径，不再把 IPC 布尔值当作确认。Windows COM、Linux 桌面/`xdg-open` 和旧私有宿主都要实机确认；失败时可以复制路径。

## 3. 绘图、表情和心情

- [ ] 合并画室分别验证 API / 本地路由；不同时启用旧包，检查画夹和历史未被迁移覆盖。
- [ ] API / 本地画夹与两个旧绘图包的“打开目录”分别检查；请求已发起不等于系统窗口已显示。
- [ ] 真实 API 出图可能计费，只有确认配置和费用后才测试；自动验证未发起付费请求。
- [ ] ComfyUI 的模型、LoRA、工作流、GPU 与启动脚本单独验收。
- [ ] 表情图概率、冷却、强制选图、未知情绪、5 MiB 限制正常；桌面弹窗大小、跟随和过期关闭正常。
- [ ] 心情存储重启可恢复；日记、看屏幕和情境互动仍正确联动。

### 绘图预览 CLI

默认只输出计划，不创建输出目录、不启动服务、不发出图请求：

```sh
pnpm --dir coo-draw exec tsx scripts/persona-samples.ts
pnpm --dir coo-draw exec tsx scripts/reference-img2img.ts --reference "<参考图>" --denoise 0.6
```

明确执行示例（确认配置中的服务、自动启动选项和费用后再运行）：

```sh
pnpm --dir coo-draw exec tsx scripts/persona-samples.ts --config "<部署目录>/config.json" --output "<专用预览目录>" --run
pnpm --dir coo-draw exec tsx scripts/reference-img2img.ts --config "<部署目录>/config.json" --reference "<参考图>" --denoise 0.6 --run
```

环境变量也可以指定 `COOPANION_CONFIG`，或用 `COOPANION_HOME` 指向含 `config.json` 的目录；`COOPANION_PREVIEW_DIR` 指定输出。默认输出在 `coo-draw/.preview/` 下，不再固定到作者磁盘。参考图的两个旧位置参数（路径、denoise）仍接受，但不加 `--run` 不会执行。

## 4. Windows 截屏

`coo-screen` 的六个原生侧车集成测试默认跳过，**即使 CI 在 Windows 上也不会自动抓屏**。只在 Windows 交互桌面、Python 可用且允许访问显示器/热键的测试部署显式开启：

```powershell
$env:COOPANION_SCREEN_INTEGRATION = '1'
pnpm --filter cortico-world-coo-screen test
Remove-Item Env:COOPANION_SCREEN_INTEGRATION
```

- [ ] 热键注册/注销、单次抓屏、多显示器和 DPI 正常。
- [ ] World 停止后没有残留侧车/热键。
- [ ] 截图只在指定操作时发生，不持续录屏。
- [ ] 截图事件仍能接入心情与日记回忆。

测试可能访问真实屏幕；请先关闭私密窗口。普通 CI 只运行纯逻辑测试和 Python 语法解析。

## 5. 心情安装器

```sh
node coo-mood/scripts/install-into-coopanion.mjs --home "<部署目录>" --extensions "<扩展工作区>"
# 检查计划，停止宿主后才添加 --apply
node coo-mood/scripts/install-into-coopanion.mjs --home "<部署目录>" --extensions "<扩展工作区>" --apply
```

- 保留 `COOPANION_HOME` / `COOPANION_EXTENSIONS` 环境变量支持。
- 默认 dry-run。先解析两份 JSON、校验已有链接和依赖，之后才可能写入。
- 不自动替换指向别处的现有安装；发现冲突会拒绝并要求人工检查。
- 应用前保存 `*.bak-mood-<时间>-<随机后缀>`，保留已有 World 配置，启用 mood；发生写入失败会尝试恢复文件和本次新建的链接。
- 回滚：停止宿主，用该次备份还原两份 JSON。仅当该次安装新建了链接时移除该链接，不要删除它指向的源码目录；然后重启。

自动化测试只对系统临时目录中的假部署应用安装，不操作真实部署。

## 6. 可选桌宠图片气泡补丁

这是**侵入宿主的兼容补丁**，不是正常安装步骤。只有宿主确实缺 `/api/image-bubble` 功能时才考虑。

已在 v0.2.17 的真实 PetServer 源码模块上复现：正常接口返回 200，图片气泡 POST 返回 405。该版本的五个补丁内容锚点匹配，但尚未执行 PowerShell 或验证补丁后的渲染；不能把锚点匹配当成可直接覆盖任何安装。保持独立窗口降级也是一种选择。

```powershell
# 默认校验所有锚点并预览，不写文件
pwsh -File .\patch-pet-host.ps1 -HostRoot "<cortico-world-desktop-pet 包目录>"

# 停止宿主、检查计划后再应用（会请求确认）
pwsh -File .\patch-pet-host.ps1 -HostRoot "<cortico-world-desktop-pet 包目录>" -Apply
```

也可设置 `COOPANION_DESKTOP_PET_ROOT`，不再假定磁盘目录。脚本支持 `-WhatIf`。

- 先在内存里验证全部替换点；某个锚点不匹配，不会先改掉前几个文件。
- 所有涉及文件先保存 `*.bak-image-bubble-*`，再写入；重复执行应无变化。
- 修正旧的过宽标记：路由中引用常量不再导致漏加常量定义；`line.images` 不再误判淡出逻辑已经应用。
- Windows CI 只对合成文本夹具测试 dry-run、备份、幂等与失败不部分写入；**这不验证真实版本的宿主 API 或渲染**。
- 回滚：停止 Coopanion，恢复同一轮备份里的 `src/server.ts`、`web/pet-app.js`、`web/pet.css`，再整进程重启。
- 应用升级可能覆盖补丁。锚点变化时停止，不要强行匹配，更不要直接覆盖新版宿主文件。

## 7. 发布与历史清理另行处理

- 需要真实宿主、官方 `check:extension`、平台集成验收通过后，才能决定发布版本号。
- 本轮不推送、不发布、不改远端 main，也不使用 force-push。
- Git 索引不再跟踪缓存，但旧提交仍保留大文件；仓库历史体积不会因此立即下降。历史重写需要独立备份、协作者协调和明确授权。
- 当前检查不是完整的历史隐私/凭据审计。发现曾暴露的真实密钥，应优先轮换。
