// Builds every page: index.html, about.html, pages/<slug>.html (mechanisms) and elements/<slug>.html (mechanical elements).
// Run `node build.js` after adding a file to js/mechanisms or js/elements, or after changing the text in this file.
const fs = require('fs'), path = require('path');
const R = (...p) => path.join(__dirname, ...p);
const list = dir => fs.existsSync(R(dir)) ? fs.readdirSync(R(dir)).filter(f => f.endsWith('.js')).map(f => f.replace('.js', '')) : [];
const order = (slugs, key) => { const src = fs.readFileSync(R('js/catalog.js'), 'utf8'), at = s => src.indexOf(`slug: '${s}'`); return slugs.slice().sort((a, b) => at(a) - at(b)); };
const mech = order(list('js/mechanisms')), elems = order(list('js/elements')), mathSlugs = list('js/math');
const FABCAT = (() => { const w = {}; new Function('window', fs.readFileSync(R('js/fab-catalog.js'), 'utf8'))(w); return w.MM_FAB; })();
const fabSlugs = list('js/fab').sort((a, b) => FABCAT.findIndex(c => c.slug === a) - FABCAT.findIndex(c => c.slug === b));
const REPO = 'https://github.com/kanyecat/Mechanical-Notebook';
const SITE = 'https://mechanicalnotebook.com';
const DESC = 'Interactive, animated mechanisms and machine parts with the math behind them, plus free gear, linkage and cam generators with SVG, DXF and STL export.';

const head = (title, p, desc, url) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title><meta name="description" content="${desc || DESC}">
<meta property="og:title" content="${title}"><meta property="og:description" content="${desc || DESC}"><meta property="og:type" content="website"><meta property="og:url" content="${SITE}/${url || ''}">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%231b4b82'/%3E%3Ccircle cx='16' cy='16' r='9' fill='none' stroke='%23ffd166' stroke-width='3' stroke-dasharray='4 3'/%3E%3Ccircle cx='16' cy='16' r='3' fill='%23eef5ff'/%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
<script src="${p}js/theme.js"></script><script src="${p}js/analytics.js"></script>
<link rel="stylesheet" href="${p}css/style.css"></head><body>`;

const chev = '<svg class="chev" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5 6 7.5 9 4.5"/></svg>';
const nav = (p, here) => `<a class="skip" href="#app">Skip to content</a>
<header class="nav"><div class="navin">
  <a class="brand" href="${p}index.html" aria-label="Mechanical Notebook home"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7.5" stroke-dasharray="3.2 2.4"/><circle cx="12" cy="12" r="2.2"/></svg><span>Mechanical <b>Notebook</b></span></a>
  <nav class="links" id="navlinks" aria-label="Main">
    <a href="${p}mechanisms.html"${here === 'm' ? ' aria-current="page"' : ''}>Mechanisms</a>
    <a href="${p}elements.html"${here === 'e' ? ' aria-current="page"' : ''}>Elements</a>
    <div class="dd"><button type="button" class="ddb" aria-expanded="false" aria-haspopup="true">Generators ${chev}</button>
      <div class="ddm">
        <a href="${p}generators.html"><b>All generators</b><span>Overview and ready-made starting points</span></a>
        <a href="${p}generators/gears.html"><b>Gear generator</b><span>Spur, ring and rack gears, gear trains</span></a>
        <a href="${p}generators/linkages.html"><b>Linkage generator</b><span>Four-bar, slider crank, multi-link</span></a>
        <a href="${p}generators/cams.html"><b>Cam generator</b><span>Motion programs, followers, checks</span></a>
        <a href="${p}generators/pulleys.html"><b>Pulley generator</b><span>Belt drives, idlers, lifting tackle</span></a>
        <a href="${p}generators/chains.html"><b>Chain and sprocket generator</b><span>Roller chain, sprockets, multi-stage drives</span></a>
        <a href="${p}generators/hinges.html"><b>Living hinge generator</b><span>Slit, wave, torsion and diamond patterns</span></a>
      </div></div>
    <a href="${p}combine.html"${here === 'c' ? ' aria-current="page"' : ''}>Combine</a>
    <a href="${p}fabrication.html"${here === 'f' ? ' aria-current="page"' : ''}>Fabrication</a>
    <a href="${p}about.html"${here === 'a' ? ' aria-current="page"' : ''}>About</a>
  </nav>
  <span class="navr"><button type="button" class="srchb" data-search aria-label="Search the notebook" title="Search (Ctrl/⌘ + K, or /)"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg><span class="lbl">Search</span><kbd>/</kbd></button><span data-theme-picker></span>
  <button type="button" class="menub" aria-expanded="false" aria-controls="navlinks" aria-label="Open menu"><svg viewBox="0 0 24 24" aria-hidden="true"><path class="m1" d="M4 7h16"/><path class="m2" d="M4 12h16"/><path class="m3" d="M4 17h16"/></svg></button></span>
</div></header>`;

const foot = p => `<footer class="foot"><div class="footin">
  <div class="fcol fabout"><div class="fbrand">Mechanical <b>Notebook</b></div>
    <p>A free, open notebook of moving parts. Watch them move, change them, and work out the numbers.</p>
    <p class="fsmall">Made by <a class="fname" href="https://www.jooheekim.art" target="_blank" rel="noopener">Joo Hee Kim</a> · <a href="${p}about.html">About this site</a></p></div>
  <div class="fcol"><h4>Explore</h4>
    <a href="${p}mechanisms.html">Mechanisms</a><a href="${p}elements.html">Mechanical elements</a><a href="${p}fabrication.html">Fabrication techniques</a><a href="${p}combine.html">Combine mechanisms</a>
    <a href="${p}generators/gears.html">Gear generator</a><a href="${p}generators/linkages.html">Linkage generator</a><a href="${p}generators/cams.html">Cam generator</a><a href="${p}generators/pulleys.html">Pulley generator</a><a href="${p}generators/chains.html">Chain generator</a><a href="${p}generators/hinges.html">Living hinge generator</a><a href="${p}requests.html">Requests and ideas</a></div>
  <div class="fcol"><h4>Project</h4>
    <a href="${REPO}" rel="noopener">Source code on GitHub</a><span>Free and open source (MIT licence)</span>
    <span>Inspired by <i>507 Mechanical Movements</i> by Henry T. Brown (1868)</span><span>Visits are counted with Google Analytics</span></div>
</div><div class="fbase"><span>© ${new Date().getFullYear()} Joo Hee Kim</span><span>More mechanisms, elements and generators are on the way.</span></div></footer>`;

const tail = (p, scripts) => `<script src="${p}js/glossary.js"></script><script src="${p}js/site.js"></script><script src="${p}js/searchdata.js"></script><script src="${p}js/search.js"></script>${scripts || ''}</body></html>`;
const engine = (p, slugs, dir) => `<script src="${p}js/catalog.js"></script><script src="${p}js/fab-catalog.js"></script><script src="${p}js/engine.js"></script>`
  + slugs.map(x => `<script src="${p}js/${dir}/${x}.js"></script>`).join('');

/* ----- mechanism and element pages ----- */
function detail(slug, dir, folder, here) {
  const extra = (fs.existsSync(R('js/learn.js')) ? '<script src="../js/learn.js"></script>' : '') + (mathSlugs.includes(slug) ? `<script src="../js/math/${slug}.js"></script>` : '');
  fs.mkdirSync(R(folder), { recursive: true });
  fs.writeFileSync(R(folder, slug + '.html'), head('Mechanical Notebook', '../', null, `${folder}/${slug}.html`) + nav('../', here) + '<main class="sheet" id="app"></main>' + foot('../')
    + tail('../', engine('../', dir === 'mechanisms' ? mech : dir === 'fab' ? fabSlugs : elems, dir) + extra + (dir === 'fab' ? '<script src="../js/hinge-pattern.js"></script><script src="../js/fab-tricks.js"></script>' : '') + `<script>MM.mount('${slug}')</script>`));
}
mech.forEach(s => detail(s, 'mechanisms', 'pages', 'm'));
elems.forEach(s => detail(s, 'elements', 'elements', 'e'));
fabSlugs.forEach(s => detail(s, 'fab', 'fabrication', 'f'));

/* ----- search index and goals ----- */
const GOALS = require('./js/goals.js'), RECIPES = require('./js/recipes.js');
const rurl = id => 'combine.html#' + encodeURIComponent(JSON.stringify(RECIPES.find(r => r.id === id).stages));
const CAT = (() => { const w = {}; new Function('window', fs.readFileSync(R('js/catalog.js'), 'utf8'))(w); return w; })();
const byslug = {}; (CAT.MM_CATALOG || []).forEach(c => byslug[c.slug] = Object.assign({ dir: 'pages' }, c)); (CAT.MM_ELEMENTS || []).forEach(c => byslug[c.slug] = Object.assign({ dir: 'elements' }, c)); FABCAT.forEach(c => byslug[c.slug] = Object.assign({ dir: 'fabrication' }, c));
const GENS = {
  gears: ['Gear generator', 'Spur, helical, herringbone, bevel and worm gears, ring gears, racks and gear trains, with SVG, DXF and STL export.', 'involute module teeth pitch pressure angle backlash train planetary idler compound holes skeleton spokes laser cut bore keyway nest'],
  linkages: ['Linkage generator', 'Four-bar, slider-crank and multi-link mechanisms with coupler curves, link designs and export.', 'four-bar slider crank multi link jansen coupler curve path trace grashof transmission angle rocker walking leg'],
  cams: ['Cam generator', 'Program rise, dwell and fall motions, pick a follower, and check pressure angle and undercut.', 'cam follower motion program cycloidal harmonic dwell rise fall lift pressure angle undercut roller flat knife'],
  pulleys: ['Pulley generator', 'Belt drives with idlers and shared shafts, and block-and-tackle lifting systems.', 'belt pulley idler wrap angle slip tension block and tackle lifting load sheave rope timing v-belt'],
  chains: ['Chain and sprocket generator', 'Roller chain and sprockets in ANSI and ISO sizes with attachments, multiple chains and sprocket designs.', 'roller chain sprocket ansi iso pitch attachment plate tab multi strand idler tensioner skeleton'],
  hinges: ['Living hinge generator', 'Laser-cut flexure patterns that let a stiff sheet bend: straight, meander, torsion, wave, cross and fillet lattices, diamonds and beehive. Estimates how far it bends in your material and flags fragile or too-stiff designs.', 'living hinge flexure kerf bending lattice slit pattern straight meander serpentine torsion wave cross fillet diamond beehive honeycomb basswood birch plywood mdf acrylic bend laser cut flex test sheet pattern only svg dxf']
};
const PRESETS = [   // deep links into a generator: [generator, title, description, settings, extra words]
  ['gears', 'Bevel gears', 'A pair of cone gears for shafts that meet at an angle, cut as stacked layers or one tapered part.', { mode: 'bevel' }, 'bevel miter right angle tredgold'],
  ['gears', 'Worm drive', 'A worm and wheel with 1 to 4 starts, left or right hand, as keyed layers or a twisted STL.', { mode: 'worm' }, 'worm wheel lead self locking reduction'],
  ['gears', 'Helical gears', 'Slanted teeth for smooth, quiet running, with the helix angle shown in the STL.', { ftype: 'helical' }, 'helical helix angle'],
  ['gears', 'Herringbone gears', 'Two opposite slants in a V so the sideways pushes cancel.', { ftype: 'herring' }, 'herringbone double helical'],
  ['gears', 'Rack and pinion', 'A pinion driving a straight toothed rack.', { type: 'rack' }, 'rack pinion linear'],
  ['gears', 'Ring (internal) gear', 'A pinion running inside a ring gear.', { type: 'int', z1: 14, z2: 40 }, 'ring internal annulus'],
  ['gears', 'Skeleton gears', 'Gears with spokes or holes cut in the body to save material and weight.', { gdesign: 'spokes' }, 'skeleton spokes holes lightweight pockets teardrop swirl'],
  ['linkages', 'Slider-crank', 'A crank, rod and slider, with the stroke and time ratio.', { kind: 'slider' }, 'slider crank piston engine stroke'],
  ['linkages', 'Multi-link builder', 'Build your own linkage from pivots and links and trace any point.', { kind: 'multi' }, 'multi link jansen walking leg sixbar'],
  ['hinges', 'Torsion hinge test sheet', 'Four torsion hinges with 5, 10, 20 and 30 mm links side by side, to find the one that bends best in your sheet.', { pat: 'torsion', out: 'sheet', vary: 'L', vals: '5, 10, 20, 30', W: 30 }, 'torsion living hinge test link length'],
  ['hinges', 'Wavy slit hinge pattern', 'Just the pattern, ready to paste over the place on your part that should bend.', { pat: 'wave', out: 'pattern' }, 'wavy slit pattern paste'],
  ['pulleys', 'Block and tackle', 'Lifting systems with mechanical advantage, effort and rope pulled.', { mode: 'lift' }, 'block tackle lifting hoist winch mechanical advantage']
];
const gurl = (id, preset) => `generators/${id}.html` + (preset ? '#' + encodeURIComponent(JSON.stringify(preset)) : '');
const pickUrl = ([k, slug, , preset]) => k === 'g' ? gurl(slug, preset) : k === 'c' ? rurl(slug) : (byslug[slug].dir + '/' + slug + '.html');
const EXTRA = {   // words people type that the page text does not use
  'tab-and-slot': 'tab slot t-slot flat pack laser cut box joint fit kerf', 'finger-joint': 'box joint finger joint comb joint corner drawer', 'captive-nut': 'nut trap nut slot hex pocket t-nut bolt hold nut m3 m4 m5',
  'heat-set-insert': 'heat set insert threaded insert melt in brass insert soldering iron m3 m4 m5 thread plastic', 'press-fit': 'press fit interference fit friction fit dowel pin bearing seat shaft hole tolerance', 'snap-fit': 'snap fit cantilever hook clip latch catch click',
  'living-hinge': 'living hinge flexure flex hinge bending kerf bend lattice', 'laser-kerf': 'kerf laser cutter tolerance offset compensation fit clearance beam width', 'print-tolerances': 'fdm 3d print tolerance overhang bridging support hole shrink wall thickness layer nozzle',
  'cnc-corners': 'dog bone dogbone t-bone inside corner fillet router end mill cutter radius pocket', 'poka-yoke': 'poka yoke mistake proofing asymmetric keyed orientation assembly dfa design for assembly',
  'shaft-key': 'keyway key way woodruff feather spline set screw hub', 'bolt-nut': 'bolt nut screw fastener thread metric imperial torque preload washer m3 m4 m5 m6 m8', 'ball-bearing': 'bearing ball bearing race 608 skateboard radial thrust bushing',
  spring: 'spring compression extension rate stiffness coil wire', 'retaining-ring': 'circlip e-clip snap ring seeger groove', 'lead-screw': 'lead screw leadscrew acme trapezoidal jack ball screw', 'screw-types': 'screw phillips torx hex allen drive wood machine self tapping',
  'timing-belt': 'timing belt gt2 htd stepper cog tooth belt', 'geneva-drive': 'geneva maltese cross indexing', 'slider-crank': 'piston engine crank slider', 'four-bar': 'four bar fourbar rocker crank coupler grashof', 'jansen-linkage': 'strandbeest theo jansen walking leg',
  'planetary-gears': 'epicyclic sun planet ring carrier gearbox', 'worm-gear': 'worm wheel self locking', 'spur-gears': 'gear teeth involute meshing', 'cam-follower': 'cam follower lobe', 'roller-chain': 'chain sprocket bicycle', 'belt-pulleys': 'belt pulley block tackle v-belt',
  'double-hookes-joint': 'universal joint u-joint cardan driveshaft', 'tusi-couple': 'tusi couple hypocycloid cardano', 'peaucellier': 'peaucellier lipkin inversor straight line', 'trammel': 'trammel archimedes ellipse', 'quick-return': 'quick return whitworth shaper', 'ratchet-pawl': 'ratchet pawl click one way', 'scotch-yoke': 'scotch yoke slotted'
};
const why = {}; GOALS.forEach(g => g.picks.forEach((pk, i) => { if (pk[0] !== 'g' || !pk[3]) { const key = pk[0] + pk[1]; (why[key] = why[key] || []).push(Object.assign({ i }, g)); } }));
const ord = list => list.length ? Math.min(...list.map(g => g.i)) : null;
const docs = [];
Object.entries(GENS).forEach(([id, [n, d, k]]) => { const gs = (why['g' + id] || []); docs.push({ t: 'g', u: gurl(id), n, c: 'Generator', d, k: k, w: gs.map(g => g.title + ' ' + g.words).join(' '), o: ord(gs), x: '', why: gs.slice(0, 2).map(g => g.title).join(' · ') }); });
PRESETS.forEach(([id, n, d, pre, k]) => docs.push({ t: 'g', u: gurl(id, pre), n: GENS[id][0].replace(' generator', '') + ': ' + n, c: 'Generator', d, k: k + ' ' + GENS[id][2], x: '' }));
Object.values(byslug).forEach(c => {
  const t = c.dir === 'pages' ? 'm' : c.dir === 'fabrication' ? 'f' : 'e', gs = why[t + c.slug] || [];
  docs.push({ t, u: c.dir + '/' + c.slug + '.html', n: c.name, c: c.category, d: c.fn, k: (EXTRA[c.slug] || '') + (c.process ? ' ' + c.process.join(' ') + ' fabrication technique design for assembly manufacturing dfm dfa' : ''), w: gs.map(g => g.title + ' ' + g.words).join(' '), o: ord(gs), x: [].concat(c.notes || [], c.app || [], c.fun || []).join(' '), why: gs.slice(0, 2).map(g => g.title).join(' · ') });
});
docs.push({ t: 'c', u: 'combine.html', n: 'Combine mechanisms', c: 'Tool', d: 'Chain mechanisms so the output of one drives the next, and see the motion that comes out of the end.', k: 'combine chain stages compound gearbox gear train reduction connect link together drive output of one into another', x: '' });
RECIPES.forEach(r => docs.push({ t: 'c', u: rurl(r.id), n: r.title, c: 'Combine', d: r.blurb, k: r.words + ' combine chain', x: '' }));
fs.writeFileSync(R('js/searchdata.js'), '/* Written by build.js: the search index. Do not edit by hand. */\nwindow.MN_SEARCH = ' + JSON.stringify({ docs, goals: GOALS.map(g => g.title) }) + ';\n');

/* ----- home page ----- */
const gens = [
  ['gears', 'spur-gears', 'Gear generator', 'Spur gears, ring gears and racks with true involute teeth. Connect as many gears as you like into a train and watch them turn.'],
  ['linkages', 'four-bar', 'Linkage generator', 'Four-bar and slider-crank linkages, or build your own multi-link mechanism and trace the path of any point.'],
  ['cams', 'cam-follower', 'Cam generator', 'Program a motion step by step, choose a follower, and check the pressure angle and undercut before you cut.'],
  ['pulleys', 'belt-pulleys', 'Pulley generator', 'Place pulleys anywhere, join them with belts and hang loads on them, or rig a block and tackle. See speeds, grip and whether it can lift.'],
  ['chains', 'roller-chain', 'Chain and sprocket generator', 'Roller chain and sprockets in ANSI and ISO sizes. Place sprockets anywhere, run several chains, pick skeleton or swirl sprockets and cut every part.'],
  ['hinges', null, 'Living hinge generator', 'Make a flat, stiff sheet bend. Pick one of eight tested lattice patterns and your material, see how far it will bend before it cracks, and export a test piece, a test sheet or just the pattern.', 'svg']
];
const live = s => `<canvas data-s="${s}" data-live data-box aria-hidden="true"></canvas>`;
const ROOMS = [
  { id: 'mechanisms', href: 'mechanisms.html', title: 'Mechanisms', count: mech.length + ' pages', blurb: 'Animated drawings of how motion is changed: gears, linkages, cams, intermittent drives. Change them, see the graph, work the math.', cta: 'Enter mechanisms', prev: live('four-bar') },
  { id: 'elements', href: 'elements.html', title: 'Elements', count: elems.length + ' pages', blurb: 'Bearings, fasteners, springs and the other parts that hold machines together: how they work and how to size them.', cta: 'Enter elements', prev: live('ball-bearing') },
  { id: 'generators', href: 'generators.html', title: 'Generators', count: gens.length + ' tools', blurb: 'Design real parts, check them for problems and export SVG, DXF and STL for laser cutting, CNC or 3D printing.', cta: 'Enter generators', prev: live('cam-follower') },
  { id: 'combine', href: 'combine.html', title: 'Combine', count: RECIPES.length + ' examples', blurb: 'Chain mechanisms so the output of one drives the next: a gearbox into a piston, a chain into an indexer.', cta: 'Open the combine tool', prev: '<div class="rpair">' + live('spur-gears') + '<i>→</i>' + live('slider-crank') + '</div>' },
  { id: 'fabrication', href: 'fabrication.html', title: 'Fabrication', count: fabSlugs.length + ' techniques', blurb: 'How to design parts that go together and come out right: tab and slot, heat-set inserts, snap fits, kerf, tolerances and more.', cta: 'Enter fabrication', prev: live('tab-and-slot') }
];
fs.writeFileSync(R('index.html'), head('Mechanical Notebook: how machines move, and the math behind them', '', null, '') + nav('', 'h') + `
<main class="sheet home" id="app">
  <section class="hero solo">
    <div class="heromain">
      <div class="kicker">How machines move, and the math behind them</div>
      <h1 class="title">Mechanical Notebook</h1>
      <p class="lede" data-gloss>Watch mechanisms and machine parts move, change their sizes, and work out the real numbers: speeds, ratios, forces and strokes. Then design your own with the generators and export files to make them.</p>
      <button type="button" class="herosearch" data-search aria-label="Search the notebook"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg><span>Search mechanisms, generators, parts…</span><kbd>/</kbd></button>
      <div class="cta"><a class="btn" href="#goals">What do you want to do?</a><a class="btn ghost" href="#rooms">Browse the rooms</a></div>
    </div>
  </section>

  <section id="rooms" class="sec firstsec">
    <header class="sech"><span class="secn">01</span><div><h2>Explore the notebook</h2><p>Five rooms, each with its own page and filters. Pick one, or search from the bar above.</p></div></header>
    <div class="rooms">${ROOMS.map(r => `
      <a class="room r-${r.id}" href="${r.href}"><div class="rprev">${r.prev}</div>
        <div class="rtext"><div class="rtop"><h3>${r.title}</h3><span class="rcount">${r.count}</span></div><p>${r.blurb}</p><span class="go">${r.cta} →</span></div></a>`).join('')}
    </div>
  </section>

  <section id="goals" class="sec">
    <header class="sech"><span class="secn">02</span><div><h2>What do you want to do?</h2><p>Pick the motion you need to see mechanisms to learn from and generators that open ready to design.</p></div></header>
    <div class="mpick" data-mpick>
      <label class="mplab" for="mpsel">I want to</label>
      <div class="mpwrap"><button type="button" class="mpbtn" id="mpsel" aria-haspopup="listbox" aria-expanded="false"><span class="gi" aria-hidden="true">?</span><span class="mpt">Choose a motion…</span><svg class="chev" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5 6 7.5 9 4.5"/></svg></button>
        <ul class="mplist" role="listbox" aria-label="Motions" hidden>${GOALS.map(g => `<li role="option" tabindex="-1" data-g="${g.id}"><span class="gi" aria-hidden="true">${g.icon}</span><span><b>${g.title}</b><small>${g.blurb}</small></span></li>`).join('')}</ul></div>
    </div>
    <div class="goals">${GOALS.map(g => `
      <article class="goal" id="goal-${g.id}"><h3><span class="gi" aria-hidden="true">${g.icon}</span>${g.title}</h3><p>${g.blurb}</p>
        <ul>${g.picks.map(pk => `<li><a href="${pickUrl(pk)}"><span class="pk pk-${pk[0]}">${{ m: 'Mechanism', e: 'Element', g: 'Generator', c: 'Combine', f: 'Technique' }[pk[0]]}</span><span class="pn"><b>${pk[0] === 'g' ? (GENS[pk[1]][0]) : pk[0] === 'c' ? RECIPES.find(r => r.id === pk[1]).title : byslug[pk[1]].name}</b><small>${pk[2]}</small></span></a></li>`).join('')}</ul></article>`).join('')}
    </div>
  </section>

</main>` + foot('') + tail('', engine('', mech, 'mechanisms') + elems.map(x => `<script src="js/elements/${x}.js"></script>`).join('') + fabSlugs.map(x => `<script src="js/fab/${x}.js"></script>`).join('') + '<script>MM.landing()</script>'));

/* ----- room pages: one page for each room, with its own filters ----- */
const roomPage = (file, here, kicker, title, lede, body, scripts) => fs.writeFileSync(R(file), head(title + ' · Mechanical Notebook', '', lede, file) + nav('', here) + `
<main class="sheet roompage" id="app">
  <header class="phead"><div class="kicker">${kicker}</div><h1 class="title">${title}</h1><p class="lede" data-gloss>${lede}</p></header>
  ${body}
</main>` + foot('') + tail('', scripts));
roomPage('mechanisms.html', 'm', 'Room 1', 'Mechanisms', 'Each page has a moving drawing you can change, a step-by-step explanation, a motion graph, and a calculator with practice problems.',
  `<div class="filters" id="filters" role="group" aria-label="Filter mechanisms by category"></div><div class="grid" id="grid" data-room="mechanisms"></div>`, engine('', mech, 'mechanisms') + '<script>MM.landing()</script>');
roomPage('elements.html', 'e', 'Room 2', 'Mechanical elements', 'Bearings, fasteners, springs and the other everyday parts that hold machines together: how they work, how to choose them, and how to size them.',
  `<div class="filters" id="filters" role="group" aria-label="Filter elements by category"></div><div class="grid" id="grid" data-room="elements"></div>`, engine('', elems, 'elements') + '<script>MM.landing()</script>');
roomPage('fabrication.html', 'f', 'Room 5', 'Fabrication', 'How to design parts that go together and come out right. Each technique has an animation, the rules of thumb and a calculator. Start with joining, then designing for the process.',
  `<div class="filterrow"><div class="fl"><span class="fll">Group</span><div class="filters" id="filters" role="group" aria-label="Filter techniques by group"></div></div>
   <div class="fl"><span class="fll">Made by</span><div class="filters" id="pfilters" role="group" aria-label="Filter techniques by how the part is made"></div></div></div>
   <div class="grid" id="grid" data-room="fabrication"></div>`, engine('', fabSlugs, 'fab') + '<script>MM.landing()</script>');
const genSlugs = [...new Set(gens.map(g => g[1]).filter(Boolean))];
const HINGE = (() => { const w = {}; new Function('window', fs.readFileSync(R('js/hinge-pattern.js'), 'utf8'))(w); return w.MN_HINGE; })();
const hingePreview = () => {   // a drawn test piece for the generator card
  const r = HINGE.make({ pat: 'straight', W: 40, H: 46, L: 14, g: 3, d: 2.4, cut: 'line', open: 1, e: 0 }), ox = 30, oy = 7, k = 1.15;
  const X = x => (ox + x * k).toFixed(1), Y = y => (oy + (46 - y) * k).toFixed(1);
  return `<svg class="hprev" viewBox="0 0 160 66" aria-hidden="true"><rect x="${X(-22)}" y="${Y(46)}" width="${(84 * k).toFixed(1)}" height="${(46 * k).toFixed(1)}" rx="1"/>${r.cuts.map(c => `<polyline points="${c.pts.map(q => X(q[0]) + ',' + Y(q[1])).join(' ')}"/>`).join('')}</svg>`;
};
roomPage('generators.html', 'g', 'Room 3', 'Generators', 'Design your own parts, check them for problems, and export files for laser cutting, CNC or 3D printing.',
  `<div class="gens">${gens.map(([id, s, t, d]) => `
      <a class="gencard" href="generators/${id}.html"><div class="gprev">${s ? `<canvas data-s="${s}" data-live data-box aria-hidden="true"></canvas>` : hingePreview()}</div>
        <div class="gtext"><h3>${t}</h3><p>${d}</p><div class="chips"><span>SVG</span><span>DXF</span>${s ? '<span>STL</span>' : ''}</div><span class="go">Open the ${s ? t.split(' ')[0].toLowerCase() : 'living hinge'} generator →</span></div></a>`).join('')}</div>
   <h2 class="subh">Ready-made starting points</h2><p class="subp">These open a generator with the settings already chosen.</p>
   <div class="presets">${PRESETS.map(([id, n, d, pre]) => `<a class="preset" href="${gurl(id, pre)}"><span>${GENS[id][0].replace(' generator', '')}</span><b>${n}</b><small>${d}</small></a>`).join('')}</div>
   <p class="soonline">More generators (springs, Geneva drives, and more) are on the way.</p>`, engine('', genSlugs, 'mechanisms') + '<script>MM.landing()</script>');

/* ----- combine page ----- */
fs.writeFileSync(R('combine.html'), head('Combine mechanisms · Mechanical Notebook', '', 'Chain mechanisms together so the output of one drives the next, and watch the motion that comes out.', 'combine.html') + nav('', 'c') + '<main class="sheet" id="app"></main>' + foot('')
  + tail('', engine('', mech, 'mechanisms') + '<script src="js/recipes.js"></script><script src="js/combine.js"></script><script>MN_COMBINE.mount(document.getElementById("app"), RECIPES)</script>'));

/* ----- about page ----- */
roomPage('requests.html', '', 'Community', 'Requests and ideas', 'Ask for a mechanism or a generator, point out a mistake, or share an idea. Posts are anonymous and public, anyone can comment, and each one is marked when it has been read, planned, fixed or resolved.',
  '<div id="board" class="board"></div>', '<script src="js/board-config.js"></script><script src="js/board.js"></script>');
fs.writeFileSync(R('about.html'), head('About · Mechanical Notebook', '', 'Why Mechanical Notebook was made, who it is for, and how it is made.', 'about.html') + nav('', 'a') + `
<main class="sheet about" id="app">
  <header class="phead"><div class="kicker">About</div><h1 class="title">A notebook of moving parts</h1>
    <p class="lede">Mechanical Notebook is a free, open-source place to see how machines move, play with them, and learn the math behind them.</p></header>
  <div class="aboutgrid" data-gloss>
    <section class="box"><h3>Why it was made</h3>
      <p>This website was created out of a love for finding out how things move. A gear train, a cam or a linkage can turn one simple motion into something surprising, and once you see how it works you start noticing it everywhere: in clocks, toys, bicycles, engines and even in animals.</p>
      <p>Most references show these mechanisms as still drawings, or as finished animations you can only watch. This notebook is meant to let visitors change a length or a tooth count, immediately see what happens, and then check the numbers themselves. When an idea is ready to build, the generators turn it into files for a laser cutter, a CNC machine or a 3D printer.</p></section>
    <section class="box"><h3>Who it is for</h3>
      <p>This website is for:</p>
      <ul class="who">
        <li><b>Anyone curious</b> about how movements are created, with no engineering background needed. Hover the underlined words for plain-language definitions.</li>
        <li><b>Students</b> who want to see the math come alive, with worked practice problems and design challenges.</li>
        <li><b>Makers, artists and designers</b> building kinetic sculptures, automata, robots and prototypes.</li>
        <li><b>Engineers</b> who want a quick, free tool to sketch a mechanism, check it and export it.</li>
      </ul></section>
    <section class="box"><h3>How it is made</h3>
      <p>Every drawing is calculated live in your browser with plain HTML, CSS and JavaScript. There are no accounts and nothing to install. The code is open source under the MIT licence, so you are free to learn from it, use it and improve it.</p>
      <p>The site is inspired by Henry T. Brown's <i>507 Mechanical Movements</i> (1868). All explanations and drawings here are original.</p></section>
  </div>
  <section class="box comingbox"><h3>Coming next</h3><p>More mechanisms, more mechanical elements and more generators are on the way. Have an idea, a request, or found a mistake? Post it on the <a href="requests.html">requests and ideas board</a>. Posts are public and anonymous, anyone can comment, and each one is marked when it has been read, planned, fixed or resolved.</p><p><a class="btn" href="requests.html">Open the requests board →</a></p></section>
</main>` + foot('') + tail(''));

console.log('built', mech.length, 'mechanisms,', elems.length, 'elements, index.html, about.html');
