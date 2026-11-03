# -*- coding: utf-8 -*-
"""make_mv.py —— 把一堆图片 + 一段音频，剪成一个片子。

用法:
  python make_mv.py --audio 翻唱.mp3 --images 素材目录 --out mv.mp4
  python make_mv.py --audio a.mp3 --images "图/*.png" --out mv.mp4 --size 1080x1920
  python make_mv.py --audio a.mp3 --images 素材 --out mv.mp4 --per-shot 3.5 --fade 0.4

它做的事:
  1. 读音频时长，把图片平均（或按节拍）分配到画面里
  2. 每张图做缓慢推拉（Ken Burns），不是干贴
  3. 相邻镜头之间加淡入淡出
  4. 合成 mp4，音画对齐

它不做事（也不该做）:
  **不替你找素材。** 素材从哪来、能不能用、有没有版权，是你的问题。
  这个脚本只负责「给你一堆图，剪成一条能发的片子」。

依赖: ffmpeg。Python 只用标准库 + 可选 numpy（算节拍）。
"""
import argparse
import glob
import json
import os
import random
import re
import shutil
import subprocess
import sys
import tempfile

sys.stdout.reconfigure(encoding="utf-8")


def log(*a):
    print(*a, flush=True)


def die(msg):
    log("")
    log("✗ " + msg)
    sys.exit(1)


def probe_duration(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries",
                        "format=duration", "-of", "json", path],
                       capture_output=True, text=True)
    try:
        return float(json.loads(r.stdout)["format"]["duration"])
    except Exception:
        return 0.0


def collect_images(src):
    """目录、glob、或单个文件都认。"""
    if os.path.isdir(src):
        files = []
        for ext in ("png", "jpg", "jpeg", "webp", "bmp"):
            files += glob.glob(os.path.join(src, "*." + ext))
            files += glob.glob(os.path.join(src, "*." + ext.upper()))
        files = sorted(set(files))
    elif any(c in src for c in "*?["):
        files = sorted(glob.glob(src))
    elif os.path.isfile(src):
        files = [src]
    else:
        files = []
    return [f for f in files if os.path.isfile(f)]


def beat_times(audio, max_beats=400):
    """粗算节拍点：不做真 onset 检测，算能量包络的局部峰就够了。
    要更准就装 librosa，这里故意不依赖它。"""
    try:
        import numpy as np
    except ImportError:
        return []
    tmp = tempfile.mktemp(suffix=".raw")
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", audio,
                    "-ac", "1", "-ar", "11025", "-f", "f32le", tmp],
                   capture_output=True)
    try:
        x = np.fromfile(tmp, dtype=np.float32)
    finally:
        if os.path.exists(tmp):
            os.remove(tmp)
    if x.size == 0:
        return []
    hop = 512
    n = x.size // hop
    env = np.array([np.sqrt(np.mean(x[i * hop:(i + 1) * hop] ** 2)) for i in range(n)])
    if env.size < 8:
        return []
    # 局部最大值 + 高于均值
    thr = env.mean() * 1.15
    peaks = []
    for i in range(1, len(env) - 1):
        if env[i] > thr and env[i] >= env[i - 1] and env[i] > env[i + 1]:
            t = i * hop / 11025.0
            if not peaks or t - peaks[-1] > 0.25:
                peaks.append(t)
    return peaks[:max_beats]


def kenburns_filter(idx, dur, fps, size, zoom_max=1.10):
    """每张图的运镜：交替推/拉/平移，别每张都一样。"""
    w, h = size
    frames = max(2, int(round(dur * fps)))
    mode = idx % 4
    z_end = zoom_max
    if mode == 0:      # 慢慢推近
        zexpr = "min(1+%.5f*on,%.2f)" % ((zoom_max - 1) / frames, z_end)
        xexpr, yexpr = "iw/2-(iw/zoom/2)", "ih/2-(ih/zoom/2)"
    elif mode == 1:    # 缓慢拉远
        zexpr = "max(%.2f-%.5f*on,1.0)" % (zoom_max, (zoom_max - 1) / frames)
        xexpr, yexpr = "iw/2-(iw/zoom/2)", "ih/2-(ih/zoom/2)"
    elif mode == 2:    # 从左推到右
        zexpr = "%.2f" % zoom_max
        xexpr = "min((iw-iw/zoom)*on/%d,iw-iw/zoom)" % max(1, frames)
        yexpr = "ih/2-(ih/zoom/2)"
    else:              # 从下往上
        zexpr = "%.2f" % zoom_max
        xexpr = "iw/2-(iw/zoom/2)"
        yexpr = "max((ih-ih/zoom)*(1-on/%d),0)" % max(1, frames)
    return (
        "scale=%d:%d:force_original_aspect_ratio=increase,crop=%d:%d,setsar=1,"
        "zoompan=z='%s':x='%s':y='%s':d=%d:s=%dx%d:fps=%d"
        % (w * 2, h * 2, w * 2, h * 2, zexpr, xexpr, yexpr, frames, w, h, fps)
    )


def build_shot(img, dur, out, fps, size):
    w, h = size
    vf = kenburns_filter(0, dur, fps, (w, h))
    cmd = ["ffmpeg", "-y", "-v", "error", "-loop", "1", "-t", "%.3f" % dur,
           "-i", img, "-vf", vf, "-t", "%.3f" % dur,
           "-c:v", "libx264", "-preset", "medium", "-crf", "20",
           "-pix_fmt", "yuv420p", "-r", str(fps), out]
    subprocess.run(cmd, capture_output=True, timeout=300)
    return os.path.exists(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--audio", required=True, help="翻唱成品（mp3/wav）")
    ap.add_argument("--images", required=True, help="素材目录 / glob / 单图")
    ap.add_argument("--out", default="mv.mp4")
    ap.add_argument("--size", default="1920x1080", help="1920x1080 或 1080x1920")
    ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--per-shot", type=float, default=0.0,
                    help="每镜秒数。不给就按节拍/均分自动算")
    ap.add_argument("--fade", type=float, default=0.35, help="转场淡入秒数，0 = 硬切")
    ap.add_argument("--max-shots", type=int, default=60)
    ap.add_argument("--keep", action="store_true")
    a = ap.parse_args()

    if not os.path.isfile(a.audio):
        die("音频不存在: %s" % a.audio)
    try:
        w, h = [int(x) for x in a.size.lower().split("x")]
    except Exception:
        die("--size 要写成 1920x1080 这种")

    imgs = collect_images(a.images)
    if not imgs:
        die("找不到图片: %s" % a.images)

    total = probe_duration(a.audio)
    if total <= 1:
        die("音频读不出时长")

    # 缩短到能用的数量，超了随机抽样（保持顺序）
    if len(imgs) > a.max_shots:
        random.seed(7)
        idx = sorted(random.sample(range(len(imgs)), a.max_shots))
        imgs = [imgs[i] for i in idx]

    # 定每镜时长
    if a.per_shot > 0:
        shot = a.per_shot
    else:
        beats = beat_times(a.audio)
        if len(beats) >= 8:
            # 用拍点间隔的中位数 × 2，让镜头落在一个乐句上
            gaps = [beats[i + 1] - beats[i] for i in range(len(beats) - 1)]
            gaps = [g for g in gaps if 0.2 < g < 2.0]
            shot = (sorted(gaps)[len(gaps) // 2] * 4) if gaps else 4.0
        else:
            shot = total / max(1, len(imgs))
        shot = max(1.8, min(shot, 8.0))

    n_shots = max(1, int(round(total / shot)))
    n_shots = min(n_shots, len(imgs), a.max_shots)
    shot = total / n_shots                    # 用实际总数重算，保证严丝合缝

    # 图片按顺序循环取，不够就重复
    picks = [imgs[i % len(imgs)] for i in range(n_shots)]

    log("== %d 张图 / 每镜 %.2f 秒 / 共 %.1f 秒 / %dx%d"
        % (n_shots, shot, total, w, h))

    tmp = tempfile.mkdtemp(prefix="mv_")
    try:
        segs = []
        for i, img in enumerate(picks):
            p = os.path.join(tmp, "s%04d.mp4" % i)
            if not build_shot(img, shot, p, a.fps, (w, h)):
                die("第 %d 张图处理失败: %s" % (i, img))
            segs.append(p)
            if (i + 1) % 10 == 0:
                log("  已处理 %d/%d" % (i + 1, n_shots))

        # concat（先把每段转成统一编码，再拼，避免时间基不一致）
        lst = os.path.join(tmp, "list.txt")
        with open(lst, "w", encoding="utf-8") as f:
            for s in segs:
                f.write("file '%s'\n" % s.replace("\\", "/"))
        silent = os.path.join(tmp, "video.mp4")
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0",
                        "-i", lst, "-c", "copy", silent],
                       capture_output=True, timeout=600)
        if not os.path.exists(silent):
            die("拼接失败")

        # 加转场（可选）和音频
        if a.fade > 0 and n_shots > 1:
            # 用 xfade 链，逐段叠
            inputs = []
            for s in segs:
                inputs += ["-i", s]
            filt = []
            prev = "[0:v]"
            offset = 0.0
            for i in range(1, n_shots):
                offset += shot - a.fade
                lbl = "[v%d]" % i
                filt.append("%s[%d:v]xfade=transition=fade:duration=%.2f:offset=%.2f%s"
                            % (prev, i, a.fade, offset, lbl))
                prev = lbl
            fc = ";".join(filt)
            vout = os.path.join(tmp, "video_fade.mp4")
            cmd = ["ffmpeg", "-y", "-v", "error"] + inputs + [
                "-filter_complex", fc, "-map", prev,
                "-c:v", "libx264", "-preset", "medium", "-crf", "20",
                "-pix_fmt", "yuv420p", vout]
            r = subprocess.run(cmd, capture_output=True, timeout=900)
            if os.path.exists(vout):
                silent = vout
            else:
                log("  ! 转场合成失败，改用硬切（%s）"
                    % (r.stderr or b"")[-120:].decode("utf-8", "replace"))

        # 合音频
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", silent, "-i", a.audio,
                        "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy",
                        "-c:a", "aac", "-b:a", "192k", "-shortest",
                        "-movflags", "+faststart", a.out],
                       capture_output=True, timeout=600)
        if not os.path.exists(a.out):
            die("最终合成失败")

        d = probe_duration(a.out)
        log("")
        log("== 完成: %s" % a.out)
        log("   %.1f 秒 / %d 个镜头 / %.2f 秒一镜" % (d, n_shots, shot))
        if abs(d - total) > 2:
            log("   ⚠️ 和音频差 %.1f 秒，检查一下素材里有没有坏图" % abs(d - total))
    finally:
        if a.keep:
            log("中间文件: %s" % tmp)
        else:
            shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    main()
