import fs from 'node:fs/promises';
import path from 'node:path';
import { guarded, json } from '../lib/auth.js';
import { addMedia, listMedia, removeMedia } from '../lib/store.js';
import { slugify } from '../lib/sanitize.js';

// Фото і відео лежать у публічному сховищі Blob, щоб відвідувачі отримували їх напряму з CDN
const MEDIA_TOKEN = process.env.MEDIA_BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN || '';
const MAX = 4.4 * 1024 * 1024;
const TYPES = /^(image\/(jpeg|png|webp|gif|svg\+xml|avif)|video\/(mp4|webm|quicktime))$/;

export default {
  fetch: guarded(async (req, user) => {
    if (req.method === 'GET') return json({ items: await listMedia() });
    if (req.method === 'POST') {
      const type = (req.headers.get('content-type') || '').split(';')[0].trim();
      if (!TYPES.test(type)) return json({ error: 'Такий формат не підтримується. Підійдуть JPG, PNG, WebP, SVG, MP4 або WebM' }, 400);
      const buf = Buffer.from(await req.arrayBuffer());
      if (!buf.length) return json({ error: 'Порожній файл' }, 400);
      if (buf.length > MAX) return json({ error: 'Файл завеликий. Максимум 4 МБ' }, 413);
      const orig = decodeURIComponent(req.headers.get('x-filename') || 'file');
      const ext = (orig.match(/\.([a-z0-9]{2,5})$/i) || [, type.split('/')[1].replace('svg+xml', 'svg').replace('quicktime', 'mov').replace('jpeg', 'jpg')])[1].toLowerCase();
      const base = slugify(orig.replace(/\.[^.]+$/, '')) || 'file';
      const name = `${base}-${Date.now().toString(36)}.${ext}`;
      let url;
      if (MEDIA_TOKEN) {
        const { put } = await import('@vercel/blob');
        const r = await put(`media/${name}`, buf, { access: 'public', contentType: type, addRandomSuffix: true, cacheControlMaxAge: 31536000, token: MEDIA_TOKEN });
        url = r.url;
      } else {
        const dir = path.join(process.cwd(), '.data', 'uploads');
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(path.join(dir, name), buf);
        url = `/uploads/${name}`;
      }
      const item = { url, name: orig.slice(0, 120), type, size: buf.length, at: Date.now(), by: user.email };
      await addMedia(item);
      return json(item);
    }
    if (req.method === 'DELETE') {
      const u = new URL(req.url).searchParams.get('url');
      await removeMedia(u);
      if (MEDIA_TOKEN && /\.blob\.vercel-storage\.com\//.test(u || '')) {
        try { const { del } = await import('@vercel/blob'); await del(u, { token: MEDIA_TOKEN }); } catch (e) { console.error(e); }
      }
      return json({ ok: true });
    }
    return json({ error: 'Метод не підтримується' }, 405);
  }),
};
