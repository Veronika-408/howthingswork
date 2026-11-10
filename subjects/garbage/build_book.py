"""Book art for the garbage truck: called by build.py as build(art/book dir, assets/garbage/book dir, helpers)."""
import numpy as np
from PIL import Image

def build(B, out, h):
    """The loading page: the switched-off rear of the truck (the base painting), and the wheelie bin
    keyed off its magenta sheet and split into its body and its lid, so the code can lift and tip it
    and let the lid fall open. Both bin layers keep the same canvas, so they line up exactly."""
    save = lambda im, name, q=84: im.save(out / f"{name}.webp", quality=q, method=6)
    save(Image.open(B / "loading.png").convert("RGB"), "loading", 84)
    t = np.asarray(Image.open(B / "bin.png").convert("RGB")).astype(np.float32)
    mag = np.clip((np.minimum(t[..., 0], t[..., 2]) - t[..., 1] - 60) / 120, 0, 1)
    al = 1 - mag
    fg = (t - (1 - al)[..., None] * np.array([255, 0, 255], np.float32)) / np.maximum(al, .05)[..., None]
    box = Image.fromarray((al * 255).astype(np.uint8)).getbbox()          # (151, 97, 1004, 1231) for bin.png
    H, W = al.shape
    yy, xx = np.mgrid[0:H, 0:W]
    lid = (yy < 198) & (xx > 286)                                        # the lid, above the rim, right of its hinge knob
    for name, m in (("bin-body", ~lid), ("bin-lid", lid)):
        a = al * m
        rgba = Image.fromarray(np.dstack([np.clip(fg, 0, 255), a * 255]).astype(np.uint8))
        save(rgba.crop(box), name, 88)
