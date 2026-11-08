#!/usr/bin/env python3
"""Cut a subject out of its flat key-colour background and give it a soft shadow.

  /usr/bin/python3 tools/cut.py <src.png> <name> [--key magenta|green] [--box x0,y0,x1,y1]
                                [--shadow drop|ground|none] [--keep N] [--q 90]

Writes art/cut/<name>.png (RGBA, trimmed, full resolution, the master), art/<name>.webp (shipped)
and art/<name>-sh.webp (the shadow, quarter resolution, black with alpha), and prints a JSON line
with the trimmed size and the offset of the trim inside the source (so layouts can be computed).
"""
import json, subprocess, sys
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

HERE = Path(__file__).resolve().parent.parent
LO, HI = 70, 180   # key distance where a pixel starts to turn transparent, and where it is fully gone


def key_alpha(rgb, key, lo=None):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    if key == "magenta":
        d = np.minimum(r, b) - g
        col = np.array([255, 0, 255], np.float32)
    else:
        d = g - np.maximum(r, b)
        col = np.array([0, 255, 0], np.float32)
    lo = LO if lo is None else lo
    k = np.clip((d - lo) / (HI - lo), 0, 1)          # 1 = pure key colour
    return 1 - k, col


def cut(src, name, key="magenta", box=None, shadow="drop", keep=1, q=90, fix=None):
    im = Image.open(src).convert("RGB")
    if box:
        im = im.crop(box)
    rgb = np.asarray(im).astype(np.float32)
    a, col = key_alpha(rgb, key)
    # a thin band along the outline (hair, cables, antialiased edges) is mixed with the key colour although the
    # strict threshold calls it solid: there, read the alpha with a much lower threshold
    band = ndi.binary_dilation(a < 0.5, iterations=4) & (a >= 0.5)
    a_soft, _ = key_alpha(rgb, key, lo=12)
    a = np.where(band, np.minimum(a, a_soft), a)
    # keep the biggest solid pieces only (drops stray specks of paint in the key colour)
    solid = a > 0.5
    lab, n = ndi.label(solid)
    if n > 1:
        sizes = ndi.sum(solid, lab, range(1, n + 1))
        order = np.argsort(sizes)[::-1]
        big = sizes[order[0]]
        keepids = [order[i] + 1 for i in range(min(len(order), max(keep, 1)))
                   if sizes[order[i]] > big * 0.002 or i < keep]
        # also keep every piece bigger than 0.2% of the main one (wheels, bubbles...)
        keepids = set(keepids) | {i + 1 for i in range(n) if sizes[i] > big * 0.002}
        mask = np.isin(lab, list(keepids))
        mask = ndi.binary_dilation(mask, iterations=3)
        a = a * mask
    # un-mix the key colour from the soft edge pixels, then kill what is left of its tint
    am = np.maximum(a, 0.05)[..., None]
    fg = (rgb - (1 - a)[..., None] * col) / am
    fg = np.clip(fg, 0, 255)
    # soft edge pixels (hair, fur, cables) keep a tint of the key: take it out fully there, gently inside
    edge = np.clip((0.97 - a) / 0.3, 0, 1)
    if key == "magenta":
        spill = np.clip(np.minimum(fg[..., 0], fg[..., 2]) - fg[..., 1] - 25 * (1 - edge), 0, None)
        k = .6 + .4 * edge
        fg[..., 0] -= spill * k; fg[..., 2] -= spill * k
    else:
        spill = np.clip(fg[..., 1] - np.maximum(fg[..., 0], fg[..., 2]) - 25 * (1 - edge), 0, None)
        fg[..., 1] -= spill * (.7 + .3 * edge)
    # paint that the model blended with the key along the outline (pink hair wisps): no key hue on the outline
    band6 = ndi.binary_dilation(a < 0.5, iterations=6)
    if key == "magenta":
        warm = band6 & (fg[..., 0] > fg[..., 1])
        fg[..., 2] = np.where(warm, np.minimum(fg[..., 2], fg[..., 1] * 1.02), fg[..., 2])
    else:
        fg[..., 1] = np.where(band6, np.minimum(fg[..., 1], np.maximum(fg[..., 0], fg[..., 2]) * 1.05), fg[..., 1])
    if fix:
        a, fg = fix(rgb, a, fg)
    a = np.where(a < 0.04, 0, a)
    ys, xs = np.nonzero(a > 0.04)
    pad = 6
    x0, y0 = max(xs.min() - pad, 0), max(ys.min() - pad, 0)
    x1, y1 = min(xs.max() + pad + 1, a.shape[1]), min(ys.max() + pad + 1, a.shape[0])
    rgba = np.dstack([np.clip(fg, 0, 255), a * 255]).astype(np.uint8)[y0:y1, x0:x1]
    out = Image.fromarray(rgba, "RGBA")
    (HERE / "art/cut").mkdir(parents=True, exist_ok=True)
    out.save(HERE / f"art/cut/{name}.png")
    webp(HERE / f"art/cut/{name}.png", HERE / f"art/{name}.webp", q)
    info = {"name": name, "w": int(x1 - x0), "h": int(y1 - y0), "ox": int(x0 + (box[0] if box else 0)),
            "oy": int(y0 + (box[1] if box else 0))}
    if shadow != "none":
        info["shadow"] = make_shadow(rgba[..., 3].astype(np.float32) / 255, name, shadow)
    print(json.dumps(info))
    return info


def make_shadow(alpha, name, kind):
    """A soft shadow at quarter size, with a margin; returns how it sits relative to the subject."""
    s = 4
    h, w = alpha.shape
    small = np.asarray(Image.fromarray((alpha * 255).astype(np.uint8)).resize((max(w // s, 1), max(h // s, 1)),
                                                                             Image.BILINEAR)).astype(np.float32) / 255
    m = 24  # margin in small pixels
    H, W = small.shape[0] + 2 * m, small.shape[1] + 2 * m
    canvas = np.zeros((H, W), np.float32)
    if kind == "drop":
        # the whole silhouette, offset down and a little right, very soft
        canvas[m + 4:m + 4 + small.shape[0], m + 2:m + 2 + small.shape[1]] = small
        sh = ndi.gaussian_filter(canvas, 7) * 0.30
    else:
        # ground contact: the lowest band of the silhouette, flattened onto the floor, plus a wide soft pool
        rows = np.nonzero(small.max(1) > 0.3)[0]
        bottom = rows.max() if len(rows) else small.shape[0] - 1
        band = small[max(bottom - 6, 0):bottom + 1].max(0)
        cols = np.nonzero(band > 0.2)[0]
        yy = m + bottom
        if len(cols):
            c0, c1 = cols.min(), cols.max()
            canvas[yy - 1:yy + 2, m + c0:m + c1 + 1] = 1
            pool = np.zeros_like(canvas)
            cx, half = m + (c0 + c1) / 2, (c1 - c0) / 2 + 6
            Y, X = np.mgrid[0:H, 0:W]
            pool = np.clip(1 - ((X - cx) / half) ** 2 - ((Y - yy) / 7) ** 2, 0, 1)
            canvas = ndi.gaussian_filter(canvas, 2.2) * 0.9 + ndi.gaussian_filter(pool, 4) * 0.35
        sh = np.clip(canvas, 0, 1) * 0.42
    rgba = np.zeros((H, W, 4), np.uint8)
    rgba[..., 0], rgba[..., 1], rgba[..., 2] = 40, 32, 24
    rgba[..., 3] = np.clip(sh * 255, 0, 255).astype(np.uint8)
    p = HERE / f"art/cut/{name}-sh.png"
    Image.fromarray(rgba, "RGBA").save(p)
    webp(p, HERE / f"art/{name}-sh.webp", 80)
    # in subject pixels: the shadow image covers (x - m*s, y - m*s, W*s, H*s)
    return {"dx": -m * s, "dy": -m * s, "w": W * s, "h": H * s}


def webp(src, dst, q):
    subprocess.run(["cwebp", "-quiet", "-q", str(min(q, 86)), "-alpha_q", "90", "-m", "6", str(src), "-o", str(dst)],
                   check=True)


if __name__ == "__main__":
    args = sys.argv[1:]
    src, name = args[0], args[1]
    opt = {"key": "magenta", "box": None, "shadow": "drop", "keep": 1, "q": 90}
    i = 2
    while i < len(args):
        k = args[i][2:]
        v = args[i + 1]
        opt[k] = tuple(int(t) for t in v.split(",")) if k == "box" else (int(v) if k in ("keep", "q") else v)
        i += 2
    cut(src, name, **opt)
