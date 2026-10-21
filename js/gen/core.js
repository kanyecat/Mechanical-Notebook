/* Mechanical Notebook generators: workspace shell (top bar, drawing canvas, inspector, results), animation, save/share/export. MIT licence.
   A generator calls GEN.create({ id, title, defaults, panel(ui, S), model(S, t), info(S), exportParts(S, layout), fileTag(S) }).
     model(S, t) returns { parts: [{ name, shapes, curves, thickness, fill }], guides(d) } in world mm, y up, posed for time t.
     info(S) returns rows [label, value, warn]. Rows with warn = true are listed as problems. */
(function () {
  const G = window.GEN = window.GEN || {};
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  G.LIST = [['gears', 'Gears'], ['linkages', 'Linkages'], ['cams', 'Cams'], ['pulleys', 'Pulleys']];
  // the colour theme (paper by default here, or blueprint) is shared with the rest of the site: see js/theme.js

  G.create = function (def) {
    const D = def.defaults, S = Object.assign({}, D), H = readHash();
    Object.keys(D).forEach(k => { if (H[k] !== undefined && typeof H[k] === typeof D[k]) S[k] = H[k]; });
    let t = 0, playing = true, dir = 1, last = performance.now(), layout = 'flat';
    const app = document.getElementById('gen');
    app.innerHTML = `
      <header class="gbar">
        <a class="gbrand" href="../index.html" title="Back to all mechanisms">Mechanical <b>Notebook</b></a>
        <nav class="gtabs">${G.LIST.map(([id, name]) => `<a href="${id}.html" class="${id === def.id ? 'on' : ''}">${name}</a>`).join('')}</nav>
        <div class="gacts">
          <button id="gopen" title="Open a saved design (.json)">Open</button>
          <button id="gsave" title="Download this design as .json">Save</button>
          <button id="gshare" title="Copy a link that reopens this exact design">Share link</button>
          <div class="gpop"><button id="gexp" class="primary">Export ▾</button>
            <div class="gmenu" id="gmenu" hidden>
              <div class="gmh">Layout</div>
              <div class="gseg" id="glayout"><button data-v="flat" class="on">Laid flat</button><button data-v="nest" title="Pack the parts tightly to save sheet material">Nested<//button><button data-v="assembled">As assembled</button></div>
              <div class="gnest" id="gnest" hidden>
                <label>Gap between parts<span class="gin"><input type="number" id="gngap" value="2" min="0" max="50" step="0.5"><span>mm</span></span></label>
                <label>Sheet width<span class="gin"><input type="number" id="gnw" value="" min="0" step="10" placeholder="auto"><span>mm</span></span></label>
                <label class="gck"><input type="checkbox" id="gnrot" checked> Turn parts to fit</label>
                <p>Small parts can sit inside the holes of big ones. Leave a gap of at least 2× your kerf.</p>
              </div>
              <button data-x="svg"><b>SVG</b><span>Outlines for laser cutters and vector apps</span></button>
              <button data-x="dxf"><b>DXF</b><span>CAD and CNC. One layer per part, true circles</span></button>
              <button data-x="stl"><b>STL</b><span>3D printing. Each part extruded to its thickness</span></button>
              <p>All files are in millimetres.</p>
            </div></div>
        </div>
        <span class="gtheme" data-theme-picker></span>
        <input type="file" id="gfile" accept=".json,application/json" hidden>
      </header>
      <main class="gwork">
        <div class="gview">
          <canvas id="gcv" aria-label="${def.title} drawing"></canvas>
          <div class="gtitle"><h1>${def.title}</h1><p>${def.subtitle || ''}</p></div>
          <div class="gtool" role="toolbar">
            <button id="gplay" title="Play / pause (Space)">❚❚</button>
            <button id="grev" title="Reverse direction">⇄</button>
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
            <b>Mouse and touch</b><p>Scroll or pinch to zoom, drag to pan, double-click to fit.<br>Drag a field name left or right to change its value.</p></div>
          <div class="gstat"><span id="gxy">x — y —</span><span id="gscale"></span></div>
          <div class="gtoast" id="gtoast" role="status"></div>
        </div>
        <section class="gres" aria-label="Results"><div class="gcards" id="gcards"></div><div class="gwarn" id="gwarn"></div></section>
        <aside class="gside"><div class="gsideh">Properties</div><div id="gctl"></div>
          <details class="gsec"><summary>Reset</summary><div class="gbody"><button id="greset" class="gwide">Back to the default design</button></div></details>
          <footer class="gfoot">Free and open source · MIT</footer></aside>
      </main>`;

    /* ---------- inspector controls ---------- */
    const ctl = document.getElementById('gctl'), listeners = [];
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
        row.innerHTML = `<label title="${o.help ? o.help + ' — ' : ''}Drag left or right to change">${label}</label><div class="gin"><input type="number" step="${o.step || 1}" min="${o.min ?? ''}" max="${o.max ?? ''}"><span>${o.unit || ''}</span></div>`;
        const inp = row.querySelector('input'), lab = row.querySelector('label'); inp.value = S[key]; if (o.hl) row._hl = o.hl;
        const set = v => { v = +v; if (!isFinite(v)) return; if (o.min != null) v = Math.max(o.min, v); if (o.max != null) v = Math.min(o.max, v); if (o.int) v = Math.round(v); S[key] = +v.toFixed(6); changed(); };
        inp.oninput = () => { if (inp.value !== '') set(inp.value); };
        inp.onchange = () => { inp.value = S[key]; };
        let sc = null;   // drag the label to scrub the value
        lab.addEventListener('pointerdown', e => { sc = [e.clientX, S[key]]; lab.setPointerCapture(e.pointerId); e.preventDefault(); });
        lab.addEventListener('pointermove', e => { if (!sc) return; const st = o.step || 1; set(sc[1] + Math.round((e.clientX - sc[0]) / 6) * st); inp.value = S[key]; });
        lab.addEventListener('pointerup', () => sc = null);
        if (o.help) { const h = document.createElement('p'); h.className = 'ghelp'; h.textContent = o.help; row.appendChild(h); }
        listeners.push(() => { if (document.activeElement !== inp) inp.value = S[key]; if (o.show) row.hidden = !o.show(S); });
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
    const showInfo = () => {
      const rows = def.info(S);
      // warn = true: orange value and listed as a problem; 'soft': orange value only; 2: a problem message only listed on the right
      cards.innerHTML = rows.filter(r => r[2] !== 2).map(([k, v, w]) => `<div class="gcard${w ? ' warn' : ''}"><span>${k}</span><b>${v}</b></div>`).join('');
      const probs = rows.filter(r => r[2] && r[2] !== 'soft');   // 'soft' = highlight the value only
      warn.innerHTML = probs.length ? probs.map(([k, v]) => `<div><b>⚠ ${k}</b> ${v}</div>`).join('') : '<div class="ok">✓ No problems found</div>';
      if (window.MNGloss) { MNGloss.apply(cards); MNGloss.apply(warn); }   // underlined terms show a plain-language definition
    };
    listeners.push(showInfo);
    listeners.forEach(f => f());

    /* ---------- view: pan / zoom ---------- */
    const cv = document.getElementById('gcv'), ctx = cv.getContext('2d');
    let view = { x: 0, y: 0, s: 3 }, dpr = 1;
    const resize = () => { dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = cv.clientWidth * dpr; cv.height = cv.clientHeight * dpr; dirty = true; };
    new ResizeObserver(resize).observe(cv); resize();
    const fit = () => {
      // keep clear of the title (top), the toolbar (bottom) and room for dimension lines
      const b = G.bounds(def.model(S, t).parts), w = cv.clientWidth, h = cv.clientHeight, mx = 60, top = w < 600 ? 60 : 120, bot = 130;
      view.s = Math.min((w - 2 * mx) / Math.max(1, b.x1 - b.x0), (h - top - bot) / Math.max(1, b.y1 - b.y0));
      view.x = (b.x0 + b.x1) / 2; view.y = (b.y0 + b.y1) / 2 - (bot - top) / 2 / view.s; dirty = true;
    };
    const toWorld = (px, py) => [view.x + (px - cv.clientWidth / 2) / view.s, view.y - (py - cv.clientHeight / 2) / view.s];
    cv.addEventListener('wheel', e => { e.preventDefault(); const r = cv.getBoundingClientRect(), [wx, wy] = toWorld(e.clientX - r.left, e.clientY - r.top); view.s = Math.min(400, Math.max(0.05, view.s * Math.exp(-e.deltaY * 0.0015))); const [nx, ny] = toWorld(e.clientX - r.left, e.clientY - r.top); view.x += wx - nx; view.y += wy - ny; dirty = true; }, { passive: false });
    let lastParts = []; const xy = document.getElementById('gxy');
    const inPoly = (pt, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > pt[1]) !== (b[1] > pt[1]) && pt[0] < (b[0] - a[0]) * (pt[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
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
    const up = e => { ptrs.delete(e.pointerId); rebase(); };
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
      else if (k === 'escape') { menu.hidden = true; helpBox.hidden = true; }
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
      let step = 1; while (step * view.s < 8) step *= 10;
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
      let step = 1; while (step * view.s < 8) step *= 10;
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
      M.parts.forEach(p => (p.curves || []).forEach(c => d.path(c, { color: css('--red'), w: 1.2, dash: [5, 3] })));
      if (M.guides) M.guides(d);
      if (M.overlay) { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); M.overlay(ctx, w, h, css); }   // screen-space extras such as a motion chart
      lastParts = M.parts;
    }
    function tick(now) {
      const dt = Math.min((now - last) / 1000, 0.05); last = now;
      if (playing && S.rpm > 0) { t += dir * dt * S.rpm / 60 * Math.PI * 2; dirty = true; }
      if (dirty) { render(); dirty = false; }
      requestAnimationFrame(tick);
    }

    /* ---------- export / file ---------- */
    const menu = document.getElementById('gmenu');
    document.getElementById('gexp').onclick = e => { e.stopPropagation(); menu.hidden = !menu.hidden; };
    document.addEventListener('click', e => { if (!menu.hidden && !menu.contains(e.target)) menu.hidden = true; });
    document.getElementById('glayout').onclick = e => { const b = e.target.closest('button'); if (!b) return; layout = b.dataset.v; document.querySelectorAll('#glayout button').forEach(x => x.classList.toggle('on', x === b)); nestOn(); };
    const nestOn = () => { document.getElementById('gnest').hidden = layout !== 'nest'; };
    const exportParts = () => {
      if (layout !== 'nest') return def.exportParts ? def.exportParts(S, layout) : def.model(S, 0).parts;
      const flat = def.exportParts ? def.exportParts(S, 'flat') : def.model(S, 0).parts;
      return G.nest(flat, { gap: +document.getElementById('gngap').value, sheetW: +document.getElementById('gnw').value, rotate: document.getElementById('gnrot').checked });
    };
    const base = () => def.id + '-' + (def.fileTag ? def.fileTag(S) : 'design');
    menu.querySelectorAll('[data-x]').forEach(b => b.onclick = () => {
      const x = b.dataset.x, P = exportParts();
      if (x === 'svg') G.download(base() + '.svg', G.toSVG(P), 'image/svg+xml');
      if (x === 'dxf') G.download(base() + '.dxf', G.toDXF(P), 'application/dxf');
      if (x === 'stl') G.download(base() + '.stl', G.toSTL(P), 'model/stl');
      menu.hidden = true; const ns = layout === 'nest' && G._nestStats ? `, nested ${Math.round(G._nestStats.w)} × ${Math.round(G._nestStats.h)} mm, ${Math.round(G._nestStats.use * 100)}% material use${G._nestStats.skipped ? ', ' + G._nestStats.skipped + ' part(s) did not fit' : ''}` : ''; toast(`${x.toUpperCase()} saved${x === 'stl' ? ` (${G._lastTriCount} triangles)` : ''}${ns}`);
    });
    document.getElementById('gsave').onclick = () => { G.download(base() + '.json', JSON.stringify({ generator: def.id, version: 1, settings: S }, null, 2), 'application/json'); toast('Design saved'); };
    const file = document.getElementById('gfile');
    document.getElementById('gopen').onclick = () => file.click();
    file.onchange = () => { const f = file.files[0]; if (!f) return; f.text().then(txt => { try { const j = JSON.parse(txt); if (j.generator && j.generator !== def.id) return toast('That file is for the ' + j.generator + ' generator'); load(j.settings || j); toast('Design opened'); } catch (e) { toast('Could not read that file'); } }); file.value = ''; };
    document.getElementById('greset').onclick = () => { load(D); t = 0; toast('Back to the default design'); };
    document.getElementById('gshare').onclick = () => { writeHash(); (navigator.clipboard ? navigator.clipboard.writeText(location.href) : Promise.reject()).then(() => toast('Link copied'), () => toast('Copy the address bar to share')); };
    function load(o) { Object.keys(D).forEach(k => { if (o[k] !== undefined && typeof o[k] === typeof D[k]) S[k] = o[k]; }); changed(); fit(); }
    function toast(msg) { const el = document.getElementById('gtoast'); el.textContent = msg; el.classList.add('on'); clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.remove('on'), 1800); }

    /* ---------- settings live in the URL hash so a link reproduces the design ---------- */
    function writeHash() { const diff = {}; Object.keys(D).forEach(k => { if (S[k] !== D[k]) diff[k] = S[k]; }); history.replaceState(null, '', Object.keys(diff).length ? '#' + encodeURIComponent(JSON.stringify(diff)) : location.pathname); }
    function readHash() { try { return location.hash.length > 1 ? JSON.parse(decodeURIComponent(location.hash.slice(1))) : {}; } catch (e) { return {}; } }
    window.addEventListener('hashchange', () => load(Object.assign({}, D, readHash())));

    fit(); requestAnimationFrame(tick);
    return { S, refresh: changed };
  };
})();
