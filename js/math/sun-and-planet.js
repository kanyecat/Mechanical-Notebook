MM.addMath('sun-and-planet', {
  inputs: [
    { key: 'Ns', label: 'Sun teeth', sym: 'Nₛ', value: 24, min: 6, max: 300, step: 1 },
    { key: 'Np', param: 'np', label: 'Planet teeth', sym: 'Nₚ' },
    { key: 'm', label: 'Module', sym: 'm', unit: 'mm', value: 4, min: 0.2, max: 50, step: 0.1 },
    { key: 'spm', label: 'Engine cycles (up and down strokes) per minute', sym: 'c', unit: '/min', value: 20, min: 0.1, max: 2000, step: 0.1 }
  ],
  outputs(v) {
    const f = MM.num, i = 1 + v.Np / v.Ns;
    return [
      { key: 'i', label: 'Sun turns per engine cycle', sym: 'i', expr: '1 + Nₚ ÷ Nₛ', sub: `1 + ${v.Np} ÷ ${v.Ns}`, value: i, unit: ' ×', dp: 3 },
      { key: 'n', label: 'Output shaft speed', sym: 'n', expr: 'c × i', sub: `${f(v.spm)} × ${f(i, 3)}`, value: v.spm * i, unit: ' rpm', dp: 1 },
      { key: 'a', label: 'Centre distance (length of the link that keeps them in mesh)', sym: 'a', expr: 'm (Nₛ + Nₚ) ÷ 2', sub: `${f(v.m)} × (${v.Ns} + ${v.Np}) ÷ 2`, value: v.m * (v.Ns + v.Np) / 2, unit: ' mm', dp: 1 },
      { key: 'crank', label: 'Same stroke from a plain crank would need a crank of', expr: 'a (the planet centre goes round a circle of radius a)', sub: '', value: v.m * (v.Ns + v.Np) / 2, unit: ' mm', dp: 1 }
    ];
  },
  problems: [
    () => { const Ns = MM.pick([20, 24, 30]), Np = MM.pick([20, 24, 30, 36]), c = MM.pick([15, 20, 25]); const n = c * (1 + Np / Ns); return { text: `Sun ${Ns} teeth, planet ${Np} teeth, engine at ${c} cycles a minute. How fast does the output shaft turn?`, answer: n, unit: 'rpm', hint: 'Sun turns per cycle = 1 + Nₚ ÷ Nₛ.', steps: [`i = 1 + ${Np}/${Ns} = ${MM.num(1 + Np / Ns, 3)}`, `n = ${c} × ${MM.num(1 + Np / Ns, 3)} = ${MM.num(n, 1)} rpm`], set: { Ns, Np, spm: c } }; }
  ],
  challenges: [
    { title: 'Watt\'s doubling', goal: 'A 30-tooth sun, and the output turns exactly twice per engine cycle.', check: v => v.Ns === 30 && Math.abs(v.i - 2) < 1e-9, hint: 'Make the planet the same size as the sun.' },
    { title: 'Flywheel at 60 rpm', goal: 'An engine at 24 cycles a minute drives the output at 60 rpm.', check: v => v.spm === 24 && Math.abs(v.n - 60) < 1e-6, hint: 'You need i = 2.5, so Nₚ = 1.5 × Nₛ.' }
  ]
});
