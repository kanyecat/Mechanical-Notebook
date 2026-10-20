(function () {
  const { TAU, COL } = MM, C = 230, r = C * Math.SQRT1_2, Rw = 0.82 * C, Rl = 0.62 * C;
  const DX = 190, DY = 250, WX = DX + C, WY = DY;
  const wrap = a => { a = ((a + Math.PI) % TAU + TAU) % TAU - Math.PI; return a; };
  function state(a) {
    const turns = Math.floor((a + Math.PI) / TAU), phi = a - turns * TAU; // phi in [-pi, pi)
    let eps = phi <= -Math.PI / 4 ? 0 : phi >= Math.PI / 4 ? Math.PI / 2 : Math.atan2(r * Math.sin(phi), C - r * Math.cos(phi)) + Math.PI / 4;
    const W = -(turns * Math.PI / 2 + eps);
    const omega = Math.abs(phi) < Math.PI / 4 ? r * (C * Math.cos(phi) - r) / (C * C + r * r - 2 * C * r * Math.cos(phi)) : 0;
    return { phi, W, eps, omega, engaged: Math.abs(phi) < Math.PI / 4, turns };
  }
  MM.register({
    slug: 'geneva-drive', view: { w: 700, h: 480 },
    draw(g, a) {
      const c = g.c, s = state(a);
      const slot0 = Math.PI + (s.W + Math.PI / 4);
      // wheel outline
      const cuts = [0, 1, 2, 3].map(j => slot0 + Math.PI / 4 + j * Math.PI / 2 - Math.PI * 0 );
      const Rc = Rl + 3, pts = [];
      for (let i = 0; i < 360; i++) {
        const t = i / 360 * TAU; let rho = Rw;
        cuts.forEach(d => { const dd = Math.sin(t - d) * C; if (Math.abs(dd) < Rc && Math.cos(t - d) > 0) { const rc = C * Math.cos(t - d) - Math.sqrt(Rc * Rc - dd * dd); rho = Math.min(rho, rc); } });
        pts.push([WX + rho * Math.cos(t), WY + rho * Math.sin(t)]);
      }
      g.centre(DX, DY, 215); g.centre(WX, WY, 215);
      g.poly(pts, { fill: COL.white, hatch: { spacing: 6, cx: WX, cy: WY } });
      // slots
      for (let j = 0; j < 4; j++) {
        const d = slot0 + j * Math.PI / 2, x1 = WX + (C - r - 6) * Math.cos(d), y1 = WY + (C - r - 6) * Math.sin(d), x2 = WX + (Rw + 4) * Math.cos(d), y2 = WY + (Rw + 4) * Math.sin(d);
        c.save(); g.style({ w: 1.6, fill: COL.paper }); const L = Math.hypot(x2 - x1, y2 - y1); c.translate(x1, y1); c.rotate(d); c.beginPath(); c.roundRect(-0, -9, L, 18, 9); c.fill(); c.stroke(); c.restore();
        // slot number
        const nx = WX + 0.5 * C * Math.cos(d + 0.0), ny = WY + 0.5 * C * Math.sin(d);
        g.circle(WX + 0.34 * C * Math.cos(d + Math.PI / 4), WY + 0.34 * C * Math.sin(d + Math.PI / 4), 11, { fill: COL.white });
        g.text(String(j + 1), WX + 0.34 * C * Math.cos(d + Math.PI / 4), WY + 0.34 * C * Math.sin(d + Math.PI / 4), { size: 11, align: 'center', weight: 700 });
      }
      g.circle(WX, WY, 20, { fill: COL.white }); g.circle(WX, WY, 11, { fill: COL.ink });
      // driver: disc with cut-away near pin
      const dp = [], cutW = 0.95, Rcut = 0.3 * C;
      for (let i = 0; i < 360; i++) { const t = i / 360 * TAU; const dd = Math.abs(wrap(t - s.phi)); const rho = dd < cutW ? Rcut + (Rl - Rcut) * Math.max(0, (dd - cutW + 0.12) / 0.12) : Rl; dp.push([DX + rho * Math.cos(t), DY + rho * Math.sin(t)]); }
      g.poly(dp, { fill: 'rgba(31,85,144,.92)', hatch: { spacing: 4, cx: DX, cy: DY } });
      const px = DX + r * Math.cos(s.phi), py = DY + r * Math.sin(s.phi);
      g.line(DX, DY, px, py, { w: 5, color: COL.faint });
      g.circle(DX, DY, 20, { fill: COL.white }); g.circle(DX, DY, 11, { fill: COL.ink });
      g.circle(DX, DY, r, { dash: [5, 4], color: 'rgba(255,209,102,.6)', w: 1 });
      g.dot(px, py, 8, COL.red); g.circle(px, py, 13, { color: 'rgba(255,209,102,.35)', w: 4 });
      // labels
      const deg = v => String(Math.round(((v % 360) + 360) % 360)).padStart(3, '0') + '°';
      g.text('DRIVER  ' + deg(s.phi * 180 / Math.PI + 180), DX, DY + 262, { size: 15, align: 'center', weight: 700, font: 'Barlow Condensed,Arial Narrow,sans-serif' });
      g.text('GENEVA WHEEL ', WX - 30, DY + 262, { size: 15, align: 'center', weight: 700, font: 'Barlow Condensed,Arial Narrow,sans-serif' });
      g.text(deg(-s.W * 180 / Math.PI), WX + 62, DY + 262, { size: 15, align: 'left', weight: 700, color: COL.red, font: 'Barlow Condensed,Arial Narrow,sans-serif' });
      g.curvedArrow(DX, DY, Rl + 24, Math.PI * 1.1, Math.PI * 1.45, { color: COL.ink });
      g.text('90° per driver turn', WX, DY - 232, { size: 12, align: 'center' });
    },
    graph: {
      title: 'Wheel speed / driver speed', min: 0, max: 3, ticks: [{ v: 0, label: '0' }, { v: 1, label: '1×' }, { v: 2, label: '2×' }],
      series: [
        { name: 'driver (constant)', color: COL.ink, dash: [6, 4], w: 1.4, f: () => 1 },
        { name: 'wheel', color: COL.red, f: t => state(t - Math.PI * 0 ).omega }
      ],
      period: TAU, shift: Math.PI,
      readout(a) { const s = state(a); return s.engaged ? { big: 'STEP', small: 'wheel speed ' + s.omega.toFixed(2) + '×' } : { big: 'DWELL', small: 'wheel locked' }; }
    }
  });
  // graph series should use phi relative to cycle: re-map so the pulse sits mid-graph
  const m = MM.registry['geneva-drive'];
  m.graph.series[1].f = t => { const phi = wrap(t); return Math.abs(phi) < Math.PI / 4 ? r * (C * Math.cos(phi) - r) / (C * C + r * r - 2 * C * r * Math.cos(phi)) : 0; };
})();
