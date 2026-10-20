MM.addMath('lead-screw', {
  inputs: [
    { key: 'P', param: 'P', label: 'Thread pitch', sym: 'P' },
    { key: 'n', param: 'n', label: 'Starts', sym: 'z' },
    { key: 'd', label: 'Screw diameter', sym: 'd', unit: 'mm', value: 12, min: 3, max: 200, step: 1 },
    { key: 'mu', label: 'Friction coefficient (0.1 to 0.2 for bronze nut)', sym: 'μ', value: 0.15, min: 0.01, max: 0.5, step: 0.01 },
    { key: 'F', label: 'Load to push or lift', sym: 'F', unit: 'N', value: 500, min: 0, max: 1e6, step: 10 },
    { key: 'rpm', label: 'Screw speed', sym: 'N', unit: 'rpm', value: 300, min: 1, max: 5000, step: 10 }
  ],
  outputs(v) {
    const f = MM.num, l = v.P * v.n, dm = v.d - v.P / 2, lam = Math.atan(l / (Math.PI * dm)), sec = 1 / Math.cos(15 * Math.PI / 180), mu = v.mu * sec;
    const T = v.F * dm / 2 * (l + Math.PI * mu * dm) / (Math.PI * dm - mu * l) / 1000, eff = v.F * l / (2 * Math.PI * T * 1000) * 100;
    const Tl = v.F * dm / 2 * (Math.PI * mu * dm - l) / (Math.PI * dm + mu * l) / 1000;
    return [
      { key: 'l', label: 'Lead', sym: 'l', expr: 'P × z', sub: `${v.P} × ${v.n}`, value: l, unit: ' mm', dp: 1 },
      { key: 'lam', label: 'Thread slope (lead angle)', sym: 'λ', expr: 'atan(l ÷ π dm)', sub: `dm = d − P/2 = ${f(dm, 1)}`, value: lam * 180 / Math.PI, unit: '°', dp: 2 },
      { key: 'v', label: 'Carriage speed', expr: 'l × N ÷ 60', value: l * v.rpm / 60, unit: ' mm/s', dp: 1 },
      { key: 'T', label: 'Torque to push the load', sym: 'T', expr: 'F dm/2 × (l + π μ′ dm) ÷ (π dm − μ′ l)', sub: 'μ′ = μ ÷ cos 15° for a trapezoidal thread', value: T, unit: ' N·m', dp: 3 },
      { key: 'eff', label: 'Efficiency', sym: 'η', expr: 'F l ÷ (2π T)', value: eff, unit: ' %', dp: 0 },
      { key: 'lock', label: 'Self-locking (holds the load by itself)?', expr: 'μ′ > tan λ', value: Tl > 0 ? 'Yes' : 'No: the load can back-drive it', warn: Tl <= 0 },
      { key: 'W', label: 'Motor power needed', expr: 'T × 2πN ÷ 60', value: T * 2 * Math.PI * v.rpm / 60, unit: ' W', dp: 1 }
    ];
  },
  problems: [
    () => { const P = MM.pick([2, 4, 8]), n = MM.pick([1, 2, 4]), N = MM.pick([60, 120, 300]); return { text: `A lead screw has a ${P} mm pitch and ${n} start${n > 1 ? 's' : ''}. How fast does the nut move at ${N} rpm?`, answer: P * n * N / 60, unit: 'mm/s', hint: 'Lead = pitch × starts; speed = lead × turns per second.', steps: [`lead = ${P} × ${n} = ${P * n} mm`, `speed = ${P * n} × ${N} / 60 = ${MM.num(P * n * N / 60, 1)} mm/s`], set: { P, n, rpm: N } }; },
    () => { const P = 2, n = 1, d = 12, F = MM.pick([200, 500, 1000]), dm = d - 1, mu = 0.15 / Math.cos(15 * Math.PI / 180), T = F * dm / 2 * (2 + Math.PI * mu * dm) / (Math.PI * dm - mu * 2) / 1000; return { text: `A Ø12 × 2 single-start trapezoidal screw (μ = 0.15) lifts ${F} N. What torque is needed?`, answer: T, unit: 'N·m', tol: 0.03, hint: 'Use dm = d − P/2 = 11 mm and μ′ = μ / cos 15°.', steps: [`dm = 11 mm, μ′ = ${MM.num(mu, 4)}`, `T = ${F} × 11/2 × (2 + π × ${MM.num(mu, 4)} × 11) / (π × 11 − ${MM.num(mu, 4)} × 2) N·mm`, `T = ${MM.num(T, 3)} N·m`], set: { P, n, d, mu: 0.15, F } }; }
  ],
  challenges: [
    { title: 'Holds without a brake', goal: 'Move the carriage at least 20 mm/s at 300 rpm and still be self-locking.', check: v => v.rpm === 300 && v.v >= 20 && v.lock === 'Yes', hint: 'Self-locking needs a gentle slope: tan λ below μ′. A bigger diameter lets the lead grow without a steeper slope.' },
    { title: 'Efficient mover', goal: 'Efficiency of 45% or more with a load of at least 500 N.', check: v => v.eff >= 45 && v.F >= 500, hint: 'Steeper threads (more starts) and lower friction raise efficiency. But then it no longer self-locks.' }
  ]
});
