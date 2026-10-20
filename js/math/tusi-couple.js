MM.addMath('tusi-couple', {
  inputs: [
    { key: 'Nr', label: 'Ring teeth (even)', sym: 'Nᵣ', value: 36, min: 8, max: 400, step: 2 },
    { key: 'm', label: 'Module', sym: 'm', unit: 'mm', value: 2, min: 0.5, max: 10, step: 0.5 },
    { key: 'rpm', label: 'Carrier speed', sym: 'n', unit: 'rpm', value: 60, min: 1, max: 5000, step: 1 }
  ],
  outputs(v, a) {
    const f = MM.num, S = v.m * v.Nr, w = 2 * Math.PI * v.rpm / 60, R = S / 2000;
    return [
      { key: 'Ng', label: 'Rolling gear teeth', sym: 'N_g', expr: 'Nᵣ ÷ 2', sub: `${v.Nr} ÷ 2`, value: v.Nr / 2, dp: 0 },
      { key: 'S', label: 'Straight stroke of P', sym: 'S', expr: 'm × Nᵣ (the ring pitch diameter)', sub: `${f(v.m, 1)} × ${v.Nr}`, value: S, unit: ' mm' },
      { key: 'arm', label: 'Carrier arm length', sym: 'e', expr: 'S ÷ 4', sub: '', value: S / 4, unit: ' mm' },
      { key: 'vmax', label: 'Peak speed of P', sym: 'v', expr: 'ω S ÷ 2', sub: `${f(w, 2)} × ${f(R, 3)} m`, value: w * R, unit: ' m/s', dp: 3 },
      { key: 'amax', label: 'Peak acceleration of P', sym: 'a', expr: 'ω² S ÷ 2', sub: '', value: w * w * R, unit: ' m/s²', dp: 2 },
      { key: 'x', label: 'Position of P now', sym: 'x', expr: '(S/2) cos θ', sub: '', value: S / 2 * Math.cos(a), unit: ' mm', dp: 1, live: true }
    ];
  },
  problems: [
    () => { const Nr = MM.pick([24, 36, 48, 60]), m = MM.pick([1, 1.5, 2, 3]); return { text: `A Tusi couple has a ${Nr}-tooth ring with module ${m} mm. How long is the straight stroke of point P?`, answer: m * Nr, unit: 'mm', tol: 0, hint: 'P runs along a full diameter of the ring\'s pitch circle.', steps: [`S = m × Nᵣ = ${m} × ${Nr} = ${m * Nr} mm`], set: { Nr, m } }; },
    () => { const Nr = 36, m = 2, n = MM.pick([60, 120, 300]); const w = 2 * Math.PI * n / 60; return { text: `Ring 36 teeth, module 2 mm, carrier at ${n} rpm. What is P's top speed?`, answer: w * 0.036, unit: 'm/s', tol: 0.01, hint: 'P moves in simple harmonic motion with amplitude S/2.', steps: [`S/2 = 36 mm = 0.036 m`, `ω = ${MM.num(w, 2)} rad/s`, `v = ω × S/2 = ${MM.num(w * 0.036, 3)} m/s`], set: { Nr, m, rpm: n } }; }
  ],
  challenges: [
    { title: '120 mm stroke', goal: 'Straight stroke of exactly 120 mm, module 2.5 mm or less.', check: v => Math.abs(v.S - 120) < 1e-9 && v.m <= 2.5, hint: 'm × Nᵣ = 120, and Nᵣ must be even.' },
    { title: 'Gentle pump', goal: 'Stroke at least 80 mm with peak acceleration under 5 m/s², running as fast as you can (100 rpm or more).', check: v => v.S >= 80 && v.amax < 5 && v.rpm >= 100, hint: 'a = ω² S/2. Keep the stroke at its minimum.' }
  ]
});
