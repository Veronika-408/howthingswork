# v4 · Encyclopedia page: report

Demo: http://localhost:8766/v4-encyclopedia-page/ (`?edit=before` shows the pages as they were before the edit test).

## 1. The approach in practice
Every space is a white book page (1600 × 1200 units), laid out by code in `data.js`. Nothing has a painted background.
Each subject was painted alone on flat magenta (or green, for the pink and violet biology subjects), cut out by
`tools/cut.py`, and placed on the paper with a scale. The code draws soft shadows, round or boxed magnifier insets
with their "cone" back to the subject, leader-line labels, letter-spaced headings, scale bars, a running head and
page numbers. Labels use the core's serif and change with the age slider.

- **The town** is a page of separate landmarks laid out like a fold-out picture map: jet, control tower, terminal,
  church, houses, trees, bus shelter and family as cut-outs, plus a soft watercolour patch of river and bridge.
- **Dives** are exact by construction. A child's main picture is *the same cut-out* as its drawing on the parent page,
  either in place (the jet) or inside an inset (flight deck, skin, cell, lysosome). So `spot.axis` and `plateAxis`
  are just that picture's corners on both pages. Outlines are written in each cut-out's own pixels, so moving a
  subject moves its outlines and its dive with it.
- **City → person.** The see-through woman was made by *editing an enlarged crop of the family picture*, so she
  has exactly the woman's pose, outline, hair and boots. The dive fades the x-ray in over the woman at the stop.
- **Flying** ("How a pilot flies"): a rounded window with the captain's view. The window frame has its panes keyed
  out; a sky painting behind it rolls, pitches and scrolls with heading. The attitude screen is drawn in code;
  the yoke turns and slides; the thrust levers slide. Two small live diagrams sit beside it: a 747 from behind
  that banks, and one from the side that pitches, lowers its wheels and puts out flaps. On the flight-deck page
  the same window is a small "You fly!" inset, and that is what you dive into.
- **Tools:** `tools/build.py` makes every cut-out from its source in one command, packs small stickers and every
  shadow into one atlas, and writes `assets.js` (sizes, shadows, outlines). Also `cut.py`, `xray_fix.py`,
  `outline.py`, `grid.py`, `look.mjs`, `dive.mjs`, `editshots.mjs`.

**What I would do differently**
- Paint see-through things on white, not magenta. Keying them against magenta needed a fix per picture.
- Give every town landmark one agreed scale (a scale figure in each prompt).
- Make a phone layout per page: a portrait crop, with labels in a column below.

## 2. Numbers
- **Image calls:** 17 (15 for the demo, 2 for the edit test), all succeeded.
- **Kept / rejected:** 16 kept, 1 rejected. `art/rejected/riverbridge-a.png` was a low view with a big sky that
  read as a framed painting, not part of the map.
- **Generation:** 22.6 min (1,357 s in `genlog.jsonl`), about 80 s per call.
- **Wall time:** about 60 min (22:08 → 23:05), including the edit test, checks and report.
- **Calls per page:** one main picture each. The town took 5 (jet, sheet of 7 landmarks, river and bridge, shelter,
  family). The flight deck took 1 more (pedals inset; the captain's-view window is shared with the flying page).
  Flying took 3 (window frame, sky, parts sheet with yoke, levers and two 747 views). The person was 1 edit call.
- **Shipped:** 5.0 MB of WebP in 14 files (13 subjects, plus 1 atlas holding 12 stickers and 5 shadows), and
  77 KB of JS.
- **Kept alongside:** generated sources in `art/src/`, transparent masters in `art/cut/`, every prompt in
  `art/prompts/`.

## 3. The edit test
Both edits were done the way this approach intends: one new cut-out, placed by code. Nothing existing was
regenerated. Times are wall clock from writing the prompt to the finished "after" screenshots (`edits/times.txt`).

**Edit 1: five people at the bus stop instead of three.**
- **Time:** 3 min 16 s (22:52:46 → 22:56:02). **Image calls:** 1 (59 s).
- **Redone:** nothing. One new picture of two people (an elderly woman with a stick and basket, a teenage girl
  with a book), generated with the family picture attached as a style reference and cut by the same build
  script. In `data.js`: one placed element with its feet on the family's line, added to the town page, and its
  outline added to the "people" hotspot. 3 lines.
- **Broke:** nothing. The family, shelter and x-ray woman are untouched, so the dive still lands exactly on the
  woman.
- **Screenshots:** `shots/edit1-compare-busstop.jpg`, `shots/edit1-compare-dive.jpg` (mid-dive, before | after),
  `shots/edit1-compare-town.jpg`, and `shots/edit-before-*` / `shots/edit-after1-*`.

**Edit 2: give the captain a coffee cup.**
- **Time:** 2 min 14 s (22:56:31 → 22:58:45). **Image calls:** 1 (57 s).
- **Redone:** nothing. One new cup-and-saucer sticker, pinned in flight-deck picture coordinates on the side
  console at the captain's left elbow. Because it belongs to the flight-deck picture, it shows on the flight-deck
  page, in the jet page's flight-deck inset, and during the dive between them, so the parent still matches the
  child. That took 10 lines in `data.js` and a small reusable `drawSticker` in the renderer (a sticker with its
  own contact shadow). The captain's hotspot now includes the cup.
- **Broke:** nothing. The cup is not in the forward view on the flying page; it sits at his elbow, out of sight.
- **Screenshots:** `shots/edit2-compare-captain.jpg`, `shots/edit2-compare-inset.jpg`, and `shots/edit-after2-*`.

**Before state:** live at `?edit=before`, and as files in `edits/before/`. `edits/after/` holds the state right
after the edits.

## 4. Self-assessment (1–10)
- **Beauty / book feel: 8.** It really looks like a visual dictionary (white pages, crisp type, insets, scale bars).
  The town is the weakest page.
- **Coherence across levels: 8.** Every child is literally the same cut-out as in its parent, and every prompt
  shares one style block. The town mixes scales.
- **Sharpness when zooming in: 5.** Each picture is about 1.5 megapixels: barely sharp at full page on a 2× screen,
  soft at 3× zoom. Labels and diagrams stay crisp because code draws them.
- **Seamless dives: 8.** Alignment is exact, and the words and insets make way. But you dive from one sticker into
  the next, not through a world.
- **Ease of making every part: 9.** One call per subject, 1 rejection in 17. A part is just an outline over a
  cut-out; labels, insets and diagrams cost no calls.
- **Ease of edits: 9.** Both edits took 2–3 minutes and 1 call, with no repainting and nothing broken. Moving or
  removing things needs no calls at all.
- **Cost to grow the world: 8.** A new machine is about 1–3 calls plus about 40 lines of layout per page. The town
  grows by placing one more sticker.
- **Experience for a child: 6.** Clear, friendly and readable, and the flying page is fun. But pages without scenes
  are less magical: no ground, weather or bustle. It feels more like a reference book than a world to wander in.

## 5. Known problems, and what production would need
- **Town:** floating landmarks at mismatched scales. Needs a scale rule in every prompt, maybe a soft ground patch
  per district.
- **Phone:** the 4:3 pages are small. At full page the labels are hidden (the reading panel lists the parts); they
  appear on zoom or focus. Needs a layout per device, which needs a core hook.
- **Sharpness:** capped by the ~1.5-megapixel images. More close-up insets are the natural, cheap fix in this
  approach.
- **Keying:** see-through subjects (raincoat film, shelter glass) came out tinted by the key colour and needed fixes
  (`tools/xray_fix.py`, `glass()` in `build.py`). Curly hair keeps a faint magenta edge at full zoom (invisible at
  the town page's scale).
- **Layout by hand:** anchors, insets and outlines are hand-placed numbers. Production wants a small layout tool, or
  outlines from segmentation masks.
- **Requests for the core:**
  - an `o.diving` flag in the draw options. I read `body.entering` to fade a page's words while diving through it.
  - a per-device frame (for example `framePhone`), for portrait crops on phones.
  - a way to draw screen-space text above the outline layer.
- **Core bugs:** none. The shared server on :8766 reset a connection once under load and was down for about a minute;
  the atlas halved my requests. `shots.mjs` prints no errors.
