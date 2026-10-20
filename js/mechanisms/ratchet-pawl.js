(function () {
  const { TAU, COL } = MM, CX = 300, CY = 270, N = 12, RT = 120, RR = 92, STEP = TAU / N, SWING = 1.3, SLACK = 0.3;
  const T0 = Math.PI / 2, BETA = 0.34, RP = 178, TH = T0 - (3 - 0.04) * STEP;
  // one cycle per turn of the input: lever swings out (drive) then back (return)
  function state(a) {
    const n = Math.floor(a / TAU), u = a - n * TAU, fwd = u < Math.PI;
    const l = SWING * (1 - Math.cos(u)) / 2;            // lever position, in teeth
    const engaged = fwd && l > SLACK;
    const W = n + (fwd ? Math.max(0, l - SLACK) : 1);   // wheel position, in teeth
    return { n, u, fwd, l, engaged, W };
  }
  // tooth surface radius at a wheel-frame position x (in teeth). Faces at whole numbers.
  const surf = x => { const f = ((x % 1) + 1) % 1; return RT - (RT - RR) * f; };
  const P = (ang, r) => [CX + r * Math.cos(ang), CY - r * Math.sin(ang)];
  MM.register({
    slug: 'ratchet-pawl', view: { w: 640, h: 500 },
    draw(g, a) {
      const s = state(a), c = g.c;
      // wheel outline
      const pts = [];
      for (let k = 0; k < N; k++) for (let i = 0; i <= 8; i++) {
        const x = k + i / 8 * 0.999, r = RT - (RT - RR) * (i / 8);
        pts.push(P(T0 - (x + s.W) * STEP, r));
      }
      g.centre(CX, CY, RT + 30);
      g.poly(pts, { fill: COL.white, hatch: { spacing: 6, cx: CX, cy: CY } });
      g.circle(CX, CY, RR - 24, { dash: [4, 4], color: COL.faint, w: 0.8 });
      g.dot(...P(T0 - s.W * STEP - STEP * 0.5, RR - 14), 5, COL.red);
      // driving lever and pawl
      const tipX = s.l - SLACK, tipAng = T0 - tipX * STEP;
      const xw = tipX - s.W, tipR = s.engaged ? RR : surf(xw);  // tip rides on the teeth unless it is pushing
      const pv = P(tipAng + BETA, RP), tip = P(tipAng, Math.max(tipR, RR) + 1), lv = P(tipAng + BETA, RP + 50);
      g.bar(CX, CY, lv[0], lv[1], 18, { nopivot: true, fill: 'rgba(31,85,144,.92)' });
      g.text('lever', ...P(tipAng + BETA + 0.06, RP + 74), { size: 11, align: 'center', color: COL.faint });
      g.bar(pv[0], pv[1], tip[0], tip[1], 10, { nopivot: true, color: COL.red, fill: 'rgba(255,209,102,.18)' });
      g.pivot(pv[0], pv[1], 5);
      g.text('drive pawl', ...P(tipAng + BETA + 0.3, RP + 10), { size: 11, align: 'center', color: COL.red });
      // holding pawl, fixed to the frame
      const hx = (T0 - TH) / STEP - s.W, hr = surf(hx), hpv = P(TH + BETA, RP), htip = P(TH, Math.max(hr, RR) + 1);
      g.bar(hpv[0], hpv[1], htip[0], htip[1], 10, { nopivot: true });
      g.fixed(hpv[0], hpv[1], 9);
      g.text('holding pawl', hpv[0] + 18, hpv[1] - 22, { size: 11, color: COL.faint });
      // spring on the holding pawl
      const sp0 = P(TH + BETA * 0.55, RP - 14), sp1 = [sp0[0] + 46, sp0[1] - 30], sp = [sp0];
      for (let i = 1; i < 8; i++) { const t = i / 8, nx = -30, ny = -46, L = Math.hypot(nx, ny); sp.push([sp0[0] + (sp1[0] - sp0[0]) * t + (i % 2 ? 6 : -6) * nx / L, sp0[1] + (sp1[1] - sp0[1]) * t + (i % 2 ? 6 : -6) * ny / L]); }
      sp.push(sp1); g.poly(sp, { close: false, w: 1, color: COL.faint });
      g.circle(CX, CY, 22, { fill: COL.white }); g.circle(CX, CY, 10, { fill: COL.ink });
      g.curvedArrow(CX, CY, RT + 22, 0.5, 1.1, {});
      g.text(s.engaged ? 'DRIVE' : s.fwd ? 'TAKE-UP' : 'RETURN', CX, CY + RT + 54, { size: 15, weight: 700, align: 'center', color: COL.red, font: 'Barlow Condensed,Arial Narrow,sans-serif' });
    },
    graph: {
      title: 'Lever and wheel position (teeth)', min: -0.2, max: 2.5, period: TAU * 2, ticks: [{ v: 0, label: '0' }, { v: 1, label: '1' }, { v: 2, label: '2' }],
      series: [
        { name: 'lever swing', color: COL.ink, dash: [5, 4], w: 1.3, f: t => state(t).l },
        { name: 'wheel', color: COL.red, f: t => state(t).W }
      ],
      readout(a) { const s = state(a); return { big: (s.engaged ? 'DRIVE' : s.fwd ? 'TAKE-UP' : 'RETURN'), small: 'wheel has moved ' + s.W.toFixed(2) + ' teeth' }; }
    }
  });
})();
