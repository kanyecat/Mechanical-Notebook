MM.addMath('intermittent-gear', {
  inputs: [
    { key: 'k', param: 'k', label: 'Teeth on the driver', sym: 'k' },
    { key: 'Nd', label: 'Tooth spaces round the driver (as if it were a full gear)', sym: 'N_d', value: 24, min: 4, max: 200, step: 1 },
    { key: 'N2', label: 'Driven gear teeth', sym: 'N₂', value: 20, min: 4, max: 400, step: 1 },
    { key: 'n', label: 'Driver speed', sym: 'n', unit: 'rpm', value: 30, min: 0.1, max: 2000, step: 0.1 }
  ],
  outputs(v) {
    const f = MM.num, step = v.k / v.N2 * 360, T = 60 / v.n, mv = v.k / v.Nd;
    return [
      { key: 'step', label: 'Step of the driven gear', sym: 'Δφ', expr: 'k ÷ N₂ × 360°', sub: `${v.k} ÷ ${v.N2} × 360°`, value: step, unit: '°', dp: 2 },
      { key: 'steps', label: 'Steps for one full turn of the driven gear', expr: 'N₂ ÷ k', sub: `${v.N2} ÷ ${v.k}`, value: v.N2 / v.k, dp: 2, warn: !Number.isInteger(v.N2 / v.k) },
      { key: 'mv', label: 'Share of each turn spent moving', expr: 'k ÷ N_d', sub: `${v.k} ÷ ${v.Nd}`, value: mv * 100, unit: ' %', dp: 1, warn: v.k > v.Nd },
      { key: 'tm', label: 'Moving time per step', expr: '(60 ÷ n) × k ÷ N_d', sub: `${f(T, 3)} s × ${f(mv, 3)}`, value: T * mv, unit: ' s', dp: 3 },
      { key: 'td', label: 'Resting time per step', expr: '(60 ÷ n) × (1 − k ÷ N_d)', sub: '', value: T * (1 - mv), unit: ' s', dp: 3 },
      { key: 'r', label: 'Speed ratio while moving', expr: 'N_d ÷ N₂', sub: `${v.Nd} ÷ ${v.N2}`, value: v.Nd / v.N2, unit: ' : 1', dp: 3 }
    ];
  },
  problems: [
    () => { const k = MM.pick([2, 3, 4, 5]), N2 = MM.pick([20, 24, 30, 40]); return { text: `A driver with ${k} teeth turns a ${N2}-tooth gear. How many degrees does the driven gear turn per driver turn?`, answer: k / N2 * 360, unit: '°', hint: 'Each driver tooth moves the driven gear one tooth: k ÷ N₂ of a turn.', steps: [`${k} ÷ ${N2} × 360° = ${MM.num(k / N2 * 360, 2)}°`], set: { k, N2 } }; },
    () => { const k = MM.pick([2, 3, 4]), Nd = MM.pick([16, 20, 24]), n = MM.pick([10, 20, 30, 60]); const td = 60 / n * (1 - k / Nd); return { text: `${k} teeth on a driver with ${Nd} tooth spaces, turning at ${n} rpm. How long does the driven gear rest between steps?`, answer: td, unit: 's', hint: 'One turn takes 60 ÷ n seconds; the rest is the share without teeth.', steps: [`one turn = ${MM.num(60 / n, 3)} s`, `rest = ${MM.num(60 / n, 3)} × (1 − ${k}/${Nd}) = ${MM.num(td, 3)} s`], set: { k, Nd, n } }; }
  ],
  challenges: [
    { title: 'Counter wheel', goal: 'One tenth of a turn per driver turn, for a digit wheel with 0–9.', check: v => Math.abs(v.step - 36) < 1e-9, hint: 'k ÷ N₂ = 1 ÷ 10: for example 2 teeth and a 20-tooth gear.' },
    { title: 'Long rest', goal: 'Rest for at least 1.5 s and move a quarter turn every driver turn.', check: v => Math.abs(v.step - 90) < 1e-9 && v.td >= 1.5, hint: 'k ÷ N₂ = 1/4, then slow the driver or give it more empty space.' }
  ]
});
