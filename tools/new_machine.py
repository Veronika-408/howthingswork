#!/usr/bin/env python3
"""Start a new machine: python3 tools/new_machine.py <id> "<The Title>" [replaces]

Creates subjects/<id>/ with subject.json, empty src/ files and the art/ folders the pipeline expects.
<replaces> is the id of the grey machine on the map it turns into colour (see world/src/world.js "soon")."""
import json, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
if len(sys.argv) < 3: sys.exit(__doc__)
sid, title = sys.argv[1], sys.argv[2]
replaces = sys.argv[3] if len(sys.argv) > 3 else sid
d = ROOT / "subjects" / sid
if d.exists(): sys.exit(f"{d} already exists")
for sub in ("art/prompts", "art/detail", "art/zoom", "art/book/prompts", "src", "world", "screenshots"):
    (d / sub).mkdir(parents=True, exist_ok=True)
word = title.replace("The ", "").lower()
(d / "subject.json").write_text(json.dumps({
    "title": title,
    "kicker": f"Inside a {word}",
    "whole": f"Whole {word}",
    "hint": f"Pick any part of the {word} to look closer.",
    "alt": f"Cut-away painting of a {word}.",
    "credit": {"name": "@your-handle", "url": "https://x.com/your-handle"},
    "describe": [f"a {word} (describe colour, model and where it stands, as in the plate)", f"a {word}"],
    "plate_w": 1672,
    "open_sky": False,
    "replaces": replaces,
    "how": {"map": {}, "thumb": {}, "part": {}},
    "spot": {"polys": [], "plus": [0, 0], "axis": [[0, 0], [1, 0]], "plateAxis": [[0, 0], [1, 0]]},
    "overlay": {"rect": [0, 0, 1, 1]}
}, indent=2) + "\n")
(d / "src/parts.js").write_text(f"// Exhibit content for {title}, in the order of the tour. See subjects/tram/src/parts.js.\nwindow.PARTS = [\n];\n")
(d / "src/hotspots.js").write_text("// Plate geometry in pixels of art/plate.png. See subjects/tram/src/hotspots.js.\n"
    "window.PLATE = { w: 1672, h: 941, art: { x: 0, y: 0, w: 1672, h: 941 }, introBox: { x: 24, y: 40, w: 380 }, intro: \"\" };\n"
    "window.HOTSPOTS = {\n};\nwindow.ORDER = [];\n")
(d / "src/zoom.js").write_text("// Level 3: parts inside a part, outlines in pixels of that part's detail tile. See subjects/tram/src/zoom.js.\nwindow.ZOOM = {\n};\n")
print(f"created {d.relative_to(ROOT)}; next: paint the plate (docs/ADD-A-MACHINE.md, step 2)")
