// howthings.work lab: the viewer shared by every variant. A variant supplies LAB_DATA (spaces, parts,
// how they nest) and LAB_RENDERER (how its pictures are painted); this file does the rest: camera, dives,
// outlines, the reading panel with the age slider, loading, and the flying leaf. See API.md.
(() => {
  const D = window.LAB_DATA, R = window.LAB_RENDERER || {}, C = window.CONTENT;
  const SP = D.spaces;
  const Q = new URLSearchParams(location.search);
  const SLOWMO = +Q.get("slowmo") || 1;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const NS = "http://www.w3.org/2000/svg";
  const el = (tag, cls, parent, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; if (parent) parent.appendChild(e); return e; };
  const svg = (tag, attrs = {}, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
  const smooth = (a, b, t) => { const u = Math.min(1, Math.max(0, (t - a) / (b - a))); return u * u * (3 - 2 * u); };
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const DPR = () => Math.min(3, devicePixelRatio || 1);
  for (const [id, s] of Object.entries(SP)) { s.id = id; s.parts = s.parts || []; }

  // ======================================================================= words, by age
  const AGES = C.ages;
  let age = +(Q.get("age") || (() => { try { return localStorage.getItem("lab-age"); } catch (e) { return null; } })() || 7);
  if (!AGES.includes(age)) age = 7;
  const pick = t => {
    if (t == null) return "";
    if (typeof t === "string") return t;
    let best = null;
    for (const a of AGES) if (a <= age && t[a] != null) best = t[a];
    if (best == null) for (const a of AGES) if (t[a] != null) { best = t[a]; break; }
    return best || "";
  };
  const words = id => (C.spaces[id] || {});
  const partWords = (sid, pid) => ((words(sid).parts || {})[pid] || {});
  const titleOf = sid => pick(words(sid).title) || sid;
  const nameOf = (sid, pid) => pick(partWords(sid, pid).name) || pid;

  // ======================================================================= pictures
  const imgs = new Map();
  let loading = 0;
  function img(url) {
    let e = imgs.get(url);
    if (e) return e;
    e = { url, bmp: null, w: 0, h: 0, ready: null };
    imgs.set(url, e);
    loading++;
    e.ready = fetch(url).then(r => r.ok ? r.blob() : Promise.reject(new Error(r.status + " " + url)))
      .then(b => window.createImageBitmap ? createImageBitmap(b) : new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(b); }))
      .then(b => { e.bmp = b; e.w = b.width || b.naturalWidth; e.h = b.height || b.naturalHeight; requestDraw(); return e; })
      .catch(err => { console.error("lab: could not load", url, err.message || err); return e; })
      .finally(() => { loading--; });
    return e;
  }
  const loadSpace = s => Promise.all((s.assets || []).map(u => img(u).ready));
  const preloadAround = s => { for (const t of [SP[s.parent], ...Object.values(SP).filter(c => c.parent === s.id)]) if (t) loadSpace(t); };
  // draw a picture at space coordinates (the helper the renderers use)
  function drawImg(g, o, cam, e, x, y, w, h, alpha = 1) {
    if (!e || !e.bmp) return;
    g.save();
    g.setTransform(o.dpr * cam.s, 0, 0, o.dpr * cam.s, o.dpr * cam.x, o.dpr * cam.y);
    g.globalAlpha = (o.alpha == null ? 1 : o.alpha) * alpha;
    g.drawImage(e.bmp, x, y, w, h);
    g.restore();
  }

  // ======================================================================= the page
  document.body.classList.add("age-" + age);
  if (!document.querySelector("link[rel=icon]")) document.head.appendChild(Object.assign(document.createElement("link"), { rel: "icon", href: "data:," }));
  const stage = el("div", "", document.body); stage.id = "lab-stage";
  const view = el("canvas", "", stage); view.id = "lab-view";
  const g = view.getContext("2d");
  const hots = svg("svg", { id: "lab-hots" }, stage);
  const hotG = svg("g", {}, hots);
  const veil = svg("path", { class: "veil", "fill-rule": "evenodd" }, hotG);
  const plusLayer = el("div", "", stage);
  const tip = el("div", "", document.body); tip.id = "lab-tip";
  const head = el("header", "", document.body); head.id = "lab-head";
  const upBtn = el("button", "", head, "&#8592;"); upBtn.id = "lab-up"; upBtn.setAttribute("aria-label", "Back up");
  const crumbs = el("nav", "", head); crumbs.id = "lab-crumbs";
  const variant = el("a", "", head); variant.id = "lab-variant"; variant.href = "../"; variant.textContent = (D.variant && D.variant.name) || "lab";
  variant.title = (D.variant && D.variant.approach) || "";
  const ageBox = el("div", "", head); ageBox.id = "lab-age";
  el("span", "", ageBox, "Age");
  const seg = el("div", "seg", ageBox);
  const ageBtns = AGES.map(a => { const b = el("button", "", seg, (C.ageLabels || {})[a] || a); b.addEventListener("click", () => setAge(a)); b.dataset.age = a; return b; });
  const panel = el("aside", "", document.body); panel.id = "lab-panel";
  const grip = el("button", "", panel); grip.id = "lab-grip"; grip.setAttribute("aria-label", "Bigger or smaller");
  grip.addEventListener("click", () => panel.classList.toggle("small"));
  const body = el("div", "", panel);
  const drivePanel = el("div", "", panel); drivePanel.id = "lab-drive";
  const loader = el("div", "", document.body, "Opening the book…"); loader.id = "lab-loading";

  // ======================================================================= camera
  let W = innerWidth, H = innerHeight;
  const isPhone = () => W < 900;
  // the part of the screen the picture may use: left of the panel on desktop, above the sheet on phones
  function area() {
    const head = isPhone() ? 52 : 56;
    if (isPhone()) { const sheet = panel.classList.contains("small") ? 128 : Math.round(H * .38); return { x: 8, y: head + 2, w: W - 16, h: H - head - sheet - 8 }; }
    return { x: 18, y: head + 6, w: W - 360 - 18, h: H - head - 24 };
  }
  function fitCam(s) {
    const a = area(), [fx, fy, fw, fh] = s.frame || [0, 0, s.w, s.h];
    const k = Math.min(a.w / fw, a.h / fh);
    return { s: k, x: a.x + (a.w - fw * k) / 2 - fx * k, y: a.y + (a.h - fh * k) / 2 - fy * k };
  }
  let space = null;                  // the current space object
  const cam = { x: 0, y: 0, s: 1 };
  let anim = null, focusId = null, dive = null, entering = false;
  // child coordinates → parent coordinates, from the two axes (scale + translation)
  function inParent(c) {
    const [w0, w1] = c.spot.axis, [p0, p1] = c.spot.plateAxis;
    const s = Math.hypot(w1[0] - w0[0], w1[1] - w0[1]) / Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    const mw = [(w0[0] + w1[0]) / 2, (w0[1] + w1[1]) / 2], mp = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2];
    return { s, x: mw[0] - s * mp[0], y: mw[1] - s * mp[1] };
  }
  const childCam = (pcam, m) => ({ s: pcam.s * m.s, x: pcam.x + pcam.s * m.x, y: pcam.y + pcam.s * m.y });
  // the parent camera at which the child's drawing lies exactly where its own whole picture will be
  function landing(c) {
    const t = fitCam(c), m = inParent(c), s = t.s / m.s;
    return { parent: { s, x: t.x - s * m.x, y: t.y - s * m.y }, child: t };
  }
  const maxS = s => fitCam(s).s * (s.maxZoom || 3);
  function clampCam() {
    if (!space) return;
    const f = fitCam(space);
    cam.s = clamp(cam.s, f.s, maxS(space));
    const a = area(), [fx, fy, fw, fh] = space.frame || [0, 0, space.w, space.h];
    const w = fw * cam.s, h = fh * cam.s, sx = Math.max(0, (a.w - w) / 2) + a.w * .2, sy = Math.max(0, (a.h - h) / 2) + a.h * .2;
    cam.x = clamp(cam.x, a.x + a.w - w - fx * cam.s - sx, a.x - fx * cam.s + sx);
    cam.y = clamp(cam.y, a.y + a.h - h - fy * cam.s - sy, a.y - fy * cam.s + sy);
  }
  // fly in log scale, the centre following the zoom; seg: this flight is a stretch [t0, t1] of a longer eased move
  function flyTo(target, ms, onFrame, { seg } = {}) {
    if (anim) cancelAnimationFrame(anim.raf);
    ms = reduceMotion ? 0 : ms * SLOWMO;
    const from = { ...cam }, ls0 = Math.log(from.s), ls1 = Math.log(target.s), t0 = performance.now();
    const c0 = { x: (W / 2 - from.x) / from.s, y: (H / 2 - from.y) / from.s }, c1 = { x: (W / 2 - target.x) / target.s, y: (H / 2 - target.y) / target.s };
    return new Promise(res => {
      const step = now => {
        const t = ms ? Math.min(1, (now - t0) / ms) : 1;
        const e = seg ? (ease(seg[0] + (seg[1] - seg[0]) * t) - ease(seg[0])) / (ease(seg[1]) - ease(seg[0])) : ease(t);
        const s = Math.exp(ls0 + (ls1 - ls0) * e);
        const u = Math.abs(ls1 - ls0) > .05 ? clamp((1 / s - 1 / from.s) / (1 / target.s - 1 / from.s), 0, 1) : e;
        cam.s = s; cam.x = W / 2 - (c0.x + (c1.x - c0.x) * u) * s; cam.y = H / 2 - (c0.y + (c1.y - c0.y) * u) * s;
        if (t >= 1) Object.assign(cam, target);
        if (onFrame) onFrame(e, t);
        drawNow();
        if (t < 1) anim.raf = requestAnimationFrame(step); else { anim = null; res(); }
      };
      anim = { raf: requestAnimationFrame(step) };
    });
  }
  const flightMs = d => Math.min(1800, Math.max(700, 600 + 330 * d));
  const easeInv = f => { let a = 0, b = 1; for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (ease(m) < f) a = m; else b = m; } return (a + b) / 2; };

  // ======================================================================= drawing
  let raf = 0;
  const T0 = performance.now();
  function requestDraw() { if (!raf) raf = requestAnimationFrame(t => { raf = 0; draw(t); }); }
  function drawNow() { if (raf) { cancelAnimationFrame(raf); raf = 0; } draw(performance.now()); }
  function opts(s, c, extra = {}) {
    return { dpr: DPR(), alpha: 1, ghost: false, t: (performance.now() - T0) / 1000, fit: fitCam(s), view: { w: W, h: H },
      drive: s.kind === "drive" ? flight.state : null, focus: s === space ? focusId : null,
      diving: !!dive || entering, flying: !!anim, ...extra };
  }
  function paintSpace(s, c, extra, ctx = g) {
    if (!R.draw) return;
    ctx.save(); R.draw(ctx, s, c, opts(s, c, extra)); ctx.restore();
  }
  // the child's whole page is painted at full strength into its own layer, then faded in as one picture,
  // so a page with its own paper never shows as a see-through rectangle while it takes over
  const layer = document.createElement("canvas"), lg = layer.getContext("2d");
  function draw() {
    const dpr = DPR();
    if (view.width !== Math.round(W * dpr) || view.height !== Math.round(H * dpr)) { view.width = Math.round(W * dpr); view.height = Math.round(H * dpr); }
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, view.width, view.height);
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "medium";
    if (!space) return;
    if (space.kind === "drive") flight.step();
    if (dive) {
      const c = dive.child, cc = childCam(cam, dive.m), k = cc.s / fitCam(c).s;
      const o = opts(space, cam);
      if (!(R.dive && R.dive(g, space, c, { ...cam }, cc, k, o))) {
        const { g1, g2 } = dive;
        if (g2 < 1) paintSpace(space, cam);
        if (g1 > 0 && g2 < 1) paintSpace(c, cc, { alpha: g1, ghost: true, focus: null });
        if (g2 > 0) {
          const ctx = g2 < 1 ? lg : g;
          if (g2 < 1) { if (layer.width !== view.width || layer.height !== view.height) { layer.width = view.width; layer.height = view.height; } }
          ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.fillStyle = c.paper || "#f6f1e7"; ctx.fillRect(0, 0, view.width, view.height); ctx.restore();
          ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "medium";
          paintSpace(c, cc, { focus: null }, ctx);
          if (g2 < 1) { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = g2; g.drawImage(layer, 0, 0); g.restore(); }
        }
      }
    } else paintSpace(space, cam);
    placeOverlay();
    if (anim || dive || space.kind === "drive" || (R.animating && R.animating(space))) requestDraw();
  }

  // ======================================================================= outlines, "+" and the veil
  const bboxOf = polys => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const p of polys) for (const [x, y] of p) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } return { x0, y0, x1, y1 }; };
  const pathD = polys => polys.map(p => "M" + p.map(q => q.map(v => +(+v).toFixed(1)).join(",")).join("L") + "Z").join("");
  let hotEls = [], plusEls = [];
  function buildHots() {
    for (const e of hotEls) e.remove(); for (const e of plusEls) e.remove();
    hotEls = []; plusEls = [];
    if (!space) return;
    for (const p of space.parts) {
      if (!p.polys || !p.polys.length) continue;
      const e = svg("path", { d: pathD(p.polys), class: "hot" + (p.child ? " child" : ""), tabindex: 0, role: "button", "aria-label": nameOf(space.id, p.id) }, hotG);
      e.dataset.part = p.id;
      hotEls.push(e);
      if (p.child && SP[p.child]) {
        const b = el("button", "lab-plus", plusLayer, "+"); b.dataset.part = p.id; b.setAttribute("aria-label", "Look inside: " + nameOf(space.id, p.id));
        const bb = bboxOf(p.polys); b._at = p.plus || p.anchor || [(bb.x0 + bb.x1) / 2, bb.y1];
        b.addEventListener("click", e2 => { e2.stopPropagation(); enter(p.child); });
        plusEls.push(b);
      }
    }
    hotG.appendChild(veil);
  }
  function placeOverlay() {
    hotG.setAttribute("transform", `matrix(${cam.s},0,0,${cam.s},${cam.x},${cam.y})`);
    for (const b of plusEls) b.style.transform = `translate(${(cam.x + cam.s * b._at[0]).toFixed(1)}px, ${(cam.y + cam.s * b._at[1]).toFixed(1)}px)`;
  }
  function setVeil(p) {
    if (!p) { veil.classList.remove("on"); return; }
    const b = 100000;
    veil.setAttribute("d", `M${-b},${-b}H${b}V${b}H${-b}Z` + pathD(p.polys));
    veil.classList.add("on");
    for (const e of hotEls) e.classList.toggle("on", e.dataset.part === p.id);
  }

  // ======================================================================= the panel
  function crumb(label, fn) { const b = el("button", "", null, ""); b.textContent = label; b.addEventListener("click", fn); return b; }
  const chain = s => { const out = []; for (let t = s; t; t = SP[t.parent]) out.unshift(t); return out; };
  function renderHead() {
    const c = chain(space);
    crumbs.replaceChildren();
    c.forEach((s, i) => {
      if (i) crumbs.appendChild(Object.assign(document.createElement("span"), { className: "sep", textContent: "›" }));
      if (i < c.length - 1) crumbs.appendChild(crumb(titleOf(s.id), () => upTo(s.id)));
      else crumbs.appendChild(Object.assign(document.createElement("b"), { textContent: titleOf(s.id) }));
    });
    upBtn.disabled = !space.parent;
    for (const b of ageBtns) b.setAttribute("aria-pressed", +b.dataset.age === age);
  }
  function renderPanel() {
    if (!space) return;
    body.replaceChildren();
    const p = focusId && space.parts.find(q => q.id === focusId);
    if (p) {
      el("div", "kicker", body).textContent = titleOf(space.id);
      el("h2", "", body).textContent = nameOf(space.id, p.id);
      el("p", "say", body).textContent = pick(partWords(space.id, p.id).say);
      const act = el("div", "actions", body);
      if (p.child && SP[p.child]) { const b = el("button", "lab-btn go", act); b.textContent = "Look inside →"; b.addEventListener("click", () => enter(p.child)); }
      const back = el("button", "lab-btn", act); back.textContent = "← " + titleOf(space.id); back.addEventListener("click", () => unfocus());
    } else {
      el("div", "kicker", body).textContent = space.parent ? "Inside: " + titleOf(space.parent) : "howthings.work";
      el("h1", "", body).textContent = titleOf(space.id);
      el("p", "say", body).textContent = pick(words(space.id).intro);
    }
    if (space.kind === "drive") { const st = el("p", "status", body); st.id = "lab-status"; st.textContent = flight.say || ""; }
    const chips = el("div", "chips", body);
    for (const q of space.parts) {
      const b = el("button", q.child ? "child" : "", chips); b.textContent = nameOf(space.id, q.id);
      b.addEventListener("click", () => q.child && focusId === q.id ? enter(q.child) : focus(q.id));
    }
  }
  function setAge(a) {
    age = a;
    try { localStorage.setItem("lab-age", a); } catch (e) {}
    document.body.className = document.body.className.replace(/\bage-\d+\b/, "") + " age-" + a;
    renderHead(); renderPanel();
    for (const e of hotEls) e.setAttribute("aria-label", nameOf(space.id, e.dataset.part));
  }

  // ======================================================================= spaces: show, focus, dive
  function show(s, c) {
    space = s; focusId = null; setVeil(null);
    document.body.style.setProperty("--paper", s.paper || "#f6f1e7");
    document.body.classList.toggle("lab-drive", s.kind === "drive");
    if (s.kind === "drive") flight.reset();
    Object.assign(cam, c || fitCam(s));
    buildHots(); renderHead(); renderPanel(); placeOverlay();
    try { history.replaceState(null, "", "#" + s.id); } catch (e) {}
    preloadAround(s);
    requestDraw();
  }
  function focusCam(p) {
    const a = area(), b = bboxOf(p.polys), pad = .3;
    const bw = (b.x1 - b.x0) * (1 + pad * 2), bh = (b.y1 - b.y0) * (1 + pad * 2), f = fitCam(space).s;
    const s = clamp(Math.min(a.w / bw, a.h / bh), f * 1.15, maxS(space));
    const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
    return { s, x: a.x + a.w / 2 - cx * s, y: a.y + a.h / 2 - cy * s };
  }
  function focus(id) {
    const p = space.parts.find(q => q.id === id);
    if (!p || entering) return;
    focusId = id; setVeil(p); renderPanel();
    if (isPhone()) panel.classList.remove("small");
    if (space.kind !== "drive") flyTo(focusCam(p), 1000);
    requestDraw();
  }
  function unfocus() {
    if (!focusId) return;
    focusId = null; setVeil(null); for (const e of hotEls) e.classList.remove("on"); renderPanel();
    if (space.kind !== "drive") flyTo(fitCam(space), 900);
  }
  const ready = s => loadSpace(s).then(() => (R.ready && !R.ready(s)) ? new Promise(r => { const t = setInterval(() => { if (R.ready(s)) { clearInterval(t); r(); } }, 50); }) : 0);
  function setDive(e, dir) {
    const c = dive.child, k = childCam(cam, dive.m).s / fitCam(c).s;
    const sched = c.dive || {};
    const [a1, b1] = sched.g1 || [.05, .3], [a2, b2] = sched.g2 || [.45, .96];
    const w = dir > 0 ? (e >= 1 ? 1 : smooth(0, .2, e)) : 1 - smooth(.75, 1, e);
    dive.g2 = smooth(a2, b2, k) * w; dive.g1 = Math.max(dive.g2, smooth(a1, b1, k)) * w; dive.k = k;
  }
  async function enter(id) {
    const c = SP[id];
    if (!c || entering || c === space) return;
    tip.classList.remove("on");
    if (c.parent !== space.id) return jump(id);
    entering = true; document.body.classList.add("entering");
    focusId = null; setVeil(null);
    await Promise.race([ready(c), new Promise(r => setTimeout(r, 2500))]);
    const L = landing(c);
    dive = { child: c, m: inParent(c), g1: 0, g2: 0 };
    await flyTo(L.parent, flightMs(Math.abs(Math.log(L.parent.s / cam.s))), e => setDive(e, 1));
    dive = null;
    show(c, L.child);
    entering = false; document.body.classList.remove("entering");
    requestDraw();
  }
  async function leave() {
    if (!space || !space.parent || entering) return;
    const c = space, p = SP[c.parent];
    entering = true; document.body.classList.add("entering");
    focusId = null; setVeil(null);
    await Promise.race([ready(p), new Promise(r => setTimeout(r, 2500))]);
    const L = landing(c), up = fitCam(p);
    const d1 = Math.abs(Math.log(cam.s / L.child.s)) + Math.hypot(cam.x - L.child.x, cam.y - L.child.y) / Math.max(W, H);
    const d2 = Math.abs(Math.log(L.parent.s / up.s)), ms = flightMs(d1 + d2), split = d1 > .03 ? easeInv(d1 / (d1 + d2)) : 0;
    if (split) await flyTo(L.child, ms * split, null, { seg: [0, split] });
    show(p, L.parent);
    dive = { child: c, m: inParent(c), g1: 1, g2: 1 };
    entering = true; document.body.classList.add("entering");
    await flyTo(up, ms * (1 - split), e => setDive(e, -1), { seg: [split, 1] });
    dive = null;
    entering = false; document.body.classList.remove("entering");
    requestDraw();
  }
  async function jump(id) {
    const s = SP[id]; if (!s) return;
    await ready(s);
    show(s);
  }
  async function upTo(id) { while (space && space.id !== id && space.parent) await leave(); }
  async function leaveAll() { while (space && space.parent) await leave(); }

  // ======================================================================= the flying leaf
  const flight = {
    state: null, input: { x: 0, y: 0 }, say: "", last: 0,
    reset() {
      this.state = { pitch: 1, roll: 0, yoke: { x: 0, y: 0 }, throttle: .62, flaps: 0, gear: 0, speed: 290, altitude: 9000, heading: 90, vs: 0, t: 0 };
      this.input = { x: 0, y: 0 }; this.last = performance.now(); syncDriveUI();
    },
    step() {
      const s = this.state; if (!s) return;
      const now = performance.now(), dt = Math.min(.05, (now - this.last) / 1000); this.last = now; s.t += dt;
      const ap = (v, t, r) => v + (t - v) * (1 - Math.exp(-r * dt));
      s.yoke.x = ap(s.yoke.x, this.input.x, 8); s.yoke.y = ap(s.yoke.y, this.input.y, 8);
      // a forgiving plane: the wheel asks for a bank and a nose angle, and the plane eases towards them
      const stall = 150 - 35 * s.flaps, slow = s.speed < stall;
      s.roll = ap(s.roll, s.yoke.x * 32, 1.2);
      s.pitch = ap(s.pitch, slow ? -4 : 1 + s.yoke.y * 13 + s.flaps * 2, 1.0);
      const drag = .25 + .25 * s.flaps + .2 * s.gear;
      const acc = 40 * s.throttle - 30 * drag * (s.speed / 280) ** 2 - 2.2 * (s.pitch - 1);   // knots per second
      s.speed = clamp(s.speed + acc * dt, 95, 520);
      const gamma = (s.pitch - 1 + s.flaps * 1.5) * Math.PI / 180;     // centred controls fly level
      s.vs = s.speed * 101.27 * Math.sin(gamma);
      s.altitude = Math.max(0, s.altitude + s.vs / 60 * dt);
      s.heading = (s.heading + 1091 * Math.tan(s.roll * Math.PI / 180) / Math.max(100, s.speed) * dt + 360) % 360;
      const say = slow ? "slow" : Math.abs(s.roll) > 8 ? (s.roll < 0 ? "left" : "right") : s.vs > 400 ? "climb" : s.vs < -400 ? "descend" : "level";
      const text = pick((words("drive").status || {})[say]);
      if (text !== this.say) { this.say = text; const st = document.getElementById("lab-status"); if (st) st.textContent = text; }
      if (now - (this.gaugeT || 0) > 120) { this.gaugeT = now; updateGauges(); }
    }
  };
  let yokeEl, knob, thr, flapBtns, gearBtns, gauges;
  function buildDriveUI() {
    drivePanel.innerHTML = `<div class="row"><div id="lab-yoke" aria-label="Control wheel: drag" role="slider" tabindex="0"><div id="lab-knob"></div>
      <span class="lbl" style="top:6px;left:50%;transform:translateX(-50%)">push</span><span class="lbl" style="bottom:6px;left:50%;transform:translateX(-50%)">pull</span></div>
      <div class="levers"><label for="lab-thr">Thrust levers</label><input id="lab-thr" type="range" min="0" max="100" value="62">
      <label>Flaps</label><div class="seg" id="lab-flaps"><button data-v="0">Up</button><button data-v=".5">Half</button><button data-v="1">Full</button></div>
      <label>Wheels</label><div class="seg" id="lab-gear"><button data-v="0">Up</button><button data-v="1">Down</button></div></div></div>
      <div class="gauges"><div><small>Speed</small><span id="g-speed"></span></div><div><small>Height</small><span id="g-alt"></span></div><div><small>Heading</small><span id="g-hdg"></span></div></div>`;
    yokeEl = drivePanel.querySelector("#lab-yoke"); knob = drivePanel.querySelector("#lab-knob");
    thr = drivePanel.querySelector("#lab-thr");
    flapBtns = [...drivePanel.querySelectorAll("#lab-flaps button")]; gearBtns = [...drivePanel.querySelectorAll("#lab-gear button")];
    gauges = { speed: drivePanel.querySelector("#g-speed"), alt: drivePanel.querySelector("#g-alt"), hdg: drivePanel.querySelector("#g-hdg") };
    let dragging = false;
    const setFrom = e => {
      const r = yokeEl.getBoundingClientRect(), R2 = r.width / 2 - 23;
      let x = (e.clientX - r.left - r.width / 2) / R2, y = (e.clientY - r.top - r.height / 2) / R2;
      const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
      flight.input = { x, y }; knob.style.transform = `translate(${x * R2}px, ${y * R2}px)`;
    };
    yokeEl.addEventListener("pointerdown", e => { dragging = true; yokeEl.setPointerCapture(e.pointerId); setFrom(e); });
    yokeEl.addEventListener("pointermove", e => { if (dragging) setFrom(e); });
    const release = () => { dragging = false; flight.input = { x: 0, y: 0 }; knob.style.transform = ""; };
    yokeEl.addEventListener("pointerup", release); yokeEl.addEventListener("pointercancel", release);
    thr.addEventListener("input", () => { flight.state.throttle = thr.value / 100; requestDraw(); });
    flapBtns.forEach(b => b.addEventListener("click", () => { flight.state.flaps = +b.dataset.v; syncDriveUI(); }));
    gearBtns.forEach(b => b.addEventListener("click", () => { flight.state.gear = +b.dataset.v; syncDriveUI(); }));
  }
  function syncDriveUI() {
    if (!thr || !flight.state) return;
    thr.value = Math.round(flight.state.throttle * 100);
    flapBtns.forEach(b => b.setAttribute("aria-pressed", +b.dataset.v === flight.state.flaps));
    gearBtns.forEach(b => b.setAttribute("aria-pressed", +b.dataset.v === flight.state.gear));
  }
  function updateGauges() {
    const s = flight.state; if (!gauges || !s) return;
    gauges.speed.textContent = Math.round(s.speed) + " kt";
    gauges.alt.textContent = (Math.round(s.altitude / 100) * 100).toLocaleString("en") + " ft";
    gauges.hdg.textContent = String(Math.round(s.heading)).padStart(3, "0") + "°";
  }
  buildDriveUI();

  // ======================================================================= pointer: pan, zoom, tap
  const pointers = new Map();
  let drag = null, pinch = null, outAcc = 0;
  const partAt = t => { const e = t && t.closest ? t.closest("[data-part]") : null; return e && space.parts.find(p => p.id === e.dataset.part); };
  stage.addEventListener("pointerdown", e => {
    if (e.target.closest(".lab-plus")) return;
    stage.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) drag = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y, moved: false, target: e.target };
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: cam.s }; drag = null; }
  });
  stage.addEventListener("pointermove", e => {
    const p = pointers.get(e.pointerId); if (p) { p.x = e.clientX; p.y = e.clientY; }
    if (entering || !space) return;
    if (pinch && pointers.size === 2 && space.kind !== "drive") {
      const [a, b] = [...pointers.values()], want = pinch.s * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d;
      if (space.parent && !focusId && want < fitCam(space).s * .8) { pinch = null; leave(); return; }
      zoomAt(want / cam.s, (a.x + b.x) / 2, (a.y + b.y) / 2); return;
    }
    if (drag && pointers.size === 1 && space.kind !== "drive") {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) > 6) { drag.moved = true; stage.classList.add("dragging"); if (anim) { cancelAnimationFrame(anim.raf); anim = null; } }
      if (drag.moved) { cam.x = drag.cx + dx; cam.y = drag.cy + dy; clampCam(); requestDraw(); }
      return;
    }
    if (e.pointerType === "mouse") {
      const q = partAt(e.target);
      for (const h of hotEls) h.classList.toggle("lit", !!q && h.dataset.part === q.id);
      if (q) { tip.textContent = nameOf(space.id, q.id) + (q.child ? "  ·  look inside" : ""); tip.style.left = e.clientX + "px"; tip.style.top = e.clientY + "px"; tip.classList.add("on"); }
      else tip.classList.remove("on");
    }
  });
  function endPointer(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    if (pinch && pointers.size < 2) { pinch = null; drag = null; return; }
    if (drag && !pointers.size) {
      stage.classList.remove("dragging");
      if (!drag.moved && e.type === "pointerup" && !entering) {
        const q = partAt(drag.target);
        if (q && q.child && SP[q.child] && (focusId === q.id || e.pointerType === "mouse")) enter(q.child);
        else if (q) focus(q.id);
        else if (focusId) unfocus();
      }
      drag = null;
    }
  }
  stage.addEventListener("pointerup", endPointer);
  stage.addEventListener("pointercancel", endPointer);
  stage.addEventListener("pointerleave", () => tip.classList.remove("on"));
  function zoomAt(f, sx, sy) {
    if (anim) { cancelAnimationFrame(anim.raf); anim = null; }
    const wx = (sx - cam.x) / cam.s, wy = (sy - cam.y) / cam.s;
    cam.s *= f; clampCam(); cam.x = sx - wx * cam.s; cam.y = sy - wy * cam.s; clampCam();
    requestDraw();
  }
  stage.addEventListener("wheel", e => {
    e.preventDefault();
    if (entering || !space || space.kind === "drive") return;
    if (space.parent && e.deltaY > 0 && cam.s <= fitCam(space).s * 1.001) { outAcc += e.deltaY; if (outAcc > 240) { outAcc = 0; leave(); } return; }
    outAcc = 0;
    zoomAt(Math.exp(-e.deltaY * (e.ctrlKey ? .01 : .0018)), e.clientX, e.clientY);
  }, { passive: false });
  addEventListener("keydown", e => {
    if (space && space.kind === "drive" && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
      e.preventDefault();
      const i = flight.input; if (e.key === "ArrowLeft") i.x = -1; if (e.key === "ArrowRight") i.x = 1; if (e.key === "ArrowUp") i.y = -1; if (e.key === "ArrowDown") i.y = 1;
      return;
    }
    if (e.key === "Escape") { if (focusId) unfocus(); else leave(); }
  });
  addEventListener("keyup", e => { if (["ArrowLeft", "ArrowRight"].includes(e.key)) flight.input.x = 0; if (["ArrowUp", "ArrowDown"].includes(e.key)) flight.input.y = 0; });
  upBtn.addEventListener("click", () => focusId ? unfocus() : leave());
  addEventListener("resize", () => {
    W = innerWidth; H = innerHeight;
    if (anim) { cancelAnimationFrame(anim.raf); anim = null; }
    if (space) { const p = focusId && space.parts.find(q => q.id === focusId); Object.assign(cam, p && space.kind !== "drive" ? focusCam(p) : fitCam(space)); }
    requestDraw();
  });
  new MutationObserver(() => { if (space && !anim && !focusId) { Object.assign(cam, fitCam(space)); requestDraw(); } }).observe(panel, { attributes: true, attributeFilter: ["class"] });

  // ======================================================================= start
  const lab = { img, draw: drawImg, requestDraw, data: D, content: C, age: () => age };
  if (R.init) R.init(lab);
  window.__lab = {
    enter, leave, leaveAll, focus, unfocus, setAge,
    get space() { return space && space.id; }, get cam() { return { ...cam }; }, get age() { return age; },
    idle: () => !loading && !anim && !entering,
    drive: { set(v) { if (!flight.state) return; if (v.yoke) flight.input = { ...v.yoke }; for (const k of ["throttle", "flaps", "gear"]) if (k in v) flight.state[k] = v[k]; syncDriveUI(); }, get state() { return flight.state; } }
  };
  const startId = SP[location.hash.slice(1)] ? location.hash.slice(1) : D.root;
  ready(SP[startId]).then(() => { show(SP[startId]); loader.classList.add("gone"); for (const s of Object.values(SP)) setTimeout(() => loadSpace(s), 1500); });
})();
