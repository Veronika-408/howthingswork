# v1 · Patchwork painting (today's method, plus a region system)

## The bet
Keep what howthings.work does today, one coherent hand-painted picture per space, which is the most unified
and most "painted" look, and fix its weak spot, editing, with tooling: every object in a picture is a
**region** (a mask), and any region can be repainted in place with one command, so changing the bus stop
or adding a cup never means repainting the whole picture.

## How to build it
- **Reuse today's art where it exists.** That is this method's real output, and the owner knows its cost: the
  weather took 47 minutes, the body 65.
  - city: `dist/assets/world/world-2x.webp` (3344×1880, the map with the plane, the family and the weather coloured
    in) plus its tiles `dist/assets/world/w*.webp` (rects in `world/art/zoom/plan.json`, map pixels of 1672×940).
  - plane: `art/plate.png` (1672×941) and its deep-zoom tiles (`art/zoom/tiles/`, plan in `art/zoom/plan.json`).
  - human, skin, cell: `subjects/{body,skin,cell}/art/plate.png` and their tiles if any.
  - Existing hotspot outlines (`src/hotspots.js`, `subjects/*/src/hotspots.js`) and spots/axes (`subjects/*/subject.json`)
    are a head start; the lab's part ids differ, so map or retrace.
  - The cockpit "How it works" art (`art/book/cockpit-base-*.png`, `art/book/sky-air.png`, `art/book/cut/ctl-*.png`)
    may serve the drive view.
- **New spaces, painted the same way** (plate template in `docs/prompts/README.md`, three variants of each and pick
  the technically right one): **pilots** (the flight deck cut away from behind and slightly above: both pilots
  side by side, control wheels, thrust levers, screens, overhead panel, windscreen, pedals; paint it from a crop
  of the plane plate's cockpit as reference, so the dive matches), **drive** (the captain's view: the cockpit
  interior with the windscreen open, plus a separate wide sky-and-ground painting for the moving view outside),
  **lysosome** (cut-away; paint it from a crop of the cell plate's lysosome so they match).
- **The region system** (your own code in this folder): `regions.json` per space lists named regions (polygon +
  margin). `tools/region_edit.py <space> <region> <prompt.txt>`: crop the region with a margin, run an image edit
  on the crop ("change only …, keep everything else"), align the result back (ORB + RANSAC similarity, like
  `scripts/tiles.py` and `tools/colour_in.py` in the repo), blend it in with a feathered mask limited to the region,
  write a new version of the space picture (keep the old one), and rebuild tiles that touch it. Use it for the edit
  test and anything you need to fix.
- **Renderer:** draw the space picture, plus deep-zoom tiles fading in with zoom if you have them. Ghost dives:
  draw the child through a soft mask of its painted area (paper made transparent), as the live site does.
- Hotspots: trace polys for every lab part.

## Measure especially
How long the new spaces take, how often a region edit lands cleanly (seams, colour shifts, misalignment), and how
long one region edit takes end to end.
