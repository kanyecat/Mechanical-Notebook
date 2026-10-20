(function () {
  const { TAU, COL } = MM, J1 = [210, 340], LM = 250, SR = 11;
  const deg = Math.PI / 180;
  // one Hooke's joint at angle b: tan(out) = tan(in) / cos(b), kept continuous
  const joint = (t, b) => Math.atan2(Math.sin(t), Math.cos(t) * Math.cos(b));
  const speed = (t, b) => Math.cos(b) / (Math.cos(b) ** 2 * Math.cos(t) ** 2 + Math.sin(t) ** 2);
  const unwrap = (x, ref) => x + Math.round((ref - x) / TAU) * TAU;
  function angles(a, p) {
    const b = p.beta * deg, m = unwrap(joint(a, b), a);
    // second joint in phase undoes the first; 90° out of phase doubles the swing
    const o = p.phase ? unwrap(Math.atan2(Math.sin(m) * Math.cos(b), Math.cos(m)), a) : unwrap(joint(m, b), a);
    const wm = speed(a, b), wo = p.phase ? 1 : wm * speed(m, b);
    return { b, m, o, wm, wo };
  }
  // shaft seen from the side: body, plus a stripe that shows how far it has turned
  function shaft(g, x1, y1, x2, y2, rot, color, w) {
    g.bar(x1, y1, x2, y2, 2 * SR, { nopivot: true });
    const L = Math.hypot(x2 - x1, y2 - y1), nx = -(y2 - y1) / L, ny = (x2 - x1) / L, off = SR * 0.8 * Math.sin(rot), front = Math.cos(rot) > 0;
    g.line(x1 + nx * off + (x2 - x1) * 0.06, y1 + ny * off + (y2 - y1) * 0.06, x2 + nx * off - (x2 - x1) * 0.06, y2 + ny * off - (y2 - y1) * 0.06, { w: w || 2.4, color: front ? color : COL.faint, dash: front ? [] : [4, 4] });
  }
  function fork(g, jx, jy, ux, uy, rot) {
    const nx = -uy, ny = ux, s = 20 * Math.cos(rot);
    [-1, 1].forEach(k => g.line(jx - ux * 26 + nx * s * k, jy - uy * 26 + ny * s * k, jx + nx * s * k, jy + ny * s * k, { w: 3 }));
    g.line(jx - ux * 26 - nx * s, jy - uy * 26 - ny * s, jx - ux * 26 + nx * s, jy - uy * 26 + ny * s, { w: 3 });
  }
  MM.register({
    slug: 'double-hookes-joint', view: { w: 720, h: 460 },
    params: [{ key: 'beta', label: 'Joint angle', unit: '°', min: 0, max: 45, step: 1, value: 30 }, { key: 'phase', label: 'Yokes', min: 0, max: 1, step: 1, value: 1, options: [[1, 'In line'], [0, 'At 90°']] }],
    draw(g, a, p) {
      const s = angles(a, p), J2 = [J1[0] + LM * Math.cos(s.b), J1[1] - LM * Math.sin(s.b)], ux = Math.cos(s.b), uy = -Math.sin(s.b);
      g.line(30, J1[1], 400, J1[1], { w: 0.8, dash: [10, 3, 2, 3], color: COL.faint });
      g.line(J2[0] - 140, J2[1], 700, J2[1], { w: 0.8, dash: [10, 3, 2, 3], color: COL.faint });
      shaft(g, 40, J1[1], J1[0] - 30, J1[1], a, COL.red);
      shaft(g, J1[0] + ux * 30, J1[1] + uy * 30, J2[0] - ux * 30, J2[1] - uy * 30, s.m, COL.ink);
      shaft(g, J2[0] + 30, J2[1], 690, J2[1], s.o, COL.red);
      // yokes and spiders
      fork(g, J1[0], J1[1], 1, 0, a); fork(g, J1[0], J1[1], -ux, -uy, s.m + Math.PI / 2);
      fork(g, J2[0], J2[1], ux, uy, s.m + (p.phase ? Math.PI / 2 : 0)); fork(g, J2[0], J2[1], -1, 0, s.o + (p.phase ? 0 : Math.PI / 2));
      [J1, J2].forEach(j => { g.circle(j[0], j[1], 9, { fill: COL.white }); g.dot(j[0], j[1], 3, COL.ink); });
      // bearings
      [[90, J1[1]], [620, J2[1]]].forEach(([x, y]) => { g.poly([[x - 16, y - 24], [x + 16, y - 24], [x + 16, y + 24], [x - 16, y + 24]], { fill: COL.white, hatch: { spacing: 5, cx: x, cy: y } }); });
      g.ground(60, 120, J1[1] + 24); g.ground(590, 650, J2[1] + 24);
      // angle marks
      if (p.beta > 2) {
        g.arc(J1[0], J1[1], 60, -s.b, 0, { w: 1, color: COL.faint }); g.text(p.beta + '°', J1[0] + 70, J1[1] - 14, { size: 11, color: COL.faint });
        g.arc(J2[0], J2[1], 60, Math.PI, Math.PI - s.b, { w: 1, color: COL.faint, ccw: true }); g.text(p.beta + '°', J2[0] - 76, J2[1] + 14, { size: 11, color: COL.faint, align: 'right' });
      }
      g.text('input', 40, J1[1] - 30, { size: 12, weight: 700 });
      g.text('intermediate', (J1[0] + J2[0]) / 2 - 20, (J1[1] + J2[1]) / 2 - 30, { size: 12, weight: 700, align: 'center' });
      g.text('output', 690, J2[1] - 30, { size: 12, weight: 700, align: 'right' });
      g.text(p.phase ? 'yokes in line: output follows input exactly' : 'yokes at 90°: the speed swing doubles', 360, 440, { size: 11, align: 'center', color: COL.red });
    },
    graph: {
      title: 'Speed ÷ input speed', min: 0.4, max: 2.1, ticks: [{ v: 0.5, label: '0.5' }, { v: 1, label: '1' }, { v: 1.5, label: '1.5' }, { v: 2, label: '2' }],
      series: [
        { name: 'intermediate', color: COL.ink, dash: [5, 4], w: 1.4, f: (t, p) => angles(t, p).wm },
        { name: 'output', color: COL.red, f: (t, p) => angles(t, p).wo }
      ],
      readout(a, p) { const s = angles(a, p); return { big: s.wo.toFixed(2) + '×', small: 'output speed ÷ input (intermediate ' + s.wm.toFixed(2) + '×)' }; }
    }
  });
})();
