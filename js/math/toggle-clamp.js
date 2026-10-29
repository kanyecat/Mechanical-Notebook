MM.addMath('toggle-clamp', {
  inputs: [
    { key: 'F', label: 'Hand force', sym: 'F', unit: 'N', value: 50, min: 0, max: 5000, step: 1 },
    { key: 'Lh', param: 'Lh', label: 'Handle length', sym: 'Lₕ', unit: 'mm' },
    { key: 'r', label: 'Short crank (handle pivot to link pin)', sym: 'r', unit: 'mm', value: 55, min: 1, max: 1000, step: 1 },
    { key: 'l', label: 'Link', sym: 'l', unit: 'mm', value: 110, min: 1, max: 2000, step: 1 },
    { key: 'c', param: 'c', label: 'Angle before line-up when it touches', sym: 'θ', unit: '°' }
  ],
  outputs(v) {
    const f = MM.num, th = v.c * Math.PI / 180, s = Math.sin(th), root = Math.sqrt(Math.max(v.l * v.l - (v.r * s) ** 2, 1e-9));
    const dx = v.r * s + v.r * v.r * s * Math.cos(th) / root, gain = v.Lh / dx;
    const travel = (v.r + v.l) - (v.r * Math.cos(th) + root);
    return [
      { key: 'dx', label: 'Plunger movement per radian of handle', sym: 'dx/dθ', expr: 'r sin θ (1 + r cos θ ÷ √(l² − r² sin²θ))', sub: `${f(v.r)} × sin ${f(v.c)}° × (…)`, value: dx, unit: ' mm/rad', dp: 2 },
      { key: 'gain', label: 'Force gain at first touch', sym: 'G', expr: 'Lₕ ÷ (dx/dθ)', sub: `${f(v.Lh)} ÷ ${f(dx, 2)}`, value: gain, unit: ' ×', dp: 1 },
      { key: 'Fout', label: 'Clamping force at first touch (no friction; the real force depends on how much the work and rubber tip squash in the last Δx)', sym: 'F_out', expr: 'G × F', sub: `${f(gain, 1)} × ${f(v.F)}`, value: gain * v.F, unit: ' N', dp: 0 },
      { key: 'left', label: 'Plunger travel still to come before line-up', sym: 'Δx', expr: '(r + l) − (r cos θ + √(l² − r² sin²θ))', sub: '', value: travel, unit: ' mm', dp: 3 }
    ];
  },
  problems: [
    () => { const r = MM.pick([40, 50, 60]), l = MM.pick([90, 100, 120]), Lh = MM.pick([150, 180, 200]), c = MM.pick([2, 3, 5]); const th = c * Math.PI / 180, s = Math.sin(th), dx = r * s + r * r * s * Math.cos(th) / Math.sqrt(l * l - r * r * s * s); return { text: `Short crank ${r} mm, link ${l} mm, handle ${Lh} mm. The plunger touches the work ${c}° before the links line up. What is the force gain there?`, answer: Lh / dx, unit: '×', hint: 'Gain = handle length ÷ (dx/dθ). Work out dx/dθ first.', steps: [`dx/dθ = ${MM.num(dx, 3)} mm per radian`, `G = ${Lh} ÷ ${MM.num(dx, 3)} = ${MM.num(Lh / dx, 1)}`], set: { r, l, Lh, c } }; },
    () => { const G = MM.pick([20, 40, 60]), F = MM.pick([30, 50, 80]); return { text: `A clamp gives a force gain of ${G} at the point where it closes. With ${F} N on the handle, what is the clamping force, ignoring friction?`, answer: G * F, unit: 'N', tol: 0, hint: 'F_out = G × F.', steps: [`${G} × ${F} = ${G * F} N`] }; }
  ],
  challenges: [
    { title: 'Welding fixture', goal: 'At least 4000 N of clamping force from 50 N on the handle.', check: v => v.F === 50 && v.Fout >= 4000, hint: 'Make it touch closer to the line-up, or lengthen the handle.' },
    { title: 'Short handle', goal: 'A gain of 30 or more with a handle of 120 mm or less, touching at least 3° before line-up.', check: v => v.Lh <= 120 && v.c >= 3 && v.gain >= 30, hint: 'A shorter crank r moves the plunger less per degree.' }
  ]
});
