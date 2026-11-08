#!/usr/bin/env python3
"""Build every cut-out of the v4 encyclopedia pages from the generated pictures, and write assets.js
(sizes, shadows and outlines that data.js lays out). Run from anywhere:  /usr/bin/python3 tools/build.py [name…]

Every subject is its own picture on a flat key colour; nothing has a background, so a change to one subject
never touches another: re-generate its source, run this, done."""
import json, sys
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

sys.path.insert(0, str(Path(__file__).resolve().parent))
import cut as C
import outline as O
import xray_fix

HERE = Path(__file__).resolve().parent.parent
SRC = HERE / "art/src"

# name: (source, options)    shadow: drop (floating specimen), none (stands on the page: shadow ellipses in data.js)
CUTS = {
    "plane":       ("plane-a.png",      {"shadow": "none"}),
    "family":      ("family-a.png",     {"shadow": "none"}),
    "flightdeck":  ("flightdeck-a.png", {}),
    "skin":        ("skin-a.png",       {}),
    "cell":        ("cell-a.png",       {"key": "green"}),
    "lysosome":    ("lysosome-a.png",   {"key": "green"}),
    "drive-frame": ("drive-frame-a.png", {"shadow": "none"}),
    "shelter":     ("shelter-a.png",    {"shadow": "none", "fix": "glass"}),
    "waiting":     ("edit1-two-people-a.png", {"shadow": "none"}),   # edit test 1: two more people at the bus stop
    "cup":         ("edit2-cup-a.png",  {"shadow": "none"}),         # edit test 2: the captain's coffee cup
}


def glass(rgb, a, fg):
    """Glass painted over magenta comes out lilac: make it a pale, mostly clear blue-grey film instead."""
    d = np.minimum(rgb[..., 0], rgb[..., 2]) - rgb[..., 1]          # read the lilac from the picture as painted
    lil = np.clip((d - 8) / 30, 0, 1) * (a > 0.02)
    lil = ndi.gaussian_filter(lil, 1.0)
    lum = fg.mean(2, keepdims=True)
    film = np.clip(np.array([200, 222, 228], np.float32) * (0.75 + 0.25 * lum / 255), 0, 255)
    fg = fg * (1 - lil[..., None]) + film * lil[..., None]
    a = a * (1 - lil) + lil * np.clip(0.18 + (lum[..., 0] - 150) / 400, 0.12, 0.5)
    return a, fg


FIXES = {"glass": glass}
SPECIAL = {"woman-xray": ("woman-xray-a.png", xray_fix.fix)}
# parts sheets: one picture, several stickers (connected pieces, in reading order: rows top to bottom, left to right)
SHEETS = {
    "town": ("town-a.png", ["tower", "terminal", "church", "house", "houses", "tree", "conifer"], 2),
    "drive-parts": ("drive-parts-a.png", ["yoke", "levers", "rear747", "side747"], 2),
}
# vignettes on white paper (soft watercolour edges): keyed by whiteness
WHITE = {"riverbridge": "riverbridge-b.png"}
# square full-frame paintings used inside round insets
PLAIN = {"pedals": "pedals-a.png", "sky": "sky-a.png"}


# small stickers and every shadow go into one picture (fewer requests); the renderer draws sub-rectangles
ATLAS = ["tower", "terminal", "church", "house", "houses", "tree", "conifer", "yoke", "levers", "rear747", "side747", "cup"]


def pack_atlas(assets):
    items = []
    for n in ATLAS:
        if n in assets:
            items.append((n, None, Image.open(HERE / f"art/cut/{n}.png").convert("RGBA")))
    for n, a in assets.items():
        if a.get("shadow") and (HERE / f"art/cut/{n}-sh.png").exists():
            items.append((n, "shadow", Image.open(HERE / f"art/cut/{n}-sh.png").convert("RGBA")))
    items.sort(key=lambda t: -t[2].height)
    W, pad, x, y, rowh, place = 2048, 4, 0, 0, 0, []
    for n, kind, im in items:
        if x + im.width > W:
            x, y, rowh = 0, y + rowh + pad, 0
        place.append((n, kind, im, x, y)); x += im.width + pad; rowh = max(rowh, im.height)
    H = y + rowh
    atlas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    for n, kind, im, x, y in place:
        atlas.paste(im, (x, y))
        rect = [x, y, im.width, im.height]
        if kind:
            assets[n]["shadow"]["atlas"] = rect
        else:
            assets[n]["atlas"] = rect
    atlas.save(HERE / "art/cut/atlas.png")
    C.webp(HERE / "art/cut/atlas.png", HERE / "art/atlas.webp", 88)
    for n, kind, im, x, y in place:          # the separate files are no longer shipped
        f = HERE / (f"art/{n}-sh.webp" if kind else f"art/{n}.webp")
        if f.exists():
            f.unlink()
    return W, H


def split_sheet(src, names, rows, key="magenta"):
    rgb = np.asarray(Image.open(src).convert("RGB")).astype(np.float32)
    a, _ = C.key_alpha(rgb, key)
    m = ndi.binary_dilation(a > 0.5, iterations=12)
    lab, n = ndi.label(m)
    sizes = ndi.sum(m, lab, range(1, n + 1))
    comps = sorted(range(n), key=lambda i: -sizes[i])[:len(names)]
    boxes = []
    for i in comps:
        ys, xs = np.nonzero(lab == i + 1)
        boxes.append((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    # reading order: split into rows by the vertical centre, then left to right
    cy = sorted(boxes, key=lambda b: (b[1] + b[3]) / 2)
    h = rgb.shape[0]
    ordered = sorted(boxes, key=lambda b: (int(((b[1] + b[3]) / 2) / (h / rows)), b[0]))
    out = {}
    for name, b in zip(names, ordered):
        info = C.cut(src, name, key=key, box=tuple(int(v) for v in b), shadow="none")
        out[name] = info
    return out


def white_vignette(src, name):
    """A watercolour patch on white paper: alpha from how far a pixel is from the paper white."""
    im = Image.open(src).convert("RGB")
    rgb = np.asarray(im).astype(np.float32)
    paper = np.median(np.concatenate([rgb[:8].reshape(-1, 3), rgb[-8:].reshape(-1, 3)]), 0)
    d = np.max(np.abs(rgb - paper), axis=2)
    a = np.clip((d - 6) / 40, 0, 1)
    # only the paper that is connected to the border becomes see-through (clouds of white inside stay)
    outside = ~ndi.binary_fill_holes(a > 0.02)
    a = np.where(outside, 0, np.maximum(a, ndi.binary_erosion(~outside, iterations=10) * 1.0))
    a = ndi.gaussian_filter(a, 1.2)
    # roads and water that run off the picture's edge: feather them out instead of a hard cut
    H, W = a.shape
    f = 70
    ramp_x = np.clip(np.minimum(np.arange(W), W - 1 - np.arange(W)) / f, 0, 1)
    ramp_y = np.clip(np.minimum(np.arange(H), H - 1 - np.arange(H)) / f, 0, 1)
    a = a * np.sqrt(ramp_x[None, :] * ramp_y[:, None])
    fg = (rgb - (1 - a)[..., None] * paper) / np.maximum(a, .05)[..., None]
    ys, xs = np.nonzero(a > 0.03)
    x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
    rgba = np.dstack([np.clip(fg, 0, 255), a * 255]).astype(np.uint8)[y0:y1, x0:x1]
    Image.fromarray(rgba).save(HERE / f"art/cut/{name}.png")
    C.webp(HERE / f"art/cut/{name}.png", HERE / f"art/{name}.webp", 88)
    return {"name": name, "w": int(x1 - x0), "h": int(y1 - y0), "ox": int(x0), "oy": int(y0)}


def plain(src, name, q=86):
    im = Image.open(src).convert("RGB")
    im.save(HERE / f"art/cut/{name}.png")
    C.webp(HERE / f"art/cut/{name}.png", HERE / f"art/{name}.webp", q)
    return {"name": name, "w": im.width, "h": im.height, "ox": 0, "oy": 0}


def main(only):
    store = HERE / "art/assets.json"
    assets = json.loads(store.read_text()) if store.exists() else {}
    want = lambda n: not only or n in only

    for n, (s, opt) in CUTS.items():
        if want(n) and (SRC / s).exists():
            opt = dict(opt)
            if "fix" in opt:
                opt["fix"] = FIXES[opt["fix"]]
            assets[n] = C.cut(SRC / s, n, **opt)
    for n, (s, fix) in SPECIAL.items():
        if want(n) and (SRC / s).exists():
            assets[n] = C.cut(SRC / s, n, shadow="none", fix=fix)
    for sheet, (s, names, rows) in SHEETS.items():
        if (want(sheet) or any(want(x) for x in names)) and (SRC / s).exists():
            assets.update(split_sheet(SRC / s, names, rows))
    for n, s in WHITE.items():
        if want(n) and (SRC / s).exists():
            assets[n] = white_vignette(SRC / s, n)
    for n, s in PLAIN.items():
        if want(n) and (SRC / s).exists():
            assets[n] = plain(SRC / s, n)
    # outlines of whole subjects (the hit areas of the subjects that are one part each)
    for n in list(assets):
        p = HERE / f"art/cut/{n}.png"
        if p.exists() and (want(n) or "outline" not in assets[n]) and n not in PLAIN:
            try:
                assets[n]["outline"] = O.outline(p, tol=4, min_frac=0.02, dilate=3)
            except Exception as e:  # noqa
                print("outline failed", n, e)
    for n, a in assets.items():
        a.pop("atlas", None)
        if a.get("shadow"):
            a["shadow"].pop("atlas", None)
    pack_atlas(assets)
    for n, a in assets.items():
        a["src"] = "art/atlas.webp" if "atlas" in a else f"art/{n}.webp"
        if "shadow" in a and a["shadow"]:
            a["shadow"]["src"] = "art/atlas.webp"
    store.write_text(json.dumps(assets, indent=1))
    (HERE / "assets.js").write_text("// written by tools/build.py: every cut-out's size, shadow and outline (in its own pixels)\n"
                                    "window.V4_ASSETS = " + json.dumps(assets, separators=(",", ":")) + ";\n")
    print("assets:", ", ".join(f"{k} {v['w']}x{v['h']}" for k, v in assets.items()))


if __name__ == "__main__":
    main(set(sys.argv[1:]))
