/* STL manufacturability check (Design room tool). Needs js/dfm-check.js (materials, flat-part processes, finishing).
   Everything runs in the browser: the file is read with FileReader and never sent anywhere.
   1. read: binary or text STL -> triangles; join shared corners into one mesh; check it is closed and the right way out
   2. measure: size, volume, area, through holes (from the mesh topology), hole sizes (by slicing), wall thickness (rays),
      overhangs (printing), undercuts and draft (moulding), which faces a cutter can reach (milling), and the kind of part:
      a flat profile (cut from sheet), a turned part, a thin shell (sheet metal) or a free 3D shape
   3. judge: rank the ways to make it for a material, quantity and needs, and list what to change
   Rough rules of thumb for comparing options, not quotes. */
(function () {
  const D = window.MN_DFM, MN = window.MN_STL = {};
  const { f1, esc } = D, TAU = Math.PI * 2;
  const AX = ['X', 'Y', 'Z'];

  /* =====================================================================================
     1. READ
     ===================================================================================== */
  function readSTL(buf) {
    const dv = new DataView(buf), n = buf.byteLength >= 84 ? dv.getUint32(80, true) : 0;
    if (buf.byteLength >= 84 && 84 + n * 50 === buf.byteLength) {
      const T = new Float32Array(n * 9);
      for (let i = 0; i < n; i++) { const o = 84 + i * 50 + 12; for (let k = 0; k < 9; k++) T[i * 9 + k] = dv.getFloat32(o + k * 4, true); }
      return T;
    }
    const text = new TextDecoder().decode(new Uint8Array(buf, 0, Math.min(buf.byteLength, 200e6)));
    if (!/^\s*solid/i.test(text) || !/facet/i.test(text)) throw new Error('This does not look like an STL file.');
    const re = /vertex\s+([-+0-9.eE]+)\s+([-+0-9.eE]+)\s+([-+0-9.eE]+)/g, P = []; let m;
    while ((m = re.exec(text))) P.push(+m[1], +m[2], +m[3]);
    if (P.length % 9 || !P.length) throw new Error('The STL text could not be read.');
    return Float32Array.from(P);
  }
  function toSTL(T) {   // binary STL from triangles (for the samples)
    const n = T.length / 9, buf = new ArrayBuffer(84 + n * 50), dv = new DataView(buf);
    dv.setUint32(80, n, true);
    for (let i = 0; i < n; i++) { const o = 84 + i * 50; for (let k = 0; k < 9; k++) dv.setFloat32(o + 12 + k * 4, T[i * 9 + k], true); }
    return buf;
  }

  /* =====================================================================================
     2. MESH: weld, check, normals, bounding volume tree for ray casting
     ===================================================================================== */
  function mesh(T, scale) {
    const n0 = T.length / 9;
    let lo = [1e18, 1e18, 1e18], hi = [-1e18, -1e18, -1e18];
    for (let i = 0; i < T.length; i += 3) for (let k = 0; k < 3; k++) { const v = T[i + k] * scale; if (v < lo[k]) lo[k] = v; if (v > hi[k]) hi[k] = v; }
    const diag = Math.hypot(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) || 1, q = Math.max(1e-7, diag * 1e-6);
    const map = new Map(), Vs = [], F = [];
    let degen = 0;
    const vid = (x, y, z) => { const k = Math.round(x / q) + ',' + Math.round(y / q) + ',' + Math.round(z / q); let id = map.get(k); if (id === undefined) { id = Vs.length / 3; Vs.push(x, y, z); map.set(k, id); } return id; };
    for (let i = 0; i < n0; i++) {
      const a = vid(T[i * 9] * scale, T[i * 9 + 1] * scale, T[i * 9 + 2] * scale), b = vid(T[i * 9 + 3] * scale, T[i * 9 + 4] * scale, T[i * 9 + 5] * scale), c = vid(T[i * 9 + 6] * scale, T[i * 9 + 7] * scale, T[i * 9 + 8] * scale);
      if (a === b || b === c || a === c) { degen++; continue; }
      F.push(a, b, c);
    }
    const V = Float64Array.from(Vs), nf = F.length / 3, nv = V.length / 3;
    const M = { V, F: Uint32Array.from(F), nf, nv, lo, hi, diag, degen, n0 };
    topology(M); faces(M); bvh(M);
    return M;
  }
  // edges: open edges (holes in the mesh), edges shared by more than two faces, faces turned the wrong way; shells; through holes
  function topology(M) {
    const { F, nf, nv } = M, E = new Map(), par = new Int32Array(nf).map((_, i) => i);
    const find = x => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
    for (let f = 0; f < nf; f++) for (let k = 0; k < 3; k++) {
      const a = F[f * 3 + k], b = F[f * 3 + (k + 1) % 3], key = a < b ? a * nv + b : b * nv + a;
      let e = E.get(key); if (!e) { e = [0, 0, f]; E.set(key, e); }
      e[0]++; e[1] += a < b ? 1 : -1;
      const r1 = find(f), r2 = find(e[2]); if (r1 !== r2) par[r1] = r2;
    }
    let open = 0, multi = 0, flip = 0; const openPts = [];
    E.forEach((e, key) => { if (e[0] === 1) { open++; if (openPts.length < 40) openPts.push(Math.floor(key / nv)); } else if (e[0] > 2) multi++; else if (e[1] !== 0) flip++; });
    // shells
    const shellOf = new Int32Array(nf), roots = new Map();
    for (let f = 0; f < nf; f++) { const r = find(f); if (!roots.has(r)) roots.set(r, roots.size); shellOf[f] = roots.get(r); }
    const S = Array.from({ length: roots.size }, () => ({ f: 0, v: new Set(), e: 0, vol: 0 }));
    for (let f = 0; f < nf; f++) { const s = S[shellOf[f]]; s.f++; for (let k = 0; k < 3; k++) s.v.add(F[f * 3 + k]); }
    E.forEach(e => S[shellOf[e[2]]].e++);
    Object.assign(M, { open, multi, flip, openPts, shellOf, shells: S, watertight: open === 0 && multi === 0 });
  }
  function faces(M) {
    const { V, F, nf, shellOf, shells } = M, N = new Float64Array(nf * 3), A = new Float64Array(nf), C = new Float64Array(nf * 3);
    let vol = 0, area = 0;
    for (let f = 0; f < nf; f++) {
      const a = F[f * 3] * 3, b = F[f * 3 + 1] * 3, c = F[f * 3 + 2] * 3;
      const ux = V[b] - V[a], uy = V[b + 1] - V[a + 1], uz = V[b + 2] - V[a + 2], wx = V[c] - V[a], wy = V[c + 1] - V[a + 1], wz = V[c + 2] - V[a + 2];
      let nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx; const l = Math.hypot(nx, ny, nz) || 1;
      A[f] = l / 2; area += l / 2; N[f * 3] = nx / l; N[f * 3 + 1] = ny / l; N[f * 3 + 2] = nz / l;
      C[f * 3] = (V[a] + V[b] + V[c]) / 3; C[f * 3 + 1] = (V[a + 1] + V[b + 1] + V[c + 1]) / 3; C[f * 3 + 2] = (V[a + 2] + V[b + 2] + V[c + 2]) / 3;
      const dv = (V[a] * (V[b + 1] * V[c + 2] - V[b + 2] * V[c + 1]) - V[a + 1] * (V[b] * V[c + 2] - V[b + 2] * V[c]) + V[a + 2] * (V[b] * V[c + 1] - V[b + 1] * V[c])) / 6;
      vol += dv; shells[shellOf[f]].vol += dv;
    }
    M.inverted = vol < 0;
    if (M.inverted) { for (let f = 0; f < nf; f++) { const t = M.F[f * 3 + 1]; M.F[f * 3 + 1] = M.F[f * 3 + 2]; M.F[f * 3 + 2] = t; N[f * 3] *= -1; N[f * 3 + 1] *= -1; N[f * 3 + 2] *= -1; } vol = -vol; shells.forEach(s => s.vol = -s.vol); }
    // a shell that encloses negative volume while the whole is positive is an empty space sealed inside the part
    M.voids = shells.filter(s => s.vol < 0).length;
    M.holes = M.watertight ? shells.reduce((t, s) => t + Math.max(0, Math.round((2 - (s.v.size - s.e + s.f)) / 2)), 0) : null;
    Object.assign(M, { N, A, C, vol, area });
  }
  // bounding volume tree (median split) and ray casting (Möller–Trumbore)
  function bvh(M) {
    const { V, F, nf, C } = M, idx = new Uint32Array(nf).map((_, i) => i), nodes = [];
    const box = (s, e) => { const b = [1e18, 1e18, 1e18, -1e18, -1e18, -1e18]; for (let i = s; i < e; i++) { const f = idx[i]; for (let k = 0; k < 3; k++) { const v = F[f * 3 + k] * 3; for (let j = 0; j < 3; j++) { const x = V[v + j]; if (x < b[j]) b[j] = x; if (x > b[3 + j]) b[3 + j] = x; } } } return b; };
    const build = (s, e) => {
      const id = nodes.length, b = box(s, e); nodes.push({ b, s, e, l: -1, r: -1 });
      if (e - s <= 6) return id;
      const ax = [0, 1, 2].reduce((m, j) => (b[3 + j] - b[j] > b[3 + m] - b[m] ? j : m), 0);
      const part = idx.subarray(s, e); const arr = Array.from(part).sort((x, y) => C[x * 3 + ax] - C[y * 3 + ax]); part.set(arr);
      const mid = (s + e) >> 1; nodes[id].l = build(s, mid); nodes[id].r = build(mid, e); return id;
    };
    build(0, nf);
    M.tree = { nodes, idx };
  }
  // nearest hit along o + t·d for t in (tmin, tmax); returns t or Infinity
  function ray(M, o, d, tmin, tmax, skip) {
    const { V, F } = M, { nodes, idx } = M.tree, inv = [1 / d[0], 1 / d[1], 1 / d[2]], st = [0]; let best = tmax;
    while (st.length) {
      const nd = nodes[st.pop()], b = nd.b;
      let t0 = tmin, t1 = best;
      for (let j = 0; j < 3; j++) { let a = (b[j] - o[j]) * inv[j], c = (b[3 + j] - o[j]) * inv[j]; if (a > c) { const x = a; a = c; c = x; } if (a > t0) t0 = a; if (c < t1) t1 = c; if (t0 > t1) break; }
      if (t0 > t1) continue;
      if (nd.l < 0) {
        for (let i = nd.s; i < nd.e; i++) {
          const f = idx[i]; if (f === skip) continue;
          const a = F[f * 3] * 3, b2 = F[f * 3 + 1] * 3, c = F[f * 3 + 2] * 3;
          const e1x = V[b2] - V[a], e1y = V[b2 + 1] - V[a + 1], e1z = V[b2 + 2] - V[a + 2], e2x = V[c] - V[a], e2y = V[c + 1] - V[a + 1], e2z = V[c + 2] - V[a + 2];
          const px = d[1] * e2z - d[2] * e2y, py = d[2] * e2x - d[0] * e2z, pz = d[0] * e2y - d[1] * e2x, det = e1x * px + e1y * py + e1z * pz;
          if (Math.abs(det) < 1e-14) continue;
          const id = 1 / det, tx = o[0] - V[a], ty = o[1] - V[a + 1], tz = o[2] - V[a + 2], u = (tx * px + ty * py + tz * pz) * id; if (u < -1e-9 || u > 1 + 1e-9) continue;
          const qx = ty * e1z - tz * e1y, qy = tz * e1x - tx * e1z, qz = tx * e1y - ty * e1x, v = (d[0] * qx + d[1] * qy + d[2] * qz) * id; if (v < -1e-9 || u + v > 1 + 1e-9) continue;
          const t = (e2x * qx + e2y * qy + e2z * qz) * id; if (t > tmin && t < best) best = t;
        }
      } else { st.push(nd.l, nd.r); }
    }
    return best < tmax ? best : Infinity;
  }

  /* =====================================================================================
     3. MEASURE
     ===================================================================================== */
  const DIRS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]], DNAME = ['+X', '−X', '+Y', '−Y', '+Z', '−Z'];
  // which faces to cast rays from: all of them for small meshes, an even spread for big ones
  const pickFaces = (M, cap) => { const k = Math.max(1, Math.ceil(M.nf / cap)), L = []; for (let f = 0; f < M.nf; f += k) L.push(f); return L; };
  function measure(M) {
    const { N, C, A, nf, diag } = M, eps = diag * 2e-5;
    const R = { eps };
    // wall thickness (ray straight in from each face) and the gap in front of it (ray straight out)
    const set = pickFaces(M, 40000), thick = new Float32Array(nf).fill(NaN), gap = new Float32Array(nf).fill(NaN);
    set.forEach(f => {
      const n = [N[f * 3], N[f * 3 + 1], N[f * 3 + 2]], c = [C[f * 3], C[f * 3 + 1], C[f * 3 + 2]];
      thick[f] = ray(M, [c[0] - n[0] * eps, c[1] - n[1] * eps, c[2] - n[2] * eps], [-n[0], -n[1], -n[2]], 0, diag * 2, f);
      gap[f] = ray(M, [c[0] + n[0] * eps, c[1] + n[1] * eps, c[2] + n[2] * eps], n, 0, diag * 2, f);
    });
    R.thick = thick; R.gap = gap;
    const T = set.map(f => [thick[f], A[f]]).filter(x => isFinite(x[0])).sort((a, b) => a[0] - b[0]);
    const tot = T.reduce((s, x) => s + x[1], 0); let acc = 0; R.tMed = 0; R.tMin = T.length ? T[0][0] : 0;
    for (const [t, a] of T) { acc += a; if (acc >= tot / 2) { R.tMed = t; break; } }
    // most of the faces at about the same thickness = a shell, like bent sheet or a moulded case
    R.shellFrac = tot ? T.filter(x => Math.abs(x[0] - R.tMed) <= R.tMed * 0.15).reduce((s, x) => s + x[1], 0) / tot : 0;
    let p95 = 0; acc = 0; for (const [t, a] of T) { acc += a; if (acc >= tot * 0.95) { p95 = t; break; } } R.tMax = p95;
    // overhangs: for each of the six ways up, the area facing down more steeply than 45°, off the bed
    R.over = DIRS.map((u, k) => {
      let bed = 1e18; for (let i = 0; i < M.nv; i++) bed = Math.min(bed, M.V[i * 3] * u[0] + M.V[i * 3 + 1] * u[1] + M.V[i * 3 + 2] * u[2]);
      let area = 0, flat = 0, top = -1e18; const fl = new Uint8Array(nf);
      for (let f = 0; f < nf; f++) {
        const d = N[f * 3] * u[0] + N[f * 3 + 1] * u[1] + N[f * 3 + 2] * u[2];
        let mn = 1e18; for (let j = 0; j < 3; j++) { const v = M.F[f * 3 + j] * 3, h = M.V[v] * u[0] + M.V[v + 1] * u[1] + M.V[v + 2] * u[2]; if (h < mn) mn = h; if (h > top) top = h; }
        if (d < -0.999 && mn - bed < 0.05) { flat += A[f]; fl[f] = 2; }
        else if (d < -0.7071 && mn - bed > 0.3) { area += A[f]; fl[f] = 1; }
      }
      return { k, area, flat, h: top - bed, fl };
    });
    R.up = R.over.slice().sort((a, b) => (a.area - b.area) || (b.flat - a.flat) || (a.h - b.h))[0];
    // undercuts and draft: for each axis as the mould's opening direction
    const sample = pickFaces(M, 25000);
    R.mould = [0, 1, 2].map(ax => {
      const d = [0, 0, 0]; d[ax] = 1; const md = [-d[0], -d[1], -d[2]], fl = new Uint8Array(nf); let under = 0, nodraft = 0, seen = 0;
      sample.forEach(f => {
        const n = N[f * 3 + ax], c = [C[f * 3] + N[f * 3] * M.diag * 1e-4, C[f * 3 + 1] + N[f * 3 + 1] * M.diag * 1e-4, C[f * 3 + 2] + N[f * 3 + 2] * M.diag * 1e-4]; seen += A[f];
        if (Math.abs(n) < 0.0175) { nodraft += A[f]; fl[f] = 2; return; }
        if (isFinite(ray(M, c, n > 0 ? d : md, 0, diag * 2, f))) { under += A[f]; fl[f] = 1; }
      });
      return { ax, under: under / (seen || 1), nodraft: nodraft / (seen || 1), fl };
    });
    R.pull = R.mould.slice().sort((a, b) => (a.under - b.under) || (a.nodraft - b.nodraft))[0];
    // milling: which faces each of the six tool directions can see; the fewest directions that see the most
    const reach = DIRS.map(d => { const ok = new Uint8Array(nf); sample.forEach(f => { const dn = N[f * 3] * d[0] + N[f * 3 + 1] * d[1] + N[f * 3 + 2] * d[2]; if (dn < -0.02) return; const c = [C[f * 3] + N[f * 3] * M.diag * 1e-4, C[f * 3 + 1] + N[f * 3 + 1] * M.diag * 1e-4, C[f * 3 + 2] + N[f * 3 + 2] * M.diag * 1e-4]; if (!isFinite(ray(M, c, d, 0, diag * 2, f))) ok[f] = 1; }); return ok; });
    const left = new Set(sample), setups = [];
    while (left.size && setups.length < 6) {
      let best = -1, bestA = 0; reach.forEach((ok, k) => { if (setups.includes(k)) return; let a = 0; left.forEach(f => { if (ok[f]) a += A[f]; }); if (a > bestA) { bestA = a; best = k; } });
      if (best < 0 || bestA < M.area * 1e-4) break;
      setups.push(best); [...left].forEach(f => { if (reach[best][f]) left.delete(f); });
    }
    const hidden = new Uint8Array(nf); let hidA = 0, sA = 0; sample.forEach(f => { sA += A[f]; }); left.forEach(f => { hidden[f] = 1; hidA += A[f]; });
    R.setups = setups; R.hidden = hidden; R.hiddenFrac = hidA / (sA || 1);
    return R;
  }

  /* slices: cut the mesh with a plane square to an axis, get closed outlines in that plane */
  const UV = [[1, 2], [2, 0], [0, 1]];
  function slice(M, ax, h) {
    const { V, F, nf, nv } = M, [iu, iv] = UV[ax], pts = new Map(), adj = new Map();
    const P = (a, b) => { const key = a < b ? a * nv + b : b * nv + a; let p = pts.get(key); if (!p) { const da = V[a * 3 + ax] - h, db = V[b * 3 + ax] - h, t = da / (da - db); p = [V[a * 3 + iu] + (V[b * 3 + iu] - V[a * 3 + iu]) * t, V[a * 3 + iv] + (V[b * 3 + iv] - V[a * 3 + iv]) * t]; pts.set(key, p); } return key; };
    const link = (x, y) => { (adj.get(x) || adj.set(x, []).get(x)).push(y); (adj.get(y) || adj.set(y, []).get(y)).push(x); };
    for (let f = 0; f < nf; f++) {
      const a = F[f * 3], b = F[f * 3 + 1], c = F[f * 3 + 2], sa = V[a * 3 + ax] > h, sb = V[b * 3 + ax] > h, sc = V[c * 3 + ax] > h;
      if (sa === sb && sb === sc) continue;
      const E = []; if (sa !== sb) E.push(P(a, b)); if (sb !== sc) E.push(P(b, c)); if (sc !== sa) E.push(P(c, a));
      if (E.length === 2) link(E[0], E[1]);
    }
    const done = new Set(), loops = [];
    adj.forEach((_, s) => {
      if (done.has(s)) return; const L = []; let cur = s, prev = null;
      while (cur != null && !done.has(cur)) { done.add(cur); L.push(pts.get(cur)); const nb = adj.get(cur).filter(x => x !== prev && !done.has(x)); prev = cur; cur = nb.length ? nb[0] : null; }
      if (L.length > 2) loops.push(L);
    });
    return loops;
  }
  // a slice as edges for the flat-part checker: near-round loops become circles so holes are measured exactly
  function sliceEdges(loops) {
    const E = [];
    loops.forEach(L => {
      let cx = 0, cy = 0; L.forEach(p => { cx += p[0]; cy += p[1]; }); cx /= L.length; cy /= L.length;
      const r = L.map(p => Math.hypot(p[0] - cx, p[1] - cy)), rm = r.reduce((a, b) => a + b, 0) / r.length;
      if (L.length >= 8 && rm > 0 && (Math.max(...r) - Math.min(...r)) / rm < 0.03) { E.push({ k: 'C', c: [cx, cy], r: rm, layer: '0' }); return; }
      for (let i = 0; i < L.length; i++) E.push({ k: 'L', p0: L[i], p1: L[(i + 1) % L.length], layer: '0', smooth: false });
    });
    return E;
  }
  // what kind of part: flat profile, stepped (2.5D), turned, thin shell, or free 3D
  function kind(M, R) {
    const { N, A, C, nf, lo, hi, area } = M, out = { flat: null, turned: null, shell: null };
    // flat or stepped: every face square or parallel to one axis
    for (let ax = 0; ax < 3; ax++) {
      let cap = 0, wall = 0; const lv = new Map();
      for (let f = 0; f < nf; f++) { const d = Math.abs(N[f * 3 + ax]); if (d > 0.999) { cap += A[f]; const k = Math.round(C[f * 3 + ax] * 100); lv.set(k, (lv.get(k) || 0) + A[f]); } else if (d < 0.01) wall += A[f]; }
      if ((cap + wall) / area > 0.995 && cap > area * 0.2) {
        const levels = [...lv.keys()].length, t = hi[ax] - lo[ax];
        if (!out.flat || cap > out.flat.cap) out.flat = { ax, t, levels, cap, pure: levels === 2 };
      }
    }
    // turned: every side face points straight out from a centre line
    for (let ax = 0; ax < 3; ax++) {
      const [iu, iv] = UV[ax], cu = (lo[iu] + hi[iu]) / 2, cv = (lo[iv] + hi[iv]) / 2; let ok = 0, side = 0;
      for (let f = 0; f < nf; f++) {
        const na = N[f * 3 + ax]; if (Math.abs(na) > 0.999) { ok += A[f]; continue; }
        side += A[f]; const ru = C[f * 3 + iu] - cu, rv = C[f * 3 + iv] - cv, rl = Math.hypot(ru, rv), nu = N[f * 3 + iu], nv2 = N[f * 3 + iv], nl = Math.hypot(nu, nv2);
        if (rl < 1e-9 || nl < 1e-9) continue; if (Math.abs(ru / rl * nv2 / nl - rv / rl * nu / nl) < 0.06) ok += A[f];
      }
      const d = Math.max(hi[iu] - lo[iu], hi[iv] - lo[iv]), sq = Math.abs((hi[iu] - lo[iu]) - (hi[iv] - lo[iv])) < d * 0.02;
      if (side > area * 0.15 && ok / area > 0.985 && sq) out.turned = { ax, d, L: hi[ax] - lo[ax] };
    }
    if (!out.flat && R.shellFrac > 0.8 && R.tMed > 0 && R.tMed <= 6) out.shell = { t: R.tMed };
    return out;
  }
  // round holes, found by slicing across each axis at a few heights
  function holes(M) {
    const found = [];
    for (let ax = 0; ax < 3; ax++) {
      const a = M.lo[ax], b = M.hi[ax];
      [0.06, 0.17, 0.28, 0.39, 0.5, 0.61, 0.72, 0.83, 0.94].forEach(fr => {
        const h = a + (b - a) * fr + (b - a) * 1.37e-5, L = slice(M, ax, h); if (!L.length) return;
        const G = D.geometry(sliceEdges(L), 1, { quick: true });
        (G.circles || []).forEach(c => { const e = found.find(x => x.ax === ax && Math.hypot(x.c[0] - c.at[0], x.c[1] - c.at[1]) < 0.3 && Math.abs(x.d - c.d) < 0.1); if (e) e.n++; else found.push({ ax, c: c.at, d: c.d, h, n: 1 }); });
      });
    }
    return found.filter(x => x.n >= 2).map(x => { const p = [0, 0, 0], [iu, iv] = UV[x.ax]; p[x.ax] = x.h; p[iu] = x.c[0]; p[iv] = x.c[1]; return Object.assign(x, { at: p }); });
  }
  // inside corners seen by a cutter coming along axis ax (slices square to it)
  function insideCorners(M, ax) {
    const a = M.lo[ax], b = M.hi[ax], C = [];
    [0.2, 0.5, 0.8].forEach(fr => {
      const h = a + (b - a) * fr + (b - a) * 1.37e-5, L = slice(M, ax, h); if (!L.length) return;
      const G = D.geometry(sliceEdges(L), 1, { quick: true }), [iu, iv] = UV[ax];
      (G.corners || []).forEach(c => { const p = [0, 0, 0]; p[ax] = h; p[iu] = c.at[0]; p[iv] = c.at[1]; if (!C.some(q => Math.hypot(q.at[0] - p[0], q.at[1] - p[1], q.at[2] - p[2]) < 1)) C.push({ r: c.r, at: p }); });
    });
    return C;
  }
  function analyse(T, scale) {
    const M = mesh(T, scale);
    if (!M.nf) throw new Error('The STL has no usable triangles.');
    const R = measure(M), K = kind(M, R);
    R.holes = holes(M);
    if (K.flat && K.flat.pure) {
      const ax = K.flat.ax, h = (M.lo[ax] + M.hi[ax]) / 2 + K.flat.t * 1.37e-5, L = slice(M, ax, h);
      K.flat.G = D.geometry(sliceEdges(L), 1); K.flat.h = h;
    }
    const tax = new Set(R.setups.map(k => k >> 1)); R.corners = [];
    tax.forEach(ax => insideCorners(M, ax).forEach(c => R.corners.push(Object.assign(c, { ax }))));
    return { M, R, K };
  }

  /* =====================================================================================
     4. JUDGE
     ===================================================================================== */
  const MAT = D.MATS, isMetal = D.isMetal, PLASTIC = { acrylic: 1, pc: 1, hdpe: 1, acetal: 1, abs: 1, pp: 1, nylon: 1 };
  const fitBox = (M, box) => { const s = [M.hi[0] - M.lo[0], M.hi[1] - M.lo[1], M.hi[2] - M.lo[2]].sort((a, b) => a - b), b = box.slice().sort((a, b) => a - b); return s.every((x, i) => x <= b[i]); };
  const rate = { mill: 100, lathe: 90 };
  // clusters of faces under a limit, as marks: the thinnest place in each neighbourhood
  function spots(M, vals, lim, cap, rad) {
    const L = []; for (let f = 0; f < M.nf; f++) { const v = vals[f]; if (v < lim) L.push([v, f]); }
    L.sort((a, b) => a[0] - b[0]); const out = [], r = rad || Math.max(3, M.diag / 25);
    for (const [v, f] of L) { const p = [M.C[f * 3], M.C[f * 3 + 1], M.C[f * 3 + 2]]; if (out.some(o => Math.hypot(o.at[0] - p[0], o.at[1] - p[1], o.at[2] - p[2]) < r)) continue; out.push({ v, at: p }); if (out.length >= (cap || 12)) break; }
    return { n: L.length, list: out };
  }
  const flagSpots = (M, fl, val, cap) => { const v = new Float32Array(M.nf).fill(Infinity); for (let f = 0; f < M.nf; f++) if (fl[f] === val) v[f] = 0; return spots(M, v, 0.5, cap, M.diag / 6); };
  const PROC3 = [
    { id: 'mill', n: 'CNC milling', page: '../machining/cnc-mill.html', mode: 'reach', tol: 0.03,
      note: 'A spinning cutter carves the part from a solid block. Holds tight tolerances in almost any metal or plastic; cost rises with every extra side it must be turned to, and with deep, narrow or hidden features.',
      fam: { steel: 1, stainless: 1, al: 1, brass: 1, ti: 1, acrylic: 1, pc: 1, hdpe: 1, acetal: 1, abs: 1, pp: 1, nylon: 1, g10: 1, wood: 1 } },
    { id: 'lathe', n: 'CNC turning (lathe)', page: '../machining/manual-lathe.html', mode: 'shape', tol: 0.02, needs: 'turned',
      note: 'The bar spins and a still tool cuts it. The fastest way to make round parts: shafts, pins, spacers, knobs.',
      fam: { steel: 1, stainless: 1, al: 1, brass: 1, ti: 1, acrylic: 1, pc: 1, hdpe: 1, acetal: 1, abs: 1, pp: 1, nylon: 1, wood: 1 } },
    { id: 'fdm', n: '3D printing: FDM (filament)', page: '../fabrication/print-tolerances.html', mode: 'over', tol: 0.25, box: [250, 250, 250], plastic: 1, pf: { abs: 1, pc: 1, nylon: 1, pp: 1 }, pfWhy: 'printed in ABS, PETG, nylon, PC or PP, not this plastic: choose one of those',
      note: 'Melted plastic is laid down layer by layer. Cheapest for one to a few dozen plastic parts; slopes steeper than 45° need support, and parts are weaker across the layers.' },
    { id: 'sla', n: '3D printing: resin (SLA)', page: '../fabrication/print-tolerances.html', mode: 'over', tol: 0.1, box: [145, 145, 185], plastic: 1, pf: { abs: 1, pc: 1, acrylic: 1, pp: 1 }, pfWhy: 'resins imitate ABS, PC, PP or clear acrylic; choose one of those',
      note: 'A light hardens liquid resin one thin layer at a time. Very fine detail and smooth surfaces; resins are more brittle than moulded plastic.' },
    { id: 'sls', n: '3D printing: nylon powder (SLS / MJF)', page: '../fabrication/print-tolerances.html', mode: 'thick', tol: 0.2, box: [300, 330, 330], plastic: 1, pf: { nylon: 1, pp: 1 }, pfWhy: 'powder printing uses nylon or polypropylene',
      note: 'A laser or a heating lamp fuses nylon powder. Strong, tough parts with no supports, so almost any shape works; good for tens to hundreds of parts.' },
    { id: 'dmls', n: '3D printing in metal (DMLS / SLM)', page: '../fabrication/print-tolerances.html', mode: 'over', tol: 0.1, box: [250, 250, 300],
      note: 'A laser melts fine metal powder layer by layer. Makes shapes no cutter can reach, but costly; supports are cut off and fitting faces are usually machined after.',
      fam: { stainless: 1, al: 1, ti: 1 } },
    { id: 'mould', n: 'Injection moulding', page: '../fabrication/snap-fit.html', mode: 'mould', tol: 0.1, minQty: 500, box: [500, 500, 300], plastic: 1,
      note: 'Hot plastic is forced into a steel or aluminium mould. Pennies a part in the thousands, but the mould costs thousands; walls should be even, with draft, and undercuts need extra mould parts.' },
    { id: 'cast', n: 'Investment casting', page: '../machining/manual-mill.html', mode: 'thick', tol: 0.25, minQty: 50, box: [400, 400, 400],
      note: 'Wax copies of the part are coated in ceramic, the wax is melted out and metal poured in. Good for complex metal shapes in tens to thousands; fitting faces are machined afterwards.',
      fam: { steel: 1, stainless: 1, al: 1, brass: 1, ti: 1 } },
    { id: 'sheet', n: 'Sheet metal: cut flat, then bent', page: '../fabrication/sheet-metal-bend.html', mode: 'thick', tol: 0.2, needs: 'shell',
      note: 'The part is laser cut flat from sheet and bent on a press brake. Cheap and strong for cases, brackets and covers with an even wall.',
      fam: { steel: 1, stainless: 1, al: 1, brass: 1 } }
  ];
  function judge3(A, pr, m, s) {
    const { M, R, K } = A, out = { pr, issues: [] }, add = (sev, id, text, at, val, n) => out.issues.push({ sev, id, text, at, val, n });
    const no = why => Object.assign(out, { ok: false, why });
    const plastic = !!PLASTIC[m.fam];
    if (pr.plastic && !plastic && !(pr.fam && pr.fam[m.fam])) return no(pr.id === 'mould' ? 'injection moulding is for plastics' : 'prints plastic, not ' + m.n.split(' (')[0].toLowerCase());
    if (pr.pf && plastic && !pr.pf[m.fam]) return no(pr.pfWhy);
    if (pr.fam && !pr.plastic && !pr.fam[m.fam]) return no(m.n.split(' (')[0] + ' is not usually made this way');
    if (pr.needs === 'turned' && !K.turned) return no('the part is not round about one axis');
    if (pr.needs === 'shell' && !K.shell) return no('the walls are not one even sheet thickness');
    if (pr.needs === 'shell' && K.shell && K.shell.t > 6) return no('walls thicker than about 6 mm are not bent from sheet');
    if (pr.box && !fitBox(M, pr.box)) return no('bigger than a typical machine (about ' + pr.box.join(' × ') + ' mm)');
    if (pr.minQty && s.qty < pr.minQty / 5) return no('the tooling only pays off from about ' + pr.minQty + ' parts');
    if (pr.id === 'fdm' && s.load === 2) return no('printed filament plastic is too weak for a structural part');
    if (pr.id === 'sla' && s.load === 2) return no('printing resin is too brittle for a structural part');
    if ((pr.id === 'cast' || pr.id === 'mill') && M.voids) return no('it has an empty space sealed inside, which no cutter or mould can make');
    out.ok = true;
    const V = M.vol / 1000, B = [M.hi[0] - M.lo[0], M.hi[1] - M.lo[1], M.hi[2] - M.lo[2]], Bv = B[0] * B[1] * B[2] / 1000;
    const thin = (fix, warn, what) => {
      const a = spots(M, R.thick, fix, 8), b = spots(M, R.thick, warn, 12);
      a.list.forEach(x => add('fix', 'thin', f1(x.v, 2) + ' mm wall: too thin ' + what + '. Make it at least ' + f1(fix, 1) + ' mm.', x.at, x.v));
      b.list.filter(x => x.v >= fix).forEach(x => add('warn', 'thin', f1(x.v, 2) + ' mm wall: thin ' + what + ' (' + f1(warn, 1) + ' mm or more is safer).', x.at, x.v));
    };
    let cost = 0, tol = pr.tol;
    switch (pr.id) {
      case 'mill': {
        const ns = R.setups.length;
        if (R.hiddenFrac > 0.002) { const sp = flagSpots(M, R.hidden, 1, 6); sp.list.forEach(x => add('fix', 'hidden', 'A cutter cannot reach this face from any side (' + f1(R.hiddenFrac * 100, 1) + ' % of the surface). Open it up to one side, split the part, or use 5-axis machining or EDM.', x.at)); }
        if (ns > 2) add('warn', 'setups', 'Needs ' + ns + ' setups (turned to ' + R.setups.map(k => DNAME[k]).join(', ') + '). Every setup adds time and a chance of misalignment; features reachable from one or two sides are much cheaper.', null);
        const toolR = Math.max(1, Math.min(3, R.tMed / 4));
        R.corners.filter(c => c.r < toolR - 1e-6).slice(0, 10).forEach(c => add('warn', 'corner', (c.r ? 'R' + f1(c.r, 2) : 'Sharp') + ' inside corner along ' + AX[c.ax] + ': a cutter leaves at least R' + f1(toolR, 1) + '. Draw the radius in (bigger is cheaper), or add a dog-bone.', c.at, c.r));
        thin(isMetal(m) ? 0.5 : 1, isMetal(m) ? 0.8 : 1.5, 'to machine without bending or chatter');
        const stockV = (B[0] + 6) * (B[1] + 6) * (B[2] + 3) / 1000, rm = Math.max(0, stockV - V), mrr = { al: 8, brass: 6, steel: 2.5, stainless: 1.5, ti: 0.8, g10: 3, wood: 15 }[m.fam] || 10;
        const finMin = M.area / 100 * ({ al: 0.03, brass: 0.035, steel: 0.06, stainless: 0.08, ti: 0.12 }[m.fam] || 0.03), run = rm / mrr + finMin + ns * 2;
        cost = (45 + ns * 15) * rate.mill / 60 / s.qty + run * rate.mill / 60 + stockV * m.rho / 1000 * m.kg * 1.3;
        out.stock = { form: B[2] + 3 < 80 ? 'Plate or block' : 'Block', size: [B[0] + 6, B[1] + 6, B[2] + 3], use: V / stockV };
        break;
      }
      case 'lathe': {
        const d = K.turned.d, L = K.turned.L, bar = [6, 8, 10, 12, 16, 20, 25, 30, 32, 40, 50, 60, 65, 70, 80, 90, 100, 120, 150, 200, 250, 300].find(x => x >= d + 1.5) || Math.ceil(d + 3);
        if (d > 300) return no('larger than most lathes take');
        thin(isMetal(m) ? 0.5 : 1, isMetal(m) ? 0.8 : 1.5, 'to turn without distortion');
        const stockV = Math.PI * bar * bar / 4 * (L + 5) / 1000, rm = Math.max(0, stockV - V), mrr = ({ al: 12, brass: 10, steel: 4, stainless: 2.5, ti: 1.2 }[m.fam] || 15);
        cost = 40 * rate.lathe / 60 / s.qty + (rm / mrr + 1.5) * rate.lathe / 60 + stockV * m.rho / 1000 * m.kg * 1.3;
        out.stock = { form: 'Round bar', size: [bar, L + 5], use: V / stockV };
        break;
      }
      case 'fdm': case 'sla': case 'sls': case 'dmls': {
        const o = R.up, needSup = pr.id !== 'sls';
        const lim = { fdm: [0.8, 1.2], sla: [0.4, 0.6], sls: [0.7, 1], dmls: [0.4, 0.8] }[pr.id];
        thin(lim[0], lim[1], 'to print reliably');
        const gp = spots(M, R.gap, { fdm: 0.4, sla: 0.2, sls: 0.4, dmls: 0.3 }[pr.id], 6);
        gp.list.forEach(x => add('warn', 'gap', f1(x.v, 2) + ' mm gap between faces: may fuse shut when printed. Open it to ' + ({ fdm: 0.5, sla: 0.3, sls: 0.5, dmls: 0.4 }[pr.id]) + ' mm or more.', x.at, x.v));
        if (needSup && o.area > M.area * 0.01) { const sp = flagSpots(M, o.fl, 1, 6); sp.list.forEach(x => add('warn', 'over', 'Overhang steeper than 45° (printed with ' + DNAME[o.k] + ' up): it needs support material, which leaves marks. A 45° chamfer under it avoids that.', x.at)); }
        if ((pr.id === 'sla' || pr.id === 'sls' || pr.id === 'dmls') && M.voids) add('fix', 'void', 'There is a sealed empty space inside: resin or powder gets trapped. Add two drain holes, or make it solid.', null);
        if (pr.id === 'fdm') { const g = V * 1.04 * 0.6 + (o.area / 100) * 0.3, hrs = g / 12 + o.h / 60 * 0.1; cost = 5 / 60 * 30 / s.qty + hrs * 4 + g / 1000 * 25 + (o.area > M.area * 0.01 ? 10 / 60 * 30 : 0); }
        if (pr.id === 'sla') cost = 10 / s.qty + V * 0.18 * 1.3 + (o.h / 25) * 3 + 15 / 60 * 30;
        if (pr.id === 'sls') cost = 5 / s.qty + V * 0.7 + Bv * 0.03 + 4;
        if (pr.id === 'dmls') cost = 250 / s.qty + V * ({ al: 3, stainless: 4, ti: 8 }[m.fam]) + o.area / 100 * 0.5 + 40;
        out.orient = o;
        break;
      }
      case 'mould': {
        const P = R.pull;
        if (P.under > 0.002) { const sp = flagSpots(M, P.fl, 1, 6); sp.list.forEach(x => add('warn', 'under', 'Undercut when the mould opens along ' + AX[P.ax] + ': the part would lock in the mould. It needs a side action (more cost), or reshape it so every face can be seen from one side or the other.', x.at)); }
        if (P.nodraft > 0.01) { const sp = flagSpots(M, P.fl, 2, 4); sp.list.forEach(x => add('warn', 'draft', 'Wall with no draft (parallel to the opening direction ' + AX[P.ax] + '): give it 1 to 2° of taper so the part slides out.', x.at)); }
        thin(0.6, 1, 'for plastic to fill');
        if (R.tMax > 4) { const sp = spots(M, R.thick.map(x => isFinite(x) ? -x : Infinity), -4, 4); sp.list.forEach(x => add('warn', 'sink', f1(-x.v, 1) + ' mm thick section: it shrinks unevenly and leaves sink marks. Core it out to an even 1.5 to 3.5 mm wall with ribs.', x.at, -x.v)); }
        if (R.tMed && R.tMax / Math.max(0.5, R.tMed) > 2.5) add('warn', 'even', 'Walls vary from about ' + f1(R.tMin, 1) + ' to ' + f1(R.tMax, 1) + ' mm. Even walls fill evenly, cool evenly and warp less.', null);
        const tool = 6000 + (P.under > 0.002 ? 4000 : 0) + Bv * 15;
        cost = tool / s.qty + V * m.rho / 1000 * m.kg * 1.1 + (25 + Math.max(0, R.tMax - 2) * 5) / 3600 * 70;
        out.tooling = tool;
        break;
      }
      case 'cast': {
        thin(1.5, 2.5, 'for metal to flow into');
        const tool = 2500 + Bv * 4;
        cost = tool / s.qty + V * m.rho / 1000 * m.kg * 1.6 + 12 + M.area / 100 * 0.15;
        add('warn', 'machine', 'Cast surfaces are rough (about Ra 3 µm) and within ±0.25 mm or so: plan to machine the faces and holes that fit other parts.', null);
        out.tooling = tool;
        break;
      }
      case 'sheet': {
        const t = K.shell.t, blank = M.area / 2 / 100;
        add('warn', 'flat', 'Bent parts are made from a flat pattern. Export the flat pattern from your CAD program as a DXF and run it through Check a DXF to check holes near bends and the cut-out shape.', null);
        if (isMetal(m) && m === MAT.al6061) add('warn', 'crack', '6061-T6 tends to crack when bent tightly. 5052 aluminium bends well.', null);
        cost = 20 * 90 / 60 / s.qty + blank * t * m.rho / 1000 * m.kg * 1.4 + 2 + 4 * 0.25 * 90 / 60;
        tol = 0.2; out.stock = { form: 'Sheet', size: [t] };
        break;
      }
    }
    if (tol > D.PREC[s.prec][1] * 1.2) { add('warn', 'tol', pr.n + ' holds about ±' + f1(tol, 2) + ' mm. For ±' + D.PREC[s.prec][1] + ' mm, machine the faces and holes that must fit afterwards.', null); cost += 20 / s.qty + (R.holes.length * 0.6 + 4) * 100 / 60; }
    out.cost = cost; out.tol = tol;
    out.fix = out.issues.filter(i => i.sev === 'fix').length; out.warn = out.issues.filter(i => i.sev === 'warn').length; out.kinds = new Set(out.issues.filter(i => i.sev === 'warn').map(i => i.id)).size;
    return out;
  }
  // flat parts: cut from sheet with the flat-part checker, its marks lifted back into 3D
  function flatResults(A, m, s) {
    const K = A.K; if (!K.flat || !K.flat.G) return [];
    const ax = K.flat.ax, [iu, iv] = UV[ax], lift = p => { if (!p) return p; const q = [0, 0, 0]; q[ax] = K.flat.h; q[iu] = p[0]; q[iv] = p[1]; return q; };
    const s2 = Object.assign({}, s, { t: K.flat.t, bent: 0 }), R = D.rank(K.flat.G, m, s2);
    const conv = r => Object.assign({}, r, { flat: true, pr: Object.assign({}, r.pr, { n: r.pr.n + ' from ' + f1(K.flat.t, 2) + ' mm sheet', mode: 'shape' }), issues: r.issues.map(i => Object.assign({}, i, { at: lift(i.at) })) });
    return { ok: R.ok.filter(r => r.pr.id !== 'mill' && r.pr.id !== 'print').map(conv), no: R.no.filter(r => r.pr.id !== 'mill' && r.pr.id !== 'print').map(conv) };
  }
  function rank3(A, m, s) {
    const all = PROC3.map(pr => judge3(A, pr, m, s)), fl = flatResults(A, m, s);
    const ok = all.filter(r => r.ok).concat(fl.ok || []), no = all.filter(r => !r.ok).concat(fl.no || []);
    const sc = r => r.cost * (1 + 0.6 * new Set(r.issues.filter(i => i.sev === 'fix').map(i => i.id)).size + 0.12 * r.kinds);
    ok.sort((a, b) => sc(a) - sc(b));
    return { ok, no };
  }
  function suggest3(A, s) {
    const need = k => { const m = MAT[k];
      if (s.env === 1 && !m.out) return 1; if (s.env === 2 && !m.food) return 1; if (s.env === 3 && !m.heat) return 1;
      if (s.load === 2 && m.ys < 150) return 1; if (s.load === 1 && m.ys < 25) return 1; if (k === 'mdf' || k === 'ply') return 1; return 0; };
    return Object.keys(MAT).filter(k => !need(k)).map(k => { const r = rank3(A, MAT[k], s); const b = r.ok.find(x => !x.fix) || r.ok[0]; return b ? { k, best: b } : null; })
      .filter(Boolean).sort((a, b) => (a.best.fix > 0) - (b.best.fix > 0) || a.best.cost - b.best.cost);
  }
  const FIN3 = {
    fdm: [['Remove supports and sand', 'Supports leave rough patches; sanding and a filler primer hide the layer lines before paint.']],
    sla: [['Wash and cure', 'Resin parts are washed in alcohol and hardened under UV light; support nubs are sanded off.']],
    sls: [['Bead blast, then dye', 'Powder parts come out slightly rough and white; dyeing black is cheap and hides marks.']],
    dmls: [['Stress relieve, remove supports, machine the fitting faces', 'Printed metal is heat treated, cut off its build plate, and the faces that fit other parts are machined.']],
    mould: [['Choose a mould texture', 'The mould\'s surface is copied onto every part: polished for clear or glossy parts, a light texture hides marks and fingerprints.']],
    cast: [['Shot blast, then machine the fitting faces', 'Cleans off the casting skin; holes and faces that fit other parts are machined afterwards.']]
  };

  /* =====================================================================================
     SAMPLES (made here as meshes, then written as binary STL so they go through the reader)
     ===================================================================================== */
  // ear clipping, with holes joined to the outline by bridges
  function triangulate(outer, holes) {
    let P = outer.slice();
    const area = Q => { let a = 0; for (let i = 0; i < Q.length; i++) { const p = Q[i], q = Q[(i + 1) % Q.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; };
    if (area(P) < 0) P.reverse();
    const segX = (a, b, c, d) => { const o = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])); return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0; };
    holes.map(h => (area(h) > 0 ? h.slice().reverse() : h.slice())).sort((a, b) => Math.max(...b.map(p => p[0])) - Math.max(...a.map(p => p[0]))).forEach(H => {
      let mi = 0; H.forEach((p, i) => { if (p[0] > H[mi][0]) mi = i; }); const M = H[mi];
      const cand = P.map((p, i) => [Math.hypot(p[0] - M[0], p[1] - M[1]), i]).filter(([, i]) => P[i][0] >= M[0] - 1e-9).sort((a, b) => a[0] - b[0]);
      let pick = -1; for (const [, i] of cand) { const V = P[i]; let bad = false; for (let k = 0; k < P.length && !bad; k++) { const a = P[k], b = P[(k + 1) % P.length]; if (a === V || b === V) continue; if (segX(M, V, a, b)) bad = true; } if (!bad) { pick = i; break; } }
      if (pick < 0) pick = cand.length ? cand[0][1] : 0;
      const ring = H.slice(mi).concat(H.slice(0, mi)); ring.push(H[mi]);
      P = P.slice(0, pick + 1).concat(ring, [P[pick]], P.slice(pick + 1));
    });
    const T = [], idx = P.map((_, i) => i), cr = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    const inside = (p, a, b, c) => cr(a, b, p) > 1e-12 && cr(b, c, p) > 1e-12 && cr(c, a, p) > 1e-12;
    let guard = 0;
    while (idx.length > 3 && guard++ < 100000) {
      let clipped = false;
      for (let i = 0; i < idx.length; i++) {
        const a = P[idx[(i + idx.length - 1) % idx.length]], b = P[idx[i]], c = P[idx[(i + 1) % idx.length]];
        if (cr(a, b, c) <= 1e-12) continue;
        let ear = true; for (const j of idx) { const p = P[j]; if (p === a || p === b || p === c) continue; if ((p[0] === a[0] && p[1] === a[1]) || (p[0] === b[0] && p[1] === b[1]) || (p[0] === c[0] && p[1] === c[1])) continue; if (inside(p, a, b, c)) { ear = false; break; } }
        if (!ear) continue; T.push([a, b, c]); idx.splice(i, 1); clipped = true; break;
      }
      if (!clipped) { idx.splice(0, 1); }
    }
    if (idx.length === 3) T.push(idx.map(i => P[i]));
    return T;
  }
  function extrude(outer, holes, h) {
    const T = [], tri = (a, b, c) => T.push(...a, ...b, ...c);
    triangulate(outer, holes).forEach(([a, b, c]) => { tri([a[0], a[1], h], [b[0], b[1], h], [c[0], c[1], h]); tri([a[0], a[1], 0], [c[0], c[1], 0], [b[0], b[1], 0]); });
    const wall = (L, outward) => { for (let i = 0; i < L.length; i++) { let p = L[i], q = L[(i + 1) % L.length]; if (!outward) [p, q] = [q, p]; tri([p[0], p[1], 0], [q[0], q[1], 0], [q[0], q[1], h]); tri([p[0], p[1], 0], [q[0], q[1], h], [p[0], p[1], h]); } };
    const ccw = L => { let a = 0; for (let i = 0; i < L.length; i++) { const p = L[i], q = L[(i + 1) % L.length]; a += p[0] * q[1] - q[0] * p[1]; } return a > 0 ? L : L.slice().reverse(); };
    wall(ccw(outer), true); holes.forEach(H => wall(ccw(H), false));
    return Float32Array.from(T);
  }
  const circ = (cx, cy, r, n = 40) => Array.from({ length: n }, (_, i) => [cx + r * Math.cos(TAU * i / n), cy + r * Math.sin(TAU * i / n)]);
  function rounded(w, h, r, n = 8) { const P = []; [[w - r, h - r, 0], [r, h - r, 1], [r, r, 2], [w - r, r, 3]].forEach(([cx, cy, q]) => { for (let i = 0; i <= n; i++) { const a = (q + i / n) * Math.PI / 2; P.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } }); return P; }
  // revolve a closed (r, z) outline about Z; points on the axis (r = 0) close the ends
  function revolve(prof, n = 48) {
    const T = [], tri = (a, b, c) => T.push(...a, ...b, ...c), at = (r, z, i) => [r * Math.cos(TAU * i / n), r * Math.sin(TAU * i / n), z];
    for (let k = 0; k < prof.length; k++) {
      const [r0, z0] = prof[k], [r1, z1] = prof[(k + 1) % prof.length];
      if (r0 === 0 && r1 === 0) continue;
      for (let i = 0; i < n; i++) {
        const a = at(r0, z0, i), b = at(r0, z0, i + 1), c = at(r1, z1, i + 1), d = at(r1, z1, i);
        if (r0 === 0) tri(a, c, d); else if (r1 === 0) tri(a, b, c); else { tri(a, b, c); tri(a, c, d); }
      }
    }
    return Float32Array.from(T);
  }
  const SAMPLES = {
    plate: { name: 'mount-plate.stl', label: 'flat plate', mat: 'al5052', qty: 20, load: 1, make: () => extrude(rounded(100, 60, 6), [circ(50, 30, 11), circ(8, 8, 1.7, 24), circ(92, 8, 1.7, 24), circ(8, 52, 1.7, 24), circ(92, 52, 1.7, 24), [[30, 50], [70, 50], [70, 57.5], [30, 57.5]]], 3) },
    shaft: { name: 'shaft.stl', label: 'turned shaft', mat: 'steel', qty: 50, load: 2, make: () => revolve([[0, 0], [10, 0], [10, 25], [9, 25], [9, 27], [10, 27], [10, 40], [7, 40], [7, 60], [3, 60], [3, 48], [0, 48]]) },
    cup: { name: 'cup.stl', label: 'thin-walled cup', mat: 'abs', qty: 5, load: 0, make: () => revolve([[0, 0], [25, 0], [30, 40], [33, 40], [33, 41.5], [28.5, 41.5], [23.7, 1.4], [0, 1.4]], 64) }
  };

  /* =====================================================================================
     PAGE
     ===================================================================================== */
  const $ = (r, q) => r.querySelector(q);
  const MODES = [['shape', 'Shape'], ['thick', 'Wall thickness'], ['over', 'Overhangs (printing)'], ['mould', 'Undercuts and draft (moulding)'], ['reach', 'Hard to reach (milling)']];
  MN.mount = function (app) {
    const MATS = D.MATS;
    app.innerHTML = `
    <header class="phead"><nav class="crumbs" aria-label="Breadcrumb"><a href="../design.html">Design</a><span>/</span><span>Tool</span></nav>
      <div class="kicker">Design for manufacturing · Tool</div><h1 class="title">Check an STL</h1>
      <p class="lede">Load a 3D model and see how it could be made, from the best option down: milling, turning, printing, moulding, casting or cutting from sheet, with the material, stock, tolerances and finish to ask for, and what to change first.</p></header>
    <div class="dx-top">
      <section class="box dx-in">
        <h3>1 · Your model</h3>
        <label class="dx-drop" tabindex="0"><input type="file" accept=".stl" hidden><b>Drop an .stl file here</b><span>or click to choose one</span></label>
        <p class="dx-or">or try a sample: ${Object.entries(SAMPLES).map(([k, v]) => `<button type="button" class="dx-link" data-sample="${k}">${v.label}</button>`).join(' · ')}</p>
        <p class="dx-priv">Your file stays on your computer: it is read by this page and never uploaded. For a flat drawing, use <a href="dxf-check.html">Check a DXF</a>.</p>
        <h3>2 · What you need</h3>
        <div class="dx-form">
          <label>Units in the file <select data-k="units"><option value="1">mm</option><option value="25.4">inches</option><option value="10">cm</option><option value="1000">m</option></select></label>
          <label>Material <select data-k="mat"><option value="auto">Suggest one for me</option>${Object.entries(MATS).map(([k, m]) => `<option value="${k}">${m.n}</option>`).join('')}</select></label>
          <label>How many <input type="number" data-k="qty" min="1" max="1000000" step="1" value="10"></label>
          <label>Strength <select data-k="load"><option value="0">Doesn't matter (decorative, light duty)</option><option value="1">Carries a light load</option><option value="2">Structural: must be strong</option></select></label>
          <label>Where it is used <select data-k="env"><option value="0">Indoors, dry</option><option value="1">Outdoors or wet</option><option value="2">Touches food</option><option value="3">Hot (over 80 °C)</option></select></label>
          <label>Tightest fit <select data-k="prec">${D.PREC.map((p, i) => `<option value="${i}">${p[0]}</option>`).join('')}</select></label>
          <label>Looks <select data-k="look"><option value="0">Hidden, looks don't matter</option><option value="1">Seen, should look good</option></select></label>
        </div>
      </section>
      <section class="box dx-view"><h3>Model <span class="dx-vtools"><button type="button" class="dx-link" data-view="iso">3D</button> · <button type="button" class="dx-link" data-view="top">Top</button> · <button type="button" class="dx-link" data-view="front">Front</button> · <button type="button" class="dx-link" data-view="side">Side</button></span></h3>
        <div class="dx-modes" role="group" aria-label="Colour the model by">${MODES.map(([k, n]) => `<button type="button" data-mode="${k}" aria-pressed="${k === 'shape'}">${n}</button>`).join('')}</div>
        <div class="dx-cv"><canvas class="st-gl" aria-label="3D view of the model with problem areas coloured"></canvas><canvas class="st-ov" aria-hidden="true"></canvas><p class="dx-empty">Load an STL or a sample to start.</p><p class="st-busy" hidden>Measuring…</p></div>
        <p class="st-legend"></p>
        <div class="dx-stats"></div></section>
    </div>
    <div class="dx-out" aria-live="polite"></div>
    <section class="box dx-about"><h3>How this works, and its limits</h3><ul class="rules">
      <li>An STL is the surface of the part as triangles. From them the page measures the size, volume and weight, counts the holes that go right through (from how the surface is connected), finds round holes by slicing the model, and measures the wall thickness by sending a line straight in from every face to the face behind it.</li>
      <li>It also checks which faces slope down too steeply to print without support (for each of the six ways the part could lie), which faces would lock in a two-part mould (for each of the three ways it could open), and which faces a milling cutter could reach from each side.</li>
      <li>It recognises flat parts (one even thickness, cut straight through), round parts (made on a lathe) and thin even walls (bent sheet metal), and checks flat parts with the same rules as Check a DXF.</li>
      <li>An STL has no units, approximates curves with flat facets, and cannot show threads, tolerances or which faces must fit something. Costs are only compared between the options; for a real price ask a shop, and for anything that matters for safety, ask an engineer.</li></ul></section>`;
    const S = { A: null, sel: 0, mode: 'shape', view: { az: -40, el: 28, k: 1, px: 0, py: 0 } };
    const gl0 = $(app, '.st-gl'), ov = $(app, '.st-ov'), out = $(app, '.dx-out'), stats = $(app, '.dx-stats'), drop = $(app, '.dx-drop'), inp = $(app, 'input[type=file]'), busy = $(app, '.st-busy');
    const val = k => $(app, `[data-k="${k}"]`).value;
    const settings = () => ({ units: +val('units'), mat: val('mat'), qty: Math.max(1, Math.round(+val('qty') || 1)), load: +val('load'), F: 0, env: +val('env'), prec: +val('prec'), look: +val('look'), bent: 0, t: 3 });
    let buf = null, name = '';
    function load(b, nm) {
      buf = b; name = nm; S.sel = 0; S.A = null; S.T = null;
      try { S.T = readSTL(b); if (S.T.length / 9 > 600000) throw new Error('This model has ' + Math.round(S.T.length / 9).toLocaleString() + ' triangles. Export it with a coarser resolution (under 600,000 triangles) to check it here.'); }
      catch (e) { out.innerHTML = `<section class="box dx-err"><h3>Could not read the file</h3><p>${esc(e.message)}</p></section>`; draw(); return; }
      // units: STL has none. Guess millimetres unless the part is tiny.
      const T = S.T; let mx = 0; for (let i = 0; i < T.length; i++) mx = Math.max(mx, Math.abs(T[i]));
      S.guess = mx < 8 ? 25.4 : 1; $(app, '[data-k=units]').value = String(S.guess);
      run(true);
    }
    function run(geo) {
      if (!S.T) return;
      const s = settings();
      if (geo || !S.A || S.scale !== s.units) {
        busy.hidden = false;
        setTimeout(() => { try { const t0 = performance.now(); S.A = analyse(S.T, s.units); S.ms = performance.now() - t0; S.scale = s.units; S.view.k = 1; S.view.px = S.view.py = 0; upload(); report(); draw(); } catch (e) { out.innerHTML = `<section class="box dx-err"><h3>Could not check this model</h3><p>${esc(e.message)}</p></section>`; } busy.hidden = true; }, 30);
        return;
      }
      report(); draw();
    }
    // ------- report -------
    function report() {
      const A = S.A, { M, R, K } = A, s = settings();
      let mk = s.mat, sug = null;
      if (mk === 'auto') { sug = suggest3(A, s); mk = sug.length ? sug[0].k : 'al6061'; }
      const m = MATS[mk], RK = rank3(A, m, s); if (S.sel >= RK.ok.length) S.sel = 0;
      const sel = RK.ok[S.sel]; S.sel_r = sel; S.m = m;
      const per = {}; S.marks = sel ? sel.issues.filter(i => i.at && (per[i.id] = (per[i.id] || 0) + 1) <= 8) : [];
      if (sel && !S.userMode) { S.mode = sel.pr.mode || 'shape'; paint(); }
      const B = [M.hi[0] - M.lo[0], M.hi[1] - M.lo[1], M.hi[2] - M.lo[2]];
      const fi = [], F = (sev, text) => fi.push({ sev, text });
      F(s.units === S.guess ? 'warn' : 'ok', `STL files do not store units. It is read as <b>${{ 1: 'millimetres', 25.4: 'inches', 10: 'centimetres', 1000: 'metres' }[s.units]}</b>, which makes it ${f1(B[0])} × ${f1(B[1])} × ${f1(B[2])} mm. If that is wrong, set the units above.`);
      if (M.open) F('fix', `The surface is not closed: ${M.open} open edge${M.open > 1 ? 's' : ''}. Volume, thickness and holes may be wrong, and printers and CAM software may refuse it. Export again as a solid, or repair it (most slicers have a repair tool).`);
      if (M.multi) F('fix', `${M.multi} edge${M.multi > 1 ? 's are' : ' is'} shared by more than two faces (non-manifold): the model touches itself. Repair it before making it.`);
      if (M.flip) F('warn', `Some faces point the wrong way (${M.flip} edge${M.flip > 1 ? 's' : ''}). Most software fixes this, but check the export.`);
      if (M.inverted) F('ok', 'All the faces pointed inwards; they were turned round for the check.');
      if (M.degen) F('ok', `${M.degen} zero-size triangle${M.degen > 1 ? 's were' : ' was'} ignored.`);
      if (M.voids) F('warn', 'There is an empty space sealed inside the part. It can only be printed, and powder or resin will be trapped in it.');
      const solids = M.shells.length - M.voids; if (solids > 1) F('ok', `${solids} separate bodies in one file. They are checked together.`);
      const kindText = K.flat && K.flat.pure ? `a <b>flat part</b>, ${f1(K.flat.t, 2)} mm thick (cut straight through along ${AX[K.flat.ax]}), so it can be cut from sheet or plate` : K.flat ? `a <b>stepped part</b> (every face square to ${AX[K.flat.ax]}, at ${K.flat.levels} heights): easy to mill from plate` : K.turned ? `a <b>round part</b> about ${AX[K.turned.ax]} (Ø${f1(K.turned.d)} × ${f1(K.turned.L)} mm): a lathe job` : K.shell ? `a <b>thin, even-walled part</b> (about ${f1(K.shell.t, 1)} mm): sheet metal or moulding` : 'a <b>free 3D shape</b>';
      stats.innerHTML = `<span><small>Size</small>${f1(B[0])} × ${f1(B[1])} × ${f1(B[2])} mm</span><span><small>Volume</small>${f1(M.vol / 1000, 2)} cm³</span><span><small>Weight</small>${f1(M.vol / 1000 * m.rho, 1)} g</span><span><small>Through holes</small>${M.holes == null ? '?' : M.holes}</span><span><small>Walls</small>${R.tMin ? f1(R.tMin, 2) + ' to ' + f1(R.tMax, 1) + ' mm' : '–'}</span><span><small>Triangles</small>${M.nf.toLocaleString()}</span>`;
      const cmin = Math.min(...RK.ok.map(r => r.cost)), band = c => { const q = c / (cmin || 1); return q <= 1.3 ? 'Lowest cost' : q <= 2.5 ? 'Low cost' : q <= 6 ? 'Medium cost' : 'High cost'; };
      const LBL = ['Best fit', 'Good', 'Possible'];
      const card = (r, i) => `<button type="button" class="dx-proc${i === S.sel ? ' on' : ''}" data-sel="${i}" aria-pressed="${i === S.sel}"><span class="dx-rank">${r.fix ? 'Needs design changes' : LBL[Math.min(i, 2)]}</span><b>${r.pr.n}</b>
        <span class="dx-cost"><i>${band(r.cost)}</i> for ${s.qty} part${s.qty > 1 ? 's' : ''}</span><span class="dx-meta">±${f1(r.tol, 2)} mm · ${r.fix ? r.fix + ' must-fix · ' : ''}${r.warn} to check</span></button>`;
      const fixes = sel ? sel.issues.slice().sort((a, b) => (a.sev === 'fix' ? 0 : 1) - (b.sev === 'fix' ? 0 : 1) || (a.val == null ? 0 : a.val) - (b.val == null ? 0 : b.val)) : [];
      const grp = {}; fixes.forEach(x => (grp[x.id + x.sev] = grp[x.id + x.sev] || []).push(Object.assign({ k: S.marks.indexOf(x) + 1 }, x)));
      // stock
      let stock = '';
      if (sel) {
        const pid = sel.pr.id;
        if (sel.flat) { const nt = D.nearest(D.isMetal(m) ? D.STOCK.metal : (m.fam === 'wood' || m.fam === 'mdf') ? D.STOCK.wood : D.STOCK.plastic, K.flat.t); stock = `<p><b>${K.flat.t > 6 && D.isMetal(m) ? 'Plate' : 'Sheet'}, ${f1(K.flat.t, 2)} mm</b></p><p class="dx-small">${nt.std ? 'A standard stock thickness.' : `Not a usual stock size: the nearest are ${[nt.lo, nt.hi].filter(x => x != null).map(x => f1(x, 2)).join(' and ')} mm.`}</p>`; }
        else if (sel.stock && sel.stock.form === 'Round bar') stock = `<p><b>Round bar, Ø${sel.stock.size[0]} mm</b>, cut to ${f1(sel.stock.size[1])} mm</p><p class="dx-small">${Math.round(sel.stock.use * 100)} % of the bar ends up in the part; the rest is chips. A bar size just over the largest diameter keeps waste and cutting time down.</p>`;
        else if (sel.stock && sel.stock.form === 'Sheet') stock = `<p><b>Sheet, ${f1(sel.stock.size[0], 2)} mm</b></p><p class="dx-small">Cut flat, then bent. Check that this is a stock gauge before you finalise the design.</p>`;
        else if (sel.stock) stock = `<p><b>${sel.stock.form}, about ${sel.stock.size.map(x => Math.ceil(x)).join(' × ')} mm</b></p><p class="dx-small">${Math.round(sel.stock.use * 100)} % of the block ends up in the part. ${sel.stock.use < 0.25 ? 'Most of it becomes chips: a near-shape starting stock (plate, extrusion, a casting) or a design that removes less metal would cut the cost.' : ''}</p>`;
        else if (pid === 'fdm') stock = `<p><b>Filament</b>: ${m.fam === 'pc' ? 'polycarbonate' : m.fam === 'nylon' ? 'nylon' : m.fam === 'abs' ? 'ABS or ASA' : m.fam === 'pp' ? 'polypropylene' : 'PETG (or PLA indoors)'}</p><p class="dx-small">About ${f1(M.vol / 1000 * 1.04 * 0.6, 0)} g a part with typical infill. Print it with the ${DNAME[R.up.k]} side up${R.up.area > M.area * 0.01 ? '' : ': no supports needed'}.</p>`;
        else if (pid === 'sla') stock = `<p><b>Resin</b>: ${s.load ? 'a tough or engineering resin' : 'standard resin'}</p><p class="dx-small">About ${f1(M.vol / 1000 * 1.2, 0)} ml a part, plus supports.</p>`;
        else if (pid === 'sls') stock = `<p><b>Nylon powder</b> (PA12 or PA11)</p><p class="dx-small">No supports, so the orientation hardly matters. The chosen plastic is replaced by nylon.</p>`;
        else if (pid === 'dmls') stock = `<p><b>Metal powder</b>: ${m.fam === 'al' ? 'AlSi10Mg aluminium' : m.fam === 'ti' ? 'Ti-6Al-4V titanium' : '316L stainless'}</p><p class="dx-small">Print with the ${DNAME[R.up.k]} side up to need the least support.</p>`;
        else if (pid === 'mould') stock = `<p><b>Plastic pellets</b>: ${m.n}</p><p class="dx-small">The mould opens along ${AX[R.pull.ax]}. The mould is a large one-off cost, shared over all the parts made.</p>`;
        else if (pid === 'cast') stock = `<p><b>Casting alloy</b>: ${m.fam === 'al' ? 'A356 aluminium' : m.fam === 'brass' ? 'cast brass or bronze' : m.n}</p><p class="dx-small">The wax pattern die is a one-off cost, shared over all the parts made.</p>`;
      }
      const hs = {}; R.holes.forEach(h => { const k = f1(h.d, 2) + '|' + h.ax; hs[k] = (hs[k] || 0) + 1; });
      const holeRows = Object.entries(hs).sort((a, b) => parseFloat(a[0]) - parseFloat(b[0])).map(([k, n]) => { const [ds, ax] = k.split('|'), d = +ds; const near = (L, tl) => { const x = L.slice().sort((a, b) => Math.abs(a[0] - d) - Math.abs(b[0] - d))[0]; return x && Math.abs(x[0] - d) <= tl ? x : null; }; let cl = near(D.SCREWS, 0.12), tp = near(D.TAPS, 0.08); if (cl && tp) { if (Math.abs(tp[0] - d) <= Math.abs(cl[0] - d)) cl = null; else tp = null; }
        return `<tr><td>Ø${d}</td><td>${n}</td><td>${AX[+ax]}</td><td>${cl ? 'Clearance for ' + cl[1] + ' screws' : tp ? 'Tapping size for ' + tp[1] + ': drill and tap after' : s.prec ? 'If a pin or bearing fits here: make it slightly small and ream to size' : 'General'}</td></tr>`; }).join('');
      const finList = (sel && FIN3[sel.pr.id] ? FIN3[sel.pr.id] : []).concat(sel && /^(fdm|sla|sls|mould)$/.test(sel.pr.id) ? [] : D.finishes(m, s, sel && sel.flat ? sel.pr : null));
      out.innerHTML = `
      <section class="box dx-file"><h3>The file itself</h3><p class="dx-small st-kind">This looks like ${kindText}.</p><ul class="dx-list">${fi.map(x => `<li class="dx-${x.sev}">${x.text}</li>`).join('')}</ul></section>
      <section class="sec dx-sec"><header class="sech"><span class="secn">01</span><div><h2>Ways to make it</h2><p>${m.n}, ${s.qty} part${s.qty > 1 ? 's' : ''}. Ranked from easiest and cheapest to make; the cost labels compare these options with each other. Pick one to see its fixes.</p></div></header>
        <div class="dx-procs">${RK.ok.map(card).join('') || '<p>No process suits this material. Try another material.</p>'}</div>
        ${RK.no.length ? `<details class="dx-no"><summary>Not suited (${RK.no.length})</summary><ul>${RK.no.map(r => `<li><b>${r.pr.n}</b>: ${esc(r.why)}</li>`).join('')}</ul></details>` : ''}
        ${sel ? `<p class="dx-pnote">${sel.pr.note} <a href="${sel.pr.page}">More about it →</a></p>` : ''}</section>
      ${sel ? `<section class="sec dx-sec"><header class="sech"><span class="secn">02</span><div><h2>Change in the design</h2><p>For ${sel.pr.n.toLowerCase()}. The numbers match the marks on the model; click one to turn the model towards it.</p></div></header>
        ${fixes.length ? `<ul class="dx-list">${Object.values(grp).map(L => `<li class="dx-${L[0].sev === 'fix' ? 'fix' : 'warn'}">${L[0].text}${L.length > 1 ? ` <span class="dx-more">${L.length} places.</span>` : ''} ${L.filter(x => x.k > 0).slice(0, 12).map(x => `<button type="button" class="dx-pin" data-pin="${x.k - 1}">${x.k}</button>`).join('')}</li>`).join('')}</ul>` : '<p class="dx-good">Nothing to change for this process.</p>'}</section>` : ''}
      <section class="sec dx-sec"><header class="sech"><span class="secn">03</span><div><h2>Material and stock</h2><p>${s.mat === 'auto' ? 'Suggested from what you need. Change it above to compare.' : 'The material you chose.'}</p></div></header>
        <div class="dx-grid"><div class="box"><h3>Material</h3><p><b>${m.n}</b></p>${s.mat === 'auto' && sug && sug.length > 1 ? `<p class="dx-small">Also suitable, cheapest made part first: ${sug.slice(1, 5).map(x => MATS[x.k].n).join(', ')}.</p>` : ''}${m.brittle && s.load ? '<p class="dx-small dx-warnt">Acrylic is brittle under load; polycarbonate or nylon take knocks far better.</p>' : ''}<p class="dx-small">About ${f1(M.vol / 1000 * m.rho, 1)} g each.</p></div>
          <div class="box"><h3>Form of the stock</h3>${stock || '<p class="dx-small">Pick a process.</p>'}</div></div></section>
      <section class="sec dx-sec"><header class="sech"><span class="secn">04</span><div><h2>Tolerances to ask for</h2><p>Tight tolerances cost money, so ask for them only where a part has to fit.</p></div></header>
        <div class="dx-grid"><div class="box"><h3>General</h3><p class="dx-small">${sel ? `${sel.pr.n} holds about <b>±${f1(sel.tol, 2)} mm</b>. ` : ''}Put "general tolerance ISO 2768-m" on the drawing and give tighter limits only on the faces and holes that fit other parts. Send a STEP file and a drawing with those limits along with the STL: shops quote better from STEP.</p></div>
          <div class="box"><h3>Round holes found</h3>${holeRows ? `<div class="tablewrap"><table class="btable"><thead><tr><th>Size</th><th>How many</th><th>Along</th><th>What it looks like</th></tr></thead><tbody>${holeRows}</tbody></table></div>` : '<p class="dx-small">No round holes found.</p>'}</div></div></section>
      <section class="sec dx-sec"><header class="sech"><span class="secn">05</span><div><h2>Finishing</h2><p>Secondary steps after making it. Each one adds cost and time, so choose them for a reason.</p></div></header>
        <ul class="dx-list">${finList.map(([n, d]) => `<li class="dx-ok"><b>${n}.</b> ${d}</li>`).join('')}</ul></section>`;
    }

    /* ------- 3D view (WebGL) ------- */
    let gl = null, prog = null, nb = null, nbuf = null, cbuf = null, ntri = 0;
    try { gl = gl0.getContext('webgl', { antialias: true, preserveDrawingBuffer: true }); } catch (e) { gl = null; }
    if (gl) {
      const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); return s; };
      prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, 'attribute vec3 p;attribute vec3 n;attribute vec3 c;uniform mat4 M;uniform mat3 R;varying vec3 vc;void main(){vec3 nn=normalize(R*n);float d=max(dot(nn,normalize(vec3(-0.35,0.45,0.82))),0.0);float b=max(dot(nn,normalize(vec3(0.6,-0.3,0.5))),0.0);vc=c*(0.38+0.52*d+0.18*b);gl_Position=M*vec4(p,1.0);}'));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, 'precision mediump float;varying vec3 vc;void main(){gl_FragColor=vec4(vc,1.0);}'));
      gl.linkProgram(prog);
      nb = gl.createBuffer(); nbuf = gl.createBuffer(); cbuf = gl.createBuffer();
    }
    const rgb = v => { const s = getComputedStyle(document.documentElement).getPropertyValue(v).trim(); if (s[0] === '#') { const h = s.length === 4 ? s.slice(1).split('').map(x => x + x).join('') : s.slice(1, 7); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255); } const m = s.match(/[\d.]+/g); return m ? m.slice(0, 3).map(x => +x / 255) : [1, 1, 1]; };
    function upload() {
      if (!gl || !S.A) return; const { M } = S.A; ntri = M.nf;
      const P = new Float32Array(ntri * 9), Nn = new Float32Array(ntri * 9), cx = (M.lo[0] + M.hi[0]) / 2, cy = (M.lo[1] + M.hi[1]) / 2, cz = (M.lo[2] + M.hi[2]) / 2;
      for (let f = 0; f < ntri; f++) for (let k = 0; k < 3; k++) { const v = M.F[f * 3 + k] * 3; P[f * 9 + k * 3] = M.V[v] - cx; P[f * 9 + k * 3 + 1] = M.V[v + 1] - cy; P[f * 9 + k * 3 + 2] = M.V[v + 2] - cz; for (let j = 0; j < 3; j++) Nn[f * 9 + k * 3 + j] = M.N[f * 3 + j]; }
      gl.bindBuffer(gl.ARRAY_BUFFER, nb); gl.bufferData(gl.ARRAY_BUFFER, P, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, nbuf); gl.bufferData(gl.ARRAY_BUFFER, Nn, gl.STATIC_DRAW);
      paint();
    }
    // colours for the current mode
    function paint() {
      if (!S.A) return; const { M, R } = S.A, base = document.documentElement.dataset.theme === 'paper' ? [0.80, 0.83, 0.88] : [0.86, 0.91, 0.98], warn = rgb('--warnc'), gold = rgb('--red'), ok = rgb('--okc');
      const sel = S.sel_r, fix = sel ? sel.issues : [];
      const lim = (() => { const t = fix.filter(i => i.id === 'thin'); const f = t.filter(i => i.sev === 'fix').map(i => i.val), w = t.map(i => i.val); return [f.length ? Math.max(...f) + 1e-6 : 0.6, w.length ? Math.max(...w) + 1e-6 : 1.2]; })();
      const C = new Float32Array(M.nf * 9), mo = S.mode, mf = R.pull.fl, ofl = R.up.fl;
      for (let f = 0; f < M.nf; f++) {
        let c = base;
        if (mo === 'thick') { const t = R.thick[f]; c = isNaN(t) ? base : t < lim[0] ? warn : t < lim[1] ? gold : base; }
        else if (mo === 'over') c = ofl[f] === 1 ? gold : ofl[f] === 2 ? ok : base;
        else if (mo === 'mould') c = mf[f] === 1 ? warn : mf[f] === 2 ? gold : base;
        else if (mo === 'reach') c = R.hidden[f] ? warn : base;
        for (let k = 0; k < 3; k++) C.set(c, f * 9 + k * 3);
      }
      if (gl) { gl.bindBuffer(gl.ARRAY_BUFFER, cbuf); gl.bufferData(gl.ARRAY_BUFFER, C, gl.DYNAMIC_DRAW); }
      $(app, '.st-legend').innerHTML = { shape: '', thick: `<i class="lg w"></i>thinner than ${f1(lim[0], 1)} mm <i class="lg g"></i>thinner than ${f1(lim[1], 1)} mm`, over: `<i class="lg g"></i>needs support when printed with ${DNAME[R.up.k]} up <i class="lg o"></i>sits on the bed`, mould: `<i class="lg w"></i>undercut <i class="lg g"></i>no draft (mould opens along ${AX[R.pull.ax]})`, reach: `<i class="lg w"></i>no cutter can reach it (${R.setups.length} setup${R.setups.length === 1 ? '' : 's'}: ${R.setups.map(k => DNAME[k]).join(', ') || '–'})` }[mo];
      app.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === mo));
    }
    function matrices(w, h) {
      const { M } = S.A, V = S.view, az = V.az * Math.PI / 180, el = V.el * Math.PI / 180;
      // world to view: turn about Z by az, then tilt so Z points up the screen at el = 0
      const ca = Math.cos(az), sa = Math.sin(az), t = -(Math.PI / 2 - el), ct = Math.cos(t), st = Math.sin(t);
      const Rz = [[ca, -sa, 0], [sa, ca, 0], [0, 0, 1]], Rx = [[1, 0, 0], [0, ct, -st], [0, st, ct]];
      const R = [0, 1, 2].map(i => [0, 1, 2].map(j => Rx[i][0] * Rz[0][j] + Rx[i][1] * Rz[1][j] + Rx[i][2] * Rz[2][j]));
      const s = 1.8 / (M.diag || 1) * V.k, ar = w / h, sx = s / Math.max(1, ar), sy = s * Math.min(1, ar), sz = -1 / (M.diag || 1);
      return { R, sx, sy, sz, px: V.px, py: V.py };
    }
    function project(p, w, h) {
      const { M } = S.A, X = matrices(w, h), c = [p[0] - (M.lo[0] + M.hi[0]) / 2, p[1] - (M.lo[1] + M.hi[1]) / 2, p[2] - (M.lo[2] + M.hi[2]) / 2];
      const v = X.R.map(r => r[0] * c[0] + r[1] * c[1] + r[2] * c[2]);
      return [(v[0] * X.sx + X.px + 1) / 2 * w, (1 - (v[1] * X.sy + X.py)) / 2 * h];
    }
    function draw() {
      const r = gl0.getBoundingClientRect(), dpr = window.devicePixelRatio || 1, w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
      $(app, '.dx-empty').hidden = !!S.A;
      [gl0, ov].forEach(c => { c.width = w; c.height = h; });
      const g = ov.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, r.width, r.height);
      if (!S.A) { if (gl) { gl.viewport(0, 0, w, h); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); } return; }
      if (!gl) { g.fillStyle = rgbStr('--faint'); g.font = '12px ' + cssv('--mono'); g.fillText('3D view needs WebGL, which this browser has turned off. The checks below still work.', 12, 24); return; }
      const X = matrices(w, h), R = X.R;
      const Mx = new Float32Array([R[0][0] * X.sx, R[1][0] * X.sy, R[2][0] * X.sz, 0, R[0][1] * X.sx, R[1][1] * X.sy, R[2][1] * X.sz, 0, R[0][2] * X.sx, R[1][2] * X.sy, R[2][2] * X.sz, 0, X.px, X.py, 0, 1]);
      const R3 = new Float32Array([R[0][0], R[1][0], R[2][0], R[0][1], R[1][1], R[2][1], R[0][2], R[1][2], R[2][2]]);
      gl.viewport(0, 0, w, h); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); gl.enable(gl.DEPTH_TEST);
      gl.useProgram(prog);
      const at = (nm, buf2) => { const l = gl.getAttribLocation(prog, nm); gl.bindBuffer(gl.ARRAY_BUFFER, buf2); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 3, gl.FLOAT, false, 0, 0); };
      at('p', nb); at('n', nbuf); at('c', cbuf);
      gl.uniformMatrix4fv(gl.getUniformLocation(prog, 'M'), false, Mx); gl.uniformMatrix3fv(gl.getUniformLocation(prog, 'R'), false, R3);
      gl.drawArrays(gl.TRIANGLES, 0, ntri * 3);
      // marks and an axis key
      const warn = rgbStr('--warnc'), gold = rgbStr('--red');
      g.font = '600 10px ' + cssv('--mono'); g.textAlign = 'center'; g.textBaseline = 'middle';
      (S.marks || []).forEach((x, i) => { const q = project(x.at, r.width, r.height), col = x.sev === 'fix' ? warn : gold, on = i === S.hover; g.strokeStyle = col; g.lineWidth = 1.2; g.beginPath(); g.moveTo(q[0], q[1]); g.lineTo(q[0], q[1] - 12); g.stroke(); g.fillStyle = col; g.beginPath(); g.arc(q[0], q[1] - 18, on ? 11 : 8, 0, TAU); g.fill(); g.fillStyle = rgbStr('--onink'); g.fillText(String(i + 1), q[0], q[1] - 18); });
      const ax0 = [34, r.height - 30], L = 18; g.font = '10px ' + cssv('--mono');
      [[1, 0, 0, 'X'], [0, 1, 0, 'Y'], [0, 0, 1, 'Z']].forEach(([a, b, c, n]) => { const v = R.map(rr => rr[0] * a + rr[1] * b + rr[2] * c); g.strokeStyle = rgbStr('--faint'); g.beginPath(); g.moveTo(ax0[0], ax0[1]); g.lineTo(ax0[0] + v[0] * L, ax0[1] - v[1] * L); g.stroke(); g.fillStyle = rgbStr('--faint'); g.fillText(n, ax0[0] + v[0] * (L + 7), ax0[1] - v[1] * (L + 7)); });
      g.textAlign = 'right'; g.fillText(name, r.width - 10, r.height - 10);
    }
    const cssv = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
    const rgbStr = n => cssv(n);
    // ------- events -------
    const readFile = f => { if (!f) return; if (!/\.stl$/i.test(f.name)) { out.innerHTML = `<section class="box dx-err"><h3>That is not an STL</h3><p>Choose an .stl file. From most CAD programs: File → Export → STL (binary, fine resolution). For flat drawings use <a href="dxf-check.html">Check a DXF</a>.</p></section>`; return; } if (f.size > 120e6) { out.innerHTML = `<section class="box dx-err"><h3>File too big</h3><p>Files over 120 MB are too large to check here. Export with a coarser resolution.</p></section>`; return; } const rd = new FileReader(); rd.onload = () => load(rd.result, f.name); rd.readAsArrayBuffer(f); };
    inp.addEventListener('change', () => readFile(inp.files[0]));
    drop.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inp.click(); } });
    ['dragenter', 'dragover'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add('over'); }));
    ['dragleave', 'drop'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.remove('over'); }));
    drop.addEventListener('drop', e => readFile(e.dataTransfer.files[0]));
    const VIEWS = { iso: [-40, 28], top: [0, 90], front: [0, 0], side: [-90, 0] };
    app.addEventListener('click', e => {
      const sm = e.target.closest('[data-sample]'); if (sm) { const k = SAMPLES[sm.dataset.sample]; ['mat', 'qty', 'load'].forEach(x => $(app, `[data-k=${x}]`).value = k[x]); ['env', 'prec', 'look'].forEach(x => $(app, `[data-k=${x}]`).value = 0); S.userMode = false; S.view = { az: -40, el: 28, k: 1, px: 0, py: 0 }; load(toSTL(k.make()), k.name); return; }
      const ps = e.target.closest('[data-sel]'); if (ps) { S.sel = +ps.dataset.sel; S.userMode = false; report(); draw(); return; }
      const md = e.target.closest('[data-mode]'); if (md) { S.mode = md.dataset.mode; S.userMode = true; paint(); draw(); return; }
      const vw = e.target.closest('[data-view]'); if (vw) { const v = VIEWS[vw.dataset.view]; Object.assign(S.view, { az: v[0], el: v[1], k: 1, px: 0, py: 0 }); draw(); return; }
      const pin = e.target.closest('[data-pin]'); if (pin && S.A) {
        const x = S.marks[+pin.dataset.pin]; if (!x) return; S.hover = +pin.dataset.pin;
        // turn so the mark faces the viewer: look along the normal of the nearest face
        const { M } = S.A; let bf = 0, bd = Infinity; for (let f = 0; f < M.nf; f++) { const d = Math.hypot(M.C[f * 3] - x.at[0], M.C[f * 3 + 1] - x.at[1], M.C[f * 3 + 2] - x.at[2]); if (d < bd) { bd = d; bf = f; } }
        const n = [M.N[bf * 3], M.N[bf * 3 + 1], M.N[bf * 3 + 2]]; S.view.el = Math.asin(Math.max(-1, Math.min(1, n[2]))) * 180 / Math.PI * 0.8 + 10; S.view.az = Math.atan2(n[0], -n[1]) * 180 / Math.PI;
        const r = gl0.getBoundingClientRect(); S.view.k = 2.2; S.view.px = S.view.py = 0; const X = matrices(r.width, r.height), c = [x.at[0] - (M.lo[0] + M.hi[0]) / 2, x.at[1] - (M.lo[1] + M.hi[1]) / 2, x.at[2] - (M.lo[2] + M.hi[2]) / 2], v = X.R.map(rr => rr[0] * c[0] + rr[1] * c[1] + rr[2] * c[2]); S.view.px = -v[0] * X.sx; S.view.py = -v[1] * X.sy; draw();
        gl0.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); return;
      }
    });
    app.addEventListener('change', e => { if (e.target.closest('[data-k]')) run(e.target.dataset.k === 'units'); });
    app.addEventListener('input', e => { if (e.target.matches('input[type=number][data-k]')) { clearTimeout(S.tm); S.tm = setTimeout(() => run(false), 350); } });
    // orbit by dragging, zoom with the wheel or a pinch, pan with two fingers or a right drag
    const pts = new Map(); let pinch = null;
    ov.addEventListener('contextmenu', e => e.preventDefault());
    ov.addEventListener('wheel', e => { if (!S.A) return; e.preventDefault(); S.view.k = Math.max(0.3, Math.min(40, S.view.k * Math.exp(-e.deltaY * 0.0015))); draw(); }, { passive: false });
    ov.addEventListener('pointerdown', e => { if (!S.A) return; ov.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY, b: e.button }); if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), k: S.view.k, m: [(a.x + b.x) / 2, (a.y + b.y) / 2], px: S.view.px, py: S.view.py }; } });
    ov.addEventListener('pointermove', e => {
      if (!S.A) return; const r = ov.getBoundingClientRect();
      if (pts.has(e.pointerId)) {
        const p = pts.get(e.pointerId), dx = e.clientX - p.x, dy = e.clientY - p.y; pts.set(e.pointerId, { x: e.clientX, y: e.clientY, b: p.b });
        if (pts.size === 2 && pinch) { const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y); S.view.k = Math.max(0.3, Math.min(40, pinch.k * d / pinch.d)); S.view.px = pinch.px + (((a.x + b.x) / 2 - pinch.m[0]) / r.width) * 2; S.view.py = pinch.py - (((a.y + b.y) / 2 - pinch.m[1]) / r.height) * 2; }
        else if (p.b === 2 || e.shiftKey) { S.view.px += dx / r.width * 2; S.view.py -= dy / r.height * 2; }
        else { S.view.az += dx * 0.4; S.view.el = Math.max(-89, Math.min(89, S.view.el + dy * 0.4)); }
        draw(); return;
      }
      const mx = e.clientX - r.left, my = e.clientY - r.top; let h = -1;
      (S.marks || []).forEach((x, i) => { const q = project(x.at, r.width, r.height); if (Math.hypot(q[0] - mx, q[1] - 18 - my) < 10) h = i; });
      if (h !== S.hover) { S.hover = h; ov.title = h >= 0 ? S.marks[h].text : ''; draw(); }
    });
    ['pointerup', 'pointercancel'].forEach(t => ov.addEventListener(t, e => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; }));
    let rw = 0; new ResizeObserver(() => { const w = gl0.getBoundingClientRect().width; if (Math.abs(w - rw) > 1) { rw = w; draw(); } }).observe(gl0);
    new MutationObserver(() => { paint(); draw(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    MN._state = S;
  };
  Object.assign(MN, { readSTL, toSTL, analyse, rank3, suggest3, SAMPLES, slice, ray });
})();
