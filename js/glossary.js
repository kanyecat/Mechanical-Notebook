/* Plain-language definitions for engineering words. MNGloss.apply(element) underlines the first use of each known
   term inside that element; hovering, focusing or tapping it shows the definition. MIT licence. */
(function () {
  const D = {
    'addendum': 'How far a gear tooth sticks out above the pitch circle. Usually equal to the module.',
    'angular velocity': 'How fast something turns, measured as an angle per second (rad/s) or in rpm.',
    'axial load': 'A force that pushes or pulls along the shaft, like the weight on a lazy-Susan.',
    'helical': 'Gear teeth cut at an angle across the face. They engage gradually, so the gear is smoother and quieter than a spur gear but pushes sideways along its shaft.',
    'herringbone': 'Two helical halves with opposite slants meeting in a V. It runs smoothly and the sideways pushes cancel out.',
    'kerf': 'The width of material a laser or saw burns away as it cuts.',
    'nesting': 'Packing cut-out parts close together on a sheet so less material is wasted.',
    'backlash': 'The small gap between meshing teeth. It lets gears turn freely but causes a little play when the direction reverses.',
    'base circle': 'For a cam, the smallest circle of the profile: where the follower sits when it is fully down.',
    'bearing stress': 'The pressure between two surfaces pressed together, like a key pushing on the side of its slot.',
    'bore': 'The hole through the middle of a part, where the shaft goes.',
    'cage': 'The thin frame inside a bearing that keeps the balls evenly spaced so they do not rub on each other.',
    'carrier': 'The arm or plate that holds the planet gears and turns as they go round the sun.',
    'centre distance': 'The distance between the two shaft centres.',
    'circlip': 'A springy split ring that snaps into a groove to stop a part sliding along a shaft or out of a hole.',
    'clamp force': 'How hard a tightened bolt squeezes the parts together. Also called preload.',
    'contact ratio': 'On average, how many pairs of teeth are touching at once. Above about 1.2 means one pair always takes over before the last lets go, so the drive runs smoothly.',
    'coupler': 'In a linkage, the floating bar that joins the two bars attached to the frame.',
    'coupler curve': 'The path drawn by a point on the coupler as the linkage moves.',
    'crank': 'A bar that turns all the way round a fixed pivot.',
    'cusp': 'A sharp point in a cam outline. A flat follower cannot ride over it, so the cam would not work.',
    'dead centre': 'The position where the crank and rod line up. The rod cannot turn the crank from here: it can only push straight through the pivot.',
    'dead point': 'The position where two bars line up and the linkage briefly cannot be driven by the output side.',
    'dedendum': 'How far a gear tooth space goes below the pitch circle. A little more than the addendum so the tips have room.',
    'degrees of freedom': 'How many separate inputs you need to fully control a mechanism. Most machines are built to have exactly one.',
    'dwell': 'A pause: part of the cycle where the output stays still while the input keeps turning.',
    'dynamic load rating': 'The load a bearing can carry for one million turns before 10% of a batch would show wear. Listed in every bearing catalogue as C.',
    'efficiency': 'The share of input power that comes out as useful work. The rest turns into heat through friction.',
    'epicyclic': 'Gears whose centres travel round another gear, as in a planetary gear train.',
    'fatigue': 'Damage from a load repeated many times. Parts can crack from fatigue at loads well below what would break them once.',
    'follower': 'The part that rides on a cam and is pushed by it.',
    'frame': 'The fixed part of a mechanism that everything else is mounted on.',
    'friction coefficient': 'A number that says how grippy two surfaces are: friction force ÷ pressing force. About 0.1 for oiled steel, 0.6 for dry rubber on pavement.',
    'Grashof': 'A test on the four bar lengths: shortest + longest ≤ the other two. If it passes, at least one bar can turn all the way round.',
    'helix angle': 'How steeply a thread or gear tooth winds round its axis.',
    'hypocycloid': 'The curve traced by a point on a small circle rolling inside a bigger one.',
    'idler': 'A gear or pulley that only passes motion along. It changes direction or spacing, not the overall ratio.',
    'indexing': 'Moving in exact equal steps, like a turntable that rotates by one station at a time.',
    'intermittent motion': 'Motion that goes, stops, and goes again while the input runs steadily.',
    'involute': 'The curve used for almost all gear teeth. It keeps the speed ratio exactly constant even if the gears sit slightly apart.',
    'keyway': 'A slot cut along a shaft or in a hub that holds a key.',
    'lead': 'How far a screw or nut moves along in one full turn. Lead = pitch × number of starts.',
    'linkage': 'A set of rigid bars joined by pivots or sliders that turns one motion into another.',
    'mechanical advantage': 'How many times a mechanism multiplies your force. You pay for it with distance: the input moves further than the output.',
    'module': 'The size of a gear tooth in millimetres: pitch diameter ÷ number of teeth. Gears only mesh if their modules match.',
    'nut factor': 'A rule-of-thumb number (about 0.2 for dry steel) that links tightening torque to clamp force: T = K × F × d.',
    'pawl': 'A hinged catch that drops into the teeth of a ratchet so it can only turn one way.',
    'pinion': 'The smaller of two meshing gears, or the round gear that drives a rack.',
    'pitch': 'The distance from one tooth, thread or link to the next.',
    'pitch circle': 'The imaginary circle where two meshing gears roll on each other without slipping. Gear ratios are worked out from it.',
    'pitch diameter': 'The diameter of the pitch circle: for a gear, module × teeth.',
    'pitch point': 'Where the two pitch circles touch, on the line between the gear centres.',
    'preload': 'The tension built into a bolt when it is tightened. It is what actually holds a joint together.',
    'pressure angle': 'The angle between the direction a tooth or cam pushes and the direction the part can move. Large angles waste force pushing sideways.',
    'profile shift': 'Cutting a gear slightly further out (positive) or in (negative) than normal. Used to stop undercut on small gears and to fit odd centre distances.',
    'proof load': 'The highest force a bolt can carry and still spring back to its original length.',
    'quick return': 'A motion that goes out slowly and comes back fast, so less time is wasted on the return.',
    'races': 'The two hardened rings in a bearing with grooves the balls roll in.',
    'radial load': 'A force at right angles to the shaft, like the weight of a wheel on its axle.',
    'ratchet': 'A wheel with sloped teeth that a pawl lets turn one way only.',
    'rocker': 'A bar that swings back and forth about a fixed pivot without going all the way round.',
    'rolling element': 'The balls or rollers that roll between the races of a bearing.',
    'rpm': 'Revolutions per minute: full turns each minute.',
    'self-locking': 'A drive that cannot be turned backwards from the output, because friction is too high. Handy for holding a load without a brake.',
    'shear stress': 'Stress from forces that try to slide one layer of a material past the next, like scissors cutting.',
    'simple harmonic motion': 'Smooth back-and-forth motion that follows a sine wave, like a mass bouncing on a spring.',
    'slider': 'A block that slides along a straight guide.',
    'spring index': 'Coil diameter ÷ wire diameter. Between about 4 and 12 is easy to make; outside that the spring is hard to coil or flimsy.',
    'spring rate': 'How much force it takes to compress a spring by one millimetre (N/mm). Also called stiffness.',
    'sprocket': 'A toothed wheel that drives a chain.',
    'starts': 'How many separate threads wind round a screw or worm side by side. More starts move the nut further each turn.',
    'stroke': 'The full distance a slider or piston travels from one end to the other.',
    'sun gear': 'The gear in the centre of a planetary gear train.',
    'ring gear': 'A gear with teeth on the inside of a ring.',
    'tensile stress': 'Force ÷ area when something is pulled. Steel bolts are rated by how much of this they can take.',
    'thread angle': 'The angle between the two flanks of a thread. 60° for standard metric bolts, 29° or 30° for lead screws.',
    'time ratio': 'Time for the forward stroke ÷ time for the return stroke.',
    'torque': 'Twisting force: force × the distance from the turning centre. Measured in N·m.',
    'transmission angle': 'The angle between the coupler and the output bar. Near 90° the force goes straight into turning the output; below about 40° most of it is wasted.',
    'undercut': 'When a gear has too few teeth, the cutting tool carves away the bottom of each tooth, leaving it thin and weak. On a cam, it means the follower cannot reach part of the outline, so the motion is not what you designed.',
    'universal joint': 'A cross-shaped joint that lets a shaft turn round a corner.',
    'worm': 'A screw-shaped gear that drives a worm wheel at right angles.',
    'yoke': 'A slotted or forked part that a pin or another part works inside.',
    'jerk': 'How quickly acceleration changes. High jerk means a sudden kick, which causes vibration and noise.',
    'L10 life': 'How long a bearing lasts before 10% of a batch would show wear. 90% last longer than this.',
    'interference engine': 'An engine where the valves and pistons share space at different times, so they collide if the timing belt breaks.',
    'Wahl factor': 'A correction for the extra stress on the inside of a tightly curved spring coil.'
  };
  const alias = {
    'undercutting': 'undercut', 'pitch circles': 'pitch circle', 'cranks': 'crank', 'rockers': 'rocker', 'idlers': 'idler', 'sprockets': 'sprocket', 'pawls': 'pawl',
    'ratchets': 'ratchet', 'followers': 'follower', 'transmission angles': 'transmission angle', 'pressure angles': 'pressure angle',
    'dead points': 'dead point', 'dead centres': 'dead centre', 'linkages': 'linkage', 'circlips': 'circlip', 'keyways': 'keyway', 'races': 'races', 'race': 'races',
    'rolling elements': 'rolling element', 'pinions': 'pinion', 'SHM': 'simple harmonic motion', 'Grashof test': 'Grashof', 'contact ratios': 'contact ratio',
    'self-lock': 'self-locking', 'locks itself': 'self-locking', 'spring constant': 'spring rate', 'stiffness': 'spring rate', 'nut-factor': 'nut factor',
    'thread pitch': 'pitch', 'retaining ring': 'circlip', 'retaining rings': 'circlip', 'sun': 'sun gear', 'planetary': 'epicyclic'
  };
  // only these aliases are matched as words (single short words like 'sun' are too common to underline everywhere)
  delete alias.sun; delete alias.planetary;
  const keys = Object.keys(D).concat(Object.keys(alias)).sort((a, b) => b.length - a.length);
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const RX = new RegExp('\\b(' + keys.map(esc).join('|') + ')\\b', 'i');
  const lookup = w => { const k = keys.find(x => x.toLowerCase() === w.toLowerCase()); return k ? (D[k] ? k : alias[k]) : null; };
  const SKIP = /^(A|BUTTON|SELECT|OPTION|INPUT|TEXTAREA|LABEL|SCRIPT|STYLE|CANVAS|SVG|H1|CODE|ABBR)$/;

  let tip = null, cur = null, shownAt = 0, pinned = false;
  function show(el) {
    if (!tip) { tip = document.createElement('div'); tip.className = 'gloss-tip'; tip.setAttribute('role', 'tooltip'); tip.id = 'gloss-tip'; document.body.appendChild(tip); }
    if (cur !== el) shownAt = Date.now(); cur = el; const k = el.dataset.term;
    tip.innerHTML = `<b>${k}</b>${D[k]}`; tip.hidden = false; tip.style.left = '0px'; tip.style.top = '0px';
    const r = el.getBoundingClientRect(), tw = Math.min(300, window.innerWidth - 24); tip.style.width = tw + 'px';
    const th = tip.offsetHeight; let x = r.left + r.width / 2 - tw / 2; x = Math.max(12, Math.min(window.innerWidth - tw - 12, x));
    let y = r.top - th - 8; if (y < 8) y = r.bottom + 8;
    tip.style.left = x + 'px'; tip.style.top = y + 'px'; el.setAttribute('aria-describedby', 'gloss-tip');
  }
  function hide() { pinned = false; if (tip) tip.hidden = true; if (cur) cur.removeAttribute('aria-describedby'); cur = null; }

  function wire(span) {
    span.addEventListener('mouseenter', () => show(span)); span.addEventListener('mouseleave', () => { if (!pinned) hide(); });
    span.addEventListener('focus', () => show(span)); span.addEventListener('blur', () => { if (!pinned) hide(); });
    span.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); if (cur === span && Date.now() - shownAt > 400) hide(); else { show(span); pinned = true; } });   // a tap also fires hover and focus first
  }
  document.addEventListener('click', e => { if (cur && !e.target.closest('.term')) hide(); });
  window.addEventListener('scroll', () => { if (!cur) return; const r = cur.getBoundingClientRect(); (r.bottom < 0 || r.top > window.innerHeight) ? hide() : show(cur); }, { passive: true });   // follow the word while scrolling
  document.addEventListener('keydown', e => { if (e.key === 'Escape') hide(); });

  /* underline the first use of each term inside el (and skip terms already marked in el) */
  function apply(el, opts) {
    if (!el) return; const used = new Set(); el.querySelectorAll('.term').forEach(t => used.add(t.dataset.term));
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode(n) {
      for (let p = n.parentNode; p && p !== el; p = p.parentNode) if (SKIP.test(p.nodeName.toUpperCase()) || (p.classList && (p.classList.contains('term') || p.classList.contains('noterm')))) return NodeFilter.FILTER_REJECT;
      return RX.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP; } });
    const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(n => {
      let text = n.nodeValue, frag = null, m, rx = new RegExp(RX.source, 'gi'), lastI = 0;
      while ((m = rx.exec(text))) {
        const k = lookup(m[1]); if (!k || used.has(k)) continue; used.add(k);
        frag = frag || document.createDocumentFragment();
        frag.appendChild(document.createTextNode(text.slice(lastI, m.index)));
        const s = document.createElement('span'); s.className = 'term'; s.tabIndex = 0; s.dataset.term = k; s.textContent = m[1]; wire(s);
        frag.appendChild(s); lastI = m.index + m[1].length;
      }
      if (frag) { frag.appendChild(document.createTextNode(text.slice(lastI))); n.parentNode.replaceChild(frag, n); }
    });
  }
  window.MNGloss = { apply, defs: D, hide };
})();
