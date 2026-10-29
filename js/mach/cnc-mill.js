(function () {
  const { TAU, COL } = MM, CUT = window.MM_CUT, SHORT = ['Alu', 'Brass', 'Mild steel', 'Alloy steel', 'Stainless', 'Cast iron', 'Plastic'];
  // chip thinning: with a radial cut ae less than half the diameter, the chip is thinner than the feed per tooth
  const thin = r => r >= 0.5 ? 1 : 1 / Math.sqrt(1 - (1 - 2 * r) ** 2);
  const calc = p => { const c = CUT[p.m], vc = (c[2][0] + c[2][1]) / 2 * (p.ae <= 25 ? 1.2 : 1), rpm = 1000 * vc / (Math.PI * p.d), fz = (c[3][0] + c[3][1]) / 2 * p.d, k = thin(p.ae / 100);
    return { c, vc, rpm, fz, k, fzA: fz * k, feed: rpm * p.z * fz * k }; };
  const cutterAt = (a, p) => { const k = 9, R = p.d / 2 * k, step = Math.max(2, p.ae / 100 * p.d * k), x0 = 110, y0 = 120, W = 400, Hs = R * 2 + 60, t = ((a / (TAU * 2)) % 1 + 1) % 1, s = t * ((W - 2 * R) / step), rr = (Hs - 2 * R) / 2; return [x0 + R + s * step + rr * 0.35 * Math.cos(s * TAU), y0 + Hs / 2 + rr * Math.sin(s * TAU), R]; };
  const PARTS = [
    { n: 'Workpiece and vise', box: [56, 56, 508, 268], what: 'Hold the stock still and in a known place.', how: 'Usually a precision vise or a fixture plate bolted to the table. The work offset (G54) records where the part zero is, measured with a probe or edge finder.' },
    { n: 'Cutter and toolholder', box: (a, p) => { const c = cutterAt(a, p); return [c[0] - c[2] - 10, c[1] - c[2] - 10, 2 * c[2] + 20, 2 * c[2] + 20]; }, what: 'Does the cutting, held exactly on the spindle axis.', how: 'Each tool sits in its own holder (CAT40, BT30, HSK and so on) with a collet or shrink fit. Its length is measured once and stored as a tool length offset, so the machine knows where the tip is.' },
    { n: 'Toolpath', box: (a, p) => { const c = cutterAt(a, p); return [c[0] - 140, 110, 160, 2 * c[2] + 80]; }, what: 'The path the cutter centre follows, written by CAM software.', how: 'Adaptive or trochoidal paths keep the cutter load steady by limiting how much of it is engaged at any moment.' },
    { n: 'Spindle', what: 'Spins the toolholder at the programmed rpm.', how: 'A motor drives the spindle through belts or directly. Drawbar springs clamp the holder into the taper; air pressure releases it for a tool change.' },
    { n: 'Automatic tool changer', what: 'Swaps tools without stopping for the operator.', how: 'A carousel or arm holds 10 to 40 or more tools. M6 T5 in the program fetches tool 5 and puts the old one back.' },
    { n: 'Axes: servo motors and ball screws', what: 'Move the table and spindle exactly where the program says.', how: 'Servo motors with encoders turn ball screws, which run in linear guides. The control checks the position thousands of times a second.' },
    { n: 'Controller', what: 'Reads the G-code and runs the machine.', how: 'It holds the offsets, runs the motors, and lets the operator slow feeds and rapids with override knobs, run one line at a time and stop instantly.' },
    { n: 'Probe and tool setter', what: 'Measure the part and the tools automatically.', how: 'A touch probe in the spindle finds edges and bores; a tool setter on the table measures each tool length and can spot a broken tool.' },
    { n: 'Coolant and chip removal', what: 'Keep the cut cool and clear of chips.', how: 'Flood coolant, mist or air blast through nozzles or through the tool. A chip conveyor or wash-down carries chips out of the enclosure.' },
    { n: 'Enclosure and doors', what: 'Keep chips, coolant and broken tools in.', how: 'Interlocked doors stop the spindle or slow the machine when opened.' }
  ];
  MM.register({
    slug: 'cnc-mill', hands: false, view: { w: 700, h: 440 }, thumb: 0.4, period: TAU * 2,
    params: [
      { key: 'd', label: 'End mill diameter', unit: ' mm', min: 3, max: 20, step: 1, value: 10 },
      { key: 'z', label: 'Flutes', min: 2, max: 5, step: 1, value: 3 },
      { key: 'ae', label: 'Radial engagement (stepover)', unit: ' %', min: 5, max: 50, step: 1, value: 12 },
      { key: 'm', label: 'Material', min: 0, max: 6, step: 1, value: 0, options: SHORT.map((x, i) => [i, x]) }
    ],
    parts: PARTS,
    draw(g, a, p) {
      const q = calc(p), k = 9, R = p.d / 2 * k, step = Math.max(2, p.ae / 100 * p.d * k), x0 = 110, y0 = 120, W = 400, Hs = R * 2 + 60;
      // a slot cleared with trochoidal (looping) passes: the cutter circles while it creeps forward by the stepover each loop
      const t = ((a / (TAU * 2)) % 1 + 1) % 1, loops = (W - 2 * R) / step, s = t * loops, cxp = x0 + R + s * step, ang = s * TAU, rr = (Hs - 2 * R) / 2;
      const C = [cxp + rr * 0.35 * Math.cos(ang), y0 + Hs / 2 + rr * Math.sin(ang)];
      g.rect(60, 60, 500, 260, { fill: MM.tint('white', .9), sp: 7 });
      // cleared slot so far
      g.rect(x0, y0, Math.max(0, cxp - x0 + rr * 0.35), Hs, { fill: COL.paper, hatch: false, color: COL.paper });
      g.circle(C[0], C[1], R + 0.5, { fill: COL.paper, color: COL.paper });
      const path = []; for (let i = 0; i <= 160; i++) { const ss = Math.max(0, s - 2 + i / 160 * 2); path.push([x0 + R + ss * step + rr * 0.35 * Math.cos(ss * TAU), y0 + Hs / 2 + rr * Math.sin(ss * TAU)]); }
      g.trace(path, { color: MM.tint('red', .5), w: 1, dash: [3, 3] });
      // cutter (seen from above) with its flutes
      g.circle(C[0], C[1], R, { fill: MM.tint('red', .35) });
      for (let i = 0; i < p.z; i++) { const ph = -a * 8 + i * TAU / p.z; g.line(C[0], C[1], C[0] + R * Math.cos(ph), C[1] + R * Math.sin(ph), { w: 1.6 }); }
      g.text('trochoidal (adaptive) slot: the cutter loops forward ' + MM.num(p.ae / 100 * p.d, 2) + ' mm each turn', 310, 340, { size: 11, align: 'center', color: COL.faint });
      g.text(Math.round(q.rpm) + ' rpm · ' + Math.round(q.feed) + ' mm/min', 310, 375, { size: 16, weight: 800, align: 'center', color: COL.red });
      g.text('feed per tooth ' + MM.num(q.fz, 3) + ' mm × ' + MM.num(q.k, 2) + ' for chip thinning = ' + MM.num(q.fzA, 3) + ' mm', 310, 400, { size: 12, align: 'center' });
      g.text(SHORT[p.m] + ', carbide Ø' + p.d + ' × ' + p.z + ' flutes', 310, 422, { size: 11, align: 'center', color: COL.faint });
      // chip shape inset
      const ix = 610, iy = 150, ir = 50; g.circle(ix, iy, ir, { fill: MM.tint('red', .35) }); g.text('cutter', ix, iy + ir + 16, { size: 10, align: 'center', color: COL.faint });
      const ae = p.ae / 100 * 2 * ir; g.rect(ix + ir - ae, iy - ir - 10, ae + 30, 2 * ir + 20, { fill: COL.white, sp: 5 });
      g.text('engaged ' + p.ae + ' %', ix, iy - ir - 22, { size: 10, align: 'center', color: COL.faint });
    },
    readout(a, p) { const q = calc(p); return { big: Math.round(q.feed) + ' mm/min', small: MM.ipm(q.feed) + ' at ' + Math.round(q.rpm) + ' rpm; ' + p.ae + ' % engagement thins the chip, so the feed is raised ' + MM.num(q.k, 2) + '× to keep ' + MM.num(q.fz, 3) + ' mm chips' }; },
    panels: [{
      id: 'flow', title: 'From model to part',
      html: () => `<ol class="rules"><li><b>CAD:</b> model the part. Check inside corners: a cutter of radius r cannot cut a corner smaller than r.</li>
        <li><b>CAM:</b> choose the setup (which way up, which faces), the stock, the tools, and toolpaths: facing, adaptive roughing, contour and pocket finishing, drilling, chamfering.</li>
        <li><b>Post-process</b> to G-code for your machine's controller, and simulate it to catch crashes and gouges.</li>
        <li><b>Set up:</b> load tools and measure their lengths (tool setter or touch-off), clamp the stock, and set the work offset (G54) with a probe or edge finder.</li>
        <li><b>Prove out:</b> run the first part with the feed and rapid overrides turned down and a hand near the stop button. Single-block the first moves and watch the distance-to-go.</li>
        <li><b>Inspect</b> the first part, adjust tool wear offsets, then run the rest.</li></ol>`
    }, {
      id: 'gcode', title: 'The G-code you will see most',
      html: () => `<div class="tablewrap"><table class="btable"><thead><tr><th>Code</th><th>Meaning</th></tr></thead><tbody>
        <tr><td>G0 / G1</td><td>Rapid move / straight cutting move at feed F</td></tr><tr><td>G2 / G3</td><td>Arc clockwise / counter-clockwise</td></tr>
        <tr><td>G17, G18, G19</td><td>Arc plane XY, XZ, YZ</td></tr><tr><td>G20 / G21</td><td>Inch / millimetre units</td></tr>
        <tr><td>G28</td><td>Return to machine home</td></tr><tr><td>G43 H_</td><td>Apply tool length offset</td></tr>
        <tr><td>G54 to G59</td><td>Work offsets (where part zero is)</td></tr><tr><td>G90 / G91</td><td>Absolute / incremental positions</td></tr>
        <tr><td>G81 to G83</td><td>Drilling cycles (G83 pecks to clear chips)</td></tr><tr><td>M3 / M4 / M5</td><td>Spindle clockwise / anticlockwise / stop</td></tr>
        <tr><td>M6 T_</td><td>Tool change</td></tr><tr><td>M8 / M9</td><td>Coolant on / off</td></tr><tr><td>M30</td><td>End of program and rewind</td></tr>
        <tr><td>S_ / F_</td><td>Spindle speed (rpm) / feed rate</td></tr></tbody></table></div>`
    }, {
      id: 'dfm', title: 'Designing parts for CNC milling',
      html: () => `<ul class="rules"><li><b>Inside corners:</b> give them a radius a little larger than the cutter radius (for example 3.2 mm for a 6 mm cutter) so the tool can turn the corner without stopping.</li>
        <li><b>Pocket depth:</b> up to about 3 to 4 times the cutter diameter is easy; deeper needs long, fragile tools.</li>
        <li><b>Thin walls:</b> keep metal walls at least about 0.8 mm and plastic walls 1.5 mm, or they vibrate and bend.</li>
        <li><b>Holes:</b> use standard drill sizes and standard thread sizes; deep, small holes (over about 10 × diameter) are slow and risky.</li>
        <li><b>Fewer setups:</b> features you can reach from one side cost far less than features on all six faces.</li>
        <li><b>Tolerances:</b> a shop's standard is often ±0.13 mm (±0.005 in). Tighter costs more; ask for it only where parts fit together.</li></ul>`
    }, {
      id: 'shop', title: 'What to send when ordering machined parts',
      html: () => `<ul class="rules"><li>A <b>3D model</b> (STEP file) and a <b>2D drawing</b> (PDF) with every tolerance, thread and finish called out. The drawing is the contract.</li>
        <li><b>Material and temper</b> (for example 6061-T6 aluminium, 304 stainless), and whether you need a material certificate.</li>
        <li><b>Finish:</b> as machined, bead blasted, anodised (type and colour), powder coat, plating.</li>
        <li><b>Quantity</b> and delivery date. Unit price drops a lot from 1 to 10 to 100 because setup is paid once.</li>
        <li><b>Inspection:</b> say if you need a first-article report or certain dimensions checked.</li></ul>`
    }]
  });
})();
