# Spaces: how the infinite zoom works

Everything in howthings.work is a **space**: a painted picture you can be "in". Spaces form one tree,
and the zoom moves along it, up or down:

```
the map (the town)                       ← you start here
├── The Jumbo Jet                        subjects: plane (built in)
├── The City Tram                        subjects/tram
└── The Human Body                       subjects/body      parent: world (the family at the bus stop)
    └── Skin                             subjects/skin      parent: body  (the patch on the hand)
        └── The Cell                     subjects/cell      parent: skin  (the round skin cell)
```

Each space is drawn **inside its parent**. To dive in, the camera zooms into the parent until the little
drawing of the child sits exactly where the child's own plate will appear. Then the parent dissolves into
the child. Going up reverses it. Inside each space, the usual parts, deep-zoom tiles and "How it works"
pages work as before.

## What a space needs

Each space is in its own `subjects/<id>/` folder (see `docs/ADD-A-MACHINE.md`). What makes it a space
inside another one is in `subject.json`:

| Field | Meaning |
|---|---|
| `parent` | `"world"` for the map (default), or the id of the space it's drawn inside |
| `spot.polys` | its outline on the parent, in the parent's pixels (map pixels, or the parent plate's pixels) |
| `spot.plus` | where its "+" sits on the parent |
| `spot.axis` | two points along it on the parent, left end first |
| `spot.plateAxis` | the same two points on its own plate: the camera lines these up for a seamless dive |

Optionally, set `"opens": "<child id>"` on the parent's part (in `src/parts.js`) that contains the child.
Its panel then shows **Inside: …** as the first "Look deeper" button, as the body's Skin part does.

The child should be painted so its plate **matches its drawing on the parent**: the same thing seen the same
way. The cell plate shows the round skin cell from the skin plate, enlarged. The body plate shows the woman
in the yellow raincoat from the bus stop. If the match is loose, the dissolve still works, but it reads as a
cut rather than a zoom.

## Going smaller

Any space can have children, so the tree has no bottom: cell → nucleus → DNA, heart → valve,
engine → turbine blade. Each step is one more subject with `parent` set.

## Going bigger: ready, not built

Today the town is the root of the tree. To zoom out (town → country → Earth → Solar System), the same model
applies one level up. A bigger picture becomes the parent, and the town gets a `spot` on it. In the data,
that is a `world.parent` with its own plate and a `spot` for the town. The camera already handles parent
and child spaces of any size, but the viewer still treats the map as the fixed top of the trail, so this
step needs a small change in `src/app.js` (`setSpace`, `leave`, `worldFit`). Nothing in the data format
has to change: rockets, the Moon, the Sun and Mars would be spaces with parents like everything else.
