(function () {
  const { TAU, COL } = MM;
  const FITS = [[-0.02, 'TOO TIGHT', 'will not go in without force'], [0.04, 'PRESS FIT', 'needs a push, may hold on its own'], [0.12, 'SNUG', 'goes in by hand, hardly any play'], [0.25, 'LOOSE', 'rattles slightly, glue or a pin needed'], [9, 'SLOPPY', 'too loose to hold']];
  const fitOf = gap => FITS.find(f => gap < f[0]);
  const gapOf = p => p.slot + p.kerf;   // how much wider the cut slot is than the sheet
  MM.register({
    slug: 'tab-and-slot', view: { w: 700, h: 440 }, thumb: 0.3,
    params: [
      { key: 't', label: 'Sheet thickness', unit: ' mm', min: 3, max: 10, step: 0.5, value: 6 },
      { key: 'kerf', label: 'Laser kerf', unit: ' mm', min: 0, max: 0.4, step: 0.05, value: 0.2 },
      { key: 'slot', label: 'Slot drawn vs sheet', unit: ' mm', min: -0.4, max: 0.4, step: 0.05, value: -0.15 }
    ],
    draw(g, a, p) {
      const u = MM.cycle(a), s = 8.5, tp = p.t * s, cx = 270, y0 = 300, gap = gapOf(p), gp = Math.max(-1.5, gap * s) , fit = fitOf(gap);
      const half = tp / 2 + gp / 2, x1 = cx - half, x2 = cx + half;        // the slot edges as cut
            // base sheet, with the slot cut through it
      g.rect(50, y0, x1 - 50, tp); g.rect(x2, y0, 490 - x2, tp);
      // upright sheet with its tab, coming down into the slot
      const top = y0 - 160 - 120 * (1 - u), px = cx - tp / 2;
      g.rect(px, top, tp, 160 + tp, { fill: MM.tint('white', 0.96) });
      g.line(px, y0, px + tp, y0, { w: 0.9, dash: [3, 3], color: COL.faint });
      g.text('tab', cx + tp / 2 + 10, y0 + tp / 2, { size: 11, color: COL.faint });
      g.text('upright sheet', px + tp + 14, top + 20, { size: 11, color: COL.faint });
      g.text('base sheet', 70, y0 + tp + 36, { size: 11, color: COL.faint });
      g.dim(30, y0, 30, y0 + tp, '', 0); g.text('t = ' + p.t + ' mm', 40, y0 - 14, { size: 11, color: COL.blue, weight: 600 });
      // magnified look at one side of the slot
      const zx = 540, zy = 190, zw = 140, zh = 130, k = 12, gz = Math.max(-18, Math.min(50, gap * s * k));
      g.rect(zx, zy, zw, zh, { fill: COL.paper, hatch: false, color: COL.faint, w: 1 });
      g.c.save(); g.c.beginPath(); g.c.rect(zx, zy, zw, zh); g.c.clip();
      g.rect(zx - 4, zy + 30, 60, 70, {});                                   // wall of the base sheet
      g.rect(zx + 56 + gz, zy - 4, 90, zh + 8, { fill: MM.tint('white', 0.96) }); // wall of the tab
      if (gz < 0) g.rect(zx + 56 + gz, zy + 30, -gz, 70, { fill: MM.tint('red', 0.55), hatch: false, color: COL.red });
      g.c.restore();
      g.text('SLOT WALL ×12', zx + zw / 2, zy - 12, { size: 10, align: 'center', color: COL.faint });
      g.text('base', zx + 22, zy + 66, { size: 10, align: 'center', color: COL.faint }); g.text('tab', zx + 110, zy + 66, { size: 10, align: 'center', color: COL.faint });
      g.dim(zx + 56, zy + zh + 16, zx + 56 + gz, zy + zh + 16, Math.abs(gap).toFixed(2) + ' mm' + (gap < 0 ? ' squeeze' : ' gap'), 0, { ty: 14, color: gap < 0 ? COL.red : COL.blue });
      // what was drawn and what was cut
      g.text('drawn slot  ' + (p.t + p.slot).toFixed(2) + ' mm', 50, 392, { size: 12 });
      g.text('cut slot    ' + (p.t + gap).toFixed(2) + ' mm   (drawn + kerf)', 50, 412, { size: 12, color: COL.red, weight: 700 });
    },
    readout(a, p) { const g = gapOf(p), f = fitOf(g); return { big: f[1], small: 'gap ' + g.toFixed(2) + ' mm: ' + f[2] }; },
    panels: [{
      id: 'sizing', title: 'What to draw', live: true,
      intro: 'To get the fit you want, draw the slot at the sheet thickness minus the kerf, plus a little extra for looser fits. These are starting points. Cut a test strip with your own sheet and machine, and adjust.',
      html: p => { const r = (x) => (p.t - p.kerf + x).toFixed(2);
        return `<div class="tablewrap"><table class="btable"><thead><tr><th>Fit you want</th><th>Draw the slot at</th><th>You get a gap of</th></tr></thead><tbody>
        <tr><td>Press fit (holds on its own)</td><td><b>${r(0)} mm</b></td><td>about 0.00 mm</td></tr>
        <tr><td>Snug (goes in by hand)</td><td><b>${r(0.07)} mm</b></td><td>about 0.07 mm</td></tr>
        <tr><td>Sliding (needs glue or a pin)</td><td><b>${r(0.15)} mm</b></td><td>about 0.15 mm</td></tr></tbody></table></div>
        <ul class="rules"><li><b>Tab length:</b> at least as long as the sheet it passes through is thick, so it comes out the other side.</li>
        <li><b>Tab width:</b> wider is stronger. Under about three sheet thicknesses it tends to snap.</li>
        <li><b>Corners:</b> add a small round (about 0.5 mm) at the inside corners of slots. It reduces cracking and helps the tab go in.</li>
        <li><b>Edges:</b> keep slots at least one sheet thickness away from an edge, or the thin strip between them breaks.</li></ul>`; }
    }]
  });
})();
