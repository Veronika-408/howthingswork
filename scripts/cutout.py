#!/usr/bin/env python3
"""Cut painted objects off their ivory paper: cutout.py <in.png> <out-prefix> [min_area] [--punch].

Paper is flood-filled from the border (it stops at the ink outlines), so white objects such as
the catering box stay solid. Each remaining piece is saved as <prefix>-<n>.png (RGBA, cropped),
numbered top-to-bottom then left-to-right, and its box is printed as JSON.
"""
import json, sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
from skimage.segmentation import flood

src, prefix = sys.argv[1], sys.argv[2]
min_area = int(sys.argv[3]) if len(sys.argv) > 3 and sys.argv[3].isdigit() else 4000
punch = "--punch" in sys.argv          # also clear paper-coloured pixels inside the piece (luggage handles)
im = Image.open(src).convert("RGB"); a = np.asarray(im).astype(np.float32)
h, w, _ = a.shape
border = np.concatenate([a[:6].reshape(-1, 3), a[-6:].reshape(-1, 3), a[:, :6].reshape(-1, 3), a[:, -6:].reshape(-1, 3)])
paper = np.median(border, 0)
dist = np.sqrt(((a - paper) ** 2).sum(-1))
near = (dist < 16).astype(np.uint8)
bg = np.zeros((h, w), bool)
for y, x in [(0, 0), (0, w - 1), (h - 1, 0), (h - 1, w - 1), (0, w // 2), (h - 1, w // 2), (h // 2, 0), (h // 2, w - 1)]:
    if near[y, x]: bg |= flood(near, (y, x), connectivity=1)
obj = ndi.binary_closing(~bg, iterations=2)
# fill enclosed holes only when they are big (a white box body) or painted; bare paper inside a
# handle loop stays see-through
holes, nh = ndi.label(ndi.binary_fill_holes(obj) & ~obj)
for j, sl in enumerate(ndi.find_objects(holes), 1):
    hm = holes[sl] == j
    if hm.sum() > 30000 or dist[sl][hm].mean() > 16: obj[sl] |= hm
obj = ndi.binary_opening(obj, iterations=2)
lab, n = ndi.label(obj)
boxes = []
for i, sl in enumerate(ndi.find_objects(lab), 1):
    m = lab[sl] == i
    if m.sum() < min_area: continue
    boxes.append((sl, i))
boxes.sort(key=lambda b: (round(b[0][0].start / 120), b[0][1].start))
out = []
for k, (sl, i) in enumerate(boxes, 1):
    pad = 6
    y0, y1 = max(0, sl[0].start - pad), min(h, sl[0].stop + pad)
    x0, x1 = max(0, sl[1].start - pad), min(w, sl[1].stop + pad)
    m = (lab[y0:y1, x0:x1] == i).astype(np.float32)
    m = ndi.gaussian_filter(m, 1.0)                    # soft watercolour edge
    if punch: m *= np.clip((dist[y0:y1, x0:x1] - 8) / 10, 0, 1)
    rgba = np.dstack([a[y0:y1, x0:x1], np.clip(m * 255, 0, 255)]).astype(np.uint8)
    Image.fromarray(rgba).save(f"{prefix}-{k}.png")
    out.append({"n": k, "x": x0, "y": y0, "w": x1 - x0, "h": y1 - y0})
print(json.dumps(out))
