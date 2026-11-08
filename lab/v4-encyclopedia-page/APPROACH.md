# v4 · Encyclopedia page (white pages, isolated subjects, DK style)

## The bet
Drop the painted backgrounds entirely. Every space is a page of a children's visual encyclopedia (think Dorling
Kindersley's Visual Dictionary / Eyewitness): isolated, beautifully painted subjects on warm white paper, soft
contact shadows, round magnifier insets, small numbered callouts, scale bars and labels drawn by code. Because
nothing has a background, every object is generated on its own and placed by code. Adding or changing one
never disturbs anything else, and the pages look clean, calm and unmistakably like a book.

## How to build it
- **Pages:** a layout per space (in `data.js`): the hero subject large, a few insets (magnifier circles or small
  vignettes for details), labels with leader lines in code, maybe a small scale figure (a child silhouette for
  size, a coin for the cell...). All in the house style: ink and watercolour, warm natural colours, white paper.
- **The town** is the hardest page: make it a single isometric vignette illustration of the town (airport with the
  plane, river and bridge, bus stop with the family) floating on the white page with a soft irregular edge, or a
  page of isolated landmarks arranged like a fold-out map. Pick what reads best.
- **Generating:** each subject and inset alone on a plain white (or flat magenta for clean cut-outs) background, painted
  from references so they match (the plane on the town page = the plane on its own page, same livery and angle;
  the cell's lysosome = the lysosome page hero). Cut out with alpha, add soft contact shadows in code.
- **Dives:** tapping a subject zooms into it and its own page builds around it: labels and insets fade in, the
  previous page's other objects slide away. Because the hero on the next page is the same art at higher
  resolution, the dive is seamless.
- **Drive:** a page "How a pilot flies": a large rounded window showing the captain's view (cockpit frame cut-out
  over a sky/ground painting that rotates), plus small live diagrams (a plane silhouette seen from behind banking,
  from the side pitching) drawn by code, and labelled controls.
- Typography matters here: labels and callouts are part of the look (use the core's fonts; small caps for headings).

## Measure especially
Whether pages without scenes still feel magical for a child (honestly), how much faster the art is, and the edit test.
