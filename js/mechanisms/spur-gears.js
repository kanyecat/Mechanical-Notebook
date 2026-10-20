(function () {
  const { TAU, COL } = MM;
  const geo = p => {
    const n1 = p.n1, n2 = p.n2, m = Math.min(12, 660 / (n1 + n2), 380 / (Math.max(n1, n2) + 2));
    const r1 = n1 * m / 2, r2 = n2 * m / 2, D = r1 + r2, c1x = 350 - D + r1, cy = 210;
    return { n1, n2, m, r1, r2, D, c1x, c2x: c1x + D, cy };
  };
  MM.register({
    slug: 'spur-gears', view: { w: 700, h: 420 },
    params: [{ key: 'n1', label: 'Driver teeth', min: 8, max: 30, step: 1, value: 12 }, { key: 'n2', label: 'Driven teeth', min: 8, max: 40, step: 1, value: 24 }],
    draw(g, a, p) {
      const q = geo(p), s1 = TAU / q.n1, s2 = TAU / q.n2;
      const rot1 = a - 0.38 * s1, rot2 = Math.PI - 0.82 * s2 - (q.n1 / q.n2) * a;
      g.centre(q.c1x, q.cy, q.r1 + q.m * 3); g.centre(q.c2x, q.cy, q.r2 + q.m * 3);
      g.gear(q.c1x, q.cy, q.n1, q.m, rot1, { hatch: true, pitch: true });
      g.gear(q.c2x, q.cy, q.n2, q.m, rot2, { hatch: true, pitch: true });
      [[q.c1x, q.r1, rot1, s1], [q.c2x, q.r2, rot2, s2]].forEach(([cx, r, rot, st]) => {
        g.circle(cx, q.cy, Math.max(r * 0.16, 6), { fill: COL.white }); g.circle(cx, q.cy, Math.max(r * 0.07, 3), { fill: COL.ink });
        const ang = rot + 0.38 * st, rr = r - q.m * 2.4;
        g.dot(cx + rr * Math.cos(ang), q.cy + rr * Math.sin(ang), 5, COL.red);
      });
      g.dot(q.c1x + q.r1, q.cy, 3.5, COL.ink);
      g.text('pitch point', q.c1x + q.r1, q.cy + q.m * 2 + 24, { size: 11, align: 'center', color: COL.faint });
      g.text('N = ' + q.n1, q.c1x, q.cy - q.r1 - q.m * 2 - 12, { size: 13, weight: 700, align: 'center' });
      g.text('N = ' + q.n2, q.c2x, q.cy - q.r2 - q.m * 2 - 12, { size: 13, weight: 700, align: 'center' });
      g.curvedArrow(q.c1x, q.cy, Math.max(q.r1 * 0.5, 16), -2.6, -1.4, {});
      g.curvedArrow(q.c2x, q.cy, Math.max(q.r2 * 0.5, 16), -0.5, -1.7, { ccw: true });
    },
    graph: {
      title: 'Turns made (driver vs driven)', min: -4, max: 4, ticks: [{ v: -2, label: '−2' }, { v: 0, label: '0' }, { v: 2, label: '2' }, { v: 4, label: '4' }],
      series: [
        { name: 'driver', color: COL.ink, f: t => t / TAU },
        { name: 'driven', color: COL.red, f: (t, p) => -(p.n1 / p.n2) * t / TAU }
      ],
      readout(a, p) { return { big: (p.n1 / p.n2).toFixed(2) + '×', small: 'driven speed ÷ driver speed, turning the opposite way' }; }
    }
  });
})();
