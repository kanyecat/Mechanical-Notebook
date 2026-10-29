MM.addMath('bevel-gears', {
  inputs: [
    { key: 'z1', param: 'z1', label: 'Pinion teeth', sym: 'z₁' },
    { key: 'z2', param: 'z2', label: 'Gear teeth', sym: 'z₂' },
    { key: 'm', label: 'Module (at the large end)', sym: 'm', unit: 'mm', value: 2, min: 0.2, max: 20, step: 0.1 },
    { key: 'S', label: 'Shaft angle', sym: 'Σ', unit: '°', value: 90, min: 10, max: 170, step: 1 },
    { key: 'n', label: 'Pinion speed', sym: 'n₁', unit: 'rpm', value: 600, min: 0, max: 20000, step: 1 }
  ],
  outputs(v) {
    const f = MM.num, S = v.S * Math.PI / 180, i = v.z2 / v.z1;
    const d1 = Math.atan2(Math.sin(S), i + Math.cos(S)), d2 = S - d1, D1 = v.m * v.z1, D2 = v.m * v.z2, Rc = D1 / (2 * Math.sin(d1));
    return [
      { key: 'i', label: 'Ratio', sym: 'i', expr: 'z₂ ÷ z₁', sub: `${v.z2} ÷ ${v.z1}`, value: i, unit: ' : 1', dp: 3 },
      { key: 'd1', label: 'Pinion pitch cone angle', sym: 'δ₁', expr: 'atan(sin Σ ÷ (i + cos Σ))', sub: v.S === 90 ? `atan(${v.z1} ÷ ${v.z2})` : '', value: d1 * 180 / Math.PI, unit: '°', dp: 2 },
      { key: 'd2', label: 'Gear pitch cone angle', sym: 'δ₂', expr: 'Σ − δ₁', sub: `${f(v.S)} − ${f(d1 * 180 / Math.PI, 2)}`, value: d2 * 180 / Math.PI, unit: '°', dp: 2 },
      { key: 'D1', label: 'Pinion pitch diameter (large end)', sym: 'd₁', expr: 'm × z₁', sub: `${f(v.m)} × ${v.z1}`, value: D1, unit: ' mm' },
      { key: 'D2', label: 'Gear pitch diameter (large end)', sym: 'd₂', expr: 'm × z₂', sub: `${f(v.m)} × ${v.z2}`, value: D2, unit: ' mm' },
      { key: 'Rc', label: 'Cone distance (apex to the large end)', sym: 'R', expr: 'd₁ ÷ (2 sin δ₁)', sub: '', value: Rc, unit: ' mm', dp: 1 },
      { key: 'b', label: 'Largest face width (rule of thumb)', sym: 'b', expr: 'R ÷ 3', sub: '', value: Rc / 3, unit: ' mm', dp: 1 },
      { key: 'n2', label: 'Gear speed', sym: 'n₂', expr: 'n₁ ÷ i', sub: `${f(v.n)} ÷ ${f(i, 3)}`, value: v.n / i, unit: ' rpm' }
    ];
  },
  problems: [
    () => { const z1 = MM.pick([12, 15, 16, 20]), z2 = MM.pick([24, 30, 32, 40]); const d = Math.atan2(z1, z2) * 180 / Math.PI; return { text: `A pinion of ${z1} teeth drives a gear of ${z2} teeth at 90°. What is the pinion's pitch cone angle?`, answer: d, unit: '°', hint: 'At 90°, tan δ₁ = z₁ ÷ z₂.', steps: [`δ₁ = atan(${z1} ÷ ${z2}) = ${MM.num(d, 2)}°`, `and δ₂ = 90° − δ₁ = ${MM.num(90 - d, 2)}°`], set: { z1, z2 } }; },
    () => { const z = MM.pick([16, 20, 24, 30]), m = MM.pick([1.5, 2, 2.5, 3]); const R = m * z / (2 * Math.sin(Math.PI / 4)); return { text: `Two mitre gears (equal, at 90°) have ${z} teeth and a module of ${m} mm. What is the cone distance from the apex to the large end?`, answer: R, unit: 'mm', hint: 'Mitre gears have δ = 45°. R = d ÷ (2 sin δ).', steps: [`d = ${m} × ${z} = ${m * z} mm`, `R = ${m * z} ÷ (2 × sin 45°) = ${MM.num(R, 2)} mm`], set: { z1: z, z2: z, m } }; }
  ],
  challenges: [
    { title: 'Mitre pair', goal: 'Equal speeds at 90°, with gears no larger than 50 mm across.', check: v => v.S === 90 && v.z1 === v.z2 && v.D2 <= 50, hint: 'Same tooth count on both; then pick the module.' },
    { title: 'Hand drill', goal: 'At 90°, the pinion turns at least 3 times per turn of the gear, with at least 12 pinion teeth.', check: v => v.S === 90 && v.i >= 3 && v.z1 >= 12, hint: 'Choose z₂ at least three times z₁.' }
  ]
});
