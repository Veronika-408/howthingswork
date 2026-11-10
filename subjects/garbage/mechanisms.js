// The garbage truck's "How it works" page: from the bin into the box. The painting is the rear of the
// truck switched off, with an empty hopper and an empty tailgate; the code lifts and tips the bin, and
// draws the packer (slide plate, sweep blade, cylinders) so the mechanism is exact at every moment.
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
      caption: "Tip a bin into the hopper, then squash it into the box. Do it again and again and watch the box fill up.",
      control: { kind: "buttons", label: "Try it", buttons: [{ id: "tip", label: "Tip the bin" }, { id: "pack", label: "Squash it!" }] },
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
        // ---------------------------------------------------------------- the sequences
        let seq = null, t = 0, lift = 0, phi = 0, slide = 1, th = TH_REST, toSpawn = 0, spawnT = 0, lastSay = "";
        const TIPSEQ = [["lift", .8], ["turn", 1.0], ["hold", 1.3], ["unturn", .9], ["lower", .7]];
        const PACK = [["open", .8], ["down", .9], ["sweep", 1.5], ["up", 1.2], ["home", .5]];
        const start = name => { if (seq) return false; seq = { name, phases: name === "tip" ? TIPSEQ : PACK, i: 0 }; t = 0; return true; };
        const say = s => { if (s !== lastSay) { lastSay = s; st.status(s); } };
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
        return {
          control(c) {
            if (c.tip && !start("tip")) say("Wait a moment, the machine is busy.");
            if (c.pack && !start("pack")) say("Wait a moment, the machine is busy.");
          },
          step(n) {
            for (const [k, list] of Object.entries(arrows)) for (const a of list) +k === n ? a.draw(900) : a.hide();
            st.spot(n ? spots[n] : null);
            if ((n === 1 || n === 2) && !bits.some(b => b.state !== "gone")) start("tip");
            if (n === 3 || n === 4) start(bits.some(b => b.state === "rest") ? "pack" : "tip");
          },
          tick(dt) {
            if (seq) {
              const [ph, dur] = seq.phases[seq.i];
              t += dt / dur; const k = ease(t);
              if (seq.name === "tip") {
                if (ph === "lift") lift = k;
                if (ph === "turn") phi = TIP * k;
                if (ph === "hold" && t < .05) { toSpawn = 16; }
                if (ph === "unturn") phi = TIP * (1 - k);
                if (ph === "lower") lift = 1 - k;
                say(ph === "lift" ? "The lifter grabs the bin and lifts it." : ph === "turn" || ph === "hold" ? "Upside down! Out falls the rubbish." : "The empty bin goes back down.");
              } else {
                if (ph === "open") th = lerp(TH_REST, TH_OPEN, k);
                if (ph === "down") slide = 1 - k;
                if (ph === "sweep") th = lerp(TH_OPEN, TH_REST, k);
                if (ph === "up") slide = k;
                if (ph === "home" && t < .05) for (const b of bits) if (b.state === "carried") { b.state = "fly"; b.slot = slot(packed++ % 144); }
                say(ph === "open" ? "The blade swings open." : ph === "down" ? "The slide plate goes down to the hopper." : ph === "sweep" ? "The blade scoops the rubbish up." : "Squash! Into the box it goes.");
              }
              if (t >= 1) { t = 0; seq.i++; if (seq.i >= seq.phases.length) { seq = null; if (packed >= 144) { packed = 0; bits = []; say("The box is full! Off to empty it, then start again."); } } }
            }
            const { mouth } = placeBin(lift, phi);
            const S = placePacker(slide, th);
            if (toSpawn > 0 && phi > 95) { spawnT -= dt; if (spawnT <= 0) { spawn(mouth); toSpawn--; spawnT = .07; } }
            for (const b of bits) {
              if (b.state === "fall") {
                b.vy += 1400 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.vx *= .98;
                b.x = Math.max(415, Math.min(625, b.x));
                const f = floorY(b.x) - b.rest;
                if (b.y >= f) { b.y = f; b.state = "rest"; }
              } else if (b.state === "rest" || b.state === "carried") {
                // the blade sweeps from the rear (large angle) to the front: whatever it reaches, it pushes
                const a = Math.atan2(b.y - S[1], b.x - S[0]) * 180 / Math.PI, r = Math.min(L - 12, Math.hypot(b.x - S[0], b.y - S[1]));
                if (b.state === "rest" && seq && seq.name === "pack" && seq.phases[seq.i][0] === "sweep" && th <= a + 2) { b.state = "carried"; b.r = r; b.da = -4 - Math.random() * 10; }
                if (b.state === "carried") { const aa = rad(th + b.da); b.x = S[0] + b.r * Math.cos(aa); b.y = S[1] + b.r * Math.sin(aa); }
              } else if (b.state === "fly") {
                b.x += (b.slot[0] - b.x) * Math.min(1, dt * 5); b.y += (b.slot[1] - b.y) * Math.min(1, dt * 5);
                if (Math.hypot(b.slot[0] - b.x, b.slot[1] - b.y) < 2) b.state = "packed";
              }
            }
            st.g.save(); st.g.globalCompositeOperation = "source-over";
            for (const b of bits) {
              if (b.state === "gone") continue;
              const sz = b.state === "packed" || b.state === "fly" ? b.s * .8 : b.s;   // squashed smaller in the box
              st.g.globalAlpha = 1;                                    // two dabs on top of each other: a solid little bag
              st.g.drawImage(st.dab(b.c, b.v), b.x - sz / 2, b.y - sz / 2, sz, sz);
              st.g.drawImage(st.dab(b.c, (b.v + 1) % 4), b.x - sz * .4, b.y - sz * .42, sz * .8, sz * .8);
            }
            st.g.restore();
            if (!seq) {
              const inHopper = bits.filter(b => b.state === "rest").length;
              say(inHopper ? "Rubbish in the hopper. Press Squash it!" : packed ? `The box is filling up: ${Math.round(packed / 144 * 100)}% of the space used.` : "Press Tip the bin to start.");
            }
          }
        };
      }
    }
  });
})(window.MECH_KIT);
