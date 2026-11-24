// Сервер сайту для Hostinger (і будь-якого Node.js хостингу). Повторює маршрути з vercel.json
// Запуск на сервері  node server.js
// Локально  DEV_LOGIN=1 ADMIN_EMAILS=you@gmail.com node server.js --dev
import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DATA_DIR } from './lib/env.js';

// Без await на верхньому рівні, бо Hostinger (LiteSpeed) підвантажує цей файл через require()
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(ROOT, 'public');
const PORT = Number(process.env.PORT) || 3000;
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon', '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml', '.woff2': 'font/woff2', '.woff': 'font/woff' };

const rewrites = cfg.rewrites.map((r) => {
  const names = [];
  const re = new RegExp('^' + r.source.replace(/[.]/g, '\\.').replace(/:(\w+)/g, (_, n) => { names.push(n); return '([^/]+?)'; }) + '$');
  return { re, names, dest: r.destination };
});
function rewrite(p) {
  for (const r of rewrites) {
    const m = p.match(r.re);
    if (m) { let d = r.dest; r.names.forEach((n, i) => { d = d.replace(':' + n, m[i + 1]); }); return d; }
  }
  return null;
}
// Заголовки з vercel.json, наприклад noindex для адмінки
const headerRules = (cfg.headers || []).map((h) => ({ re: new RegExp('^' + h.source.replace(/\(\.\*\)/g, '(.*)') + '$'), headers: h.headers }));
function extraHeaders(p) {
  const out = {};
  for (const h of headerRules) if (h.re.test(p)) for (const { key, value } of h.headers) out[key] = value;
  return out;
}

// Безпечний шлях усередині папки, без виходу через ..
function inside(base, p) {
  const f = path.join(base, p);
  return f === base || f.startsWith(base + path.sep) ? f : null;
}
async function isFile(f) { try { const st = await fsp.stat(f); return st.isFile() ? st : null; } catch { return null; } }

function sendFile(req, res, f, st, headers) {
  const type = TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream';
  const base = { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Last-Modified': st.mtime.toUTCString(), ...headers };
  if (req.headers['if-modified-since'] && new Date(req.headers['if-modified-since']) >= new Date(st.mtime.toUTCString())) {
    res.writeHead(304, base); return res.end();
  }
  // Відео в Safari вантажиться шматками, тому підтримуємо Range
  const range = req.headers.range && /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
  if (range) {
    let start = range[1] ? Number(range[1]) : st.size - Number(range[2]);
    let end = range[1] && range[2] ? Number(range[2]) : st.size - 1;
    if (start < 0) start = 0;
    if (start >= st.size || end < start) { res.writeHead(416, { 'Content-Range': `bytes */${st.size}` }); return res.end(); }
    end = Math.min(end, st.size - 1);
    res.writeHead(206, { ...base, 'Content-Range': `bytes ${start}-${end}/${st.size}`, 'Content-Length': end - start + 1 });
    if (req.method === 'HEAD') return res.end();
    return fs.createReadStream(f, { start, end }).pipe(res);
  }
  res.writeHead(200, { ...base, 'Content-Length': st.size });
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(f).pipe(res);
}

const mods = new Map();
async function api(name) {
  if (!/^[a-z-]+$/.test(name)) return null;
  if (!mods.has(name)) {
    const f = path.join(ROOT, 'api', name + '.js');
    if (!(await isFile(f))) return null;
    mods.set(name, (await import(f)).default);
  }
  return mods.get(name);
}

const cacheFor = (p) => p.startsWith('/admin') ? 'no-cache' : /\.(jpe?g|png|webp|avif|gif|svg|mp4|webm|woff2?)$/i.test(p) ? 'public, max-age=604800' : 'public, max-age=300';

http.createServer(async (req, res) => {
  try {
    const proto = String(req.headers['x-forwarded-proto'] || 'http').split(',')[0].trim();
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
    const u = new URL(req.url, `${proto}://${host}`);
    let p;
    try { p = decodeURIComponent(u.pathname); } catch { res.writeHead(400); return res.end('Bad request'); }

    if (req.method === 'GET' || req.method === 'HEAD') {
      // Фото і відео, завантажені через адмінку
      if (p.startsWith('/uploads/')) {
        const f = inside(path.join(DATA_DIR, 'uploads'), p.slice('/uploads/'.length));
        const st = f && await isFile(f);
        if (st) return sendFile(req, res, f, st, { 'Cache-Control': 'public, max-age=31536000, immutable' });
      }
      const f = inside(PUBLIC, p);
      const st = f && await isFile(f);
      if (st) return sendFile(req, res, f, st, { 'Cache-Control': cacheFor(p), ...extraHeaders(p) });
    }

    const rw = rewrite(p);
    if (rw && !rw.startsWith('/api/')) {
      const f = inside(PUBLIC, rw);
      const st = f && await isFile(f);
      if (st) return sendFile(req, res, f, st, { 'Cache-Control': cacheFor(rw), ...extraHeaders(p) });
    }
    const target = rw ? new URL(rw, u) : u;
    if (rw) u.searchParams.forEach((v, k) => { if (!target.searchParams.has(k)) target.searchParams.set(k, v); });
    const m = target.pathname.match(/^\/api\/([a-z-]+)$/);
    const mod = m && await api(m[1]);
    if (!mod) {
      const nf = await api('page');
      const r = await nf.fetch(new Request(new URL('/api/page?p=post&slug=__missing__', u), { headers: req.headers }));
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end(Buffer.from(await r.arrayBuffer()));
    }
    const chunks = []; for await (const c of req) chunks.push(c);
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) if (v != null) headers.set(k, Array.isArray(v) ? v.join(', ') : v);
    const request = new Request(target.href, { method: req.method, headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks) });
    const r = await mod.fetch(request);
    const out = {};
    r.headers.forEach((v, k) => { if (!/^vercel-/i.test(k)) out[k] = v; });
    const setCookie = r.headers.getSetCookie?.();
    if (setCookie?.length) out['set-cookie'] = setCookie;
    Object.assign(out, extraHeaders(p));
    res.writeHead(r.status, out);
    res.end(req.method === 'HEAD' ? undefined : Buffer.from(await r.arrayBuffer()));
  } catch (e) {
    console.error(e);
    if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Помилка сервера');
  }
}).listen(PORT, () => console.log(`Злі Бороди працюють на порту ${PORT}, дані в ${DATA_DIR}`));
