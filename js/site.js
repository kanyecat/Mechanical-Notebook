/* Site navigation: mobile menu, Generators drop-down, glossary on static text. MIT licence. */
(function () {
  // Taps on links: phones can drop a tap when the page changes under the finger (the animations do this), so the link only
  // highlights. Pause text updates around a tap, and if the browser still does not send the click, follow the link ourselves.
  let tap = null;
  document.addEventListener('touchstart', e => {
    const a = e.target.closest && e.target.closest('a[href]'); tap = null; if (!a || e.touches.length !== 1) return;
    window.MNQuiet = performance.now() + 1000; const t = e.touches[0]; tap = { a, x: t.clientX, y: t.clientY, at: Date.now() };
  }, { passive: true });
  document.addEventListener('touchend', e => {
    const s = tap; tap = null; if (!s) return; const t = e.changedTouches[0];
    if (Math.hypot(t.clientX - s.x, t.clientY - s.y) > 10 || Date.now() - s.at > 600) return;
    const href = s.a.href; if (s.a.target && s.a.target !== '_self') return; if (!/^https?:|^file:/.test(href)) return;
    let clicked = false; const seen = ev => { if (ev.target.closest && ev.target.closest('a') === s.a) clicked = true; };
    document.addEventListener('click', seen, true);
    setTimeout(() => { document.removeEventListener('click', seen, true); if (!clicked) location.href = href; }, 400);
  }, { passive: true });
  document.addEventListener('touchcancel', () => { tap = null; }, { passive: true });

  const nav = document.querySelector('.nav'); if (!nav) return;
  const menuB = nav.querySelector('.menub'), dd = nav.querySelector('.dd'), ddB = dd && dd.querySelector('.ddb');
  const setMenu = open => { nav.classList.toggle('open', open); menuB.setAttribute('aria-expanded', open); menuB.setAttribute('aria-label', open ? 'Close menu' : 'Open menu'); };
  const setDD = open => { if (!dd) return; dd.classList.toggle('open', open); ddB.setAttribute('aria-expanded', open); };
  menuB.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
  if (ddB) ddB.addEventListener('click', e => { e.stopPropagation(); setDD(!dd.classList.contains('open')); });
  document.addEventListener('click', e => { if (!e.target.closest('.dd')) setDD(false); if (!e.target.closest('.nav')) setMenu(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { setDD(false); setMenu(false); } });
  nav.querySelectorAll('.links a').forEach(a => a.addEventListener('click', () => { setMenu(false); setDD(false); }));
  // light up the section of the home page you are looking at
  const secs = [...document.querySelectorAll('main section[id]')];
  if (secs.length && 'IntersectionObserver' in window) {
    const links = [...nav.querySelectorAll('.links a[href*="#"], .links .ddb')];
    const io = new IntersectionObserver(es => es.forEach(en => {
      if (!en.isIntersecting) return; const id = en.target.id;
      links.forEach(l => l.classList.toggle('here', (l.getAttribute('href') || '').endsWith('#' + id) || (l.classList.contains('ddb') && id === 'generators')));
    }), { rootMargin: '-40% 0px -55% 0px' });
    secs.forEach(s => io.observe(s));
  }
  if (window.MNGloss) document.querySelectorAll('[data-gloss]').forEach(el => MNGloss.apply(el));
})();

/* Home page "What do you want to do?": pick a motion from the list to see its options. Without JavaScript every card shows. */
(function () {
  const box = document.querySelector('[data-mpick]'); if (!box) return;
  const btn = box.querySelector('.mpbtn'), lst = box.querySelector('.mplist'), opts = [...lst.querySelectorAll('[role="option"]')];
  const goals = document.querySelector('.goals'), cards = [...goals.querySelectorAll('.goal')];
  goals.classList.add('mpicked');
  const hint = document.createElement('p'); hint.className = 'mphint'; hint.textContent = 'Pick a motion above to see the mechanisms and generators for it.'; goals.before(hint);
  const open = v => { lst.hidden = !v; btn.setAttribute('aria-expanded', v); if (v) (lst.querySelector('[aria-selected="true"]') || opts[0]).focus(); };
  const pick = (id, focus) => {
    const o = opts.find(x => x.dataset.g === id); if (!o) return;
    opts.forEach(x => x.setAttribute('aria-selected', x === o)); btn.querySelector('.gi').textContent = o.querySelector('.gi').textContent; btn.querySelector('.mpt').textContent = o.querySelector('b').textContent;
    cards.forEach(c => c.classList.toggle('on', c.id === 'goal-' + id)); hint.hidden = true; box.classList.add('chosen');
    history.replaceState(null, '', '#goal-' + id); open(false); if (focus) btn.focus();
  };
  btn.addEventListener('click', e => { e.stopPropagation(); open(lst.hidden); });
  opts.forEach((o, i) => {
    o.addEventListener('click', () => pick(o.dataset.g, true));
    o.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); (opts[i + 1] || opts[0]).focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); (opts[i - 1] || opts[opts.length - 1]).focus(); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(o.dataset.g, true); }
      else if (e.key === 'Escape') { open(false); btn.focus(); }
    });
  });
  document.addEventListener('click', e => { if (!box.contains(e.target)) open(false); });
  const m = location.hash.match(/^#goal-(.+)$/); if (m) pick(m[1]);
})();
