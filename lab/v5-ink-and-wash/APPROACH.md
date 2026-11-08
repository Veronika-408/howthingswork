# v5 · Ink and wash (vector line art over a separate watercolour wash)

## The bet
Split every picture into its two natural layers: crisp **pen-and-ink line art** and a loose **watercolour wash**
underneath, the classic line-and-wash look of David Macaulay's *The Way Things Work*. The lines are vectorised,
so they stay razor sharp at ANY zoom with tiny files (the dream of an infinitely zoomable book); the wash is
soft by nature and can be low-resolution. Lines are also what image models redraw most reliably, so a change
means redrawing lines in a region and re-washing it.

## How to build it
- **Per space, two aligned pictures:**
  1. **Line art:** pure black ink linework on white, no grey, no shading fills (hatching is fine and lovely), the full
     composition (generate it; three variants for the important spaces, pick the best).
  2. **Wash:** made from the line art by an image edit: "paint loose transparent watercolour washes on this line drawing,
     keeping every line exactly" → then separate it from the lines: the wash layer = the painted image with the lines
     removed (in code, e.g. by inpainting/median under the line mask from step 1, or ask the model for "only the
     colour washes, no lines"). Try both on the first space.
- **Vectorise the lines:** threshold the line art and trace it with `potrace` (installed) to SVG paths; ship the paths
  (as SVG path strings or a compact JSON), and draw them with `Path2D` on the canvas (fill, even-odd), in a warm
  dark ink colour, over the wash. Check that hatching survives and that files stay small.
- **Deep zoom:** when zooming in far, fade in a more detailed line drawing of the region (generated from a crop of
  the line art as reference, like today's repaint tiles, but lines only); the wash stays the same. Do at least one
  level of this somewhere (the engine, the skin's sweat gland, or the cell's nucleus), so the "infinite" claim is tested.
- **Dives:** the child's lines draw over the parent's (ghost = lines first, then the wash fades in). A draw-on effect
  (lines appearing along their length) when a space arrives is welcome, but keep it quick.
- **Drive:** line-drawn cockpit with flat wash sky and ground behind; the horizon rotates and moves.
- Paper texture under everything (a subtle ivory paper grain), so the wash looks like it soaked into paper.

## Measure especially
File sizes, how sharp it is at 10× zoom, how well wash and lines line up, how reliable the line art is, and the edit test.
