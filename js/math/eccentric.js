MM.addMath('eccentric', {
  inputs: [
    { key: 'e', param: 'e', label: 'Eccentricity', sym: 'e', unit: 'mm' },
    { key: 'L', param: 'L', label: 'Rod length (strap centre to rod pin)', sym: 'L', unit: 'mm' },
    { key: 'n', label: 'Shaft speed', sym: 'n', unit: 'rpm', value: 200, min: 0, max: 10000, step: 1 },
    { key: 'ds', label: 'Shaft diameter', sym: 'd', unit: 'mm', value: 40, min: 1, max: 1000, step: 1 },
    { key: 'F', label: 'Force on the rod', sym: 'F', unit: 'N', value: 500, min: 0, max: 100000, step: 1 },
    { key: 'mu', label: 'Friction in the strap', sym: 'μ', value: 0.05, min: 0, max: 1, step: 0.01 }
  ],
  outputs(v) {
    const f = MM.num, w = v.n * 2 * Math.PI / 60, D = v.ds + 2 * v.e + 10, P = v.mu * v.F * (D / 2000) * w;
    return [
      { key: 's', label: 'Stroke', sym: 's', expr: '2e', sub: `2 × ${f(v.e)}`, value: 2 * v.e, unit: ' mm' },
      { key: 'D', label: 'Smallest disc that still surrounds the shaft (5 mm wall)', sym: 'D', expr: 'd + 2e + 10', sub: `${f(v.ds)} + 2 × ${f(v.e)} + 10`, value: D, unit: ' mm' },
      { key: 'vmax', label: 'Fastest rod speed (about)', sym: 'v', expr: 'e × ω', sub: `${f(v.e)} mm × ${f(w, 2)} rad/s`, value: v.e / 1000 * w, unit: ' m/s', dp: 3 },
      { key: 'ratio', label: 'Rod to eccentricity ratio', expr: 'L ÷ e', sub: `${f(v.L)} ÷ ${f(v.e)}`, value: v.L / v.e, dp: 1, warn: v.L / v.e < 4 },
      { key: 'P', label: 'Power lost rubbing in the strap', sym: 'P', expr: 'μ × F × (D ÷ 2) × ω', sub: `${f(v.mu)} × ${f(v.F)} × ${f(D / 2000, 4)} m × ${f(w, 2)}`, value: P, unit: ' W', dp: 1 },
      { key: 'Pcrank', label: 'Same, with a 20 mm crank pin instead', expr: 'μ × F × 0.01 m × ω', sub: '', value: v.mu * v.F * 0.01 * w, unit: ' W', dp: 1 }
    ];
  },
  problems: [
    () => { const e = MM.pick([5, 8, 12, 20]); return { text: `An eccentric is ${e} mm off centre. What stroke does the rod make?`, answer: 2 * e, unit: 'mm', tol: 0, hint: 'Stroke = 2e, as for a crank of length e.', steps: [`2 × ${e} = ${2 * e} mm`], set: { e } }; },
    () => { const d = MM.pick([30, 40, 50]), e = MM.pick([8, 10, 15]); return { text: `A shaft of ${d} mm must pass through an eccentric with a ${e} mm throw and a 5 mm wall. What is the smallest disc diameter?`, answer: d + 2 * e + 10, unit: 'mm', tol: 0, hint: 'The shaft sits e off centre, so the disc must reach d/2 + e + 5 from its centre.', steps: [`D = ${d} + 2 × ${e} + 10 = ${d + 2 * e + 10} mm`], set: { ds: d, e } }; }
  ],
  challenges: [
    { title: 'Pump drive', goal: 'A 36 mm stroke on a 50 mm shaft, with a rod at least 4 times the eccentricity.', check: v => v.s === 36 && v.ds === 50 && v.ratio >= 4, hint: 'e = 18 mm; the rod must then be 72 mm or more.' },
    { title: 'Cool running', goal: 'Lose less than 20 W in the strap with 2000 N on the rod at 300 rpm.', check: v => v.F === 2000 && v.n === 300 && v.P < 20, hint: 'A smaller shaft or eccentricity shrinks the disc; a ball bearing in the strap lowers μ to about 0.005.' }
  ]
});
