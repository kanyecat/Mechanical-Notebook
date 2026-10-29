(function () {
  const { TAU, COL } = MM;
  const fitOf = c => c < -0.02 ? ['PRESS', 'tight: tap it together, may crack acrylic'] : c < 0.06 ? ['SNUG', 'goes together by hand with a little friction'] : c < 0.25 ? ['SLIP', 'slides in freely; glue it or it may rattle'] : ['LOOSE', 'wobbles: make the slot narrower'];
  MM.register({
    slug: 'cross-halving', hands: false, view: { w: 700, h: 430 }, thumb: 0.5,
    params: [
      { key: 't', label: 'Sheet thickness', unit: ' mm', min: 3, max: 18, step: 1, value: 6 },
      { key: 'c', label: 'Slot wider than the sheet by', unit: ' mm', min: -0.2, max: 0.4, step: 0.02, value: 0.06 }
    ],
    draw(g, a, p) {
      const H = 200, top = 170, cx = 250, k = 4, X = 25, w = p.t * k, gap = p.c * k * X / 2, u = MM.cycle(a, 0.15);
      // part A: a long strip with a slot down from the top, half its height (the slot is drawn wider by the fit, magnified)
      const sw = w / 2 + Math.max(gap, 0);
      g.poly([[60, top], [cx - sw, top], [cx - sw, top + H / 2], [cx + sw, top + H / 2], [cx + sw, top], [440, top], [440, top + H], [60, top + H]], { fill: COL.white, hatch: { spacing: 6 } });
      // part B, seen edge on: its slot comes up from the bottom (hidden lines), it drops into A's slot
      const y = top - (1 - u) * (H / 2 + 60), bw = w / 2;
      g.rect(cx - bw, y, 2 * bw, H, { fill: MM.tint('red', .45), hatch: false });
      g.line(cx - bw, y + H / 2, cx + bw, y + H / 2, { w: 1, dash: [4, 3], color: COL.faint });
      if (p.c < 0 && u > 0.6) { g.rect(cx - w / 2, top, Math.abs(gap), H / 2 * Math.min(1, (u - 0.6) / 0.3) + 0.01, { fill: MM.tint('red', .8), hatch: false, color: 'transparent' }); g.rect(cx + w / 2 - Math.abs(gap), top, Math.abs(gap), H / 2 * Math.min(1, (u - 0.6) / 0.3) + 0.01, { fill: MM.tint('red', .8), hatch: false, color: 'transparent' }); }
      g.text('part A (slot from the top)', 70, top + H + 26, { size: 11, color: COL.faint });
      g.text('part B (slot from the bottom), seen edge on', cx, 30, { size: 11, align: 'center', color: COL.faint });
      g.text('gap drawn ×' + X, cx, top + H + 50, { size: 10, align: 'center', color: COL.faint });
      const f = fitOf(p.c); g.text(f[0], 570, 170, { size: 22, weight: 800, align: 'center', color: COL.red });
      g.text((p.c >= 0 ? '+' : '') + MM.num(p.c, 2) + ' mm on the slot', 570, 200, { size: 12, align: 'center' });
      g.text('slot ' + MM.num(p.t + p.c, 2) + ' wide, ' + MM.num(H / 2 / k + 0.2, 1) + ' deep', 570, 222, { size: 12, align: 'center' });
    },
    readout(a, p) { const f = fitOf(p.c); return { big: f[0], small: 'slot ' + MM.num(p.t + p.c, 2) + ' mm for ' + p.t + ' mm sheet: ' + f[1] }; },
    panels: [{
      id: 'rules', title: 'Getting the slots right',
      html: () => `<ul class="rules"><li><b>Measure the sheet.</b> "6 mm" plywood is often 5.6 to 6.4 mm, and it varies across one sheet. Design from a measurement, not the label.</li>
        <li><b>Laser:</b> the kerf (F-08) makes slots wider than drawn, so draw the slot narrower by about the kerf for a snug fit. Cut a test comb of slots 0.05 mm apart and pick the best one.</li>
        <li><b>Router:</b> the round cutter leaves round inside corners at the bottom of the slot, so add dog-bones (F-10) or the parts will not seat fully.</li>
        <li><b>Depth:</b> make each slot half the height plus 0.2 to 0.5 mm so both parts sit flush and do not bottom out.</li>
        <li><b>Lead-in:</b> a small chamfer or flare at the mouth of each slot makes long grids much easier to assemble.</li>
        <li><b>Big grids:</b> leave the slots a touch looser than for one joint, because small errors add up across many joints.</li></ul>`
    }]
  });
})();
