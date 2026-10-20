MM.addMath('jansen-linkage', {
  // measured from the drawing's own geometry (Jansen's numbers, crank = 15): foot flat on the ground for 42% of a turn,
  // covering 55.9 units, and lifting 22.5 units at most
  inputs: [
    { key: 'cr', label: 'Crank length', sym: 'm', unit: 'mm', value: 150, min: 5, max: 2000, step: 1 },
    { key: 'rpm', label: 'Crank speed', sym: 'n', unit: 'rpm', value: 30, min: 1, max: 600, step: 1 }
  ],
  outputs(v) {
    const f = MM.num, k = v.cr / 15, stride = 55.94 * k, g = 0.42, T = 60 / v.rpm, sp = stride / 1000 / (g * T);
    return [
      { key: 'k', label: 'Scale factor', sym: 'k', expr: 'crank ÷ 15', sub: `${v.cr} ÷ 15`, value: k, unit: '×', dp: 2 },
      { key: 'stride', label: 'Foot travel on the ground', sym: 's', expr: '55.9 k', sub: `55.9 × ${f(k, 2)}`, value: stride, unit: ' mm' },
      { key: 'lift', label: 'Foot lift', sym: 'h', expr: '22.5 k', sub: `22.5 × ${f(k, 2)}`, value: 22.46 * k, unit: ' mm' },
      { key: 'g', label: 'Share of each turn on the ground', value: 42, unit: ' %', dp: 0 },
      { key: 'v', label: 'Walking speed', sym: 'v', expr: 's ÷ (0.42 × 60/n)', sub: `${f(stride / 1000, 3)} m ÷ (0.42 × ${f(T, 2)} s)`, value: sp, unit: ' m/s', dp: 2 },
      { key: 'kmh', label: 'Walking speed', expr: 'v × 3.6', value: sp * 3.6, unit: ' km/h', dp: 2 },
      { key: 'legs', label: 'Legs per side so one is always down', expr: '⌈1 ÷ 0.42⌉', value: 3, unit: '', dp: 0 }
    ];
  },
  problems: [
    () => { const cr = MM.pick([30, 50, 100, 150, 200]); return { text: `A Jansen leg is built with a ${cr} mm crank. How far does the foot travel along the ground each step?`, answer: 55.94 * cr / 15, unit: 'mm', tol: 0.01, hint: 'All the bars scale together. With a 15-unit crank the ground travel is 55.9 units.', steps: [`k = ${cr} ÷ 15 = ${MM.num(cr / 15, 3)}`, `s = 55.9 × k = ${MM.num(55.94 * cr / 15, 0)} mm`], set: { cr } }; },
    () => { const cr = MM.pick([100, 150, 200]), n = MM.pick([20, 30, 40]); const s = 55.94 * cr / 15 / 1000, v = s / (0.42 * 60 / n); return { text: `Crank ${cr} mm at ${n} rpm. Roughly how fast does the machine walk, in m/s?`, answer: v, unit: 'm/s', tol: 0.02, hint: 'The body moves as fast as a planted foot slides backwards: ground travel ÷ time on the ground.', steps: [`s = ${MM.num(s, 3)} m`, `time on ground = 0.42 × 60/${n} = ${MM.num(0.42 * 60 / n, 3)} s`, `v = ${MM.num(v, 2)} m/s`], set: { cr, rpm: n } }; }
  ],
  challenges: [
    { title: 'Beach Strandbeest', goal: 'Walk at 1 m/s or faster with the crank at no more than 40 rpm and a foot lift of at least 150 mm.', check: v => v.rpm <= 40 && v.v >= 1 && v.lift >= 150, hint: 'Lift sets the crank size. Then pick the speed.' },
    { title: 'Desk toy', goal: 'Whole leg small: crank under 20 mm, but still walking at 5 cm/s or more.', check: v => v.cr < 20 && v.v >= 0.05, hint: 'Small legs need a faster crank.' }
  ]
});
