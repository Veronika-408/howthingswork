"""Export every space to web assets and write data.js.

  /usr/bin/python3 lab/v1-patchwork/tools/build.py [--force] [space ...]

For each regions/<id>.json:
  art/web/<id>/base.webp     the whole picture (at most 2x)
  art/web/<id>/ghost.webp    the picture at 1x with the paper made transparent (drawn while diving)
  art/web/<id>/t/<key>.webp  the deep-zoom tiles, with soft edges
Only files whose source changed are rewritten (unless --force).
"""
import json, sys
from pathlib import Path
import numpy as np
from PIL import Image
from common import V, load, spaces, paint_mask, feathered, save_webp

WEB = V / "art" / "web"
force = "--force" in sys.argv
only = [a for a in sys.argv[1:] if not a.startswith("--")]


def stale(src, dst):
    return force or not Path(dst).exists() or Path(src).stat().st_mtime > Path(dst).stat().st_mtime


def hexc(c):
    return "#%02x%02x%02x" % tuple(c)


def export(sid, d):
    out = WEB / sid
    base_src = V / d["base"]["file"]
    rec = {"base": f"art/web/{sid}/base.webp"}
    with Image.open(base_src) as im0:
        bw = im0.width
    if stale(base_src, out / "base.webp"):
        im = Image.open(base_src)
        im = im.convert("RGBA") if im.mode == "RGBA" else im.convert("RGB")
        if im.width > d["w"] * 2:
            im = im.resize((d["w"] * 2, round(d["h"] * 2)), Image.LANCZOS)
        save_webp(im, out / "base.webp", 86)
        # the ghost: paper → transparent, at 1x
        g = Image.open(base_src)
        rgb = g.convert("RGB").resize((d["w"], d["h"]), Image.LANCZOS)
        if sid == "drive":
            # the ghost of the captain's view: the sky (level flight) painted into the windows, paper transparent
            ck = Image.open(V / "art/src/drive/cockpit.png").convert("RGBA").resize((d["w"], d["h"]), Image.LANCZOS)
            sky = Image.open(V / "art/src/drive/sky.png").convert("RGB")
            D = d["drive"]; k = D["sky"]["k"]
            big = sky.resize((round(sky.width * k), round(sky.height * k)), Image.LANCZOS)
            canvas = Image.new("RGB", (d["w"], d["h"]), (47, 108, 192))
            top = round(D["horizon"] - D["sky"]["horizon"] * k)
            for i in range(-1, 3):
                canvas.paste(big, (round(d["w"] / 2 - big.width / 2 + i * big.width), top))
            canvas.paste(ck, (0, 0), ck)
            alpha = paint_mask(Image.open(V / "art/src/drive-chosen.png").convert("RGB").resize((d["w"], d["h"])), d["paper"])
            rgb = canvas
        else:
            alpha = paint_mask(rgb, d["paper"])
        page_alpha = alpha.copy()
        if d.get("ghost", {}).get("polys"):
            # the subject's own outline: the ghost is only what lies inside it (soft edge), not the whole wash
            from scipy import ndimage as ndi
            from common import poly_mask
            gm = ndi.gaussian_filter(poly_mask(d["ghost"]["polys"], (d["w"], d["h"])).astype(np.float32), d["ghost"].get("feather", 8))
            alpha = alpha * np.clip(gm * 1.6 - .3, 0, 1)
        a = Image.fromarray((alpha * 255).astype(np.uint8))
        gh = rgb.copy(); gh.putalpha(a)
        save_webp(gh, out / "ghost.webp", 84)
        if d.get("ghost", {}).get("polys"):
            # the whole page with its paper transparent (drawn while the full page fades in at the end of a dive)
            pg = rgb.copy(); pg.putalpha(Image.fromarray((page_alpha * 255).astype(np.uint8)))
            save_webp(pg, out / "page.webp", 84)
        print(" ", sid, "base + ghost")
    rec["baseScale"] = min(2, bw / d["w"])
    rec["ghost"] = f"art/web/{sid}/ghost.webp"
    rec["page"] = f"art/web/{sid}/page.webp" if d.get("ghost", {}).get("polys") else rec["ghost"]
    tiles = []
    for t in d.get("tiles", []):
        src = V / t["file"]
        dst = out / "t" / f"{t['key']}.webp"
        with Image.open(src) as im:
            ts = im.width / t["rect"][2]
        if stale(src, dst):
            im = Image.open(src)
            im = feathered(im, *t["feather"]) if t.get("feather") else im.convert("RGBA")
            save_webp(im, dst, 82)
        tiles.append({"src": f"art/web/{sid}/t/{t['key']}.webp", "rect": [round(v, 2) for v in t["rect"]], "level": t.get("level", 2), "scale": round(ts, 3)})
    rec["tiles"] = tiles
    if sid == "drive":                         # the sky and the moving controls
        for name, q in (("sky", 84), ("yoke", 88), ("lever", 88), ("flaplever", 88)):
            src = V / "art/src/drive" / f"{name}.png"
            if stale(src, out / f"{name}.webp"):
                save_webp(Image.open(src), out / f"{name}.webp", q)
            rec[name] = f"art/web/drive/{name}.webp"
    return rec


def main():
    data = {"variant": {"id": "v1-patchwork", "name": "Patchwork painting",
                        "approach": "One hand-painted picture per space (the live site's method and art), plus a region system: any object is a mask that can be repainted in place and blended back."},
            "root": "city", "spaces": {}}
    for sid in spaces():
        d = load(sid)
        if only and sid not in only:
            rec = json.loads((WEB / sid / "rec.json").read_text())
        else:
            rec = export(sid, d)
            (WEB / sid).mkdir(parents=True, exist_ok=True)
            (WEB / sid / "rec.json").write_text(json.dumps(rec))
        s = {"w": d["w"], "h": d["h"], "paper": hexc(d["paper"])}
        for k in ("parent", "spot", "frame", "maxZoom", "kind", "dive", "plus"):
            if k in d:
                s[k] = d[k]
        s["parts"] = [{"id": pid, **{k: v for k, v in p.items() if k in ("polys", "child", "plus", "anchor")}} for pid, p in d.get("parts", {}).items()]
        s.update(rec)
        s["assets"] = [rec["base"]] + ([rec["ghost"]] if "parent" in d else []) + ([rec["page"]] if "parent" in d and rec["page"] != rec["ghost"] else [])
        if sid == "drive":
            s["kind"] = "drive"
            s["drive"] = d.get("drive", {})
            s["assets"] += [rec[k] for k in ("sky", "yoke", "lever", "flaplever")]
        s["version"] = d.get("version", 1)
        data["spaces"][sid] = s
    js = "// Generated by tools/build.py from regions/*.json: do not edit by hand.\nwindow.LAB_DATA = " + json.dumps(data, indent=1) + ";\n"
    (V / "data.js").write_text(js)
    print("data.js:", len(data["spaces"]), "spaces")


if __name__ == "__main__":
    main()
