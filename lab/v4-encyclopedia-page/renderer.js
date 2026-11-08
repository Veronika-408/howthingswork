// v4 · Encyclopedia page: every space is a white book page laid out by code. Painted subjects are cut-outs
// (no backgrounds) placed on the paper with soft shadows; magnifier insets, leader-line labels, headings,
// scale bars and page numbers are drawn here, on the canvas, in the book's typography.
(() => {
  const A = window.V4_ASSETS;
  const FONT = '"Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif';
  const INK = "#2b2620", SOFT = "#6d6257", ACCENT = "#a23b20";
  const smooth = (a, b, t) => { const u = Math.min(1, Math.max(0, (t - a) / (b - a))); return u * u * (3 - 2 * u); };
  let lab = null;
  const cache = {};
  const img = n => cache[A[n].src] || (cache[A[n].src] = lab.img(A[n].src));
  const shadowImg = n => cache[A[n].shadow.src] || (cache[A[n].shadow.src] = lab.img(A[n].shadow.src));
  // a cut-out, or its sub-rectangle of the atlas: blit(g, bitmap, entry with optional .atlas, x, y, w, h)
  const blit = (g, bmp, e, x, y, w, h) => e.atlas ? g.drawImage(bmp, e.atlas[0], e.atlas[1], e.atlas[2], e.atlas[3], x, y, w, h) : g.drawImage(bmp, x, y, w, h);

  // ------------------------------------------------------------------ words, by the reader's age
  const pick = t => {
    if (t == null) return ""; if (typeof t === "string") return t;
    const age = lab.age ? lab.age() : 7; let best = null;
    for (const a of lab.content.ages) if (a <= age && t[a] != null) best = t[a];
    if (best == null) for (const a of lab.content.ages) if (t[a] != null) { best = t[a]; break; }
    return best || "";
  };
  const partName = (sid, pid) => pick((((lab.content.spaces[sid] || {}).parts || {})[pid] || {}).name) || pid;
  const title = sid => pick((lab.content.spaces[sid] || {}).title) || sid;

  // ------------------------------------------------------------------ space → screen
  const toScreen = (cam, x, y) => [cam.x + cam.s * x, cam.y + cam.s * y];
  function spaceTf(g, cam, o) { g.setTransform(o.dpr * cam.s, 0, 0, o.dpr * cam.s, o.dpr * cam.x, o.dpr * cam.y); }
  function screenTf(g, o) { g.setTransform(o.dpr, 0, 0, o.dpr, 0, 0); }

  // ------------------------------------------------------------------ pictures
  function drawAsset(g, name, x, y, s, alpha = 1) {
    const e = img(name); if (!e.bmp) return false;
    const a = A[name], ga = g.globalAlpha;
    g.globalAlpha = ga * alpha;
    blit(g, e.bmp, a, x, y, a.w * s, a.h * s);
    g.globalAlpha = ga;
    return true;
  }
  function drawShadow(g, el) {
    const a = A[el.a];
    if (el.drop !== false && a.shadow) {
      const e = shadowImg(el.a); if (!e.bmp) return;
      const sh = a.shadow;
      blit(g, e.bmp, sh, el.x + sh.dx * el.s, el.y + sh.dy * el.s, sh.w * el.s, sh.h * el.s);
    }
    for (const [u, v, rx, ry, k = .32] of el.ground || []) {      // contact shadows of things standing on the page
      const cx = el.x + u * el.s, cy = el.y + v * el.s, RX = rx * el.s, RY = ry * el.s;
      g.save(); g.translate(cx, cy); g.scale(1, RY / RX);
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, RX);
      gr.addColorStop(0, `rgba(60,45,30,${k})`); gr.addColorStop(.55, `rgba(60,45,30,${k * .45})`); gr.addColorStop(1, "rgba(60,45,30,0)");
      g.fillStyle = gr; g.beginPath(); g.arc(0, 0, RX, 0, Math.PI * 2); g.fill(); g.restore();
    }
  }

  // ------------------------------------------------------------------ insets: a disc (or a box) of fresh paper
  function insetPath(g, el, grow = 0) {
    g.beginPath();
    if (el.shape === "box") {
      const r = el.round || 18, x = el.cx - el.w / 2 - grow, y = el.cy - el.h / 2 - grow, w = el.w + 2 * grow, h = el.h + 2 * grow;
      g.roundRect ? g.roundRect(x, y, w, h, r + grow) : g.rect(x, y, w, h);
    } else g.ellipse(el.cx, el.cy, (el.rx || el.r) + grow, (el.ry || el.r) + grow, 0, 0, Math.PI * 2);
  }
  // the outline of the inset as seen from a point, for the magnifier "cone" (two tangent lines)
  function tangents(px, py, el) {
    const rx = el.shape === "box" ? el.w / 2 : (el.rx || el.r), ry = el.shape === "box" ? el.h / 2 : (el.ry || el.r);
    // sample the outline and take the two extreme angles seen from p
    const base = Math.atan2(el.cy - py, el.cx - px);
    let lo = null, hi = null;
    for (let i = 0; i < 96; i++) {
      const t = i / 96 * Math.PI * 2;
      let x, y;
      if (el.shape === "box") { const c = Math.cos(t), s = Math.sin(t), k = 1 / Math.max(Math.abs(c) / rx, Math.abs(s) / ry); x = el.cx + c * k; y = el.cy + s * k; }
      else { x = el.cx + rx * Math.cos(t); y = el.cy + ry * Math.sin(t); }
      let d = Math.atan2(y - py, x - px) - base; d = Math.atan2(Math.sin(d), Math.cos(d));
      if (!lo || d < lo.d) lo = { d, x, y }; if (!hi || d > hi.d) hi = { d, x, y };
    }
    return [lo, hi];
  }
  function drawInset(g, el, s, o, painters) {
    const fr = el.fromR || 22;
    // the cone from the small ring on the subject to the inset
    if (el.from) {
      const [fx, fy] = el.from, [t1, t2] = tangents(fx, fy, el);
      const b = Math.atan2(el.cy - fy, el.cx - fx);
      g.save();
      g.fillStyle = "rgba(120,100,70,.07)";
      g.beginPath(); g.moveTo(fx + fr * Math.cos(b - Math.PI / 2), fy + fr * Math.sin(b - Math.PI / 2)); g.lineTo(t1.x, t1.y); g.lineTo(t2.x, t2.y);
      g.lineTo(fx + fr * Math.cos(b + Math.PI / 2), fy + fr * Math.sin(b + Math.PI / 2)); g.closePath(); g.fill();
      g.strokeStyle = "rgba(43,38,32,.45)"; g.lineWidth = 1.4 / Math.max(.35, s.zoom); g.setLineDash([]);
      g.beginPath(); g.moveTo(fx + fr * Math.cos(b - Math.PI / 2), fy + fr * Math.sin(b - Math.PI / 2)); g.lineTo(t1.x, t1.y);
      g.moveTo(fx + fr * Math.cos(b + Math.PI / 2), fy + fr * Math.sin(b + Math.PI / 2)); g.lineTo(t2.x, t2.y); g.stroke();
      g.lineWidth = 2.2 / Math.max(.35, s.zoom); g.strokeStyle = "rgba(43,38,32,.75)";
      g.beginPath(); g.arc(fx, fy, fr, 0, Math.PI * 2); g.stroke();
      g.restore();
    }
    // soft shadow, then fresh white paper
    g.save();
    for (let i = 3; i >= 1; i--) { insetPath(g, el, i * 5); g.fillStyle = `rgba(70,50,30,${.035})`; g.fill(); }
    insetPath(g, el); g.fillStyle = "#fffdf9"; g.fill();
    g.clip();
    paintInsetContent(g, el, o, painters);
    g.restore();
    g.save(); insetPath(g, el); g.lineWidth = 3 / Math.max(.35, s.zoom); g.strokeStyle = INK; g.stroke();
    insetPath(g, el, -7); g.lineWidth = 1 / Math.max(.35, s.zoom); g.strokeStyle = "rgba(43,38,32,.35)"; g.stroke(); g.restore();
  }
  function paintInsetContent(g, el, o, painters) {
    if (el.paint && painters[el.paint]) return painters[el.paint](g, el, o);
    if (!el.a) return;
    const b = el.box;                     // where the picture sits inside the inset (computed in data.js)
    drawAsset(g, el.a, b.x, b.y, b.s);
    for (const st of el.stickers || []) drawSticker(g, st);
  }
  // a sticker on a picture (a cup on the flight deck): its own little contact shadow, then the cut-out
  function drawSticker(g, st, ghost) {
    if (st.ground && !ghost) {
      const [u, v, rx, ry, k] = st.ground;
      drawShadow(g, { a: st.a, x: st.x, y: st.y, s: st.s, drop: false, ground: [[u, v, rx, ry, k]] });
    }
    drawAsset(g, st.a, st.x, st.y, st.s);
  }

  // ------------------------------------------------------------------ labels and type, drawn at screen size
  function labelFont(cam) { return Math.max(11, Math.min(17, 23 * cam.s)); }
  function drawLabels(g, s, cam, o, alpha) {
    if (alpha <= 0.01) return;
    const fs = 23 * cam.s;
    const show = fs >= 8.5;               // phones at full page: the panel lists the parts; zoom in to read labels
    const px = labelFont(cam);
    screenTf(g, o);
    g.save();
    g.globalAlpha = o.alpha * alpha;
    g.font = `${px}px ${FONT}`;
    g.textBaseline = "middle";
    for (const L of s.page.labels) {
      const on = o.focus === L.part, dim = o.focus && !on;
      const [ax, ay] = toScreen(cam, L.at[0], L.at[1]);
      let [tx, ty] = toScreen(cam, L.to[0], L.to[1]);
      const text = L.text || partName(s.id, L.part);
      g.font = `${on ? "600 " : ""}${px}px ${FONT}`;
      const w = g.measureText(text).width;
      const align = L.align || (tx < ax ? "right" : "left");
      if (on) {   // the focused part's label stays on screen, however far we zoomed in
        const phone = o.view.w < 900, x0 = 14, x1 = o.view.w - (phone ? 14 : 380), y0 = 70, y1 = phone ? o.view.h * .6 : o.view.h - 20;
        const left = align === "right" ? tx - w : align === "center" ? tx - w / 2 : tx;
        tx += Math.max(0, x0 - left) - Math.max(0, left + w - x1);
        ty = Math.min(y1, Math.max(y0, ty));
      }
      g.textAlign = align === "center" ? "center" : align;
      // the leader line leaves the text at its near end
      let lx = tx, ly = ty;
      if (align === "right") lx = tx + 6; else if (align === "left") lx = tx - 6; else ly = ty + (ay > ty ? px * .75 : -px * .75);
      g.globalAlpha = o.alpha * alpha * (dim ? .35 : 1);
      if (show || on) {
        g.strokeStyle = on ? ACCENT : "rgba(43,38,32,.62)"; g.lineWidth = on ? 1.6 : 1;
        g.beginPath(); g.moveTo(lx, ly);
        if (L.elbow) { const [ex, ey] = toScreen(cam, L.elbow[0], L.elbow[1]); g.lineTo(ex, ey); }
        g.lineTo(ax, ay); g.stroke();
        g.fillStyle = on ? ACCENT : INK; g.beginPath(); g.arc(ax, ay, on ? 3.2 : 2.4, 0, Math.PI * 2); g.fill();
        // a halo of paper behind the words so they read over anything
        g.save(); g.lineWidth = 4; g.strokeStyle = "rgba(251,249,244,.9)"; g.lineJoin = "round"; g.strokeText(text, tx, ty); g.restore();
        g.fillStyle = on ? ACCENT : INK; g.fillText(text, tx, ty);
      } else {
        g.fillStyle = "rgba(43,38,32,.55)"; g.beginPath(); g.arc(ax, ay, 2, 0, Math.PI * 2); g.fill();
      }
      void w;
    }
    g.restore();
  }
  function spaced(g, text, x, y, track) {   // letter-spaced capitals (small caps of the headings)
    let w = 0; for (const ch of text) w += g.measureText(ch).width + track; w -= track;
    let cx = x;
    for (const ch of text) { g.fillText(ch, cx, y); cx += g.measureText(ch).width + track; }
    return w;
  }
  function drawFurniture(g, s, cam, o, alpha) {
    const P = s.page; if (!P.head || alpha <= 0.01) return;
    spaceTf(g, cam, o);
    g.save(); g.globalAlpha = o.alpha * alpha; g.fillStyle = INK; g.textBaseline = "alphabetic"; g.textAlign = "left";
    const [hx, hy] = P.head;
    g.font = `400 52px ${FONT}`;
    const w = spaced(g, title(s.id).toUpperCase(), hx, hy, 6);
    g.fillStyle = ACCENT; g.fillRect(hx, hy + 18, Math.max(120, Math.min(w, 260)), 3);
    if (P.kicker) { g.fillStyle = SOFT; g.font = `italic 24px ${FONT}`; g.fillText(P.kicker, hx, hy + 54); }
    // running head and folio, like a printed page
    g.fillStyle = SOFT; g.font = `400 17px ${FONT}`;
    if (P.folio) {
      const right = P.folio % 2 === 0;
      g.textAlign = right ? "left" : "right";
      g.fillText(String(P.folio), right ? 40 : s.w - 40, s.h - 34);
      g.font = `400 14px ${FONT}`;
      const rh = (P.section || "").toUpperCase();
      g.textAlign = right ? "left" : "right";
      spacedAligned(g, rh, right ? 84 : s.w - 84, s.h - 34, 3, right);
    }
    for (const sb of P.scales || []) drawScale(g, sb);
    g.restore();
  }
  function spacedAligned(g, text, x, y, track, leftAligned) {
    let w = 0; for (const ch of text) w += g.measureText(ch).width + track;
    const sx = leftAligned ? x : x - w;
    g.textAlign = "left"; spaced(g, text, sx, y, track);
  }
  function drawScale(g, sb) {   // a striped scale bar with its length written under it
    const { x, y, len, text, n = 4 } = sb, h = 7;
    g.save(); g.strokeStyle = INK; g.lineWidth = 1.3;
    for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? "#fffdf9" : INK; g.fillRect(x + len * i / n, y, len / n, h); }
    g.strokeRect(x, y, len, h);
    g.fillStyle = SOFT; g.font = `italic 19px ${FONT}`; g.textAlign = "center"; g.fillText(text, x + len / 2, y + 30);
    g.restore();
  }

  // ------------------------------------------------------------------ the flying page
  function drawWindow(g, W, st, o, t) {
    // W: { x, y, w, h, r }: the big rounded window with the captain's view; st: flight state
    const d = st || { pitch: 1, roll: 0, yoke: { x: 0, y: 0 }, throttle: .62, heading: 90, speed: 290, t: 0 };
    const sky = img("sky"), fr = img("drive-frame"), yoke = img("yoke"), lev = img("levers");
    g.save();
    g.beginPath(); g.roundRect ? g.roundRect(W.x, W.y, W.w, W.h, W.r) : g.rect(W.x, W.y, W.w, W.h); g.clip();
    // the world outside: rolled about the horizon's centre, lowered as the nose goes up, sliding with heading
    const k = W.w / 1536;
    const hx = W.x + W.w * .45, hy = W.y + W.h * .36;
    if (sky.bmp) {
      g.save();
      g.translate(hx, hy + d.pitch * 9 * k * 1.6);
      g.rotate(-d.roll * Math.PI / 180);
      const sw = W.w * 2.1, sh = sw * sky.h / sky.w;
      // tiles alternate with mirrored copies, so the painting joins itself without a seam
      const period = sw * 2, shift = ((d.heading / 360) * period * 2) % period;
      for (let k = -2; k <= 2; k++) {
        const x0 = -sw / 2 - shift + k * sw;
        if (x0 > W.w * 1.6 || x0 + sw < -W.w * 1.6) continue;
        if (((k % 2) + 2) % 2) { g.save(); g.translate(x0 + sw, 0); g.scale(-1, 1); g.drawImage(sky.bmp, 0, -sh / 2, sw, sh); g.restore(); }
        else g.drawImage(sky.bmp, x0, -sh / 2, sw, sh);
      }
      g.restore();
    }
    if (fr.bmp) g.drawImage(fr.bmp, W.x, W.y, W.w, W.h);
    // the attitude screen is live: a little horizon that tilts like the real one
    const pf = { x: W.x + 449 * k, y: W.y + 526 * k, w: 192 * k, h: 156 * k };
    g.save(); g.beginPath(); g.rect(pf.x, pf.y, pf.w, pf.h); g.clip();
    g.translate(pf.x + pf.w / 2, pf.y + pf.h / 2 + d.pitch * 2.2 * k); g.rotate(-d.roll * Math.PI / 180);
    g.fillStyle = "#3d8fd6"; g.fillRect(-pf.w, -pf.h * 2, pf.w * 2, pf.h * 2);
    g.fillStyle = "#b9682a"; g.fillRect(-pf.w, 0, pf.w * 2, pf.h * 2);
    g.strokeStyle = "#fff"; g.lineWidth = 2 * k; g.beginPath(); g.moveTo(-pf.w, 0); g.lineTo(pf.w, 0); g.stroke();
    for (const p of [-10, -5, 5, 10]) { const y = -p * 2.2 * k * 2.2; g.beginPath(); g.moveTo(-14 * k * (p % 10 ? .6 : 1), y); g.lineTo(14 * k * (p % 10 ? .6 : 1), y); g.stroke(); }
    g.restore();
    g.save(); g.strokeStyle = "#f6d23c"; g.lineWidth = 3.5 * k; const cx = pf.x + pf.w / 2, cy = pf.y + pf.h / 2;
    g.beginPath(); g.moveTo(cx - 40 * k, cy); g.lineTo(cx - 14 * k, cy); g.lineTo(cx - 14 * k, cy + 8 * k); g.moveTo(cx + 40 * k, cy); g.lineTo(cx + 14 * k, cy); g.lineTo(cx + 14 * k, cy + 8 * k); g.stroke();
    g.fillStyle = "#f6d23c"; g.fillRect(cx - 3 * k, cy - 3 * k, 6 * k, 6 * k); g.restore();
    // thrust levers: the handles slide forward (up the picture) with the throttle; the quadrant body stays
    if (lev.bmp) {
      const L = A.levers, s = 0.56 * k, lx = W.x + 1112 * k, ly = W.y + 770 * k, cut = 300;
      const slide = (d.throttle - .62) * 120 * k;
      const [ax, ay] = L.atlas || [0, 0];
      g.drawImage(lev.bmp, ax, ay + cut, L.w, L.h - cut, lx, ly + cut * s, L.w * s, (L.h - cut) * s);
      g.save(); g.beginPath(); g.rect(lx - 10, W.y, L.w * s + 20, ly + (cut + 40) * s - W.y); g.clip();
      g.drawImage(lev.bmp, ax, ay, L.w, cut + 40, lx, ly - slide, L.w * s, (cut + 40) * s);
      g.restore();
    }
    // the control wheel: turns with the roll input and slides towards you as you pull
    if (yoke.bmp) {
      const Y = A.yoke, s = 1.05 * k, cx = W.x + 560 * k, cy = W.y + 905 * k + d.yoke.y * 38 * k;
      g.save(); g.translate(cx, cy); g.rotate(d.yoke.x * 70 * Math.PI / 180);
      const sc = 1 + d.yoke.y * .07; g.scale(sc, sc);
      // the hub (at about 46% across, 63% down the sticker) is the pivot
      blit(g, yoke.bmp, Y, -Y.w * .5 * s, -Y.h * .58 * s, Y.w * s, Y.h * s);
      g.restore();
    }
    g.restore();
    // the frame of the window
    g.save(); g.beginPath(); g.roundRect ? g.roundRect(W.x, W.y, W.w, W.h, W.r) : g.rect(W.x, W.y, W.w, W.h);
    g.lineWidth = 4; g.strokeStyle = INK; g.stroke(); g.restore();
  }
  // the two little live diagrams: from behind (bank) and from the side (pitch, flaps, wheels)
  function drawDiagrams(g, P, d) {
    const r = img("rear747"), sd = img("side747");
    const D1 = P.behind, D2 = P.side;
    g.save();
    for (const D of [D1, D2]) {
      g.fillStyle = "#fffdf9"; g.beginPath(); g.roundRect ? g.roundRect(D.x, D.y, D.w, D.h, 16) : g.rect(D.x, D.y, D.w, D.h); g.fill();
      g.strokeStyle = "rgba(43,38,32,.5)"; g.lineWidth = 1.5; g.stroke();
      // horizon line of the diagram
      g.strokeStyle = "rgba(44,90,160,.35)"; g.setLineDash([8, 7]); g.beginPath(); g.moveTo(D.x + 14, D.y + D.h * .58); g.lineTo(D.x + D.w - 14, D.y + D.h * .58); g.stroke(); g.setLineDash([]);
    }
    if (r.bmp) {
      const R = A.rear747, s = (D1.w * .82) / R.w;
      g.save(); g.translate(D1.x + D1.w / 2, D1.y + D1.h * .58); g.rotate(d.roll * Math.PI / 180);
      blit(g, r.bmp, R, -R.w * s / 2, -R.h * s * .62, R.w * s, R.h * s); g.restore();
    }
    if (sd.bmp) {
      const S = A.side747, s = (D2.w * .8) / S.w;
      g.save(); g.translate(D2.x + D2.w / 2, D2.y + D2.h * .58); g.rotate(d.pitch * Math.PI / 180);   // nose (left) up when pitch > 0
      const ox = -S.w * s / 2, oy = -S.h * s * .55;
      // wheels down: nose gear and main gear legs drawn in ink under the body
      if (d.gear > .01) {
        const gl = 26 * s / .45 * d.gear;
        g.strokeStyle = INK; g.lineWidth = 2.2; g.fillStyle = "#2b2620";
        for (const [u, n] of [[.19, 1], [.47, 2], [.53, 2]]) {
          const x = ox + S.w * s * u, y0 = oy + S.h * s * .80;
          g.beginPath(); g.moveTo(x, y0); g.lineTo(x, y0 + gl); g.stroke();
          for (let i = 0; i < n; i++) { g.beginPath(); g.arc(x + (i - (n - 1) / 2) * 9, y0 + gl + 3, 4.2, 0, Math.PI * 2); g.fill(); }
        }
      }
      blit(g, sd.bmp, S, ox, oy, S.w * s, S.h * s);
      // flaps: a little panel sliding back and down from the wing's trailing edge
      if (d.flaps > .01) {
        const x0 = ox + S.w * s * .55, y0 = oy + S.h * s * .70, len = 34 * d.flaps, drop = 12 * d.flaps;
        g.fillStyle = "#e8e2d4"; g.strokeStyle = INK; g.lineWidth = 1.4;
        g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + len + 18, y0 + drop + 2); g.lineTo(x0 + len + 16, y0 + drop + 7); g.lineTo(x0, y0 + 5); g.closePath(); g.fill(); g.stroke();
      }
      g.restore();
    }
    g.restore();
  }
  function drawDrive(g, s, cam, o) {
    const P = s.page, d = o.drive;
    spaceTf(g, cam, o);
    g.globalAlpha = o.alpha;
    drawWindow(g, P.win, d, o, o.t);
    if (o.ghost) return;
    drawDiagrams(g, P, d || { roll: 0, pitch: 1, flaps: 0, gear: 0 });
    // captions of the diagrams
    g.fillStyle = SOFT; g.font = `italic 22px ${FONT}`; g.textAlign = "center"; g.textBaseline = "alphabetic";
    g.fillText(P.behind.caption, P.behind.x + P.behind.w / 2, P.behind.y - 16);
    g.fillText(P.side.caption, P.side.x + P.side.w / 2, P.side.y - 16);
    drawFurniture(g, s, cam, o, 1);
    drawLabels(g, s, cam, o, 1);
  }

  // ------------------------------------------------------------------ a page
  const painters = {
    window(g, el, o) { drawWindow(g, el.win, null, o, 0); }
  };
  function drawPage(g, s, cam, o) {
    const P = s.page;
    const zoom = cam.s / o.fit.s;
    const diving = document.body.classList.contains("entering");
    // words and insets give way while we dive through the page
    // and the next page's words and insets arrive last, once its picture has taken over
    const chrome = o.ghost ? 0 : diving ? (1 - smooth(1.15, 2.2, zoom)) * smooth(.55, 1, o.alpha) : 1;
    const S = { zoom: cam.s / (o.fit.s || 1) * (o.fit.s / .66) };
    spaceTf(g, cam, o);
    g.globalAlpha = o.alpha;
    for (const el of P.els) {
      if (o.ghost && !el.hero) continue;
      if (el.k === "img") {
        if (!o.ghost && el.shadow !== false) drawShadow(g, el);
        drawAsset(g, el.a, el.x, el.y, el.s, el.alpha == null ? 1 : el.alpha);
        for (const st of el.stickers || []) drawSticker(g, st, o.ghost);
      } else if (el.k === "inset") {
        if (chrome <= 0.01) continue;
        g.save(); g.globalAlpha = o.alpha * chrome; drawInset(g, el, S, o, painters); g.restore();
      } else if (el.k === "draw" && painters[el.paint]) painters[el.paint](g, el, o);
    }
    if (o.ghost) return;
    drawFurniture(g, s, cam, o, chrome);
    drawLabels(g, s, cam, o, chrome);
  }

  window.LAB_RENDERER = {
    init(l) { lab = l; },
    draw(g, s, cam, o) {
      if (!s.page) return;
      g.save();
      if (s.kind === "drive") drawDrive(g, s, cam, o); else drawPage(g, s, cam, o);
      g.restore();
    },
    animating(s) { return s.kind === "drive"; }
  };
})();
