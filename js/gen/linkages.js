/* Linkage generator: four-bar linkage with a coupler point, and slider-crank. Bars come out as cuttable links with pivot holes. MIT licence. */
(function () {
  const G = window.GEN, TAU = Math.PI * 2, deg = Math.PI / 180;
  const f = (v, d) => (v == null || !isFinite(v)) ? '—' : (+v).toFixed(d == null ? 1 : d);

  /* ---------- shapes ---------- */
  function hull(pts) {   // monotone chain convex hull, counter-clockwise
    const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]), cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = [];
    p.forEach(q => { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); });
    p.slice().reverse().forEach(q => { while (up.length > 1 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); });
    return lo.slice(0, -1).concat(up.slice(0, -1));
  }
  // a link: rounded plate around the given pivot points, with a hole at each
  function link(pins, w, hole) { const pts = []; pins.forEach(([x, y]) => pts.push(...G.circlePts(x, y, w / 2, 40))); return { outer: hull(pts), circles: hole > 0 ? pins.map(([x, y]) => ({ x, y, r: hole / 2 })) : [] }; }

  /* ---------- kinematics ---------- */
  function fourBar(S, th) {
    const A = [S.a * Math.cos(th), S.a * Math.sin(th)], O4 = [S.d, 0], dx = O4[0] - A[0], dy = O4[1] - A[1], dd = Math.hypot(dx, dy);
    if (dd > S.b + S.c || dd < Math.abs(S.b - S.c) || dd < 1e-9) return null;
    const k = (S.b * S.b - S.c * S.c + dd * dd) / (2 * dd), h = Math.sqrt(Math.max(S.b * S.b - k * k, 0)), sg = S.branch ? -1 : 1;
    const B = [A[0] + k * dx / dd - sg * h * dy / dd, A[1] + k * dy / dd + sg * h * dx / dd];
    const ux = (B[0] - A[0]) / S.b, uy = (B[1] - A[1]) / S.b, P = [A[0] + S.u * ux - S.v * uy, A[1] + S.u * uy + S.v * ux];
    const mu = Math.acos(Math.max(-1, Math.min(1, ((A[0] - B[0]) * (O4[0] - B[0]) + (A[1] - B[1]) * (O4[1] - B[1])) / (S.b * S.c))));
    return { A, B, P, O4, mu, rock: Math.atan2(B[1], B[0] - S.d) };
  }
  function slider(S, th) {
    const A = [S.r * Math.cos(th), S.r * Math.sin(th)], dy = S.e - A[1];
    if (Math.abs(dy) > S.l) return null;
    const B = [A[0] + Math.sqrt(S.l * S.l - dy * dy), S.e];
    return { A, B, P: B, x: B[0] };
  }
  const solve = (S, th) => S.kind === 'fourbar' ? fourBar(S, th) : slider(S, th);

  // find which crank angles work: a full turn, or an arc the crank must rock back and forth in
  const rangeCache = {};
  function range(S) {
    const key = JSON.stringify([S.kind, S.a, S.b, S.c, S.d, S.r, S.l, S.e, S.branch]); if (rangeCache.key === key) return rangeCache.v;
    const N = 720, ok = []; for (let i = 0; i < N; i++) ok.push(!!solve(S, i / N * TAU));
    let v;
    if (ok.every(Boolean)) v = { full: true };
    else if (!ok.some(Boolean)) v = { none: true };
    else {   // longest run of valid angles
      let best = [0, 0], i0 = ok.findIndex(x => !x);
      for (let s = 0, run = 0, start = 0; s < N; s++) { const i = (i0 + 1 + s) % N; if (ok[i]) { if (!run) start = i; run++; if (run > best[1]) best = [start, run]; } else run = 0; }
      const lo = (best[0] + 1) / N * TAU, hi = (best[0] + best[1] - 1) / N * TAU;
      v = { lo, hi };
    }
    rangeCache.key = key; rangeCache.v = v; return v;
  }
  const crankAt = (S, t) => { const R = range(S); if (R.full || R.none) return t; return (R.lo + R.hi) / 2 + (R.hi - R.lo) / 2 * Math.sin(t); };

  // sample one cycle for the readout and the traced path
  const cycCache = {};
  function cycle(S) {
    const key = JSON.stringify(S); if (cycCache.key === key) return cycCache.v;
    const R = range(S), pts = [], n = 360; let prev = null, wrap = 0, muMin = 1e9, muMax = -1e9, rMin = 1e9, rMax = -1e9, thMin = 0, thMax = 0;
    for (let i = 0; i <= n; i++) {
      const th = R.full ? i / n * TAU : R.none ? 0 : R.lo + (R.hi - R.lo) * i / n, s = solve(S, th); if (!s) continue;
      pts.push(s.P);
      if (S.kind === 'fourbar') {
        if (prev != null) { const dr = s.rock + wrap - prev; if (dr > Math.PI) wrap -= TAU; else if (dr < -Math.PI) wrap += TAU; }   // keep the rocker angle continuous across ±180°
        s.rock += wrap; prev = s.rock;
        muMin = Math.min(muMin, s.mu); muMax = Math.max(muMax, s.mu); if (s.rock < rMin) { rMin = s.rock; thMin = th; } if (s.rock > rMax) { rMax = s.rock; thMax = th; } }
      else { if (s.x < rMin) { rMin = s.x; thMin = th; } if (s.x > rMax) { rMax = s.x; thMax = th; } }
    }
    const fw = ((thMin - thMax) % TAU + TAU) % TAU, Q = R.full ? Math.max(fw, TAU - fw) / Math.min(fw, TAU - fw) : NaN;
    const b = G.bounds([{ curves: [pts] }]);
    const v = { pts, muMin, muMax, swing: rMax - rMin, Q, size: [b.x1 - b.x0, b.y1 - b.y0], R };
    cycCache.key = key; cycCache.v = v; return v;
  }

  function grashof(S) {
    const L = [['crank', S.a], ['coupler', S.b], ['rocker', S.c], ['frame', S.d]].sort((x, y) => x[1] - y[1]), ok = L[0][1] + L[3][1] <= L[1][1] + L[2][1];
    return { ok, type: !ok ? 'Triple rocker (no bar turns fully)' : L[0][0] === 'crank' ? 'Crank-rocker' : L[0][0] === 'frame' ? 'Double crank' : L[0][0] === 'rocker' ? 'Rocker-crank' : 'Double rocker' };
  }

  /* ---------- parts ---------- */
  function partsAt(S, s) {
    const W = S.w, H = S.hole;
    if (S.kind === 'fourbar') {
      const pins = [s.A, s.B]; if (S.pen && (Math.abs(S.v) > 0.01 || S.u < -0.01 || S.u > S.b + 0.01)) pins.push(s.P);
      return [
        { name: 'Frame', thickness: S.t, shapes: [link([[0, 0], [S.d, 0]], W, H)], fill: 'dark' },
        { name: 'Crank', thickness: S.t, shapes: [link([[0, 0], s.A], W, H)] },
        { name: 'Rocker', thickness: S.t, shapes: [link([s.O4, s.B], W, H)] },
        { name: 'Coupler', thickness: S.t, shapes: [link(pins, W, H)], fill: 'accent' }
      ];
    }
    const blk = [[s.B[0] - S.bw / 2, s.B[1] - S.bh / 2], [s.B[0] + S.bw / 2, s.B[1] - S.bh / 2], [s.B[0] + S.bw / 2, s.B[1] + S.bh / 2], [s.B[0] - S.bw / 2, s.B[1] + S.bh / 2]];
    return [
      { name: 'Crank', thickness: S.t, shapes: [link([[0, 0], s.A], W, H)] },
      { name: 'Rod', thickness: S.t, shapes: [link([s.A, s.B], W, H)], fill: 'accent' },
      { name: 'Slider', thickness: S.t, shapes: [{ outer: blk, circles: H > 0 ? [{ x: s.B[0], y: s.B[1], r: H / 2 }] : [] }] }
    ];
  }

  /* ================= Multi-link: build any linkage from ground pivots, cranks, two-bar joints and points on links ================= */
  // Each step only refers to earlier points, so the whole mechanism solves in one pass for any crank angle.
  //   ground {x, y}                fixed pivot
  //   crank  {c, r, a0}            turns about ground point c; a0 = starting angle (cranks on one centre turn together)
  //   joint  {p, l1, q, l2, flip}  two new links, p→new (l1) and q→new (l2), meeting at a new pin; flip picks the side
  //   point  {p, q, u, v}          a point fixed to link p–q: u along it, v to the left. The link becomes a plate.
  const J = { a: 38, b: 41.5, c: 39.3, d: 40.1, e: 55.8, f: 39.4, g: 36.7, h: 65.7, i: 49, j: 50, k: 61.9, l: 7.8, m: 15 }, js = 2.5;
  const PRESETS = {
    fourbar: { name: 'Four-bar', M: [{ id: 'A', type: 'ground', x: 0, y: 0 }, { id: 'D', type: 'ground', x: 80, y: 0 }, { id: 'B', type: 'crank', c: 'A', r: 30, a0: 0 }, { id: 'C', type: 'joint', p: 'B', l1: 90, q: 'D', l2: 70, flip: 0 }, { id: 'P', type: 'point', p: 'B', q: 'C', u: 45, v: 35, trace: 1 }] },
    sixbar: { name: 'Six-bar', M: [{ id: 'A', type: 'ground', x: 0, y: 0 }, { id: 'D', type: 'ground', x: 80, y: 0 }, { id: 'G', type: 'ground', x: 160, y: 40 }, { id: 'B', type: 'crank', c: 'A', r: 30, a0: 0 }, { id: 'C', type: 'joint', p: 'B', l1: 90, q: 'D', l2: 70, flip: 0 }, { id: 'P', type: 'point', p: 'B', q: 'C', u: 45, v: 35, trace: 1 }, { id: 'E', type: 'joint', p: 'P', l1: 120, q: 'G', l2: 100, flip: 0, trace: 1 }] },
    jansen: { name: 'Jansen leg', M: [{ id: 'O', type: 'ground', x: 0, y: 0 }, { id: 'A', type: 'ground', x: J.a * js, y: J.l * js }, { id: 'X', type: 'crank', c: 'A', r: J.m * js, a0: 0 },
      { id: 'T', type: 'joint', p: 'O', l1: J.b * js, q: 'X', l2: J.j * js, flip: 0 }, { id: 'L', type: 'joint', p: 'O', l1: J.d * js, q: 'T', l2: J.e * js, flip: 0 }, { id: 'Y', type: 'joint', p: 'O', l1: J.c * js, q: 'X', l2: J.k * js, flip: 1 },
      { id: 'Z', type: 'joint', p: 'L', l1: J.f * js, q: 'Y', l2: J.g * js, flip: 1 }, { id: 'F', type: 'joint', p: 'Z', l1: J.h * js, q: 'Y', l2: J.i * js, flip: 1, trace: 1 }] },
    blank: { name: 'Start over', M: [{ id: 'A', type: 'ground', x: 0, y: 0 }, { id: 'B', type: 'crank', c: 'A', r: 30, a0: 0, trace: 1 }] }
  };
  const TYPE = { ground: 'Ground pivot', crank: 'Crank', joint: 'Two-bar joint', point: 'Point on a link' };
  const mCache = {};
  const parseM = S => { if (mCache.s !== S.mech) { try { mCache.M = JSON.parse(S.mech); } catch (e) { mCache.M = PRESETS.fourbar.M; } mCache.s = S.mech; } return mCache.M; };

  function solveM(M, th) {
    const P = {};
    for (const e of M) {
      if (e.type === 'ground') P[e.id] = [e.x, e.y];
      else if (e.type === 'crank') { const c = P[e.c]; if (!c) return null; const a = th + e.a0 * deg; P[e.id] = [c[0] + e.r * Math.cos(a), c[1] + e.r * Math.sin(a)]; }
      else if (e.type === 'joint') {
        const p = P[e.p], q = P[e.q]; if (!p || !q) return null; const dx = q[0] - p[0], dy = q[1] - p[1], d = Math.hypot(dx, dy);
        if (d < 1e-9 || d > e.l1 + e.l2 || d < Math.abs(e.l1 - e.l2)) return null;
        const k = (e.l1 * e.l1 - e.l2 * e.l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(e.l1 * e.l1 - k * k, 0)), s = e.flip ? -1 : 1;
        P[e.id] = [p[0] + k * dx / d - s * h * dy / d, p[1] + k * dy / d + s * h * dx / d];
      } else if (e.type === 'point') {
        const p = P[e.p], q = P[e.q]; if (!p || !q) return null; const L = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1, ux = (q[0] - p[0]) / L, uy = (q[1] - p[1]) / L;
        P[e.id] = [p[0] + e.u * ux - e.v * uy, p[1] + e.u * uy + e.v * ux];
      }
    }
    return P;
  }
  // rigid bodies: the frame (all ground pivots) and the moving links, each a list of pin ids
  function bodiesM(M) {
    const frame = M.filter(e => e.type === 'ground').map(e => e.id), links = [], bad = [];
    const find = (a, b) => links.find(l => l.pins.includes(a) && l.pins.includes(b));
    M.forEach(e => {
      if (e.type === 'crank') { const same = links.find(l => l.crank && l.pins[0] === e.c); if (same) same.pins.push(e.id); else links.push({ pins: [e.c, e.id], crank: true }); }
      if (e.type === 'joint') { links.push({ pins: [e.p, e.id] }, { pins: [e.q, e.id] }); }
      if (e.type === 'point') { const l = find(e.p, e.q); if (l) l.pins.push(e.id); else { links.push({ pins: [e.p, e.q, e.id] }); bad.push(e.id); } }
    });
    links.forEach(l => l.name = (l.crank ? 'Crank ' : l.pins.length > 2 ? 'Plate ' : 'Link ') + l.pins.join('-'));
    return { frame, links, bad };
  }
  const mRange = {};
  function rangeM(S) {
    if (mRange.s === S.mech) return mRange.v;
    const M = parseM(S), N = 720, ok = []; for (let i = 0; i < N; i++) ok.push(!!solveM(M, i / N * TAU));
    let v;
    if (!M.some(e => e.type === 'crank')) v = { still: true, none: !ok[0] };
    else if (ok.every(Boolean)) v = { full: true };
    else if (!ok.some(Boolean)) v = { none: true };
    else { let best = [0, 0], i0 = ok.findIndex(x => !x); for (let s = 0, run = 0, start = 0; s < N; s++) { const i = (i0 + 1 + s) % N; if (ok[i]) { if (!run) start = i; run++; if (run > best[1]) best = [start, run]; } else run = 0; } v = { lo: (best[0] + 1) / N * TAU, hi: (best[0] + best[1] - 1) / N * TAU }; }
    mRange.s = S.mech; mRange.v = v; return v;
  }
  const angleM = (S, t) => { const R = rangeM(S); return R.full ? t : R.still || R.none ? 0 : (R.lo + R.hi) / 2 + (R.hi - R.lo) / 2 * Math.sin(t); };
  const mCyc = {};
  function cycleM(S) {
    if (mCyc.s === S.mech) return mCyc.v;
    const M = parseM(S), R = rangeM(S), paths = {}, minAng = {}; M.filter(e => e.trace).forEach(e => paths[e.id] = []);
    for (let i = 0; i <= 360; i++) {
      const th = R.full ? i / 360 * TAU : R.lo != null ? R.lo + (R.hi - R.lo) * i / 360 : 0, P = solveM(M, th); if (!P) continue;
      Object.keys(paths).forEach(id => paths[id].push(P[id]));
      M.filter(e => e.type === 'joint').forEach(e => {   // angle between the two links at each joint; near 0° or 180° the joint locks up
        const a = P[e.p], b = P[e.q], c = P[e.id], u = [a[0] - c[0], a[1] - c[1]], w = [b[0] - c[0], b[1] - c[1]];
        let g = Math.acos(Math.max(-1, Math.min(1, (u[0] * w[0] + u[1] * w[1]) / (Math.hypot(...u) * Math.hypot(...w) || 1)))); g = Math.min(g, Math.PI - g);
        minAng[e.id] = Math.min(minAng[e.id] ?? 9, g);
      });
    }
    mCyc.s = S.mech; mCyc.v = { paths, minAng }; return mCyc.v;
  }
  function multiParts(S, P, M) {
    const B = bodiesM(M), W = S.w, H = S.hole, parts = [];
    const fr = B.frame.map(id => P[id]);
    if (fr.length) parts.push({ name: 'Frame', thickness: S.t, fill: 'dark', shapes: [link(fr, W * 1.6, H)], pins: B.frame });
    B.links.forEach(l => parts.push({ name: l.name, thickness: S.t, fill: l.pins.length > 2 ? 'accent' : 'base', shapes: [link(l.pins.map(id => P[id]), W, H)], pins: l.pins }));
    return parts;
  }
  function multiModel(S, t) {
    const M = parseM(S), th = angleM(S, t), P = solveM(M, th);
    if (!P) return { parts: [], guides(d) { d.text('This linkage cannot be put together. Check the lengths of the last joint you changed.', 0, 0, { color: getComputedStyle(document.documentElement).getPropertyValue('--warn'), size: 13 }); } };
    const parts = multiParts(S, P, M), cyc = cycleM(S);
    if (S.curve) Object.values(cyc.paths).forEach(pts => parts.push({ name: 'Path', shapes: [], curves: [pts] }));
    return {
      parts, guides(d) {
        const css = n => getComputedStyle(document.documentElement).getPropertyValue(n), ink = css('--ink');
        M.filter(e => e.type === 'ground').forEach(e => { const k = 9 / d.scale(), x = e.x, y = e.y; d.path([[x, y], [x - k, y - 1.6 * k], [x + k, y - 1.6 * k]], { close: true, color: ink }); });
        if (d.guides()) M.filter(e => e.type === 'crank').forEach(e => d.circle(P[e.c][0], P[e.c][1], e.r, { dash: [4, 4] }));
        M.filter(e => e.trace).forEach(e => d.dot(P[e.id][0], P[e.id][1], 5));
        const tag = d.hlTag(); if (tag && P[tag]) { d.circle(P[tag][0], P[tag][1], 14 / d.scale(), { color: css('--red'), w: 2.2 }); d.circle(P[tag][0], P[tag][1], 20 / d.scale(), { color: css('--red'), w: 0.8, dash: [3, 3] }); }
        if (d.labels()) M.forEach(e => d.text(e.id, P[e.id][0] + 13 / d.scale(), P[e.id][1] + 13 / d.scale(), { color: e.trace ? css('--red') : ink, weight: 700 }));
      }
    };
  }
  function multiExport(S, layout) {
    const M = parseM(S), P = solveM(M, angleM(S, 0)); if (!P) return [];
    const parts = multiParts(S, P, M), cyc = cycleM(S), curves = S.curve ? Object.values(cyc.paths) : [];
    if (layout === 'assembled') { parts.forEach((p, i) => p.z = i * S.t); if (curves.length) parts.push({ name: 'Path', shapes: [], curves }); return parts; }
    const out = [], W = S.w, H = S.hole, frame = parts.find(p => p.name === 'Frame');
    if (frame) { frame.curves = curves; out.push(frame); } else if (curves.length) out.push({ name: 'Path', shapes: [], curves });
    const b = G.bounds(out.length ? out : [{ curves: [[[0, 0]]] }]); let x = b.x0, y = b.y0 - W * 2, rowH = 0;
    parts.filter(p => p !== frame).forEach(p => {   // straighten each link along its first two pins and lay them out in rows under the frame
      const pts = p.pins.map(id => P[id]), [p0, p1] = pts, ang = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]);
      const loc = pts.map(q => { const dx = q[0] - p0[0], dy = q[1] - p0[1]; return [dx * Math.cos(-ang) - dy * Math.sin(-ang), dx * Math.sin(-ang) + dy * Math.cos(-ang)]; });
      const minX = Math.min(...loc.map(q => q[0])), maxX = Math.max(...loc.map(q => q[0])), minY = Math.min(...loc.map(q => q[1])), maxY = Math.max(...loc.map(q => q[1]));
      if (x > b.x0 && x + (maxX - minX) > b.x0 + Math.max(400, b.x1 - b.x0)) { x = b.x0; y -= rowH + W + 6; rowH = 0; }
      out.push({ name: p.name, thickness: S.t, shapes: [link(loc.map(([u, v]) => [u - minX + x + W / 2, v - maxY + y - W / 2]), W, H)] });
      x += maxX - minX + W + 6; rowH = Math.max(rowH, maxY - minY + W);
    });
    return out;
  }
  function multiInfo(S) {
    const M = parseM(S), R = rangeM(S), B = bodiesM(M), rows = [];
    if (R.none) return [['Cannot assemble', 'Some links are too short or too long to meet. Check the last joint you changed.', 2]];
    // Gruebler: DOF = 3(n − 1) − 2j, n bodies including the frame, j pin joints
    const bodies = [B.frame].concat(B.links.map(l => l.pins)), count = {}; bodies.forEach(b => b.forEach(id => count[id] = (count[id] || 0) + 1));
    const n = bodies.length, j = Object.values(count).reduce((s, k) => s + k - 1, 0), dof = 3 * (n - 1) - 2 * j, inputs = new Set(M.filter(e => e.type === 'crank').map(e => e.c)).size;
    rows.push(['Links', String(n - 1) + ' + frame'], ['Pin joints', String(j)], ['Degrees of freedom', String(dof), dof !== inputs]);
    rows.push(['Crank', R.full ? 'Turns fully' : R.still ? 'No crank yet' : `Rocks over ${f((R.hi - R.lo) / deg, 0)}°`]);
    const cyc = cycleM(S);
    Object.entries(cyc.paths).forEach(([id, pts]) => { const b = G.bounds([{ curves: [pts] }]); rows.push([`Path of ${id}`, `${f(b.x1 - b.x0)} × ${f(b.y1 - b.y0)} mm`]); });
    const worst = Object.entries(cyc.minAng).sort((a, b) => a[1] - b[1])[0];
    if (worst) rows.push([`Tightest joint (${worst[0]})`, f(worst[1] / deg, 0) + '°', worst[1] < 8 * deg]);   // below about 8° a pin joint tends to jam
    if (dof !== inputs) rows.push(['Check the structure', dof > inputs ? 'Some parts can flop about freely' : 'Some parts are over-constrained and would jam', 2]);
    B.bad.forEach(id => rows.push([`Point ${id}`, 'Its two reference points are not on the same link', 2]));
    if (S.hole >= S.w - 2) rows.push(['Holes too big', 'Leave at least 1 mm of material around each hole', 2]);
    return rows;
  }

  /* editor for the multi-link list */
  function multiEditor(el, api) {
    const S = api.S; let shown = null;
    const M = () => JSON.parse(S.mech), save = m => { S.mech = JSON.stringify(m); shown = S.mech; api.changed(); };
    const nextId = m => { const used = new Set(m.map(e => e.id)); for (let n = 0; ; n++) for (const ch of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') { const id = ch + (n || ''); if (!used.has(id)) return id; } };
    const num = (i, k, v, label, unit) => `<label class="mf"><span>${label}</span><span class="gin"><input type="number" data-i="${i}" data-f="${k}" value="${v}" step="1"><span>${unit || ''}</span></span></label>`;
    const sel = (i, k, v, label, opts) => `<label class="mf"><span>${label}</span><select data-i="${i}" data-f="${k}">${opts.map(o => `<option value="${o}"${o === v ? ' selected' : ''}>${o}</option>`).join('')}</select></label>`;
    function render() {
      const m = M(); shown = S.mech;
      const linksBefore = i => bodiesM(m.slice(0, i)).links.map(l => l.pins.slice(0, 2).join('–'));
      el.innerHTML = `
        <div class="mpre"><span>Start from</span>${Object.entries(PRESETS).map(([k, p]) => `<button data-pre="${k}">${p.name}</button>`).join('')}</div>
        <ol class="mlist">${m.map((e, i) => {
          const before = m.slice(0, i).map(x => x.id), grounds = m.slice(0, i).filter(x => x.type === 'ground').map(x => x.id);
          let body = '';
          if (e.type === 'ground') body = num(i, 'x', e.x, 'x', 'mm') + num(i, 'y', e.y, 'y', 'mm');
          if (e.type === 'crank') body = sel(i, 'c', e.c, 'Turns about', grounds) + num(i, 'r', e.r, 'Radius', 'mm') + num(i, 'a0', e.a0, 'Start angle', '°');
          if (e.type === 'joint') body = sel(i, 'p', e.p, 'From', before) + num(i, 'l1', e.l1, 'Length', 'mm') + sel(i, 'q', e.q, 'and from', before) + num(i, 'l2', e.l2, 'Length', 'mm')
            + `<label class="mf"><span>Side</span><span class="gseg"><button data-i="${i}" data-flip="0" class="${e.flip ? '' : 'on'}">Left</button><button data-i="${i}" data-flip="1" class="${e.flip ? 'on' : ''}">Right</button></span></label>`;
          if (e.type === 'point') body = sel(i, 'pq', e.p + '–' + e.q, 'On link', linksBefore(i)) + num(i, 'u', e.u, 'Along', 'mm') + num(i, 'v', e.v, 'Sideways', 'mm');
          const trace = e.type === 'ground' ? '' : `<label class="mtr"><input type="checkbox" data-i="${i}" data-f="trace"${e.trace ? ' checked' : ''}> trace path</label>`;
          return `<li class="mitem m-${e.type}"><div class="mhead"><b>${e.id}</b><span>${TYPE[e.type]}</span>${trace}<button data-del="${i}" title="Remove ${e.id} and anything built on it">×</button></div><div class="mbody">${body}</div></li>`;
        }).join('')}</ol>
        <div class="madd"><span>Add</span><button data-add="joint">Two-bar joint</button><button data-add="point">Point on a link</button><button data-add="crank">Crank</button><button data-add="ground">Ground pivot</button></div>
        <p class="ghelp">Point at a card to find that pin and its links on the drawing. A <b>two-bar joint</b> adds two new links that meet at a new pin, joined to any two points you already have. That is how six-bars, walking legs and other big linkages are built. Each step can only use points above it.</p>`;
      el.querySelectorAll('.mitem').forEach((li, n) => { const id = m[n].id; api.hl(li, p => (p.pins || []).includes(id), id); });
    }
    el.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return; const m = M();
      if (b.dataset.pre) { save(PRESETS[b.dataset.pre].M); render(); api.fit(); api.toast(PRESETS[b.dataset.pre].name + ' loaded'); return; }
      if (b.dataset.flip != null) { m[+b.dataset.i].flip = +b.dataset.flip; save(m); render(); return; }
      if (b.dataset.del != null) {   // remove it and everything that depends on it
        const gone = new Set([m[+b.dataset.del].id]); let keep = m.filter((x, i) => i !== +b.dataset.del), again = true;
        while (again) { again = false; keep = keep.filter(x => { const deps = [x.c, x.p, x.q].filter(Boolean); if (deps.some(dd => gone.has(dd))) { gone.add(x.id); again = true; return false; } return true; }); }
        if (!keep.length) keep = PRESETS.blank.M; save(keep); render(); if (gone.size > 1) api.toast('Removed ' + [...gone].join(', ')); return;
      }
      if (b.dataset.add) {
        const t = b.dataset.add, id = nextId(m), P = solveM(m, 0) || {}, ids = m.map(x => x.id), grounds = m.filter(x => x.type === 'ground');
        if (t === 'ground') { const b0 = G.bounds([{ curves: [Object.values(P).length ? Object.values(P) : [[0, 0]]] }]); m.push({ id, type: 'ground', x: Math.round(b0.x1 + 40), y: Math.round(b0.y0) }); }
        if (t === 'crank') { if (!grounds.length) return api.toast('Add a ground pivot first'); m.push({ id, type: 'crank', c: grounds[0].id, r: 20, a0: 0 }); }
        if (t === 'joint') {
          if (ids.length < 2) return api.toast('You need two points to join');
          const p = ids[ids.length - 1], q = grounds.length && grounds[grounds.length - 1].id !== p ? grounds[grounds.length - 1].id : ids[ids.length - 2];
          // try a few length pairs and keep the one that lets the crank turn fully with the most open joint angle
          const d0 = P[p] && P[q] ? Math.hypot(P[q][0] - P[p][0], P[q][1] - P[p][1]) : 60; let best = null;
          for (const k1 of [0.6, 0.8, 1, 1.2, 1.5]) for (const k2 of [0.6, 0.8, 1, 1.2, 1.5]) {
            const e = { id, type: 'joint', p, l1: Math.round(Math.max(20, d0 * k1)), q, l2: Math.round(Math.max(20, d0 * k2)), flip: 0, trace: 1 }, mm = m.concat([e]); let ok = 0, worst = 9;
            for (let i = 0; i < 90; i++) { const Q = solveM(mm, i / 90 * TAU); if (!Q) continue; ok++; const a = Q[p], c = Q[q], x = Q[id], u = [a[0] - x[0], a[1] - x[1]], w = [c[0] - x[0], c[1] - x[1]]; let g = Math.acos(Math.max(-1, Math.min(1, (u[0] * w[0] + u[1] * w[1]) / (Math.hypot(...u) * Math.hypot(...w) || 1)))); worst = Math.min(worst, g, Math.PI - g); }
            const score = ok * 10 + worst; if (!best || score > best[0]) best = [score, e];
          }
          m.push(best[1]);
        }
        if (t === 'point') {
          const ls = bodiesM(m).links; if (!ls.length) return api.toast('Add a link first'); const l = ls[ls.length - 1];
          const len = P[l.pins[0]] && P[l.pins[1]] ? Math.hypot(P[l.pins[1]][0] - P[l.pins[0]][0], P[l.pins[1]][1] - P[l.pins[0]][1]) : 40;
          m.push({ id, type: 'point', p: l.pins[0], q: l.pins[1], u: Math.round(len / 2), v: 25, trace: 1 });
        }
        save(m); render(); api.toast('Added ' + id + ' · ' + TYPE[t]);
      }
    });
    const edit = e => {
      const x = e.target; if (x.dataset.i == null || !x.dataset.f) return; const m = M(), it = m[+x.dataset.i], k = x.dataset.f;
      if (k === 'trace') it.trace = x.checked ? 1 : 0;
      else if (k === 'pq') { const [p, q] = x.value.split('–'); it.p = p; it.q = q; }
      else if (x.tagName === 'SELECT') it[k] = x.value;
      else { if (x.value === '' || !isFinite(+x.value)) return; it[k] = +x.value; if ((k === 'r' || k === 'l1' || k === 'l2') && it[k] <= 0) it[k] = 1; }
      save(m);
    };
    el.addEventListener('input', edit); el.addEventListener('change', edit);
    api.listen(() => { if (S.mech !== shown) render(); });
    render();
  }

  G.create({
    id: 'linkages', title: 'Linkage generator', subtitle: 'Four-bars, slider-cranks, or build your own with as many links as you like. Trace any point and cut the links out.',
    defaults: { mech: JSON.stringify(PRESETS.sixbar.M), kind: 'fourbar', a: 30, b: 90, c: 70, d: 80, u: 45, v: 35, branch: 0, pen: 1, r: 30, l: 90, e: 0, bw: 30, bh: 20, w: 12, hole: 4, t: 4, curve: 1, grid: 1, guides: 1, labels: 1, rpm: 20 },
    panel(ui) {
      ui.section('Linkage', () => {
        ui.seg('kind', 'Type', [['fourbar', 'Four-bar'], ['slider', 'Slider'], ['multi', 'Multi-link']], { refit: 1 });
        ui.note('', { live: S => S.kind === 'multi' ? 'Build it step by step in the <b>Links</b> section below.' : '' });
        const fb = { show: S => S.kind === 'fourbar' }, sc = { show: S => S.kind === 'slider' };
        ui.num('a', 'Crank a', Object.assign({ unit: 'mm', min: 1, max: 2000, hl: p => p.name === 'Crank' }, fb));
        ui.num('b', 'Coupler b', Object.assign({ unit: 'mm', min: 1, max: 2000, hl: p => p.name === 'Coupler' }, fb));
        ui.num('c', 'Rocker c', Object.assign({ unit: 'mm', min: 1, max: 2000, hl: p => p.name === 'Rocker' }, fb));
        ui.num('d', 'Frame d', Object.assign({ unit: 'mm', min: 1, max: 2000, hl: p => p.name === 'Frame' }, fb));
        ui.seg('branch', 'Assembly', [[0, 'Open'], [1, 'Crossed']], fb);
        ui.num('r', 'Crank r', Object.assign({ unit: 'mm', min: 1, max: 2000, hl: p => p.name === 'Crank' }, sc));
        ui.num('l', 'Rod l', Object.assign({ unit: 'mm', min: 1, max: 4000, hl: p => p.name === 'Rod' }, sc));
        ui.num('e', 'Offset e', Object.assign({ unit: 'mm', min: -2000, max: 2000, hl: p => p.name === 'Slider', help: 'Height of the slider line above the crank centre. Non-zero gives a quick return.' }, sc));
      });
      ui.section('Links', () => ui.custom(multiEditor), { show: S => S.kind === 'multi' });
      ui.section('Traced point', () => {
        ui.num('u', 'Along coupler', { unit: 'mm', min: -2000, max: 2000, hl: p => p.name === 'Coupler', show: S => S.kind === 'fourbar', help: 'Distance from joint A towards B' });
        ui.num('v', 'Off the coupler', { unit: 'mm', min: -2000, max: 2000, hl: p => p.name === 'Coupler', show: S => S.kind === 'fourbar', help: 'Sideways distance, to the left of A→B' });
        ui.check('pen', 'Hole at the traced point', { show: S => S.kind === 'fourbar' });
        ui.check('curve', 'Show and export the path');
        ui.note('The slider pin is the traced point.', { live: S => S.kind === 'slider' ? 'The slider pin is the traced point.' : 'Try u = 45, v = 35 for a D-shaped path, or v = 0 for a figure of eight on some linkages.' });
      }, { show: S => S.kind !== 'multi' });
      ui.section('Making it', () => {
        ui.check('curve', 'Show and export traced paths', { show: S => S.kind === 'multi' });
        ui.num('w', 'Bar width', { unit: 'mm', min: 2, max: 200, step: 0.5 });
        ui.num('hole', 'Pivot hole Ø', { unit: 'mm', min: 0, max: 100, step: 0.1, help: 'Match your bolt, pin or bearing' });
        ui.num('t', 'Thickness', { unit: 'mm', min: 0.5, max: 100, step: 0.5 });
        ui.num('bw', 'Slider length', { unit: 'mm', min: 2, max: 500, hl: p => p.name === 'Slider', show: S => S.kind === 'slider' });
        ui.num('bh', 'Slider height', { unit: 'mm', min: 2, max: 500, hl: p => p.name === 'Slider', show: S => S.kind === 'slider' });
      });
    },
    model(S, t) {
      if (S.kind === 'multi') return multiModel(S, t);
      const R = range(S), th = crankAt(S, t), s = solve(S, th) || solve(S, R.lo || 0);
      if (!s) return { parts: [{ name: 'Frame', shapes: [link([[0, 0], [S.kind === 'fourbar' ? S.d : S.r, 0]], S.w, S.hole)] }], guides(d) { d.text('These lengths cannot be assembled', 0, -30 / d.scale(), { color: '#ff8f7a' }); } };
      const parts = partsAt(S, s), cyc = cycle(S);
      if (S.curve) parts.push({ name: 'Path', shapes: [], curves: [cyc.pts] });
      return {
        parts, guides(d) {
          const ink = getComputedStyle(document.documentElement).getPropertyValue('--ink');
          const ground = (x, y) => { const k = 9 / d.scale(); d.path([[x, y], [x - k, y - 1.6 * k], [x + k, y - 1.6 * k]], { close: true, color: ink }); for (let i = -1; i <= 1; i += 0.5) d.line(x + i * k * 1.4, y - 1.6 * k, x + i * k * 1.4 - k * 0.5, y - 2.3 * k, { color: ink, w: 0.8 }); };
          ground(0, 0); if (S.kind === 'fourbar') ground(S.d, 0);
          if (S.kind === 'slider') { const x0 = Math.min(-S.r, 0) - 10, x1 = S.r + S.l + S.bw; [S.e - S.bh / 2 - 1, S.e + S.bh / 2 + 1].forEach(y => d.line(x0, y, x1, y, { color: ink, w: 1.2 })); }
          if (d.guides()) { d.circle(0, 0, S.kind === 'fourbar' ? S.a : S.r, { dash: [4, 4] }); if (S.kind === 'fourbar') d.circle(S.d, 0, S.c, { dash: [1, 4] }); }
          d.dot(s.P[0], s.P[1], 5);
          if (d.labels()) {
            const lab = (txt, p, q, off) => { const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2, L = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1, o = (off || 16) / d.scale(); d.text(txt, mx - (q[1] - p[1]) / L * o, my + (q[0] - p[0]) / L * o, { color: ink, weight: 700 }); };
            if (S.kind === 'fourbar') d.dim([0, 0], [S.d, 0], 'd = ' + f(S.d, 1), -(S.w / 2 * d.scale() + 44));
            if (S.kind === 'fourbar') { lab('a', [0, 0], s.A); lab('b', s.A, s.B); lab('c', s.O4, s.B, -16); lab('d', [S.d, 0], [0, 0]); d.text('P', s.P[0] + 12 / d.scale(), s.P[1] + 12 / d.scale(), { color: getComputedStyle(document.documentElement).getPropertyValue('--red'), weight: 700 }); d.text('μ ' + f(s.mu / deg, 0) + '°', s.B[0] + 26 / d.scale(), s.B[1] + 14 / d.scale(), { size: 11 }); }
            else { lab('r', [0, 0], s.A); lab('l', s.A, s.B); d.text('x = ' + f(s.x, 1) + ' mm', s.B[0], S.e - S.bh / 2 - 22 / d.scale(), { size: 11 }); }
          }
        }
      };
    },
    exportParts(S, layout) {
      if (S.kind === 'multi') return multiExport(S, layout);
      const R = range(S), s = solve(S, crankAt(S, 0)) || solve(S, R.lo || 0); if (!s) return [];
      const cyc = cycle(S);
      if (layout === 'assembled') { const ps = partsAt(S, s); ps.forEach((p, i) => p.z = i * S.t); if (S.curve) ps.push({ name: 'Path', shapes: [], curves: [cyc.pts] }); return ps; }
      // flat: the frame stays where it is (so the path lines up with it), the moving links are laid out in a row underneath
      const gap = S.w + 6, out = [], W = S.w, H = S.hole; let y = -gap * 1.5, x = 0;
      const lay = (name, pins) => {   // straighten so the first two pins lie along +x, then place left to right
        const [p0, p1] = pins, ang = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]), local = pins.map(p => { const dx = p[0] - p0[0], dy = p[1] - p0[1]; return [dx * Math.cos(-ang) - dy * Math.sin(-ang), dx * Math.sin(-ang) + dy * Math.cos(-ang)]; });
        const minY = Math.min(...local.map(p => p[1])), maxY = Math.max(...local.map(p => p[1])), maxX = Math.max(...local.map(p => p[0]));
        const sh = link(local.map(([u, v]) => [u + x + W / 2, v + y - maxY]), W, H); out.push({ name, thickness: S.t, shapes: [sh] });
        x += maxX + W + 6; if (x > 400) { x = 0; y -= (maxY - minY) + gap; }
      };
      if (S.kind === 'fourbar') {
        out.push({ name: 'Frame', thickness: S.t, shapes: [link([[0, 0], [S.d, 0]], W, H)], curves: S.curve ? [cyc.pts] : [] });
        lay('Crank', [[0, 0], s.A]); lay('Rocker', [s.O4, s.B]);
        const pins = [s.A, s.B]; if (S.pen && (Math.abs(S.v) > 0.01 || S.u < -0.01 || S.u > S.b + 0.01)) pins.push(s.P); lay('Coupler', pins);
      } else {
        lay('Crank', [[0, 0], s.A]); lay('Rod', [s.A, s.B]);
        out.push({ name: 'Slider', thickness: S.t, shapes: [{ outer: [[x, y - S.bh], [x + S.bw, y - S.bh], [x + S.bw, y], [x, y]], circles: H > 0 ? [{ x: x + S.bw / 2, y: y - S.bh / 2, r: H / 2 }] : [] }] });
        if (S.curve) out.push({ name: 'Path', shapes: [], curves: [cyc.pts] });
      }
      return out;
    },
    fileTag: S => S.kind === 'multi' ? `multi-${parseM(S).length}` : S.kind === 'fourbar' ? `4bar-${S.a}-${S.b}-${S.c}-${S.d}` : `slider-${S.r}-${S.l}`,
    info(S) {
      if (S.kind === 'multi') return multiInfo(S);
      const cyc = cycle(S), R = cyc.R, rows = [];
      if (R.none) return [['Cannot assemble', 'The bars are too short to reach each other', 2]];
      if (S.kind === 'fourbar') {
        const g = grashof(S);
        rows.push(['Grashof', g.ok ? 'Yes' : 'No', !g.ok], ['Type', g.type]);
        rows.push(['Crank', R.full ? 'Turns fully' : `Rocks over ${f((R.hi - R.lo) / deg, 0)}°`]);
        rows.push(['Rocker swing', f(cyc.swing / deg, 1) + '°']);
        rows.push(['Transmission angle', `${f(cyc.muMin / deg, 0)}° to ${f(cyc.muMax / deg, 0)}°`, cyc.muMin < 40 * deg || cyc.muMax > 140 * deg]);
        if (R.full) rows.push(['Time ratio', f(cyc.Q, 3) + ' : 1']);
      } else {
        rows.push(['Crank', R.full ? 'Turns fully' : 'Rod too short for a full turn', !R.full]);
        rows.push(['Stroke', f(cyc.swing, 2) + ' mm']);
        if (R.full) rows.push(['Time ratio', f(cyc.Q, 3) + ' : 1']);
        rows.push(['Rod ÷ crank', f(S.l / S.r, 2), S.l / S.r < 2.5]);
      }
      rows.push(['Path size', `${f(cyc.size[0])} × ${f(cyc.size[1])} mm`]);
      if (S.hole >= S.w - 2) rows.push(['Holes too big', 'Leave at least 1 mm of material around each hole', 2]);
      return rows;
    }
  });
})();
