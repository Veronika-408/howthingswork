#!/usr/bin/env python3
"""Draw a coordinate grid over a picture (for reading off outline points).
  /usr/bin/python3 tools/grid.py <img> <out.png> [x0,y0,x1,y1] [step] [polys.json]
polys.json (optional): {"name": [[x,y],...], ...} drawn on top, in the picture's own pixels."""
import json, sys
from PIL import Image, ImageDraw

src, out = sys.argv[1], sys.argv[2]
box = tuple(int(v) for v in sys.argv[3].split(",")) if len(sys.argv) > 3 and sys.argv[3] != "-" else None
step = int(sys.argv[4]) if len(sys.argv) > 4 else 50
polys = json.load(open(sys.argv[5])) if len(sys.argv) > 5 else {}
im = Image.open(src).convert("RGBA")
bg = Image.new("RGBA", im.size, (255, 255, 255, 255)); bg.alpha_composite(im); im = bg
x0, y0, x1, y1 = box or (0, 0, im.width, im.height)
d = ImageDraw.Draw(im)
for x in range((x0 // step) * step, x1 + 1, step):
    d.line([(x, y0), (x, y1)], fill=(0, 120, 255, 255) if x % (step * 2) == 0 else (0, 200, 255, 255), width=1)
    if x % (step * 2) == 0:
        for yy in range(y0, y1, step * 4):
            d.text((x + 2, yy + 2), str(x), fill=(0, 0, 160, 255))
for y in range((y0 // step) * step, y1 + 1, step):
    d.line([(x0, y), (x1, y)], fill=(0, 120, 255, 255) if y % (step * 2) == 0 else (0, 200, 255, 255), width=1)
    if y % (step * 2) == 0:
        for xx in range(x0, x1, step * 4):
            d.text((xx + 2, y + 2), str(y), fill=(160, 0, 0, 255))
cols = [(230, 30, 30), (20, 160, 20), (200, 0, 200), (240, 140, 0), (0, 0, 0), (0, 150, 150), (120, 60, 0)]
for i, (k, p) in enumerate(polys.items()):
    for poly in (p if p and isinstance(p[0][0], list) else [p]):
        d.line([tuple(q) for q in poly] + [tuple(poly[0])], fill=cols[i % len(cols)] + (255,), width=3)
        d.text(tuple(poly[0]), k, fill=cols[i % len(cols)] + (255,))
im.crop((x0, y0, x1, y1)).convert("RGB").save(out)
