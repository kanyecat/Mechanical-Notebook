(function () {
  const { TAU, COL } = MM, CX = 245, CY = 225;
  // N units in a ring. Each unit is two bent (angulated) bars crossing at a pivot on the unit's middle ray.
  // With equal arms and a bend of 180° − 360°/N, the ends stay on the radial lines and the ring has one degree of freedom:
  // inner ends at radius u, outer ends at radius v, the cross pivot at radius (u + v) / (2 cos(π/N)).
  const geo = (N, s) => {
    const al = Math.PI / N, t = Math.tan(al), A = 175 / (1 / t + 1), lo = Math.atan(t) + 0.02, hi = Math.PI / 2 - 0.02, ph = lo + (hi - lo) * s;
    const p = A * Math.sin(ph) / t, q = A * Math.cos(ph);
    return { u: p - q, v: p + q, rho: p / Math.cos(al), A, al };
  };
  const ease = a => (1 - Math.cos(a)) / 2;
  MM.register({
    slug: 'hoberman-ring', hands: false, view: { w: 700, h: 450 }, thumb: 0.6,
    params: [{ key: 'n', label: 'Scissor units in the ring', min: 6, max: 12, step: 1, value: 8 }],
    draw(g, a, p) {
      const N = p.n | 0, G = geo(N, ease(a)), at = (r, k) => [CX + r * Math.cos(k * TAU / N - Math.PI / 2), CY + r * Math.sin(k * TAU / N - Math.PI / 2)];
      // the radial lines the joints slide along
      for (let k = 0; k < N; k++) { const e = at(205, k); g.line(CX, CY, e[0], e[1], { w: 0.6, dash: [3, 5], color: COL.faint }); }
      g.circle(CX, CY, G.u, { fill: MM.tint('blue', 0.12), color: COL.blue, dash: [4, 4], w: 1 });
      // each unit: bar A (inner end k → cross → outer end k+1) and bar B (outer end k → cross → inner end k+1)
      for (let k = 0; k < N; k++) {
        const c = at(G.rho, k + 0.5), ai = at(G.u, k), bo = at(G.v, k + 1), bi = at(G.u, k + 1), ao = at(G.v, k);
        g.bar(ao[0], ao[1], c[0], c[1], 9, { nopivot: true }); g.bar(c[0], c[1], bi[0], bi[1], 9, { nopivot: true });
      }
      for (let k = 0; k < N; k++) {
        const c = at(G.rho, k + 0.5), ai = at(G.u, k), bo = at(G.v, k + 1);
        g.poly([ai, c, bo], { close: false, w: 9, color: MM.tint('red', 0.55) }); g.poly([ai, c, bo], { close: false, w: 1.4, color: COL.red });
      }
      for (let k = 0; k < N; k++) { const ai = at(G.u, k), ao = at(G.v, k), c = at(G.rho, k + 0.5); g.pivot(ai[0], ai[1], 4.5); g.pivot(ao[0], ao[1], 4.5); g.pivot(c[0], c[1], 5, { color: COL.red }); }
      // numbers
      const x = 480, r = s => (2 * s / G.A).toFixed(2);
      g.text('ONE LINKAGE, ONE MOTION', x, 70, { size: 12, weight: 700 });
      g.text('Push any joint along its line', x, 94, { size: 11.5 }); g.text('and every other joint follows.', x, 112, { size: 11.5 });
      g.text('opening Ø', x, 160, { size: 11.5, color: COL.blue }); g.text(r(G.u) + ' × arm', 660, 160, { size: 13, weight: 800, align: 'right', color: COL.blue });
      g.text('outside Ø', x, 186, { size: 11.5 }); g.text(r(G.v) + ' × arm', 660, 186, { size: 13, weight: 800, align: 'right' });
      g.text('bend in each bar', x, 212, { size: 11.5 }); g.text((180 - 360 / N).toFixed(0) + '°', 660, 212, { size: 13, weight: 800, align: 'right' });
      g.text('The red and white bars are the', x, 260, { size: 11.5, color: COL.faint }); g.text('same shape, mirrored, pinned', x, 278, { size: 11.5, color: COL.faint }); g.text('where they cross.', x, 296, { size: 11.5, color: COL.faint });
    },
    graph: {
      title: 'Opening and outside diameter (× arm length)', min: 0, max: 8, ticks: [{ v: 0, label: '0' }, { v: 2, label: '2' }, { v: 4, label: '4' }, { v: 6, label: '6' }],
      series: [
        { name: 'opening', color: COL.blue, f: (t, p) => { const G = geo(p.n | 0, ease(t)); return 2 * G.u / G.A; } },
        { name: 'outside', color: COL.red, f: (t, p) => { const G = geo(p.n | 0, ease(t)); return 2 * G.v / G.A; } }
      ],
      readout(a, p) { const G = geo(p.n | 0, ease(a)); return { big: 'Ø ' + (2 * G.u / G.A).toFixed(2) + ' × arm', small: 'opening in the middle; the outside changes far less than the hole' }; }
    }
  });
})();
