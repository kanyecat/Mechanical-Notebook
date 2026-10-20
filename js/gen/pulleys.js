/* Pulley generator. Two modes:
   Belt drive  – pulleys placed anywhere, joined by one or more belts (with back-side idlers and pulleys sharing a shaft).
                 Works out speeds, belt length, wrap angles, slip, and whether the motor can lift loads hung from pulley drums.
   Lifting tackle – block and tackle: mechanical advantage, effort with sheave friction, rope pulled, can it lift.
   MIT licence. */
(function () {
  const G = window.GEN, TAU = Math.PI * 2, deg = Math.PI / 180, g0 = 9.81;
  const f = (v, d) => (v == null || !isFinite(v)) ? '—' : (+v).toFixed(d == null ? 1 : d);

  /* ---------------- belt drive ---------------- */
  // pulley: { id, x, y, d (pitch Ø mm), belt (1..3), side ('in' | 'out' = back-side idler), shaft ('' or id of a pulley it shares a shaft with), m (load kg), drum (drum Ø mm), bore }
  const PRE = {
    two: { name: 'Two pulleys', P: [{ id: 'P1', x: 0, y: 0, d: 50, belt: 1, side: 'in' }, { id: 'P2', x: 240, y: 0, d: 120, belt: 1, side: 'in', m: 10, drum: 40 }] },
    diag: { name: 'Diagonal drive', P: [{ id: 'P1', x: 0, y: 0, d: 60, belt: 1, side: 'in' }, { id: 'P2', x: 180, y: 160, d: 100, belt: 1, side: 'in', m: 8, drum: 50 }] },
    vert: { name: 'Vertical drive', P: [{ id: 'P1', x: 0, y: 0, d: 50, belt: 1, side: 'in' }, { id: 'P2', x: 0, y: 260, d: 110, belt: 1, side: 'in', m: 15, drum: 40 }] },
    idler: { name: 'Idler for more wrap', P: [{ id: 'P1', x: 0, y: 0, d: 50, belt: 1, side: 'in' }, { id: 'P2', x: 260, y: 0, d: 130, belt: 1, side: 'in', m: 12, drum: 40 }, { id: 'P3', x: 70, y: -55, d: 40, belt: 1, side: 'out' }] },
    serp: { name: 'Serpentine (car engine)', P: [{ id: 'P1', x: 0, y: 0, d: 150, belt: 1, side: 'in' }, { id: 'P2', x: -60, y: 190, d: 60, belt: 1, side: 'in', m: 1, drum: 40 }, { id: 'P3', x: 70, y: 130, d: 45, belt: 1, side: 'out' }, { id: 'P4', x: 190, y: 200, d: 90, belt: 1, side: 'in', m: 2, drum: 40 }, { id: 'P5', x: 200, y: 20, d: 70, belt: 1, side: 'in' }] },
    stage2: { name: 'Two-stage reduction', P: [{ id: 'P1', x: 0, y: 0, d: 40, belt: 1, side: 'in' }, { id: 'P2', x: 200, y: 0, d: 140, belt: 1, side: 'in' }, { id: 'P3', x: 200, y: 0, d: 40, belt: 2, side: 'in', shaft: 'P2' }, { id: 'P4', x: 200, y: 230, d: 140, belt: 2, side: 'in', m: 40, drum: 60 }] }
  };
  const cacheP = {};
  const parse = S => { if (cacheP.s !== S.pul) { try { cacheP.v = JSON.parse(S.pul); } catch (e) { cacheP.v = PRE.two.P; } cacheP.s = S.pul; } return cacheP.v; };
  const BELT = { flat: { name: 'Flat belt', eta: 0.96, k: 1 }, v: { name: 'V-belt', eta: 0.94, k: 1 / Math.sin(20 * deg) }, timing: { name: 'Timing belt', eta: 0.98, k: 0 } };

  function solveBelt(S) {
    const list = parse(S), errs = [], P = {};
    list.forEach(p => { P[p.id] = Object.assign({}, p, { r: Math.max(1, +p.d || 1) / 2 }); });
    list.forEach(p => { const q = P[p.id]; if (q.shaft && P[q.shaft]) { const h = P[q.shaft]; q.x = h.x; q.y = h.y; } });
    // shaft groups: pulleys that share a shaft turn together
    const root = id => { let q = P[id], seen = 0; while (q.shaft && P[q.shaft] && seen++ < 20) q = P[q.shaft]; return q.id; };
    list.forEach(p => P[p.id].grp = root(p.id));
    const belts = [];
    [1, 2, 3].forEach(k => {
      const ids = list.filter(p => (+p.belt || 1) === k).map(p => p.id); if (!ids.length) return;
      if (ids.length < 2) { errs.push([`Belt ${k}`, `needs at least two pulleys (only ${ids[0]})`]); return; }
      const C = ids.map(id => P[id]);
      let A = 0; for (let i = 0; i < C.length; i++) { const a = C[i], b = C[(i + 1) % C.length]; A += a.x * b.y - b.x * a.y; }
      const sgn = A < -1e-6 ? -1 : 1, s = C.map(q => sgn * q.r * (q.side === 'out' ? -1 : 1));
      const segs = [], bad = [];
      for (let i = 0; i < C.length; i++) {
        const j = (i + 1) % C.length, a = C[i], b = C[j], dx = b.x - a.x, dy = b.y - a.y, Lc = Math.hypot(dx, dy), k2 = (s[j] - s[i]) / Lc;
        if (!(Lc > 1e-6) || Math.abs(k2) >= 1) { bad.push(a.id + '–' + b.id); segs.push(null); continue; }
        const th = Math.atan2(dy, dx) - Math.asin(k2), n = [-Math.sin(th), Math.cos(th)];
        segs.push({ p: [a.x - s[i] * n[0], a.y - s[i] * n[1]], q: [b.x - s[j] * n[0], b.y - s[j] * n[1]] });
      }
      if (bad.length) { errs.push([`Belt ${k}`, `pulleys ${bad.join(', ')} overlap or touch. Move them apart.`]); return; }
      const arcs = C.map((c, j) => {
        const pin = segs[(j - 1 + C.length) % C.length].q, pout = segs[j].p;
        const a0 = Math.atan2(pin[1] - c.y, pin[0] - c.x), a1 = Math.atan2(pout[1] - c.y, pout[0] - c.x);
        let w = s[j] > 0 ? a1 - a0 : a0 - a1; w = ((w % TAU) + TAU) % TAU; if (w < 1e-9) w = TAU;
        return { c, a0, a1, w, s: s[j] };
      });
      const L = segs.reduce((t, g) => t + Math.hypot(g.q[0] - g.p[0], g.q[1] - g.p[1]), 0) + arcs.reduce((t, a) => t + Math.abs(a.s) * a.w, 0);
      belts.push({ k, ids, C, s, segs, arcs, L });
    });
    // speeds: driver turns at S.motor rpm, each belt moves at one speed, pulleys on a shaft turn together
    const w = {}, d0 = list[0] && list[0].id; if (d0) w[P[d0].grp] = S.motor * TAU / 60 * S.dir;
    const v = {}, feed = {}, depth = {}; if (d0) depth[P[d0].grp] = 0;
    for (let it = 0; it < 10; it++) belts.forEach(B => {
      if (v[B.k] != null) return; const j = B.C.findIndex(q => w[q.grp] != null); if (j < 0) return;
      v[B.k] = w[B.C[j].grp] * B.s[j]; feed[B.k] = B.C[j].grp;
      B.C.forEach((q, i) => { if (w[q.grp] == null) { w[q.grp] = v[B.k] / B.s[i]; depth[q.grp] = depth[B.C[j].grp] + 1; } });
    });
    const lost = list.filter(p => w[P[p.id].grp] == null).map(p => p.id); if (lost.length) errs.push(['Not driven', `${lost.join(', ')} ${lost.length > 1 ? 'are' : 'is'} not connected to the driver P1. Put ${lost.length > 1 ? 'them' : 'it'} on a belt with a driven pulley.`]);
    // loads: a mass hanging from a drum on a pulley's shaft
    const bt = BELT[S.btype], grpLoad = {};
    list.forEach(p => { const q = P[p.id], m = +p.m || 0, dr = +p.drum || 0; if (m > 0 && dr > 0 && w[q.grp] != null) grpLoad[q.grp] = (grpLoad[q.grp] || 0) + m * g0 * dr / 2000; });
    // power each shaft needs, including what it passes on to belts it drives
    const need = {};
    const demand = grp => { if (need[grp] != null) return need[grp]; need[grp] = 0; let p = (grpLoad[grp] || 0) * Math.abs(w[grp] || 0); belts.forEach(B => { if (feed[B.k] === grp) p += beltOut(B) / bt.eta; }); return need[grp] = p; };
    const beltOut = B => { const seen = new Set(); let p = 0; B.C.forEach(q => { if (q.grp !== feed[B.k] && !seen.has(q.grp)) { seen.add(q.grp); p += demand(q.grp); } }); return p; };
    const Pin = d0 ? demand(P[d0].grp) : 0, w1 = d0 ? Math.abs(w[P[d0].grp]) : 0, Treq = w1 > 0 ? Pin / w1 : 0;
    // slip: effective pull each pulley must pass vs what friction allows (Euler–Eytelwein)
    const slip = [];
    belts.forEach(B => {
      const vb = Math.abs(v[B.k] || 0) / 1000; if (!vb) return;
      B.arcs.forEach(a => {
        const q = a.c; let F = 0;
        if (q.grp === feed[B.k]) F = beltOut(B) / bt.eta / vb; else if (q.side !== 'out') F = demand(q.grp) / vb;
        if (q.side === 'out' || F <= 0) { a.F = 0; return; }
        const mu = S.mu * bt.k, e = Math.exp(mu * a.w), Fmax = bt.k ? 2 * S.T0 * (e - 1) / (e + 1) : Infinity;
        a.F = F; a.Fmax = Fmax; slip.push({ id: q.id, belt: B.k, F, Fmax, wrap: a.w });
      });
    });
    return { list, P, belts, w, v, errs, grpLoad, Pin, Treq, slip, depth, bt };
  }
  const rpmOf = (R, id) => { const q = R.P[id]; return q && R.w[q.grp] != null ? R.w[q.grp] * 60 / TAU : null; };

  /* ---------------- lifting tackle ---------------- */
  function solveLift(S) {
    const n = Math.max(1, Math.min(8, Math.round(S.lines))), red = S.pull === 'down' ? 1 : 0, eta = S.eta / 100, W = S.load * g0;
    const T1 = W * (1 - 1 / eta) / (1 - Math.pow(1 / eta, n)) || W / n;          // tension at the dead end
    const T = []; for (let i = 0; i < n; i++) T.push(T1 / Math.pow(eta, i));
    const F = T[n - 1] / Math.pow(eta, red), sheaves = n - 1 + red;
    const avail = S.src === 'winch' ? S.wT / (S.wD / 2000) : S.hand;
    return { n, red, eta, W, T, F, Fid: W / n, sheaves, MA: W / F, eff: W / (F * n), avail, ok: avail >= F, beam: S.pull === 'down' ? W + F : W - F };
  }

  /* ---------------- editor for the pulley list ---------------- */
  function pulleyEditor(el, api) {
    const S = api.S; let shown = null;
    const L = () => JSON.parse(JSON.stringify(parse(S))), save = l => { S.pul = JSON.stringify(l); api.changed(); shown = S.pul; };
    const nextId = l => { let i = 1; while (l.some(p => p.id === 'P' + i)) i++; return 'P' + i; };
    const num = (i, k, v, label, unit, step, min) => `<label class="mf"><span>${label}</span><span class="gin"><input type="number" data-i="${i}" data-f="${k}" value="${v}" step="${step || 1}"${min != null ? ` min="${min}"` : ''}><span>${unit || ''}</span></span></label>`;
    function render() {
      const l = parse(S), R = solveBelt(S); shown = S.pul;
      el.innerHTML = `<div class="mpre"><span>Start from</span>${Object.entries(PRE).map(([k, p]) => `<button data-pre="${k}">${p.name}</button>`).join('')}</div>
        <ol class="mlist">${l.map((p, i) => {
          const others = l.filter(q => q.id !== p.id && !q.shaft).map(q => q.id), r = rpmOf(R, p.id);
          let body = num(i, 'd', p.d, 'Diameter', 'mm', 1, 4);
          body += `<label class="mf"><span>Belt</span><select data-i="${i}" data-f="belt">${[1, 2, 3].map(k => `<option value="${k}"${(+p.belt || 1) === k ? ' selected' : ''}>Belt ${k}</option>`).join('')}</select></label>`;
          if (i > 0) body += `<label class="mf"><span>Shaft</span><select data-i="${i}" data-f="shaft"><option value="">Its own</option>${others.map(o => `<option value="${o}"${p.shaft === o ? ' selected' : ''}>Same as ${o}</option>`).join('')}</select></label>`;
          else body += '<span></span>';
          body += `<label class="mf"><span>Belt touches</span><span class="gseg"><button data-i="${i}" data-side="in" class="${p.side !== 'out' ? 'on' : ''}" title="The belt wraps the pulley from the inside of the loop">Inside</button><button data-i="${i}" data-side="out" class="${p.side === 'out' ? 'on' : ''}" title="Back-side idler: presses on the outside of the belt">Back</button></span></label>`;
          if (!p.shaft) body += num(i, 'x', p.x, 'Position x', 'mm', 5) + num(i, 'y', p.y, 'Position y', 'mm', 5);
          body += num(i, 'm', p.m || 0, 'Load hung', 'kg', 0.5, 0) + num(i, 'drum', p.drum || 40, 'Drum Ø', 'mm', 1, 1);
          return `<li class="mitem ${i === 0 ? 'm-crank' : p.side === 'out' ? 'm-ground' : p.m > 0 ? 'm-point' : 'm-joint'}"><div class="mhead"><b>${p.id}</b><span>${i === 0 ? 'Driver (motor)' : p.side === 'out' ? 'Back-side idler' : p.m > 0 ? 'Lifts a load' : p.shaft ? 'On ' + p.shaft + "'s shaft" : 'Pulley'}</span><em class="mspd">${r == null ? '' : f(Math.abs(r), 1) + ' rpm ' + (r > 0 ? '↺' : '↻')}</em>${i ? `<button data-del="${i}" title="Remove ${p.id}">×</button>` : ''}</div><div class="mbody">${body}</div></li>`;
        }).join('')}</ol>
        <div class="madd"><span>Add</span><button data-add="pul">Pulley</button><button data-add="idler">Back-side idler</button><button data-add="shaft">Pulley on same shaft</button></div>
        <p class="ghelp">P1 is the driver. Each belt runs round its pulleys in list order. Set positions in millimetres to place a pulley left, right, above or diagonally from the others. A <b>Back</b> pulley presses on the outside of the belt, like a tensioner, to give more wrap. Put a pulley on the <b>same shaft</b> as another and give it a new belt number to add a second stage. Hang a load on any pulley's drum to see if the motor can lift it.</p>`;
      el.querySelectorAll('.mitem').forEach((li, n) => { const id = l[n].id; api.hl(li, p => p._id === id); });
    }
    el.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return; const l = L();
      if (b.dataset.pre) { save(PRE[b.dataset.pre].P); render(); api.fit(); api.toast(PRE[b.dataset.pre].name + ' loaded'); return; }
      if (b.dataset.side) { l[+b.dataset.i].side = b.dataset.side; save(l); render(); return; }
      if (b.dataset.del) { const gone = l[+b.dataset.del].id; save(l.filter((p, i) => i !== +b.dataset.del).map(p => p.shaft === gone ? Object.assign(p, { shaft: '', x: p.x, y: p.y }) : p)); render(); api.fit(); return; }
      if (b.dataset.add) {
        const id = nextId(l), R = solveBelt(S), last = l[l.length - 1], lp = R.P[last.id];
        const cx = l.reduce((t, p) => t + R.P[p.id].x, 0) / l.length, cy = l.reduce((t, p) => t + R.P[p.id].y, 0) / l.length;
        let ang = Math.atan2(lp.y - cy, lp.x - cx); if (l.length === 1) ang = 0;
        const dist = lp.r + 80, x = Math.round((lp.x + Math.cos(ang) * dist) / 5) * 5, y = Math.round((lp.y + Math.sin(ang) * dist) / 5) * 5;
        if (b.dataset.add === 'pul') l.push({ id, x, y, d: 80, belt: +last.belt || 1, side: 'in' });
        if (b.dataset.add === 'idler') { const a = R.P[l[0].id]; l.push({ id, x: Math.round((a.x + lp.x) / 2), y: Math.round((a.y + lp.y) / 2) - 60, d: 40, belt: +last.belt || 1, side: 'out' }); }
        if (b.dataset.add === 'shaft') { const host = [...l].reverse().find(p => !p.shaft && p !== l[0]) || l[0]; const nb = Math.min(3, Math.max(...l.map(p => +p.belt || 1)) + 1); l.push({ id, shaft: host.id, d: 40, belt: nb, side: 'in' }); l.push({ id: nextId(l.concat([{ id }])), x: R.P[host.id].x + 200, y: R.P[host.id].y, d: 120, belt: nb, side: 'in' }); }
        save(l); render(); api.fit(); api.toast('Added ' + id);
      }
    });
    const edit = e => {
      const x = e.target; if (x.dataset.i == null || !x.dataset.f) return; const l = L(), p = l[+x.dataset.i], k = x.dataset.f;
      if (x.tagName === 'SELECT') { p[k] = k === 'belt' ? +x.value : x.value; if (k === 'shaft' && !x.value) { const R = solveBelt(S); p.x = Math.round(R.P[p.id].x + 120); p.y = Math.round(R.P[p.id].y); } }
      else { if (x.value === '' || !isFinite(+x.value)) return; p[k] = +x.value; if (k === 'd' || k === 'drum') p[k] = Math.max(1, p[k]); if (k === 'm') p[k] = Math.max(0, p[k]); }
      save(l); if (x.tagName === 'SELECT') render(); else refreshSpeeds();
    };
    const refreshSpeeds = () => { const l = parse(S), R = solveBelt(S); el.querySelectorAll('.mitem').forEach((li, i) => { const r = l[i] && rpmOf(R, l[i].id), sp = li.querySelector('.mspd'); if (sp) sp.textContent = r == null ? '' : f(Math.abs(r), 1) + ' rpm ' + (r > 0 ? '↺' : '↻'); }); };
    el.addEventListener('input', edit); el.addEventListener('change', e => { if (e.target.tagName === 'SELECT') return; edit(e); });
    api.listen(() => { if (S.pul !== shown) render(); else refreshSpeeds(); });
    render();
  }

  /* ---------------- drawing helpers ---------------- */
  const disc = (x, y, r, bore, rot) => {
    const outer = G.circlePts(x, y, r, Math.max(48, Math.ceil(r))), circles = bore > 0 && bore < 2 * r - 2 ? [{ x, y, r: bore / 2 }] : [];
    return { outer, circles };
  };
  // where a hung load is drawn: rope leaves the drum on the side it winds up
  function loadGeo(R, p, t) {
    const q = R.P[p.id], m = +p.m || 0, dr = (+p.drum || 0) / 2, w = R.w[q.grp] || 0, w1 = Math.abs(R.w[R.P[R.list[0].id].grp] || 1);
    const x = q.x + (w >= 0 ? -1 : 1) * dr, wound = (t * w / w1) * dr, rise = 40 * (1 - Math.cos(wound / 40)) / 2, y1 = q.y - Math.max(q.r + 50, 110) + rise, bw = 20 + Math.sqrt(m) * 6;
    return { q, m, dr, x, y1, bw };
  }
  function beltModel(S, t) {
    const R = solveBelt(S), parts = [], ang = {};
    const w1 = R.w[R.P[R.list[0].id].grp] || 1;
    R.list.forEach(p => { const q = R.P[p.id], w = R.w[q.grp]; ang[p.id] = w == null ? 0 : t * w / Math.abs(w1); });
    R.list.forEach((p, i) => {
      const q = R.P[p.id], on = !!q.shaft;
      parts.push({ name: p.id + ' pulley Ø' + p.d, _id: p.id, shapes: [disc(q.x, q.y, q.r, S.bore)], thickness: S.thick, fill: i === 0 ? 'accent' : on ? 'dark' : 'base', z: on ? S.thick : 0 });
    });
    R.list.forEach(p => { if (!((+p.m || 0) > 0 && +p.drum > 0 && R.w[R.P[p.id].grp] != null)) return; const L = loadGeo(R, p, t);
      parts.push({ name: `Load ${L.m} kg on ${p.id}`, _id: p.id, noexp: 1, fill: 'accent', shapes: [{ outer: [[L.x - L.bw / 2, L.y1], [L.x + L.bw / 2, L.y1], [L.x + L.bw / 2, L.y1 - L.bw * 0.8], [L.x - L.bw / 2, L.y1 - L.bw * 0.8]] }] }); });
    return {
      parts,
      guides(d) {
        const ink = getComputedStyle(document.documentElement).getPropertyValue('--ink'), red = getComputedStyle(document.documentElement).getPropertyValue('--red'), dim = getComputedStyle(document.documentElement).getPropertyValue('--dim');
        // spokes show each pulley turning
        R.list.forEach(p => { const q = R.P[p.id], a = ang[p.id]; for (let k = 0; k < 3; k++) { const b = a + k * TAU / 3; d.line(q.x + Math.cos(b) * Math.max(S.bore / 2 + 2, q.r * 0.2), q.y + Math.sin(b) * Math.max(S.bore / 2 + 2, q.r * 0.2), q.x + Math.cos(b) * q.r * 0.82, q.y + Math.sin(b) * q.r * 0.82, { color: k ? ink : red, w: k ? 1 : 2 }); } });
        // belts
        R.belts.forEach(B => {
          const pts = [];
          B.segs.forEach((g, i) => {
            pts.push(g.p, g.q); const a = B.arcs[(i + 1) % B.arcs.length], c = a.c, n = Math.max(6, Math.ceil(a.w / 0.08));
            for (let k = 1; k < n; k++) { const th = a.a0 + (a.s > 0 ? 1 : -1) * a.w * k / n; pts.push([c.x + Math.abs(a.s) * Math.cos(th), c.y + Math.abs(a.s) * Math.sin(th)]); }
          });
          pts.push(pts[0]);
          d.path(pts, { color: ink, w: 4 }); d.path(pts, { color: getComputedStyle(document.documentElement).getPropertyValue('--canvas'), w: 1.6 });
          // marks moving with the belt
          const vb = R.v[B.k] || 0, w1x = Math.abs(R.w[R.P[R.list[0].id].grp] || 1), travel = t * vb / w1x;
          let acc = [0]; for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
          const Lt = acc[acc.length - 1], gap = Lt / Math.max(8, Math.round(Lt / 40));
          for (let s0 = ((travel % gap) + gap) % gap; s0 < Lt; s0 += gap) { let i = 1; while (i < acc.length - 1 && acc[i] < s0) i++; const u = (s0 - acc[i - 1]) / Math.max(1e-9, acc[i] - acc[i - 1]); d.dot(pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * u, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * u, 2.2, red); }
          if (d.labels() && R.belts.length > 1) { const g = B.segs[0]; d.text('belt ' + B.k, (g.p[0] + g.q[0]) / 2, (g.p[1] + g.q[1]) / 2 - 14 / d.scale(), { color: dim, size: 11 }); }
        });
        // loads: rope from the drum down to the weight
        R.list.forEach(p => {
          if (!((+p.m || 0) > 0 && +p.drum > 0 && R.w[R.P[p.id].grp] != null)) return; const L = loadGeo(R, p, t);
          d.circle(L.q.x, L.q.y, L.dr, { color: red, w: 1.2, dash: [4, 3] });
          d.line(L.x, L.q.y, L.x, L.y1, { color: red, w: 1.6 });
          d.text(L.m + ' kg', L.x, L.y1 - L.bw * 0.4, { color: ink, size: 11, weight: 700 });
        });
        if (d.labels()) R.list.forEach((p, i) => {
          const q = R.P[p.id], r = rpmOf(R, p.id), off = q.r + 16 / d.scale();
          d.text(`${p.id} · Ø${p.d}`, q.x, q.y + off + (q.shaft ? 14 / d.scale() : 0), { color: ink, size: 12, weight: 700 });
          if (r != null) d.text(`${f(Math.abs(r), 1)} rpm`, q.x, q.y - off - (q.shaft ? 14 / d.scale() : 0), { color: i === 0 ? red : dim, size: 11 });
        });
        if (d.guides()) R.list.forEach(p => { const q = R.P[p.id]; if (!q.shaft) d.cross(q.x, q.y, 8); });
      }
    };
  }
  function liftModel(S, t) {
    const L = solveLift(S), n = L.n, R = S.sd / 2, D = S.sd, gap = Math.max(260, 4 * D), parts = [], beamY = 30;
    const h = 80 * (1 - Math.cos(t / 3)) / 2, yb = -gap + h;                  // moving block height
    const xs = []; for (let i = 0; i <= n; i++) xs.push(i * D);              // x of each rope line; line n is the pull line when pulling down
    const top = [], bot = [];                                                 // sheave centres
    for (let i = 1; i < n; i++) { const up = (n - i) % 2 === 0; (up ? top : bot).push({ x: (xs[i - 1] + xs[i]) / 2, i }); }
    if (L.red) top.push({ x: (xs[n - 1] + xs[n]) / 2, i: n, red: true });
    const deadTop = n % 2 === 0;
    // beam
    const bx0 = -D * 1.2, bx1 = L.red ? xs[n] + D * 1.2 : Math.max(bx0 + D, xs[n - 1] - D * 0.3);
    parts.push({ name: 'Beam', _id: 'beam', shapes: [{ outer: [[bx0, beamY], [bx1, beamY], [bx1, beamY + 24], [bx0, beamY + 24]] }], fill: 'dark', noexp: 1 });
    top.forEach((s, k) => parts.push({ name: 'Top sheave ' + (k + 1), _id: 'top', shapes: [disc(s.x, 0, R, S.bore)], thickness: S.thick }));
    bot.forEach((s, k) => parts.push({ name: 'Bottom sheave ' + (k + 1), _id: 'bot', shapes: [disc(s.x, yb, R, S.bore)], thickness: S.thick, fill: 'accent' }));
    // moving block plate and load
    const lx0 = bot.length ? Math.min(...bot.map(s => s.x)) - R : xs[0] - 10, lx1 = bot.length ? Math.max(...bot.map(s => s.x)) + R : xs[0] + 10, ly = yb - (bot.length ? R + 14 : 0);
    if (bot.length) parts.push({ name: 'Moving block', _id: 'block', shapes: [{ outer: [[lx0, ly], [lx1, ly], [lx1, ly + 10], [lx0, ly + 10]] }], fill: 'dark', noexp: 1 });
    const cx = (lx0 + lx1) / 2, bw = Math.max(70, Math.min(160, 40 + Math.sqrt(S.load) * 10)), by = ly - 40;
    parts.push({ name: `Load ${S.load} kg`, _id: 'load', shapes: [{ outer: [[cx - bw / 2, by], [cx + bw / 2, by], [cx + bw / 2, by - bw * 0.7], [cx - bw / 2, by - bw * 0.7]] }], fill: 'accent', noexp: 1 });
    const hx = L.red ? xs[n] : xs[n - 1], hy = L.red ? -gap - 60 - n * h - 30 : beamY + 60 + n * h + 30;
    parts.push({ name: 'Effort (hand)', _id: 'hand', noexp: 1, fill: 'dark', shapes: [disc(hx, hy, 6, 0)] });
    return {
      parts, L,
      guides(d) {
        const css = v => getComputedStyle(document.documentElement).getPropertyValue(v), ink = css('--ink'), red = css('--red'), dim = css('--dim');
        const rope = (x1, y1, x2, y2) => d.line(x1, y1, x2, y2, { color: red, w: 2.2 });
        // supporting lines
        for (let i = 1; i <= n; i++) {
          const x = xs[i - 1], up = (n - i) % 2 === 0, last = i === n;
          let yT = 0, yB = yb;
          const yTop = last ? (L.red ? 0 : beamY + 60 + n * h) : (up ? 0 : (i === 1 && deadTop ? beamY : 0));
          const yBot = (i === 1 && !deadTop) ? (bot.length ? ly + 10 : ly) : yb;
          yT = (i === 1 && deadTop) ? beamY : yTop; yB = yBot;
          rope(x, yT, x, yB);
          if (d.labels()) d.text('T' + i + ' ' + f(L.T[i - 1], 0) + ' N', x, (yT + yB) / 2, { color: dim, size: 10, rot: Math.PI / 2 });
        }
        // rope round the sheaves
        top.forEach(s => { const pts = []; for (let k = 0; k <= 20; k++) { const a = Math.PI * k / 20; pts.push([s.x - R * Math.cos(a), R * Math.sin(a)]); } d.path(pts, { color: red, w: 2.2 }); });
        bot.forEach(s => { const pts = []; for (let k = 0; k <= 20; k++) { const a = Math.PI * k / 20; pts.push([s.x - R * Math.cos(a), yb - R * Math.sin(a)]); } d.path(pts, { color: red, w: 2.2 }); });
        // the line to the hand, and the effort arrow
        const hx = L.red ? xs[n] : xs[n - 1];
        if (L.red) { const yh = -gap - 60 - n * h; rope(hx, 0, hx, yh); d.line(hx, yh, hx, yh - 30, { color: ink, w: 2 }); d.path([[hx - 6, yh - 18], [hx, yh - 30], [hx + 6, yh - 18]], { color: ink, w: 2 }); d.text('effort F = ' + f(L.F, 0) + ' N', hx + 12 / d.scale(), yh - 20, { color: ink, size: 12, weight: 700, align: 'left' }); }
        else { const yh = beamY + 60 + n * h; d.line(hx, yh, hx, yh + 30, { color: ink, w: 2 }); d.path([[hx - 6, yh + 18], [hx, yh + 30], [hx + 6, yh + 18]], { color: ink, w: 2 }); d.text('effort F = ' + f(L.F, 0) + ' N', hx + 12 / d.scale(), yh + 20, { color: ink, size: 12, weight: 700, align: 'left' }); }
        top.forEach(s => d.line(s.x, 0, s.x, beamY, { color: ink, w: 1.4 }));
        // hangers
        if (bot.length) bot.forEach(s => d.line(s.x, yb, s.x, ly + 10, { color: ink, w: 1.4 }));
        d.line(cx, ly, cx, by, { color: ink, w: 1.6 });
        d.text(`${S.load} kg · W = ${f(L.W, 0)} N`, cx, by - bw * 0.35, { color: ink, size: 12, weight: 700 });
        const tx = Math.max(bx1, xs[n]) + 24 / d.scale(); if (d.labels()) { d.text(`MA = ${n} (ideal)`, tx, 0, { color: dim, size: 12, align: 'left' }); d.text(`lifted ${f(h, 0)} mm, rope pulled ${f(n * h, 0)} mm`, tx, -22 / d.scale(), { color: dim, size: 11, align: 'left' }); }
      }
    };
  }

  /* ---------------- the math, written out with the numbers ---------------- */
  function workBelt(S) {
    const R = solveBelt(S), p1 = R.list[0], out = [];
    if (!p1) return '';
    const n1 = S.motor, d1 = +p1.d;
    R.list.slice(1).forEach(p => { const r = rpmOf(R, p.id); if (r == null) return; const q = R.P[p.id]; if (q.shaft) return; out.push(`n<sub>${p.id}</sub> = n<sub>in</sub> × d<sub>in</sub> ÷ d<sub>${p.id}</sub> = <b>${f(Math.abs(r), 1)} rpm</b>`); });
    R.belts.forEach(B => out.push(`Belt ${B.k}: speed v = ω r = <b>${f(Math.abs(R.v[B.k] || 0) / 1000, 2)} m/s</b>, length = straight spans + wrapped arcs = <b>${f(B.L, 1)} mm</b>`));
    R.list.forEach(p => { const m = +p.m || 0; if (!m) return; const r = rpmOf(R, p.id); if (r == null) return; const T = m * g0 * p.drum / 2000; out.push(`Load on ${p.id}: torque = m g r = ${m} × 9.81 × ${f(p.drum / 2000, 3)} = <b>${f(T, 2)} N·m</b>, lifts at ω r = <b>${f(Math.abs(r) * TAU / 60 * p.drum / 2, 0)} mm/s</b>`); });
    if (R.Pin > 0) out.push(`Motor torque needed = power ÷ ω = ${f(R.Pin, 1)} W ÷ ${f(S.motor * TAU / 60, 2)} rad/s (with ${Math.round(R.bt.eta * 100)}% belt efficiency per belt) = <b>${f(R.Treq, 2)} N·m</b>`);
    if (R.bt.k) { const sl = R.slip.slice().sort((a, b) => a.Fmax / a.F - b.Fmax / b.F)[0]; if (sl) out.push(`Grip (Euler–Eytelwein) on ${sl.id}: F<sub>max</sub> = 2T<sub>0</sub>(e<sup>μθ</sup> − 1) ÷ (e<sup>μθ</sup> + 1) with θ = ${f(sl.wrap / deg, 0)}° = <b>${f(sl.Fmax, 0)} N</b> vs ${f(sl.F, 0)} N needed`); }
    return '<ol class="gmath">' + out.map(s => `<li>${s}</li>`).join('') + '</ol>';
  }
  function workLift(S) {
    const L = solveLift(S);
    return `<ol class="gmath"><li>Weight W = m g = ${S.load} × 9.81 = <b>${f(L.W, 0)} N</b></li>
      <li>Ideal mechanical advantage = supporting lines = <b>${L.n}</b>, so ideal effort = W ÷ ${L.n} = <b>${f(L.Fid, 1)} N</b></li>
      <li>Each of the ${L.sheaves} sheave${L.sheaves === 1 ? '' : 's'} keeps ${S.eta}% of the rope tension, so the effort becomes <b>${f(L.F, 1)} N</b> (actual MA ${f(L.MA, 2)}, efficiency ${f(L.eff * 100, 0)}%)</li>
      <li>To lift the load 1 m you pull <b>${L.n} m</b> of rope (work in ≈ ${f(L.F * L.n, 0)} J, work out ${f(L.W, 0)} J)</li>
      <li>${S.src === 'winch' ? `Winch pull = torque ÷ drum radius = ${S.wT} ÷ ${f(S.wD / 2000, 3)} = ` : 'Available effort = '}<b>${f(L.avail, 0)} N</b> → ${L.ok ? 'enough to lift' : 'not enough'}</li></ol>`;
  }

  G.create({
    id: 'pulleys', title: 'Pulley generator', subtitle: 'Belt drives with pulleys anywhere you like, or lifting tackle. See speeds, belt length, grip and whether the load can be lifted.',
    defaults: { mode: 'belt', pul: JSON.stringify(PRE.idler.P), motor: 300, dir: 1, torque: 2, btype: 'flat', mu: 0.3, T0: 150, bore: 8, thick: 8,
      lines: 4, pull: 'down', load: 50, sd: 60, eta: 95, src: 'hand', hand: 250, wT: 10, wD: 50, swl: 2000, grid: 1, guides: 1, labels: 1, rpm: 20 },
    panel(ui) {
      ui.section('Setup', () => {
        ui.seg('mode', 'Build', [['belt', 'Belt drive'], ['lift', 'Lifting tackle']], { refit: 1 });
        ui.note('', { live: S => S.mode === 'belt' ? 'Pulleys joined by belts. Place them anywhere, change their sizes and hang loads on them.' : 'A block and tackle: a rope runs over fixed and moving pulleys (sheaves) to lift a load with less effort.' });
      });
      ui.section('Pulleys', () => ui.custom(pulleyEditor), { show: S => S.mode === 'belt' });
      ui.section('Motor and belt', () => {
        ui.num('motor', 'Motor speed', { unit: 'rpm', min: 0, max: 20000, step: 10 });
        ui.num('torque', 'Motor torque', { unit: 'N·m', min: 0, max: 10000, step: 0.1, help: 'The most the motor can give. Compared with the torque the loads need.' });
        ui.seg('dir', 'Motor turns', [[1, 'Anticlockwise'], [-1, 'Clockwise']]);
        ui.seg('btype', 'Belt', [['flat', 'Flat'], ['v', 'V-belt'], ['timing', 'Timing']]);
        ui.num('mu', 'Friction coefficient', { min: 0.05, max: 1, step: 0.05, show: S => S.btype !== 'timing', help: 'Belt on pulley. About 0.3 for rubber on steel. A V-belt wedges in its groove and grips about 3 times harder.' });
        ui.num('T0', 'Belt pretension', { unit: 'N', min: 0, max: 100000, step: 10, show: S => S.btype !== 'timing', help: 'How tight the belt is set before it runs. More tension gives more grip but loads the bearings.' });
      }, { show: S => S.mode === 'belt' });
      ui.section('Rope and load', () => {
        ui.num('lines', 'Supporting rope lines', { min: 1, max: 8, step: 1, int: true, help: 'Rope lines holding up the moving block. This is the ideal mechanical advantage.' });
        ui.seg('pull', 'Pull', [['down', 'Down (from top)'], ['up', 'Up']], { refit: 1 });
        ui.num('load', 'Load mass', { unit: 'kg', min: 0, max: 100000, step: 1 });
        ui.num('sd', 'Sheave Ø', { unit: 'mm', min: 10, max: 2000, step: 5 });
        ui.num('eta', 'Efficiency per sheave', { unit: '%', min: 50, max: 100, step: 1, help: 'About 90% for a plain bushing, 95–98% for a ball-bearing sheave.' });
        ui.num('swl', 'Rope safe working load', { unit: 'N', min: 1, max: 1e7, step: 50 });
      }, { show: S => S.mode === 'lift', hl: p => p._id === 'top' || p._id === 'bot' });
      ui.section('Effort', () => {
        ui.seg('src', 'Pulled by', [['hand', 'Person'], ['winch', 'Winch']]);
        ui.num('hand', 'Pull available', { unit: 'N', min: 0, max: 100000, step: 10, show: S => S.src === 'hand', help: 'An adult can pull down about 250–400 N for a short time (25–40 kg).' });
        ui.num('wT', 'Winch torque', { unit: 'N·m', min: 0, max: 100000, step: 0.5, show: S => S.src === 'winch' });
        ui.num('wD', 'Winch drum Ø', { unit: 'mm', min: 5, max: 2000, step: 1, show: S => S.src === 'winch' });
      }, { show: S => S.mode === 'lift' });
      ui.section('Parts for export', () => {
        ui.num('bore', 'Bore', { unit: 'mm', min: 0, max: 500, step: 0.5 });
        ui.num('thick', 'Thickness', { unit: 'mm', min: 0.5, max: 200, step: 0.5 });
      }, { closed: true });
      ui.section('The math', () => { ui.note('', { live: S => S.mode === 'belt' ? workBelt(S) : workLift(S) }); });
    },
    model(S, t) { return S.mode === 'lift' ? liftModel(S, t) : beltModel(S, t); },
    exportParts(S, layout) {
      const M = this.model(S, 0), ps = M.parts.filter(p => !p.noexp);
      if (layout !== 'flat') return ps;
      // lay the discs out in a row
      let x = 0; return ps.map(p => { const b = G.bounds([p]), w = b.x1 - b.x0; const q = Object.assign({}, p, { z: 0, shapes: p.shapes.map(s => G.placeShape(s, x - b.x0, -b.y0, 0)) }); x += w + 6; return q; });
    },
    fileTag: S => S.mode === 'lift' ? `tackle-${S.lines}x-sheave${S.sd}` : `belt-${parse(S).map(p => p.d).join('-')}`,
    info(S) {
      const rows = [];
      if (S.mode === 'lift') {
        const L = solveLift(S);
        rows.push(['Mechanical advantage', `${L.n} ideal · ${f(L.MA, 2)} actual`], ['Load weight', f(L.W, 0) + ' N'], ['Effort needed', f(L.F, 1) + ' N', !L.ok], ['Effort available', f(L.avail, 0) + ' N'],
          ['Efficiency', f(L.eff * 100, 0) + ' %'], ['Rope pulled per metre lifted', L.n + ' m'], ['Sheaves', `${L.sheaves} (${L.red ? 'pull redirected down' : 'pull up'})`], ['Load on the beam', f(L.beam, 0) + ' N'], ['Highest rope tension', f(Math.max(...L.T, L.F), 0) + ' N', Math.max(...L.T, L.F) > S.swl]);
        if (!L.ok) rows.push(['Cannot lift the load', `Needs ${f(L.F, 0)} N but only ${f(L.avail, 0)} N is available. Add supporting lines or use a winch.`, 2]);
        if (Math.max(...L.T, L.F) > S.swl) rows.push(['Rope overloaded', `The rope carries ${f(Math.max(...L.T, L.F), 0)} N, above its ${S.swl} N safe working load.`, 2]);
        if (L.n >= 6) rows.push(['Many sheaves', 'Friction adds up: more lines give less extra advantage. Consider a winch.', 'soft']);
        return rows;
      }
      const R = solveBelt(S), p1 = R.list[0];
      const loaded = R.list.filter(p => (+p.m || 0) > 0 && rpmOf(R, p.id) != null);
      const lastId = loaded.length ? loaded[loaded.length - 1].id : R.list[R.list.length - 1].id, rl = rpmOf(R, lastId);
      if (rl != null && p1) rows.push(['Speed ratio (P1 → ' + lastId + ')', '1 : ' + f(Math.abs(S.motor / rl), 3)]);
      R.list.forEach(p => { const r = rpmOf(R, p.id); if (r != null) rows.push([`${p.id} (Ø${p.d}${p.side === 'out' ? ', idler' : ''})`, `${f(Math.abs(r), 1)} rpm ${r > 0 ? '↺' : '↻'}`]); });
      R.belts.forEach(B => rows.push([`Belt ${B.k} length`, f(B.L, 1) + ' mm' + (S.btype === 'timing' ? ` (${Math.round(B.L / 5) * 5})` : '')]));
      R.belts.forEach(B => rows.push([`Belt ${B.k} speed`, f(Math.abs(R.v[B.k] || 0) / 1000, 2) + ' m/s']));
      loaded.forEach(p => { const r = rpmOf(R, p.id); rows.push([`${p.id} lifts ${p.m} kg at`, f(Math.abs(r) * TAU / 60 * p.drum / 2, 0) + ' mm/s']); });
      if (loaded.length) rows.push(['Motor torque needed', f(R.Treq, 2) + ' N·m', R.Treq > S.torque ? 'soft' : 0], ['Motor power needed', f(R.Pin, 1) + ' W']);
      const minWrap = R.belts.flatMap(B => B.arcs.filter(a => a.c.side !== 'out')).reduce((m, a) => Math.min(m, a.w), Infinity);
      if (isFinite(minWrap)) rows.push(['Smallest wrap angle', f(minWrap / deg, 0) + '°', S.btype !== 'timing' && minWrap < 120 * deg ? 'soft' : 0]);
      R.errs.forEach(e => rows.push([e[0], e[1], 2]));
      if (loaded.length && R.Treq > S.torque) rows.push(['Motor too weak', `The loads need ${f(R.Treq, 2)} N·m at P1 but the motor gives ${S.torque} N·m. Use a bigger driven pulley (more reduction) or a stronger motor.`, 2]);
      if (R.bt.k) R.slip.filter(s => s.F > s.Fmax).forEach(s => rows.push([`Belt ${s.belt} slips on ${s.id}`, `It must pass ${f(s.F, 0)} N but friction allows ${f(s.Fmax, 0)} N at ${f(s.wrap / deg, 0)}° wrap. Add tension, an idler for more wrap, or use a V-belt or timing belt.`, 2]));
      return rows;
    }
  });
})();
