(function () {
  const { TAU, COL } = MM;
  // interference as a percentage of the pin diameter: [label, holds from, cracks above]  (starting points, not guarantees)
  const MAT = { 0: ['Acrylic', 0.3, 1.0], 1: ['Printed PLA', 1.0, 3.0], 2: ['Plywood', 2.0, 5.0] };
  const state = (pct, m) => pct < 0 ? ['LOOSE', 'there is a gap, the pin will not hold'] : pct < MAT[m][1] ? ['MAY SLIP', 'too little squeeze, the pin can turn or fall out'] : pct <= MAT[m][2] ? ['HOLDS', 'enough squeeze to grip, not enough to crack'] : ['MAY CRACK', 'too much squeeze for ' + MAT[m][0].toLowerCase() + ', the part can split'];
  function meter(g, x, y, w, v, max, lo, hi, label) {
    g.rect(x, y, w, 12, { fill: COL.paper, hatch: false, color: COL.faint, w: 1 });
    g.rect(x + lo / max * w, y, (hi - lo) / max * w, 12, { fill: MM.tint('blue', 0.45), hatch: false, color: COL.blue, w: 1 });
    const px = x + Math.max(0, Math.min(1, v / max)) * w; g.line(px, y - 6, px, y + 18, { w: 2.4, color: COL.red });
    g.text(label, x, y - 16, { size: 10, color: COL.faint }); g.text('0', x, y + 30, { size: 10, color: COL.faint }); g.text(max + '%', x + w, y + 30, { size: 10, color: COL.faint, align: 'right' });
  }
  MM.register({
    slug: 'press-fit', view: { w: 700, h: 440 }, thumb: 0.5,
    params: [
      { key: 'd', label: 'Pin diameter', unit: ' mm', min: 3, max: 12, step: 1, value: 6 },
      { key: 'i', label: 'Interference', unit: ' mm', min: -0.1, max: 0.4, step: 0.01, value: 0.1 },
      { key: 'm', label: 'Material', min: 0, max: 2, step: 1, value: 1, options: [[0, 'Acrylic'], [1, 'Printed PLA'], [2, 'Plywood']] }
    ],
    draw(g, a, p) {
      const u = MM.cycle(a), s = 12, hw = p.d * s, X = 14, ex = p.i * s * X, pw = hw + ex, cx = 230, yt = 230, bt = 130, pin = 150, pct = p.i / p.d * 100;
      g.rect(70, yt, cx - hw / 2 - 70, bt); g.rect(cx + hw / 2, yt, 390 - cx - hw / 2, bt);
      g.text('plate with a Ø ' + p.d + ' mm hole', 80, yt + bt + 18, { size: 11, color: COL.faint });
      const Lp = pin + 30, y0 = (yt - Lp - 40) + ((yt + bt - 10 - Lp) - (yt - Lp - 40)) * u;
      g.rect(cx - pw / 2, y0, pw, Lp, { fill: MM.tint('white', 0.96) });
      if (p.i > 0 && u > 0.5) { const k = Math.min(1, (u - 0.5) / 0.3), ov = ex / 2, hh = Math.min(bt, y0 + Lp - yt); if (hh > 0) { g.rect(cx - pw / 2, yt, ov, hh, { fill: MM.tint('red', 0.7 * k), hatch: false, color: 'transparent' }); g.rect(cx + hw / 2, yt, ov, hh, { fill: MM.tint('red', 0.7 * k), hatch: false, color: 'transparent' }); } }
      g.text('pin', cx + pw / 2 + 12, y0 + 40, { size: 11, color: COL.faint });
      g.text('pin Ø ' + (p.d + p.i).toFixed(2) + ' mm', cx, 40, { size: 12, align: 'center', weight: 700, color: COL.red });
      g.text('(squeeze drawn ×' + X + ')', cx, 58, { size: 10, align: 'center', color: COL.faint });
      const st = state(pct, p.m), m = MAT[p.m]; const mx = 440, mw = 220;
      g.text(st[0], mx, 150, { size: 20, weight: 800, color: COL.red });
      g.text(pct.toFixed(1) + '% of the diameter', mx, 178, { size: 12 });
      meter(g, mx, 230, mw, pct, 6, m[1], m[2], m[0].toUpperCase() + ': BLUE BAND HOLDS');
    },
    readout(a, p) { const pct = p.i / p.d * 100, st = state(pct, p.m); return { big: st[0], small: p.i.toFixed(2) + ' mm squeeze is ' + pct.toFixed(1) + '% of the pin diameter, ' + st[1] }; },
    panels: [{
      id: 'starts', title: 'Starting values', live: true,
      intro: 'These are rough starting points for a pin pushed into a hole of the same material. Cutters, printers and batches vary, so cut or print a few test holes first and keep the one that feels right.',
      html: p => `<div class="tablewrap"><table class="btable"><thead><tr><th>Material</th><th>Holds from</th><th>Risk of cracking above</th><th>For a Ø ${p.d} mm pin</th></tr></thead><tbody>${Object.keys(MAT).map(k => { const m = MAT[k]; return `<tr${+k === +p.m ? ' style="font-weight:700"' : ''}><td>${m[0]}</td><td>${m[1]}%</td><td>${m[2]}%</td><td>${(m[1] * p.d / 100).toFixed(2)} to ${(m[2] * p.d / 100).toFixed(2)} mm</td></tr>`; }).join('')}</tbody></table></div>
        <ul class="rules"><li><b>Interference</b> is the pin diameter minus the hole diameter. It is a small number, often a few hundredths of a millimetre.</li>
        <li><b>Laser cutting:</b> account for the kerf first (see Laser Kerf and Fit), then add the interference.</li>
        <li><b>Chamfer the pin tip</b> so it starts straight, and add a little relief so the hole can stretch instead of splitting near an edge.</li>
        <li><b>Do not press the same joint many times.</b> Plastic relaxes and wood crushes, so the grip gets weaker each time.</li></ul>`
    }, {
      id: 'shapes', title: 'Tolerance for each shape', live: true,
      intro: 'The interference numbers above are for a round pin in a round hole. Other shapes behave differently, and each has a usual fix. Treat the numbers as starting points and test one.',
      html: p => { const d = p.d, diag = d * Math.SQRT2; return `<div class="tablewrap"><table class="btable"><thead><tr><th>Shape</th><th>What goes wrong</th><th>How to solve it</th></tr></thead><tbody>
        <tr><td>Round pin and hole</td><td>Nothing special: the squeeze is the same all round.</td><td>Use the interference from the table above. Chamfer the pin tip so it starts straight.</td></tr>
        <tr><td>Square (${d} mm side)</td><td>The corners are ${diag.toFixed(1)} mm apart across the diagonal, so any oversize is felt most there. Printed and routed holes have round corners that a sharp pin corner cannot enter.</td><td>Round or chamfer the pin corners. In prints, add a small relief hole at each inside corner of the hole. In CNC, add dog-bones.</td></tr>
        <tr><td>Hexagon</td><td>Same as a square, but with six corners.</td><td>Relieve the corners of the hole, or press on the flats only by leaving the corners clear.</td></tr>
        <tr><td>Rectangular tab in a slot</td><td>Only the thickness matters. Squeezing the length too makes it jam, and sharp ends can split the sheet.</td><td>Press across the thickness only. Make the slot 0.1 to 0.2 mm longer than the tab and round the ends.</td></tr>
        <tr><td>Round with a flat (D)</td><td>The flat and the round part want different clearances, and the pin can rock on the flat.</td><td>Press on the round part. Leave the flat with a small clearance and use it only to stop turning.</td></tr>
        <tr><td>Any shape, loose tolerances</td><td>One tight dimension has to be right to a few hundredths of a millimetre.</td><td>Use crush ribs or a slotted pin so only small features are squeezed.</td></tr></tbody></table></div>`; }
    }]
  });
})();
