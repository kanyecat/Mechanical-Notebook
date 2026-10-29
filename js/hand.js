/* Hands-on drawings: grab any moving part of a drawing and turn it by hand, flick it to spin, or switch to Reshape and drag a
   part to change the design. Works on every page drawn with the engine without per-page code: the drawing is replayed into a
   recording canvas that keeps the line segments it draws, so the page can tell which part is under the pointer and how that
   part moves when the drive angle (or a design value) changes. Optional extras a page can give: clicks(a, p) returning a
   number that steps up as teeth mesh or a pawl drops in (each change makes a click sound), and clickSound ('tick' or 'clack').
   MIT licence. */
(function () {
  const MM = window.MM, TAU = Math.PI * 2;

  /* ---------- a canvas stand-in that records what is drawn ---------- */
  function Rec(view) { this.view = view; this.m = [1, 0, 0, 1, 0, 0]; this.stack = []; this.s = []; this.sx = 0; this.sy = 0; this.lx = 0; this.ly = 0; this.has = false; this.max = 1.2 * Math.max(view.w, view.h); this.pid = 0; this.ids = []; this.txt = []; this.canvas = { width: view.w, height: view.h, clientWidth: view.w, clientHeight: view.h }; }
  const R = Rec.prototype;
  R.tp = function (x, y) { const m = this.m; return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]; };
  R.mul = function (a, b, c, d, e, f) { const m = this.m; this.m = [m[0] * a + m[2] * b, m[1] * a + m[3] * b, m[0] * c + m[2] * d, m[1] * c + m[3] * d, m[0] * e + m[2] * f + m[4], m[1] * e + m[3] * f + m[5]]; };
  R.seg = function (x1, y1, x2, y2) { if (Math.hypot(x2 - x1, y2 - y1) < this.max) { this.s.push(x1, y1, x2, y2); this.ids.push(this.pid); } };   // ids: which drawn shape (path) each segment belongs to
  R.save = function () { this.stack.push(this.m.slice()); }; R.restore = function () { if (this.stack.length) this.m = this.stack.pop(); };
  R.translate = function (x, y) { this.mul(1, 0, 0, 1, x, y); };
  R.rotate = function (a) { const c = Math.cos(a), s = Math.sin(a); this.mul(c, s, -s, c, 0, 0); };
  R.scale = function (x, y) { this.mul(x, 0, 0, y, 0, 0); };
  R.transform = function (a, b, c, d, e, f) { this.mul(a, b, c, d, e, f); };
  R.setTransform = function (a, b, c, d, e, f) { this.m = typeof a === 'object' ? [a.a, a.b, a.c, a.d, a.e, a.f] : [a, b, c, d, e, f]; };
  R.resetTransform = function () { this.m = [1, 0, 0, 1, 0, 0]; };
  R.beginPath = function () { this.has = false; this.pid++; };
  R.moveTo = function (x, y) { const p = this.tp(x, y); this.sx = this.lx = p[0]; this.sy = this.ly = p[1]; this.has = true; };
  R.lineTo = function (x, y) { const p = this.tp(x, y); if (this.has) this.seg(this.lx, this.ly, p[0], p[1]); else { this.sx = p[0]; this.sy = p[1]; this.has = true; } this.lx = p[0]; this.ly = p[1]; };
  R.closePath = function () { if (this.has) this.seg(this.lx, this.ly, this.sx, this.sy); this.lx = this.sx; this.ly = this.sy; };
  R.bezierCurveTo = function (a, b, c, d, x, y) { this.lineTo(x, y); }; R.quadraticCurveTo = function (a, b, x, y) { this.lineTo(x, y); };
  R.arc = function (x, y, r, a0, a1, ccw) {
    const c = this.tp(x, y); this.s.push(c[0], c[1], c[0], c[1]); this.ids.push(this.pid);   // the centre, as a point
    let d = a1 - a0; if (ccw && d > 0) d -= TAU; if (!ccw && d < 0) d += TAU; if (Math.abs(d) > TAU) d = Math.sign(d) * TAU;
    const n = 16;   // always the same number of points, so a part keeps the same segments from frame to frame
    for (let i = 0; i <= n; i++) { const t = a0 + d * i / n; this.lineTo(x + r * Math.cos(t), y + r * Math.sin(t)); }
  };
  R.ellipse = function (x, y, rx, ry, rot, a0, a1) { this.save(); this.translate(x, y); this.rotate(rot || 0); this.scale(rx || 1e-6, ry || 1e-6); this.arc(0, 0, 1, a0, a1); this.restore(); };
  R.rect = function (x, y, w, h) { this.moveTo(x, y); this.lineTo(x + w, y); this.lineTo(x + w, y + h); this.lineTo(x, y + h); this.closePath(); };
  R.roundRect = function (x, y, w, h) { this.rect(x, y, w, h); };
  R.fillRect = R.strokeRect = function (x, y, w, h) { this.beginPath(); this.rect(x, y, w, h); };
  R.measureText = function (s) { return { width: String(s).length * 7 }; };
  R.createLinearGradient = R.createRadialGradient = R.createPattern = function () { return { addColorStop() {} }; };
  R.getLineDash = function () { return []; };
  R.isPointInPath = R.isPointInStroke = function () { return false; };
  R.getTransform = function () { const m = this.m; return { a: m[0], b: m[1], c: m[2], d: m[3], e: m[4], f: m[5] }; };
  R.fillText = R.strokeText = function (t, x, y) { const w = String(t).length * 7, a = this.tp(x - w, y), b = this.tp(x + w, y); this.txt.push(a[0], a[1] - 7, b[0], b[1] + 7); };   // kept apart: only for framing a close-up
  ['fill', 'stroke', 'clip', 'fillText', 'strokeText', 'setLineDash', 'drawImage', 'clearRect', 'putImageData'].forEach(k => { if (!R[k]) R[k] = function () {}; });

  const clone = st => { try { return structuredClone(st || {}); } catch (e) { return Object.assign({}, st || {}); } };
  // draw the mechanism at angle a with design values p into a recorder; returns the flat list of segments [x1,y1,x2,y2,...]
  MM.record = function (m, a, p) {
    const v = m.view || { w: 700, h: 540 }, rc = new Rec(v), g = new MM.Gfx(rc, v); g.state = clone(m._state); g.ts = m._ts || 1;
    try { m.draw(g, a, p); } catch (e) { return null; }
    rc.s.ids = rc.ids; rc.s.txt = rc.txt; return rc.s;
  };
  const near = (s, i, x, y) => {   // closest point on segment i to (x, y): [distance, u]
    const x1 = s[i], y1 = s[i + 1], dx = s[i + 2] - x1, dy = s[i + 3] - y1, L = dx * dx + dy * dy, u = L ? Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / L)) : 0;
    return [Math.hypot(x1 + u * dx - x, y1 + u * dy - y), u];
  };
  // the same segment in another frame: same place in the list if the drawing has the same number of segments, otherwise the
  // nearby segment (in the list) of about the same length closest to where it was (drawings that add or drop a few lines)
  const len4 = (s, k) => Math.hypot(s[k + 2] - s[k], s[k + 3] - s[k + 1]);
  const match = (s, ref) => {
    if (!s) return -1; const n = s.length / 4; if (n === ref.n) return ref.i;
    const D = Math.abs(n - ref.n) + 4, i0 = ref.i / 4, g = ref.seg, L0 = Math.hypot(g[2] - g[0], g[3] - g[1]), mx = (g[0] + g[2]) / 2, my = (g[1] + g[3]) / 2; let best = -1, bs = 1e9;
    for (let j = Math.max(0, i0 - D); j <= Math.min(n - 1, i0 + D); j++) { const k = j * 4, sc = 2 * Math.abs(len4(s, k) - L0) + Math.hypot((s[k] + s[k + 2]) / 2 - mx, (s[k + 1] + s[k + 3]) / 2 - my) + Math.abs(j - i0) * 0.5; if (sc < bs) { bs = sc; best = k; } }
    return bs < 90 ? best : -1;
  };
  const refOf = (s, i) => ({ i, n: s.length / 4, seg: s.slice(i, i + 4) });
  const at = (s, i, u) => s && s.length > i + 3 ? [s[i] + u * (s[i + 2] - s[i]), s[i + 1] + u * (s[i + 3] - s[i + 1])] : null;
  // which moving segment is under (x, y)? (moving: it shifts when the angle changes a little)
  MM.grabAt = function (m, a, p, x, y, r, any, map, per) {
    map = map || (v => v); per = per || m.period || TAU; const s0 = MM.record(m, map(a), p); if (!s0) return null;
    // probe a little and a lot either side: parts that pause for part of the cycle still count as moving
    const probes = [per * 0.004, -per * 0.004, per * 0.08, -per * 0.08, per * 0.25, -per * 0.25].map(h => [h, MM.record(m, map(a + h), p)]);
    let best = null;
    for (let i = 0; i < s0.length; i += 4) {
      const [d, u] = near(s0, i, x, y); if (d > r || (best && d >= best.d)) continue;
      const P = at(s0, i, u), ref = refOf(s0, i); let mv = 0, bad = false;
      const L0 = Math.hypot(s0[i + 2] - s0[i], s0[i + 3] - s0[i + 1]);
      probes.forEach(([h, s]) => { const k = match(s, ref); if (k < 0) return; const A = at(s, k, u), L = len4(s, k); if (Math.abs(L - L0) > Math.max(12, L0 * 0.6)) { if (Math.abs(h) < per * 0.01) bad = true; return; }   // not the same segment any more
        const dd = Math.hypot(A[0] - P[0], A[1] - P[1]); if (Math.abs(h) < per * 0.01 && dd > 30) bad = true; mv = Math.max(mv, dd); });
      if (!bad && (any || mv > 0.5)) best = { i, u, d, P, mv, ref };
    }
    return best;
  };

  /* ---------- what the main drawing shows on top: the part under the pointer, lit up whole, and the part that drives ---------- */
  // the driver: a point that turns about a fixed centre exactly as fast as the drive angle (a crank pin, a driving gear)
  MM.findDriver = function (m, a, p) {
    const d = 0.15, s0 = MM.record(m, a, p), s1 = MM.record(m, a + d, p), s2 = MM.record(m, a + 2 * d, p);
    if (!s0 || !s1 || !s2 || s0.length !== s1.length || s1.length !== s2.length) return null;
    let best = null;
    for (let i = 0; i < s0.length; i += 4) {
      const P = [s0[i], s0[i + 1]], Q = [s1[i], s1[i + 1]], T = [s2[i], s2[i + 1]];
      const ax = Q[0] - P[0], ay = Q[1] - P[1], bx = T[0] - P[0], by = T[1] - P[1], D = 2 * (ax * by - ay * bx); if (Math.abs(D) < 1e-6) continue;
      const ux = (by * (ax * ax + ay * ay) - ay * (bx * bx + by * by)) / D, uy = (ax * (bx * bx + by * by) - bx * (ax * ax + ay * ay)) / D, R = Math.hypot(ux, uy), cx = P[0] + ux, cy = P[1] + uy;
      if (R < 15 || R > 260 || (best && R <= best.R)) continue;
      const ang = q => Math.atan2(q[1] - cy, q[0] - cx), w = x => Math.atan2(Math.sin(x), Math.cos(x)), t1 = w(ang(Q) - ang(P)), t2 = w(ang(T) - ang(Q));
      if (Math.abs(Math.abs(t1) - d) > 0.004 || Math.abs(t2 - t1) > 0.004) continue;
      best = { cx, cy, R, phi0: ang(P), a0: a, dir: Math.sign(t1) };
    }
    return best;
  };
  MM.overlay = function (ctx, m, a, p) {
    const COL = MM.COL, held = m._grab, hov = held || m._hover;
    if (hov && hov.ref) {   // light up the whole part: every segment drawn in the same shape as the one under the pointer
      const s = MM.record(m, a, p), k = s ? match(s, hov.ref) : -1;
      if (k >= 0 && s.ids) { const id = s.ids[k / 4]; ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        [[9, MM.tint('red', held ? 0.35 : 0.22)], [2, COL.red]].forEach(([w, c]) => { ctx.lineWidth = w; ctx.strokeStyle = c; ctx.beginPath(); for (let j = 0; j < s.ids.length; j++) if (s.ids[j] === id) { const q = j * 4; ctx.moveTo(s[q], s[q + 1]); ctx.lineTo(s[q + 2], s[q + 3]); } ctx.stroke(); });
        ctx.restore(); }
    }
    if (held) { ctx.save(); ctx.lineWidth = 2; ctx.strokeStyle = COL.red; ctx.fillStyle = MM.tint('red', 0.3); ctx.beginPath(); ctx.arc(held.x, held.y, 10, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore(); }
    const dv = m._driver;
    if (dv && !held && m._badge) {   // "turn me": a curved arrow round the driving part, pointing the way it turns
      const ph = dv.phi0 + dv.dir * (a - dv.a0), px = dv.cx + dv.R * Math.cos(ph), py = dv.cy + dv.R * Math.sin(ph), rr = dv.R + 16, a0 = ph + dv.dir * 0.25, a1 = ph + dv.dir * 1.25;
      ctx.save(); ctx.strokeStyle = COL.red; ctx.fillStyle = COL.red; ctx.lineWidth = 2.2; ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.arc(dv.cx, dv.cy, rr, Math.min(a0, a1), Math.max(a0, a1)); ctx.stroke(); ctx.setLineDash([]);
      const ex = dv.cx + rr * Math.cos(a1), ey = dv.cy + rr * Math.sin(a1), tx = -Math.sin(a1) * dv.dir, ty = Math.cos(a1) * dv.dir;
      ctx.beginPath(); ctx.moveTo(ex + tx * 9, ey + ty * 9); ctx.lineTo(ex - ty * 6, ey + tx * 6); ctx.lineTo(ex + ty * 6, ey - tx * 6); ctx.closePath(); ctx.fill();
      ctx.lineWidth = 2; ctx.fillStyle = MM.tint('red', 0.25); ctx.beginPath(); ctx.arc(px, py, 9, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = COL.red; ctx.font = '700 12px ui-monospace,Menlo,Consolas,monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const lx = dv.cx + (rr + 20) * Math.cos((a0 + a1) / 2), ly = dv.cy + (rr + 20) * Math.sin((a0 + a1) / 2); ctx.fillText('drag to turn', Math.max(50, Math.min((m.view || { w: 700 }).w - 50, lx)), Math.max(12, ly));
      ctx.restore();
    }
  };

  /* ---------- sound and touch feedback ---------- */
  let AC = null;
  const SND = { get on() { try { return localStorage.getItem('mn-sound') === '1'; } catch (e) { return false; } }, set on(v) { try { localStorage.setItem('mn-sound', v ? '1' : '0'); } catch (e) {} } };
  MM.click = function (kind, vib) {
    if (vib && navigator.vibrate) try { navigator.vibrate(kind === 'clack' ? 14 : 6); } catch (e) {}
    if (!SND.on) return;
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume();
      const t = AC.currentTime, n = Math.round(AC.sampleRate * (kind === 'clack' ? 0.05 : 0.025)), b = AC.createBuffer(1, n, AC.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, kind === 'clack' ? 3 : 6);
      const src = AC.createBufferSource(), f = AC.createBiquadFilter(), gn = AC.createGain();
      f.type = 'bandpass'; f.frequency.value = kind === 'clack' ? 1800 : 3600; f.Q.value = kind === 'clack' ? 2 : 5;
      gn.gain.setValueAtTime(kind === 'clack' ? 0.9 : 0.45, t);
      src.buffer = b; src.connect(f); f.connect(gn); gn.connect(AC.destination); src.start(t);
    } catch (e) {}
  };
  MM.sound = SND;

  /* ---------- the hand: attach to a drawing canvas ----------
     o: { m, getA, setA(a), getP, playing(), setPlaying(v), dir(), speed(), params, setParam(k, v), tip (element), onTurn() } */
  MM.hand = function (cv, o) {
    const m = o.m, map = o.map || (v => v), per = o.period || m.period || TAU, h = per * 0.004;   // map: from the angle the hand drives to this drawing's angle (Combine chains)
    let mode = 'turn', drag = null, hover = null, coast = 0, coastFrom = 0, lastClick = null, raf = 0, Q = null;
    const toView = e => { const r = cv.getBoundingClientRect(), v = m.view || { w: 700, h: 540 }; return [(e.clientX - r.left) / r.width * v.w, (e.clientY - r.top) / r.height * v.h, v.w / r.width]; };
    const tip = o.tip;
    const say = (msg, x, y) => { if (!tip) return; if (!msg) { tip.hidden = true; return; } tip.hidden = false; tip.innerHTML = msg; const r = cv.getBoundingClientRect(), pr = cv.offsetParent ? cv.offsetParent.getBoundingClientRect() : r, v = m.view || { w: 700 }; const px = x / v.w * r.width + r.left - pr.left, py = y / (v.h || 540) * r.height + r.top - pr.top; tip.style.left = Math.max(4, Math.min(r.width - tip.offsetWidth - 4, px - tip.offsetWidth / 2)) + (r.left - pr.left) + 'px'; tip.style.top = Math.max(0, py - tip.offsetHeight - 22) + 'px'; };
    const setGrab = (P, on) => { m._grab = P ? { x: P[0], y: P[1], on: !!on, mode, ref: drag && drag.ref } : null; };
    let found = null;   // the segment pos() found last, so the hold can follow it
    const pos = (a, p) => { const s = MM.record(m, map(a), p), k = match(s, drag.ref); if (k < 0) return null; found = refOf(s, k); return at(s, k, drag.u); };
    const commit = (a, p) => { if (pos(a, p) && found) drag.ref = found; };

    // turn: find the angle that brings the grabbed point closest to the pointer
    function solveTurn(q) {
      const P0 = o.getP(); let a = o.getA(), P = pos(a, P0); if (!P) return;
      let d0 = Math.hypot(P[0] - q[0], P[1] - q[1]);
      for (let it = 0; it < 4 && d0 > 0.5; it++) {
        // slope of the point's path; if it is not moving here (a pause in the cycle), look a little further ahead or behind
        let vx = 0, vy = 0, vv = 0;
        find: for (const hh of [h, per / 48, per / 12, per / 6, per / 4]) for (const sg of [1, -1]) {
          const P2 = pos(a + sg * hh, P0); if (!P2 || Math.hypot(P2[0] - P[0], P2[1] - P[1]) > 200) continue;
          const tx = (P2[0] - P[0]) / (sg * hh), ty = (P2[1] - P[1]) / (sg * hh); if (tx * tx + ty * ty < 1e-3) continue;
          vx = tx; vy = ty; vv = tx * tx + ty * ty; break find;
        }
        if (vv < 1e-4) break;
        let da = Math.max(-per / 16, Math.min(per / 16, ((q[0] - P[0]) * vx + (q[1] - P[1]) * vy) / vv)), ok = false;
        for (let k = 0; k < 4; k++) { const Pn = pos(a + da, P0), dn = Pn ? Math.hypot(Pn[0] - q[0], Pn[1] - q[1]) : 1e9; if (dn < d0) { a += da; P = Pn; d0 = dn; ok = true; break; } da /= 2; }
        if (!ok) break;
      }
      // stuck (a dead point, or a pause in the cycle): look further round the cycle for a better fit
      if (d0 > 14) {
        let bj = a, bd = d0;
        for (let j = -12; j <= 12; j++) { if (!j) continue; const aj = a + j * per / 24, Pj = pos(aj, P0), dj = Pj ? Math.hypot(Pj[0] - q[0], Pj[1] - q[1]) : 1e9; if (dj < bd) { bd = dj; bj = aj; } }
        if (bd < d0 - 3) { a = bj; P = pos(a, P0) || P; d0 = bd; }
      }
      commit(a, P0); o.setA(a); setGrab(P, true);
      const now = performance.now(); drag.hist.push([now, a]); while (drag.hist.length > 2 && now - drag.hist[0][0] > 120) drag.hist.shift();
    }
    // reshape: change the one design value that moves the grabbed point most
    function startReshape() {
      const P0 = o.getP(), a = o.getA(), base = pos(a, P0); let best = null;
      (o.params || []).filter(q => !q.options).forEach(q => {
        const step = q.step * Math.max(1, Math.round((q.max - q.min) / q.step / 200)), v = P0[q.key], dv = v + step > q.max ? -step : step;
        const P1 = pos(a, Object.assign({}, P0, { [q.key]: v + dv })); if (!P1 || !base) return;
        const sens = Math.hypot(P1[0] - base[0], P1[1] - base[1]) / Math.abs(dv) * (q.max - q.min);
        if (sens > 6 && (!best || sens > best.sens)) best = { q, sens, dv };
      });
      drag.k = best; return best;
    }
    function solveReshape(q) {
      const b = drag.k; if (!b) return; const P0 = o.getP(), a = o.getA(), key = b.q.key; let v = P0[key];
      for (let it = 0; it < 3; it++) {
        const P = pos(a, Object.assign({}, P0, { [key]: v })), P1 = pos(a, Object.assign({}, P0, { [key]: v + b.dv })); if (!P || !P1) break;
        const vx = (P1[0] - P[0]) / b.dv, vy = (P1[1] - P[1]) / b.dv, vv = vx * vx + vy * vy; if (vv < 1e-8) break;
        const e0 = Math.hypot(q[0] - P[0], q[1] - P[1]); let dv = ((q[0] - P[0]) * vx + (q[1] - P[1]) * vy) / vv, ok = false;
        for (let k = 0; k < 5 && !ok; k++) { const nv = Math.max(b.q.min, Math.min(b.q.max, v + dv)), Pn = pos(a, Object.assign({}, P0, { [key]: nv })); if (Pn && Math.hypot(q[0] - Pn[0], q[1] - Pn[1]) < e0) { v = nv; ok = true; } else dv /= 2; }
        if (!ok) break;
      }
      o.setParam(key, v); const nv = o.getP()[key], P = pos(a, o.getP()) || q; commit(a, o.getP());
      setGrab(P, true); say(`<b>${b.q.label}</b> ${(b.q.step < 1 ? (+nv).toFixed(b.q.step < 0.1 ? 2 : 1) : nv)}${b.q.unit || ''}`, P[0], P[1]);
    }
    const loop = () => { raf = 0; if (drag && Q) { (mode === 'turn' ? solveTurn : solveReshape)(Q); Q = null; } };

    cv.addEventListener('pointerdown', e => {
      if (e.button > 0) return;
      const [x, y, k] = toView(e), r = (e.pointerType === 'touch' ? 26 : 16) * k, pk = MM.grabAt(m, o.getA(), o.getP(), x, y, r, mode === 'reshape', map, per);
      if (!pk && mode === 'turn' && e.pointerType !== 'touch') {   // missed every moving part: dragging sideways steps through the cycle instead
        drag = { scrub: true, x0: e.clientX, a0: o.getA(), id: e.pointerId, was: o.playing(), hist: [[performance.now(), o.getA()]] }; coast = 0; o.setPlaying(false); cv.classList.add('grabbing');
        try { cv.setPointerCapture(e.pointerId); } catch (_) {} e.preventDefault(); return;
      }
      if (!pk) { if (e.pointerType !== 'touch') { say(mode === 'turn' ? 'Grab a part that moves.' : 'Grab a part to change its size.', x, y); setTimeout(() => { if (!drag) say(null); }, 1400); } return; }
      drag = { ref: pk.ref, u: pk.u, id: e.pointerId, was: o.playing(), hist: [[performance.now(), o.getA()]] };
      if (mode === 'reshape' && !startReshape()) { say('No design value changes this part. Try another one.', x, y); drag = null; setTimeout(() => say(null), 1600); return; }
      coast = 0; o.setPlaying(false); setGrab(pk.P, true); cv.classList.add('grabbing');
      try { cv.setPointerCapture(e.pointerId); } catch (_) {}
      if (mode === 'reshape') solveReshape([x, y]); else say(null);
      e.preventDefault();
    });
    // on a phone, only stop the page scrolling when a part was grabbed
    cv.addEventListener('touchstart', e => { if (drag) e.preventDefault(); }, { passive: false });
    cv.addEventListener('touchmove', e => { if (drag) e.preventDefault(); }, { passive: false });
    cv.addEventListener('pointermove', e => {
      const [x, y, k] = toView(e);
      if (drag && drag.scrub && e.pointerId === drag.id) { const w = cv.getBoundingClientRect().width; o.setA(drag.a0 + (e.clientX - drag.x0) / w * per); const now = performance.now(); drag.hist.push([now, o.getA()]); while (drag.hist.length > 2 && now - drag.hist[0][0] > 120) drag.hist.shift(); return; }
      if (drag && e.pointerId === drag.id) { Q = [x, y]; if (!raf) raf = requestAnimationFrame(loop); return; }
      if (e.pointerType === 'touch') return;
      // hovering: show a hand over parts that can be grabbed (checked a few times a second)
      const now = performance.now(); if (now - (hover || 0) < 70) return; hover = now;
      const pk = MM.grabAt(m, o.getA(), o.getP(), x, y, 16 * k, mode === 'reshape', map, per);
      cv.classList.toggle('grabbable', !!pk); m._hover = pk ? { x: pk.P[0], y: pk.P[1], ref: pk.ref } : null;
    });
    const end = e => {
      if (!drag || (e && e.pointerId !== drag.id)) return;
      const hst = drag.hist, was = drag.was; drag = null; setGrab(null); cv.classList.remove('grabbing');
      if (mode === 'turn') {
        // a flick keeps it spinning; it slows down by friction (and the motor takes over again if it was running)
        const a0 = hst[0], a1 = hst[hst.length - 1], dt = (a1[0] - a0[0]) / 1000, vel = dt > 0.01 && performance.now() - a1[0] < 80 ? (a1[1] - a0[1]) / dt : 0;
        coast = Math.abs(vel) > per * 0.15 ? vel : 0; coastFrom = performance.now();
        if (was) o.setPlaying(true);
        setTimeout(() => say(null), 2200);
      } else say(null);
    };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end); cv.addEventListener('lostpointercapture', end);
    cv.addEventListener('pointerleave', () => { inside = false; if (!drag) { m._hover = null; cv.classList.remove('grabbable'); } });
    cv.addEventListener('pointerenter', () => { inside = true; });
    let inside = false;
    const refresh = () => { m._driver = o.map ? null : MM.findDriver(m, o.getA(), o.getP()); };   // which part drives (found again when the design changes)
    refresh();
    // keyboard: arrow keys turn it a little at a time
    cv.tabIndex = 0;
    cv.addEventListener('keydown', e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); o.setPlaying(false); o.setA(o.getA() + (e.key === 'ArrowRight' ? 1 : -1) * per / (e.shiftKey ? 12 : 72)); } });

    return {
      setMode(v) { mode = v; cv.classList.toggle('reshaping', v === 'reshape'); },
      refresh,
      // called every frame: coasting after a flick, and clicks as teeth mesh
      step(dt, a) {
        m._badge = !drag && (inside || !o.playing()) && !coast;   // the 'drag to turn' arrow shows when it is still or the pointer is over it
        if (coast) { o.setA(a + coast * dt); coast *= Math.exp(-dt * 1.6); if (Math.abs(coast) < per * 0.05) coast = 0; a = o.getA(); }
        if (m.clicks) { const c = m.clicks(map(a), o.getP()); if (lastClick != null && c !== lastClick) MM.click(m.clickSound || 'tick', !!drag || !!coast); lastClick = c; }
      },
      busy: () => !!drag || !!coast
    };
  };
  /* ---------- Try it: a second, still drawing with handles on the sizes that matter ----------
     m.tryit = { keys: ['A', { key: 'B', at: p => [x, y] }...], pose: 0..1 (where in the cycle to show it), valid: p => bool (track turns
     red where false), why: 'what red means', tasks: [{ text, now: p => 'current value', ok: p => bool }] }
     A key given as a string finds its own handle: the drawn point that moves most when that size changes. */
  MM.tryit = function (sec, m, o) {
    const T = m.tryit, per = m.period || TAU, v = m.view || { w: 700, h: 540 }, cv = sec.querySelector('canvas'), tip = sec.querySelector('.handtip'), taskEl = sec.querySelector('.trytask'), runB = sec.querySelector('[data-try="run"]');
    const m2 = Object.create(m); m2._state = {}; m2._hl = null; m2._grab = m2._hover = m2._driver = null;
    const pose = (T.pose == null ? 0.15 : T.pose) * per; let a = pose, running = false, dirty = true, drag = null, hov = null, ti = 0, busyT = 0;
    const H = (T.keys || []).map(k => { if (typeof k === 'string') k = { key: k }; const key = k.key, q = (o.params || []).find(x => x.key === key); return q ? { q, at: k.at, vals: k.vals, label: k.label || q.label, tr: null } : null; }).filter(Boolean);
    const P = () => o.getP(), withV = (p, k, val) => Object.assign({}, p, { [k]: val });
    const fmt = (q, x) => (q.step < 1 ? (+x).toFixed(q.step < 0.1 ? 2 : 1) : String(Math.round(x))) + (q.unit || '');
    function track(h) {
      const q = h.q, n = Math.max(2, Math.min(25, Math.round((q.max - q.min) / q.step) + 1)), p0 = P(), vals = [];
      if (h.vals) vals.push(...h.vals);   // a key can list its own stops (for sizes that grow by ×10, such as a batch size)
      else for (let i = 0; i < n; i++) vals.push(+(Math.round((q.min + (q.max - q.min) * i / (n - 1)) / q.step) * q.step).toFixed(6));
      let pts;
      if (h.at) pts = vals.map(x => h.at(withV(p0, q.key, x)));
      else {
        // the handle: the drawn point that moves furthest when this size changes, followed from value to value
        const cur = p0[q.key], span = (q.max - q.min) * 0.2, s0 = MM.record(m2, pose, p0), sA = MM.record(m2, pose, withV(p0, q.key, Math.min(q.max, cur + span))), sB = MM.record(m2, pose, withV(p0, q.key, Math.max(q.min, cur - span)));
        if (!s0) return null; let bi = -1, bd = 0;
        for (let i = 0; i < s0.length; i += 4) { if (s0[i] < 0 || s0[i] > v.w || s0[i + 1] < 0 || s0[i + 1] > v.h) continue; let d = 0;
          [sA, sB].forEach(s => { const k = s ? match(s, refOf(s0, i)) : -1; if (k >= 0) d += Math.hypot(s[k] - s0[i], s[k + 1] - s0[i + 1]); });
          if (d > bd + 0.5) { bd = d; bi = i; } }
        if (bi < 0 || bd < 4) return null;
        let ref = refOf(s0, bi); const at0 = [s0[bi], s0[bi + 1]];
        // walk out from the current value both ways so each step only has to find the point a little way from where it was
        const ci = vals.reduce((b, x, i) => Math.abs(x - cur) < Math.abs(vals[b] - cur) ? i : b, 0); pts = new Array(vals.length);
        [[ci, vals.length, 1], [ci - 1, -1, -1]].forEach(([i0, i1, st]) => { let rf = ref; for (let i = i0; i !== i1; i += st) { const s = MM.record(m2, pose, withV(p0, q.key, vals[i])), k = s ? match(s, rf) : -1; if (k < 0) { pts[i] = null; continue; } pts[i] = [s[k], s[k + 1]]; rf = refOf(s, k); } });
        if (pts[ci] == null) pts[ci] = at0;
      }
      const ok = vals.map(x => T.valid ? !!T.valid(withV(p0, q.key, x)) : true);
      return { vals, pts, ok };
    }
    function rebuild(except) { H.forEach(h => { if (h !== except) h.tr = track(h); }); if (!m2._crop) frameIt(); dirty = true; }
    // close in on the drawing: everything it draws across the whole range of each size, plus the tracks, with a margin
    function frameIt() {
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; const add = (x, y) => { if (x < -50 || y < -50 || x > v.w + 50 || y > v.h + 50) return; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); };
      const p0 = P(), sets = [p0]; H.forEach(h => { sets.push(withV(p0, h.q.key, h.q.min), withV(p0, h.q.key, h.q.max)); });
      sets.forEach(p => { const s = MM.record(m2, pose, p); if (s) { for (let i = 0; i < s.length; i += 2) add(s[i], s[i + 1]); for (let i = 0; i < s.txt.length; i += 2) add(s.txt[i], s.txt[i + 1]); } });
      H.forEach(h => (h.tr ? h.tr.pts : []).forEach(q => q && add(q[0], q[1])));
      if (x1 <= x0) return; const mg = 40; x0 = Math.max(0, x0 - mg); y0 = Math.max(0, y0 - mg); x1 = Math.min(v.w, x1 + mg); y1 = Math.min(v.h, y1 + mg);
      let w = x1 - x0, h = y1 - y0; if (w / h < 1.25) { const nw = Math.min(v.w, h * 1.25); x0 = Math.max(0, Math.min(v.w - nw, x0 - (nw - w) / 2)); w = nw; }   // not too tall and thin
      if (w / h > 2.2) { const nh = Math.min(v.h, w / 2.2); y0 = Math.max(0, Math.min(v.h - nh, y0 - (nh - h) / 2)); h = nh; }
      m2._crop = { x: x0, y: y0, w, h };
    }
    const posOf = h => { const tr = h.tr; if (!tr) return null; const x = P()[h.q.key], vs = tr.vals; let i = 0; while (i < vs.length - 2 && x > vs[i + 1]) i++; const f = vs[i + 1] === vs[i] ? 0 : Math.max(0, Math.min(1, (x - vs[i]) / (vs[i + 1] - vs[i]))), A = tr.pts[i], B = tr.pts[i + 1]; return A && B ? [A[0] + f * (B[0] - A[0]), A[1] + f * (B[1] - A[1])] : A || B; };
    function draw() {
      MM.frame(cv, m2, a, P()); if (running) return;
      const c = m2._crop || { x: 0, y: 0, w: v.w, h: v.h }, ctx = cv.getContext('2d'), sc = cv.width / c.w, ts = c.w / (cv.clientWidth || c.w), narrow = cv.clientWidth < 560, COL = MM.COL; ctx.save(); ctx.setTransform(sc, 0, 0, sc, -c.x * sc, -c.y * sc); ctx.lineCap = 'round';
      H.forEach(h => {
        if (drag && drag !== h) return; const tr = h.tr; if (!tr) return; const on = drag === h || hov === h;
        for (let i = 0; i < tr.pts.length - 1; i++) { const A = tr.pts[i], B = tr.pts[i + 1]; if (!A || !B) continue; ctx.setLineDash([6 * ts, 4 * ts]); ctx.lineWidth = (on ? 3.5 : 2.5) * ts; ctx.strokeStyle = tr.ok[i] && tr.ok[i + 1] ? MM.tint('ink', on ? 0.9 : 0.6) : COL.red; ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke(); }
        ctx.setLineDash([]);
        [[0, 1], [tr.pts.length - 1, tr.pts.length - 2]].forEach(([e, f]) => { const A = tr.pts[e], B = tr.pts[f]; if (!A || !B) return; const L = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1, nx = -(B[1] - A[1]) / L * 8 * ts, ny = (B[0] - A[0]) / L * 8 * ts; ctx.lineWidth = 2.5 * ts; ctx.strokeStyle = MM.tint('ink', 0.75); ctx.beginPath(); ctx.moveTo(A[0] - nx, A[1] - ny); ctx.lineTo(A[0] + nx, A[1] + ny); ctx.stroke(); });
        const p = posOf(h); if (!p) return; const r = (on ? 13 : narrow ? 9 : 11) * ts;
        ctx.fillStyle = COL.paper; ctx.strokeStyle = COL.red; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = COL.red; ctx.beginPath(); ctx.arc(p[0], p[1], r * 0.38, 0, TAU); ctx.fill();
        if (narrow && !on) return;   // on a phone the name shows only while the handle is held
        const txt = h.label + ' ' + fmt(h.q, P()[h.q.key]); ctx.font = `700 ${12 * ts}px ui-monospace,Menlo,Consolas,monospace`; const w = ctx.measureText(txt).width + 10;
        let lx = p[0] + r + 6, ly = p[1] - r - 4; if (lx + w > c.x + c.w - 4) lx = p[0] - r - 6 - w; if (ly < c.y + 14 * ts) ly = p[1] + r + 14 * ts;
        ctx.fillStyle = MM.tint('paper', 0.92); ctx.fillRect(lx, ly - 9 * ts, w, 18 * ts); ctx.fillStyle = on ? COL.red : COL.ink; ctx.textBaseline = 'middle'; ctx.fillText(txt, lx + 5, ly);
      });
      ctx.restore();
    }
    function showTask() {
      const ts = T.tasks || []; if (!ts.length) { taskEl.hidden = true; return; }
      const t = ts[ti], p = P(), ok = !!t.ok(p);
      taskEl.innerHTML = `<span class="tnum">Task ${ti + 1} of ${ts.length}</span><b>${t.text}</b><span class="tnow">Now: ${t.now(p)}</span>${ok ? `<span class="tok">✓ Done${ti < ts.length - 1 ? '' : '. That is all of them!'}</span>` : ''}${ok && ti < ts.length - 1 ? '<button type="button" data-try="next">Next task →</button>' : ''}${ti > 0 && !ok ? '<button type="button" class="ghost" data-try="prev">← Back</button>' : ''}`;
      taskEl.classList.toggle('done', ok);
      if (ok && !t._done) { t._done = true; MM.click('clack'); } if (!ok) t._done = false;
    }
    taskEl.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; ti = Math.max(0, Math.min((T.tasks || []).length - 1, ti + (b.dataset.try === 'next' ? 1 : -1))); showTask(); });
    runB.onclick = () => { running = !running; runB.textContent = running ? 'Stop' : 'Run it'; if (!running) a = pose; dirty = true; };
    sec.querySelector('[data-try="reset"]').onclick = () => { H.forEach(h => o.setParam(h.q.key, h.q.value)); rebuild(); showTask(); };
    const toView = e => { const r = cv.getBoundingClientRect(), c = m2._crop || { x: 0, y: 0, w: v.w, h: v.h }; return [c.x + (e.clientX - r.left) / r.width * c.w, c.y + (e.clientY - r.top) / r.height * c.h, c.w / r.width]; };
    const hit = (x, y, rad) => { let best = null, bd = rad; H.forEach(h => { const p = posOf(h); if (!p) return; const d = Math.hypot(p[0] - x, p[1] - y); if (d < bd) { bd = d; best = h; } }); return best; };
    const say = (msg, e) => { if (!msg) { tip.hidden = true; return; } tip.innerHTML = msg; tip.hidden = false; const r = cv.getBoundingClientRect(), pr = tip.offsetParent.getBoundingClientRect(); tip.style.left = Math.max(4, Math.min(r.width - tip.offsetWidth - 4, e.clientX - pr.left - tip.offsetWidth / 2)) + 'px'; tip.style.top = Math.max(0, e.clientY - pr.top - tip.offsetHeight - 26) + 'px'; };
    const tipFor = h => `<b>${h.label}</b> ${fmt(h.q, P()[h.q.key])} <span>(${fmt(h.q, h.q.min)} to ${fmt(h.q, h.q.max)})</span>` + (T.valid && !T.valid(P()) && T.why ? `<br>${T.why}` : '');
    cv.addEventListener('pointerdown', e => {
      if (running || e.button > 0) return; const [x, y, k] = toView(e), h = hit(x, y, (e.pointerType === 'touch' ? 30 : 20) * k); if (!h) return;
      drag = h; drag.id = e.pointerId; drag.last = h.tr.vals.reduce((b, x0, i) => Math.abs(x0 - P()[h.q.key]) < Math.abs(h.tr.vals[b] - P()[h.q.key]) ? i : b, 0);
      try { cv.setPointerCapture(e.pointerId); } catch (_) {} cv.classList.add('grabbing'); say(tipFor(h), e); dirty = true; e.preventDefault();
    });
    cv.addEventListener('touchstart', e => { if (drag) e.preventDefault(); }, { passive: false });
    cv.addEventListener('touchmove', e => { if (drag) e.preventDefault(); }, { passive: false });
    cv.addEventListener('pointermove', e => {
      const [x, y, k] = toView(e);
      if (drag && e.pointerId === drag.id) {
        // slide along the track: the nearest point on it, preferring the stretch near where the handle already is
        const tr = drag.tr; let best = null;
        for (let i = 0; i < tr.pts.length - 1; i++) { const A = tr.pts[i], B = tr.pts[i + 1]; if (!A || !B) continue; const dx = B[0] - A[0], dy = B[1] - A[1], L = dx * dx + dy * dy, f = L ? Math.max(0, Math.min(1, ((x - A[0]) * dx + (y - A[1]) * dy) / L)) : 0, d = Math.hypot(A[0] + f * dx - x, A[1] + f * dy - y) + Math.max(0, Math.abs(i - drag.last) - 2) * 3; if (!best || d < best.d) best = { d, i, f }; }
        if (best) { drag.last = best.i; const vs = tr.vals; o.setParam(drag.q.key, vs[best.i] + best.f * (vs[best.i + 1] - vs[best.i])); say(tipFor(drag), e); showTask(); dirty = true; }
        return;
      }
      if (e.pointerType === 'touch' || running) return;
      const h = hit(x, y, 20 * k); if (h !== hov) { hov = h; dirty = true; cv.classList.toggle('grabbable', !!h); if (h) say(tipFor(h) + '<br><span>Drag along the dashed track.</span>', e); else say(null); }
    });
    const end = e => { if (!drag || (e && e.pointerId !== drag.id)) return; const h = drag; drag = null; cv.classList.remove('grabbing'); say(null); clearTimeout(busyT); busyT = setTimeout(() => rebuild(h), 30); dirty = true; };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end); cv.addEventListener('lostpointercapture', end);
    cv.addEventListener('pointerleave', () => { if (!drag && hov) { hov = null; dirty = true; cv.classList.remove('grabbable'); say(null); } });
    rebuild(); showTask(); sec._H = H; Object.defineProperty(sec, '_crop', { get: () => m2._crop });
    window.addEventListener('resize', () => { dirty = true; });
    window.addEventListener('mn-theme', () => { dirty = true; });
    return {
      // a size changed somewhere else on the page (a slider, the calculator): move the handles, and redo the tracks shortly
      changed(key) { showTask(); if (drag) return; clearTimeout(busyT); busyT = setTimeout(() => rebuild(), 120); dirty = true; },
      step(dt) { if (running) { a += dt * (TAU / 5) * (per / TAU); dirty = true; } if (dirty) { dirty = false; const r = cv.getBoundingClientRect(); if (r.bottom > -50 && r.top < innerHeight + 50) draw(); else dirty = true; } }
    };
  };
})();
