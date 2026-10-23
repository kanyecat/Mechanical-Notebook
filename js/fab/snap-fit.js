(function () {
  const { TAU, COL } = MM;
  const MAT = { 0: ['PLA', 4], 1: ['PETG / ABS', 7], 2: ['Nylon', 10] };   // allowable strain, % (starting values for a printed beam)
  const strain = p => 1.5 * p.h * p.y / (p.L * p.L) * 100;   // cantilever beam: eps = 1.5 h y / L^2 (percent)
  const allow = p => MAT[p.m][1] * (p.z ? 0.5 : 1);
  MM.register({
    slug: 'snap-fit', view: { w: 700, h: 440 }, thumb: 0.45,
    params: [
      { key: 'L', label: 'Beam length', unit: ' mm', min: 8, max: 40, step: 1, value: 16 },
      { key: 'h', label: 'Beam thickness', unit: ' mm', min: 0.8, max: 4, step: 0.1, value: 1.5 },
      { key: 'y', label: 'Hook depth', unit: ' mm', min: 0.4, max: 4, step: 0.1, value: 2 },
      { key: 'm', label: 'Material', min: 0, max: 2, step: 1, value: 1, options: [[0, 'PLA'], [1, 'PETG / ABS'], [2, 'Nylon']] },
      { key: 'z', label: 'Layers run', min: 0, max: 1, step: 1, value: 0, options: [[0, 'Along beam'], [1, 'Across beam']] }
    ],
    draw(g, a, p) {
      const u = MM.cycle(a), sx = Math.min(8, 280 / p.L), sv = 12, Ls = p.L * sx, hs = p.h * sv, ys = p.y * sv, yb = 200, hw = 26;
      const e = strain(p), lim = allow(p), bad = e > lim, lipx = 440, lipw = 34;
      const tipx = lipx - 90 + u * 130, x0 = tipx - Ls, cl = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
      // the beam bends down while the hook is under the lip, and springs back once the hook has passed it
      const defl = ys * cl((tipx - lipx + 6) / 26, 0, 1) * (1 - cl((tipx - hw - (lipx + lipw) + 6) / 18, 0, 1));
      g.rect(lipx, yb - ys - 46, lipw, 46, { fill: MM.tint('white', 0.96) });
      g.text('catch', lipx + lipw / 2, yb - ys - 60, { size: 11, align: 'center', color: COL.faint });
      g.rect(x0 - 30, yb - 80, 30, 190); g.text('wall', x0 - 15, yb - 92, { size: 11, align: 'center', color: COL.faint });
      const N = 16, top = [], bot = [];
      for (let i = 0; i <= N; i++) { const t = i / N, yo = defl * (3 * t * t - 2 * t * t * t); top.push([x0 + t * Ls, yb + yo]); bot.push([x0 + t * Ls, yb + hs + yo]); }
      g.poly(top.concat(bot.reverse()), { fill: bad ? MM.tint('red', 0.4) : MM.tint('white', 0.96), hatch: { spacing: 6, cx: x0 + Ls / 2, cy: yb }, color: bad ? COL.red : undefined });
      const ty = yb + defl;
      g.poly([[tipx - hw, ty], [tipx - hw + 4, ty - ys + 6], [tipx - 14, ty - ys], [tipx, ty - ys], [tipx, ty + hs], [tipx - hw, ty + hs]], { fill: bad ? MM.tint('red', 0.4) : MM.tint('white', 0.96), hatch: { spacing: 6, cx: tipx, cy: ty }, color: bad ? COL.red : undefined });
      g.text('hook', tipx - 10, ty - ys - 14, { size: 11, align: 'center', color: COL.faint });
      g.dim(x0, yb + hs + 70, tipx, yb + hs + 70, 'beam ' + p.L + ' mm', 0);
      g.text('thickness ' + p.h + ' mm,  hook depth ' + p.y + ' mm   (heights drawn ×' + (sv / sx).toFixed(1) + ' taller than lengths)', 90, 30, { size: 10, color: COL.faint });
      const mx = 90, my = 366, mw = 380, max = Math.max(12, lim * 1.6), vx = Math.min(1, e / max) * mw;
      g.rect(mx, my, mw, 12, { fill: COL.paper, hatch: false, color: COL.faint, w: 1 });
      g.rect(mx, my, lim / max * mw, 12, { fill: MM.tint('blue', 0.45), hatch: false, color: 'transparent' });
      g.line(mx + lim / max * mw, my - 6, mx + lim / max * mw, my + 18, { w: 2, color: COL.blue });
      g.line(mx + vx, my - 6, mx + vx, my + 18, { w: 2.6, color: COL.red });
      g.text('STRAIN AT THE BEAM ROOT   ' + e.toFixed(1) + '%   (limit ' + lim + '%)', mx, my - 18, { size: 11, weight: 700, color: bad ? COL.red : COL.ink });
      g.text(bad ? 'TOO MUCH: the hook can crack or stay bent' : 'OK: the beam springs back', mx, my + 40, { size: 12, weight: 700, color: bad ? COL.red : COL.blue });
    },
    readout(a, p) { const e = strain(p), lim = allow(p); return { big: e.toFixed(1) + '%', small: 'strain at the root. ' + (e > lim ? 'Over the ' + lim + '% limit, so lengthen the beam, thin it or lower the hook.' : 'Under the ' + lim + '% limit.') + (p.L / p.h < 10 ? ' The beam is short for its thickness, so this formula is only a rough guess.' : '') }; },
    panels: [{
      id: 'strain', title: 'How the strain is worked out', live: true,
      intro: 'For a straight beam fixed at one end and pushed sideways at the other, the largest strain at the root is about 1.5 × thickness × deflection ÷ length². It holds best when the beam is at least 10 times longer than it is thick.',
      html: p => { const e = strain(p), lim = allow(p); return `<div class="tablewrap"><table class="btable"><thead><tr><th>Thing</th><th>Value</th></tr></thead><tbody>
        <tr><td>Strain ε = 1.5 · h · y ÷ L²</td><td><b>${e.toFixed(2)}%</b></td></tr>
        <tr><td>Starting limit for ${MAT[p.m][0]}${p.z ? ' (layers across, halved)' : ''}</td><td>${lim}%</td></tr>
        <tr><td>Length ÷ thickness</td><td>${(p.L / p.h).toFixed(1)}</td></tr></tbody></table></div>
        <ul class="rules"><li><b>Print the beam so the layers run along its length.</b> Layers stacked across a beam peel apart when it bends, so use half the strain limit.</li>
        <li><b>Add a fillet at the root</b> of the beam to spread the stress.</li>
        <li><b>Limits are starting points.</b> Printed plastics vary a lot. Print a few clips and snap them 20 times before trusting one.</li>
        <li><b>Back face angle:</b> a steep back face locks permanently, a gentle one lets the parts come apart.</li></ul>`; }
    }]
  });
})();
