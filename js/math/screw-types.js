MM.addMath('screw-types', {
  inputs: [
    { key: 'L', label: 'Length to screw in', sym: 'L', unit: 'mm', value: 22, min: 1, max: 500, step: 1 },
    { key: 'P', label: 'Thread pitch', sym: 'P', unit: 'mm', value: 2.5, min: 0.2, max: 10, step: 0.05 },
    { key: 'n', label: 'Thread starts', sym: 'z', value: 1, min: 1, max: 4, step: 1 },
    { key: 'rpm', label: 'Driver speed', sym: 'N', unit: 'rpm', value: 600, min: 1, max: 5000, step: 10 }
  ],
  outputs(v) {
    const lead = v.P * v.n, t = v.L / lead;
    return [
      { key: 'lead', label: 'Lead (distance per turn)', sym: 'l', expr: 'P × z', sub: `${v.P} × ${v.n}`, value: lead, unit: ' mm', dp: 2 },
      { key: 'turns', label: 'Turns needed', expr: 'L ÷ l', sub: `${v.L} ÷ ${MM.num(lead, 2)}`, value: t, unit: ' turns', dp: 1 },
      { key: 'time', label: 'Time with a power driver', expr: 'turns ÷ N × 60', value: t / v.rpm * 60, unit: ' s', dp: 2 },
      { key: 'hand', label: 'By hand at about 1 turn per second', value: t, unit: ' s', dp: 0 }
    ];
  },
  problems: [
    () => { const L = MM.pick([16, 20, 25, 30]), P = MM.pick([0.8, 1, 1.25]); return { text: `A machine screw with a ${P} mm pitch must go ${L} mm into a tapped hole. How many turns is that?`, answer: L / P, unit: 'turns', hint: 'Each turn moves the screw by one pitch (for a single-start thread).', steps: [`turns = ${L} / ${P} = ${MM.num(L / P, 1)}`], set: { L, P, n: 1 } }; },
    () => { const L = MM.pick([30, 40, 50]), P = 2.5, rpm = MM.pick([400, 600, 1200]); const t = L / P / rpm * 60; return { text: `A ${L} mm wood screw with a 2.5 mm pitch is driven at ${rpm} rpm. How many seconds does it take to drive fully?`, answer: t, unit: 's', hint: 'turns = length / pitch; time = turns / rpm × 60.', steps: [`turns = ${L} / 2.5 = ${L / 2.5}`, `time = ${L / 2.5} / ${rpm} × 60 = ${MM.num(t, 2)} s`], set: { L, P, n: 1, rpm } }; }
  ],
  challenges: [
    { title: 'Quick-release knob', goal: 'Travel 20 mm in under 3 turns using a pitch of 2 mm or less.', check: v => v.L >= 20 && v.P <= 2 && v.turns < 3, hint: 'More starts increase the lead without a coarser pitch.' }
  ]
});
