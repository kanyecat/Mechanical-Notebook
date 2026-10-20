MM.addMath('ratchet-pawl', {
  inputs: [
    { key: 'N', label: 'Ratchet teeth', sym: 'N', value: 12, min: 3, max: 200, step: 1 },
    { key: 'D', label: 'Winch drum diameter', sym: 'D', unit: 'mm', value: 50, min: 5, max: 1000, step: 1 },
    { key: 'L', label: 'Lever length', sym: 'L', unit: 'mm', value: 300, min: 20, max: 2000, step: 5 },
    { key: 'F', label: 'Hand force on the lever', sym: 'F', unit: 'N', value: 150, min: 0, max: 2000, step: 5 },
    { key: 'spm', label: 'Lever swings per minute', sym: 'k', value: 30, min: 1, max: 600, step: 1 }
  ],
  outputs(v) {
    const f = MM.num, per = Math.PI * v.D / v.N, MA = 2 * v.L / v.D;
    return [
      { key: 'step', label: 'Angle per click', sym: 'φ', expr: '360° ÷ N', sub: `360 ÷ ${v.N}`, value: 360 / v.N, unit: '°', dp: 2 },
      { key: 'per', label: 'Rope wound per click', sym: 's', expr: 'π D ÷ N', sub: `π × ${v.D} ÷ ${v.N}`, value: per, unit: ' mm', dp: 2 },
      { key: 'MA', label: 'Mechanical advantage', sym: 'MA', expr: 'L ÷ (D/2)', sub: `${v.L} ÷ ${v.D / 2}`, value: MA, unit: '×', dp: 2 },
      { key: 'pull', label: 'Rope pull', sym: 'P', expr: 'F × MA', sub: `${f(v.F, 0)} × ${f(MA, 2)}`, value: v.F * MA, unit: ' N' },
      { key: 'kg', label: 'Mass it can lift', sym: 'm', expr: 'P ÷ 9.81', sub: '', value: v.F * MA / 9.81, unit: ' kg', dp: 1 },
      { key: 'spd', label: 'Lifting speed', sym: 'v', expr: 's × k', sub: `${f(per, 2)} × ${v.spm}`, value: per * v.spm / 1000, unit: ' m/min', dp: 3 },
      { key: 'clicks', label: 'Clicks to wind 1 m of rope', expr: '1000 ÷ s', sub: '', value: Math.ceil(1000 / per), unit: '', dp: 0 }
    ];
  },
  problems: [
    () => { const N = MM.pick([12, 18, 24, 36, 40, 60]); return { text: `A ratchet wheel has ${N} teeth. How many degrees does it turn per click?`, answer: 360 / N, unit: '°', tol: 0.01, hint: 'One click = one tooth.', steps: [`360 ÷ ${N} = ${MM.num(360 / N, 2)}°`] }; },
    () => { const N = MM.pick([20, 24, 30, 40]), D = MM.pick([40, 50, 60, 80]); const s = Math.PI * D / N; return { text: `A winch drum of ${D} mm diameter has a ${N}-tooth ratchet. How many clicks wind in 1 m of rope? (Round up.)`, answer: Math.ceil(1000 / s), unit: 'clicks', tol: 0, hint: 'Each click winds π D ÷ N of rope.', steps: [`per click = π × ${D} ÷ ${N} = ${MM.num(s, 2)} mm`, `1000 ÷ ${MM.num(s, 2)} = ${MM.num(1000 / s, 1)}, so ${Math.ceil(1000 / s)} clicks`], set: { N, D } }; },
    () => { const L = MM.pick([200, 250, 300, 400]), D = MM.pick([40, 50, 60]), F = MM.pick([100, 150, 200]); return { text: `A ${L} mm lever turns a ${D} mm drum. A ${F} N push on the lever gives what rope pull?`, answer: F * 2 * L / D, unit: 'N', tol: 0.01, hint: 'Torque is the same: F × L = P × D/2.', steps: [`P = F × L ÷ (D/2) = ${F} × ${L} ÷ ${D / 2} = ${MM.num(F * 2 * L / D, 0)} N`], set: { L, D, F } }; }
  ],
  challenges: [
    { title: 'One-person boat winch', goal: 'Pull at least 2000 N with a 150 N push, lever no longer than 400 mm.', check: v => v.F === 150 && v.L <= 400 && v.pull >= 2000, hint: 'MA = 2L/D must reach 13.3. Shrink the drum.' },
    { title: 'Fine adjustment', goal: 'Rope wound per click of 2 mm or less, on a drum of 50 mm or more.', check: v => v.D >= 50 && v.per <= 2, hint: 'N ≥ π D ÷ 2.' }
  ]
});
