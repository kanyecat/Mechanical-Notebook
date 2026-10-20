(function () {
  const { TAU, COL } = MM;
  // typical sizes, close to DIN 471 (external, on shafts) and DIN 472 (internal, in bores): [thickness, groove Ø, free Ø]
  const EXT = { 10: [1, 9.6, 9.3], 15: [1, 14.3, 13.8], 20: [1.2, 19, 18.5], 25: [1.2, 23.9, 23.2], 30: [1.5, 28.6, 27.9], 35: [1.5, 33, 32.2], 40: [1.75, 37.5, 36.5] };
  const INT = { 10: [1, 10.4, 10.8], 15: [1, 15.7, 16.2], 20: [1, 21, 21.5], 25: [1.2, 26.2, 26.9], 30: [1.2, 31.4, 32.1], 35: [1.5, 37, 37.8], 40: [1.75, 42.5, 43.5] };
  MM.RING_TABLE = { EXT, INT };
  const ease = v => v * v * (3 - 2 * v), cl = v => Math.max(0, Math.min(1, v));
  // ring size (inner Ø for external, outer Ø for internal) and position (0 = off the end, 1 = at the groove) through the cycle
  function state(t, p) {
    const u = ((t % TAU) + TAU) % TAU / TAU, ext = p.type === 0, T = (ext ? EXT : INT)[p.d], free = T[2], groove = T[1];
    const pass = ext ? p.d + 0.6 : p.d - 0.6;                 // opened or squeezed just enough to pass
    let size, pos;
    if (u < 0.22) { size = free + (pass - free) * ease(u / 0.22); pos = 0; }
    else if (u < 0.55) { size = pass; pos = ease((u - 0.22) / 0.33); }
    else if (u < 0.63) { size = pass + (groove - pass) * ease((u - 0.55) / 0.08); pos = 1; }
    else if (u < 0.92) { size = groove; pos = 1; }
    else { size = groove; pos = 1; }
    return { size, pos, free, groove, s: T[0], ext, pliers: u < 0.6 };
  }
  MM.register({
    slug: 'retaining-ring', view: { w: 700, h: 470 },
    params: [
      { key: 'type', label: 'Type', min: 0, max: 1, step: 1, value: 0, options: [[0, 'External (shaft)'], [1, 'Internal (bore)']] },
      { key: 'd', label: 'Shaft / bore Ø', unit: ' mm', min: 10, max: 40, step: 5, value: 20 }
    ],
    draw(g, a, p) {
      const c = g.c, st = state(a, p), ext = st.ext, b = 0.12 * p.d + 1;   // radial width of the ring band
      const CX = 185, CY = 235, sc = 120 / (p.d / 2 + b + 3);
      const rIn = ext ? st.size / 2 : st.size / 2 - b, rOut = rIn + b, rc0 = ext ? st.free / 2 + b / 2 : st.free / 2 - b / 2, rc = (rIn + rOut) / 2;
      const gap = TAU - (TAU - 0.5) * rc0 / rc;             // the ring's length stays the same, so the gap opens as it grows
      g.text('FRONT VIEW', CX, 24, { size: 11, weight: 600, align: 'center', color: COL.faint });
      if (ext) {
        g.circle(CX, CY, p.d / 2 * sc, { fill: COL.white }); g.hatchPath(() => { c.beginPath(); c.arc(CX, CY, p.d / 2 * sc - 1, 0, TAU); }, { spacing: 6, cx: CX, cy: CY });
        g.circle(CX, CY, st.groove / 2 * sc, { w: 0.9, dash: [4, 3], color: COL.faint });
      } else {
        const RH = (p.d / 2 + b + 8) * sc;
        c.save(); c.beginPath(); c.arc(CX, CY, RH, 0, TAU); c.arc(CX, CY, p.d / 2 * sc, 0, TAU, true); c.fillStyle = COL.white; c.fill('evenodd'); c.restore();
        g.hatchPath(() => { c.beginPath(); c.arc(CX, CY, RH, 0, TAU); c.moveTo(CX + p.d / 2 * sc, CY); c.arc(CX, CY, p.d / 2 * sc, 0, TAU, true); }, { spacing: 6, cx: CX, cy: CY });
        g.circle(CX, CY, RH, { w: 1.6 }); g.circle(CX, CY, p.d / 2 * sc, { w: 1.4 }); g.circle(CX, CY, st.groove / 2 * sc, { w: 0.9, dash: [4, 3], color: COL.faint });
      }
      g.centre(CX, CY, 150);
      // the ring: a C shape with lugs at the gap (gap at the top)
      const a0 = -Math.PI / 2 + gap / 2, a1 = -Math.PI / 2 - gap / 2 + TAU;
      c.save(); g.style({ w: 1.5, fill: st.pliers ? MM.tint('red', .5) : MM.tint('red', .35) }); c.beginPath();
      c.arc(CX, CY, rOut * sc, a0, a1); c.arc(CX, CY, rIn * sc, a1, a0, true); c.closePath(); c.fill(); c.stroke(); c.restore();
      [a0, a1].forEach((q, i) => {
        const lr = ext ? rOut + b * 0.9 : rIn - b * 0.9, rr = ext ? (rIn + lr) / 2 : (rOut + lr) / 2, back = i ? -0.18 : 0.18;
        const hx = CX + rr * sc * Math.cos(q + back), hy = CY + rr * sc * Math.sin(q + back);
        g.circle(hx, hy, b * 0.95 * sc, { fill: MM.tint('red', .5), w: 1.4 }); g.circle(hx, hy, b * 0.35 * sc, { fill: COL.paper, w: 1 });
        if (st.pliers) g.dot(hx, hy, 4, COL.ink);
      });
      g.text(ext ? 'opened with pliers' : 'squeezed with pliers', CX, CY + 175, { size: 11, align: 'center', color: st.pliers ? COL.red : COL.faint });

      // side section: the ring slides along to the groove and snaps in, holding a bearing against a shoulder
      const SX = 400, SW = 280, SY = 235, ss = 75 / (p.d / 2 + b + 3), R = p.d / 2 * ss, xg = SX + 140, xr = SX + SW + 6 - (SX + SW + 6 - xg) * st.pos;
      g.text('SIDE SECTION', SX + SW / 2, 24, { size: 11, weight: 600, align: 'center', color: COL.faint });
      const gd = Math.abs(p.d - st.groove) / 2 * ss, sw = st.s * ss * 1.2;
      if (ext) {
        [-1, 1].forEach(sg => g.poly([[SX, SY + sg * 0], [SX + SW, SY], [SX + SW, SY + sg * R], [xg + sw / 2, SY + sg * R], [xg + sw / 2, SY + sg * (R - gd)], [xg - sw / 2, SY + sg * (R - gd)], [xg - sw / 2, SY + sg * R], [SX, SY + sg * R]], { fill: COL.white, hatch: { spacing: 6, cx: SX, cy: SY } }));
        const bw = 60, bh = R * 0.9;
        [-1, 1].forEach(sg => g.poly([[xg - sw / 2 - bw, SY + sg * R], [xg - sw / 2, SY + sg * R], [xg - sw / 2, SY + sg * (R + bh)], [xg - sw / 2 - bw, SY + sg * (R + bh)]], { fill: COL.white, hatch: { spacing: 5, cx: xg, cy: SY, angle: -Math.PI / 4 } }));
        g.text('bearing', xg - sw / 2 - bw / 2, SY - R - bh - 12, { size: 11, align: 'center' });
        const ri = st.size / 2 * ss, ro = ri + b * ss;
        [-1, 1].forEach(sg => g.poly([[xr - sw / 2, SY + sg * ri], [xr + sw / 2, SY + sg * ri], [xr + sw / 2, SY + sg * ro], [xr - sw / 2, SY + sg * ro]], { fill: COL.red, color: COL.ink, w: 1.2 }));
      } else {
        const H = R + b * ss + 34;
        [-1, 1].forEach(sg => g.poly([[SX, SY + sg * H], [SX + SW, SY + sg * H], [SX + SW, SY + sg * R], [xg + sw / 2, SY + sg * R], [xg + sw / 2, SY + sg * (R + gd)], [xg - sw / 2, SY + sg * (R + gd)], [xg - sw / 2, SY + sg * R], [SX, SY + sg * R]], { fill: COL.white, hatch: { spacing: 6, cx: SX, cy: SY } }));
        const bw = 60, bh = R * 0.55;
        [-1, 1].forEach(sg => g.poly([[xg - sw / 2 - bw, SY + sg * R], [xg - sw / 2, SY + sg * R], [xg - sw / 2, SY + sg * (R - bh)], [xg - sw / 2 - bw, SY + sg * (R - bh)]], { fill: COL.white, hatch: { spacing: 5, cx: xg, cy: SY, angle: -Math.PI / 4 } }));
        g.text('bearing', xg - sw / 2 - bw / 2, SY, { size: 11, align: 'center' });
        const ro = st.size / 2 * ss, ri = ro - b * ss;
        [-1, 1].forEach(sg => g.poly([[xr - sw / 2, SY + sg * ri], [xr + sw / 2, SY + sg * ri], [xr + sw / 2, SY + sg * ro], [xr - sw / 2, SY + sg * ro]], { fill: COL.red, color: COL.ink, w: 1.2 }));
      }
      g.line(SX - 10, SY, SX + SW + 40, SY, { w: 0.8, dash: [10, 3, 2, 3], color: COL.faint });
      g.text('groove Ø ' + st.groove + ' · ring ' + st.s + ' mm thick', SX + SW / 2, 420, { size: 12, align: 'center' });
      g.text((ext ? 'Ø' + p.d + ' shaft, ring inside Ø now ' : 'Ø' + p.d + ' bore, ring outside Ø now ') + st.size.toFixed(1) + ' mm', SX + SW / 2, 442, { size: 11, align: 'center', color: COL.faint });
    },
    graph: {
      title: 'Ring size compared with the shaft or bore (%)', min: -11, max: 11, ticks: [{ v: -8, label: '−8%' }, { v: 0, label: 'Ø d' }, { v: 8, label: '+8%' }],
      series: [
        { name: 'shaft / bore', color: COL.ink, dash: [5, 4], w: 1.2, f: () => 0 },
        { name: 'ring', color: COL.red, f: (t, p) => (state(t, p).size - p.d) / p.d * 100 }
      ],
      readout(a, p) { const st = state(a, p); return { big: 'Ø ' + st.size.toFixed(1), small: (st.ext ? 'ring inner' : 'ring outer') + ' diameter, mm' }; }
    }
  });
})();
