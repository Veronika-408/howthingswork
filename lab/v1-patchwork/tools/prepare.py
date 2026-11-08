"""One-time import: bring the live site's pictures (and the new ones) into this variant as spaces with a
base picture and tiles (regions/<id>.json + art/src/<id>/). Parts, regions and spots are added by hand
to the json afterwards; running this again keeps them (it only rewrites base/tiles/paper/size).

  /usr/bin/python3 lab/v1-patchwork/tools/prepare.py [space ...]
"""
import json, sys
import numpy as np
from PIL import Image
from common import V, ROOT, load, save, paper_of

SRC = V / "art" / "src"


def put(sid, d):
    f = V / "regions" / f"{sid}.json"
    old = json.loads(f.read_text()) if f.exists() else {}
    keep = {k: old[k] for k in ("parts", "regions", "spot", "parent", "maxZoom", "frame", "version", "history", "dive", "plus", "drive") if k in old}
    d.update(keep)
    d.setdefault("version", 1)
    save(sid, d)
    print(sid, d["w"], d["h"], len(d.get("tiles", [])), "tiles")


def paint_overlays(im, x0, y0, k, overlays):
    """The live site's build.py paint(): composite the coloured-in machines onto a map crop."""
    im = im.convert("RGBA")
    for ov, (x, y, w, h) in overlays:
        px, py, pw, ph = round((x - x0) * k), round((y - y0) * k), max(1, round(w * k)), max(1, round(h * k))
        if px > im.width or py > im.height or px + pw < 0 or py + ph < 0:
            continue
        layer = Image.new("RGBA", im.size, (0, 0, 0, 0))
        layer.paste(ov.resize((pw, ph), Image.LANCZOS), (px, py))
        im = Image.alpha_composite(im, layer)
    return im.convert("RGB")


def city():
    out = SRC / "city"; (out / "tiles").mkdir(parents=True, exist_ok=True)
    base = Image.open(ROOT / "dist/assets/world/world-2x.webp").convert("RGB")      # the live 2x map (made from its tiles)
    base.save(out / "base.png")
    overlays = []
    for sid in ("body", "weather"):
        sj = json.loads((ROOT / "subjects" / sid / "subject.json").read_text())
        ov = Image.open(ROOT / "subjects" / sid / "world" / "colour.png").convert("RGBA")
        overlays.append((ov, sj["overlay"]["rect"], sid))
    plan = json.loads((ROOT / "world/art/zoom/plan.json").read_text())
    tiles = []
    for key, t in plan.items():
        f = ROOT / "world/art/zoom/tiles" / f"{key}.png"
        if not f.exists():
            continue
        im = Image.open(f).convert("RGB")
        x, y, w, h = t["rect"]
        paint_overlays(im, x, y, im.width / w, [(o, r) for o, r, _ in overlays]).save(out / "tiles" / f"{key}.png")
        tiles.append({"key": key, "rect": t["rect"], "file": f"art/src/city/tiles/{key}.png", "level": 2, "feather": [.04, .05]})
    # the coloured-in machines at their own (sharper) resolution, on top
    for ov, rect, sid in overlays:
        name = {"body": "family", "weather": "weather"}[sid]
        ov.save(out / "tiles" / f"{name}.png")
        tiles.append({"key": name, "rect": rect, "file": f"art/src/city/tiles/{name}.png", "level": 3, "feather": None})
    put("city", {"id": "city", "w": 1672, "h": 940, "paper": paper_of(base), "base": {"file": "art/src/city/base.png"}, "tiles": tiles})


def plate(sid, src, art_dir=None, feather=(.03, .04)):
    out = SRC / sid; out.mkdir(parents=True, exist_ok=True)
    im = Image.open(src).convert("RGB")
    im.save(out / "base.png")
    tiles = []
    if art_dir is not None and (art_dir / "zoom" / "plan.json").exists():
        plan = json.loads((art_dir / "zoom" / "plan.json").read_text())
        have = {f.stem.replace("__", "/") for f in (art_dir / "zoom" / "tiles").glob("*.png")}
        (out / "tiles").mkdir(exist_ok=True)
        for key, t in plan.items():
            if key not in have or not (t["level"] == 2 or t["parent"] in have):
                continue
            fn = key.replace("/", "__")
            Image.open(art_dir / "zoom" / "tiles" / f"{fn}.png").convert("RGB").save(out / "tiles" / f"{fn}.png")
            tiles.append({"key": fn, "rect": t["rect"], "file": f"art/src/{sid}/tiles/{fn}.png", "level": t["level"], "feather": list(feather)})
    put(sid, {"id": sid, "w": im.width, "h": im.height, "paper": paper_of(im), "base": {"file": f"art/src/{sid}/base.png"}, "tiles": tiles})


def drive():
    """The flying leaf: the captain's-seat painting (windows flat magenta, no control wheels), the live site's
    control cut-outs (the wheel, a thrust lever, the flap lever) and its sky painting."""
    out = SRC / "drive"; out.mkdir(parents=True, exist_ok=True)
    f = V / "regions" / "drive.json"
    if f.exists() and json.loads(f.read_text()).get("version", 1) > 1:
        sys.exit("drive has region edits: refusing to overwrite art/src/drive/cockpit.png (revert first)")
    src = V / "art/src/drive-chosen.png"
    ck = np.asarray(Image.open(src).convert("RGB")).astype(np.int16)
    r, g, b = ck[..., 0], ck[..., 1], ck[..., 2]
    # magenta (#FF00FF) window glass → transparent: key on how much red AND blue exceed green, then
    # "despill" the half-keyed rim (pull red and blue down to green) so no pink fringe is left
    m = np.minimum(r, b) - g
    key = np.clip((m - 40) / 150.0, 0, 1)
    rgb = ck.astype(np.float32)
    spill = np.clip(m, 0, None).astype(np.float32)
    rgb[..., 0] -= spill * .9; rgb[..., 2] -= spill * .9
    a = (1 - key) * 255
    Image.fromarray(np.dstack([np.clip(rgb, 0, 255), a]).astype(np.uint8)).save(out / "cockpit.png")
    for n, name in [(1, "yoke"), (3, "lever"), (6, "flaplever")]:
        Image.open(ROOT / f"art/book/cut/ctl-{n}.png").save(out / f"{name}.png")
    # the sky: made seamless sideways by cross-fading its ends, so it can scroll round with the heading
    sky = np.asarray(Image.open(ROOT / "art/book/sky-air.png").convert("RGB")).astype(np.float32)
    h, w, _ = sky.shape
    ov = w // 5
    body = sky[:, :w - ov].copy()
    t = np.linspace(0, 1, ov)[None, :, None]
    body[:, :ov] = sky[:, w - ov:] * (1 - t) + sky[:, :ov] * t
    Image.fromarray(body.astype(np.uint8)).save(out / "sky.png")
    W, H = Image.open(src).size
    put("drive", {"id": "drive", "w": W, "h": H, "paper": paper_of(Image.open(src)),
                  "base": {"file": "art/src/drive/cockpit.png"}, "tiles": []})


JOBS = {
    "city": city,
    "plane": lambda: plate("plane", ROOT / "art/plate.png", ROOT / "art"),
    "human": lambda: plate("human", ROOT / "subjects/body/art/plate.png", ROOT / "subjects/body/art"),
    "skin": lambda: plate("skin", ROOT / "subjects/skin/art/plate.png", ROOT / "subjects/skin/art"),
    "cell": lambda: plate("cell", ROOT / "subjects/cell/art/plate.png", ROOT / "subjects/cell/art"),
    "pilots": lambda: plate("pilots", V / "art/src/pilots-chosen.png"),
    "lysosome": lambda: plate("lysosome", V / "art/src/lysosome-chosen.png"),
    "drive": drive,
}

if __name__ == "__main__":
    for sid in (sys.argv[1:] or JOBS):
        JOBS[sid]()
