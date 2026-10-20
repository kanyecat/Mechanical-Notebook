/* Cam generator: disc cam made from a motion program (rise / dwell / fall segments) for a roller, knife-edge,
   flat-faced or swing-arm follower. Checks pressure angle, undercut and cusps. MIT licence.
   World mm, y up. The follower sits above the cam; the cam turns by dir × θ (dir = +1 counter-clockwise). */
(function () {
  const G = window.GEN, TAU = Math.PI * 2, deg = Math.PI / 180;
  const f = (v, d) => (v == null || !isFinite(v)) ? '—' : (+v).toFixed(d == null ? 2 : d);

  /* ---------- motion laws: y(u), y'(u), y''(u), y'''(u) for u in 0..1, rising 0 → 1 ---------- */
  const LAWS = {
    cycloidal: { name: 'Cycloidal', y: u => u - Math.sin(TAU * u) / TAU, d1: u => 1 - Math.cos(TAU * u), d2: u => TAU * Math.sin(TAU * u), d3: u => TAU * TAU * Math.cos(TAU * u) },
    poly345: { name: '3-4-5 polynomial', y: u => u ** 3 * (10 - 15 * u + 6 * u * u), d1: u => 30 * u * u * (1 - u) ** 2, d2: u => 60 * u - 180 * u * u + 120 * u ** 3, d3: u => 60 - 360 * u + 360 * u * u },
    harmonic: { name: 'Simple harmonic', y: u => (1 - Math.cos(Math.PI * u)) / 2, d1: u => Math.PI / 2 * Math.sin(Math.PI * u), d2: u => Math.PI ** 2 / 2 * Math.cos(Math.PI * u), d3: u => -(Math.PI ** 3) / 2 * Math.sin(Math.PI * u) },
    uniform: { name: 'Constant velocity', y: u => u, d1: () => 1, d2: () => 0, d3: () => 0 }
  };
  const PRESETS = {
    rdfd: { name: 'Rise · dwell · fall · dwell', P: [{ k: 'rise', a: 120, h: 25, law: 'cycloidal' }, { k: 'dwell', a: 60 }, { k: 'fall', a: 120, h: 25, law: 'cycloidal' }, { k: 'dwell', a: 60 }] },
    rf: { name: 'Rise · fall', P: [{ k: 'rise', a: 180, h: 20, law: 'harmonic' }, { k: 'fall', a: 180, h: 20, law: 'harmonic' }] },
    long: { name: 'Long dwell', P: [{ k: 'rise', a: 90, h: 18, law: 'poly345' }, { k: 'dwell', a: 30 }, { k: 'fall', a: 90, h: 18, law: 'poly345' }, { k: 'dwell', a: 150 }] },
    steps: { name: 'Two steps', P: [{ k: 'rise', a: 70, h: 12, law: 'cycloidal' }, { k: 'dwell', a: 40 }, { k: 'rise', a: 70, h: 12, law: 'cycloidal' }, { k: 'dwell', a: 40 }, { k: 'fall', a: 100, h: 24, law: 'cycloidal' }, { k: 'dwell', a: 40 }] }
  };
  const pCache = {};
  const parseP = S => { if (pCache.s !== S.prog) { try { pCache.P = JSON.parse(S.prog); } catch (e) { pCache.P = PRESETS.rdfd.P; } pCache.s = S.prog; } return pCache.P; };

  // displacement s and its derivatives per radian of cam turn, at cam angle th (rad, 0..2π)
  function motion(P, th) {
    let a0 = 0, s0 = 0; const d = ((th / deg) % 360 + 360) % 360;
    for (const g of P) {
      const a = Math.max(0.0001, +g.a || 0), b = a * deg;
      if (d < a0 + a) {
        if (g.k === 'dwell') return { s: s0, s1: 0, s2: 0, s3: 0, seg: g };
        const L = LAWS[g.law] || LAWS.cycloidal, u = (d - a0) / a, h = (g.k === 'fall' ? -1 : 1) * (+g.h || 0);
        return { s: s0 + h * L.y(u), s1: h * L.d1(u) / b, s2: h * L.d2(u) / b ** 2, s3: h * L.d3(u) / b ** 3, seg: g };
      }
      if (g.k === 'rise') s0 += +g.h || 0; if (g.k === 'fall') s0 -= +g.h || 0; a0 += a;
    }
    return { s: s0, s1: 0, s2: 0, s3: 0, seg: null };   // anything left over is a dwell
  }

  /* ---------- cam profile ---------- */
  const rot = ([x, y], a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
  const cCache = {};
  function cam(S) {
    const key = JSON.stringify([S.prog, S.ftype, S.Rb, S.Rr, S.e, S.D, S.L, S.dir, S.fine, S.bore]); if (cCache.key === key) return cCache.v;
    const P = parseP(S), N = S.fine ? 1440 : 480, sg = S.dir, roll = S.ftype === 'roller' || S.ftype === 'swing', Rr = roll ? S.Rr : 0, Rp = S.Rb + Rr;
    const v = { N, Rp, pitch: [], prof: [], mo: [], press: [], errs: [] };
    let psi0 = 0;
    if (S.ftype === 'swing') {   // arm pivot at (D, 0); find the arm angle that puts the roller on the prime circle
      const c = (Rp * Rp - S.D * S.D - S.L * S.L) / (2 * S.D * S.L);
      if (Math.abs(c) > 1) v.errs.push(['Arm cannot reach', 'Change the pivot distance or arm length so the roller can touch the prime circle']);
      psi0 = Math.acos(Math.max(-1, Math.min(1, c)));
    }
    if ((S.ftype === 'roller' || S.ftype === 'knife') && Math.abs(S.e) >= Rp) v.errs.push(['Offset too big', `Keep the offset under the prime circle radius (${f(Rp, 1)} mm)`]);
    const d0 = Math.sqrt(Math.max(Rp * Rp - S.e * S.e, 0));
    const fixedPoint = (th, m) => {   // follower contact (flat) or roller-centre (others) in the fixed frame, plus the follower's direction of travel
      if (S.ftype === 'flat') return { p: [sg * m.s1, S.Rb + m.s], u: [0, 1] };
      if (S.ftype === 'swing') { const ps = psi0 - m.s * deg; return { p: [S.D + S.L * Math.cos(ps), S.L * Math.sin(ps)], u: [-Math.sin(ps), Math.cos(ps)], psi: ps }; }
      return { p: [S.e, d0 + m.s], u: [0, 1] };
    };
    for (let i = 0; i < N; i++) {
      const th = i / N * TAU, m = motion(P, th), F = fixedPoint(th, m);
      v.mo.push(m); v.pitch.push(rot(F.p, -sg * th)); v.press.push(F);
    }
    // orientation of the pitch curve tells which side is outward
    const area = G.area(v.pitch), out = area > 0 ? 1 : -1;   // right-hand normal points outward on an anticlockwise curve
    let rhoMin = Infinity, rhoMinConvex = Infinity, pa = { rise: 0, fall: 0 };
    for (let i = 0; i < N; i++) {
      const a = v.pitch[(i + N - 1) % N], b = v.pitch[i], c = v.pitch[(i + 1) % N], h = TAU / N;
      const d1 = [(c[0] - a[0]) / (2 * h), (c[1] - a[1]) / (2 * h)], d2 = [(c[0] - 2 * b[0] + a[0]) / (h * h), (c[1] - 2 * b[1] + a[1]) / (h * h)];
      const sp = Math.hypot(...d1) || 1e-9, n = [out * d1[1] / sp, -out * d1[0] / sp];   // outward unit normal in the cam frame
      const cross = d1[0] * d2[1] - d1[1] * d2[0], rho = sp ** 3 / Math.abs(cross || 1e-12), convex = cross * (area > 0 ? 1 : -1) > 0;
      if (convex) rhoMinConvex = Math.min(rhoMinConvex, rho); rhoMin = Math.min(rhoMin, rho);
      v.prof.push(S.ftype === 'flat' || !roll ? b : [b[0] - Rr * n[0], b[1] - Rr * n[1]]);
      // pressure angle: between the contact normal and the follower's direction of travel (both in the fixed frame)
      if (S.ftype !== 'flat') {
        const th = i / N * TAU, nf = rot(n, sg * th), u = v.press[i].u, ang = Math.acos(Math.min(1, Math.abs(nf[0] * u[0] + nf[1] * u[1])));
        const k = v.mo[i].s1 > 1e-9 ? 'rise' : v.mo[i].s1 < -1e-9 ? 'fall' : null; if (k) pa[k] = Math.max(pa[k], ang);
      }
    }
    v.rhoMinConvex = rhoMinConvex; v.pa = pa;
    if (S.ftype === 'flat') { v.rhoFlat = Math.min(...v.mo.map(m => S.Rb + m.s + m.s2)); const xs = v.mo.map(m => sg * m.s1); v.face = [Math.min(...xs), Math.max(...xs)]; }
    v.rMin = Math.min(...v.prof.map(p => Math.hypot(...p))); v.rMax = Math.max(...v.prof.map(p => Math.hypot(...p)));
    v.shape = { outer: v.prof, circles: S.bore > 0 ? [{ x: 0, y: 0, r: S.bore / 2 }] : [] };
    v.psi0 = psi0; v.d0 = d0;
    // program checks
    const tot = P.reduce((t, g) => t + (+g.a || 0), 0), net = P.reduce((t, g) => t + (g.k === 'rise' ? +g.h || 0 : g.k === 'fall' ? -(+g.h || 0) : 0), 0);
    v.total = tot; v.net = net; v.sMax = Math.max(...v.mo.map(m => m.s)); v.sMin = Math.min(...v.mo.map(m => m.s));
    cCache.key = key; cCache.v = v; return v;
  }

  /* ---------- follower parts (drawn, not exported except the swing arm) ---------- */
  function followerParts(S, v, th) {
    const m = motion(parseP(S), th), parts = [], sw = 8;
    const box = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
    if (S.ftype === 'swing') {
      const ps = v.psi0 - m.s * deg, C = [S.D + S.L * Math.cos(ps), S.L * Math.sin(ps)], A = [S.D, 0];
      const pts = []; [A, C].forEach(([x, y]) => pts.push(...G.circlePts(x, y, Math.max(6, S.Rr * 0.7), 40)));
      parts.push({ name: 'Follower arm', role: 'follower', thickness: S.thick, fill: 'accent', shapes: [{ outer: hull(pts), circles: [{ x: A[0], y: A[1], r: 2.5 }, { x: C[0], y: C[1], r: 2.5 }] }] });
      parts.push({ name: 'Roller', role: 'follower', thickness: S.thick, fill: 'base', shapes: [{ outer: G.circlePts(C[0], C[1], S.Rr, 60), circles: [{ x: C[0], y: C[1], r: 2 }] }], _C: C });
      return { parts, m, tip: C };
    }
    const top = v.Rp + v.sMax + 70;
    if (S.ftype === 'flat') {
      const y = S.Rb + m.s, w = Math.max(30, (v.face[1] - v.face[0]) + 16), cx = (v.face[0] + v.face[1]) / 2;
      parts.push({ name: 'Flat follower', role: 'follower', thickness: S.thick, fill: 'accent', shapes: [{ outer: box(cx - w / 2, y, cx + w / 2, y + 5) }, { outer: box(-sw / 2, y + 5, sw / 2, y + 5 + (top - S.Rb - v.sMax)) }] });
      return { parts, m, tip: [sg1(S) * m.s1, y] };
    }
    const cy = v.d0 + m.s, x = S.e;
    if (S.ftype === 'knife') {
      parts.push({ name: 'Knife-edge follower', role: 'follower', thickness: S.thick, fill: 'accent', shapes: [{ outer: [[x, cy], [x + sw / 2, cy + 12], [x + sw / 2, cy + (top - v.d0 - v.sMax)], [x - sw / 2, cy + (top - v.d0 - v.sMax)], [x - sw / 2, cy + 12]] }] });
      return { parts, m, tip: [x, cy] };
    }
    parts.push({ name: 'Follower stem', role: 'follower', thickness: S.thick, fill: 'accent', shapes: [{ outer: box(x - sw / 2, cy, x + sw / 2, cy + (top - v.d0 - v.sMax)) }] });
    parts.push({ name: 'Roller', role: 'follower', thickness: S.thick, fill: 'base', shapes: [{ outer: G.circlePts(x, cy, S.Rr, 60), circles: [{ x, y: cy, r: 2 }] }] });
    return { parts, m, tip: [x, cy] };
  }
  const sg1 = S => S.dir;
  function hull(pts) {
    const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]), cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], up = [];
    p.forEach(q => { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); });
    p.slice().reverse().forEach(q => { while (up.length > 1 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); });
    return lo.slice(0, -1).concat(up.slice(0, -1));
  }
  // which sample indices belong to program segment k
  function segRange(S, k) { const P = parseP(S); let a0 = 0; for (let i = 0; i < k; i++) a0 += +P[i].a || 0; return [a0, a0 + (+P[k].a || 0)]; }

  /* ---------- motion program editor ---------- */
  function progEditor(el, api) {
    const S = api.S; let shown = null;
    const key = () => S.prog + S.ftype;   // re-draw when the program or the follower type (mm vs °) changes
    const get = () => JSON.parse(S.prog), save = p => { S.prog = JSON.stringify(p); shown = key(); api.changed(); };
    const unit = () => S.ftype === 'swing' ? '°' : 'mm';
    function render() {
      const P = get(); shown = key();
      const tot = P.reduce((t, g) => t + (+g.a || 0), 0), net = P.reduce((t, g) => t + (g.k === 'rise' ? +g.h || 0 : g.k === 'fall' ? -(+g.h || 0) : 0), 0);
      let a0 = 0;
      el.innerHTML = `
        <div class="mpre"><span>Start from</span>${Object.entries(PRESETS).map(([k, p]) => `<button data-pre="${k}">${p.name}</button>`).join('')}</div>
        <ol class="mlist">${P.map((g, i) => {
          const from = a0; a0 += +g.a || 0;
          const kind = `<label class="mf"><span>Move</span><span class="gseg">${['rise', 'dwell', 'fall'].map(k => `<button data-i="${i}" data-k="${k}" class="${g.k === k ? 'on' : ''}">${k[0].toUpperCase() + k.slice(1)}</button>`).join('')}</span></label>`;
          const ang = `<label class="mf"><span>Cam turns</span><span class="gin"><input type="number" data-i="${i}" data-f="a" value="${g.a}" step="5"><span>°</span></span></label>`;
          const lift = g.k === 'dwell' ? '' : `<label class="mf"><span>${g.k === 'rise' ? 'Lift' : 'Drop'}</span><span class="gin"><input type="number" data-i="${i}" data-f="h" value="${g.h ?? 10}" step="1"><span>${unit()}</span></span></label>`;
          const law = g.k === 'dwell' ? '' : `<label class="mf"><span>Motion law</span><select data-i="${i}" data-f="law">${Object.entries(LAWS).map(([k, L]) => `<option value="${k}"${g.law === k ? ' selected' : ''}>${L.name}</option>`).join('')}</select></label>`;
          return `<li class="mitem m-${g.k === 'rise' ? 'crank' : g.k === 'fall' ? 'joint' : 'ground'}"><div class="mhead"><b>${i + 1}</b><span>${g.k[0].toUpperCase() + g.k.slice(1)} · ${f(from, 0)}° to ${f(a0, 0)}°</span><button data-del="${i}" title="Remove this step">×</button></div><div class="mbody">${kind}${ang}${lift}${law}</div></li>`;
        }).join('')}</ol>
        <div class="madd"><span>Add</span><button data-add="rise">Rise</button><button data-add="dwell">Dwell</button><button data-add="fall">Fall</button></div>
        <div class="mtot ${Math.abs(tot - 360) > 0.01 || Math.abs(net) > 0.001 ? 'bad' : ''}">Total ${f(tot, 1)}° of 360° · ends ${f(net, 2)} ${unit()} from the start
          ${Math.abs(tot - 360) > 0.01 ? `<button data-fix="1">${tot < 360 ? 'Fill the rest with a dwell' : 'Scale the steps to 360°'}</button>` : ''}
          ${Math.abs(net) > 0.001 ? '<button data-fix="2">Make the last move return to zero</button>' : ''}</div>
        <p class="ghelp">The follower moves through these steps once per turn of the cam. Point at a step to see its part of the cam outline.</p>`;
      el.querySelectorAll('.mitem').forEach((li, n) => api.hl(li, p => p.role === 'cam', 'seg' + n));
    }
    el.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return; const P = get();
      if (b.dataset.pre) { save(PRESETS[b.dataset.pre].P); render(); api.fit(); api.toast(PRESETS[b.dataset.pre].name + ' loaded'); return; }
      if (b.dataset.k) { const g = P[+b.dataset.i]; g.k = b.dataset.k; if (g.k !== 'dwell') { g.h = g.h ?? 10; g.law = g.law || 'cycloidal'; } save(P); render(); return; }
      if (b.dataset.del != null) { P.splice(+b.dataset.del, 1); if (!P.length) P.push({ k: 'dwell', a: 360 }); save(P); render(); return; }
      if (b.dataset.add) { const k = b.dataset.add; P.push(k === 'dwell' ? { k, a: 30 } : { k, a: 60, h: 10, law: 'cycloidal' }); save(P); render(); return; }
      if (b.dataset.fix === '1') { const tot = P.reduce((t, g) => t + (+g.a || 0), 0); if (tot < 360) P.push({ k: 'dwell', a: +(360 - tot).toFixed(3) }); else P.forEach(g => g.a = +(g.a * 360 / tot).toFixed(3)); save(P); render(); return; }
      if (b.dataset.fix === '2') {
        const net = P.reduce((t, g) => t + (g.k === 'rise' ? +g.h || 0 : g.k === 'fall' ? -(+g.h || 0) : 0), 0), last = [...P].reverse().find(g => g.k !== 'dwell');
        if (last) { last.h = +(last.h + (last.k === 'fall' ? net : -net)).toFixed(4); if (last.h < 0) { last.k = last.k === 'fall' ? 'rise' : 'fall'; last.h = -last.h; } }
        else P.push({ k: net > 0 ? 'fall' : 'rise', a: 60, h: Math.abs(net), law: 'cycloidal' });
        save(P); render(); return;
      }
    });
    const edit = e => { const x = e.target; if (x.dataset.i == null || !x.dataset.f) return; const P = get(), g = P[+x.dataset.i]; if (x.tagName === 'SELECT') g[x.dataset.f] = x.value; else { if (x.value === '' || !isFinite(+x.value)) return; g[x.dataset.f] = Math.max(0, +x.value); } save(P);
      const tot = P.reduce((t, q) => t + (+q.a || 0), 0), net = P.reduce((t, q) => t + (q.k === 'rise' ? +q.h || 0 : q.k === 'fall' ? -(+q.h || 0) : 0), 0), box = el.querySelector('.mtot');
      if (box) { box.firstChild.textContent = `Total ${f(tot, 1)}° of 360° · ends ${f(net, 2)} ${unit()} from the start `; box.classList.toggle('bad', Math.abs(tot - 360) > 0.01 || Math.abs(net) > 0.001); } };
    el.addEventListener('input', edit); el.addEventListener('change', e => { edit(e); if (e.target.dataset.f === 'a' || e.target.dataset.f === 'h') render(); });
    api.listen(() => { if (key() !== shown) render(); });
    render();
  }

  /* ---------- page ---------- */
  G.create({
    id: 'cams', title: 'Cam generator', subtitle: 'Design the follower motion step by step and get the cam outline, with pressure angle and undercut checks.',
    defaults: { prog: JSON.stringify(PRESETS.rdfd.P), ftype: 'roller', Rr: 10, e: 0, D: 110, L: 80, Rb: 40, bore: 8, thick: 6, dir: 1, fine: 1, motor: 120, mass: 0.3, chart: 1, pitchExp: 0, grid: 1, guides: 1, labels: 1, rpm: 12 },
    panel(ui) {
      ui.section('Follower', () => {
        ui.seg('ftype', 'Type', [['roller', 'Roller'], ['knife', 'Knife'], ['flat', 'Flat'], ['swing', 'Swing arm']], { refit: 1 });
        ui.num('Rr', 'Roller radius', { unit: 'mm', min: 1, max: 200, step: 0.5, show: S => S.ftype === 'roller' || S.ftype === 'swing' });
        ui.num('e', 'Offset', { unit: 'mm', min: -500, max: 500, step: 0.5, show: S => S.ftype === 'roller' || S.ftype === 'knife', help: 'Sideways shift of the follower line. A small offset can lower the pressure angle on the rise.' });
        ui.num('D', 'Pivot distance', { unit: 'mm', min: 5, max: 2000, step: 1, show: S => S.ftype === 'swing', help: 'From the cam centre to the arm pivot' });
        ui.num('L', 'Arm length', { unit: 'mm', min: 5, max: 2000, step: 1, show: S => S.ftype === 'swing', help: 'From the pivot to the roller centre. Lifts are in degrees of arm swing.' });
      }, { hl: p => p.role === 'follower' });
      ui.section('Cam', () => {
        ui.num('Rb', 'Base circle radius', { unit: 'mm', min: 3, max: 2000, step: 1, help: 'Smallest radius of the cam. Bigger means lower pressure angles but a bigger cam.' });
        ui.num('bore', 'Bore', { unit: 'mm', min: 0, max: 500, step: 0.5 });
        ui.num('thick', 'Thickness', { unit: 'mm', min: 0.5, max: 200, step: 0.5 });
        ui.seg('dir', 'Turns', [[1, 'Anticlockwise'], [-1, 'Clockwise']]);
        ui.seg('fine', 'Curve detail', [[0, 'Draft'], [1, 'Fine']]);
      }, { hl: p => p.role === 'cam' });
      ui.section('Motion program', () => ui.custom(progEditor), { hl: p => p.role === 'cam' });
      ui.section('Drive and output', () => {
        ui.num('motor', 'Cam speed', { unit: 'rpm', min: 0, max: 100000, step: 1 });
        ui.num('mass', 'Follower mass', { unit: 'kg', min: 0, max: 1000, step: 0.05, show: S => S.ftype !== 'swing' });
        ui.check('chart', 'Show motion chart');
        ui.check('pitchExp', 'Export the pitch curve too', { show: S => S.ftype === 'roller' || S.ftype === 'swing' });
        ui.note('The pitch curve is the path of the roller centre. Some CNC set-ups cut along it with a cutter the size of the roller.', { live: S => S.ftype === 'roller' || S.ftype === 'swing' ? 'The pitch curve is the path of the roller centre. Some CNC set-ups cut along it with a cutter the size of the roller.' : '' });
      });
    },
    model(S, t) {
      const v = cam(S), th = ((t % TAU) + TAU) % TAU, rotA = S.dir * th;
      const camPart = { name: 'Cam', role: 'cam', thickness: S.thick, shapes: [G.placeShape(v.shape, 0, 0, rotA)] };
      const FP = followerParts(S, v, th), parts = [camPart].concat(FP.parts);
      return {
        parts,
        guides(d) {
          const css = n => getComputedStyle(document.documentElement).getPropertyValue(n), ink = css('--ink'), red = css('--red');
          d.cross(0, 0, 12);
          if (d.guides()) {
            d.circle(0, 0, S.Rb, { dash: [6, 4] });
            if (S.ftype === 'roller' || S.ftype === 'swing') { d.circle(0, 0, v.Rp, { dash: [1, 4] }); d.path(v.pitch.map(p => rot(p, rotA)), { close: true, dash: [5, 4], w: 0.8 }); }
            if (S.ftype !== 'swing') d.line(S.ftype === 'flat' ? 0 : S.e, -v.rMax - 10, S.ftype === 'flat' ? 0 : S.e, v.Rp + v.sMax + 80, { dash: [10, 3, 2, 3], w: 0.7 });
            else { d.cross(S.D, 0, 8); d.circle(S.D, 0, S.L, { dash: [1, 4], w: 0.7 }); }
          }
          // the line from the cam centre marks the cam's 0° so the motion chart can be read against it
          const z = rot([0, v.rMin * 0.8], rotA); d.line(0, 0, z[0], z[1], { color: red, w: 1.6 }); d.dot(z[0], z[1], 3.5);
          // highlight one program step on the outline
          const tag = d.hlTag(); if (tag && tag.startsWith('seg')) {
            const [a0, a1] = segRange(S, +tag.slice(3)), i0 = Math.round(a0 / 360 * v.N), i1 = Math.round(a1 / 360 * v.N), pts = [];
            for (let i = i0; i <= i1 && i - i0 <= v.N; i++) pts.push(rot(v.prof[i % v.N], rotA));
            d.path(pts, { color: red, w: 5 });
          }
          if (d.labels()) {
            const m = FP.m;
            d.text(`θ ${f(th / deg, 0)}°   ${S.ftype === 'swing' ? 'swing' : 'lift'} ${f(m.s, 2)} ${S.ftype === 'swing' ? '°' : 'mm'}`, FP.tip[0] + 18 / d.scale(), FP.tip[1] + 26 / d.scale(), { color: ink, weight: 700, align: 'left' });
            d.text('base circle', 0, -S.Rb - 14 / d.scale(), { size: 11 });
          }
        },
        overlay(ctx, w, h, css) {
          if (!S.chart || w < 520) return;
          const P = parseP(S), W = 320, H = 150, x0 = w - W - 16, y0 = 14, px = x0 + 34, pw = W - 46, py = y0 + 22, ph = H - 40;
          ctx.fillStyle = css('--chrome'); ctx.strokeStyle = css('--line'); ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(x0, y0, W, H, 8); ctx.fill(); ctx.stroke();
          ctx.fillStyle = css('--faint'); ctx.font = '600 10px system-ui, sans-serif'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
          ctx.fillText('MOTION OVER ONE TURN', x0 + 10, y0 + 11);
          const ser = [['s', 'lift', css('--ink'), m => m.s], ['v', 'speed', css('--dim'), m => m.s1], ['a', 'accel', css('--red'), m => m.s2]];
          // segment bands
          let a0 = 0; P.forEach(g => { const a = +g.a || 0, X0 = px + a0 / 360 * pw, X1 = px + Math.min(360, a0 + a) / 360 * pw; if (g.k !== 'dwell') { ctx.fillStyle = css('--grid1'); ctx.fillRect(X0, py, X1 - X0, ph); } ctx.fillStyle = css('--faint'); ctx.textAlign = 'center'; ctx.fillText(g.k[0].toUpperCase(), (X0 + X1) / 2, py + ph + 9); a0 += a; });
          ctx.strokeStyle = css('--line'); ctx.beginPath(); ctx.moveTo(px, py + ph / 2); ctx.lineTo(px + pw, py + ph / 2); ctx.stroke();
          const v = cam(S);
          ser.forEach(([k, name, col, fn], j) => {
            const vals = v.mo.map(fn), lo = Math.min(...vals, 0), hi = Math.max(...vals, 0), span = Math.max(hi - lo, 1e-9);
            const Y = val => k === 's' ? py + ph - (val - v.sMin) / Math.max(v.sMax - v.sMin, 1e-9) * ph : py + ph / 2 - val / (2 * Math.max(Math.abs(lo), Math.abs(hi), 1e-9)) * ph * 0.95;
            ctx.strokeStyle = col; ctx.lineWidth = k === 's' ? 2 : 1.3; ctx.beginPath();
            vals.forEach((val, i) => { const X = px + i / vals.length * pw; i ? ctx.lineTo(X, Y(val)) : ctx.moveTo(X, Y(val)); }); ctx.stroke();
            ctx.fillStyle = col; ctx.textAlign = 'left'; ctx.fillText(name, x0 + W - 150 + j * 48, y0 + 11);
          });
          const th = ((t % TAU) + TAU) % TAU, X = px + th / TAU * pw; ctx.strokeStyle = css('--faint'); ctx.beginPath(); ctx.moveTo(X, py - 2); ctx.lineTo(X, py + ph + 2); ctx.stroke();
          ctx.fillStyle = css('--faint'); ctx.textAlign = 'right'; ctx.fillText('0°', px - 4, py + ph + 9); ctx.textAlign = 'left'; ctx.fillText('360°', px + pw - 18, py + ph + 9);
        }
      };
    },
    exportParts(S, layout) {
      const v = cam(S), out = [{ name: 'Cam', thickness: S.thick, shapes: [G.placeShape(v.shape, 0, 0, 0)], curves: S.pitchExp && (S.ftype === 'roller' || S.ftype === 'swing') ? [v.pitch.concat([v.pitch[0]])] : [] }];
      if (S.ftype === 'swing') {
        const FP = followerParts(S, v, 0), arm = FP.parts[0];
        if (layout === 'flat') { const dx = v.rMax + 10 - Math.min(...arm.shapes[0].outer.map(p => p[0])), dy = -Math.min(...arm.shapes[0].outer.map(p => p[1])) - v.rMax; arm.shapes = arm.shapes.map(s => G.placeShape(s, dx, dy, 0)); }
        out.push({ name: 'Follower arm', thickness: S.thick, z: layout === 'assembled' ? S.thick : 0, shapes: arm.shapes });
      }
      return out;
    },
    fileTag: S => `${S.ftype}-rb${S.Rb}-${parseP(S).map(g => g.k[0] + (+g.a || 0)).join('')}`,
    info(S) {
      const v = cam(S), w = S.motor * TAU / 60, rows = [], sw = S.ftype === 'swing', u = sw ? '°' : 'mm';
      const max = k => Math.max(...v.mo.map(m => Math.abs(m[k])));
      rows.push([sw ? 'Swing' : 'Lift', f(v.sMax - v.sMin, 2) + ' ' + u]);
      rows.push(['Peak speed', sw ? f(max('s1') * w, 1) + ' °/s' : f(max('s1') * w, 1) + ' mm/s']);
      rows.push(['Peak acceleration', sw ? f(max('s2') * w * w * deg, 1) + ' rad/s²' : f(max('s2') * w * w / 1000, 2) + ' m/s²']);
      rows.push(['Peak jerk', sw ? f(max('s3') * w ** 3 * deg, 0) + ' rad/s³' : f(max('s3') * w ** 3 / 1000, 0) + ' m/s³']);
      if (!sw && S.mass > 0) rows.push(['Peak inertia force', f(S.mass * max('s2') * w * w / 1000, 1) + ' N']);
      if (S.ftype !== 'flat') {
        const lim = sw ? 35 : 30;
        rows.push(['Pressure angle, rise', f(v.pa.rise / deg, 1) + '°', v.pa.rise / deg > lim ? 'soft' : 0]);
        rows.push(['Pressure angle, fall', f(v.pa.fall / deg, 1) + '°', v.pa.fall / deg > lim ? 'soft' : 0]);
        if (v.pa.rise / deg > lim) rows.push(['High pressure angle', `Over ${lim}° on the rise pushes the follower sideways. Use a bigger base circle, a longer rise angle, or an offset.`, 2]);
      }
      rows.push(['Cam size', `Ø ${f(2 * v.rMax, 1)} mm (smallest radius ${f(v.rMin, 1)})`]);
      if (S.ftype === 'roller' || S.ftype === 'swing') {
        rows.push(['Tightest convex curve (pitch)', f(v.rhoMinConvex, 1) + ' mm', v.rhoMinConvex < 1.5 * S.Rr ? 'soft' : 0]);
        if (v.rhoMinConvex < S.Rr) rows.push(['Undercut', `The pitch curve bends tighter (${f(v.rhoMinConvex, 1)} mm) than the roller radius. Use a smaller roller or a bigger base circle.`, 2]);
      }
      if (S.ftype === 'flat') {
        rows.push(['Smallest radius of curvature', f(v.rhoFlat, 1) + ' mm', v.rhoFlat <= 0]);
        rows.push(['Face width needed', `${f(v.face[1] - v.face[0] + 10, 1)} mm (contact from ${f(v.face[0], 1)} to ${f(v.face[1], 1)})`]);
        if (v.rhoFlat <= 0) rows.push(['Cusp', 'A flat follower cannot follow this motion. Use a bigger base circle or gentler rises.', 2]);
      }
      if (Math.abs(v.total - 360) > 0.01) rows.push(['Program length', `The steps add up to ${f(v.total, 1)}°, not 360°`, 2]);
      if (Math.abs(v.net) > 0.001) rows.push(['Program does not close', `The follower ends ${f(v.net, 2)} ${u} away from where it started, so the cam would have a step`, 2]);
      if (parseP(S).some(g => g.k !== 'dwell' && g.law === 'uniform')) rows.push(['Constant velocity', 'Gives a jolt (infinite acceleration) at each end. Fine for slow cams only.', 2]);
      if (S.bore / 2 > v.rMin - 2) rows.push(['Bore too big', 'Leave at least 2 mm of material between the bore and the cam edge', 2]);
      v.errs.forEach(e => rows.push([e[0], e[1], 2]));
      return rows;
    }
  });
})();
