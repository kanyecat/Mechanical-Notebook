(function () {
  const { TAU, COL } = MM;
  MM.register({
    slug: 'laser-kerf', view: { w: 700, h: 440 }, thumb: 0.5,
    params: [
      { key: 'k', label: 'Kerf (cut width)', unit: ' mm', min: 0.05, max: 0.5, step: 0.01, value: 0.2 },
      { key: 'part', label: 'Drawn part width', unit: ' mm', min: 20, max: 60, step: 1, value: 40 },
      { key: 'hole', label: 'Drawn hole width', unit: ' mm', min: 10, max: 30, step: 1, value: 20 }
    ],
    draw(g, a, p) {
      const u = MM.cycle(a), s = 7, X = 18, kk = p.k * s * X / 2;   // half the kerf, shown magnified
      const x0 = 70, y0 = 120, pw = p.part * s, hw = p.hole * s, ph = 150, hx = x0 + (pw - hw) / 2;
      // the part as drawn (dashed outline), then as cut
      g.rect(x0, y0, pw, ph, { fill: 'transparent', hatch: false, color: COL.faint, dash: [4, 4], w: 1 });
      g.rect(hx, y0 + 45, hw, 60, { fill: 'transparent', hatch: false, color: COL.faint, dash: [4, 4], w: 1 });
      // cut part: outside shrinks, hole grows (magnified by X), blended by u
      const k = kk * u;
      g.rect(x0 + k, y0 + k, pw - 2 * k, ph - 2 * k);
      g.rect(hx - k, y0 + 45 - k, hw + 2 * k, 60 + 2 * k, { fill: COL.paper, hatch: false });
      g.text('dashed = drawn, solid = cut (kerf magnified ×' + X + ')', x0, y0 - 24, { size: 11, color: COL.faint });
      const cutPart = p.part - p.k, cutHole = p.hole + p.k;
      g.text('PART', 440, 130, { size: 10, color: COL.faint }); g.text('drawn ' + p.part + ' mm', 440, 152, { size: 12 }); g.text('cut  ' + cutPart.toFixed(2) + ' mm', 440, 174, { size: 14, weight: 800, color: COL.red });
      g.text('HOLE', 440, 220, { size: 10, color: COL.faint }); g.text('drawn ' + p.hole + ' mm', 440, 242, { size: 12 }); g.text('cut  ' + cutHole.toFixed(2) + ' mm', 440, 264, { size: 14, weight: 800, color: COL.red });
      g.text('Part: ' + (p.k).toFixed(2) + ' mm smaller.  Hole: ' + (p.k).toFixed(2) + ' mm bigger.', x0, 345, { size: 12, weight: 700, color: COL.red });
      g.text('To get a ' + p.part + ' mm part, draw it ' + (p.part + p.k).toFixed(2) + ' mm.', x0, 368, { size: 12 });
      g.text('To get a ' + p.hole + ' mm hole, draw it ' + (p.hole - p.k).toFixed(2) + ' mm.', x0, 390, { size: 12 });
    },
    readout(a, p) { return { big: p.k.toFixed(2) + ' mm', small: 'kerf. Parts come out ' + p.k.toFixed(2) + ' mm smaller and holes ' + p.k.toFixed(2) + ' mm bigger than drawn' }; },
    panels: [{
      id: 'fix', title: 'How to compensate', live: true,
      intro: 'Half the kerf is lost on each side of the cut line, so a width changes by one whole kerf: parts shrink and holes grow.',
      html: p => `<div class="tablewrap"><table class="btable"><thead><tr><th>You want</th><th>Draw it</th></tr></thead><tbody>
        <tr><td>Outside width of a part: W</td><td>W + ${p.k.toFixed(2)} mm</td></tr>
        <tr><td>Hole or slot width: H</td><td>H − ${p.k.toFixed(2)} mm</td></tr>
        <tr><td>Tab that fits a slot snugly</td><td>Tab width + kerf, slot width − kerf</td></tr></tbody></table></div>
        <ul class="rules"><li><b>Measure your own kerf.</b> Cut a row of slots of a known drawn width, then measure the cut width with calipers. Use that number. It changes with the material, the lens and the speed.</li>
        <li><b>Or offset the cut line</b> by half the kerf in your software. The result is the same.</li>
        <li><b>Edges are not perfectly square.</b> The cut is slightly wider at the top than at the bottom, which matters for thick sheet.</li>
        <li><b>Gears, cams and meshing teeth</b> need the correction too, or they will run loose.</li></ul>`
    }]
  });
})();
