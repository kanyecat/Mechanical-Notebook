(function () {
  const { TAU, COL } = MM, O = [300, 250], M = 8, NR = 36, NG = 18, RR = NR * M / 2, RG = NG * M / 2, SR = TAU / NR, SG = TAU / NG, RE = 36;
  const W = (x, y) => [O[0] + x, O[1] - y];  // world (y up) to canvas
  // carrier angle a; the gear centre goes round at radius RR - RG and the gear itself turns by -a
  const pts = a => {
    const gx = (RR - RG) * Math.cos(a), gy = (RR - RG) * Math.sin(a);
    return { G: W(gx, gy), P: W(gx + RG * Math.cos(-a), gy + RG * Math.sin(-a)), E: W(gx + RE * Math.cos(Math.PI / 2 - a), gy + RE * Math.sin(Math.PI / 2 - a)), px: Math.cos(a) };
  };
  MM.register({
    slug: 'tusi-couple', view: { w: 600, h: 500 },
    draw(g, a) {
      const c = g.c, s = pts(a), ro = RR + 1.15 * M + 16;
      // fixed ring with internal teeth
      g.circle(O[0], O[1], ro, { fill: COL.white });
      g.hatchPath(() => { c.beginPath(); c.arc(O[0], O[1], ro, 0, TAU); }, { spacing: 6, cx: O[0], cy: O[1] });
      g.style({ w: 1.6, fill: COL.paper }); g.gearPath(O[0], O[1], NR, M, -0.38 * SR, true); c.fill(); c.stroke();
      g.circle(O[0], O[1], RR, { dash: [4, 3], color: COL.faint, w: 0.8 });
      // paths: P on a straight diameter, E on an ellipse, gear centre on a circle
      g.line(O[0] - RR - 6, O[1], O[0] + RR + 6, O[1], { w: 1.4, dash: [6, 4], color: 'rgba(255,209,102,.6)' });
      const ell = [], cir = []; for (let i = 0; i <= 120; i++) { const q = pts(i / 120 * TAU); ell.push(q.E); cir.push(q.G); }
      g.trace(ell, { color: COL.faint, w: 1, dash: [4, 4] }); g.trace(cir, { color: COL.faint, w: 0.8, dash: [2, 4] });
      // rolling gear (canvas angle = -world angle)
      const grot = a - 0.88 * SG;  // gear gap meets ring tooth at the contact point
      g.gear(s.G[0], s.G[1], NG, M, grot, { hatch: true, pitch: true });
      // carrier arm
      g.bar(O[0], O[1], s.G[0], s.G[1], 16, { nopivot: true, fill: 'rgba(31,85,144,.95)' });
      g.pivot(O[0], O[1], 9); g.pivot(s.G[0], s.G[1], 7);
      g.line(s.G[0], s.G[1], s.P[0], s.P[1], { w: 1, color: COL.faint }); g.line(s.G[0], s.G[1], s.E[0], s.E[1], { w: 1, color: COL.faint });
      g.dot(s.E[0], s.E[1], 5, COL.ink); g.dot(s.P[0], s.P[1], 7, COL.red);
      g.text('P', s.P[0] + 10, s.P[1] - 14, { size: 13, weight: 700, color: COL.red });
      g.text('E', s.E[0] + 10, s.E[1] - 10, { size: 13, weight: 700 });
      g.text('ring  N = ' + NR, O[0], O[1] + ro + 24, { size: 13, weight: 700, align: 'center' });
      g.text('gear  N = ' + NG, O[0], O[1] + ro + 42, { size: 11, align: 'center', color: COL.faint });
      g.curvedArrow(O[0], O[1], 34, -0.2, -1.4, { ccw: true });
    },
    graph: {
      title: 'Position along the diameter (ring radii)', min: -1.3, max: 1.3, ticks: [{ v: -1, label: '−1' }, { v: 0, label: '0' }, { v: 1, label: '+1' }],
      series: [
        { name: 'P', color: COL.red, f: t => Math.cos(t) },
        { name: 'gear centre', color: COL.ink, dash: [5, 4], w: 1.3, f: t => 0.5 * Math.cos(t) }
      ],
      readout(a) { const v = pts(a).px; return { big: (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(2), small: 'P along the diameter: a straight line' }; }
    }
  });
})();
