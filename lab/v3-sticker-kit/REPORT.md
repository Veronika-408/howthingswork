# v3 · Sticker kit: report

Demo: http://localhost:8766/v3-sticker-kit/ (`?grid=50` draws a coordinate grid for placing stickers by hand).
Both chains work end to end. Every part of every space is drawn, outlined and clickable (54 parts in 8 spaces).
The plane flies. `node lab/tools/shots.mjs v3-sticker-kit` reports no errors at desktop or phone width.

## 1. The approach in practice

**What I built.** 20 sprite sheets on magenta from 21 image calls. One of the calls was an extra props sheet
for the edit test.

`tools/stickers.py` turns each sheet into stickers:
- keys out the magenta by un-mixing the fringe (the tram method, with a gentler ramp);
- cleans the purple fringe by pulling in the nearest clean paint, and fills small holes;
- splits the sheet into connected components and names them in reading order from `art/sheets.json`;
- trims each one, adds a white die-cut margin, and traces an outline polygon from its alpha.

The result is `library/`: 107 stickers, with `index.json` (name, file, size, anchor, tags, sheet, border,
outline).

The other three pieces:
- `scenes.js`: every space as a list of placements `{ s, x, y, k, flip, rot, z, anim, path }`.
- `data.js`: turns the placements into `LAB_DATA`. Outlines are the traced alpha mapped through each
  placement; dive alignments are worked out from the placements.
- `renderer.js`: draws the list sorted by depth, with a mip chain per sticker and a drop shadow made at run
  time from the sticker's alpha.

**Dives that line up by construction:**
- **Groups.** The jet with its ground crew (`apron`) and the bus-stop family (`busstop`) are each one group.
  The town places the group small and the child space places it big, swapping one sticker:
  `plane-ext` → `plane-cutaway`, and `woman-boy` → `woman-boy-xray`. The spot axis comes from the two
  placements.
- **Swaps.** The swapped stickers are image edits of the original sheets. `tools/register.py` lines each edited
  sheet back up with its original (IoU 0.989 and 0.990). The swapped sticker inherits the original's anchor,
  so it sits exactly where the outside view was.
- **Insets.** The skin in the person's magnifier, the cell in the skin's magnifier, and the three lysosomes in
  the cell are the child space itself, drawn small.

Only two dives are matched by points: plane → flight deck (the deck is its own sticker) and flight deck → fly
(the yoke).

**Grounds**
- The town: one painted iso slab (river, runway, streets, park, cut earth at the edges).
- The apron and the paving under the family: code-drawn iso slabs.
- Flying: fields, river, road and library clouds drawn in 3D by code behind the cockpit-frame sticker, whose
  windows were painted magenta and keyed out.

**Motion, all code**
- In the town: boats on the river, cars on the main street, clouds drifting over the map.
- In the cell and the lysosome: jiggling enzymes, delivery bubbles drifting in, building blocks streaming out
  of the doors.
- In the cockpit: the yoke turns (one sticker split into a fixed column and a turning wheel), the thrust
  levers slide, and the screens are drawn live (artificial horizon, compass, engines).

**What I would do differently**
- Put a reference object in every sheet, so all stickers share one scale. I set the sizes by eye, and the
  people are a little large for the shelter.
- Pack each space's stickers into one atlas. About 100 requests made the shared Python server drop a connection
  once; the renderer retried, but Chrome logged the failure.
- Paint the flight deck and the skin block as kits from the start. Each is now one big sticker with
  hand-drawn regions.
- Accept that the town reads somewhat as a collage. The white margins and shadows make it a deliberate
  sticker-album look, but the light and the paint are less unified than in one painting. The cell, the
  lysosome and the person read as one picture.

## 2. Numbers

- **Image calls:** 21 (19 new, 2 edits), 21 ok, 0 rejected. All kept: 20 sheets in the demo, 1 props sheet
  for the edit test. `art/rejected/` is empty.
- **Fixes, all in keying code:**
  - the lysosome's clear bubbles needed a "film" treatment;
  - two touching bubbles needed one manual cut;
  - the bridge cables' fringe had to be made grey.
- **Generation:** 26.5 minutes (sum of `secs` in genlog; the slowest call took 187 s).
- **Wall time:** about 60 minutes to the finished demo with both edits (22:17 to 23:15), then about 15 minutes
  of checks.
- **Stickers:**
  - 107 in the library, 92 used, 147 placements;
  - 32 placed more than once, 9 in two or more spaces;
  - 15 spare (six townspeople, seven props, a spare man, a spare small bubble).
- **Placements per space:** city 83 · lysosome 23 · plane 16 · cell 14 · drive 6 · pilots 2 (+1 cup) ·
  human 2 · skin 1 (plus insets).
- **Shipped:** 5.6 MB of sticker WebP in 92 files (`weigh.mjs`: 5.9 MB, 101 requests). Code and data 212 KB.
- **Sources:**
  - `art/prompts/*.txt` (one prompt per sheet);
  - `art/sheets/*.png` (originals and aligned edits);
  - `art/sheets.json` (how each sheet is split and named);
  - `art/regions-hand.json` (hand-drawn regions).

## 3. The edit test

**Edit 1, five people at the bus stop:** 78 s, 0 image calls.
- Two library stickers (`old-man`, `grandma`) placed with two lines in `scenes.js` and added to the `people`
  part. Their outlines are traced from the alpha.
- Nothing broke. The family group is unchanged, so the dive still lands exactly.
- Before: `shots/edit1-before-busstop.jpg`, `shots/edit1-before-city.jpg`, `edits/scenes-before-edit1.js`.
- After: `shots/edit1-after-busstop.jpg`, `shots/edit1-after-dive-sheet.jpg`.

**Edit 2, a coffee cup for the captain:** 182 s, 1 image call (55 s).
- There was no cup in the library, so I made a props sheet of 8 objects; the other 7 are now library stock.
- One placement puts the cup on the pedestal by the captain's right hand, added to the `captain` part.
- The same sticker sits in the view from the captain's seat beside the thrust levers, so the two spaces agree.
- Nothing was repainted and the dives are unchanged.
- Limit: a cup held in his hand would need an image edit of the flight-deck sticker.
- Before: `shots/edit2-before-captain.jpg`, `shots/edit2-before-drive.jpg`, `edits/scenes-before-edit2.js`.
- After: `shots/edit2-after-captain.jpg`, `shots/edit2-after-drive.jpg`.

## 4. Self-assessment

| | Score | Why |
|---|---|---|
| Beauty / book feel | 7 | The stickers are fine Biesty-style miniatures with charming margins, but the town is visibly assembled. |
| Coherence across levels | 8 | The same stickers recur at every level; only the flight deck is a separate painting. |
| Sharpness when zooming | 7 | Each sticker draws from its own full-resolution file; the wide town ground softens at full zoom. |
| Seamless dives | 8 | Groups and insets are exact; jet → flight deck and flight deck → fly are matched by points. |
| Easy to make every part | 8 | Outlines come free from the alpha; the two big stickers still needed hand-drawn regions. |
| Easy edits | 9 | 78 s and 0 calls; 3 min and 1 call; no re-tracing. |
| Cost to grow the world | 8 | Ground, houses, trees, people, vehicles and crew are reusable; a new machine is about 2–3 sheets plus JSON. |
| Experience for a child | 7 | Lively, with lots to find and a plane that flies; the stickers are small on a phone and the town is busy at first glance. |

## 5. Known problems, and what production would need

- A metres-per-pixel field in the library index, so scale comes from real sizes.
- Texture atlases per space.
- A colour-grading pass per sheet, so the map reads as one painting.
- Kits instead of single big stickers for the flight deck and the skin block.
- The jet's cockpit made from the flight-deck stickers, as an inset.
- Core request: a concurrency limit with retries in `lab.img`. I loaded the stickers myself (`assets: []`,
  with `ready()` waiting for them) because the core's `assets` list loads every file at once.
