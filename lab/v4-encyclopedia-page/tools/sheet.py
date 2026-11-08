#!/usr/bin/env python3
"""Contact sheet of dive frames: sheet.py <dir> <prefix> <out.png> [cols=3]"""
import sys, glob
from PIL import Image
d, pre, out = sys.argv[1:4]; cols = int(sys.argv[4]) if len(sys.argv) > 4 else 3
fs = sorted(glob.glob(f"{d}/{pre}-[0-9].png")) + sorted(glob.glob(f"{d}/{pre}-end.png"))
ims = [Image.open(f).convert("RGB") for f in fs]
w = 640; h = round(ims[0].height * w / ims[0].width)
rows = (len(ims) + cols - 1) // cols
c = Image.new("RGB", (w * cols, h * rows), "white")
for i, im in enumerate(ims): c.paste(im.resize((w, h)), ((i % cols) * w, (i // cols) * h))
c.save(out)
