#!/usr/bin/python3
"""Crop a region of a space picture, overlay a labelled grid in SPACE coordinates and the part outlines.

  grid.py <space> <x0> <y0> <x1> <y1> [step] [--img path] [--out path] [--scale k] [--wash]

Space pictures: art/src/<space>-lines.png unless --img; outlines from tools/spaces.json.
"""
import json, sys, os
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
a = sys.argv
sp = a[1]; x0, y0, x1, y1 = map(float, a[2:6]); step = int(a[6]) if len(a) > 6 and not a[6].startswith("--") else 50
opt = lambda n, d=None: a[a.index(n) + 1] if n in a else d
spaces = json.load(open(os.path.join(HERE, "spaces.json")))
S = spaces.get(sp, {})
img = opt("--img") or os.path.join(ROOT, S.get("src", f"art/src/{sp}-lines.png"))
im = Image.open(img).convert("RGB")
W, H = S.get("w", im.width), S.get("h", im.height)
if im.size != (W, H): im = im.resize((int(W), int(H)))
if "--wash" in a and S.get("washsrc"):
    w = Image.open(os.path.join(ROOT, S["washsrc"])).convert("RGB").resize(im.size)
    from PIL import ImageChops
    im = ImageChops.multiply(im, w)
k = float(opt("--scale", 0)) or max(1, min(4, 1400 / (x1 - x0)))
c = im.crop((int(x0), int(y0), int(x1), int(y1))).resize((int((x1 - x0) * k), int((y1 - y0) * k)), Image.LANCZOS)
d = ImageDraw.Draw(c, "RGBA")
f = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 16)
P = lambda x, y: ((x - x0) * k, (y - y0) * k)
cols = [(230, 30, 30), (20, 120, 220), (20, 160, 60), (200, 120, 0), (160, 40, 200), (0, 160, 160), (120, 120, 0), (220, 0, 140)]
for i, part in enumerate(S.get("parts", [])):
    col = cols[i % len(cols)]
    for poly in part["polys"]:
        pts = [P(x, y) for x, y in poly]
        d.polygon(pts, outline=col + (255,), fill=col + (40,))
        d.line(pts + [pts[0]], fill=col + (255,), width=2)
    xs = [x for poly in part["polys"] for x, _ in poly]; ys = [y for poly in part["polys"] for _, y in poly]
    d.text(P(sum(xs) / len(xs), sum(ys) / len(ys)), part["id"], fill=col + (255,), font=f)
gx = int(x0 // step * step)
while gx <= x1:
    if gx >= x0:
        d.line([P(gx, y0), P(gx, y1)], fill=(255, 0, 0, 90), width=1); d.text((P(gx, y0)[0] + 2, 2), str(gx), fill=(200, 0, 0, 255), font=f)
    gx += step
gy = int(y0 // step * step)
while gy <= y1:
    if gy >= y0:
        d.line([P(x0, gy), P(x1, gy)], fill=(0, 0, 255, 90), width=1); d.text((2, P(x0, gy)[1] + 2), str(gy), fill=(0, 0, 200, 255), font=f)
    gy += step
out = opt("--out", f"/private/tmp/claude-501/-Users-hraska-Code-temp-yoto-plane/075241a2-e093-4018-9197-2ded8434061e/scratchpad/grid-{sp}.png")
c.save(out); print(out, c.size)
