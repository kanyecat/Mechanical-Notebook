(function () {
  const { TAU, COL } = MM, O = [90, 410], PC = [500, 190], R = 78, LB = 300;
  const STAR = []; for (let i = 0; i < 10; i++) { const t = -Math.PI / 2 + i * TAU / 10, r = i % 2 ? 0.42 : 1; STAR.push([Math.cos(t) * r, Math.sin(t) * r]); }
  const shape = u => { u = ((u % 1) + 1) % 1; const f = u * 10, i = Math.floor(f), w = f - i, a = STAR[i], b = STAR[(i + 1) % 10]; return [a[0] + (b[0] - a[0]) * w, a[1] + (b[1] - a[1]) * w]; };
  const geo = (a, k) => {
    const s = shape(a / TAU), P = [PC[0] + R * s[0], PC[1] + R * s[1]], T = [O[0] + (P[0] - O[0]) / k, O[1] + (P[1] - O[1]) / k];
    const dx = P[0] - O[0], dy = P[1] - O[1], d = Math.hypot(dx, dy), h = Math.sqrt(Math.max(LB * LB - d * d / 4, 0));
    const C = [O[0] + dx / 2 + h * dy / d, O[1] + dy / 2 - h * dx / d];   // the elbow on the upper-left side of the line O–P
    const A = [O[0] + (C[0] - O[0]) / k, O[1] + (C[1] - O[1]) / k], D = [C[0] + (P[0] - C[0]) / k, C[1] + (P[1] - C[1]) / k];
    return { P, T, C, A, D };
  };
  MM.register({
    slug: 'pantograph', view: { w: 700, h: 470 }, thumb: 0.05,
    params: [{ key: 'k', label: 'Scale', min: 2, max: 3, step: 1, value: 2, options: [[2, '2×'], [3, '3×']] }],
    draw(g, a, p) {
      const k = p.k, s = geo(a, k), pp = [], tp = [];
      for (let i = 0; i <= 100; i++) { const q = geo(i / 100 * TAU, k); pp.push(q.P); tp.push(q.T); }
      g.trace(pp, { color: MM.tint('red', .5), w: 1.4, dash: [5, 3] }); g.trace(tp, { color: MM.tint('blue', .7), w: 1.4, dash: [4, 3] });
      const done = []; for (let i = 0; i <= 60; i++) { const t = a - TAU * Math.min(0.999, (((a / TAU) % 1) + 1) % 1) * (1 - i / 60); done.push(geo(t, k).P); }
      g.trace(done, { color: COL.red, w: 2.6 });
      g.line(O[0], O[1], s.P[0], s.P[1], { w: 0.8, dash: [6, 5], color: COL.faint });
      g.bar(O[0], O[1], s.C[0], s.C[1], 12, { nopivot: true });
      g.bar(s.C[0], s.C[1], s.P[0], s.P[1], 12, { nopivot: true });
      g.bar(s.A[0], s.A[1], s.T[0], s.T[1], 10, { nopivot: true, fill: MM.tint('white', .95) });
      g.bar(s.T[0], s.T[1], s.D[0], s.D[1], 10, { nopivot: true, fill: MM.tint('white', .95) });
      g.fixed(O[0], O[1], 9);
      [s.A, s.C, s.D].forEach(q => g.pivot(q[0], q[1], 5.5));
      g.dot(s.T[0], s.T[1], 7, COL.blue); g.dot(s.P[0], s.P[1], 7, COL.red);
      g.text('O', O[0] - 22, O[1] - 6, { size: 13, weight: 700 });
      g.text('T tracer', s.T[0] + 12, s.T[1] + 18, { size: 12, weight: 700, color: COL.blue });
      g.text('P pen', s.P[0] + 14, s.P[1] + 18, { size: 12, weight: 700, color: COL.red });
      g.text('OP = ' + k + ' × OT', 600, 440, { size: 12, weight: 700, align: 'center' });
    },
    graph: {
      title: 'Sideways movement (mm)', min: -90, max: 90, ticks: [{ v: -60, label: '−60' }, { v: 0, label: '0' }, { v: 60, label: '60' }],
      series: [
        { name: 'tracer T', color: COL.blue, f: (t, p) => R * shape(t / TAU)[0] / p.k },
        { name: 'pen P', color: COL.red, f: t => R * shape(t / TAU)[0] }
      ],
      readout(a, p) { return { big: p.k + '×', small: 'the pen moves ' + p.k + ' times as far as the tracer, in the same direction' }; }
    }
  });
})();
