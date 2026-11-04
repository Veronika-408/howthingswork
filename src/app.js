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
  const SLOWMO = +new URLSearchParams(location.search).get("slowmo") || 1;     // ?slowmo=8 slows every flight down, for checking them frame by frame
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
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const DPR = () => Math.min(3, devicePixelRatio || 1);

  // ======================================================================= pictures
  // Every painting is fetched early and decoded off the main thread into a bitmap before it can be needed,
  // so nothing decodes in the middle of a zoom. Bitmaps far away in the tree of spaces are dropped again
  // when memory runs short; their bytes stay in the HTTP cache, so they come back in a few milliseconds.
  const AV = window.ASSET_V || {};                          // content hashes from the build: a new picture is a new URL
  const vurl = u => AV[u] ? `${u}?v=${AV[u]}` : u;
  const coarse = matchMedia("(hover: none) and (pointer: coarse)").matches;
  const lowMem = coarse || (navigator.deviceMemory || 8) <= 4;
  const BUDGET = (lowMem ? 220 : 560) * 1e6;               // decoded bytes kept around
  const pics = new Map();
  let picBytes = 0, clock = 0;
  const pic = url => { let p = pics.get(url); if (!p) pics.set(url, p = { url, bmp: null, w: 0, h: 0, state: 0, keep: 9, used: 0 }); return p; };
  const live = p => !!p && p.state === 2;
  const fromBlob = b => window.createImageBitmap ? createImageBitmap(b) : new Promise((res, rej) => {
    const i = new Image(), u = URL.createObjectURL(b);
    i.onload = () => { URL.revokeObjectURL(u); (i.decode ? i.decode() : Promise.resolve()).then(() => res(i), () => res(i)); };
    i.onerror = rej; i.src = u;
  });
  const warmQ = [];                                         // freshly decoded bitmaps, handed to the GPU one per frame
  function decodePic(p) {
    if (p.state) return p.ready;
    p.state = 1;
    p.ready = fetch(vurl(p.url)).then(r => r.ok ? r.blob() : Promise.reject(new Error(r.status + " " + p.url))).then(fromBlob).then(bmp => {
      if (p.state !== 1) { if (bmp.close) bmp.close(); return; }         // dropped while it was decoding
      p.bmp = bmp; p.w = bmp.width || bmp.naturalWidth; p.h = bmp.height || bmp.naturalHeight; p.state = 2;
      picBytes += p.w * p.h * 4; p.used = clock;
      warmQ.push(p); evict(); picArrived();
    }, e => { p.state = 0; p.ready = null; throw e; });
    return p.ready;
  }
  function dropPic(p) {
    if (p.state === 2) { picBytes -= p.w * p.h * 4; if (p.bmp.close) p.bmp.close(); }
    p.bmp = null; p.state = 0; p.ready = null;
  }
  // over budget: drop what is furthest away in the tree, and least recently drawn
  function evict() {
    if (picBytes <= BUDGET) return;
    const c = [...pics.values()].filter(p => p.state === 2 && p.keep > 1 && clock - p.used > 120).sort((a, b) => (b.keep - a.keep) || (a.used - b.used));
    for (const p of c) { if (picBytes <= BUDGET) break; dropPic(p); }
  }
  const warmed = new Set();
  const warmUrl = (url, plain) => { if (warmed.has(url)) return; warmed.add(url); return fetch(plain ? url : vurl(url), { priority: "low" }).then(r => r.blob()).then(() => {}, () => warmed.delete(url)); };

  // jobs: decode (bitmap kept) or warm (bytes into the HTTP cache), nearest in the tree first
  let jobs = [], decoders = 0, fetchers = 0, picArrived = () => {};
  function pump() {
    jobs.sort((a, b) => a.prio - b.prio);
    const hold = urgentLeft();
    for (let i = 0; i < jobs.length;) {
      const j = jobs[i];
      // bytes for later wait while anything near is still decoding, so the first sharp picture comes first
      if (j.kind === "decode" ? decoders >= 3 : fetchers >= 4 || hold) { i++; continue; }
      jobs.splice(i, 1);
      if (j.p) j.p.job = null;
      if (j.kind === "decode") {
        if (j.p.state) continue;
        decoders++;
        decodePic(j.p).catch(() => {}).then(() => { decoders--; pump(); });
      } else {
        const w = warmUrl(j.url, j.plain);
        if (!w) continue;
        fetchers++;
        w.then(() => { fetchers--; pump(); });
      }
    }
  }
  // prio: how soon (0 = now); keep: how near in the tree (0-1 are never dropped, 2+ may be when memory runs short)
  const need = (p, prio = 0, keep = prio) => {
    if (!p) return;
    p.keep = Math.min(p.keep, keep);
    if (p.state) return;
    if (p.job) { if (prio < p.job.prio) p.job.prio = prio; } else jobs.push(p.job = { kind: "decode", p, prio });
    pump();
  };
  const idle = () => !jobs.length && !decoders && !fetchers;
  const urgentLeft = () => jobs.some(j => j.kind === "decode" && j.prio <= 1) || [...pics.values()].some(p => p.state === 1 && p.keep <= 1);

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
  // A space is drawn as layers, coarse to fine: the whole picture at 1x and 2x, then repainted detail tiles.
  // Each finer layer fades in, with the zoom, once the camera has outgrown the pixels of the one below it.
  const layer = (url, x, y, w, h, d, on, more) => ({ p: pic(url), x, y, w, h, d, on, a: 0, target: 0, ...more, get loaded() { return live(this.p); } });
  const WSP = { id: null, w: WORLD.w, h: WORLD.h, paper: WORLD.paper,
    layers: [layer(WORLD.src, 0, 0, WORLD.w, WORLD.h, 1, 0, { base: true })] };
  if (WORLD.src2) WSP.layers.push(layer(WORLD.src2, 0, 0, WORLD.w, WORLD.h, 2, 1, { base: true }));
  const wtiles = (WORLD.tiles || []).map(t => { const [x, y, w, h] = t.rect; return layer(t.src, x, y, w, h, TILE_PX / w, WORLD.src2 ? 2 : 1, { key: t.key }); });
  WSP.layers.push(...wtiles);
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
    Object.assign(S, { root, ov, holePolys: null, leadersG, hotsG, subsG, notes, intro });

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
    // the plate at 1x and 2x, then detail tiles: repainted copies of small areas, faded in once the camera outgrows the layer below
    S.w = P.w; S.h = P.h;
    const bases = [layer(S.base + "plate.webp", 0, 0, P.w, P.h, 2, 1, { base: true })];
    if (S.plate1x !== false) bases.unshift(layer(S.base + "plate-1x.webp", 0, 0, P.w, P.h, 1, 0, { base: true }));
    else bases[0].on = 0;
    S.mask = pic(S.base + "plate-mask.png");
    S.tiles = Object.entries(S.TILES || {}).map(([key, t]) => {
      const [x, y, w, h] = t.rect;
      const below = t.level === 2 ? 2 : TILE_PX / S.TILES[key.split("/")[0]].rect[2];
      return layer(tileFile(key), x, y, w, h, TILE_PX / w, below, { key, level: t.level });
    });
    S.tiles.sort((a, b) => (a.level - b.level) || (b.w - a.w));
    S.layers = [...bases, ...S.tiles];

    // Spaces form a tree: a subject sits on the map (parent "world"), or inside another subject's
    // plate (parent "<id>", spot in that plate's pixels), which is how the zoom keeps going deeper.
    S.parent = S.parent || "world";
    if (S.parent === "world") {
      // its drawing in the city: a quiet outline and a small "+" that says it opens
      worldSpot("subject:" + sid, S.spot.polys, "subject-spot", S.title);
      const lab = el("button", "wplus", wlabels);
      lab.type = "button"; lab.dataset.world = "subject:" + sid; lab.tabIndex = -1;
      lab.setAttribute("aria-label", "Open " + S.title);
      wspots["subject:" + sid].label = lab;
    }
  }
  worldEl.appendChild(wov);
  // nested spaces: an outline on the parent plate and a "+" that dives in
  const childPlus = [];
  for (const sid of SIDS) {
    const C = SUBJ[sid], P = SUBJ[C.parent];
    if (!P) continue;
    const g = svg("g", { class: "children" }, P.ov);
    const path = svg("path", { d: polyD(C.spot.polys), class: "childhot", tabindex: 0, role: "button", "aria-label": "Look inside: " + C.title }, g);
    path.dataset.child = sid;
    const plus = el("button", "wplus childplus", $("#sublabels"));
    plus.type = "button"; plus.dataset.child = sid; plus.tabIndex = -1; plus.setAttribute("aria-label", "Look inside: " + C.title);
    childPlus.push({ C, P, plus, path });
  }
  const childrenOf = id => SIDS.filter(c => SUBJ[c].parent === id);

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
  // the spaces we came through, outermost first: { space: null (the map) or subject id, cam }
  let trail = [];
  const back = () => trail.length ? trail[trail.length - 1] : null;
  const worldCamNow = () => space ? null : cam;
  const toScreen = (c, [x, y]) => { const [a, b] = rot(c.r || 0, [x * c.s, y * c.s]); return [c.x + a, c.y + b]; };
  // cameras are similarity transforms, so a space inside a space is one multiplication away
  const mul = (A, B) => { const [x, y] = toScreen(A, [B.x, B.y]); return { x, y, s: A.s * B.s, r: (A.r || 0) + (B.r || 0) }; };
  const inv = A => { const [x, y] = rot(-(A.r || 0), [-A.x / A.s, -A.y / A.s]); return { x, y, s: 1 / A.s, r: -(A.r || 0) }; };

  const zoomOutBtn = $("#zoom-out"), resetBtn = $("#reset");
  let kShown = 0, wkShown = 0;
  function apply() {
    const wc = worldCamNow();
    if (wc) worldEl.style.transform = `translate(${wc.x}px, ${wc.y}px) rotate(${wc.r || 0}deg) scale(${wc.s})`;
    if (space) subjEl.style.transform = `translate(${cam.x}px, ${cam.y}px) rotate(${cam.r || 0}deg) scale(${cam.s})`;
    // line widths follow the zoom; while flying between spaces the lines are hidden, so skip the restyle
    if (!body.classList.contains("entering")) {
      const wk = 1 / (wc ? wc.s : 1), k = 1 / cam.s;
      if (Math.abs(wk / wkShown - 1) > .004) { wov.style.setProperty("--wk", wk.toFixed(5)); wkShown = wk; }
      if (S && Math.abs(k / kShown - 1) > .004) { S.ov.style.setProperty("--k", k.toFixed(5)); kShown = k; }
    }
    const fit = fitView();
    zoomOutBtn.disabled = !space && cam.s <= fit.s * 1.01;
    resetBtn.disabled = cam.s <= fit.s * 1.01 && Math.abs(cam.x - fit.x) < 2 && Math.abs(cam.y - fit.y) < 2;
    updateLayers(); placeSubLabels(); placeWorldLabels(); placeChildPlus(); requestDraw();
  }

  // the stage size is read once per resize, not in every frame
  let stageW = stage.clientWidth, stageH = stage.clientHeight;
  function viewport() {
    const W = stageW, H = stageH;
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
    s = Math.max(Math.min(s, artMax(cx, cy)), Math.min(s, fit * 1.3));
    return { s, x: area.x + area.w / 2 - cx * s, y: area.y + area.h / 2 - cy * s };
  }

  // fly in log-scale so zooming feels even; dip out a little on long hops, like a camera crane
  // seg: this flight is the [t0, t1] stretch of one longer eased move, so two flights can join without stopping
  const easeInv = f => { let a = 0, b = 1; for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (ease(m) < f) a = m; else b = m; } return (a + b) / 2; };
  const flightMs = d => Math.min(1800, Math.max(800, 650 + 320 * d));      // d: zoom distance, in e-folds
  function flyTo(target, ms = 1100, onFrame, { seg } = {}) {
    if (anim) cancelAnimationFrame(anim.raf);
    // no will-change: a promoted layer keeps its old raster while zooming and re-rasters (flashes) when dropped
    if (reduceMotion) ms = 0;
    ms *= SLOWMO;
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
        const t = ms ? Math.min(1, (now - t0) / ms) : 1;
        const e = seg ? (ease(seg[0] + (seg[1] - seg[0]) * t) - ease(seg[0])) / (ease(seg[1]) - ease(seg[0])) : ease(t);
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
        drawNow(now);                        // in this frame, so the canvas never trails the labels by one
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
  // the deepest zoom the paintings can take at a point, so no picture is stretched far past its own pixels
  // (where a part has repaints you can go much deeper than on the bare plate or the map)
  function artMax(px, py) {
    const X = space ? S : WSP;
    let d = 0;
    for (const L of X.layers) if (px >= L.x && px <= L.x + L.w && py >= L.y && py <= L.y + L.h) d = Math.max(d, L.d);
    return Math.max(fitView().s * 2.5, (d || 1) * 1.8 / DPR());
  }
  function zoomAt(factor, sx, sy) {
    if (anim) { cancelAnimationFrame(anim.raf); anim = null; }
    const wx = (sx - cam.x) / cam.s, wy = (sy - cam.y) / cam.s;
    cam.s = factor > 1 ? Math.min(cam.s * factor, Math.max(cam.s, artMax(wx, wy))) : cam.s * factor;
    clampCam();
    cam.x = sx - wx * cam.s; cam.y = sy - wy * cam.s;
    clampCam();
    const fit = fitView();
    if (cam.s <= fit.s * 1.001) Object.assign(cam, fit);   // fully zoomed out: the whole subject, centred
    apply();
  }

  // ---------- layers: which pictures should show (the renderer fades them) ----------
  // A finer layer is wanted once the screen has more device pixels than the layer below it has picture
  // pixels, and it follows the zoom directly, so a closer picture fades in while you zoom rather than after.
  let chain = null;                           // the focused part's own repaints: { keys, hold, s0, s1 }
  function chainNeed(L, n) {
    if (!chain.keys.has(L.key)) return 0;     // while a part is focused, its neighbours' repaints stay away
    if (L.key === chain.hold) return 1;
    if (!chain.s1) return n;                  // the flight hasn't started yet
    if (!(chain.s1 > chain.s0 * 1.15)) return 1;
    const l0 = Math.log(chain.s0), l1 = Math.log(chain.s1);
    return Math.max(n, smooth(l0, l0 + (l1 - l0) * .75, Math.log(cam.s)));   // fades in along the flight to the part
  }
  function updateLayers() {
    const X = space ? S : WSP, eff = cam.s * DPR();
    const { W, H } = viewport();
    let vx0 = -Infinity, vy0 = -Infinity, vx1 = Infinity, vy1 = Infinity;
    if (!cam.r) { vx0 = -cam.x / cam.s; vy0 = -cam.y / cam.s; vx1 = (W - cam.x) / cam.s; vy1 = (H - cam.y) / cam.s; }
    const mx = (vx1 - vx0) * .35, my = (vy1 - vy0) * .35;                 // decode a little beyond the edges
    let below = false;
    for (const L of X.layers) {
      const vis = L.base || (L.x < vx1 && L.x + L.w > vx0 && L.y < vy1 && L.y + L.h > vy0);
      const near = vis || (L.x < vx1 + mx && L.x + L.w > vx0 - mx && L.y < vy1 + my && L.y + L.h > vy0 - my);
      let n = L.on ? smooth(L.on, L.on * 1.3, eff) : 1;
      if (L.base && !below) n = 1;                                         // nothing decoded below: this one stands in
      if (chain && L.key && space) n = chainNeed(L, n);
      if (near && (n > 0 || eff > L.on * .8)) need(L.p, vis && n > 0 ? 0 : 1, L.base ? 0 : 2);
      L.target = vis && live(L.p) ? n : 0;
      if (L.base && live(L.p)) below = true;
    }
  }

  // ---------- the renderer ----------
  let drawRaf = 0, drawLast = 0, shadeA = 0;
  let dive = null;                            // a child space drawn over its parent while the camera flies in or out
  const SHADE = "rgba(249, 247, 242, 0.62)";
  function requestDraw() { if (!drawRaf) drawRaf = requestAnimationFrame(draw); }
  function drawNow(now) { if (drawRaf) { cancelAnimationFrame(drawRaf); drawRaf = 0; } draw(now); }
  function sizeView() {
    const dpr = DPR(), W = stageW, H = stageH;
    if (view.width !== Math.round(W * dpr) || view.height !== Math.round(H * dpr)) {
      view.width = Math.round(W * dpr); view.height = Math.round(H * dpr);
      view.style.width = W + "px"; view.style.height = H + "px";
    }
    return dpr;
  }
  const setCam = (g, c, dpr) => { g.setTransform(dpr, 0, 0, dpr, 0, 0); g.translate(c.x, c.y); if (c.r) g.rotate(c.r * Math.PI / 180); g.scale(c.s, c.s); };
  // fade each layer towards its target: small steps (the zoom moving) are followed exactly, jumps take ~0.35 s
  const stepLayer = (L, dt) => {
    const d = L.target - L.a;
    if (!d) return false;
    L.a = Math.abs(d) <= Math.max(.1, dt / .35) ? L.target : L.a + Math.sign(d) * dt / .35;
    return L.a !== L.target;
  };
  function drawLayers(g, X, c, dpr) {
    setCam(g, c, dpr);
    let from = 0;                                                         // skip pictures fully covered by a finer whole picture
    X.layers.forEach((L, i) => { if (L.base && L.a >= 1 && live(L.p)) from = i; });
    for (let i = from; i < X.layers.length; i++) {
      const L = X.layers[i];
      if (L.a <= 0 || !live(L.p)) continue;
      g.globalAlpha = L.a; g.drawImage(L.p.bmp, L.x, L.y, L.w, L.h); L.p.used = clock;
    }
    g.globalAlpha = 1;
  }
  // the whole plate of a space that isn't the current one: the sharpest decoded picture the zoom needs
  function platePic(T, eff) {
    const [b1, b2] = T.layers[0].base && T.layers[1] && T.layers[1].base ? [T.layers[0].p, T.layers[1].p] : [null, T.layers[0].p];
    const p = eff > 1.05 && live(b2) ? b2 : live(b1) ? b1 : live(b2) ? b2 : null;
    if (p) p.used = clock;
    return p;
  }
  const oc = document.createElement("canvas"), og = oc.getContext("2d");
  function drawGhost(dpr) {
    const { T, g1, g2 } = dive, gc = mul(cam, dive.inP), p = platePic(T, gc.s * dpr);
    if (!p) return;
    const quad = [[0, 0], [T.w, 0], [T.w, T.h], [0, T.h]].map(q => toScreen(gc, q).map(v => v * dpr));
    if (g1 > 0 && g2 < 1 && live(T.mask)) {
      // only the painted parts of the child (its plate through its mask) over the parent's own drawing of them
      const xs = quad.map(q => q[0]), ys = quad.map(q => q[1]);
      const x0 = Math.max(0, Math.floor(Math.min(...xs))), y0 = Math.max(0, Math.floor(Math.min(...ys)));
      const x1 = Math.min(view.width, Math.ceil(Math.max(...xs))), y1 = Math.min(view.height, Math.ceil(Math.max(...ys)));
      if (x1 > x0 && y1 > y0) {
        if (oc.width !== view.width || oc.height !== view.height) { oc.width = view.width; oc.height = view.height; }
        og.setTransform(1, 0, 0, 1, 0, 0); og.globalCompositeOperation = "source-over"; og.globalAlpha = 1;
        og.clearRect(x0, y0, x1 - x0, y1 - y0);
        og.imageSmoothingEnabled = true; og.imageSmoothingQuality = "medium";
        setCam(og, gc, dpr);
        og.drawImage(p.bmp, 0, 0, T.w, T.h);
        og.globalCompositeOperation = "destination-in";
        og.drawImage(T.mask.bmp, 0, 0, T.w, T.h); T.mask.used = clock;
        og.globalCompositeOperation = "source-over";
        vg.setTransform(1, 0, 0, 1, 0, 0); vg.globalAlpha = g1;
        vg.drawImage(oc, x0, y0, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0);
      }
    }
    if (g2 > 0) {
      // then the whole page: the plate and its paper around it take over the screen
      vg.setTransform(1, 0, 0, 1, 0, 0); vg.globalAlpha = g2; vg.fillStyle = T.paper;
      vg.beginPath(); vg.rect(0, 0, view.width, view.height);
      quad.forEach(([x, y], i) => i ? vg.lineTo(x, y) : vg.moveTo(x, y)); vg.closePath();
      vg.fill("evenodd");
      setCam(vg, gc, dpr); vg.drawImage(p.bmp, 0, 0, T.w, T.h);
    }
    vg.globalAlpha = 1;
  }
  function draw(now) {
    drawRaf = 0; clock++;
    now = now || performance.now();
    const dt = Math.min(.1, (now - (drawLast || now)) / 1000); drawLast = now;
    const dpr = sizeView();
    vg.setTransform(1, 0, 0, 1, 0, 0);
    vg.clearRect(0, 0, view.width, view.height);
    // medium = bilinear with mipmaps: looks the same as high (bicubic) here, at a third of the GPU time per frame
    vg.imageSmoothingEnabled = true; vg.imageSmoothingQuality = "medium";
    let moving = false;
    const X = space ? S : WSP;
    for (const L of X.layers) if (stepLayer(L, dt)) moving = true;
    if (!(dive && dive.g2 >= 1)) drawLayers(vg, X, cam, dpr);             // a child that covers everything hides its parent
    if (S) {
      // the dim veil around the focused part, with the part cut out of it
      const st = body.classList.contains("focused") && S.holePolys ? 1 : 0;
      if (shadeA !== st) { shadeA = st > shadeA ? Math.min(1, shadeA + dt / .6) : Math.max(0, shadeA - dt / .6); moving = true; }
      if (shadeA > 0) {
        setCam(vg, cam, dpr);
        vg.globalAlpha = shadeA;
        vg.fillStyle = SHADE;
        vg.beginPath();
        vg.rect(-cam.x / cam.s - 10, -cam.y / cam.s - 10, view.width / dpr / cam.s + 20, view.height / dpr / cam.s + 20);
        for (const pts of S.holePolys || []) pts.forEach(([x, y], i) => i ? vg.lineTo(x, y) : vg.moveTo(x, y));
        vg.fill("evenodd");
      }
    }
    if (dive) drawGhost(dpr);
    // hand one freshly decoded picture to the GPU per frame (an invisible 1px draw), before it is needed for real
    const w = warmQ.shift();
    if (w && live(w)) { vg.setTransform(1, 0, 0, 1, 0, 0); vg.globalAlpha = .004; vg.drawImage(w.bmp, 0, 0, 1, 1); }
    if (warmQ.length) moving = true;
    vg.globalAlpha = 1;
    if (moving) requestDraw();
    if (window.__perf) probe(dpr);
  }
  // test hook: how many device pixels each picture pixel at the screen centre is stretched over (above ~1.6 looks soft)
  function probe(dpr) {
    const X = space ? S : WSP, { W, H } = viewport();
    const [px, py] = toScreen(inv(cam), [W / 2, H / 2]);
    let d = 0;
    for (const L of X.layers) if (L.a > .5 && live(L.p) && px >= L.x && px <= L.x + L.w && py >= L.y && py <= L.y + L.h) d = Math.max(d, L.d);
    let blur = d ? cam.s * dpr / d : 0;
    if (dive && dive.g1 > .5) {
      const gc = mul(cam, dive.inP), [qx, qy] = toScreen(inv(gc), [W / 2, H / 2]), p = platePic(dive.T, gc.s * dpr);
      if (p && qx > 0 && qy > 0 && qx < dive.T.w && qy < dive.T.h) blur = gc.s * dpr / (p.w / dive.T.w);
    }
    window.__perf.push({ t: performance.now(), blur, space, dive: dive ? [+dive.g1.toFixed(2), +dive.g2.toFixed(2), +(dive.k || 0).toFixed(2), +(dive.pb || 0).toFixed(2), +cam.s.toFixed(2)] : null });
  }

  // ---------- labels ----------
  const subLabels = [...document.querySelectorAll(".sublabel")], panelEl = $("#panel");
  let panelBox = null;                        // the reading panel's size, read once per layout change
  function placeSubLabels() {
    const pid = S && current ? part(current) : null;
    if (!pid && !subLabels.some(l => l.on)) return;
    const { W, H, phone } = viewport();
    const panel = panelBox || (panelBox = panelEl.getBoundingClientRect());
    const maxX = phone ? W : W - panel.width, maxY = phone ? H - panel.height : H;
    const placed = [];
    for (const lab of subLabels) {
      const node = S && lab.dataset.subject === S.id ? S.nodes[lab.dataset.id] : null;
      const show = node && node.parent === pid && node.id !== current;
      if (!show) { if (lab.on) { lab.classList.remove("on"); lab.on = false; } continue; }
      const b = node.box;
      const x = (b.x0 + b.x1) / 2 * cam.s + cam.x;
      let y = (b.y0 + b.y1) / 2 * cam.s + cam.y;
      const inside = x > 40 && x < maxX - 40 && y > 30 && y < maxY - 30;
      if (lab.on !== inside) { lab.classList.toggle("on", inside); lab.on = inside; }
      if (!inside) continue;
      if (!lab.size) lab.size = [lab.offsetWidth || 120, (lab.offsetHeight || 30) + 6];   // measured once, not every frame
      const [w, h] = lab.size;
      const hits = yy => placed.some(r => Math.abs(r.x - x) < (r.w + w) / 2 + 4 && Math.abs(r.y - yy) < h);
      for (const d of [0, 1, -1, 2, -2, 3, -3]) if (!hits(y + d * h)) { y += d * h; break; }
      placed.push({ x, y, w });
      lab.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`;
    }
  }
  // a "+" on the current plate for each space inside it (shown with the whole plate, or with the part that opens it)
  function placeChildPlus() {
    const entering = body.classList.contains("entering");
    for (const { C, P, plus, path } of childPlus) {
      const here = space === P.id && !entering;
      const opener = current && S && S.nodes[current] && S.nodes[current].opens === C.id;
      const show = here && (!current || opener);
      plus.classList.toggle("on", show);
      path.style.display = show ? "" : "none";
      if (!show) continue;
      const [x, y] = toScreen(cam, C.spot.plus);
      plus.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`;
    }
  }
  // each coloured subject carries a small "+" in the city, so it is obvious it opens
  function placeWorldLabels() {
    const wc = worldCamNow();
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
    body.classList.toggle("in-subject", !!S);
    chain = null; kShown = 0;
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
  const ancestors = sid => { const out = []; for (let p = SUBJ[sid].parent; p && p !== "world"; p = SUBJ[p].parent) out.unshift(p); return out; };

  // ---------- the dive: a child space drawn over its parent while the camera flies in or out ----------
  // Its painted parts (the plate through its mask) fade in as soon as the parent's own drawing of it would
  // look soft, then its paper takes over the screen, so the picture is sharp the whole way and lands exactly.
  function densityAt(X, [x, y]) {
    let d = 0;
    for (const L of X.layers) if (L.a > .5 && live(L.p) && x >= L.x && x <= L.x + L.w && y >= L.y && y <= L.y + L.h) d = Math.max(d, L.d);
    return d || 1;
  }
  function setDive(e, dir) {
    const k = cam.s * dive.inP.s / dive.fitS;                              // 1 = the child's plate at its own size
    const pb = cam.s * DPR() / densityAt(space ? S : WSP, dive.T.spot.plus);  // how stretched the parent's drawing is
    const g2 = Math.max(smooth(.5, .97, k), smooth(2.2, 3.6, pb));
    const g1 = Math.max(g2, smooth(1, 1.6, pb), smooth(.3, .6, k));
    const w = dir > 0 ? (e >= 1 ? 1 : smooth(0, .22, e)) : 1 - smooth(.72, 1, e);
    dive.g1 = g1 * w; dive.g2 = g2 * w; dive.k = k; dive.pb = pb;
    if (!space) worldEl.style.opacity = (1 - dive.g2).toFixed(3);         // clouds and traffic go with the town
  }
  const diveOf = (T, L) => ({ T, inP: mul(inv(L.world), L.plate), fitS: L.plate.s, g1: 0, g2: 0 });
  // after a switch the new space's pictures are shown at once: the dive covered them until this frame
  function snapLayers() { updateLayers(); for (const L of (space ? S : WSP).layers) L.a = L.target; }
  const urgent = p => decodePic(p).catch(() => {});

  // Entering a child of the current space is a shared-element move: fly until its drawing lies on its
  // plate, dissolving on the way. Anything else (a deep link, a jump across the tree) goes there directly.
  async function enter(sid, { instant = false } = {}) {
    if (space === sid || body.classList.contains("entering")) return;
    const T = SUBJ[sid];
    hideTip(); dismissWorldHint(); whover(null);
    const fromHere = (T.parent === "world" ? null : T.parent) === space;
    const L = landing(T);
    if (instant || reduceMotion || !fromHere) {
      if (current) unfocus(true, { noFly: true });
      trail = [{ space: null }, ...ancestors(sid).map(id => ({ space: id }))];
      setSpace(sid); Object.assign(cam, L.plate);
      worldEl.style.opacity = ""; revealSubject(); snapLayers(); apply();
      plan();
    } else {
      body.classList.add("entering");
      if (current) unfocus(true, { noFly: true });
      // normally decoded long ago (one step away in the tree); a late one gets a short moment
      await Promise.race([Promise.all([urgent(T.layers[0].p), urgent(T.mask)]), wait(400)]);
      dive = diveOf(T, L);
      await flyTo(L.world, flightMs(Math.abs(Math.log(L.world.s / cam.s))), e => setDive(e, 1));
      trail.push({ space });
      setSpace(sid, { arrive: false });
      dive = null;
      Object.assign(cam, L.plate);
      worldEl.style.opacity = "";
      body.classList.remove("entering");
      revealSubject(); snapLayers(); apply();
      plan();
    }
    try { history.replaceState(null, "", "#" + sid); } catch (e) {}
    page("/" + sid); track("machine_opened", { machine: sid, depth: trail.length });
    showHintOnce();
  }

  // Up one space: back out to the whole plate, which becomes the dive over its parent, and keep flying out
  // until the parent is whole. Both legs are one eased move, so the camera never stops in between.
  async function leave() {
    if (!space || body.classList.contains("entering")) return;
    const T = S, was = space, b = back();
    if (current) unfocus(true, { noFly: true });
    body.classList.remove("focused");
    body.classList.add("entering");
    const L = landing(T), toMap = b.space === null;
    const up = toMap ? worldFit() : subjectFit(SUBJ[b.space]);
    const d1 = Math.abs(Math.log(cam.s / L.plate.s)) + Math.hypot(cam.x - L.plate.x, cam.y - L.plate.y) / Math.max(stageW, stageH);
    const d2 = Math.abs(Math.log(L.world.s / up.s)), ms = flightMs(d1 + d2);
    const split = d1 > .03 ? easeInv(d1 / (d1 + d2)) : 0;
    if (split) await flyTo(L.plate, ms * split, () => {}, { seg: [0, split] });
    T.root.classList.remove("active");
    trail.pop();
    setSpace(b.space, { arrive: false });
    Object.assign(cam, L.world);
    dive = { ...diveOf(T, L), g1: 1, g2: 1 };
    if (toMap) worldEl.style.opacity = 0;
    snapLayers(); apply();
    await flyTo(up, ms * (1 - split), e => setDive(e, -1), { seg: [split, 1] });
    dive = null;
    worldEl.style.opacity = "";
    track("back_to_city", { machine: was, to: b.space || "map" });
    if (toMap) {
      try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
      page("/");
    } else {
      revealSubject();
      try { history.replaceState(null, "", "#" + b.space); } catch (e) {}
      page("/" + b.space);
    }
    body.classList.remove("entering");
    apply(); plan();
    const spot = toMap ? wspots["subject:" + was] : null;
    if (spot) spot.path.focus({ preventScroll: true });
  }
  async function leaveAll() { while (space) await leave(); }

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
    window.BOOK.open(mech, { fromSrc: vurl(S.tileFile(S.nodes[current].level === 3 ? S.nodes[current].key : part(current))) });
  };

  function fillPanel(id) {
    panelBox = null;
    const p = S.nodes[id], sibs = siblings(id);
    const crumbs = [crumbButton("The city", () => leaveAll())];
    trail.forEach((t, i) => { if (t.space) crumbs.push(crumbButton(SUBJ[t.space].title, async () => { while (trail.length > i + 1) await leave(); })); });
    crumbs.push(crumbButton(S.whole, () => unfocus(true)));
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
    const inside = p.opens && SUBJ[p.opens] ? [crumbButton(`Inside: ${SUBJ[p.opens].title}`, () => enter(p.opens))] : [];
    $("#deeper").hidden = !p.children.length && !inside.length;
    $("#deeper-list").replaceChildren(...inside, ...p.children.map(c => crumbButton(S.nodes[c].name, () => focus(c))));
    const fig = $("#figure"), img = $("#p-img");
    fig.hidden = p.level !== 2;
    if (p.level === 2) {
      // swap only once the new picture is decoded, so the panel never blanks between parts
      const src = vurl(`${S.base}detail/${id}.webp`), pre = new Image(), sid = S.id;
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
    // its own repaints (and, a step deeper, its sub-parts') decode now; they fade in along the flight
    const n = S.nodes[id], keys = n.level === 2 ? [id] : [n.parent, n.key], deeper = n.level === 2 ? n.children.map(c => S.nodes[c].key) : [];
    chain = { keys: new Set(keys), hold: n.level === 3 ? n.parent : null, s0: cam.s, s1: 0 };
    for (const t of S.tiles) if (keys.includes(t.key)) need(t.p, 0, 2); else if (deeper.includes(t.key)) need(t.p, 1, 2);
    fillPanel(id); setHole(id); showSubs(id);
    body.classList.add("focused");
    dismissHint();
    try { history.replaceState(null, "", `#${S.id}_${id}`); } catch (e) {}
    page(`/${S.id}/${id.replace(".", "/")}`); track("part_opened", { machine: S.id, part: id, level: n.level });
    const ch = chain;
    requestAnimationFrame(() => { const v = focusView(id); ch.s0 = cam.s; ch.s1 = v.s; flyTo(v, n.level === 3 ? 1300 : 1200); });
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
    if (noFly) { setHole(null); chain = null; return; }
    try { history.replaceState(null, "", "#" + S.id); } catch (e) {}
    const T = S;
    // the part's repaints fade out with the zoom on the way back, then free browsing takes over
    flyTo(fitView(), 1000).then(() => { if (!current && S === T) { setHole(null); chain = null; updateLayers(); requestDraw(); } });
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
      const child = e.target.closest && e.target.closest("[data-child]");
      if (space && child) { const C = SUBJ[child.dataset.child]; hover(null); showTip("Look inside: " + C.title + (C.credit ? ` · by ${C.credit.name}` : ""), e.clientX, e.clientY); }
      else if (space) {
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
        const child = drag.target.closest && drag.target.closest("[data-child]");
        if (space && child) enter(child.dataset.child);
        else if (space) {
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
  $("#sublabels").addEventListener("click", e => { const c = e.target.closest("[data-child]"); if (c) enter(c.dataset.child); });
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
  $("#city").addEventListener("click", () => leaveAll());
  $("#brand").addEventListener("click", () => space ? leaveAll() : flyTo(worldFit(), 800));
  const centerZoom = f => {
    const { W, H } = viewport(), fit = fitView();
    dismissHint();
    if (cam.s * f <= fit.s * 1.02) { flyTo(fit, 450); return; }
    if (f > 1) { const [px, py] = toScreen(inv(cam), [W / 2, H / 2]); f = Math.min(f, artMax(px, py) / cam.s); if (f < 1.02) return; }
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
    stageW = stage.clientWidth; stageH = stage.clientHeight; panelBox = null;
    for (const l of subLabels) l.size = null;
    setCompact();
    if (anim) { cancelAnimationFrame(anim.raf); anim = null; }
    Object.assign(cam, current ? focusView(current) : fitView(), { r: 0 });
    apply();
  });

  // ======================================================================= prefetch, by distance in the tree of spaces
  // Decoded and kept: the space you are in and every space one step away (to dive into or back out to),
  // plus, on big screens, the current plate's detail tiles. Fetched only (bytes in the HTTP cache, decoded
  // in a few milliseconds when needed): everything else, nearest first. It is re-planned on every move.
  const parentOf = id => id === null ? undefined : (SUBJ[id].parent === "world" ? null : SUBJ[id].parent);
  const kidsOf = id => SIDS.filter(c => parentOf(c) === id);
  const spaceOf = id => id === null ? WSP : SUBJ[id];
  function distances(from) {
    const d = new Map([[from, 0]]), q = [from];
    while (q.length) { const x = q.shift(); for (const y of [parentOf(x), ...kidsOf(x)]) if (y !== undefined && !d.has(y)) { d.set(y, d.get(x) + 1); q.push(y); } }
    return d;
  }
  const slow = () => { const c = navigator.connection; return !!c && (c.saveData || /(^|-)2g|3g/.test(c.effectiveType || "")); };
  const warmJob = (url, prio, versioned = true) => { const p = pics.get(url); if (!warmed.has(url) && (!p || !p.state)) jobs.push({ kind: "warm", url, plain: !versioned, prio }); };
  function plan() {
    for (const j of jobs) if (j.p) j.p.job = null;
    jobs = [];
    for (const p of pics.values()) p.keep = 9;
    const dpr = DPR(), far = slow() ? 1 : 99;
    for (const [id, k] of [...distances(space).entries()].sort((a, b) => a[1] - b[1])) {
      const X = spaceOf(id), bases = X.layers.filter(L => L.base), tiles = X.layers.filter(L => !L.base);
      const fitEff = (id === null ? worldFit().s : subjectFit(X).s) * dpr;
      const sharp = bases.find(L => L.d >= fitEff * .9) || bases[bases.length - 1];   // the picture its whole view needs
      if (k <= 1) {
        need(bases[0].p, k); need(sharp.p, k);
        if (X.mask && k === 1) need(X.mask, 1);
      } else if (k <= far) { for (const L of bases) warmJob(L.p.url, 10 + k); if (X.mask) warmJob(X.mask.url, 10 + k); }
      if (k === 0 && id !== null) for (const t of tiles) t.level === 2 && !lowMem ? need(t.p, 2, 2) : warmJob(t.p.url, 3 + t.level);
      else if (id === null && k <= 1 && !lowMem) for (const t of tiles) need(t.p, 3, 2);   // a dive or a way back crosses most of the map
      else if (id === null && k === 0) {
        // small devices: decode the map tiles around each machine, the rest when the zoom gets there
        for (const t of tiles) kidsOf(null).some(c => { const [x, y] = SUBJ[c].spot.plus; return x > t.x && x < t.x + t.w && y > t.y && y < t.y + t.h; }) ? need(t.p, 2) : warmJob(t.p.url, 4);
      } else if (k <= far) for (const t of tiles) warmJob(t.p.url, 12 + k + (t.level || 2));
      if (id !== null && k <= far) {
        for (const pid of X.ORDER) warmJob(`${X.base}detail/${pid}.webp`, (k ? 12 : 4) + k);
        for (const u of X.bookAssets || []) warmJob(u, (k ? 13 : 5) + k, false);
      }
    }
    pump();
  }
  picArrived = () => { updateLayers(); requestDraw(); };

  // ======================================================================= start
  setSpace(null);
  Object.assign(cam, worldFit());
  apply();
  plan();
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

  window.__viewer = {
    get nodes() { return S ? S.nodes : {}; }, get tiles() { return S ? S.tiles : []; }, get space() { return space; },
    cam, focus, unfocus, enter, leave, leaveAll, subjects: SUBJ, worldTiles: wtiles, idle,
    memory: () => ({ decodedMB: Math.round(picBytes / 1e6), pictures: [...pics.values()].filter(live).length, budgetMB: BUDGET / 1e6 })
  };
})();
