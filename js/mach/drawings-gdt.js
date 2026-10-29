(function () {
  const { TAU, COL } = MM;
  /* ---------- GD&T symbols, drawn as small SVGs (fonts rarely have all of them) ---------- */
  const SY = {
    straight: ['Straightness', '<path d="M3 12H21"/>'],
    flat: ['Flatness', '<path d="M7.5 7H21L16.5 17H3Z"/>'],
    circ: ['Circularity (roundness)', '<circle cx="12" cy="12" r="6.5"/>'],
    cyl: ['Cylindricity', '<circle cx="12" cy="12" r="5.5"/><path d="M4.5 20 11.5 4M12.5 20 19.5 4"/>'],
    pline: ['Profile of a line', '<path d="M4 16.5A8 8 0 0 1 20 16.5"/>'],
    psurf: ['Profile of a surface', '<path d="M4 16.5A8 8 0 0 1 20 16.5Z"/>'],
    par: ['Parallelism', '<path d="M5 19 11 5M12 19 18 5"/>'],
    perp: ['Perpendicularity', '<path d="M12 5V19M4 19H20"/>'],
    ang: ['Angularity', '<path d="M20 19H4L18 8"/>'],
    pos: ['Position', '<circle cx="12" cy="12" r="5.5"/><path d="M12 3V21M3 12H21"/>'],
    conc: ['Concentricity', '<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="3.5"/>'],
    sym: ['Symmetry', '<path d="M3 12H21M7 7.5H17M7 16.5H17"/>'],
    runout: ['Circular runout', '<path d="M5 19 15 9"/><path d="M17.5 6.5 16.1 10.1 13.9 7.9Z" fill="currentColor"/>'],
    trunout: ['Total runout', '<path d="M2.5 19H11.5M2.5 19 9.5 10M11.5 19 18.5 10"/><path d="M11.6 7.2 10.8 11 8.3 9Z M20.6 7.2 19.8 11 17.3 9Z" fill="currentColor"/>'],
    dia: ['Diameter Ø', '<circle cx="12" cy="12" r="6"/><path d="M5 19 19 5"/>'],
    mmc: ['Maximum material condition Ⓜ', '<circle cx="12" cy="12" r="9"/><text x="12" y="16" text-anchor="middle" font-size="11" font-weight="700" stroke="none" fill="currentColor" font-family="Arial,sans-serif">M</text>'],
    lmc: ['Least material condition Ⓛ', '<circle cx="12" cy="12" r="9"/><text x="12" y="16" text-anchor="middle" font-size="11" font-weight="700" stroke="none" fill="currentColor" font-family="Arial,sans-serif">L</text>']
  };
  const gsym = (k, s) => `<svg class="gsym" viewBox="0 0 24 24" width="${s || 24}" height="${s || 24}" role="img" aria-label="${SY[k][0]}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${SY[k][1]}</svg>`;
  const CHART = [
    ['Form', 'No datum. The feature is compared only with a perfect copy of itself.', 'No', [
      ['straight', 'Every line along a surface, or the axis of a pin, is straight within the tolerance.', 'Shafts, pins, rails and long parts that may bow.', 'On an axis'],
      ['flat', 'The whole surface lies between two parallel planes the tolerance apart.', 'Faces that seal, slide, or sit on another part.', 'No'],
      ['circ', 'Each cross-section of a round feature lies between two circles the tolerance apart.', 'Bearing seats, seals, anything that spins.', 'No'],
      ['cyl', 'The whole round surface lies between two coaxial cylinders: roundness, straightness and taper in one.', 'Precise shafts and bores, pistons.', 'No']]],
    ['Profile', 'Datum optional. Without one it controls shape only; with datums it also fixes angle and place.', 'Optional', [
      ['pline', 'Each cross-section stays inside a band around its true outline.', 'Cam outlines, airfoil sections, extrusions.', 'No'],
      ['psurf', 'The whole surface stays inside a band around its true shape.', 'Curved and free-form surfaces, castings, mouldings; also plain faces.', 'No']]],
    ['Orientation', 'Needs a datum. Controls tilt only, never where the feature is.', 'Yes', [
      ['par', 'A surface or axis stays between two planes (or in a cylinder) parallel to the datum.', 'Faces that must stay level with a base; guides.', 'On a size feature'],
      ['perp', 'A surface or axis is square to the datum within the tolerance.', 'Holes for pins, faces that bolt to a base.', 'On a size feature'],
      ['ang', 'A surface or axis sits at a stated (basic) angle to the datum.', 'Angled faces, locating chamfers, wedges.', 'On a size feature']]],
    ['Location', 'Needs datums. Places the centre of a feature: its axis or middle plane.', 'Yes', [
      ['pos', 'The centre of a hole, pin or slot lies in a zone around its exact location, measured from the datums.', 'Bolt and dowel holes, any pattern that must line up with another part. The most used control.', 'Yes: Ⓜ or Ⓛ (bonus)'],
      ['conc', 'The middle points of a round feature lie around the datum axis.', 'Rare and slow to measure. Removed from ASME Y14.5 in 2018: use runout or position.', 'No'],
      ['sym', 'The middle points between two faces lie around a datum centre plane.', 'Rare. Removed from ASME Y14.5 in 2018: use position or profile.', 'No']]],
    ['Runout', 'Needs a datum axis. Measured with a dial indicator while the part turns.', 'Yes (an axis)', [
      ['runout', 'At each cross-section, the surface wobbles no more than the tolerance as the part turns on its datum axis.', 'Pulleys, gear seats, shoulders, faces that a part presses on.', 'No'],
      ['trunout', 'The whole surface, measured all along it at once, wobbles no more than the tolerance as it turns.', 'Bearing journals, rollers, seal surfaces.', 'No']]]
  ];
  const chartHTML = () => `<div class="tablewrap"><table class="btable gd-chart"><thead><tr><th>Type</th><th>Symbol</th><th>Control</th><th>Datum</th><th>What it controls</th><th>Where you see it</th><th>Ⓜ / Ⓛ allowed</th></tr></thead><tbody>
    ${CHART.map(([type, about, dat, rows], gi) => rows.map(([k, what, use, mod], i) => `<tr class="gd-g${gi}">${i === 0 ? `<th rowspan="${rows.length}" scope="rowgroup" class="gd-type"><b>${type}</b><small>${about}</small></th>` : ''}<td class="gd-sym">${gsym(k, 28)}</td><td><b>${SY[k][0]}</b></td><td>${k === 'pos' ? 'Yes (almost always)' : dat}</td><td>${what}</td><td>${use}</td><td>${mod}</td></tr>`).join('')).join('')}
    </tbody></table></div>
    <p class="xpintro">Reading a feature control frame, left to right: the symbol, then the tolerance (with Ø if the zone is round, and Ⓜ or Ⓛ if bonus tolerance applies), then the datums in order of importance: primary, secondary, tertiary.</p>`;

  /* ---------- practice: fill in the empty boxes of a drawing ---------- */
  // each exercise is built from a few drawing helpers; an empty box is { k: kind, a: [accepted answers], h: hint }
  const EX = (() => {
    const cellW = c => c.t != null ? 12 + String(c.t).length * 7.4 : c.f ? 14 : c.k === 'sym' ? 30 : 26;
    function make(title, story, build) {
      const B = [], S = [];
      const ln = (x1, y1, x2, y2, c) => S.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${c || 'gp-o'}"/>`);
      const tx = (x, y, t, c, a) => S.push(`<text x="${x}" y="${y}" class="${c || 'gp-tx'}"${a ? ` text-anchor="${a}"` : ''}>${t}</text>`);
      const arrow = (x1, y1, x2, y2) => { const a = Math.atan2(y2 - y1, x2 - x1), l = 9, w = 3.5; S.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="gp-t"/><path d="M${x2} ${y2}L${x2 - l * Math.cos(a) + w * Math.sin(a)} ${y2 - l * Math.sin(a) - w * Math.cos(a)}L${x2 - l * Math.cos(a) - w * Math.sin(a)} ${y2 - l * Math.sin(a) + w * Math.cos(a)}Z" class="gp-fill"/>`); };
      const box = (x, y, w, h, c) => { B.push(Object.assign({ x, y, w, h }, c)); };
      const fcf = (x, y, cells) => { let cx = x; cells.forEach(c => { const w = cellW(c); if (c.k) box(cx, y, w, 26, c); else { S.push(`<rect x="${cx}" y="${y}" width="${w}" height="26" class="gp-cell"/>`); tx(cx + w / 2, y + 18, c.t != null ? c.t : c.f, 'gp-num', 'middle'); } cx += w; }); return { x0: x, x1: cx, y0: y, y1: y + 26 }; };
      // datum feature symbol: a box joined by a line to a filled triangle on the feature
      const flag = (bx, by, fx, fy, dir, c) => {
        const d = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] }[dir], p = [-d[1], d[0]];
        S.push(`<path d="M${fx + p[0] * 6} ${fy + p[1] * 6}L${fx - p[0] * 6} ${fy - p[1] * 6}L${fx + d[0] * 9} ${fy + d[1] * 9}Z" class="gp-fill"/>`);
        const ex = bx + 13 - d[0] * 13, ey = by + 13 - d[1] * 13; ln(fx + d[0] * 9, fy + d[1] * 9, ex, ey, 'gp-t');
        box(bx, by, 26, 26, Object.assign({ flag: 1 }, c));
      };
      const basic = (x, y, t) => { const w = 10 + String(t).length * 7.4; S.push(`<rect x="${x - w / 2}" y="${y - 15}" width="${w}" height="20" class="gp-cell"/>`); tx(x, y, t, 'gp-num', 'middle'); };
      build({ ln, tx, arrow, fcf, flag, basic, S, poly: (pts, c) => S.push(`<path d="M${pts.map(p => p.join(' ')).join('L')}Z" class="${c || 'gp-o'}"/>`), raw: s => S.push(s) });
      return { title, story, svg: S.join(''), boxes: B };
    }
    const sym = (a, h) => ({ k: 'sym', a: [a], hint: h }), let_ = (a, h) => ({ k: 'let', a: [a], hint: h }), mod = (a, h) => ({ k: 'mod', a: [a], hint: h });
    const PRI = 'The primary datum is the face the part first rests on.', SEC = 'The secondary datum is the edge it is then pushed against.', TER = 'The tertiary datum is the last one it touches.';
    return [
      make('Cover plate', 'A cover plate bolts onto a gearbox with four M6 bolts, and a bearing sits in the big hole. To locate it, its <b>back face</b> rests flat on the gearbox (primary datum), its <b>left edge</b> is pushed against a stop (secondary) and its <b>bottom edge</b> against another (tertiary). The back face must be <b>flat</b> within 0.05. The four bolt holes are <b>located</b> in a round zone of 0.2, and because the bolts pass with clearance, a <b>bigger hole may be further off</b>. The bearing hole is <b>located</b> in a round zone of 0.05 at any size, and its axis must be <b>square to the back face</b> within a round zone of 0.02.', d => {
        // front view, 2 px per mm: plate 150 × 90, holes 15 from the edges, bearing hole Ø20 in the middle
        d.raw('<rect x="120" y="150" width="300" height="180" class="gp-o"/>');
        [[150, 180], [390, 180], [150, 300], [390, 300]].forEach(([x, y]) => { d.raw(`<circle cx="${x}" cy="${y}" r="6.6" class="gp-o"/>`); d.ln(x - 13, y, x + 13, y, 'gp-c'); d.ln(x, y - 13, x, y + 13, 'gp-c'); });
        d.raw('<circle cx="270" cy="240" r="20" class="gp-o"/>'); d.ln(240, 240, 300, 240, 'gp-c'); d.ln(270, 210, 270, 270, 'gp-c');
        // side view (third angle: to the right), 10 mm thick
        d.raw('<rect x="470" y="150" width="20" height="180" class="gp-o"/>');
        [173.4, 186.6, 293.4, 306.6, 220, 260].forEach(y => d.ln(470, y, 490, y, 'gp-h'));
        // basic dimensions
        d.ln(120, 352, 120, 392, 'gp-t'); d.ln(150, 312, 150, 392, 'gp-t'); d.ln(390, 312, 390, 392, 'gp-t'); d.arrow(135, 384, 120, 384); d.arrow(135, 384, 150, 384); d.basic(135, 406, 15); d.arrow(270, 384, 150, 384); d.arrow(270, 384, 390, 384); d.basic(270, 389, 120);
        d.ln(420, 330, 452, 330, 'gp-t'); d.ln(396, 300, 452, 300, 'gp-t'); d.ln(396, 180, 452, 180, 'gp-t'); d.arrow(444, 315, 444, 330); d.arrow(444, 315, 444, 300); d.basic(444, 320, 15); d.arrow(444, 240, 444, 180); d.arrow(444, 240, 444, 300); d.basic(444, 245, 60);
        // datum feature symbols
        d.flag(530, 226, 490, 240, 'right', let_('A', PRI)); d.flag(68, 227, 120, 240, 'left', let_('B', SEC)); d.flag(198, 356, 210, 330, 'down', let_('C', TER));
        // the frames
        d.tx(40, 74, '4× Ø6.6 THRU'); const f1 = d.fcf(40, 82, [sym('pos', 'The holes must be in the right place: a location control.'), mod('dia', 'A round zone is shown with Ø.'), { t: '0.2' }, mod('mmc', 'A bigger hole may be further off: bonus tolerance at maximum material condition.'), let_('A', PRI), let_('B', SEC), let_('C', TER)]);
        d.arrow(60, f1.y1, 145, 175);
        d.tx(300, 66, 'Ø20 H7'); const f2 = d.fcf(300, 74, [sym('pos', 'The bearing hole must be in the right place.'), mod('dia', 'A round zone is shown with Ø.'), { t: '0.05' }, let_('A', PRI), let_('B', SEC), let_('C', TER)]);
        d.fcf(300, 100, [sym('perp', 'Square to the back face: an orientation control.'), mod('dia', 'The zone round the axis is a cylinder, shown with Ø.'), { t: '0.02' }, let_('A', 'Square to which face? The back face, datum A.')]);
        d.arrow(320, 126, 284, 226);
        const f4 = d.fcf(560, 300, [sym('flat', 'Flat on its own, with no datum: a form control.'), { t: '0.05' }]); d.arrow(560, 313, 491, 300);
        void f4;
      }),
      make('Shaft on two bearings', 'A shaft runs on two bearings, so its <b>left and right journals together</b> make the axis it turns on: datums A (left) and B (right), used together as A–B. The left journal must be a near-perfect <b>cylinder</b> (0.005). The right journal must be <b>round at every section</b> (0.004). The <b>whole gear seat</b> may not wobble more than 0.02 as the shaft turns on its bearings. The <b>collar face</b> the gear presses against may not wobble more than 0.01 at any one radius.', d => {
        const y = 230, segs = [[100, 200, 40], [200, 230, 70], [230, 400, 60], [400, 520, 40]];
        let top = `M100 ${y}`; segs.forEach(([a, b, r]) => { top += `L${a} ${y - r}L${b} ${y - r}`; }); top += `L520 ${y}`;
        let bot = `M100 ${y}`; segs.forEach(([a, b, r]) => { bot += `L${a} ${y + r}L${b} ${y + r}`; }); bot += `L520 ${y}`;
        d.raw(`<path d="${top}" class="gp-o"/><path d="${bot}" class="gp-o"/>`);
        [200, 230, 400].forEach((x, i) => { const r = Math.max(segs[i][2], segs[i + 1][2]); d.ln(x, y - r, x, y + r); });
        d.ln(80, y, 545, y, 'gp-c');
        d.tx(150, y + 24, 'left bearing', 'gp-lab', 'middle'); d.tx(315, y + 24, 'gear seat', 'gp-lab', 'middle'); d.tx(460, y + 24, 'right bearing', 'gp-lab', 'middle');
        d.flag(137, 302, 150, 270, 'down', let_('A', 'The left journal is datum A.')); d.flag(447, 302, 460, 270, 'down', let_('B', 'The right journal is datum B.'));
        const a = d.fcf(48, 108, [sym('cyl', 'A near-perfect cylinder: the cylindricity form control, no datum.'), { t: '0.005' }]); d.arrow(70, a.y1, 128, 190);
        const b = d.fcf(462, 108, [sym('circ', 'Round at every section: circularity, a form control.'), { t: '0.004' }]); d.arrow(490, b.y1, 482, 190);
        const c = d.fcf(236, 92, [sym('runout', 'Wobble at one radius at a time: circular runout.'), { t: '0.01' }, let_('A', 'The axis is A–B.'), { f: '–' }, let_('B', 'The axis is A–B.')]); d.arrow(250, c.y1, 231, 166);
        const e = d.fcf(262, 340, [sym('trunout', 'The whole surface at once: total runout.'), { t: '0.02' }, let_('A', 'The axis is A–B.'), { f: '–' }, let_('B', 'The axis is A–B.')]); d.arrow(300, e.y0, 320, 291);
      }),
      make('Guide block', 'A guide block sits on its <b>base</b> (primary datum) and is pushed against its <b>left face</b> (secondary). The base must be <b>flat</b> within 0.02. The top face must stay <b>parallel</b> to the base within 0.05. The left face must be <b>square</b> to the base within 0.03. The 30° slope must keep its <b>angle</b> to the base within 0.1. The round cradle for a bar must stay within 0.1 of its <b>true shape and place</b>, measured from the base and the left face.', d => {
        // base 120..440 at y 330, left face x 120, top 150, cradle arc at 200..260, slope from (300,150) at 30° down to x 440
        d.raw('<path d="M120 330L440 330L440 230.8L300 150L260 150A30 30 0 0 1 200 150L120 150Z" class="gp-o"/>');
        d.ln(230, 112, 230, 196, 'gp-c');
        d.basic(395, 166, '30°'); d.raw('<path d="M362 150A62 62 0 0 1 353.7 180.6" class="gp-t"/>'); d.ln(300, 150, 372, 150, 'gp-t');
        d.flag(268, 356, 280, 330, 'down', let_('A', 'The base is datum A.')); d.flag(66, 220, 120, 233, 'left', let_('B', 'The left face is datum B.'));
        const f = d.fcf(330, 362, [sym('flat', 'Flat on its own: a form control with no datum.'), { t: '0.02' }]); d.arrow(350, 362, 380, 331);
        const p = d.fcf(40, 88, [sym('par', 'Parallel to the base: an orientation control.'), { t: '0.05' }, let_('A', 'Parallel to the base, datum A.')]); d.arrow(80, p.y1, 160, 150);
        const s = d.fcf(196, 70, [sym('psurf', 'True shape and place of a curved surface: profile of a surface.'), { t: '0.1' }, let_('A', 'Measured first from the base, A.'), let_('B', 'Then from the left face, B.')]); d.arrow(214, s.y1, 222, 178);
        const g = d.fcf(470, 120, [sym('ang', 'Keep a stated angle: angularity.'), { t: '0.1' }, let_('A', 'The angle is to the base, datum A.')]); d.arrow(480, g.y1, 380, 196);
        const q = d.fcf(20, 290, [sym('perp', 'Square to the base: perpendicularity.'), { t: '0.03' }, let_('A', 'Square to the base, datum A.')]); d.arrow(80, q.y0, 120, 280);
        void f;
      })
    ];
  })();
  const PAL = [['Symbols', ['straight', 'flat', 'circ', 'cyl', 'pline', 'psurf', 'par', 'perp', 'ang', 'pos', 'conc', 'sym', 'runout', 'trunout']], ['Modifiers', ['dia', 'mmc', 'lmc']], ['Datum letters', ['A', 'B', 'C', 'D']]];
  const chip = v => SY[v] ? gsym(v, 22) : `<b>${v}</b>`;
  function practice(body) {
    let ex = 0, sel = -1, vals = [], shown = false;
    body.innerHTML = `<div class="gp-head"><div class="gp-tabs" role="tablist">${EX.map((e, i) => `<button type="button" role="tab" data-ex="${i}">${i + 1} · ${e.title}</button>`).join('')}</div></div>
      <p class="gp-story"></p>
      <div class="gp-wrap"><svg class="gp-svg" viewBox="0 0 760 430" role="group" aria-label="Practice drawing with empty boxes"></svg></div>
      <div class="gp-pal" aria-label="Symbols and letters to place">${PAL.map(([n, L]) => `<div class="gp-grp"><span>${n}</span><div>${L.map(v => `<button type="button" class="gp-chip" data-v="${v}" title="${SY[v] ? SY[v][0] : 'Datum ' + v}" aria-label="${SY[v] ? SY[v][0] : 'Datum ' + v}">${chip(v)}</button>`).join('')}</div></div>`).join('')}
        <div class="gp-grp"><span>&nbsp;</span><div><button type="button" class="gp-chip gp-clear" data-v="" title="Empty the box">✕</button></div></div></div>
      <p class="gp-tip">Drag a symbol or letter onto an empty box, or tap a box and then tap what goes in it.</p>
      <div class="gp-act"><button type="button" class="btn" data-a="check">Check</button><button type="button" class="btn ghost" data-a="show">Show answers</button><button type="button" class="btn ghost" data-a="reset">Start again</button><span class="gp-score" aria-live="polite"></span></div>
      <ul class="gp-hints"></ul>`;
    const svg = body.querySelector('.gp-svg'), score = body.querySelector('.gp-score'), hints = body.querySelector('.gp-hints');
    const cur = () => EX[ex];
    function render() {
      const E = cur();
      body.querySelector('.gp-story').innerHTML = E.story;
      body.querySelectorAll('[data-ex]').forEach(b => b.setAttribute('aria-selected', +b.dataset.ex === ex));
      svg.innerHTML = E.svg + E.boxes.map((b, i) => { const v = vals[i], st = b.st || ''; return `<g class="gp-box${i === sel ? ' on' : ''}${st ? ' ' + st : ''}" data-i="${i}" tabindex="0" role="button" aria-label="Box ${i + 1}${v ? ', holds ' + (SY[v] ? SY[v][0] : v) : ', empty'}"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}"/>${v ? (SY[v] ? `<svg x="${b.x + (b.w - 20) / 2}" y="${b.y + (b.h - 20) / 2}" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${SY[v][1]}</svg>` : `<text x="${b.x + b.w / 2}" y="${b.y + b.h / 2 + 5}" text-anchor="middle" class="gp-let">${v}</text>`) : ''}${st === 'bad' || st === 'empty' ? `<text x="${b.x + b.w}" y="${b.y - 4}" text-anchor="end" class="gp-no">${i + 1}</text>` : ''}</g>`; }).join('');
    }
    function setEx(i) { ex = i; sel = -1; vals = cur().boxes.map(() => ''); cur().boxes.forEach(b => b.st = ''); shown = false; score.textContent = ''; hints.innerHTML = ''; render(); }
    function put(i, v) { if (i < 0) return; vals[i] = v; cur().boxes[i].st = ''; render(); }
    function check() {
      const B = cur().boxes; let ok = 0; const wrong = [];
      B.forEach((b, i) => { const good = b.a.includes(vals[i]); b.st = good ? 'ok' : vals[i] ? 'bad' : 'empty'; if (good) ok++; else wrong.push(i); });
      score.textContent = ok === B.length ? `All ${B.length} right. Well done.` : `${ok} of ${B.length} right.`;
      hints.innerHTML = wrong.slice(0, 6).map(i => `<li><b>Box ${i + 1}${vals[i] ? '' : ' (empty)'}:</b> ${B[i].hint}</li>`).join('') + (wrong.length > 6 ? `<li>…and ${wrong.length - 6} more.</li>` : '');
      render();
    }
    body.addEventListener('click', e => {
      const t = e.target.closest('[data-ex]'); if (t) { setEx(+t.dataset.ex); return; }
      const a = e.target.closest('[data-a]'); if (a) { if (a.dataset.a === 'check') check(); if (a.dataset.a === 'reset') setEx(ex); if (a.dataset.a === 'show') { vals = cur().boxes.map(b => b.a[0]); shown = true; check(); score.textContent = 'Answers shown. Start again to try it yourself.'; } return; }
      const bx = e.target.closest('.gp-box'); if (bx) { sel = +bx.dataset.i === sel ? -1 : +bx.dataset.i; render(); return; }
      const c = e.target.closest('.gp-chip'); if (c && !c._dragged && sel >= 0) { const s = sel; put(s, c.dataset.v); const B = cur().boxes; sel = -1; for (let k = s + 1; k < B.length; k++) if (!vals[k]) { sel = k; break; } render(); }
    });
    svg.addEventListener('keydown', e => { const bx = e.target.closest('.gp-box'); if (!bx) return; if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sel = +bx.dataset.i; render(); svg.querySelector(`[data-i="${sel}"]`).focus(); } if (e.key === 'Backspace' || e.key === 'Delete') { put(+bx.dataset.i, ''); } });
    // dragging a chip onto a box (mouse, pen or touch)
    let drag = null;
    body.addEventListener('pointerdown', e => { const c = e.target.closest('.gp-chip'); if (!c) return; c._dragged = false; drag = { c, x: e.clientX, y: e.clientY, ghost: null }; });
    window.addEventListener('pointermove', e => {
      if (!drag) return; const d = Math.hypot(e.clientX - drag.x, e.clientY - drag.y);
      if (!drag.ghost && d > 6) { drag.ghost = drag.c.cloneNode(true); drag.ghost.className = 'gp-chip gp-ghost'; document.body.appendChild(drag.ghost); drag.c._dragged = true; }
      if (drag.ghost) { e.preventDefault(); drag.ghost.style.left = e.clientX + 'px'; drag.ghost.style.top = e.clientY + 'px'; svg.querySelectorAll('.gp-box').forEach(b => b.classList.remove('over')); const el = document.elementFromPoint(e.clientX, e.clientY), bx = el && el.closest && el.closest('.gp-box'); if (bx) bx.classList.add('over'); }
    }, { passive: false });
    window.addEventListener('pointerup', e => {
      if (!drag) return; const g = drag.ghost, c = drag.c; drag = null;
      if (g) { g.remove(); const el = document.elementFromPoint(e.clientX, e.clientY), bx = el && el.closest && el.closest('.gp-box'); if (bx) put(+bx.dataset.i, c.dataset.v); else render(); setTimeout(() => c._dragged = false, 0); }
    });
    setEx(0);
  }
  MM.register({
    slug: 'drawings-gdt', hands: false, view: { w: 700, h: 440 }, thumb: 0.2,
    params: [
      { key: 't', label: 'Position tolerance', unit: ' mm', min: 0.05, max: 0.4, step: 0.05, value: 0.2 },
      { key: 'h', label: 'Hole made bigger than its smallest size by', unit: ' mm', min: 0, max: 0.2, step: 0.02, value: 0.06 },
      { key: 'mmc', label: 'Tolerance applies at', min: 0, max: 1, step: 1, value: 1, options: [[0, 'Any size (RFS)'], [1, 'MMC Ⓜ']] }
    ],
    draw(g, a, p) {
      const k = 600, cx = 250, cy = 230, zone = p.t + (p.mmc ? p.h : 0);
      // the part: a plate with datums A (bottom face, behind), B (left edge), C (bottom edge)
      g.rect(60, 70, 380, 300, { fill: MM.tint('white', .8), sp: 9 });
      g.text('B', 40, 220, { size: 13, weight: 700, color: COL.blue }); g.text('C', 250, 392, { size: 13, weight: 700, color: COL.blue, align: 'center' });
      g.dim(60, 400, cx, 400, '40 (basic)', 0, { ty: 14 }); g.dim(470, 370, 470, cy, '25 (basic)', 0, { tx: 34, ty: 0 });
      // the exact (true) position, the round tolerance zone, and where the hole really is (drawn ×600 near the centre)
      const wob = 0.42 * (p.t + 0.15), ex = wob * Math.cos(a) , ey = wob * 0.7 * Math.sin(2 * a), off = Math.hypot(ex, ey), ok = 2 * off <= zone + 1e-9;
      g.circle(cx, cy, zone / 2 * k, { fill: MM.tint(ok ? 'blue' : 'red', .18), color: COL.blue, dash: [5, 4] });
      g.line(cx - 90, cy, cx + 90, cy, { w: 0.8, color: COL.faint }); g.line(cx, cy - 90, cx, cy + 90, { w: 0.8, color: COL.faint });
      const hx = cx + ex * k, hy = cy + ey * k; g.circle(hx, hy, 46, { fill: COL.paper }); g.dot(hx, hy, 4, ok ? COL.ink : COL.red);
      g.text('true position', cx + 8, cy - 100, { size: 11, color: COL.faint });
      // feature control frame
      const fx = 462, fy = 110, cells = ['⌖', 'Ø' + MM.num(p.t, 2) + (p.mmc ? ' Ⓜ' : ''), 'A', 'B', 'C'], ws = [34, 92, 26, 26, 26]; let x = fx;
      g.text('Ø 10 +0.2/0 hole', fx, fy - 30, { size: 12, weight: 700 });
      cells.forEach((c, i) => { g.rect(x, fy - 14, ws[i], 28, { fill: COL.white, hatch: false }); g.text(c, x + ws[i] / 2, fy, { size: 13, weight: 700, align: 'center' }); x += ws[i]; });
      g.text('zone Ø ' + MM.num(zone, 2) + ' mm', fx, fy + 40, { size: 12 }); if (p.mmc && p.h > 0) g.text('(' + MM.num(p.t, 2) + ' + ' + MM.num(p.h, 2) + ' bonus)', fx, fy + 58, { size: 11, color: COL.faint });
      g.text('hole centre ' + MM.num(off, 3) + ' mm off', fx, fy + 80, { size: 12 });
      g.text(ok ? 'PASSES' : 'FAILS', fx, fy + 112, { size: 20, weight: 800, color: ok ? COL.ink : COL.red });
      g.text('(position errors drawn ×600)', fx, fy + 136, { size: 10.5, color: COL.faint });
    },
    readout(a, p) { const zone = p.t + (p.mmc ? p.h : 0); return { big: 'Ø ' + MM.num(zone, 2) + ' mm', small: 'position zone for this hole' + (p.mmc ? ': ' + MM.num(p.t, 2) + ' stated + ' + MM.num(p.h, 2) + ' bonus because the hole is bigger than its smallest size' : ', the same at any hole size') }; },
    panels: [{
      id: 'symbols', title: 'The GD&T symbols',
      intro: 'Fourteen controls in five families. Every one sits in a feature control frame on the drawing.',
      html: () => chartHTML()
    }, {
      id: 'practice', title: 'Practice: complete the drawing',
      intro: 'The numbers are filled in. Read what the part has to do, then put the right symbol, modifier or datum letter in each empty box and check your answers.',
      html: () => '', init: body => practice(body)
    }, {
      id: 'callouts', title: 'Hole and thread callouts',
      html: () => `<div class="tablewrap"><table class="btable"><thead><tr><th>Callout</th><th>Meaning</th></tr></thead><tbody>
        <tr><td>Ø6.6 THRU</td><td>A 6.6 mm hole right through</td></tr>
        <tr><td>Ø6.6 THRU ⌴ Ø11 ↧ 6.4</td><td>Counterbored: Ø11 mm, 6.4 mm deep</td></tr>
        <tr><td>Ø6.6 THRU ⌵ Ø13.8 × 90°</td><td>Countersunk: Ø13.8 mm at 90°</td></tr>
        <tr><td>M6 × 1 – 6H ↧ 12</td><td>Metric thread, coarse pitch 1 mm, standard fit, 12 mm of full thread</td></tr>
        <tr><td>1/4-20 UNC-2B</td><td>Inch thread, 20 threads per inch, coarse, standard internal fit</td></tr>
        <tr><td>Ø10 H7</td><td>A 10 mm hole to fit H7 (+0 / +0.015)</td></tr>
        <tr><td>2× R3</td><td>Two places, radius 3</td></tr></tbody></table></div>`
    }, {
      id: 'checklist', title: 'A drawing a shop can quote',
      html: () => `<ul class="rules"><li><b>Title block:</b> part name and number, revision, material (with grade and temper), finish, quantity, units, projection symbol (first or third angle), general tolerance note, scale, your name and date.</li>
        <li><b>Views:</b> enough to show every feature clearly; add a section through hidden features rather than many dashed lines. Add an isometric view for clarity.</li>
        <li><b>Dimensions:</b> from the faces that matter (the datums), each feature dimensioned once. Do not dimension the same thing two ways.</li>
        <li><b>Tolerances:</b> tight only where parts fit together; everything else by the general note.</li>
        <li><b>Edges:</b> a note like "Break all sharp edges 0.2 to 0.5 mm" saves questions.</li>
        <li><b>Send the 3D model too</b> (STEP), but say which one rules if they disagree: usually the drawing.</li></ul>`
    }, {
      id: 'projection', title: 'First and third angle projection',
      html: () => `<ul class="rules"><li><b>Third angle</b> (US, Canada): the top view is drawn above the front view, and the right side view to the right of it, as if you unfolded a glass box.</li>
        <li><b>First angle</b> (most of Europe and Asia, ISO default): the views are swapped: the top view goes below the front view, and the right side view to the left.</li>
        <li>The truncated-cone symbol in the title block says which is used. Misreading it mirrors your part, so always check it.</li></ul>`
    }]
  });
})();
