// Tiny zero-dependency static server. Run: yarn dev  (or: node serve.js)
// Rebuilds the pages first so new mechanism files show up. Port: PORT env var or 5173.
const http = require('http'), fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const root = __dirname, port = process.env.PORT || 5173;
try { execFileSync(process.execPath, [path.join(root, 'build.js')], { stdio: 'inherit' }); } catch (e) { console.warn('build.js failed:', e.message); }
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const file = path.normalize(path.join(root, p));
  if (!file.startsWith(root)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(data);
  });
}).listen(port, () => console.log('\n  Mechanisms running at  http://localhost:' + port + '\n'));
