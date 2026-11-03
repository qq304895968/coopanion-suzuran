# -*- coding: utf-8 -*-
"""audio_info.py —— 打印一个音频的时长（秒），给 shell 用。

用法: python audio_info.py 文件
输出: 12.34
"""
import json
import subprocess
import sys


def main():
    if len(sys.argv) < 2:
        print("0")
        return
    r = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "json", sys.argv[1]],
        capture_output=True, text=True)
    try:
        d = json.loads(r.stdout or "{}")
        print("%.2f" % float((d.get("format") or {}).get("duration") or 0))
    except Exception:
        print("0")


if __name__ == "__main__":
    main()
