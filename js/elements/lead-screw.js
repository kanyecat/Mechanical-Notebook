(function () {
  const { TAU, COL } = MM, S = 5, X0 = 120, X1 = 650, Y = 190, DS = 12;   // 5 px per mm, Ø12 screw
  const lead = p => p.P * p.n;
  const maxTurns = p => Math.min(8, 72 / lead(p));
  const ease = v => v * v * (3 - 2 * v);
  const turnsAt = (t, p) => { const u = ((t % TAU) + TAU) % TAU / TAU, v = u < 0.5 ? u * 2 : 2 - u * 2; return maxTurns(p) * ease(v); };
  const travel = (t, p) => turnsAt(t, p) * lead(p);
  MM.register({
    slug: 'lead-screw', view: { w: 700, h: 400 },
    params: [
      { key: 'P', label: 'Thread pitch', unit: ' mm', min: 1, max: 8, step: 1, value: 2, options: [[1, '1 mm'], [2, '2 mm'], [4, '4 mm'], [8, '8 mm']] },
      { key: 'n', label: 'Starts', min: 1, max: 4, step: 1, value: 1, options: [[1, '1'], [2, '2'], [4, '4']] }
    ],
    draw(g, a, p) {
      const c = g.c, r = DS / 2 * S, P = p.P * S, L = lead(p) * S, turns = turnsAt(a, p), phi = turns * TAU, x = travel(a, p);
      // frame and guide rail
      g.ground(X0 - 70, X1 + 20, Y + 112);
      g.poly([[X0 - 60, Y - 70], [X0 - 30, Y - 70], [X0 - 30, Y + 112], [X0 - 60, Y + 112]], { fill: COL.white, hatch: { spacing: 7, cx: X0, cy: Y } });
      g.poly([[X1, Y - 40], [X1 + 18, Y - 40], [X1 + 18, Y + 112], [X1, Y + 112]], { fill: COL.white, hatch: { spacing: 7, cx: X1, cy: Y } });
      g.poly([[X0 - 30, Y + 80], [X1, Y + 80], [X1, Y + 92], [X0 - 30, Y + 92]], { fill: COL.white });
      // handwheel at the left end, seen edge-on, with a turning mark
      g.poly([[X0 - 100, Y - 60], [X0 - 86, Y - 60], [X0 - 86, Y + 60], [X0 - 100, Y + 60]], { fill: COL.white });
      g.line(X0 - 86, Y, X0 - 30, Y, { w: 8, color: COL.ink }); g.line(X0 - 86, Y, X0 - 30, Y, { w: 5, color: COL.white });
      const my = Y - 60 * Math.cos(phi); if (Math.sin(phi) > -0.2) g.dot(X0 - 93, my, 5, COL.red);
      // screw: crests drawn as slanted lines that move along as it turns (the nut does not turn)
      g.poly([[X0 - 30, Y - r], [X1, Y - r], [X1, Y + r], [X0 - 30, Y + r]], { fill: COL.white });
      const off = (phi / TAU * L) % P;
      for (let k = -2; k * P < X1 - X0 + 40; k++) {
        const xa = X0 - 30 + k * P + off; if (xa < X0 - 34 || xa + P / 2 > X1 + 4) continue;
        g.line(xa, Y - r, xa + P / 2, Y + r, { w: 1, color: COL.faint });
      }
      for (let k = 0; k < p.n; k++) { const xa = X0 - 30 + ((off + k * P + 2 * L) % L); if (xa > X0 - 30 && xa < X1) g.line(xa, Y - r, xa + P / 2, Y + r, { w: 2, color: k === 0 ? COL.red : MM.tint('red', .5) }); }
      g.line(X0 - 110, Y, X1 + 30, Y, { w: 0.8, dash: [10, 3, 2, 3], color: COL.faint });
      // nut and carriage
      const nx = X0 + 40 + x * S, nw = 70, nh = 70;
      g.poly([[nx - nw / 2, Y - nh / 2], [nx + nw / 2, Y - nh / 2], [nx + nw / 2, Y + 80], [nx - nw / 2, Y + 80]], { fill: COL.white, hatch: { spacing: 6, cx: nx, cy: Y } });
      g.poly([[nx - nw / 2 - 30, Y - nh / 2 - 22], [nx + nw / 2 + 30, Y - nh / 2 - 22], [nx + nw / 2 + 30, Y - nh / 2], [nx - nw / 2 - 30, Y - nh / 2]], { fill: MM.tint('red', .5) });
      g.line(nx - nw / 2, Y - r, nx + nw / 2, Y - r, { w: 1.4 }); g.line(nx - nw / 2, Y + r, nx + nw / 2, Y + r, { w: 1.4 });
      g.text('nut + carriage', nx, Y - nh / 2 - 34, { size: 11, align: 'center' });
      // travel dimension
      const x0 = X0 + 40;
      g.line(x0, Y + 128, nx, Y + 128, { w: 1, color: COL.red }); g.line(x0, Y + 120, x0, Y + 136, { w: 1, color: COL.red }); g.line(nx, Y + 120, nx, Y + 136, { w: 1, color: COL.red });
      g.text(x.toFixed(1) + ' mm after ' + turns.toFixed(2) + ' turns', Math.max(x0 + 60, (x0 + nx) / 2), Y + 150, { size: 12, align: 'center', color: COL.red });
      // one lead marked on the screw
      const lx = X1 - 40 - L; if (lx > nx + nw) { g.line(lx, Y - r - 18, lx + L, Y - r - 18, { w: 1, color: COL.faint }); g.text('lead ' + lead(p) + ' mm', lx + L / 2, Y - r - 30, { size: 11, align: 'center', color: COL.faint }); }
      g.text(p.n === 1 ? 'single-start thread' : p.n + '-start thread: ' + p.n + ' threads wound side by side', 350, 30, { size: 12, align: 'center', color: COL.faint });
    },
    graph: {
      title: 'Carriage position (out and back)', min: 0, max: 80,
      ticks: [{ v: 0, label: '0' }, { v: 40, label: '40 mm' }, { v: 72, label: '72' }],
      series: [{ name: 'carriage', color: COL.red, f: (t, p) => travel(t, p) }],
      readout(a, p) { return { big: lead(p) + ' mm', small: 'moved per turn (lead = pitch × starts)' }; }
    }
  });
})();
