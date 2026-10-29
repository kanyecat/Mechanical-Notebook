(function () {
  const { TAU, COL } = MM, CUT = window.MM_CUT, SHORT = ['Alu', 'Brass', 'Mild steel', 'Alloy steel', 'Stainless', 'Cast iron', 'Plastic'];
  const calc = p => { const c = CUT[p.m], v = p.tool ? c[2] : c[1], vc = (v[0] + v[1]) / 2, rpm0 = 1000 * vc / (Math.PI * p.d), rpm = Math.min(rpm0, 4000), fz = (c[3][0] + c[3][1]) / 2 * p.d * (p.tool ? 1 : 0.7);
    return { c, vc, v, rpm0, rpm, fz, feed: rpm * p.z * fz }; };
  const txOf = a => -110 + 220 * (Math.sin(a * 0.5 - Math.PI / 2) + 1) / 2;
  const PARTS = [
    { n: 'Column', box: [556, 36, 98, 368], what: 'The heavy upright casting that holds the head, knee and table square to each other.', how: 'The knee slides up and down on machined ways on its front face. Its weight and stiffness soak up vibration, which is why mills are made of thick cast iron.' },
    { n: 'Head and motor', box: [246, 36, 338, 68], what: 'Carries the motor, the belt or gear drive and the spindle.', how: 'Moving the belt, a variable-speed pulley or a gear lever sets the spindle rpm. On a turret mill the head can tilt and swivel for angled holes, so it has to be trammed square again afterwards.' },
    { n: 'Spindle and quill', box: [296, 96, 68, 78], what: 'Holds and turns the tool, and lets it move down like a drill press.', how: 'Tools sit in a collet (R8 or ER) pulled into the spindle taper by the drawbar from the top. The quill handle or fine-feed handwheel lowers the spindle for drilling; the quill lock holds it still for milling.' },
    { n: 'Cutter (end mill)', box: (a, p) => { const D = Math.max(14, p.d * 3); return [330 - D / 2 - 6, 166, D + 12, 106]; }, what: 'Does the cutting.', how: 'Cutting edges on the side and the end shear off chips as it spins. Side edges cut walls and steps; end edges cut floors and plunge in. Flutes carry the chips out.' },
    { n: 'Vise', box: a => [196 + txOf(a), 246, 248, 88], what: 'Holds the work tight and square.', how: 'A fixed jaw, indicated square to the table, and a moving jaw driven by a screw. Parallels under the work set its height and keep it flat.' },
    { n: 'Workpiece', box: a => [236 + txOf(a), 246, 168, 88], what: 'The part being made.', how: 'Its edges are found with an edge finder and set as zero on the DRO, so every cut is measured from them.' },
    { n: 'Table and saddle', box: a => [106 + txOf(a), 326, 428, 48], what: 'Move the work left-right (X) and in-out (Y).', how: 'Handwheels turn leadscrews under the table and saddle. Tapered strips (gibs) set how snugly they slide, and locks stop an axis creeping during a cut.' },
    { n: 'Knee', what: 'Raises and lowers the whole table (Z) to set the depth.', how: 'A crank turns a vertical screw under the knee. It is heavy to move, so it is used to set the height and then locked.' },
    { n: 'Handwheel dials and DRO', what: 'Show how far each axis has moved.', how: 'Dials count leadscrew turns (often 0.02 mm or 0.001 inch per mark). A digital readout reads glass or magnetic scales on the axes, so it is not fooled by backlash.' },
    { n: 'Power feed', what: 'Moves the table at a steady speed.', how: 'A small motor drives the table leadscrew through a clutch. An even feed gives a much better finish than winding by hand, and frees your hands.' }
  ];
  MM.register({
    slug: 'manual-mill', view: { w: 700, h: 460 }, thumb: 0.3,
    params: [
      { key: 'd', label: 'Cutter diameter', unit: ' mm', min: 3, max: 25, step: 1, value: 10 },
      { key: 'z', label: 'Flutes', min: 2, max: 4, step: 1, value: 3 },
      { key: 'm', label: 'Material', min: 0, max: 6, step: 1, value: 0, options: SHORT.map((x, i) => [i, x]) },
      { key: 'tool', label: 'Cutter', min: 0, max: 1, step: 1, value: 0, options: [[0, 'HSS'], [1, 'Carbide']] }
    ],
    parts: PARTS,
    draw(g, a, p) {
      const q = calc(p), u = (Math.sin(a * 0.5 - Math.PI / 2) + 1) / 2, tx = -110 + 220 * u, cx = 330, D = Math.max(14, p.d * 3);
      // column, head and spindle
      g.rect(560, 40, 90, 360, { sp: 8 }); g.rect(250, 40, 330, 60, { fill: COL.white }); g.rect(cx - 30, 100, 60, 70, { fill: COL.white, hatch: false });
      g.text('head', 300, 70, { size: 11, color: COL.faint }); g.text('column', 605, 230, { size: 11, align: 'center', color: COL.faint, rot: -Math.PI / 2 });
      // table, vise and work, moving left-right
      g.rect(110 + tx, 330, 420, 26, { fill: COL.white }); g.rect(150 + tx, 356, 340, 14, { fill: COL.white, hatch: false });
      g.text('table (X, moved by the handwheel)', 320, 412, { size: 11, align: 'center', color: COL.faint });
      g.rect(200 + tx, 270, 40, 60, { fill: COL.white }); g.rect(400 + tx, 270, 40, 60, { fill: COL.white });
      const wx0 = 240 + tx, ww = 160, top = 250, cutY = 268;
      g.rect(wx0, top, ww, 80, { fill: MM.tint('red', .3) });
      // material already removed (a step along the top of the work)
      const cutEnd = Math.min(wx0 + ww, cx + D / 2), cutStart = wx0;
      if (cutEnd > cutStart) g.rect(cutStart, top - 1, cutEnd - cutStart, cutY - top + 1, { fill: COL.paper, hatch: false, color: COL.paper });
      // the end mill, spinning (flutes drawn as moving stripes)
      g.rect(cx - D / 2, 170, D, cutY - 170, { fill: COL.white, hatch: false });
      for (let i = 0; i < 6; i++) { const ph = a * 6 + i * TAU / 6; if (Math.sin(ph) <= 0) continue; const x = cx - D / 2 * Math.cos(ph); g.line(x, 200, x + 6, cutY - 2, { w: 1, color: MM.tint('ink', .3 + .5 * Math.sin(ph)) }); }
      if (cx + D / 2 > wx0 && cx - D / 2 < wx0 + ww) for (let i = 0; i < 6; i++) { const t = (a * 3 + i * 0.9) % 1; g.dot(cx - D / 2 - 10 - t * 50, cutY - 6 - t * 40 + t * t * 30, 2, COL.red); }
      g.curvedArrow(cx, 150, 22, -2.6, -0.6, { color: COL.red });
      g.text(Math.round(q.rpm) + ' rpm', 40, 140, { size: 20, weight: 800, color: COL.red });
      g.text('feed ' + Math.round(q.feed) + ' mm/min', 40, 166, { size: 13, weight: 700 });
      g.text(SHORT[p.m] + ', ' + (p.tool ? 'carbide' : 'HSS') + ' Ø' + p.d + ' × ' + p.z, 40, 186, { size: 11, color: COL.faint });
      if (q.rpm0 > q.rpm + 1) { g.text('wants ' + Math.round(q.rpm0) + ' rpm: more than', 40, 206, { size: 11, color: COL.red, weight: 700 }); g.text('a manual mill (about 4000)', 40, 222, { size: 11, color: COL.red, weight: 700 }); }
    },
    readout(a, p) { const q = calc(p); return { big: Math.round(q.rpm) + ' rpm', small: 'and ' + Math.round(q.feed) + ' mm/min (' + MM.ipm(q.feed) + '; ' + MM.num(q.fz, 3) + ' mm per tooth) as a starting point; cutting speed ' + q.v[0] + '–' + q.v[1] + ' m/min' + (q.rpm0 > q.rpm + 1 ? '; it wants ' + Math.round(q.rpm0) + ' rpm, so run at the top speed' : '') }; },
    panels: [{
      id: 'setup', title: 'Setting up a job, step by step',
      html: () => `<ol class="rules"><li><b>Clean</b> the table, vise and parallels. A chip under the work is the most common reason a part is not square.</li>
        <li><b>Tram the head:</b> sweep a dial indicator in a circle on the table. Adjust until it reads within about 0.02 mm across 150 mm, or the floor of every pocket will be tilted.</li>
        <li><b>Indicate the vise:</b> run an indicator along the fixed jaw and tap the vise square to within about 0.01 mm over its length.</li>
        <li><b>Clamp the work</b> on parallels, tighten, then tap it down with a soft mallet until the parallels no longer move.</li>
        <li><b>Find the edges</b> with an edge finder. When it kicks sideways, the spindle centre is half the tip diameter from the edge (2.5 mm for a 5 mm tip). Zero the DRO there.</li>
        <li><b>Touch off the top</b> with the cutter (a strip of paper helps), set the depth, and lock the knee or quill.</li>
        <li><b>Rough, then finish:</b> take most of the material off, leaving 0.2 to 0.5 mm, then make a light finishing pass at the full speed.</li></ol>`
    }, {
      id: 'speeds', title: 'Starting speeds for this cutter', live: true,
      intro: 'Middle of each range, for an end mill of the diameter set above. Light machines and long cutters need less; listen and watch the chips.',
      html: p => `<div class="tablewrap"><table class="btable"><thead><tr><th>Material</th><th>HSS: rpm</th><th>Carbide: rpm</th><th>Feed per tooth (carbide)</th><th>Feed with ${p.z} flutes (carbide)</th></tr></thead><tbody>${CUT.map((c, i) => { const h = 1000 * (c[1][0] + c[1][1]) / 2 / (Math.PI * p.d), k = 1000 * (c[2][0] + c[2][1]) / 2 / (Math.PI * p.d), fz = (c[3][0] + c[3][1]) / 2 * p.d; return `<tr${i === +p.m ? ' style="font-weight:700"' : ''}><td>${c[0]}</td><td>${Math.round(h)}</td><td>${Math.round(k)}</td><td>${MM.num(fz, 3)} mm</td><td>${Math.round(k * p.z * fz)} mm/min <span class="faint">(${MM.ipm(k * p.z * fz)})</span></td></tr>`; }).join('')}</tbody></table></div>`
    }, {
      id: 'tools', title: 'Tooling',
      html: () => `<div class="tablewrap"><table class="btable"><thead><tr><th>Tool</th><th>Use</th><th>Tips</th></tr></thead><tbody>
        <tr><td>End mill, 2 or 3 flutes</td><td>Aluminium and plastics, slots</td><td>Fewer flutes leave room for big chips.</td></tr>
        <tr><td>End mill, 4 flutes</td><td>Steel, side cutting, finishing</td><td>Stronger core; poor at clearing chips in deep slots.</td></tr>
        <tr><td>Face mill or fly cutter</td><td>Large flat faces</td><td>A fly cutter is one cheap tool bit; slow, but a fine finish.</td></tr>
        <tr><td>Spot or centre drill, then drill</td><td>Holes in the right place</td><td>Spot first so the drill does not wander.</td></tr>
        <tr><td>Reamer</td><td>Accurate holes (H7)</td><td>Drill about 0.2 to 0.3 mm under size, ream at half the drilling speed.</td></tr>
        <tr><td>Boring head</td><td>Accurate holes of any size</td><td>Adjust the tool out by small amounts and measure each pass.</td></tr></tbody></table></div>`
    }, {
      id: 'problems', title: 'Common problems and fixes',
      html: () => `<div class="tablewrap"><table class="btable"><thead><tr><th>Problem</th><th>Likely cause</th><th>Fix</th></tr></thead><tbody>
        <tr><td>Chatter (a loud squeal and a wavy finish)</td><td>Too much tool sticking out, loose gibs, too fast</td><td>Shorten the tool, lock unused axes, lower rpm a little, raise the feed.</td></tr>
        <tr><td>Rough or torn finish</td><td>Dull cutter, built-up edge in aluminium, feed by hand</td><td>New cutter, lubricant, power feed, light finishing pass.</td></tr>
        <tr><td>Steps in the floor of a pocket</td><td>Head not trammed</td><td>Tram the head.</td></tr>
        <tr><td>Part not square</td><td>Chip under it, vise not square, work lifting</td><td>Clean, indicate the vise, tap the work down.</td></tr>
        <tr><td>Size off by the same amount every time</td><td>Backlash in the leadscrew</td><td>Always approach a position from the same direction, or use the DRO.</td></tr>
        <tr><td>Broken small cutters</td><td>Too deep, chips packing the flutes</td><td>Shallower passes, air or fluid to clear chips.</td></tr></tbody></table></div>`
    }, {
      id: 'safety', title: 'Safety',
      html: () => `<ul class="rules"><li>Safety glasses always. No gloves, loose sleeves, jewellery or loose hair near the spindle.</li><li>Take the drawbar wrench and chuck key out before starting the spindle.</li>
        <li>Clear chips with a brush, never your hand or compressed air at your face. Aluminium and steel chips are razor sharp.</li><li>Stop the spindle before measuring or adjusting the work.</li><li>Clamp the work properly; never hold it by hand while milling.</li></ul>`
    }]
  });
})();
