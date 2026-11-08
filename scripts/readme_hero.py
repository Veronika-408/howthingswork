#!/usr/bin/env python3
"""The README hero: the encyclopedia's name over a powers-of-ten chain (town → person → skin → cell → lysosome),
each circle magnifying the ring marked on the one before.   /usr/bin/python3 scripts/readme_hero.py"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import numpy as np
R = Path(__file__).resolve().parent.parent
F = R / "brand" / "fonts"
PAPER, INK, RED, SOFT = (247, 242, 233), (43, 38, 32), (162, 59, 32), (110, 98, 87)
W, H, S = 2400, 1080, 3                       # S: supersampling for smooth circles and lines

def load(p): return Image.open(R / p).convert("RGB")
world = load("dist/assets/world/world-2x.webp"); k2 = lambda b: tuple(v * 2 for v in b)
CHAIN = [  # picture, crop (square, in its pixels), ring (what the next circle shows), label
    (world, k2((900, 520, 1320, 940)), k2((1128, 728, 1186, 792)), "THE TOWN"),
    (load("subjects/body/art/plate.png"), (380, 25, 1250, 895), (982, 440, 1076, 552), "A PERSON"),
    (load("subjects/skin/art/plate.png"), (390, 25, 1280, 915), (728, 166, 874, 254), "HER SKIN"),
    (load("subjects/cell/art/plate.png"), (380, 0, 1320, 940), (940, 80, 1045, 175), "ONE CELL"),
    (load("lab/v1-patchwork/art/src/lysosome/base.png"), None, None, "A LYSOSOME"),
]
D, GAP, TOP = 400, 80, 520                     # circle diameter, gap, circle top
x0 = (W - (len(CHAIN) * D + (len(CHAIN) - 1) * GAP)) // 2

# paper with a faint grain
rng = np.random.default_rng(3)
grain = rng.normal(0, 3.2, (H, W, 1))
bg = np.clip(np.array(PAPER, np.float32) + grain, 0, 255).astype(np.uint8)
img = Image.fromarray(bg).convert("RGBA")
big = Image.new("RGBA", (W * S, H * S), (0, 0, 0, 0)); d = ImageDraw.Draw(big)

centres = []
for i, (pic, crop, ring, label) in enumerate(CHAIN):
    if crop is None:
        w, h = pic.size; s = min(w, h) * .86; crop = ((w - s) / 2, (h - s) / 2 + h * .02, (w + s) / 2, (h + s) / 2 + h * .02)
    cx, cy = x0 + i * (D + GAP) + D / 2, TOP + D / 2
    centres.append((cx, cy, crop, ring))
    tile = pic.crop(tuple(round(v) for v in crop)).resize((D, D), Image.LANCZOS)
    m = Image.new("L", (D * S, D * S), 0); ImageDraw.Draw(m).ellipse((0, 0, D * S - 1, D * S - 1), fill=255)
    m = m.resize((D, D), Image.LANCZOS)
    sh = Image.new("L", (D + 80, D + 80), 0); ImageDraw.Draw(sh).ellipse((40, 50, D + 40, D + 50), fill=90)
    img.paste((70, 45, 20, 255), (int(cx - D / 2 - 40), int(cy - D / 2 - 40)), sh.filter(ImageFilter.GaussianBlur(16)))
    img.paste(tile, (int(cx - D / 2), int(cy - D / 2)), m)

# rings and the magnifier lines to the next circle
for i in range(len(CHAIN) - 1):
    cx, cy, crop, ring = centres[i]; nx, ny = centres[i + 1][:2]
    k = D / (crop[2] - crop[0])
    rx = cx - D / 2 + ((ring[0] + ring[2]) / 2 - crop[0]) * k; ry = cy - D / 2 + ((ring[1] + ring[3]) / 2 - crop[1]) * k
    rr = max(ring[2] - ring[0], ring[3] - ring[1]) * k / 2 + 4
    # outer tangents between the small ring and the next circle
    import math
    dx, dy = nx - rx, ny - ry; L = math.hypot(dx, dy); R2 = D / 2
    a = math.atan2(dy, dx); b = math.acos((rr - R2) / L)       # outer tangents touch the near side of the next circle
    for sgn in (1, -1):
        t = a + sgn * b
        p1 = (rx + rr * math.cos(t), ry + rr * math.sin(t)); p2 = (nx + R2 * math.cos(t), ny + R2 * math.sin(t))
        d.line([(p1[0] * S, p1[1] * S), (p2[0] * S, p2[1] * S)], fill=RED + (200,), width=int(2.2 * S))
    d.ellipse(((rx - rr) * S, (ry - rr) * S, (rx + rr) * S, (ry + rr) * S), outline=RED + (255,), width=int(3.2 * S))
for cx, cy, *_ in centres:
    d.ellipse(((cx - D / 2) * S, (cy - D / 2) * S, (cx + D / 2) * S, (cy + D / 2) * S), outline=(120, 105, 90, 255), width=int(1.6 * S))
img.alpha_composite(big.resize((W, H), Image.LANCZOS))

# words
t = ImageDraw.Draw(img)
def ctext(y, s, font, fill, track=0):
    if track:
        widths = [t.textlength(ch, font=font) for ch in s]; tw = sum(widths) + track * (len(s) - 1); x = (W - tw) / 2
        for ch, w in zip(s, widths): t.text((x, y), ch, font=font, fill=fill); x += w + track
    else:
        tw = t.textlength(s, font=font); t.text(((W - tw) / 2, y), s, font=font, fill=fill)
logo = Image.open(R / "brand/logo-transparent.png").convert("RGBA"); lh = 84; logo = logo.resize((round(logo.width * lh / logo.height), lh), Image.LANCZOS)
img.alpha_composite(logo, ((W - logo.width) // 2, 62))
ctext(186, "The Infinitely Zoomable Encyclopedia", ImageFont.truetype(str(F / "LibreCaslonDisplay.ttf"), 112), INK)
it = ImageFont.truetype(str(F / "LibreCaslonTextItalic.ttf"), 40)
ctext(338, "A hand-painted picture book for children that never runs out of pages.", it, SOFT)
ctext(392, "Zoom into anything, and there is always another picture inside.", it, SOFT)
lab = ImageFont.truetype(str(F / "LibreCaslonText.ttf"), 25)
for (cx, cy, *_), (*_, label) in zip(centres, CHAIN):
    widths = [t.textlength(ch, font=lab) for ch in label]; tw = sum(widths) + 5 * (len(label) - 1); x = cx - tw / 2
    for ch, w in zip(label, widths): t.text((x, TOP + D + 30), ch, font=lab, fill=SOFT); x += w + 5
out = img.convert("RGB")
out.save(R / "docs/readme/hero.jpg", quality=90)
# the social card (1200 x 630) from the same picture
og = Image.new("RGB", (1200, 630), PAPER); hk = 1200 / W
og.paste(out.resize((1200, round(H * hk)), Image.LANCZOS), (0, round((630 - H * hk) / 2)))
og.save(R / "brand/og.png", optimize=True)
print("hero", out.size, "og", og.size)
