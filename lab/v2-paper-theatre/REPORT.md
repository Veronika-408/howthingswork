# v2 · Paper theatre: report

Demo: http://localhost:8766/v2-paper-theatre/ (all eight spaces, both chains, flying, ages 3–11, desktop and phone).

## 1. The approach in practice

**What a space is.** A little tunnel book: 4–6 painted layers stacked back to front, each one a cut piece of paper.
`tools/build.py` keys every layer off its magenta ground, gives it an irregular paper margin (3 px, a wobbling
distance threshold), a darker cut edge, paper grain and a soft drop shadow baked into its alpha, and crops it to
a `.webp`. Backdrops become torn sheets. A hand-cut paper proscenium (code: an even-odd path with a wobbly opening,
plus its baked shadow) sits in front of every space. The whole recipe for a space is a few lines in
`tools/spec.py`: which layers, how deep (`d`), where children sit, and the part outlines. `data.js` is generated.

| Space | Layers (back → front) | Image calls |
|---|---|---|
| city | sky + far hills · airport apron · *the jet (child)* · far shore · river + bridge · near town · foreground with the bus stop · *the family (child)* · frame | 6 |
| plane | apron + terminal · far wing · fuselage · *flight-deck magnifier (child)* · near wing · ground crew · frame | 6 |
| pilots | the view outside · flight-deck shell · the cup · wheels + thrust levers · *(drive slot)* · the two pilots · frame | 5 (+1 edit) |
| drive | sky panorama + clouds · the same flight-deck shell, with the wheel and levers cut out so they move | 2 |
| human | empty bus stop · man + boy · see-through woman (her own page) / clothed woman (as drawn in the town) · *skin magnifier (child)* · frame | 5 |
| skin | fat · dermis · epidermis · hair, glands, vessels, nerves · *cell magnifier (child)* · frame | 5 |
| cell | cut-open cell with cytoplasm · nucleus + ER · mitochondria, Golgi, lysosomes · *the lysosome (child)* · the membrane rim · frame | 5 |
| lysosome | cytoplasm · the inside with the enzymes · the worn-out part and the germ · the membrane with pumps and doors · delivery bubbles and leaving pieces · frame | 6 |

**How layers were made.** I tried both methods on the plane. (a) Painting a layer on its own on magenta with a style
reference gave a lovely piece in the wrong place and at 1.5× the size (`art/rejected/plane-ground-a.png`): it
does not register with the other layers. (b) **Paint the whole scene once, as "clearly separated depth planes",
then extract each layer with an edit** ("keep only X, complete what was hidden, fill the rest with flat magenta";
for the backdrop, "remove X and paint what is behind it"). That registered almost perfectly: phase correlation
against the master gave 0–1 px shift for every extracted layer, and the hidden parts behind front layers came back
painted in. I used (b) everywhere. Asking for depth planes in the master prompt mattered: it makes compositions
with little overlap, so extraction has less to invent.

**Parents draw their children from the children's own layers.** This was the most useful decision. The town does
not have its own painting of the jet or of the family: the renderer draws the plane space's layers (minus its
backdrop and frame) at the spot, and the human space's family. So the parent's drawing of a child *is* the child,
same objects, colours and arrangement, by construction, and the dive lines up exactly. The woman is drawn clothed
in the town (a `vis: "mini"` layer) and becomes see-through as you arrive (`vis: "own"`). Where a child is far too
small to be seen in its parent (the flight deck in the whole jet, skin on a whole person, a cell in skin), the
parent shows it in a **round paper magnifier** pinned to the spot by a leader line, the classic encyclopedia device,
again painted live from the child's layers. The drive reuses the flight deck itself (its captain's half), so the
wheel and levers you fly with are the ones you saw.

**Parallax and the dive.** Each layer has a depth; when you zoom or pan, nearer layers zoom a little faster and slide
a little further, and they breathe by a pixel or two. The outlines move with their own layer. The dive is the
renderer's `dive` hook: the parent's layers in front of the child grow faster and slide out past the edges while
they fade, the child's page (paper, then backdrop) rises behind its subject, and its proscenium settles in last:
stepping through the paper. Into a magnifier, the round window opens until it is the screen. Into the drive, the
pilots in front slide past you and the airport outside becomes the sky.

**What I would do differently.** Plan the masters with the dive in mind: give the child an empty slot in the
parent's master from the start (I did for the town: an empty apron, an empty pavement), and ask for "no overlap
between planes" more firmly. Give a new object's position in words that do not depend on things hidden behind a
front layer (see the cup). And trace every outline from the layer pieces automatically (I traced some and drew the
rest by hand from grids).

## 2. Numbers

- **Image calls: 44** (genlog): 43 ok, 1 failed (moderation, reworded). Kept: 7 masters (sources only, not
  shipped) + 33 layers + 2 edit-test edits = 42 used; rejected: 1 (`plane-ground-a`, method (a)) + the failed call.
  That is **5–6 calls per space** (drive: 2, it borrows the flight deck).
- **Generation minutes: 49.8** (sum of `secs`), about 6 minutes per space; two calls ran at a time.
- **Wall time:** about 1 h 15 min from first read to the finished demo with the edit test (first image call 22:28,
  last 23:11 local; the rest was code, checking and this report).
- **Shipped:** 46 layer files, 6.2 MB (`art/layers/*.webp`; the full-size backdrops are most of it), `data.js` 55 KB,
  `renderer.js` 22 KB. Sources (`art/src`) 94 MB, not shipped.
- **Checks:** `node lab/tools/shots.mjs v2-paper-theatre` (full, every part opened): every part of all eight spaces
  visited on desktop and phone, `errors: []` (run on the shared 8766 server and on my own 8767 one). My own checks: real mouse clicks (river → focus; family → dive into
  human; skin magnifier → skin; hair → focus; scroll out → leaves), slow-motion frames of every dive in and out,
  outlines drawn red on every space. Frame rate in headless Chrome (software canvas): 41 fps at rest, 35 while zoomed.

## 3. The edit test

Both edits are one image call, on one layer, and nothing else was regenerated. Before files are kept in
`art/src/before/`, screenshots in `shots/edit/`.

**Edit 1: "five people at the bus stop instead of three"** (`1-before-*.jpg` → `1-after-*.jpg`)
- Wall clock **1 min 45 s** (writing the prompt → rebuilt → after screenshots), **1 image call** (68 s).
- What was redone: **one layer**, the town's foreground strip (`city-front`), edited to add an elderly woman with a
  shopping bag inside the shelter and a young man with a backpack by the sign, in the same grey pencil, with the
  middle of the pavement left empty. The edit registered at 0 px shift. `build.py` re-cut only that layer (3 s).
- Nothing else broke: the family is not part of the town's painting at all (it is the human space's layers drawn
  at the stop), so it stayed exactly the same, its outline is traced from those layers and did not move, and the dive
  still lands exactly (`1-after-dive-*.jpg`). The two new people are grey (not openable) like the rest of the town.

**Edit 2: "give the captain a coffee cup"** (`2-before-*.jpg` → `2-after-*.jpg`)
- Wall clock **2 min 57 s**, **1 image call** (59 s).
- What was redone: nothing was repainted in the shipped layers. I asked for the cup on the flight-deck shell (the
  layer behind the pilots), on the captain's side console. The model put it on the glareshield exactly where the
  captain's head (the crew layer, in front) hides it. Instead of a second call, the build cuts the cup out of the
  edited picture by difference with the before picture (`diffFrom`) and places it as its own small paper piece,
  slid 207 px onto the ledge left of the captain (`move` in `spec.py`). The shell layer itself is unchanged.
- Nothing else broke: outlines unchanged; the cup appears by itself in the flight deck you fly from (the drive
  reuses the shell and its pieces) and in the jet's magnifier. This is the approach at its best: a new object is a
  new piece of paper you can slide around the stage.

## 4. Self-assessment (1–10)

- **Beauty / book feel: 8.** The torn paper margins, shadows and proscenium really read as a tunnel book, and the grey
  pencil town with colour pieces you can open is lovely. The white margins can look a little like stickers on busy
  layers (the epidermis over the dermis), and the parallax has to stay subtle.
- **Coherence across levels: 9.** Every parent draws its child from the child's own layers, so they are identical by
  construction (family, jet, flight deck, skin, cell, lysosome). The magnifiers are a book device, not a literal zoom.
- **Sharpness when zooming in: 5.** Layers are ~1.5 MP paintings, so at 3× they are soft. Layering does not add
  resolution (although each layer could be repainted larger on its own).
- **How seamless the dives are: 8.** Town → jet, town → family and cell → lysosome are one continuous zoom with the
  front paper flying past you. The magnifier dives are smooth but a different kind of move, and the drive cross-fades
  the pilots away.
- **How easy it was to make every part: 7.** 5–6 calls and about 6 generation minutes per space. Extraction by edit
  keeps registration, but each layer still had to be looked at (repainted textures, a wheel redrawn in a new place).
- **How easy edits are: 9.** Both edits took one call, one layer or one new piece, and under 3 minutes. Nothing else
  was touched; dives and outlines stayed intact.
- **Cost to grow the world (a new machine): 8.** A master plus 4–5 extraction edits and a spec entry (~6 calls). The
  town needs no repaint, only an empty spot, because the parent draws the child itself.
- **The experience for a child: 8.** Warm, tactile and calm; everything is clickable, the magnifiers say "look
  closer", and flying is fun. On a phone the family at the bus stop is small and the "+" covers part of the small
  magnifiers.

## 5. Known problems, and what it would need for production

- **Extraction drifts a little.** Each extracted layer is a repaint: textures change (dermis fibres, the cell
  cytoplasm), and once the wheels came back a few pixels away from the pilots' hands. The counts are right (4 engines
  spread 2 per wing, 18 wheels, captain on the left, 4 thrust levers, 6 screens), but a seam can show where a layer
  meets the one behind it. The lysosome master drew some enzymes as scissors (my prompt's fault); the extraction
  repainted them as proteins.
- **Sharpness**: no deep-zoom tiles. Production would repaint each layer at 2–4× (a layer is an easy unit to tile).
- **Continuous redraw** for the breathing: fine on a GPU, 35–41 fps in software rendering. It should pause when idle
  on low-end phones.
- **The drive's sky** is a mirrored panorama; on a long turn you can see it repeat.
- **Core requests** (worked around in `renderer.js`): (1) a hook to give each part's outline its own transform (the
  outlines follow their paper layer; I set `transform` on `#lab-hots path.hot` and adjust `.lab-plus._at` in `draw`,
  which depends on the core's DOM); (2) tell the `dive` hook where the flight started (I infer it from the first
  frame's k); (3) the shared `python -m http.server` on 8766 drops connections when several variants load at once (my
  first quick run there logged 6 `Failed to fetch` errors from the core's loader), so the renderer retries a failed
  picture once, and my own checks used `tools/serve.py` (a threaded server on 8767).
- **For production**: a small layer editor (slide, scale and re-cut a piece, the way the cup was placed), outlines
  traced automatically from layer pieces for every part, and a "child slot" convention in every master prompt.

## Files

`tools/spec.py` (the theatre, space by space) → `tools/build.py` (+ `paper.py`: keying, paper margin, edge, shadow)
→ `art/layers/*.webp` + `data.js`. `renderer.js` stacks, breathes, frames and dives. Prompts for every picture:
`art/prompts/` (masters `*-master.txt`, extractions `<space>-<layer>.txt`, edits `edit-*.txt`). Sources: `art/src/`;
rejected: `art/rejected/`; quick looks: `art/preview/`; helpers: `tools/queue.sh` (two calls at a time),
`tools/align.py` (registration check), `tools/sheet.py`, `tools/snap.mjs`, `tools/serve.py`.
