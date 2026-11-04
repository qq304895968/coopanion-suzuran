#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Coopanion「看一眼」侧车:全局热键 + 抓一帧屏幕。

Cortico World 是 Node 进程,拿不到全局热键,也没有抓屏能力,所以按 asr_sidecar 的
同一套路把这件事放到一个独立进程里做:

    python screen_sidecar.py --port 0 --hotkey ctrl+alt+q --monitor cursor

热键传空串 = 不注册热键(只靠 `/trigger` 被调用,比如双击桌宠那种触发)。

启动后往 stdout 打一行 JSON 说明自己听在哪:
    {"port": 51234, "hotkey": "ctrl+alt+q", "monitor": "cursor"}
热键注册失败时那行里多一个 "hotkeyError",进程照常活着(/trigger 仍可用)。

HTTP(只监听 127.0.0.1):
    GET  /health                 就绪状态、热键、上一次截图
    GET  /wait?after=N&timeout=25  长轮询:等到第 N 次之后的新一帧再返回
    GET  /idle                   距上一次键鼠输入多少毫秒(给"主动看一眼"判断人在不在)
    POST /trigger                马上抓一帧并返回(给 screen_look 工具用)
    POST /quit                   退出

即时反馈(`--feedback sound,toast`):按键先出声、抓完再在光标旁冒 1.4 秒的小提示。
顺序不能反——提示框会进截图。

依赖:只用标准库(ctypes + zlib + winsound + tkinter)。不装 Pillow,不装 mss,不需要 pip。
"""

from __future__ import annotations

import argparse
import ctypes
import json
import os
import struct
import sys
import tempfile
import threading
import time
import traceback
import zlib
from ctypes import wintypes
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

# --------------------------------------------------------------------------- #
# Win32
# --------------------------------------------------------------------------- #

user32 = ctypes.WinDLL("user32", use_last_error=True)
gdi32 = ctypes.WinDLL("gdi32", use_last_error=True)

SRCCOPY = 0x00CC0020
HALFTONE = 4
DIB_RGB_COLORS = 0
BI_RGB = 0
MONITOR_DEFAULTTONEAREST = 2
WM_HOTKEY = 0x0312
WM_QUIT = 0x0012

MOD_ALT = 0x0001
MOD_CONTROL = 0x0002
MOD_SHIFT = 0x0004
MOD_WIN = 0x0008
MOD_NOREPEAT = 0x4000

HOTKEY_ID = 0xB10C


class POINT(ctypes.Structure):
    _fields_ = [("x", wintypes.LONG), ("y", wintypes.LONG)]


class RECT(ctypes.Structure):
    _fields_ = [
        ("left", wintypes.LONG),
        ("top", wintypes.LONG),
        ("right", wintypes.LONG),
        ("bottom", wintypes.LONG),
    ]


class MONITORINFO(ctypes.Structure):
    _fields_ = [
        ("cbSize", wintypes.DWORD),
        ("rcMonitor", RECT),
        ("rcWork", RECT),
        ("dwFlags", wintypes.DWORD),
    ]


class BITMAPINFOHEADER(ctypes.Structure):
    _fields_ = [
        ("biSize", wintypes.DWORD),
        ("biWidth", wintypes.LONG),
        ("biHeight", wintypes.LONG),
        ("biPlanes", wintypes.WORD),
        ("biBitCount", wintypes.WORD),
        ("biCompression", wintypes.DWORD),
        ("biSizeImage", wintypes.DWORD),
        ("biXPelsPerMeter", wintypes.LONG),
        ("biYPelsPerMeter", wintypes.LONG),
        ("biClrUsed", wintypes.DWORD),
        ("biClrImportant", wintypes.DWORD),
    ]


class BITMAPINFO(ctypes.Structure):
    _fields_ = [("bmiHeader", BITMAPINFOHEADER), ("bmiColors", wintypes.DWORD * 3)]


user32.GetDC.argtypes = [wintypes.HWND]
user32.GetDC.restype = wintypes.HDC
user32.ReleaseDC.argtypes = [wintypes.HWND, wintypes.HDC]
user32.GetCursorPos.argtypes = [ctypes.POINTER(POINT)]
user32.MonitorFromPoint.argtypes = [POINT, wintypes.DWORD]
user32.MonitorFromPoint.restype = wintypes.HMONITOR
user32.GetMonitorInfoW.argtypes = [wintypes.HMONITOR, ctypes.POINTER(MONITORINFO)]
user32.RegisterHotKey.argtypes = [wintypes.HWND, ctypes.c_int, wintypes.UINT, wintypes.UINT]
user32.UnregisterHotKey.argtypes = [wintypes.HWND, ctypes.c_int]
user32.GetMessageW.argtypes = [ctypes.POINTER(wintypes.MSG), wintypes.HWND, wintypes.UINT, wintypes.UINT]
user32.PostThreadMessageW.argtypes = [wintypes.DWORD, wintypes.UINT, wintypes.WPARAM, wintypes.LPARAM]
user32.GetSystemMetrics.argtypes = [ctypes.c_int]

gdi32.CreateCompatibleDC.argtypes = [wintypes.HDC]
gdi32.CreateCompatibleDC.restype = wintypes.HDC
gdi32.CreateCompatibleBitmap.argtypes = [wintypes.HDC, ctypes.c_int, ctypes.c_int]
gdi32.CreateCompatibleBitmap.restype = wintypes.HBITMAP
gdi32.SelectObject.argtypes = [wintypes.HDC, wintypes.HGDIOBJ]
gdi32.SelectObject.restype = wintypes.HGDIOBJ
gdi32.DeleteObject.argtypes = [wintypes.HGDIOBJ]
gdi32.DeleteDC.argtypes = [wintypes.HDC]
gdi32.SetStretchBltMode.argtypes = [wintypes.HDC, ctypes.c_int]
gdi32.SetBrushOrgEx.argtypes = [wintypes.HDC, ctypes.c_int, ctypes.c_int, ctypes.c_void_p]
gdi32.StretchBlt.argtypes = [
    wintypes.HDC, ctypes.c_int, ctypes.c_int, ctypes.c_int, ctypes.c_int,
    wintypes.HDC, ctypes.c_int, ctypes.c_int, ctypes.c_int, ctypes.c_int, wintypes.DWORD,
]
gdi32.GetDIBits.argtypes = [
    wintypes.HDC, wintypes.HBITMAP, wintypes.UINT, wintypes.UINT,
    ctypes.c_void_p, ctypes.POINTER(BITMAPINFO), wintypes.UINT,
]


def make_dpi_aware() -> None:
    """不开 DPI 感知的话,缩放显示器上 GetMonitorInfo 给的是逻辑坐标,和屏幕 DC 对不上,截图会错位裁切。"""
    try:
        # DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2 = -4
        if user32.SetProcessDpiAwarenessContext(ctypes.c_void_p(-4)):
            return
    except Exception:
        pass
    try:
        user32.SetProcessDPIAware()
    except Exception:
        pass


# --------------------------------------------------------------------------- #
# 人在不在
# --------------------------------------------------------------------------- #

class LASTINPUTINFO(ctypes.Structure):
    _fields_ = [("cbSize", wintypes.UINT), ("dwTime", wintypes.DWORD)]


user32.GetLastInputInfo.argtypes = [ctypes.POINTER(LASTINPUTINFO)]
kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
kernel32.GetTickCount.argtypes = []
kernel32.GetTickCount.restype = wintypes.DWORD


def last_input_age_ms() -> int:
    """距上一次键盘或鼠标输入多少毫秒。读不到时返回 0(当作"人刚动过")。"""
    info = LASTINPUTINFO()
    info.cbSize = ctypes.sizeof(LASTINPUTINFO)
    if not user32.GetLastInputInfo(ctypes.byref(info)):
        return 0
    return int((kernel32.GetTickCount() - info.dwTime) & 0xFFFFFFFF)


# --------------------------------------------------------------------------- #
# 即时反馈:一声轻响 + 光标旁的小提示
# --------------------------------------------------------------------------- #

def click_wav() -> bytes:
    """合成一声 70ms 的轻响,省得带 wav 文件。"""
    import io
    import math
    import wave

    rate = 22050
    frames = bytearray()
    total = int(rate * 0.07)
    for i in range(total):
        t = i / float(rate)
        envelope = math.exp(-t * 46.0)
        frames += struct.pack("<h", int(19000 * envelope * math.sin(2 * math.pi * 1350 * t)))
    buf = io.BytesIO()
    with wave.open(buf, "wb") as handle:
        handle.setnchannels(1)
        handle.setsampwidth(2)
        handle.setframerate(rate)
        handle.writeframes(bytes(frames))
    return buf.getvalue()


class Feedback:
    """按键那一刻的反馈。声音在抓屏前放(不会被截进去),提示框在抓屏后放。"""

    FONT = ("Microsoft YaHei UI", 10)
    BACKGROUND = "#1b1b1f"
    FOREGROUND = "#f5f5f5"

    def __init__(self, modes: set[str], sound_file: str = "") -> None:
        self.sound = "sound" in modes
        self.toast = "toast" in modes
        self.sound_file = sound_file.strip()
        self._click = click_wav() if self.sound else b""
        self._queue: list[str] = []
        self._queue_lock = threading.Lock()
        self._thread: threading.Thread | None = None
        self._toplevel = None
        self.last_error = ""

    # -- 声音 ------------------------------------------------------------- #
    def beep(self) -> None:
        if not self.sound:
            return
        try:
            import winsound

            if self.sound_file and os.path.isfile(self.sound_file):
                winsound.PlaySound(self.sound_file, winsound.SND_FILENAME | winsound.SND_ASYNC | winsound.SND_NODEFAULT)
            elif self._click:
                winsound.PlaySound(self._click, winsound.SND_MEMORY | winsound.SND_ASYNC)
        except Exception:
            pass

    # -- 提示框 ----------------------------------------------------------- #
    def show(self, text: str) -> None:
        if not self.toast:
            if self.last_error:
                sys.stderr.write(f"[toast] {self.last_error}\n")
            return
        with self._queue_lock:
            self._queue.append(text)
        self._ensure_thread()

    def _ensure_thread(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._thread = threading.Thread(target=self._loop, name="toast", daemon=True)
        self._thread.start()

    def _loop(self) -> None:
        try:
            import tkinter as tk
        except Exception as e:  # 这个 Python 没带 tkinter,退化成只有声音
            self.toast = False
            self.last_error = f"tkinter 不可用:{e}"
            return
        try:
            root = tk.Tk()
            root.withdraw()
            top = tk.Toplevel(root)
            top.overrideredirect(True)
            top.withdraw()
            label = tk.Label(
                top, text="", bg=self.BACKGROUND, fg=self.FOREGROUND,
                padx=12, pady=6, font=self.FONT, justify="left",
            )
            label.pack()
            self._toplevel = top
            state = {"hide_at": 0.0}
        except Exception:
            self.toast = False
            self.last_error = "提示框建不起来:" + traceback.format_exc(limit=3)
            return

        def pump() -> None:
            now = time.time()
            text = None
            with self._queue_lock:
                if self._queue:
                    text = self._queue.pop()
                    self._queue.clear()
            try:
                if text is not None:
                    label.configure(text=text)
                    point = POINT()
                    user32.GetCursorPos(ctypes.byref(point))
                    top.geometry(f"+{int(point.x) + 18}+{int(point.y) + 22}")
                    top.deiconify()
                    top.attributes("-topmost", True)
                    state["hide_at"] = now + 1.4
                elif state["hide_at"] and now >= state["hide_at"]:
                    top.withdraw()
                    state["hide_at"] = 0.0
            except Exception:
                self.last_error = "提示框刷新失败:" + traceback.format_exc(limit=3)
            root.after(80, pump)

        root.after(80, pump)
        try:
            root.mainloop()
        except Exception:
            self.last_error = "提示框主循环退出:" + traceback.format_exc(limit=3)


# --------------------------------------------------------------------------- #
# 热键
# --------------------------------------------------------------------------- #

MOD_NAMES = {
    "ctrl": MOD_CONTROL,
    "control": MOD_CONTROL,
    "alt": MOD_ALT,
    "shift": MOD_SHIFT,
    "win": MOD_WIN,
    "super": MOD_WIN,
    "meta": MOD_WIN,
}

VK_NAMES = {
    "space": 0x20, "tab": 0x09, "enter": 0x0D, "return": 0x0D, "esc": 0x1B, "escape": 0x1B,
    "backspace": 0x08, "insert": 0x2D, "ins": 0x2D, "delete": 0x2E, "del": 0x2E,
    "home": 0x24, "end": 0x23, "pageup": 0x21, "pagedown": 0x22,
    "up": 0x26, "down": 0x28, "left": 0x25, "right": 0x27,
    "printscreen": 0x2C, "prtsc": 0x2C, "pause": 0x13, "capslock": 0x14,
    "`": 0xC0, "-": 0xBD, "=": 0xBB, "[": 0xDB, "]": 0xDD, "\\": 0xDC,
    ";": 0xBA, "'": 0xDE, ",": 0xBC, ".": 0xBE, "/": 0xBF,
}
for _i in range(1, 25):
    VK_NAMES[f"f{_i}"] = 0x6F + _i  # F1=0x70


class HotkeyError(ValueError):
    pass


def parse_hotkey(text: str) -> tuple[int, int, str]:
    """'ctrl+alt+s' -> (mods, vk, 规范化名称)。按名字或单字符认键。"""
    raw = (text or "").strip().lower().replace(" ", "")
    if not raw:
        raise HotkeyError("热键为空")
    parts = [p for p in raw.split("+") if p]
    if not parts:
        raise HotkeyError(f"看不懂的热键:{text}")
    mods = 0
    key = ""
    for part in parts:
        if part in MOD_NAMES:
            mods |= MOD_NAMES[part]
        elif len(part) == 1 or part in VK_NAMES:
            if key:
                raise HotkeyError(f"热键里只能有一个主键:{text}")
            key = part
        else:
            raise HotkeyError(f"不认识的键:{part}")
    if not key:
        raise HotkeyError(f"热键缺主键:{text}")
    if key in VK_NAMES:
        vk = VK_NAMES[key]
    else:
        ch = key.upper()
        if not ("A" <= ch <= "Z" or "0" <= ch <= "9"):
            raise HotkeyError(f"不认识的键:{key}")
        vk = ord(ch)
    if mods == 0 and not key.startswith("f"):
        raise HotkeyError("热键必须带 ctrl/alt/shift/win 之一,否则会抢掉正常打字")
    name = "+".join([n for n, m in (("ctrl", MOD_CONTROL), ("alt", MOD_ALT), ("shift", MOD_SHIFT), ("win", MOD_WIN)) if mods & m] + [key])
    return mods, vk, name


# --------------------------------------------------------------------------- #
# 抓屏
# --------------------------------------------------------------------------- #

def monitor_rect(mode: str) -> tuple[int, int, int, int, str]:
    """返回 (left, top, width, height, 标签)。"""
    if mode == "primary":
        left, top = 0, 0
        width = user32.GetSystemMetrics(0)
        height = user32.GetSystemMetrics(1)
        return left, top, width, height, "primary"
    if mode == "all":
        left = user32.GetSystemMetrics(76)    # SM_XVIRTUALSCREEN
        top = user32.GetSystemMetrics(77)     # SM_YVIRTUALSCREEN
        width = user32.GetSystemMetrics(78)   # SM_CXVIRTUALSCREEN
        height = user32.GetSystemMetrics(79)  # SM_CYVIRTUALSCREEN
        return left, top, width, height, "all"
    pt = POINT()
    user32.GetCursorPos(ctypes.byref(pt))
    hmon = user32.MonitorFromPoint(pt, MONITOR_DEFAULTTONEAREST)
    mi = MONITORINFO()
    mi.cbSize = ctypes.sizeof(MONITORINFO)
    if not hmon or not user32.GetMonitorInfoW(hmon, ctypes.byref(mi)):
        left, top = 0, 0
        return left, top, user32.GetSystemMetrics(0), user32.GetSystemMetrics(1), "primary"
    r = mi.rcMonitor
    left, top = int(r.left), int(r.top)
    return left, top, int(r.right - r.left), int(r.bottom - r.top), f"{left},{top} {int(r.right - r.left)}x{int(r.bottom - r.top)}"


def fit(width: int, height: int, max_edge: int) -> tuple[int, int]:
    if max_edge <= 0:
        return width, height
    longest = max(width, height)
    if longest <= max_edge:
        return width, height
    scale = max_edge / float(longest)
    return max(1, int(round(width * scale))), max(1, int(round(height * scale)))


def grab_png(mode: str, max_edge: int) -> tuple[bytes, int, int, str]:
    """按 mode 抓一帧,缩到最长边 max_edge,返回 (png 字节, 宽, 高, 显示器标签)。"""
    left, top, src_w, src_h, label = monitor_rect(mode)
    if src_w <= 0 or src_h <= 0:
        raise RuntimeError("屏幕尺寸读不出来")

    dst_w, dst_h = fit(src_w, src_h, max_edge)

    screen_dc = user32.GetDC(None)
    if not screen_dc:
        raise RuntimeError("GetDC 失败")
    mem_dc = gdi32.CreateCompatibleDC(screen_dc)
    bmp = gdi32.CreateCompatibleBitmap(screen_dc, dst_w, dst_h)
    if not mem_dc or not bmp:
        user32.ReleaseDC(None, screen_dc)
        raise RuntimeError("CreateCompatibleDC/Bitmap 失败")

    old = None
    try:
        old = gdi32.SelectObject(mem_dc, bmp)
        gdi32.SetStretchBltMode(mem_dc, HALFTONE)
        gdi32.SetBrushOrgEx(mem_dc, 0, 0, None)
        ok = gdi32.StretchBlt(mem_dc, 0, 0, dst_w, dst_h, screen_dc, left, top, src_w, src_h, SRCCOPY)
        if not ok:
            raise RuntimeError(f"StretchBlt 失败(code {ctypes.get_last_error()})")

        stride = dst_w * 4
        size = stride * dst_h
        buf = ctypes.create_string_buffer(size)

        info = BITMAPINFO()
        info.bmiHeader.biSize = ctypes.sizeof(BITMAPINFOHEADER)
        info.bmiHeader.biWidth = dst_w
        info.bmiHeader.biHeight = -dst_h  # 负数 = 自上而下
        info.bmiHeader.biPlanes = 1
        info.bmiHeader.biBitCount = 32
        info.bmiHeader.biCompression = BI_RGB

        got = gdi32.GetDIBits(mem_dc, bmp, 0, dst_h, buf, ctypes.byref(info), DIB_RGB_COLORS)
        if got == 0:
            raise RuntimeError("GetDIBits 失败")

        raw = buf.raw
        rows = []
        for y in range(dst_h):
            start = y * stride
            row = raw[start:start + stride]
            rgb = bytearray(dst_w * 3)
            rgb[0::3] = row[2::4]
            rgb[1::3] = row[1::4]
            rgb[2::3] = row[0::4]
            rows.append(b"\x00" + bytes(rgb))  # filter type 0
        png = encode_png(dst_w, dst_h, b"".join(rows))
        return png, dst_w, dst_h, label
    finally:
        gdi32.SelectObject(mem_dc, old)
        gdi32.DeleteObject(bmp)
        gdi32.DeleteDC(mem_dc)
        user32.ReleaseDC(None, screen_dc)


def encode_png(width: int, height: int, filtered_rows: bytes) -> bytes:
    def chunk(tag: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)  # 8bit RGB
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", zlib.compress(filtered_rows, 6))
        + chunk(b"IEND", b"")
    )


# --------------------------------------------------------------------------- #
# 侧车主体
# --------------------------------------------------------------------------- #

class Sidecar:
    def __init__(self, args: argparse.Namespace) -> None:
        self.monitor = args.monitor
        self.max_edge = args.max_edge
        self.frames_dir = args.frames_dir
        self.keep = max(1, args.keep)
        self.lock = threading.Condition()
        self.seq = 0
        self.last: dict | None = None
        self.hotkey_name = args.hotkey
        self.hotkey_error = ""
        self.thread_id = 0
        self.httpd: ThreadingHTTPServer | None = None
        self.started_at = time.time()
        modes = {m.strip().lower() for m in str(args.feedback).split(",") if m.strip()}
        self.feedback = Feedback(modes, args.sound)
        os.makedirs(self.frames_dir, exist_ok=True)

    # -- 截图 ------------------------------------------------------------- #
    def capture(self, reason: str) -> dict:
        started = time.time()
        try:
            png, width, height, label = grab_png(self.monitor, self.max_edge)
        except Exception as e:
            return {
                "ok": False,
                "reason": reason,
                "error": str(e),
                "ts": time.strftime("%Y-%m-%dT%H:%M:%S", time.localtime()),
            }
        stamp = time.strftime("%Y%m%d-%H%M%S", time.localtime(started)) + f"-{int(started * 1000) % 1000:03d}"
        path = os.path.join(self.frames_dir, f"{stamp}.png")
        with open(path, "wb") as f:
            f.write(png)
        self.prune()
        return {
            "ok": True,
            "reason": reason,
            "path": path,
            "bytes": len(png),
            "width": width,
            "height": height,
            "monitor": label,
            "ts": time.strftime("%Y-%m-%dT%H:%M:%S", time.localtime(started)),
            "ms": int((time.time() - started) * 1000),
        }

    def prune(self) -> None:
        try:
            files = sorted(os.listdir(self.frames_dir))
        except OSError:
            return
        pngs = [f for f in files if f.endswith(".png")]
        for name in pngs[: max(0, len(pngs) - self.keep)]:
            try:
                os.remove(os.path.join(self.frames_dir, name))
            except OSError:
                pass

    def publish(self, frame: dict) -> None:
        with self.lock:
            self.seq += 1
            self.last = frame
            self.lock.notify_all()

    # -- 热键线程 --------------------------------------------------------- #
    def hotkey_loop(self, mods: int, vk: int) -> None:
        self.thread_id = ctypes.windll.kernel32.GetCurrentThreadId()
        if not user32.RegisterHotKey(None, HOTKEY_ID, mods | MOD_NOREPEAT, vk):
            code = ctypes.get_last_error()
            self.hotkey_error = f"RegisterHotKey 失败(code {code}),这个键可能被别的程序占了"
            self.emit_ready()
            return
        self.emit_ready()
        msg = wintypes.MSG()
        while True:
            got = user32.GetMessageW(ctypes.byref(msg), None, 0, 0)
            if got == -1:
                self.hotkey_error = "消息循环出错"
                return
            if got == 0:
                return
            if msg.message == WM_HOTKEY and msg.wParam == HOTKEY_ID:
                # 先出声(不会被截进去),抓完再冒提示框。
                self.feedback.beep()
                frame = self.capture("hotkey")
                if frame.get("ok"):
                    self.feedback.show("看一眼…")
                self.publish(frame)
        user32.UnregisterHotKey(None, HOTKEY_ID)

    def emit_ready(self) -> None:
        info = {"port": self.httpd.server_address[1], "hotkey": self.hotkey_name, "monitor": self.monitor}
        if self.hotkey_error:
            info["hotkeyError"] = self.hotkey_error
        # 直接写字节:控制台可能是 GBK,宿主按 UTF-8 读这一行。
        sys.stdout.buffer.write((json.dumps(info, ensure_ascii=False) + "\n").encode("utf-8"))
        sys.stdout.buffer.flush()

    # -- HTTP ------------------------------------------------------------- #
    def health(self) -> dict:
        with self.lock:
            seq, last = self.seq, self.last
        return {
            "ready": True,
            "hotkey": self.hotkey_name,
            "hotkeyError": self.hotkey_error,
            "threadId": self.thread_id,
            "monitor": self.monitor,
            "maxEdge": self.max_edge,
            "feedback": {"sound": self.feedback.sound, "toast": self.feedback.toast},
            "seq": seq,
            "last": last,
            "idleMs": last_input_age_ms(),
            "uptimeMs": int((time.time() - self.started_at) * 1000),
        }

    def wait(self, after: int, timeout: float) -> dict | None:
        deadline = time.time() + timeout
        with self.lock:
            while self.seq <= after:
                left = deadline - time.time()
                if left <= 0:
                    return None
                self.lock.wait(left)
            return self.last

    def shutdown(self) -> None:
        if self.httpd:
            threading.Thread(target=self.httpd.shutdown, daemon=True).start()
        if self.thread_id:
            user32.PostThreadMessageW(self.thread_id, WM_QUIT, 0, 0)


def make_handler(car: Sidecar):
    class Handler(BaseHTTPRequestHandler):
        protocol_version = "HTTP/1.1"

        def log_message(self, fmt, *a):  # 别把每次轮询打到 stderr
            pass

        def _json(self, code: int, payload: dict) -> None:
            body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            self.send_response(code)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def do_GET(self):
            url = urlparse(self.path)
            q = parse_qs(url.query)
            if url.path == "/health":
                return self._json(200, car.health())
            if url.path == "/idle":
                return self._json(200, {"ok": True, "idleMs": last_input_age_ms()})
            if url.path == "/wait":
                after = int(q.get("after", ["0"])[0] or 0)
                timeout = float(q.get("timeout", ["25"])[0] or 25)
                frame = car.wait(after, min(max(timeout, 0.1), 120))
                if frame is None:
                    return self._json(200, {"ok": True, "empty": True, "seq": after})
                with car.lock:
                    seq = car.seq
                return self._json(200, {**frame, "seq": seq})
            return self._json(404, {"error": "not found"})

        def do_POST(self):
            url = urlparse(self.path)
            length = int(self.headers.get("Content-Length") or 0)
            if length:
                self.rfile.read(length)
            if url.path == "/trigger":
                q = parse_qs(url.query)
                want_feedback = q.get("feedback", ["0"])[0] in ("1", "true", "yes")
                if want_feedback:
                    car.feedback.beep()
                frame = car.capture("tool")
                if want_feedback and frame.get("ok"):
                    car.feedback.show("看一眼…")
                return self._json(200, frame)
            if url.path == "/quit":
                self._json(200, {"ok": True})
                threading.Timer(0.1, car.shutdown).start()
                return
            return self._json(404, {"error": "not found"})

    return Handler


def main() -> int:
    ap = argparse.ArgumentParser(description="Coopanion screen sidecar")
    ap.add_argument("--port", type=int, default=0, help="监听端口,0=随便挑一个空闲的")
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--hotkey", default="", help="留空表示不注册热键,只靠 /trigger 触发")
    ap.add_argument("--monitor", default="cursor", choices=["cursor", "primary", "all"])
    ap.add_argument("--max-edge", type=int, default=1600, help="长边缩到这个像素,0=不缩")
    ap.add_argument("--frames-dir", default=os.path.join(tempfile.gettempdir(), "coo-screen"))
    ap.add_argument("--keep", type=int, default=5, help="磁盘上留几帧")
    ap.add_argument("--feedback", default="sound,toast", help="sound / toast / 两者逗号分隔,off=都不要")
    ap.add_argument("--sound", default="", help="自定义 wav 路径,留空用内置轻响")
    args = ap.parse_args()

    make_dpi_aware()
    car = Sidecar(args)
    car.httpd = ThreadingHTTPServer((args.host, args.port), make_handler(car))
    car.httpd.daemon_threads = True

    try:
        mods, vk, name = parse_hotkey(args.hotkey)
        car.hotkey_name = name
    except HotkeyError as e:
        car.hotkey_error = str(e)
        mods = vk = 0

    # 空热键 = 这个实例不注册热键(比如只靠双击桌宠触发),不是错误。
    if not (args.hotkey or "").strip():
        car.hotkey_name = ""
        car.hotkey_error = ""
        car.emit_ready()
    elif car.hotkey_error:
        car.emit_ready()
    else:
        threading.Thread(target=car.hotkey_loop, args=(mods, vk), daemon=True).start()

    try:
        car.httpd.serve_forever(poll_interval=0.2)
    except KeyboardInterrupt:
        pass
    finally:
        car.httpd.server_close()
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception:
        traceback.print_exc()
        raise SystemExit(1)
