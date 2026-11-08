#!/usr/bin/python3
"""Line an edited sheet up with the sheet it was edited from, so a swapped sticker sits exactly where the
original did (the town's jumbo jet -> the cut-away jet; the family -> the see-through family).

  /usr/bin/python3 tools/register.py plane-ext plane-cutaway   -> art/sheets/plane-cutaway-aligned.png

Finds the scale + translation that best overlaps the two magenta-keyed silhouettes (IoU), and resamples the
edited sheet into the original's frame. Prints the IoU before and after.
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

HERE = Path(__file__).resolve().parent.parent
S = HERE / "art" / "sheets"


def mask(im):
    t = np.asarray(im.convert("RGB")).astype(np.float32)
    return (np.minimum(t[..., 0], t[..., 2]) - t[..., 1]) < 120


def iou(a, b):
    return (a & b).sum() / max(1, (a | b).sum())


def warp(m, s, tx, ty, shape):
    # output pixel (x, y) samples input at ((x - tx) / s, (y - ty) / s)
    H, W = shape
    return ndi.affine_transform(m.astype(np.float32), [1 / s, 1 / s], offset=[-ty / s, -tx / s], output_shape=(H, W), order=1) > .5


src, ed = sys.argv[1], sys.argv[2]
A = Image.open(S / f"{src}.png"); B = Image.open(S / f"{ed}.png")
if B.size != A.size:
    print(f"sizes differ {B.size} vs {A.size}: resizing the edit first")
    B = B.resize(A.size, Image.LANCZOS)
ma, mb = mask(A), mask(B)
f = 4
sa, sb = ma[::f, ::f], mb[::f, ::f]
best = (iou(sa, sb), 1, 0, 0)
print("IoU before", round(best[0], 4))
for s in np.linspace(.94, 1.06, 25):
    for tx in range(-12, 13, 2):
        for ty in range(-12, 13, 2):
            v = iou(sa, warp(sb, s, tx, ty, sa.shape))
            if v > best[0]:
                best = (v, s, tx, ty)
v, s, tx, ty = best
best = (0, s, tx * f, ty * f)
for ds in np.linspace(-.006, .006, 7):
    for dx in range(-4, 5, 2):
        for dy in range(-4, 5, 2):
            S2, X2, Y2 = s + ds, tx * f + dx, ty * f + dy
            v = iou(ma[::2, ::2], warp(mb[::2, ::2], S2, X2 / 2, Y2 / 2, ma[::2, ::2].shape))
            if v > best[0]:
                best = (v, S2, X2, Y2)
v, s, tx, ty = best
print(f"best scale {s:.4f} shift {tx},{ty}  IoU {v:.4f}")
out = B.transform(A.size, Image.AFFINE, (1 / s, 0, -tx / s, 0, 1 / s, -ty / s), resample=Image.BICUBIC, fillcolor=(253, 3, 251))
out.save(S / f"{ed}-aligned.png")
print("wrote", S / f"{ed}-aligned.png")
