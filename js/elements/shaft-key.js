(function () {
  const { TAU, COL } = MM;
  // parallel key sizes [shaft up to, width, height, shaft keyway depth] (ISO / DIN 6885 style table)
  const KEYS = [[8, 2, 2, 1.2], [10, 3, 3, 1.8], [12, 4, 4, 2.5], [17, 5, 5, 3], [22, 6, 6, 3.5], [30, 8, 7, 4], [38, 10, 8, 5], [44, 12, 8, 5], [50, 14, 9, 5.5], [58, 16, 10, 6], [65, 18, 11, 7]];
  const key = d => { const k = KEYS.find(r => d <= r[0]) || KEYS[KEYS.length - 1]; return { w: k[1], h: k[2], t1: k[3] }; };
  const rated = d => 20 * Math.PI * Math.pow(d, 3) / 16 / 1000;                 // N·m the shaft is sized for (20 MPa in torsion, leaving room for bending)
  // torque through one cycle: start-up bump, steady running, then a jam spike of 2 × rated
  const torque = (t, d) => { const u = ((t % TAU) + TAU) % TAU / TAU; let T = 1 + 0.15 * Math.sin(u * TAU * 3); if (u < 0.12) T += 0.6 * Math.sin(u / 0.12 * Math.PI); if (u > 0.68 && u < 0.8) T += 1.0 * Math.sin((u - 0.68) / 0.12 * Math.PI); return T * rated(d); };
  const tau = (t, p) => { const k = key(p.d); return 2 * torque(t, p.d) * 1000 / (p.d * k.w * p.L); };   // key shear stress, MPa
  const ALLOW = 60;
  MM.register({
    slug: 'shaft-key', view: { w: 700, h: 470 },
    params: [
      { key: 'd', label: 'Shaft diameter', unit: ' mm', min: 12, max: 60, step: 1, value: 30 },
      { key: 'L', label: 'Key length', unit: ' mm', min: 10, max: 80, step: 1, value: 40 }
    ],
    draw(g, a, p) {
      const c = g.c, k = key(p.d), s = 150 / 60 * 1.1, R = p.d / 2 * s, CX = 200, CY = 230, RH = Math.max(R * 2.1, 92), over = tau(a, p) > ALLOW;
      const rot = a;
      const P = (x, y) => [CX + x * Math.cos(rot) - y * Math.sin(rot), CY + x * Math.sin(rot) + y * Math.cos(rot)];
      // hub with its keyway
      const kw = k.w * s, kh = k.h * s, t1 = k.t1 * s;
      c.save(); c.beginPath(); c.arc(CX, CY, RH, 0, TAU);
      const hubSlot = [P(-kw / 2, -R + t1 - kh), P(kw / 2, -R + t1 - kh), P(kw / 2, -R + 1), P(-kw / 2, -R + 1)];
      c.moveTo(...P(0, -R)); c.arc(CX, CY, R, rot - Math.PI / 2, rot + 3 * Math.PI / 2);
      c.fillStyle = COL.white; c.fill('evenodd'); c.restore();
      g.hatchPath(() => { c.beginPath(); c.arc(CX, CY, RH, 0, TAU); c.moveTo(CX + R, CY); c.arc(CX, CY, R, 0, TAU, true); }, { spacing: 8, cx: CX, cy: CY });
      g.circle(CX, CY, RH, { w: 1.8 });
      g.poly(hubSlot, { fill: MM.tint('paper', 1), color: COL.ink });
      // shaft
      g.circle(CX, CY, R, { fill: COL.white, w: 1.6 });
      g.hatchPath(() => { c.beginPath(); c.arc(CX, CY, R - 1, 0, TAU); }, { spacing: 5, cx: CX, cy: CY, angle: -Math.PI / 4 });
      // key sits half in the shaft, half in the hub
      g.poly([P(-kw / 2, -R + t1 - kh), P(kw / 2, -R + t1 - kh), P(kw / 2, -R + t1), P(-kw / 2, -R + t1)], { fill: over ? COL.red : MM.tint('red', .55), color: COL.ink });
      if (over) { const q1 = P(-kw / 2 - 4, -R + 1), q2 = P(kw / 2 + 4, -R - 1); g.line(q1[0], q1[1], q2[0], q2[1], { w: 2.4, color: COL.ink }); }
      g.centre(CX, CY, RH + 18);
      g.curvedArrow(CX, CY, RH + 22, -2.3, -1.1, { color: COL.red, w: 2 });
      g.text('T', CX + (RH + 34) * Math.cos(-1.7), CY + (RH + 34) * Math.sin(-1.7), { color: COL.red, weight: 700, size: 13, align: 'center' });
      g.text('END VIEW', CX, 26, { size: 11, weight: 600, align: 'center', color: COL.faint });

      // side section: shaft along x, hub over the middle, key length L
      const SX = 520, SY = 230, sl = Math.min(2.6, 250 / Math.max(p.L + 30, 60)), r2 = Math.min(R, 70), hubL = (p.L + 12) * sl, hubR = Math.min(RH, 110) * (r2 / R);
      g.text('SIDE SECTION', SX, 26, { size: 11, weight: 600, align: 'center', color: COL.faint });
      g.poly([[SX - hubL / 2, SY - hubR], [SX + hubL / 2, SY - hubR], [SX + hubL / 2, SY + hubR], [SX - hubL / 2, SY + hubR]], { fill: COL.white, hatch: { spacing: 8, cx: SX, cy: SY } });
      g.poly([[SX - 160, SY - r2], [SX + 160, SY - r2], [SX + 160, SY + r2], [SX - 160, SY + r2]], { fill: COL.white, hatch: { spacing: 5, cx: SX, cy: SY, angle: -Math.PI / 4 } });
      const kL = p.L * sl, khs = kh * (r2 / R), t1s = t1 * (r2 / R);
      c.save(); g.style({ w: 1.4, fill: over ? COL.red : MM.tint('red', .55) }); c.beginPath(); c.roundRect(SX - kL / 2, SY - r2 - khs + t1s, kL, khs, Math.min(khs / 2, kL / 2)); c.fill(); c.stroke(); c.restore();
      g.line(SX - 175, SY, SX + 175, SY, { w: 0.8, dash: [10, 3, 2, 3], color: COL.faint });
      g.line(SX - kL / 2, SY - hubR - 22, SX + kL / 2, SY - hubR - 22, { w: 0.9, color: COL.red });
      g.text('L ' + p.L + ' mm', SX, SY - hubR - 34, { size: 11, align: 'center', color: COL.red });
      g.text('key ' + k.w + ' × ' + k.h + ' mm for a Ø' + p.d + ' shaft', SX, SY + hubR + 34, { size: 12, align: 'center' });
      g.text(over ? 'KEY OVERLOADED in the jam: make it longer' : 'key holds', SX, SY + hubR + 56, { size: 12, weight: 700, align: 'center', color: over ? COL.red : COL.faint });
    },
    graph: {
      title: 'Key shear stress: start-up, running, then a jam', min: 0, max: 160,
      ticks: [{ v: 0, label: '0' }, { v: ALLOW, label: '60 MPa' }, { v: 120, label: '120' }],
      series: [
        { name: 'allowed', color: COL.ink, dash: [5, 4], w: 1.2, f: () => ALLOW },
        { name: 'key stress', color: COL.red, f: (t, p) => Math.min(158, tau(t, p)) }
      ],
      readout(a, p) { return { big: tau(a, p).toFixed(0) + ' MPa', small: 'in the key at ' + torque(a, p.d).toFixed(0) + ' N·m' }; }
    }
  });
})();
