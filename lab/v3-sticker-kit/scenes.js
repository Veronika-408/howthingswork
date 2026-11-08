// v3 · Sticker kit: every space is a list of sticker placements. Edit this file to change a picture.
//   { s: sticker, x, y, k: scale, flip, rot: degrees, z: depth (default y), id }
//   x, y is where the sticker's anchor (its feet, bottom centre) goes. Stickers are drawn back to front by z.
//   { group: name, x, y, k, swap: { id: other sticker } }  a group of placements shared by two spaces
//   { scene: space, x, y, k, lens: [cx, cy, r], leader: [x, y] }  a child space drawn small inside this one
//   anim: "bob" | "jiggle" | "wobble" | "pulse",  path: [[x, y], ...] + speed,  drift: { speed, range }
// Parts name the placements (ids) or regions (hand outlines inside one sticker) that make them up.
window.SCENES = {
  variant: { id: "v3-sticker-kit", name: "Sticker kit", approach: "Every object is a sticker from one reusable isometric library (sprite sheets on magenta, keyed and split by code); every space is a JSON list of placements that code assembles, z-sorted, with outlines traced from the stickers' alpha." },
  root: "city",

  groups: {
    // the jumbo jet and its ground crew, in the jet sticker's own pixels (origin = the jet's anchor).
    // The town shows it small with the outside jet; the plane space shows it big with the cut-away jet.
    apron: [
      { id: "plane", s: "plane-ext", x: 0, y: 0, z: 0 },
      { s: "stairs-truck", x: -60, y: -300, k: .55, z: 5 },
      { s: "crew-clipboard", x: -150, y: -215, k: .22, z: 6 },
      { s: "container", x: -330, y: -130, k: .5, z: 9 },
      { s: "container2", x: -250, y: -85, k: .5, z: 11 },
      { s: "fuel-truck", x: 360, y: -60, k: .55, z: 12 },
      { s: "baggage-train", x: 520, y: -30, k: .55, z: 20 },
      // only on the big apron (the town's apron has no room for them)
      { s: "tug", x: -250, y: -470, k: .5, z: -900, only: "plane" },
      { s: "crew-marshal", x: -330, y: -540, k: .22, z: -890, only: "plane" },
      { s: "belt-loader", x: 650, y: -110, k: .55, z: 14, only: "plane" },
      { s: "crew-standing", x: 560, y: -150, k: .22, z: 13, only: "plane" },
      { s: "catering-truck", x: 850, y: -40, k: .55, z: 12, only: "plane" },
      { s: "crew-radio", x: 1010, y: -90, k: .22, z: 13, only: "plane" },
      { s: "baggage-train", x: -430, y: -110, k: .55, flip: true, only: "plane" },
      { s: "van-yellow", x: -580, y: -200, k: .5, only: "plane" },
      { s: "crew-standing", x: -270, y: -285, k: .22, flip: true, only: "plane" }
    ],
    // the family at the bus stop, in the family sheet's pixels (so they stand as they were painted).
    // The town shows them tiny; the human space shows them big, with the woman see-through.
    busstop: [
      { id: "man", s: "man", sheet: true },
      { id: "woman", s: "woman-boy", sheet: true }
    ]
  },

  spaces: {
    // ================================================================ the town
    city: {
      w: 1775, h: 894, paper: "#f3eee3", frame: [-30, -40, 1835, 960], maxZoom: 7, living: true,
      items: [
        { id: "ground", s: "ground-city", x: 0, y: 0, ground: true },
        // the airport, beyond the river
        { group: "apron", x: 178, y: 470, k: .24 },
        { s: "terminal", x: 565, y: 228, k: .2 },
        { s: "tower", x: 745, y: 168, k: .22 },
        { s: "hangar", x: 880, y: 122, k: .2 },
        { s: "tree-fir", x: 470, y: 250, k: .14 }, { s: "tree-fir", x: 660, y: 190, k: .13 }, { s: "tree-poplar", x: 1000, y: 95, k: .17 },
        { s: "tree-small", x: 1080, y: 205, k: .16 }, { s: "tree-oak", x: 1140, y: 170, k: .17 }, { s: "bush", x: 1005, y: 215, k: .14 },
        // the river and the bridge
        { id: "bridge", s: "bridge", x: 786, y: 441, k: .16 },
        { s: "barge", path: [[250, 545], [1240, 165]], speed: 7, offset: .2, k: .13, z: 360 },
        { s: "ferry", path: [[1180, 205], [300, 525]], speed: 9, offset: .6, k: .13, z: 380 },
        { s: "boat-sail", x: 470, y: 470, k: .11, anim: "bob", amp: 1 },
        { s: "rowboat", x: 1010, y: 300, k: .07, anim: "bob", amp: .8 },
        // the town
        { s: "terrace-orange", x: 840, y: 428, k: .3 },
        { s: "church", x: 1045, y: 385, k: .32 },
        { s: "semis-cream", x: 1195, y: 322, k: .3 },
        { s: "school", x: 598, y: 543, k: .3 },
        { s: "townhouse-red", x: 1290, y: 282, k: .3 },
        { s: "cottage-white", x: 1450, y: 360, k: .28 },
        { s: "house-blue", x: 1545, y: 405, k: .27 },
        { s: "flats-yellow", x: 1465, y: 525, k: .32 },
        { s: "shop-corner", x: 1105, y: 690, k: .3 },
        { s: "semis-cream", x: 760, y: 690, k: .28, flip: true },
        { s: "house-blue", x: 1260, y: 625, k: .27, flip: true },
        { s: "cottage-white", x: 585, y: 695, k: .27, flip: true },
        // trees, the park
        { s: "tree-oak", x: 1075, y: 480, k: .26 }, { s: "tree-birch", x: 1330, y: 410, k: .22 }, { s: "tree-autumn", x: 1210, y: 520, k: .22 },
        { s: "tree-small", x: 1000, y: 420, k: .2 }, { s: "bush-yellow", x: 1150, y: 545, k: .17 }, { s: "bench", x: 1260, y: 470, k: .1 },
        { s: "lamp", x: 1180, y: 470, k: .12 }, { s: "tree-poplar", x: 1390, y: 470, k: .22 },
        { s: "tree-poplar", x: 520, y: 470, k: .2 }, { s: "tree-poplar", x: 600, y: 432, k: .2 }, { s: "tree-poplar", x: 680, y: 395, k: .2 },
        { s: "tree-small", x: 560, y: 545, k: .19 }, { s: "tree-oak", x: 830, y: 610, k: .22 }, { s: "hedge", x: 990, y: 600, k: .2 },
        { s: "tree-birch", x: 990, y: 760, k: .22 }, { s: "tree-small", x: 1040, y: 790, k: .2 }, { s: "tree-autumn", x: 780, y: 790, k: .2 },
        { s: "tree-fir", x: 1600, y: 470, k: .2 }, { s: "tree-small", x: 1360, y: 300, k: .18 }, { s: "bush", x: 1520, y: 330, k: .15 },
        { s: "tree-oak", x: 1360, y: 580, k: .22 }, { s: "tree-small", x: 660, y: 640, k: .18 }, { s: "bush-yellow", x: 500, y: 660, k: .15 },
        { s: "tree-oak", x: 400, y: 600, k: .22 }, { s: "tree-small", x: 330, y: 575, k: .18 }, { s: "bush", x: 450, y: 640, k: .14 },
        { s: "tree-fir", x: 790, y: 795, k: .18 }, { s: "tree-small", x: 862, y: 805, k: .17 }, { s: "tree-birch", x: 1150, y: 715, k: .2 },
        { s: "tree-oak", x: 1385, y: 600, k: .2 }, { s: "bush-yellow", x: 1330, y: 615, k: .14 }, { s: "tree-poplar", x: 1660, y: 430, k: .18 },
        { s: "tree-small", x: 1240, y: 210, k: .16 }, { s: "tree-autumn", x: 1560, y: 520, k: .18 }, { s: "lamp2", x: 905, y: 600, k: .09 },
        { s: "car-red", x: 1015, y: 572, k: .1 }, { s: "van-yellow", x: 1175, y: 660, k: .11, flip: true },
        // traffic
        { s: "car-red", path: [[1265, 282], [880, 472], [470, 672]], speed: 22, k: .1, flip: true },
        { s: "car-blue", path: [[1265, 282], [880, 472], [470, 672]], speed: 22, offset: .5, k: .1 },
        // the bus stop
        { s: "shelter", x: 792, y: 476, k: .12 },
        { s: "busstop-pole", x: 748, y: 494, k: .085 },
        { s: "bus", x: 722, y: 532, k: .14 },
        { group: "busstop", x: 755, y: 458, k: .024 },
        // edit test 1: two more people wait at the stop (library stickers, no new painting)
        { id: "waiting1", s: "old-man", x: 806, y: 484, k: .046 },
        { id: "waiting2", s: "grandma", x: 821, y: 490, k: .047 },
        // clouds drift over the map, their shadows on the ground
        { s: "cloud-big", x: 250, y: 120, k: .55, drift: { speed: 6, range: [-200, 1950] }, z: 1e6, shadowOff: 14, shadow: .25 },
        { s: "cloud-mid", x: 1250, y: 70, k: .5, drift: { speed: 4.5, range: [-200, 1950] }, z: 1e6, shadowOff: 14, shadow: .25 },
        { s: "cloud-small", x: 820, y: 175, k: .5, drift: { speed: 5.5, range: [-200, 1950] }, z: 1e6, shadowOff: 14, shadow: .25 }
      ],
      parts: {
        plane: { ids: ["plane"], child: "plane", plus: [289, 372] },
        people: { ids: ["man", "woman", "waiting1", "waiting2"], child: "human", plus: [775, 492] },
        river: { regions: [["ground", "river"]] },
        bridge: { ids: ["bridge"] }
      }
    },

    // ================================================================ the jumbo jet, cut open
    plane: {
      parent: "city", via: { group: "apron" },
      w: 1800, h: 1000, paper: "#f4efe3", frame: [40, 30, 1720, 950], maxZoom: 4,
      items: [
        { slab: { a: 640, b: 968, h: 36, top: "#cfcabd", kind: "tarmac", side: "#b3936a", side2: "#a2835c", lines: [[[365, 138], [1333, 622]]] }, x: 927, y: 476, ground: true },
        { group: "apron", x: 779, y: 658, k: .8, swap: { plane: "plane-cutaway" } }
      ],
      parts: {
        cockpit: { regions: [["plane", "cockpit"]], child: "pilots" },
        cabin: { regions: [["plane", "cabin"]] },
        hold: { regions: [["plane", "hold"]] },
        wing: { regions: [["plane", "wing"]] },
        engine: { regions: [["plane", "engine"]] },
        gear: { regions: [["plane", "gear"]] },
        tail: { regions: [["plane", "tail"]] }
      }
    },

    // ================================================================ the flight deck
    pilots: {
      parent: "plane", via: { match: [["plane", [40, 150], [200, 150]], ["deck", [120, 520], [1300, 520]]] },
      w: 1400, h: 1050, paper: "#f2ede1", frame: [0, 0, 1400, 1050], maxZoom: 4,
      items: [
        { id: "deck", s: "flight-deck", x: 35, y: 40, anchor: [0, 0], z: 0 },
        // edit test 2: the captain's coffee, on the pedestal by his right hand (a library prop sticker)
        { id: "cup", s: "cup-coffee", x: 35 + 553, y: 40 + 514, k: .11, z: 10 }
      ],
      parts: {
        windows: { regions: [["deck", "windows"]] },
        overhead: { regions: [["deck", "overhead"]] },
        screens: { regions: [["deck", "screens"]] },
        pedals: { regions: [["deck", "pedals"]] },
        captain: { regions: [["deck", "captain"]], ids: ["cup"] },
        firstofficer: { regions: [["deck", "firstofficer"]] },
        throttle: { regions: [["deck", "throttle"]] },
        yoke: { regions: [["deck", "yoke"]], child: "drive", plus: [505, 612] }
      }
    },

    // ================================================================ you fly (painted in code behind the cockpit sticker)
    drive: {
      parent: "pilots", kind: "drive", via: { match: [["deck", [415, 488], [540, 478]], ["yoke", [100, 60], [720, 60]]] },
      w: 1536, h: 1024, paper: "#e9e3d6",
      items: [
        { id: "frame", s: "deck-frame", x: 0, y: 0, anchor: [0, 0], noShadow: true },
        { id: "yoke", s: "yoke", x: 490, y: 1012, k: .62, hub: [415, 305], col: [355, 418, 190, 210] },
        { id: "levers", s: "thrust-levers", x: 1190, y: 1012, k: .62, split: 226 },
        { id: "cup", s: "cup-coffee", x: 985, y: 1000, k: .42 },
        { id: "flaplever", s: "flap-lever", x: 1420, y: 1000, k: .45, split: 150 },
        { id: "gearlever", s: "gear-lever", x: 1222, y: 692, k: .42, split: 186 }
      ],
      screens: [["pfd", 268, 548, 230, 200], ["nd", 568, 548, 220, 200], ["eng", 853, 548, 230, 200], ["pfd", 1347, 548, 189, 200]],
      parts: {
        yoke: { ids: ["yoke"] },
        throttle: { ids: ["levers"] },
        flaps: { ids: ["flaplever"] },
        gear: { ids: ["gearlever"] }
      }
    },

    // ================================================================ a person (the family from the bus stop, big)
    human: {
      parent: "city", via: { group: "busstop" },
      w: 1500, h: 1000, paper: "#f5efe3", frame: [90, 10, 1320, 960], maxZoom: 4,
      items: [
        { slab: { kind: "oval", rx: 660, ry: 105, top: "#d8d0c0" }, x: 640, y: 902, ground: true },
        { group: "busstop", x: 150, y: 60, k: .72, swap: { woman: "woman-boy-xray" } },
        { id: "skinInset", scene: "skin", x: 855, y: 98, k: .145, lens: [978, 195, 162], leader: [722, 196], z: 2000 }
      ],
      parts: {
        muscles: { regions: [["woman", "muscles"]] },
        bones: { regions: [["woman", "bones"]] },
        lungs: { regions: [["woman", "lungs"]] },
        stomach: { regions: [["woman", "stomach"]] },
        heart: { regions: [["woman", "heart"]] },
        brain: { regions: [["woman", "brain"]] },
        skin: { regions: [["woman", "skin"]], ids: ["skinInset"], child: "skin", plus: [860, 300] }
      }
    },

    // ================================================================ skin
    skin: {
      parent: "human", via: { inset: "skinInset" },
      w: 1700, h: 1340, paper: "#f6efe4", frame: [0, 0, 1700, 1340], maxZoom: 4,
      items: [
        { id: "block", s: "skin-block", x: 40, y: 40, anchor: [0, 0], z: 0 },
        { id: "cellInset", scene: "cell", x: 1222, y: 319, k: .22, lens: [1420, 420, 232], leader: [1040, 425], z: 10 }
      ],
      parts: {
        fat: { regions: [["block", "fat"]] },
        surface: { regions: [["block", "surface"]] },
        vessels: { regions: [["block", "vessels"]] },
        nerves: { regions: [["block", "nerves"]] },
        sweat: { regions: [["block", "sweat"]] },
        hair: { regions: [["block", "hair"]] },
        cell: { ids: ["cellInset"], child: "cell" }
      }
    },

    // ================================================================ a cell: a cell body sticker + organelle stickers
    cell: {
      parent: "skin", via: { inset: "cellInset" },
      w: 1800, h: 920, paper: "#f3f0e4", frame: [0, 0, 1800, 920], maxZoom: 4, living: true,
      items: [
        { id: "body", s: "cell-body", x: 40, y: 40, anchor: [0, 0], z: -100 },
        { id: "er", s: "er", x: 640, y: 690, k: .7, z: 10, anim: "wobble", spin: .6 },
        { id: "nucleus", s: "nucleus", x: 830, y: 640, k: .72, z: 20, anim: "wobble", spin: .4 },
        { s: "centrioles", x: 1060, y: 610, k: .7, z: 25 },
        { id: "golgi", s: "golgi", x: 1240, y: 420, k: .62, z: 30, anim: "wobble" },
        { id: "bud", s: "golgi-bud", x: 1330, y: 470, k: .8, z: 31, anim: "jiggle", amp: 3 },
        { id: "ves1", s: "vesicle-2", x: 1390, y: 520, k: .45, z: 32, anim: "jiggle", amp: 5 },
        { id: "ves2", s: "vesicle-3", x: 1180, y: 520, k: .45, z: 32, anim: "jiggle", amp: 5 },
        { id: "m1", s: "mito-1", x: 380, y: 400, k: .5, rot: -12, z: 40, anim: "wobble" },
        { id: "m2", s: "mito-2", x: 330, y: 700, k: .45, rot: 18, z: 41, anim: "wobble" },
        { id: "m3", s: "mito-3", x: 1150, y: 800, k: .45, rot: -8, z: 42, anim: "wobble" },
        { id: "m4", s: "mito-4", x: 1560, y: 600, k: .42, rot: 25, z: 43, anim: "wobble" },
        { id: "m5", s: "mito-5", x: 700, y: 250, k: .45, rot: -20, flip: true, z: 44, anim: "wobble" },
        { id: "m6", s: "mito-1", x: 1450, y: 300, k: .38, rot: 160, z: 45, anim: "wobble" },
        { id: "lyso1", scene: "lysosome", x: 1290, y: 560, k: .12, z: 50, hit: "bubble" },
        { id: "lyso2", scene: "lysosome", x: 930, y: 250, k: .075, z: 50, hit: "bubble" },
        { id: "lyso3", scene: "lysosome", x: 950, y: 700, k: .065, z: 50, hit: "bubble" }
      ],
      parts: {
        cytoplasm: { regions: [["body", "inner"]] },
        membrane: { ring: "body" },
        er: { ids: ["er"] },
        nucleus: { ids: ["nucleus"] },
        golgi: { ids: ["golgi", "bud"] },
        mitochondria: { ids: ["m1", "m2", "m3", "m4", "m5", "m6"] },
        lysosome: { ids: ["lyso1", "lyso2", "lyso3"], child: "lysosome", plus: [1380, 740] }
      }
    },

    // ================================================================ a lysosome: a bubble sticker + its working parts
    lysosome: {
      parent: "cell", via: { inset: "lyso1" },
      w: 1700, h: 1430, paper: "#f4f0e2", frame: [60, 30, 1580, 1370], maxZoom: 4, living: true,
      items: [
        { id: "bubble", s: "lyso-bubble", x: 250, y: 120, anchor: [0, 0], z: -100 },
        // acid pumps sit in the membrane, heads outside (rot = angle from the centre + 90)
        { id: "p1", s: "pump", x: 850 + 540 * Math.cos(-1.05), y: 715 + 540 * Math.sin(-1.05), anchor: [111, 300], k: .5, rot: -60 + 90, z: 5 },
        { id: "p2", s: "pump2", x: 850 + 540 * Math.cos(.35), y: 715 + 540 * Math.sin(.35), anchor: [111, 300], k: .5, rot: 20 + 90, z: 5 },
        { id: "p3", s: "pump", x: 850 + 540 * Math.cos(2.62), y: 715 + 540 * Math.sin(2.62), anchor: [111, 300], k: .5, rot: 150 + 90, z: 5 },
        { id: "p4", s: "pump2", x: 850 + 540 * Math.cos(4.0), y: 715 + 540 * Math.sin(4.0), anchor: [111, 300], k: .5, rot: 229 + 90, z: 5 },
        // doors let the small pieces out
        { id: "d1", s: "door", x: 850 + 540 * Math.cos(1.75), y: 715 + 540 * Math.sin(1.75), anchor: [120, 135], k: .42, rot: 100 + 90, z: 5 },
        { id: "d2", s: "door2", x: 850 + 540 * Math.cos(-.2), y: 715 + 540 * Math.sin(-.2), anchor: [120, 135], k: .42, rot: -11 + 90, z: 5 },
        { id: "d3", s: "door", x: 850 + 540 * Math.cos(3.4), y: 715 + 540 * Math.sin(3.4), anchor: [120, 135], k: .42, rot: 195 + 90, z: 5 },
        { id: "pieces", code: "pieces", doors: [[850 + 600 * Math.cos(1.75), 715 + 600 * Math.sin(1.75), 100], [850 + 600 * Math.cos(-.2), 715 + 600 * Math.sin(-.2), -11], [850 + 600 * Math.cos(3.4), 715 + 600 * Math.sin(3.4), 195]], reach: 150, z: 4 },
        { id: "pieces1", s: "pieces", x: 1520, y: 760, k: .5, z: 3 },
        { id: "pieces2", s: "pieces", x: 690, y: 1370, k: .45, rot: 30, z: 3 },
        // inside: a worn-out mitochondrion and a germ being taken apart, and enzymes at work
        { id: "old", s: "old-mito", x: 690, y: 700, k: 1.0, z: 20, anim: "wobble", spin: 1 },
        { id: "germ", s: "germ", x: 1050, y: 1010, k: .95, z: 21, anim: "wobble", spin: 1 },
        { id: "e1", s: "enzyme-teal", x: 920, y: 560, k: .38, z: 30, anim: "jiggle", amp: 8 },
        { id: "e2", s: "enzyme-ochre", x: 1080, y: 690, k: .36, z: 30, anim: "jiggle", amp: 8 },
        { id: "e3", s: "enzyme-green", x: 520, y: 900, k: .36, z: 30, anim: "jiggle", amp: 8 },
        { id: "e4", s: "enzyme-rust", x: 800, y: 1000, k: .34, z: 30, anim: "jiggle", amp: 8 },
        { id: "e5", s: "enzyme-teal", x: 1180, y: 480, k: .32, z: 30, anim: "jiggle", amp: 8, flip: true },
        { id: "e6", s: "enzyme-rust", x: 640, y: 420, k: .32, z: 30, anim: "jiggle", amp: 8, flip: true },
        { id: "e7", s: "enzyme-ochre", x: 1240, y: 900, k: .3, z: 30, anim: "jiggle", amp: 8, flip: true },
        { id: "e8", s: "enzyme-green", x: 900, y: 820, k: .3, z: 30, anim: "jiggle", amp: 8 },
        // delivery bubbles from the Golgi drift in from outside
        { id: "v1", s: "delivery", path: [[1640, 260], [1330, 420]], speed: 14, k: .55, z: 40 },
        { id: "v2", s: "delivery", path: [[120, 1250], [380, 1060]], speed: 12, offset: .5, k: .5, z: 40 },
        { id: "v3", s: "delivery", x: 1500, y: 1180, k: .45, z: 40, anim: "jiggle", amp: 5 }
      ],
      parts: {
        membrane: { ring: "bubble" },
        enzymes: { ids: ["e1", "e2", "e3", "e4", "e5", "e6", "e7", "e8"] },
        pump: { ids: ["p1", "p2", "p3", "p4"] },
        old: { ids: ["old"] },
        germ: { ids: ["germ"] },
        delivery: { ids: ["v3"] },
        recycle: { ids: ["d1", "d2", "d3", "pieces1", "pieces2"] }
      }
    }
  }
};
