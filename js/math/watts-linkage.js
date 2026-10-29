(function () {
  // P for an arm swing th (radians), with O1 = (−r, −c/2) and O2 = (r, c/2), y down; null if the linkage cannot reach
  const P = (r, c, th) => {
    const A = [-r + r * Math.cos(th), -c / 2 + r * Math.sin(th)], O2 = [r, c / 2], dx = O2[0] - A[0], dy = O2[1] - A[1], d = Math.hypot(dx, dy);
    if (d > r + c || d < Math.abs(r - c)) return null;
    const k = (c * c - r * r + d * d) / (2 * d), h = Math.sqrt(Math.max(c * c - k * k, 0)), mx = A[0] + k * dx / d, my = A[1] + k * dy / d;
    const s1 = [mx + h * dy / d, my - h * dx / d], s2 = [mx - h * dy / d, my + h * dx / d], near = [0, c / 2 + r * Math.sin(th)];
    const B = Math.hypot(s1[0] - near[0], s1[1] - near[1]) < Math.hypot(s2[0] - near[0], s2[1] - near[1]) ? s1 : s2;
    return [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
  };
  const sweep = (r, c, deg) => {
    const th = deg * Math.PI / 180; let e = 0, lo = Infinity, hi = -Infinity, ok = true;
    for (let i = 0; i <= 200; i++) { const q = P(r, c, -th + 2 * th * i / 200); if (!q) { ok = false; break; } e = Math.max(e, Math.abs(q[0])); lo = Math.min(lo, q[1]); hi = Math.max(hi, q[1]); }
    return { ok, e, stroke: hi - lo };
  };
  MM.addMath('watts-linkage', {
    inputs: [
      { key: 'r', param: 'r', label: 'Arm length', sym: 'r', unit: 'mm' },
      { key: 'c', param: 'c', label: 'Middle link', sym: 'c', unit: 'mm' },
      { key: 'sw', label: 'Arm swing each way', sym: 'θ', unit: '°', value: 20, min: 1, max: 60, step: 1 }
    ],
    outputs(v) {
      const f = MM.num, s = sweep(v.r, v.c, v.sw), rad = v.sw * Math.PI / 180;
      return [
        { key: 'reach', label: 'Can it make that swing?', value: s.ok ? 'Yes' : 'No: the arms cannot reach', warn: !s.ok },
        { key: 'tip', label: 'Arm tip rise', sym: 'h', expr: 'r × sin θ', sub: `${f(v.r)} × sin ${f(v.sw)}°`, value: v.r * Math.sin(rad), unit: ' mm', dp: 1 },
        { key: 'pull', label: 'Arm tip pulled in (arc error of one arm)', sym: 'δ', expr: 'r × (1 − cos θ)', sub: `${f(v.r)} × (1 − cos ${f(v.sw)}°)`, value: v.r * (1 - Math.cos(rad)), unit: ' mm', dp: 2 },
        { key: 'stroke', label: 'Stroke of P', sym: 's', expr: 'worked out by solving the linkage', sub: '', value: s.ok ? s.stroke : NaN, unit: ' mm', dp: 1 },
        { key: 'e', label: 'Largest sideways error of P', sym: 'e', expr: 'worked out by solving the linkage', sub: 'the two arc errors mostly cancel', value: s.ok ? s.e : NaN, unit: ' mm', dp: 2 },
        { key: 'pct', label: 'Error as a share of the stroke', expr: 'e ÷ s', sub: '', value: s.ok ? s.e / s.stroke * 100 : NaN, unit: ' %', dp: 2, warn: s.ok && s.e / s.stroke > 0.02 }
      ];
    },
    problems: [
      () => { const r = MM.pick([100, 120, 150, 200]), t = MM.pick([10, 15, 20, 25]); const h = r * Math.sin(t * Math.PI / 180); return { text: `An arm ${r} mm long swings ${t}° up from level. How far does its tip rise?`, answer: h, unit: 'mm', hint: 'Rise = r × sin θ.', steps: [`h = ${r} × sin ${t}° = ${MM.num(h, 1)} mm`], set: { r, sw: t } }; },
      () => { const r = MM.pick([100, 120, 150, 200]), t = MM.pick([10, 15, 20]); const d = r * (1 - Math.cos(t * Math.PI / 180)); return { text: `The same kind of arm, ${r} mm long, swings ${t}°. How far is its tip pulled back towards the pivot, compared with a straight line? This is the error that the second arm cancels.`, answer: d, unit: 'mm', hint: 'δ = r × (1 − cos θ).', steps: [`δ = ${r} × (1 − cos ${t}°) = ${MM.num(d, 2)} mm`] }; }
    ],
    challenges: [
      { title: 'Long, straight stroke', goal: 'A stroke of P of 120 mm or more, with a sideways error under 1 % of the stroke.', check: v => v.reach === 'Yes' && v.stroke >= 120 && v.pct < 1, hint: 'Longer arms make the line straighter. Then raise the swing until the stroke is long enough.' },
      { title: 'Compact guide', goal: 'Arms of 120 mm or shorter, a stroke of 60 mm or more, and an error under 0.5 mm.', check: v => v.r <= 120 && v.reach === 'Yes' && v.stroke >= 60 && v.e < 0.5, hint: 'Keep the swing small and try different middle links.' }
    ]
  });
})();
