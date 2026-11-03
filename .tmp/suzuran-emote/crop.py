from PIL import Image, ImageDraw, ImageFont
import numpy as np
from collections import deque
import os, json

SRC = r"C:\Users\BBQ\.dsh\attachments\v1\objects\be\beca7cefeeef32b1e488bfa384f02d27ef697ee58193dfe1821d097216a7f6b8"
OUT = r"F:\study\coopanion\.tmp\suzuran-emote\out"
os.makedirs(OUT, exist_ok=True)

EMOTIONS = ["neutral", "happy", "wink", "love", "shy", "surprised", "angry", "sad", "sleepy",
            "thinking", "smug", "pout", "worried", "determined", "flustered", "scared", "excited", "cry", "confused"]

im = Image.open(SRC).convert("RGB")
arr = np.asarray(im)
f = arr.astype(np.float32) / 255.0
mx = f.max(2); mn = f.min(2)
sat = np.divide(mx - mn, mx, out=np.zeros_like(mx), where=mx > 0)
cand = (mx >= 0.86) & (sat <= 0.06)
h, w = cand.shape

bg = np.zeros((h, w), bool)
dq = deque()
for x in range(w):
    for y in (0, h - 1):
        if cand[y, x] and not bg[y, x]:
            bg[y, x] = True; dq.append(y * w + x)
for y in range(h):
    for x in (0, w - 1):
        if cand[y, x] and not bg[y, x]:
            bg[y, x] = True; dq.append(y * w + x)
while dq:
    i = dq.popleft(); y, x = divmod(i, w)
    if y > 0 and cand[y - 1, x] and not bg[y - 1, x]:
        bg[y - 1, x] = True; dq.append(i - w)
    if y + 1 < h and cand[y + 1, x] and not bg[y + 1, x]:
        bg[y + 1, x] = True; dq.append(i + w)
    if x > 0 and cand[y, x - 1] and not bg[y, x - 1]:
        bg[y, x - 1] = True; dq.append(i - 1)
    if x + 1 < w and cand[y, x + 1] and not bg[y, x + 1]:
        bg[y, x + 1] = True; dq.append(i + 1)

fg = ~bg
labels = np.zeros((h, w), np.int32)
comps = []
cur = 0
for yy in range(h):
    for xx in np.nonzero(fg[yy])[0]:
        if labels[yy, xx]:
            continue
        cur += 1
        labels[yy, xx] = cur
        q = deque([yy * w + xx])
        minx = maxx = xx; miny = maxy = yy; area = 0
        while q:
            i = q.popleft(); y, x = divmod(i, w)
            area += 1
            if x < minx: minx = x
            if x > maxx: maxx = x
            if y < miny: miny = y
            if y > maxy: maxy = y
            if y > 0 and fg[y - 1, x] and not labels[y - 1, x]:
                labels[y - 1, x] = cur; q.append(i - w)
            if y + 1 < h and fg[y + 1, x] and not labels[y + 1, x]:
                labels[y + 1, x] = cur; q.append(i + w)
            if x > 0 and fg[y, x - 1] and not labels[y, x - 1]:
                labels[y, x - 1] = cur; q.append(i - 1)
            if x + 1 < w and fg[y, x + 1] and not labels[y, x + 1]:
                labels[y, x + 1] = cur; q.append(i + 1)
        comps.append(dict(id=cur, area=area, bbox=(minx, miny, maxx, maxy),
                          cx=(minx + maxx) / 2, cy=(miny + maxy) / 2))

comps.sort(key=lambda c: -c["area"])
mains = comps[:19]
small = comps[19:]
mains.sort(key=lambda c: (round(c["cy"] / 250), c["cx"]))
print("mains")
for m, e in zip(mains, EMOTIONS):
    print(e, m["area"], m["bbox"])

def dist_to_bbox(c, b):
    x0, y0, x1, y1 = b
    dx = max(x0 - c["cx"], 0, c["cx"] - x1)
    dy = max(y0 - c["cy"], 0, c["cy"] - y1)
    return (dx * dx + dy * dy) ** 0.5

assign = {i: [] for i in range(19)}
for c in small:
    if c["area"] < 20:
        continue
    best, bd = None, 1e9
    for i, m in enumerate(mains):
        d = dist_to_bbox(c, m["bbox"])
        if d < bd:
            best, bd = i, d
    if bd <= 70:
        assign[best].append(c)

# 跨格的小装饰按语义归位（紫色问号属于 confused，蓝色抖动线属于 worried）
def move(bbox, src_i, dst_i):
    c = next((c for c in small if list(c["bbox"]) == bbox), None)
    if c is None:
        return
    assign[src_i] = [x for x in assign[src_i] if x["id"] != c["id"]]
    assign[dst_i].append(c)

move([972, 1034, 1016, 1077], 15, 18)
move([290, 807, 294, 833], 13, 12)

report = []
for i, (m, e) in enumerate(zip(mains, EMOTIONS)):
    ids = [m["id"]] + [c["id"] for c in assign[i]]
    keep = np.isin(labels, ids)
    ys, xs = np.nonzero(keep)
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    bw, bh = x1 - x0 + 1, y1 - y0 + 1
    cell_alpha = np.where(keep, 255, 0).astype(np.uint8)
    cell = np.dstack([arr, cell_alpha]).astype(np.uint8)
    crop = Image.fromarray(cell, "RGBA").crop((int(x0), int(y0), int(x1) + 1, int(y1) + 1))

    # 以高度对齐、宽度封顶，保持 19 张的人物大小一致
    scale = min(410 / bh, 470 / bw)
    nw = max(1, int(round(bw * scale)))
    nh = max(1, int(round(bh * scale)))

    # premultiplied resize to avoid halos
    a = np.asarray(crop).astype(np.float32)
    rgb = a[..., :3] * (a[..., 3:4] / 255.0)
    pm = Image.fromarray(np.dstack([rgb, a[..., 3:4]]).astype(np.uint8), "RGBA").resize((nw, nh), Image.LANCZOS)
    b = np.asarray(pm).astype(np.float32)
    al = b[..., 3:4]
    out = np.zeros_like(b)
    out[..., :3] = np.where(al > 0, b[..., :3] / np.maximum(al / 255.0, 1e-3), 0)
    out[..., 3:4] = al
    sprite = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGBA")

    canvas = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    canvas.alpha_composite(sprite, ((512 - nw) // 2, (512 - nh) // 2))
    canvas.save(os.path.join(OUT, e + ".png"))
    report.append(dict(emotion=e, bbox=[int(v) for v in (x0, y0, x1, y1)], w=int(nw), h=int(nh),
                       deco=[[int(v) for v in c["bbox"]] for c in assign[i]]))

json.dump(report, open(os.path.join(OUT, "report.json"), "w"), indent=1, ensure_ascii=False)

# contact sheet on dark and light backgrounds
def sheet(bgcolor, name):
    cell = 290
    sheet = Image.new("RGB", (cell * 4, cell * 5), bgcolor)
    d = ImageDraw.Draw(sheet)
    for i, e in enumerate(EMOTIONS):
        img = Image.open(os.path.join(OUT, e + ".png")).convert("RGBA").resize((250, 250), Image.LANCZOS)
        x = (i % 4) * cell + 20; y = (i // 4) * cell + 6
        sheet.paste(img, (x, y), img)
        d.text((x + 2, y + 256), e, fill=(255, 120, 120) if bgcolor[0] < 128 else (40, 40, 40))
    sheet.save(os.path.join(OUT, name))

sheet((28, 28, 34), "sheet_dark.png")
sheet((246, 246, 246), "sheet_light.png")
print("done", len(report))
