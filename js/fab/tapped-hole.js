(function () {
  const { TAU, COL } = MM;
  // ISO metric coarse: [size, pitch, tap drill, close clearance, normal clearance]
  const MET = [['M2', 0.4, 1.6, 2.2, 2.4], ['M2.5', 0.45, 2.05, 2.7, 2.9], ['M3', 0.5, 2.5, 3.2, 3.4], ['M4', 0.7, 3.3, 4.3, 4.5], ['M5', 0.8, 4.2, 5.3, 5.5], ['M6', 1, 5, 6.4, 6.6], ['M8', 1.25, 6.8, 8.4, 9], ['M10', 1.5, 8.5, 10.5, 11], ['M12', 1.75, 10.2, 13, 13.5]];
  // Unified inch: [size, tap drill, drill in inches, close clearance drill]
  const UNC = [['#4-40', '#43', 0.089, '#32'], ['#6-32', '#36', 0.1065, '#27'], ['#8-32', '#29', 0.136, '#18'], ['#10-24', '#25', 0.1495, '#9'], ['#10-32', '#21', 0.159, '#9'], ['1/4-20', '#7', 0.201, 'F'], ['1/4-28', '#3', 0.213, 'F'], ['5/16-18', 'F', 0.257, 'P'], ['3/8-16', '5/16"', 0.3125, 'W'], ['1/2-13', '27/64"', 0.4219, '33/64"']];
  const MAT = [['Steel', 1, 1], ['Aluminium', 1.5, 2], ['Plastic', 2, 2.5]];
  const dia = s => +MET[s][0].slice(1);
  MM.register({
    slug: 'tapped-hole', hands: false, view: { w: 700, h: 440 }, thumb: 0.55,
    params: [
      { key: 's', label: 'Screw size', min: 0, max: 8, step: 1, value: 5, options: MET.map((m, i) => [i, m[0]]) },
      { key: 'm', label: 'Material', min: 0, max: 2, step: 1, value: 1, options: MAT.map((m, i) => [i, m[0]]) }
    ],
    draw(g, a, p) {
      const M = MET[p.s], D = dia(p.s), P = M[1], td = M[2], mat = MAT[p.m], eng = mat[2] * D, depth = eng + 4 * P, k = 80 / D, cx = 230, top = 90;
      const u = ((a / TAU) % 1 + 1) % 1, ph = u < 0.3 ? 0 : u < 0.62 ? 1 : 2, f = ph === 0 ? u / 0.3 : ph === 1 ? (u - 0.3) / 0.32 : Math.min(1, (u - 0.62) / 0.28);
      const hw = td * k / 2, hd = depth * k, tip = hw * 0.6;
      // block, sectioned
      g.rect(60, top, 340, hd + tip + 40);
      const drilled = ph === 0 ? f : 1, dd = drilled * hd;
      if (dd > 0) g.poly([[cx - hw, top], [cx + hw, top], [cx + hw, top + dd], [cx, top + dd + tip * (drilled > 0.05 ? 1 : 0)], [cx - hw, top + dd]], { fill: COL.paper });
      // thread on the walls, cut as the tap goes down
      const cut = ph === 0 ? 0 : ph === 1 ? f * eng * k : eng * k, pk = P * k, td2 = (D - td) / 2 * k;
      if (cut > 0) [-1, 1].forEach(sd => { const pts = []; for (let y = 0; y <= cut; y += pk / 2) { const o = (Math.round(y / (pk / 2)) % 2) ? td2 : 0; pts.push([cx + sd * (hw + o), top + y]); } g.trace(pts, { color: COL.ink, w: 1.4 }); });
      // tool: drill, then tap, then the screw
      if (ph === 0) { const y = top - 140 + (dd + 140); g.rect(cx - hw, y - 220, 2 * hw, 220, { fill: MM.tint('white', .9), hatch: false }); g.poly([[cx - hw, y], [cx + hw, y], [cx, y + tip]], { fill: MM.tint('white', .9) }); g.text('tap drill Ø ' + td + ' mm', cx + hw + 16, top - 30, { size: 12, weight: 700, color: COL.red }); }
      if (ph === 1) { const y = top + f * eng * k, tw = D * k / 2; g.rect(cx - tw * 0.8, y - 230, 1.6 * tw, 230, { fill: MM.tint('white', .9), hatch: false }); for (let yy = y - 220; yy < y; yy += pk) g.line(cx - tw, yy, cx + tw, yy + pk / 2, { w: 1, color: COL.faint }); g.text('tap ' + M[0] + ' × ' + P, cx + tw + 16, top - 30, { size: 12, weight: 700, color: COL.red }); }
      if (ph === 2) { const y = top + f * (eng * k - 8) - 4, tw = D * k / 2; g.rect(cx - tw, y - 120, 2 * tw, 120, { fill: MM.tint('red', .45), hatch: false }); g.rect(cx - tw * 1.6, y - 170, 3.2 * tw, 50, { fill: MM.tint('red', .45), hatch: false }); g.text('screw ' + M[0], cx + tw * 1.6 + 14, y - 145, { size: 12, weight: 700, color: COL.red }); }
      // dimensions
      g.dim(cx + hw + 50, top, cx + hw + 50, top + eng * k, 'thread ' + MM.num(eng, 1) + ' mm', 0, { tx: 58, ty: 0 });
      g.dim(cx - hw - 40, top, cx - hw - 40, top + hd, 'drill ' + MM.num(depth, 1) + ' mm deep', 0, { tx: -70, ty: 0 });
      g.text(mat[0].toUpperCase(), 560, 110, { size: 18, weight: 800, color: COL.red, align: 'center' });
      g.text('thread length ' + mat[1] + '–' + mat[2] + ' × D', 560, 140, { size: 12, align: 'center' });
      g.text(['1 drill', '2 tap', '3 screw'][ph], 560, 190, { size: 14, weight: 700, align: 'center' });
      g.text('blind hole: drill about 4 pitches', 560, 240, { size: 11, align: 'center', color: COL.faint });
      g.text('deeper than the thread you need', 560, 256, { size: 11, align: 'center', color: COL.faint });
    },
    readout(a, p) { const M = MET[p.s], mat = MAT[p.m], D = dia(p.s); return { big: 'Ø ' + M[2] + ' mm', small: 'tap drill for ' + M[0] + ' × ' + M[1] + '; in ' + mat[0].toLowerCase() + ' use ' + MM.num(mat[1] * D, 1) + ' to ' + MM.num(mat[2] * D, 1) + ' mm of thread' }; },
    panels: [{
      id: 'metric', title: 'Metric coarse threads', live: true,
      intro: 'Tap drills give about 75 % thread. Clearance holes are for the screw to pass through the other part (ISO 273). Thread lengths are rules of thumb for the screw to break before the thread strips.',
      html: p => `<div class="tablewrap"><table class="btable"><thead><tr><th>Size</th><th>Pitch</th><th>Tap drill</th><th>Clearance, close</th><th>Clearance, normal</th><th>Thread in steel</th><th>in aluminium</th><th>in plastic</th></tr></thead><tbody>${MET.map((m, i) => { const D = +m[0].slice(1); return `<tr${i === +p.s ? ' style="font-weight:700"' : ''}><td>${m[0]}</td><td>${m[1]}</td><td>${m[2]}</td><td>${m[3]}</td><td>${m[4]}</td><td>${MM.num(D, 1)}</td><td>${MM.num(1.5 * D, 1)}–${MM.num(2 * D, 1)}</td><td>${MM.num(2 * D, 1)}–${MM.num(2.5 * D, 1)}</td></tr>`; }).join('')}</tbody></table></div>`
    }, {
      id: 'inch', title: 'Unified inch threads (UNC and UNF)',
      intro: 'Tap drills for about 75 % thread, with number and letter drill sizes as they are sold.',
      html: () => `<div class="tablewrap"><table class="btable"><thead><tr><th>Size</th><th>Tap drill</th><th>Tap drill (inch / mm)</th><th>Close clearance drill</th></tr></thead><tbody>${UNC.map(u => `<tr><td>${u[0]}</td><td>${u[1]}</td><td>${u[2].toFixed(4)}" / ${(u[2] * 25.4).toFixed(2)} mm</td><td>${u[3]}</td></tr>`).join('')}</tbody></table></div>`
    }, {
      id: 'rules', title: 'Rules of thumb',
      html: () => `<ul class="rules"><li><b>Through holes are easier.</b> Chips fall out and the tap can cut full thread all the way. Use a spiral-point (gun) tap, which pushes chips ahead of it.</li>
        <li><b>Blind holes:</b> use a spiral-flute tap, which pulls chips up and out, or a bottoming tap after a plug tap to cut thread close to the bottom.</li>
        <li><b>Cutting fluid</b> makes a big difference in steel and stainless. Aluminium likes a little oil or WD-40 so chips do not weld to the tap.</li>
        <li><b>Keep the tap square.</b> Start it in the drill press or mill (spindle off, turned by hand) or use a tapping guide. Most broken taps are crooked taps.</li>
        <li><b>Chamfer the hole</b> slightly so the first thread does not raise a burr and the screw starts easily.</li>
        <li><b>Thread-forming taps</b> push the metal instead of cutting it, make no chips and make stronger threads in aluminium, but need a slightly bigger drill. Check the maker's chart.</li>
        <li><b>3D prints:</b> for a few uses, model the hole at the tap drill size and tap it, or let a thread-forming screw cut its own thread. For many uses, use a heat-set insert (F-04).</li></ul>`
    }]
  });
})();
