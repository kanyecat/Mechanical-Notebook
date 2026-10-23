(function () {
  const { TAU, COL } = MM, W = 100;   // board width in mm
  const ratio = p => (W / p.n) / p.t;   // finger width as a multiple of the sheet thickness
  const verdict = r => r < 1 ? ['TOO NARROW', 'fingers under 1× the thickness snap easily'] : r <= 3.2 ? ['GOOD', 'fingers 1 to 3 times the thickness'] : ['TOO WIDE', 'wide fingers give less locking, more glue area is lost'];
  MM.register({
    slug: 'finger-joint', view: { w: 700, h: 440 }, thumb: 0.3,
    params: [
      { key: 'n', label: 'Fingers across', min: 3, max: 15, step: 2, value: 7 },
      { key: 't', label: 'Sheet thickness', unit: ' mm', min: 3, max: 12, step: 0.5, value: 6 },
      { key: 'kerf', label: 'Laser kerf', unit: ' mm', min: 0, max: 0.4, step: 0.05, value: 0.2 }
    ],
    draw(g, a, p) {
      const u = MM.cycle(a), s = 4.6, bw = W * s, x0 = (700 - bw) / 2, fw = bw / p.n, d = Math.max(p.t * s, 10), ya = 270, bh = 100;
      // board A (below) has fingers up at even positions; board B (above) has fingers down at odd positions
      const comb = (x, yBody, up) => {   // outline of a board with fingers; up=true: fingers point up from the top edge
        const pts = [], yEdge = up ? yBody : yBody + bh, yTip = up ? yBody - d : yBody + bh + d;
        const base = up ? yBody + bh : yBody;
        pts.push([x, base]);
        for (let i = 0; i < p.n; i++) {
          const on = up ? i % 2 === 0 : i % 2 === 1, xa = x + i * fw, xb = xa + fw;
          if (i === 0) pts.push([xa, up ? yEdge : yEdge]);
          if (on) { pts.push([xa, yEdge], [xa, yTip], [xb, yTip], [xb, yEdge]); } else { pts.push([xa, yEdge], [xb, yEdge]); }
        }
        pts.push([x + bw, base]); return pts;
      };
      g.poly(comb(x0, ya, true), { fill: COL.white, hatch: { spacing: 6, cx: x0 + bw / 2, cy: ya + bh / 2 } });
      const yb = ya - d - bh - 110 * (1 - u);   // board B body top
      g.poly(comb(x0, yb - 0, false).map(q => [q[0], q[1] - 0]), { fill: MM.tint('white', 0.96), hatch: { spacing: 6, cx: x0 + bw / 2, cy: yb + bh / 2 } });
      g.dim(x0, ya + bh + 22, x0 + fw, ya + bh + 22, (W / p.n).toFixed(1) + ' mm', 0, { ty: 16 });
      g.dim(x0 + bw + 24, ya - d, x0 + bw + 24, ya, p.t + ' mm', 0, { tx: 30, ty: 0 });
      g.text('board A', x0 + 8, ya + bh - 14, { size: 11, color: COL.faint }); g.text('board B', x0 + 8, yb + 16, { size: 11, color: COL.faint });
      g.text('finger width = ' + ratio(p).toFixed(1) + ' × thickness', 350, 424, { size: 12, align: 'center', weight: 700, color: COL.red });
    },
    readout(a, p) { const v = verdict(ratio(p)); return { big: v[0], small: 'finger ' + (W / p.n).toFixed(1) + ' mm = ' + ratio(p).toFixed(1) + '× the sheet. ' + v[1] }; },
    panels: [{
      id: 'sizing', title: 'What to draw', live: true,
      intro: 'On a laser cutter every cut is a little wider than the line, so fingers come out narrower and gaps wider. Draw the fingers slightly wider than the gaps, and the corner goes together snugly.',
      html: p => { const w = W / p.n; return `<div class="tablewrap"><table class="btable"><thead><tr><th>Feature</th><th>Nominal</th><th>Draw it at</th></tr></thead><tbody>
        <tr><td>Finger width</td><td>${w.toFixed(2)} mm</td><td><b>${(w + p.kerf).toFixed(2)} mm</b> (nominal + kerf)</td></tr>
        <tr><td>Gap between fingers</td><td>${w.toFixed(2)} mm</td><td><b>${(w - p.kerf).toFixed(2)} mm</b> (nominal − kerf)</td></tr>
        <tr><td>Finger length</td><td>${p.t} mm</td><td><b>${p.t} mm</b> (equal to the thickness of the other board)</td></tr></tbody></table></div>
        <ul class="rules"><li><b>Use an odd number of fingers</b> so the outer edges of the two boards finish square. Even numbers leave a gap at one end.</li>
        <li><b>Finger width:</b> about 1 to 3 times the sheet thickness. Narrower fingers snap, wider ones lose the locking effect.</li>
        <li><b>Glue:</b> every finger adds glue area. Put glue on the long faces, not on the tips.</li></ul>`; }
    }]
  });
})();
