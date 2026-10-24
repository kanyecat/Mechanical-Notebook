/* Requests board: anonymous public posts and comments, with status set by the site owner. MIT licence.
   Talks to Supabase over its REST API (no library). Settings live in js/board-config.js; the tables and security
   rules are in supabase/board.sql. Everything visitors type is shown as plain text. */
(function () {
  const B = window.MN_BOARD || {}, root = document.getElementById('board'); if (!root) return;
  const ready = !!(B.url && B.anonKey), OWNER = B.ownerName || 'Owner';
  const STATUS = { new: 'New', read: 'Read', planned: 'Planned', fixed: 'Fixed', resolved: 'Resolved' };
  const STATUS_HELP = { new: 'Not seen yet', read: 'Read by ' + OWNER, planned: 'Coming: on the to-do list', fixed: 'Fixed or added on the site', resolved: 'Answered or closed' };
  const KIND = { idea: 'Idea or request', mistake: 'Mistake', question: 'Question' };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ago = t => { const s = (Date.now() - new Date(t)) / 1000; if (s < 60) return 'just now'; const m = s / 60; if (m < 60) return Math.round(m) + ' min ago'; const h = m / 60; if (h < 24) return Math.round(h) + ' h ago'; const d = h / 24; if (d < 30) return Math.round(d) + ' day' + (Math.round(d) > 1 ? 's' : '') + ' ago'; return new Date(t).toLocaleDateString(); };
  const store = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }, del(k) { try { localStorage.removeItem(k); } catch (e) { } } };

  /* ---------- owner sign-in (a magic link e-mailed by Supabase) ---------- */
  const SKEY = 'mn-board-owner';
  (function takeLink() {
    if (!/access_token=/.test(location.hash)) return;
    const q = new URLSearchParams(location.hash.slice(1));
    store.set(SKEY, { at: q.get('access_token'), rt: q.get('refresh_token'), exp: Date.now() + (+q.get('expires_in') || 3600) * 1000 });
    history.replaceState(null, '', location.pathname);
  })();
  const jwtEmail = t => { try { return JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).email || ''; } catch (e) { return ''; } };
  async function token() {
    const s = store.get(SKEY); if (!s || !ready) return null;
    if (s.exp - 60000 > Date.now()) return s.at;
    try {
      const r = await fetch(B.url + '/auth/v1/token?grant_type=refresh_token', { method: 'POST', headers: { apikey: B.anonKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: s.rt }) });
      if (!r.ok) throw 0; const j = await r.json(); store.set(SKEY, { at: j.access_token, rt: j.refresh_token, exp: Date.now() + j.expires_in * 1000 }); return j.access_token;
    } catch (e) { store.del(SKEY); return null; }
  }
  let owner = false;

  async function api(path, opt) {
    opt = opt || {}; const t = await token();
    const r = await fetch(B.url + '/rest/v1/' + path, { method: opt.method || 'GET', headers: Object.assign({ apikey: B.anonKey, 'Content-Type': 'application/json' }, t ? { Authorization: 'Bearer ' + t } : {}, opt.prefer ? { Prefer: opt.prefer } : {}), body: opt.body ? JSON.stringify(opt.body) : undefined });
    if (!r.ok) { let m = 'Something went wrong (' + r.status + ').'; try { const j = await r.json(); if (j.message) m = j.message; } catch (e) { } throw new Error(m); }
    return r.status === 204 ? null : r.json().catch(() => null);
  }

  /* ---------- page ---------- */
  let posts = [], filter = 'all', sort = 'new';
  root.innerHTML = `
    <section class="box bform">
      <h3>Post a request, idea or mistake</h3>
      ${ready ? '' : `<p class="bnote">The board is being set up. Until then, send ideas and mistakes to <a href="mailto:jooheeki@alumni.cmu.edu">jooheeki@alumni.cmu.edu</a>.</p>`}
      <form id="bnew" ${ready ? '' : 'hidden'} autocomplete="off">
        <div class="bkinds" role="radiogroup" aria-label="Type">${Object.entries(KIND).map(([k, v], i) => `<label><input type="radio" name="kind" value="${k}"${i ? '' : ' checked'}><span>${v}</span></label>`).join('')}</div>
        <label class="bf">Title<input name="title" required minlength="3" maxlength="120" placeholder="For example: add a Geneva drive with 6 slots"></label>
        <label class="bf">Details <small>(optional)</small><textarea name="body" maxlength="2000" rows="4" placeholder="What would you like, or what looks wrong? Which page?"></textarea></label>
        <label class="bf">Name <small>(optional, leave empty to stay anonymous)</small><input name="name" maxlength="40" placeholder="Anonymous"></label>
        <label class="bhp" aria-hidden="true">Leave this empty<input name="website" tabindex="-1" autocomplete="off"></label>
        <div class="bact"><button class="btn" type="submit">Post publicly</button><span class="bmsg" role="status"></span></div>
        <p class="bsmall">Posts are public. Please don't include personal details.</p>
      </form>
    </section>
    <div class="bkey" aria-label="What the labels mean">${Object.keys(STATUS).map(k => `<span><i class="bs bs-${k}">${STATUS[k]}</i>${STATUS_HELP[k]}</span>`).join('')}</div>
    <div class="bbar">
      <div class="filters" role="group" aria-label="Show">${[['all', 'All'], ['open', 'Open'], ['planned', 'Planned'], ['done', 'Fixed and resolved']].map(([k, v], i) => `<button type="button" data-f="${k}"${i ? '' : ' class="on"'}>${v}</button>`).join('')}</div>
      <label class="bsort">Sort <select id="bsort"><option value="new">Newest</option><option value="talk">Most discussed</option></select></label>
    </div>
    <div id="bown" class="bown" hidden></div>
    <div id="blist" class="blist" aria-live="polite">${ready ? '<p class="bnote">Loading…</p>' : ''}</div>
    <p class="bowner"><button type="button" id="bsign" class="blink">${OWNER}: sign in to moderate</button></p>
    <form id="bsignf" class="box bsignf" hidden><label class="bf">Your e-mail<input type="email" name="email" required></label><div class="bact"><button class="btn" type="submit">Send me a sign-in link</button><span class="bmsg" role="status"></span></div></form>`;

  const list = root.querySelector('#blist'), ownBar = root.querySelector('#bown');
  const visible = () => posts.filter(p => filter === 'all' || (filter === 'open' && ['new', 'read', 'planned'].includes(p.status)) || (filter === 'planned' && p.status === 'planned') || (filter === 'done' && ['fixed', 'resolved'].includes(p.status)))
    .sort((a, b) => sort === 'talk' ? (b.board_comments || []).length - (a.board_comments || []).length : new Date(b.created_at) - new Date(a.created_at));

  const comment = c => `<li class="bc${c.is_owner ? ' bc-own' : ''}${c.hidden ? ' bhid' : ''}" data-c="${c.id}"><div class="bmeta"><b>${c.is_owner ? esc(OWNER) : esc(c.name || 'Anonymous')}</b>${c.is_owner ? '<i class="bown-tag">site owner</i>' : ''} · ${ago(c.created_at)}${c.hidden ? ' · <i>hidden</i>' : ''}</div><p>${esc(c.body)}</p>
    ${owner ? `<div class="bmod"><button type="button" data-a="chide">${c.hidden ? 'Show' : 'Hide'}</button><button type="button" data-a="cdel">Delete</button></div>` : ''}</li>`;
  const card = p => {
    const cs = (p.board_comments || []).slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    return `<article class="bpost${p.hidden ? ' bhid' : ''}" data-p="${p.id}">
      <div class="btags"><i class="bs bs-${p.status}" title="${STATUS_HELP[p.status]}">${STATUS[p.status]}</i><i class="bk">${KIND[p.kind] || p.kind}</i>${p.hidden ? '<i class="bk">hidden</i>' : ''}</div>
      <h4>${esc(p.title)}</h4>
      <div class="bmeta">${esc(p.name || 'Anonymous')} · ${ago(p.created_at)}</div>
      ${p.body ? `<p class="bbody">${esc(p.body)}</p>` : ''}
      ${p.reply ? `<div class="breply"><b>${esc(OWNER)}</b><p>${esc(p.reply)}</p></div>` : ''}
      ${owner ? `<div class="bmod"><label>Status <select data-a="status">${Object.keys(STATUS).map(k => `<option value="${k}"${k === p.status ? ' selected' : ''}>${STATUS[k]}</option>`).join('')}</select></label>
        <button type="button" data-a="hide">${p.hidden ? 'Show' : 'Hide'}</button><button type="button" data-a="del">Delete</button>
        <label class="bf">Your note on this post<textarea data-a="replytext" rows="2" maxlength="2000">${esc(p.reply || '')}</textarea></label><button type="button" data-a="reply">Save note</button></div>` : ''}
      <details class="bcom"${cs.length ? '' : ''}><summary>${cs.length ? cs.length + ' comment' + (cs.length > 1 ? 's' : '') : 'Comment'}</summary>
        <ul>${cs.map(comment).join('')}</ul>
        <form class="bcf" data-a="comment"><textarea name="body" required maxlength="1000" rows="2" placeholder="Add a comment"></textarea>
          ${owner ? '' : '<input name="name" maxlength="40" placeholder="Name (optional)">'}<input class="bhp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
          <div class="bact"><button class="btn small" type="submit">Comment${owner ? ' as ' + esc(OWNER) : ''}</button><span class="bmsg" role="status"></span></div></form></details>
    </article>`;
  };
  const draw = () => {
    const v = visible(); const open = [...list.querySelectorAll('details[open]')].map(d => d.closest('[data-p]').dataset.p);
    list.innerHTML = v.length ? v.map(card).join('') : `<p class="bnote">${posts.length ? 'Nothing here yet.' : 'No posts yet. Be the first!'}</p>`;
    open.forEach(id => { const d = list.querySelector(`[data-p="${id}"] details`); if (d) d.open = true; });
    if (owner) { const n = posts.filter(p => p.status === 'new').length; ownBar.hidden = false; ownBar.innerHTML = `<span>Signed in as the owner (${esc(jwtEmail((store.get(SKEY) || {}).at || ''))}). Hidden posts are shown faded.</span>${n ? `<button type="button" data-a="readall">Mark ${n} new as read</button>` : ''}<button type="button" data-a="signout">Sign out</button>`; } else ownBar.hidden = true;
  };
  async function load() {
    if (!ready) return;
    try { const t = await token(); owner = !!t; posts = await api('board_posts?select=*,board_comments(*)&order=created_at.desc&limit=300'); draw(); root.querySelector('#bsign').hidden = owner; }
    catch (e) { list.innerHTML = `<p class="bnote">Could not load the board: ${esc(e.message)}</p>`; }
  }

  const tooSoon = k => { const t = store.get('mn-board-' + k); if (t && Date.now() - t < 30000) return true; store.set('mn-board-' + k, Date.now()); return false; };
  root.querySelector('#bnew').addEventListener('submit', async e => {
    e.preventDefault(); const f = e.target, msg = f.querySelector('.bmsg'); if (f.website.value) return;
    if (tooSoon('post')) { msg.textContent = 'Please wait a little before posting again.'; return; }
    const body = { kind: f.kind.value, title: f.title.value.trim(), body: f.body.value.trim(), name: f.name.value.trim() || null };
    if (body.title.length < 3) { msg.textContent = 'Add a short title.'; return; }
    msg.textContent = 'Posting…';
    try { const r = await api('board_posts', { method: 'POST', body, prefer: 'return=representation' }); posts.unshift(Object.assign(r[0], { board_comments: [] })); f.reset(); msg.textContent = 'Posted. Thank you!'; filter = 'all'; root.querySelectorAll('.bbar [data-f]').forEach(b => b.classList.toggle('on', b.dataset.f === 'all')); draw(); }
    catch (err) { msg.textContent = err.message; store.del('mn-board-post'); }
  });
  root.querySelectorAll('.bbar [data-f]').forEach(b => b.onclick = () => { filter = b.dataset.f; root.querySelectorAll('.bbar [data-f]').forEach(x => x.classList.toggle('on', x === b)); draw(); });
  root.querySelector('#bsort').onchange = e => { sort = e.target.value; draw(); };

  list.addEventListener('submit', async e => {
    const f = e.target.closest('form[data-a="comment"]'); if (!f) return; e.preventDefault();
    const id = f.closest('[data-p]').dataset.p, msg = f.querySelector('.bmsg'); if (f.website.value) return;
    if (!owner && tooSoon('comment')) { msg.textContent = 'Please wait a little before commenting again.'; return; }
    const body = { post_id: id, body: f.body.value.trim(), name: owner ? null : (f.name.value.trim() || null), is_owner: owner };
    if (!body.body) return; msg.textContent = 'Posting…';
    try { const r = await api('board_comments', { method: 'POST', body, prefer: 'return=representation' }); const p = posts.find(x => x.id === id); (p.board_comments = p.board_comments || []).push(r[0]); draw(); }
    catch (err) { msg.textContent = err.message; store.del('mn-board-comment'); }
  });
  const patch = (table, id, body) => api(`${table}?id=eq.${id}`, { method: 'PATCH', body, prefer: 'return=representation' });
  root.addEventListener('change', async e => {
    if (e.target.dataset.a !== 'status') return; const id = e.target.closest('[data-p]').dataset.p;
    try { const r = await patch('board_posts', id, { status: e.target.value }); Object.assign(posts.find(p => p.id === id), r[0]); draw(); } catch (err) { alert(err.message); }
  });
  root.addEventListener('click', async e => {
    const b = e.target.closest('button[data-a]'); if (!b) return; const a = b.dataset.a, pe = b.closest('[data-p]'), id = pe && pe.dataset.p, p = id && posts.find(x => x.id === id);
    try {
      if (a === 'signout') { store.del(SKEY); owner = false; root.querySelector('#bsign').hidden = false; await load(); draw(); }
      if (a === 'readall') { await api('board_posts?status=eq.new', { method: 'PATCH', body: { status: 'read' } }); await load(); }
      if (a === 'hide') { Object.assign(p, (await patch('board_posts', id, { hidden: !p.hidden }))[0]); draw(); }
      if (a === 'del' && confirm('Delete this post and its comments for good?')) { await api(`board_posts?id=eq.${id}`, { method: 'DELETE' }); posts = posts.filter(x => x.id !== id); draw(); }
      if (a === 'reply') { const t = pe.querySelector('[data-a="replytext"]').value.trim(); Object.assign(p, (await patch('board_posts', id, { reply: t || null, status: p.status === 'new' ? 'read' : p.status }))[0]); draw(); }
      const ce = b.closest('[data-c]'), cid = ce && ce.dataset.c, c = cid && p.board_comments.find(x => x.id === cid);
      if (a === 'chide') { Object.assign(c, (await patch('board_comments', cid, { hidden: !c.hidden }))[0]); draw(); }
      if (a === 'cdel' && confirm('Delete this comment for good?')) { await api(`board_comments?id=eq.${cid}`, { method: 'DELETE' }); p.board_comments = p.board_comments.filter(x => x.id !== cid); draw(); }
    } catch (err) { alert(err.message); }
  });
  const signF = root.querySelector('#bsignf');
  root.querySelector('#bsign').onclick = () => { if (!ready) { alert('Add your Supabase settings to js/board-config.js first.'); return; } signF.hidden = !signF.hidden; if (!signF.hidden) signF.email.focus(); };
  signF.addEventListener('submit', async e => {
    e.preventDefault(); const msg = signF.querySelector('.bmsg'); msg.textContent = 'Sending…';
    try {
      const r = await fetch(B.url + '/auth/v1/otp?redirect_to=' + encodeURIComponent(location.origin + location.pathname), { method: 'POST', headers: { apikey: B.anonKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: signF.email.value.trim(), create_user: false }) });
      msg.textContent = r.ok ? 'Check your e-mail for the sign-in link.' : 'That address cannot sign in here.';
    } catch (err) { msg.textContent = 'Could not send the link.'; }
  });
  load();
})();
