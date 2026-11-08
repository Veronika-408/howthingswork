// v4 · Encyclopedia page: the layout of every page. Pages are 1600 × 1200 units of white paper; every painted
// subject is a cut-out (see assets.js, written by tools/build.py) placed at x, y with scale s. Part outlines are
// written in the cut-out's own pixels and moved onto the page here, so moving a subject moves its outlines.
// A child space's hero is the very same cut-out as its drawing on the parent page (in an inset or in place),
// so every dive lands exactly: spot.axis / plateAxis are the corners of that picture on both pages.
(() => {
  const A = window.V4_ASSETS;
  const W = 1600, H = 1200, PAPER = "#fbf9f4";
  // the edit test: ?edit=before shows the pages as they were before the two edits (three people; no coffee cup)
  const BEFORE = /[?&]edit=before\b/.test(location.search);

  // ---------------------------------------------------------------- helpers
  const el = (a, x, y, s, more = {}) => ({ k: "img", a, x, y, s, ...more });
  const at = (e, u, v) => [+(e.x + u * e.s).toFixed(1), +(e.y + v * e.s).toFixed(1)];
  const poly = (e, pts) => pts.map(([u, v]) => at(e, u, v));
  const ell = (e, cx, cy, rx, ry, rot = 0, n = 22) => poly(e, Array.from({ length: n }, (_, i) => {
    const t = i / n * Math.PI * 2, c = Math.cos(rot * Math.PI / 180), s = Math.sin(rot * Math.PI / 180);
    const x = rx * Math.cos(t), y = ry * Math.sin(t);
    return [cx + x * c - y * s, cy + x * s + y * c];
  }));
  const outline = e => A[e.a].outline.map(p => poly(e, p));
  // a ring along an outline (the hole is the outline shrunk towards its middle, wound the other way)
  const ring = (pts, k = .92) => {
    const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
    return [pts, pts.map(([x, y]) => [+(cx + (x - cx) * k).toFixed(1), +(cy + (y - cy) * k).toFixed(1)]).reverse()];
  };
  const box = e => [e.x, e.y, e.x + A[e.a].w * e.s, e.y + A[e.a].h * e.s];
  const corners = e => { const b = box(e); return [[b[0], b[1]], [b[2], b[3]]]; };
  // the outline of an inset, as a hit area
  const insetPoly = (i, n = 28) => i.shape === "box"
    ? [[i.cx - i.w / 2, i.cy - i.h / 2], [i.cx + i.w / 2, i.cy - i.h / 2], [i.cx + i.w / 2, i.cy + i.h / 2], [i.cx - i.w / 2, i.cy + i.h / 2]]
    : Array.from({ length: n }, (_, k) => [+(i.cx + (i.rx || i.r) * Math.cos(k / n * 6.2832)).toFixed(1), +(i.cy + (i.ry || i.r) * Math.sin(k / n * 6.2832)).toFixed(1)]);
  // a cut-out fitted inside an inset (the corners of a cut-out are empty paper, so it may overfill a little)
  function inset(a, cx, cy, r, more = {}) {
    const i = { k: "inset", a, cx, cy, r, ...more };
    const rx = i.rx || r, ry = i.ry || r, w = A[a].w, h = A[a].h, fill = i.fill || 1.08;
    const s = fill / Math.sqrt((w / 2 / rx) ** 2 + (h / 2 / ry) ** 2);
    i.box = { x: cx - w * s / 2, y: cy - h * s / 2 + (i.dy || 0), s };
    return i;
  }
  const plusOn = i => [+(i.cx + (i.rx || i.r || i.w / 2) * .72).toFixed(1), +(i.cy + (i.ry || i.r || i.h / 2) * .72).toFixed(1)];
  const insetEl = i => ({ x: i.box.x, y: i.box.y, s: i.box.s, a: i.a });   // the picture inside an inset, as an element
  // labels in a column (side L or R at x = col) or a row (T or B at y = col), kept apart, in anchor order
  function column(labels, side, col, gap = 44, lo = 150, hi = H - 70) {
    const L = labels.filter(l => l.side === side).sort((a, b) => side === "L" || side === "R" ? a.at[1] - b.at[1] : a.at[0] - b.at[0]);
    const v = L.map(l => side === "L" || side === "R" ? l.at[1] : l.at[0]);
    for (let k = 1; k < v.length; k++) v[k] = Math.max(v[k], v[k - 1] + gap);
    for (let k = v.length - 1; k >= 0; k--) { if (k === v.length - 1) v[k] = Math.min(v[k], hi); else v[k] = Math.min(v[k], v[k + 1] - gap); }
    for (let k = 0; k < v.length; k++) v[k] = Math.max(v[k], lo + k * gap);
    L.forEach((l, k) => {
      if (side === "L") { l.to = [col, v[k]]; l.align = "right"; }
      else if (side === "R") { l.to = [col, v[k]]; l.align = "left"; }
      else { l.to = [v[k], col]; l.align = "center"; }
    });
  }
  const lay = (labels, cols) => { for (const [side, c, gap, lo, hi] of cols) column(labels, side, c, gap, lo, hi); return labels; };

  // ================================================================ the town: a picture map of separate landmarks
  const C = {
    plane: el("plane", 600, 112, .6, { hero: true, ground: [[160, 662, 48, 9, .35], [510, 668, 190, 15, .32], [760, 640, 700, 46, .10]] }),
    tower: el("tower", 228, 296, .34, { ground: [[98, 490, 70, 8]] }),
    terminal: el("terminal", 306, 384, .34, { ground: [[409, 243, 420, 12, .22]] }),
    river: el("riverbridge", 36, 560, .5, { shadow: false }),
    church: el("church", 878, 610, .29, { ground: [[194, 495, 200, 10]] }),
    house: el("house", 1338, 596, .29, { ground: [[120, 470, 120, 9]] }),
    houses: el("houses", 1420, 632, .29, { ground: [[218, 392, 220, 10]] }),
    tree: el("tree", 860, 860, .3, { ground: [[212, 410, 140, 12]] }),
    conifer: el("conifer", 1488, 862, .28, { ground: [[138, 460, 90, 10]] }),
    shelter: el("shelter", 1004, 780, .3, { ground: [[735, 905, 740, 26, .22]] }),
    family: el("family", 1150, 869, .18, { ground: [[520, 1008, 340, 16, .4]] }),
    // edit 1: two more people waiting, to the left of the family, feet on the same line (y 1051), a touch smaller
    waiting: el("waiting", 1023, 879, .175, { ground: [[385, 982, 330, 16, .4]] }),
  };
  // the x-ray woman (human page) sits exactly on the woman in the family picture: x-ray pixel (u, v) is
  // family pixel (375 + u / 1.5, 20 + v / 1.5) (she was painted from an enlarged crop of this very picture)
  const XR = { dx: 375, dy: 20, k: 1 / 1.5 };
  const xrayIn = (fam, u, v) => at(fam, XR.dx + u * XR.k, XR.dy + v * XR.k);

  const city = {
    w: W, h: H, paper: PAPER,
    page: {
      head: [64, 96], kicker: "A picture map", folio: 2, section: "Our town",
      els: [C.tower, C.terminal, C.river, C.church, C.house, C.houses, C.conifer, C.tree, C.plane, C.shelter, ...(BEFORE ? [] : [C.waiting]), C.family],
      labels: lay([
        { part: "plane", at: at(C.plane, 820, 330), side: "T" },
        { part: "bridge", at: at(C.river, 400, 300), side: "B" },
        { part: "river", at: at(C.river, 860, 800), side: "B" },
        { part: "people", at: at(C.family, 520, 120), side: "T" },
      ], []),
    },
    parts: [
      { id: "plane", polys: outline(C.plane), child: "plane", plus: at(C.plane, 980, 330) },
      { id: "people", polys: [...outline(C.family), ...(BEFORE ? [] : outline(C.waiting))], child: "human", plus: at(C.family, 1010, 560) },
      { id: "river", polys: [poly(C.river, [[610, 10], [800, 10], [910, 110], [1010, 210], [1050, 320], [1035, 440], [1062, 478], [520, 478],
        [570, 380], [640, 280], [700, 180], [690, 100]]), poly(C.river, [[450, 575], [1075, 575], [1060, 700], [1040, 800], [1150, 890], [1060, 980],
        [700, 1005], [650, 990], [600, 910], [510, 840], [455, 760], [460, 640]])] },
      { id: "bridge", polys: [poly(C.river, [[0, 520], [120, 480], [395, 125], [425, 95], [430, 140], [1140, 480], [1360, 480], [1510, 450], [1510, 505],
        [1350, 560], [1300, 580], [405, 560], [400, 630], [305, 615], [315, 560], [0, 600]])] },
    ],
    assets: ["plane", "tower", "terminal", "riverbridge", "church", "house", "houses", "tree", "conifer", "shelter", "family", "waiting"].map(n => A[n].src),
  };
  // labels of the town: hand placed (a map is not a column page)
  city.page.labels[0].to = [1180, 92]; city.page.labels[0].align = "center";
  city.page.labels[1].to = [200, 1120]; city.page.labels[1].align = "center";
  city.page.labels[2].to = [560, 1138]; city.page.labels[2].align = "center";
  city.page.labels[3].to = [1240, 735]; city.page.labels[3].align = "center";

  // ================================================================ the jumbo jet
  const PL = el("plane", 118, 318, .92, { hero: true, ground: [[160, 662, 48, 9, .35], [510, 668, 190, 15, .32], [760, 640, 700, 46, .10]] });
  const deckInset = inset("flightdeck", 268, 370, 0, { rx: 200, ry: 142, from: at(PL, 262, 282), fromR: 30, fill: 1.06 });
  const planePage = {
    parent: "city",
    spot: { axis: corners(C.plane), plateAxis: corners(PL) },
    w: W, h: H, paper: PAPER,
    page: {
      head: [64, 96], kicker: "Boeing 747-400, cut open", folio: 3, section: "Machines that fly",
      els: [PL, deckInset],
      scales: [{ x: 1540 - 1325 * 20 / 70.7, y: 112, len: 1325 * 20 / 70.7, text: "20 metres" }],
      labels: [
        { part: "cockpit", at: [deckInset.cx + 120, deckInset.cy - 130], to: [520, 236], align: "left" },
        { part: "cabin", at: at(PL, 860, 420), to: [960, 250], align: "center" },
        { part: "tail", at: at(PL, 1380, 170), to: [1470, 250], align: "center" },
        { part: "engine", at: at(PL, 690, 760), to: [640, 1150], align: "center" },
        { part: "wing", at: at(PL, 1180, 700), to: [1350, 1060], align: "center" },
        { part: "gear", at: at(PL, 410, 655), to: [300, 1040], align: "center" },
        { part: "hold", at: at(PL, 340, 520), to: [110, 920], align: "left" },
      ],
    },
    parts: [
      { id: "cockpit", polys: [poly(PL, [[150, 292], [190, 248], [240, 228], [346, 228], [352, 322], [228, 328], [150, 322]]), insetPoly(deckInset)], child: "pilots", plus: plusOn(deckInset) },
      { id: "cabin", polys: [poly(PL, [[355, 236], [590, 240], [602, 320], [1195, 314], [1290, 330], [1292, 452], [1200, 462], [240, 470], [230, 332], [355, 326]])] },
      { id: "hold", polys: [poly(PL, [[215, 474], [560, 470], [560, 556], [215, 556]]), poly(PL, [[830, 458], [1198, 458], [1200, 528], [930, 520], [830, 520]])] },
      { id: "wing", polys: [poly(PL, [[545, 515], [700, 490], [1000, 575], [1250, 650], [1440, 720], [1490, 660], [1482, 745], [1360, 772], [1150, 722],
        [960, 690], [870, 690], [860, 650], [700, 640], [560, 560]]), poly(PL, [[478, 60], [540, 22], [560, 60], [700, 190], [800, 276], [640, 280], [560, 200]])] },
      { id: "engine", polys: [poly(PL, [[522, 690], [600, 676], [862, 688], [862, 802], [700, 832], [530, 832]]), poly(PL, [[905, 760], [950, 735], [1100, 740],
        [1132, 800], [1090, 862], [960, 872], [905, 822]]), poly(PL, [[420, 120], [522, 108], [532, 192], [430, 192]]), poly(PL, [[470, 192], [562, 180], [592, 242], [480, 244]])] },
      { id: "gear", polys: [poly(PL, [[118, 540], [205, 540], [200, 662], [118, 662]]), poly(PL, [[352, 588], [668, 588], [668, 678], [352, 678]])] },
      { id: "tail", polys: [poly(PL, [[1200, 300], [1400, 8], [1486, 8], [1442, 292]]), poly(PL, [[1340, 306], [1532, 318], [1532, 340], [1340, 350]]),
        poly(PL, [[1130, 228], [1245, 236], [1240, 272], [1150, 250]])] },
    ],
    assets: [A.plane.src, A.flightdeck.src, A["flightdeck"].shadow.src],
  };

  // ================================================================ the flight deck
  const FD = el("flightdeck", 216, 262, .78, { hero: true });
  // edit 2: the captain's coffee cup, on the side console at his left elbow (flight-deck pixels: saucer's bottom
  // centre at 163, 603, 52 px across). A sticker of the flight deck, so it shows wherever the flight deck is drawn.
  const CUP = { u: 163, v: 603, w: 52 };
  const cupOn = e => {
    if (BEFORE) return [];
    const s = CUP.w / A.cup.w * e.s;
    return [{ a: "cup", x: e.x + CUP.u * e.s - A.cup.w * s / 2, y: e.y + CUP.v * e.s - A.cup.h * s, s,
      ground: [A.cup.w / 2, A.cup.h * .93, A.cup.w * .5, A.cup.h * .1, .35] }];
  };
  FD.stickers = cupOn(FD);
  deckInset.stickers = cupOn(insetEl(deckInset));
  const pedalsInset = { k: "inset", a: "pedals", cx: 150, cy: 1000, r: 128, from: at(FD, 395, 870), fromR: 26, box: { x: 150 - 128, y: 1000 - 128, s: 256 / 1024 } };
  // the captain's view: the same window the flying page shows, small
  const DRIVE_WIN = { x: 40, y: 168, w: 1050, h: 700, r: 30 };
  const viewInset = { k: "inset", shape: "box", cx: 1406, cy: 346, w: 300, h: 200, round: 12, paint: "window", from: at(FD, 330, 420), fromR: 34 };
  viewInset.win = { x: viewInset.cx - 150, y: viewInset.cy - 100, w: 300, h: 200, r: 30 * 300 / 1050 };
  const pilots = {
    parent: "plane",
    spot: { axis: corners(insetEl(deckInset)), plateAxis: corners(FD) },
    w: W, h: H, paper: PAPER,
    page: {
      head: [64, 96], kicker: "Seen from behind the pilots' seats", folio: 4, section: "Machines that fly",
      els: [FD, pedalsInset, viewInset],
      scales: [{ x: 1540 - 1168 / 5.6, y: 112, len: 1168 / 5.6, text: "1 metre", n: 2 }],
      labels: [
        { part: "overhead", at: at(FD, 760, 120), to: [800, 214], align: "center" },
        { part: "windows", at: at(FD, 1240, 330), to: [1290, 520], align: "left" },
        { part: "screens", at: at(FD, 1015, 445), to: [1420, 610], align: "left" },
        { part: "firstofficer", at: at(FD, 1170, 420), to: [1420, 690], align: "left" },
        { part: "captain", at: at(FD, 330, 520), to: [180, 640], align: "right" },
        { part: "yoke", at: at(FD, 490, 505), to: [180, 560], align: "right" },
        { part: "throttle", at: at(FD, 745, 600), to: [800, 1130], align: "center" },
        { part: "pedals", at: [pedalsInset.cx, pedalsInset.cy - 128], to: [pedalsInset.cx, 832], align: "center" },
        { text: "You fly!", part: "yoke", at: [viewInset.cx, viewInset.cy + 100], to: [viewInset.cx, viewInset.cy + 132], align: "center" },
      ],
    },
    parts: [
      { id: "captain", polys: [poly(FD, [[170, 330], [275, 330], [410, 322], [470, 500], [590, 520], [585, 700], [510, 862], [240, 872], [170, 700], [165, 520], [270, 480]]),
        ...(BEFORE ? [] : [ell(FD, CUP.u, CUP.v - 22, 34, 28)])] },
      { id: "firstofficer", polys: [poly(FD, [[1090, 330], [1250, 350], [1262, 500], [1322, 560], [1338, 720], [1300, 872], [1020, 872], [930, 700], [925, 545], [1040, 500], [1100, 420]])] },
      { id: "overhead", polys: [poly(FD, [[455, 26], [1065, 26], [1042, 242], [478, 242]])] },
      { id: "windows", polys: [poly(FD, [[165, 425], [215, 265], [330, 245], [275, 420]]), poly(FD, [[352, 238], [1150, 238], [1160, 332], [352, 332]]),
        poly(FD, [[1172, 245], [1292, 262], [1336, 425], [1236, 415]])] },
      { id: "screens", polys: [poly(FD, [[436, 404], [1066, 404], [1066, 496], [436, 496]])] },
      { id: "throttle", polys: [poly(FD, [[684, 548], [802, 548], [812, 702], [690, 702]])] },
      { id: "pedals", polys: [insetPoly(pedalsInset)] },
      { id: "yoke", polys: [poly(FD, [[400, 486], [470, 478], [572, 488], [578, 548], [480, 542], [404, 522]]), poly(FD, [[930, 488], [1040, 478], [1112, 490], [1112, 532],
        [1000, 548], [934, 548]]), insetPoly(viewInset)], child: "drive", plus: [viewInset.cx + 150, viewInset.cy - 100] },
    ],
    assets: [A.flightdeck.src, A.flightdeck.shadow.src, A.pedals.src, A["drive-frame"].src, A.sky.src, A.yoke.src, A.levers.src, A.cup.src],
  };

  // ================================================================ you fly: the captain's window and two live diagrams
  const drive = {
    parent: "pilots", kind: "drive",
    spot: { axis: [[viewInset.win.x, viewInset.win.y], [viewInset.win.x + viewInset.win.w, viewInset.win.y + viewInset.win.h]],
      plateAxis: [[DRIVE_WIN.x, DRIVE_WIN.y], [DRIVE_WIN.x + DRIVE_WIN.w, DRIVE_WIN.y + DRIVE_WIN.h]] },
    w: W, h: 1000, paper: PAPER,
    page: {
      head: [64, 96], kicker: "How a pilot flies", folio: 5, section: "Machines that fly",
      win: DRIVE_WIN,
      behind: { x: 1130, y: 222, w: 420, h: 250, caption: "From behind: the wings tip" },
      side: { x: 1130, y: 572, w: 420, h: 250, caption: "From the side: the nose lifts" },
      labels: [
        { part: "yoke", at: [DRIVE_WIN.x + 560 * DRIVE_WIN.w / 1536, DRIVE_WIN.y + 780 * DRIVE_WIN.w / 1536], to: [DRIVE_WIN.x + 250, DRIVE_WIN.y + DRIVE_WIN.h + 42], align: "center" },
        { part: "throttle", at: [DRIVE_WIN.x + 1240 * DRIVE_WIN.w / 1536, DRIVE_WIN.y + 790 * DRIVE_WIN.w / 1536], to: [DRIVE_WIN.x + 880, DRIVE_WIN.y + DRIVE_WIN.h + 42], align: "center" },
        { part: "flaps", at: [1130 + 420 * .5 + 30, 572 + 250 * .58 + 14], to: [1440, 880], align: "center" },
        { part: "gear", at: [1130 + 420 * .5 - 30, 572 + 250 * .58 + 24], to: [1240, 880], align: "center" },
      ],
    },
    parts: [
      { id: "yoke", polys: [[[DRIVE_WIN.x + 330, DRIVE_WIN.y + 470], [DRIVE_WIN.x + 640, DRIVE_WIN.y + 470], [DRIVE_WIN.x + 640, DRIVE_WIN.y + 700], [DRIVE_WIN.x + 330, DRIVE_WIN.y + 700]]] },
      { id: "throttle", polys: [[[DRIVE_WIN.x + 740, DRIVE_WIN.y + 500], [DRIVE_WIN.x + 960, DRIVE_WIN.y + 500], [DRIVE_WIN.x + 960, DRIVE_WIN.y + 700], [DRIVE_WIN.x + 740, DRIVE_WIN.y + 700]]] },
      { id: "flaps", polys: [[[1350, 700], [1460, 700], [1460, 780], [1350, 780]]] },
      { id: "gear", polys: [[[1200, 720], [1345, 720], [1345, 810], [1200, 810]]] },
    ],
    assets: [A["drive-frame"].src, A.sky.src, A.yoke.src, A.levers.src, A.rear747.src, A.side747.src],
  };

  // ================================================================ the human body: the woman from the bus stop, see-through
  const XW = el("woman-xray", 606, 92, .72, { hero: true, ground: [[255, 1478, 150, 14, .38]] });
  const skinInset = inset("skin", 300, 820, 175, { from: at(XW, 52, 790), fromR: 26, fill: 1.0 });
  const human = {
    parent: "city",
    spot: { axis: [xrayIn(C.family, 0, 0), xrayIn(C.family, A["woman-xray"].w, A["woman-xray"].h)],
      plateAxis: [at(XW, 0, 0), at(XW, A["woman-xray"].w, A["woman-xray"].h)] },
    w: W, h: H, paper: PAPER,
    page: {
      head: [64, 96], kicker: "A see-through body", folio: 6, section: "The human body",
      els: [XW, skinInset],
      scales: [{ x: 1540 - 1071 / 1.68 * .5, y: 112, len: 1071 / 1.68 * .5, text: "50 centimetres", n: 2 }],
      labels: lay([
        { part: "brain", at: at(XW, 258, 55), side: "R" },
        { part: "lungs", at: at(XW, 325, 330), side: "R" },
        { part: "heart", at: at(XW, 290, 380), side: "R" },
        { part: "stomach", at: at(XW, 312, 505), side: "R" },
        { part: "bones", at: at(XW, 325, 960), side: "R" },
        { part: "muscles", at: at(XW, 70, 420), side: "L" },
        
      ], [["R", 1110, 70, 130, 1050], ["L", 470, 70, 300, 700]]).concat([{ part: "skin", at: [skinInset.cx, skinInset.cy - 175], to: [skinInset.cx, 602], align: "center" }]),
    },
    parts: [
      { id: "brain", polys: [ell(XW, 258, 58, 58, 40)] },
      { id: "lungs", polys: [poly(XW, [[165, 292], [255, 300], [258, 455], [165, 458], [158, 380]]), poly(XW, [[288, 296], [348, 300], [356, 455], [300, 460], [312, 420], [305, 340]])] },
      { id: "heart", polys: [ell(XW, 284, 380, 34, 40, -20)] },
      { id: "stomach", polys: [ell(XW, 300, 505, 52, 36, -15)] },
      { id: "bones", polys: [poly(XW, [[400, 250], [440, 250], [470, 500], [505, 690], [520, 780], [470, 790], [440, 690], [405, 500]]),
        poly(XW, [[300, 680], [365, 680], [345, 1000], [350, 1300], [300, 1300], [295, 1000]])] },
      { id: "muscles", polys: [poly(XW, [[60, 290], [130, 300], [120, 500], [75, 700], [15, 700], [30, 500]]), poly(XW, [[130, 690], [235, 690], [240, 1000], [215, 1310], [160, 1310], [135, 1000]])] },
      { id: "skin", polys: [ell(XW, 258, 150, 52, 52), poly(XW, [[12, 740], [80, 740], [80, 870], [12, 870]]), insetPoly(skinInset)], child: "skin", plus: plusOn(skinInset) },
    ],
    assets: [A["woman-xray"].src, A.skin.src, A.skin.shadow.src],
  };

  // ================================================================ skin
  const SK = el("skin", 176, 250, .82, { hero: true });
  const cellInset = inset("cell", 1418, 300, 158, { from: at(SK, 1160, 292), fromR: 22, fill: 1.12 });
  const skin = {
    parent: "human",
    spot: { axis: corners(insetEl(skinInset)), plateAxis: corners(SK) },
    w: W, h: H, paper: PAPER,
    page: {
      head: [64, 96], kicker: "A tiny piece of skin, magnified", folio: 7, section: "The human body",
      els: [SK, cellInset],
      scales: [{ x: 1540 - 1082 / 3, y: 112, len: 1082 / 3, text: "1 millimetre", n: 4 }],
      labels: lay([
        { part: "surface", at: at(SK, 60, 300), side: "L" },
        { part: "nerves", at: at(SK, 124, 380), side: "L" },
        { part: "vessels", at: at(SK, 62, 560), side: "L" },
        { part: "fat", at: at(SK, 60, 900), side: "L" },
        { part: "hair", at: at(SK, 1028, 330), side: "R" },
        { part: "sweat", at: at(SK, 700, 640), side: "R" },
        { part: "cell", at: [cellInset.cx - 60, cellInset.cy + 150], side: "R" },
      ], [["L", 150, 60, 420, 1100], ["R", 1310, 60, 560, 1000]]),
    },
    parts: [
      { id: "surface", polys: [poly(SK, [[10, 232], [105, 108], [1308, 108], [1310, 320], [1225, 350], [1000, 356], [10, 360]])] },
      { id: "fat", polys: [poly(SK, [[10, 742], [1215, 742], [1310, 600], [1312, 880], [1215, 996], [10, 996]])] },
      { id: "vessels", polys: [poly(SK, [[130, 980], [250, 862], [450, 840], [700, 858], [900, 858], [1100, 828], [1222, 818], [1226, 852], [1100, 872], [900, 902],
        [700, 892], [450, 880], [250, 912], [182, 982]]), poly(SK, [[40, 330], [80, 330], [115, 560], [100, 780], [60, 780], [70, 560]]),
        poly(SK, [[1110, 380], [1160, 380], [1170, 600], [1140, 800], [1100, 800], [1120, 600]])] },
      { id: "nerves", polys: [poly(SK, [[95, 352], [152, 352], [152, 400], [118, 600], [92, 600], [104, 400]]), poly(SK, [[804, 358], [858, 358], [858, 402], [792, 560], [760, 560], [810, 410]])] },
      { id: "sweat", polys: [poly(SK, [[640, 230], [702, 230], [690, 540], [728, 600], [732, 660], [690, 732], [600, 748], [528, 702], [514, 620], [540, 560], [630, 540]])] },
      { id: "hair", polys: [poly(SK, [[150, 722], [160, 600], [240, 330], [330, 160], [440, 30], [490, 4], [470, 42], [360, 192], [300, 330], [272, 600], [258, 722]]),
        poly(SK, [[868, 702], [888, 600], [958, 330], [1078, 128], [1200, 4], [1216, 16], [1110, 142], [1022, 330], [992, 600], [982, 722]])] },
      { id: "cell", polys: [ell(SK, 1160, 292, 24, 18), insetPoly(cellInset)], child: "cell", plus: plusOn(cellInset) },
    ],
    assets: [A.skin.src, A.skin.shadow.src, A.cell.src, A.cell.shadow.src],
  };

  // ================================================================ a cell
  const CE = el("cell", 300, 236, .85, { hero: true });
  // the lysosome of the cell, the one that opens: the lysosome cut-out itself, laid over the painted one
  const LY_IN_CELL = { u: 1036, v: 740, d: 104 };     // its centre and diameter in the cell's pixels
  const lyS = LY_IN_CELL.d / 910;                       // the lysosome cut-out's round body is about 910 px across
  const lyBody = { cx: 555, cy: 525 };                  // the centre of its round body in its own pixels
  CE.stickers = [{ a: "lysosome", x: CE.x + (LY_IN_CELL.u - lyBody.cx * lyS) * CE.s, y: CE.y + (LY_IN_CELL.v - lyBody.cy * lyS) * CE.s, s: lyS * CE.s }];
  const lysoInset = inset("lysosome", 1452, 948, 136, { from: at(CE, LY_IN_CELL.u, LY_IN_CELL.v), fromR: 58 * .85, fill: 1.15 });
  const cell = {
    parent: "skin",
    spot: { axis: corners(insetEl(cellInset)), plateAxis: corners(CE) },
    w: W, h: H, paper: PAPER,
    page: {
      head: [64, 96], kicker: "One skin cell, cut open", folio: 8, section: "Life",
      els: [CE, lysoInset],
      scales: [{ x: 1540 - 1091 / 3, y: 112, len: 1091 / 3, text: "10 micrometres", n: 2 }],
      labels: lay([
        { part: "nucleus", at: at(CE, 650, 440), side: "T" },
        { part: "mitochondria", at: at(CE, 470, 170), side: "L" },
        { part: "er", at: at(CE, 280, 520), side: "L" },
        { part: "membrane", at: at(CE, 60, 640), side: "L" },
        { part: "cytoplasm", at: at(CE, 820, 800), side: "B" },
        { part: "golgi", at: at(CE, 1040, 380), side: "R" },
        { part: "lysosome", at: [lysoInset.cx - 90, lysoInset.cy - 125], side: "R" },
      ], [["L", 262, 60, 260, 1100], ["R", 1400, 60, 330, 740], ["T", 214, 200, 300, 1300], ["B", 1150, 200, 300, 1100]]),
    },
    parts: [
      { id: "membrane", polys: ring(outline(CE)[0], .93) },
      { id: "cytoplasm", polys: [poly(CE, [[200, 250], [420, 90], [700, 40], [1000, 60], [1180, 200], [1240, 420], [1200, 700], [1000, 820], [940, 880], [660, 760],
        [380, 860], [180, 800], [100, 600], [110, 400]])] },
      { id: "er", polys: [poly(CE, [[226, 520], [262, 448], [380, 330], [470, 250], [600, 198], [760, 208], [852, 258], [872, 322], [852, 478], [942, 500], [948, 560],
        [872, 622], [752, 662], [722, 732], [560, 702], [400, 682], [300, 622], [220, 560]])] },
      { id: "nucleus", polys: [ell(CE, 650, 425, 192, 165)] },
      { id: "golgi", polys: [poly(CE, [[858, 250], [1062, 238], [1192, 368], [1202, 472], [1100, 492], [980, 502], [898, 452], [858, 372]])] },
      { id: "mitochondria", polys: [ell(CE, 472, 172, 100, 62, -28), ell(CE, 890, 157, 92, 58, 25), ell(CE, 170, 455, 70, 88, 30), ell(CE, 276, 662, 118, 74, 30), ell(CE, 998, 628, 112, 68, -28)] },
      { id: "lysosome", polys: [ell(CE, LY_IN_CELL.u, LY_IN_CELL.v, 56, 56), ell(CE, 690, 120, 50, 50), ell(CE, 296, 312, 46, 46), ell(CE, 450, 755, 48, 48), insetPoly(lysoInset)], child: "lysosome", plus: plusOn(lysoInset) },
    ],
    assets: [A.cell.src, A.cell.shadow.src, A.lysosome.src, A.lysosome.shadow.src],
  };

  // ================================================================ a lysosome
  const LY = el("lysosome", 288, 160, .92, { hero: true });
  const lysosome = {
    parent: "cell",
    spot: { axis: corners(insetEl(lysoInset)), plateAxis: corners(LY) },
    w: W, h: H, paper: PAPER,
    page: {
      head: [64, 96], kicker: "One lysosome, cut open", folio: 9, section: "Life",
      els: [LY],
      scales: [{ x: 1540 - 837 / 5, y: 112, len: 837 / 5, text: "0.1 micrometre", n: 2 }],
      labels: lay([
        { part: "delivery", at: at(LY, 70, 100), side: "L" },
        { part: "old", at: at(LY, 220, 470), side: "L" },
        { part: "pump", at: at(LY, 85, 530), side: "L" },
        { part: "enzymes", at: at(LY, 400, 640), side: "L" },
        { part: "membrane", at: at(LY, 985, 405), side: "R" },
        { part: "recycle", at: at(LY, 1060, 490), side: "R" },
        { part: "germ", at: at(LY, 820, 620), side: "R" },
      ], [["L", 230, 70, 230, 1100], ["R", 1330, 70, 300, 1000]]),
    },
    parts: [
      { id: "membrane", polys: ring(ell(LY, 555, 525, 470, 470, 0, 48), .9) },
      { id: "enzymes", polys: [[430, 215, 42], [552, 225, 38], [662, 215, 40], [728, 265, 30], [800, 318, 42], [625, 322, 38], [695, 390, 42], [862, 405, 36], [905, 475, 30],
        [570, 485, 46], [765, 465, 36], [660, 545, 42], [525, 575, 36], [390, 640, 52], [240, 655, 36], [292, 720, 38], [372, 735, 30], [490, 665, 36], [455, 770, 46],
        [520, 835, 32], [390, 828, 32], [645, 825, 42], [855, 720, 32]].map(([u, v, r]) => ell(LY, u, v, r, r, 0, 12)) },
      { id: "old", polys: [ell(LY, 345, 440, 198, 132, -25)] },
      { id: "germ", polys: [poly(LY, [[525, 752], [540, 690], [680, 620], [800, 560], [900, 538], [928, 580], [860, 650], [700, 722], [600, 792], [540, 792]])] },
      { id: "pump", polys: [ell(LY, 540, 70, 48, 68), ell(LY, 882, 190, 62, 58), ell(LY, 88, 530, 70, 52), ell(LY, 545, 950, 48, 68)] },
      { id: "delivery", polys: [ell(LY, 75, 105, 68, 68), ell(LY, 215, 165, 60, 58)] },
      { id: "recycle", polys: [poly(LY, [[928, 318], [1012, 318], [1012, 378], [928, 378]]), poly(LY, [[962, 462], [1100, 462], [1100, 515], [962, 515]]),
        poly(LY, [[940, 600], [1050, 600], [1050, 665], [940, 665]])] },
    ],
    assets: [A.lysosome.src, A.lysosome.shadow.src],
  };

  for (const sp of [city, planePage, pilots, drive, human, skin, cell, lysosome]) sp.assets = [...new Set(sp.assets)];
  window.LAB_DATA = {
    variant: { id: "v4-encyclopedia-page", name: "Encyclopedia page",
      approach: "No backgrounds: every space is a white book page of separately painted cut-out subjects, with magnifier insets and labels drawn by code." },
    root: "city",
    spaces: { city, plane: planePage, pilots, drive, human, skin, cell, lysosome },
  };
  // for the layout tools (tools/look.mjs)
  window.V4_LAYOUT = { C, PL, FD, XW, SK, CE, LY, deckInset, skinInset, cellInset, lysoInset, viewInset, pedalsInset, DRIVE_WIN };
})();
