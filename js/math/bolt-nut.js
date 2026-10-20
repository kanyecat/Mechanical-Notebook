MM.addMath('bolt-nut', {
  inputs: [
    { key: 'd', param: 'd', label: 'Bolt size' },
    { key: 'T', label: 'Tightening torque', sym: 'T', unit: 'N·m', value: 45, min: 0.1, max: 3000, step: 0.5 },
    { key: 'K', label: 'Nut factor (0.2 dry, 0.15 oiled)', sym: 'K', value: 0.2, min: 0.05, max: 0.4, step: 0.01 },
    { key: 'Sp', label: 'Proof strength (8.8 = 580, 10.9 = 830)', sym: 'Sp', unit: 'MPa', value: 580, min: 100, max: 1200, step: 10 },
    { key: 'Fext', label: 'Load trying to pull the joint apart', sym: 'Fe', unit: 'kN', value: 10, min: 0, max: 1000, step: 0.5 }
  ],
  outputs(v) {
    const f = MM.num, P = (MM.ISO_METRIC[v.d] || [0.15 * v.d])[0], As = Math.PI / 4 * Math.pow(v.d - 0.9382 * P, 2);
    const F = v.T * 1000 / (v.K * v.d), sig = F / As, pct = sig / v.Sp * 100, Tr = v.K * 0.75 * v.Sp * As * v.d / 1000;
    return [
      { key: 'P', label: 'Coarse thread pitch', sym: 'P', value: P, unit: ' mm', dp: 2 },
      { key: 'As', label: 'Tensile stress area', sym: 'As', expr: 'π/4 (d − 0.9382 P)²', sub: `π/4 × (${v.d} − ${f(0.9382 * P, 3)})²`, value: As, unit: ' mm²', dp: 1 },
      { key: 'F', label: 'Clamp force (preload)', sym: 'F', expr: 'T ÷ (K d)', sub: `${v.T} ÷ (${v.K} × ${v.d} mm)`, value: F / 1000, unit: ' kN', dp: 2 },
      { key: 'sig', label: 'Stress in the bolt', sym: 'σ', expr: 'F ÷ As', sub: `${f(F, 0)} ÷ ${f(As, 1)}`, value: sig, unit: ' MPa', dp: 0 },
      { key: 'pct', label: 'Share of proof strength', expr: 'σ ÷ Sp', value: pct, unit: ' %', dp: 0, warn: pct > 90 || pct < 50 },
      { key: 'Tr', label: 'Torque for 75% of proof (a common target)', expr: 'K × 0.75 Sp As × d', value: Tr, unit: ' N·m', dp: 1 },
      { key: 'sep', label: 'Joint stays shut?', expr: 'F > Fe', value: F / 1000 > v.Fext ? 'Yes' : 'No: it opens', warn: F / 1000 <= v.Fext }
    ];
  },
  problems: [
    () => { const d = MM.pick([8, 10, 12]), T = MM.pick([20, 30, 40, 60]), F = T * 1000 / (0.2 * d) / 1000; return { text: `An M${d} bolt is tightened to ${T} N·m. With a nut factor of 0.2, what clamp force does it make?`, answer: F, unit: 'kN', hint: 'T = K × F × d, with d in metres (or use mm and N·mm).', steps: [`F = T / (K d) = ${T * 1000} N·mm / (0.2 × ${d} mm)`, `F = ${MM.num(F * 1000, 0)} N = ${MM.num(F, 2)} kN`], set: { d, T, K: 0.2 } }; },
    () => { const d = MM.pick([3, 4, 5, 6, 8, 10, 12, 16]), P = MM.ISO_METRIC[d][0], As = Math.PI / 4 * Math.pow(d - 0.9382 * P, 2); return { text: `What is the tensile stress area of an M${d} × ${P} coarse thread?`, answer: As, unit: 'mm²', hint: 'As = π/4 × (d − 0.9382 P)².', steps: [`d − 0.9382 P = ${d} − ${MM.num(0.9382 * P, 3)} = ${MM.num(d - 0.9382 * P, 3)} mm`, `As = π/4 × ${MM.num(d - 0.9382 * P, 3)}² = ${MM.num(As, 1)} mm²`], set: { d } }; }
  ],
  challenges: [
    { title: 'Just right', goal: 'Tighten an M10 8.8 bolt to between 70% and 80% of its proof strength, dry (K = 0.2).', check: v => v.d === 10 && v.K === 0.2 && v.Sp === 580 && v.pct >= 70 && v.pct <= 80, hint: 'Start from the "torque for 75% of proof" line.' },
    { title: 'Hold the lid on', goal: 'Keep a joint shut against 20 kN with an M8 bolt, staying under 90% of proof.', check: v => v.d === 8 && v.Fext >= 20 && v.sep === 'Yes' && v.pct < 90, hint: 'An 8.8 M8 cannot do it. Try a stronger class (10.9 = 830 MPa).' }
  ]
});
