(function () {
  const { TAU, COL } = MM;
  const Lof = (D, r1, r2) => { const ps = Math.acos((r1 - r2) / D); return 2 * D * Math.sin(ps) + r1 * (TAU - 2 * ps) + r2 * 2 * ps; };
  const cache = {};
  // centre distance chosen so the belt is a whole number of teeth, roughly 2 × the bigger pulley apart
  function layout(p) {
    const k = p.z1 + ',' + p.z2 + ',' + p.pt; if (cache[k]) return cache[k];
    const r1 = p.pt * p.z1 / TAU, r2 = p.pt * p.z2 / TAU, D0 = Math.max(r1, r2) * 2 + Math.min(r1, r2) + 6 * p.pt;
    const N = Math.round(Lof(D0, r1, r2) / p.pt), target = N * p.pt;
    let lo = Math.abs(r1 - r2) + 1e-3, hi = D0 * 2 + 10 * p.pt; for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; (Lof(m, r1, r2) < target) ? lo = m : hi = m; }
    const D = (lo + hi) / 2, psi = Math.acos((r1 - r2) / D), Lt = D * Math.sin(psi);
    return cache[k] = { r1, r2, D, psi, Lt, L: target, N, S1: 2 * Lt + 2 * r2 * psi };
  }
  function pt(s, Ly) {
    s = ((s % Ly.L) + Ly.L) % Ly.L; const { r1, r2, D, psi, Lt, S1 } = Ly, sn = Math.sin(psi), cs = Math.cos(psi);
    if (s < Lt) return [r1 * cs + s * sn, r1 * sn - s * cs];
    if (s < Lt + 2 * r2 * psi) { const t = psi - (s - Lt) / r2; return [D + r2 * Math.cos(t), r2 * Math.sin(t)]; }
    if (s < S1) { const u = s - Lt - 2 * r2 * psi; return [D + r2 * cs - u * sn, -r2 * sn - u * cs]; }
    const t = -psi - (s - S1) / r1; return [r1 * Math.cos(t), r1 * Math.sin(t)];
  }
  const NAMES = { 2: 'GT2 (2 mm)', 3: 'GT3 (3 mm)', 5: 'HTD 5M (5 mm)' };
  MM.register({
    slug: 'timing-belt', view: { w: 700, h: 420 },
    params: [
      { key: 'z1', label: 'Driver teeth', min: 12, max: 40, step: 1, value: 20 },
      { key: 'z2', label: 'Driven teeth', min: 12, max: 60, step: 1, value: 40 },
      { key: 'pt', label: 'Belt pitch', min: 2, max: 5, step: 1, value: 2, options: [[2, 'GT2'], [3, 'GT3'], [5, 'HTD 5M']] }
    ],
    draw(g, a, p) {
      const c = g.c, Ly = layout(p), h = p.pt * 0.38, th = p.pt * 0.32;
      const left = -Ly.r1 - th - 2, right = Ly.D + Ly.r2 + th + 2, hh = Math.max(Ly.r1, Ly.r2) + th + 2;
      const sc = Math.min(650 / (right - left), 165 / hh);
      c.save(); c.translate(350, 205); c.scale(sc, -sc); c.translate(-(left + right) / 2, 0);
      const lw = 1 / sc;
      const s0 = a * Ly.r1;                                  // belt travel
      // pulleys: grooves line up with the belt teeth
      const pulley = (cx, r, z, rot) => {
        c.save(); c.beginPath();
        for (let i = 0; i < z; i++) for (let k = 0; k <= 8; k++) {
          const q = rot + (i + k / 8) * TAU / z, f = k / 8, groove = f > 0.25 && f < 0.75 ? Math.sin((f - 0.25) * 2 * Math.PI) : 0;
          const rr = r - 0.25 * p.pt - groove * h; const x = cx + rr * Math.cos(q), y = rr * Math.sin(q); (i || k) ? c.lineTo(x, y) : c.moveTo(x, y);
        }
        c.closePath(); c.fillStyle = COL.white; c.fill(); c.lineWidth = 1.4 * lw; c.strokeStyle = COL.ink; c.stroke(); c.restore();
        g.circle(cx, 0, r * 0.25, { fill: COL.white, w: 1.4 * lw }); g.circle(cx, 0, r * 0.1, { fill: COL.ink, w: lw });
        g.line(cx, 0, cx + r * 0.7 * Math.cos(rot), r * 0.7 * Math.sin(rot), { w: 2 * lw, color: COL.red });
      };
      // a tooth at arc length s sits in a groove: driver groove angle = s / r1
      pulley(0, Ly.r1, p.z1, a + Ly.S1 / Ly.r1 - Ly.psi - 0.5 * TAU / p.z1);
      pulley(Ly.D, Ly.r2, p.z2, a * Ly.r1 / Ly.r2 + Ly.psi + Ly.Lt / Ly.r2 - 0.5 * TAU / p.z2);
      // belt band on the pitch line, teeth pointing in
      const n = 360, band = [];
      for (let i = 0; i <= n; i++) band.push(pt(i / n * Ly.L, Ly));
      c.save(); c.beginPath(); band.forEach((q, i) => i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])); c.closePath();
      c.lineWidth = th * 2; c.strokeStyle = MM.tint('ink', .85); c.stroke(); c.lineWidth = th * 2 - 2.4 * lw; c.strokeStyle = COL.white; c.stroke(); c.restore();
      const mid = q => { const x = Math.max(0, Math.min(Ly.D, q[0])); return [x - q[0], -q[1]]; };
      for (let k = 0; k < Ly.N; k++) {
        const s = k * p.pt - s0, q = pt(s, Ly), q2 = pt(s + 0.01, Ly), tx = q2[0] - q[0], ty = q2[1] - q[1], tl = Math.hypot(tx, ty);
        let nx = -ty / tl, ny = tx / tl; const m = mid(q); if (nx * m[0] + ny * m[1] < 0) { nx = -nx; ny = -ny; }
        const ux = tx / tl, uy = ty / tl, w = p.pt * 0.22, b = q;
        g.poly([[b[0] - ux * w * 1.4, b[1] - uy * w * 1.4], [b[0] + ux * w * 1.4, b[1] + uy * w * 1.4], [b[0] + ux * w + nx * h, b[1] + uy * w + ny * h], [b[0] - ux * w + nx * h, b[1] - uy * w + ny * h]],
          { fill: k === 0 ? COL.red : COL.white, color: k === 0 ? COL.red : COL.ink, w: lw });
      }
      c.restore();
      g.text('driver ' + p.z1 + 't', 350 - Ly.D / 2 * sc, 22, { size: 12, weight: 700, align: 'center' });
      g.text('driven ' + p.z2 + 't', 350 + Ly.D / 2 * sc, 22, { size: 12, weight: 700, align: 'center' });
      g.text(NAMES[p.pt] + ' belt · ' + Ly.N + ' teeth · ' + Ly.L + ' mm long · centres ' + Ly.D.toFixed(1) + ' mm', 350, 402, { size: 11, align: 'center', color: COL.faint });
    },
    graph: {
      title: 'Turns made (driver vs driven)', min: 0, max: 3.6, ticks: [{ v: 1, label: '1' }, { v: 2, label: '2' }, { v: 3, label: '3' }],
      series: [
        { name: 'driver', color: COL.ink, f: t => t / TAU },
        { name: 'driven', color: COL.red, f: (t, p) => (p.z1 / p.z2) * t / TAU }
      ],
      readout(a, p) { return { big: '1 : ' + (p.z2 / p.z1).toFixed(2), small: 'driver turns per driven turn · ' + (p.pt * p.z1).toFixed(0) + ' mm of belt per driver turn' }; }
    }
  });
})();
