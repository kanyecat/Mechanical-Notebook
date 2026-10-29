(function () {
  const { TAU, COL } = MM;
  // glue area as a multiple of the cross-section (t × width), for each joint
  const J = [['Butt', 1], ['Lap (overlap 4 × t)', 4], ['Scarf (1 : 8)', 8], ['Finger', 6]];
  const LOAD = [['Pull along the joint (shear)', 1], ['Bend it open (peel)', 5]];
  MM.register({
    slug: 'glue-joints', hands: false, view: { w: 700, h: 430 }, thumb: 0.3,
    params: [
      { key: 'j', label: 'Joint', min: 0, max: 3, step: 1, value: 1, options: J.map((x, i) => [i, x[0].split(' ')[0]]) },
      { key: 'l', label: 'Load', min: 0, max: 1, step: 1, value: 0, options: [[0, 'Shear'], [1, 'Peel']] }
    ],
    draw(g, a, p) {
      const j = p.j | 0, peel = p.l === 1, t = 40, cy = 200, u = (Math.sin(a) + 1) / 2, sx = 60 + u * 6, ex = 640 - u * 6;
      const stress = (j === 0 && !peel ? 1 : 1 / J[j][1]) * LOAD[p.l][1];
      const glue = MM.tint('red', Math.min(0.95, 0.2 + 0.75 * Math.min(1, stress)));
      const L = [sx, cy - t / 2], bend = peel ? u * 0.08 : 0;
      const rot = (x, y, ang, ox, oy) => [ox + (x - ox) * Math.cos(ang) - (y - oy) * Math.sin(ang), oy + (x - ox) * Math.sin(ang) + (y - oy) * Math.cos(ang)];
      if (j === 0) {   // butt
        g.rect(sx, cy - t / 2, 350 - sx, t); g.poly([[350, cy - t / 2], [ex, cy - t / 2], [ex, cy + t / 2], [350, cy + t / 2]].map(q => rot(q[0], q[1], -bend, 350, cy + t / 2)), { fill: COL.white, hatch: { spacing: 6 } });
        g.rect(347, cy - t / 2, 6, t, { fill: glue, hatch: false, color: 'transparent' });
      } else if (j === 1) {   // lap
        g.rect(sx, cy - t, 410 - sx, t); g.poly([[250, cy], [ex, cy], [ex, cy + t], [250, cy + t]].map(q => rot(q[0], q[1], -bend, 250, cy)), { fill: COL.white, hatch: { spacing: 6 } });
        g.rect(250, cy - 3, 160, 6, { fill: glue, hatch: false, color: 'transparent' });
      } else if (j === 2) {   // scarf
        g.poly([[sx, cy - t / 2], [430, cy - t / 2], [270, cy + t / 2], [sx, cy + t / 2]], { fill: COL.white, hatch: { spacing: 6 } });
        g.poly([[430, cy - t / 2], [ex, cy - t / 2], [ex, cy + t / 2], [270, cy + t / 2]].map(q => rot(q[0], q[1], -bend, 270, cy + t / 2)), { fill: COL.white, hatch: { spacing: 6 } });
        g.line(430, cy - t / 2, 270, cy + t / 2, { w: 5, color: glue });
      } else {   // finger
        const pts = [[sx, cy - t / 2]]; for (let i = 0; i < 5; i++) { const y0 = cy - t / 2 + i * t / 5; pts.push([i % 2 ? 300 : 380, y0], [i % 2 ? 300 : 380, y0 + t / 5]); } pts.push([sx, cy + t / 2]);
        g.poly(pts, { fill: COL.white, hatch: { spacing: 6 } });
        const q2 = [[ex, cy - t / 2]]; for (let i = 0; i < 5; i++) { const y0 = cy - t / 2 + i * t / 5; q2.push([i % 2 ? 300 : 380, y0], [i % 2 ? 300 : 380, y0 + t / 5]); } q2.push([ex, cy + t / 2]);
        g.poly(q2.map(q => rot(q[0], q[1], -bend, 300, cy + t / 2)), { fill: MM.tint('white', .8), hatch: { spacing: 6, angle: -Math.PI / 4 } });
        for (let i = 0; i < 5; i++) { const y0 = cy - t / 2 + i * t / 5; g.line(300, y0, 380, y0, { w: 2.5, color: glue }); }
      }
      // load arrows
      if (!peel) { g.arrow(sx + 40, cy + 70, sx - 10, cy + 70, { color: COL.red }); g.arrow(ex - 40, cy + 70, ex + 10, cy + 70, { color: COL.red }); }
      else { g.arrow(ex - 20, cy - 90, ex - 20, cy - 140, { color: COL.red }); g.arrow(sx + 20, cy + 90, sx + 20, cy + 140, { color: COL.red }); }
      g.text(J[j][0].toUpperCase() + ' · ' + LOAD[p.l][0].toLowerCase(), 350, 40, { size: 13, weight: 700, align: 'center' });
      const rel = stress; g.rect(200, 330, 300, 14, { fill: COL.paper, hatch: false, color: COL.faint }); g.rect(200, 330, 300 * Math.min(1, rel), 14, { fill: glue, hatch: false });
      g.text('how hard the glue works: ' + (rel >= 1 ? 'very hard' : rel > 0.5 ? 'hard' : rel > 0.2 ? 'moderate' : 'easy'), 350, 370, { size: 12, align: 'center' });
      g.text('darker red glue line = more stress on the glue', 350, 392, { size: 10.5, align: 'center', color: COL.faint });
    },
    readout(a, p) { const j = p.j | 0; return { big: J[j][0].split(' ')[0], small: (p.l === 1 ? 'peeling concentrates the load on one edge of the glue: avoid it' : 'shear spreads the load over ' + (j === 0 ? 'only the end grain' : J[j][1] + ' times the area of a butt joint')) }; },
    panels: [{
      id: 'glues', title: 'Which glue for which material',
      intro: 'Starting points. Always read the glue\'s own data for cure time and clamping, and test on scrap.',
      html: () => `<div class="tablewrap"><table class="btable"><thead><tr><th>Materials</th><th>Good choice</th><th>Notes</th></tr></thead><tbody>
        <tr><td>Wood to wood</td><td>PVA (white or yellow wood glue)</td><td>Clamp firmly; long grain to long grain. Polyurethane or waterproof PVA outdoors. Epoxy fills gaps.</td></tr>
        <tr><td>Acrylic to acrylic</td><td>Solvent cement (thin, wicks into the joint)</td><td>Melts the surfaces together for a clear joint. Super glue leaves a white haze.</td></tr>
        <tr><td>PLA, PETG prints</td><td>Super glue (CA) or epoxy</td><td>Sand the faces; add pins or keys so the glue is not the only thing holding.</td></tr>
        <tr><td>ABS prints</td><td>Acetone or ABS slurry; or CA</td><td>Acetone softens and welds ABS. Work outside or with ventilation.</td></tr>
        <tr><td>Nylon, polypropylene, polyethylene</td><td>CA with a polyolefin primer, or mechanical fixing</td><td>These plastics barely stick to anything without special primers.</td></tr>
        <tr><td>Metal to metal</td><td>Two-part structural epoxy</td><td>Roughen and degrease. Design laps, not butts.</td></tr>
        <tr><td>Metal, glass or plastic to wood</td><td>Epoxy</td><td>Fills gaps and bonds different materials.</td></tr>
        <tr><td>Foam, fabric, card</td><td>Contact adhesive, hot glue, or spray adhesive</td><td>Some solvents melt foam: test first.</td></tr></tbody></table></div>
        <ul class="rules"><li><b>Shear, not peel.</b> Put the glue line along the load. Where a part could be levered open, add a screw, pin or tab at that edge.</li>
        <li><b>Area wins, up to a point.</b> A longer overlap is stronger, but the ends of the overlap carry most of the load, so strength grows more slowly than the length. Rounding or tapering the ends of a lap helps more than making it very long.</li>
        <li><b>Thin glue lines</b> are strongest for PVA and CA; epoxy likes a gap of about 0.1 to 0.2 mm.</li>
        <li><b>Preparation:</b> clean, dry and slightly rough surfaces bond far better than smooth or dusty ones.</li></ul>`
    }]
  });
})();
