# -*- coding: utf-8 -*-
"""mix_two.py —— 把人声和伴奏按电平比例混起来。

用法: python mix_two.py 人声.wav 伴奏.wav 输出.wav [--vocal-db 2] [--sr 44100]

--vocal-db：人声比伴奏高多少 dB。默认 +2。
  高太多像配乐朗诵，低太多被伴奏埋。1~3 之间是正常区间。

做法：按「正在发声那段的 RMS」对齐电平，不是按整轨 RMS——
      整轨会被静音段稀释，量出来是错的。这是这条链上最容易犯的一个错。
"""
import argparse
import subprocess
import sys

import numpy as np


def read(path, sr):
    r = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-f", "f32le",
                        "-ac", "1", "-ar", str(sr), "-"],
                       capture_output=True)
    if r.returncode != 0 or not r.stdout:
        raise RuntimeError("读不了 %s: %s" % (path, (r.stderr or b"")[-200:]))
    return np.frombuffer(r.stdout, dtype=np.float32).copy()


def write(path, x, sr):
    x = np.clip(x, -1.0, 1.0).astype(np.float32)
    r = subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "f32le",
                        "-ar", str(sr), "-ac", "1", "-i", "-",
                        "-c:a", "pcm_s16le", path],
                       input=x.tobytes(), capture_output=True)
    if r.returncode != 0:
        raise RuntimeError((r.stderr or b"")[-300:].decode("utf-8", "replace"))


def active_rms(x, rel=0.02):
    """只量有声音的部分。整轨量会被静音稀释。"""
    if x.size == 0:
        return 0.0
    peak = float(np.abs(x).max())
    if peak <= 0:
        return 0.0
    m = np.abs(x) > peak * rel
    if not m.any():
        return float(np.sqrt(np.mean(x ** 2)))
    return float(np.sqrt(np.mean(x[m] ** 2)))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("vocal")
    ap.add_argument("inst")
    ap.add_argument("out")
    ap.add_argument("--vocal-db", type=float, default=2.0,
                    help="人声比伴奏高多少 dB，默认 2")
    ap.add_argument("--sr", type=int, default=44100)
    a = ap.parse_args()

    v = read(a.vocal, a.sr)
    i = read(a.inst, a.sr)

    n = max(len(v), len(i))
    v = np.pad(v, (0, n - len(v)))
    i = np.pad(i, (0, n - len(i)))

    rv, ri = active_rms(v), active_rms(i)
    print("人声 active RMS %.1f dBFS | 伴奏 %.1f dBFS"
          % (20 * np.log10(rv + 1e-12), 20 * np.log10(ri + 1e-12)))

    if rv <= 0:
        sys.exit("人声是静音的，换嗓那步可能没出东西")

    # 让 vocal 的 active RMS = inst 的 active RMS + vocal_db
    if ri > 0:
        target = ri * (10 ** (a.vocal_db / 20.0))
        g = target / rv
        v = v * g
        print("人声增益 %+.1f dB → 混完人声比伴奏高 %.1f dB"
              % (20 * np.log10(g), a.vocal_db))

    mix = v + i

    # 削峰：整条一起压，只压人声会让伴奏比例变掉
    peak = float(np.abs(mix).max())
    if peak > 0.95:
        cut = 0.95 / peak
        mix *= cut
        print("! 峰值 %.2f 超了，整条压 %.2f dB"
              % (peak, 20 * np.log10(cut)))

    write(a.out, mix, a.sr)
    print("写出 %s" % a.out)


if __name__ == "__main__":
    main()
