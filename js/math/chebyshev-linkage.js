(function () {
  // the linkage in units where the frame is 2 (side links 2.5, top link 1); P's height error for a stroke of `st` units
  const solve = phi => {
    const A = [2 + 2.5 * Math.cos(phi), 2.5 * Math.sin(phi)], dx = -A[0], dy = -A[1], d = Math.hypot(dx, dy);
    if (d > 3.5 || d < 1.5) return null;
    const k = (1 - 6.25 + d * d) / (2 * d), h = Math.sqrt(Math.max(1 - k * k, 0)), mx = A[0] + k * dx / d, my = A[1] + k * dy / d;
    const s1 = [mx + h * dy / d, my - h * dx / d], s2 = [mx - h * dy / d, my + h * dx / d], B = s1[0] > s2[0] ? s1 : s2;
    return [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
  };
  const PHI0 = Math.atan2(2, -1.5), px = f => { const q = solve(f); return q ? q[0] : NaN; }, dir = px(PHI0 + 0.01) > px(PHI0) ? 1 : -1;
  const phiFor = x => { let lo = PHI0 - 0.7, hi = PHI0 + 0.7; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2, v = px(m); if (isNaN(v) ? m < PHI0 : (v < x) === (dir > 0)) lo = m; else hi = m; } return (lo + hi) / 2; };
  const dev = st => { let lo = Infinity, hi = -Infinity; for (let i = 0; i <= 200; i++) { const q = solve(phiFor(1 + st * (i / 200 - 0.5))); if (q) { lo = Math.min(lo, q[1]); hi = Math.max(hi, q[1]); } } return hi - lo; };
  MM.addMath('chebyshev-linkage', {
    inputs: [
      { key: 'L', label: 'Frame (distance between fixed pivots)', sym: 'L', unit: 'mm', value: 200, min: 10, max: 5000, step: 1 },
      { key: 's', label: 'Stroke you need', sym: 's', unit: 'mm', value: 140, min: 1, max: 5000, step: 1 }
    ],
    outputs(v) {
      const f = MM.num, u = v.L / 2, st = v.s / u, ok = st <= 2.05;
      return [
        { key: 'side', label: 'Each crossed side link', sym: 'b', expr: '1.25 × L', sub: `1.25 × ${f(v.L)}`, value: 1.25 * v.L, unit: ' mm' },
        { key: 'top', label: 'Top link', sym: 'c', expr: '0.5 × L', sub: `0.5 × ${f(v.L)}`, value: 0.5 * v.L, unit: ' mm' },
        { key: 'h', label: 'Height of the line above the pivots', sym: 'h', expr: '1 × L', sub: '', value: v.L, unit: ' mm' },
        { key: 'fit', label: 'Stroke within the straight part?', expr: 's ≤ about L', sub: `${f(v.s)} vs ${f(v.L)}`, value: ok ? 'Yes' : 'No: make the frame longer', warn: !ok },
        { key: 'e', label: 'Rise and fall of P over the stroke', sym: 'e', expr: 'worked out by solving the linkage', sub: '', value: ok ? dev(st) * u : NaN, unit: ' mm', dp: 3 }
      ];
    },
    problems: [
      () => { const L = MM.pick([80, 120, 160, 240, 300]); return { text: `A Chebyshev linkage has a frame of ${L} mm. How long is each crossed side link?`, answer: 1.25 * L, unit: 'mm', tol: 0, hint: 'The lengths are frame : side : top = 2 : 2.5 : 1.', steps: [`side = 2.5 ÷ 2 × ${L} = ${1.25 * L} mm`], set: { L } }; },
      () => { const L = MM.pick([80, 120, 160, 240, 300]); return { text: `Same ratios, frame ${L} mm. How long is the top link, whose middle point traces the line?`, answer: 0.5 * L, unit: 'mm', tol: 0, hint: 'top = frame ÷ 2.', steps: [`top = ${L} ÷ 2 = ${0.5 * L} mm`], set: { L } }; }
    ],
    challenges: [
      { title: 'A straight guide for a pen', goal: 'A stroke of 150 mm with P rising and falling by less than 0.6 mm.', check: v => v.s >= 150 && v.fit === 'Yes' && v.e < 0.6, hint: 'The error is a small share of the frame, so a huge frame is not the answer. Try a frame a little longer than the stroke.' },
      { title: 'Small and straight', goal: 'A frame of 100 mm or less, a stroke of 50 mm or more, and an error under 0.25 mm.', check: v => v.L <= 100 && v.s >= 50 && v.fit === 'Yes' && v.e < 0.25, hint: 'Keep the stroke to about half the frame.' }
    ]
  });
})();
