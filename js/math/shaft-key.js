MM.addMath('shaft-key', {
  inputs: [
    { key: 'd', param: 'd', label: 'Shaft diameter', sym: 'd' },
    { key: 'L', param: 'L', label: 'Key length', sym: 'L' },
    { key: 'T', label: 'Torque to carry', sym: 'T', unit: 'N·m', value: 100, min: 0.1, max: 50000, step: 1 },
    { key: 'ta', label: 'Allowed shear stress in the key', sym: 'τa', unit: 'MPa', value: 60, min: 5, max: 300, step: 1 },
    { key: 'pa', label: 'Allowed pressure on the hub', sym: 'pa', unit: 'MPa', value: 100, min: 10, max: 400, step: 5 }
  ],
  outputs(v) {
    const K = [[8, 2, 2, 1.2], [10, 3, 3, 1.8], [12, 4, 4, 2.5], [17, 5, 5, 3], [22, 6, 6, 3.5], [30, 8, 7, 4], [38, 10, 8, 5], [44, 12, 8, 5], [50, 14, 9, 5.5], [58, 16, 10, 6], [65, 18, 11, 7]];
    const k = K.find(r => v.d <= r[0]) || K[K.length - 1], w = k[1], h = k[2], t1 = k[3], Tn = v.T * 1000;
    const tau = 2 * Tn / (v.d * w * v.L), p = 2 * Tn / (v.d * (h - t1) * v.L), Lmin = Math.max(2 * Tn / (v.d * w * v.ta), 2 * Tn / (v.d * (h - t1) * v.pa));
    return [
      { key: 'w', label: 'Standard key for this shaft (width × height)', value: `${w} × ${h}`, unit: ' mm' },
      { key: 'F', label: 'Force on the key', sym: 'F', expr: '2T ÷ d', sub: `2 × ${v.T} N·m ÷ ${v.d} mm`, value: 2 * Tn / v.d / 1000, unit: ' kN', dp: 2 },
      { key: 'tau', label: 'Shear stress in the key', sym: 'τ', expr: 'F ÷ (w L)', sub: `÷ (${w} × ${v.L})`, value: tau, unit: ' MPa', dp: 1, warn: tau > v.ta },
      { key: 'p', label: 'Pressure on the hub side', sym: 'p', expr: 'F ÷ ((h − t1) L)', sub: `÷ (${MM.num(h - t1, 1)} × ${v.L})`, value: p, unit: ' MPa', dp: 1, warn: p > v.pa },
      { key: 'Lmin', label: 'Shortest key that works', expr: 'larger of the two limits', value: Lmin, unit: ' mm', dp: 1 },
      { key: 'ok', label: 'Key OK?', value: tau <= v.ta && p <= v.pa ? 'Yes' : 'No', warn: !(tau <= v.ta && p <= v.pa) }
    ];
  },
  problems: [
    () => { const d = MM.pick([20, 25, 30, 40]), T = MM.pick([50, 80, 120, 200]); return { text: `A ${d} mm shaft carries ${T} N·m through a key. What sideways force does the key feel at the shaft surface?`, answer: 2 * T / d, unit: 'kN', hint: 'Torque = force × radius, so F = T / (d/2).', steps: [`F = 2T / d = 2 × ${T * 1000} N·mm / ${d} mm = ${MM.num(2 * T * 1000 / d, 0)} N`], set: { d, T } }; },
    () => { const d = 30, w = 8, T = MM.pick([100, 150, 200]), L = MM.pick([30, 40, 50]), tau = 2 * T * 1000 / (d * w * L); return { text: `A 30 mm shaft uses an 8 mm wide key, ${L} mm long, to carry ${T} N·m. What is the shear stress in the key?`, answer: tau, unit: 'MPa', hint: 'τ = 2T / (d w L), with T in N·mm.', steps: [`F = 2 × ${T * 1000} / 30 = ${MM.num(2 * T * 1000 / 30, 0)} N`, `τ = F / (8 × ${L}) = ${MM.num(tau, 1)} MPa`], set: { d, T, L } }; }
  ],
  challenges: [
    { title: 'Short and strong', goal: 'Carry 300 N·m on a 40 mm shaft with a key no longer than the shaft diameter.', check: v => v.d === 40 && v.T >= 300 && v.L <= 40 && v.ok === 'Yes', hint: 'Check both limits. The hub pressure often decides it.' }
  ]
});
