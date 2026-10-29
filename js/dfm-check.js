/* DXF manufacturability check (Design room tool).
   Everything runs in the browser: the file is read with FileReader and never sent anywhere.
   1. parse: DXF text -> edges (lines and arcs, in mm), bend lines, notes about the file
   2. geometry: join edges into closed outlines, find holes, inside corners, narrow webs and slots, cut length
   3. judge: for a material, thickness, quantity and the user's needs, rank the ways to make it and list the fixes
   The numbers are rough rules of thumb from shop and service design guides, for comparing options, not quotes. */
(function () {
  const MN = window.MN_DFM = window.MN_DFM || {};
  const TAU = Math.PI * 2, D2R = Math.PI / 180;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const f1 = (v, n = 1) => (Math.round(v * 10 ** n) / 10 ** n).toFixed(n).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');

  /* =====================================================================================
     1. DXF PARSER
     ===================================================================================== */
  const UNITS = { 1: ['in', 25.4], 2: ['ft', 304.8], 4: ['mm', 1], 5: ['cm', 10], 6: ['m', 1000] };
  function readPairs(text) {
    const L = text.split(/\r\n|\r|\n/), P = [];
    for (let i = 0; i + 1 < L.length; i += 2) { const c = parseInt(L[i], 10); if (isNaN(c)) { i--; continue; } P.push([c, L[i + 1].trim()]); }
    return P;
  }
  // group the pairs into entities: { type, layer, g: [[code, value], ...] }
  function parse(text) {
    if (/^AutoCAD Binary DXF/.test(text)) throw new Error('This is a binary DXF. Save it again as an ASCII (text) DXF and try once more.');
    const P = readPairs(text);
    if (!P.some(p => p[0] === 0 && p[1] === 'SECTION') && !P.some(p => p[0] === 0 && /^(LINE|LWPOLYLINE|CIRCLE|ARC)$/.test(p[1]))) throw new Error('This does not look like a DXF file.');
    const out = { insunits: 0, measurement: null, ents: [], blocks: {} };
    let sec = null, cur = null, blk = null, hdrVar = null;
    const flush = () => { if (cur) { (blk ? blk.ents : out.ents).push(cur); cur = null; } };
    for (let i = 0; i < P.length; i++) {
      const [c, v] = P[i];
      if (c === 0) {
        flush();
        if (v === 'SECTION') { const n = P[i + 1]; sec = n && n[0] === 2 ? n[1] : null; i++; continue; }
        if (v === 'ENDSEC') { sec = null; continue; }
        if (v === 'EOF') break;
        if (sec === 'BLOCKS' && v === 'BLOCK') { blk = { name: '', base: [0, 0], ents: [] }; cur = null; let j = i + 1; for (; j < P.length && P[j][0] !== 0; j++) { if (P[j][0] === 2) blk.name = P[j][1]; if (P[j][0] === 10) blk.base[0] = +P[j][1]; if (P[j][0] === 20) blk.base[1] = +P[j][1]; } i = j - 1; continue; }
        if (sec === 'BLOCKS' && v === 'ENDBLK') { if (blk) out.blocks[blk.name] = blk; blk = null; continue; }
        if (sec === 'ENTITIES' || (sec === 'BLOCKS' && blk)) cur = { type: v, layer: '0', g: [] };
        continue;
      }
      if (sec === 'HEADER') {
        if (c === 9) hdrVar = v;
        else if (hdrVar === '$INSUNITS' && c === 70) out.insunits = parseInt(v, 10);
        else if (hdrVar === '$MEASUREMENT' && c === 70) out.measurement = parseInt(v, 10);
        continue;
      }
      if (cur) { if (c === 8) cur.layer = v; cur.g.push([c, v]); }
    }
    flush();
    return out;
  }
  const gv = (e, code, d) => { const f = e.g.find(p => p[0] === code); return f ? +f[1] : d; };
  const gs = (e, code, d) => { const f = e.g.find(p => p[0] === code); return f ? f[1] : d; };

  /* edges: {k:'L', p0, p1, src} or {k:'A', p0, p1, c, r, sw (signed sweep, + = counter-clockwise), src} or {k:'C', c, r, src} (whole circle) */
  let SRC = 0;
  const lineE = (a, b, src, smooth) => ({ k: 'L', p0: a, p1: b, src, smooth: !!smooth });
  const arcE = (c, r, a0, sw, src) => ({ k: 'A', c, r, sw, p0: [c[0] + r * Math.cos(a0), c[1] + r * Math.sin(a0)], p1: [c[0] + r * Math.cos(a0 + sw), c[1] + r * Math.sin(a0 + sw)], src });
  // polyline segment with a bulge (bulge = tan(sweep / 4), + = counter-clockwise)
  function bulgeE(a, b, bu, src) {
    if (Math.abs(bu) < 1e-9) return lineE(a, b, src);
    const sw = 4 * Math.atan(bu), dx = b[0] - a[0], dy = b[1] - a[1], ch = Math.hypot(dx, dy);
    if (ch < 1e-12) return null;
    const r = ch / (2 * Math.sin(Math.abs(sw) / 2));
    // centre: from the chord midpoint, along the left normal by r·cos(sw/2) (signed by the sweep direction)
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, nx = -dy / ch, ny = dx / ch, dd = (ch / 2) / Math.tan(sw / 2);
    const c = [mx + nx * dd, my + ny * dd];
    const a0 = Math.atan2(a[1] - c[1], a[0] - c[0]);
    return Object.assign(arcE(c, Math.abs(r), a0, sw, src), { p0: a.slice(), p1: b.slice() });
  }
  // B-spline (with optional weights) sampled into points
  function splinePts(e) {
    const deg = gv(e, 71, 3), K = [], C = [], W = [], F = [];
    let cx = null;
    e.g.forEach(([c, v]) => {
      if (c === 40) K.push(+v); else if (c === 41) W.push(+v);
      else if (c === 10) cx = +v; else if (c === 20 && cx != null) { C.push([cx, +v]); cx = null; }
      else if (c === 11) cx = +v; else if (c === 21 && cx != null) { F.push([cx, +v]); cx = null; }
    });
    if (C.length > deg && K.length === C.length + deg + 1) {
      const w = W.length === C.length ? W : C.map(() => 1), n = Math.max(24, C.length * 12), out = [];
      const t0 = K[deg], t1 = K[K.length - deg - 1];
      for (let s = 0; s <= n; s++) {
        let t = t0 + (t1 - t0) * s / n; if (s === n) t = t1 - 1e-9 * (t1 - t0);
        let k = deg; while (k < C.length - 1 && t >= K[k + 1]) k++;
        const d = []; for (let j = 0; j <= deg; j++) { const P = C[k - deg + j], ww = w[k - deg + j]; d.push([P[0] * ww, P[1] * ww, ww]); }
        for (let r = 1; r <= deg; r++) for (let j = deg; j >= r; j--) { const i = k - deg + j, a = (t - K[i]) / ((K[i + deg - r + 1] - K[i]) || 1); for (let q = 0; q < 3; q++) d[j][q] = (1 - a) * d[j - 1][q] + a * d[j][q]; }
        out.push([d[deg][0] / d[deg][2], d[deg][1] / d[deg][2]]);
      }
      if (s0close(C, gv(e, 70, 0))) out[out.length - 1] = out[0].slice();
      return out;
    }
    return F.length > 1 ? F : C;
  }
  const s0close = (C, flag) => (flag & 1) === 1;
  // one entity -> edges, in its own coordinates. OCS with extrusion z = -1 mirrors x.
  function entEdges(e, notes) {
    const src = ++SRC, mir = gv(e, 230, 1) < 0, M = p => mir ? [-p[0], p[1]] : p, out = [];
    switch (e.type) {
      case 'LINE': out.push(lineE([gv(e, 10, 0), gv(e, 20, 0)], [gv(e, 11, 0), gv(e, 21, 0)], src)); break;
      case 'CIRCLE': { const r = gv(e, 40, 0); if (r > 0) out.push({ k: 'C', c: M([gv(e, 10, 0), gv(e, 20, 0)]), r, src }); break; }
      case 'ARC': {
        const c = [gv(e, 10, 0), gv(e, 20, 0)], r = gv(e, 40, 0); let a0 = gv(e, 50, 0) * D2R, a1 = gv(e, 51, 360) * D2R;
        let sw = a1 - a0; while (sw <= 0) sw += TAU;
        if (r > 0) out.push(mir ? arcE([-c[0], c[1]], r, Math.PI - a0, -sw, src) : arcE(c, r, a0, sw, src));
        break;
      }
      case 'LWPOLYLINE': {
        const V = []; let cur = null;
        e.g.forEach(([c, v]) => { if (c === 10) { cur = { x: +v, y: 0, b: 0 }; V.push(cur); } else if (c === 20 && cur) cur.y = +v; else if (c === 42 && cur) cur.b = +v; });
        const closed = (gv(e, 70, 0) & 1) === 1;
        for (let i = 0; i < V.length - (closed ? 0 : 1); i++) { const a = V[i], b = V[(i + 1) % V.length]; const ed = bulgeE(M([a.x, a.y]), M([b.x, b.y]), mir ? -a.b : a.b, src); if (ed) out.push(ed); }
        break;
      }
      case 'POLYLINE': {
        const V = e.verts || [], closed = (gv(e, 70, 0) & 1) === 1;
        if (gv(e, 70, 0) & (16 | 64)) { notes.mesh = (notes.mesh || 0) + 1; break; }
        for (let i = 0; i < V.length - (closed ? 0 : 1); i++) { const a = V[i], b = V[(i + 1) % V.length]; const ed = bulgeE(M([a.x, a.y]), M([b.x, b.y]), mir ? -a.b : a.b, src); if (ed) out.push(ed); }
        break;
      }
      case 'SPLINE': { const P = splinePts(e); for (let i = 0; i + 1 < P.length; i++) out.push(lineE(P[i], P[i + 1], src, true)); notes.curves = (notes.curves || 0) + 1; break; }
      case 'ELLIPSE': {
        const c = [gv(e, 10, 0), gv(e, 20, 0)], mj = [gv(e, 11, 1), gv(e, 21, 0)], ra = gv(e, 40, 1); let t0 = gv(e, 41, 0), t1 = gv(e, 42, TAU);
        while (t1 <= t0) t1 += TAU;
        const n = Math.max(16, Math.ceil((t1 - t0) / TAU * 96)), P = [];
        for (let s = 0; s <= n; s++) { const t = t0 + (t1 - t0) * s / n, x = Math.cos(t), y = Math.sin(t) * ra; P.push(M([c[0] + mj[0] * x - mj[1] * y, c[1] + mj[1] * x + mj[0] * y])); }
        if (Math.abs(t1 - t0 - TAU) < 1e-6) P[n] = P[0].slice();
        for (let i = 0; i < n; i++) out.push(lineE(P[i], P[i + 1], src, true));
        notes.curves = (notes.curves || 0) + 1; break;
      }
      case 'TEXT': case 'MTEXT': notes.text = (notes.text || 0) + 1; break;
      case 'DIMENSION': case 'LEADER': case 'MULTILEADER': notes.dims = (notes.dims || 0) + 1; break;
      case 'HATCH': case 'SOLID': notes.hatch = (notes.hatch || 0) + 1; break;
      case 'POINT': case 'VIEWPORT': case 'ATTDEF': case 'ATTRIB': case 'SEQEND': case 'VERTEX': break;
      case '3DFACE': case '3DSOLID': case 'MESH': case 'REGION': case 'BODY': notes.mesh = (notes.mesh || 0) + 1; break;
      default: notes.other = notes.other || {}; notes.other[e.type] = (notes.other[e.type] || 0) + 1;
    }
    out.forEach(x => x.layer = e.layer);
    return out;
  }
  // move transform for INSERT: scale, rotate, then translate. Arcs survive a uniform scale; otherwise they are sampled.
  function xform(ed, T) {
    const P = p => { const x = (p[0] - T.bx) * T.sx, y = (p[1] - T.by) * T.sy; return [T.x + x * T.cs - y * T.sn, T.y + x * T.sn + y * T.cs]; };
    const uni = Math.abs(Math.abs(T.sx) - Math.abs(T.sy)) < 1e-9, flip = T.sx * T.sy < 0, s = Math.abs(T.sx);
    if (ed.k === 'L') return [Object.assign({}, ed, { p0: P(ed.p0), p1: P(ed.p1) })];
    if (uni) {
      if (ed.k === 'C') return [Object.assign({}, ed, { c: P(ed.c), r: ed.r * s })];
      return [Object.assign({}, ed, { c: P(ed.c), r: ed.r * s, sw: flip ? -ed.sw : ed.sw, p0: P(ed.p0), p1: P(ed.p1) })];
    }
    const pts = sampleEdge(ed, 48).map(P), out = [];
    for (let i = 0; i + 1 < pts.length; i++) out.push(Object.assign({}, ed, { k: 'L', p0: pts[i], p1: pts[i + 1], smooth: true }));
    return out;
  }
  function collect(doc) {
    const notes = {}, edges = [];
    // POLYLINE + VERTEX ... SEQEND -> one entity with verts
    const fold = list => { const o = []; let poly = null; list.forEach(e => {
      if (e.type === 'POLYLINE') { poly = e; if (!e.verts) e.verts = []; o.push(e); }
      else if (e.type === 'VERTEX' && poly) poly.verts.push({ x: gv(e, 10, 0), y: gv(e, 20, 0), b: gv(e, 42, 0) });
      else if (e.type === 'SEQEND') poly = null; else o.push(e); }); return o; };
    Object.values(doc.blocks).forEach(b => b.ents = fold(b.ents));
    const walk = (list, T, depth) => fold(list).forEach(e => {
      if (e.type === 'INSERT') {
        const b = doc.blocks[gs(e, 2, '')]; if (!b || depth > 8) return;
        const r = gv(e, 50, 0) * D2R, mirI = gv(e, 230, 1) < 0;
        const T2 = { bx: b.base[0], by: b.base[1], sx: gv(e, 41, 1) * (mirI ? -1 : 1), sy: gv(e, 42, 1), cs: Math.cos(r), sn: Math.sin(r), x: gv(e, 10, 0) * (mirI ? -1 : 1), y: gv(e, 20, 0) };
        const nx = Math.max(1, gv(e, 70, 1)), ny = Math.max(1, gv(e, 71, 1)), dx = gv(e, 44, 0), dy = gv(e, 45, 0);
        for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
          const Tij = Object.assign({}, T2, { x: T2.x + (i * dx) * T2.cs - (j * dy) * T2.sn, y: T2.y + (i * dx) * T2.sn + (j * dy) * T2.cs });
          collectInto(b.ents, Tij, T, depth + 1);
        }
        notes.blocks = (notes.blocks || 0) + 1; return;
      }
      let es = entEdges(e, notes);
      if (T) es = [].concat(...es.map(x => xform(x, T)));
      edges.push(...es);
    });
    // nested blocks: apply the inner transform, then the outer one
    function collectInto(list, Tin, Tout, depth) {
      const before = edges.length;
      walk(list, Tin, depth);
      if (Tout) { const added = edges.splice(before); added.forEach(x => edges.push(...xform(x, Tout))); }
    }
    walk(doc.ents, null, 0);
    return { edges, notes };
  }

  /* =====================================================================================
     2. GEOMETRY
     ===================================================================================== */
  function sampleEdge(ed, nMin) {
    if (ed.k === 'L') return [ed.p0, ed.p1];
    if (ed.k === 'C') { const n = Math.max(nMin || 8, Math.ceil(TAU / (4 * D2R))), o = []; for (let i = 0; i <= n; i++) { const a = ed.a0 != null ? ed.a0 + ed.dir * TAU * i / n : TAU * i / n * (ed.dir || 1); o.push([ed.c[0] + ed.r * Math.cos(a), ed.c[1] + ed.r * Math.sin(a)]); } return o; }
    const a0 = Math.atan2(ed.p0[1] - ed.c[1], ed.p0[0] - ed.c[0]), n = Math.max(nMin || 2, Math.ceil(Math.abs(ed.sw) / (4 * D2R))), o = [ed.p0];
    for (let i = 1; i < n; i++) { const a = a0 + ed.sw * i / n; o.push([ed.c[0] + ed.r * Math.cos(a), ed.c[1] + ed.r * Math.sin(a)]); }
    o.push(ed.p1); return o;
  }
  const rev = ed => ed.k === 'L' ? Object.assign({}, ed, { p0: ed.p1, p1: ed.p0 }) : ed.k === 'A' ? Object.assign({}, ed, { p0: ed.p1, p1: ed.p0, sw: -ed.sw }) : Object.assign({}, ed, { dir: -(ed.dir || 1) });
  // unit tangent at the start (t=0) or end (t=1) of an edge, in its direction of travel
  function tan(ed, end) {
    if (ed.k === 'L') { const dx = ed.p1[0] - ed.p0[0], dy = ed.p1[1] - ed.p0[1], l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; }
    const p = end ? ed.p1 : ed.p0, rx = p[0] - ed.c[0], ry = p[1] - ed.c[1], s = Math.sign(ed.sw), l = Math.hypot(rx, ry) || 1;
    return [-ry / l * s, rx / l * s];
  }
  const edLen = ed => ed.k === 'L' ? Math.hypot(ed.p1[0] - ed.p0[0], ed.p1[1] - ed.p0[1]) : ed.k === 'C' ? TAU * ed.r : Math.abs(ed.sw) * ed.r;
  const polyArea = P => { let a = 0; for (let i = 0, n = P.length; i < n; i++) { const p = P[i], q = P[(i + 1) % n]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; };
  const inPoly = (pt, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > pt[1]) !== (b[1] > pt[1]) && pt[0] < (b[0] - a[0]) * (pt[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };

  function geometry(raw, scale, opt) {
    const S = p => [p[0] * scale, p[1] * scale];
    const all = raw.map(e => e.k === 'C' ? Object.assign({}, e, { c: S(e.c), r: e.r * scale }) : e.k === 'A' ? Object.assign({}, e, { c: S(e.c), r: e.r * scale, p0: S(e.p0), p1: S(e.p1) }) : Object.assign({}, e, { p0: S(e.p0), p1: S(e.p1) }));
    const isBend = e => /bend|fold/i.test(e.layer || ''), isMark = e => /engrav|etch|mark|score|scribe/i.test(e.layer || ''), isSkip = e => /^defpoints$|legend|note|annot|dimen|^dims?$|title|border|frame|construct|centre|center|hidden|ref/i.test(e.layer || '');
    const bends = all.filter(e => isBend(e) && e.k === 'L'), marks = all.filter(e => isMark(e) && !isBend(e)), cutsAll = all.filter(e => !isBend(e) && !isMark(e) && !isSkip(e));
    const G = { bends, marks, issues: [], loops: [], open: [], gaps: [], dups: 0, tiny: 0, skipped: [...new Set(all.filter(e => isSkip(e) && !isBend(e) && !isMark(e)).map(e => e.layer))] };
    if (!cutsAll.length) return G;
    // bounding box
    let x0 = 1e18, y0 = 1e18, x1 = -1e18, y1 = -1e18;
    const grow = p => { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; };
    cutsAll.forEach(e => sampleEdge(e, 8).forEach(grow));
    G.box = [x0, y0, x1, y1];
    const diag = Math.hypot(x1 - x0, y1 - y0), tol = Math.max(0.002, diag * 2e-6), gapTol = Math.min(1, Math.max(0.05, diag * 0.003));
    // drop zero-length edges and exact duplicates (the cutter would trace them twice)
    const key = (e) => e.k === 'C' ? 'C' + Math.round(e.c[0] / tol) + ',' + Math.round(e.c[1] / tol) + ',' + Math.round(e.r / tol) : null;
    const seen = new Map(), cuts = [];
    cutsAll.forEach(e => {
      if (e.k !== 'C' && edLen(e) < tol) { G.tiny++; return; }
      let k = key(e);
      if (!k) { const m = sampleEdge(e, 3), mid = m[Math.floor(m.length / 2)], a = [e.p0, e.p1].map(p => Math.round(p[0] / (tol * 5)) + ',' + Math.round(p[1] / (tol * 5))).sort().join('|'); k = e.k + a + '|' + Math.round(mid[0] / (tol * 5)) + ',' + Math.round(mid[1] / (tol * 5)); }
      if (seen.has(k)) { G.dups++; G.issues.push({ id: 'dup', at: e.k === 'C' ? e.c : e.p0 }); return; }
      seen.set(k, 1); cuts.push(e);
    });
    // circles are closed outlines on their own
    cuts.filter(e => e.k === 'C').forEach(e => G.loops.push({ edges: [Object.assign({}, e, { dir: 1 })], circle: true }));
    // join the other edges end to end: endpoints within tol are one node
    const segs = cuts.filter(e => e.k !== 'C'), nodes = [], cell = new Map(), cellK = (x, y) => Math.floor(x / tol / 4) + ',' + Math.floor(y / tol / 4);
    const nodeAt = p => {
      const cx = Math.floor(p[0] / tol / 4), cy = Math.floor(p[1] / tol / 4);
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const L = cell.get((cx + i) + ',' + (cy + j)); if (L) for (const n of L) if (Math.hypot(nodes[n].p[0] - p[0], nodes[n].p[1] - p[1]) <= tol) return n; }
      const id = nodes.length; nodes.push({ p: p.slice(), es: [] }); const k = cellK(p[0], p[1]); (cell.get(k) || cell.set(k, []).get(k)).push(id); return id;
    };
    segs.forEach((e, i) => { e.n0 = nodeAt(e.p0); e.n1 = nodeAt(e.p1); nodes[e.n0].es.push(i); nodes[e.n1].es.push(i); });
    // small gaps between loose ends: report them, and bridge them so the rest of the check can go on
    const loose = nodes.map((n, i) => n.es.length === 1 ? i : -1).filter(i => i >= 0), used = new Set();
    loose.forEach(a => {
      if (used.has(a)) return; let best = -1, bd = gapTol;
      loose.forEach(b => { if (b === a || used.has(b)) return; const d = Math.hypot(nodes[a].p[0] - nodes[b].p[0], nodes[a].p[1] - nodes[b].p[1]); if (d < bd) { bd = d; best = b; } });
      if (best >= 0) { used.add(a); used.add(best); const e = lineE(nodes[a].p, nodes[best].p, -1); e.gap = true; e.n0 = a; e.n1 = best; segs.push(e); nodes[a].es.push(segs.length - 1); nodes[best].es.push(segs.length - 1); G.gaps.push({ at: [(nodes[a].p[0] + nodes[best].p[0]) / 2, (nodes[a].p[1] + nodes[best].p[1]) / 2], d: bd }); }
    });
    nodes.forEach((n, i) => { if (n.es.length > 2) G.issues.push({ id: 'branch', at: n.p }); });
    // walk the chains
    const done = new Uint8Array(segs.length);
    const chain = (start, fromNode) => {
      const out = []; let i = start, at = fromNode;
      while (i >= 0 && !done[i]) {
        done[i] = 1; const e = segs[i], fwd = e.n0 === at; out.push(fwd ? e : rev(e)); at = fwd ? e.n1 : e.n0;
        const nx = nodes[at].es.find(j => !done[j]); i = nx === undefined ? -1 : nx;
      }
      return { edges: out, end: at };
    };
    // open chains first, starting from loose ends, so the loops left over are closed
    nodes.forEach((n, ni) => { if (n.es.length === 1 && !done[n.es[0]]) { const c = chain(n.es[0], ni); G.open.push(c.edges); } });
    segs.forEach((e, i) => { if (done[i]) return; const c = chain(i, e.n0); const first = c.edges[0]; if (c.end === e.n0 || Math.hypot(c.edges[c.edges.length - 1].p1[0] - first.p0[0], c.edges[c.edges.length - 1].p1[1] - first.p0[1]) <= tol * 2) G.loops.push({ edges: c.edges }); else G.open.push(c.edges); });
    // sample every loop, find which loops are inside which, and turn them so the material is always on the left
    G.loops.forEach(L => { L.pts = []; L.edges.forEach((e, k) => sampleEdge(e).forEach((p, j) => { if (j || !k) L.pts.push(p); })); if (L.pts.length > 2 && Math.hypot(L.pts[0][0] - L.pts[L.pts.length - 1][0], L.pts[0][1] - L.pts[L.pts.length - 1][1]) < tol * 3) L.pts.pop(); L.area = polyArea(L.pts); L.bb = bbOf(L.pts); });
    G.loops = G.loops.filter(L => L.pts.length > 2 && Math.abs(L.area) > tol * tol);
    G.loops.forEach((L, i) => { const p = L.pts[0]; L.depth = 0; L.parent = -1; let pa = Infinity;
      G.loops.forEach((M, j) => { if (j === i || Math.abs(M.area) <= Math.abs(L.area) || !inBB(p, M.bb) || !inPoly(p, M.pts)) return; L.depth++; if (Math.abs(M.area) < pa) { pa = Math.abs(M.area); L.parent = j; } }); });
    G.loops.forEach(L => { L.hole = L.depth % 2 === 1; const want = L.hole ? -1 : 1; if (Math.sign(L.area) !== want) { L.edges = L.edges.slice().reverse().map(rev); L.pts.reverse(); L.area = -L.area; } });
    G.parts = G.loops.filter(L => !L.hole);
    G.holes = G.loops.filter(L => L.hole);
    G.circles = G.holes.filter(L => L.circle).map(L => ({ d: 2 * L.edges[0].r, at: L.edges[0].c }));
    G.area = G.loops.reduce((s, L) => s + L.area, 0);
    G.cutLen = G.loops.reduce((s, L) => s + L.edges.reduce((t, e) => t + edLen(e), 0), 0) + G.open.reduce((s, c) => s + c.reduce((t, e) => t + edLen(e), 0), 0);
    G.pierces = G.loops.length + G.open.length;
    G.markLen = marks.reduce((s, e) => s + edLen(e), 0);
    let T0 = Date.now(); corners(G); if (!(opt && opt.quick)) widths(G); else { G.webs = []; G.slots = []; } shapeOf(G); G.ms = Date.now() - T0;
    return G;
  }
  const bbOf = P => { let a = 1e18, b = 1e18, c = -1e18, d = -1e18; P.forEach(p => { a = Math.min(a, p[0]); b = Math.min(b, p[1]); c = Math.max(c, p[0]); d = Math.max(d, p[1]); }); return [a, b, c, d]; };
  const inBB = (p, B) => p[0] >= B[0] && p[0] <= B[2] && p[1] >= B[1] && p[1] <= B[3];

  // inside corners: where the outline turns away from the material (a round cutter cannot reach in), and how sharp they are
  function corners(G) {
    G.corners = [];
    G.loops.forEach(L => {
      if (L.circle) return;
      const E = L.edges, n = E.length;
      for (let i = 0; i < n; i++) {
        const a = E[i], b = E[(i + 1) % n];
        if (a.smooth && b.smooth && a.src === b.src) continue;
        const t1 = tan(a, true), t2 = tan(b, false), cr = t1[0] * t2[1] - t1[1] * t2[0], dt = t1[0] * t2[0] + t1[1] * t2[1], turn = Math.atan2(cr, dt);
        if (turn < -30 * D2R) G.corners.push({ r: 0, at: a.p1, turn: -turn });
        if (b.k === 'A' && b.sw < 0 && Math.abs(b.sw) < 170 * D2R && Math.abs(b.sw) > 20 * D2R) { const m = sampleEdge(b, 3); G.corners.push({ r: b.r, at: m[Math.floor(m.length / 2)], turn: -b.sw }); }
      }
    });
  }
  // narrow places: for points along the outlines, the nearest point straight across (both normals facing each other)
  //   across material = a web or bridge; across empty space = a slot or gap
  function widths(G) {
    G.webs = []; G.slots = [];
    const B = G.box, diag = Math.hypot(B[2] - B[0], B[3] - B[1]), R = Math.min(20, Math.max(6, diag / 4)), step = Math.min(0.4, Math.max(0.12, diag / 2500));
    const P = [];   // [x, y, nx, ny (unit normal into the material), loop, circleLoop]
    G.loops.forEach((L, li) => {
      const pts = L.pts, n = pts.length;
      for (let i = 0; i < n; i++) {
        const a = pts[i], b = pts[(i + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy); if (l < 1e-9) continue;
        const nx = -dy / l, ny = dx / l, k = Math.max(1, Math.ceil(l / step));
        for (let j = 0; j < k; j++) { const t = (j + 0.5) / k; P.push([a[0] + dx * t, a[1] + dy * t, nx, ny, li, L.circle ? 1 : 0]); }
      }
    });
    if (P.length > 400000) { G.widthSkipped = true; return; }
    const cs = R, grid = new Map(), K = (x, y) => Math.floor(x / cs) + ',' + Math.floor(y / cs);
    P.forEach((p, i) => { const k = K(p[0], p[1]); (grid.get(k) || grid.set(k, []).get(k)).push(i); });
    const COS = Math.cos(12 * D2R), web = [], slot = [];
    P.forEach((p, i) => {
      const cx = Math.floor(p[0] / cs), cy = Math.floor(p[1] / cs); let bw = R, bs = R, qw = -1, qs = -1;
      for (let u = -1; u <= 1; u++) for (let v = -1; v <= 1; v++) { const L = grid.get((cx + u) + ',' + (cy + v)); if (!L) continue;
        for (const j of L) { if (j === i) continue; const q = P[j], dx = q[0] - p[0], dy = q[1] - p[1], d = Math.hypot(dx, dy); if (d < 1e-6 || d >= Math.max(bw, bs)) continue;
          const a = (dx * p[2] + dy * p[3]) / d, b = -(dx * q[2] + dy * q[3]) / d;
          if (a > COS && b > COS && d < bw) { bw = d; qw = j; }
          else if (a < -COS && b < -COS && d < bs) { bs = d; qs = j; } } }
      if (qw >= 0) web.push([bw, i, qw]);
      if (qs >= 0 && !(p[5] && P[qs][5] && p[4] === P[qs][4])) slot.push([bs, i, qs]);
    });
    // keep the narrowest place in each neighbourhood
    // keep the narrowest place of each narrow region: a candidate next to a narrower one already seen belongs to the same region
    const thin = (list, out) => { list.sort((a, b) => a[0] - b[0]); const kept = [], seen = new Map(), cz = 2, SK = (x, y) => Math.floor(x / cz) + ',' + Math.floor(y / cz);
      for (const [d, i, j] of list) { const m = [(P[i][0] + P[j][0]) / 2, (P[i][1] + P[j][1]) / 2], rr = Math.min(cz, Math.max(step * 3, 0.5, d * 0.75));
        const gx = Math.floor(m[0] / cz), gy = Math.floor(m[1] / cz); let near = false;
        for (let u = -1; u <= 1 && !near; u++) for (let v = -1; v <= 1 && !near; v++) { const L = seen.get((gx + u) + ',' + (gy + v)); if (L) near = L.some(q => Math.hypot(q[0] - m[0], q[1] - m[1]) < rr); }
        const k = SK(m[0], m[1]); (seen.get(k) || seen.set(k, []).get(k)).push(m);
        if (near) continue;
        kept.push({ d, at: m, p: [P[i][0], P[i][1]], q: [P[j][0], P[j][1]] }); if (kept.length > 400) break; }
      out.push(...kept); };
    thin(web, G.webs); thin(slot, G.slots);
  }
  // simple shapes: a plain rectangle could be cut from flat bar; a part bigger than any sheet needs splitting
  function shapeOf(G) {
    const parts = G.parts; if (!parts.length) return;
    const big = parts.reduce((a, b) => Math.abs(b.area) > Math.abs(a.area) ? b : a);
    const E = big.edges, rect = E.length === 4 && E.every(e => e.k === 'L') && E.every((e, i) => { const a = tan(e, true), b = tan(E[(i + 1) % 4], false); return Math.abs(a[0] * b[0] + a[1] * b[1]) < 0.01; });
    const w = Math.min(big.bb[2] - big.bb[0], big.bb[3] - big.bb[1]), l = Math.max(big.bb[2] - big.bb[0], big.bb[3] - big.bb[1]);
    G.main = { rect, w, l, area: Math.abs(big.area) };
  }

  /* =====================================================================================
     3. MATERIALS, PROCESSES AND THE JUDGEMENT
     ===================================================================================== */
  // fam groups materials for the process rules. ys = yield strength (MPa; tensile strength for plastics and wood), rho = g/cm³, kg = rough $/kg
  const MATS = {
    steel: { n: 'Mild steel (A36 / 1008)', fam: 'steel', ys: 250, rho: 7.85, kg: 1.6, out: 'coat', food: 0, heat: 1, bend: 1 },
    ss304: { n: 'Stainless steel 304', fam: 'stainless', ys: 215, rho: 8.0, kg: 5, out: 1, food: 1, heat: 1, bend: 1 },
    al5052: { n: 'Aluminium 5052-H32', fam: 'al', ys: 193, rho: 2.68, kg: 6, out: 1, food: 0, heat: 1, bend: 1 },
    al6061: { n: 'Aluminium 6061-T6', fam: 'al', ys: 276, rho: 2.7, kg: 6, out: 1, food: 0, heat: 1, bend: 0 },
    brass: { n: 'Brass 260 (half hard)', fam: 'brass', ys: 300, rho: 8.53, kg: 12, out: 1, food: 0, heat: 1, bend: 1 },
    ti: { n: 'Titanium grade 5', fam: 'ti', ys: 880, rho: 4.43, kg: 40, out: 1, food: 1, heat: 1, bend: 0 },
    acrylic: { n: 'Acrylic (cast PMMA)', fam: 'acrylic', ys: 65, rho: 1.19, kg: 5, out: 1, food: 0, heat: 0, bend: 0, brittle: 1 },
    pc: { n: 'Polycarbonate', fam: 'pc', ys: 60, rho: 1.2, kg: 7, out: 1, food: 0, heat: 0, bend: 0 },
    hdpe: { n: 'HDPE', fam: 'hdpe', ys: 25, rho: 0.95, kg: 4, out: 1, food: 1, heat: 0, bend: 0 },
    acetal: { n: 'Acetal (Delrin)', fam: 'acetal', ys: 65, rho: 1.41, kg: 9, out: 0, food: 1, heat: 0, bend: 0 },
    ply: { n: 'Birch plywood', fam: 'wood', ys: 35, rho: 0.68, kg: 3, out: 0, food: 0, heat: 0, bend: 0 },
    mdf: { n: 'MDF', fam: 'mdf', ys: 15, rho: 0.75, kg: 1.2, out: 0, food: 0, heat: 0, bend: 0 },
    g10: { n: 'G10 / FR4 (glass-epoxy)', fam: 'g10', ys: 250, rho: 1.85, kg: 20, out: 1, food: 0, heat: 1, bend: 0 },
    abs: { n: 'ABS', fam: 'abs', ys: 40, rho: 1.04, kg: 3, out: 0, food: 0, heat: 0, bend: 0 },
    pp: { n: 'Polypropylene (PP)', fam: 'pp', ys: 30, rho: 0.9, kg: 2.5, out: 0, food: 1, heat: 0, bend: 0 },
    nylon: { n: 'Nylon (PA6 / PA12)', fam: 'nylon', ys: 50, rho: 1.14, kg: 6, out: 0, food: 0, heat: 0, bend: 0 }
  };
  const METAL = { steel: 1, stainless: 1, al: 1, brass: 1, ti: 1 };
  const isMetal = m => !!METAL[m.fam];
  // thickness limits (mm) by family; a missing family means "not this process", with the reason in why
  const PROC = [
    { id: 'laser', n: 'Laser cutting', page: '../machining/laser-cutter.html', rate: 120, setup: 10,
      max: { steel: 20, stainless: 12, al: 10, brass: 6, ti: 6, acrylic: 20, wood: 12, mdf: 12, acetal: 6 },
      why: { pc: 'polycarbonate burns and turns yellow under a laser', hdpe: 'HDPE melts and catches fire under a laser', g10: 'glass-epoxy chars and gives off toxic fumes', abs: 'ABS melts and gives off toxic fumes under a laser', pp: 'polypropylene melts rather than cuts cleanly', nylon: 'nylon melts and yellows under a laser' },
      speed: (m, t) => (isMetal(m) ? { steel: 9000, stainless: 7000, al: 8000, brass: 4000, ti: 5000 }[m.fam] : { acrylic: 4000, wood: 4000, mdf: 3500, acetal: 3000 }[m.fam]) / Math.pow(Math.max(t, 0.5), 1.1),
      pierce: t => 0.5 + 0.3 * t, kerf: () => 0.2, tol: t => 0.08 + 0.01 * t,
      hole: (m, t) => isMetal(m) ? [Math.max(0.5 * t, 0.5), t] : [0.5, 1], web: (m, t) => isMetal(m) ? [Math.max(0.5 * t, 0.4), Math.max(t, 0.8)] : [0.8, Math.max(1.5, 0.5 * t)], slot: (m, t) => isMetal(m) ? [0.3, Math.max(0.5 * t, 0.5)] : [0.3, 0.5], rIn: () => 0,
      note: 'A focused beam melts or burns a thin line. Fast and cheap for sheet up to about 10 to 20 mm, sharp inside corners, small holes.' },
    { id: 'waterjet', n: 'Waterjet cutting', page: '../machining/waterjet.html', rate: 150, setup: 15,
      max: { steel: 100, stainless: 100, al: 150, brass: 75, ti: 100, acrylic: 50, pc: 50, hdpe: 75, acetal: 50, g10: 50, abs: 50, pp: 75, nylon: 50 },
      why: { wood: 'water soaks into wood and swells it', mdf: 'water soaks into MDF and swells it' },
      speed: (m, t) => ({ steel: 1200, stainless: 1000, al: 2500, brass: 1500, ti: 900, acrylic: 4000, pc: 4000, hdpe: 5000, acetal: 4000, g10: 2500, abs: 4500, pp: 5000, nylon: 4000 }[m.fam]) / Math.max(t, 1),
      pierce: t => 2 + 0.5 * t, kerf: () => 0.9, tol: t => 0.12 + 0.005 * t,
      hole: (m, t) => [1, Math.max(1.5, 0.5 * t)], web: (m, t) => [1, Math.max(1.5, 0.5 * t)], slot: () => [1, 1.2], rIn: () => 0.45,
      note: 'Water with abrasive grit, at very high pressure. Cuts almost anything, thick or thin, with no heat, but slower and with a slightly tapered, frosted edge.' },
    { id: 'router', n: 'CNC routing', page: '../machining/cnc-router.html', rate: 75, setup: 20,
      max: { wood: 40, mdf: 40, acrylic: 25, pc: 25, hdpe: 40, acetal: 25, g10: 12, al: 12, abs: 25, pp: 40, nylon: 25 },
      why: { steel: 'steel is too hard for a router: mill it or cut it with a laser', stainless: 'stainless is too hard for a router', ti: 'titanium is too hard for a router', brass: 'brass sheet is better laser or waterjet cut' },
      tool: t => t > 12 ? 6.35 : 3.175,
      speed: (m, t) => { const D = t > 12 ? 6.35 : 3.175, feed = { wood: 2400, mdf: 2400, acrylic: 1500, pc: 1500, hdpe: 2000, acetal: 1500, g10: 800, al: 700, abs: 1800, pp: 2000, nylon: 1500 }[m.fam], pass = m.fam === 'al' ? 0.5 * D : D; return feed / Math.max(1, Math.ceil(t / pass)); },
      pierce: () => 1, kerf: t => t > 12 ? 6.35 : 3.175, tol: () => 0.15,
      hole: (m, t) => [1.6, t > 12 ? 6.35 : 3.175], web: (m, t) => m.fam === 'wood' || m.fam === 'mdf' ? [1.5, 3] : [1.2, 2], slot: (m, t) => [1.6, t > 12 ? 6.35 : 3.175], rIn: t => (t > 12 ? 6.35 : 3.175) / 2,
      note: 'A spinning cutter moves round the outline. Good for wood, plastics and thin aluminium; every inside corner keeps the radius of the cutter.' },
    { id: 'plasma', n: 'Plasma cutting', page: '../machining/plasma-cutter.html', rate: 90, setup: 10, min: 1.5,
      max: { steel: 40, stainless: 30, al: 25 },
      why: { brass: 'plasma cuts brass poorly', ti: 'titanium is better waterjet or laser cut', acrylic: 'plasma only cuts metals', pc: 'plasma only cuts metals', hdpe: 'plasma only cuts metals', acetal: 'plasma only cuts metals', wood: 'plasma only cuts metals', mdf: 'plasma only cuts metals', g10: 'plasma only cuts metals' },
      speed: (m, t) => 12000 * ({ steel: 1, stainless: 0.9, al: 1.2 }[m.fam]) / Math.pow(Math.max(t, 1), 0.9),
      pierce: t => 1 + 0.2 * t, kerf: t => 1.5 + 0.05 * t, tol: () => 0.5,
      hole: (m, t) => [Math.max(t, 3), 1.5 * t], web: (m, t) => [Math.max(t, 2), 2 * t], slot: (m, t) => [2.5, Math.max(t, 3)], rIn: () => 1,
      note: 'An electric arc blows molten metal out of the cut. The cheapest way to cut thick steel, but rougher: holes come out tapered and edges need grinding.' },
    { id: 'punch', n: 'Turret punching', page: '../fabrication/sheet-metal-bend.html', rate: 100, setup: 30, minQty: 50,
      max: { steel: 6, stainless: 4, al: 6, brass: 3 },
      why: { ti: 'titanium is too hard on punches', acrylic: 'punching is for sheet metal', pc: 'punching is for sheet metal', hdpe: 'punching is for sheet metal', acetal: 'punching is for sheet metal', wood: 'punching is for sheet metal', mdf: 'punching is for sheet metal', g10: 'punching is for sheet metal' },
      run: (G, t) => (G.pierces * 1.5 + G.cutLen / 2500 * 60) / 60,
      kerf: () => 0, tol: () => 0.1,
      hole: (m, t) => [t, 1.2 * t], web: (m, t) => [t, 1.5 * t], slot: (m, t) => [t, 1.2 * t], rIn: () => 0,
      note: 'A press stamps holes and shapes from standard punches, one hit at a time. Cheap and accurate for sheet metal in batches of hundreds.' },
    { id: 'stamp', n: 'Stamping (a die made for the part)', page: '../fabrication/sheet-metal-bend.html', rate: 100, setup: 60, minQty: 2000,
      max: { steel: 6, stainless: 4, al: 6, brass: 3 },
      why: { ti: 'titanium is rarely stamped', acrylic: 'stamping is for sheet metal', pc: 'stamping is for sheet metal', hdpe: 'stamping is for sheet metal', acetal: 'stamping is for sheet metal', wood: 'stamping is for sheet metal', mdf: 'stamping is for sheet metal', g10: 'stamping is for sheet metal' },
      tooling: G => 4000 + 120 * G.pierces, run: () => 2 / 60, kerf: () => 0, tol: () => 0.05,
      hole: (m, t) => [t, 1.2 * t], web: (m, t) => [t, 1.5 * t], slot: (m, t) => [t, 1.2 * t], rIn: () => 0,
      note: 'A press tool made just for this part cuts it in one stroke. The tool costs thousands, so it only pays off for thousands of parts.' },
    { id: 'mill', n: 'CNC milling from plate', page: '../machining/cnc-mill.html', rate: 100, setup: 45,
      max: { steel: 75, stainless: 75, al: 100, brass: 75, ti: 50, acrylic: 50, pc: 50, hdpe: 75, acetal: 75, g10: 25, abs: 75, pp: 75, nylon: 75 },
      why: { wood: 'a router does the same job faster in wood', mdf: 'a router does the same job faster in MDF' },
      tool: t => [2, 3, 4, 6, 8, 10, 12].find(d => d >= t / 3) || 12,
      speed: (m, t) => ({ steel: 250, stainless: 150, al: 800, brass: 600, ti: 100, acrylic: 1000, pc: 1000, hdpe: 1200, acetal: 1000, g10: 400, abs: 1100, pp: 1200, nylon: 1000 }[m.fam]) * Math.min(1, 6 / Math.max(t, 1)),
      pierce: () => 3, kerf: t => [2, 3, 4, 6, 8, 10, 12].find(d => d >= t / 3) || 12, tol: () => 0.03,
      hole: (m, t) => [Math.max(1, t / 6), [2, 3, 4, 6, 8, 10, 12].find(d => d >= t / 3) || 12], web: (m, t) => [Math.max(0.8, t / 10), Math.max(1.5, t / 5)], slot: (m, t) => [Math.max(1, t / 5), [2, 3, 4, 6, 8, 10, 12].find(d => d >= t / 3) || 12], rIn: t => ([2, 3, 4, 6, 8, 10, 12].find(d => d >= t / 3) || 12) / 2,
      note: 'An end mill cuts the outline from plate on a milling machine. Slower and dearer than cutting with a beam or jet, but holds the tightest tolerances and can add pockets, chamfers and threads in the same setup.' },
    { id: 'print', n: '3D printing (FDM, in plastic)', page: '../fabrication/print-tolerances.html', rate: 6, setup: 5, maxQty: 50,
      max: { acrylic: 40, pc: 40, hdpe: 40, acetal: 40, abs: 40, pp: 40, nylon: 40 },
      why: { steel: 'desktop printers print plastic, not metal', stainless: 'desktop printers print plastic, not metal', al: 'desktop printers print plastic, not metal', brass: 'desktop printers print plastic, not metal', ti: 'desktop printers print plastic, not metal', wood: 'printing makes plastic parts, not wood', mdf: 'printing makes plastic parts, not wood', g10: 'printing cannot match glass-epoxy' },
      run: (G, t) => Math.abs(G.area) * t / 1000 / 12 * 60,   // minutes, at about 12 cm³ an hour
      kerf: () => 0, tol: () => 0.25,
      hole: () => [1, 2], web: () => [0.8, 1.6], slot: () => [0.5, 1], rIn: () => 0,
      note: 'Built up layer by layer in PETG, ABS or nylon (not the exact plastic chosen). Good for one to a few dozen prototypes; holes print slightly small.' }
  ];
  const PREC = [['General: about ±0.5 mm is fine', 0.5], ['Fits other parts: ±0.1 mm', 0.1], ['Precise: ±0.05 mm', 0.05], ['Very precise: ±0.02 mm', 0.02]];
  // standard stock thicknesses (mm)
  const STOCK = { metal: [0.5, 0.6, 0.8, 0.9, 1, 1.2, 1.5, 1.9, 2, 2.5, 2.7, 3, 3.18, 3.4, 4, 4.76, 5, 6, 6.35, 8, 9.53, 10, 12, 12.7, 15.88, 16, 19.05, 20, 25, 25.4, 30, 40, 50], plastic: [1, 1.5, 2, 3, 3.18, 4, 4.5, 5, 6, 6.35, 8, 9.53, 10, 12, 12.7, 15, 19.05, 20, 25, 25.4], wood: [3, 4, 5.2, 6, 6.35, 9, 12, 12.7, 15, 18, 19.05, 24] };
  STOCK.metal.sort((a, b) => a - b); STOCK.plastic.sort((a, b) => a - b); STOCK.wood.sort((a, b) => a - b);
  const GAUGE = [[0.6, '24 ga'], [0.9, '20 ga'], [1.2, '18 ga'], [1.5, '16 ga'], [1.9, '14 ga'], [2.7, '12 ga'], [3.0, '11 ga'], [3.4, '10 ga'], [4.8, '3/16″'], [6.35, '1/4″'], [9.5, '3/8″'], [12.7, '1/2″']];
  const SCREWS = [[2.4, 'M2'], [2.9, 'M2.5'], [3.4, 'M3'], [4.5, 'M4'], [5.5, 'M5'], [6.6, 'M6'], [9, 'M8'], [11, 'M10'], [13.5, 'M12'], [3.66, '#6'], [4.32, '#8'], [5.1, '#10'], [6.76, '1/4″'], [8.43, '5/16″'], [10.08, '3/8″']];
  const TAPS = [[1.6, 'M2'], [2.05, 'M2.5'], [2.5, 'M3'], [3.3, 'M4'], [4.2, 'M5'], [5, 'M6'], [6.8, 'M8'], [8.5, 'M10']];

  // all checks for one process and material: returns { ok, why, errs: [...], warns: [...], cost, tol }
  function judge(G, pr, m, s) {
    const t = s.t, R = { pr, issues: [] };
    const lim = pr.max[m.fam];
    if (lim == null) return Object.assign(R, { ok: false, why: pr.why[m.fam] || 'not used for this material' });
    if (t > lim) return Object.assign(R, { ok: false, why: f1(t) + ' mm is too thick (up to about ' + lim + ' mm in ' + m.n.split(' (')[0].toLowerCase() + ')' });
    if (pr.min && t < pr.min) return Object.assign(R, { ok: false, why: 'sheet under ' + pr.min + ' mm warps under the heat' });
    if (pr.id === 'print') { const B = G.box; if (Math.max(B[2] - B[0], B[3] - B[1]) > 300) return Object.assign(R, { ok: false, why: 'bigger than most printer beds (about 300 mm)' }); if (s.load === 2) return Object.assign(R, { ok: false, why: 'printed plastic is too weak for a structural part' }); }
    if (pr.minQty && s.qty < pr.minQty / 10) return Object.assign(R, { ok: false, why: 'only worth it from about ' + pr.minQty + ' parts' });
    if (pr.maxQty && s.qty > pr.maxQty * 4) return Object.assign(R, { ok: false, why: 'too slow for ' + s.qty + ' parts' });
    R.ok = true;
    const add = (sev, id, text, at, val) => R.issues.push({ sev, id, text, at, val });
    // holes
    const [hE, hW] = pr.hole(m, t);
    G.circles.forEach(c => { if (c.d < hE) add('fix', 'hole', 'Ø' + f1(c.d, 2) + ' hole is too small to cut (needs Ø' + f1(hE) + ' or more). Make it bigger, or drill it afterwards.', c.at, c.d); else if (c.d < hW) add('warn', 'hole', 'Ø' + f1(c.d, 2) + ' hole is smaller than Ø' + f1(hW) + ': it may come out undersize or rough. Cut it small and drill or ream it to size.', c.at, c.d); });
    // webs and slots
    const [wE, wW] = pr.web(m, t);
    G.webs.forEach(w => { if (w.d < wE) add('fix', 'web', f1(w.d, 2) + ' mm wide bridge of material: too thin, it will burn away, break or bend. Make it at least ' + f1(wE) + ' mm.', w.at, w.d); else if (w.d < wW) add('warn', 'web', f1(w.d, 2) + ' mm wide bridge: thin for this process (' + f1(wW) + ' mm or more is safer).', w.at, w.d); });
    const [sE, sW] = pr.slot(m, t);
    G.slots.forEach(w => { if (w.d < sE) add('fix', 'slot', f1(w.d, 2) + ' mm gap or slot: narrower than the cut itself. Widen it to at least ' + f1(sE) + ' mm.', w.at, w.d); else if (w.d < sW) add('warn', 'slot', f1(w.d, 2) + ' mm slot: narrow for this process (' + f1(sW) + ' mm or more is easier).', w.at, w.d); });
    // inside corners
    const rIn = pr.rIn(t);
    if (rIn >= 0.5) G.corners.forEach(c => { if (c.r < rIn - 1e-6) add('warn', 'corner', (c.r ? 'R' + f1(c.r, 2) + ' inside corner' : 'Sharp inside corner') + ': it will come out with a radius of about R' + f1(rIn, 2) + '. Draw the radius in, or add a dog-bone if a square part must fit into it.', c.at, c.r); });
    // bends
    if (s.bent && G.bends.length) {
      const need = 2.5 * t + t;
      G.holes.forEach(L => { let dmin = Infinity, at = null; L.pts.forEach(p => G.bends.forEach(b => { const d = segDist(p, b.p0, b.p1); if (d < dmin) { dmin = d; at = p; } })); if (dmin < need) add('warn', 'bend', 'Hole or cut-out ' + f1(dmin, 1) + ' mm from a bend line: it will stretch out of shape. Keep it ' + f1(need) + ' mm or more away.', at, dmin); });
    }
    // precision
    const tol = pr.tol(t), want = PREC[s.prec][1];
    if (tol > want * 1.2) add('warn', 'tol', pr.n + ' holds about ±' + f1(tol, 2) + ' mm. For ±' + want + ' mm, cut the part, then ream or machine the faces and holes that must fit.', null);
    // cost (rough, per part)
    const B = G.box, spc = 2 * (pr.kerf(t) || 0) + 3, bbA = (B[2] - B[0] + spc) * (B[3] - B[1] + spc);
    let runMin;
    if (pr.run) runMin = pr.run(G, t); else runMin = G.cutLen / pr.speed(m, t) + G.pierces * pr.pierce(t) / 60;
    if (G.markLen && pr.id !== 'print') runMin += G.markLen / (pr.speed ? pr.speed(m, Math.min(t, 1)) * 3 : 3000);
    const matCost = pr.id === 'print' ? Math.abs(G.area) * t / 1000 * 1.25 / 1000 * 25 : bbA * t / 1000 * m.rho / 1000 * m.kg * 1.25;
    let cost = (pr.setup * pr.rate / 60) / s.qty + (pr.tooling ? pr.tooling(G) / s.qty : 0) + runMin * pr.rate / 60 + matCost;
    if (tol > want * 1.2) cost += (pr.setup * 1.5 * 100 / 60) / s.qty + (G.circles.length * 0.6 + 2) * 100 / 60;
    if (s.bent) cost += (20 * 90 / 60) / s.qty + Math.max(1, G.bends.length) * 0.25 * 90 / 60;
    R.cost = cost; R.runMin = runMin; R.tol = tol;
    R.fix = R.issues.filter(i => i.sev === 'fix').length; R.warn = R.issues.filter(i => i.sev === 'warn').length; R.kinds = new Set(R.issues.filter(i => i.sev === 'warn').map(i => i.id)).size;
    return R;
  }
  const segDist = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2)); return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy); };
  // rank the processes: no must-fix problems first, then cheapest, with a small penalty for every warning
  function rank(G, m, s) {
    const all = PROC.map(pr => judge(G, pr, m, s));
    const sc = r => r.cost * (1 + 0.6 * new Set(r.issues.filter(i => i.sev === 'fix').map(i => i.id)).size + 0.12 * r.kinds);
    const ok = all.filter(r => r.ok).sort((a, b) => sc(a) - sc(b));
    return { ok, no: all.filter(r => !r.ok) };
  }
  // stresses for a load F (N): through the whole width and through the narrowest bridge
  function stress(G, s) {
    if (!(s.F > 0) || !G.main) return null;
    const wMin = G.webs.length ? Math.min(G.main.w, G.webs[0].d) : G.main.w;
    return { body: s.F / (G.main.w * s.t), web: s.F / (wMin * s.t), wMin };
  }
  // pick materials that meet the needs, cheapest made part first
  function suggest(G, s) {
    const need = k => { const m = MATS[k];
      if (s.env === 1 && !m.out) return 'not for outdoor or wet use';
      if (s.env === 2 && !m.food) return 'not food safe';
      if (s.env === 3 && !m.heat) return 'softens or burns when hot';
      if (s.load === 2 && m.ys < 150) return 'too weak for a structural part';
      if (s.load === 1 && m.ys < 25) return 'too weak to carry a load';
      if (s.bent && !m.bend) return 'cracks or snaps when bent';
      const st = stress(G, s); if (st && m.ys / st.body < 2) return 'not strong enough for the load at this thickness';
      return ''; };
    return Object.keys(MATS).map(k => { const why = need(k); if (why) return { k, why }; const r = rank(G, MATS[k], s); const b = r.ok.find(x => !x.fix) || r.ok[0]; return { k, why: b ? '' : 'no process suits it at this thickness', best: b }; })
      .filter(x => !x.why).sort((a, b) => (a.best.fix > 0) - (b.best.fix > 0) || a.best.cost - b.best.cost);
  }
  function finishes(m, s, pr) {
    const L = [], A = (n, d) => L.push([n, d]);
    if (isMetal(m)) A('Deburr the edges', pr && pr.id === 'plasma' ? 'Grind off the dross (the beads of re-set metal) under the cut.' : pr && pr.id === 'waterjet' ? 'Waterjet edges are frosted and slightly tapered; a quick tumble or sanding cleans them up.' : 'Tumble or file off the sharp edge and any dross under the cut.');
    switch (m.fam) {
      case 'steel': if (s.env === 1) A('Powder coat, or hot-dip galvanise', 'Bare steel rusts within days outside. Galvanising lasts longest; powder coat looks better.'); else if (s.look) A('Powder coat or paint', 'Gives colour and stops rust. Zinc plating is the cheaper, thinner option for hidden parts.'); else A('Zinc plating or oil', 'Keeps rust off indoors at little cost.'); if (s.env === 2) A('Change the material', 'Mild steel should not touch food: use stainless 304.'); break;
      case 'stainless': if (s.look) A('Brushed or bead-blasted finish', 'Hides scratches and laser marks.'); if (s.env === 2 || s.env === 1) A('Passivate', 'A mild acid bath that removes iron left on the surface by cutting, so it keeps its rust resistance.'); break;
      case 'al': A(s.look ? 'Anodise (clear or coloured)' : 'Leave as cut, or clear anodise', 'Anodising makes a hard, coloured skin that resists wear and corrosion. ' + (m.n.includes('6061') ? '6061 anodises evenly.' : '5052 anodises well but can look slightly uneven next to 6061.')); if (s.look) A('Bead blast before anodising', 'Gives the soft matte look of many consumer products.'); break;
      case 'brass': A(s.look ? 'Polish and clear lacquer' : 'Leave to darken', 'Brass tarnishes; lacquer keeps the shine, or let it darken to a patina.'); break;
      case 'ti': A('Tumble, or leave as cut', 'Titanium needs no coating. Anodising gives colours with no dye.'); break;
      case 'acrylic': A(pr && pr.id === 'laser' ? 'None needed' : 'Flame or buff polish the edges', pr && pr.id === 'laser' ? 'A laser leaves acrylic edges glossy. Keep the protective film on until assembly.' : 'Routed and waterjet edges are frosted; polishing makes them clear.'); break;
      case 'wood': case 'mdf': A('Sand the edges, then oil or varnish', pr && pr.id === 'laser' ? 'Laser edges are charred brown; sand if you want a clean edge.' : 'Routed edges can fuzz; a light sanding cleans them.'); if (m.fam === 'mdf') A('Seal the edges before painting', 'MDF edges soak up paint like a sponge.'); break;
      case 'g10': A('Sand the edges with a mask on', 'Glass-epoxy dust irritates skin and lungs; wet sanding keeps it down.'); break;
      default: A('Deburr the edges', 'Remove any whiskers left by cutting.');
    }
    if (s.env === 3 && !m.heat) A('Choose another material', m.n + ' softens or burns when hot.');
    return L;
  }
  function nearest(list, t) { const lo = list.filter(x => x <= t + 1e-6).pop(), hi = list.find(x => x >= t - 1e-6); return { std: (lo != null && Math.abs(lo - t) < 0.02) || (hi != null && Math.abs(hi - t) < 0.02), lo, hi }; }
  // how many fit on a 1220 × 2440 sheet (simple rows and columns, either way round)
  function nest(G, gap) {
    const B = G.box, w = B[2] - B[0] + gap, h = B[3] - B[1] + gap, SW = 1220, SH = 2440;
    const n = Math.max(Math.floor(SW / w) * Math.floor(SH / h), Math.floor(SW / h) * Math.floor(SH / w));
    return { n, use: n * Math.abs(G.area) / (SW * SH), fits: n > 0 };
  }

  /* =====================================================================================
     SAMPLE FILES (written as DXF text, so they go through the same parser as uploads)
     ===================================================================================== */
  function sampleBracket() {   // a motor plate with some typical problems, in mm
    const o = ['0', 'SECTION', '2', 'HEADER', '9', '$INSUNITS', '70', '4', '0', 'ENDSEC', '0', 'SECTION', '2', 'ENTITIES'];
    const ln = (a, b, c, d, lay = 'CUT') => o.push('0', 'LINE', '8', lay, '10', a, '20', b, '11', c, '21', d);
    const ci = (x, y, r) => o.push('0', 'CIRCLE', '8', 'CUT', '10', x, '20', y, '40', r);
    const lw = (V, closed) => { o.push('0', 'LWPOLYLINE', '8', 'CUT', '90', V.length, '70', closed ? 1 : 0); V.forEach(v => { o.push('10', v[0], '20', v[1]); if (v[2]) o.push('42', v[2]); }); };
    // outline: 120 × 80 with rounded outer corners (bulges), and a sharp U-notch in the bottom edge
    const b = Math.tan(Math.PI / 8);
    lw([[6, 0], [50, 0], [50, 14], [70, 14], [70, 0], [114, 0, b], [120, 6], [120, 74, b], [114, 80], [6, 80, b], [0, 74], [0, 6, b]], true);
    ci(60, 46, 11);                                  // motor boss hole
    [[49, 57], [71, 57], [49, 35], [71, 35]].forEach(p => ci(p[0], p[1], 1.25));   // M3 tapping holes (Ø2.5), close to the boss
    ci(8, 72, 1.7); ci(112, 72, 1.7); ci(8, 8, 1.7); ci(112, 8, 1.7);            // M3 clearance holes near the corners
    ci(104, 26, 0.75);                               // tiny 1.5 mm hole
    // a narrow slot, 1.2 mm wide, with round ends (an ARC each end)
    ln(20, 30, 36, 30); ln(20, 31.2, 36, 31.2);
    o.push('0', 'ARC', '8', 'CUT', '10', 36, '20', 30.6, '40', 0.6, '50', 270, '51', 90);
    o.push('0', 'ARC', '8', 'CUT', '10', 20, '20', 30.6, '40', 0.6, '50', 90, '51', 270);
    // a square window with sharp corners, placed so a thin bridge is left to the top edge
    lw([[88, 56], [104, 56], [104, 79], [88, 79]], true);
    ln(0, 17, 120, 17, 'BEND');
    o.push('0', 'TEXT', '8', 'NOTES', '10', 5, '20', 85, '40', 3, '1', 'MOTOR PLATE REV A', '0', 'ENDSEC', '0', 'EOF');
    return o.join('\n');
  }
  function sampleGusset() {    // a clean triangular gusset, in inches, made from a block INSERT (tests units and blocks)
    const o = ['0', 'SECTION', '2', 'HEADER', '9', '$INSUNITS', '70', '1', '0', 'ENDSEC',
      '0', 'SECTION', '2', 'BLOCKS', '0', 'BLOCK', '8', '0', '2', 'GUSSET', '70', '0', '10', '0', '20', '0'];
    const b = Math.tan(30 * Math.PI / 180 / 4 * 4) * 0;   // straight segments; the fillets are separate arcs below
    void b;
    o.push('0', 'LWPOLYLINE', '8', 'CUT', '90', 6, '70', 1,
      '10', 0.375, '20', 0, '10', 4.625, '20', 0, '42', Math.tan(135 * Math.PI / 180 / 4), '10', 4.7, '20', 0.53, '10', 0.53, '20', 4.7, '42', Math.tan(135 * Math.PI / 180 / 4), '10', 0, '20', 4.625, '10', 0, '20', 0.375, '42', Math.tan(Math.PI / 8));
    o.push('0', 'CIRCLE', '8', 'CUT', '10', 0.75, '20', 0.75, '40', 0.133, '0', 'CIRCLE', '8', 'CUT', '10', 3, '20', 0.75, '40', 0.133, '0', 'CIRCLE', '8', 'CUT', '10', 0.75, '20', 3, '40', 0.133);
    o.push('0', 'CIRCLE', '8', 'CUT', '10', 1.6, '20', 1.6, '40', 0.5);
    o.push('0', 'ENDBLK', '8', '0', '0', 'ENDSEC', '0', 'SECTION', '2', 'ENTITIES', '0', 'INSERT', '8', '0', '2', 'GUSSET', '10', 0, '20', 0, '0', 'ENDSEC', '0', 'EOF');
    return o.join('\n');
  }

  /* =====================================================================================
     PAGE
     ===================================================================================== */
  const $ = (r, q) => r.querySelector(q);
  MN.mount = function (app) {
    app.innerHTML = `
    <header class="phead"><nav class="crumbs" aria-label="Breadcrumb"><a href="../design.html">Design</a><span>/</span><span>Tool</span></nav>
      <div class="kicker">Design for manufacturing · Tool</div><h1 class="title">Check a DXF</h1>
      <p class="lede">Load a flat part drawing and see how it could be made, from the best option down: which process, which material and stock, what tolerances to ask for, which finish, and what to change in the drawing first.</p></header>
    <div class="dx-top">
      <section class="box dx-in">
        <h3>1 · Your drawing</h3>
        <label class="dx-drop" tabindex="0"><input type="file" accept=".dxf" hidden><b>Drop a .dxf file here</b><span>or click to choose one</span></label>
        <p class="dx-or">or try a sample: <button type="button" class="dx-link" data-sample="bracket">motor plate (mm)</button> · <button type="button" class="dx-link" data-sample="gusset">gusset (inches)</button></p>
        <p class="dx-priv">Your file stays on your computer: it is read by this page and never uploaded. For a 3D model, use <a href="stl-check.html">Check an STL</a>.</p>
        <h3>2 · What you need</h3>
        <div class="dx-form">
          <label>Units in the file <select data-k="units"><option value="auto">From the file</option><option value="1">mm</option><option value="25.4">inches</option><option value="10">cm</option></select></label>
          <label>Thickness <span class="dx-pair"><input type="number" data-k="t" min="0.2" max="200" step="0.1" value="3"><select data-k="tu"><option value="1">mm</option><option value="25.4">in</option></select></span></label>
          <label>Material <select data-k="mat"><option value="auto">Suggest one for me</option>${Object.entries(MATS).map(([k, m]) => `<option value="${k}">${m.n}</option>`).join('')}</select></label>
          <label>How many <input type="number" data-k="qty" min="1" max="1000000" step="1" value="10"></label>
          <label>Strength <select data-k="load"><option value="0">Doesn't matter (decorative, light duty)</option><option value="1">Carries a light load</option><option value="2">Structural: must be strong</option></select></label>
          <label>Load (optional) <span class="dx-pair"><input type="number" data-k="F" min="0" step="1" placeholder="N/A"><select data-k="Fu"><option value="1">N</option><option value="4.448">lbf</option></select></span></label>
          <label>Where it is used <select data-k="env"><option value="0">Indoors, dry</option><option value="1">Outdoors or wet</option><option value="2">Touches food</option><option value="3">Hot (over 80 °C)</option></select></label>
          <label>Tightest fit <select data-k="prec">${PREC.map((p, i) => `<option value="${i}">${p[0]}</option>`).join('')}</select></label>
          <label>Looks <select data-k="look"><option value="0">Hidden, looks don't matter</option><option value="1">Seen, should look good</option></select></label>
          <label>Bent after cutting <select data-k="bent"><option value="0">No, stays flat</option><option value="1">Yes (bend lines on a layer named BEND)</option></select></label>
        </div>
      </section>
      <section class="box dx-view"><h3>Preview <span class="dx-vtools"><button type="button" class="dx-link" data-fit>Fit</button></span></h3>
        <div class="dx-cv"><canvas aria-label="Drawing preview with the problems marked"></canvas><p class="dx-empty">Load a DXF or a sample to start.</p></div>
        <div class="dx-stats"></div></section>
    </div>
    <div class="dx-out" aria-live="polite"></div>
    <section class="box dx-about"><h3>How this works, and its limits</h3><ul class="rules">
      <li>The page joins the lines and arcs into outlines, works out which are holes, and measures inside corners, the narrowest bridges of material, the narrowest slots, every round hole, the cut length and the number of pierces.</li>
      <li>Each process has rules of thumb taken from shop and online service design guides (minimum hole, bridge and slot sizes, the cutter radius left in inside corners, thickness limits, typical tolerances). Costs are only compared between the options, using typical machine rates and cutting speeds; for a real price, ask a shop.</li>
      <li>It only sees the flat outline. It cannot know which faces must fit something, how the part is loaded, or features that are not in the drawing, such as threads, countersinks and pockets.</li>
      <li>The strength figure assumes the whole load is pulled through the part. Bending is usually far worse, so for anything that matters for safety, ask an engineer or run a proper stress analysis.</li>
      <li>Layers named BEND or FOLD are read as bend lines; layers named ENGRAVE, ETCH, MARK or SCORE as marking. Text is not cut: convert it to outlines first.</li></ul></section>`;
    const S = { file: null, name: '', doc: null, raw: null, G: null, sel: 0, hover: -1, view: null };
    const cv = $(app, 'canvas'), out = $(app, '.dx-out'), stats = $(app, '.dx-stats'), drop = $(app, '.dx-drop'), inp = $(app, 'input[type=file]');
    const val = k => { const el = $(app, `[data-k="${k}"]`); return el.value; };
    const settings = () => ({ units: val('units'), t: Math.max(0.1, (+val('t') || 3) * +val('tu')), mat: val('mat'), qty: Math.max(1, Math.round(+val('qty') || 1)), load: +val('load'), F: (+val('F') || 0) * +val('Fu'), env: +val('env'), prec: +val('prec'), look: +val('look'), bent: +val('bent') });
    function load(text, name) {
      try {
        SRC = 0; const doc = parse(text), c = collect(doc);
        if (!c.edges.length) throw new Error('No lines, arcs or circles were found in this file.');
        S.doc = doc; S.raw = c; S.name = name; S.view = null; S.G = null; run();
      } catch (e) { out.innerHTML = `<section class="box dx-err"><h3>Could not read the file</h3><p>${esc(e.message)}</p></section>`; S.G = null; draw(); }
    }
    function scaleFor(s) {
      if (s.units !== 'auto') return { k: +s.units, from: 'chosen' };
      const u = UNITS[S.doc.insunits]; if (u) return { k: u[1], from: 'file', name: u[0] };
      // no units in the file: guess from the size
      let m = 0; S.raw.edges.forEach(e => (e.k === 'C' ? [e.c] : [e.p0, e.p1]).forEach(p => m = Math.max(m, Math.abs(p[0]), Math.abs(p[1]))));
      return m < 24 && S.doc.measurement !== 1 ? { k: 25.4, from: 'guess', name: 'in' } : { k: 1, from: 'guess', name: 'mm' };
    }
    function run() {
      if (!S.raw) return;
      const s = settings(), sc = scaleFor(s);
      if (!S.G || S.gk !== sc.k || S.graw !== S.raw) { S.G = geometry(S.raw.edges, sc.k); S.gk = sc.k; S.graw = S.raw; }
      S.sc = sc; S.s = s;
      report();
      draw();
    }
    // ------- report -------
    function report() {
      const G = S.G, s = S.s, N = S.raw.notes;
      if (!G.loops.length && !G.open.length) { out.innerHTML = `<section class="box dx-err"><h3>Nothing to cut</h3><p>All the lines are on bend, marking or construction layers.</p></section>`; stats.innerHTML = ''; return; }
      const B = G.box, W = B[2] - B[0], H = B[3] - B[1];
      // the material: chosen, or the cheapest that meets the needs
      let mk = s.mat, sug = null;
      if (mk === 'auto') { sug = suggest(G, s); mk = sug.length ? sug[0].k : 'steel'; }
      const m = MATS[mk], R = rank(G, m, s);
      if (S.sel >= R.ok.length) S.sel = 0;
      S.R = R; S.m = m;
      const sel = R.ok[S.sel];
      S.marks = sel ? sel.issues.filter(i => i.at) : [];
      const fileIss = [];
      const F = (sev, text, at) => fileIss.push({ sev, text, at });
      if (S.sc.from === 'guess') F('warn', `The file does not say its units. It is read as <b>${S.sc.name === 'in' ? 'inches' : 'millimetres'}</b>, which makes the part ${f1(W)} × ${f1(H)} mm. If that is wrong, set the units above.`);
      G.gaps.forEach(g => F('fix', `Outline not closed: a gap of ${f1(g.d, 3)} mm. Most cutting software will not cut an open outline. Join the ends in your CAD program.`, g.at));
      if (G.open.length) F('warn', `${G.open.length} open line${G.open.length > 1 ? 's' : ''} that do${G.open.length > 1 ? '' : 'es'} not close into a shape (shown in colour). ${G.open.length > 1 ? 'They are' : 'It is'} cut as a slit only and nothing falls out, which is right for living-hinge slits. If ${G.open.length > 1 ? 'they' : 'it'} should be a hole, close ${G.open.length > 1 ? 'them' : 'it'}; if a mark, move ${G.open.length > 1 ? 'them' : 'it'} to an ENGRAVE layer.`, G.open[0][0].p0);
      if (G.dups) F('fix', `${G.dups} duplicate line${G.dups > 1 ? 's' : ''} on top of each other. The machine would cut them twice, burning the edge and costing time. Delete the copies (most CAD programs have an "overkill" or "remove duplicates" command).`, (G.issues.find(i => i.id === 'dup') || {}).at);
      if (G.issues.some(i => i.id === 'branch')) F('warn', 'Lines cross or more than two meet at a point. Check the outline is one clean loop.', G.issues.find(i => i.id === 'branch').at);
      if (G.tiny) F('warn', `${G.tiny} tiny line${G.tiny > 1 ? 's' : ''} (almost zero length) were ignored.`);
      if (N.text) F('warn', `${N.text} text item${N.text > 1 ? 's were' : ' was'} ignored. Text is not cut or engraved unless it is converted to outlines.`);
      if (N.curves) F('ok', `${N.curves} spline or ellipse curve${N.curves > 1 ? 's were' : ' was'} turned into short lines for checking. Some cutting software does the same; converting to arcs gives smoother cuts.`);
      if (N.mesh) F('warn', '3D objects in the file were ignored: this tool only reads flat outlines.');
      if (N.dims) F('ok', 'Dimensions were ignored. Most services want a DXF with only the cut lines in it.');
      if (G.parts.length > 1) F('ok', `${G.parts.length} separate parts in one file. They are checked together; prices assume they are made as a set.`);
      if (G.skipped.length) F('ok', `Lines on ${G.skipped.length > 1 ? 'the layers' : 'the layer'} ${G.skipped.map(x => esc(x)).join(', ')} were treated as notes or construction lines and not cut. If they should be cut, move them to another layer.`);
      if (G.marks.length) F('ok', `${G.marks.length} line${G.marks.length > 1 ? 's' : ''} on marking layers will be engraved, not cut.`);
      if (s.bent && !G.bends.length) F('warn', 'Bent parts: put the bend lines on a layer named BEND so holes too close to a bend can be found. Keep holes about 2.5 × the thickness plus the bend radius away from a bend.');
      if (s.bent && !m.bend) F('warn', `${m.n} tends to crack when bent. 5052 aluminium, mild steel and stainless bend well.`);
      if (G.widthSkipped) F('warn', 'The drawing is very detailed, so bridge and slot widths were not measured.');
      stats.innerHTML = `<span><small>Size</small>${f1(W)} × ${f1(H)} mm</span><span><small>Holes</small>${G.holes.length}</span><span><small>Cut length</small>${f1(G.cutLen / 1000, 2)} m</span><span><small>Pierces</small>${G.pierces}</span><span><small>Weight</small>${f1(Math.abs(G.area) * s.t / 1000 * m.rho, 1)} g</span>`;
      // strength
      const st = stress(G, s);
      // stock
      const fam = isMetal(m) ? 'metal' : (m.fam === 'wood' || m.fam === 'mdf') ? 'wood' : 'plastic', nt = nearest(STOCK[fam], s.t), gauge = isMetal(m) && fam === 'metal' ? GAUGE.find(g => Math.abs(g[0] - s.t) < 0.12) : null;
      const ns = nest(G, 2 * ((sel && sel.pr.kerf(s.t)) || 0) + 3);
      const flat = G.main && G.main.rect && G.main.l / G.main.w > 3 && isMetal(m);
      // holes: screw sizes
      const hs = {}; G.circles.forEach(c => { const k = f1(c.d, 2); hs[k] = (hs[k] || 0) + 1; });
      const holeRows = Object.entries(hs).sort((a, b) => +a[0] - +b[0]).map(([d, n]) => { d = +d; const near = (L, tl) => { const x = L.slice().sort((a, b) => Math.abs(a[0] - d) - Math.abs(b[0] - d))[0]; return x && Math.abs(x[0] - d) <= tl ? x : null; }; let cl = near(SCREWS, 0.12), tp = near(TAPS, 0.08); if (cl && tp) { if (Math.abs(tp[0] - d) <= Math.abs(cl[0] - d)) cl = null; else tp = null; }
        return `<tr><td>Ø${d}</td><td>${n}</td><td>${cl ? 'Clearance for ' + cl[1] + ' screws: ' + (s.prec ? 'ask for +0.1/0' : 'the cut size is fine') : tp ? 'Tapping size for ' + tp[1] + ': cut ' + (d < s.t ? 'or drill it, then tap' : 'then tap') : d < s.t * 0.8 ? 'Smaller than the thickness: drill afterwards' : s.prec ? 'If a pin fits here: cut 0.2 under and ream to size' : 'General'}</td></tr>`; }).join('');
      const fixes = sel ? sel.issues.filter(i => i.at || i.id === 'tol').slice().sort((a, b) => (a.val == null ? 0 : a.val) - (b.val == null ? 0 : b.val)) : [];
      const grp = {}; fixes.forEach((x, i) => { (grp[x.id + x.sev] = grp[x.id + x.sev] || []).push(Object.assign({ n: S.marks.indexOf(x) + 1 }, x)); });
      const cmin = Math.min(...R.ok.map(r => r.cost)), band = c => { const q = c / (cmin || 1); return q <= 1.3 ? 'Lowest cost' : q <= 2.5 ? 'Low cost' : q <= 6 ? 'Medium cost' : 'High cost'; };
      const LBL = ['Best fit', 'Good', 'Possible'];
      const procCard = (r, i) => `<button type="button" class="dx-proc${i === S.sel ? ' on' : ''}" data-sel="${i}" aria-pressed="${i === S.sel}">
          <span class="dx-rank">${r.fix ? 'Needs design changes' : LBL[Math.min(i, 2)]}</span><b>${r.pr.n}</b>
          <span class="dx-cost"><i>${band(r.cost)}</i> for ${s.qty} part${s.qty > 1 ? 's' : ''}</span>
          <span class="dx-meta">±${f1(r.tol, 2)} mm · ${r.fix ? r.fix + ' must-fix · ' : ''}${r.warn} to check</span></button>`;
      out.innerHTML = `
      ${fileIss.length ? `<section class="box dx-file"><h3>The file itself</h3><ul class="dx-list">${fileIss.map(x => `<li class="dx-${x.sev}">${x.text}</li>`).join('')}</ul></section>` : ''}
      <section class="sec dx-sec"><header class="sech"><span class="secn">01</span><div><h2>Ways to make it</h2><p>${m.n}, ${f1(s.t, 2)} mm thick, ${s.qty} part${s.qty > 1 ? 's' : ''}. Ranked from easiest and cheapest to make; the cost labels compare these options with each other. Pick one to see its fixes.</p></div></header>
        <div class="dx-procs">${R.ok.map(procCard).join('') || '<p>No process suits this material at this thickness. Try another material or thickness.</p>'}</div>
        ${R.no.length ? `<details class="dx-no"><summary>Not suited (${R.no.length})</summary><ul>${R.no.map(r => `<li><b>${r.pr.n}</b>: ${esc(r.why)}</li>`).join('')}</ul></details>` : ''}
        ${sel ? `<p class="dx-pnote">${sel.pr.note} <a href="${sel.pr.page}">More about it →</a></p>` : ''}</section>
      ${sel ? `<section class="sec dx-sec"><header class="sech"><span class="secn">02</span><div><h2>Change in the drawing</h2><p>For ${sel.pr.n.toLowerCase()}. The numbers match the marks on the preview; click one to zoom to it.</p></div></header>
        ${fixes.length ? `<ul class="dx-list">${Object.values(grp).map(L => `<li class="dx-${L[0].sev === 'fix' ? 'fix' : 'warn'}">${L[0].text}${L.length > 1 ? ` <span class="dx-more">${L.length} places${L.length > 1 && L[0].val != null && L[0].id !== 'corner' ? ', down to ' + f1(Math.min(...L.map(x => x.val)), 2) + ' mm' : ''}.</span>` : ''} ${L.filter(x => x.n > 0).slice(0, 12).map(x => `<button type="button" class="dx-pin" data-pin="${x.n - 1}">${x.n}</button>`).join('')}</li>`).join('')}</ul>` : '<p class="dx-good">Nothing to change for this process.</p>'}</section>` : ''}
      <section class="sec dx-sec"><header class="sech"><span class="secn">03</span><div><h2>Material and stock</h2><p>${s.mat === 'auto' ? 'Suggested from what you need. Change it above to compare.' : 'The material you chose.'}</p></div></header>
        <div class="dx-grid">
          <div class="box"><h3>Material</h3><p><b>${m.n}</b></p>${s.mat === 'auto' && sug && sug.length > 1 ? `<p class="dx-small">Also suitable, cheapest made part first: ${sug.slice(1, 5).map(x => MATS[x.k].n).join(', ')}.</p>` : ''}${s.mat === 'auto' && sug && !sug.length ? '<p class="dx-small dx-warnt">Nothing in the list meets every need; showing mild steel. Try a thicker part or relax a need.</p>' : ''}
            ${st ? `<p class="dx-small">Pulled with ${f1(s.F, 0)} N: about ${f1(st.body, 1)} MPa across the full width, up to ${f1(st.web, 1)} MPa if it all goes through the narrowest bridge (${f1(st.wMin, 2)} mm). ${m.n.split(' (')[0]} gives way at about ${m.ys} MPa: a safety factor of ${f1(m.ys / st.web, 1)} to ${f1(m.ys / st.body, 1)}. ${m.ys / st.web < 2 ? '<b class="dx-warnt">Thin for this load: widen the bridges, go thicker, or choose a stronger material.</b>' : ''}</p>` : s.load === 2 ? '<p class="dx-small">Enter the load to get a rough strength check.</p>' : ''}
            ${m.brittle && s.load ? '<p class="dx-small dx-warnt">Acrylic is brittle: it cracks from holes and sharp corners under load. Polycarbonate takes knocks far better.</p>' : ''}</div>
          <div class="box"><h3>Form of the stock</h3><p><b>${flat ? 'Flat bar, ' + f1(G.main.w) + ' mm wide, or sheet' : (s.t > 6 && isMetal(m) ? 'Plate' : 'Sheet')}</b>, ${f1(s.t, 2)} mm${gauge ? ' (' + gauge[1] + ')' : ''}</p>
            <p class="dx-small">${nt.std ? 'A standard stock thickness.' : `${f1(s.t, 2)} mm is not a usual stock size: the nearest are ${[nt.lo, nt.hi].filter(x => x != null).map(x => f1(x, 2)).join(' and ')} mm. Odd sizes cost more and take longer to get.`}</p>
            <p class="dx-small">${ns.fits ? `About ${ns.n} fit on a 1220 × 2440 mm (4 × 8 ft) sheet, using ${Math.round(ns.use * 100)} % of it.` : 'Bigger than a standard 1220 × 2440 mm sheet: it would need a larger plate or splitting into pieces.'}${flat ? ' As a plain rectangle, it can also be cut from flat bar, so only the holes and ends need cutting.' : ''}</p></div>
        </div></section>
      <section class="sec dx-sec"><header class="sech"><span class="secn">04</span><div><h2>Tolerances to ask for</h2><p>Tight tolerances cost money, so ask for them only where a part has to fit.</p></div></header>
        <div class="dx-grid"><div class="box"><h3>General</h3><p class="dx-small">${sel ? `${sel.pr.n} holds about <b>±${f1(sel.tol, 2)} mm</b>. ` : ''}Note "general tolerance ISO 2768-m" on the drawing (about ±0.1 to ±0.3 mm for these sizes) and give tighter limits only on the features that fit other parts.${s.prec && sel && sel.tol > PREC[s.prec][1] * 1.2 ? ` For ${PREC[s.prec][0].toLowerCase()} fits, cut first and then machine or ream those features.` : ''}</p></div>
          <div class="box"><h3>Holes</h3>${holeRows ? `<div class="tablewrap"><table class="btable"><thead><tr><th>Size</th><th>How many</th><th>What it looks like, and what to ask for</th></tr></thead><tbody>${holeRows}</tbody></table></div>` : '<p class="dx-small">No round holes.</p>'}</div></div></section>
      <section class="sec dx-sec"><header class="sech"><span class="secn">05</span><div><h2>Finishing</h2><p>Secondary steps after cutting. Each one adds cost and time, so choose them for a reason.</p></div></header>
        <ul class="dx-list">${finishes(m, s, sel && sel.pr).map(([n, d]) => `<li class="dx-ok"><b>${n}.</b> ${d}</li>`).join('')}</ul></section>`;
    }
    // ------- preview -------
    const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
    function fit() {
      const G = S.G; if (!G || !G.box) return;
      const r = cv.getBoundingClientRect(), B = G.box, pad = 28, w = Math.max(1, B[2] - B[0]), h = Math.max(1, B[3] - B[1]);
      const k = Math.min((r.width - 2 * pad) / w, (r.height - 2 * pad) / h);
      S.view = { k, x: r.width / 2 - (B[0] + w / 2) * k, y: r.height / 2 + (B[1] + h / 2) * k };
    }
    function draw() {
      const r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
      cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
      const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, r.width, r.height);
      $(app, '.dx-empty').hidden = !!S.G;
      const G = S.G; if (!G || !G.box) return;
      if (!S.view) fit();
      const V = S.view, X = p => [V.x + p[0] * V.k, V.y - p[1] * V.k], ink = css('--ink'), red = css('--red'), faint = css('--faint'), warn = css('--warnc');
      // material, filled with even-odd so the holes show
      g.beginPath(); G.loops.forEach(L => L.pts.forEach((p, i) => { const q = X(p); i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); }) || g.closePath());
      g.globalAlpha = 0.14; g.fillStyle = ink; g.fill('evenodd'); g.globalAlpha = 1;
      g.lineWidth = 1.4; g.strokeStyle = ink; g.lineJoin = 'round';
      G.loops.forEach(L => { g.beginPath(); L.pts.forEach((p, i) => { const q = X(p); i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); }); g.closePath(); g.stroke(); });
      g.strokeStyle = warn; g.lineWidth = 2;
      G.open.forEach(c => { g.beginPath(); c.forEach((e, k) => sampleEdge(e).forEach((p, j) => { const q = X(p); (j || k) ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); })); g.stroke(); });
      g.setLineDash([6, 4]); g.lineWidth = 1; g.strokeStyle = faint;
      G.bends.forEach(e => { const a = X(e.p0), b = X(e.p1); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); });
      g.setLineDash([2, 3]); G.marks.forEach(e => { g.beginPath(); sampleEdge(e).forEach((p, j) => { const q = X(p); j ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); }); g.stroke(); });
      g.setLineDash([]);
      // gaps
      G.gaps.forEach(gp => { const q = X(gp.at); g.strokeStyle = warn; g.lineWidth = 2; g.beginPath(); g.arc(q[0], q[1], 10, 0, TAU); g.stroke(); });
      // the problem marks for the chosen process
      g.font = '600 10px ' + css('--mono'); g.textAlign = 'center'; g.textBaseline = 'middle';
      (S.marks || []).forEach((x, i) => {
        const q = X(x.at), on = i === S.hover, col = x.sev === 'fix' ? warn : red;
        if (x.id === 'web' || x.id === 'slot') { const w = G[x.id === 'web' ? 'webs' : 'slots'].find(z => z.at === x.at); if (w) { const a = X(w.p), b = X(w.q); g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); } }
        g.fillStyle = col; g.beginPath(); g.arc(q[0], q[1] - 14, on ? 11 : 8, 0, TAU); g.fill();
        g.strokeStyle = col; g.lineWidth = 1; g.beginPath(); g.moveTo(q[0], q[1] - 6); g.lineTo(q[0], q[1]); g.stroke();
        g.fillStyle = css('--onink'); g.fillText(String(i + 1), q[0], q[1] - 14);
      });
      // overall size
      const B = G.box, a = X([B[0], B[1]]), b = X([B[2], B[3]]);
      g.fillStyle = faint; g.font = '11px ' + css('--mono'); g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillText(f1(B[2] - B[0]) + ' × ' + f1(B[3] - B[1]) + ' mm' + (S.name ? '  ·  ' + S.name : ''), 10, r.height - 10);
      void a; void b;
    }
    // ------- events -------
    const readFile = f => { if (!f) return; if (!/\.dxf$/i.test(f.name)) { out.innerHTML = `<section class="box dx-err"><h3>That is not a DXF</h3><p>Choose a .dxf file. From most CAD programs: File → Export (or Save As) → DXF, flat (2D) drawing.</p></section>`; return; } if (f.size > 30e6) { out.innerHTML = `<section class="box dx-err"><h3>File too big</h3><p>Files over 30 MB are too large to check here.</p></section>`; return; } const rd = new FileReader(); rd.onload = () => load(String(rd.result), f.name); rd.readAsText(f); };
    inp.addEventListener('change', () => readFile(inp.files[0]));
    drop.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inp.click(); } });
    ['dragenter', 'dragover'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add('over'); }));
    ['dragleave', 'drop'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.remove('over'); }));
    drop.addEventListener('drop', e => readFile(e.dataTransfer.files[0]));
    app.addEventListener('click', e => {
      const sm = e.target.closest('[data-sample]'); if (sm) { const k = sm.dataset.sample; const set = (k2, v) => $(app, `[data-k=${k2}]`).value = v; set('units', 'auto'); set('bent', 0); set('prec', 0); set('F', ''); set('env', 0); if (k === 'bracket') { set('t', 3); set('tu', 1); set('mat', 'al5052'); set('load', 1); set('qty', 10); } else { set('t', 0.25); set('tu', 25.4); set('mat', 'steel'); set('load', 2); set('qty', 50); } S.sel = 0; load(k === 'bracket' ? sampleBracket() : sampleGusset(), k === 'bracket' ? 'motor-plate.dxf' : 'gusset.dxf'); return; }
      const ps = e.target.closest('[data-sel]'); if (ps) { S.sel = +ps.dataset.sel; report(); draw(); return; }
      const pin = e.target.closest('[data-pin]'); if (pin) { const x = S.marks[+pin.dataset.pin]; if (!x) return; const r = cv.getBoundingClientRect(), k = Math.max(S.view.k, Math.min(r.width, r.height) / 40); S.view = { k, x: r.width / 2 - x.at[0] * k, y: r.height / 2 + x.at[1] * k }; S.hover = +pin.dataset.pin; draw(); cv.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); return; }
      if (e.target.closest('[data-fit]')) { S.view = null; S.hover = -1; draw(); }
    });
    app.addEventListener('change', e => { if (e.target.closest('[data-k]')) { if (e.target.dataset.k === 'units') S.view = null; run(); } });
    app.addEventListener('input', e => { if (e.target.matches('input[type=number][data-k]')) { clearTimeout(S.tm); S.tm = setTimeout(run, 350); } });
    // zoom with the wheel or a pinch, pan by dragging
    cv.addEventListener('wheel', e => { if (!S.G) return; e.preventDefault(); const r = cv.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top, f = Math.exp(-e.deltaY * 0.0015), V = S.view; V.x = mx - (mx - V.x) * f; V.y = my - (my - V.y) * f; V.k *= f; draw(); }, { passive: false });
    const pts = new Map(); let pinch = null;
    cv.addEventListener('pointerdown', e => { if (!S.G) return; cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), k: S.view.k }; } });
    cv.addEventListener('pointermove', e => {
      if (!S.G) return; const r = cv.getBoundingClientRect();
      if (pts.has(e.pointerId)) { const p = pts.get(e.pointerId), V = S.view;
        if (pts.size === 1) { V.x += e.clientX - p[0]; V.y += e.clientY - p[1]; }
        pts.set(e.pointerId, [e.clientX, e.clientY]);
        if (pts.size === 2 && pinch) { const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]), mx = (a[0] + b[0]) / 2 - r.left, my = (a[1] + b[1]) / 2 - r.top, f = pinch.k * d / pinch.d / V.k; V.x = mx - (mx - V.x) * f; V.y = my - (my - V.y) * f; V.k *= f; }
        draw(); return; }
      // hover a mark
      const mx = e.clientX - r.left, my = e.clientY - r.top, V = S.view; let h = -1;
      (S.marks || []).forEach((x, i) => { const q = [V.x + x.at[0] * V.k, V.y - x.at[1] * V.k - 14]; if (Math.hypot(q[0] - mx, q[1] - my) < 10) h = i; });
      if (h !== S.hover) { S.hover = h; draw(); cv.title = h >= 0 ? S.marks[h].text : ''; }
    });
    ['pointerup', 'pointercancel'].forEach(t => cv.addEventListener(t, e => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; }));
    let rw = 0; new ResizeObserver(() => { const w = cv.getBoundingClientRect().width; if (Math.abs(w - rw) > 1) { rw = w; S.view = null; draw(); } }).observe(cv);
    MN._state = S;   // for tests
  };
  Object.assign(MN, { PROC, PREC, STOCK, GAUGE, SCREWS, TAPS, finishes, nearest, isMetal, stress, judge, f1, esc, segDist });
  MN.parse = parse; MN.collect = collect; MN.geometry = geometry; MN.rank = rank; MN.suggest = suggest; MN.MATS = MATS; MN.samples = { bracket: sampleBracket, gusset: sampleGusset };
})();
