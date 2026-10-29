MM.addMath('wobble-plate', {
  inputs: [
    { key: 'al', param: 'al', label: 'Hub tilt', sym: 'α', unit: '°' },
    { key: 'Dp', label: 'Pitch circle of the pistons (diameter)', sym: 'D', unit: 'mm', value: 60, min: 5, max: 1000, step: 1 },
    { key: 'd', label: 'Piston bore', sym: 'b', unit: 'mm', value: 12, min: 1, max: 200, step: 0.5 },
    { key: 'z', label: 'Pistons', sym: 'z', value: 5, min: 1, max: 15, step: 1 },
    { key: 'rpm', label: 'Shaft speed', sym: 'n', unit: 'rpm', value: 1500, min: 1, max: 10000, step: 10 }
  ],
  outputs(v) {
    const f = MM.num, s = v.Dp * Math.tan(v.al * Math.PI / 180), A = Math.PI / 4 * v.d * v.d, Vrev = v.z * A * s / 1000;
    return [
      { key: 's', label: 'Stroke', sym: 's', expr: 'D tan α', sub: `${f(v.Dp, 0)} × tan ${f(v.al, 0)}°`, value: s, unit: ' mm', dp: 2 },
      { key: 'V', label: 'Volume pumped per turn', sym: 'V', expr: 'z × π b² ÷ 4 × s', sub: `${v.z} × ${f(A, 1)} × ${f(s, 2)} ÷ 1000`, value: Vrev, unit: ' cm³', dp: 2 },
      { key: 'Q', label: 'Flow', sym: 'Q', expr: 'V × n', sub: `${f(Vrev, 2)} × ${f(v.rpm, 0)} ÷ 1000`, value: Vrev * v.rpm / 1000, unit: ' L/min', dp: 2 }
    ];
  },
  problems: [
    () => { const D = MM.rnd(40, 80, 10), al = MM.pick([10, 12, 15, 18]); const s = D * Math.tan(al * Math.PI / 180); return { text: `Pistons on a ${D} mm pitch circle, hub tilted ${al}°. What is the stroke?`, answer: s, unit: 'mm', tol: 0.01, hint: 's = D tan α.', steps: [`s = ${D} × tan ${al}° = ${MM.num(s, 2)} mm`], set: { Dp: D, al } }; }
  ],
  challenges: [{ title: '2 litres a minute', goal: 'Pump between 1.9 and 2.1 L/min with 5 pistons at 1500 rpm.', check: v => v.z === 5 && v.rpm === 1500 && v.Q >= 1.9 && v.Q <= 2.1, hint: 'Change the bore or the tilt.' }]
});
