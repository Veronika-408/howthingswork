# v3 · Sticker kit (an isometric library of objects, scenes assembled by code)

## The bet
Paint objects, not scenes. Every object (a person, a plane, a tree, a bus shelter, an organ, an organelle) is a
separate **sticker** in one strict isometric projection, from a reusable **library**. A scene is a JSON list of
placements that code assembles, z-sorted. Growing the world mostly means reusing stickers; "five people at the bus
stop" means placing two more people stickers, with no painting at all.

## How to build it
- **One projection:** true isometric (the 2:1 pixel-art grid angle, about 30°) for the town and every scene that is
  a place: the airport, the bus stop, the cut-away plane, the flight deck. Diagram-like spaces (skin, cell,
  lysosome) can be iso cut-away blocks too (a skin block in iso is a classic). Light from the top left everywhere.
- **Sprite sheets:** generate 6 to 12 stickers per image on flat magenta (#FF00FF), in a neat grid with wide gaps,
  same scale within a sheet, each object complete, nothing touching, no shadows (shadows are code). Key out the
  magenta by un-mixing the fringe (see `subjects/tram/build_book.py` in the repo), split by connected components, trim,
  name them. Give each sticker a thin white paper margin and a soft drop shadow in code, so it reads as a sticker
  on the page (a sticker-album look is the point, not a flaw).
- **Grounds:** each scene has a ground/base painting (the town's land, roads and river in iso; the flight deck
  floor; the skin block's cut faces...) or a code-drawn iso grid with painted tiles, whichever looks better.
- **Scenes as JSON:** placements `{ sticker, x, y, scale, flip, z }`, z by default from y (isometric depth order).
  Hotspot outlines come from the stickers' alpha (trace a polygon per placed sticker), so there is no manual
  tracing; a part can be a group of stickers.
- **Reuse across levels:** the plane sticker on the town map and the cut-away plane space should be clearly the same
  aircraft; the lysosome sticker inside the cell can be the lysosome space's hero, scaled. The dive between them is
  then naturally seamless.
- **Drive:** an iso flight deck doesn't work for a forward view; make the drive space a straight-on scene from
  stickers: the cockpit frame, the yoke, the levers, plus a sky and ground behind that rotate.
- The **library** (`library/` with an index JSON: name, file, size, anchor point, tags) is a first-class output:
  people of many kinds, vehicles, trees, organelles... It is what makes the next machine cheap.

## Measure especially
How many stickers you needed, how many were reused, whether the composed scenes look like one picture or a
collage (be honest), and the edit test (ideally zero new image calls for the five people).
