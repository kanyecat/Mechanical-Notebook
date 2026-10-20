(function () {
  const { TAU, COL } = MM, CX = 350, CY = 330, RW = 150, RWM = 36, WY = CY - RW - RWM;
  MM.register({
    slug: 'worm-gear', view: { w: 700, h: 520 },
    params: [{ key: 'n', label: 'Wheel teeth', min: 12, max: 48, step: 1, value: 24 }, { key: 'starts', label: 'Worm starts', min: 1, max: 3, step: 1, value: 1 }],
    draw(g, a, p) {
      const N = p.n, s = p.starts, m = 2 * RW / N, P = Math.PI * m, step = TAU / N, c = g.c;
      const rot = -Math.PI / 2 - 0.38 * step + a * s / N;
      // wheel
      g.centre(CX, CY, RW + m * 3);
      g.gear(CX, CY, N, m, rot, { hatch: true, pitch: true });
      g.circle(CX, CY, 22, { fill: COL.white }); g.circle(CX, CY, 11, { fill: COL.ink });
      g.dot(CX + (RW - m * 2.6) * Math.cos(rot + 0.38 * step), CY + (RW - m * 2.6) * Math.sin(rot + 0.38 * step), 5, COL.red);
      // worm body
      const x0 = 70, x1 = 630, top = WY - 40, h = 80;
      g.line(x0 - 30, WY, x1 + 30, WY, { w: 0.8, dash: [10, 3, 2, 3], color: COL.faint });
      c.save(); g.style({ w: 1.8, fill: COL.white }); c.beginPath(); c.rect(x0, top, x1 - x0, h); c.fill(); c.stroke(); c.clip();
      const base = CX - 0.75 * P, shift = (a / TAU) * s * P;
      c.strokeStyle = COL.ink; c.lineWidth = 2.2; c.beginPath();
      const k0 = Math.floor((x0 - 100 - base) / P) - 2, k1 = Math.ceil((x1 + 100 - base) / P) + 2;
      for (let k = k0; k <= k1; k++) { const x = base + k * P + shift; c.moveTo(x, top + h); c.lineTo(x + P / 2, top); }
      c.stroke();
      c.strokeStyle = COL.hatch; c.lineWidth = 0.8; c.beginPath();
      for (let k = k0; k <= k1; k++) { const x = base + k * P + shift + P * 0.18; c.moveTo(x, top + h); c.lineTo(x + P / 2, top); }
      c.stroke(); c.restore();
      // bearing blocks and end marker
      [[x0 - 14, 1], [x1 + 14, 1]].forEach(([x]) => { g.poly([[x - 14, WY - 56], [x + 14, WY - 56], [x + 14, WY + 56], [x - 14, WY + 56]], { fill: COL.white, hatch: { spacing: 5, cx: x, cy: WY } }); });
      g.dot(x0 - 14, WY + 30 * Math.sin(a), 5, COL.red);
      g.curvedArrow(x1 + 48, WY, 24, -2.2, 0.6, { color: COL.ink });
      g.text('worm', x1 - 40, top - 14, { size: 12, weight: 700, align: 'center' });
      g.text('wheel  N = ' + N, CX, CY + RW + m * 1.4 + 22, { size: 13, weight: 700, align: 'center' });
      g.text('axes cross at 90°', CX + 200, CY + 20, { size: 11, color: COL.faint, align: 'center' });
    },
    graph: {
      title: 'Wheel advance (teeth) per worm turn', min: 0, max: 3.4, ticks: [{ v: 1, label: '1' }, { v: 2, label: '2' }, { v: 3, label: '3' }],
      series: [{ name: 'wheel', color: COL.red, f: (t, p) => p.starts * t / TAU }],
      readout(a, p) { return { big: (p.n / p.starts).toFixed(p.n % p.starts ? 1 : 0) + ' : 1', small: 'worm turns per wheel turn' }; }
    }
  });
})();
