// Локальний сервер для розробки. Імітує маршрути Vercel із vercel.json
// Запуск  DEV_LOGIN=1 ADMIN_EMAILS=you@gmail.com node dev-server.js
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';

const PORT = Number(process.env.PORT) || 3000;
const ROOT = process.cwd();
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.mp4': 'video/mp4', '.webm': 'video/webm', '.txt': 'text/plain' };
const cfg = JSON.parse(await fs.readFile(path.join(ROOT, 'vercel.json'), 'utf8'));

function rewrite(p) {
  for (const r of cfg.rewrites) {
    const names = [];
    const re = new RegExp('^' + r.source.replace(/[.]/g, '\\.').replace(/:(\w+)/g, (_, n) => { names.push(n); return '([^/]+?)'; }) + '$');
    const m = p.match(re);
    if (m) { let d = r.destination; names.forEach((n, i) => { d = d.replace(':' + n, m[i + 1]); }); return d; }
  }
  return null;
}
async function file(p) { try { const st = await fs.stat(p); return st.isFile() ? p : null; } catch { return null; } }

http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, `http://${req.headers.host}`);
    let p = decodeURIComponent(u.pathname);
    let f = await file(path.join(ROOT, 'public', p));
    if (!f && p.startsWith('/uploads/')) f = await file(path.join(ROOT, '.data', p));
    if (f) { res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); return res.end(await fs.readFile(f)); }
    const rw = rewrite(p);
    if (rw && !rw.startsWith('/api/')) {
      const f2 = await file(path.join(ROOT, 'public', rw));
      if (f2) { res.writeHead(200, { 'Content-Type': TYPES[path.extname(f2)] }); return res.end(await fs.readFile(f2)); }
    }
    let target = rw ? new URL(rw, u) : u;
    if (rw) u.searchParams.forEach((v, k) => { if (!target.searchParams.has(k)) target.searchParams.set(k, v); });
    const m = target.pathname.match(/^\/api\/([a-z-]+)$/);
    if (!m) { res.writeHead(404); return res.end('Not found'); }
    const mod = (await import(path.join(ROOT, 'api', m[1] + '.js') + '?t=' + Date.now())).default;
    const chunks = []; for await (const c of req) chunks.push(c);
    const body = chunks.length ? Buffer.concat(chunks) : undefined;
    const request = new Request(target.href, { method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : body });
    const r = await mod.fetch(request);
    const headers = {}; r.headers.forEach((v, k) => { headers[k] = v; });
    res.writeHead(r.status, headers);
    res.end(Buffer.from(await r.arrayBuffer()));
  } catch (e) { console.error(e); res.writeHead(500); res.end(String(e.stack || e)); }
}).listen(PORT, () => console.log(`http://localhost:${PORT}`));
