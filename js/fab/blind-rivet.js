(function () {
  const { TAU, COL } = MM;
  const SIZES = [[2.4, 2.5, '3/32"'], [3.2, 3.3, '1/8"'], [4, 4.1, '5/32"'], [4.8, 4.9, '3/16"']];   // [rivet Ø, drill, inch size]
  MM.register({
    slug: 'blind-rivet', hands: false, view: { w: 700, h: 430 }, thumb: 0.6,
    params: [
      { key: 'd', label: 'Rivet size', min: 0, max: 3, step: 1, value: 1, options: SIZES.map((s, i) => [i, s[0] + ' mm']) },
      { key: 't', label: 'Total sheet thickness', unit: ' mm', min: 1, max: 8, step: 0.5, value: 3 }
    ],
    draw(g, a, p) {
      const S = SIZES[p.d], D = S[0], k = Math.min(22, 210 / (p.t + 1.6 * D)), cx = 260, top = 160, T = p.t * k, half = T / 2, u = ((a / TAU) % 1 + 1) % 1;
      const ins = Math.min(1, u / 0.25), pull = u < 0.3 ? 0 : Math.min(1, (u - 0.3) / 0.45), snap = u > 0.8;
      const r = D / 2 * k, hole = S[1] / 2 * k, L = T + 1.6 * D * k, drop = (1 - ins) * 160;
      // two sheets, sectioned, with the hole
      g.rect(60, top, cx - hole - 60, half); g.rect(cx + hole, top, 360 - hole, half);
      g.rect(60, top + half, cx - hole - 60, half, { sp: 5 }); g.rect(cx + hole, top + half, 360 - hole, half, { sp: 5 });
      // rivet body: head on top, tube through the hole, tail bulging as it is pulled
      const y0 = top - drop, tailLen = (L - T) * (1 - 0.55 * pull), bulge = r + pull * r * 0.95, yB = y0 + T;
      g.poly([[cx - r * 2, y0 - r * 0.8], [cx + r * 2, y0 - r * 0.8], [cx + r * 2, y0], [cx - r * 2, y0]], { fill: MM.tint('red', .45) });
      g.rect(cx - r, y0, 2 * r, T, { fill: MM.tint('red', .45), hatch: false });
      g.poly([[cx - r, yB], [cx + r, yB], [cx + bulge, yB + tailLen * 0.4], [cx + r * (1 + 0.3 * pull), yB + tailLen], [cx - r * (1 + 0.3 * pull), yB + tailLen], [cx - bulge, yB + tailLen * 0.4]], { fill: MM.tint('red', .45) });
      // mandrel: a thin pin with a ball, pulled up by the tool, then snapped off
      const mr = r * 0.42, up = pull * (L - T) * 0.55, ball = yB + tailLen;
      if (!snap) { g.rect(cx - mr, y0 - 150 - up, 2 * mr, ball - (y0 - 150 - up), { fill: COL.white, hatch: false }); g.circle(cx, ball, mr * 1.5, { fill: COL.white }); }
      else { g.rect(cx - mr, y0 - 4, 2 * mr, ball - y0 + 4, { fill: COL.white, hatch: false }); g.circle(cx, ball, mr * 1.5, { fill: COL.white }); g.rect(cx - mr, y0 - 190, 2 * mr, 110, { fill: MM.tint('white', .5), hatch: false, dash: [4, 3] }); }
      if (ins >= 1 && !snap) { g.rect(cx - 60, y0 - 150 - up - 60, 120, 60, { fill: MM.tint('white', .7), hatch: false }); g.text('rivet tool', cx + 72, y0 - 150 - up - 30, { size: 11, color: COL.faint }); }
      g.text(['1 push it through', '2 pull the mandrel: the tail bulges', '3 the mandrel snaps off'][snap ? 2 : pull > 0 ? 1 : 0], 560, 60, { size: 13, weight: 700, align: 'center' });
      g.dim(cx + hole + 30, top, cx + hole + 30, top + T, 'grip ' + p.t + ' mm', 0, { tx: 42, ty: 0 });
      g.text('drill Ø ' + S[1] + ' mm', 560, 300, { size: 14, weight: 700, color: COL.red, align: 'center' });
      g.text('edge ≥ ' + MM.num(2 * D, 1) + ' mm · pitch ' + MM.num(3 * D, 1) + '–' + MM.num(4 * D, 1) + ' mm', 560, 326, { size: 12, align: 'center' });
    },
    readout(a, p) { const S = SIZES[p.d]; return { big: 'Ø ' + S[1] + ' mm', small: 'drill for a ' + S[0] + ' mm (' + S[2] + ') rivet; pick a length whose grip range covers ' + p.t + ' mm' }; },
    panels: [{
      id: 'sizes', title: 'Sizes and spacing', live: true,
      intro: 'Grip ranges vary by maker and rivet type, so take the length from the maker\'s chart for your total thickness. The spacing rules below are common starting points.',
      html: p => `<div class="tablewrap"><table class="btable"><thead><tr><th>Rivet</th><th>Drill</th><th>Smallest edge distance (2 × D)</th><th>Spacing between rivets (3–4 × D)</th></tr></thead><tbody>${SIZES.map((s, i) => `<tr${i === +p.d ? ' style="font-weight:700"' : ''}><td>${s[0]} mm (${s[2]})</td><td>${s[1]} mm</td><td>${MM.num(2 * s[0], 1)} mm</td><td>${MM.num(3 * s[0], 1)}–${MM.num(4 * s[0], 1)} mm</td></tr>`).join('')}</tbody></table></div>
        <ul class="rules"><li><b>Materials:</b> aluminium rivets for aluminium and light jobs; steel or stainless for strength. Avoid aluminium rivets in steel or stainless outdoors: the two metals corrode each other.</li>
        <li><b>Soft or brittle parts</b> (plastic, wood, thin sheet): use a backing washer on the tail side, or large-flange or multi-grip rivets that spread the load.</li>
        <li><b>Sealed (closed-end) rivets</b> keep water out where the joint must be watertight.</li>
        <li><b>Rivet nuts</b> (rivnuts) are set the same way but leave a thread, for when you need to bolt something on later.</li>
        <li><b>Drilling out:</b> drill through the head with the rivet-size drill and the rest falls out.</li></ul>`
    }]
  });
})();
