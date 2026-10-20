(function () {
  const { TAU, COL } = MM, O2 = [200, 360], A = 55, B = 150, Cc = 110, D = 140, O4 = [O2[0] + D, O2[1]];
  const U = 0.5 * B, V = -0.55 * B; // coupler point offset (along AB, perpendicular)
  function solve(a) {
    const ax = O2[0] + A * Math.cos(a), ay = O2[1] - A * Math.sin(a);
    const dx = O4[0] - ax, dy = O4[1] - ay, d = Math.hypot(dx, dy);
    const k = (B * B - Cc * Cc + d * d) / (2 * d), h = Math.sqrt(Math.max(B * B - k * k, 0));
    const mx = ax + k * dx / d, my = ay + k * dy / d;
    const bx = mx + h * dy / d, by = my - h * dx / d; // upper solution
    const ux = (bx - ax) / B, uy = (by - ay) / B;
    const px = ax + U * ux - V * uy, py = ay + U * uy + V * ux;
    return { ax, ay, bx, by, px, py, rock: Math.atan2(O4[1] - by, bx - O4[0]) };
  }
  const samples = []; for (let i = 0; i < 360; i++) samples.push(solve(i / 360 * TAU).rock * 180 / Math.PI);
  const lo = Math.floor(Math.min(...samples) / 10) * 10 - 10, hi = Math.ceil(Math.max(...samples) / 10) * 10 + 10;
  const curve = []; for (let i = 0; i <= 180; i++) { const s = solve(i / 180 * TAU); curve.push([s.px, s.py]); }
  MM.register({
    slug: 'four-bar', view: { w: 700, h: 460 },
    draw(g, a) {
      const s = solve(a);
      g.ground(O2[0] - 60, O4[0] + 60, O2[1] + 20);
      g.trace(curve, { color: MM.tint('red', .45), w: 1.4, dash: [5, 3] });
      g.poly([[s.ax, s.ay], [s.bx, s.by], [s.px, s.py]], { fill: MM.tint('white', .85), hatch: { spacing: 6, cx: s.px, cy: s.py } });
      g.bar(O2[0], O2[1], s.ax, s.ay, 12, { nopivot: true });
      g.bar(O4[0], O4[1], s.bx, s.by, 12, { nopivot: true });
      g.line(O2[0], O2[1], O4[0], O4[1], { w: 1, dash: [6, 4], color: COL.faint });
      g.pivot(O2[0], O2[1], 8); g.pivot(O4[0], O4[1], 8); g.pivot(s.ax, s.ay, 6); g.pivot(s.bx, s.by, 6);
      g.dot(s.px, s.py, 7, COL.red);
      g.text('crank', O2[0] + A * Math.cos(a) / 2 - 22, O2[1] - A * Math.sin(a) / 2 - 8, { size: 11, align: 'center', color: COL.faint });
      g.text('rocker', (O4[0] + s.bx) / 2 + 30, (O4[1] + s.by) / 2, { size: 11, align: 'center', color: COL.faint });
      g.text('coupler', (s.ax + s.bx) / 2, (s.ay + s.by) / 2 - 18, { size: 11, align: 'center', color: COL.faint });
      g.text('P', s.px + 12, s.py - 10, { size: 13, weight: 700, color: COL.red });
      g.text('frame', (O2[0] + O4[0]) / 2, O2[1] - 12, { size: 11, align: 'center', color: COL.faint });
    },
    graph: {
      title: 'Rocker angle (degrees)', min: lo, max: hi, ticks: [{ v: Math.round((lo + hi) / 20) * 10, label: '' }, { v: Math.ceil(lo / 10) * 10 + 10, label: Math.ceil(lo / 10) * 10 + 10 + '°' }, { v: Math.floor(hi / 10) * 10 - 10, label: Math.floor(hi / 10) * 10 - 10 + '°' }],
      series: [{ name: 'rocker', color: COL.red, f: t => solve(t).rock * 180 / Math.PI }],
      readout(a) { const v = solve(a).rock * 180 / Math.PI; return { big: v.toFixed(0) + '°', small: 'rocker angle (swing ' + (Math.max(...samples) - Math.min(...samples)).toFixed(0) + '°)' }; }
    }
  });
})();
