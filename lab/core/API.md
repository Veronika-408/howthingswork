# Lab core: the shared viewer every variant plugs into

The core (`lab/core/lab.js`, `lab/core/lab.css`) does everything that is the same in all five variants:
the camera, pan and zoom, hotspots and outlines, diving into a child space and back out, breadcrumbs,
the reading panel with the **age slider** (3+, 5+, 7+, 9+, 11+), loading pictures, the flight model and
controls of the "fly the plane" leaf, and a test API. A variant only supplies **data** (`data.js`) and
a **renderer** (`renderer.js`): how its pictures are made and painted.

`lab/core/READY` exists once the core works. Until then, make art and write your data.

## Page

`lab/<variant>/index.html`:

```html
<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Paper theatre · howthings.work lab</title>
<link rel="stylesheet" href="../core/lab.css">
</head><body>
<script src="../content.js"></script>
<script src="data.js"></script>
<script src="renderer.js"></script>
<script src="../core/lab.js"></script>
</body></html>
```

Serve `lab/` (`python3 -m http.server 8766 -d lab`) and open `http://localhost:8766/<variant>/`.
`#lysosome` (any space id) opens straight into that space; `?age=9` sets the age; `?slowmo=8` slows every flight.

## Data: `window.LAB_DATA`

```js
window.LAB_DATA = {
  variant: { id: "v2-paper-theatre", name: "Paper theatre", approach: "One sentence on how the pictures are made." },
  root: "city",
  spaces: {
    city: {
      w: 1672, h: 941,              // the space's own coordinates (usually its main picture's pixels at 1x)
      paper: "#f4efe4",             // the page colour around the picture
      frame: [0, 0, 1672, 941],     // optional: the area shown when the space is whole (default 0,0,w,h)
      maxZoom: 3,                   // optional: deepest zoom, as a multiple of the whole-space scale (default 3)
      parts: [                      // hotspots; ids match CONTENT.spaces.city.parts (every one must be drawn)
        { id: "plane",  polys: [[[x, y], [x, y], ...]], child: "plane" },   // child: tapping it dives in
        { id: "people", polys: [...], child: "human" },
        { id: "river",  polys: [...] },
        { id: "bridge", polys: [...] }
      ],
      assets: ["art/city.webp"],    // pictures to decode before the space is shown (relative to the page)
      // ...anything else your renderer needs (layers, stickers, paths)
    },
    plane: {
      parent: "city",               // every space but the root has a parent
      spot: {                       // where this space is drawn INSIDE its parent, in the PARENT's coordinates
        polys: [[[x, y], ...]],     //   its outline there (optional: the parent's part polys are used for hit-testing)
        axis: [[x0, y0], [x1, y1]], //   two points on the parent's drawing of it ...
        plateAxis: [[x0, y0], [x1, y1]] // ... and the same two points in this space's own coordinates
      },
      w: 1672, h: 941, paper: "#f6f1e6", parts: [...], assets: [...]
    },
    drive: { parent: "pilots", kind: "drive", ... }   // the flying leaf (see below)
  }
};
```

The tree for the demo, all eight spaces required:

```
city ─┬─ plane ── pilots ── drive         (plane part "cockpit" → pilots, pilots part "yoke" → drive)
      └─ human ── skin ── cell ── lysosome (city part "people" → human, human "skin" → skin,
                                            skin "cell" → cell, cell "lysosome" → lysosome)
```

The dive lines up the parent's drawing of the child with the child's own picture using `axis` and
`plateAxis` (scale + translation, no rotation, so draw children upright). Get them right and the dive
reads as one continuous zoom. The parent's drawing of the child must SHOW THE SAME THING as the child.

## Renderer: `window.LAB_RENDERER`

```js
window.LAB_RENDERER = {
  init(lab) {},                       // once, before anything is drawn (see "the lab object" below)
  draw(g, space, cam, o) {            // every frame the space is visible
    // g:   CanvasRenderingContext2D of the full-screen canvas; transform = identity in DEVICE pixels.
    //      Leave globalAlpha / globalCompositeOperation / transform as you found them (save/restore).
    // cam: { x, y, s }  screen CSS pixel = (cam.x + cam.s * spaceX, cam.y + cam.s * spaceY)
    // o:   { dpr, alpha, ghost, t, fit, view: {w, h}, drive, focus }
    //      dpr    device pixels per CSS pixel: setTransform(o.dpr * cam.s, 0, 0, o.dpr * cam.s, o.dpr * cam.x, o.dpr * cam.y)
    //      alpha  0..1, multiply everything you paint by it
    //      ghost  true while this space is being dived into (or out of) over its parent: paint ONLY the
    //             subject (no full-page background, no paper); it fades in over the parent's drawing of it
    //      t      seconds since start (for living scenes)
    //      fit    the camera that shows the whole space (compare with cam for parallax: zoom = cam.s / fit.s)
    //      view   the viewport in CSS pixels
    //      drive  the flight state, only for kind "drive" (see below)
    //      focus  id of the focused part or null
    //      diving true while a dive (in or out) is in progress, for the parent and the child alike
    //      flying true while the camera is flying (a dive, a focus, a zoom to fit)
  },
  animating(space) { return false; },  // optional: true keeps frames coming while the space is shown
  dive: null,                          // optional: function(g, parent, child, camParent, camChild, k, o) to draw a
                                       // custom transition; k = 0..1 (1 = the child fills its whole view).
                                       // Return true if you drew it, false to use the default cross-fade.
  ready(space) { return true; }        // optional: false while the space still needs pictures you load yourself
};
```

The default dive: while flying in, the child is drawn with `ghost: true` over the parent, fading in as it
grows, then its full page (`ghost: false`) takes over before landing. Leaving is the same in reverse. The full
page is painted at full strength (`alpha: 1`) into an offscreen layer that the core fades in as one picture, so
painting your own paper there is fine; only `ghost: true` draws must leave the background out.

### The lab object passed to `init(lab)`

```js
lab.img(url)        // → { bmp, w, h, ready: Promise } decoded off the main thread; bmp is null until ready
lab.draw(g, o, cam, entry, x, y, w, h, alpha = 1)   // draw a lab.img entry at space coords x,y,w,h
lab.requestDraw()   // ask for another frame (after your own async work)
lab.data            // LAB_DATA
lab.content         // CONTENT
```

## The flying leaf: `kind: "drive"`

The core runs a small flight model and shows the controls (a yoke pad you drag, thrust levers, flaps,
gear) and a status line. Your renderer paints the view from the captain's seat every frame from
`o.drive`:

```js
o.drive = {
  pitch,     // degrees, nose up positive (−12 … +18)
  roll,      // degrees, right wing down positive (−35 … +35)
  yoke: { x, y },   // the control input −1…1 (x right, y pull back) — move your painted yoke with it
  throttle,  // 0…1 (move your thrust levers)
  flaps,     // 0…1
  gear,      // 0 up … 1 down
  speed,     // knots
  altitude,  // feet
  heading,   // degrees, 0…360 (scroll the scenery sideways with it)
  t          // seconds
}
```

Paint: the outside world (sky, clouds, ground) rotated by `−roll` around the horizon centre and moved
down by `pitch × pixelsPerDegree` when the nose goes up, scrolling with heading and speed; then the
cockpit frame in front with its windows open; the yoke turned by `yoke.x × 70°` and slid by `yoke.y`;
the thrust levers by `throttle`. Parts (`yoke`, `throttle`, `flaps`, `gear`) need polys over your
cockpit picture like any space. The camera does not zoom in this space (`w`/`h` are the view's
picture; the core fits it to the screen).

## Test API: `window.__lab`

```js
__lab.enter(id)     // dive into a child of the current space (or jump anywhere); returns a Promise
__lab.leave()       // up one space; Promise
__lab.leaveAll()    // back to the root; Promise
__lab.focus(partId) // open a part's text and frame it
__lab.setAge(n)     // 3, 5, 7, 9 or 11
__lab.space         // current space id
__lab.idle()        // true when no picture is loading and nothing is flying
__lab.drive         // { set({ yoke: {x, y}, throttle, flaps, gear }) } in the drive space
```

`lab/tools/shots.mjs <variant>` drives both chains with this API and saves screenshots (desktop and phone)
to `lab/<variant>/shots/`.
- A working example: `lab/core/test/` (open http://localhost:8766/core/test/).
