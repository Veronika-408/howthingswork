#!/usr/bin/env python3
"""howthings.work lockup: the painted globe followed by the name in Libre Caslon.
Writes logo.png (on paper), logo-transparent.png, icon-512.png, favicon-64.png."""
from PIL import Image, ImageDraw, ImageFont
H = 360                                   # lockup height in px
PAPER = (248, 244, 234, 255)
INK, RED = (43, 38, 32, 255), (162, 59, 32, 255)

globe = Image.open("globe-cut-1.png").convert("RGBA")
g = globe.resize((round(globe.width * H / globe.height), H), Image.LANCZOS)

disp = ImageFont.truetype("fonts/LibreCaslonDisplay.ttf", 190)
ital = ImageFont.truetype("fonts/LibreCaslonTextItalic.ttf", 150)
try: ital.set_variation_by_axes([400])
except Exception: pass
d0 = ImageDraw.Draw(Image.new("RGBA", (10, 10)))
w1 = d0.textlength("howthings", font=disp)
w2 = d0.textlength(".work", font=ital)
gap = 26
W = g.width + gap + int(w1 + w2) + 30
img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
img.alpha_composite(g, (0, 0))
d = ImageDraw.Draw(img)
base = H * .64                            # baseline through the globe's equator-ish
x = g.width + gap
d.text((x, base), "howthings", font=disp, fill=INK, anchor="ls")
d.text((x + w1 + 4, base), ".work", font=ital, fill=RED, anchor="ls")
img.save("logo-transparent.png")
bg = Image.new("RGBA", (W + 120, H + 120), PAPER); bg.alpha_composite(img, (60, 60)); bg.convert("RGB").save("logo.png")

icon = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
gi = globe.copy(); gi.thumbnail((480, 480), Image.LANCZOS)
icon.alpha_composite(gi, ((512 - gi.width) // 2, (512 - gi.height) // 2))
icon.save("icon-512.png")
icon.resize((64, 64), Image.LANCZOS).save("favicon-64.png")
print(W, H)

# share card (1200 x 630): the grey city, the coloured subjects, the logo on paper
import json, numpy as np
from pathlib import Path
R = Path(__file__).resolve().parent.parent
world = Image.open(R / "world/art/world.png").convert("RGB")
a = np.asarray(world).astype(np.float32); paper = np.array([248, 244, 234], np.float32)
lum = (a * [.3, .59, .11]).sum(-1, keepdims=True)
faded = Image.fromarray(np.clip(paper * .28 + (lum + (a - lum) * .16) * .72, 0, 255).astype(np.uint8))
card = Image.new("RGBA", (1200, 630), PAPER)
w = faded.resize((1200, round(1200 * world.height / world.width)), Image.LANCZOS).convert("RGBA")
card.alpha_composite(w, (0, 630 - w.height + 40))
k = 1200 / world.width
for sid, place, base in [("plane", (1345, 520, .168), "art"), ("tram", (504, 585, .233), "tram/art")]:
    P = Image.open(R / base / "plate.png").convert("RGBA")
    m = Image.open(R / ("dist/assets/plate-mask.png" if sid == "plane" else "dist/assets/tram/plate-mask.png")).getchannel("A").resize(P.size)
    P.putalpha(m)
    s = place[2] * k
    P = P.resize((round(P.width * s), round(P.height * s)), Image.LANCZOS)
    if sid == "tram": P = P.rotate(-14.9, expand=True, resample=Image.BICUBIC)
    x, y = place[0] * k, place[1] * k + 630 - w.height + 40
    if sid == "tram":   # rotate() expands around the centre: shift back so the plate origin lines up
        import math
        ow, oh = round(1672 * s), round(941 * s); a_ = math.radians(14.9)
        dx = (P.width - ow) / 2 - (ow / 2 - (math.cos(a_) * ow / 2 - math.sin(a_) * oh / 2))
        dy = (P.height - oh) / 2 - (oh / 2 - (math.sin(a_) * ow / 2 + math.cos(a_) * oh / 2))
        x -= dx; y -= dy
    card.alpha_composite(P, (round(x), round(y)))
band = Image.new("RGBA", (1200, 150), (248, 244, 234, 238)); card.alpha_composite(band, (0, 0))
lg = img.copy(); lg.thumbnail((620, 120), Image.LANCZOS)
card.alpha_composite(lg, ((1200 - lg.width) // 2, 16))
card.convert("RGB").save("og.png", optimize=True)
