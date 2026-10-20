(function () {
  const { TAU, COL } = MM, CX = 280, CY = 230, M = 6.5, NS = 24, NP = 12, NR = 48;
  const rs = NS * M / 2, rp = NP * M / 2, rr = NR * M / 2, rc = rs + rp;
  const MODES = [
    { ws: 1, wr: 0, wc: NS / (NS + NR), label: 'ring fixed · sun in · carrier out', big: (NS / (NS + NR)).toFixed(2) + '×', small: 'carrier speed ÷ sun speed' },
    { ws: 1, wr: -NS / NR, wc: 0, label: 'carrier fixed · sun in · ring out', big: (-NS / NR).toFixed(2) + '×', small: 'ring speed ÷ sun speed (reversed)' },
    { ws: 0, wr: 1, wc: NR / (NS + NR), label: 'sun fixed · ring in · carrier out', big: (NR / (NS + NR)).toFixed(2) + '×', small: 'carrier speed ÷ ring speed' }
  ];
  MM.register({
    slug: 'planetary-gears', view: { w: 560, h: 460 },
    params: [{ key: 'mode', label: 'Fixed part', min: 0, max: 2, step: 1, value: 0, options: [[0, 'Ring'], [1, 'Carrier'], [2, 'Sun']] }],
    draw(g, a, p) {
      const c = g.c, md = MODES[p.mode | 0], ss = TAU / NS, sp = TAU / NP, sr = TAU / NR;
      const wp = md.wc - (md.ws - md.wc) * NS / NP;
      // ring (internal gear) with outer body
      const ro = rr + 1.15 * M + 14;
      g.circle(CX, CY, ro, { fill: COL.white });
      g.hatchPath(() => { c.beginPath(); c.arc(CX, CY, ro, 0, TAU); }, { spacing: 6, cx: CX, cy: CY });
      const rrot = -0.38 * sr + md.wr * a;
      g.style({ w: 1.6, fill: COL.paper }); g.gearPath(CX, CY, NR, M, rrot, true); c.fill(); c.stroke();
      g.dot(CX + (ro - 7) * Math.cos(rrot), CY + (ro - 7) * Math.sin(rrot), 4.5, COL.red);
      g.centre(CX, CY, ro + 14);
      // carrier arms
      const cang = md.wc * a;
      for (let i = 0; i < 3; i++) { const t = i * TAU / 3 + cang; g.bar(CX, CY, CX + rc * Math.cos(t), CY + rc * Math.sin(t), 13, { nopivot: true, fill: MM.tint('white', .95) }); }
      g.circle(CX, CY, rc, { dash: [4, 4], color: COL.faint, w: 0.8 });
      // planets
      for (let i = 0; i < 3; i++) {
        const t0 = i * TAU / 3, t = t0 + cang, px = CX + rc * Math.cos(t), py = CY + rc * Math.sin(t);
        const rot = t0 + Math.PI - 0.82 * sp + wp * a;
        g.gear(px, py, NP, M, rot, { hatch: true });
        g.circle(px, py, 8, { fill: COL.white }); g.circle(px, py, 3.2, { fill: COL.ink });
        const ang = rot + 0.38 * sp; g.dot(px + (rp - M * 2.4) * Math.cos(ang), py + (rp - M * 2.4) * Math.sin(ang), 3.8, COL.red);
      }
      // sun
      const srot = -0.38 * ss + md.ws * a;
      g.gear(CX, CY, NS, M, srot, { hatch: true });
      g.circle(CX, CY, 14, { fill: COL.white }); g.circle(CX, CY, 6, { fill: COL.ink });
      g.dot(CX + (rs - M * 2.4) * Math.cos(srot + 0.38 * ss), CY + (rs - M * 2.4) * Math.sin(srot + 0.38 * ss), 4.5, COL.red);
      g.text(md.label.toUpperCase(), CX, 22, { size: 12, weight: 700, align: 'center' });
      g.text('sun ' + NS + ' · planets ' + NP + ' · ring ' + NR, CX, 440, { size: 11, align: 'center', color: COL.faint });
    },
    graph: {
      title: 'Turns made (per input turn)', min: -1.2, max: 1.4, ticks: [{ v: -1, label: '−1' }, { v: 0, label: '0' }, { v: 1, label: '1' }],
      series: [
        { name: 'sun', color: COL.ink, f: (t, p) => MODES[p.mode | 0].ws * t / TAU },
        { name: 'carrier', color: COL.red, f: (t, p) => MODES[p.mode | 0].wc * t / TAU },
        { name: 'ring', color: COL.blue, dash: [5, 4], f: (t, p) => MODES[p.mode | 0].wr * t / TAU }
      ],
      readout(a, p) { const md = MODES[p.mode | 0]; return { big: md.big, small: md.small }; }
    }
  });
})();
