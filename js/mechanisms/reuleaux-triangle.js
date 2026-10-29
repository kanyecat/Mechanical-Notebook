(function () {
  const { TAU, COL } = MM, W = 240, X0 = 70, Y0 = 100, R3 = Math.sqrt(3);
  // the Reuleaux triangle turned by phi, as an outline (centred on 0, 0)
  const outline = phi => {
    const V = [0, 1, 2].map(i => { const t = phi + Math.PI / 2 + i * TAU / 3; return [W / R3 * Math.cos(t), -W / R3 * Math.sin(t)]; }), P = [];
    for (let i = 0; i < 3; i++) {
      const c = V[i], a = V[(i + 1) % 3], b = V[(i + 2) % 3], a0 = Math.atan2(a[1] - c[1], a[0] - c[0]); let d = Math.atan2(b[1] - c[1], b[0] - c[0]) - a0;
      while (d > Math.PI) d -= TAU; while (d <= -Math.PI) d += TAU;
      for (let k = 0; k < 24; k++) { const t = a0 + d * k / 24; P.push([c[0] + W * Math.cos(t), c[1] + W * Math.sin(t)]); }
    }
    return { P, V };
  };
  // inside the square it always touches the left and top sides; that fixes where its centre is
  const place = phi => { const o = outline(phi); let mx = 1e9, my = 1e9; o.P.forEach(p => { mx = Math.min(mx, p[0]); my = Math.min(my, p[1]); }); return { dx: X0 - mx, dy: Y0 - my, o }; };
  const PATH = [], CPATH = [];
  for (let k = 0; k <= 360; k++) { const phi = -k / 360 * TAU, s = place(phi); PATH.push([s.o.V[0][0] + s.dx, s.o.V[0][1] + s.dy]); CPATH.push([s.dx, s.dy]); }
  MM.register({
    slug: 'reuleaux-triangle', hands: false, view: { w: 700, h: 440 }, thumb: 0.07,
    params: [{ key: 'trail', label: 'Show', min: 0, max: 2, step: 1, value: 2, options: [[0, 'Just the rotor'], [1, 'Path of one corner'], [2, 'Area it cuts']] }],
    draw(g, a, p) {
      const phi = -a, s = place(phi), pts = s.o.P.map(q => [q[0] + s.dx, q[1] + s.dy]);
      // the block with a square hole, and the guide plate
      g.rect(X0 - 40, Y0 - 40, W + 80, W + 80, { fill: COL.white, sp: 8 });
      g.rect(X0, Y0, W, W, { fill: COL.paper, hatch: false });
      if (p.trail === 2) g.poly(PATH, { fill: MM.tint('red', 0.18), color: MM.tint('red', 0.5), w: 1 });
      if (p.trail >= 1) g.trace(PATH, { color: COL.red, w: 1.4, dash: p.trail === 1 ? null : [4, 3] });
      g.poly(pts, { fill: MM.tint('white', 0.9), hatch: { spacing: 7 } });
      const v = s.o.V.map(q => [q[0] + s.dx, q[1] + s.dy]);
      v.forEach((q, i) => g.dot(q[0], q[1], i ? 3 : 5, i ? COL.ink : COL.red));
      // the centre wanders on a small, nearly round loop
      g.trace(CPATH, { color: COL.blue, w: 1.2 }); g.pivot(s.dx, s.dy, 6);
      g.curvedArrow(s.dx, s.dy, 30, -0.3, -2.1, {});
      // the explanation on the right
      const x = 420; g.text('A rotor of constant width', x, 70, { size: 13, weight: 700 });
      g.text('Its width is the same whichever', x, 96, { size: 11.5 }); g.text('way you measure it, so it can turn', x, 114, { size: 11.5 }); g.text('while touching all four sides.', x, 132, { size: 11.5 });
      g.dim(X0, Y0 + W + 58, X0 + W, Y0 + W + 58, 'w', 0, { ty: 14 });
      g.text('98.77 %', x, 190, { size: 30, weight: 800, color: COL.red });
      g.text('of the square is cut out: only', x, 214, { size: 11.5 }); g.text('four tiny curved corners are left', x, 232, { size: 11.5 });
      g.text('centre path', x, 280, { size: 11.5, color: COL.blue }); g.text('(three loops for every turn', x, 298, { size: 11, color: COL.faint }); g.text(' of the rotor, the other way)', x, 314, { size: 11, color: COL.faint });
      g.text('corner path', x, 344, { size: 11.5, color: COL.red });
    },
    graph: {
      title: 'Where the centre is (in rotor widths)', min: -0.1, max: 0.1, ticks: [{ v: -0.05, label: '−0.05' }, { v: 0, label: '0' }, { v: 0.05, label: '+0.05' }],
      series: [
        { name: 'centre across', color: COL.red, f: t => (place(-t).dx - (X0 + W / 2)) / W },
        { name: 'centre up and down', color: COL.blue, f: t => -(place(-t).dy - (Y0 + W / 2)) / W }
      ],
      readout(a) { const s = place(-a), off = Math.hypot(s.dx - X0 - W / 2, s.dy - Y0 - W / 2) / W; return { big: (off * 100).toFixed(1) + ' %', small: 'of the width: how far the centre is from the middle of the square now' }; }
    }
  });
})();
