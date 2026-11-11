// Вхід через Google і сесія адміна в підписаній cookie
import crypto from 'node:crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { isAdmin } from './store.js';

const COOKIE = 'zb_admin';
const TTL = 60 * 60 * 24 * 7; // тиждень
const GOOGLE_JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
export const googleClientId = () => (process.env.GOOGLE_CLIENT_ID || '').trim();
export const isDevLogin = () => !process.env.VERCEL && process.env.DEV_LOGIN === '1';

function secret() {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 16) return s;
  if (!process.env.VERCEL) return 'dev-secret-only-for-local-testing';
  throw new Error('SESSION_SECRET не задано');
}
const b64 = (b) => Buffer.from(b).toString('base64url');
const sign = (data) => crypto.createHmac('sha256', secret()).update(data).digest('base64url');

export function makeSessionCookie(user) {
  const payload = b64(JSON.stringify({ email: user.email, name: user.name || '', picture: user.picture || '', exp: Math.floor(Date.now() / 1000) + TTL }));
  const v = `${payload}.${sign(payload)}`;
  return `${COOKIE}=${v}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${TTL}${process.env.VERCEL ? '; Secure' : ''}`;
}
export const clearCookie = () => `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${process.env.VERCEL ? '; Secure' : ''}`;

function readCookie(req) {
  const raw = req.headers.get('cookie') || '';
  const m = raw.split(/;\s*/).find((c) => c.startsWith(COOKIE + '='));
  return m ? m.slice(COOKIE.length + 1) : '';
}

export async function verifyGoogle(credential) {
  const aud = googleClientId();
  if (!aud) throw new Error('GOOGLE_CLIENT_ID не задано');
  const { payload } = await jwtVerify(credential, GOOGLE_JWKS, { audience: aud, issuer: ['https://accounts.google.com', 'accounts.google.com'] });
  if (!payload.email || payload.email_verified === false) throw new Error('Пошта Google не підтверджена');
  return { email: String(payload.email).toLowerCase(), name: payload.name || '', picture: payload.picture || '' };
}

// Повертає адміна або null. Права перевіряються в базі на кожен запит
export async function getUser(req) {
  const v = readCookie(req);
  if (!v) return null;
  const [payload, sig] = v.split('.');
  if (!payload || !sig) return null;
  const good = sign(payload);
  if (good.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(good), Buffer.from(sig))) return null;
  let u; try { u = JSON.parse(Buffer.from(payload, 'base64url').toString()); } catch { return null; }
  if (!u.exp || u.exp < Date.now() / 1000) return null;
  if (!(await isAdmin(u.email))) return null;
  return u;
}

// Захист від підроблених запитів з інших сайтів
export function sameOrigin(req) {
  if (req.method === 'GET' || req.method === 'HEAD') return true;
  const o = req.headers.get('origin');
  if (!o) return true; // SameSite=Strict уже не пускає чужі cookie
  try { return new URL(o).host === new URL(req.url).host || new URL(o).host === req.headers.get('x-forwarded-host') || new URL(o).host === req.headers.get('host'); } catch { return false; }
}

export const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers } });

// Обгортка для захищених API
export function guarded(handler) {
  return async (req) => {
    try {
      if (!sameOrigin(req)) return json({ error: 'Запит з чужого сайту' }, 403);
      const user = await getUser(req);
      if (!user) return json({ error: 'Потрібно увійти' }, 401);
      return await handler(req, user);
    } catch (e) {
      console.error(e);
      return json({ error: e.message || 'Помилка сервера' }, 500);
    }
  };
}
