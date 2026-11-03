from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

root = Path(r"F:\study\coopanion\.preview\reference-retry")
tiles = [
    ("参考截图（图一）", "ref-512.png"),
    ("铃兰旧作（图二）", "old-target.png"),
    ("新插件 · API 重试", "api-attempt.png"),
    ("新插件 · 本地 img2img 0.72", "img2img-0.72.png"),
]
size = 512
pad = 24
label_h = 52
cols = 2
rows = 2
w = cols * size + (cols + 1) * pad
h = rows * (size + label_h) + (rows + 1) * pad
canvas = Image.new("RGB", (w, h), (245, 242, 236))
draw = ImageDraw.Draw(canvas)
font_path = r"C:\Windows\Fonts\msyh.ttc"
try:
    font = ImageFont.truetype(font_path, 28)
except OSError:
    font = ImageFont.load_default()

for i, (label, name) in enumerate(tiles):
    col = i % cols
    row = i // cols
    x = pad + col * (size + pad)
    y = pad + row * (size + label_h + pad)
    draw.text((x, y), label, fill=(45, 40, 35), font=font)
    src = Image.open(root / name).convert("RGB")
    if src.size != (size, size):
        src = src.resize((size, size), Image.Resampling.LANCZOS)
    canvas.paste(src, (x, y + label_h))
    draw.rectangle(
        [x, y + label_h, x + size - 1, y + label_h + size - 1],
        outline=(210, 200, 185),
        width=2,
    )

out = root / "compare.png"
canvas.save(out, "PNG")
print(out, canvas.size)
