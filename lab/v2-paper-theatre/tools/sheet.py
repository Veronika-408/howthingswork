"""Contact sheet: sheet.py out.jpg img1 img2 ... [--w 800] [--cols 2]"""
import sys
from PIL import Image
args = sys.argv[1:]; w = 800; cols = 2
if "--w" in args: i = args.index("--w"); w = int(args[i + 1]); del args[i:i + 2]
if "--cols" in args: i = args.index("--cols"); cols = int(args[i + 1]); del args[i:i + 2]
out, files = args[0], args[1:]
ims = [Image.open(f).convert("RGB") for f in files]
th = [int(w * im.height / im.width) for im in ims]
rows = (len(ims) + cols - 1) // cols
H = sum(max(th[r * cols:(r + 1) * cols]) for r in range(rows))
sheet = Image.new("RGB", (w * cols + 6 * (cols - 1), H + 6 * (rows - 1)), (40, 40, 40))
y = 0
for r in range(rows):
    for c in range(cols):
        i = r * cols + c
        if i < len(ims): sheet.paste(ims[i].resize((w, th[i]), Image.LANCZOS), (c * (w + 6), y))
    y += max(th[r * cols:(r + 1) * cols]) + 6
sheet.save(out, quality=88)
