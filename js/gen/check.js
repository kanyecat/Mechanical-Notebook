/* Check my design: a list of checks, each marked ✓ (passes) or ✗ (needs a look), shown before you export.
   Two kinds: the design's own rules (the same rules the generator already warns about, listed by name so you can see
   what was checked) and checks on the actual shapes that will be cut or printed (hole sizes, material around holes, overlaps, sheet size). */
(function () {
  const G = window.GEN = window.GEN || {};
  const f = (n, d) => (+n).toFixed(d == null ? 1 : d).replace(/\.0+$/, '');
  const mode = S => S.mode || 'pair';

  /* Rules by generator. Each is [name shown, pattern matching the label of a problem row from info(S), applies(S)]. */
  const RULES = {
    gears: [
      ['Teeth stay in contact (contact ratio 1.2 or more)', /^Contact ratio/, S => mode(S) === 'pair' && S.type !== 'rack'],
      ['No undercut at the tooth roots', /^Undercut/, S => ['pair', 'bevel', 'worm'].includes(mode(S))],
      ['Teeth are not pointed', /^Pointed teeth/, S => ['pair', 'bevel'].includes(mode(S))],
      ['Ring gear is large enough for the pinion', /^Ring too small/, S => mode(S) === 'pair' && S.type === 'int'],
      ['Bores leave room in the gear body', /^(Bore|Worm bore|Wheel bore)/, () => true],
      ['Bevel face width is within a third of the cone distance', /^Face too wide/, S => mode(S) === 'bevel'],
      ['Bevel cone is not nearly flat', /^Nearly flat cone/, S => mode(S) === 'bevel'],
      ['Wheel has more teeth than the worm has starts', /^Too many starts/, S => mode(S) === 'worm']
    ],
    cams: [
      ['Pressure angle is within limits', /pressure angle/i, S => S.ftype !== 'flat'],
      ['Roller does not undercut the cam', /^Undercut/, S => S.ftype === 'roller' || S.ftype === 'swing'],
      ['Flat follower can follow the motion (no cusp)', /^Cusp/, S => S.ftype === 'flat'],
      ['Motion steps add up to 360°', /^Program length/, () => true],
      ['Motion program closes (no step in the cam)', /does not close/, () => true],
      ['No constant-velocity jolts', /^Constant velocity/, () => true],
      ['Bore leaves material to the cam edge', /^Bore/, () => true]
    ],
    linkages: [
      ['Mechanism can move (no floppy or jammed links)', /^Check the structure/, S => S.kind === 'multi'],
      ['Reference points sit on the same link', /^Point /, S => S.kind === 'multi'],
      ['Crank can turn fully', /^Crank/, S => S.kind === 'slider'],
      ['Rod is at least 2.5 × the crank (smooth motion)', /^Rod ÷ crank/, S => S.kind === 'slider'],
      ['Transmission angle stays between 40° and 140°', /^Transmission angle/, S => S.kind !== 'slider' && S.kind !== 'multi'],
      ['Holes leave at least 1 mm around them', /^Holes too big/, () => true]
    ],
    pulleys: [
      ['Load can be lifted with the line available', /^Cannot lift/, S => S.mode === 'lift'],
      ['Rope stays within its safe working load', /^Rope overloaded/, S => S.mode === 'lift'],
      ['Motor is strong enough for the loads', /^Motor too weak/, S => S.mode !== 'lift'],
      ['Belts do not slip', /slips on/, S => S.mode !== 'lift']
    ],
    chains: [
      ['Every sprocket engages at least 3 teeth', /engages/, () => true],
      ['Chain length fits the layout (not too tight)', /is tight$/, () => true]
    ],
    hinges: [
      ['Cuts do not touch or cross', /^Cuts overlap/, () => true],
      ['Strips between cuts survive the kerf (0.6 mm or more)', /^Strips too thin/, () => true],
      ['Bridges are long enough not to snap (about 1 mm)', /^Bridges too short/, () => true],
      ['Test sheet has values to cut', /^No values/, S => S.out === 'sheet']
    ]
  };

  /* ---------- geometry helpers ---------- */
  const dseg = (p, a, b) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy; let t = L ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L : 0; t = Math.max(0, Math.min(1, t));
    return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
  };
  const dpoly = (p, poly) => { let m = 1e9; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) m = Math.min(m, dseg(p, poly[j], poly[i])); return m; };
  const bb = pts => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; pts.forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }); return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 }; };
  const list = (a, n) => a.slice(0, n || 3).join(', ') + (a.length > (n || 3) ? ` and ${a.length - (n || 3)} more` : '');

  /* holes of a part as { d (diameter or smallest width), c (centre), pts, r } */
  function holesOf(p) {
    const out = [];
    (p.shapes || []).forEach(s => {
      (s.circles || []).forEach(c => out.push({ d: 2 * c.r, c: [c.x, c.y], r: c.r, s }));
      (s.holes || []).forEach(h => { const b = bb(h); out.push({ d: Math.min(b.w, b.h), c: [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2], pts: h, s }); });
    });
    return out;
  }
  /* smallest wall of material between holes and the outline (and between neighbouring holes) */
  function thinnest(p) {
    let worst = { w: 1e9, what: '' };
    (p.shapes || []).forEach(s => {
      const hs = []; (s.circles || []).forEach(c => hs.push({ c: [c.x, c.y], r: c.r })); (s.holes || []).forEach(h => hs.push({ pts: h }));
      hs.forEach((h, i) => {
        let w;
        if (h.r != null) w = dpoly(h.c, s.outer) - h.r; else { w = 1e9; const step = Math.max(1, Math.floor(h.pts.length / 48)); for (let k = 0; k < h.pts.length; k += step) w = Math.min(w, dpoly(h.pts[k], s.outer)); }
        if (w < worst.w) worst = { w, what: 'a hole near the edge' };
        if (hs.length <= 40) for (let j = i + 1; j < hs.length; j++) {
          const g = hs[j]; let v;
          if (h.r != null && g.r != null) v = Math.hypot(h.c[0] - g.c[0], h.c[1] - g.c[1]) - h.r - g.r;
          else if (h.r != null) v = dpoly(h.c, g.pts) - h.r;
          else if (g.r != null) v = dpoly(g.c, h.pts) - g.r;
          else { v = 1e9; const st = Math.max(1, Math.floor(h.pts.length / 32)); for (let k = 0; k < h.pts.length; k += st) v = Math.min(v, dpoly(h.pts[k], g.pts)); }
          if (v < worst.w) worst = { w: v, what: 'two holes close together' };
        }
      });
    });
    return worst;
  }

  /* ---------- the checks ---------- */
  /* opts: { format: 'svg' | 'dxf' | 'stl' | null, layout, exported (parts as they will be written), bed: [w, h] } */
  G.checkDesign = function (def, S, opts) {
    opts = opts || {}; const fmt = opts.format || null, items = [];
    const add = (group, ok, label, detail, block) => items.push({ group, ok, label, detail: detail || '', block: !ok && !!block });
    const guard = (group, label, fn) => { try { fn(); } catch (e) { console.error(e); add(group, false, label, 'This check could not be run.'); } };
    const flat = (def.exportParts ? def.exportParts(S, 'flat') : def.model(S, 0).parts).filter(p => ((p.shapes && p.shapes.length) || (p.cuts && p.cuts.length)) && !p.noexp);

    /* 1 · the design's own rules */
    guard('Design rules', 'Design rules', () => {
      const rows = def.info(S), probs = rows.filter(r => r[2] && r[2] !== 'soft'), used = new Set();
      (RULES[def.id] || []).forEach(([label, rx, applies]) => {
        if (applies && !applies(S)) return;
        const hit = probs.filter(r => rx.test(r[0]));
        hit.forEach(r => used.add(r));
        add('Design rules', !hit.length, label, hit.map(r => r[1] && r[1] !== r[0] ? `${r[0]}: ${r[1]}` : r[0]).join(' · '), hit.some(r => G.severity && G.severity(r) === 'block'));
      });
      probs.filter(r => !used.has(r)).forEach(r => add('Design rules', false, r[0], r[1] === true ? '' : r[1], G.severity && G.severity(r) === 'block'));
      if (!probs.length && !(RULES[def.id] || []).length) add('Design rules', true, 'No problems found by the generator', '');
    });

    /* 2 · the shapes themselves */
    const G2 = 'The parts';
    guard(G2, 'Outlines', () => {
      const bad = flat.filter(p => p.shapes && p.shapes.some(s => !s.outer || s.outer.length < 3 || s.outer.some(q => !isFinite(q[0]) || !isFinite(q[1]))));
      add(G2, !bad.length, 'Every part has a clean, closed outline', bad.length ? 'Check ' + list(bad.map(p => p.name)) : `${flat.length} part${flat.length === 1 ? '' : 's'} checked`);
    });
    guard(G2, 'Small parts', () => {
      const tiny = flat.map(p => { const b = G.bounds([p]); return [p, Math.min(b.x1 - b.x0, b.y1 - b.y0)]; }).filter(x => x[1] < 3);
      add(G2, !tiny.length, 'No part is smaller than 3 mm across', tiny.length ? list(tiny.map(([p, w]) => `${p.name} (${f(w)} mm)`)) : '');
    });
    guard(G2, 'Hole sizes', () => {
      const small = []; let n = 0;
      flat.forEach(p => holesOf(p).forEach(h => { n++; if (h.d < 3 - 1e-6) small.push(`${p.name} (${f(h.d, 1)} mm)`); }));
      add(G2, !small.length, 'Every hole is at least 3 mm across', small.length ? list(small) + '. Small holes close up when cut or printed.' : n ? `${n} hole${n === 1 ? '' : 's'} checked` : 'No holes in this design');
    });
    guard(G2, 'Walls', () => {
      const thin = []; let any = false;
      flat.forEach(p => { if (!holesOf(p).length) return; any = true; const t = thinnest(p); if (t.w < 1 - 1e-6) thin.push(`${p.name} (${f(Math.max(0, t.w), 1)} mm, ${t.what})`); });
      add(G2, !thin.length, 'At least 1 mm of material around every hole', thin.length ? list(thin) + '. Thin walls snap or burn through.' : any ? '' : 'No holes in this design');
    });
    if (fmt === 'stl' || !fmt) guard(G2, 'Thickness', () => {
      const none = flat.filter(p => !(p.thickness > 0));
      if (fmt === 'stl') add(G2, !none.length, 'Every part has a thickness for 3D printing', none.length ? list(none.map(p => p.name)) : '');
    });

    /* 3 · the layout and the sheet */
    const G3 = 'The layout and sheet', P = opts.exported || flat, lay = opts.layout || 'flat', bed = opts.bed || (fmt === 'stl' ? [220, 220] : [600, 400]);
    guard(G3, 'Overlap', () => {
      if (lay === 'nest') { const sk = G._nestStats ? G._nestStats.skipped : 0; add(G3, !sk, 'Every part fits in the nested layout', sk ? `${sk} part${sk === 1 ? ' does' : 's do'} not fit. Allow a wider sheet.` : ''); return; }
      if (lay === 'assembled') return;
      const bs = P.filter(p => ((p.shapes && p.shapes.length) || (p.cuts && p.cuts.length)) && !p.noexp).map(p => [p, G.bounds([p])]), hit = [];
      for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) { const a = bs[i][1], b = bs[j][1]; if (a.x0 < b.x1 - 0.01 && b.x0 < a.x1 - 0.01 && a.y0 < b.y1 - 0.01 && b.y0 < a.y1 - 0.01) hit.push(`${bs[i][0].name} and ${bs[j][0].name}`); }
      add(G3, !hit.length, 'No two parts overlap in the drawing', hit.length ? list(hit, 2) : '');
    });
    guard(G3, 'Size', () => {
      if (fmt === 'stl') {
        const big = flat.map(p => { const b = G.bounds([p]); return [p, b.x1 - b.x0, b.y1 - b.y0]; }).filter(([, w, h]) => !((w <= bed[0] && h <= bed[1]) || (w <= bed[1] && h <= bed[0])));
        add(G3, !big.length, `Every part fits a ${bed[0]} × ${bed[1]} mm print bed`, big.length ? list(big.map(([p, w, h]) => `${p.name} (${f(w, 0)} × ${f(h, 0)} mm)`)) : '');
      } else {
        const b = G.bounds(P.filter(p => ((p.shapes && p.shapes.length) || (p.cuts && p.cuts.length)) && !p.noexp)), w = b.x1 - b.x0, h = b.y1 - b.y0, ok = (w <= bed[0] && h <= bed[1]) || (w <= bed[1] && h <= bed[0]);
        add(G3, ok, `The drawing fits a ${bed[0]} × ${bed[1]} mm sheet`, `Drawing is ${f(w, 0)} × ${f(h, 0)} mm${ok ? '' : '. Try the Nested layout, or split the job.'}`);
      }
    });
    const fails = items.filter(i => !i.ok).length;
    return { items, fails, block: items.filter(i => i.block).length, total: items.length, bed, format: fmt };
  };

  /* the dialog: results are drawn as a list with ✓ or ✗ beside each check */
  G.checkHTML = function (res) {
    const groups = []; res.items.forEach(i => { let g = groups.find(x => x.n === i.group); if (!g) groups.push(g = { n: i.group, a: [] }); g.a.push(i); });
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    return groups.map(g => `<section><h3>${esc(g.n)}</h3><ul class="gc">${g.a.map(i => `<li class="${i.ok ? 'ok' : i.block ? 'no blk' : 'no'}"><span class="mk" aria-hidden="true">${i.ok ? '✓' : '✗'}</span><div><b><span class="sr">${i.ok ? 'Passed: ' : i.block ? 'Will not work: ' : 'Needs attention: '}</span>${esc(i.label)}</b>${i.detail ? `<small>${esc(i.detail)}</small>` : ''}</div></li>`).join('')}</ul></section>`).join('');
  };
})();
