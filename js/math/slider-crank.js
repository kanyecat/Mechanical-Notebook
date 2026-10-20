MM.addMath('slider-crank', {
  inputs: [
    { key: 'r', label: 'Crank radius', sym: 'r', unit: 'mm', value: 40, min: 5, max: 500, step: 1 },
    { key: 'k', param: 'rod', label: 'Rod ÷ crank', sym: 'l/r' },
    { key: 'rpm', label: 'Crank speed', sym: 'n', unit: 'rpm', value: 3000, min: 1, max: 20000, step: 10 },
    { key: 'F', label: 'Force on the piston', sym: 'F', unit: 'N', value: 5000, min: 0, max: 1e6, step: 10 }
  ],
  outputs(v, a) {
    const f = MM.num, l = v.k * v.r, lam = 1 / v.k, w = 2 * Math.PI * v.rpm / 60, s = Math.sin(a), c = Math.cos(a), root = Math.sqrt(1 - lam * lam * s * s);
    const x = v.r * (1 - c) + l * (1 - root), dxd = v.r * (s + lam * s * c / root), deg = ((a * 180 / Math.PI % 360) + 360) % 360;
    return [
      { key: 'l', label: 'Rod length', sym: 'l', expr: '(l/r) × r', sub: `${f(v.k, 1)} × ${v.r}`, value: l, unit: ' mm' },
      { key: 'S', label: 'Stroke', sym: 'S', expr: '2r', sub: `2 × ${v.r}`, value: 2 * v.r, unit: ' mm' },
      { key: 'vm', label: 'Mean piston speed', sym: 'v̄', expr: '2 S n ÷ 60 000', sub: `2 × ${2 * v.r} × ${f(v.rpm, 0)} ÷ 60 000`, value: 4 * v.r * v.rpm / 60000, unit: ' m/s', dp: 2 },
      { key: 'amax', label: 'Peak acceleration (at the far end)', sym: 'a', expr: 'ω² r (1 + r/l)', sub: `${f(w, 1)}² × ${f(v.r / 1000, 3)} × ${f(1 + lam, 3)}`, value: w * w * v.r / 1000 * (1 + lam), unit: ' m/s²' },
      { key: 'x', label: `Slider travel from the far end at θ = ${Math.round(deg)}°`, sym: 'x', expr: 'r(1 − cos θ) + l(1 − √(1 − (r/l)² sin²θ))', sub: '', value: x, unit: ' mm', live: true },
      { key: 'v', label: 'Slider speed now', sym: 'v', expr: 'ω r (sin θ + (r/2l) sin 2θ ÷ √(…))', sub: '', value: Math.abs(w * dxd / 1000), unit: ' m/s', dp: 2, live: true },
      { key: 'T', label: 'Crank torque from F now', sym: 'T', expr: 'F × dx/dθ', sub: `${f(v.F, 0)} × ${f(Math.abs(dxd) / 1000, 4)} m`, value: v.F * Math.abs(dxd) / 1000, unit: ' N·m', live: true }
    ];
  },
  problems: [
    () => { const r = MM.pick([30, 35, 40, 45, 50]), n = MM.pick([3000, 4500, 6000]); return { text: `An engine has a crank radius of ${r} mm and runs at ${n} rpm. What is its mean piston speed?`, answer: 4 * r * n / 60000, unit: 'm/s', hint: 'The piston covers two strokes per turn. Stroke = 2r.', steps: [`S = 2 × ${r} = ${2 * r} mm`, `v̄ = 2 S n / 60 000 = 2 × ${2 * r} × ${n} / 60 000 = ${MM.num(4 * r * n / 60000, 2)} m/s`], set: { r, rpm: n } }; },
    () => { const B = MM.pick([70, 80, 86, 90]), r = MM.pick([35, 40, 43, 45]), z = MM.pick([1, 2, 4]); const V = Math.PI / 4 * B * B * 2 * r * z / 1000; return { text: `A ${z}-cylinder engine has an ${B} mm bore and a ${r} mm crank radius. What is its total displacement in cc (cm³)?`, answer: V, unit: 'cc', tol: 0.01, hint: 'Each cylinder sweeps π/4 × bore² × stroke. 1 cc = 1000 mm³.', steps: [`stroke = 2r = ${2 * r} mm`, `per cylinder = π/4 × ${B}² × ${2 * r} = ${MM.num(Math.PI / 4 * B * B * 2 * r, 0)} mm³`, `total = × ${z} ÷ 1000 = ${MM.num(V, 0)} cc`], set: { r } }; },
    () => { const r = MM.pick([40, 50]), k = MM.pick([3, 3.5, 4]), n = MM.pick([2000, 3000]); const w = 2 * Math.PI * n / 60, A = w * w * r / 1000 * (1 + 1 / k); return { text: `Crank radius ${r} mm, rod ${k} times the crank, ${n} rpm. What is the peak piston acceleration at the far end of the stroke?`, answer: A, unit: 'm/s²', hint: 'a = ω² r (1 + r/l), with ω in rad/s and r in metres.', steps: [`ω = 2π × ${n} / 60 = ${MM.num(w, 1)} rad/s`, `a = ${MM.num(w, 1)}² × ${r / 1000} × (1 + 1/${k}) = ${MM.num(A, 0)} m/s²`], set: { r, k, rpm: n } }; }
  ],
  challenges: [
    { title: 'Racing engine limit', goal: 'Stroke of 80 mm or more and mean piston speed 20 m/s or less at 6000 rpm.', check: v => v.rpm === 6000 && v.S >= 80 && v.vm <= 20, hint: 'v̄ = 2 S n / 60 000. Solve for the largest stroke.' },
    { title: 'Gentle on the bearings', goal: 'Peak acceleration under 4200 m/s² at 3000 rpm, with a stroke of at least 70 mm.', check: v => v.rpm === 3000 && v.S >= 70 && v.amax < 4200, hint: 'A longer rod (bigger l/r) lowers the (1 + r/l) factor.' }
  ]
});
