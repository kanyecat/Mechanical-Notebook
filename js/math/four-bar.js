MM.addMath('four-bar', {
  inputs: [
    { key: 'a', label: 'Crank', sym: 'a', unit: 'mm', value: 55, min: 1, max: 2000, step: 1 },
    { key: 'b', label: 'Coupler', sym: 'b', unit: 'mm', value: 150, min: 1, max: 2000, step: 1 },
    { key: 'c', label: 'Rocker', sym: 'c', unit: 'mm', value: 110, min: 1, max: 2000, step: 1 },
    { key: 'd', label: 'Frame (fixed bar)', sym: 'd', unit: 'mm', value: 140, min: 1, max: 2000, step: 1 }
  ],
  outputs(v) {
    const f = MM.num, L = [['crank', v.a], ['coupler', v.b], ['rocker', v.c], ['frame', v.d]], sorted = [...L].sort((x, y) => x[1] - y[1]);
    const s = sorted[0], l = sorted[3], pq = sorted[1][1] + sorted[2][1], gr = s[1] + l[1] <= pq;
    const type = !gr ? 'Triple rocker: no bar turns fully' : s[0] === 'crank' ? 'Crank-rocker' : s[0] === 'frame' ? 'Double crank (drag link)' : 'Double rocker';
    const acosd = x => x < -1 || x > 1 ? NaN : Math.acos(x) * 180 / Math.PI;
    const mu = e => acosd((v.b * v.b + v.c * v.c - e * e) / (2 * v.b * v.c));
    // rocker angle and direction of O2→B, both measured from the frame line, for a given gap e = |O2 B|
    const rock = e => acosd((v.c * v.c + v.d * v.d - e * e) / (2 * v.c * v.d)), crk = e => acosd((v.d * v.d + e * e - v.c * v.c) / (2 * v.d * e));
    const cr = type === 'Crank-rocker';
    const swing = cr ? Math.abs(rock(v.b + v.a) - rock(v.b - v.a)) : NaN;
    // dead points: crank in line with the coupler, stretched (gap b + a) or folded back (gap b − a, crank points the other way)
    const alpha = cr ? Math.abs(crk(v.b - v.a) - crk(v.b + v.a)) : NaN, Q = cr ? (180 + alpha) / (180 - alpha) : NaN;
    return [
      { key: 'gr', label: 'Grashof test', expr: 's + l ≤ p + q', sub: `${s[1]} + ${l[1]} = ${s[1] + l[1]} vs ${pq}`, value: gr ? 'Passes' : 'Fails', warn: !gr },
      { key: 'type', label: 'Type (shortest bar is the ' + s[0] + ')', value: type },
      { key: 'mumin', label: 'Smallest transmission angle', sym: 'μmin', expr: 'acos((b² + c² − (d − a)²) ÷ 2bc)', sub: '', value: cr ? mu(v.d - v.a) : NaN, unit: '°', dp: 1, warn: cr && mu(v.d - v.a) < 40 },
      { key: 'mumax', label: 'Largest transmission angle', sym: 'μmax', expr: 'acos((b² + c² − (d + a)²) ÷ 2bc)', sub: '', value: cr ? mu(v.d + v.a) : NaN, unit: '°', dp: 1, warn: cr && mu(v.d + v.a) > 140 },
      { key: 'swing', label: 'Rocker swing', sym: 'Δψ', expr: 'ψ(b + a) − ψ(b − a)', sub: 'rocker angle when crank and coupler line up', value: swing, unit: '°', dp: 1 },
      { key: 'Q', label: 'Time ratio, forward ÷ back', sym: 'Q', expr: '(180° + α) ÷ (180° − α)', sub: cr ? `α = angle between the crank's two dead points − 180° = ${f(alpha, 1)}°` : '', value: Q, unit: ' : 1', dp: 3 }
    ];
  },
  problems: [
    () => { const sets = [[40, 120, 90, 110], [60, 100, 80, 120], [70, 50, 90, 100], [30, 140, 70, 90], [90, 60, 100, 50]]; const [a, b, c, d] = MM.pick(sets); const arr = [a, b, c, d].sort((x, y) => x - y); const val = arr[0] + arr[3] - (arr[1] + arr[2]); return { text: `Bars of crank ${a}, coupler ${b}, rocker ${c} and frame ${d} mm. Work out (s + l) − (p + q). Is it negative or zero (Grashof) or positive?`, answer: val, unit: 'mm', tol: 0, hint: 'Shortest plus longest, minus the other two.', steps: [`s = ${arr[0]}, l = ${arr[3]}, p + q = ${arr[1] + arr[2]}`, `(s + l) − (p + q) = ${val}`, val <= 0 ? 'Zero or less: Grashof. At least one bar can turn fully.' : 'Positive: non-Grashof. No bar turns fully.'], set: { a, b, c, d } }; },
    () => { const a = MM.pick([40, 50, 55]), b = MM.pick([140, 150]), c = MM.pick([100, 110, 120]), d = MM.pick([130, 140]); const m = Math.acos((b * b + c * c - (d - a) ** 2) / (2 * b * c)) * 180 / Math.PI; return { text: `Crank-rocker with a = ${a}, b = ${b}, c = ${c}, d = ${d} mm. What is the smallest transmission angle?`, answer: m, unit: '°', tol: 0.01, hint: 'It happens when the crank points straight at the rocker pivot: the gap is d − a.', steps: [`cos μ = (${b}² + ${c}² − ${d - a}²) ÷ (2 × ${b} × ${c}) = ${MM.num((b * b + c * c - (d - a) ** 2) / (2 * b * c), 4)}`, `μmin = ${MM.num(m, 1)}°`], set: { a, b, c, d } }; }
  ],
  challenges: [
    { title: 'Smooth windscreen wiper', goal: 'Crank-rocker, rocker swing of 70° or more, transmission angle always between 40° and 140°.', check: v => v.type === 'Crank-rocker' && v.swing >= 70 && v.mumin >= 40 && v.mumax <= 140, hint: 'A longer crank makes more swing but squeezes the transmission angle. Try a crank about half the rocker.' },
    { title: 'Quick-return linkage', goal: 'Crank-rocker with a time ratio of 1.4 or more.', check: v => v.type === 'Crank-rocker' && v.Q >= 1.4, hint: 'Make the coupler much longer than the frame.' },
    { title: 'Drag link', goal: 'Both side bars turn fully: a double crank.', check: v => v.type === 'Double crank (drag link)', hint: 'The frame must be the shortest bar, and Grashof must pass.' }
  ]
});
