// Адмінпанель Злі Бороди
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clone = (o) => JSON.parse(JSON.stringify(o));
const plain = (t) => String(t ?? '').replace(/[*~]/g, '').replace(/\s*\n\s*/g, ' ').trim();
const fmtDate = (ts, withYear) => new Date(ts).toLocaleString('uk-UA', { day: 'numeric', month: 'long', ...(withYear ? { year: 'numeric' } : {}), hour: '2-digit', minute: '2-digit' });
const fmtTime = (ts) => new Date(ts).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });

const ICON = {
  up: '<svg viewBox="0 0 24 24"><path d="M12 19V5M6 11l6-6 6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24"><path d="M12 5v14M6 13l6 6 6-6"/></svg>',
  del: '<svg viewBox="0 0 24 24"><path d="M5 7h14M10 7V4.5h4V7M7 7l1 13h8l1-13"/></svg>',
  copy: '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="1.5"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/></svg>',
  chev: '<svg class="chev" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg>',
  dup: '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="1.5"/><path d="M4 16V5.5A1.5 1.5 0 0 1 5.5 4H16"/></svg>',
};

/* ---------------- API ---------------- */
async function api(path, opts = {}) {
  const r = await fetch(path, { credentials: 'same-origin', ...opts, headers: { ...(opts.body && !(opts.body instanceof Blob) ? { 'Content-Type': 'application/json' } : {}), ...(opts.headers || {}) } });
  if (r.status === 401) { showLogin(); throw new Error('Сесія завершилась, увійдіть ще раз'); }
  const ct = r.headers.get('content-type') || '';
  const data = ct.includes('json') ? await r.json() : await r.text();
  if (!r.ok) throw new Error((data && data.error) || 'Помилка ' + r.status);
  return data;
}

/* ---------------- Сповіщення і вікна ---------------- */
function toast(text, err) {
  const t = document.createElement('div');
  t.className = 'toast' + (err ? ' err' : '');
  t.textContent = text;
  $('#toasts').append(t);
  setTimeout(() => t.remove(), err ? 5000 : 2600);
}
function modal(html, { wide } = {}) {
  const m = document.createElement('div');
  m.className = 'modal';
  m.innerHTML = `<div class="dlg${wide ? ' wide' : ''}" role="dialog" aria-modal="true">${html}</div>`;
  document.body.append(m);
  const close = () => { m.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  m.addEventListener('mousedown', (e) => { if (e.target === m) close(); });
  setTimeout(() => { const f = $('input,textarea,button.btn-red', m); if (f) f.focus(); }, 30);
  return { el: m, close };
}
function confirmBox(title, text, okLabel = 'Так', danger) {
  return new Promise((res) => {
    const { el, close } = modal(`<h3>${esc(title)}</h3>${text ? `<p>${text}</p>` : ''}<div class="dlg-act"><button class="btn btn-line" data-x>Скасувати</button><button class="btn btn-red" data-ok>${esc(okLabel)}</button></div>`);
    $('[data-x]', el).onclick = () => { close(); res(false); };
    $('[data-ok]', el).onclick = () => { close(); res(true); };
    void danger;
  });
}
function askFields(title, fields, okLabel = 'Готово') {
  return new Promise((res) => {
    const { el, close } = modal(`<h3>${esc(title)}</h3>${fields.map((f, i) => `<div class="f"><label for="ask${i}">${esc(f.label)}</label><input class="in" id="ask${i}" value="${esc(f.value || '')}" placeholder="${esc(f.placeholder || '')}" ${f.list ? 'list="siteLinks"' : ''}>${f.hint ? `<div class="hint">${f.hint}</div>` : ''}</div>`).join('')}<div class="dlg-act"><button class="btn btn-line" data-x>Скасувати</button><button class="btn btn-red" data-ok>${esc(okLabel)}</button></div>`);
    const done = () => { const v = fields.map((_, i) => $('#ask' + i, el).value.trim()); close(); res(v); };
    $('[data-x]', el).onclick = () => { close(); res(null); };
    $('[data-ok]', el).onclick = done;
    $$('input', el).forEach((i) => i.addEventListener('keydown', (e) => { if (e.key === 'Enter') done(); }));
  });
}

/* ---------------- Стан ---------------- */
const S = {
  user: null, content: null, published: null, draftAt: null,
  section: 'hero', postId: null, device: localStorage.getItem('zb-dev') || (innerWidth <= 760 ? 'mobile' : 'desktop'),
  previewPath: '/', viewVersion: null, saving: false, saveErr: false, open: {},
};
const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
function set(obj, path, v) { const ks = path.split('.'); const last = ks.pop(); const t = ks.reduce((o, k) => o[k], obj); t[last] = v; }

/* ---------------- Схема розділів ---------------- */
const SITE_LINKS = [
  ['#advantages', 'Блок «Переваги» на головній'], ['#works', 'Блок «Наші роботи»'], ['#team', 'Блок «Команда»'], ['#about', 'Блок «Про нас»'],
  ['/', 'Головна сторінка'], ['/blog', 'Блог'],
];
const btnFields = (base) => ({ group: 'Кнопка запису', hint: 'Порожні поля беруть текст і посилання з розділу «Контакти і запис»', fields: [
  { t: 'text', k: base + '.btnLabel', label: 'Текст кнопки', ph: () => S.content.settings.bookingLabel },
  { t: 'link', k: base + '.btnUrl', label: 'Посилання кнопки', ph: () => S.content.settings.bookingUrl },
] });
const HEAD_HINT = 'Виділіть слово і натисніть «Червоним», щоб виділити його кольором. Enter переносить рядок';

const SECTIONS = [
  { h: 'Загальне' },
  { id: 'settings', title: 'Контакти і запис', desc: 'Логотип, телефон і головна кнопка запису, яка стоїть у шапці і в усіх блоках', path: '/', anchor: 'hdr', keys: ['settings.brand1', 'settings.brand2', 'settings.phone', 'settings.bookingLabel', 'settings.bookingUrl'], groups: [
    { group: 'Логотип', fields: [{ row: [{ t: 'text', k: 'settings.brand1', label: 'Перше слово' }, { t: 'text', k: 'settings.brand2', label: 'Червоне слово' }] }] },
    { group: 'Контакти', fields: [{ t: 'text', k: 'settings.phone', label: 'Телефон у шапці', hint: 'Відвідувач натискає на номер, і він копіюється' }] },
    { group: 'Запис онлайн', fields: [{ t: 'text', k: 'settings.bookingLabel', label: 'Текст кнопки' }, { t: 'url', k: 'settings.bookingUrl', label: 'Посилання на сервіс запису' }] },
  ] },
  { id: 'menu', title: 'Меню', desc: 'Пункти навігації в шапці сайту', path: '/', anchor: 'hdr', keys: ['settings.nav'], groups: [
    { fields: [{ t: 'list', k: 'settings.nav', label: 'Пункти меню', title: (it) => it.label, add: 'Додати пункт', blank: { label: 'Новий пункт', href: '/' }, fields: [
      { t: 'text', k: 'label', label: 'Назва' }, { t: 'link', k: 'href', label: 'Куди веде', hint: 'Оберіть блок або сторінку зі списку чи вставте будь-яке посилання' },
    ] }] },
  ] },
  { id: 'seo', title: 'SEO і соцмережі', desc: 'Як головна сторінка виглядає в Google і коли нею діляться в месенджерах', path: '/', keys: ['settings.seoTitle', 'settings.seoDescription', 'settings.ogImage'], groups: [
    { fields: [
      { t: 'text', k: 'settings.seoTitle', label: 'Заголовок сторінки', max: 60 },
      { t: 'textarea', k: 'settings.seoDescription', label: 'Опис для пошуку', max: 160, cls: 'short' },
      { t: 'image', k: 'settings.ogImage', label: 'Картинка для соцмереж', hint: 'Найкраще 1200 на 630 пікселів' },
    ] },
  ] },
  { h: 'Головна сторінка' },
  { id: 'hero', title: 'Перший екран', desc: 'Відео на фоні, головний заголовок і кнопка', path: '/', anchor: 'top', keys: ['hero'], groups: [
    { fields: [
      { t: 'heading', k: 'hero.title', label: 'Заголовок', hint: HEAD_HINT },
      { t: 'textarea', k: 'hero.text', label: 'Підзаголовок', cls: 'short' },
    ] },
    btnFields('hero'),
    { group: 'Фон', fields: [
      { t: 'video', k: 'hero.video', label: 'Відео на фоні', hint: 'MP4 до 4 МБ, без звуку. Порожнє поле залишить лише фото' },
      { t: 'image', k: 'hero.poster', label: 'Фото на фоні', hint: 'Показується, поки вантажиться відео, і на телефонах в режимі економії' },
    ] },
  ] },
  { id: 'marquee', title: 'Бігуча стрічка', desc: 'Червона стрічка під першим екраном', path: '/', anchor: 'mq', keys: ['marquee'], groups: [
    { fields: [{ t: 'image', k: 'marquee.image', label: 'Елемент стрічки', hint: 'PNG з прозорим фоном. Картинка повторюється по колу' }] },
  ] },
  { id: 'why', title: 'Переваги', desc: 'Блок із чотирма червоними картками, що розлітаються при прокрутці', path: '/', anchor: 'advantages', keys: ['why'], groups: [
    { fields: [{ t: 'heading', k: 'why.title', label: 'Заголовок', dim: true, hint: 'Виділіть слово і натисніть «Червоним» або «Сірим». Enter переносить рядок' }] },
    { fields: [{ t: 'list', k: 'why.cards', label: 'Картки', fixed: true, title: (it) => plain(it.title), fields: (it, i) => [
      { t: 'heading', k: 'title', label: 'Заголовок картки', noColor: true, hint: 'Enter переносить рядок' },
      { t: 'textarea', k: 'text', label: 'Текст', cls: 'short' },
      ...(i < 2 ? [{ t: 'image', k: 'image', label: 'Фото', hint: 'На сайті фото стає чорно-білим' }] : [{ t: 'note', text: 'У цій картці анімований малюнок, він не змінюється' }]),
    ] }] },
  ] },
  { id: 'works', title: 'Наші роботи', desc: 'Карусель з фото стрижок', path: '/', anchor: 'works', keys: ['works'], groups: [
    { fields: [{ t: 'heading', k: 'works.title', label: 'Заголовок', hint: HEAD_HINT }, { t: 'textarea', k: 'works.lead', label: 'Підзаголовок', cls: 'short' }] },
    { fields: [{ t: 'list', k: 'works.items', label: 'Фото робіт', pic: 'image', title: (it, i) => it.alt || `Фото ${i + 1}`, add: 'Додати фото', blank: { image: '', alt: '' }, fields: [
      { t: 'image', k: 'image', label: 'Фото', hint: 'Вертикальне, приблизно 3 на 4' },
      { t: 'text', k: 'alt', label: 'Опис фото', hint: 'Коротко, що на фото. Потрібно для Google і незрячих відвідувачів' },
    ] }] },
    btnFields('works'),
  ] },
  { id: 'team', title: 'Команда', desc: 'Карусель з барберами', path: '/', anchor: 'team', keys: ['team'], groups: [
    { fields: [{ t: 'heading', k: 'team.title', label: 'Заголовок', hint: HEAD_HINT }, { t: 'textarea', k: 'team.lead', label: 'Підзаголовок', cls: 'short' }] },
    { fields: [{ t: 'list', k: 'team.items', label: 'Барбери', pic: 'photo', title: (it) => it.name || 'Новий барбер', add: 'Додати барбера', blank: { photo: '', name: '', role: '' }, fields: [
      { t: 'image', k: 'photo', label: 'Фото', hint: 'Вертикальне, приблизно 4 на 5' },
      { row: [{ t: 'text', k: 'name', label: 'Ім\'я' }, { t: 'text', k: 'role', label: 'Посада' }] },
    ] }] },
    btnFields('team'),
  ] },
  { id: 'about', title: 'Про нас', desc: 'Червоний блок з текстом і великим фото залу', path: '/', anchor: 'about', keys: ['about'], groups: [
    { group: 'Заголовок', hint: 'Другий рядок плавно від\'їжджає вправо при прокрутці, а після третього стоїть маленьке фото', fields: [
      { t: 'text', k: 'about.line1', label: 'Перший рядок' }, { t: 'text', k: 'about.line2', label: 'Другий рядок' }, { t: 'text', k: 'about.line3', label: 'Третій рядок' },
      { t: 'image', k: 'about.inlineImage', label: 'Маленьке фото в заголовку' },
    ] },
    { fields: [{ t: 'textarea', k: 'about.text', label: 'Текст', cls: 'tall', hint: 'Порожній рядок між абзацами починає новий абзац' }] },
    btnFields('about'),
    { fields: [{ t: 'text', k: 'about.tag', label: 'Біла плашка внизу' }, { t: 'image', k: 'about.photo', label: 'Велике фото' }, { t: 'text', k: 'about.photoAlt', label: 'Опис великого фото' }] },
  ] },
  { h: 'Блог' },
  { id: 'posts', title: 'Статті', desc: 'Створюйте, редагуйте і публікуйте статті', path: '/blog', keys: ['posts'], custom: renderPosts },
  { id: 'blog', title: 'Сторінка блогу', desc: 'Заголовок і налаштування сторінки зі списком статей', path: '/blog', keys: ['blog'], groups: [
    { fields: [
      { t: 'heading', k: 'blog.title', label: 'Заголовок', hint: HEAD_HINT },
      { t: 'number', k: 'blog.perPage', label: 'Статей на одній сторінці', min: 1, max: 48 },
    ] },
    { group: 'SEO', fields: [{ t: 'text', k: 'blog.seoTitle', label: 'Заголовок сторінки', max: 60 }, { t: 'textarea', k: 'blog.seoDescription', label: 'Опис для пошуку', max: 160, cls: 'short' }] },
  ] },
  { h: 'Керування' },
  { id: 'history', title: 'Історія змін', desc: 'Кожна публікація зберігається. Будь-яку версію можна переглянути і повернути на сайт', custom: renderHistory },
  { id: 'media', title: 'Медіатека', desc: 'Усі завантажені фото і відео', custom: renderMedia },
  { id: 'admins', title: 'Адміністратори', desc: 'Хто може входити в адмінку. Вхід лише через Google', custom: renderAdmins },
];
const SEC = Object.fromEntries(SECTIONS.filter((s) => s.id).map((s) => [s.id, s]));

/* ---------------- Вхід ---------------- */
let authCfg = null;
async function boot() {
  try { authCfg = await (await fetch('/api/auth', { credentials: 'same-origin' })).json(); }
  catch { authCfg = { setup: ['NETWORK'] }; }
  if (authCfg.user) return start(authCfg.user);
  showLogin();
}
function showLogin(err) {
  $('#app').hidden = true;
  $('#login').hidden = false;
  const e = $('#loginErr');
  const setup = (authCfg && authCfg.setup) || [];
  if (setup.length) {
    const names = { GOOGLE_CLIENT_ID: 'Google Client ID для входу', DATABASE: 'сховище даних Vercel Blob', SESSION_SECRET: 'секретний ключ сесії SESSION_SECRET', NETWORK: 'зв\'язок із сервером' };
    e.hidden = false;
    e.innerHTML = `Адмінку ще не до кінця налаштовано. Бракує ${setup.map((s) => names[s] || s).join(', ')}. Інструкція є у файлі ADMIN.md у репозиторії сайту`;
  } else if (err) { e.hidden = false; e.innerHTML = err; } else e.hidden = true;
  if (authCfg && authCfg.devLogin) {
    const f = $('#devForm'); f.hidden = false;
    f.onsubmit = async (ev) => { ev.preventDefault(); await login({ devEmail: $('#devEmail').value }); };
  }
  if (authCfg && authCfg.clientId) loadGoogle();
}
let gLoaded = false;
function loadGoogle() {
  const init = () => {
    google.accounts.id.initialize({ client_id: authCfg.clientId, callback: (r) => login({ credential: r.credential }), ux_mode: 'popup', auto_select: false, cancel_on_tap_outside: true });
    google.accounts.id.renderButton($('#gbtn'), { theme: 'filled_black', size: 'large', shape: 'rectangular', text: 'signin_with', logo_alignment: 'left', locale: 'uk', width: 300 });
  };
  if (gLoaded) return init();
  const s = document.createElement('script');
  s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
  s.onload = () => { gLoaded = true; init(); };
  s.onerror = () => showLogin('Не вдалося завантажити вхід Google. Перевірте інтернет або вимкніть блокувальник реклами');
  document.head.append(s);
}
async function login(body) {
  try {
    const r = await fetch('/api/auth', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json();
    if (r.status === 403 && d.error === 'no-access') return showLogin(`Акаунт <b>${esc(d.email)}</b> не має доступу до адмінки. Попросіть адміністратора додати цю пошту або увійдіть іншим акаунтом`);
    if (!r.ok) return showLogin(esc(d.error || 'Не вдалося увійти'));
    start(d.user);
  } catch { showLogin('Не вдалося увійти, спробуйте ще раз'); }
}

/* ---------------- Старт ---------------- */
async function start(user) {
  S.user = user;
  $('#login').hidden = true;
  $('#app').hidden = false;
  const mb = $('#meBtn');
  mb.innerHTML = user.picture ? `<img src="${esc(user.picture)}" alt="" referrerpolicy="no-referrer">` : esc((user.name || user.email)[0]);
  $('#meName').textContent = user.name || 'Адміністратор';
  $('#meEmail').textContent = user.email;
  const d = await api('/api/content');
  S.published = d.published;
  S.content = clone(d.draft ? d.draft.content : d.published.content);
  S.draftAt = d.draft ? d.draft.at : null;
  const h = location.hash.slice(1).split('/');
  if (SEC[h[0]]) { S.section = h[0]; if (h[0] === 'posts' && h[1]) S.postId = h[1]; }
  bindChrome();
  renderSide();
  renderSection();
  updateStatus();
  setDevice(S.device);
  refreshPreview(true);
}

function bindChrome() {
  $('#meBtn').onclick = (e) => { e.stopPropagation(); $('#meMenu').hidden = !$('#meMenu').hidden; };
  document.addEventListener('click', () => { $('#meMenu').hidden = true; });
  $$('#meMenu [data-go]').forEach((b) => (b.onclick = () => go(b.dataset.go)));
  $('#logout').onclick = async () => { await fetch('/api/auth', { method: 'DELETE', credentials: 'same-origin' }); location.reload(); };
  $('#publish').onclick = doPublish;
  $('#discard').onclick = doDiscard;
  $$('.seg button').forEach((b) => (b.onclick = () => setDevice(b.dataset.dev)));
  $('#pvReload').onclick = () => refreshPreview(true);
  $('#pvToggle').onclick = () => { const o = $('#app').classList.toggle('pv-open'); $('#pvToggle').textContent = o ? 'Редагувати' : 'Перегляд'; layoutPreview(); if (o) refreshPreview(true); };
  $('#pvClose').onclick = () => { $('#app').classList.remove('pv-open'); $('#pvToggle').textContent = 'Перегляд'; };
  addEventListener('resize', layoutPreview);
  new ResizeObserver(layoutPreview).observe($('#pvStage'));
  addEventListener('message', onFrameMessage);
  addEventListener('keydown', (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); saveDraft(true); } });
  addEventListener('beforeunload', (e) => { if (saveTimer || S.saving) { e.preventDefault(); e.returnValue = ''; } });
  addEventListener('hashchange', () => {
    const h = location.hash.slice(1).split('/');
    if (SEC[h[0]] && (h[0] !== S.section || (h[1] || null) !== S.postId)) { S.section = h[0]; S.postId = h[0] === 'posts' ? h[1] || null : null; renderSide(); renderSection(); syncPreviewTarget(); }
  });
  const dl = document.createElement('datalist'); dl.id = 'siteLinks'; document.body.append(dl);
}
function updateLinkList() {
  const posts = (S.content.posts || []).map((p) => [`/blog/${p.slug}`, 'Стаття ' + plain(p.title)]);
  $('#siteLinks').innerHTML = [...SITE_LINKS, ...posts].map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join('');
}

/* ---------------- Бокове меню ---------------- */
function changedKeys(keys) {
  return keys.some((k) => JSON.stringify(get(S.content, k)) !== JSON.stringify(get(S.published.content, k)));
}
function renderSide() {
  let html = '', opts = '';
  for (const s of SECTIONS) {
    if (s.h) { html += (html ? '</nav>' : '') + `<h6>${esc(s.h)}</h6><nav>`; opts += (opts ? '</optgroup>' : '') + `<optgroup label="${esc(s.h)}">`; continue; }
    const dirty = s.keys && changedKeys(s.keys);
    html += `<a href="#${s.id}" class="${s.id === S.section ? 'on' : ''}" data-sec="${s.id}"><span>${esc(s.title)}</span>${dirty ? '<b title="Є неопубліковані зміни"></b>' : ''}</a>`;
    opts += `<option value="${s.id}"${s.id === S.section ? ' selected' : ''}>${esc(s.title)}${dirty ? ' •' : ''}</option>`;
  }
  $('#side').innerHTML = html + '</nav>';
  $$('#side a').forEach((a) => (a.onclick = (e) => { e.preventDefault(); go(a.dataset.sec); }));
  S.sideSel = `<select class="in side-sel" id="sideSel">${opts}</optgroup></select>`;
  const sel = $('#sideSel'); if (sel) sel.outerHTML = S.sideSel, bindSideSel();
}
function bindSideSel() { const sel = $('#sideSel'); if (sel) sel.onchange = () => go(sel.value); }
function go(id, postId = null) {
  S.section = id; S.postId = postId;
  history.replaceState(null, '', '#' + id + (postId ? '/' + postId : ''));
  renderSide(); renderSection(); syncPreviewTarget();
  $('#editor').scrollTop = 0;
}

/* ---------------- Статус і збереження ---------------- */
const isDirty = () => JSON.stringify(S.content) !== JSON.stringify(S.published.content);
function updateStatus() {
  const st = $('#status'), dirty = isDirty();
  let cls = '', txt;
  if (S.saveErr) { cls = 'err'; txt = 'Не вдалося зберегти чернетку. Перевірте інтернет'; }
  else if (S.saving || saveTimer) { cls = 'saving'; txt = 'Зберігаю чернетку'; }
  else if (dirty) { cls = 'dirty'; txt = `Є неопубліковані зміни${S.draftAt ? ' · чернетку збережено о ' + fmtTime(S.draftAt) : ''}`; }
  else txt = S.published.at ? `Усе опубліковано · ${fmtDate(S.published.at)}` : 'Сайт показує початковий контент';
  st.className = 'status ' + cls;
  st.innerHTML = `<i></i><span>${esc(txt)}</span>`;
  const ms = $('#mobStatus'); if (ms) ms.innerHTML = st.innerHTML;
  $('#publish').disabled = !dirty;
  $('#discard').disabled = !dirty;
}
let saveTimer = null, pvTimer = null;
function changed(opts = {}) {
  updateStatus();
  clearTimeout(saveTimer); saveTimer = setTimeout(() => saveDraft(), 3000);
  clearTimeout(pvTimer); pvTimer = setTimeout(() => refreshPreview(), opts.now ? 0 : 450);
  clearTimeout(changed.side); changed.side = setTimeout(renderSide, 300);
}
async function saveDraft(manual) {
  clearTimeout(saveTimer); saveTimer = null;
  if (S.saving) { saveTimer = setTimeout(() => saveDraft(manual), 600); return; }
  S.saving = true; updateStatus();
  try {
    if (isDirty()) { const r = await api('/api/content', { method: 'PUT', body: JSON.stringify({ content: S.content }) }); S.draftAt = r.at; }
    else if (S.draftAt) { await api('/api/content', { method: 'DELETE' }); S.draftAt = null; }
    S.saveErr = false;
    if (manual) toast('Чернетку збережено');
  } catch (e) { S.saveErr = true; if (manual) toast(e.message, true); }
  S.saving = false; updateStatus();
}
async function doPublish() {
  const { el, close } = modal(`<h3>Опублікувати зміни</h3><p>Зміни з'являться на сайті протягом кількох секунд. Попередня версія збережеться в історії, до неї можна буде повернутися</p>
    <div class="f"><label for="pubNote">Що змінилося</label><input class="in" id="pubNote" placeholder="Наприклад, новий барбер у команді" maxlength="200"><div class="hint">Необов'язково. Допоможе знайти версію в історії</div></div>
    <div class="dlg-act"><button class="btn btn-line" data-x>Скасувати</button><button class="btn btn-red" data-ok>Опублікувати</button></div>`);
  $('[data-x]', el).onclick = close;
  const ok = $('[data-ok]', el);
  const run = async () => {
    ok.disabled = true; ok.textContent = 'Публікую';
    try {
      clearTimeout(saveTimer); saveTimer = null;
      const r = await api('/api/content', { method: 'POST', body: JSON.stringify({ content: S.content, note: $('#pubNote', el).value }) });
      S.published = r.published; S.content = clone(r.published.content); S.draftAt = null;
      close(); toast('Опубліковано. Зміни вже на сайті');
      renderSide(); renderSection(); updateStatus(); refreshPreview();
    } catch (e) { ok.disabled = false; ok.textContent = 'Опублікувати'; toast(e.message, true); }
  };
  ok.onclick = run;
  $('#pubNote', el).addEventListener('keydown', (e) => { if (e.key === 'Enter') run(); });
}
async function doDiscard() {
  if (!(await confirmBox('Скасувати всі зміни?', 'Усе, що ще не опубліковано, буде видалено. Сайт залишиться як зараз', 'Скасувати зміни'))) return;
  clearTimeout(saveTimer); saveTimer = null;
  S.content = clone(S.published.content);
  try { await api('/api/content', { method: 'DELETE' }); } catch (e) { toast(e.message, true); }
  S.draftAt = null;
  if (S.postId && !S.content.posts.find((p) => p.id === S.postId)) S.postId = null;
  renderSide(); renderSection(); updateStatus(); refreshPreview();
  toast('Зміни скасовано');
}

/* ---------------- Поля форми ---------------- */
let uid = 0;
function renderSection() {
  updateLinkList();
  const s = SEC[S.section] || SEC.hero;
  const box = $('#edIn');
  box.innerHTML = '';
  const top = document.createElement('div');
  top.innerHTML = `${S.sideSel || ''}<div class="mob-status" id="mobStatus"></div>`;
  box.append(...top.childNodes);
  bindSideSel();
  if (s.custom) { s.custom(box); updateStatus(); return; }
  box.insertAdjacentHTML('beforeend', `<div class="ed-h"><h2>${esc(s.title)}</h2></div><p class="ed-desc">${esc(s.desc || '')}</p>`);
  for (const g of s.groups) box.append(renderGroup(g, S.content));
  updateStatus();
}
function renderGroup(g, root) {
  const el = document.createElement('div');
  el.className = 'group';
  if (g.group) el.insertAdjacentHTML('beforeend', `<h3>${esc(g.group)}</h3>`);
  if (g.hint) el.insertAdjacentHTML('beforeend', `<div class="hint" style="margin-top:-8px">${esc(g.hint)}</div>`);
  for (const f of g.fields) el.append(renderField(f, root));
  return el;
}
function renderField(f, root) {
  if (f.row) { const r = document.createElement('div'); r.className = 'row2'; f.row.forEach((x) => r.append(renderField(x, root))); return r; }
  const w = document.createElement('div');
  w.className = 'f';
  const id = 'f' + ++uid;
  const val = get(root, f.k);
  const hint = f.hint ? `<div class="hint">${esc(f.hint)}</div>` : '';
  const ph = typeof f.ph === 'function' ? f.ph() : f.ph || '';
  const count = f.max ? `<span class="count" data-count>${String(val || '').length} з ${f.max}</span>` : '';
  const upd = (v) => { set(root, f.k, v); if (f.max) { const c = $('[data-count]', w); c.textContent = `${String(v).length} з ${f.max}`; c.classList.toggle('over', String(v).length > f.max); } if (f.onInput) f.onInput(v); changed(); };
  switch (f.t) {
    case 'note': w.innerHTML = `<div class="hint">${esc(f.text)}</div>`; break;
    case 'text': case 'url': case 'link': case 'number': case 'date': {
      const type = f.t === 'number' ? 'number' : f.t === 'date' ? 'date' : 'text';
      w.innerHTML = `<label for="${id}">${esc(f.label)}${count}</label><input class="in" id="${id}" type="${type}" value="${esc(val)}" placeholder="${esc(ph)}"${f.t === 'link' ? ' list="siteLinks"' : ''}${f.min ? ` min="${f.min}"` : ''}${f.max && f.t === 'number' ? ` max="${f.max}"` : ''}${f.t !== 'text' ? ' spellcheck="false"' : ''}>${hint}`;
      const i = $('input', w);
      i.addEventListener('input', () => upd(f.t === 'number' ? Number(i.value) || 0 : i.value));
      if (f.t === 'url' || f.t === 'link') i.addEventListener('change', () => { const v = i.value.trim(); if (v && !/^(https?:|mailto:|tel:|#|\/)/i.test(v) && /\./.test(v)) { i.value = 'https://' + v; upd(i.value); } });
      break;
    }
    case 'textarea': case 'heading': {
      const tools = f.t === 'heading' && !f.noColor ? `<div class="mini-tools"><button type="button" class="chip red" data-wrap="*">Червоним</button>${f.dim ? '<button type="button" class="chip dim" data-wrap="~">Сірим</button>' : ''}<button type="button" class="chip" data-clear>Прибрати колір</button></div>` : '';
      w.innerHTML = `<label for="${id}">${esc(f.label)}${count}</label><textarea class="in ${f.cls || (f.t === 'heading' ? 'short' : '')}" id="${id}" placeholder="${esc(ph)}" rows="${f.t === 'heading' ? 2 : 3}">${esc(val)}</textarea>${tools}${hint}`;
      const ta = $('textarea', w);
      const fit = () => { ta.style.height = 'auto'; ta.style.height = Math.max(ta.scrollHeight + 2, f.t === 'heading' ? 64 : 84) + 'px'; };
      ta.addEventListener('input', () => { fit(); upd(ta.value); });
      requestAnimationFrame(fit);
      $$('[data-wrap]', w).forEach((b) => (b.onclick = () => {
        const m = b.dataset.wrap, a = ta.selectionStart, z = ta.selectionEnd;
        if (a === z) return toast('Спершу виділіть слово в заголовку');
        const sel = ta.value.slice(a, z).replace(/[*~]/g, '');
        ta.setRangeText(m + sel + m, a, z, 'select'); ta.focus(); fit(); upd(ta.value);
      }));
      const cl = $('[data-clear]', w); if (cl) cl.onclick = () => { ta.value = ta.value.replace(/[*~]/g, ''); fit(); upd(ta.value); };
      break;
    }
    case 'toggle': {
      w.innerHTML = `<label class="tog"><input type="checkbox" ${val ? 'checked' : ''}><i></i><span>${esc(f.label)}</span></label>${hint}`;
      $('input', w).onchange = (e) => upd(e.target.checked);
      break;
    }
    case 'image': case 'video': w.append(mediaField(f, val, upd, hint)); break;
    case 'list': w.append(listField(f, root)); break;
    case 'rich': w.append(richField(f, val, upd)); break;
  }
  return w;
}

/* Фото і відео */
function mediaField(f, val, upd, hint) {
  const box = document.createElement('div');
  const isVid = f.t === 'video';
  box.innerHTML = `<div class="lbl">${esc(f.label)}</div><div class="img-f"><div class="thumb"></div><div class="img-side"><div class="img-btns"><button type="button" class="btn btn-sm" data-up>Завантажити</button><button type="button" class="btn btn-sm btn-line" data-lib>З медіатеки</button><button type="button" class="btn btn-sm btn-line" data-rm>Прибрати</button></div><input class="in" spellcheck="false" placeholder="або вставте посилання" value="${esc(val)}">${hint}</div></div>`;
  const th = $('.thumb', box), inp = $('input', box);
  const show = (v) => {
    th.classList.toggle('empty', !v);
    th.style.backgroundImage = !isVid && v ? `url("${v.replace(/"/g, '%22')}")` : '';
    th.innerHTML = !v ? (isVid ? 'Без відео' : 'Немає фото') : isVid ? `<video src="${esc(v)}" muted loop autoplay playsinline></video>` : '';
    $('[data-rm]', box).hidden = !v;
  };
  const apply = (v) => { inp.value = v; show(v); upd(v); };
  show(val);
  inp.addEventListener('change', () => apply(inp.value.trim()));
  $('[data-rm]', box).onclick = () => apply('');
  $('[data-lib]', box).onclick = async () => { const u = await pickMedia(isVid ? 'video' : 'image'); if (u) apply(u); };
  const doUpload = async (file) => {
    if (!file) return;
    th.insertAdjacentHTML('beforeend', '<div class="busy">Вантажу</div>');
    try { const m = await uploadFile(file); apply(m.url); toast('Файл завантажено'); }
    catch (e) { toast(e.message, true); show(inp.value); }
  };
  $('[data-up]', box).onclick = () => chooseFile(isVid ? 'video/mp4,video/webm' : 'image/*', doUpload);
  dropTarget(th, (files) => doUpload(files[0]));
  return box;
}
function chooseFile(accept, cb, multiple) {
  const i = document.createElement('input');
  i.type = 'file'; i.accept = accept; i.multiple = Boolean(multiple);
  i.onchange = () => (multiple ? cb([...i.files]) : cb(i.files[0]));
  i.click();
}
function dropTarget(el, cb) {
  el.addEventListener('dragover', (e) => { e.preventDefault(); el.classList.add('drag'); });
  el.addEventListener('dragleave', () => el.classList.remove('drag'));
  el.addEventListener('drop', (e) => { e.preventDefault(); el.classList.remove('drag'); if (e.dataTransfer.files.length) cb([...e.dataTransfer.files]); });
}
// Великі фото стискаємо в браузері, щоб сайт вантажився швидко
async function shrink(file) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  const MAXD = 2400;
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) return file;
  const big = Math.max(bmp.width, bmp.height) > MAXD;
  if (!big && file.size < 1.2 * 1024 * 1024) return file;
  if (file.type === 'image/png' && !big && file.size < 3.5 * 1024 * 1024) return file;
  const k = Math.min(1, MAXD / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  const keepPng = file.type === 'image/png';
  const blob = await new Promise((r) => c.toBlob(r, keepPng ? 'image/png' : 'image/jpeg', 0.86));
  if (!blob || blob.size >= file.size) return file;
  return new File([blob], file.name.replace(/\.(png|webp|jpe?g)$/i, keepPng ? '.png' : '.jpg'), { type: blob.type });
}
async function uploadFile(file) {
  const f = await shrink(file);
  if (f.size > 4.4 * 1024 * 1024) throw new Error(`Файл ${file.name} завеликий. Максимум 4 МБ`);
  return api('/api/media', { method: 'POST', body: f, headers: { 'Content-Type': f.type || 'application/octet-stream', 'X-Filename': encodeURIComponent(f.name) } });
}

// Фото, що вже є на сайті, теж доступні для вибору
const BUILTIN = ['/hero-poster.jpg', '/img/about.jpg', '/img/about-inline.jpg', '/img/card-result.jpg', '/img/card-service.jpg', '/img/work-1.jpg', '/img/work-2.jpg', '/img/work-3.jpg', '/img/work-4.jpg', '/img/team-1.jpg', '/img/marquee-unit.png', '/blog/img/post-1.jpg', '/blog/img/post-2.jpg', '/blog/img/post-3.jpg', '/blog/img/post-4.jpg', '/blog/img/article-hall.jpg'].map((url) => ({ url, name: url.split('/').pop(), type: 'image/' + (url.endsWith('png') ? 'png' : 'jpeg'), builtin: true }));
const BUILTIN_VID = [{ url: '/hero.mp4', name: 'hero.mp4', type: 'video/mp4', builtin: true }];
async function pickMedia(kind) {
  let items = [];
  try { items = (await api('/api/media')).items; } catch (e) { toast(e.message, true); }
  const all = [...items, ...(kind === 'video' ? BUILTIN_VID : BUILTIN)].filter((m) => m.type.startsWith(kind));
  return new Promise((res) => {
    const { el, close } = modal(`<div class="ed-h"><h3 style="flex:1">Медіатека</h3><button class="btn btn-sm" data-up>Завантажити нове</button></div>
      ${all.length ? `<div class="media">${all.map((m, i) => `<div class="mcell" data-i="${i}" style="${kind === 'image' ? `background-image:url('${esc(m.url)}')` : ''}" title="${esc(m.name)}">${kind === 'video' ? `<video src="${esc(m.url)}" muted preload="metadata"></video>` : ''}<span>${esc(m.name)}</span></div>`).join('')}</div>` : '<div class="empty">Тут поки порожньо</div>'}
      <div class="dlg-act"><button class="btn btn-line" data-x>Закрити</button></div>`, { wide: true });
    $('[data-x]', el).onclick = () => { close(); res(null); };
    $$('.mcell', el).forEach((c) => (c.onclick = () => { close(); res(all[c.dataset.i].url); }));
    $('[data-up]', el).onclick = () => chooseFile(kind === 'video' ? 'video/mp4,video/webm' : 'image/*', async (f) => {
      if (!f) return;
      try { const m = await uploadFile(f); close(); res(m.url); toast('Файл завантажено'); } catch (e) { toast(e.message, true); }
    });
  });
}

/* Списки з однаковими елементами */
function listField(f, root) {
  const box = document.createElement('div');
  const arr = () => get(root, f.k);
  const key = S.section + ':' + f.k;
  const draw = () => {
    const items = arr();
    box.innerHTML = `<div class="lbl">${esc(f.label)} <span class="count">${items.length}</span></div><div class="list"></div>${f.fixed ? '' : `<button type="button" class="btn btn-sm btn-line add">+ ${esc(f.add || 'Додати')}</button>`}`;
    const list = $('.list', box);
    items.forEach((it, i) => {
      const open = S.open[key + ':' + i];
      const el = document.createElement('div');
      el.className = 'item' + (open ? ' open' : '');
      const pic = f.pic && it[f.pic] ? `<span class="pic" style="background-image:url('${esc(it[f.pic])}')"></span>` : '';
      el.innerHTML = `<div class="item-h"><span class="num">${i + 1}</span>${pic}<span class="ttl">${esc(f.title(it, i) || 'Без назви')}</span>
        ${f.fixed ? '' : `<button type="button" class="icon-btn" data-a="up" title="Вище" ${i ? '' : 'disabled'}>${ICON.up}</button><button type="button" class="icon-btn" data-a="down" title="Нижче" ${i < items.length - 1 ? '' : 'disabled'}>${ICON.down}</button><button type="button" class="icon-btn" data-a="dup" title="Дублювати">${ICON.dup}</button><button type="button" class="icon-btn danger" data-a="del" title="Видалити">${ICON.del}</button>`}${ICON.chev}</div><div class="item-b"></div>`;
      const body = $('.item-b', el);
      const fields = typeof f.fields === 'function' ? f.fields(it, i) : f.fields;
      const renderBody = () => { body.innerHTML = ''; fields.forEach((x) => body.append(renderField({ ...x, onInput: () => { $('.ttl', el).textContent = f.title(it, i) || 'Без назви'; if (f.pic) { const p = $('.pic', el); if (p) p.style.backgroundImage = `url('${it[f.pic]}')`; } } }, it))); };
      if (open) renderBody();
      $('.item-h', el).onclick = async (e) => {
        const a = e.target.closest('[data-a]')?.dataset.a;
        if (!a) { const o = !el.classList.contains('open'); S.open[key + ':' + i] = o; el.classList.toggle('open', o); if (o && !body.childNodes.length) renderBody(); return; }
        e.stopPropagation();
        if (a === 'del') { if (!(await confirmBox('Видалити елемент?', esc(f.title(it, i) || ''), 'Видалити'))) return; items.splice(i, 1); }
        if (a === 'up' || a === 'down') { const j = a === 'up' ? i - 1 : i + 1; [items[i], items[j]] = [items[j], items[i]]; const o = S.open[key + ':' + i]; S.open[key + ':' + i] = S.open[key + ':' + j]; S.open[key + ':' + j] = o; }
        if (a === 'dup') items.splice(i + 1, 0, clone(it));
        draw(); changed({ now: true });
      };
      list.append(el);
    });
    const add = $('.add', box);
    if (add) add.onclick = () => { items.push(clone(f.blank)); S.open[key + ':' + (items.length - 1)] = true; draw(); changed({ now: true }); };
  };
  draw();
  return box;
}

/* Текст статті */
function richField(f, val, upd) {
  const box = document.createElement('div');
  box.innerHTML = `<div class="lbl">${esc(f.label)}</div><div class="rte"><div class="rte-bar">
    <button type="button" data-b="p" title="Звичайний текст">Текст</button><button type="button" data-b="h2" title="Заголовок розділу">H2</button><button type="button" data-b="h3" title="Підзаголовок">H3</button><span class="sep"></span>
    <button type="button" data-c="bold" title="Жирний"><b>Ж</b></button><button type="button" data-c="italic" title="Курсив"><i>К</i></button><span class="sep"></span>
    <button type="button" data-c="insertUnorderedList" title="Список">• Список</button><button type="button" data-c="insertOrderedList" title="Нумерований список">1. Список</button><button type="button" data-b="blockquote" title="Цитата">Цитата</button><span class="sep"></span>
    <button type="button" data-x="link" title="Посилання">Посилання</button><button type="button" data-x="img" title="Фото">Фото</button><button type="button" data-c="removeFormat" title="Прибрати форматування">Очистити</button>
  </div><div class="rte-area" contenteditable="true" data-ph="Почніть писати статтю"></div></div><div class="hint" style="margin-top:6px">Розділи статті оформлюйте заголовками H2, а підрозділи H3. Так статтю краще бачить Google</div>`;
  const area = $('.rte-area', box);
  area.innerHTML = val || '';
  try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch {}
  const emit = () => upd(cleanHtml(area.innerHTML));
  area.addEventListener('focus', () => { if (!area.innerHTML.trim()) { area.innerHTML = '<p><br></p>'; const r = document.createRange(); r.setStart(area.firstChild, 0); r.collapse(true); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); } });
  area.addEventListener('input', emit);
  area.addEventListener('paste', (e) => {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');
    const ins = html ? cleanHtml(html) : esc(text).split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
    document.execCommand('insertHTML', false, ins);
  });
  let saved = null;
  const keep = () => { const s = getSelection(); if (s.rangeCount && area.contains(s.anchorNode)) saved = s.getRangeAt(0).cloneRange(); };
  area.addEventListener('keyup', keep); area.addEventListener('mouseup', keep); area.addEventListener('blur', keep);
  const restore = () => { area.focus(); if (saved) { const s = getSelection(); s.removeAllRanges(); s.addRange(saved); } };
  $$('.rte-bar button', box).forEach((b) => b.addEventListener('mousedown', (e) => e.preventDefault()));
  $$('[data-b]', box).forEach((b) => (b.onclick = () => { restore(); document.execCommand('formatBlock', false, b.dataset.b); emit(); }));
  $$('[data-c]', box).forEach((b) => (b.onclick = () => { restore(); document.execCommand(b.dataset.c, false, null); emit(); }));
  $('[data-x="link"]', box).onclick = async () => {
    keep();
    const r = saved; const txt = r ? r.toString() : '';
    const v = await askFields('Посилання', [{ label: 'Адреса', placeholder: 'https://', list: true, value: '' }, ...(txt ? [] : [{ label: 'Текст посилання', value: '' }])], 'Вставити');
    if (!v || !v[0]) return;
    let href = v[0]; if (!/^(https?:|mailto:|tel:|#|\/)/i.test(href)) href = 'https://' + href;
    restore();
    if (txt) document.execCommand('createLink', false, href);
    else document.execCommand('insertHTML', false, `<a href="${esc(href)}">${esc(v[1] || href)}</a>`);
    emit();
  };
  $('[data-x="img"]', box).onclick = async () => {
    keep();
    const u = await pickMedia('image');
    if (!u) return;
    const alt = await askFields('Опис фото', [{ label: 'Що на фото', hint: 'Потрібно для Google і незрячих читачів' }], 'Вставити');
    restore();
    document.execCommand('insertHTML', false, `<figure><img src="${esc(u)}" alt="${esc(alt ? alt[0] : '')}"></figure><p><br></p>`);
    emit();
  };
  return box;
}
// Чистимо вставлений текст до простої розмітки
function cleanHtml(html) {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const ok = { P: 1, H2: 1, H3: 1, STRONG: 1, B: 1, EM: 1, I: 1, UL: 1, OL: 1, LI: 1, A: 1, BR: 1, FIGURE: 1, IMG: 1, BLOCKQUOTE: 1, FIGCAPTION: 1 };
  const map = { H1: 'H2', H4: 'H3', H5: 'H3', H6: 'H3', DIV: 'P' };
  const walk = (node) => {
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) return;
      if (n.nodeType !== 1) return n.remove();
      walk(n);
      let tag = map[n.tagName] || n.tagName;
      if (['SCRIPT', 'STYLE', 'META', 'LINK', 'IFRAME', 'OBJECT'].includes(tag)) return n.remove();
      if (!ok[tag]) { n.replaceWith(...n.childNodes); return; }
      if (tag !== n.tagName) { const r = doc.createElement(tag); r.append(...n.childNodes); n.replaceWith(r); n = r; }
      [...n.attributes].forEach((a) => { if (!((tag === 'A' && a.name === 'href') || (tag === 'IMG' && (a.name === 'src' || a.name === 'alt')))) n.removeAttribute(a.name); });
      if (tag === 'A' && /^\s*javascript:/i.test(n.getAttribute('href') || '')) n.removeAttribute('href');
    });
  };
  const root = doc.body.firstChild;
  walk(root);
  // Текст без абзацу загортаємо в абзац
  let buf = [];
  const flush = (before) => { if (!buf.length) return; const p = doc.createElement('p'); root.insertBefore(p, before); buf.forEach((n) => p.append(n)); buf = []; };
  [...root.childNodes].forEach((n) => { const inl = n.nodeType === 3 || ['STRONG', 'B', 'EM', 'I', 'A', 'BR'].includes(n.tagName); if (inl) { if (n.nodeType === 3 && !n.textContent.trim() && !buf.length) return n.remove(); buf.push(n); } else flush(n); });
  flush(null);
  return root.innerHTML.replace(/<p>(\s|&nbsp;|<br>)*<\/p>/g, '').trim();
}

/* ---------------- Статті ---------------- */
function slugify(s) {
  const TR = { а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ie', ж: 'zh', з: 'z', и: 'y', і: 'i', ї: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ь: '', ю: 'iu', я: 'ia', ы: 'y', э: 'e', ё: 'io', ъ: '' };
  return String(s || '').toLowerCase().replace(/[*~]/g, '').split('').map((c) => (c in TR ? TR[c] : c)).join('').replace(/['’ʼ`]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90);
}
function renderPosts(box) {
  if (S.postId) { const p = S.content.posts.find((x) => x.id === S.postId); if (p) return renderPost(box, p); S.postId = null; }
  const posts = S.content.posts;
  box.insertAdjacentHTML('beforeend', `<div class="ed-h"><h2>Статті</h2><button class="btn btn-red" id="newPost">+ Нова стаття</button></div><p class="ed-desc">Порядок тут такий самий, як у блозі. Нова стаття з'являється першою</p>`);
  const list = document.createElement('div');
  list.className = 'posts';
  if (!posts.length) list.innerHTML = '<div class="empty">Статей поки немає</div>';
  posts.forEach((p, i) => {
    const pubP = S.published.content.posts.find((x) => x.id === p.id);
    const state = p.published === false ? '<span class="pill drf">Чернетка</span>' : !pubP ? '<span class="pill red">Нова, не опублікована</span>' : '<span class="pill pub">На сайті</span>';
    const el = document.createElement('div');
    el.className = 'pcard';
    el.innerHTML = `<span class="pic" style="${p.cover ? `background-image:url('${esc(p.cover)}')` : ''}"></span><div><h4>${esc(plain(p.title) || 'Без назви')}</h4><small>${state}${p.date ? `<span>${esc(new Date(p.date).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' }))}</span>` : ''}</small></div>
      <div class="ord"><button type="button" class="icon-btn" data-a="up" title="Вище" ${i ? '' : 'disabled'}>${ICON.up}</button><button type="button" class="icon-btn" data-a="down" title="Нижче" ${i < posts.length - 1 ? '' : 'disabled'}>${ICON.down}</button></div>`;
    el.onclick = (e) => {
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (!a) return go('posts', p.id);
      const j = a === 'up' ? i - 1 : i + 1;
      [posts[i], posts[j]] = [posts[j], posts[i]];
      changed({ now: true }); renderSection();
    };
    list.append(el);
  });
  box.append(list);
  $('#newPost').onclick = () => {
    const id = Math.random().toString(36).slice(2, 10);
    posts.unshift({ id, slug: 'nova-stattia-' + id.slice(0, 4), published: true, date: new Date().toISOString().slice(0, 10), title: '', excerpt: '', cover: '', coverAlt: '', body: '', ctaLabel: '', ctaUrl: '', seoTitle: '', seoDescription: '' });
    changed({ now: true });
    go('posts', id);
  };
}
function renderPost(box, p) {
  box.insertAdjacentHTML('beforeend', `<a href="#posts" class="back ul" id="toPosts">${ICON.back}<span>Усі статті</span></a><div class="ed-h"><h2>${esc(plain(p.title) || 'Нова стаття')}</h2></div><p class="ed-desc">Стаття відкриється за адресою /blog/${esc(p.slug)}</p>`);
  $('#toPosts').onclick = (e) => { e.preventDefault(); go('posts'); };
  const autoSlug = !p.title || p.slug === slugify(p.title) || /^nova-stattia-/.test(p.slug);
  const groups = [
    { fields: [
      { t: 'toggle', k: 'published', label: 'Показувати на сайті', hint: 'Вимкніть, щоб стаття була чернеткою і не з\'являлась у блозі', onInput: () => {} },
      { t: 'heading', k: 'title', label: 'Заголовок', noColor: true, hint: 'Enter переносить рядок у картці статті', onInput: (v) => {
        $('.ed-h h2', box).textContent = plain(v) || 'Нова стаття';
        if (autoSlug) { p.slug = slugify(v) || p.slug; const si = $('#slugIn'); if (si) si.value = p.slug; $('.ed-desc', box).textContent = 'Стаття відкриється за адресою /blog/' + p.slug; S.previewPath = '/blog/' + p.slug; }
      } },
      { row: [{ t: 'date', k: 'date', label: 'Дата' }, { t: 'text', k: 'slug', label: 'Адреса статті', onInput: (v) => { S.previewPath = '/blog/' + slugify(v); $('.ed-desc', box).textContent = 'Стаття відкриється за адресою /blog/' + slugify(v); } }] },
    ] },
    { group: 'Картка в блозі', fields: [
      { t: 'image', k: 'cover', label: 'Обкладинка', hint: 'Вертикальне фото, приблизно 9 на 10' },
      { t: 'text', k: 'coverAlt', label: 'Опис обкладинки' },
      { t: 'textarea', k: 'excerpt', label: 'Короткий опис', max: 320, hint: 'Два чотири речення під заголовком у списку статей' },
    ] },
    { group: 'Текст', fields: [{ t: 'rich', k: 'body', label: 'Текст статті' }] },
    { group: 'Кнопка в кінці статті', hint: 'Порожні поля беруть текст і посилання з розділу «Контакти і запис»', fields: [
      { t: 'text', k: 'ctaLabel', label: 'Текст кнопки', ph: S.content.settings.bookingLabel }, { t: 'link', k: 'ctaUrl', label: 'Посилання кнопки', ph: S.content.settings.bookingUrl },
    ] },
    { group: 'SEO', fields: [
      { t: 'text', k: 'seoTitle', label: 'Заголовок для Google', max: 60, ph: plain(p.title) },
      { t: 'textarea', k: 'seoDescription', label: 'Опис для Google', max: 160, cls: 'short' },
    ] },
  ];
  for (const g of groups) box.append(renderGroup(g, p));
  const slugInput = $$('input', box).find((i) => i.value === p.slug && i.type === 'text');
  if (slugInput) { slugInput.id = 'slugIn'; slugInput.addEventListener('change', () => { p.slug = slugify(slugInput.value) || p.slug; slugInput.value = p.slug; changed(); }); }
  const danger = document.createElement('div');
  danger.className = 'group';
  danger.innerHTML = `<h3>Видалення</h3><div class="hint" style="margin-top:-8px">Стаття зникне з сайту після публікації. Повернути її можна через історію змін</div><button class="btn btn-line" style="justify-self:start;color:#ff7a84">Видалити статтю</button>`;
  $('button', danger).onclick = async () => {
    if (!(await confirmBox('Видалити статтю?', esc(plain(p.title)), 'Видалити'))) return;
    S.content.posts = S.content.posts.filter((x) => x.id !== p.id);
    changed({ now: true }); go('posts');
  };
  box.append(danger);
}

/* ---------------- Історія ---------------- */
async function renderHistory(box) {
  box.insertAdjacentHTML('beforeend', `<div class="ed-h"><h2>Історія змін</h2></div><p class="ed-desc">${esc(SEC.history.desc)}. Зберігаються останні 50 публікацій</p><div class="hist" id="hist"><div class="empty">Завантаження</div></div>`);
  let items;
  try { items = (await api('/api/history')).items; } catch (e) { $('#hist').innerHTML = `<div class="empty">${esc(e.message)}</div>`; return; }
  if (S.section !== 'history') return;
  const h = $('#hist');
  if (!items.length) { h.innerHTML = '<div class="empty">Ще не було жодної публікації. Після першої тут з\'явиться запис</div>'; return; }
  h.innerHTML = items.map((it, i) => `<div class="hrow${i === 0 ? ' cur' : ''}"><div><b>${esc(fmtDate(it.at, true))}</b> ${i === 0 ? '<span class="pill pub">Зараз на сайті</span>' : ''}<small>${esc(it.note || 'Без опису')} · ${esc(it.by || '')}</small></div>
    <div class="acts"><button class="btn btn-sm btn-line" data-view="${it.id}">Переглянути</button>${i ? `<button class="btn btn-sm" data-back="${it.id}">Повернути</button>` : ''}</div></div>`).join('');
  $$('[data-view]', h).forEach((b) => (b.onclick = () => viewVersion(items.find((x) => x.id === b.dataset.view))));
  $$('[data-back]', h).forEach((b) => (b.onclick = () => restoreVersion(items.find((x) => x.id === b.dataset.back))));
}
async function viewVersion(it) {
  try {
    const v = await api('/api/history?id=' + encodeURIComponent(it.id));
    S.viewVersion = v;
    S.previewPath = '/';
    const bn = $('#pvBanner');
    bn.hidden = false;
    bn.innerHTML = `<span>Ви переглядаєте версію від ${esc(fmtDate(it.at, true))}</span><button class="btn btn-sm" data-back>Повернути її на сайт</button><button class="btn btn-sm btn-line" data-close>Закрити</button>`;
    $('[data-close]', bn).onclick = closeVersion;
    $('[data-back]', bn).onclick = () => restoreVersion(it);
    if (innerWidth <= 1080) $('#app').classList.add('pv-open');
    refreshPreview(true);
  } catch (e) { toast(e.message, true); }
}
function closeVersion() { S.viewVersion = null; $('#pvBanner').hidden = true; refreshPreview(true); }
async function restoreVersion(it) {
  const extra = isDirty() ? '<br><br>Ваші неопубліковані зміни буде скасовано.' : '';
  if (!(await confirmBox('Повернути цю версію?', `Сайт стане таким, яким був ${esc(fmtDate(it.at, true))}. Поточна версія залишиться в історії${extra}`, 'Повернути'))) return;
  try {
    const r = await api('/api/history', { method: 'POST', body: JSON.stringify({ id: it.id }) });
    clearTimeout(saveTimer); saveTimer = null;
    S.published = r.published; S.content = clone(r.published.content); S.draftAt = null;
    S.viewVersion = null; $('#pvBanner').hidden = true;
    toast('Версію повернуто на сайт');
    renderSide(); renderSection(); updateStatus(); refreshPreview(true);
  } catch (e) { toast(e.message, true); }
}

/* ---------------- Медіатека ---------------- */
async function renderMedia(box) {
  box.insertAdjacentHTML('beforeend', `<div class="ed-h"><h2>Медіатека</h2></div><p class="ed-desc">${esc(SEC.media.desc)}. Великі фото автоматично зменшуються. Максимальний розмір файлу 4 МБ</p>
    <div class="drop" id="drop">Перетягніть файли сюди або <button class="link-btn ul" type="button" id="pick">оберіть на комп'ютері</button></div><div class="media" id="mgrid" style="margin-top:14px"></div>`);
  const draw = async () => {
    let items;
    try { items = (await api('/api/media')).items; } catch (e) { $('#mgrid').innerHTML = `<div class="empty">${esc(e.message)}</div>`; return; }
    if (S.section !== 'media') return;
    const g = $('#mgrid');
    g.innerHTML = items.length ? items.map((m, i) => `<div class="mcell" data-i="${i}" title="${esc(m.name)}" style="${m.type.startsWith('image') ? `background-image:url('${esc(m.url)}')` : ''}">${m.type.startsWith('video') ? `<video src="${esc(m.url)}" muted preload="metadata"></video>` : ''}<button class="icon-btn danger del" data-del="${i}" title="Видалити">${ICON.del}</button><span>${esc(m.name)}</span></div>`).join('') : '<div class="empty" style="grid-column:1/-1">Ще нічого не завантажено</div>';
    $$('.mcell', g).forEach((c) => (c.onclick = async (e) => {
      const m = items[c.dataset.i];
      if (e.target.closest('[data-del]')) {
        if (!(await confirmBox('Видалити файл?', 'Якщо файл використовується на сайті, там залишиться порожнє місце', 'Видалити'))) return;
        try { await api('/api/media?url=' + encodeURIComponent(m.url), { method: 'DELETE' }); draw(); } catch (er) { toast(er.message, true); }
        return;
      }
      try { await navigator.clipboard.writeText(m.url); toast('Посилання на файл скопійовано'); } catch { toast(m.url); }
    }));
  };
  const up = async (files) => {
    for (const f of files) { try { await uploadFile(f); } catch (e) { toast(e.message, true); } }
    toast('Готово'); draw();
  };
  $('#pick').onclick = () => chooseFile('image/*,video/mp4,video/webm', up, true);
  dropTarget($('#drop'), up);
  draw();
}

/* ---------------- Адміністратори ---------------- */
async function renderAdmins(box) {
  box.insertAdjacentHTML('beforeend', `<div class="ed-h"><h2>Адміністратори</h2></div><p class="ed-desc">${esc(SEC.admins.desc)}. Людина входить зі свого Google-акаунта з цією поштою</p>
    <div class="group"><h3>Додати адміністратора</h3><form class="add-row" id="addAdm"><input class="in" type="email" placeholder="name@gmail.com" required><button class="btn btn-red">Додати</button></form></div><div class="hist" id="adms"></div>`);
  const draw = (items, me) => {
    $('#adms').innerHTML = items.map((a) => `<div class="arow"><span class="av" style="${a.picture ? `background-image:url('${esc(a.picture)}')` : ''}">${a.picture ? '' : esc(a.email[0])}</span>
      <div style="min-width:0"><b>${esc(a.name || a.email)}</b> ${a.owner ? '<span class="pill pub">Власник</span>' : ''} ${a.email === me ? '<span class="pill drf">Це ви</span>' : ''}<small>${esc(a.email)} · ${a.lastLogin ? 'останній вхід ' + esc(fmtDate(a.lastLogin)) : 'ще не входив'}</small></div>
      ${a.owner || a.email === me ? '<span></span>' : `<button class="icon-btn danger" data-rm="${esc(a.email)}" title="Забрати доступ">${ICON.del}</button>`}</div>`).join('');
    $$('[data-rm]', $('#adms')).forEach((b) => (b.onclick = async () => {
      if (!(await confirmBox('Забрати доступ?', `${esc(b.dataset.rm)} більше не зможе входити в адмінку`, 'Забрати доступ'))) return;
      try { const r = await api('/api/admins?email=' + encodeURIComponent(b.dataset.rm), { method: 'DELETE' }); draw(r.items, me); toast('Доступ забрано'); } catch (e) { toast(e.message, true); }
    }));
  };
  let me;
  try { const r = await api('/api/admins'); me = r.me; draw(r.items, me); } catch (e) { toast(e.message, true); }
  $('#addAdm').onsubmit = async (e) => {
    e.preventDefault();
    const i = $('input', e.target);
    try { const r = await api('/api/admins', { method: 'POST', body: JSON.stringify({ email: i.value }) }); i.value = ''; draw(r.items, me); toast('Адміністратора додано'); } catch (er) { toast(er.message, true); }
  };
}

/* ---------------- Перегляд ---------------- */
const PATH_NAMES = (p) => p === '/' ? 'Головна' : p.startsWith('/blog?') ? 'Блог, сторінка ' + p.split('=')[1] : p === '/blog' ? 'Блог' : p.startsWith('/blog/') ? 'Стаття ' + (plain((S.content.posts.find((x) => '/blog/' + x.slug === p) || {}).title) || p) : p;
function syncPreviewTarget() {
  const s = SEC[S.section];
  let path = s.path || S.previewPath;
  if (S.section === 'posts' && S.postId) { const p = S.content.posts.find((x) => x.id === S.postId); if (p) path = '/blog/' + p.slug; }
  const anchor = s.anchor;
  if (path !== S.previewPath) { S.previewPath = path; S.pendingAnchor = anchor; refreshPreview(true); }
  else if (anchor) frontFrame().contentWindow.postMessage({ zbScrollTo: anchor, smooth: true }, '*');
}
let front = 'pvA', lastScroll = 0, pvSeq = 0;
const frontFrame = () => $('#' + front);
async function refreshPreview(resetScroll) {
  if (!S.content) return;
  if (innerWidth <= 1080 && !$('#app').classList.contains('pv-open')) return;
  const seq = ++pvSeq;
  const content = S.viewVersion ? S.viewVersion.content : S.content;
  $('#pvPath').textContent = PATH_NAMES(S.previewPath);
  const stage = $('#pvStage');
  let spin = $('.pv-load', stage); if (!spin) { spin = document.createElement('div'); spin.className = 'pv-load'; stage.append(spin); }
  try {
    const r = await fetch('/api/preview', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content, path: S.previewPath }) });
    if (r.status === 401) return showLogin();
    const html = await r.text();
    if (seq !== pvSeq) return;
    const back = front === 'pvA' ? 'pvB' : 'pvA';
    const bf = $('#' + back);
    const keepY = resetScroll ? 0 : lastScroll;
    const anchor = S.pendingAnchor; S.pendingAnchor = null;
    bf.onload = () => {
      if (seq !== pvSeq) return;
      const w = bf.contentWindow;
      if (anchor) w.postMessage({ zbScrollTo: anchor }, '*'); else w.postMessage({ zbScrollY: keepY }, '*');
      setTimeout(() => {
        if (seq !== pvSeq) return;
        bf.classList.remove('back'); frontFrame().classList.add('back'); front = back;
        spin.remove();
      }, 120);
    };
    bf.srcdoc = html;
  } catch { spin.remove(); }
}
function onFrameMessage(e) {
  const d = e.data || {};
  if (e.source !== frontFrame().contentWindow) return;
  if (typeof d.zbScroll === 'number') lastScroll = d.zbScroll;
  if (d.zbPreviewNav) {
    const h = d.zbPreviewNav;
    if (/^https?:/i.test(h)) return window.open(h, '_blank', 'noopener');
    const u = new URL(h, location.origin);
    if (u.origin !== location.origin) return;
    const path = u.pathname.replace(/\/$/, '') + u.search || '/';
    S.previewPath = path || '/';
    S.pendingAnchor = u.hash ? u.hash.slice(1) : null;
    refreshPreview(true);
  }
}
function setDevice(d) {
  S.device = d; localStorage.setItem('zb-dev', d);
  $$('.seg button').forEach((b) => b.classList.toggle('on', b.dataset.dev === d));
  $('#preview').classList.toggle('mobile', d === 'mobile');
  layoutPreview();
}
function layoutPreview() {
  const st = $('#pvStage'), box = $('#pvBox');
  const W = st.clientWidth, H = st.clientHeight;
  if (!W) return;
  if (S.device === 'mobile') {
    const w = 390, h = 844, k = Math.min(1, (H - 40) / h, (W - 40) / w);
    box.style.width = w + 'px'; box.style.height = h + 'px';
    box.style.transform = `translateX(-50%) scale(${k})`;
  } else {
    const w = Math.max(W, 1440), k = W / w;
    box.style.width = w + 'px'; box.style.height = H / k + 'px';
    box.style.transform = `translateX(-50%) scale(${k})`;
  }
}

boot();
