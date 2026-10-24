/* Mechanical Notebook: living hinge (flexure) generator. MIT licence.
   Makes cut patterns that let a stiff sheet bend. The patterns follow tested lattice hinges: straight lattice,
   meander, torsion (H) links, wave lattice, cross lattice, fillet lattice, diamonds and beehive.
   Output a test piece, the pattern on its own (to paste into your own drawing), or a test sheet of several versions.
   The patterns themselves come from js/hinge-pattern.js, which the fabrication pages use too.
   The bend estimate is a rough torsion model: each spring (the strip between two neighbouring cuts) can twist about
   strain × spring length ÷ spring width before it cracks, and the springs across the hinge add up. */
(function () {
  const G = window.GEN, H = window.MN_HINGE, f = (v, d) => (+v).toFixed(d == null ? 1 : d).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
  const DEG = 180 / Math.PI;

  /* each pattern: name, how it behaves (from the tested hinges), a factor for the bend estimate, and its fields:
     [setting key, pattern parameter, label, help] */
  const PAT = {
    straight: { name: 'Straight lattice', short: 'Straight', k: 1, rate: 'Reliable',
      about: 'Rows of straight slits, each row shifted half a step (also called brick or offset). The most common lattice hinge and the most reliable. It bends by twisting the springs between the slits. The bend depends on the slit length, the spring width and the sheet thickness.',
      fields: [['sL', 'L', 'Cut length', 'Longer cuts make longer springs, which bend further.'], ['sg', 'g', 'Bridge', 'Uncut material between two cuts in a row. Bigger is stiffer and stronger.'], ['sd', 'd', 'Spring width', 'Distance between rows of cuts. Narrow springs bend more but are more fragile.']] },
    meander: { name: 'Meander', short: 'Meander', k: 1.3, rate: 'Very flexible',
      about: 'Slots cut alternately from the top and the bottom edge leave one long zig-zag spring. Easy to design and very flexible along a strip, but weak if pulled. The cuts must reach the edges.',
      fields: [['mg', 'g', 'End bridge', 'Material left where a slot stops short of the edge.'], ['md', 'd', 'Strip width', 'Distance between slots: the width of the zig-zag strip.']] },
    torsion: { name: 'Torsion links', short: 'Torsion', k: 1.2, rate: 'Very flexible',
      about: 'H-shaped cuts in columns leave short bars that twist. Very flexible for its size. A shorter link length (more H shapes in each column) makes it stiffer; more columns make it bend further.',
      fields: [['tL', 'L', 'Link length', 'Length of each H. Longer links twist more easily.'], ['tg', 'g', 'Bridge', 'Material between two H shapes in a column.'], ['tc', 'd', 'Column pitch', 'Width of each column of H shapes.'], ['tb', 'bar', 'Torsion bar', 'Width of the bars between columns, the parts that twist.']] },
    wave: { name: 'Wave lattice', short: 'Wave', k: 1.6, rate: 'Flexible',
      about: 'Each cut runs straight, curves over by about one row, runs on, then curves back, so all the cuts nest like waves. In testing it bent in one direction well for such short springs, but not in two directions.',
      fields: [['wL', 'L', 'Cut length', ''], ['wg', 'g', 'Bridge', 'Gap between two cuts in a row. The gaps are staggered on every other row.'], ['wd', 'd', 'Spring width', 'Distance between neighbouring cuts.'], ['wa', 'amp', 'Wave depth', 'How far each cut curves over. About one spring width looks like the classic wave lattice.']] },
    cross: { name: 'Cross lattice', short: 'Cross', k: 1.6, rate: 'Most flexible',
      about: 'Slits with a fork at each end (>—<). In testing this was the most flexible lattice. In thin sheet it can even bend a little on a diagonal.',
      fields: [['cL', 'L', 'Cut length', ''], ['cg', 'g', 'Bridge', 'Must leave room for the forks of the cuts above and below.'], ['cd', 'd', 'Spring width', ''], ['cf', 'fork', 'Fork size', 'How far each fork reaches sideways.']] },
    fillet: { name: 'Fillet lattice', short: 'Fillet', k: 1.4, rate: 'Flexible, strong',
      about: 'Closed cut-outs with round ends and a narrow waist. Sharp corners are where a spring breaks; rounding them spreads the twisting stress more evenly along the spring.',
      fields: [['fL', 'L', 'Cut-out length', ''], ['fg', 'g', 'Bridge', ''], ['fd', 'd', 'Row spacing', ''], ['fb', 'dw', 'Bulb width', 'Width of the round ends.'], ['fn', 'neck', 'Waist width', 'Width of the narrow middle.']] },
    diamond: { name: 'Diamonds', short: 'Diamond', k: 0.9, rate: 'Decorative, stretches',
      about: 'Closed diamond cut-outs. Decorative, stretches a little and can follow a gentle double curve, but stiffer than slits of the same size.',
      fields: [['dL', 'L', 'Diamond length', ''], ['dw', 'dw', 'Diamond width', ''], ['dg', 'g', 'Bridge', ''], ['dd', 'd', 'Row spacing', '']] },
    fabric: { name: 'Fabric (Greek key)', short: 'Fabric', k: 1.6, rate: 'Flexible, drapes',
      about: 'Square tiles, each cut as a double square spiral (a Greek key): two arms wind into the centre in opposite directions and meet there, and neighbouring tiles are mirrored. The long spiral strips let the sheet drape like fabric and follow gentle curves. Thin plywood or basswood works best.',
      fields: [['ftile', 'tile', 'Tile size', 'Each square holds one double spiral.'], ['farm', 'arm', 'Spiral width', 'Width of the strip between the two spiral arms, and between tiles.']] },
    hive: { name: 'Beehive', short: 'Beehive', k: 1, rate: 'Least flexible',
      about: 'Closed hexagons. It looks like it should bend in two directions, but in testing it was the least flexible lattice of all: the springs between the cells are very short. Use it as a decorative panel.',
      fields: [['hs', 'hs', 'Cell size', 'Across the flats of each hexagon.'], ['hw', 'hw', 'Wall width', 'Material between neighbouring cells.']] }
  };
  /* materials: how much twist they take before cracking (shear strain), the thinnest strip that survives, and a note */
  const MAT = {
    basswood: ['Basswood', 0.03, 0.6, 'Excellent flexibility and very forgiving.'],
    birch: ['Birch plywood', 0.02, 0.8, 'Works well, but grain direction matters: bend across the grain of the face layer.'],
    mdf: ['MDF', 0.013, 1, 'Consistent results, but more fragile if bent too far.'],
    acrylic: ['Cast acrylic', 0.01, 1.5, 'Needs wide patterns and gentle bends. Less flexible than wood and it snaps if stressed too far. Avoid extruded acrylic.'],
    card: ['Card or chipboard', 0.04, 1, 'Bends easily; cut cleanly at low power.'],
    other: ['Other', 0.015, 0.8, 'Use a test sheet to find what works.']
  };
  const params = (S, over) => {
    const P = { pat: S.pat, W: S.W, H: S.H, cut: S.cut, sw: S.sw, open: S.pat === 'meander' ? 1 : S.open };
    PAT[S.pat].fields.forEach(([key, p]) => P[p] = S[key]);
    if (S.pat === 'meander') P.L = 0;
    return Object.assign(P, over || {});
  };
  const cutW = S => S.cut === 'slot' && !['fillet', 'diamond', 'hive'].includes(S.pat) ? S.sw + S.kerf : S.kerf;
  const LINEPAT = S => !['fillet', 'diamond', 'hive'].includes(S.pat);
  const keyOf = (S, p) => (PAT[S.pat].fields.find(x => x[1] === p) || [])[0];
  const vals = S => String(S.vals).split(/[,;\s]+/).map(Number).filter(v => isFinite(v) && v > 0).slice(0, 12);
  const VARY = { L: 'Length', g: 'Bridge', d: 'Spacing', x: 'Detail' };
  const EXTRA = { fabric: 'arm', wave: 'amp', cross: 'fork', fillet: 'dw', diamond: 'dw', torsion: 'bar', hive: 'hw', straight: 'd', meander: 'd' };
  const varyParam = S => S.vary === 'x' ? EXTRA[S.pat] : S.pat === 'hive' ? (S.vary === 'L' ? 'hs' : 'hw') : (S.pat === 'meander' && S.vary === 'L') ? 'g' : S.vary;
  const shift = (cuts, dx, dy) => cuts.map(c => ({ pts: c.pts.map(([x, y]) => [x + dx, y + dy]), closed: c.closed }));
  const tag = (S, P) => PAT[S.pat].fields.map(([, p, l]) => l[0] + f(P[p])).join(' ');

  /* the estimate: how far it bends before the springs crack, and the curve radius at the target angle */
  function bend(S, P) {
    const m = MAT[S.mat] || MAT.other, sp = H.springs(P), w = sp.w - cutW(S), c = Math.max(0.05, Math.min(w, S.thick));
    const phi = m[1] * sp.len / c, max = sp.n * phi * PAT[S.pat].k * DEG;
    return { max: Math.max(0, max), len: sp.len, w, n: sp.n };
  }

  // a test piece: solid ends either side of the hinge area, with the settings engraved on the left end
  function piece(S, P, y0, name, label) {
    const r = H.make(P), E = S.ends, W = P.W;
    const part = { name, role: 'piece', thickness: S.thick, shapes: [{ outer: [[-E, y0], [W + E, y0], [W + E, y0 + P.H], [-E, y0 + P.H]] }], cuts: shift(r.cuts, 0, y0), stat: r };
    if (S.engr && E > 6) {
      const room = E - 4, hh = Math.min(3.5, P.H * 0.3, room / (label.length * 5 / 6));
      if (hh >= 1.6) part.etch = G.strokeText(label, -E + 2, y0 + P.H / 2 - hh / 2, hh);
    }
    return part;
  }
  function parts(S) {
    const P = params(S);
    if (S.out === 'pattern') {
      const r = H.make(P), out = [{ name: 'Hinge pattern', role: 'piece', shapes: [], cuts: r.cuts, stat: r }];
      if (S.guide) out.push({ name: 'HINGE_AREA (do not cut)', shapes: [], lines: [[[0, 0], [P.W, 0], [P.W, P.H], [0, P.H], [0, 0]]], guideLines: true, noexp: true, color: '#00a050', layerColor: 3 });
      return out;
    }
    if (S.out === 'sheet') {
      const vs = vals(S), vp = varyParam(S); let y = 0; const out = [];
      const letter = (PAT[S.pat].fields.find(x => x[1] === vp) || [, , vp])[2][0];
      vs.forEach((v, i) => { const Pi = params(S, { [vp]: v }); out.push(piece(S, Pi, -y - Pi.H, 'Test piece ' + (i + 1), letter + f(v))); y += Pi.H + 4; });
      return out.length ? out : [piece(S, P, 0, 'Test piece', tag(S, P))];
    }
    return [piece(S, P, 0, 'Test piece', tag(S, P))];
  }

  /* the picker thumbnails are drawn from the real pattern code, so each one looks like the pattern it makes */
  const ICONP = { straight: { L: 11, g: 3, d: 5 }, meander: { g: 4, d: 5.5 }, torsion: { L: 13, g: 3, d: 11, bar: 3 }, wave: { L: 30, g: 3, d: 4, amp: 4 },
    cross: { L: 11, g: 7, d: 6.5, fork: 2.6 }, fillet: { L: 12, g: 2.5, d: 7, dw: 4.6, neck: 1.6 }, diamond: { L: 12, g: 2.5, d: 6.5, dw: 4.2 }, fabric: { tile: 14, arm: 2.3 }, hive: { hs: 8, hw: 2 } };
  const icon = Object.fromEntries(Object.keys(PAT).map(k => {
    const r = H.make(Object.assign({ pat: k, W: 44, H: 28, cut: 'line', open: 1, e: 0 }, ICONP[k]));
    const d = r.cuts.map(c => 'M' + c.pts.map(([x, y]) => (2 + x).toFixed(1) + ' ' + (30 - y).toFixed(1)).join('L') + (c.closed ? 'Z' : '')).join('');
    return [k, `<rect x="2" y="2" width="44" height="28" rx="1.5" stroke-width="0.8" opacity=".45"/><path d="${d}" stroke-width="1.1"/>`];
  }));


  /* the smallest and largest values that can be cut at all: a cut wider than the strip next to it would cut it away */
  const LIM = 0.3;   // the thinnest strip we let anyone draw, in mm, after the kerf
  const mins = {
    d: S => { const P = params(S), extra = S.pat === 'cross' ? P.fork : S.pat === 'fillet' ? P.dw : S.pat === 'diamond' ? P.dw / 2 : S.pat === 'torsion' ? P.bar : 0; return +(cutW(S) + LIM + extra).toFixed(2); },
    g: S => +(cutW(S) + LIM).toFixed(2),
    bar: S => +(cutW(S) + LIM).toFixed(2), hw: S => +(cutW(S) + LIM).toFixed(2), arm: S => +(cutW(S) + LIM).toFixed(2), tile: S => +(6 * S.farm).toFixed(1)
  };
  const maxs = {
    amp: S => +(4 * S.wd).toFixed(2), tile: 200, fork: S => +Math.max(0, S.cd - cutW(S) - LIM).toFixed(2),
    dw: S => +Math.max(0.2, (S.pat === 'fillet' ? S.fd : 2 * S.dd) - cutW(S) - LIM).toFixed(2), neck: S => +Math.max(0.1, S.fb - 0.2).toFixed(2), bar: S => +Math.max(0.2, S.tc - cutW(S) - LIM).toFixed(2)
  };
  const WHY = { tile: 'a tile needs room for a full turn of each spiral arm', arm: 'the strip would be cut away', d: 'any closer and the cuts would meet', g: 'any shorter and the cuts would meet', bar: 'the bar would be cut away', hw: 'the wall would be cut away',
    amp: 'a bigger step would run into the next row', fork: 'bigger forks would run into the next row', dw: 'wider cut-outs would run into the next row', neck: 'the waist must be narrower than the bulbs' };

  G.create({
    id: 'hinges', formats: ['svg', 'dxf'], title: 'Living hinge generator', subtitle: 'Cut patterns that let a flat, stiff sheet bend. Export a test piece, a test sheet, or just the pattern to paste into your own drawing.',
    defaults: {
      pat: 'straight', out: 'piece', W: 40, H: 60, open: 1, mat: 'birch', thick: 3, ang: 90,
      sL: 20, sg: 3, sd: 1.6, mg: 3, md: 3, tL: 10, tg: 2.5, tc: 5, tb: 1.2, wL: 24, wg: 3, wd: 2.4, wa: 2.4, ftile: 14, farm: 1.6,
      cL: 16, cg: 4, cd: 2, cf: 0.8, fL: 16, fg: 2, fd: 3.2, fb: 2.2, fn: 0.8, dL: 14, dg: 2, dd: 2.6, dw: 2, hs: 6, hw: 1.2,
      cut: 'line', sw: 0.5, kerf: 0.15, ends: 25, engr: 1, vary: 'L', vals: '10, 15, 20, 30', guide: 1,
      grid: 1, guides: 1, labels: 1, rpm: 0
    },
    panel(ui) {
      ui.section('What to make', () => {
        ui.seg('out', 'Output', [['piece', 'Test piece'], ['pattern', 'Pattern only'], ['sheet', 'Test sheet']], { refit: 1 });
        ui.note('', { live: S => S.out === 'pattern' ? 'Just the cuts, with the hinge area outline on its own layer. Paste them into your own drawing over the place that should bend.' : S.out === 'sheet' ? 'Several test pieces, each changing one size. Cut them all, bend them, and keep the one that feels right.' : 'A strip with solid ends and the hinge in the middle, with its settings engraved on it.' });
      });
      ui.section('Pattern', () => {
        ui.pick('pat', 'Pattern', Object.keys(PAT).map(k => [k, PAT[k].short, icon[k]]), { tips: Object.fromEntries(Object.keys(PAT).map(k => [k, PAT[k].rate])) });
        ui.note('', { live: S => `<b>${PAT[S.pat].name} · ${PAT[S.pat].rate}.</b> ${PAT[S.pat].about}` });
      });
      ui.section('Material', () => {
        ui.select('mat', 'Sheet', Object.entries(MAT).map(([k, m]) => [k, m[0]]));
        ui.num('thick', 'Thickness', { unit: 'mm', min: 0.3, max: 25, step: 0.1, help: 'Thinner sheet bends much more easily. Living hinges are far easier in 3 mm (1/8") than in thicker stock.' });
        ui.num('ang', 'Bend it needs to make', { unit: '°', min: 5, max: 360, step: 5, help: 'How far the finished part has to fold. The design is flagged if it would crack before getting there.' });
        ui.note('', { live: S => MAT[S.mat][3] });
      });
      ui.section('Hinge area', () => {
        ui.num('W', 'Bend width', { unit: 'mm', min: S => +(2 * params(S).d || 2).toFixed(1), max: 2000, step: 1, why: 'the hinge needs at least two rows of cuts', help: 'Across the fold. A wider hinge spreads the bend over more springs, so it bends further.' });
        ui.num('H', 'Hinge length', { unit: 'mm', min: 4, max: 2000, step: 1, help: 'Along the fold line. Usually the full height of the part.' });
        ui.check('open', 'Cuts run out through the top and bottom edges', { show: S => S.pat !== 'meander' });
      });
      ui.section('Pattern sizes', () => {
        Object.keys(PAT).forEach(pk => PAT[pk].fields.forEach(([key, p, label, help]) => {
          const o = { unit: 'mm', step: 0.1, max: 500, show: S => S.pat === pk, help: help || undefined, why: WHY[p] };
          o.min = mins[p] || (p === 'L' ? (S => +Math.max(1, (S.pat === 'cross' ? 2 * S.cf : 0) + 1).toFixed(1)) : p === 'hs' ? 1 : 0.2);
          if (maxs[p]) o.max = maxs[p];
          ui.num(key, label, o);
        }));
        ui.note('', { live: S => { const b = bend(S, params(S)); return `Each spring is about <b>${f(b.len)} mm long</b> and <b>${f(Math.max(0, b.w), 2)} mm wide</b> after the kerf, with ${b.n} across the bend.`; } });
      });
      ui.section('Cutting', () => {
        ui.seg('cut', 'Cut each slit as', [['line', 'Single line'], ['slot', 'Closed slot']]);
        ui.num('sw', 'Slot width', { unit: 'mm', min: 0.1, max: 10, step: 0.05, show: S => S.cut === 'slot' && !['fillet', 'diamond', 'hive'].includes(S.pat), help: 'For a CNC router, use your cutter diameter.' });
        ui.note('A laser cuts a single line in one pass, and the beam width (kerf) makes the gap. That is the best choice for a laser. Use closed slots for a CNC router, or when you want a wider gap.', { show: S => !['fillet', 'diamond', 'hive'].includes(S.pat) });
        ui.num('kerf', 'Kerf', { unit: 'mm', min: 0, max: 2, step: 0.01, help: 'Width your laser burns away. Used to check that the strips left between cuts survive.' });
      });
      ui.section('Test piece', () => {
        ui.num('ends', 'Solid ends', { unit: 'mm', min: 0, max: 500, step: 1, help: 'Plain material either side of the hinge, to hold while bending.' });
        ui.check('engr', 'Engrave the settings on each piece');
        ui.note('The letters are the first letter of each size (C = cut length, B = bridge, S = spring width…). Engraving is on its own blue layer.');
      }, { show: S => S.out !== 'pattern' });
      ui.section('Test sheet', () => {
        ui.seg('vary', 'Change', Object.entries(VARY).map(([k, v]) => [k, v]));
        ui.custom((el, api) => {
          el.innerHTML = '<div class="gfld"><label for="hvals">Values</label><div class="gin"><input type="text" id="hvals" inputmode="decimal" spellcheck="false"><span>mm</span></div><p class="ghelp">Separate with commas. One piece is made for each value, everything else stays the same.</p></div>';
          const inp = el.querySelector('input'); inp.value = api.S.vals;
          inp.oninput = () => { api.S.vals = inp.value; api.changed(); };
          api.listen(() => { if (document.activeElement !== inp) inp.value = api.S.vals; });
        });
        ui.note('', { live: S => 'Changing: <b>' + ((PAT[S.pat].fields.find(x => x[1] === varyParam(S)) || [, , 'spacing'])[2]).toLowerCase() + '</b>.' });
      }, { show: S => S.out === 'sheet' });
      ui.section('Pattern only', () => {
        ui.check('guide', 'Include the hinge area outline (green layer, do not cut)');
        ui.note('Units are millimetres. Line it up with the place on your part that should bend, then delete the green outline or turn its layer off.');
      }, { show: S => S.out === 'pattern' });
    },
    model(S) {
      const P = parts(S);
      return {
        parts: P,
        guides(d) {
          if (!d.labels()) return;
          const p = P[0], y0 = p.shapes && p.shapes.length ? p.shapes[0].outer[0][1] : 0;
          if (S.out !== 'sheet') {
            d.dim([0, y0 + S.H], [S.W, y0 + S.H], `bend width ${f(S.W)}`, 26);
            d.dim([S.W + (S.out === 'pattern' ? 0 : S.ends), y0], [S.W + (S.out === 'pattern' ? 0 : S.ends), y0 + S.H], `${f(S.H)}`, -26);
          }
          if (S.out === 'piece' && d.guides()) d.path([[0, y0], [S.W, y0], [S.W, y0 + S.H], [0, y0 + S.H]], { close: true, dash: [6, 4], w: 0.8 });
        }
      };
    },
    exportParts: S => parts(S),
    info(S) {
      const P = params(S), all = parts(S), cw = cutW(S), m = MAT[S.mat] || MAT.other, b = bend(S, P);
      const web = H.web(P) - cw, bridge = (S.pat === 'hive' ? P.hw : S.pat === 'fabric' ? P.arm : P.g) - cw, len = all.reduce((s, p) => s + (p.stat ? p.stat.len : 0), 0), n = all.reduce((s, p) => s + (p.stat ? p.stat.n : 0), 0);
      const K = p => keyOf(S, p), sizeKeys = [K('L'), K('d'), K('hs'), K('hw'), K('tile'), K('arm'), 'W'].filter(Boolean);
      const rate = b.max < 45 ? 'Very stiff' : b.max < 90 ? 'Stiff' : b.max < 180 ? 'Flexible' : 'Very flexible';
      const rows = [
        ['Flexibility', `${rate} · bends about ${f(Math.min(b.max, 999), 0)}° before cracking`, b.max < S.ang ? 'soft' : 0],
        ['Curve radius at ' + f(S.ang, 0) + '°', `about ${f(S.W / (S.ang / DEG), 0)} mm`],
        ['Thinnest strip left', `${f(Math.max(0, web), 2)} mm`, web < m[2] ? 'soft' : 0],
        ['Cuts', `${n} · ${len > 1000 ? f(len / 1000, 2) + ' m' : f(len, 0) + ' mm'} of cutting`]
      ];
      const wKeys = [K('d'), K('amp'), K('fork'), K('dw'), K('bar'), K('hw'), K('arm'), 'kerf', S.cut === 'slot' ? 'sw' : null].filter(Boolean);
      if (web <= 0.05) rows.push(['Cuts overlap', 'The cuts touch or cross, so pieces will fall out. Widen the spacing or make the cut shapes smaller.', 'block', wKeys]);
      else if (web < LIM) rows.push(['Strips burn away', `Only ${f(web, 2)} mm is left between cuts after the kerf. The laser will burn straight through it.`, 'block', wKeys]);
      else if (web < m[2]) rows.push(['Fragile strips', `${f(web, 2)} mm between cuts is thinner than the ${f(m[2], 1)} mm that ${m[0].toLowerCase()} needs. It may snap when you bend it. Widen the spacing.`, 2, wKeys]);
      if (S.pat !== 'meander' || S.mg) {
        if (bridge < LIM) rows.push(['Bridges burn away', `The bridges are ${f(Math.max(0, bridge), 2)} mm after the kerf, so the piece falls apart.`, 'block', [K('g') || K('hw') || K('arm'), 'kerf']]);
        else if (bridge < 0.8) rows.push(['Short bridges', `The bridges are ${f(bridge, 2)} mm after the kerf. Below about 1 mm they snap when you bend it.`, 2, [K('g') || K('hw') || K('arm')]]);
      }
      if (b.max < S.ang * 0.75) rows.push(['Too stiff to bend ' + f(S.ang, 0) + '°', `It will probably crack at about ${f(b.max, 0)}°. Use longer cuts, a wider bend area, narrower springs, a more flexible pattern or thinner sheet.`, 'block', sizeKeys.concat(['thick', 'ang'])]);
      else if (b.max < S.ang) rows.push(['Close to its limit', `It should just reach ${f(S.ang, 0)}° (about ${f(b.max, 0)}° before cracking). Bend it slowly, or make it a little more flexible.`, 2, sizeKeys.concat(['ang'])]);
      if (S.mat === 'acrylic' && S.W / (S.ang / DEG) < 15 * S.thick) rows.push(['Tight bend for acrylic', 'Acrylic snaps if bent tightly. Make the bend area wider for a gentler curve.', 2, ['W', 'ang']]);
      if (S.thick > 6) rows.push(['Thick sheet', 'Hinges are much easier in thin sheet (about 3 mm). Thick sheet needs very long cuts.', 'soft', ['thick']]);
      if (S.out === 'sheet' && !vals(S).length) rows.push(['No values', 'Type some values for the test sheet, separated by commas.', 'block']);
      return rows;
    },
    fileTag: S => `${S.pat}-${f(S.W)}x${f(S.H)}${S.out === 'sheet' ? '-test-sheet' : S.out === 'pattern' ? '-pattern' : ''}`
  });
})();
