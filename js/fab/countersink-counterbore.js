(function () {
  const { TAU, COL } = MM;
  // [size, d, countersunk head Ø (ISO 10642), clearance hole, cap screw head Ø (ISO 4762), head height, counterbore Ø, counterbore depth]
  const S = [['M3', 3, 6.72, 3.4, 5.5, 3, 6.5, 3.4], ['M4', 4, 8.96, 4.5, 7, 4, 8, 4.4], ['M5', 5, 11.2, 5.5, 8.5, 5, 10, 5.4], ['M6', 6, 13.44, 6.6, 10, 6, 11, 6.4], ['M8', 8, 17.92, 9, 13, 8, 15, 8.6], ['M10', 10, 22.4, 11, 16, 10, 18, 10.6]];
  MM.register({
    slug: 'countersink-counterbore', hands: false, view: { w: 700, h: 430 }, thumb: 0.45,
    params: [
      { key: 's', label: 'Screw size', min: 0, max: 5, step: 1, value: 3, options: S.map((x, i) => [i, x[0]]) },
      { key: 'T', label: 'Plate thickness', unit: ' mm', min: 2, max: 16, step: 1, value: 10 }
    ],
    draw(g, a, p) {
      const z = S[p.s], d = z[1], k = Math.min(150 / Math.max(z[2], z[6]), 150 / p.T), top = 175, T = p.T * k, u = MM.cycle(a, 0.18);
      const hk = (z[2] - z[3]) / 2, cskH = Math.min(p.T, (z[2] + 0.4 - z[3]) / 2);
      // plate with two holes: countersunk (left) and counterbored (right)
      const L = 180, R = 500, ch = z[3] / 2 * k, csk = (z[2] + 0.4) / 2 * k, cb = z[6] / 2 * k, cbd = Math.min(z[7], p.T) * k;
      g.rect(40, top, 620, T);
      g.poly([[L - csk, top], [L + csk, top], [L + ch, top + cskH * k], [L + ch, top + T], [L - ch, top + T], [L - ch, top + cskH * k]], { fill: COL.paper });
      g.poly([[R - cb, top], [R + cb, top], [R + cb, top + cbd], [R + ch, top + cbd], [R + ch, top + T], [R - ch, top + T], [R - ch, top + cbd], [R - cb, top + cbd]], { fill: COL.paper });
      // screws coming down
      const drop = (1 - u) * 150, sl = (p.T + 8) * k;
      const hd = z[2] / 2 * k, hy = top - drop, hh = hk * k;
      g.poly([[L - hd, hy], [L + hd, hy], [L + d / 2 * k, hy + hh], [L + d / 2 * k, hy + hh + sl], [L - d / 2 * k, hy + hh + sl], [L - d / 2 * k, hy + hh]], { fill: MM.tint('red', .45) });
      const ch2 = z[4] / 2 * k, hy2 = top + cbd - z[5] * k - drop;
      g.rect(R - ch2, hy2, 2 * ch2, z[5] * k, { fill: MM.tint('red', .45), hatch: false });
      g.rect(R - d / 2 * k, hy2 + z[5] * k, d * k, sl, { fill: MM.tint('red', .45), hatch: false });
      // labels and dimensions
      g.text('countersink 90°', L, 40, { size: 13, weight: 700, align: 'center' }); g.text('counterbore', R, 40, { size: 13, weight: 700, align: 'center' });
      g.dim(L - csk, top + T + 34, L + csk, top + T + 34, 'Ø ' + MM.num(z[2] + 0.4, 1), 0);
      g.dim(R - cb, top + T + 34, R + cb, top + T + 34, 'Ø ' + z[6] + ' × ' + Math.min(z[7], p.T) + ' deep', 0);
      g.text('hole Ø ' + z[3], L, top + T + 70, { size: 11, align: 'center', color: COL.faint }); g.text('hole Ø ' + z[3], R, top + T + 70, { size: 11, align: 'center', color: COL.faint });
      const thin = p.T < hk + 1, shallow = p.T < z[7] + 1;
      if (thin) g.text('plate too thin for a countersunk head', L, 70, { size: 11, align: 'center', color: COL.red, weight: 700 });
      if (shallow) g.text('too thin to sink the cap screw head', R, 70, { size: 11, align: 'center', color: COL.red, weight: 700 });
    },
    readout(a, p) { const z = S[p.s]; return { big: z[0], small: 'countersink Ø ' + MM.num(z[2] + 0.4, 1) + ' × 90°; counterbore Ø ' + z[6] + ' × ' + z[7] + ' deep; clearance hole Ø ' + z[3] + ' mm' }; },
    panels: [{
      id: 'sizes', title: 'Sizes to draw', live: true,
      intro: 'For metric countersunk socket screws (ISO 10642) and socket head cap screws (ISO 4762), with normal clearance holes. Make the countersink a few tenths bigger than the head so it sits just below the surface.',
      html: p => `<div class="tablewrap"><table class="btable"><thead><tr><th>Size</th><th>Clearance hole</th><th>Countersunk head Ø</th><th>Countersink Ø to cut</th><th>Cap head Ø × height</th><th>Counterbore Ø × depth</th></tr></thead><tbody>${S.map((z, i) => `<tr${i === +p.s ? ' style="font-weight:700"' : ''}><td>${z[0]}</td><td>${z[3]}</td><td>${z[2]}</td><td>${MM.num(z[2] + 0.4, 1)}</td><td>${z[4]} × ${z[5]}</td><td>${z[6]} × ${z[7]}</td></tr>`).join('')}</tbody></table></div>`
    }, {
      id: 'rules', title: 'Choosing and cutting',
      html: () => `<ul class="rules"><li><b>Angle:</b> metric countersunk screws are 90°. Most inch flat-head screws are 82°, and some aircraft screws are 100°. Use the matching countersink tool.</li>
        <li><b>Thin sheet:</b> if the sheet is thinner than the countersunk head is tall, the cone goes right through and the head pulls out. Use a counterbore, a low pan or button head, or press a dimple into the sheet instead.</li>
        <li><b>3D prints:</b> print countersinks with the cone facing up so it needs no support, and counterbores facing down only if you can bridge the step. Plastic creeps, so a counterbore with a washer holds tension better.</li>
        <li><b>CNC:</b> a counterbore is a pocket; a chamfer mill or spot drill cuts the countersink. On a manual mill, a piloted counterbore tool keeps it centred on the hole.</li>
        <li><b>Wood:</b> wood screws have their own countersink bits that drill the pilot, shank and cone in one go.</li></ul>`
    }]
  });
})();
