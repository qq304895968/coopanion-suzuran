# cortico-world-coo-draw

Coopanion 桌宠的「画室」：把原来的 **API 绘画**（原 `cortico-world-pet-draw`）和 **本地出图**（原 `cortico-world-coo-gen`）合并成一个 World，一个入口、两个页签，并且让「桌宠主动画」和「日记配图」各自选择画法。这两个独立包已不再单独发布。日记里的画仍然保持铃兰的人设笔触。

- **API 绘画**：千问 `qwen-image-3.0`，固定 512×512，画风由人设决定；画完弹图、问评价、收进画夹。
- **本地出图**：借你的 ComfyUI，模型 / LoRA / 工作流 / 采样参数自己选，结果进自己的目录和历史。
- 两个页签：`API 绘画`（画夹、画风、额度）与 `本地出图`（出图、LoRA 管理、工作流）。
- 两处路由：`routePet`（桌宠主动画）和 `routeDiary`（日记配图），各自 `api` / `local`，严格按配置执行，不回退。
- 人设本地笔触：独立于用户工作室的一套预设（Krea2 + 可选 LoRA + 固定 512×512 × 1 张），提示词仍按人设画风生成。
- 参考图两种方式：**先写提示词**（铃兰看参考图 → 写一句画什么 → 再画）或 **图生图**（参考图直接重绘）。

## 为什么合并

| | API 绘画 | 本地出图 |
|---|---|---|
| 视角 | 桌宠角色 | 用户本人 |
| 画风 | 人设决定（蜡笔/铅笔…） | 用户选模型、LoRA、参数 |
| 出图方式 | 云端千问 | 本地 ComfyUI |
| 结果 | 画夹 / 日记 | 用户自己的输出目录 |
| 触发 | 桌宠主动画、日记配图 | 对话点单、面板手动 |

合并后两者共用画夹、评价、气泡和额度计数；本地人设出图也走同一套画夹和 `petdraw.drawn`，所以日记、评价和旧图回看都不受影响。

## 两个页签

### API 绘画

- 画夹面板：当前目录、各评价数量、打开/选择/复制/刷新（沿用原 `pet-draw` 面板）。
- 画风与额度：画风下拉、自定义画风说明、每天最多几张；两处路由的当前指向只读显示。
- 额度：今天还能画几张、每次上限；API 限流来自千问，本地路线不吃这个额度。

### 本地出图

一个页签内用分段器切换：

- **出图**：连接、模型、LoRA、采样参数、进度、预览、最近 50 张、一键启动/关闭。
- **LoRA 管理**：常驻组合、别名、触发词、分类、预览。
- **工作流**：内置文生图/图生图/ControlNet/Krea2，以及导入 ComfyUI 的 API 或 UI 格式 JSON。

原来的三块面板在「本地出图」页签里用分段器切换；调用时方法名加 `studio.` / `loras.` / `workflows.` 前缀转发给原实现。Coopanion 0.2.16 的 `normalizePanelDecls` 会丢掉 panel 的 `slot`，所以这里不依赖 `mountSlot`。

## 路由

World 设置里有两个下拉（`worlds.draw.routePet` / `worlds.draw.routeDiary`）：

| 值 | 含义 |
|---|---|
| `api` | 千问 API，512×512，人设画风 |
| `local` | 本地 ComfyUI，人设笔触预设，512×512 × 1 张 |

- **严格**：选本地但 ComfyUI 没开、或选 API 但没 Key，就如实报错，不会偷偷换另一种。
- 桌宠在对话里被要求「以后日记配图用本地」时，可以调 `pet_draw_settings` 改 `routeDiary`；路由只会在当前对话明确要求时改。
- 日记插件调用 `pet_draw` 时必须带 `purpose: "diary"`，才会命中 `routeDiary`；平时画画默认 `purpose: "pet"`。

## 人设笔触（本地）

`worlds.draw.persona*` 是一套独立于「本地出图」用户参数的预设：

- 内置工作流 `persona-krea2`：`UNETLoader`（Krea2）+ `CLIPLoader`（Qwen3-VL）+ `VAELoader` + 正/负提示词 + `EmptyLatentImage` 512×512 + `KSampler` + `VAEDecode` + `SaveImage`。
- 模型文件名、步数、CFG、采样器、调度器、LoRA、负面词、补充提示词都可配；默认 Krea2 Turbo 8 步 / CFG 1 / euler / simple。
- LoRA 用 `文件名:权重` 一行字符串，最多 3 个；按 UNET/CLIP 分离加载器注入，不改用户的工作流。
- 提示词是混合的：中文说明「画什么、什么气质、什么不能出现」，英文 tag 钉住手绘笔触（蜡笔/铅笔/…）。
- 参考图：
  - `describe`（默认）：`pet_draw` 先把参考图作为附件交回并回 `[need-prompt]`，铃兰看过之后写一句 `prompt`，再调用一次。插件拿不到对话模型，所以这一步必须由铃兰完成。
  - `img2img`：参考图上传 ComfyUI，按 `personaImg2imgDenoise` 重绘；适合「照这个构图，但用铃兰的笔触」。
- 画出来的图仍然进画夹、弹气泡、推 `petdraw.drawn`、可评价；不会套用用户工作室的模型/LoRA/尺寸。

> 质量取决于本地模型。Krea2 + 现有 LoRA 能做出手绘感，但和千问的蜡笔仍会有差别；先把预设跑顺，再按反馈调提示词、LoRA 或换模型。

## 配置

```jsonc
{
  "worlds": {
    "draw": {
      "enabled": true,
      "routePet": "api",
      "routeDiary": "api",

      // API / 人设共用
      "style": "crayon",
      "customStyle": "",
      "dailyLimit": 20,
      "maxImagesPerCall": 1,
      "cooldownSeconds": 20,
      "saveDir": "F:\\虚拟桌宠\\铃兰\\画",
      "budgetCny": 0,
      "popupEnabled": true,
      "popupSeconds": 5,
      "popupScale": 1,
      "referenceSearch": true,
      "referenceScreen": true,

      // 本地出图（前缀 local）
      "localUrl": "http://127.0.0.1:8188",
      "localComfyDir": "D:\\develop\\ComfyUI\\ComfyUI",
      "localModelsDir": "D:\\develop\\ComfyUI\\models",
      "localOutputDir": "F:\\虚拟桌宠\\铃兰\\出图",
      "localDefaultWorkflow": "quick-txt2img",
      "localWidth": 768,
      "localHeight": 1152,
      "localSteps": 20,
      "localCfg": 7,
      "localNegativePrompt": "low quality, blurry, bad anatomy",
      "localPromptPrefix": "masterpiece, best quality",
      "localPopupEnabled": true,
      "localPopupSeconds": 6,
      "localPopupScale": 0.8,
      "localLaunchScript": "D:\\develop\\ComfyUI\\start_coo-gen.bat",
      "localLaunchArgs": "-Service",
      "localLaunchCwd": "D:\\develop\\ComfyUI",
      "localStopScript": "D:\\develop\\ComfyUI\\stop_coo-gen.ps1",

      // 人设笔触（本地）
      "personaWorkflow": "persona-krea2",
      "personaUnet": "krea2_turbo_nvfp4.safetensors",
      "personaClip": "qwen3vl_4b_fp8_scaled.safetensors",
      "personaVae": "qwen_image_vae.safetensors",
      "personaSteps": 8,
      "personaCfg": 1,
      "personaSampler": "euler",
      "personaScheduler": "simple",
      "personaLoras": "",
      "personaNegative": "照片, 写实, 3D, 高清, 摄影, 粗糙, 文字, 水印, 签名, 边框",
      "personaExtraPrompt": "",
      "personaReferenceMode": "describe",
      "personaImg2imgDenoise": 0.55
    }
  }
}
```

- 配置 schema 只支持标量，所以 LoRA 列表是字符串；常驻 LoRA、别名、工作流文件仍存在 `<dataDir>/coo-gen/`。
- 所有键都是热读的；改完下一次调用立即生效。API Key 只从部署 `.env` 的 `QWEN_API_KEY` 读，不写进 config。
- `local*` 只影响「本地出图」页，不影响人设笔触；`persona*` 只影响人设场景（route=local 时）。

## 旧配置与数据

- 首次启动从 `worlds.pet-draw` / `worlds.coo-gen` 迁移到 `worlds.draw`：只补仍是默认值的键，旧配置保留；迁移标记在 `<dataDir>/draw-migrated.json`，只跑一次。
- 画夹默认仍是 `<dataDir>/pet-draw`；本地设置、历史和工作流仍是 `<dataDir>/coo-gen/`。旧图、旧历史、旧 LoRA 设置都不动。
- 日记读画夹时优先 `worlds.draw.saveDir`，旧 `worlds.pet-draw.saveDir` 仍兼容；默认目录不变。
- 旧的 `pet-draw` / `coo-gen` 包已从工作区删除，本包是绘图唯一实现；部署里若还装着它们，停用并卸下扩展链接即可，画夹与本地数据目录都不动。

## 工具

| 工具 | 用途 |
|---|---|
| `pet_draw` | 画 1–4 张；`purpose`（pet/diary）决定路由；点名人物时可带参考参数；本地参考图可先写提示词或图生图。 |
| `pet_draw_rate` | 记评价并按 favorite / like / neutral / dislike 归档。 |
| `pet_draw_gallery` | 按评价、关键词或 id 翻画夹，可把图作为附件交回。 |
| `pet_draw_settings` | 改两处路由、每日上限、每次上限、画夹目录、月度预算。 |
| `pet_draw_quota` | 查今天还能画几张、千问限流和预算折算；只按张数回答。 |
| `coo_gen` | 用本地 ComfyUI 出用户自己的图，后台任务 + `coogen.done`。 |
| `coo_gen_start` / `coo_gen_stop` | 用配置的脚本启停 ComfyUI。 |
| `coo_gen_result` / `coo_gen_cancel` | 取回任务/历史，取消任务。 |
| `coo_gen_loras` / `coo_gen_status` | 查 LoRA、连接、模型、输出目录。 |
| `coo_gen_open_output` | 打开输出目录。 |

## 事件

- `petdraw.drawn`：人设画保存后（API 或本地都发），提醒桌宠展示、问评价、顺着画聊。
- `coogen.done`：本地出图任务完成，提醒桌宠取回附件展示。
- `coogen.failed`：本地出图失败，提醒如实说明。

## 装进 Coopanion

1. 在 `data/extensions/package.json` 的 `dependencies` 里加 `"cortico-world-coo-draw": "link:F:/study/coopanion/coo-draw"`，并确保 `node_modules/cortico-world-coo-draw` 指向本目录（pnpm 或 junction 均可）。
2. 重启 Coopanion（扩展代码只在启动时加载）。
3. 到「World 总览」启用「画室」；把旧的「绘画」「出图」停用。
4. 打开左栏 World →「画室」，确认两个页签都在；API Key 在部署 `.env` 的 `QWEN_API_KEY`，ComfyUI 连接在「本地出图」页填。

## 开发

需要 Node ≥ 22（`registerHooks`）。本机可直接用 Coopanion 自带的 Node：

```powershell
$env:ELECTRON_RUN_AS_NODE='1'
& 'D:\daily use\Coopanion\Coopanion.exe' "<path>\tsx\dist\cli.mjs" scripts/describe.ts
```

```bash
pnpm typecheck   # 服务端 + WebUI 面板
pnpm test        # 161 个测试（含合并层路由/参考图/工作流）
pnpm build       # dist/webui.js + dist/webui.css
pnpm describe    # describe.json
pnpm check       # manifest / 工具 / 配置 / 提示词 / describe 一致性
```

人设笔触对照图（需要 ComfyUI 已启动；只写 `.preview/persona-samples`，不动真实画夹）：

```bash
corepack pnpm tsx scripts/persona-samples.ts          # 只列计划
corepack pnpm tsx scripts/persona-samples.ts --run    # 真出图
```

## 隐私与限制

- API 路线只发 `subject` 与固定画风提示词，不发对话历史、人设原文或文件；参考图只在本机内存/临时文件里，用完即删。
- 本地路线只把提示词、参考图和参数发给本机 ComfyUI；`coo_gen` 的翻译端点按配置。
- 只画图：不做视频、动画、高清图、照片级写实、改图/修图。API 路线固定 512×512；本地面板按用户参数。
- 人设本地路线固定 512×512、最多 4 张（默认 1），不吃千问额度，但受共用每日上限和冷却约束。
- 本地参考图 `describe` 模式需要铃兰真的看一眼参考图；如果她没写 `prompt`，不会假装画过。

## License

MIT。
