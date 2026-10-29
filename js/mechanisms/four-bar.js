(function () {
  const { TAU, COL } = MM, O2 = [200, 360];
  // link lengths in drawing units: crank A, coupler B, rocker C, frame D (the defaults are the original drawing)
  const L = p => ({ A: p.A || 55, B: p.B || 150, C: p.C || 110, D: p.D || 140 });
  function solve(a, p) {
    const { A, B, C: Cc, D } = L(p || {}), O4 = [O2[0] + D, O2[1]], U = 0.5 * B, V = -0.55 * B;
    const ax = O2[0] + A * Math.cos(a), ay = O2[1] - A * Math.sin(a);
    const dx = O4[0] - ax, dy = O4[1] - ay, d = Math.hypot(dx, dy);
    const k = (B * B - Cc * Cc + d * d) / (2 * d), h2 = B * B - k * k, jam = h2 < -1e-6;
    let bx, by, cx, cy;
    if (!jam) { const h = Math.sqrt(Math.max(h2, 0)), mx = ax + k * dx / d, my = ay + k * dy / d; bx = mx + h * dy / d; by = my - h * dx / d; cx = bx; cy = by; }   // upper solution
    else { bx = ax + B * dx / d; by = ay + B * dy / d; cx = O4[0] - Cc * dx / d; cy = O4[1] - Cc * dy / d; }   // the bars cannot meet: each points at the other, with a gap (never stretched)
    const ux = (bx - ax) / B, uy = (by - ay) / B;
    const px = ax + U * ux - V * uy, py = ay + U * uy + V * ux;
    return { ax, ay, bx, by, cx, cy, px, py, O4, jam, rock: Math.atan2(O4[1] - cy, cx - O4[0]) };
  }
  // where the crank can actually go: all the way round, or only back and forth over the longest stretch where the bars still meet
  const cache = {}; const info = p => { const key = JSON.stringify(L(p)); if (cache[key]) return cache[key];
    const N = 720, ok = []; for (let i = 0; i < N; i++) ok.push(!solve(i / N * TAU, p).jam);
    let run = null;
    if (ok.every(Boolean)) run = { lo: 0, len: TAU, full: true };
    else if (ok.some(Boolean)) { let best = [0, 0]; for (let i = 0; i < N; i++) { if (!ok[i] || ok[(i - 1 + N) % N]) continue; let n = 0; while (n < N && ok[(i + n) % N]) n++; if (n > best[1]) best = [i, n]; }
      run = { lo: (best[0] + 0.5) / N * TAU, len: Math.max(0, best[1] - 1) / N * TAU, full: false }; }
    const at = a => !run ? 0 : run.full ? a : run.lo + run.len * (1 - Math.cos(Math.PI * (((a / TAU) % 1 + 1) % 1 < 0.5 ? 2 * (((a / TAU) % 1 + 1) % 1) : 2 - 2 * (((a / TAU) % 1 + 1) % 1)))) / 2;
    const samples = [], curve = []; for (let i = 0; i < 360; i++) samples.push(solve(at(i / 360 * TAU), p).rock * 180 / Math.PI);
    for (let i = 0; i <= 180; i++) { const s = solve(at(i / 180 * TAU), p); curve.push([s.px, s.py]); }
    return (cache[key] = { run, at, samples, curve, swing: Math.max(...samples) - Math.min(...samples) }); };
  // the crank angle for drive angle a: the drive itself when the crank turns fully, otherwise a smooth rock between the two dead points
  const crankAt = (a, p) => info(p).at(a);
  const turns = p => !!(info(p).run && info(p).run.full);
  const deg = x => Math.round(((x * 180 / Math.PI) % 360 + 360) % 360);
  MM.register({
    slug: 'four-bar', view: { w: 700, h: 460 },
    tryit: {
      pose: 0.12,
      // handles: the crank pin, the middle of the coupler, the rocker pin and the right-hand ground pivot
      keys: [{ key: 'A', label: 'Crank', at: p => { const s = solve(crankAt(0.12 * TAU, p), p); return [s.ax, s.ay]; } }, { key: 'B', label: 'Coupler', at: p => { const s = solve(crankAt(0.12 * TAU, p), p); return [(s.ax + s.bx) / 2, (s.ay + s.by) / 2]; } },
        { key: 'C', label: 'Rocker', at: p => { const s = solve(crankAt(0.12 * TAU, p), p); return [s.bx, s.by]; } }, { key: 'D', label: 'Frame', at: p => solve(crankAt(0.12 * TAU, p), p).O4 }],
      valid: p => turns(p), why: 'Red: the crank can no longer turn all the way round, so it only rocks back and forth.',
      tasks: [
        { text: 'Make the rocker swing more than 90° while the crank still turns all the way round.', now: p => turns(p) ? 'swing ' + info(p).swing.toFixed(0) + '°' : 'the crank cannot turn fully', ok: p => turns(p) && info(p).swing > 90 },
        { text: 'Make a gentle wiper: a rocker swing under 40°.', now: p => turns(p) ? 'swing ' + info(p).swing.toFixed(0) + '°' : 'the crank cannot turn fully', ok: p => turns(p) && info(p).swing < 40 },
        { text: 'Break it on purpose: find sizes where the crank cannot turn all the way round.', now: p => turns(p) ? 'crank turns fully' : 'the crank only rocks', ok: p => !turns(p) }
      ]
    },
    params: [
      { key: 'A', label: 'Crank', unit: '', min: 30, max: 90, step: 1, value: 55 },
      { key: 'B', label: 'Coupler', unit: '', min: 90, max: 200, step: 1, value: 150 },
      { key: 'C', label: 'Rocker', unit: '', min: 60, max: 170, step: 1, value: 110 },
      { key: 'D', label: 'Frame', unit: '', min: 80, max: 200, step: 1, value: 140 }
    ],
    draw(g, a, p) {
      const th = crankAt(a, p), s = solve(th, p), O4 = s.O4, { A } = L(p), curve = info(p).curve, run = info(p).run;
      g.ground(O2[0] - 60, O4[0] + 60, O2[1] + 20);
      g.trace(curve, { color: MM.tint('red', .45), w: 1.4, dash: [5, 3] });
      g.poly([[s.ax, s.ay], [s.bx, s.by], [s.px, s.py]], { fill: MM.tint('white', .85), hatch: { spacing: 6, cx: s.px, cy: s.py } });
      g.bar(O2[0], O2[1], s.ax, s.ay, 12, { nopivot: true });
      g.bar(O4[0], O4[1], s.cx, s.cy, 12, { nopivot: true });
      g.line(O2[0], O2[1], O4[0], O4[1], { w: 1, dash: [6, 4], color: COL.faint });
      g.pivot(O2[0], O2[1], 8); g.pivot(O4[0], O4[1], 8); g.pivot(s.ax, s.ay, 6); g.pivot(s.bx, s.by, 6); if (s.jam) { g.pivot(s.cx, s.cy, 6); g.line(s.bx, s.by, s.cx, s.cy, { w: 2, dash: [4, 4], color: COL.red }); }
      g.dot(s.px, s.py, 7, COL.red);
      g.text('crank', O2[0] + A * Math.cos(th) / 2 - 22, O2[1] - A * Math.sin(th) / 2 - 8, { size: 11, align: 'center', color: COL.faint });
      g.text('rocker', (O4[0] + s.cx) / 2 + 30, (O4[1] + s.cy) / 2, { size: 11, align: 'center', color: COL.faint });
      g.text('coupler', (s.ax + s.bx) / 2, (s.ay + s.by) / 2 - 18, { size: 11, align: 'center', color: COL.faint });
      g.text('P', s.px + 12, s.py - 10, { size: 13, weight: 700, color: COL.red });
      g.text('frame', (O2[0] + O4[0]) / 2, O2[1] - 12, { size: 11, align: 'center', color: COL.faint });
      if (!run) g.text('These bars are too short to join into a loop at any angle', 350, 30, { size: 13, weight: 800, align: 'center', color: COL.red });
      else if (!run.full) g.text('Not Grashof: the crank can only rock between ' + deg(run.lo) + '° and ' + deg(run.lo + run.len) + '°', 350, 30, { size: 13, weight: 800, align: 'center', color: COL.red });
    },
    graph: {
      title: 'Rocker angle (degrees)', min: 0, max: 180, ticks: [{ v: 45, label: '45°' }, { v: 90, label: '90°' }, { v: 135, label: '135°' }],
      series: [{ name: 'rocker', color: COL.red, f: (t, p) => solve(crankAt(t, p), p).rock * 180 / Math.PI }],
      readout(a, p) { const v = ((solve(crankAt(a, p), p).rock * 180 / Math.PI) % 360 + 360) % 360, run = info(p).run; return { big: v.toFixed(0) + '°', small: !run ? 'the bars cannot join into a loop' : run.full ? 'rocker angle (swing ' + info(p).swing.toFixed(0) + '°)' : 'not Grashof: the crank only rocks back and forth, so the rocker swings ' + info(p).swing.toFixed(0) + '°' }; }
    }
  });
})();
