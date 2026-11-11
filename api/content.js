import { guarded, json } from '../lib/auth.js';
import { getPublished, getDraft, saveDraft, dropDraft, publish } from '../lib/store.js';
import { purgePages } from '../lib/cache.js';

export default {
  fetch: guarded(async (req, user) => {
    if (req.method === 'GET') {
      const [pub, draft] = await Promise.all([getPublished(), getDraft()]);
      return json({ published: pub, draft });
    }
    if (req.method === 'PUT') {
      const { content } = await req.json();
      const d = await saveDraft(content, user.email);
      return json({ at: d.at });
    }
    if (req.method === 'POST') {
      const { content, note } = await req.json();
      const rec = await publish(content, user.email, String(note || '').slice(0, 200));
      await purgePages();
      return json({ published: rec });
    }
    if (req.method === 'DELETE') { await dropDraft(); return json({ ok: true }); }
    return json({ error: 'Метод не підтримується' }, 405);
  }),
};
