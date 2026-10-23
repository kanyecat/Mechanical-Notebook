(function () {
  const { TAU, COL } = MM;
  const MAT = { 0: ['PP (moulded)', 8], 1: ['PETG', 4], 2: ['PLA', 1.5] };   // rough allowable strain for repeated bending, % (starting values)
  // thin strip bent into an arc: strain at the outer face = (t / 2) / (radius at the strip centre)
  const strain = p => { const th = p.ang * Math.PI / 180, len = p.w, rc = len / th; return p.t / 2 / rc * 100; };
  MM.register({
    slug: 'living-hinge', view: { w: 700, h: 440 }, thumb: 0.5,
    params: [
      { key: 't', label: 'Strip thickness', unit: ' mm', min: 0.2, max: 2, step: 0.1, value: 0.4 },
      { key: 'w', label: 'Strip length (across the bend)', unit: ' mm', min: 1, max: 14, step: 0.5, value: 8 },
      { key: 'ang', label: 'Bend angle', unit: ' °', min: 30, max: 180, step: 10, value: 90 },
      { key: 'm', label: 'Material', min: 0, max: 2, step: 1, value: 1, options: [[0, 'PP'], [1, 'PETG'], [2, 'PLA']] }
    ],
    draw(g, a, p) {
      const u = MM.cycle(a), th = p.ang * Math.PI / 180 * u, e = strain(p), lim = MAT[p.m][1], bad = e > lim;
      const px = 330, py = 240, pw = 170, ph = 20, ts = Math.max(5, p.t * 14), sl = Math.max(12, p.w * 9);   // panel width/thickness, strip thickness/length on screen
      // fixed panel on the left
      g.rect(px - pw - sl / 2, py - ph, pw, ph * 2, { fill: bad ? MM.tint('red', 0.15) : MM.tint('white', 0.96) });
      // the strip: a short bar bending through angle th about its midpoint
      const pts = [], N = 12, rc = sl / Math.max(th, 0.001);
      for (let i = 0; i <= N; i++) {
        const t = i / N, a0 = th * t, xo = th < 0.02 ? -sl / 2 + t * sl : rc * Math.sin(a0) - rc * Math.sin(th / 2), yo = th < 0.02 ? 0 : -(rc * (1 - Math.cos(a0)) - rc * (1 - Math.cos(th / 2)));
        pts.push([px + xo, py + yo, a0]);
      }
      const top = pts.map(q => [q[0] + Math.sin(q[2]) * ts / 2, q[1] - Math.cos(q[2]) * ts / 2]), bot = pts.map(q => [q[0] - Math.sin(q[2]) * ts / 2, q[1] + Math.cos(q[2]) * ts / 2]);
      g.poly(top.concat(bot.reverse()), { fill: bad ? MM.tint('red', 0.5) : MM.tint('white', 0.96), hatch: false, color: bad ? COL.red : COL.ink, w: 1.6 });
      // moving panel: attached to the end of the strip, rotated by th
      const end = pts[N], c = g.c; c.save(); c.translate(end[0], end[1]); c.rotate(-th);
      g.rect(0, -ph, pw, ph * 2, { fill: bad ? MM.tint('red', 0.15) : MM.tint('white', 0.96) }); c.restore();
      g.text('rigid panel', px - pw / 2 - sl / 2, py + ph + 22, { size: 11, align: 'center', color: COL.faint });
      g.text('strip', px, py + 56, { size: 11, align: 'center', color: COL.red });
      g.line(px, py + 44, px, py + 14, { w: 1, color: COL.red });
      g.text('strip ' + p.t + ' mm thick, ' + p.w + ' mm long', 70, 40, { size: 12 });
      const mx = 70, my = 360, mw = 440, max = Math.max(10, lim * 1.6), vx = Math.min(1, e / max) * mw;
      g.rect(mx, my, mw, 12, { fill: COL.paper, hatch: false, color: COL.faint, w: 1 });
      g.rect(mx, my, lim / max * mw, 12, { fill: MM.tint('blue', 0.45), hatch: false, color: 'transparent' });
      g.line(mx + lim / max * mw, my - 6, mx + lim / max * mw, my + 18, { w: 2, color: COL.blue });
      g.line(mx + vx, my - 6, mx + vx, my + 18, { w: 2.6, color: COL.red });
      g.text('STRAIN IN THE STRIP   ' + e.toFixed(1) + '%   (starting limit ' + lim + '%)', mx, my - 18, { size: 11, weight: 700, color: bad ? COL.red : COL.ink });
      g.text(bad ? 'TOO MUCH: expect it to crack or whiten' : 'OK for repeated bending', mx, my + 40, { size: 12, weight: 700, color: bad ? COL.red : COL.blue });
    },
    readout(a, p) { const e = strain(p), lim = MAT[p.m][1]; return { big: e.toFixed(1) + '%', small: 'strain on the outside of the strip. ' + (e > lim ? 'Over the ' + lim + '% starting limit for ' + MAT[p.m][0] + ': make the strip thinner, longer, or the bend smaller.' : 'Under the ' + lim + '% starting limit for ' + MAT[p.m][0] + '.') }; },
    panels: [{
      id: 'how', title: 'How the strain is worked out', live: true,
      intro: 'A thin strip bent through an angle follows an arc. Its outer face stretches by about half the thickness divided by the radius of that arc, and the radius is the strip length divided by the bend angle in radians.',
      html: p => { const e = strain(p), r = p.w / (p.ang * Math.PI / 180); return `<div class="tablewrap"><table class="btable"><thead><tr><th>Thing</th><th>Value</th></tr></thead><tbody>
        <tr><td>Bend radius = length ÷ angle</td><td>${r.toFixed(2)} mm</td></tr>
        <tr><td>Strain ε = (thickness ÷ 2) ÷ radius</td><td><b>${e.toFixed(2)}%</b></td></tr>
        <tr><td>Starting limit, ${MAT[p.m][0]}</td><td>${MAT[p.m][1]}%</td></tr></tbody></table></div>
        <ul class="rules"><li><b>Moulded polypropylene</b> is the material this is famous for, because it can fold many thousands of times. A printed hinge is much less durable, so treat it as a few bends only.</li>
        <li><b>3D printing:</b> print the strip with the layers running along the hinge line, never across it.</li>
        <li><b>Smooth transitions</b> from the strip into the panels stop cracks starting at a sharp corner.</li>
        <li><b>Limits are starting points.</b> Test a few printed hinges by bending them until they fail.</li></ul>`; }
    }]
  });
})();
