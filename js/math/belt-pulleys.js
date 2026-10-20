MM.addMath('belt-pulleys', {
  inputs: [
    { key: 'D1', label: 'Driver diameter', sym: 'D₁', unit: 'mm', value: 160, min: 20, max: 1000, step: 1 },
    { key: 'r2', param: 'r2', sym: 'r₂', unit: 'mm' },
    { key: 'X', param: 'crossed' },
    { key: 'C', label: 'Centre distance', sym: 'C', unit: 'mm', value: 340, min: 50, max: 5000, step: 1 },
    { key: 'rpm', label: 'Motor speed', sym: 'n₁', unit: 'rpm', value: 1450, min: 1, max: 10000, step: 1 },
    { key: 'P', label: 'Power', sym: 'P', unit: 'kW', value: 1.5, min: 0, max: 500, step: 0.1 }
  ],
  outputs(v) {
    const f = MM.num, D2 = 2 * v.r2, i = D2 / v.D1, n2 = v.rpm / i, sp = Math.PI * v.D1 * v.rpm / 60000;
    const L = v.X ? 2 * v.C + Math.PI * (v.D1 + D2) / 2 + (v.D1 + D2) ** 2 / (4 * v.C) : 2 * v.C + Math.PI * (v.D1 + D2) / 2 + (D2 - v.D1) ** 2 / (4 * v.C);
    const wrap = v.X ? 180 + 2 * Math.asin(Math.min(1, (v.D1 + D2) / (2 * v.C))) * 180 / Math.PI : 180 - 2 * Math.asin(Math.min(1, Math.abs(D2 - v.D1) / (2 * v.C))) * 180 / Math.PI;
    const T2 = v.P * 1000 / (2 * Math.PI * n2 / 60);
    return [
      { key: 'D2', label: 'Driven diameter', sym: 'D₂', expr: '2 r₂', sub: `2 × ${v.r2}`, value: D2, unit: ' mm' },
      { key: 'i', label: 'Speed ratio', sym: 'i', expr: 'D₂ ÷ D₁', sub: `${D2} ÷ ${v.D1}`, value: i, unit: ' : 1', dp: 3 },
      { key: 'n2', label: 'Driven speed', sym: 'n₂', expr: 'n₁ × D₁ ÷ D₂', sub: `${f(v.rpm, 0)} × ${v.D1} ÷ ${D2}`, value: n2, unit: ' rpm' },
      { key: 'v', label: 'Belt speed', sym: 'v', expr: 'π D₁ n₁ ÷ 60 000', sub: `π × ${v.D1} × ${f(v.rpm, 0)} ÷ 60 000`, value: sp, unit: ' m/s', dp: 2 },
      { key: 'L', label: v.X ? 'Belt length (crossed)' : 'Belt length (open)', sym: 'L', expr: v.X ? '2C + π(D₁+D₂)/2 + (D₁+D₂)²/4C' : '2C + π(D₁+D₂)/2 + (D₂−D₁)²/4C', sub: '', value: L, unit: ' mm' },
      { key: 'wrap', label: 'Wrap on the small pulley', sym: 'α', expr: v.X ? '180° + 2 asin((D₁+D₂)/2C)' : '180° − 2 asin(|D₂−D₁|/2C)', sub: '', value: v.X ? wrap : wrap, unit: '°', dp: 1 },
      { key: 'T2', label: 'Driven shaft torque', sym: 'T₂', expr: 'P ÷ ω₂', sub: `${f(v.P * 1000, 0)} W ÷ ${f(2 * Math.PI * n2 / 60, 2)} rad/s`, value: T2, unit: ' N·m' }
    ];
  },
  problems: [
    () => { const D1 = MM.pick([80, 100, 125, 160]), r2 = MM.rnd(30, 125, 5), rpm = MM.pick([960, 1450, 2900]); return { text: `A ${D1} mm pulley on a ${rpm} rpm motor drives a ${2 * r2} mm pulley. How fast does the driven pulley turn?`, answer: rpm * D1 / (2 * r2), unit: 'rpm', hint: 'Rim speeds are equal, so n₁D₁ = n₂D₂.', steps: [`n₂ = n₁ × D₁ ÷ D₂`, `= ${rpm} × ${D1} ÷ ${2 * r2} = ${MM.num(rpm * D1 / (2 * r2), 1)} rpm`], set: { D1, r2, rpm } }; },
    () => { const D1 = MM.pick([100, 125, 160]), rpm = MM.pick([1450, 2900]); const v = Math.PI * D1 * rpm / 60000; return { text: `What is the belt speed when a ${D1} mm pulley turns at ${rpm} rpm?`, answer: v, unit: 'm/s', hint: 'Belt speed = circumference × revolutions per second.', steps: [`circumference = π × ${D1} mm = ${MM.num(Math.PI * D1 / 1000, 4)} m`, `rev/s = ${rpm} ÷ 60 = ${MM.num(rpm / 60, 2)}`, `v = ${MM.num(v, 2)} m/s`], set: { D1, rpm } }; },
    () => { const D1 = 160, r2 = MM.rnd(40, 120, 10), C = MM.pick([300, 400, 500]); const D2 = 2 * r2, L = 2 * C + Math.PI * (D1 + D2) / 2 + (D2 - D1) ** 2 / (4 * C); return { text: `Open belt: pulleys of 160 mm and ${D2} mm, centres ${C} mm apart. How long is the belt?`, answer: L, unit: 'mm', tol: 0.01, hint: 'L = 2C + π(D₁ + D₂)/2 + (D₂ − D₁)²/(4C).', steps: [`2C = ${2 * C}`, `π(D₁+D₂)/2 = ${MM.num(Math.PI * (D1 + D2) / 2, 1)}`, `(D₂−D₁)²/4C = ${MM.num((D2 - D1) ** 2 / (4 * C), 1)}`, `L = ${MM.num(L, 0)} mm`], set: { D1, r2, C, X: 0 } }; }
  ],
  challenges: [
    { title: 'Fan at 600 rpm', goal: '1450 rpm motor, fan between 590 and 610 rpm, open belt.', check: v => v.rpm === 1450 && v.X === 0 && v.n2 >= 590 && v.n2 <= 610, hint: 'You need D₁ ÷ D₂ ≈ 600 ÷ 1450 = 0.41. The drawing allows a driven pulley up to 250 mm, so D₁ ≈ 103 mm.' },
    { title: 'Enough grip', goal: 'Wrap angle of at least 160° and a ratio of 2 : 1 or more, open belt.', check: v => v.X === 0 && v.wrap >= 160 && v.i >= 2, hint: 'A bigger size difference cuts the wrap. Move the shafts further apart.' },
    { title: 'Reverse the spin', goal: 'Driven pulley turns the opposite way at 1 : 1.', check: v => v.X === 1 && Math.abs(v.i - 1) < 1e-9, hint: 'Crossed belt, and match the two diameters.' }
  ]
});
