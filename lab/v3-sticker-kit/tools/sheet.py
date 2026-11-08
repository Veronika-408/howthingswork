#!/usr/bin/python3
import sys
from PIL import Image
pre, out = sys.argv[1], sys.argv[2]
names = [f"{pre}-{i}.jpg" for i in range(6)] + [f"{pre}-end.jpg"]
ims = [Image.open(n) for n in names]
w, h = ims[0].size; t = Image.new("RGB", (w // 2 * 4, h // 2 * 2), "white")
for i, im in enumerate(ims): t.paste(im.resize((w // 2, h // 2)), ((i % 4) * w // 2, (i // 4) * h // 2))
t.save(out)
