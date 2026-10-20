MM.addMath('cam-follower', {
  inputs: [
    { key: 'h', param: 'h', label: 'Lift', sym: 'h', unit: 'mm' },
    { key: 'b', label: 'Rise angle', sym: 'β', unit: '°', value: 120, min: 10, max: 300, step: 1 },
    { key: 'rpm', label: 'Cam speed', sym: 'n', unit: 'rpm', value: 300, min: 1, max: 10000, step: 1 },
    { key: 'm', label: 'Follower mass', sym: 'm', unit: 'kg', value: 0.5, min: 0, max: 100, step: 0.1 }
  ],
  outputs(v, a) {
    const f = MM.num, w = 2 * Math.PI * v.rpm / 60, B = v.b * Math.PI / 180, H = v.h / 1000, deg = ((a * 180 / Math.PI % 360) + 360) % 360;
    const u = Math.min(1, deg / v.b), s = deg <= v.b ? v.h * (u - Math.sin(2 * Math.PI * u) / (2 * Math.PI)) : NaN;
    return [
      { key: 't', label: 'Rise time', sym: 't', expr: '(β ÷ 360°) × 60 ÷ n', sub: `(${v.b} ÷ 360) × 60 ÷ ${f(v.rpm, 0)}`, value: v.b / 360 * 60 / v.rpm * 1000, unit: ' ms', dp: 1 },
      { key: 'vmax', label: 'Peak follower speed (cycloidal)', sym: 'v', expr: '2 h ω ÷ β', sub: `2 × ${f(H, 3)} × ${f(w, 2)} ÷ ${f(B, 3)}`, value: 2 * H * w / B, unit: ' m/s', dp: 3 },
      { key: 'amax', label: 'Peak acceleration (cycloidal)', sym: 'a', expr: '2π h ω² ÷ β²', sub: `2π × ${f(H, 3)} × ${f(w, 2)}² ÷ ${f(B, 3)}²`, value: 2 * Math.PI * H * w * w / (B * B), unit: ' m/s²', dp: 1 },
      { key: 'F', label: 'Peak inertia force', sym: 'F', expr: 'm a', sub: '', value: v.m * 2 * Math.PI * H * w * w / (B * B), unit: ' N', dp: 1 },
      { key: 's', label: `Programmed lift at θ = ${Math.round(deg)}°`, sym: 's', expr: 'h (u − sin 2πu ÷ 2π), u = θ/β', sub: deg <= v.b ? `u = ${f(u, 3)}` : 'past the rise', value: deg <= v.b ? s : 'dwell or fall', unit: deg <= v.b ? ' mm' : '', dp: 1, live: true }
    ];
  },
  problems: [
    () => { const b = MM.pick([90, 120, 150, 180]), n = MM.pick([300, 600, 900, 1200]); return { text: `A cam turns at ${n} rpm and lifts its follower over ${b}° of rotation. How long does the rise take, in milliseconds?`, answer: b / 360 * 60 / n * 1000, unit: 'ms', tol: 0.01, hint: 'One turn takes 60/n seconds. The rise uses β/360 of that.', steps: [`one turn = 60 ÷ ${n} = ${MM.num(60 / n * 1000, 1)} ms`, `rise = ${b}/360 × that = ${MM.num(b / 360 * 60 / n * 1000, 1)} ms`], set: { b, rpm: n } }; },
    () => { const h = MM.rnd(20, 70, 5), b = MM.pick([90, 120, 150]), n = MM.pick([300, 600]); const w = 2 * Math.PI * n / 60, B = b * Math.PI / 180; return { text: `Cycloidal rise of ${h} mm over ${b}° at ${n} rpm. What is the follower's peak speed?`, answer: 2 * h / 1000 * w / B, unit: 'm/s', tol: 0.01, hint: 'For a cycloidal rise, peak speed = 2hω/β, with β in radians.', steps: [`ω = ${MM.num(w, 2)} rad/s, β = ${MM.num(B, 3)} rad`, `v = 2 × ${h / 1000} × ${MM.num(w, 2)} ÷ ${MM.num(B, 3)} = ${MM.num(2 * h / 1000 * w / B, 3)} m/s`], set: { h, b, rpm: n } }; },
    () => { const h = MM.rnd(20, 60, 10), b = 120, n = MM.pick([600, 900]); const w = 2 * Math.PI * n / 60, B = b * Math.PI / 180, A = 2 * Math.PI * h / 1000 * w * w / (B * B); return { text: `Cycloidal rise of ${h} mm over 120° at ${n} rpm. What is the peak acceleration?`, answer: A, unit: 'm/s²', tol: 0.01, hint: 'a = 2πhω²/β².', steps: [`ω = ${MM.num(w, 2)} rad/s, β = ${MM.num(B, 3)} rad`, `a = 2π × ${h / 1000} × ${MM.num(w, 2)}² ÷ ${MM.num(B, 3)}² = ${MM.num(A, 1)} m/s²`], set: { h, b, rpm: n } }; }
  ],
  challenges: [
    { title: 'No valve float', goal: 'At 600 rpm, lift of 40 mm or more, peak acceleration at most 100 m/s², rise angle no more than 200°.', check: v => v.rpm === 600 && v.h >= 40 && v.amax <= 100 && v.b <= 200, hint: 'a falls with β². Spread the rise over more of the turn.' },
    { title: 'Fast pick-and-place', goal: 'Rise of at least 30 mm finished in 40 ms or less, with peak acceleration under 300 m/s².', check: v => v.h >= 30 && v.t <= 40 && v.amax < 300, hint: 'Both depend on ω/β. Keep the lift at the minimum.' }
  ]
});
