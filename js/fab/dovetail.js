(function () {
  const { TAU, COL } = MM;
  const SLOPES = [[6, '1 : 6 (softwood)'], [8, '1 : 8 (hardwood)'], [5, '1 : 5 (bold)']];
  MM.register({
    slug: 'dovetail', hands: false, view: { w: 700, h: 430 }, thumb: 0.5,
    params: [
      { key: 's', label: 'Slope', min: 0, max: 2, step: 1, value: 0, options: SLOPES.map((x, i) => [i, x[1]]) },
      { key: 'n', label: 'Tails', min: 1, max: 5, step: 1, value: 3 }
    ],
    draw(g, a, p) {
      // face view of a through dovetail: the tail board slides down onto the pin board
      const r = SLOPES[p.s][0], n = p.n | 0, W = 420, x0 = 140, depth = 70, yPin = 270, u = MM.cycle(a, 0.15), drop = (1 - u) * 110;
      const pitch = W / n, tailW = pitch * 0.62, flare = depth / r;   // each tail is wider at its end by depth ÷ r on each side
      // pin board (bottom): sockets shaped like the tails
      const pin = [[x0, yPin + depth + 80], [x0, yPin]];
      for (let i = 0; i < n; i++) { const c = x0 + pitch * (i + 0.5); pin.push([c - tailW / 2 + flare, yPin], [c - tailW / 2, yPin + depth], [c + tailW / 2, yPin + depth], [c + tailW / 2 - flare, yPin]); }
      pin.push([x0 + W, yPin], [x0 + W, yPin + depth + 80]);
      g.poly(pin, { fill: COL.white, hatch: { spacing: 6 } });
      // tail board (top), each tail flared at its end
      const yT = yPin - drop, tail = [[x0, yT - 80], [x0 + W, yT - 80], [x0 + W, yT]];
      for (let i = n - 1; i >= 0; i--) { const c = x0 + pitch * (i + 0.5); tail.push([c + tailW / 2 - flare, yT], [c + tailW / 2, yT + depth], [c - tailW / 2, yT + depth], [c - tailW / 2 + flare, yT]); }
      tail.push([x0, yT]);
      g.poly(tail, { fill: MM.tint('red', .4) });
      g.text('tail board', x0 + W + 14, yT - 40, { size: 11, color: COL.faint }); g.text('pin board', x0 + W + 14, yPin + 60, { size: 11, color: COL.faint });
      const deg = Math.atan(1 / r) * 180 / Math.PI;
      g.text('slope 1 : ' + r + ' = ' + deg.toFixed(1) + '°', 350, 24, { size: 14, weight: 700, align: 'center' });
      g.text('pulls apart only the way it went in', 350, 46, { size: 11, align: 'center', color: COL.faint });
    },
    readout(a, p) { const r = SLOPES[p.s][0]; return { big: (Math.atan(1 / r) * 180 / Math.PI).toFixed(1) + '°', small: 'a 1 : ' + r + ' slope: each side of the tail moves out 1 mm for every ' + r + ' mm of length' }; },
    panels: [{
      id: 'rules', title: 'Dovetails by process',
      html: () => `<div class="tablewrap"><table class="btable"><thead><tr><th>Process</th><th>How</th><th>Tips</th></tr></thead><tbody>
        <tr><td>Hand tools</td><td>Saw and chisel; mark with a dovetail gauge</td><td>1 : 6 in softwood, 1 : 8 in hardwood. Cut tails first and mark the pins from them.</td></tr>
        <tr><td>Router with a jig</td><td>A dovetail bit (often 7° to 14°) follows a template</td><td>Half-blind drawer dovetails in one setup; set depth by test cuts.</td></tr>
        <tr><td>CNC router</td><td>Dovetail bit for the sides, end mill to clear</td><td>Inside corners are round; put the round in the waste or use a matching radius on the other part.</td></tr>
        <tr><td>3D printing</td><td>Sliding dovetail rails and slots</td><td>0.2 to 0.3 mm clearance each side; print rails lying flat; add a small chamfer at the entry.</td></tr>
        <tr><td>Machining</td><td>Dovetail cutter on a mill (45° to 60°)</td><td>Machine slides and gibs; a tapered gib strip adjusts the play.</td></tr></tbody></table></div>`
    }]
  });
})();
