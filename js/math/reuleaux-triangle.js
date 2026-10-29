MM.addMath('reuleaux-triangle', {
  inputs: [{ key: 'w', label: 'Width of the rotor (and the square)', sym: 'w', unit: 'mm', value: 20, min: 1, max: 1000, step: 1 }],
  outputs(v) {
    const f = MM.num, w = v.w, A = (Math.PI - Math.sqrt(3)) / 2 * w * w, cut = (2 * Math.sqrt(3) + Math.PI / 6 - 3) * w * w;
    return [
      { key: 'A', label: 'Area of the rotor', sym: 'A', expr: '(π − √3) ÷ 2 × w²', sub: `0.7048 × ${f(w, 0)}²`, value: A, unit: ' mm²', dp: 1 },
      { key: 'P', label: 'Perimeter (same as a circle of diameter w)', sym: 'P', expr: 'π w', sub: `π × ${f(w, 0)}`, value: Math.PI * w, unit: ' mm', dp: 1 },
      { key: 'cut', label: 'Area its corners sweep in the square', sym: 'C', expr: '(2√3 + π/6 − 3) × w²', sub: `0.9877 × ${f(w, 0)}²`, value: cut, unit: ' mm²', dp: 1 },
      { key: 'left', label: 'Left in the four corners', sym: '', expr: 'w² − C', sub: `${f(w * w, 0)} − ${f(cut, 1)}`, value: w * w - cut, unit: ' mm²', dp: 2 }
    ];
  },
  problems: [
    () => { const w = MM.rnd(10, 60, 5); return { text: `A Reuleaux triangle is ${w} mm wide. What is its area?`, answer: (Math.PI - Math.sqrt(3)) / 2 * w * w, unit: 'mm²', tol: 0.01, hint: 'A = (π − √3) ÷ 2 × w², about 0.705 w².', steps: [`A = 0.7048 × ${w}² = ${MM.num((Math.PI - Math.sqrt(3)) / 2 * w * w, 1)} mm²`], set: { w } }; },
    () => { const w = MM.rnd(10, 60, 5); return { text: `How long is the edge of a ${w} mm wide Reuleaux triangle, all the way round?`, answer: Math.PI * w, unit: 'mm', tol: 0.01, hint: 'Every curve of constant width w has perimeter π w (Barbier\'s theorem).', steps: [`P = π × ${w} = ${MM.num(Math.PI * w, 1)} mm`], set: { w } }; }
  ],
  challenges: [{ title: 'A 1 cm² rotor', goal: 'Find the width that gives a rotor area between 99 and 101 mm².', check: v => v.A >= 99 && v.A <= 101, hint: 'w = √(A ÷ 0.7048).' }]
});
