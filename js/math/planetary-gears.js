MM.addMath('planetary-gears', {
  inputs: [
    { key: 'Ns', label: 'Sun teeth', sym: 'Nₛ', value: 24, min: 6, max: 200, step: 1 },
    { key: 'Nr', label: 'Ring teeth', sym: 'Nᵣ', value: 48, min: 12, max: 400, step: 1 },
    { key: 'k', label: 'Number of planets', sym: 'k', value: 3, min: 2, max: 8, step: 1 },
    { key: 'mode', param: 'mode' },
    { key: 'rpm', label: 'Input speed', sym: 'n', unit: 'rpm', value: 1500, min: 1, max: 20000, step: 1 },
    { key: 'T', label: 'Input torque', sym: 'T', unit: 'N·m', value: 20, min: 0, max: 10000, step: 0.1 }
  ],
  outputs(v) {
    const f = MM.num, Np = (v.Nr - v.Ns) / 2, s = v.Ns, r = v.Nr;
    // Willis: (ws - wc) / (wr - wc) = -Nr / Ns
    const M = [
      { name: 'Ring fixed: sun in, carrier out', i: 1 + r / s, expr: '1 + Nᵣ ÷ Nₛ', sub: `1 + ${r} ÷ ${s}` },
      { name: 'Carrier fixed: sun in, ring out (reversed)', i: -r / s, expr: '−Nᵣ ÷ Nₛ', sub: `−${r} ÷ ${s}` },
      { name: 'Sun fixed: ring in, carrier out', i: 1 + s / r, expr: '1 + Nₛ ÷ Nᵣ', sub: `1 + ${s} ÷ ${r}` }
    ][v.mode | 0];
    const asm = (s + r) / v.k;
    return [
      { key: 'Np', label: 'Planet teeth', sym: 'Nₚ', expr: '(Nᵣ − Nₛ) ÷ 2', sub: `(${r} − ${s}) ÷ 2`, value: Np, dp: Number.isInteger(Np) ? 0 : 1, warn: !Number.isInteger(Np) },
      { key: 'fit', label: 'Planets fit?', expr: 'Nₚ whole and (Nₛ + Nᵣ) ÷ k whole', sub: `${s + r} ÷ ${v.k} = ${f(asm, 2)}`, value: Number.isInteger(Np) && Number.isInteger(asm) && Np > 0 ? 'Yes' : 'No', warn: !(Number.isInteger(Np) && Number.isInteger(asm)) },
      { key: 'i', label: M.name, sym: 'i', expr: M.expr, sub: M.sub, value: M.i, unit: ' : 1', dp: 3 },
      { key: 'out', label: 'Output speed', sym: 'n_out', expr: 'n ÷ i', sub: `${f(v.rpm, 0)} ÷ ${f(M.i, 3)}`, value: v.rpm / M.i, unit: ' rpm' },
      { key: 'Tout', label: 'Output torque (no losses)', sym: 'T_out', expr: 'T × |i|', sub: `${f(v.T)} × ${f(Math.abs(M.i), 3)}`, value: v.T * Math.abs(M.i), unit: ' N·m' }
    ];
  },
  problems: [
    () => { const Ns = MM.pick([12, 16, 18, 20, 24, 30]), Nr = Ns + 2 * MM.rnd(8, 30); return { text: `Ring fixed, sun is the input. Sun ${Ns} teeth, ring ${Nr} teeth. What is the reduction ratio from sun to carrier?`, answer: 1 + Nr / Ns, unit: ': 1', hint: 'With the ring held: i = 1 + Nᵣ/Nₛ.', steps: [`i = 1 + ${Nr} ÷ ${Ns} = ${MM.num(1 + Nr / Ns, 3)}`], set: { Ns, Nr, mode: 0 } }; },
    () => { const Ns = MM.pick([18, 20, 24, 30]), Np = MM.pick([12, 15, 18, 21]); return { text: `A sun with ${Ns} teeth meshes with planets of ${Np} teeth. How many teeth must the ring have?`, answer: Ns + 2 * Np, unit: 'teeth', tol: 0, hint: 'Ring pitch diameter = sun + two planets.', steps: [`Nᵣ = Nₛ + 2 Nₚ = ${Ns} + 2 × ${Np} = ${Ns + 2 * Np}`] }; },
    () => { const Ns = 24, Nr = 48, rpm = MM.pick([600, 1200, 1800]); return { text: `Carrier held still. Sun ${Ns} teeth at ${rpm} rpm, ring ${Nr} teeth. How fast does the ring turn? (Give the size; it turns backwards.)`, answer: rpm * Ns / Nr, unit: 'rpm', hint: 'With the carrier held, it is a simple gear pair through the planets: ring speed = sun speed × Nₛ/Nᵣ, reversed.', steps: [`n_ring = ${rpm} × ${Ns} ÷ ${Nr} = ${rpm * Ns / Nr} rpm, opposite direction`], set: { Ns, Nr, rpm, mode: 1 } }; }
  ],
  challenges: [
    { title: '5 : 1 reduction', goal: 'Ring fixed, ratio exactly 5 : 1, and three planets fit evenly.', check: v => v.mode === 0 && Math.abs(v.i - 5) < 1e-9 && v.k === 3 && v.fit === 'Yes', hint: 'Nᵣ = 4 Nₛ. Then check (Nₛ + Nᵣ) ÷ 3 is whole.' },
    { title: 'Compact reducer', goal: 'Ring fixed, ratio between 3.5 and 4 : 1, ring of 60 teeth or fewer, three planets that fit.', check: v => v.mode === 0 && v.i >= 3.5 && v.i <= 4 && v.Nr <= 60 && v.k === 3 && v.fit === 'Yes', hint: 'You need Nᵣ/Nₛ between 2.5 and 3, Nᵣ − Nₛ even, and Nₛ + Nᵣ divisible by 3.' },
    { title: 'Torque for a winch', goal: 'At least 100 N·m out from 20 N·m in, valid gear set, sun 18 teeth or more.', check: v => v.T === 20 && v.Tout >= 100 && v.Ns >= 18 && v.fit === 'Yes', hint: 'Needs |i| ≥ 5. Ring fixed gives 1 + Nᵣ/Nₛ.' }
  ]
});
