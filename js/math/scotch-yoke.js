MM.addMath('scotch-yoke', {
  inputs: [
    { key: 'r', param: 'r', label: 'Crank radius', sym: 'r', unit: 'mm' },
    { key: 'rpm', label: 'Crank speed', sym: 'n', unit: 'rpm', value: 120, min: 1, max: 5000, step: 1 },
    { key: 'm', label: 'Moving mass', sym: 'm', unit: 'kg', value: 2, min: 0, max: 1000, step: 0.1 }
  ],
  outputs(v, a) {
    const f = MM.num, w = 2 * Math.PI * v.rpm / 60, R = v.r / 1000, deg = ((a * 180 / Math.PI % 360) + 360) % 360;
    return [
      { key: 'S', label: 'Stroke', sym: 'S', expr: '2r', sub: `2 × ${v.r}`, value: 2 * v.r, unit: ' mm' },
      { key: 'w', label: 'Angular speed', sym: 'ω', expr: '2π n ÷ 60', sub: `2π × ${f(v.rpm, 0)} ÷ 60`, value: w, unit: ' rad/s', dp: 2 },
      { key: 'vmax', label: 'Peak speed (mid-stroke)', sym: 'v', expr: 'ω r', sub: `${f(w, 2)} × ${f(R, 3)}`, value: w * R, unit: ' m/s', dp: 3 },
      { key: 'amax', label: 'Peak acceleration (ends)', sym: 'a', expr: 'ω² r', sub: `${f(w, 2)}² × ${f(R, 3)}`, value: w * w * R, unit: ' m/s²', dp: 2 },
      { key: 'Fmax', label: 'Peak inertia force', sym: 'F', expr: 'm a', sub: `${f(v.m, 1)} × ${f(w * w * R, 2)}`, value: v.m * w * w * R, unit: ' N', dp: 1 },
      { key: 'x', label: `Yoke position at θ = ${Math.round(deg)}°`, sym: 'x', expr: 'r cos θ', sub: `${v.r} × cos ${Math.round(deg)}°`, value: v.r * Math.cos(a), unit: ' mm', dp: 1, live: true },
      { key: 'vnow', label: 'Yoke speed now', sym: 'v', expr: '−ω r sin θ', sub: '', value: -w * R * Math.sin(a), unit: ' m/s', dp: 3, live: true }
    ];
  },
  problems: [
    () => { const r = MM.rnd(40, 100, 5), n = MM.pick([60, 120, 180, 240]); const w = 2 * Math.PI * n / 60; return { text: `A Scotch yoke has a ${r} mm crank turning at ${n} rpm. What is the yoke's top speed?`, answer: w * r / 1000, unit: 'm/s', tol: 0.01, hint: 'Top speed is at mid-stroke and equals ω r.', steps: [`ω = 2π × ${n} ÷ 60 = ${MM.num(w, 3)} rad/s`, `v = ω r = ${MM.num(w, 3)} × ${r / 1000} = ${MM.num(w * r / 1000, 3)} m/s`], set: { r, rpm: n } }; },
    () => { const r = MM.rnd(40, 100, 10), n = MM.pick([120, 240, 300]), m = MM.pick([1, 2, 5]); const w = 2 * Math.PI * n / 60, F = m * w * w * r / 1000; return { text: `A ${m} kg yoke is driven by a ${r} mm crank at ${n} rpm. What peak force is needed just to accelerate it?`, answer: F, unit: 'N', tol: 0.01, hint: 'Peak acceleration is ω² r, at the ends of the stroke.', steps: [`ω = ${MM.num(w, 2)} rad/s`, `a = ω² r = ${MM.num(w * w * r / 1000, 2)} m/s²`, `F = m a = ${MM.num(F, 1)} N`], set: { r, rpm: n, m } }; },
    () => { const r = MM.rnd(40, 100, 10), d = MM.pick([30, 45, 60, 120, 150]); return { text: `Crank radius ${r} mm. How far is the yoke from mid-stroke when the crank is at ${d}°?`, answer: r * Math.cos(d * Math.PI / 180), unit: 'mm', tol: 0.01, hint: 'x = r cos θ. It can be negative.', steps: [`x = ${r} × cos ${d}° = ${MM.num(r * Math.cos(d * Math.PI / 180), 1)} mm`], set: { r } }; }
  ],
  challenges: [
    { title: 'Exactly 1 m/s', goal: 'Peak speed between 0.99 and 1.01 m/s with the crank at 200 rpm.', check: v => v.rpm === 200 && v.vmax >= 0.99 && v.vmax <= 1.01, hint: 'r = v ÷ ω.' },
    { title: 'Long stroke, low force', goal: 'Stroke of 160 mm or more, 2 kg yoke, peak inertia force under 50 N, as fast as you can (over 150 rpm).', check: v => v.m === 2 && v.S >= 160 && v.Fmax < 50 && v.rpm > 150, hint: 'F = m ω² r. With r = 80 mm, find the largest ω.' }
  ]
});
