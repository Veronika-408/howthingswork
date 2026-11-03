#!/usr/bin/env python3
"""Colour a machine in on the shared map without editing the map itself.

  python3 tools/colour_in.py crop <id> x y w h    write subjects/<id>/world/grey.png: that rect of world/art/world.png, 4x
  (paint subjects/<id>/world/painted.png from grey.png with the image model: same drawing, the machine in colour)
  python3 tools/colour_in.py cut <id> [--cover x0 y0 x1 y1]
                                                  keep only what changed (the machine), write world/colour.png
                                                  and set "overlay.rect" in subject.json; --cover (map pixels) also
                                                  takes over an area where the old drawing must disappear

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
    # image models shift and rescale an edit a little: line the painting back up with the map first
    from skimage.feature import ORB, match_descriptors
    from skimage.measure import ransac
    from skimage.transform import SimilarityTransform, warp
    ga, gb = a.mean(-1) / 255, b.mean(-1) / 255
    orb = ORB(n_keypoints=2000, fast_threshold=.04)
    orb.detect_and_extract(ga); ka, da = orb.keypoints, orb.descriptors
    orb.detect_and_extract(gb); kb, db = orb.keypoints, orb.descriptors
    m = match_descriptors(da, db, cross_check=True, max_ratio=.85)
    model, inl = ransac((kb[m[:, 1]][:, ::-1], ka[m[:, 0]][:, ::-1]), SimilarityTransform, min_samples=3, residual_threshold=2.5, max_trials=4000)
    if model is not None and inl.sum() >= 12 and abs(model.scale - 1) < .3:
        b = (warp(b / 255, model.inverse, mode="edge") * 255).astype(np.float32)
        print(f"aligned the painting: scale {model.scale:.3f}, shift {model.translation.round(1)}, {inl.sum()} matching points")
    else:
        print("could not align the painting to the map; using it as is")
    sat = lambda im: im.max(-1) - im.min(-1)
    # the machine is where colour appeared; small grey differences elsewhere (redrawn pencil) are ignored
    changed = (sat(b) - sat(a) > 28)
    changed = ndi.binary_opening(changed, iterations=2)
    lab, n = ndi.label(ndi.binary_closing(changed, iterations=6))
    if n == 0: sys.exit("no coloured area found: is painted.png the same drawing with the machine coloured in?")
    sizes = ndi.sum(np.ones_like(lab), lab, range(1, n + 1))
    keep = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s > sizes.max() * .08])
    keep = ndi.binary_fill_holes(ndi.binary_dilation(keep, iterations=3))
    # old grey drawing the edit removed or moved (next to the new colour) is covered too
    gone = ndi.binary_opening(np.abs(b - a).mean(-1) > 20, iterations=2) & ndi.binary_dilation(keep, iterations=40)
    keep = ndi.binary_fill_holes(keep | ndi.binary_dilation(gone, iterations=2))
    if "--cover" in sys.argv:
        i = sys.argv.index("--cover"); cx0, cy0, cx1, cy1 = map(float, sys.argv[i + 1:i + 5])
        rx, ry = json.loads((d / "rect.json").read_text())[:2]
        keep[max(0, round((cy0 - ry) * K)):round((cy1 - ry) * K), max(0, round((cx0 - rx) * K)):round((cx1 - rx) * K)] = True
    from skimage.morphology import convex_hull_image
    keep = convex_hull_image(keep)            # one clean patch, no gaps for old pencil lines to show through
    alpha = ndi.gaussian_filter(keep.astype(np.float32), 2.0)
    Image.fromarray(np.dstack([b, alpha * 255]).astype(np.uint8)).save(d / "colour.png")
    rect = json.loads((d / "rect.json").read_text())
    m = json.loads(meta.read_text()); m["overlay"] = {"rect": rect}; meta.write_text(json.dumps(m, indent=2) + "\n")
    ys, xs = np.where(keep)
    print(f"wrote {d / 'colour.png'}; the machine covers map pixels "
          f"x {rect[0] + xs.min() / K:.0f}-{rect[0] + xs.max() / K:.0f}, y {rect[1] + ys.min() / K:.0f}-{rect[1] + ys.max() / K:.0f}")
else:
    sys.exit(__doc__)
