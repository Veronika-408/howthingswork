"""Book art for the tram: called by build.py as build(art/book dir, assets/tram/book dir, helpers)."""
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

def build(B, out, h):
    """Layers for the tram's two book pages: the power page (tram, wheels, pole, scrolling street)
    and the points page (junction from above, the tram from above in three articulated pieces)."""
    save = lambda im, name, q=84: im.save(out / f"{name}.webp", quality=q, method=6)
    pw = Image.open(B / "power.png").convert("RGB"); a = np.asarray(pw).astype(np.float32)
    paper = np.array(h.paper_of(pw), np.float32)
    dist = np.sqrt(((a - paper) ** 2).sum(-1))
    obj = dist > 14
    H, W = obj.shape
    yy, xx = np.mgrid[0:H, 0:W]
    obj &= ~((yy < 98) & ~((xx > 436) & (xx < 582)))      # the wire is drawn live, the pantograph head stays
    obj &= ~(xx < 88)                                     # the pole is its own scrolling piece
    obj = ndi.binary_closing(obj, iterations=2)
    holes, nh = ndi.label(ndi.binary_fill_holes(obj) & ~obj)
    for j, sl in enumerate(ndi.find_objects(holes), 1):
        hm = holes[sl] == j
        if hm.sum() < W * H * .02: obj[sl] |= hm            # white panels, windows: keep; open sky: drop
    alpha = ndi.gaussian_filter(obj.astype(np.float32), .8)
    save(Image.fromarray(np.dstack([a, alpha * 255]).astype(np.uint8)), "power-tram", 86)
    for name, (cx, cy, r) in {"wheel-a": (375, 862, 51), "wheel-b": (662, 862, 51)}.items():
        w = pw.copy(); w.putalpha(h.disc_mask(pw.size, cx, cy, r)); save(w.crop((cx - r - 2, cy - r - 2, cx + r + 2, cy + r + 2)), name, 88)
    pole = (dist > 12) & (xx >= 40) & (xx < 88)
    pa = np.dstack([a, ndi.gaussian_filter(pole.astype(np.float32), .7) * 255]).astype(np.uint8)
    save(Image.fromarray(pa).crop((36, 30, 160, 922)), "power-pole", 88)
    st = Image.open(B / "street.png").convert("RGB")
    tile = Image.new("RGB", (st.width * 2, st.height)); tile.paste(st, (0, 0)); tile.paste(st.transpose(Image.FLIP_LEFT_RIGHT), (st.width, 0))
    save(tile.resize((tile.width * 3 // 4, tile.height * 3 // 4), Image.LANCZOS), "street", 80)
    save(Image.open(B / "junction.png").convert("RGB"), "junction", 84)
    # the tram from above, magenta keyed and cut at the joints so it can bend through the curve
    t = np.asarray(Image.open(B / "tram-top.png").convert("RGB")).astype(np.float32)
    mag = np.clip((np.minimum(t[..., 0], t[..., 2]) - t[..., 1] - 60) / 120, 0, 1)
    al = 1 - mag
    fg = (t - (1 - al)[..., None] * np.array([255, 0, 255], np.float32)) / np.maximum(al, .05)[..., None]
    rgba = Image.fromarray(np.dstack([np.clip(fg, 0, 255), al * 255]).astype(np.uint8))
    for name, (x0, x1) in {"top-rear": (22, 490), "top-mid": (490, 928), "top-front": (928, 1512)}.items():
        save(rgba.crop((x0, 360, x1, 668)), name, 88)

