MM.addMath('speeds-feeds', {
  inputs: [
    { key: 'Vc', label: 'Cutting speed', sym: 'Vc', unit: 'm/min', value: 100, min: 1, max: 2000, step: 1 },
    { key: 'd', param: 'd', label: 'Cutter diameter', sym: 'D', unit: 'mm' },
    { key: 'z', param: 'z', label: 'Flutes', sym: 'z' },
    { key: 'fz', label: 'Feed per tooth (chip load)', sym: 'fz', unit: 'mm', value: 0.04, min: 0.001, max: 2, step: 0.001 },
    { key: 'ae', param: 'ae', label: 'Radial engagement', sym: 'ae', unit: '% of D' },
    { key: 'ap', label: 'Depth of cut', sym: 'ap', unit: 'mm', value: 10, min: 0.01, max: 200, step: 0.01 },
    { key: 'max', label: 'Machine top speed', unit: 'rpm', value: 10000, min: 100, max: 60000, step: 100 }
  ],
  outputs(v) {
    const f = MM.num, rpm0 = 1000 * v.Vc / (Math.PI * v.d), rpm = Math.min(rpm0, v.max), r = v.ae / 100, k = r >= 0.5 ? 1 : 1 / Math.sqrt(1 - (1 - 2 * r) ** 2), F = rpm * v.z * v.fz * k, Q = r * v.d * v.ap * F / 1000;
    return [
      { key: 'rpm0', label: 'Spindle speed for that cutting speed', sym: 'n', expr: '1000 × Vc ÷ (π × D)', sub: `1000 × ${f(v.Vc)} ÷ (π × ${f(v.d)})`, value: rpm0, unit: ' rpm', dp: 0 },
      { key: 'rpm', label: 'Speed to use (limited by the machine)', expr: 'smaller of n and the top speed', sub: '', value: rpm, unit: ' rpm', dp: 0, warn: rpm0 > v.max },
      { key: 'k', label: 'Chip-thinning factor', expr: '1 ÷ √(1 − (1 − 2 ae ÷ D)²), 1 at half the diameter or more', sub: `ae ÷ D = ${f(r, 2)}`, value: k, dp: 3 },
      { key: 'F', label: 'Feed rate', sym: 'F', expr: 'n × z × fz × factor', sub: `${f(rpm, 0)} × ${v.z} × ${f(v.fz, 3)} × ${f(k, 3)}`, value: F, unit: ' mm/min', dp: 0 },
      { key: 'Q', label: 'Metal removal rate', sym: 'Q', expr: 'ae × ap × F ÷ 1000', sub: `${f(r * v.d, 2)} × ${f(v.ap)} × ${f(F, 0)} ÷ 1000`, value: Q, unit: ' cm³/min', dp: 2 },
      { key: 't100', label: 'Time to cut 100 mm', expr: '100 ÷ F × 60', sub: '', value: 6000 / F, unit: ' s', dp: 1 }
    ];
  },
  problems: [
    () => { const Vc = MM.pick([30, 90, 150, 250]), D = MM.pick([6, 8, 10, 12, 16]); const n = 1000 * Vc / (Math.PI * D); return { text: `A cutting speed of ${Vc} m/min with a ${D} mm cutter. What spindle speed is that?`, answer: n, unit: 'rpm', hint: 'n = 1000 × Vc ÷ (π × D).', steps: [`n = 1000 × ${Vc} ÷ (π × ${D}) = ${MM.num(n, 0)} rpm`], set: { Vc, d: D } }; },
    () => { const n = MM.pick([1500, 3000, 6000, 12000]), z = MM.pick([2, 3, 4]), fz = MM.pick([0.02, 0.03, 0.05, 0.08]); return { text: `${n} rpm, ${z} flutes, ${fz} mm per tooth, full slot. What is the feed rate?`, answer: n * z * fz, unit: 'mm/min', hint: 'F = n × z × fz (no thinning in a full slot).', steps: [`F = ${n} × ${z} × ${fz} = ${MM.num(n * z * fz, 0)} mm/min`], set: { z, fz, ae: 100 } }; },
    () => { const r = MM.pick([0.1, 0.15, 0.2, 0.25]); const k = 1 / Math.sqrt(1 - (1 - 2 * r) ** 2); return { text: `An adaptive toolpath engages ${r * 100} % of the cutter diameter. By what factor should the feed per tooth be raised to keep the same chip thickness?`, answer: k, unit: '×', hint: 'Factor = 1 ÷ √(1 − (1 − 2 ae/D)²).', steps: [`1 − 2 × ${r} = ${MM.num(1 - 2 * r, 2)}`, `factor = 1 ÷ √(1 − ${MM.num((1 - 2 * r) ** 2, 4)}) = ${MM.num(k, 3)}`], set: { ae: r * 100 } }; }
  ],
  challenges: [
    { title: 'Small cutter, slow spindle', goal: 'A 3 mm carbide cutter in aluminium wants 250 m/min, but the spindle tops out at 10,000 rpm. Set it up and see the speed you are limited to.', check: v => v.d === 3 && v.Vc === 250 && v.max === 10000 && v.rpm === 10000, hint: 'Set D = 3, Vc = 250 and the top speed.' },
    { title: 'Adaptive roughing', goal: 'Remove at least 20 cm³ per minute with 15 % engagement or less.', check: v => v.ae <= 15 && v.Q >= 20, hint: 'Deep cuts (ap of 2 to 3 × D) are what make adaptive clearing fast.' }
  ]
});
