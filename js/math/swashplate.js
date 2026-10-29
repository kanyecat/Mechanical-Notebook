MM.addMath('swashplate', {
  inputs: [
    { key: 'al', param: 'al', label: 'Plate tilt', sym: 'α', unit: '°' },
    { key: 'n', param: 'n', label: 'Pistons', sym: 'z' },
    { key: 'Dp', label: 'Pitch circle of the pistons (diameter)', sym: 'D', unit: 'mm', value: 63, min: 2, max: 2000, step: 1 },
    { key: 'd', label: 'Piston diameter', sym: 'd', unit: 'mm', value: 12, min: 1, max: 500, step: 0.5 },
    { key: 'rpm', label: 'Shaft speed', sym: 'n', unit: 'rpm', value: 1500, min: 0, max: 20000, step: 1 },
    { key: 'p', label: 'Pressure', sym: 'p', unit: 'bar', value: 200, min: 0, max: 1000, step: 1 }
  ],
  outputs(v) {
    const f = MM.num, s = v.Dp * Math.tan(v.al * Math.PI / 180), A = Math.PI * v.d * v.d / 4, V = v.n * A * s / 1000, Q = V * v.rpm / 1000, T = v.p * 1e5 * V * 1e-6 / (2 * Math.PI);
    return [
      { key: 's', label: 'Stroke', sym: 's', expr: 'D × tan α', sub: `${f(v.Dp)} × tan ${f(v.al)}°`, value: s, unit: ' mm', dp: 2 },
      { key: 'V', label: 'Displacement per turn', sym: 'V', expr: 'z × (π d² ÷ 4) × s', sub: `${v.n} × ${f(A, 1)} mm² × ${f(s, 2)} mm`, value: V, unit: ' cm³', dp: 2 },
      { key: 'Q', label: 'Flow (no leakage)', sym: 'Q', expr: 'V × n', sub: `${f(V, 2)} cm³ × ${f(v.rpm)} rpm`, value: Q, unit: ' L/min', dp: 2 },
      { key: 'T', label: 'Torque needed to drive it (no losses)', sym: 'T', expr: 'p × V ÷ 2π', sub: '', value: T, unit: ' N·m', dp: 1 },
      { key: 'P', label: 'Hydraulic power', expr: 'p × Q', sub: '', value: v.p * 1e5 * Q / 60000 / 1000, unit: ' kW', dp: 2 }
    ];
  },
  problems: [
    () => { const D = MM.pick([40, 50, 63, 80]), al = MM.pick([10, 15, 18]); const s = D * Math.tan(al * Math.PI / 180); return { text: `Pistons on a ${D} mm pitch circle, plate tilted ${al}°. What is the stroke?`, answer: s, unit: 'mm', hint: 's = D × tan α (the same as 2 × R × tan α).', steps: [`s = ${D} × tan ${al}° = ${MM.num(s, 2)} mm`], set: { Dp: D, al } }; },
    () => { const z = MM.pick([5, 7, 9]), d = MM.pick([10, 12, 16]), s = MM.pick([10, 15, 20]); const V = z * Math.PI * d * d / 4 * s / 1000; return { text: `${z} pistons of ${d} mm diameter, each with a ${s} mm stroke. What is the displacement per turn, in cm³?`, answer: V, unit: 'cm³', hint: 'V = z × area × stroke; divide mm³ by 1000 for cm³.', steps: [`area = π × ${d}² ÷ 4 = ${MM.num(Math.PI * d * d / 4, 1)} mm²`, `V = ${z} × ${MM.num(Math.PI * d * d / 4, 1)} × ${s} ÷ 1000 = ${MM.num(V, 2)} cm³`], set: { n: z, d } }; }
  ],
  challenges: [
    { title: 'Log-splitter pump', goal: 'At least 40 L/min at 1500 rpm.', check: v => v.rpm === 1500 && v.Q >= 40, hint: 'More tilt, bigger pistons or a bigger pitch circle.' },
    { title: 'Small and steady', goal: 'Exactly 7 pistons, tilt 12° or less, and at least 20 cm³ per turn.', check: v => v.n === 7 && v.al <= 12 && v.V >= 20, hint: 'Grow the pitch circle or piston size.' }
  ]
});
