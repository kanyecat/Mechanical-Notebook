(function () {
  const { TAU, COL } = MM;
  const INS = { 3: [4.4, 5.7, 4.0], 4: [6.1, 8.1, 5.6], 5: [7.1, 9.5, 6.4] };   // outside diameter, length (standard Prusa insert), recommended hole diameter
  MM.register({
    slug: 'heat-set-insert', view: { w: 700, h: 440 }, thumb: 0.35,
    params: [{ key: 'd', label: 'Thread size', min: 3, max: 5, step: 1, value: 4, options: [[3, 'M3'], [4, 'M4'], [5, 'M5']] }],
    draw(g, a, p) {
      const u = MM.cycle(a), [od, L, hole] = INS[p.d], s = 14, cx = 270, yb = 385, depth = (L + 1.5) * s, bt = depth + 36, yt = yb - bt;
      const hw = hole * s, ow = od * s, lw = L * s;
      // plastic block
      g.rect(90, yt, cx - hw / 2 - 90, bt); g.rect(cx + hw / 2, yt, 450 - cx - hw / 2, bt);
      g.rect(cx - hw / 2, yb - 36, hw, 36);
      g.text('printed part', 110, yb + 22, { size: 11, color: COL.faint });
      // melted plastic round the insert as it goes in
      if (u > 0.2) { const k = Math.min(1, (u - 0.2) / 0.6); const reach = (od - hole) * s / 2 + 5 * k; g.rect(cx - ow / 2 - 6 * k, yt, ow + 12 * k, Math.min(lw * u + 4, depth), { fill: MM.tint('red', 0.28 * k), hatch: false, color: 'transparent' }); }
      // the insert comes down into the hole, pushed by the iron tip
      const topY = yt - 150 * (1 - u) - lw * 0 , iy = topY;
      g.rect(cx - ow / 2, iy, ow, lw, { fill: MM.tint('white', 0.96), hatch: false, color: COL.ink, w: 2 });
      for (let k = 1; k < 8; k++) g.line(cx - ow / 2, iy + k * lw / 8, cx + ow / 2, iy + k * lw / 8 - 3, { w: 1, color: COL.faint });          // knurls
      g.rect(cx - ow / 2 + 8, iy + 10, ow - 16, lw - 10, { fill: COL.paper, hatch: false, color: COL.faint, w: 1, dash: [3, 3] });   // the thread inside
      // the iron
      const tipY = iy - 4;
      g.poly([[cx - 8, tipY], [cx + 8, tipY], [cx + 20, tipY - 36], [cx - 20, tipY - 36]], { fill: MM.tint('red', 0.6), color: COL.red });
      g.rect(cx - 20, tipY - 150, 40, 114, { fill: MM.tint('red', 0.18), hatch: false, color: COL.red });
      g.text('iron', cx + 30, tipY - 100, { size: 11, color: COL.red });
      g.text('insert', cx + ow / 2 + 14, iy + lw / 2, { size: 11, color: COL.faint });
      g.dim(cx - hw / 2, yt - 12 - 0, cx + hw / 2, yt - 12, '', 0, { color: COL.faint });
      // measurements on the right
      const mx = 520; g.text('HOLE', mx, 150, { size: 10, color: COL.faint });
      g.text('Ø ' + hole + ' mm', mx, 172, { size: 18, weight: 800, color: COL.red });
      g.text('INSERT', mx, 220, { size: 10, color: COL.faint }); g.text('Ø ' + od + ' × ' + L + ' mm', mx, 242, { size: 14, weight: 700 });
      g.text('DEPTH', mx, 290, { size: 10, color: COL.faint }); g.text('≥ ' + (L + 1.5).toFixed(1) + ' mm', mx, 312, { size: 14, weight: 700 });
    },
    readout(a, p) { const [od, L, h] = INS[p.d]; return { big: 'Ø ' + h + ' mm', small: 'hole for an M' + p.d + ' insert (Ø ' + od + ' × ' + L + ' mm). Depth at least ' + (L + 1.5).toFixed(1) + ' mm' }; },
    panels: [{
      id: 'sizes', title: 'Typical hole sizes', live: true,
      intro: 'Starting values for common brass inserts (the insert outside diameter and hole sizes follow a supplier chart, the lengths are Prusa’s standard inserts). Different inserts and filaments vary, so check your supplier’s data sheet and print one test hole.',
      html: p => `<div class="tablewrap"><table class="btable"><thead><tr><th>Thread</th><th>Insert outside Ø</th><th>Insert length</th><th>Hole Ø</th><th>Hole depth (rule of thumb)</th></tr></thead><tbody>${Object.keys(INS).map(k => { const [od, L, h] = INS[k]; return `<tr${+k === +p.d ? ' style="font-weight:700"' : ''}><td>M${k}</td><td>${od} mm</td><td>${L} mm</td><td>${h} mm</td><td>${(L + 1).toFixed(1)} to ${(L + 2).toFixed(1)} mm</td></tr>`; }).join('')}</tbody></table></div>
        <ul class="rules"><li><b>Make the hole a little smaller than the insert</b> and a little deeper than its length, so melted plastic has room to flow and nothing is pushed out underneath.</li>
        <li><b>Temperature:</b> a common starting point is the plastic’s printing temperature plus 10 °C at the iron tip. A preheated iron may need 10 to 20 °C more.</li>
        <li><b>Press straight</b> and stop when the insert is flush. Let it cool before screwing a bolt in.</li>
        <li><b>Wall:</b> leave a good thickness of plastic round the hole. Thin walls bulge or split. A wall about as thick as the insert’s outside diameter is a safe place to start.</li>
        <li><b>Print the hole</b> as a plain cylinder, with the insert’s top edge flush with or just below the surface.</li></ul>`
    }]
  });
})();
