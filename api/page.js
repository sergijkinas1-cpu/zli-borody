import { getPublished } from '../lib/store.js';
import { renderPath } from '../lib/pages.js';
import { renderSitemap, renderRobots } from '../lib/render.js';
import { pageHeaders } from '../lib/cache.js';
import { DEFAULTS, normalize } from '../lib/store.js';

export default {
  async fetch(req) {
    const u = new URL(req.url);
    // Головна адреса сайту для Google (canonical, карта сайту, robots). Прев'ю на Vercel і локальний запуск беруть свою адресу
    const host = req.headers.get('x-forwarded-host') || u.host;
    const origin = process.env.SITE_URL || (/\.vercel\.app$|^localhost|^127\./.test(host) ? `https://${host}` : 'https://angrybeards.com.ua');
    const p = u.searchParams.get('p') || 'home';
    if (p === 'robots') return new Response(renderRobots(origin), { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
    if (p === 'sitemap') {
      let content;
      try { ({ content } = await getPublished()); } catch { content = normalize(DEFAULTS); }
      return new Response(renderSitemap(content, origin), { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
    }
    const path = p === 'blog' ? '/blog' + (u.searchParams.get('page') ? `?page=${u.searchParams.get('page')}` : '')
      : p === 'post' ? '/blog/' + (u.searchParams.get('slug') || '')
      : p === 'privacy' ? '/privacy' : p === 'oferta' ? '/oferta' : '/';
    try {
      const { content } = await getPublished();
      const { status, html } = renderPath(content, path, { origin });
      return new Response(html, { status, headers: status === 200 ? pageHeaders : { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    } catch (e) {
      // База недоступна. Показуємо сайт із контентом за замовчуванням, але не кешуємо
      console.error(e);
      const r = renderPath(normalize(DEFAULTS), path, { origin });
      return new Response(r.html, { status: r.status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    }
  },
};
