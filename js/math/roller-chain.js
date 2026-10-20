MM.addMath('roller-chain', {
  inputs: [
    { key: 'n1', param: 'n1', sym: 'N₁' }, { key: 'n2', param: 'n2', sym: 'N₂' },
    { key: 'p', label: 'Chain pitch', sym: 'p', unit: 'mm', value: 12.7, min: 6, max: 50.8, step: 0.05 },
    { key: 'C', label: 'Target centre distance', sym: 'C', unit: 'mm', value: 410, min: 50, max: 3000, step: 1 },
    { key: 'rpm', label: 'Driver speed', sym: 'n₁', unit: 'rpm', value: 90, min: 1, max: 5000, step: 1 }
  ],
  outputs(v) {
    const f = MM.num, D1 = v.p / Math.sin(Math.PI / v.n1), D2 = v.p / Math.sin(Math.PI / v.n2), i = v.n2 / v.n1;
    const Lr = 2 * v.C / v.p + (v.n1 + v.n2) / 2 + v.p * (v.n2 - v.n1) ** 2 / (4 * Math.PI ** 2 * v.C), L = Math.ceil(Lr / 2) * 2, sp = v.n1 * v.p * v.rpm / 60000;
    return [
      { key: 'i', label: 'Ratio', sym: 'i', expr: 'N₂ ÷ N₁', sub: `${v.n2} ÷ ${v.n1}`, value: i, unit: ' : 1', dp: 2 },
      { key: 'n2', label: 'Driven speed', sym: 'n₂', expr: 'n₁ ÷ i', sub: `${f(v.rpm, 0)} ÷ ${f(i, 2)}`, value: v.rpm / i, unit: ' rpm' },
      { key: 'D1', label: 'Driver pitch diameter', sym: 'D₁', expr: 'p ÷ sin(180° ÷ N₁)', sub: `${f(v.p, 2)} ÷ sin(${f(180 / v.n1, 2)}°)`, value: D1, unit: ' mm' },
      { key: 'D2', label: 'Driven pitch diameter', sym: 'D₂', expr: 'p ÷ sin(180° ÷ N₂)', sub: `${f(v.p, 2)} ÷ sin(${f(180 / v.n2, 2)}°)`, value: D2, unit: ' mm' },
      { key: 'v', label: 'Chain speed', sym: 'v', expr: 'N₁ p n₁ ÷ 60 000', sub: `${v.n1} × ${f(v.p, 2)} × ${f(v.rpm, 0)} ÷ 60 000`, value: sp, unit: ' m/s', dp: 2 },
      { key: 'Lr', label: 'Chain length (links, exact)', sym: 'L', expr: '2C/p + (N₁+N₂)/2 + p(N₂−N₁)² ÷ 4π²C', sub: '', value: Lr, unit: ' links', dp: 1 },
      { key: 'L', label: 'Links to buy (round up to even)', expr: '', sub: '', value: L, unit: ' links', dp: 0 }
    ];
  },
  problems: [
    () => { const n = MM.rnd(9, 30), p = 12.7; const D = p / Math.sin(Math.PI / n); return { text: `What is the pitch diameter of a ${n}-tooth sprocket for 12.7 mm (1/2 in) pitch chain?`, answer: D, unit: 'mm', hint: 'D = p ÷ sin(180° ÷ N).', steps: [`180° ÷ ${n} = ${MM.num(180 / n, 3)}°`, `D = 12.7 ÷ sin(${MM.num(180 / n, 3)}°) = ${MM.num(D, 1)} mm`], set: { n1: n } }; },
    () => { const n1 = MM.pick([32, 36, 42, 48]), n2 = MM.pick([11, 13, 15, 17, 21]), c = MM.pick([60, 75, 90]); return { text: `A bicycle has a ${n1}-tooth chainring and a ${n2}-tooth rear sprocket. The rider pedals at ${c} rpm. How fast does the rear wheel turn?`, answer: c * n1 / n2, unit: 'rpm', hint: 'The chain moves the same number of teeth past both sprockets.', steps: [`Wheel speed = pedal speed × N₁ ÷ N₂`, `= ${c} × ${n1} ÷ ${n2} = ${MM.num(c * n1 / n2, 1)} rpm`], set: { rpm: c } }; },
    () => { const n1 = MM.rnd(12, 20), n2 = MM.rnd(30, 40), C = MM.pick([300, 400, 500]), p = 12.7; const Lr = 2 * C / p + (n1 + n2) / 2 + p * (n2 - n1) ** 2 / (4 * Math.PI ** 2 * C); return { text: `Sprockets of ${n1} and ${n2} teeth sit ${C} mm apart with 12.7 mm chain. How many links does the exact formula give (before rounding)?`, answer: Lr, unit: 'links', tol: 0.005, hint: 'L = 2C/p + (N₁ + N₂)/2 + p(N₂ − N₁)²/(4π²C).', steps: [`2C/p = ${MM.num(2 * C / p, 2)}`, `(N₁+N₂)/2 = ${(n1 + n2) / 2}`, `p(N₂−N₁)²/(4π²C) = ${MM.num(p * (n2 - n1) ** 2 / (4 * Math.PI ** 2 * C), 2)}`, `L = ${MM.num(Lr, 2)} links, so buy ${Math.ceil(Lr / 2) * 2}`], set: { n1, n2, C } }; }
  ],
  challenges: [
    { title: 'Bike climbing gear', goal: 'Driven sprocket turns slower than the pedals: ratio between 1.4 and 1.6, with pedals at 70 rpm.', check: v => v.rpm === 70 && v.i >= 1.4 && v.i <= 1.6, hint: 'Make the driven sprocket about 1.5 times the driver.' },
    { title: 'Even link count, no half link', goal: 'Exact chain length within 0.2 links of an even number, at 12.7 mm pitch.', check: v => v.p === 12.7 && Math.abs(v.Lr - Math.round(v.Lr / 2) * 2) <= 0.2, hint: 'Nudge the centre distance until L lands just under an even number.' },
    { title: 'Keep the chain slow', goal: 'Chain speed under 3 m/s while the driver runs at 900 rpm.', check: v => v.rpm === 900 && v.v < 3, hint: 'v = N₁ p n₁ / 60 000. Fewer teeth or a smaller pitch.' }
  ]
});
