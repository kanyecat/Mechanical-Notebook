// Builds every page: index.html, about.html, pages/<slug>.html (mechanisms) and elements/<slug>.html (mechanical elements).
// Run `node build.js` after adding a file to js/mechanisms or js/elements, or after changing the text in this file.
const fs = require('fs'), path = require('path');
const R = (...p) => path.join(__dirname, ...p);
const list = dir => fs.existsSync(R(dir)) ? fs.readdirSync(R(dir)).filter(f => f.endsWith('.js')).map(f => f.replace('.js', '')) : [];
const order = (slugs, key) => { const src = fs.readFileSync(R('js/catalog.js'), 'utf8'), at = s => src.indexOf(`slug: '${s}'`); return slugs.slice().sort((a, b) => at(a) - at(b)); };
const mech = order(list('js/mechanisms')), elems = order(list('js/elements')), mathSlugs = list('js/math');
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
    <a href="${p}index.html#mechanisms"${here === 'm' ? ' aria-current="page"' : ''}>Mechanisms</a>
    <a href="${p}index.html#elements"${here === 'e' ? ' aria-current="page"' : ''}>Elements</a>
    <div class="dd"><button type="button" class="ddb" aria-expanded="false" aria-haspopup="true">Generators ${chev}</button>
      <div class="ddm">
        <a href="${p}generators/gears.html"><b>Gear generator</b><span>Spur, ring and rack gears, gear trains</span></a>
        <a href="${p}generators/linkages.html"><b>Linkage generator</b><span>Four-bar, slider crank, multi-link</span></a>
        <a href="${p}generators/cams.html"><b>Cam generator</b><span>Motion programs, followers, checks</span></a>
        <a href="${p}generators/pulleys.html"><b>Pulley generator</b><span>Belt drives, idlers, lifting tackle</span></a>
        <a href="${p}generators/chains.html"><b>Chain and sprocket generator</b><span>Roller chain, sprockets, multi-stage drives</span></a>
      </div></div>
    <a href="${p}about.html"${here === 'a' ? ' aria-current="page"' : ''}>About</a>
  </nav>
  <span class="navr"><span data-theme-picker></span>
  <button type="button" class="menub" aria-expanded="false" aria-controls="navlinks" aria-label="Open menu"><svg viewBox="0 0 24 24" aria-hidden="true"><path class="m1" d="M4 7h16"/><path class="m2" d="M4 12h16"/><path class="m3" d="M4 17h16"/></svg></button></span>
</div></header>`;

const foot = p => `<footer class="foot"><div class="footin">
  <div class="fcol fabout"><div class="fbrand">Mechanical <b>Notebook</b></div>
    <p>A free, open notebook of moving parts. Watch them move, change them, and work out the numbers.</p>
    <p class="fsmall">Made by Joo Hee Kim · <a href="${p}about.html">About this site</a></p></div>
  <div class="fcol"><h4>Explore</h4>
    <a href="${p}index.html#mechanisms">Mechanisms</a><a href="${p}index.html#elements">Mechanical elements</a>
    <a href="${p}generators/gears.html">Gear generator</a><a href="${p}generators/linkages.html">Linkage generator</a><a href="${p}generators/cams.html">Cam generator</a><a href="${p}generators/pulleys.html">Pulley generator</a><a href="${p}generators/chains.html">Chain generator</a></div>
  <div class="fcol"><h4>Project</h4>
    <a href="${REPO}" rel="noopener">Source code on GitHub</a><span>Free and open source (MIT licence)</span>
    <span>Inspired by <i>507 Mechanical Movements</i> by Henry T. Brown (1868)</span><span>Visits are counted with Google Analytics</span></div>
</div><div class="fbase"><span>© ${new Date().getFullYear()} Joo Hee Kim</span><span>More mechanisms, elements and generators are on the way.</span></div></footer>`;

const tail = (p, scripts) => `<script src="${p}js/glossary.js"></script><script src="${p}js/site.js"></script>${scripts || ''}</body></html>`;
const engine = (p, slugs, dir) => `<script src="${p}js/catalog.js"></script><script src="${p}js/engine.js"></script>`
  + slugs.map(x => `<script src="${p}js/${dir}/${x}.js"></script>`).join('');

/* ----- mechanism and element pages ----- */
function detail(slug, dir, folder, here) {
  const extra = (fs.existsSync(R('js/learn.js')) ? '<script src="../js/learn.js"></script>' : '') + (mathSlugs.includes(slug) ? `<script src="../js/math/${slug}.js"></script>` : '');
  fs.mkdirSync(R(folder), { recursive: true });
  fs.writeFileSync(R(folder, slug + '.html'), head('Mechanical Notebook', '../', null, `${folder}/${slug}.html`) + nav('../', here) + '<main class="sheet" id="app"></main>' + foot('../')
    + tail('../', engine('../', dir === 'mechanisms' ? mech : elems, dir) + extra + `<script>MM.mount('${slug}')</script>`));
}
mech.forEach(s => detail(s, 'mechanisms', 'pages', 'm'));
elems.forEach(s => detail(s, 'elements', 'elements', 'e'));

/* ----- home page ----- */
const gens = [
  ['gears', 'spur-gears', 'Gear generator', 'Spur gears, ring gears and racks with true involute teeth. Connect as many gears as you like into a train and watch them turn.'],
  ['linkages', 'four-bar', 'Linkage generator', 'Four-bar and slider-crank linkages, or build your own multi-link mechanism and trace the path of any point.'],
  ['cams', 'cam-follower', 'Cam generator', 'Program a motion step by step, choose a follower, and check the pressure angle and undercut before you cut.'],
  ['pulleys', 'belt-pulleys', 'Pulley generator', 'Place pulleys anywhere, join them with belts and hang loads on them, or rig a block and tackle. See speeds, grip and whether it can lift.'],
  ['chains', 'roller-chain', 'Chain and sprocket generator', 'Roller chain and sprockets in ANSI and ISO sizes. Place sprockets anywhere, run several chains, pick skeleton or swirl sprockets and cut every part.']
];
fs.writeFileSync(R('index.html'), head('Mechanical Notebook: how machines move, and the math behind them', '', null, '') + nav('', 'h') + `
<main class="sheet home" id="app">
  <section class="hero">
    <div class="heromain">
      <div class="kicker">How machines move, and the math behind them</div>
      <h1 class="title">Mechanical Notebook</h1>
      <p class="lede" data-gloss>Watch mechanisms and machine parts move, change their sizes, and work out the real numbers: speeds, ratios, forces and strokes. Then design your own with the generators and export files to make them.</p>
      <div class="cta"><a class="btn" href="#mechanisms">Browse mechanisms</a><a class="btn ghost" href="#generators">Design with a generator</a></div>
    </div>
    <nav class="toc" aria-label="Contents"><div class="toch">Contents</div><ol>
      <li><a href="#generators"><span class="tn">01</span><span class="tt">Generators<small>Design and export parts</small></span><span class="tc">${gens.length}</span></a></li>
      <li><a href="#mechanisms"><span class="tn">02</span><span class="tt">Mechanisms<small>How motion is changed</small></span><span class="tc">${mech.length}</span></a></li>
      <li><a href="#elements"><span class="tn">03</span><span class="tt">Mechanical elements<small>The parts that hold machines together</small></span><span class="tc">${elems.length}</span></a></li>
      <li><a href="about.html"><span class="tn">04</span><span class="tt">About<small>Who made this and why</small></span><span class="tc">→</span></a></li>
    </ol></nav>
  </section>

  <section id="generators" class="sec">
    <header class="sech"><span class="secn">01</span><div><h2>Generators</h2><p>Design your own parts, check them for problems, and export files for laser cutting, CNC or 3D printing.</p></div></header>
    <div class="gens">${gens.map(([id, s, t, d]) => `
      <a class="gencard" href="generators/${id}.html"><div class="gprev"><canvas data-s="${s}" data-live data-box aria-hidden="true"></canvas></div>
        <div class="gtext"><h3>${t}</h3><p>${d}</p><div class="chips"><span>SVG</span><span>DXF</span><span>STL</span></div><span class="go">Open the ${t.split(' ')[0].toLowerCase()} generator →</span></div></a>`).join('')}
    </div>
    <p class="soonline">More generators (springs, Geneva drives, and more) are on the way.</p>
  </section>

  <section id="mechanisms" class="sec">
    <header class="sech"><span class="secn">02</span><div><h2>Mechanisms</h2><p>Each page has a moving drawing you can change, a step-by-step explanation, a motion graph, and a calculator with practice problems.</p></div></header>
    <div class="filters" id="filters" role="group" aria-label="Filter mechanisms by category"></div>
    <div class="grid" id="grid"></div>
  </section>

  <section id="elements" class="sec">
    <header class="sech"><span class="secn">03</span><div><h2>Mechanical elements</h2><p>Bearings, fasteners, springs and the other everyday parts that hold machines together: how they work, how to choose them, and how to size them.</p></div></header>
    <div class="grid" id="egrid"></div>
  </section>
</main>` + foot('') + tail('', engine('', mech, 'mechanisms') + elems.map(x => `<script src="js/elements/${x}.js"></script>`).join('') + '<script>MM.landing()</script>'));

/* ----- about page ----- */
fs.writeFileSync(R('about.html'), head('About · Mechanical Notebook', '', 'Who made Mechanical Notebook, why, and who it is for.', 'about.html') + nav('', 'a') + `
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
    <section class="box"><h3>Who made it</h3>
      <p>This website was created by <b>Joo Hee Kim</b>. Joo Hee studied at Carnegie Mellon University, where she earned a Bachelor of Engineering Studies and Arts (BESA) in Mechanical Engineering and Art, with a minor in Physical Computing.</p>
      <p>The site brings those two sides together: the precision of engineering and the clear, hands-on way an artist explains things.</p>
      <p>Portfolio: <a href="https://www.jooheekim.art" target="_blank" rel="noopener">jooheekim.art</a></p>
    </section>
    <section class="box"><h3>How it is made</h3>
      <p>Every drawing is calculated live in your browser with plain HTML, CSS and JavaScript. There are no accounts and nothing to install. The code is open source under the MIT licence, so you are free to learn from it, use it and improve it.</p>
      <p>The site is inspired by Henry T. Brown's <i>507 Mechanical Movements</i> (1868). All explanations and drawings here are original.</p></section>
  </div>
  <section class="box comingbox"><h3>Coming next</h3><p>More mechanisms, more mechanical elements and more generators are on the way. Have an idea or found a mistake? Send Joo Hee an email at <a href="mailto:jooheeki@alumni.cmu.edu">jooheeki@alumni.cmu.edu</a>.</p></section>
</main>` + foot('') + tail(''));

console.log('built', mech.length, 'mechanisms,', elems.length, 'elements, index.html, about.html');
