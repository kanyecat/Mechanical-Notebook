(function () {
  const { TAU, COL } = MM, X = 215, TOP = 270, S = 7, D = 5, L = 22;
  const pitch = p => p.thread === 1 ? 2.5 : 0.8;          // wood screw : M5 machine screw
  const tri = u => { const v = u < 0.5 ? u * 2 : 2 - u * 2; return v * v * (3 - 2 * v); };
  const depth = t => -2 + (L + 2) * tri(((t % TAU) + TAU) % TAU / TAU);   // mm, tip below the surface
  const turns = (t, p) => (depth(t) + 2) / pitch(p);
  const DRIVES = [[0, 'Slot'], [1, 'Phillips'], [2, 'Square'], [3, 'Hex'], [4, 'Torx']];
  const NOTES = ['Slot: cheap, but the blade slips out sideways', 'Phillips: self-centring, but pushes out (cams out) under high torque', 'Square (Robertson): the bit grips and stays on', 'Hex socket: high torque from a small key', 'Torx: six lobes, best grip, hardly cams out'];
  function recess(g, cx, cy, r, kind, rot) {
    const c = g.c, P = (pts) => g.poly(pts.map(([x, y]) => [cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]), { fill: MM.tint('ink', .75), color: COL.ink, w: 1 });
    if (kind === 0) P([[-r, -r * 0.12], [r, -r * 0.12], [r, r * 0.12], [-r, r * 0.12]]);
    if (kind === 1) { const w = r * 0.16, q = r * 0.62; P([[-w, -q], [w, -q], [w, -w], [q, -w], [q, w], [w, w], [w, q], [-w, q], [-w, w], [-q, w], [-q, -w], [-w, -w]]); }
    if (kind === 2) { const q = r * 0.32; P([[-q, -q], [q, -q], [q, q], [-q, q]]); }
    if (kind === 3) { const pts = []; for (let k = 0; k < 6; k++) pts.push([r * 0.42 * Math.cos(k * TAU / 6), r * 0.42 * Math.sin(k * TAU / 6)]); P(pts); }
    if (kind === 4) { const pts = []; for (let k = 0; k < 72; k++) { const q = k / 72 * TAU, rr = r * (0.36 + 0.09 * Math.cos(6 * q)); pts.push([rr * Math.cos(q), rr * Math.sin(q)]); } P(pts); }
  }
  MM.register({
    slug: 'screw-types', view: { w: 700, h: 470 },
    params: [
      { key: 'drive', label: 'Drive', min: 0, max: 4, step: 1, value: 4, options: DRIVES },
      { key: 'head', label: 'Head', min: 0, max: 3, step: 1, value: 0, options: [[0, 'Pan'], [1, 'Flat'], [2, 'Hex'], [3, 'Socket cap']] },
      { key: 'thread', label: 'Thread', min: 0, max: 1, step: 1, value: 1, options: [[0, 'Machine'], [1, 'Wood']] }
    ],
    draw(g, a, p) {
      const c = g.c, P = pitch(p) * S, d = D * S, wood = p.thread === 1, dep = depth(a) * S, tip = TOP + dep, phi = turns(a, p) * TAU;
      const Dh = 2 * d, flat = p.head === 1, hb = flat ? tip - L * S + (Dh - d) / 2 : tip - L * S;   // head bearing surface
      // the material
      const bx0 = 40, bx1 = 390, by1 = 450;
      const block = [[bx0, TOP], ...(flat ? [[X - Dh / 2 - 2, TOP], [X - d / 2, TOP + (Dh - d) / 2], [X + d / 2, TOP + (Dh - d) / 2], [X + Dh / 2 + 2, TOP]] : []), [bx1, TOP], [bx1, by1], [bx0, by1]];
      g.poly(block, { fill: COL.white, hatch: wood ? null : { spacing: 7, cx: X, cy: TOP } });
      if (wood) for (let k = 0; k < 9; k++) { const y = TOP + 18 + k * 20; g.trace([[bx0 + 4, y], [X - 60, y + 4 * Math.sin(k)], [X + 80, y - 3], [bx1 - 4, y + 2 * Math.cos(k)]], { color: COL.faint, w: 0.8 }); }
      else { const hy = TOP + (L + 1) * S; g.line(X - d / 2, TOP, X - d / 2, hy, { w: 1, dash: [4, 3] }); g.line(X + d / 2, TOP, X + d / 2, hy, { w: 1, dash: [4, 3] }); }
      g.text(wood ? 'WOOD' : 'TAPPED STEEL', bx0 + 8, by1 - 12, { size: 10, color: COL.faint, weight: 600 });
      // shank outline, with crests fixed in the material (the thread follows the groove it has cut)
      const dr = wood ? d * 0.62 : d - 1.2 * P, top = hb, bot = tip, taper = wood ? 3 * S : 0.5 * S;
      const halfW = y => { const k = Math.min(1, (bot - y) / taper); return wood ? Math.max(0, k) : 0.6 + 0.4 * Math.max(0, k); };
      const off = (TOP % P);
      const wave = u => { const f = u - Math.floor(u); return 1 - 2 * Math.abs(f - 0.5); };   // 1 at a crest, 0 at a root
      const rad = (y, ph) => (dr / 2 + (d - dr) / 2 * Math.max(0, 2 * wave((y - off) / P + ph) - 1) * 2) * halfW(y);
      const left = [], right = [];
      for (let y = top; y <= bot; y += P / 8) { left.push([X - Math.min(d / 2, rad(y, 0.5)), y]); right.push([X + Math.min(d / 2, rad(y, 0)), y]); }
      left.push([X, bot]); const shank = left.concat(right.reverse());
      g.poly(shank, { fill: COL.white, hatch: { spacing: 5, cx: X, cy: TOP, angle: -Math.PI / 4 } });
      for (let y = Math.ceil((top - off) / P) * P + off; y < bot - taper * 0.6; y += P) g.line(X - d / 2 * halfW(y), y, X + d / 2 * halfW(y + P / 2), y + P / 2, { w: 0.8, color: COL.faint });
      // head, side view
      const H = [
        () => { c.save(); g.style({ w: 1.6, fill: COL.white }); c.beginPath(); c.moveTo(X - Dh / 2, hb); c.lineTo(X - Dh / 2, hb - 0.2 * Dh); c.quadraticCurveTo(X - Dh / 2, hb - 0.4 * Dh, X, hb - 0.42 * Dh); c.quadraticCurveTo(X + Dh / 2, hb - 0.4 * Dh, X + Dh / 2, hb - 0.2 * Dh); c.lineTo(X + Dh / 2, hb); c.closePath(); c.fill(); c.stroke(); c.restore(); },
        () => g.poly([[X - Dh / 2, hb - (Dh - d) / 2], [X + Dh / 2, hb - (Dh - d) / 2], [X + d / 2, hb], [X - d / 2, hb]], { fill: COL.white }),
        () => { g.poly([[X - Dh / 2, hb - 0.6 * d], [X + Dh / 2, hb - 0.6 * d], [X + Dh / 2, hb], [X - Dh / 2, hb]], { fill: COL.white }); g.line(X - Dh / 6, hb - 0.6 * d, X - Dh / 6, hb, { w: 1 }); g.line(X + Dh / 6, hb - 0.6 * d, X + Dh / 6, hb, { w: 1 }); },
        () => { const w = 1.5 * d; g.poly([[X - w / 2, hb - d], [X + w / 2, hb - d], [X + w / 2, hb], [X - w / 2, hb]], { fill: COL.white }); g.line(X - w / 2, hb - d + 4, X + w / 2, hb - d + 4, { w: 0.8 }); }
      ];
      H[p.head]();
      g.line(X, hb - 0.5 * Dh - 14, X, tip + 14, { w: 0.8, dash: [10, 3, 2, 3], color: COL.faint });
      // depth dimension
      if (dep > 4) { g.line(X + d + 24, TOP, X + d + 24, tip, { w: 0.9, color: COL.red }); g.line(X + d + 16, tip, X + d + 32, tip, { w: 0.9, color: COL.red }); g.text((depth(a)).toFixed(1) + ' mm', X + d + 32, (TOP + tip) / 2, { size: 11, color: COL.red }); }

      // head seen from above, turning
      const TX = 555, TY = 140, R = 64;
      g.text('HEAD FROM ABOVE', TX, 40, { size: 11, weight: 600, align: 'center', color: COL.faint });
      if (p.head === 2) { const hex = []; for (let k = 0; k < 6; k++) { const q = phi + k * TAU / 6; hex.push([TX + R * Math.cos(q), TY + R * Math.sin(q)]); } g.poly(hex, { fill: COL.white }); g.circle(TX, TY, R * 0.86, { w: 0.8, color: COL.faint }); }
      else { g.circle(TX, TY, p.head === 3 ? R * 0.78 : R, { fill: COL.white }); if (p.head === 1) g.circle(TX, TY, R * 0.5, { w: 0.8, dash: [3, 3], color: COL.faint }); recess(g, TX, TY, p.head === 3 ? R * 0.78 : R, p.drive, phi); }
      g.dot(TX + R * 0.9 * Math.cos(phi - 0.4), TY + R * 0.9 * Math.sin(phi - 0.4), 3.5, COL.red);
      const note = p.head === 2 ? 'Hex head: turned from outside with a spanner or socket' : NOTES[p.drive];
      const words = note.split(' '); let line = '', ly = TY + R + 32;
      words.forEach(w => { if ((line + ' ' + w).length > 30) { g.text(line, TX, ly, { size: 12, align: 'center' }); ly += 17; line = w; } else line = line ? line + ' ' + w : w; });
      g.text(line, TX, ly, { size: 12, align: 'center' });
      g.text((wood ? 'wood screw, pitch 2.5 mm' : 'M5 machine screw, pitch 0.8 mm'), TX, ly + 34, { size: 11, align: 'center', color: COL.faint });
      g.text(turns(a, p).toFixed(1) + ' turns', TX, ly + 54, { size: 13, weight: 700, align: 'center', color: COL.red });
    },
    graph: {
      title: 'Depth of the tip (in, then back out)', min: -4, max: 26,
      ticks: [{ v: 0, label: '0' }, { v: 10, label: '10 mm' }, { v: 20, label: '20 mm' }],
      series: [{ name: 'depth', color: COL.red, f: t => depth(t) }],
      readout(a, p) { return { big: Math.max(0, depth(a)).toFixed(1) + ' mm', small: turns(a, p).toFixed(1) + ' turns at ' + pitch(p) + ' mm per turn' }; }
    }
  });
})();
