MM.addMath('differential', {
  inputs: [
    { key: 'v', label: 'Car speed', sym: 'v', unit: 'km/h', value: 30, min: 0, max: 300, step: 1 },
    { key: 'D', label: 'Tyre diameter', sym: 'D', unit: 'mm', value: 650, min: 100, max: 2000, step: 1 },
    { key: 't', label: 'Track (distance between the wheels)', sym: 't', unit: 'm', value: 1.5, min: 0.2, max: 4, step: 0.01 },
    { key: 'R', label: 'Turn radius (to the middle of the axle)', sym: 'R', unit: 'm', value: 6, min: 0.5, max: 1000, step: 0.1 },
    { key: 'i', label: 'Final drive ratio (ring ÷ pinion teeth)', sym: 'i', value: 3.9, min: 1, max: 10, step: 0.01 },
    { key: 'T', label: 'Torque into the drive pinion', sym: 'T', unit: 'N·m', value: 200, min: 0, max: 5000, step: 1 }
  ],
  outputs(v) {
    const f = MM.num, circ = Math.PI * v.D / 1000, nc = v.v / 3.6 / circ * 60, ni = nc * (v.R - v.t / 2) / v.R, no = nc * (v.R + v.t / 2) / v.R, Tc = v.T * v.i;
    return [
      { key: 'nc', label: 'Case speed (average of the wheels)', sym: 'n_c', expr: 'v ÷ (π D) × 60', sub: `${f(v.v / 3.6, 2)} m/s ÷ ${f(circ, 3)} m × 60`, value: nc, unit: ' rpm', dp: 1 },
      { key: 'ni', label: 'Inner wheel speed', sym: 'n_i', expr: 'n_c × (R − t/2) ÷ R', sub: `${f(nc, 1)} × (${f(v.R)} − ${f(v.t / 2, 3)}) ÷ ${f(v.R)}`, value: ni, unit: ' rpm', dp: 1, warn: ni < 0 },
      { key: 'no', label: 'Outer wheel speed', sym: 'n_o', expr: 'n_c × (R + t/2) ÷ R', sub: `${f(nc, 1)} × (${f(v.R)} + ${f(v.t / 2, 3)}) ÷ ${f(v.R)}`, value: no, unit: ' rpm', dp: 1 },
      { key: 'chk', label: 'Check: average', expr: '(n_i + n_o) ÷ 2', sub: '', value: (ni + no) / 2, unit: ' rpm', dp: 1 },
      { key: 'np', label: 'Drive pinion (propshaft) speed', sym: 'n_p', expr: 'n_c × i', sub: `${f(nc, 1)} × ${f(v.i)}`, value: nc * v.i, unit: ' rpm', dp: 0 },
      { key: 'Tw', label: 'Torque to each wheel (open differential)', sym: 'T_w', expr: 'T × i ÷ 2', sub: `${f(v.T)} × ${f(v.i)} ÷ 2`, value: Tc / 2, unit: ' N·m', dp: 0 }
    ];
  },
  problems: [
    () => { const nc = MM.pick([200, 300, 400]), R = MM.pick([4, 5, 8, 10]), t = MM.pick([1.4, 1.5, 1.6]); const no = nc * (R + t / 2) / R; return { text: `The case turns at ${nc} rpm. The car turns on a ${R} m radius (middle of the axle) with a ${t} m track. How fast does the outer wheel turn?`, answer: no, unit: 'rpm', hint: 'The outer wheel runs on a radius of R + t/2.', steps: [`n_o = ${nc} × (${R} + ${t / 2}) ÷ ${R} = ${MM.num(no, 1)} rpm`], set: { R, t } }; },
    () => { const nl = MM.pick([0, 120, 250]), nr = MM.pick([300, 360, 420]); return { text: `One wheel turns at ${nl} rpm and the other at ${nr} rpm. How fast is the differential case turning?`, answer: (nl + nr) / 2, unit: 'rpm', tol: 0, hint: 'The case speed is always the average of the two wheels.', steps: [`(${nl} + ${nr}) ÷ 2 = ${(nl + nr) / 2} rpm`] }; }
  ],
  challenges: [
    { title: 'Parking turn', goal: 'At 10 km/h on a 4 m turn, with a 1.5 m track: find the outer wheel speed, and make it at least 1.15 times the case speed.', check: v => v.v === 10 && v.R === 4 && v.t === 1.5 && v.no >= 1.15 * v.nc, hint: 'Set the three inputs; the ratio (R + t/2) ÷ R does the rest.' },
    { title: 'Inner wheel stops', goal: 'Find the turn radius at which the inner wheel stands still, for a 1.5 m track.', check: v => v.t === 1.5 && Math.abs(v.ni) < 0.05 && v.v > 0, hint: 'The inner wheel is at R − t/2. Make that zero.' }
  ]
});
