#!/usr/bin/python3
"""Paste a child's line art, scaled, into the parent's line art as a guide for an in-place redraw.

  guide.py parent.png child.png S TX TY out.png [--part X0 Y0 X1 Y1] [--erase X0 Y0 X1 Y1]... [--json out.json]

Child point (x, y) lands at parent (S*x + TX, S*y + TY). --part limits which part of the child is pasted (child
coords); --erase whitens parent rectangles first (the old drawing of the thing). The result is the parent with the
child's lines multiplied in; crop it with region.py for the edit. The same S, TX, TY give the dive axis exactly.
"""
import json, sys
import numpy as np
from PIL import Image

a = sys.argv
parent, child, S, TX, TY, out = a[1], a[2], float(a[3]), float(a[4]), float(a[5]), a[6]
def rects(name):
    r = []
    for i, v in enumerate(a):
        if v == name: r.append([float(x) for x in a[i + 1:i + 5]])
    return r
P = Image.open(parent).convert("L"); C = Image.open(child).convert("L")
part = (rects("--part") or [[0, 0, C.width, C.height]])[0]
p = np.asarray(P, np.float32)
for r in rects("--erase"):
    p[int(r[1]):int(r[3]), int(r[0]):int(r[2])] = 255
c = C.crop(tuple(int(v) for v in part))
w, h = int(round(c.width * S)), int(round(c.height * S))
cs = np.asarray(c.resize((w, h), Image.LANCZOS), np.float32)
# darken the small copy a little so thin lines survive (the model redraws them at the parent's weight anyway)
cs = 255 - np.clip((255 - cs) * 1.6, 0, 255)
x0, y0 = int(round(S * part[0] + TX)), int(round(S * part[1] + TY))
sub = p[y0:y0 + h, x0:x0 + w]
p[y0:y0 + h, x0:x0 + w] = np.minimum(sub, cs[:sub.shape[0], :sub.shape[1]])
Image.fromarray(p.astype(np.uint8)).save(out)
meta = {"parent": parent, "child": child, "S": S, "TX": TX, "TY": TY, "part": part, "erase": rects("--erase")}
json.dump(meta, open(out + ".json", "w")); print(out, meta)
