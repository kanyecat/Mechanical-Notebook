(function () {
  const { TAU, COL } = MM, O = [190, 230], K = 3;   // K: pixels per mm
  const geo = (a, p) => {
    const e = p.e * K, L = p.L * K, C = [O[0] + e * Math.cos(a), O[1] - e * Math.sin(a)], x = C[0] + Math.sqrt(L * L - (C[1] - O[1]) ** 2);
    return { e, L, C, B: [x, O[1]], rd: e + 46 };
  };
  MM.register({
    slug: 'eccentric', view: { w: 700, h: 440 }, thumb: 0.15,
    tryit: { keys: ['e', 'L'], pose: 0.1, tasks: [
        { text: 'Make the rod travel 40 mm end to end (the stroke is twice the eccentricity).', now: p => 'stroke ' + 2 * p.e + ' mm', ok: p => p.e === 20 }] },
    params: [{ key: 'e', label: 'Eccentricity e', unit: ' mm', min: 5, max: 25, step: 1, value: 15 }, { key: 'L', label: 'Rod length', unit: ' mm', min: 80, max: 140, step: 5, value: 110 }],
    draw(g, a, p) {
      const q = geo(a, p), sr = q.rd + 16;
      g.line(O[0] - 150, O[1], 680, O[1], { w: 0.8, dash: [10, 3, 2, 3], color: COL.faint });
      // shaft runs through (seen end on)
      // strap (ring) and rod, one rigid piece
      const ang = Math.atan2(q.B[1] - q.C[1], q.B[0] - q.C[0]);
      g.bar(q.C[0], q.C[1], q.B[0], q.B[1], 22, { nopivot: true });
      g.circle(q.C[0], q.C[1], sr, { fill: COL.white });
      g.hatchPath(() => { g.c.beginPath(); g.c.arc(q.C[0], q.C[1], sr, 0, TAU); g.c.arc(q.C[0], q.C[1], q.rd + 2, 0, TAU, true); }, { spacing: 5, cx: q.C[0], cy: q.C[1] });
      // eccentric disc, keyed to the shaft
      g.circle(q.C[0], q.C[1], q.rd, { fill: MM.tint('red', .25) });
      g.circle(O[0], O[1], 24, { fill: COL.white }); g.circle(O[0], O[1], 9, { fill: COL.ink });
      g.dot(q.C[0], q.C[1], 4.5, COL.red);
      g.line(O[0], O[1], q.C[0], q.C[1], { w: 2, color: COL.red });
      // slider in its guide
      g.rect(q.B[0] - 30, O[1] - 26, 60, 52, { fill: COL.white });
      g.pivot(q.B[0], q.B[1], 7);
      g.rect(330, O[1] - 36, 330, 8, { hatch: false, fill: COL.paper, color: COL.faint }); g.rect(330, O[1] + 28, 330, 8, { hatch: false, fill: COL.paper, color: COL.faint });
      const x0 = O[0] + Math.sqrt(q.L * q.L) - q.e, x1 = O[0] + q.L + q.e;
      g.dim(x0, O[1] + 70, x1, O[1] + 70, 'stroke 2e = ' + 2 * p.e + ' mm', 0);
      g.text('e', (O[0] + q.C[0]) / 2 - 10, (O[1] + q.C[1]) / 2 - 10, { size: 13, weight: 700, color: COL.red });
      g.text('shaft', O[0], O[1] + q.rd + 46, { size: 11, align: 'center', color: COL.faint });
      g.text('eccentric (red) inside the strap', O[0], 30, { size: 11, align: 'center', color: COL.faint });
      g.text('valve rod', q.B[0], O[1] - 46, { size: 11, align: 'center', color: COL.faint });
    },
    graph: {
      title: 'Rod position (mm)', min: -27, max: 27, ticks: [{ v: -20, label: '−20' }, { v: 0, label: '0' }, { v: 20, label: '20' }],
      series: [{ name: 'rod', color: COL.red, f: (t, p) => (geo(t, p).B[0] - O[0] - p.L * K) / K }, { name: 'pure sine', color: COL.faint, dash: [4, 4], f: (t, p) => p.e * Math.cos(t) }],
      readout(a, p) { return { big: 2 * p.e + ' mm', small: 'stroke = 2 × eccentricity' }; }
    }
  });
})();
