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
    // binary STL: every shape extruded by its part's thickness, stacked from z = 0
    const tris = [];
    parts.forEach(p => {
      const t = p.thickness || 5, z0 = p.z || 0, z1 = z0 + t;
      p.shapes.forEach(s => {
        const rings = shapeRings(s), outer = G.ccw(rings[0]), holes = rings.slice(1).map(h => G.cw(h));
        G.triangulate(outer, holes).forEach(([a, b, c]) => {
          tris.push([[a[0], a[1], z1], [b[0], b[1], z1], [c[0], c[1], z1]]);   // top, facing up
          tris.push([[a[0], a[1], z0], [c[0], c[1], z0], [b[0], b[1], z0]]);   // bottom, facing down
        });
        [outer].concat(holes).forEach(ring => {   // walls: outer ring ccw and holes cw both face outward from the solid
          for (let i = 0; i < ring.length; i++) {
            const a = ring[i], b = ring[(i + 1) % ring.length];
            tris.push([[a[0], a[1], z0], [b[0], b[1], z0], [b[0], b[1], z1]]);
            tris.push([[a[0], a[1], z0], [b[0], b[1], z1], [a[0], a[1], z1]]);
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
