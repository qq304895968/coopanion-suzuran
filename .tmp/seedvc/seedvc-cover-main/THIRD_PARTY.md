# 这个插件用了谁的东西

插件本身的脚本（`cover.sh` / `pitch_match.py` / `mix_two.py` / `audio_info.py` / `find_ref.py`）
是 MIT。下面这些是别人的，按各自的许可证使用。

## 必须自己安装的（本插件不分发）

| 项目 | 许可 | 用在哪 | 链接 |
|---|---|---|---|
| **Seed-VC** | **GPL-3.0** | 换嗓引擎，第 3 步 | github.com/Plachta/Seed-VC |
| RVC / Retrieval-based-Voice-Conversion-WebUI | MIT | 分离工具 pymss 宿主、RVC 模型 | github.com/RVC-Project/Retrieval-based-Voice-Conversion-WebUI |
| pymss | MIT | 人声分离，第 1 步 | 随 RVC 仓库提供 |
| UVR 模型 `1_HP-UVR.pth` | 见 UVR 项目 | 分离模型，脚本自动从 modelscope 下 | github.com/Anjok07/ultimatevocalremovergui |

## Python 依赖

| 包 | 许可 |
|---|---|
| numpy | BSD-3-Clause |
| librosa | ISC |
| requests | Apache-2.0 |

## 外部程序

| 程序 | 许可 | 说明 |
|---|---|---|
| ffmpeg | LGPL-2.1+ / GPL-2+（看编译选项） | 切音频、变调、混音、出片 |
| yt-dlp | Unlicense | `find_ref.py` 下载素材 |

---

## ⚠️ 关于 Seed-VC 的 GPL-3.0

**Seed-VC 是 GPL-3.0，是有传染性的许可证。**

这个插件**不分发 Seed-VC 的代码或权重**，只是让使用者自己 `git clone`。
插件调用它时走的是 `subprocess` 跑一个独立程序，不是链接它的库——
这种情况下两边是「聚合」，插件本身可以保持 MIT。

**但如果你要改这个插件并分发**，注意别踩这三条：

1. **不要把 Seed-VC 的代码或权重打包进插件**。一旦打包分发，整个分发包就要按 GPL-3.0 走。
2. **不要复制 Seed-VC 的源码片段**进自己的脚本。调用接口没问题，抄代码就变成衍生作品了。
3. 说明书里让使用者自己去克隆，是安全做法，保持这样。

Seed-VC 的**模型权重**在 HuggingFace 上有单独的条款，用之前自己看一眼。

## 参考音频

`assets/ref_default.wav` 是这个插件自带的预设音色样例，用来让使用者装完就能跑通。
**换成任何角色的音频前，先确认你有权使用那段素材**——角色音色通常归原作品方或配音演员，
公开发布翻唱前请自行判断合规性。
