/* Colour theme shared by every page: 'blueprint' (navy, the site default) or 'paper' (drafting paper, the generator default).
   Load this in <head> so the theme is set before the page paints. Any element with data-theme-picker becomes a small
   sliding switch with a blueprint icon and a paper icon. Changing the theme fires a 'mn-theme' event on window. MIT licence. */
(function () {
  const KEY = 'mn-theme', root = document.documentElement, def = root.dataset.themeDefault || 'blueprint';
  const read = () => { try { return localStorage.getItem(KEY) || (def === 'paper' ? localStorage.getItem('mp-gen-theme') : null); } catch (e) { return null; } };
  let t = read(); if (t !== 'paper' && t !== 'blueprint') t = def;
  root.dataset.theme = t;
  // blueprint: a rolled drawing sheet with grid lines. paper: a sheet with a folded corner and ruled lines.
  const ICON_BP = '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3" y="3" width="14" height="14" rx="1.5"/><path d="M3 8h14M3 12.5h14M8 3v14M12.5 3v14"/></svg>';
  const ICON_PA = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 2.5h7l3.5 3.5v11.5H5z"/><path d="M12 2.5V6h3.5M7.5 10h5.5M7.5 13h5.5"/></svg>';
  const label = v => v === 'paper' ? 'Paper theme (light)' : 'Blueprint theme (navy)';
  const sync = () => document.querySelectorAll('.themesw').forEach(b => {
    const p = root.dataset.theme === 'paper';
    b.setAttribute('aria-checked', p); b.title = label(root.dataset.theme) + '. Click to switch.';
    b.setAttribute('aria-label', 'Colour theme: ' + label(root.dataset.theme));
  });
  const T = window.MNTheme = {
    get: () => root.dataset.theme,
    set(v) { if (v === root.dataset.theme) return; root.dataset.theme = v; try { localStorage.setItem(KEY, v); } catch (e) { } sync(); window.dispatchEvent(new CustomEvent('mn-theme', { detail: v })); },
    toggle() { T.set(root.dataset.theme === 'paper' ? 'blueprint' : 'paper'); },
    picker(el) {
      if (el._themepick) return; el._themepick = 1;
      el.classList.add('themehost');
      el.innerHTML = `<button type="button" class="themesw" role="switch"><span class="ti ti-bp">${ICON_BP}</span><span class="ti ti-pa">${ICON_PA}</span><span class="knob"></span></button>`;
      el.querySelector('button').addEventListener('click', T.toggle);
      sync();
    },
    scan(scope) { (scope || document).querySelectorAll('[data-theme-picker]').forEach(T.picker); }
  };
  document.addEventListener('DOMContentLoaded', () => T.scan());
})();
