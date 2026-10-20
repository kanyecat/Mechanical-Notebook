/* "Do the math" panel: calculator with live formulas, practice problems and design challenges.
   Each mechanism adds its maths in js/math/<slug>.js with MM.addMath(slug, { inputs, outputs, problems, challenges }).

   inputs:     [{ key, label, sym, unit, value, min, max, step }]  or  { key, param: '<drawing param key>' } to link to a drawing slider
   outputs:    (v, a) => [{ key, label, sym, expr, sub, value, unit, dp, live }]   v = input values, a = current crank angle (rad)
   problems:   [() => ({ text, answer, unit, tol, hint, steps: [..], set: { inputKey: value } })]
   challenges: [{ title, goal, check: v => true|false, hint }]   v = inputs + outputs by key
*/
(function () {
  const MM = window.MM; MM.math = {};
  MM.addMath = (slug, def) => { MM.math[slug] = def; };

  const num = (x, dp) => {
    if (x == null || !isFinite(x)) return '—';
    if (dp == null) dp = Math.abs(x) >= 100 ? 0 : Math.abs(x) >= 10 ? 1 : 2;
    return Number(x).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
  };
  MM.num = num;
  const rnd = (lo, hi, step) => { step = step || 1; return lo + step * Math.floor(Math.random() * (Math.floor((hi - lo) / step) + 1)); };
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  MM.rnd = rnd; MM.pick = pick;

  /* Build the panel. host = { m, P, setParam(key, value), getAngle() } from the page. Returns { refresh(a), paramChanged() } */
  MM.learn = function (root, slug, host) {
    const def = MM.math[slug]; if (!def) return null;
    const pdefs = {}; (host.m.params || []).forEach(q => pdefs[q.key] = q);
    const inputs = def.inputs.map(i => i.param ? Object.assign({ label: pdefs[i.param].label, min: pdefs[i.param].min, max: pdefs[i.param].max, step: pdefs[i.param].step, options: pdefs[i.param].options, unit: pdefs[i.param].unit }, i) : i);
    const V = {}; inputs.forEach(i => V[i.key] = i.param ? host.P[i.param] : i.value);
    const done = new Set();  // challenges solved at some point this visit

    root.innerHTML = `
      <div class="tabs" role="tablist">
        <button class="on" data-tab="calc" role="tab">Calculator</button>
        ${def.problems && def.problems.length ? '<button data-tab="practice" role="tab">Practice</button>' : ''}
        ${def.challenges && def.challenges.length ? '<button data-tab="challenge" role="tab">Design challenges</button>' : ''}
      </div>
      <div class="tab" data-pane="calc">
        <div class="calc">
          <div class="cin"><h4>Inputs</h4>${inputs.map(i => i.options
            ? `<label class="fld"><span>${i.label}${i.param ? ' <i title="Linked to the drawing">⟷</i>' : ''}</span><select data-in="${i.key}">${i.options.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select></label>`
            : `<label class="fld"><span>${i.label}${i.sym ? ` <em>${i.sym}</em>` : ''}${i.param ? ' <i title="Linked to the drawing">⟷</i>' : ''}</span><span class="nin"><input type="number" data-in="${i.key}" min="${i.min}" max="${i.max}" step="${i.step}" value="${V[i.key]}"><small>${i.unit || ''}</small></span></label>`).join('')}
            <p class="note">⟷ moves with the drawing. Metric units throughout.</p></div>
          <div class="cout"><h4>Working</h4><div id="outs"></div></div>
        </div>
      </div>
      <div class="tab" data-pane="practice" hidden>
        <div class="prob"><p id="ptext"></p>
          <div class="ans"><input id="pans" type="number" step="any" placeholder="Your answer"><span id="punit"></span>
            <button id="pcheck" type="button">Check</button><button id="phint" type="button" class="ghost">Hint</button><button id="psol" type="button" class="ghost">Show working</button><button id="pnew" type="button" class="ghost">New problem</button></div>
          <div id="pfb" class="fb"></div><div id="psteps" class="steps"></div>
          <p class="note">Score this visit: <b id="pscore">0 / 0</b></p></div>
      </div>
      <div class="tab" data-pane="challenge" hidden><ol class="chal" id="chal"></ol>
        <p class="note">Change the inputs in the Calculator tab or the sliders on the drawing. A challenge ticks itself when your design meets every target.</p></div>`;

    const $ = s => root.querySelector(s), outs = $('#outs');
    root.querySelector('.tabs').onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      root.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('on', x === b));
      root.querySelectorAll('[data-pane]').forEach(p => p.hidden = p.dataset.pane !== b.dataset.tab);
      if (b.dataset.tab === 'practice' && !cur) newProblem();  // first problem only when the tab is opened, so the drawing isn't changed on page load
    };

    // ---- calculator ----
    function setInput(key, val, fromDrawing) {
      const i = inputs.find(x => x.key === key); if (!i) return;
      val = +val; if (!isFinite(val)) return;
      if (i.min != null) val = Math.max(i.min, val); if (i.max != null) val = Math.min(i.max, val);
      V[key] = val;
      const el = root.querySelector(`[data-in="${key}"]`); if (el && document.activeElement !== el) el.value = val;
      if (i.param && !fromDrawing) host.setParam(i.param, val);
      refresh(host.getAngle(), true);
    }
    root.querySelectorAll('[data-in]').forEach(el => {
      const i = inputs.find(x => x.key === el.dataset.in); if (i.options) el.value = V[i.key];
      el.addEventListener(i.options ? 'change' : 'input', () => { if (el.value !== '') setInput(el.dataset.in, el.value); });
      el.addEventListener('change', () => { el.value = V[el.dataset.in]; });
    });
    let lastOut = [];
    function values(a) { const o = def.outputs(V, a); lastOut = o; const all = Object.assign({}, V); o.forEach(r => { if (r.key) all[r.key] = r.value; }); return all; }
    function refresh(a, full) {
      const all = values(a);
      outs.innerHTML = lastOut.map(r => `<div class="row${r.live ? ' live' : ''}${r.warn ? ' warn' : ''}">
        <div class="rl">${r.label}${r.live ? ' <i>live</i>' : ''}</div>
        <div class="rf">${r.sym ? `<em>${r.sym}</em> = ` : ''}${r.expr || ''}${r.sub ? `<span class="sub"> = ${r.sub}</span>` : ''}</div>
        <div class="rv">${typeof r.value === 'string' ? r.value : num(r.value, r.dp)}<small>${r.unit || ''}</small></div></div>`).join('');
      if (full) checkChallenges(all);
    }

    // ---- practice ----
    let cur = null, score = [0, 0], tried = false;
    function newProblem() {
      cur = pick(def.problems)(); tried = false;
      $('#ptext').innerHTML = cur.text; $('#punit').textContent = cur.unit || ''; $('#pans').value = ''; $('#pfb').textContent = ''; $('#pfb').className = 'fb'; $('#psteps').innerHTML = '';
      if (cur.set) Object.entries(cur.set).forEach(([k, v]) => { const i = inputs.find(x => x.key === k); if (i && i.param) setInput(k, v); });
    }
    function showSteps() {
      $('#psteps').innerHTML = '<ol>' + cur.steps.map(s => `<li>${s}</li>`).join('') + '</ol>' + (cur.set ? '<button type="button" class="ghost" id="pload">Load these numbers into the calculator</button>' : '');
      const ld = $('#pload'); if (ld) ld.onclick = () => { Object.entries(cur.set).forEach(([k, v]) => setInput(k, v)); root.querySelector('[data-tab="calc"]').click(); };
    }
    if (def.problems && def.problems.length) {
      $('#pnew').onclick = newProblem;
      $('#phint').onclick = () => { $('#pfb').className = 'fb'; $('#pfb').textContent = 'Hint: ' + cur.hint; };
      $('#psol').onclick = showSteps;
      const check = () => {
        const x = parseFloat($('#pans').value); if (!isFinite(x)) return;
        const tol = cur.tol == null ? 0.02 : cur.tol, ok = Math.abs(x - cur.answer) <= Math.max(Math.abs(cur.answer) * tol, 1e-9);
        if (!tried) { score[1]++; if (ok) score[0]++; tried = true; }
        $('#pscore').textContent = score[0] + ' / ' + score[1];
        $('#pfb').className = 'fb ' + (ok ? 'ok' : 'no');
        $('#pfb').textContent = ok ? `Correct. The answer is ${num(cur.answer, cur.dp)} ${cur.unit || ''}.` : 'Not quite. Try again, or use a hint.';
        if (ok) showSteps();
      };
      $('#pcheck').onclick = check; $('#pans').onkeydown = e => { if (e.key === 'Enter') check(); };
    }

    // ---- challenges ----
    function checkChallenges(all) {
      if (!def.challenges) return;
      const open = [...root.querySelectorAll('#chal details')].map(d => d.open);
      $('#chal').innerHTML = def.challenges.map((c, k) => {
        let ok = false; try { ok = !!c.check(all); } catch (e) { }
        if (ok) done.add(k);
        return `<li class="${ok ? 'ok' : ''}"><div class="ct">${ok ? '✓ ' : ''}${c.title}</div><div class="cg">${c.goal}</div>${done.has(k) && !ok ? '<div class="cd">Solved earlier — you have changed the design since.</div>' : ''}<details><summary>Hint</summary>${c.hint}</details></li>`;
      }).join('');
      root.querySelectorAll('#chal details').forEach((d, k) => { if (open[k]) d.open = true; });
    }

    let frame = 0;
    refresh(host.getAngle(), true);
    return {
      tick(a) { if (++frame % 8 === 0 && lastOut.some(r => r.live)) refresh(a, false); },
      paramChanged(key, val) { inputs.filter(i => i.param === key).forEach(i => setInput(i.key, val, true)); }
    };
  };
})();
