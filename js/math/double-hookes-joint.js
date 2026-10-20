MM.addMath('double-hookes-joint', {
  inputs: [
    { key: 'b', param: 'beta', sym: 'β' }, { key: 'ph', param: 'phase' },
    { key: 'rpm', label: 'Input speed', sym: 'n', unit: 'rpm', value: 1000, min: 1, max: 10000, step: 1 }
  ],
  outputs(v, a) {
    const f = MM.num, B = v.b * Math.PI / 180, c = Math.cos(B), now = c / (c * c * Math.cos(a) ** 2 + Math.sin(a) ** 2);
    const outMax = v.ph ? 1 : 1 / (c * c), outMin = v.ph ? 1 : c * c;
    return [
      { key: 'smax', label: 'One joint: fastest output', sym: 'n_max', expr: 'n ÷ cos β', sub: `${f(v.rpm, 0)} ÷ ${f(c, 4)}`, value: v.rpm / c, unit: ' rpm' },
      { key: 'smin', label: 'One joint: slowest output', sym: 'n_min', expr: 'n × cos β', sub: `${f(v.rpm, 0)} × ${f(c, 4)}`, value: v.rpm * c, unit: ' rpm' },
      { key: 'fl', label: 'One joint: speed swing', expr: '(1/cos β − cos β) × 100', sub: '', value: (1 / c - c) * 100, unit: ' %', dp: 1 },
      { key: 'mid', label: 'Middle shaft speed now', sym: 'n₂', expr: 'n cos β ÷ (1 − sin²β sin²θ)', sub: '', value: v.rpm * now, unit: ' rpm', live: true },
      { key: 'omax', label: v.ph ? 'Output speed (yokes in line)' : 'Output: fastest (yokes at 90°)', sym: 'n₃', expr: v.ph ? 'n (the swings cancel)' : 'n ÷ cos²β', sub: '', value: v.rpm * outMax, unit: ' rpm' },
      { key: 'omin', label: v.ph ? 'Output speed swing' : 'Output: slowest', expr: v.ph ? 'none' : 'n × cos²β', sub: '', value: v.ph ? 0 : v.rpm * outMin, unit: v.ph ? ' %' : ' rpm' }
    ];
  },
  problems: [
    () => { const b = MM.pick([10, 15, 20, 25, 30, 40]), n = MM.pick([600, 1000, 1500]); return { text: `A single universal joint runs at ${b}° with the input at ${n} rpm. What is the fastest the output turns?`, answer: n / Math.cos(b * Math.PI / 180), unit: 'rpm', tol: 0.005, hint: 'Fastest = n ÷ cos β.', steps: [`cos ${b}° = ${MM.num(Math.cos(b * Math.PI / 180), 4)}`, `n_max = ${n} ÷ ${MM.num(Math.cos(b * Math.PI / 180), 4)} = ${MM.num(n / Math.cos(b * Math.PI / 180), 1)} rpm`], set: { b, rpm: n } }; },
    () => { const p = MM.pick([5, 10, 20]); const c = (-p / 100 + Math.sqrt((p / 100) ** 2 + 4)) / 2, b = Math.acos(c) * 180 / Math.PI; return { text: `What is the largest joint angle that keeps a single universal joint's speed swing (1/cos β − cos β) under ${p}%?`, answer: b, unit: '°', tol: 0.01, hint: 'Set 1/c − c = p and solve the quadratic c² + p c − 1 = 0.', steps: [`c² + ${p / 100} c − 1 = 0 → c = ${MM.num(c, 4)}`, `β = acos(${MM.num(c, 4)}) = ${MM.num(b, 2)}°`] }; }
  ],
  challenges: [
    { title: 'Worst case', goal: 'Set up the double joint so the output swings between half and double the input speed.', check: v => v.ph === 0 && Math.abs(v.omax / v.rpm - 2) < 0.01, hint: 'Out of phase, the output peaks at n ÷ cos²β. Solve cos²β = 1/2.' },
    { title: 'Within 10% on one joint', goal: 'The biggest joint angle that keeps a single joint\'s swing under 10%.', check: v => v.fl < 10 && v.b >= 17, hint: 'Try angles in the high teens.' }
  ]
});
