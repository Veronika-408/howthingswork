"""Cut-paper processing for the paper theatre: key a painted layer off its magenta ground, cut it out with a
slightly irregular paper margin, give it a cut edge and a soft shadow, and save it cropped as webp.

    from paper import *
    rgba = key_magenta(load("art/src/plane-nearwing.png"))
    out = cut_paper(rgba, margin=5, seed=3)
    entry = save_layer(out, "art/layers/plane-nearwing.webp")    # -> {"src", "x", "y", "w", "h"}
"""
import json, os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

PAPER = np.array([251, 248, 240], np.float32)       # the cut paper's own colour (a touch whiter than the page)
EDGE = np.array([170, 156, 134], np.float32)        # the thin cut edge of the card
SHADOW = np.array([58, 42, 24], np.float32)


def load(path, size=None):
    im = Image.open(path).convert("RGB")
    if size and im.size != tuple(size):
        im = im.resize(tuple(size), Image.LANCZOS)
    return np.asarray(im).astype(np.float32)


def key_magenta(a, lo=85, span=120, grey=False):
    """Un-mix a flat #FF00FF ground: alpha from how magenta a pixel is, colour with the magenta taken back out."""
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mag = np.clip((np.minimum(r, b) - g - lo) / span, 0, 1)
    # pure-ish magenta even when the model drifts a little (e.g. #F010F0, #FF20E8)
    mag = np.maximum(mag, ((r > 200) & (b > 190) & (g < 90)).astype(np.float32))
    al = 1 - mag
    fg = (a - (1 - al)[..., None] * np.array([255, 0, 255], np.float32)) / np.maximum(al, .05)[..., None]
    fg = np.clip(fg, 0, 255)
    # magenta fringe that survived: pull the hue of semi-transparent pixels away from magenta
    # the soft edge takes the colour of the nearest solid pixel, so no magenta tint survives in the fringe
    solid = al > .96
    if solid.any():
        _, (iy, ix) = ndi.distance_transform_edt(~solid, return_indices=True)
        fr = ~solid
        fg[fr] = fg[iy[fr], ix[fr]]
    if grey:                                  # a pencil drawing: no colour at all, so no magenta can survive
        g = fg.min(-1, keepdims=True) * .5 + fg.mean(-1, keepdims=True) * .5
        fg = np.clip(g + np.array([4, 2, -3], np.float32), 0, 255)
    return np.dstack([fg, al * 255])


def clean(rgba, min_area=400, hole_area=900, close=1):
    """Drop specks, fill pinholes, close hairline gaps. Keeps soft alpha inside the kept shape."""
    al = rgba[..., 3] / 255
    m = al > .5
    if close:
        m = ndi.binary_closing(m, iterations=close)
    lab, n = ndi.label(m)
    if n:
        sizes = ndi.sum(m, lab, range(1, n + 1))
        keep = np.zeros(n + 1, bool); keep[1:] = sizes >= min_area
        m = keep[lab]
    holes, nh = ndi.label(ndi.binary_fill_holes(m) & ~m)
    filled = np.zeros_like(m)
    if nh:
        hs = ndi.sum(np.ones_like(m), holes, range(1, nh + 1))
        fill = np.zeros(nh + 1, bool); fill[1:] = hs < hole_area
        filled = fill[holes]
    soft = np.where(m, al, 0)
    out = rgba.copy(); out[..., 3] = np.clip(soft, 0, 1) * 255
    out[..., :3][filled] = PAPER          # small holes stay paper: nobody cuts out a hole that small
    out[..., 3][filled] = np.maximum(out[..., 3][filled], 255 * .0)
    clean.filled = filled
    return out


def noise(shape, scale, seed):
    rng = np.random.default_rng(seed)
    h, w = shape
    sm = rng.standard_normal((h // scale + 3, w // scale + 3)).astype(np.float32)
    big = np.asarray(Image.fromarray(sm).resize((w + 3 * scale, h + 3 * scale), Image.BICUBIC))[:h, :w]
    return big / (big.std() + 1e-6)


def cut_paper(rgba, margin=5.0, seed=1, shadow=(5, 8, 7, .34), edge=True, keep_border=True, grain=True, fill=None):
    """The painted piece on a slightly larger piece of paper: an irregular margin, a cut edge, a soft shadow.
    shadow = (dx, dy, blur, opacity) in pixels of this image. Returns RGBA float32 of the same size."""
    H, W = rgba.shape[:2]
    al = rgba[..., 3] / 255
    m = al > .35
    if fill is not None: m = m | fill
    # irregular margin: distance outside the painting, against a wobbling threshold (torn/cut by hand)
    dist = ndi.distance_transform_edt(~m)
    wob = margin * (1 + .28 * noise((H, W), 23, seed) + .12 * noise((H, W), 5, seed + 7))
    paper = np.clip((wob - dist) / 1.2 + .5, 0, 1)                      # 1 inside the margin, soft 1px edge
    paper = np.maximum(paper, al)
    if fill is not None: paper = np.maximum(paper, fill.astype(np.float32))
    if keep_border:                                                    # pieces that run off the page stay cut there
        pass
    # paper grain on the margin
    base = np.broadcast_to(PAPER, (H, W, 3)).copy()
    if grain:
        base += (noise((H, W), 2, seed + 3) * 2.2)[..., None]
    rgb = rgba[..., :3] * al[..., None] + base * (1 - al[..., None])
    if edge:                                                           # the card's thickness: a darker rim
        rim = np.clip(paper * (1 - ndi.gaussian_filter(paper, 1.1)) * 3.2, 0, 1) * (1 - al)
        rim = ndi.gaussian_filter(rim, .5)
        rgb = rgb * (1 - rim[..., None] * .55) + EDGE * rim[..., None] * .55
    out_a = paper
    if shadow:
        dx, dy, blur, op = shadow
        sh = ndi.shift(paper, (dy, dx), order=1, mode="constant")
        sh = ndi.gaussian_filter(sh, blur) * op
        # composite: shadow under paper
        a_tot = out_a + sh * (1 - out_a)
        col = (rgb * out_a[..., None] + SHADOW * (sh * (1 - out_a))[..., None]) / np.maximum(a_tot, 1e-4)[..., None]
        return np.dstack([np.clip(col, 0, 255), np.clip(a_tot, 0, 1) * 255])
    return np.dstack([np.clip(rgb, 0, 255), out_a * 255])


def deckle_top(rgba, seed=1, amp=4.0):
    """For a full-width band whose top edge is its silhouette: nothing extra, the margin does it. Kept for symmetry."""
    return rgba


def save_layer(rgba, path, quality=86, pad=2, crop=True, lossless=False):
    a = rgba[..., 3]
    ys, xs = np.nonzero(a > 2)
    H, W = a.shape
    if crop and len(xs):
        x0, x1 = max(0, xs.min() - pad), min(W, xs.max() + pad + 1)
        y0, y1 = max(0, ys.min() - pad), min(H, ys.max() + pad + 1)
    else:
        x0, y0, x1, y1 = 0, 0, W, H
    im = Image.fromarray(np.clip(rgba[y0:y1, x0:x1], 0, 255).astype(np.uint8), "RGBA")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if path.endswith(".webp"):
        im.save(path, quality=quality, method=6, lossless=lossless, alpha_quality=90)
    else:
        im.save(path)
    return {"x": int(x0), "y": int(y0), "w": int(x1 - x0), "h": int(y1 - y0)}


def save_rgb(a, path, quality=84):
    im = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), "RGB")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path, quality=quality, method=6)
    return {"x": 0, "y": 0, "w": im.width, "h": im.height}


def preview(layers, size, path, page=(244, 239, 228)):
    """Composite RGBA float layers (full size) back to front over the page colour, for looking at."""
    H, W = size[1], size[0]
    out = np.broadcast_to(np.array(page, np.float32), (H, W, 3)).copy()
    for L in layers:
        a = L[..., 3:4] / 255
        out = L[..., :3] * a + out * (1 - a)
    Image.fromarray(out.astype(np.uint8)).save(path)
