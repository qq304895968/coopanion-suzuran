# 第三方素材与许可 / Third-party notices

本形象包（下称"本包"）除了自己的代码，还打包了别人做的运行时和别人的美术资源。分开说明。

## 1. 角色与模型数据（美术）

- 角色「铃兰 / Suzuran」及本包 `skins/` 下的骨骼（`.skel`）、图集（`.atlas`）与贴图（`.png`）、
  以及 `thumbs/` 里由它们渲染出来的图片，版权归 **Hypergryph / Yostar**（游戏《明日方舟 / Arknights》）所有。
- 这些文件是游戏客户端里的资产，经 [fexli/ArknightsResource](https://github.com/fexli/ArknightsResource)
  公开的 Spine 资源取得。
- 本包**不主张**对这些美术资源的任何权利，也不提供任何商业授权；请仅在你对游戏素材的使用范围内使用，
  并遵守游戏与素材来源方的条款。若权利方有异议，删除本包即可。

## 2. Spine 运行时（代码）

- `spine38.js` 是把 Spine 3.8 的官方运行时（[EsotericSoftware/spine-runtimes](https://github.com/EsotericSoftware/spine-runtimes)，
  经由 TypeScript 移植 [pixi-filters/pixi-spine](https://github.com/pixi-filters/pixi-spine) 的 `@pixi-spine/base@4.0.4` /
  `@esotericsoftware/spine-core@3.8.99`）用 esbuild 打成的一个无依赖 ES 模块，**没有修改其行为**，
  只在文件头补了注释。
- Spine Runtimes 采用 **Spine Runtimes License Agreement**。摘要（以原协议为准）：
  用它做出来的应用需要一份有效的 Spine 编辑器授权；再分发时必须保留版权声明与协议文本。
  详见 <https://esotericsoftware.com/spine-runtimes-license>。
- 本包只在本地桌宠里渲染形象，不单独再分发这个运行时作为独立产品；如果你要把本包再分发出去，
  请自行确认上面这条协议对你的要求。

## 3. 平台与套件

- 形象包的清单格式、`web/kit/body.js` 契约、`web/figure-frame.js` 的加载方式来自
  [Pal-AI-Lab/Coopanion](https://github.com/Pal-AI-Lab/Coopanion)（AGPL-3.0-or-later）。
  本包只是按它公开的 figure api 2 契约实现一个形象，不包含该项目的代码。

## 4. 本包自己的代码

- `figure.js`、`gl.js`、`atlas.js`、`tools/*.mjs`、`model.json`、`model-data.js`、本文件与 `README.md`：
  **MIT**。
