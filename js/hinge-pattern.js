/* Living hinge (flexure) cut patterns, shared by the hinge generator and the fabrication cards. MIT licence.
   MN_HINGE.make(P) returns { cuts: [{ pts: [[x, y], ...], closed }], n, len, W, H } in millimetres.
   The hinge area runs from x = 0 to W (across the bend) and y = 0 to H (along the fold line).
   The cuts run along y, so the part bends about an axis parallel to y.
   Patterns (the tested lattice hinges these follow are described in the generator):
     straight  straight lattice: rows of slits, each row shifted half a step
     meander   slots cut alternately from the top and the bottom edge, leaving one long zig-zag spring
     wave      wave lattice: each cut steps over and half back (‾‾\__/‾); in a line, cut ends overlap
     cross     cross lattice: slits with a fork at each end; the forks of neighbouring rows interlock
     fillet    fillet lattice: closed cut-outs with round ends and a narrow waist
     diamond   closed diamonds
     fabric    fabric (Greek key): interlocking square spirals on a grid, winding both ways
     hive      beehive: closed hexagons
   P: W, H  hinge area size      L  cut length     g  bridge between cuts in a line
      d    row spacing      amp  step (wave; g is then the overlap of cut ends)       fork  fork size (cross)
      dw  diamond width or fillet bulb width       neck  fillet waist width
      hs, hw  beehive cell size across flats and wall width      arm  fabric grid step (the width of every strip)
      cut  'line' (one cut line per slit, best for laser) or 'slot' (a closed outline sw wide)
      sw   slot width            open  1: cuts that reach the top or bottom edge run out through it
      e    how far an open cut runs past the edge (default 0.5 mm) */
(function () {
  const TAU = Math.PI * 2;
  /* the fabric (Greek key) pattern, measured from a tested laser-cut sheet: one 10 x 10 repeat on a square grid.
     H row j, character i: a cut from grid point (i, j) to (i + 1, j); V row j, character i: a cut from (i, j) to (i, j + 1) */
  const FABRIC = {
    H: '1111001100 0110000000 0011000000 0111100110 1111001111 0110011110 0000001100 0000000110 0011001111 0111111110'.split(' '),
    V: '1000111011 1100111111 1100011101 1000001000 1000100000 1101110001 1111111001 1110111000 0100010000 0000010001'.split(' ')
  };
  const clipY = (poly, lo, hi) => {   // Sutherland-Hodgman on the band lo <= y <= hi, for a closed polygon
    const side = (pts, keep, yv) => {
      const out = [];
      pts.forEach((a, i) => {
        const b = pts[(i + 1) % pts.length], ka = keep(a[1]), kb = keep(b[1]);
        if (ka) out.push(a);
        if (ka !== kb) { const t = (yv - a[1]) / (b[1] - a[1]); out.push([a[0] + (b[0] - a[0]) * t, yv]); }
      });
      return out;
    };
    let p = side(poly, y => y >= lo, lo); if (p.length < 3) return null;
    p = side(p, y => y <= hi, hi); return p.length < 3 ? null : p;
  };
  const clipLine = (pts, lo, hi) => {   // an open polyline kept inside lo <= y <= hi (may split into pieces)
    const out = []; let cur = [];
    const lerp = (a, b, yv) => { const t = (yv - a[1]) / (b[1] - a[1]); return [a[0] + (b[0] - a[0]) * t, yv]; };
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], inA = a[1] >= lo && a[1] <= hi;
      if (inA) { if (!cur.length && i > 0) { const p = pts[i - 1]; cur.push(lerp(p, a, p[1] < lo ? lo : hi)); } cur.push(a); }
      if (i + 1 < pts.length) {
        const b = pts[i + 1], inB = b[1] >= lo && b[1] <= hi;
        if (inA && !inB) { cur.push(lerp(a, b, b[1] < lo ? lo : hi)); out.push(cur); cur = []; }
        else if (!inA && !inB && ((a[1] < lo && b[1] > hi) || (a[1] > hi && b[1] < lo))) out.push([lerp(a, b, a[1] < lo ? lo : hi), lerp(a, b, a[1] < lo ? hi : lo)]);
      }
    }
    if (cur.length > 1) out.push(cur);
    return out;
  };
  const plen = (pts, closed) => { let s = 0; for (let i = 0; i + 1 < pts.length + (closed ? 1 : 0); i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; s += Math.hypot(b[0] - a[0], b[1] - a[1]); } return s; };
  const ylen = pts => Math.max(...pts.map(q => q[1])) - Math.min(...pts.map(q => q[1]));

  // a closed slot around an open polyline: offset sw/2 to each side; round ends where the cut stops inside the part
  function slotAround(pts, sw, roundA, roundB) {
    const r = sw / 2, L = [], R = [];
    pts.forEach((p, i) => {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
      const nx = -dy / l * r, ny = dx / l * r; L.push([p[0] + nx, p[1] + ny]); R.push([p[0] - nx, p[1] - ny]);
    });
    const cap = (c, from, to, on) => { if (!on) return []; const a0 = Math.atan2(from[1] - c[1], from[0] - c[0]), out = []; for (let k = 1; k < 8; k++) { const a = a0 - Math.PI * k / 8; out.push([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]); } return out; };
    const end = pts[pts.length - 1], start = pts[0];
    return L.concat(cap(end, L[L.length - 1], R[R.length - 1], roundB), R.slice().reverse(), cap(start, R[0], L[0], roundA));
  }

  function make(P) {
    const W = Math.max(1, P.W), H = Math.max(1, P.H), L = Math.max(0.5, P.L), g = Math.max(0, P.g || 0), d = Math.max(0.2, P.d || 1);
    const open = P.open !== 0, e = P.e == null ? 0.5 : P.e, sw = Math.max(0.05, P.sw || 0.5), slot = P.cut === 'slot';
    const lo = open ? -e : g / 2, hi = open ? H + e : H - g / 2;
    const cuts = [], period = L + g; let grp = 0;   // grp: cuts that belong to one shape (an H, a forked slit) share a number
    const reach = Math.ceil(H / period) + 2;
    // tidy an open cut: if it was trimmed at an open edge, run it out exactly to lo / hi
    const addLine = (pts) => {
      clipLine(pts, lo, hi).forEach(c => {
        if (c.length < 2 || ylen(c) < 0.8) return;
        if (slot) {
          const atLo = Math.abs(c[0][1] - lo) < 1e-6 || Math.abs(c[c.length - 1][1] - lo) < 1e-6, atHi = Math.abs(c[0][1] - hi) < 1e-6 || Math.abs(c[c.length - 1][1] - hi) < 1e-6;
          const s0 = c[0][1] < c[c.length - 1][1] ? c : c.slice().reverse();
          cuts.push({ pts: slotAround(s0, sw, !(open && atLo), !(open && atHi)), closed: true, grp });
        } else cuts.push({ pts: c, closed: false, grp });
      });
    };
    const addPoly = poly => { const c = clipY(poly, lo, hi); if (c && ylen(c) > 0.3) cuts.push({ pts: c, closed: true, grp }); };
    const lineXs = () => { const n = Math.max(1, Math.floor(W / d + 1e-9) + (P.pat === 'meander' ? 0 : 0)); return Array.from({ length: n }, (_, k) => W / 2 + (k - (n - 1) / 2) * d); };

    // every row of a lattice: centres of the cuts in line k, shifted half a step on odd lines
    const eachCut = fn => lineXs().forEach((x, k) => { const c0 = H / 2 + (k % 2 ? period / 2 : 0); for (let m = -reach; m <= reach; m++) { const yc = c0 + m * period; if (yc + L / 2 + period / 2 < lo || yc - L / 2 - period / 2 > hi) continue; grp++; fn(x, yc, k); } });
    if (P.pat === 'straight') eachCut((x, yc) => addLine([[x, yc - L / 2], [x, yc + L / 2]]));
    else if (P.pat === 'wave') {   // wave lattice, as in the tested sheet: each cut runs flat, steps over by amp, runs on, steps back by half of that, runs flat: ‾‾\__/‾
      // Every line of cuts is the same, so neighbouring cuts stay parallel one spring width apart. In a line, the end of one cut
      // runs past the start of the next by g (the overlap), half a step to the side, and the springs squeeze between them.
      const A = P.amp == null ? 0.9 * d : P.amp, ov = Math.max(0, P.g || 0), w1 = 1.7 * A, w2 = 0.9 * A, ss = u => u * u * (3 - 2 * u);
      const fl = Math.min(Math.max(0.19 * L, ov + 0.3 * d), Math.max(0, (L - w1 - w2) / 2)), lo2 = Math.max(0, L - 2 * fl - w1 - w2), P2 = Math.max(0.5, L - ov);
      const prof = t => t <= fl ? 0 : t < fl + w1 ? A * ss((t - fl) / w1) : t <= fl + w1 + lo2 ? A : t < fl + w1 + lo2 + w2 ? A - A / 2 * ss((t - fl - w1 - lo2) / w2) : A / 2;
      const ts = [0, fl]; for (let i = 1; i < 12; i++) ts.push(fl + w1 * i / 12); ts.push(fl + w1, fl + w1 + lo2); for (let i = 1; i < 8; i++) ts.push(fl + w1 + lo2 + w2 * i / 8); ts.push(fl + w1 + lo2 + w2, L);
      const reach2 = Math.ceil(H / P2) + 2, base = H / 2 - L / 2;
      lineXs().forEach(x => {
        for (let m = -reach2; m <= reach2; m++) {
          const y0 = base + m * P2; if (y0 > hi || y0 + L < lo) continue; grp++;
          addLine(ts.map(t => [x - A * 0.4 + prof(t), y0 + t]));
        }
      });
    } else if (P.pat === 'cross') {   // a slit with a fork at each end: >—<
      // as in the tested pattern: each arm runs out about 1.4 times as far along the cut as it spreads sideways (about 35°)
      const fw = Math.max(0, P.fork || 1), fl = Math.min(fw * 1.4, Math.max(0, g * 0.45));
      eachCut((x, yc) => { const y0 = yc - L / 2, y1 = yc + L / 2;
        if (slot) { addLine([[x, y0], [x, y1]]); addLine([[x - fw, y0 - fl], [x, y0]]); addLine([[x + fw, y0 - fl], [x, y0]]); addLine([[x, y1], [x - fw, y1 + fl]]); addLine([[x, y1], [x + fw, y1 + fl]]); }
        else { addLine([[x - fw, y0 - fl], [x, y0], [x, y1], [x + fw, y1 + fl]]); addLine([[x + fw, y0 - fl], [x, y0]]); addLine([[x, y1], [x - fw, y1 + fl]]); } });
    } else if (P.pat === 'fillet') {   // closed cut-outs: round ends (bulbs) and a narrow waist, so there are no sharp corners
      const rb = Math.max(0.2, (P.dw || 2.4) / 2), nk = Math.min(rb * 2 - 0.05, Math.max(0.1, P.neck || 1)) / 2, len = Math.max(L, 4 * rb);
      eachCut((x, yc) => {
        const y0 = yc - len / 2 + rb, y1 = yc + len / 2 - rb, N = 16, R = [], Lf = [];
        for (let i = 0; i <= N; i++) { const u = i / N, y = y0 + (y1 - y0) * u, w = nk + (rb - nk) * Math.pow(Math.cos(Math.PI * u), 2); R.push([x + w, y]); Lf.push([x - w, y]); }
        const top = [], bot = []; for (let i = 1; i < 10; i++) { const a = Math.PI * i / 10; top.push([x + rb * Math.cos(a), y1 + rb * Math.sin(a)]); bot.push([x - rb * Math.cos(a), y0 - rb * Math.sin(a)]); }
        addPoly(R.concat(top, Lf.reverse(), bot));
      });
    } else if (P.pat === 'meander') {   // slots from alternate edges: one long zig-zag spring
      lineXs().forEach((x, k) => {
        grp++; const y0 = k % 2 ? g : -e, y1 = k % 2 ? H + e : H - g;
        if (slot) cuts.push({ pts: slotAround([[x, y0], [x, y1]], sw, k % 2 === 1, k % 2 === 0), closed: true });
        else cuts.push({ pts: [[x, y0], [x, y1]], closed: false });
      });
    } else if (P.pat === 'fabric') {   // fabric (Greek key): interlocking keys drawn on a square grid, copied from the tested pattern
      const q = Math.max(0.2, P.arm || 2), FH = FABRIC.H, FV = FABRIC.V, ni = Math.max(1, Math.floor(W / q + 1e-9)), x0 = (W - ni * q) / 2;
      const ylo = open ? lo : q / 2, yhi = open ? hi : H - q / 2, j0 = Math.floor((ylo - H / 2) / q) - 1, j1 = Math.ceil((yhi - H / 2) / q) + 1;
      const io = 15 - Math.floor(ni / 2), mod = v => ((v % 10) + 10) % 10, X = i => x0 + i * q, Y = j => H / 2 + j * q;
      const adj = new Map(), key = (i, j) => i + ',' + j, link = (a, b) => { [[a, b], [b, a]].forEach(([u, v]) => { if (!adj.has(u)) adj.set(u, []); adj.get(u).push(v); }); };
      for (let j = j0; j <= j1; j++) for (let i = 0; i <= ni; i++) {
        const c = mod(i + io), y = Y(j);   // the table is drawn with y down; the sheet has y up, so rows are read upwards
        if (i < ni && FH[mod(-j)][c] === '1' && y > q / 2 - 1e-9 && y < H - q / 2 + 1e-9) link(key(i, j), key(i + 1, j));   // no cut along an edge
        if (j < j1 && FV[mod(-j - 1)][c] === '1') link(key(i, j), key(i, j + 1));
      }
      // join the grid edges into polylines: each runs between line ends, corners where three or four lines meet, or round a loop
      const used = new Set(), ek = (u, v) => u < v ? u + '|' + v : v + '|' + u, pt = u => { const [i, j] = u.split(',').map(Number); return [X(i), Y(j)]; };
      const comp = new Map(); let nc = 0;
      adj.forEach((_, u) => { if (comp.has(u)) return; nc++; const st = [u]; comp.set(u, nc); while (st.length) { const v = st.pop(); adj.get(v).forEach(w => { if (!comp.has(w)) { comp.set(w, nc); st.push(w); } }); } });
      const walk = (u, v) => { const line = [u, v]; used.add(ek(u, v)); let prev = u, cur = v;
        while (adj.get(cur).length === 2) { const nx = adj.get(cur).find(w => w !== prev); if (used.has(ek(cur, nx))) break; used.add(ek(cur, nx)); line.push(nx); prev = cur; cur = nx; }
        return line; };
      const lines = [];
      adj.forEach((ns, u) => { if (ns.length !== 2) ns.forEach(v => { if (!used.has(ek(u, v))) lines.push(walk(u, v)); }); });
      adj.forEach((ns, u) => ns.forEach(v => { if (!used.has(ek(u, v))) lines.push(walk(u, v)); }));
      const base = grp;
      lines.forEach(l => {
        const g0 = base + comp.get(l[0]); if (g0 > grp) grp = g0;
        const pts = l.map(pt).filter((p, k, A) => k === 0 || k === A.length - 1 || (A[k - 1][0] - p[0]) * (A[k + 1][1] - p[1]) - (A[k - 1][1] - p[1]) * (A[k + 1][0] - p[0]) !== 0);
        clipLine(pts, ylo, yhi).forEach(c => {
          if (c.length < 2 || plen(c, false) < q * 0.3) return;
          if (slot) cuts.push({ pts: slotAround(c, sw, true, true), closed: true, grp: g0 });
          else cuts.push({ pts: c, closed: false, grp: g0 });
        });
      });
    } else if (P.pat === 'hive') {   // closed hexagons (flats top and bottom) in a honeycomb
      const af = Math.max(0.5, P.hs || 6), wall = Math.max(0.1, P.hw || 1.2), r = af / Math.sqrt(3), px = (af + wall) * Math.sqrt(3) / 2, py = af + wall;
      const nx = Math.max(1, Math.floor((W - 2 * r) / px) + 1), x0 = W / 2 - (nx - 1) * px / 2;
      for (let i = 0; i < nx; i++) { const cx = x0 + i * px, off = i % 2 ? py / 2 : 0; for (let yc = H / 2 + off - Math.ceil(H / py + 2) * py; yc < H + py; yc += py) { if (yc + af / 2 < lo || yc - af / 2 > hi) continue; grp++; addPoly(Array.from({ length: 6 }, (_, j) => { const a = j * Math.PI / 3; return [cx + r * Math.cos(a), yc + r * Math.sin(a)]; })); } }
    } else if (P.pat === 'diamond') {
      const hw = Math.max(0.2, P.dw || 2) / 2;
      lineXs().forEach((x, k) => {
        const c0 = H / 2 + (k % 2 ? period / 2 : 0);
        for (let m = -reach; m <= reach; m++) { const yc = c0 + m * period; if (yc + L / 2 < lo || yc - L / 2 > hi) continue; grp++; addPoly([[x, yc - L / 2], [x + hw, yc], [x, yc + L / 2], [x - hw, yc]]); }
      });
    }
    const len = cuts.reduce((s, c) => s + plen(c.pts, c.closed), 0);
    return { cuts, n: cuts.length, len, W, H };
  }

  /* the thinnest strip of material the pattern leaves between two different cuts, before kerf, measured on a small sample */
  const segSeg = (a, b, c, d) => {
    const cr = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
    if (cr(a, b, c) * cr(a, b, d) < 0 && cr(c, d, a) * cr(c, d, b) < 0) return 0;
    const pd = (p, s0, s1) => { const dx = s1[0] - s0[0], dy = s1[1] - s0[1], l2 = dx * dx + dy * dy, t = l2 ? Math.max(0, Math.min(1, ((p[0] - s0[0]) * dx + (p[1] - s0[1]) * dy) / l2)) : 0; return Math.hypot(p[0] - s0[0] - t * dx, p[1] - s0[1] - t * dy); };
    return Math.min(pd(a, c, d), pd(b, c, d), pd(c, a, b), pd(d, a, b));
  };
  const segs = c => { const o = [], n = c.pts.length; for (let i = 0; i + 1 < n + (c.closed ? 1 : 0); i++) o.push([c.pts[i], c.pts[(i + 1) % n]]); return o; };
  function web(P) {
    const per = (P.L || 1) + (P.g || 0), d = P.d || 1;
    const Q = Object.assign({}, P, { cut: 'line', open: 0, W: P.pat === 'fabric' ? 12 * (P.arm || 2) : P.pat === 'hive' ? 4 * ((P.hs || 6) + (P.hw || 1.2)) : 4 * d, H: P.pat === 'fabric' ? 12 * (P.arm || 2) : P.pat === 'hive' ? 3 * ((P.hs || 6) + (P.hw || 1.2)) : P.pat === 'meander' ? 3 * ((P.g || 1) + 6) : 2.5 * per });
    if (P.pat === 'meander') return d;
    const cs = make(Q).cuts, S = cs.map(segs), bb = cs.map(c => { const xs = c.pts.map(q => q[0]), ys = c.pts.map(q => q[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; });
    let m = 1e9;
    for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) {
      if (cs[i].grp === cs[j].grp) continue;
      const a = bb[i], b = bb[j], gap = Math.max(a[0] - b[2], b[0] - a[2], a[1] - b[3], b[1] - a[3]); if (gap > m) continue;
      for (const s1 of S[i]) for (const s2 of S[j]) { const v = segSeg(s1[0], s1[1], s2[0], s2[1]); if (v < m) m = v; }
    }
    return m === 1e9 ? d : m;
  }
  /* the springs that do the bending: their length and width (before kerf), and how many sit across the bend */
  function springs(P) {
    const d = P.d || 1, L = P.L || 1, g = P.g || 0, W = P.W || 10, rows = Math.max(1, Math.floor(W / d + 1e-9));
    switch (P.pat) {
      case 'straight': return { len: Math.max(0, (L - g) / 2), w: d, n: rows };
      case 'wave': return { len: Math.max(0, 0.6 * (L - g)), w: d, n: rows };   // the strips run from one overlap to the next
      case 'fabric': { const a = P.arm || 2; return { len: 8 * a, w: a, n: 2 * Math.max(1, Math.floor(W / (5 * a))) }; }
      case 'cross': return { len: Math.max(0, L / 2 + (P.fork || 0)), w: d - (P.fork || 0) * 0.5, n: rows };   // the forks of neighbouring rows interlock, so each spring runs about half a cut plus a fork
      case 'fillet': return { len: Math.max(0, L / 2), w: d - ((P.dw || 2.4) + (P.neck || 1)) / 2, n: rows };
      case 'diamond': return { len: Math.max(0, L / 2), w: d - (P.dw || 2) / 2, n: rows };
      case 'meander': return { len: Math.max(0, (P.H || 40) - g) / 2, w: d, n: rows };
      case 'hive': { const af = P.hs || 6, wall = P.hw || 1.2; return { len: af / Math.sqrt(3), w: wall, n: Math.max(1, Math.floor(W / ((af + wall) * Math.sqrt(3) / 2))) }; }
    }
    return { len: 1, w: d, n: rows };
  }
  window.MN_HINGE = { make, web, springs };
})();
