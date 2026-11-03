#!/usr/bin/env python3
"""The jumbo jet's "How it works" art (build_book) and shared image helpers, used by build.py.
This was the original plane-only build; its other functions are kept for reference.

Outputs:
  dist/index.html     full document for local viewing (python3 -m http.server -d dist)
  dist/artifact.html  body-only page for publishing as a claude.ai Artifact
  dist/assets/...     images referenced by both
"""
import json
import numpy as np
from pathlib import Path
from PIL import Image, ImageFilter

ROOT = Path(__file__).parent
ART, SRC, DIST = ROOT / "art", ROOT / "src", ROOT / "dist"
PAPER = (249, 247, 242)          # sampled from the painting's margins
PLATE_W, PLATE_H = 1832, 941      # must match window.PLATE in hotspots.js
SCALE = 2                         # published plate is 2x for sharper zooming

def build_images():
    (DIST / "assets" / "detail").mkdir(parents=True, exist_ok=True)
    src = Image.open(ART / "plate.png").convert("RGB")
    canvas = Image.new("RGB", (PLATE_W, PLATE_H), PAPER)
    canvas.paste(src, (0, 0))
    big = canvas.resize((PLATE_W * SCALE, PLATE_H * SCALE), Image.LANCZOS)
    big = big.filter(ImageFilter.UnsharpMask(radius=1.2, percent=40, threshold=2))
    big.save(DIST / "assets" / "plate.webp", quality=84, method=6)
    for f in sorted((ART / "detail").glob("*.png")):
        if f.stem == "ground":      # superseded by the four ground-crew close-ups
            continue
        im = Image.open(f).convert("RGB")
        im.thumbnail((1200, 900), Image.LANCZOS)
        im.save(DIST / "assets" / "detail" / (f.stem + ".webp"), quality=80, method=6)

def tile_index():
    """Tiles that exist on disk, with their plate-pixel rects from the deep-zoom plan."""
    plan_file = ART / "zoom" / "plan.json"
    if not plan_file.exists():
        return {}
    plan = json.loads(plan_file.read_text())
    have = {f.stem.replace("__", "/") for f in (ART / "zoom" / "tiles").glob("*.png")}
    return {k: {"level": v["level"], "rect": v["rect"]} for k, v in plan.items() if k in have and (v["level"] == 2 or v["parent"] in have)}

def build_tiles():
    out = DIST / "assets" / "zoom"
    out.mkdir(parents=True, exist_ok=True)
    for key in tile_index():
        f = key.replace("/", "__")
        Image.open(ART / "zoom" / "tiles" / f"{f}.png").convert("RGB").save(out / f"{f}.webp", quality=80, method=6)

def disc_mask(size, cx, cy, r, soft=2.0, inside=True):
    """Antialiased circular alpha mask: 255 inside r (or outside, for a ring)."""
    yy, xx = np.mgrid[0:size[1], 0:size[0]]
    d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
    a = np.clip((r - d) / soft + .5, 0, 1) if inside else np.clip((d - r) / soft + .5, 0, 1)
    return Image.fromarray((a * 255).astype(np.uint8))

def build_book():
    """Base paintings and moving pieces for the "How it works" pages."""
    B, out = ART / "book", DIST / "assets" / "book"
    out.mkdir(parents=True, exist_ok=True)
    save = lambda im, name, q=82: im.save(out / f"{name}.webp", quality=q, method=6)
    for src, name in [("engine-a", "engine"), ("oven", "oven"), ("belt", "belt")]:
        save(Image.open(B / f"{src}.png").convert("RGB"), name)
    # front-view fan: a spinning disc of blades under a still intake ring, plus a motion-blurred disc
    fan = Image.open(B / "fan.png").convert("RGB")
    cx, cy, r = 511, 508, 403
    disc = fan.copy(); disc.putalpha(disc_mask(fan.size, cx, cy, r)); disc = disc.crop((cx - r - 2, cy - r - 2, cx + r + 2, cy + r + 2))
    save(disc, "fan-disc")
    ring = fan.copy(); ring.putalpha(disc_mask(fan.size, cx, cy, r - 4, inside=False)); save(ring, "fan-ring")
    acc = np.zeros((disc.height, disc.width, 4), np.float32)
    for i in range(16):
        acc += np.asarray(disc.rotate(i * 15 / 16, resample=Image.BICUBIC), np.float32)
    save(Image.fromarray((acc / 16).astype(np.uint8)), "fan-blur")
    # belt loader drive pulley, to turn in place
    belt = Image.open(B / "belt.png").convert("RGB")
    px, py, pr = 372, 680, 50
    pul = belt.copy(); pul.putalpha(disc_mask(belt.size, px, py, pr)); save(pul.crop((px - pr - 2, py - pr - 2, px + pr + 2, py + pr + 2)), "pulley")
    # cockpit: crop, and turn the flat magenta windows into see-through glass (un-mixing the fringe)
    ck = np.asarray(Image.open(B / "cockpit-base-b.png").convert("RGB"), np.float32)[100:1030]
    M = np.array([255, 0, 255], np.float32)
    mag = np.clip((np.minimum(ck[..., 0], ck[..., 2]) - ck[..., 1] - 60) / 140, 0, 1)
    alpha = 1 - mag
    fg = (ck - (1 - alpha)[..., None] * M) / np.maximum(alpha, .05)[..., None]
    rgba = np.dstack([np.clip(fg, 0, 255), alpha * 255]).astype(np.uint8)
    save(Image.fromarray(rgba), "cockpit", 84)
    save(Image.open(B / "cockpit-base-b.png").convert("RGB").crop((0, 450, 1448, 1000)), "cockpit-thumb", 80)
    # skies: mirrored side by side so they tile seamlessly as the plane turns
    for name in ["sky-air", "sky-runway"]:
        if not (B / f"{name}.png").exists(): continue
        im = Image.open(B / f"{name}.png").convert("RGB")
        tile = Image.new("RGB", (im.width * 2, im.height)); tile.paste(im, (0, 0)); tile.paste(im.transpose(Image.FLIP_LEFT_RIGHT), (im.width, 0))
        save(tile.resize((tile.width * 2 // 3, tile.height * 2 // 3), Image.LANCZOS), name, 78)
    save(Image.open(B / "plan747.png").convert("RGB"), "plan747")
    for f in sorted((B / "cut").glob("*.png")):
        save(Image.open(f), f.stem, 86)

def build_html():
    page = (SRC / "plane.html").read_text()
    zoom = (SRC / "zoom.js").read_text() if (SRC / "zoom.js").exists() else "window.ZOOM = {};"
    tiles = "window.TILES = " + json.dumps(tile_index(), separators=(",", ":")) + ";"
    book_dir = DIST / "assets" / "book"
    book = sorted(f"assets/book/{f.name}" for f in book_dir.glob("*.webp")) if book_dir.exists() else []
    tiles += "\nwindow.BOOK_ASSETS = " + json.dumps(book, separators=(",", ":")) + ";"
    for marker, text in [("/*PARTS*/", (SRC / "parts.js").read_text()), ("/*HOTSPOTS*/", (SRC / "hotspots.js").read_text()),
                         ("/*ZOOM*/", zoom), ("/*TILES*/", tiles), ("/*MECHANISMS*/", (SRC / "mechanisms.js").read_text()),
                         ("/*BOOK*/", (SRC / "book.js").read_text()), ("/*APP*/", (SRC / "app.js").read_text())]:
        page = page.replace(marker, "\n" + text)
    (DIST / "artifact.html").write_text(page)
    head, _, body = page.partition("</style>")
    full = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
            '<meta name="description" content="An interactive cut-away of a Boeing 747-400 for children: zoom into the painting and open living How it works pages.">\n'
            '<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 32 32%27%3E%3Ccircle cx=%2716%27 cy=%2716%27 r=%2715%27 fill=%27%23f9f4e8%27 stroke=%27%235d2f24%27 stroke-width=%272%27/%3E%3Cpath d=%27M16 5l2 8 8 4v2l-8-2-1 6 3 2v1.5l-4-1-4 1V24l3-2-1-6-8 2v-2l8-4z%27 fill=%27%232c5aa0%27/%3E%3C/svg%3E">\n'
            '<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}'
            'body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>\n'
            + head + "</style>\n</head>\n<body>\n" + body + "\n</body>\n</html>\n")
    (DIST / "index.html").write_text(full)

def build_site():
    """deploy/site.zip: index.html and assets only (no artifact.html, no source art)."""
    import shutil, zipfile
    site = ROOT / "deploy" / "site"
    shutil.rmtree(site, ignore_errors=True)
    shutil.copytree(DIST / "assets", site / "assets")
    shutil.copy(DIST / "index.html", site / "index.html")
    shutil.copy(ROOT / "deploy" / "netlify-headers.txt", site / "_headers")
    with zipfile.ZipFile(ROOT / "deploy" / "site.zip", "w", zipfile.ZIP_DEFLATED) as z:
        for f in sorted(site.rglob("*")):
            if f.is_file(): z.write(f, f.relative_to(site))

if __name__ == "__main__":
    import sys
    if "--html-only" not in sys.argv:
        build_images()
    if "--html-only" not in sys.argv or "--tiles" in sys.argv:
        build_tiles()
    if "--html-only" not in sys.argv or "--book" in sys.argv:
        build_book()
    build_html()
    if "--site" in sys.argv:
        build_site()
    print("built", DIST)
