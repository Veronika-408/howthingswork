"""Repaint one region of a space in place.

  /usr/bin/python3 lab/v1-patchwork/tools/region_edit.py <space> <region> <prompt.txt> [--ref image.png]
        [--margin units] [--grow units] [--feather units] [--color] [--from out.png]

1. crop the region (its polygon's bounds plus a margin, widened to 3:2) from the space's picture at the best
   resolution any layer has (base or deep-zoom tiles), enlarged to ~1536 px for the model;
2. one image edit on the crop (lab/tools/gen.sh edit): the prompt says what to change; a fixed suffix tells
   the model to keep everything else;
3. align the result back to the crop (ORB features + RANSAC similarity, on the area OUTSIDE the region);
4. optionally (--color) match its colours to the crop (per-channel gain/offset fitted on the ring around the region);
5. blend it in with a feathered mask limited to the region (+grow), into the base AND every tile it touches;
6. keep the old version (art/src/<space>/v<N>/), bump the version, log it, rebuild the space's web assets.

--from out.png skips the model call and re-blends an earlier result (to tune grow/feather for free).
Everything for one edit is kept in edits/<n>-<space>-<region>/ (crop, prompt, result, mask, before/after).
"""
import argparse, json, subprocess, sys, time
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
sys.path.insert(0, str(Path(__file__).parent))
from common import V, LAB, ROOT, load, save, render, poly_mask, snapshot, tile_scale, base_scale

SUFFIX = """

KEEP EVERYTHING ELSE IN IMAGE 1 EXACTLY AS IT IS: the same framing and zoom, the same camera angle, every other object, person, line and edge in the same place at the same size, the same colours, the same paper and the same hand-painted ink-and-watercolour style. Change nothing outside the area described above. Do not crop, shift, rotate or rescale the picture.
ABSOLUTELY NO TEXT: no letters, numbers, labels, logos or arrows anywhere. Output the same aspect ratio as Image 1."""


def bbox(polys):
    xs = [x for p in polys for x, _ in p]; ys = [y for p in polys for _, y in p]
    return min(xs), min(ys), max(xs), max(ys)


def crop_rect(d, polys, margin, aspect=1.5):
    x0, y0, x1, y1 = bbox(polys)
    x0 -= margin; y0 -= margin; x1 += margin; y1 += margin
    w, h = x1 - x0, y1 - y0
    if w / h < aspect:
        c = (x0 + x1) / 2; w = h * aspect; x0, x1 = c - w / 2, c + w / 2
    else:
        c = (y0 + y1) / 2; h = w / aspect; y0, y1 = c - h / 2, c + h / 2
    # keep inside the space (shift, then shrink if it is still too big)
    W, H = d["w"], d["h"]
    if w > W: w = W; h = w / aspect
    if h > H: h = H; w = h * aspect
    x0 = min(max(0, x0), W - w); y0 = min(max(0, y0), H - h)
    return [x0, y0, w, h]


def best_scale(d, rect):
    x, y, w, h = rect
    s = base_scale(d)
    for t in d.get("tiles", []):
        tx, ty, tw, th = t["rect"]
        if tx <= x and ty <= y and tx + tw >= x + w and ty + th >= y + h:      # a tile that covers the whole crop
            s = max(s, tile_scale(t))
    return s


def align(src, out, keep):
    """Similarity transform taking `out` onto `src`, fitted on pixels where keep is True. Returns (warped, info).
    Tried at full size, then at 1/2 and 1/4 (enlarged crops of a 1x picture are too soft for features)."""
    from skimage.feature import ORB, match_descriptors
    from skimage.measure import ransac
    from skimage.transform import SimilarityTransform, warp, rescale
    A = np.asarray(src.convert("L"), np.float32) / 255
    B = np.asarray(out.convert("L"), np.float32) / 255
    info = {"aligned": False}
    best = None
    for f in (1, .5, .25):
        try:
            a = A if f == 1 else rescale(A, f, anti_aliasing=True)
            b = B if f == 1 else rescale(B, f, anti_aliasing=True)
            kp = keep if f == 1 else rescale(keep.astype(np.float32), f, order=0) > .5
            orb = ORB(n_keypoints=1500, fast_threshold=0.05 if f == 1 else 0.03)
            orb.detect_and_extract(a); ka, da = orb.keypoints, orb.descriptors
            orb.detect_and_extract(b); kb, db = orb.keypoints, orb.descriptors
            ok = kp[ka[:, 0].astype(int).clip(0, kp.shape[0] - 1), ka[:, 1].astype(int).clip(0, kp.shape[1] - 1)]
            ka, da = ka[ok], da[ok]
            m = match_descriptors(da, db, cross_check=True, max_ratio=0.85)
            if len(m) < 12:
                info["why"] = f"{len(m)} matches at 1/{int(1 / f)}"; continue
            pa, pb = ka[m[:, 0]][:, ::-1] / f, kb[m[:, 1]][:, ::-1] / f          # (x, y) in full-size pixels
            model, inl = ransac((pb, pa), SimilarityTransform, min_samples=3, residual_threshold=2.5 / f, max_trials=3000)
            n = int(inl.sum()) if inl is not None else 0
            if n >= 10 and (best is None or n > best[1]):
                best = (model, n, len(m), f)
            if n >= 40:
                break
        except Exception as e:                                         # noqa: BLE001
            info["why"] = str(e)[:120]
    if best is None:
        return out, info
    model, n, nm, f = best
    sc = model.scale; tx, ty = model.translation
    info.update(inliers=n, matches=nm, at=f"1/{int(1 / f)}", scale=round(float(sc), 4), rot=round(float(np.degrees(model.rotation)), 3),
                shift=[round(float(tx), 1), round(float(ty), 1)])
    if abs(sc - 1) > .08 or abs(model.rotation) > .05 or abs(tx) > A.shape[1] * .08 or abs(ty) > A.shape[0] * .08:
        info["why"] = "transform rejected"; return out, info
    arr = np.asarray(out.convert("RGB"), np.float32) / 255
    wk = warp(arr, model.inverse, output_shape=A.shape, mode="edge", order=3)
    info["aligned"] = True; info.pop("why", None)
    return Image.fromarray((np.clip(wk, 0, 1) * 255).astype(np.uint8)), info


def colour_match(src, out, ring):
    """Per-channel gain/offset that makes `out` match `src` on the ring (robust: clipped to sane values)."""
    a = np.asarray(src, np.float32); b = np.asarray(out, np.float32)
    if ring.sum() < 500:
        return out, None
    res = []
    o = b.copy()
    for c in range(3):
        x, y = b[..., c][ring], a[..., c][ring]
        g = np.clip(np.std(y) / max(1e-3, np.std(x)), .85, 1.15)
        off = np.clip(np.mean(y) - g * np.mean(x), -25, 25)
        o[..., c] = b[..., c] * g + off
        res.append([round(float(g), 3), round(float(off), 1)])
    return Image.fromarray(np.clip(o, 0, 255).astype(np.uint8)), res


def blend_into(path, layer_rect, out_img, alpha, rect):
    """Blend out_img (covering rect, alpha in [0,1] same size) into the layer file at `path` covering layer_rect."""
    im = Image.open(path)
    mode = im.mode
    lx, ly, lw, lh = layer_rect
    k = im.width / lw
    x, y, w, h = rect
    if x > lx + lw or y > ly + lh or x + w < lx or y + h < ly:
        return False
    # the rect at this layer's resolution, at an integer offset (sub-pixel error < 0.5 layer px)
    ox, oy = int(round((x - lx) * k)), int(round((y - ly) * k))
    rw, rh = max(1, int(round(w * k))), max(1, int(round(h * k)))
    a_full = np.asarray(Image.fromarray((alpha * 255).astype(np.uint8)).resize((rw, rh), Image.BILINEAR), np.float32) / 255
    # the part inside the layer
    x0, y0, x1, y1 = max(0, ox), max(0, oy), min(im.width, ox + rw), min(im.height, oy + rh)
    if x1 <= x0 or y1 <= y0:
        return False
    al = a_full[y0 - oy:y1 - oy, x0 - ox:x1 - ox][..., None]
    if al.max() < 1 / 255:
        return False
    o_full = np.asarray(out_img.convert("RGB").resize((rw, rh), Image.LANCZOS), np.float32)
    o = o_full[y0 - oy:y1 - oy, x0 - ox:x1 - ox]
    arr = np.asarray(im.convert("RGBA" if mode == "RGBA" else "RGB")).astype(np.float32)
    sub = arr[y0:y1, x0:x1, :3]
    arr[y0:y1, x0:x1, :3] = sub * (1 - al) + o * al
    Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA" if mode == "RGBA" else "RGB").save(path)
    return True


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("space"); ap.add_argument("region"); ap.add_argument("prompt")
    ap.add_argument("--ref"); ap.add_argument("--margin", type=float); ap.add_argument("--grow", type=float)
    ap.add_argument("--feather", type=float); ap.add_argument("--color", action="store_true", help="also fit a per-channel gain/offset on the ring around the region (off by default: it tints objects whose colours differ from their surroundings)")
    ap.add_argument("--from", dest="from_", help="reuse an earlier model result instead of calling the model")
    ap.add_argument("--dry", action="store_true", help="only write the crop and the prompt")
    a = ap.parse_args()
    t0 = time.time()
    d = load(a.space)
    reg = d.get("regions", {}).get(a.region) or d["parts"].get(a.region)
    if not reg:
        sys.exit(f"no region {a.region} in {a.space}")
    polys = reg["polys"]
    x0, y0, x1, y1 = bbox(polys)
    size = max(x1 - x0, y1 - y0)
    margin = a.margin if a.margin is not None else reg.get("margin", size * .35)
    rect = crop_rect(d, polys, margin)
    s_best = best_scale(d, rect)
    s = max(s_best, 1536 / rect[2])                                    # enlarge small crops for the model
    crop = render(d, rect, s)
    n = len([q for q in (V / "edits").glob("*") if q.is_dir()]) + 1 if (V / "edits").exists() else 1
    ed = V / "edits" / f"{n:02d}-{a.space}-{a.region}"
    if a.from_ and (V / "edits") in Path(a.from_).resolve().parents:
        ed = Path(a.from_).resolve().parent                            # re-blend an earlier edit in its own folder
    ed.mkdir(parents=True, exist_ok=True)
    if not (a.from_ and (ed / "in.png").exists()):
        crop.save(ed / "in.png")
    crop = Image.open(ed / "in.png").convert("RGB")
    prompt = Path(a.prompt).read_text().rstrip() + SUFFIX
    (ed / "prompt.txt").write_text(prompt)
    (ed / "rect.json").write_text(json.dumps({"rect": rect, "scale": s, "best_scale": s_best}))
    print(f"crop {[round(v, 1) for v in rect]} at {s:.2f} px/unit (best layer {s_best:.2f}) -> {crop.size}")
    if a.dry:
        return
    # ---- the model call (or an earlier result)
    calls = 0
    if a.from_:
        calls = 1 if Path(a.from_).resolve() == (ed / "out.png").resolve() else 0   # the call was made by the earlier run
        res = Image.open(a.from_).convert("RGB")
    else:
        cmd = [str(LAB / "tools/gen.sh"), str(V), "edit", str(ed / "prompt.txt"), str(ed / "out.png"), str(ed / "in.png")]
        if a.ref:
            cmd.append(a.ref)
        cmd += ["--size", f"the same aspect ratio as Image 1 ({crop.width}x{crop.height}), at the highest available resolution"]
        r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
        print(r.stdout.strip().splitlines()[-1] if r.stdout.strip() else r.stderr[-400:])
        calls = 1
        if not (ed / "out.png").exists():
            sys.exit("the model call failed")
        res = Image.open(ed / "out.png").convert("RGB")
    res = res.resize(crop.size, Image.LANCZOS)
    # ---- masks (in crop pixels)
    grow = a.grow if a.grow is not None else reg.get("grow", size * .06)
    feather = a.feather if a.feather is not None else reg.get("feather", size * .05)
    m = poly_mask(polys, crop.size, s, rect[:2])
    gpx, fpx = max(1, grow * s), max(1, feather * s)
    region = ndi.binary_dilation(m, iterations=int(gpx)) if gpx >= 1 else m
    keep = ~ndi.binary_dilation(region, iterations=int(fpx * 2 + 4))           # surely unchanged: used to align / colour-fit
    border = np.zeros_like(keep); bw = max(4, int(crop.width * .02)); border[:bw] = border[-bw:] = True; border[:, :bw] = border[:, -bw:] = True
    # ---- align and colour-match
    res, ainfo = align(crop, res, keep & ~border)
    cinfo = None
    if a.color:
        ring = ndi.binary_dilation(region, iterations=int(fpx * 3 + 8)) & ~ndi.binary_dilation(region, iterations=int(fpx + 2)) & ~border
        res, cinfo = colour_match(crop, res, ring)
    res.save(ed / "aligned.png")
    alpha = ndi.gaussian_filter(region.astype(np.float32), fpx / 2)
    alpha = np.clip(alpha * 1.15, 0, 1)
    alpha[~ndi.binary_dilation(region, iterations=int(fpx * 1.5 + 2))] = 0
    Image.fromarray((alpha * 255).astype(np.uint8)).save(ed / "alpha.png")
    after = Image.fromarray((np.asarray(crop, np.float32) * (1 - alpha[..., None]) + np.asarray(res, np.float32) * alpha[..., None]).astype(np.uint8))
    # residual outside the region: how much the model changed what it should have kept (0..255)
    diff = np.abs(np.asarray(crop, np.float32) - np.asarray(res, np.float32)).mean(-1)
    outside_change = float(diff[keep & ~border].mean())
    # ---- write the new version
    snap = snapshot(a.space, d)
    touched = []
    if blend_into(V / d["base"]["file"], [0, 0, d["w"], d["h"]], res, alpha, rect):
        touched.append("base")
    for t in d.get("tiles", []):
        if blend_into(V / t["file"], t["rect"], res, alpha, rect):
            touched.append(t["key"])
    after_render = render(d, rect, s)
    w2 = crop.width // 2
    cmp_ = Image.new("RGB", (w2 * 2 + 6, crop.height // 2), (255, 255, 255))
    cmp_.paste(crop.resize((w2, crop.height // 2)), (0, 0)); cmp_.paste(after_render.resize((w2, crop.height // 2)), (w2 + 6, 0))
    cmp_.save(ed / "before-after.png")
    after_render.save(ed / "after.png")
    d["version"] = d.get("version", 1) + 1
    entry = {"version": d["version"], "region": a.region, "prompt": str(Path(a.prompt)), "edit_dir": str(ed.relative_to(V)), "rect": [round(v, 1) for v in rect],
             "scale": round(s, 2), "calls": calls, "align": ainfo, "colour": cinfo, "outside_change": round(outside_change, 2),
             "touched": touched, "kept": str(snap.relative_to(V)), "secs": round(time.time() - t0, 1),
             "t": time.strftime("%Y-%m-%dT%H:%M:%S")}
    d.setdefault("history", []).append(entry)
    save(a.space, d)
    subprocess.run([sys.executable, str(V / "tools/build.py"), a.space], check=True)
    entry["secs_total"] = round(time.time() - t0, 1)
    with open(V / "edits" / "log.jsonl", "a") as f:
        f.write(json.dumps(entry) + "\n")
    print(json.dumps(entry, indent=1))


if __name__ == "__main__":
    main()
