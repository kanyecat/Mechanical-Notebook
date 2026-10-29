(function () {
  const { TAU, COL } = MM;
  // quality settings, slowest to fastest: [label, speed as a share of the fastest that still cuts through, how the edge looks]
  const Q = [['Q5 finest', 0.2, 'smooth, almost no taper'], ['Q4', 0.3, 'smooth'], ['Q3 standard', 0.45, 'light lines near the bottom'], ['Q2', 0.65, 'visible lines, some taper'], ['Q1 separation', 1, 'rough bottom, strong lag and taper']];
  const xnOf = a => 120 + (((a / TAU) % 1 + 1) % 1) * 400, kOf = p => Math.min(5, 200 / p.T);
  const PARTS = [
    { n: 'Cutting head and orifice', box: a => [xnOf(a) - 26, 36, 52, 98], what: 'Turns very high-pressure water into a fine, fast jet.', how: 'Water at around 4,000 bar is forced through a jewel orifice (sapphire, ruby or diamond) a few tenths of a millimetre across, leaving at up to about three times the speed of sound.' },
    { n: 'Mixing tube (focusing nozzle)', box: a => [xnOf(a) - 10, 124, 20, 34], what: 'Mixes in the abrasive and aims the jet.', how: 'The jet pulls garnet sand in through a side port. A long carbide tube accelerates the sand and focuses the stream. It wears out and is replaced regularly.' },
    { n: 'Plate being cut', box: (a, p) => [56, 156, 568, p.T * kOf(p) + 8], what: 'The work, resting on slats over the tank.', how: 'The jet cuts right through and loses energy as it goes, which is why the bottom of the cut lags behind the top.' },
    { n: 'High-pressure pump', what: 'Raises the water pressure.', how: 'An intensifier pump uses a large hydraulic piston to push a small water plunger; direct-drive pumps use a crankshaft. Either reaches around 4,000 to 6,000 bar.' },
    { n: 'Abrasive hopper and feed', what: 'Supplies the garnet.', how: 'A hopper meters a steady flow of dry abrasive to the head. Damp or lumpy garnet blocks the feed and ruins cuts.' },
    { n: 'Catcher tank', what: 'Stops the jet after it leaves the part.', how: 'A deep tank of water under the slats absorbs the jet energy and collects the used abrasive, which is dug out from time to time.' },
    { n: 'Z axis and height sensing', what: 'Keep the nozzle a set height above the plate.', how: 'Usually 1 to 3 mm. Some machines follow the surface; tilting heads also correct the taper.' }
  ];
  MM.register({
    slug: 'waterjet', hands: false, view: { w: 700, h: 440 }, thumb: 0.4,
    params: [
      { key: 'q', label: 'Quality', min: 0, max: 4, step: 1, value: 2, options: Q.map((x, i) => [i, x[0].split(' ')[0]]) },
      { key: 'T', label: 'Plate thickness', unit: ' mm', min: 5, max: 50, step: 5, value: 25 }
    ],
    parts: PARTS,
    draw(g, a, p) {
      const q = Q[p.q], k = Math.min(5, 200 / p.T), T = p.T * k, top = 160, u = ((a / TAU) % 1 + 1) % 1, xn = 120 + u * 400, lag = q[1] * T * 0.55;
      // the plate, sectioned along the cut: material ahead of the jet, the cut face behind it with curved striations
      g.rect(60, top, 560, T, { sp: 6 });
      const front = x0 => { const pts = []; for (let i = 0; i <= 20; i++) { const d = i / 20; pts.push([x0 - lag * d * d, top + d * T]); } return pts; };
      g.poly([[60, top], [xn, top]].concat(front(xn)).concat([[60, top + T]]), { fill: COL.paper });
      for (let x = 70; x < xn - 10; x += 22) g.trace(front(x).filter(pt => pt[0] > 62), { color: MM.tint('ink', .25 + .35 * q[1]), w: 0.8 });
      g.trace(front(xn), { color: COL.red, w: 2 });
      // nozzle and jet
      g.poly([[xn - 22, 40], [xn + 22, 40], [xn + 8, 130], [xn - 8, 130]], { fill: COL.white });
      g.rect(xn - 4, 130, 8, 22, { fill: COL.white, hatch: false });
      const jet = front(xn); g.trace([[xn, 152], [xn, top]].concat(jet).concat([[jet[20][0] - lag * 0.3, top + T + 40]]), { color: MM.tint('blue', .9), w: 3 });
      g.text('illustration: lag and striations exaggerated, not to scale', 60, 24, { size: 10.5, color: COL.faint });
      g.text('mixing tube', xn + 30, 120, { size: 11, color: COL.faint });
      g.arrow(xn - 50, 100, xn - 10, 100, { color: COL.red }); g.text('cutting direction', xn - 60, 86, { size: 11, color: COL.red, align: 'right' });
      g.text('jet lag ' + MM.num(lag / k, 1) + ' mm', 560, 70, { size: 14, weight: 700, align: 'center' });
      g.text(q[0] + ': ' + q[2], 350, top + T + 60 > 420 ? 425 : top + T + 60, { size: 12, align: 'center' });
      g.text('relative speed ' + Math.round(q[1] * 100) + ' %', 560, 92, { size: 12, align: 'center', color: COL.faint });
    },
    readout(a, p) { const q = Q[p.q]; return { big: q[0].split(' ')[0], small: Math.round(q[1] * 100) + ' % of the fastest through-cut: ' + q[2] }; },
    panels: [{
      id: 'design', title: 'Designing parts for waterjet',
      html: () => `<ul class="rules"><li><b>Kerf:</b> about 0.8 to 1 mm for abrasive cutting; the machine offsets the path for it. Inside corners have a radius of at least half the kerf.</li>
        <li><b>Holes:</b> small holes in thick plate taper and wander; keep holes at least about the plate thickness across, or drill them afterwards.</li>
        <li><b>Taper:</b> fast cuts are narrower at the bottom. Machines with a tilting head compensate; otherwise choose a higher quality for fitted edges.</li>
        <li><b>Pierce and lead-ins:</b> each piercing starts outside the part on a short lead-in so the rough pierce mark is in the scrap.</li>
        <li><b>Small parts</b> can drop through the slats; use micro-tabs or a support grid.</li>
        <li><b>Typical accuracy:</b> about ±0.1 to ±0.2 mm on good machines; worse on thick plate at fast settings.</li></ul>`
    }, {
      id: 'materials', title: 'Materials',
      html: () => `<div class="tablewrap"><table class="btable"><thead><tr><th>Material</th><th>Notes</th></tr></thead><tbody>
        <tr><td>Steel, stainless, titanium, aluminium, brass</td><td>Clean edges with no heat-affected zone; hardened steel stays hard.</td></tr>
        <tr><td>Stone, tile, glass</td><td>Glass needs a low-pressure pierce or a drilled start hole, or it cracks.</td></tr>
        <tr><td>Composites (carbon, glass fibre)</td><td>Pierce gently or they split between layers.</td></tr>
        <tr><td>Rubber, foam, gaskets, food</td><td>Water only, no abrasive.</td></tr>
        <tr><td>Tempered glass</td><td><b>Cannot be cut</b>: it shatters. Cut before tempering.</td></tr></tbody></table></div>`
    }, {
      id: 'costs', title: 'Time and cost',
      html: () => `<ul class="rules"><li>Waterjets cut slowly compared with lasers and plasma in thin sheet, but they cut thick plate and any material. Machine time is the main cost; garnet abrasive is the next.</li>
        <li>Higher quality settings are much slower: going from separation quality to the finest edge can take several times as long. Ask for high quality only on edges that matter.</li></ul>`
    }, {
      id: 'safety', title: 'Safety',
      html: () => `<ul class="rules"><li>The jet cuts flesh instantly. A high-pressure injection injury may look like a small cut but needs emergency hospital care: tell them it was a waterjet.</li><li>Keep the cutting area covered with water or guards; wear hearing protection.</li><li>Never put hands near the head while the pump is pressurised.</li></ul>`
    }]
  });
})();
