(function () {
  const { TAU, COL } = MM;
  // vernier scales: [resolution mm, divisions, length the divisions span (mm)]
  const VER = [[0.02, 50, 49], [0.05, 20, 19], [0.1, 10, 9]];
  const value = (a, res) => Math.round((22 + 14 * Math.sin(a * 0.5)) / res) * res;
  const PARTS = [
    { n: 'Fixed jaw', box: [46, 66, 38, 98], what: 'One side of the measurement, part of the beam.', how: 'The part sits against its flat face. Measure close to the beam: readings near the jaw tips are less accurate.' },
    { n: 'Sliding jaw and vernier', box: a => { const v = value(a, 0.05); return [80 + v * 6 - 4, 60, 78, 104]; }, what: 'Moves to touch the other side of the part, and carries the vernier scale.', how: 'Close it with the same light pressure each time. The vernier scale on it gives the fine part of the reading.' },
    { n: 'Beam and main scale', box: [46, 66, 568, 30], what: 'The ruler the jaw slides along.', how: 'Marked in whole millimetres (or 0.025 inch). The vernier zero shows how many whole millimetres to read.' },
    { n: 'Scales, magnified', box: [44, 180, 612, 140], what: 'How the reading is made.', how: 'Read whole millimetres where the vernier zero sits, then the vernier line that lines up exactly with any main-scale line.' },
    { n: 'Inside jaws', what: 'Measure holes and slots.', how: 'Small knife-edge jaws on the top of the caliper open outwards inside a hole.' },
    { n: 'Depth rod', what: 'Measures the depth of holes and steps.', how: 'A thin rod slides out of the end of the beam as the jaw opens; rest the end of the beam on the top face and push the rod down.' },
    { n: 'Locking screw', what: 'Holds a setting.', how: 'Lock the jaw to use the caliper as a quick go/no-go gauge or to transfer a size.' }
  ];
  MM.register({
    slug: 'measuring', view: { w: 700, h: 440 }, thumb: 0.1,
    params: [{ key: 'r', label: 'Vernier', min: 0, max: 2, step: 1, value: 1, options: VER.map((x, i) => [i, x[0] + ' mm']) }],
    parts: PARTS,
    draw(g, a, p) {
      const [res, n, span] = VER[p.r], v = value(a, res), whole = Math.floor(v + 1e-9), line = Math.round((v - whole) / res);
      // the caliper (small): fixed jaw on the left, sliding jaw at v
      const k0 = 6, X0 = 80, Y0 = 70;
      g.rect(X0 - 30, Y0, 560, 22, { fill: COL.white, hatch: false });
      g.poly([[X0 - 30, Y0], [X0, Y0], [X0, Y0 + 90], [X0 - 30, Y0 + 70]], { fill: COL.white });
      const jx = X0 + v * k0; g.poly([[jx, Y0 - 6], [jx + 70, Y0 - 6], [jx + 70, Y0 + 30], [jx + 30, Y0 + 30], [jx + 30, Y0 + 70], [jx, Y0 + 90]], { fill: MM.tint('white', .9) });
      g.rect(X0, Y0 + 40, v * k0, 40, { fill: MM.tint('red', .4), hatch: false }); g.text('part', X0 + v * k0 / 2, Y0 + 60, { size: 11, align: 'center' });
      // magnified scales
      const W = 600, x0 = 50, lo = whole - 1, hi = lo + span + 3, k = W / (hi - lo), ym = 260, X = mm => x0 + (mm - lo) * k;
      g.text('main scale (mm)', x0, ym - 70, { size: 11, color: COL.faint });
      for (let mm = Math.ceil(lo); mm <= hi; mm++) { const big = mm % 10 === 0, mid = mm % 5 === 0; g.line(X(mm), ym, X(mm), ym - (big ? 34 : mid ? 26 : 18), { w: 1.2, color: COL.ink }); if (big || mm === whole) g.text(String(mm), X(mm), ym - 44, { size: 11, align: 'center', weight: mm === whole ? 800 : 500, color: mm === whole ? COL.red : COL.ink }); }
      g.line(x0, ym, x0 + W, ym, { w: 1 });
      g.text('vernier', x0, ym + 70, { size: 11, color: COL.faint });
      for (let i = 0; i <= n; i++) { const pos = v + i * span / n, hit = i === line; if (pos > hi) break; g.line(X(pos), ym + 2, X(pos), ym + (i % 5 === 0 ? 30 : 20), { w: hit ? 2.4 : 1.1, color: hit ? COL.red : COL.ink }); if (i % 5 === 0) g.text(String(Math.round(i * res * 100) / 100 * (res < 0.05 ? 1 : 1)).replace(/^0\./, '.'), X(pos), ym + 42, { size: 10, align: 'center', color: COL.faint }); }
      g.line(X(v), ym + 2, X(v), ym + 34, { w: 2, color: COL.blue });
      const match = whole + Math.round(line * span / n + (v - whole));
      g.line(X(match), ym - 20, X(match), ym, { w: 2.4, color: COL.red });
      g.text('vernier zero is past ' + whole + ' mm', X(v), ym + 92, { size: 11, color: COL.blue });
      g.text('line ' + line + ' lines up: + ' + line + ' × ' + res + ' = ' + MM.num(line * res, 2) + ' mm', 360, 400, { size: 13, weight: 700, align: 'center', color: COL.red });
      g.text('reading ' + v.toFixed(2) + ' mm', 360, 425, { size: 16, weight: 800, align: 'center' });
    },
    readout(a, p) { const res = VER[p.r][0], v = value(a, res); return { big: v.toFixed(2) + ' mm', small: Math.floor(v + 1e-9) + ' whole millimetres plus the vernier line that lines up × ' + res + ' mm' }; },
    panels: [{
      id: 'tools', title: 'Measuring tools and how far to trust them',
      intro: 'Typical figures for good tools. Resolution is the smallest step you can read; accuracy is how close the reading is to the truth. Use a tool about ten times more accurate than the tolerance you are checking.',
      html: () => `<div class="tablewrap"><table class="btable"><thead><tr><th>Tool</th><th>Reads to</th><th>Typical accuracy</th><th>Good for</th></tr></thead><tbody>
        <tr><td>Steel rule</td><td>0.5 mm</td><td>±0.2 mm</td><td>Rough lengths, marking out</td></tr>
        <tr><td>Vernier or digital caliper</td><td>0.02 or 0.01 mm</td><td>±0.02 to ±0.03 mm</td><td>Outside, inside, depth and step sizes</td></tr>
        <tr><td>Outside micrometer</td><td>0.01 mm (0.001 with vernier)</td><td>±0.002 to ±0.004 mm</td><td>Diameters and thicknesses</td></tr>
        <tr><td>Bore gauge, telescoping gauges</td><td>0.001 to 0.01 mm</td><td>depends on setting</td><td>Hole sizes</td></tr>
        <tr><td>Dial indicator</td><td>0.01 mm</td><td>±0.01 mm over a turn</td><td>Runout, flatness, setting up</td></tr>
        <tr><td>Test (lever) indicator</td><td>0.002 to 0.01 mm</td><td>small range</td><td>Indicating vises, chucks and bores</td></tr>
        <tr><td>Height gauge on a surface plate</td><td>0.01 mm</td><td>±0.02 mm</td><td>Heights and marking out</td></tr>
        <tr><td>Gauge pins, gauge blocks</td><td>fixed sizes</td><td>±0.001 mm or better</td><td>Checking holes; setting other tools</td></tr>
        <tr><td>Thread and radius gauges</td><td>go / no-go</td><td>—</td><td>Pitch, thread fit, corner radii</td></tr></tbody></table></div>`
    }, {
      id: 'mic', title: 'Reading a micrometer',
      html: () => `<ol class="rules"><li>Read the sleeve: whole millimetres above the line, and a half-millimetre mark below it if one is showing.</li>
        <li>Read the thimble: the line that meets the sleeve's centre line, in hundredths (0 to 49 on a metric micrometer).</li>
        <li>Add them: 12 mm + 0.5 mm + 0.37 mm = 12.87 mm.</li>
        <li>Always close it with the ratchet or friction thimble so the pressure is the same every time, and check the zero with the anvils clean.</li></ol>`
    }, {
      id: 'tips', title: 'Measuring well',
      html: () => `<ul class="rules"><li><b>Temperature:</b> parts are measured at 20 °C. A 100 mm steel part straight off the machine at 40 °C is about 0.02 mm too big.</li>
        <li><b>Clean</b> the faces of the part and tool; a chip or film of oil adds error.</li>
        <li><b>Measure several times and in several places:</b> holes and shafts are rarely perfectly round or straight.</li>
        <li><b>Abbe error:</b> calipers read the jaws away from the scale, so tilting or measuring at the jaw tips adds error. Measure as deep in the jaws as you can.</li>
        <li><b>Feel:</b> use the same light pressure each time; squeezing a caliper can change the reading by a few hundredths.</li></ul>`
    }]
  });
})();
