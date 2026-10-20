MM.addMath('spur-gears', {
  inputs: [
    { key: 'n1', param: 'n1', sym: 'N₁' }, { key: 'n2', param: 'n2', sym: 'N₂' },
    { key: 'm', label: 'Module (tooth size)', sym: 'm', unit: 'mm', value: 2, min: 0.5, max: 10, step: 0.5 },
    { key: 'rpm', label: 'Driver speed', sym: 'n₁', unit: 'rpm', value: 1200, min: 1, max: 20000, step: 1 },
    { key: 'T1', label: 'Driver torque', sym: 'T₁', unit: 'N·m', value: 10, min: 0, max: 10000, step: 0.1 }
  ],
  outputs(v) {
    const f = MM.num, i = v.n2 / v.n1, d1 = v.m * v.n1, d2 = v.m * v.n2, C = (d1 + d2) / 2, n2 = v.rpm / i, T2 = v.T1 * i, vp = Math.PI * d1 / 1000 * v.rpm / 60;
    return [
      { key: 'i', label: 'Gear ratio', sym: 'i', expr: 'N₂ ÷ N₁', sub: `${v.n2} ÷ ${v.n1}`, value: i, dp: 3, unit: ' : 1' },
      { key: 'd1', label: 'Driver pitch diameter', sym: 'd₁', expr: 'm × N₁', sub: `${f(v.m, 1)} × ${v.n1}`, value: d1, unit: ' mm' },
      { key: 'd2', label: 'Driven pitch diameter', sym: 'd₂', expr: 'm × N₂', sub: `${f(v.m, 1)} × ${v.n2}`, value: d2, unit: ' mm' },
      { key: 'C', label: 'Centre distance', sym: 'C', expr: '(d₁ + d₂) ÷ 2', sub: `(${f(d1)} + ${f(d2)}) ÷ 2`, value: C, unit: ' mm' },
      { key: 'n2', label: 'Driven speed', sym: 'n₂', expr: 'n₁ ÷ i', sub: `${f(v.rpm, 0)} ÷ ${f(i, 3)}`, value: n2, unit: ' rpm' },
      { key: 'T2', label: 'Driven torque (no losses)', sym: 'T₂', expr: 'T₁ × i', sub: `${f(v.T1)} × ${f(i, 3)}`, value: T2, unit: ' N·m' },
      { key: 'vp', label: 'Pitch-line speed', sym: 'v', expr: 'π d₁ n₁ ÷ 60 000', sub: `π × ${f(d1)} × ${f(v.rpm, 0)} ÷ 60 000`, value: vp, unit: ' m/s' }
    ];
  },
  problems: [
    () => { const n1 = MM.rnd(10, 20), n2 = MM.rnd(n1 + 4, 40), rpm = MM.pick([600, 900, 1200, 1500, 1800]);
      return { text: `A ${n1}-tooth pinion turns at ${rpm} rpm and drives a ${n2}-tooth gear. How fast does the gear turn?`, answer: rpm * n1 / n2, unit: 'rpm', hint: 'The speeds are in the inverse ratio of the tooth counts.',
        steps: [`Ratio i = N₂ ÷ N₁ = ${n2} ÷ ${n1} = ${MM.num(n2 / n1, 3)}`, `n₂ = n₁ ÷ i = ${rpm} ÷ ${MM.num(n2 / n1, 3)} = ${MM.num(rpm * n1 / n2, 1)} rpm`], set: { n1, n2, rpm } }; },
    () => { const n1 = MM.rnd(10, 24), n2 = MM.rnd(16, 40), m = MM.pick([1, 1.5, 2, 2.5, 3]);
      return { text: `Two spur gears with module ${m} mm have ${n1} and ${n2} teeth. What is the centre distance between their shafts?`, answer: m * (n1 + n2) / 2, unit: 'mm', hint: 'Pitch diameter = module × teeth. The pitch circles touch.',
        steps: [`d₁ = ${m} × ${n1} = ${m * n1} mm, d₂ = ${m} × ${n2} = ${m * n2} mm`, `C = (d₁ + d₂) ÷ 2 = ${MM.num(m * (n1 + n2) / 2, 1)} mm`], set: { n1, n2, m } }; },
    () => { const n1 = MM.rnd(10, 16), n2 = MM.rnd(24, 40), T = MM.pick([5, 8, 12, 20]);
      return { text: `A motor gives ${T} N·m to a ${n1}-tooth pinion driving a ${n2}-tooth gear. Ignoring friction, what torque comes out of the gear shaft?`, answer: T * n2 / n1, unit: 'N·m', hint: 'Power is the same on both shafts, so torque goes up as speed goes down.',
        steps: [`i = ${n2} ÷ ${n1} = ${MM.num(n2 / n1, 3)}`, `T₂ = T₁ × i = ${T} × ${MM.num(n2 / n1, 3)} = ${MM.num(T * n2 / n1, 2)} N·m`], set: { n1, n2, T1: T } }; }
  ],
  challenges: [
    { title: 'Exact 2.5 : 1', goal: 'Gear ratio exactly 2.5 : 1 and centre distance 42 mm, with module 2 mm.', check: v => Math.abs(v.i - 2.5) < 1e-9 && Math.abs(v.C - 42) < 1e-9 && v.m === 2, hint: 'C = m(N₁ + N₂)/2, so N₁ + N₂ = 42. Also N₂ = 2.5 N₁.' },
    { title: 'Slow it down for a conveyor', goal: 'A 1450 rpm motor must drive a roller at 480–500 rpm in one stage.', check: v => v.rpm === 1450 && v.n2 >= 480 && v.n2 <= 500, hint: 'Aim for a ratio near 1450 ÷ 490 ≈ 2.96.' },
    { title: 'Keep the teeth quiet', goal: 'Pitch-line speed under 5 m/s with the driver at 3000 rpm and at least 14 teeth on the pinion.', check: v => v.rpm === 3000 && v.n1 >= 14 && v.vp < 5, hint: 'v = π d₁ n₁ / 60 000. Make the pinion small: low module and few teeth.' }
  ]
});
