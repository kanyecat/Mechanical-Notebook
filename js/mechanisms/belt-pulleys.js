(function () {
  const { TAU, COL } = MM, C1 = [190, 230], C2 = [530, 230], R1 = 80, D = C2[0] - C1[0], BW = 4;
  const W = (c, r, t) => [c[0] + r * Math.cos(t), c[1] - r * Math.sin(t)];  // world angle (y up) to canvas
  // belt loop as a dense polyline, ordered in the direction the belt moves
  function loop(R2, crossed) {
    const pts = [], arc = (c, r, t0, t1) => { const n = Math.max(8, Math.ceil(Math.abs(t1 - t0) * r / 6)); for (let i = 0; i <= n; i++) pts.push(W(c, r, t0 + (t1 - t0) * i / n)); };
    if (!crossed) {
      const f = Math.acos((R1 - R2) / D);
      arc(C1, R1, f, TAU - f); arc(C2, R2, -f, f);
    } else {
      const f = Math.acos((R1 + R2) / D);
      arc(C1, R1, f, TAU - f); arc(C2, R2, Math.PI - f, -Math.PI + f);
    }
    pts.push(pts[0]);
    const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return { pts, cum, L: cum[cum.length - 1] };
  }
  function at(lp, s) {
    s = ((s % lp.L) + lp.L) % lp.L; let i = 1; while (lp.cum[i] < s) i++;
    const t = (s - lp.cum[i - 1]) / (lp.cum[i] - lp.cum[i - 1] || 1), p0 = lp.pts[i - 1], p1 = lp.pts[i];
    return [p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t];
  }
  function pulley(g, c, r, rot) {
    const cc = g.c;
    g.circle(c[0], c[1], r, { fill: COL.white });
    g.hatchPath(() => { cc.beginPath(); cc.arc(c[0], c[1], r, 0, TAU); cc.arc(c[0], c[1], r * 0.72, 0, TAU, true); }, { spacing: 5, cx: c[0], cy: c[1] });
    g.circle(c[0], c[1], r * 0.72, { w: 1 });
    for (let k = 0; k < 4; k++) { const t = rot + k * TAU / 4; g.line(...W(c, 14, t), ...W(c, r * 0.72, t), { w: 3 }); }
    g.circle(c[0], c[1], 16, { fill: COL.white }); g.circle(c[0], c[1], 7, { fill: COL.ink });
    g.dot(...W(c, r * 0.86, rot + TAU / 8), 4.5, COL.red);
  }
  const ratio = p => (p.crossed ? -1 : 1) * R1 / p.r2;
  MM.register({
    slug: 'belt-pulleys', view: { w: 720, h: 460 },
    params: [{ key: 'r2', label: 'Driven radius', min: 30, max: 125, step: 1, value: 50 }, { key: 'crossed', label: 'Belt', min: 0, max: 1, step: 1, value: 0, options: [[0, 'Open'], [1, 'Crossed']] }],
    draw(g, a, p) {
      const R2 = p.r2, cr = p.crossed | 0, lp = loop(R2, cr);
      g.centre(C1[0], C1[1], R1 + 26); g.centre(C2[0], C2[1], R2 + 26);
      pulley(g, C1, R1, a); pulley(g, C2, R2, ratio(p) * a);
      g.poly(lp.pts, { close: false, w: BW, color: COL.ink });
      g.poly(lp.pts, { close: false, w: 1.2, color: COL.paper });
      const s0 = R1 * a; for (let s = 0; s < lp.L; s += 42) { const q = at(lp, s + s0); g.dot(q[0], q[1], 2.6, COL.red); }
      g.text('driver  Ø ' + (2 * R1), C1[0], C1[1] + R1 + 44, { size: 13, weight: 700, align: 'center' });
      g.text('driven  Ø ' + (2 * R2), C2[0], C2[1] + Math.max(R2, 60) + 44, { size: 13, weight: 700, align: 'center' });
      g.curvedArrow(C1[0], C1[1], R1 * 0.45, -0.6, -1.9, { ccw: true });
      if (cr) g.curvedArrow(C2[0], C2[1], Math.max(R2 * 0.45, 18), -1.9, -0.6, {}); else g.curvedArrow(C2[0], C2[1], Math.max(R2 * 0.45, 18), -0.6, -1.9, { ccw: true });
      g.text(cr ? 'crossed belt: directions reverse' : 'open belt: same direction', (C1[0] + C2[0]) / 2, 30, { size: 11, align: 'center', color: COL.faint });
    },
    graph: {
      title: 'Turns made (driver vs driven)', min: -3, max: 3, ticks: [{ v: -2, label: '−2' }, { v: 0, label: '0' }, { v: 2, label: '2' }],
      series: [
        { name: 'driver', color: COL.ink, f: t => t / TAU },
        { name: 'driven', color: COL.red, f: (t, p) => ratio(p) * t / TAU }
      ],
      readout(a, p) { return { big: Math.abs(ratio(p)).toFixed(2) + '×', small: 'driven speed ÷ driver speed' + (p.crossed ? ', reversed' : '') }; }
    }
  });
})();
