MM.addMath('oscillating-cylinder', {
  inputs: [
    { key: 'k', param: 'k', label: 'Trunnion distance ÷ crank', sym: 'd/r' },
    { key: 'r', label: 'Crank radius', sym: 'r', unit: 'mm', value: 8, min: 1, max: 500, step: 0.5 },
    { key: 'b', label: 'Bore', sym: 'b', unit: 'mm', value: 12, min: 1, max: 500, step: 0.5 },
    { key: 'pr', label: 'Steam or air pressure (gauge)', sym: 'p', unit: 'bar', value: 2, min: 0.1, max: 30, step: 0.1 },
    { key: 'rpm', label: 'Speed', sym: 'n', unit: 'rpm', value: 600, min: 1, max: 5000, step: 10 }
  ],
  outputs(v) {
    const f = MM.num, A = Math.PI / 4 * v.b * v.b, F = v.pr * 0.1 * A, W = F * 2 * v.r / 1000, sw = Math.asin(1 / v.k) * 180 / Math.PI;
    return [
      { key: 'S', label: 'Stroke', sym: 'S', expr: '2r', sub: `2 × ${f(v.r, 1)}`, value: 2 * v.r, unit: ' mm', dp: 1 },
      { key: 'sw', label: 'Largest swing', sym: 'γ', expr: 'sin⁻¹(r ÷ d)', sub: `sin⁻¹(1 ÷ ${f(v.k, 1)})`, value: sw, unit: '°', dp: 1 },
      { key: 'F', label: 'Force on the piston', sym: 'F', expr: 'p A', sub: `${f(v.pr, 1)} bar × ${f(A, 1)} mm²`, value: F, unit: ' N', dp: 1 },
      { key: 'W', label: 'Work per turn (single acting)', sym: 'W', expr: 'F × 2r', sub: `${f(F, 1)} × ${f(2 * v.r / 1000, 3)}`, value: W, unit: ' J', dp: 3 },
      { key: 'P', label: 'Power, ignoring losses', sym: 'P', expr: 'W × n ÷ 60', sub: `${f(W, 3)} × ${f(v.rpm, 0)} ÷ 60`, value: W * v.rpm / 60, unit: ' W', dp: 2 }
    ];
  },
  problems: [
    () => { const k = MM.pick([2.5, 3, 4]); return { text: `The trunnion is ${k} crank radii from the crank centre. What is the largest swing of the cylinder?`, answer: Math.asin(1 / k) * 180 / Math.PI, unit: '°', tol: 0.01, hint: 'γ = sin⁻¹(r ÷ d).', steps: [`γ = sin⁻¹(1 ÷ ${k}) = ${MM.num(Math.asin(1 / k) * 180 / Math.PI, 1)}°`], set: { k } }; },
    () => { const b = MM.pick([10, 12, 16, 20]), p = MM.pick([1, 2, 3]); const F = p * 0.1 * Math.PI / 4 * b * b; return { text: `A ${b} mm bore cylinder runs on ${p} bar. What force does the piston make?`, answer: F, unit: 'N', tol: 0.01, hint: '1 bar = 0.1 N/mm². F = p × π b² ÷ 4.', steps: [`A = π × ${b}² ÷ 4 = ${MM.num(Math.PI / 4 * b * b, 1)} mm²`, `F = ${p * 0.1} × ${MM.num(Math.PI / 4 * b * b, 1)} = ${MM.num(F, 1)} N`], set: { b, pr: p } }; }
  ],
  challenges: [{ title: 'One watt', goal: 'Make about 1 W (0.95 to 1.05) at 2 bar.', check: v => Math.abs(v.pr - 2) < 1e-9 && v.P >= 0.95 && v.P <= 1.05, hint: 'Power grows with bore², stroke and speed.' }]
});
