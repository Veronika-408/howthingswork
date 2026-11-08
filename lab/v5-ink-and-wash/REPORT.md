# v5 · Ink and wash: report

Demo: http://localhost:8766/v5-ink-and-wash/ (serve `lab/`). Every space is a pen-and-ink drawing traced into vector paths (potrace) and drawn with `Path2D`. It sits over a separate soft watercolour wash picture, on paper grain made in code. Zooming into the jumbo jet's engine fades in a second, much finer line drawing (the deep-zoom level).

## 1. The approach in practice

1. **Line art** (`gen`): pure black ink on white, shading by hatching only. One prompt per space, with a shared style block (`art/prompts/_style-lines.txt`).
   - All seven first attempts were usable, with the counts right: the 747's 4 engines and hump, two pilots side by side with the captain on the left, four thrust levers, six screens; the skin layers; the cell's organelles; a single-membrane lysosome with pumps, enzymes, a wrapped mitochondrion, a germ, delivery bubbles and doors.

2. **Wash** (`edit` of the line art): "colour it with loose transparent watercolour, keep every line exactly".
   - The model keeps the lines to within 0.25–0.75 px. `tools/wash.py` registers the painting, masks the ink (the line art's lines plus anything the model darkened), fills the holes from the surrounding colour and gives it the subject's silhouette as alpha.
   - I also tried the brief's other option, "paint only the washes, no lines". The model still painted soft grey outlines, so it gained nothing (`art/rejected/plane-paint-b.png`).
   - A wash ships as a WebP of about 60 KB. It is soft by nature, so it needs no resolution.

3. **Vectorise** (`tools/vectorize.py`): supersample 2×, threshold, trace with potrace in 128-unit tiles, and pack into a small binary format. That is about 2.4× smaller than SVG path text. Hatching survives completely. Each space is 190–720 KB.

4. **Draw** (`renderer.js`): paper, then the wash, then paper grain (multiply), then the lines.
   - The lines go through a raster tile pyramid built lazily within a 9 ms budget per frame. A coarser level stands in until the sharp tile is ready, and old tiles are freed.
   - Filling all the paths directly cost 15–40 ms a frame; through the pyramid a frame takes 7–10 ms at any zoom.

5. **Children drawn inside their parents** (the key to coherent dives):
   - The child's line art is pasted into the parent at the exact dive scale (`tools/guide.py`). The model then redraws that region in place, and it is pasted back with a feathered seam (`tools/region.py`).
   - The dive axis therefore comes from the paste itself, corrected by the measured drift of the redraw (0.5–3 px). This was used for city → plane, city → family and cell → lysosome.
   - Skin → cell went the other way: the skin cell was redrawn from the cell drawing. Human → skin redrew the skin from an enlarged crop of the woman's skin block.
   - First tries without the paste gave faithful miniatures with the wrong proportions, which could not line up (`art/rejected/`).

6. **Deep zoom:** the engine region was enlarged 5× and redrawn "with more detail, same outlines", then vectorised into the plane's coordinates. It cross-fades in between 2.6× and 4.2× zoom; the wash stays the same.

7. **Drive (fly the plane):**
   - The captain's-seat view is an edit of the pilots picture.
   - One more edit kept only the control wheel and the four thrust levers; code turns and slides them.
   - The world outside (fields, sky, ink-outlined clouds) is painted through a window mask made from the line art.

8. **Dives:** a child's lines arrive first and its wash after. The first space of a visit draws its lines on with a quick reveal.

**What I would do differently:**
- Use the child-pasted-in-the-parent step from the start (it would have saved 2 calls).
- Give moving things their own layers from the start.
- Set the ink threshold per picture.
- Build the region-edit tools first: every change after the first draft was a region edit.

## 2. Numbers

| | |
|---|---|
| Image calls | **30** (demo 26: 7 gen + 19 edit, 22 kept, 4 rejected; edit test 4) |
| Generation minutes | **52.5** (demo 45.5, edit test 7.0) |
| Wall time | about 70 min |
| Shipped | **3.75 MB**: lines 3.15 MB (2.06 MB gzipped), washes 0.56 MB, code and data 41 KB |
| Per space | plane 256 KB lines + 70 KB wash; the deep-zoom engine 249 KB; drive 268 KB + 53 KB |
| Frame time | 7–10 ms at every zoom; drive 60 fps |
| Sharpness at 10× | the lines are as sharp as at 1×; the wash is soft by design |

## 3. The edit test

Each edit was done the way this approach wants: redraw the lines of one region, colour that region's wash with the old wash attached as the colour reference, paste both back, rebuild.

**Five people at the bus stop.** 8 minutes (22:04:14 → 22:12:17 UTC), 2 calls (135 s + 125 s).
- One 520×300 region of the city was redrawn: an old woman with a stick and a teenage girl now queue to the left of the shelter.
- The family was protected by pasting back only the area to their left. 224 pixels changed inside their rectangle, all on the seam.
- The dive axis is unchanged and the dive still lands on the family (`shots/dive-human.jpg`).
- The `people` outline was widened by hand to include the newcomers.
- Screenshots: `shots/edit1-before-*.png`, `shots/edit1-after-*.png`.

**A coffee cup for the captain.** 11.5 minutes (22:04:25 → 22:15:49), 2 calls (87 s + 75 s).
- One 420×310 region of the flight deck was redrawn; the change stays inside a 75×100 box around the cup.
- The "fly the plane" view needed the cup too. `tools/propagate.py` copied its lines and wash across with no image call, and cut it out of the window mask.
- The first copy let the sill line run through the cup; fixing that took 3.5 minutes.
- The outlines and dives were untouched.
- Screenshots: `shots/edit2-before-*.png`, `shots/edit2-after-*.png`, `shots/edit2-after-drive.png`.

## 4. Self-assessment

- **Beauty / book feel: 8.** A real line-and-wash look, with dark confident ink, airy granulated colour and paper grain. The ink is heavier than a real technical pen in places.
- **Coherence across levels: 8.** Every child is drawn inside its parent, down to the lysosome in the cell coloured from the lysosome's own wash.
- **Sharpness when zooming in: 9.** The lines are sharp at any zoom, and the engine's second line level makes 12× worth it. Elsewhere zooming shows the same lines bigger, with no new detail.
- **How seamless the dives are: 8.** All seven line up to a few pixels. City → plane wobbles slightly during the cross-fade.
- **How easy it was to make every part: 8.** Line art is what image models make most reliably. Outlines were traced by eye, the slowest part.
- **How easy edits are: 8.** One region, two calls, about 8 minutes, nothing else touched. Copying a change into a related view costs no call.
- **Cost to grow the world: 7.** About 4 calls and 10 generation minutes per space. The cost is shipped size: 200–700 KB of paths per space.
- **The experience for a child: 8.** Sharp, detailed pictures to explore, and the flying is smooth. The wash is lighter than the live site's paintings.

## 5. Known problems, and what production would need

- **Path size:** dense pictures need simplified path sets for far-out views, fetched in more detail on demand, plus server compression for the `.bin` files.
- **Ink weight:** a thinner-pen prompt or a per-picture threshold would give a finer line.
- **Region redraws can change the hatching slightly;** a seam is visible at 6× zoom if you look for it.
- **Deep zoom:** generate a finer line level per part automatically. It would be cheap, since it is lines only.
- **Outlines:** detect them automatically from the closed shapes in the line art instead of tracing by hand.
- **Rasterising:** move tile rasterising to a worker for slow phones.
- **Core:** nothing blocking. After the core update I only had to cache the paper-grain pattern per drawing context.

## Files

- `tools/parts.py`: all outlines and dive axes, written to `tools/spaces.json`.
- `tools/build.py`: builds the line files, washes and `data.js`.
- `tools/vectorize.py`, `tools/wash.py`: the two steps of the pipeline.
- `tools/region.py`, `tools/guide.py`, `tools/propagate.py`: region edits, pasting a child into its parent, copying a change to a related view.
- `tools/flatwash.py`, `tools/grid.py`, `tools/look.mjs`, `tools/dive.mjs`, `tools/queue.sh`, `tools/stats.py`: helpers and screenshot tools.
- Prompts in `art/prompts/`, sources in `art/src/`, rejected images in `art/rejected/` (each with its reason), the edit test's "before" files in `art/before/`.
