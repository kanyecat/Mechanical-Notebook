MM.addMath('spring', {
  inputs: [
    { key: 'd', param: 'd', label: 'Wire diameter', sym: 'd' },
    { key: 'D', param: 'D', label: 'Mean coil diameter', sym: 'D' },
    { key: 'n', param: 'n', label: 'Active coils', sym: 'n' },
    { key: 'x', label: 'How far you squash it', sym: 'x', unit: 'mm', value: 10, min: 0, max: 500, step: 0.5 },
    { key: 'G', label: 'Shear modulus (steel 79 300)', sym: 'G', unit: 'MPa', value: 79300, min: 10000, max: 100000, step: 100 }
  ],
  outputs(v) {
    const f = MM.num, k = v.G * Math.pow(v.d, 4) / (8 * Math.pow(v.D, 3) * v.n), F = k * v.x, C = v.D / v.d, Kw = (4 * C - 1) / (4 * C - 4) + 0.615 / C, tau = Kw * 8 * F * v.D / (Math.PI * Math.pow(v.d, 3));
    const Ls = (v.n + 2) * v.d;
    return [
      { key: 'k', label: 'Spring rate', sym: 'k', expr: 'G d⁴ ÷ (8 D³ n)', sub: `${v.G} × ${v.d}⁴ ÷ (8 × ${v.D}³ × ${v.n})`, value: k, unit: ' N/mm', dp: 2 },
      { key: 'F', label: 'Force at that squash', sym: 'F', expr: 'k × x', sub: `${f(k, 2)} × ${v.x}`, value: F, unit: ' N', dp: 1 },
      { key: 'C', label: 'Spring index', sym: 'C', expr: 'D ÷ d', value: C, unit: '', dp: 1, warn: C < 4 || C > 12 },
      { key: 'Kw', label: 'Wahl factor', sym: 'Kw', expr: '(4C − 1) ÷ (4C − 4) + 0.615 ÷ C', value: Kw, unit: '', dp: 3 },
      { key: 'tau', label: 'Shear stress in the wire', sym: 'τ', expr: 'Kw × 8 F D ÷ (π d³)', value: tau, unit: ' MPa', dp: 0, warn: tau > 800 },
      { key: 'Ls', label: 'Solid length (ends closed)', sym: 'Ls', expr: '(n + 2) × d', value: Ls, unit: ' mm', dp: 1 },
      { key: 'E', label: 'Energy stored', sym: 'U', expr: '½ k x²', value: 0.5 * k * v.x * v.x / 1000, unit: ' J', dp: 3 }
    ];
  },
  problems: [
    () => { const d = MM.pick([1.5, 2, 2.5]), D = MM.pick([15, 20, 25]), n = MM.pick([6, 8, 10]), k = 79300 * Math.pow(d, 4) / (8 * Math.pow(D, 3) * n); return { text: `A steel spring has ${d} mm wire, a ${D} mm mean coil diameter and ${n} active coils. What is its spring rate? (G = 79 300 MPa)`, answer: k, unit: 'N/mm', tol: 0.03, hint: 'k = G d⁴ / (8 D³ n).', steps: [`d⁴ = ${MM.num(Math.pow(d, 4), 3)}, D³ = ${Math.pow(D, 3)}`, `k = 79 300 × ${MM.num(Math.pow(d, 4), 3)} / (8 × ${Math.pow(D, 3)} × ${n}) = ${MM.num(k, 2)} N/mm`], set: { d, D, n } }; },
    () => { const k = MM.pick([2, 3.5, 5]), x = MM.pick([8, 12, 20]); return { text: `A spring with k = ${k} N/mm is squashed ${x} mm. What force does it push back with?`, answer: k * x, unit: 'N', hint: 'Hooke\'s law: F = k × x.', steps: [`F = ${k} × ${x} = ${k * x} N`] }; },
    () => { return { text: 'If you double the wire diameter of a spring and keep everything else the same, how many times stiffer does it get?', answer: 16, unit: '×', hint: 'k grows with d⁴.', steps: ['k ∝ d⁴', '2⁴ = 16 times stiffer'] }; }
  ],
  challenges: [
    { title: 'Soft spring', goal: 'A rate between 0.2 and 0.4 N/mm with a 12 mm coil and wire thinner than 1.2 mm.', check: v => v.D === 12 && v.d < 1.2 && v.k >= 0.2 && v.k <= 0.4, hint: 'Thin wire and plenty of coils make a soft spring.' },
    { title: 'Strong but safe', goal: 'Push with at least 200 N while keeping the wire stress under 800 MPa and the spring index between 5 and 10.', check: v => v.F >= 200 && v.tau < 800 && v.C >= 5 && v.C <= 10, hint: 'Thicker wire lowers stress quickly (d³ in the formula).' }
  ]
});
