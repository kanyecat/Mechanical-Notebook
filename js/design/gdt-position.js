(function () {
  const { TAU, COL } = MM, N = 40, K = 700, CX = 250, CY = 225, OVER = 0.15;   // 40 parts; position errors drawn ×700; holes Ø10 +0.15/0
  // the same 40 "parts off the machine" every time: where each hole centre landed (unit spread) and how much bigger than its smallest size it came out
  const PARTS = (() => { let s = 7; const rnd = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    return Array.from({ length: N }, () => { const r = Math.sqrt(-2 * Math.log(rnd() + 1e-9)), th = TAU * rnd(); return { x: r * Math.cos(th), y: r * Math.sin(th), e: OVER * rnd() }; }); })();
  // for design values p: each part's offset (mm), whether it passes the ± box (same tolerance written as ±t/(2√2) in X and Y) and the position zone
  const judge = p => PARTS.map(q => { const x = q.x * p.sp, y = q.y * p.sp, half = p.t / (2 * Math.SQRT2), zone = p.t + (p.mmc ? q.e : 0);
    return { x, y, e: q.e, box: Math.abs(x) <= half && Math.abs(y) <= half, pos: 2 * Math.hypot(x, y) <= zone + 1e-12, zone }; });
  const count = p => { const j = judge(p); return { box: j.filter(q => q.box).length, pos: j.filter(q => q.pos).length }; };
  MM.register({
    slug: 'gdt-position', hands: false, view: { w: 700, h: 440 }, thumb: 0.9, period: TAU,
    params: [
      { key: 't', label: 'Position tolerance Ø', unit: ' mm', min: 0.1, max: 0.4, step: 0.01, value: 0.2 },
      { key: 'sp', label: 'How scattered the drilling is', unit: ' mm', min: 0.02, max: 0.12, step: 0.005, value: 0.07 },
      { key: 'mmc', label: 'Tolerance applies at', min: 0, max: 1, step: 1, value: 0, options: [[0, 'Any size (RFS)'], [1, 'MMC Ⓜ (bonus)']] }
    ],
    tryit: {
      pose: 0.999,
      keys: [{ key: 't', label: 'Zone Ø', at: p => [CX + p.t / 2 * K, CY] }, { key: 'sp', label: 'Scatter', at: MM.slide(470, 330, 660, 330, 'sp', 0.02, 0.12) }],
      tasks: [
        { text: 'Make at least 36 of the 40 parts pass with a zone no bigger than Ø0.25. Tighten the drilling if you need to.', now: p => count(p).pos + ' of 40 pass, zone Ø' + p.t.toFixed(2), ok: p => count(p).pos >= 36 && p.t <= 0.25 + 1e-9 },
        { text: 'Switch the tolerance to MMC (below) and find a setting where it saves at least 3 more parts than any-size.', now: p => { const a = count(Object.assign({}, p, { mmc: 0 })).pos, b = count(Object.assign({}, p, { mmc: 1 })).pos; return 'any size ' + a + ', MMC ' + b; }, ok: p => p.mmc === 1 && count(p).pos - count(Object.assign({}, p, { mmc: 0 })).pos >= 3 }
      ]
    },
    draw(g, a, p) {
      const J = judge(p), u = ((a / TAU) % 1 + 1) % 1, n = Math.max(1, Math.min(N, Math.ceil(u * N * 1.15))), half = p.t / (2 * Math.SQRT2);
      g.text('Ø10 +0.15/0 hole, ' + (p.mmc ? 'position Ø' + p.t.toFixed(2) + ' Ⓜ' : 'position Ø' + p.t.toFixed(2)) + ' to datums A B C', 20, 24, { size: 12, weight: 700 });
      g.text('(position errors drawn ×700)', 20, 44, { size: 10.5, color: COL.faint });
      // the zones: the ± box and the round position zone that just contains it
      g.circle(CX, CY, p.t / 2 * K, { fill: MM.tint('blue', 0.14), color: COL.blue, w: 2 });
      g.rect(CX - half * K, CY - half * K, 2 * half * K, 2 * half * K, { fill: false, hatch: false, color: COL.ink, dash: [6, 4], w: 1.4 });
      if (p.mmc) g.circle(CX, CY, (p.t + OVER) / 2 * K, { color: COL.blue, dash: [2, 4], w: 1 });
      g.line(CX - 190, CY, CX + 190, CY, { w: 0.7, color: COL.faint }); g.line(CX, CY - 190, CX, CY + 190, { w: 0.7, color: COL.faint });
      g.text('± box', CX - half * K + 4, CY - half * K - 10, { size: 11, color: COL.ink });
      g.text('position zone', CX + p.t / 2 * K * 0.72, CY - p.t / 2 * K * 0.72 - 12, { size: 11, color: COL.blue });
      if (p.mmc) g.text('largest zone (biggest hole)', CX - (p.t + OVER) / 2 * K * 0.7, CY + (p.t + OVER) / 2 * K * 0.72 + 14, { size: 10.5, color: COL.faint, align: 'center' });
      // the parts, one by one: dark = passes both, blue = passes only as position, red = fails
      for (let i = 0; i < n; i++) {
        const q = J[i], x = CX + q.x * K, y = CY - q.y * K, col = q.pos && q.box ? COL.ink : q.pos ? COL.blue : COL.red, last = i === n - 1 && n < N;
        if (p.mmc && last) g.circle(x, y, q.zone / 2 * K, { color: MM.tint('blue', 0.6), dash: [3, 3], w: 1 });
        g.circle(x, y, last ? 7 : 4.5, { fill: col, color: col, w: 1 });
      }
      // tally
      const shown = J.slice(0, n), cb = shown.filter(q => q.box).length, cp = shown.filter(q => q.pos).length, x0 = 470;
      g.text('PARTS CHECKED ' + n + ' / ' + N, x0, 90, { size: 12, weight: 700 });
      g.text('pass the ± box', x0, 122, { size: 12 }); g.text(String(cb), 660, 122, { size: 15, weight: 800, align: 'right' });
      g.text('pass position', x0, 148, { size: 12, color: COL.blue }); g.text(String(cp), 660, 148, { size: 15, weight: 800, align: 'right', color: COL.blue });
      g.text('extra good parts kept', x0, 174, { size: 12 }); g.text('+' + (cp - cb), 660, 174, { size: 15, weight: 800, align: 'right', color: COL.red });
      [[COL.ink, 'passes both'], [COL.blue, 'passes position only'], [COL.red, 'fails']].forEach(([c, t], i) => { g.dot(x0 + 6, 214 + i * 22, 5, c); g.text(t, x0 + 20, 214 + i * 22, { size: 11.5 }); });
      g.text('drilling scatter', x0, 306, { size: 11, color: COL.faint });
    },
    readout(a, p) { const c = count(p); return { big: c.pos + ' / ' + N, small: 'parts that pass with position Ø' + p.t.toFixed(2) + (p.mmc ? ' at MMC' : '') + '; the same tolerance as a ± box passes ' + c.box }; },
    panels: [{
      id: 'convert', title: 'From a ± box to a position zone',
      intro: 'To keep exactly the parts a ± drawing accepted, and add the good ones it was rejecting, use the circle through the corners of the box.',
      html: () => `<div class="tablewrap"><table class="btable"><thead><tr><th>Drawn as</th><th>Box (square)</th><th>Same parts plus more: position Ø</th><th>Extra area accepted</th></tr></thead><tbody>
        ${[0.025, 0.05, 0.1, 0.15, 0.2].map(s => `<tr><td>±${s}</td><td>${MM.num(2 * s, 3)} × ${MM.num(2 * s, 3)}</td><td>Ø${MM.num(2 * s * Math.SQRT2, 3)}</td><td>+57 %</td></tr>`).join('')}</tbody></table></div>`
    }, {
      id: 'frame', title: 'Reading a position callout',
      html: () => `<ol class="rules"><li><b>⌖</b> position: the hole's axis must lie inside a zone around its exact (basic) location.</li>
        <li><b>Ø0.2</b>: the zone is a cylinder 0.2 mm across. Without the Ø it would be two parallel planes, a width zone.</li>
        <li><b>Ⓜ</b> (MMC): the 0.2 applies when the hole is at its smallest. A bigger hole gets bonus tolerance equal to how much bigger it is. With no modifier the zone stays 0.2 at any size (RFS).</li>
        <li><b>A B C</b>: the datums. The part is held on face A, pushed against B, then C, and the exact location is measured from them. They should be the faces that locate the part in its assembly.</li>
        <li>The exact location itself is a <b>basic dimension</b>, shown in a box, with no tolerance of its own: all the allowance lives in the zone.</li></ol>`
    }, {
      id: 'when', title: 'When to use MMC',
      html: () => `<ul class="rules"><li><b>Use MMC</b> for clearance holes that bolts or pins pass through: a bigger hole really can be further off and still assemble. It saves parts for free and lets inspectors use a simple fixed-pin gauge.</li>
        <li><b>Use RFS</b> (no modifier) where the centre must be in the right place whatever the size: a bearing bore, a gear centre, anything that locates or turns.</li>
        <li><b>LMC Ⓛ</b> (least material) protects the wall thickness around a hole near an edge.</li></ul>`
    }]
  });
})();
