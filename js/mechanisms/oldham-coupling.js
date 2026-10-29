(function () {
  const { TAU, COL } = MM, C = [215, 235], K = 2.4;   // K: pixels per mm of offset
  const geo = (a, p) => {
    const e = p.e * K, O1 = [C[0], C[1] - e / 2], O2 = [C[0], C[1] + e / 2], u = [Math.cos(a), Math.sin(a)];
    const t = (O2[0] - O1[0]) * u[0] + (O2[1] - O1[1]) * u[1], M = [O1[0] + t * u[0], O1[1] + t * u[1]];
    return { e, O1, O2, u, v: [-u[1], u[0]], M };
  };
  const slot = (g, O, d, R, w, o) => { const n = [-d[1], d[0]]; [-1, 1].forEach(s => g.line(O[0] - d[0] * R + n[0] * s * w, O[1] - d[1] * R + n[1] * s * w, O[0] + d[0] * R + n[0] * s * w, O[1] + d[1] * R + n[1] * s * w, o)); };
  const tongue = (g, M, d, L, w, o) => { const n = [-d[1], d[0]]; g.poly([[M[0] - d[0] * L - n[0] * w, M[1] - d[1] * L - n[1] * w], [M[0] + d[0] * L - n[0] * w, M[1] + d[1] * L - n[1] * w], [M[0] + d[0] * L + n[0] * w, M[1] + d[1] * L + n[1] * w], [M[0] - d[0] * L + n[0] * w, M[1] - d[1] * L + n[1] * w]], o); };
  MM.register({
    slug: 'oldham-coupling', view: { w: 700, h: 470 }, thumb: 0.1,
    params: [{ key: 'e', label: 'Offset between the shafts', unit: ' mm', min: 0, max: 30, step: 1, value: 14 }],
    draw(g, a, p) {
      const q = geo(a, p), R = 130;
      // face view: input hub (behind), output hub outline, middle disc in front
      g.circle(q.O1[0], q.O1[1], R, { fill: MM.tint('white', .35), color: COL.faint });
      slot(g, q.O1, q.u, R, 15, { w: 1.2, color: COL.faint });
      g.circle(q.O2[0], q.O2[1], R, { dash: [6, 4], color: COL.blue, w: 1.2 });
      slot(g, q.O2, q.v, R, 15, { w: 1.2, color: COL.blue, dash: [6, 4] });
      g.circle(q.M[0], q.M[1], 105, { fill: COL.white });
      g.hatchPath(() => { g.c.beginPath(); g.c.arc(q.M[0], q.M[1], 105, 0, TAU); }, { spacing: 7, cx: q.M[0], cy: q.M[1] });
      tongue(g, q.M, q.u, 105, 13, { fill: MM.tint('red', .55) });
      tongue(g, q.M, q.v, 105, 13, { fill: 'transparent', color: COL.blue, dash: [5, 3] });
      g.dot(q.O1[0], q.O1[1], 4, COL.ink); g.dot(q.O2[0], q.O2[1], 4, COL.blue); g.dot(q.M[0], q.M[1], 5, COL.red);
      if (q.e > 0) g.circle(C[0], C[1], q.e / 2, { color: COL.red, w: 1, dash: [3, 3] });
      g.text('face view', C[0], 22, { size: 12, weight: 700, align: 'center' });
      g.text('red: tongue in the input slot · blue dashed: tongue in the output slot', 350, 452, { size: 10.5, align: 'center', color: COL.faint });
      // side view
      const X = 430, hub = (x, y, w, h, o) => g.rect(x, y - h / 2, w, h, o);
      g.text('side view', 560, 22, { size: 12, weight: 700, align: 'center' });
      g.rect(X - 10, q.O1[1] - 10, 60, 20, { fill: COL.white, hatch: false }); g.text('in', X - 4, q.O1[1] - 22, { size: 11, color: COL.faint });
      hub(X + 50, q.O1[1], 34, 2 * R, { fill: COL.white });
      hub(X + 88, q.M[1], 30, 210, { fill: COL.white, sp: 7 });
      g.rect(X + 84, q.M[1] - 13, 8, 26, { fill: MM.tint('red', .55), hatch: false }); g.rect(X + 114, q.M[1] - 105, 8, 210, { fill: 'transparent', hatch: false, color: COL.blue, dash: [4, 3] });
      hub(X + 122, q.O2[1], 34, 2 * R, { fill: COL.white });
      g.rect(X + 156, q.O2[1] - 10, 70, 20, { fill: COL.white, hatch: false }); g.text('out', X + 206, q.O2[1] - 22, { size: 11, color: COL.faint });
      g.line(X - 20, C[1], X + 240, C[1], { w: 0.8, dash: [10, 3, 2, 3], color: COL.faint });
    },
    graph: {
      title: 'Disc centre, up and down (mm)', min: -16, max: 16, ticks: [{ v: -10, label: '−10' }, { v: 0, label: '0' }, { v: 10, label: '10' }],
      series: [{ name: 'disc', color: COL.red, f: (t, p) => (geo(t, p).M[1] - C[1]) / K }],
      readout(a, p) { return { big: p.e + ' mm', small: 'the disc slides up to ' + p.e + ' mm each way in each slot; its centre circles twice per turn; both shafts keep the same speed' }; }
    }
  });
})();
