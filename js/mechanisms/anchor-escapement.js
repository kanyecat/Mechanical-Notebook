(function () {
  const { TAU, COL } = MM, W = [350, 265], RW = 112, N = 30, PITCH = TAU / N, PIV = [W[0], W[1] - RW * Math.SQRT2], D2R = Math.PI / 180;
  const ss = u => { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); };
  // escape wheel: half a tooth per beat, moving while the pendulum passes the middle, with a little recoil at each end of the swing
  const REC = 0.1;
  const wheel = a => {
    const v = (a - Math.PI / 2) / Math.PI, k = Math.floor(v), u = v - k;
    const f = u < 0.2 ? -REC * (1 - u / 0.2) : u < 0.62 ? ss((u - 0.2) / 0.42) : 1 - REC * (u - 0.62) / 0.38;
    return (k + f) * PITCH / 2;
  };
  MM.register({
    slug: 'anchor-escapement', clicks: a => Math.floor((a - Math.PI / 2) / Math.PI - 0.62), clickSound: 'clack', view: { w: 700, h: 470 }, thumb: 0.3,
    params: [{ key: 'amp', label: 'Pendulum swing', unit: '°', min: 2, max: 6, step: 0.5, value: 4 }],
    draw(g, a, p) {
      const th = p.amp * D2R * Math.sin(a), wr = wheel(a);
      // pendulum (behind)
      const bob = [PIV[0] + 400 * Math.sin(th), PIV[1] + 400 * Math.cos(th)];
      g.line(PIV[0], PIV[1], bob[0], bob[1], { w: 3, color: COL.faint });
      g.circle(bob[0], Math.min(bob[1], 452), 16, { fill: MM.tint('white', .8), color: COL.faint });
      // escape wheel with sloping teeth, turning clockwise
      const c = g.c; g.style({ w: 1.6, fill: COL.white }); c.beginPath();
      for (let i = 0; i < N; i++) {
        const t0 = wr + i * PITCH, pts = [[RW - 18, t0], [RW, t0 + 0.08 * PITCH], [RW - 18, t0 + 0.75 * PITCH]];
        pts.forEach(([r, t], j) => { const x = W[0] + r * Math.cos(t), y = W[1] + r * Math.sin(t); (i === 0 && j === 0) ? c.moveTo(x, y) : c.lineTo(x, y); });
      }
      c.closePath(); c.fill(); c.stroke();
      g.hatchPath(() => { c.beginPath(); c.arc(W[0], W[1], RW - 26, 0, TAU); }, { spacing: 6, cx: W[0], cy: W[1] });
      g.circle(W[0], W[1], 14, { fill: COL.white }); g.circle(W[0], W[1], 5, { fill: COL.ink });
      g.dot(W[0] + (RW - 40) * Math.cos(wr), W[1] + (RW - 40) * Math.sin(wr), 5, COL.red);
      // anchor: arms from the pivot to the two pallets, rocking with the pendulum
      const rot = (q, t) => { const dx = q[0] - PIV[0], dy = q[1] - PIV[1]; return [PIV[0] + dx * Math.cos(t) - dy * Math.sin(t), PIV[1] + dx * Math.sin(t) + dy * Math.cos(t)]; };
      const pin = [W[0] + (RW - 8) * Math.cos(-3 * Math.PI / 4), W[1] + (RW - 8) * Math.sin(-3 * Math.PI / 4)], pout = [W[0] + (RW - 8) * Math.cos(-Math.PI / 4), W[1] + (RW - 8) * Math.sin(-Math.PI / 4)];
      const k = 2.2, A1 = rot(pin, -th * k), A2 = rot(pout, -th * k), B1 = rot([pin[0] - 26, pin[1] - 10], -th * k), B2 = rot([pout[0] + 26, pout[1] - 10], -th * k);
      g.poly([[PIV[0], PIV[1]], B1, A1, rot([pin[0] + 8, pin[1] - 22], -th * k)], { fill: MM.tint('red', .35) });
      g.poly([[PIV[0], PIV[1]], B2, A2, rot([pout[0] - 8, pout[1] - 22], -th * k)], { fill: MM.tint('red', .35) });
      g.circle(PIV[0], PIV[1], 18, { fill: COL.white }); g.pivot(PIV[0], PIV[1], 7);
      g.text('anchor', PIV[0] + 30, PIV[1] - 18, { size: 11, color: COL.faint });
      g.text('entry pallet', A1[0] - 64, A1[1] + 6, { size: 11, align: 'center', color: COL.faint });
      g.text('exit pallet', A2[0] + 62, A2[1] + 6, { size: 11, align: 'center', color: COL.faint });
      g.text('escape wheel', W[0] + RW + 14, W[1] + 60, { size: 11, color: COL.faint });
      g.text('to pendulum', bob[0] + 22, 440, { size: 11, color: COL.faint });
      const v = (a - Math.PI / 2) / Math.PI, u = v - Math.floor(v);
      g.text(u > 0.2 && u < 0.62 ? 'TICK: wheel moves, pallet gets a push' : 'LOCKED', 560, 40, { size: 13, weight: 800, align: 'center', color: u > 0.2 && u < 0.62 ? COL.red : COL.ink });
    },
    graph: {
      title: 'Pendulum angle and wheel turned (degrees)', min: -7, max: 13, ticks: [{ v: -4, label: '−4' }, { v: 0, label: '0' }, { v: 6, label: '6' }, { v: 12, label: '12' }],
      series: [{ name: 'pendulum', color: COL.ink, f: (t, p) => p.amp * Math.sin(t) }, { name: 'wheel', color: COL.red, f: t => (wheel(t) - wheel(0)) / D2R }],
      readout(a, p) { return { big: '6°', small: 'the wheel moves half a tooth (6° of 30 teeth) for each swing of the pendulum' }; }
    }
  });
})();
