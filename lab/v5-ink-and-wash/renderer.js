// v5 · Ink and wash: every space is a vector pen-and-ink drawing (potrace paths, drawn with Path2D, sharp at any
// zoom) over a separate loose watercolour wash (one soft picture with the subject's silhouette as alpha), on paper.
(() => {
  const INK = "#261b13";                       // warm dark ink
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  // ---------------------------------------------------------------- vector line sets
  // A set = potrace paths cut into square geometric tiles (each with its own transform), so a zoomed-in view only
  // touches the paths near it. Drawing goes through a raster tile pyramid: level L renders the lines at
  // 2^L / 8 device px per space unit into 512 px tiles, lazily, within a time budget per frame; missing tiles are
  // covered by a coarser cached level until they are ready. Vectors stay sharp at any zoom; frames stay fast.
  const sets = {};                            // url -> { st, j, paths: [Path2D], pyr: Map }
  function lineSet(url) {
    let s = sets[url];
    if (s) return s;
    s = sets[url] = { st: "loading", pyr: new Map(), url };
    fetch(url).then(r => r.arrayBuffer()).then(buf => {
      const u8 = new Uint8Array(buf), n = new DataView(buf).getUint32(4, true);
      const j = JSON.parse(new TextDecoder().decode(u8.subarray(8, 8 + n)));
      s.j = j; s.paths = j.tiles.map(t => decodePath(u8, 8 + n + t.o, 8 + n + t.o + t.n)); s.st = "ok"; R.lab && R.lab.requestDraw();
    }).catch(e => { s.st = "err"; console.warn("lines", url, e); });
    return s;
  }
  // the binary path stream (see tools/vectorize.py) -> Path2D, in potrace units
  function decodePath(u8, i, end) {
    const p = new Path2D(), num = [];
    let x = 0, y = 0, sx = 0, sy = 0;
    const uv = () => { let v = 0, sh = 0, b; do { b = u8[i++]; v += (b & 0x7f) * Math.pow(2, sh); sh += 7; } while (b & 0x80); return v; };
    const vi = () => { const v = uv(); return v % 2 ? -(v + 1) / 2 : v / 2; };
    while (i < end) {
      const op = u8[i++];
      if (op === 4) { p.closePath(); x = sx; y = sy; continue; }
      const c = uv(); num.length = 0; for (let k = 0; k < c; k++) num.push(vi());
      if (op === 2) {
        for (let k = 0; k + 5 < c; k += 6) { p.bezierCurveTo(x + num[k], y + num[k + 1], x + num[k + 2], y + num[k + 3], x + num[k + 4], y + num[k + 5]); x += num[k + 4]; y += num[k + 5]; }
      } else if (op === 3) {
        for (let k = 0; k + 1 < c; k += 2) { x += num[k]; y += num[k + 1]; p.lineTo(x, y); }
      } else {
        for (let k = 0; k + 1 < c; k += 2) {
          if (op === 0) { x = num[k]; y = num[k + 1]; } else { x += num[k]; y += num[k + 1]; }
          if (k === 0) { p.moveTo(x, y); sx = x; sy = y; } else p.lineTo(x, y);
        }
      }
    }
    return p;
  }
  const TS = 512, BL = 2, MAXL = 15;           // tile size and bleed in device px; deepest level
  const sig = L => Math.pow(2, L) / 8;          // device px per space unit at level L
  const span = L => TS / sig(L);                // space units per tile
  let tileCount = 0, lru = 0;
  const MAX_TILES = 72;                         // ~1 MB each; evicted ones free their pixels at once (width = 0)
  // render one pyramid tile (all vector tiles that touch it)
  function renderTile(set, L, i, j) {
    const c = document.createElement("canvas"); c.width = c.height = TS + 2 * BL;
    const x = c.getContext("2d"), sg = sig(L), sp = span(L), X0 = i * sp, Y0 = j * sp, m = BL / sg;
    const T = set.j.tiles; x.fillStyle = INK;
    for (let n = 0; n < T.length; n++) {
      const b = T[n].b;
      if (b[2] < X0 - m || b[0] > X0 + sp + m || b[3] < Y0 - m || b[1] > Y0 + sp + m) continue;
      const [a, d, e, f] = T[n].t;
      x.setTransform(sg * a, 0, 0, sg * d, sg * (e - X0) + BL, sg * (f - Y0) + BL);
      x.fill(set.paths[n]);
    }
    return c;
  }
  function evict() {
    if (tileCount <= MAX_TILES) return;
    const all = [];
    for (const s of Object.values(sets)) for (const [k, t] of s.pyr) all.push([t.used, s, k]);
    all.sort((a, b) => a[0] - b[0]);
    for (let n = 0; n < all.length && tileCount > MAX_TILES * .8; n++) { if (all[n][0] >= lru - 1) break; const t = all[n][1].pyr.get(all[n][2]); t.cv.width = t.cv.height = 0; all[n][1].pyr.delete(all[n][2]); tileCount--; }
  }
  let budgetEnd = 0, pending = false;
  function getTile(set, L, i, j, make) {
    const key = L * 1e8 + j * 1e4 + i;
    let t = set.pyr.get(key);
    if (t) { t.used = lru; return t.cv; }
    if (!make) return null;
    if (performance.now() > budgetEnd) { pending = true; return null; }
    t = { cv: renderTile(set, L, i, j), used: lru }; set.pyr.set(key, t); tileCount++;
    return t.cv;
  }
  // draw a set through the pyramid. g in device space; cam/o as in draw(); vis: visible space rect
  function fillLines(g, set, o, cam, vis, alpha, clipRect) {
    if (!set || set.st !== "ok" || alpha <= 0) return;
    const k = o.dpr * cam.s;
    const L = clamp(Math.ceil(Math.log2(k * 8) - .1), 0, MAXL), sp = span(L), sg = sig(L);
    let [vx0, vy0, vx1, vy1] = vis;
    if (clipRect) { vx0 = Math.max(vx0, clipRect[0]); vy0 = Math.max(vy0, clipRect[1]); vx1 = Math.min(vx1, clipRect[2]); vy1 = Math.min(vy1, clipRect[3]); }
    vx0 = Math.max(vx0, 0); vy0 = Math.max(vy0, 0); vx1 = Math.min(vx1, set.j.w); vy1 = Math.min(vy1, set.j.h);
    if (vx1 <= vx0 || vy1 <= vy0) return;
    const i0 = Math.floor(vx0 / sp), i1 = Math.floor(vx1 / sp), j0 = Math.floor(vy0 / sp), j1 = Math.floor(vy1 / sp);
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = alpha;
    const ox = o.dpr * cam.x, oy = o.dpr * cam.y;
    const order = [];
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) order.push([i, j]);
    const cx = (vx0 + vx1) / 2 / sp, cy = (vy0 + vy1) / 2 / sp;
    order.sort((a, b) => Math.hypot(a[0] + .5 - cx, a[1] + .5 - cy) - Math.hypot(b[0] + .5 - cx, b[1] + .5 - cy));
    for (const [i, j] of order) {
      const X0 = i * sp, Y0 = j * sp;
      const dx0 = Math.round(ox + k * X0), dy0 = Math.round(oy + k * Y0), dx1 = Math.round(ox + k * (X0 + sp)), dy1 = Math.round(oy + k * (Y0 + sp));
      const cv = getTile(set, L, i, j, true);
      if (cv) { g.drawImage(cv, BL, BL, TS, TS, dx0, dy0, dx1 - dx0, dy1 - dy0); continue; }
      // stand-in: the nearest coarser cached level
      for (let L2 = L - 1; L2 >= 0; L2--) {
        const f = Math.pow(2, L - L2), i2 = Math.floor(i / f), j2 = Math.floor(j / f);
        const c2 = getTile(set, L2, i2, j2, false);
        if (!c2) continue;
        const sub = TS / f;
        g.drawImage(c2, BL + (i - i2 * f) * sub, BL + (j - j2 * f) * sub, sub, sub, dx0, dy0, dx1 - dx0, dy1 - dy0);
        break;
      }
    }
  }
  // make sure the coarse level of a set exists (so a space never shows without lines)
  function warm(set, o) {
    if (set.st !== "ok") return false;
    const L = 2, sp = span(L);
    for (let j = 0; j * sp < set.j.h; j++) for (let i = 0; i * sp < set.j.w; i++) {
      const key = L * 1e8 + j * 1e4 + i;
      if (!set.pyr.has(key)) { set.pyr.set(key, { cv: renderTile(set, L, i, j), used: lru }); tileCount++; }
    }
    return true;
  }

  // ---------------------------------------------------------------- washes: paper × wash, pre-multiplied once
  const washes = {};                          // url -> { entry, canvas (paper-tinted, silhouette alpha) }
  function wash(url, paper) {
    const key = url + paper;
    let w = washes[key];
    if (w) return w;
    w = washes[key] = { entry: R.lab.img(url), cv: null };
    w.entry.ready.then(() => {
      const { bmp, w: W, h: H } = w.entry;
      const c = document.createElement("canvas"); c.width = W; c.height = H;
      const x = c.getContext("2d");
      x.fillStyle = paper; x.fillRect(0, 0, W, H);
      x.globalCompositeOperation = "multiply"; x.drawImage(bmp, 0, 0);
      x.globalCompositeOperation = "destination-in"; x.drawImage(bmp, 0, 0);
      w.cv = c; R.lab.requestDraw();
    });
    return w;
  }

  // ---------------------------------------------------------------- paper grain (made in code, tiny)
  let grain = null;
  function makeGrain() {
    const N = 384, c = document.createElement("canvas"); c.width = c.height = N;
    const x = c.getContext("2d"), im = x.createImageData(N, N), d = im.data;
    // value noise at two scales + fibres
    const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
    const g1 = new Float32Array(N * N);
    for (let i = 0; i < N * N; i++) g1[i] = rnd();
    const blur = (src, r) => { const o = new Float32Array(N * N); for (let y = 0; y < N; y++) for (let xx = 0; xx < N; xx++) { let s = 0, n = 0; for (let k = -r; k <= r; k++) { s += src[y * N + ((xx + k + N) % N)]; n++; } o[y * N + xx] = s / n; }
      const o2 = new Float32Array(N * N); for (let y = 0; y < N; y++) for (let xx = 0; xx < N; xx++) { let s = 0, n = 0; for (let k = -r; k <= r; k++) { s += o[((y + k + N) % N) * N + xx]; n++; } o2[y * N + xx] = s / n; } return o2; };
    const b1 = blur(g1, 1), b4 = blur(g1, 5);
    for (let i = 0; i < N * N; i++) {
      const v = 255 - (b1[i] - .5) * 60 - (b4[i] - .5) * 90 - (g1[i] > .985 ? 10 : 0);
      d[i * 4] = v; d[i * 4 + 1] = v * .995; d[i * 4 + 2] = v * .985; d[i * 4 + 3] = 255;
    }
    x.putImageData(im, 0, 0);
    return c;
  }
  function paperGrain(g, o, cam, alpha) {
    if (!grain) { grain = makeGrain(); grain.pats = new WeakMap(); }
    let pat = grain.pats.get(g);                 // one pattern per context (the core may hand us an offscreen layer)
    if (!pat) { pat = g.createPattern(grain, "repeat"); grain.pats.set(g, pat); }
    const ox = ((o.dpr * cam.x) % 384 + 384) % 384, oy = ((o.dpr * cam.y) % 384 + 384) % 384;
    g.setTransform(1, 0, 0, 1, ox, oy);
    g.globalCompositeOperation = "multiply"; g.globalAlpha = alpha; g.fillStyle = pat;
    g.fillRect(-ox, -oy, o.view.w * o.dpr, o.view.h * o.dpr);
    g.globalCompositeOperation = "source-over";
  }

  // visible rect of the space, in space coords
  const visRect = (o, cam) => [-cam.x / cam.s, -cam.y / cam.s, (o.view.w - cam.x) / cam.s, (o.view.h - cam.y) / cam.s];

  // ---------------------------------------------------------------- deep zoom: finer line drawings of regions
  let off = null;
  function offscreen(o) {
    const W = Math.round(o.view.w * o.dpr), H = Math.round(o.view.h * o.dpr);
    if (!off) { off = [document.createElement("canvas"), document.createElement("canvas")]; }
    for (const c of off) if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
    return off.map(c => c.getContext("2d"));
  }
  function detailMask(x, dt, o, cam, k) {
    // an elliptical soft mask over the detail's rect, in screen pixels
    const [x0, y0, x1, y1] = dt.keep || dt.rect;
    const cx = o.dpr * (cam.x + cam.s * (x0 + x1) / 2), cy = o.dpr * (cam.y + cam.s * (y0 + y1) / 2);
    const rx = o.dpr * cam.s * (x1 - x0) / 2, ry = o.dpr * cam.s * (y1 - y0) / 2;
    x.setTransform(rx, 0, 0, ry, cx, cy);
    const gr = x.createRadialGradient(0, 0, 0, 0, 0, 1);
    gr.addColorStop(0, `rgba(0,0,0,${k})`); gr.addColorStop(.72, `rgba(0,0,0,${k})`); gr.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = gr; x.globalAlpha = 1; x.beginPath(); x.arc(0, 0, 1, 0, Math.PI * 2); x.fill();
  }
  function drawLines(g, s, o, cam, alpha) {
    const base = lineSet(s.lines), vis = visRect(o, cam), zoom = cam.s / o.fit.s;
    const act = (s.details || []).map(dt => ({ dt, k: smooth(dt.from, dt.to, zoom) }))
      .filter(a => a.k > 0 && !(a.dt.rect[2] < vis[0] || a.dt.rect[0] > vis[2] || a.dt.rect[3] < vis[1] || a.dt.rect[1] > vis[3]));
    if (!act.length) { fillLines(g, base, o, cam, vis, alpha); return; }
    const [A, B] = offscreen(o);
    A.setTransform(1, 0, 0, 1, 0, 0); A.globalCompositeOperation = "source-over"; A.clearRect(0, 0, A.canvas.width, A.canvas.height);
    fillLines(A, base, o, cam, vis, 1);
    for (const { dt, k } of act) {
      const set = lineSet(dt.lines); if (set.st !== "ok") continue;
      B.setTransform(1, 0, 0, 1, 0, 0); B.globalCompositeOperation = "source-over"; B.clearRect(0, 0, B.canvas.width, B.canvas.height);
      fillLines(B, set, o, cam, vis, 1);
      B.globalCompositeOperation = "destination-in"; detailMask(B, dt, o, cam, k); B.globalCompositeOperation = "source-over";
      A.globalCompositeOperation = "destination-out"; detailMask(A, dt, o, cam, k);
      A.globalCompositeOperation = "source-over"; A.setTransform(1, 0, 0, 1, 0, 0); A.globalAlpha = 1; A.drawImage(B.canvas, 0, 0);
    }
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = alpha; g.drawImage(A.canvas, 0, 0);
  }

  // ---------------------------------------------------------------- one space
  function drawSpace(g, s, cam, o) {
    const lab = R.lab, a = o.alpha;
    const W = s.wash ? wash(s.wash, s.paper) : {};
    const tr = () => g.setTransform(o.dpr * cam.s, 0, 0, o.dpr * cam.s, o.dpr * cam.x, o.dpr * cam.y);
    // the first arrival: the lines draw themselves on from the middle (quick)
    let reveal = 1;
    if (!o.ghost && s === R.firstSpace) { if (R.t0 == null) R.t0 = o.t; reveal = smooth(0, 1.1, o.t - R.t0); if (reveal >= 1) R.firstSpace = null; }
    if (!o.ghost) {
      g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = a; g.fillStyle = s.paper;
      g.fillRect(0, 0, o.view.w * o.dpr, o.view.h * o.dpr);
    }
    if (s.under) s.under(g, s, cam, o);
    // the wash: ghosts bring it in after the lines
    const wa = o.ghost ? a * smooth(.35, 1, a) : a * smooth(.15, 1, reveal);
    if (W.cv && wa > 0) {
      tr(); g.globalAlpha = wa;
      const [x0, y0, x1, y1] = s.washRect || [0, 0, s.w, s.h];
      g.drawImage(W.cv, x0, y0, x1 - x0, y1 - y0);
    }
    if (!o.ghost) paperGrain(g, o, cam, a * .55);
    const la = o.ghost ? Math.min(1, a * 1.8) : a;
    if (reveal < 1) {
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
      const cx = o.view.w * o.dpr / 2, cy = o.view.h * o.dpr / 2, r = Math.hypot(cx, cy) * reveal;
      g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.clip();
      drawLines(g, s, o, cam, la); g.restore();
    } else drawLines(g, s, o, cam, la);
    if (s.over) s.over(g, s, cam, o, R);
  }

  // ---------------------------------------------------------------- the flying leaf
  function drawDrive(g, s, cam, o) {
    const d = o.drive || { pitch: 0, roll: 0, yoke: { x: 0, y: 0 }, throttle: .6, flaps: 0, gear: 0, speed: 280, heading: 90, t: 0 };
    const k = o.dpr * cam.s, a = o.alpha;
    const tr = () => g.setTransform(k, 0, 0, k, o.dpr * cam.x, o.dpr * cam.y);
    // the world outside goes under the cockpit's wash, whose window panes are holes
    s.under = (g2, s2, cam2, o2) => {
      const V = s.view;
      g.save(); tr();
      g.beginPath(); for (const p of s.windows) { g.moveTo(p[0][0], p[0][1]); for (const q of p) g.lineTo(q[0], q[1]); g.closePath(); } g.clip();
      g.translate(V.hx, V.hy + d.pitch * V.ppd); g.rotate(-d.roll * Math.PI / 180);
      g.globalAlpha = a * (o.ghost ? smooth(.3, 1, a) : 1);
      paintWorld(g, d, V);
      g.restore();
    };
    g.save(); tr(); g.beginPath(); g.rect(0, 0, s.w, s.h); g.clip();
    drawSpace(g, s, cam, o);
    const sp = s.sprites || {};
    // the thrust lever handles slide forward (up the picture) with the throttle, along the four slots
    if (sp.thr) {
      const T = sp.thr, dy = T.back - T.travel * d.throttle;
      const k0 = T.shafts[0], k1 = T.shafts[3], q0 = T.slots[0], q1 = T.slots[3], sx = (q1 - q0) / (k1 - k0);
      g.save(); tr(); g.globalAlpha = a; g.strokeStyle = INK; g.lineWidth = 3.4;
      for (const x of T.slots) { g.beginPath(); g.moveTo(x, T.keep[3] - 6 + dy); g.lineTo(x, s.h + 4); g.stroke(); }
      g.restore();
      drawSprite(g, T, o, cam, m => { m.translate(q0, dy); m.scale(sx, 1); m.translate(-k0, 0); });
    }
    // the control wheel turns with yoke.x and slides in and out with yoke.y
    if (sp.yoke) {
      const y = sp.yoke, [px, py] = y.pivot;
      drawSprite(g, y, o, cam, m => { m.translate(px, py - d.yoke.y * y.slide); const sc = 1 + d.yoke.y * .06; m.scale(sc, sc); m.rotate(d.yoke.x * 70 * Math.PI / 180); m.translate(-px, -py); });
    }
    drawLevers(g, s, d, o, cam);
    g.restore();
  }
  // a sprite: its own wash (silhouette) and vector lines, both in the space's coordinates, under an extra transform
  function drawSprite(g, sp, o, cam, xf) {
    const ws = wash(sp.wash, "#ffffff"), ls = lineSet(sp.lines);
    g.save(); g.setTransform(o.dpr * cam.s, 0, 0, o.dpr * cam.s, o.dpr * cam.x, o.dpr * cam.y); xf(g);
    g.globalAlpha = o.alpha;
    if (ws.entry && ws.entry.bmp) g.drawImage(ws.entry.bmp, 0, 0, ls.st === "ok" ? ls.j.w : ws.entry.w, ls.st === "ok" ? ls.j.h : ws.entry.h);
    if (ls.st === "ok") {
      const m = g.getTransform(); g.fillStyle = INK;
      ls.j.tiles.forEach((t, n) => { g.setTransform(m); const [A, D, E, F] = t.t; g.transform(A, 0, 0, D, E, F); g.fill(ls.paths[n]); });
    }
    g.restore();
  }
  function drawLevers(g, s, d, o, cam) {
    const L = s.levers; if (!L) return;
    g.save(); g.setTransform(o.dpr * cam.s, 0, 0, o.dpr * cam.s, o.dpr * cam.x, o.dpr * cam.y); g.globalAlpha = o.alpha;
    g.lineCap = "round"; g.lineJoin = "round";
    const pen = (w, c = INK) => { g.lineWidth = w; g.strokeStyle = c; };
    // flap lever: a block handle stepping back (down the picture) with the flaps
    { const F = L.flap, x = F.x, y = lerp(F.y0, F.y1, d.flaps);
      pen(2); g.beginPath(); g.moveTo(x, F.y0 - 6); g.lineTo(x, F.y1 + 10); g.stroke();
      pen(4); g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 18); g.stroke();
      g.fillStyle = "#d9dcdc"; g.beginPath(); g.roundRect(x - 13, y - 9, 26, 15, 3); g.fill(); pen(2.2); g.stroke();
      pen(1); g.beginPath(); g.moveTo(x - 9, y - 3); g.lineTo(x + 9, y - 3); g.stroke(); }
    // gear lever: a little wheel-shaped knob, up or down
    { const x = L.gear.x, y = lerp(L.gear.y0, L.gear.y1, d.gear);
      pen(5); g.beginPath(); g.moveTo(x, (L.gear.y0 + L.gear.y1) / 2); g.lineTo(x, y); g.stroke();
      g.fillStyle = "#f2efe6"; g.beginPath(); g.arc(x, y, 15, 0, Math.PI * 2); g.fill(); pen(3); g.stroke();
      pen(1.5); g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2); g.stroke(); }
    g.restore();
  }
  // the outside world in "horizon space": x along the horizon, y down; 0,0 = horizon centre
  function paintWorld(g, d, V) {
    const P = V.ppd, hd = d.heading || 0, t = d.t || 0;
    // sky: flat washes, deeper blue up high
    let gr = g.createLinearGradient(0, -90 * P, 0, 0);
    gr.addColorStop(0, "#6f9cc4"); gr.addColorStop(.55, "#a9c6dd"); gr.addColorStop(1, "#e8ecdf");
    g.fillStyle = gr; g.fillRect(-4000, -90 * P, 8000, 90 * P + 2);
    // ground: watercolour fields, scrolling with heading (x) and speed (y)
    gr = g.createLinearGradient(0, 0, 0, 60 * P);
    gr.addColorStop(0, "#c9cfb4"); gr.addColorStop(.25, "#a9b98a"); gr.addColorStop(1, "#7f9a62");
    g.fillStyle = gr; g.fillRect(-4000, 0, 8000, 90 * P);
    const sx = -hd * 40, run = t * (d.speed || 250) * .06;
    g.save();
    // fields in perspective: rows get bigger towards the viewer
    for (let row = 1; row < 26; row++) {
      const z = 1 / (row * .35 - ((run * .01) % .35) + .2);  // distance-ish
      const y = 3.2 * P / z, h = 3.2 * P / (z * .88) - y;
      if (y > 60 * P) continue;
      const w = 220 / z;
      const off = ((sx / z) % (w * 4) + w * 4) % (w * 4);
      for (let i = -14; i < 14; i++) {
        const x = i * w - off;
        const n = Math.abs(Math.sin((i + Math.floor(sx / (w * 4)) * 4) * 12.9898 + row * 78.233)) * 43758.5453 % 1;
        g.fillStyle = ["#b8c38f", "#9fb47a", "#d4c98e", "#a3b98b", "#c7b98a", "#8ea96d"][Math.floor(n * 6)];
        g.globalAlpha = .55; g.fillRect(x, y, w * .96, Math.max(1, h * .9));
      }
    }
    g.globalAlpha = 1;
    // a river winding away
    g.strokeStyle = "rgba(120,160,190,.7)"; g.lineWidth = 3; g.beginPath();
    for (let i = 0; i <= 40; i++) { const yy = i * 1.5 * P, z = Math.max(.2, yy / (3.2 * P)); g.lineTo(Math.sin(i * .35 + hd * .05) * 30 * z + ((sx * .3 * z) % 2000), yy); }
    g.lineWidth = 10; g.stroke();
    // horizon ink line and soft haze
    g.fillStyle = "rgba(240,238,226,.6)"; g.fillRect(-4000, -6, 8000, 10);
    g.strokeStyle = "rgba(38,27,19,.45)"; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-4000, 0); g.lineTo(4000, 0); g.stroke();
    g.restore();
    // clouds: watercolour puffs with one ink outline round the whole cloud (cached sprites), drifting with heading
    for (let i = 0; i < 9; i++) {
      const c = cloud(i), x = ((i * 431 - hd * 22 + t * 4) % 3000 + 3000) % 3000 - 1500, y = -(5 + (i * 37) % 26) * P;
      g.drawImage(c, x - c.width / 4, y - c.height / 4, c.width / 2, c.height / 2);
    }
  }
  const clouds = [];
  function cloud(i) {
    if (clouds[i]) return clouds[i];
    const r = 34 + (i * 53) % 46, n = 4 + i % 3, W = Math.round(r * (n * .75 + 1.6)) * 2, H = Math.round(r * 2.1) * 2;
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const x = c.getContext("2d"); x.scale(2, 2);
    const puffs = [];
    for (let j = 0; j < n; j++) { const f = j / (n - 1); puffs.push([r * .9 + j * r * .75, H / 4 + r * .35 - Math.sin(f * Math.PI) * r * .5 + ((j * 7) % 3) * 3, r * (.55 + .3 * Math.sin(f * Math.PI))]); }
    puffs.push([W / 4, H / 4 + r * .45, r * .5], [r * .9, H / 4 + r * .5, r * .42], [r * .9 + (n - 1) * r * .75, H / 4 + r * .5, r * .42]);
    const all = () => { x.beginPath(); for (const [px, py, pr] of puffs) { x.moveTo(px + pr, py); x.arc(px, py, pr, 0, Math.PI * 2); } };
    x.lineWidth = 2.2; x.strokeStyle = "rgba(38,27,19,.55)"; all(); x.stroke();
    const gr = x.createLinearGradient(0, H / 4 - r, 0, H / 4 + r); gr.addColorStop(0, "#ffffff"); gr.addColorStop(.6, "#f6f7f5"); gr.addColorStop(1, "#cdd6de");
    x.fillStyle = gr; all(); x.fill();
    return (clouds[i] = c);
  }

  const R = window.LAB_RENDERER = {
    init(lab) {
      this.lab = lab; this.firstSpace = null;
      for (const s of Object.values(lab.data.spaces)) { if (s.lines) lineSet(s.lines); }
      const start = lab.data.spaces[(location.hash || "").slice(1)] || lab.data.spaces[lab.data.root];
      this.firstSpace = start;
    },
    draw(g, s, cam, o) {
      const now = performance.now();
      if (now - this.frameStart > 6) { this.frameStart = now; budgetEnd = now + 9; lru++; pending = false; }
      g.save();
      if (s.kind === "drive") drawDrive(g, s, cam, o); else drawSpace(g, s, cam, o);
      g.restore();
      if (tileCount > MAX_TILES) evict();
      if (pending) setTimeout(() => this.lab.requestDraw(), 0);
    },
    frameStart: 0,
    animating(s) { return this.firstSpace === s || !!s.animate; },
    ready(s) {
      const need = [s.lines, ...((s.details || []).map(d => d.lines)), ...Object.values(s.sprites || {}).map(x => x.lines)].filter(Boolean);
      const ok = need.every(u => lineSet(u).st !== "loading");
      if (ok && s.lines) warm(lineSet(s.lines));
      const w = s.wash ? wash(s.wash, s.paper) : null;
      return ok && (!w || w.cv);
    }
  };
})();
