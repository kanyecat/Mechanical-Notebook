/* Mechanisms engine: drawing helpers, animation loop, graph, page mounting */
(function () {
  const TAU = Math.PI * 2;
  /* Drawing colours for each theme. ink = lines, red = accent, white = part fill, paper = background (used for cut-outs). */
  const PALETTES = {
    blueprint: { ink: '#eef5ff', red: '#ffd166', paper: '#1b4b82', white: '#1f5590', faint: 'rgba(238,245,255,.55)', hatch: 'rgba(238,245,255,.32)', blue: '#8fd3ff' },
    paper: { ink: '#1b2638', red: '#d9480f', paper: '#f7f5ef', white: '#ffffff', faint: 'rgba(27,38,56,.5)', hatch: 'rgba(27,38,56,.3)', blue: '#2f6fb3' }
  };
  const themeName = () => (document.documentElement && document.documentElement.dataset.theme === 'paper') ? 'paper' : 'blueprint';
  const COL = Object.assign({}, PALETTES[themeName()]);   // mechanism files keep a reference to this object, so it is updated in place
  const MM = { registry: {}, TAU, COL };
  // a see-through version of a palette colour, e.g. MM.tint('red', .4)
  MM.tint = (name, a) => { const h = COL[name].replace('#', ''); return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`; };
  MM.applyTheme = function () {
    const next = PALETTES[themeName()], rev = {}; Object.keys(COL).forEach(k => rev[COL[k]] = k);
    // graph lines were given palette colours when each mechanism loaded; move them to the new palette
    Object.values(MM.registry).forEach(m => m.graph && m.graph.series.forEach(se => { if (se.color && rev[se.color]) se.color = next[rev[se.color]]; }));
    Object.assign(COL, next);
  };
  if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('mn-theme', () => MM.applyTheme());
  MM.register = function (m) { MM.registry[m.slug] = m; };
  /* a 0..1..0 cycle for assembly animations: holds at both ends, eased in between. a is the animation angle (a full turn is one cycle) */
  MM.cycle = function (a, hold) {
    const h = hold == null ? 0.14 : hold, t = ((a / TAU) % 1 + 1) % 1; let u;
    if (t < h) u = 0; else if (t < 0.5) u = (t - h) / (0.5 - h); else if (t < 0.5 + h) u = 1; else u = 1 - (t - 0.5 - h) / (0.5 - h);
    return u * u * (3 - 2 * u);
  };
  MM.cat = () => window.MM_CATALOG.filter(c => MM.registry[c.slug]);

  /* ---------- drawing helper bound to a canvas context ---------- */
  function Gfx(ctx, view) {
    this.c = ctx; this.view = view;
  }
  const G = Gfx.prototype;
  G.style = function (o) {
    const c = this.c; o = o || {};
    c.lineWidth = o.w || 1.6; c.strokeStyle = o.color || COL.ink; c.fillStyle = o.fill || 'transparent';
    c.setLineDash(o.dash || []); c.lineCap = 'round'; c.lineJoin = 'round';
  };
  G.line = function (x1, y1, x2, y2, o) { const c = this.c; this.style(o); c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); c.setLineDash([]); };
  G.circle = function (x, y, r, o) {
    const c = this.c; o = o || {}; this.style(o); c.beginPath(); c.arc(x, y, Math.max(r, 0.01), 0, TAU);
    if (o.fill) c.fill(); c.stroke(); c.setLineDash([]);
  };
  G.arc = function (x, y, r, a0, a1, o) { const c = this.c; this.style(o); c.beginPath(); c.arc(x, y, r, a0, a1, o && o.ccw); c.stroke(); c.setLineDash([]); };
  G.pivot = function (x, y, r, o) {
    r = r || 5; o = o || {};
    this.circle(x, y, r, { fill: COL.white, w: 1.6 });
    this.circle(x, y, r * 0.38, { fill: o.color || COL.ink, w: 0.5, color: o.color || COL.ink });
  };
  G.dot = function (x, y, r, color) { this.circle(x, y, r || 5, { fill: color || COL.red, color: color || COL.red, w: 1 }); };
  G.fixed = function (x, y, size) {
    size = size || 10; const c = this.c; this.style({ w: 1.6, fill: COL.white });
    c.beginPath(); c.moveTo(x, y); c.lineTo(x - size, y + size * 1.6); c.lineTo(x + size, y + size * 1.6); c.closePath(); c.fill(); c.stroke();
    this.line(x - size * 1.5, y + size * 1.6, x + size * 1.5, y + size * 1.6, { w: 1.6 });
    for (let i = -1; i <= 1; i += 0.5) this.line(x + i * size * 1.5, y + size * 1.6, x + i * size * 1.5 - 5, y + size * 1.6 + 7, { w: 1 });
    this.pivot(x, y, 5);
  };
  /* a link: rounded bar between two points with pivots at the ends */
  G.bar = function (x1, y1, x2, y2, w, o) {
    w = w || 12; o = o || {}; const c = this.c;
    const a = Math.atan2(y2 - y1, x2 - x1), d = Math.hypot(x2 - x1, y2 - y1);
    c.save(); c.translate(x1, y1); c.rotate(a);
    this.style({ w: 1.6, fill: o.fill || COL.white, color: o.color || COL.ink });
    c.beginPath(); c.roundRect(-w / 2, -w / 2, d + w, w, w / 2); c.fill(); c.stroke(); c.restore();
    if (!o.nopivot) { this.pivot(x1, y1, w * 0.34); this.pivot(x2, y2, w * 0.34); }
  };
  G.poly = function (pts, o) {
    o = o || {}; const c = this.c; this.style({ w: o.w || 1.6, fill: o.fill, color: o.color, dash: o.dash });
    c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]));
    if (o.close !== false) c.closePath();
    if (o.fill) c.fill(); c.stroke(); c.setLineDash([]);
    if (o.hatch) this.hatchPath(() => { c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); }, o.hatch);
  };
  /* a filled, hatched rectangle (the usual picture of a cut part). o: fill, hatch:false, sp (hatch spacing), color, w, dash */
  G.rect = function (x, y, w, h, o) {
    o = o || {};
    this.poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], { fill: o.fill === undefined ? COL.white : o.fill, color: o.color, w: o.w, dash: o.dash, hatch: o.hatch === false ? null : { spacing: o.sp || 6, cx: x + w / 2, cy: y + h / 2 } });
  };
  /* hatch the interior of a path made by pathFn (which must call beginPath and build path) */
  G.hatchPath = function (pathFn, o) {
    o = o === true ? {} : o; const c = this.c, sp = o.spacing || 6, ang = o.angle == null ? Math.PI / 4 : o.angle;
    c.save(); pathFn(); c.clip();
    const R = Math.max(this.view.w, this.view.h) * 1.5;
    c.translate(o.cx || this.view.w / 2, o.cy || this.view.h / 2); c.rotate(ang);
    c.strokeStyle = COL.hatch; c.lineWidth = 0.8; c.beginPath();
    for (let y = -R; y < R; y += sp) { c.moveTo(-R, y); c.lineTo(R, y); }
    c.stroke(); c.restore();
  };
  G.text = function (s, x, y, o) {
    o = o || {}; const c = this.c;
    c.save(); c.fillStyle = o.color || COL.ink; c.textAlign = o.align || 'left'; c.textBaseline = o.base || 'middle';
    c.font = (o.weight || 500) + ' ' + ((o.size || 12) * (this.ts || 1)).toFixed(1) + 'px ' + (o.font || 'ui-monospace,Menlo,Consolas,monospace');
    if (o.rot) { c.translate(x, y); c.rotate(o.rot); c.fillText(s, 0, 0); } else c.fillText(s, x, y);
    c.restore();
  };
  G.ground = function (x1, x2, y) {
    this.line(x1, y, x2, y, { w: 1.8 });
    for (let x = x1; x < x2; x += 8) this.line(x, y, x - 6, y + 8, { w: 0.9 });
  };
  G.centre = function (x, y, len) {
    len = len || 60; this.line(x - len, y, x + len, y, { w: 0.8, dash: [10, 3, 2, 3], color: COL.faint });
    this.line(x, y - len, x, y + len, { w: 0.8, dash: [10, 3, 2, 3], color: COL.faint });
  };
  G.arrow = function (x1, y1, x2, y2, o) {
    o = o || {}; this.line(x1, y1, x2, y2, o); const a = Math.atan2(y2 - y1, x2 - x1), s = 8, c = this.c;
    this.style({ w: o.w || 1.6, color: o.color, fill: o.color || COL.ink });
    c.beginPath(); c.moveTo(x2, y2); c.lineTo(x2 - s * Math.cos(a - 0.4), y2 - s * Math.sin(a - 0.4)); c.lineTo(x2 - s * Math.cos(a + 0.4), y2 - s * Math.sin(a + 0.4)); c.closePath(); c.fill();
  };
  /* dimension line between two points with an arrowhead at each end, a label, and a sideways offset (off, in pixels) */
  G.dim = function (x1, y1, x2, y2, label, off, o) {
    o = o || {}; const d = Math.hypot(x2 - x1, y2 - y1) || 1, nx = -(y2 - y1) / d * (off || 0), ny = (x2 - x1) / d * (off || 0), c = o.color || COL.blue;
    const ax = x1 + nx, ay = y1 + ny, bx = x2 + nx, by = y2 + ny;
    if (off) { this.line(x1, y1, ax + (ax - x1) * 0.15, ay + (ay - y1) * 0.15, { w: 0.8, color: c }); this.line(x2, y2, bx + (bx - x2) * 0.15, by + (by - y2) * 0.15, { w: 0.8, color: c }); }
    const ux = (x2 - x1) / d, uy = (y2 - y1) / d, ar = (px, py, k) => { const q = this.c; this.style({ w: 1, color: c, fill: c }); q.beginPath(); q.moveTo(px, py); q.lineTo(px - k * 7 * ux + 2.6 * uy, py - k * 7 * uy - 2.6 * ux); q.lineTo(px - k * 7 * ux - 2.6 * uy, py - k * 7 * uy + 2.6 * ux); q.closePath(); q.fill(); };
    this.line(ax, ay, bx, by, { w: 1, color: c }); ar(ax, ay, -1); ar(bx, by, 1);
    if (label) { const tx = (ax + bx) / 2 + (o.tx || 0), ty = (ay + by) / 2 + (o.ty == null ? -9 : o.ty); this.text(label, tx, ty, { size: o.size || 11, align: 'center', color: c, weight: 600 }); }
  };
  G.curvedArrow = function (x, y, r, a0, a1, o) { this.arc(x, y, r, a0, a1, o); const ex = x + r * Math.cos(a1), ey = y + r * Math.sin(a1), t = a1 + (a1 > a0 ? Math.PI / 2 : -Math.PI / 2); this.arrow(ex - Math.cos(t) * 2, ey - Math.sin(t) * 2, ex + Math.cos(t) * 2, ey + Math.sin(t) * 2, o); };
  G.trace = function (pts, o) {
    if (pts.length < 2) return; const c = this.c; this.style(o || { color: COL.red, w: 1.6 });
    c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.stroke(); c.setLineDash([]);
  };
  /* gear outline: teeth count n, module m, rotation rot. ring=true draws internal teeth (teeth point inward). */
  G.gearPath = function (cx, cy, n, m, rot, ring) {
    const c = this.c, rp = n * m / 2, add = m, ded = m * 1.15, step = TAU / n;
    c.beginPath();
    for (let i = 0; i < n; i++) {
      const a = rot + i * step;
      const ro = ring ? rp - add : rp + add, ri = ring ? rp + ded : rp - ded;
      const pts = [[ri, 0], [ri, 0.12], [ro, 0.26], [ro, 0.5], [ri, 0.64], [ri, 1]];
      pts.forEach((p, k) => {
        const aa = a + (k === 0 ? 0 : p[1]) * step; const rr = p[0];
        const x = cx + rr * Math.cos(aa), y = cy + rr * Math.sin(aa);
        (i === 0 && k === 0) ? c.moveTo(x, y) : c.lineTo(x, y);
      });
    }
    c.closePath();
  };
  G.gear = function (cx, cy, n, m, rot, o) {
    o = o || {}; const c = this.c; this.style({ w: 1.6, fill: o.fill === undefined ? COL.white : o.fill });
    this.gearPath(cx, cy, n, m, rot, o.ring);
    if (!o.ring) { c.fill(); } c.stroke();
    if (o.hatch) this.hatchPath(() => this.gearPath(cx, cy, n, m, rot, false), { spacing: 5, cx, cy });
    if (o.pitch) this.circle(cx, cy, n * m / 2, { dash: [4, 3], color: COL.faint, w: 0.8 });
  };

  MM.Gfx = Gfx;

  /* ---------- canvas fitting ---------- */
  function fit(canvas, w, h) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2), cw = canvas.clientWidth || w, ch = h ? cw * h / w : canvas.clientHeight;
    if (h) canvas.style.height = ch + 'px';
    const pw = Math.round(cw * dpr), ph = Math.round(ch * dpr);
    if (canvas.width !== pw || canvas.height !== ph) { canvas.width = pw; canvas.height = ph; }
    return { dpr, cw, ch };
  }

  /* ---------- render one frame of mechanism ---------- */
  MM.frame = function (canvas, m, a, p) {
    const v = m.view || { w: 700, h: 540 }; let s, ox = 0, oy = 0;
    if (canvas.hasAttribute('data-box')) {          // fit the whole drawing inside the canvas box set by CSS (cards on the home page)
      const dpr = Math.min(window.devicePixelRatio || 1, 2), cw = canvas.clientWidth || 300, ch = canvas.clientHeight || 225;
      const pw = Math.round(cw * dpr), ph = Math.round(ch * dpr); if (canvas.width !== pw || canvas.height !== ph) { canvas.width = pw; canvas.height = ph; }
      s = Math.min(pw / v.w, ph / v.h) * 0.96; ox = (pw - v.w * s) / 2; oy = (ph - v.h * s) / 2;
    } else { fit(canvas, v.w, v.h); s = canvas.width / v.w; }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(s, 0, 0, s, ox, oy);
    const g = new Gfx(ctx, v); g.state = m._state || (m._state = {});
    // on a phone the drawing is shrunk to fit, so labels are drawn bigger to stay readable (not on home-page thumbnails)
    if (!canvas.hasAttribute('data-box')) { const cw = canvas.clientWidth || v.w; g.ts = Math.max(1, Math.min(1.45, 0.55 * v.w / cw)); }
    m.draw(g, a, p);
  };

  /* ---------- graph ---------- */
  MM.graphFrame = function (canvas, m, a, p) {
    const gr = m.graph; if (!gr) return;
    // narrow screens: a smaller drawing width (so text is bigger), no side readout (the Right now box shows it) and the legend on top
    const narrow = (canvas.clientWidth || 640) < 520, W = narrow ? 360 : 640, H = narrow ? 190 : 150; fit(canvas, W, H);
    const ctx = canvas.getContext('2d'); const s = canvas.width / W;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.setTransform(s, 0, 0, s, 0, 0);
    const g = new Gfx(ctx, { w: W, h: H });
    const x0 = 44, x1 = narrow ? W - 10 : W - 120, y0 = narrow ? 46 : 22, y1 = H - 14; const per = gr.period || TAU, sh = gr.shift || 0;
    const lo = gr.min, hi = gr.max, Y = v => y1 - (v - lo) / (hi - lo) * (y1 - y0), X = t => x0 + t / per * (x1 - x0);
    g.text(gr.title.toUpperCase(), 0, 8, { size: narrow ? Math.min(11, W / (gr.title.length * 0.64)) : 11, weight: 600 });   // shrink a long title to fit
    (gr.ticks || []).forEach(t => { g.line(x0, Y(t.v), x1, Y(t.v), { w: 0.7, dash: [2, 4], color: COL.faint }); g.text(t.label, x0 - 6, Y(t.v), { size: 10, align: 'right', color: COL.faint }); });
    gr.series.forEach(se => {
      const pts = []; for (let i = 0; i <= 240; i++) { const t = i / 240 * per; pts.push([X(t), Y(se.f(t - sh, p))]); }
      g.trace(pts, { color: se.color || COL.red, w: se.w || 2, dash: se.dash });
    });
    const t = (((a + sh) % per) + per) % per;
    g.line(X(t), y0 - 6, X(t), y1, { w: 0.9, color: COL.faint });
    gr.series.forEach(se => g.dot(X(t), Y(se.f(t - sh, p)), 4.5, se.color || COL.red));
    if (narrow) { let lx = 0; gr.series.forEach(se => { if (!se.name) return; g.line(lx, 28, lx + 16, 28, { color: se.color || COL.red, w: 2, dash: se.dash }); g.text(se.name, lx + 21, 28, { size: 10.5 }); lx += 30 + se.name.length * 6.6; }); return; }
    const r = gr.readout ? gr.readout(a, p) : null;
    if (r) { g.text(r.big, W - 112, 62, { size: 22, weight: 800, color: COL.red, font: 'Barlow Condensed,Arial Narrow,sans-serif' }); g.text(r.small, W - 112, 84, { size: 10, color: COL.faint }); }
    gr.series.forEach((se, i) => { if (se.name) { g.line(W - 112, 108 + i * 14, W - 94, 108 + i * 14, { color: se.color || COL.red, w: 2, dash: se.dash }); g.text(se.name, W - 88, 108 + i * 14, { size: 10 }); } });
  };

  /* ---------- page mount ---------- */
  // mechanisms that have a generator page, with starting settings
  const MAKE = { 'spur-gears': ['gears'], 'rack-pinion': ['gears', { type: 'rack' }], 'four-bar': ['linkages'], 'slider-crank': ['linkages', { kind: 'slider' }], 'cam-follower': ['cams'], 'belt-pulleys': ['pulleys'], 'timing-belt': ['pulleys', { btype: 'timing' }], 'roller-chain': ['chains'] };
  MM.elementsCat = () => (window.MM_ELEMENTS || []).filter(c => MM.registry[c.slug]);
  MM.tricksHTML = tr => {
    const order = ['Laser cutting', 'CNC routing', '3D printing', 'Any process'], groups = {};
    tr.items.forEach(it => { const p = it.p || 'Any process', m = it.m || 'Any material'; ((groups[p] = groups[p] || {})[m] = groups[p][m] || []).push(it); });
    const card = it => `<figure class="trk"><svg viewBox="0 0 220 162" role="img" aria-label="${it.t}">${it.svg}</svg><figcaption><b>${it.t}</b><span>${it.x}</span>${it.tags ? `<span class="bdgs">${it.tags.map(x => `<i class="bdg">${x}</i>`).join('')}</span>` : ''}</figcaption></figure>`;
    const present = order.filter(p => groups[p]);
    const chips = present.filter(p => p !== 'Any process').length > 1 ? `<div class="filters trf" role="group" aria-label="Show ways for one process"><button type="button" class="on" data-p="">All</button>${present.filter(p => p !== 'Any process').map(p => `<button type="button" data-p="${p}">${p}</button>`).join('')}</div>` : '';
    return `<section class="box tricks" id="tricks"><h3>${tr.title}</h3>${tr.intro ? `<p class="xpintro">${tr.intro}</p>` : ''}<div class="trleg" aria-label="Colour key"><span><i class="lg-p"></i>stays in place</span><span><i class="lg-a"></i>gets inserted</span><span><i class="lg-k"></i>hole / opening</span><span><i class="lg-h"></i>guide or motion line</span></div>${chips}${present.map(p => `<div class="trgrp" data-p="${p}"><h4>${p === 'Any process' ? 'Any process' : p}</h4>${Object.keys(groups[p]).map(m => `<h5>${m}</h5><div class="trks">${groups[p][m].map(card).join('')}</div>`).join('')}</div>`).join('')}</section>`;
  };
  MM.tricksInit = root => { const box = root.querySelector('#tricks'); if (!box) return; box.querySelectorAll('.trf button').forEach(b => b.onclick = () => { box.querySelectorAll('.trf button').forEach(x => x.classList.toggle('on', x === b)); box.querySelectorAll('.trgrp').forEach(g => { g.hidden = !!b.dataset.p && g.dataset.p !== b.dataset.p && g.dataset.p !== 'Any process'; }); }); };
  MM.fabCat = () => (window.MM_FAB || []).filter(c => MM.registry[c.slug]);
  MM.mount = function (slug) {
    const m = MM.registry[slug], isEl = (window.MM_ELEMENTS || []).some(c => c.slug === slug), isFab = (window.MM_FAB || []).some(c => c.slug === slug);
    const cat = isFab ? MM.fabCat() : isEl ? MM.elementsCat() : MM.cat(), idx = cat.findIndex(c => c.slug === slug), meta = cat[idx];
    const prev = cat[(idx - 1 + cat.length) % cat.length], next = cat[(idx + 1) % cat.length], pre = isFab ? 'F' : isEl ? 'E' : 'M';
    document.title = meta.name + ' · Mechanical Notebook';
    const params = m.params || []; const P = {}; params.forEach(q => P[q.key] = q.value);
    const fmt = (q, v) => (q.step < 1 ? (+v).toFixed(q.step < 0.1 ? 2 : 1) : String(v)) + (q.unit || '');
    const paramHTML = q => q.options
      ? `<div class="param"><span class="plabel">${q.label}</span><div class="seg" data-seg="${q.key}">${q.options.map(([v, l]) => `<button type="button" data-v="${v}" class="${v === q.value ? 'on' : ''}">${l}</button>`).join('')}</div></div>`
      : `<label class="param"><span class="plabel">${q.label}</span><input data-k="${q.key}" type="range" min="${q.min}" max="${q.max}" step="${q.step}" value="${q.value}"><output data-o="${q.key}">${fmt(q, q.value)}</output></label>`;
    const root = document.getElementById('app');
    const apps = Array.isArray(meta.app) ? meta.app : [meta.app || meta.used];
    root.innerHTML = `
    <nav class="crumbs" aria-label="Breadcrumb"><a href="../${isFab ? 'fabrication' : isEl ? 'elements' : 'mechanisms'}.html">${isFab ? 'Fabrication' : isEl ? 'Elements' : 'Mechanisms'}</a><span>/</span><span>${meta.category}</span>
      <span class="crnav"><a href="${prev.slug}.html" title="${prev.name}">← Prev</a><a href="${next.slug}.html" title="${next.name}">Next →</a></span></nav>
    <header class="phead">
      <div class="kicker">${isFab ? 'Technique' : isEl ? 'Element' : 'No.'} ${meta.num}</div>
      <h1 class="title">${meta.name}</h1>
      <p class="lede">${meta.fn}</p>
      ${isFab && meta.process ? `<div class="procs">${meta.process.map(x => `<span>${x}</span>`).join('')}</div>` : ''}
    </header>
    <div class="stage">
      <section class="box drawing">
        <canvas id="main" aria-label="Animated drawing of the ${meta.name}"></canvas>
        <div class="controls">
          <button id="play" type="button">Pause</button>
          <button id="rev" type="button" class="ghost">Reverse</button>
          <label>Speed <input id="speed" type="range" min="0.1" max="3" step="0.05" value="1"><output id="speedv">1.0×</output></label>
          <label>Position <input id="scrub" type="range" min="0" max="360" step="1" value="0"><output id="angv">0°</output></label>
        </div>
        ${params.length ? `<div class="adjust"><h3>Adjust the design</h3>${params.map(paramHTML).join('')}</div>` : ''}
      </section>
      <aside class="side">
        <div class="box now"><h3>Right now</h3><div id="ro">&nbsp;</div></div>
        <div class="box notes"><h3>How it works</h3><ol>${meta.notes.map(n => `<li>${n.replace(/^(Good to know|Try it):/, '<b>$1:</b>')}</li>`).join('')}</ol></div>
        <div class="box used"><h3>${isFab ? 'Where it is used' : 'Application'}</h3><ul>${apps.map(x => `<li>${x}</li>`).join('')}</ul></div>
        ${MAKE[slug] ? `<a class="box make" href="../generators/${MAKE[slug][0]}.html${MAKE[slug][1] ? '#' + encodeURIComponent(JSON.stringify(MAKE[slug][1])) : ''}"><h3>Make one</h3><p>Design your own in the ${{ gears: 'gear', linkages: 'linkage', cams: 'cam', pulleys: 'pulley', chains: 'chain and sprocket' }[MAKE[slug][0]]} generator and export SVG, DXF or STL →</p></a>` : ''}
      </aside>
    </div>
    ${(m.panels || []).map((pn, i) => `<section class="box xpanel" id="${pn.id || 'xp' + i}"><h3>${pn.title}</h3>${pn.intro ? `<p class="xpintro">${pn.intro}</p>` : ''}<div class="xpbody"></div></section>`).join('')}
    ${isFab && window.MM_TRICKS && MM_TRICKS[slug] ? MM.tricksHTML(MM_TRICKS[slug]) : ''}
    ${m.graph ? `<section class="box graphbox"><h3>Motion graph</h3><canvas id="graph"></canvas><p class="hint">The marker follows the drawing. Drag the position slider to step through one cycle.</p></section>` : ''}
    ${MM.math && MM.math[slug] ? '<section class="box mathbox"><h3>Do the math</h3><div id="learn"></div></section>' : ''}
    ${meta.fun ? `<section class="box fun"><h3>Fun fact</h3><p>${meta.fun}</p></section>` : ''}
    <div class="titleblock">
      <div><small>Category</small>${meta.category}</div><div><small>Sheet</small>${idx + 1} of ${cat.length}</div>
      <div class="brand">Mechanical&nbsp;<span>Notebook</span></div><div><small>Dwg no.</small><div class="dwg">${pre}-${meta.num}</div></div>
    </div>
    <div class="pager"><a href="${prev.slug}.html">← ${prev.name}</a><a href="${next.slug}.html">${next.name} →</a></div>`;
    if (window.MNTheme) MNTheme.scan(root);
    if (window.MNGloss) ['.lede', '.notes', '.used', '.fun'].forEach(s => MNGloss.apply(root.querySelector(s)));
    // extra panels (a dimension table, a chart of types...): html(P) is redrawn when a design value changes, init(body) runs once
    const panels = (m.panels || []).map((pn, i) => ({ pn, body: root.querySelectorAll('.xpanel .xpbody')[i] }));
    const drawPanels = first => panels.forEach(({ pn, body }) => {
      if (pn.html && (first || pn.live)) { body.innerHTML = pn.html(P); if (window.MNGloss) MNGloss.apply(body); }
      if (first && pn.init) pn.init(body, P, { setParam: (k, v) => setParam(k, v) });
    });
    drawPanels(true);
    if (MM.tricksInit) MM.tricksInit(root);
    const cv = document.getElementById('main'), gc = document.getElementById('graph');
    let a = 0, playing = true, dir = 1, speed = 1, last = performance.now();
    const play = document.getElementById('play'), sp = document.getElementById('speed'), sc = document.getElementById('scrub'), ro = document.getElementById('ro');
    const spv = document.getElementById('speedv'), angv = document.getElementById('angv');
    const period = m.period || TAU;
    const setPlaying = v => { playing = v; play.textContent = playing ? 'Pause' : 'Play'; };
    play.onclick = () => setPlaying(!playing);
    document.getElementById('rev').onclick = () => dir *= -1;
    sp.oninput = () => { speed = +sp.value; spv.textContent = speed.toFixed(1) + '×'; };
    sc.oninput = () => { a = +sc.value / 360 * period; setPlaying(false); };
    let learn = null;
    // set a design value from anywhere (slider, option buttons, calculator) and keep every control in step
    function setParam(key, v, from) {
      const q = params.find(x => x.key === key); if (!q) return;
      v = Math.min(q.max, Math.max(q.min, Math.round((+v - q.min) / q.step) * q.step + q.min)); v = +v.toFixed(6); P[key] = v;
      const sl = root.querySelector(`[data-k="${key}"]`); if (sl) { sl.value = v; root.querySelector(`[data-o="${key}"]`).textContent = fmt(q, v); }
      const seg = root.querySelector(`[data-seg="${key}"]`); if (seg) seg.querySelectorAll('button').forEach(x => x.classList.toggle('on', +x.dataset.v === v));
      if (learn && from !== 'learn') learn.paramChanged(key, v);
      drawPanels(false);
    }
    root.querySelectorAll('[data-k]').forEach(el => el.oninput = () => setParam(el.dataset.k, el.value));
    root.querySelectorAll('[data-seg]').forEach(seg => seg.onclick = e => { const b = e.target.closest('button'); if (b) setParam(seg.dataset.seg, b.dataset.v); });
    const lh = document.getElementById('learn');
    if (lh && MM.learn) learn = MM.learn(lh, slug, { m, P, setParam: (k, v) => setParam(k, v, 'learn'), getAngle: () => a });
    document.addEventListener('keydown', e => { if (e.code === 'Space' && !/INPUT|BUTTON|SELECT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); setPlaying(!playing); } });
    function render() {
      MM.frame(cv, m, a, P); if (gc) MM.graphFrame(gc, m, a, P);
      // Right after a tap on a link the page text is left alone: phone browsers (iPhone Safari especially) treat a page that
      // changes under the finger as a "hover" and drop the tap, so links would only highlight and not open. Canvases keep moving.
      if (performance.now() < (window.MNQuiet || 0)) return;
      const r = m.graph && m.graph.readout ? m.graph.readout(a, P) : m.readout ? m.readout(a, P) : null;
      if (r) { const h = `<b>${r.big}</b><span>${r.small}</span>`; if (h !== ro._h) { ro._h = h; ro.innerHTML = h; } }
      const deg = ((a % period) + period) % period / period * 360, dt = Math.round(deg) + '°';
      sc.value = deg; if (dt !== angv.textContent) angv.textContent = dt;
      if (learn) learn.tick(a);
    }
    function tick(now) {
      const dt = Math.min((now - last) / 1000, 0.05); last = now;
      if (playing) a += dir * speed * dt * (TAU / 5) * (period / TAU);
      render(); requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    window.addEventListener('resize', render);
  };

  /* ---------- landing page ---------- */
  MM.landing = function () {
    const ROOMS = {
      mechanisms: { cat: MM.cat(), dir: 'pages', pre: 'M', soon: ['More on the way', 'New mechanisms are added to the notebook over time.'] },
      elements: { cat: MM.elementsCat(), dir: 'elements', pre: 'E', soon: ['More on the way', 'Bushings, couplings, clutches, dowel pins and more are planned.'] },
      fabrication: { cat: MM.fabCat(), dir: 'fabrication', pre: 'F', soon: ['More techniques on the way', 'Dowels, dovetails, bearings seats, bridging, tolerances and more are planned.'] }
    };
    const card = (c, R) => `<a class="card" data-c="${c.category}" data-p="${(c.process || []).join('|')}" href="${R.dir}/${c.slug}.html"><canvas data-s="${c.slug}" data-box aria-hidden="true"></canvas><div class="meta"><div class="num">${R.pre}-${c.num} · ${c.category}</div><div class="name">${c.name}</div><div class="fn">${c.fn}</div>${c.process ? `<div class="procs">${c.process.map(x => `<span>${x}</span>`).join('')}</div>` : ''}</div></a>`;
    const soon = (t, s) => `<div class="card soon"><div class="meta"><div class="num">Coming soon</div><div class="name">${t}</div><div class="fn">${s}</div></div></div>`;
    document.querySelectorAll('[data-room]').forEach(grid => {
      const R = ROOMS[grid.dataset.room]; if (!R) return;
      grid.innerHTML = R.cat.map(c => card(c, R)).join('') + soon(R.soon[0], R.soon[1]);
      let cat = 'All', proc = 'All';
      const bar = (id, items, label, set) => { const el = document.getElementById(id); if (!el) return; el.innerHTML = ['All'].concat(items).map(c => `<button type="button" data-c="${c}" class="${c === 'All' ? 'on' : ''}" aria-pressed="${c === 'All'}">${c}</button>`).join(''); el.onclick = e => { const b = e.target.closest('button'); if (!b) return; set(b.dataset.c); el.querySelectorAll('button').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); }); apply(); }; };
      const apply = () => { let n = 0; grid.querySelectorAll('.card:not(.soon)').forEach(k => { const ok = (cat === 'All' || k.dataset.c === cat) && (proc === 'All' || (k.dataset.p || '').split('|').includes(proc)); k.style.display = ok ? '' : 'none'; if (ok) n++; }); const sk = grid.querySelector('.soon'); if (sk) sk.style.display = (cat === 'All' && proc === 'All') ? '' : 'none'; const cn = document.getElementById('roomcount'); if (cn) cn.textContent = n + (n === 1 ? ' shown' : ' shown'); };
      bar('filters', [...new Set(R.cat.map(c => c.category))], 'category', v => cat = v);
      bar('pfilters', [...new Set([].concat(...R.cat.map(c => c.process || [])))], 'process', v => proc = v);
      apply();
    });
    const hover = new Map(); const cvs = [...document.querySelectorAll('canvas[data-s]')];
    const params = m => { const P = {}; (m.params || []).forEach(q => P[q.key] = q.value); return P; };
    cvs.forEach(cv => {
      const m = MM.registry[cv.dataset.s], per = m.period || TAU;
      cv._a = per * (MM.registry[cv.dataset.s].thumb != null ? MM.registry[cv.dataset.s].thumb : 0.17); MM.frame(cv, m, cv._a, params(m));
      const host = cv.closest('a, .gencard') || cv.parentElement;
      if (cv.hasAttribute('data-live')) { hover.set(cv, 0.45); return; }
      host.addEventListener('mouseenter', () => hover.set(cv, 1)); host.addEventListener('mouseleave', () => hover.delete(cv));
      host.addEventListener('focus', () => hover.set(cv, 1)); host.addEventListener('blur', () => hover.delete(cv));
      host.addEventListener('touchstart', () => hover.set(cv, 1), { passive: true });
    });
    const still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let last = performance.now();
    (function loop(now) {
      const dt = Math.min((now - last) / 1000, 0.05); last = now;
      hover.forEach((sp, cv) => { if (still && cv.hasAttribute('data-live')) return; const m = MM.registry[cv.dataset.s]; cv._a += sp * dt * (TAU / 5) * ((m.period || TAU) / TAU); MM.frame(cv, m, cv._a, params(m)); });
      requestAnimationFrame(loop);
    })(last);
    const redraw = () => cvs.forEach(cv => { const m = MM.registry[cv.dataset.s]; MM.frame(cv, m, cv._a, params(m)); });
    window.addEventListener('resize', redraw);
    window.addEventListener('mn-theme', () => requestAnimationFrame(redraw));
  };

  window.MM = MM;
})();
