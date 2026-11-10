// The garbage truck's "How it works" page: from the bin into the box. The painting is the rear of the
// truck switched off, with an empty hopper and an empty tailgate; the code lifts and tips the bin, and
// draws the packer (slide plate, sweep blade, cylinders) and the oil hoses, so the mechanism is exact at
// every moment. The child drags the bin itself and works the packer with the page's lever.
(({ el, lerp }) => {
  Object.assign(window.MECHANISMS, {
    loading: {
      title: "From the bin into the box",
      folio: 124,
      art: { src: "assets/garbage/book/loading.webp", w: 1671, h: 941, alt: "The back of a garbage truck cut open: the hopper, the tailgate and the big box." },
      intro: "A garbage truck does not just carry rubbish. It lifts the bins, tips them out, and squashes everything, so a whole street of rubbish fits inside.",
      steps: [
        { name: "The bin.", text: "The lifter hooks under the rim of the bin, lifts it up and turns it upside down. The lid falls open." },
        { name: "The hopper.", text: "The rubbish tumbles into the hopper, the low trough at the back." },
        { name: "The blade scoops.", text: "The packer blade swings down behind the rubbish and scoops it out of the hopper." },
        { name: "Into the box.", text: "Then the blade slides up and pushes the rubbish into the big box, squashing it tight against what is already there." }
      ],
      know: "Squashing makes rubbish take up a few times less space. Without it, the truck would be full after just one short street.",
      caption: "Drag the black bin up to tip it, or just tap it. Then push the packer lever all the way to squash the rubbish into the box. The orange in the hoses is the oil that moves the machines.",
      control: { label: "Packer lever", min: "Rest", max: "Squash", value: 0,
        text: v => v < .02 ? "Resting." : v < .2 ? "The blade swings open." : v < .4 ? "The slide plate goes down." : v < .75 ? "The blade scoops." : v < .99 ? "Pushing into the box!" : "Done: back to rest." },
      callouts: [[1, 70, 520, 190, 700], [2, 760, 860, 560, 690], [3, 470, 112, 540, 400], [4, 900, 112, 880, 400]],
      setup(st) {
        const A2 = "assets/garbage/book/";
        const rad = d => d * Math.PI / 180;
        const ease = t => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);
        // ---------------------------------------------------------------- the bin and its lifter
        // The bin sprite is 853 x 1134 (bin-body and bin-lid share the canvas), shown 290 high: a 240-litre bin
        // next to a hopper lip about 1.1 m up. It stands on the ground (y 895) left of the truck. Its front rim (local 217, 28) is what the lifter's comb holds: the lifter raises it
        // to the hopper lip (382, 560) and turns it about the rim by 115 degrees, so the bin stays outside
        // the truck with its mouth pointing down into the hopper. The lid is hinged at local (41, 26).
        const BW = 218, BH = 290, BX = 107, BY = 605, RIM = [217, 28], HINGE = [41, 26], LIFT = [58, -73], TIP = 115;
        const binBody = st.sprite(A2 + "bin-body.webp", BX, BY, BW, BH, st.under);
        const binLid = st.sprite(A2 + "bin-lid.webp", BX, BY, BW, BH, st.under);
        for (const b of [binBody, binLid]) b.style.transformOrigin = "0 0";
        const T = (x, y) => `translate(${(x / BW * 100).toFixed(3)}%, ${(y / BH * 100).toFixed(3)}%)`;
        const R = a => `rotate(${a.toFixed(2)}deg)`;
        const lifterG = el("g", {}, st.art);
        const arm = el("path", { fill: "none", stroke: "#3a3632", "stroke-width": 9, "stroke-linecap": "round", "stroke-linejoin": "round" }, lifterG);
        const armHi = el("path", { fill: "none", stroke: "#a9b0b6", "stroke-width": 5, "stroke-linecap": "round", "stroke-linejoin": "round" }, lifterG);
        const comb = el("path", { fill: "none", stroke: "#4a4640", "stroke-width": 5, "stroke-linecap": "round" }, lifterG);
        // world position of a bin-local point, for lift (dx, dy) and tip angle phi (degrees, clockwise)
        const binPt = ([lx, ly], dx, dy, phi) => {
          const px = BX + RIM[0] + dx, py = BY + RIM[1] + dy, c = Math.cos(rad(phi)), s = Math.sin(rad(phi));
          const ux = lx - RIM[0], uy = ly - RIM[1];
          return [px + ux * c - uy * s, py + ux * s + uy * c];
        };
        const placeBin = (lift, phi) => {
          const dx = LIFT[0] * lift, dy = LIFT[1] * lift;
          const lid = phi > 90 ? 90 - phi : 0;                           // past upright-sideways, the lid falls open and hangs down
          const base = T(dx, dy) + " " + T(RIM[0], RIM[1]) + " " + R(phi) + " " + T(-RIM[0], -RIM[1]);
          binBody.style.transform = base;
          binLid.style.transform = base + " " + T(HINGE[0], HINGE[1]) + " " + R(lid) + " " + T(-HINGE[0], -HINGE[1]);
          // the lifter: a pivot on the tailgate below the hopper lip, an arm to the comb under the rim
          const P = [392, 655], C0 = binPt([207, 52], dx, dy, phi), C1 = binPt([207, 97], dx, dy, phi);
          const d = `M${P[0]},${P[1]} L${C1[0].toFixed(1)},${C1[1].toFixed(1)} L${C0[0].toFixed(1)},${C0[1].toFixed(1)}`;
          arm.setAttribute("d", d); armHi.setAttribute("d", d);
          const teeth = [0, 1, 2].map(i => { const a = binPt([182 + i * 14, 47], dx, dy, phi), b = binPt([182 + i * 14, 30], dx, dy, phi); return `M${a[0].toFixed(1)},${a[1].toFixed(1)} L${b[0].toFixed(1)},${b[1].toFixed(1)}`; });
          comb.setAttribute("d", teeth.join(" "));
          return { mouth: binPt([109, 31], dx, dy, phi) };
        };
        // ---------------------------------------------------------------- the packer
        // The slide plate runs on rails from the hopper (S_DN) up to the throat of the body (S_UP). The sweep
        // blade hangs from the slide plate on a pin at S; its tip is S + L * (cos th, sin th), screen degrees.
        // The hopper floor is the arc of radius 120 around S_DN, so the closing blade scrapes it clean.
        const S_DN = [520, 578], S_UP = [600, 330], L = 118, TH_REST = 20, TH_OPEN = 215;
        const u = (() => { const dx = S_UP[0] - S_DN[0], dy = S_UP[1] - S_DN[1], d = Math.hypot(dx, dy); return [dx / d, dy / d]; })();
        const v = [-u[1], u[0]];
        const packG = el("g", {}, st.art);
        const line = (a, b, w, col, parent = packG) => el("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: col, "stroke-width": w, "stroke-linecap": "round" }, parent);
        const add = (p, q, k = 1) => [p[0] + q[0] * k, p[1] + q[1] * k];
        for (const side of [-1, 1]) {                                  // the two guide rails
          const a = add(add(S_DN, u, -70), v, 24 * side), b = add(add(S_UP, u, 30), v, 24 * side);
          line(a, b, 11, "#3a3632"); line(a, b, 6, "#8d949b");
        }
        const ANCHOR = add(add(S_UP, u, 150), v, -4);                  // the slide cylinders' top pin
        const barrel = [line([0, 0], [0, 0], 24, "#3a3632"), line([0, 0], [0, 0], 17, "#7d858c")];
        const rod = [line([0, 0], [0, 0], 12, "#3a3632"), line([0, 0], [0, 0], 7, "#d7dce0")];
        const plate = el("polygon", { fill: "#9aa2a9", stroke: "#3a3632", "stroke-width": 3, "stroke-linejoin": "round" }, packG);
        const sweepCyl = [line([0, 0], [0, 0], 17, "#3a3632"), line([0, 0], [0, 0], 10, "#b9c0c6")];
        const bladeOut = el("path", { fill: "none", stroke: "#3a3632", "stroke-width": 30, "stroke-linecap": "round" }, packG);
        const blade = el("path", { fill: "none", stroke: "#a3abb2", "stroke-width": 22, "stroke-linecap": "round" }, packG);
        const pin = el("circle", { r: 12, fill: "#5b6168", stroke: "#2b2620", "stroke-width": 2.5 }, packG);
        const setLine = (ls, a, b) => ls.forEach(l => { l.setAttribute("x1", a[0].toFixed(1)); l.setAttribute("y1", a[1].toFixed(1)); l.setAttribute("x2", b[0].toFixed(1)); l.setAttribute("y2", b[1].toFixed(1)); });
        const tipOf = (S, th) => [S[0] + L * Math.cos(rad(th)), S[1] + L * Math.sin(rad(th))];
        const placePacker = (slide, th) => {                           // slide 0 = down at the hopper, 1 = up
          const S = [lerp(S_DN[0], S_UP[0], slide), lerp(S_DN[1], S_UP[1], slide)];
          const c = [[-75, -26], [75, -26], [75, 26], [-75, 26]].map(([a, b]) => add(add(S, u, a + 30), v, b));
          plate.setAttribute("points", c.map(p => p.map(n => n.toFixed(1)).join(",")).join(" "));
          const top = add(S, u, 95), mid = [lerp(ANCHOR[0], top[0], .5), lerp(ANCHOR[1], top[1], .5)];
          setLine(barrel, ANCHOR, mid); setLine(rod, mid, top);
          const tip = tipOf(S, th), n = [-Math.sin(rad(th)), Math.cos(rad(th))];
          const ctrl = [(S[0] + tip[0]) / 2 + n[0] * 34, (S[1] + tip[1]) / 2 + n[1] * 34];   // curved back, hollow face forward
          const d = `M${S[0].toFixed(1)},${S[1].toFixed(1)} Q${ctrl[0].toFixed(1)},${ctrl[1].toFixed(1)} ${tip[0].toFixed(1)},${tip[1].toFixed(1)}`;
          bladeOut.setAttribute("d", d); blade.setAttribute("d", d);
          const onBlade = [lerp(S[0], ctrl[0], .9), lerp(S[1], ctrl[1], .9)];
          setLine(sweepCyl, add(S, u, 80), onBlade);
          pin.setAttribute("cx", S[0].toFixed(1)); pin.setAttribute("cy", S[1].toFixed(1));
          return S;
        };
        // ---------------------------------------------------------------- the rubbish
        const COLS = ["#2e2d2b", "#a99f8c", "#3f6a99", "#a8834a", "#6d4f8c", "#4f7f3f", "#a8392a", "#b8a964"];
        const floorY = x => 578 + Math.sqrt(Math.max(0, 120 * 120 - (x - 520) ** 2));      // the hopper floor
        let bits = [], packed = 0;
        const slot = i => { const col = Math.floor(i / 12), row = i % 12; return [1018 - col * 21 + (row % 2) * 7, 578 - row * 30]; };
        const spawn = mouth => bits.push({ x: mouth[0] + (Math.random() - .5) * 30, y: mouth[1] + 10, vx: 40 + Math.random() * 90, vy: 30 + Math.random() * 60,
          c: COLS[Math.floor(Math.random() * COLS.length)], s: 44 + Math.random() * 22, state: "fall", rest: 6 + Math.random() * 30, v: Math.floor(Math.random() * 4) });
        // ---------------------------------------------------------------- oil: a pump under the body, two hoses
        // The engine's pump pushes oil to whichever cylinder is moving: one hose runs back to the lifter's pivot,
        // one up the tailgate pillar to the packer's slide cylinders. The hoses are see-through, so the oil shows.
        const PUMP = [780, 690];
        const HOSE_LIFT = [PUMP, [700, 712], [600, 714], [470, 702], [392, 655]];
        const HOSE_PACK = [PUMP, [722, 640], [706, 560], [698, 300], ANCHOR];
        const hoseG = el("g", {}, st.art);
        hoseG.parentNode.insertBefore(hoseG, hoseG.parentNode.firstChild);         // behind the lifter and the packer
        for (const hp of [HOSE_LIFT, HOSE_PACK]) {
          const d = "M" + hp.map(q => q.map(n => n.toFixed(1)).join(",")).join(" L");
          el("path", { d, fill: "none", stroke: "#4a4640", "stroke-width": 15, "stroke-linecap": "round", "stroke-linejoin": "round" }, hoseG);
          el("path", { d, fill: "none", stroke: "#efe6d2", "stroke-width": 9, "stroke-linecap": "round", "stroke-linejoin": "round" }, hoseG);
        }
        el("circle", { cx: PUMP[0], cy: PUMP[1], r: 20, fill: "#7d858c", stroke: "#2b2620", "stroke-width": 3 }, hoseG);
        el("circle", { cx: PUMP[0], cy: PUMP[1], r: 7, fill: "#3a3632" }, hoseG);
        const OIL = ["#d0661a", "#e07a18", "#c25a12"];
        const oilLift = new st.Flow(HOSE_LIFT, { colors: OIL, size: 19, count: 40, speed: 220, jitter: 0, fadeIn: .02, fadeOut: .02 });
        const oilPack = new st.Flow(HOSE_PACK, { colors: OIL, size: 19, count: 46, speed: 220, jitter: 0, fadeIn: .02, fadeOut: .02 });
        // ---------------------------------------------------------------- controls
        // aPos 0..1: up to .4 the lifter raises the bin, from .4 to 1 it turns it over.
        // cPos 0..1 is one packer cycle: open (0-.2), slide down (.2-.4), sweep (.4-.75), slide up and push (.75-1).
        // Both ends of the cycle are the same rest pose, so a finished cycle simply starts again at 0.
        let aPos = 0, aTarget = 0, cPos = 0, cTarget = 0, spawned = false, toSpawn = 0, spawnT = 0;
        let autoTip = 0, autoTipT = 0, autoPack = false, dragging = false, lastSay = "";
        const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
        const pose = c => {
          if (c < .2) return { slide: 1, th: lerp(TH_REST, TH_OPEN, ease(c / .2)) };
          if (c < .4) return { slide: 1 - ease((c - .2) / .2), th: TH_OPEN };
          if (c < .75) return { slide: 0, th: lerp(TH_OPEN, TH_REST, ease((c - .4) / .35)) };
          return { slide: ease((c - .75) / .25), th: TH_REST };
        };
        const say = s => { if (s !== lastSay) { lastSay = s; st.status(s); } };
        // the bin is the handle: drag it up (and towards the truck) to lift and tip it, or just tap it
        const handles = el("g", { class: "ck-handles" }, st.ink.parentNode);
        const hBin = el("polygon", { class: "ck-handle", tabindex: 0, role: "slider", "aria-label": "Bin lifter: drag the bin up, or press the arrow keys" }, handles);
        hBin.style.touchAction = "none";
        const top = st.ink.ownerSVGElement;
        const toDiagram = e => { const r = top.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * st.w, (e.clientY - r.top) / r.height * st.h]; };
        hBin.addEventListener("pointerdown", e => {
          e.preventDefault(); window.__clearStep && window.__clearStep();
          const [x0, y0] = toDiagram(e), base = aPos, t0 = performance.now(); let moved = false;
          autoTip = 0; aTarget = base; dragging = true;
          const move = ev => { const [x, y] = toDiagram(ev); if (Math.hypot(x - x0, y - y0) > 8) moved = true; aTarget = clamp(base + (y0 - y) / 280 + (x - x0) / 700); };
          const up = () => {
            removeEventListener("pointermove", move); removeEventListener("pointerup", up); removeEventListener("pointercancel", up);
            dragging = false;
            if (!moved && performance.now() - t0 < 400) autoTip = 1;           // a tap: the lifter does it all
            else aTarget = 0;                                                     // let go and the lifter lowers the bin
          };
          addEventListener("pointermove", move); addEventListener("pointerup", up); addEventListener("pointercancel", up);
        });
        hBin.addEventListener("keydown", e => {
          const d = { ArrowUp: .25, ArrowRight: .25, ArrowDown: -.25, ArrowLeft: -.25 }[e.key];
          if (d) { e.preventDefault(); e.stopPropagation(); autoTip = 0; aTarget = clamp(aTarget + d); }
          if (e.key === " " || e.key === "Enter") { e.preventDefault(); autoTip = 1; }
        });
        const arrows = {
          1: [st.arrow("M200,580 C220,450 300,430 372,500")],
          2: [st.arrow("M440,540 C450,600 470,630 490,665", { color: "#9c3b1c" })],
          3: [st.arrow("M420,665 C460,735 590,735 640,655", { color: "#9c3b1c" })],
          4: [st.arrow("M640,520 C680,420 760,380 900,400", { color: "#9c3b1c" })]
        };
        const spots = {
          1: [{ cx: 230, cy: 680, rx: 190, ry: 250 }],
          2: [{ cx: 515, cy: 650, rx: 150, ry: 85 }],
          3: [{ cx: 540, cy: 470, rx: 180, ry: 250 }],
          4: [{ cx: 860, cy: 410, rx: 280, ry: 210 }]
        };
        placeBin(0, 0); placePacker(1, TH_REST);
        st.sig.garbage = () => ({ aPos, aTarget, cPos, cTarget, autoTip });
        return {
          control(v) { if (!autoPack) cTarget = v; },
          step(n) {
            for (const [k, list] of Object.entries(arrows)) for (const a of list) +k === n ? a.draw(900) : a.hide();
            st.spot(n ? spots[n] : null);
            const inHopper = bits.some(b => b.state === "rest");
            if (!inHopper && aPos < .05 && n && !dragging) autoTip = 1;
            if ((n === 3 || n === 4) && inHopper && !autoPack) { autoPack = true; cTarget = 1; }
          },
          tick(dt) {
            // the lifter: a tap or a step runs it up, holds it a moment, and brings it down
            if (dragging) autoTip = 0;
            if (autoTip === 1) { aTarget = 1; if (aPos > .995) { autoTip = 2; autoTipT = 1.1; } }
            else if (autoTip === 2) { autoTipT -= dt; if (autoTipT <= 0) { autoTip = 0; aTarget = 0; } }
            const aStep = clamp(aTarget - aPos, -.9 * dt, .9 * dt); aPos += aStep;
            const lift = clamp(aPos / .4), phi = TIP * clamp((aPos - .4) / .6);
            if (aPos < .15) spawned = false;
            if (!spawned && phi > 95) { spawned = true; toSpawn = 14; }
            // the packer moves slowly and steadily, as hydraulics do
            const cStep = clamp(cTarget - cPos, -.4 * dt, .4 * dt); cPos += cStep;
            if (autoPack && Math.abs(cStep) > 0) st.setControl(cPos);
            const { slide, th } = pose(cPos);
            const forward = cStep > 1e-4;
            if (cPos >= .995) {                                                   // a full cycle: into the box, and rest again
              for (const b of bits) if (b.state === "carried") { b.state = "fly"; b.slot = slot(packed++ % 144); }
              cPos = 0; cTarget = 0; autoPack = false; st.setControl(0);
              if (packed >= 144) { packed = 0; bits = []; }
            }
            const { mouth } = placeBin(lift, phi);
            const S = placePacker(slide, th);
            // the moving part's hose fills with flowing oil, faster the faster it moves
            const la = Math.abs(aStep) / Math.max(dt, 1e-3), lc = Math.abs(cStep) / Math.max(dt, 1e-3);
            oilLift.rate = (aStep < 0 ? -1 : 1) * (.4 + la); oilLift.density = clamp(la * 1.6);
            oilPack.rate = (cStep < 0 ? -1 : 1) * (.4 + lc * 2); oilPack.density = clamp(lc * 4);
            for (const f of [oilLift, oilPack]) { f.tick(dt); f.draw(st.g); }
            hBin.setAttribute("points", [[-10, -20], [BW * .85, -20], [BW * .85, BH * .75], [-10, BH * .75]]
              .map(q => binPt(q, LIFT[0] * lift, LIFT[1] * lift, phi).map(n => n.toFixed(1)).join(",")).join(" "));
            if (toSpawn > 0 && phi > 95) { spawnT -= dt; if (spawnT <= 0) { spawn(mouth); toSpawn--; spawnT = .07; } }
            const sweeping = cPos > .4 && cPos < .75;
            for (const b of bits) {
              if (b.state === "fall") {
                b.vy += 1400 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.vx *= .98;
                b.x = Math.max(415, Math.min(625, b.x));
                const f = floorY(b.x) - b.rest;
                if (b.y >= f) { b.y = f; b.state = "rest"; }
              } else if (b.state === "rest" || b.state === "carried") {
                // the blade sweeps from the rear (large angle) to the front: whatever it reaches, it pushes
                const a = Math.atan2(b.y - S[1], b.x - S[0]) * 180 / Math.PI, r = Math.min(L - 12, Math.hypot(b.x - S[0], b.y - S[1]));
                if (b.state === "rest" && sweeping && forward && th <= a + 2) { b.state = "carried"; b.r = r; b.da = -4 - Math.random() * 10; }
                if (b.state === "carried" && cStep < -1e-4 && cPos < .75) { b.state = "fall"; b.vx = 0; b.vy = 0; }   // pulled back: it drops again
                if (b.state === "carried") { const aa = rad(th + b.da); b.x = S[0] + b.r * Math.cos(aa); b.y = S[1] + b.r * Math.sin(aa); }
              } else if (b.state === "fly") {
                b.x += (b.slot[0] - b.x) * Math.min(1, dt * 5); b.y += (b.slot[1] - b.y) * Math.min(1, dt * 5);
                if (Math.hypot(b.slot[0] - b.x, b.slot[1] - b.y) < 2) b.state = "packed";
              }
            }
            st.g.save(); st.g.globalCompositeOperation = "source-over";
            for (const b of bits) {
              const sz = b.state === "packed" || b.state === "fly" ? b.s * .8 : b.s;   // squashed smaller in the box
              st.g.globalAlpha = 1;                                    // two dabs on top of each other: a solid little bag
              st.g.drawImage(st.dab(b.c, b.v), b.x - sz / 2, b.y - sz / 2, sz, sz);
              st.g.drawImage(st.dab(b.c, (b.v + 1) % 4), b.x - sz * .4, b.y - sz * .42, sz * .8, sz * .8);
            }
            st.g.restore();
            const inHopper = bits.filter(b => b.state === "rest").length;
            say(aPos > .02 ? (phi > 95 ? "Upside down! Out falls the rubbish." : aStep < 0 ? "The empty bin goes back down." : "The lifter grabs the bin and lifts it.")
              : cPos > .01 ? (cPos < .2 ? "The blade swings open." : cPos < .4 ? "The slide plate goes down to the hopper." : cPos < .75 ? "The blade scoops the rubbish up." : "Squash! Into the box it goes.")
              : inHopper ? "Rubbish in the hopper. Push the packer lever all the way!"
              : packed ? `The box is filling up: ${Math.round(packed / 144 * 100)}% of the space used. Tip another bin!`
              : "Drag the black bin up, or tap it.");
          }
        };
      }
    }
  });
})(window.MECH_KIT);
