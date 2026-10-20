(function () {
  const { TAU, COL } = MM, G = 79300;                          // shear modulus of spring steel, N/mm²
  const rate = p => G * Math.pow(p.d, 4) / (8 * Math.pow(p.D, 3) * p.n);   // N/mm
  const solid = p => (p.n + 2) * p.d;                           // closed and ground ends
  const free = p => solid(p) + p.n * 0.35 * p.D;
  const travel = p => 0.7 * (free(p) - solid(p));               // keep 30% clear of solid
  const defl = (t, p) => travel(p) * (1 - Math.cos(t)) / 2;
  MM.register({
    slug: 'spring', view: { w: 700, h: 480 },
    params: [
      { key: 'd', label: 'Wire diameter', unit: ' mm', min: 1, max: 4, step: 0.1, value: 2 },
      { key: 'D', label: 'Coil diameter', unit: ' mm', min: 12, max: 40, step: 1, value: 20 },
      { key: 'n', label: 'Active coils', min: 3, max: 14, step: 1, value: 8 }
    ],
    draw(g, a, p) {
      const c = g.c, L0 = free(p), x = defl(a, p), Lnow = L0 - x, sc = Math.min(5, 330 / L0, 150 / p.D), X = 210, base = 430;
      const Dp = p.D * sc, dp = Math.max(2, p.d * sc), top = base - Lnow * sc, k = rate(p), F = k * x;
      // base and moving plate
      g.ground(X - Dp, X + Dp, base + dp / 2 + 2);
      g.poly([[X - Dp * 0.95, top - dp / 2 - 18], [X + Dp * 0.95, top - dp / 2 - 18], [X + Dp * 0.95, top - dp / 2], [X - Dp * 0.95, top - dp / 2]], { fill: COL.white, hatch: { spacing: 6, cx: X, cy: top } });
      g.arrow(X, top - dp / 2 - 90, X, top - dp / 2 - 22, { color: COL.red, w: 2.4 });
      g.text('F = ' + F.toFixed(1) + ' N', X + 12, top - dp / 2 - 70, { color: COL.red, weight: 700, size: 13 });
      // the coil: total coils = active + 2 closed end coils, drawn as a side view helix
      const nt = p.n + 2, steps = Math.round(nt * 36), y0 = base - dp / 2, y1 = top + dp / 2;
      const yAt = u => {                                         // u = turns from the bottom; end coils are closed (pitch = d)
        const endP = p.d * sc, act = (y0 - y1 - 2 * endP) / p.n;
        if (u <= 1) return y0 - u * endP; if (u >= nt - 1) return y1 + (nt - u) * endP;
        return y0 - endP - (u - 1) * act;
      };
      const back = [], front = [];
      for (let i = 0; i <= steps; i++) { const u = i / steps * nt, th = u * TAU, px = X + Dp / 2 * Math.cos(th), py = yAt(u) + 0 * Math.sin(th); (Math.sin(th) < 0 ? back : front).push([px, py, i]); }
      const seg = (pts, col, w) => { let run = []; pts.forEach((q, j) => { if (j && q[2] !== pts[j - 1][2] + 1) { if (run.length > 1) g.trace(run, { color: col, w }); run = []; } run.push(q); }); if (run.length > 1) g.trace(run, { color: col, w }); };
      seg(back, MM.tint('ink', .35), dp); seg(front, COL.ink, dp + 1.4); seg(front, COL.white, Math.max(0.6, dp - 1.4));
      g.line(X, base + 20, X, top - 24, { w: 0.8, dash: [10, 3, 2, 3], color: COL.faint });
      // dimensions
      const dx = X + Dp / 2 + 40;
      g.line(dx, base, dx, top, { w: 0.9, color: COL.faint }); g.line(dx - 6, base, dx + 6, base, { w: 0.9, color: COL.faint }); g.line(dx - 6, top, dx + 6, top, { w: 0.9, color: COL.faint });
      g.text(Lnow.toFixed(1) + ' mm', dx + 8, (base + top) / 2, { size: 11 });
      g.line(X - Dp / 2, base + 26, X + Dp / 2, base + 26, { w: 0.9, color: COL.faint }); g.text('D ' + p.D + ' mm', X, base + 40, { size: 11, align: 'center', color: COL.faint });

      // force vs squash chart
      const CX0 = 440, CY0 = 380, CW = 220, CH = 250, xs = travel(p) / 0.7, fmax = k * (free(p) - solid(p));
      g.text('FORCE vs SQUASH', CX0 + CW / 2, CY0 - CH - 22, { size: 11, weight: 600, align: 'center', color: COL.faint });
      g.line(CX0, CY0, CX0 + CW, CY0, { w: 1.2 }); g.line(CX0, CY0, CX0, CY0 - CH, { w: 1.2 });
      g.line(CX0, CY0, CX0 + CW, CY0 - CH, { w: 2, color: COL.ink });
      g.line(CX0 + CW, CY0, CX0 + CW, CY0 - CH, { w: 1, dash: [4, 3], color: COL.faint }); g.text('solid', CX0 + CW - 4, CY0 + 14, { size: 10, align: 'right', color: COL.faint });
      const px = CX0 + x / xs * CW, py = CY0 - x / xs * CH;
      g.line(px, CY0, px, py, { w: 0.9, dash: [3, 3], color: COL.red }); g.line(CX0, py, px, py, { w: 0.9, dash: [3, 3], color: COL.red }); g.dot(px, py, 6, COL.red);
      g.text('squash x', CX0 + CW / 2, CY0 + 30, { size: 11, align: 'center' }); g.text('F', CX0 - 14, CY0 - CH / 2, { size: 12, weight: 700 });
      g.text('k = ' + k.toFixed(2) + ' N/mm', CX0 + 12, CY0 - CH + 12, { size: 12, weight: 700, color: COL.red });
      g.text(fmax.toFixed(0) + ' N', CX0 - 6, CY0 - CH, { size: 10, align: 'right', color: COL.faint });
    },
    graph: {
      title: 'Spring force while being squashed and released', min: 0, max: 1.05,
      ticks: [{ v: 0, label: '0' }, { v: 0.7, label: '70%' }, { v: 1, label: 'solid' }],
      series: [{ name: 'force ÷ force at solid', color: COL.red, f: (t, p) => defl(t, p) / (free(p) - solid(p)) }],
      readout(a, p) { return { big: (rate(p) * defl(a, p)).toFixed(1) + ' N', small: 'squashed ' + defl(a, p).toFixed(1) + ' mm · k = ' + rate(p).toFixed(2) + ' N/mm' }; }
    }
  });
})();
