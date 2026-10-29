(function () {
  const { TAU, COL } = MM, CY = 225, X0 = 200, R = 95, RP = 125, D2R = Math.PI / 180;
  const px = (ph, th, al) => X0 - R * Math.tan(al) * Math.cos(ph - th);   // where the plate meets the piston at angle ph round the shaft
  MM.register({
    slug: 'wobble-plate', three: true, hands: false, view: { w: 700, h: 450 }, thumb: 0.15,
    params: [{ key: 'al', label: 'Hub tilt α', unit: '°', min: 4, max: 20, step: 1, value: 14 },
      { key: 'mode', label: 'The plate', min: 0, max: 1, step: 1, value: 0, options: [[0, 'Wobbles, held from turning'], [1, 'Turns with the shaft (swashplate)']] }],
    draw(g, a, p) {
      const al = p.al * D2R, th = a, n = 5, wob = !p.mode;
      // shaft and the tilted hub (a Z-crank)
      g.rect(30, CY - 9, 140, 18, { fill: COL.white, hatch: false }); g.line(20, CY, 540, CY, { w: 0.8, dash: [10, 3, 2, 3], color: COL.faint });
      g.text('shaft', 40, CY - 20, { size: 11, color: COL.faint }); g.curvedArrow(70, CY, 22, -2.5, -0.6, {});
      // the plate's rim and a painted mark on it
      const nrm = [Math.cos(al), Math.sin(al) * Math.cos(th), Math.sin(al) * Math.sin(th)], u1 = [-Math.sin(al), Math.cos(al) * Math.cos(th), Math.cos(al) * Math.sin(th)], u2 = [0, -Math.sin(th), Math.cos(th)];
      const P3 = t => [X0 + RP * (Math.cos(t) * u1[0] + Math.sin(t) * u2[0]), RP * (Math.cos(t) * u1[1] + Math.sin(t) * u2[1]), RP * (Math.cos(t) * u1[2] + Math.sin(t) * u2[2])];
      const rim = []; for (let k = 0; k <= 48; k++) { const q = P3(k / 48 * TAU); rim.push([q[0], CY - q[1]]); }
      const draw = front => { for (let i = 0; i < n; i++) { const ph = i * TAU / n; if ((Math.sin(ph) >= 0) !== front) continue; const y = CY - R * Math.cos(ph), x = px(ph, th, al);
        if (wob) { g.line(x + 3, y, x + 70, y, { w: 4, color: front ? COL.ink : COL.faint }); g.circle(x + 3, y, 5, { fill: COL.white, color: front ? COL.ink : COL.faint }); }
        else g.rect(x + 2, y - 9, 16, 18, { fill: front ? MM.tint('red', .4) : MM.tint('red', .15), hatch: false, color: front ? COL.ink : COL.faint });
        g.rect(x + (wob ? 70 : 18), y - 11, 120, 22, { fill: front ? COL.white : MM.tint('white', .4), hatch: false, dash: front ? null : [4, 3], color: front ? COL.ink : COL.faint }); } };
      draw(false);
      g.poly(rim, { fill: MM.tint(wob ? 'blue' : 'red', .3) }); g.poly(rim.map(q => [q[0] - 10 * nrm[0], q[1]]), { fill: MM.tint(wob ? 'blue' : 'red', .18), color: COL.faint, w: 1 });
      // the mark: on a wobble plate it stays at the top; on a swashplate it goes round with the shaft
      const tm = wob ? -th : 0, m = P3(tm); g.dot(m[0], CY - m[1], 7, m[2] >= 0 ? COL.red : MM.tint('red', .5));
      // anti-rotation guide: a pin on the plate runs in a fixed slot
      if (wob) { const tp = P3(-th); g.rect(tp[0] - 14, 40, 28, 34, { fill: COL.white, sp: 6 }); g.line(tp[0], CY - tp[1], tp[0], 74, { w: 3 }); g.text('guide slot (stops the plate turning)', tp[0] + 22, 52, { size: 10.5, color: COL.faint }); }
      draw(true);
      g.rect(380, CY - R - 30, 130, 2 * R + 60, { fill: MM.tint('white', .5), sp: 7 }); g.text('cylinders (fixed)', 445, CY + R + 50, { size: 11, align: 'center', color: COL.faint });
      g.text(wob ? 'wobble plate: rods with ball joints' : 'swashplate: shoes slide on the plate', X0, CY + RP + 44, { size: 11.5, weight: 700, align: 'center' });
      // end view of the plate face, with the mark
      const E = [620, 150], rr = 52; g.circle(E[0], E[1], rr, { fill: MM.tint(wob ? 'blue' : 'red', .25) });
      const hi = th; g.line(E[0], E[1], E[0] + rr * Math.sin(hi), E[1] - rr * Math.cos(hi), { w: 1.2, dash: [4, 3], color: COL.faint });
      const mk = wob ? 0 : th; g.dot(E[0] + (rr - 10) * Math.sin(mk), E[1] - (rr - 10) * Math.cos(mk), 6, COL.red);
      g.text('plate face', E[0], E[1] - rr - 14, { size: 11.5, weight: 700, align: 'center' });
      g.text(wob ? 'mark stays put;' : 'mark goes round;', E[0], E[1] + rr + 22, { size: 10.5, align: 'center', color: COL.faint }); g.text('dashed line = high point', E[0], E[1] + rr + 38, { size: 10.5, align: 'center', color: COL.faint });
      g.text('stroke ' + (2 * R * Math.tan(al) / 3).toFixed(1) + ' mm', 300, 30, { size: 13, weight: 700, align: 'center' });
    },
    graph: {
      title: 'Piston positions (mm)', min: -12, max: 12, ticks: [{ v: -10, label: '−10' }, { v: 0, label: '0' }, { v: 10, label: '10' }],
      series: [0, 1, 2].map(i => ({ name: 'piston ' + (i + 1), color: [COL.red, COL.blue, COL.ink][i], dash: i === 2 ? [4, 3] : null, f: (t, p) => (px(i * TAU / 5, t, p.al * D2R) - X0) / 3 })),
      readout(a, p) { return { big: (2 * R * Math.tan(p.al * D2R) / 3).toFixed(1) + ' mm', small: 'stroke = 2 × R × tan α. The same for both kinds: only what happens at the plate face differs' }; }
    }
  });
})();
