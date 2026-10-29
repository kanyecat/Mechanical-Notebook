(function () {
  const { TAU, COL } = MM;
  // chip load (mm per tooth) for carbide router bits at about 3, 6 and 12 mm diameter: [material, [lo, hi] × 3, depth per pass as a share of the diameter]
  const RM = [['Softwood', [0.08, 0.13], [0.15, 0.25], [0.3, 0.45], 1], ['Hardwood', [0.06, 0.1], [0.13, 0.2], [0.25, 0.38], 0.75], ['Plywood', [0.07, 0.12], [0.15, 0.23], [0.28, 0.4], 1], ['MDF', [0.1, 0.15], [0.2, 0.28], [0.35, 0.5], 1],
    ['Acrylic', [0.05, 0.1], [0.1, 0.18], [0.2, 0.3], 0.5], ['HDPE', [0.08, 0.15], [0.18, 0.28], [0.3, 0.45], 1], ['Aluminium', [0.013, 0.03], [0.025, 0.05], [0.05, 0.1], 0.2]];
  const BITS = [[3.175, '1/8"'], [6.35, '1/4"'], [12.7, '1/2"']];
  const calc = p => { const b = BITS[p.b][0], r = RM[p.m], cl = r[1 + p.b], fz = (cl[0] + cl[1]) / 2; return { b, r, cl, fz, feed: p.rpm * p.z * fz, doc: r[4] * b }; };
  const PARTS = [[[120, 120], [240, 120], [240, 230], [120, 230]], 'circle', [[380, 130], [520, 130], [520, 240], [460, 240], [460, 180], [380, 180]]];
  const outline = i => i === 1 ? Array.from({ length: 49 }, (_, k) => [320 + 50 * Math.cos(k / 48 * TAU), 300 + 50 * Math.sin(k / 48 * TAU)]) : PARTS[i].concat([PARTS[i][0]]);
  const along = (pts, t) => { const L = []; let tot = 0; for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); L.push(d); tot += d; } let s = t * tot; for (let i = 0; i < L.length; i++) { if (s <= L[i]) { const f = s / L[i]; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f]; } s -= L[i]; } return pts[pts.length - 1]; };
  const headAt = a => { const t = ((a / (TAU * 3)) % 1 + 1) % 1, cur = Math.min(2, Math.floor(t * 3)), f = t * 3 - cur; return along(outline(cur), f); };
  const MPARTS = [
    { n: 'Sheet and spoilboard', box: [56, 66, 508, 338], what: 'The material, sitting on a flat sacrificial board.', how: 'The spoilboard is surfaced flat by the router itself so every part is cut to the same depth. The bit cuts a fraction of a millimetre into it on through-cuts.' },
    { n: 'Gantry', box: a => { const c = headAt(a); return [c[0] - 20, 36, 40, 388]; }, what: 'The bridge that carries the spindle across the bed.', how: 'Motors on both sides move it along the bed (Y); the spindle carriage runs along it (X). It must be stiff and square, or circles come out oval.' },
    { n: 'Spindle and bit', box: a => { const c = headAt(a); return [c[0] - 24, c[1] - 24, 48, 48]; }, what: 'Spins the cutter, usually at 12,000 to 24,000 rpm.', how: 'A water- or air-cooled spindle run by a speed controller (VFD), or a trim router on hobby machines. The bit is held in an ER collet: tighten it properly and keep it clean.' },
    { n: 'Tabs', box: [112, 108, 140, 132], what: 'Small bridges that keep cut parts attached to the sheet.', how: 'The last pass lifts over them, so the part cannot move or fly into the bit. Trim them off afterwards.' },
    { n: 'Z axis', what: 'Lifts and plunges the spindle.', how: 'A ball screw or lead screw and linear rails. Its zero is set on the top of the sheet or the spoilboard with a touch plate.' },
    { n: 'Motion system', what: 'Drives the axes.', how: 'Stepper or servo motors with belts, rack and pinion or screws. Steppers can lose steps if pushed too fast, so feeds and accelerations matter.' },
    { n: 'Dust shoe and extraction', what: 'Pulls chips and dust away from the cut.', how: 'A brush skirt around the bit connected to a dust collector. Clearing chips keeps the bit cool and stops re-cutting.' },
    { n: 'Hold-downs or vacuum table', what: 'Keep the sheet flat and still.', how: 'Screws, clamps, tape or a vacuum pump pulling through a porous spoilboard.' },
    { n: 'Controller and sender', what: 'Turns the G-code into motor moves.', how: 'A controller board or industrial control, fed by sender software. Know where the emergency stop is before you start.' }
  ];
  MM.register({
    slug: 'cnc-router', hands: false, view: { w: 700, h: 440 }, thumb: 0.5, period: TAU * 3,
    params: [
      { key: 'b', label: 'Bit', min: 0, max: 2, step: 1, value: 1, options: BITS.map((x, i) => [i, x[1] + ' (' + x[0] + ' mm)']) },
      { key: 'z', label: 'Flutes', min: 1, max: 3, step: 1, value: 2 },
      { key: 'rpm', label: 'Spindle speed', unit: ' rpm', min: 8000, max: 24000, step: 1000, value: 18000 },
      { key: 'm', label: 'Material', min: 0, max: 6, step: 1, value: 2, options: RM.map((x, i) => [i, x[0]]) }
    ],
    parts: MPARTS,
    draw(g, a, p) {
      const q = calc(p), t = ((a / (TAU * 3)) % 1 + 1) % 1, cur = Math.min(2, Math.floor(t * 3)), f = t * 3 - cur;
      g.rect(60, 70, 500, 330, { fill: MM.tint('white', .85), sp: 9 }); g.text('sheet on the spoilboard', 60, 416, { size: 11, color: COL.faint });
      for (let i = 0; i < 3; i++) {
        const pts = outline(i);
        if (i < cur) { g.poly(pts, { fill: MM.tint('red', .3) }); const tabs = [0.15, 0.48, 0.8]; tabs.forEach(tt => { const q2 = along(pts, tt); g.rect(q2[0] - 5, q2[1] - 5, 10, 10, { fill: COL.white, hatch: false }); }); }
        else if (i === cur) { const done = []; for (let k = 0; k <= 60; k++) done.push(along(pts, f * k / 60)); g.trace(pts, { color: COL.faint, w: 1, dash: [4, 4] }); g.trace(done, { color: COL.paper, w: q.b * 2.2 + 2 }); g.trace(done, { color: COL.ink, w: 1 }); }
        else g.trace(pts, { color: COL.faint, w: 1, dash: [4, 4] });
      }
      const C = along(outline(cur), f);
      g.rect(C[0] - 14, 40, 28, 380, { fill: MM.tint('white', .35), hatch: false, color: COL.faint });
      g.circle(C[0], C[1], q.b * 1.1 + 4, { fill: MM.tint('red', .6) }); g.circle(C[0], C[1], 18, { color: COL.ink, w: 1 });
      g.text('gantry', C[0] + 20, 52, { size: 11, color: COL.faint });
      g.text(Math.round(q.feed) + ' mm/min', 630, 120, { size: 16, weight: 800, align: 'center', color: COL.red });
      g.text('feed', 630, 98, { size: 11, align: 'center', color: COL.faint });
      g.text(MM.num(q.fz, 3) + ' mm/tooth', 630, 146, { size: 12, align: 'center' });
      g.text('depth/pass', 630, 190, { size: 11, align: 'center', color: COL.faint }); g.text('≤ ' + MM.num(q.doc, 1) + ' mm', 630, 210, { size: 13, weight: 700, align: 'center' });
      g.text('white squares: tabs', 630, 260, { size: 10, align: 'center', color: COL.faint });
    },
    readout(a, p) { const q = calc(p); return { big: Math.round(q.feed) + ' mm/min', small: MM.ipm(q.feed) + '; ' + p.rpm + ' rpm × ' + p.z + ' flutes × ' + MM.num(q.fz, 3) + ' mm chip load; up to about ' + MM.num(q.doc, 1) + ' mm deep per pass in ' + q.r[0].toLowerCase() }; },
    panels: [{
      id: 'chip', title: 'Chip loads for router bits', live: true,
      intro: 'Starting ranges for solid carbide bits on a rigid router. Light hobby machines usually need the low end, a lower rpm and shallower passes. If you see dust, feed faster or slow the spindle; if it burns, do the same.',
      html: p => `<div class="tablewrap"><table class="btable"><thead><tr><th>Material</th><th>1/8" (3 mm)</th><th>1/4" (6 mm)</th><th>1/2" (12 mm)</th><th>Depth per pass</th></tr></thead><tbody>${RM.map((r, i) => `<tr${i === +p.m ? ' style="font-weight:700"' : ''}><td>${r[0]}</td><td>${r[1][0]}–${r[1][1]}</td><td>${r[2][0]}–${r[2][1]}</td><td>${r[3][0]}–${r[3][1]}</td><td>up to ${r[4]} × D</td></tr>`).join('')}</tbody></table></div><p class="xpintro">Chip loads in mm per tooth.</p>`
    }, {
      id: 'bits', title: 'Choosing a bit',
      html: () => `<div class="tablewrap"><table class="btable"><thead><tr><th>Bit</th><th>Good for</th><th>Note</th></tr></thead><tbody>
        <tr><td>Upcut spiral</td><td>Pockets and deep slots</td><td>Pulls chips up and out; can fray the top face.</td></tr>
        <tr><td>Downcut spiral</td><td>Clean top face, thin sheet</td><td>Pushes chips down; packs chips in deep cuts.</td></tr>
        <tr><td>Compression</td><td>Plywood and laminates cut through</td><td>Upcut at the tip, downcut above: clean on both faces. Needs a pass deeper than the upcut part.</td></tr>
        <tr><td>Single-flute "O" flute</td><td>Acrylic, plastics, aluminium</td><td>Big chips carry heat away so plastic does not melt.</td></tr>
        <tr><td>V-bit</td><td>Engraving, V-carving, chamfers</td><td>Depth sets the width of the line.</td></tr>
        <tr><td>Ball nose</td><td>3D surfaces</td><td>Small stepovers (5 to 15 % of D) for a smooth surface.</td></tr></tbody></table></div>`
    }, {
      id: 'hold', title: 'Holding the work and finishing the cut',
      html: () => `<ul class="rules"><li><b>Surface the spoilboard</b> flat first, so every part is cut to the same depth.</li>
        <li><b>Screws</b> outside the parts (plastic or brass screws are kinder if the bit hits one), clamps at the edges, or a vacuum table for production.</li>
        <li><b>Tabs</b> about 1 to 3 mm thick and 5 to 10 mm long keep parts from moving on the last pass; trim them with a flush-cut saw or knife.</li>
        <li><b>Onion skin:</b> leave 0.2 to 0.5 mm at the bottom, then remove it with a final shallow pass or snap and sand it.</li>
        <li><b>Inside corners</b> will be round with the bit radius; add dog-bones (F-10) where square parts fit in.</li>
        <li><b>Dust:</b> collection keeps the cut clear, the bit cool and your lungs healthy. MDF dust is especially fine.</li></ul>`
    }, {
      id: 'trouble', title: 'Common problems and fixes',
      html: () => `<div class="tablewrap"><table class="btable"><thead><tr><th>Problem</th><th>Likely causes</th><th>Try</th></tr></thead><tbody><tr><td>Burnt edges or burnt bit</td><td>Chip load too small (rubbing); dull bit; dwelling in corners</td><td>Feed faster or slow the spindle; replace the bit; avoid stopping in the cut</td></tr><tr><td>Fuzzy or torn edges</td><td>Wrong bit direction for the material; dull bit; plywood veneer lifting</td><td>Use a down-cut or compression bit for plywood faces; a sharp bit; a light finishing pass</td></tr><tr><td>Parts out of size or out of square</td><td>Lost steps; loose belts or V-wheels; gantry out of square; bit deflection</td><td>Lower feeds and accelerations; tighten the motion system; square the gantry; leave a finishing pass</td></tr><tr><td>Circles come out oval</td><td>Backlash or a loose axis; X and Y steps per mm not calibrated</td><td>Check couplers and set screws; calibrate each axis with a long measured cut</td></tr><tr><td>Parts move or fly out on the last pass</td><td>Not enough hold-down; no tabs; too little material left</td><td>Add tabs or onion-skin; screw or vacuum the sheet; cut small parts first</td></tr><tr><td>Depth not consistent across the sheet</td><td>Spoilboard not flat; sheet bowed; Z zero set on a high spot</td><td>Surface the spoilboard; hold the sheet flat; zero on the spoilboard for through-cuts</td></tr><tr><td>Chatter and noise</td><td>Bit too long; too deep a pass; loose collet</td><td>Use the shortest bit that reaches; shallower passes; clean and tighten the collet</td></tr></tbody></table></div>`
    }, {
      id: 'safety', title: 'Safety',
      html: () => `<ul class="rules"><li>Never leave a running router alone: dull bits and slow feeds can set chips alight.</li><li>Eye and hearing protection; routers are loud.</li><li>Keep hands away from the gantry when it is armed, and know where the emergency stop is.</li><li>Double-check zero and the first moves in the air before cutting.</li></ul>`
    }]
  });
})();
