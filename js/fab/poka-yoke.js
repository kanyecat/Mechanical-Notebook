(function () {
  const { TAU, COL } = MM, PEG = 8;   // peg diameter, mm
  const verdict = p => 2 * p.o < PEG ? ['TOO SUBTLE', 'the wrong way is only ' + (2 * p.o) + ' mm out, which is less than a peg, so it can be forced'] : ['CLEAR', 'the wrong way misses a peg by ' + (2 * p.o) + ' mm, more than a whole peg'];
  MM.register({
    slug: 'poka-yoke', view: { w: 700, h: 440 }, thumb: 0.95,
    params: [{ key: 'o', label: 'Odd peg off the centre line', unit: ' mm', min: 1, max: 30, step: 1, value: 14 }],
    draw(g, a, p) {
      const c = g.c, u = MM.cycle(a, 0.12), s = 2.2, cx = 350, cy = 205, pr = PEG * s / 2, rot = Math.PI * (1 - u), lift = Math.max(0, Math.min(1, (u - 0.75) / 0.25));
      const pegs = [[-50, 0], [50, 0], [0, p.o]], bw = 135, bh = 68;
      g.rect(cx - 190, cy - 100, 380, 200, { hatch: { spacing: 7, cx, cy } });
      pegs.forEach(q => g.circle(cx + q[0] * s, cy + q[1] * s, pr, { fill: COL.red, color: COL.red, w: 1.5 }));
      // the part, turned by rot about its centre, with holes at the same pattern
      const wrong = u < 0.85, k = 1 + 0.12 * (1 - lift);
      c.save(); c.translate(cx, cy); c.rotate(rot); c.scale(k, k);
      g.style({ fill: wrong ? MM.tint('red', 0.2) : MM.tint('white', 0.88), color: wrong ? COL.red : COL.ink, w: 2 }); c.beginPath(); c.roundRect(-bw, -bh, bw * 2, bh * 2, 8); c.fill(); c.stroke();
      pegs.forEach(q => { g.circle(q[0] * s, q[1] * s, pr + 1.5, { fill: COL.paper, color: COL.ink, w: 1.4 }); });
      g.text('TOP', 0, -bh + 18, { size: 11, align: 'center', color: COL.faint, rot: 0 });
      c.restore();
      const v = verdict(p);
      g.text(wrong ? 'WRONG WAY ROUND: the odd hole is over empty plate' : 'RIGHT WAY ROUND: every hole meets a peg', 40, 380, { size: 13, weight: 800, color: wrong ? COL.red : COL.blue });
      g.text(v[0] + ': ' + v[1], 40, 404, { size: 11, color: COL.faint });
      g.text('Two pegs sit on a line, so half a turn still lines them up.', 40, 20, { size: 10, color: COL.faint });
      g.text('The third peg sits off the line, so only one way works.', 40, 36, { size: 10, color: COL.faint });
    },
    readout(a, p) { const v = verdict(p); return { big: v[0], small: v[1] }; },
    panels: [{
      id: 'ideas', title: 'Easy ways to make a part go one way', live: false,
      intro: 'The cheapest asymmetry costs nothing to make. Move a hole, cut a corner or add a notch.',
      html: () => `<div class="tablewrap"><table class="btable"><thead><tr><th>Feature</th><th>How it works</th></tr></thead><tbody>
        <tr><td>Off-centre hole or peg</td><td>Only one orientation lines up. Free to make.</td></tr>
        <tr><td>Cut corner (chamfer)</td><td>A square corner will not go into a cut-corner pocket. Used on cards and connectors.</td></tr>
        <tr><td>Notch or key</td><td>A small tab fits a matching slot on one side only.</td></tr>
        <tr><td>Different sizes</td><td>Two pegs of different diameter, so the holes cannot swap.</td></tr></tbody></table></div>
        <ul class="rules"><li><b>Make the difference big.</b> A tiny offset invites someone to force it. Aim for more than a whole peg diameter.</li>
        <li><b>Also mark the part.</b> Print or engrave an arrow or the word TOP so people see which way round it goes before they try.</li>
        <li><b>Check the symmetric case.</b> Turn the part half a turn, and flip it over, and ask if each one still fits.</li></ul>`
    }]
  });
})();
