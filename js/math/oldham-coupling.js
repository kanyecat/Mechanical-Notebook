MM.addMath('oldham-coupling', {
  inputs: [
    { key: 'e', param: 'e', label: 'Offset between the shafts', sym: 'e', unit: 'mm' },
    { key: 'n', label: 'Shaft speed', sym: 'n', unit: 'rpm', value: 600, min: 0, max: 20000, step: 1 },
    { key: 'T', label: 'Torque carried', sym: 'T', unit: 'N·m', value: 2, min: 0, max: 10000, step: 0.1 },
    { key: 'Dd', label: 'Disc diameter', sym: 'D', unit: 'mm', value: 40, min: 2, max: 2000, step: 1 }
  ],
  outputs(v) {
    const f = MM.num, w = v.n * 2 * Math.PI / 60, vs = v.e / 1000 * w;
    return [
      { key: 'ratio', label: 'Output speed ÷ input speed', value: '1 exactly, at every moment' },
      { key: 'stroke', label: 'Sliding in each slot, end to end', sym: '2e', expr: '2 × e', sub: `2 × ${f(v.e)}`, value: 2 * v.e, unit: ' mm' },
      { key: 'vs', label: 'Fastest sliding speed', sym: 'v', expr: 'e × ω', sub: `${f(v.e)} mm × ${f(w, 2)} rad/s`, value: vs, unit: ' m/s', dp: 3 },
      { key: 'orbit', label: 'Disc centre circles at', expr: '2 × n, on a circle of diameter e', sub: '', value: 2 * v.n, unit: ' rpm' },
      { key: 'F', label: 'Push on each tongue (rough, force at half the disc radius)', sym: 'F', expr: 'T ÷ (D ÷ 4)', sub: `${f(v.T)} ÷ ${f(v.Dd / 4000, 4)} m`, value: v.T / (v.Dd / 4000), unit: ' N', dp: 0 },
      { key: 'P', label: 'Rubbing power to expect, both slots (friction 0.15)', expr: '0.15 × F × average sliding speed', sub: '', value: 0.15 * v.T / (v.Dd / 4000) * vs * 2 / Math.PI * 2, unit: ' W', dp: 2 }
    ];
  },
  problems: [
    () => { const e = MM.pick([1, 2, 3, 5]), n = MM.pick([300, 600, 1500, 3000]); const vs = e / 1000 * n * 2 * Math.PI / 60; return { text: `An Oldham coupling joins shafts ${e} mm out of line, turning at ${n} rpm. What is the fastest sliding speed of the disc in its slots?`, answer: vs, unit: 'm/s', hint: 'v = e × ω, with ω in rad/s and e in metres.', steps: [`ω = ${n} × 2π ÷ 60 = ${MM.num(n * 2 * Math.PI / 60, 2)} rad/s`, `v = ${e / 1000} × ${MM.num(n * 2 * Math.PI / 60, 2)} = ${MM.num(vs, 3)} m/s`], set: { e, n } }; }
  ],
  challenges: [
    { title: '3D printer Z axis', goal: 'A 2 mm offset at 300 rpm, with sliding slower than 0.1 m/s.', check: v => v.e === 2 && v.n === 300 && v.vs < 0.1, hint: 'Set the offset and speed; check the sliding speed.' },
    { title: 'Gentle on the tongues', goal: 'Carry 5 N·m with less than 500 N on each tongue.', check: v => v.T === 5 && v.F < 500, hint: 'A larger disc spreads the load.' }
  ]
});
