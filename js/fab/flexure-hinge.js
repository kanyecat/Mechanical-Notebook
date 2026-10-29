(function () {
  const { TAU, COL } = MM, D2R = Math.PI / 180;
  // safe strain (%) for many flexes and the strain where it breaks or bends for good (rough figures for printed or sheet material)
  const MAT = [['PLA', 1, 2], ['PETG', 1.5, 3], ['Nylon', 3, 6], ['Polypropylene', 5, 10], ['Acrylic sheet', 0.7, 1.5], ['Spring steel', 0.35, 0.7]];
  MM.register({
    slug: 'flexure-hinge', view: { w: 700, h: 440 }, thumb: 0.25,
    tryit: { pose: 0.25, keys: [{ key: 'ang', label: 'Bend angle', at: p => { const k = Math.min(8, 220 / p.L), L = p.L * k, th = p.ang * D2R, e = [230 + Math.sin(th) / (th / L), 260 - (1 - Math.cos(th)) / (th / L)]; return [e[0] + 170 * Math.cos(th), e[1] - 170 * Math.sin(th)]; } },
        { key: 't', label: 'Thickness', at: MM.slide(100, 350, 100, 425, 't', 0.3, 3) }, { key: 'L', label: 'Length', at: MM.slide(240, 425, 460, 425, 'L', 4, 40) }], valid: p => p.t * p.ang * Math.PI / 180 / (2 * p.L) * 100 <= MAT[p.m][1], why: 'Red: the strain is over the limit for many flexes in this material.', tasks: [
        { text: 'Make it bend 60° and still last for many flexes.', now: p => p.ang + '°, strain ' + (p.t * p.ang * Math.PI / 180 / (2 * p.L) * 100).toFixed(2) + '% of ' + MAT[p.m][1] + '%', ok: p => p.ang >= 60 && p.t * p.ang * Math.PI / 180 / (2 * p.L) * 100 <= MAT[p.m][1] }] },
    params: [
      { key: 't', label: 'Thickness t', unit: ' mm', min: 0.3, max: 3, step: 0.1, value: 0.8 },
      { key: 'L', label: 'Length L', unit: ' mm', min: 4, max: 40, step: 1, value: 15 },
      { key: 'm', label: 'Material', min: 0, max: 5, step: 1, value: 1, options: MAT.map((x, i) => [i, x[0]]) },
      { key: 'ang', label: 'Bend it by', unit: '°', min: 5, max: 90, step: 5, value: 45 }
    ],
    draw(g, a, p) {
      const M = MAT[p.m], th = p.ang * D2R * (Math.sin(a) + 1) / 2, k = Math.min(8, 220 / p.L), L = p.L * k, t = Math.max(2, p.t * k), x0 = 230, y0 = 260;
      const eps = p.t * th / (2 * p.L) * 100, lvl = eps / M[2], col = MM.tint('red', Math.min(0.95, 0.15 + 0.8 * Math.min(1, lvl)));
      // fixed block on the left
      g.rect(60, y0 - 70, x0 - 60, 140);
      // the strip bends into a circular arc of angle th over length L (constant curvature)
      const pts = [], N = 30, top = [], bot = [];
      for (let i = 0; i <= N; i++) { const s = L * i / N, ang = th * i / N, x = th > 1e-6 ? x0 + Math.sin(ang) / (th / L) : x0 + s, y = th > 1e-6 ? y0 - (1 - Math.cos(ang)) / (th / L) : y0; pts.push([x, y]); top.push([x - Math.sin(ang) * t / 2, y - Math.cos(ang) * t / 2]); bot.push([x + Math.sin(ang) * t / 2, y + Math.cos(ang) * t / 2]); }
      g.poly(top.concat(bot.reverse()), { fill: col });
      // the moving block on the right, turned by th
      const e = pts[N], c = Math.cos(th), s = Math.sin(th), B = [[0, -70], [170, -70], [170, 70], [0, 70]].map(([u, v]) => [e[0] + u * c + v * s, e[1] - u * s + v * c]);
      g.poly(B, { fill: COL.white, hatch: { spacing: 6 } });
      g.text('strain ' + MM.num(eps, 2) + ' %', 560, 40, { size: 16, weight: 800, align: 'center', color: lvl > 1 ? COL.red : COL.ink });
      g.text(lvl > 1 ? 'TOO MUCH: it will crack or set' : eps > M[1] ? 'OK a few times, not for many flexes' : 'fine for many flexes', 560, 64, { size: 12, align: 'center', color: lvl > 1 ? COL.red : COL.ink });
      g.text(M[0] + ': safe ' + M[1] + ' %, limit ' + M[2] + ' %', 560, 86, { size: 11, align: 'center', color: COL.faint });
      g.dim(x0, y0 + 110, x0 + L, y0 + 110, 'L = ' + p.L + ' mm', 0);
    },
    readout(a, p) { const M = MAT[p.m], max = 2 * p.L * M[1] / 100 / p.t / D2R; return { big: MM.num(max, 0) + '°', small: 'most it should bend for many flexes in ' + M[0] + ' (strain = t × θ ÷ 2L, kept to ' + M[1] + ' %)' }; },
    panels: [{
      id: 'mat', title: 'How far a flexure can bend', live: true,
      intro: 'Rough strain figures for repeated flexing; real limits depend on the grade, the print settings and how many cycles you need. Print or cut a test piece and flex it.',
      html: p => `<div class="tablewrap"><table class="btable"><thead><tr><th>Material</th><th>Safe strain, many flexes</th><th>Breaks or sets around</th><th>Most bend for t = ${p.t} mm, L = ${p.L} mm</th></tr></thead><tbody>${MAT.map((m, i) => `<tr${i === +p.m ? ' style="font-weight:700"' : ''}><td>${m[0]}</td><td>${m[1]} %</td><td>${m[2]} %</td><td>${MM.num(2 * p.L * m[1] / 100 / p.t / D2R, 0)}°</td></tr>`).join('')}</tbody></table></div>
        <ul class="rules"><li><b>Thin and long</b> bends further: the bend allowed grows with L ÷ t.</li>
        <li><b>Stiffness</b> falls with t³: half the thickness is an eighth of the stiffness. Make the flexure wide (into the page) if it must carry load.</li>
        <li><b>Round the ends</b> where the strip meets the thick parts, or the strain concentrates there and it cracks.</li>
        <li><b>FDM prints:</b> lay the strip flat so it bends across the printed lines, never so the layers peel apart. Polypropylene and nylon are the best printed flexures; PLA gets brittle.</li>
        <li><b>A notch flexure</b> (a thin neck between two holes) bends about one point, more like a real hinge, but it reaches its strain limit much sooner.</li></ul>`
    }]
  });
})();
