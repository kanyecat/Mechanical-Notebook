/* Gear generator: involute spur gear meshing with a second spur gear, an internal ring gear, or a rack. MIT licence.
   Standard full-depth teeth: addendum 1 m, dedendum 1.25 m. Angles in radians, lengths in mm, y up. */
(function () {
  const G = window.GEN, TAU = Math.PI * 2, deg = Math.PI / 180;
  const inv = a => Math.tan(a) - a;
  const f = (v, d) => (v == null || !isFinite(v)) ? '—' : (+v).toFixed(d == null ? 2 : d);

  // half tooth angle at radius r for a tooth whose half angle at the pitch radius is psiP
  const halfAngle = (psiP, alpha, rb, r) => psiP + inv(alpha) - (r <= rb ? 0 : inv(Math.acos(rb / r)));

  /* ---------- tooth styles: how tall, how pointed and how rounded the teeth are. Both gears of a mesh use the same style. ---------- */
  const STYLES = {
    standard: { ha: 1, hf: 1.25, rnd: 0, name: 'Standard' },
    stub: { ha: 0.8, hf: 1.0, rnd: 0, name: 'Stub' },
    tall: { ha: 1.25, hf: 1.5, rnd: 0, name: 'Pointed' },
    soft: { ha: 1, hf: 1.25, rnd: 0.3, name: 'Soft' },
    straight: { ha: 1, hf: 1.25, rnd: 0, straight: true, name: 'Straight flank' }
  };
  let ST = Object.assign({ rr: 0 }, STYLES.standard);   // the style in force; set from the settings before any outline is built
  const setStyle = S => { const b = STYLES[S.tooth] || STYLES.standard; ST = Object.assign({}, b, { rr: Math.max(b.rnd, +S.rnd || 0) }); };
  const styleKey = () => [ST.ha, ST.hf, ST.straight ? 1 : 0, ST.rr].join(':');
  const fillet = (pts, r) => G.fillet(pts, r);

  /* External gear outline (centre at origin, tooth 0 centred on +x). */
  function external(z, m, alpha, x, backlash, n) {
    const rp = m * z / 2, rb = rp * Math.cos(alpha), ra = rp + m * (ST.ha + x), rf = rp - m * (ST.hf - x);
    const s = m * (Math.PI / 2 + 2 * x * Math.tan(alpha)) - backlash / 2, psiP = s / (2 * rp), pitch = TAU / z;
    const hA = r => ST.straight ? psiP - (r - rp) * Math.tan(alpha) / rp : halfAngle(psiP, alpha, rb, r), r0 = ST.straight ? rf : Math.max(rb, rf), pts = [];
    const flank = []; for (let i = 0; i <= n; i++) { const r = r0 + (ra - r0) * (i / n) ** 1.3; flank.push([r, Math.max(0, hA(r))]); }
    const psiRoot = hA(r0);
    for (let k = 0; k < z; k++) {
      const c = k * pitch;
      if (rf < rb && !ST.straight) pts.push([rf * Math.cos(c - psiRoot), rf * Math.sin(c - psiRoot)]);           // radial line below the base circle
      flank.forEach(([r, p]) => pts.push([r * Math.cos(c - p), r * Math.sin(c - p)]));           // right flank, going out
      const pt = flank[n][1]; for (let i = 1; i < 4; i++) { const a = c - pt + 2 * pt * i / 4; pts.push([ra * Math.cos(a), ra * Math.sin(a)]); }  // tip
      for (let i = n; i >= 0; i--) { const [r, p] = flank[i]; pts.push([r * Math.cos(c + p), r * Math.sin(c + p)]); }  // left flank, coming in
      if (rf < rb && !ST.straight) pts.push([rf * Math.cos(c + psiRoot), rf * Math.sin(c + psiRoot)]);
      const a0 = c + psiRoot, a1 = c + pitch - psiRoot, seg = Math.max(2, Math.ceil((a1 - a0) / (2 * deg)));  // root arc to the next tooth
      for (let i = 1; i < seg; i++) { const a = a0 + (a1 - a0) * i / seg; pts.push([rf * Math.cos(a), rf * Math.sin(a)]); }
    }
    return { pts: ST.rr > 0 ? fillet(pts, ST.rr * m) : pts, rp, rb, ra, rf, pointed: hA(ra) <= 0 };
  }

  /* Internal (ring) gear: the tooth spaces have the shape of an external tooth. Space 0 is centred on +x. */
  function internal(z, m, alpha, backlash, n) {
    const rp = m * z / 2, rb = rp * Math.cos(alpha), ri = rp - ST.ha * m, ro = rp + ST.hf * m;   // ri = tips of the ring teeth, ro = bottom of the spaces
    const e = m * Math.PI / 2 + backlash / 2, psiP = e / (2 * rp), pitch = TAU / z, hA = r => ST.straight ? psiP + (r - rp) * Math.tan(alpha) / rp : halfAngle(psiP, alpha, rb, r), r0 = ST.straight ? ri : Math.max(rb, ri), pts = [];
    const flank = []; for (let i = 0; i <= n; i++) { const r = r0 + (ro - r0) * i / n; flank.push([r, Math.max(0.002, hA(r))]); }
    const psiIn = hA(r0);
    for (let k = 0; k < z; k++) {
      const c = k * pitch;
      if (ri < rb && !ST.straight) pts.push([ri * Math.cos(c - psiIn), ri * Math.sin(c - psiIn)]);
      flank.forEach(([r, p]) => pts.push([r * Math.cos(c - p), r * Math.sin(c - p)]));
      const pt = flank[n][1]; for (let i = 1; i < 4; i++) { const a = c - pt + 2 * pt * i / 4; pts.push([ro * Math.cos(a), ro * Math.sin(a)]); }
      for (let i = n; i >= 0; i--) { const [r, p] = flank[i]; pts.push([r * Math.cos(c + p), r * Math.sin(c + p)]); }
      if (ri < rb && !ST.straight) pts.push([ri * Math.cos(c + psiIn), ri * Math.sin(c + psiIn)]);
      const a0 = c + psiIn, a1 = c + pitch - psiIn, seg = Math.max(2, Math.ceil((a1 - a0) / (2 * deg)));
      for (let i = 1; i < seg; i++) { const a = a0 + (a1 - a0) * i / seg; pts.push([ri * Math.cos(a), ri * Math.sin(a)]); }
    }
    return { pts: ST.rr > 0 ? fillet(pts, ST.rr * m) : pts, rp, rb, ri, ro };
  }

  /* Rack along y with teeth pointing to -x, pitch line at x = 0. A space is centred on y = 0. */
  function rack(nTeeth, m, alpha, backlash, body) {
    const p = Math.PI * m, s = p / 2 - backlash / 2, ta = Math.tan(alpha), ha = ST.ha * m, hf = ST.hf * m, pts = [];
    const y0 = -nTeeth / 2 * p;
    for (let k = 0; k < nTeeth; k++) {
      const c = y0 + (k + 0.5) * p + p / 2 * (nTeeth % 2 ? 1 : 0);   // tooth centres sit half a pitch from the space at y = 0
      pts.push([hf, c - s / 2 - hf * ta], [-ha, c - s / 2 + ha * ta], [-ha, c + s / 2 - ha * ta], [hf, c + s / 2 + hf * ta]);
    }
    const yA = pts[0][1] - 1, yB = pts[pts.length - 1][1] + 1;
    const all = [[hf + body, yA], [hf, yA]].concat(pts, [[hf, yB], [hf + body, yB]]);
    return { pts: ST.rr > 0 ? fillet(all, ST.rr * m) : all, len: yB - yA };
  }

  // working pressure angle for profile-shifted gears: inv(aw) = inv(a) + 2 tan(a) (x1 + x2)/(z1 + z2)
  function workingAngle(alpha, x1, x2, z1, z2) {
    const target = inv(alpha) + 2 * Math.tan(alpha) * (x1 + x2) / (z1 + z2); let a = alpha;
    for (let i = 0; i < 40; i++) { const fx = inv(a) - target, d = Math.tan(a) ** 2; a -= fx / d; a = Math.min(Math.max(a, 0.05), 1.3); }
    return a;
  }

  const cache = {};
  function geo(S) {
    setStyle(S);
    const key = styleKey() + JSON.stringify([S.z1, S.z2, S.m, S.pa, S.x1, S.x2, S.bl, S.type, S.fine, S.rackN, S.rim, S.bore1, S.bore2]);
    if (cache.key === key) return cache.v;
    const alpha = S.pa * deg, n = S.fine ? 36 : 12, m = S.m;
    const g1 = external(S.z1, m, alpha, S.x1, S.bl, n);
    const v = { alpha, g1, s1: { outer: g1.pts, circles: S.bore1 > 0 ? [{ x: 0, y: 0, r: S.bore1 / 2 }] : [] } };
    if (S.type === 'ext') {
      const g2 = external(S.z2, m, alpha, S.x2, S.bl, n), aw = workingAngle(alpha, S.x1, S.x2, S.z1, S.z2);
      v.g2 = g2; v.aw = aw; v.a = (g1.rp + g2.rp) * Math.cos(alpha) / Math.cos(aw);
      v.s2 = { outer: g2.pts, circles: S.bore2 > 0 ? [{ x: 0, y: 0, r: S.bore2 / 2 }] : [] };
      v.eps = (Math.sqrt(g1.ra ** 2 - g1.rb ** 2) + Math.sqrt(g2.ra ** 2 - g2.rb ** 2) - v.a * Math.sin(aw)) / (Math.PI * m * Math.cos(alpha));
    } else if (S.type === 'int') {
      const g2 = internal(S.z2, m, alpha, S.bl, n); v.g2 = g2; v.aw = alpha; v.a = g2.rp - g1.rp;
      v.s2 = { outer: G.circlePts(0, 0, g2.ro + S.rim, Math.max(120, S.z2 * 6)), holes: [g2.pts] };
      v.eps = (Math.sqrt(g1.ra ** 2 - g1.rb ** 2) - Math.sqrt(Math.max(0, g2.ri ** 2 - g2.rb ** 2)) + v.a * Math.sin(alpha)) / (Math.PI * m * Math.cos(alpha));
    } else {
      const r = rack(S.rackN, m, alpha, S.bl, S.rim); v.rk = r; v.aw = alpha; v.a = g1.rp + S.x1 * m;
      v.s2 = { outer: r.pts };
      v.eps = (Math.sqrt(g1.ra ** 2 - g1.rb ** 2) - g1.rb * Math.tan(alpha) + (m - S.x1 * m) / Math.sin(alpha)) / (Math.PI * m * Math.cos(alpha));
    }
    cache.key = key; cache.v = v; return v;
  }

  function pose(S, t) {
    const v = geo(S), z1 = S.z1, z2 = S.z2;
    if (S.type === 'ext') return { v, p1: [0, 0, t], p2: [v.a, 0, Math.PI + Math.PI / z2 - t * z1 / z2] };
    if (S.type === 'int') return { v, p1: [0, 0, t], p2: [-v.a, 0, t * z1 / z2] };
    return { v, p1: [0, 0, t], p2: [v.a, wrapRack(v.g1.rp * t, S.rackN, S.m), 0] };
  }

  // a rack only has so many teeth: slide it back by whole teeth so it stays in mesh on screen
  const wrapRack = (s, n, m) => { const W = Math.max(1, Math.floor(n / 3)) * Math.PI * m; return s - W * Math.round(s / W); };

  /* ================= Gear train: any number of gears, each joined to an earlier one ================= */
  //   { id, type: 'spur' | 'ring' | 'rack', z (teeth, or rack teeth), parent, how: 'mesh' | 'shaft', dir (° direction from the parent), bore, rim }
  //   The first gear is the driver at the origin. 'shaft' puts a second gear on the parent's shaft so they turn together (compound train).
  //   A spur meshes outside another spur or inside a ring; a ring can go around a spur; a rack runs along a spur.
  const TP = {
    pair: { name: 'Two gears', T: [{ id: 'G1', type: 'spur', z: 12, bore: 6 }, { id: 'G2', type: 'spur', z: 30, parent: 'G1', how: 'mesh', dir: 0, bore: 8 }] },
    idler: { name: 'Idler', T: [{ id: 'G1', type: 'spur', z: 16, bore: 6 }, { id: 'G2', type: 'spur', z: 12, parent: 'G1', how: 'mesh', dir: 0, bore: 6 }, { id: 'G3', type: 'spur', z: 24, parent: 'G2', how: 'mesh', dir: -30, bore: 8 }] },
    compound: { name: 'Compound 9 : 1', T: [{ id: 'G1', type: 'spur', z: 12, bore: 6 }, { id: 'G2', type: 'spur', z: 36, parent: 'G1', how: 'mesh', dir: 0, bore: 8 }, { id: 'G3', type: 'spur', z: 12, parent: 'G2', how: 'shaft', bore: 8 }, { id: 'G4', type: 'spur', z: 36, parent: 'G3', how: 'mesh', dir: 60, bore: 8 }] },
    star: { name: 'Planet set', T: [{ id: 'S', type: 'spur', z: 18, bore: 6 }, { id: 'P1', type: 'spur', z: 15, parent: 'S', how: 'mesh', dir: 90, bore: 4 }, { id: 'P2', type: 'spur', z: 15, parent: 'S', how: 'mesh', dir: 210, bore: 4 }, { id: 'P3', type: 'spur', z: 15, parent: 'S', how: 'mesh', dir: 330, bore: 4 }, { id: 'R', type: 'ring', z: 48, parent: 'P1', how: 'mesh', dir: 90, rim: 8 }] },
    rack: { name: 'Rack drive', T: [{ id: 'G1', type: 'spur', z: 14, bore: 6 }, { id: 'G2', type: 'spur', z: 28, parent: 'G1', how: 'mesh', dir: 180, bore: 8 }, { id: 'R1', type: 'rack', z: 24, parent: 'G1', how: 'mesh', dir: 0, rim: 10 }] }
  };
  const tCache = {};
  const parseT = S => { if (tCache.s !== S.train) { try { tCache.T = JSON.parse(S.train); } catch (e) { tCache.T = TP.pair.T; } tCache.s = S.train; } return tCache.T; };
  const gCache = {};
  function gearGeo(S, g) {   // outline in the gear's own frame, cached
    setStyle(S); const key = [styleKey(), g.type, g.z, g.bore, g.rim, S.m, S.pa, S.bl, S.fine].join(); if (gCache[key]) return gCache[key];
    const a = S.pa * deg, n = S.fine ? 30 : 10; let v;
    if (g.type === 'spur') { const e = external(g.z, S.m, a, 0, S.bl, n); v = { e, rp: e.rp, ra: e.ra, rf: e.rf, shape: { outer: e.pts, circles: g.bore > 0 ? [{ x: 0, y: 0, r: g.bore / 2 }] : [] } }; }
    if (g.type === 'ring') { const e = internal(g.z, S.m, a, S.bl, n); v = { e, rp: e.rp, ra: e.ro + g.rim, ri: e.ri, shape: { outer: G.circlePts(0, 0, e.ro + g.rim, Math.max(120, g.z * 6)), holes: [e.pts] } }; }
    if (g.type === 'rack') { const r = rack(g.z, S.m, a, S.bl, g.rim); v = { rp: 0, len: r.len, shape: { outer: r.pts } }; }
    if (Object.keys(gCache).length > 300) for (const k in gCache) delete gCache[k];
    return gCache[key] = v;
  }
  // positions, speeds (relative to the driver) and the starting angle that puts teeth into spaces at every mesh
  const tSolve = {};
  function solveT(S) {
    if (tSolve.s === S.train + S.m + S.pa + S.bl + S.fine + S.tooth + S.rnd) return tSolve.v;
    const T = parseT(S), out = {}, errs = [];
    T.forEach((g, i) => {
      const geo = gearGeo(S, g);
      if (i === 0 || !out[g.parent]) { out[g.id] = { g, geo, x: 0, y: 0, w: 1, th0: 0, z: 0 }; if (i) errs.push([g.id, 'is not connected to an earlier gear']); return; }
      const P = out[g.parent], pg = P.g, phi = (g.dir || 0) * deg, cx = Math.cos(phi), cy = Math.sin(phi);
      const zP = pg.z, zC = g.z, pitchP = TAU / zP, pitchC = TAU / zC;
      if (g.how === 'shaft') {
        if (g.type !== 'spur' || pg.type === 'rack') { errs.push([g.id, 'only a spur gear can share a shaft with another gear']); }
        out[g.id] = { g, geo, x: P.x, y: P.y, w: P.w, th0: P.th0, z: P.z + 1 }; return;
      }
      if (pg.type === 'rack') { errs.push([g.id, 'cannot be driven by a rack here. Join it to a gear instead.']); out[g.id] = { g, geo, x: P.x + 100, y: P.y, w: 0, th0: 0, z: 0 }; return; }
      if (pg.type === 'spur' && g.type === 'spur') {
        const a = P.geo.rp + geo.rp, th0 = phi + Math.PI - (0.5 - (phi - P.th0) / pitchP) * pitchC;
        out[g.id] = { g, geo, x: P.x + a * cx, y: P.y + a * cy, w: -P.w * zP / zC, th0, z: P.z };
      } else if (pg.type === 'spur' && g.type === 'ring') {
        if (zC - zP < 12) errs.push([g.id, `ring needs at least ${zP + 12} teeth to clear ${pg.id}`]);
        const a = geo.rp - P.geo.rp, th0 = phi - ((phi - P.th0) / pitchP) * pitchC;
        out[g.id] = { g, geo, x: P.x - a * cx, y: P.y - a * cy, w: P.w * zP / zC, th0, z: P.z };
      } else if (pg.type === 'ring' && g.type === 'spur') {
        if (zP - zC < 12) errs.push([g.id, `too big to fit inside ${pg.id}. Use ${zP - 12} teeth or fewer`]);
        const a = P.geo.rp - geo.rp, th0 = phi - ((phi - P.th0) / pitchP) * pitchC;
        out[g.id] = { g, geo, x: P.x + a * cx, y: P.y + a * cy, w: P.w * zP / zC, th0, z: P.z };
      } else if (pg.type === 'spur' && g.type === 'rack') {
        out[g.id] = { g, geo, x: P.x + P.geo.rp * cx, y: P.y + P.geo.rp * cy, rot: phi, rack: true, v: P.w * P.geo.rp, s0: P.geo.rp * (P.th0 - phi), z: P.z };   // rack travel s = rp (θ − φ) keeps a space at the contact point
      } else { errs.push([g.id, `a ${g.type} cannot mesh with a ${pg.type}`]); out[g.id] = { g, geo, x: P.x, y: P.y, w: 0, th0: 0, z: P.z }; }
    });
    // gears that are not joined but whose teeth would hit each other
    const list = Object.values(out).filter(o => o.g.type === 'spur');
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const A = list[i], B = list[j]; if (A.g.parent === B.g.id || B.g.parent === A.g.id || A.z !== B.z) continue;
      if (A.g.how === 'shaft' && A.g.parent === B.g.id || B.g.how === 'shaft' && B.g.parent === A.g.id) continue;
      const d = Math.hypot(A.x - B.x, A.y - B.y); if (d < A.geo.ra + B.geo.ra - 0.01 && Math.abs(d - (A.geo.rp + B.geo.rp)) > 0.01) errs.push([A.g.id + ' / ' + B.g.id, 'overlap. Change a direction angle or a tooth count.']);
    }
    tSolve.s = S.train + S.m + S.pa + S.bl + S.fine + S.tooth + S.rnd; tSolve.v = { out, errs }; return tSolve.v;
  }
  function trainParts(S, t, layout) {
    const { out } = solveT(S), parts = [], vals = Object.values(out);
    let fx = 0;
    vals.forEach(o => {
      const name = `${o.g.id} ${o.g.type === 'rack' ? 'rack' : o.g.type === 'ring' ? 'ring' : 'gear'} ${o.g.z}t`;
      let x = o.x, y = o.y, a;
      if (o.rack) { const s = wrapRack(o.v * t + o.s0, o.g.z, S.m); a = o.rot; x += -Math.sin(o.rot) * s; y += Math.cos(o.rot) * s; }
      else a = o.th0 + o.w * t;
      if (layout === 'flat') { const r = o.rack ? ST.hf * S.m + o.g.rim : o.geo.ra; x = fx + r; y = 0; fx += 2 * r + 5; if (o.rack) { a = 0; } }
      // fill: orange (accent) = a layer in front, on a shared shaft
      parts.push({ name, thickness: S.t1, z: layout === 'assembled' ? o.z * S.t1 : 0, fill: o.z > 0 ? 'accent' : o.g.type === 'ring' ? 'dark' : 'base', shapes: [G.placeShape(o.geo.shape, x, y, a)], _o: o, _a: a, _x: x, _y: y });
    });
    return parts.sort((p, q) => p._o.z - q._o.z);
  }
  function trainModel(S, t) {
    const parts = trainParts(S, t), { out } = solveT(S);
    return {
      parts, guides(d) {
        const css = n => getComputedStyle(document.documentElement).getPropertyValue(n), ink = css('--ink'), red = css('--red');
        parts.forEach(p => {
          const o = p._o; if (o.rack) { if (d.labels()) d.text(o.g.id + '  ' + f(Math.abs(o.v) * S.motor / 60 * TAU, 1) + ' mm/s', p._x + Math.cos(o.rot) * (ST.hf * S.m + o.g.rim + 30 / d.scale()), p._y + Math.sin(o.rot) * (ST.hf * S.m + o.g.rim + 30 / d.scale()), { color: ink, weight: 700 }); return; }
          d.cross(p._x, p._y, 8);
          const r = o.g.type === 'ring' ? o.geo.ra - o.g.rim / 2 : Math.max(o.geo.rf * 0.7, (o.g.bore || 0) / 2 + 3);
          d.dot(p._x + r * Math.cos(p._a + Math.PI / o.g.z), p._y + r * Math.sin(p._a + Math.PI / o.g.z), 4, o.g.how === 'shaft' ? red : undefined);
          if (d.guides()) d.circle(p._x, p._y, o.geo.rp, { dash: [6, 4] });
          if (d.labels() && o.g.how !== 'shaft') {
            const rpm = o.w * S.motor, lab = `${o.g.id} · ${f(Math.abs(rpm), 1)} rpm ${Math.abs(rpm) < 1e-9 ? '' : rpm > 0 ? '↺' : '↻'}`;
            d.text(lab, p._x, p._y - (o.g.type === 'ring' ? o.geo.ra : o.geo.ra) - 16 / d.scale(), { color: ink, weight: 700 });
          }
          if (d.labels() && o.g.how === 'shaft') d.text(`${o.g.id} on ${o.g.parent}'s shaft`, p._x, p._y + o.geo.ra + 14 / d.scale(), { color: red, size: 11 });
        });
      }
    };
  }
  function trainInfo(S) {
    const { out, errs } = solveT(S), vals = Object.values(out), rows = [];
    const last = vals.filter(o => !o.rack).slice(-1)[0], lastRack = vals.find(o => o.rack);
    if (last && last !== vals[0]) rows.push(['Overall ratio (' + vals[0].g.id + ' → ' + last.g.id + ')', '1 : ' + f(1 / Math.abs(last.w), 3)]);
    vals.forEach(o => {
      if (o.rack) { rows.push([o.g.id + ' rack speed', f(Math.abs(o.v) * S.motor / 60 * TAU, 1) + ' mm/s']); return; }
      const rpm = o.w * S.motor, dirn = Math.abs(rpm) < 1e-9 ? '' : rpm > 0 ? ' ↺' : ' ↻';
      rows.push([`${o.g.id} (${o.g.z}t${o.g.type === 'ring' ? ' ring' : ''})`, `${f(Math.abs(rpm), 2)} rpm${dirn} · ${f(S.torque / Math.abs(o.w), 2)} N·m`]);
    });
    if (lastRack) rows.push(['Push on ' + lastRack.g.id, f(S.torque / Math.abs(lastRack.v) * 1000, 1) + ' N']);
    rows.push(['Gears', String(vals.length)]);
    const small = vals.filter(o => o.g.type === 'spur' && o.g.z < 17); if (small.length) rows.push(['Under 17 teeth (some undercut)', small.map(o => o.g.id).join(', '), 'soft']);
    errs.forEach(([who, what]) => rows.push([who, what, 2]));
    return rows;
  }
  function trainEditor(el, api) {
    const S = api.S; let shown = null;
    const T = () => JSON.parse(S.train), save = t => { S.train = JSON.stringify(t); shown = S.train; api.changed(); };
    const nextId = t => { const used = new Set(t.map(g => g.id)); for (let n = 1; ; n++) if (!used.has('G' + n)) return 'G' + n; };
    const num = (i, k, v, label, unit, step) => `<label class="mf"><span>${label}</span><span class="gin"><input type="number" data-i="${i}" data-f="${k}" value="${v}" step="${step || 1}"><span>${unit || ''}</span></span></label>`;
    const NAMES = { spur: 'Spur gear', ring: 'Ring gear', rack: 'Rack' };
    function render() {
      const t = T(); shown = S.train; const sol = solveT(S).out;
      el.innerHTML = `
        <div class="mpre"><span>Start from</span>${Object.entries(TP).map(([k, p]) => `<button data-pre="${k}">${p.name}</button>`).join('')}</div>
        <ol class="mlist">${t.map((g, i) => {
          const parents = t.slice(0, i).filter(p => p.type !== 'rack').map(p => p.id), o = sol[g.id], rpm = o && !o.rack ? o.w * S.motor : null;
          let body = num(i, 'z', g.z, g.type === 'rack' ? 'Rack teeth' : 'Teeth');
          body += g.type === 'spur' ? num(i, 'bore', g.bore ?? 6, 'Bore', 'mm', 0.5) : num(i, 'rim', g.rim ?? 8, g.type === 'ring' ? 'Rim' : 'Body', 'mm', 0.5);
          if (i > 0) {
            body += `<label class="mf"><span>Joined to</span><select data-i="${i}" data-f="parent">${parents.map(p => `<option${p === g.parent ? ' selected' : ''}>${p}</option>`).join('')}</select></label>`;
            body += g.type === 'spur' ? `<label class="mf"><span>How</span><span class="gseg"><button data-i="${i}" data-how="mesh" class="${g.how !== 'shaft' ? 'on' : ''}">Mesh</button><button data-i="${i}" data-how="shaft" class="${g.how === 'shaft' ? 'on' : ''}">Same shaft</button></span></label>` : '<span></span>';
            if (g.how !== 'shaft') body += num(i, 'dir', g.dir || 0, 'Direction', '°', 15);
          }
          const spd = rpm == null ? (o && o.rack ? `${f(Math.abs(o.v) * S.motor / 60 * TAU, 0)} mm/s` : '') : `${f(Math.abs(rpm), 1)} rpm ${rpm > 0 ? '↺' : '↻'}`;
          return `<li class="mitem m-${g.type === 'spur' ? (g.how === 'shaft' ? 'point' : 'joint') : g.type === 'ring' ? 'ground' : 'crank'}"><div class="mhead"><b>${g.id}</b><span>${i === 0 ? 'Driver · ' : ''}${NAMES[g.type]}</span><em class="mspd">${spd}</em>${i ? `<button data-del="${i}" title="Remove ${g.id} and the gears joined to it">×</button>` : ''}</div><div class="mbody">${body}</div></li>`;
        }).join('')}</ol>
        <div class="madd"><span>Add</span><button data-add="spur">Spur gear</button><button data-add="shaft">Gear on same shaft</button><button data-add="ring">Ring gear</button><button data-add="rack">Rack</button></div>
        <p class="ghelp">Point at a gear's card to find it on the drawing. Each new gear joins the last gear in the list. Change <b>Joined to</b> and <b>Direction</b> (the angle from that gear's centre) to place it. Gears on the same shaft turn together, which is how big reductions are made. They sit one layer in front, shown in orange. Every gear shares the module and pressure angle below so they all mesh.</p>`;
      el.querySelectorAll('.mitem').forEach((li, n) => { const id = t[n].id; api.hl(li, p => p._o && p._o.g.id === id); });
    }
    el.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return; const t = T();
      if (b.dataset.pre) { save(TP[b.dataset.pre].T); render(); api.fit(); api.toast(TP[b.dataset.pre].name + ' loaded'); return; }
      if (b.dataset.how) { t[+b.dataset.i].how = b.dataset.how; if (b.dataset.how === 'mesh' && t[+b.dataset.i].dir == null) t[+b.dataset.i].dir = 0; save(t); render(); api.fit(); return; }
      if (b.dataset.del != null) {
        const gone = new Set([t[+b.dataset.del].id]); let keep = t.filter((x, i) => i !== +b.dataset.del), again = true;
        while (again) { again = false; keep = keep.filter(x => { if (gone.has(x.parent)) { gone.add(x.id); again = true; return false; } return true; }); }
        save(keep); render(); if (gone.size > 1) api.toast('Removed ' + [...gone].join(', ')); return;
      }
      if (b.dataset.add) {
        const k = b.dataset.add, id = nextId(t), gearsOnly = t.filter(g => g.type !== 'rack'), last = gearsOnly[gearsOnly.length - 1], o = solveT(S).out;
        // point new gears away from the middle of the train so they don't land on top of other gears
        const cx = Object.values(o).reduce((s, q) => s + q.x, 0) / t.length, cy = Object.values(o).reduce((s, q) => s + q.y, 0) / t.length, lo = o[last.id];
        let dir = Math.round(Math.atan2(lo.y - cy, lo.x - cx) / deg / 15) * 15; if (t.length === 1) dir = 0;
        if (k === 'spur') t.push({ id, type: 'spur', z: last.type === 'ring' ? Math.max(8, last.z - 30) : 20, parent: last.id, how: 'mesh', dir, bore: 6 });
        if (k === 'shaft') { const sp = [...gearsOnly].reverse().find(g => g.type === 'spur'); if (!sp) return api.toast('Add a spur gear first'); t.push({ id, type: 'spur', z: Math.max(8, Math.round(sp.z / 2.5)), parent: sp.id, how: 'shaft', bore: sp.bore ?? 6 }); }
        if (k === 'ring') { const sp = [...gearsOnly].reverse().find(g => g.type === 'spur'); if (!sp) return; t.push({ id, type: 'ring', z: sp.z + 24 + (sp.z % 2), parent: sp.id, how: 'mesh', dir, rim: 8 }); }
        if (k === 'rack') { const sp = [...gearsOnly].reverse().find(g => g.type === 'spur'); if (!sp) return; t.push({ id, type: 'rack', z: 20, parent: sp.id, how: 'mesh', dir, rim: 10 }); }
        save(t); render(); api.fit(); api.toast('Added ' + id);
      }
    });
    const edit = e => {
      const x = e.target; if (x.dataset.i == null || !x.dataset.f) return; const t = T(), g = t[+x.dataset.i], k = x.dataset.f;
      if (x.tagName === 'SELECT') g[k] = x.value; else { if (x.value === '' || !isFinite(+x.value)) return; g[k] = +x.value; if (k === 'z') g.z = Math.max(g.type === 'rack' ? 3 : 5, Math.round(g.z)); if (k === 'bore' || k === 'rim') g[k] = Math.max(0, g[k]); }
      save(t);
      el.querySelectorAll('.mitem').forEach((li, i) => { const o = solveT(S).out[t[i].id], sp = li.querySelector('.mspd'); if (!o || !sp) return; sp.textContent = o.rack ? `${f(Math.abs(o.v) * S.motor / 60 * TAU, 0)} mm/s` : `${f(Math.abs(o.w * S.motor), 1)} rpm ${o.w * S.motor > 0 ? '↺' : '↻'}`; });
    };
    el.addEventListener('input', edit); el.addEventListener('change', edit);
    api.listen(() => { if (S.train !== shown) render(); else el.querySelectorAll('.mitem').forEach((li, i) => { const t = T(), o = solveT(S).out[t[i] && t[i].id], sp = li.querySelector('.mspd'); if (!o || !sp) return; sp.textContent = o.rack ? `${f(Math.abs(o.v) * S.motor / 60 * TAU, 0)} mm/s` : `${f(Math.abs(o.w * S.motor), 1)} rpm ${o.w * S.motor > 0 ? '↺' : '↻'}`; }); });
    render();
  }


  const IC = {
    standard: '<path d="M2 27H8C11 27 11 9 15 9H19C23 9 23 27 26 27H32C35 27 35 9 39 9H43C46 9 46 27 47 27"/>',
    stub: '<path d="M2 27H7L10 17H16L19 27H27L30 17H36L39 27H47"/>',
    tall: '<path d="M2 27H8L14 3L20 27H28L34 3L40 27H47"/>',
    soft: '<path d="M2 27C9 27 9 8 15 8S21 27 28 27S34 8 40 8S47 27 47 27"/>',
    straight: '<path d="M2 27H8L13 9H19L24 27H30L35 9H41L46 27"/>',
    spur: '<rect x="8" y="5" width="32" height="22" rx="2"/><path d="M14 5V27M20 5V27M26 5V27M32 5V27"/>',
    helical: '<rect x="8" y="5" width="32" height="22" rx="2"/><path d="M12 27L18 5M18 27L24 5M24 27L30 5M30 27L36 5"/>',
    herring: '<rect x="8" y="5" width="32" height="22" rx="2"/><path d="M11 5L16 16L11 27M18 5L23 16L18 27M25 5L30 16L25 27M32 5L37 16L32 27"/>'
  };

  const names = S => ['Gear 1 (' + S.z1 + 't)', S.type === 'rack' ? 'Rack' : S.type === 'int' ? 'Ring gear (' + S.z2 + 't)' : 'Gear 2 (' + S.z2 + 't)'];

  const DEF = {
    id: 'gears', title: 'Gear generator', subtitle: 'Involute spur gears, ring gears and racks, as a pair or a whole train. Change any number and see every gear respond.',
    defaults: { mode: 'pair', train: JSON.stringify(TP.compound.T), z1: 12, z2: 30, type: 'ext', rackN: 16, m: 4, pa: 20, x1: 0, x2: 0, bl: 0.1, bore1: 6, bore2: 8, rim: 10, t1: 6, t2: 6, fine: 1, tooth: 'standard', rnd: 0, ftype: 'spur', helix: 20, motor: 60, torque: 1, grid: 1, guides: 1, labels: 1, rpm: 6 },
    panel(ui) {
      ui.section('Setup', () => {
        ui.seg('mode', 'Build', [['pair', 'Gear pair'], ['train', 'Gear train']], { refit: 1 });
        ui.note('', { live: S => S.mode === 'train' ? 'Add as many gears as you like in the <b>Gears</b> section below.' : 'Two gears with full control of tooth shape. Switch to Gear train to connect more.' });
      });
      ui.section('Gears', () => {
        ui.custom(trainEditor);
        ui.num('t1', 'Thickness', { unit: 'mm', min: 0.5, max: 200, step: 0.5, help: 'Face width of every gear, used for the STL' });
      }, { show: S => S.mode === 'train' });
      ui.section('Gear 1 · driver', () => {
        ui.num('z1', 'Teeth', { min: 5, max: 200, int: 1 });
        ui.num('bore1', 'Bore', { unit: 'mm', min: 0, max: 500, step: 0.5 });
        ui.num('t1', 'Thickness', { unit: 'mm', min: 0.5, max: 200, step: 0.5, help: 'Face width, used for the STL' });
      }, { show: S => S.mode === 'pair', hl: (p, i) => i === 0 });
      ui.section('Gear 2 · driven', () => {
        ui.seg('type', 'Type', [['ext', 'Spur'], ['int', 'Ring'], ['rack', 'Rack']]);
        ui.num('z2', 'Teeth', { min: 5, max: 400, int: 1, show: S => S.type !== 'rack' });
        ui.num('rackN', 'Rack teeth', { min: 3, max: 200, int: 1, show: S => S.type === 'rack' });
        ui.num('bore2', 'Bore', { unit: 'mm', min: 0, max: 500, step: 0.5, show: S => S.type === 'ext' });
        ui.num('rim', 'Rim / body', { unit: 'mm', min: 1, max: 200, step: 0.5, show: S => S.type !== 'ext' });
        ui.num('t2', 'Thickness', { unit: 'mm', min: 0.5, max: 200, step: 0.5 });
      }, { show: S => S.mode === 'pair', hl: (p, i) => i === 1 });
      ui.section('Gear type', () => {
        ui.pick('ftype', 'Teeth along the face', [['spur', 'Spur', IC.spur], ['helical', 'Helical', IC.helical], ['herring', 'Herringbone', IC.herring]], { tips: { spur: 'Straight teeth. Simple to laser cut.', helical: 'Slanted teeth: smoother and quieter, with some end thrust. Best for 3D printing.', herring: 'Two opposite slants meeting in a V: smooth with no end thrust.' } });
        ui.num('helix', 'Helix angle', { unit: '°', min: 5, max: 45, step: 1, show: S => S.ftype !== 'spur', help: 'Lean of the teeth. 15–25° is typical. The flat view and DXF show the end profile; the STL carries the twist.' });
        ui.note('Bevel, worm and other crossed-axis gears need different geometry and are on the list.');
      });
      ui.section('Tooth form', () => {
        ui.pick('tooth', 'Tooth style', [['standard', 'Standard', IC.standard], ['stub', 'Stub', IC.stub], ['tall', 'Pointed', IC.tall], ['soft', 'Soft', IC.soft], ['straight', 'Straight', IC.straight]], { tips: { standard: 'Involute full-depth teeth', stub: 'Shorter and stronger. Good for small gears.', tall: 'Tall pointed teeth with deep roots. Meshes with itself.', soft: 'Rounded tips and roots. Easy on laser-cut and printed parts.', straight: 'Straight flanks instead of curved ones. Simplest outline.' } });
        ui.num('rnd', 'Edge rounding', { unit: '× module', min: 0, max: 0.6, step: 0.05, help: 'Rounds tooth tips and roots. 0.3 matches the Soft style.' });
        ui.num('m', 'Module', { unit: 'mm', min: 0.2, max: 50, step: 0.25, help: 'Tooth size: pitch diameter ÷ teeth' });
        ui.seg('pa', 'Pressure angle', [[14.5, '14.5°'], [20, '20°'], [25, '25°']]);
        ui.num('x1', 'Shift gear 1', { min: -0.6, max: 1, step: 0.05, show: S => S.mode === 'pair', hl: (p, i) => i === 0, help: 'Profile shift coefficient. Positive values stop undercut on small gears.' });
        ui.num('x2', 'Shift gear 2', { min: -0.6, max: 1, step: 0.05, show: S => S.mode === 'pair' && S.type === 'ext', hl: (p, i) => i === 1 });
        ui.num('bl', 'Backlash', { unit: 'mm', min: 0, max: 2, step: 0.05, help: 'Total play between teeth. Each tooth is thinned by half.' });
        ui.seg('fine', 'Curve detail', [[0, 'Draft'], [1, 'Fine']]);
      });
      ui.section('Drive', () => {
        ui.num('motor', 'Input speed', { unit: 'rpm', min: 0, max: 100000, step: 1 });
        ui.num('torque', 'Input torque', { unit: 'N·m', min: 0, max: 100000, step: 0.1 });
      });
    },
    model(S, t) {
      if (S.mode === 'train') return trainModel(S, t);
      const { v, p1, p2 } = pose(S, t), [n1, n2] = names(S);
      const parts = [
        { name: n1, thickness: S.t1, shapes: [G.placeShape(v.s1, p1[0], p1[1], p1[2])] },
        { name: n2, thickness: S.t2, shapes: [G.placeShape(v.s2, p2[0], p2[1], p2[2])] }
      ];
      return {
        parts, guides(d) {
          const ink = getComputedStyle(document.documentElement).getPropertyValue('--ink');
          d.cross(0, 0); if (S.type !== 'rack') d.cross(p2[0], p2[1]);
          const mark = (x, y, a, r) => d.dot(x + r * Math.cos(a), y + r * Math.sin(a), 4);
          mark(0, 0, p1[2] + Math.PI / S.z1, Math.max(v.g1.rf * 0.75, S.bore1 / 2 + 3));
          if (S.type === 'ext') mark(p2[0], p2[1], p2[2] + Math.PI / S.z2, Math.max(v.g2.rf * 0.75, S.bore2 / 2 + 3));
          if (S.type === 'int') mark(p2[0], p2[1], p2[2] + Math.PI / S.z2, v.g2.ro + S.rim / 2);
          if (S.type === 'rack') d.dot(p2[0] + ST.hf * S.m + S.rim / 2, p2[1], 4);
          if (d.guides()) {
            d.circle(0, 0, v.g1.rp, { dash: [6, 4] }); d.circle(0, 0, v.g1.rb, { dash: [1, 4], w: 0.8 });
            if (S.type === 'ext' || S.type === 'int') { d.circle(p2[0], p2[1], v.g2.rp, { dash: [6, 4] }); d.circle(p2[0], p2[1], v.g2.rb, { dash: [1, 4], w: 0.8 }); }
            if (S.type === 'rack') d.line(v.a - S.x1 * S.m, p2[1] - v.rk.len / 2, v.a - S.x1 * S.m, p2[1] + v.rk.len / 2, { dash: [6, 4] });
            // line of action through the pitch point
            const P = S.type === 'ext' ? v.a * S.z1 / (S.z1 + S.z2) : v.g1.rp, L = 6 * S.m, aw = v.aw;   // pitch point (working pitch radius of gear 1)
            d.line(P - L * Math.sin(aw), -L * Math.cos(aw), P + L * Math.sin(aw), L * Math.cos(aw), { color: ink, w: 0.8, dash: [2, 3] });
          }
          if (d.labels()) {
            if (S.type !== 'rack') d.dim([0, 0], [p2[0], p2[1]], 'a = ' + f(v.a, 2), -(Math.max(v.g1.ra, S.type === 'ext' ? v.g2.ra : v.g2.ro + S.rim) * d.scale() + 34));
            d.text('N = ' + S.z1, 0, -(v.g1.ra + 18 / d.scale()), { color: ink, weight: 700 });
            if (S.type === 'ext') d.text('N = ' + S.z2, p2[0], -(v.g2.ra + 18 / d.scale()), { color: ink, weight: 700 });
            if (S.type === 'int') d.text('ring N = ' + S.z2, p2[0], -(v.g2.ro + S.rim + 18 / d.scale()), { color: ink, weight: 700 });
            if (S.type === 'rack') d.text('rack', p2[0] + ST.hf * S.m + S.rim + 24 / d.scale(), 0, { color: ink, weight: 700 });
          }
        }
      };
    },
    exportParts(S, layout) {
      if (S.mode === 'train') return trainParts(S, 0, layout);
      const { v, p1, p2 } = pose(S, 0), [n1, n2] = names(S);
      let q2 = [p2[0], p2[1], p2[2]];
      if (layout === 'flat') {  // move gear 2 clear of gear 1 with a 5 mm gap
        const r2 = S.type === 'ext' ? v.g2.ra : S.type === 'int' ? v.g2.ro + S.rim : 0;
        q2 = S.type === 'rack' ? [v.g1.ra + 5 + ST.hf * S.m, 0, 0] : [v.g1.ra + 5 + r2, 0, p2[2]];
      }
      return [
        { name: n1, thickness: S.t1, _c: [p1[0], p1[1]], shapes: [G.placeShape(v.s1, p1[0], p1[1], p1[2])] },
        { name: n2, thickness: S.t2, _c: [q2[0], q2[1]], shapes: [G.placeShape(v.s2, q2[0], q2[1], q2[2])] }
      ];
    },
    fileTag: S => S.mode === 'train' ? `m${S.m}-train-${parseT(S).map(g => g.z).join('-')}` : `m${S.m}-${S.z1}x${S.type === 'rack' ? 'rack' : S.type === 'int' ? 'ring' + S.z2 : S.z2}`,
    info(S) {
      if (S.mode === 'train') return trainInfo(S);
      const v = geo(S), m = S.m, a = v.alpha, rows = [];
      const ratio = S.type === 'rack' ? null : S.z2 / S.z1, zmin1 = 2 * (ST.ha - S.x1) / Math.sin(a) ** 2;
      if (S.type === 'rack') {
        const per = Math.PI * m * S.z1;
        rows.push(['Rack travel per turn', f(per, 2) + ' mm'], ['Rack speed', f(per * S.motor / 60000, 3) + ' m/s'], ['Rack force', f(S.torque / (v.g1.rp / 1000), 1) + ' N']);
      } else {
        rows.push(['Ratio', '1 : ' + f(ratio, 3)], ['Output speed', f(S.motor / ratio, 2) + ' rpm' + (S.type === 'ext' ? ' (reversed)' : '')], ['Output torque', f(S.torque * ratio, 2) + ' N·m']);
      }
      rows.push([S.type === 'rack' ? 'Gear centre to rack pitch line' : 'Centre distance', f(v.a, 3) + ' mm']);
      rows.push(['Gear 1 pitch / tip / root Ø', `${f(2 * v.g1.rp)} / ${f(2 * v.g1.ra)} / ${f(2 * v.g1.rf)}`]);
      if (S.type === 'ext') rows.push(['Gear 2 pitch / tip / root Ø', `${f(2 * v.g2.rp)} / ${f(2 * v.g2.ra)} / ${f(2 * v.g2.rf)}`]);
      if (S.type === 'int') rows.push(['Ring pitch / tip / root / outer Ø', `${f(2 * v.g2.rp)} / ${f(2 * v.g2.ri)} / ${f(2 * v.g2.ro)} / ${f(2 * (v.g2.ro + S.rim))}`]);
      if (S.type === 'ext' && Math.abs(v.aw - a) > 1e-6) rows.push(['Working pressure angle', f(v.aw / deg, 2) + '°']);
      rows.push(['Contact ratio', f(v.eps, 2), v.eps < 1.2]);
      if (S.z1 < zmin1) rows.push(['Undercut on gear 1', `below ${Math.ceil(zmin1)} teeth. Add shift ≥ ${f(ST.ha - S.z1 * Math.sin(a) ** 2 / 2, 2)}`, 2]);
      if (S.type === 'ext') { const zmin2 = 2 * (ST.ha - S.x2) / Math.sin(a) ** 2; if (S.z2 < zmin2) rows.push(['Undercut on gear 2', `below ${Math.ceil(zmin2)} teeth`, 2]); }
      if (v.g1.pointed || (v.g2 && v.g2.pointed)) rows.push(['Pointed teeth', 'Too much profile shift', 2]);
      if (S.type === 'int' && S.z2 - S.z1 < 12) rows.push(['Ring too small', 'Keep ring teeth at least 12 more than the pinion', 2]);
      if (S.bore1 >= 2 * v.g1.rf - 2 * m) rows.push(['Bore 1 too big', 'It cuts into the teeth', 2]);
      if (S.type === 'ext' && S.bore2 >= 2 * v.g2.rf - 2 * m) rows.push(['Bore 2 too big', 'It cuts into the teeth', 2]);
      return rows;
    }
  };

  /* ---------- helical and herringbone: the tooth shape in the flat view is the "transverse" section, found from the normal module and angle ---------- */
  const isHel = S => S.ftype === 'helical' || S.ftype === 'herring';
  const eff = S => {
    if (!isHel(S)) return S;
    const b = Math.min(45, Math.max(1, S.helix)) * deg, cb = Math.cos(b);
    return Object.assign({}, S, { m: S.m / cb, pa: Math.atan(Math.tan(S.pa * deg) / cb) / deg, _mn: S.m, _beta: b });
  };
  // which way each gear leans: a meshing pair leans opposite ways, a ring leans the same way as the pinion inside it, a shared shaft keeps the lean
  const handsOf = S => {
    const h = {}, T = parseT(S), byId = {}; T.forEach(g => byId[g.id] = g);
    T.forEach((g, i) => { if (!g.parent || !byId[g.parent]) { h[g.id] = 1; return; } const ph = h[g.parent] || 1; h[g.id] = g.how === 'shaft' ? ph : (g.type === 'ring' || byId[g.parent].type === 'ring') ? ph : -ph; });
    return h;
  };
  G.create(Object.assign({}, DEF, {
    model(S, t) { setStyle(S); const E = eff(S); const r = DEF.model(E, t); return r; },
    exportParts(S, layout) {
      setStyle(S); const E = eff(S), P = DEF.exportParts(E, layout);
      if (!isHel(S)) return P;
      if (S.mode === 'train') { const hd = handsOf(S); P.forEach(p => { if (p._o && p._o.g.type !== 'rack') { p.twist = { c: [p._x, p._y], rate: hd[p._o.g.id] * Math.tan(E._beta) / p._o.geo.rp, herring: S.ftype === 'herring' }; } }); return P; }
      const v = geo(E), hr = S.ftype === 'herring', tb = Math.tan(E._beta);
      P[0].twist = { c: P[0]._c, rate: tb / v.g1.rp, herring: hr };
      if (S.type === 'ext') P[1].twist = { c: P[1]._c, rate: -tb / v.g2.rp, herring: hr };
      if (S.type === 'int') P[1].twist = { c: P[1]._c, rate: tb / v.g2.rp, herring: hr };
      return P;
    },
    info(S) {
      setStyle(S); const E = eff(S), rows = DEF.info(E);
      if (isHel(S)) {
        const mt = E.m, face = S.mode === 'train' ? S.t1 : S.t1;
        rows.splice(0, 0, ['Normal module / transverse', `${f(S.m, 3)} / ${f(mt, 3)} mm`], ['Helix angle', f(S.helix, 1) + '°' + (S.ftype === 'herring' ? ' (V, both ways)' : '')],
          ['Face overlap', f(face * Math.tan(E._beta) / (Math.PI * S.m), 2), face * Math.tan(E._beta) / (Math.PI * S.m) < 1]);
        if (S.ftype === 'helical') rows.push(['End thrust', 'Pushes along the shaft: ' + f(Math.tan(E._beta) * 100, 0) + '% of the tooth force', 1]);
        if (S.mode === 'train' ? parseT(S).some(g => g.type === 'rack') : S.type === 'rack') rows.push(['Rack stays straight', 'Racks are drawn straight-toothed. Use Spur for rack drives.', 2]);
      }
      return rows;
    }
  }));
})();