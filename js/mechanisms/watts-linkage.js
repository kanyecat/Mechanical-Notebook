(function () {
  const { TAU, COL } = MM, CX = 350, CY = 225;
  // geometry for arm length r and middle link c: O1 left (higher), O2 right (lower), link upright in the middle position
  const circ = (ax, ay, ra, bx, by, rb, near) => {   // the crossing of two circles nearest to `near`
    const dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy);
    if (d > ra + rb || d < Math.abs(ra - rb) || d === 0) return null;
    const k = (ra * ra - rb * rb + d * d) / (2 * d), h = Math.sqrt(Math.max(ra * ra - k * k, 0)), mx = ax + k * dx / d, my = ay + k * dy / d;
    const s1 = [mx + h * dy / d, my - h * dx / d], s2 = [mx - h * dy / d, my + h * dx / d];
    return Math.hypot(s1[0] - near[0], s1[1] - near[1]) < Math.hypot(s2[0] - near[0], s2[1] - near[1]) ? s1 : s2;
  };
  const pos = (r, c, th) => {
    const O1 = [CX - r, CY - c / 2], O2 = [CX + r, CY + c / 2], A = [O1[0] + r * Math.cos(th), O1[1] + r * Math.sin(th)];
    const B = circ(A[0], A[1], c, O2[0], O2[1], r, [CX, CY + c / 2 + r * Math.sin(th)]);
    return B ? { O1, O2, A, B, P: [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2] } : null;
  };
  const cache = {};
  const swing = (r, c) => {   // 85 % of the largest arm swing the linkage can make (both ways)
    const key = r + '|' + c; if (cache[key]) return cache[key];
    let lo = 0, hi = 1.4; for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; (pos(r, c, m) && pos(r, c, -m)) ? lo = m : hi = m; }
    return (cache[key] = Math.min(0.85 * lo, 0.6));
  };
  const at = (a, p) => pos(p.r, p.c, swing(p.r, p.c) * Math.sin(a));
  const err = (a, p) => { const s = at(a, p); return s ? s.P[0] - CX : 0; };
  MM.register({
    slug: 'watts-linkage', view: { w: 700, h: 460 }, thumb: 0.1,
    params: [
      { key: 'r', label: 'Arm length', unit: ' mm', min: 110, max: 190, step: 5, value: 160 },
      { key: 'c', label: 'Middle link', unit: ' mm', min: 40, max: 130, step: 5, value: 80 }
    ],
    draw(g, a, p) {
      const s = at(a, p); if (!s) return;
      const th = swing(p.r, p.c), path = [];
      for (let i = 0; i <= 80; i++) { const q = pos(p.r, p.c, -th + 2 * th * i / 80); if (q) path.push(q.P); }
      g.line(CX, 30, CX, 420, { w: 0.8, dash: [6, 5], color: COL.faint });
      g.trace(path, { color: MM.tint('red', .55), w: 1.6, dash: [5, 3] });
      [s.O1, s.O2].forEach(O => g.fixed(O[0], O[1], 9));
      g.bar(s.O1[0], s.O1[1], s.A[0], s.A[1], 13, { nopivot: true });
      g.bar(s.O2[0], s.O2[1], s.B[0], s.B[1], 13, { nopivot: true });
      g.bar(s.A[0], s.A[1], s.B[0], s.B[1], 15, { nopivot: true, fill: MM.tint('white', .95) });
      [s.A, s.B].forEach(q => g.pivot(q[0], q[1], 6));
      g.dot(s.P[0], s.P[1], 7, COL.red);
      g.text('P', s.P[0] + 14, s.P[1] - 8, { size: 13, weight: 700, color: COL.red });
      g.text('arm', (s.O1[0] + s.A[0]) / 2, (s.O1[1] + s.A[1]) / 2 - 16, { size: 11, align: 'center', color: COL.faint });
      g.text('arm', (s.O2[0] + s.B[0]) / 2, (s.O2[1] + s.B[1]) / 2 + 20, { size: 11, align: 'center', color: COL.faint });
      g.text('straight line', CX + 8, 40, { size: 11, color: COL.faint });
      g.text('path of P', CX + 24, 420, { size: 11, color: MM.tint('red', .9) });
    },
    graph: {
      title: 'Sideways error of P (mm)', min: -3, max: 3, ticks: [{ v: -2, label: '−2' }, { v: 0, label: '0' }, { v: 2, label: '2' }],
      series: [{ name: 'error', color: COL.red, f: (t, p) => Math.max(-3, Math.min(3, err(t, p))) }],
      readout(a, p) {
        const s = at(a, p); let mx = 0, ys = []; for (let i = 0; i <= 120; i++) { const q = at(i / 120 * TAU, p); if (q) { mx = Math.max(mx, Math.abs(q.P[0] - CX)); ys.push(q.P[1]); } }
        return { big: Math.abs(s ? s.P[0] - CX : 0).toFixed(2) + ' mm', small: 'off the line now; ' + mx.toFixed(2) + ' mm at most over a ' + (Math.max(...ys) - Math.min(...ys)).toFixed(0) + ' mm stroke' };
      }
    }
  });
})();
