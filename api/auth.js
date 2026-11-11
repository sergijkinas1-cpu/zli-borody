import { verifyGoogle, makeSessionCookie, clearCookie, getUser, googleClientId, isDevLogin, json, sameOrigin } from '../lib/auth.js';
import { isAdmin, touchAdmin, hasDb } from '../lib/store.js';

export default {
  async fetch(req) {
    try {
      if (!sameOrigin(req)) return json({ error: 'Запит з чужого сайту' }, 403);
      if (req.method === 'GET') {
        const user = await getUser(req).catch(() => null);
        const setup = [];
        if (!googleClientId() && !isDevLogin()) setup.push('GOOGLE_CLIENT_ID');
        if (!hasDb && process.env.VERCEL) setup.push('DATABASE');
        if (!process.env.SESSION_SECRET && process.env.VERCEL) setup.push('SESSION_SECRET');
        return json({ clientId: googleClientId(), devLogin: isDevLogin(), user, setup });
      }
      if (req.method === 'POST') {
        const body = await req.json().catch(() => ({}));
        let u;
        if (isDevLogin() && body.devEmail) u = { email: String(body.devEmail).toLowerCase(), name: 'Локальний вхід', picture: '' };
        else u = await verifyGoogle(String(body.credential || ''));
        if (!(await isAdmin(u.email))) return json({ error: 'no-access', email: u.email }, 403);
        await touchAdmin(u.email, u.name, u.picture);
        return json({ user: u }, 200, { 'Set-Cookie': makeSessionCookie(u) });
      }
      if (req.method === 'DELETE') return json({ ok: true }, 200, { 'Set-Cookie': clearCookie() });
      return json({ error: 'Метод не підтримується' }, 405);
    } catch (e) {
      console.error(e);
      return json({ error: e.message || 'Не вдалося увійти' }, 400);
    }
  },
};
