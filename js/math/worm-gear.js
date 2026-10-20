MM.addMath('worm-gear', {
  inputs: [
    { key: 'n', param: 'n', sym: 'N' }, { key: 'z', param: 'starts', sym: 'z' },
    { key: 'm', label: 'Module', sym: 'm', unit: 'mm', value: 2, min: 0.5, max: 10, step: 0.5 },
    { key: 'dw', label: 'Worm pitch diameter', sym: 'd₁', unit: 'mm', value: 20, min: 5, max: 200, step: 1 },
    { key: 'mu', label: 'Friction coefficient', sym: 'μ', unit: '', value: 0.08, min: 0.01, max: 0.3, step: 0.01 },
    { key: 'rpm', label: 'Worm speed', sym: 'n₁', unit: 'rpm', value: 1440, min: 1, max: 10000, step: 1 }
  ],
  outputs(v) {
    const f = MM.num, i = v.n / v.z, lead = v.z * Math.PI * v.m, lam = Math.atan(lead / (Math.PI * v.dw)), phi = Math.atan(v.mu), eff = Math.tan(lam) / Math.tan(lam + phi), deg = 180 / Math.PI;
    return [
      { key: 'i', label: 'Reduction ratio', sym: 'i', expr: 'N ÷ z', sub: `${v.n} ÷ ${v.z}`, value: i, unit: ' : 1', dp: 1 },
      { key: 'n2', label: 'Wheel speed', sym: 'n₂', expr: 'n₁ ÷ i', sub: `${f(v.rpm, 0)} ÷ ${f(i, 1)}`, value: v.rpm / i, unit: ' rpm' },
      { key: 'lead', label: 'Lead (advance per worm turn)', sym: 'L', expr: 'z × π × m', sub: `${v.z} × π × ${f(v.m, 1)}`, value: lead, unit: ' mm' },
      { key: 'lam', label: 'Lead angle', sym: 'λ', expr: 'atan(L ÷ π d₁)', sub: `atan(${f(lead)} ÷ (π × ${v.dw}))`, value: lam * deg, unit: '°', dp: 2 },
      { key: 'phi', label: 'Friction angle', sym: 'φ', expr: 'atan(μ)', sub: `atan(${v.mu})`, value: phi * deg, unit: '°', dp: 2 },
      { key: 'eff', label: 'Efficiency (worm driving)', sym: 'η', expr: 'tan λ ÷ tan(λ + φ)', sub: '', value: eff * 100, unit: ' %', dp: 0 },
      { key: 'lock', label: 'Self-locking?', expr: 'λ < φ', sub: `${f(lam * deg, 2)}° vs ${f(phi * deg, 2)}°`, value: lam < phi ? 'Yes' : 'No' }
    ];
  },
  problems: [
    () => { const n = MM.pick([20, 24, 30, 36, 40, 48]), z = MM.pick([1, 2, 3]), rpm = MM.pick([960, 1440, 2880]); return { text: `A ${z}-start worm at ${rpm} rpm drives a ${n}-tooth wheel. How fast does the wheel turn?`, answer: rpm * z / n, unit: 'rpm', hint: 'Each worm turn moves the wheel on by z teeth.', steps: [`i = N ÷ z = ${n} ÷ ${z} = ${MM.num(n / z, 2)}`, `n₂ = ${rpm} ÷ ${MM.num(n / z, 2)} = ${MM.num(rpm * z / n, 1)} rpm`], set: { n: Math.min(n, 48), z } }; },
    () => { const z = MM.pick([1, 2]), m = MM.pick([2, 2.5, 3]), dw = MM.pick([20, 25, 30]); const lam = Math.atan(z * Math.PI * m / (Math.PI * dw)) * 180 / Math.PI; return { text: `A ${z}-start worm has module ${m} mm and pitch diameter ${dw} mm. What is its lead angle in degrees?`, answer: lam, unit: '°', hint: 'tan λ = lead ÷ (π d₁), and lead = z π m.', steps: [`L = ${z} × π × ${m} = ${MM.num(z * Math.PI * m, 2)} mm`, `tan λ = ${MM.num(z * Math.PI * m, 2)} ÷ (π × ${dw}) = ${MM.num(z * m / dw, 4)}`, `λ = ${MM.num(lam, 2)}°`], set: { z, m, dw } }; }
  ],
  challenges: [
    { title: 'Hoist that holds its load', goal: 'Ratio of 20 : 1 or more and self-locking with μ = 0.08.', check: v => v.i >= 20 && v.mu === 0.08 && v.lock === 'Yes', hint: 'Self-locking needs λ < φ ≈ 4.6°. Use one start and a fat worm.' },
    { title: 'Efficient drive', goal: 'Efficiency of 70% or more and a ratio of at least 10 : 1.', check: v => v.eff >= 70 && v.i >= 10, hint: 'More starts raise λ and the efficiency, but lower the ratio. Add wheel teeth to keep the ratio.' }
  ]
});
