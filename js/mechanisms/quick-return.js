(function () {
  const { TAU, COL } = MM, O = [330, 450], E = 194, C = [O[0], O[1] - E], H = 380, RY = O[1] - H;
  // pin P on the crank, lever turns about O through P, ram rides at height RY
  const geo = (a, R) => {
    const P = [C[0] + R * Math.cos(a), C[1] - R * Math.sin(a)];
    const psi = Math.atan2(R * Math.cos(a), E + R * Math.sin(a));  // lever angle from vertical
    return { P, psi, ram: H * Math.tan(psi), max: H * Math.tan(Math.asin(R / E)) };
  };
  const fwdShare = R => (Math.PI + 2 * Math.asin(R / E)) / TAU;
  const forward = (a, R) => Math.sin(a) > -R / E;   // pin on the long (upper) arc: slow cutting stroke
  MM.register({
    slug: 'quick-return', view: { w: 680, h: 520 },
    params: [{ key: 'r', label: 'Crank radius', min: 40, max: 90, step: 1, value: 60 }],
    draw(g, a, p) {
      const R = p.r, s = geo(a, R), c = g.c, LL = H / Math.cos(Math.asin(R / E)) + 26, rx = O[0] + s.ram, ux = Math.sin(s.psi), uy = -Math.cos(s.psi);
      // ram guides and ram
      g.ground(60, 620, RY - 40); g.line(60, RY + 40, 620, RY + 40, { w: 1.8 });
      for (let x = 60; x < 620; x += 8) g.line(x, RY + 40, x - 6, RY + 48, { w: 0.9 });
      g.poly([[rx - 100, RY - 30], [rx + 100, RY - 30], [rx + 100, RY + 30], [rx - 100, RY + 30]], { fill: COL.white, hatch: { spacing: 6, cx: rx, cy: RY } });
      g.poly([[rx - 100, RY + 30], [rx - 82, RY + 30], [rx - 90, RY + 52]], { fill: COL.white });
      g.text('tool', rx - 120, RY + 50, { size: 11, align: 'right', color: COL.faint });
      g.text('RAM', rx + 50, RY, { size: 13, weight: 700, align: 'center' });
      // slotted lever
      const tip = [O[0] + LL * ux, O[1] + LL * uy];
      c.save(); c.translate(O[0], O[1]); c.rotate(s.psi - Math.PI / 2);
      g.style({ w: 1.6, fill: COL.white }); c.beginPath(); c.roundRect(-14, -16, LL + 28, 32, 16); c.fill(); c.stroke();
      g.style({ w: 1.2, fill: COL.paper }); c.beginPath(); c.roundRect(E - R - 18, -7, 2 * R + 36, 14, 7); c.fill(); c.stroke();
      g.style({ w: 1.2, fill: COL.paper }); c.beginPath(); c.roundRect(H / Math.cos(s.psi) - 30, -7, 60, 14, 7); c.fill(); c.stroke();
      c.restore();
      // crank, block in slot, pin at ram
      g.centre(C[0], C[1], R + 24);
      g.circle(C[0], C[1], R, { dash: [4, 4], color: COL.faint, w: 0.9 });
      g.bar(C[0], C[1], s.P[0], s.P[1], 16, { nopivot: true });
      c.save(); c.translate(s.P[0], s.P[1]); c.rotate(s.psi - Math.PI / 2); g.style({ w: 1.4, fill: COL.white }); c.beginPath(); c.rect(-16, -9, 32, 18); c.fill(); c.stroke(); c.restore();
      g.pivot(C[0], C[1], 8); g.pivot(s.P[0], s.P[1], 5); g.dot(s.P[0], s.P[1], 5, COL.red);
      g.fixed(O[0], O[1], 10); g.pivot(rx, RY, 6); g.dot(rx, RY, 4, COL.red);
      // swing limits
      [-1, 1].forEach(k => { const ps = k * Math.asin(R / E); g.line(O[0], O[1], O[0] + (H + 10) * Math.sin(ps), O[1] - (H + 10) * Math.cos(ps), { w: 0.8, dash: [3, 4], color: COL.faint }); });
      g.curvedArrow(C[0], C[1], R + 18, 0.6, -0.4, { ccw: true });
      const fw = forward(a, R);
      g.arrow(fw ? 560 : 500, RY + 78, fw ? 500 : 560, RY + 78, { color: COL.red, w: 1.6 });
      g.text(fw ? 'cutting stroke (slow)' : 'return stroke (fast)', 530, RY + 98, { size: 11, align: 'center', color: COL.red });
    },
    graph: {
      title: 'Ram position (forward stroke is the long part)', min: -1.3, max: 1.3, ticks: [{ v: -1, label: '−1' }, { v: 0, label: '0' }, { v: 1, label: '+1' }],
      series: [
        { name: 'pure sine', color: COL.ink, dash: [5, 4], w: 1.2, f: t => Math.cos(t) },
        { name: 'ram', color: COL.red, f: (t, p) => { const s = geo(t, p.r); return s.ram / s.max; } }
      ],
      readout(a, p) { return { big: Math.round(fwdShare(p.r) * 100) + '% / ' + Math.round((1 - fwdShare(p.r)) * 100) + '%', small: 'turn spent cutting / returning' }; }
    }
  });
})();
