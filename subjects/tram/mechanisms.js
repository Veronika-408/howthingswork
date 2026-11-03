// The tram's "How it works" pages. Every subject can add pages like this: a file that registers
// entries in window.MECHANISMS, using the shared helpers in window.MECH_KIT (see src/mechanisms.js
// for the plane's pages and src/book.js for the stage API passed to setup()).
(({ el, mirrorX, mirrorY, lerp, approach, ramp }) => {
  Object.assign(window.MECHANISMS, {
    // ------------------------------------------------------------------ tram: where the power comes from
    power: {
      title: "Electric power",
      folio: 112,
      art: { src: null, w: 1536, h: 1024, alt: "A tram on its rail under the overhead wire, cut open to show the cable and the motor." },
      intro: "A tram carries no fuel at all. It takes electricity from the wire above the street, uses it to turn its motors, and sends it home through the rails.",
      steps: [
        { name: "The wire.", text: "Electricity waits in the copper wire above the street, all along the tram line." },
        { name: "The pantograph.", text: "The springy arms on the roof press a strip up against the wire, and the electricity flows down into the tram." },
        { name: "The motor.", text: "A thick cable takes it to the electric motor under the floor. The motor spins and turns the wheels." },
        { name: "Back home.", text: "The electricity goes on through the steel wheels into the rails, and back to the power station. Round and round, like a loop." }
      ],
      know: "When the tram brakes, its motors work backwards and make electricity. It goes back up into the wire, and another tram nearby can use it.",
      caption: "Push the handle to go, pull it back to brake. Yellow is electricity going to the motor, green is electricity the brakes make.",
      control: { label: "Driver's handle", min: "Brake", max: "Go", value: 30,
        text: v => v < .22 ? "Braking: the motor makes electricity and sends it back." : v < .38 ? "Rolling: no power needed." : v < .75 ? "Going: electricity flows to the motor." : "Full power!" },
      callouts: [[1, 300, 165, 300, 94], [2, 760, 170, 640, 208], [3, 260, 985, 455, 870], [4, 1040, 985, 1040, 918]],
      setup(st) {
        const A2 = "assets/tram/book/";
        // the street scrolls past behind the tram; poles go past with it
        // the street painting's pavement line (84% of its height) sits on the rail at y 915
        const SH = 1000, ST = 915 - SH * .84, SW = SH * 3072 / 576;
        const streets = [0, 1].map(() => st.sprite(A2 + "street.webp", 0, ST, SW, SH, st.under));
        const POLE_GAP = 1100;
        const poles = [0, 1].map(() => st.sprite(A2 + "power-pole.webp", 0, 30, 124, 892, st.under));
        st.sprite(A2 + "power-tram.webp", 0, 0, 1536, 1024, st.under);
        const wheels = [[375, 862], [662, 862]].map(([x, y], i) => {
          const w = st.sprite(A2 + (i ? "wheel-b" : "wheel-a") + ".webp", x - 53, y - 53, 106, 106, st.under);
          w.style.transformOrigin = "50% 50%";
          return w;
        });
        el("line", { x1: -20, y1: 91, x2: 1560, y2: 91, stroke: "#3d3a36", "stroke-width": 3.2 }, st.art);
        const arms = [0, 1].map(() => el("line", { y1: 72, y2: 89, stroke: "#4b4843", "stroke-width": 2.2 }, st.art));
        const glow = el("ellipse", { cx: 500, cy: 855, rx: 70, ry: 42, fill: "#f6c046", opacity: 0, filter: "url(#bk-soft)" }, st.art);
        const label = (x, y, t, anchor = "start") => { const e = el("text", { x, y, class: "bk-hand", "text-anchor": anchor }, st.ink); e.textContent = t; return e; };
        label(860, 70, "electricity in the wire");
        label(1060, 965, "back through the rails");
        const down = [[-20, 91], [495, 91], [503, 104], [560, 145], [628, 210], [565, 280], [515, 330], [600, 336], [700, 345], [722, 385], [722, 768], [700, 791], [580, 797], [520, 838]];
        const back = [[520, 860], [600, 862], [660, 892], [664, 915], [900, 915], [1600, 915]];
        const yellow = ramp([[0, "#f4c021"], [.5, "#f2ad1d"], [1, "#efa21c"]]), green = ramp([[0, "#3fae5a"], [1, "#5bbf6e"]]);
        const fl = [new st.Flow(down, { colors: yellow, size: 20, count: 42, speed: 260, jitter: 3, fadeIn: .02, fadeOut: .03 }),
                    new st.Flow(back, { colors: yellow, size: 20, count: 30, speed: 260, jitter: 3, fadeIn: .04, fadeOut: .2 })];
        const arrows = {
          1: [st.arrow("M80,62 L440,62")],
          2: [st.arrow("M690,118 C660,150 640,180 618,200", { color: "#9c3b1c" })],
          3: [st.arrow("M770,450 L770,760", { color: "#9c3b1c" })],
          4: [st.arrow("M720,955 L1300,955")]
        };
        const spots = {
          1: [{ cx: 760, cy: 91, rx: 800, ry: 60 }, { cx: 560, cy: 210, rx: 110, ry: 120 }],
          2: [{ cx: 548, cy: 212, rx: 130, ry: 145 }],
          3: [{ cx: 600, cy: 640, rx: 190, ry: 280 }],
          4: [{ cx: 900, cy: 900, rx: 720, ry: 60 }]
        };
        let lever = .3, speed = 0, offset = 0, angle = 0, lastSay = "";
        return {
          control(v) { lever = v; },
          step(n) {
            for (const [k, list] of Object.entries(arrows)) for (const a of list) +k === n ? a.draw(900) : a.hide();
            st.spot(n ? spots[n] : null);
            if (n && lever < .4) st.setControl(.85);
          },
          tick(dt) {
            const go = Math.max(0, (lever - .38) / .62), brake = Math.max(0, (.22 - lever) / .22);
            speed = Math.max(0, Math.min(1, speed + dt * (.45 * go - .05 - 1.1 * brake * (speed > 0 ? 1 : 0))));
            const regen = brake > 0 && speed > .02;
            offset = (offset + speed * 260 * dt) % (SW * 2);
            const o = offset % SW;                                 // the tram drives left, so the street slides right
            streets[0].style.left = (o - SW) / 1536 * 100 + "%";
            streets[1].style.left = o / 1536 * 100 + "%";
            streets.forEach(e => { e.style.opacity = .55; });
            poles.forEach((p, i) => {
              const x = ((offset * 1 + i * POLE_GAP) % (POLE_GAP * 2)) - 200;
              p.style.left = x / 1536 * 100 + "%";
              arms[i].setAttribute("x1", x + 24); arms[i].setAttribute("x2", x + 120);
            });
            angle -= speed * 260 * dt / 51 * 57.3;                 // rolling to the left
            wheels.forEach(w => { w.style.transform = `rotate(${angle.toFixed(1)}deg)`; });
            const flow = regen ? brake * speed : go;
            for (const f of fl) {
              f.colors = regen ? green : yellow;
              f.rate = regen ? -(.4 + speed) : .3 + go;
              f.density = Math.min(1, flow * 1.4);
              f.tick(dt); f.draw(st.g);
            }
            glow.setAttribute("opacity", (Math.min(1, flow) * .7).toFixed(3));
            const kmh = Math.round(speed * 50);
            const say = kmh === 0 ? "The tram is standing still." : regen ? `${kmh} km/h, braking and making electricity.` : `${kmh} km/h`;
            if (say !== lastSay) { lastSay = say; st.status(say); }
          }
        };
      }
    },

    // ------------------------------------------------------------------ tram: switch points
    points: {
      title: "No steering wheel",
      folio: 118,
      art: { src: "assets/tram/book/junction.webp", w: 1536, h: 1024, alt: "Tram tracks splitting in two, seen from above, with the moving switch blades." },
      intro: "A tram has no steering wheel. The rails steer it. So where the track splits in two, the track itself must choose the way.",
      steps: [
        { name: "Two ways.", text: "Here the track splits: one way goes straight on, the other curves away." },
        { name: "The blades.", text: "Two thin steel blades slide sideways, just a few centimetres. They open one way and close the other." },
        { name: "The wheels follow.", text: "The rims of the wheels run in the groove of the rail, so the tram has to follow the way the blades have opened." },
        { name: "Choosing.", text: "A motor under the street moves the blades. The driver can set them with a button, or a computer does it for them." }
      ],
      know: "The blades must never move while a tram is going over them, so the switch locks itself until the last wheel has passed.",
      caption: "The track from above. Change the points, then send a tram.",
      control: { kind: "buttons", label: "Try it", buttons: [{ id: "turn", label: "Set the points to turn", onLabel: "Set the points to straight", toggle: true }, { id: "send", label: "Send a tram" }] },
      callouts: [[1, 260, 380, 260, 495], [2, 640, 660, 745, 528], [3, 1210, 640, 1040, 520], [4, 1040, 760, 905, 650]],
      setup(st) {
        const A2 = "assets/tram/book/";
        const g = el("g", {}, st.art);
        const rod = el("polyline", { fill: "none", stroke: "#5b6168", "stroke-width": 5, "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
        const blades = [0, 1].map(() => el("polygon", { fill: "#c6ccd2", stroke: "#4e545b", "stroke-width": 1.6 }, g));
        const bladePts = (tx, ty, hx, hy, w0, w1) => {
          const dx = hx - tx, dy = hy - ty, L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
          return [[tx + nx * w0, ty + ny * w0], [hx + nx * w1, hy + ny * w1], [hx - nx * w1, hy - ny * w1], [tx - nx * w0, ty - ny * w0]].map(p => p.join(",")).join(" ");
        };
        // the centre line the tram follows: straight on, or along the curve
        const bez = (p0, p1, p2, p3, n = 60) => Array.from({ length: n + 1 }, (_, i) => {
          const t = i / n, u = 1 - t;
          return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]];
        });
        const mk = pts => { const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return { pts, L }; };
        const routes = {
          straight: mk([[-400, 512], [700, 512], [2000, 512]]),
          turn: mk([[-400, 512], ...bez([700, 512], [1000, 512], [1300, 330], [1395, -80]), [1460, -400]])
        };
        const at = (r, s) => {
          const { pts, L } = r; s = Math.max(0, Math.min(L[L.length - 1] - .01, s));
          let i = 1; while (L[i] < s) i++;
          const a = pts[i - 1], b = pts[i], t = (s - L[i - 1]) / (L[i] - L[i - 1]);
          return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, ang: Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI };
        };
        const K = .2, pieces = [["top-front", 584], ["top-mid", 438], ["top-rear", 468]].map(([n, w]) => ({ n, w: w * K, h: 308 * K }));
        const offs = [0, -(pieces[0].w / 2 + pieces[1].w / 2), -(pieces[0].w / 2 + pieces[1].w + pieces[2].w / 2)];
        const trams = [];
        const tramLayer = el("g", {}, st.art);
        const send = () => {
          if (trams.length >= 2) return;
          const gEl = el("g", {}, tramLayer);
          const imgs = pieces.map(p => el("image", { href: A2 + p.n + ".webp", x: -p.w / 2, y: -p.h / 2, width: p.w, height: p.h }, gEl));
          trams.push({ g: gEl, imgs, s: 0, route: null });
        };
        const arrows = {
          1: [st.arrow("M120,610 L1440,610"), st.arrow("M500,420 C800,420 1100,380 1250,120")],
          2: [st.arrow("M880,560 C840,600 790,600 770,540", { color: "#9c3b1c" })],
          3: [st.arrow("M1000,440 C1150,380 1260,260 1320,140", { color: "#9c3b1c" })],
          4: [st.arrow("M960,700 C930,680 910,670 900,650", { color: "#9c3b1c" })]
        };
        const spots = {
          1: [{ cx: 920, cy: 430, rx: 560, ry: 260 }],
          2: [{ cx: 770, cy: 512, rx: 120, ry: 55 }],
          3: [{ cx: 1050, cy: 420, rx: 330, ry: 200 }],
          4: [{ cx: 872, cy: 622, rx: 70, ry: 60 }]
        };
        let target = 0, pos = 0, timer = 1.5, lastSay = "";
        const locked = () => trams.some(t => t.s > 1090 && t.s + offs[2] < 1245);   // a tram is over the blades (x 700-840)
        return {
          control(c) {
            if ("turn" in c) {
              if (locked()) { st.status("Wait! A tram is going over the points."); return; }
              target = c.turn ? 1 : 0;
            }
            if (c.send) send();
          },
          step(n) {
            for (const [k, list] of Object.entries(arrows)) for (const a of list) +k === n ? a.draw(1000) : a.hide();
            st.spot(n ? spots[n] : null);
            if (n === 2) target = 1 - target;
            if (n === 3 && !trams.length) send();
          },
          tick(dt) {
            if (!locked()) pos += Math.max(-1.6 * dt, Math.min(1.6 * dt, target - pos));
            const p = pos;
            blades[0].setAttribute("points", bladePts(705, 531 - 16 * p, 838, 531, .8, 4));
            blades[1].setAttribute("points", bladePts(705, 509 - 12 * p, 838, 483, .8, 4));
            const ly = 531 - 16 * p + (531 - (531 - 16 * p)) * .45, uy = 509 - 12 * p + (483 - (509 - 12 * p)) * .45;
            rod.setAttribute("points", `765,${uy.toFixed(1)} 765,${(ly + 8).toFixed(1)} 872,604`);
            timer -= dt;
            if (timer < 0) { send(); timer = 7; }
            for (let i = trams.length - 1; i >= 0; i--) {
              const t = trams[i];
              t.s += 130 * dt;
              if (!t.route && t.s >= 1100) t.route = pos > .5 ? "turn" : "straight";   // 700 px of approach + 400 px of run-up
              const r = routes[t.route || "straight"];
              t.imgs.forEach((im, j) => {
                const q = at(r, t.s + offs[j]);
                im.setAttribute("transform", `translate(${q.x.toFixed(1)} ${q.y.toFixed(1)}) rotate(${q.ang.toFixed(2)})`);
              });
              if (t.s + offs[2] > r.L[r.L.length - 1] - 50) { t.g.remove(); trams.splice(i, 1); }
            }
            const say = pos > .5 ? "The points are set to turn." : "The points are set to go straight on.";
            if (say !== lastSay && !locked()) { lastSay = say; st.status(say); }
          }
        };
      }
    }
  });
})(window.MECH_KIT);
