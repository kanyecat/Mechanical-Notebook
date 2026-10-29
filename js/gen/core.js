/* Mechanical Notebook generators: workspace shell (top bar, drawing canvas, inspector, results), animation, save/share/export. MIT licence.
   A generator calls GEN.create({ id, title, defaults, panel(ui, S), model(S, t), info(S), exportParts(S, layout), fileTag(S) }).
     model(S, t) returns { parts: [{ name, shapes, curves, thickness, fill }], guides(d) } in world mm, y up, posed for time t.
     info(S) returns rows [label, value, warn]. Rows with warn = true are listed as problems. */
(function () {
  const G = window.GEN = window.GEN || {};
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  G.LIST = [['gears', 'Gears', 'Spur, ring, rack, bevel and worm gears'], ['linkages', 'Linkages', 'Four-bar, slider-crank, multi-link'], ['cams', 'Cams', 'Motion programs and followers'],
    ['pulleys', 'Pulleys', 'Belt drives and lifting tackle'], ['chains', 'Chains', 'Roller chain and sprockets'], ['hinges', 'Living hinges', 'Cut patterns that let a sheet bend']];
  const ICON = {   // small line icons for the top bar
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
    more: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
    guide: '<path d="M6 3.5h9l3 3v14H6z"/><path d="M9 10h6M9 13.5h6M9 17h4"/>',
    down: '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14"/>',
    chev: '<path d="m7 10 5 5 5-5"/>'
  };
  const ic = (n, cls) => `<svg class="gi${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" aria-hidden="true">${ICON[n]}</svg>`;
  // the colour theme (paper by default here, or blueprint) is shared with the rest of the site: see js/theme.js

  /* how serious a problem row is: 'block' = the design will not work or cannot be made; 'warn' = it works, but is
     fragile or works poorly. Generators can say 'block' themselves; older rules are sorted by their label. */
  const BLOCK = [/^Cannot /, /^Check the structure/, /^Point /, /too big/i, /^Ring too small/, /^Too many starts/, /^Program length/, /^Program does not close/, /^Cusp$/, /^Undercut$/, /^Cuts overlap/, /burn away/, /^No values/, /is tight$/, /^Motor too weak/, /^Rope overloaded/, /^Too stiff/];
  /* which settings each older problem is about, so they can be highlighted in Properties (newer generators pass keys in the row) */
  const KEYMAP = {
    gears: [[/Undercut on gear 1/, ['z1', 'x1']], [/Undercut on gear 2/, ['z2', 'x2']], [/^Pointed teeth/, ['x1', 'x2']], [/^Ring too small/, ['z1', 'z2']], [/^Bore 1 too big/, ['bore1']], [/^Bore 2 too big/, ['bore2']], [/^Contact ratio/, ['z1', 'z2', 'x1', 'x2']]],
    cams: [[/pressure angle/i, ['Rb', 'e']], [/^Undercut/, ['Rr', 'Rb']], [/^Cusp/, ['Rb']], [/^Bore/, ['bore']]],
    linkages: [[/^Transmission angle/, ['a', 'b', 'c', 'd']], [/^Cannot assemble/, ['a', 'b', 'c', 'd', 'r', 'l']], [/^Holes too big/, ['hole', 'w']], [/Rod/, ['r', 'l']], [/^Crank/, ['a', 'r']]],
    pulleys: [[/^Motor too weak/, ['torque']], [/^Rope overloaded/, ['swl']], [/slips/, ['T0', 'mu', 'btype']]]
  };
  G.problemKeys = (id, r) => r[3] || (KEYMAP[id] || []).filter(([rx]) => rx.test(String(r[0]))).flatMap(x => x[1]);
  G.severity = r => r[2] === 'block' ? 'block' : BLOCK.some(rx => rx.test(String(r[0]))) ? 'block' : 'warn';

  // Reshape knobs for designs kept as a JSON list in one field (pulleys, sprockets, gear trains): spec(item) gives
  // [property, label, pair (x and y of one point move together), min, max] for each value that can be dragged
  G.listKnobs = (S, field, spec) => { let L; try { L = JSON.parse(S[field]); } catch (e) { return []; } const out = [];
    L.forEach((it, i) => spec(it).forEach(([f, label, pair, min, max]) => { const put = v => { const m = JSON.parse(S[field]); m[i][f] = v; S[field] = JSON.stringify(m); };
      out.push({ label: (it.id ? it.id + ' ' : '') + label, unit: f === 'z' ? '' : 'mm', pair: pair ? pair + i : null, step: 1, min, max, get: () => JSON.parse(S[field])[i][f], raw: put, set: put }); }));
    return out; };
  G.create = function (def) {
    const D = def.defaults, S = Object.assign({}, D), H = readHash();
    Object.keys(D).forEach(k => { if (H[k] !== undefined && typeof H[k] === typeof D[k]) S[k] = H[k]; });
    if (def.fixState) def.fixState(S);   // lets a generator repair settings from an old link (a pattern that was removed, say)
    let t = 0, playing = true, dir = 1, last = performance.now(), layout = 'flat';
    const app = document.getElementById('gen');
    app.innerHTML = `
      <header class="gbar">
        <a class="gbrand" href="../index.html" title="Mechanical Notebook home"><svg class="glogo" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7.5" stroke-dasharray="3.2 2.4"/><circle cx="12" cy="12" r="2.2"/></svg><span>Mechanical <b>Notebook</b></span></a>
        <div class="gpop gswitch"><button id="gswb" class="gswb" aria-haspopup="true" aria-expanded="false" title="Switch generator"><span class="gswk">Generator</span><b>${(G.LIST.find(g => g[0] === def.id) || [, def.title])[1]}</b>${ic('chev', 'gchev')}</button>
          <div class="gmenu gswm" hidden role="menu">${G.LIST.map(([id, name, d]) => `<a role="menuitem" href="${id}.html"${id === def.id ? ' aria-current="page"' : ''}><b>${name}</b><span>${d || ''}</span></a>`).join('')}
            <a role="menuitem" class="gall" href="../generators.html">All generators and ready-made starting points →</a></div></div>
        <div class="gacts">
          <button id="gsearch" class="gib" data-search title="Search (Ctrl/⌘ + K)" aria-label="Search">${ic('search')}</button>
          <button id="gguide" class="gtxt" title="A checklist for making this design: cut list, hardware, fits and assembly">${ic('guide')}<span>Build guide</span></button>
          <div class="gpop"><button id="gmoreb" class="gib" aria-haspopup="true" aria-expanded="false" title="Open, save, share" aria-label="More: open, save, share">${ic('more')}</button>
            <div class="gmenu gmore" hidden role="menu">
              <button role="menuitem" id="gopen"><b>Open a saved design</b><span>A .json file you saved before</span></button>
              <button role="menuitem" id="gsave"><b>Save this design</b><span>Download it as .json to open later</span></button>
              <button role="menuitem" id="gshare"><b>Copy a share link</b><span>The link reopens this exact design</span></button>
              <button role="menuitem" class="gonly-sm" data-act="guide"><b>Build guide</b><span>Cut list, hardware, fits and assembly</span></button>
              <button role="menuitem" id="gcheck"><b>Check my design</b><span>A list of checks, each with a ✓ or ✗</span></button>
              <div class="gmthm"><span>Colours</span><span class="gtheme" data-theme-picker></span></div>
            </div></div>
          <div class="gpop"><button id="gexp" class="primary" title="Export" aria-haspopup="true" aria-expanded="false">${ic('down')}<span>Export</span></button>
            <div class="gmenu gexpm" id="gmenu" hidden>
              <div class="gmhd"><b>Export</b><span>All files are in millimetres</span><button type="button" class="gx" data-close aria-label="Close">×</button></div>
              <div class="gexpwarn" id="gexpwarn" hidden></div>
              ${(def.formats || ['svg', 'dxf', 'stl']).map(x => `<button data-x="${x}" class="gfmt"><b>${x.toUpperCase()}</b><span>${{ svg: 'Laser cutters and vector apps (Inkscape, Illustrator, LightBurn)', dxf: 'CAD and CNC. One layer per part', stl: '3D printing. Each part extruded to its thickness' }[x]}</span></button>`).join('')}
              <label class="gck gchkrow"><input type="checkbox" id="gchk" checked> Check my design before exporting</label>
              <details class="gopts"><summary>Layout and labels</summary>
                <div class="gmh">Layout</div>
                <div class="gseg" id="glayout"><button data-v="flat" class="on">Laid flat</button><button data-v="nest" title="Pack the parts tightly to save sheet material">Nested</button><button data-v="assembled">As assembled</button></div>
                <div class="gnest" id="gnest" hidden>
                  <label>Gap between parts<span class="gin"><input type="number" id="gngap" value="2" min="0" max="50" step="0.5"><span>mm</span></span></label>
                  <label>Sheet width<span class="gin"><input type="number" id="gnw" value="" min="0" step="10" placeholder="auto"><span>mm</span></span></label>
                  <label class="gck"><input type="checkbox" id="gnrot" checked> Turn parts to fit</label>
                  <p>Leave a gap of at least 2× your kerf.</p>
                </div>
                <div class="gmh">Labels</div>
                <div class="gnest" id="glab">
                  <label class="gck"><input type="checkbox" id="glg" checked> Part list above the drawing</label>
                  <label class="gck"><input type="checkbox" id="gle"> Etch an ID (P1, P2…) on each part</label>
                  <label>Largest ID height<span class="gin"><input type="number" id="gleh" value="5" min="1.5" max="20" step="0.5"><span>mm</span></span></label>
                  <p>Labels go on their own blue layers, so you can turn them off or engrave them.</p>
                </div>
              </details>
            </div></div>
        </div>
        <span class="gtheme gthb" data-theme-picker></span>
        <input type="file" id="gfile" accept=".json,application/json" hidden>
      </header>
      <main class="gwork">
        <div class="gview">
          <button type="button" class="gstate" id="gstate" hidden></button>
          <canvas id="gcv" aria-label="${def.title} drawing"></canvas>
          <div class="gtitle"><h1>${def.title}</h1><p>${def.subtitle || ''}</p></div>
          <div class="gtool" role="toolbar">
            <button id="gplay" title="Play / pause (Space)">❚❚</button>
            <button id="grev" title="Reverse direction">⇄</button>
            <span class="ghm" role="group" aria-label="What dragging a part does"><button type="button" data-hm="turn" class="on" aria-pressed="true" title="Drag a moving part to turn it by hand (T)">Turn</button><button type="button" data-hm="reshape" aria-pressed="false" title="Drag a part to change its size (R)">Reshape</button></span>
            <label class="grpm" title="Animation speed">
              <input id="grpm" type="number" min="0" max="600" step="1"><span>rpm</span></label>
            <i></i>
            <button data-t="grid" title="Grid (G)">Grid</button>
            <button data-t="guides" title="Pitch circles and construction lines (C)">Guides</button>
            <button data-t="labels" title="Labels and dimensions (L)">Labels</button>
            <i></i>
            <button id="gfit" title="Fit to view (F)">Fit</button>
            <button id="g100" title="True size on a 96 dpi screen (1)">1:1</button>
            <button id="ghelp" class="gkeys" title="Keyboard shortcuts and mouse controls" aria-label="Keyboard shortcuts and controls" aria-expanded="false" aria-controls="ghelpbox"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M6 9.5h1M9.5 9.5h1M13 9.5h1M16.5 9.5h1M6 12.5h1M17 12.5h1M9 15h6"/></svg><span>Keys</span></button>
          </div>
          <div class="ghelpbox" id="ghelpbox" role="dialog" aria-label="Keyboard shortcuts and controls" hidden><b>Keyboard</b>
            <dl><dt><kbd>Space</kbd></dt><dd>play / pause</dd><dt><kbd>F</kbd></dt><dd>fit to view</dd><dt><kbd>1</kbd></dt><dd>true size</dd><dt><kbd>G</kbd> <kbd>C</kbd> <kbd>L</kbd></dt><dd>grid, guides, labels</dd></dl>
            <b>Mouse and touch</b><p>Drag a moving part to turn it by hand; flick it to spin. In Reshape, drag a part to change its size.<br>Drag the background to pan, scroll or pinch to zoom, double-click to fit.<br>Drag a field name left or right to change its value.</p></div>
          <div class="gstat"><span id="gxy">x — y —</span><span id="gscale"></span></div>
          <div class="gtoast" id="gtoast" role="status"></div>
        </div>
        <section class="gres" aria-label="Results"><div class="gcards" id="gcards"></div><div class="gwarn" id="gwarn"></div></section>
        <aside class="gside"><div class="gsideh">Properties</div><div id="gctl"></div>
          <details class="gsec"><summary>Reset</summary><div class="gbody"><button id="greset" class="gwide">Back to the default design</button></div></details>
          <footer class="gfoot">Free and open source · MIT</footer></aside>
      </main>`;

    /* ---------- inspector controls ---------- */
    const ctl = document.getElementById('gctl'), listeners = [], fields = [];   // fields: every number box, so Reshape can drive them
    let dirty = true;
    const changed = () => { writeHash(); listeners.forEach(f => f()); dirty = true; };
    const ui = {
      _host: ctl,
      section(title, body, o) {
        const s = document.createElement('details'); s.className = 'gsec'; s.open = !(o && o.closed);
        s.innerHTML = `<summary>${title}</summary><div class="gbody"></div>`; ctl.appendChild(s);
        const cur = ui._host; ui._host = s.querySelector('.gbody'); body(); ui._host = cur;
        if (o && o.show) listeners.push(() => { s.hidden = !o.show(S); });
        if (o && o.hl) s._hl = o.hl;
        return s;
      },
      // free-form editor: build(el, api) draws its own controls; api.changed() after editing S, api.listen(fn) runs fn on every change
      custom(build) { const el = document.createElement('div'); el.className = 'gcustom'; ui._host.appendChild(el); build(el, { S, changed, listen: fn => listeners.push(fn), toast: m => toast(m), fit: () => fit(), hl: (node, fn, tag) => { node._hl = fn; node._hlTag = tag; } }); return el; },
      num(key, label, o) {
        o = o || {}; const row = document.createElement('div'); row.className = 'gfld'; row.dataset.key = key;
        // min and max can be numbers or functions of the design (S), so a value that cannot be made is never accepted
        const lim = m => typeof m === 'function' ? m(S) : m;
        row.innerHTML = `<label title="${o.help ? o.help + ' — ' : ''}Drag left or right to change">${label}</label><div class="gin"><input type="number" step="${o.step || 1}"><span>${o.unit || ''}</span></div>`;
        const inp = row.querySelector('input'), lab = row.querySelector('label'); inp.value = S[key]; if (o.hl) row._hl = o.hl;
        const lims = () => { const lo = lim(o.min), hi = lim(o.max); inp.min = lo ?? ''; inp.max = hi ?? ''; return [lo, hi]; }; lims();
        const flash = msg => { let p = row.querySelector('.gclamp'); if (!p) { p = document.createElement('p'); p.className = 'gclamp'; p.setAttribute('role', 'status'); row.insertBefore(p, row.querySelector('.ghelp')); } p.textContent = msg; clearTimeout(p._t); p._t = setTimeout(() => p.remove(), 3200); };
        const set = v => {
          v = +v; if (!isFinite(v)) return; const [lo, hi] = lims(), u = o.unit && o.unit !== '°' ? ' ' + o.unit : o.unit || '';
          if (lo != null && v < lo) { v = lo; flash(`Smallest that works: ${lo}${u}${o.why ? ' (' + o.why + ')' : ''}`); }
          if (hi != null && v > hi) { v = hi; flash(`Largest that works: ${hi}${u}${o.why ? ' (' + o.why + ')' : ''}`); }
          if (o.int) v = Math.round(v); S[key] = +v.toFixed(6); changed();
        };
        inp.oninput = () => { if (inp.value !== '') set(inp.value); };
        fields.push({ key, label, row, step: o.step || 1, int: !!o.int, unit: o.unit || '', lims, set: v => { set(v); inp.value = S[key]; } });
        inp.onchange = () => { inp.value = S[key]; };
        let sc = null;   // drag the label to scrub the value
        lab.addEventListener('pointerdown', e => { sc = [e.clientX, S[key]]; lab.setPointerCapture(e.pointerId); e.preventDefault(); });
        lab.addEventListener('pointermove', e => { if (!sc) return; const st = o.step || 1; set(sc[1] + Math.round((e.clientX - sc[0]) / 6) * st); inp.value = S[key]; });
        lab.addEventListener('pointerup', () => sc = null);
        if (o.help) { const h = document.createElement('p'); h.className = 'ghelp'; h.textContent = o.help; row.appendChild(h); }
        listeners.push(() => { lims(); if (document.activeElement !== inp) inp.value = S[key]; if (o.show) row.hidden = !o.show(S); });
        ui._host.appendChild(row); return row;
      },
      seg(key, label, opts, o) {
        o = o || {}; const row = document.createElement('div'); row.className = 'gfld gfseg';
        row.innerHTML = `<label>${label}</label><div class="gseg">${opts.map(([v, l]) => `<button data-v="${v}">${l}</button>`).join('')}</div>`;
        const btns = [...row.querySelectorAll('button')]; if (o.hl) row._hl = o.hl;
        btns.forEach(b => b.onclick = () => { const v = b.dataset.v; S[key] = isNaN(+v) ? v : +v; changed(); if (o.refit) fit(); });
        const sync = () => { btns.forEach(b => b.classList.toggle('on', String(S[key]) === b.dataset.v)); if (o.show) row.hidden = !o.show(S); };
        listeners.push(sync); sync(); ui._host.appendChild(row); return row;
      },
      // icon buttons: opts = [[value, label, svg-inner-markup], ...]; each shows a small picture with the name under it
      select(key, label, opts, o) {
        o = o || {}; const row = document.createElement('div'); row.className = 'gfld gfseg';
        row.innerHTML = `<label>${label}</label><select class="gsel">${opts.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>`;
        const sel = row.querySelector('select'); if (o.hl) row._hl = o.hl;
        sel.onchange = () => { const v = sel.value; S[key] = isNaN(+v) ? v : +v; changed(); };
        listeners.push(() => { sel.value = String(S[key]); if (o.show) row.hidden = !o.show(S); }); sel.value = String(S[key]); ui._host.appendChild(row); return row;
      },
      pick(key, label, opts, o) {
        o = o || {}; const row = document.createElement('div'); row.className = 'gfld gpickf';
        row.innerHTML = `<label>${label}</label><div class="gpick">${opts.map(([v, l, svg]) => `<button type="button" data-v="${v}" title="${l}${o.tips && o.tips[v] ? ' — ' + o.tips[v] : ''}"><svg viewBox="0 0 48 32" aria-hidden="true">${svg}</svg><span>${l}</span></button>`).join('')}</div>`;
        const btns = [...row.querySelectorAll('button')]; if (o.hl) row._hl = o.hl;
        btns.forEach(b => b.onclick = () => { const v = b.dataset.v; S[key] = isNaN(+v) ? v : +v; changed(); });
        const sync = () => { btns.forEach(b => b.classList.toggle('on', String(S[key]) === b.dataset.v)); if (o.show) row.hidden = !o.show(S); };
        listeners.push(sync); sync(); ui._host.appendChild(row); return row;
      },
      check(key, label, o) {
        o = o || {}; const row = document.createElement('label'); row.className = 'gfld gchk';
        row.innerHTML = `<span>${label}</span><input type="checkbox" role="switch">`; const c = row.querySelector('input');
        if (o.hl) row._hl = o.hl; c.checked = !!S[key]; c.onchange = () => { S[key] = c.checked ? 1 : 0; changed(); };
        listeners.push(() => { c.checked = !!S[key]; if (o.show) row.hidden = !o.show(S); }); ui._host.appendChild(row); return row;
      },
      note(html, o) { const p = document.createElement('p'); p.className = 'ghelp'; p.innerHTML = html; if (o && o.live) listeners.push(() => { p.innerHTML = o.live(S); });
        if (o && o.show) listeners.push(() => { p.hidden = !o.show(S); }); ui._host.appendChild(p); return p; }
    };
    def.panel(ui, S);
    if (window.MNGloss) ctl.querySelectorAll('.ghelp').forEach(p => MNGloss.apply(p));

    /* ---------- highlight: pointing at a control in Properties lights up its part on the drawing ---------- */
    let hl = null, hlTag = null;
    const side = app.querySelector('.gside');
    const pickHL = node => { while (node && node !== side) { if (node._hl) return node; node = node.parentElement; } return null; };
    const setHL = node => { const fn = node ? node._hl : null, tag = node ? node._hlTag : null; if (fn === hl && tag === hlTag) return; hl = fn; hlTag = tag; dirty = true; };
    side.addEventListener('mouseover', e => setHL(pickHL(e.target)));
    side.addEventListener('mouseleave', () => setHL(document.activeElement && side.contains(document.activeElement) ? pickHL(document.activeElement) : null));
    side.addEventListener('focusin', e => setHL(pickHL(e.target)));
    side.addEventListener('focusout', () => setHL(null));

    /* ---------- toolbar ---------- */
    const rpm = document.getElementById('grpm'); rpm.value = S.rpm;
    rpm.oninput = () => { if (rpm.value !== '') { S.rpm = Math.max(0, Math.min(600, +rpm.value)); changed(); } };
    const toggles = [...document.querySelectorAll('[data-t]')];
    toggles.forEach(b => b.onclick = () => { S[b.dataset.t] = S[b.dataset.t] ? 0 : 1; changed(); });
    listeners.push(() => { toggles.forEach(b => b.classList.toggle('on', !!S[b.dataset.t])); if (document.activeElement !== rpm) rpm.value = S.rpm; });

    /* ---------- results ---------- */
    const cards = document.getElementById('gcards'), warn = document.getElementById('gwarn');
    const stateBtn = document.getElementById('gstate'), expBtn = document.getElementById('gexp');
    let probs = [], level = 'ok';
    const showInfo = () => {
      const rows = def.info(S);
      // row = [label, value, warn, keys]. warn: true = orange value and a problem; 'soft' = orange value only;
      // 2 = a problem listed on the right only; 'block' = the design will not work (also listed on the right).
      // keys (optional): the setting names to highlight in Properties.
      cards.innerHTML = rows.filter(r => r[2] !== 2 && r[2] !== 'block').map(([k, v, w]) => `<div class="gcard${w ? ' warn' : ''}"><span>${k}</span><b>${v}</b></div>`).join('');
      probs = rows.filter(r => r[2] && r[2] !== 'soft').map(r => Object.assign(r.slice(), { sev: G.severity(r) }));
      level = probs.some(p => p.sev === 'block') ? 'block' : probs.length ? 'warn' : 'ok';
      const order = { block: 0, warn: 1 };
      probs.sort((a, b) => order[a.sev] - order[b.sev]);
      warn.className = 'gwarn gw-' + level;
      warn.innerHTML = probs.length ? `<p class="gwh">${level === 'block' ? '✕ Likely to fail as it is' : '⚠ Check these before you make it'}</p><p class="gwsub">You can still export it: cut or print a small test piece first and adjust from there.</p>` + probs.map(r => `<div class="gp-${r.sev}"><b>${r.sev === 'block' ? '✕' : '⚠'} ${r[0]}</b> ${r[1]}</div>`).join('') : '<div class="ok">✓ No problems found</div>';
      // the same news on the drawing and on the Export button
      stateBtn.hidden = false; stateBtn.className = 'gstate gs-' + level;
      stateBtn.innerHTML = level === 'block' ? `<span class="gsi">✕</span><span><b>Likely to fail</b> · ${probs.find(p => p.sev === 'block')[0]}</span>` : level === 'warn' ? `<span class="gsi">⚠</span><span><b>${probs.length} thing${probs.length > 1 ? 's' : ''} to check</b> · ${probs[0][0]}</span>` : '<span class="gsi">✓</span><span><b>Ready to make</b></span>';
      expBtn.classList.toggle('gx-block', level === 'block'); expBtn.classList.toggle('gx-warn', level === 'warn');
      expBtn.title = level === 'block' ? 'Export (likely to fail as it is: test a piece first)' : level === 'warn' ? 'Export (there are things to check first)' : 'Export';
      const eb = document.getElementById('gexpwarn');
      if (eb) { eb.hidden = level === 'ok'; eb.className = 'gexpwarn gw-' + level; eb.innerHTML = level === 'ok' ? '' : `<b>${level === 'block' ? '✕ Likely to fail as it is.' : '⚠ Some things need checking.'}</b> ${probs.slice(0, 3).map(p => p[0]).join(' · ')}. You can still export: test a small piece first.`; }
      // highlight the settings each problem is about, with the problem written under the field
      app.querySelectorAll('.gside .gfld.gbad, .gside .gfld.gwarnf').forEach(r => { r.classList.remove('gbad', 'gwarnf'); const m = r.querySelector('.gfmsg'); if (m) m.remove(); });
      probs.forEach(p => G.problemKeys(def.id, p).forEach(key => {
        const r = app.querySelector(`.gside .gfld[data-key="${key}"]`); if (!r || r.hidden) return;
        const cls = p.sev === 'block' ? 'gbad' : 'gwarnf'; if (r.classList.contains('gbad')) return;
        r.classList.remove('gwarnf'); r.classList.add(cls);
        let m = r.querySelector('.gfmsg'); if (!m) { m = document.createElement('p'); m.className = 'gfmsg'; r.insertBefore(m, r.querySelector('.ghelp')); }
        m.textContent = (p.sev === 'block' ? '✕ ' : '⚠ ') + p[0];
      }));
      if (window.MNGloss) { MNGloss.apply(cards); MNGloss.apply(warn); }   // underlined terms show a plain-language definition
    };
    stateBtn.onclick = () => { if (level === 'ok') return; if (innerWidth <= 860) warn.scrollIntoView({ behavior: 'smooth', block: 'center' }); openCheck(null); };
    listeners.push(showInfo);
    listeners.forEach(f => f());

    /* ---------- view: pan / zoom ---------- */
    const cv = document.getElementById('gcv'), ctx = cv.getContext('2d');
    let view = { x: 0, y: 0, s: 3 }, dpr = 1;
    const resize = () => { dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = cv.clientWidth * dpr; cv.height = cv.clientHeight * dpr; dirty = true; };
    new ResizeObserver(resize).observe(cv); resize();
    const fit = () => {
      // keep clear of the title (top), the toolbar (bottom) and room for dimension lines
      const b = G.bounds(def.model(S, t).parts), w = cv.clientWidth, h = cv.clientHeight, mx = Math.min(60, w * 0.08), top = Math.min(w < 600 ? 60 : 120, h * 0.22), bot = Math.min(130, h * 0.25);
      view.s = Math.min(400, Math.max(0.05, Math.min((w - 2 * mx) / Math.max(1, b.x1 - b.x0), (h - top - bot) / Math.max(1, b.y1 - b.y0)) || 1));
      view.x = (b.x0 + b.x1) / 2; view.y = (b.y0 + b.y1) / 2 - (bot - top) / 2 / view.s; dirty = true;
    };
    const toWorld = (px, py) => [view.x + (px - cv.clientWidth / 2) / view.s, view.y - (py - cv.clientHeight / 2) / view.s];
    cv.addEventListener('wheel', e => { e.preventDefault(); const r = cv.getBoundingClientRect(), [wx, wy] = toWorld(e.clientX - r.left, e.clientY - r.top); view.s = Math.min(400, Math.max(0.05, view.s * Math.exp(-e.deltaY * 0.0015))); const [nx, ny] = toWorld(e.clientX - r.left, e.clientY - r.top); view.x += wx - nx; view.y += wy - ny; dirty = true; }, { passive: false });
    let lastParts = []; const xy = document.getElementById('gxy');
    const inPoly = (pt, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > pt[1]) !== (b[1] > pt[1]) && pt[0] < (b[0] - a[0]) * (pt[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
    /* ---------- hands on: grab a moving part to turn it, or (Reshape) drag a part to change the design ---------- */
    const TAU = Math.PI * 2; let hmode = 'turn', gh = null, coast = 0, hovT = 0;
    const segsOf = (SS, tt) => { let M; try { M = def.model(SS, tt); } catch (e) { return null; } const o = [];
      M.parts.forEach(p => (p.shapes || []).forEach(sh => { [sh.outer].concat(sh.holes || []).forEach(r => { if (!r) return; for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length]; o.push(a[0], a[1], b[0], b[1]); } }); (sh.circles || []).forEach(c => o.push(c.x, c.y, c.x, c.y)); }));
      M.parts.forEach(p => (p.cuts || []).forEach(c => { for (let i = 1; i < c.pts.length; i++) o.push(c.pts[i - 1][0], c.pts[i - 1][1], c.pts[i][0], c.pts[i][1]); }));
      return o; };
    const segNear = (s, i, x, y) => { const x1 = s[i], y1 = s[i + 1], dx = s[i + 2] - x1, dy = s[i + 3] - y1, L = dx * dx + dy * dy, u = L ? Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / L)) : 0; return [Math.hypot(x1 + u * dx - x, y1 + u * dy - y), u]; };
    const segAt = (s, i, u) => s && s.length > i + 3 ? [s[i] + u * (s[i + 2] - s[i]), s[i + 1] + u * (s[i + 3] - s[i + 1])] : null;
    // the same edge in another frame: same index if the outline has the same number of edges, otherwise the nearest similar edge
    const segMatch = (s, ref) => { if (!s) return -1; const n = s.length / 4; if (n === ref.n) return ref.i;
      const D = Math.abs(n - ref.n) + 6, i0 = Math.round(ref.i / 4 * n / ref.n), g0 = ref.seg, L0 = Math.hypot(g0[2] - g0[0], g0[3] - g0[1]), mx = (g0[0] + g0[2]) / 2, my = (g0[1] + g0[3]) / 2; let best = -1, bs = 1e9;
      for (let j = Math.max(0, i0 - D); j <= Math.min(n - 1, i0 + D); j++) { const k = j * 4, sc = 2 * Math.abs(Math.hypot(s[k + 2] - s[k], s[k + 3] - s[k + 1]) - L0) + Math.hypot((s[k] + s[k + 2]) / 2 - mx, (s[k + 1] + s[k + 3]) / 2 - my); if (sc < bs) { bs = sc; best = k; } }
      return best; };
    const refOf = (s, i) => ({ i, n: s.length / 4, seg: s.slice(i, i + 4) });
    function grab(wx, wy, r, any, light) {
      const s0 = segsOf(S, t); if (!s0) return null;
      const probes = (light ? [0.02, -0.02, 0.5, -0.5] : [0.02, -0.02, 0.5, -0.5, 1.5, -1.5]).map(h => [h, segsOf(S, t + h)]);
      let best = null;
      for (let i = 0; i < s0.length; i += 4) {
        const [d, u] = segNear(s0, i, wx, wy); if (d > r || (best && d >= best.d)) continue;
        const P = segAt(s0, i, u), ref = refOf(s0, i); let mv = 0;
        probes.forEach(([h, s]) => { const k = segMatch(s, ref); if (k < 0) return; const A = segAt(s, k, u); if (A) mv = Math.max(mv, Math.hypot(A[0] - P[0], A[1] - P[1])); });
        if (any || mv > 0.05 * r) best = { i, u, d, P, ref };
      }
      return best;
    }
    let found = null;
    const gpos = (SS, tt) => { const s = segsOf(SS, tt), k = segMatch(s, gh.ref); if (k < 0) return null; found = refOf(s, k); return segAt(s, k, gh.u); };
    const gcommit = (SS, tt) => { if (gpos(SS, tt) && found) gh.ref = found; };
    function turnTo(q) {
      let tt = t, P = gpos(S, tt); if (!P) return; let d0 = Math.hypot(P[0] - q[0], P[1] - q[1]); const h = 0.01;
      for (let it = 0; it < 4 && d0 > 0.05 / view.s; it++) {
        let vx = 0, vy = 0, vv = 0;
        find: for (const hh of [h, 0.15, 0.6]) for (const sg of [1, -1]) { const P2 = gpos(S, tt + sg * hh); if (!P2) continue; const tx = (P2[0] - P[0]) / (sg * hh), ty = (P2[1] - P[1]) / (sg * hh); if (tx * tx + ty * ty < 1e-6) continue; vx = tx; vy = ty; vv = tx * tx + ty * ty; break find; }
        if (vv < 1e-6) break;
        let dt = Math.max(-0.4, Math.min(0.4, ((q[0] - P[0]) * vx + (q[1] - P[1]) * vy) / vv)), ok = false;
        for (let k = 0; k < 4; k++) { const Pn = gpos(S, tt + dt), dn = Pn ? Math.hypot(Pn[0] - q[0], Pn[1] - q[1]) : 1e9; if (dn < d0) { tt += dt; P = Pn; d0 = dn; ok = true; break; } dt /= 2; }
        if (!ok) break;
      }
      if (d0 * view.s > 14) { let bt = tt, bd = d0; for (let j = -12; j <= 12; j++) { if (!j) continue; const tj = tt + j * TAU / 24, Pj = gpos(S, tj), dj = Pj ? Math.hypot(Pj[0] - q[0], Pj[1] - q[1]) : 1e9; if (dj < bd) { bd = dj; bt = tj; } } if (bd < d0 - 3 / view.s) { tt = bt; P = gpos(S, tt) || P; } }
      gcommit(S, tt); t = tt; gh.P = P; dirty = true;
      const now = performance.now(); gh.hist.push([now, t]); while (gh.hist.length > 2 && now - gh.hist[0][0] > 120) gh.hist.shift();
    }
    // reshape: the design value (or pair of values, such as a pivot's x and y) that moves the grabbed point most
    const knobs = () => fields.filter(f => f.row.isConnected && !f.row.closest('[hidden]')).map(f => ({ key: f.key, label: f.label, unit: f.unit, step: f.step, get: () => S[f.key], set: f.set, lims: f.lims }))
      .concat(def.knobs ? def.knobs(S).map(k => Object.assign({ step: 1, unit: '', lims: () => [k.min, k.max] }, k, { set: v => { k.set(v); changed(); } })) : []);
    const tryAt = (kn, v, fn) => { const keep = kn.get(); kn.raw ? kn.raw(v) : (S[kn.key] = v); try { return fn(); } finally { kn.raw ? kn.raw(keep) : (S[kn.key] = keep); } };
    function startReshape() {
      const base = gpos(S, t); if (!base) return null; const ks = knobs(), sens = [];
      ks.forEach(kn => { const [lo, hi] = kn.lims(), v = kn.get(); if (!isFinite(v)) return; let dv = kn.step * Math.max(1, Math.round(((hi ?? v + 100 * kn.step) - (lo ?? v - 100 * kn.step)) / kn.step / 200)); if (hi != null && v + dv > hi) dv = -dv;
        if (!kn.key && !kn.raw) return;
        const P1 = tryAt(kn, v + dv, () => gpos(S, t)); if (!P1) return;
        const jx = (P1[0] - base[0]) / dv, jy = (P1[1] - base[1]) / dv, span = (hi != null && lo != null ? hi - lo : 200 * kn.step);
        sens.push({ kn, dv, jx, jy, s: Math.hypot(jx, jy) * span }); });
      sens.sort((a, b) => b.s - a.s); if (!sens.length || sens[0].s * view.s < 8) return null;
      const pick = [sens[0]], b0 = sens[0];
      if (b0.kn.pair) { const mate = sens.find(x => x !== b0 && x.kn.pair === b0.kn.pair); if (mate) pick.push(mate); }
      return pick;
    }
    function reshapeTo(q) {
      const ks = gh.k; if (!ks) return;
      for (let it = 0; it < 3; it++) {
        const P = gpos(S, t); if (!P) break; const ex = q[0] - P[0], ey = q[1] - P[1];
        const J = ks.map(k => { const v = k.kn.get(), P1 = tryAt(k.kn, v + k.dv, () => gpos(S, t)); return P1 ? [(P1[0] - P[0]) / k.dv, (P1[1] - P[1]) / k.dv] : [0, 0]; });
        let d;
        if (ks.length === 2) { const [a, b] = J, det = a[0] * b[1] - a[1] * b[0]; d = Math.abs(det) > 1e-9 ? [(ex * b[1] - ey * b[0]) / det, (a[0] * ey - a[1] * ex) / det] : [0, 0]; }
        else { const j = J[0], jj = j[0] * j[0] + j[1] * j[1]; d = [jj > 1e-12 ? (ex * j[0] + ey * j[1]) / jj : 0]; }
        // damped step: keep it only if the point really gets closer, else try half as far
        const e0 = Math.hypot(ex, ey), cur = ks.map(k => k.kn.get()); let done = false;
        for (let tries = 0; tries < 5 && !done; tries++) {
          const vals = ks.map((k, i) => { const [lo, hi] = k.kn.lims(); let v = cur[i] + d[i]; if (lo != null) v = Math.max(lo, v); if (hi != null) v = Math.min(hi, v); return +(Math.round(v / k.kn.step) * k.kn.step).toFixed(6); });
          const raw = (k, v) => k.kn.raw ? k.kn.raw(v) : (S[k.kn.key] = v);
          ks.forEach((k, i) => raw(k, vals[i])); const Pn = gpos(S, t); ks.forEach((k, i) => raw(k, cur[i]));
          if (Pn && Math.hypot(q[0] - Pn[0], q[1] - Pn[1]) < e0) { ks.forEach((k, i) => { if (vals[i] !== cur[i]) k.kn.set(vals[i]); }); done = true; }
          else d = d.map(x => x / 2);
        }
        if (!done) break;
      }
      const P = gpos(S, t); gcommit(S, t); gh.P = P || q; dirty = true;
      htip(ks.map(k => `<b>${k.kn.label}</b> ${+(+k.kn.get()).toFixed(3)}${k.kn.unit ? ' ' + k.kn.unit : ''}`).join(' · '));
    }
    const tipEl = document.createElement('div'); tipEl.className = 'ghtip'; tipEl.hidden = true; tipEl.setAttribute('role', 'status'); cv.parentElement.appendChild(tipEl);
    function htip(html, ms) { if (!html) { tipEl.hidden = true; return; } tipEl.innerHTML = html; tipEl.hidden = false; clearTimeout(htip._t); if (ms) htip._t = setTimeout(() => tipEl.hidden = true, ms); }
    /* Reshape handles: every size that visibly changes the drawing gets a round handle on the part it moves, with a dashed track for
       its range (an open end means it can go further: let go and the track grows from the new value). Pivots get a four-way handle. */
    let HD = [], hdT = 0, hdrag = null, hhov = null, wasPlaying = false;
    // the four outermost points of each part (left, right, bottom, top): always on the outline, so a handle sits on the part itself
    const feats = M => M.parts.map(p => { const e = [null, null, null, null]; (p.shapes || []).forEach(sh => (sh.outer || []).forEach(q => { if (!e[0] || q[0] < e[0][0]) e[0] = q; if (!e[1] || q[0] > e[1][0]) e[1] = q; if (!e[2] || q[1] < e[2][1]) e[2] = q; if (!e[3] || q[1] > e[3][1]) e[3] = q; })); return e[0] ? e : null; });
    const modelWith = (kn, v) => tryAt(kn, v, () => { try { return def.model(S, t); } catch (e) { return null; } });
    function buildHandles() {
      HD = []; if (hmode !== 'reshape') { dirty = true; return; }
      const t0 = performance.now(), cand = [], pairs = {};
      knobs().forEach(kn => {
        if (performance.now() - t0 > 700) return;
        if (kn.pair) { (pairs[kn.pair] = pairs[kn.pair] || []).push(kn); return; }
        const [lo, hi] = kn.lims(), v = kn.get(); if (!isFinite(v)) return;
        const W = Math.max(Math.abs(v) * 0.6, 10 * kn.step), a = lo != null ? Math.max(lo, v - W) : v - W, b = hi != null ? Math.min(hi, v + W) : v + W; if (b - a < kn.step) return;
        const Ma = modelWith(kn, a), Mb = modelWith(kn, b); if (!Ma || !Mb || Ma.parts.length !== Mb.parts.length) return;
        const Fa = feats(Ma), Fb = feats(Mb); let best = null;
        Fa.forEach((fa, i) => { const fb = Fb[i]; if (!fa || !fb) return; fa.forEach((q, j) => { const d = Math.hypot(fb[j][0] - q[0], fb[j][1] - q[1]); if (!best || d > best.d) best = { i, j, d }; }); });
        if (!best || best.d * view.s < 18) return;
        cand.push({ kn, a, b, best, endA: lo != null && a <= lo, endB: hi != null && b >= hi });
      });
      cand.sort((x, y) => y.best.d - x.best.d);
      cand.forEach(c => {
        if (performance.now() - t0 > 900) return;
        const n = 9, vals = [], pts = [];
        for (let i = 0; i < n; i++) { let x = c.a + (c.b - c.a) * i / (n - 1); x = Math.round(x / c.kn.step) * c.kn.step; vals.push(x); const M = modelWith(c.kn, x), F = M && feats(M)[c.best.i]; pts.push(F ? F[c.best.j] : null); }
        const cur = posOnTrack({ vals, pts }, c.kn.get()); if (!cur) return;
        if (HD.some(h => !h.pair && Math.hypot(h.cur[0] - cur[0], h.cur[1] - cur[1]) * view.s < 16)) return;   // two sizes moving the same corner: keep the stronger one
        HD.push({ kn: c.kn, vals, pts, cur, endA: c.endA, endB: c.endB });
      });
      Object.values(pairs).forEach(ks => { if (ks.length !== 2) return; const kx = ks.find(k => / x$/.test(k.label)) || ks[0], ky = ks.find(k => k !== kx); HD.push({ pair: true, kx, ky, kn: kx, cur: [kx.get(), ky.get()] }); });
      dirty = true;
    }
    function posOnTrack(h, x) { const vs = h.vals; let i = 0; while (i < vs.length - 2 && x > vs[i + 1]) i++; const f = vs[i + 1] === vs[i] ? 0 : Math.max(0, Math.min(1, (x - vs[i]) / (vs[i + 1] - vs[i]))), A = h.pts[i], B = h.pts[i + 1]; return A && B ? [A[0] + f * (B[0] - A[0]), A[1] + f * (B[1] - A[1])] : A || B; }
    const rebuildSoon = ms => { clearTimeout(hdT); hdT = setTimeout(buildHandles, ms || 200); };
    listeners.push(() => { if (hmode === 'reshape' && !hdrag) rebuildSoon(); });
    function drawHandles() {
      if (hmode !== 'reshape') return; const u = 1 / view.s, red = css('--red'), ink = css('--ink');
      HD.forEach(h => {
        if (hdrag && hdrag.h !== h) return; const on = (hdrag && hdrag.h === h) || hhov === h;
        if (h.pair) { const [x, y] = h.pair ? [h.kx.get(), h.ky.get()] : h.cur; ctx.save(); ctx.strokeStyle = red; ctx.fillStyle = red; ctx.lineWidth = 2 * u; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const a = 13 * u, b = 21 * u; ctx.beginPath(); ctx.moveTo(x + dx * a, y + dy * a); ctx.lineTo(x + dx * b, y + dy * b); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x + dx * (b + 5 * u), y + dy * (b + 5 * u)); ctx.lineTo(x + dx * b - dy * 4 * u, y + dy * b + dx * 4 * u); ctx.lineTo(x + dx * b + dy * 4 * u, y + dy * b - dx * 4 * u); ctx.fill(); });
          ctx.fillStyle = css('--canvas'); ctx.lineWidth = 3 * u; ctx.beginPath(); ctx.arc(x, y, (on ? 11 : 9) * u, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillStyle = red; ctx.beginPath(); ctx.arc(x, y, 3.5 * u, 0, TAU); ctx.fill(); ctx.restore(); return; }
        ctx.save(); ctx.setLineDash([6 * u, 4 * u]); ctx.lineWidth = (on ? 3 : 2.2) * u; ctx.strokeStyle = on ? red : ink; ctx.globalAlpha = on ? 1 : 0.55; ctx.beginPath(); let st = false;
        h.pts.forEach(q => { if (!q) { st = false; return; } st ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); st = true; }); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
        [[0, 1, h.endA], [h.pts.length - 1, h.pts.length - 2, h.endB]].forEach(([e, f, stop]) => { const A = h.pts[e], B = h.pts[f]; if (!A || !B || !stop) return; const L = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1, nx = -(B[1] - A[1]) / L * 8 * u, ny = (B[0] - A[0]) / L * 8 * u; ctx.lineWidth = 2.5 * u; ctx.strokeStyle = ink; ctx.beginPath(); ctx.moveTo(A[0] - nx, A[1] - ny); ctx.lineTo(A[0] + nx, A[1] + ny); ctx.stroke(); });
        const p = posOnTrack(h, h.kn.get()) || h.cur; ctx.fillStyle = css('--canvas'); ctx.strokeStyle = red; ctx.lineWidth = 3 * u; ctx.beginPath(); ctx.arc(p[0], p[1], (on ? 11 : 9) * u, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillStyle = red; ctx.beginPath(); ctx.arc(p[0], p[1], 3.5 * u, 0, TAU); ctx.fill(); ctx.restore();
      });
    }
    const hpos = h => h.pair ? [h.kx.get(), h.ky.get()] : (posOnTrack(h, h.kn.get()) || h.cur);
    const hitHandle = (wx, wy, rpx) => { let best = null, bd = rpx / view.s; HD.forEach(h => { const p = hpos(h), d = Math.hypot(p[0] - wx, p[1] - wy); if (d < bd) { bd = d; best = h; } }); return best; };
    const htxt = h => { const kn = h.kn; if (h.pair) return `<b>${kn.label.replace(/ x$/, '')}</b> drag anywhere: x ${+h.kx.get().toFixed(1)}, y ${+h.ky.get().toFixed(1)}`; const [lo, hi] = kn.lims(); return `<b>${kn.label}</b> ${+(+kn.get()).toFixed(3)}${kn.unit ? ' ' + kn.unit : ''}` + (lo != null || hi != null ? ` <span>(${lo != null ? lo : '…'} to ${hi != null ? hi : '…'})</span>` : '') + '<br><span>Drag along the dashed track.</span>'; };
    function dragHandle(wx, wy) {
      const h = hdrag.h;
      if (h.pair) { h.kx.set(Math.round(wx / h.kx.step) * h.kx.step); h.ky.set(Math.round(wy / h.ky.step) * h.ky.step); htip(htxt(h)); dirty = true; return; }
      let best = null; for (let i = 0; i < h.pts.length - 1; i++) { const A = h.pts[i], B = h.pts[i + 1]; if (!A || !B) continue; const dx = B[0] - A[0], dy = B[1] - A[1], L = dx * dx + dy * dy, f = L ? Math.max(0, Math.min(1, ((wx - A[0]) * dx + (wy - A[1]) * dy) / L)) : 0, d = Math.hypot(A[0] + f * dx - wx, A[1] + f * dy - wy); if (!best || d < best.d) best = { d, i, f }; }
      if (!best) return; const vs = h.vals; let v = vs[best.i] + best.f * (vs[best.i + 1] - vs[best.i]); v = Math.round(v / h.kn.step) * h.kn.step; if (v !== h.kn.get()) h.kn.set(+v.toFixed(6)); htip(htxt(h)); dirty = true;
    }
    const setMode = v => { hmode = v; document.querySelectorAll('[data-hm]').forEach(x => { x.classList.toggle('on', x.dataset.hm === v); x.setAttribute('aria-pressed', x.dataset.hm === v); }); cv.classList.toggle('reshaping', v === 'reshape');
      if (v === 'reshape') { wasPlaying = playing; setPlay(false); buildHandles(); htip('Reshape: drag a round handle along its dashed track. Drag the background to pan.', 3000); }
      else { HD = []; if (wasPlying()) setPlay(true); htip('Turn: drag a moving part to turn it by hand, and flick it to spin.', 2600); } dirty = true; };
    const wasPlying = () => wasPlaying;
    document.querySelectorAll('[data-hm]').forEach(b => b.onclick = () => setMode(b.dataset.hm));
    if (document.body.classList.contains('gstatic')) setTimeout(() => setMode('reshape'), 300);   // nothing turns here, so dragging reshapes
    // pointers: one = pan, two = pinch-zoom + pan about the midpoint
    const ptrs = new Map(); let g = null, lastTap = 0;
    const rebase = () => {
      const a = [...ptrs.values()];
      if (a.length === 1) g = { n: 1, x: a[0][0], y: a[0][1], vx: view.x, vy: view.y };
      else if (a.length >= 2) {
        const r = cv.getBoundingClientRect(), mx = (a[0][0] + a[1][0]) / 2 - r.left, my = (a[0][1] + a[1][1]) / 2 - r.top;
        g = { n: 2, d: Math.max(10, Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1])), s: view.s, w: toWorld(mx, my) };
      } else g = null;
    };
    cv.addEventListener('pointerdown', e => {
      if (!ptrs.size && !gh && !hdrag && e.button <= 0 && hmode === 'reshape') {
        const r = cv.getBoundingClientRect(), [wx, wy] = toWorld(e.clientX - r.left, e.clientY - r.top), h = hitHandle(wx, wy, e.pointerType === 'touch' ? 26 : 16);
        if (h) { hdrag = { h, id: e.pointerId }; cv.classList.add('grabbing'); try { cv.setPointerCapture(e.pointerId); } catch (_) {} htip(htxt(h)); dirty = true; return; }
      }
      if (hdrag) return;
      if (!ptrs.size && !gh && e.button <= 0 && hmode === 'turn') {
        const r = cv.getBoundingClientRect(), [wx, wy] = toWorld(e.clientX - r.left, e.clientY - r.top), pk = grab(wx, wy, (e.pointerType === 'touch' ? 22 : 12) / view.s, false);
        if (pk) {
          gh = { ref: pk.ref, u: pk.u, id: e.pointerId, was: playing, hist: [[performance.now(), t]], P: pk.P };
          if (hmode === 'reshape') { gh.k = startReshape(); if (!gh.k) { gh = null; htip('No setting changes this part. Try another part, or drag the background to pan.', 2200); } }
          if (gh) { coast = 0; setPlay(false); cv.classList.add('grabbing'); try { cv.setPointerCapture(e.pointerId); } catch (_) {} if (hmode === 'reshape') reshapeTo(pk.P); dirty = true; return; }
        }
      }
      if (gh) return;
      ptrs.set(e.pointerId, [e.clientX, e.clientY]); try { cv.setPointerCapture(e.pointerId); } catch (_) {}
      if (e.pointerType === 'touch' && ptrs.size === 1) { const n = Date.now(); if (n - lastTap < 320) { fit(); lastTap = 0; } else lastTap = n; }
      rebase();
    });
    cv.addEventListener('pointermove', e => {
      const r = cv.getBoundingClientRect(), [wx, wy] = toWorld(e.clientX - r.left, e.clientY - r.top);
      if (e.pointerType !== 'touch') {
        const under = lastParts.slice().reverse().find(p => p.name !== 'Path' && p.shapes.some(s => inPoly([wx, wy], s.outer) && !(s.holes || []).some(h => inPoly([wx, wy], h)) && !(s.circles || []).some(c => Math.hypot(wx - c.x, wy - c.y) < c.r)));
        xy.textContent = `x ${wx.toFixed(2)}  y ${wy.toFixed(2)} mm` + (under ? `  ·  ${under.name}` : '');
      }
      if (gh && e.pointerId === gh.id) { gh.q = [wx, wy]; if (!gh.raf) gh.raf = requestAnimationFrame(() => { gh && (gh.raf = 0, gh.q && (hmode === 'turn' ? turnTo : reshapeTo)(gh.q)); }); return; }
      if (hdrag && e.pointerId === hdrag.id) { dragHandle(wx, wy); return; }
      if (hmode === 'reshape') { if (!ptrs.size && e.pointerType !== 'touch') { const h = hitHandle(wx, wy, 16); if (h !== hhov) { hhov = h; dirty = true; cv.classList.toggle('grabbable', !!h); if (h) htip(htxt(h)); else htip(null); } } }
      else if (!ptrs.size && e.pointerType !== 'touch') { const now = performance.now(); if (now - hovT > 90) { hovT = now; const pk = grab(wx, wy, 12 / view.s, hmode === 'reshape', true); cv.classList.toggle('grabbable', !!pk); } }
      if (!ptrs.has(e.pointerId)) return;
      ptrs.set(e.pointerId, [e.clientX, e.clientY]);
      if (!g) return;
      const a = [...ptrs.values()];
      if (g.n === 1 && a.length === 1) { view.x = g.vx - (a[0][0] - g.x) / view.s; view.y = g.vy + (a[0][1] - g.y) / view.s; }
      else if (g.n === 2 && a.length >= 2) {
        const d = Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]), mx = (a[0][0] + a[1][0]) / 2 - r.left, my = (a[0][1] + a[1][1]) / 2 - r.top;
        view.s = Math.min(400, Math.max(0.05, g.s * d / g.d));
        // keep the world point that was under the fingers' midpoint under the midpoint now
        view.x = g.w[0] - (mx - cv.clientWidth / 2) / view.s; view.y = g.w[1] + (my - cv.clientHeight / 2) / view.s;
      }
      dirty = true;
    });
    const up = e => {
      if (hdrag && e.pointerId === hdrag.id) { hdrag = null; cv.classList.remove('grabbing'); setTimeout(() => htip(null), 1200); rebuildSoon(30); dirty = true; return; }
      if (gh && e.pointerId === gh.id) {
        const hs = gh.hist, a0 = hs[0], a1 = hs[hs.length - 1], dt = (a1[0] - a0[0]) / 1000, vel = hmode === 'turn' && dt > 0.01 && performance.now() - a1[0] < 80 ? (a1[1] - a0[1]) / dt : 0;
        coast = Math.abs(vel) > 0.8 ? vel : 0; if (gh.was) setPlay(true); gh = null; cv.classList.remove('grabbing'); if (hmode === 'reshape') setTimeout(() => htip(null), 1500); dirty = true; return;
      }
      ptrs.delete(e.pointerId); rebase(); };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up); cv.addEventListener('lostpointercapture', up);
    cv.addEventListener('dblclick', fit);
    document.getElementById('gfit').onclick = fit;
    document.getElementById('g100').onclick = () => { view.s = 96 / 25.4; dirty = true; };
    const play = document.getElementById('gplay');
    const setPlay = v => { playing = v; play.textContent = playing ? '❚❚' : '▶'; play.classList.toggle('on', !playing); };
    play.onclick = () => setPlay(!playing);
    document.getElementById('grev').onclick = () => dir *= -1;
    if (window.MNTheme) MNTheme.scan(app);
    window.addEventListener('mn-theme', () => { dirty = true; });
    const helpBox = document.getElementById('ghelpbox');
    const helpB = document.getElementById('ghelp');
    helpB.onclick = () => { helpBox.hidden = !helpBox.hidden; helpB.classList.toggle('on', !helpBox.hidden); helpB.setAttribute('aria-expanded', !helpBox.hidden); };
    document.addEventListener('keydown', e => {
      if (/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
      const k = e.key.toLowerCase();
      if (e.code === 'Space') { e.preventDefault(); setPlay(!playing); }
      else if (k === 'f') fit(); else if (k === '1') document.getElementById('g100').click();
      else if (k === 'g' || k === 'c' || k === 'l') { const key = { g: 'grid', c: 'guides', l: 'labels' }[k]; S[key] = S[key] ? 0 : 1; changed(); }
      else if (k === 'escape') { closePops(); helpBox.hidden = true; }
      else if (k === 't' || k === 'r') { const b = document.querySelector(`[data-hm="${k === 't' ? 'turn' : 'reshape'}"]`); if (b) b.click(); }
    });

    /* ---------- drawing ---------- */
    const d = {   // helper handed to model().guides, in world units; sizes in screen pixels
      line(x1, y1, x2, y2, o) { o = o || {}; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); stroke(o); },
      circle(x, y, r, o) { ctx.beginPath(); ctx.arc(x, y, Math.max(r, 0.01), 0, Math.PI * 2); stroke(o || {}); },
      path(pts, o) { if (pts.length < 2) return; ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); if (o && o.close) ctx.closePath(); stroke(o || {}); },
      dot(x, y, r, color) { ctx.beginPath(); ctx.arc(x, y, (r || 3) / view.s, 0, Math.PI * 2); ctx.fillStyle = color || css('--red'); ctx.fill(); },
      cross(x, y, r) { r = (r || 10) / view.s; this.line(x - r, y, x + r, y, { w: 0.8 }); this.line(x, y - r, x, y + r, { w: 0.8 }); this.circle(x, y, r * 0.45, { w: 0.8 }); },
      text(s, x, y, o) { o = o || {}; ctx.save(); ctx.translate(x, y); ctx.scale(1 / view.s, -1 / view.s); if (o.rot) ctx.rotate(o.rot); ctx.fillStyle = o.color || css('--faint'); ctx.font = `${o.weight || 500} ${o.size || 12}px "DM Mono", ui-monospace, monospace`; ctx.textAlign = o.align || 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s, 0, 0); ctx.restore(); },
      // dimension line between two points, offset sideways by off screen pixels, with the length written on it
      dim(p, q, text, off) {
        const L = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1, nx = -(q[1] - p[1]) / L, ny = (q[0] - p[0]) / L, o = (off || 30) / view.s, a = 7 / view.s;
        const P = [p[0] + nx * o, p[1] + ny * o], Q = [q[0] + nx * o, q[1] + ny * o], col = css('--dim');
        this.line(p[0] + nx * o * 0.2, p[1] + ny * o * 0.2, P[0] + nx * a, P[1] + ny * a, { color: col, w: 0.7 }); this.line(q[0] + nx * o * 0.2, q[1] + ny * o * 0.2, Q[0] + nx * a, Q[1] + ny * a, { color: col, w: 0.7 });
        this.line(P[0], P[1], Q[0], Q[1], { color: col, w: 0.9 });
        const ux = (q[0] - p[0]) / L, uy = (q[1] - p[1]) / L;
        [[P, 1], [Q, -1]].forEach(([E, s]) => this.path([[E[0] + s * ux * a * 1.6 + nx * a * 0.5, E[1] + s * uy * a * 1.6 + ny * a * 0.5], E, [E[0] + s * ux * a * 1.6 - nx * a * 0.5, E[1] + s * uy * a * 1.6 - ny * a * 0.5]], { color: col, w: 0.9 }));
        let ang = Math.atan2(uy, ux); if (ang > Math.PI / 2 || ang < -Math.PI / 2) ang += Math.PI;
        const m = [(P[0] + Q[0]) / 2 + nx * 9 / view.s, (P[1] + Q[1]) / 2 + ny * 9 / view.s];
        this.text(text, m[0], m[1], { color: col, size: 11, rot: -ang, weight: 500 });
      },
      labels: () => !!S.labels, guides: () => !!S.guides, scale: () => view.s, hlTag: () => hlTag
    };
    function stroke(o) { ctx.lineWidth = (o.w || 1) / view.s; ctx.strokeStyle = o.color || css('--faint'); ctx.setLineDash((o.dash || []).map(v => v / view.s)); ctx.stroke(); ctx.setLineDash([]); }
    function grid() {
      const w = cv.clientWidth, h = cv.clientHeight, [x0, y1] = toWorld(0, 0), [x1, y0] = toWorld(w, h);
      let step = 1; while (step * view.s < 8 && step < 1e6) step *= 10;
      [[step, css('--grid1')], [step * 10, css('--grid2')]].forEach(([st, col]) => {
        ctx.beginPath(); for (let x = Math.floor(x0 / st) * st; x <= x1; x += st) { ctx.moveTo(x, y0); ctx.lineTo(x, y1); } for (let y = Math.floor(y0 / st) * st; y <= y1; y += st) { ctx.moveTo(x0, y); ctx.lineTo(x1, y); }
        ctx.lineWidth = 1 / view.s; ctx.strokeStyle = col; ctx.stroke();
      });
      return step;
    }
    const fills = () => ({ base: css('--fill'), accent: css('--fill2'), dark: css('--fill3') });
    function render() {
      const w = cv.clientWidth, h = cv.clientHeight, F = fills();
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = css('--canvas'); ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.setTransform(dpr * view.s, 0, 0, -dpr * view.s, dpr * (w / 2 - view.x * view.s), dpr * (h / 2 + view.y * view.s));
      let step = 1; while (step * view.s < 8 && step < 1e6) step *= 10;
      if (S.grid) grid();
      document.getElementById('gscale').textContent = `grid ${step} mm · zoom ${(view.s / (96 / 25.4) * 100).toFixed(0)}%`;
      const M = def.model(S, t), ink = css('--ink');
      const lit = hl ? M.parts.map((p, i) => { try { return !!hl(p, i); } catch (e) { return false; } }) : null, any = lit && lit.some(Boolean);
      const shapePath = s => { ctx.beginPath(); [s.outer].concat(s.holes || []).forEach(r => { r.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); }); (s.circles || []).forEach(c => { ctx.moveTo(c.x + c.r, c.y); ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2, true); }); };
      M.parts.forEach((p, i) => { if (any && lit[i]) return; ctx.globalAlpha = any ? 0.3 : 1; p.shapes.forEach(s => { shapePath(s); ctx.fillStyle = F[p.fill] || F.base; ctx.fill('evenodd'); ctx.lineWidth = 1.3 / view.s; ctx.strokeStyle = ink; ctx.stroke(); }); });
      ctx.globalAlpha = 1;
      if (any) M.parts.forEach((p, i) => { if (!lit[i]) return; p.shapes.forEach(s => {   // the highlighted part, drawn last with a glow
        shapePath(s); ctx.fillStyle = css('--hl'); ctx.fill('evenodd');
        ctx.save(); ctx.shadowColor = css('--red'); ctx.shadowBlur = 12 * dpr; ctx.lineWidth = 2.6 / view.s; ctx.strokeStyle = css('--red'); ctx.stroke(); ctx.restore();
      }); });
      drawHandles();
      if (gh && gh.P) { ctx.beginPath(); ctx.arc(gh.P[0], gh.P[1], 10 / view.s, 0, TAU); ctx.fillStyle = 'rgba(232,93,36,.25)'; ctx.fill(); ctx.lineWidth = 2 / view.s; ctx.strokeStyle = css('--red'); ctx.stroke(); }
      M.parts.forEach(p => (p.curves || []).forEach(c => d.path(c, { color: css('--red'), w: 1.2, dash: [5, 3] })));
      M.parts.forEach(p => {   // cut lines (slits) and closed cut-outs drawn as cuts; engraving in blue
        (p.cuts || []).forEach(c => { ctx.beginPath(); c.pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); if (c.closed) { ctx.closePath(); ctx.fillStyle = css('--canvas'); ctx.fill(); } ctx.lineWidth = 1.1 / view.s; ctx.strokeStyle = ink; ctx.stroke(); });
        (p.etch || []).forEach(c => d.path(c, { color: '#3b7dd8', w: 1 }));
        if (p.lines && p.guideLines) p.lines.forEach(c => d.path(c, { color: css('--dim'), w: 1, dash: [6, 4] }));
      });
      if (M.guides) M.guides(d);
      if (M.overlay) { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); M.overlay(ctx, w, h, css); }   // screen-space extras such as a motion chart
      lastParts = M.parts;
    }
    function tick(now) {
      const dt = Math.min((now - last) / 1000, 0.05); last = now;
      if (playing && S.rpm > 0) { t += dir * dt * S.rpm / 60 * Math.PI * 2; dirty = true; }
      if (coast) { t += coast * dt; coast *= Math.exp(-dt * 1.6); if (Math.abs(coast) < 0.3) coast = 0; dirty = true; }
      if (dirty) { render(); dirty = false; }
      requestAnimationFrame(tick);
    }

    /* ---------- export / file ---------- */
    const menu = document.getElementById('gmenu');
    // the three drop-downs in the top bar (generator switcher, more, export): one open at a time, closed by a click outside or Escape
    const pops = [...app.querySelectorAll('.gbar .gpop')].map(p => ({ btn: p.querySelector(':scope > button'), m: p.querySelector('.gmenu') }));
    const closePops = keep => pops.forEach(p => { if (p.m !== keep) { p.m.hidden = true; p.btn.setAttribute('aria-expanded', 'false'); } });
    pops.forEach(p => p.btn.onclick = e => { e.stopPropagation(); const open = p.m.hidden; closePops(); p.m.hidden = !open; p.btn.setAttribute('aria-expanded', String(open)); });
    document.addEventListener('click', e => { if (!pops.some(p => p.m.contains(e.target))) closePops(); });
    app.querySelectorAll('.gmenu [data-close]').forEach(b => b.onclick = () => closePops());
    app.querySelector('[data-act="guide"]').onclick = () => { closePops(); document.getElementById('gguide').click(); };
    app.querySelectorAll('.gmore > button').forEach(b => b.addEventListener('click', () => closePops()));
    document.getElementById('glayout').onclick = e => { const b = e.target.closest('button'); if (!b) return; layout = b.dataset.v; document.querySelectorAll('#glayout button').forEach(x => x.classList.toggle('on', x === b)); nestOn(); };
    const nestOn = () => { document.getElementById('gnest').hidden = layout !== 'nest'; };
    const exportParts = () => {
      if (layout !== 'nest') return def.exportParts ? def.exportParts(S, layout) : def.model(S, 0).parts;
      const flat = def.exportParts ? def.exportParts(S, 'flat') : def.model(S, 0).parts;
      return G.nest(flat, { gap: +document.getElementById('gngap').value, sheetW: +document.getElementById('gnw').value, rotate: document.getElementById('gnrot').checked });
    };
    const base = () => def.id + '-' + (def.fileTag ? def.fileTag(S) : 'design');
    const doExport = x => {
      const P = exportParts();
      const LP = x === 'stl' ? P : G.addLabels(P, { legend: document.getElementById('glg').checked, etch: document.getElementById('gle').checked, h: +document.getElementById('gleh').value || 5 });
      if (x === 'svg') G.download(base() + '.svg', G.toSVG(LP), 'image/svg+xml');
      if (x === 'dxf') G.download(base() + '.dxf', G.toDXF(LP), 'application/dxf');
      if (x === 'stl') G.download(base() + '.stl', G.toSTL(P), 'model/stl');
      const ns = layout === 'nest' && G._nestStats ? `, nested ${Math.round(G._nestStats.w)} × ${Math.round(G._nestStats.h)} mm, ${Math.round(G._nestStats.use * 100)}% material use${G._nestStats.skipped ? ', ' + G._nestStats.skipped + ' part(s) did not fit' : ''}` : ''; toast(`${x.toUpperCase()} saved${LP._missed && LP._missed.length ? ' (no room to etch ' + LP._missed.join(', ') + ')' : ''}${x === 'stl' ? ` (${G._lastTriCount} triangles)` : ''}${ns}${level !== 'ok' ? ` · ${level === 'block' ? 'likely to fail as it is' : 'some things to check'}: test a piece first` : ''}`);
    };
    /* check my design */
    const chk = document.getElementById('gchk');
    try { if (localStorage.getItem('mn-check') === '0') chk.checked = false; } catch (e) { }
    chk.onchange = () => { try { localStorage.setItem('mn-check', chk.checked ? '1' : '0'); } catch (e) { } };
    const cd = document.createElement('div'); cd.className = 'gguide gcheckd'; cd.hidden = true; cd.setAttribute('role', 'dialog'); cd.setAttribute('aria-modal', 'true'); cd.setAttribute('aria-label', 'Check my design');
    cd.innerHTML = '<div class="gg-box"><header><div><h2>Check my design</h2><p class="gc-sum"></p></div><div class="gg-acts"><button type="button" data-a="go" class="primary"></button><button type="button" data-a="close">Back to the design</button></div></header>'
      + '<div class="gc-bed"><span class="gc-bl"></span><label><input type="number" data-bed="0" min="10" step="10"> ×</label><label><input type="number" data-bed="1" min="10" step="10"> mm</label></div><div class="gg-body"></div></div>';
    document.body.appendChild(cd);
    let cFmt = null, cBed = null;
    const closeCheck = () => { cd.hidden = true; document.body.classList.remove('gg-open'); };
    const runCheck = () => {
      let res, html; const P = (() => { try { return exportParts(); } catch (e) { return null; } })();
      try { res = G.checkDesign(def, S, { format: cFmt, layout, exported: P || undefined, bed: cBed || undefined }); html = G.checkHTML(res); } catch (e) { console.error(e); res = null; html = '<p>The check could not be run for this design.</p>'; }
      cBed = res ? res.bed.slice() : cBed;
      const body = cd.querySelector('.gg-body'), top = body.scrollTop; body.innerHTML = html; body.scrollTop = top;
      const sum = cd.querySelector('.gc-sum'), go = cd.querySelector('[data-a="go"]');
      if (res) { const ok = res.total - res.fails; sum.innerHTML = res.block ? `<span class="no blk">✕ Likely to fail as it is: ${res.block} serious problem${res.block > 1 ? 's' : ''}${res.fails > res.block ? ` and ${res.fails - res.block} more to check` : ''}</span>` : res.fails ? `<span class="no">✗ ${res.fails} of ${res.total} checks need attention</span>` : `<span class="ok">✓ All ${res.total} checks passed</span>`; sum.dataset.state = res.block ? 'blk' : res.fails ? 'no' : 'ok'; }
      go.hidden = !cFmt; if (cFmt) go.textContent = (res && res.fails ? 'Export ' + cFmt.toUpperCase() + ' anyway' : 'Export ' + cFmt.toUpperCase()); go.classList.toggle('primary', !(res && res.block)); go.classList.toggle('gdanger', !!(res && res.block));
      cd.querySelector('.gc-bl').textContent = cFmt === 'stl' ? 'Largest print bed:' : 'Sheet size:';
      cd.querySelectorAll('[data-bed]').forEach(i => { if (document.activeElement !== i && cBed) i.value = cBed[+i.dataset.bed]; });
    };
    const openCheck = x => { cFmt = x; cBed = null; cd.hidden = false; document.body.classList.add('gg-open'); runCheck(); cd.querySelector('[data-a="close"]').focus(); };
    cd.addEventListener('click', e => { const a = e.target.dataset && e.target.dataset.a; if (e.target === cd || a === 'close') closeCheck(); if (a === 'go') { const x = cFmt; closeCheck(); doExport(x); } });
    cd.addEventListener('input', e => { if (e.target.dataset.bed != null) { const v = [...cd.querySelectorAll('[data-bed]')].map(i => Math.max(10, +i.value || 10)); cBed = v; runCheck(); } });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !cd.hidden) closeCheck(); });
    document.getElementById('gcheck').onclick = () => { menu.hidden = true; openCheck(null); };
    menu.querySelectorAll('[data-x]').forEach(b => b.onclick = () => { closePops(); if (chk.checked) openCheck(b.dataset.x); else doExport(b.dataset.x); });
    /* build guide dialog */
    const gd = document.createElement('div'); gd.className = 'gguide'; gd.hidden = true; gd.setAttribute('role', 'dialog'); gd.setAttribute('aria-modal', 'true'); gd.setAttribute('aria-label', 'Build guide');
    gd.innerHTML = '<div class="gg-box"><header><div><h2>Build guide</h2><p></p></div><div class="gg-acts"><button type="button" data-a="print">Print or save as PDF</button><button type="button" data-a="close">Close</button></div></header><div class="gg-body"></div></div>';
    document.body.appendChild(gd);
    const closeGuide = () => { gd.hidden = true; document.body.classList.remove('gg-open'); };
    document.getElementById('gguide').onclick = () => {
      let html; try { html = G.buildGuide(def, S); } catch (e) { html = '<p>The guide could not be built for this design.</p>'; console.error(e); }
      gd.querySelector('.gg-body').innerHTML = html; gd.querySelector('header p').textContent = def.title + ' · ' + (def.fileTag ? def.fileTag(S) : 'design');
      if (window.MNGloss) MNGloss.apply(gd.querySelector('.gg-body')); gd.hidden = false; document.body.classList.add('gg-open'); gd.querySelector('.gg-body').scrollTop = 0; gd.querySelector('[data-a="close"]').focus();
    };
    gd.addEventListener('click', e => { if (e.target === gd || e.target.dataset.a === 'close') closeGuide(); if (e.target.dataset.a === 'print') window.print(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !gd.hidden) closeGuide(); });
    document.getElementById('gsave').onclick = () => { G.download(base() + '.json', JSON.stringify({ generator: def.id, version: 1, settings: S }, null, 2), 'application/json'); toast('Design saved'); };
    const file = document.getElementById('gfile');
    document.getElementById('gopen').onclick = () => file.click();
    file.onchange = () => { const f = file.files[0]; if (!f) return; f.text().then(txt => { try { const j = JSON.parse(txt); if (j.generator && j.generator !== def.id) return toast('That file is for the ' + j.generator + ' generator'); load(j.settings || j); toast('Design opened'); } catch (e) { toast('Could not read that file'); } }); file.value = ''; };
    document.getElementById('greset').onclick = () => { load(D); t = 0; toast('Back to the default design'); };
    document.getElementById('gshare').onclick = () => { writeHash(); (navigator.clipboard ? navigator.clipboard.writeText(location.href) : Promise.reject()).then(() => toast('Link copied'), () => toast('Copy the address bar to share')); };
    function load(o) { Object.keys(D).forEach(k => { if (o[k] !== undefined && typeof o[k] === typeof D[k]) S[k] = o[k]; }); if (def.fixState) def.fixState(S); changed(); fit(); }
    function toast(msg) { const el = document.getElementById('gtoast'); el.textContent = msg; el.classList.add('on'); clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.remove('on'), 1800); }

    /* ---------- settings live in the URL hash so a link reproduces the design ---------- */
    function writeHash() { const diff = {}; Object.keys(D).forEach(k => { if (S[k] !== D[k]) diff[k] = S[k]; }); history.replaceState(null, '', Object.keys(diff).length ? '#' + encodeURIComponent(JSON.stringify(diff)) : location.pathname); }
    function readHash() { try { return location.hash.length > 1 ? JSON.parse(decodeURIComponent(location.hash.slice(1))) : {}; } catch (e) { return {}; } }
    window.addEventListener('hashchange', () => load(Object.assign({}, D, readHash())));

    fit(); requestAnimationFrame(tick);
    return { S, refresh: changed };
  };
})();
