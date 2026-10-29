/* 3D models for mechanism pages, built with three.js (MIT licence, https://threejs.org).
   Loaded only when someone opens the "3D model" tab, so pages stay light. Each model follows the same
   animation angle and design values as the 2D drawing on the page.
   Models: bevel-gears, worm-gear, differential, double-hookes-joint, swashplate, wobble-plate. */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.min.js';

const TAU = Math.PI * 2, D2R = Math.PI / 180;

/* ---------- materials that follow the site's theme ---------- */
function palette() {
  const paper = document.documentElement.dataset.theme === 'paper';
  return paper
    ? { base: 0xeceae3, alt: 0xc9d2de, accent: 0xd9480f, steel: 0x8b95a3, edge: 0x1b2638 }
    : { base: 0xdbe6f4, alt: 0x9fb6d3, accent: 0xffc94d, steel: 0x7f93ad, edge: 0x10294a };
}
function mats() {
  const c = palette(), M = (col, o) => new THREE.MeshStandardMaterial(Object.assign({ color: col, metalness: 0.25, roughness: 0.55 }, o || {}));
  return { base: M(c.base), alt: M(c.alt), accent: M(c.accent), steel: M(c.steel, { metalness: 0.5, roughness: 0.4 }), glass: M(c.alt, { transparent: true, opacity: 0.28, depthWrite: false }), edge: new THREE.LineBasicMaterial({ color: c.edge, transparent: true, opacity: 0.55 }) };
}
// a mesh with its outline edges drawn on top, like a technical drawing
function part(geo, mat, M, edges) {
  const g = new THREE.Group(), mesh = new THREE.Mesh(geo, mat); g.add(mesh);
  if (edges !== false) g.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, edges || 28), M.edge));
  return g;
}

/* ---------- shapes ---------- */
// a gear outline: n teeth, module m, a bore of radius hole; teeth are a close, simple stand-in for involutes
function gearShape(n, m, hole) {
  const rp = n * m / 2, ra = rp + m, rf = Math.max(rp - 1.25 * m, m), p = TAU / n, s = new THREE.Shape(), pt = (r, a) => [r * Math.cos(a), r * Math.sin(a)];
  for (let i = 0; i < n; i++) {
    const c = i * p, P = [pt(rf, c - 0.5 * p), pt(rf, c - 0.3 * p), pt(rp, c - 0.24 * p), pt(ra, c - 0.12 * p), pt(ra, c + 0.12 * p), pt(rp, c + 0.24 * p), pt(rf, c + 0.3 * p)];
    P.forEach((q, k) => (i === 0 && k === 0 ? s.moveTo(q[0], q[1]) : s.lineTo(q[0], q[1])));
  }
  s.closePath();
  if (hole) { const h = new THREE.Path(); h.absarc(0, 0, hole, 0, TAU, true); s.holes.push(h); }
  return s;
}
// spur gear lying in the XY plane, from z = 0 to z = w
function spur(n, m, w, hole) { return new THREE.ExtrudeGeometry(gearShape(n, m, hole), { depth: w, bevelEnabled: false, curveSegments: 16 }); }
// bevel gear: the same outline, tapering towards the cone apex, which is a distance `apex` along +z from the back face
function bevel(n, m, w, apex, hole) {
  const g = spur(n, m, w, hole), P = g.attributes.position;
  for (let i = 0; i < P.count; i++) { const z = P.getZ(i), k = 1 - z / apex; P.setX(i, P.getX(i) * k); P.setY(i, P.getY(i) * k); }
  P.needsUpdate = true; g.computeVertexNormals(); return g;
}
const cyl = (r, h, seg) => new THREE.CylinderGeometry(r, r, h, seg || 32);
// point object +Y along v (unit) from position p
const along = (obj, p, v) => { obj.position.copy(p); obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.clone().normalize()); return obj; };

/* ---------- models ---------- */
const MODELS = {
  'bevel-gears': {
    keys: ['z1', 'z2'], cam: { az: 35, el: 22, dist: 2.1 },
    build(P, M) {
      const m = 4, z1 = P.z1 | 0, z2 = P.z2 | 0, r1 = z1 * m / 2, r2 = z2 * m / 2, Rc = Math.hypot(r1, r2), b = Rc * 0.32;
      const root = new THREE.Group();
      // pinion: axis along X, pitch circle at x = r2; gear: axis along Y, pitch circle at y = r1 (apex at the origin)
      const pin = new THREE.Group(), pg = part(bevel(z1, m, b * r2 / Rc, r2, Math.max(3, r1 * 0.3)), M.accent, M); pg.position.z = 0; pin.add(pg);
      const shaft1 = part(cyl(Math.max(3, r1 * 0.3) - 0.3, r2 * 1.1), M.steel, M, false); shaft1.rotation.x = Math.PI / 2; shaft1.position.z = -r2 * 0.45; pin.add(shaft1);
      const pinHolder = new THREE.Group(); pinHolder.add(pin); pinHolder.rotation.y = -Math.PI / 2; pinHolder.position.x = r2; root.add(pinHolder);
      const gear = new THREE.Group(), gg = part(bevel(z2, m, b * r1 / Rc, r1, Math.max(3, r2 * 0.2)), M.base, M); gear.add(gg);
      const shaft2 = part(cyl(Math.max(3, r2 * 0.2) - 0.3, r1 * 1.1 + 40), M.steel, M, false); shaft2.rotation.x = Math.PI / 2; shaft2.position.z = -20 - r1 * 0.3; gear.add(shaft2);
      const gearHolder = new THREE.Group(); gearHolder.add(gear); gearHolder.rotation.x = Math.PI / 2; gearHolder.position.y = r1; root.add(gearHolder);
      root.position.set(-r2 * 0.35, -r1 * 0.35, 0);
      return { root, size: Rc * 2.2, update(a) { pin.rotation.z = a; gear.rotation.z = -a * z1 / z2 + Math.PI / z2; } };
    }
  },
  'worm-gear': {
    keys: ['n', 'starts'], cam: { az: 30, el: 18, dist: 1.45 },
    build(P, M) {
      const N = P.n | 0, s = P.starts | 0, m = 6, rp = N * m / 2, rw = 2.2 * m, lead = Math.PI * m * s, len = Math.PI * m * 8, root = new THREE.Group();
      // wheel: axis along Z
      const wheel = new THREE.Group(); const wg = part(spur(N, m, 2.4 * m, rp * 0.18), M.base, M); wg.position.z = -1.2 * m; wheel.add(wg);
      const hub = part(cyl(rp * 0.18 - 0.3, 6 * m), M.steel, M, false); hub.rotation.x = Math.PI / 2; wheel.add(hub); root.add(wheel);
      // worm: axis along X, above the wheel; one helical thread per start
      const worm = new THREE.Group(); worm.add(part(cyl(rw - 0.6 * m, len + 4 * m), M.accent, M, false).rotateZ(Math.PI / 2));
      for (let k = 0; k < s; k++) {
        const pts = []; for (let i = 0; i <= 400; i++) { const t = i / 400, x = -len / 2 + t * len, th = (x / lead) * TAU + k * TAU / s; pts.push(new THREE.Vector3(x, (rw - 0.35 * m) * Math.cos(th), (rw - 0.35 * m) * Math.sin(th))); }
        worm.add(part(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 600, 0.55 * m, 6, false), M.accent, M, false));
      }
      worm.add(part(cyl(rw * 0.35, len + 14 * m), M.steel, M, false).rotateZ(Math.PI / 2));
      worm.position.y = rp + rw - 0.4 * m; root.add(worm);
      root.position.y = -rw;
      return { root, size: Math.max(rp * 2.4, len), update(a) { worm.rotation.x = a; wheel.rotation.z = a * s / N + 0.5 * TAU / N; } };
    }
  },
  'differential': {
    keys: [], cam: { az: 28, el: 24, dist: 1.25 },
    build(P, M) {
      const m = 4, zs = 16, zp = 10, zr = 40, zd = 11, rs = zs * m / 2, rps = zp * m / 2, root = new THREE.Group();
      const MODES = [[1, 1], [1 - 0.75 / 12, 1 + 0.75 / 12], [1 - 0.75 / 4, 1 + 0.75 / 4], [0, 2]];
      // the case (carrier) turns about X and carries the ring gear and the cross pin with the two spider gears
      const carrier = new THREE.Group(); root.add(carrier);
      const mr = 4.5, rr = zr * mr / 2, ring = part(bevel(zr, mr, 6 * mr, 4 * rr, rr * 0.55), M.accent, M); ring.rotation.y = -Math.PI / 2; ring.position.x = rps + 4 * m; carrier.add(ring);
      const shell = part(new THREE.CylinderGeometry(rs + 3 * m, rs + 3 * m, 2 * (rps + 4 * m), 40, 1, true), M.glass, M, 12); shell.rotation.z = Math.PI / 2; carrier.add(shell);
      const pin = part(cyl(m * 0.9, 2 * (rs + 3 * m)), M.steel, M, false); carrier.add(pin);
      const spiders = [1, -1].map(sg => { const s = new THREE.Group(), g = part(bevel(zp, m, 2.4 * m, rs, m * 1.2), M.base, M); s.add(g); const h = new THREE.Group(); h.add(s); h.position.y = sg * rs; h.rotation.x = sg > 0 ? Math.PI / 2 : -Math.PI / 2; carrier.add(h); return s; });
      // side gears and axles, one each side, turning with their own wheel
      const sides = [1, -1].map(sg => { const s = new THREE.Group(), g = part(bevel(zs, m, 2.4 * m, rps, m * 2), M.alt, M); s.add(g);
        const ax = part(cyl(m * 1.6, 150), M.steel, M, false); ax.rotation.x = Math.PI / 2; ax.position.z = -75; s.add(ax);
        const wheel = part(new THREE.CylinderGeometry(55, 55, 34, 40), M.base, M, 30); wheel.rotation.x = Math.PI / 2; wheel.position.z = -150; s.add(wheel);
        const mark = part(new THREE.BoxGeometry(14, 40, 36), M.accent, M, false); mark.position.set(0, 38, -150); s.add(mark);
        const h = new THREE.Group(); h.add(s); h.position.x = sg * rps; h.rotation.y = sg > 0 ? -Math.PI / 2 : Math.PI / 2; root.add(h); return s; });
      // drive pinion from the engine, axis along Z, meeting the ring gear
      const md = 4.5, rd = zd * md / 2, drive = new THREE.Group(), dg = part(bevel(zd, md, 6 * md, rr, rd * 0.4), M.alt, M); drive.add(dg);
      const ds = part(cyl(rd * 0.4 - 0.3, 160), M.steel, M, false); ds.rotation.x = Math.PI / 2; ds.position.z = -80; drive.add(ds);
      // the pinion sits at the ring's rim, its teeth facing the axle
      const dh = new THREE.Group(); dh.add(drive); dh.rotation.y = Math.PI; dh.position.set(ring.position.x - 3 * mr, 0, rr + 4 * md); root.add(dh);
      return { root, size: 420, update(a, p) {
        const md2 = MODES[p.mode | 0], wl = md2[0] * a, wr = md2[1] * a;
        carrier.rotation.x = a; sides[0].rotation.z = wr; sides[1].rotation.z = -wl;
        const spin = (md2[1] - md2[0]) / 2 * a * (zs / zp); spiders[0].rotation.z = spin; spiders[1].rotation.z = -spin;
        drive.rotation.z = -a * zr / zd;
      } };
    }
  },
  'double-hookes-joint': {
    keys: ['beta', 'phase'], cam: { az: 25, el: 25, dist: 1.05 },
    build(P, M) {
      const b = P.beta * D2R, L = 170, root = new THREE.Group(), X = new THREE.Vector3(1, 0, 0);
      const d1 = X.clone(), d2 = new THREE.Vector3(Math.cos(b), Math.sin(b), 0), d3 = X.clone();
      const J1 = new THREE.Vector3(-L / 2 * Math.cos(b), -L / 2 * Math.sin(b), 0), J2 = J1.clone().add(d2.clone().multiplyScalar(L));
      // a shaft with a fork (yoke) at one or both ends; local X = shaft axis, local Y = the yoke's pin axis
      const shaftGroup = (len, forkA, forkB, mat) => {
        const g = new THREE.Group(); g.add(part(cyl(9, len - 40), mat, M, false).rotateZ(Math.PI / 2));
        const fork = sx => { const f = new THREE.Group(); f.add(part(new THREE.BoxGeometry(14, 52, 16), mat, M)); [-1, 1].forEach(k => { const ear = part(new THREE.BoxGeometry(30, 8, 16), mat, M); ear.position.set(sx * 15, k * 26, 0); f.add(ear); }); f.position.x = sx > 0 ? len / 2 - 22 : -len / 2 + 22; return f; };
        if (forkA) g.add(fork(-1)); if (forkB) g.add(fork(1)); return g;
      };
      const input = shaftGroup(220, false, true, M.base), middle = shaftGroup(L + 44, true, true, M.alt), output = shaftGroup(220, true, false, M.base);
      const crosses = [0, 1].map(() => { const c = new THREE.Group(); c.add(part(cyl(4.5, 58), M.accent, M, false)); const o = part(cyl(4.5, 58), M.accent, M, false); o.rotation.x = Math.PI / 2; c.add(o); c.add(part(new THREE.BoxGeometry(12, 12, 12), M.accent, M)); root.add(c); return c; });
      [input, middle, output].forEach(g => root.add(g));
      // orient a shaft: local X → d, local Y → pin direction u (u ⟂ d)
      const orient = (g, pos, d, u) => { const z = new THREE.Vector3().crossVectors(d, u).normalize(); g.position.copy(pos); g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(d, u.clone().normalize(), z)); };
      const crossAt = (c, pos, u, v) => { const w = new THREE.Vector3().crossVectors(u, v).normalize(); c.position.copy(pos); c.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(w, u.clone().normalize(), v.clone().normalize())); };
      return { root, size: 520, update(a, p) {
        // input yoke pins at angle a about X
        const u1 = new THREE.Vector3(0, Math.cos(a), Math.sin(a));
        // the middle shaft's pin at the first joint is square to both u1 and the middle shaft
        const u2 = new THREE.Vector3().crossVectors(d2, u1).normalize();
        // at the second joint the middle yoke is in line (same pin direction) or turned 90°
        const u3 = p.phase ? u2.clone() : new THREE.Vector3().crossVectors(d2, u2).normalize();
        const u4 = new THREE.Vector3().crossVectors(d3, u3).normalize();
        orient(input, J1.clone().add(d1.clone().multiplyScalar(-110)), d1, u1);
        // the middle shaft's yokes hold pins u2 (first joint) and u3 (second); its own Y axis follows the first
        orient(middle, J1.clone().add(J2).multiplyScalar(0.5), d2, u2);
        orient(output, J2.clone().add(d3.clone().multiplyScalar(110)), d3, u4);
        crossAt(crosses[0], J1, u1, u2); crossAt(crosses[1], J2, u3, u4);
        // the far fork of the middle shaft: rotate it about the shaft by 90° when the yokes are out of line
        middle.children[2].rotation.x = p.phase ? 0 : Math.PI / 2;
      } };
    }
  },
  'swashplate': {
    keys: ['n'], cam: { az: 40, el: 22, dist: 1.3 },
    build(P, M) { return pistonPump(P, M, false); }
  },
  'wobble-plate': {
    keys: ['mode'], cam: { az: 40, el: 22, dist: 1.3 },
    build(P, M) { return pistonPump(P, M, !P.mode); }
  }
};
// a ring of pistons driven by a tilted plate. wobble = the plate is held from turning and drives the pistons through rods
function pistonPump(P, M, wobble) {
  const n = wobble ? 5 : (P.n | 0), R = 60, RP = 82, X0 = 0, root = new THREE.Group();
  const shaft = new THREE.Group(); shaft.add(part(cyl(9, 300), M.steel, M, false).rotateZ(Math.PI / 2)); shaft.position.x = -40; root.add(shaft);
  // the tilted hub, fixed to the shaft
  const hub = part(cyl(26, 22, 32), M.steel, M); shaft.add(hub);
  // the plate: a thick disc
  const plate = new THREE.Group(), disc = part(cyl(RP, 10, 64), wobble ? M.alt : M.accent, M, 20); disc.rotation.z = Math.PI / 2; plate.add(disc);
  const mark = part(new THREE.SphereGeometry(7, 16, 12), M.accent, M, false); mark.position.set(-7, RP - 12, 0); plate.add(mark); root.add(plate);
  // cylinder block (fixed), pistons and, on a wobble plate, the connecting rods
  const block = part(new THREE.CylinderGeometry(R + 26, R + 26, 100, 48, 1, true), M.glass, M, 12); block.rotation.z = Math.PI / 2; block.position.x = wobble ? 85 : 55; root.add(block);
  const pist = [], rods = [];
  for (let i = 0; i < n; i++) {
    const ph = i * TAU / n, pg = part(cyl(13, 60), M.base, M); pg.rotation.z = Math.PI / 2; const holder = new THREE.Group(); holder.add(pg); holder.position.set(0, R * Math.cos(ph), R * Math.sin(ph)); root.add(holder); pist.push({ holder, ph });
    if (wobble) { const rod = part(cyl(3.5, 1), M.steel, M, false); root.add(rod); rods.push(rod); }
  }
  return { root, size: 380, update(a, p) {
    const al = p.al * D2R, th = a, nrm = new THREE.Vector3(Math.cos(al), Math.sin(al) * Math.cos(th), Math.sin(al) * Math.sin(th));
    shaft.rotation.x = th; hub.rotation.set(0, 0, al - Math.PI / 2); hub.position.x = 40;
    plate.position.set(X0, 0, 0);
    if (wobble) plate.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), nrm);   // tilts but does not turn
    else { plate.quaternion.setFromEuler(new THREE.Euler(th, 0, al, 'XYZ')); }      // turns with the shaft
    pist.forEach(({ holder, ph }, i) => {
      const xc = X0 - R * Math.tan(al) * Math.cos(ph - th);   // where the plate face is, in line with this piston
      holder.position.x = xc + (wobble ? 70 : 38);
      if (wobble) { const a0 = new THREE.Vector3(xc + 6, R * Math.cos(ph), R * Math.sin(ph)), b0 = new THREE.Vector3(holder.position.x - 30, a0.y, a0.z), mid = a0.clone().add(b0).multiplyScalar(0.5), len = a0.distanceTo(b0); const rod = rods[i]; rod.scale.set(1, len, 1); along(rod, mid, b0.clone().sub(a0)); }
    });
  } };
}

/* ---------- the viewer ---------- */
export function view(el, slug) {
  const def = MODELS[slug]; if (!def) throw new Error('No 3D model for ' + slug);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  el.appendChild(renderer.domElement); renderer.domElement.className = 'v3cv';
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(32, 1, 1, 10000);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1.7));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(300, 500, 400); scene.add(sun);
  const fill = new THREE.DirectionalLight(0xffffff, 0.6); fill.position.set(-400, -100, -200); scene.add(fill);
  let M = mats(), model = null, keyStr = '', cam = { az: def.cam.az, el: def.cam.el, k: 1, px: 0, py: 0 }, last = null, dirty = true;
  const rebuild = P => {
    if (model) { scene.remove(model.root); model.root.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
    model = def.build(P, M); scene.add(model.root); keyStr = def.keys.map(k => P[k]).join('|'); dirty = true;
  };
  const place = () => {
    const r = el.getBoundingClientRect(), w = Math.max(1, r.width), h = Math.max(1, r.height);
    renderer.setSize(w, h, false); camera.aspect = w / h;
    const d = model.size * def.cam.dist / cam.k, az = cam.az * D2R, elv = cam.el * D2R;
    camera.position.set(d * Math.cos(elv) * Math.sin(az), d * Math.sin(elv), d * Math.cos(elv) * Math.cos(az));
    camera.up.set(0, 1, 0); camera.lookAt(0, 0, 0);
    // pan in screen space
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0), up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
    const off = right.multiplyScalar(cam.px * d * 0.5).add(up.multiplyScalar(cam.py * d * 0.5)); camera.position.add(off); camera.lookAt(off);
    camera.updateProjectionMatrix();
  };
  // drag to orbit, right-drag or two fingers to pan, wheel or pinch to zoom, double-click to reset
  const pts = new Map(); let pinch = null; const cv = renderer.domElement;
  cv.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY, b: e.button }); if (pts.size === 2) { const [p1, p2] = [...pts.values()]; pinch = { d: Math.hypot(p1.x - p2.x, p1.y - p2.y), k: cam.k }; } });
  cv.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId)) return; const q = pts.get(e.pointerId), dx = e.clientX - q.x, dy = e.clientY - q.y, r = cv.getBoundingClientRect(); pts.set(e.pointerId, { x: e.clientX, y: e.clientY, b: q.b });
    if (pts.size === 2 && pinch) { const [p1, p2] = [...pts.values()]; cam.k = Math.max(0.3, Math.min(8, pinch.k * Math.hypot(p1.x - p2.x, p1.y - p2.y) / pinch.d)); cam.px -= dx / r.width / 2; cam.py += dy / r.height / 2; }
    else if (q.b === 2 || e.shiftKey) { cam.px -= dx / r.width * 2 / cam.k; cam.py += dy / r.height * 2 / cam.k; }
    else { cam.az -= dx * 0.4; cam.el = Math.max(-85, Math.min(85, cam.el + dy * 0.4)); }
    dirty = true;
  });
  ['pointerup', 'pointercancel'].forEach(t => cv.addEventListener(t, e => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; }));
  cv.addEventListener('wheel', e => { e.preventDefault(); cam.k = Math.max(0.3, Math.min(8, cam.k * Math.exp(-e.deltaY * 0.0015))); dirty = true; }, { passive: false });
  cv.addEventListener('dblclick', () => { cam = { az: def.cam.az, el: def.cam.el, k: 1, px: 0, py: 0 }; dirty = true; });
  new MutationObserver(() => { M = mats(); if (last) rebuild(last.P); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  new ResizeObserver(() => { dirty = true; }).observe(el);
  return {
    update(a, P) {
      const ks = def.keys.map(k => P[k]).join('|');
      if (!model || ks !== keyStr) rebuild(P);
      const sig = a + '|' + JSON.stringify(P);
      if (!dirty && last && last.sig === sig) return;
      last = { sig, P }; model.update(a, P); place(); renderer.render(scene, camera); dirty = false;
    }
  };
}
export const slugs = Object.keys(MODELS);
