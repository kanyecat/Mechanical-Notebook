/* Mechanical Notebook generators: geometry helpers and exporters (SVG, DXF, STL). MIT licence.
   A "shape" is { outer: [[x,y],...], holes: [[[x,y],...], ...], circles: [{x,y,r}] } in millimetres, y up.
   A "part" is { name, shapes: [shape], curves: [[[x,y],...]], thickness } already placed in world coordinates. */
(function () {
  const G = window.GEN = window.GEN || {};

  /* ---------- small geometry helpers ---------- */
  G.circlePts = (x, y, r, n) => { n = n || Math.max(24, Math.ceil(r * 2)); const p = []; for (let i = 0; i < n; i++) { const t = i / n * Math.PI * 2; p.push([x + r * Math.cos(t), y + r * Math.sin(t)]); } return p; };
  G.area = p => { let a = 0; for (let i = 0, j = p.length - 1; i < p.length; j = i++) a += (p[j][0] - p[i][0]) * (p[j][1] + p[i][1]); return a / 2; };  // >0 = counter-clockwise
  G.ccw = p => G.area(p) < 0 ? p.slice().reverse() : p;
  G.cw = p => G.area(p) > 0 ? p.slice().reverse() : p;
  G.xform = (pts, x, y, a) => { const c = Math.cos(a), s = Math.sin(a); return pts.map(([u, v]) => [x + u * c - v * s, y + u * s + v * c]); };
  G.placeShape = (sh, x, y, a) => ({
    outer: G.xform(sh.outer, x, y, a), holes: (sh.holes || []).map(h => G.xform(h, x, y, a)),
    circles: (sh.circles || []).map(c => { const [p] = G.xform([[c.x, c.y]], x, y, a); return { x: p[0], y: p[1], r: c.r }; })
  });
  G.bounds = parts => {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; const add = ([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); };
    parts.forEach(p => { (p.shapes || []).forEach(s => { s.outer.forEach(add); (s.circles || []).forEach(c => { add([c.x - c.r, c.y - c.r]); add([c.x + c.r, c.y + c.r]); }); }); (p.curves || []).forEach(c => c.forEach(add)); });
    return x0 > x1 ? { x0: -50, y0: -50, x1: 50, y1: 50 } : { x0, y0, x1, y1 };
  };

  /* ---------- triangulation: holes are bridged into the outline, then ear clipping ---------- */
  const inside = (pt, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > pt[1]) !== (b[1] > pt[1]) && pt[0] < (b[0] - a[0]) * (pt[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
  function bridge(outer, hole) {
    // join the hole's rightmost point to the nearest outline point it can see; the cut must not cross,
    // touch, or run through the hole or the outline
    let hi = 0; hole.forEach((p, i) => { if (p[0] > hole[hi][0]) hi = i; });
    const H = hole[hi], same = (a, b) => Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9;
    const orient = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
    const blocked = (P, a, b) => {   // does edge a-b cross or touch the open segment H-P?
      if ((same(a, H) || same(a, P)) && (same(b, H) || same(b, P))) return false;
      const o1 = orient(H, P, a), o2 = orient(H, P, b), o3 = orient(a, b, H), o4 = orient(a, b, P), L = Math.hypot(P[0] - H[0], P[1] - H[1]), eps = 1e-9 * (1 + L * L);
      const onSeg = q => !same(q, H) && !same(q, P) && Math.abs(orient(H, P, q)) <= eps && (q[0] - H[0]) * (P[0] - H[0]) + (q[1] - H[1]) * (P[1] - H[1]) > 0 && (q[0] - P[0]) * (H[0] - P[0]) + (q[1] - P[1]) * (H[1] - P[1]) > 0;
      if (onSeg(a) || onSeg(b)) return true;
      if (same(a, H) || same(b, H) || same(a, P) || same(b, P)) return false;
      return o1 * o2 < 0 && o3 * o4 < 0;
    };
    let best = -1, bd = Infinity;
    for (let i = 0; i < outer.length; i++) {
      const P = outer[i], d = (P[0] - H[0]) ** 2 + (P[1] - H[1]) ** 2; if (d >= bd || d === 0) continue;
      const L = Math.sqrt(d), step = Math.min(1e-3, L / 4), probe = [H[0] + (P[0] - H[0]) / L * step, H[1] + (P[1] - H[1]) / L * step];
      if (inside(probe, hole)) continue;   // the cut would start into the hole
      let ok = true;
      for (let j = 0; j < outer.length && ok; j++) if (blocked(P, outer[j], outer[(j + 1) % outer.length])) ok = false;
      for (let j = 0; j < hole.length && ok; j++) if (blocked(P, hole[j], hole[(j + 1) % hole.length])) ok = false;
      if (ok) { bd = d; best = i; }
    }
    if (best < 0) best = 0;
    const h = hole.slice(hi).concat(hole.slice(0, hi));
    return outer.slice(0, best + 1).concat(h, [h[0]], outer.slice(best));
  }
  G.triangulate = function (outer, holes) {
    let poly = G.ccw(outer).map(p => p.slice());
    (holes || []).map(h => G.cw(h)).sort((a, b) => Math.max(...b.map(p => p[0])) - Math.max(...a.map(p => p[0]))).forEach(h => { poly = bridge(poly, h); });
    const idx = poly.map((_, i) => i), tris = [];
    const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    const inTri = (p, a, b, c) => cross(a, b, p) > 1e-12 && cross(b, c, p) > 1e-12 && cross(c, a, p) > 1e-12;
    let guard = 0;
    while (idx.length > 3 && guard++ < 100000) {
      let cut = false;
      for (let k = 0; k < idx.length; k++) {
        const i0 = idx[(k + idx.length - 1) % idx.length], i1 = idx[k], i2 = idx[(k + 1) % idx.length], a = poly[i0], b = poly[i1], c = poly[i2];
        if (cross(a, b, c) <= 1e-12) continue;
        let ear = true;
        for (let m = 0; m < idx.length && ear; m++) { const q = poly[idx[m]]; if (idx[m] === i0 || idx[m] === i1 || idx[m] === i2) continue; if ((q[0] === a[0] && q[1] === a[1]) || (q[0] === b[0] && q[1] === b[1]) || (q[0] === c[0] && q[1] === c[1])) continue; if (inTri(q, a, b, c)) ear = false; }
        if (ear) { tris.push([a, b, c]); idx.splice(k, 1); cut = true; break; }
      }
      if (!cut) { // degenerate leftovers: drop a flat vertex and carry on
        let k = idx.findIndex((_, k2) => Math.abs(cross(poly[idx[(k2 + idx.length - 1) % idx.length]], poly[idx[k2]], poly[idx[(k2 + 1) % idx.length]])) <= 1e-12);
        if (k < 0) k = 0; idx.splice(k, 1);
      }
    }
    if (idx.length === 3) tris.push(idx.map(i => poly[i]));
    return tris;
  };


  /* ---------- rounding: cut every sharp corner of a closed outline back and bridge it with a curve of radius r ---------- */
  // round the sharp corners of a closed outline with radius r (by cutting each corner back along the outline and bridging with a curve)
  G.fillet = function (pts, r) {
    const TAU = Math.PI * 2;
    pts = pts.filter((q, i) => { const o = pts[(i + pts.length - 1) % pts.length]; return Math.hypot(q[0] - o[0], q[1] - o[1]) > 1e-7; });   // drop repeated points
    const n = pts.length; if (!(r > 0) || n < 4) return pts;
    const seg = [], cum = [0]; let tot = 0;
    for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]); seg.push(L); tot += L; cum.push(tot); }
    const at = s => { s = ((s % tot) + tot) % tot; let lo = 0, hi = n; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid] <= s) lo = mid; else hi = mid; } const a = pts[lo], b = pts[(lo + 1) % n], u = seg[lo] ? (s - cum[lo]) / seg[lo] : 0; return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]; };
    const corners = [];
    for (let i = 0; i < n; i++) {
      const p = pts[(i + n - 1) % n], c = pts[i], q = pts[(i + 1) % n];
      const a1 = Math.atan2(c[1] - p[1], c[0] - p[0]), a2 = Math.atan2(q[1] - c[1], q[0] - c[0]); let t = a2 - a1; while (t > Math.PI) t -= TAU; while (t < -Math.PI) t += TAU;
      if (Math.abs(t) > 0.45) corners.push({ i, s: cum[i], t });
    }
    if (!corners.length) return pts;
    corners.forEach((c, k) => { const nx = corners[(k + 1) % corners.length], pv = corners[(k + corners.length - 1) % corners.length];
      const gapN = ((nx.s - c.s) % tot + tot) % tot || tot, gapP = ((c.s - pv.s) % tot + tot) % tot || tot;
      c.d = Math.min(r * Math.tan(Math.abs(c.t) / 2), 0.45 * Math.min(gapN, gapP)); });
    const skip = new Array(n).fill(false), isC = new Map(corners.map(c => [c.i, c]));
    corners.forEach(c => { for (let i = 0; i < n; i++) { if (i === c.i) continue; let ds = ((cum[i] - c.s) % tot + tot) % tot; if (ds > tot / 2) ds -= tot; if (Math.abs(ds) < c.d) skip[i] = true; } });
    const out = [];
    for (let i = 0; i < n; i++) {
      const c = isC.get(i);
      if (c && c.d > 1e-6) { const E = at(c.s - c.d), X = at(c.s + c.d), V = pts[i], m = 6; for (let j = 0; j <= m; j++) { const u = j / m, w0 = (1 - u) * (1 - u), w1 = 2 * u * (1 - u), w2 = u * u; out.push([w0 * E[0] + w1 * V[0] + w2 * X[0], w0 * E[1] + w1 * V[1] + w2 * X[1]]); } }
      else if (!skip[i]) out.push(pts[i]);
    }
    return out;
  };

  /* ---------- nesting: pack parts close together for laser cutting ----------
     Each part is rasterised on a coarse grid, grown by half the gap, then dropped into the lowest free spot on the sheet
     (bottom-left fill), also trying 90° turns. Small parts can sit inside the holes and cut-outs of big ones. */
  G.nest = function (parts, opt) {
    opt = opt || {}; const gap = Math.max(0, opt.gap == null ? 2 : opt.gap), rot = opt.rotate !== false;
    const items = parts.filter(p => p.shapes && p.shapes.length), extras = parts.filter(p => !(p.shapes && p.shapes.length));
    if (!items.length) return parts;
    const rotPt = (k, [x, y]) => k === 0 ? [x, y] : k === 1 ? [-y, x] : k === 2 ? [-x, -y] : [y, -x];
    const ringsOf = (p, k) => p.shapes.map(s => [s.outer].concat(s.holes || [], (s.circles || []).map(c => G.circlePts(c.x, c.y, c.r, 48))).map(r => r.map(q => rotPt(k, q))));
    const info = items.map(p => {
      const b = G.bounds([Object.assign({}, p, { curves: [] })]); let area = 0;
      p.shapes.forEach(s => { area += Math.abs(G.area(s.outer)); (s.holes || []).forEach(h => area -= Math.abs(G.area(h))); (s.circles || []).forEach(c => area -= Math.PI * c.r * c.r); });
      return { p, b, area, dim: Math.max(b.x1 - b.x0, b.y1 - b.y0) };
    });
    const totalArea = info.reduce((a, i) => a + i.area, 0), maxDim = Math.max(...info.map(i => i.dim));
    const cell = Math.max(0.5, maxDim / 90), pad = Math.ceil(gap / 2 / cell) + 1, k = Math.ceil(gap / 2 / cell);
    const sheetW = opt.sheetW > 0 ? opt.sheetW : Math.max(maxDim + gap + 2, Math.sqrt(totalArea * 1.7));
    const W = Math.ceil(sheetW / cell) + 2 * pad, Hh = Math.ceil((totalArea / (sheetW * 0.5) + maxDim * 2) / cell) + 2 * pad;
    const occ = new Uint8Array(W * Hh);
    const mask = (p, kq) => {   // rows of free-run segments after growing by gap/2
      const rings = ringsOf(p, kq), xs = [], ys = [];
      rings.forEach(rs => rs.forEach(r => r.forEach(q => { xs.push(q[0]); ys.push(q[1]); })));
      const x0 = Math.min(...xs), y0 = Math.min(...ys), w = Math.ceil((Math.max(...xs) - x0) / cell) + 1 + 2 * pad, h = Math.ceil((Math.max(...ys) - y0) / cell) + 1 + 2 * pad;
      const g = new Uint8Array(w * h);
      rings.forEach(rs => {
        for (let j = 0; j < h; j++) {
          const yy = y0 + (j - pad + 0.5) * cell, hit = [];
          rs.forEach(r => { for (let i = 0, n = r.length; i < n; i++) { const a = r[i], b = r[(i + 1) % n]; if ((a[1] > yy) !== (b[1] > yy)) hit.push(a[0] + (yy - a[1]) / (b[1] - a[1]) * (b[0] - a[0])); } });
          hit.sort((u, v) => u - v);
          for (let m = 0; m + 1 < hit.length; m += 2) { const i0 = Math.max(0, Math.floor((hit[m] - x0) / cell) + pad), i1 = Math.min(w - 1, Math.ceil((hit[m + 1] - x0) / cell) + pad); for (let i = i0; i <= i1; i++) g[j * w + i] = 1; }
        }
      });
      let d = g;
      if (k > 0) {   // grow by a disc of radius k cells
        d = new Uint8Array(w * h);
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (g[j * w + i]) for (let dy = -k; dy <= k; dy++) { const jj = j + dy; if (jj < 0 || jj >= h) continue; const dx = Math.floor(Math.sqrt(k * k - dy * dy)); for (let ii = Math.max(0, i - dx); ii <= Math.min(w - 1, i + dx); ii++) d[jj * w + ii] = 1; }
      }
      const runs = []; for (let j = 0; j < h; j++) { let i = 0; while (i < w) { if (d[j * w + i]) { let e = i; while (e + 1 < w && d[j * w + e + 1]) e++; runs.push([j, i, e]); i = e + 1; } else i++; } }
      return { w, h, runs, x0, y0 };
    };
    const fits = (m, px, py) => { for (const [j, a, b] of m.runs) { const row = (py + j) * W + px; for (let i = a; i <= b; i++) if (occ[row + i]) return false; } return true; };
    const order = info.slice().sort((a, b) => b.area - a.area), placed = [];
    order.forEach(it => {
      let best = null;
      for (const kq of (rot ? [0, 1, 2, 3] : [0])) {
        if (kq === 2 && it.dim < 1) continue;
        const m = mask(it.p, kq);
        for (let py = 0; py + m.h <= Hh && !(best && py + m.h > best.top); py++) {
          let found = -1; for (let px = 0; px + m.w <= W; px++) if (fits(m, px, py)) { found = px; break; }
          if (found >= 0) { const top = py + m.h; if (!best || top < best.top || (top === best.top && found < best.px)) best = { kq, m, px: found, py, top }; break; }
        }
      }
      if (!best) return;
      best.m.runs.forEach(([j, a, b]) => { const row = (best.py + j) * W; for (let i = a; i <= b; i++) occ[row + best.px + i] = 1; });
      placed.push({ it, ...best });
    });
    // build the moved parts: rotate by kq, then shift so the grown mask lands at its cell
    const out = [], moved = new Map();
    placed.forEach(({ it, kq, m, px, py }) => {
      const dx = (px + pad) * cell - (m.x0), dy = (py + pad) * cell - (m.y0);
      const T = q => { const r = rotPt(kq, q); return [r[0] + dx - 0, r[1] + dy - 0]; };
      const np = Object.assign({}, it.p, {
        shapes: it.p.shapes.map(s => ({ outer: s.outer.map(T), holes: (s.holes || []).map(h => h.map(T)), circles: (s.circles || []).map(c => { const [x, y] = T([c.x, c.y]); return { x, y, r: c.r }; }) })),
        curves: [], twist: it.p.twist ? Object.assign({}, it.p.twist, { c: T(it.p.twist.c || [0, 0]) }) : undefined
      });
      moved.set(it.p, np);
    });
    // keep the user's part order
    items.forEach(p => { if (moved.has(p)) out.push(moved.get(p)); });
    const skipped = items.filter(p => !moved.has(p));
    G._nestStats = (() => { const b = G.bounds(out); const w = b.x1 - b.x0, h = b.y1 - b.y0; return { w, h, use: totalArea / Math.max(1, w * h), skipped: skipped.length }; })();
    return out.concat(skipped);
  };

  /* ---------- exporters ---------- */
  const r4 = v => +v.toFixed(4);
  const shapeRings = (s, seg) => [s.outer].concat(s.holes || [], (s.circles || []).map(c => G.circlePts(c.x, c.y, c.r, seg || Math.max(32, Math.ceil(c.r * 6)))));

  G.toSVG = function (parts) {
    const b = G.bounds(parts), pad = 5, W = b.x1 - b.x0 + 2 * pad, H = b.y1 - b.y0 + 2 * pad;
    const tx = x => r4(x - b.x0 + pad), ty = y => r4(b.y1 + pad - y);  // flip so y points down in SVG
    const path = p => 'M' + p.map(([x, y]) => tx(x) + ' ' + ty(y)).join('L') + 'Z';
    let out = `<?xml version="1.0" encoding="UTF-8"?>\n<!-- Made with Mechanical Notebook generators (MIT). Units: millimetres. -->\n<svg xmlns="http://www.w3.org/2000/svg" width="${r4(W)}mm" height="${r4(H)}mm" viewBox="0 0 ${r4(W)} ${r4(H)}" fill="none" stroke="#000" stroke-width="0.1">\n`;
    parts.forEach(p => {
      out += `  <g id="${p.name.replace(/[^\w-]/g, '_')}">\n`;
      p.shapes.forEach(s => {
        out += `    <path d="${[s.outer].concat(s.holes || []).map(path).join(' ')}" fill-rule="evenodd"/>\n`;
        (s.circles || []).forEach(c => out += `    <circle cx="${tx(c.x)}" cy="${ty(c.y)}" r="${r4(c.r)}"/>\n`);
      });
      (p.curves || []).forEach(c => out += `    <polyline points="${c.map(([x, y]) => tx(x) + ',' + ty(y)).join(' ')}" stroke="#c00"/>\n`);
      out += '  </g>\n';
    });
    return out + '</svg>\n';
  };

  G.toDXF = function (parts) {
    // AutoCAD R12 (AC1009) ASCII: works in nearly every CAD and laser/CNC tool. One layer per part.
    const L = [], add = (...kv) => { for (let i = 0; i < kv.length; i += 2) L.push(kv[i], kv[i + 1]); };
    const layer = n => n.replace(/[^\w-]/g, '_').toUpperCase().slice(0, 31);
    add(0, 'SECTION', 2, 'HEADER', 9, '$ACADVER', 1, 'AC1009', 9, '$INSUNITS', 70, 4, 0, 'ENDSEC');
    add(0, 'SECTION', 2, 'TABLES', 0, 'TABLE', 2, 'LAYER', 70, parts.length + 1);
    parts.forEach((p, i) => add(0, 'LAYER', 2, layer(p.name), 70, 0, 62, (i % 6) + 1, 6, 'CONTINUOUS'));
    add(0, 'LAYER', 2, 'PATHS', 70, 0, 62, 1, 6, 'CONTINUOUS');
    add(0, 'ENDTAB', 0, 'ENDSEC', 0, 'SECTION', 2, 'ENTITIES');
    const poly = (pts, lay, closed) => { add(0, 'POLYLINE', 8, lay, 66, 1, 70, closed ? 1 : 0); pts.forEach(([x, y]) => add(0, 'VERTEX', 8, lay, 10, r4(x), 20, r4(y), 30, 0)); add(0, 'SEQEND', 8, lay); };
    parts.forEach(p => {
      const lay = layer(p.name);
      p.shapes.forEach(s => { poly(s.outer, lay, true); (s.holes || []).forEach(h => poly(h, lay, true)); (s.circles || []).forEach(c => add(0, 'CIRCLE', 8, lay, 10, r4(c.x), 20, r4(c.y), 30, 0, 40, r4(c.r))); });
      (p.curves || []).forEach(c => poly(c, 'PATHS', false));
    });
    add(0, 'ENDSEC', 0, 'EOF');
    return L.join('\n') + '\n';
  };

  G.toSTL = function (parts) {
    // binary STL: every shape extruded by its part's thickness, stacked from z = 0.
    // A part with `twist` { c: [x, y], rate (rad per mm of height), herring } is built from slices turned about its centre (helical / herringbone gears).
    const tris = [];
    parts.forEach(p => {
      const t = p.thickness || 5, z0 = p.z || 0, tw = p.twist && p.twist.rate ? p.twist : null;
      let N = 1; if (tw) N = Math.min(48, Math.max(2, Math.ceil(Math.abs(tw.rate * t) * (tw.herring ? 1 : 1) / (3 * Math.PI / 180)))) * (tw.herring ? 2 : 1);
      const ang = k => { if (!tw) return 0; const u = k / N * t; return tw.rate * (tw.herring ? (t / 2 - Math.abs(u - t / 2)) : u); };   // herringbone: turn up to the middle, then back
      const rotate = (ring, k) => { if (!tw) return ring; const a = ang(k), c = Math.cos(a), s = Math.sin(a), [cx, cy] = tw.c; return ring.map(([x, y]) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]); };
      p.shapes.forEach(s => {
        const rings = shapeRings(s), outer = G.ccw(rings[0]), holes = rings.slice(1).map(h => G.cw(h));
        G.triangulate(outer, holes).forEach(([a, b, c]) => {
          if (!tw) {
            tris.push([[a[0], a[1], z0 + t], [b[0], b[1], z0 + t], [c[0], c[1], z0 + t]]);   // top, facing up
            tris.push([[a[0], a[1], z0], [c[0], c[1], z0], [b[0], b[1], z0]]);   // bottom, facing down
          } else {
            const [A, B, C] = rotate([a, b, c], N), [A0, B0, C0] = rotate([a, b, c], 0);
            tris.push([[A[0], A[1], z0 + t], [B[0], B[1], z0 + t], [C[0], C[1], z0 + t]]);
            tris.push([[A0[0], A0[1], z0], [C0[0], C0[1], z0], [B0[0], B0[1], z0]]);
          }
        });
        [outer].concat(holes).forEach(ring => {   // walls: outer ring ccw and holes cw both face outward from the solid
          for (let k = 0; k < N; k++) {
            const r0 = rotate(ring, k), r1 = rotate(ring, k + 1), za = z0 + k / N * t, zb = z0 + (k + 1) / N * t;
            for (let i = 0; i < ring.length; i++) {
              const j = (i + 1) % ring.length, a = r0[i], b = r0[j], c = r1[j], d = r1[i];
              tris.push([[a[0], a[1], za], [b[0], b[1], za], [c[0], c[1], zb]]);
              tris.push([[a[0], a[1], za], [c[0], c[1], zb], [d[0], d[1], zb]]);
            }
          }
        });
      });
    });
    const buf = new ArrayBuffer(84 + tris.length * 50), dv = new DataView(buf);
    const head = 'Mechanical Notebook (MIT) - units mm'; for (let i = 0; i < head.length; i++) dv.setUint8(i, head.charCodeAt(i));
    dv.setUint32(80, tris.length, true);
    tris.forEach((t, k) => {
      const o = 84 + k * 50, [a, b, c] = t, u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]; const l = Math.hypot(...n) || 1; n = n.map(x => x / l);
      [n, a, b, c].forEach((p, j) => p.forEach((x, i) => dv.setFloat32(o + j * 12 + i * 4, x, true)));
      dv.setUint16(o + 48, 0, true);
    });
    G._lastTriCount = tris.length;
    return buf;
  };

  G.download = function (name, data, type) {
    const blob = new Blob([data], { type }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };
})();
