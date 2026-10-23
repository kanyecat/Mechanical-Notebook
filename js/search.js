/* Site search: one box that finds mechanisms, elements, generators (and their presets), goals ("reduce speed") and glossary terms.
   Opens with Ctrl/⌘ + K, "/" or any button marked data-search. Works from js/searchdata.js, which build.js writes. MIT licence. */
(function () {
  const D = window.MN_SEARCH; if (!D || !document.currentScript) return;
  const ROOT = new URL('..', document.currentScript.src).href;
  const TYPE = { g: 'Generator', m: 'Mechanism', e: 'Element', c: 'Combine', f: 'Technique', t: 'Term' };

  /* ---------- matching ---------- */
  const stem = w => w.length > 4 && /ies$/.test(w) ? w.slice(0, -3) + 'y' : w.length > 3 && /(ss|us)$/.test(w) ? w : w.length > 3 && /s$/.test(w) ? w.slice(0, -1) : w;
  const words = s => (String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').match(/[a-z0-9]+/g) || []).map(stem);
  const SYN = { cnc: ['milling', 'router'], '3d': ['print', 'printer', 'stl'], laser: ['dxf', 'cut'], gearbox: ['gear', 'reduction'], motor: ['torque', 'speed'], rpm: ['speed'], piston: ['slider', 'crank'], pully: ['pulley'], gaer: ['gear'], planetry: ['planetary'] };
  const lev1 = (a, b) => {   // true when a and b differ by at most one edit
    if (Math.abs(a.length - b.length) > 1) return false; let i = 0, j = 0, e = 0;
    while (i < a.length && j < b.length) { if (a[i] === b[j]) { i++; j++; continue; } if (++e > 1) return false; if (a.length > b.length) i++; else if (a.length < b.length) j++; else { i++; j++; } }
    return e + (a.length - i) + (b.length - j) <= 1;
  };
  const W = { n: 10, k: 6, w: 4, c: 4, d: 3, x: 1 };
  const docs = D.docs.map(d => Object.assign({ f: { n: words(d.n), k: words(d.k), w: words(d.w), c: words(d.c), d: words(d.d), x: words(d.x) } }, d));
  const hit = (tok, ws, fuzzy) => { let best = 0; for (const w of ws) { if (w === tok) return 1; if (tok.length >= 2 && w.startsWith(tok)) best = Math.max(best, 0.75); else if (fuzzy && tok.length >= 5 && w.length >= 4 && lev1(tok, w)) best = Math.max(best, 0.45); } return best; };
  function score(doc, toks, phrase) {
    let total = 0;
    for (const tk of toks) {
      let best = 0, via = '';
      for (const alt of [tk].concat(SYN[tk] || [])) for (const f in W) { const h = hit(alt, doc.f[f], f !== 'x' && f !== 'w') * W[f] * (alt === tk ? 1 : 0.6) * (doc.t === 'g' && f === 'k' ? 0.85 : 1); if (h > best) { best = h; via = f; } }
      if (!best) return 0; total += best;
    }
    const nm = doc.n.toLowerCase(); if (doc.t !== 't') { if (nm === phrase) total += 30; else if (nm.startsWith(phrase)) total += 12; else if (nm.includes(phrase)) total += 6; }
    if (doc.o != null) total += Math.max(0, 3 - doc.o * 0.6);
    return total;
  }
  // glossary terms, matched by name, with the pages that use the word
  const termDocs = () => {
    const defs = window.MNGloss && MNGloss.defs; if (!defs) return [];
    return Object.keys(defs).map(k => { const rx = new RegExp('\\b' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i'); const pages = docs.filter(d => d.t !== 'g' && rx.test(d.x + ' ' + d.d)).slice(0, 3);
      return { t: 't', n: k, d: defs[k], u: pages[0] ? pages[0].u : '', pages, f: { n: words(k), k: [], w: [], c: [], d: words(defs[k]), x: [] } }; });
  };
  let TD = null;
  function search(q) {
    const toks = words(q); if (!toks.length) return [];
    const phrase = toks.join(' '); TD = TD || termDocs();
    const out = [];
    docs.concat(TD).forEach(d => { const s = score(d, toks, phrase); if (s > 0) out.push([d.t === 't' ? s * 0.5 : s, d]); });
    out.sort((a, b) => b[0] - a[0]); return out.slice(0, 40).map(x => x[1]);
  }

  /* ---------- the box ---------- */
  const css = `
  .mnsr{position:fixed;inset:0;z-index:1000;display:none;align-items:flex-start;justify-content:center;padding:8vh 14px 14px;background:rgba(8,16,30,.55);-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px)}
  .mnsr.open{display:flex}
  .mnsr .box{width:min(680px,100%);max-height:82vh;display:flex;flex-direction:column;background:var(--paper,#f7f5ef);color:var(--ink,#1b2638);border:1.5px solid var(--ink,#1b2638);box-shadow:0 18px 60px rgba(0,0,0,.35);font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
  .mnsr .top{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid var(--line,rgba(0,0,0,.18))}
  .mnsr .top svg{width:18px;height:18px;flex:none;fill:none;stroke:currentColor;stroke-width:2;opacity:.7}
  .mnsr input{flex:1;min-width:0;border:0;outline:0;background:transparent;color:inherit;font:inherit;font-size:17px;padding:4px 0}
  .mnsr .esc{border:1px solid var(--line,rgba(0,0,0,.25));background:transparent;color:inherit;border-radius:4px;font-size:11px;padding:3px 7px;cursor:pointer;opacity:.8}
  .mnsr .res{overflow:auto;padding:6px;overscroll-behavior:contain}
  .mnsr .row{display:flex;gap:12px;align-items:flex-start;padding:9px 10px;text-decoration:none;color:inherit;border-left:3px solid transparent;border-radius:2px;cursor:pointer}
  .mnsr .row.on,.mnsr .row:hover{background:var(--hoverbg,rgba(217,72,15,.09));border-left-color:var(--red,#d9480f)}
  .mnsr .tag{flex:none;width:84px;font-size:10px;letter-spacing:.1em;text-transform:uppercase;padding-top:3px;color:var(--red,#d9480f);font-weight:600}
  .mnsr .tt{display:block;font-weight:700;font-size:15px}
  .mnsr .ds{display:block;font-size:12.5px;line-height:1.45;opacity:.78;margin-top:1px}
  .mnsr .why{display:block;font-size:11.5px;margin-top:3px;color:var(--red,#d9480f)}
  .mnsr .more{display:block;font-size:11.5px;margin-top:4px}.mnsr .more a{color:var(--red,#d9480f);margin-right:10px}
  .mnsr .hint{padding:8px 12px 12px;font-size:12px;opacity:.85}.mnsr .hint b{display:block;margin:0 0 6px;font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;opacity:.7;font-weight:600}
  .mnsr .chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}
  .mnsr .chips button{border:1px solid var(--line,rgba(0,0,0,.25));background:transparent;color:inherit;border-radius:999px;padding:5px 11px;font:inherit;font-size:12.5px;cursor:pointer}
  .mnsr .chips button:hover{border-color:var(--red,#d9480f);color:var(--red,#d9480f)}
  .mnsr .none{padding:22px 14px;text-align:center;opacity:.8;font-size:13.5px}
  .mnsr .foot{display:flex;gap:16px;flex-wrap:wrap;padding:8px 14px;border-top:1px solid var(--line,rgba(0,0,0,.18));font-size:11px;opacity:.7}
  .mnsr kbd{font:inherit;border:1px solid var(--line,rgba(0,0,0,.3));border-radius:3px;padding:0 5px}
  body.mnsr-lock{overflow:hidden}
  .srchb{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--line);background:transparent;color:var(--ink);border-radius:6px;padding:6px 10px;font:inherit;font-size:13px;cursor:pointer}
  .srchb:hover{border-color:var(--red);color:var(--red)}.srchb svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2}
  .srchb kbd{font:inherit;font-size:10.5px;opacity:.65;border:1px solid var(--line);border-radius:3px;padding:0 4px}
  @media (max-width:760px){.mnsr{padding-top:4vh}.mnsr .tag{width:66px}.srchb kbd,.srchb .lbl{display:none}}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  const el = document.createElement('div'); el.className = 'mnsr'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Search');
  el.innerHTML = `<div class="box"><div class="top"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
    <input type="search" id="mnsq" placeholder="Search mechanisms, generators, parts, or what you want to do" autocomplete="off" spellcheck="false" aria-label="Search the notebook"><button class="esc" type="button">Esc</button></div>
    <div class="res" id="mnsr" role="listbox"></div>
    <div class="foot"><span><kbd>↑</kbd> <kbd>↓</kbd> to move</span><span><kbd>Enter</kbd> to open</span><span><kbd>Esc</kbd> to close</span></div></div>`;
  document.body.appendChild(el);
  const input = el.querySelector('input'), res = el.querySelector('.res'); let rows = [], active = 0, opener = null;

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const href = u => u ? new URL(u, ROOT).href : '';
  const trim = (s, n) => s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s;
  const rowHTML = d => {
    if (d.t === 't') return `<div class="row" role="option" ${d.u ? `data-u="${esc(href(d.u))}"` : ''}><span class="tag">Term</span><span><span class="tt">${esc(d.n)}</span><span class="ds">${esc(d.d)}</span>${d.pages.length ? `<span class="more">Used in: ${d.pages.map(p => `<a href="${esc(href(p.u))}">${esc(p.n)}</a>`).join('')}</span>` : ''}</span></div>`;
    const why = d.why ? `<span class="why">Good for: ${esc(d.why)}</span>` : '';
    return `<a class="row" role="option" href="${esc(href(d.u))}"><span class="tag">${TYPE[d.t]}</span><span><span class="tt">${esc(d.n)}</span><span class="ds">${esc(trim((d.c ? d.c + ' · ' : '') + d.d, 150))}</span>${why}</span></a>`;
  };
  const paint = () => { rows = [...res.querySelectorAll('.row')]; active = 0; mark(); };
  const mark = () => rows.forEach((r, i) => { r.classList.toggle('on', i === active); r.setAttribute('aria-selected', i === active); if (i === active) r.scrollIntoView({ block: 'nearest' }); });
  const SUGGEST = ['worm gear', 'reduce speed', 'laser cut gears', 'straight line', 'walking leg', 'bearing', 'block and tackle', 'bevel gear'];
  function render() {
    const q = input.value.trim();
    if (!q) {
      res.innerHTML = `<div class="hint"><b>Try</b><div class="chips">${SUGGEST.map(s => `<button type="button" data-q="${esc(s)}">${esc(s)}</button>`).join('')}</div>
        <b>What do you want to do?</b><div class="chips">${D.goals.map(g => `<button type="button" data-q="${esc(g)}">${esc(g)}</button>`).join('')}</div></div>`;
      rows = []; return;
    }
    const hits = search(q);
    res.innerHTML = hits.length ? hits.map(rowHTML).join('') : `<div class="none">Nothing found for “${esc(q)}”.<br>Try a mechanism (“cam”), a part (“bearing”) or a goal (“lift a load”).</div>`;
    paint();
  }
  function open(q) {
    opener = document.activeElement; el.classList.add('open'); document.body.classList.add('mnsr-lock'); input.value = q || ''; render(); setTimeout(() => { input.focus(); input.select(); }, 0);
  }
  function close() { el.classList.remove('open'); document.body.classList.remove('mnsr-lock'); if (opener && opener.focus) try { opener.focus(); } catch (e) { } }
  const go = r => { if (!r) return; const a = r.tagName === 'A' ? r.href : r.dataset.u; if (a) { close(); location.href = a; } };
  input.addEventListener('input', render);
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (rows.length) { active = (active + 1) % rows.length; mark(); } }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (rows.length) { active = (active - 1 + rows.length) % rows.length; mark(); } }
    else if (e.key === 'Enter') { e.preventDefault(); go(rows[active]); }
  });
  res.addEventListener('click', e => { const b = e.target.closest('[data-q]'); if (b) { input.value = b.dataset.q; render(); input.focus(); return; } if (e.target.closest('.more a')) return; const r = e.target.closest('.row'); if (r && r.tagName !== 'A') go(r); });
  res.addEventListener('mousemove', e => { const r = e.target.closest('.row'); if (r) { const i = rows.indexOf(r); if (i >= 0 && i !== active) { active = i; rows.forEach((x, j) => x.classList.toggle('on', j === i)); } } });
  el.addEventListener('mousedown', e => { if (e.target === el) close(); });
  el.querySelector('.esc').addEventListener('click', close);
  document.addEventListener('keydown', e => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName) || (document.activeElement && document.activeElement.isContentEditable);
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); el.classList.contains('open') ? close() : open(); }
    else if (e.key === '/' && !typing && !document.body.classList.contains('genpage') && !el.classList.contains('open')) { e.preventDefault(); open(); }
    else if (e.key === 'Escape' && el.classList.contains('open')) { e.preventDefault(); close(); }
  });
  document.addEventListener('click', e => { const b = e.target.closest('[data-search]'); if (b) { e.preventDefault(); open(b.dataset.search || ''); } });
  window.MNSearch = { open, close, search };
  if (/[?&]q=/.test(location.search)) { const q = new URLSearchParams(location.search).get('q'); if (q) open(q); }
})();
