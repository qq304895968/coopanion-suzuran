# cortico-world-coo-gen

给 Coopanion 桌宠的「出图」World：**用户借桌宠的界面调用本地 ComfyUI**，出用户自己的图。

它和「绘画」（`cortico-world-pet-draw`）是两件事：

| | 绘画 | 出图（本包） |
|---|---|---|
| 视角 | 桌宠角色 | 用户本人 |
| 风格 | 人设决定（蜡笔/铅笔…） | 用户选模型、LoRA、采样参数 |
| 出图方式 | 云端千问 API | 本地 ComfyUI |
| 结果 | 桌宠画夹 / 日记 | 用户自己的输出目录 |
| 触发 | 桌宠主动画 | 对话触发 / 面板操作 |

- 对话：「发我一张塞尔达的图」→ 后台提交 ComfyUI，画好后推事件，桌宠取回图片展示。
- 面板：三页「出图 / LoRA 管理 / 工作流」，覆盖连接、参数、进度、预览、最近 50 张、LoRA 常驻/别名/触发词、工作流导入。
- LoRA：递归扫描 `models/loras`，分类、同名预览图、侧车触发词；别名表、常驻组合、对话智能匹配、去重合并、上限截断。
- 工作流：内置「快速文生图」「图生图」「ControlNet」；导入 ComfyUI 导出的 API 格式，或把 UI 格式按 `/object_info` 自动转成 API 格式，并识别参数。
- 结果：保存为 `{时间}_{种子}_{模型}.png`，PNG 里写提示词、模型、LoRA、种子和完整参数；面板保留最近 N 张。
- 连接：HTTP 提交/查询 + WebSocket 实时进度；断线每 5 秒重连；可配置一键启动脚本。

## 装进 Coopanion

1. Coopanion 的 WebUI →「扩展」→「手动安装」→「从本机目录安装」，填本目录的绝对路径，例如 `F:\study\coopanion\coo-gen`。
2. 重启 Coopanion（扩展代码在启动时加载，热装不会自动换模块）。
3. 到「World 总览」启用「出图」（`worlds.coo-gen.enabled`）。
4. 打开左栏 World →「出图」，在「连接」里填 ComfyUI 地址，点「检测」。在线后即可选模型/LoRA 出图。
5. 如果要 LoRA 预览图和分类，在 World 设置里填「ComfyUI 根目录」；只靠 `/object_info` 也能出图，但只有名字、没有预览。

本包是标准的 `cortico-world` 扩展：`main` 指向 `src/index.ts`，WebUI 产物在 `dist/webui.js` / `dist/webui.css`，自描述在 `describe.json`。开发用 Node ≥ 22。

## 配置

### `worlds.coo-gen`（标量，World 设置页）

```jsonc
{
  "worlds": {
    "coo-gen": {
      "enabled": true,
      "url": "http://127.0.0.1:8188",
      "comfyDir": "D:\\develop\\ComfyUI\\ComfyUI",
      "modelsDir": "D:\\develop\\ComfyUI\\models",
      "outputDir": "D:\\daily use\\Coopanion\\data\\output",
      "defaultCheckpoint": "anything_v5.safetensors",
      "loraMaxCount": 3,
      "historyLimit": 50,
      "sampler": "euler_ancestral",
      "scheduler": "normal",
      "steps": 20,
      "cfg": 7,
      "width": 768,
      "height": 1152,
      "batch": 1,
      "negativePrompt": "low quality, blurry, bad anatomy",
      "promptPrefix": "masterpiece, best quality",
      "promptSuffix": "",
      "translateUrl": "",
      "translateModel": "",
      "translateKeyEnv": "COO_GEN_LLM_KEY",
      "translateTimeoutSeconds": 12,
      "timeoutSeconds": 300,
      "pollSeconds": 2,
      "popupEnabled": true,
      "popupSeconds": 6,
      "popupScale": 0.8,
      "defaultWorkflow": "quick-txt2img",
      "launchScript": "D:\\develop\\ComfyUI\\start_coo-gen.bat",
      "launchArgs": "-Service",
      "stopScript": "D:\\develop\\ComfyUI\\stop_coo-gen.ps1",
      "launchCwd": "D:\\develop\\ComfyUI",
      "launchWaitSeconds": 120,
      "autoLaunch": false
    }
  }
}
```

- `outputDir` 留空时：标准 Coopanion 布局（`data/home/companion`）用 `<安装目录>/data/output`，也就是 `D:\daily use\Coopanion\data\output`；其它 Cortico 部署退回 `<部署数据目录>/output`。想固定到别处就显式填。
- `comfyDir` 必须指向**包含 `models` 的那层 `ComfyUI` 目录**（便携版里是 `...\ComfyUI_windows_portable\ComfyUI`，本机为 `D:\develop\ComfyUI\ComfyUI`），不是便携版根目录；留空时只从 ComfyUI `/object_info` 读名字。
- `modelsDir` 是可选的独立模型根目录，例如 `D:\develop\ComfyUI\models`。插件会扫描其中的 `checkpoints/`、`loras/`、`diffusion_models/` 和根目录文件，并按文件头区分 Checkpoint / Diffusion / LoRA / VAE。留空时用 `comfyDir/models`。
- `translateUrl` + `translateModel` 都非空才启用 LLM 翻译。端点是 OpenAI 兼容的 `/v1/chat/completions` 根地址（例如 `http://127.0.0.1:11434/v1`）；Key 从部署 `.env` 的 `translateKeyEnv` 变量读，本地端点可留空。
- `promptPrefix` / `promptSuffix` 对对话和面板出图都生效，只做逗号去重。
- `timeoutSeconds` 是单任务总超时；超时会取消并推 `coogen.failed`。

### `settings.json`（LoRA 常驻、别名、自定义词典）

配置 schema 不支持数组对象，所以这部分存在数据目录：

```text
<部署数据目录>/coo-gen/settings.json
```

```jsonc
{
  "version": 1,
  "default_loras": [
    {
      "name": "soft_lighting",
      "path": "光影/soft_lighting.safetensors",
      "weight": 0.5,
      "trigger_words": []
    }
  ],
  "lora_aliases": {
    "塞尔达": ["zelda_botw_style", "zelda_totk"]
  },
  "lora_meta": {
    "角色/hatsune_miku_v4.safetensors": {
      "aliases": ["初音"],
      "trigger_words": ["hatsune miku"],
      "weight": 0.7
    }
  },
  "dictionary": {
    "我的角色": "my character, silver hair"
  }
}
```

面板的「LoRA 管理」会读写这个文件；不要手改正在运行的实例，改完刷新面板即可。默认词典在 `src/settings.ts`，`dictionary` 里同名条目覆盖内置词典。

### 工作流文件

导入的工作流存在：

```text
<部署数据目录>/coo-gen/workflows/<preset-id>.json
```

每个文件包含 `workflow`（ComfyUI API 格式）和 `param_mapping`（参数 → 节点/字段）。内置模板不落盘，代码里生成。

## ComfyUI 集成

| 操作 | 端点 | 说明 |
|---|---|---|
| 系统状态 | `GET /system_stats` | 插件启动、面板检测、启动等待 |
| 模型列表 | `GET /object_info/CheckpointLoaderSimple` | checkpoint 下拉 |
| LoRA 列表 | `GET /object_info/LoraLoader` | 与本地扫描合并 |
| 提交 | `POST /prompt` | `{prompt, client_id}`，返回 `prompt_id` |
| 历史 | `GET /history/{prompt_id}` | 取输出文件名，下载 `/view` |
| 实时进度 | `ws://.../ws?clientId=...` | `progress / executing / execution_error` |
| 取图 | `GET /view?filename=...` | 下载 PNG/JPG/WebP |
| 上传输入图 | `POST /upload/image` | 图生图/ControlNet 的本地图先上传 |
| 取消 | `POST /interrupt` + `POST /queue` | 面板/工具取消 |

- WebSocket 断线后每 5 秒重连，直到面板卸载或 World 停用。
- 即使 WebSocket 没连上，任务仍会每 `pollSeconds` 查一次 `/history`，不会丢结果。
- 完成时优先读 SaveImage 的 `output` 图片；没有输出图会明确报错「工作流没有输出图片节点」。

### 一键启动 / 关闭

只运行用户在设置里明确填的脚本，不会猜路径：

- `.bat` / `.cmd`：`cmd /d /s /c <脚本> <参数…>`（脚本和参数是独立 argv，不拼成一条带引号的命令）
- `.ps1`：`powershell -NoProfile -ExecutionPolicy Bypass -File 脚本 参数`
- `.py`：`python 脚本 参数`
- 其它（`.exe` 等）：直接运行

本机安装目录里带了两组脚本：

```text
D:\develop\ComfyUI\start_coo-gen.bat    ← 双击/面板用这个（推荐）
D:\develop\ComfyUI\start_coo-gen.ps1    ← 实际启动逻辑
D:\develop\ComfyUI\stop_coo-gen.bat
D:\develop\ComfyUI\stop_coo-gen.ps1
```

推荐配置：

| 配置 | 值 |
|---|---|
| `comfyDir` | `D:\develop\ComfyUI\ComfyUI` |
| `launchScript` | `D:\develop\ComfyUI\start_coo-gen.bat` |
| `launchArgs` | `-Service` |
| `stopScript` | `D:\develop\ComfyUI\stop_coo-gen.ps1` |
| `launchCwd` | `D:\develop\ComfyUI` |
| `launchWaitSeconds` | `120` |

- `start_coo-gen.bat` 会忽略旧的 `--port 8188` 参数，只把 `-Service` 传给 PowerShell；`-Service` 表示不自动开浏览器、不 pause。
- 插件的「一键启动」和桌宠的 `coo_gen_start` 都是启动后每 1.5 秒探测 `/system_stats`，最多等 `launchWaitSeconds`。
- 「关闭 ComfyUI」和 `coo_gen_stop` 运行 `stopScript`，并等待 `/system_stats` 变成离线。
- 不建议把 `launchScript` 直接指向裸 `.ps1`：在 Coopanion 的 Electron-as-Node 环境里，直接 spawn PowerShell 可能立即以 0 退出而没真正拉起服务；用 `.bat` 包一层最稳。停止脚本用 `.ps1` 没问题。
- `autoLaunch` 只会在插件启动、ComfyUI 离线且启动脚本存在时触发。

## 模型根目录

`modelsDir` 支持独立于 ComfyUI 安装目录的模型库，例如：

```text
D:\develop\ComfyUI\models\
  checkpoints\        ← 完整 checkpoint（内置文生图用）
  loras\              ← LoRA
  diffusion_models\   ← UNet / Diffusion 模型（需要 UNETLoader 工作流）
  vae\                ← 可选
  text_encoders\      ← 可选
```

根目录下直接放的 `.safetensors` 也会被扫描；如果文件头是 `blocks.*` 这类 UNet 权重（例如 `krea2_turbo_nvfp4.safetensors`），会归类为 **Diffusion/UNet**，不会出现在「模型（Checkpoint）」下拉里。内置「快速文生图」只支持完整 Checkpoint；这类模型需要导入对应的 Flux/Krea 等工作流。

### 让 ComfyUI 也读取这个目录

插件扫描不等于 ComfyUI 能加载。在 World 设置里填 `modelsDir`；同时让 `D:\develop\ComfyUI\ComfyUI\extra_model_paths.yaml` 的 `base_path` 指向这个模型根目录（本机已写入）。修改后**重启 ComfyUI** 生效。

启动后 `/object_info` 会列出 `checkpoints`、`loras`、`diffusion_models`；插件会把它和本地扫描合并。本地有、ComfyUI 没读到的模型会在 `coo_gen_status` 里提示。

## LoRA 体系

### 扫描与展示

- 递归扫描 `models/loras` 下的 `.safetensors` / `.ckpt` / `.pt` / `.pth`，深度上限 8，跳过隐藏目录。
- 分类 = 相对子目录（如 `角色/`、`风格/`）。
- 预览图按同名查找：`<name>.png`、`<name>.jpg`、`<name>.jpeg`、`<name>.webp`，以及 `<name>.preview.png` 等。
- 触发词来源：同名 `.json`（`trigger_words` / `trainedWords` / `trained_words`）、同名 `.txt`、safetensors `__metadata__` 里的 `ss_trigger_words` / `trigger_words` / `modelspec.trigger_phrase`；没有时退回 `ss_tag_frequency` 里最高频的 8 个 tag。
- `/object_info` 里有、磁盘扫描没有的 LoRA 也会列出来（没有预览）。

### 常驻 LoRA

- 每次出图自动加载；面板默认预选，可取消/改权重。
- 与对话匹配重复时取较高权重。
- 总数上限 `loraMaxCount`（默认 3）；超限时**对话匹配优先，淘汰默认**。
- 默认文件丢失时：回执/面板警告，静默跳过，不中断出图。

### 对话匹配

按顺序执行，全部命中的候选会去重后按置信度排序：

1. **别名表**：用户预设的中文 → LoRA 路径/文件名；命中别名置信度最高。
2. **文件名/分类**：用户话里的英文词、CJK 词与 LoRA 文件名/目录模糊匹配。
3. **触发词**：LoRA 的触发词出现在话里。
4. **LLM 语义**：对话模型在 `coo_gen` 的 `loras` 参数里显式点名；这是「让桌宠的模型从列表里挑」，不需要额外 LLM 服务。如果配置了 `translateUrl`，提示词翻译也会用同一个 OpenAI 兼容端点。

合并规则（与需求文档一致）：

```
最终列表 = 去重合并(默认 LoRA, 对话匹配)
同名 → 取较高权重
总数超上限 → 对话匹配优先，淘汰默认
```

示例：

| 默认 | 对话匹配 | 最终 |
|---|---|---|
| `soft_lighting(0.5)` | `zelda_botw(0.8)` | `zelda_botw(0.8) + soft_lighting(0.5)` |
| `anime_style(0.6)` | `anime_style(0.8)` | `anime_style(0.8)` |
| `a,b,c(0.5)` | `d(0.8), e(0.7)` | `d + e + a` |

### 注入工作流

不依赖模板里预先放 LoraLoader：找到 `CheckpointLoaderSimple`，在它的 `MODEL`/`CLIP` 输出后插入一条 LoraLoader 链，把所有下游引用改到链尾。已有 LoraLoader 会自然叠在新链后面。每个节点同时设置 `strength_model` 和 `strength_clip`。

## 工作流

### 内置模板

| id | 名称 | 说明 |
|---|---|---|
| `quick-txt2img` | 快速文生图 | Checkpoint → CLIP 正/反 → EmptyLatent → KSampler → VAE → SaveImage |
| `img2img` | 图生图 | 多一个 LoadImage + VAEEncode，KSampler 走 `denoise` |
| `controlnet` | ControlNet | LoadImage 控制图 + ControlNetLoader + ControlNetApplyAdvanced |
| `krea2-turbo-local` | Krea-2 Turbo（本机） | 本机导入预设：UNETLoader + CLIPLoader(type=krea2) + VAELoader + KSampler，固定 8 步 / CFG 1 / euler / simple；不需要 Checkpoint |

图生图/ControlNet 的输入图可以是本机绝对路径（提交前上传到 ComfyUI `/upload/image`），也可以是已经在 ComfyUI `input/` 里的文件名。

### 导入

- **API 格式**（ComfyUI「Save (API Format)」）：直接校验节点形状。
- **UI 格式**（默认「Save」）：读取 `nodes/links/widgets_values`，用 `/object_info` 的输入顺序还原 API 节点；离线时用内置常见节点 schema 兜底。`Reroute` 会透传，`Note` 会跳过，未知节点会跳过并给出 warning。
- 自动识别：checkpoint、KSampler 的 steps/cfg/seed/sampler/scheduler/denoise、正/反向提示词（从 KSampler 的 `positive`/`negative` 连线反查 CLIPTextEncode）、EmptyLatentImage 宽高/批次、LoadImage 输入图、ControlNetLoader。
- 识别不到的参数不会瞎猜；面板「工作流 → 详情」会列出实际映射。

## 对话入口

桌宠的环境提示词（`src/ENV_PROMPT.md`）会告诉它：什么时候用 `coo_gen`、怎么把英文 tag 放进 `prompt`、只能从列表里选 LoRA、后台任务完成后用 `coo_gen_result` 取图；ComfyUI 离线时可以询问后用 `coo_gen_start` 启动，用户明确要求关闭时用 `coo_gen_stop`，不要擅自启停。

### 工具

| 工具 | 用途 |
|---|---|
| `coo_gen` | 提交一次出图；`subject` 必填，`prompt/style_hint/extra_tags/loras/...` 可选；默认后台，`wait: true` 同步等结果。 |
| `coo_gen_start` | 用 `launchScript` 拉起本地 ComfyUI 并等到就绪；只在用户要求/同意时用。 |
| `coo_gen_stop` | 用 `stopScript` 关闭本地 ComfyUI；只在用户明确要求时用，出图中会拒绝。 |
| `coo_gen_result` | 查任务进度/取回附件；`history: true` 翻最近历史；`wait_seconds` 最多等 30 秒。 |
| `coo_gen_cancel` | 取消当前任务。 |
| `coo_gen_loras` | 搜索 LoRA（名称/别名/触发词/分类/常驻标记）。 |
| `coo_gen_status` | 查 ComfyUI 连接、模型、LoRA 数、输出目录、当前任务。 |
| `coo_gen_open_output` | 打开输出目录。 |

### 事件

- `coogen.done`：任务完成，带图片附件和 task id；桌宠用 `coo_gen_result` 取图并 `pet_say.images`。
- `coogen.failed`：ComfyUI 报错、超时或保存失败；让桌宠如实说明，不要假装画好。

### 示例

```
用户：发我一张塞尔达的图
桌宠：好呀，稍等我画一张~ 🎨
      [coo_gen 提交，回执 task …]
      [coogen.done 到达]
桌宠：画好啦，是你想要的塞尔达嘛？
      [预览图] [保存] [重画] [调细节]
```

```
用户：帮我画一张初音未来的赛博朋克风壁纸
桌宠：初音 + 赛博朋克，收到！
      [LoRA: hatsune_miku_v4(0.7) + cyberpunk_neon(0.8)]
```

```
用户：来张猫猫图
桌宠：[检测 ComfyUI 离线]
      欸…我的画笔还没准备好，你帮我启动一下 ComfyUI 好吗？
      [一键启动] [稍后再说]
```

## 输出与历史

- 默认目录：标准 Coopanion 布局下是 `D:\daily use\Coopanion\data\output`；其它部署是 `<部署数据目录>/output`。可在设置里用 `outputDir` 覆盖。
- 文件名：`{YYYYMMDD-HHmmss}_{seed}_{model}.png`；批次多张时追加 `_1`、`_2` 防覆盖。
- PNG 元数据：`coo-gen`（UTF-8 JSON：提示词、反向、模型、LoRA 及来源/权重、采样器、步数、CFG、宽高、批次、种子、工作流、task/prompt id、时间）；另写 A1111 风格的 `parameters` 和 `software`。中文自动用 `iTXt`，ASCII 用 `tEXt`；ComfyUI 原本的 `prompt`/`workflow` 块保留。
- 历史索引：`<部署数据目录>/coo-gen/history.json`，保留最近 `historyLimit` 条；只清索引不删图（World 页「存储」里可清）。
- 面板历史缩略图懒加载，点开看大图；「发送到桌宠」走桌宠的 `/api/image-bubble`。

## 异常处理

| 情况 | 行为 |
|---|---|
| ComfyUI 未启动 | 面板提示 + 一键启动；工具返回 `[offline]`，可以询问后用 `coo_gen_start`；不假装画好。 |
| 一键启动报错 | 先看 `D:\develop\ComfyUI\logs\comfyui-*.err.log`；确认 `launchScript` 指向 `start_coo-gen.bat`、`launchArgs` 为 `-Service`、`launchCwd` 为 `D:\develop\ComfyUI`。旧的 `.bat` 引号拼接 bug 已在 0.1.1 修复。 |
| 模型目录有文件但下拉为空 | 文件可能是 UNet/Diffusion（不是完整 Checkpoint）；或 ComfyUI 没读 `extra_model_paths.yaml`。检查 `modelsDir` 和 `extra_model_paths.yaml` 后重启 ComfyUI；Krea-2 请选「Krea-2 Turbo（本机）」工作流。 |
| 工作流报错 | 任务 `error` + `coogen.failed`；回执带 ComfyUI 的 `exception_message`。 |
| 显存不足 | 原样显示 ComfyUI 报错；建议降低分辨率/步数/批次。 |
| 生成超时 | 到 `timeoutSeconds` 取消任务并标记失败，提示降低参数。 |
| 翻译失败 | 原文直接作为 prompt，并给提醒。 |
| LoRA 未匹配 | 不加 LoRA，纯模型出图，不中断。 |
| LoRA 文件丢失 | 默认 LoRA 跳过并警告；对话匹配里找不到的显式 LoRA 跳过并警告。 |
| 默认与对话冲突 | 同名取高权重；超上限淘汰默认。 |
| 没有输出图节点 | 明确报错，避免“以为画好了”。 |

## 开发

```bash
pnpm install
pnpm typecheck   # 服务端 + WebUI 面板
pnpm test        # 61 个单元/集成测试
pnpm build       # dist/webui.js + dist/webui.css
pnpm describe    # 生成 describe.json
pnpm check       # manifest / 工具 / 配置 / 提示词 / describe 一致性
```

本包服务端只依赖 Node 内置模块（`fetch`、`WebSocket`、`FormData`、`Blob`），没有额外运行时依赖。浏览器面板只 `import type` 框架类型，运行时值全部来自本包。

## 隐私与安全

- 全本地：图片来自用户自己的 ComfyUI，保存到用户指定目录；除用户配置的翻译端点外不发送提示词。
- 启动脚本只运行用户明确填写且存在的路径；启动参数不经过 shell 拼接（`.bat` 除外，需要 cmd）。
- 面板读图只按历史索引 id 或 LoRA 预览相对路径；不暴露任意文件读取接口（本机选图预览只接受图片扩展名且 < 30 MB）。
- 翻译 Key 只从部署 `.env` 读取，不写进 `config.json`、`describe.json` 或日志。
