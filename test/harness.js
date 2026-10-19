// Node harness: loads engine pieces with stubs, runs each mechanism's draw()/graph over many angles, flags NaN/exceptions.
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const slugs = process.argv.slice(2);
const files = slugs.length ? slugs : fs.readdirSync(path.join(root, 'js/mechanisms')).map(f => f.replace('.js', ''));
let bad = 0;
for (const slug of files) {
  const calls = { n: 0, nan: 0 };
  const ctxStub = new Proxy({}, { get: (t, k) => (k === 'canvas' ? {} : (...args) => { args.forEach(v => { if (typeof v === 'number' && !isFinite(v)) calls.nan++; if (Array.isArray(v)) v.forEach(x => { if (typeof x === 'number' && !isFinite(x)) calls.nan++; }); }); }), set: () => true });
  const window = {}; const sandbox = { window, Math, console, performance: { now: () => 0 }, document: {} };
  vm.createContext(sandbox);
  const eng = fs.readFileSync(path.join(root, 'js/engine.js'), 'utf8');
  vm.runInContext(eng, sandbox);
  vm.runInContext('var MM = window.MM;', sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, 'js/catalog.js'), 'utf8'), sandbox);
  try { vm.runInContext(fs.readFileSync(path.join(root, 'js/mechanisms', slug + '.js'), 'utf8'), sandbox); } catch (e) { console.log(slug, 'LOAD ERROR', e.message); bad++; continue; }
  const m = window.MM.registry[slug]; if (!m) { console.log(slug, 'NOT REGISTERED'); bad++; continue; }
  const P = {}; (m.params || []).forEach(q => P[q.key] = q.value);
  const per = m.period || Math.PI * 2; let err = null;
  const variants = [P]; (m.params || []).forEach(q => { variants.push(Object.assign({}, P, { [q.key]: q.min })); variants.push(Object.assign({}, P, { [q.key]: q.max })); });
  try {
    for (const PP of variants) for (let i = 0; i <= 720; i++) {
      const a = i / 720 * per * 2 - per * 0.5, g = new window.MM.Gfx(ctxStub, m.view); g.state = {};
      m.draw(g, a, PP);
      if (m.graph) { m.graph.series.forEach(se => { const y = se.f(a, PP); if (!isFinite(y)) calls.nan++; }); if (m.graph.readout) m.graph.readout(a, PP); }
    }
  } catch (e) { err = e; }
  const extra = m._onGround ? ' onGround=' + (m._onGround * 100).toFixed(0) + '%' : '';
  const ok = !err && !calls.nan; if (!ok) bad++;
  console.log((ok ? 'ok  ' : 'FAIL') + ' ' + slug + (err ? ' ERR: ' + err.stack.split('\n').slice(0, 3).join(' | ') : '') + (calls.nan ? ' NaN args: ' + calls.nan : '') + extra);
}
process.exit(bad ? 1 : 0);
