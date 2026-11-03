# Prompt templates

Every picture in howthings.work was made with these templates. Fill in the `<…>` parts, keep everything
else word for word: the shared wording is what keeps the whole encyclopedia looking like one book.
The exact prompts used for the plane and the tram are kept next to their art (`art/prompts/`,
`subjects/tram/art/prompts/`, `*/art/zoom/prompts/`) as worked examples.

## 1. The plate (`subjects/<id>/art/plate.png`)

Generate three, keep the one that is technically right. Then look at it at full size, with
`python3 scripts/grid.py`, before you go on.

```
You are a historical illustrator, <engineer type> and technical draftsman specializing in illustrated encyclopedias for children.

Subject: <the machine, era and setting; its colours; "NO logos, NO lettering of any kind">.

Generate one vast illustrated encyclopedic plate: the whole <machine> seen from its <LEFT> side, <front> pointing to the <LEFT>, viewed from slightly in front and slightly above (about 15 degrees), so it reads almost as a side profile. Large portions of the outer skin are cut away to reveal everything inside, in the style of a classic cutaway drawing.

ARTISTIC DIRECTION
- Aesthetic of the great illustrated children's encyclopedias of the 1980s-1990s (Dorling Kindersley "Incredible Cross-Sections", Stephen Biesty style).
- Extremely detailed fine ink linework and traditional watercolor washes. Warm natural colors on slightly ivory paper.
- Precise engineering lines, realistic materials. No 3D render, no cartoon, no photographic look.

WHAT MUST BE VISIBLE (technically correct for <the real type>)
- <one line per part, with the numbers that models get wrong: how many wheels, engines, blades, seats per row, …>
- Dozens of tiny people to scale doing realistic things.

COMPOSITION
- Wide 16:9 landscape plate. The whole <machine> fits comfortably INSIDE the frame: it spans about 85% of the width, centered, with calm empty ivory paper margins (about 7% left and right, about 14% at the top, about 10% at the bottom). These margins stay completely empty for annotations. The ground fades softly into the paper with an irregular watercolor edge, not a hard rectangle.
- ABSOLUTELY NO TEXT anywhere: no letters, numbers, labels, signs, annotation lines or title. Pure illustration only.
```

Point the machine the same way it stands on the map, so the zoom from the map into the plate lines up.
If a model refuses named artists, drop the names and keep the rest.

## 2. Close-ups (`art/detail/<part>.png`, one per part, attach the plate as a reference)

```
A close-up cut-away vignette for a children's illustrated encyclopedia of the 1980s-1990s (Stephen Biesty / Dorling Kindersley style), the same book as the attached plate. Extremely detailed fine ink linework with traditional watercolor washes, warm natural colors on slightly ivory paper, precise engineering lines, realistic materials, small people to scale doing realistic things. No 3D render, no cartoon, no photographic look.

The machine is the same <machine, colours> as in the attached plate. Technically accurate for <the real type>. No logos.

SUBJECT: <what the close-up shows, and what must NOT be in it>

COMPOSITION: 4:3 landscape. The subject is large and fills most of the picture. The edges fade organically into plain ivory paper, like a vignette in a book, never a hard rectangle or frame.
ABSOLUTELY NO TEXT: no letters, words, labels, numbers, logos, signs or annotation lines anywhere.
```

## 3. Deep-zoom tiles (automatic)

`scripts/tiles.py` writes these prompts itself from `describe` in `subject.json`: it crops an area,
enlarges it and asks the model to repaint the same picture with finer detail, keeping every shape.

## 4. Colouring it in on the map (`subjects/<id>/world/painted.png`, edit `grey.png`, plate attached as Image 2)

The map drawing must be a miniature of the plate, never just the grey thing that was already there coloured in.

```
Image 1 is a crop of a hand-drawn soft grey pencil isometric map of a small river town on warm white paper. Image 2 is the encyclopedia plate this place opens into.

EDIT IMAGE 1, keeping every line, shape, position and the framing exactly as they are, with ONE change:

Replace <the grey thing> with a tiny miniature of EXACTLY what is in Image 2: <list every piece and person, left to right, with clothes, colours and which way they face>, painted in rich ink-and-watercolour like the jumbo jet and the tram on the same map, so it reads as a bright little patch of colour from far away. Remove anything in that spot that is not in Image 2. Everything else stays soft grey pencil, untouched.

No text, letters or numbers. Same framing as Image 1.
```

## 5. "How it works" diagrams (`art/book/*.png`)

```
A page illustration from a classic 1980s-1990s children's "how things work" encyclopedia of machines: precise fine pen-and-ink linework with transparent traditional watercolor washes on warm ivory paper, a clear explanatory cross-section diagram, friendly but technically accurate, realistic proportions, delicate granulation and soft unfinished watercolor edges. No 3D render, no cartoon, no photographic look.

ABSOLUTELY NO TEXT: no letters, words, numbers, labels, arrows, annotation lines, logos or signage anywhere. Plain empty ivory paper around the subject.

SUBJECT: <the mechanism as an exact ORTHOGRAPHIC side section or plan view; where it sits in the frame; the machine SWITCHED OFF and STILL (no flames, motion lines or airflow: the code animates those); empty channels where something will move; separate pieces on a parts sheet with wide gaps, or a flat magenta (#FF00FF) background, for anything the code cuts out and moves>
```
