/* Mechanisms engine: drawing helpers, animation loop, graph, page mounting */
(function () {
  const TAU = Math.PI * 2;
  /* Blueprint palette. Names kept from the paper version: ink = line colour, red = accent (amber), white = part fill. */
  const COL = { ink: '#eef5ff', red: '#ffd166', paper: '#1b4b82', white: '#1f5590', faint: 'rgba(238,245,255,.55)', hatch: 'rgba(238,245,255,.32)', blue: '#8fd3ff' };
  const MM = { registry: {}, TAU, COL };
  MM.register = function (m) { MM.registry[m.slug] = m; };
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
    c.font = (o.weight || 500) + ' ' + (o.size || 12) + 'px ' + (o.font || 'ui-monospace,Menlo,Consolas,monospace');
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
    const v = m.view || { w: 700, h: 540 }; const f = fit(canvas, v.w, v.h);
    const ctx = canvas.getContext('2d'); const s = canvas.width / v.w;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(s, 0, 0, s, 0, 0);
    const g = new Gfx(ctx, v); g.state = m._state || (m._state = {});
    m.draw(g, a, p);
  };

  /* ---------- graph ---------- */
  MM.graphFrame = function (canvas, m, a, p) {
    const gr = m.graph; if (!gr) return;
    const W = 640, H = 150; fit(canvas, W, H);
    const ctx = canvas.getContext('2d'); const s = canvas.width / W;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.setTransform(s, 0, 0, s, 0, 0);
    const g = new Gfx(ctx, { w: W, h: H });
    const x0 = 44, x1 = W - 120, y0 = 22, y1 = H - 14; const per = gr.period || TAU, sh = gr.shift || 0;
    const lo = gr.min, hi = gr.max, Y = v => y1 - (v - lo) / (hi - lo) * (y1 - y0), X = t => x0 + t / per * (x1 - x0);
    g.text(gr.title.toUpperCase(), 0, 8, { size: 11, weight: 600 });
    (gr.ticks || []).forEach(t => { g.line(x0, Y(t.v), x1, Y(t.v), { w: 0.7, dash: [2, 4], color: COL.faint }); g.text(t.label, x0 - 6, Y(t.v), { size: 10, align: 'right', color: COL.faint }); });
    gr.series.forEach(se => {
      const pts = []; for (let i = 0; i <= 240; i++) { const t = i / 240 * per; pts.push([X(t), Y(se.f(t - sh, p))]); }
      g.trace(pts, { color: se.color || COL.red, w: se.w || 2, dash: se.dash });
    });
    const t = (((a + sh) % per) + per) % per;
    g.line(X(t), y0 - 6, X(t), y1, { w: 0.9, color: COL.faint });
    gr.series.forEach(se => g.dot(X(t), Y(se.f(t - sh, p)), 4.5, se.color || COL.red));
    const r = gr.readout ? gr.readout(a, p) : null;
    if (r) { g.text(r.big, W - 112, 62, { size: 22, weight: 800, color: COL.red, font: 'Barlow Condensed,Arial Narrow,sans-serif' }); g.text(r.small, W - 112, 84, { size: 10, color: COL.faint }); }
    gr.series.forEach((se, i) => { if (se.name) { g.line(W - 112, 108 + i * 14, W - 94, 108 + i * 14, { color: se.color || COL.red, w: 2, dash: se.dash }); g.text(se.name, W - 88, 108 + i * 14, { size: 10 }); } });
  };

  /* ---------- page mount ---------- */
  // mechanisms that have a generator page, with starting settings
  const MAKE = { 'spur-gears': ['gears'], 'rack-pinion': ['gears', { type: 'rack' }], 'four-bar': ['linkages'], 'slider-crank': ['linkages', { kind: 'slider' }], 'cam-follower': ['cams'] };
  MM.mount = function (slug) {
    const m = MM.registry[slug], cat = MM.cat(), idx = cat.findIndex(c => c.slug === slug), meta = cat[idx];
    const prev = cat[(idx - 1 + cat.length) % cat.length], next = cat[(idx + 1) % cat.length];
    document.title = meta.name + ' · Mechanical Notebook';
    const params = m.params || []; const P = {}; params.forEach(q => P[q.key] = q.value);
    const fmt = (q, v) => (q.step < 1 ? (+v).toFixed(q.step < 0.1 ? 2 : 1) : String(v)) + (q.unit || '');
    const paramHTML = q => q.options
      ? `<div class="param"><span class="plabel">${q.label}</span><div class="seg" data-seg="${q.key}">${q.options.map(([v, l]) => `<button type="button" data-v="${v}" class="${v === q.value ? 'on' : ''}">${l}</button>`).join('')}</div></div>`
      : `<label class="param"><span class="plabel">${q.label}</span><input data-k="${q.key}" type="range" min="${q.min}" max="${q.max}" step="${q.step}" value="${q.value}"><output data-o="${q.key}">${fmt(q, q.value)}</output></label>`;
    const root = document.getElementById('app');
    root.innerHTML = `
    <div class="topbar"><a href="../index.html">← All mechanisms</a><span>${meta.category}</span><a href="${next.slug}.html">Next →</a></div>
    <header class="phead">
      <div class="kicker">No. ${meta.num}</div>
      <h1 class="title">${meta.name}</h1>
      <p class="lede">${meta.fn}</p>
    </header>
    <div class="stage">
      <section class="box drawing">
        <canvas id="main"></canvas>
        <div class="controls">
          <button id="play" type="button">Pause</button>
          <button id="rev" type="button" class="ghost">Reverse</button>
          <label>Speed <input id="speed" type="range" min="0.1" max="3" step="0.05" value="1"><output id="speedv">1.0×</output></label>
          <label>Angle <input id="scrub" type="range" min="0" max="360" step="1" value="0"><output id="angv">0°</output></label>
        </div>
        ${params.length ? `<div class="adjust"><h3>Adjust the design</h3>${params.map(paramHTML).join('')}</div>` : ''}
      </section>
      <aside class="side">
        <div class="box now"><h3>Right now</h3><div id="ro">&nbsp;</div></div>
        <div class="box notes"><h3>How it works</h3><ol>${meta.notes.map(n => `<li>${n}</li>`).join('')}</ol></div>
        <div class="box used"><h3>${meta.knownLabel || 'Used in'}</h3><p>${meta.used}</p></div>
        ${MAKE[slug] ? `<a class="box make" href="../generators/${MAKE[slug][0]}.html${MAKE[slug][1] ? '#' + encodeURIComponent(JSON.stringify(MAKE[slug][1])) : ''}"><h3>Make one</h3><p>Design your own in the ${{ gears: 'gear', linkages: 'linkage', cams: 'cam' }[MAKE[slug][0]]} generator and export SVG, DXF or STL →</p></a>` : ''}
      </aside>
    </div>
    ${m.graph ? `<section class="box graphbox"><h3>Motion graph</h3><canvas id="graph"></canvas><p class="hint">The marker follows the drawing. Drag the angle slider to step through one cycle.</p></section>` : ''}
    ${MM.math && MM.math[slug] ? '<section class="box mathbox"><h3>Do the math</h3><div id="learn"></div></section>' : ''}
    <div class="titleblock">
      <div><small>Category</small>${meta.category}</div><div><small>Sheet</small>${idx + 1} of ${cat.length}</div>
      <div class="brand">Mechanical&nbsp;<span>Notebook</span></div><div><small>Dwg no.</small><div class="dwg">M-${meta.num}</div></div>
    </div>
    <div class="pager"><a href="${prev.slug}.html">← ${prev.name}</a><a href="${next.slug}.html">${next.name} →</a></div>`;
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
    }
    root.querySelectorAll('[data-k]').forEach(el => el.oninput = () => setParam(el.dataset.k, el.value));
    root.querySelectorAll('[data-seg]').forEach(seg => seg.onclick = e => { const b = e.target.closest('button'); if (b) setParam(seg.dataset.seg, b.dataset.v); });
    const lh = document.getElementById('learn');
    if (lh && MM.learn) learn = MM.learn(lh, slug, { m, P, setParam: (k, v) => setParam(k, v, 'learn'), getAngle: () => a });
    document.addEventListener('keydown', e => { if (e.code === 'Space' && !/INPUT|BUTTON/.test(document.activeElement.tagName)) { e.preventDefault(); setPlaying(!playing); } });
    function render() {
      MM.frame(cv, m, a, P); if (gc) MM.graphFrame(gc, m, a, P);
      const r = m.graph && m.graph.readout ? m.graph.readout(a, P) : null; if (r) ro.innerHTML = `<b>${r.big}</b><span>${r.small}</span>`;
      const deg = ((a % period) + period) % period / period * 360;
      sc.value = deg; angv.textContent = Math.round(deg) + '°';
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
    const cat = MM.cat(), grid = document.getElementById('grid'), fl = document.getElementById('filters');
    const cats = ['All'].concat([...new Set(cat.map(c => c.category))]); let cur = 'All';
    fl.innerHTML = cats.map(c => `<button data-c="${c}" class="${c === 'All' ? 'on' : ''}">${c}</button>`).join('');
    grid.innerHTML = cat.map(c => `<a class="card" data-c="${c.category}" href="pages/${c.slug}.html"><canvas data-s="${c.slug}"></canvas><div class="meta"><div class="num">NO. ${c.num}</div><div class="name">${c.name}</div><div class="fn">${c.fn}</div></div></a>`).join('');
    fl.onclick = e => { const b = e.target.closest('button'); if (!b) return; cur = b.dataset.c; fl.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); grid.querySelectorAll('.card').forEach(k => k.style.display = (cur === 'All' || k.dataset.c === cur) ? '' : 'none'); };
    const hover = new Map(); const cvs = [...grid.querySelectorAll('canvas')];
    const params = m => { const P = {}; (m.params || []).forEach(q => P[q.key] = q.value); return P; };
    cvs.forEach(cv => {
      const m = MM.registry[cv.dataset.s], per = m.period || TAU; const P = params(m);
      cv.style.aspectRatio = (m.view ? m.view.w + '/' + m.view.h : '700/540');
      cv._a = per * 0.17; MM.frame(cv, m, cv._a, P);
      const card = cv.parentElement;
      card.onmouseenter = () => hover.set(cv, true); card.onmouseleave = () => hover.delete(cv);
      card.addEventListener('touchstart', () => hover.set(cv, true), { passive: true });
    });
    let last = performance.now();
    (function loop(now) {
      const dt = Math.min((now - last) / 1000, 0.05); last = now;
      hover.forEach((_, cv) => { const m = MM.registry[cv.dataset.s]; cv._a += dt * (TAU / 5) * ((m.period || TAU) / TAU); MM.frame(cv, m, cv._a, params(m)); });
      requestAnimationFrame(loop);
    })(last);
    window.addEventListener('resize', () => cvs.forEach(cv => { const m = MM.registry[cv.dataset.s]; MM.frame(cv, m, cv._a, params(m)); }));
  };

  window.MM = MM;
})();
