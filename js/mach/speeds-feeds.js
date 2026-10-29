(function () {
  const { TAU, COL } = MM, CUT = window.MM_CUT, SHORT = ['Alu', 'Brass', 'Mild steel', 'Alloy steel', 'Stainless', 'Cast iron', 'Plastic'];
  const calc = p => { const c = CUT[p.m], v = p.tool ? c[2] : c[1], vc = (v[0] + v[1]) / 2, rpm = 1000 * vc / (Math.PI * p.d), fz = (c[3][0] + c[3][1]) / 2 * p.d * (p.tool ? 1 : 0.7), r = p.ae / 100, k = r >= 0.5 ? 1 : 1 / Math.sqrt(1 - (1 - 2 * r) ** 2);
    return { c, v, vc, rpm, fz, k, feed: rpm * p.z * fz, feedK: rpm * p.z * fz * k }; };
  // chip thickness for one flute through a turn, as a share of the feed per tooth
  const chip = (t, p) => { const r = p.ae / 100; return Math.cos(t) > 1 - 2 * r && Math.sin(t) > 0 ? Math.sin(t) : 0; };   // t: how far the flute has turned from pointing into the work
  MM.register({
    slug: 'speeds-feeds', hands: false, view: { w: 700, h: 430 }, thumb: 0.3,
    params: [
      { key: 'd', label: 'Cutter diameter', unit: ' mm', min: 2, max: 25, step: 1, value: 10 },
      { key: 'z', label: 'Flutes', min: 1, max: 6, step: 1, value: 3 },
      { key: 'ae', label: 'Radial engagement', unit: ' %', min: 5, max: 100, step: 5, value: 25 },
      { key: 'm', label: 'Material', min: 0, max: 6, step: 1, value: 0, options: SHORT.map((x, i) => [i, x]) },
      { key: 'tool', label: 'Cutter', min: 0, max: 1, step: 1, value: 1, options: [[0, 'HSS'], [1, 'Carbide']] }
    ],
    draw(g, a, p) {
      const q = calc(p), C = [230, 215], R = 130, ae = Math.min(2 * R, p.ae / 100 * 2 * R);
      // work on the right, engaged a width ae into the cutter (seen from above; cutter turning clockwise, moving up the page)
      g.rect(C[0] + R - ae, 30, 470 - (C[0] + R - ae), 370, { sp: 7 });
      g.circle(C[0], C[1], R + 1, { fill: COL.paper, color: COL.paper });
      g.rect(C[0] - R - 2, C[1], Math.min(2 * R + 4, 470 - C[0] + R + 2), 220, { fill: COL.paper, hatch: false, color: COL.paper });
      g.circle(C[0], C[1], R, { fill: MM.tint('red', .25) });
      for (let i = 0; i < p.z; i++) {
        const ph = -a + i * TAU / p.z, tip = [C[0] + R * Math.cos(ph), C[1] + R * Math.sin(ph)];
        g.line(C[0], C[1], tip[0], tip[1], { w: 2 });
        const h = chip(-ph, p); if (h > 0.01) g.circle(tip[0], tip[1], 4 + 10 * h, { fill: MM.tint('red', .7) });
      }
      g.circle(C[0], C[1], 18, { fill: COL.white });
      g.arrow(C[0] - R - 30, C[1] + 40, C[0] - R - 30, C[1] - 40, { color: COL.red }); g.text('feed', C[0] - R - 44, C[1], { size: 11, color: COL.red, align: 'right' });
      g.text('engaged ' + p.ae + ' % of the diameter', 350, 418, { size: 11, align: 'center', color: COL.faint });
      g.text(Math.round(q.rpm) + ' rpm', 590, 80, { size: 20, weight: 800, align: 'center', color: COL.red });
      g.text('feed ' + Math.round(q.feedK) + ' mm/min', 590, 108, { size: 13, weight: 700, align: 'center' });
      g.text(q.k > 1.01 ? '(raised ' + MM.num(q.k, 2) + '× for thinning)' : '(no chip thinning)', 590, 128, { size: 10, align: 'center', color: COL.faint });
      g.text('red: chip on each flute', 590, 170, { size: 10.5, align: 'center', color: COL.faint });
    },
    graph: {
      title: 'Chip thickness on one flute ÷ feed per tooth', min: -0.05, max: 1.1, ticks: [{ v: 0, label: '0' }, { v: 0.5, label: '0.5' }, { v: 1, label: '1' }],
      series: [{ name: 'at the plain feed', color: COL.faint, dash: [4, 3], f: (t, p) => chip(t, p) }, { name: 'with the raised feed', color: COL.red, f: (t, p) => Math.min(1.1, chip(t, p) * calc(p).k) }],
      readout(a, p) { const q = calc(p); return { big: Math.round(q.feedK) + ' mm/min', small: MM.ipm(q.feedK) + '; ' + Math.round(q.rpm) + ' rpm, ' + MM.num(q.fz, 3) + ' mm per tooth' + (q.k > 1.01 ? ' × ' + MM.num(q.k, 2) + ' for chip thinning' : '') }; }
    },
    panels: [{
      id: 'table', title: 'Starting cutting speeds and chip loads',
      intro: 'Middle-of-the-road values for end mills on a rigid machine. Coated carbide on a stiff CNC can often go faster; a small benchtop mill or a long cutter needs less. The tool maker\'s chart for your exact cutter is the best source.',
      html: () => `<div class="tablewrap"><table class="btable"><thead><tr><th>Material</th><th>HSS m/min (SFM)</th><th>Carbide m/min (SFM)</th><th>Feed per tooth (× D)</th><th>Turning feed mm/rev</th></tr></thead><tbody>${CUT.map(c => `<tr><td>${c[0]}</td><td>${c[1][0]}–${c[1][1]} <span class="faint">(${Math.round(c[1][0]*3.281)}–${Math.round(c[1][1]*3.281)})</span></td><td>${c[2][0]}–${c[2][1]} <span class="faint">(${Math.round(c[2][0]*3.281)}–${Math.round(c[2][1]*3.281)})</span></td><td>${c[3][0]}–${c[3][1]}</td><td>${c[4][0]}–${c[4][1]}</td></tr>`).join('')}</tbody></table></div><p class="xpintro">To convert, 1 m/min = 3.28 surface feet per minute (SFM). Feed per tooth × D: for a 10 mm cutter, 0.004 × D = 0.04 mm per tooth.</p>`
    }, {
      id: 'formulas', title: 'Formulas',
      html: () => `<div class="tablewrap"><table class="btable"><thead><tr><th>What</th><th>Metric</th><th>Inch</th></tr></thead><tbody>
        <tr><td>Spindle speed</td><td>rpm = 1000 × Vc ÷ (π × D)</td><td>rpm = 3.82 × SFM ÷ D (inches)</td></tr>
        <tr><td>Feed rate</td><td>F (mm/min) = rpm × z × fz</td><td>IPM = rpm × z × chip load</td></tr>
        <tr><td>Chip thinning (ae &lt; D/2)</td><td colspan="2">raise fz by 1 ÷ √(1 − (1 − 2 ae ÷ D)²)</td></tr>
        <tr><td>Metal removal rate</td><td>Q (cm³/min) = ae × ap × F ÷ 1000</td><td>Q (in³/min) = WOC × DOC × IPM</td></tr>
        <tr><td>Turning feed rate</td><td>F (mm/min) = rpm × f (mm/rev)</td><td>IPM = rpm × IPR</td></tr></tbody></table></div>`
    }, {
      id: 'listen', title: 'Reading the cut',
      html: () => `<ul class="rules"><li><b>Chips</b> should come off as small curls or flakes, not dust or blue-black. Blue steel chips are fine with carbide; dust means the feed is too low.</li>
        <li><b>Sound:</b> a steady hum is good; a squeal or screech is chatter. Change the rpm 10 to 20 % up or down, shorten the stick-out, or take a lighter cut.</li>
        <li><b>Rubbing</b> (too slow a feed) work-hardens stainless steel and dulls cutters faster than cutting too hard.</li>
        <li><b>Built-up edge:</b> aluminium welding to the cutter. Use sharp, polished cutters for aluminium, a little lubricant, and enough speed.</li></ul>`
    }]
  });
})();
