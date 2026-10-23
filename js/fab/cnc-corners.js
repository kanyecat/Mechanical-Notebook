(function () {
  const { TAU, COL } = MM;
  MM.register({
    slug: 'cnc-corners', view: { w: 700, h: 440 }, thumb: 0.9,
    params: [
      { key: 'd', label: 'Cutter diameter', unit: ' mm', min: 1.5, max: 10, step: 0.5, value: 6 },
      { key: 'st', label: 'Corner fix', min: 0, max: 2, step: 1, value: 0, options: [[0, 'None'], [1, 'Dog-bone'], [2, 'Round the part']] }
    ],
    draw(g, a, p) {
      const c = g.c, u = MM.cycle(a, 0.1), s = 5, pw = 64 * s, ph = 40 * s, x1 = 190, y1 = 130, x2 = x1 + pw, y2 = y1 + ph, r = p.d * s / 2;
      g.rect(x1 - 40, y1 - 40, pw + 80, ph + 80);   // stock
      // the pocket, with the corners the cutter leaves
      c.save(); g.style({ fill: COL.paper, w: 2 }); c.beginPath(); c.roundRect(x1, y1, pw, ph, r); c.fill(); c.stroke(); c.restore();
      const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]], prog = Math.min(1, u * 1.5), done = prog >= 1;
      if (p.st === 1) corners.forEach(([sx, sy]) => { const px = sx < 0 ? x1 : x2, py = sy < 0 ? y1 : y2, k = r * Math.SQRT1_2; if (done) g.circle(px - sx * k, py - sy * k, r, { fill: COL.paper, w: 2 }); });
      // red = material the square part cannot get past
      if (p.st === 0 && done) corners.forEach(([sx, sy]) => {
        const px = sx < 0 ? x1 : x2, py = sy < 0 ? y1 : y2, cx = px - sx * r, cy = py - sy * r, a1 = Math.atan2(sy, 0), a2 = Math.atan2(0, sx); let df = a2 - a1; while (df > Math.PI) df -= TAU; while (df < -Math.PI) df += TAU;
        c.save(); g.style({ fill: MM.tint('red', 0.7), color: COL.red, w: 1.2 }); c.beginPath(); c.moveTo(px, py); c.lineTo(cx, py); c.arc(cx, cy, r, a1, a2, df < 0); c.closePath(); c.fill(); c.stroke(); c.restore();
      });
      // the cutter follows the tool path (centre line inset by the radius)
      const L = 2 * (pw - 2 * r) + 2 * (ph - 2 * r); let t = prog * L, tx = x1 + r, ty = y1 + r;
      const segs = [[pw - 2 * r, 1, 0], [ph - 2 * r, 0, 1], [pw - 2 * r, -1, 0], [ph - 2 * r, 0, -1]], pts = [[tx, ty]];
      for (const [len, dx, dy] of segs) { const m = Math.min(t, len); tx += dx * m; ty += dy * m; t -= m; pts.push([tx, ty]); if (t <= 0) break; }
      if (!done || true) { g.trace(pts, { color: COL.red, w: 1.4, dash: [5, 4] }); }
      if (!done) { g.circle(tx, ty, r, { color: COL.red, fill: MM.tint('red', 0.25), w: 1.6 }); g.text('cutter Ø ' + p.d + ' mm', x1 + pw / 2, y1 - 58, { size: 12, align: 'center', color: COL.red, weight: 700 }); }
      // verdict
      const msg = p.st === 0 ? (done ? 'SQUARE PART WILL NOT FIT: ' + (r / s).toFixed(1) + ' mm radius left in each corner' : 'cutting the pocket…') : p.st === 1 ? (done ? 'DOG-BONES: the cutter pokes into the corners, the square part fits' : 'cutting the pocket…') : 'ROUND THE PART: its corners match the cutter radius, ' + (r / s).toFixed(1) + ' mm';
      g.text(msg, x1 - 40, 398, { size: 12, weight: 700, color: (p.st === 0 && done) ? COL.red : COL.blue });
      if (p.st === 2) { c.save(); g.style({ color: COL.blue, w: 2 }); c.beginPath(); c.roundRect(x1 + 5, y1 + 5, pw - 10, ph - 10, r); c.stroke(); c.restore(); }
      g.text('pocket 64 × 40 mm', x1 - 40, 40, { size: 11, color: COL.faint });
    },
    readout(a, p) { return { big: 'R ' + (p.d / 2).toFixed(2) + ' mm', small: 'inside corner radius left by a ' + p.d + ' mm cutter. ' + ['A square-cornered part will not fit the pocket.', 'Dog-bone reliefs let a square part fit.', 'The part is drawn with matching round corners.'][p.st] }; },
    panels: [{
      id: 'rules', title: 'Choosing a fix', live: true,
      intro: 'The corner radius can never be smaller than the cutter radius. Pick the fix that suits the part.',
      html: p => `<div class="tablewrap"><table class="btable"><thead><tr><th>Fix</th><th>How</th><th>Good for</th></tr></thead><tbody>
        <tr><td>Round the part</td><td>Give the part corners a radius a little bigger than ${(p.d / 2).toFixed(1)} mm</td><td>Anything that can have round corners</td></tr>
        <tr><td>Dog-bone</td><td>Cut a circle of Ø ${p.d} mm into each corner, along the diagonal</td><td>Square parts that must fit snugly</td></tr>
        <tr><td>Smaller cutter</td><td>Finish the corners with a thinner tool</td><td>Fine detail, costs more time</td></tr></tbody></table></div>
        <ul class="rules"><li><b>Use the biggest cutter you can.</b> It is stiffer, faster and leaves a clean wall.</li>
        <li><b>Dog-bones are ugly but honest.</b> They show on the face of the part, so put them where they will be hidden, or use them on parts where the edge does not matter.</li>
        <li><b>Laser cutters</b> leave only a tiny radius, but the same idea of a relief hole at a tight corner helps stop burning and cracking.</li></ul>`
    }]
  });
})();
