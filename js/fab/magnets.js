(function () {
  const { TAU, COL } = MM;
  const DIAS = [3, 5, 6, 8, 10, 12], PROC = [['3D print', 0.2], ['Laser cut', 0.05], ['CNC', 0.05]];
  // field on the axis of a disc magnet of radius r and thickness h, at distance z from its face (shape only)
  const B = (z, r, h) => (z + h) / Math.hypot(r, z + h) - z / Math.hypot(r, z);
  const pull = (gap, d) => { const r = d / 2, h = 0.4 * d; return (B(gap, r, h) / B(0, r, h)) ** 2; };   // rough: force follows the field squared
  MM.register({
    slug: 'magnets', hands: false, view: { w: 700, h: 430 }, thumb: 0.5,
    params: [
      { key: 'd', label: 'Magnet diameter', min: 0, max: 5, step: 1, value: 3, options: DIAS.map((x, i) => [i, x + ' mm']) },
      { key: 'g', label: 'Wall over each magnet', unit: ' mm', min: 0, max: 3, step: 0.2, value: 0.4 },
      { key: 'f', label: 'Polarity', min: 0, max: 1, step: 1, value: 0, options: [[0, 'Attract'], [1, 'One flipped']] },
      { key: 'p', label: 'Pocket made by', min: 0, max: 2, step: 1, value: 0, options: PROC.map((x, i) => [i, x[0]]) }
    ],
    draw(g, a, p) {
      const d = DIAS[p.d], k = 9, mw = d * k, mh = 0.4 * d * k, wall = p.g * k, u = MM.cycle(a, 0.2), cx = 260, base = 300;
      const close = p.f === 1 ? Math.min(u, 0.55) : u, gapY = 140 * (1 - close) + 2;
      // base part with a magnet pocket near its top face
      g.rect(80, base, 360, 90); g.rect(cx - mw / 2, base + wall, mw, mh, { fill: COL.paper, hatch: false });
      g.rect(cx - mw / 2 + 1, base + wall + 1, mw - 2, mh - 2, { fill: MM.tint('red', .5), hatch: false });
      // lid coming down, magnet near its bottom face
      const ly = base - gapY - 90; g.rect(80, ly, 360, 90, { fill: MM.tint('white', .9) });
      g.rect(cx - mw / 2, ly + 90 - wall - mh, mw, mh, { fill: COL.paper, hatch: false });
      g.rect(cx - mw / 2 + 1, ly + 90 - wall - mh + 1, mw - 2, mh - 2, { fill: MM.tint('red', .5), hatch: false });
      const lab = (y, top) => { g.text(top, cx, y + mh * 0.3, { size: 11, weight: 700, align: 'center' }); };
      lab(base + wall, 'N'); lab(ly + 90 - wall - mh, p.f === 1 ? 'N' : 'S');
      if (p.f === 1 && u > 0.5) g.text('PUSHES APART', cx, ly - 20, { size: 14, weight: 800, align: 'center', color: COL.red });
      const rel = pull(2 * p.g, d) * 100;
      g.text(p.f === 1 ? 'repel' : MM.num(rel, 0) + '% of the pull', 570, 150, { size: 20, weight: 800, align: 'center', color: COL.red });
      g.text(p.f === 1 ? 'mark the poles before gluing' : 'with ' + MM.num(2 * p.g, 1) + ' mm of wall between them', 570, 178, { size: 12, align: 'center' });
      g.text('pocket Ø ' + MM.num(d + PROC[p.p][1], 2) + ' mm (' + PROC[p.p][0] + ')', 570, 230, { size: 13, weight: 700, align: 'center' });
      g.text('magnet Ø' + d + ' × ' + MM.num(0.4 * d, 1) + ' mm drawn', 570, 252, { size: 11, align: 'center', color: COL.faint });
      // pull vs gap curve
      const gx = 470, gy = 380, gw = 200, gh = 90; g.line(gx, gy, gx + gw, gy, { w: 1, color: COL.faint }); g.line(gx, gy, gx, gy - gh, { w: 1, color: COL.faint });
      const cv = []; for (let i = 0; i <= 40; i++) { const z = i / 40 * 6; cv.push([gx + z / 6 * gw, gy - pull(z, d) * gh]); } g.trace(cv, { color: COL.red, w: 1.6 });
      g.dot(gx + Math.min(6, 2 * p.g) / 6 * gw, gy - pull(2 * p.g, d) * gh, 4, COL.red);
      g.text('pull vs gap (0 to 6 mm)', gx, gy + 16, { size: 10, color: COL.faint });
    },
    readout(a, p) { const d = DIAS[p.d]; return { big: MM.num(pull(2 * p.g, d) * 100, 0) + '%', small: 'of the touching pull is left with ' + MM.num(2 * p.g, 1) + ' mm of wall between ' + d + ' mm magnets (rough)' }; },
    panels: [{
      id: 'rules', title: 'Designing with magnets',
      html: () => `<ul class="rules"><li><b>Pockets:</b> printed holes shrink, so add about 0.2 mm to the diameter (and test). Laser and CNC pockets can be within 0.05 mm. A tight press holds without glue; otherwise use a drop of CA or epoxy.</li>
        <li><b>Hidden magnets:</b> pause the print at the layer above the pocket, drop the magnets in, and print over them. Leave at least two or three layers (about 0.4 mm) over them.</li>
        <li><b>Polarity:</b> stack all the magnets on one long magnet first, mark the top of each with a pen, then place them all the same way. Alternating the poles makes parts that only fit one way round.</li>
        <li><b>Heat:</b> common N-grade neodymium starts losing strength above about 80 °C. Never use a soldering iron or heat-set tool on them.</li>
        <li><b>Brittle:</b> they chip if they snap together. Press them in with a vice, not a hammer.</li>
        <li><b>Steel instead of a second magnet:</b> a magnet and a steel disc or washer is cheaper, cannot be put in the wrong way round, and still pulls well.</li>
        <li><b>Safety:</b> keep strong magnets away from small children (swallowed magnets are dangerous), pacemakers and bank cards.</li></ul>`
    }]
  });
})();
