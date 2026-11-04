# 对话表情包：本地 fork（跟随，不改宿主）

这是 `cortico-world-emote-pics` 的本地副本，直接从 Coopanion 的扩展目录链接进来。
应用升级、商店的自动更新都不会覆盖它；**只有你在扩展页手动点「更新/重装」才会把它换回商店版**。

## 安装方式

```
data/extensions/package.json
  "cortico-world-emote-pics": "link:F:/study/coopanion/emote-pics"

data/extensions/node_modules/cortico-world-emote-pics
  → junction 到 F:\study\coopanion\emote-pics
```

用 `pnpm install` 装这个 link 会失败（pnpm 的 supply-chain policy 拦 lockfile，然后要求 registry metadata），所以依赖入口是手工建的 junction；`package.json` 里保留 `link:` 是为了以后 pnpm 能接管。

## 行为

- **一个父文件夹**：`dir`，里面按情绪建子文件夹（`happy` / `sad` / … 或中文名）。
- **机械自动弹**：桌宠每说一句带 `【…】` 的气泡，扩展按概率 + 冷却挑一张。
- **优先弹在桌宠身上**：`POST http://127.0.0.1:<desktop-pet.port>/api/image-bubble`。
  这个接口是宿主补丁提供的；宿主没有补丁（例如应用升级后）时返回 404/409。
- **回退时跟随**：走独立的透明窗口，但先用 `src/follow.ts` 截屏找桌宠位置（`petX`），
  把图摆在她脚边（左右按位置自动选），不再用固定的 0.86/0.66。
  截屏思路来自上游 0.4.x：截屏幕底部一条、按颜色块找角色、2.5 秒缓存。
- 局限：只对同一块屏有效；角色走动时位置是“上一秒”的；深色背景/换肤可能认不出，
  认不出就退回固定位置（日志会写 `follow-source: ... failed`）。

## 配置（`worlds.emote-pics`）

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
| `popupFollow` | 回退到独立窗口时跟随角色位置 | `true` |

## 工具

- `emote_pic({ emotion, force? })`：按概率挑一张作为附件交给这次对话（只显示在对话页）。
- `emote_popup_test()`：不经过面板，随机弹一张测试图。

## 重建面板

```powershell
$esb = 'D:\daily use\Coopanion\resources\app\node_modules\esbuild\bin\esbuild'
node $esb "F:\study\coopanion\emote-pics\src\webui\client.ts" --bundle --format=esm --minify --sourcemap --outfile="F:\study\coopanion\emote-pics\dist\webui-20261029-3.js"
```

改 World 源码要重启 Coopanion；只改面板客户端不用。换文件名可以绕开浏览器的一年 immutable 缓存。

## 宿主补丁（可选，仍在用）

图片弹在桌宠身上这条快路径需要内置 `cortico-world-desktop-pet` 的三处补丁
（`/api/image-bubble` 路由、`addImageBubble`、`.bubble.image` 样式）。它在
`resources/app` 里，应用升级会被覆盖；覆盖之后的退路就是上面的跟随，不会失效，
但那条退路是“快照”，走动时会滞后。

升级后重新打补丁（幂等，已打过的跳过）：

```powershell
powershell -ExecutionPolicy Bypass -File F:\study\coopanion\patch-pet-host.ps1
```

改完**整进程重启** Coopanion。0.2.16 升级冲掉过一次，已重打。

## 排查

1. `core.log` 里搜 `emote-pics`：每条气泡应出现 `自动弹图`。
2. 出现 `core/world-failed: World 读取失败,已卸载: emote-pics` 就是 World 被踢出挂载
   （**踢出后不会自己回来，必须重启**）。第一次精简时漏了 `World.envPromptVars()`，
   前缀重建时会抛 `mod.envPromptVars is not a function`；现已补成 `return null`。
   `World` 接口里 `envPromptVars` / `tools` / `start` / `stop` 都是必须的。
3. `/api/extensions` 里 `state` 必须是 `loaded`；`spec` 应是 `link:F:/study/coopanion/emote-pics`。
4. 面板「立即弹一张测试图」：有宿主补丁时 `emote-pics-popup.log` 里**不该**出现新的
   `show path=`；出现说明退回独立窗口了，看有没有 `follow-source: ...` 定位日志。
5. 气泡不带 `【…】` 标记时不会弹——这是设计，不是故障。
