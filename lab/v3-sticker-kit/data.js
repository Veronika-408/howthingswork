// v3 · Sticker kit: LAB_DATA is composed here from three plain files:
//   library/library.js  window.STICKERS  every sticker: file, size, anchor, outline (traced from its alpha)
//   library/regions.js  window.REGIONS   outlines of parts that are regions inside one sticker
//   scenes.js           window.SCENES    every space as a list of placements { s, x, y, k, flip, rot, z }
// Nothing here is drawn: this turns placements into part outlines, dive alignments and asset lists.
(() => {
  const L = window.STICKERS, RG = window.REGIONS, SC = window.SCENES;
  const rad = d => (d || 0) * Math.PI / 180;

  // a placement's transform: sticker pixel (px, py) -> space (X, Y)
  function xf(it) {
    const st = L[it.s], k = it.k == null ? 1 : it.k, f = it.flip ? -1 : 1, c = Math.cos(rad(it.rot)), s = Math.sin(rad(it.rot));
    const [ax, ay] = it.anchor || st.anchor;
    return ([px, py]) => { const u = (px - ax) * f * k, v = (py - ay) * k; return [it.x + u * c - v * s, it.y + u * s + v * c]; };
  }
  // expand groups (a group is a list of placements reused in several spaces; swap replaces a sticker by id)
  function expand(items, sid, out = [], g = { x: 0, y: 0, k: 1 }, swap = {}) {
    for (const it0 of items) {
      if (it0.only && it0.only !== sid) continue;     // a group member shown in one space only
      if (it0.group) {
        const gg = { x: g.x + g.k * it0.x, y: g.y + g.k * it0.y, k: g.k * (it0.k == null ? 1 : it0.k) };
        expand(SC.groups[it0.group], sid, out, gg, { ...swap, ...(it0.swap || {}) });
        continue;
      }
      const it = { ...it0 };
      if (it.id && swap[it.id]) it.s = swap[it.id];
      if (it.sheet) {           // place at its position on its sprite sheet (keeps a painted arrangement)
        const st = L[it.s], src = L[it.sheet === true ? it.s : it.sheet];
        it.x = st.anchor[0] + st.src[0]; it.y = st.anchor[1] + st.src[1];
        if (it.sheet !== true) { it.x = L[it.sheet].anchor[0] + L[it.sheet].src[0]; it.y = L[it.sheet].anchor[1] + L[it.sheet].src[1]; }
      }
      it.x = g.x + g.k * (it.x || 0); it.y = g.y + g.k * (it.y || 0);
      it.k = g.k * (it.k == null ? 1 : it.k);
      it.z = it.z == null ? (it.ground ? -1e9 : it.y) : g.y + g.k * it.z;   // grounds always lie underneath
      if (it.path) it.path = it.path.map(([x, y]) => [g.x + g.k * x, g.y + g.k * y]);
      if (it.s && !L[it.s]) { console.error("sticker kit: no sticker", it.s); continue; }
      out.push(it);
    }
    return out;
  }
  const spaces = {};
  for (const [id, def] of Object.entries(SC.spaces)) {
    const items = expand(def.items || [], id);
    items.forEach((it, i) => { it.n = i; });
    items.sort((a, b) => (a.z - b.z) || (a.n - b.n));
    spaces[id] = { ...def, items, byId: Object.fromEntries(items.filter(i => i.id).map(i => [i.id, i])) };
  }
  // the outline of an inset scene (a child drawn small inside its parent): its frame, mapped
  const insetPoly = it => { const c = SC.spaces[it.scene], [fx, fy, fw, fh] = c.frame || [0, 0, c.w, c.h], k = it.k;
    return [[it.x + k * fx, it.y + k * fy], [it.x + k * (fx + fw), it.y + k * fy], [it.x + k * (fx + fw), it.y + k * (fy + fh)], [it.x + k * fx, it.y + k * (fy + fh)]]; };
  function partPolys(sp, def) {
    const polys = [];
    for (const id of def.ids || []) {
      const it = sp.byId[id]; if (!it) { console.error("sticker kit: no item", id); continue; }
      if (it.scene && it.hit) {   // an inset without a lens: the outline of the child's main sticker, mapped
        const c = spaces[it.scene], ci = c.byId[it.hit], T = xf(ci);
        for (const p of L[ci.s].poly) polys.push(p.map(T).map(([x, y]) => [it.x + it.k * x, it.y + it.k * y]));
        continue;
      }
      if (it.scene) { polys.push(it.lens ? circle(it.lens) : insetPoly(it)); continue; }
      const T = xf(it); for (const p of L[it.s].poly) polys.push(p.map(T));
    }
    for (const [id, name] of def.regions || []) {
      const it = sp.byId[id]; if (!it) { console.error("sticker kit: no item", id); continue; }
      const r = (RG[it.s] || {})[name]; if (!r) { console.error("sticker kit: no region", it.s, name); continue; }
      const T = xf(it); for (const p of r) polys.push(p.map(T));
    }
    if (def.ring) {             // a membrane: the sticker's outline with its inner region cut out
      const it = sp.byId[def.ring], T = xf(it);
      polys.push(L[it.s].poly[0].map(T), RG[it.s].inner[0].map(T).reverse());
    }
    return polys;
  }
  const circle = ([cx, cy, r], n = 40) => Array.from({ length: n }, (_, i) => [cx + r * Math.cos(i / n * 2 * Math.PI), cy + r * Math.sin(i / n * 2 * Math.PI)]);
  // where a child sits in its parent, so the dive lines the two pictures up
  function spot(child) {
    const v = child.via, P = spaces[child.parent];
    if (v.group) {             // the same group of stickers placed in both spaces: exact by construction
      const gp = SC.spaces[child.parent].items.find(i => i.group === v.group), gc = SC.spaces[child.id].items.find(i => i.group === v.group);
      const at = (g, x, y) => [g.x + (g.k || 1) * x, g.y + (g.k || 1) * y];
      return { axis: [at(gp, 0, 0), at(gp, 1000, 0)], plateAxis: [at(gc, 0, 0), at(gc, 1000, 0)] };
    }
    if (v.inset) {             // the child scene drawn small inside the parent: exact by construction
      const it = P.byId[v.inset];
      return { axis: [[it.x, it.y], [it.x + it.k * 1000, it.y]], plateAxis: [[0, 0], [1000, 0]] };
    }
    if (v.match) {             // two points on a parent sticker matched to two points on a child sticker
      const [[pid, a0, a1], [cid, b0, b1]] = v.match, tp = xf(P.byId[pid]), tc = xf(child.byId[cid]);
      return { axis: [tp(a0), tp(a1)], plateAxis: [tc(b0), tc(b1)] };
    }
  }
  const out = { variant: SC.variant, root: SC.root, spaces: {} };
  for (const [id, sp] of Object.entries(spaces)) { sp.id = id; }
  for (const [id, sp] of Object.entries(spaces)) {
    const files = new Set();
    const addFiles = s => { for (const it of s.items) { if (it.s) files.add("library/" + L[it.s].file); if (it.scene) addFiles(spaces[it.scene]); } };
    addFiles(sp);
    const parts = Object.entries(sp.parts || {}).map(([pid, def]) => ({ id: pid, polys: partPolys(sp, def), ...(def.child ? { child: def.child } : {}), ...(def.plus ? { plus: def.plus } : {}) }));
    const o = { w: sp.w, h: sp.h, paper: sp.paper, frame: sp.frame, maxZoom: sp.maxZoom, parts, assets: [], files: [...files], items: sp.items, kit: sp };
    if (sp.kind) o.kind = sp.kind;
    if (sp.dive) o.dive = sp.dive;
    if (sp.parent) { o.parent = sp.parent; o.spot = spot(sp); }
    out.spaces[id] = o;
  }
  window.LAB_DATA = out;
  window.KIT = { xf, L, RG, SC, spaces };
})();
