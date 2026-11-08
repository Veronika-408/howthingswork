// Paper theatre: every space is a little tunnel book. Its pictures are cut-paper layers stacked back to front
// (each with its paper margin, cut edge and shadow baked in by tools/build.py); this file stacks them with a
// gentle parallax, breathes them, frames them with a paper proscenium, draws every child space INSIDE its parent
// from the child's own layers (so the parent's drawing of it is always exactly the same thing), and dives by
// stepping through the paper: the parent's front layers grow past you and fade while the child's page settles.
(() => {
  const PAN = .045, ZOOM = .11, BREATHE = 1.1;          // parallax per unit of depth; idle breathing in CSS px
  const smooth = (a, b, t) => { const u = Math.min(1, Math.max(0, (t - a) / (b - a))); return u * u * (3 - 2 * u); };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const INK = "rgba(52, 40, 28, .78)";
  let lab = null, SP = null, hotsSpace = null;

  // ----------------------------------------------------------------- geometry
  function inParent(c) {                                  // child coords -> parent coords (same maths as the core)
    const [w0, w1] = c.spot.axis, [p0, p1] = c.spot.plateAxis;
    const s = Math.hypot(w1[0] - w0[0], w1[1] - w0[1]) / Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    const mw = [(w0[0] + w1[0]) / 2, (w0[1] + w1[1]) / 2], mp = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2];
    return { s, x: mw[0] - s * mp[0], y: mw[1] - s * mp[1] };
  }
  const childCam = (pc, m) => ({ s: pc.s * m.s, x: pc.x + pc.s * m.x, y: pc.y + pc.s * m.y });
  const frameOf = s => s.frame || [0, 0, s.w, s.h];
  // the camera for one layer: nearer layers (d > 0) zoom a little faster and slide a little further when you pan
  function layerCam(s, cam, fit, d, br) {
    if (!d && !br) return cam;
    const [fx, fy, fw, fh] = frameOf(s), Xc = fx + fw / 2, Yc = fy + fh / 2;
    const Cx = fit.x + fit.s * Xc, Cy = fit.y + fit.s * Yc;
    const X = (Cx - cam.x) / cam.s, Y = (Cy - cam.y) / cam.s;
    const sl = cam.s * Math.pow(Math.max(cam.s / fit.s, .05), ZOOM * d);
    const XL = Xc + (X - Xc) * (1 + PAN * d), YL = Yc + (Y - Yc) * (1 + PAN * d);
    const b = br || [0, 0];
    return { s: sl, x: Cx - sl * XL + b[0], y: Cy - sl * YL + b[1] };
  }
  const scaleAbout = (c, f, px, py) => ({ s: c.s * f, x: px - (px - c.x) * f, y: py - (py - c.y) * f });
  const breath = (L, i, t) => L.d ? [Math.sin(t * .55 + i * 1.9) * BREATHE * L.d, Math.cos(t * .43 + i * 1.3) * BREATHE * .7 * L.d] : null;

  // ----------------------------------------------------------------- pictures
  // a picture that failed to load (a busy server) is asked for once more; a second failure is drawn as nothing
  const tries = new Map();
  function entry(src) {
    const t = tries.get(src);
    if (t) return t.e.bmp || !t.done || !t.retry ? t.e : t.retry;
    const e = lab.img(src), rec = { e, done: false, retry: null };
    tries.set(src, rec);
    e.ready.then(() => { rec.done = true; if (!e.bmp) { rec.retry = lab.img(src + "?again=1"); rec.retry.ready.then(() => { rec.retryDone = true; lab.requestDraw(); }); } });
    return e;
  }
  const mipCache = new Map();
  function pic(L, devScale) {                             // the bitmap, or a smaller copy when it is drawn very small
    const e = entry(L.src);
    if (!e.bmp) return null;
    if (devScale > .42 || !window.createImageBitmap) return e.bmp;
    let m = mipCache.get(L.src);
    if (!m) {
      m = { bmp: null };
      mipCache.set(L.src, m);
      createImageBitmap(e.bmp, { resizeWidth: Math.max(1, Math.round(e.w / 4)), resizeHeight: Math.max(1, Math.round(e.h / 4)), resizeQuality: "high" })
        .then(b => { m.bmp = b; lab.requestDraw(); }).catch(() => {});
    }
    return (devScale < .3 && m.bmp) ? m.bmp : e.bmp;
  }
  function drawLayer(g, o, c, L, alpha) {
    if (alpha <= .002) return;
    const ds = o.dpr * c.s * L.w / (entry(L.src).w || L.w);
    const b = pic(L, ds);
    if (!b) return;
    g.setTransform(o.dpr * c.s, 0, 0, o.dpr * c.s, o.dpr * c.x, o.dpr * c.y);
    g.globalAlpha = alpha;
    g.drawImage(b, L.x, L.y, L.w, L.h);
  }
  const allPics = s => {
    const out = [];
    for (const L of s.layers || []) if (L.src) out.push(L.src);
    if (s.frameArt && s.frameArt.shadow) out.push(s.frameArt.shadow.src);
    if (s.drive) for (const k of ["sky", "clouds", "shell", "cup", "static", "yoke", "levers"]) if (s.drive[k]) out.push(s.drive[k].src);
    return out;
  };

  // ----------------------------------------------------------------- the paper proscenium in front of every space
  function drawFrame(g, o, s, c, alpha) {
    const F = s.frameArt; if (!F || alpha <= .002) return;
    if (F.shadow) drawLayer(g, o, c, F.shadow, alpha * .9);
    if (!F.path) {
      F.path = new Path2D();
      F.path.rect(-20000, -20000, 40000 + s.w, 40000 + s.h);
      F.path.moveTo(F.poly[0][0], F.poly[0][1]);
      for (const p of F.poly) F.path.lineTo(p[0], p[1]);
      F.path.closePath();
      F.edge = new Path2D(); F.edge.moveTo(F.poly[0][0], F.poly[0][1]);
      for (const p of F.poly) F.edge.lineTo(p[0], p[1]);
      F.edge.closePath();
    }
    g.setTransform(o.dpr * c.s, 0, 0, o.dpr * c.s, o.dpr * c.x, o.dpr * c.y);
    g.globalAlpha = alpha;
    g.fillStyle = s.paper || "#f6f1e7";
    g.fill(F.path, "evenodd");
    g.lineWidth = 1.6 / c.s; g.strokeStyle = "rgba(150, 132, 104, .65)"; g.stroke(F.edge);
    g.lineWidth = 1 / c.s; g.strokeStyle = "rgba(255, 255, 255, .7)";
    g.save(); g.translate(-1.2 / c.s, -1.2 / c.s); g.stroke(F.edge); g.restore();
  }

  // ----------------------------------------------------------------- one space as a stack of paper
  // st: { u, child, camChild, k } while diving into (or out of) a child; null at rest
  function paintStack(g, s, cam, o, st) {
    const t = o.t, layers = s.layers || [];
    const fit = o.fit;
    let slot = -1;
    if (st) slot = layers.findIndex(L => L.kind === "child" && L.child === st.child.id);
    // the parent's own page: the frame grows and slides away first when we step through
    let anchor = null;
    for (let i = 0; i < layers.length; i++) {
      const L = layers[i];
      if (L.vis === "mini") continue;                   // only drawn when this space is a miniature inside its parent
      let c = layerCam(s, cam, fit, L.d || 0, st ? null : breath(L, i, t));
      let a = o.alpha;
      if (st && i > slot && slot >= 0) {                  // in front of the child: step through it
        if (!anchor) anchor = st.anchor;
        const f = Math.exp(1.25 * Math.max(.15, (L.d || 0) - st.d) * st.ue);
        c = scaleAbout(c, f, anchor[0], anchor[1]);
        a *= 1 - smooth(.06, .5, st.u);
        if (L.kind === "frame") a *= 1 - smooth(0, .3, st.u);
      }
      if (L.kind === "child") {
        if (st && i === slot) paintDivingChild(g, s, L, c, o, st);
        else paintChildAtRest(g, s, L, c, o, a);
      } else if (L.kind === "frame") drawFrame(g, o, s, c, a);
      else drawLayer(g, o, c, L, a);
    }
  }

  // the child's subject (no backdrop, no frame) drawn with camera cc; u: 0 = miniature in the parent, 1 = its own page
  function paintSubject(g, c, cc, o, u, alpha, bump) {
    const layers = c.layers || [];
    const [fx, fy, fw, fh] = frameOf(c), px = cc.x + cc.s * (fx + fw / 2), py = cc.y + cc.s * (fy + fh / 2);
    for (const L of layers) {
      if (L.role === "back" || L.kind === "frame" || L.kind === "child") continue;
      let a = alpha;
      if (L.vis === "mini") a *= 1 - smooth(.3, .78, u);
      if (L.vis === "own") a *= smooth(.3, .78, u);
      const cl = bump ? scaleAbout(cc, Math.exp(.09 * (L.d || 0) * bump), px, py) : cc;
      drawLayer(g, o, cl, L, a);
    }
  }
  function paintBack(g, c, cc, o, alpha) {
    for (const L of c.layers || []) if (L.role === "back") drawLayer(g, o, cc, L, alpha);
  }
  function lensPath(g, o, c, x, y, r) {
    g.setTransform(o.dpr * c.s, 0, 0, o.dpr * c.s, o.dpr * c.x, o.dpr * c.y);
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2);
  }
  function lensPaper(g, o, s, L, c, r, alpha, lineAlpha = alpha) {   // the round paper card the inset is painted on, with its pin line
    const I = L.inset;
    g.setTransform(o.dpr * c.s, 0, 0, o.dpr * c.s, o.dpr * c.x, o.dpr * c.y);
    g.globalAlpha = lineAlpha;
    if (I.ax != null && lineAlpha > .002) {                                    // the leader line to what it magnifies
      const dx = I.ax - I.cx, dy = I.ay - I.cy, l = Math.hypot(dx, dy) || 1;
      g.beginPath(); g.moveTo(I.cx + dx / l * (r + 4), I.cy + dy / l * (r + 4)); g.lineTo(I.ax, I.ay);
      g.lineWidth = 2.2; g.strokeStyle = INK; g.stroke();
      g.beginPath(); g.arc(I.ax, I.ay, I.ar || 9, 0, Math.PI * 2); g.lineWidth = 2; g.stroke();
    }
    g.globalAlpha = alpha;
    if (alpha <= .002) return;
    g.save();
    g.shadowColor = "rgba(50, 34, 16, .35)"; g.shadowBlur = 14 * o.dpr * c.s; g.shadowOffsetX = 4 * o.dpr * c.s; g.shadowOffsetY = 7 * o.dpr * c.s;
    g.beginPath(); g.arc(I.cx, I.cy, r + (I.rim || 7), 0, Math.PI * 2); g.fillStyle = "#fbf8f0"; g.fill();
    g.restore();
  }
  function lensRim(g, o, c, I, r, alpha) {
    g.globalAlpha = alpha;
    g.setTransform(o.dpr * c.s, 0, 0, o.dpr * c.s, o.dpr * c.x, o.dpr * c.y);
    g.beginPath(); g.arc(I.cx, I.cy, r, 0, Math.PI * 2); g.lineWidth = 2; g.strokeStyle = "rgba(120, 100, 76, .55)"; g.stroke();
    g.beginPath(); g.arc(I.cx, I.cy, r + (I.rim || 7), 0, Math.PI * 2); g.lineWidth = 1.2; g.strokeStyle = "rgba(150, 132, 104, .6)"; g.stroke();
  }
  function paintChildAtRest(g, s, L, c, o, alpha) {
    const ch = SP[L.child]; if (!ch || alpha <= .002) return;
    const cc = childCam(c, inParent(ch));
    if (L.inset) {
      const I = L.inset;
      lensPaper(g, o, s, L, c, I.r, alpha);
      g.save(); lensPath(g, o, c, I.cx, I.cy, I.r); g.clip();
      g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = alpha; g.fillStyle = ch.paper || "#f6f1e7"; g.fillRect(0, 0, g.canvas.width, g.canvas.height);
      paintBack(g, ch, cc, o, alpha);
      paintSubject(g, ch, cc, o, 1, alpha, 0);
      g.restore();
      lensRim(g, o, c, I, I.r, alpha);
    } else paintSubject(g, ch, cc, o, 0, alpha, 0);
  }
  function paintDivingChild(g, s, L, c, o, st) {
    const ch = st.child, u = st.u;
    // where the parent's layer puts the child, easing into the core's child camera as we arrive
    const c0 = childCam(c, inParent(ch)), c1 = st.camChild, w = smooth(.25, 1, u);
    const cc = { s: Math.exp(Math.log(c0.s) * (1 - w) + Math.log(c1.s) * w), x: c0.x * (1 - w) + c1.x * w, y: c0.y * (1 - w) + c1.y * w };
    const bump = Math.sin(Math.PI * u);
    const fr = (ch.layers || []).find(q => q.kind === "frame");
    const frameCam = scaleAbout(cc, 1 + .35 * (1 - smooth(.55, 1, u)), st.anchor[0], st.anchor[1]);
    if (L.inset) {
      // through the magnifier: its round window opens until it is the whole screen
      const I = L.inset, sx = c.x + c.s * I.cx, sy = c.y + c.s * I.cy, W = g.canvas.width / o.dpr, H = g.canvas.height / o.dpr;
      const far = Math.max(Math.hypot(sx, sy), Math.hypot(W - sx, sy), Math.hypot(sx, H - sy), Math.hypot(W - sx, H - sy)) + 40;
      const r0 = I.r * c.s, rs = r0 * Math.pow(Math.max(1, far / r0), smooth(.02, .9, u)), r = rs / c.s;
      lensPaper(g, o, s, L, c, r, 1 - smooth(.35, .85, u), 1 - smooth(0, .25, u));
      g.save(); lensPath(g, o, c, I.cx, I.cy, r); g.clip();
      g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.fillStyle = ch.paper || "#f6f1e7"; g.fillRect(0, 0, g.canvas.width, g.canvas.height);
      paintBack(g, ch, cc, o, 1);
      paintSubject(g, ch, cc, o, 1, 1, bump);
      if (fr) drawFrame(g, o, ch, frameCam, smooth(.6, .97, u));
      g.restore();
      lensRim(g, o, c, I, r, 1 - smooth(.35, .85, u));
      return;
    }
    // straight in: its page arrives behind it (paper, then its backdrop), the subject stays put
    const bg = smooth(.45, .92, u);
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = bg; g.fillStyle = ch.paper || "#f6f1e7"; g.fillRect(0, 0, g.canvas.width, g.canvas.height);
    paintBack(g, ch, cc, o, bg);
    paintSubject(g, ch, cc, o, u, 1, bump);
    if (fr) drawFrame(g, o, ch, frameCam, smooth(.6, .97, u));
  }

  // ----------------------------------------------------------------- the flying leaf
  function paintDrive(g, s, cam, o) {
    const D = s.drive, d = o.drive || { pitch: 0, roll: 0, yoke: { x: 0, y: 0 }, throttle: .6, flaps: 0, gear: 0, heading: 90, speed: 280, t: 0 };
    const ga = o.alpha;
    const set = (c) => g.setTransform(o.dpr * c.s, 0, 0, o.dpr * c.s, o.dpr * c.x, o.dpr * c.y);
    // the world outside: rotated against the roll around the middle of the windscreen, lowered as the nose rises
    const sky = entry(D.sky.src);
    g.save();
    set(cam); g.beginPath();
    if (D.windows) for (const w of D.windows) { g.moveTo(w[0][0], w[0][1]); for (const p of w) g.lineTo(p[0], p[1]); g.closePath(); }
    else g.rect(0, 0, s.w, s.h);
    g.clip();
    const hx = D.horizon[0], hy = D.horizon[1] + d.pitch * D.ppd;
    g.translate(hx, hy); g.rotate(-d.roll * Math.PI / 180);
    g.globalAlpha = ga;
    const sc = D.sky.scale, pw = D.sky.w * sc, ph = D.sky.h * sc, hz = D.sky.horizon * sc;
    g.fillStyle = D.sky.top; g.fillRect(-4000, -4000, 8000, 4000 - hz + 2);
    g.fillStyle = D.sky.bottom; g.fillRect(-4000, ph - hz - 2, 8000, 4000);
    if (sky.bmp) {
      const off = ((d.heading * D.sky.pxPerDeg) % pw + pw) % pw;
      for (let x = -off - pw * 2; x < pw * 2; x += pw) g.drawImage(sky.bmp, x, -hz, pw + .5, ph);
    }
    const cl = D.clouds && entry(D.clouds.src);
    if (cl && cl.bmp) {                                    // nearer clouds slide faster and drift towards us
      const cw = D.clouds.w * D.clouds.scale, chh = D.clouds.h * D.clouds.scale;
      const off = ((d.heading * D.sky.pxPerDeg * 1.9 + d.t * d.speed * .05) % (cw * 1.6) + cw * 1.6) % (cw * 1.6);
      g.globalAlpha = ga * .95;
      for (let x = -off - cw * 3.2; x < cw * 2; x += cw * 1.6) g.drawImage(cl.bmp, x, -hz * .5 - chh * .8, cw, chh);
    }
    g.restore();
    // the flight deck in front, its windows cut open
    g.save();
    drawLayer(g, o, cam, D.shell, ga);
    if (D.cup) drawLayer(g, o, cam, D.cup, ga);
    if (D.static) drawLayer(g, o, cam, D.static, ga);
    if (D.levers) {                                        // the four thrust levers slide forward with the throttle
      const dy = -(d.throttle - .62) * D.levers.travel;
      drawLayer(g, o, { s: cam.s, x: cam.x, y: cam.y + cam.s * dy }, D.levers, ga);
    }
    if (D.yoke) {                                          // the wheel turns with the roll input and slides back when pulled
      const Y = D.yoke, [px, py] = Y.pivot, ang = d.yoke.x * 70 * Math.PI / 180, pull = d.yoke.y;
      set(cam); g.translate(px, py + pull * Y.travel); g.rotate(ang); g.scale(1 + pull * .07, 1 + pull * .07); g.translate(-px, -py);
      const e = entry(Y.src);
      if (e.bmp) { g.globalAlpha = ga; g.drawImage(e.bmp, Y.x, Y.y, Y.w, Y.h); }
    }
    g.restore();
    // flaps and wheels: two small paper tabs on the pedestal and the panel that move with the levers
    g.save(); set(cam); g.globalAlpha = ga;
    for (const [key, v] of [["flapTab", d.flaps], ["gearTab", d.gear]]) {
      const T = D[key]; if (!T) continue;
      const x = T.x, y = T.y0 + (T.y1 - T.y0) * v, top = Math.min(T.y0, T.y1) - 6, len = Math.abs(T.y1 - T.y0) + 12;
      g.fillStyle = "rgba(34, 28, 22, .78)";                    // the slot
      g.beginPath(); g.roundRect ? g.roundRect(x - 4, top, 8, len, 4) : g.rect(x - 4, top, 8, len); g.fill();
      g.save(); g.shadowColor = "rgba(30, 20, 10, .45)"; g.shadowBlur = 4 * o.dpr * cam.s; g.shadowOffsetY = 2 * o.dpr * cam.s;
      g.fillStyle = "#cfc6b4"; g.fillRect(x - 2.5, y - 2, 5, 14);   // the stem
      g.beginPath();
      if (key === "flapTab") { g.roundRect ? g.roundRect(x - T.r * 1.3, y - T.r * .7, T.r * 2.6, T.r * 1.4, 3) : g.rect(x - T.r * 1.3, y - T.r * .7, T.r * 2.6, T.r * 1.4); }
      else g.arc(x, y, T.r, 0, Math.PI * 2);                      // the wheel-shaped gear knob
      g.fillStyle = T.color; g.fill(); g.restore();
      g.lineWidth = 1.5; g.strokeStyle = "rgba(40, 30, 20, .85)"; g.stroke();
      if (key === "gearTab") { g.beginPath(); g.arc(x, y, T.r * .45, 0, Math.PI * 2); g.stroke(); }
    }
    g.restore();
    if (s.frameArt) { g.save(); drawFrame(g, o, s, cam, o.frameAlpha == null ? ga : o.frameAlpha); g.restore(); }
  }

  // ----------------------------------------------------------------- the outlines follow their own paper layer
  function syncHots(s, cam, o) {
    const hots = document.getElementById("lab-hots"); if (!hots) return;
    const depth = {}; for (const p of s.parts) depth[p.id] = p.d || 0;
    const tf = {};
    for (const p of s.parts) {
      const d = depth[p.id];
      if (!d) { tf[p.id] = null; continue; }
      const c = layerCam(s, cam, o.fit, d, breath({ d }, p.li || 0, o.t));
      tf[p.id] = { a: c.s / cam.s, b: (c.x - cam.x) / cam.s, c: (c.y - cam.y) / cam.s };
    }
    for (const e of hots.querySelectorAll("path.hot")) {
      const T = tf[e.dataset.part];
      if (T) e.setAttribute("transform", `matrix(${T.a},0,0,${T.a},${T.b},${T.c})`); else e.removeAttribute("transform");
    }
    const veil = hots.querySelector("path.veil");
    if (veil) { const T = o.focus && tf[o.focus]; if (T) veil.setAttribute("transform", `matrix(${T.a},0,0,${T.a},${T.b},${T.c})`); else veil.removeAttribute("transform"); }
    for (const b of document.querySelectorAll(".lab-plus")) {
      if (!b._at) continue;
      if (!b._at0 || b._sp !== s.id) { b._at0 = b._at.slice(); b._sp = s.id; }
      const T = tf[b.dataset.part];
      b._at = T ? [T.a * b._at0[0] + T.b, T.a * b._at0[1] + T.c] : b._at0.slice();
    }
  }

  // ----------------------------------------------------------------- the renderer
  window.LAB_RENDERER = {
    init(l) { lab = l; SP = l.data.spaces; },
    ready(s) {
      const need = [...allPics(s)];
      for (const L of s.layers || []) if (L.kind === "child" && SP[L.child]) need.push(...allPics(SP[L.child]));
      return need.every(u => { const e = entry(u); if (e.bmp) return true; const t = tries.get(u); return t.done && t.retry && t.retryDone; });
    },
    animating(s) { return true; },
    draw(g, s, cam, o) {
      g.save();
      if (s.kind === "drive") paintDrive(g, s, cam, o);
      else if (o.ghost) paintSubject(g, s, cam, o, 1, o.alpha, 0);
      else {
        paintStack(g, s, cam, o, null);
        if (o.focus !== undefined) syncHots(s, cam, o);
      }
      g.restore();
    },
    // stepping through the paper: k = 0..1 (1 = the child fills its own view)
    dive(g, parent, child, camP, camC, k, o) {
      const L = (parent.layers || []).find(q => q.kind === "child" && q.child === child.id);
      if (!L || parent.kind === "drive") return false;
      if (child.kind === "drive") return diveDrive(g, parent, child, camP, camC, k, o, L);
      const m = inParent(child), fitC = camC.s / k, k0 = startK(parent, child, k, (o.fit.s * m.s) / fitC);
      const u = clamp(Math.log(k / k0) / Math.log(1 / Math.min(k0, .97)), 0, 1);
      const lc = layerCam(parent, camP, o.fit, L.d || 0, null);
      const at = L.inset ? [lc.x + lc.s * L.inset.cx, lc.y + lc.s * L.inset.cy] : (() => {
        const [fx, fy, fw, fh] = frameOf(child), cc = childCam(lc, m); return [cc.x + cc.s * (fx + fw / 2), cc.y + cc.s * (fy + fh / 2)];
      })();
      const st = { child, u, ue: u * u * (3 - 2 * u), camChild: camC, k, d: L.d || 0, anchor: at };
      g.save();
      paintStack(g, parent, camP, o, st);
      g.restore();
      return true;
    }
  };

  // where this dive started: going in from a zoomed-in view starts there; coming out always ends at the parent's whole view
  const DV = { key: "", t: 0, k0: 0 };
  function startK(parent, child, k, kFit) {
    const now = performance.now(), key = parent.id + ">" + child.id;
    if (key !== DV.key || now - DV.t > 250) { DV.key = key; DV.k0 = k < .97 ? Math.max(kFit, Math.min(k, .9)) : kFit; }
    DV.t = now;
    return DV.k0;
  }

  // into the flying leaf: the crew layer (in front) slides past, the world outside turns into the sky
  function diveDrive(g, parent, child, camP, camC, k, o, L) {
    const m = inParent(child), fitC = camC.s / k, k0 = startK(parent, child, k, (o.fit.s * m.s) / fitC);
    const u = clamp(Math.log(k / k0) / Math.log(1 / Math.min(k0, .97)), 0, 1);
    g.save();
    const lc = layerCam(parent, camP, o.fit, L.d || 0, null);
    const st = { child, u, ue: u * u * (3 - 2 * u), camChild: camC, k, d: L.d || 0, anchor: [lc.x + lc.s * L.anchor[0], lc.y + lc.s * L.anchor[1]] };
    // the parent's stack up to the drive slot
    const layers = parent.layers;
    const slot = layers.indexOf(L);
    for (let i = 0; i < layers.length; i++) {
      const P = layers[i];
      if (P.vis === "mini") continue;
      let c = layerCam(parent, camP, o.fit, P.d || 0, null);
      if (i === slot) {
        const a = smooth(.25, .85, u);
        paintDrive(g, child, camC, { ...o, alpha: a, drive: o.drive || null, frameAlpha: smooth(.75, 1, u) });
        continue;
      }
      let a = o.alpha;
      if (i > slot) { c = scaleAbout(c, Math.exp(1.3 * Math.max(.15, (P.d || 0) - st.d) * st.ue), st.anchor[0], st.anchor[1]); a *= 1 - smooth(.05, .55, u); }
      if (P.kind === "frame") drawFrame(g, o, parent, c, a * (1 - smooth(0, .4, u)));
      else if (P.kind !== "child") drawLayer(g, o, c, P, a);
    }
    g.restore();
    return true;
  }
})();
