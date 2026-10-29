(function () {
  const { TAU, COL } = MM, CX = 190, CY = 240, R = 62;
  // crank pin P; the cylinder swings on a trunnion T at distance d = k·r from the crank centre; the piston rod goes straight to P
  const st = (a, k) => { const d = k * R, Px = CX + R * Math.cos(a), Py = CY - R * Math.sin(a), Tx = CX + d, Ty = CY, s = Math.hypot(Tx - Px, Ty - Py); return { Px, Py, Tx, Ty, s, d, ang: Math.atan2(-(Py - Ty), Tx - Px) }; };
  MM.register({
    slug: 'oscillating-cylinder', hands: false, view: { w: 700, h: 450 }, thumb: 0.15,
    params: [{ key: 'k', label: 'Trunnion distance ÷ crank', min: 2, max: 4.5, step: 0.1, value: 3 }],
    draw(g, a, p) {
      const S = st(a, p.k), e = [(S.Tx - S.Px) / S.s, (S.Ty - S.Py) / S.s], n = [-e[1], e[0]], L = S.d + R + 24, head = [S.Px + e[0] * L, S.Py + e[1] * L];
      const S2 = st(a + 0.01, p.k), power = S2.s < S.s;   // the piston moves away from the trunnion on the power stroke
      // flywheel
      g.circle(CX, CY, R + 36, { fill: MM.tint('white', .5), w: 2 }); for (let i = 0; i < 6; i++) { const t = a + i * TAU / 6; g.line(CX, CY, CX + (R + 30) * Math.cos(t), CY - (R + 30) * Math.sin(t), { w: 3 }); }
      g.circle(CX, CY, R, { dash: [4, 4], color: COL.faint, w: 0.9 }); g.curvedArrow(CX, CY, R + 52, -2.4, -0.8, {});
      // the cylinder, swinging on its trunnion
      const at = (u, v) => [S.Tx + e[0] * u + n[0] * v, S.Ty + e[1] * u + n[1] * v];
      g.poly([at(-30, -26), at(2 * R + 70, -26), at(2 * R + 70, 26), at(-30, 26)], { fill: COL.white, sp: 7, hatch: { spacing: 7 } });
      g.poly([at(-30, -18), at(2 * R + 62, -18), at(2 * R + 62, 18), at(-30, 18)], { fill: power ? MM.tint('red', .25) : MM.tint('blue', .15), hatch: false });
      const hx = head[0] - S.Tx, hy = head[1] - S.Ty, hu = hx * e[0] + hy * e[1];
      g.poly([at(hu - 14, -18), at(hu, -18), at(hu, 18), at(hu - 14, 18)], { fill: MM.tint('white', .9), hatch: false });
      g.bar(S.Px, S.Py, head[0] - e[0] * 7, head[1] - e[1] * 7, 8, { nopivot: true });
      // the port block (fixed) behind the trunnion: steam in above, exhaust below
      g.rect(S.Tx - 16, CY - 96, 32, 70, { fill: COL.white, sp: 6 });
      g.circle(S.Tx, CY - 74, 7, { fill: power ? COL.red : COL.white }); g.circle(S.Tx, CY - 46, 7, { fill: power ? COL.white : COL.blue });
      g.text('steam in', S.Tx + 26, CY - 70, { size: 11, color: power ? COL.red : COL.faint, weight: power ? 700 : 400 }); g.text('exhaust', S.Tx + 26, CY - 42, { size: 11, color: power ? COL.faint : COL.blue, weight: power ? 400 : 700 });
      g.pivot(S.Tx, S.Ty, 8, { color: COL.red }); g.pivot(CX, CY, 8); g.pivot(S.Px, S.Py, 6);
      g.text('trunnion: the cylinder swings here', S.Tx - 10, CY + 66, { size: 11, color: COL.faint, align: 'center' });
      // the swing, measured
      const deg = S.ang * 180 / Math.PI; g.arc(S.Tx, S.Ty, 44, Math.PI - Math.min(0, S.ang) - 0.0001, Math.PI - Math.max(0, S.ang), { color: COL.red, w: 1.4 });
      g.text('swing ' + (deg >= 0 ? '+' : '−') + Math.abs(deg).toFixed(1) + '°', 540, 70, { size: 14, weight: 800, align: 'center' });
      g.text(power ? 'POWER STROKE' : 'EXHAUST STROKE', 540, 96, { size: 11.5, weight: 700, align: 'center', color: power ? COL.red : COL.blue });
      g.text('The swing itself opens and closes', 540, 360, { size: 11, align: 'center', color: COL.faint }); g.text('the ports: no valve gear needed.', 540, 377, { size: 11, align: 'center', color: COL.faint });
    },
    graph: {
      title: 'Cylinder swing (degrees)', min: -32, max: 32, ticks: [{ v: -30, label: '−30' }, { v: 0, label: '0' }, { v: 30, label: '+30' }],
      series: [{ name: 'swing', color: COL.red, f: (t, p) => st(t, p.k).ang * 180 / Math.PI }, { name: 'piston travel (scaled)', color: COL.blue, dash: [4, 3], f: (t, p) => (p.k * R - st(t, p.k).s) / R * 25 }],
      readout(a, p) { return { big: '±' + (Math.asin(1 / p.k) * 180 / Math.PI).toFixed(1) + '°', small: 'largest swing = sin⁻¹(r ÷ d); stroke = 2r' }; }
    }
  });
})();
