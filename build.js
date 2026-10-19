// Generates index.html and pages/<slug>.html for every js/mechanisms/<slug>.js that exists.
const fs = require('fs'), path = require('path');
const slugs = fs.readdirSync(path.join(__dirname, 'js/mechanisms')).filter(f => f.endsWith('.js')).map(f => f.replace('.js', ''));
const head = (t, p) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${t}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${p}css/style.css"></head><body><div class="sheet" id="app">`;
const scripts = (p, extra) => `</div><script src="${p}js/catalog.js"></script><script src="${p}js/engine.js"></script>${extra}`;
slugs.forEach(s => fs.writeFileSync(path.join(__dirname, 'pages', s + '.html'),
  head('Mechanism', '../') + scripts('../', slugs.map(x => `<script src="../js/mechanisms/${x}.js"></script>`).join('') + `<script>MM.mount('${s}')</script></body></html>`)));
fs.writeFileSync(path.join(__dirname, 'index.html'), head('Mechanisms', '') + `
<div class="topbar"><span>Mechanisms</span><span>${slugs.length} animated</span></div>
<div class="hero"><div class="kicker">Moving drawings</div><h1 class="title">Mechanisms</h1>
<p>Pick a mechanism to see it move, scrub its crank, and read its motion graph. Hover a card to preview.</p></div>
<div class="filters" id="filters"></div><div class="grid" id="grid"></div>
<div class="foot">Inspired by 507movements.com and the StudioR mechanism drawings.<br>Plain HTML, CSS and JavaScript. No build step needed to view: open index.html.</div>`
  + scripts('', slugs.map(x => `<script src="js/mechanisms/${x}.js"></script>`).join('') + `<script>MM.landing()</script></body></html>`));
console.log('built', slugs.join(', '));
