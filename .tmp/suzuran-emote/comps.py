from PIL import Image
import numpy as np
from collections import deque
import json

SRC = r"C:\Users\BBQ\.dsh\attachments\v1\objects\be\beca7cefeeef32b1e488bfa384f02d27ef697ee58193dfe1821d097216a7f6b8"
OUT = r"F:\study\coopanion\.tmp\suzuran-emote"

im = Image.open(SRC).convert("RGB")
arr = np.asarray(im)
f = arr.astype(np.float32) / 255.0
mx = f.max(2)
mn = f.min(2)
sat = np.divide(mx - mn, mx, out=np.zeros_like(mx), where=mx > 0)
cand = (mx >= 0.86) & (sat <= 0.06)
h, w = cand.shape

bg = np.zeros((h, w), bool)
dq = deque()
for x in range(w):
    for y in (0, h - 1):
        if cand[y, x] and not bg[y, x]:
            bg[y, x] = True
            dq.append(y * w + x)
for y in range(h):
    for x in (0, w - 1):
        if cand[y, x] and not bg[y, x]:
            bg[y, x] = True
            dq.append(y * w + x)
while dq:
    i = dq.popleft()
    y, x = divmod(i, w)
    if y > 0 and cand[y - 1, x] and not bg[y - 1, x]:
        bg[y - 1, x] = True
        dq.append(i - w)
    if y + 1 < h and cand[y + 1, x] and not bg[y + 1, x]:
        bg[y + 1, x] = True
        dq.append(i + w)
    if x > 0 and cand[y, x - 1] and not bg[y, x - 1]:
        bg[y, x - 1] = True
        dq.append(i - 1)
    if x + 1 < w and cand[y, x + 1] and not bg[y, x + 1]:
        bg[y, x + 1] = True
        dq.append(i + 1)

fg = ~bg
labels = np.zeros((h, w), np.int32)
comps = []
cur = 0
for yy in range(h):
    row = np.nonzero(fg[yy])[0]
    for xx in row:
        if labels[yy, xx]:
            continue
        cur += 1
        labels[yy, xx] = cur
        q = deque([yy * w + xx])
        minx = maxx = xx
        miny = maxy = yy
        area = 0
        while q:
            i = q.popleft()
            y, x = divmod(i, w)
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
        comps.append(dict(id=cur, area=area, bbox=[minx, miny, maxx, maxy]))

comps.sort(key=lambda c: -c["area"])
print("components", len(comps))
for c in comps[:30]:
    print(c)

json.dump(dict(comps=comps, w=w, h=h), open(OUT + r"\comps.json", "w"), ensure_ascii=False)
