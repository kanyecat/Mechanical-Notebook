MM.addMath('ball-bearing', {
  inputs: [
    { key: 'C', label: 'Dynamic load rating (from the catalogue)', sym: 'C', unit: 'kN', value: 13.8, min: 0.1, max: 2000, step: 0.1 },
    { key: 'P', label: 'Load on the bearing', sym: 'P', unit: 'kN', value: 2, min: 0.01, max: 2000, step: 0.01 },
    { key: 'n', label: 'Shaft speed', sym: 'n', unit: 'rpm', value: 1500, min: 1, max: 60000, step: 10 },
    { key: 'dpw', label: 'Pitch diameter of the ball set', sym: 'Dpw', unit: 'mm', value: 46, min: 5, max: 1000, step: 1 },
    { key: 'dw', label: 'Ball diameter', sym: 'Dw', unit: 'mm', value: 9.5, min: 0.5, max: 100, step: 0.1 }
  ],
  outputs(v) {
    const f = MM.num, L10 = Math.pow(v.C / v.P, 3), h = L10 * 1e6 / (60 * v.n), g = v.dw / v.dpw;
    return [
      { key: 'L10', label: 'Basic life', sym: 'L10', expr: '(C ÷ P)³', sub: `(${v.C} ÷ ${v.P})³`, value: L10, unit: ' million turns' },
      { key: 'h', label: 'Life in hours', sym: 'L10h', expr: 'L10 × 10⁶ ÷ (60 n)', sub: `${f(L10)} × 10⁶ ÷ (60 × ${v.n})`, value: h, unit: ' h', dp: 0 },
      { key: 'yrs', label: 'Running 8 h a day', expr: 'L10h ÷ (8 × 365)', value: h / 2920, unit: ' years', dp: 1 },
      { key: 'cage', label: 'Cage speed', sym: 'nc', expr: 'n ÷ 2 × (1 − Dw ÷ Dpw)', sub: `${v.n} ÷ 2 × (1 − ${f(g, 3)})`, value: v.n / 2 * (1 - g), unit: ' rpm' },
      { key: 'ball', label: 'Each ball spins at', sym: 'nb', expr: 'n × Dpw ÷ (2 Dw) × (1 − (Dw ÷ Dpw)²)', value: v.n / (2 * g) * (1 - g * g), unit: ' rpm' },
      { key: 'ratio', label: 'Load ratio', expr: 'C ÷ P', value: v.C / v.P, unit: '', dp: 2, warn: v.C / v.P < 2 }
    ];
  },
  problems: [
    () => { const C = MM.pick([9.5, 13.8, 19.5, 29.6]), P = MM.pick([1, 1.5, 2, 3]), L = Math.pow(C / P, 3); return { text: `A bearing has a dynamic load rating C = ${C} kN and carries P = ${P} kN. What is its L10 life in millions of turns?`, answer: L, unit: 'million turns', hint: 'For ball bearings L10 = (C / P)³.', steps: [`C / P = ${MM.num(C / P, 3)}`, `L10 = ${MM.num(C / P, 3)}³ = ${MM.num(L)} million turns`], set: { C, P } }; },
    () => { const C = 13.8, P = MM.pick([1.5, 2, 2.5]), n = MM.pick([900, 1500, 3000]), h = Math.pow(C / P, 3) * 1e6 / (60 * n); return { text: `A 6205 bearing (C = 13.8 kN) carries ${P} kN at ${n} rpm. How many hours will 90% of these bearings last?`, answer: h, unit: 'h', tol: 0.03, hint: 'Find L10 in millions of turns, then divide the number of turns by the turns per hour.', steps: [`L10 = (13.8 / ${P})³ = ${MM.num(Math.pow(C / P, 3))} million turns`, `turns per hour = 60 × ${n} = ${60 * n}`, `L10h = ${MM.num(Math.pow(C / P, 3))} × 10⁶ / ${60 * n} = ${MM.num(h, 0)} h`], set: { C, P, n } }; },
    () => { const k = MM.pick([2, 3]); return { text: `If the load on a ball bearing is cut to 1/${k} of what it was, how many times longer does it last?`, answer: Math.pow(k, 3), unit: '×', hint: 'Life goes with the cube of C / P.', steps: [`life ∝ (1 / P)³`, `(${k})³ = ${Math.pow(k, 3)} times longer`] }; }
  ],
  challenges: [
    { title: 'Five years on one shift', goal: 'At least 5 years at 8 hours a day, at 1500 rpm, carrying 3 kN or more.', check: v => v.n === 1500 && v.P >= 3 && v.yrs >= 5, hint: 'You need L10h ≥ 14 600 h. Solve (C / P)³ × 10⁶ / 90 000 ≥ 14 600 for C.' },
    { title: 'Fast spindle', goal: 'A cage speed over 10 000 rpm with a life of at least 20 000 hours.', check: v => v.cage > 10000 && v.h >= 20000, hint: 'Cage speed is a bit under half the shaft speed. Then raise C or lower P to keep the life up.' }
  ]
});
