MM.addMath('timing-belt', {
  inputs: [
    { key: 'z1', param: 'z1', label: 'Driver teeth', sym: 'z1' },
    { key: 'z2', param: 'z2', label: 'Driven teeth', sym: 'z2' },
    { key: 'pt', param: 'pt', label: 'Belt pitch', sym: 'p' },
    { key: 'C', label: 'Wanted centre distance', sym: 'C', unit: 'mm', value: 150, min: 10, max: 5000, step: 1 },
    { key: 'spr', label: 'Motor steps per turn × microsteps', sym: 's', value: 3200, min: 1, max: 100000, step: 1 },
    { key: 'rpm', label: 'Driver speed', sym: 'n', unit: 'rpm', value: 300, min: 1, max: 10000, step: 1 }
  ],
  outputs(v) {
    const f = MM.num, d1 = v.pt * v.z1 / Math.PI, d2 = v.pt * v.z2 / Math.PI, L = 2 * v.C + Math.PI * (d1 + d2) / 2 + Math.pow(d2 - d1, 2) / (4 * v.C), N = Math.round(L / v.pt);
    return [
      { key: 'ratio', label: 'Speed ratio', sym: 'i', expr: 'z2 ÷ z1', sub: `${v.z2} ÷ ${v.z1}`, value: v.z2 / v.z1, unit: ' : 1', dp: 2 },
      { key: 'd1', label: 'Driver pitch diameter', sym: 'd1', expr: 'p z1 ÷ π', sub: `${v.pt} × ${v.z1} ÷ π`, value: d1, unit: ' mm', dp: 2 },
      { key: 'L', label: 'Belt length needed', sym: 'L', expr: '2C + π(d1 + d2)/2 + (d2 − d1)² ÷ 4C', value: L, unit: ' mm', dp: 1 },
      { key: 'N', label: 'Nearest whole number of teeth', expr: 'L ÷ p, rounded', value: N, unit: ' teeth', dp: 0 },
      { key: 'v', label: 'Belt speed', sym: 'v', expr: 'p z1 n ÷ 60', value: v.pt * v.z1 * v.rpm / 60 / 1000, unit: ' m/s', dp: 2 },
      { key: 'mmrev', label: 'Travel per driver turn (a 3D printer axis)', expr: 'p × z1', value: v.pt * v.z1, unit: ' mm', dp: 1 },
      { key: 'spmm', label: 'Steps per mm', expr: 's ÷ (p z1)', sub: `${v.spr} ÷ ${v.pt * v.z1}`, value: v.spr / (v.pt * v.z1), unit: '', dp: 2 }
    ];
  },
  problems: [
    () => { const z = MM.pick([16, 20]), spr = MM.pick([3200, 6400]); return { text: `A 3D printer axis uses a GT2 belt (2 mm pitch) on a ${z}-tooth pulley and a motor with ${spr} microsteps per turn. How many steps per mm should be set?`, answer: spr / (2 * z), unit: 'steps/mm', hint: 'One turn moves the belt by pitch × teeth.', steps: [`travel per turn = 2 × ${z} = ${2 * z} mm`, `steps per mm = ${spr} / ${2 * z} = ${MM.num(spr / (2 * z), 2)}`], set: { z1: z, pt: 2, spr } }; },
    () => { const z1 = 20, z2 = MM.pick([40, 60]), n = MM.pick([600, 1200]); return { text: `A ${z1}-tooth pulley turning at ${n} rpm drives a ${z2}-tooth pulley. How fast does the big pulley turn?`, answer: n * z1 / z2, unit: 'rpm', hint: 'The belt moves the same number of teeth past each pulley.', steps: [`n2 = ${n} × ${z1} / ${z2} = ${n * z1 / z2} rpm`], set: { z1, z2 } }; }
  ],
  challenges: [
    { title: 'Fine printer axis', goal: 'At least 100 steps per mm using a GT2 belt and a 3200-step driver.', check: v => v.pt === 2 && v.spr === 3200 && v.spmm >= 100, hint: 'Fewer pulley teeth means more steps per mm.' },
    { title: '3 : 1 reduction', goal: 'A ratio of exactly 3 : 1 with at least 15 teeth on the driver.', check: v => Math.abs(v.ratio - 3) < 1e-9 && v.z1 >= 15, hint: 'Pick driven = 3 × driver.' }
  ]
});
