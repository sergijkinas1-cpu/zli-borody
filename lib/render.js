// Збирає сторінки сайту з контенту. Один шаблон на тип сторінки.
import { sanitizeBody } from './sanitize.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Безпечне посилання. Дозволені http(s), mailto, tel, якорі та шляхи сайту
export function url(u, fallback = '#') {
  const v = String(u ?? '').trim();
  if (!v) return fallback;
  if (/^(https?:|mailto:|tel:|#|\/|\.\/|\.\.\/)/i.test(v)) return v;
  if (/^[a-z][a-z0-9+.-]*:/i.test(v)) return fallback;
  return v;
}

// Розмітка в заголовках. *слово* червоним, ~слово~ сірим, новий рядок це перенос
export function inline(text, { red = 'em', dim = 'span class="d"' } = {}) {
  let s = esc(text);
  const close = (t) => '</' + t.split(' ')[0] + '>';
  s = s.replace(/\*([\s\S]+?)\*/g, (_, x) => `<${red}>${x}${close(red)}`);
  s = s.replace(/~([\s\S]+?)~/g, (_, x) => `<${dim}>${x}${close(dim)}`);
  return s.replace(/\r?\n/g, '<br>');
}
const plain = (t) => String(t ?? '').replace(/[*~]/g, '').replace(/\s*\n\s*/g, ' ').trim();
const isExt = (u) => /^https?:/i.test(u);
const extAttrs = (u) => (isExt(u) ? ' target="_blank" rel="noopener"' : '');

const CAL = '<svg viewBox="0 0 20 20" aria-hidden="true"><use href="#cal"/></svg>';
function bookBtn(c, label, href, cls = 'btn btn-red', extra = '') {
  const l = (label || '').trim() || c.settings.bookingLabel || 'Записатися онлайн';
  const h = url((href || '').trim() || c.settings.bookingUrl);
  return `<a class="${cls}${extra}" href="${esc(h)}"${extAttrs(h)}>${esc(l)}${CAL}</a>`;
}

const SPRITE = `<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <symbol id="cal" viewBox="0 0 20 20"><g fill="none" stroke="currentColor" stroke-width="1.4"><rect x="2.5" y="3.8" width="15" height="13.7" rx="1.5"/><path d="M2.5 7.6h15M6.3 2v3.4M13.7 2v3.4"/></g><g fill="currentColor"><rect x="5" y="9.6" width="2" height="2"/><rect x="9" y="9.6" width="2" height="2"/><rect x="13" y="9.6" width="2" height="2"/><rect x="5" y="13.2" width="2" height="2"/><rect x="9" y="13.2" width="2" height="2"/><rect x="13" y="13.2" width="2" height="2"/></g></symbol>
</svg>`;

function head({ title, description, css, image, canonical }) {
  return `<!doctype html>
<html lang="uk">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
${description ? `<meta name="description" content="${esc(description)}">` : ''}
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
${description ? `<meta property="og:description" content="${esc(description)}">` : ''}
${image ? `<meta property="og:image" content="${esc(image)}">` : ''}
${canonical ? `<link rel="canonical" href="${esc(canonical)}">` : ''}
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%23d10616'/%3E%3Ctext x='16' y='22' font-family='Arial' font-weight='700' font-size='15' fill='white' text-anchor='middle'%3EЗБ%3C/text%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Manrope:wght@300;400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${css}">
</head>`;
}

function header(c, { home, scrolled, activeBlog }) {
  const s = c.settings;
  const nav = (s.nav || []).map((n) => {
    let h = url(n.href);
    if (!home && h.startsWith('#')) h = '/' + h;
    const active = activeBlog && /^\/blog\/?$/.test(h) ? ' active' : '';
    return `<a class="ul${active}" href="${esc(h)}"${extAttrs(h)}>${esc(n.label)}</a>`;
  }).join('\n      ');
  return `<header class="hdr${scrolled ? ' scrolled' : ''}" id="hdr" data-edit="settings">
  <div class="wrap">
    <a href="${home ? '#top' : '/'}" class="logo">${esc(s.brand1)} <span>${esc(s.brand2)}</span></a>
    <nav class="nav" id="nav">
      ${nav}
    </nav>
    ${s.phone ? `<span class="phone ul" data-copy="${esc(s.phone)}" role="button" tabindex="0" title="Скопіювати номер">${esc(s.phone)}</span>` : ''}
    ${bookBtn(c)}
    <button class="burger" id="burger" aria-label="Меню"><span></span><span></span><span></span></button>
  </div>
</header>`;
}

// Карусель гортає по колу, тому елементів має бути щонайменше вісім
function loop(items, min = 8) {
  const out = items.map((it) => ({ it, dup: false }));
  if (!items.length) return out;
  while (out.length < min) for (const it of items) { if (out.length >= min) break; out.push({ it, dup: true }); }
  return out;
}

const COMMON_JS = `
  document.querySelectorAll('.btn').forEach(function(b){var t=b.firstChild;if(!t||t.nodeType!==3)return;var v=t.nodeValue.trim();var w=document.createElement('span');w.className='bt';w.innerHTML='<span></span><span aria-hidden="true"></span>';w.firstChild.textContent=v;w.lastChild.textContent=v;b.replaceChild(w,t);});
  var hdr=document.getElementById('hdr');
  if(hdr){document.getElementById('burger').addEventListener('click',function(){hdr.classList.toggle('open')});
    hdr.querySelectorAll('.nav a').forEach(function(a){a.addEventListener('click',function(){hdr.classList.remove('open')})});}
  var toast=document.getElementById('toast'),tt;
  function say(t){toast.textContent=t;toast.classList.add('show');clearTimeout(tt);tt=setTimeout(function(){toast.classList.remove('show')},1800)}
  document.querySelectorAll('[data-copy]').forEach(function(el){function go(){var v=el.getAttribute('data-copy');
    try{navigator.clipboard.writeText(v).then(function(){say('Номер '+v+' скопійовано')},function(){say(v)})}catch(_){say(v)}}
    el.style.cursor='pointer';el.addEventListener('click',go);el.addEventListener('keydown',function(e){if(e.key==='Enter')go()})});
`;

// У режимі перегляду в адмінці переходи по сайту йдуть через адмінку
const PREVIEW_JS = `<script>
(function(){
  document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href]');if(!a)return;var h=a.getAttribute('href');
    if(h.charAt(0)==='#'){return}
    e.preventDefault();parent.postMessage({zbPreviewNav:h},'*');},true);
  addEventListener('message',function(e){var d=e.data||{};if(d.zbScrollTo){var el=document.getElementById(d.zbScrollTo)||document.querySelector('[data-edit="'+d.zbScrollTo+'"]');if(el)el.scrollIntoView({behavior:d.smooth?'smooth':'auto',block:'start'})}
    if(typeof d.zbScrollY==='number'){scrollTo(0,d.zbScrollY)}});
  addEventListener('scroll',function(){parent.postMessage({zbScroll:scrollY},'*')},{passive:true});
})();
</script>`;

const foot = (preview, js) => `<div class="toast" id="toast"></div>
${SPRITE}
<script>
(function(){${js}})();
</script>
${preview ? PREVIEW_JS : ''}
</body>
</html>`;

/* ------------------------------ Головна ------------------------------ */
export function renderHome(c, { preview = false, origin = '' } = {}) {
  const s = c.settings, h = c.hero, w = c.why, wk = c.works, t = c.team, a = c.about;
  const whyLines = String(w.title || '').split(/\r?\n/).map((l) => `<span class="l">${inline(l, { red: 'span class="r"', dim: 'span class="d"' })}</span>`).join('');
  const cards = (w.cards || []).slice(0, 4).map((cd, i) => {
    if (i < 2) return `<article class="wc"><div class="ph" style="background-image:url('${esc(url(cd.image, ''))}')"></div><h3>${inline(cd.title)}</h3><p>${esc(cd.text)}</p></article>`;
    const anim = i === 2 ? 'scissors' : 'face';
    return `<article class="wc art"><h3>${inline(cd.title)}</h3><img class="draw-end" src="/img/draw-${anim}-end.jpg" alt=""><video muted playsinline preload="auto" src="/img/draw-${anim}.mp4" aria-hidden="true"></video><p>${esc(cd.text)}</p></article>`;
  }).join('\n        ');
  const works = loop(wk.items || []).map(({ it, dup }) => `<div class="work"${dup ? ' aria-hidden="true"' : ''}><img src="${esc(url(it.image, ''))}" alt="${dup ? '' : esc(it.alt)}"></div>`).join('\n          ');
  const team = loop(t.items || [], 6).map(({ it, dup }) => `<article class="barber"${dup ? ' aria-hidden="true"' : ''}><img src="${esc(url(it.photo, ''))}" alt="${dup ? '' : esc(it.name)}"><div class="cap"><h3>${esc(it.name)}</h3><p>${esc(it.role)}</p></div></article>`).join('\n          ');
  const paras = String(a.text || '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('\n        ');
  const arrows = (what) => `<div class="arrows">
            <button class="car-btn prev" aria-label="Попередні ${what}"><svg viewBox="0 0 24 24"><path d="M19 12H5M11 6l-6 6 6 6"/></svg></button>
            <button class="car-btn next" aria-label="Наступні ${what}"><svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
          </div>`;

  return `${head({ title: s.seoTitle || 'Злі Бороди', description: s.seoDescription, css: '/css/site.css', image: s.ogImage ? origin + url(s.ogImage, '') : '', canonical: origin ? origin + '/' : '' })}
<body>

${header(c, { home: true })}

<main id="top">
  <section class="hero" aria-label="Головна" data-edit="hero"${h.poster ? ` style="background-image:url('${esc(url(h.poster, ''))}')"` : ''}>
    ${h.video ? `<video autoplay muted loop playsinline preload="auto"${h.poster ? ` poster="${esc(url(h.poster, ''))}"` : ''} aria-hidden="true"><source src="${esc(url(h.video, ''))}" type="video/mp4"></video>` : ''}
    <div class="wrap">
      <div class="hero-in">
        <h1>${inline(h.title)}</h1>
        ${h.text ? `<p>${esc(h.text)}</p>` : ''}
        ${bookBtn(c, h.btnLabel, h.btnUrl)}
      </div>
    </div>
  </section>

  <div class="mq" aria-hidden="true" data-edit="marquee"><div class="mq-t" id="mq" data-src="${esc(url(c.marquee.image, ''))}"></div></div>

  <section class="why" id="advantages" aria-labelledby="whyT" data-edit="why">
    <div class="why-stage">
      <h2 class="why-title" id="whyT">${whyLines}</h2>
      <div class="why-deck">
        ${cards}
      </div>
    </div>
  </section>

  <section class="works" id="works" data-edit="works">
    <div class="wrap">
      <h2 class="h2 rv">${inline(wk.title)}</h2>
      ${wk.lead ? `<p class="lead rv">${esc(wk.lead)}</p>` : ''}
      <div class="car rv">
        <div class="car-view"><div class="car-track">
          ${works}
        </div></div>
        <div class="team-foot">
          ${arrows('роботи')}
          ${bookBtn(c, wk.btnLabel, wk.btnUrl)}
        </div>
      </div>
    </div>
  </section>

  <section class="team" id="team" data-edit="team">
    <div class="wrap">
      <h2 class="h2 rv">${inline(t.title)}</h2>
      ${t.lead ? `<p class="lead rv">${esc(t.lead)}</p>` : ''}
      <div class="car rv">
        <div class="car-view"><div class="car-track">
          ${team}
        </div></div>
        <div class="team-foot">
          ${arrows('барбери')}
          ${bookBtn(c, t.btnLabel, t.btnUrl)}
        </div>
      </div>
    </div>
  </section>

  <section class="about" id="about" data-edit="about">
    <div class="wrap">
      <div class="ab-red rv">
        <h2><span class="l">${esc(a.line1)}</span><span class="l in">${esc(a.line2)}</span><span class="l">${esc(a.line3)}${a.inlineImage ? `<img src="${esc(url(a.inlineImage, ''))}" alt="">` : ''}</span></h2>
        ${paras}
        ${bookBtn(c, a.btnLabel, a.btnUrl, 'btn btn-white')}
        ${a.tag ? `<div class="ab-tag"><span>${esc(a.tag)}</span></div>` : ''}
      </div>
      <div class="ab-photo rv"><img src="${esc(url(a.photo, ''))}" alt="${esc(a.photoAlt)}"></div>
    </div>
  </section>
</main>
${foot(preview, HOME_JS)}`;
}

/* ------------------------------ Блог ------------------------------ */
export const visiblePosts = (c, preview) => (c.posts || []).filter((p) => p.slug && (preview || p.published !== false));

export function renderBlog(c, { page = 1, preview = false, origin = '' } = {}) {
  const b = c.blog, per = Math.max(1, Number(b.perPage) || 8);
  const posts = visiblePosts(c, preview);
  const pages = Math.max(1, Math.ceil(posts.length / per));
  page = Math.min(Math.max(1, page | 0), pages);
  const list = posts.slice((page - 1) * per, page * per).map((p) => `<a class="post" href="/blog/${esc(p.slug)}">
        <span class="post-img">${p.cover ? `<img src="${esc(url(p.cover, ''))}" alt="${esc(p.coverAlt)}" loading="lazy">` : ''}</span>
        <span class="post-t">${inline(p.title)}</span>
        ${p.excerpt ? `<span class="post-x">${esc(p.excerpt)}</span>` : ''}
      </a>`).join('\n      ');
  const href = (n) => (n === 1 ? '/blog' : `/blog?page=${n}`);
  const arrow = (dir, n, ok) => {
    const d = dir === 'prev' ? 'M14 6l-6 6 6 6' : 'M10 6l6 6-6 6';
    const lbl = dir === 'prev' ? 'Попередня сторінка' : 'Наступна сторінка';
    return ok ? `<a class="pg pg-arr" href="${href(n)}" aria-label="${lbl}"><svg viewBox="0 0 24 24"><path d="${d}"/></svg></a>`
      : `<button class="pg pg-arr" aria-label="${lbl}" disabled><svg viewBox="0 0 24 24"><path d="${d}"/></svg></button>`;
  };
  let pager = '';
  if (pages > 1) {
    const nums = Array.from({ length: pages }, (_, i) => i + 1).map((n) => `<a class="pg${n === page ? ' on' : ''}" href="${href(n)}"${n === page ? ' aria-current="page"' : ''}>${n}</a>`).join('\n    ');
    pager = `<nav class="pager" aria-label="Сторінки блогу">
    ${arrow('prev', page - 1, page > 1)}
    ${nums}
    ${arrow('next', page + 1, page < pages)}
  </nav>`;
  }
  return `${head({ title: b.seoTitle || plain(b.title), description: b.seoDescription, css: '/blog/blog.css', canonical: origin ? origin + href(page) : '' })}
<body>
${header(c, { scrolled: true, activeBlog: true })}

<main class="page wrap" data-edit="blog">
  <nav class="crumbs" aria-label="Навігація сторінками"><a href="/">Головна</a><i aria-hidden="true"></i><span>Блог</span></nav>
  <h1 class="ttl">${inline(b.title)}</h1>
  ${posts.length ? `<div class="posts">
      ${list}
  </div>` : '<p class="empty">Статті скоро з\'являться</p>'}
  ${pager}
</main>
${foot(preview, COMMON_JS)}`;
}

export function renderPost(c, slug, { preview = false, origin = '' } = {}) {
  const p = visiblePosts(c, preview).find((x) => x.slug === slug);
  if (!p) return null;
  const t = plain(p.title);
  const cta = bookBtn(c, p.ctaLabel, p.ctaUrl, 'btn btn-red', ' art-cta');
  return `${head({ title: p.seoTitle || t, description: p.seoDescription || p.excerpt, css: '/blog/blog.css', image: p.cover ? origin + url(p.cover, '') : '', canonical: origin ? `${origin}/blog/${p.slug}` : '' })}
<body>
${header(c, { scrolled: true, activeBlog: true })}

<main class="page wrap" data-edit="post">
  <nav class="crumbs" aria-label="Навігація сторінками"><a href="/">Головна</a><i aria-hidden="true"></i><a href="/blog">Блог</a><i aria-hidden="true"></i><span aria-current="page">${esc(t)}</span></nav>
  <article class="art">
    <h1 class="ttl">${inline(p.title)}</h1>
${sanitizeBody(p.body)}
    ${cta}
  </article>
</main>
${foot(preview, COMMON_JS)}`;
}

export function render404(c, opts = {}) {
  return `${head({ title: 'Сторінку не знайдено', css: '/blog/blog.css' })}
<body>
${header(c, { scrolled: true })}
<main class="page wrap">
  <h1 class="ttl">Сторінку не знайдено</h1>
  <p class="empty">Можливо, її перенесли або видалили. <a class="ul" href="/">На головну</a></p>
</main>
${foot(opts.preview, COMMON_JS)}`;
}

const HOME_JS = String.raw`
  document.documentElement.classList.add('js');
  var $=function(s,c){return (c||document).querySelector(s)},$$=function(s,c){return Array.prototype.slice.call((c||document).querySelectorAll(s))};
  var rm=matchMedia('(prefers-reduced-motion:reduce)');
` + COMMON_JS + String.raw`
  // Бігущий рядок. Дві однакові половини, щоб стрічка йшла без шва
  var mq=$('#mq');if(mq){var src=mq.getAttribute('data-src'),h='';if(src){for(var i=0;i<16;i++)h+='<img src="'+src+'" alt="">';}mq.innerHTML=h;}

  // Поява при скролі
  var rv=$$('.rv');
  if('IntersectionObserver' in window){
    var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{rootMargin:'0px 0px -6% 0px',threshold:0});
    rv.forEach(function(el,i){var p=el.parentElement;el.style.transitionDelay=(Array.prototype.indexOf.call(p.children,el)%4)*110+'ms';io.observe(el)});
  } else rv.forEach(function(el){el.classList.add('in')});

  // Шапка
  addEventListener('scroll',function(){hdr.classList.toggle('scrolled',scrollY>40)},{passive:true});

  // Блок переваг. Картки по черзі вилітають знизу у віяло, потім розкладаються в ряд
  (function(){
    var sec=$('#advantages');if(!sec)return;var stage=$('.why-stage',sec),title=$('.why-title',sec),cards=$$('.wc',sec);
    var desk=matchMedia('(min-width:861px)');
    var FAN=[{x:-.322,y:.011,r:-20},{x:-.069,y:-.214,r:-3},{x:0,y:0,r:0},{x:.378,y:-.119,r:17}];
    var ORDER=[1,3,0,2];
    var FROM=[{x:-.9,r:-38},{x:-.25,r:-14},{x:.15,r:12},{x:.9,r:34}];
    function clamp(v){return v<0?0:v>1?1:v}
    function eo(t){return 1-Math.pow(1-t,3)}
    function eio(t){return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2}
    function reset(c){var v=$('video',c);if(!v||!c.__played)return;c.__played=false;try{v.pause();v.currentTime=0}catch(_){}v.style.display='';var e=$('.draw-end',c);if(e)e.style.opacity=0}
    function play(c){var v=$('video',c);if(!v||c.__played)return;c.__played=true;
      if(rm.matches){$('.draw-end',c).style.opacity=1;v.style.display='none';return}
      try{v.currentTime=0;var p=v.play();if(p&&p.catch)p.catch(function(){$('.draw-end',c).style.opacity=1;v.style.display='none'})}catch(_){}}
    function layout(){
      var W=innerWidth,H=stage.clientHeight,u=Math.min(W/1440,H/860,1.25);
      var r=sec.getBoundingClientRect(),tot=sec.offsetHeight-H,p=clamp(-r.top/Math.max(1,tot));
      if(rm.matches)p=1;
      var pad=Math.max(20,W*.014),gap=Math.round(30*W/1440),cw=Math.min(380,(W-pad*2-gap*3)/4),ch=cw*166/150;
      var tH=113*u*2;
      var blockH=640*u,t0=Math.max(80,(H-blockH)/2),fanCY=t0+384*u,fanS=360*u/cw;
      var t1=Math.max(76,(H-(tH+44*u+ch))/2),rowY=t1+tH+44*u;
      var sp=eio(clamp((p-.6)/.24));
      title.style.setProperty('--k',u+'px');
      var tt=t0-20*u;title.style.transform='translateY('+(tt+(t1-tt)*sp).toFixed(1)+'px)';
      var x0=(W-(cw*4+gap*3))/2;
      cards.forEach(function(c,i){
        c.style.setProperty('--cw',cw+'px');
        var k=ORDER.indexOf(i),t=eo(clamp((p-(.05+k*.12))/.15)),f=FAN[i],fw=FROM[i];
        var fx=W/2-7*u+f.x*360*u,fy=fanCY+f.y*360*u;
        var rx=x0+i*(cw+gap)+cw/2,ry=rowY+ch/2;
        var cx=fx+(rx-fx)*sp,cy=fy+(ry-fy)*sp;
        cx+=(1-t)*fw.x*W*.35;cy+=(1-t)*(H*.75+ch);
        var rot=f.r*(1-sp)+(1-t)*fw.r,sc=fanS+(1-fanS)*sp;
        c.style.zIndex=k+1;
        c.style.transform='translate('+(cx-cw/2).toFixed(1)+'px,'+(cy-ch/2).toFixed(1)+'px) rotate('+rot.toFixed(2)+'deg) scale('+sc.toFixed(3)+')';
        c.style.visibility=t<=0?'hidden':'';
        if(t<=0)reset(c);
        if(t>.3)play(c);
      });
    }
    var mio=null;
    function mobile(){
      title.style.transform='';title.style.removeProperty('--k');
      cards.forEach(function(c,i){c.style.zIndex='';c.style.visibility='';c.style.removeProperty('--cw');
        if(!c.__in&&!rm.matches)c.style.transform='translate('+(i%2?40:-40)+'vw,60px) rotate('+(i%2?24:-24)+'deg)';else c.style.transform='none'});
      if(!mio&&'IntersectionObserver' in window){mio=new IntersectionObserver(function(es){es.forEach(function(e){var c=e.target,i=cards.indexOf(c);if(e.isIntersecting){if(c.__in)return;c.__in=true;c.style.transform='none';clearTimeout(c.__t);c.__t=setTimeout(function(){play(c)},150)}else if(c.__in&&!rm.matches&&e.boundingClientRect.top>0){c.__in=false;clearTimeout(c.__t);c.style.transform='translate('+(i%2?40:-40)+'vw,60px) rotate('+(i%2?24:-24)+'deg)';reset(c)}})},{rootMargin:'0px 0px -15% 0px'});cards.forEach(function(c){mio.observe(c)})}
    }
    var raf=0;
    function run(){if(desk.matches){cards.forEach(function(c){c.style.transition='none'});layout()}else{cards.forEach(function(c){c.style.transition=''});mobile()}}
    addEventListener('scroll',function(){if(desk.matches&&!raf)raf=requestAnimationFrame(function(){raf=0;layout()})},{passive:true});
    addEventListener('resize',run);run();
    if(document.fonts&&document.fonts.ready)document.fonts.ready.then(run);
  })();

  // Заголовок «Про нас». Рядок плавно від'їжджає зліва направо на своє місце
  (function(){var ln=$('.ab-red h2 .in');if(!ln)return;var cur=0,tgt=0,raf=0;
    function calc(){var r=ln.getBoundingClientRect(),vh=innerHeight;tgt=Math.min(1,Math.max(0,(vh-r.top)/(vh*.55)));if(rm.matches)tgt=1;if(!raf)raf=requestAnimationFrame(tick)}
    function tick(){raf=0;cur+=(tgt-cur)*.12;if(Math.abs(tgt-cur)<.001)cur=tgt;ln.style.setProperty('--sl',cur.toFixed(4));if(cur!==tgt)raf=requestAnimationFrame(tick)}
    addEventListener('scroll',calc,{passive:true});addEventListener('resize',calc);calc()})();

  // Каруселі по колу
  $$('.car').forEach(function(car){
    var track=$('.car-track',car),busy=false,E='transform .45s cubic-bezier(.22,.61,.36,1)';
    if(!track.firstElementChild)return;
    function step(){return track.firstElementChild.getBoundingClientRect().width+(parseFloat(getComputedStyle(track).columnGap)||20)}
    $('.car-btn.next',car).addEventListener('click',function(){if(busy)return;busy=true;
      track.style.transition=E;track.style.transform='translateX(-'+step()+'px)';
      setTimeout(function(){track.style.transition='none';track.appendChild(track.firstElementChild);track.style.transform='none';busy=false},470)});
    $('.car-btn.prev',car).addEventListener('click',function(){if(busy)return;busy=true;var s=step();
      track.style.transition='none';track.insertBefore(track.lastElementChild,track.firstElementChild);track.style.transform='translateX(-'+s+'px)';
      void track.offsetWidth;track.style.transition=E;track.style.transform='none';setTimeout(function(){busy=false},470)});
  });
`;
