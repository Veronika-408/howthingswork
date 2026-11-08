#!/usr/bin/python3
"""Sticker pipeline: magenta sprite sheet -> keyed, split, trimmed, bordered stickers + an index.

  /usr/bin/python3 tools/stickers.py            # (re)build every sheet listed in art/sheets.json
  /usr/bin/python3 tools/stickers.py family     # only that sheet
  /usr/bin/python3 tools/stickers.py --peek x   # write art/peek/x.png: the components found, numbered

For each sheet: key out #FF00FF by un-mixing the fringe (as subjects/tram/build_book.py does), split by
connected components (small bits merge into the nearest big one), order them in reading order, name them
from art/sheets.json, trim, add a white paper margin (the sticker's die-cut edge) and write:
  library/<name>.webp         the sticker, RGBA, with its white margin
and library/index.json: name, file, w, h, anchor, tags, sheet, border, poly (outline traced from the alpha).
"""
import json, sys
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
from skimage import measure

HERE = Path(__file__).resolve().parent.parent
SHEETS = HERE / "art" / "sheets"
LIB = HERE / "library"
SPEC = json.loads((HERE / "art" / "sheets.json").read_text())


def key_magenta(rgb, off=25, div=200):
    """RGB float array -> (foreground RGB, alpha 0..1): un-mix the magenta fringe."""
    t = rgb.astype(np.float32)
    mag = np.clip((np.minimum(t[..., 0], t[..., 2]) - t[..., 1] - off) / div, 0, 1)
    al = 1 - mag
    fg = (t - (1 - al)[..., None] * np.array([253, 3, 251], np.float32)) / np.maximum(al, .05)[..., None]
    return np.clip(fg, 0, 255), al


def components(al, min_px, merge_px, join=0, cuts=()):
    """Label the solid parts; tiny bits within merge_px of a big part join it, the rest are dropped.
    join > 0 labels a dilated mask, so a loose cluster (a handful of beads) becomes one sticker."""
    solid = al > .5
    m = ndi.binary_dilation(solid, iterations=join) if join else solid.copy()
    for x0, y0, x1, y1 in cuts:      # hand-drawn cuts between objects the model let touch
        m[y0:y1, x0:x1] = False
    lab, n = ndi.label(m)
    if join:
        lab = lab * solid
    if n == 0:
        return lab, []
    sizes = ndi.sum(solid, lab, range(1, n + 1))
    big = [i + 1 for i, s in enumerate(sizes) if s >= min_px]
    out = np.zeros_like(lab)
    for k, i in enumerate(big, 1):
        out[lab == i] = k
    # attach small bits (wheels, cables, sparkles) to the nearest big component if close enough
    if len(big):
        dist, (iy, ix) = ndi.distance_transform_edt(out == 0, return_indices=True)
        small = solid & (out == 0)
        near = out[iy, ix]
        attach = small & (dist <= merge_px)
        out[attach] = near[attach]
    return out, list(range(1, len(big) + 1))


def reading_order(lab, ids):
    boxes = {i: ndi.find_objects((lab == i).astype(np.int32))[0] for i in ids}
    cy = {i: (b[0].start + b[0].stop) / 2 for i, b in boxes.items()}
    cx = {i: (b[1].start + b[1].stop) / 2 for i, b in boxes.items()}
    hs = {i: b[0].stop - b[0].start for i, b in boxes.items()}
    rows = []
    for i in sorted(ids, key=lambda i: cy[i]):
        for r in rows:
            if abs(cy[r[0]] - cy[i]) < .45 * max(hs[r[0]], hs[i]):
                r.append(i); break
        else:
            rows.append([i])
    return [i for r in rows for i in sorted(r, key=lambda i: cx[i])], boxes


def outline(alpha, tol):
    """Outer polygon(s) of an alpha mask, simplified, as [[x, y], ...] lists."""
    m = np.pad(alpha > .5, 2)
    m = ndi.binary_fill_holes(m)
    lab, n = ndi.label(m)
    polys = []
    for i in range(1, n + 1):
        part = lab == i
        if part.sum() < 0.01 * m.sum():
            continue
        cs = measure.find_contours(part.astype(np.float32), .5)
        c = max(cs, key=len)
        c = measure.approximate_polygon(c, tolerance=tol)
        polys.append([[round(float(x) - 2, 1), round(float(y) - 2, 1)] for y, x in c])
    return polys


def make_sticker(fg, al, mask, box, border, name, sheet, opts):
    y0, y1 = box[0].start, box[0].stop
    x0, x1 = box[1].start, box[1].stop
    pad = border + 4
    H, W = al.shape
    Y0, Y1, X0, X1 = max(0, y0 - pad), min(H, y1 + pad), max(0, x0 - pad), min(W, x1 + pad)
    a = al[Y0:Y1, X0:X1] * mask[Y0:Y1, X0:X1]
    c = fg[Y0:Y1, X0:X1]
    # pad so the margin never hits the crop edge
    a = np.pad(a, pad); c = np.pad(c, ((pad, pad), (pad, pad), (0, 0)), mode="edge")
    # decontaminate the fringe: pixels near an edge that are partly transparent or still purple take the
    # colour of the nearest clean, opaque paint (so no magenta halo survives on the white margin)
    purple = (np.minimum(c[..., 0], c[..., 2]) - c[..., 1]) > opts.get("purple", 12)
    core = (a >= .97) & ~purple
    if core.any():
        edge = ndi.binary_dilation(a < .5, iterations=opts.get("fringe", 6))
        bad = edge & ~core
        _, (cy, cx) = ndi.distance_transform_edt(~core, return_indices=True)
        c[bad] = c[cy, cx][bad]
    if opts.get("fringe_grey"):
        # thin grey things (cables, railings) come out of the un-mixing tinted green or pink: make them grey
        zone = ndi.binary_dilation(a < .5, iterations=3)
        lum = c[..., :3].mean(-1, keepdims=True)
        c[zone] = (lum * np.array([1.0, .99, .96]))[zone]
    if opts.get("fill_holes", True):
        inside0 = a > .5
        solid = ndi.binary_fill_holes(inside0)
        holes = solid & ~inside0
        # enclosed holes: small ones (gaps between leaves, struts) take the colour of the paint around them;
        # big ones become glass (vehicles) or stay open (railings, a gap between arm and body)
        _, (iy, ix) = ndi.distance_transform_edt(~inside0, return_indices=True)
        near = c[iy, ix]
        glass = np.array(opts.get("glass_rgb", (196, 210, 214)), np.float32)
        hl, hn = ndi.label(holes)
        for j in range(1, hn + 1):
            hm = hl == j
            n = hm.sum()
            if n < opts.get("hole_px", 400):
                c[hm] = near[hm] * .85; a[hm] = 1
            elif opts.get("glass") and n < opts.get("glass_px", 40000):
                c[hm] = glass * .7 + near[hm] * .3; a[hm] = 1
    # white die-cut margin: anti-aliased distance from the shape
    inside = a > .5
    d = ndi.distance_transform_edt(~inside)
    margin = np.clip(border - d + .5, 0, 1)
    if opts.get("margin", True) is False:
        margin = a
    A = np.maximum(a, margin)
    white = np.array([255, 253, 247], np.float32)
    if opts.get("sat"):          # calm a too-bright painting towards the book's palette
        lum = c.mean(-1, keepdims=True)
        c = np.clip(lum + (c - lum) * opts["sat"], 0, 255) * np.array([1.0, .985, .95])
    rgb = c * a[..., None] + white * (1 - a[..., None])
    # trim to the margin
    ys, xs = np.nonzero(A > .01)
    ty0, ty1, tx0, tx1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    rgb, A = rgb[ty0:ty1, tx0:tx1], A[ty0:ty1, tx0:tx1]
    h, w = A.shape
    im = Image.fromarray(np.dstack([np.clip(rgb, 0, 255), A * 255]).astype(np.uint8))
    big = max(w, h) > opts.get("png_over", 99999)
    file = f"{name}.webp"
    im.save(LIB / file, quality=opts.get("q", 90), method=6)
    # (drop shadows are made at run time from the sticker itself, see renderer.js shadowOf)
    poly = outline(A, tol=max(1.2, (w + h) / 900))
    # anchor = where the sticker stands: bottom centre of its opaque body (iso depth comes from this point)
    body = a[ty0:ty1, tx0:tx1] > .5
    bys, bxs = np.nonzero(body)
    anchor = opts.get("anchor") or [round(float(np.median(bxs[bys > bys.max() - max(3, h * .04)])), 1), int(bys.max())]
    return {"name": name, "file": file, "w": w, "h": h, "anchor": anchor, "border": border, "sheet": sheet,
            "src": [int(X0 + tx0 - pad), int(Y0 + ty0 - pad)], "tags": opts.get("tags", []), "poly": poly}


def process(sheet, spec, index):
    im = Image.open(SHEETS / spec.get("file", sheet + ".png")).convert("RGB")
    fg, al = key_magenta(np.asarray(im), *spec.get("key", [25, 200]))
    if spec.get("film"):
        # clear bubbles painted over magenta: inside each bubble, everything that is not solid paint is a thin
        # film. The model paints it as blotchy pink, so make it one smooth, pale, see-through skin.
        disc = ndi.binary_fill_holes(ndi.binary_closing(al > .3, iterations=4))
        t0 = np.asarray(im).astype(np.float32)
        pinkish = (np.minimum(t0[..., 0], t0[..., 2]) - t0[..., 1]) > 6
        lum0 = t0.mean(-1); sat0 = t0.max(-1) - t0.min(-1)
        rim = disc & (ndi.distance_transform_edt(disc) < 13)
        film = disc & ~rim & ((al <= .9) | pinkish | ((lum0 > 190) & (sat0 < 55)))
        film = ndi.binary_opening(film, iterations=1) | (disc & ~rim & (al <= .9))
        # the rim keeps its ink, minus the pink
        rl = fg.mean(-1, keepdims=True)
        fg = np.where((rim & pinkish)[..., None], rl * np.array([1, 1.01, 1.02]), fg)
        sm = ndi.gaussian_filter(al, 7)
        w = ndi.gaussian_filter(al, 3)[..., None] + 1e-3
        col = np.stack([ndi.gaussian_filter(fg[..., i] * al, 3) for i in range(3)], -1) / w
        lum = col.mean(-1, keepdims=True)
        pale = np.array([240, 244, 247], np.float32)
        col = pale * .7 + (lum * .9 + col * .1) * .3
        fm = film.astype(np.float32)
        sm = ndi.gaussian_filter(np.minimum(al, .9) * fm, 9) / (ndi.gaussian_filter(fm, 9) + 1e-3)
        al = np.where(film, np.clip(spec["film"] * (.3 + .35 * sm), 0, .6), al)
        fg = np.where(film[..., None], col, fg)
    H, W = al.shape
    lab, ids = components(al, spec.get("min_px", 400), spec.get("merge_px", 12), spec.get("join", 0), spec.get("cuts", []))
    order, boxes = reading_order(lab, ids)
    names = spec["names"]
    if len(order) != len(names):
        print(f"  {sheet}: found {len(order)} components, {len(names)} names: run --peek {sheet}")
    for k, i in enumerate(order):
        if k >= len(names) or not names[k]:
            continue
        n = names[k]
        opts = {**spec.get("opts", {}), **spec.get("each", {}).get(n, {})}
        mask = (lab == i).astype(np.float32)
        # the fringe outside the solid label still belongs to it
        mask = np.maximum(mask, ndi.binary_dilation(lab == i, iterations=3) * (lab == 0))
        b = boxes[i]
        size = np.sqrt((b[0].stop - b[0].start) * (b[1].stop - b[1].start))
        border = opts.get("border") or int(max(3, round(size * opts.get("border_k", .012))))
        index[n] = make_sticker(fg, al, mask, b, border, n, sheet, opts)
        # a swapped version of another sticker (edited from the same, aligned sheet): give it the same anchor
        # in sheet pixels, so it drops into the very same spot
        if opts.get("align_to") in index:
            o = index[opts["align_to"]]
            index[n]["anchor"] = [round(o["anchor"][0] + o["src"][0] - index[n]["src"][0], 1), round(o["anchor"][1] + o["src"][1] - index[n]["src"][1], 1)]
            index[n]["align_to"] = opts["align_to"]
        print(f"  {n}: {index[n]['w']}x{index[n]['h']} border {border}")


def peek(sheet):
    spec = SPEC.get(sheet, {"names": []})
    im = Image.open(SHEETS / spec.get("file", sheet + ".png")).convert("RGB")
    fg, al = key_magenta(np.asarray(im), *spec.get("key", [25, 200]))
    lab, ids = components(al, spec.get("min_px", 400), spec.get("merge_px", 12), spec.get("join", 0), spec.get("cuts", []))
    order, boxes = reading_order(lab, ids)
    from PIL import ImageDraw
    out = Image.new("RGB", im.size, (40, 40, 40))
    out.paste(Image.fromarray(fg.astype(np.uint8)), mask=Image.fromarray((al * 255).astype(np.uint8)))
    d = ImageDraw.Draw(out)
    for k, i in enumerate(order):
        b = boxes[i]
        d.rectangle([b[1].start, b[0].start, b[1].stop, b[0].stop], outline=(0, 255, 0), width=2)
        d.text((b[1].start + 4, b[0].start + 4), str(k), fill=(255, 255, 0))
    (HERE / "art" / "peek").mkdir(exist_ok=True)
    out.save(HERE / "art" / "peek" / f"{sheet}.png")
    print(f"{sheet}: {len(order)} components -> art/peek/{sheet}.png")


if __name__ == "__main__":
    args = sys.argv[1:]
    if args and args[0] == "--peek":
        for s in args[1:]:
            peek(s)
        sys.exit()
    LIB.mkdir(exist_ok=True)
    idx_path = LIB / "index.json"
    index = json.loads(idx_path.read_text()) if idx_path.exists() else {}
    for sheet, spec in SPEC.items():
        if sheet.startswith("_") or (args and sheet not in args):
            continue
        if not (SHEETS / spec.get("file", sheet + ".png")).exists():
            print(f"  {sheet}: no sheet yet"); continue
        print(sheet)
        for n in [k for k, v in index.items() if v.get("sheet") == sheet]:
            del index[n]
        process(sheet, spec, index)
    idx_path.write_text(json.dumps(index, indent=1))
    # the renderer and data.js read the library as a script (no fetch needed)
    (LIB / "library.js").write_text("// generated by tools/stickers.py from art/sheets.json: do not edit\nwindow.STICKERS = " + json.dumps(index, separators=(",", ":")) + ";\n")
    print(f"{len(index)} stickers in library/index.json")
