MM.addMath('retaining-ring', {
  inputs: [
    { key: 'type', param: 'type', label: 'Type' },
    { key: 'd', param: 'd', label: 'Shaft or bore diameter', sym: 'd' }
  ],
  outputs(v) {
    const T = (v.type === 0 ? MM.RING_TABLE.EXT : MM.RING_TABLE.INT)[v.d] || [0, 0, 0], ext = v.type === 0;
    const depth = Math.abs(v.d - T[1]) / 2, open = Math.abs(v.d - T[2]);
    return [
      { key: 's', label: 'Ring thickness', sym: 's', value: T[0], unit: ' mm', dp: 2 },
      { key: 'g', label: 'Groove diameter', sym: 'd2', value: T[1], unit: ' mm', dp: 1 },
      { key: 'gw', label: 'Groove width (a little wider than the ring)', sym: 'm', expr: '≈ s + 0.1', value: T[0] + 0.1, unit: ' mm', dp: 2 },
      { key: 'gd', label: 'Groove depth', expr: '|d − d2| ÷ 2', sub: `|${v.d} − ${T[1]}| ÷ 2`, value: depth, unit: ' mm', dp: 2 },
      { key: 'free', label: ext ? 'Free inside diameter of the ring' : 'Free outside diameter of the ring', sym: 'd3', value: T[2], unit: ' mm', dp: 1 },
      { key: 'open', label: ext ? 'Must open by at least' : 'Must close by at least', expr: '|d − d3|', value: open, unit: ' mm', dp: 1 },
      { key: 'strain', label: 'Stretch of the ring while fitting', expr: '|d − d3| ÷ d3', value: open / T[2] * 100, unit: ' %', dp: 1 },
      { key: 'edge', label: 'Keep the groove at least this far from the shaft end', expr: '≈ 3 × groove depth', value: 3 * depth, unit: ' mm', dp: 1 }
    ];
  },
  problems: [
    () => { const d = MM.pick([20, 30, 40]), T = MM.RING_TABLE.EXT[d]; return { text: `An external ring for a ${d} mm shaft sits in a groove of diameter ${T[1]} mm. How deep is the groove?`, answer: (d - T[1]) / 2, unit: 'mm', tol: 0.01, hint: 'Depth is half the difference in diameters.', steps: [`(${d} − ${T[1]}) / 2 = ${MM.num((d - T[1]) / 2, 2)} mm`], set: { type: 0, d } }; }
  ],
  challenges: []
});
