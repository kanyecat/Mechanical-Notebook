(function () {
  const { TAU, COL } = MM;
  // focusing lenses: [label, spot diameter at focus (mm), Rayleigh range (mm): how far the beam stays narrow]  (typical CO2 values)
  const LENS = [['1.5" lens', 0.1, 0.7], ['2" lens', 0.15, 1.3], ['4" lens', 0.3, 4.5]];
  const width = (z, zf, L) => L[1] * Math.sqrt(1 + ((z - zf) / L[2]) ** 2);   // kerf width at depth z (mm), focus at depth zf
  const PARTS = [
    { n: 'Lens and air-assist nozzle', box: [166, 36, 128, 34], what: 'Focus the beam to a tiny spot and blow air into the cut.', how: 'A lens (often 1.5", 2" or 4" focal length) brings the beam to a focus a set distance below it. Air from the nozzle blows out flames and smoke and keeps the lens clean.' },
    { n: 'Beam and focus', box: (a, p) => [120, 36, 220, 140 + Math.min(p.f, p.T) * 22], what: 'The cutting energy.', how: 'The beam is narrowest at the focus and widens above and below. Setting the focus height (with a gauge or autofocus) is one of the biggest factors in cut quality.' },
    { n: 'Sheet on the bed', box: (a, p) => [36, 166, 388, p.T * 22 + 8], what: 'The material, resting on a honeycomb or slat bed.', how: 'The open bed lets the beam pass through without reflecting back, and lets the exhaust pull smoke down and away.' },
    { n: 'Cutting head path (top view)', box: [446, 296, 228, 68], what: 'How the head moves over the sheet.', how: 'The gantry carries the head along X and Y on belts or screws, following the vector paths in the job at the set speed.' },
    { n: 'Laser tube and mirrors', what: 'Make the beam and carry it to the head.', how: 'A sealed glass CO2 tube makes the beam at the back of the machine. Three mirrors steer it to the head; if they are out of alignment, power drops in some corners of the bed.' },
    { n: 'Water chiller', what: 'Keeps the tube cool.', how: 'Water circulates through a jacket around the tube. Running without cooling destroys the tube in minutes.' },
    { n: 'Exhaust fan and filter', what: 'Remove smoke and fumes.', how: 'A fan pulls air through the machine and out of the building or through a carbon and HEPA filter.' },
    { n: 'Lid and interlocks', what: 'Keep the beam inside.', how: 'The lid is made of material the beam cannot pass; switches stop the laser if it is opened.' }
  ];
  MM.register({
    slug: 'laser-cutter', hands: false, view: { w: 700, h: 440 }, thumb: 0.2,
    params: [
      { key: 'T', label: 'Sheet thickness', unit: ' mm', min: 1, max: 12, step: 1, value: 6 },
      { key: 'f', label: 'Focus below the surface', unit: ' mm', min: 0, max: 6, step: 0.5, value: 2 },
      { key: 'L', label: 'Lens', min: 0, max: 2, step: 1, value: 1, options: LENS.map((x, i) => [i, x[0]]) }
    ],
    parts: PARTS,
    draw(g, a, p) {
      const L = LENS[p.L], ky = 22, kx = 220, cx = 230, top = 170, T = p.T * ky, zf = Math.min(p.f, p.T);
      // section through the cut, the width drawn ×10 bigger than the depth
      g.rect(40, top, 380, T, { sp: 6 });
      const left = [], right = []; for (let i = 0; i <= 40; i++) { const z = p.T * i / 40, w = width(z, zf, L) * kx / 2 / 10 * 10; left.push([cx - w, top + z * ky]); right.push([cx + w, top + z * ky]); }
      g.poly(left.concat(right.reverse()), { fill: COL.paper });
      // the beam: converging from the lens to the focus, then spreading
      const beam = []; for (let i = 0; i <= 60; i++) { const z = -6 + (p.T + 8) * i / 60; beam.push([z, width(z, zf, L)]); }
      g.poly(beam.map(([z, w]) => [cx - w * kx / 2, top + z * ky]).concat(beam.slice().reverse().map(([z, w]) => [cx + w * kx / 2, top + z * ky])), { fill: MM.tint('red', .25 + .1 * Math.sin(a * 6)), color: MM.tint('red', .7), w: 1 });
      g.line(cx - 90, top + zf * ky, cx + 90, top + zf * ky, { w: 0.8, dash: [5, 4], color: COL.red });
      g.text('focus', cx + 96, top + zf * ky, { size: 11, color: COL.red });
      g.rect(cx - 60, 40, 120, 26, { fill: COL.white, hatch: false }); g.text('lens and air-assist nozzle', cx, 30, { size: 11, align: 'center', color: COL.faint });
      g.text('section: width drawn 10× wider than depth', cx, top + T + 30, { size: 10.5, align: 'center', color: COL.faint });
      const wt = width(0, zf, L), wb = width(p.T, zf, L);
      g.text('kerf at the top ' + MM.num(wt, 2) + ' mm', 560, 170, { size: 13, weight: 700, align: 'center' });
      g.text('kerf at the bottom ' + MM.num(wb, 2) + ' mm', 560, 196, { size: 13, weight: 700, align: 'center' });
      g.text(Math.abs(wt - wb) < 0.04 ? 'nearly straight walls' : wt > wb ? 'V-shaped: wider at the top' : 'wider at the bottom', 560, 222, { size: 12, align: 'center', color: COL.red });
      // small top view: the head running along a cut line
      const hx = 470 + 180 * (0.5 + 0.5 * Math.sin(a)), hy = 330; g.rect(450, 300, 220, 60, { fill: MM.tint('white', .85), hatch: false }); g.line(470, hy, hx, hy, { w: 2.5, color: COL.paper }); g.dot(hx, hy, 5, COL.red);
      g.text('top view', 560, 380, { size: 10.5, align: 'center', color: COL.faint });
    },
    readout(a, p) { const L = LENS[p.L], zf = Math.min(p.f, p.T); return { big: MM.num(width(0, zf, L), 2) + ' / ' + MM.num(width(p.T, zf, L), 2) + ' mm', small: 'kerf at the top / bottom of ' + p.T + ' mm sheet with a ' + L[0] + ' focused ' + zf + ' mm in (typical values; measure yours)' }; },
    panels: [{
      id: 'materials', title: 'What a CO2 laser can and cannot cut',
      intro: 'Some plastics give off poisonous or corrosive fumes when burnt. If you do not know what a plastic is, do not cut it.',
      html: () => `<div class="tablewrap"><table class="btable"><thead><tr><th>Material</th><th>Cut?</th><th>Notes</th></tr></thead><tbody>
        <tr><td>Wood, plywood, MDF</td><td>Yes</td><td>Plywood glue varies, so some sheets cut badly. Edges char; air assist reduces it.</td></tr>
        <tr><td>Cast acrylic (PMMA)</td><td>Yes</td><td>Flame-polished, clear edges. Extruded acrylic cuts too, with a slightly different edge.</td></tr>
        <tr><td>Paper, card, cork, leather (veg-tan), cotton and felt</td><td>Yes</td><td>Low power, fast. Watch for flames.</td></tr>
        <tr><td>Acetal (POM, Delrin), PET</td><td>With care</td><td>Cuts, but gives off irritating fumes (formaldehyde from acetal): good ventilation.</td></tr>
        <tr><td>PVC, vinyl, artificial leather</td><td><b>Never</b></td><td>Releases chlorine and hydrochloric acid: harms lungs and corrodes the machine.</td></tr>
        <tr><td>ABS, polycarbonate, HDPE, polypropylene</td><td>No</td><td>Melt, burn and catch fire; ABS gives off toxic fumes. Use a router instead.</td></tr>
        <tr><td>Glass fibre and carbon fibre</td><td>No</td><td>Toxic fumes and dust from the resin.</td></tr>
        <tr><td>Metal</td><td>Mark only (with coatings)</td><td>CO2 beams are reflected. Fibre lasers cut and engrave metal.</td></tr></tbody></table></div>`
    }, {
      id: 'settings', title: 'Getting good cuts',
      html: () => `<ul class="rules"><li><b>Test grid:</b> cut a small grid of squares at different power and speed settings on each new sheet, and keep the slowest-power setting that cuts cleanly through. Settings vary a lot between machines, tubes and sheets.</li>
        <li><b>Focus:</b> on the surface for thin sheet and engraving; about a third of the way in for thick acrylic and wood.</li>
        <li><b>Power and speed:</b> roughly, the heat per millimetre of cut is power ÷ speed. Too much chars and widens the kerf; too little does not cut through. Several fast passes are cleaner than one slow pass in thick wood.</li>
        <li><b>Air assist</b> on for cutting (cleaner, less flame); lower or off for engraving acrylic to avoid a frosted edge.</li>
        <li><b>Kerf:</b> about 0.1 to 0.3 mm; offset the paths for parts that must fit (see Laser Kerf and Fit, F-08).</li>
        <li><b>Raise the sheet</b> on a honeycomb or pins so the beam does not reflect back and mark the underside.</li></ul>`
    }, {
      id: 'types', title: 'CO2, diode and fibre lasers',
      html: () => `<div class="tablewrap"><table class="btable"><thead><tr><th>Type</th><th>Typical power</th><th>Good at</th><th>Not for</th></tr></thead><tbody>
        <tr><td>CO2 (10.6 µm)</td><td>40 to 150 W</td><td>Wood, acrylic, paper, leather, fabric; clear acrylic</td><td>Bare metal</td></tr>
        <tr><td>Diode (about 450 nm)</td><td>5 to 40 W</td><td>Engraving and thin wood; cheap</td><td>Clear or blue acrylic (the light passes through), thick material</td></tr>
        <tr><td>Fibre (about 1 µm)</td><td>20 W marking to kW cutting</td><td>Marking and cutting metal</td><td>Wood and clear plastics (marking only)</td></tr></tbody></table></div>`
    }, {
      id: 'trouble', title: 'Common problems and fixes',
      html: () => `<div class="tablewrap"><table class="btable"><thead><tr><th>Problem</th><th>Likely causes</th><th>Try</th></tr></thead><tbody><tr><td>Does not cut through in some places</td><td>Focus wrong; sheet warped; dirty lens or mirror; power drops in far corners (mirrors out of line)</td><td>Re-focus; hold the sheet flat with pins or weights; clean the optics; check mirror alignment with tape tests in each corner</td></tr><tr><td>Heavy charring or brown edges</td><td>Too much heat per mm (power too high or speed too low); air assist weak</td><td>Raise the speed or lower the power; check the air assist; mask the surface with paper tape</td></tr><tr><td>Flames during the cut</td><td>Speed too low; no air assist; resin-rich plywood</td><td>Stop the job if a flame keeps burning; turn on air assist; cut faster in more passes</td></tr><tr><td>Parts do not fit (too loose)</td><td>Kerf not allowed for</td><td>Offset the paths by half the kerf; cut a test comb to measure it</td></tr><tr><td>Wavy lines or shifted shapes</td><td>Loose belt or pulley; speed or acceleration too high</td><td>Tighten belts and pulley grub screws; lower the speed for engraving</td></tr><tr><td>Frosted or melted acrylic edges</td><td>Extruded acrylic; air assist too strong; focus too high</td><td>Use cast acrylic for clear edges; lower the air; focus about a third into the sheet</td></tr><tr><td>Marks on the underside</td><td>Beam reflecting off the bed; smoke trapped under the sheet</td><td>Raise the sheet on pins; clean the honeycomb; check the exhaust</td></tr></tbody></table></div>`
    }, {
      id: 'safety', title: 'Safety',
      html: () => `<ul class="rules"><li><b>Never leave it running.</b> Laser fires happen in seconds. Keep a CO2 extinguisher next to it.</li><li>Keep the lid closed and the interlocks working; the beam can blind instantly. Open-frame diode lasers need the right safety glasses for their wavelength.</li>
        <li>Vent the fumes outside or through a proper filter, and run the extraction for a minute after the job.</li><li>Clean the lens and mirrors regularly; a dirty lens loses power and can crack.</li></ul>`
    }]
  });
})();
