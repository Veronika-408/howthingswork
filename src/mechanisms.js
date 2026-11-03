// The plane's "How it works" pages. Coordinates are pixels of each page's base painting
// (art/book/*.png, 1536 x 1024). setup(stage) builds the moving parts and returns
// { tick(dt, t), step(n), control(value) }.
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const el = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    if (parent) parent.appendChild(e);
    return e;
  };
  const A = "assets/book/";
  const mirrorY = (path, axis) => path.map(([x, y]) => [x, 2 * axis - y]);
  const mirrorX = (path, axis) => path.map(([x, y]) => [2 * axis - x, y]);
  const lerp = (a, b, t) => a + (b - a) * t;
  const approach = (v, target, rate, dt) => v + (target - v) * (1 - Math.exp(-rate * dt));
  // spread a few colours along a path so dabs change colour as they travel
  const ramp = (stops, n = 24) => Array.from({ length: n }, (_, i) => {
    const u = (i + .5) / n;
    let c = stops[0][1];
    for (const [at, col] of stops) if (u >= at) c = col;
    return c;
  });

  window.MECHANISMS = {

    // ------------------------------------------------------------------ flight deck controls
    cockpit: {
      title: "Take the controls",
      folio: 8,
      art: { src: A + "cockpit.webp", w: 1448, h: 930, alt: "The flight deck of a 747-400 seen from behind the captain and first officer, who sit side by side." },
      intro: "The captain sits on the left and the first officer on the right. Between them are six controls that move the parts of the plane. Try them: drag the wheel, push the levers, steer with the tiller.",
      steps: [
        { name: "Control wheel.", text: "Turn it to the left and the left aileron tips up while the right one tips down. The plane leans into a left turn.", ms: 4200 },
        { name: "Control column.", text: "Push the wheel forward and the elevators on the tail tip down, so the nose goes down. Pull it back and the nose comes up.", ms: 4200 },
        { name: "Rudder pedals.", text: "Press the left pedal and the rudder on the tail swings left, turning the nose left. On the ground the pedals steer the nose wheel a little too.", ms: 4200 },
        { name: "Thrust levers.", text: "One lever for each of the four engines. The pilot pushes all four forward with one hand.", ms: 4200 },
        { name: "Flap lever.", text: "Pull it back notch by notch: 1, 5, 10, 20, 25, 30. The flaps slide out of the wing, so the plane can fly slowly for take-off and landing.", ms: 4600 },
        { name: "Tiller.", text: "On the ground, the captain steers with this small wheel. It turns the nose wheel, like the handlebars of a bicycle.", ms: 4200 }
      ],
      know: "The two control wheels are joined under the floor, so when one pilot turns a wheel, the other one turns too. Some newer airliners use a small joystick at the pilot's side instead, but the 747 has a proper wheel.",
      inset: { caption: "Beside the captain: the tiller. At the pilots' feet: the rudder pedals." },
      side: true,
      caption: "The 747-400 flight deck. Drag the wheel and the levers.",
      control: { kind: "buttons", label: "Where are we?", buttons: [{ id: "air", label: "Take off", onLabel: "Land", toggle: true }] },
      callouts: [[1, 292, 430, 336, 478], [2, 292, 600, 384, 572], [4, 610, 560, 690, 625], [5, 880, 560, 832, 625]],
      setup(st) {
        const W = 1448, horizon = 228, cx = 721;
        const defs = st.svg.querySelector("defs");
        // the world outside: sky and runway behind the window glass
        const behind = el("svg", { viewBox: `0 0 ${W} 930`, class: "bk-svg" });
        st.fig.insertBefore(behind, st.base);
        behind.innerHTML = `<defs><clipPath id="ck-win"><rect x="60" y="80" width="1330" height="290"/></clipPath></defs>`;
        const outside = el("g", { "clip-path": "url(#ck-win)" }, behind);
        el("rect", { x: 60, y: 80, width: 1330, height: 290, fill: "#a9c6e4" }, outside);
        const world = el("g", {}, outside);
        const k = 1.5, tileW = 2048 * k, tileH = 683 * k;
        const layer = (src, vpY) => {
          const g = el("g", {}, world);
          for (const i of [-1, 0, 1, 2]) el("image", { href: src, x: cx - 512 * k + i * tileW, y: horizon - vpY * k, width: tileW, height: tileH, preserveAspectRatio: "none" }, g);
          return g;
        };
        const ground = layer(A + "sky-runway.webp", 320);
        const sky = layer(A + "sky-air.webp", 341);
        sky.style.opacity = 0;
        // runway centre-line stripes and edge lights, drawn in perspective so they can rush past
        const marks = el("g", {}, ground);
        const stripes = Array.from({ length: 14 }, () => el("polygon", { fill: "#f4f1e8", opacity: .9 }, marks));
        const lights = Array.from({ length: 28 }, () => el("circle", { fill: "#fff6d8" }, marks));
        const F = 4000, eye = 9;                        // screen offset = F / distance; the eye is about 9 m up
        const edge = 4.27;                               // painted runway edge: x offset per y offset

        // the controls, cut from the painted parts sheet
        const art = st.art;
        const yokeAt = [[380, 515], [1110, 512]];
        const yokes = yokeAt.map(([x, y]) => {
          const g = el("g", {}, art);
          el("image", { href: A + "ctl-1.webp", x: -371 * .19, y: -231 * .19, width: 760 * .19, height: 480 * .19 }, g);
          return { g, x, y };
        });
        const slots = [[664, 658], [704.5, 703], [741, 743], [781.5, 788]];
        const levers = slots.map(() => el("image", { href: A + "ctl-3.webp", width: 400 * .095, height: 413 * .095 }, art));
        el("rect", { x: 821, y: 606, width: 12, height: 104, rx: 5, fill: "#1d1f22", stroke: "#8c7a5a", "stroke-width": 2 }, art);
        const detents = ["UP", "1", "5", "10", "20", "25", "30"];
        const detY = i => 614 + i * 14.5;
        const flapMarks = el("g", { class: "ck-detents" }, st.ink);
        el("rect", { x: 841, y: 604, width: 34, height: 110, rx: 4, class: "ck-chip" }, flapMarks);
        detents.forEach((d, i) => { const t = el("text", { x: 858, y: detY(i) + 4.5, "text-anchor": "middle" }, flapMarks); t.textContent = d; });
        const flapLever = el("image", { href: A + "ctl-6.webp", width: 253 * .14, height: 371 * .14 }, art);

        // drag handles (invisible, above everything)
        const handles = el("g", { class: "ck-handles" }, st.ink.parentNode);
        const handle = (label, shape, attrs) => {
          const h = el(shape, { ...attrs, class: "ck-handle", tabindex: 0, role: "slider", "aria-label": label }, handles);
          return h;
        };
        const hYoke = yokeAt.map(([x, y], i) => handle(i ? "First officer's control wheel" : "Captain's control wheel", "circle", { cx: x, cy: y, r: 115 }));
        const hThrust = handle("Thrust levers", "rect", { x: 636, y: 585, width: 170, height: 140, rx: 10 });
        const hFlap = handle("Flap lever", "rect", { x: 806, y: 590, width: 44, height: 130, rx: 8 });

        // the inset: tiller and rudder pedals
        st.inset.innerHTML = `<svg viewBox="0 0 560 300" class="ck-inset">
          <g class="ck-tiller"><image href="${A}ctl-tiller.webp" x="-92" y="-92" width="184" height="184"/></g>
          <g class="ck-pedal" data-side="-1"><image href="${A}ctl-4.webp" x="-55" y="-204" width="110" height="204"/></g>
          <g class="ck-pedal" data-side="1"><image href="${A}ctl-5.webp" x="-55" y="-204" width="110" height="204"/></g>
          <circle class="ck-ihit" cx="130" cy="160" r="105" tabindex="0" role="slider" aria-label="Tiller"/>
          <rect class="ck-ihit" x="288" y="40" width="122" height="250" rx="12" data-side="-1" tabindex="0" role="button" aria-label="Left rudder pedal (hold)"/>
          <rect class="ck-ihit" x="414" y="40" width="122" height="250" rx="12" data-side="1" tabindex="0" role="button" aria-label="Right rudder pedal (hold)"/>
        </svg>`;
        const isvg = st.inset.querySelector("svg");
        const tillerG = isvg.querySelector(".ck-tiller");
        const pedals = [...isvg.querySelectorAll(".ck-pedal")];
        const icall = (n, x, y) => {
          const g = el("g", { class: "bk-callout", "data-step": n }, isvg);
          el("circle", { cx: x, cy: y, r: 21, class: "bk-num-ring" }, g);
          const t = el("text", { x, y: y + 8.5, "text-anchor": "middle", class: "bk-num" }, g); t.textContent = n;
          g.addEventListener("click", () => window.BOOK.step(n));
          return g;
        };
        icall(6, 30, 40); icall(3, 300, 30);

        // the plane seen from above, in the margin
        st.side.innerHTML = `<div class="pv"><div class="pv-card"><img src="${A}plan747.webp" alt="The 747 seen from above"><canvas></canvas>
          <svg viewBox="0 0 1024 1024" class="pv-svg"></svg></div><p class="pv-cap">The plane from above</p></div>`;
        const card = st.side.querySelector(".pv-card"), pv = st.side.querySelector(".pv-svg");
        const pc = st.side.querySelector("canvas"); pc.width = pc.height = 512;
        const pg = pc.getContext("2d"); pg.setTransform(.5, 0, 0, .5, 0, 0);
        const mir = pts => pts.map(([x, y]) => [1025 - x, y]);
        const P = pts => pts.map(p => p.join(",")).join(" ");
        const surf = (pts, cls) => el("polygon", { points: P(pts), class: "pv-surf " + cls }, pv);
        const flapPts = [[[318, 515], [440, 505], [440, 532], [318, 560]], [[170, 572], [297, 528], [297, 550], [170, 600]]];
        const flaps = [...flapPts, ...flapPts.map(mir)].map(p => surf(p, "flap"));
        const ailL = [[[40, 628], [165, 590], [167, 604], [42, 640]], [[297, 532], [318, 526], [318, 558], [297, 562]]];
        const ailerons = { L: ailL.map(p => surf(p, "ail")), R: ailL.map(mir).map(p => surf(p, "ail")) };
        const elevL = [[280, 898], [490, 868], [490, 882], [280, 912]];
        const elevators = [surf(elevL, "elev"), surf(mir(elevL), "elev")];
        const rudder = el("line", { x1: 512.5, y1: 862, x2: 512.5, y2: 944, class: "pv-rudder" }, pv);
        const wheel = el("g", { class: "pv-wheel" }, pv);
        el("rect", { x: 497, y: 150, width: 31, height: 44, rx: 8, class: "pv-xray" }, wheel);
        const wheelTurn = el("g", {}, wheel);
        for (const dx of [-11, 11]) el("rect", { x: 512.5 + dx - 5, y: 158, width: 10, height: 28, rx: 4, class: "pv-tyre" }, wheelTurn);
        const pvLabel = (x, y) => { const t = el("text", { x, y, class: "pv-word", "text-anchor": "middle" }, pv); return t; };
        const words = { L: pvLabel(130, 700), R: pvLabel(895, 700), E: pvLabel(512, 1000) };
        const rings = {
          1: [[105, 612, 90, 40], [920, 612, 90, 40]], 2: [[380, 890, 130, 34], [645, 890, 130, 34]], 3: [[512, 905, 40, 60]],
          4: [[240, 470, 110, 90], [785, 470, 110, 90]], 5: [[310, 540, 160, 60], [715, 540, 160, 60]], 6: [[512, 172, 50, 50]]
        };
        const ringG = el("g", {}, pv);
        const plumes = [[175, 512], [308, 428], [850, 512], [717, 428]].map(([x, y]) => new st.Flow([[x, y], [x, y + 80], [x, y + 260]], {
          colors: ramp([[0, "#e9a050"], [.35, "#d9895a"], [.7, "#b9a9a0"]]), size: 30, count: 18, speed: 260, jitter: 9, fadeIn: .02, fadeOut: .5, alpha: .8
        }));

        // ---- state ----
        const c = { roll: 0, pitch: 0, rudder: 0, thrust: .05, flap: 0, tiller: 0 };     // what the controls are set to
        const v = { roll: 0, pitch: 0, rudder: 0, thrust: .05, flap: 0, tiller: 0 };     // what the parts are doing (they lag a little)
        let air = false, bank = 0, att = 0, heading = 0, speed = 3, dist = 0, airMix = 0, demo = null, hold = null, lastMsg = "", stepN = 0;
        const flapDetent = () => Math.round(c.flap * 6);
        const say = m => { if (m !== lastMsg) { lastMsg = m; st.status(m); } };

        // ---- dragging ----
        const toDiagram = (svgEl, e, w, h) => { const r = svgEl.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * w, (e.clientY - r.top) / r.height * h]; };
        const top = st.ink.ownerSVGElement;
        const drag = (target, svgEl, w, h, onMove, onEnd) => {
          target.addEventListener("pointerdown", e => {
            e.preventDefault(); demo = null; release(); target.setPointerCapture(e.pointerId);
            const start = toDiagram(svgEl, e, w, h), base = { ...c };
            const move = ev => onMove(toDiagram(svgEl, ev, w, h), start, base);
            const up = () => { target.removeEventListener("pointermove", move); target.removeEventListener("pointerup", up); target.removeEventListener("pointercancel", up); onEnd && onEnd(); };
            target.addEventListener("pointermove", move); target.addEventListener("pointerup", up); target.addEventListener("pointercancel", up);
          });
        };
        const clamp = (x, a = -1, b = 1) => Math.max(a, Math.min(b, x));
        // grabbing a control yourself clears the step spotlight, so you can see the whole cockpit
        const release = () => {
          if (!stepN) return;
          demo = null;
          stepN = 0; st.spot(null); ringG.replaceChildren();
          tillerG.classList.remove("lit"); pedals.forEach(p => p.classList.remove("lit"));
          document.querySelectorAll("#bk-steps button.on, .bk-callout.on").forEach(x => x.classList.remove("on"));
        };
        for (const h of hYoke) {
          drag(h, top, W, 930, ([x, y], [x0, y0], b) => { c.roll = clamp(b.roll + (x - x0) / 120); c.pitch = clamp(b.pitch - (y - y0) / 60); },
            () => { c.roll = 0; c.pitch = 0; });          // let go and the wheel returns to the middle
          h.addEventListener("keydown", e => {
            const d = { ArrowLeft: ["roll", -.25], ArrowRight: ["roll", .25], ArrowUp: ["pitch", .25], ArrowDown: ["pitch", -.25] }[e.key];
            if (d) { e.preventDefault(); e.stopPropagation(); demo = null; c[d[0]] = clamp(c[d[0]] + d[1]); }
            if (e.key === "Home" || e.key === " ") { e.preventDefault(); c.roll = c.pitch = 0; }
          });
        }
        drag(hThrust, top, W, 930, ([, y], [, y0], b) => { c.thrust = clamp(b.thrust - (y - y0) / 90, 0, 1); });
        drag(hFlap, top, W, 930, ([, y]) => { c.flap = clamp(Math.round((y - 614) / 14.5) / 6, 0, 1); });
        const keyStep = (h, key, step, lo, hi) => h.addEventListener("keydown", e => {
          const d = { ArrowUp: step, ArrowRight: -step, ArrowDown: -step, ArrowLeft: step }[e.key];
          if (d != null) { e.preventDefault(); e.stopPropagation(); demo = null; c[key] = clamp(c[key] + (key === "flap" ? -d : d), lo, hi); }
        });
        keyStep(hThrust, "thrust", .1, 0, 1); keyStep(hFlap, "flap", 1 / 6, 0, 1);
        const [iTiller, iPedL, iPedR] = isvg.querySelectorAll(".ck-ihit");
        drag(iTiller, isvg, 560, 300, ([x, y]) => { const a = Math.atan2(y - 160, x - 130) + Math.PI / 2; c.tiller = clamp(Math.atan2(Math.sin(a), Math.cos(a)) / 1.2); },
          () => { c.tiller = 0; });                       // the tiller springs back to the middle
        iTiller.addEventListener("keydown", e => {
          const d = { ArrowLeft: -.25, ArrowRight: .25 }[e.key];
          if (d) { e.preventDefault(); e.stopPropagation(); demo = null; c.tiller = clamp(c.tiller + d); }
        });
        for (const p of [iPedL, iPedR]) {
          const side = +p.dataset.side;
          const press = e => { e.preventDefault(); demo = null; release(); c.rudder = side; hold = p; };
          const release = () => { if (hold === p) { c.rudder = 0; hold = null; } };
          p.addEventListener("pointerdown", press); p.addEventListener("pointerup", release); p.addEventListener("pointerleave", release); p.addEventListener("pointercancel", release);
          p.addEventListener("keydown", e => { if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.stopPropagation(); press(e); } });
          p.addEventListener("keyup", e => { if (e.key === " " || e.key === "Enter") release(); });
        }

        // ---- step spotlights and demos ----
        const cockpitSpots = {
          1: [{ cx: 380, cy: 512, rx: 105, ry: 80 }, { cx: 1110, cy: 512, rx: 105, ry: 80 }],
          2: [{ cx: 380, cy: 530, rx: 95, ry: 95 }, { cx: 1110, cy: 530, rx: 95, ry: 95 }],
          3: [{ cx: 721, cy: 900, rx: 10, ry: 10 }],
          4: [{ cx: 722, cy: 655, rx: 100, ry: 80 }],
          5: [{ cx: 840, cy: 655, rx: 50, ry: 75 }],
          6: [{ cx: 10, cy: 900, rx: 10, ry: 10 }]
        };
        return {
          control(ctl) {
            if ("air" in ctl) {
              air = ctl.air; heading = 0;
              say(air ? "We are flying! The wheels are folded away, so the tiller does nothing now." : "Back on the runway. Now the tiller steers the nose wheel.");
            }
          },
          step(n) {
            if (!n) { release(); return; }
            stepN = n;
            st.spot(cockpitSpots[n]);
            ringG.replaceChildren(...(rings[n] || []).map(([x, y, rx, ry]) => el("ellipse", { cx: x, cy: y, rx, ry, class: "pv-ring" })));
            tillerG.classList.toggle("lit", n === 6); pedals.forEach(p => p.classList.toggle("lit", n === 3));
            isvg.querySelectorAll(".bk-callout").forEach(g => g.classList.toggle("on", +g.dataset.step === n));
            demo = { n, t: 0, from: { ...c } };
          },
          tick(dt, t) {
            // demos move one control by itself, the way a teacher would show it
            if (demo) {
              demo.t += dt; const u = demo.t, wave = Math.sin(u * 2.2) * Math.min(1, u * 2) * Math.max(0, Math.min(1, (3.6 - u)));
              if (demo.n === 1) c.roll = wave * .9;
              if (demo.n === 2) c.pitch = wave * .8;
              if (demo.n === 3) c.rudder = Math.sign(wave) * (Math.abs(wave) > .25 ? 1 : 0);
              if (demo.n === 4) c.thrust = demo.from.thrust + (.85 - demo.from.thrust) * Math.max(0, Math.sin(Math.min(u, 3.6) / 3.6 * Math.PI));
              if (demo.n === 5) c.flap = Math.min(4, Math.floor(u * 1.4)) / 6;
              if (demo.n === 6) c.tiller = wave * .9;
              if (u > 3.7) { if (demo.n !== 5) Object.assign(c, { roll: 0, pitch: 0, rudder: hold ? c.rudder : 0, tiller: 0 }); demo = null; }
            }
            for (const key in v) v[key] = approach(v[key], c[key], key === "thrust" ? 1.2 : key === "flap" ? 1.5 : 9, dt);

            // controls in the painting: both wheels move together
            yokes.forEach(y => y.g.setAttribute("transform", `translate(${y.x} ${y.y - v.pitch * 16}) scale(${1 - v.pitch * .07}) rotate(${v.roll * 70})`));
            levers.forEach((l, i) => {
              const [xa, xb] = slots[i], yy = 700 - c.thrust * 0 - v.thrust * 88, xx = xa + (xb - xa) * (yy - 620) / 80;
              l.setAttribute("x", xx - 190 * .095); l.setAttribute("y", yy - 413 * .095 + 6);
            });
            const fy = detY(0) + v.flap * 6 * 14.5;
            flapLever.setAttribute("x", 827 - 115 * .14); flapLever.setAttribute("y", fy - 371 * .14 + 8);
            flapMarks.querySelectorAll("text").forEach((tx, i) => tx.classList.toggle("on", i === flapDetent()));
            tillerG.setAttribute("transform", `translate(130 160) rotate(${v.tiller * 70})`);
            pedals.forEach(p => { const s = +p.dataset.side, push = v.rudder * s; p.setAttribute("transform", `translate(${412 + s * 63} ${282 - push * 16}) scale(${1 - push * .05})`); });
            for (const h of [...hYoke, hThrust, hFlap, iTiller]) h.setAttribute("aria-valuetext",
              h === hThrust ? `${Math.round(c.thrust * 100)} percent thrust` : h === hFlap ? `Flaps ${detents[flapDetent()]}` : h === iTiller ? `Nose wheel ${Math.round(v.tiller * 70)} degrees` : `Turned ${Math.round(c.roll * 100)}, pushed ${Math.round(c.pitch * 100)}`);

            // the plane responds
            airMix = approach(airMix, air ? 1 : 0, 2.2, dt);
            sky.style.opacity = airMix.toFixed(3); ground.style.opacity = (1 - airMix).toFixed(3);
            const steer = air ? 0 : v.tiller * 70 + v.rudder * 7;                       // degrees at the nose wheel
            const targetSpeed = air ? 250 : 2 + 60 * v.thrust;
            speed = approach(speed, targetSpeed, air ? 1 : .35, dt);
            if (air) {
              bank = approach(bank, v.roll * 30, 1.4, dt);
              att = approach(att, v.pitch * -9 + 2.5, 1.4, dt);
              heading += (Math.tan(bank * Math.PI / 180) * 9.8 / speed * 57.3 * 6 + v.rudder * 3) * dt;
            } else {
              bank = approach(bank, 0, 3, dt); att = approach(att, 0, 3, dt);
              heading += speed * Math.tan(steer * Math.PI / 180) / 25.6 * 57.3 * .35 * dt;   // 25.6 m from nose wheel to main wheels
              heading = clamp(heading, -24, 24);
            }
            const shift = ((heading * 22) % tileW + tileW) % tileW;
            world.setAttribute("transform", `rotate(${(-bank).toFixed(2)} ${cx} ${horizon}) translate(${(-shift).toFixed(1)} ${(att * 9).toFixed(1)})`);
            if (!air || airMix < 1) {
              dist = (dist + speed * dt) % 50;                                            // 30 m stripe, 20 m gap
              stripes.forEach((s, i) => {
                const d0 = 12 + i * 50 - dist, d1 = d0 + 30;
                if (d0 < 6) { s.setAttribute("points", ""); return; }
                const y0 = horizon + F / d0, y1 = horizon + F / d1, w0 = 1.1 * F / eye / d0, w1 = 1.1 * F / eye / d1;
                s.setAttribute("points", `${cx - w0},${y0} ${cx + w0},${y0} ${cx + w1},${y1} ${cx - w1},${y1}`);
              });
              lights.forEach((l, i) => {
                const side = i % 2 ? 1 : -1, d = 8 + (Math.floor(i / 2) * 60 - dist * 1.2 % 60 + 840) % 840, dy = F / d;
                l.setAttribute("cx", cx + side * dy * edge); l.setAttribute("cy", horizon + dy); l.setAttribute("r", Math.min(9, 60 / d * 3));
              });
            }

            Object.assign(st.sig, { thr: v.thrust, speed, air: airMix, dist, bank, roll: v.roll });
            // the plane from above
            card.style.transform = `rotateX(${(att * 1.8).toFixed(2)}deg) rotateY(${(bank * .9).toFixed(2)}deg) rotateZ(${(v.rudder * 4 + (air ? 0 : steer * .05)).toFixed(2)}deg)`;
            const wash = (els, d) => els.forEach(e => { e.style.fill = d > 0 ? "#3f78c0" : "#d0562a"; e.style.opacity = Math.min(.85, Math.abs(d) * .9).toFixed(3); });
            wash(ailerons.L, -v.roll); wash(ailerons.R, v.roll);                        // turning right: right aileron up, left down
            wash(elevators, -v.pitch);                                                   // pushing: elevators down
            words.L.textContent = Math.abs(v.roll) > .2 ? (v.roll > 0 ? "down" : "up") : "";
            words.R.textContent = Math.abs(v.roll) > .2 ? (v.roll > 0 ? "up" : "down") : "";
            words.E.textContent = Math.abs(v.pitch) > .2 ? (v.pitch > 0 ? "down" : "up") : "";
            flaps.forEach(f => { f.setAttribute("transform", `translate(0 ${(v.flap * 30).toFixed(1)})`); f.style.opacity = (.15 + v.flap * .8).toFixed(3); });
            rudder.setAttribute("transform", `rotate(${(-v.rudder * 22).toFixed(1)} 512.5 862)`);
            rudder.classList.toggle("moved", Math.abs(v.rudder) > .1);
            wheel.style.opacity = (1 - airMix).toFixed(3);
            wheelTurn.setAttribute("transform", `rotate(${steer.toFixed(1)} 512.5 172)`);
            pg.save(); pg.setTransform(1, 0, 0, 1, 0, 0); pg.clearRect(0, 0, 512, 512); pg.restore();
            pg.globalCompositeOperation = "multiply";
            for (const f of plumes) { f.rate = .3 + v.thrust; f.density = .1 + .9 * v.thrust; f.tick(dt); f.draw(pg); }
            pg.globalCompositeOperation = "source-over";

            // tell what is happening, in words
            if (!demo || demo.t > .5) {
              const fl = flapDetent();
              if (Math.abs(v.roll) > .3) say(`The ${v.roll < 0 ? "left" : "right"} aileron is up, so the ${v.roll < 0 ? "left" : "right"} wing dips${air ? " and the plane turns." : ". On the ground the wheels keep the plane level."}`);
              else if (Math.abs(v.pitch) > .3) say(v.pitch > 0 ? `Elevators down: the nose ${air ? "drops" : "would drop in the air"}.` : `Elevators up: the nose ${air ? "rises" : "would rise in the air"}.`);
              else if (Math.abs(v.rudder) > .5) say(`Rudder ${v.rudder < 0 ? "left" : "right"}: the nose swings ${v.rudder < 0 ? "left" : "right"}.`);
              else if (Math.abs(v.tiller) > .2) say(air ? "In the air the nose wheel is folded away, so the tiller does nothing." : `The nose wheel turns ${v.tiller < 0 ? "left" : "right"} and the plane steers ${v.tiller < 0 ? "left" : "right"}.`);
              else if (c.thrust > .6) say(air ? "Full power: all four engines roar." : "Full power: the plane rolls faster and faster down the runway.");
              else if (fl > 0 && Math.abs(v.flap - c.flap) < .02) say(`Flaps ${detents[fl]}: ${fl >= 5 ? "the wing is as big as it gets, for landing." : fl >= 3 ? "ready for take-off." : "the flaps peek out of the wing."}`);
            }
          }
        };
      }
    },
    // ------------------------------------------------------------------ jet engine
    engine: {
      title: "The jet engine",
      folio: 24,
      art: { src: A + "engine.webp", w: 1536, h: 1024, alt: "Painted side section of a jet engine: fan, compressor, combustion chamber, turbine and exhaust." },
      intro: "A jet engine never stops doing four things, one after another, thousands of times a minute. Engineers remember them as suck, squeeze, bang, blow.",
      steps: [
        { name: "Suck.", text: "The big fan at the front pulls in a huge gulp of air. Most of it is blown straight back, around the outside of the engine." },
        { name: "Squeeze.", text: "A smaller part of the air goes into the middle, the core. Row after row of small spinning blades squeeze it tighter and tighter, and it gets hot." },
        { name: "Bang.", text: "Fuel is sprayed into the squeezed air and burns in a steady flame. The gas gets very hot and needs much more room." },
        { name: "Blow.", text: "The hot gas rushes out of the back. On its way it spins the turbine, and a long shaft from the turbine turns the fan and the squeezing blades at the front." }
      ],
      know: "Throwing air backward pushes the engine forward, like a balloon that zooms away when you let it go. About five times more air goes around the core than through it, and that cool air gives most of the push.",
      inset: { caption: "Seen from the front, the fan is a wheel of wide, twisted blades." },
      caption: "A jet engine cut in half, nose on the left. Blue is cool air, orange is hot gas.",
      control: { label: "Thrust lever", min: "Idle", max: "Take-off", value: 35,
        text: v => v < .08 ? "Idling at the gate: the fan turns slowly." : v < .5 ? "Taxiing: more fuel, a bigger flame, a faster fan." : v < .85 ? "Climbing: the engine roars." : "Take-off power: each engine pushes about as hard as 20 cars weigh." },
      callouts: [[1, 255, 64, 255, 182], [2, 615, 64, 615, 400], [3, 895, 64, 895, 388], [4, 1330, 64, 1330, 395]],
      setup(st) {
        const axis = 495;
        // cool bypass air: through the fan, along the blue duct, out over the core cowl
        const bypass = [[-40, 262], [150, 262], [260, 262], [340, 265], [600, 270], [850, 262], [930, 236], [1150, 244], [1360, 290], [1580, 316]];
        // core air: squeezed, burned, then out past the exhaust cone
        const core = [[-40, 450], [150, 450], [300, 440], [400, 428], [560, 425], [770, 435], [860, 425], [990, 415], [1150, 392], [1300, 382], [1440, 420], [1580, 452]];
        const cool = ramp([[0, "#6f9bd0"], [.5, "#7aa5d8"], [.8, "#8ab0dc"]]);
        const hot = ramp([[0, "#5b8cc4"], [.3, "#7f8cbc"], [.46, "#a48fa8"], [.53, "#e2ae3a"], [.6, "#e8892f"], [.72, "#d8652c"], [.86, "#c27352"], [.95, "#b9917a"]], 40);
        const flows = [
          new st.Flow(bypass, { colors: cool, size: 34, count: 70, speed: 300, jitter: 32, alpha: .55 }),
          new st.Flow(mirrorY(bypass, axis), { colors: cool, size: 34, count: 70, speed: 300, jitter: 32, alpha: .55 }),
          new st.Flow(core, { colors: hot, size: 26, count: 52, speed: 230, jitter: 14 }),
          new st.Flow(mirrorY(core, axis), { colors: hot, size: 26, count: 52, speed: 230, jitter: 14 })
        ];

        const g = el("g", {}, st.art);
        const defs = st.svg.querySelector("defs");
        defs.insertAdjacentHTML("beforeend", `
          <radialGradient id="en-fire"><stop offset="0" stop-color="#fff1b8" stop-opacity=".95"/><stop offset=".35" stop-color="#f6b443" stop-opacity=".8"/><stop offset=".7" stop-color="#e2672a" stop-opacity=".45"/><stop offset="1" stop-color="#d4502a" stop-opacity="0"/></radialGradient>
          <filter id="en-boil" x="-30%" y="-40%" width="160%" height="180%"><feTurbulence id="en-turb" type="fractalNoise" baseFrequency=".025 .05" numOctaves="2" seed="1"/><feDisplacementMap in="SourceGraphic" scale="12"/><feGaussianBlur stdDeviation="4"/></filter>
          <pattern id="en-glint" width="40" height="44" patternUnits="userSpaceOnUse"><rect width="40" height="44" fill="none"/><rect y="0" width="40" height="7" fill="#fff" opacity=".55"/><rect y="22" width="40" height="5" fill="#000" opacity=".18"/></pattern>
          <clipPath id="en-rotors">
            <polygon points="192,186 328,192 328,798 192,804"/>
            <polygon points="395,408 775,420 775,572 395,584"/>
            <polygon points="1002,372 1250,342 1250,648 1002,618"/>
          </clipPath>`);
        // spinning blades read as glints running across them
        const glints = el("rect", { x: 180, y: 170, width: 1080, height: 650, fill: "url(#en-glint)", "clip-path": "url(#en-rotors)", class: "en-glint" }, g);
        const glintPat = defs.querySelector("#en-glint");
        // the flame: a warm glow and two boiling tongues of fire in the ring-shaped chamber
        const fire = el("g", { class: "en-fire" }, g);
        const glow = el("ellipse", { cx: 900, cy: axis, rx: 100, ry: 132, fill: "url(#en-fire)" }, fire);
        const tongues = el("g", { filter: "url(#en-boil)" }, fire);
        for (const y of [425, 565]) {
          el("path", { d: `M842,${y - 16} C880,${y - 30} 930,${y - 22} 990,${y} C930,${y + 22} 880,${y + 30} 842,${y + 16} Z`, fill: "#f08a2c", opacity: .75 }, tongues);
          el("path", { d: `M850,${y - 8} C885,${y - 14} 915,${y - 10} 955,${y} C915,${y + 10} 885,${y + 14} 850,${y + 8} Z`, fill: "#ffd76a", opacity: .9 }, tongues);
        }
        const turb = defs.querySelector("#en-turb");

        // labels written on the page, like a hand-lettered plate
        const label = (x, y, text, anchor = "start") => { const t = el("text", { x, y, class: "bk-hand", "text-anchor": anchor }, st.ink); t.textContent = text; return t; };
        label(960, 205, "cool air flows around");
        label(1150, 800, "hot gas rushes out");
        el("path", { d: "M1300,790 C1380,760 1430,640 1440,520", class: "bk-thin", filter: "url(#bk-ink)" }, st.ink);
        // the push: an ink arrow under the engine that grows with the thrust lever
        const pushG = el("g", { filter: "url(#bk-ink)" }, st.ink);
        const pushHalo = el("path", { class: "bk-push-halo" }, pushG);
        const push = el("path", { class: "bk-push" }, pushG);
        const pushText = label(0, 0, "push", "middle");
        pushText.classList.add("bk-hand-big");
        const drawPush = v => {
          const x1 = 1060, x0 = x1 - (150 + 560 * v), y = 925;
          const d = `M${x1},${y} L${x0},${y} M${x0 + 34},${y - 22} L${x0},${y} L${x0 + 34},${y + 22}`;
          push.setAttribute("d", d); pushHalo.setAttribute("d", d);
          pushText.setAttribute("x", (x0 + x1) / 2); pushText.setAttribute("y", y - 24);
        };

        // the front-view fan in the margin
        st.inset.innerHTML = `<div class="en-fan"><img src="${A}fan-disc.webp" alt="" class="en-disc"><img src="${A}fan-blur.webp" alt="" class="en-blur"><img src="${A}fan-ring.webp" alt="" class="en-ring"></div>`;
        const disc = st.inset.querySelector(".en-disc"), blur = st.inset.querySelector(".en-blur");

        // step arrows
        const arrows = {
          1: [st.arrow("M10,330 C70,326 120,322 182,320"), st.arrow("M10,660 C70,664 120,668 182,670")],
          2: [st.arrow("M470,470 C560,466 670,462 770,460")],
          3: [st.arrow("M905,260 C905,300 892,340 876,392", { color: "#9c3b1c" })],
          4: [st.arrow("M1290,440 C1380,448 1460,470 1540,482", { color: "#9c3b1c" }), st.arrow("M1160,500 C900,505 600,505 345,500", { width: 3, head: 13 })]
        };
        const fuelLabel = label(890, 270, "fuel", "end");
        const shaftLabel = label(560, 530, "the shaft turns the fan");
        fuelLabel.style.opacity = 0; shaftLabel.style.opacity = 0;
        const spots = {
          1: [{ cx: 255, cy: axis, rx: 125, ry: 335 }],
          2: [{ cx: 610, cy: axis, rx: 190, ry: 130 }],
          3: [{ cx: 898, cy: axis, rx: 100, ry: 140 }],
          4: [{ cx: 1300, cy: axis, rx: 270, ry: 200 }]
        };

        let thr = .35, target = .35, angle = 0, glintY = 0, seedT = 0, seed = 1;
        drawPush(thr);
        return {
          control(v) { target = v; },
          step(n) {
            for (const [k, list] of Object.entries(arrows)) for (const a of list) +k === n ? a.draw(900) : a.hide();
            fuelLabel.style.opacity = n === 3 ? 1 : 0;
            shaftLabel.style.opacity = n === 4 ? 1 : 0;
            st.spot(spots[n]);
          },
          tick(dt, t) {
            thr = approach(thr, target, 1.6, dt);                     // engines spool up, they do not jump
            const rate = .12 + .88 * thr;
            for (const f of flows) { f.rate = rate; f.density = .35 + .65 * thr; f.tick(dt); f.draw(st.g); }
            glintY = (glintY + dt * (40 + 900 * thr)) % 44;
            glintPat.setAttribute("patternTransform", `translate(0 ${glintY.toFixed(1)})`);
            glints.style.opacity = .25 + .5 * thr;
            const flick = .85 + .15 * Math.sin(t * 23) * Math.sin(t * 7.3);
            fire.style.opacity = ((.35 + .65 * thr) * flick).toFixed(3);
            glow.setAttribute("rx", 70 + 40 * thr); glow.setAttribute("ry", 100 + 40 * thr);
            seedT += dt;
            if (seedT > .09) { seedT = 0; seed = seed % 40 + 1; turb.setAttribute("seed", seed); }   // boiling flame, like hand-drawn frames
            angle = (angle + dt * (30 + 1500 * thr)) % 360;
            disc.style.transform = `rotate(${angle.toFixed(2)}deg)`;
            blur.style.transform = disc.style.transform;
            blur.style.opacity = Math.min(1, Math.max(0, (thr - .25) * 2.2)).toFixed(3);
            drawPush(thr);
            st.sig.thr = thr;
          }
        };
      }
    },

    // ------------------------------------------------------------------ galley oven
    oven: {
      title: "The galley oven",
      folio: 38,
      art: { src: A + "oven.webp", w: 1536, h: 1024, alt: "Painted front view of an airliner galley oven with its door off: shelves of covered meals on both sides of a round fan." },
      intro: "An airliner oven does not cook food from raw. It warms up meals that were cooked in a kitchen on the ground, using hot air that never stops moving.",
      steps: [
        { name: "Heat.", text: "A ring of wire around the fan gets hot and starts to glow, like the wire in a toaster." },
        { name: "Blow.", text: "The fan at the back spins. It pulls air in at the middle and throws it out through the hot wire." },
        { name: "Warm.", text: "The hot air flows over every shelf and wraps around the dishes. Heat moves from the hot air into the cold food." },
        { name: "Again.", text: "The air, now a little cooler, is pulled back into the middle of the fan and heated again. Round and round it goes." }
      ],
      know: "Moving air carries heat much faster than still air. That is why a windy day feels colder than a calm one, and why a fan oven warms food quickly and evenly.",
      caption: "A galley oven with its door taken off. Orange is hot air on its way round.",
      control: { label: "Oven dial", min: "Off", max: "Hot", value: 0,
        text: v => v < .06 ? "The oven is off." : v < .55 ? "Warm: the wire glows a little and the fan turns." : "Hot: the wire glows red and the fan spins fast." },
      callouts: [[1, 600, 50, 596, 330], [2, 768, 50, 768, 455], [3, 300, 50, 300, 300], [4, 940, 50, 885, 600]],
      setup(st) {
        const cx = 768, cy = 515;
        const upper = [[735, 470], [640, 380], [520, 300], [470, 292], [300, 290], [150, 296], [118, 350], [150, 415], [300, 420], [480, 420], [600, 455], [715, 490]];
        const lower = [[735, 560], [640, 640], [520, 700], [300, 702], [150, 698], [118, 640], [150, 575], [300, 565], [480, 565], [600, 545], [715, 530]];
        const hotAir = ramp([[0, "#d4582a"], [.2, "#dc6d2e"], [.4, "#e3893a"], [.6, "#e9a24f"], [.8, "#eebb6e"]]);
        const flows = [upper, lower, mirrorX(upper, cx), mirrorX(lower, cx)].map(p => new st.Flow(p, { colors: hotAir, size: 22, count: 34, speed: 170, jitter: 12, fadeIn: .05, fadeOut: .08 }));

        const defs = st.svg.querySelector("defs");
        defs.insertAdjacentHTML("beforeend", `
          <filter id="ov-glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="9"/></filter>
          <filter id="ov-blur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5"/></filter>
          <clipPath id="ov-fanclip"><circle cx="${cx}" cy="${cy}" r="146"/></clipPath>`);
        const g = el("g", {}, st.art);
        // the heating ring: a soft red glow and red-hot wires
        const coil = el("g", { class: "ov-coil" }, g);
        el("circle", { cx, cy, r: 208, fill: "none", stroke: "#e4501c", "stroke-width": 30, filter: "url(#ov-glow)" }, coil);
        el("circle", { cx, cy, r: 199, fill: "none", stroke: "#d2381a", "stroke-width": 4.5 }, coil);
        el("circle", { cx, cy, r: 214, fill: "none", stroke: "#d2381a", "stroke-width": 4.5 }, coil);
        // fan blades whirring behind the wire guard
        const fan = el("g", { "clip-path": "url(#ov-fanclip)", class: "ov-fan" }, g);
        const blades = el("g", { filter: "url(#ov-blur)" }, fan);
        for (let i = 0; i < 6; i++) el("path", { d: `M${cx},${cy} L${cx + 150},${cy - 46} A156,156 0 0 1 ${cx + 146},${cy + 52} Z`, fill: "#1d1f22", opacity: .5, transform: `rotate(${i * 60} ${cx} ${cy})` }, blades);
        // the meals warm up: a blush on each dish, then little curls of steam
        const dishes = [[148, 300, 325, 82], [148, 448, 325, 82], [148, 588, 325, 92], [1063, 300, 325, 82], [1063, 448, 325, 82], [1063, 588, 325, 92]];
        const blush = el("g", { class: "ov-blush" }, g);
        for (const [x, y, w, h] of dishes) el("rect", { x, y, width: w, height: h, rx: 14, fill: "#e98a3c" }, blush);
        const steam = el("g", { class: "ov-steam", filter: "url(#bk-ink)" }, st.ink);
        for (const [x, y, w] of dishes) for (const dx of [.3, .7]) {
          const sx = x + w * dx;
          el("path", { d: `M${sx},${y - 4} c-14,-14 14,-22 0,-36 c-14,-14 14,-22 0,-34`, class: "ov-curl" }, steam);
        }

        const arrows = {
          2: [0, 90, 180, 270].map(a => {
            const r0 = 120, r1 = 250, rad = (a - 30) * Math.PI / 180, x0 = cx + r0 * Math.cos(rad), y0 = cy + r0 * Math.sin(rad), x1 = cx + r1 * Math.cos(rad), y1 = cy + r1 * Math.sin(rad);
            return st.arrow(`M${x0},${y0} L${x1},${y1}`, { color: "#9c3b1c" });
          }),
          3: [st.arrow("M470,286 C380,282 260,282 150,286", { color: "#9c3b1c" }), st.arrow("M1066,286 C1156,282 1276,282 1386,286", { color: "#9c3b1c" })],
          4: [st.arrow("M150,420 C300,424 480,424 690,500"), st.arrow("M1386,420 C1236,424 1056,424 846,500"), st.arrow("M150,570 C300,566 480,566 690,530"), st.arrow("M1386,570 C1236,566 1056,566 846,530")]
        };
        const spots = {
          1: [{ cx, cy, rx: 240, ry: 240 }],
          2: [{ cx, cy, rx: 165, ry: 165 }],
          3: [{ cx: 310, cy: 490, rx: 215, ry: 240 }, { cx: 1226, cy: 490, rx: 215, ry: 240 }],
          4: [{ cx, cy: 500, rx: 690, ry: 300 }]
        };
        let dial = 0, heat = 0, speed = 0, angle = 0, food = 0, lastSay = "";
        return {
          control(v) { dial = v; },
          step(n) {
            if (n && dial < .06) st.setControl(.9);               // show the steps with the oven on
            for (const [k, list] of Object.entries(arrows)) for (const a of list) +k === n ? a.draw(800) : a.hide();
            st.spot(spots[n]);
          },
          tick(dt, t) {
            heat = approach(heat, dial, .55, dt);                  // the wire takes a few seconds to heat up
            speed = approach(speed, dial > .06 ? .4 + .6 * dial : 0, 1.8, dt);
            coil.style.opacity = Math.max(0, (heat - .05) * 1.15).toFixed(3);
            angle = (angle + dt * 900 * speed) % 360;
            blades.setAttribute("transform", `rotate(${angle.toFixed(1)} ${cx} ${cy})`);
            fan.style.opacity = Math.min(.9, speed * 1.4).toFixed(3);
            for (const f of flows) { f.rate = .2 + speed; f.density = Math.min(1, speed * 1.3) * Math.min(1, heat * 2 + .2); f.tick(dt); f.draw(st.g); }
            food = Math.min(1, Math.max(0, food + dt * (heat * speed * .07 - .012)));
            blush.style.opacity = (food * .3).toFixed(3);
            steam.style.opacity = Math.max(0, (food - .7) * 3.3).toFixed(3);
            steam.style.transform = `translateY(${(-6 * Math.sin(t * 1.7)).toFixed(1)}px)`;
            st.sig.fan = speed; st.sig.heat = heat;
            const say = food < .05 ? "The meals are cold." : food < .7 ? "The meals are warming up." : "The meals are hot and ready to serve.";
            if (say !== lastSay) { lastSay = say; st.status(say); }
          }
        };
      }
    },

    // ------------------------------------------------------------------ belt loader
    belt: {
      title: "The belt loader",
      folio: 52,
      art: { src: A + "belt.webp", w: 1536, h: 1024, alt: "Painted side view of a conveyor belt loader truck with its ramp leading up to the cargo door of an airliner." },
      intro: "A belt loader is a moving ramp on wheels. It carries every bag from the ground up into the plane's hold, and down again after landing.",
      steps: [
        { name: "Motor.", text: "An electric motor turns the big roller at the bottom of the ramp." },
        { name: "Loop.", text: "The belt is one long loop of rubber. The top runs up the ramp, the bottom comes back down underneath, over and over." },
        { name: "Grip.", text: "The rubber is rough and has little ridges, so bags cannot slide back down, even on a steep slope." },
        { name: "Lift.", text: "A hydraulic arm pushes the ramp up until its top end lines up with the cargo door." }
      ],
      know: "After landing, the driver flips one switch and the motor turns the other way. The same belt then brings every bag back down.",
      caption: "A belt loader at the plane's cargo door. Press the button to give it a bag.",
      control: { kind: "buttons", label: "Try it", buttons: [{ id: "add", label: "Add a bag" }, { id: "reverse", label: "Unload instead", onLabel: "Load instead", toggle: true }] },
      callouts: [[1, 560, 905, 470, 690], [2, 600, 360, 700, 470], [3, 990, 220, 1030, 318], [4, 1060, 610, 912, 590]],
      setup(st) {
        const x0 = 440, y0 = 573, slope = .4036, ang = Math.atan(slope), top = 1340;
        const L = (top - x0) / Math.cos(ang);
        const pointAt = s => [x0 + s * Math.cos(ang), y0 - s * Math.sin(ang)];
        const deg = -ang * 180 / Math.PI;
        const g = el("g", {}, st.art);
        // ridges on the rubber, moving with the belt
        const ridges = el("g", { class: "bl-ridges" }, g);
        const ridgeEls = Array.from({ length: Math.ceil(L / 34) + 1 }, () => el("line", { x1: 0, y1: 4, x2: 0, y2: 16 }, ridges));
        ridges.setAttribute("transform", `translate(${x0} ${y0}) rotate(${deg})`);
        const pulley = el("image", { href: A + "pulley.webp", x: 372 - 52, y: 680 - 52, width: 104, height: 104 }, g);
        const beacon = el("circle", { cx: 305, cy: 589, r: 26, fill: "url(#bl-beacon)" }, g);
        st.svg.querySelector("defs").insertAdjacentHTML("beforeend", `<radialGradient id="bl-beacon"><stop offset="0" stop-color="#ffd27a" stop-opacity=".95"/><stop offset=".5" stop-color="#f39a2b" stop-opacity=".5"/><stop offset="1" stop-color="#f39a2b" stop-opacity="0"/></radialGradient>`);
        const bagLayer = el("g", {}, g);
        // the six painted bags; upright cases lie down on the belt
        const kinds = [
          { n: 1, w: 283, h: 470, lie: true }, { n: 2, w: 305, h: 469, lie: true }, { n: 3, w: 465, h: 338 },
          { n: 4, w: 244, h: 448, lie: true }, { n: 5, w: 247, h: 479, lie: true }, { n: 6, w: 539, h: 327 }
        ];
        const k = .27;
        const bags = [];
        let next = 0, dir = 1, spawnT = 1.2;
        const addBag = () => {
          const kind = kinds[next++ % kinds.length];
          const w = kind.w * k, h = kind.h * k;
          const len = kind.lie ? h : w, tall = kind.lie ? w : h;
          const gEl = el("g", {}, bagLayer);
          const img = el("image", { href: `${A}bag-${kind.n}.webp`, width: w, height: h }, gEl);
          // lay the image so its bottom edge sits on the belt, centred on its position
          // lying cases are turned a quarter: rotate(-90) maps the image onto x 0..h, y -w..0
          img.setAttribute("transform", kind.lie ? `translate(${-len / 2} 2) rotate(-90)` : `translate(${-len / 2} ${-tall + 2})`);
          bags.push({ g: gEl, s: dir > 0 ? 0 : L, len, drop: dir > 0 ? 1 : 0, life: 0 });
          st.sig.drops = (st.sig.drops || []).concat([kind.n]);
        };
        const arrows = {
          1: [st.arrow("M300,760 C330,800 420,800 446,756", { color: "#9c3b1c" })],
          2: [st.arrow("M560,470 L1150,232", { color: "#9c3b1c" }), st.arrow("M1180,330 L700,524")],
          4: [st.arrow("M840,690 L955,520", { color: "#9c3b1c" })]
        };
        const spots = {
          1: [{ cx: 420, cy: 672, rx: 120, ry: 78 }],
          2: [{ cx: 890, cy: 420, rx: 600, ry: 80, rot: -22 }],
          3: [{ cx: 1000, cy: 330, rx: 180, ry: 90, rot: -22 }],
          4: [{ cx: 890, cy: 600, rx: 90, ry: 150, rot: 35 }]
        };
        let offset = 0, angle = 0, speed = 0;
        return {
          control(c) {
            if (c.add) addBag();
            if ("reverse" in c) dir = c.reverse ? -1 : 1;
          },
          step(n) {
            for (const [kk, list] of Object.entries(arrows)) for (const a of list) +kk === n ? a.draw(900) : a.hide();
            st.spot(spots[n]);
            if (n === 3 && !bags.length) addBag();
          },
          tick(dt, t) {
            speed = approach(speed, dir, 2.5, dt);
            st.sig.belt = speed;
            const v = 150 * speed;
            offset = ((offset + v * dt) % 34 + 34) % 34;
            ridgeEls.forEach((r, i) => { const x = i * 34 + offset; r.setAttribute("x1", x); r.setAttribute("x2", x - 3); r.style.opacity = x > L - 10 ? 0 : 1; });
            angle = (angle + v * dt / 50 * 57.3) % 360;
            pulley.setAttribute("transform", `rotate(${angle.toFixed(1)} 372 680)`);
            beacon.style.opacity = (Math.sin(t * 6) > .2 ? .9 : .15).toFixed(2);
            spawnT -= dt;
            if (spawnT < 0) { addBag(); spawnT = 2.6 + Math.random() * 1.8; }
            for (let i = bags.length - 1; i >= 0; i--) {
              const b = bags[i];
              b.s += v * dt; b.life += dt;
              b.drop = Math.max(0, b.drop - dt * 3.5);
              const [x, y] = pointAt(Math.min(L, Math.max(0, b.s)));
              const fade = Math.min(1, b.s / 40, (L - b.s) / 70, b.life * 3);
              b.g.setAttribute("transform", `translate(${x.toFixed(1)} ${(y - b.drop * b.drop * 60).toFixed(1)}) rotate(${deg.toFixed(2)})`);
              b.g.style.opacity = Math.max(0, fade).toFixed(3);
              if (b.s > L + 5 || b.s < -5) { b.g.remove(); bags.splice(i, 1); }
            }
          }
        };
      }
    },

    // ------------------------------------------------------------------ scissor lift
    scissor: {
      title: "The scissor lift",
      folio: 61,
      art: { src: null, w: 1536, h: 1024, alt: "A catering truck lifting its box on crossed scissor arms." },
      intro: "The catering truck lifts a whole room full of food up to the plane's door, higher than a double-decker bus. The trick is a pair of crossed arms.",
      steps: [
        { name: "Cross.", text: "Two long steel arms cross like an open pair of scissors and are pinned together in the middle." },
        { name: "Slide.", text: "One end of each arm is fixed. The other end rolls along a track on a little wheel." },
        { name: "Push.", text: "A hydraulic ram pushes on the arms. As the rolling ends move closer together, the arms stand up and the box rises." },
        { name: "Steady.", text: "Strong legs press down on the ground at the back, so the truck cannot tip over while the box is up high." }
      ],
      know: "Because the arms are crossed, the box goes straight up and stays level. A single arm would swing it round in a curve, like a crane.",
      caption: "A catering truck. Pull the lever to lift the box.",
      control: { label: "Lift lever", min: "Down", max: "Up", value: 0,
        text: v => { const m = (1.3 + 4.3 * v).toFixed(1); return v > .8 ? `The box floor is ${m} m up, level with a 747 door.` : `The box floor is ${m} m above the ground.`; } },
      callouts: [],
      setup(st) {
        const k = .72;
        const chassis = { x: 100, y: 985 - 416 * k, w: 1449 * k, h: 416 * k };
        const frameTop = chassis.y + (760 - 533) * k;
        const box = { x: chassis.x + (78 - 38) * k, w: 1424 * k, h: 361 * k };
        const g = el("g", {}, st.art);
        el("ellipse", { cx: 640, cy: 990, rx: 660, ry: 14, fill: "#cfc6b4", opacity: .45, filter: "url(#bk-soft)" }, g);
        el("image", { href: A + "scissor-2.webp", x: chassis.x, y: chassis.y, width: chassis.w, height: chassis.h }, g);
        const mech = el("g", { filter: "url(#sc-wash)" }, g);
        st.svg.querySelector("defs").insertAdjacentHTML("beforeend", `
          <filter id="sc-wash" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency=".055 .5" numOctaves="3" seed="7" result="n"/>
            <feColorMatrix in="n" type="matrix" values="0 0 0 0 .35  0 0 0 0 .33  0 0 0 0 .3  0 0 0 .55 0" result="tone"/>
            <feComposite in="tone" in2="SourceGraphic" operator="in" result="mottle"/>
            <feBlend in="mottle" in2="SourceGraphic" mode="multiply" result="painted"/>
            <feTurbulence type="fractalNoise" baseFrequency=".04" numOctaves="2" seed="3" result="w"/>
            <feDisplacementMap in="painted" in2="w" scale="2.5"/>
          </filter>`);
        const L = 640, xF = 360;
        const trackLo = el("rect", { x: xF - 20, y: frameTop - 10, width: L + 60, height: 9, rx: 3, class: "sc-track" }, mech);
        const trackHi = el("rect", { x: xF - 20, width: L + 60, height: 9, rx: 3, class: "sc-track" }, mech);
        const armBack = el("rect", { height: 34, rx: 17, class: "sc-arm back" }, mech);
        const ramRod = el("rect", { height: 14, rx: 7, class: "sc-rod" }, mech);
        const ramCyl = el("rect", { height: 30, rx: 6, class: "sc-ram" }, mech);
        const armFront = el("rect", { height: 34, rx: 17, class: "sc-arm" }, mech);
        const pins = [0, 1, 2, 3, 4].map(() => el("circle", { r: 9, class: "sc-pin" }, mech));
        const wheels = [0, 1].map(() => el("circle", { r: 15, class: "sc-wheel" }, mech));
        const boxImg = el("image", { href: A + "scissor-1.webp", x: box.x, width: box.w, height: box.h }, g);
        const bar = (r, x1, y1, x2, y2, thick) => {
          const len = Math.hypot(x2 - x1, y2 - y1), a = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
          r.setAttribute("x", -thick / 2); r.setAttribute("y", -thick / 2);
          r.setAttribute("width", len + thick);
          r.setAttribute("transform", `translate(${x1} ${y1}) rotate(${a})`);
        };
        // moving numbered callouts: they follow the parts they point at
        const calls = [1, 2, 3, 4].map(n => st.callout(n, 0, 0, null, null, nn => window.BOOK.step(nn)));
        const arrows = { 3: st.arrow("M1240,820 L1240,520", { color: "#9c3b1c" }) };
        let h = 0, target = 0, stepN = 0, geom = null;
        const lift = el("text", { x: 1262, y: 680, class: "bk-hand" }, st.ink);
        lift.textContent = "up!";
        lift.style.opacity = 0;
        return {
          control(v) { target = v; },
          step(n) {
            stepN = n;
            if (n === 3 && h < .3) st.setControl(1);
            arrows[3][n === 3 ? "draw" : "hide"](900);
            lift.style.opacity = n === 3 ? 1 : 0;
          },
          tick(dt) {
            const h0 = h;
            h += Math.max(-.22 * dt, Math.min(.22 * dt, target - h));   // hydraulics are slow and steady
            st.sig.lift = h; st.sig.lifting = Math.abs(h - h0) > 1e-6;
            const boxBottom = lerp(frameTop - 26, 300, h);
            boxImg.setAttribute("y", boxBottom - box.h);
            const yC = frameTop - 14, yB = boxBottom + 12, H = yC - yB;
            const th = Math.asin(Math.min(.99, Math.max(0, H / L)));
            const xS = xF + L * Math.cos(th);
            trackHi.setAttribute("y", boxBottom + 1);
            bar(armBack, xF, yC, xS, yB, 34);
            bar(armFront, xF, yB, xS, yC, 34);
            const mid = [(xF + xS) / 2, (yC + yB) / 2];
            // the ram pushes from the chassis up onto the rising arm, steeper than the arms
            const P = [xF + .62 * L * Math.cos(th), yC - .62 * H];
            const base = [xF + 170, yC - 8];
            const rl = Math.hypot(P[0] - base[0], P[1] - base[1]);
            bar(ramCyl, base[0], base[1], base[0] + (P[0] - base[0]) * 200 / rl, base[1] + (P[1] - base[1]) * 200 / rl, 30);
            bar(ramRod, base[0], base[1], P[0], P[1], 14);
            [[xF, yC], [xF, yB], mid, base, P].forEach((p, i) => { pins[i].setAttribute("cx", p[0]); pins[i].setAttribute("cy", p[1]); });
            wheels[0].setAttribute("cx", xS); wheels[0].setAttribute("cy", yC);
            wheels[1].setAttribute("cx", xS); wheels[1].setAttribute("cy", yB);
            const pos = [[mid[0], mid[1] - 58], [xS + 46, yC - 40], [(base[0] + P[0]) / 2 - 58, (base[1] + P[1]) / 2 - 10], [1180, 905]];
            calls.forEach((c, i) => c.setAttribute("transform", `translate(${pos[i][0].toFixed(1)} ${pos[i][1].toFixed(1)})`));
            const spots = {
              1: [{ cx: mid[0], cy: mid[1], rx: 90, ry: 90 }],
              2: [{ cx: xS, cy: yC, rx: 70, ry: 60 }, { cx: xS, cy: yB, rx: 70, ry: 60 }],
              3: [{ cx: (base[0] + P[0]) / 2, cy: (base[1] + P[1]) / 2, rx: 150, ry: 110 }],
              4: [{ cx: 1070, cy: 930, rx: 70, ry: 80 }]
            };
            st.spot(stepN ? spots[stepN] : null);
          }
        };
      }
    }
  };
  // helpers for subjects/<id>/mechanisms.js, which add their own pages to window.MECHANISMS
  window.MECH_KIT = { el, mirrorX, mirrorY, lerp, approach, ramp };
})();
