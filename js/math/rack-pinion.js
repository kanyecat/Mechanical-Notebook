MM.addMath('rack-pinion', {
  inputs: [
    { key: 'n', param: 'n', sym: 'N' },
    { key: 'm', label: 'Module', sym: 'm', unit: 'mm', value: 2, min: 0.5, max: 10, step: 0.5 },
    { key: 'rpm', label: 'Pinion speed', sym: 'n', unit: 'rpm', value: 60, min: 1, max: 5000, step: 1 },
    { key: 'T', label: 'Pinion torque', sym: 'T', unit: 'N·m', value: 5, min: 0, max: 5000, step: 0.1 }
  ],
  outputs(v, a) {
    const f = MM.num, d = v.m * v.n, s = Math.PI * d, sp = s * v.rpm / 60000, F = v.T / (d / 2000), turn = (((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) / (2 * Math.PI);
    return [
      { key: 'd', label: 'Pitch diameter', sym: 'd', expr: 'm × N', sub: `${f(v.m, 1)} × ${v.n}`, value: d, unit: ' mm' },
      { key: 's', label: 'Rack travel per turn', sym: 's', expr: 'π × d', sub: `π × ${f(d)}`, value: s, unit: ' mm' },
      { key: 'v', label: 'Rack speed', sym: 'v', expr: 's × n ÷ 60 000', sub: `${f(s)} × ${f(v.rpm, 0)} ÷ 60 000`, value: sp, unit: ' m/s', dp: 3 },
      { key: 'F', label: 'Push on the rack', sym: 'F', expr: 'T ÷ (d/2)', sub: `${f(v.T)} ÷ ${f(d / 2000, 4)} m`, value: F, unit: ' N' },
      { key: 'x', label: 'Travel since the last full turn', sym: 'x', expr: 's × (θ ÷ 360°)', sub: `${f(s)} × ${f(turn, 2)}`, value: s * turn, unit: ' mm', live: true }
    ];
  },
  problems: [
    () => { const n = MM.rnd(10, 24), m = MM.pick([1, 1.5, 2, 3]); return { text: `A ${n}-tooth pinion with module ${m} mm makes one full turn. How far does the rack move?`, answer: Math.PI * m * n, unit: 'mm', hint: 'The rack moves one pitch-circle circumference per turn.', steps: [`d = m × N = ${m} × ${n} = ${m * n} mm`, `s = π d = π × ${m * n} = ${MM.num(Math.PI * m * n, 1)} mm`], set: { n, m } }; },
    () => { const n = MM.rnd(12, 20), m = 2, T = MM.pick([2, 4, 6, 10]); const d = m * n; return { text: `A steering pinion has ${n} teeth, module 2 mm, and the driver puts ${T} N·m on it. What force pushes the rack?`, answer: T / (d / 2000), unit: 'N', hint: 'Force = torque ÷ radius. Use the pitch radius in metres.', steps: [`d = 2 × ${n} = ${d} mm, so r = ${d / 2} mm = ${d / 2000} m`, `F = T ÷ r = ${T} ÷ ${d / 2000} = ${MM.num(T / (d / 2000), 0)} N`], set: { n, m, T } }; },
    () => { const n = MM.rnd(12, 24), m = MM.pick([1, 2]), L = MM.pick([300, 500, 800]); const s = Math.PI * m * n; return { text: `A 3D-printer axis uses a ${n}-tooth pinion (module ${m} mm). How many pinion turns move the carriage ${L} mm?`, answer: L / s, unit: 'turns', hint: 'Find the travel per turn first.', steps: [`s = π × ${m} × ${n} = ${MM.num(s, 2)} mm per turn`, `turns = ${L} ÷ ${MM.num(s, 2)} = ${MM.num(L / s, 2)}`], set: { n, m } }; }
  ],
  challenges: [
    { title: '100 mm per turn', goal: 'Rack travel per turn within 1% of 100 mm, module 2 mm.', check: v => v.m === 2 && Math.abs(v.s - 100) <= 1, hint: 'π × 2 × N ≈ 100, so N ≈ 15.9.' },
    { title: 'Strong push', goal: 'At least 1000 N on the rack from 8 N·m, with 12 or more teeth.', check: v => v.T === 8 && v.n >= 12 && v.F >= 1000, hint: 'F = T/(mN/2000). A smaller pitch diameter gives more force: lower the module.' }
  ]
});
