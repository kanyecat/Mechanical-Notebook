(function () {
  const { TAU, COL } = MM;
  const SPEED = [['Too slow', 0.5, 'low-speed dross: big globs under the cut, wide kerf'], ['Right', 1, 'clean: little or no dross, lines nearly upright'], ['Too fast', 1.5, 'high-speed dross: a hard bead, arc lags and throws sparks up']];
  // [current A, mild steel thickness for good-quality cuts (mm), largest severance cut (mm)] — typical for air plasma; check your torch's chart
  const AMPS = [[30, 6, 12], [45, 12, 25], [65, 16, 32], [85, 20, 38], [105, 22, 50]];
  const xnOf = a => 150 + (((a / TAU) % 1 + 1) % 1) * 360, kOf = p => Math.min(9, 150 / p.T);
  const PARTS = [
    { n: 'Torch and consumables', box: a => [xnOf(a) - 30, 56, 60, 130], what: 'Make and shape the arc.', how: 'Inside: an electrode (where the arc starts), a swirl ring that spins the gas, a nozzle with a small hole that squeezes the arc, and a shield. The electrode and nozzle wear and are replaced as a pair.' },
    { n: 'Arc and gas jet', box: (a, p) => [xnOf(a) - 40, 186, 60, p.T * kOf(p) + 30], what: 'Melt the metal and blow it out of the cut.', how: 'The constricted arc heats the gas into plasma; the fast gas carries the molten metal out of the bottom. The arc must reach the work, so the work must conduct.' },
    { n: 'Plate and work clamp', box: (a, p) => [56, 196, 568, p.T * kOf(p) + 8], what: 'The work, and its electrical connection.', how: 'The work clamp completes the circuit back to the power supply. Clamp to clean, bare metal or the arc starts poorly.' },
    { n: 'Power supply', what: 'Provides the cutting current.', how: 'A constant-current supply, rated in amps. More amps cut thicker plate and faster, but need bigger consumables.' },
    { n: 'Air supply and dryer', what: 'Provide clean, dry gas at a steady pressure.', how: 'Usually compressed air; nitrogen or oxygen for better edges on some machines. Water or oil in the air destroys consumables quickly.' },
    { n: 'Torch height control', what: 'Hold the cut height steady on a CNC table.', how: 'It measures the arc voltage, which rises as the torch lifts, and moves the torch to keep the voltage, and the height, constant.' },
    { n: 'Water or downdraft table', what: 'Catch sparks and fumes.', how: 'Water under the plate traps fumes and cools the parts; a downdraft table pulls fumes down into a filter.' }
  ];
  MM.register({
    slug: 'plasma-cutter', hands: false, view: { w: 700, h: 440 }, thumb: 0.4,
    params: [{ key: 's', label: 'Cutting speed', min: 0, max: 2, step: 1, value: 1, options: SPEED.map((x, i) => [i, x[0]]) }, { key: 'T', label: 'Plate thickness', unit: ' mm', min: 3, max: 20, step: 1, value: 10 }],
    parts: PARTS,
    draw(g, a, p) {
      const sp = SPEED[p.s], k = Math.min(9, 150 / p.T), T = p.T * k, top = 200, u = ((a / TAU) % 1 + 1) % 1, xn = 150 + u * 360, lag = (sp[1] - 0.75) * 0.5 * T, kerf = (p.s === 0 ? 3.2 : 2.2) * k;
      g.rect(60, top, 560, T, { sp: 6 });
      // cut behind the torch
      const fr = d => xn - Math.max(0, lag) * d * d;
      g.poly([[60, top], [xn, top], [fr(1), top + T], [60, top + T]], { fill: COL.paper });
      g.trace(Array.from({ length: 21 }, (_, i) => [fr(i / 20), top + i / 20 * T]), { color: COL.red, w: 2 });
      // dross under the cut edge
      for (let x = 70; x < fr(1) - 6; x += p.s === 0 ? 18 : 10) { if (p.s === 1 && (x % 40) > 10) continue; const r = p.s === 0 ? 6 + 3 * Math.sin(x) : 2.5; g.circle(x, top + T + r * 0.7, r, { fill: MM.tint('red', .55) }); }
      // torch, arc and sparks
      g.poly([[xn - 26, 60], [xn + 26, 60], [xn + 14, top - 22], [xn - 14, top - 22]], { fill: COL.white });
      g.rect(xn - 5, top - 22, 10, 8, { fill: COL.white, hatch: false });
      const arc = []; for (let i = 0; i <= 14; i++) { const d = i / 14; arc.push([xn + 3 * Math.sin(a * 30 + i) - Math.max(0, lag) * d * d * (d > 0 ? 1 : 0), top - 14 + d * (T + 14) + (i === 14 ? 10 : 0)]); }
      g.trace(arc, { color: MM.tint('blue', 1), w: 3 });
      const up = p.s === 2; for (let i = 0; i < 8; i++) { const t = (a * 2 + i * 0.13) % 1; const sx = fr(1) - 10 - t * 60, sy = up ? top - t * 80 : top + T + 10 + t * 70; g.dot(sx, sy, 2, COL.red); }
      g.text('illustration: lag, dross and sparks exaggerated, not to scale', 60, 30, { size: 10.5, color: COL.faint });
      g.text('cut height ~1.5 mm', xn + 34, top - 18, { size: 11, color: COL.faint });
      g.text(sp[0].toUpperCase(), 560, 70, { size: 18, weight: 800, align: 'center', color: p.s === 1 ? COL.ink : COL.red });
      g.text(sp[2], 350, 420, { size: 12, align: 'center' });
      g.arrow(xn - 70, 120, xn - 30, 120, { color: COL.red });
    },
    readout(a, p) { const sp = SPEED[p.s], am = AMPS.find(x => x[1] >= p.T) || AMPS[AMPS.length - 1]; return { big: sp[0], small: sp[2] + '; for ' + p.T + ' mm mild steel use about a ' + am[0] + ' A torch or more' }; },
    panels: [{
      id: 'amps', title: 'Sizing a plasma cutter', live: true,
      intro: 'Typical air-plasma figures for mild steel. "Good quality" is the thickness the machine cuts cleanly at a useful speed; "severance" is the most it can get through at all, slowly and roughly. Always check your machine\'s own chart.',
      html: p => `<div class="tablewrap"><table class="btable"><thead><tr><th>Current</th><th>Good-quality cut</th><th>Severance</th></tr></thead><tbody>${AMPS.map(x => `<tr${x === (AMPS.find(y => y[1] >= p.T) || AMPS[AMPS.length - 1]) ? ' style="font-weight:700"' : ''}><td>${x[0]} A</td><td>${x[1]} mm</td><td>${x[2]} mm</td></tr>`).join('')}</tbody></table></div>`
    }, {
      id: 'tips', title: 'Getting a clean cut',
      html: () => `<ul class="rules"><li><b>Dross tells you the speed:</b> big soft globs mean too slow; a small hard bead that needs grinding means too fast; little dross that knocks off means about right.</li>
        <li><b>Cut height:</b> keep it steady (CNC tables use torch height control). Too high widens the bevel; too low wears the nozzle.</li>
        <li><b>Pierce height:</b> higher than the cut height (about 1.5 to 2 times) so molten metal does not blow back into the nozzle.</li>
        <li><b>Dry air:</b> water or oil in the air supply ruins consumables fast. Use a dryer or filter.</li>
        <li><b>Consumables:</b> replace the electrode and nozzle as a pair when the cut starts to wander or bevel.</li>
        <li><b>Holes:</b> holes smaller than about 1.5 times the plate thickness come out tapered and rough; drill them instead.</li>
        <li><b>Accuracy:</b> CNC plasma is typically ±0.5 mm with a slight bevel; fine for brackets and art, not for close fits.</li></ul>`
    }, {
      id: 'safety', title: 'Safety',
      html: () => `<div class="tablewrap"><table class="btable"><thead><tr><th>Current</th><th>Smallest lens shade</th></tr></thead><tbody><tr><td>Under 20 A</td><td>4</td></tr><tr><td>20 to 40 A</td><td>5</td></tr><tr><td>40 to 60 A</td><td>6</td></tr><tr><td>60 to 80 A</td><td>8</td></tr><tr><td>80 to 300 A</td><td>8</td></tr></tbody></table></div>
        <ul class="rules"><li>The arc gives off strong ultraviolet light: protect eyes and skin, and screen other people.</li><li>Fumes: cut outdoors or with extraction. Never cut galvanised (zinc) or painted steel without strong ventilation: zinc fumes cause metal fume fever.</li>
        <li>Fire: sparks travel metres. Clear flammables and keep an extinguisher close.</li><li>Electric shock: keep gloves and the work area dry, and attach the work clamp to clean metal.</li></ul>`
    }]
  });
})();
