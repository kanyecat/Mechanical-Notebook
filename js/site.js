/* Site navigation: mobile menu, Generators drop-down, glossary on static text. MIT licence. */
(function () {
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
