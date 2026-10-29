(function () {
  const { TAU, COL } = MM, O = [230, 250], r = 55, l = 110, D2R = Math.PI / 180, OPEN = 72, LOCK = -4;
  // th: angle of the short crank O→A below the plunger line (radians); 0 = links in line (dead centre)
  const bx = th => O[0] + r * Math.cos(th) + Math.sqrt(l * l - (r * Math.sin(th)) ** 2);
  const dxdth = th => -r * Math.sin(th) - r * r * Math.sin(th) * Math.cos(th) / Math.sqrt(l * l - (r * Math.sin(th)) ** 2);
  const gain = (th, Lh) => Math.min(999, Lh / Math.max(Math.abs(dxdth(th)), 1e-6));
  const theta = a => (OPEN + (LOCK - OPEN) * MM.cycle(a, 0.16)) * D2R;
  MM.register({
    slug: 'toggle-clamp', clicks: a => theta(a) < 0 ? 1 : 0, clickSound: 'clack', view: { w: 700, h: 430 }, thumb: 0.32,
    params: [
      { key: 'Lh', label: 'Handle length', unit: ' mm', min: 120, max: 240, step: 10, value: 180 },
      { key: 'c', label: 'Touches the work this far before line-up', unit: '°', min: 1, max: 12, step: 1, value: 3 }
    ],
    draw(g, a, p) {
      const th = theta(a, p), A = [O[0] + r * Math.cos(th), O[1] + r * Math.sin(th)], B = [bx(th), O[1]], Wx = bx(p.c * D2R) + 80, touching = th <= p.c * D2R;
      // base, plunger guide and the work piece
      g.rect(150, O[1] + 34, 470, 22);
      g.line(O[0], O[1], O[0], O[1] + 34, { w: 2 });
      g.rect(O[0] + r + l - 30, O[1] - 16, 90, 8, { hatch: false, fill: COL.paper, color: COL.faint }); g.rect(O[0] + r + l - 30, O[1] + 8, 90, 8, { hatch: false, fill: COL.paper, color: COL.faint });
      g.rect(B[0], O[1] - 6, 70, 12, { fill: COL.white });
      g.rect(B[0] + 70, O[1] - 12, 10, 24, { fill: touching ? MM.tint('red', .55) : COL.white, hatch: false });
      g.rect(Wx, O[1] - 40, 60, 74, { sp: 5 });
      g.text('work', Wx + 30, O[1] - 52, { size: 11, align: 'center', color: COL.faint });
      g.text('plunger', B[0] + 35, O[1] - 26, { size: 11, align: 'center', color: COL.faint });
      // handle (rigid with the short crank)
      const ph = th + Math.PI - 0.22, H = [O[0] + p.Lh * Math.cos(ph), O[1] + p.Lh * Math.sin(ph)];
      g.poly([[O[0], O[1]], [A[0], A[1]], [O[0] + 30 * Math.cos(ph), O[1] + 30 * Math.sin(ph)]], { fill: MM.tint('white', .9) });
      g.bar(O[0], O[1], H[0], H[1], 16, { nopivot: true, fill: MM.tint('white', .95) });
      g.bar(O[0], O[1], A[0], A[1], 14, { nopivot: true });
      g.bar(A[0], A[1], B[0], B[1], 12, { nopivot: true });
      g.line(O[0] - 20, O[1], B[0] + 20, O[1], { w: 0.8, dash: [6, 5], color: COL.faint });
      g.pivot(O[0], O[1], 7); g.pivot(A[0], A[1], 6); g.pivot(B[0], B[1], 6);
      g.dot(H[0], H[1], 6, COL.red);
      g.arrow(H[0] + 24 * Math.cos(ph + Math.PI / 2), H[1] + 24 * Math.sin(ph + Math.PI / 2), H[0] + 4 * Math.cos(ph + Math.PI / 2), H[1] + 4 * Math.sin(ph + Math.PI / 2), { color: COL.red });
      g.text('hand force', H[0], H[1] - 26, { size: 11, align: 'center', color: COL.red });
      g.text(th < 0 ? 'OVER CENTRE: LOCKED' : touching ? 'CLAMPING' : 'OPEN', 470, 60, { size: 16, weight: 800, align: 'center', color: th < 0 ? COL.red : COL.ink });
      g.text('handle pivot', O[0], O[1] + 74, { size: 11, align: 'center', color: COL.faint });
    },
    graph: {
      title: 'Force gain (plunger force ÷ hand force)', min: 0, max: 100, ticks: [{ v: 25, label: '25' }, { v: 50, label: '50' }, { v: 100, label: '100' }],
      series: [{ name: 'gain', color: COL.red, f: (t, p) => { const th = theta(t, p); return Math.min(100, gain(th, p.Lh)); } }],
      readout(a, p) {
        const th = theta(a, p), c = p.c * D2R;
        if (th < 0) return { big: 'locked', small: 'past the line-up: the work pushes the handle onto its stop' };
        return { big: '× ' + gain(th, p.Lh).toFixed(0), small: 'force gain now; at first touch (' + p.c + '° before line-up) it is × ' + gain(c, p.Lh).toFixed(0) };
      }
    }
  });
})();
