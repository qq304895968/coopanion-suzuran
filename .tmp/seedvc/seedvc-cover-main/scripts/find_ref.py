# -*- coding: utf-8 -*-
"""find_ref.py —— 自动找角色的官方语音素材，切成一段可用的参考音频。

用法:
  python find_ref.py --char 镜华 --out ref30.wav
  python find_ref.py --query "镜华 台词" --out ref30.wav --max 8 --seconds 30
  python find_ref.py --char 镜华 --out ref30.wav --sep      # 顺手分离人声（要 pymss）

做的事:
  1. B站搜视频，按「像不像官方语音素材」打分排序
  2. 下音频
  3. 找有声段，切 3~9 秒的干净片段
  4. 拼到目标时长，响度归一

依赖: numpy, requests, ffmpeg, yt-dlp。没有 librosa/soundfile 也能跑。

⚠️ 拼出来的是「候选」，不是答案。最后一定要自己听一遍——
   混进来的可能是别的角色、旁白、或者带 BGM 的片段。
"""
import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time

sys.stdout.reconfigure(encoding="utf-8")

try:
    import numpy as np
    import requests
except ImportError as e:
    sys.exit("缺依赖: %s  →  pip install numpy requests" % e)

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120 Safari/537.36")

# 标题里出现这些词，多半真是语音素材
GOOD_WORDS = ["语音", "台词", "collection", "语音包", "全语音", "声线",
              "语音集", "对话", "cv", "voice", "语音合集", "登场"]
# 出现这些就别要了
BAD_WORDS = ["翻唱", "独唱", "唱见", "解说", "实况", "攻略", "战斗", "测评", "反应",
             "reaction", "教程", "混剪", "梗", "二创", "同人", "跳舞", "mmd", "mod"]


def log(*a):
    print(*a, flush=True)


def search(keyword, pages=2):
    """B站搜索，不需要 cookie。失败就返回空。"""
    s = requests.Session()
    s.headers.update({"User-Agent": UA, "Referer": "https://www.bilibili.com/"})
    out = []
    for p in range(1, pages + 1):
        r = None
        for attempt in range(3):
            try:
                r = s.get("https://api.bilibili.com/x/web-interface/search/type",
                          params={"search_type": "video", "keyword": keyword, "page": p},
                          timeout=20).json()
                break
            except Exception:
                time.sleep(1.5 * (attempt + 1))    # 翻页偶尔被风控，退避重试
        if not r:
            log("  第 %d 页没拿到（多半是限流），用前面几页继续" % p)
            continue
        if r.get("code") != 0:
            log("  第 %d 页 code=%s" % (p, r.get("code")))
            continue
        for x in ((r.get("data") or {}).get("result") or []):
            out.append({
                "bvid": x.get("bvid"),
                "title": re.sub(r"<[^>]+>", "", x.get("title") or ""),
                "play": x.get("play") or 0,
                "dur": parse_dur(x.get("duration") or ""),
                "author": x.get("author"),
            })
    return out


def parse_dur(s):
    """'2:30' / '1:02:03' → 秒"""
    try:
        parts = [int(x) for x in str(s).split(":")]
    except Exception:
        return 0
    sec = 0
    for p in parts:
        sec = sec * 60 + p
    return sec


def score(v, char):
    """给一个视频打分：越像「该角色的官方语音素材」分越高。"""
    t = v["title"].lower()
    s = 0.0
    if char and char.lower() in t:
        s += 3
    for w in GOOD_WORDS:
        if w in t:
            s += 1.2
    for w in BAD_WORDS:
        if w in t:
            s -= 2.5
    # 时长：太短没料，太长多半不是纯语音
    d = v["dur"]
    if 40 <= d <= 600:
        s += 1.5
    elif d < 20 or d > 1800:
        s -= 2
    # 播放量：太多是热门二创，太少没人验证过
    if 500 <= v["play"] <= 300000:
        s += 1
    return s


def download(bvid, outdir):
    """下音频到 outdir，返回 wav 路径。"""
    out = os.path.join(outdir, "%s.%%(ext)s" % bvid)
    cmd = [sys.executable, "-m", "yt_dlp", "-f", "bestaudio", "-x",
           "--audio-format", "wav", "--audio-quality", "0",
           "--no-playlist", "--quiet", "--no-warnings",
           "-o", out, "https://www.bilibili.com/video/%s" % bvid]
    r = subprocess.run(cmd, capture_output=True, text=True,
                       encoding="utf-8", errors="replace", timeout=300)
    p = os.path.join(outdir, bvid + ".wav")
    if os.path.exists(p):
        return p
    log("    下载失败:", (r.stderr or "")[-160:])
    return None


def to_mono16k(src, dst):
    r = subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", src,
                        "-ac", "1", "-ar", "16000", dst],
                       capture_output=True, text=True, timeout=180)
    return os.path.exists(dst)


def separate(src, outdir):
    """可选：调 pymss 把人声分出来。失败就原样返回。"""
    try:
        env = dict(os.environ)
        rvc = env.get("RVC", os.path.expanduser("~/ai_cover/RVC"))
        if not os.path.isdir(os.path.join(rvc, "tools", "pymss")):
            log("    没找到 pymss，跳过分离")
            return src
        env["PYTHONPATH"] = rvc
        cmd = ["python", "-m", "tools.pymss.cli", "infer", "1_HP-UVR.pth",
               "--download", "--source", "modelscope",
               "-i", src, "-o", outdir, "--device", "cuda", "--format", "wav"]
        subprocess.run(cmd, cwd=rvc, env=env, capture_output=True, timeout=900)
        base = os.path.splitext(os.path.basename(src))[0]
        cand = os.path.join(outdir, base + "_Vocals.wav")
        return cand if os.path.exists(cand) else src
    except Exception as e:
        log("    分离失败(%s)，用原音" % e)
        return src


def speech_segments(wav, noise_db=-32, min_sil=0.35):
    """用 ffmpeg silencedetect 找有声区间，返回 [(start, end), ...]。"""
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", wav,
                        "-af", "silencedetect=noise=%ddB:d=%s" % (noise_db, min_sil),
                        "-f", "null", "-"],
                       capture_output=True, text=True, timeout=300)
    txt = r.stderr or ""
    starts, ends = [], []
    for m in re.finditer(r"silence_start:\s*([\d.]+)", txt):
        starts.append(float(m.group(1)))
    for m in re.finditer(r"silence_end:\s*([\d.]+)", txt):
        ends.append(float(m.group(1)))
    dur = probe_dur(wav)
    segs = []
    # silence_start 之后的 silence_end 才是有声段开始
    for i, s in enumerate(starts):
        a = s
        b = ends[i] if i < len(ends) else dur
        if b > a:
            segs.append((a, b))
    # 开头没有 silence_start 的情况：0 → 第一个 silence_start
    if starts and starts[0] > 0.5:
        segs.insert(0, (0.0, starts[0]))
    return segs


def probe_dur(wav):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                        "-of", "default=nw=1:nk=1", wav],
                       capture_output=True, text=True, timeout=60)
    try:
        return float((r.stdout or "0").strip())
    except Exception:
        return 0.0


def pick_clips(wav, want=30.0, clip_min=3.0, clip_max=9.0, outdir=None):
    """挑出总长 ~want 的片段，返回切割后的文件列表。"""
    segs = speech_segments(wav)
    good = [(a, b) for a, b in segs if (b - a) >= clip_min]
    if not good:
        # 一段静音都没找到 = 全程有声音。多半是 BGM 铺满，或者这个视频就是一整段语音。
        # 先按固定长度切出候选，但必须提醒：没分离的话，切出来的会带着 BGM。
        dur = probe_dur(wav)
        step = 7.0
        fixed = [(i * step, min(i * step + 6.0, dur))
                 for i in range(max(1, int(dur // step)))]
        good = [(a, b) for a, b in fixed if (b - a) >= clip_min]
        if good:
            log("    ⚠️ 没检测到静音段（多半全程有 BGM）→ 按固定长度切；"
                "想干净就加 --sep 重跑")
    # 优先中等长度：太短的接不上气，太长的容易夹旁白
    good.sort(key=lambda x: abs((x[1] - x[0]) - 5.5))
    picks, total = [], 0.0
    for a, b in good:
        if total >= want:
            break
        # 一个长段切成好几块——整段是一口气说完的时候，不切就凑不够时长
        pos = a
        while pos < b and total < want:
            length = min(clip_max, b - pos)
            if length < clip_min:
                break
            picks.append((pos, length))
            total += length
            pos += length + 0.15          # 留一点缝，别把两句话拼成一个字
    out = []
    for i, (a, length) in enumerate(picks):
        p = os.path.join(outdir, "clip_%02d.wav" % i)
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-ss", "%.3f" % a,
                        "-t", "%.3f" % length, "-i", wav, "-ac", "1", "-ar", "16000", p],
                       capture_output=True, timeout=120)
        if os.path.exists(p):
            out.append(p)
    return out


def concat(clips, out, outdir, seconds=30.0):
    if not clips:
        return False
    lst = os.path.join(outdir, "list.txt")
    with open(lst, "w", encoding="utf-8") as f:
        for c in clips:
            f.write("file '%s'\n" % os.path.abspath(c).replace("\\", "/"))
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0",
                    "-i", lst, "-t", "%.1f" % seconds,          # 多了就裁掉
                    "-af", "loudnorm=I=-20:TP=-2:LRA=11",
                    "-ac", "1", "-ar", "16000", out],
                   capture_output=True, timeout=300)
    return os.path.exists(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--char", default="", help="角色名，用来搜和筛标题")
    ap.add_argument("--query", default="", help="自定义搜索词，默认『<角色> 语音』")
    ap.add_argument("--out", default="ref30.wav")
    ap.add_argument("--max", type=int, default=6, help="最多下几个视频")
    ap.add_argument("--seconds", type=float, default=30.0, help="参考音频目标时长")
    ap.add_argument("--sep", action="store_true", help="下载后先分离人声（要 pymss）")
    ap.add_argument("--keep", action="store_true", help="保留中间文件")
    a = ap.parse_args()

    if not a.char and not a.query:
        sys.exit("要么给 --char，要么给 --query")

    q = a.query or ("%s 语音" % a.char)
    log("== 搜: %s" % q)
    vs = search(q)
    if not vs:
        sys.exit("没搜到东西，换个关键词再试")

    # 翻页会把同一条视频重复捞回来，去重
    uniq, seen = [], set()
    for v in vs:
        if v["bvid"] and v["bvid"] not in seen:
            seen.add(v["bvid"])
            uniq.append(v)
    vs = uniq

    vs.sort(key=lambda v: score(v, a.char), reverse=True)
    log("== 候选（按像官方素材的程度排）")
    for v in vs[:a.max]:
        log("  %-14s %5d播放 %5d秒  %s" % (v["bvid"], v["play"], v["dur"], v["title"][:40]))

    tmp = tempfile.mkdtemp(prefix="findref_")
    all_clips = []
    try:
        for v in vs[:a.max]:
            if len(all_clips) * 6 >= a.seconds + 6:
                break
            log("== 下 %s" % v["bvid"])
            src = download(v["bvid"], tmp)
            if not src:
                continue
            mono = os.path.join(tmp, v["bvid"] + "_16k.wav")
            if not to_mono16k(src, mono):
                continue
            if a.sep:
                mono = separate(mono, tmp)
            clips = pick_clips(mono, want=a.seconds, outdir=tmp)
            log("    切出 %d 段" % len(clips))
            all_clips += clips

        if not all_clips:
            sys.exit("一个可用片段都没切出来——换个关键词，或者手动给素材")

        if not concat(all_clips, a.out, tmp, a.seconds):
            sys.exit("拼接失败")

        d = probe_dur(a.out)
        log("\n== 完成: %s" % a.out)
        log("   时长 %.1f 秒，%d 段拼成" % (d, len(all_clips)))
        log("\n⚠️ 这是候选，不是答案。戴耳机听一遍：")
        log("   · 是不是同一个角色在说话（可能混进旁白、别的角色）")
        log("   · 有没有 BGM 底噪（有就加 --sep 重跑）")
        log("   · 有没有一段是喊叫或者唱歌，那种当参考会带偏")
        log("   不合格就把某段删掉重拼，或者换 --query 再试。")
    finally:
        if not a.keep:
            shutil.rmtree(tmp, ignore_errors=True)
        else:
            log("中间文件留在: %s" % tmp)


if __name__ == "__main__":
    main()
