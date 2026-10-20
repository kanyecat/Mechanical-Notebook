(function () {
  const { TAU, COL } = MM, P = 34;
  const rad = n => P / (2 * Math.sin(Math.PI / n));
  const Lof = (D, r1, r2) => { const ps = Math.acos((r1 - r2) / D); return 2 * D * Math.sin(ps) + r1 * (TAU - 2 * ps) + r2 * 2 * ps; };
  const cache = {};
  function layout(p) {
    const key = p.n1 + ',' + p.n2; if (cache[key]) return cache[key];
    const r1 = rad(p.n1), r2 = rad(p.n2), lo0 = Math.abs(r1 - r2) + 1;
    const D0 = Math.max(300, (r1 + r2) * 1.1 + 40), Nl = Math.max(8, Math.round(Lof(D0, r1, r2) / P)), target = Nl * P;
    let lo = lo0, hi = D0 + 4 * P; for (let i = 0; i < 80; i++) { const mid = (lo + hi) / 2; (Lof(mid, r1, r2) < target) ? lo = mid : hi = mid; }
    const D = (lo + hi) / 2, psi = Math.acos((r1 - r2) / D), Lt = D * Math.sin(psi), L = Lof(D, r1, r2), pitch = L / Nl;
    const S1 = 2 * Lt + 2 * r2 * psi, S2 = Lt;
    const u1 = Math.ceil(S1 / pitch - 1e-9) * pitch - S1, u2 = Math.ceil(S2 / pitch - 1e-9) * pitch - S2;
    return cache[key] = { r1, r2, D, psi, Lt, L, Nl, pitch, S1, S2, th1: -psi - u1 / r1, th2: psi - u2 / r2 };
  }
  function pt(s, Ly) {
    s = ((s % Ly.L) + Ly.L) % Ly.L; const { r1, r2, D, psi, Lt, S1 } = Ly, sn = Math.sin(psi), cs = Math.cos(psi);
    if (s < Lt) return [r1 * cs + s * sn, r1 * sn - s * cs];
    if (s < Lt + 2 * r2 * psi) { const t = psi - (s - Lt) / r2; return [D + r2 * Math.cos(t), r2 * Math.sin(t)]; }
    if (s < S1) { const u = s - Lt - 2 * r2 * psi; return [D + r2 * cs - u * sn, -r2 * sn - u * cs]; }
    const t = -psi - (s - S1) / r1; return [r1 * Math.cos(t), r1 * Math.sin(t)];
  }
  MM.register({
    slug: 'roller-chain', view: { w: 700, h: 420 },
    params: [{ key: 'n1', label: 'Driver teeth', min: 9, max: 30, step: 1, value: 14 }, { key: 'n2', label: 'Driven teeth', min: 9, max: 40, step: 1, value: 28 }],
    draw(g, a, p) {
      const c = g.c, Ly = layout(p), m1 = 2 * Ly.r1 / p.n1, m2 = 2 * Ly.r2 / p.n2;
      const left = -Ly.r1 - m1, right = Ly.D + Ly.r2 + m2, hh = Math.max(Ly.r1 + m1, Ly.r2 + m2);
      const sc = Math.min(1, 650 / (right - left), 190 / hh);
      c.save(); c.translate(350, 210); c.scale(sc, sc); c.translate(-(left + right) / 2, 0);
      const X = q => q[0], Y = q => -q[1];
      const rot1 = -(Ly.th1 - a) - 0.82 * TAU / p.n1, rot2 = -(Ly.th2 - a * Ly.r1 / Ly.r2) - 0.82 * TAU / p.n2;
      g.centre(0, 0, Ly.r1 + m1 * 3); g.centre(Ly.D, 0, Ly.r2 + m2 * 3);
      g.gear(0, 0, p.n1, m1, rot1, { hatch: true }); g.gear(Ly.D, 0, p.n2, m2, rot2, { hatch: true });
      g.circle(0, 0, 14, { fill: COL.white }); g.circle(0, 0, 6, { fill: COL.ink });
      g.circle(Ly.D, 0, 14, { fill: COL.white }); g.circle(Ly.D, 0, 6, { fill: COL.ink });
      // chain
      const pts = []; for (let k = 0; k < Ly.Nl; k++) pts.push(pt(k * Ly.pitch + a * Ly.r1, Ly));
      for (let k = 0; k < Ly.Nl; k++) { const q = pts[k], q2 = pts[(k + 1) % Ly.Nl]; g.bar(X(q), Y(q), X(q2), Y(q2), P * 0.3, { nopivot: true, fill: MM.tint('white', .9) }); }
      for (let k = 0; k < Ly.Nl; k++) { const q = pts[k]; g.circle(X(q), Y(q), P * 0.21, { fill: k === 0 ? COL.red : COL.white, color: k === 0 ? COL.red : COL.ink }); g.circle(X(q), Y(q), P * 0.07, { fill: COL.ink, w: 0.5 }); }
      c.restore();
      g.text('driver N = ' + p.n1, 350 + (-(Ly.D) / 2 - 0) * sc + (0 - 0), 22, { size: 12, weight: 700, align: 'center' });
      g.text('driven N = ' + p.n2, 350 + (Ly.D / 2) * sc, 22, { size: 12, weight: 700, align: 'center' });
      g.text(Ly.Nl + ' links', 350, 402, { size: 11, align: 'center', color: COL.faint });
    },
    graph: {
      title: 'Turns made (driver vs driven)', min: 0, max: 3.6, ticks: [{ v: 1, label: '1' }, { v: 2, label: '2' }, { v: 3, label: '3' }],
      series: [
        { name: 'driver', color: COL.ink, f: t => t / TAU },
        { name: 'driven', color: COL.red, f: (t, p) => (p.n1 / p.n2) * t / TAU }
      ],
      readout(a, p) { return { big: (p.n1 / p.n2).toFixed(2) + '×', small: 'driven speed ÷ driver speed, same direction' }; }
    }
  });
})();
