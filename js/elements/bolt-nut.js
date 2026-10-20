(function () {
  const { TAU, COL } = MM;
  // ISO metric sizes: [coarse pitch, fine pitch, across flats s, head height k, nut height m, clearance hole (medium), tap drill, hex key for a socket cap screw]
  const ISO = {
    2: [0.4, 0.25, 4, 1.4, 1.6, 2.4, 1.6, 1.5], 3: [0.5, 0.35, 5.5, 2, 2.4, 3.4, 2.5, 2.5], 4: [0.7, 0.5, 7, 2.8, 3.2, 4.5, 3.3, 3], 5: [0.8, 0.5, 8, 3.5, 4.7, 5.5, 4.2, 4],
    6: [1, 0.75, 10, 4, 5.2, 6.6, 5, 5], 8: [1.25, 1, 13, 5.3, 6.8, 9, 6.8, 6], 10: [1.5, 1.25, 16, 6.4, 8.4, 11, 8.5, 8], 12: [1.75, 1.25, 18, 7.5, 10.8, 13.5, 10.2, 10],
    16: [2, 1.5, 24, 10, 14.8, 17.5, 14, 14], 20: [2.5, 1.5, 30, 12.5, 18, 22, 17.5, 17]
  };
  MM.ISO_METRIC = ISO;
  const PITCH = {}; Object.keys(ISO).forEach(k => PITCH[k] = ISO[k][0]);
  const SIZES = Object.keys(ISO).map(Number);
  const As = d => Math.PI / 4 * Math.pow(d - 0.9382 * PITCH[d], 2);       // tensile stress area, mm²
  const proofF = d => 580 * As(d);                                         // class 8.8 proof load, N
  const recT = d => 0.2 * 0.75 * proofF(d) * d / 1000;                     // torque for 75% of proof, N·m
  // one cycle: snug at 10%, tighten to the target by 55%, hold, loosen from 85%
  const share = t => { const u = ((t % TAU) + TAU) % TAU / TAU; if (u < 0.1) return 0; if (u < 0.55) return (u - 0.1) / 0.45; if (u < 0.85) return 1; return 1 - (u - 0.85) / 0.15; };
  const preload = (t, p) => share(t) * p.tq / 100 * recT(p.d) * 1000 / (0.2 * p.d);   // N
  // nut turn after snug: F = k θ, with the joint stiffness folded into one turn ≈ 1.6 × 75% proof
  const nutTurn = (t, p) => { const u = ((t % TAU) + TAU) % TAU / TAU; const base = u < 0.1 ? u / 0.1 * 1.5 : 1.5; return base * TAU + preload(t, p) / (proofF(p.d) * 1.6) * TAU; };
  // labelled drawing of the bolt and nut (in proportion, not to scale) and the table of every size
  function dimsHTML(d) {
    const [P, Pf, sf, k, m, clr, tap, key] = ISO[d], e = sf * 1.1547, d2 = d - 0.6495 * P, d3 = d - 1.2269 * P, As = Math.PI / 4 * Math.pow(d - 0.9382 * P, 2);
    const u = 54 / d, cy = 112, hx = 70, sx = hx + k * u, L = 5.2 * d * u, tx = sx + L * 0.45, ex = sx + L;
    const f = v => (+v.toFixed(2)).toString();
    let th = ''; for (let x = tx; x < ex - P * u * 0.5; x += P * u) th += `M${x.toFixed(1)} ${cy - d / 2 * u} L${(x + P * u / 2).toFixed(1)} ${cy - d3 / 2 * u} L${(x + P * u).toFixed(1)} ${cy - d / 2 * u} `;
    let thb = ''; for (let x = tx; x < ex - P * u * 0.5; x += P * u) thb += `M${x.toFixed(1)} ${cy + d / 2 * u} L${(x + P * u / 2).toFixed(1)} ${cy + d3 / 2 * u} L${(x + P * u).toFixed(1)} ${cy + d / 2 * u} `;
    const dim = (x1, y1, x2, y2, lab, lx, ly, anchor) => `<line class="dl" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" marker-start="url(#ar)" marker-end="url(#ar)"/><text x="${lx}" y="${ly}" text-anchor="${anchor || 'middle'}">${lab}</text>`;
    const NX = 440, NW = m * u, NH = e * u, HX = 600, R = e / 2 * u;
    const hex = [0, 1, 2, 3, 4, 5].map(i => { const a = i * Math.PI / 3; return `${(HX + R * Math.cos(a)).toFixed(1)},${(cy + R * Math.sin(a)).toFixed(1)}`; }).join(' ');
    const svg = `<svg class="dimsvg" viewBox="0 0 680 250" role="img" aria-label="Bolt and nut dimensions for M${d}">
      <defs><marker id="ar" viewBox="0 0 8 8" refX="4" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 1 L7 4 L0 7 z" class="arh"/></marker></defs>
      <line class="cl" x1="${hx - 12}" y1="${cy}" x2="${ex + 14}" y2="${cy}"/>
      <rect class="pt" x="${hx}" y="${cy - sf / 2 * u}" width="${k * u}" height="${sf * u}"/>
      <rect class="pt" x="${sx}" y="${cy - d / 2 * u}" width="${tx - sx}" height="${d * u}"/>
      <rect class="pt" x="${tx}" y="${cy - d3 / 2 * u}" width="${ex - tx}" height="${d3 * u}"/>
      <path class="th" d="${th}${thb}"/>
      ${dim(hx, cy - sf / 2 * u - 16, sx, cy - sf / 2 * u - 16, 'k ' + f(k), (hx + sx) / 2, cy - sf / 2 * u - 24)}
      ${dim(hx - 18, cy - sf / 2 * u, hx - 18, cy + sf / 2 * u, 's ' + f(sf), hx - 24, cy + 4, 'end')}
      ${dim(sx + 26, cy - d / 2 * u, sx + 26, cy + d / 2 * u, 'd ' + f(d), sx + 34, cy + 4, 'start')}
      ${dim(tx + P * u, cy - d / 2 * u - 14, tx + 2 * P * u, cy - d / 2 * u - 14, 'P ' + f(P), tx + 1.5 * P * u, cy - d / 2 * u - 22)}
      <text x="${(hx + ex) / 2}" y="242" text-anchor="middle" class="cap">BOLT · M${d} × ${P}</text>
      <rect class="pt" x="${NX}" y="${cy - NH / 2}" width="${NW}" height="${NH}"/>
      <line class="th" x1="${NX}" y1="${cy - R / 2}" x2="${NX + NW}" y2="${cy - R / 2}"/><line class="th" x1="${NX}" y1="${cy + R / 2}" x2="${NX + NW}" y2="${cy + R / 2}"/>
      ${dim(NX, cy + NH / 2 + 16, NX + NW, cy + NH / 2 + 16, 'm ' + f(m), NX + NW / 2, cy + NH / 2 + 32)}
      <polygon class="pt" points="${hex}"/><circle class="th" cx="${HX}" cy="${cy}" r="${d / 2 * u}"/><circle class="hole" cx="${HX}" cy="${cy}" r="${d3 / 2 * u}"/>
      ${dim(HX - R - 14, cy - sf / 2 * u, HX - R - 14, cy + sf / 2 * u, 's ' + f(sf), HX - R - 20, cy + 4, 'end')}
      ${dim(HX - R, cy + NH / 2 + 16, HX + R, cy + NH / 2 + 16, 'e ' + f(e), HX, cy + NH / 2 + 32)}
      <text x="${(NX + HX + R) / 2}" y="242" text-anchor="middle" class="cap">NUT · side and end</text>
    </svg>`;
    const facts = [['Nominal diameter d', d + ' mm'], ['Coarse pitch P', P + ' mm'], ['Fine pitch', Pf + ' mm'], ['Pitch diameter d₂', f(d2) + ' mm'], ['Minor diameter d₃', f(d3) + ' mm'],
      ['Tensile stress area', f(As) + ' mm²'], ['Across flats s', sf + ' mm'], ['Across corners e', f(e) + ' mm'], ['Head height k', k + ' mm'], ['Nut height m', m + ' mm'],
      ['Clearance hole (medium)', clr + ' mm'], ['Tap drill', tap + ' mm'], ['Hex key, socket cap screw', key + ' mm']];
    const rows = SIZES.map(z => { const r = ISO[z]; return `<tr data-d="${z}" class="${z === d ? 'on' : ''}" tabindex="0"><th>M${z}</th><td>${r[0]}</td><td>${r[1]}</td><td>${(Math.PI / 4 * Math.pow(z - 0.9382 * r[0], 2)).toFixed(1)}</td><td>${r[2]}</td><td>${r[3]}</td><td>${r[4]}</td><td>${r[5]}</td><td>${r[6]}</td><td>${r[7]}</td></tr>`; }).join('');
    return `<div class="dimgrid"><div class="dimfig">${svg}<p class="note">In proportion for M${d}, not to scale. All sizes in mm.</p></div>
      <dl class="dimfacts">${facts.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('')}</dl></div>
      <p class="swipe">Swipe the table sideways to see every column →</p><div class="tablewrap"><table class="dimtable"><thead><tr><th>Size</th><th>Coarse pitch</th><th>Fine pitch</th><th>Stress area mm²</th><th>Across flats</th><th>Head height</th><th>Nut height</th><th>Clearance hole</th><th>Tap drill</th><th>Hex key</th></tr></thead><tbody>${rows}</tbody></table></div>
      <p class="note">Values follow ISO 261/262 (threads), ISO 4014 and 4032 (hex bolts and nuts), ISO 273 (clearance holes) and ISO 4762 (socket cap screws). Older DIN M10 and M12 hex parts are 1 mm wider across flats (17 and 19 mm).</p>`;
  }
  MM.register({
    slug: 'bolt-nut', view: { w: 700, h: 480 },
    params: [
      { key: 'd', label: 'Bolt size', min: 2, max: 20, step: 1, value: 10, options: SIZES.map(d => [d, 'M' + d]) },
      { key: 'tq', label: 'Tightening', unit: '%', min: 40, max: 130, step: 5, value: 100 }
    ],
    draw(g, a, p) {
      const c = g.c, d = p.d, s = Math.min(9, 84 / d), X = 250, F = preload(a, p), Fp = proofF(d), f = F / Fp;
      const db = d * s, t1 = 70, t2 = 70, y0 = 160, hole = ISO[d][5] * s, wash = Math.max(6, 0.2 * d * s), nutH = ISO[d][4] * s, headH = ISO[d][3] * s, acr = ISO[d][2] * 1.1547 * s;
      const stretch = f * 10;                                 // drawn stretch, exaggerated a lot
      const yHeadBot = y0 - wash, yNutTop = y0 + t1 + t2 + wash;
      // plates, hatched in opposite directions
      [[y0, y0 + t1, Math.PI / 4], [y0 + t1, y0 + t1 + t2, -Math.PI / 4]].forEach(([ya, yb2, an]) => {
        [[X - 200, X - hole / 2], [X + hole / 2, X + 160]].forEach(([xa, xb]) => g.poly([[xa, ya], [xb, ya], [xb, yb2], [xa, yb2]], { fill: COL.white, hatch: { spacing: 7, angle: an, cx: X, cy: ya } }));
      });
      // washers
      [[yHeadBot, y0], [y0 + t1 + t2, yNutTop]].forEach(([ya, yb2]) => [[X - acr / 2 - 6, X - db / 2 - 2], [X + db / 2 + 2, X + acr / 2 + 6]].forEach(([xa, xb]) => g.poly([[xa, ya], [xb, ya], [xb, yb2], [xa, yb2]], { fill: COL.white })));
      // bolt: head + shank (stretches downward)
      const yEnd = yNutTop + nutH + 2.5 * PITCH[d] * s + stretch;
      g.poly([[X - acr / 2, yHeadBot - headH], [X + acr / 2, yHeadBot - headH], [X + acr / 2, yHeadBot], [X - acr / 2, yHeadBot]], { fill: COL.white });
      g.line(X - acr / 6, yHeadBot - headH, X - acr / 6, yHeadBot, { w: 1 }); g.line(X + acr / 6, yHeadBot - headH, X + acr / 6, yHeadBot, { w: 1 });
      g.poly([[X - db / 2, yHeadBot], [X + db / 2, yHeadBot], [X + db / 2, yEnd], [X - db / 2, yEnd]], { fill: f > 0 ? MM.tint('red', 0.1 + 0.4 * Math.min(f, 1.2)) : COL.white });
      // thread lines on the lower part
      const pt = PITCH[d] * s, yT0 = y0 + t1 + t2 - 4 * pt;
      for (let y = yT0; y < yEnd - 2; y += pt) g.line(X - db / 2, y, X + db / 2, y + pt * 0.5, { w: 0.8, color: COL.faint });
      g.line(X, yHeadBot - headH - 16, X, yEnd + 16, { w: 0.8, dash: [10, 3, 2, 3], color: COL.faint });
      // nut (moves down with the stretch so it stays on the plate: here we show the bolt growing below it)
      g.poly([[X - acr / 2, yNutTop], [X + acr / 2, yNutTop], [X + acr / 2, yNutTop + nutH], [X - acr / 2, yNutTop + nutH]], { fill: COL.white });
      g.line(X - acr / 6, yNutTop, X - acr / 6, yNutTop + nutH, { w: 1 }); g.line(X + acr / 6, yNutTop, X + acr / 6, yNutTop + nutH, { w: 1 });
      // clamp force arrows
      if (f > 0.02) {
        const L = 18 + 40 * Math.min(f, 1.2);
        g.arrow(X - acr / 2 - 30, yHeadBot - L, X - acr / 2 - 30, yHeadBot, { color: COL.red, w: 2 }); g.arrow(X + acr / 2 + 30, yHeadBot - L, X + acr / 2 + 30, yHeadBot, { color: COL.red, w: 2 });
        g.arrow(X - acr / 2 - 30, yNutTop + L, X - acr / 2 - 30, yNutTop, { color: COL.red, w: 2 }); g.arrow(X + acr / 2 + 30, yNutTop + L, X + acr / 2 + 30, yNutTop, { color: COL.red, w: 2 });
      }
      g.text('M' + d + ' × ' + PITCH[d], X, yHeadBot - headH - 24, { size: 12, weight: 700, align: 'center' });

      // nut seen from below, turning
      const NX = 560, NY = 110, R = 46, th = nutTurn(a, p);
      g.text('NUT FROM BELOW', NX, 40, { size: 11, weight: 600, align: 'center', color: COL.faint });
      const hex = []; for (let k = 0; k < 6; k++) { const q = th + k * TAU / 6; hex.push([NX + R * Math.cos(q), NY + R * Math.sin(q)]); }
      g.poly(hex, { fill: COL.white }); g.circle(NX, NY, R * 0.5, { fill: MM.tint('ink', .12) }); g.dot(NX + R * 0.8 * Math.cos(th), NY + R * 0.8 * Math.sin(th), 4, COL.red);
      g.curvedArrow(NX, NY, R + 14, -2.5, -1.2, { color: COL.faint, w: 1.2 });

      // the bolt and the clamped parts act like two springs
      const SX = 520, SY = 210, Hb = 150;
      g.text('BOLT AND JOINT AS SPRINGS', 590, SY - 14, { size: 11, weight: 600, align: 'center', color: COL.faint });
      const spring = (x, ya, yb, col) => { const n = 8, pts = [[x, ya]]; for (let k = 1; k < 2 * n; k++) pts.push([x + (k % 2 ? 12 : -12), ya + (yb - ya) * k / (2 * n)]); pts.push([x, yb]); g.poly(pts, { close: false, color: col, w: 1.6 }); };
      g.line(SX - 24, SY, SX + 24, SY, { w: 2.2 }); spring(SX, SY, SY + Hb + stretch * 2, COL.red); g.line(SX - 24, SY + Hb + stretch * 2, SX + 24, SY + Hb + stretch * 2, { w: 2.2 });
      g.text('bolt: stretched', SX, SY + Hb + 24, { size: 11, align: 'center', color: COL.red });
      g.line(SX + 110 - 24, SY, SX + 110 + 24, SY, { w: 2.2 }); spring(SX + 110, SY, SY + Hb - stretch * 0.6, COL.ink); g.line(SX + 110 - 24, SY + Hb - stretch * 0.6, SX + 110 + 24, SY + Hb - stretch * 0.6, { w: 2.2 });
      g.text('joint: squeezed', SX + 110, SY + Hb + 40, { size: 11, align: 'center' });
      g.text('clamp force ' + (F / 1000).toFixed(1) + ' kN', 590, SY + Hb + 68, { size: 13, weight: 700, align: 'center', color: COL.red });
    },
    panels: [{
      id: 'dims', title: 'Standard dimensions', live: true,
      intro: 'ISO metric coarse-thread bolts and nuts. The drawing shows the size chosen above; click a row in the table to pick another size.',
      html: p => dimsHTML(p.d),
      init(body, P, api) { body.addEventListener('click', e => { const r = e.target.closest('tr[data-d]'); if (r) api.setParam('d', +r.dataset.d); }); }
    }],
    graph: {
      title: 'Clamp force (preload) through a tighten-and-loosen cycle', min: 0, max: 1.3,
      ticks: [{ v: 0, label: '0' }, { v: 0.75, label: '75%' }, { v: 1, label: 'proof' }],
      series: [
        { name: 'proof load', color: COL.ink, dash: [5, 4], w: 1.2, f: () => 1 },
        { name: 'preload', color: COL.red, f: (t, p) => preload(t, p) / proofF(p.d) }
      ],
      readout(a, p) { const F = preload(a, p); return { big: (F / 1000).toFixed(1) + ' kN', small: Math.round(F / proofF(p.d) * 100) + '% of the M' + p.d + ' 8.8 proof load' }; }
    }
  });
})();
