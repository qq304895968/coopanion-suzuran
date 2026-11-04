## Unreleased

- 对照官方 Coopanion 0.2.17 确认其不处理 `companion:open-folder`；不再用 `process.send()` 的布尔值跳过系统文件管理器。保留原生打开与复制路径兜底，桌面可见性仍须实机验收。旧的 0.2.13 私有宿主 IPC 不再作为默认路径。

- 先过滤并按日期降序排列文件，再限制最多读取 400 个候选，避免旧文件挤掉最近日记。
- 按给定日历日期计算星期，修复 UTC+13/+14 等时区重复转换导致的错日。
- 增加超过 400 文件、极端时区和异常文件回归测试；测试装配显式固定时区。

## 0.4.1

- 修复「打开当前文件夹」在 Windows 上不弹窗口:Core 是 Electron-as-Node,自己 spawn 的 `cmd` / `explorer` / PowerShell 子进程会被隔离在无交互桌面上。改为用 `process.send({ type: 'companion:open-folder', path })` 交给 Coopanion 主进程,由 Electron `shell.openPath` 打开;非 Coopanion 宿主保留 PowerShell `Shell.Application` 兜底。macOS / Linux 不变。
- 本机 Coopanion 0.2.13 的 `app/core-host.cjs` 与 `app/main.cjs` 已加 `companion:open-folder` 处理;升级 Coopanion 后需要重新应用这段宿主补丁。

## 0.4.0

- 新增「日记目录」面板:显示当前目录路径、目录是否存在、今天是否已经写过。
- 「打开当前文件夹」:Windows 用资源管理器,macOS 用 `open`,Linux 用 `xdg-open`;目录不存在时自动创建。
- 「复制路径」和「刷新」;浏览器端 bundle 构建到 `dist/webui.js`。
- 面板通过 `world:diary` 的 `folder` panel 提供 `info` 和 `open`;`open` 是 GET,供隐藏 iframe 导航。

## 0.3.0

- 和「看一眼」联动:`diary_moment` 按日期回想 `screen_rate` 打到阈值以上的深刻瞬间,可把原图作为附件交回来。
- `diary_write` 新增 `moments` 与 `includeMemorable`:截图复制进 `images/<日期>/`(加 `moment-` 前缀),并写成「深刻瞬间」引用块。
- 环境提示词报告今天留下的深刻瞬间数量,并写明「先 diary_moment,再 moments 引用;想画下来先 pet_draw + referencePath」的流程。

## 0.2.0

- 和画画插件联动:`diary_art` 按日期回想画过的画,可把图作为附件交回来。
- `diary_write` 新增 `arts` 与 `includeDayArt`:把引用的画复制进 `images/<日期>/`,并在日记正文末尾写 Markdown 图片。
- 自动从部署 `config.json` 的 `worlds.pet-draw.saveDir` 找画夹;留空时退回 `<dataDir>/pet-draw`。
- 环境提示词报告今天画过几张,并说明「先 diary_art 回想、再用 arts 引用」或「先 pet_draw 画新的」的流程。

## 0.1.0

- World `diary`,契约 `cortico.api = 6`。
- `diary_write`:一天一个 Markdown 文件(`YYYY-MM-DD.md`),追加 `## HH:mm` 小节,从不覆盖。
- `diary_read` / `diary_list`:读回某天或最近几篇;按日期列出篇数与字数。
- `worlds.diary.dir` 目录必填;路径穿越、非真实日期、超长正文都在写入前拒绝。
- 可选每日提醒:到点且当天没有日记时推 `diary.reminder`,一天最多一次。
- 环境提示词报告目录、今天与今天的状态。
