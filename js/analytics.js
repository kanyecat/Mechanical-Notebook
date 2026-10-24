/* Visit counting with Google Analytics 4. MIT licence.
   1. Create a GA4 property at analytics.google.com, add a Web data stream for https://mechanicalnotebook.com
   2. Copy its Measurement ID (looks like G-AB12CD34EF) into GA_ID below, then commit and push.
   Until GA_ID is set, nothing is loaded.

   Privacy: Google's Consent Mode starts with analytics cookies OFF. Visits are still counted with cookieless pings.
   A small notice lets visitors allow cookies (better visitor counts) or decline. The choice is remembered. */
(function () {
  const GA_ID = 'G-VHPRYRQHW8';
  if (!/^G-[A-Z0-9]{6,}$/.test(GA_ID) || GA_ID === 'G-XXXXXXXXXX') return;
  if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || location.protocol === 'file:') return;   // don't count your own testing
  const KEY = 'mn-consent';
  let choice = null; try { choice = localStorage.getItem(KEY); } catch (e) { }
  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('consent', 'default', { analytics_storage: choice === 'yes' ? 'granted' : 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
  gtag('js', new Date());
  gtag('config', GA_ID);
  const s = document.createElement('script'); s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID; document.head.appendChild(s);

  if (choice) return;
  const ask = () => {
    const box = document.createElement('div'); box.className = 'consent'; box.setAttribute('role', 'region'); box.setAttribute('aria-label', 'Cookie notice');
    box.innerHTML = '<p>This site counts visits with Google Analytics. Allow a cookie so repeat visits are counted correctly?</p><div><button type="button" data-c="yes">Allow</button><button type="button" data-c="no" class="ghost">No thanks</button></div>';
    box.onclick = e => {
      const b = e.target.closest('button'); if (!b) return; const v = b.dataset.c;
      try { localStorage.setItem(KEY, v); } catch (err) { }
      if (v === 'yes') gtag('consent', 'update', { analytics_storage: 'granted' });
      box.remove();
    };
    document.body.appendChild(box);
  };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', ask) : ask();
})();
