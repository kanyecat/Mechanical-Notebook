MM.addMath('trammel', {
  inputs: [
    { key: 'd', label: 'Pin spacing on the rod', sym: 'd', unit: 'mm', value: 110, min: 5, max: 2000, step: 1 },
    { key: 't', param: 't', label: 'Pen position ÷ pin spacing', sym: 't' }
  ],
  outputs(v, a) {
    const f = MM.num, A = v.d * Math.abs(1 - v.t), B = v.d * v.t, hi = Math.max(A, B), lo = Math.min(A, B);
    const h = ((A - B) / (A + B)) ** 2, per = Math.PI * (A + B) * (1 + 3 * h / (10 + Math.sqrt(4 - 3 * h)));
    return [
      { key: 'A', label: 'Semi-axis along the horizontal slot', sym: 'a', expr: 'd |1 − t|', sub: `${v.d} × |1 − ${f(v.t, 2)}|`, value: A, unit: ' mm', dp: 1 },
      { key: 'B', label: 'Semi-axis along the vertical slot', sym: 'b', expr: 'd t', sub: `${v.d} × ${f(v.t, 2)}`, value: B, unit: ' mm', dp: 1 },
      { key: 'area', label: 'Ellipse area', sym: 'A', expr: 'π a b', sub: `π × ${f(A, 1)} × ${f(B, 1)}`, value: Math.PI * A * B, unit: ' mm²', dp: 0 },
      { key: 'per', label: 'Perimeter (Ramanujan)', sym: 'P', expr: 'π(a+b)(1 + 3h ÷ (10 + √(4 − 3h)))', sub: `h = ${f(h, 4)}`, value: per, unit: ' mm', dp: 1 },
      { key: 'e', label: 'Eccentricity', sym: 'e', expr: '√(1 − (short ÷ long)²)', sub: '', value: hi > 0 ? Math.sqrt(1 - (lo / hi) ** 2) : 0, unit: '', dp: 3 },
      { key: 'px', label: 'Pen position now', sym: '(x, y)', expr: '(a cos θ, b sin θ)', sub: '', value: `${f(v.d * (1 - v.t) * Math.cos(a), 1)}, ${f(B * Math.sin(a), 1)}`, unit: ' mm', live: true }
    ];
  },
  problems: [
    () => { const d = MM.pick([100, 110, 120]), t = MM.pick([0.25, 0.4, 0.6, 1.5]); const A = d * Math.abs(1 - t), B = d * t; return { text: `Pins ${d} mm apart, pen at t = ${t} along the rod. What is the ellipse's area?`, answer: Math.PI * A * B, unit: 'mm²', tol: 0.01, hint: 'Semi-axes are d|1 − t| and d t.', steps: [`a = ${MM.num(A, 1)} mm, b = ${MM.num(B, 1)} mm`, `area = π a b = ${MM.num(Math.PI * A * B, 0)} mm²`], set: { d, t } }; },
    () => { const d = 100, b = MM.pick([20, 30, 40, 70]); return { text: `Pins 100 mm apart. You want the vertical semi-axis to be ${b} mm. What value of t puts the pen there? (Pen between the pins.)`, answer: b / d, unit: '', tol: 0.001, hint: 'b = d t.', steps: [`t = b ÷ d = ${b} ÷ 100 = ${b / 100}`], set: { d, t: b / 100 } }; }
  ],
  challenges: [
    { title: 'Draw a circle', goal: 'Semi-axes equal: the pen draws a circle.', check: v => Math.abs(v.A - v.B) < 1e-6, hint: 'Pen at the middle of the rod.' },
    { title: 'Oval mirror', goal: 'Ellipse of exactly 66 × 44 mm semi-axes (either way round) with pins 110 mm apart.', check: v => v.d === 110 && ((Math.abs(v.A - 66) < 1e-6 && Math.abs(v.B - 44) < 1e-6) || (Math.abs(v.A - 44) < 1e-6 && Math.abs(v.B - 66) < 1e-6)), hint: 'With the pen between pins, a + b = d.' }
  ]
});
