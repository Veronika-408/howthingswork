// The weather's "How it works" pages: how rain is made, and lightning and thunder.
// The paintings hold still; every drop, flash and sound wave here is drawn by code (see src/book.js for the stage).
(({ el, lerp, approach, ramp }) => {
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pathAt = pts => x => {                    // y of a polyline at x
    for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return y0 + (y1 - y0) * (x - x0) / (x1 - x0); }
    return pts[pts.length - 1][1];
  };
  Object.assign(window.MECHANISMS, {
    // ------------------------------------------------------------------ weather: how a raindrop is made
    rain: {
      title: "How rain is made",
      folio: 130,
      art: { src: "assets/weather/book/rain.webp", w: 1536, h: 1024, alt: "A lake, green hills with a farmhouse and a river, the Sun, and a big cloud cut open to show its inside." },
      intro: "Rain is water that has been on a journey. It rises out of the lake, becomes a cloud, and falls back down, again and again.",
      steps: [
        { name: "The Sun warms the lake.", text: "Sunshine warms the water. Some of it turns into water vapour, a gas you cannot see, and rises with the warm air." },
        { name: "Tiny drops.", text: "High up, the air is cold. The vapour turns back into tiny drops of water. Billions of them together make a cloud." },
        { name: "Bump and join.", text: "Warm air pushes the drops up. Big drops fall faster than small ones, so they bump into them and swallow them, and grow." },
        { name: "Too heavy.", text: "When a drop is too heavy for the air to hold up, it falls out of the bottom of the cloud. That is a raindrop." },
        { name: "Back to the lake.", text: "The rain runs down the hills into the river, and the river takes it back to the lake. Then it all starts again." }
      ],
      know: "It takes about a million cloud drops to make one raindrop. The drops here are drawn much, much bigger than real ones, so you can see them.",
      caption: "Turn up the sunshine and watch the cloud fill up with drops until it rains.",
      control: { label: "Sunshine", min: "Cloudy", max: "Hot sun", value: 65,
        text: v => v < .12 ? "Hardly any sun: almost no water rises." : v < .45 ? "A little sun: the cloud fills slowly." : v < .8 ? "Sunny: lots of water rises into the cloud." : "Hot sun: the cloud fills up fast!" },
      callouts: [[1, 300, 690, 300, 785], [2, 560, 470, 640, 395], [3, 760, 120, 860, 230], [4, 1180, 520, 1050, 520], [5, 1260, 770, 1150, 690]],
      setup(st) {
        // the empty cut face of the painted cloud, the land the rain falls on, and the river back to the lake
        const CX = 921, CY = 288, RX = 425, RY = 116;
        const ground = pathAt([[480, 790], [560, 790], [700, 748], [900, 728], [1050, 698], [1200, 650], [1330, 572], [1420, 548], [1536, 575]]);
        const river = [[1500, 618], [1440, 632], [1360, 648], [1310, 672], [1230, 688], [1100, 694], [980, 712], [935, 735], [905, 760], [860, 775], [760, 786], [640, 795], [545, 802], [470, 806]];
        const vap = [0, 1, 2, 3, 4].map(i => {
          const x0 = 90 + i * 88;
          return new st.Flow([[x0, 796], [x0 + 26, 720], [x0 + 6, 640], [x0 + 48, 560], [x0 + 120 + i * 24, 480], [545 + i * 46, 404]],
            { colors: ramp([[0, "#a9c8e2"], [1, "#8fb5d8"]]), size: 34, count: 12, speed: 70, jitter: 10, alpha: .62, fadeIn: .12, fadeOut: .25 });
        });
        const riverFlow = new st.Flow(river, { colors: ramp([[0, "#4f93cc"], [1, "#3f80bd"]]), size: 15, count: 46, speed: 95, jitter: 2, alpha: .75, fadeIn: .03, fadeOut: .05 });
        const drops = [], rain = [], rings = [];
        const RAIN_R = 8.5;                       // this big, the air can't hold a drop up any more
        const keepInside = d => {
          const ex = (d.x - CX) / (RX - d.r), ey = (d.y - CY) / (RY - d.r), q = Math.hypot(ex, ey);
          if (q > 1) { d.x = CX + ex / q * (RX - d.r); d.y = CY + ey / q * (RY - d.r); d.vx *= -.3; d.vy *= -.3; }
        };
        const arrows = {
          1: [st.arrow("M250,770 C270,660 330,560 520,450")],
          2: [st.arrow("M600,440 C640,400 700,380 760,370", { color: "#9c3b1c" })],
          3: [st.arrow("M990,340 C1040,300 1040,250 990,220", { color: "#9c3b1c" })],
          4: [st.arrow("M920,450 L920,640")],
          5: [st.arrow("M1440,610 C1250,690 980,700 640,790")]
        };
        const spots = {
          1: [{ cx: 270, cy: 790, rx: 300, ry: 70 }, { cx: 176, cy: 166, rx: 125, ry: 125 }, { cx: 330, cy: 600, rx: 240, ry: 200 }],
          2: [{ cx: 780, cy: 330, rx: 300, ry: 150 }],
          3: [{ cx: 921, cy: 288, rx: 450, ry: 150 }],
          4: [{ cx: 921, cy: 560, rx: 470, ry: 190 }],
          5: [{ cx: 1000, cy: 720, rx: 560, ry: 120 }, { cx: 270, cy: 800, rx: 280, ry: 60 }]
        };
        let sun = .65, spawn = 0, wet = 0, lastSay = "", said = 0, fallen = 0, clock = 0;
        // start with a cloud that is already half full, so something happens at once
        for (let i = 0; i < 260; i++) drops.push({ x: rnd(CX - RX * .85, CX + RX * .85), y: rnd(CY - RY * .7, CY + RY * .7), r: rnd(2.6, 5.5), vx: 0, vy: 0, n: 1 });
        drops.forEach(keepInside);
        return {
          control(v) { sun = v; },
          step(n) {
            for (const [k, list] of Object.entries(arrows)) for (const a of list) +k === n ? a.draw(1000) : a.hide();
            st.spot(n ? spots[n] : null);
            if (n && sun < .4) st.setControl(.8);
          },
          tick(dt) {
            const g = st.g;
            // 1. vapour rises from the lake, as much as the sun sends
            for (const f of vap) { f.density = Math.min(1, .1 + sun * 1.1); f.rate = .4 + sun; f.tick(dt); f.draw(g); }
            // 2. new tiny drops appear in the bottom of the cloud, where the vapour arrives
            spawn += dt * (1 + 44 * sun);
            while (spawn >= 1) {
              spawn--;
              if (drops.length >= 420) continue;
              const d = { x: rnd(CX - RX * .85, CX + RX * .7), y: CY + rnd(.1, .8) * RY, r: rnd(2.8, 4.2), vx: 0, vy: 0, n: 1 };
              keepInside(d); drops.push(d);
            }
            // 3. rising and sinking air moves the drops around; big drops fall through it faster and swallow the small ones they hit
            clock += dt;
            for (const d of drops) {
              const settle = .75 * d.r * d.r, up = 12 + 62 * Math.sin(d.x / 85 + clock * .8) * Math.cos(d.y / 55 - clock * .5);
              d.vx += (rnd(-1, 1) * 90 - d.vx * 1.5) * dt;
              d.vy += (rnd(-1, 1) * 60 + (settle - up - d.vy) * 2) * dt;
              d.x += d.vx * dt; d.y += d.vy * dt;
              if (!(d.r >= RAIN_R && d.y > CY + RY * .45)) keepInside(d);
            }
            for (let i = 0; i < drops.length; i++) {
              const a = drops[i];
              if (!a) continue;
              for (let j = i + 1; j < drops.length; j++) {
                const b = drops[j];
                if (!b) continue;
                const dx = a.x - b.x, dy = a.y - b.y, rr = a.r + b.r;
                if (dx * dx + dy * dy < rr * rr * .85) {
                  const big = a.r >= b.r ? a : b, small = big === a ? b : a;
                  big.r = Math.cbrt(big.r ** 3 + small.r ** 3); big.n += small.n;   // the water adds up, not the width
                  drops[drops.indexOf(small)] = null;
                  if (small === a) break;
                }
              }
            }
            for (let i = drops.length - 1; i >= 0; i--) if (!drops[i]) drops.splice(i, 1);
            // 4. a drop that has left the bottom of the cloud is a raindrop
            for (let i = drops.length - 1; i >= 0; i--) {
              const d = drops[i];
              if (d.r >= RAIN_R && d.y > CY + RY * .7) { drops.splice(i, 1); rain.push({ x: d.x, y: d.y + 10, v: 260, n: d.n }); fallen++; said = d.n; }
            }
            for (let i = rain.length - 1; i >= 0; i--) {
              const p = rain[i];
              p.v = Math.min(900, p.v + 1400 * dt); p.y += p.v * dt; p.x -= 40 * dt;
              const gy = ground(p.x);
              if (p.y >= gy) { rain.splice(i, 1); rings.push({ x: p.x, y: gy, t: 0 }); wet = Math.min(1, wet + .08); }
            }
            // 5. the rain runs back down the river to the lake
            wet = Math.max(0, wet - dt * .05);
            riverFlow.density = .25 + wet * .75; riverFlow.rate = .6 + wet; riverFlow.tick(dt); riverFlow.draw(g);
            // drawing: cloud drops, falling rain, splashes
            for (const d of drops) {
              g.globalAlpha = .72 + Math.min(.25, d.r / 30);
              const s = d.r * 3.6;
              g.drawImage(st.dab(d.r > 6.5 ? "#3f78b6" : "#6a9dd0", (d.n + Math.round(d.x)) % 4), d.x - s / 2, d.y - s / 2, s, s);
            }
            g.globalAlpha = .9; g.strokeStyle = "#3d74b2"; g.lineCap = "round";
            for (const p of rain) {
              g.lineWidth = 5; g.beginPath(); g.moveTo(p.x + 4, p.y - Math.min(60, p.v * .07)); g.lineTo(p.x, p.y); g.stroke();
            }
            g.lineWidth = 2.2;
            for (let i = rings.length - 1; i >= 0; i--) {
              const r = rings[i]; r.t += dt;
              if (r.t > .5) { rings.splice(i, 1); continue; }
              g.globalAlpha = .7 * (1 - r.t / .5); g.beginPath(); g.ellipse(r.x, r.y, 4 + r.t * 34, 2 + r.t * 9, 0, 0, Math.PI * 2); g.stroke();
            }
            g.globalAlpha = 1;
            const say = said ? `That raindrop was made of ${said} cloud drops joined together. A real one takes about a million.`
              : `${drops.length} tiny drops in the cloud.`;
            if (say !== lastSay) { lastSay = say; st.status(say); }
            st.sig.drops = drops.length; st.sig.fallen = fallen;
          }
        };
      }
    },

    // ------------------------------------------------------------------ weather: lightning and thunder
    storm: {
      title: "Lightning and thunder",
      folio: 134,
      art: { src: "assets/weather/book/storm-land.webp", w: 1536, h: 1024, alt: "A summer meadow under a stormy sky, a cottage with a lightning rod, and a thundercloud cut open to show the ice inside." },
      intro: "A thunderstorm is a giant cloud full of ice and wind. It makes electricity, and the electricity makes the flash and the bang.",
      steps: [
        { name: "Up and down.", text: "Strong winds inside the storm cloud throw bits of ice and water up and down, again and again." },
        { name: "Bump and rub.", text: "The ice rubs and bumps. The top of the cloud fills with one kind of electricity, the bottom with the other, like a balloon rubbed on your hair." },
        { name: "Flash!", text: "When there is too much, the electricity jumps down to the ground in one giant spark: lightning. It is about 30,000 degrees hot." },
        { name: "Boom!", text: "The lightning heats the air so fast that the air bursts outward with a bang. That bang is thunder." },
        { name: "Count the seconds.", text: "Light reaches you at once, but sound is slower. Count from the flash to the thunder: every 3 seconds means 1 kilometre away." }
      ],
      know: "The cottage is safe. The lightning rod on its roof catches the lightning and leads it down a thick wire into the ground.",
      caption: "Move the storm nearer or further away, then count from the flash to the thunder.",
      control: { label: "How far away is the storm?", min: "1 km", max: "4 km", value: 0,
        text: v => { const d = 1 + Math.round(v * 6) / 2; return `${d} km away: the thunder comes ${d * 3} seconds after the flash.`; } },
      callouts: [[1, 760, 150, 1000, 210], [2, 760, 360, 1010, 400], [3, 760, 640, 990, 720], [4, 1170, 600, 1290, 760], [5, 1120, 940, 1300, 800]],
      setup(st) {
        const A2 = "assets/weather/book/";
        // the storm darkens the painted sky a little
        const sky = document.createElement("div");
        Object.assign(sky.style, { position: "absolute", inset: "0 0 19% 0", background: "linear-gradient(#2b2d48 0%, #3d3f63 55%, rgba(70,70,110,0) 100%)", opacity: .38, pointerEvents: "none" });
        st.under.appendChild(sky);
        const CW = 480, CH = CW * 1101 / 1232, CT = 6, BASE = CT + CH * .96;            // the cloud sprite and where its flat base is
        const cloud = st.sprite(A2 + "storm-cloud.webp", 0, CT, CW, CH, st.under);
        const EAR = [1318, 790], GROUND = 842;                                           // the listener at the window, the meadow
        const xFor = d => 1300 - d * 250;                                                // cloud centre for a storm d km away
        // the bolt goes on the top layer, so the rain and the veil never dim it
        const glow = el("polyline", { fill: "none", stroke: "#ffd84a", "stroke-width": 30, "stroke-linejoin": "round", filter: "url(#bk-soft)", opacity: 0 }, st.ink);
        const branches = [0, 1].map(() => el("polyline", { fill: "none", stroke: "#fff3b8", "stroke-width": 3.4, "stroke-linejoin": "round", opacity: 0 }, st.ink));
        const bolt = el("polyline", { fill: "none", stroke: "#fffbe6", "stroke-width": 7, "stroke-linejoin": "round", "stroke-linecap": "round", opacity: 0 }, st.ink);
        const waves = el("g", {}, st.art);
        const ringEls = [0, 1, 2].map(() => el("circle", { fill: "none", stroke: "#2f2b45", "stroke-width": 4, "stroke-dasharray": "18 14", opacity: 0, filter: "url(#bk-ink)" }, waves));
        const charges = el("g", {}, st.art);
        const sign = (plus) => {
          const g = el("g", { opacity: 0 }, charges);
          el("circle", { r: 15, fill: plus ? "#f6d9cf" : "#d7e3f4", stroke: plus ? "#b33b26" : "#2f5f9e", "stroke-width": 2.4 }, g);
          el("line", { x1: -7, y1: 0, x2: 7, y2: 0, stroke: plus ? "#b33b26" : "#2f5f9e", "stroke-width": 3.4, "stroke-linecap": "round" }, g);
          if (plus) el("line", { x1: 0, y1: -7, x2: 0, y2: 7, stroke: "#b33b26", "stroke-width": 3.4, "stroke-linecap": "round" }, g);
          return { g, plus, fx: rnd(.42, .7), fy: plus ? rnd(.18, .38) : rnd(.72, .88), ph: rnd(0, 6) };
        };
        const signs = [...Array.from({ length: 7 }, () => sign(true)), ...Array.from({ length: 7 }, () => sign(false))];
        const flash = document.createElement("div");
        Object.assign(flash.style, { position: "absolute", inset: 0, background: "#fffdf2", opacity: 0, pointerEvents: "none", mixBlendMode: "screen" });
        st.over.appendChild(flash);
        const boom = el("text", { x: EAR[0] - 120, y: EAR[1] - 120, class: "bk-hand bk-hand-big", opacity: 0, "text-anchor": "middle" }, st.ink);
        boom.textContent = "Boom!";
        const ice = Array.from({ length: 36 }, (_, i) => ({ fx: rnd(.4, .72), ph: rnd(0, Math.PI * 2), sp: rnd(.5, 1.1), sz: rnd(9, 17), v: i % 4 }));
        const rainDrops = Array.from({ length: 90 }, () => ({ fx: rnd(.12, .88), y: rnd(BASE, GROUND), v: rnd(700, 950) }));
        const arrows = {
          1: [st.arrow("M1075,390 C1060,300 1085,220 1070,120", { color: "#9c3b1c" })],
          3: [st.arrow("M880,610 L1010,770")],
          4: [st.arrow("M1110,800 C1170,770 1230,770 1290,785")],
        };
        let dist = 1, target = 1, cx = xFor(1), charge = .55, strikeAt = -1, thunderAt = -1, from = null, flashT = 9, boomT = 9, boomed = null, struck = 1, lastSay = "", lastCount = -1, now = 0;
        const jag = (a, b, depth, spread) => {                                  // a jagged line from a to b, by midpoint displacement
          let pts = [a, b];
          for (let k = 0; k < depth; k++) {
            const next = [pts[0]];
            for (let i = 1; i < pts.length; i++) {
              const p = pts[i - 1], q = pts[i], L = Math.hypot(q[0] - p[0], q[1] - p[1]);
              next.push([(p[0] + q[0]) / 2 + rnd(-1, 1) * L * spread, (p[1] + q[1]) / 2 + rnd(-.3, .3) * L * spread], q);
            }
            pts = next;
          }
          return pts;
        };
        const strike = () => {
          // it strikes the ground under the storm, which is dist km from the cottage (the cottage's rod stays safe)
          const start = [cx + rnd(-.12, .1) * CW, BASE - 8], end = [cx + rnd(-50, 50), GROUND];
          const main = jag(start, end, 5, .22);
          const s = main.map(p => p.map(v => v.toFixed(1)).join(",")).join(" ");
          bolt.setAttribute("points", s); glow.setAttribute("points", s);
          branches.forEach((b, i) => {
            const k = Math.floor(main.length * (.25 + i * .25)), p = main[k];
            b.setAttribute("points", jag(p, [p[0] + (i ? 1 : -1) * rnd(60, 130), p[1] + rnd(60, 120)], 3, .25).map(q => q.join(",")).join(" "));
          });
          from = end; strikeAt = now; struck = dist; thunderAt = now + dist * 3; flashT = 0; charge = 0; lastCount = -1;
        };
        return {
          control(v) { target = 1 + Math.round(v * 6) / 2; },
          step(n) {
            for (const [k, list] of Object.entries(arrows)) for (const a of list) +k === n ? a.draw(900) : a.hide();
            st.spot(n === 4 || n === 5 ? [{ cx: EAR[0], cy: EAR[1] - 40, rx: 220, ry: 160 }, { cx: from ? from[0] : cx, cy: GROUND - 120, rx: 170, ry: 230 }] : null);
            if (n && n <= 3) st.setControl(0);                 // the pointers on the page fit the storm 1 km away
            if (n === 3 && thunderAt < now) charge = 1;
          },
          tick(dt) {
            now += dt;
            // the cloud drifts to where the child put it (only between storms: a strike in flight stays put)
            if (thunderAt < now) dist = target;
            cx = approach(cx, xFor(dist), 2.2, dt);
            cloud.style.left = (cx - CW / 2) / 1536 * 100 + "%";
            // ice and drops thrown up and down inside the cut-open cloud, and the electricity building up
            const g = st.g;
            for (const p of ice) {
              p.ph += dt * p.sp * 1.6;
              const y = CT + CH * (.55 + .32 * Math.sin(p.ph)), x = cx - CW / 2 + CW * (p.fx + .02 * Math.cos(p.ph * 1.7));
              const cold = y < CT + CH * .5;
              g.globalAlpha = .55;
              g.drawImage(st.dab(cold ? "#9db4d6" : "#6f9ad0", p.v), x - p.sz / 2, y - p.sz / 2, p.sz, p.sz);
            }
            // rain under the storm
            g.globalAlpha = .55; g.strokeStyle = "#51608a"; g.lineWidth = 2.4; g.lineCap = "round";
            for (const r of rainDrops) {
              r.y += r.v * dt; if (r.y > GROUND) r.y = BASE + rnd(0, 40);
              const x = cx - CW / 2 + CW * r.fx - (r.y - BASE) * .12;
              g.beginPath(); g.moveTo(x + 4, r.y - 30); g.lineTo(x, r.y); g.stroke();
            }
            g.globalAlpha = 1;
            if (thunderAt < now) charge = Math.min(1, charge + dt / 5.5);
            const shown = Math.round(charge * 7);
            signs.forEach((s, i) => {
              const k = i % 7, on = k < shown;
              const x = cx - CW / 2 + CW * s.fx + Math.sin(now * 2 + s.ph) * 6, y = CT + CH * s.fy + Math.cos(now * 1.7 + s.ph) * 5;
              s.g.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
              s.g.setAttribute("opacity", on ? .95 : 0);
            });
            if (charge >= 1 && thunderAt < now) strike();
            // the flash flickers twice, then fades
            flashT += dt;
            const fl = flashT < .06 ? 1 : flashT < .11 ? .15 : flashT < .17 ? .85 : Math.max(0, 1 - (flashT - .17) / .35);
            for (const e of [bolt, glow, ...branches]) e.setAttribute("opacity", (fl * (e === glow ? .8 : 1)).toFixed(3));
            flash.style.opacity = (fl * .45).toFixed(3);
            // the sound travels from the strike to the listener, arriving exactly dist x 3 seconds later
            if (from && strikeAt >= 0) {
              const L = Math.hypot(EAR[0] - from[0], EAR[1] - from[1]), T = Math.max(.01, thunderAt - strikeAt), r = (now - strikeAt) / T * L;
              ringEls.forEach((c, i) => {
                const rr = r - i * 36;
                c.setAttribute("cx", from[0]); c.setAttribute("cy", from[1]);
                c.setAttribute("r", Math.max(1, rr).toFixed(1));
                c.setAttribute("opacity", rr > 0 && r < L + 120 ? (.55 * (1 - Math.max(0, r - L) / 120)).toFixed(3) : 0);
              });
            }
            if (thunderAt >= 0 && now >= thunderAt && boomed !== strikeAt) { boomT = 0; boomed = strikeAt; }
            boomT += dt;
            boom.setAttribute("opacity", boomT < 1.6 ? Math.min(1, (1.6 - boomT) * 2).toFixed(2) : 0);
            // the count, said out loud
            let say;
            if (strikeAt < 0) say = "The storm cloud is filling up with electricity...";
            else if (now < thunderAt) { const c = Math.floor(now - strikeAt) + 1; if (c !== lastCount) lastCount = c; say = `Flash! Count with me: ${Array.from({ length: c }, (_, i) => i + 1).join("... ")}...`; }
            else if (now < thunderAt + 3) say = `Boom! ${struck * 3} seconds, so the storm is ${struck} km away.`;
            else say = "The storm cloud is filling up with electricity again...";
            if (say !== lastSay) { lastSay = say; st.status(say); }
            st.sig.charge = charge; st.sig.dist = dist;
          }
        };
      }
    }
  });
})(window.MECH_KIT);
