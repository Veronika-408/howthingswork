#!/usr/bin/env python3
"""Overlay a labelled pixel grid on a tile for tracing outlines: grid.py <tile.png> <out.png> [step]."""
import sys
from PIL import Image, ImageDraw, ImageFont
src, out = sys.argv[1], sys.argv[2]; step = int(sys.argv[3]) if len(sys.argv) > 3 else 64
im = Image.open(src).convert("RGB"); d = ImageDraw.Draw(im)
f = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 22)
for x in range(0, im.width, step):
    major = x % (step * 2) == 0
    d.line([(x, 0), (x, im.height)], fill=(230, 0, 0) if major else (255, 140, 140), width=2 if major else 1)
    if major: d.text((x + 3, 3), str(x), fill=(200, 0, 0), font=f)
for y in range(0, im.height, step):
    major = y % (step * 2) == 0
    d.line([(0, y), (im.width, y)], fill=(0, 0, 230) if major else (140, 140, 255), width=2 if major else 1)
    if major: d.text((3, y + 3), str(y), fill=(0, 0, 200), font=f)
im.save(out)
