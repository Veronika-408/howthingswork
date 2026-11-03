#!/usr/bin/env python3
"""Build howthings.work: a pencil map of a town, with the machines that have been built (subjects) in colour.

  python3 build.py              everything (images, tiles, book, world, html)
  python3 build.py --html-only  just re-inline the scripts
  python3 build.py --site       also package the site for publishing (maintainer only)

Outputs dist/index.html, dist/artifact.html and dist/assets/... (the plane keeps its old asset paths,
other subjects live under assets/<id>/, the city under assets/world/).
"""
import json, sys
import numpy as np
from pathlib import Path
from PIL import Image, ImageFilter
from scipy import ndimage as ndi

ROOT = Path(__file__).parent
SRC, DIST = ROOT / "src", ROOT / "dist"
SCALE = 2                         # published plates are 2x for sharper zooming

SUBJECTS = {
    "plane": dict(
        art=ROOT / "art", src=ROOT / "src", out="assets/", plate_w=1832,
        title="The Jumbo Jet", kicker="Inside a Boeing 747-400", whole="Whole plane",
        hint="Pick any part of the plane to look closer.", tag=None,
        alt="Cut-away painting of a Boeing 747-400 at the airport gate.",
        how={"map": {"cockpit": "cockpit", "cockpit.controls": "cockpit", "cockpit.windows": "cockpit", "tail": "cockpit",
                     "tail.rudder": "cockpit", "tail.stabiliser": "cockpit", "flaps": "cockpit",
                     "engine": "engine", "engine.fan": "engine", "engine.compressor": "engine", "engine.combustor": "engine",
                     "engine.turbine": "engine", "galley": "oven", "galley.ovens": "oven", "baggage": "belt",
                     "baggage.belt-loader": "belt", "catering": "scissor", "catering.scissor": "scissor"},
             "thumb": {"cockpit": "assets/book/cockpit-thumb.webp", "engine": "assets/book/engine.webp", "oven": "assets/book/oven.webp",
                       "belt": "assets/book/belt.webp", "scissor": "assets/zoom/catering__scissor.webp"},
             "part": {"cockpit": "cockpit", "engine": "engine", "oven": "galley", "belt": "baggage", "scissor": "catering"}},
        book_dir="assets/book/", credit={"name": "@virpo", "url": "https://x.com/virpo"}),
}

def discover_subjects():
    """Every subjects/<id>/subject.json is a machine on the map (the plane is built in, at the repo root)."""
    for f in sorted((ROOT / "subjects").glob("*/subject.json")):
        sid, d = f.parent.name, json.loads(f.read_text())
        base = f.parent
        SUBJECTS[sid] = dict(art=base / "art", src=base / "src", out=f"assets/{sid}/", tag=None,
                             book_dir=f"assets/{sid}/book/", dir=base, **{k: v for k, v in d.items() if k not in ("describe",)})
discover_subjects()
WORLD_ART, WORLD_SRC = ROOT / "world" / "art", ROOT / "world" / "src"

def paper_of(im):
    a = np.asarray(im.convert("RGB")).astype(np.float32)
    b = np.concatenate([a[:6].reshape(-1, 3), a[-6:].reshape(-1, 3), a[:, :6].reshape(-1, 3), a[:, -6:].reshape(-1, 3)])
    return tuple(int(v) for v in np.median(b, 0))

def paint_mask(im, paper, thresh=18, open_sky=False):
    """Soft alpha of everything painted on the plate: paper connected to the border is transparent."""
    from skimage.segmentation import flood
    a = np.asarray(im.convert("RGB")).astype(np.float32)
    h, w, _ = a.shape
    dist = np.sqrt(((a - np.array(paper, np.float32)) ** 2).sum(-1))
    near = (dist < thresh).astype(np.uint8)
    bg = np.zeros((h, w), bool)
    for y, x in [(0, 0), (0, w - 1), (h - 1, 0), (h - 1, w - 1), (0, w // 2), (h - 1, w // 2), (h // 2, 0), (h // 2, w - 1)]:
        if near[y, x]: bg |= flood(near, (y, x), connectivity=1)
    # open_sky: bare paper enclosed by wires and poles is cut away too (it would show as a white block
    # in the city); otherwise everything the outline encloses stays, so white paintwork is kept
    obj = (~bg & ~near.astype(bool)) if open_sky else ~bg
    obj = ndi.binary_opening(obj, iterations=1)
    lab, n = ndi.label(obj)
    if n:                                   # drop specks: keep pieces bigger than 0.05% of the plate
        sizes = ndi.sum(obj, lab, range(1, n + 1))
        obj = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s > w * h * .0005])
    obj = ndi.binary_closing(obj, iterations=4)
    # enclosed holes: fill small ones and painted ones; big bare-paper ones (sky between wires) stay open
    holes, nh = ndi.label(ndi.binary_fill_holes(obj) & ~obj)
    for j, sl in enumerate(ndi.find_objects(holes), 1):
        hm = holes[sl] == j
        if not open_sky or hm.sum() < w * h * .015 or dist[sl][hm].mean() > 14: obj[sl] |= hm   # white panels yes, open sky no
    soft = ndi.gaussian_filter(obj.astype(np.float32), 3.0)
    # the watercolour edge itself is partly paper: fade alpha by how far the colour is from paper
    tone = np.clip((dist - 4) / 26, 0, 1)
    alpha = np.clip(soft * (.35 + .65 * np.maximum(tone, ndi.binary_erosion(obj, iterations=6))), 0, 1)
    return alpha, obj

def outline_of(obj, tol=5):
    """The painted area's outer contour(s) as simple polygons, for the clickable spot in the city."""
    from skimage.measure import find_contours, approximate_polygon
    small = obj[::4, ::4].astype(np.float32)
    polys = []
    for c in find_contours(np.pad(small, 1), .5):
        if len(c) < 30: continue
        p = approximate_polygon(c, tolerance=tol / 4)
        pts = [[round((x - 1) * 4, 1), round((y - 1) * 4, 1)] for y, x in p]
        area = abs(sum(pts[i][0] * pts[i - 1][1] - pts[i - 1][0] * pts[i][1] for i in range(len(pts)))) / 2
        if area > obj.size * .01: polys.append((area, pts))
    polys.sort(reverse=True)
    return [p for _, p in polys[:3]]

def feathered(im, fx=.03, fy=.04):
    """RGBA copy whose edges fade to transparent, so a repaint blends into the layer below it."""
    w, h = im.size
    ax = np.minimum(1, np.minimum(np.arange(w), np.arange(w)[::-1]) / max(1, fx * w))
    ay = np.minimum(1, np.minimum(np.arange(h), np.arange(h)[::-1]) / max(1, fy * h))
    a = (np.outer(ay, ax) * 255).astype(np.uint8)
    out = im.convert("RGB").copy(); out.putalpha(Image.fromarray(a))
    return out

def tile_index(art):
    plan_file = art / "zoom" / "plan.json"
    if not plan_file.exists():
        return {}
    plan = json.loads(plan_file.read_text())
    have = {f.stem.replace("__", "/") for f in (art / "zoom" / "tiles").glob("*.png")}
    return {k: {"level": v["level"], "rect": v["rect"]} for k, v in plan.items() if k in have and (v["level"] == 2 or v["parent"] in have)}

from plane_book import disc_mask

def build_subject(sid, cfg, images=True):
    out = DIST / cfg["out"]
    (out / "detail").mkdir(parents=True, exist_ok=True)
    src = Image.open(cfg["art"] / "plate.png").convert("RGB")
    paper = paper_of(src)
    canvas = Image.new("RGB", (cfg["plate_w"], src.height), paper)
    canvas.paste(src, (0, 0))
    meta_file = cfg["art"] / "plate-meta.json"
    if images or not meta_file.exists():
        big = canvas.resize((canvas.width * SCALE, canvas.height * SCALE), Image.LANCZOS)
        big.filter(ImageFilter.UnsharpMask(radius=1.2, percent=40, threshold=2)).save(out / "plate.webp", quality=84, method=6)
        alpha, obj = paint_mask(canvas, paper, open_sky=cfg.get("open_sky", False))
        m = np.zeros((*alpha.shape, 4), np.uint8); m[..., :3] = 255; m[..., 3] = (alpha * 255).astype(np.uint8)
        Image.fromarray(m).resize((canvas.width // 2, canvas.height // 2), Image.LANCZOS).save(out / "plate-mask.png", optimize=True)
        meta_file.write_text(json.dumps({"paper": paper, "outline": outline_of(obj)}))
        for f in sorted((cfg["art"] / "detail").glob("*.png")):
            if f.stem == "ground": continue                    # superseded by the four ground-crew close-ups
            im = Image.open(f).convert("RGB"); im.thumbnail((1200, 900), Image.LANCZOS)
            im.save(out / "detail" / (f.stem + ".webp"), quality=80, method=6)
        (out / "zoom").mkdir(parents=True, exist_ok=True)
        for key in tile_index(cfg["art"]):
            f = key.replace("/", "__")
            feathered(Image.open(cfg["art"] / "zoom" / "tiles" / f"{f}.png")).save(out / "zoom" / f"{f}.webp", quality=80, method=6)
    return json.loads(meta_file.read_text())

# ---------------------------------------------------------------- the world
def fade_ink(a, paper, keep=.16, strength=.72):
    """Faded ink: mostly drained of colour and lifted towards the paper, like a plate waiting for colour."""
    a = a.astype(np.float32)
    lum = (a[..., :3] * [.3, .59, .11]).sum(-1, keepdims=True)
    col = lum + (a[..., :3] - lum) * keep
    out = np.array(paper, np.float32) * (1 - strength) + col * strength
    return np.clip(out, 0, 255).astype(np.uint8)

def build_world(images=True):
    data_file = WORLD_SRC / "world.js"
    if not (WORLD_ART / "world.png").exists() or not data_file.exists():
        return None
    out = DIST / "assets" / "world"; out.mkdir(parents=True, exist_ok=True)
    src = Image.open(WORLD_ART / "world.png").convert("RGB")
    paper = paper_of(src)
    tiles = []
    plan_file = WORLD_ART / "zoom" / "plan.json"
    plan = json.loads(plan_file.read_text()) if plan_file.exists() else {}
    # machines that have been built bring a coloured cut-out of themselves (subjects/<id>/world/colour.png,
    # placed at overlay.rect in map pixels); it is painted over the grey map and every map tile it touches
    overlays = [(Image.open(c["dir"] / "world" / "colour.png").convert("RGBA"), c["overlay"]["rect"])
                for c in SUBJECTS.values() if c.get("dir") and c.get("overlay") and (c["dir"] / "world" / "colour.png").exists()
                and (c["art"] / "plate.png").exists()]   # a machine is coloured in only once it can be opened
    def paint(im, x0, y0, k):
        """Composite every overlay onto im, whose pixel (0, 0) is map point (x0, y0), at k pixels per map pixel."""
        im = im.convert("RGBA")
        for ov, (x, y, w, h) in overlays:
            px, py, pw, ph = round((x - x0) * k), round((y - y0) * k), max(1, round(w * k)), max(1, round(h * k))
            if px > im.width or py > im.height or px + pw < 0 or py + ph < 0: continue
            layer = Image.new("RGBA", im.size, (0, 0, 0, 0)); layer.paste(ov.resize((pw, ph), Image.LANCZOS), (px, py))
            im = Image.alpha_composite(im, layer)
        return im.convert("RGB")
    if images:
        paint(src, 0, 0, 1).save(out / "world.webp", quality=84, method=6)
    for key, t in plan.items():
        f = WORLD_ART / "zoom" / "tiles" / f"{key}.png"
        if not f.exists(): continue
        if images:
            tim = Image.open(f).convert("RGB")
            x, y, w, h = t["rect"]
            feathered(paint(tim, x, y, tim.width / w), .04, .05).save(out / f"{key}.webp", quality=80, method=6)
        tiles.append({"key": key, "rect": t["rect"], "src": f"assets/world/{key}.webp"})
    # sprites: cut from the parts sheet, faded like the rest of the city
    sprites_dir = WORLD_ART / "cut"
    if images and sprites_dir.exists():
        for f in sorted(sprites_dir.glob("*.png")):
            a = np.asarray(Image.open(f).convert("RGBA"))
            Image.fromarray(a).save(out / f"{f.stem}.webp", quality=86, method=6)
    return {"w": src.width, "h": src.height, "src": "assets/world/world.webp", "paper": "rgb(%d,%d,%d)" % paper, "tiles": tiles}

# ---------------------------------------------------------------- html
def subject_js(sid, cfg, meta):
    files = [cfg["src"] / n for n in ("parts.js", "hotspots.js", "zoom.js")]
    body = "\n".join(f.read_text() for f in files if f.exists())
    book_dir = DIST / cfg["book_dir"]
    book = sorted(f"{cfg['book_dir']}{f.name}" for f in book_dir.glob("*.webp")) if book_dir.exists() else []
    info = {"replaces": cfg.get("replaces"), "base": cfg["out"], "title": cfg["title"], "kicker": cfg["kicker"], "whole": cfg["whole"], "hint": cfg["hint"],
            "how": cfg["how"], "paper": "rgb(%d,%d,%d)" % tuple(meta["paper"]), "outline": meta["outline"],
            "TILES": tile_index(cfg["art"]), "bookAssets": book, "credit": cfg.get("credit")}
    if cfg.get("spot"): info["spot"] = cfg["spot"]
    if cfg.get("parent"): info["parent"] = cfg["parent"]        # a space inside another one (skin inside the body)
    return (f"(function (window) {{\n{body}\n}})(window.SUBJECTS[{json.dumps(sid)}] = {{}});\n"
            f"Object.assign(window.SUBJECTS[{json.dumps(sid)}], {json.dumps(info, separators=(',', ':'))});\n")

def build_subject_books():
    """subjects/<id>/build_book.py prepares that subject's book art: build(art/book, assets/<id>/book, helpers)."""
    import importlib.util, types
    helpers = types.SimpleNamespace(paper_of=paper_of, disc_mask=disc_mask, feathered=feathered)
    for sid, c in SUBJECTS.items():
        hook = c.get("dir") and c["dir"] / "build_book.py"
        if not hook or not hook.exists() or not (c["art"] / "book").exists(): continue
        out = DIST / c["book_dir"]; out.mkdir(parents=True, exist_ok=True)
        spec = importlib.util.spec_from_file_location(f"book_{sid}", hook); mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
        mod.build(c["art"] / "book", out, helpers)

def build_html(world, metas, pages=()):
    page = (SRC / "plane.html").read_text()
    subjects = "window.SUBJECTS = {};\n" + "".join(subject_js(sid, cfg, metas[sid]) for sid, cfg in SUBJECTS.items() if sid in metas)   # machines still being made are skipped
    wdata = (WORLD_SRC / "world.js").read_text() if (WORLD_SRC / "world.js").exists() else "window.WORLD_DATA = {};"
    wjs = (f"{wdata}\nwindow.WORLD = Object.assign({json.dumps(world or {}, separators=(',', ':'))}, window.WORLD_DATA);\n"
           "for (const [id, p] of Object.entries(window.WORLD.spots || {})) if (window.SUBJECTS[id] && !window.SUBJECTS[id].spot) window.SUBJECTS[id].spot = p;\n"
           "const built = new Set(Object.values(window.SUBJECTS).map(s => s.replaces).filter(Boolean));\n"
           "window.WORLD.soon = (window.WORLD.soon || []).filter(s => !built.has(s.id) && !window.SUBJECTS[s.id]);\n"
           "for (const id of Object.keys(window.SUBJECTS)) if (!window.SUBJECTS[id].spot) delete window.SUBJECTS[id];\n")
    mechs = (SRC / "mechanisms.js").read_text() + "".join("\n" + (c["dir"] / "mechanisms.js").read_text()
                                                         for c in SUBJECTS.values() if c.get("dir") and (c["dir"] / "mechanisms.js").exists())
    for marker, text in [("/*SUBJECTS*/", subjects), ("/*WORLD*/", wjs), ("/*MECHANISMS*/", mechs),
                         ("/*BOOK*/", (SRC / "book.js").read_text()), ("/*APP*/", (SRC / "app.js").read_text())]:
        page = page.replace(marker, "\n" + text)
    (DIST / "artifact.html").write_text(page)
    head, _, body = page.partition("</style>")
    names = [SUBJECTS[sid]["title"] for sid, *_ in pages]
    desc = ("A picture encyclopedia of machines for small children. Zoom into a pencil map of a little town and open up "
            + " and ".join(n.replace("The ", "the ") for n in names) + ": hand-painted cut-aways, parts to tap and moving How it works pages.")
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "WebSite", "name": "howthings.work", "url": SITE + "/", "description": desc, "inLanguage": "en",
         "creator": {"@type": "Person", "name": "Peter Hraska", "url": "https://virpo.io", "sameAs": ["https://x.com/virpo", "https://github.com/virpo"]}},
        {"@type": "ItemList", "name": "Machines", "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "url": f"{SITE}/{sid}/", "name": SUBJECTS[sid]["title"]} for i, (sid, *_) in enumerate(pages)]}]}
    noscript = ('<noscript><main style="max-width:720px;margin:40px auto;padding:0 20px;font:18px/1.5 Georgia,serif">'
                '<h1>howthings.work</h1><p>' + esc(desc) + '</p><ul>'
                + "".join(f'<li><a href="/{sid}/">{esc(SUBJECTS[sid]["title"])}</a></li>' for sid, *_ in pages)
                + '</ul><p><a href="/contribute.md">Build the next machine</a></p></main></noscript>\n')
    body = body.replace('<div id="stage"', noscript + '<div id="stage"', 1)
    full = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
            f'<meta name="description" content="{esc(desc)}">\n'
            f'<link rel="canonical" href="{SITE}/">\n'
            '<link rel="alternate" type="text/markdown" title="How to add a machine (for AI agents)" href="/contribute.md">\n'
            '<meta name="theme-color" content="#f8f6f1">\n'
            f'<script type="application/ld+json">{json.dumps(ld)}</script>\n'
            '<meta property="og:title" content="howthings.work · how machines work, for kids">\n'
            f'<meta property="og:url" content="{SITE}/">\n'
            '<meta property="og:description" content="Zoom into a pencil town and open up how things work. Anyone can add the next machine.">\n'
            '<meta property="og:image" content="https://howthings.work/assets/brand/og.png">\n'
            '<meta name="twitter:card" content="summary_large_image">\n'
            '<link rel="icon" type="image/png" href="assets/brand/favicon-64.png">\n'
            '<link rel="apple-touch-icon" href="assets/brand/icon-512.png">\n'
            '<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}'
            'body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>\n'
            + head + "</style>\n</head>\n<body>\n" + body + "\n" + analytics_tag() + "</body>\n</html>\n")
    (DIST / "index.html").write_text(full)

SITE = "https://howthings.work"

def analytics_tag():
    """Analytics for the live site only (local builds, previews and forks send nothing).
    analytics.json (not in the repository): {"cloudflare": "<beacon token>", "posthog": "<project key>",
    "posthog_host": "https://eu.i.posthog.com"}; $CF_BEACON_TOKEN and $POSTHOG_KEY also work.
    PostHog runs without cookies or storage, without session recordings and without autocapture:
    the site sends page views per machine and part, time on page, and a few named events (see track() in app.js)."""
    import os
    f = ROOT / "analytics.json"
    cfg = json.loads(f.read_text()) if f.exists() else {}
    cf = os.environ.get("CF_BEACON_TOKEN") or cfg.get("cloudflare")
    ph = os.environ.get("POSTHOG_KEY") or cfg.get("posthog")
    host = cfg.get("posthog_host", "https://eu.i.posthog.com")
    out = ""
    if cf:
        out += ("<script defer src=\"https://static.cloudflareinsights.com/beacon.min.js\" "
                f"data-cf-beacon='{json.dumps({'token': cf, 'spa': False})}'></script>\n")
    if ph:
        out += ("<script>\n(function () {\n"
                "  if (!/(^|\\.)howthings\\.work$/.test(location.hostname) || /[?&]video\\b/.test(location.search)) return;\n"
                "  !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(\".\");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement(\"script\")).type=\"text/javascript\",p.crossOrigin=\"anonymous\",p.async=!0,p.src=s.api_host.replace(\".i.posthog.com\",\"-assets.i.posthog.com\")+\"/static/array.js\",(r=t.getElementsByTagName(\"script\")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a=\"posthog\",u.people=u.people||[],u.toString=function(t){var e=\"posthog\";return\"posthog\"!==a&&(e+=\".\"+a),t||(e+=\" (stub)\"),e},u.people.toString=function(){return u.toString(1)+\".people (stub)\"},o=\"init capture register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset\".split(\" \"),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);\n"
                f"  posthog.init({json.dumps(ph)}, {{ api_host: {json.dumps(host)}, persistence: \"memory\", person_profiles: \"identified_only\",\n"
                "    autocapture: false, capture_pageview: false, capture_pageleave: true, disable_session_recording: true,\n"
                "    capture_heatmaps: false, capture_dead_clicks: false, disable_surveys: true });\n"
                "  window.track = function (event, props) { posthog.capture(event, props || {}); };\n"
                "  posthog.capture(\"$pageview\");\n"
                "})();\n</script>\n")
    return out

def subject_data(cfg):
    """parts, hotspots and zoom data of a subject, evaluated by node (they are plain JS files)."""
    import subprocess
    out = subprocess.run(["node", str(ROOT / "scripts" / "export_spots.mjs"), str(cfg["src"])], capture_output=True, text=True, check=True).stdout
    return json.loads(out)

def esc(t):
    import html
    return html.escape(str(t), quote=True)

def build_meta(world):
    """Pages for people who search and agents who read: one plain page per machine, contribute.md,
    llms.txt, robots.txt and sitemap.xml."""
    from datetime import date
    data = {sid: subject_data(cfg) for sid, cfg in SUBJECTS.items() if (cfg["art"] / "plate.png").exists()}
    wd = subprocess_world()
    built = {c.get("replaces") for c in SUBJECTS.values()} | set(SUBJECTS)
    soon = [x for x in wd.get("soon", []) if x["id"] not in built]
    pages = []
    for sid, d in data.items():
        cfg, P = SUBJECTS[sid], d["plate"]
        parts = {p["id"]: p for p in d["parts"]}
        order = [i for i in d["order"] if i in parts]
        credit = cfg.get("credit") or {}
        desc = f"{cfg['title']}, opened up for small children: {P.get('intro', '')}"[:300]
        items = []
        for pid in order:
            p = parts[pid]
            subs = "".join(f"<li><b>{esc(z['name'])}</b>: {esc(z['lead'])}</li>" for z in (d.get("zoom", {}).get(pid, {}).get("subs", [])))
            items.append(f"<section id=\"{esc(pid)}\"><h2>{esc(p['name'])}</h2><p>{esc(p['lead'])}</p>"
                         f"<ul>{''.join(f'<li>{esc(f)}</li>' for f in p.get('facts', []))}</ul>"
                         + (f"<h3>Inside</h3><ul>{subs}</ul>" if subs else "") + "</section>")
        ld = {"@context": "https://schema.org", "@type": "LearningResource", "name": cfg["title"], "description": desc,
              "url": f"{SITE}/{sid}/", "inLanguage": "en", "educationalLevel": "Preschool", "learningResourceType": "Interactive illustration",
              "audience": {"@type": "EducationalAudience", "educationalRole": "student", "audienceType": "children aged 3 to 8"},
              "image": f"{SITE}/{cfg['out']}plate.webp", "isPartOf": {"@type": "WebSite", "name": "howthings.work", "url": SITE + "/"},
              "creator": {"@type": "Person", "name": credit.get("name", "@virpo"), "url": credit.get("url", "https://x.com/virpo")},
              "hasPart": [{"@type": "CreativeWork", "name": parts[i]["name"], "description": parts[i]["lead"]} for i in order]}
        html_page = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(cfg['title'])}: how it works, for kids · howthings.work</title>
<meta name="description" content="{esc(desc)}">
<link rel="canonical" href="{SITE}/{sid}/">
<meta property="og:title" content="{esc(cfg['title'])} · howthings.work"><meta property="og:description" content="{esc(desc)}">
<meta property="og:image" content="{SITE}/assets/brand/og.png"><meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/png" href="/assets/brand/favicon-64.png">
<script type="application/ld+json">{json.dumps(ld)}</script>
<style>body{{margin:0;background:#f8f6f1;color:#2b2620;font:18px/1.5 Georgia,serif}}main{{max-width:760px;margin:0 auto;padding:32px 20px 64px}}
a{{color:#a23b20}}h1{{font-size:42px;line-height:1.05;margin:.2em 0}}h2{{margin:1.6em 0 .3em}}img{{max-width:100%;height:auto}}
.open{{display:inline-block;margin:12px 0 24px;padding:10px 18px;border-radius:22px;background:#2c5aa0;color:#fff;text-decoration:none;font-weight:600}}</style>
</head><body><main>
<p><a href="/">howthings.work</a> · a picture encyclopedia for small children</p>
<h1>{esc(cfg['title'])}</h1>
<p>{esc(cfg['kicker'])}{(' · by <a href="' + esc(credit['url']) + '">' + esc(credit['name']) + '</a>') if credit.get('url') else ''}</p>
<a class="open" href="/#{esc(sid)}">Open the interactive cut-away</a>
<p><img src="/{cfg['out']}plate.webp" alt="{esc(cfg.get('alt', cfg['title']))}" width="1672" height="941" loading="lazy"></p>
<p>{esc(P.get('intro', ''))}</p>
{''.join(items)}
<p><a class="open" href="/#{esc(sid)}">Explore it</a> · <a href="/contribute.md">Build the next machine</a></p>
</main>{analytics_tag()}</body></html>
"""
        (DIST / sid).mkdir(parents=True, exist_ok=True)
        (DIST / sid / "index.html").write_text(html_page)
        pages.append((sid, cfg, credit, desc))
    # contribute.md: live state + the guide
    guide = (ROOT / "docs" / "ADD-A-MACHINE.md").read_text()
    status = ["## The map today", "", "In colour (taken):"] + [f"- {c['title']} (`{sid}`), by {cr.get('name', '?')}" for sid, c, cr, _ in pages]
    status += ["", "Waiting in grey (free unless an open pull request has it):"] + [f"- {x['name']} (`{x['id']}`)" for x in soon]
    status += ["", "Repository: https://github.com/virpo/howthingswork · Open pull requests: https://github.com/virpo/howthingswork/pulls",
               f"Generated {date.today().isoformat()}.", ""]
    (DIST / "contribute.md").write_text(guide.replace("## 0. Before you start", "\n".join(status) + "\n## 0. Before you start", 1))
    llms = ["# howthings.work", "",
            "> A picture encyclopedia for small children: a pencil map whose coloured machines open into hand-painted cut-away plates, "
            "clickable parts, deep zoom and moving \"How it works\" pages. Anyone can add a machine through their AI agent.", "",
            "## Machines"] + [f"- [{c['title']}]({SITE}/{sid}/): {d[:160]}" for sid, c, cr, d in pages]
    llms += ["", "## Contribute", f"- [How to add a machine (for AI agents)]({SITE}/contribute.md): pick a grey machine, build it in the house style, open a pull request with screenshots",
             "- [Source code](https://github.com/virpo/howthingswork)", "", "## Optional",
             f"- [Interactive site]({SITE}/): the map; it needs JavaScript, so read the machine pages above for the text"]
    (DIST / "llms.txt").write_text("\n".join(llms) + "\n")
    (DIST / "robots.txt").write_text(f"User-agent: *\nAllow: /\n\nSitemap: {SITE}/sitemap.xml\n")
    urls = [SITE + "/"] + [f"{SITE}/{sid}/" for sid, *_ in pages] + [SITE + "/contribute.md", SITE + "/llms.txt"]
    (DIST / "sitemap.xml").write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "".join(f"  <url><loc>{u}</loc><lastmod>{date.today().isoformat()}</lastmod></url>\n" for u in urls) + "</urlset>\n")
    return pages

def subprocess_world():
    import subprocess
    code = "const fs=require('fs');const window={};new Function('window',fs.readFileSync(process.argv[1],'utf8'))(window);console.log(JSON.stringify(window.WORLD_DATA))"
    return json.loads(subprocess.run(["node", "-e", code, str(WORLD_SRC / "world.js")], capture_output=True, text=True, check=True).stdout)

def build_brand():
    out = DIST / "assets" / "brand"; out.mkdir(parents=True, exist_ok=True)
    B = ROOT / "brand"
    if (B / "logo-transparent.png").exists():
        im = Image.open(B / "logo-transparent.png"); im.thumbnail((640, 160), Image.LANCZOS); im.save(out / "logo.webp", quality=90, method=6)
    for n in ("favicon-64.png", "icon-512.png", "og.png"):
        if (B / n).exists(): Image.open(B / n).save(out / n, optimize=True)

def build_site(out_dir=None):
    """<out_dir>/site.zip: index.html and assets only (no artifact.html, no source art).
    Used by the maintainer to publish howthings.work; contributors never need it."""
    import shutil, zipfile
    out_dir = out_dir or ROOT / "deploy" / "howthings"
    site = out_dir / "site"
    shutil.rmtree(site, ignore_errors=True)
    shutil.copytree(DIST / "assets", site / "assets")
    for f in ["index.html", "contribute.md", "llms.txt", "robots.txt", "sitemap.xml"]:
        if (DIST / f).exists(): shutil.copy(DIST / f, site / f)
    for sid in SUBJECTS:
        if (DIST / sid / "index.html").exists(): (site / sid).mkdir(parents=True, exist_ok=True); shutil.copy(DIST / sid / "index.html", site / sid / "index.html")
    headers = ROOT / "deploy" / "netlify-headers.txt"
    if headers.exists(): shutil.copy(headers, site / "_headers")
    with zipfile.ZipFile(out_dir / "site.zip", "w", zipfile.ZIP_DEFLATED) as z:
        for f in sorted(site.rglob("*")):
            if f.is_file(): z.write(f, f.relative_to(site))

if __name__ == "__main__":
    images = "--html-only" not in sys.argv
    metas = {sid: build_subject(sid, cfg, images) for sid, cfg in SUBJECTS.items() if (cfg["art"] / "plate.png").exists()}
    if images:
        import importlib.util
        spec = importlib.util.spec_from_file_location("old", ROOT / "plane_book.py"); old = importlib.util.module_from_spec(spec); spec.loader.exec_module(old)
        old.build_book()                                       # the jumbo jet's book pages
        build_subject_books()
        build_brand()
    world = build_world(images)
    build_html(world, metas, build_meta(world))
    if "--site" in sys.argv:
        build_site()
    print("built", DIST, "subjects:", list(metas), "world:", bool(world))
