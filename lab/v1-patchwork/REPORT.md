# v1 · Patchwork painting: report

Demo: http://localhost:8766/v1-patchwork/ (both chains, every part, flying). Screenshots: `shots/` (desktop and
phone, from `lab/tools/shots.mjs`, no errors) and `shots/edit-test/` (the two edits, before and after).

## 1. The approach in practice

**One painting per space, today's method.** Five of the eight spaces are the live site's own pictures, imported as they are:
the town (`world-2x.webp` + its 16 map tiles + the coloured family and weather overlays), the jumbo jet (plate + its 52
deep-zoom tiles), and the human, skin and cell plates. Three spaces are new, painted with the house plate template
(`docs/prompts/README.md`):

- **pilots**: the flight deck as its own cut-away plate, made as an *edit of a crop of the plane's cockpit tile*, so it
  shares the people, seats and colours of the plate it opens from (`art/prompts/pilots-b.txt`). A second, independent
  generation (`pilots-a`) was also right but bled off the page, so it was rejected (`art/rejected/`).
- **lysosome**: a cut-away plate painted with a crop of the cell's lysosome attached (`lysosome-a.txt`).
- **drive**: the captain's-seat view, with flat magenta windows and no control wheels, painted with the live site's
  cockpit painting as reference (`drive-a.txt`). The windows are keyed out and the live site's `sky-air` painting scrolls
  behind them. The control wheels, thrust levers and flap lever are the live site's own painted cut-outs (`ctl-*.png`),
  moved by code. The gear lever is drawn in code.

Each new space was the first attempt that passed a full-size check, and counts were checked in crops: two pilots side by
side (captain on the left), two control wheels, four thrust levers, six screens, the overhead panel and pedals. The
lysosome has one membrane, pumps, enzymes, a wrapped old mitochondrion, a germ, delivery bubbles arriving and pieces
leaving through doors.

**The region system** (`tools/`):

- `regions/<space>.json` is the source of truth. It holds the size, the paper colour, the base picture, its tiles
  (rect in space units, file, feather), the parts (= clickable outlines, every part is also a region), extra named
  regions, the spot in the parent, and a version and history.
- `tools/region_edit.py <space> <region> <prompt.txt> [--ref img]` crops the region plus a margin at 3:2 from the best
  layer (base or any tile that covers it), enlarges it to about 1536 px and makes one image edit through `gen.sh`. A
  fixed "keep everything else" suffix is added to the prompt. It then aligns the result to the crop with ORB + RANSAC
  similarity, fitted only on pixels *outside* the region, at 1/1, then 1/2 and 1/4 scale (enlarged 1x crops are too soft
  for features at full scale). It blends the result back with a feathered mask limited to the region (+grow) into the
  base **and every tile it touches**. It keeps the old files (`art/src/<space>/v<N>/`), bumps the version, logs to
  `edits/log.jsonl` and rebuilds that space's web assets. Every edit keeps its crop, prompt, raw result, aligned result,
  alpha and before/after in `edits/NN-<space>-<region>/`.
- `--from out.png` re-blends an earlier model result with a different region/grow/feather, with no new call.
  `tools/revert.py <space> <N>` puts any earlier version back (and keeps the current one).
- `tools/build.py` exports `art/web/<space>/` and writes `data.js`: `base.webp` (at most 2x), `ghost.webp` (1x, paper
  made transparent, the same mask method as the live site's `build.py`, drawn during dives), deep-zoom tiles with soft
  edges, and the drive sprites. Only stale files are re-encoded.
- `tools/prepare.py` imports the live art, and `tools/seed_parts.py` holds the outlines. The outlines on the reused
  pictures were mapped from the live hotspots; the rest were traced on a coordinate grid.

**Renderer** (`renderer.js`, ~170 lines):

- It draws the base, then deep-zoom tiles once the screen needs more pixels than the base has. Tiles fade in and are
  only requested once the camera has stopped. The tiles under a child's spot are preloaded, so a dive starts sharp.
- Ghost dives draw `ghost.webp`. The lysosome's ghost is also cut to its own outline (sphere, bubbles, beads), because
  its cytoplasm wash runs to the picture's edge.
- The drive view rotates the sky by roll, moves it with pitch, scrolls it with heading, then draws the cockpit, the two
  linked control wheels (turned ×70° and pulled), the four thrust levers, the flap lever and the gear knob from
  `o.drive`.

**The region system was also the fixing tool**, not just for the edit test:

- The lysosome plate had four tiny arrowheads between the delivery bubbles (house rule: no arrows). One region edit
  removed them.
- The cell's lysosome (the one you dive into) was a closed speckled ball, which did not "show the same thing" as the
  cut-open lysosome plate. One region edit with the plate attached turned it into a tiny cut-open miniature of it, and
  the dive now lands on a matching picture.

**What I would do differently.**

- Generate the drive view from the pilots plate (same people, same panel colours) rather than from the live cockpit
  painting. It is coherent, but it is clearly a different camera.
- Run the deep-zoom tile pass (as `scripts/tiles.py` does) for pilots, human, skin, cell and lysosome. Only the town and
  the plane have tiles, because only those had them already.
- Make the region margin snap to object boundaries (a click-to-segment mask), not hand rectangles. The one seam I got
  came from a region drawn 3 px too tight.

## 2. Numbers

| | |
|---|---|
| Image calls | **9** total: 8 kept, 1 rejected (`pilots-a`, second choice) |
| …new spaces | 4 calls: pilots ×2, lysosome ×1, drive ×1 (404 s) |
| …fixes by region edit | 2 calls: lysosome arrows, cell lysosome miniature (107 s) |
| …edit test | 3 calls: bus stop, captain's cup, and the same cup in the captain's view (188 s) |
| Generation minutes | **11.7** (699 s, sum of `secs` in `genlog.jsonl`) |
| Wall time | **about 56 min**, while the core was still being written (22:11 → 23:07) |
| Asset bytes shipped | **24.5 MB** in 91 webp files. Of these, 13 MB are the plane's 52 deep-zoom tiles and 4.2 MB the town's tiles; base + ghost of all 8 spaces ≈ 7.7 MB. A first visit loads the town (2.4 MB). |
| Code | `renderer.js` 12 KB, `data.js` 56 KB (generated); tools ~600 lines of Python |

Note on cost: five of the eight spaces are reused from the live site, where the owner measured about 47–65 minutes of
generating and checking per space with this method; the 11.7 minutes here are only the new work.

Region-edit reliability: 5 edits with a model call (+3 free re-blends).

- **Alignment: 5/5.** After the multi-scale fix, one edit aligned only at 1/2 scale. Residual shift ≤ 0.6 px, scale
  error ≤ 0.0003.
- **Clean on the first blend: 3/5.**
  - The cell lysosome came back tinted by my per-channel colour match. Colour matching is now opt-in (`--color`); the
    model keeps colours well enough by itself.
  - The bus stop left a sliver of an old figure at the region edge. Fixed with a wider region and a re-blend, no new call.
- **How much the model changed outside the region:** a mean of 4.7–11 grey levels. The mask throws that away; no seams
  or colour shifts are visible at 100% or zoomed.
- **One region edit end to end:** 60–95 s of tool time (≈ 50–75 s model, 5–20 s align/blend/rebuild), and 2–5 minutes
  including looking at it.

## 3. The edit test

### "Five people at the bus stop instead of three"

Before, the stop had the coloured family of three (the person you dive into) plus a grey pencil queue of five and a
pushchair under the shelter. After, it has **five people**: the family of three, unchanged, plus two grey pencil people
(an old man with a stick, a woman with a shopping bag).

- **Wall time:** 5 min 17 s, from starting to a slow-motion check of the dive into the family.
- **Image calls:** 1 (75 s of model time).
- **What was redone:** one region, the queue under the shelter, 45 × 48 map pixels (`regions/city.json` → `regions.queue`).
  The blend went automatically into the base picture and the three tiles it touches: map tiles `w22`, `w32` and the
  family overlay tile. Nothing else was repainted.
- **What broke:** the first blend left a 3-pixel sliver of the old fifth man next to the father's bag, because the region
  edge was too tight. Fixed with `revert.py` + a re-blend from the same result with the edge 3.6 px further right
  (19 s, 0 calls). The model had redrawn the father almost identically, so the slight overlap is invisible.
- **The family, its outline and the dive:** untouched. The dive still lines up (`shots/edit-test/busstop-after-dive.jpg`).
- **Shots:** `busstop-before.jpg`, `busstop-after.jpg`, `busstop-crop-before-after.png`, `busstop-after-dive.jpg`.
- **Before files:** `art/src/city/v1/` (original), `v2/` (the first blend with the sliver), `v3/`.

### "Give the captain a coffee cup"

- **Wall time:** 2 min 18 s for the pilots picture: a white mug in a black cup holder on the ledge left of the
  captain's control wheel.
- **Image calls:** 1 (65 s).
- **What was redone:** one 72 × 69 px region (`regions/pilots.json` → `regions.cup`). Only the base picture was touched
  (pilots has no tiles). Clean on the first blend.
- **The knock-on cost of this approach:** the captain's-seat view (drive) is the child of pilots and must show the same
  thing, so the cup also went onto the captain's side console there: one more region edit, 2 min 1 s, 1 call (48 s).
  Total: **4 min 19 s, 2 calls.**
- **What broke:** nothing. The outlines are unchanged (the cup sits outside the captain's outline, as part of his side
  console), the drive dive is unchanged, and flying is unaffected (the cup is in the painting, not on a moving part).
- **Shots:** `captain-before.jpg`, `captain-after.jpg`, `captain-cup-crop-before-after.png`, `drive-before-picture.jpg`,
  `drive-after-picture.jpg`, `drive-cup-after.jpg`, `drive-cup-crop-before-after.png`, `captain-after-dive.jpg`.
- **Before files:** `art/src/pilots/v1/`, `art/src/drive/v1/`.

Two more region edits that were not part of the test are in `shots/edit-test/extra-*.png`: the arrows removed from the
lysosome, and the cell's lysosome turned into a miniature of its own plate.

## 4. Self-assessment (1–10)

| | | |
|---|---|---|
| Beauty / book feel | **8** | One unified painting per space: this is the live site's look, and the new plates sit next to it without a seam in style. |
| Coherence across levels | **7** | Town → jet, town → family → skin → cell → lysosome land on matching pictures (children painted from parent crops; the cell's lysosome repainted from its plate). Jet → flight deck changes camera height, and the captain's view is a different camera altogether. |
| Sharpness when zooming in | **6** | The town and the jet are sharp all the way (live tiles); the other six spaces are single 1.5 MP pictures and go soft at 3x. |
| Seamless dives | **7** | 5 of 7 dives read as one continuous zoom. Plane → pilots and pilots → drive are cross-fades between viewpoints (delayed for drive, so you first fly into the captain's panel). |
| Ease of making every part | **6** | Every part is in the picture from the start, but outlines are hand-traced and a wrong part means a region edit. New spaces were cheap here only because the first attempts were right. |
| Ease of edits | **8** | One call and about two minutes per change, tiles updated automatically, old versions kept, revert in one command. The cost is the consistency cascade (the cup had to be painted twice) and an occasional seam that needs a re-blend. |
| Cost to grow the world (a new machine) | **6** | A plate is ~3 calls; colouring it into the map is one region edit; outlines are traced by hand; jet-level sharpness needs ~50 tile calls. |
| Experience for a child | **8** | Rich, warm, detailed pictures to pore over, everything tappable, a cockpit you really fly. The human chain blurs if you zoom hard. |

## 5. Known problems, and what production would need

- **No deep-zoom tiles below the town and the jet.** Production needs the `scripts/tiles.py` pass (one repaint per tile)
  for pilots, human, skin, cell and lysosome. The region tool already writes edits into every tile a region touches, so
  tiles and edits coexist.
- **Repaints on 1x pictures are enlarged 5–8x for the model** and come back crisper than their surroundings. You see it
  only at full zoom, but production should edit the sharpest layer (tiles) or repaint tiles after the edit.
- **Consistency is manual.** Changing a parent's drawing of a child (or the child) means also editing the other.
  Production wants a "this region is the drawing of space X" link that flags the other side for an edit.
- **Region outlines are polygons drawn by hand.** A segment-anything-style mask from a click would make regions exact
  and remove the sliver class of seam.
- **Drive view:**
  - The wheel column is a code-drawn gradient bar under the painted wheel.
  - The flap slot is drawn in code.
  - The sky has no ground, because the painting is above the clouds; descending does not change the view.
- **The cell shows three lysosomes; only the one you dive into is cut open.** The other two stay closed balls.
- **Server:** the shared server on 8766 died twice during my run (another builder was restarting it). I restarted it and
  ran my own checks on a private server (`LAB_URL=http://localhost:8771/`).

### Requests for the core

1. **The default dive's full-page phase shows a rectangle.** It fills the screen with the child's paper at alpha g2 and
   then paints the child at alpha g2. Any child whose own picture has paper around the subject therefore shows its
   picture rectangle while 0 < g2 < 1.
   - My workaround: draw a transparent-paper version (`page`/`ghost`) whenever `o.alpha < 1` and `!o.ghost`.
   - Suggested fix: paint the child at full alpha into an offscreen layer and composite that at g2, or say in
     `API.md` that renderers must not paint their own paper when `o.alpha < 1`.
2. **Expose "a flight is in progress"** (`o.flying`) so renderers can hold back expensive loads without guessing from
   camera changes.

## Files

    index.html  renderer.js  data.js (generated)  REPORT.md  APPROACH.md  genlog.jsonl
    regions/<space>.json        source of truth: picture, tiles, parts, regions, spot, version history
    tools/prepare.py            import the live art + new plates   tools/seed_parts.py  outlines and spots
    tools/region_edit.py        repaint a region in place          tools/revert.py      back to any version
    tools/build.py              web assets + data.js               tools/look.mjs, dive.mjs  screenshots / slow-motion dives
    art/src/<space>/            working pictures (+ v<N>/ kept versions)   art/web/  shipped webp
    art/prompts/                every prompt (edits/ for region edits)     art/rejected/  pilots-a + why
    edits/NN-<space>-<region>/  every region edit: crop, prompt, result, aligned, alpha, before/after; edits/log.jsonl
    shots/                      shots.mjs screenshots; shots/edit-test/ before/after of both edits
