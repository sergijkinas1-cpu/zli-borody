import { getPublished } from '../lib/store.js';
import { renderPath } from '../lib/pages.js';
import { pageHeaders } from '../lib/cache.js';
import { DEFAULTS, normalize } from '../lib/store.js';

export default {
  async fetch(req) {
    const u = new URL(req.url);
    const origin = `https://${req.headers.get('x-forwarded-host') || u.host}`;
    const p = u.searchParams.get('p') || 'home';
    const path = p === 'blog' ? '/blog' + (u.searchParams.get('page') ? `?page=${u.searchParams.get('page')}` : '')
      : p === 'post' ? '/blog/' + (u.searchParams.get('slug') || '') : '/';
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
