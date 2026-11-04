# 对话表情包：本地 fork + 跟随（说明）

## 现在装的是本地 fork

```
源码    F:\study\coopanion\emote-pics
链接    data\extensions\package.json → "link:F:/study/coopanion/emote-pics"
入口    data\extensions\node_modules\cortico-world-emote-pics → 指向上面的目录
```

商店升级/重装不会覆盖它；它不在 `resources/app` 里，应用升级也不会动它。
**只有你在扩展页手动点「更新/重装」才会把它换回商店版。**

`pnpm install` 装这个 link 会失败（supply-chain policy 拦 lockfile、随后要求 registry metadata），
所以 `node_modules` 入口是手工 junction；`package.json` 里保留 `link:` 是为了以后 pnpm 能接管。

## 行为（精简后）

- **一个父文件夹**：`worlds.emote-pics.dir`，里面按情绪建子文件夹（`happy` / `sad` / … 或中文名，英文优先）。
- **机械自动弹**：桌宠每句带 `【…】` 的气泡 → 概率 + 冷却 → 挑一张。
- **优先弹在桌宠身上**：`POST /api/image-bubble`（宿主补丁提供的接口）。
- **宿主没补丁时自动跟随**：走独立透明窗口，但先用截屏找角色位置（`src/follow.ts`，来自上游 0.4.x），
  把图摆到脚边；不再固定 0.86/0.66。找不到位置就退回固定位置并记日志。

## 配置

| 键 | 含义 | 默认 |
|---|---|---|
| `enabled` | World 开关 | `false` |
| `dir` | 父文件夹绝对路径 | 空 |
| `chance` | 每句气泡出图概率 0~1 | 0.5 |
| `cooldownSeconds` | 同一情绪两次出图的最小间隔 | 30 |
| `autoPopup` | 扫到标记就自己弹 | `true` |
| `popupEnabled` | 出图时弹在桌宠身上 | `true` |
| `popupDuration` | 停留秒数 | 8 |
| `popupSize` | 图片长边 px（0 = 自动） | 220 |
| `popupRadius` | 圆角 px | 16 |
| `popupFollow` | 回退窗口跟随角色位置 | `true` |

## 面板

- **表情文件夹**：父文件夹（选择/手填）、概率、冷却、自动弹开关，以及检测到的子文件夹与张数。
- **弹图**：弹在桌宠身上、**跟随**、停留、长边、圆角、立即测试、状态与日志路径。

## 工具

- `emote_pic({ emotion, force? })`：按概率挑一张作为附件（只显示在对话页）。
- `emote_popup_test()`：随机弹一张测试图。

## 已验证

- 扩展 `state=loaded`，从 fork 加载（0.3.0），面板资源 `webui-20261029-3.js`。
- 有宿主补丁时：`testPopup` 返回 200，弹图日志没有 `show path=`（走桌宠身上的气泡）。
- 把插件指向一个没人监听的端口模拟“补丁没了”：日志出现
  `follow-source: screen petX=0.05 ... block=(...187x231)` 和 `show ... follow=0.05`，
  页面日志 `[emote-popup] page-load follow` + `follow layout 170,964 120x120` —— 跟随生效。

## 内置桌宠补丁（可选，仍在用）

`resources/app/node_modules/cortico-world-desktop-pet` 三处：

- `src/server.ts`：`POST /api/image-bubble`（`{ dataUrl, duration, size, scale, radius }`，8 MiB）。
- `web/pet-app.js`：`image-bubble` + `addImageBubble()`，图片进 `lines` 气泡栈。
- `web/pet.css`：`.bubble.image` 去掉底色/描边/小尾巴。

应用升级会覆盖它们。覆盖后插件会自动落到「跟随窗口」，但那是**快照**：只按截屏那一刻的
`petX` 把窗口摆在角色脚边，走动就滞后、也不再是贴在身上的气泡——观感上就是“不跟随了”。

### 2026-10-30：0.2.16 更新冲掉了补丁（已重打）

升级到 0.2.16 覆盖了 `resources/app`，`/api/image-bubble` 消失，插件回退到跟随窗口
（弹图日志里出现 `show path=... follow=0.41`、`follow layout 908,964`）。
已按上面三处重新打上并重启，图回到桌宠的气泡栈。

以后每次应用升级后跑一次（幂等，已打过的会跳过）：

```powershell
powershell -ExecutionPolicy Bypass -File F:\study\coopanion\patch-pet-host.ps1
```

改完必须**整进程重启** Coopanion。脚本是 UTF-8 带 BOM，Windows PowerShell 5.1 也能跑。

## 重建面板

```powershell
$esb = 'D:\daily use\Coopanion\resources\app\node_modules\esbuild\bin\esbuild'
node $esb "F:\study\coopanion\emote-pics\src\webui\client.ts" --bundle --format=esm --minify --sourcemap --outfile="F:\study\coopanion\emote-pics\dist\webui-20261029-3.js"
```

换文件名才能绕开浏览器的一年 immutable 缓存。改 World 源码要重启 Coopanion。

## 回滚

- 回到商店版：把 `data/extensions/package.json` 里的 `link:F:/study/coopanion/emote-pics`
  改回 `0.3.0`，删掉 `node_modules/cortico-world-emote-pics` 这个 junction，再 `pnpm install`。
- 配置备份：`config.json.bak-simplify-20261029-224828`（精简前）、
  `config.json.bak-emotepics-prompt-20261029-221629`（改提示词前）。
- 宿主补丁本身没有备份；三处改动都在上面的说明里，可以按需重打。
