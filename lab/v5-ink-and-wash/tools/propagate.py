#!/usr/bin/python3
"""Copy a changed patch (lines + painting) from one space to another that shows the same place at a known scale.
No image call: the two layers are pasted separately, the lines as the darker of old and new.

  propagate.py <src-lines> <src-paint> <dst-lines> <dst-paint> X0 Y0 X1 Y1 S TX TY [--holes mask.png] [--feather 4] [--box X0 Y0 X1 Y1]

Source rect (X0..Y1) lands at dst = S*src + (TX, TY). --holes: a window mask of the destination (white = see-through);
the patch's silhouette is cut out of it so the new object is not see-through.
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
a = sys.argv
sl, sp, dl, dp = a[1:5]; x0, y0, x1, y1 = map(float, a[5:9]); S, TX, TY = map(float, a[9:12])
opt = lambda n, d=None: a[a.index(n) + 1] if n in a else d
fe = float(opt("--feather", 4))
w, h = int(round((x1 - x0) * S)), int(round((y1 - y0) * S)); dx, dy = int(round(S * x0 + TX)), int(round(S * y0 + TY))
def patch(p): return np.asarray(Image.open(p).convert("RGB").crop((int(x0), int(y0), int(x1), int(y1))).resize((w, h), Image.LANCZOS), np.float32)
L = np.asarray(Image.open(dl).convert("RGB"), np.float32).copy(); P = np.asarray(Image.open(dp).convert("RGB"), np.float32).copy()
pl, pp = patch(sl), patch(sp)
# only the new object: ink shapes that do not touch the patch border (the surroundings run off the edges), filled
ink = pl.mean(-1) < 140
lab, n = ndi.label(ndi.binary_closing(ink, np.ones((5, 5))))
edge = set(np.unique(np.r_[lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
obj = np.isin(lab, [k for k in range(1, n + 1) if k not in edge])
obj = ndi.binary_fill_holes(ndi.binary_closing(obj, np.ones((9, 9)), iterations=2))
# --box X0 Y0 X1 Y1 (source coords, repeatable): always part of the object (an ellipse in that box)
for i, v in enumerate(a):
    if v == "--box":
        bx0, by0, bx1, by1 = [(float(q) - o) * S for q, o in zip(a[i + 1:i + 5], (x0, y0, x0, y0))]
        yy, xx = np.mgrid[0:h, 0:w]
        obj |= ((xx - (bx0 + bx1) / 2) / ((bx1 - bx0) / 2)) ** 2 + ((yy - (by0 + by1) / 2) / ((by1 - by0) / 2)) ** 2 <= 1
m = ndi.gaussian_filter(ndi.binary_dilation(obj, iterations=3).astype(np.float32), fe / 2)[..., None]
# inside the object the new lines replace the old (it hides what is behind it); on its feathered rim the darker wins
core = ndi.gaussian_filter(ndi.binary_erosion(obj, iterations=2).astype(np.float32), 1)[..., None]
sub = L[dy:dy + h, dx:dx + w]
L[dy:dy + h, dx:dx + w] = np.minimum(sub, pl * m + 255 * (1 - m)) * (1 - core) + pl * core
P[dy:dy + h, dx:dx + w] = P[dy:dy + h, dx:dx + w] * (1 - m) + pp * m
Image.fromarray(L.clip(0, 255).astype(np.uint8)).save(dl); Image.fromarray(P.clip(0, 255).astype(np.uint8)).save(dp)
hp = opt("--holes")
if hp:
    H = np.asarray(Image.open(hp).convert("L")).copy()
    sil = ndi.binary_dilation(obj, iterations=2)
    sub = H[dy:dy + h, dx:dx + w]; sub[sil[:sub.shape[0], :sub.shape[1]]] = 0
    Image.fromarray(H).save(hp)
print(f"patch {w}x{h} at {dx},{dy}")
