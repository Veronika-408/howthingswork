#!/usr/bin/python3
"""Build every space: vectorise the line art, separate the wash, write data.js.

  build.py [space ...] [--force]

Source of truth: tools/spaces.json (pictures, outlines, spots, details). Steps only rerun when a source is newer.
"""
import json, os, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
PY = "/usr/bin/python3"
force = "--force" in sys.argv
only = [a for a in sys.argv[1:] if not a.startswith("--")]
J = lambda *p: os.path.join(ROOT, *p)
spaces = json.load(open(J("tools", "spaces.json")))

def stale(out, *srcs):
    if force or not os.path.exists(out): return True
    t = os.path.getmtime(out)
    return any(os.path.getmtime(s) > t for s in srcs if s and os.path.exists(s))

def vec(src, out, w, h, opts, rect=None):
    cmd = [PY, J("tools", "vectorize.py"), src, out, "--space", str(w), str(h)]
    if rect: cmd += ["--rect", *map(str, rect)]
    for k, v in (opts or {}).items():
        if k in ("erase",):
            for r in v: cmd += ["--erase", *map(str, r)]
        elif isinstance(v, list): cmd += ["--" + k, *map(str, v)]
        else: cmd += ["--" + k, str(v)]
    subprocess.run(cmd, check=True)

def main():
    os.makedirs(J("art", "lines"), exist_ok=True); os.makedirs(J("art", "wash"), exist_ok=True)
    out_spaces = {}
    for sid, S in spaces.items():
        if sid.startswith("_"): continue
        w, h = S["w"], S["h"]
        o = {k: v for k, v in S.items() if k in ("parent", "spot", "paper", "frame", "maxZoom", "kind", "parts", "dive",
                                                    "view", "windows", "levers", "washRect")}
        o["w"], o["h"] = w, h
        if S.get("src") and (not only or sid in only):
            lo = J("art", "lines", f"{sid}.bin")
            if stale(lo, J(S["src"]), J("tools", "spaces.json")): vec(J(S["src"]), lo, w, h, S.get("vec"))
        if S.get("src"): o["lines"] = f"art/lines/{sid}.bin"
        if S.get("washsrc") and not os.path.exists(J(S["washsrc"])): print("  (no wash yet for", sid + ")")
        if S.get("washsrc") and os.path.exists(J(S["washsrc"])):
            wo = J("art", "wash", f"{sid}.webp"); wp = J("art", "src", f"{sid}-wash.png")
            if (not only or sid in only) and stale(wo, J(S["washsrc"]), J(S["src"]), J("tools", "spaces.json")):
                cmd = [PY, J("tools", "wash.py"), J(S["src"]), J(S["washsrc"]), wp, "--webp", wo]
                for k, v in (S.get("washopt") or {}).items():
                    cmd += ["--" + k] + ([] if v is True else [J(v) if k == "holes" else str(v)])
                subprocess.run(cmd, check=True)
            o["wash"] = f"art/wash/{sid}.webp"; o["assets"] = [o["wash"]]
        dts = []
        for d in S.get("details", []):
            lo = J("art", "lines", f"{sid}-{d['id']}.bin")
            if (not only or sid in only) and stale(lo, J(d["src"]), J("tools", "spaces.json")):
                vec(J(d["src"]), lo, w, h, {**(S.get("vec") or {}), **(d.get("vec") or {}), "tiles": [4, 4]}, rect=d["rect"])
            dts.append({"id": d["id"], "lines": f"art/lines/{sid}-{d['id']}.bin", "rect": d["rect"], "keep": d.get("keep", d["rect"]),
                        "from": d.get("from", 2.5), "to": d.get("to", 3.5)})
        if dts: o["details"] = dts
        for name, y in (S.get("sprites") or {}).items():
            if not os.path.exists(J(y["src"])): continue
            lo = J("art", "lines", f"{sid}-{name}.bin"); wo = J("art", "wash", f"{sid}-{name}.webp")
            if stale(lo, J(y["src"]), J("tools", "spaces.json")): vec(J(y["src"]), lo, w, h, {**(S.get("vec") or {}), "keep": y["keep"]})
            if stale(wo, J(y["src"]), J("tools", "spaces.json")):
                subprocess.run([PY, J("tools", "flatwash.py"), J(y["src"]), *map(str, y["keep"]), y["color"], wo], check=True)
            o.setdefault("sprites", {})[name] = {"lines": f"art/lines/{sid}-{name}.bin", "wash": f"art/wash/{sid}-{name}.webp",
                                                 **{k: v for k, v in y.items() if k not in ("src", "color")}}
            o.setdefault("assets", []).append(f"art/wash/{sid}-{name}.webp")
        out_spaces[sid] = o
    data = {"variant": {"id": "v5-ink-and-wash", "name": "Ink and wash",
                        "approach": "Every space is a pen-and-ink drawing traced into vector paths (sharp at any zoom) over a separate loose watercolour wash, on paper; deep zoom fades in finer line drawings."},
            "root": "city", "spaces": out_spaces}
    js = "// Built by tools/build.py from tools/spaces.json: do not edit by hand.\nwindow.LAB_DATA = " + json.dumps(data, separators=(",", ":")) + ";\n"
    open(J("data.js"), "w").write(js)
    print("data.js", len(js) // 1024, "KB;", ", ".join(out_spaces))

if __name__ == "__main__":
    main()
