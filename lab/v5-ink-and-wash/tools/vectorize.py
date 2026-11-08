#!/usr/bin/python3
"""Pen-and-ink line art (PNG) -> potrace vector paths in square geometric tiles, as compact JSON for Path2D.

  vectorize.py lines.png out.json [--space W H] [--rect X0 Y0 X1 Y1] [--up 2] [--thr 140] [--unit 2]
                [--speck 10] [--ts 128] [--erase X0 Y0 X1 Y1]... [--keep X0 Y0 X1 Y1] [--mask mask.png]

--space W H     the space's own size (default: the image size). The image is stretched over --rect.
--rect          where the image sits in the space (default 0 0 W H): used for deep-zoom detail drawings.
--up            supersampling before thresholding (smoother curves).
--thr           ink threshold on 0..255 luminance (darker = ink).
--unit          potrace quantisation: coordinates in 1/unit of a supersampled pixel.
--speck         drop ink specks smaller than this many (supersampled) pixels.
--ts            tile size in space units. Each tile is traced on its own (with a small overlap), so drawing a
                zoomed-in tile only touches the paths near it.
--erase         blank a rectangle (space coords) before tracing; repeatable.
--keep          keep only ink inside this rectangle (space coords).
--mask          keep only ink where this mask (image-sized, white = keep) is white.

Output (.json): {"w","h","ts","tiles":[{"b":[x0,y0,x1,y1],"t":[a,d,e,f],"d":"M..."}]}
Output (.bin):  "INK1", u32 header length, header JSON (tiles with "o","n" = byte offset/length instead of "d"), then
                per tile a stream of ops: one byte (0 M, 1 m, 2 c, 3 l, 4 z), for M/m/c/l a varint count of numbers
                and that many zigzag varints (potrace's integer coordinates; all relative except M).
A potrace point (X, Y) of a tile is drawn at space (a*X + e, d*Y + f).
"""
import json, re, subprocess, sys, tempfile, os
from concurrent.futures import ThreadPoolExecutor
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

def arg(name, n=1, default=None, cast=float, multi=False):
    a = sys.argv; out = []
    for i, v in enumerate(a):
        if v == name:
            vals = [cast(x) for x in a[i + 1:i + 1 + n]]
            out.append(vals if n > 1 else vals[0])
    if multi: return out
    return out[-1] if out else default

def trace(ink, unit, td, name):
    pbm = os.path.join(td, name + ".pbm"); svg = os.path.join(td, name + ".svg")
    Image.fromarray(np.where(ink, 0, 255).astype(np.uint8)).convert("1").save(pbm)
    subprocess.run(["potrace", "-s", "-u", str(unit), "-t", "2", "-a", "1.0", "-O", "0.4", pbm, "-o", svg], check=True)
    s = open(svg).read()
    m = re.search(r'translate\(([-\d.]+),([-\d.]+)\) scale\(([-\d.]+),([-\d.]+)\)', s)
    paths = [re.sub(r"\s+", " ", p).strip() for p in re.findall(r'<path d="([^"]+)"', s)]
    return tuple(map(float, m.groups())), "".join(paths), len(paths)

OPS = {"M": 0, "m": 1, "c": 2, "l": 3, "z": 4, "Z": 4}
def varint(n, out):
    while True:
        b = n & 0x7f; n >>= 7
        if n: out.append(b | 0x80)
        else: out.append(b); return
def encode(d):
    out = bytearray()
    for cmd, nums in re.findall(r"([MmCcLlZz])([^MmCcLlZz]*)", d):
        out.append(OPS[cmd])
        if OPS[cmd] == 4: continue
        v = nums.replace("-", " -").split()
        assert all(re.fullmatch(r"-?\d+", x) for x in v), nums[:40]
        varint(len(v), out)
        for x in map(int, v): varint((x << 1) ^ (x >> 63) if x < 0 else x << 1, out)
    return bytes(out)

def main():
    src, out = sys.argv[1], sys.argv[2]
    im = Image.open(src).convert("L")
    iw, ih = im.size
    sp = arg("--space", 2, None)
    W, H = (sp if sp else (iw, ih))
    rect = arg("--rect", 4, [0, 0, W, H])
    up = arg("--up", 1, 2.0); thr = arg("--thr", 1, 140.0); unit = arg("--unit", 1, 2.0)
    speck = arg("--speck", 1, 10.0); ts = arg("--ts", 1, 128.0)
    erase = arg("--erase", 4, multi=True); keep = arg("--keep", 4, None); maskp = arg("--mask", 1, None, cast=str)

    big = im.resize((int(round(iw * up)), int(round(ih * up))), Image.LANCZOS)
    g = np.asarray(big, dtype=np.float32)
    ink = g < thr
    BH, BW = ink.shape
    kx = BW / (rect[2] - rect[0]); ky = BH / (rect[3] - rect[1])      # space unit -> supersampled px
    def to_px(r):
        return (int((r[0] - rect[0]) * kx), int((r[1] - rect[1]) * ky), int((r[2] - rect[0]) * kx), int((r[3] - rect[1]) * ky))
    for r in erase:
        x0, y0, x1, y1 = to_px(r); ink[max(0, y0):max(0, y1), max(0, x0):max(0, x1)] = False
    if keep:
        x0, y0, x1, y1 = to_px(keep); m = np.zeros_like(ink); m[max(0, y0):y1, max(0, x0):x1] = True; ink &= m
    if maskp:
        mk = np.asarray(Image.open(maskp).convert("L").resize((BW, BH)), np.float32) > 127; ink &= mk
    lab, n = ndi.label(ink)
    if n:
        sizes = ndi.sum(ink, lab, index=np.arange(1, n + 1))
        small = np.zeros(n + 1, bool); small[1:] = sizes < speck
        ink[small[lab]] = False
    # tiles in space units, aligned to the space's grid (so detail sets and base sets share it)
    ov = 2                                         # overlap in supersampled px
    jobs = []
    tx0 = int(rect[0] // ts); tx1 = int(np.ceil(rect[2] / ts)); ty0 = int(rect[1] // ts); ty1 = int(np.ceil(rect[3] / ts))
    for j in range(ty0, ty1):
        for i in range(tx0, tx1):
            sx0, sy0, sx1, sy1 = max(rect[0], i * ts), max(rect[1], j * ts), min(rect[2], (i + 1) * ts), min(rect[3], (j + 1) * ts)
            px0, py0 = int(np.floor((sx0 - rect[0]) * kx)) - ov, int(np.floor((sy0 - rect[1]) * ky)) - ov
            px1, py1 = int(np.ceil((sx1 - rect[0]) * kx)) + ov, int(np.ceil((sy1 - rect[1]) * ky)) + ov
            px0, py0 = max(0, px0), max(0, py0); px1, py1 = min(BW, px1), min(BH, py1)
            sub = ink[py0:py1, px0:px1]
            if sub.sum() == 0: continue
            jobs.append((i, j, px0, py0, px1, py1, sub))
    tiles = []; npaths = 0
    with tempfile.TemporaryDirectory() as td, ThreadPoolExecutor(8) as ex:
        res = list(ex.map(lambda jb: trace(jb[6], unit, td, f"t{jb[0]}_{jb[1]}"), jobs))
    for (i, j, px0, py0, px1, py1, sub), ((tx, ty, sx, sy), d, np_) in zip(jobs, res):
        if not d: continue
        npaths += np_
        # tile px -> space: rect0 + (px0 + tx + sx*X) / k
        a = sx / kx; e = rect[0] + (px0 + tx) / kx; dd = sy / ky; f = rect[1] + (py0 + ty) / ky
        b = [rect[0] + px0 / kx, rect[1] + py0 / ky, rect[0] + px1 / kx, rect[1] + py1 / ky]
        tiles.append({"b": [round(v, 2) for v in b], "t": [round(a, 7), round(dd, 7), round(e, 4), round(f, 4)], "d": d})
    if out.endswith(".bin"):
        blob = bytearray()
        for t in tiles:
            b = encode(t.pop("d")); t["o"] = len(blob); t["n"] = len(b); blob += b
        head = json.dumps({"w": W, "h": H, "ts": ts, "tiles": tiles}, separators=(",", ":")).encode()
        data = b"INK1" + len(head).to_bytes(4, "little") + head + bytes(blob)
        open(out, "wb").write(data); size = len(data)
    else:
        txt = json.dumps({"w": W, "h": H, "ts": ts, "tiles": tiles}, separators=(",", ":"))
        open(out, "w").write(txt); size = len(txt)
    print(f"{os.path.basename(out)}: {npaths} paths in {len(tiles)} tiles, {size/1024:.0f} KB, ink {ink.mean()*100:.1f}%")

if __name__ == "__main__":
    main()
