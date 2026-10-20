(function () {
  const { TAU, COL } = MM, CX = 190, CY = 240;
  MM.register({
    slug: 'scotch-yoke', view: { w: 700, h: 480 },
    params: [{ key: 'r', label: 'Crank radius', min: 40, max: 100, step: 1, value: 80 }],
    draw(g, a, p) {
      const R = p.r, px = CX + R * Math.cos(a), py = CY - R * Math.sin(a), x = px;
      const H = 130, GX = 450;
      // guide blocks for the yoke rod
      [[CY - 34, -1], [CY + 34, 1]].forEach(([y, s]) => {
        g.poly([[GX, y], [GX + 60, y], [GX + 60, y + s * 26], [GX, y + s * 26]], { fill: COL.white, hatch: { spacing: 5, cx: GX + 30, cy: y } });
      });
      g.ground(GX - 20, GX + 80, CY + 60);
      g.line(CX - 130, CY, 690, CY, { w: 0.8, dash: [10, 3, 2, 3], color: COL.faint });
      g.centre(CX, CY, R + 30);
      g.circle(CX, CY, R, { dash: [4, 4], color: COL.faint, w: 0.9 });
      // yoke: slotted frame and rod
      g.poly([[x - 24, CY - H], [x + 24, CY - H], [x + 24, CY + H], [x - 24, CY + H]], { fill: COL.white, hatch: { spacing: 6, cx: x, cy: CY } });
      g.poly([[x - 10, CY - R - 14], [x + 10, CY - R - 14], [x + 10, CY + R + 14], [x - 10, CY + R + 14]], { fill: COL.paper });
      g.poly([[x + 24, CY - 9], [x + 400, CY - 9], [x + 400, CY + 9], [x + 24, CY + 9]], { fill: COL.white });
      g.dot(x + 400 - 14, CY, 4.5, COL.red);
      // crank
      g.bar(CX, CY, px, py, 16, { nopivot: true });
      g.pivot(CX, CY, 8); g.pivot(px, py, 6); g.dot(px, py, 5, COL.red);
      g.curvedArrow(CX, CY, R + 22, 3.6, 2.4, { ccw: true });
      // stroke marks under the rod end
      const e0 = CX - R + 400 - 14, e1 = CX + R + 400 - 14;
      [e0, e1].forEach(xx => g.line(xx, CY + 74, xx, CY + 104, { w: 0.9, dash: [3, 3], color: COL.faint }));
      g.line(e0, CY + 96, e1, CY + 96, { w: 0.9, color: COL.faint });
      g.text('stroke = 2r', (e0 + e1) / 2, CY + 114, { size: 11, align: 'center', color: COL.faint });
      g.text('yoke', x, CY - H - 14, { size: 12, weight: 700, align: 'center' });
      g.text('slot', x + 32, CY - R + 4, { size: 11, color: COL.faint });
      g.text('guide', GX + 30, CY - 72, { size: 11, align: 'center', color: COL.faint });
      g.text('r', CX + R / 2 * Math.cos(a) - 12 * Math.sin(a), CY - R / 2 * Math.sin(a) - 12 * Math.cos(a), { size: 12, weight: 700, align: 'center' });
    },
    graph: {
      title: 'Yoke position and speed (in crank lengths)', min: -1.3, max: 1.3, ticks: [{ v: -1, label: '−r' }, { v: 0, label: '0' }, { v: 1, label: '+r' }],
      series: [
        { name: 'position', color: COL.red, f: t => Math.cos(t) },
        { name: 'speed', color: COL.ink, dash: [5, 4], w: 1.2, f: t => -Math.sin(t) }
      ],
      readout(a) { const v = Math.cos(a); return { big: (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(2) + ' r', small: 'yoke from mid-stroke = r·cos θ' }; }
    }
  });
})();
