/* Build guide: turns the current design into a make-it checklist: checks, cut list, hardware, fits and assembly steps.
   GEN.buildGuide(def, S) returns HTML for the Build guide dialog. Everything numeric comes from the live design. MIT licence. */
(function () {
  const G = window.GEN, f = (v, d) => (v == null || !isFinite(v)) ? '—' : (+v).toFixed(d == null ? 1 : d).replace(/\.0+$/, '');
  const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const baseName = n => n.replace(/\s+layer\s+\d+\/\d+/i, ' layers').replace(/\s+link\s+\d+$/i, ' links');
  const row = (rows, rx) => rows.find(r => rx.test(String(r[0])));

  // every round hole in the cut parts: [diameter, count]
  function holes(parts) {
    const m = new Map();
    parts.forEach(p => (p.shapes || []).forEach(s => {
      (s.circles || []).forEach(c => { const k = f(2 * c.r, 2); m.set(k, (m.get(k) || 0) + 1); });
      (s.holes || []).forEach(h => {   // a hole that is nearly a circle (keyways are not)
        const b = G.bounds([{ shapes: [{ outer: h }] }]), w = b.x1 - b.x0, ht = b.y1 - b.y0; if (Math.abs(w - ht) < 0.03 * w && h.length > 12 && w < 60) { const k = f(w, 2); m.set(k, (m.get(k) || 0) + 1); }
      });
    }));
    return [...m.entries()].map(([d, n]) => [+d, n]).sort((a, b) => a[0] - b[0]);
  }
  function cutList(parts) {
    const g = new Map();
    parts.filter(p => p.shapes && p.shapes.length).forEach(p => {
      const b = G.bounds([p]), key = baseName(p.name) + '|' + (p.thickness || 0), e = g.get(key) || { name: baseName(p.name), t: p.thickness || 0, n: 0, w: 0, h: 0 };
      e.n++; e.w = Math.max(e.w, b.x1 - b.x0); e.h = Math.max(e.h, b.y1 - b.y0); g.set(key, e);
    });
    return [...g.values()];
  }

  const FITS = `<table class="gt"><thead><tr><th>Process</th><th>Edge offset</th><th>Hole for a shaft</th><th>Spacing between parts</th></tr></thead><tbody>
    <tr><td>Laser cut (acrylic, plywood, card)</td><td>Cut removes about 0.1–0.25 mm. Turn on kerf offset in your laser software, or use a test cut.</td><td>Make the hole 0.1–0.2 mm bigger than the rod for a free spin; the same size for a snug fit.</td><td>At least twice the kerf (the Nested layout uses this).</td></tr>
    <tr><td>3D printing (FDM)</td><td>Printed holes shrink. Check a test print.</td><td>Add 0.2–0.3 mm for a free spin, 0.1 mm for a snug fit.</td><td>Print gears flat on the bed; keep helical teeth unsupported.</td></tr>
    <tr><td>CNC router or mill</td><td>The cutter leaves rounded inside corners. Corners tighter than the cutter radius cannot be cut.</td><td>Cut holes 0.05 mm over; ream if it must be exact.</td><td>Leave room for the tool and for tabs.</td></tr></tbody></table>`;

  // what to do, in order, for each generator and mode
  const STEPS = {
    gears(S, rows) {
      const a = row(rows, /^Centre distance|^Gear centre/), steps = [];
      if (S.mode === 'bevel') {
        const m = row(rows, /^Mounting distance/), l = row(rows, /^Layers/);
        steps.push('Cut every layer. The biggest layer of each gear is the back, the smallest is the front. Match each layer to its listed scale.',
          'Glue each gear as a stack: largest at the back, stepping down to the front. Line up the bore (and keyway) of every layer on a spare shaft while the glue dries.',
          'Sand the steps lightly if you want a smooth cone. The stepped teeth still mesh; sanding only tidies them.',
          `Mount the two shafts so their axes meet at ${f(S.bsig, 0)}°. Each gear's back face sits at its mounting distance${m ? ' (' + m[1] + ')' : ''} from that meeting point.`,
          'Turn by hand. If it binds, move one gear along its shaft a little; bevel gears are set by their axial position, not only their spacing.');
        if (l) steps.push('Layers for this design: ' + l[1] + '.');
      } else if (S.mode === 'worm') {
        const l = row(rows, /^Lead/), L = row(rows, /^Worm layers/);
        steps.push(`Cut the wheel and every worm layer. ${L ? L[1] + '.' : ''}`,
          'Thread the worm layers onto a shaft that has a flat or key, in number order. Each layer is already turned a small step, so the thread forms by itself. Glue or clamp the stack.',
          `Mount the wheel shaft at right angles to the worm shaft, ${a ? a[1] : 'at the centre distance shown'} apart.`,
          'Add a drop of oil. Turn the worm: the wheel advances one tooth per turn for a single start.',
          l ? 'Lead and lead angle: ' + l[1] + '. A shallow angle means the wheel cannot drive the worm.' : '');
      } else if (S.ftype && S.ftype !== 'spur') {
        steps.push('Helical and herringbone gears need their twist, so 3D print them from the STL. The DXF shows the end profile only.',
          'Print flat on the bed with the teeth vertical; no supports are needed for helical teeth.',
          `Mount the shafts ${a ? a[1] : 'at the centre distance shown'} apart. A helical pair pushes sideways along the shafts, so add a thrust washer or bearing.`);
      } else {
        steps.push('Cut all gears from the same sheet so they are the same thickness. Test the mesh in card first.',
          `Fix the shafts exactly ${a ? a[1] : 'at the centre distance shown'} apart. ±0.2 mm is fine for laser-cut gears.`,
          'Put a washer or spacer between gears and the frame so they do not rub. Gears sharing a shaft need a key or a pin to turn together.',
          'Turn by hand. Tight spots mean too little backlash; add 0.1 mm to Backlash and cut again. Loose, rattling gears mean too much.');
      }
      return steps.filter(Boolean);
    },
    linkages(S, rows, parts, hs) {
      const n = hs.reduce((s, h) => s + h[1], 0);
      return [`Cut all links. The design has ${n} pivot holes; each pivot needs a bolt or pin through the stack of links that meet there.`,
        'Use a bolt and a lock nut at each pivot, tightened just until the joint can still swing freely (a nylon-insert nut is ideal). Put a washer between links so they do not rub.',
        'Fix the frame (ground) pivots at the exact spacings shown in the drawing. Mark them with the frame piece as a template.',
        'Turn the crank slowly by hand through a full revolution before adding a motor. Any binding means a link is out of place or the transmission angle is too low.',
        (row(rows, /^Transmission angle/) ? 'Transmission angle in this design: ' + row(rows, /^Transmission angle/)[1] + '. Under about 40° the joint feels stiff and can jam.' : '')].filter(Boolean);
    },
    cams(S, rows) {
      return ['Cut the cam and mount it tightly on its shaft with a key, set screw or pin; a loose cam changes the motion.',
        'Guide the follower so it can only move along its path. A slot, bushing or a pair of rollers works.',
        'Keep the follower pressed on the cam with gravity or a spring. Without it a fast cam throws the follower off.',
        (row(rows, /^Pressure angle|^High pressure/) ? 'Pressure angle: ' + (row(rows, /^Pressure angle/) || row(rows, /^High pressure/))[1] + '. Keep it under about 30° for smooth running.' : ''),
        (row(rows, /^Peak speed/) ? 'Peak follower speed is ' + row(rows, /^Peak speed/)[1] + '; use that to size the follower guide and spring.' : '')].filter(Boolean);
    },
    pulleys(S, rows) {
      const bl = rows.find(r => /length/i.test(r[0]) && /^Belt/.test(r[0])), ma = row(rows, /^Mechanical advantage/);
      if (S.mode === 'lift') return ['Cut the sheaves. Each one needs a groove or flanges so the rope cannot jump off.', 'Rig the rope from the fixed anchor, round each sheave in order, and end at the effort side.',
        ma ? 'Mechanical advantage: ' + ma[1] + ' (before friction). Every extra sheave costs a little extra effort, so the real figure is shown in the results.' : '',
        'Test with a light load first and check the rope and the beam it hangs from can carry the real load.'].filter(Boolean);
      return ['Cut the pulleys with a groove or flange to keep the belt on. Put a key or set screw on each pulley that must turn with its shaft.',
        bl ? `Cut the belt to ${bl[1]}. Join it as a loop with a butt-glued lap joint (flat belt) or buy a closed loop or timing belt of that length.` : 'Cut the belt to the length shown in the results.',
        'Set the shafts at the spacing shown. Make one shaft adjustable so you can tighten the belt.',
        'Tension until the belt does not slip under load but is not guitar-string tight; high tension wears bearings. Idlers add wrap and help grip.'];
    },
    chains(S, rows) {
      const c = rows.find(r => /^Chain \d/.test(r[0]));
      return ['Cut the sprockets, and the plates or rollers if you are cutting your own chain. Sprocket thickness should be a little less than the chain\'s inner width.',
        c ? c[0] + ': ' + c[1] + '. Use a whole, even number of links so you do not need an offset link.' : 'Use a whole, even number of links so you do not need an offset link.',
        'Fit each sprocket to its shaft with a key, pin or set screw. Sprockets on one shaft turn together.',
        'Line the sprockets up in one plane and fit the chain. It should sag a little on its slack side, about 2% of the span.',
        'Add a tensioner (a spring-loaded idler on the slack side) for long runs. Lubricate the chain with light oil.'];
    },
    hinges(S) {
      return [S.out === 'pattern' ? 'Open the pattern file and your own drawing in the same app (Inkscape, Illustrator, LightBurn, or your CAD). Both are in millimetres, so paste the pattern without scaling.' : 'Cut one test piece first, in the same sheet you will use for the real part.',
        S.out === 'pattern' ? 'Line the green hinge area outline up with the place that should bend. The cuts usually run the full height of the part, from edge to edge.' : 'Cut the slits before the outline, so the piece cannot shift while the small cuts are made.',
        S.cut === 'slot' ? 'The slits are closed slots: cut them on the line (no kerf offset), or with a CNC cutter the same size as the slot width.' : 'Cut the slits as single lines (one pass). Do not run an inside or outside kerf offset on them, only on the outline.',
        'Bend slowly by hand, a little at a time. Wood bends best across the grain of the face layer; warm or slightly damp plywood bends further.',
        'If it cracks, make the slits longer, the rows further apart or the bridges shorter. If it is too floppy, do the opposite. A test sheet shows all of these side by side.'];
    }
  };
  const TIPS = {
    gears: 'Tip: gears with a module under about 1 are fragile in laser-cut ply; 2 or more is easier to cut and handle. Bigger modules make bigger, stronger teeth.',
    linkages: 'Tip: laser-cut acrylic links can crack at pivot holes. Keep holes at least their own diameter away from the edge.',
    cams: 'Tip: cut the cam a few percent oversize and sand to the follower contact; surface finish matters more than the last tenth of a millimetre.',
    pulleys: 'Tip: a V-groove grips much better than a flat pulley. Build a groove from three layers: flange, narrow middle, flange.',
    chains: 'Tip: laser-cut chain wears quickly; for real loads use a bought roller chain of the same pitch and cut only the sprockets.',
    hinges: 'Tip: plywood and MDF bend well; acrylic cracks, so use thin acrylic, wide spacing and very long slits, or choose a flexible material. For laser cutting, cut the slits as single lines and let the kerf make the gap.'
  };

  G.buildGuide = function (def, S) {
    const parts = (def.exportParts ? def.exportParts(S, 'flat') : def.model(S, 0).parts).filter(p => p.shapes && p.shapes.length && !p.noexp), rows = def.info(S);
    const probs = rows.filter(r => r[2] && r[2] !== 'soft'), hs = holes(parts), cl = cutList(parts);
    let nest = null; try { G.nest(parts, { gap: 2 }); nest = G._nestStats; } catch (e) { }
    const thick = new Map(); parts.forEach(p => thick.set(p.thickness || 0, (thick.get(p.thickness || 0) || 0) + 1));
    const small = hs.filter(h => h[0] < 3 && h[0] > 0);
    const extra = [];
    if (small.length) extra.push(`Holes under 3 mm (${small.map(h => f(h[0], 1) + ' mm').join(', ')}) are easy to close up with laser kerf or print shrink. Check one before cutting everything.`);
    if (thick.size > 1) extra.push(`This design uses ${thick.size} different thicknesses (${[...thick.keys()].map(t => f(t, 1) + ' mm').join(', ')}). Gather sheet in each.`);
    const check = probs.length ? `<ul class="gl warn">${probs.map(([k, v]) => `<li><b>${esc(k)}</b> ${esc(v)}</li>`).join('')}</ul>` : '<p class="ok">✓ No problems found by the generator.</p>';
    const steps = (STEPS[def.id] ? STEPS[def.id](S, rows, parts, hs) : []);
    const t = n => n ? `${f(n, 1)} mm` : '—';
    return `
    <section><h3>1 · Check before you cut</h3>${check}${extra.length ? `<ul class="gl">${extra.map(e => `<li>${esc(e)}</li>`).join('')}</ul>` : ''}</section>
    <section><h3>2 · What to cut or print</h3>
      <table class="gt"><thead><tr><th>Part</th><th>Qty</th><th>Size (mm)</th><th>Material thickness</th></tr></thead><tbody>${cl.map(c => `<tr><td>${esc(c.name)}</td><td>${c.n}</td><td>${f(c.w, 1)} × ${f(c.h, 1)}</td><td>${t(c.t)}</td></tr>`).join('')}</tbody></table>
      <p>${parts.length} part${parts.length === 1 ? '' : 's'} in total.${nest ? ` Packed with the Nested layout (2 mm gaps) they fit on a sheet of about <b>${Math.ceil(nest.w)} × ${Math.ceil(nest.h)} mm</b>, ${Math.round(nest.use * 100)}% used.` : ''}</p></section>
    <section><h3>3 · Hardware</h3>${hs.length ? `<table class="gt"><thead><tr><th>Hole diameter</th><th>How many</th><th>Suggested use</th></tr></thead><tbody>${hs.map(([d, n]) => `<tr><td>${f(d, 2)} mm</td><td>${n}</td><td>${d >= 12 ? 'A larger shaft or bearing seat' : d >= 5 ? 'A shaft, rod or M' + Math.round(d - 0.2) + ' bolt' : d >= 2.5 ? 'A small bolt or pin (M' + Math.round(d - 0.2) + ')' : 'A pin or fine rod'}</td></tr>`).join('')}</tbody></table>
      <p>Plus washers or spacers where parts meet, lock nuts or retaining rings to hold things on their shafts, and a frame or base to fix the shaft positions.</p>` : '<p>No round holes in this design. Add your own mounting points.</p>'}</section>
    <section><h3>4 · Putting it together</h3><ol class="gl">${steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol></section>
    <section><h3>5 · Fits and tolerances</h3>${FITS}<p>${esc(TIPS[def.id] || '')}</p>
      <p>Always make one test piece first: cut a single part, or the smallest gear in the design, and check that it fits your rod before cutting the whole job.</p></section>`;
  };
})();
