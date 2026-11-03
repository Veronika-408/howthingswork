# Developing howthings.work

## Build and run

```
pip install pillow numpy scipy scikit-image
npm install --prefix tools               # only for the checks and screenshots
python3 build.py                         # everything into dist/ (first run takes a few minutes)
python3 build.py --html-only             # after a code-only change: just re-inline the scripts
python3 -m http.server -d dist 8765      # open http://localhost:8765
node tools/smoke.mjs                     # every machine, part and page; must print no errors
```

`dist/` holds the site: `index.html` (the map), `<id>/index.html` (a plain, searchable page per machine),
`contribute.md` (the agent guide plus the live list of what's free), `llms.txt`, `sitemap.xml`, `robots.txt`.

## How it fits together

- **The map** (`world/`): one pencil drawing plus 16 sharper repainted tiles (`world/art/zoom`), with clouds,
  traffic and boats as sprites (`world/src/world.js`). Machines that are built bring a coloured cut-out of
  themselves (`subjects/<id>/world/colour.png`), which the build paints over the map and its tiles.
- **A machine** (`subjects/<id>/`, the jumbo jet still lives at the root as `art/` and `src/`): one plate,
  outlines for its parts, close-up paintings, and deep-zoom tiles in two levels. The tiles are repainted
  copies of a crop, aligned back by `scripts/tiles.py`, so zooming stays inside the same picture.
- **The camera** (`src/app.js`): everything is painted into one screen-sized canvas each frame. In the
  map, the camera flies until the machine's drawing lines up with its plate (`spot.axis` → `spot.plateAxis`),
  then the map dissolves into the plate. Outlines, labels and the reading panel are DOM/SVG above the canvas.
- **Book pages** (`src/book.js`, `src/mechanisms.js`, `subjects/<id>/mechanisms.js`): a stage with
  watercolour flows, self-drawing ink arrows, a step spotlight and controls. Each page's `setup()` moves
  cut-out pieces of a painting, or exact shapes drawn over it.
- **Loading**: once the map shows, every picture is fetched in the background, nearest first. Hovering a
  machine moves it to the front of the queue.
