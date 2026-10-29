MM.addMath('hoberman-ring', {
  inputs: [{ key: 'n', param: 'n', label: 'Units in the ring', sym: 'N' }, { key: 'a', label: 'Arm length (half a bar)', sym: 'a', unit: 'mm', value: 50, min: 5, max: 2000, step: 1 }],
  outputs(v) {
    const f = MM.num, N = v.n | 0, al = Math.PI / N, open = 2 * v.a / Math.tan(al), closed = 4 * v.a * Math.cos(al), most = 2 * v.a / Math.sin(al);
    return [
      { key: 'bend', label: 'Bend in each bar', sym: 'ψ', expr: '180° − 360° ÷ N', sub: `180 − 360 ÷ ${N}`, value: 180 - 360 / N, unit: '°', dp: 1 },
      { key: 'closed', label: 'Outside Ø when the hole is shut', sym: 'D₀', expr: '4a cos(180° ÷ N)', sub: `4 × ${f(v.a, 0)} × cos ${f(180 / N, 1)}°`, value: closed, unit: ' mm', dp: 1 },
      { key: 'open', label: 'Hole Ø when fully open', sym: 'd', expr: '2a ÷ tan(180° ÷ N)', sub: `2 × ${f(v.a, 0)} ÷ tan ${f(180 / N, 1)}°`, value: open, unit: ' mm', dp: 1 },
      { key: 'most', label: 'Largest outside Ø on the way', sym: 'D', expr: '2a ÷ sin(180° ÷ N)', sub: `2 × ${f(v.a, 0)} ÷ sin ${f(180 / N, 1)}°`, value: most, unit: ' mm', dp: 1 }
    ];
  },
  problems: [
    () => { const N = MM.pick([6, 8, 10, 12]); return { text: `A Hoberman ring has ${N} units. What angle should each bar be bent to?`, answer: 180 - 360 / N, unit: '°', tol: 0.01, hint: 'ψ = 180° − 360° ÷ N.', steps: [`ψ = 180 − 360 ÷ ${N} = ${MM.num(180 - 360 / N, 1)}°`], set: { n: N } }; },
    () => { const N = MM.pick([6, 8, 12]), a = MM.rnd(30, 80, 10); const d = 2 * a / Math.tan(Math.PI / N); return { text: `${N} units, arms ${a} mm long. How wide is the hole when the ring is fully open?`, answer: d, unit: 'mm', tol: 0.01, hint: 'd = 2a ÷ tan(180° ÷ N).', steps: [`d = 2 × ${a} ÷ tan ${MM.num(180 / N, 1)}° = ${MM.num(d, 1)} mm`], set: { n: N, a } }; }
  ],
  challenges: [{ title: 'A 300 mm hole', goal: 'Open the hole to at least 300 mm with arms no longer than 50 mm.', check: v => v.a <= 50 && v.open >= 300, hint: 'More units make the hole bigger for the same arm.' }]
});
