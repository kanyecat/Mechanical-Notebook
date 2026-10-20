MM.addMath('peaucellier', {
  inputs: [
    { key: 'L', label: 'Long bars', sym: 'L', unit: 'mm', value: 200, min: 10, max: 2000, step: 1 },
    { key: 's', label: 'Short bars (rhombus)', sym: 's', unit: 'mm', value: 100, min: 5, max: 2000, step: 1 },
    { key: 'd', label: 'Input lever', sym: 'd', unit: 'mm', value: 75, min: 5, max: 2000, step: 1 },
    { key: 'sw', param: 'swing', sym: 'ψ' }
  ],
  outputs(v) {
    const f = MM.num, k = v.L * v.L - v.s * v.s, x = k / (2 * v.d), psi = v.sw * Math.PI / 180, travel = 2 * x * Math.tan(psi);
    const OQmin = 2 * v.d * Math.cos(psi), ok = v.L > v.s && OQmin >= v.L - v.s && k / OQmin <= v.L + v.s;
    return [
      { key: 'k', label: 'Inversion constant', sym: 'OP × OQ', expr: 'L² − s²', sub: `${v.L}² − ${v.s}²`, value: k, unit: ' mm²', dp: 0 },
      { key: 'x', label: 'Straight line distance from O', sym: 'x', expr: '(L² − s²) ÷ 2d', sub: `${f(k, 0)} ÷ ${2 * v.d}`, value: x, unit: ' mm' },
      { key: 'travel', label: 'Length of straight line drawn', sym: 'y', expr: '2 x tan ψ', sub: `2 × ${f(x)} × tan ${v.sw}°`, value: travel, unit: ' mm' },
      { key: 'ok', label: 'Bars can reach at full swing?', expr: 'L − s ≤ OQ and OP ≤ L + s', sub: `OQ = ${f(OQmin)}, OP = ${f(k / OQmin)}`, value: ok ? 'Yes' : 'No', warn: !ok }
    ];
  },
  problems: [
    () => { const L = MM.pick([150, 200, 250]), s = MM.pick([60, 80, 100]); return { text: `A Peaucellier linkage has long bars of ${L} mm and short bars of ${s} mm. What is the constant product OP × OQ?`, answer: L * L - s * s, unit: 'mm²', tol: 0, hint: 'It comes from the two right triangles inside the rhombus.', steps: [`OP × OQ = L² − s² = ${L * L} − ${s * s} = ${L * L - s * s} mm²`] }; },
    () => { const L = 200, s = 100, d = MM.pick([60, 75, 100, 120]); return { text: `With L = 200 mm, s = 100 mm and an input lever d = ${d} mm, how far from O is the straight line?`, answer: 30000 / (2 * d), unit: 'mm', tol: 0.01, hint: 'Q moves on a circle of diameter 2d through O. Its inverse is a line at distance k/(2d).', steps: [`k = 200² − 100² = 30 000`, `x = 30 000 ÷ (2 × ${d}) = ${MM.num(30000 / (2 * d), 1)} mm`], set: { L, s, d } }; }
  ],
  challenges: [
    { title: 'Line at 150 mm', goal: 'Straight line exactly 150 mm from O, with L = 200 and s = 100.', check: v => v.L === 200 && v.s === 100 && Math.abs(v.x - 150) < 1e-6, hint: 'Solve x = k ÷ 2d for d.' },
    { title: 'Long straight stroke', goal: 'Draw a straight line of 250 mm or more, with a swing of 35° or less, and bars that reach.', check: v => v.travel >= 250 && v.sw <= 35 && v.ok === 'Yes', hint: 'travel = 2x tan ψ. Increase x, but check the bars still reach.' }
  ]
});
