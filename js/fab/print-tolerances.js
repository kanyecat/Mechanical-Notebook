(function () {
  const { TAU, COL } = MM;
  const LH = 0.2, SHRINK = 0.25;   // layer height used in the drawing, and a typical amount a printed hole comes out small (mm). Starting values, check your own printer.
  const off = p => Math.tan(p.ang * Math.PI / 180) * LH;      // how far each layer sticks out past the one below
  const lap = p => 1 - off(p) / p.nz;                            // fraction of each line that still sits on the layer below
  const verdict = p => lap(p) >= 0.5 ? ['PRINTS FINE', 'at least half of each line sits on the layer below'] : lap(p) >= 0.25 ? ['ROUGH', 'the underside will sag and look rough'] : ['NEEDS SUPPORT', 'most of each line hangs in the air'];
  MM.register({
    slug: 'print-tolerances', view: { w: 700, h: 440 }, thumb: 0.6,
    params: [
      { key: 'ang', label: 'Overhang angle from vertical', unit: ' °', min: 0, max: 80, step: 5, value: 40 },
      { key: 'nz', label: 'Nozzle', unit: ' mm', min: 0.2, max: 0.8, step: 0.2, value: 0.4 },
      { key: 'd', label: 'Hole for a pin of', unit: ' mm', min: 3, max: 12, step: 1, value: 5 }
    ],
    draw(g, a, p) {
      const u = MM.cycle(a), sx = 70, lw = p.nz * sx, lh = 14, o = off(p) * sx, n = 1 + Math.floor(u * 11), base = 340, x0 = 90, v = verdict(p), bad = lap(p) < 0.5;
      g.text('OVERHANG (layers not to scale)', x0, 40, { size: 10, color: COL.faint });
      g.line(x0 - 20, base, x0 + 230, base, { w: 1.8 });
      for (let i = 0; i < n; i++) {
        const x = x0 + i * o, y = base - (i + 1) * lh, hang = i > 0 && lap(p) < 0.5;
        g.rect(x, y, lw, lh, { fill: hang ? MM.tint('red', 0.45) : MM.tint('white', 0.96), hatch: false, color: hang ? COL.red : COL.ink, w: 1.2 });
      }
      g.text(v[0], x0, 70, { size: 16, weight: 800, color: bad ? COL.red : COL.blue });
      g.text(Math.round(lap(p) * 100) + '% of each line sits on the layer below', x0, 94, { size: 11 });
      g.text(v[1], x0, 114, { size: 10, color: COL.faint });
      // printed hole shrinks
      const cx = 520, cy = 190, s = 16, rd = p.d * s / 2, rp = (p.d - SHRINK * u) * s / 2 - 0;
      g.text('HOLE FOR A Ø ' + p.d + ' mm PIN', cx, 70, { size: 10, align: 'center', color: COL.faint });
      g.circle(cx, cy, rd, { color: COL.faint, dash: [4, 4], w: 1 });
      g.circle(cx, cy, rp, { fill: COL.paper, w: 2 });
      g.text('drawn Ø ' + p.d + ' mm', cx, cy - rd - 14, { size: 11, align: 'center', color: COL.faint });
      g.text('printed ≈ Ø ' + (p.d - SHRINK).toFixed(2) + ' mm', cx, cy + rd + 22, { size: 12, align: 'center', weight: 700, color: COL.red });
      g.text('(shrink drawn ×' + (s / 3).toFixed(0) + ')', cx, cy + rd + 40, { size: 10, align: 'center', color: COL.faint });
      g.text('draw it Ø ' + (p.d + 0.3).toFixed(1) + ' mm to pass the pin', cx, 300, { size: 12, align: 'center', weight: 700 });
      g.text('thinnest wall: ' + (2 * p.nz).toFixed(1) + ' mm (two lines)', cx, 330, { size: 11, align: 'center', color: COL.faint });
    },
    readout(a, p) { const v = verdict(p); return { big: v[0], small: p.ang + '° overhang with a ' + p.nz + ' mm nozzle: ' + v[1] + '. Draw a hole for a ' + p.d + ' mm pin at Ø ' + (p.d + 0.3).toFixed(1) + ' mm.' }; },
    panels: [{
      id: 'rules', title: 'Rules of thumb', live: true,
      intro: 'Every printer is a little different, so treat these as starting values and confirm them with a test print.',
      html: p => `<div class="tablewrap"><table class="btable"><thead><tr><th>Feature</th><th>Starting value</th></tr></thead><tbody>
        <tr><td>Overhang that needs no support</td><td>about 45° from vertical (here: ${p.ang}°, ${Math.round(lap(p) * 100)}% overlap)</td></tr>
        <tr><td>Hole for a pin of Ø ${p.d} mm</td><td>draw Ø ${(p.d + 0.2).toFixed(1)} to ${(p.d + 0.4).toFixed(1)} mm</td></tr>
        <tr><td>Thinnest wall</td><td>two lines wide, ${(2 * p.nz).toFixed(1)} mm with a ${p.nz} mm nozzle</td></tr>
        <tr><td>Short bridge across a gap</td><td>works for a few centimetres, sags a little in the middle</td></tr></tbody></table></div>
        <ul class="rules"><li><b>Print a tolerance test:</b> a row of holes in 0.1 mm steps. Keep the one the pin slides into by hand.</li>
        <li><b>Round holes printed on their side</b> sag at the top. Use a teardrop or diamond shape so the top comes to a point.</li>
        <li><b>Add a chamfer</b> to the bottom edge of the part, where the first layer is squashed outward and makes a lip (elephant foot).</li></ul>`
    }]
  });
})();
