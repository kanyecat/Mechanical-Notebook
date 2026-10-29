(function () {
  const { TAU, COL } = MM, CUT = window.MM_CUT, SHORT = ['Alu', 'Brass', 'Mild steel', 'Alloy steel', 'Stainless', 'Cast iron', 'Plastic'];
  const calc = p => { const c = CUT[p.m], v = p.tool ? c[2] : c[1], vc = (v[0] + v[1]) / 2 * (p.op ? 1.15 : 1), rpm = 1000 * vc / (Math.PI * p.D), f = p.op ? 0.08 : (c[4][0] + c[4][1]) / 2 * (p.tool ? 1 : 0.7);
    return { c, v, vc, rpm, f, feed: rpm * f }; };
  const zxOf = a => { const u = ((a / TAU * 0.5) % 1 + 1) % 1; return 600 - u * (600 - 230 - 40); }, Rof = p => Math.min(90, 18 + p.D * 0.9);
  const PARTS = [
    { n: 'Headstock', box: [36, 76, 118, 248], what: 'Holds the spindle and the gears or belts that drive it.', how: 'Levers or a variable-speed drive set the rpm. The spindle is hollow, so long bar can pass through it.' },
    { n: 'Chuck', box: (a, p) => [146, 200 - Rof(p) - 30, 84, 2 * Rof(p) + 60], what: 'Grips the work and spins it.', how: 'A 3-jaw chuck moves all jaws together on a scroll, so round bar centres itself. A 4-jaw chuck has independent jaws, for square stock or dialling work in exactly. Collets grip small bar most accurately.' },
    { n: 'Workpiece', box: (a, p) => [222, 200 - Rof(p) - 4, 382, 2 * Rof(p) + 8], what: 'The bar being turned.', how: 'It spins towards the tool, which takes a chip off its surface. Long work is supported at the free end by the tailstock centre.' },
    { n: 'Cutting tool and tool post', box: (a, p) => [zxOf(a) - 4, 200 - Rof(p) - 124, 80, 128], what: 'Holds the cutting tool at the right height and angle.', how: 'A quick-change tool post holds tools in pre-set holders, so you can swap them and keep the tip on centre height.' },
    { n: 'Carriage, cross-slide and compound', box: (a, p) => [zxOf(a) - 34, 200 - Rof(p) - 154, 168, 38], what: 'Move the tool along the work (Z) and in and out (X).', how: 'The carriage runs along the bed by handwheel or power feed. The cross-slide dial sets the depth of cut. The compound slide on top can be angled for short tapers and for feeding in threads.' },
    { n: 'Tailstock', what: 'Supports long work, and holds drills and reamers on the centre line.', how: 'It slides along the bed and locks anywhere. Its quill has a Morse taper for a drill chuck or a live centre, and a handwheel feeds it in. Offsetting it sideways turns long, gentle tapers.' },
    { n: 'Bed and ways', what: 'The precise rails everything slides on.', how: 'Hardened, ground ways keep the carriage and tailstock in line with the spindle. Dirt and chips on them wear them and spoil accuracy, so keep them clean and oiled.' },
    { n: 'Lead screw, feed rod and gearbox', what: 'Drive the carriage at a set feed, or in step with the spindle for threads.', how: 'The feed rod powers the carriage for turning. For threads, the half-nut closes on the lead screw, so the tool moves exactly one pitch per spindle turn. The quick-change gearbox sets the feed or thread pitch.' }
  ];
  MM.register({
    slug: 'manual-lathe', view: { w: 700, h: 440 }, thumb: 0.35,
    params: [
      { key: 'D', label: 'Work diameter', unit: ' mm', min: 6, max: 100, step: 1, value: 30 },
      { key: 'm', label: 'Material', min: 0, max: 6, step: 1, value: 2, options: SHORT.map((x, i) => [i, x]) },
      { key: 'tool', label: 'Tool', min: 0, max: 1, step: 1, value: 1, options: [[0, 'HSS'], [1, 'Carbide']] },
      { key: 'op', label: 'Cut', min: 0, max: 1, step: 1, value: 0, options: [[0, 'Roughing'], [1, 'Finishing']] }
    ],
    parts: PARTS,
    draw(g, a, p) {
      const q = calc(p), cy = 200, R = Math.min(90, 18 + p.D * 0.9), r2 = R - 10, u = ((a / TAU * 0.5) % 1 + 1) % 1, x1 = 600, x0 = 230, zx = x1 - u * (x1 - x0 - 40);
      // headstock and chuck (top view), spinning jaws
      g.rect(40, cy - 120, 110, 240, { sp: 8 }); g.text('headstock', 95, cy + 140, { size: 11, align: 'center', color: COL.faint });
      g.rect(150, cy - R - 26, 60, 2 * R + 52, { fill: COL.white, hatch: false });
      for (let i = 0; i < 3; i++) { const ph = a * 3 + i * TAU / 3, s = Math.sin(ph); if (s < -0.2) continue; const y = cy - (R + 14) * Math.cos(ph); g.rect(196, y - 9, 30, 18, { fill: MM.tint('white', .9), hatch: false }); }
      g.text('chuck', 180, cy - R - 38, { size: 11, align: 'center', color: COL.faint });
      // the bar: cut part (smaller) from the tool back to the end, full size behind it
      g.rect(226, cy - R, zx - 226, 2 * R, { fill: MM.tint('red', .3), hatch: false });
      g.rect(zx, cy - r2, x1 - zx, 2 * r2, { fill: MM.tint('red', .3), hatch: false });
      for (let i = 0; i < 8; i++) { const ph = a * 3 + i * TAU / 8, s = Math.sin(ph); if (s <= 0) continue; const y = cy - R * Math.cos(ph); g.line(230, y, zx - 2, y, { w: 0.8, color: MM.tint('ink', .15 + .3 * s) }); }
      g.line(140, cy, 650, cy, { w: 0.8, dash: [10, 3, 2, 3], color: COL.faint });
      // tool on the carriage, at the cutting point
      g.poly([[zx, cy - R - 2], [zx + 22, cy - R - 26], [zx + 40, cy - R - 26], [zx + 14, cy - R + 8]], { fill: COL.white });
      g.rect(zx + 10, cy - R - 120, 60, 94, { fill: COL.white }); g.rect(zx - 30, cy - R - 150, 160, 30, { fill: MM.tint('white', .8), hatch: false });
      g.text('tool post on the carriage', zx + 50, cy - R - 162, { size: 11, align: 'center', color: COL.faint });
      g.arrow(zx - 10, cy - R - 60, zx - 50, cy - R - 60, { color: COL.red });
      for (let i = 0; i < 5; i++) { const t = (a * 2.5 + i * 0.7) % 1; g.dot(zx + 6 + t * 30, cy - R - 8 - t * 50, 2, COL.red); }
      g.curvedArrow(250, cy, R * 0.55, -2.2, -0.9, {});
      g.text(Math.round(q.rpm) + ' rpm', 420, 380, { size: 20, weight: 800, color: COL.red, align: 'center' });
      g.text('feed ' + MM.num(q.f, 2) + ' mm/rev = ' + Math.round(q.feed) + ' mm/min', 420, 406, { size: 12, align: 'center' });
      g.text('Ø' + p.D + ' ' + SHORT[p.m].toLowerCase() + ', ' + (p.tool ? 'carbide' : 'HSS') + ', ' + (p.op ? 'finishing' : 'roughing'), 420, 426, { size: 11, align: 'center', color: COL.faint });
    },
    readout(a, p) { const q = calc(p); return { big: Math.round(q.rpm) + ' rpm', small: 'for Ø' + p.D + ' mm; feed ' + MM.num(q.f, 2) + ' mm/rev (' + MM.num(q.f / 25.4, 4) + ' in/rev, ' + Math.round(q.feed) + ' mm/min); cutting speed ' + Math.round(q.vc) + ' m/min (' + MM.sfm(q.vc) + ')' }; },
    panels: [{
      id: 'ops', title: 'Lathe operations',
      html: () => `<div class="tablewrap"><table class="btable"><thead><tr><th>Operation</th><th>What it does</th><th>Tips</th></tr></thead><tbody>
        <tr><td>Facing</td><td>Squares the end of the bar</td><td>Tool exactly at centre height; feed from the outside to the centre.</td></tr>
        <tr><td>Turning</td><td>Reduces the diameter along the length</td><td>Roughing passes of 1 to 3 mm depth, then a light finishing pass of 0.1 to 0.3 mm.</td></tr>
        <tr><td>Drilling and boring</td><td>Holes on the centre line</td><td>Centre drill first, then drill from the tailstock; bore for an accurate size.</td></tr>
        <tr><td>Parting off</td><td>Cuts the finished part from the bar</td><td>Rigid setup, slow and steady feed, lots of fluid in steel; part close to the chuck.</td></tr>
        <tr><td>Threading</td><td>Single-point threads using the lead screw</td><td>Set the compound to 29.5° (for 60° threads) and feed it in a little each pass.</td></tr>
        <tr><td>Knurling</td><td>Presses a grip pattern into the surface</td><td>Slow speed, firm pressure, plenty of oil.</td></tr>
        <tr><td>Tapers</td><td>Cones, centres and tapered fits</td><td>Short tapers with the compound slide; long gentle ones by offsetting the tailstock or with a taper attachment.</td></tr></tbody></table></div>`
    }, {
      id: 'setup', title: 'Setting up',
      html: () => `<ol class="rules"><li><b>Hold the work:</b> a 3-jaw chuck centres round bar quickly (to within about 0.05 mm). A 4-jaw chuck clamps square stock and can be dialled in to 0.01 mm. Collets grip small bar most accurately.</li>
        <li><b>Stick-out:</b> keep the unsupported length under about three diameters. Longer work needs a centre in the tailstock.</li>
        <li><b>Tool height:</b> set the tip to the centre line with a height gauge or by facing and checking for a pip.</li>
        <li><b>Speed and feed:</b> set rpm for the largest diameter you will cut, and the feed per rev on the gearbox.</li>
        <li><b>Measure as you go:</b> take a cut, measure with a micrometer, and set the next cut from the cross-slide dial. Check what your dial reads. On a <b>diameter-reading</b> dial (most metric and many inch lathes) the tool moves in half the mark value, so the diameter shrinks by exactly what the dial says. On a <b>radius-reading</b> dial the tool moves the full mark value and the diameter shrinks by twice the reading.</li></ol>`
    }, {
      id: 'speeds', title: 'Starting speeds for this diameter', live: true,
      html: p => `<div class="tablewrap"><table class="btable"><thead><tr><th>Material</th><th>HSS rpm</th><th>Carbide rpm</th><th>Roughing feed (carbide)</th></tr></thead><tbody>${CUT.map((c, i) => `<tr${i === +p.m ? ' style="font-weight:700"' : ''}><td>${c[0]}</td><td>${Math.round(1000 * (c[1][0] + c[1][1]) / 2 / (Math.PI * p.D))}</td><td>${Math.round(1000 * (c[2][0] + c[2][1]) / 2 / (Math.PI * p.D))}</td><td>${c[4][0]}–${c[4][1]} mm/rev</td></tr>`).join('')}</tbody></table></div>`
    }, {
      id: 'expect', title: 'What to expect',
      html: () => `<ul class="rules"><li><b>Diameters:</b> ±0.02 mm is routine with care and a micrometer; ±0.01 mm takes a good machine and a fine finishing pass.</li>
        <li><b>Finish:</b> Ra 1.6 to 3.2 µm from a sharp tool with a nose radius; finer with a slow feed and a larger radius.</li>
        <li><b>Problems:</b> a taper along a long part means it is bending away from the tool (use the tailstock) or the headstock is out of line; chatter means too much stick-out or a tool above centre.</li></ul>`
    }, {
      id: 'safety', title: 'Safety',
      html: () => `<ul class="rules"><li>Never leave the chuck key in the chuck: make it a habit to take it out every time.</li><li>No gloves, loose sleeves, rags or long hair near the turning work; the lathe can wind them in.</li>
        <li>Keep hands off the turning work and chuck, and stop the spindle to measure or file.</li><li>Stringy chips are sharp and hot: break them with the right feed and depth, and pull them away with a hook, not your hand.</li><li>Safety glasses always.</li></ul>`
    }]
  });
})();
