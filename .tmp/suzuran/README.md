# 铃兰 桌宠形象包（suzuran）

《明日方舟》干员 **铃兰 / 丽萨**（`char_358_lisa`）的桌面宠物形象包，供 Coopanion
（`cortico-world-desktop-pet`）使用。

- 模型来源：PRTS Wiki 干员页「干员模型」→ Spine 3.8 资源
  `https://torappu.prts.wiki/assets/char_spine/char_358_lisa/defaultskin/front/`
- 转换方式：解析 `.skel` / `.atlas` / `.png`，把骨架摆到 **Idle 动画首帧**，按插槽颜色的
  透明度取每个部件的世界顶点与 UV，软件光栅化烘焙成 `tex/*.png`；骨骼层级保留为
  `model.json` 的 `deformers`（以骨骼原点为转轴的旋转），运行时用 Canvas 2D 按骨骼角度重绘。
- 运行时不依赖 Spine 运行时，也不联网。

## 文件

| 文件 | 说明 |
| --- | --- |
| `figure.json` | 形象包清单（manifest 2 / api 2）：名称、介绍、服装轴、预设、22 个词汇、气泡配色 |
| `figure.js` | 形象工厂 `createSuzuranBody`：加载贴图，逐帧算骨骼角度并绘制 |
| `model.json` | 75 个部件的盒子 / 绘制顺序 / 所属骨骼，109 个骨骼变形器 |
| `tex/*.png` | 每个部件的贴图（3 px / 逻辑单位，约 1 MB） |
| `thumb.png` | 设置界面缩略图 |

## 安装

放到形象包目录（Windows 默认）：

```
D:\daily use\Coopanion\data\figures\suzuran\
```

保证 `...\figures\suzuran\figure.json` 存在，重新打开「设置 → 形象」即可看到「铃兰」。

## 会做什么

- 待机：呼吸、头部随光标轻转、九条尾巴与头发摆动、耳朵轻抖、随机眨眼
- 说话：嘴部轻微开合（铃兰的脸是一层层叠出来的，没有张嘴贴图，用嘴部部件纵向拉伸模拟）
- 走路 / 跑动：手臂与腿摆动
- 表情：平静、开心（眯眼）、眨眼、喜欢、惊讶（睁大）、害羞、难过、困、思考；
  眩晕时切换到模型自带的 `F_Face_Stun_*` 转圈眼
- 坐、睡：低头、闭眼（压扁眼部部件）

## 说明与授权

- 角色与美术资源版权归 **鹰角网络 / 明日方舟** 所有；模型数据整理自 **PRTS Wiki**。
  本形象包仅供个人非商业使用。
- 铃兰的 Spine 模型没有闭眼/张嘴的备选贴图（只有 Stun 转圈眼），所以眨眼是压扁眼部
  部件实现的，近看能看到眼白被压成一条线；动作是程序化摆动，不是游戏内 Idle 动画回放。
