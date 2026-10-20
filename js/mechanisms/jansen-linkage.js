(function () {
  const { TAU, COL } = MM;
  // bar lengths (Theo Jansen's "holy numbers")
  const L = { a: 38.0, b: 41.5, c: 39.3, d: 40.1, e: 55.8, f: 39.4, g: 36.7, h: 65.7, i: 49.0, j: 50.0, k: 61.9, l: 7.8, m: 15.0 };
  const S = 4.3, OX = 300, OY = 210; // scale and canvas position of the fixed pivot O
  const O = [0, 0], Cax = [L.a, L.l];
  // two circle intersection; pick side via sign s (cross-product of P->Q and P->result)
  function ci(P, r1, Q, r2, s) {
    const dx = Q[0] - P[0], dy = Q[1] - P[1], d = Math.hypot(dx, dy);
    const k = (r1 * r1 - r2 * r2 + d * d) / (2 * d), h = Math.sqrt(Math.max(r1 * r1 - k * k, 0));
    const mx = P[0] + k * dx / d, my = P[1] + k * dy / d;
    const p1 = [mx - h * dy / d, my + h * dx / d], p2 = [mx + h * dy / d, my - h * dx / d];
    const cr = p => dx * (p[1] - P[1]) - dy * (p[0] - P[0]);
    return (cr(p1) * s > 0) ? p1 : p2;
  }
  // branch signs fixed from a reference assembly (crank angle 108 deg, measured from Jansen's drawing)
  const sg = { T: 0, L: 0, Y: 0, Z: 0, F: 0 };
  function solve(th, sgn) {
    const X = [Cax[0] + L.m * Math.cos(th), Cax[1] + L.m * Math.sin(th)];
    const T = ci(O, L.b, X, L.j, sgn.T), Lp = ci(O, L.d, T, L.e, sgn.L), Y = ci(O, L.c, X, L.k, sgn.Y);
    const Z = ci(Lp, L.f, Y, L.g, sgn.Z), F = ci(Z, L.h, Y, L.i, sgn.F);
    return { X, T, L: Lp, Y, Z, F };
  }
  // find the branch signs that reproduce the reference picture: T=(-14,39) L=(-38.5,-10.7) Y=(14,-36.8) Z=(-21.7,-46) F=(34,-81.4)
  (function () {
    for (const k of Object.keys(sg)) sg[k] = 1;
    const ref = { T: [-14, 39], L: [-38.5, -10.7], Y: [14, -36.8], Z: [-21.7, -46], F: [34, -81.4] };
    const th = 108 * Math.PI / 180, X = [Cax[0] + L.m * Math.cos(th), Cax[1] + L.m * Math.cos(th - Math.PI / 2)];
    const sign = (P, Q, R) => Math.sign((Q[0] - P[0]) * (R[1] - P[1]) - (Q[1] - P[1]) * (R[0] - P[0]));
    sg.T = sign(O, X, ref.T); sg.L = sign(O, ref.T, ref.L); sg.Y = sign(O, X, ref.Y); sg.Z = sign(ref.L, ref.Y, ref.Z); sg.F = sign(ref.Z, ref.Y, ref.F);
  })();
  const path = []; let ymin = 1e9, ymax = -1e9;
  for (let i = 0; i <= 360; i++) { const s = solve(i / 360 * TAU, sg); path.push(s.F); ymin = Math.min(ymin, s.F[1]); ymax = Math.max(ymax, s.F[1]); }
  const lift = th => solve(th, sg).F[1] - ymin;
  let onGround = 0; for (let i = 0; i < 360; i++) if (lift(i / 360 * TAU) < 0.9) onGround++;
  const P = (p) => [OX + p[0] * S, OY - p[1] * S];
  MM.register({
    slug: 'jansen-linkage', view: { w: 700, h: 640 }, _onGround: onGround / 360,
    draw(g, a) {
      const s = solve(a, sg), pp = {}; for (const k in s) pp[k] = P(s[k]);
      const gy = OY - ymin * S + 8;
      g.ground(60, 640, gy);
      g.trace(path.map(P), { color: 'rgba(255,209,102,.55)', w: 1.6, dash: [5, 4] });
      const O_ = P(O), C_ = P(Cax);
      // rigid plates
      g.poly([pp.T, pp.L, O_], { fill: 'rgba(31,85,144,.9)', hatch: { spacing: 6, cx: O_[0], cy: O_[1] } });
      g.poly([pp.Z, pp.Y, pp.F], { fill: 'rgba(31,85,144,.9)', hatch: { spacing: 6, cx: pp.Y[0], cy: pp.Y[1] } });
      const bar = (p, q) => g.bar(p[0], p[1], q[0], q[1], 9, { nopivot: true });
      bar(pp.T, pp.X); bar(pp.X, pp.Y); bar(O_, pp.Y); bar(pp.L, pp.Z);
      g.line(O_[0], O_[1], C_[0], C_[1], { w: 7, color: COL.ink });
      g.circle(C_[0], C_[1], L.m * S, { dash: [4, 4], color: COL.faint, w: 1 });
      g.line(C_[0], C_[1], pp.X[0], pp.X[1], { w: 6, color: COL.red });
      [O_, pp.T, pp.L, pp.Y, pp.Z, pp.X].forEach(q => g.pivot(q[0], q[1], 5));
      g.pivot(C_[0], C_[1], 6, { color: COL.red });
      g.dot(pp.F[0], pp.F[1], 7, COL.red);
      const lab = (t, p, dx, dy) => g.text(t, p[0] + dx, p[1] + dy, { size: 13, weight: 700, font: 'ui-serif,Georgia,serif' });
      lab('m', pp.X, 14, -2); lab('j', [(pp.T[0] + pp.X[0]) / 2, (pp.T[1] + pp.X[1]) / 2], 4, -12); lab('k', [(pp.X[0] + pp.Y[0]) / 2, (pp.X[1] + pp.Y[1]) / 2], 12, 6);
      lab('h', [(pp.Z[0] + pp.F[0]) / 2, (pp.Z[1] + pp.F[1]) / 2], -12, 6); lab('i', [(pp.Y[0] + pp.F[0]) / 2, (pp.Y[1] + pp.F[1]) / 2], 12, 4);
    },
    graph: {
      title: 'Foot height above the ground', min: -2, max: Math.ceil(ymax - ymin) + 4, ticks: [{ v: 0, label: '0' }, { v: 10, label: '10' }, { v: 20, label: '20' }],
      series: [{ name: 'foot', color: COL.red, f: t => lift(t) }],
      readout(a) { const h = lift(a); return h < 0.9 ? { big: 'STANCE', small: 'foot on the ground' } : { big: 'SWING', small: 'foot in the air' }; }
    }
  });
})();
