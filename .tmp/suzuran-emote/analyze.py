from PIL import Image, ImageDraw
import numpy as np

SRC = r"C:\Users\BBQ\.dsh\attachments\v1\objects\be\beca7cefeeef32b1e488bfa384f02d27ef697ee58193dfe1821d097216a7f6b8"
OUT = r"F:\study\coopanion\.tmp\suzuran-emote"

im = Image.open(SRC).convert("RGB")
a = np.asarray(im).astype(np.float32) / 255.0
mx = a.max(axis=2)
mn = a.min(axis=2)
sat = np.where(mx > 0, (mx - mn) / mx, 0)
val = mx
cand = (val >= 0.82) & (sat <= 0.10)

mask = Image.fromarray((cand * 255).astype(np.uint8), "L")
# flood fill the background from the top-left corner over the candidate mask
ImageDraw.floodfill(mask, (0, 0), 128, thresh=0)
m = np.asarray(mask)
bg = m == 128
alpha = np.where(bg, 0, 255).astype(np.uint8)

ys, xs = np.nonzero(alpha)
print("fg pixels", len(xs), "bbox", xs.min(), xs.max(), ys.min(), ys.max())

colsum = (alpha > 0).sum(axis=0)
rowsum = (alpha > 0).sum(axis=1)
print("columns with <2 fg px:", np.nonzero(colsum < 2)[0][:80])
print("rows with <2 fg px:", np.nonzero(rowsum < 2)[0][:80])

# save a preview on magenta
rgba = np.dstack([np.asarray(im), alpha])
prev = Image.fromarray(rgba, "RGBA")
bgim = Image.new("RGBA", prev.size, (255, 0, 255, 255))
bgim.alpha_composite(prev)
bgim.convert("RGB").resize((627, 627)).save(OUT + r"\preview_magenta.png")

# alpha only, to inspect holes
Image.fromarray(alpha, "L").resize((627, 627)).save(OUT + r"\alpha.png")
print("saved")
