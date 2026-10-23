/* Combine page: chain mechanisms so the output of one drives the next.
   A chain is a motor angle t, then stages. A stage that "passes on" rotation has out(angle, settings) = angle of its output shaft,
   which becomes the input angle of the next stage. The last stage can be anything: it is just drawn at the angle it is given. */
(function () {
  const TAU = Math.PI * 2, MAXSTAGES = 4;
  const deg = Math.PI / 180;

  /* ---------- stages that hand rotation on ---------- */
  const gv = (() => {   // Geneva wheel angle (same maths as the Geneva page)
    const C = 230, r = C * Math.SQRT1_2;
    return a => {
      const turns = Math.floor((a + Math.PI) / TAU), phi = a - turns * TAU;
      const eps = phi <= -Math.PI / 4 ? 0 : phi >= Math.PI / 4 ? Math.PI / 2 : Math.atan2(r * Math.sin(phi), C - r * Math.cos(phi)) + Math.PI / 4;
      return turns * Math.PI / 2 + eps;
    };
  })();
  const hooke = (a, p) => {   // double Hooke's joint output (same maths as its page)
    const b = p.beta * deg, un = (x, ref) => x + Math.round((ref - x) / TAU) * TAU;
    const j = (t) => Math.atan2(Math.sin(t), Math.cos(t) * Math.cos(b));
    const m = un(j(a), a);
    return p.phase ? un(Math.atan2(Math.sin(m) * Math.cos(b), Math.cos(m)), a) : un(j(m), a);
  };
  const PLAN = [24 / 72, -24 / 48, 48 / 72];   // planetary: output ÷ input for each fixed part
  const PASS = {
    'spur-gears': { out: (a, p) => -a * p.n1 / p.n2, note: 'turns the other way' },
    'belt-pulleys': { out: (a, p) => a * (p.crossed ? -1 : 1) * 80 / p.r2, note: '' },
    'roller-chain': { out: (a, p) => a * p.n1 / p.n2, note: '' },
    'worm-gear': { out: (a, p) => a * p.starts / p.n, note: 'axes cross at 90°' },
    'planetary-gears': { out: (a, p) => a * PLAN[p.mode | 0], note: 'carrier or ring, depending on the fixed part' },
    'geneva-drive': { out: (a) => gv(a), note: 'moves in steps with rests' },
    'double-hookes-joint': { out: (a, p) => hooke(a, p), note: 'speed varies a little within each turn' }
  };
  /* ---------- what to plot when a mechanism is the last stage ---------- */
  const SERIES = { 'slider-crank': 'slider', 'quick-return': 'ram', 'cam-follower': 'lift', 'four-bar': 'rocker', 'rack-pinion': 'rack', 'scotch-yoke': 'position', 'jansen-linkage': 'foot', 'ratchet-pawl': 'wheel', peaucellier: 'P position', trammel: 'pen x', 'tusi-couple': 'P' };
  const UNIT = { 'slider-crank': 'slider position, in crank lengths', 'quick-return': 'ram position', 'cam-follower': 'follower lift', 'four-bar': 'rocker angle (degrees)', 'rack-pinion': 'rack travel (teeth)', 'scotch-yoke': 'slider position, in crank lengths', 'jansen-linkage': 'foot height', 'ratchet-pawl': 'wheel position (teeth)', peaucellier: 'tip position', trammel: 'pen position', 'tusi-couple': 'point position' };

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const isPass = s => !!PASS[s];

  /* signal plotted for the last stage, as a function of the angle fed to it */
  function signal(slug, p) {
    const m = MM.registry[slug];
    if (PASS[slug]) return { f: a => PASS[slug].out(a, p) / TAU, name: 'Output shaft, in turns' };
    const se = m.graph && (m.graph.series.find(x => x.name === SERIES[slug]) || m.graph.series[m.graph.series.length - 1]);
    return { f: a => se.f(a, p), name: UNIT[slug] || (m.graph && m.graph.title) || 'Output' };
  }

  function mount(root, recipes) {
    const meta = {}; (window.MM_CATALOG || []).forEach(c => meta[c.slug] = c);
    const slugs = MM.cat().map(c => c.slug), passSlugs = slugs.filter(isPass), endSlugs = slugs.filter(s => !isPass(s));
    const defaults = slug => { const P = {}; ((MM.registry[slug].params) || []).forEach(q => P[q.key] = q.value); return P; };
    let stages = [], playing = true, dir = 1, speed = 1, t = 0, last = performance.now(), span = 0, quietUntil = 0;
    const make = (slug, p) => { const base = MM.registry[slug]; return { slug, m: Object.create(base), P: Object.assign(defaults(slug), p || {}) }; };   // each stage gets its own copy so the same mechanism can appear twice

    /* ---------- the chain of angles ---------- */
    const angles = (th) => { const out = [th]; for (let i = 0; i < stages.length - 1; i++) out.push(PASS[stages[i].slug].out(out[i], stages[i].P)); return out; };   // input angle of each stage
    const avgRatio = i => {   // average speed of stage i's input shaft compared with the motor
      const T = TAU * 24; return (angles(T)[i] - angles(0)[i]) / T;
    };

    /* ---------- the page ---------- */
    root.innerHTML = `
    <header class="phead"><div class="kicker">Tool</div><h1 class="title">Combine mechanisms</h1>
      <p class="lede">Chain mechanisms together: the output of each stage drives the next. Start from an example or build your own, then watch the motion that comes out of the end.</p></header>
    <section class="box cmb-ex"><h3>Start from an example</h3><div class="cmb-chips" id="cmbex">${recipes.map(r => `<button type="button" data-r="${r.id}" title="${esc(r.blurb)}">${esc(r.title)}</button>`).join('')}</div></section>
    <section class="box cmb-ctl" id="cmbctl">
      <button id="cplay" type="button">Pause</button><button id="crev" type="button" class="ghost">Reverse</button>
      <label>Speed <input id="cspeed" type="range" min="0.05" max="3" step="0.05" value="1"><output id="cspeedv">1.0×</output></label>
      <label>Motor <input id="cscrub" type="range" min="0" max="360" step="1" value="0"><output id="cang">0°</output></label>
      <span class="cmb-turns" id="cturns">turn 1</span>
    </section>
    <div class="cmb-stages" id="cstages"></div>
    <div class="cmb-add" id="cadd"></div>
    <div class="cmb-res">
      <section class="box"><h3>Output motion</h3><canvas id="cgraph" aria-label="Graph of the output of the last stage"></canvas>
        <div class="cmb-gopt"><label>Graph covers <select id="cspan"><option value="0">automatic</option><option>1</option><option>2</option><option>4</option><option>8</option><option>16</option><option>32</option></select> motor turns</label></div></section>
      <section class="box"><h3>The whole chain</h3><div id="ctot"></div><p class="hint" id="cnote"></p></section>
    </div>
    <p class="cmb-foot">This chains the motion only. It does not check that the parts fit together, or that they are strong enough. Use the generators to design the real parts.</p>`;
    if (window.MNTheme) MNTheme.scan(root);
    const $ = id => root.querySelector('#' + id);
    const boxes = $('cstages'), addBox = $('cadd');

    const selHTML = (cur, i) => {
      const canEnd = i === stages.length - 1, name = s => meta[s].name;
      return `<select data-sel="${i}" aria-label="Mechanism for stage ${i + 1}"><optgroup label="Passes rotation on">${passSlugs.map(s => `<option value="${s}"${s === cur ? ' selected' : ''}>${name(s)}</option>`).join('')}</optgroup>`
        + (canEnd ? `<optgroup label="Ends the chain">${endSlugs.map(s => `<option value="${s}"${s === cur ? ' selected' : ''}>${name(s)}</option>`).join('')}</optgroup>` : '') + '</select>';
    };
    const fmtV = (q, v) => (q.step < 1 ? (+v).toFixed(q.step < 0.1 ? 2 : 1) : String(v)) + (q.unit || '');
    const paramHTML = (q, i, P) => q.options
      ? `<div class="param"><span class="plabel">${q.label}</span><div class="seg" data-i="${i}" data-seg="${q.key}">${q.options.map(([v, l]) => `<button type="button" data-v="${v}" class="${+v === +P[q.key] ? 'on' : ''}">${l}</button>`).join('')}</div></div>`
      : `<label class="param"><span class="plabel">${q.label}</span><input data-i="${i}" data-k="${q.key}" type="range" min="${q.min}" max="${q.max}" step="${q.step}" value="${P[q.key]}"><output data-o="${i}.${q.key}">${fmtV(q, P[q.key])}</output></label>`;

    function build() {
      boxes.innerHTML = stages.map((st, i) => {
        const params = st.m.params || [], mt = meta[st.slug];
        return `<article class="box cmb-st" data-i="${i}">
          <div class="cmb-sh"><span class="cmb-n">${i + 1}</span>${selHTML(st.slug, i)}${stages.length > 1 ? `<button type="button" class="cmb-x" data-rm="${i}" aria-label="Remove stage ${i + 1}" title="Remove this stage">✕</button>` : ''}</div>
          <canvas data-c="${i}" aria-label="Animated drawing of stage ${i + 1}, ${esc(mt.name)}"></canvas>
          <div class="cmb-io" data-io="${i}"></div>
          ${params.length ? `<div class="adjust">${params.map(q => paramHTML(q, i, st.P)).join('')}</div>` : ''}
          <a class="cmb-more" href="pages/${st.slug}.html">How the ${esc(mt.name)} works →</a>
        </article>`;
      }).join('');
      const lastPass = isPass(stages[stages.length - 1].slug);
      addBox.innerHTML = stages.length < MAXSTAGES && lastPass
        ? `<label>Add a stage after stage ${stages.length}: <select id="cnew"><option value="">choose a mechanism…</option><optgroup label="Passes rotation on">${passSlugs.map(s => `<option value="${s}">${meta[s].name}</option>`).join('')}</optgroup><optgroup label="Ends the chain">${endSlugs.map(s => `<option value="${s}">${meta[s].name}</option>`).join('')}</optgroup></select></label>`
        : (lastPass ? `<span class="cmb-max">The chain is full (${MAXSTAGES} stages).</span>` : `<span class="cmb-max">This stage ends the chain. Change it to a gear or belt, or remove it, to add more.</span>`);
      save(); lastIO.length = 0; lastTot = ''; draw();
    }
    const lastIO = []; let lastTot = '';
    function save() { try { history.replaceState(null, '', '#' + encodeURIComponent(JSON.stringify(stages.map(s => ({ s: s.slug, p: s.P }))))); } catch (e) { } }
    function load(list) { stages = list.slice(0, MAXSTAGES).map(x => make(x.s, x.p)); build(); }

    boxes.addEventListener('input', e => {
      const el = e.target.closest('[data-k]'); if (!el) return; const i = +el.dataset.i, st = stages[i], q = st.m.params.find(x => x.key === el.dataset.k);
      st.P[q.key] = +el.value; const o = root.querySelector(`[data-o="${i}.${q.key}"]`); if (o) o.textContent = fmtV(q, el.value); save(); lastTot = '';
    });
    boxes.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.rm != null) { stages.splice(+b.dataset.rm, 1); build(); return; }
      const seg = b.closest('[data-seg]'); if (seg && b.dataset.v != null) { const i = +seg.dataset.i; stages[i].P[seg.dataset.seg] = +b.dataset.v; seg.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); save(); lastTot = ''; }
    });
    boxes.addEventListener('change', e => {
      const s = e.target.closest('[data-sel]'); if (!s) return; const i = +s.dataset.sel; stages[i] = make(s.value); build();
    });
    addBox.addEventListener('change', e => { if (e.target.id === 'cnew' && e.target.value) { stages.push(make(e.target.value)); build(); } });
    $('cmbex').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; const r = recipes.find(x => x.id === b.dataset.r); if (r) { load(r.stages); t = 0; } });
    $('cplay').onclick = () => { playing = !playing; $('cplay').textContent = playing ? 'Pause' : 'Play'; };
    $('crev').onclick = () => dir *= -1;
    $('cspeed').oninput = e => { speed = +e.target.value; $('cspeedv').textContent = speed.toFixed(1) + '×'; };
    $('cscrub').oninput = e => { t = Math.floor(t / TAU) * TAU + (+e.target.value) / 360 * TAU; playing = false; $('cplay').textContent = 'Play'; };
    $('cspan').onchange = e => { span = +e.target.value; };
    document.addEventListener('keydown', e => { if (e.code === 'Space' && !/INPUT|BUTTON|SELECT|TEXTAREA|A/.test(document.activeElement.tagName)) { e.preventDefault(); $('cplay').click(); } });

    /* ---------- drawing ---------- */
    const quiet = () => performance.now() < (window.MNQuiet || 0);
    function fit(cv, W, H) { const dpr = Math.min(window.devicePixelRatio || 1, 2), cw = cv.clientWidth || W, ch = cw * H / W; cv.style.height = ch + 'px'; const pw = Math.round(cw * dpr), ph = Math.round(ch * dpr); if (cv.width !== pw || cv.height !== ph) { cv.width = pw; cv.height = ph; } return cv.width / W; }
    function describe(i, ang) {
      const st = stages[i], pass = isPass(st.slug), r = avgRatio(i), f = Math.abs(r);
      const inT = f < 0.0005 ? '0' : f >= 10 ? f.toFixed(0) : f >= 1 ? f.toFixed(2) : f.toFixed(3);
      let s = `Shaft in: <b>${inT}×</b> motor speed` + (i === 0 ? ' (the motor)' : '');
      if (pass) { const o = (PASS[st.slug].out(1e3 * TAU, st.P) - PASS[st.slug].out(0, st.P)) / (1e3 * TAU), fo = Math.abs(o); s += ` · shaft out: <b>${fo.toFixed(3)}×</b> its input${o < 0 ? ', reversed' : ''}`; }
      else if (f > 1e-6) s += ` · one cycle every <b>${(1 / f).toFixed(f < 0.1 ? 0 : 1)}</b> motor turns`;
      return s;
    }
    function draw() {
      const th = t, ang = angles(th);
      stages.forEach((st, i) => { const cv = boxes.querySelector(`canvas[data-c="${i}"]`); if (cv) MM.frame(cv, st.m, ang[i], st.P); });
      graph(th);
      if (quiet()) return;
      stages.forEach((st, i) => { const h = describe(i, ang[i]); if (lastIO[i] !== h) { lastIO[i] = h; const el = boxes.querySelector(`[data-io="${i}"]`); if (el) el.innerHTML = h; } });
      totals();
      const deg = (((th % TAU) + TAU) % TAU) / TAU * 360, d = Math.round(deg) + '°', tn = 'turn ' + (Math.floor(th / TAU) + 1);
      const sc = $('cscrub'); sc.value = deg; if ($('cang').textContent !== d) $('cang').textContent = d; if ($('cturns').textContent !== tn) $('cturns').textContent = tn;
    }
    function totals() {
      const n = stages.length, lastS = stages[n - 1], lastPass = isPass(lastS.slug);
      const rin = avgRatio(n - 1), fin = Math.abs(rin);
      let rows;
      if (lastPass) {
        const o1 = angles(TAU * 24)[n - 1], o0 = angles(0)[n - 1]; const ro = (PASS[lastS.slug].out(o1, lastS.P) - PASS[lastS.slug].out(o0, lastS.P)) / (TAU * 24), fo = Math.abs(ro);
        rows = [['Output shaft speed', fo.toFixed(3) + '× the motor' + (ro < 0 ? ', reversed' : '')], ['Overall ratio', fo > 0 ? (1 / fo).toFixed(fo < 1 ? 2 : 3) + ' : 1' + (fo < 1 ? ' reduction' : ' speed-up') : '–'], ['Motor turns per output turn', fo > 0 ? (1 / fo).toFixed(2) : '–']];
      } else rows = [['Last stage', meta[lastS.slug].name], ['Runs at', fin.toFixed(3) + '× the motor speed'], ['One full cycle', fin > 1e-6 ? (1 / fin).toFixed(fin < 0.1 ? 1 : 2) + ' motor turns' : '–']];
      const h = rows.map(([a, b]) => `<div class="cmb-row"><span>${a}</span><b>${b}</b></div>`).join('');
      if (h !== lastTot) { lastTot = h; $('ctot').innerHTML = h; $('cnote').textContent = stages.some(s => s.slug === 'geneva-drive') ? 'A Geneva wheel moves in steps, so speeds shown are averages over many turns.' : stages.some(s => s.slug === 'double-hookes-joint') ? 'A Hooke\'s joint at an angle varies in speed within each turn. Speeds shown are averages.' : ''; }
    }
    function graph(th) {
      const cv = $('cgraph'); if (!cv) return; const n = stages.length, lastS = stages[n - 1], sg = signal(lastS.slug, lastS.P);
      const narrow = (cv.clientWidth || 640) < 520, W = narrow ? 360 : 640, H = narrow ? 200 : 170, s = fit(cv, W, H), ctx = cv.getContext('2d');
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); ctx.setTransform(s, 0, 0, s, 0, 0);
      const g = new MM.Gfx(ctx, { w: W, h: H }), COL = MM.COL;
      const rin = Math.abs(avgRatio(n - 1)); let turns = span || (rin > 1e-4 ? Math.min(32, Math.max(1, Math.ceil(1 / rin - 1e-6))) : 4);
      if (!span) { const p2 = [1, 2, 4, 8, 16, 32].find(x => x >= turns); turns = p2 || 32; }
      const T = turns * TAU, N = 320, vals = [];
      for (let i = 0; i <= N; i++) vals.push(sg.f(angles(i / N * T)[n - 1]));
      let lo = Math.min(...vals), hi = Math.max(...vals); if (!isFinite(lo) || !isFinite(hi)) { lo = -1; hi = 1; } if (hi - lo < 1e-6) { lo -= 1; hi += 1; } const pad = (hi - lo) * 0.08; lo -= pad; hi += pad;
      const x0 = 46, x1 = W - 12, y0 = 30, y1 = H - 24, X = u => x0 + u / T * (x1 - x0), Y = v => y1 - (v - lo) / (hi - lo) * (y1 - y0);
      g.text(sg.name.toUpperCase(), 0, 8, { size: narrow ? Math.min(11, W / (sg.name.length * 0.7)) : 11, weight: 600 });
      const nt = 4; for (let k = 0; k <= nt; k++) { const v = lo + (hi - lo) * k / nt; g.line(x0, Y(v), x1, Y(v), { w: 0.7, dash: [2, 4], color: COL.faint }); g.text(Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2), x0 - 6, Y(v), { size: 10, align: 'right', color: COL.faint }); }
      for (let k = 0; k <= turns && k <= 32; k += Math.max(1, Math.round(turns / 8))) { g.line(X(k * TAU), y1, X(k * TAU), y1 + 4, { w: 0.8, color: COL.faint }); g.text(String(k), X(k * TAU), y1 + 13, { size: 10, align: 'center', color: COL.faint }); }
      g.text('motor turns', x1, H - 3, { size: 10, align: 'right', color: COL.faint });
      g.trace(vals.map((v, i) => [X(i / N * T), Y(v)]), { color: COL.red, w: 2 });
      const u = ((th % T) + T) % T, v = sg.f(angles(u)[n - 1]);
      g.line(X(u), y0 - 6, X(u), y1, { w: 0.9, color: COL.faint }); g.dot(X(u), Y(v), 4.5, COL.red);
    }
    function tick(now) {
      const dt = Math.min((now - last) / 1000, 0.05); last = now;
      if (playing) t += dir * speed * dt * (TAU / 5);
      draw(); requestAnimationFrame(tick);
    }
    window.addEventListener('resize', () => draw());
    window.addEventListener('hashchange', () => { try { const l = JSON.parse(decodeURIComponent(location.hash.slice(1))); if (Array.isArray(l) && l.length && l.every(x => MM.registry[x.s])) { const same = JSON.stringify(l) === JSON.stringify(stages.map(s => ({ s: s.slug, p: s.P }))); if (!same) load(l); } } catch (e) { } });

    let init = null; try { const l = JSON.parse(decodeURIComponent(location.hash.slice(1))); if (Array.isArray(l) && l.length && l.every(x => MM.registry[x.s] && x.p !== null)) init = l; } catch (e) { }
    if (init) { init = init.filter((x, i) => i === init.length - 1 || isPass(x.s)); load(init); } else load(recipes[0].stages);
    requestAnimationFrame(tick);
  }
  window.MN_COMBINE = { mount, PASS, signal };
})();
