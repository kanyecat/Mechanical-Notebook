(function () {
  const { TAU, COL } = MM;
  // One L-shaped bracket follows its route through the shop: raw stock, machining, inspection, finishing. The choices made while
  // designing it (material, the form of the stock, the tolerance, the finish, the batch size) set what each step costs.
  // Rough teaching figures, in dollars, for a shop charging about $72 an hour ($1.20 a minute).
  const RATE = 1.2, FINAL = 28;   // shop rate ($/min), volume of the finished bracket (cm³)
  const MAT = [   // [name, $ per cm³ of stock, machining time factor, what "plating" means for it]
    ['Aluminium 6061', 0.03, 1, 'anodised'], ['Mild steel 1018', 0.016, 1.7, 'zinc plated'], ['Stainless 304', 0.047, 2.8, 'passivated'], ['Brass C360', 0.07, 0.8, 'nickel plated']];
  const STOCK = [   // [name, stock volume cm³, price premium, setup minutes, outline]
    ['Oversize block', 90, 1, 45, [[-6, 0], [76, 0], [76, 64], [-6, 64]]],
    ['Plate near size', 55, 1.05, 35, [[-2, 0], [72, 0], [72, 58], [-2, 58]]],
    ['Extruded L profile', 32, 1.3, 20, [[-2, 0], [72, 0], [72, 16], [18, 16], [18, 58], [-2, 58]]]];
  const FIN = [['As machined', 0, 0], ['Bead blasted', 1.5, 0], ['Anodised / plated', 0, 2.5], ['Polished', 6, 0]];   // [name, minutes, $ outside service]
  const L = [[0, 0], [70, 0], [70, 14], [16, 14], [16, 56], [0, 56]];   // the finished bracket, side view
  const cost = p => {
    const m = MAT[p.mat], s = STOCK[p.stock], f = FIN[p.fin], q = Math.max(1, p.qty), tol = p.tol;
    const removed = s[1] - FINAL, tight = tol < 0.05, tf = 1 + 0.35 * Math.log10(0.5 / tol);
    const material = s[1] * m[1] * s[2];
    const machMin = ((removed * 0.12 + 3) * tf + (tight ? 4 : 0)) * m[2];
    const inspMin = tol >= 0.2 ? 0.5 : tol >= 0.05 ? 2 : 6;
    const setupMin = s[3] + (tight ? 30 : 0);
    const scrap = tight ? 0.06 : tol < 0.1 ? 0.02 : 0.005;
    const parts = { material, setup: setupMin * RATE / q, machining: machMin * RATE, inspection: inspMin * RATE, finishing: f[1] * RATE + f[2] };
    const base = Object.values(parts).reduce((x, y) => x + y, 0), scrapCost = base * scrap;
    return Object.assign(parts, { scrap: scrapCost, total: base + scrapCost, waste: removed / s[1], machMin, inspMin, tight, scrapRate: scrap, q });
  };
  const COLS = { material: 'blue', setup: 'faint', machining: 'red', inspection: 'ink', finishing: 'white', scrap: 'red' };
  const NAMES = { material: 'material', setup: 'setup ÷ batch', machining: 'machining', inspection: 'inspection', finishing: 'finishing', scrap: 'scrap' };
  const SX = [80, 215, 350, 485, 620], STN = ['RAW STOCK', 'MACHINE', 'INSPECT', 'FINISH', 'DONE'], BASE = 214;
  const QV = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000], TV = [0.02, 0.03, 0.05, 0.08, 0.1, 0.15, 0.2, 0.3, 0.5];
  const logX = (x0, x1, lo, hi, key) => p => [x0 + (x1 - x0) * Math.log(p[key] / lo) / Math.log(hi / lo), 0];
  MM.register({
    slug: 'design-for-manufacturing', hands: false, view: { w: 700, h: 440 }, thumb: 0.25, period: TAU,
    params: [
      { key: 'mat', label: 'Material', min: 0, max: 3, step: 1, value: 0, options: MAT.map((x, i) => [i, x[0]]) },
      { key: 'stock', label: 'Starting stock', min: 0, max: 2, step: 1, value: 0, options: STOCK.map((x, i) => [i, x[0]]) },
      { key: 'tol', label: 'Tightest tolerance', unit: ' mm', min: 0.02, max: 0.5, step: 0.01, value: 0.05 },
      { key: 'fin', label: 'Finish', min: 0, max: 3, step: 1, value: 2, options: FIN.map((x, i) => [i, x[0]]) },
      { key: 'qty', label: 'Batch size', min: 1, max: 1000, step: 1, value: 10 }
    ],
    tryit: {
      pose: 0.999,
      keys: [{ key: 'tol', label: 'Tolerance ±', vals: TV, at: p => [logX(70, 330, 0.02, 0.5, 'tol')(p)[0], 420] }, { key: 'qty', label: 'Batch', vals: QV, at: p => [logX(400, 660, 1, 1000, 'qty')(p)[0], 420] }],
      tasks: [
        { text: 'Make 100 brackets for under $10 each. The starting stock (below) matters most.', now: p => p.qty + ' parts at $' + MM.num(cost(p).total, 2) + ' each', ok: p => p.qty >= 100 && cost(p).total < 10 },
        { text: 'Throw away less than 20 % of the material you buy.', now: p => MM.num(cost(p).waste * 100, 0) + ' % of the stock ends up as chips', ok: p => cost(p).waste < 0.2 },
        { text: 'The bracket must not rust, so it has to be stainless. Get it under $20 each for a batch of 100.', now: p => MAT[p.mat][0] + ', ' + p.qty + ' parts at $' + MM.num(cost(p).total, 2), ok: p => p.mat === 2 && p.qty >= 100 && cost(p).total < 20 }
      ]
    },
    draw(g, a, p) {
      const c = cost(p), m = MAT[p.mat], s = STOCK[p.stock], f = FIN[p.fin], u = ((a / TAU) % 1 + 1) % 1, seg = u * 5, i = Math.min(4, Math.floor(seg)), fr = seg - i;
      const stay = fr < 0.6, prog = stay ? fr / 0.6 : 1, ease = t => t * t * (3 - 2 * t), x = stay || i === 4 ? SX[i] : SX[i] + (SX[i + 1] - SX[i]) * ease((fr - 0.6) / 0.4), at = stay || i === 4 ? i : i + (fr > 0.8 ? 1 : 0);
      const K = 1.4, X0 = x - 36 * K, P = pts => pts.map(([px, py]) => [X0 + px * K, BASE - py * K]);
      g.text('One bracket on its way through the shop, ' + m[0].toLowerCase() + ', from ' + s[0].toLowerCase(), 20, 24, { size: 12, weight: 700 });
      // the line and its stations
      g.line(20, BASE + 2, 680, BASE + 2, { w: 2 }); for (let k = 30; k < 680; k += 22) g.circle(k, BASE + 8, 5, { color: COL.faint, w: 1 });
      SX.forEach((sx, k) => { g.rect(sx - 52, 40, 104, 26, { fill: k === i ? MM.tint('red', 0.25) : MM.tint('white', 0.9), hatch: false }); g.text(STN[k], sx, 53, { size: 11, weight: 700, align: 'center', color: k === i ? COL.red : COL.ink }); });
      // station machinery: a milling cutter that sweeps over the part, a gauge that closes on it, a spray head
      const cutting = i === 1 && stay, cx = SX[1] + (cutting ? Math.sin(prog * TAU * 2) * 34 : 0), tip = BASE - 66 * K;
      g.rect(cx - 6, 66, 12, tip - 66 - 8, { fill: COL.white, hatch: false }); g.rect(cx - 9, tip - 10, 18, 14, { fill: MM.tint('red', 0.35), hatch: false });
      const inspecting = i === 2 && stay, open = inspecting ? (1 - ease(Math.min(1, prog * 2))) * 20 : 20, gy = BASE - 66 * K, jl = SX[2] - 36 * K - 2, jr = SX[2] + 34 * K + 2 + open;
      g.line(jl - 16, gy, SX[2] + 34 * K + 34, gy, { w: 3 }); g.line(jl, gy, jl, BASE - 6, { w: 3 }); g.line(jr, gy - 6, jr, BASE - 6, { w: 3 });
      g.poly([[SX[3] - 14, 72], [SX[3] + 14, 72], [SX[3] + 6, 92], [SX[3] - 6, 92]], { fill: COL.white });
      if (i === 3 && stay && p.fin) for (let k = 0; k < 14; k++) { const t = (prog * 4 + k * 0.071) % 1; g.dot(SX[3] + ((k * 29) % 13 - 6) * t * 5, 96 + t * 40, 1.6, p.fin === 2 ? COL.blue : COL.faint); }
      // chips collected under the machine: as much as the stock that was cut away
      const heap = 10 + 50 * c.waste; g.poly([[SX[1] - heap, 292], [SX[1] + heap, 292], [SX[1], 292 - heap * 0.55]], { fill: MM.tint('red', 0.3), color: MM.tint('red', 0.6), w: 1 });
      g.text('chips: ' + MM.num(c.waste * 100, 0) + ' % of the stock', SX[1], 306, { size: 10.5, align: 'center', color: COL.red });
      // the batch it joins, stacked behind it
      if (i === 4) { const n = Math.min(8, c.q); for (let k = n - 1; k >= 1; k--) g.poly(L.map(([px, py]) => [SX[4] - 36 * K + px * K - k * 5, BASE - py * K - k * 4]), { fill: MM.tint('white', 0.6), color: COL.faint, w: 0.8 }); }
      // the part
      const tint = at >= 3 ? (p.fin === 2 ? MM.tint('blue', 0.25 + 0.35 * (at > 3 ? 1 : prog)) : MM.tint('white', 0.95)) : MM.tint('white', 0.95);
      if (at === 0) g.poly(P(s[4]), { fill: MM.tint('white', 0.9), hatch: { spacing: 6 } });
      else {
        if (at === 1 && prog < 1) g.poly(P(s[4]), { fill: false, color: MM.tint('ink', 0.6 * (1 - prog)), dash: [4, 3], w: 1.2 });
        g.poly(P(L), { fill: tint, hatch: at < 3 ? { spacing: 6 } : false });
        if (at >= 3 && p.fin === 1) for (let k = 0; k < 60; k++) { const px = (k * 37) % 70, py = (k * 23) % 56; if (px > 16 && py > 14) continue; g.dot(X0 + px * K, BASE - py * K, 0.9, COL.ink); }
        if (at >= 3 && p.fin === 3) { g.line(X0 + 4 * K, BASE - 50 * K, X0 + 10 * K, BASE - 30 * K, { w: 2, color: COL.white }); g.line(X0 + 40 * K, BASE - 10 * K, X0 + 58 * K, BASE - 4 * K, { w: 2, color: COL.white }); }
        g.circle(X0 + 8 * K, BASE - 38 * K, 4, { fill: COL.paper }); g.circle(X0 + 46 * K, BASE - 7 * K, 4, { fill: COL.paper });
      }
      if (cutting) for (let k = 0; k < Math.round(4 + 24 * c.waste); k++) { const t = (prog * 3 + k * 0.137) % 1; g.dot(cx + ((k * 13) % 30 - 15) - t * 30, tip + 4 + t * (292 - tip - 10), 2, COL.red); }
      const note = (t, sub, col) => { g.text(t, SX[i], 236, { size: 11, weight: 700, align: 'center', color: col || COL.ink }); if (sub) g.text(sub, SX[i], 250, { size: 10.5, align: 'center', color: COL.faint }); };
      if (i === 0 && stay) note('$' + MM.num(c.material, 2) + ' of metal', MM.num(s[1], 0) + ' cm³ bought');
      if (i === 1 && stay) note(MM.num(c.machMin, 1) + ' min', (c.tight ? 'extra finishing pass' : '') , COL.red);
      if (i === 2 && stay) note('±' + MM.num(p.tol, 2) + (c.tight ? ' CMM check' : ' caliper check'), MM.num(c.inspMin, 1) + ' min' + (c.scrapRate > 0.01 ? ', ' + MM.num(c.scrapRate * 100, 0) + ' % scrapped' : ''), c.tight ? COL.red : COL.ink);
      if (i === 3 && stay) note(p.fin === 2 ? m[3] : f[0].toLowerCase(), p.fin === 2 ? 'sent out' : p.fin ? MM.num(f[1], 1) + ' min' : 'no extra step');
      if (i === 4) note('batch of ' + c.q, 'setup $' + MM.num(c.setup * c.q, 0) + ' shared');
      // what one bracket costs, piece by piece
      const keys = ['material', 'setup', 'machining', 'inspection', 'finishing', 'scrap'], bx = 70, by = 344, full = 590, sc = full / Math.max(c.total, 25);
      g.text('COST OF ONE BRACKET', bx, by - 22, { size: 11, weight: 700 }); g.text('$' + MM.num(c.total, 2), bx + full, by - 22, { size: 15, weight: 800, align: 'right', color: COL.red });
      let xx = bx; keys.forEach(k => { const w = c[k] * sc; if (w < 0.5) return; g.rect(xx, by - 10, w, 20, { fill: MM.tint(COLS[k], k === 'scrap' ? 0.25 : k === 'finishing' ? 0.6 : 0.55), hatch: false, color: COL.ink, w: 1 }); if (w > 40) g.text('$' + MM.num(c[k], 1), xx + w / 2, by, { size: 10, align: 'center' }); xx += w; });
      keys.forEach((k, j) => { const lx = bx + (j % 3) * 200, ly = by + 26 + Math.floor(j / 3) * 16; g.rect(lx, ly - 5, 10, 10, { fill: MM.tint(COLS[k], k === 'scrap' ? 0.25 : k === 'finishing' ? 0.6 : 0.55), hatch: false, w: 1 }); g.text(NAMES[k] + ' $' + MM.num(c[k], 2), lx + 16, ly, { size: 10.5 }); });
    },
    readout(a, p) { const c = cost(p); return { big: '$' + MM.num(c.total, 2), small: 'per bracket in a batch of ' + c.q + '; ' + MM.num(c.waste * 100, 0) + ' % of the stock is cut away as chips' }; },
    panels: [{
      id: 'levers', title: 'What sets the cost, and what to do about it', live: true,
      html: p => { const c = cost(p); const rows = [['Material', 'Price per kg, and how fast it machines. Stainless costs more to buy and cuts two to three times slower than aluminium.', 'Use the cheapest material that does the job; free-machining grades (6061, 1018, C360 brass) cut fastest.'],
        ['Form of the stock', 'Every gram cut away was paid for twice: once to buy, once to remove.', 'Start from stock close to the final shape: plate, extrusion, tube, a casting or a forging.'],
        ['Tolerances', 'Each tighter step means slower passes, a finishing operation, better inspection and more scrap.', 'Tight tolerances only on faces that fit something; a general tolerance (ISO 2768-m) for the rest.'],
        ['Finishing', 'Secondary processes add handling, often a trip to another company, and a minimum batch charge.', 'Leave surfaces as machined where nobody sees or touches them; group parts that share a finish.'],
        ['Batch size', 'Setting up a job (fixtures, programs, first-part checks) is paid once per batch.', 'Make parts in sensible batches; design so one setup does the whole part.']];
        return `<div class="tablewrap"><table class="btable"><thead><tr><th>Factor</th><th>Why it costs</th><th>Design for it</th></tr></thead><tbody>${rows.map(r => `<tr><td><b>${r[0]}</b></td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</tbody></table></div>
        <p class="xpintro">This design: material $${MM.num(c.material, 2)}, setup $${MM.num(c.setup, 2)}, machining $${MM.num(c.machining, 2)}, inspection $${MM.num(c.inspection, 2)}, finishing $${MM.num(c.finishing, 2)}, scrap $${MM.num(c.scrap, 2)}. Rough teaching figures at about $72 an hour.</p>`; }
    }, {
      id: 'forms', title: 'Forms of raw material',
      html: () => `<div class="tablewrap"><table class="btable"><thead><tr><th>Form</th><th>Good for</th><th>Watch out for</th></tr></thead><tbody>
        <tr><td>Bar and block</td><td>One-offs, chunky machined parts</td><td>Most of it may end up as chips</td></tr>
        <tr><td>Plate and sheet</td><td>Flat parts, laser, waterjet and sheet-metal work</td><td>Standard thicknesses only; check what your supplier stocks</td></tr>
        <tr><td>Extrusion and tube</td><td>Constant cross-sections: rails, brackets, frames</td><td>A custom profile needs a die (worth it from a few hundred metres)</td></tr>
        <tr><td>Casting</td><td>Complex shapes in quantity</td><td>Pattern or mould cost; needs draft and even walls; machine only the fitting faces</td></tr>
        <tr><td>Forging</td><td>Strong parts under heavy load</td><td>Expensive dies; for large batches</td></tr>
        <tr><td>Moulded plastic</td><td>Thousands of parts and up</td><td>Tooling cost; draft, even walls, no undercuts</td></tr></tbody></table></div>`
    }, {
      id: 'other', title: 'Rules for each process',
      html: () => `<p class="xpintro">Have a flat part drawing? <a href="dxf-check.html">Check a DXF</a> to see these rules applied to it.</p><ul class="rules"><li><b>Machining:</b> inside corners need a radius at least the cutter's; pockets up to about 3 × the cutter diameter deep; walls above about 1 mm; features on as few sides as possible. See <a href="../fabrication/cnc-corners.html">Inside Corners and Dog Bones</a>.</li>
        <li><b>3D printing:</b> overhangs under about 45° need support; holes print small; walls at least two nozzle widths. See <a href="../fabrication/print-tolerances.html">3D Print Tolerances</a>.</li>
        <li><b>Laser cutting:</b> allow for the kerf; slots and tabs at least the sheet thickness. See <a href="../fabrication/laser-kerf.html">Laser Kerf</a>.</li>
        <li><b>Sheet metal:</b> bend reliefs at corners; holes at least about 2 × thickness from a bend. See <a href="../fabrication/sheet-metal-bend.html">Sheet Metal Bends</a>.</li>
        <li><b>Injection moulding:</b> even wall thickness, 1° or more of draft, ribs about 60 % of the wall, no undercuts unless the tool has slides.</li></ul>`
    }]
  });
})();
