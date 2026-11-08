#!/usr/bin/python3
"""A flat watercolour tint for a sprite: its silhouette (from the line art, inside a rectangle) filled with one colour,
with soft uneven density like a wash, as RGBA (alpha = silhouette). No image call needed.

  flatwash.py lines.png X0 Y0 X1 Y1 R,G,B out.webp [--close 7]
"""
import os, subprocess, sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
lp = sys.argv[1]; x0, y0, x1, y1 = map(int, sys.argv[2:6]); col = np.array([int(v) for v in sys.argv[6].split(",")], np.float32) / 255
out = sys.argv[7]; close = int(sys.argv[sys.argv.index("--close") + 1]) if "--close" in sys.argv else 7
L = np.asarray(Image.open(lp).convert("L"), np.float32) / 255
H, W = L.shape
ink = np.zeros_like(L, bool); ink[y0:y1, x0:x1] = L[y0:y1, x0:x1] < .6
sil = ndi.binary_fill_holes(ndi.binary_closing(ink, np.ones((close, close)), iterations=2))
sil = ndi.binary_erosion(sil, iterations=1)
rng = np.random.default_rng(3)
n = ndi.gaussian_filter(rng.random((H, W)).astype(np.float32), 18); n = (n - n.min()) / (n.max() - n.min() + 1e-6)
dens = .75 + .35 * n                                   # uneven wash density
rgb = 1 - (1 - col)[None, None, :] * dens[..., None]
a = ndi.gaussian_filter(sil.astype(np.float32), 1.2)
img = Image.fromarray((np.dstack([rgb, a]) * 255 + .5).clip(0, 255).astype(np.uint8))
tmp = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(out))), "src", os.path.basename(out).replace(".webp", "-flat.png")); img.save(tmp)
subprocess.run(["cwebp", "-quiet", "-q", "80", "-alpha_q", "80", tmp, "-o", out], check=True)
print(out)
