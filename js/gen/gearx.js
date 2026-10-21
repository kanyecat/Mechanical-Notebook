/* Crossed-axis gears for the gear generator: straight bevel pairs and worm drives. MIT licence.
   Loaded before gears.js, which hands over its tooth builder with GEARX(ctx).
   Bevel teeth use Tredgold's method: the tooth shape of a spur gear with z / cos(cone angle) teeth, wrapped onto z teeth and shrunk by cos(cone angle).
   A bevel gear is exported as a stack of flat layers that step down in size (laser cutting) or as one tapered part (STL).
   A worm is a helical thread: a stack of layers, each turned a little more than the last, or one twisted STL part. */
window.GEARX = function (C) {
  const G = C.G, TAU = Math.PI * 2, deg = Math.PI / 180, f = C.f;
  const nrm = v => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };
  const scaleShape = (sh, s, bore) => ({
    outer: sh.outer.map(([x, y]) => [x * s, y * s]), holes: (sh.holes || []).map(h => h.map(([x, y]) => [x * s, y * s])),
    circles: (bore > 0 ? [{ x: 0, y: 0, r: bore / 2 }] : []).concat((sh.circles || []).slice(bore > 0 ? 1 : 0).map(c => ({ x: c.x * s, y: c.y * s, r: c.r * s })))
  });
  const rotPts = (pts, a) => { const c = Math.cos(a), s = Math.sin(a); return pts.map(([x, y]) => [x * c - y * s, x * s + y * c]); };
  const poly = (p, a) => { const c = Math.cos(a), s = Math.sin(a); return p.map(([x, y]) => [x * c - y * s, x * s + y * c]); };

  // lays parts out left to right, wrapping into rows, for the flat layout
  const flow = W => { const o = { x: 0, y: 0, h: 0 }; o.put = (w, h) => { if (o.x > 0 && o.x + w > W) { o.x = 0; o.y -= o.h + 5; o.h = 0; } const c = [o.x + w / 2, o.y - h / 2]; o.x += w + 5; o.h = Math.max(o.h, h); return c; }; return o; };

  /* ================= bevel ================= */
  const bc = {};
  function bevel(S) {
    C.setStyle(S); const ST = C.ST();
    const key = [C.styleKey(), C.bodyKey(S), S.bz1, S.bz2, S.bsig, S.m, S.pa, S.bl, S.bface, S.bbore1, S.bbore2, S.fine, S.blay, S.bmake].join('|');
    if (bc.k === key) return bc.v;
    const m = S.m, alpha = S.pa * deg, n = S.fine ? 36 : 12, sig = S.bsig * deg, z = [S.bz1, S.bz2];
    const d1 = Math.atan2(Math.sin(sig), z[1] / z[0] + Math.cos(sig)), d = [d1, sig - d1];
    const A = m * z[0] / (2 * Math.sin(d1));
    let F = S.bface > 0 ? S.bface : Math.min(A / 3, 10 * m); F = Math.max(m, Math.min(F, A * 0.9));
    const gears = [0, 1].map(k => {
      const cd = Math.cos(d[k]), zv = z[k] / cd, g = C.external(zv, m, alpha, 0, S.bl, n, true), pts = [], kk = zv / z[k];
      for (let t = 0; t < z[k]; t++) { const a0 = t * TAU / z[k]; g.pts.forEach(([x, y]) => { const r = Math.hypot(x, y) * cd, th = Math.atan2(y, x) * kk + a0; pts.push([r * Math.cos(th), r * Math.sin(th)]); }); }
      const rf = g.rf * cd, bore = k ? S.bbore2 : S.bbore1, big = { pts: ST.rr > 0 ? C.fillet(pts, ST.rr * m * cd) : pts, rf, ra: g.ra * cd, rp: m * z[k] / 2, rb: g.rb * cd, pointed: g.pointed };
      const shape = C.gearShape(big, bore, S), lt = +S.blay > 0 ? +S.blay : 3;
      const Lax = F * cd, nl = S.bmake === 'layers' ? Math.max(1, Math.round(Lax / lt)) : 1;
      return { k, z: z[k], d: d[k], cd, zv, g: big, bore, shape, Lax, nl, lt, Fe: S.bmake === 'layers' ? nl * lt / cd : F, bore };
    });
    const v = { d, A, F, gears, sig, alpha, ST, m };
    bc.k = key; bc.v = v; return v;
  }
  // flat parts: the stack of layers (largest, at the back, first) or one tapered part per gear
  function bevelParts(S, layout) {
    const v = bevel(S), out = [], fl = flow(500); let ax = 0;
    v.gears.forEach(g => {
      const name = g.k ? `Bevel gear (${g.z}t)` : `Bevel pinion (${g.z}t)`, D = 2 * g.g.ra, acx = ax + g.g.ra; ax += D + 6;
      const sF = (v.A - v.F) / v.A;
      if (S.bmake === 'layers') {
        for (let l = 0; l < g.nl; l++) {
          const s = (v.A - (l + 0.5) * g.lt / g.cd) / v.A, [cx, cy] = layout === 'assembled' ? [acx, 0] : fl.put(D * s, D * s);
          out.push({ name: `${name} layer ${l + 1}/${g.nl}`, _g: g.k + 1, thickness: g.lt, z: layout === 'assembled' ? l * g.lt : 0, fill: g.k ? 'accent' : 'base',
            note: `Z${g.z} M${f(S.m, 2)} SCALE ${s.toFixed(3)}`, shapes: [G.placeShape(scaleShape(g.shape, s, g.bore), cx, cy, 0)] });
        }
      } else {
        const [cx, cy] = layout === 'assembled' ? [acx, 0] : fl.put(D, D);
        out.push({ name, _g: g.k + 1, thickness: g.Lax, z: 0, fill: g.k ? 'accent' : 'base', note: `Z${g.z} M${f(S.m, 2)} TAPER TO ${(sF * 100).toFixed(0)}%`, shapes: [G.placeShape(g.shape, cx, cy, 0)], taper: { c: [cx, cy], k1: sF } });
      }
    });
    return out;
  }

  function bevelModel(S, t) {
    const v = bevel(S), ST = v.ST, m = S.m, parts = [];
    const u = [[-1, 0], [Math.cos(Math.PI - v.sig), Math.sin(Math.PI - v.sig)]], c = [Math.cos(Math.PI - v.d[0]), Math.sin(Math.PI - v.d[0])];
    const e = u.map(uk => nrm([c[0] - (c[0] * uk[0] + c[1] * uk[1]) * uk[0], c[1] - (c[0] * uk[0] + c[1] * uk[1]) * uk[1]]));
    const at = (k, zz, rho) => [zz * u[k][0] + rho * e[k][0], zz * u[k][1] + rho * e[k][1]];
    const tipRoot = (g, a) => { const s = a / v.A, cd = Math.cos(g.d), sd = Math.sin(g.d), P = [a * cd, a * sd]; return { tip: [P[0] - ST.ha * m * s * sd, P[1] + ST.ha * m * s * cd], root: [P[0] + ST.hf * m * s * sd, P[1] - ST.hf * m * s * cd] }; };
    let maxX = 0;
    v.gears.forEach(g => {
      const tf = tipRoot(g, v.A - v.F), tb = tipRoot(g, v.A), bo = Math.min((g.bore || 0) / 2, tf.tip[1] * 0.8);
      [1, -1].forEach(sg => {
        const q = [[tf.tip[0], sg * tf.tip[1]], [tb.tip[0], sg * tb.tip[1]], [tb.tip[0], sg * bo], [tf.tip[0], sg * bo]].map(([zz, rho]) => at(g.k, zz, rho));
        q.forEach(p => maxX = Math.max(maxX, p[0]));
        parts.push({ name: 'side ' + g.k + sg, _g: g.k + 1, fill: g.k ? 'accent' : 'base', shapes: [{ outer: q }] });
      });
    });
    const R1 = v.gears[0].g.ra, R2 = v.gears[1].g.ra, ex1 = maxX + 30 + R2 * 0 + R1, ex2 = ex1 + R1 + 14 + R2;
    const cy = 0, th1 = t, th2 = t * S.bz1 / S.bz2;
    parts.push({ name: 'end 1', _g: 1, fill: 'base', shapes: [G.placeShape(v.gears[0].shape, ex1, cy, th1)] });
    parts.push({ name: 'end 2', _g: 2, fill: 'accent', shapes: [G.placeShape(v.gears[1].shape, ex2, cy, th2 + Math.PI / S.bz2)] });
    return {
      parts, guides(d) {
        const css = n => getComputedStyle(document.documentElement).getPropertyValue(n), ink = css('--ink');
        d.cross(0, 0, 8);
        v.gears.forEach(g => {
          const uk = u[g.k], len = (v.A + 12) * Math.cos(g.d) + 20;
          d.line(0, 0, uk[0] * len, uk[1] * len, { w: 0.8, dash: [10, 3, 2, 3] });          // shaft centre line
          // tooth lines on the cone: the turned gear shows them sliding round
          const phase = g.k ? t * S.bz1 / S.bz2 + Math.PI / S.bz2 : t;
          for (let i = 0; i < g.z; i++) {
            const ph = phase + i * TAU / g.z; if (Math.sin(ph) <= 0.02) continue;
            const cd = Math.cos(g.d), sd = Math.sin(g.d);
            const p0 = at(g.k, (v.A - v.F) * cd, (v.A - v.F) * sd * Math.cos(ph)), p1 = at(g.k, v.A * cd, v.A * sd * Math.cos(ph));
            d.line(p0[0], p0[1], p1[0], p1[1], { color: ink, w: 0.9 });
          }
        });
        if (d.guides()) {
          const L = v.A * 1.08; d.line(0, 0, c[0] * L, c[1] * L, { w: 0.9, dash: [6, 4] });   // where the pitch cones touch
          v.gears.forEach(g => { [-1, 1].forEach(sg => { const a1 = v.A + 6, pt = at(g.k, a1 * Math.cos(g.d), sg * a1 * Math.sin(g.d)); d.line(0, 0, pt[0], pt[1], { w: 0.7, dash: [2, 4] }); }); });
        }
        if (d.labels()) {
          v.gears.forEach(g => { const a = v.A - v.F / 2, P = at(g.k, a * Math.cos(g.d) + 0, -(a * Math.sin(g.d) + 22 / d.scale())); d.text('N = ' + g.z, P[0], P[1], { color: ink, weight: 700 }); });
          d.text('side view', 0, -10 / d.scale() - v.gears[1].g.ra * 0.2 - 18 / d.scale(), { size: 11 });
          d.text('pinion, large end', ex1, -R1 - 18 / d.scale(), { size: 11 }); d.text('gear, large end', ex2, -R2 - 18 / d.scale(), { size: 11 });
          d.text('δ1 = ' + f(v.d[0] / deg, 1) + '°', ...at(0, v.A * Math.cos(v.d[0]) * 0.25, v.A * Math.sin(v.d[0]) * 0.25 + 14 / d.scale()), { size: 11 });
        }
      }
    };
  }

  function bevelInfo(S) {
    const v = bevel(S), m = S.m, rows = [], [g1, g2] = v.gears, ratio = S.bz2 / S.bz1;
    rows.push(['Ratio', '1 : ' + f(ratio, 3)], ['Output speed', f(S.motor / ratio, 2) + ' rpm'], ['Output torque', f(S.torque * ratio, 2) + ' N·m']);
    rows.push(['Pitch cone angles', `${f(v.d[0] / deg, 2)}° / ${f(v.d[1] / deg, 2)}°`], ['Cone distance', f(v.A, 2) + ' mm'], ['Face width', f(v.F, 2) + ' mm' + (S.bmake === 'layers' ? ` (stack ${f(g1.Fe, 1)} / ${f(g2.Fe, 1)})` : '')]);
    rows.push(['Pinion pitch / tip / root Ø', `${f(2 * g1.g.rp)} / ${f(2 * g1.g.ra)} / ${f(2 * g1.g.rf)}`], ['Gear pitch / tip / root Ø', `${f(2 * g2.g.rp)} / ${f(2 * g2.g.ra)} / ${f(2 * g2.g.rf)}`]);
    rows.push(['Equivalent spur teeth', `${f(g1.zv, 1)} / ${f(g2.zv, 1)}`]);
    rows.push(['Mounting distance to apex', `${f(v.A * Math.cos(v.d[0]), 2)} / ${f(v.A * Math.cos(v.d[1]), 2)} mm`]);
    if (S.bmake === 'layers') rows.push(['Layers', `${g1.nl} + ${g2.nl} sheets of ${f(g1.lt, 1)} mm`]);
    if (v.F > v.A / 3 + 1e-6) rows.push(['Face too wide', 'Keep it under a third of the cone distance (' + f(v.A / 3, 1) + ' mm)', 2]);
    [g1, g2].forEach(g => { if (g.zv < 17 && !(g.g.pointed)) rows.push([`Undercut on ${g.k ? 'gear' : 'pinion'}`, 'Equivalent spur teeth under 17. Use more teeth.', 2]); if (g.g.pointed) rows.push(['Pointed teeth', 'Too few teeth for this style', 2]); });
    if (v.d[0] > 85 * deg || v.d[1] > 85 * deg) rows.push(['Nearly flat cone', 'A crown gear. Reduce the ratio or the shaft angle.', 2]);
    const rin = v.A - v.F, s = rin / v.A;
    [g1, g2].forEach(g => { if (g.bore / 2 + 1.5 > g.g.rf * s) rows.push([`Bore too big for ${g.k ? 'gear' : 'pinion'}`, 'It breaks through the small end', 2]); });
    if (Math.abs(S.bsig - 90) > 1e-6) rows.push(['Shaft angle', f(S.bsig, 1) + '° (not a right angle)']);
    return rows;
  }

  /* ================= worm ================= */
  const wc = {};
  function worm(S) {
    C.setStyle(S); const ST = C.ST();
    const key = [C.styleKey(), C.bodyKey(S), S.wn, S.wq, S.wz, S.m, S.pa, S.bl, S.fine, S.wbore, S.wbore2, S.whand].join('|');
    if (wc.k === key) return wc.v;
    const n = S.wn, q = S.wq, m = S.m, alpha = S.pa * deg, z2 = S.wz;
    const rw = q * m / 2, rW = m * z2 / 2, px = Math.PI * m, L = n * px, gam = Math.atan(n / q), hand = S.whand === 'left' ? -1 : 1;
    const g = C.external(z2, m, alpha, 0, S.bl, S.fine ? 36 : 12), wheel = C.gearShape(g, S.wbore2, S);
    const tA = Math.tan(alpha), s0 = px / 2 - S.bl / 2, ha = ST.ha * m, hf = ST.hf * m, tipHalf = Math.max(0.05, s0 / 2 - ha * tA);
    const U = [px / 2 - (s0 / 2 + hf * tA), px / 2 - tipHalf, px / 2 + tipHalf, px / 2 + (s0 / 2 + hf * tA)], Rr = [rw - hf, rw + ha, rw + ha, rw - hf];
    // radius of the worm as a function of axial position u (one thread pitch repeats), space centred on u = 0
    const prof = uu => { let u = ((uu % px) + px) % px; if (u <= U[0] || u >= U[3]) return rw - hf; if (u < U[1]) return Rr[0] + (Rr[1] - Rr[0]) * (u - U[0]) / (U[1] - U[0]); if (u <= U[2]) return rw + ha; return Rr[2] + (Rr[3] - Rr[2]) * (u - U[2]) / (U[3] - U[2]); };
    // end-on cross-section (right-handed: the thread turns counter-clockwise as it rises), r(θ) = prof(L θ / 2π)
    const sec = [];
    for (let j = 0; j < n; j++) {
      const kn = [0, U[0], U[1], U[2], U[3], px];
      for (let i = 0; i < 5; i++) {
        const sub = (i === 1 || i === 3) ? 5 : 3;
        for (let s = 0; s < sub; s++) { const uu = kn[i] + (kn[i + 1] - kn[i]) * s / sub, r = prof(uu + 1e-9), th = TAU * (j * px + uu) / L; sec.push([r * Math.cos(th), r * Math.sin(th)]); }
      }
    }
    const section = hand > 0 ? sec : sec.map(([x, y]) => [x, -y]).reverse();
    const v = { n, q, m, alpha, z2, rw, rW, a: rw + rW, px, L, gam, hand, g, wheel, section, prof, ST, ha, hf, U, Rr };
    wc.k = key; wc.v = v; return v;
  }
  const wlen = (S, v) => S.wlen > 0 ? S.wlen : Math.max(6 * v.px, 2 * Math.sqrt(Math.max(0, (v.rW + v.ha) ** 2 - (v.rW - v.hf) ** 2)) + 2 * v.px);
  // side silhouette of the worm: a rack-like outline whose threads slide along as the worm turns. xs: where a space sits on the wheel side
  function silhouette(v, Lw, xs) {
    const mk = (xsp, sgn) => {
      const pts = [], kmin = Math.floor((-Lw / 2 - xsp) / v.px) - 1, kmax = Math.ceil((Lw / 2 - xsp) / v.px) + 1;
      for (let k = kmin; k <= kmax; k++) for (let i = 0; i < 4; i++) pts.push([xsp + k * v.px + v.U[i], sgn * v.Rr[i]]);
      const clip = [], X0 = -Lw / 2, X1 = Lw / 2, yAt = x => { for (let i = 0; i < pts.length - 1; i++) if (x >= pts[i][0] && x <= pts[i + 1][0]) { const t = (x - pts[i][0]) / ((pts[i + 1][0] - pts[i][0]) || 1); return pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t; } return pts[0][1]; };
      clip.push([X0, yAt(X0)]); pts.forEach(p => { if (p[0] > X0 + 1e-6 && p[0] < X1 - 1e-6) clip.push(p); }); clip.push([X1, yAt(X1)]); return clip;
    };
    const top = mk(xs, 1), bot = mk(xs + v.L / 2, -1).reverse();
    return { outer: top.concat(bot) };
  }
  function wormParts(S, layout) {
    const v = worm(S), Lw = wlen(S, v), out = [], fl = flow(500), D = 2 * v.g.ra, asm = layout === 'assembled', Dw = 2 * (v.rw + v.ha);
    out.push({ name: `Worm wheel (${v.z2}t)`, _g: 2, thickness: S.wt, z: 0, fill: 'accent', note: `Z${v.z2} M${f(S.m, 2)} BORE ${S.wbore2}`, shapes: [G.placeShape(v.wheel, 0, 0, 0)], twist: { c: [0, 0], rate: v.hand * Math.tan(v.gam) / v.g.rp } });
    fl.put(D, D);
    const lt = +S.wlay, wx = D / 2 + Dw / 2 + 6;
    if (lt > 0) {
      const nl = Math.min(80, Math.max(1, Math.round(Lw / lt))), kb = G.boreShape(S.wbore / 2, 1);
      for (let l = 0; l < nl; l++) {
        const ang = v.hand * TAU * ((l + 0.5) * lt) / v.L, [cx, cy] = asm ? [wx, 0] : fl.put(Dw, Dw);
        out.push({ name: `Worm layer ${l + 1}/${nl}`, _g: 1, thickness: lt, z: asm ? l * lt : 0, fill: 'base', note: `TURN ${(((ang / deg) % 360 + 360) % 360).toFixed(1)} DEG KEYWAY ON +X`,
          shapes: [{ outer: G.xform(v.section, cx, cy, ang), holes: kb.holes.map(h => G.xform(h, cx, cy, 0)), circles: kb.circles.map(c => ({ x: c.x + cx, y: c.y + cy, r: c.r })) }] });
      }
    } else {
      const b = G.boreShape(S.wbore / 2, 0), [cx, cy] = asm ? [wx, 0] : fl.put(Dw, Dw);
      out.push({ name: `Worm (${v.n} start${v.n > 1 ? 's' : ''})`, _g: 1, thickness: Lw, z: 0, fill: 'base', note: `LEAD ${f(v.L, 2)} MM`, shapes: [{ outer: G.xform(v.section, cx, cy, 0), holes: [], circles: b.circles.map(c => ({ x: c.x + cx, y: c.y + cy, r: c.r })) }], twist: { c: [cx, cy], rate: v.hand * TAU / v.L, cap: 900, fine: 6 } });
    }
    return out;
  }
  function wormModel(S, t) {
    const v = worm(S), Lw = wlen(S, v), th = v.hand * v.n * t / v.z2, xs = v.rW * (th + Math.PI / 2);
    const sil = silhouette(v, Lw, xs - Math.floor(xs / v.px) * v.px);
    const parts = [{ name: 'Worm', _g: 1, fill: 'base', shapes: [sil] }, { name: 'Wheel', _g: 2, fill: 'accent', shapes: [G.placeShape(v.wheel, 0, v.a, th)] }];
    return {
      parts, guides(d) {
        const css = n => getComputedStyle(document.documentElement).getPropertyValue(n), ink = css('--ink');
        d.cross(0, v.a, 8); d.line(-Lw / 2 - 14, 0, Lw / 2 + 14, 0, { w: 0.8, dash: [10, 3, 2, 3] });
        const bo = Math.min(S.wbore / 2, v.rw - v.hf - 1); if (bo > 0) { d.line(-Lw / 2, bo, Lw / 2, bo, { w: 0.7, dash: [3, 3] }); d.line(-Lw / 2, -bo, Lw / 2, -bo, { w: 0.7, dash: [3, 3] }); }
        if (d.guides()) { d.line(-Lw / 2, v.rw, Lw / 2, v.rw, { w: 0.8, dash: [6, 4] }); d.line(-Lw / 2, -v.rw, Lw / 2, -v.rw, { w: 0.8, dash: [6, 4] }); d.circle(0, v.a, v.rW, { dash: [6, 4] }); }
        const mark = v.rW * 0.7, A = th + Math.PI / v.z2; d.dot(mark * Math.cos(A), v.a + mark * Math.sin(A), 4);
        if (d.labels()) {
          d.text('N = ' + v.z2, 0, v.a + v.g.ra + 18 / d.scale(), { color: ink, weight: 700 });
          d.text(v.n + (v.n > 1 ? ' starts' : ' start') + ' · lead ' + f(v.L, 1), 0, -v.rw - v.ha - 18 / d.scale(), { color: ink, weight: 700 });
          d.dim([0, 0], [0, v.a], 'a = ' + f(v.a, 2), -(Lw / 2 * d.scale() + 30));
        }
      }
    };
  }
  function wormInfo(S) {
    const v = worm(S), Lw = wlen(S, v), rows = [], ratio = v.z2 / v.n, mu = 0.1, rho = Math.atan(mu / Math.cos(v.alpha)), eta = Math.tan(v.gam) / Math.tan(v.gam + rho);
    rows.push(['Ratio', '1 : ' + f(ratio, 2)], ['Wheel speed', f(S.motor / ratio, 3) + ' rpm'], ['Output torque (μ = 0.1)', f(S.torque * ratio * eta, 2) + ' N·m']);
    rows.push(['Centre distance', f(v.a, 3) + ' mm'], ['Lead / lead angle', `${f(v.L, 2)} mm / ${f(v.gam / deg, 2)}°`], ['Worm pitch / tip / root Ø', `${f(2 * v.rw)} / ${f(2 * (v.rw + v.ha))} / ${f(2 * (v.rw - v.hf))}`]);
    rows.push(['Wheel pitch / tip / root Ø', `${f(2 * v.g.rp)} / ${f(2 * v.g.ra)} / ${f(2 * v.g.rf)}`], ['Worm length', f(Lw, 1) + ' mm'], ['Efficiency (μ = 0.1)', f(eta * 100, 0) + '%']);
    rows.push(v.gam < 5.7 * deg ? ['Self-locking', 'Probably: the wheel cannot drive the worm'] : ['Self-locking', 'No: the wheel can back-drive the worm']);
    if (S.wlay > 0) rows.push(['Worm layers', `${Math.min(80, Math.max(1, Math.round(Lw / S.wlay)))} sheets of ${f(S.wlay, 1)} mm, each turned ${f(360 * S.wlay / v.L, 1)}°`]);
    if (v.z2 < 17 && v.g.rf < v.g.rb) rows.push(['Undercut on the wheel', 'Use 17 or more teeth', 2]);
    if (v.n >= v.z2) rows.push(['Too many starts', 'The wheel needs more teeth than the worm has starts', 2]);
    if (S.wbore / 2 + 1 > v.rw - v.hf) rows.push(['Worm bore too big', 'It breaks through the thread root', 2]);
    if (S.wbore2 >= 2 * v.g.rf - 2 * v.m) rows.push(['Wheel bore too big', 'It cuts into the teeth', 2]);
    if (S.wlay > 0) rows.push(['Worm is a stack', 'The layers step round the thread. Use the keyway to line them up.']);
    rows.push(['Wheel teeth', 'Straight-cut here: the STL carries the lead-angle twist. Wheels are not throated, so use light loads.']);
    return rows;
  }

  return {
    defaults: { bz1: 15, bz2: 30, bsig: 90, bface: 0, bbore1: 6, bbore2: 8, bmake: 'layers', blay: 3, wn: 1, wq: 10, wz: 30, wlen: 0, wbore: 6, wbore2: 8, wt: 6, whand: 'right', wlay: 3 },
    panel(ui) {
      ui.section('Bevel pair', () => {
        ui.num('bz1', 'Pinion teeth', { min: 6, max: 100, int: 1 });
        ui.num('bz2', 'Gear teeth', { min: 6, max: 200, int: 1 });
        ui.num('bsig', 'Shaft angle', { unit: '°', min: 20, max: 150, step: 1, help: '90° is the usual right-angle drive. Equal teeth at 90° make a miter gear.' });
        ui.num('bface', 'Face width', { unit: 'mm', min: 0, max: 400, step: 0.5, help: '0 picks a third of the cone distance, up to 10 modules' });
        ui.num('bbore1', 'Pinion bore', { unit: 'mm', min: 0, max: 200, step: 0.5 });
        ui.num('bbore2', 'Gear bore', { unit: 'mm', min: 0, max: 200, step: 0.5 });
        ui.seg('bmake', 'Make it as', [['layers', 'Stack of layers'], ['smooth', 'One tapered part']]);
        ui.num('blay', 'Sheet thickness', { unit: 'mm', min: 0.5, max: 20, step: 0.1, show: S => S.bmake === 'layers', help: 'Each gear is cut as flat layers that step down in size. Stack and glue them.' });
        ui.note('Teeth are straight, shaped by Tredgold’s method. The DXF holds the layers; the STL is a tapered solid (stepped when layered). Spiral and hypoid bevels are not included.');
      }, { show: S => S.mode === 'bevel' });
      ui.section('Worm drive', () => {
        ui.seg('wn', 'Worm starts', [[1, '1'], [2, '2'], [3, '3'], [4, '4']]);
        ui.num('wz', 'Wheel teeth', { min: 12, max: 150, int: 1 });
        ui.num('wq', 'Worm diameter factor q', { min: 5, max: 20, step: 0.5, help: 'Worm pitch diameter = q × module. 8 to 12 is typical.' });
        ui.num('wlen', 'Worm length', { unit: 'mm', min: 0, max: 500, step: 1, help: '0 picks a length that covers the wheel contact' });
        ui.seg('whand', 'Hand', [['right', 'Right'], ['left', 'Left']]);
        ui.num('wbore', 'Worm bore', { unit: 'mm', min: 0, max: 100, step: 0.5 });
        ui.num('wbore2', 'Wheel bore', { unit: 'mm', min: 0, max: 200, step: 0.5 });
        ui.num('wt', 'Wheel thickness', { unit: 'mm', min: 0.5, max: 100, step: 0.5 });
        ui.num('wlay', 'Worm layer thickness', { unit: 'mm', min: 0, max: 20, step: 0.1, help: '0 makes one solid worm for 3D printing. Above 0 the worm is cut as layers, each turned a little more than the last, with a keyway to line them up.' });
        ui.note('The animation shows the worm from the side: its thread slides along as it turns.');
      }, { show: S => S.mode === 'worm' });
    },
    bevel, worm,
    model: (S, t) => S.mode === 'bevel' ? bevelModel(S, t) : wormModel(S, t),
    exportParts: (S, layout) => S.mode === 'bevel' ? bevelParts(S, layout) : wormParts(S, layout),
    info: S => S.mode === 'bevel' ? bevelInfo(S) : wormInfo(S),
    fileTag: S => S.mode === 'bevel' ? `m${S.m}-bevel-${S.bz1}x${S.bz2}-${S.bsig}deg` : `m${S.m}-worm-${S.wn}x${S.wz}`
  };
};
