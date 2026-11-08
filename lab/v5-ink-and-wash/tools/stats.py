#!/usr/bin/python3
"""Numbers for REPORT.md: image calls and generation time (genlog.jsonl), shipped bytes, wall time."""
import json, os, glob, datetime
H = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
L = [json.loads(l) for l in open(os.path.join(H, "genlog.jsonl"))]
ok = [l for l in L if l["ok"]]
print(f"image calls: {len(L)} ({len(ok)} ok), gen minutes: {sum(l['secs'] for l in L) / 60:.1f}, gen: {sum(1 for l in L if l['mode']=='gen')}, edit: {sum(1 for l in L if l['mode']=='edit')}")
ship = ["index.html", "data.js", "renderer.js"] + glob.glob(os.path.join(H, "art/lines/*")) + glob.glob(os.path.join(H, "art/wash/*"))
tot = 0
for f in ship:
    p = f if os.path.isabs(f) else os.path.join(H, f); tot += os.path.getsize(p)
lines = sum(os.path.getsize(f) for f in glob.glob(os.path.join(H, "art/lines/*")))
wash = sum(os.path.getsize(f) for f in glob.glob(os.path.join(H, "art/wash/*")))
print(f"shipped: {tot/1024:.0f} KB (lines {lines/1024:.0f} KB, washes {wash/1024:.0f} KB, code+data {(tot-lines-wash)/1024:.0f} KB)")
t0 = datetime.datetime.fromisoformat(open(os.path.join(H, ".started")).read().strip().replace("Z", "+00:00"))
print(f"wall time so far: {(datetime.datetime.now(datetime.timezone.utc) - t0).total_seconds() / 60:.0f} min")
