MM.addMath('anchor-escapement', {
  inputs: [
    { key: 'L', label: 'Pendulum length (pivot to the centre of the bob)', sym: 'L', unit: 'mm', value: 500, min: 10, max: 20000, step: 1 },
    { key: 'N', label: 'Escape wheel teeth', sym: 'N', value: 30, min: 6, max: 200, step: 1 }
  ],
  outputs(v) {
    const f = MM.num, g = 9.81, T = 2 * Math.PI * Math.sqrt(v.L / 1000 / g);
    return [
      { key: 'T', label: 'Period (one full swing there and back)', sym: 'T', expr: '2π √(L ÷ g)', sub: `2π √(${f(v.L / 1000, 3)} ÷ 9.81)`, value: T, unit: ' s', dp: 4 },
      { key: 'beat', label: 'Beat (one tick: a swing one way)', expr: 'T ÷ 2', sub: '', value: T / 2, unit: ' s', dp: 4 },
      { key: 'bph', label: 'Beats per hour', expr: '3600 ÷ beat', sub: '', value: 7200 / T, dp: 0 },
      { key: 'turn', label: 'Time for one turn of the escape wheel', expr: 'N × T', sub: `${v.N} × ${f(T, 4)}`, value: v.N * T, unit: ' s', dp: 2 },
      { key: 'rpm', label: 'Escape wheel speed', expr: '60 ÷ (N × T)', sub: '', value: 60 / (v.N * T), unit: ' rpm', dp: 4 },
      { key: 'warm', label: 'Clock loses per day if a steel rod warms by about 8 °C (it grows 0.01 %)', expr: '86400 × 0.01 % ÷ 2', sub: 'period goes up with √L', value: 86400 * 0.0001 / 2, unit: ' s slow', dp: 1 }
    ];
  },
  problems: [
    () => { const b = MM.pick([0.5, 0.75, 1, 1.5]); const L = 9.81 * (2 * b / (2 * Math.PI)) ** 2 * 1000; return { text: `You want each tick (beat) to last ${b} s. How long must the pendulum be, in millimetres?`, answer: L, unit: 'mm', hint: 'The period T is two beats. Then L = g (T ÷ 2π)².', steps: [`T = 2 × ${b} = ${2 * b} s`, `L = 9.81 × (${2 * b} ÷ 2π)² = ${MM.num(L / 1000, 4)} m = ${MM.num(L, 0)} mm`], set: { L: Math.round(L) } }; },
    () => { const L = MM.pick([250, 500, 994, 1500]), N = MM.pick([24, 30, 40]); const T = 2 * Math.PI * Math.sqrt(L / 1000 / 9.81); return { text: `Pendulum ${L} mm long, escape wheel with ${N} teeth. How many seconds does the wheel take to turn once?`, answer: N * T, unit: 's', hint: 'The wheel moves one whole tooth per period T.', steps: [`T = 2π √(${L / 1000} ÷ 9.81) = ${MM.num(T, 4)} s`, `turn = ${N} × ${MM.num(T, 4)} = ${MM.num(N * T, 2)} s`], set: { L, N } }; }
  ],
  challenges: [
    { title: 'Seconds hand on the wheel', goal: 'A one-second beat, and an escape wheel that turns once a minute so a seconds hand can sit on its arbor.', check: v => Math.abs(v.beat - 1) < 0.002 && Math.abs(v.turn - 60) < 0.2, hint: 'A seconds pendulum is about 994 mm. Then 60 s ÷ 2 s per tooth.' },
    { title: 'Mantel clock', goal: 'A pendulum shorter than 250 mm with 7200 or more beats per hour.', check: v => v.L < 250 && v.bph >= 7200, hint: '7200 beats an hour is a half-second beat.' }
  ]
});
