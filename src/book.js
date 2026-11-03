// "How it works" book pages: a painted diagram that moves, with numbered steps beside it.
// Each mechanism in window.MECHANISMS supplies its art, text and a setup(api) that returns
// { tick(dt, t), step(n), control(value) }. Diagram coordinates are the base painting's pixels.
(() => {
  const MECH = window.MECHANISMS || {};
  const $ = s => document.querySelector(s);
  const NS = "http://www.w3.org/2000/svg";
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const svgEl = (tag, attrs = {}, parent) => {
    const el = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    if (parent) parent.appendChild(el);
    return el;
  };

  // ---------- watercolour dabs: pre-painted soft blobs with darker edges, drawn with multiply ----------
  const dabCache = {};
  function dab(color, variant = 0) {
    const key = color + variant;
    if (dabCache[key]) return dabCache[key];
    const c = document.createElement("canvas"), S = 64;
    c.width = c.height = S;
    const g = c.getContext("2d");
    let seed = variant * 9301 + color.length * 49297;
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    const pts = [];
    for (let i = 0; i < 14; i++) {
      const a = i / 14 * Math.PI * 2, r = S * (.3 + rnd() * .12);
      pts.push([S / 2 + Math.cos(a) * r, S / 2 + Math.sin(a) * r]);
    }
    const blob = () => {
      g.beginPath();
      pts.forEach((p, i) => {
        const n = pts[(i + 1) % pts.length], mx = (p[0] + n[0]) / 2, my = (p[1] + n[1]) / 2;
        i ? g.quadraticCurveTo(p[0], p[1], mx, my) : g.moveTo(mx, my);
      });
      g.closePath();
    };
    g.filter = "blur(1.2px)";
    g.globalAlpha = .55; g.fillStyle = color; blob(); g.fill();
    g.globalAlpha = .5; g.lineWidth = 2.2; g.strokeStyle = color; blob(); g.stroke();   // edge darkening
    g.filter = "none";
    g.globalCompositeOperation = "destination-out";                                       // granulation
    for (let i = 0; i < 70; i++) { g.globalAlpha = rnd() * .35; g.fillRect(rnd() * S, rnd() * S, 1.5, 1.5); }
    return (dabCache[key] = c);
  }

  // A flow of dabs along a polyline. Colour can change along the path (cool air -> hot gas).
  class Flow {
    constructor(path, { colors, size = 22, count = 40, speed = 120, jitter = 10, fadeIn = .06, fadeOut = .1, alpha = 1 } = {}) {
      this.path = path; this.colors = colors; this.alpha = alpha; this.size = size; this.speed = speed; this.jitter = jitter;
      this.fadeIn = fadeIn; this.fadeOut = fadeOut;
      this.seg = []; let L = 0;
      for (let i = 1; i < path.length; i++) { const d = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]); this.seg.push(d); L += d; }
      this.length = L;
      this.items = Array.from({ length: count }, (_, i) => ({ s: i / count * L, off: (Math.random() * 2 - 1) * jitter, v: Math.floor(Math.random() * 4), k: .75 + Math.random() * .5 }));
      this.rate = 1; this.density = 1;
    }
    at(s) {
      let i = 0;
      while (i < this.seg.length - 1 && s > this.seg[i]) { s -= this.seg[i]; i++; }
      const a = this.path[i], b = this.path[i + 1], t = Math.min(1, s / this.seg[i]);
      const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
      return { x: a[0] + dx * t, y: a[1] + dy * t, nx: -dy / d, ny: dx / d };
    }
    color(u) {
      const c = this.colors, i = Math.min(c.length - 1, Math.floor(u * c.length));
      return c[i];
    }
    tick(dt) { const L = this.length; for (const p of this.items) p.s = (((p.s + this.speed * this.rate * p.k * dt) % L) + L) % L; }
    draw(g) {
      const n = Math.round(this.items.length * this.density);
      // each particle is a short brush stroke: three overlapping dabs trailing behind it
      for (let i = 0; i < n; i++) {
        const p = this.items[i], u = p.s / this.length;
        const a = Math.min(1, u / this.fadeIn, (1 - u) / this.fadeOut);
        if (a <= 0) continue;
        const sz = this.size * p.k, col = this.color(u);
        for (let j = 0; j < 3; j++) {
          const q = this.at(Math.max(0, p.s - j * sz * .42 * Math.sign(this.speed * this.rate || 1)));
          g.globalAlpha = a * this.alpha * (.62 - j * .17);
          g.drawImage(dab(col, (p.v + j) % 4), q.x + q.nx * p.off - sz / 2, q.y + q.ny * p.off - sz / 2, sz, sz);
        }
      }
      g.globalAlpha = 1;
    }
  }

  // ---------- the diagram stage ----------
  function makeStage(fig, art) {
    fig.replaceChildren();
    fig.style.aspectRatio = `${art.w} / ${art.h}`;
    const base = Object.assign(document.createElement("img"), { alt: art.alt || "", className: "bk-base", draggable: false });
    if (art.src) base.src = art.src;
    const under = document.createElement("div"); under.className = "bk-layer";
    const canvas = document.createElement("canvas"); canvas.className = "bk-canvas";
    const over = document.createElement("div"); over.className = "bk-layer";
    const svg = svgEl("svg", { viewBox: `0 0 ${art.w} ${art.h}`, class: "bk-svg" });
    const svgTop = svgEl("svg", { viewBox: `0 0 ${art.w} ${art.h}`, class: "bk-svg" });
    svg.innerHTML = `<defs>
      <filter id="bk-ink" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="3.2"/></filter>
      <filter id="bk-soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
    </defs>`;
    if (!art.src) base.style.display = "none";
    fig.append(base, under, svg, canvas, over, svgTop);
    // drawing order: mechanism art, the veil that dims everything but the current step, ink, callouts
    const artG = svgEl("g", { class: "bk-art" }, svg);
    const spotG = svgEl("g", { class: "bk-spot" }, svg);
    const ink = svgEl("g", { class: "bk-ink" }, svgTop);
    const calloutsG = svgEl("g", { class: "bk-callouts" }, svgTop);
    const maskId = "bk-spotmask-" + Math.random().toString(36).slice(2, 7);
    const mask = svgEl("mask", { id: maskId, maskUnits: "userSpaceOnUse", x: -50, y: -50, width: art.w + 100, height: art.h + 100 }, svg.querySelector("defs"));
    svgEl("rect", { x: -50, y: -50, width: art.w + 100, height: art.h + 100, fill: "#fff" }, mask);
    const holesG = svgEl("g", { filter: "url(#bk-soft)" }, mask);
    const veil = svgEl("rect", { x: -50, y: -50, width: art.w + 100, height: art.h + 100, class: "bk-spot-veil", mask: `url(#${maskId})`, opacity: 0 }, spotG);
    const holeEls = [];
    const spot = holes => {
      veil.setAttribute("opacity", holes && holes.length ? .5 : 0);
      if (!holes) return;
      holes.forEach((h, i) => {
        const e = holeEls[i] || (holeEls[i] = svgEl("ellipse", { fill: "#000" }, holesG));
        e.setAttribute("cx", h.cx); e.setAttribute("cy", h.cy); e.setAttribute("rx", h.rx); e.setAttribute("ry", h.ry);
        e.setAttribute("transform", h.rot ? `rotate(${h.rot} ${h.cx} ${h.cy})` : "");
        e.style.display = "";
      });
      for (let i = holes.length; i < holeEls.length; i++) holeEls[i].style.display = "none";
    };
    const g = canvas.getContext("2d");
    const resize = () => {
      const r = fig.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(r.width * dpr)); canvas.height = Math.max(1, Math.round(r.height * dpr));
      g.setTransform(canvas.width / art.w, 0, 0, canvas.height / art.h, 0, 0);
    };
    // place an absolutely positioned element in diagram coordinates (percentages, so it scales with the page)
    const place = (el, x, y, w, h) => Object.assign(el.style, { left: x / art.w * 100 + "%", top: y / art.h * 100 + "%", width: w / art.w * 100 + "%", height: h / art.h * 100 + "%" });
    const sprite = (src, x, y, w, h, parent = over, cls = "") => {
      const im = Object.assign(document.createElement("img"), { src, alt: "", draggable: false, className: "bk-sprite " + cls });
      place(im, x, y, w, h); parent.appendChild(im); return im;
    };
    // hand-inked arrow that draws itself
    const arrow = (d, { color = "#2b2620", width = 4, head = 16, group } = {}) => {
      const g = svgEl("g", { class: "bk-arrow", filter: "url(#bk-ink)" }, group || ink);
      const halo = svgEl("path", { d, fill: "none", class: "bk-halo", "stroke-width": width + 9, "stroke-linecap": "round" }, g);
      const p = svgEl("path", { d, fill: "none", stroke: color, "stroke-width": width, "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
      const L = p.getTotalLength(), end = p.getPointAtLength(L), pre = p.getPointAtLength(Math.max(0, L - 6));
      const ang = Math.atan2(end.y - pre.y, end.x - pre.x);
      const h = svgEl("path", {
        d: `M${end.x - head * Math.cos(ang - .45)},${end.y - head * Math.sin(ang - .45)} L${end.x},${end.y} L${end.x - head * Math.cos(ang + .45)},${end.y - head * Math.sin(ang + .45)}`,
        fill: "none", stroke: color, "stroke-width": width, "stroke-linecap": "round", "stroke-linejoin": "round"
      }, g);
      p.style.strokeDasharray = L; p.style.strokeDashoffset = L;
      halo.style.strokeDasharray = L; halo.style.strokeDashoffset = L;
      h.style.opacity = 0;
      return {
        el: g,
        draw(ms = 900, delay = 0) {
          p.style.transition = "none"; h.style.transition = "none";
          p.style.strokeDashoffset = L; h.style.opacity = 0;
          p.getBoundingClientRect();
          p.style.transition = `stroke-dashoffset ${reduceMotion ? 0 : ms}ms cubic-bezier(.4,.1,.3,1) ${delay}ms`;
          h.style.transition = `opacity 160ms ${reduceMotion ? 0 : ms + delay - 80}ms`;
          halo.style.transition = p.style.transition;
          p.style.strokeDashoffset = 0; halo.style.strokeDashoffset = 0; h.style.opacity = 1;
        },
        hide() {
          for (const e of [p, halo]) { e.style.transition = "stroke-dashoffset 300ms"; e.style.strokeDashoffset = L; }
          h.style.transition = "opacity 150ms"; h.style.opacity = 0;
        }
      };
    };
    // numbered ink callout with a short leader
    const callout = (n, x, y, lx, ly, onClick) => {
      const g = svgEl("g", { class: "bk-callout", "data-step": n }, calloutsG);
      if (lx != null) svgEl("path", { d: `M${lx},${ly} L${x},${y}`, class: "bk-leader", filter: "url(#bk-ink)" }, g);
      if (lx != null) svgEl("circle", { cx: lx, cy: ly, r: 4.5, class: "bk-leader-dot" }, g);
      svgEl("circle", { cx: x, cy: y, r: 21, class: "bk-num-ring" }, g);
      const t = svgEl("text", { x, y: y + 8.5, "text-anchor": "middle", class: "bk-num" }, g);
      t.textContent = n;
      g.addEventListener("click", () => onClick && onClick(n));
      return g;
    };
    const setControl = v => { const i = document.querySelector("#bk-input"); if (i) { i.value = Math.round(v * 100); i.dispatchEvent(new Event("input")); } };
    const status = text => { document.querySelector("#bk-status").textContent = text; };
    const sig = {};                       // live values a mechanism reports, read by the video renderer
    return { sig, fig, base, under, over, svg, art: artG, ink, canvas, g, resize, place, sprite, arrow, callout, spot, setControl, status, w: art.w, h: art.h, Flow, dab };
  }

  // ---------- the book ----------
  const overlay = $("#book"), spread = $("#bk-spread"), fig = $("#bk-fig");
  let open = null, raf = 0, last = 0, lastFocus = null;

  function buildText(m) {
    $("#bk-head-r").textContent = m.title;
    $("#bk-title").textContent = m.title;
    $("#bk-intro").textContent = m.intro;
    $("#bk-know").textContent = m.know;
    $("#bk-folio-l").textContent = m.folio;
    $("#bk-folio-r").textContent = m.folio + 1;
    $("#bk-caption").textContent = m.caption || "";
    const ol = $("#bk-steps");
    ol.replaceChildren(...m.steps.map((s, i) => {
      const li = document.createElement("li");
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.step = i + 1;
      b.innerHTML = `<span class="bk-step-n"></span><span class="bk-step-t"><b></b> <span></span></span>`;
      b.querySelector(".bk-step-n").textContent = i + 1;
      b.querySelector("b").textContent = s.name;
      b.querySelector(".bk-step-t > span").textContent = s.text;
      b.addEventListener("click", () => setStep(i + 1, true));
      li.appendChild(b);
      return li;
    }));
    // the control: a painted lever or switch, backed by a native input for keyboard and screen readers
    const ctl = $("#bk-control");
    ctl.replaceChildren();
    if (!m.control) return;
    const c = m.control;
    const lab = document.createElement("label");
    lab.className = "bk-ctl-label"; lab.htmlFor = "bk-input"; lab.textContent = c.label;
    const wrap = document.createElement("div"); wrap.className = "bk-ctl " + (c.kind || "lever");
    if (c.kind === "buttons") {
      for (const btn of c.buttons) {
        const b = document.createElement("button");
        b.type = "button"; b.className = "bk-pill"; b.textContent = btn.label;
        if (btn.toggle) b.setAttribute("aria-pressed", "false");
        b.addEventListener("click", () => {
          if (btn.toggle) { const on = b.getAttribute("aria-pressed") !== "true"; b.setAttribute("aria-pressed", on); b.textContent = on ? btn.onLabel : btn.label; open.api.control({ [btn.id]: on }); }
          else open.api.control({ [btn.id]: true });
        });
        wrap.appendChild(b);
      }
      ctl.append(Object.assign(document.createElement("div"), { className: "bk-ctl-label", textContent: c.label }), wrap);
      return;
    }
    const input = Object.assign(document.createElement("input"), { type: "range", id: "bk-input", min: 0, max: 100, step: 1, value: c.value ?? 0 });
    input.setAttribute("aria-valuetext", c.text ? c.text(+input.value / 100) : "");
    const ends = document.createElement("div"); ends.className = "bk-ctl-ends";
    ends.innerHTML = "<span></span><span></span>";
    ends.children[0].textContent = c.min; ends.children[1].textContent = c.max;
    const readout = document.createElement("p"); readout.className = "bk-readout"; readout.setAttribute("aria-live", "polite");
    const update = () => {
      const v = +input.value / 100;
      wrap.style.setProperty("--v", v);
      readout.textContent = c.text ? c.text(v) : "";
      input.setAttribute("aria-valuetext", readout.textContent);
      open && open.api.control(v);
    };
    input.addEventListener("input", update);
    wrap.append(input);
    ctl.append(lab, wrap, ends, readout);
    requestAnimationFrame(update);
  }

  let current = 0, playTimer = 0;
  const track = (event, props) => { try { window.track && window.track(event, props); } catch (e) {} };
  function setStep(n, user = false) {
    current = n;
    if (user && open) track("book_step", { page: open.id, step: n });
    for (const b of document.querySelectorAll("#bk-steps button")) b.classList.toggle("on", +b.dataset.step === n);
    for (const c of fig.querySelectorAll(".bk-callout")) c.classList.toggle("on", +c.dataset.step === n);
    open && open.api.step(n);
    if (user) stopPlay();
  }
  // using a control yourself clears the step highlight, so the whole picture is visible
  function clearStep() {
    if (!current || !open) return;
    stopPlay();
    current = 0;
    for (const b of document.querySelectorAll("#bk-steps button")) b.classList.remove("on");
    for (const c of fig.querySelectorAll(".bk-callout")) c.classList.remove("on");
    open.api.step(0);
  }
  window.__clearStep = clearStep;
  const usedControl = () => { if (open && !open.used) { open.used = true; track("book_control_used", { page: open.id }); } };
  $("#bk-control").addEventListener("input", e => { if (e.isTrusted) { clearStep(); usedControl(); } });
  $("#bk-control").addEventListener("click", e => { if (e.isTrusted && e.target.closest(".bk-pill")) { clearStep(); usedControl(); } });
  for (const el of [fig, $("#bk-inset"), $("#bk-side")]) el.addEventListener("pointerdown", e => { if (e.isTrusted) usedControl(); });

  function stopPlay() { clearTimeout(playTimer); playTimer = 0; $("#bk-play").setAttribute("aria-pressed", "false"); $("#bk-play").lastChild.textContent = " Play the steps"; }
  function play() {
    if (playTimer) { stopPlay(); return; }
    $("#bk-play").setAttribute("aria-pressed", "true");
    $("#bk-play").lastChild.textContent = " Stop";
    let n = 0;
    const next = () => {
      n = n % open.m.steps.length + 1;
      setStep(n);
      playTimer = setTimeout(next, open.m.steps[n - 1].ms || 4200);
    };
    next();
  }

  function loop(t) {
    raf = requestAnimationFrame(loop);
    if (!open) return;
    const dt = Math.min(.05, (t - last) / 1000 || 0); last = t;
    const st = open.stage;
    st.g.save(); st.g.setTransform(1, 0, 0, 1, 0, 0); st.g.clearRect(0, 0, st.canvas.width, st.canvas.height); st.g.restore();
    st.g.globalCompositeOperation = "multiply";
    open.api.tick(reduceMotion ? dt * .25 : dt, t / 1000);
    window.__sig = st.sig;
    st.g.globalCompositeOperation = "source-over";
  }

  // The page turn: the painting you were looking at lies open, its right page lifts and turns over.
  function pageTurn(fromSrc) {
    const leafWrap = $("#bk-turn");
    if (reduceMotion || !fromSrc || innerWidth < 760) { leafWrap.hidden = true; return Promise.resolve(); }
    leafWrap.hidden = false;
    for (const el of leafWrap.querySelectorAll(".bk-old")) el.src = fromSrc;
    leafWrap.classList.remove("go", "done");
    overlay.classList.add("turning");
    leafWrap.getBoundingClientRect();
    return new Promise(res => {
      setTimeout(() => leafWrap.classList.add("go"), 380);
      setTimeout(() => leafWrap.classList.add("done"), 1500);
      setTimeout(() => overlay.classList.remove("turning"), 1300);
      setTimeout(() => { leafWrap.hidden = true; res(); }, 1950);
    });
  }

  function openBook(id, { fromSrc } = {}) {
    const m = MECH[id];
    if (!m) return;
    lastFocus = document.activeElement;
    stopPlay();
    overlay.hidden = false;
    overlay.dataset.mech = id;
    buildText(m);
    $("#bk-status").textContent = "";
    const insetBox = $("#bk-inset");
    insetBox.hidden = !m.inset;
    insetBox.innerHTML = m.inset ? '<div class="bk-inset-art"></div><p class="bk-inset-cap"></p>' : "";
    if (m.inset) insetBox.querySelector(".bk-inset-cap").textContent = m.inset.caption;
    // a page with a side diagram moves its "Did you know?" box over to the text page
    const side = $("#bk-side"), know = $("#bk-knowbox");
    side.hidden = !m.side; side.replaceChildren();
    if (m.side) $("#bk-back").before(know); else side.after(know);
    const stage = makeStage(fig, m.art);
    stage.inset = m.inset ? insetBox.querySelector(".bk-inset-art") : document.createElement("div");
    stage.side = side;
    stage.resize();
    const api = m.setup(stage);
    open = { id, m, stage, api };
    current = 0;
    for (const s of m.callouts || []) stage.callout(s[0], s[1], s[2], s[3], s[4], n => setStep(n, true));
    requestAnimationFrame(() => { overlay.classList.add("open"); stage.resize(); });
    pageTurn(fromSrc).then(() => {
      if (open && open.id === id) { spread.classList.add("inked"); setTimeout(() => open && open.id === id && setStep(1), 500); }
    });
    last = performance.now();
    cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
    $("#bk-close").focus({ preventScroll: true });
    try { history.replaceState(null, "", "#how-" + id); } catch (e) {}
  }

  function closeBook() {
    if (!open) return;
    stopPlay();
    overlay.classList.remove("open", "turning");
    spread.classList.remove("inked");
    const was = open; open = null;
    cancelAnimationFrame(raf);
    setTimeout(() => { if (!open) { overlay.hidden = true; fig.replaceChildren(); } }, 450);
    if (was.api.dispose) was.api.dispose();
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
    window.dispatchEvent(new CustomEvent("bookclosed", { detail: was.id }));
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  $("#bk-close").addEventListener("click", closeBook);
  $("#bk-back").addEventListener("click", closeBook);
  $("#bk-play").addEventListener("click", play);
  overlay.addEventListener("click", e => { if (e.target === overlay) closeBook(); });
  document.addEventListener("keydown", e => {
    if (!open) return;
    if (e.key === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); closeBook(); }
    else if (e.key.startsWith("Arrow") && e.target.closest && e.target.closest("input, [role=slider], [role=button]")) return;   // arrows belong to the control
    else if (e.key === "ArrowRight") { e.preventDefault(); e.stopImmediatePropagation(); setStep(current % open.m.steps.length + 1, true); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); e.stopImmediatePropagation(); setStep((current + open.m.steps.length - 2) % open.m.steps.length + 1, true); }
    else if (e.key === "Tab") {                               // keep focus inside the open book
      const f = [...overlay.querySelectorAll("button, input")].filter(x => x.offsetParent);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  }, true);
  addEventListener("resize", () => open && open.stage.resize());
  document.addEventListener("visibilitychange", () => { last = performance.now(); });

  window.BOOK = { open: openBook, close: closeBook, has: id => !!MECH[id], get current() { return open && open.id; }, step: n => setStep(n, true), Flow };
})();
