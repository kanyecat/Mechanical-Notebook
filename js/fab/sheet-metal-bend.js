(function () {
  const { TAU, COL } = MM, D2R = Math.PI / 180;
  const calc = p => { const th = p.ang * D2R, BA = th * (p.R + p.K * p.T), OSSB = Math.tan(th / 2) * (p.R + p.T), BD = 2 * OSSB - BA; return { th, BA, OSSB, BD }; };
  MM.register({
    slug: 'sheet-metal-bend', view: { w: 700, h: 440 }, thumb: 0.6,
    tryit: { pose: 0.59, keys: (() => {   // points on the bent part (drawn mirrored so the flange points up)
        const pt = (p, r, t, along) => { const k = 13, R = p.R * k, T = p.T * k, O1 = 170 + R + T, q = [300 + r(R, T) * Math.sin(t), O1 - r(R, T) * Math.cos(t)]; if (along) { q[0] += along * Math.cos(t); q[1] += along * Math.sin(t); } return [q[0], 460 - q[1]]; };
        return [{ key: 'R', label: 'Inside radius', at: p => pt(p, (R) => R, p.ang * D2R / 2) }, { key: 'T', label: 'Thickness', at: p => pt(p, (R, T) => R + T, p.ang * D2R / 2) }, { key: 'ang', label: 'Bend angle', at: p => pt(p, (R, T) => R + T / 2, p.ang * D2R, 150) }]; })(), tasks: [
        { text: 'Bend 3 mm sheet to 90° with an inside radius equal to the thickness.', now: p => 'T ' + p.T + ', R ' + p.R + ', ' + p.ang + '°', ok: p => p.T === 3 && p.R === 3 && p.ang === 90 }] },
    params: [
      { key: 'T', label: 'Thickness T', unit: ' mm', min: 0.5, max: 6, step: 0.5, value: 2 },
      { key: 'R', label: 'Inside radius R', unit: ' mm', min: 0.5, max: 12, step: 0.5, value: 2 },
      { key: 'ang', label: 'Bend angle', unit: '°', min: 30, max: 150, step: 5, value: 90 },
      { key: 'K', label: 'K-factor', min: 0.3, max: 0.5, step: 0.01, value: 0.44 }
    ],
    draw(g, a, p) {
      const c = calc(p), u = MM.cycle(a, 0.18), th = c.th * u, k = 13, T = p.T * k, R = p.R * k, Lf = 150, cx = 300, cy = 170;
      // the sheet: a flat flange on the left, an arc, and a flange that swings up as it bends
      // build outline: inside surface radius R, outside R + T, centre of the bend at (cx, cy + R + T)
      const O = [cx, cy + R + T + 0], ring = (r, t) => [O[0] + r * Math.sin(t), O[1] - r * Math.cos(t)];
      const inner = [], outer = [], neutral = [];
      inner.push([cx - Lf, O[1] - R]); outer.push([cx - Lf, O[1] - R - T]); neutral.push([cx - Lf, O[1] - R - p.K * T * 1]);
      for (let i = 0; i <= 24; i++) { const t = th * i / 24; inner.push(ring(R, t)); outer.push(ring(R + T, t)); neutral.push(ring(R + p.K * T, t)); }
      const end = (r) => { const q = ring(r, th); return [q[0] + Lf * Math.cos(th), q[1] + Lf * Math.sin(th)]; };
      inner.push(end(R)); outer.push(end(R + T)); neutral.push(end(R + p.K * T));
      // flip so the flange bends upward: mirror vertically about cy + 60
      const fl = q => [q[0], 2 * (cy + 60) - q[1]];
      g.poly(outer.map(fl).concat(inner.map(fl).reverse()), { fill: COL.white, hatch: { spacing: 5 } });
      g.trace(neutral.map(fl), { color: COL.red, w: 1.6, dash: [6, 4] });
      g.text('neutral axis (K × T from the inside)', cx - Lf, fl([0, O[1] - R - p.K * T])[1] + 30, { size: 11, color: COL.red });
      g.circle(fl(O)[0], fl(O)[1], 3, { fill: COL.ink });
      // press brake punch and die (schematic)
      g.text('bend ' + Math.round(th / D2R) + '° of ' + p.ang + '°', 560, 40, { size: 14, weight: 700, align: 'center' });
      g.text('bend allowance ' + MM.num(c.BA, 2) + ' mm', 560, 300, { size: 13, weight: 700, align: 'center', color: COL.red });
      g.text('bend deduction ' + MM.num(c.BD, 2) + ' mm', 560, 324, { size: 12, align: 'center' });
      g.text('outside setback ' + MM.num(c.OSSB, 2) + ' mm', 560, 346, { size: 12, align: 'center' });
      g.text('flat length = sum of the outside flange lengths − bend deduction', 350, 420, { size: 11, align: 'center', color: COL.faint });
    },
    readout(a, p) { const c = calc(p); return { big: MM.num(c.BA, 2) + ' mm', small: 'bend allowance (arc length of the neutral axis); bend deduction ' + MM.num(c.BD, 2) + ' mm' }; },
    panels: [{
      id: 'calc', title: 'Flat length calculator', live: true,
      intro: 'For a part with two flanges measured to their outside faces (the way most drawings are dimensioned).',
      html: p => { const c = calc(p), A = 40, B = 25; return `<p class="xpintro">With flanges of ${A} mm and ${B} mm measured outside: flat length = ${A} + ${B} − ${MM.num(c.BD, 2)} = <b>${MM.num(A + B - c.BD, 2)} mm</b>. The same thing as straight parts plus the arc (for a 90° bend): (${A} − ${p.T} − ${p.R}) + (${B} − ${p.T} − ${p.R}) + ${MM.num(c.BA, 2)} = ${MM.num(A + B - 2 * (p.T + p.R) + c.BA, 2)} mm.</p>
        <div class="tablewrap"><table class="btable"><thead><tr><th>Term</th><th>Formula</th><th>Value now</th></tr></thead><tbody>
        <tr><td>Bend allowance BA</td><td>θ (radians) × (R + K × T)</td><td>${MM.num(c.BA, 3)} mm</td></tr>
        <tr><td>Outside setback OSSB</td><td>tan(θ ÷ 2) × (R + T)</td><td>${MM.num(c.OSSB, 3)} mm</td></tr>
        <tr><td>Bend deduction BD</td><td>2 × OSSB − BA</td><td>${MM.num(c.BD, 3)} mm</td></tr></tbody></table></div>`; }
    }, {
      id: 'rules', title: 'Design rules for bent parts', live: true,
      html: p => `<ul class="rules"><li><b>Inside radius:</b> about equal to T (${p.T} mm) for mild steel and soft aluminium; 2 to 3 × T for hard aluminium (6061-T6) and stainless, or they crack.</li>
        <li><b>Shortest flange:</b> at least about 4 × T plus the radius (${MM.num(4 * p.T + p.R, 1)} mm here), or the flange cannot reach across the die.</li>
        <li><b>Holes near bends:</b> keep their edges at least 2.5 × T + R (${MM.num(2.5 * p.T + p.R, 1)} mm) from the bend, or they stretch into ovals.</li>
        <li><b>Bend relief:</b> where a bend stops part way along an edge, cut a slot about T wide (${p.T} mm) and R + T deep (${MM.num(p.R + p.T, 1)} mm).</li>
        <li><b>Grain:</b> bend across the rolling direction of the sheet where possible; it cracks less.</li>
        <li><b>K-factor:</b> 0.33 for tight bends in hard metal up to 0.5 for soft metal and large radii. Air bending is usually around 0.4 to 0.45. Bend a test strip and measure to find yours.</li>
        <li><b>Springback:</b> metal springs back a little after bending, more for hard metal and big radii. The press brake operator overbends to make up for it.</li></ul>`
    }]
  });
})();
