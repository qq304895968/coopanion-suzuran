from PIL import Image
import numpy as np
from collections import deque
import time

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

t = time.time()
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
print("bg fill", round(time.time() - t, 2), "s; frac", round(float(bg.mean()), 3))

alpha = np.where(bg, 0, 255).astype(np.uint8)
rgba = np.dstack([arr, alpha])
img = Image.fromarray(rgba, "RGBA")
canvas = Image.new("RGBA", img.size, (255, 0, 255, 255))
canvas.alpha_composite(img)
canvas.convert("RGB").resize((627, 627)).save(OUT + r"\preview_magenta.png")
Image.fromarray(alpha, "L").resize((627, 627)).save(OUT + r"\alpha.png")

colsum = (alpha > 0).sum(axis=0)
rowsum = (alpha > 0).sum(axis=1)
print("col low (<3):", [int(x) for x in np.nonzero(colsum < 3)[0]])
print("row low (<3):", [int(y) for y in np.nonzero(rowsum < 3)[0]])
