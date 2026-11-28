import sanitizeHtml from 'sanitize-html';
import { parseDocument } from 'htmlparser2';
import render from 'dom-serializer';

// Текст статті. Лишаємо тільки ту розмітку, яку дає редактор блогу
export function sanitizeBody(html) {
  return fixBlocks(sanitizeHtml(String(html ?? ''), {
    allowedTags: ['p', 'h2', 'h3', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'a', 'br', 'figure', 'figcaption', 'img', 'blockquote', 'hr'],
    allowedAttributes: { a: ['href', 'target', 'rel'], img: ['src', 'alt', 'loading'], figure: ['class', 'style'], p: ['style'], h2: ['style'], h3: ['style'], li: ['style'], blockquote: ['style'] },
    allowedStyles: { '*': { 'text-align': [/^(center|right)$/] }, figure: { width: [/^\d{1,3}(\.\d+)?%$/] } },
    allowedClasses: { figure: ['sz-s', 'sz-m', 'sz-l', 'al-l', 'al-c', 'al-r'] },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowProtocolRelative: false,
    transformTags: {
      b: 'strong',
      i: 'em',
      a: (tag, attribs) => {
        const ext = /^https?:/i.test(attribs.href || '');
        return { tagName: 'a', attribs: ext ? { href: attribs.href, target: '_blank', rel: 'noopener' } : { href: attribs.href || '#' } };
      },
      img: (tag, attribs) => ({ tagName: 'img', attribs: { src: attribs.src || '', alt: attribs.alt || '', loading: 'lazy' } }),
    },
    exclusiveFilter: (frame) => ['p', 'h2', 'h3', 'li'].includes(frame.tag) && !frame.text.trim() && !frame.mediaChildren?.length,
  }));
}

// Абзац чи список всередині заголовка або абзацу виносимо назовні. Так буває після вставки тексту в заголовок.
// Порожні рядки (два переноси) ділять абзац на два, зайві переноси в кінці блоку прибираємо
const BLOCK = new Set(['p', 'h2', 'h3', 'ul', 'ol', 'figure', 'blockquote', 'hr']);
const isBr = (n) => n && n.type === 'tag' && n.name === 'br';
const blank = (n) => n.type === 'text' && !n.data.trim();
const empty = (kids) => kids.every((k) => blank(k) || isBr(k));
function split(el) {
  const out = []; let cur = [];
  const flush = () => { while (cur.length && (isBr(cur[cur.length - 1]) || blank(cur[cur.length - 1]))) cur.pop(); while (cur.length && (isBr(cur[0]) || blank(cur[0]))) cur.shift(); if (cur.length && !empty(cur)) out.push({ type: 'tag', name: el.name, attribs: { ...el.attribs }, children: cur }); cur = []; };
  const kids = el.children;
  for (let i = 0; i < kids.length; i++) {
    const k = kids[i];
    if (k.type === 'tag' && BLOCK.has(k.name)) { flush(); out.push(...(['p', 'h2', 'h3'].includes(k.name) ? split(k) : [k])); continue; }
    if (el.name === 'p' && isBr(k)) { let j = i + 1; while (j < kids.length && blank(kids[j])) j++; if (isBr(kids[j])) { flush(); i = j; continue; } }
    cur.push(k);
  }
  flush();
  return out;
}
export function fixBlocks(html) {
  if (!/<(p|h2|h3)[\s>]/.test(html)) return html;
  const doc = parseDocument(html);
  const kids = [];
  for (const n of doc.children) kids.push(...(n.type === 'tag' && ['p', 'h2', 'h3'].includes(n.name) ? split(n) : [n]));
  const fix = (n) => { (n.children || []).forEach((c) => { c.parent = n; fix(c); }); };
  doc.children = kids; fix(doc);
  return render(doc, { encodeEntities: 'utf8' });
}

const S = (v, max = 5000) => (typeof v === 'string' ? v.slice(0, max) : v == null ? '' : String(v).slice(0, max));

// Приводить контент до очікуваної форми перед збереженням
export function normalizeContent(c, defaults) {
  const out = structuredClone(defaults);
  if (!c || typeof c !== 'object') return out;
  const walk = (tpl, src) => {
    if (Array.isArray(tpl)) {
      if (!Array.isArray(src)) return tpl;
      const proto = tpl[0];
      return src.slice(0, 200).map((it) => (proto && typeof proto === 'object' ? walk(proto, it) : S(it)));
    }
    if (tpl && typeof tpl === 'object') {
      const o = {};
      for (const k of Object.keys(tpl)) o[k] = src && k in src ? walk(tpl[k], src[k]) : tpl[k];
      return o;
    }
    if (typeof tpl === 'boolean') return typeof src === 'boolean' ? src : tpl;
    if (typeof tpl === 'number') return Number.isFinite(Number(src)) ? Number(src) : tpl;
    return S(src, 200000);
  };
  const res = walk(defaults, c);
  // Статті мають свою форму, шаблон беремо з першої статті за замовчуванням
  const postTpl = { id: '', slug: '', published: true, date: '', time: '', title: '', excerpt: '', cover: '', coverAlt: '', body: '', ctaLabel: '', ctaUrl: '', seoTitle: '', seoDescription: '' };
  res.posts = (Array.isArray(c.posts) ? c.posts : defaults.posts).slice(0, 500).map((p) => {
    const o = walk(postTpl, p || {});
    o.slug = slugify(o.slug || o.title) || 'stattia-' + Math.random().toString(36).slice(2, 7);
    o.id = o.id || Math.random().toString(36).slice(2, 10);
    return o;
  });
  // Повторювані слаги отримують номер
  const seen = new Set();
  for (const p of res.posts) { let s = p.slug, n = 2; while (seen.has(s)) s = `${p.slug}-${n++}`; p.slug = s; seen.add(s); }
  return res;
}

const TR = { а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ie', ж: 'zh', з: 'z', и: 'y', і: 'i', ї: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ь: '', ю: 'iu', я: 'ia', ы: 'y', э: 'e', ё: 'io', ъ: '' };
export function slugify(s) {
  return String(s ?? '').toLowerCase().replace(/[*~]/g, '').split('').map((ch) => (ch in TR ? TR[ch] : ch)).join('')
    .replace(/['’ʼ`]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90);
}
