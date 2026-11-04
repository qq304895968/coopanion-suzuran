# 铃兰 · Coopanion 形象包（suzuran）

明日方舟干员 **铃兰 (Suzuran, char_385_finlpp)** 的 Coopanion 桌宠形象包（manifest 2 / api 2）。

## 内容

- `figure.json` — 清单：id `suzuran`，一条皮肤轴 `outfit`（默认立绘 / 精英2 / 皮肤「雪霁」nian#11），
  14 个表情 + 18 个动作的词表，`can.walk: true`。
- `figure.js` — 入口，导出 `createSuzuranBody`：按所选皮肤绘制 1024×1024 立绘，眨眼/睡觉时切换
  闭眼版本，坐下时压扁，换皮肤时短暂交叉淡入。
- `tex/skin-{default,e2,xueji}.png` — 三套皮肤的完整立绘（透明底，脚贴底边）。
- `tex/skin-*-closed.png` — 对应的闭眼版本（眨眼/睡眠用）。
- `thumbs/` — 装扮页缩略图。
- `tools/render_spine.py` — 把 Arknights Spine JSON 渲染成 PNG 的小工具（本包未依赖它，留作素材处理记录）。

## 素材来源与许可

- 角色「铃兰」© Hypergryph / Yostar（明日方舟游戏内干员，prts.wiki/w/铃兰）。
- 立绘 PNG 取自游戏客户端公开文件，经 GitHub `fexli/ArknightsResource`（charpack/char_385_finlpp_*）
  与 `HX0922/ArknightsSpine`（Spine/char_385_finlpp）取得；精英2 立绘的背景用泛洪填充去除，
  雪霁皮肤的房间背景同样去除，仅保留角色本体。
- 形象包代码（figure.js / figure.json 结构）参考 Pal-AI-Lab/Coopanion（MIT）与 kkkaxin/coopanion-laboon-figure，本包代码以 MIT 发布。
- 本包为粉丝自制、非商业用途；游戏素材版权归原作者所有。

## 装入 Coopanion

把整个 `suzuran-figure/` 目录（或打包 zip）放进 Coopanion 数据目录的
`figures/suzuran/`，或在设置窗口「装扮」页点「导入」选择本目录，再把形象选为 `suzuran`。
