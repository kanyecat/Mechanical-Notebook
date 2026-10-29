(function () {
  const { TAU, COL } = MM, ND = 24, N2 = 20, M = 8, R1 = ND * M / 2, R2 = N2 * M / 2, C1 = [215, 225], C2 = [215 + R1 + R2, 225];
  const s1 = TAU / ND, s2 = TAU / N2;
  // how far the driver has turned while in mesh (only the toothed part counts)
  const eff = (a, k) => { const v = a + (k - 0.5) * s1, n = Math.floor(v / TAU), u = v - n * TAU; return n * k * s1 + Math.min(u, k * s1); };
  const drivenRot = (a, k) => Math.PI - 0.82 * s2 - (ND / N2) * (eff(a, k) - (k - 0.5) * s1);
  function partial(g, rot, k) {   // the driver: k teeth, the rest a plain arc at the root circle
    const c = g.c, rp = R1, ro = rp + M, ri = rp - M * 1.15;
    g.style({ w: 1.6, fill: COL.white }); c.beginPath();
    for (let i = 0; i < ND; i++) {
      const a0 = rot + i * TAU / ND, pts = i < k ? [[ri, 0], [ri, 0.12], [ro, 0.26], [ro, 0.5], [ri, 0.64], [ri, 1]] : [[ri, 0], [ri, 0.5], [ri, 1]];
      pts.forEach(([rr, f], j) => { const aa = a0 + f * s1, x = C1[0] + rr * Math.cos(aa), y = C1[1] + rr * Math.sin(aa); (i === 0 && j === 0) ? c.moveTo(x, y) : c.lineTo(x, y); });
    }
    c.closePath(); c.fill(); c.stroke();
    g.hatchPath(() => { c.beginPath(); c.arc(C1[0], C1[1], ri, 0, TAU); }, { spacing: 5, cx: C1[0], cy: C1[1] });
  }
  MM.register({
    slug: 'intermittent-gear', clicks: (a, p) => Math.floor((a - 0.5 * s1) / TAU), clickSound: 'clack', view: { w: 700, h: 450 }, thumb: 0.03,
    params: [{ key: 'k', label: 'Teeth on the driver', min: 1, max: 8, step: 1, value: 3 }],
    draw(g, a, p) {
      const k = p.k | 0, rot1 = a - 0.38 * s1, rot2 = drivenRot(a, k), moving = eff(a + 0.01, k) - eff(a, k) > 0.001;
      g.centre(C1[0], C1[1], R1 + 26); g.centre(C2[0], C2[1], R2 + 26);
      partial(g, rot1, k);
      g.gear(C2[0], C2[1], N2, M, rot2, { hatch: true });
      [[C1, R1, rot1, s1], [C2, R2, rot2, s2]].forEach(([C, r, rot, st]) => { g.circle(C[0], C[1], 13, { fill: COL.white }); g.circle(C[0], C[1], 5, { fill: COL.ink }); const an = rot + 0.38 * st; g.dot(C[0] + (r - M * 3) * Math.cos(an), C[1] + (r - M * 3) * Math.sin(an), 5, COL.red); });
      g.text('driver: ' + k + ' of ' + ND + ' teeth', C1[0], C1[1] + R1 + 40, { size: 12, weight: 700, align: 'center' });
      g.text('driven: ' + N2 + ' teeth', C2[0], C2[1] + R2 + 40, { size: 12, weight: 700, align: 'center' });
      g.text(moving ? 'MOVING' : 'RESTING', C2[0], 30, { size: 16, weight: 800, align: 'center', color: moving ? COL.red : COL.ink });
      g.curvedArrow(C1[0], C1[1], 40, -2.6, -1.4, {});
    },
    graph: {
      title: 'Turns of the driven gear', min: -0.02, max: 0.42, ticks: [{ v: 0, label: '0' }, { v: 0.2, label: '0.2' }, { v: 0.4, label: '0.4' }],
      series: [{ name: 'driven', color: COL.red, f: (t, p) => Math.min(0.42, (ND / N2) * (eff(t, p.k | 0) - eff(0, p.k | 0)) / TAU) }],
      readout(a, p) { const k = p.k | 0; return { big: k + ' / ' + N2, small: 'of a turn per driver turn (' + (k / N2 * 360).toFixed(0) + '°); moving ' + (k / ND * 100).toFixed(0) + '% of the time' }; }
    }
  });
})();
