(function () {
  const { TAU, COL } = MM, CX = 350, CY = 170, R = 110, PY = CY + R;
  MM.register({
    slug: 'rack-pinion', view: { w: 700, h: 440 },
    params: [{ key: 'n', label: 'Pinion teeth', min: 8, max: 24, step: 1, value: 14 }],
    draw(g, a, p) {
      const N = p.n, m = 2 * R / N, P = Math.PI * m, step = TAU / N;
      const rot = a + Math.PI / 2 - 0.38 * step, shift = -R * a;
      const yTip = PY - m, yRoot = PY + 1.15 * m, yBot = yRoot + 44;
      // rack outline
      const pts = [[-200, yBot], [-200, yRoot]];
      const kLo = Math.ceil((-200 - CX - P / 2 - shift) / P), kHi = Math.floor((900 - CX - P / 2 - shift) / P);
      for (let k = kLo; k <= kHi; k++) {
        const x = CX + P / 2 + k * P + shift;
        pts.push([x - 1.2 * m, yRoot], [x - 0.42 * m, yTip], [x + 0.42 * m, yTip], [x + 1.2 * m, yRoot]);
      }
      pts.push([900, yRoot], [900, yBot]);
      g.line(-20, PY, 720, PY, { w: 0.8, dash: [6, 4], color: COL.faint });
      g.poly(pts, { fill: COL.white, hatch: { spacing: 6 } });
      g.centre(CX, CY, R + m * 3);
      g.gear(CX, CY, N, m, rot, { hatch: true, pitch: true });
      g.circle(CX, CY, 20, { fill: COL.white }); g.circle(CX, CY, 10, { fill: COL.ink });
      g.dot(CX + (R - m * 2.6) * Math.cos(rot + 0.38 * step), CY + (R - m * 2.6) * Math.sin(rot + 0.38 * step), 5, COL.red);
      // marked tooth on rack
      const kk = Math.round((CX - shift - CX - P / 2) / P); const mx = CX + P / 2 + kk * P + shift;
      g.dot(mx, yTip + 6, 4.5, COL.red);
      g.curvedArrow(CX, CY, R * 0.45, -2.6, -1.3, {});
      g.arrow(CX + 170, yBot + 24, CX + 100, yBot + 24, { color: COL.ink });
      g.text('rack moves ← as pinion turns →', CX + 20, yBot + 24, { size: 11, align: 'center', color: COL.faint });
      g.text('pitch line', 640, PY - 10, { size: 11, align: 'right', color: COL.faint });
    },
    graph: {
      title: 'Rack travel (in teeth)', min: 0, max: 26, ticks: [{ v: 8, label: '8' }, { v: 16, label: '16' }, { v: 24, label: '24' }],
      series: [{ name: 'rack', color: COL.red, f: (t, p) => p.n * t / TAU }],
      readout(a, p) { const t = (((a % TAU) + TAU) % TAU) / TAU; return { big: (p.n * t).toFixed(1) + ' teeth', small: 'rack travel since the last full turn' }; }
    }
  });
})();
