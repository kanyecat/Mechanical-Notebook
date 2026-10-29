(function () {
  const { TAU, COL } = MM, SIZES = [20, 15, 25, 18, 22, 12], X0 = 70, Y = 150, S = 4.4, EX = 25;   // block sizes (mm), drawing scale (px per mm), size errors drawn ×25
  const GAP = 1;   // the gap the designer wants at nominal sizes (mm)
  const nominal = n => SIZES.slice(0, n).reduce((x, y) => x + y, 0);
  const calc = p => { const n = p.n | 0, wc = n * p.tb + p.th, rss = Math.sqrt(n * p.tb * p.tb + p.th * p.th); return { n, wc, rss, wcMin: GAP - wc, wcMax: GAP + wc, rssMin: GAP - rss, rssMax: GAP + rss }; };
  // one made assembly: each size somewhere in its tolerance (the same set of random "parts" for each step of the animation)
  const rnd = k => { let s = (k * 2654435761) | 0; s ^= s >>> 13; s = Math.imul(s, 0x5bd1e995); s ^= s >>> 15; return ((s >>> 0) % 10000) / 10000; };
  const sample = (k, p) => { const n = p.n | 0, e = []; for (let i = 0; i < n; i++) e.push((rnd(k * 17 + i) * 2 - 1) * p.tb); const h = (rnd(k * 17 + 11) * 2 - 1) * p.th; return { e, h, gap: GAP + h - e.reduce((x, y) => x + y, 0) }; };
  MM.register({
    slug: 'tolerance-stackup', hands: false, view: { w: 700, h: 440 }, thumb: 0.1, period: TAU,
    params: [
      { key: 'tb', label: 'Tolerance on each block ±', unit: ' mm', min: 0.02, max: 0.5, step: 0.01, value: 0.15 },
      { key: 'th', label: 'Tolerance on the housing ±', unit: ' mm', min: 0.02, max: 0.5, step: 0.01, value: 0.1 },
      { key: 'n', label: 'Blocks in the stack', min: 2, max: 6, step: 1, value: 4 },
      { key: 'rss', label: 'Method', min: 0, max: 1, step: 1, value: 0, options: [[0, 'Worst case'], [1, 'Statistical (RSS)']] }
    ],
    tryit: {
      pose: 0.02,
      keys: [{ key: 'tb', label: 'Block ±', at: MM.slide(70, 410, 330, 410, 'tb', 0.02, 0.5) }, { key: 'th', label: 'Housing ±', at: MM.slide(380, 410, 640, 410, 'th', 0.02, 0.5) }, { key: 'n', label: 'Blocks', at: MM.slide(70, 70, 330, 70, 'n', 2, 6) }],
      valid: p => (p.rss ? calc(p).rssMin : calc(p).wcMin) >= 0, why: 'Red: with these tolerances the blocks can come out too long for the housing and jam.',
      tasks: [
        { text: 'With 4 blocks and the housing at ±0.10, find the loosest block tolerance (at least ±0.20) that never jams, worst case.', now: p => p.n + ' blocks, worst-case gap ' + MM.num(calc(p).wcMin, 2) + ' to ' + MM.num(calc(p).wcMax, 2) + ' mm', ok: p => p.n === 4 && Math.abs(p.th - 0.1) < 1e-9 && p.tb >= 0.2 - 1e-9 && calc(p).wcMin >= 0 },
        { text: 'Switch the method to statistical (RSS) and loosen the blocks to ±0.40 or more while the gap stays clear.', now: p => (p.rss ? 'RSS' : 'worst case') + ', blocks ±' + p.tb.toFixed(2) + ', RSS gap from ' + MM.num(calc(p).rssMin, 2) + ' mm', ok: p => p.rss === 1 && p.tb >= 0.4 - 1e-9 && calc(p).rssMin >= 0 },
        { text: 'Go back to worst case with 6 blocks and make it never jam.', now: p => p.n + ' blocks, worst-case gap from ' + MM.num(calc(p).wcMin, 2) + ' mm', ok: p => p.rss === 0 && p.n === 6 && calc(p).wcMin >= 0 }
      ]
    },
    draw(g, a, p) {
      const c = calc(p), n = c.n, k = Math.floor(((a / TAU) % 1 + 1) % 1 * 8), sm = sample(k + 1, p), L = nominal(n), H = L + GAP;
      const W = Math.min(S, 520 / H), hx = X0 + (H + sm.h * EX) * W;
      g.text('Blocks in a housing: will the row fit, and how big is the gap at the end?', 20, 24, { size: 12, weight: 700 });
      g.text('(size errors drawn ×' + EX + ')', 20, 42, { size: 10.5, color: COL.faint });
      // housing (a U-shaped channel) and the blocks, each made a little off its size
      g.poly([[X0 - 16, Y - 40], [X0, Y - 40], [X0, Y + 60], [hx, Y + 60], [hx, Y - 40], [hx + 16, Y - 40], [hx + 16, Y + 76], [X0 - 16, Y + 76]], { fill: COL.white, hatch: { spacing: 6 } });
      let x = X0; const tot = sm.e.reduce((u, v) => u + v, 0);
      for (let i = 0; i < n; i++) { const w = (SIZES[i] + sm.e[i] * EX) * W; g.rect(x, Y - 26, w, 86, { fill: MM.tint(i % 2 ? 'white' : 'blue', i % 2 ? 0.9 : 0.25), hatch: false }); g.text(SIZES[i] + (sm.e[i] >= 0 ? '+' : '−') + Math.abs(sm.e[i]).toFixed(2), x + w / 2, Y + 17, { size: 10.5, align: 'center' }); x += w; }
      const gap = sm.gap, jam = gap < 0;
      if (jam) { g.rect(hx, Y - 26, x - hx, 86, { fill: MM.tint('red', 0.45), hatch: false, color: COL.red }); g.text('JAMS: ' + MM.num(-gap, 2) + ' mm too long', (hx + x) / 2, Y - 40, { size: 12, weight: 800, align: 'center', color: COL.red }); }
      else g.dim(x, Y + 92, hx, Y + 92, 'gap ' + MM.num(gap, 2), 0, { ty: 14 });
      g.text('housing ' + MM.num(H, 0) + (sm.h >= 0 ? '+' : '−') + Math.abs(sm.h).toFixed(2), (X0 + hx) / 2, Y - 54, { size: 11, align: 'center', color: COL.faint });
      g.text('made assembly ' + (k + 1) + ' of 8', 640, 42, { size: 11, align: 'right', color: COL.faint });
      // the gap range both ways, against zero
      const gx0 = 70, gx1 = 640, gy = 330, lo = Math.min(-0.5, GAP - c.wc - 0.1), hi = GAP + c.wc + 0.1, X = v => gx0 + (v - lo) / (hi - lo) * (gx1 - gx0);
      g.line(gx0, gy, gx1, gy, { w: 1, color: COL.faint });
      g.rect(X(lo), gy - 30, X(0) - X(lo), 60, { fill: MM.tint('red', 0.12), hatch: false, color: MM.tint('red', 0.3) }); g.text('jams', X(lo) + 6, gy - 20, { size: 10.5, color: COL.red });
      g.line(X(0), gy - 34, X(0), gy + 34, { w: 1.6, color: COL.red }); g.text('0', X(0), gy + 46, { size: 10.5, align: 'center', color: COL.red });
      [[c.wcMin, c.wcMax, gy - 14, 'worst case', !p.rss], [c.rssMin, c.rssMax, gy + 12, 'statistical (RSS)', !!p.rss]].forEach(([a0, a1, y, t, on]) => { g.rect(X(a0), y - 7, X(a1) - X(a0), 14, { fill: on ? (a0 < 0 ? MM.tint('red', 0.6) : MM.tint('blue', 0.55)) : MM.tint('ink', 0.15), hatch: false, color: on ? COL.ink : COL.faint }); const lab = t + ': ' + MM.num(a0, 2) + ' to ' + MM.num(a1, 2), ly = y < gy ? y - 16 : y + 18; g.text(lab, Math.min(gx1 - lab.length * 6.4, Math.max(gx0, (X(a0) + X(a1)) / 2 - lab.length * 3.2)), ly, { size: 10.5, color: on ? COL.ink : COL.faint }); });
      g.line(X(GAP), gy - 30, X(GAP), gy + 30, { w: 1, dash: [3, 3], color: COL.faint }); g.text('nominal ' + GAP, X(GAP), gy - 50, { size: 10.5, align: 'center', color: COL.faint });
      g.dot(X(Math.max(lo, gap)), gy, 6, jam ? COL.red : COL.ink);
      g.text('GAP RANGE (mm)', gx0, gy - 50, { size: 11, weight: 700 });
    },
    readout(a, p) { const c = calc(p), m = p.rss ? c.rssMin : c.wcMin; return { big: MM.num(GAP, 2) + ' ± ' + MM.num(p.rss ? c.rss : c.wc, 2) + ' mm', small: (p.rss ? 'statistical' : 'worst-case') + ' gap with ' + c.n + ' blocks: ' + (m < 0 ? 'can jam by up to ' + MM.num(-m, 2) + ' mm' : 'always clear') }; },
    panels: [{
      id: 'methods', title: 'Worst case or statistical?', live: true,
      html: p => { const c = calc(p); return `<div class="tablewrap"><table class="btable"><thead><tr><th></th><th>Worst case</th><th>Statistical (RSS)</th></tr></thead><tbody>
        <tr><td>Gap varies by</td><td>t₁ + t₂ + … = ±${MM.num(c.wc, 3)}</td><td>√(t₁² + t₂² + …) = ±${MM.num(c.rss, 3)}</td></tr>
        <tr><td>Gap here</td><td>${MM.num(c.wcMin, 2)} to ${MM.num(c.wcMax, 2)} mm</td><td>${MM.num(c.rssMin, 2)} to ${MM.num(c.rssMax, 2)} mm</td></tr>
        <tr><td>Promise</td><td>Every assembly fits</td><td>About 997 in 1000 fit, if each size is random and centred (±3σ)</td></tr>
        <tr><td>Use it for</td><td>Few parts, safety-critical fits, one batch</td><td>Large runs from steady, centred processes</td></tr></tbody></table></div>`; }
    }, {
      id: 'tips', title: 'Making a stack work',
      html: () => `<ul class="rules"><li><b>Fewer parts in the stack:</b> every part adds its tolerance. Merging two parts or measuring from one face removes a link.</li>
        <li><b>Tighten the biggest contributor first:</b> in RSS a tolerance counts as its square, so halving the largest one helps most.</li>
        <li><b>Dimension from one datum</b> on each part, so a stack runs through as few dimensions as possible.</li>
        <li><b>Let one part take up the slack:</b> a shim, a wave spring, a slotted hole or a set screw often costs less than tight tolerances everywhere.</li>
        <li><b>Draw the loop:</b> start at one face, follow every part and dimension round to the gap, adding sizes one way and subtracting the other. Missing a link is the usual mistake.</li></ul>`
    }]
  });
})();
