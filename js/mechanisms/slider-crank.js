(function () {
  const { TAU, COL } = MM, CX = 170, CY = 240, R = 75;
  const pos = (a, k) => { const l = k * R; return R * Math.cos(a) + Math.sqrt(l * l - Math.pow(R * Math.sin(a), 2)); };
  MM.register({
    slug: 'slider-crank', view: { w: 700, h: 440 },
    params: [{ key: 'rod', label: 'Rod / crank', min: 2, max: 5, step: 0.1, value: 3 }],
    draw(g, a, p) {
      const l = p.rod * R, x = pos(a, p.rod), px = CX + R * Math.cos(a), py = CY - R * Math.sin(a), sx = CX + x;
      // rails
      g.line(CX + 20, CY - 34, 680, CY - 34, { w: 2 }); g.line(CX + 20, CY + 34, 680, CY + 34, { w: 2 });
      for (let i = CX + 30; i < 680; i += 10) { g.line(i, CY - 34, i + 6, CY - 42, { w: 0.8 }); g.line(i, CY + 34, i - 6, CY + 42, { w: 0.8 }); }
      g.centre(CX, CY, 24); g.line(CX - 40, CY, 690, CY, { w: 0.8, dash: [10, 3, 2, 3], color: COL.faint });
      g.circle(CX, CY, R, { dash: [4, 4], color: COL.faint, w: 0.9 });
      // slider
      g.poly([[sx - 34, CY - 26], [sx + 34, CY - 26], [sx + 34, CY + 26], [sx - 34, CY + 26]], { fill: COL.white, hatch: { spacing: 6, cx: sx, cy: CY } });
      g.bar(CX, CY, px, py, 14, { nopivot: true });
      g.bar(px, py, sx, CY, 12, { nopivot: true });
      g.pivot(CX, CY, 8); g.pivot(px, py, 6); g.pivot(sx, CY, 6, { color: COL.red });
      // stroke marks
      [-R, R].forEach(d => { const xx = CX + l + d; g.line(xx, CY + 58, xx, CY + 90, { w: 0.9, dash: [3, 3], color: COL.faint }); });
      g.line(CX + l - R, CY + 82, CX + l + R, CY + 82, { w: 0.9, color: COL.faint });
      g.text('stroke = 2r', CX + l, CY + 98, { size: 11, align: 'center', color: COL.faint });
      g.curvedArrow(CX, CY, R + 20, -2.2, -0.7, {});
      g.text('r', CX + R / 2 * Math.cos(a) - 10 * Math.sin(a), CY - R / 2 * Math.sin(a) - 12 * Math.cos(a), { size: 12, weight: 700, align: 'center' });
      g.text('l', (px + sx) / 2, (py + CY) / 2 - 16, { size: 12, weight: 700, align: 'center' });
      g.trace([[0, 0]]);
    },
    graph: {
      title: 'Slider position (in crank lengths)', min: -1.4, max: 1.4, ticks: [{ v: -1, label: '−r' }, { v: 0, label: '0' }, { v: 1, label: '+r' }],
      series: [
        { name: 'pure sine', color: COL.ink, dash: [5, 4], w: 1.2, f: t => Math.cos(t) },
        { name: 'slider', color: COL.red, f: (t, p) => (pos(t, p.rod) - p.rod * R) / R }
      ],
      readout(a, p) { const v = (pos(a, p.rod) - p.rod * R) / R; return { big: (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(2) + ' r', small: 'slider from mid-stroke' }; }
    }
  });
})();
