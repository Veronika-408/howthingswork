"""Shared helpers for the patchwork variant: one picture per space (a base picture plus optional
deep-zoom tiles), named regions, and the export to web assets.

A space is described by regions/<id>.json:
  w, h            the space's own units (the main picture's pixels at 1x)
  paper           [r, g, b] of the page
  base            {"file": png}  the whole picture, any resolution (its scale = width / w)
  tiles           [{"key", "rect": [x, y, w, h] in space units, "file", "level", "feather": [fx, fy] | null}]
                  sharper repaints of parts of the picture, drawn over the base when zooming in
                  (feather: soft edges added at export; null = the png already has its own alpha)
  parts           {id: {"polys": [[[x, y], ...]], "child"?: space id, "frame"?: [x0, y0, x1, y1]}}
  regions         {name: {"polys": [...], "margin": units}}   extra named areas that can be repainted
                  (every part is a region too)
  spot            where this space sits inside its parent (see lab/core/API.md)
  version         bumped by every region edit; old files are kept under art/src/<id>/v<N>/
"""
import json, shutil
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi

V = Path(__file__).resolve().parent.parent          # lab/v1-patchwork
LAB = V.parent
ROOT = LAB.parent                                     # the repository
Image.MAX_IMAGE_PIXELS = None


def load(sid):
    return json.loads((V / "regions" / f"{sid}.json").read_text())


def save(sid, d):
    (V / "regions" / f"{sid}.json").write_text(json.dumps(d, indent=1))


def spaces():
    return sorted(p.stem for p in (V / "regions").glob("*.json"))


def paper_of(im):
    a = np.asarray(im.convert("RGB")).astype(np.float32)
    b = np.concatenate([a[:6].reshape(-1, 3), a[-6:].reshape(-1, 3), a[:, :6].reshape(-1, 3), a[:, -6:].reshape(-1, 3)])
    return [int(v) for v in np.median(b, 0)]


def paint_mask(im, paper, thresh=18):
    """Soft alpha of everything painted: paper connected to the border is transparent.
    (The same method as the live site's build.py, so ghost dives look the same.)"""
    from skimage.segmentation import flood
    a = np.asarray(im.convert("RGB")).astype(np.float32)
    h, w, _ = a.shape
    dist = np.sqrt(((a - np.array(paper, np.float32)) ** 2).sum(-1))
    near = (dist < thresh).astype(np.uint8)
    bg = np.zeros((h, w), bool)
    for y, x in [(0, 0), (0, w - 1), (h - 1, 0), (h - 1, w - 1), (0, w // 2), (h - 1, w // 2), (h // 2, 0), (h // 2, w - 1)]:
        if near[y, x]:
            bg |= flood(near, (y, x), connectivity=1)
    obj = ~bg
    obj = ndi.binary_opening(obj, iterations=1)
    lab, n = ndi.label(obj)
    if n:
        sizes = ndi.sum(obj, lab, range(1, n + 1))
        obj = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s > w * h * .0005])
    obj = ndi.binary_closing(obj, iterations=4)
    # enclosed holes: fill small ones and painted ones; big bare-paper ones (between figures, under arms) stay
    # open, or the ghost shows a pale paper patch over the parent
    holes, nh = ndi.label(ndi.binary_fill_holes(obj) & ~obj)
    for j, sl in enumerate(ndi.find_objects(holes), 1):
        hm = holes[sl] == j
        if hm.sum() < w * h * .002 or dist[sl][hm].mean() > 14:
            obj[sl] |= hm
    soft = ndi.gaussian_filter(obj.astype(np.float32), 3.0)
    tone = np.clip((dist - 4) / 26, 0, 1)
    alpha = np.clip(soft * (.35 + .65 * np.maximum(tone, ndi.binary_erosion(obj, iterations=6))), 0, 1)
    return alpha


def feathered(im, fx=.03, fy=.04):
    """RGBA copy whose edges fade to transparent, so a sharper tile blends into the picture below it."""
    w, h = im.size
    ax = np.minimum(1, np.minimum(np.arange(w), np.arange(w)[::-1]) / max(1, fx * w))
    ay = np.minimum(1, np.minimum(np.arange(h), np.arange(h)[::-1]) / max(1, fy * h))
    a = np.outer(ay, ax)
    if im.mode == "RGBA":
        a = a * (np.asarray(im)[..., 3] / 255.0)
    out = im.convert("RGB").copy()
    out.putalpha(Image.fromarray((a * 255).astype(np.uint8)))
    return out


def save_webp(im, path, q=86):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, "WEBP", quality=q, method=6)


def poly_mask(polys, size, scale=1.0, origin=(0, 0)):
    """Binary mask (H, W) of polygons given in space units, for an image whose pixel (0, 0) is space point
    `origin` at `scale` pixels per unit."""
    m = Image.new("L", size, 0)
    d = ImageDraw.Draw(m)
    for p in polys:
        d.polygon([((x - origin[0]) * scale, (y - origin[1]) * scale) for x, y in p], fill=255)
    return np.asarray(m) > 0


def tile_scale(t):
    with Image.open(V / t["file"]) as im:
        return im.width / t["rect"][2]


def base_scale(d):
    with Image.open(V / d["base"]["file"]) as im:
        return im.width / d["w"]


def render(d, rect, scale, levels=None):
    """The space's picture over rect (space units) at `scale` px/unit: the base, then every tile that
    touches the rect, composited with the same soft edges the viewer uses."""
    x, y, w, h = rect
    W, H = max(1, round(w * scale)), max(1, round(h * scale))
    base = Image.open(V / d["base"]["file"]).convert("RGB")
    k = base.width / d["w"]
    out = base.resize((W, H), Image.LANCZOS, box=(x * k, y * k, (x + w) * k, (y + h) * k)).convert("RGBA")
    for t in sorted(d.get("tiles", []), key=lambda t: t.get("level", 2)):
        if levels and t.get("level", 2) not in levels:
            continue
        tx, ty, tw, th = t["rect"]
        if tx > x + w or ty > y + h or tx + tw < x or ty + th < y:
            continue
        im = Image.open(V / t["file"])
        im = feathered(im, *t["feather"]) if t.get("feather") else im.convert("RGBA")
        ks = im.width / tw
        # the part of the tile inside the rect
        ix0, iy0, ix1, iy1 = max(x, tx), max(y, ty), min(x + w, tx + tw), min(y + h, ty + th)
        box = ((ix0 - tx) * ks, (iy0 - ty) * ks, (ix1 - tx) * ks, (iy1 - ty) * ks)
        pw, ph = round((ix1 - ix0) * scale), round((iy1 - iy0) * scale)
        if pw < 1 or ph < 1:
            continue
        piece = im.resize((pw, ph), Image.LANCZOS, box=box)
        out.alpha_composite(piece, (round((ix0 - x) * scale), round((iy0 - y) * scale)))
    return out.convert("RGB")


def snapshot(sid, d):
    """Keep the current files of a space before an edit changes them: art/src/<id>/v<N>/."""
    n = d.get("version", 1)
    dst = V / "art" / "src" / sid / f"v{n}"
    dst.mkdir(parents=True, exist_ok=True)
    files = [d["base"]["file"]] + [t["file"] for t in d.get("tiles", [])]
    for f in files:
        src = V / f
        if src.exists():
            shutil.copy2(src, dst / Path(f).name)
    (dst / "regions.json").write_text(json.dumps(d, indent=1))
    return dst
