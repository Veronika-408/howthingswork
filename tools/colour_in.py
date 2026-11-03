#!/usr/bin/env python3
"""Colour a machine in on the shared map without editing the map itself.

  python3 tools/colour_in.py crop <id> x y w h    write subjects/<id>/world/grey.png: that rect of world/art/world.png, 4x
  (paint subjects/<id>/world/painted.png from grey.png with the image model: same drawing, the machine in colour)
  python3 tools/colour_in.py cut <id>             keep only what changed (the machine), write world/colour.png
                                                  and set "overlay.rect" in subject.json

The build composites colour.png over the grey map and over every map tile it touches."""
import json, sys
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
ROOT = Path(__file__).resolve().parent.parent
K = 4
cmd, sid = sys.argv[1], sys.argv[2]
d = ROOT / "subjects" / sid / "world"; d.mkdir(parents=True, exist_ok=True)
meta = ROOT / "subjects" / sid / "subject.json"
if cmd == "crop":
    x, y, w, h = map(float, sys.argv[3:7])
    world = Image.open(ROOT / "world/art/world.png").convert("RGB")
    world.resize((round(w * K), round(h * K)), Image.LANCZOS, box=(x, y, x + w, y + h)).save(d / "grey.png")
    (d / "rect.json").write_text(json.dumps([x, y, w, h]))
    print(f"wrote {d / 'grey.png'}  ({round(w * K)} x {round(h * K)}); now paint painted.png from it")
elif cmd == "cut":
    grey = Image.open(d / "grey.png").convert("RGB")
    painted = Image.open(d / "painted.png").convert("RGB").resize(grey.size, Image.LANCZOS)
    a, b = np.asarray(grey, np.float32), np.asarray(painted, np.float32)
    sat = lambda im: im.max(-1) - im.min(-1)
    # the machine is where colour appeared; small grey differences elsewhere (redrawn pencil) are ignored
    changed = (sat(b) - sat(a) > 28) | (np.abs(b - a).mean(-1) > 40)
    changed = ndi.binary_opening(changed, iterations=2)
    lab, n = ndi.label(ndi.binary_closing(changed, iterations=6))
    if n == 0: sys.exit("no coloured area found: is painted.png the same drawing with the machine coloured in?")
    sizes = ndi.sum(np.ones_like(lab), lab, range(1, n + 1))
    keep = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s > sizes.max() * .08])
    keep = ndi.binary_fill_holes(ndi.binary_dilation(keep, iterations=3))
    alpha = ndi.gaussian_filter(keep.astype(np.float32), 2.0)
    Image.fromarray(np.dstack([b, alpha * 255]).astype(np.uint8)).save(d / "colour.png")
    rect = json.loads((d / "rect.json").read_text())
    m = json.loads(meta.read_text()); m["overlay"] = {"rect": rect}; meta.write_text(json.dumps(m, indent=2) + "\n")
    ys, xs = np.where(keep)
    print(f"wrote {d / 'colour.png'}; the machine covers map pixels "
          f"x {rect[0] + xs.min() / K:.0f}-{rect[0] + xs.max() / K:.0f}, y {rect[1] + ys.min() / K:.0f}-{rect[1] + ys.max() / K:.0f}")
else:
    sys.exit(__doc__)
