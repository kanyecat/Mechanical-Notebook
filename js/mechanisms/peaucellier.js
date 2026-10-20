(function () {
  const { TAU, COL } = MM, O = [120, 240], LL = 200, S = 100, DD = 75, LINE_X = O[0] + (LL * LL - S * S) / (2 * DD), F = [O[0] + DD, O[1]];
  function solve(a, deg) {
    const psi = deg * Math.PI / 180 * Math.sin(a), q = 2 * DD * Math.cos(psi);
    const u = [Math.cos(psi), Math.sin(psi)], Q = [O[0] + q * u[0], O[1] + q * u[1]];
    const k = (LL * LL - S * S + q * q) / (2 * q), h = Math.sqrt(Math.max(LL * LL - k * k, 0)), mx = O[0] + k * u[0], my = O[1] + k * u[1];
    const A = [mx - h * u[1], my + h * u[0]], B = [mx + h * u[1], my - h * u[0]];
    const Pp = [A[0] + B[0] - Q[0], A[1] + B[1] - Q[1]]; // rhombus: P = A + B - Q
    return { Q, A, B, P: Pp, err: Pp[0] - LINE_X };
  }
  MM.register({
    slug: 'peaucellier', view: { w: 700, h: 480 },
    params: [{ key: 'swing', label: 'Input swing', unit: '°', min: 10, max: 44, step: 1, value: 40 }],
    draw(g, a, p) {
      const s = solve(a, p.swing);
      g.line(LINE_X, O[1] - 215, LINE_X, O[1] + 215, { w: 1, dash: [3, 4], color: COL.faint });
      g.text('straight line', LINE_X + 10, O[1] - 222, { size: 11, color: COL.faint });
      g.circle(F[0], F[1], DD, { dash: [4, 4], color: COL.faint, w: 0.9 });
      g.poly([s.A, s.P, s.B, s.Q], { fill: 'rgba(255,209,102,.06)' });
      g.bar(O[0], O[1], s.A[0], s.A[1], 10, { nopivot: true }); g.bar(O[0], O[1], s.B[0], s.B[1], 10, { nopivot: true });
      g.bar(s.A[0], s.A[1], s.P[0], s.P[1], 10, { nopivot: true }); g.bar(s.B[0], s.B[1], s.P[0], s.P[1], 10, { nopivot: true });
      g.bar(s.A[0], s.A[1], s.Q[0], s.Q[1], 10, { nopivot: true }); g.bar(s.B[0], s.B[1], s.Q[0], s.Q[1], 10, { nopivot: true });
      g.bar(F[0], F[1], s.Q[0], s.Q[1], 12, { nopivot: true, fill: 'rgba(255,209,102,.18)', color: COL.red });
      g.fixed(O[0], O[1], 9); g.fixed(F[0], F[1], 9);
      [s.A, s.B, s.Q].forEach(q => g.pivot(q[0], q[1], 5));
      g.pivot(s.P[0], s.P[1], 5); g.dot(s.P[0], s.P[1], 7, COL.red); g.dot(s.Q[0], s.Q[1], 5, COL.red);
      g.text('O', O[0] - 22, O[1] - 6, { size: 13, weight: 700 }); g.text('Q', s.Q[0] + 10, s.Q[1] - 12, { size: 13, weight: 700 });
      g.text('P', s.P[0] + 12, s.P[1] - 8, { size: 13, weight: 700, color: COL.red });
    },
    graph: {
      title: 'P along the line, and its sideways error', min: -1.3, max: 1.3, ticks: [{ v: -1, label: '−1' }, { v: 0, label: '0' }, { v: 1, label: '+1' }],
      series: [
        { name: 'P position', color: COL.red, f: (t, p) => (solve(t, p.swing).P[1] - O[1]) / 200 },
        { name: 'error ×100', color: COL.ink, dash: [5, 4], w: 1.4, f: (t, p) => solve(t, p.swing).err / 200 * 100 }
      ],
      readout(a, p) { return { big: Math.abs(solve(a, p.swing).err).toFixed(3) + ' px', small: 'P distance off the straight line' }; }
    }
  });
})();
