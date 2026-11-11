import { guarded, json } from '../lib/auth.js';
import { listAdmins, addAdmin, removeAdmin, ownerEmails } from '../lib/store.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export default {
  fetch: guarded(async (req, user) => {
    if (req.method === 'GET') return json({ items: await listAdmins(), me: user.email });
    if (req.method === 'POST') {
      const email = String((await req.json()).email || '').trim().toLowerCase();
      if (!EMAIL.test(email)) return json({ error: 'Перевірте адресу пошти' }, 400);
      await addAdmin(email, user.email);
      return json({ items: await listAdmins() });
    }
    if (req.method === 'DELETE') {
      const email = String(new URL(req.url).searchParams.get('email') || '').toLowerCase();
      if (email === user.email) return json({ error: 'Себе видалити не можна' }, 400);
      if (ownerEmails().includes(email)) return json({ error: 'Це власник сайту, його можна прибрати лише в налаштуваннях Vercel' }, 400);
      await removeAdmin(email);
      return json({ items: await listAdmins() });
    }
    return json({ error: 'Метод не підтримується' }, 405);
  }),
};
