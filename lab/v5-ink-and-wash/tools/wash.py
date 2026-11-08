#!/usr/bin/python3
"""Separate the watercolour wash from a painted line drawing.

  wash.py lines.png painted.png out.png [--webp out.webp] [--q 78] [--scale 1] [--full] [--close 9]
          [--nolines]  (the painted image has no lines of its own: skip the dark-line detection)
          [--holes mask.png]  (white = transparent hole, e.g. the windows of the drive cockpit)

1. register the painted image onto the line art (phase correlation on the ink),
2. mask out the ink: the line art's lines (dilated) plus whatever is much darker than its surroundings in the
   painted image (the model's own redrawn lines),
3. fill the masked pixels from the surrounding colour (normalised convolution, coarse to fine),
4. whiten the paper (so the wash only tints) and give it an alpha: the subject's silhouette (soft edge), or the
   whole picture with --full.
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
from skimage.registration import phase_cross_correlation

def arg(name, default=None, cast=str):
    a = sys.argv
    return cast(a[a.index(name) + 1]) if name in a else default

def disk(r):
    y, x = np.ogrid[-r:r + 1, -r:r + 1]; return x * x + y * y <= r * r

def fill(rgb, known):
    """Fill unknown pixels with a coarse-to-fine normalised convolution."""
    out = rgb.copy(); w = known.astype(np.float32)
    todo = ~known
    for sig in (1.5, 3, 6, 12, 24, 48, 96):
        if not todo.any(): break
        ws = ndi.gaussian_filter(w, sig)
        num = np.stack([ndi.gaussian_filter(rgb[..., c] * w, sig) for c in range(3)], -1)
        ok = todo & (ws > 0.02)
        out[ok] = num[ok] / ws[ok][:, None]
        todo &= ~ok
    return out

def main():
    lp, pp, op = sys.argv[1:4]
    L = Image.open(lp).convert("L"); W, H = L.size
    P = Image.open(pp).convert("RGB")
    if P.size != (W, H): P = P.resize((W, H), Image.LANCZOS)
    l = np.asarray(L, np.float32) / 255; p = np.asarray(P, np.float32) / 255
    lum = p[..., 0] * .299 + p[..., 1] * .587 + p[..., 2] * .114
    ink = l < .6
    # 1. register (translation) using ink darkness
    a = ndi.gaussian_filter(1 - l, 2); b = ndi.gaussian_filter(1 - lum, 2)
    shift, err, _ = phase_cross_correlation(a, b, upsample_factor=4, normalization=None)
    print("shift (dy, dx):", shift, "err", round(float(err), 3))
    if np.hypot(*shift) > 0.4:
        p = np.stack([ndi.shift(p[..., c], shift, order=1, mode="nearest") for c in range(3)], -1)
        lum = p[..., 0] * .299 + p[..., 1] * .587 + p[..., 2] * .114
    # 2. mask the lines
    mask = ndi.binary_dilation(ink, disk(2))
    if "--nolines" not in sys.argv:
        med = ndi.median_filter(lum, size=11)
        dark = (lum < med - .10) | (lum < .32)
        mask |= ndi.binary_dilation(dark, disk(1))
    # 3. fill
    out = fill(p, ~mask)
    out = ndi.gaussian_filter(out, (1.0, 1.0, 0))
    # 4. whiten the paper: the brightest 2% of the picture becomes white
    paper = np.percentile(out.reshape(-1, 3), 98, axis=0)
    out = np.clip(out / np.maximum(paper, .5), 0, 1)
    # alpha: silhouette
    if "--full" in sys.argv:
        alpha = np.ones((H, W), np.float32)
    else:
        col = (1 - out.min(-1)) > .06          # visibly tinted
        r = arg("--close", 9, int)
        sil = ndi.binary_closing(ink | col, disk(r), iterations=1)
        sil = ndi.binary_fill_holes(sil)
        lab, n = ndi.label(sil)
        if n:
            sizes = ndi.sum(sil, lab, index=np.arange(1, n + 1)); keep = np.zeros(n + 1, bool); keep[1:] = sizes > 400; sil = keep[lab]
        sil = ndi.binary_dilation(sil, disk(3))
        alpha = np.clip(ndi.gaussian_filter(sil.astype(np.float32), 3) * 1.2, 0, 1)
    hp = arg("--holes")
    if hp:
        hm = np.asarray(Image.open(hp).convert("L").resize((W, H)), np.float32) / 255
        alpha = alpha * (1 - hm)
    rgba = np.dstack([out, alpha])
    img = Image.fromarray((rgba * 255 + .5).astype(np.uint8))
    sc = arg("--scale", 1.0, float)
    if sc != 1: img = img.resize((int(W * sc), int(H * sc)), Image.LANCZOS)
    img.save(op)
    wp = arg("--webp")
    if wp:
        import subprocess
        subprocess.run(["cwebp", "-quiet", "-q", str(arg("--q", 78, int)), "-alpha_q", "70", "-m", "6", op, "-o", wp], check=True)
        import os; print(wp, os.path.getsize(wp) // 1024, "KB")

if __name__ == "__main__":
    main()
