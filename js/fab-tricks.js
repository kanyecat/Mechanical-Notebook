/* "Ways to make it better" cards for each fabrication technique, drawn as small 3D (isometric) pictures.
   Each card says which process (laser cutting, CNC routing, 3D printing) and which materials it is for.
   To add a card, push { t, x, p, m, tags, g } onto the right list below:
     t     title            x     one or two sentences
     p     process group    m     material group (the card sits under both headings)
     tags  small labels showing every process and material it suits
     g     S => drawing, using the 3D helpers in S (see the top of this file)
   Coordinates: x runs to the lower right, y to the lower left (towards you), z is up. One unit is about a millimetre of drawing.
   Style letters: p = part, a = the feature the card is about (highlighted), k = cut-out or hole. */
(function () {
  const f = n => +n.toFixed(1), K = 1.08, OX = 110, OY = 94, T = 7;
  let curOff = 0;
  const P = (x, y, z) => [OX + (x - y) * 0.866 * K, OY + curOff + (x + y) * 0.5 * K - z * K];
  const pts = a => a.map(q => f(q[0]) + ',' + f(q[1])).join(' ');
  const LV = [-0.35, 0.55, 0.75], LN = Math.hypot(LV[0], LV[1], LV[2]);
  const shade = n => 0.28 + 0.72 * Math.max(0, (n[0] * LV[0] + n[1] * LV[1] + n[2] * LV[2]) / LN);
  const fill = (c, s) => `fill:color-mix(in srgb,var(--c-${c}-hi) ${Math.round(s * 100)}%,var(--c-${c}-lo))`;
  /* Every shape below is stored as a 3D item and returns a short marker. When a card is finished:
     1. holes (S.hole, S.slot, S.engrave) are cut out of the parts drawn before them, and get inner walls and a floor,
     2. lines between touching faces of the same body are removed (one ext, or several shapes wrapped in S.u),
     3. everything is sorted with a BSP tree (split where it crosses) so anything behind another part is fully hidden,
        like a CAD view. Faces get their real edges outlined; seams from splitting are not drawn. */
  let IT = [], BN = 0, CB = 0;
  const reg = it => { IT.push(it); return '\u0001' + (IT.length - 1) + '\u0002'; };
  const face = (v, n, c, smooth, e, b) => reg({ k: 'f', v, n, c: c || 'p', sm: smooth, e: e || v.map(() => true), b: b || CB || ++BN });
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], EPS = 1e-3, VW = [1, 1, 1];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const unit = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const area3 = v => { let x = 0, y = 0, z = 0; v.forEach((a, i) => { const b = v[(i + 1) % v.length]; x += (a[1] - b[1]) * (a[2] + b[2]); y += (a[2] - b[2]) * (a[0] + b[0]); z += (a[0] - b[0]) * (a[1] + b[1]); }); return Math.hypot(x, y, z) / 2; };
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  /* keep the part of an item on the side n·v - d >= 0 (sg = 1) or <= 0 (sg = -1). Edge flags survive; new cut edges get flag cf. */
  const clip = (it, n, d, sg, cf) => {
    const v = it.v, ds = v.map(q => sg * (dot(n, q) - d)); cf = !!cf;
    if (it.k === 'l') {
      const [a, b] = v, da = ds[0], db = ds[1];
      if (da >= -EPS && db >= -EPS) return it; if (da < -EPS && db < -EPS) return null;
      const m = lerp(a, b, da / (da - db)); return Object.assign({}, it, { v: da >= -EPS ? [a, m] : [m, b] });
    }
    const ov = [], oe = [];
    v.forEach((a, i) => {
      const j = (i + 1) % v.length, b = v[j], da = ds[i], db = ds[j], m = () => lerp(a, b, da / (da - db));
      if (da >= -EPS) { if (db >= -EPS) { ov.push(a); oe.push(it.e[i]); } else if (da > EPS) { ov.push(a, m()); oe.push(it.e[i], cf); } else { ov.push(a); oe.push(cf); } }
      else if (db > EPS) { ov.push(m()); oe.push(it.e[i]); }
    });
    return ov.length > 2 && area3(ov) > 1e-4 ? Object.assign({}, it, { v: ov, e: oe }) : null;
  };
  /* the parts of an item outside a convex region (planes with outward normals). A face lying on one of the region's
     planes is left alone; a hole wall lying on the plane of a neighbouring hole is removed where the two holes meet. */
  const diff = (it, planes, wall) => {
    let cur = it; const out = [];
    for (const p of planes) {
      const ds = cur.v.map(q => dot(p.n, q) - p.d);
      if (ds.every(x => Math.abs(x) <= EPS)) { if (wall && dot(p.n, it.n) > 0.99) continue; return [it]; }
      if (ds.every(x => x >= -EPS)) return [it];
    }
    for (const p of planes) {
      const ds = cur.v.map(q => dot(p.n, q) - p.d);
      if (ds.every(x => Math.abs(x) <= EPS)) continue;
      const o = clip(cur, p.n, p.d, 1, true); if (o) out.push(o);
      cur = clip(cur, p.n, p.d, -1, true); if (!cur) break;
    }
    return out;
  };
  const AX = { z: [0, 0, 1], y: [0, 1, 0], x: [1, 0, 0] };
  const map3 = (axis, u, v, a) => axis === 'z' ? [u, v, a] : axis === 'y' ? [u, a, v] : [a, u, v];
  const ccw = poly => { let ar = 0; poly.forEach((p, i) => { const q = poly[(i + 1) % poly.length]; ar += p[0] * q[1] - q[0] * p[1]; }); return ar < 0 ? poly.slice().reverse() : poly; };
  const cen = poly => [poly.reduce((s, q) => s + q[0], 0) / poly.length, poly.reduce((s, q) => s + q[1], 0) / poly.length];
  const prism = (h, poly) => {
    const pl = poly.map((p, i) => { const q = poly[(i + 1) % poly.length], du = q[0] - p[0], dv = q[1] - p[1], l = Math.hypot(du, dv) || 1, n = map3(h.axis, dv / l, -du / l, 0); return { n, d: dot(n, map3(h.axis, p[0], p[1], h.at)) }; });
    const A = AX[h.axis]; pl.push({ n: [-A[0], -A[1], -A[2]], d: -(h.at - h.depth) });
    return pl;
  };
  /* cut a hole group out of everything drawn before it, then add its inner walls and floor */
  const applyHole = (h, L) => {
    const polys = h.polys.map(ccw), A = AX[h.axis], o = h.o || {};
    const grow = (poly, c) => { const ce = o.cc || cen(poly); return poly.map(q => { const dx = q[0] - ce[0], dy = q[1] - ce[1], l = Math.hypot(dx, dy) || 1; return [q[0] + dx / l * c, q[1] + dy / l * c]; }); };
    const top = polys.map(p => o.cham ? grow(p, o.cham) : p), cutP = top.map(p => prism(h, p)), sideP = polys.map(p => prism(h, p));
    for (let i = L.length - 1; i >= 0; i--) {
      const it = L[i]; if (it.k !== 'f') continue;
      let pieces = [it]; cutP.forEach(pl => { pieces = pieces.flatMap(q => diff(q, pl)); });
      L.splice(i, 1, ...pieces);
    }
    polys.forEach((poly, gi) => {
      const N = poly.length, ce = cen(poly);
      const rings = o.cham ? [[top[gi], 0], [poly, o.cham], [poly, h.depth]] : [[poly, 0], [poly, h.depth]];
      if (o.walls !== false) for (let r = 0; r + 1 < rings.length; r++) {
        const [r0, d0] = rings[r], [r1, d1] = rings[r + 1];
        const P3 = (q, d) => map3(h.axis, q[0], q[1], h.at - d);
        const quads = poly.map((_, k) => {
          const k1 = (k + 1) % N, v = [P3(r0[k], d0), P3(r0[k1], d0), P3(r1[k1], d1), P3(r1[k], d1)];
          let n = unit(cross(sub(v[2], v[0]), sub(v[3], v[1])));
          const mid = v.reduce((s, q) => [s[0] + q[0] / 4, s[1] + q[1] / 4, s[2] + q[2] / 4], [0, 0, 0]), c3 = P3(ce, (d0 + d1) / 2);
          if (dot(n, sub(c3, mid)) < 0) n = [-n[0], -n[1], -n[2]];
          return { v, n, vis: dot(n, VW) > 0.05 };
        });
        quads.forEach((q, k) => {
          if (!q.vis) return;
          const ed = j => !quads[j].vis || dot(q.n, quads[j].n) < 0.82, e = [true, ed((k + 1) % N), true, ed((k - 1 + N) % N)];
          let pieces = [{ k: 'f', v: q.v, n: q.n, c: 'w', e, b: h.b, hw: true }];
          sideP.forEach((pl, j) => { if (j !== gi) pieces = pieces.flatMap(w => diff(w, pl, true)); });
          L.push(...pieces);
        });
      }
      if (o.floor !== false) {
        const fv = rings[rings.length - 1][0].map(q => map3(h.axis, q[0], q[1], h.at - h.depth));
        L.push(o.through ? { k: 'f', dec: true, c: 'k', n: A, v: fv, e: fv.map(() => true), b: h.b } : { k: 'f', c: 'w', dim: true, n: A, v: fv, e: fv.map(() => true), b: h.b });
      }
    });
  };
  /* hide edges shared by touching faces of the same body (same colour, same plane) */
  const pip = (p, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
  const seams = L => L.forEach(F => {
    if (F.k !== 'f') return;
    const d0 = dot(F.n, F.v[0]);
    const G = L.filter(g => g !== F && g.k === 'f' && g.b === F.b && g.c === F.c && !!g.dec === !!F.dec && !!g.dim === !!F.dim && dot(g.n, F.n) > 0.999 && Math.abs(dot(F.n, g.v[0]) - d0) < EPS);
    if (!G.length) return;
    const ax = [0, 1, 2].reduce((m, i) => Math.abs(F.n[i]) > Math.abs(F.n[m]) ? i : m, 0), pr = q => [q[(ax + 1) % 3], q[(ax + 2) % 3]];
    const F2 = F.v.map(pr), G2 = G.map(g => g.v.map(pr)), nv = [], ne = [];
    F.v.forEach((a, i) => {
      const b = F.v[(i + 1) % F.v.length];
      if (!F.e[i]) { nv.push(a); ne.push(false); return; }
      const A = pr(a), B = pr(b), r = [B[0] - A[0], B[1] - A[1]], rl = Math.hypot(r[0], r[1]) || 1, ts = [0, 1];
      const cr = (p, q) => p[0] * q[1] - p[1] * q[0];
      G2.forEach(g => g.forEach((C, k) => {
        const D = g[(k + 1) % g.length], sv = [D[0] - C[0], D[1] - C[1]], ca = [C[0] - A[0], C[1] - A[1]], den = cr(r, sv);
        if (Math.abs(den) > 1e-9) { const t = cr(ca, sv) / den, u = cr(ca, r) / den; if (t > 1e-6 && t < 1 - 1e-6 && u > -1e-6 && u < 1 + 1e-6) ts.push(t); }
        else if (Math.abs(cr(ca, r)) < 1e-6 * rl) [C, D].forEach(X => { const t = ((X[0] - A[0]) * r[0] + (X[1] - A[1]) * r[1]) / (rl * rl); if (t > 1e-6 && t < 1 - 1e-6) ts.push(t); });
      }));
      ts.sort((x, y) => x - y);
      let last = null;
      for (let k = 0; k + 1 < ts.length; k++) {
        if (ts[k + 1] - ts[k] < 1e-6) continue;
        const tm = (ts[k] + ts[k + 1]) / 2, M = [A[0] + r[0] * tm, A[1] + r[1] * tm];
        let ox = -r[1] / rl * 0.05, oy = r[0] / rl * 0.05;
        if (pip([M[0] + ox, M[1] + oy], F2)) { ox = -ox; oy = -oy; }
        const show = !G2.some(g => pip([M[0] + ox, M[1] + oy], g));
        if (show !== last) { nv.push(lerp(a, b, ts[k])); ne.push(show); last = show; }
      }
    });
    F.v = nv; F.e = ne;
  });
  const build = list => {
    if (!list.length) return null;
    const sp = list.find(it => it.k !== 'l');
    if (!sp) return { lines: list };
    const n = sp.n, d = dot(n, sp.v[0]), co = [], fr = [], bk = [];
    list.forEach(it => {
      const ds = it.v.map(q => dot(n, q) - d);
      if (ds.every(x => Math.abs(x) <= EPS)) co.push(it);
      else if (ds.every(x => x >= -EPS)) fr.push(it);
      else if (ds.every(x => x <= EPS)) bk.push(it);
      else { const a = clip(it, n, d, 1), b = clip(it, n, d, -1); if (a) fr.push(a); if (b) bk.push(b); }
    });
    return { n, co, f: build(fr), b: build(bk) };
  };
  const walk = (nd, out) => {
    if (!nd) return; if (nd.lines) { out.push(...nd.lines); return; }
    const first = dot(nd.n, VW) >= 0 ? nd.b : nd.f, last = first === nd.b ? nd.f : nd.b;
    walk(first, out); out.push(...nd.co.filter(it => it.k !== 'l'), ...nd.co.filter(it => it.k === 'l')); walk(last, out);
  };
  const edges = it => { let o = ''; it.v.forEach((a, i) => { if (!it.e[i]) return; const b = it.v[(i + 1) % it.v.length], p = P(a[0], a[1], a[2]), q = P(b[0], b[1], b[2]); o += `M${f(p[0])} ${f(p[1])}L${f(q[0])} ${f(q[1])}`; }); return o; };
  const draw = it => {
    const pp = pts(it.v.map(q => P(q[0], q[1], q[2])));
    if (it.k === 'l') return `<polyline class="ln ln-${it.c}" points="${pp}"/>`;
    const ed = edges(it), ep = ed ? `<path class="fe${it.dec ? ' fe-' + it.c : ''}" d="${ed}"/>` : '';
    if (it.dec) return `<polygon class="d d-${it.c}" points="${pp}"/>` + ep;
    const s = fill(it.c, shade(it.n) * (it.dim ? 0.55 : 1)), col = s.slice(5);
    /* cover the hairline gaps along split seams with a stroke of the face colour, stopped short of the outlined edges */
    const nV = it.v.length; let sm = ''; it.v.forEach((a, i) => { if (it.e[i]) return; const b = it.v[(i + 1) % nV], p = P(a[0], a[1], a[2]), q = P(b[0], b[1], b[2]), dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy), s0 = it.e[(i - 1 + nV) % nV] ? 1.2 : 0, s1 = it.e[(i + 1) % nV] ? 1.2 : 0; if (l <= s0 + s1 + 0.2) return; sm += `M${f(p[0] + dx / l * s0)} ${f(p[1] + dy / l * s0)}L${f(q[0] - dx / l * s1)} ${f(q[1] - dy / l * s1)}`; });
    return `<polygon class="ff" style="${s}" points="${pp}"/>` + (sm ? `<path class="fsm" style="stroke:${col}" d="${sm}"/>` : '') + ep;
  };
  /* turn a finished card string (markers + annotations) into SVG */
  const render = str => {
    const used = new Set(); str.replace(/\u0001(\d+)\u0002/g, (_, i) => used.add(+i));
    const L = []; IT.forEach((it, i) => { if (!used.has(i)) return; if (it.k === 'h') applyHole(it, L); else L.push(it); });
    seams(L);
    const out = []; walk(build(L), out);
    return out.map(draw).join('') + str.replace(/\u0001\d+\u0002/g, '');
  };
  const circ = (cx, cy, r, n) => Array.from({ length: n || 28 }, (_, i) => { const a = i / (n || 28) * Math.PI * 2; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; });
  const arc = (cx, cy, r, a0, a1, n) => Array.from({ length: (n || 6) + 1 }, (_, i) => { const a = (a0 + (a1 - a0) * i / (n || 6)) * Math.PI / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; });
  const S = {
    P,
    /* extrude a 2D outline along an axis. axis z: outline in (x,y). axis y: outline in (x,z). axis x: outline in (y,z). */
    ext(poly, axis, a0, a1, c, smooth) {
      const m = (u, v, a) => axis === 'z' ? [u, v, a] : axis === 'y' ? [u, a, v] : [a, u, v];
      const dir = (nu, nv, na) => axis === 'z' ? [nu, nv, na] : axis === 'y' ? [nu, na, nv] : [na, nu, nv];
      let area = 0; poly.forEach((p, i) => { const q = poly[(i + 1) % poly.length]; area += p[0] * q[1] - q[0] * p[1]; });
      const sg = area > 0 ? 1 : -1, out = [];
      out.push({ v: poly.map(p => m(p[0], p[1], a0)), n: dir(0, 0, -1) }, { v: poly.map(p => m(p[0], p[1], a1)), n: dir(0, 0, 1) });
      poly.forEach((p, i) => { const q = poly[(i + 1) % poly.length], eu = q[0] - p[0], ev = q[1] - p[1], l = Math.hypot(eu, ev) || 1; out.push({ v: [m(p[0], p[1], a0), m(q[0], q[1], a0), m(q[0], q[1], a1), m(p[0], p[1], a1)], n: dir(sg * ev / l, -sg * eu / l, 0) }); });
      const vis = out.map(o => o.n[0] + o.n[1] + o.n[2] > 0.05), N = poly.length, b = CB || ++BN;
      /* a side edge is drawn where the outline turns a real corner (more than about 35°), or where a curved surface turns away from view */
      const edge = (k, j) => !vis[2 + j] || dot(out[2 + k].n, out[2 + j].n) < 0.82;
      return out.map((o, i) => {
        if (!vis[i]) return '';
        if (i < 2) return face(o.v, o.n, c || 'p', false, null, b);
        const k = i - 2;
        return face(o.v, o.n, c || 'p', smooth, [true, edge(k, (k + 1) % N), true, edge(k, (k - 1 + N) % N)], b);
      }).join('');
    },
    box: (x, y, z, w, d, h, c) => S.ext([[x, y], [x + w, y], [x + w, y + d], [x, y + d]], 'z', z, z + h, c),
    cyl: (cx, cy, z, r, h, c) => S.ext(circ(cx, cy, r), 'z', z, z + h, c, true),
    hex: (cx, cy, z, af, h, c) => S.ext(circ(cx, cy, af / Math.sqrt(3), 6), 'z', z, z + h, c),
    /* hexagon (nut outline) with across-flats af. flats facing ±x when fx is true, otherwise facing ±y */
    hexP: (cx, cy, af, fx) => Array.from({ length: 6 }, (_, i) => { const a = (i * 60 + (fx ? 30 : 0)) * Math.PI / 180, r = af / Math.sqrt(3); return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }),
    /* several shapes that are one body: lines where they touch on the same plane are not drawn */
    u(fn, id) { const prev = CB; CB = id || ++BN; const r = fn(); CB = prev; return r; },
    /* a new body id, to add more shapes to the same body later with S.u(fn, id) */
    body: () => ++BN,
    /* cut a hole (or a group of convex outlines that make one hole) into whatever was drawn before it.
       axis z: outline in (x,y) on a face looking up at height 'at'. axis y: outline in (x,z) on a face looking towards you at y = at.
       axis x: outline in (y,z) on a face looking right at x = at. depth goes into the part.
       o.through: you can see through it (dark floor). o.cham: chamfer size at the top. o.walls / o.floor: false to leave out. */
    hole: (polys, axis, at, depth, o) => reg({ k: 'h', polys: typeof polys[0][0] === 'number' ? [polys] : polys, axis, at, depth, o: o || {}, b: ++BN }),
    /* a shallow cut (engraving, shallow pocket) */
    engrave: (polys, axis, at, depth) => S.hole(polys, axis, at, depth || 1),
    /* flat shapes drawn on a surface: dec = on a horizontal face at height z, decY = on a face looking towards you at y, decX = on a face looking right at x */
    dec: (poly, z, c) => reg({ k: 'f', dec: true, c: c || 'k', n: [0, 0, 1], v: poly.map(q => [q[0], q[1], z]), e: poly.map(() => true), b: CB || ++BN }),
    decY: (poly, y, c) => reg({ k: 'f', dec: true, c: c || 'k', n: [0, 1, 0], v: poly.map(q => [q[0], y, q[1]]), e: poly.map(() => true), b: CB || ++BN }),
    decX: (poly, x, c) => reg({ k: 'f', dec: true, c: c || 'k', n: [1, 0, 0], v: poly.map(q => [x, q[0], q[1]]), e: poly.map(() => true), b: CB || ++BN }),
    rect: (x, y, w, d) => [[x, y], [x + w, y], [x + w, y + d], [x, y + d]],
    /* a rectangular hole through a plate */
    slot: (sx, sy, sw, sd, z0, t) => S.hole(S.rect(sx, sy, sw, sd), 'z', z0 + t, t, { through: true }),
    /* a plate with a row of rectangular holes along x. Holes all share y range [hy, hy+hd]. open at the front edge when hy+hd = y+d */
    plateRow(x, y, z, w, d, t, holes, hy, hd, c) { return S.u(() => {
      let o = '';
      if (hy > y) o += S.box(x, y, z, w, hy - y, t, c);
      let cx = x; holes.slice().sort((a, b) => a[0] - b[0]).forEach(h => { if (h[0] > cx) o += S.box(cx, hy, z, h[0] - cx, hd, t, c); cx = h[0] + h[1]; });
      if (cx < x + w) o += S.box(cx, hy, z, x + w - cx, hd, t, c);
      if (hy + hd < y + d) o += S.box(x, hy + hd, z, w, y + d - hy - hd, t, c);
      return o;
    }); },
    ln: (a, b, c) => reg({ k: 'l', c: c || 'd', v: [a, b] }),
    arr(a, b) { const p = P(a[0], a[1], a[2]), q = P(b[0], b[1], b[2]), an = Math.atan2(q[1] - p[1], q[0] - p[0]), s = 6; return `<polyline class="ln ln-r" points="${pts([p, q])}"/><polygon class="sv-ar" points="${pts([q, [q[0] - s * Math.cos(an - .45), q[1] - s * Math.sin(an - .45)], [q[0] - s * Math.cos(an + .45), q[1] - s * Math.sin(an + .45)]])}"/>`; },
    _lab: [],
    tx: (x, y, z, s) => { S._lab.push(s); return ''; },
    t: (x, y, s, c, a) => `<text class="sv-${c || 't'}" x="${x}" y="${y}" text-anchor="${a || 'middle'}">${s}</text>`,
    circ, arc, T
  };
  /* a standing wall with tabs underneath (tabs are [x, width]). zw = height of the wall bottom. */
  const wall = (x, y, zw, w, th, H, tabs, tl, c) => tabs.map(q => S.box(q[0], y, zw - tl, q[1], th, tl, 'a')).join('') + S.box(x, y, zw, w, th, H, c || 'p');
  /* dashed guide lines from the corners of each tab down to the matching slot */
  const guides = (tabs, y, th, zt, zs) => tabs.map(q => [[q[0], y], [q[0] + q[1], y], [q[0], y + th], [q[0] + q[1], y + th]].map(c => S.ln([c[0], c[1], zt], [c[0], c[1], zs], 'd')).join('')).join('');
  /* heat-set insert pictures: a block cut open at y = 0 with a half hole of radius r from the top (height H) down to zb */
  const halfD = r => S.arc(0, 0, r, 180, 360, 14);
  const cutaway = (S, r, H, zb, cham) => S.box(-45, -30, 0, 90, 30, H)
    + S.hole(cham ? [S.rect(-r, zb, 2 * r, H - cham - zb), [[-r, H - cham], [r, H - cham], [r + cham, H], [-r - cham, H]]] : S.rect(-r, zb, 2 * r, H - zb), 'y', 0, 30, { walls: false, floor: false })
    + S.hole(halfD(r), 'z', H, H - zb, { cham, cc: [0, 0] });
  /* a sheet with a part cut out of it, held by small bridges (bridges are [x, y, w, d]) */
  const heldPart = (S, sheet, cut, part, bridges, bh) => { const sb = S.body(); return S.u(() => S.box(...sheet), sb) + S.hole(S.rect(...cut), 'z', sheet[2] + sheet[5], sheet[5], { through: true }) + S.box(...part, 'a') + S.u(() => bridges.map(b => S.box(b[0], b[1], sheet[2], b[2], b[3], bh || sheet[5])).join(''), sb); };
  /* living hinge patterns (js/hinge-pattern.js) drawn as dark cut lines on a plate's top face.
     P is a pattern from MN_HINGE; the hinge area is placed with its corner at (ox, oy). */
  const hingeOn = (S, P, ox, oy, z) => {
    const r = window.MN_HINGE ? MN_HINGE.make(Object.assign({ cut: 'line', open: 1, e: 0 }, P)) : { cuts: [] }, w = 0.45;
    return r.cuts.map(c => c.closed ? S.dec(c.pts.map(q => [q[0] + ox, q[1] + oy]), z, 'k')
      : c.pts.slice(1).map((b, i) => { const a = c.pts[i], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l * w, ny = dx / l * w;
        return S.dec([[a[0] + ox + nx, a[1] + oy + ny], [b[0] + ox + nx, b[1] + oy + ny], [b[0] + ox - nx, b[1] + oy - ny], [a[0] + ox - nx, a[1] + oy - ny]], z, 'k'); }).join('')).join('');
  };
  const genLink = o => '../generators/hinges.html#' + encodeURIComponent(JSON.stringify(o));
  const hingeSlide = (t, x, P, o) => ({ t, x, gen: genLink(o), g: S => S.box(-50, -32, 0, 100, 64, 4) + hingeOn(S, Object.assign({ W: 40, H: 64 }, P), -20, -32, 4) + S.arr([-44, 0, 8], [-44, 0, 30]) + S.arr([44, 0, 8], [44, 0, 30]) + S.tx(0, 0, 0, 'both ends fold up along the cuts', 'tr') });
  const SH = 'Any sheet material';
  const LZ = 'Laser cutting', CN = 'CNC routing', PR = '3D printing', ANY = 'Any process';
  const WD = 'Wood and plywood', AC = 'Acrylic', FC = 'Foam board and card', PL = 'PLA, PETG and ABS', FL = 'Flexible and tough: nylon, TPU', AM = 'Any material';
  const T3 = {};

  /* ---------- tab and slot ---------- */
  const tsTabs = [[-40, 14], [26, 14]];
  T3['tab-and-slot'] = { title: 'Ways to make a tab-and-slot joint stronger', intro: 'A plain tab holds a part in place but lets it rock, slide or lift out. These are the usual fixes. Each card says which process and material it suits. Mix them: for example spaced tabs plus a bolt and nut.', items: [
    { t: 'Space two or more tabs far apart', x: 'One tab lets the sheet rock like a seesaw. Two tabs near the ends stop rocking, and the further apart they are the stiffer the joint is.', p: LZ, m: SH, tags: [LZ, CN, 'Plywood', 'MDF', 'Acrylic', 'Foam board'],
      g: S => S.box(-55, -28, 0, 110, 56, T) + S.slot(-40, -4, 14, 8, 0, T) + S.slot(26, -4, 14, 8, 0, T) + guides(tsTabs, -4, 8, T + 18, T) + wall(-50, -4, T + 24, 100, 8, 34, tsTabs, T) + S.ln([-33, 4, T + 62], [33, 4, T + 62], 'r') + S.tx(0, 12, T + 66, 'far apart', 'tr') },
    { t: 'Tabs in both directions', x: 'Tabs along one wall stop sliding along that wall. A neighbouring wall with its tabs at 90° stops sliding the other way. Together the base cannot shift sideways in X or Y.', p: LZ, m: SH, tags: [LZ, CN, 'Plywood', 'MDF', 'Acrylic'],
      g: S => { const a = [[-38, 12], [-2, 12]], b = [[-28, 12], [-2, 12]]; return S.box(-56, -34, 0, 112, 78, T) + S.slot(-38, 22, 12, 8, 0, T) + S.slot(-2, 22, 12, 8, 0, T) + S.slot(44, -28, 8, 12, 0, T) + S.slot(44, -2, 8, 12, 0, T)
        + wall(-50, 22, T + 22, 92, 8, 24, a, T) + S.box(44, -40, T + 22, 8, 66, 24, 'p') + [-28, -2].map(y => S.box(44, y, T + 15, 8, 12, T, 'a')).join('') + S.tx(-8, 36, T + 56, 'A holds X', 'tr') + S.tx(56, -30, T + 50, 'B holds Y', 'tr', 'start'); } },
    { t: 'Hook tab that locks by sliding', x: 'The tab passes through a wide slot, then the sheet slides sideways so the hook sits under the base. It cannot lift straight out. Add a stop or a bolt to keep it from sliding back.', p: LZ, m: SH, tags: [LZ, CN, 'Plywood', 'MDF', 'Acrylic'],
      g: S => S.box(-50, -26, 0, 100, 52, T) + S.slot(-16, -4, 30, 8, 0, T) + S.ext([[-12, T + 22], [-12, T + 8], [14, T + 8], [14, T + 14], [0, T + 14], [0, T + 22]], 'y', -4, 4, 'a') + S.box(-45, -4, T + 22, 55, 8, 36, 'p') + S.arr([4, 14, T + 11], [26, 14, T + 11]) + S.tx(30, 22, T + 10, 'slide', 'tr', 'start') },
    { t: 'Dovetail tab', x: 'Cut the tab wider at its tip than at its neck, and cut the slot as a notch open to the edge of the base. The neck slides along the notch and the wide tip sits under the base, so the sheet cannot be pulled straight up. Both shapes are flat outlines, so a laser can cut them.', p: LZ, m: WD, tags: [LZ, CN, 'Plywood', 'Hardwood', 'MDF'],
      g: S => S.box(-50, -28, 0, 100, 56, T) + S.hole(S.rect(18, -6, 36, 12), 'z', T, T, { through: true }) + S.ln([62, -6, T], [50, -6, T], 'd') + S.ln([62, 6, T], [50, 6, T], 'd') + S.u(() => S.box(62, -14, T, 8, 28, 24, 'a') + S.ext([[-6, T], [6, T], [6, 0], [10, -7], [-10, -7], [-6, 0]], 'x', 62, 70, 'a')) + S.arr([96, 0, T + 30], [74, 0, T + 30]) + S.tx(0, 0, 0, 'neck slides along the open notch', 'tr') + S.tx(0, 0, 0, 'wide tip locks under the base', 'tr') },
    { t: 'T-nut slot (bolt and captive nut)', x: 'Cut a T-shaped slot into the edge of one sheet: a narrow stem for the bolt and a crossbar that holds a square or hex nut. The bolt goes through the other sheet, along the stem and into the nut. Tabs locate the corner, and tightening the bolt pulls it together into a rigid 90° joint that can be taken apart.', p: LZ, m: SH, tags: [LZ, CN, 'Plywood', 'MDF', 'Acrylic (do not overtighten)', 'Aluminium'],
      g: S => { const tc = [[12, 18.5], [20, 18.5], [20, 13], [27, 13], [27, 18.5], [40, 18.5], [40, 25.5], [27, 25.5], [27, 31], [20, 31], [20, 25.5], [12, 25.5]];
        return S.box(40, -34, 0, 7, 62, 44, 'p') + S.decY(tc, 21, 'k') + S.ext([[-30, 0], [40, 0]].concat([5, 4, 3, 2, 1, 0, 11, 10, 9, 8, 7, 6].map(i => tc[i]), [[40, 44], [-30, 44]]), 'y', 21, 28, 'p')
          + S.box(40, 21, 3, 7, 7, 8, 'a') + S.box(40, 21, 33, 7, 7, 8, 'a') + S.box(20, 21, 13, 7, 7, 18, 'a')
          + S.ext(S.circ(24.5, 22, 3, 16), 'x', 12, 47, 'a', true) + S.ext(S.circ(24.5, 22, 6, 22), 'x', 47, 51, 'a', true)
          + S.tx(0, 0, 0, 'bolt through the side sheet', 'tr') + S.tx(0, 0, 0, 'square nut in the T-slot', 'tr'); } },
    { t: 'Corner brackets', x: 'A steel or printed L-bracket screwed to both sheets makes the corner rigid without relying on glue. Tabs still locate the parts accurately, and the bracket carries the load.', p: LZ, m: SH, tags: [LZ, CN, PR, 'Plywood', 'MDF', 'Acrylic', 'Steel brackets'],
      g: S => S.box(-50, -30, 0, 100, 60, T) + S.box(-42, -4, T, 84, 8, 40, 'p') + [-28, 16].map(x => S.ext([[4, T], [26, T], [26, T + 2.5], [6.5, T + 2.5], [6.5, T + 26], [4, T + 26]], 'x', x, x + 12, 'a') + S.hole(S.circ(x + 6, 17, 1.8, 14), 'z', T + 2.5, 2.5, { through: true }) + S.hole(S.circ(x + 6, T + 18, 1.8, 14), 'y', 6.5, 2.5, { through: true })).join('') + S.tx(0, 32, 10, 'L-brackets', 'tr') },
    { t: 'Gusset or brace plate', x: 'A triangular plate with its own tabs and slots fills the corner and stops the upright from folding over. It adds a lot of stiffness for very little material.', p: LZ, m: SH, tags: [LZ, CN, 'Plywood', 'MDF', 'Acrylic', 'Foam board'],
      g: S => S.box(-50, -30, 0, 100, 60, T) + S.box(-42, -4, T, 84, 8, 44, 'p') + S.ext([[4, T], [34, T], [4, T + 32]], 'x', -3.5, 3.5, 'a') + S.ext([[4, T], [34, T], [4, T + 32]], 'x', 28, 35, 'a') + S.tx(0, 36, 12, 'gussets', 'tr') },
    { t: 'Wedge or pin through the tab tip', x: 'Let the tab pass right through the base and cut a slot in its tip. A flat, tapered wedge cut from the same sheet is pushed through the slot and clamps the joint tight. Knock it out to take the joint apart. This is how many knock-down furniture joints work.', p: LZ, m: WD, tags: [LZ, CN, 'Plywood', 'MDF', 'Hardwood'],
      g: S => { const Z = 26; return S.box(-50, -28, Z, 100, 56, T) + S.slot(-8, 14, 16, 8, Z, T) + S.u(() => S.box(-36, 14, 0, 72, 8, Z) + S.box(-8, 14, Z, 16, 8, T + 14)) + S.hole(S.rect(-4, Z + T - 0.5, 8, 7.5), 'y', 22, 8, { through: true }) + S.ext([[-2, 4], [2, 4], [8, 44], [-8, 44]], 'z', Z + T, Z + 2 * T, 'a') + S.arr([20, 60, Z + 12], [20, 42, Z + 12]) + S.tx(0, 0, 0, 'flat wedge through the slot in the tab', 'tr'); } },
    { t: 'Crush ribs for a tight friction fit', x: 'Cut small bumps or springs on the ends of the tab, as part of the same outline, so a laser can make them. They squash a little as the tab goes in, take up variations in the sheet thickness and the kerf, and the joint grips even when your numbers are slightly off. Use on wood and card. Avoid on acrylic, which can crack.', p: LZ, m: WD, tags: [LZ, CN, 'Plywood', 'MDF', 'Cardboard', 'Not for acrylic'],
      slides: [
        { t: 'Pointed bumps', x: 'Small triangles on each end of the tab, a little wider than the slot. The points crush easily, so they suit soft wood and card.',
          g: S => { const z1 = T + 28, z0 = T + 12, L = [[-13, z1], [-13, z0 + 8.5], [-15.6, z0 + 7.2], [-13, z0 + 5.9], [-13, z0 + 4.1], [-15.6, z0 + 2.8], [-13, z0 + 1.5], [-13, z0]], R = L.map(q => [-q[0], q[1]]).reverse(); return S.box(-50, -28, 0, 100, 56, T) + S.slot(-14, -4, 28, 8, 0, T) + S.ln([-13, 4, z0], [-13, 4, T], 'd') + S.ln([13, 4, z0], [13, 4, T], 'd') + S.ext(L.concat(R), 'y', -4, 4, 'a') + S.box(-40, -4, z1, 80, 8, 24, 'p') + S.arr([-26, 16, T + 40], [-26, 16, T + 26]) + S.tx(0, 0, 0, 'pointed bumps (exaggerated)', 'tr'); } },
        { t: 'Round bumps', x: 'Half-round bumps spread the squeeze over a wider area, so they mark the slot less and hold better in hard plywood.',
          g: S => { const z1 = T + 28, z0 = T + 12, L = [[-13, z1]].concat(S.arc(-13, z0 + 7, 1.6, 90, 270, 6), S.arc(-13, z0 + 3, 1.6, 90, 270, 6), [[-13, z0]]), R = L.map(q => [-q[0], q[1]]).reverse(); return S.box(-50, -28, 0, 100, 56, T) + S.slot(-14, -4, 28, 8, 0, T) + S.ln([-13, 4, z0], [-13, 4, T], 'd') + S.ln([13, 4, z0], [13, 4, T], 'd') + S.ext(L.concat(R), 'y', -4, 4, 'a', true) + S.box(-40, -4, z1, 80, 8, 24, 'p') + S.arr([-26, 16, T + 40], [-26, 16, T + 26]) + S.tx(0, 0, 0, 'round bumps (exaggerated)', 'tr'); } },
        { t: 'Spring end', x: 'A thin slit just inside each end of the tab turns the end into a little spring. The bulge pushes against the slot and flexes back instead of crushing, so the joint can be taken apart and refitted.',
          g: S => { const z1 = T + 28, z0 = T + 12, L = [[-13, z1], [-13, z0 + 8], [-14.6, z0 + 5], [-13, z0 + 2], [-13, z0]], R = L.map(q => [-q[0], q[1]]).reverse(); return S.box(-50, -28, 0, 100, 56, T) + S.slot(-14, -4, 28, 8, 0, T) + S.ln([-13, 4, z0], [-13, 4, T], 'd') + S.ln([13, 4, z0], [13, 4, T], 'd') + S.ext(L.concat(R), 'y', -4, 4, 'a') + S.hole([S.rect(-11.4, z0 + 1, 1, 8), S.rect(10.4, z0 + 1, 1, 8)], 'y', 4, 8, { through: true }) + S.box(-40, -4, z1, 80, 8, 24, 'p') + S.arr([-26, 16, T + 40], [-26, 16, T + 26]) + S.tx(0, 0, 0, 'a slit makes each end a spring', 'tr'); } }
      ] },
    { t: 'Round the slot ends', x: 'A square inside corner is where a crack starts, and acrylic is especially prone to it. Give the ends of the slot a small radius (or a tiny circle at each corner) so the stress spreads out. It also helps the tab go in.', p: LZ, m: AC, tags: [LZ, 'Acrylic', 'Plywood', 'MDF'],
      g: S => S.box(-50, -30, 0, 100, 60, T) + S.hole([S.rect(-8, -18, 16, 36)].concat([[-8, -18], [8, -18], [-8, 18], [8, 18]].map(c => S.circ(c[0], c[1], 3.2, 14))), 'z', T, T, { through: true }) + S.tx(0, 34, 6, 'round the corners', 'tr') },
    { t: 'Angled (tapered) tab', x: 'In wood, a tab with a slight slant (about 3° to 5° per side, test your own) leads in easily, then wedges tighter as it goes down, so the joint does not rattle. Cut the slot straight and make only the tab angled. Drawn exaggerated here.', p: LZ, m: WD, tags: [LZ, CN, 'Plywood', 'MDF', 'Hardwood'],
      g: S => S.box(-50, -26, 0, 100, 52, T) + S.slot(-14, -4, 28, 8, 0, T) + S.ln([-10, 4, T + 10], [-10, 4, T], 'd') + S.ln([10, 4, T + 10], [10, 4, T], 'd') + S.ext([[-14, T + 22], [14, T + 22], [10, T + 10], [-10, T + 10]], 'y', -4, 4, 'a') + S.box(-40, -4, T + 22, 80, 8, 26, 'p') + S.arr([0, 16, T + 62], [0, 16, T + 50]) + S.tx(0, 0, 0, 'tip narrower than the slot', 'tr') },
    { t: 'Chamfered tab corners', x: 'Cut the bottom corners of each tab at an angle. The tab finds the slot without catching, and it does not tear out wood fibres at the entrance. Plywood especially benefits.', p: LZ, m: WD, tags: [LZ, CN, 'Plywood', 'MDF', 'Hardwood'],
      g: S => S.box(-50, -26, 0, 100, 52, T) + S.slot(-14, -5, 28, 10, 0, T) + S.ext([[-14, T + 12], [-14, T + 6], [-11, T + 3], [11, T + 3], [14, T + 6], [14, T + 12]], 'y', -5, 5, 'a') + S.box(-40, -5, T + 12, 80, 10, 28, 'p') + S.arr([0, 14, T + 62], [0, 14, T + 44]) },
    { t: 'Leave clearance when 3D printing', x: 'Printed slots come out slightly tight and printed tabs slightly fat. Draw the slot about 0.2 to 0.3 mm wider than the tab (test your printer), and print the tab flat so its layers run along its length.', p: PR, m: PL, tags: [PR, 'PLA', 'PETG', 'ABS'],
      g: S => S.box(-50, -26, 0, 100, 52, 9) + S.slot(-13, -5, 26, 10, 0, 9) + S.ln([-12, 4, 18], [-12, 4, 9], 'd') + S.ln([12, 4, 18], [12, 4, 9], 'd') + S.box(-12, -4, 18, 24, 8, 9, 'a') + [0, 1, 2].map(i => S.ln([-12, 4, 20 + i * 3], [12, 4, 20 + i * 3], 'd')).join('') + S.box(-36, -4, 27, 72, 8, 30, 'p') + S.tx(0, 22, 4, 'gap about 0.2 to 0.3 mm', 'tr') },
    { t: 'Glue acrylic with solvent cement', x: 'Acrylic tabs hold best when you run solvent cement along the joint. It flows into the gap and welds the two sheets, so the tab does not need to be a press fit, which would risk cracking.', p: LZ, m: AC, tags: [LZ, 'Acrylic'],
      g: S => S.box(-50, -26, 0, 100, 52, T) + S.slot(-16, -5, 32, 10, 0, T) + S.ln([-16, 5, T + 22], [-16, 5, T], 'd') + S.ln([16, 5, T + 22], [16, 5, T], 'd') + S.box(-16, -5, T + 22, 32, 10, T, 'a') + S.ln([-16, -6, T], [16, -6, T], 'r') + S.ln([-16, 6, T], [16, 6, T], 'r') + S.box(-45, -5, 2 * T + 22, 90, 10, 24, 'p') + S.tx(24, 14, T, 'cement', 'tr', 'start') }
  ] };

  /* ---------- press fit ---------- */
  const blockHole = (S, pinFn, holeFn, cap) => S.box(-45, -35, 0, 90, 70, 16) + holeFn(S) + S.ln([0, 0, 52], [0, 0, 16], 'd') + pinFn(S) + S.arr([30, 0, 64], [30, 0, 48]);
  T3['press-fit'] = { title: 'Solving press-fit problems for each shape', intro: 'Round holes press nicely. Other shapes concentrate the squeeze at their corners, and printers and cutters do not make sharp corners. These fixes keep the squeeze on the faces, where you want it.', items: [
    { t: 'Round: the squeeze is even', x: 'A round pin in a round hole is the easy case. Every point is squeezed by the same amount, so a single interference number works. Use it whenever you can.', p: ANY, m: AM, tags: [LZ, CN, PR, 'Any material'],
      g: S => blockHole(S, S => S.cyl(0, 0, 38, 11.3, 24, 'a'), S => S.hole(S.circ(0, 0, 11, 28), 'z', 16, 12)) },
    { t: 'Square: the corners grip hardest', x: 'The diagonal of a square is 1.41 times its side, so a small oversize on the side becomes a bigger squeeze at the corners. Round or chamfer the corners of the pin.', p: ANY, m: AM, tags: [LZ, CN, PR, 'Any material'],
      g: S => blockHole(S, S => S.ext([[-8, -10], [8, -10], [10, -8], [10, 8], [8, 10], [-8, 10], [-10, 8], [-10, -8]], 'z', 38, 62, 'a'), S => S.hole(S.rect(-10, -10, 20, 20), 'z', 16, 12)) + S.tx(0, 0, 0, 'chamfer the corners of the pin', 'tr') },
    { t: '3D printing: sharp corners come out round', x: 'A nozzle cannot turn a sharp inside corner, so a printed square hole has rounded corners. A pin with sharp corners then jams in the corners and splits the part.', p: PR, m: PL, tags: [PR, 'PLA', 'PETG', 'ABS'],
      g: S => { const rr = [].concat(S.arc(7, 7, 3, 0, 90, 4), S.arc(-7, 7, 3, 90, 180, 4), S.arc(-7, -7, 3, 180, 270, 4), S.arc(7, -7, 3, 270, 360, 4)); return blockHole(S, S => S.box(-10, -10, 38, 20, 20, 24, 'a'), S => S.hole(rr, 'z', 16, 12)) + S.tx(0, 0, 0, 'printed hole: round corners', 'tr'); } },
    { t: 'Fix: tiny holes in the corners', x: 'Put a small round hole (about the size of the nozzle or a little more) at each inside corner of a square hole. The sharp corners of the pin then have somewhere to go. This one trick is the most common fix for printed press fits.', p: PR, m: PL, tags: [PR, 'PLA', 'PETG', 'ABS', CN + ' (dog-bones)'],
      g: S => blockHole(S, S => S.box(-10, -10, 38, 20, 20, 24, 'a'), S => S.hole([S.rect(-10, -10, 20, 20)].concat([[-10, -10], [10, -10], [-10, 10], [10, 10]].map(c => S.circ(c[0], c[1], 2.6, 12))), 'z', 16, 12)) },
    { t: 'Rectangular tab in a slot: only the thickness grips', x: 'Press only on the faces of the sheet. Make the slot a little longer than the tab so the ends and corners never touch. Then the only interference is across the thickness.', p: LZ, m: SH, tags: [LZ, CN, 'Plywood', 'MDF', 'Acrylic'],
      g: S => S.box(-50, -28, 0, 100, 56, T) + S.slot(-22, -4, 44, 8, 0, T) + S.ln([-18, -4, T + 22], [-18, -4, T], 'd') + S.ln([18, 4, T + 22], [18, 4, T], 'd') + S.box(-19, -4, T + 22, 38, 8, T, 'a') + S.box(-40, -4, T + 22 + T, 80, 8, 20, 'p') + S.tx(0, 20, T, 'room at the ends', 'tr') },
    { t: 'Crush ribs round a hole', x: 'Instead of one tight diameter, print small ribs inside the hole. Only the tips of the ribs are squeezed, so the part self-centres and the squeeze matters less. Works with any shape.', p: PR, m: PL, tags: [PR, 'PLA', 'PETG', 'ABS', 'Wood (cut ribs)'],
      g: S => { const bb = S.body(); return S.u(() => S.box(-45, -35, 0, 90, 70, 16), bb) + S.hole(S.circ(0, 0, 12.5, 28), 'z', 16, 12) + S.u(() => [0, 1, 2, 3, 4, 5].map(i => { const a = i * Math.PI / 3 + 0.4, c = Math.cos(a), sn = Math.sin(a); return S.ext([[c * 12.9 - sn * 2, sn * 12.9 + c * 2], [c * 9.8, sn * 9.8], [c * 12.9 + sn * 2, sn * 12.9 - c * 2]], 'z', 4, 16, 'p'); }).join(''), bb) + S.ln([0, 0, 52], [0, 0, 16], 'd') + S.cyl(0, 0, 38, 10, 24, 'a') + S.arr([30, 0, 64], [30, 0, 48]); } },
    { t: 'Split or slotted pin', x: 'A spring (roll) pin is a tube with a slit along its side. The slit lets it squeeze smaller as it goes in, then it springs back and grips the hole. It forgives a lot of tolerance error. Buy them in steel, or print one in a material that flexes (PETG, nylon).', p: PR, m: FL, tags: [PR, 'Nylon', 'PETG', 'TPU'],
      g: S => { const a = Math.PI / 4, c = Math.cos(a), sn = Math.sin(a), w = 1.4, sl = [[c * 6 - sn * w, sn * 6 + c * w], [c * 12 - sn * w, sn * 12 + c * w], [c * 12 + sn * w, sn * 12 - c * w], [c * 6 + sn * w, sn * 6 - c * w]]; return blockHole(S, S => S.cyl(0, 0, 38, 10.4, 26, 'a') + S.hole([S.circ(0, 0, 7.6, 28), sl], 'z', 64, 26, { through: true }), S => S.hole(S.circ(0, 0, 10, 28), 'z', 16, 12)) + S.tx(0, 0, 0, 'tube with a slit along its side', 'tr'); } }
  ] };

  /* ---------- finger joint ---------- */
    T3['finger-joint'] = { title: 'Making finger joints stronger and neater', intro: 'Finger (box) joints suit sheet wood and acrylic cut on a laser or CNC. They also work on printed panels.', items: [
    { t: 'Use an odd number of fingers', x: 'With an odd count, both ends of an edge belong to the same board, so the corner finishes flush. An even count leaves a gap at one end.', p: LZ, m: SH, tags: [LZ, CN, 'Plywood', 'MDF', 'Acrylic'],
      g: S => { const n = 7, w = 98 / n; let a = '', b = ''; a = S.u(() => { let o = S.box(-49, -30, 0, 98, 56, T); for (let i = 0; i < n; i += 2) o += S.box(-49 + i * w, 26, 0, w, 8, T); return o; }); for (let i = 1; i < n; i += 2) b += S.ln([-49 + i * w, 34, T + 13], [-49 + i * w, 34, T], 'd') + S.ln([-49 + (i + 1) * w, 34, T + 13], [-49 + (i + 1) * w, 34, T], 'd') + S.box(-49 + i * w, 26, 20, w, 8, T, 'a'); return a + b + S.box(-49, 26, 20 + T, 98, 8, 34, 'p') + S.tx(0, 44, 0, '7 fingers: ends match', 'tr'); } },
    { t: 'Dovetail fingers lock against pulling', x: 'Fingers that are wider at the tip than at the root cannot be pulled straight apart. Cut them with a dovetail angle and the joint holds without glue in one direction. Best in wood.', p: LZ, m: WD, tags: [LZ, CN, 'Plywood', 'Hardwood'],
      g: S => { let b = ''; const a = S.u(() => S.box(-46, 4, 0, 92, 30, T) + [-26, 0, 26].map(x => S.ext([[x - 4, 4], [x + 4, 4], [x + 6.5, -6], [x - 6.5, -6]], 'z', 0, T)).join('')); [-13, 13].forEach(x => { b += S.ext([[x - 6.5, -6], [x + 6.5, -6], [x + 9, 4], [x - 9, 4]], 'z', 20, 20 + T, 'a') + S.ln([x - 9, 4, 20], [x - 9, 4, T], 'd') + S.ln([x + 9, 4, 20], [x + 9, 4, T], 'd'); }); return a + b + S.box(-30, -36, 20, 60, 30, T, 'p') + S.arr([0, -20, 46], [0, -20, 32]); } },
    { t: 'Fingers slightly proud, then sand flush', x: 'Cut each finger a little longer than the thickness of the board it fits into (about 0.2 to 0.5 mm), then sand the corner flush after gluing. The joint looks seamless and any kerf error is hidden.', p: LZ, m: WD, tags: [LZ, CN, 'Plywood', 'MDF', 'Hardwood'],
      g: S => { const n = 7, w = 98 / n; let b = ''; const a = S.u(() => { let o = S.box(-49, -30, 0, 98, 56, T); for (let i = 0; i < n; i += 2) o += S.box(-49 + i * w, 26, 0, w, 10, T); return o; }); for (let i = 1; i < n; i += 2) b += S.box(-49 + i * w, 26, -2, w, 8, T + 2, 'a'); return a + b + S.box(-49, 26, T, 98, 8, 36, 'p') + S.arr([60, 40, 3], [45, 36, 3]) + S.tx(52, 52, 0, 'sand flush', 'tr', 'start'); } }
  ] };

  /* ---------- captive nut ---------- */
  T3['captive-nut'] = { title: 'Holding the nut in place', intro: 'These work for any thread size. Make the pocket about 0.3 mm bigger than the nut across the flats.', items: [
    { t: 'Slide-in slot', x: 'Cut the pocket as a slot open to the edge of the part. The nut slides in from the side, and the bolt then locks it in place. No pausing the print or covering the pocket.', p: LZ, m: SH, tags: [LZ, CN, PR, 'Plywood', 'Acrylic', 'PLA', 'PETG'],
      g: S => S.box(-50, -30, 0, 100, 60, 20) + S.hole(S.rect(-7.3, 7, 14.6, 6), 'y', 30, 38) + S.hole(S.circ(0, 0, 3.5, 16), 'z', 20, 20, { through: true }) + S.ln([0, 0, 20], [0, 0, 44], 'r') + S.ext(S.hexP(0, 46, 14, true), 'z', 7, 13, 'a') + S.arr([20, 52, 10], [20, 36, 10]) + S.tx(16, 46, 22, 'nut slides in from the side', 'tr', 'start') },
    { t: 'Pause the print and cover the nut', x: 'For a pocket with no open side, pause the printer at the pocket top, drop the nut in and resume. The next layers bridge across and cover it. Add one thin sacrificial layer so the bridge sags less.', p: PR, m: PL, tags: [PR, 'PLA', 'PETG', 'ABS'],
      g: S => S.box(-40, -30, 0, 80, 60, 24) + S.hole(S.hexP(0, 0, 14.6, true), 'z', 24, 8) + S.hole(S.circ(0, 0, 3.5, 16), 'z', 16, 16, { through: true }) + S.ext(S.hexP(0, 0, 14, true), 'z', 16, 22, 'a') + S.box(-14, -12, 36, 28, 24, 1.5, 'a') + S.ln([-14, 12, 36], [-14, 12, 24], 'd') + S.ln([14, 12, 36], [14, 12, 24], 'd') + S.arr([0, 0, 58], [0, 0, 42]) + S.tx(0, 24, 40, 'layers bridge over the nut', 'tr', 'start') },
    { t: 'Little bumps stop the nut falling out', x: 'Two tiny bumps on the sides of the pocket pinch the nut so it stays put while you turn the part over and start the bolt.', p: PR, m: PL, tags: [PR, 'PLA', 'PETG', 'ABS'],
      g: S => { const bb = S.body(); return S.u(() => S.box(-50, -30, 0, 100, 60, 10), bb) + S.hole(S.rect(-9.5, -7.5, 19, 15), 'z', 10, 6) + S.u(() => S.ext([[-9.5, -2.5], [-7.8, 0], [-9.5, 2.5]], 'z', 4, 10) + S.ext([[9.5, -2.5], [9.5, 2.5], [7.8, 0]], 'z', 4, 10), bb) + S.ext(S.hexP(0, 0, 14, false), 'z', 26, 32, 'a') + S.ln([0, 0, 26], [0, 0, 10], 'd') + S.arr([0, 0, 52], [0, 0, 36]) + S.tx(0, 30, 6, 'bumps pinch the nut', 'tr'); } }
  ] };

  /* ---------- heat-set insert (cutaway: the front half of the block is removed so you can see inside) ---------- */
        T3['heat-set-insert'] = { title: 'Getting a clean, strong insert', intro: 'Heat-set inserts melt into thermoplastic, so these suit 3D prints in PLA, PETG, ABS and nylon. The pictures cut the block open so you can see inside.', items: [
    { t: 'Leave extra depth below the insert', x: 'Melted plastic is pushed down as the insert goes in. Make the hole a little deeper than the insert so that plastic has room, and the insert does not stop short.', p: PR, m: PL, tags: [PR, 'PLA', 'PETG', 'ABS', 'Nylon'],
      g: S => cutaway(S, 9.4, 44, 8) + S.ext(halfD(9.4), 'z', 16, 44, 'a', true) + S.arr([22, -4, 20], [22, -4, 9]) + S.tx(24, 0, 20, 'extra depth', 'tr', 'start') },
    { t: 'Chamfer the hole mouth', x: 'A small chamfer at the top of the hole gives displaced plastic somewhere to go. Without it the plastic can rise into a ridge around the insert and stop a mating part sitting flat.', p: PR, m: PL, tags: [PR, 'PLA', 'PETG', 'ABS', 'Nylon'],
      g: S => cutaway(S, 9.4, 44, 8, 5) + S.ext(halfD(9.4), 'z', 14, 42, 'a', true) + S.tx(0, 8, 52, 'chamfer', 'tr') },
    { t: 'Give it a thick boss', x: 'A wall about as thick as the insert is wide keeps the hot plastic from bulging or splitting. If the insert has to be near an edge, add a boss around it.', p: PR, m: PL, tags: [PR, 'PLA', 'PETG', 'ABS', 'Nylon'],
      g: S => S.box(-50, -30, 0, 100, 60, 5) + S.cyl(0, 0, 5, 22, 30, 'p') + S.hole(S.circ(0, 0, 9.4, 28), 'z', 35, 22) + S.ln([9.4, 0, 35], [22, 0, 35], 'r') + S.tx(26, 4, 38, 'thick wall', 'tr', 'start') },
    { t: 'Press it flush with a flat tool', x: 'Finish by pressing the insert in with a flat plate, or the side of the iron, so it ends exactly level with the surface. Let it cool before you load it.', p: PR, m: PL, tags: [PR, 'PLA', 'PETG', 'ABS', 'Nylon'],
      g: S => cutaway(S, 9.4, 30, 6) + S.ext(halfD(9.4), 'z', 8, 36, 'a', true) + S.box(-32, -30, 48, 64, 30, 4, 'a') + S.arr([0, -10, 70], [0, -10, 56]) }
  ] };

  /* ---------- snap fit ---------- */
  const snapWall = S => S.box(-50, -10, 0, 8, 20, 64, 'p');
  T3['snap-fit'] = { title: 'Making snap fits last', intro: 'Snap fits are for 3D prints. Pick a material that flexes: PETG, ABS and nylon forgive more than PLA.', items: [
    { t: 'Taper the beam', off: 24, x: 'Make the beam thick at the root and thinner at the tip. The bend then spreads along the whole length instead of concentrating at the root. A tip half as thick takes roughly 40% less strain than a straight beam.', p: PR, m: PL, tags: [PR, 'PLA', 'PETG', 'ABS', 'Nylon'],
      g: S => snapWall(S) + S.ext([[-42, 26], [30, 31], [30, 48], [20, 40], [-42, 42]], 'y', -10, 10, 'a') + S.tx(-2, 14, 20, 'thick root, thin tip', 'tr') },
    { t: 'Round the root', off: 24, x: 'A sharp corner where the beam meets the wall is where it cracks. A generous fillet there spreads the stress. Use a radius of about half the beam thickness or more.', p: PR, m: PL, tags: [PR, 'PLA', 'PETG', 'ABS', 'Nylon'],
      g: S => S.ext([[-50, 0], [-42, 0], [-42, 20]].concat(S.arc(-34, 20, 8, 180, 90, 6), [[30, 28], [30, 36], [-34, 36]], S.arc(-34, 44, 8, 270, 180, 6), [[-42, 64], [-50, 64]]), 'y', -10, 10, 'p') + S.tx(0, 10, 56, 'rounded root', 'tr') },
    { t: 'Gentle in, steep out', off: 24, x: 'A shallow lead-in ramp (about 20° to 30°) makes the part easy to push in. A steep back face (up to 90°) makes it hard to pull out. Make the back face gentler if the part must come apart again.', p: PR, m: PL, tags: [PR, 'PLA', 'PETG', 'ABS', 'Nylon'],
      g: S => snapWall(S) + S.ext([[-42, 28], [34, 28], [34, 36], [4, 50], [4, 36], [-42, 36]], 'y', -10, 10, 'a') + S.tx(10, 12, 54, 'steep back face', 'tr') },
    { t: 'Print the layers along the beam', x: 'Layers that run along the beam are strong in bending. Layers that cross the beam can peel apart at the first snap. Orient the part on the bed so the beam lies flat.', p: PR, m: PL, tags: [PR, 'PLA', 'PETG', 'ABS', 'Nylon'],
      g: S => S.box(-42, -8, 42, 84, 16, 9, 'a') + [0, 1, 2].map(i => S.ln([-42, 8, 44 + i * 3], [42, 8, 44 + i * 3], 'd')).join('') + S.tx(0, 20, 48, 'layers along: strong', 'tr') + S.box(-42, -8, 6, 84, 16, 9, 'p') + [0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => S.ln([-38 + i * 9.5, 8, 6], [-38 + i * 9.5, 8, 15], 'd')).join('') + S.tx(0, 20, 8, 'layers across: weak', 'tr') }
  ] };

  /* ---------- living hinge ---------- */
  T3['living-hinge'] = { title: 'More ways to make a hinge from one piece', intro: 'A hinge made from a single piece works differently in each material. Pick the card for your process.', items: [
    { t: 'Cut patterns that let a sheet bend', x: 'A stiff sheet bends where rows of cuts are made across it. The patterns below follow tested lattice hinges, from the most reliable to the most flexible. Use the arrows to compare them, then open one in the living hinge generator to set the sizes, check it will bend far enough, and download it. Basswood is the most forgiving, birch plywood works well across the grain, MDF is consistent but more fragile. Cast acrylic works only with wide patterns and gentle bends. Thinner sheet (about 3 mm) bends far more easily.', p: LZ, m: WD, tags: [LZ, CN, 'Basswood', 'Birch plywood', 'MDF', 'Cast acrylic (wide patterns)'],
      slides: [
        hingeSlide('Straight lattice · the most reliable', 'Rows of straight slits, each row shifted half a step. It bends by twisting the springs between the slits. Longer cuts, narrower springs and thinner sheet bend further.', { pat: 'straight', L: 14, g: 3, d: 3 }, { pat: 'straight' }),
        hingeSlide('Meander · very flexible', 'Slots cut alternately from the top and the bottom edge leave one long zig-zag spring. Simple and very flexible along a strip, but weak if pulled.', { pat: 'meander', g: 4, d: 4 }, { pat: 'meander' }),
        hingeSlide('Torsion links', 'H-shaped cuts in columns leave short bars that twist. Shorter links (more H shapes in each column) are stiffer; more columns bend further.', { pat: 'torsion', L: 10, g: 2.5, d: 6.6, bar: 1.6 }, { pat: 'torsion' }),
        hingeSlide('Wave lattice', 'Each slit has an S-shaped step in the middle. In testing it bent one way well for such short springs, but not in two directions.', { pat: 'wave', L: 14, g: 3, d: 3.6, amp: 1.2 }, { pat: 'wave' }),
        hingeSlide('Cross lattice · the most flexible', 'Slits with a fork at each end. The most flexible lattice in testing; in thin sheet it can even bend a little on a diagonal.', { pat: 'cross', L: 12, g: 5, d: 4, fork: 1.6 }, { pat: 'cross' }),
        hingeSlide('Fillet lattice', 'Closed cut-outs with round ends and a narrow waist. Rounded corners spread the twisting stress, where sharp corners would start a crack.', { pat: 'fillet', L: 12, g: 3, d: 5, dw: 3.2, neck: 1.2 }, { pat: 'fillet' }),
        hingeSlide('Diamonds', 'Closed diamonds: decorative, stretch a little and follow gentle double curves, but stiffer than slits of the same size.', { pat: 'diamond', L: 10, g: 2, d: 4, dw: 2.6 }, { pat: 'diamond' }),
        hingeSlide('Beehive · the least flexible', 'Hexagons look as if they should bend both ways, but in testing this was the stiffest lattice: the springs between cells are very short. Use it as a decorative panel.', { pat: 'hive', hs: 7, hw: 1.6 }, { pat: 'hive' }),
        { t: 'Test sheet: one size changed', x: 'Cut several strips that change one size, for example the link length, then bend each one and keep the one that feels right in your sheet. The generator makes this sheet for you, with each strip engraved.', gen: genLink({ pat: 'torsion', out: 'sheet', vary: 'L', vals: '5, 10, 20, 30', W: 30 }),
          g: S => [4, 6, 9, 13].map((L, i) => { const y = -36 + i * 18; return S.box(-50, y, 0, 100, 14, 3) + hingeOn(S, { pat: 'torsion', W: 40, H: 14, L, g: 2, d: 6.6, bar: 1.6 }, -20, y, 3); }).join('') + S.tx(0, 0, 0, 'four link lengths side by side', 'tr') }
      ] },
    { t: 'Print-in-place pin hinge', x: 'A pin printed inside a barrel with a gap of about 0.3 to 0.5 mm (test on your printer) moves freely straight off the bed. No assembly, and it can handle thousands of turns.', p: PR, m: PL, tags: [PR, 'PLA', 'PETG', 'ABS'],
      g: S => S.u(() => S.box(-46, -20, 8, 38, 16, 5, 'p') + S.ext(S.circ(0, 11, 11, 28), 'y', -20, -4, 'p', true)) + S.u(() => S.box(8, 4, 8, 38, 16, 5, 'p') + S.ext(S.circ(0, 11, 11, 28), 'y', 4, 20, 'p', true)) + S.hole(S.circ(0, 11, 8, 24), 'y', 20, 16, { through: true }) + S.ext(S.circ(0, 11, 7.4, 22), 'y', -4, 20, 'a', true) + S.tx(0, 32, 8, 'gap about 0.3 to 0.5 mm', 'tr') },
    { t: 'Print the strip flat on the bed', x: 'Print the hinge flat and open with the layers running along the strip, then bend it. A strip printed standing up has layer lines across the bend and breaks. PETG, nylon and TPU handle repeated bending; PLA only a few.', p: PR, m: FL, tags: [PR, 'PETG', 'Nylon', 'TPU', 'PLA (few bends)'],
      g: S => S.box(-60, -34, -2, 120, 68, 2, 'g') + S.box(-52, -20, 0, 46, 40, 6, 'p') + S.box(6, -20, 0, 46, 40, 6, 'p') + S.box(-6, -20, 0, 12, 40, 1.4, 'a') + [0, 1, 2, 3, 4].map(i => S.ln([-6, -20 + i * 10, 1.4], [6, -20 + i * 10, 1.4], 'd')).join('') + S.tx(0, 30, -4, 'print bed', 'tr') + S.tx(0, 36, 8, 'thin strip', 'tr') },
    { t: 'Tape or fabric over a V-groove', x: 'Cut a V-groove in thick card or foam board and put tape or fabric across the outside. The groove closes as it folds and the tape does the hinging. Simple and cheap to prototype.', p: LZ, m: FC, tags: [LZ, 'Foam board', 'Cardboard', 'Thick card'],
      g: S => S.ext([[-46, 0], [-6, 0], [0, 11], [6, 0], [46, 0], [46, 12], [-46, 12]], 'y', -22, 22, 'p') + S.box(-12, -22, 12, 24, 44, 0.8, 'a') + S.tx(0, 32, 6, 'tape on top of the fold', 'tr') }
  ] };

  /* ---------- laser kerf ---------- */
  T3['laser-kerf'] = { title: 'Dealing with kerf in practice', intro: 'Kerf is the width of material the laser burns away. It is different for every material, lens and speed, so measure it.', items: [
    { t: 'Cut a kerf test comb', x: 'Cut a row of slots of known drawn widths, then slide a piece of your sheet into each. Pick the one that fits the way you want and use that width. It takes two minutes and beats any table.', p: LZ, m: SH, tags: [LZ, 'Plywood', 'MDF', 'Acrylic', 'Foam board'],
      g: S => S.box(-52, -26, 0, 104, 52, T) + [0, 1, 2, 3, 4].map(i => S.slot(-44 + i * 20, -16, 4 + i * 1.4, 32, 0, T)).join('') + S.box(18, 28, 0, 28, 7, 7, 'a').slice(0, 0) + S.box(-30, 36, T + 2, 34, 7, T, 'a') + S.arr([-14, 36, T + 18], [-14, 20, T + 8]).slice(0, 0) + S.tx(0, 44, 2, 'slot gets wider: find the snug one', 'tr') },
    { t: 'Add spring slits beside a slot', x: 'Plywood and MDF vary in thickness. Thin slits just beside a slot turn its walls into little springs, so the joint grips whether the sheet is a little thick or a little thin. Not for acrylic, which could crack.', p: LZ, m: WD, tags: [LZ, CN, 'Plywood', 'MDF', 'Not acrylic'],
      g: S => S.box(-50, -30, 0, 100, 60, T) + S.slot(-6, -16, 12, 32, 0, T) + S.slot(-15, -12, 2, 24, 0, T) + S.slot(13, -12, 2, 24, 0, T) + S.tx(0, 40, 4, 'springy walls', 'tr') },
    { t: 'Leave tiny bridges so parts stay put', x: 'Cut small inside shapes first and the outline last. Leave a few tiny bridges (micro-joints) on the outline so the part does not drop or shift, then snap them off and sand.', p: LZ, m: SH, tags: [LZ, 'Plywood', 'MDF', 'Acrylic', 'Card'],
      g: S => heldPart(S, [-50, -34, 0, 100, 68, T], [-26, -22, 52, 44], [-24, -20, 0, 48, 40, T], [[-3, -22, 6, 2], [-3, 20, 6, 2], [-26, -3, 2, 6], [24, -3, 2, 6]]) + S.tx(0, 44, 0, 'bridges hold the part', 'tr') }
  ] };

  /* ---------- print tolerances ---------- */
  T3['print-tolerances'] = { title: 'Printing tricks that fix real problems', intro: 'These are all for FDM 3D printing in PLA, PETG or ABS.', items: [
    { t: 'Teardrop holes for sideways holes', x: 'A round hole printed on its side sags at the top because there is nothing under it. Pointing the top into a teardrop makes the steepest overhang about 45°, so it prints cleanly with no supports.', p: PR, m: PL, tags: [PR, 'PLA', 'PETG', 'ABS'],
      g: S => S.box(-46, -16, 0, 92, 32, 44, 'p') + S.hole(S.arc(-14, 18, 10, 135, 405, 18).slice(0, -1).concat([[-14, 18 + 14.1]]), 'y', 16, 32, { through: true }) + S.hole(S.circ(18, 18, 10, 22), 'y', 16, 32, { through: true }) + S.tx(0, 24, 6, 'teardrop (left)   round: sags (right)', 'tr') },
    { t: 'Chamfer the bottom edge', x: 'The first layer squashes outward and makes a small lip called elephant foot, which stops parts sitting flat or fitting together. A 0.5 mm chamfer on the bottom edge hides it.', p: PR, m: PL, tags: [PR, 'PLA', 'PETG', 'ABS'],
      g: S => S.box(-60, -34, -2, 120, 68, 2, 'g') + S.ext([[-40, 4], [-36, 0], [36, 0], [40, 4], [40, 40], [-40, 40]], 'y', -20, 20, 'p') + S.tx(0, 30, -4, 'print bed', 'tr') + S.tx(46, 22, 4, 'chamfer', 'tr', 'start') },
    { t: 'Tiny relief holes in sharp corners', x: 'A printer rounds inside corners. Put a small circle at each inside corner of a square pocket so a square part, nut or tab can sit in it properly.', p: PR, m: PL, tags: [PR, 'PLA', 'PETG', 'ABS'],
      g: S => S.box(-45, -35, 0, 90, 70, 14) + S.hole([S.rect(-16, -16, 32, 32)].concat([[-16, -16], [16, -16], [-16, 16], [16, 16]].map(c => S.circ(c[0], c[1], 3.6, 14))), 'z', 14, 8) + S.tx(0, 40, 6, 'relief holes', 'tr') },
    { t: 'Print a tolerance coupon', x: 'Print a plate with holes in 0.1 mm steps and a few pegs. Note which hole each fit needs. Use those numbers for this printer and filament, because every machine is different.', p: PR, m: PL, tags: [PR, 'PLA', 'PETG', 'ABS'],
      g: S => S.box(-52, -22, 0, 104, 44, 6) + S.hole([0, 1, 2, 3, 4].map(i => S.circ(-36 + i * 18, 0, 4 + i * 0.6, 20)), 'z', 6, 6, { through: true }) + S.cyl(36, 36, 0, 4, 12, 'a') + S.tx(0, 36, 2, 'holes grow in 0.1 mm steps', 'tr') },
    { t: 'Add a sacrificial bridge layer', x: 'Over a horizontal hole or a nut pocket, add one layer of material across the opening. After the print, poke it out with a drill or a knife. The layers above then print on a solid base.', p: PR, m: PL, tags: [PR, 'PLA', 'PETG', 'ABS'],
      g: S => S.box(-46, -16, 0, 92, 32, 44, 'p') + S.hole(S.circ(0, 20, 11, 24), 'y', 16, 32, { through: true }) + S.box(-7.5, -16, 26, 15, 31.5, 1.5, 'a') + S.tx(0, 24, 6, 'one thin layer across the hole', 'tr') }
  ] };

  /* ---------- cnc corners ---------- */
  T3['cnc-corners'] = { title: 'More ways to deal with cutter radius', intro: 'These apply to a CNC router or mill, in wood, plastic or aluminium.', items: [
    { t: 'Corner reliefs for square parts', x: 'A round cutter cannot cut a sharp inside corner, so a square part will not sit in a square pocket. Cut a little extra at each corner, or round the part instead. Use the arrows to compare.', p: CN, m: WD, tags: [CN, 'Plywood', 'MDF', 'Hardwood', 'Plastic'],
      slides: [
        { t: 'Dog-bone', x: 'A circle the size of the cutter at each corner, set out along the diagonal so it just clears the corner. Easy to add in any CAD program and works on every corner.',
          g: S => { const r = 3.4, o = r / Math.SQRT2; return S.box(-50, -32, 0, 100, 64, 14) + S.hole([S.rect(-22, -16, 44, 32)].concat([[-22, -16, -1, -1], [22, -16, 1, -1], [-22, 16, -1, 1], [22, 16, 1, 1]].map(c => S.circ(c[0] - c[2] * o, c[1] - c[3] * o, r, 14))), 'z', 14, 8) + S.ln([-22, 16, 36], [-22, 16, 14], 'd') + S.ln([22, 16, 36], [22, 16, 14], 'd') + S.box(-22, -16, 36, 44, 32, 8, 'a') + S.tx(0, 40, 6, 'circles on the diagonals', 'tr'); } },
        { t: 'T-bone', x: 'Cut a short slot straight out along one edge instead of the diagonal. The square corner of the part fits in the extra pocket. Tidier on the edge you see, and faster to cut.',
          g: S => S.box(-50, -32, 0, 100, 64, 14) + S.hole([S.rect(-22, -16, 44, 32)].concat([[-22, -16], [22, -16], [-22, 16], [22, 16]].map(c => S.rect(c[0] > 0 ? c[0] : c[0] - 5, c[1] > 0 ? c[1] - 4 : c[1], 5, 4))), 'z', 14, 8) + S.ln([-22, 16, 36], [-22, 16, 14], 'd') + S.ln([22, 16, 36], [22, 16, 14], 'd') + S.box(-22, -16, 36, 44, 32, 8, 'a') + S.tx(0, 40, 6, 'slots along one edge', 'tr') },
        { t: 'Round the part instead', x: 'If you also make the part, give its corners the same radius as the cutter (or a little more). Then the pocket needs no extra cuts at all, and nothing shows.',
          g: S => { const rr = (hx, hy, r) => [].concat(S.arc(hx - r, hy - r, r, 0, 90, 5), S.arc(-hx + r, hy - r, r, 90, 180, 5), S.arc(-hx + r, -hy + r, r, 180, 270, 5), S.arc(hx - r, -hy + r, r, 270, 360, 5)); return S.box(-50, -32, 0, 100, 64, 14) + S.hole(rr(22, 16, 4), 'z', 14, 8) + S.ln([-22, 12, 36], [-22, 12, 14], 'd') + S.ln([22, 12, 36], [22, 12, 14], 'd') + S.ext(rr(22, 16, 4), 'z', 36, 44, 'a') + S.tx(0, 40, 6, 'same radius on part and pocket', 'tr'); } }
      ] },
    { t: 'Leave holding tabs', x: 'Leave a few small tabs on the outline so the part cannot move when the cut finishes. Break or cut them off afterwards and sand the stubs.', p: CN, m: WD, tags: [CN, 'Plywood', 'MDF', 'Plastic sheet'],
      g: S => heldPart(S, [-50, -34, 0, 100, 68, 12], [-28, -24, 56, 48], [-26, -22, 0, 52, 44, 12], [[-5, -24, 10, 2], [-5, 22, 10, 2], [-28, -5, 2, 10], [26, -5, 2, 10]], 4) + S.tx(0, 44, 0, 'tabs hold the part', 'tr') },
    { t: 'Use the biggest cutter that fits', x: 'A bigger cutter is stiffer and faster. Choose it for the whole job, then use a small one only to finish tight corners if you really need to.', p: CN, m: AM, tags: [CN, 'Wood', 'Plastic', 'Aluminium'],
      g: S => S.cyl(-24, 0, 0, 16, 18, 'p') + S.cyl(-24, 0, 18, 8, 34, 'p') + S.cyl(28, 0, 0, 5, 18, 'a') + S.cyl(28, 0, 18, 4, 34, 'a') + S.tx(-24, 20, 4, 'big: rigid, fast', 'tr') + S.tx(28, 14, 4, 'small: slow', 'tr') }
  ] };

  /* ---------- poka-yoke ---------- */
  T3['poka-yoke'] = { title: 'More ways to make the wrong way impossible', intro: 'These work in any process and any material, because they are shapes, not settings.', items: [
    { t: 'Cut one corner', x: 'A pocket with one chamfered corner only takes a part with the same chamfer. SIM cards and memory cards use this trick.', p: ANY, m: AM, tags: [LZ, CN, PR, 'Any material'],
      g: S => { const sh = [[-30, -20], [14, -20], [30, -4], [30, 20], [-30, 20]]; return S.box(-46, -34, 0, 92, 68, 10) + S.hole(sh, 'z', 10, 10, { through: true }) + S.ln([-30, 20, 10], [-30, 20, 36], 'd') + S.ln([30, 20, 10], [30, 20, 36], 'd') + S.ext(sh, 'z', 36, 44, 'a') + S.arr([0, 0, 64], [0, 0, 50]); } },
    { t: 'Different tab sizes', x: 'If one tab is wider than the others, the part cannot be turned round or put in the wrong place. Vary the width, not just the position.', p: LZ, m: SH, tags: [LZ, CN, 'Plywood', 'MDF', 'Acrylic'],
      g: S => { const tb = [[-38, 10], [-12, 18], [24, 8]]; return S.box(-52, -28, 0, 104, 56, T) + tb.map(q => S.slot(q[0], -4, q[1], 8, 0, T)).join('') + guides(tb, -4, 8, T + 18, T) + wall(-48, -4, T + 24, 96, 8, 30, tb, T) + S.tx(0, 12, T + 58, 'three different widths', 'tr'); } },
    { t: 'D-shaped hole', x: 'A round shaft with one flat fits only one way, and the flat also stops it turning. Cheap to make and very obvious to see.', p: ANY, m: AM, tags: [LZ, CN, PR, 'Any material'],
      g: S => { const d = S.arc(0, 0, 13, -67, 247, 22); return S.box(-45, -35, 0, 90, 70, 14) + S.hole(d, 'z', 14, 14, { through: true }) + S.ln([0, 0, 14], [0, 0, 46], 'd') + S.ext(d, 'z', 46, 70, 'a', true) + S.arr([30, 0, 70], [30, 0, 56]); } },
    { t: 'Mark it too', x: 'Engrave or print an arrow, the word TOP or a small dot on the part. People look before they force it, and the shape stops them if they do not.', p: ANY, m: AM, tags: [LZ + ' (engrave)', PR, CN, 'Any material'],
      g: S => S.box(-50, -32, 0, 100, 64, 8) + S.engrave([[[-30, -4], [10, -4], [10, 4], [-30, 4]], [[10, -12], [32, 0], [10, 12]]], 'z', 8, 1.2) + S.tx(-8, -22, 8, 'engraved arrow: TOP', 'tr') }
  ] };

  /* draw every card, and every slide of a card that shows several designs (slides: [{ t, x, g, gen }]) */
  const drawCard = (g, off) => { S._lab = []; IT = []; BN = 0; CB = 0; curOff = off || 0; return render(g(S)) + S._lab.map((l, i) => `<text class="sv-tr" x="110" y="${156 - 9.5 * (S._lab.length - 1 - i)}" text-anchor="middle">${l}</text>`).join(''); };
  Object.keys(T3).forEach(k => T3[k].items.forEach(it => { if (it.slides) it.slides.forEach(sl => { sl.svg = drawCard(sl.g, sl.off || it.off); }); else it.svg = drawCard(it.g, it.off); }));
  window.MM_TRICKS = T3;
})();
