// Patchwork renderer: every space is ONE painted picture (base.webp), with sharper deep-zoom tiles
// (repaints of parts of it) fading in as you zoom, and a "ghost" copy with the paper made transparent
// that is drawn while diving in or out. The flying leaf paints a scrolling sky behind the captain's-seat
// painting and moves the cut-out controls (wheel, thrust levers, flap lever, gear lever) in code.
(function () {
  const DEG = Math.PI / 180;
  let lab = null;
  let fadeUntil = 0;                 // keep frames coming while a tile fades in
  const born = new Map();            // tile url -> time its bitmap became ready
  const asked = new Set();           // tiles already requested
  let lastCam = null, lastMove = 0, wake = 0;
  // new tiles are only requested once the camera has stopped (not in the middle of a dive or a fling),
  // so a flight through a space does not fetch every sharp tile it passes
  function settle(s, cam, now) {
    const k = s.id + ":" + cam.s.toFixed(4) + ":" + Math.round(cam.x) + ":" + Math.round(cam.y);
    if (k !== lastCam) {
      lastCam = k; lastMove = now;
      clearTimeout(wake); wake = setTimeout(() => lab.requestDraw(), 240);
    }
    return now - lastMove > 200;
  }

  function view(cam, o) {            // the visible rectangle, in space units
    return { x0: -cam.x / cam.s, y0: -cam.y / cam.s, x1: (o.view.w - cam.x) / cam.s, y1: (o.view.h - cam.y) / cam.s };
  }

  const preloaded = new Set();
  function preloadSpots(s) {
    if (preloaded.has(s.id)) return; preloaded.add(s.id);
    for (const p of s.parts) {
      if (!p.child) continue;
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (const q of p.polys) for (const [x, y] of q) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
      const area = (x1 - x0) * (y1 - y0);
      for (const t of s.tiles || []) {
        const [tx, ty, tw, th] = t.rect;
        if (tx > x1 || ty > y1 || tx + tw < x0 || ty + th < y0 || tw * th > area * 6) continue;
        asked.add(t.src); lab.img(t.src);
      }
    }
  }

  function drawTiles(g, s, cam, o) {
    if (!s.tiles || !s.tiles.length) return;
    if (settle(s, cam, performance.now()) && !o.ghost) preloadSpots(s);
    const need = cam.s * o.dpr;                       // device pixels per space unit on screen now
    if (need < s.baseScale * 1.15) return;            // the base picture is sharp enough
    const v = view(cam, o), now = performance.now(), still = settle(s, cam, now);
    const l2 = s.tiles.filter(t => t.level <= 2), l3 = s.tiles.filter(t => t.level > 2);
    for (const list of [l2, l3]) {
      for (const t of list) {
        const [x, y, w, h] = t.rect;
        if (x > v.x1 || y > v.y1 || x + w < v.x0 || y + h < v.y0) continue;
        // a deeper tile only once the tile under it is no longer enough
        if (t.level > 2 && need < t.scale * .45) continue;
        if (!asked.has(t.src)) { if (!still) continue; asked.add(t.src); }
        const e = lab.img(t.src);
        if (!e.bmp) continue;
        if (!born.has(t.src)) born.set(t.src, now);
        const a = Math.min(1, (now - born.get(t.src)) / 350);
        if (a < 1) fadeUntil = Math.max(fadeUntil, born.get(t.src) + 360);
        lab.draw(g, o, cam, e, x, y, w, h, a);
      }
    }
  }

  // ---------------------------------------------------------------- the flying leaf
  function drawSky(g, s, cam, o) {
    const D = s.drive, d = o.drive || { pitch: 1, roll: 0, heading: 90, speed: 290, t: 0 };
    const sky = lab.img(s.sky);
    const [wx, wy, ww, wh] = D.win;
    g.save();
    g.setTransform(o.dpr * cam.s, 0, 0, o.dpr * cam.s, o.dpr * cam.x, o.dpr * cam.y);
    g.globalAlpha = o.alpha;
    g.beginPath(); g.rect(wx, wy, ww, wh); g.clip();
    // rotate the world about the horizon centre; nose up moves it down
    g.translate(s.w / 2, D.horizon + (d.pitch - 1) * D.ppd);
    g.rotate(-d.roll * DEG);
    const k = D.sky.k, tw = sky.w ? sky.w * k : 2000, th = sky.h ? sky.h * k : 1700, hy = D.sky.horizon * k;
    // far beyond the painting: plain sky above, plain cloud-sea below
    g.fillStyle = "#2f6cc0"; g.fillRect(-4000, -4000, 8000, 4000 - hy + 4);
    g.fillStyle = "#e9e6dc"; g.fillRect(-4000, th - hy - 4, 8000, 4000);
    if (sky.bmp) {
      const off = -(((d.heading * D.ppd) % tw) + tw) % tw;
      for (let i = -3; i <= 2; i++) g.drawImage(sky.bmp, off + i * tw, -hy, tw + 1, th);
    }
    g.restore();
  }

  function sprite(g, e, x, y, k, ax, ay, rot, alpha) {   // draw a cut-out with its anchor (ax, ay in its own px) at x, y
    if (!e.bmp) return;
    g.save(); g.translate(x, y); if (rot) g.rotate(rot); g.scale(k, k);
    g.globalAlpha = alpha; g.drawImage(e.bmp, -ax, -ay); g.restore();
  }

  function drawControls(g, s, cam, o) {
    const D = s.drive, d = o.drive || { yoke: { x: 0, y: 0 }, throttle: .62, flaps: 0, gear: 0 };
    g.save();
    g.setTransform(o.dpr * cam.s, 0, 0, o.dpr * cam.s, o.dpr * cam.x, o.dpr * cam.y);
    const A = o.alpha;
    // thrust levers: forward (up the slot) = more thrust
    const lever = lab.img(s.lever), flap = lab.img(s.flaplever), yoke = lab.img(s.yoke);
    for (const [[x0, y0], [x1, y1]] of D.slots) {
      const u = 1 - d.throttle, x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u;
      sprite(g, lever, x, y, D.leverK * (.88 + .12 * u), 200, 404, 0, A);
    }
    // flap lever in a slot drawn in code
    {
      const [[x0, y0], [x1, y1]] = D.flap;
      g.globalAlpha = A; g.strokeStyle = "#1d1f22"; g.lineCap = "round"; g.lineWidth = 12;
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
      g.strokeStyle = "rgba(140,122,90,.9)"; g.lineWidth = 2; g.stroke();
      const u = d.flaps, x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u;
      sprite(g, flap, x, y, D.flapK * (.9 + .1 * u), 108, 362, 0, A);
    }
    // gear lever: a little wheel-shaped knob, up or down
    {
      const [[x0, y0], [x1, y1]] = D.gear, u = d.gear;
      g.globalAlpha = A; g.fillStyle = "#24262a"; g.strokeStyle = "#8c7a5a"; g.lineWidth = 2;
      g.beginPath(); g.roundRect ? g.roundRect(x0 - 8, y0 - 10, 16, (y1 - y0) + 20, 7) : g.rect(x0 - 8, y0 - 10, 16, (y1 - y0) + 20); g.fill(); g.stroke();
      const x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u;
      g.fillStyle = "#3a3d42"; g.fillRect(x - 3, y - 2, 6, 14);
      g.fillStyle = "#f2efe6"; g.strokeStyle = "#2b2b2b"; g.lineWidth = 2.5;
      g.beginPath(); g.arc(x, y, 13, 0, Math.PI * 2); g.fill(); g.stroke();
      g.lineWidth = 1.6; g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2); g.stroke();
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; g.beginPath(); g.moveTo(x + Math.cos(a) * 6, y + Math.sin(a) * 6); g.lineTo(x + Math.cos(a) * 12, y + Math.sin(a) * 12); g.stroke(); }
    }
    // the two control wheels, linked: turned by yoke.x, pulled towards you by yoke.y
    D.yokes.forEach((Y, i) => {
      const pull = d.yoke.y, k = Y.k * (1 + .06 * pull), y = Y.y + pull * 34 * Y.k / .55;
      // the column, from the floor up to the hub
      const cw = 40 * Y.k / .5, top = y + 60 * Y.k, grad = g.createLinearGradient(0, top, 0, Y.col);
      grad.addColorStop(0, "#34373b"); grad.addColorStop(.75, "#2b2d31"); grad.addColorStop(1, "rgba(43,45,49,0)");
      g.globalAlpha = A; g.fillStyle = grad; g.fillRect(Y.x - cw / 2, top, cw, Y.col - top);
      g.fillStyle = "rgba(255,255,255,.10)"; g.fillRect(Y.x - cw * .32, top, cw * .16, (Y.col - top) * .8);
      sprite(g, yoke, Y.x, y, k, 371, 231, d.yoke.x * 70 * DEG, A);
    });
    g.restore();
  }

  function drawDrive(g, s, cam, o) {
    if (o.ghost || o.alpha < .999) {                 // diving in: the ghost already has a level sky in its windows
      lab.draw(g, o, cam, lab.img(s.ghost), 0, 0, s.w, s.h);
    } else {
      drawSky(g, s, cam, o);
      lab.draw(g, o, cam, lab.img(s.base), 0, 0, s.w, s.h);
    }
    drawControls(g, s, cam, o);
  }

  window.LAB_RENDERER = {
    init(l) { lab = l; },
    draw(g, s, cam, o) {
      if (s.kind === "drive") return drawDrive(g, s, cam, o);
      if (o.ghost) {                                  // only the subject, its paper transparent
        lab.draw(g, o, cam, lab.img(s.ghost), 0, 0, s.w, s.h);
        return;
      }
      if (o.alpha < .999 && s.page) {                  // the full page fading in at the end of a dive: the core has
        lab.draw(g, o, cam, lab.img(s.page), 0, 0, s.w, s.h);   // already laid our paper down, so paint without our own
        return;                                                // paper, or its edge shows as a rectangle
      }
      lab.draw(g, o, cam, lab.img(s.base), 0, 0, s.w, s.h);
      drawTiles(g, s, cam, o);
    },
    animating(s) { return performance.now() < fadeUntil; }
  };
})();
