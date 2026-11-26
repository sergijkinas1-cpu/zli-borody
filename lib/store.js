// Сховище контенту. На Hostinger і локально це JSON-файли в папці даних (DATA_DIR/cms),
// на Vercel приватний Blob або Upstash Redis
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { normalizeContent } from './sanitize.js';
import { DATA_DIR, onVercel } from './env.js';

const defaults = createRequire(import.meta.url)('./defaults.json');

const R_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const R_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
const hasRedis = Boolean(R_URL && R_TOKEN);
// Без Redis дані лежать у приватному сховищі Vercel Blob як JSON-файли
const B_TOKEN = process.env.CMS_BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN || '';
const hasBlob = !hasRedis && Boolean(B_TOKEN);
// Поза Vercel дані завжди лежать у файлах на диску сервера
const hasFiles = !hasRedis && !hasBlob && !onVercel;
export const hasDb = hasRedis || hasBlob || hasFiles;
const P = process.env.CMS_PREFIX || 'zb:';
const HISTORY_MAX = 50;

async function redis(...cmd) {
  const r = await fetch(R_URL, { method: 'POST', headers: { Authorization: `Bearer ${R_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(cmd), cache: 'no-store' });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error('Redis ' + (j.error || r.status));
  return j.result;
}

const BIG = new Set(['published', 'draft']);
const bPath = (k) => `cms/${k.replace(':', '/')}.json`;
const memo = new Map(); // короткий кеш у пам'яті функції, щоб не читати сховище на кожен запит
const MEMO_MS = 15000;
async function bRead(k) {
  const m = memo.get(k);
  if (m && !BIG.has(k) && !k.startsWith('ver:') && Date.now() - m.t < MEMO_MS) return m.v;
  const { get } = await import('@vercel/blob');
  const r = await get(bPath(k), { access: 'private', useCache: false, token: B_TOKEN });
  const v = r && r.statusCode === 200 ? JSON.parse(await new Response(r.stream).text()) : null;
  memo.set(k, { v, t: Date.now() });
  return v;
}
async function bWrite(k, v) {
  const { put, del } = await import('@vercel/blob');
  memo.set(k, { v, t: Date.now() });
  if (v == null) { try { await del(bPath(k), { token: B_TOKEN }); } catch {} return; }
  await put(bPath(k), JSON.stringify(v), { access: 'private', allowOverwrite: true, addRandomSuffix: false, contentType: 'application/json', cacheControlMaxAge: 60, token: B_TOKEN });
}
const blobKv = {
  async get(k) { const v = await bRead(k); return v == null ? null : typeof v === 'string' ? v : JSON.stringify(v); },
  async set(k, v) { await bWrite(k, BIG.has(k) || k.startsWith('ver:') ? JSON.parse(v) : v); },
  async del(k) { await bWrite(k, null); },
  async lpush(k, v) { const a = (await bRead(k)) || []; a.unshift(v); await bWrite(k, a); },
  async lrange(k, a, b) { return ((await bRead(k)) || []).slice(a, b + 1); },
  async ltrim(k, a, b) { const arr = (await bRead(k)) || []; if (arr.length > b + 1 || a > 0) await bWrite(k, arr.slice(a, b + 1)); },
  async hgetall(k) { return (await bRead(k)) || {}; },
  async hget(k, f) { return ((await bRead(k)) || {})[f] ?? null; },
  async hset(k, f, v) { const o = (await bRead(k)) || {}; o[f] = v; await bWrite(k, o); },
  async hdel(k, f) { const o = (await bRead(k)) || {}; delete o[f]; await bWrite(k, o); },
};

// Файлове сховище. Кожен ключ окремий JSON-файл, як у Blob, тож папку cms/ можна просто скопіювати
const fPath = (k) => path.join(DATA_DIR, bPath(k));
let chain = Promise.resolve(); // зміни по черзі, щоб два збереження не перетерли одне одного
const locked = (fn) => { const p = chain.then(fn, fn); chain = p.catch(() => {}); return p; };
async function fRead(k) {
  try { return JSON.parse(await fs.readFile(fPath(k), 'utf8')); } catch { return null; }
}
async function fWrite(k, v) {
  const f = fPath(k);
  if (v == null) { await fs.rm(f, { force: true }); return; }
  await fs.mkdir(path.dirname(f), { recursive: true });
  const tmp = `${f}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(v));
  await fs.rename(tmp, f);
}
const fileKv = {
  async get(k) { const v = await fRead(k); return v == null ? null : typeof v === 'string' ? v : JSON.stringify(v); },
  set: (k, v) => locked(() => fWrite(k, BIG.has(k) || k.startsWith('ver:') ? JSON.parse(v) : v)),
  del: (k) => locked(() => fWrite(k, null)),
  lpush: (k, v) => locked(async () => { const a = (await fRead(k)) || []; a.unshift(v); await fWrite(k, a); }),
  async lrange(k, a, b) { return ((await fRead(k)) || []).slice(a, b + 1); },
  ltrim: (k, a, b) => locked(async () => { const arr = (await fRead(k)) || []; if (arr.length > b + 1 || a > 0) await fWrite(k, arr.slice(a, b + 1)); }),
  async hgetall(k) { return (await fRead(k)) || {}; },
  async hget(k, f) { return ((await fRead(k)) || {})[f] ?? null; },
  hset: (k, f, v) => locked(async () => { const o = (await fRead(k)) || {}; o[f] = v; await fWrite(k, o); }),
  hdel: (k, f) => locked(async () => { const o = (await fRead(k)) || {}; delete o[f]; await fWrite(k, o); }),
};

const redisKv = {
  get: (k) => redis('GET', P + k),
  set: (k, v) => redis('SET', P + k, v),
  del: (k) => redis('DEL', P + k),
  lpush: (k, v) => redis('LPUSH', P + k, v),
  lrange: (k, a, b) => redis('LRANGE', P + k, a, b),
  ltrim: (k, a, b) => redis('LTRIM', P + k, a, b),
  async hgetall(k) {
    const arr = (await redis('HGETALL', P + k)) || [];
    const o = {}; for (let i = 0; i < arr.length; i += 2) o[arr[i]] = arr[i + 1]; return o;
  },
  hget: (k, f) => redis('HGET', P + k, f),
  hset: (k, f, v) => redis('HSET', P + k, f, v),
  hdel: (k, f) => redis('HDEL', P + k, f),
};
const kv = hasRedis ? redisKv : hasBlob ? blobKv : fileKv;
const parse = (s) => { try { return s ? JSON.parse(s) : null; } catch { return null; } };

export const DEFAULTS = defaults;
// Контент, збережений до фінального дизайну, ще не має блоку послуг.
// Тоді тексти, які змінились у макеті, беремо з нових значень за замовчуванням
function migrate(c) {
  if (!c || typeof c !== 'object' || c.services) return c;
  const m = structuredClone(c);
  if (m.settings) m.settings.nav = defaults.settings.nav;
  if (m.why) m.why.title = defaults.why.title;
  if (m.about) {
    for (const k of ['label', 'line1', 'subtitle', 'text']) m.about[k] = defaults.about[k];
  }
  return m;
}
// Старе меню хедера (з «Перевагами» і «Блогом») міняємо на нове. Змінене вручну меню не чіпаємо
const OLD_NAV = '#advantages|#services|#works|#team|#contacts|#about|/blog';
function migrateNav(c) {
  const nav = c && c.settings && c.settings.nav;
  if (!Array.isArray(nav) || nav.map((n) => n && n.href).join('|') !== OLD_NAV) return c;
  const m = structuredClone(c);
  m.settings.nav = structuredClone(defaults.settings.nav);
  return m;
}
// Шаблонні статті блогу додаємо один раз. Після першого збереження в адмінці прапорець demoPosts
// лишається, тож видалені клієнтом статті більше не повертаються
function migratePosts(c) {
  if (!c || !Array.isArray(c.posts) || (c.blog && c.blog.demoPosts)) return c;
  const have = new Set(c.posts.map((p) => p && p.id));
  const add = defaults.posts.filter((p) => p.id.startsWith('demo-') && !have.has(p.id));
  const m = structuredClone(c);
  m.posts = [...m.posts, ...structuredClone(add)];
  m.blog = { ...(m.blog || {}), demoPosts: 1 };
  return m;
}
export const normalize = (c) => normalizeContent(migratePosts(migrateNav(migrate(c))), defaults);

// Опублікований контент. Без бази сайт показує контент за замовчуванням
export async function getPublished() {
  if (!hasDb) return { content: normalize(defaults), at: null, by: null };
  const p = parse(await kv.get('published'));
  return p ? { ...p, content: normalize(p.content) } : { content: normalize(defaults), at: null, by: null };
}
export async function getDraft() { const d = parse(await kv.get('draft')); return d ? { ...d, content: normalize(d.content) } : d; }
export async function saveDraft(content, by) {
  const d = { content: normalize(content), at: Date.now(), by };
  await kv.set('draft', JSON.stringify(d));
  return d;
}
export async function dropDraft() { await kv.del('draft'); }

export async function publish(content, by, note = '') {
  const id = Date.now().toString(36) + crypto.randomBytes(3).toString('hex');
  const rec = { id, content: normalize(content), at: Date.now(), by, note };
  await kv.set('published', JSON.stringify(rec));
  await kv.set('ver:' + id, JSON.stringify(rec));
  await kv.lpush('history', JSON.stringify({ id, at: rec.at, by, note }));
  // Старі версії прибираємо, щоб база не росла без меж
  const old = await kv.lrange('history', HISTORY_MAX, HISTORY_MAX + 50);
  for (const o of old || []) { const m = parse(o); if (m) await kv.del('ver:' + m.id); }
  await kv.ltrim('history', 0, HISTORY_MAX - 1);
  await kv.del('draft');
  return rec;
}
export async function listHistory() { return ((await kv.lrange('history', 0, HISTORY_MAX - 1)) || []).map(parse).filter(Boolean); }
export async function getVersion(id) { return parse(await kv.get('ver:' + String(id).replace(/[^a-z0-9]/gi, ''))); }

// Адміністратори. Пошти з ADMIN_EMAILS додаються в базу при першому вході і не видаляються
export const ownerEmails = () => (process.env.ADMIN_EMAILS || '').split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean);
export async function listAdmins() {
  const all = await kv.hgetall('admins');
  const out = Object.entries(all).map(([email, v]) => ({ email, ...(parse(v) || {}) }));
  for (const e of ownerEmails()) {
    if (!all[e]) { const rec = { addedBy: 'system', at: Date.now() }; await kv.hset('admins', e, JSON.stringify(rec)); out.push({ email: e, ...rec }); }
  }
  return out.map((a) => ({ ...a, owner: ownerEmails().includes(a.email) })).sort((a, b) => (a.at || 0) - (b.at || 0));
}
export async function isAdmin(email) {
  email = String(email || '').toLowerCase();
  if (!email) return false;
  if (ownerEmails().includes(email)) { if (!(await kv.hget('admins', email))) await listAdmins(); return true; }
  return Boolean(await kv.hget('admins', email));
}
export async function addAdmin(email, by) { await kv.hset('admins', email.toLowerCase(), JSON.stringify({ addedBy: by, at: Date.now() })); }
export async function removeAdmin(email) { await kv.hdel('admins', email.toLowerCase()); }
export async function touchAdmin(email, name, picture) {
  const cur = parse(await kv.hget('admins', email)) || { addedBy: 'system', at: Date.now() };
  await kv.hset('admins', email, JSON.stringify({ ...cur, name, picture, lastLogin: Date.now() }));
}

// Медіатека
export async function addMedia(m) { await kv.lpush('media', JSON.stringify(m)); await kv.ltrim('media', 0, 999); }
export async function listMedia() { return ((await kv.lrange('media', 0, 999)) || []).map(parse).filter(Boolean); }
export async function removeMedia(u) {
  const all = await listMedia();
  const rest = all.filter((m) => m.url !== u);
  await kv.del('media');
  for (const m of rest.reverse()) await kv.lpush('media', JSON.stringify(m));
}
