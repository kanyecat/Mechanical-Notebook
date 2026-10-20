(function () {
  const { TAU, COL } = MM, CX = 235, CY = 235, RP = 110, RO = 172, RB = 46;
  const ballR = p => 22 * p.bs;
  const cageRatio = p => 0.5 * (1 - ballR(p) / RP);           // cage speed ÷ shaft speed (outer ring still)
  // share of the load carried by the tracked ball at shaft angle t (radial: only balls in the lower half carry it)
  function load(t, p) {
    if (p.load === 0) return 0;
    if (p.load === 2) return 1 / p.n;
    const th = -Math.PI / 2 + cageRatio(p) * t, c = Math.cos(th + Math.PI / 2);   // 1 at the bottom of the bearing, where the load presses
    // Stribeck: the most loaded ball takes about 5 / n of the radial load
    return c > 0 ? (5 / p.n) * Math.pow(c, 1.5) : 0;
  }
  /* ---------- chart of bearing types ---------- */
  // ratings 0 to 3 compared with other bearings of a similar size: R radial load, A axial (thrust) load, S speed, M misalignment it tolerates
  const TYPES = [
    ['Ball', 'Deep groove ball', 'deep', 3, 2, 3, 1, 'The everyday bearing. Carries radial load and some thrust both ways, often sealed for life.', 'Electric motors, skateboard wheels, fans'],
    ['Ball', 'Sealed or shielded ball (2RS / ZZ)', 'deep', 3, 2, 2, 1, 'A deep groove bearing with rubber seals or metal shields that keep grease in and dirt out.', 'Power tools, bicycles, appliances'],
    ['Ball', 'Flanged ball', 'flangedball', 2, 1, 3, 1, 'A small ball bearing with a lip on the outer ring, so it can sit in a plain hole without a shoulder.', '3D printer idlers, RC models, small pulleys'],
    ['Ball', 'Miniature and instrument ball', 'deep', 1, 1, 3, 0, 'Tiny precision ball bearings, some with a bore under 1 mm.', 'Dental drills, fidget spinners, small motors'],
    ['Ball', 'Thin-section ball', 'thin', 2, 2, 2, 0, 'Very thin rings for a large bore, saving space and weight.', 'Robot joints, medical scanners, aerospace'],
    ['Ball', 'Angular contact ball', 'angular', 2, 3, 3, 0, 'Raised shoulders tilt the contact line, so it takes heavy thrust in one direction. Usually fitted in pairs.', 'Machine tool spindles, pumps'],
    ['Ball', 'Double-row angular contact', 'angular2', 3, 3, 2, 0, 'Two rows of angled balls in one bearing take thrust both ways and resist tilting.', 'Car wheel hubs, gearboxes'],
    ['Ball', 'Four-point contact ball', 'fourpoint', 1, 3, 2, 0, 'Split inner ring lets each ball touch at four points, carrying thrust both ways.', 'Gearbox thrust positions, propeller drives'],
    ['Ball', 'Self-aligning ball', 'selfalign', 2, 1, 3, 3, 'Two rows of balls run in a spherical outer ring, so the shaft can tilt a few degrees.', 'Long shafts that bend, textile and farm machines'],
    ['Ball', 'Ceramic hybrid ball', 'deep', 2, 2, 3, 0, 'Ceramic balls in steel rings: lighter, stiffer, and they do not pass electric current.', 'High-speed spindles, electric car motors'],
    ['Ball', 'Thrust ball', 'thrustball', 0, 2, 1, 0, 'Balls between two flat washers. Carries only axial load.', 'Lazy Susans, bar stools, vertical shafts'],
    ['Roller', 'Cylindrical roller', 'cyl', 3, 0, 3, 0, 'Rollers touch along a line instead of a point, so radial capacity is much higher than balls.', 'Gearboxes, large motors, rolling mills'],
    ['Roller', 'Double-row cylindrical roller', 'cyl2', 3, 0, 2, 0, 'Two rows of rollers for very high stiffness and accuracy.', 'Machine tool spindles'],
    ['Roller', 'Full-complement cylindrical', 'cyl', 3, 1, 1, 0, 'No cage: the rollers fill the whole ring for the most capacity at low speed.', 'Crane sheaves, slow heavy wheels'],
    ['Roller', 'Needle roller', 'needle', 3, 0, 2, 0, 'Long thin rollers make a very slim bearing that still carries a lot of radial load.', 'Car gearboxes, rocker arms, pumps'],
    ['Roller', 'Drawn cup needle', 'needle', 2, 0, 2, 0, 'A thin pressed-steel cup full of needles, pressed straight into a housing.', 'Power tools, pedals, steering columns'],
    ['Roller', 'Tapered roller', 'taper', 3, 3, 2, 0, 'Cone-shaped rollers take heavy radial and thrust load together. Used in opposed pairs.', 'Car and truck wheel hubs, differentials'],
    ['Roller', 'Double-row tapered roller', 'taper2', 3, 3, 1, 0, 'Two rows of tapered rollers in one unit, carrying thrust both ways.', 'Railway axles, rolling mills'],
    ['Roller', 'Spherical roller', 'sphroll', 3, 2, 2, 3, 'Barrel-shaped rollers in a spherical outer ring: very strong and tolerant of shaft bending.', 'Crushers, paper mills, wind turbines'],
    ['Roller', 'Toroidal roller', 'sphroll', 3, 0, 2, 3, 'Slightly curved rollers allow both tilting and sliding along the shaft as it heats and grows.', 'Paper machines, fans with long hot shafts'],
    ['Roller', 'Crossed roller', 'crossed', 3, 3, 1, 0, 'Rollers alternate at 90° to each other, so one thin bearing carries load in every direction.', 'Robot joints, rotary tables, radar mounts'],
    ['Roller', 'Cylindrical roller thrust', 'thrustroller', 0, 3, 1, 0, 'Rollers between flat washers for heavy thrust at low speed.', 'Plastic extruders, heavy screw jacks'],
    ['Roller', 'Needle roller thrust', 'thrustneedle', 0, 3, 2, 0, 'A thin cage of needles between washers, taking thrust in a tiny space.', 'Automatic transmissions, compressors'],
    ['Roller', 'Spherical roller thrust', 'sphthrust', 1, 3, 1, 3, 'Angled barrel rollers take huge thrust and some radial load, and allow misalignment.', 'Ship propeller shafts, vertical pumps'],
    ['Roller', 'Track roller and cam follower', 'camfollower', 3, 1, 2, 0, 'A thick outer ring that rolls directly on a track or cam. Cam followers have a threaded stud.', 'Conveyors, cam mechanisms, linear guides'],
    ['Plain', 'Plain bushing (sleeve)', 'bush', 3, 0, 1, 0, 'A simple sleeve, often bronze, that the shaft slides in on a film of grease or oil.', 'Hinges, pumps, lawn mowers'],
    ['Plain', 'Flanged bushing', 'flangebush', 2, 1, 1, 0, 'A sleeve with a lip that also takes a little thrust against the housing.', 'Appliances, furniture, vehicle pivots'],
    ['Plain', 'Sintered self-lubricating bushing', 'bush', 2, 0, 2, 0, 'Porous metal soaked with oil, which seeps out as it warms. No greasing needed.', 'Fans, small motors, kitchen appliances'],
    ['Plain', 'Polymer bushing', 'bush', 2, 0, 1, 1, 'Plastic sleeves that run dry, without grease, and resist dirt and water.', '3D printers, food machines, bicycles'],
    ['Plain', 'Thrust washer', 'thrustwasher', 0, 2, 1, 0, 'A flat ring of bronze or plastic that stops two parts rubbing face to face.', 'Between gears and housings, wheel axles'],
    ['Plain', 'Spherical plain bearing', 'spherical', 3, 1, 0, 3, 'A ball inside a socket ring: slow swinging and tilting under very heavy load.', 'Hydraulic cylinder ends, suspension links'],
    ['Plain', 'Rod end (heim joint)', 'rodend', 2, 1, 0, 3, 'A spherical bearing in an eye on a threaded shank, for joining links.', 'Steering linkages, race cars, RC models'],
    ['Plain', 'Hydrodynamic journal', 'fluid', 3, 0, 3, 0, 'Spinning drags oil into a wedge that lifts the shaft. Nothing touches at speed.', 'Engine crankshafts, steam and gas turbines'],
    ['Plain', 'Air bearing', 'fluid', 1, 1, 3, 0, 'Pressurised air holds the parts apart: almost no friction and extreme smoothness.', 'Precision measuring machines, dental turbines'],
    ['Mounted', 'Pillow block (plummer block)', 'pillow', 3, 1, 2, 2, 'A bearing insert in a housing with two bolt holes, mounted parallel to the shaft.', 'Conveyors, farm machinery, garden tools'],
    ['Mounted', 'Flange unit (2 or 4 bolt)', 'flange', 3, 1, 2, 2, 'A bearing in a flat housing that bolts to a wall, with the shaft passing through.', 'Fans, conveyors, go-karts'],
    ['Mounted', 'Take-up unit', 'takeup', 2, 1, 2, 2, 'A housed bearing that slides in a frame to tighten a belt or chain.', 'Conveyor tail pulleys'],
    ['Mounted', 'Hanger bearing', 'pillow', 2, 0, 1, 1, 'Supports a long shaft or screw from above, partway along its length.', 'Screw conveyors, augers'],
    ['Special', 'Linear ball bearing', 'linear', 2, 0, 3, 0, 'Recirculating balls let a block slide smoothly along a round rod.', '3D printers, CNC machines'],
    ['Special', 'Profile rail guide', 'rail', 3, 0, 3, 0, 'A carriage with rolling elements on a shaped rail, stiff in every direction.', 'CNC machines, robots, lab automation'],
    ['Special', 'Slewing ring', 'slew', 2, 3, 0, 1, 'A huge bearing that also carries tipping loads, often with gear teeth cut on one ring.', 'Excavators, cranes, wind turbine yaw'],
    ['Special', 'Ball transfer unit', 'ballxfer', 2, 0, 1, 3, 'One large ball on many small ones, so loads can roll over it in any direction.', 'Airport baggage tables, conveyor tables'],
    ['Special', 'Magnetic bearing', 'magnetic', 2, 1, 3, 0, 'Electromagnets hold the shaft in mid-air, controlled by sensors. No contact, no wear.', 'Turbo compressors, flywheel energy storage'],
    ['Special', 'Jewel bearing', 'jewel', 0, 0, 2, 0, 'A tiny synthetic ruby or sapphire supports a steel pivot with very low friction.', 'Mechanical watches, meters, compasses'],
    ['Special', 'Flexure bearing', 'flexure', 1, 0, 0, 0, 'Thin springy blades bend instead of anything rolling or sliding: no friction, no backlash, small motion only.', 'Precision instruments, MEMS devices']
  ];
  // small half-section icons. viewBox 0 0 72 56. classes: o = outline, f = filled part, r = rolling element, c = centre line
  const ring = (y, h) => `<rect class="f" x="14" y="${y}" width="44" height="${h}"/>`;
  const I = {
    deep: ring(6, 12) + ring(36, 12) + '<circle class="r" cx="36" cy="27" r="9"/>',
    flangedball: '<path class="f" d="M10 4h48v6H18v8h-4z"/>' + ring(36, 12) + '<circle class="r" cx="36" cy="26" r="8"/><rect class="f" x="14" y="10" width="44" height="8"/>',
    thin: ring(10, 6) + ring(38, 6) + '<circle class="r" cx="36" cy="27" r="10"/>',
    angular: '<path class="f" d="M14 6h44v12H42l-6 4-12-4H14z"/>' + ring(36, 12) + '<circle class="r" cx="36" cy="27" r="8.5"/><path class="c2" d="M28 40 44 14"/>',
    angular2: ring(6, 12) + ring(36, 12) + '<circle class="r" cx="26" cy="27" r="7"/><circle class="r" cx="46" cy="27" r="7"/><path class="c2" d="M20 38 32 16M52 38 40 16"/>',
    fourpoint: ring(6, 12) + ring(36, 12) + '<path class="c" d="M36 36v12"/><circle class="r" cx="36" cy="27" r="9"/><path class="c2" d="M29 20 43 34M43 20 29 34"/>',
    selfalign: '<path class="f" d="M14 6h44v14c-8-6-36-6-44 0z"/>' + ring(36, 12) + '<circle class="r" cx="27" cy="27" r="6.5"/><circle class="r" cx="45" cy="27" r="6.5"/>',
    thrustball: '<rect class="f" x="12" y="8" width="10" height="40"/><rect class="f" x="50" y="8" width="10" height="40"/><circle class="r" cx="36" cy="28" r="12"/>',
    cyl: ring(6, 12) + ring(38, 10) + '<rect class="r" x="24" y="18" width="24" height="20"/>',
    cyl2: ring(6, 12) + ring(38, 10) + '<rect class="r" x="16" y="18" width="18" height="20"/><rect class="r" x="38" y="18" width="18" height="20"/>',
    needle: ring(14, 8) + ring(38, 6) + '<rect class="r" x="16" y="22" width="40" height="16"/>',
    taper: '<path class="f" d="M14 6h44v8L14 22z"/><path class="f" d="M14 48h44V40L14 36z"/><path class="r" d="M18 23 54 15v23L18 35z"/>',
    taper2: '<path class="f" d="M12 6h48v10L36 12 12 16z"/>' + ring(38, 10) + '<path class="r" d="M14 18l20-4v22H14zM58 18l-20-4v22h20z"/>',
    sphroll: '<path class="f" d="M14 6h44v14c-8-7-36-7-44 0z"/>' + ring(38, 10) + '<ellipse class="r" cx="26" cy="28" rx="8" ry="9"/><ellipse class="r" cx="46" cy="28" rx="8" ry="9"/>',
    crossed: ring(6, 12) + ring(38, 10) + '<rect class="r" x="27" y="19" width="18" height="18" transform="rotate(45 36 28)"/>',
    thrustroller: '<rect class="f" x="12" y="8" width="10" height="40"/><rect class="f" x="50" y="8" width="10" height="40"/><rect class="r" x="24" y="14" width="24" height="28"/>',
    thrustneedle: '<rect class="f" x="18" y="6" width="6" height="44"/><rect class="f" x="48" y="6" width="6" height="44"/><rect class="r" x="26" y="8" width="20" height="40"/>',
    sphthrust: '<path class="f" d="M8 6h22v44H8z"/><path class="f" d="M64 22v28H46l18-28z"/><path class="r" d="M32 14 50 30 40 42 22 24z"/>',
    camfollower: '<circle class="f" cx="30" cy="28" r="20"/><circle class="r" cx="30" cy="28" r="10"/><rect class="f" x="46" y="24" width="22" height="8"/>',
    bush: '<rect class="o" x="10" y="4" width="52" height="14"/><rect class="f" x="10" y="18" width="52" height="12"/><rect class="r" x="10" y="31" width="52" height="15"/>',
    flangebush: '<path class="f" d="M10 6h10v12h42v12H10z"/><rect class="r" x="10" y="31" width="52" height="15"/>',
    thrustwasher: '<rect class="r" x="20" y="8" width="12" height="40"/><rect class="f" x="34" y="8" width="8" height="40"/><rect class="r" x="44" y="8" width="12" height="40"/>',
    spherical: '<rect class="f" x="10" y="8" width="52" height="40" rx="4"/><circle class="r" cx="36" cy="28" r="16"/><rect class="o" x="28" y="20" width="16" height="16"/>',
    rodend: '<circle class="f" cx="24" cy="28" r="18"/><circle class="r" cx="24" cy="28" r="11"/><circle class="o" cx="24" cy="28" r="4"/><rect class="f" x="40" y="23" width="28" height="10"/><path class="c" d="M44 23v10M48 23v10M52 23v10M56 23v10M60 23v10"/>',
    fluid: '<rect class="f" x="10" y="6" width="52" height="16"/><rect class="r" x="10" y="27" width="52" height="19"/><path class="c2" d="M10 24.5h52"/>',
    pillow: '<path class="f" d="M14 44V24a22 22 0 0 1 44 0v20zM4 44h64v8H4z"/><circle class="r" cx="36" cy="26" r="13"/><circle class="o" cx="36" cy="26" r="6"/><circle class="o" cx="10" cy="48" r="2"/><circle class="o" cx="62" cy="48" r="2"/>',
    flange: '<rect class="f" x="10" y="4" width="48" height="48" rx="6"/><circle class="r" cx="34" cy="28" r="14"/><circle class="o" cx="34" cy="28" r="6"/><circle class="o" cx="17" cy="11" r="3"/><circle class="o" cx="51" cy="11" r="3"/><circle class="o" cx="17" cy="45" r="3"/><circle class="o" cx="51" cy="45" r="3"/>',
    takeup: '<rect class="o" x="4" y="10" width="64" height="36"/><rect class="f" x="18" y="14" width="30" height="28"/><circle class="r" cx="33" cy="28" r="10"/><path class="c" d="M48 28h18"/>',
    linear: '<rect class="o" x="2" y="22" width="68" height="12"/><rect class="f" x="18" y="10" width="36" height="12"/><rect class="f" x="18" y="34" width="36" height="12"/><circle class="r" cx="24" cy="19" r="2.5"/><circle class="r" cx="32" cy="19" r="2.5"/><circle class="r" cx="40" cy="19" r="2.5"/><circle class="r" cx="48" cy="19" r="2.5"/>',
    rail: '<path class="f" d="M24 50V30h-6V22h36v8h-6v20z"/><path class="o" d="M10 22V8h52v14"/><circle class="r" cx="20" cy="18" r="3"/><circle class="r" cx="52" cy="18" r="3"/>',
    slew: '<rect class="f" x="6" y="6" width="60" height="14"/><rect class="f" x="6" y="36" width="60" height="14"/><circle class="r" cx="36" cy="28" r="8"/><path class="c" d="M10 50v4M18 50v4M26 50v4M34 50v4M42 50v4M50 50v4M58 50v4"/>',
    ballxfer: '<path class="f" d="M10 18h52v8c0 18-52 18-52 0z"/><circle class="r" cx="36" cy="20" r="14"/><circle class="o" cx="24" cy="34" r="2.5"/><circle class="o" cx="36" cy="38" r="2.5"/><circle class="o" cx="48" cy="34" r="2.5"/>',
    magnetic: '<circle class="r" cx="36" cy="28" r="10"/><path class="f" d="M8 8h14v8H16v24h6v8H8zM64 8H50v8h6v24h-6v8h14z"/><path class="c2" d="M24 28h-4M52 28h-4"/>',
    jewel: '<path class="r" d="M36 8 50 22 36 36 22 22z"/><path class="f" d="M33 36h6v16h-6z"/><circle class="o" cx="36" cy="22" r="3"/>',
    flexure: '<rect class="f" x="4" y="8" width="18" height="40"/><rect class="f" x="50" y="8" width="18" height="40"/><path class="r2" d="M22 16c10 0 18 4 28 0M22 40c10 0 18 4 28 0"/>'
  };
  const dots = v => `<span class="dots" aria-label="${['none', 'low', 'medium', 'high'][v]}">${[1, 2, 3].map(i => `<i class="${i <= v ? 'on' : ''}"></i>`).join('')}</span>`;
  const FAM = ['All', 'Ball', 'Roller', 'Plain', 'Mounted', 'Special'];
  function typesHTML() {
    return `<div class="filters bfilt" role="group" aria-label="Filter bearing types">${FAM.map(f => `<button type="button" data-f="${f}" class="${f === 'All' ? 'on' : ''}" aria-pressed="${f === 'All'}">${f}${f === 'All' ? ' · ' + TYPES.length : ''}</button>`).join('')}</div>
      <div class="tablewrap bwrap"><table class="btable"><thead><tr><th></th><th>Type</th><th title="Load across the shaft">Radial</th><th title="Load along the shaft">Axial</th><th>Speed</th><th title="How much the shaft can tilt">Tilt</th><th>Used in</th></tr></thead>
      <tbody>${TYPES.map(([fam, name, ic, R, A, S, M, desc, use]) => `<tr data-f="${fam}"><td class="bic"><svg viewBox="0 0 72 56" aria-hidden="true">${I[ic]}</svg></td>
        <td class="bname"><b>${name}</b><span>${desc}</span></td><td data-l="Radial">${dots(R)}</td><td data-l="Axial">${dots(A)}</td><td data-l="Speed">${dots(S)}</td><td data-l="Tilt">${dots(M)}</td><td class="buse" data-l="Used in">${use}</td></tr>`).join('')}</tbody></table></div>
      <p class="note">Ratings are a rough guide, compared with other bearings of a similar size. Radial = load across the shaft, axial = load along it, tilt = how much shaft misalignment it accepts. Always size a real bearing from the maker's catalogue.</p>`;
  }

  MM.register({
    slug: 'ball-bearing', view: { w: 700, h: 470 }, period: 5 * Math.PI,
    params: [
      { key: 'n', label: 'Number of balls', min: 7, max: 12, step: 1, value: 9 },
      { key: 'bs', label: 'Ball size', min: 0.75, max: 1.2, step: 0.05, value: 1, unit: '×' },
      { key: 'load', label: 'Load', min: 0, max: 2, step: 1, value: 1, options: [[0, 'None'], [1, 'Radial'], [2, 'Axial']] }
    ],
    draw(g, a, p) {
      const c = g.c, rb = ballR(p), cage = cageRatio(p) * a, gr = rb * 0.72;
      g.centre(CX, CY, RO + 26);
      // outer race (fixed)
      c.save(); c.beginPath(); c.arc(CX, CY, RO, 0, TAU); c.arc(CX, CY, RP + gr, 0, TAU, true);
      c.fillStyle = COL.white; c.fill('evenodd'); c.restore();
      g.hatchPath(() => { c.beginPath(); c.arc(CX, CY, RO, 0, TAU); c.arc(CX, CY, RP + gr, 0, TAU, true); }, { spacing: 7, cx: CX, cy: CY });
      g.circle(CX, CY, RO, { w: 1.8 }); g.circle(CX, CY, RP + gr, { w: 1.4 });
      // inner race turns with the shaft
      c.save(); c.beginPath(); c.arc(CX, CY, RP - gr, 0, TAU); c.arc(CX, CY, RB, 0, TAU, true); c.fillStyle = COL.white; c.fill('evenodd'); c.restore();
      g.circle(CX, CY, RP - gr, { w: 1.4 }); g.circle(CX, CY, RB, { w: 1.4 });
      // shaft with a flat so its turning shows
      g.hatchPath(() => { c.beginPath(); c.arc(CX, CY, RB - 2, 0, TAU); }, { spacing: 5, cx: CX, cy: CY, angle: -Math.PI / 4 });
      const mk = (r, ang, col, w) => g.line(CX + (r - 9) * Math.cos(ang), CY - (r - 9) * Math.sin(ang), CX + r * Math.cos(ang), CY - r * Math.sin(ang), { w: w || 3, color: col });
      mk(RP - gr - 2, a + Math.PI / 2, COL.red, 4); mk(RB - 4, a + Math.PI / 2, COL.ink, 3);
      // cage band
      g.circle(CX, CY, RP, { w: 7, color: MM.tint('ink', .18) });
      // balls
      for (let i = 0; i < p.n; i++) {
        const th = -Math.PI / 2 + cage + i * TAU / p.n, x = CX + RP * Math.cos(th), y = CY - RP * Math.sin(th);
        const L = i === 0 ? load(a, p) : load(a + (i * TAU / p.n) / cageRatio(p), p), sh = Math.min(1, L * p.n / 5);
        g.circle(x, y, rb, { fill: p.load && sh > 0.02 ? MM.tint('red', 0.15 + 0.55 * sh) : COL.white, w: 1.5, color: i === 0 ? COL.red : COL.ink });
        const sp = -a * RP / (2 * rb);                      // each ball spins on its own axis
        g.line(x + rb * 0.55 * Math.cos(sp), y + rb * 0.55 * Math.sin(sp), x - rb * 0.55 * Math.cos(sp), y - rb * 0.55 * Math.sin(sp), { w: 1, color: COL.faint });
        if (i === 0) g.dot(x, y, 3.5, COL.red);
      }
      // load arrow on the shaft
      if (p.load === 1) { g.arrow(CX, CY - 92, CX, CY - 8, { color: COL.red, w: 2.4 }); g.text('F', CX + 10, CY - 80, { color: COL.red, weight: 700, size: 13 }); g.text('loaded zone', CX, CY + RO + 18, { size: 11, align: 'center', color: COL.red }); }
      g.curvedArrow(CX, CY, RB + 10, 2.4, 1.0, { color: COL.faint, w: 1.2 });
      g.text('FRONT VIEW', CX, 22, { size: 11, weight: 600, align: 'center', color: COL.faint });

      // ----- section through the bearing, at the right -----
      const SX = 560, s = 0.75, W = 64 * s, ro = RO * s, rp = RP * s, rbs = rb * s, rbo = RB * s, grs = gr * s;
      g.text('SECTION', SX, 22, { size: 11, weight: 600, align: 'center', color: COL.faint });
      g.line(SX - 70, CY, SX + 70, CY, { w: 0.8, dash: [10, 3, 2, 3], color: COL.faint });
      // shaft
      g.poly([[SX - 80, CY - rbo], [SX + 80, CY - rbo], [SX + 80, CY + rbo], [SX - 80, CY + rbo]], { fill: COL.white, hatch: { spacing: 5, cx: SX, cy: CY, angle: -Math.PI / 4 } });
      [-1, 1].forEach(sg => {
        const yb = CY + sg * rp;
        // outer ring with groove
        const oy0 = CY + sg * ro, oy1 = CY + sg * (rp + grs);
        g.poly([[SX - W / 2, oy0], [SX + W / 2, oy0], [SX + W / 2, oy1], [SX - W / 2, oy1]], { fill: COL.white, hatch: { spacing: 6, cx: SX, cy: CY } });
        // inner ring
        const iy0 = CY + sg * (rp - grs), iy1 = CY + sg * rbo;
        g.poly([[SX - W / 2, iy0], [SX + W / 2, iy0], [SX + W / 2, iy1], [SX - W / 2, iy1]], { fill: COL.white, hatch: { spacing: 6, cx: SX, cy: CY, angle: -Math.PI / 4 } });
        g.circle(SX, yb, rbs, { fill: p.load === 2 || (p.load === 1 && sg > 0) ? MM.tint('red', .45) : COL.white, color: COL.ink });
        // contact lines
        if (p.load === 2) { const k = 0.5; g.line(SX - rbs * k - 8, yb - sg * (rbs * 0.86 + 6), SX + rbs * k + 8, yb + sg * (rbs * 0.86 + 6), { w: 1.2, dash: [4, 3], color: COL.red }); }
        if (p.load === 1 && sg > 0) g.line(SX, yb - rbs - 8, SX, yb + rbs + 8, { w: 1.2, dash: [4, 3], color: COL.red });
      });
      if (p.load === 1) g.arrow(SX + 70, CY - 60, SX + 70, CY - 4, { color: COL.red, w: 2.2 });
      if (p.load === 2) { g.arrow(SX + 112, CY, SX + 84, CY, { color: COL.red, w: 2.2 }); g.text('F', SX + 112, CY - 12, { color: COL.red, weight: 700, size: 13, align: 'center' }); }
      g.text(p.n + ' balls · cage at ' + (cageRatio(p) * 100).toFixed(0) + '% of shaft speed', 350, 452, { size: 11, align: 'center', color: COL.faint });
    },
    panels: [{
      id: 'types', title: 'Types of bearings', intro: 'This page animates a deep groove ball bearing, the most common type. Many other designs exist, each chosen for a different mix of load, speed and space.',
      html: typesHTML,
      init(body) {
        body.addEventListener('click', e => {
          const b = e.target.closest('.bfilt button'); if (!b) return; const f = b.dataset.f;
          body.querySelectorAll('.bfilt button').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); });
          body.querySelectorAll('tbody tr').forEach(r => r.hidden = !(f === 'All' || r.dataset.f === f));
        });
      }
    }],
    graph: {
      title: 'Load carried by the red ball (share of total)', min: 0, max: 0.8, period: 5 * Math.PI,
      ticks: [{ v: 0, label: '0' }, { v: 0.25, label: '25%' }, { v: 0.5, label: '50%' }],
      series: [{ name: 'red ball', color: COL.red, f: (t, p) => load(t, p) }],
      readout(a, p) {
        const v = load(a, p);
        return { big: (v * 100).toFixed(0) + '%', small: p.load === 0 ? 'no load applied' : p.load === 2 ? 'axial: every ball shares it' : 'of the radial load, on the red ball' };
      }
    }
  });
})();
