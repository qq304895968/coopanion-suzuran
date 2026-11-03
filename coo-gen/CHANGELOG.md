# Changelog

## 0.1.6

- 工作流列表把当前默认工作流的「设为默认」替换为绿色「默认」按钮，其他行仍显示「设为默认」。
- 切换默认工作流后立即重新渲染，默认按钮跟随配置。

## 0.1.5

- 出图页彻底移除模型目录输入/状态展示；模型目录继续在 World 设置和 ComfyUI 配置里生效。
- 工作流导入按钮移到路径行，和「选择…」并排；修复小按钮布局。
- 新增本机 Krea-2 Turbo API 工作流预设（UNETLoader + CLIPLoader krea2 + VAELoader），支持 UNET 模型不需要 checkpoint 的提交路径。
- Krea-2 预设使用本机文件：krea2_turbo_nvfp4 / qwen3vl_4b_fp8_scaled / qwen_image_vae，固定 8 步、CFG 1、euler/simple。

## 0.1.4

- 移除「出图」面板里的模型文件表格和 Diffusion/UNet 长提示；只保留模型目录输入、保存/读取按钮和一行计数。
- 模型目录配置与扫描能力保留，模型列表仍在 World 设置和模型下拉里体现。

## 0.1.3

- 面板「出图 → 连接」新增模型目录表格：列出 Checkpoint / Diffusion/UNet / VAE 文件、大小和绝对路径，可复制路径；LoRA 仍在 LoRA 页。
- Diffusion/UNet 行标记「需工作流」，避免把 `krea2_turbo_nvfp4` 这类 UNet 当成完整 Checkpoint。
- 模型根目录和 `extra_model_paths.yaml` 状态进入面板；本地扫描与 ComfyUI API 合并。

## 0.1.2

- 新增 `modelsDir` 模型根目录配置：支持 `D:\develop\ComfyUI\models` 这类独立目录，扫描其中的 `checkpoints/`、`loras/`、`diffusion_models/`。
- 新增模型文件头分类：区分完整 Checkpoint、Diffusion/UNet、LoRA、VAE；面板显示 Checkpoint/Diffusion 数量，并对只检测到 UNet 的情况给出说明。
- 新增「让 ComfyUI 读取模型目录」：写入/追加 `ComfyUI\extra_model_paths.yaml`，支持根目录模型（如 `krea2_turbo_nvfp4`）和子目录。
- 本地扫描与 ComfyUI `/object_info` 合并；本地有但 ComfyUI 没读到的模型会给出警告。
- 新增模型扫描、模型路径写入测试（共 61 个）。

## 0.1.1

- 修复 `.bat` 一键启动：不再把脚本路径和参数拼成一条带引号的 cmd 命令（Electron 下会立即以 1 退出），改为把脚本和参数作为独立 argv 传给 `cmd /d /s /c`。
- 新增 `stopScript` 配置项、`coo_gen_start` / `coo_gen_stop` 工具和面板「关闭 ComfyUI」按钮；桌宠可以在用户明确要求时启动/关闭 ComfyUI。
- 启动成功后清掉 LoRA 缓存并立即重扫；状态工具会报告启动/关闭脚本是否配置。
- 修正 `comfyDir` 必须指向包含 `models` 的 `ComfyUI` 子目录，而不是便携版根目录。
- 新增 `LaunchManager` 的 bat 参数数组测试和启停工具提示测试（共 57 个）。

## 0.1.0

- 新增「出图」World：本地 ComfyUI 的连接检测、WebSocket 进度、5 秒重连、可选一键启动。
- 新增对话入口 `coo_gen` / `coo_gen_result` / `coo_gen_cancel` / `coo_gen_loras` / `coo_gen_status` / `coo_gen_open_output`，以及 `coogen.done` / `coogen.failed` 事件。
- 新增 LoRA 扫描：递归 `models/loras`、分类、同名预览图、侧车/safetensors 触发词；常驻组合、中文别名、多策略匹配、去重合并与上限截断；LoRA 链自动注入任意 checkpoint 工作流。
- 新增内置「快速文生图」「图生图」「ControlNet」工作流；支持导入 ComfyUI API 格式，并把 UI 格式按 `/object_info` 自动转成 API 格式；自动识别参数。
- 新增三页 WebUI 面板：出图（连接、参数、LoRA 多选、进度、预览、最近 50 张）、LoRA 管理、工作流。
- 新增输出管理：`{时间}_{种子}_{模型}.png` 命名、批次序号防覆盖、PNG iTXt/tEXt 元数据、A1111 `parameters`、最近历史索引。
- 新增可选 OpenAI 兼容翻译端点；词典优先，失败原文直出。
- 新增 53 个测试，覆盖 PNG 元数据、LoRA 扫描/匹配/合并、工作流识别/注入/UI 转换/自定义参数、ComfyUI HTTP/WS 客户端、任务队列和 World 端到端对话出图。
