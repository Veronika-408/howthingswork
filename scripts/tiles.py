#!/usr/bin/env python3
"""Deep-zoom tiles: crop the parent image, have ChatGPT redraw it in detail, then align it back.

  tiles.py plan                    write art/zoom/plan.json (tile rects for every level-2 and level-3 tile)
  tiles.py crop <key>...           write art/zoom/src/<key>.png, the parent crop upscaled for the model
  tiles.py gen <key>...            run the Codex image tool on each crop -> art/zoom/raw/<key>.png
  tiles.py align <key>...          register raw against the crop -> art/zoom/tiles/<key>.png + score
  tiles.py all <key>...            crop, gen and align

Level-2 keys are part ids ("engine"); level-3 keys are "<part>/<sub>" ("engine/fan").
Rects are in plate pixels (the 1672 x 941 painting) so the viewer can place every tile exactly.
"""
import json, subprocess, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

import os
ROOT = Path(__file__).resolve().parent.parent
# SUBJECT=tram works on tram/art and tram/src; the default is the plane (art/, src/)
SUBJECT = os.environ.get("SUBJECT", "plane")
BASE = ROOT if SUBJECT == "plane" else ROOT / "world" if SUBJECT == "world" else ROOT / "subjects" / SUBJECT
ART = BASE / "art"; Z = ART / "zoom"
DESCRIBE = {
    "plane": ("a white Boeing 747-400 with a thin blue cheatline, parked at an airport gate", "a Boeing 747-400"),
    "world": ("a soft grey pencil isometric map of a small river town", "the buildings, vehicles and landscape shown"),
}.get(SUBJECT) or tuple(json.loads((BASE / "subject.json").read_text())["describe"])
SOURCE = "world.png" if SUBJECT == "world" else "plate.png"
OUT_W, OUT_H = 1536, 1024          # 3:2 tiles
ASPECT = OUT_W / OUT_H
ART_W, ART_H = 1672, 941           # painted area of the plate

def spots():
    out = subprocess.run(["node", str(ROOT / "scripts" / "export_spots.mjs"), str(BASE / "src")], capture_output=True, text=True, check=True).stdout
    return json.loads(out)

def fit_rect(x0, y0, x1, y1, pad, min_w, bounds):
    """Pad a box, grow it to the tile aspect, then slide it inside bounds."""
    bx0, by0, bx1, by1 = bounds
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    w, h = (x1 - x0) * (1 + 2 * pad), (y1 - y0) * (1 + 2 * pad)
    w = max(w, h * ASPECT, min_w); h = w / ASPECT
    w = min(w, bx1 - bx0); h = min(h, by1 - by0); w = min(w, h * ASPECT); h = w / ASPECT
    x = min(max(cx - w / 2, bx0), bx1 - w); y = min(max(cy - h / 2, by0), by1 - h)
    return [round(x, 2), round(y, 2), round(w, 2), round(h, 2)]

def bbox(polys):
    xs = [p[0] for poly in polys for p in poly]; ys = [p[1] for poly in polys for p in poly]
    return min(xs), min(ys), max(xs), max(ys)

def grid_plan(cols=4, rows=4, tw=480):
    """The city: a regular grid of overlapping 3:2 tiles over the whole panorama."""
    W, H = Image.open(ART / SOURCE).size
    th = tw / ASPECT
    xs = [round(i * (W - tw) / (cols - 1), 2) for i in range(cols)]
    ys = [round(j * (H - th) / (rows - 1), 2) for j in range(rows)]
    plan = {f"w{j}{i}": {"level": 2, "parent": None, "rect": [x, y, tw, round(th, 2)]} for j, y in enumerate(ys) for i, x in enumerate(xs)}
    (Z / "plan.json").write_text(json.dumps(plan, indent=1))
    return plan

def plan():
    if SUBJECT == "world": return grid_plan()
    d = spots(); plan = {}
    for pid in d["order"]:
        s = d["spots"][pid]
        f = s.get("frame") or bbox(s["polys"])
        plan[pid] = {"level": 2, "parent": None, "rect": fit_rect(*f, 0.32, 230, (0, 0, ART_W, ART_H))}
    # level-3 tiles: sub-spot polys are given in level-2 tile pixels (0..1536, 0..1024)
    for pid, z in d["zoom"].items():
        px, py, pw, ph = plan[pid]["rect"]; k = pw / OUT_W
        for sub in z.get("subs", []):
            x0, y0, x1, y1 = bbox(sub["polys"]) if "frame" not in sub else sub["frame"]
            r = fit_rect(x0, y0, x1, y1, 0.12, 420, (0, 0, OUT_W, OUT_H))
            plan[f"{pid}/{sub['id']}"] = {"level": 3, "parent": pid,
                "rect": [round(px + r[0] * k, 3), round(py + r[1] * k, 3), round(r[2] * k, 3), round(r[3] * k, 3)],
                "parentRect": r}
    (Z / "plan.json").write_text(json.dumps(plan, indent=1))
    return plan

def load_plan():
    return json.loads((Z / "plan.json").read_text())

def fname(key): return key.replace("/", "__")

def crop(key):
    t = load_plan()[key]
    if t["level"] == 2:
        src = Image.open(ART / SOURCE).convert("RGB"); x, y, w, h = t["rect"]
    else:
        src = Image.open(Z / "tiles" / (fname(t["parent"]) + ".png")).convert("RGB"); x, y, w, h = t["parentRect"]
    c = src.resize((OUT_W, OUT_H), Image.LANCZOS, box=(x, y, x + w, y + h))
    (Z / "src").mkdir(parents=True, exist_ok=True)
    c.save(Z / "src" / (fname(key) + ".png"))

PROMPT = """Image 1 is a crop of a hand-painted ink-and-watercolor cut-away plate of {subject}, from a 1990s children's illustrated encyclopedia (Stephen Biesty / Dorling Kindersley style). It was enlarged from a small area, so it is blurry.

TASK: re-paint THIS EXACT IMAGE at high resolution with much more fine detail, as if the original artist had painted this small area at a far larger size. This is a super-resolution and detail-enhancement job, NOT a new picture.

KEEP EXACTLY:
- the same framing, camera angle and perspective, edge to edge;
- every object, line, edge, person, vehicle and structure in exactly the same place, at the same size, with the same silhouette and the same colors; anything cut by the image border stays cut at the same place;
- the same number of seats, windows, wheels, blades, people, containers and every other countable thing.
Do NOT add, remove, move, rotate or resize anything. Do NOT change the composition or zoom.

ADD ONLY fine detail inside the existing shapes: crisp fine ink linework, rivets and panel lines, ribs, frames and stringers, cables and pipes, fabric and metal textures, faces, hands and clothing folds on the small figures, delicate watercolor washes and granulation. Make it technically correct for {model}.

WHAT THIS AREA SHOWS: {what}

No text, letters, numbers, labels or logos anywhere. Output a 3:2 landscape image with the same framing as Image 1."""

WORLD_PROMPT = """Image 1 is a crop of a hand-drawn soft grey pencil isometric map of a small river town on warm white paper, like an architect's presentation drawing. It was enlarged from a small area, so it is blurry.

TASK: re-draw THIS EXACT IMAGE at high resolution with much finer pencil detail, as if the same artist had drawn this small area on a far bigger sheet. This is a super-resolution job, NOT a new picture.

KEEP EXACTLY: the same framing and isometric angle edge to edge; every building, tree, road, vehicle, boat, person and machine in exactly the same place, size and shape; anything cut by the border stays cut at the same place. Do NOT add, remove or move anything.

STYLE: soft grey graphite pencil only, fine hatching, crisp thin lines, lots of white paper, NO colour at all, except that a jumbo jet (white with blue tail and stripe, with small coloured ground crew trucks and orange vests) and a red-and-white tram, if they appear in this crop, keep exactly their colours.

No text, letters, numbers or logos. Output a 3:2 landscape image with the same framing as Image 1."""

def gen(key, what):
    (Z / "prompts").mkdir(parents=True, exist_ok=True); (Z / "raw").mkdir(parents=True, exist_ok=True)
    pf = Z / "prompts" / (fname(key) + ".txt"); pf.write_text(WORLD_PROMPT if SUBJECT == "world" else PROMPT.format(what=what, subject=DESCRIBE[0], model=DESCRIBE[1]))
    src = Z / "src" / (fname(key) + ".png"); out = Z / "raw" / (fname(key) + ".png")
    instr = (f"Use your built-in image generation tool exactly once, in image-edit mode with the attached image as Image 1 (the input to edit), "
             f"passing the contents of {pf.relative_to(ROOT)} verbatim as the prompt. Size: 3:2 landscape at the highest available resolution "
             f"(1536x1024 or larger). Then copy the resulting PNG file to {out.relative_to(ROOT)}. Do nothing else. Print the final file path and pixel dimensions.")
    cmd = f'cd "{ROOT}"; printf "%s" "$INSTR" | codex exec --skip-git-repo-check -s workspace-write -i "{src}" 2>&1 | tail -3'
    r = subprocess.run(["bash", "-c", cmd], env={**__import__("os").environ, "INSTR": instr}, capture_output=True, text=True)
    print(key, "gen:", r.stdout.strip().splitlines()[-1:] if r.stdout.strip() else r.stderr[-300:])

def gray(im, w):
    im = im.convert("L").resize((w, round(w / ASPECT)), Image.LANCZOS)
    return np.asarray(im, dtype=np.float32) / 255

def ncc(a, b):
    a = a - a.mean(); b = b - b.mean()
    return float((a * b).sum() / (np.sqrt((a * a).sum() * (b * b).sum()) + 1e-9))

def align(key):
    """Fit an affine map from raw to crop with ORB + RANSAC, keep it only if it raises the match score."""
    from skimage.feature import ORB, match_descriptors
    from skimage.measure import ransac
    from skimage.transform import AffineTransform, warp
    from scipy.ndimage import gaussian_filter
    src = Image.open(Z / "src" / (fname(key) + ".png")).convert("RGB")
    raw = Image.open(Z / "raw" / (fname(key) + ".png")).convert("RGB").resize((OUT_W, OUT_H), Image.LANCZOS)
    W = 768; s = W / OUT_W
    A, B = gray(src, W), gray(raw, W)
    def score(b): return ncc(gaussian_filter(A, 2.5), gaussian_filter(b, 2.5))
    before = score(B); best = (before, None)
    try:
        orb = ORB(n_keypoints=1500, fast_threshold=0.05)
        orb.detect_and_extract(A); ka, da = orb.keypoints, orb.descriptors
        orb.detect_and_extract(B); kb, db = orb.keypoints, orb.descriptors
        m = match_descriptors(da, db, cross_check=True, max_ratio=0.85)
        if len(m) >= 12:
            model, inl = ransac((kb[m[:, 1]][:, ::-1], ka[m[:, 0]][:, ::-1]), AffineTransform, min_samples=3, residual_threshold=2.5, max_trials=3000)
            if model is not None and inl.sum() >= 10:
                sc, rot, sh = model.scale, model.rotation, model.shear
                sane = np.all(np.abs(np.atleast_1d(sc) - 1) < 0.15) and abs(rot) < 0.06 and abs(sh) < 0.06
                if sane:
                    Bw = warp(B, model.inverse, mode="edge")
                    sw = score(Bw)
                    if sw > best[0]: best = (sw, model)
    except Exception as e:
        print(key, "orb failed:", e)
    final = raw
    if best[1] is not None:
        m = best[1]
        full = AffineTransform(matrix=np.diag([1 / s, 1 / s, 1]) @ m.params @ np.diag([s, s, 1]))
        arr = warp(np.asarray(raw, dtype=np.float32) / 255, full.inverse, mode="edge")
        final = Image.fromarray((arr * 255).clip(0, 255).astype(np.uint8))
    (Z / "tiles").mkdir(parents=True, exist_ok=True)
    final.save(Z / "tiles" / (fname(key) + ".png"))
    res = {"before": round(before, 4), "after": round(best[0], 4), "warped": best[1] is not None}
    scores = Z / "scores.json"; d = json.loads(scores.read_text()) if scores.exists() else {}
    d[key] = res; scores.write_text(json.dumps(d, indent=1, sort_keys=True))
    print(key, "align:", res)

if __name__ == "__main__":
    cmd, keys = sys.argv[1], sys.argv[2:]
    if cmd == "plan":
        p = plan(); print(len(p), "tiles"); sys.exit()
    whats = json.loads((Z / "whats.json").read_text()) if (Z / "whats.json").exists() else {}
    if cmd in ("gen", "all") and any("/" in k for k in keys):
        for pid, z in spots()["zoom"].items():
            for sub in z.get("subs", []):
                whats[f"{pid}/{sub['id']}"] = sub.get("what", sub["name"])
    for k in keys:
        if cmd in ("crop", "all"): crop(k)
        if cmd in ("gen", "all"): gen(k, whats.get(k, ""))
        if cmd in ("align", "all"): align(k)
