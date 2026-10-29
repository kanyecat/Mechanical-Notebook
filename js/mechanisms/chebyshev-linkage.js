(function () {
  const { TAU, COL } = MM, S = 105, X0 = 350 - S, Y0 = 380, MMU = 100;   // drawing: 105 px per unit, frame = 2 units (200 mm in the numbers)
  const sx = u => X0 + u * S, sy = v => Y0 - v * S;
  // y up, units: O1 = (0,0), O2 = (2,0); crossed side links of 2.5, top link of 1
  const solve = phi => {
    const A = [2 + 2.5 * Math.cos(phi), 2.5 * Math.sin(phi)], dx = -A[0], dy = -A[1], d = Math.hypot(dx, dy);
    if (d > 3.5 || d < 1.5) return null;
    const k = (1 - 6.25 + d * d) / (2 * d), h = Math.sqrt(Math.max(1 - k * k, 0)), mx = A[0] + k * dx / d, my = A[1] + k * dy / d;
    const s1 = [mx + h * dy / d, my - h * dx / d], s2 = [mx - h * dy / d, my + h * dx / d], B = s1[0] > s2[0] ? s1 : s2;
    return { A, B, P: [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2] };
  };
  const PHI0 = Math.atan2(2, -1.5);
  // drive so that P moves evenly either side of the middle: find the side-link angle that puts P at a chosen x
  const px = phi => { const q = solve(phi); return q ? q.P[0] : NaN; };
  const dir = px(PHI0 + 0.01) > px(PHI0) ? 1 : -1;
  const phiFor = x => { let lo = PHI0 - 0.7, hi = PHI0 + 0.7; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2, v = px(m); if (isNaN(v) ? m < PHI0 : (v < x) === (dir > 0)) lo = m; else hi = m; } return (lo + hi) / 2; };
  const at = (a, p) => solve(phiFor(1 + p.st / 2 / MMU * Math.sin(a)));
  MM.register({
    slug: 'chebyshev-linkage', view: { w: 700, h: 440 }, thumb: 0.12,
    params: [{ key: 'st', label: 'Stroke of P', unit: ' mm', min: 40, max: 200, step: 10, value: 140 }],
    draw(g, a, p) {
      const s = at(a, p); if (!s) return;
      const path = []; for (let i = 0; i <= 80; i++) { const q = solve(phiFor(1 + p.st / MMU * (i / 80 - 0.5))); if (q) path.push([sx(q.P[0]), sy(q.P[1])]); }
      g.ground(sx(-0.5), sx(2.5), Y0 + 14);
      g.line(sx(-0.4), sy(2), sx(2.4), sy(2), { w: 0.8, dash: [6, 5], color: COL.faint });
      g.trace(path, { color: MM.tint('red', .6), w: 1.8, dash: [5, 3] });
      g.bar(sx(0), sy(0), sx(s.B[0]), sy(s.B[1]), 13, { nopivot: true });
      g.bar(sx(2), sy(0), sx(s.A[0]), sy(s.A[1]), 13, { nopivot: true, fill: MM.tint('white', .9) });
      g.bar(sx(s.A[0]), sy(s.A[1]), sx(s.B[0]), sy(s.B[1]), 15, { nopivot: true, fill: MM.tint('white', .97) });
      [[0, 0], [2, 0]].forEach(q => g.fixed(sx(q[0]), sy(q[1]), 9));
      [s.A, s.B].forEach(q => g.pivot(sx(q[0]), sy(q[1]), 6));
      g.dot(sx(s.P[0]), sy(s.P[1]), 7, COL.red);
      g.text('P', sx(s.P[0]), sy(s.P[1]) - 18, { size: 13, weight: 700, color: COL.red, align: 'center' });
      g.text('frame 2', sx(1), Y0 + 34, { size: 11, align: 'center', color: COL.faint });
      g.text('links 2.5, crossed', sx(1), sy(0.9), { size: 11, align: 'center', color: COL.faint });
      g.text('top link 1', sx(2.45), sy(2.2), { size: 11, color: COL.faint });
      g.text('straight line', sx(-0.4), sy(2) - 10, { size: 11, color: COL.faint });
    },
    graph: {
      title: 'Height of P above the line (mm)', min: -0.1, max: 0.6, ticks: [{ v: 0, label: '0' }, { v: 0.25, label: '0.25' }, { v: 0.5, label: '0.5' }],
      series: [{ name: 'height', color: COL.red, f: (t, p) => { const s = at(t, p); return s ? Math.min(0.6, (s.P[1] - 2) * MMU) : 0; } }],
      readout(a, p) {
        let lo = Infinity, hi = -Infinity, xl = Infinity, xh = -Infinity;
        for (let i = 0; i <= 160; i++) { const q = at(i / 160 * TAU, p); if (q) { lo = Math.min(lo, q.P[1]); hi = Math.max(hi, q.P[1]); xl = Math.min(xl, q.P[0]); xh = Math.max(xh, q.P[0]); } }
        return { big: ((hi - lo) * MMU).toFixed(2) + ' mm', small: 'rise and fall of P over a ' + ((xh - xl) * MMU).toFixed(0) + ' mm stroke (frame 200 mm)' };
      }
    }
  });
})();
