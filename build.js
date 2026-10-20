// Generates index.html and pages/<slug>.html for every js/mechanisms/<slug>.js that exists.
const fs = require('fs'), path = require('path');
const slugs = fs.readdirSync(path.join(__dirname, 'js/mechanisms')).filter(f => f.endsWith('.js')).map(f => f.replace('.js', ''));
const head = (t, p) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${t}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${p}css/style.css"></head><body><div class="sheet" id="app">`;
const mathSlugs = fs.existsSync(path.join(__dirname, 'js/math')) ? fs.readdirSync(path.join(__dirname, 'js/math')).filter(f => f.endsWith('.js')).map(f => f.replace('.js', '')) : [];
const scripts = (p, extra) => `</div><script src="${p}js/catalog.js"></script><script src="${p}js/engine.js"></script>${extra}`;
slugs.forEach(s => fs.writeFileSync(path.join(__dirname, 'pages', s + '.html'),
  head('Moving Parts', '../') + scripts('../', slugs.map(x => `<script src="../js/mechanisms/${x}.js"></script>`).join('')
    + (fs.existsSync(path.join(__dirname, 'js/learn.js')) ? '<script src="../js/learn.js"></script>' : '')
    + (mathSlugs.includes(s) ? `<script src="../js/math/${s}.js"></script>` : '') + `<script>MM.mount('${s}')</script></body></html>`)));
fs.writeFileSync(path.join(__dirname, 'index.html'), head('Moving Parts', '') + `
<div class="topbar"><span>Moving Parts</span><span>${slugs.length} mechanisms</span></div>
<div class="hero"><div class="kicker">How machines move, and the math behind them</div><h1 class="title">Moving Parts</h1>
<p>Pick a mechanism to watch it move, change its size, and work out the numbers: speeds, ratios, forces and strokes. Hover a card to preview.</p>
<div class="genlinks"><span>Generators</span><a href="generators/gears.html">Gears →</a><a href="generators/linkages.html">Linkages →</a><a href="generators/cams.html">Cams →</a></div></div>
<div class="filters" id="filters"></div><div class="grid" id="grid"></div>
<div class="foot">Inspired by 507movements.com and the StudioR mechanism drawings.<br>Plain HTML, CSS and JavaScript. No build step needed to view: open index.html.</div>`
  + scripts('', slugs.map(x => `<script src="js/mechanisms/${x}.js"></script>`).join('') + `<script>MM.landing()</script></body></html>`));
console.log('built', slugs.join(', '));
