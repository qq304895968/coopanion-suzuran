# -*- coding: utf-8 -*-
"""pitch_match.py —— 量两个音频的基频中位数，算出换嗓该变几个半音。

用法: python pitch_match.py <源人声.wav> <角色参考.wav>
输出: shift=-2      （最后一行，给 shell 抓）

判断逻辑：
  变调 = 12 * log2(参考中位 / 源中位)，取最近整数
  参考比源高 → 正数（往上提）；反过来 → 负数

⚠️ 两个已知的坑，脚本会提示：
  1. 音高跟踪器会跳到二次谐波，两个中位比值接近 1.5 / 2.0 / 0.5 时要人工复核
  2. 参考里有说话不是唱歌，量的就是说话的基频，会偏

依赖: librosa（pip install librosa）
"""
import sys

try:
    import numpy as np
    import librosa
except ImportError:
    sys.exit("缺 librosa，pip install librosa")


def median_f0(path, fmin=65, fmax=1000):
    """拿有声部分的基频中位数。"""
    y, sr = librosa.load(path, sr=22050, mono=True)
    if y.size == 0:
        return None
    # pyin 比 yin 稳，代价是慢一些
    f0, voiced, _ = librosa.pyin(y, fmin=fmin, fmax=fmax, sr=sr,
                                 frame_length=2048, hop_length=256)
    f0 = f0[np.isfinite(f0) & (f0 > 0)]
    if f0.size < 20:
        return None
    return float(np.median(f0))


def main():
    if len(sys.argv) < 3:
        sys.exit("用法: pitch_match.py <源人声> <参考>")
    src, ref = sys.argv[1], sys.argv[2]

    a = median_f0(src)
    b = median_f0(ref)
    if not a or not b:
        print("量不到基频（可能太安静，或者完全是噪声）")
        sys.exit(1)

    print("源   基频中位 %.1f Hz" % a)
    print("参考 基频中位 %.1f Hz" % b)

    # 比值接近整数倍 → 多半量到了谐波
    ratio = b / a
    for k in (0.5, 1.5, 2.0, 2.5, 3.0):
        if abs(ratio - k) < 0.06:
            print("⚠️ 两个中位之比 %.2f，接近 %g ——"
                  "可能是音高跟踪器跳到了谐波上，人工听一遍再定" % (ratio, k))
            break

    shift = int(round(12 * np.log2(b / a)))
    print("")
    print("建议变调 %+d 半音" % shift)
    if shift <= -3:
        print("⚠️ 降得比较多。每降一个半音电味会重一点，能用升调就别用降调。")
    print("shift=%d" % shift)


if __name__ == "__main__":
    main()
