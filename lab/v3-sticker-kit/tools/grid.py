#!/usr/bin/python3
"""Grid overlay for placing stickers: tools/grid.py <library-name or png> out.png [step] [crop x,y,w,h] [scale]"""
import sys, json
from pathlib import Path
from PIL import Image, ImageDraw
HERE = Path(__file__).resolve().parent.parent
src = sys.argv[1]; out = sys.argv[2]; step = int(sys.argv[3]) if len(sys.argv) > 3 else 100
p = HERE / "library" / f"{src}.webp"
im = Image.open(p if p.exists() else src).convert("RGBA")
bg = Image.new("RGBA", im.size, (244, 239, 228, 255)); bg.alpha_composite(im); im = bg.convert("RGB")
crop = [int(v) for v in sys.argv[4].split(",")] if len(sys.argv) > 4 else [0, 0, im.width, im.height]
scale = float(sys.argv[5]) if len(sys.argv) > 5 else 1
d = ImageDraw.Draw(im)
for x in range(0, im.width, step): d.line([(x, 0), (x, im.height)], fill=(255, 0, 0) if x % (step * 5) == 0 else (255, 120, 120), width=1)
for y in range(0, im.height, step): d.line([(0, y), (im.width, y)], fill=(0, 0, 255) if y % (step * 5) == 0 else (120, 120, 255), width=1)
for x in range(0, im.width, step):
    for y in range(0, im.height, step):
        if (x // step + y // step) % 2 == 0: d.text((x + 2, y + 2), f"{x},{y}", fill=(0, 0, 0))
im = im.crop((crop[0], crop[1], crop[0] + crop[2], crop[1] + crop[3]))
if scale != 1: im = im.resize((int(im.width * scale), int(im.height * scale)), Image.LANCZOS)
im.save(out)
