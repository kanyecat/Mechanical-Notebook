(function () {
  const { TAU, COL } = MM;
  // ISO 286 values in micrometres for each size range
  const SIZES = ['3–6', '6–10', '10–18', '18–30', '30–50', '50–65'], NOM = [6, 10, 18, 30, 50, 65];
  const IT6 = [8, 9, 11, 13, 16, 19], IT7 = [12, 15, 18, 21, 25, 30];
  // shaft letters: [fit name, use, deviation that sets the zone, which end it sets ('es' upper or 'ei' lower), grade]
  const FITS = [
    ['H7/f7', 'Running fit: turns freely with oil', [-10, -13, -16, -20, -25, -30], 'es', 7],
    ['H7/g6', 'Sliding fit: precise, slides by hand', [-4, -5, -6, -7, -9, -10], 'es', 6],
    ['H7/h6', 'Locating clearance: slides when oiled', [0, 0, 0, 0, 0, 0], 'es', 6],
    ['H7/k6', 'Transition: tap in with a soft mallet', [1, 1, 1, 2, 2, 2], 'ei', 6],
    ['H7/p6', 'Light press: pressed in, will not slip', [12, 15, 18, 22, 26, 32], 'ei', 6],
    ['H7/s6', 'Heavy press or shrink fit', [19, 23, 28, 35, 43, 53], 'ei', 6]];
  const zones = p => { const s = p.s, F = FITS[p.f], it = F[4] === 7 ? IT7[s] : IT6[s], dev = F[2][s], es = F[3] === 'es' ? dev : dev + it, ei = es - it;
    return { hole: [0, IT7[s]], shaft: [ei, es], maxC: IT7[s] - ei, minC: 0 - es }; };
  MM.register({
    slug: 'tolerances-fits', hands: false, view: { w: 700, h: 440 }, thumb: 0.5,
    params: [
      { key: 's', label: 'Size range (mm)', min: 0, max: 5, step: 1, value: 3, options: SIZES.map((x, i) => [i, x]) },
      { key: 'f', label: 'Fit', min: 0, max: 5, step: 1, value: 1, options: FITS.map((x, i) => [i, x[0]]) }
    ],
    draw(g, a, p) {
      const z = zones(p), F = FITS[p.f], y0 = 230, k = 2.6, X = 120;
      // the zero line is the nominal size; zones above are bigger, below smaller
      g.line(60, y0, 380, y0, { w: 1.4 }); g.text('nominal size (' + SIZES[p.s] + ' mm range)', 60, y0 + 18, { size: 11, color: COL.faint });
      const band = (x, w, lo, hi, col, lab) => { g.rect(x, y0 - hi * k, w, (hi - lo) * k, { fill: col, hatch: false }); g.text(lab, x + w / 2, y0 - hi * k - 12, { size: 12, weight: 700, align: 'center' }); g.text((hi > 0 ? '+' : '') + hi, x + w + 6, y0 - hi * k, { size: 10.5, color: COL.faint }); g.text((lo > 0 ? '+' : '') + lo, x + w + 6, y0 - lo * k, { size: 10.5, color: COL.faint }); };
      band(X, 80, z.hole[0], z.hole[1], MM.tint('blue', .5), 'hole H7');
      band(X + 130, 80, z.shaft[0], z.shaft[1], MM.tint('red', .5), 'shaft ' + F[0].split('/')[1]);
      g.text('µm', 60, 40, { size: 11, color: COL.faint });
      // shaft going into the hole, with the fit drawn ×300
      const u = MM.cycle(a, 0.18), cx = 540, hr = 70, sr = hr - (z.minC + z.maxC) / 2 * 0.3;
      const press = z.maxC < 0 || (z.minC < 0 && z.maxC < 5);
      g.rect(cx - 120, 220, 240, 150, { sp: 6 }); g.rect(cx - hr, 220, 2 * hr, 150, { fill: COL.paper, hatch: false });
      const yS = 220 - 160 * (1 - u) + 20; g.rect(cx - sr, yS - 100, 2 * sr, 220 > yS ? 120 : 120, { fill: MM.tint('red', .5), hatch: false });
      if (sr > hr && u > 0.6) { g.rect(cx - sr, 220, sr - hr, Math.min(150, yS + 20 - 220), { fill: MM.tint('red', .9), hatch: false, color: 'transparent' }); g.rect(cx + hr, 220, sr - hr, Math.min(150, yS + 20 - 220), { fill: MM.tint('red', .9), hatch: false, color: 'transparent' }); }
      g.text(F[1], 220, 360, { size: 12, weight: 700, align: 'center' });
      g.text((z.minC >= 0 ? 'clearance ' : z.maxC <= 0 ? 'interference ' : 'clearance or interference ') + Math.abs(z.minC) / 1000 + ' to ' + Math.abs(z.maxC) / 1000 + ' mm', 220, 382, { size: 11, align: 'center' });
      g.text('fit drawn ×300', cx, 400, { size: 10.5, align: 'center', color: COL.faint });
    },
    readout(a, p) { const z = zones(p), F = FITS[p.f]; return { big: F[0], small: 'hole +' + z.hole[0] + '/+' + z.hole[1] + ' µm, shaft ' + (z.shaft[0] >= 0 ? '+' : '') + z.shaft[0] + '/' + (z.shaft[1] >= 0 ? '+' : '') + z.shaft[1] + ' µm: ' + (z.minC >= 0 ? 'always a clearance' : z.maxC <= 0 ? 'always a squeeze' : 'either, depending on the parts') }; },
    panels: [{
      id: 'fits', title: 'Limits for every fit in this size range', live: true,
      intro: 'In micrometres (µm; 1000 µm = 1 mm), for the hole-basis system: the hole is always H7, and the shaft letter sets the fit. Positive clearance means a gap; negative means the shaft is bigger (interference).',
      html: p => `<div class="tablewrap"><table class="btable"><thead><tr><th>Fit</th><th>Use</th><th>Hole</th><th>Shaft</th><th>Clearance (min to max)</th></tr></thead><tbody>${FITS.map((F, i) => { const z = zones({ s: p.s, f: i }); return `<tr${i === +p.f ? ' style="font-weight:700"' : ''}><td>${F[0]}</td><td>${F[1]}</td><td>+0 / +${z.hole[1]}</td><td>${z.shaft[0] >= 0 ? '+' : ''}${z.shaft[0]} / ${z.shaft[1] >= 0 ? '+' : ''}${z.shaft[1]}</td><td>${z.minC} to ${z.maxC}</td></tr>`; }).join('')}</tbody></table></div>`
    }, {
      id: 'general', title: 'General tolerances (ISO 2768)',
      intro: 'A note such as "ISO 2768-m" on a drawing sets the tolerance for every dimension that has none of its own. Medium (m) suits most machined parts; fine (f) costs more.',
      html: () => `<div class="tablewrap"><table class="btable"><thead><tr><th>Length (mm)</th><th>0.5–3</th><th>3–6</th><th>6–30</th><th>30–120</th><th>120–400</th><th>400–1000</th></tr></thead><tbody>
        <tr><td>fine (f)</td><td>±0.05</td><td>±0.05</td><td>±0.1</td><td>±0.15</td><td>±0.2</td><td>±0.3</td></tr>
        <tr><td>medium (m)</td><td>±0.1</td><td>±0.1</td><td>±0.2</td><td>±0.3</td><td>±0.5</td><td>±0.8</td></tr>
        <tr><td>coarse (c)</td><td>±0.2</td><td>±0.3</td><td>±0.5</td><td>±0.8</td><td>±1.2</td><td>±2</td></tr></tbody></table></div>`
    }, {
      id: 'process', title: 'What each process can hold',
      intro: 'Typical tolerances on a good machine run with care. Tighter is possible with extra effort and cost.',
      html: () => `<div class="tablewrap"><table class="btable"><thead><tr><th>Process</th><th>Typical tolerance</th><th>Typical surface finish (Ra)</th></tr></thead><tbody>
        <tr><td>CNC milling</td><td>±0.025 to ±0.13 mm</td><td>0.8 to 3.2 µm</td></tr><tr><td>CNC turning</td><td>±0.01 to ±0.05 mm</td><td>0.4 to 3.2 µm</td></tr>
        <tr><td>Grinding</td><td>±0.002 to ±0.01 mm</td><td>0.1 to 0.8 µm</td></tr><tr><td>Reamed hole</td><td>H7 (about 0.015 to 0.025 mm)</td><td>0.8 to 1.6 µm</td></tr>
        <tr><td>Laser cutting (sheet)</td><td>±0.1 to ±0.2 mm</td><td>edge depends on material</td></tr><tr><td>Waterjet</td><td>±0.1 to ±0.25 mm</td><td>1.6 to 6.3 µm</td></tr>
        <tr><td>Plasma</td><td>±0.5 to ±1 mm</td><td>rough, with dross</td></tr><tr><td>CNC router (wood)</td><td>±0.1 to ±0.3 mm (wood moves)</td><td>—</td></tr>
        <tr><td>FDM 3D printing</td><td>±0.2 to ±0.5 mm</td><td>layer lines</td></tr><tr><td>Resin (SLA) printing</td><td>±0.05 to ±0.15 mm</td><td>smooth</td></tr></tbody></table></div>`
    }]
  });
})();
