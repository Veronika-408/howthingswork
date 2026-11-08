# Developing howthings.work

## Build and run

```
pip install pillow numpy scipy scikit-image
brew install webp                        # optional: cwebp makes crisper WebP for the same size (apt: webp)
npm install --prefix tools               # only for the checks and screenshots
python3 build.py                         # everything into dist/ (first run takes a few minutes)
python3 build.py --html-only             # after a code-only change: just re-inline the scripts
python3 -m http.server -d dist 8765      # open http://localhost:8765
node tools/smoke.mjs                     # every machine, part and page; must print no errors
node tools/perf.mjs [phone]              # smoothness: frame times and blur through every kind of zoom
```

Add `?slowmo=8` to the URL to slow every flight down eightfold and watch a dive frame by frame.

`dist/` holds the site: `index.html` (the map), `<id>/index.html` (a plain, searchable page per machine),
`contribute.md` (the agent guide plus the live list of what's free), `llms.txt`, `sitemap.xml`, `robots.txt`.

## How it fits together

- **The map** (`world/`): one pencil drawing plus 16 sharper repainted tiles (`world/art/zoom`), with clouds,
  traffic and boats as sprites (`world/src/world.js`). Machines that are built bring a coloured cut-out of
  themselves (`subjects/<id>/world/colour.png`), which the build paints over the map and its tiles.
- **A machine** (`subjects/<id>/`, the jumbo jet still lives at the root as `art/` and `src/`): one plate,
  outlines for its parts, close-up paintings, and deep-zoom tiles in two levels. The tiles are repainted
  copies of a crop, aligned back by `scripts/tiles.py`, so zooming stays inside the same picture.
- **The camera** (`src/app.js`): everything is painted into one screen-sized canvas each frame, in the same
  frame as the camera moves. Outlines, labels and the reading panel are DOM/SVG above the canvas.
- **Book pages** (`src/book.js`, `src/mechanisms.js`, `subjects/<id>/mechanisms.js`): a stage with
  watercolour flows, self-drawing ink arrows, a step spotlight and controls. Each page's `setup()` moves
  cut-out pieces of a painting, or exact shapes drawn over it.

## Smooth zooming: how the pictures are drawn and loaded

- **Layers, coarse to fine.** Each space is a stack: its whole picture at 1x (`plate-1x.webp`, `world.webp`),
  at 2x (`plate.webp`, `world-2x.webp`, the map made from its tiles), then its repainted detail tiles. A finer
  layer fades in *with the zoom* once the screen has more device pixels than the layer below has picture
  pixels, so a sharper picture arrives while you zoom, never after you stop. Only a picture that turns up
  late fades by time (0.35 s). The build writes the 1x and 2x levels itself.
- **The zoom stops where the art does.** You can zoom until a picture is stretched about 1.8× its own pixels:
  deep where a part has repaints, less on a bare plate or the map.
- **The dive.** While the camera flies into a child space, the child's plate is drawn over the parent
  through its `plate-mask.png`. Only its painted parts show, and they fade in as soon as the parent's own
  little drawing of it would look soft. Then the child's paper takes over the screen, and the camera lands
  on the plate exactly. Going up is the same in reverse, as one continuous move.
- **Decoded before needed.** Pictures are fetched and decoded off the main thread into bitmaps
  (`createImageBitmap`), then handed to the GPU one per frame, so nothing decodes mid-zoom.
- **Nearest in the tree first.** `plan()` runs on every move between spaces. It keeps decoded the space you
  are in and every space one step away (parent and children, ready for a dive). It decodes the current plate's
  detail tiles on big screens, and fetches only the bytes of everything else, nearest first. When decoded
  memory passes its budget (560 MB, or 220 MB on phones), the furthest and least recently drawn pictures are
  dropped. They come back from the HTTP cache in milliseconds.
- **Caching.** The build gives every picture a content hash (`window.ASSET_V`, sent as `?v=`), so a changed
  picture is a new URL. Everything else is cached for a day and refreshed in the background.

## The lab

`lab/` holds five experimental ways of making the pictures, built on one demo and compared side by side
(`python3 -m http.server -d lab 8766`). See `lab/README.md` for the results and `lab/core/API.md` for the viewer they share.
