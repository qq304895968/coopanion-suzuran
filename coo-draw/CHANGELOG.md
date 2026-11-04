# Changelog

## Unreleased

- 对照官方 Coopanion 0.2.17 确认其不处理 `companion:open-folder`；不再用 `process.send()` 的布尔值跳过系统文件管理器。保留原生打开与复制路径兜底，桌面可见性仍须实机验收。旧的 0.2.13 私有宿主 IPC 不再作为默认路径。

- 为与旧独立包共有的 25 个模块建立显式镜像同步和差异检查（见根 scripts/drawing-mirrors.json）。
- 开发预览脚本改为显式配置路径、可覆盖输出目录和默认 dry-run；参考图脚本也必须加 --run 才执行。
- 统一工具链，增加预览参数安全回归测试。

## 0.1.0

首个版本：把 `cortico-world-pet-draw`（0.6.3）和 `cortico-world-coo-gen`（0.1.6）合并成一个「画室」World。

### 新增

- 一个 World、两个页签：`API 绘画` 与 `本地出图`；本地页签内再分「出图 / LoRA 管理 / 工作流」。
- 两处独立路由：`routePet`（桌宠主动画）、`routeDiary`（日记配图），各自 `api` / `local`，严格不回退。
- 人设笔触本地预设：`persona-krea2` 工作流（Krea2 + Qwen3-VL + VAE），固定 512×512 × 1，独立 LoRA/步数/CFG/采样/负面词。
- 本地参考图两种方式：`describe`（铃兰先看参考图写提示词）与 `img2img`（参考图重绘），面板与设置可切换。
- `pet_draw` 新增 `purpose`（pet/diary）与 `prompt`（本地提示词）参数；`pet_draw_settings` 可改两处路由。
- 合并层把本地人设出图接回原画夹：计数、弹图、`petdraw.drawn`、评价、`index.json` 全部复用。
- 旧 `worlds.pet-draw` / `worlds.coo-gen` 配置一次性迁移到 `worlds.draw`（只补默认值，旧配置保留）。
- 日记优先读 `worlds.draw.saveDir`，兼容旧 `worlds.pet-draw.saveDir`。

### 兼容

- 画夹仍默认 `<dataDir>/pet-draw`；ComfyUI 设置、历史、工作流仍在 `<dataDir>/coo-gen/`。
- 工具名保持 `pet_draw*` / `coo_gen*`，旧提示词和日记联动不需要重写；日记提示词补了 `purpose: "diary"`。

### 说明

- 人设本地出图的质量取决于本机模型；Krea2 + 现有 LoRA 与千问蜡笔会有差别，先跑通再按反馈调预设。
