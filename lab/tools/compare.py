#!/usr/bin/env python3
"""Build lab/compare.json for the comparison page: cost numbers from every variant's genlog.jsonl, download
weight (lab/weights.json, from tools/weigh.mjs), the lead's review (lab/review.json) and the screenshots on disk.
   /usr/bin/python3 lab/tools/compare.py"""
import json, glob, os
from datetime import datetime
LAB = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
V = ["v1-patchwork", "v2-paper-theatre", "v3-sticker-kit", "v4-encyclopedia-page", "v5-ink-and-wash"]
load = lambda p, d: json.load(open(p)) if os.path.exists(p) else d
weights, review = load(f"{LAB}/weights.json", {}), load(f"{LAB}/review.json", {})
out = {"verdict": review.get("verdict", ""), "variants": {}}
for v in V:
    d = {"ready": os.path.exists(f"{LAB}/{v}/index.html") and os.path.exists(f"{LAB}/{v}/data.js")}
    logs = []
    for line in open(f"{LAB}/{v}/genlog.jsonl") if os.path.exists(f"{LAB}/{v}/genlog.jsonl") else []:
        try: logs.append(json.loads(line))
        except Exception: pass
    ok = [l for l in logs if l.get("ok")]
    d["calls"] = len(ok); d["failedCalls"] = len(logs) - len(ok)
    d["genMinutes"] = round(sum(l.get("secs", 0) for l in logs) / 60)
    if logs:
        ts = [datetime.strptime(l["t"], "%Y-%m-%dT%H:%M:%SZ") for l in logs]
        d["span"] = round((max(ts) - min(ts)).total_seconds() / 3600, 1)
    d["rejected"] = len([f for f in glob.glob(f"{LAB}/{v}/art/rejected/**/*.png", recursive=True)])
    d.update(weights.get(v, {}))
    d["shots"] = sorted("small/" + os.path.basename(f) for f in glob.glob(f"{LAB}/{v}/shots/small/desktop-*.jpg"))
    d.update(review.get(v, {}))
    out["variants"][v] = d
json.dump(out, open(f"{LAB}/compare.json", "w"), indent=1)
print(json.dumps({v: {k: out["variants"][v].get(k) for k in ("ready", "calls", "failedCalls", "genMinutes", "span", "rejected", "mb")} for v in V}, indent=1))
