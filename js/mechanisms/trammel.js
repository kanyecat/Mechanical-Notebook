(function () {
  const { TAU, COL } = MM, O = [330, 250], D = 110, ARM = 205, SW = 16;
  // A slides on the horizontal slot, B on the vertical slot. Pen P = A + t(B - A).
  const pos = (a, t) => { const A = [O[0] + D * Math.cos(a), O[1]], B = [O[0], O[1] - D * Math.sin(a)]; return { A, B, P: [A[0] + t * (B[0] - A[0]), A[1] + t * (B[1] - A[1])] }; };
  MM.register({
    slug: 'trammel', view: { w: 660, h: 500 },
    params: [{ key: 't', label: 'Pen along rod', min: 0.2, max: 1.8, step: 0.05, value: 1.5 }],
    draw(g, a, p) {
      const s = pos(a, p.t), ax = D * Math.abs(1 - p.t), by = D * p.t;
      // cross-shaped base with two slots
      const W2 = 26, cross = [[O[0] - W2, O[1] - ARM], [O[0] + W2, O[1] - ARM], [O[0] + W2, O[1] - W2], [O[0] + ARM, O[1] - W2], [O[0] + ARM, O[1] + W2], [O[0] + W2, O[1] + W2], [O[0] + W2, O[1] + ARM], [O[0] - W2, O[1] + ARM], [O[0] - W2, O[1] + W2], [O[0] - ARM, O[1] + W2], [O[0] - ARM, O[1] - W2], [O[0] - W2, O[1] - W2]];
      g.poly(cross, { fill: COL.white, hatch: { spacing: 6, cx: O[0], cy: O[1] } });
      g.poly([[O[0] - D - 18, O[1] - SW / 2], [O[0] + D + 18, O[1] - SW / 2], [O[0] + D + 18, O[1] + SW / 2], [O[0] - D - 18, O[1] + SW / 2]], { fill: COL.paper });
      g.poly([[O[0] - SW / 2, O[1] - D - 18], [O[0] + SW / 2, O[1] - D - 18], [O[0] + SW / 2, O[1] + D + 18], [O[0] - SW / 2, O[1] + D + 18]], { fill: COL.paper, w: 1.2 });
      g.centre(O[0], O[1], ARM + 20);
      // the ellipse the pen draws, and the part drawn so far this turn
      const full = [], done = [], u = ((a % TAU) + TAU) % TAU;
      for (let i = 0; i <= 180; i++) { const q = pos(i / 180 * TAU, p.t).P; full.push(q); if (i / 180 * TAU <= u) done.push(q); }
      done.push(s.P);
      g.trace(full, { color: MM.tint('red', .45), w: 1.2, dash: [5, 3] });
      g.trace(done, { color: COL.red, w: 2 });
      // sliders and rod
      [[s.A, 0], [s.B, 1]].forEach(([q, v]) => g.poly(v ? [[q[0] - 11, q[1] - 15], [q[0] + 11, q[1] - 15], [q[0] + 11, q[1] + 15], [q[0] - 11, q[1] + 15]] : [[q[0] - 15, q[1] - 11], [q[0] + 15, q[1] - 11], [q[0] + 15, q[1] + 11], [q[0] - 15, q[1] + 11]], { fill: COL.white }));
      const e0 = p.t < 0 ? s.P : s.A, e1 = p.t > 1 ? s.P : s.B;
      g.bar(e0[0], e0[1], e1[0], e1[1], 10, { nopivot: true, fill: MM.tint('white', .9) });
      g.pivot(s.A[0], s.A[1], 6); g.pivot(s.B[0], s.B[1], 6);
      g.dot(s.P[0], s.P[1], 7, COL.red);
      g.text('A', s.A[0] + 14, s.A[1] + 24, { size: 13, weight: 700 }); g.text('B', s.B[0] - 26, s.B[1] - 4, { size: 13, weight: 700 });
      g.text('P', s.P[0] + 12, s.P[1] - 10, { size: 13, weight: 700, color: COL.red });
      g.text('semi-axes ' + ax.toFixed(0) + ' × ' + by.toFixed(0), O[0], O[1] + ARM + 30, { size: 12, align: 'center', color: COL.faint });
    },
    graph: {
      title: 'Pen position (in rod lengths)', min: -1.9, max: 1.9, ticks: [{ v: -1, label: '−1' }, { v: 0, label: '0' }, { v: 1, label: '+1' }],
      series: [
        { name: 'pen x', color: COL.red, f: (t, p) => (pos(t, p.t).P[0] - O[0]) / D },
        { name: 'pen y', color: COL.ink, dash: [5, 4], w: 1.4, f: (t, p) => (O[1] - pos(t, p.t).P[1]) / D }
      ],
      readout(a, p) { const ax = Math.abs(1 - p.t), by = p.t; return { big: Math.abs(ax - by) < 0.01 ? 'CIRCLE' : (Math.max(ax, by) / Math.max(Math.min(ax, by), 1e-6)).toFixed(2) + ' : 1', small: 'ellipse long axis ÷ short axis' }; }
    }
  });
})();
