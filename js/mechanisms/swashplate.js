(function () {
  const { TAU, COL } = MM, CY = 225, X0 = 190, R = 95, RP = 130, D2R = Math.PI / 180;
  // piston i sits at angle phi round the shaft; the plate face reaches it at x = X0 − R tan α cos(phi − θ)
  const px = (i, n, th, al) => X0 - R * Math.tan(al) * Math.cos(i * TAU / n - th);
  MM.register({
    slug: 'swashplate', view: { w: 700, h: 450 }, thumb: 0.1,
    params: [{ key: 'al', label: 'Plate tilt α', unit: '°', min: 0, max: 20, step: 1, value: 15 }, { key: 'n', label: 'Pistons', min: 5, max: 9, step: 2, value: 7, options: [[5, '5'], [7, '7'], [9, '9']] }],
    draw(g, a, p) {
      const al = p.al * D2R, n = p.n | 0, th = a;
      // shaft
      g.rect(30, CY - 10, 470, 20, { fill: COL.white, hatch: false });
      g.line(20, CY, 520, CY, { w: 0.8, dash: [10, 3, 2, 3], color: COL.faint });
      // pistons behind the shaft (dashed) first, then the plate, then pistons in front
      const draw = front => { for (let i = 0; i < n; i++) { const ph = i * TAU / n, z = Math.sin(ph); if ((z >= 0) !== front) continue; const y = CY - R * Math.cos(ph), x = px(i, n, th, al) + 7;
        g.rect(x, y - 11, 150, 22, { fill: front ? COL.white : MM.tint('white', .4), hatch: false, dash: front ? null : [4, 3], color: front ? COL.ink : COL.faint });
        if (front) g.circle(x, y, 7, { fill: COL.white }); } };
      draw(false);
      // the tilted plate: its rim, seen from the side
      const nrm = [Math.cos(al), Math.sin(al) * Math.cos(th), Math.sin(al) * Math.sin(th)], u1 = [-Math.sin(al), Math.cos(al) * Math.cos(th), Math.cos(al) * Math.sin(th)], u2 = [0, -Math.sin(th), Math.cos(th)];
      const rim = []; for (let k = 0; k <= 48; k++) { const t = k / 48 * TAU; rim.push([X0 + RP * (Math.cos(t) * u1[0] + Math.sin(t) * u2[0]), CY - RP * (Math.cos(t) * u1[1] + Math.sin(t) * u2[1])]); }
      g.poly(rim, { fill: MM.tint('red', .35) });
      g.poly(rim.map(q => [q[0] - 10 * nrm[0], q[1]]), { fill: MM.tint('red', .2), color: COL.faint, w: 1 });
      draw(true);
      // cylinder block
      g.rect(340, CY - R - 30, 140, 2 * R + 60, { fill: MM.tint('white', .55), sp: 7 });
      g.text('cylinder block (fixed)', 410, CY + R + 52, { size: 11, align: 'center', color: COL.faint });
      g.text('swashplate', X0, CY + RP + 40, { size: 11, align: 'center', color: COL.faint });
      g.text('shaft', 50, CY - 22, { size: 11, color: COL.faint });
      // end view: the ring of pistons, coloured by how far in each one is
      const E = [600, CY], rr = 60; g.circle(E[0], E[1], rr + 24, { fill: COL.white });
      for (let i = 0; i < n; i++) { const ph = i * TAU / n, ext = (px(i, n, th, al) - X0) / Math.max(1e-6, R * Math.tan(al)); g.circle(E[0] + rr * Math.sin(ph), E[1] - rr * Math.cos(ph), 11, { fill: MM.tint('red', 0.15 + 0.7 * (1 + (isFinite(ext) ? ext : 0)) / 2) }); }
      g.line(E[0] - (rr + 30) * Math.cos(th - Math.PI / 2), E[1] - (rr + 30) * Math.sin(th - Math.PI / 2), E[0] + (rr + 30) * Math.cos(th - Math.PI / 2), E[1] + (rr + 30) * Math.sin(th - Math.PI / 2), { w: 1, dash: [5, 4], color: COL.red });
      g.circle(E[0], E[1], 8, { fill: COL.ink });
      g.text('end view', E[0], CY - rr - 44, { size: 12, weight: 700, align: 'center' });
      g.text('darker = pushed further in', E[0], CY + rr + 44, { size: 10.5, align: 'center', color: COL.faint });
      g.text('stroke ' + (2 * R * Math.tan(al) / 3).toFixed(1) + ' mm', 260, 30, { size: 13, weight: 700, align: 'center' });
    },
    graph: {
      title: 'Piston positions (mm)', min: -12, max: 12, ticks: [{ v: -10, label: '−10' }, { v: 0, label: '0' }, { v: 10, label: '10' }],
      series: [0, 1, 2].map(i => ({ name: 'piston ' + (i + 1), color: [COL.red, COL.blue, COL.ink][i], dash: i === 2 ? [4, 3] : null, f: (t, p) => (px(i, p.n | 0, t, p.al * D2R) - X0) / 3 })),
      readout(a, p) { return { big: (2 * R * Math.tan(p.al * D2R) / 3).toFixed(1) + ' mm', small: 'stroke = 2 × R × tan α, with the pistons on a ' + (2 * R / 3).toFixed(0) + ' mm circle' }; }
    }
  });
})();
