"""Build the paper theatre: cut every layer out of its painting (art/src), give it its paper margin, cut edge and
shadow, save it to art/layers/, make each space's paper proscenium, trace the outlines that come from layers,
and write data.js. Run from anywhere:  /usr/bin/python3 lab/v2-paper-theatre/tools/build.py [space ...]
The layers of a space are listed in spec.py; a layer is only re-cut when its source or its settings change."""
import hashlib, json, os, sys, zlib
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
from skimage import measure

HERE = os.path.dirname(os.path.abspath(__file__)); V = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from paper import load, key_magenta, clean, cut_paper, save_layer, noise
import spec

os.chdir(V)
CACHE = os.path.join(V, "art/layers/cache.json")
cache = json.load(open(CACHE)) if os.path.exists(CACHE) else {}


def fhash(*paths, extra=""):
    h = hashlib.md5(extra.encode())
    for p in paths:
        if p and os.path.exists(p): h.update(open(p, "rb").read())
    return h.hexdigest()


def poly_mask(shape, polys):
    from skimage.draw import polygon as dpoly
    m = np.zeros(shape, bool)
    for p in polys:
        p = np.array(p)
        rr, cc = dpoly(p[:, 1], p[:, 0], shape)
        m[rr, cc] = True
    return m


def cut(sid, L, size):
    """One layer: returns (entry for data.js, full-size RGBA float for previews)."""
    src = f"art/src/{L['src']}"
    name = L.get("name") or L["src"].rsplit(".", 1)[0]
    out = f"art/layers/{name}.webp"
    key = fhash(src, os.path.join(HERE, "paper.py"), os.path.join(HERE, "build.py") if L.get("mode") == "full" else None, extra=json.dumps(L, sort_keys=True) + json.dumps(size))
    a = load(src, size=size)
    mode = L.get("mode", "key")
    if mode == "full":
        rgba = np.dstack([a, np.full(a.shape[:2], 255, np.float32)])
        if L.get("role") == "back":                     # a backdrop is a torn sheet: its edge shows while the page flies in
            H, W = a.shape[:2]; yy, xx = np.mgrid[0:H, 0:W]
            edge = np.minimum(np.minimum(xx, W - 1 - xx), np.minimum(yy, H - 1 - yy)).astype(np.float32)
            wob = 11 + 3.5 * noise((H, W), 19, 5) + 1.5 * noise((H, W), 4, 9)
            rgba[..., 3] = np.clip((edge - wob) / 2.0, 0, 1) * 255
    else:
        rgba = key_magenta(a, grey=L.get("grey", False))
    if L.get("diffFrom"):                               # only what an edit added: where it differs from the picture before
        before = load(f"art/src/{L['diffFrom']}", size=size)
        dm = np.abs(a - before).max(-1) > 30
        if L.get("within"): dm &= poly_mask(dm.shape, L["within"])
        dm = ndi.binary_closing(ndi.binary_opening(dm, iterations=1), iterations=3)
        dm = ndi.binary_fill_holes(dm)
        rgba[..., 3] *= ndi.gaussian_filter(ndi.binary_dilation(dm, iterations=1).astype(np.float32), .7)
    if L.get("move"):                                   # slide the piece, like moving a cut-out on the stage
        dx, dy = L["move"]; rgba = np.roll(rgba, (dy, dx), axis=(0, 1))
    if L.get("erase"):                                  # areas to drop from the cut (stray bits the edit left)
        m = poly_mask(rgba.shape[:2], L["erase"]); rgba[m, 3] = 0
    if L.get("keep"):                                   # keep only inside these polygons
        m = poly_mask(rgba.shape[:2], L["keep"]); rgba[~m, 3] = 0
    if mode != "full":
        rgba = clean(rgba, min_area=L.get("min_area", 400), hole_area=L.get("hole_area", 900), close=L.get("close", 1))
    if L.get("paper", mode != "full"):
        sh = L.get("shadow", (5, 8, 7, .34))
        rgba = cut_paper(rgba, margin=L.get("margin", 3), seed=L.get("seed", zlib.crc32(name.encode()) % 1000), shadow=tuple(sh) if sh else None,
                         fill=getattr(clean, "filled", None) if mode != "full" else None)
    entry = None
    if cache.get(out, {}).get("key") == key and os.path.exists(out):
        entry = cache[out]["entry"]
    else:
        entry = save_layer(rgba, out, quality=L.get("q", 86), crop=mode != "full")
        cache[out] = {"key": key, "entry": entry}
        print("  cut", out, entry)
    e = {"src": out, **entry, "d": L.get("d", 0)}
    for k in ("role", "vis", "id"):
        if k in L: e[k] = L[k]
    return e, rgba


def frame_art(sid, S, page):
    """The paper proscenium: an opening with a hand-cut, slightly wobbly edge, and the soft shadow it casts."""
    fx, fy, fw, fh = S.get("frame", [0, 0, S["w"], S["h"]])
    ins = S.get("frameInset", max(10, round(min(fw, fh) * .018)))
    rng = np.random.default_rng(zlib.crc32(sid.encode()) % 10000)
    pts = []
    def side(x0, y0, x1, y1, n):
        for i in range(n):
            t = i / n
            j = rng.normal(0, .9) + 1.6 * np.sin(t * 9 + rng.random() * 6)
            nx, ny = (y1 - y0), -(x1 - x0); l = np.hypot(nx, ny); nx, ny = nx / l, ny / l
            pts.append([round(x0 + (x1 - x0) * t + nx * j, 1), round(y0 + (y1 - y0) * t + ny * j, 1)])
    x0, y0, x1, y1 = fx + ins, fy + ins, fx + fw - ins, fy + fh - ins
    side(x0, y0, x1, y0, 60); side(x1, y0, x1, y1, 36); side(x1, y1, x0, y1, 60); side(x0, y1, x0, y0, 36)
    # shadow at a quarter of the size: blurred frame shifted down-right, inside the opening only
    q = 4; W, H = int(S["w"] / q) + 1, int(S["h"] / q) + 1
    m = poly_mask((H, W), [[[x / q, y / q] for x, y in pts]])
    fr = (~m).astype(np.float32)
    sh = ndi.gaussian_filter(ndi.shift(fr, (10 / q, 6 / q), order=1, mode="constant", cval=1), 16 / q)
    sh = np.clip(sh * m * .55, 0, 1)
    img = np.dstack([np.full((H, W), 50, np.float32), np.full((H, W), 36, np.float32), np.full((H, W), 20, np.float32), sh * 255])
    out = f"art/layers/{sid}-frame-shadow.webp"
    Image.fromarray(img.astype(np.uint8), "RGBA").save(out, quality=80, method=6)
    return {"poly": pts, "shadow": {"src": out, "x": 0, "y": 0, "w": W * q, "h": H * q}}, m


def trace(mask, tol=2.5, min_area=600, top=6):
    """Outline polygons of a mask (largest pieces first)."""
    m = ndi.binary_closing(mask, iterations=3)
    m = ndi.binary_fill_holes(m)
    lab, n = ndi.label(m)
    if not n: return []
    sizes = ndi.sum(m, lab, range(1, n + 1))
    order = np.argsort(-sizes)
    polys = []
    for i in order[:top]:
        if sizes[i] < min_area: break
        piece = np.pad(lab == i + 1, 2)
        cs = measure.find_contours(piece.astype(np.float32), .5)
        c = max(cs, key=len)
        c = measure.approximate_polygon(c, tol)
        polys.append([[round(float(x) - 2, 1), round(float(y) - 2, 1)] for y, x in c])
    return polys


def build_drive(sid, S, spaces):
    """The flying leaf reuses the flight deck: the pilots' shell, and the captain's wheel and the thrust levers cut
    out of the pilots' controls layer so they can move; the sky panorama is mirrored so it repeats sideways."""
    print(sid)
    D = S["driveSpec"]; ox, oy = D["crop"]
    P = spaces["pilots"]; size = (P["w"], P["h"])
    shell = next(L for L in P["layers"] if L.get("src", "").endswith(D["shellFrom"]))
    out = {k: v for k, v in S.items() if k not in ("layers", "driveSpec", "parts")}
    dr = {"horizon": D["horizon"], "ppd": D["ppd"], "flapTab": D["flapTab"], "gearTab": D["gearTab"]}
    dr["shell"] = {"src": shell["src"], "x": shell["x"] - ox, "y": shell["y"] - oy, "w": shell["w"], "h": shell["h"]}
    cup = next((L for L in P["layers"] if L.get("src", "").endswith(D.get("cupFrom", "-"))), None)
    if cup: dr["cup"] = {"src": cup["src"], "x": cup["x"] - ox, "y": cup["y"] - oy, "w": cup["w"], "h": cup["h"]}
    for k in ("yoke", "static", "levers"):
        L = D[k]
        e, _ = cut(sid, {"src": L["src"], "name": f"drive-{k}", "keep": L["keep"], "min_area": 150, "margin": 3, "hole_area": 40}, size)
        e = {kk: e[kk] for kk in ("src", "x", "y", "w", "h")}
        e["x"] -= ox; e["y"] -= oy
        if "pivot" in L: e["pivot"] = [L["pivot"][0] - ox, L["pivot"][1] - oy]
        if "travel" in L: e["travel"] = L["travel"]
        dr[k] = e
    # the sky: trim the paper edge, mirror it so it tiles, find the horizon
    sk = D["sky"]; im = Image.open(f"art/src/{sk['src']}").convert("RGB")
    l, t, r, b = sk["trim"]; im = im.crop((l, t, im.width - r, im.height - b))
    a = np.asarray(im).astype(np.float32)
    blue = a[..., 2] - a[..., 1]
    rows = blue.mean(1)
    hz = int(np.argmax(-np.diff(ndi.uniform_filter1d(rows, 9))))
    tile = Image.new("RGB", (im.width * 2, im.height)); tile.paste(im, (0, 0)); tile.paste(im.transpose(Image.FLIP_LEFT_RIGHT), (im.width, 0))
    tile.save("art/layers/drive-sky.webp", quality=82, method=6)
    top = a[:6].reshape(-1, 3).mean(0); bot = a[-6:].reshape(-1, 3).mean(0)
    dr["sky"] = {"src": "art/layers/drive-sky.webp", "w": tile.width, "h": tile.height, "horizon": hz, "scale": sk["scale"],
                 "pxPerDeg": sk["pxPerDeg"], "top": "#%02x%02x%02x" % tuple(int(v) for v in top), "bottom": "#%02x%02x%02x" % tuple(int(v) for v in bot)}
    print("  sky horizon at", hz, "of", tile.height)
    cl = D["clouds"]; ca = load(f"art/src/{cl['src']}")
    rgba = cut_paper(clean(key_magenta(ca), min_area=300), margin=2, seed=4, shadow=(3, 6, 6, .22))
    e = save_layer(rgba, "art/layers/drive-clouds.webp", crop=True)
    dr["clouds"] = {"src": "art/layers/drive-clouds.webp", "w": e["w"], "h": e["h"], "scale": cl["scale"]}
    win = next(q for q in spec.SPACES["pilots"]["parts"] if q["id"] == "windows")["polys"]
    dr["windows"] = [[[x - ox, y - oy] for x, y in poly] for poly in win]
    out["drive"] = dr
    out["frameArt"], _ = frame_art(sid, S, None)
    out["layers"] = []
    out["parts"] = S["parts"]
    return out


def build_space(sid, S):
    print(sid)
    size = (S["w"], S["h"])
    layers, full = [], {}
    for L in S["layers"]:
        if L.get("kind") in ("child", "frame"):
            e = {k: v for k, v in L.items()}
            layers.append(e); continue
        e, rgba = cut(sid, L, size)
        layers.append(e); full[e.get("id") or L["src"]] = rgba; full[len(layers) - 1] = rgba
    out = {k: v for k, v in S.items() if k not in ("layers", "parts", "frameInset")}
    out["layers"] = layers
    if any(L.get("kind") == "frame" for L in layers):
        out["frameArt"], _ = frame_art(sid, S, None)
    # parts: explicit polygons, or traced from a layer's paper
    parts = []
    for P in S["parts"]:
        p = {k: v for k, v in P.items() if k not in ("from", "minus", "within", "addPolys", "fromChild", "pad")}
        if "from" in P:
            a = full[P["from"]][..., 3] > 128
            if P.get("within"): a &= poly_mask(a.shape, P["within"])
            if P.get("minus"): a &= ~poly_mask(a.shape, P["minus"])
            p["polys"] = trace(a, top=P.get("top", 6), min_area=P.get("min_area", 600)) + P.get("addPolys", [])
        # depth: the layer the part sits on
        if "layer" in P:
            li = next(i for i, L in enumerate(layers) if L.get("id") == P["layer"])
            p["d"] = layers[li].get("d", 0); p["li"] = li
            del p["layer"]
        parts.append(p)
    out["parts"] = parts
    # preview: the stack at rest (no children drawn)
    pv = np.broadcast_to(np.array(spec.hex2rgb(S.get("paper", "#f4efe4")), np.float32), (S["h"], S["w"], 3)).copy()
    for i, L in enumerate(layers):
        if i in full and L.get("vis") != "mini":
            rgba = full[i]; al = rgba[..., 3:4] / 255; pv = rgba[..., :3] * al + pv * (1 - al)
    os.makedirs("art/preview", exist_ok=True)
    Image.fromarray(pv.astype(np.uint8)).save(f"art/preview/{sid}.jpg", quality=86)
    return out


def inparent(spot):
    (w0, w1), (p0, p1) = spot["axis"], spot["plateAxis"]
    s = np.hypot(w1[0] - w0[0], w1[1] - w0[1]) / np.hypot(p1[0] - p0[0], p1[1] - p0[1])
    return s, (w0[0] + w1[0]) / 2 - s * (p0[0] + p1[0]) / 2, (w0[1] + w1[1]) / 2 - s * (p0[1] + p1[1]) / 2


def main():
    want = sys.argv[1:]
    old = {}
    if os.path.exists("art/layers/spaces.json"):
        old = json.load(open("art/layers/spaces.json"))
    spaces = {}
    for sid, S in spec.SPACES.items():
        if want and sid not in want and sid in old:
            spaces[sid] = old[sid]; continue
        if not all(os.path.exists(f"art/src/{L['src']}") for L in S["layers"] if "src" in L):
            print(sid, "(waiting for art)"); continue
        if S.get("kind") == "drive":
            if "pilots" in spaces: spaces[sid] = build_drive(sid, S, spaces)
            continue
        spaces[sid] = build_space(sid, S)
    # outlines of children drawn inside their parents: traced from the child's own paper, mapped into the parent
    for sid, s in spaces.items():
        for P in s["parts"]:
            src = spec.SPACES[sid]["parts"]
            sp = next((q for q in src if q["id"] == P["id"]), {})
            cid = sp.get("fromChild")
            if not cid or cid not in spaces: continue
            c = spaces[cid]; m = np.zeros((c["h"], c["w"]), bool)
            for L in c["layers"]:
                if "src" not in L or L.get("role") == "back" or L.get("vis") == "own": continue
                a = np.asarray(Image.open(L["src"]).convert("RGBA"))[..., 3] > 100
                m[L["y"]:L["y"] + a.shape[0], L["x"]:L["x"] + a.shape[1]] |= a[:c["h"] - L["y"], :c["w"] - L["x"]]
            if sp.get("pad"): m = ndi.binary_dilation(m, iterations=int(sp["pad"] / max(1e-3, inparent(spec.SPACES[cid]["spot"])[0])))
            sc, tx, ty = inparent(spec.SPACES[cid]["spot"])
            polys = trace(m, tol=6, min_area=3000, top=3)
            P["polys"] = [[[round(tx + sc * x, 1), round(ty + sc * y, 1)] for x, y in poly] for poly in polys]
    json.dump(spaces, open("art/layers/spaces.json", "w"))
    json.dump(cache, open(CACHE, "w"), indent=0)
    # assets: own pictures, plus the pictures of every child drawn inside it
    def pics(s):
        r = [L["src"] for L in s.get("layers", []) if "src" in L]
        if s.get("frameArt"): r.append(s["frameArt"]["shadow"]["src"])
        if s.get("drive"): r += [v["src"] for v in s["drive"].values() if isinstance(v, dict) and "src" in v]
        if s.get("drive") is None and "drive" in s: pass
        return r
    for sid, s in spaces.items():
        a = pics(s)
        for L in s.get("layers", []):
            if L.get("kind") == "child" and L["child"] in spaces:
                a += [x for x in pics(spaces[L["child"]]) if "frame-shadow" not in x]
        s["assets"] = list(dict.fromkeys(a))
    data = {"variant": spec.VARIANT, "root": "city", "spaces": spaces}
    with open("data.js", "w") as f:
        f.write("// Written by tools/build.py from tools/spec.py: do not edit by hand.\n")
        f.write("window.LAB_DATA = " + json.dumps(data, separators=(",", ":")) + ";\n")
    print("data.js:", ", ".join(spaces))


if __name__ == "__main__":
    main()
