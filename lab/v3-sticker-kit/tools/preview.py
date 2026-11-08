#!/usr/bin/python3
"""Composite stickers on paper with their drop shadows: tools/preview.py out.png name [name...] (zoom crops with name@x,y,w,h)"""
import sys, json
from pathlib import Path
from PIL import Image
HERE = Path(__file__).resolve().parent.parent
idx = json.loads((HERE / "library/index.json").read_text())
out = sys.argv[1]; names = sys.argv[2:]
ims = []
for n in names:
    crop = None
    if "@" in n: n, c = n.split("@"); crop = tuple(int(v) for v in c.split(","))
    s = idx[n]; im = Image.open(HERE / "library" / s["file"]).convert("RGBA")
    sh = Image.open(HERE / "library" / (n + ".shadow.webp")).convert("RGBA").split()[3].resize(im.size)
    pad = 30; bg = Image.new("RGBA", (im.width + pad * 2, im.height + pad * 2), (244, 239, 228, 255))
    shadow = Image.new("RGBA", im.size, (60, 45, 30, 0)); shadow.putalpha(sh.point(lambda v: int(v * .35)))
    o = max(2, s["border"] // 2)
    bg.alpha_composite(shadow, (pad + o, pad + o * 2)); bg.alpha_composite(im, (pad, pad))
    if crop: bg = bg.crop((crop[0], crop[1], crop[0] + crop[2], crop[1] + crop[3]))
    ims.append(bg)
W = sum(i.width for i in ims); H = max(i.height for i in ims)
sheet = Image.new("RGB", (W, H), (244, 239, 228)); x = 0
for i in ims: sheet.paste(i, (x, 0)); x += i.width
sheet.save(out)
