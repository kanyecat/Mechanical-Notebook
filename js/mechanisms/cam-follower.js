(function () {
  const { TAU, COL } = MM, CX = 260, CY = 330, RB = 90, FOOT = 130;
  const PH = [[0, 120, 'RISE'], [120, 180, 'DWELL'], [180, 300, 'FALL'], [300, 360, 'DWELL']];
  const deg = Math.PI / 180;
  // programmed lift L(psi) for psi in [0, TAU): cycloidal rise, dwell, cycloidal fall, dwell
  function lift(psi, h) {
    const d = (((psi / deg) % 360) + 360) % 360, cyc = u => u - Math.sin(TAU * u) / TAU;
    if (d < 120) return h * cyc(d / 120);
    if (d < 180) return h;
    if (d < 300) return h * (1 - cyc((d - 180) / 120));
    return 0;
  }
  const outlines = {};
  function outline(h) {
    if (outlines[h]) return outlines[h];
    const pts = []; for (let i = 0; i < 360; i++) { const psi = i * deg; pts.push([psi, RB + lift(psi, h)]); }
    return (outlines[h] = pts);
  }
  // flat-faced follower: height of the face = highest point of the turned cam (support function)
  function height(a, h) {
    const rot = -a; let best = -1e9;
    outline(h).forEach(([psi, r]) => { const y = r * Math.sin(psi + rot + Math.PI / 2); if (y > best) best = y; });
    return best;
  }
  // the part of the cam under the follower is psi = a
  const phase = a => { const d = ((a / deg) % 360 + 360) % 360; return PH.find(q => d >= q[0] && d < q[1]); };
  MM.register({
    slug: 'cam-follower', view: { w: 700, h: 500 },
    params: [{ key: 'h', label: 'Lift', min: 20, max: 70, step: 1, value: 60 }],
    draw(g, a, p) {
      const c = g.c, rot = -a, H = height(a, p.h), fy = CY - H;
      // cam (psi measured from the follower direction when a = 0)
      const pts = outline(p.h).map(([psi, r]) => [CX + r * Math.cos(psi + rot + Math.PI / 2), CY - r * Math.sin(psi + rot + Math.PI / 2)]);
      g.centre(CX, CY, RB + p.h + 24);
      g.circle(CX, CY, RB, { dash: [4, 4], color: COL.faint, w: 0.8 });
      g.poly(pts, { fill: COL.white, hatch: { spacing: 6, cx: CX, cy: CY } });
      g.circle(CX, CY, 20, { fill: COL.white }); g.circle(CX, CY, 10, { fill: COL.ink });
      // phase boundaries and labels on the cam
      PH.forEach(([d0, d1, name]) => {
        const t0 = d0 * deg + rot + Math.PI / 2, tm = (d0 + d1) / 2 * deg + rot + Math.PI / 2;
        g.line(CX + 22 * Math.cos(t0), CY - 22 * Math.sin(t0), CX + (RB - 6) * Math.cos(t0), CY - (RB - 6) * Math.sin(t0), { w: 0.8, dash: [3, 3], color: COL.faint });
        g.text(name, CX + 58 * Math.cos(tm), CY - 58 * Math.sin(tm), { size: 10, weight: 700, align: 'center', color: COL.red });
      });
      // follower: guide, spring, stem, flat foot
      const GY = 70;
      [[CX - 40, -1], [CX + 16, 1]].forEach(([x]) => g.poly([[x, GY], [x + 24, GY], [x + 24, GY + 36], [x, GY + 36]], { fill: COL.white, hatch: { spacing: 5, cx: x + 12, cy: GY } }));
      g.line(CX - 70, GY, CX + 70, GY, { w: 1.8 });
      for (let x = CX - 70; x < CX + 70; x += 8) g.line(x, GY, x + 6, GY - 8, { w: 0.9 });
      g.poly([[CX - 8, fy - 6], [CX + 8, fy - 6], [CX + 8, GY - 30], [CX - 8, GY - 30]], { fill: COL.white });
      const sTop = GY + 40, sBot = fy - 14, coils = 9, pts2 = [[CX, sTop]];
      for (let i = 1; i < coils * 2; i++) pts2.push([CX + (i % 2 ? 24 : -24), sTop + (sBot - sTop) * i / (coils * 2)]);
      pts2.push([CX, sBot]); g.poly(pts2, { close: false, w: 1.2, color: COL.faint });
      g.poly([[CX - FOOT / 2, fy - 14], [CX + FOOT / 2, fy - 14], [CX + FOOT / 2, fy], [CX - FOOT / 2, fy]], { fill: COL.white, hatch: { spacing: 5, cx: CX, cy: fy } });
      g.dot(CX + 40, fy - 7, 4.5, COL.red);
      // lift scale on the right
      const sx = CX + FOOT / 2 + 40, y0 = CY - RB;
      g.line(sx, y0, sx, y0 - p.h, { w: 0.9, color: COL.faint });
      [0, p.h].forEach(v => g.line(sx - 6, y0 - v, sx + 6, y0 - v, { w: 0.9, color: COL.faint }));
      g.arrow(sx + 26, y0, sx + 26, fy + 1, { color: COL.red, w: 1.4 });
      g.text('lift ' + (H - RB).toFixed(0), sx + 36, (y0 + fy) / 2, { size: 11, color: COL.red });
      g.text('base circle', CX, CY + RB + 22, { size: 11, align: 'center', color: COL.faint });
      g.text('flat-faced follower', CX + FOOT / 2 + 12, fy - 24, { size: 11, color: COL.faint });
      g.curvedArrow(CX, CY, RB + p.h + 12, -2.9, -2.4, {});
    },
    graph: {
      title: 'Follower lift', min: -8, max: 78, ticks: [{ v: 0, label: '0' }, { v: 30, label: '30' }, { v: 60, label: '60' }],
      series: [{ name: 'lift', color: COL.red, f: (t, p) => height(t, p.h) - RB }],
      readout(a, p) { const ph = phase(a); return { big: ph[2], small: 'lift ' + (height(a, p.h) - RB).toFixed(1) + ' of ' + p.h }; }
    }
  });
})();
