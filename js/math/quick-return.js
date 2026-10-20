MM.addMath('quick-return', {
  inputs: [
    { key: 'r', param: 'r', label: 'Crank radius', sym: 'r', unit: 'mm' },
    { key: 'e', label: 'Crank centre to arm pivot', sym: 'e', unit: 'mm', value: 194, min: 50, max: 2000, step: 1 },
    { key: 'H', label: 'Arm pivot to ram', sym: 'H', unit: 'mm', value: 380, min: 50, max: 3000, step: 1 },
    { key: 'rpm', label: 'Crank speed', sym: 'n', unit: 'rpm', value: 30, min: 1, max: 1000, step: 1 }
  ],
  outputs(v) {
    const f = MM.num, al = Math.asin(Math.min(1, v.r / v.e)), deg = al * 180 / Math.PI, cut = 180 + 2 * deg, ret = 180 - 2 * deg, T = 60 / v.rpm, S = 2 * v.H * Math.tan(al);
    return [
      { key: 'al', label: 'Half swing of the arm', sym: 'α', expr: 'asin(r ÷ e)', sub: `asin(${v.r} ÷ ${v.e})`, value: deg, unit: '°', dp: 2, warn: v.r >= v.e },
      { key: 'cut', label: 'Crank angle for the cutting stroke', sym: 'β', expr: '180° + 2α', sub: `180 + 2 × ${f(deg, 2)}`, value: cut, unit: '°', dp: 1 },
      { key: 'ret', label: 'Crank angle for the return', sym: 'γ', expr: '180° − 2α', sub: '', value: ret, unit: '°', dp: 1 },
      { key: 'Q', label: 'Time ratio', sym: 'Q', expr: 'β ÷ γ', sub: `${f(cut, 1)} ÷ ${f(ret, 1)}`, value: cut / ret, unit: ' : 1', dp: 2 },
      { key: 'S', label: 'Ram stroke', sym: 'S', expr: '2 H tan α', sub: `2 × ${v.H} × tan ${f(deg, 2)}°`, value: S, unit: ' mm' },
      { key: 'tc', label: 'Cutting time', sym: 't꜀', expr: '(β ÷ 360°) × 60 ÷ n', sub: '', value: cut / 360 * T, unit: ' s', dp: 2 },
      { key: 'vc', label: 'Average cutting speed', sym: 'v꜀', expr: 'S ÷ t꜀', sub: `${f(S, 0)} mm ÷ ${f(cut / 360 * T, 2)} s`, value: S / 1000 / (cut / 360 * T), unit: ' m/s', dp: 3 },
      { key: 'vr', label: 'Average return speed', sym: 'vᵣ', expr: 'S ÷ tᵣ', sub: '', value: S / 1000 / (ret / 360 * T), unit: ' m/s', dp: 3 }
    ];
  },
  problems: [
    () => { const r = MM.rnd(40, 90, 5), e = 194; const d = Math.asin(r / e) * 180 / Math.PI, Q = (180 + 2 * d) / (180 - 2 * d); return { text: `Crank radius ${r} mm, arm pivot ${e} mm below the crank centre. What is the time ratio of cutting to return?`, answer: Q, unit: ': 1', tol: 0.01, hint: 'Find α = asin(r/e). Cutting takes 180° + 2α of crank turn.', steps: [`α = asin(${r}/${e}) = ${MM.num(d, 2)}°`, `cutting = ${MM.num(180 + 2 * d, 1)}°, return = ${MM.num(180 - 2 * d, 1)}°`, `Q = ${MM.num(Q, 2)}`], set: { r, e } }; },
    () => { const r = MM.rnd(40, 90, 5); const S = 2 * 380 * Math.tan(Math.asin(r / 194)); return { text: `With a ${r} mm crank, e = 194 mm and H = 380 mm, how long is the ram stroke?`, answer: S, unit: 'mm', tol: 0.01, hint: 'The arm swings ±α. The ram moves H tan α each side.', steps: [`α = asin(${r}/194) = ${MM.num(Math.asin(r / 194) * 180 / Math.PI, 2)}°`, `S = 2 × 380 × tan α = ${MM.num(S, 0)} mm`], set: { r, e: 194, H: 380 } }; }
  ],
  challenges: [
    { title: 'Shaper spec', goal: 'Time ratio of at least 1.6 and a stroke of at least 250 mm, with e = 194 mm.', check: v => v.e === 194 && v.Q >= 1.6 && v.S >= 250, hint: 'Q = 1.6 means 180° + 2α = 1.6 (180° − 2α), so α ≈ 20.8°.' },
    { title: 'Safe cutting speed', goal: 'Average cutting speed between 0.15 and 0.2 m/s on the default frame (e 194, H 380).', check: v => v.e === 194 && v.H === 380 && v.vc >= 0.15 && v.vc <= 0.2, hint: 'Pick a stroke, then adjust the crank speed.' }
  ]
});
