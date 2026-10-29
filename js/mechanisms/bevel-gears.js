(function () {
  const { TAU, COL } = MM;
  const geo = p => {
    const d1 = Math.atan2(p.z1, p.z2), d2 = Math.PI / 2 - d1;
    const Rc = Math.min(250, 210 / Math.sin(d2), 330 / (Math.sin(d1) + Math.cos(d2))), b = Rc * 0.34;
    const Q = [380, 32 + Rc * Math.sin(d1)];
    return { d1, d2, Rc, b, Q };
  };
  // one bevel gear seen from the side. axis: unit vector (screen) from the apex along the shaft; perp: screen unit at right angles;
  // a generator at angle phi round the axis points along axis·cos δ + perp·sin δ·cos φ, and faces the viewer when sin φ > 0
  function bevel(g, q, axis, perp, d, z, rot, tint) {
    const P = (rr, phi) => [q.Q[0] + rr * (axis[0] * Math.cos(d) + perp[0] * Math.sin(d) * Math.cos(phi)), q.Q[1] + rr * (axis[1] * Math.cos(d) + perp[1] * Math.sin(d) * Math.cos(phi))];
    const r0 = q.Rc - q.b, r1 = q.Rc, top = P(r1, Math.PI), bot = P(r1, 0), top0 = P(r0, Math.PI), bot0 = P(r0, 0);
    g.poly([top, bot, bot0, top0], { fill: COL.white });
    // back face (a disc seen edge on) and the hub
    const hub = [q.Q[0] + axis[0] * (r1 * Math.cos(d) + 34), q.Q[1] + axis[1] * (r1 * Math.cos(d) + 34)];
    const bk = [q.Q[0] + axis[0] * r1 * Math.cos(d), q.Q[1] + axis[1] * r1 * Math.cos(d)];
    g.poly([[bk[0] + perp[0] * 22, bk[1] + perp[1] * 22], [hub[0] + perp[0] * 22, hub[1] + perp[1] * 22], [hub[0] - perp[0] * 22, hub[1] - perp[1] * 22], [bk[0] - perp[0] * 22, bk[1] - perp[1] * 22]], { fill: COL.white, hatch: { spacing: 6 } });
    const tw = TAU / z * 0.24;
    for (let i = 0; i < z; i++) {
      const phi = rot + i * TAU / z, s = Math.sin(phi); if (s <= 0.02) continue;
      const a = phi - tw, b2 = phi + tw;
      g.poly([P(r0, a), P(r1, a), P(r1, b2), P(r0, b2)], { fill: MM.tint(tint, 0.25 + 0.6 * s), w: 1 });
    }
    g.line(top[0], top[1], bot[0], bot[1], { w: 1.8 });
    return { top, bot };
  }
  MM.register({
    slug: 'bevel-gears', clicks: a => Math.floor(a * 12 / TAU), view: { w: 700, h: 470 }, thumb: 0.08,
    tryit: { keys: [{ key: 'z1', label: 'Pinion teeth', at: MM.dial(120, 380, 70, 200, 340, 'z1', 10, 30) }, { key: 'z2', label: 'Gear teeth', at: MM.dial(590, 400, 70, 200, 340, 'z2', 12, 48) }], pose: 0.05, tasks: [
        { text: 'Make a 3 : 1 reduction round the corner.', now: p => (p.z2 / p.z1).toFixed(2) + ' : 1', ok: p => p.z2 === 3 * p.z1 },
        { text: 'Make a mitre pair: same teeth, same speed.', now: p => (p.z2 / p.z1).toFixed(2) + ' : 1', ok: p => p.z1 === p.z2 }] },
    params: [{ key: 'z1', label: 'Pinion teeth', min: 10, max: 30, step: 1, value: 16 }, { key: 'z2', label: 'Gear teeth', min: 12, max: 48, step: 1, value: 32 }],
    draw(g, a, p) {
      const q = geo(p), r1 = a, r2 = Math.PI / p.z2 + (p.z1 / p.z2) * a;   // both gears share the contact generator (φ = 0), so the teeth roll on together
      // shafts
      const e1 = [q.Q[0] - (q.Rc * Math.cos(q.d1) + 120), q.Q[1]], e2 = [q.Q[0], q.Q[1] + q.Rc * Math.cos(q.d2) + 90];
      g.line(q.Q[0], q.Q[1], e1[0], e1[1], { w: 0.8, dash: [10, 3, 2, 3], color: COL.faint });
      g.line(q.Q[0], q.Q[1], e2[0], e2[1], { w: 0.8, dash: [10, 3, 2, 3], color: COL.faint });
      g.rect(e1[0], q.Q[1] - 9, 86, 18, { fill: COL.white, hatch: false });
      g.rect(q.Q[0] - 9, q.Q[1] + q.Rc * Math.cos(q.d2) + 34, 18, 56, { fill: COL.white, hatch: false });
      // pitch cones
      g.line(q.Q[0], q.Q[1], q.Q[0] - q.Rc * Math.cos(q.d1), q.Q[1] - q.Rc * Math.sin(q.d1), { w: 0.8, dash: [4, 4], color: COL.faint });
      g.line(q.Q[0], q.Q[1], q.Q[0] + q.Rc * Math.sin(q.d2), q.Q[1] + q.Rc * Math.cos(q.d2), { w: 0.8, dash: [4, 4], color: COL.faint });
      g.line(q.Q[0], q.Q[1], q.Q[0] - q.Rc * Math.cos(q.d1), q.Q[1] + q.Rc * Math.sin(q.d1), { w: 0.8, dash: [4, 4], color: COL.faint });
      bevel(g, q, [0, 1], [-1, 0], q.d2, p.z2, r2, 'blue');
      bevel(g, q, [-1, 0], [0, 1], q.d1, p.z1, r1, 'red');
      g.dot(q.Q[0], q.Q[1], 4, COL.ink);
      g.text('apex', q.Q[0] + 10, q.Q[1] - 8, { size: 11, color: COL.faint });
      g.text('pinion ' + p.z1, q.Q[0] - q.Rc * Math.cos(q.d1) - 70, q.Q[1] - q.Rc * Math.sin(q.d1) - 4, { size: 13, weight: 700, align: 'center' });
      g.text('gear ' + p.z2, q.Q[0] + q.Rc * Math.sin(q.d2) - 10, q.Q[1] + q.Rc * Math.cos(q.d2) + 36, { size: 13, weight: 700, align: 'center' });
      g.text('δ₁ ' + (q.d1 * 180 / Math.PI).toFixed(1) + '°   δ₂ ' + (q.d2 * 180 / Math.PI).toFixed(1) + '°', 600, 450, { size: 12, align: 'center' });
    },
    graph: {
      title: 'Turns made (pinion vs gear)', min: -0.1, max: 1.1, ticks: [{ v: 0, label: '0' }, { v: 0.5, label: '½' }, { v: 1, label: '1' }],
      series: [{ name: 'pinion', color: COL.red, f: t => t / TAU }, { name: 'gear', color: COL.blue, f: (t, p) => (p.z1 / p.z2) * t / TAU }],
      readout(a, p) { return { big: (p.z2 / p.z1).toFixed(2) + ' : 1', small: 'reduction; pitch cones ' + (Math.atan2(p.z1, p.z2) * 180 / Math.PI).toFixed(1) + '° and ' + (90 - Math.atan2(p.z1, p.z2) * 180 / Math.PI).toFixed(1) + '°' }; }
    }
  });
})();
