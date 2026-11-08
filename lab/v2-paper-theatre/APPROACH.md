# v2 · Paper theatre (layered cut paper, a tunnel book)

## The bet
The owner imagined it: "like 10 papers stacked, with just a few centimetres of each sticking out". Every space
is a little paper theatre: 4 to 7 painted, cut-out paper layers stacked back to front, with visible cut edges and
soft shadows between them, moving with parallax. It should feel more like a real book than anything flat, and an
edit only ever touches one layer.

## How to build it
- **Layers per space**, back to front, for example for the town: sky and far hills · the river and the far bank ·
  the airport with the plane · the town and the bus stop with the family · a near foreground (trees, a fence) ·
  a frame (a paper proscenium or simply the page edge). Each layer is a painting with a transparent background, cut
  out with a slightly irregular, deckled edge and a thin white paper margin (the "sticking out" edge), casting a
  soft shadow on the layer behind it (shadows and edges can be drawn by code from the alpha).
- **Generating layers.** Two ways, try both on the first space and keep the better: (a) paint each layer separately
  on a flat magenta (#FF00FF) background with the same style reference and a shared composition sketch; or (b)
  paint the whole scene once, then extract each layer with image edits ("keep only the X, fill everything else
  with flat pure magenta"). Key out the magenta by un-mixing the fringe (see `subjects/tram/build_book.py` in the repo
  for the un-mix code). Missing background behind a cut-out must be painted in on the layer behind it (paint the
  back layers complete, no holes).
- **Parallax:** each layer has a depth; when the camera pans and zooms, nearer layers move and scale a little more
  (keep it subtle and readable; hotspots stay attached to their layer). A slow idle breathing (a pixel or two) is
  welcome. Ink, watercolour, paper: same house style as the live site, but each piece clearly a cut piece of paper.
- **The dive** should feel like stepping through the paper stage: the parent's front layers grow faster and slide out
  past the edges and fade, the child's layers arrive from behind and settle into place. Implement it with the
  renderer's `dive` hook (see API.md) or within `draw` using `o.ghost` and the zoom.
- **Drive** is a natural fit: sky, clouds and ground as layers that rotate and slide with roll and pitch, the
  cockpit as the front layer with open windows, the yoke and levers as separate cut-outs that move.
- Body, skin, cell and lysosome as paper theatres too (for example the skin as stacked layers of the skin's own layers;
  the cell with the membrane as a front ring layer and organelles on middle layers).

## Measure especially
How many images a space really needs, how well the layers stay consistent with each other (light, scale, style),
and how the edit test goes when only one layer is redone.
