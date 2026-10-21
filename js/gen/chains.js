/* Chain and sprocket generator: roller chain (ANSI and ISO sizes) or plain plate chain with pins, any number of sprockets placed anywhere,
   several chains, sprockets sharing a shaft, back-side idlers. Sprocket teeth are cut to fit the rollers; sprockets can be solid, drilled,
   teardrop, skeleton or swirl. Exports sprockets and every chain part as SVG, DXF or STL. MIT licence. */
(function () {
  const G = window.GEN, TAU = Math.PI * 2, deg = Math.PI / 180, g0 = 9.81;
  const f = (v, d) => (v == null || !isFinite(v)) ? '—' : (+v).toFixed(d == null ? 1 : d);

  /* ---------------- chain sizes (typical catalogue values, millimetres; always check your own chain's datasheet) ---------------- */
  // p pitch, d1 roller Ø, b1 inner width, pin pin Ø, h plate height, t plate thickness, pt strand spacing, brk minimum breaking load in kN
  const SIZES = {
    '25': { name: 'ANSI 25 (1/4")', p: 6.35, d1: 3.30, b1: 3.18, pin: 2.31, h: 5.8, t: 0.76, pt: 6.4, brk: 3.6 },
    '35': { name: 'ANSI 35 (3/8")', p: 9.525, d1: 5.08, b1: 4.77, pin: 3.58, h: 9.0, t: 1.27, pt: 10.1, brk: 7.9 },
    '40': { name: 'ANSI 40 (1/2")', p: 12.7, d1: 7.92, b1: 7.85, pin: 3.96, h: 12.0, t: 1.5, pt: 14.4, brk: 14.1 },
    '50': { name: 'ANSI 50 (5/8")', p: 15.875, d1: 10.16, b1: 9.40, pin: 5.08, h: 15.1, t: 2.03, pt: 18.1, brk: 21.8 },
    '60': { name: 'ANSI 60 (3/4")', p: 19.05, d1: 11.91, b1: 12.57, pin: 5.94, h: 18.1, t: 2.42, pt: 22.8, brk: 31.3 },
    '80': { name: 'ANSI 80 (1")', p: 25.4, d1: 15.88, b1: 15.75, pin: 7.92, h: 24.1, t: 3.25, pt: 29.3, brk: 55.6 },
    '06B': { name: 'ISO 06B (3/8")', p: 9.525, d1: 6.35, b1: 5.72, pin: 3.28, h: 8.2, t: 1.3, pt: 10.2, brk: 8.9 },
    '08B': { name: 'ISO 08B (1/2")', p: 12.7, d1: 8.51, b1: 7.75, pin: 4.45, h: 11.8, t: 1.6, pt: 13.9, brk: 17.8 },
    '10B': { name: 'ISO 10B (5/8")', p: 15.875, d1: 10.16, b1: 9.65, pin: 5.08, h: 14.7, t: 1.7, pt: 16.6, brk: 22.2 },
    '12B': { name: 'ISO 12B (3/4")', p: 19.05, d1: 12.07, b1: 11.68, pin: 5.72, h: 16.1, t: 1.85, pt: 19.5, brk: 28.9 },
    '16B': { name: 'ISO 16B (1")', p: 25.4, d1: 15.88, b1: 17.02, pin: 8.28, h: 21.0, t: 4.15, pt: 31.9, brk: 60.0 },
    custom: { name: 'Custom (your own sizes)' }
  };
  const SIZE_OPTS = Object.keys(SIZES).map(k => [k, SIZES[k].name]);
  const CDEF = { size: '40', type: 'roller', plate: 'peanut', strands: 1, att: 'none', every: 4, tab: 12, holes: 1, hd: 3.2, p: 19.05, d1: 11.91, b1: 12.57, pin: 5.94, h: 18.1, t: 2.4 };
  const dimsOf = c => {
    c = Object.assign({}, CDEF, c || {});
    const b = c.size === 'custom' ? { p: c.p, d1: c.d1, b1: c.b1, pin: c.pin, h: c.h, t: c.t, pt: c.p * 1.13, brk: 0 } : SIZES[c.size] || SIZES['40'];
    const plate = c.type === 'plate';
    return Object.assign({}, c, { p: +b.p, d1: +b.d1, b1: +b.b1, pin: +b.pin, h: +b.h, t: +b.t, pt: +b.pt, brk: +b.brk || 0, dseat: plate ? +b.pin + 0.3 : +b.d1 });
  };

  /* ---------------- sprockets and chains in the settings ---------------- */
  // { id, x, y, z, chain (1..3), side ('in' | 'out' = back-side idler), shaft (id of a sprocket it shares a shaft with), bore, design ('' = the default) }
  const PRE = {
    two: { name: 'Two sprockets', P: [{ id: 'P1', x: 0, y: 0, z: 15, chain: 1, side: 'in', bore: 8 }, { id: 'P2', x: 260, y: 0, z: 30, chain: 1, side: 'in', bore: 10 }] },
    diag: { name: 'Diagonal drive', P: [{ id: 'P1', x: 0, y: 0, z: 17, chain: 1, side: 'in', bore: 8 }, { id: 'P2', x: 200, y: 170, z: 25, chain: 1, side: 'in', bore: 10 }] },
    tens: { name: 'With a tensioner', P: [{ id: 'P1', x: 0, y: 0, z: 13, chain: 1, side: 'in', bore: 8 }, { id: 'P2', x: 280, y: 0, z: 28, chain: 1, side: 'in', bore: 10 }, { id: 'P3', x: 150, y: 70, z: 11, chain: 1, side: 'out', bore: 6 }] },
    sq: { name: 'Four corners', P: [{ id: 'P1', x: 0, y: 0, z: 17, chain: 1, side: 'in', bore: 8 }, { id: 'P2', x: 240, y: 0, z: 17, chain: 1, side: 'in', bore: 8 }, { id: 'P3', x: 240, y: 180, z: 17, chain: 1, side: 'in', bore: 8 }, { id: 'P4', x: 0, y: 180, z: 25, chain: 1, side: 'in', bore: 10 }] },
    bend: { name: 'Pinched by two idlers', P: [{ id: 'P1', x: 0, y: 0, z: 18, chain: 1, side: 'in', bore: 8 }, { id: 'P2', x: 120, y: -70, z: 11, chain: 1, side: 'out', bore: 6 }, { id: 'P3', x: 250, y: 0, z: 26, chain: 1, side: 'in', bore: 10 }, { id: 'P4', x: 120, y: 70, z: 11, chain: 1, side: 'out', bore: 6 }] },
    two2: { name: 'Two-stage reduction', P: [{ id: 'P1', x: 0, y: 0, z: 13, chain: 1, side: 'in', bore: 8 }, { id: 'P2', x: 230, y: 0, z: 39, chain: 1, side: 'in', bore: 10 }, { id: 'P3', shaft: 'P2', z: 13, chain: 2, side: 'in', bore: 10 }, { id: 'P4', x: 230, y: 210, z: 39, chain: 2, side: 'in', bore: 12 }], C: [{ size: '40' }, { size: '35' }, {}] },
    wood: { name: 'Wood chain (laser cut)', P: [{ id: 'P1', x: 0, y: 0, z: 10, chain: 1, side: 'in', bore: 10, design: 'swirl' }, { id: 'P2', x: 160, y: 330, z: 15, chain: 1, side: 'in', bore: 12, design: 'teardrop' }, { id: 'P3', x: -100, y: 190, z: 8, chain: 1, side: 'out', bore: 8, design: 'spokes' }],
      C: [{ size: 'custom', type: 'plate', plate: 'open', p: 25.4, d1: 14, b1: 6, pin: 8, h: 20, t: 6 }, {}, {}] }
  };
  PRE.wood.P[0].x = 0;
  const cacheP = {}, cacheC = {};
  const parse = S => { if (cacheP.s !== S.spr) { try { cacheP.v = JSON.parse(S.spr); } catch (e) { cacheP.v = PRE.two.P; } cacheP.s = S.spr; } return cacheP.v; };
  const parseC = S => { if (cacheC.s !== S.chains) { let v; try { v = JSON.parse(S.chains); } catch (e) { v = []; } cacheC.v = [0, 1, 2].map(i => Object.assign({}, CDEF, v[i] || {})); cacheC.s = S.chains; } return cacheC.v; };

  /* ---------------- plate outlines ---------------- */
  const arcPts = (cx, cy, r, a0, a1) => { const n = Math.max(2, Math.ceil(Math.abs(a1 - a0) / (6 * deg))), o = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; o.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } return o; };
  function peanut(L, R, h, rf) {   // pins at (0,0) and (L,0); round ends of radius R, waist half-width h joined with smooth fillets
    const x = Math.sqrt((R + rf) ** 2 - (h + rf) ** 2);
    if (!(L > 2 * x + 0.5) || !(R > h)) return null;
    const ph = Math.atan2(h + rf, x), lo = [].concat(arcPts(x, -(h + rf), rf, Math.PI - ph, Math.PI / 2), arcPts(L - x, -(h + rf), rf, Math.PI / 2, ph));
    const top = lo.map(([a, b]) => [a, -b]).reverse();
    return lo.concat(arcPts(L, 0, R, ph - Math.PI, Math.PI - ph), top, arcPts(0, 0, R, ph, TAU - ph));
  }
  // one link plate in its own frame (pins at (0,0) and (L,0)); tabs go on the +y side (and -y when both)
  const plateCache = {};
  function plate(L, D, tab) {
    const key = [L.toFixed(2), D.h, D.pin, D.plate, tab ? D.tab + ':' + D.holes + ':' + D.hd + ':' + tab : ''].join('|'); if (plateCache[key]) return plateCache[key];
    const R = D.h / 2, holes = [], circ = [{ x: 0, y: 0, r: D.pin / 2 }, { x: L, y: 0, r: D.pin / 2 }];
    let outer;
    if (tab) {
      const tl = Math.max(2, D.tab), tw = Math.max(4, Math.min(L * 0.8, L - 1)), xa = (L - tw) / 2, xb = xa + tw, up = [], dn = [];
      outer = [].concat(arcPts(L, 0, R, -Math.PI / 2, Math.PI / 2));
      outer.push([xb, R], [xb, R + tl], [xa, R + tl], [xa, R]);
      outer.push(...arcPts(0, 0, R, Math.PI / 2, 1.5 * Math.PI));
      if (tab === 2) outer.push([xa, -R], [xa, -R - tl], [xb, -R - tl], [xb, -R]);
      outer = G.fillet(outer, Math.min(R * 0.5, tl * 0.4));
      const hd = Math.max(0.8, Math.min(D.hd, tl - 1.5, tw / (D.holes > 1 ? 2.6 : 1.4))), hx = D.holes > 1 ? [L / 2 - tw / 4, L / 2 + tw / 4] : [L / 2];
      hx.forEach(x => { circ.push({ x, y: R + tl / 2, r: hd / 2 }); if (tab === 2) circ.push({ x, y: -R - tl / 2, r: hd / 2 }); });
    } else {
      outer = D.plate === 'oval' ? G.hull(G.circlePts(0, 0, R, 36).concat(G.circlePts(L, 0, R, 36))) : peanut(L, R, R * 0.8, R * 0.6) || G.hull(G.circlePts(0, 0, R, 36).concat(G.circlePts(L, 0, R, 36)));
      if (D.plate === 'open') { const sr = R * 0.17, x0 = R * 0.95 + sr; if (L - 2 * x0 > 1) holes.push(G.hull(G.circlePts(x0, 0, sr, 16).concat(G.circlePts(L - x0, 0, sr, 16)))); }
    }
    if (Object.keys(plateCache).length > 400) for (const k in plateCache) delete plateCache[k];
    return plateCache[key] = { outer, holes, circles: circ };
  }

  /* ---------------- sprocket ---------------- */
  const DESIGNS = [['solid', 'Solid'], ['holes', 'Drilled'], ['teardrop', 'Teardrop'], ['spokes', 'Skeleton'], ['swirl', 'Swirl']];
  const spCache = {};
  // tooth gaps are seats for the rollers; flanks run out to a rounded tip
  function teeth(z, D, o) {
    const p = D.p, Rp = p / (2 * Math.sin(Math.PI / z)), ri = 0.5025 * D.dseat + 0.05, Rr = Rp - D.dseat / 2 - 0.05;
    const Ra = p * (0.55 + 1 / Math.tan(Math.PI / z)) / 2, hs = (140 - 120 / z) / 2 * deg, pitch = TAU / z, tipH = 0.3 * pitch / 2;
    const R = (r, a) => [r * Math.cos(a), r * Math.sin(a)], pts = [];
    const seat = []; for (let i = 0; i <= 14; i++) { const t = hs - 2 * hs * i / 14; seat.push([Rp - ri * Math.cos(t), -ri * Math.sin(t)]); }   // gap at angle 0, going counter-clockwise
    const Ea = seat[0], Eb = seat[seat.length - 1];
    const bez = (A, C, B, n) => { const out = []; for (let i = 1; i < n; i++) { const u = i / n; out.push([(1 - u) * (1 - u) * A[0] + 2 * u * (1 - u) * C[0] + u * u * B[0], (1 - u) * (1 - u) * A[1] + 2 * u * (1 - u) * C[1] + u * u * B[1]]); } return out; };
    const rot = (q, a) => [q[0] * Math.cos(a) - q[1] * Math.sin(a), q[0] * Math.sin(a) + q[1] * Math.cos(a)];
    const tauMid = pitch / 2, T1 = R(Ra, tauMid - tipH), T2 = R(Ra, tauMid + tipH);
    // flank from the gap end to the tip, bowed slightly outward so the tooth stays full
    const flank = (A, B, sgn) => { const m = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2], dx = B[0] - A[0], dy = B[1] - A[1], l = Math.hypot(dx, dy) || 1; return bez(A, [m[0] + sgn * dy / l * l * 0.1, m[1] - sgn * dx / l * l * 0.1], B, 7); };
    const Ea2 = rot(Ea, pitch);   // start of the next gap
    for (let k = 0; k < z; k++) {
      const a = k * pitch, add = q => pts.push(rot(q, a));
      seat.forEach(add); flank(Eb, T1, 1).forEach(add); add(T1);
      for (let i = 1; i < 3; i++) { const u = tauMid - tipH + 2 * tipH * i / 3; add(R(Ra, u)); }
      add(T2); flank(T2, Ea2, 1).forEach(add);
    }
    return { pts: G.fillet(pts, Math.min(0.14 * p, 0.3 * (Ra - Rr))), Rp, Ra, Rr, ri };
  }
  const pockets = (...a) => G.pockets(...a), boreShape = (...a) => G.boreShape(...a);
  function sprocket(z, D, o) {
    const key = [z, D.p, D.dseat, o.design, o.n, o.web, o.hub, o.rim, o.crn, o.sweep, o.bore, o.key].join('|'); if (spCache[key]) return spCache[key];
    const T = teeth(z, D, o), Rr = T.Rr, bore = Math.min(o.bore, 2 * Rr - 4);
    const hubR = Math.max(bore / 2 + 3, (o.hub > 0 ? o.hub / 2 : 0.28 * Rr)), rimW = o.rim > 0 ? o.rim : Math.max(3, 0.16 * Rr), web = o.web > 0 ? o.web : Math.max(3, 0.1 * Rr);
    const rIn = hubR, rOut = Rr - rimW, crn = o.crn > 0 ? o.crn : Math.min(5, 0.25 * (rOut - rIn));
    const pk = o.design === 'solid' ? { holes: [], circles: [] } : pockets(o.design, Math.max(2, Math.round(o.n)), rIn, rOut, web, crn, (o.sweep || 0) * deg);
    const b = boreShape(bore / 2, o.key);
    const v = { shape: { outer: T.pts, holes: pk.holes.concat(b.holes), circles: pk.circles.concat(b.circles) }, Rp: T.Rp, Ra: T.Ra, Rr: T.Rr, ri: T.ri, rIn, rOut };
    if (Object.keys(spCache).length > 120) for (const k in spCache) delete spCache[k];
    return spCache[key] = v;
  }
  const sprOpts = (S, p) => ({ design: p.design || S.design, n: S.pn, web: S.web, hub: S.hub, rim: S.rim, crn: S.crn, sweep: S.sweep, bore: +p.bore || 0, key: S.key ? 1 : 0 });

  /* ---------------- solve the layout ---------------- */
  let memo = { k: '', v: null };
  function solve(S) {
    const key = [S.spr, S.chains, S.motor, S.dir].join('~'); if (memo.k === key) return memo.v;
    const list = parse(S), chains = parseC(S), errs = [], P = {};
    list.forEach(p => {
      const k = Math.min(3, Math.max(1, Math.round(+p.chain || 1))), D = dimsOf(chains[k - 1]), z = Math.max(5, Math.round(+p.z || 5));
      P[p.id] = Object.assign({}, p, { chain: k, z, D, r: D.p / (2 * Math.sin(Math.PI / z)), rv: D.p * z / TAU });
    });
    list.forEach(p => { const q = P[p.id]; if (q.shaft && P[q.shaft]) { const h = P[q.shaft]; q.x = h.x; q.y = h.y; } });
    const root = id => { let q = P[id], seen = 0; while (q.shaft && P[q.shaft] && seen++ < 20) q = P[q.shaft]; return q.id; };
    list.forEach(p => P[p.id].grp = root(p.id));
    const belts = [];
    [1, 2, 3].forEach(k => {
      const ids = list.filter(p => P[p.id].chain === k).map(p => p.id); if (!ids.length) return;
      if (ids.length < 2) { errs.push([`Chain ${k}`, `needs at least two sprockets (only ${ids[0]})`]); return; }
      const C = ids.map(id => P[id]);
      let A = 0; for (let i = 0; i < C.length; i++) { const a = C[i], b = C[(i + 1) % C.length]; A += a.x * b.y - b.x * a.y; }
      const sgn = A < -1e-6 ? -1 : 1, s = C.map(q => sgn * q.r * (q.side === 'out' ? -1 : 1)), sv = C.map(q => sgn * q.rv * (q.side === 'out' ? -1 : 1));
      const segs = [], bad = [];
      for (let i = 0; i < C.length; i++) {
        const j = (i + 1) % C.length, a = C[i], b = C[j], dx = b.x - a.x, dy = b.y - a.y, Lc = Math.hypot(dx, dy), k2 = (s[j] - s[i]) / Lc;
        if (!(Lc > 1e-6) || Math.abs(k2) >= 1) { bad.push(a.id + '–' + b.id); segs.push(null); continue; }
        const th = Math.atan2(dy, dx) - Math.asin(k2), n = [-Math.sin(th), Math.cos(th)];
        segs.push({ p: [a.x - s[i] * n[0], a.y - s[i] * n[1]], q: [b.x - s[j] * n[0], b.y - s[j] * n[1]] });
      }
      if (bad.length) { errs.push([`Chain ${k}`, `sprockets ${bad.join(', ')} overlap or touch. Move them apart.`]); return; }
      const arcs = C.map((c, j) => {
        const pin = segs[(j - 1 + C.length) % C.length].q, pout = segs[j].p;
        const a0 = Math.atan2(pin[1] - c.y, pin[0] - c.x), a1 = Math.atan2(pout[1] - c.y, pout[0] - c.x);
        let w = s[j] > 0 ? a1 - a0 : a0 - a1; w = ((w % TAU) + TAU) % TAU; if (w < 1e-9) w = TAU;
        return { c, a0, a1, w, s: s[j], sg: s[j] > 0 ? 1 : -1 };
      });
      // the path round the chain, in "chain length": straight spans as they are, arcs as one pitch per tooth
      const pieces = []; let off = 0;
      for (let i = 0; i < C.length; i++) {
        const g = segs[i], len = Math.hypot(g.q[0] - g.p[0], g.q[1] - g.p[1]); pieces.push({ seg: 1, off, len, p: g.p, q: g.q }); off += len;
        const a = arcs[(i + 1) % C.length], len2 = a.w * a.c.rv; pieces.push({ arc: a, off, len: len2 }); a.off = off; off += len2;
      }
      const D = C[0].D, pitch = D.p, N = Math.max(4, 2 * Math.round(off / pitch / 2)), peff = off / N, slack = N * pitch - off;
      belts.push({ k, ids, C, s, sv, segs, arcs, pieces, Lc: off, D, N, peff, slack, strands: Math.max(1, Math.round(chains[k - 1].strands)), cd: chains[k - 1] });
    });
    // speeds: the driver turns at S.motor rpm; every chain moves at one speed and sprockets on a shaft turn together
    const w = {}, d0 = list[0] && list[0].id; if (d0) w[P[d0].grp] = S.motor * TAU / 60 * S.dir;
    const v = {}, feed = {};
    for (let it = 0; it < 10; it++) belts.forEach(B => {
      if (v[B.k] != null) return; const j = B.C.findIndex(q => w[q.grp] != null); if (j < 0) return;
      v[B.k] = w[B.C[j].grp] * B.sv[j]; feed[B.k] = B.C[j].grp;
      B.C.forEach((q, i) => { if (w[q.grp] == null) w[q.grp] = v[B.k] / B.sv[i]; });
    });
    const lost = list.filter(p => w[P[p.id].grp] == null).map(p => p.id); if (lost.length) errs.push(['Not driven', `${lost.join(', ')} ${lost.length > 1 ? 'are' : 'is'} not connected to the driver P1. Put ${lost.length > 1 ? 'them' : 'it'} on a chain with a driven sprocket, or on the same shaft as one.`]);
    // chain pull: torque at the driver shaft turned into force on the chain; a shaft passes on what it receives (less friction)
    const eta = 0.97, w1 = d0 ? Math.abs(w[P[d0].grp]) : 0, Pin = S.torque * w1;
    const R = { list, P, belts, w, v, errs, feed, Pin, w1, eta, chains };
    belts.forEach(B => {
      const drv = B.C.find(q => q.grp === feed[B.k]);
      const rpm = drv && w[drv.grp] != null ? Math.abs(w[drv.grp]) * 60 / TAU : 0;
      B.speed = drv ? B.D.p * drv.z * rpm / 60000 : 0;   // m/s
      B.F = drv && d0 && drv.grp === P[d0].grp ? S.torque / (drv.r / 1000) : 0;
    });
    memo = { k: key, v: R }; return R;
  }
  const rpmOf = (R, id) => { const q = R.P[id]; return q && R.w[q.grp] != null ? R.w[q.grp] * 60 / TAU : null; };
  const posAt = (B, s) => {
    s = ((s % B.Lc) + B.Lc) % B.Lc; let pc = B.pieces[B.pieces.length - 1]; for (const q of B.pieces) if (s < q.off + q.len) { pc = q; break; }
    const u = s - pc.off;
    if (pc.seg) { const k = pc.len ? u / pc.len : 0; return [pc.p[0] + (pc.q[0] - pc.p[0]) * k, pc.p[1] + (pc.q[1] - pc.p[1]) * k]; }
    const a = pc.arc, th = a.a0 + a.sg * u / a.c.rv; return [a.c.x + a.c.r * Math.cos(th), a.c.y + a.c.r * Math.sin(th)];
  };
  // sprocket angle that puts a tooth gap under the roller nearest the middle of its wrap
  const phaseOf = (B, a) => { const mid = a.off + (a.w * a.c.rv) / 2, k = Math.round(mid / B.peff), u = k * B.peff - a.off; return a.a0 + a.sg * u / a.c.rv; };

  /* ---------------- editors ---------------- */
  function field(o, i, k, label, unit, step, min, max) { return `<label class="mf"><span>${label}</span><span class="gin"><input type="number" data-i="${i}" data-f="${k}" value="${o[k]}" step="${step || 1}"${min != null ? ` min="${min}"` : ''}${max != null ? ` max="${max}"` : ''}><span>${unit || ''}</span></span></label>`; }
  function selectF(o, i, k, label, opts) { return `<label class="mf"><span>${label}</span><select data-i="${i}" data-f="${k}">${opts.map(([v, l]) => `<option value="${v}"${String(o[k]) === String(v) ? ' selected' : ''}>${l}</option>`).join('')}</select></label>`; }

  function sprocketEditor(el, api) {
    const S = api.S; let shown = null;
    const L = () => JSON.parse(JSON.stringify(parse(S))), save = l => { S.spr = JSON.stringify(l); api.changed(); shown = S.spr; };
    const nextId = l => { let i = 1; while (l.some(p => p.id === 'P' + i)) i++; return 'P' + i; };
    function render() {
      const l = parse(S), R = solve(S); shown = S.spr;
      el.innerHTML = `<div class="mpre"><span>Start from</span>${Object.entries(PRE).map(([k, p]) => `<button data-pre="${k}">${p.name}</button>`).join('')}</div>
        <ol class="mlist">${l.map((p, i) => {
          const others = l.filter(q => q.id !== p.id && !q.shaft).map(q => q.id), r = rpmOf(R, p.id);
          let body = field(p, i, 'z', 'Teeth', '', 1, 6, 200);
          body += `<label class="mf"><span>Chain</span><select data-i="${i}" data-f="chain">${[1, 2, 3].map(k => `<option value="${k}"${(+p.chain || 1) === k ? ' selected' : ''}>Chain ${k}</option>`).join('')}</select></label>`;
          body += i > 0 ? `<label class="mf"><span>Shaft</span><select data-i="${i}" data-f="shaft"><option value="">Its own</option>${others.map(o => `<option value="${o}"${p.shaft === o ? ' selected' : ''}>Same as ${o}</option>`).join('')}</select></label>` : '<span></span>';
          body += `<label class="mf"><span>Chain touches</span><span class="gseg"><button data-i="${i}" data-side="in" class="${p.side !== 'out' ? 'on' : ''}" title="The chain wraps the sprocket from inside the loop">Inside</button><button data-i="${i}" data-side="out" class="${p.side === 'out' ? 'on' : ''}" title="A tensioner or idler pressing on the outside of the chain">Back</button></span></label>`;
          if (!p.shaft) body += field(p, i, 'x', 'Position x', 'mm', 5) + field(p, i, 'y', 'Position y', 'mm', 5);
          body += field(Object.assign({ bore: 8 }, p), i, 'bore', 'Bore Ø', 'mm', 0.5, 0, 200);
          body += selectF(Object.assign({ design: '' }, p), i, 'design', 'Design', [['', 'Default']].concat(DESIGNS));
          return `<li class="mitem ${i === 0 ? 'm-crank' : p.side === 'out' ? 'm-ground' : 'm-joint'}"><div class="mhead"><b>${p.id}</b><span>${i === 0 ? 'Driver (motor)' : p.side === 'out' ? 'Back-side idler' : p.shaft ? 'On shaft of ' + p.shaft : 'Driven'}</span><span class="mspd">${r == null ? '' : f(Math.abs(r), 1) + ' rpm ' + (r > 0 ? '↺' : '↻')}</span>${i ? `<button class="mdel" data-del="${i}" title="Remove ${p.id}">×</button>` : ''}</div><div class="mbody">${body}</div></li>`;
        }).join('')}</ol>
        <div class="madd"><span>Add</span><button data-add="spr">Sprocket</button><button data-add="idler">Back-side idler</button><button data-add="shaft">Sprocket on same shaft</button></div>
        <p class="ghelp">P1 is the driver. Each chain runs round its sprockets in list order. Place sprockets anywhere with x and y in millimetres. A <b>Back</b> sprocket presses on the outside of the chain, like a tensioner. Put a sprocket on <b>the same shaft</b> as another and give it a different chain to make a multi-stage drive.</p>`;
      el.querySelectorAll('.mitem').forEach((li, n) => { const id = l[n].id; api.hl(li, p => p._id === id); });
    }
    el.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return; const l = L();
      if (b.dataset.pre) { const pr = PRE[b.dataset.pre]; save(pr.P); if (pr.C) { S.chains = JSON.stringify(pr.C); } else if (S.chains !== D0.chains) S.chains = D0.chains; api.changed(); render(); api.fit(); api.toast(pr.name + ' loaded'); return; }
      if (b.dataset.side) { l[+b.dataset.i].side = b.dataset.side; save(l); render(); return; }
      if (b.dataset.del) { const gone = l[+b.dataset.del].id; save(l.filter((p, i) => i !== +b.dataset.del).map(p => p.shaft === gone ? Object.assign(p, { shaft: '' }) : p)); render(); api.fit(); return; }
      if (b.dataset.add) {
        const id = nextId(l), R = solve(S), last = l[l.length - 1], lp = R.P[last.id];
        const cx = l.reduce((t, p) => t + R.P[p.id].x, 0) / l.length, cy = l.reduce((t, p) => t + R.P[p.id].y, 0) / l.length;
        let ang = Math.atan2(lp.y - cy, lp.x - cx); if (l.length === 1) ang = 0;
        const dist = lp.r + 90, x = Math.round((lp.x + Math.cos(ang) * dist) / 5) * 5, y = Math.round((lp.y + Math.sin(ang) * dist) / 5) * 5;
        if (b.dataset.add === 'spr') l.push({ id, x, y, z: 20, chain: +last.chain || 1, side: 'in', bore: 8 });
        if (b.dataset.add === 'idler') { const a = R.P[l[0].id]; l.push({ id, x: Math.round((a.x + lp.x) / 2), y: Math.round((a.y + lp.y) / 2) - 70, z: 11, chain: +last.chain || 1, side: 'out', bore: 6 }); }
        if (b.dataset.add === 'shaft') { const host = [...l].reverse().find(p => !p.shaft && p !== l[0]) || l[0]; const nb = Math.min(3, Math.max(...l.map(p => +p.chain || 1)) + 1); l.push({ id, shaft: host.id, z: 13, chain: nb, side: 'in', bore: 10 }); l.push({ id: nextId(l.concat([{ id }])), x: R.P[host.id].x + 200, y: R.P[host.id].y, z: 30, chain: nb, side: 'in', bore: 10 }); }
        save(l); render(); api.fit(); api.toast('Added ' + id);
      }
    });
    const edit = e => {
      const x = e.target; if (x.dataset.i == null || !x.dataset.f) return; const l = L(), p = l[+x.dataset.i], k = x.dataset.f;
      if (x.tagName === 'SELECT') { p[k] = k === 'chain' ? +x.value : x.value; if (k === 'shaft' && !x.value) { const R = solve(S); p.x = Math.round(R.P[p.id].x + 120); p.y = Math.round(R.P[p.id].y); } }
      else { if (x.value === '' || !isFinite(+x.value)) return; p[k] = +x.value; if (k === 'z') p.z = Math.max(6, Math.round(p.z)); if (k === 'bore') p.bore = Math.max(0, p.bore); }
      save(l); if (x.tagName === 'SELECT') render(); else refresh();
    };
    const refresh = () => { const l = parse(S), R = solve(S); el.querySelectorAll('.mitem').forEach((li, i) => { const r = l[i] && rpmOf(R, l[i].id), sp = li.querySelector('.mspd'); if (sp) sp.textContent = r == null ? '' : f(Math.abs(r), 1) + ' rpm ' + (r > 0 ? '↺' : '↻'); }); };
    el.addEventListener('input', edit); el.addEventListener('change', e => { if (e.target.tagName === 'SELECT') return; edit(e); });
    api.listen(() => { if (S.spr !== shown) render(); else refresh(); });
    render();
  }

  function chainEditor(el, api) {
    const S = api.S; let shown = null, usedKey = null;
    const L = () => JSON.parse(JSON.stringify(parseC(S))), save = l => { S.chains = JSON.stringify(l); api.changed(); shown = S.chains; };
    const used = () => [1, 2, 3].filter(k => parse(S).some(p => (+p.chain || 1) === k));
    function render() {
      const cs = parseC(S), R = solve(S); shown = S.chains; usedKey = used().join();
      el.innerHTML = used().map(k => {
        const c = cs[k - 1], D = dimsOf(c), B = R.belts.find(b => b.k === k), i = k - 1, plate = c.type === 'plate';
        let b = selectF(c, i, 'size', 'Size', SIZE_OPTS) + selectF(c, i, 'type', 'Type', [['roller', 'Roller chain'], ['plate', 'Plate chain with pins']]) + selectF(c, i, 'plate', 'Plate shape', [['peanut', 'Standard'], ['oval', 'Oval'], ['open', 'Open (slot)']]) + field(c, i, 'strands', 'Strands', '', 1, 1, 3);
        if (c.size === 'custom') b += field(c, i, 'p', 'Pitch', 'mm', 0.5, 2) + field(c, i, 'pin', 'Pin Ø', 'mm', 0.1, 0.5) + (plate ? '' : field(c, i, 'd1', 'Roller Ø', 'mm', 0.1, 1) + field(c, i, 'b1', 'Inner width', 'mm', 0.1, 1)) + field(c, i, 'h', 'Plate height', 'mm', 0.5, 2) + field(c, i, 't', 'Plate thickness', 'mm', 0.1, 0.2);
        b += selectF(c, i, 'att', 'Attachments', [['none', 'None'], ['tab', 'Tab on one side'], ['tab2', 'Tabs on both sides']]);
        if (c.att !== 'none') b += field(c, i, 'every', 'Every', 'links', 1, 1, 50) + field(c, i, 'tab', 'Tab length', 'mm', 0.5, 3) + selectF(c, i, 'holes', 'Holes', [[1, 'One'], [2, 'Two']]) + field(c, i, 'hd', 'Hole Ø', 'mm', 0.1, 0.8);
        return `<div class="mitem m-joint"><div class="mhead"><b>Chain ${k}</b><span>${D.p} mm pitch</span><span class="mspd">${B ? B.N + ' links' : ''}</span></div><div class="mbody">${b}</div></div>`;
      }).join('') + `<p class="ghelp">Sizes are typical catalogue values. A <b>plate chain</b> has flat plates joined by plain pins (dowels), which is what you want for laser-cut wood or acrylic. Attachments add tabs with holes to every few links for carrying things.</p>`;
      el.querySelectorAll('.mitem').forEach((li, n) => { const k = used()[n]; api.hl(li, p => p._id === 'chain' + k); });
    }
    const edit = e => {
      const x = e.target; if (x.dataset.i == null || !x.dataset.f) return; const l = L(), c = l[+x.dataset.i], k = x.dataset.f;
      if (x.tagName === 'SELECT') c[k] = isNaN(+x.value) || x.value === '' ? x.value : +x.value;
      else { if (x.value === '' || !isFinite(+x.value)) return; c[k] = +x.value; }
      if (k === 'size' && x.value !== 'custom') { /* keep custom numbers for later */ }
      save(l); if (x.tagName === 'SELECT') render(); else refresh();
    };
    const refresh = () => { const R = solve(S); el.querySelectorAll('.mitem').forEach((li, n) => { const B = R.belts.find(b => b.k === used()[n]), sp = li.querySelector('.mspd'); if (sp) sp.textContent = B ? B.N + ' links' : ''; }); };
    el.addEventListener('input', edit); el.addEventListener('change', e => { if (e.target.tagName === 'SELECT') edit(e); });
    api.listen(() => { if (S.chains !== shown || used().join() !== usedKey) render(); else refresh(); });
    render();
  }

  /* ---------------- drawing ---------------- */
  const D0 = { chains: JSON.stringify([{ size: '40' }, {}, {}]) };
  const thickOf = (S, B, q) => S.sth > 0 ? S.sth : +(0.9 * q.D.b1 + (Math.max(1, Math.round(parseC(S)[q.chain - 1].strands)) - 1) * q.D.pt).toFixed(2);
  function model(S, t) {
    const R = solve(S), parts = [], w1 = R.w1 || 1, ink = () => getComputedStyle(document.documentElement).getPropertyValue('--ink');
    const ang = {}; R.list.forEach(p => { const q = R.P[p.id], w = R.w[q.grp]; ang[p.id] = w == null ? 0 : t * w / w1; });
    const phase = {}; R.belts.forEach(B => B.arcs.forEach(a => { phase[a.c.id] = phaseOf(B, a); }));
    // sprockets, biggest first so smaller ones on the same shaft stay visible
    R.list.slice().sort((a, b) => R.P[b.id].r - R.P[a.id].r).forEach(p => {
      const q = R.P[p.id], i = R.list.indexOf(p), sp = sprocket(q.z, q.D, sprOpts(S, p)), B = R.belts.find(b => b.k === q.chain);
      parts.push({ name: `${p.id} sprocket ${q.z}T`, _id: p.id, shapes: [G.placeShape(sp.shape, q.x, q.y, (phase[p.id] || 0) + ang[p.id])], thickness: B ? thickOf(S, B, q) : 5, fill: i === 0 ? 'accent' : p.side === 'out' ? 'dark' : 'base', z: q.shaft ? 5 : 0, _sp: sp });
    });
    // chain plates between consecutive roller centres
    const rollers = [];
    R.belts.forEach(B => {
      const travel = t * (R.v[B.k] || 0) / w1, pos = []; for (let k = 0; k < B.N; k++) pos.push(posAt(B, k * B.peff + travel)); rollers.push({ B, pos });
      const c = B.cd, D = dimsOf(c), tabOn = c.att !== 'none', ev = Math.max(1, Math.round(c.every));
      for (let i = 0; i < B.N; i++) {
        const A = pos[i], C = pos[(i + 1) % B.N], dx = C[0] - A[0], dy = C[1] - A[1], Lp = Math.hypot(dx, dy), th = Math.atan2(dy, dx), tab = tabOn && i % ev === 0 ? (c.att === 'tab2' ? 2 : 1) : 0;
        parts.push({ name: `Chain ${B.k} link ${i + 1}`, _id: 'chain' + B.k, noexp: 1, fill: tab ? 'accent' : i % 2 ? 'dark' : 'base', shapes: [G.placeShape(plate(Lp, D, tab), A[0], A[1], th)], thickness: D.t, z: 0 });
      }
    });
    return {
      parts, R,
      guides(d) {
        const css = v => getComputedStyle(document.documentElement).getPropertyValue(v), col = ink(), red = css('--red'), dim = css('--dim'), sc = d.scale();
        rollers.forEach(({ B, pos }) => {
          const D = dimsOf(B.cd), plateC = B.cd.type === 'plate';
          pos.forEach(P => {
            if (S.rollers && !plateC) d.circle(P[0], P[1], D.d1 / 2, { color: red, w: 1, dash: [3, 2] });
            d.dot(P[0], P[1], Math.max(1.2, D.pin / 2 * sc), col);
          });
        });
        if (d.guides()) R.list.forEach(p => { const q = R.P[p.id]; d.circle(q.x, q.y, q.r, { color: dim, w: 0.8, dash: [5, 4] }); if (!q.shaft || true) d.cross(q.x, q.y, 8); });
        if (d.labels()) R.list.forEach((p, i) => {
          const q = R.P[p.id], r = rpmOf(R, p.id), sp = sprocket(q.z, q.D, sprOpts(S, p)), off = sp.Ra + 16 / sc;
          d.text(`${p.id} · ${q.z}T`, q.x, q.y + off + (q.shaft ? 14 / sc : 0), { color: col, size: 12, weight: 700 });
          if (r != null) d.text(`${f(Math.abs(r), 1)} rpm`, q.x, q.y - off - (q.shaft ? 14 / sc : 0), { color: i === 0 ? red : dim, size: 11 });
        });
      }
    };
  }

  /* ---------------- export parts ---------------- */
  function exportParts(S, layout) {
    const R = solve(S);
    if (layout === 'assembled') { const M = model(S, 0); return M.parts.map((p, i) => Object.assign({}, p, { noexp: 0, z: p.z || 0 })); }
    const out = [], add = (name, shapes, thickness, qty) => {
      const n = S.copies ? Math.min(400, qty) : 1;
      for (let i = 0; i < n; i++) out.push({ name: S.copies ? `${name} #${i + 1}` : qty > 1 ? `${name} x${qty}` : name, shapes: shapes.map(s => G.placeShape(s, 0, 0, 0)), thickness });
    };
    R.list.forEach(p => { const q = R.P[p.id], B = R.belts.find(b => b.k === q.chain), sp = sprocket(q.z, q.D, sprOpts(S, p)); add(`${p.id} sprocket ${q.z}T (chain ${q.chain})`, [sp.shape], B ? thickOf(S, B, q) : 5, 1); });
    R.belts.forEach(B => {
      const c = B.cd, D = dimsOf(c), n = B.N, st = B.strands, tabOn = c.att !== 'none', ev = Math.max(1, Math.round(c.every)), nTab = tabOn ? Math.ceil(n / ev) : 0, k = B.k;
      // every link has two plates; a link with an attachment has both plates with the tab
      add(`Chain ${k} plate`, [plate(D.p, D, 0)], D.t, Math.max(0, 2 * n * st - 2 * nTab * st));
      if (tabOn) add(`Chain ${k} attachment plate`, [plate(D.p, D, c.att === 'tab2' ? 2 : 1)], D.t, 2 * nTab * st);
      add(`Chain ${k} pin`, [{ outer: G.circlePts(0, 0, D.pin / 2, 24) }], D.b1 + 2 * D.t + 1, n * st);
      if (c.type !== 'plate') add(`Chain ${k} roller`, [{ outer: G.circlePts(0, 0, D.d1 / 2, 32), circles: [{ x: 0, y: 0, r: D.pin / 2 + 0.1 }] }], D.b1, n * st);
    });
    // lay the parts out in rows
    let x = 0, y = 0, rowH = 0; const maxW = 520;
    return out.map(p => { const b = G.bounds([p]), w = b.x1 - b.x0, h = b.y1 - b.y0; if (x > 0 && x + w > maxW) { x = 0; y -= rowH + 6; rowH = 0; }
      const q = Object.assign({}, p, { shapes: p.shapes.map(s => G.placeShape(s, x - b.x0, y - b.y1, 0)) }); x += w + 6; rowH = Math.max(rowH, h); return q; });
  }

  /* ---------------- the math ---------------- */
  function work(S) {
    const R = solve(S), p1 = R.list[0], out = [];
    if (!p1 || !R.P[p1.id]) return '';
    const q1 = R.P[p1.id], n1 = S.motor;
    R.list.slice(1).forEach(p => { const r = rpmOf(R, p.id), q = R.P[p.id]; if (r == null || q.shaft || q.side === 'out') return; out.push(`n<sub>${p.id}</sub> = n<sub>in</sub> × z<sub>in</sub> ÷ z<sub>${p.id}</sub> = ${f(n1, 0)} × ${q1.z} ÷ ${q.z} = <b>${f(Math.abs(r), 1)} rpm</b>`); });
    R.belts.forEach(B => {
      const q = B.C[0];
      out.push(`Pitch circle of a ${q.z}-tooth sprocket: D = p ÷ sin(180° ÷ z) = ${f(B.D.p, 2)} ÷ sin(${f(180 / q.z, 2)}°) = <b>${f(2 * q.r, 1)} mm</b>`);
      out.push(`Chain ${B.k}: path length ≈ ${f(B.Lc, 1)} mm ÷ ${f(B.D.p, 2)} mm pitch = ${f(B.Lc / B.D.p, 2)} links, so use <b>${B.N} links</b> (an even number avoids an offset link)`);
      out.push(`Chain speed v = p × z × n ÷ 60 000 = <b>${f(B.speed, 2)} m/s</b>`);
      if (B.F > 0 && B.D.brk > 0) out.push(`Pull on chain ${B.k} = torque ÷ pitch radius = ${f(S.torque, 2)} ÷ ${f(q.r / 1000, 4)} = <b>${f(B.F, 0)} N</b>; breaking load ${f(B.D.brk, 1)} kN gives a safety factor of <b>${f(B.D.brk * 1000 / B.F, 1)}</b>`);
    });
    return '<ol class="gmath">' + out.map(s => `<li>${s}</li>`).join('') + '</ol>';
  }

  /* ---------------- icons for the design picker, drawn from the real sprocket outline ---------------- */
  const svgOf = sh => {
    const sc = 13 / 12, T = ([x, y]) => `${(24 + x * sc).toFixed(1)} ${(16 - y * sc).toFixed(1)}`;
    const rings = [sh.outer].concat(sh.holes || []).map(r => 'M' + r.filter((_, i) => i % 3 === 0).map(T).join('L') + 'Z');
    const circ = (sh.circles || []).map(c => `<circle cx="${(24 + c.x * sc).toFixed(1)}" cy="${(16 - c.y * sc).toFixed(1)}" r="${(c.r * sc).toFixed(1)}"/>`).join('');
    return `<path fill-rule="evenodd" d="${rings.join('')}"/>` + circ;
  };
  const designIcon = d => {
    const D = dimsOf({ size: '40' }), sp = sprocket(18, D, { design: d, n: 5, web: 0, hub: 0, rim: 0, crn: 0, sweep: 35, bore: 8, key: 0 }), k = 12 / sp.Ra, sh = sp.shape;
    const s = a => a.map(r => r.map(([x, y]) => [x * k, y * k]));
    return svgOf({ outer: s([sh.outer])[0], holes: s(sh.holes), circles: sh.circles.map(c => ({ x: c.x * k, y: c.y * k, r: c.r * k })) });
  };

  const DEF = {
    id: 'chains', title: 'Chain and sprocket generator', subtitle: 'Roller chain or plate chain, sprockets anywhere you like, several chains and shafts. Cut the sprockets and every chain part.',
    defaults: { spr: JSON.stringify(PRE.tens.P), chains: D0.chains, motor: 300, dir: 1, torque: 2, design: 'solid', pn: 5, web: 0, hub: 0, rim: 0, crn: 0, sweep: 35, key: 0, sth: 0, copies: 0, rollers: 1, grid: 1, guides: 1, labels: 1, rpm: 20 },
    panel(ui) {
      ui.section('Sprockets', () => ui.custom(sprocketEditor));
      ui.section('Chains', () => ui.custom(chainEditor));
      ui.section('Sprocket design', () => {
        ui.pick('design', 'Default design', DESIGNS.map(([v, l]) => [v, l, designIcon(v)]), { tips: { solid: 'A plain disc', holes: 'A ring of round holes', teardrop: 'Teardrop pockets, narrow end inward', spokes: 'Skeleton: straight spokes with pockets between', swirl: 'Curved spokes with swept pockets' } });
        ui.num('pn', 'Pockets / spokes', { min: 3, max: 16, step: 1, int: true, show: S => S.design !== 'solid' });
        ui.num('web', 'Spoke width', { unit: 'mm', min: 0, max: 60, step: 0.5, show: S => S.design !== 'solid', help: '0 sets it automatically from the sprocket size' });
        ui.num('sweep', 'Swirl', { unit: '°', min: -90, max: 90, step: 5, show: S => S.design === 'swirl', help: 'How far each spoke curves from hub to rim. Negative bends the other way.' });
        ui.num('hub', 'Hub Ø', { unit: 'mm', min: 0, max: 400, step: 1, show: S => S.design !== 'solid', help: '0 sets it automatically' });
        ui.num('rim', 'Rim width', { unit: 'mm', min: 0, max: 100, step: 0.5, show: S => S.design !== 'solid', help: 'Material between the pockets and the tooth roots. 0 sets it automatically.' });
        ui.num('crn', 'Pocket corner radius', { unit: 'mm', min: 0, max: 30, step: 0.5, show: S => S.design === 'spokes' || S.design === 'swirl', help: '0 sets it automatically' });
        ui.check('key', 'Keyway in the bore');
        ui.note('You can give each sprocket its own design in the Sprockets list.');
      }, { hl: p => !!p._sp });
      ui.section('Motor', () => {
        ui.num('motor', 'Motor speed', { unit: 'rpm', min: 0, max: 20000, step: 10 });
        ui.num('torque', 'Motor torque', { unit: 'N·m', min: 0, max: 10000, step: 0.1, help: 'Used for the pull on the chain and its safety factor' });
        ui.seg('dir', 'Motor turns', [[1, 'Anticlockwise'], [-1, 'Clockwise']]);
        ui.check('rollers', 'Show rollers seated in the teeth');
      });
      ui.section('Parts for export', () => {
        ui.num('sth', 'Sprocket thickness', { unit: 'mm', min: 0, max: 200, step: 0.5, help: '0 sets it from the chain width. For laser cutting, use your sheet thickness.' });
        ui.check('copies', 'Export every copy of each chain part');
        ui.note('Chain parts are named with how many you need. Tick the box to repeat each one that many times, ready to cut.');
      }, { closed: true });
      ui.section('The math', () => { ui.note('', { live: S => work(S) }); });
    },
    model,
    exportParts,
    fileTag: S => `${parse(S).map(p => p.z).join('-')}t-${parseC(S)[0].size}`,
    info(S) {
      const R = solve(S), rows = [], p1 = R.list[0], d0 = p1 && R.P[p1.id];
      R.belts.forEach(B => {
        const c = B.cd, D = B.D;
        rows.push([`Chain ${B.k}`, `${SIZES[c.size].name.split(' (')[0]} · ${f(D.p, 2)} mm pitch${c.type === 'plate' ? ' · plate' : ''}${B.strands > 1 ? ' · ' + B.strands + ' strands' : ''}`], [`Chain ${B.k} length`, `${B.N} links · ${f(B.N * D.p, 1)} mm`], [`Chain ${B.k} speed`, f(B.speed, 2) + ' m/s', B.speed > 15 ? 'soft' : 0]);
        if (B.F > 0 && D.brk > 0) rows.push([`Chain ${B.k} pull`, `${f(B.F, 0)} N · safety factor ${f(D.brk * 1000 / B.F, 1)}`, D.brk * 1000 / B.F < 8 ? 'soft' : 0]);
      });
      R.list.forEach(p => { const r = rpmOf(R, p.id), q = R.P[p.id]; if (r != null) rows.push([`${p.id} (${q.z}T${q.side === 'out' ? ', idler' : ''}) pitch Ø ${f(2 * q.r, 1)}`, `${f(Math.abs(r), 1)} rpm ${r > 0 ? '↺' : '↻'}`]); });
      if (d0) { const last = R.list.filter(p => rpmOf(R, p.id) != null && R.P[p.id].side !== 'out').pop(), rl = last && rpmOf(R, last.id); if (rl) rows.splice(0, 0, [`Speed ratio (P1 → ${last.id})`, '1 : ' + f(Math.abs(S.motor / rl), 3)]); }
      R.belts.forEach(B => {
        B.arcs.forEach(a => { const q = a.c, teeth = a.w / (TAU / q.z);
          if (q.side !== 'out' && teeth < 3) rows.push([`${q.id} engages ${f(teeth, 1)} teeth`, 'At least 3 teeth should be in contact. Use more teeth, or add an idler to wrap more chain round it.', 2]);
          if (q.z < 9 && q.side !== 'out') rows.push([`${q.id} is very small`, `A ${q.z}-tooth sprocket makes the chain jerk and wear fast. 15 teeth or more run best.`, 'soft']); });
        if (B.slack < -0.4 * B.D.p) rows.push([`Chain ${B.k} is tight`, `${B.N} links is ${f(-B.slack, 1)} mm too short for this layout. Move a sprocket closer or use a tensioner.`, 2]);
        else if (B.slack > 0.5 * B.D.p) rows.push([`Chain ${B.k} is slack`, `${B.N} links leaves ${f(B.slack, 1)} mm of slack. Move a sprocket apart, or add a tensioner.`, 'soft']);
      });
      R.errs.forEach(e => rows.push([e[0], e[1], 2]));
      return rows;
    }
  };
  G.create(DEF);
})();
