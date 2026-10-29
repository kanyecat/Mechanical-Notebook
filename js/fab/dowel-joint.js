(function () {
  const { TAU, COL } = MM;
  const STD = [5, 6, 8, 10, 12, 14, 16];
  const size = T => { const d = STD.reduce((b, x) => Math.abs(x - T * 0.4) < Math.abs(b - T * 0.4) ? x : b, 6); const L = Math.min(80, Math.max(25, Math.round(4.5 * d / 5) * 5)); return { d, L, depth: L / 2 + 1.5 }; };
  MM.register({
    slug: 'dowel-joint', hands: false, view: { w: 700, h: 420 }, thumb: 0.55,
    params: [{ key: 'T', label: 'Board thickness', unit: ' mm', min: 12, max: 40, step: 1, value: 18 }],
    draw(g, a, p) {
      const z = size(p.T), k = Math.min(5, 150 / p.T, 230 / z.L), cy = 210, T = p.T * k, d = z.d * k, hl = z.depth * k, u = MM.cycle(a, 0.16), x0 = 330;
      const gapB = (1 - u) * 160, dowIn = Math.min(1, u * 2);
      // board A (left) with its hole; board B (right) slides on
      g.rect(60, cy - T / 2, x0 - 60, T); g.rect(x0 - hl, cy - d / 2 - 0.5, hl, d + 1, { fill: COL.paper, hatch: false });
      const bx = x0 + gapB; g.rect(bx, cy - T / 2, 300, T); g.rect(bx, cy - d / 2 - 0.5, hl, d + 1, { fill: COL.paper, hatch: false });
      // the dowel: glued into A first, with flutes for the glue
      const dx = x0 - z.L / 2 * k + (1 - dowIn) * 0;
      g.rect(dx, cy - d / 2, z.L * k, d, { fill: MM.tint('red', .45), hatch: false });
      for (let x = dx + 6; x < dx + z.L * k - 4; x += 9) g.line(x, cy - d / 2 + 1, x + 5, cy + d / 2 - 1, { w: 0.8, color: COL.faint });
      g.dim(x0 - hl, cy - T / 2 - 26, x0, cy - T / 2 - 26, MM.num(z.depth, 1), 0);
      g.dim(dx, cy + T / 2 + 30, dx + z.L * k, cy + T / 2 + 30, 'dowel Ø' + z.d + ' × ' + z.L, 0);
      g.dim(70, cy - T / 2, 70, cy + T / 2, p.T + ' mm', 0, { tx: -30, ty: 0 });
      g.text('drill each hole ' + MM.num(z.depth, 1) + ' mm deep: half the dowel plus room for glue', 350, 380, { size: 12, align: 'center' });
      g.text('board A', 150, cy - T / 2 - 12, { size: 11, color: COL.faint }); g.text('board B', bx + 160, cy - T / 2 - 12, { size: 11, color: COL.faint });
    },
    readout(a, p) { const z = size(p.T); return { big: 'Ø ' + z.d + ' × ' + z.L + ' mm', small: 'dowels for ' + p.T + ' mm boards, holes ' + MM.num(z.depth, 1) + ' mm deep in each part, about 100 to 150 mm apart' }; },
    panels: [{
      id: 'sizes', title: 'Dowel sizes for board thickness', live: true,
      intro: 'Common starting points for wood. The dowel should be about a third to half the board thickness and never leave less than a quarter of the thickness on each side.',
      html: p => `<div class="tablewrap"><table class="btable"><thead><tr><th>Board</th><th>Dowel</th><th>Hole depth in each part</th></tr></thead><tbody>${[12, 15, 18, 22, 25, 30, 40].map(T => { const z = size(T); return `<tr${T === +p.T ? ' style="font-weight:700"' : ''}><td>${T} mm</td><td>Ø ${z.d} × ${z.L} mm</td><td>${MM.num(z.depth, 1)} mm</td></tr>`; }).join('')}</tbody></table></div>
        <ul class="rules"><li><b>Line up the holes:</b> a dowel jig, or drill one part and press dowel centres (pointed plugs) into its holes to mark the other.</li>
        <li><b>Hole size:</b> wooden dowels go in the matching drill size. Glue swells them, so do not make the fit tight.</li>
        <li><b>Metal dowel pins</b> for locating machined or printed parts: ream or drill the hole for a light press in one part and a sliding fit in the other. Use two pins per joint, one in a round hole and one in a slot or a slightly larger hole.</li>
        <li><b>Printed parts:</b> printed holes come out small; model them 0.1 to 0.2 mm larger for a press, or print undersize and drill to size.</li></ul>`
    }]
  });
})();
