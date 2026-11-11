import { guarded } from '../lib/auth.js';
import { normalize } from '../lib/store.js';
import { renderPath } from '../lib/pages.js';

export default {
  fetch: guarded(async (req) => {
    const { content, path } = await req.json();
    const { html } = renderPath(normalize(content), path || '/', { preview: true });
    return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
  }),
};
