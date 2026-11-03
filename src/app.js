(() => {
  // A grey painted city (the world) holds subjects in colour. Each subject is its own encyclopedia
  // plate, placed in the world at { x, y, k }. One camera moves through it all: the camera is kept in
  // the active space's coordinates (world pixels, or the subject plate's pixels) and converted on apply.
  const SUBJ = window.SUBJECTS;              // id -> { PLATE, PARTS, HOTSPOTS, ORDER, ZOOM, TILES, base, place, outline, how, ... }
  const WORLD = window.WORLD;                // { w, h, src, tiles, soon, sprites, clouds, steam, focus }
  const SIDS = Object.keys(SUBJ);
  const TILE_PX = 1536;                      // width of every detail tile image

  const $ = s => document.querySelector(s);
  const stage = $("#stage"), worldEl = $("#world"), tip = $("#tip"), body = document.body;
  const NS = "http://www.w3.org/2000/svg";
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const VIDEO = new URLSearchParams(location.search).has("video");
  const svg = (tag, attrs = {}, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
  const el = (tag, cls, parent) => { const e = document.createElement(tag); if (cls) e.className = cls; if (parent) parent.appendChild(e); return e; };
  const bbox = polys => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const pts of polys) for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    return { x0, y0, x1, y1 };
  };
  const polyD = polys => polys.map(pts => "M" + pts.map(p => p.map(v => +v.toFixed(2)).join(",")).join("L") + "Z").join("");
  // analytics: window.track exists only on the live site (see analytics_tag in build.py)
  const track = (event, props) => { try { window.track && window.track(event, props); } catch (e) {} };
  // every machine and part counts as its own page, so "which parts do people look at" is a page report
  const page = path => track("$pageview", { $current_url: location.origin + path, $pathname: path });
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const smooth = (a, b, t) => { const u = Math.min(1, Math.max(0, (t - a) / (b - a))); return u * u * (3 - 2 * u); };

  // ======================================================================= the world
  worldEl.style.width = WORLD.w + "px";
  worldEl.style.height = WORLD.h + "px";
  const art = el("div", "world-art", worldEl);
  Object.assign(art.style, { width: WORLD.w + "px", height: WORLD.h + "px" });
  // The paintings (city, plates and their detail tiles) are drawn into one screen-sized canvas each frame.
  // A giant transformed page made the browser re-raster while zooming and flash blank paper.
  const view = el("canvas", "view");
  stage.insertBefore(view, worldEl);
  const vg = view.getContext("2d");
  const base = new Image();
  base.decoding = "async";
  base.src = WORLD.src;
  base.addEventListener("load", () => requestDraw(), { once: true });
  const wtiles = (WORLD.tiles || []).map(t => {
    const [x, y, w, h] = t.rect;
    const img = new Image(); img.decoding = "async";
    const wt = { ...t, x, y, w, h, img, loaded: false, wanted: false, a: 0, target: 0, on: (WORLD.baseScale || 2) * .95 };
    img.addEventListener("load", () => { wt.loaded = true; requestDraw(); }, { once: true });
    return wt;
  });
  const loadWT = t => { if (!t.wanted) { t.wanted = true; t.img.src = t.src; } };
  // subjects live in their own layer: in the city they are part of the drawing, so their plates only appear inside
  const subjEl = el("div", "subjects");
  stage.insertBefore(subjEl, worldEl.nextSibling);          // above the city, below the labels
  subjEl.style.transformOrigin = "0 0";

  // ---------- life in the city: clouds, traffic, boats, steam ----------
  const life = [];
  for (const c of WORLD.clouds || []) {
    const img = el("img", "sprite", art); Object.assign(img, { src: c.src, alt: "", draggable: false });
    Object.assign(img.style, { width: c.w + "px", height: c.h + "px" });
    life.push({ kind: "cloud", img, ...c, x: c.x0 });
  }
  for (const v of WORLD.sprites || []) {
    const img = el("img", "sprite", art); Object.assign(img, { src: v.src, alt: "", draggable: false });
    Object.assign(img.style, { width: v.w + "px", height: v.h + "px" });
    const seg = []; let L = 0;
    for (let i = 1; i < v.path.length; i++) { const d = Math.hypot(v.path[i][0] - v.path[i - 1][0], v.path[i][1] - v.path[i - 1][1]); seg.push(d); L += d; }
    life.push({ kind: "mover", img, ...v, seg, L, s: (v.phase || 0) * L });
  }
  const along = (m, s) => {
    let i = 0; s = ((s % m.L) + m.L) % m.L;
    while (i < m.seg.length - 1 && s > m.seg[i]) { s -= m.seg[i]; i++; }
    const a = m.path[i], b = m.path[i + 1], t = Math.min(1, s / m.seg[i]);
    return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, dx: b[0] - a[0], dy: b[1] - a[1] };
  };
  let lifeLast = 0;
  function tickLife(now) {
    requestAnimationFrame(tickLife);
    if (space || reduceMotion || document.hidden) { lifeLast = now; return; }
    const dt = Math.min(.05, (now - lifeLast) / 1000 || 0); lifeLast = now;
    const t = now / 1000;
    for (const o of life) {
      if (o.kind === "cloud") {
        o.x += o.speed * dt;
        if (o.x > WORLD.w + 40) o.x = -o.w - 40;
        o.img.style.transform = `translate(${o.x.toFixed(1)}px, ${o.y}px)`;
        if (o.alpha) o.img.style.opacity = o.alpha;
      } else {
        o.s += o.speed * dt;
        const p = along(o, o.s);
        const u = ((o.s % o.L) + o.L) % o.L;
        o.img.style.opacity = Math.min(1, u / 60, (o.L - u) / 60).toFixed(3);   // ease in and out at the ends of a road
        if (o.iso) {
          const rk = o.rock ? Math.sin(t * (o.rockHz || .6) * Math.PI * 2 + (o.phase || 0) * 7) * o.rock : 0;
          o.img.style.transform = `translate(${(p.x - o.w / 2).toFixed(1)}px, ${(p.y - o.h * .7).toFixed(1)}px) rotate(${rk.toFixed(2)}deg) scaleX(${o.flip ? -1 : 1})`;
          continue;
        }
        const flip = p.dx > 0 ? -1 : 1;                           // sprites are painted facing left
        const ang = Math.atan2(p.dy, Math.abs(p.dx)) * 180 / Math.PI * (p.dx > 0 ? 1 : -1) * .9;
        const rock = o.rock ? Math.sin(t * (o.rockHz || .6) * Math.PI * 2 + (o.phase || 0) * 7) * o.rock : 0;
        const bob = o.rock ? Math.sin(t * (o.rockHz || .6) * Math.PI * 2 + 1.3) * o.rock * .6 : 0;
        o.img.style.transform = `translate(${(p.x - o.w / 2).toFixed(1)}px, ${(p.y - o.h * .85 + bob).toFixed(1)}px) rotate(${(ang + rock).toFixed(2)}deg) scaleX(${flip})`;
      }
    }
  }
  requestAnimationFrame(tickLife);

  // ---------- world hotspots ----------
  const wov = svg("svg", { class: "wov", viewBox: `0 0 ${WORLD.w} ${WORLD.h}`, width: WORLD.w, height: WORLD.h });
  const wlabels = $("#wlabels");
  const wspots = {};
  function worldSpot(key, polys, cls, name) {
    const p = svg("path", { d: polyD(polys), class: "whot " + cls, tabindex: 0, role: "button", "aria-label": name }, wov);
    p.dataset.world = key;
    wspots[key] = { path: p, polys, box: bbox(polys), name };
    return p;
  }
  for (const s of WORLD.soon || []) worldSpot("soon:" + s.id, s.polys, "soon", `${s.name}, not built yet`);

  // ======================================================================= subjects
  const tileFileOf = S => key => `${S.base}zoom/${key.replace("/", "__")}.webp`;
  for (const sid of SIDS) {
    const S = SUBJ[sid];
    S.id = sid;
    const P = S.PLATE, order = S.ORDER, tileFile = tileFileOf(S);
    S.tileFile = tileFile;
    const root = el("div", "subject", subjEl);
    root.dataset.subject = sid;
    Object.assign(root.style, { width: P.w + "px", height: P.h + "px" });
    const plate = new Image();
    plate.decoding = "async";
    plate.src = S.base + "plate.webp";
    plate.addEventListener("load", () => requestDraw(), { once: true });
    root.setAttribute("aria-label", P.alt || S.title);
    const ov = svg("svg", { class: "ov", viewBox: `0 0 ${P.w} ${P.h}`, width: P.w, height: P.h }, root);
    const leadersG = svg("g", { class: "leaders" }, ov), hotsG = svg("g", { class: "hots" }, ov), subsG = svg("g", { class: "subs" }, ov);
    const notes = el("div", "notes", root);
    const intro = el("div", "intro", root);
    intro.innerHTML = "<h1><small></small></h1><p></p>";
    intro.querySelector("small").textContent = S.kicker;
    intro.querySelector("h1").append(document.createTextNode(S.title));
    intro.querySelector("p").textContent = P.intro;
    if (S.credit) {                                            // the builder's name, on the plate itself
      const by = el("p", "byline", intro), a = el("a", "", null);
      by.append("by ");
      Object.assign(a, { href: S.credit.url || "#", target: "_blank", rel: "noopener", textContent: S.credit.name });
      by.appendChild(a);
    }
    Object.assign(intro.style, { left: P.introBox.x + "px", top: P.introBox.y + "px", width: P.introBox.w + "px" });
    Object.assign(S, { root, plate, ov, holePolys: null, leadersG, hotsG, subsG, notes, intro });

    // nodes: level 2 = parts of the subject, level 3 = parts inside a part
    const nodes = S.nodes = {};
    order.forEach((id, i) => {
      const s = S.HOTSPOTS[id], f = s.frame;
      nodes[id] = { ...S.PARTS.find(p => p.id === id), id, level: 2, parent: null, index: i, shape: s, polys: s.polys,
        box: f ? { x0: f[0], y0: f[1], x1: f[2], y1: f[3] } : bbox(s.polys), children: [] };
    });
    for (const [pid, z] of Object.entries(S.ZOOM || {})) {
      const t = S.TILES[pid];
      if (!t || !nodes[pid]) continue;
      const [tx, ty, tw] = t.rect, k = tw / TILE_PX;
      z.subs.forEach((sub, i) => {
        const id = `${pid}.${sub.id}`;
        const polys = sub.polys.map(pts => pts.map(([x, y]) => [tx + x * k, ty + y * k]));
        nodes[id] = { ...sub, id, key: `${pid}/${sub.id}`, level: 3, parent: pid, index: i, polys, box: bbox(polys), children: [] };
        nodes[pid].children.push(id);
      });
    }
    const els = S.els = {};
    const makePath = (node, cls, parentEl) => {
      const p = svg("path", { d: polyD(node.polys), class: cls, tabindex: 0, role: "button", "aria-label": node.name }, parentEl);
      p.dataset.id = node.id;
      return p;
    };
    for (const id of order) {
      const node = nodes[id], s = node.shape;
      const path = makePath(node, "hot", hotsG);
      const note = el("button", "note" + (s.label.align === "right" ? " right" : ""), notes);
      note.type = "button"; note.dataset.id = id; note.tabIndex = -1;
      Object.assign(note.style, { left: s.label.x + "px", top: s.label.y + "px", width: s.label.w + "px" });
      note.innerHTML = "<b></b><span></span>";
      note.querySelector("b").textContent = node.name;
      note.querySelector("span").textContent = node.note;
      const line = svg("polyline", { class: "leader" }, leadersG);
      const dot = svg("circle", { class: "leader-dot", r: 2.6, cx: s.anchor[0], cy: s.anchor[1] }, leadersG);
      els[id] = { path, note, line, dot };
    }
    for (const node of Object.values(nodes)) {
      if (node.level !== 3) continue;
      let g = subsG.querySelector(`[data-parent="${node.parent}"]`);
      if (!g) { g = svg("g", {}, subsG); g.dataset.parent = node.parent; }
      const label = el("button", "sublabel", $("#sublabels"));
      label.type = "button"; label.dataset.id = node.id; label.dataset.subject = sid; label.tabIndex = -1;
      label.textContent = node.name;
      els[node.id] = { path: makePath(node, "subhot", g), label };
    }
    // detail tiles: repainted copies of small areas, faded in once the camera outgrows the layer below
    S.tiles = Object.entries(S.TILES || {}).map(([key, t]) => {
      const [x, y, w, h] = t.rect;
      const img = new Image(); img.decoding = "async";
      const parentDensity = t.level === 2 ? 1 : TILE_PX / S.TILES[key.split("/")[0]].rect[2];
      const tile = { key, level: t.level, x, y, w, h, img, on: parentDensity * 1.15, loaded: false, wanted: false, a: 0, target: 0 };
      img.addEventListener("load", () => { tile.loaded = true; requestDraw(); }, { once: true });
      return tile;
    });
    // drawing order: bigger repaints first, smaller (more detailed) ones on top, deepest level last
    S.tiles.sort((a, b) => (a.level - b.level) || (b.w - a.w));

    // its drawing in the city: a quiet outline and a small "+" that says it opens
    worldSpot("subject:" + sid, S.spot.polys, "subject-spot", S.title);
    const lab = el("button", "wplus", wlabels);
    lab.type = "button"; lab.dataset.world = "subject:" + sid; lab.tabIndex = -1;
    lab.setAttribute("aria-label", "Open " + S.title);
    wspots["subject:" + sid].label = lab;
  }
  worldEl.appendChild(wov);

  const loadTile = (S, t) => { if (!t.wanted) { t.wanted = true; t.img.src = S.tileFile(t.key); } };
  function drawLeaders(S) {
    for (const id of S.ORDER) {
      const s = S.nodes[id].shape, { note, line } = S.els[id];
      const x = s.label.x, y = s.label.y, w = s.label.w, h = note.offsetHeight;
      const [ax, ay] = s.anchor;
      let sx, sy;
      if (s.label.from === "bottom") { sx = s.label.align === "right" ? x + w : x + Math.min(w * .3, 40); sy = y + h + 3; }
      else if (s.label.from === "top") { sx = s.label.align === "right" ? x + w : x + Math.min(w * .3, 40); sy = y - 3; }
      else if (s.label.from === "left") { sx = x - 5; sy = y + 9; }
      else { sx = x + w + 5; sy = y + 9; }
      line.setAttribute("points", [[sx, sy], ...(s.elbow ? [s.elbow] : []), [ax, ay]].map(p => p.join(",")).join(" "));
    }
  }

  // ======================================================================= camera
  let space = null;                           // null = the world, otherwise the active subject's id
  let S = null;                               // the active subject
  let current = null;                         // focused node in the active subject
  // screen = (x, y) + rotate(r) * (s * point), point in the active space (world pixels or the subject's plate)
  const cam = { x: 0, y: 0, s: 1, r: 0 };
  let anim = null;
  const rot = (deg, [x, y]) => { const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); return [c * x - s * y, s * x + c * y]; };
  let worldCam = null;                        // where the city camera was left when we went into a subject
  const toScreen = (c, [x, y]) => { const [a, b] = rot(c.r || 0, [x * c.s, y * c.s]); return [c.x + a, c.y + b]; };

  function apply() {
    const wc = space ? worldCam : cam;
    if (wc) worldEl.style.transform = `translate(${wc.x}px, ${wc.y}px) rotate(${wc.r || 0}deg) scale(${wc.s})`;
    if (space) subjEl.style.transform = `translate(${cam.x}px, ${cam.y}px) scale(${cam.s})`;
    wov.style.setProperty("--wk", (1 / (wc ? wc.s : 1)).toFixed(5));
    if (S) S.ov.style.setProperty("--k", (1 / cam.s).toFixed(5));
    const fit = fitView();
    $("#zoom-out").disabled = !space && cam.s <= fit.s * 1.01;
    $("#reset").disabled = cam.s <= fit.s * 1.01 && Math.abs(cam.x - fit.x) < 2 && Math.abs(cam.y - fit.y) < 2;
    updateTiles(); updateWorldTiles(); placeSubLabels(); placeWorldLabels(); requestDraw();
  }

  function viewport() {
    const W = stage.clientWidth, H = stage.clientHeight;
    const P = S ? S.PLATE : null;
    const full = P ? Math.min((W - 48) / P.w, (H - 96) / P.h) : 1;
    return { W, H, phone: W <= 760, compact: P ? full < 0.6 : W <= 760 };
  }
  function subjectFit(T) {
    const { W, H } = viewport();
    const full = Math.min((W - 48) / T.PLATE.w, (H - 96) / T.PLATE.h), compact = full < .6;
    const r = compact ? T.PLATE.art : { x: 0, y: 0, w: T.PLATE.w, h: T.PLATE.h };
    const padX = compact ? 8 : 24, padTop = compact ? 92 : 20, padBottom = compact ? 132 : 76;
    const s = Math.min((W - padX * 2) / r.w, (H - padTop - padBottom) / r.h);
    return { s, x: (W - r.w * s) / 2 - r.x * s, y: padTop + (H - padTop - padBottom - r.h * s) / 2 - r.y * s };
  }
  // the whole city fits; on tall phones it fills the height a little more and centres on the subjects
  function worldFit() {
    const { W, H, phone } = viewport();
    const contain = Math.min((W - 24) / WORLD.w, (H - 24) / WORLD.h);
    // phones and portrait tablets: the map fills most of the height and pans sideways, opening on the jet and the tram
    const tall = phone || H > W * 1.05;                    // phones and portrait tablets
    const s = tall ? Math.max(contain, (H * (phone ? .74 : .7)) / WORLD.h) : contain;
    const f = WORLD.focus || [WORLD.w / 2, WORLD.h / 2];
    let x = W / 2 - f[0] * s, y = (H - WORLD.h * s) / 2;
    x = Math.min(0 + (W - WORLD.w * s > 0 ? (W - WORLD.w * s) / 2 : 0), Math.max(W - WORLD.w * s - Math.max(0, (W - WORLD.w * s) / 2), x));
    return { s, x, y, r: 0 };
  }
  const fitView = () => space ? subjectFit(S) : worldFit();

  // frame a part in the space the reading panel leaves free
  function focusView(id) {
    const { W, H, phone } = viewport();
    const n = S.nodes[id], b = n.box;
    const panel = $("#panel").getBoundingClientRect();
    const area = phone ? { x: 0, y: 0, w: W, h: H - panel.height } : { x: 0, y: 0, w: W - panel.width, h: H };
    const pad = n.level === 3 ? .22 : phone ? .18 : .26;
    const bw = (b.x1 - b.x0) * (1 + pad * 2), bh = (b.y1 - b.y0) * (1 + pad * 2);
    const fit = fitView().s;
    let s = Math.min(area.w / bw, area.h / bh);
    s = n.level === 3 ? Math.min(Math.max(s, fit * 4), fit * 18) : Math.max(Math.min(s, fit * 4.2), fit * 1.3);
    const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
    return { s, x: area.x + area.w / 2 - cx * s, y: area.y + area.h / 2 - cy * s };
  }

  // fly in log-scale so zooming feels even; dip out a little on long hops, like a camera crane
  function flyTo(target, ms = 1100, onFrame) {
    if (anim) cancelAnimationFrame(anim.raf);
    // no will-change: a promoted layer keeps its old raster while zooming and re-rasters (flashes) when dropped
    if (reduceMotion) ms = 0;
    const from = { r: 0, ...cam }, to = { r: 0, ...target };
    const { W, H } = viewport();
    // the point under the screen centre, in the active space
    const centre = c => { const [x, y] = rot(-c.r, [W / 2 - c.x, H / 2 - c.y]); return { x: x / c.s, y: y / c.s }; };
    const c0 = centre(from), c1 = centre(to);
    const dist = Math.hypot(c1.x - c0.x, c1.y - c0.y);
    const viewSpan = Math.min(W / from.s, W / target.s);
    const dip = onFrame ? 0 : Math.min(.5, Math.max(0, (dist / viewSpan - .6) * .35));
    const ls0 = Math.log(from.s), ls1 = Math.log(target.s);
    const t0 = performance.now();
    return new Promise(resolve => {
      const step = now => {
        const t = ms ? Math.min(1, (now - t0) / ms) : 1, e = ease(t);
        // centre follows the zoom (geometric), so the target point stays still under the fly-in
        const s = Math.exp(ls0 + (ls1 - ls0) * e - dip * Math.sin(Math.PI * e));
        const g = Math.abs(ls1 - ls0) > .05 ? (1 / s - 1 / from.s) / (1 / target.s - 1 / from.s) : e;
        const u = onFrame ? Math.min(1, Math.max(0, g)) : e;
        const r = from.r + (to.r - from.r) * e;
        const [ox, oy] = rot(r, [(c0.x + (c1.x - c0.x) * u) * s, (c0.y + (c1.y - c0.y) * u) * s]);
        cam.s = s; cam.r = r;
        cam.x = W / 2 - ox;
        cam.y = H / 2 - oy;
        if (onFrame) onFrame(e, t);
        apply();
        if (t < 1) anim.raf = requestAnimationFrame(step);
        else { Object.assign(cam, to); apply(); anim = null; resolve(); }
      };
      anim = { raf: requestAnimationFrame(step) };
    });
  }

  function clampCam() {
    const { W, H } = viewport();
    const fit = fitView();
    const w0 = space ? S.PLATE.w : WORLD.w, h0 = space ? S.PLATE.h : WORLD.h;
    const maxS = space ? fit.s * 18 : fit.s * 6;
    cam.s = Math.min(Math.max(cam.s, fit.s), maxS);
    const w = w0 * cam.s, h = h0 * cam.s;
    const slack = space ? .25 : .04;
    const slackX = Math.max(0, (W - w) / 2) + W * slack, slackY = Math.max(0, (H - h) / 2) + H * slack;
    cam.x = Math.min(slackX, Math.max(W - w - slackX, cam.x));
    cam.y = Math.min(slackY, Math.max(H - h - slackY, cam.y));
  }
  function zoomAt(factor, sx, sy) {
    if (anim) { cancelAnimationFrame(anim.raf); anim = null; }
    const wx = (sx - cam.x) / cam.s, wy = (sy - cam.y) / cam.s;
    cam.s *= factor;
    clampCam();
    cam.x = sx - wx * cam.s; cam.y = sy - wy * cam.s;
    clampCam();
    const fit = fitView();
    if (cam.s <= fit.s * 1.001) Object.assign(cam, fit);   // fully zoomed out: the whole subject, centred
    apply();
  }

  // ---------- tiles: which repaints should show (the renderer fades them) ----------
  function updateTiles() {
    if (!S) return;
    const { W, H } = viewport();
    const vx0 = -cam.x / cam.s, vy0 = -cam.y / cam.s, vx1 = (W - cam.x) / cam.s, vy1 = (H - cam.y) / cam.s;
    for (const t of S.tiles) {
      const visible = t.x < vx1 && t.x + t.w > vx0 && t.y < vy1 && t.y + t.h > vy0;
      // while a part is focused only its own repaints show, so neighbouring repaints never flicker in and out
      // under the camera; browsing freely, a repaint fades in once the plate is magnified past its pixels
      const chain = current && (t.key === part(current) || t.key === S.nodes[current].key);
      const need = current ? (chain ? 1 : 0) : Math.min(1, Math.max(0, (cam.s - t.on * .7) / (t.on * .3)));
      if (visible && need > 0) loadTile(S, t);
      t.target = visible && t.loaded ? need : 0;
    }
  }
  function updateWorldTiles() {
    const wc = space ? worldCam : cam;
    if (!wc) return;
    const { W, H } = viewport(), ws = wc.s;
    const vx0 = -wc.x / ws, vy0 = -wc.y / ws, vx1 = (W - wc.x) / ws, vy1 = (H - wc.y) / ws;
    for (const t of wtiles) {
      const visible = wc.r ? true : t.x < vx1 && t.x + t.w > vx0 && t.y < vy1 && t.y + t.h > vy0;
      const need = Math.min(1, Math.max(0, (ws - t.on * .75) / (t.on * .25)));
      if (visible && need > 0) loadWT(t);
      t.target = visible && t.loaded ? need : 0;
    }
  }

  // ---------- the renderer ----------
  let worldAlpha = 1, subjAlpha = 0, shadeA = 0, drawRaf = 0, drawLast = 0;
  const SHADE = "rgba(249, 247, 242, 0.62)";
  function requestDraw() { if (!drawRaf) drawRaf = requestAnimationFrame(draw); }
  function sizeView() {
    const dpr = Math.min(3, devicePixelRatio || 1), W = stage.clientWidth, H = stage.clientHeight;
    if (view.width !== Math.round(W * dpr) || view.height !== Math.round(H * dpr)) {
      view.width = Math.round(W * dpr); view.height = Math.round(H * dpr);
      view.style.width = W + "px"; view.style.height = H + "px";
    }
    return dpr;
  }
  const ready = im => im.complete && im.naturalWidth > 0;
  function draw(now) {
    drawRaf = 0;
    const dt = Math.min(.1, ((now || performance.now()) - (drawLast || now || 0)) / 1000); drawLast = now;
    const dpr = sizeView();
    vg.setTransform(1, 0, 0, 1, 0, 0);
    vg.clearRect(0, 0, view.width, view.height);
    vg.imageSmoothingEnabled = true; vg.imageSmoothingQuality = "high";
    let moving = false;
    const step = t => { // fade each repaint towards its target over ~0.4 s
      if (t.a !== t.target) { t.a = t.target > t.a ? Math.min(t.target, t.a + dt / .4) : Math.max(t.target, t.a - dt / .4); moving = true; }
    };
    const wc = space ? worldCam : cam;
    if (worldAlpha > 0 && wc && ready(base)) {
      vg.setTransform(dpr, 0, 0, dpr, 0, 0);
      vg.translate(wc.x, wc.y); vg.rotate((wc.r || 0) * Math.PI / 180); vg.scale(wc.s, wc.s);
      vg.globalAlpha = worldAlpha;
      vg.drawImage(base, 0, 0, WORLD.w, WORLD.h);
      for (const t of wtiles) { step(t); if (t.a > 0 && t.loaded) { vg.globalAlpha = worldAlpha * t.a; vg.drawImage(t.img, t.x, t.y, t.w, t.h); } }
    } else for (const t of wtiles) step(t);
    if (S && subjAlpha > 0 && ready(S.plate)) {
      vg.setTransform(dpr, 0, 0, dpr, 0, 0);
      vg.translate(cam.x, cam.y); vg.scale(cam.s, cam.s);
      vg.globalAlpha = subjAlpha;
      vg.drawImage(S.plate, 0, 0, S.PLATE.w, S.PLATE.h);
      for (const t of S.tiles) { step(t); if (t.a > 0 && t.loaded) { vg.globalAlpha = subjAlpha * t.a; vg.drawImage(t.img, t.x, t.y, t.w, t.h); } }
      // the dim veil around the focused part, with the part cut out of it
      const st = body.classList.contains("focused") && S.holePolys ? 1 : 0;
      if (shadeA !== st) { shadeA = st > shadeA ? Math.min(1, shadeA + dt / .6) : Math.max(0, shadeA - dt / .6); moving = true; }
      if (shadeA > 0) {
        vg.globalAlpha = subjAlpha * shadeA;
        vg.fillStyle = SHADE;
        vg.beginPath();
        vg.rect(-cam.x / cam.s - 10, -cam.y / cam.s - 10, view.width / dpr / cam.s + 20, view.height / dpr / cam.s + 20);
        for (const pts of S.holePolys || []) pts.forEach(([x, y], i) => i ? vg.lineTo(x, y) : vg.moveTo(x, y));
        vg.fill("evenodd");
      }
    } else if (S) for (const t of S.tiles) step(t);
    vg.globalAlpha = 1;
    if (moving) requestDraw();
  }

  // ---------- labels ----------
  function placeSubLabels() {
    const pid = S && current ? part(current) : null;
    const { W, H, phone } = viewport();
    const panel = $("#panel").getBoundingClientRect();
    const maxX = phone ? W : W - panel.width, maxY = phone ? H - panel.height : H;
    const placed = [];
    for (const lab of document.querySelectorAll(".sublabel")) {
      const node = S && lab.dataset.subject === S.id ? S.nodes[lab.dataset.id] : null;
      const show = node && node.parent === pid && node.id !== current;
      if (!show) { lab.classList.remove("on"); continue; }
      const b = node.box;
      const x = (b.x0 + b.x1) / 2 * cam.s + cam.x;
      let y = (b.y0 + b.y1) / 2 * cam.s + cam.y;
      const inside = x > 40 && x < maxX - 40 && y > 30 && y < maxY - 30;
      lab.classList.toggle("on", inside);
      if (!inside) continue;
      const w = lab.offsetWidth || 120, h = (lab.offsetHeight || 30) + 6;
      const hits = yy => placed.some(r => Math.abs(r.x - x) < (r.w + w) / 2 + 4 && Math.abs(r.y - yy) < h);
      for (const d of [0, 1, -1, 2, -2, 3, -3]) if (!hits(y + d * h)) { y += d * h; break; }
      placed.push({ x, y, w });
      lab.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`;
    }
  }
  // each coloured subject carries a small "+" in the city, so it is obvious it opens
  function placeWorldLabels() {
    const wc = space ? worldCam : cam;
    for (const sid of SIDS) {
      const w = wspots["subject:" + sid];
      if (!w || !w.label || !wc) continue;
      const [x, y] = toScreen(wc, SUBJ[sid].spot.plus);
      w.label.classList.toggle("on", !space && !body.classList.contains("entering"));
      w.label.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`;
    }
  }

  // ======================================================================= entering and leaving subjects
  const part = id => (S.nodes[id].level === 2 ? id : S.nodes[id].parent);
  const siblings = id => (S.nodes[id].level === 2 ? S.ORDER : S.nodes[S.nodes[id].parent].children);

  function setSpace(id, { arrive = true } = {}) {
    if (S) S.root.classList.remove("active");
    space = id; S = id ? SUBJ[id] : null;
    if (S && arrive) S.root.classList.add("active");
    body.classList.toggle("in-subject", !!S && arrive);
    body.classList.toggle("world-level", !S);
    for (const v of ["--paper", "--wall"]) body.style.setProperty(v, S ? S.paper : WORLD.paper);   // the page is the plate's own paper
    $("#mh-title").textContent = S ? S.title : "howthings.work";
    $("#mh-sub").textContent = S ? (S.credit ? `by ${S.credit.name} · ` : "") + S.hint : "Pick something in colour.";
    $("#hint").textContent = S ? (matchMedia("(hover: none)").matches ? "Tap" : "Click") + " any part to look closer" : "";
    $("#index").replaceChildren(...(S ? S.ORDER.map(id => crumbButton(S.nodes[id].name, () => focus(id, { fromKey: true })))
      : SIDS.map(sid => crumbButton(SUBJ[sid].title, () => enter(sid)))));
    setCompact();
  }

  function revealSubject() {
    const T = S;
    T.root.classList.add("active", "revealing");
    body.classList.add("in-subject");
    requestAnimationFrame(() => requestAnimationFrame(() => T.root.classList.remove("revealing")));
    if (!T.leadersDrawn) { drawLeaders(T); T.leadersDrawn = true; }
  }

  // Entering is a shared-element move: the city camera flies (and turns) until the drawn tram or plane sits
  // exactly where its encyclopedia plate will be, then the city dissolves into the plate.
  function landing(T) {
    const t = subjectFit(T);
    const [p0, p1] = T.spot.plateAxis, [w0, w1] = T.spot.axis;
    const pa = [t.x + p0[0] * t.s, t.y + p0[1] * t.s], pb = [t.x + p1[0] * t.s, t.y + p1[1] * t.s];
    const lenP = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]), lenW = Math.hypot(w1[0] - w0[0], w1[1] - w0[1]);
    const r = (Math.atan2(pb[1] - pa[1], pb[0] - pa[0]) - Math.atan2(w1[1] - w0[1], w1[0] - w0[0])) * 180 / Math.PI;
    const s = lenP / lenW;
    const mw = [(w0[0] + w1[0]) / 2, (w0[1] + w1[1]) / 2], mp = [(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2];
    const [ox, oy] = rot(r, [mw[0] * s, mw[1] * s]);
    return { world: { s, r, x: mp[0] - ox, y: mp[1] - oy }, plate: { ...t, r: 0 } };
  }
  const fade = (ms, f) => new Promise(res => {
    if (reduceMotion) { f(1); return res(); }
    const t0 = performance.now();
    const step = now => { const u = Math.min(1, (now - t0) / ms); f(u * u * (3 - 2 * u)); u < 1 ? requestAnimationFrame(step) : res(); };
    requestAnimationFrame(step);
  });

  async function enter(sid, { instant = false } = {}) {
    if (space === sid || body.classList.contains("entering")) return;
    const T = SUBJ[sid];
    hideTip(); dismissWorldHint(); whover(null);
    prefetchSubject(T, true);
    const L = landing(T);
    if (instant || reduceMotion) {
      worldCam = L.world; setSpace(sid); Object.assign(cam, L.plate);
      worldEl.style.opacity = 0; subjEl.style.opacity = 1; worldAlpha = 0; subjAlpha = 1; revealSubject(); apply();
    } else {
      body.classList.add("entering");
      await flyTo(L.world, 1300);
      worldCam = { ...cam };
      setSpace(sid, { arrive: false });
      Object.assign(cam, L.plate);
      subjEl.style.opacity = 0; subjAlpha = 0;
      T.root.classList.add("active", "revealing");
      apply();
      await T.plate.decode().catch(() => {});
      await fade(520, u => { subjEl.style.opacity = u.toFixed(3); worldEl.style.opacity = (1 - u).toFixed(3); subjAlpha = u; worldAlpha = 1 - u; requestDraw(); });
      body.classList.remove("entering");
      revealSubject();
      apply();
    }
    try { history.replaceState(null, "", "#" + sid); } catch (e) {}
    page("/" + sid); track("machine_opened", { machine: sid });
    showHintOnce();
  }

  async function leave() {
    if (!space || body.classList.contains("entering")) return;
    const T = S, was = space;
    if (current) unfocus(true, { noFly: true });
    body.classList.remove("focused");
    body.classList.add("entering");
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
    track("back_to_city", { machine: was }); page("/");
    const L = landing(T);
    await flyTo(L.plate, 600);
    worldCam = L.world;
    apply();
    await fade(480, u => { subjEl.style.opacity = (1 - u).toFixed(3); worldEl.style.opacity = u.toFixed(3); subjAlpha = 1 - u; worldAlpha = u; requestDraw(); });
    T.root.classList.remove("active");
    body.classList.remove("in-subject");
    setSpace(null);
    Object.assign(cam, L.world);
    worldCam = null;
    apply();
    await flyTo(worldFit(), 1200);
    body.classList.remove("entering");
    apply();
    const spot = wspots["subject:" + was];
    if (spot) spot.path.focus({ preventScroll: true });
  }

  // ======================================================================= focus / panel (inside a subject)
  function setLit(id, on) {
    if (!S || !id || !S.els[id]) return;
    for (const e of Object.values(S.els[id])) e.classList.toggle("lit", on);
  }
  function crumbButton(label, onClick) {
    const b = document.createElement("button");
    b.type = "button"; b.textContent = label;
    b.addEventListener("click", onClick);
    return b;
  }
  const HOW = () => (S && S.how ? S.how.map : {});
  const openHow = () => {
    const mech = HOW()[current];
    if (!mech) return;
    track("book_opened", { machine: S.id, page: mech, from: current });
    window.BOOK.open(mech, { fromSrc: S.tileFile(S.nodes[current].level === 3 ? S.nodes[current].key : part(current)) });
  };

  function fillPanel(id) {
    const p = S.nodes[id], sibs = siblings(id);
    const crumbs = [crumbButton("The city", () => leave()), crumbButton(S.whole, () => unfocus(true))];
    if (p.level === 3) crumbs.push(crumbButton(S.nodes[p.parent].name, () => focus(p.parent)));
    const here = document.createElement("span"); here.textContent = p.name; here.setAttribute("aria-current", "location");
    crumbs.push(here);
    $("#crumbs").replaceChildren(...crumbs);
    $("#p-zone").textContent = p.level === 2 ? p.zone : `Inside: ${S.nodes[p.parent].name}`;
    $("#p-count").textContent = `${p.index + 1} of ${sibs.length}`;
    $("#p-name").textContent = p.name;
    $("#p-lead").textContent = p.lead;
    const nums = $("#p-numbers");
    nums.hidden = !(p.numbers && p.numbers.length);
    nums.replaceChildren(...(p.numbers || []).map(([v, l]) => {
      const d = document.createElement("div");
      const st = document.createElement("strong"); st.textContent = v;
      const sp = document.createElement("span"); sp.textContent = l;
      d.append(st, sp); return d;
    }));
    $("#p-facts").replaceChildren(...p.facts.map(f => { const li = document.createElement("li"); li.textContent = f; return li; }));
    const spot = $("#p-spot");
    spot.hidden = !p.spot;
    if (p.spot) { spot.innerHTML = "<b>Can you find it?</b> "; spot.append(document.createTextNode(p.spot)); }
    const mech = HOW()[id], how = $("#how");
    how.hidden = !(mech && window.BOOK && window.BOOK.has(mech));
    if (!how.hidden) { $("#how-title").textContent = window.MECHANISMS[mech].title; $("#how-img").src = S.how.thumb[mech]; }
    $("#deeper").hidden = !p.children.length;
    $("#deeper-list").replaceChildren(...p.children.map(c => crumbButton(S.nodes[c].name, () => focus(c))));
    const fig = $("#figure"), img = $("#p-img");
    fig.hidden = p.level !== 2;
    if (p.level === 2) {
      // swap only once the new picture is decoded, so the panel never blanks between parts
      const src = `${S.base}detail/${id}.webp`, pre = new Image(), sid = S.id;
      pre.src = src;
      pre.decode().then(() => { if (current === id && space === sid) { img.src = src; img.classList.add("ready"); } },
                        () => { if (current === id && space === sid) fig.hidden = true; });
      img.alt = `Close-up painting: ${p.name}`;
    }
    const i = sibs.indexOf(id);
    $("#prev-name").textContent = S.nodes[sibs[(i - 1 + sibs.length) % sibs.length]].name;
    $("#next-name").textContent = S.nodes[sibs[(i + 1) % sibs.length]].name;
    $("#close").setAttribute("aria-label", p.level === 3 ? `Back to ${S.nodes[p.parent].name}` : `Back to ${S.whole.toLowerCase()}`);
    $("#panel-scroll").scrollTop = 0;
  }
  const setHole = id => { if (S) { if (id) S.holePolys = S.nodes[id].polys; requestDraw(); } };
  function showSubs(id) {
    const pid = id ? part(id) : null;
    for (const g of S.subsG.children) g.classList.toggle("on", g.dataset.parent === pid);
  }

  function focus(id, { fromKey = false } = {}) {
    if (!S || !S.nodes[id]) return;
    hideTip();
    if (current && S.els[current]) S.els[current].path.classList.remove("current");
    current = id;
    S.els[id].path.classList.add("current");
    body.dataset.level = S.nodes[id].level;
    const n = S.nodes[id], keys = n.level === 2 ? [id, ...n.children.map(c => S.nodes[c].key)] : [n.parent, n.key];
    for (const t of S.tiles) if (keys.includes(t.key)) loadTile(S, t);
    fillPanel(id); setHole(id); showSubs(id);
    body.classList.add("focused");
    dismissHint();
    try { history.replaceState(null, "", `#${S.id}_${id}`); } catch (e) {}
    page(`/${S.id}/${id.replace(".", "/")}`); track("part_opened", { machine: S.id, part: id, level: n.level });
    requestAnimationFrame(() => flyTo(focusView(id), n.level === 3 ? 1300 : 1200));
    if (fromKey) $("#close").focus({ preventScroll: true });
  }
  // up one level; all the way out of the subject's parts with toTop
  function unfocus(toTop = false, { noFly = false } = {}) {
    if (!current) return;
    const was = current;
    if (!toTop && S.nodes[was].level === 3) { focus(S.nodes[was].parent); return; }
    S.els[was].path.classList.remove("current");
    current = null;
    delete body.dataset.level;
    body.classList.remove("focused");
    showSubs(null);
    if (noFly) { setHole(null); return; }
    try { history.replaceState(null, "", "#" + S.id); } catch (e) {}
    const T = S;
    flyTo(fitView(), 1000).then(() => { if (!current && S === T) setHole(null); });
    S.els[part(was)].path.focus({ preventScroll: true });
  }
  const step = d => { const s = siblings(current), i = s.indexOf(current); focus(s[(i + d + s.length) % s.length]); };

  // ---------- hover ----------
  function showTip(text, x, y, sub) {
    tip.textContent = text;
    if (sub) { const e = document.createElement("span"); e.className = "tip-sub"; e.textContent = sub; tip.appendChild(e); }
    tip.style.left = x + "px"; tip.style.top = y + "px"; tip.classList.add("on");
  }
  const soonName = id => ((WORLD.soon || []).find(x => x.id === id) || {}).name || "This machine";
  function hideTip() { tip.classList.remove("on"); }
  let hovered = null, whovered = null;
  function hover(id) { if (hovered === id) return; setLit(hovered, false); hovered = id; setLit(hovered, true); }
  function whover(key) {
    if (whovered === key) return;
    for (const k of [whovered, key]) {
      const w = k && wspots[k];
      if (!w) continue;
      const on = k === key;
      w.path.classList.toggle("lit", on);
      if (w.label) w.label.classList.toggle("lit", on);
    }
    whovered = key;
  }
  const toast = text => { const t = $("#toast"); t.textContent = text; t.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("on"), 1800); };
  function worldClick(key) {
    const [kind, id] = key.split(":");
    if (kind === "subject") enter(id);
    else openBuild(soonName(id));
  }

  // ---------- pointer: pan, pinch, click ----------
  const pointers = new Map();
  let drag = null, pinch = null, outAcc = 0;
  const hitId = t => { const e = t && t.closest ? t.closest("[data-id]") : null; return e ? e.dataset.id : null; };
  const hitWorld = t => { const e = t && t.closest ? t.closest("[data-world]") : null; return e ? e.dataset.world : null; };

  stage.addEventListener("pointerdown", e => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    stage.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) drag = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y, moved: false, target: e.target };
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: cam.s }; drag = null; }
  });
  stage.addEventListener("pointermove", e => {
    const p = pointers.get(e.pointerId);
    if (p) { p.x = e.clientX; p.y = e.clientY; }
    if (body.classList.contains("entering")) return;
    if (pinch && pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y), want = pinch.s * d / pinch.d;
      if (space && !current && want < fitView().s * .8) { pinch = null; leave(); return; }   // pinch out of a subject: back to the city
      zoomAt(want / cam.s, (a.x + b.x) / 2, (a.y + b.y) / 2);
      return;
    }
    if (drag && pointers.size === 1) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) > 6) { drag.moved = true; stage.classList.add("dragging"); hideTip(); if (anim) { cancelAnimationFrame(anim.raf); anim = null; } }
      if (drag.moved) { cam.x = drag.cx + dx; cam.y = drag.cy + dy; clampCam(); apply(); }
      return;
    }
    if (e.pointerType === "mouse") {
      if (space) {
        const id = hitId(e.target);
        hover(id);
        if (id && id !== current) showTip(S.nodes[id].name, e.clientX, e.clientY); else hideTip();
      } else {
        const key = hitWorld(e.target);
        whover(key);
        if (key && key.startsWith("soon:")) showTip(`${soonName(key.slice(5))} · by @you?`, e.clientX, e.clientY, "Ask your agent to build it");
        else if (key && key.startsWith("subject:")) { const T = SUBJ[key.slice(8)]; showTip(T.title + (T.credit ? ` · by ${T.credit.name}` : ""), e.clientX, e.clientY); }
        else hideTip();
      }
    }
  });
  function endPointer(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    if (pinch && pointers.size < 2) { pinch = null; drag = null; return; }
    if (drag && pointers.size === 0) {
      stage.classList.remove("dragging");
      if (!drag.moved && e.type === "pointerup" && !body.classList.contains("entering")) {
        if (space) {
          const id = hitId(drag.target);
          if (id) { if (id !== current) focus(id); }
          else if (current) unfocus();
        } else {
          const key = hitWorld(drag.target);
          if (key) worldClick(key);
        }
      }
      drag = null;
    }
  }
  stage.addEventListener("pointerup", endPointer);
  stage.addEventListener("pointercancel", endPointer);
  stage.addEventListener("pointerleave", e => { if (e.pointerType === "mouse") { hover(null); whover(null); hideTip(); } });
  wlabels.addEventListener("click", e => { const k = hitWorld(e.target); if (k) worldClick(k); });
  wlabels.addEventListener("pointerover", e => whover(hitWorld(e.target)));

  stage.addEventListener("wheel", e => {
    e.preventDefault();
    if (current || body.classList.contains("entering")) return;
    // scrolling out past the whole subject goes back to the city
    if (space && e.deltaY > 0 && cam.s <= fitView().s * 1.001) {
      outAcc += e.deltaY;
      if (outAcc > 260) { outAcc = 0; leave(); }
      return;
    }
    outAcc = 0;
    zoomAt(Math.exp(-e.deltaY * (e.ctrlKey ? .01 : .0018)), e.clientX, e.clientY);
    dismissHint(); dismissWorldHint();
  }, { passive: false });

  stage.addEventListener("keydown", e => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const id = hitId(e.target), key = hitWorld(e.target);
    if (space && id) { e.preventDefault(); focus(id, { fromKey: true }); }
    else if (!space && key) { e.preventDefault(); worldClick(key); }
  });
  stage.addEventListener("focusin", e => { if (space) hover(hitId(e.target)); else whover(hitWorld(e.target)); });
  stage.addEventListener("focusout", () => { hover(null); whover(null); });

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      if (current) { e.preventDefault(); unfocus(); }
      else if (space) { e.preventDefault(); leave(); }
    }
    else if (current && e.key === "ArrowRight") { e.preventDefault(); step(1); }
    else if (current && e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
  });

  $("#close").addEventListener("click", () => unfocus());
  $("#how").addEventListener("click", openHow);
  addEventListener("bookclosed", () => { if (current) try { history.replaceState(null, "", `#${S.id}_${current}`); } catch (e) {} });
  $("#prev").addEventListener("click", () => step(-1));
  $("#next").addEventListener("click", () => step(1));
  $("#tour").addEventListener("click", () => { if (S) { track("tour_started", { machine: S.id }); focus(S.ORDER[0], { fromKey: true }); } });
  $("#city").addEventListener("click", () => leave());
  $("#brand").addEventListener("click", () => space ? leave() : flyTo(worldFit(), 800));
  const centerZoom = f => {
    const { W, H } = viewport(), fit = fitView();
    dismissHint();
    if (cam.s * f <= fit.s * 1.02) { flyTo(fit, 450); return; }
    const keep = { ...cam };
    Object.assign(cam, { s: cam.s * f, x: W / 2 - (W / 2 - cam.x) * f, y: H / 2 - (H / 2 - cam.y) * f }); clampCam();
    const t = { ...cam }; Object.assign(cam, keep);
    flyTo(t, 450);
  };
  $("#zoom-in").addEventListener("click", () => centerZoom(1.6));
  $("#zoom-out").addEventListener("click", () => (space && cam.s <= fitView().s * 1.01) ? leave() : centerZoom(1 / 1.6));
  $("#reset").addEventListener("click", () => flyTo(fitView(), 800));
  const about = $("#about-dlg");
  $("#about").addEventListener("click", () => { about.showModal(); track("about_opened"); });
  // ---------- build a machine: the prompt people hand to their agent ----------
  const buildDlg = $("#build-dlg");
  function openBuild(machine) {
    const pick = machine
      ? `I'd like to build: ${machine.replace(/^The /, "the ")}. Check that nobody has built it or opened a pull request for it yet; if they have, suggest a few others.`
      : `Help me pick a machine that isn't in colour on the map yet and isn't already in an open pull request, for example the excavator, the tower crane or the church bell.`;
    $("#build-prompt").textContent =
`Go to https://howthings.work/contribute.md and follow it.

${pick} Then build it in the howthings.work style and open a pull request with screenshots.

Credit it to: (your name or @handle, and a link)`;
    const list = $("#build-credits");
    list.replaceChildren(...SIDS.map(sid => {
      const li = document.createElement("li"), T = SUBJ[sid];
      li.append(T.title + " · by ");
      if (T.credit) { const a = Object.assign(document.createElement("a"), { href: T.credit.url || "#", target: "_blank", rel: "noopener", textContent: T.credit.name }); li.appendChild(a); }
      return li;
    }), Object.assign(document.createElement("li"), { className: "open", textContent: `${(WORLD.soon || []).length} more machines · by @you?` }));
    if (about.open) about.close();
    buildDlg.showModal();
    track("build_dialog_opened", { machine: machine || null });
  }
  $("#build").addEventListener("click", () => openBuild());
  about.addEventListener("click", e => { if (e.target.closest("[data-contribute]")) openBuild(); });
  buildDlg.addEventListener("click", e => { if (e.target === buildDlg || e.target.closest("[data-close]")) buildDlg.close(); });
  $("#build-copy").addEventListener("click", async () => {
    const b = $("#build-copy"), text = $("#build-prompt").textContent;
    track("build_prompt_copied", { prompt: text.slice(0, 200) });
    try { await navigator.clipboard.writeText(text); b.textContent = "Copied"; }
    catch (e) { const r = document.createRange(); r.selectNodeContents($("#build-prompt")); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); b.textContent = "Selected, press Copy"; }
    setTimeout(() => { b.textContent = "Copy prompt"; }, 1800);
  });
  about.addEventListener("click", e => { if (e.target === about || e.target.closest("[data-close]")) about.close(); });

  // ---------- hints ----------
  if (VIDEO) { $("#hint").hidden = true; $("#world-hint").hidden = true; }
  let hintTimer = 0, hintShown = false;
  function showHintOnce() {
    if (hintShown || VIDEO) return;
    hintShown = true;
    $("#hint").classList.remove("gone");
    hintTimer = setTimeout(dismissHint, 7000);
  }
  function dismissHint() { clearTimeout(hintTimer); $("#hint").classList.add("gone"); }
  $("#hint").classList.add("gone");
  const wh = $("#world-hint");
  if (matchMedia("(hover: none)").matches) wh.textContent = "Everything in colour opens up. Tap one!";
  let whTimer = setTimeout(dismissWorldHint, 9000);
  function dismissWorldHint() { clearTimeout(whTimer); wh.classList.add("gone"); }

  function setCompact() { body.classList.toggle("compact", S ? viewport().compact : viewport().phone); }
  addEventListener("resize", () => {
    setCompact();
    if (anim) { cancelAnimationFrame(anim.raf); anim = null; }
    Object.assign(cam, current ? focusView(current) : fitView(), { r: 0 });
    apply();
  });

  // ======================================================================= prefetch
  // The city's own tiles first, then each subject: plate, part tiles, close-ups, book pages, deep tiles.
  // Hovering a subject in the city jumps it to the front of the queue. Decoded images stay in memory.
  const kept = [];
  const decodeUrl = u => { const i = new Image(); i.src = u; kept.push(i); return i.decode(); };
  const queue = [];                          // { T, fn }: T is the subject a job belongs to (null for the city)
  let workers = 0;
  function pump() {
    while (workers < 6 && queue.length) {
      const job = queue.shift();
      workers++;
      Promise.resolve().then(job.fn).catch(() => {}).then(() => { workers--; pump(); });
    }
  }
  function prefetchSubject(T, urgent = false) {
    if (!T.prefetched) {
      T.prefetched = true;
      const lvl = l => T.tiles.filter(t => t.level === l).map(t => () => { loadTile(T, t); return t.img.decode(); });
      const fns = [() => T.plate.decode(), ...lvl(2), ...T.ORDER.map(id => () => decodeUrl(`${T.base}detail/${id}.webp`)),
        ...(T.bookAssets || []).map(u => () => decodeUrl(u)), ...lvl(3)];
      queue.push(...fns.map(fn => ({ T, fn })));
    }
    if (urgent) {                            // move this subject's waiting jobs to the front, keeping their order
      const mine = queue.filter(j => j.T === T), rest = queue.filter(j => j.T !== T);
      queue.splice(0, queue.length, ...mine, ...rest);
    }
    pump();
  }
  function prefetchAll() {
    queue.push(...wtiles.map(t => ({ T: null, fn: () => { loadWT(t); return t.img.decode(); } })));
    pump();
    for (const sid of SIDS) prefetchSubject(SUBJ[sid]);
  }
  stage.addEventListener("pointerover", e => {
    const k = hitWorld(e.target);
    if (k && k.startsWith("subject:")) prefetchSubject(SUBJ[k.slice(8)], true);
  });

  // ======================================================================= start
  setSpace(null);
  subjEl.style.opacity = 0; subjAlpha = 0; worldAlpha = 1;
  Object.assign(cam, worldFit());
  apply();
  const start = () => {
    const h = location.hash.slice(1);
    const legacy = h.startsWith("how-") ? h.slice(4) : null;
    const [sid, nid] = h.split("_");
    if (SUBJ[sid]) {
      enter(sid, { instant: true });
      if (nid && S.nodes[nid]) setTimeout(() => focus(nid), 300);
    } else if (legacy) {
      for (const T of Object.values(SUBJ)) {
        const p = T.how && T.how.part[legacy];
        if (p) { enter(T.id, { instant: true }); setTimeout(() => focus(p), 300); setTimeout(openHow, 1700); break; }
      }
    }
  };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(start); else start();
  if (base.complete) setTimeout(prefetchAll, 400); else base.addEventListener("load", () => setTimeout(prefetchAll, 400), { once: true });

  window.__viewer = {
    get nodes() { return S ? S.nodes : {}; }, get tiles() { return S ? S.tiles : []; }, get space() { return space; },
    cam, focus, unfocus, enter, leave, subjects: SUBJ, worldTiles: wtiles
  };
})();
