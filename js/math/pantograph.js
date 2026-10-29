MM.addMath('pantograph', {
  inputs: [
    { key: 'L', label: 'Long bars (each)', sym: 'L', unit: 'mm', value: 300, min: 10, max: 5000, step: 1 },
    { key: 'k', param: 'k', label: 'Scale', sym: 'k' },
    { key: 'w', label: 'Size of the drawing you trace', sym: 'w', unit: 'mm', value: 60, min: 1, max: 5000, step: 1 }
  ],
  outputs(v) {
    const f = MM.num, k = v.k;
    return [
      { key: 'a', label: 'Fixed pivot O to joint A, along the first long bar', sym: 'OA', expr: 'L ÷ k', sub: `${f(v.L)} ÷ ${k}`, value: v.L / k, unit: ' mm' },
      { key: 'd', label: 'Elbow C to joint D, along the second long bar', sym: 'CD', expr: 'L ÷ k', sub: `${f(v.L)} ÷ ${k}`, value: v.L / k, unit: ' mm' },
      { key: 's1', label: 'Short bar A to T', expr: 'L ÷ k', sub: '', value: v.L / k, unit: ' mm' },
      { key: 's2', label: 'Short bar T to D', expr: 'L × (1 − 1 ÷ k)', sub: `${f(v.L)} × (1 − 1 ÷ ${k})`, value: v.L * (1 - 1 / k), unit: ' mm' },
      { key: 'out', label: 'Size of the copy', sym: 'k × w', expr: 'k × w', sub: `${k} × ${f(v.w)}`, value: k * v.w, unit: ' mm' },
      { key: 'reach', label: 'Furthest the pen can reach from O', expr: '2L, with the bars straight', sub: `2 × ${f(v.L)}`, value: 2 * v.L, unit: ' mm' },
      { key: 'play', label: 'A 0.1 mm wobble at the tracer becomes', expr: '0.1 × k', sub: '', value: 0.1 * k, unit: ' mm at the pen', dp: 2 }
    ];
  },
  problems: [
    () => { const k = MM.pick([2, 3, 4, 5]), w = MM.pick([20, 25, 40, 50]); return { text: `A pantograph is set to ${k}×. You trace a letter ${w} mm tall. How tall is the copy?`, answer: k * w, unit: 'mm', tol: 0, hint: 'The pen moves k times as far as the tracer.', steps: [`${k} × ${w} = ${k * w} mm`], set: { w } }; },
    () => { const L = MM.pick([200, 240, 300, 360]), k = MM.pick([2, 3, 4]); return { text: `Long bars ${L} mm, scale ${k}×. How far from the fixed pivot O must joint A sit on the first bar?`, answer: L / k, unit: 'mm', hint: 'OA = L ÷ k.', steps: [`OA = ${L} ÷ ${k} = ${MM.num(L / k, 1)} mm`], set: { L } }; }
  ],
  challenges: [
    { title: 'Sign engraver', goal: 'Copy a 60 mm template letter to 180 mm, with long bars of 400 mm or less.', check: v => v.out === 180 && v.w === 60 && v.L <= 400, hint: 'You need k = 3.' },
    { title: 'Exact bar size', goal: 'Scale 3×, and the short bar from A to T exactly 120 mm.', check: v => v.k === 3 && Math.abs(v.s1 - 120) < 1e-9, hint: 'AT = L ÷ k.' }
  ]
});
