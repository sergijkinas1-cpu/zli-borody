import { renderHome, renderBlog, renderPost, render404 } from './render.js';

// Шлях сторінки в HTML. Використовується і сайтом, і переглядом в адмінці
export function renderPath(content, rawPath, opts = {}) {
  const u = new URL(rawPath || '/', 'http://x');
  const p = u.pathname.replace(/\/index\.html$/, '/').replace(/\.html$/, '').replace(/\/+$/, '') || '/';
  if (p === '/') return { status: 200, html: renderHome(content, opts) };
  if (p === '/blog') return { status: 200, html: renderBlog(content, { ...opts, page: Number(u.searchParams.get('page')) || 1 }) };
  const m = p.match(/^\/blog\/([a-z0-9-]+)$/);
  if (m) { const html = renderPost(content, m[1], opts); if (html) return { status: 200, html }; }
  return { status: 404, html: render404(content, opts) };
}
