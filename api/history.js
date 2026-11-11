import { guarded, json } from '../lib/auth.js';
import { listHistory, getVersion, publish } from '../lib/store.js';
import { purgePages } from '../lib/cache.js';

export default {
  fetch: guarded(async (req, user) => {
    const id = new URL(req.url).searchParams.get('id');
    if (req.method === 'GET') {
      if (id) { const v = await getVersion(id); return v ? json(v) : json({ error: 'Версію не знайдено' }, 404); }
      return json({ items: await listHistory() });
    }
    if (req.method === 'POST') {
      const { id: vid } = await req.json();
      const v = await getVersion(vid);
      if (!v) return json({ error: 'Версію не знайдено' }, 404);
      const d = new Date(v.at).toLocaleString('uk-UA', { timeZone: 'Europe/Kyiv', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
      const rec = await publish(v.content, user.email, `Відкат до версії від ${d}`);
      await purgePages();
      return json({ published: rec });
    }
    return json({ error: 'Метод не підтримується' }, 405);
  }),
};
