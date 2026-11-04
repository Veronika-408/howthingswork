"""Book art for the weather: called by build.py as build(art/book dir, assets/weather/book dir, helpers)."""
import numpy as np
from PIL import Image

def build(B, out, h):
    """The rain page (one painting, the drops are drawn by code) and the storm page (a landscape, and a
    thundercloud cut from its flat magenta background so it can move nearer and further)."""
    save = lambda im, name, q=84: im.save(out / f"{name}.webp", quality=q, method=6)
    save(Image.open(B / "rain.png").convert("RGB"), "rain", 86)
    save(Image.open(B / "storm-land.png").convert("RGB"), "storm-land", 84)
    t = np.asarray(Image.open(B / "storm-cloud.png").convert("RGB")).astype(np.float32)
    mag = np.clip((np.minimum(t[..., 0], t[..., 2]) - t[..., 1] - 60) / 120, 0, 1)   # 1 = pure magenta
    al = 1 - mag
    fg = (t - (1 - al)[..., None] * np.array([255, 0, 255], np.float32)) / np.maximum(al, .05)[..., None]
    rgba = Image.fromarray(np.dstack([np.clip(fg, 0, 255), al * 255]).astype(np.uint8))
    ys, xs = np.nonzero(al > .05)
    box = (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)
    save(rgba.crop(box), "storm-cloud", 88)
    print("weather book: storm-cloud box", box)
