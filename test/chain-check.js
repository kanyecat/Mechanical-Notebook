// Checks that consecutive chain links are one pitch apart for a range of sprocket sizes
const fs = require('fs'), path = require('path'), vm = require('vm'), root = path.join(__dirname, '..');
const window = {}, sb = { window, Math, console, performance: { now: () => 0 }, document: {} };
vm.createContext(sb); vm.runInContext(fs.readFileSync(path.join(root, 'js/engine.js'), 'utf8') + ';var MM=window.MM;', sb);
vm.runInContext(fs.readFileSync(path.join(root, 'js/mechanisms/roller-chain.js'), 'utf8'), sb);
const m = window.MM.registry['roller-chain'], bars = [];
window.MM.Gfx.prototype.bar = function (x1, y1, x2, y2) { bars.push(Math.hypot(x2 - x1, y2 - y1)); };
const stub = new Proxy({}, { get: () => () => {}, set: () => true });
let worst = 0;
for (const [n1, n2] of [[9, 9], [14, 28], [30, 9], [9, 40], [30, 40], [20, 20], [12, 33]]) {
  bars.length = 0; const g = new window.MM.Gfx(stub, m.view); m.draw(g, 1.234, { n1, n2 });
  const mn = Math.min(...bars), mx = Math.max(...bars); worst = Math.max(worst, Math.abs(mx - 34), Math.abs(mn - 34));
  console.log(n1, n2, 'links', bars.length, 'chord min/max', mn.toFixed(2), mx.toFixed(2));
}
console.log(worst < 1.2 ? 'ok' : 'CHECK');
