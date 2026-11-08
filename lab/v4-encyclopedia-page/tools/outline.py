#!/usr/bin/env python3
"""Outline of a cut-out (its alpha), simplified, in the cut-out's own pixels.
  /usr/bin/python3 tools/outline.py <cut.png> [tolerance=3] [min_area_frac=0.01] [box x0,y0,x1,y1] [dilate]
Prints JSON: a list of polygons [[x,y],...]. With a box, only that part of the picture is outlined."""
import json, sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
from skimage import measure


def outline(path, tol=3.0, min_frac=0.01, box=None, dilate=4, thresh=0.35):
    a = np.asarray(Image.open(path).convert("RGBA"))[..., 3].astype(np.float32) / 255
    m = a > thresh
    if box:
        mm = np.zeros_like(m); x0, y0, x1, y1 = box; mm[y0:y1, x0:x1] = m[y0:y1, x0:x1]; m = mm
    m = ndi.binary_closing(m, iterations=6)
    m = ndi.binary_fill_holes(m)
    if dilate:
        m = ndi.binary_dilation(m, iterations=dilate)
    lab, n = ndi.label(m)
    sizes = ndi.sum(m, lab, range(1, n + 1)) if n else []
    out = []
    big = max(sizes) if n else 0
    for i in range(n):
        if sizes[i] < big * min_frac:
            continue
        comp = np.pad(lab == i + 1, 1)
        cs = measure.find_contours(comp.astype(np.float32), 0.5)
        c = max(cs, key=len)
        c = measure.approximate_polygon(c, tol)
        out.append([[round(float(p[1]) - 1, 1), round(float(p[0]) - 1, 1)] for p in c[:-1]])
    return out


if __name__ == "__main__":
    tol = float(sys.argv[2]) if len(sys.argv) > 2 else 3
    mf = float(sys.argv[3]) if len(sys.argv) > 3 else 0.01
    box = tuple(int(v) for v in sys.argv[4].split(",")) if len(sys.argv) > 4 and sys.argv[4] != "-" else None
    dil = int(sys.argv[5]) if len(sys.argv) > 5 else 4
    print(json.dumps(outline(sys.argv[1], tol, mf, box, dil)))
