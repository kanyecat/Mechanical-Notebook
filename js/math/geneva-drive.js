MM.addMath('geneva-drive', {
  inputs: [
    { key: 'z', label: 'Number of slots', sym: 'z', value: 4, min: 3, max: 18, step: 1 },
    { key: 'C', label: 'Centre distance', sym: 'C', unit: 'mm', value: 100, min: 10, max: 2000, step: 1 },
    { key: 'rpm', label: 'Driver speed', sym: 'n', unit: 'rpm', value: 60, min: 1, max: 2000, step: 1 }
  ],
  outputs(v) {
    const f = MM.num, s = Math.sin(Math.PI / v.z), T = 60 / v.rpm, mv = (v.z - 2) / (2 * v.z);
    return [
      { key: 'step', label: 'Index angle per step', sym: 'φ', expr: '360° ÷ z', sub: `360 ÷ ${v.z}`, value: 360 / v.z, unit: '°', dp: 1 },
      { key: 'r', label: 'Pin radius on the driver', sym: 'r', expr: 'C sin(180° ÷ z)', sub: `${v.C} × sin ${f(180 / v.z, 2)}°`, value: v.C * s, unit: ' mm', dp: 1 },
      { key: 'R', label: 'Wheel radius', sym: 'R', expr: 'C cos(180° ÷ z)', sub: `${v.C} × cos ${f(180 / v.z, 2)}°`, value: v.C * Math.cos(Math.PI / v.z), unit: ' mm', dp: 1 },
      { key: 'mv', label: 'Share of each turn spent moving', expr: '(z − 2) ÷ 2z', sub: `(${v.z} − 2) ÷ ${2 * v.z}`, value: mv * 100, unit: ' %', dp: 1 },
      { key: 'tm', label: 'Moving time per step', sym: 'tₘ', expr: 'share × 60 ÷ n', sub: '', value: mv * T, unit: ' s', dp: 3 },
      { key: 'td', label: 'Dwell (rest) time per step', sym: 't_d', expr: '(1 − share) × 60 ÷ n', sub: '', value: (1 - mv) * T, unit: ' s', dp: 3 },
      { key: 'pk', label: 'Peak wheel speed ÷ driver speed', expr: 'r ÷ (C − r) = sin(π/z) ÷ (1 − sin(π/z))', sub: `${f(s, 3)} ÷ ${f(1 - s, 3)}`, value: s / (1 - s), unit: '×', dp: 2 }
    ];
  },
  problems: [
    () => { const z = MM.pick([4, 5, 6, 8]), n = MM.pick([20, 30, 40, 60]); const d = (z + 2) / (2 * z) * 60 / n; return { text: `A ${z}-slot Geneva driver turns at ${n} rpm. How long does the wheel rest between steps?`, answer: d, unit: 's', tol: 0.01, hint: 'The wheel moves for (z − 2)/2z of each turn and rests for the rest.', steps: [`one turn = 60 ÷ ${n} = ${MM.num(60 / n, 3)} s`, `rest share = 1 − (${z} − 2)/${2 * z} = ${MM.num((z + 2) / (2 * z), 3)}`, `rest time = ${MM.num(d, 3)} s`], set: { z, rpm: n } }; },
    () => { const z = MM.pick([4, 5, 6, 8]), C = MM.pick([80, 100, 120, 150]); return { text: `A ${z}-slot Geneva has a centre distance of ${C} mm. What pin radius does the driver need?`, answer: C * Math.sin(Math.PI / z), unit: 'mm', tol: 0.01, hint: 'The pin enters the slot square-on, so r = C sin(180°/z).', steps: [`r = ${C} × sin(${MM.num(180 / z, 2)}°) = ${MM.num(C * Math.sin(Math.PI / z), 1)} mm`], set: { z, C } }; },
    () => { const z = MM.pick([3, 4, 6, 8]); const s = Math.sin(Math.PI / z); return { text: `For a ${z}-slot Geneva, how many times faster than the driver does the wheel spin at its fastest?`, answer: s / (1 - s), unit: '×', tol: 0.01, hint: 'At the middle of a step the pin is closest to the wheel centre: distance C − r.', steps: [`sin(180°/${z}) = ${MM.num(s, 4)}`, `ratio = ${MM.num(s, 4)} ÷ ${MM.num(1 - s, 4)} = ${MM.num(s / (1 - s), 2)}`], set: { z } }; }
  ],
  challenges: [
    { title: 'Bottle filler', goal: '40 steps per minute, at least 5 stations, and every bottle rests for 1 s or more.', check: v => v.rpm === 40 && v.z >= 5 && v.td >= 1, hint: 'Rest share must be at least 2/3 of the 1.5 s turn.' },
    { title: 'Gentle indexing', goal: 'Peak wheel speed no more than 1.5× the driver, with a wheel radius of 100 mm ±1.', check: v => v.pk <= 1.5 && Math.abs(v.R - 100) <= 1, hint: 'More slots lower the peak. Then set C = R ÷ cos(180°/z).' }
  ]
});
