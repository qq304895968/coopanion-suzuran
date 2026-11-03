#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""开发自检:拉起侧车,走一遍 /health → 假热键 → 长轮询 → /trigger → /quit。

跑法(在 coo-screen 目录下):
    python sidecar/selftest.py

不需要人按键盘:它往侧车的消息队列里投一个 WM_HOTKEY,走的和真热键完全同一条分支。
"""

import ctypes
import json
import os
import subprocess
import sys
import time
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
SIDECAR = os.path.join(HERE, "screen_sidecar.py")
WM_HOTKEY = 0x0312
HOTKEY_ID = 0xB10C


def call(method: str, url: str, timeout: float = 40) -> dict:
    req = urllib.request.Request(url, method=method)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def main() -> int:
    proc = subprocess.Popen(
        [sys.executable, "-u", SIDECAR, "--port", "0", "--hotkey", "ctrl+alt+q",
         "--max-edge", "1600", "--feedback", "sound,toast"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding="utf-8",
    )
    assert proc.stdout is not None
    line = proc.stdout.readline().strip()
    print("[ready]", line)
    info = json.loads(line)
    base = f"http://127.0.0.1:{info['port']}"

    health = call("GET", base + "/health")
    print("[health] hotkey=%r err=%r thread=%s feedback=%s" % (
        health["hotkey"], health["hotkeyError"], health["threadId"], health["feedback"]))

    idle = call("GET", base + "/idle")
    print("[idle] %d ms" % idle["idleMs"])

    if health["hotkeyError"]:
        print("[FAIL] 热键注册失败:", health["hotkeyError"])
        call("POST", base + "/quit")
        return 1

    # 1) 假热键:投 WM_HOTKEY 到侧车的消息队列,再长轮询等它
    started = time.time()
    progress = proc
    user32 = ctypes.WinDLL("user32", use_last_error=True)
    user32.PostThreadMessageW.argtypes = [ctypes.c_ulong, ctypes.c_uint, ctypes.c_ulonglong, ctypes.c_longlong]
    ok = user32.PostThreadMessageW(health["threadId"], WM_HOTKEY, HOTKEY_ID, 0)
    print("[post] WM_HOTKEY ->", bool(ok))
    frame = call("GET", base + "/wait?after=0&timeout=20")
    print("[hotkey] %s (%d ms)" % ({k: frame.get(k) for k in ("ok", "reason", "width", "height", "monitor", "bytes", "ms")}, int((time.time() - started) * 1000)))
    if not frame.get("ok"):
        print("[FAIL] 热键截图失败:", frame.get("error"))
        call("POST", base + "/quit")
        return 1

    png = open(frame["path"], "rb").read()
    sig = png[:8]
    width, height = int.from_bytes(png[16:20], "big"), int.from_bytes(png[20:24], "big")
    print("[png] sig=%r ihdr=%dx%d file=%d B" % (sig, width, height, len(png)))

    # 2) /trigger 同一条抓屏路径,但不点火(不给 /wait 制造重复事件)
    tool = call("POST", base + "/trigger")
    print("[trigger]", {k: tool.get(k) for k in ("ok", "width", "height", "bytes", "ms")})

    # 3) after=seq 时应该超时返回空
    empty = call("GET", base + "/wait?after=%d&timeout=1" % frame["seq"])
    print("[empty]", empty)

    call("POST", base + "/quit")
    try:
        proc.wait(timeout=10)
    except subprocess.TimeoutExpired:
        proc.kill()
    print("[done] exit=%s" % proc.returncode)
    return 0 if (frame.get("ok") and tool.get("ok") and empty.get("empty")) else 1


if __name__ == "__main__":
    raise SystemExit(main())
