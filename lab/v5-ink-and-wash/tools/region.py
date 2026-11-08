#!/usr/bin/python3
"""Redraw one region of a picture: crop it (with context) enlarged for an image edit, then paste the edit back.

  region.py crop  <src.png> X0 Y0 X1 Y1 <crop.png> [--mp 1.4]
  region.py paste <src.png> <edited.png> X0 Y0 X1 Y1 <out.png> [--inner X0 Y0 X1 Y1] [--feather 10]
                  [--protect X0 Y0 X1 Y1]... [--lines]

crop:  the rectangle is enlarged to about --mp megapixels (aspect kept) for the model.
paste: the edited picture is shrunk back onto the rectangle; only --inner (default: the whole rectangle less a
       12% margin) is pasted, with a feathered edge; --protect rectangles keep the original (e.g. the family that
       the dive needs). --lines: the seam band keeps the darker of old and new (so cut lines join instead of fading).
Writes <out>.json with the rectangles, so the region is reproducible.
"""
import json, sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

def opt(name, n, default=None, multi=False):
    a = sys.argv; out = []
    for i, v in enumerate(a):
        if v == name: out.append([float(x) for x in a[i + 1:i + 1 + n]])
    if multi: return out
    return (out[-1] if n > 1 else out[-1][0]) if out else default

mode = sys.argv[1]
if mode == "crop":
    src, x0, y0, x1, y1, out = sys.argv[2], *map(float, sys.argv[3:7]), sys.argv[7]
    mp = opt("--mp", 1, 1.4)
    im = Image.open(src).convert("RGB")
    c = im.crop((int(x0), int(y0), int(x1), int(y1)))
    k = (mp * 1e6 / (c.width * c.height)) ** .5
    c.resize((int(c.width * k), int(c.height * k)), Image.LANCZOS).save(out)
    json.dump({"src": src, "rect": [x0, y0, x1, y1], "k": k}, open(out + ".json", "w"))
    print(out, int(c.width * k), int(c.height * k), "k=%.2f" % k)
elif mode == "paste":
    src, ed, x0, y0, x1, y1, out = sys.argv[2], sys.argv[3], *map(float, sys.argv[4:8]), sys.argv[8]
    x0, y0, x1, y1 = map(int, (x0, y0, x1, y1))
    im = Image.open(src).convert("RGB"); A = np.asarray(im, np.float32)
    E = np.asarray(Image.open(ed).convert("RGB").resize((x1 - x0, y1 - y0), Image.LANCZOS), np.float32)
    mx, my = (x1 - x0) * .12, (y1 - y0) * .12
    inner = opt("--inner", 4, [x0 + mx, y0 + my, x1 - mx, y1 - my])
    fe = opt("--feather", 1, 10)
    m = np.zeros(A.shape[:2], np.float32)
    ix0, iy0, ix1, iy1 = map(int, inner)
    m[iy0:iy1, ix0:ix1] = 1
    for p in opt("--protect", 4, multi=True):
        m[int(p[1]):int(p[3]), int(p[0]):int(p[2])] = 0
    m = ndi.gaussian_filter(m, fe / 2.5)
    m[:y0, :] = 0; m[y1:, :] = 0; m[:, :x0] = 0; m[:, x1:] = 0
    N = A.copy(); N[y0:y1, x0:x1] = E
    M = m[..., None]
    R = A * (1 - M) + N * M
    if "--lines" in sys.argv:
        band = (m > .02) & (m < .98)
        R[band] = np.minimum(A[band], N[band])
    Image.fromarray(np.clip(R + .5, 0, 255).astype(np.uint8)).save(out)
    json.dump({"src": src, "edited": ed, "rect": [x0, y0, x1, y1], "inner": inner, "feather": fe,
               "protect": opt("--protect", 4, multi=True)}, open(out + ".json", "w"))
    print(out)
