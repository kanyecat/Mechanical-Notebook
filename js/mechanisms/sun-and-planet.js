(function () {
  const { TAU, COL } = MM, NS = 24, M = 4, S = [330, 382];
  const geo = (a, p) => {
    const Np = p.np, rs = NS * M / 2, rp = Np * M / 2, R = rs + rp, L = 362 - R, psi = -Math.PI / 2 + a;
    const P = [S[0] + R * Math.cos(psi), S[1] + R * Math.sin(psi)], T = [S[0], P[1] - Math.sqrt(L * L - (P[0] - S[0]) ** 2)];
    const phi = Math.atan2(T[1] - P[1], T[0] - P[0]) + Math.PI / 2;   // the rod's lean (0 when upright); the planet is bolted to it
    const s1 = TAU / NS, s2 = TAU / Np, rot2 = phi - Math.PI / 2 - 0.82 * s2;
    const a1 = psi + (psi + Math.PI - 0.82 * s2 - rot2) * (Np / NS), rot1 = a1 - 0.38 * s1;
    return { Np, rs, rp, R, L, psi, P, T, phi, rot1, rot2, s1, s2 };
  };
  const sunTurns = (t, p) => (geo(t, p).rot1 - geo(0, p).rot1) / TAU;
  MM.register({
    slug: 'sun-and-planet', view: { w: 700, h: 580 }, thumb: 0.1,
    params: [{ key: 'np', label: 'Planet teeth (sun has 24)', min: 12, max: 36, step: 2, value: 24 }],
    draw(g, a, p) {
      const q = geo(a, p);
      g.circle(S[0], S[1], q.R, { dash: [4, 4], color: COL.faint, w: 0.8 });
      // guide for the top of the rod (where the beam would be)
      g.rect(S[0] - 22, 4, 8, 110, { hatch: false, fill: COL.paper, color: COL.faint }); g.rect(S[0] + 14, 4, 8, 110, { hatch: false, fill: COL.paper, color: COL.faint });
      g.text('to the beam', S[0] + 34, 20, { size: 11, color: COL.faint });
      g.gear(S[0], S[1], NS, M, q.rot1, { hatch: true });
      g.circle(S[0], S[1], 14, { fill: COL.white }); g.circle(S[0], S[1], 5, { fill: COL.ink });
      const sa = q.rot1 + 0.38 * q.s1; g.dot(S[0] + (q.rs - M * 3) * Math.cos(sa), S[1] + (q.rs - M * 3) * Math.sin(sa), 5, COL.red);
      g.gear(q.P[0], q.P[1], q.Np, M, q.rot2, { hatch: true, fill: MM.tint('white', .92) });
      g.bar(S[0], S[1], q.P[0], q.P[1], 8, { nopivot: true, fill: MM.tint('white', .7) });
      g.bar(q.P[0], q.P[1], q.T[0], q.T[1], 16, { nopivot: true });
      g.pivot(q.P[0], q.P[1], 6); g.pivot(q.T[0], q.T[1], 6); g.pivot(S[0], S[1], 5);
      const pa = q.rot2 + 0.38 * q.s2; g.dot(q.P[0] + (q.rp - M * 3) * Math.cos(pa), q.P[1] + (q.rp - M * 3) * Math.sin(pa), 4.5, COL.ink);
      g.text('sun (on the output shaft)', S[0], S[1] + q.R + q.rp + 26, { size: 11, align: 'center', color: COL.faint });
      g.text('planet, bolted to the rod', q.P[0] + (q.P[0] > S[0] ? 1 : -1) * (q.rp + 16), q.P[1], { size: 11, align: q.P[0] > S[0] ? 'left' : 'right', color: COL.faint });
      g.text('rod', (q.P[0] + q.T[0]) / 2 + 16, (q.P[1] + q.T[1]) / 2, { size: 11, color: COL.faint });
    },
    graph: {
      title: 'Turns made (planet orbits vs sun)', min: -0.1, max: 2.6, ticks: [{ v: 0, label: '0' }, { v: 1, label: '1' }, { v: 2, label: '2' }],
      series: [{ name: 'orbit', color: COL.ink, f: t => t / TAU }, { name: 'sun', color: COL.red, f: (t, p) => sunTurns(t, p) }],
      readout(a, p) { return { big: (1 + p.np / NS).toFixed(2) + '×', small: 'sun turns per trip of the planet (1 + planet ÷ sun teeth)' }; }
    }
  });
})();
