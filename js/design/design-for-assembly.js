(function () {
  const { TAU, COL } = MM, LABOUR = 0.6 / 60;   // assembly labour, about $36 an hour, in $ per second
  // a small electronics box: base, circuit board, bracket, lid and screws. Times in seconds (handling + fitting), in the spirit of
  // the Boothroyd Dewhurst tables: rough but in the right proportions.
  const parts = p => {
    const key = !!p.key, L = [];
    L.push({ n: 'Base', h: 1.5, f: 1.5, min: true, kind: 'base', c: p.merge ? 2.1 : 2 });
    if (!p.merge) L.push({ n: 'Bracket', h: key ? 1.5 : 3, f: 3, min: false, kind: 'bracket', c: 0.6 });
    L.push({ n: 'Circuit board', h: key ? 2 : 3.5, f: p.snapPcb ? 2.5 : 3, min: true, kind: 'pcb', c: 4 });
    if (!p.snapPcb) for (let i = 0; i < 4; i++) L.push({ n: 'Board screw', h: 3, f: 6, min: false, kind: 'pscrew', i, c: 0.08 });
    L.push({ n: 'Lid', h: key ? 1.5 : 3, f: p.snap ? 2.5 : 2, min: true, kind: 'lid', c: p.snap ? 1.7 : 1.5 });
    if (!p.snap) for (let i = 0; i < (p.s | 0); i++) L.push({ n: 'Lid screw', h: 3, f: 6, min: false, kind: 'lscrew', i, c: 0.08 });
    return L;
  };
  const score = p => { const L = parts(p), T = L.reduce((x, q) => x + q.h + q.f, 0), Nmin = L.filter(q => q.min).length, C = L.reduce((x, q) => x + q.c, 0); return { L, T, Nmin, E: 3 * Nmin / T, C, A: T * LABOUR }; };
  MM.register({
    slug: 'design-for-assembly', hands: false, view: { w: 700, h: 440 }, thumb: 0.95, period: TAU,
    params: [
      { key: 's', label: 'Screws holding the lid', min: 0, max: 8, step: 1, value: 6 },
      { key: 'snap', label: 'Lid held by', min: 0, max: 1, step: 1, value: 0, options: [[0, 'Screws'], [1, 'Snap fits']] },
      { key: 'snapPcb', label: 'Board held by', min: 0, max: 1, step: 1, value: 0, options: [[0, '4 screws'], [1, 'Clips in the base']] },
      { key: 'merge', label: 'Bracket', min: 0, max: 1, step: 1, value: 0, options: [[0, 'Separate part'], [1, 'Moulded into the base']] },
      { key: 'key', label: 'Parts that only fit one way', min: 0, max: 1, step: 1, value: 0, options: [[0, 'No'], [1, 'Yes (keyed)']] }
    ],
    tryit: {
      pose: 0.999,
      keys: [{ key: 's', label: 'Lid screws', at: MM.slide(430, 304, 640, 304, 's', 0, 8) }],
      tasks: [
        { text: 'Cut the assembly time below 40 seconds. Try the options under the drawing as well as the handle.', now: p => MM.num(score(p).T, 1) + ' s', ok: p => score(p).T < 40 },
        { text: 'Get the design efficiency above 40 %.', now: p => Math.round(score(p).E * 100) + ' %', ok: p => score(p).E > 0.4 },
        { text: 'The lid must come off for repairs, so keep 2 lid screws (no snap fits). What is the best efficiency you can reach?', now: p => (p.snap ? 'snap-fit lid' : (p.s | 0) + ' lid screws') + ', ' + Math.round(score(p).E * 100) + ' %', ok: p => !p.snap && (p.s | 0) === 2 && p.snapPcb === 1 && p.merge === 1 && p.key === 1 }
      ]
    },
    draw(g, a, p) {
      const sc = score(p), L = sc.L, u = ((a / TAU) % 1 + 1) % 1, total = sc.T, now = u * total * 1.12;
      let t0 = 0; const st = L.map(q => { const s0 = t0; t0 += q.h + q.f; return { q, s0, s1: t0 }; });
      const prog = q => Math.max(0, Math.min(1, (now - q.s0) / (q.s1 - q.s0)));
      // the box, side section, built up part by part. Each part drops in from above as its turn comes.
      const bx = 70, by = 300, bw = 300;
      const drop = (k, y) => y - (1 - k) * 160, ease = k => k * k * (3 - 2 * k);
      st.forEach(({ q, s0, s1 }) => {
        const k = ease(prog({ s0, s1 })); if (k <= 0) return; const col = q.min ? MM.tint('white', 0.95) : MM.tint('red', 0.35);
        if (q.kind === 'base') { const d = drop(k, 0); g.poly([[bx, by], [bx + bw, by], [bx + bw, by - 90], [bx + bw - 10, by - 90], [bx + bw - 10, by - 10], [bx + 10, by - 10], [bx + 10, by - 90], [bx, by - 90]].map(([x, y]) => [x, y + d]), { fill: COL.white, hatch: { spacing: 6 } }); if (p.merge) g.rect(bx + 30, by - 50 + d, 12, 40, { fill: COL.white, hatch: { spacing: 6 } }); }
        if (q.kind === 'bracket') g.rect(bx + 30, drop(k, by - 50), 12, 40, { fill: col, hatch: false });
        if (q.kind === 'pcb') { const y = drop(k, by - 62); g.rect(bx + 60, y, 200, 8, { fill: MM.tint('blue', 0.5), hatch: false }); g.rect(bx + 120, y - 14, 40, 14, { fill: MM.tint('blue', 0.3), hatch: false }); if (p.snapPcb) { g.line(bx + 56, by - 10, bx + 56, by - 66, { w: 2 }); g.line(bx + 264, by - 10, bx + 264, by - 66, { w: 2 }); } }
        if (q.kind === 'pscrew') { const x = bx + 70 + q.i * 60, y = drop(k, by - 66); g.rect(x - 4, y - 4, 8, 4, { fill: col, hatch: false }); g.line(x, y, x, y + 10, { w: 2, color: COL.red }); }
        if (q.kind === 'lid') g.rect(bx - 4, drop(k, by - 100), bw + 8, 10, { fill: MM.tint('white', 0.95), hatch: { spacing: 6 } });
        if (q.kind === 'lscrew') { const n = p.s | 0, x = bx + 6 + (n > 1 ? q.i * (bw - 12) / (n - 1) : (bw - 12) / 2), y = drop(k, by - 104); g.rect(x - 5, y - 5, 10, 5, { fill: col, hatch: false }); g.line(x, y, x, y + 16, { w: 2, color: COL.red }); }
      });
      if (p.snap) g.text('lid snaps on', bx + bw / 2, by - 116, { size: 10.5, align: 'center', color: COL.faint });
      g.text('section through the box: parts arrive in order', bx, by + 26, { size: 10.5, color: COL.faint });
      // the parts list with times, and the running clock
      g.text('Fewer parts, easy to grasp, turn and fit:', 20, 24, { size: 12, weight: 700 }); g.text('quicker and cheaper to put together', 20, 41, { size: 12, weight: 700 });
      const x0 = 430; g.text('PARTS AND TIME', x0, 30, { size: 11, weight: 700 });
      const rows = []; L.forEach(q => { const r = rows.find(z => z.n === q.n); if (r) { r.c++; r.t += q.h + q.f; } else rows.push({ n: q.n, c: 1, t: q.h + q.f, min: q.min }); });
      rows.forEach((r, i) => { const y = 54 + i * 20; g.text((r.c > 1 ? r.c + ' × ' : '') + r.n, x0, y, { size: 11.5, color: r.min ? COL.ink : COL.red }); g.text(MM.num(r.t, 1) + ' s', 660, y, { size: 11.5, align: 'right', color: r.min ? COL.ink : COL.red }); });
      const yb = 54 + rows.length * 20 + 8; g.line(x0, yb, 660, yb, { w: 1, color: COL.faint });
      g.text('total', x0, yb + 16, { size: 12, weight: 700 }); g.text(MM.num(total, 1) + ' s', 660, yb + 16, { size: 12, weight: 800, align: 'right' });
      g.text(L.length + ' parts to buy', x0, yb + 38, { size: 11.5 }); g.text('$' + MM.num(sc.C, 2), 660, yb + 38, { size: 11.5, align: 'right' });
      g.text('assembly labour', x0, yb + 56, { size: 11.5 }); g.text('$' + MM.num(sc.A, 2), 660, yb + 56, { size: 11.5, align: 'right' });
      g.text('red: parts that could go', x0, yb + 78, { size: 10.5, color: COL.red });
      // clock bar and efficiency
      const cy = 380, cw = 560, kx = cw / Math.max(60, total); g.text('ASSEMBLY CLOCK', 70, cy - 22, { size: 11, weight: 700 });
      g.rect(70, cy - 8, total * kx, 16, { fill: MM.tint('ink', 0.12), hatch: false }); g.rect(70, cy - 8, Math.min(now, total) * kx, 16, { fill: MM.tint('blue', 0.55), hatch: false });
      g.line(70 + sc.Nmin * 3 * kx, cy - 14, 70 + sc.Nmin * 3 * kx, cy + 14, { w: 1.6, color: COL.red }); g.text('ideal ' + sc.Nmin * 3 + ' s', 70 + sc.Nmin * 3 * kx, cy + 26, { size: 10.5, align: 'center', color: COL.red });
      g.text(MM.num(Math.min(now, total), 1) + ' s', 70 + Math.min(now, total) * kx + 6, cy, { size: 11 });
      g.text('design efficiency ' + Math.round(sc.E * 100) + ' %', 660, 420, { size: 14, weight: 800, align: 'right', color: sc.E > 0.4 ? COL.ink : COL.red });
    },
    readout(a, p) { const s = score(p); return { big: Math.round(s.E * 100) + ' %', small: 'design efficiency: ' + MM.num(s.T, 1) + ' s to assemble ' + s.L.length + ' parts (ideal ' + s.Nmin * 3 + ' s for the ' + s.Nmin + ' that must exist); parts $' + MM.num(s.C, 2) + ' + labour $' + MM.num(s.A, 2) }; },
    panels: [{
      id: 'questions', title: 'Can this part go? Three questions',
      intro: 'Ask them of every part. If all three answers are no, the part is a candidate to merge into a neighbour or to remove.',
      html: () => `<ol class="rules"><li><b>Does it move</b> relative to the parts it touches, when the product is working?</li>
        <li><b>Must it be a different material</b> (or electrically or thermally separate) from its neighbours?</li>
        <li><b>Must it be separate</b> so the other parts can be put together, or taken apart for service?</li></ol>
        <p class="xpintro">Here the base, the board and the lid each pass at least one test, so they stay. The bracket fails all three and can be moulded into the base. Screws never count as needed parts: they are there only to hold other parts.</p>`
    }, {
      id: 'times', title: 'Typical times (rough)',
      html: () => `<div class="tablewrap"><table class="btable"><thead><tr><th>Action</th><th>Time</th><th>Why</th></tr></thead><tbody>
        <tr><td>Pick up a part that is symmetric or only fits one way</td><td>1 to 1.5 s</td><td>No need to turn it round</td></tr>
        <tr><td>Pick up a part that must be turned the right way</td><td>2 to 4 s</td><td>Looking and turning</td></tr>
        <tr><td>Drop a part into a guided place</td><td>1.5 to 2 s</td><td>Chamfers and guides help</td></tr>
        <tr><td>Snap a part on</td><td>2 to 3 s</td><td>One push</td></tr>
        <tr><td>Drive a screw</td><td>6 to 10 s with picking</td><td>Pick, start, drive, check</td></tr>
        <tr><td>Hold a part while fixing it</td><td>+2 to 4 s</td><td>Needs a second hand or a jig</td></tr></tbody></table></div>`
    }, {
      id: 'rules', title: 'DFA rules of thumb',
      html: () => `<ul class="rules"><li><b>Fewer parts</b> beats faster parts. Merge, mould in, or remove before you speed anything up.</li>
        <li><b>Fewer fasteners, fewer kinds:</b> snap fits, clips, tabs and one screw type everywhere.</li>
        <li><b>Build from one direction,</b> top down, onto a base that does not need turning over.</li>
        <li><b>Make parts symmetric,</b> or clearly one-way with a key, so they cannot go in wrong. See <a href="../fabrication/poka-yoke.html">Poka-Yoke</a>.</li>
        <li><b>Add lead-ins:</b> chamfers and guides so parts find their place without careful aiming.</li>
        <li><b>Keep service in mind:</b> a lid held by two screws can be the right answer when people need to get inside.</li></ul>`
    }]
  });
})();
