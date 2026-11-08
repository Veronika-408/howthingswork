// v3 · Sticker kit renderer: every space is a z-sorted list of stickers (see data.js and scenes.js).
// Each sticker is drawn from its own full-resolution picture (with a mip chain for small sizes), over a soft
// drop shadow, so it reads as a sticker on paper. Children drawn inside parents ("insets") are the child's
// own scene, drawn small, so the dive lands on exactly the same picture. The flying leaf is painted in code:
// a little 3D countryside with clouds from the library, behind the cockpit sticker.
window.LAB_RENDERER = (() => {
  let lab, grain = null;
  const GRID = +new URLSearchParams(location.search).get("grid") || 0;
  const L = () => window.KIT.L;
  const rad = d => (d || 0) * Math.PI / 180;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const mkCanvas = (w, h) => { const c = document.createElement("canvas"); c.width = Math.max(1, w | 0); c.height = Math.max(1, h | 0); return c; };

  // ------------------------------------------------------------------ pictures and their mip chains
  // The stickers are loaded here rather than by the core: a space needs 40-60 small files, so they go in a
  // queue (a few at a time, retried if the server drops one), current space first.
  const pics = new Map(), queue = [];
  let active = 0;
  function load(url, front) {
    let p = pics.get(url);
    if (p) { if (front && !p.bmp && !p.busy) { const i = queue.indexOf(url); if (i > 0) { queue.splice(i, 1); queue.unshift(url); } } return p; }
    p = { url, bmp: null, mips: null, shadow: null, tries: 0, busy: false };
    pics.set(url, p);
    front ? queue.unshift(url) : queue.push(url);
    pump();
    return p;
  }
  function pump() {
    while (active < 4 && queue.length) {
      const url = queue.shift(), p = pics.get(url);
      if (p.bmp) continue;
      active++; p.busy = true;
      fetch(url).then(r => r.ok ? r.blob() : Promise.reject(new Error(r.status)))
        .then(b => window.createImageBitmap ? createImageBitmap(b) : new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(b); }))
        .then(b => { p.bmp = b; p.mips = [b]; lab.requestDraw(); })
        .catch(() => { if (++p.tries < 6) setTimeout(() => { queue.unshift(url); pump(); }, 300 * p.tries); else console.warn("sticker kit: could not load", url); })
        .finally(() => { active--; p.busy = false; pump(); });
    }
  }
  function pic(url) { const p = pics.get(url) || load(url); return p.bmp ? p : null; }
  // a soft silhouette for the drop shadow, made from the sticker itself (tiny, so scaling it up blurs it)
  function shadowOf(p) {
    if (!p.shadow) {
      const b = p.bmp, c = mkCanvas(b.width / 10, b.height / 10), cg = c.getContext("2d");
      cg.drawImage(b, 0, 0, c.width, c.height); cg.globalCompositeOperation = "source-in"; cg.fillStyle = "rgb(52,40,28)"; cg.fillRect(0, 0, c.width, c.height);
      p.shadow = c;
    }
    return p.shadow;
  }
  const spaceReady = s => (s.files || []).every(u => { const p = load(u, true); return !!p.bmp || p.tries >= 6; });
  // the smallest level that is still at least `want` device pixels wide
  function level(p, want) {
    let i = 0;
    while (true) {
      const m = p.mips[i], w = m.width;
      if (w / 2 < want || w < 8) return m;
      if (!p.mips[i + 1]) {
        const c = mkCanvas(Math.round(w / 2), Math.round(m.height / 2)), cg = c.getContext("2d");
        cg.imageSmoothingQuality = "high"; cg.drawImage(m, 0, 0, c.width, c.height);
        p.mips[i + 1] = c;
      }
      i++;
    }
  }
  function grainPattern(g) {
    if (!grain) {
      const c = mkCanvas(256, 256), cg = c.getContext("2d"), d = cg.createImageData(256, 256);
      for (let i = 0; i < d.data.length; i += 4) { const v = Math.random(); d.data[i] = 120; d.data[i + 1] = 100; d.data[i + 2] = 70; d.data[i + 3] = v < .5 ? 0 : (v - .5) * 26; }
      cg.putImageData(d, 0, 0);
      grain = c;
    }
    return g.createPattern(grain, "repeat");
  }

  // ------------------------------------------------------------------ code-drawn grounds (iso slabs)
  const slabs = new Map();
  function ovalCanvas(sl) {
    // a soft oval of pavement under people: a watercolour wash with iso paving lines, fading at its edge
    const S = 2, rx = sl.rx, ry = sl.ry, pad = 8, c = mkCanvas((rx + pad) * 2 * S, (ry + pad) * 2 * S), cg = c.getContext("2d");
    cg.scale(S, S); cg.translate(rx + pad, ry + pad);
    let rnd = 5; const rand = () => (rnd = (rnd * 16807) % 2147483647) / 2147483647;
    const gr = cg.createRadialGradient(0, 0, ry * .2, 0, 0, ry); gr.addColorStop(0, sl.top || "#d6cebd"); gr.addColorStop(.8, sl.top || "#d6cebd"); gr.addColorStop(1, "rgba(214,206,189,0)");
    cg.save(); cg.scale(rx / ry, 1); cg.fillStyle = gr; cg.beginPath(); cg.arc(0, 0, ry, 0, Math.PI * 2); cg.fill(); cg.restore();
    cg.save(); cg.beginPath(); cg.ellipse(0, 0, rx * .97, ry * .9, 0, 0, Math.PI * 2); cg.clip();
    for (let i = 0; i < 90; i++) { cg.fillStyle = `rgba(90,80,65,${.02 + rand() * .04})`; cg.beginPath(); cg.ellipse((rand() - .5) * rx * 2, (rand() - .5) * ry * 2, 20 + rand() * 60, 5 + rand() * 14, 0, 0, Math.PI * 2); cg.fill(); }
    cg.strokeStyle = "rgba(90,80,65,.18)"; cg.lineWidth = 1;
    for (let x = -rx * 2; x < rx * 2; x += 46) { cg.beginPath(); cg.moveTo(x, -ry); cg.lineTo(x + ry * 2 * 1.2, ry); cg.stroke(); cg.beginPath(); cg.moveTo(x, ry); cg.lineTo(x + ry * 2 * 1.2, -ry); cg.stroke(); }
    cg.restore();
    return { c, S, pad, w: rx * 2, hh: ry * 2, h: 0, oval: true };
  }
  function slabCanvas(sl) {
    const key = JSON.stringify(sl);
    if (slabs.has(key)) return slabs.get(key);
    if (sl.kind === "oval") { const o = ovalCanvas(sl); slabs.set(key, o); return o; }
    // an iso box: top face is a diamond of size w x w/2, sides of height h
    // a = the side running up to the right, b = the side running down to the right (a = b: a square)
    const a = sl.a || sl.w / 2, b = sl.b || sl.w / 2;
    const S = sl.res || 2, w = a + b, hh = w / 2, h = sl.h || 40, pad = 6;
    const c = mkCanvas((w + pad * 2) * S, (hh + h + pad * 2) * S), cg = c.getContext("2d");
    cg.scale(S, S); cg.translate(pad, pad);
    const T = [a, 0], R = [w, b / 2], B = [b, hh], Lf = [0, a / 2];
    const poly = (pts, fill) => { cg.beginPath(); pts.forEach(([x, y], i) => i ? cg.lineTo(x, y) : cg.moveTo(x, y)); cg.closePath(); if (fill) { cg.fillStyle = fill; cg.fill(); } };
    // white die-cut margin around the whole slab (it is a sticker too)
    cg.save(); poly([T, R, [R[0], R[1] + h], [B[0], B[1] + h], [Lf[0], Lf[1] + h], Lf]); cg.lineJoin = "round"; cg.lineWidth = 9; cg.strokeStyle = "#fffdf7"; cg.stroke(); cg.restore();
    // sides: cut earth (or a cut face colour)
    poly([Lf, B, [B[0], B[1] + h], [Lf[0], Lf[1] + h]], sl.side || "#b98d5c");
    poly([B, R, [R[0], R[1] + h], [B[0], B[1] + h]], sl.side2 || "#a87c4e");
    let rnd = 7; const rand = () => (rnd = (rnd * 16807) % 2147483647) / 2147483647;
    if (sl.earth !== false) {
      for (let i = 0; i < 90; i++) {   // stones and soil streaks in the cut
        const u = rand(), left = u < .5, t = left ? u * 2 : (u - .5) * 2, y0 = 10 + rand() * (h - 14);
        const x = left ? Lf[0] + (B[0] - Lf[0]) * t : B[0] + (R[0] - B[0]) * t, y = (left ? Lf[1] + (B[1] - Lf[1]) * t : B[1] + (R[1] - B[1]) * t) + y0;
        cg.fillStyle = `rgba(${90 + rand() * 60},${80 + rand() * 40},${60 + rand() * 30},.5)`; cg.beginPath(); cg.ellipse(x, y, 2 + rand() * 4, 1.2 + rand() * 2, 0, 0, Math.PI * 2); cg.fill();
      }
      poly([Lf, B, [B[0], B[1] + 7], [Lf[0], Lf[1] + 7]], sl.turf || "rgba(110,140,70,.9)");
      poly([B, R, [R[0], R[1] + 7], [B[0], B[1] + 7]], sl.turf || "rgba(100,128,62,.9)");
    }
    // top face: a watercolour wash with blotches
    cg.save(); poly([T, R, B, Lf], sl.top || "#c9c4b8"); cg.clip();
    for (let i = 0; i < 160; i++) { cg.fillStyle = `rgba(${sl.blot || "90,85,75"},${.025 + rand() * .045})`; cg.beginPath(); cg.ellipse(rand() * w, rand() * hh, 10 + rand() * 60, 6 + rand() * 30, rand() * 3, 0, Math.PI * 2); cg.fill(); }
    if (sl.kind === "paving") {        // iso paving stones
      cg.strokeStyle = "rgba(90,80,65,.28)"; cg.lineWidth = 1;
      const n = sl.tiles || 14;
      for (let i = 0; i <= n; i++) { const t = i / n; cg.beginPath(); cg.moveTo(Lf[0] + (T[0] - Lf[0]) * t, Lf[1] + (T[1] - Lf[1]) * t); cg.lineTo(B[0] + (R[0] - B[0]) * t, B[1] + (R[1] - B[1]) * t); cg.stroke();
        cg.beginPath(); cg.moveTo(Lf[0] + (B[0] - Lf[0]) * t, Lf[1] + (B[1] - Lf[1]) * t); cg.lineTo(T[0] + (R[0] - T[0]) * t, T[1] + (R[1] - T[1]) * t); cg.stroke(); }
      if (sl.kerb) { cg.strokeStyle = "rgba(255,255,255,.7)"; cg.lineWidth = 5; cg.beginPath(); cg.moveTo(Lf[0] + (B[0] - Lf[0]) * .02, Lf[1] + (B[1] - Lf[1]) * .02 - 3); cg.lineTo(B[0] + (R[0] - B[0]) * .98, B[1] + (R[1] - B[1]) * .98 - 3); cg.stroke(); }
    }
    if (sl.kind === "tarmac") {        // apron: concrete panels and a yellow lead-in line
      cg.strokeStyle = "rgba(80,78,70,.22)"; cg.lineWidth = 1.2;
      const n = 10;
      for (let i = 1; i < n; i++) { const t = i / n; cg.beginPath(); cg.moveTo(Lf[0] + (T[0] - Lf[0]) * t, Lf[1] + (T[1] - Lf[1]) * t); cg.lineTo(B[0] + (R[0] - B[0]) * t, B[1] + (R[1] - B[1]) * t); cg.stroke();
        cg.beginPath(); cg.moveTo(Lf[0] + (B[0] - Lf[0]) * t, Lf[1] + (B[1] - Lf[1]) * t); cg.lineTo(T[0] + (R[0] - T[0]) * t, T[1] + (R[1] - T[1]) * t); cg.stroke(); }
      for (const [a, b, col, lw] of sl.lines || []) { cg.strokeStyle = col || "rgba(226,178,40,.9)"; cg.lineWidth = lw || 5; cg.beginPath(); cg.moveTo(...a); cg.lineTo(...b); cg.stroke(); }
    }
    cg.restore();
    poly([T, R, [R[0], R[1] + h], [B[0], B[1] + h], [Lf[0], Lf[1] + h], Lf]); cg.strokeStyle = "rgba(60,45,30,.55)"; cg.lineWidth = 1.2; cg.stroke();
    cg.beginPath(); cg.moveTo(...Lf); cg.lineTo(...B); cg.lineTo(...R); cg.moveTo(...B); cg.lineTo(B[0], B[1] + h); cg.stroke();
    const out = { c, S, pad, w, hh, h };
    slabs.set(key, out);
    return out;
  }

  // ------------------------------------------------------------------ one sticker
  // M: the device transform of the space [a, b, c, d, e, f] (uniform scale), t: seconds
  function place(it, t) {
    let x = it.x, y = it.y, rot = it.rot || 0, k = it.k, alpha = it.alpha == null ? 1 : it.alpha, flip = it.flip;
    const ph = it.phase != null ? it.phase : (it.n * 1.7) % 6.28;
    if (it.anim === "bob") { y += Math.sin(t * 1.4 + ph) * (it.amp || 2); rot += Math.sin(t * 1.1 + ph) * 1.2; }
    if (it.anim === "jiggle") { x += Math.sin(t * 2.3 + ph) * (it.amp || 4); y += Math.cos(t * 1.9 + ph * 1.3) * (it.amp || 4); rot += Math.sin(t * 1.7 + ph) * (it.spin || 6); }
    if (it.anim === "wobble") { rot += Math.sin(t * .8 + ph) * (it.spin || 1.5); k *= 1 + Math.sin(t * 1.1 + ph) * .012; }
    if (it.anim === "pulse") { k *= 1 + Math.max(0, Math.sin(t * 7.5 + ph)) * .05; }
    if (it.anim === "spin") { rot += t * (it.speed || 20); }
    if (it.drift) {                    // clouds: drift sideways and wrap around
      const [x0, x1] = it.drift.range, span = x1 - x0;
      x = x0 + ((((it.x - x0) + t * it.drift.speed) % span) + span) % span;
      const edge = Math.min(x - x0, x1 - x) / (span * .08); alpha *= clamp(edge, 0, 1);
    }
    if (it.path) {                     // vehicles and bubbles: travel along a path, fade in and out at its ends
      const P = it.path; let len = 0; const segs = [];
      for (let i = 1; i < P.length; i++) { const l = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); segs.push(l); len += l; }
      let d = ((t * (it.speed || 20) + (it.offset || 0) * len) % len + len) % len;
      const u = d / len; alpha *= clamp(Math.min(u, 1 - u) / .08, 0, 1);
      let i = 0; while (i < segs.length - 1 && d > segs[i]) { d -= segs[i]; i++; }
      const f = d / segs[i]; x = P[i][0] + (P[i + 1][0] - P[i][0]) * f; y = P[i][1] + (P[i + 1][1] - P[i][1]) * f;
      if (it.grow) k *= 1 + (it.grow - 1) * u;
    }
    return { x, y, rot, k, alpha, flip };
  }
  function drawSticker(g, M, it, t, galpha, ghost) {
    const st = L()[it.s]; if (!st) return;
    const p = pic("library/" + st.file); if (!p) return;
    const q = place(it, t);
    if (q.alpha <= 0) return;
    const scr = M[0] * q.k;            // device px per sticker px
    if (st.w * scr < 1.5) return;
    const [ax, ay] = it.anchor || st.anchor, f = q.flip ? -1 : 1;
    g.setTransform(M[0], 0, 0, M[0], M[4], M[5]);
    g.translate(q.x, q.y); if (q.rot) g.rotate(rad(q.rot)); g.scale(q.k * f, q.k);
    if (!it.noShadow && !it.ground) {
      const off = (it.shadowOff || 1) * Math.max(st.border * .9, 2.5);
      g.globalAlpha = galpha * q.alpha * (it.shadow || .3);
      g.drawImage(shadowOf(p), -ax + off * f * .6, -ay + off, st.w, st.h);
    }
    g.globalAlpha = galpha * q.alpha;
    if (it.clip) { g.save(); g.beginPath(); g.rect(...it.clip); g.clip(); }
    g.drawImage(level(p, st.w * scr), -ax, -ay, st.w, st.h);
    if (it.clip) g.restore();
  }
  function drawSlab(g, M, it, galpha) {
    const s = slabCanvas(it.slab);
    g.setTransform(M[0], 0, 0, M[0], M[4], M[5]);
    g.globalAlpha = galpha * (it.alpha == null ? 1 : it.alpha);
    const k = it.k || 1;
    g.drawImage(s.c, it.x - (s.w / 2 + s.pad) * k, it.y - (s.hh / 2 + s.pad) * k, s.c.width / s.S * k, s.c.height / s.S * k);
  }
  function drawLens(g, M, it, galpha) {
    const [cx, cy, r] = it.lens;
    g.setTransform(M[0], 0, 0, M[0], M[4], M[5]);
    g.globalAlpha = galpha;
    if (it.leader) {                   // a dotted line from what is magnified to the lens
      const [x0, y0] = it.leader, a = Math.atan2(y0 - cy, x0 - cx);
      g.strokeStyle = "rgba(70,55,40,.75)"; g.lineWidth = Math.max(1.2 / M[0], r * .012); g.setLineDash([r * .05, r * .04]);
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); g.stroke(); g.setLineDash([]);
      g.fillStyle = "rgba(70,55,40,.8)"; g.beginPath(); g.arc(x0, y0, r * .025, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = "rgba(60,40,20,.10)"; g.beginPath(); g.arc(cx + r * .03, cy + r * .05, r * 1.01, 0, Math.PI * 2); g.fill();
    g.fillStyle = "rgba(255,253,246,.92)"; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "rgba(120,95,70,.55)"; g.lineWidth = r * .018; g.stroke();
  }
  // a whole scene; depth limits insets inside insets
  function drawScene(g, sp, M, t, galpha, ghost, depth) {
    for (const it of sp.items) {
      if (ghost && (it.ground || it.bg)) continue;
      if (it.slab) { drawSlab(g, M, it, galpha); continue; }
      if (it.scene) {
        if (depth > 3) continue;
        const c = window.KIT.spaces[it.scene], [fx, fy, fw] = c.frame || [0, 0, c.w];
        if (fw * it.k * M[0] < 3) continue;
        if (it.lens && ghost) continue;    // a magnifier belongs to the page, not to the subject
        if (it.lens) drawLens(g, M, it, galpha);
        drawScene(g, c, [M[0] * it.k, 0, 0, M[0] * it.k, M[4] + M[0] * it.x, M[5] + M[0] * it.y], t, galpha, true, depth + 1);
        continue;
      }
      if (it.code) { CODE[it.code] && CODE[it.code](g, M, it, t, galpha); continue; }
      drawSticker(g, M, it, t, galpha, ghost);
    }
  }

  // ------------------------------------------------------------------ small things drawn in code
  const CODE = {
    // little pieces (amino acids, sugars) leaving the lysosome through its doors
    pieces(g, M, it, t, galpha) {
      g.setTransform(M[0], 0, 0, M[0], M[4], M[5]);
      const cols = ["#e8b84a", "#9cc7e8", "#e9a35a", "#b7d58a"];
      for (const [x0, y0, ang] of it.doors) {
        for (let i = 0; i < 7; i++) {
          const u = ((t * .16 + i / 7) % 1), d = 20 + u * it.reach, a = rad(ang) + Math.sin(i * 2.1) * .25;
          const x = x0 + Math.cos(a) * d, y = y0 + Math.sin(a) * d;
          g.globalAlpha = galpha * clamp((1 - u) * 2, 0, 1) * clamp(u * 6, 0, 1);
          g.fillStyle = cols[i % 4]; g.strokeStyle = "rgba(90,60,30,.6)"; g.lineWidth = 2;
          g.beginPath();
          if (i % 3 === 0) for (let j = 0; j < 6; j++) { const aa = j / 6 * Math.PI * 2; g[j ? "lineTo" : "moveTo"](x + Math.cos(aa) * 9, y + Math.sin(aa) * 9); }
          else g.arc(x, y, 6 + (i % 2) * 3, 0, Math.PI * 2);
          g.closePath(); g.fill(); g.stroke();
        }
      }
    },
    // fine threads of the cytoskeleton drifting in the cell jelly
    shimmer(g, M, it, t, galpha) { }
  };

  // ------------------------------------------------------------------ the flying leaf
  let world = null;
  function makeWorld() {
    // fields on a grid (colours from a watercolour palette), a river, our town, trees and clouds
    const fields = ["#b9c27a", "#a9b968", "#cdbd7c", "#c2c98d", "#9fb070", "#d6c58a", "#b4bf86", "#c9b16f"];
    let r = 11; const rand = () => (r = (r * 16807) % 2147483647) / 2147483647;
    const clouds = [];
    for (let i = 0; i < 70; i++) clouds.push({ x: (rand() - .5) * 60000, z: (rand() - .5) * 60000, alt: 2500 + rand() * 1800, s: ["cloud-big", "cloud-mid", "cloud-small"][i % 3], k: 1 + rand() * 1.5 });
    return { fields, clouds, rand };
  }
  function hash(i, j) { let h = (i * 374761393 + j * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function drawDrive(g, s, cam, o) {
    const d = o.drive, kit = s.kit, dpr = o.dpr;
    if (!world) world = makeWorld();
    const M = [dpr * cam.s, 0, 0, dpr * cam.s, dpr * cam.x, dpr * cam.y];
    const W = s.w, H = s.h;
    // ---- the outside world, in metres: camera at the plane, heading, pitch, roll
    const st = d || { pitch: 0, roll: 0, heading: 90, altitude: 9000, speed: 250, t: 0, yoke: { x: 0, y: 0 }, throttle: .6, flaps: 0, gear: 0 };
    if (!o.ghost) {
    if (!world.pos) world.pos = { x: 0, z: 0, last: st.t };
    const dt = Math.max(0, Math.min(.1, st.t - world.pos.last)); world.pos.last = st.t;
    const hd = rad(st.heading), v = st.speed * .514 * 3;          // a little faster than real, so the ground moves
    world.pos.x += Math.sin(hd) * v * dt; world.pos.z += Math.cos(hd) * v * dt;
    const alt = Math.max(30, st.altitude * .3048) * .15;          // squashed, so fields read from up high
    const cx = W * .5, hy = H * .27, f = W * .62, ppd = f * Math.PI / 180;   // horizon at a third, pixels per degree
    g.save();
    g.setTransform(...M);
    g.beginPath(); g.rect(0, 0, W, H); g.clip();
    g.translate(cx, hy + st.pitch * ppd); g.rotate(rad(-st.roll));
    // sky
    const sky = g.createLinearGradient(0, -H * 1.6, 0, 0);
    sky.addColorStop(0, "#6f9fcf"); sky.addColorStop(.7, "#a9c8e2"); sky.addColorStop(1, "#e3e6dc");
    g.fillStyle = sky; g.fillRect(-W * 2, -H * 3, W * 4, H * 3);
    // ground base (haze at the horizon)
    const gr = g.createLinearGradient(0, 0, 0, H * 1.5);
    gr.addColorStop(0, "#c9cfc0"); gr.addColorStop(.08, "#aab68a"); gr.addColorStop(1, "#8fa266");
    g.fillStyle = gr; g.fillRect(-W * 2, 0, W * 4, H * 3);
    // project a ground point (world x east, z north) into the rotated, pitched frame (before roll, which the canvas does)
    const sh = Math.sin(hd), ch = Math.cos(hd), pr = rad(st.pitch), sp = Math.sin(pr), cp = Math.cos(pr);
    const proj = (wx, wz, wy = 0) => {
      const dx = wx - world.pos.x, dz = wz - world.pos.z;
      const xr = dx * ch - dz * sh, zr = dx * sh + dz * ch, yr = wy - alt;   // camera space: x right, z forward, y up
      // pitch: rotate around x so nose-up lifts the view (the canvas already moved the horizon; undo that and do it properly)
      const y2 = yr * cp - zr * sp, z2 = yr * sp + zr * cp;
      if (z2 < 20) return null;
      return [xr / z2 * f, -y2 / z2 * f - st.pitch * ppd];
    };
    // fields: a grid of patches around us, far to near
    const cell = 900, R = 13, ci = Math.floor(world.pos.x / cell), cj = Math.floor(world.pos.z / cell);
    const list = [];
    for (let i = -R; i <= R; i++) for (let j = -R; j <= R; j++) {
      const gx = (ci + i) * cell, gz = (cj + j) * cell;
      const dx = gx + cell / 2 - world.pos.x, dz = gz + cell / 2 - world.pos.z;
      const fwd = dx * sh + dz * ch; if (fwd < -cell * 2) continue;
      list.push([fwd, ci + i, cj + j, gx, gz]);
    }
    list.sort((a, b) => b[0] - a[0]);
    for (const [fwd, I, J, gx, gz] of list) {
      const h1 = hash(I, J), inset = 30;
      const pts = [proj(gx + inset, gz + inset), proj(gx + cell - inset, gz + inset), proj(gx + cell - inset, gz + cell - inset), proj(gx + inset, gz + cell - inset)];
      if (pts.some(p => !p)) continue;
      const haze = clamp(fwd / (cell * R * 1.1), 0, 1);
      g.globalAlpha = 1 - haze * .85;
      g.fillStyle = world.fields[Math.floor(h1 * world.fields.length)];
      g.beginPath(); pts.forEach((p, k) => k ? g.lineTo(...p) : g.moveTo(...p)); g.closePath(); g.fill();
      if (h1 < .18) {                  // a wood: a darker patch with tree dots
        g.fillStyle = "rgba(70,100,50,.55)"; g.fill();
      }
    }
    g.globalAlpha = 1;
    // a river winding north-south and a road east-west, so turning is easy to see
    const line = (pts, col, w) => { const pp = pts.map(p => proj(p[0], p[1])).filter(Boolean); if (pp.length < 2) return; g.strokeStyle = col; g.lineWidth = w; g.lineJoin = "round"; g.beginPath(); pp.forEach((p, k) => k ? g.lineTo(...p) : g.moveTo(...p)); g.stroke(); };
    const rv = [], rd = [];
    for (let k = -40; k <= 40; k++) { const z = world.pos.z + k * 600; rv.push([2500 + Math.sin(z / 3000) * 1600, z]); const x = world.pos.x + k * 600; rd.push([x, -1800 + Math.sin(x / 5000) * 500]); }
    line(rv, "rgba(110,160,180,.9)", 6); line(rd, "rgba(150,140,125,.8)", 3);
    // clouds: library stickers as billboards, far to near
    const cl = world.clouds.map(c => {
      // wrap clouds around us
      const span = 60000, wx = world.pos.x + ((((c.x - world.pos.x) % span) + span * 1.5) % span - span / 2), wz = world.pos.z + ((((c.z - world.pos.z) % span) + span * 1.5) % span - span / 2);
      const dx = wx - world.pos.x, dz = wz - world.pos.z, fwd = dx * sh + dz * ch;
      return { c, wx, wz, fwd };
    }).filter(q => q.fwd > 200).sort((a, b) => b.fwd - a.fwd);
    for (const q of cl) {
      const p = proj(q.wx, q.wz, q.c.alt * .4); if (!p) continue;
      const stc = L()[q.c.s], im = pic("library/" + stc.file); if (!im) continue;
      const size = 2600 * q.c.k / q.fwd * f;           // a cloud is about 2.6 km wide
      if (size < 3 || size > W * 4) continue;
      g.globalAlpha = clamp(1 - q.fwd / 26000, 0, 1) * .95;
      const hgt = size * stc.h / stc.w;
      g.drawImage(level(im, size * M[0]), p[0] - size / 2, p[1] - hgt / 2, size, hgt);
    }
    g.globalAlpha = 1;
    g.restore();
    }
    // ---- the cockpit in front: frame (windows cut out), screens drawn live, controls that move
    // while diving in, only the controls grow out of the flight deck (no fading rectangle)
    if (!o.ghost) { drawSticker(g, M, kit.byId.frame, o.t, o.alpha, false); screens(g, M, kit.screens, st); }
    // thrust levers slide with the throttle, flap and gear levers follow theirs
    const lev = kit.byId.levers;
    drawLever(g, M, lev, o, -(st.throttle - .6) * 70, lev.split);
    const fl = kit.byId.flaplever; drawLever(g, M, fl, o, (st.flaps - .5) * 70, fl.split);
    const ge = kit.byId.gearlever; drawLever(g, M, ge, o, (st.gear - .5) * 80, ge.split);
    if (kit.byId.cup && !o.ghost) drawSticker(g, M, kit.byId.cup, o.t, o.alpha, false);   // the captain's coffee
    // the control wheel: the column stays, the wheel turns with yoke.x about its hub and comes closer with yoke.y.
    // One sticker, cut in two by a rectangle: col = the column below the hub (sticker px).
    const yk = kit.byId.yoke, ys = L()[yk.s], p = pic("library/" + ys.file);
    if (p) {
      const pull = st.yoke.y, k = yk.k * (1 + pull * .06), hub = yk.hub, col = yk.col, [ax, ay] = ys.anchor;
      const img = level(p, ys.w * yk.k * M[0] * 1.1);
      g.save(); g.setTransform(...M); g.beginPath(); g.rect(0, 0, W, H); g.clip();
      g.globalAlpha = o.alpha;
      g.translate(yk.x, yk.y);
      g.save(); g.scale(yk.k, yk.k); g.beginPath(); g.rect(col[0] - ax, col[1] - ay, col[2], col[3]); g.clip();
      g.drawImage(img, -ax, -ay, ys.w, ys.h); g.restore();
      g.translate(0, pull * 30); g.scale(k, k); g.translate(hub[0] - ax, hub[1] - ay); g.rotate(rad(st.yoke.x * 70));
      g.beginPath(); g.rect(-hub[0] - 10, -hub[1] - 10, ys.w + 20, ys.h + 20); g.rect(col[0] - hub[0], col[1] - hub[1], col[2], col[3]); g.clip("evenodd");
      g.drawImage(img, -hub[0], -hub[1], ys.w, ys.h);
      g.restore();
    }
  }
  function drawLever(g, M, it, o, dy, split) {
    const st = L()[it.s], p = pic("library/" + st.file); if (!p) return;
    const img = level(p, st.w * it.k * M[0]);
    g.setTransform(...M); g.globalAlpha = o.alpha;
    g.translate(it.x, it.y); g.scale(it.k, it.k); g.translate(-st.anchor[0], -st.anchor[1]);
    g.save(); g.beginPath(); g.rect(0, -200, st.w, split + 200); g.clip(); g.drawImage(img, 0, dy, st.w, st.h); g.restore();   // handles, moved
    g.save(); g.beginPath(); g.rect(0, split, st.w, st.h - split); g.clip(); g.drawImage(img, 0, 0, st.w, st.h); g.restore();    // base, fixed
  }
  function screens(g, M, scr, st) {
    if (!scr) return;
    g.setTransform(...M);
    for (const [kind, x, y, w, h] of scr) {
      g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
      g.fillStyle = "#1d2226"; g.fillRect(x, y, w, h);
      const cx = x + w / 2, cy = y + h / 2;
      if (kind === "pfd") {            // the artificial horizon: blue sky, brown ground, the little plane in the middle
        g.save(); g.translate(cx, cy + st.pitch * h * .025); g.rotate(rad(-st.roll));
        g.fillStyle = "#3f7fc4"; g.fillRect(-w * 2, -h * 2, w * 4, h * 2); g.fillStyle = "#8a5a2c"; g.fillRect(-w * 2, 0, w * 4, h * 2);
        g.strokeStyle = "#fff"; g.lineWidth = 2; g.beginPath(); g.moveTo(-w, 0); g.lineTo(w, 0); g.stroke();
        for (let k = -2; k <= 2; k++) if (k) { g.beginPath(); g.moveTo(-w * .1, -k * h * .1); g.lineTo(w * .1, -k * h * .1); g.stroke(); }
        g.restore();
        g.strokeStyle = "#f2c230"; g.lineWidth = 4; g.beginPath(); g.moveTo(cx - w * .28, cy); g.lineTo(cx - w * .1, cy); g.lineTo(cx - w * .06, cy + 8); g.moveTo(cx + w * .28, cy); g.lineTo(cx + w * .1, cy); g.lineTo(cx + w * .06, cy + 8); g.stroke();
        g.fillStyle = "#f2c230"; g.fillRect(cx - 3, cy - 3, 6, 6);
        // speed and height tapes (bars, no numbers)
        g.fillStyle = "rgba(255,255,255,.18)"; g.fillRect(x + 4, y + 8, w * .1, h - 16); g.fillRect(x + w * .9 - 4, y + 8, w * .1, h - 16);
        g.fillStyle = "#7de08a"; g.fillRect(x + 4, y + h - 8 - (h - 16) * clamp(st.speed / 520, 0, 1), w * .1, 3);
        g.fillRect(x + w * .9 - 4, y + h - 8 - (h - 16) * clamp(st.altitude / 30000, 0, 1), w * .1, 3);
      } else if (kind === "nd") {      // a compass rose that turns with the heading, our plane at the bottom
        g.save(); g.translate(cx, cy + h * .25); g.rotate(rad(-st.heading));
        g.strokeStyle = "#e8e8e8"; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, h * .55, 0, Math.PI * 2); g.stroke();
        for (let k = 0; k < 36; k++) { g.rotate(Math.PI / 18); g.beginPath(); g.moveTo(0, -h * .55); g.lineTo(0, -h * (k % 3 ? .51 : .47)); g.stroke(); }
        g.fillStyle = "#e05ad0"; g.beginPath(); g.moveTo(0, -h * .62); g.lineTo(-6, -h * .55); g.lineTo(6, -h * .55); g.fill();
        g.restore();
        g.strokeStyle = "#e05ad0"; g.lineWidth = 2; g.beginPath(); g.moveTo(cx, cy + h * .25); g.lineTo(cx, y + 6); g.stroke();
        g.fillStyle = "#fff"; g.beginPath(); g.moveTo(cx, cy + h * .18); g.lineTo(cx - 9, cy + h * .32); g.lineTo(cx + 9, cy + h * .32); g.fill();
      } else {                         // engines: four bars that follow the thrust levers
        for (let k = 0; k < 4; k++) {
          const bx = x + w * (.14 + k * .2), bh = (h * .7) * (.25 + .75 * st.throttle);
          g.strokeStyle = "#cfcfcf"; g.lineWidth = 2; g.strokeRect(bx, y + h * .15, w * .12, h * .7);
          g.fillStyle = "#6fd27e"; g.fillRect(bx + 2, y + h * .85 - bh, w * .12 - 4, bh);
        }
      }
      // a soft glass sheen
      const gl = g.createLinearGradient(x, y, x + w, y + h); gl.addColorStop(0, "rgba(255,255,255,.12)"); gl.addColorStop(.5, "rgba(255,255,255,0)");
      g.fillStyle = gl; g.fillRect(x, y, w, h);
      g.restore();
    }
  }

  return {
    init(l) {
      lab = l;
      // everything, in the background, starting with the space in the address bar
      const D = l.data.spaces, first = D[location.hash.slice(1)] || D[l.data.root];
      for (const u of first.files) load(u);
      setTimeout(() => { for (const s of Object.values(D)) for (const u of s.files) load(u); }, 400);
    },
    draw(g, s, cam, o) {
      const dpr = o.dpr;
      g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high";
      if (!o.ghost) {                  // the page: paper with a little grain
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.globalAlpha = o.alpha; g.fillStyle = s.paper || "#f4efe4"; g.fillRect(0, 0, g.canvas.width, g.canvas.height);
        g.fillStyle = grainPattern(g); g.fillRect(0, 0, g.canvas.width, g.canvas.height);
      }
      if (s.kind === "drive") { drawDrive(g, s, cam, o); g.globalAlpha = 1; return; }
      const M = [dpr * cam.s, 0, 0, dpr * cam.s, dpr * cam.x, dpr * cam.y];
      drawScene(g, s.kit, M, o.t, o.alpha, o.ghost, 0);
      if (GRID && !o.ghost) {          // ?grid=50: a coordinate grid, for placing stickers by hand
        g.setTransform(...M); g.globalAlpha = 1; g.lineWidth = 1 / M[0]; g.font = `${11 / M[0]}px sans-serif`;
        const [fx, fy, fw, fh] = s.frame || [0, 0, s.w, s.h];
        for (let x = Math.floor(fx / GRID) * GRID; x < fx + fw; x += GRID) { g.strokeStyle = x % (GRID * 5) ? "rgba(255,0,0,.25)" : "rgba(255,0,0,.6)"; g.beginPath(); g.moveTo(x, fy); g.lineTo(x, fy + fh); g.stroke(); }
        for (let y = Math.floor(fy / GRID) * GRID; y < fy + fh; y += GRID) { g.strokeStyle = y % (GRID * 5) ? "rgba(0,0,255,.25)" : "rgba(0,0,255,.6)"; g.beginPath(); g.moveTo(fx, y); g.lineTo(fx + fw, y); g.stroke(); }
        g.fillStyle = "#000";
        for (let x = Math.floor(fx / GRID) * GRID; x < fx + fw; x += GRID * 2) for (let y = Math.floor(fy / GRID) * GRID; y < fy + fh; y += GRID * 2) g.fillText(x + "," + y, x + 2, y + 10 / M[0]);
      }
      g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1;
    },
    animating(s) { return !!(s.kit && s.kit.living); },
    ready(s) { return spaceReady(s); }
  };
})();
