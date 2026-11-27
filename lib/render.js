// Збирає сторінки сайту з контенту. Один шаблон на тип сторінки.
import { sanitizeBody, slugify } from './sanitize.js';
import { createRequire } from 'node:module';

// Розміри і стиснені WebP-версії фото сайту. Якщо WebP є, віддаємо його, він у 2–3 рази легший
const IMGS = createRequire(import.meta.url)('./images.json');
const wp = (u) => { const k = String(u || '').split('?')[0]; return IMGS[k] && IMGS[k].webp ? k.replace(/\.jpg$/, '.webp') : u; };
const LAZY = ' loading="lazy" decoding="async"';
function srcset(u, sizes) {
  const k = String(u || '').split('?')[0], e = IMGS[k];
  if (!e || !e.sm) return '';
  return ` srcset="${k.replace(/\.jpg$/, '-' + e.sm + '.webp')} ${e.sm}w, ${k.replace(/\.jpg$/, '.webp')} ${e.w}w" sizes="${sizes}"`;
}
// Фото всередині статті. WebP і відкладене завантаження
const bodyImgs = (html) => html.replace(/<img\b([^>]*?)src="([^"]+)"([^>]*)>/g, (m, a, src, b) => `<img${a}src="${wp(src)}"${b}${/loading=/.test(m) ? '' : LAZY}>`);

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
// Зовнішні посилання відкриваються в новій вкладці без передачі адреси нашого сайту, тож сторінка запису Bookon відкривається так само, як при прямому заході
// Запис у Bookon відкривається в тій самій вкладці. У новій вкладці, відкритій із сайту, Bookon зависає на завантаженні
const sameTab = (u) => /^https?:\/\/([a-z0-9-]+\.)*bookon\.ua(\/|$)/i.test(u);
const extAttrs = (u) => (!isExt(u) ? '' : sameTab(u) ? ' rel="noreferrer"' : ' target="_blank" rel="noopener noreferrer"');

const CAL = '<svg viewBox="0 0 20 20" aria-hidden="true"><use href="#cal"/></svg>';
function bookBtn(c, label, href, cls = 'btn btn-red', extra = '') {
  const l = (label || '').trim() || c.settings.bookingLabel || 'Записатися онлайн';
  const h = url((href || '').trim() || c.settings.bookingUrl);
  return `<a class="${cls}${extra}" href="${esc(h)}"${extAttrs(h)}>${esc(l)}${CAL}</a>`;
}

const SPRITE = `<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <symbol id="mms-call" viewBox="0 0 24 24"><path fill="currentColor" d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/></symbol>
<symbol id="mms-pin" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/></symbol>
<symbol id="mms-globe" viewBox="0 0 24 24"><mask id="mmm-gl"><circle cx="12" cy="12" r="10" fill="#fff"/><g fill="none" stroke="#000" stroke-width="1.5"><path d="M2.5 12h19M12 2c2.8 2.8 4.1 6.1 4.1 10S14.8 19.2 12 22M12 2C9.2 4.8 7.9 8.1 7.9 12s1.3 7.2 4.1 10M4 7h16M4 17h16"/></g></mask><rect width="24" height="24" fill="currentColor" mask="url(#mmm-gl)"/></symbol>
<symbol id="mms-cal" viewBox="0 0 24 24"><path fill="currentColor" d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2zm-8 4H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z"/></symbol>
<symbol id="mms-x" viewBox="0 0 24 24"><path stroke="currentColor" stroke-width="1.4" d="M3.5 3.5l17 17M20.5 3.5l-17 17"/></symbol>
<symbol id="mms-tg" viewBox="0 0 24 24"><mask id="mmm-tg"><circle cx="12" cy="12" r="10.5" fill="#fff"/><path fill="#000" d="M6.1 11.6 16.9 7.3c.5-.2.9.1.8.7l-1.8 8.6c-.1.6-.6.7-1 .4l-3.1-2.3-1.5 1.5.2-2.8 4.4-4.1-5.6 3.4-2.3-.7c-.6-.2-.6-.6.1-.9z"/></mask><rect width="24" height="24" fill="currentColor" mask="url(#mmm-tg)"/></symbol>
<symbol id="mms-vb" viewBox="0 0 24 24"><mask id="mmm-vb"><path fill="#fff" d="M12 2c5.4 0 9.6 3.5 9.6 8.6 0 5.2-4.2 8.5-9.6 8.5h-1l-3.6 3.1c-.4.3-.9.1-.9-.4v-3.3C3.8 17.2 2.4 14.3 2.4 10.6 2.4 5.5 6.6 2 12 2z"/><path fill="#000" d="M15.3 13.4c-.55 0-1.07-.09-1.57-.25-.16-.05-.33-.01-.45.11l-.7.88c-1.26-.6-2.44-1.73-3.07-3.04l.87-.74c.12-.12.16-.3.11-.45-.17-.5-.25-1.02-.25-1.57 0-.24-.2-.44-.44-.44H8.25c-.24 0-.53.1-.53.44 0 4.13 3.44 7.57 7.57 7.57.32 0 .44-.28.44-.53v-1.54c0-.24-.2-.44-.44-.44z"/><g fill="none" stroke="#000" stroke-width="1.15" stroke-linecap="round"><path d="M12.6 6.3a3.7 3.7 0 0 1 3.6 3.6"/><path d="M12.6 4.6a5.4 5.4 0 0 1 5.3 5.3"/><path d="M12.6 8a2 2 0 0 1 1.9 1.9"/></g></mask><rect width="24" height="24" fill="currentColor" mask="url(#mmm-vb)"/></symbol>
<symbol id="mms-tt" viewBox="0 0 24 24"><path fill="currentColor" d="M16.6 2h-3.3v13.4a2.9 2.9 0 1 1-2-2.8V9.2a6.2 6.2 0 1 0 5.3 6.2V8.8a7.9 7.9 0 0 0 4.4 1.4V6.9a4.5 4.5 0 0 1-4.4-4.9z"/></symbol>
<symbol id="mms-fb" viewBox="0 0 24 24"><mask id="mmm-fb"><circle cx="12" cy="12" r="10.5" fill="#fff"/><path fill="#000" d="M13.4 23v-8.4h2.5l.4-2.9h-2.9V9.9c0-.85.25-1.4 1.45-1.4h1.55V5.9c-.27-.04-1.2-.12-2.27-.12-2.25 0-3.78 1.37-3.78 3.9v2.02H7.9v2.9h2.45V23z"/></mask><rect width="24" height="24" fill="currentColor" mask="url(#mmm-fb)"/></symbol>
<symbol id="mms-ig" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="2.3"><rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5"/><circle cx="12" cy="12" r="4.1"/></g><circle cx="17.3" cy="6.8" r="1.35" fill="currentColor"/></symbol>
  <symbol id="cal" viewBox="0 0 20 20"><g fill="none" stroke="currentColor" stroke-width="1.4"><rect x="2.5" y="3.8" width="15" height="13.7" rx="1.5"/><path d="M2.5 7.6h15M6.3 2v3.4M13.7 2v3.4"/></g><g fill="currentColor"><rect x="5" y="9.6" width="2" height="2"/><rect x="9" y="9.6" width="2" height="2"/><rect x="13" y="9.6" width="2" height="2"/><rect x="5" y="13.2" width="2" height="2"/><rect x="9" y="13.2" width="2" height="2"/><rect x="13" y="13.2" width="2" height="2"/></g></symbol>
  <symbol id="i-nav" viewBox="0 0 21 21"><path d="M19.2783 0.0271715C18.9111 0.128071 0.734518 7.3312 0.579331 7.43736C0.0388667 7.80697 -0.158565 8.57874 0.137758 9.16368C0.261295 9.40761 0.60332 9.75007 0.804604 9.8314C0.876835 9.86056 2.7281 10.3678 4.91854 10.9586C7.10894 11.5493 8.91533 12.0469 8.93266 12.0644C8.95 12.0818 9.43863 13.8599 10.0185 16.0156C10.5984 18.1713 11.105 20.0232 11.1445 20.1309C11.2359 20.3807 11.5558 20.7237 11.8243 20.8598C12.084 20.9914 12.4826 21.0372 12.7636 20.9678C13.0474 20.8976 13.3991 20.6588 13.5563 20.4295C13.6863 20.2398 20.8716 2.05707 20.9683 1.67318C21.0348 1.40898 20.9943 1.04168 20.8704 0.785756C20.7407 0.517786 20.4414 0.222095 20.185 0.108627C19.9623 0.0100922 19.4937 -0.031993 19.2783 0.0271715Z" fill-rule="evenodd" clip-rule="evenodd" fill="currentColor"/></symbol>
  <symbol id="i-pin" viewBox="0 0 16 22"><path d="M7.7 10.45C6.97065 10.45 6.27118 10.1603 5.75546 9.64454C5.23973 9.12882 4.95 8.42935 4.95 7.7C4.95 6.97065 5.23973 6.27118 5.75546 5.75546C6.27118 5.23973 6.97065 4.95 7.7 4.95C8.42935 4.95 9.12882 5.23973 9.64454 5.75546C10.1603 6.27118 10.45 6.97065 10.45 7.7C10.45 8.06114 10.3789 8.41873 10.2407 8.75238C10.1025 9.08603 9.89991 9.38918 9.64454 9.64454C9.38918 9.89991 9.08603 10.1025 8.75238 10.2407C8.41873 10.3789 8.06114 10.45 7.7 10.45ZM7.7 0C5.65783 0 3.69931 0.811248 2.25528 2.25528C0.811248 3.69931 0 5.65783 0 7.7C0 13.475 7.7 22 7.7 22C7.7 22 15.4 13.475 15.4 7.7C15.4 5.65783 14.5888 3.69931 13.1447 2.25528C11.7007 0.811248 9.74217 0 7.7 0Z" fill="currentColor"/></symbol>
  <symbol id="i-phone" viewBox="0 0 21 21"><path d="M3.49082 0.0333496C2.88345 0.141667 2.23279 0.45307 1.677 0.901422C1.29928 1.20612 0.8847 1.69069 0.641812 2.11142C0.228773 2.8268 0.0274692 3.61183 0.00267009 4.60396C-0.0426037 6.41552 0.487217 8.3003 1.64179 10.4348C2.17774 11.4257 2.99798 12.6554 3.72513 13.5582C3.81043 13.6642 3.90298 13.7794 3.93081 13.8144C4.26206 14.231 4.91702 14.9403 5.55883 15.5773C6.6936 16.7037 7.57213 17.4424 8.56338 18.1035C9.75284 18.8969 11.0407 19.5401 12.2647 19.9522C13.0725 20.2241 13.7671 20.3844 14.5582 20.4812C14.9288 20.5265 16.0286 20.5323 16.3515 20.4907C17.6943 20.3175 18.8716 19.7924 19.8081 18.9492C20.8245 18.034 21.223 16.8951 20.8787 15.8897C20.6458 15.2096 20.1655 14.7027 19.0467 13.9562C18.0714 13.3055 17.4568 13.0325 16.8074 12.9616C16.316 12.908 15.72 13.0328 15.1959 13.2992C14.7974 13.5017 14.5033 13.7448 14.1731 14.1445C13.9302 14.4386 13.807 14.5478 13.6148 14.6395C13.0175 14.9247 12.3599 14.7418 11.2069 13.9699C10.2194 13.3087 8.71568 12.0057 7.75036 10.9746C6.75976 9.91657 6.0893 8.95969 5.88011 8.30545C5.74982 7.89798 5.75505 7.63031 5.89899 7.33699C6.01097 7.10873 6.18862 6.94514 6.574 6.71531C7.05264 6.42985 7.30717 6.20162 7.5536 5.8369C7.68703 5.63943 7.78514 5.42221 7.84968 5.18141C7.91413 4.94086 7.9103 4.53628 7.84109 4.27603C7.74341 3.90878 7.45191 3.32707 6.72156 2.04206C6.46314 1.58735 6.20266 1.18264 6.04141 0.985289C5.79786 0.687166 5.45621 0.406505 5.15093 0.253734C5.01853 0.187473 4.71746 0.0846284 4.5355 0.0434946C4.29924 -0.0099158 3.76259 -0.0151215 3.49082 0.0333496Z" fill-rule="evenodd" clip-rule="evenodd" fill="currentColor"/></symbol>
  <symbol id="i-globe" viewBox="0 0 27 26"><path d="M13.814 0.100114C13.8032 0.182975 13.8098 6.09468 13.8207 6.12563C13.8329 6.16027 15.5358 6.0789 16.2714 6.00853C17.2151 5.91822 18.8403 5.66045 18.8403 5.60106C18.8403 5.57601 18.4992 4.89074 18.3958 4.7081C17.9676 3.95149 17.6009 3.40165 17.0586 2.70271C16.4148 1.87313 15.5431 0.992655 14.6709 0.291248L14.3466 0.030385L14.1504 0.0150999C13.8144 -0.0110455 13.8289 -0.014713 13.814 0.100114ZM11.9899 0.308331C10.4856 1.5185 9.27671 2.94041 8.3296 4.61345C8.29645 4.67202 8.17079 4.91537 8.05033 5.15423C7.876 5.49994 7.83802 5.59278 7.86419 5.60935C7.88224 5.6208 7.90508 5.63031 7.91492 5.63052C7.92474 5.63071 8.14301 5.66767 8.39997 5.71265C9.7274 5.94505 11.5594 6.12653 12.5878 6.12755L12.8067 6.12776V3.18527C12.8067 1.56688 12.7999 0.193362 12.7916 0.133003L12.7766 0.0232156H12.5604H12.3443L11.9899 0.308331ZM10.1556 0.283179C8.149 0.784201 6.38029 1.67698 4.80927 2.98181C4.54133 3.20437 3.55523 4.15185 3.55523 4.18677C3.55523 4.20095 3.94848 4.39584 4.2769 4.54441C4.61142 4.69572 5.3738 4.98966 5.6729 5.0826C6.31151 5.28105 6.76996 5.40532 6.78991 5.3854C6.79407 5.38123 6.86962 5.2298 6.95781 5.04886C7.81117 3.29814 8.75564 2.00009 10.2229 0.561504C10.4323 0.356221 10.5851 0.189411 10.5632 0.190097C10.5413 0.190783 10.3579 0.232687 10.1556 0.283179ZM16.5386 0.65655C17.8903 1.9756 18.9051 3.3717 19.6846 4.98488C19.8812 5.39155 19.8813 5.39181 19.9464 5.37096C19.9822 5.35949 20.1552 5.3107 20.3309 5.26257C20.7595 5.14509 21.5366 4.87992 21.9904 4.69624C22.4379 4.51512 23.0992 4.21055 23.0992 4.18559C23.0992 4.14906 22.5428 3.57003 22.3054 3.35947C20.9423 2.15072 19.6541 1.36179 18.0495 0.753229C17.5014 0.545343 16.2592 0.18721 16.0934 0.189245C16.0751 0.189482 16.2754 0.399781 16.5386 0.65655ZM2.77011 5.17793C1.56657 6.69728 0.624864 8.74178 0.244182 10.6619C0.13378 11.2188 0.0317296 12.0101 0.030239 12.321L0.029742 12.4216H2.61743H5.20509L5.22135 12.1199C5.31753 10.3358 5.63369 8.64091 6.16701 7.05054C6.28702 6.69267 6.38997 6.38529 6.39579 6.36745C6.40357 6.34364 6.3279 6.31454 6.11063 6.25778C5.18441 6.0158 4.12923 5.6164 3.29936 5.19372L2.91336 4.99709L2.77011 5.17793ZM23.3595 5.17756C22.5237 5.59281 21.7078 5.90658 20.6996 6.2004C20.4795 6.26457 20.2947 6.32169 20.2891 6.32734C20.2834 6.33299 20.3385 6.50603 20.4115 6.71183C20.7445 7.65077 20.9856 8.55446 21.1678 9.54678C21.3143 10.3443 21.4319 11.3325 21.4564 11.9706C21.4637 12.1601 21.4745 12.3391 21.4804 12.3685L21.4912 12.4218L24.0639 12.4158L26.6366 12.4098L26.6295 12.1613C26.616 11.681 26.4915 10.8678 26.3255 10.1738C26.0565 9.04966 25.5756 7.83244 24.9929 6.80118C24.7834 6.43045 24.2635 5.63985 24.0073 5.30256C23.766 4.98477 23.7719 4.99175 23.7473 4.99369C23.7357 4.99461 23.5612 5.07735 23.3595 5.17756ZM7.38323 6.66605C7.36246 6.72787 7.30236 6.89556 7.24964 7.03871C7.12012 7.39052 6.93904 7.97786 6.82292 8.42288C6.49635 9.67426 6.31624 10.8227 6.23944 12.1436L6.22325 12.4216H9.50269H12.7821L12.795 12.3684C12.8021 12.3391 12.8049 11.1492 12.8013 9.72423L12.7949 7.13335L12.3808 7.11653C10.6881 7.04777 8.94469 6.8555 7.70919 6.60129C7.58189 6.57509 7.46498 6.55366 7.44939 6.55366C7.43377 6.55366 7.40401 6.60422 7.38323 6.66605ZM18.7929 6.63756C17.4076 6.91728 15.9548 7.0653 13.9779 7.1281L13.8123 7.13335L13.8058 9.72423C13.8023 11.1492 13.8051 12.3391 13.8122 12.3684L13.825 12.4216H17.1408H20.4566L20.4413 12.0685C20.3951 11.0012 20.1458 9.42705 19.8551 8.36699C19.6175 7.50052 19.2855 6.55191 19.2213 6.55619C19.2004 6.55759 19.0077 6.59419 18.7929 6.63756ZM0.0162079 13.6342C0.0846593 14.8592 0.261951 15.7981 0.629431 16.8817C1.05914 18.1488 1.73688 19.3922 2.62659 20.5458C2.73841 20.6908 2.83118 20.8116 2.83275 20.8144C2.83431 20.8171 3.02147 20.7237 3.24866 20.6067C4.25394 20.0892 5.29853 19.6667 6.31766 19.3654C6.39901 19.3413 6.46554 19.3153 6.46554 19.3076C6.46554 19.2999 6.39531 19.1076 6.3095 18.8802C5.8751 17.7298 5.58712 16.6536 5.39171 15.4502C5.29179 14.835 5.21229 13.9908 5.21174 13.5396L5.21151 13.3444H2.60576H0L0.0162079 13.6342ZM6.23669 13.717C6.27346 14.6194 6.40667 15.551 6.64182 16.5504C6.80184 17.2305 7.16255 18.3267 7.43699 18.967L7.47892 19.0648L7.84316 18.9751C8.9044 18.7136 10.2547 18.4928 11.3752 18.3974C11.7435 18.3661 12.6004 18.3137 12.7505 18.3133L12.8007 18.3132L12.8183 16.2948C12.828 15.1847 12.828 14.0667 12.8184 13.8104L12.8009 13.3444H9.51121H6.22152L6.23669 13.717ZM13.8216 13.3503C13.8091 13.3798 13.8006 17.8028 13.8127 18.02L13.8285 18.3065L14.2818 18.3225C15.7926 18.3758 17.3743 18.5954 18.8126 18.9514C19.0252 19.004 19.2076 19.0418 19.218 19.0354C19.2898 18.991 19.7276 17.7396 19.9177 17.0355C20.2347 15.8608 20.3843 14.9169 20.4624 13.5987L20.4774 13.3444H17.1508C15.3211 13.3444 13.823 13.347 13.8216 13.3503ZM21.4799 13.6461C21.3858 15.5199 20.9899 17.3487 20.2997 19.0976L20.219 19.3023L20.6712 19.449C21.5387 19.7304 22.4001 20.0949 23.327 20.5727L23.8031 20.8183L23.8624 20.7547C23.9633 20.6466 24.4326 20.012 24.5996 19.758C25.0408 19.0868 25.583 18.062 25.8272 17.4377C26.079 16.7941 26.3033 16.057 26.432 15.4502C26.5473 14.906 26.6716 13.892 26.6719 13.4923L26.6721 13.3444H24.0836H21.495L21.4799 13.6461ZM12.298 19.299C11.3541 19.3442 10.3458 19.4605 9.35808 19.6382C8.86259 19.7273 7.91135 19.9354 7.88669 19.9601C7.86824 19.9785 8.17718 20.5839 8.44694 21.0579C9.40824 22.7468 10.6283 24.2239 12.3508 25.7842C12.5524 25.9667 12.5738 25.9797 12.6806 25.9853L12.7949 25.9912L12.8008 22.6372L12.8069 19.2833L12.6234 19.2878C12.5225 19.2902 12.3761 19.2953 12.298 19.299ZM13.8123 19.3129C13.8067 19.3291 13.8043 20.8384 13.8072 22.6668L13.8123 25.9912L13.9517 25.9848C14.0881 25.9785 14.0952 25.9746 14.283 25.8073C16.0477 24.2342 17.2302 22.8163 18.2562 21.0429C18.5437 20.546 18.845 19.9515 18.8178 19.9347C18.777 19.9095 18.2615 19.7894 17.811 19.7002C16.7666 19.4933 15.9455 19.3878 14.8415 19.3184C14.1415 19.2744 13.8263 19.2727 13.8123 19.3129ZM19.7721 20.3303C19.3756 21.1164 19.0674 21.6534 18.6133 22.3499C18.4375 22.6196 17.9415 23.3133 17.7891 23.5025C17.5825 23.7592 17.0421 24.394 16.8844 24.5654C16.6207 24.8519 15.7159 25.7621 15.6401 25.8171C15.6043 25.843 15.575 25.873 15.575 25.8838C15.575 25.9059 15.8609 25.846 16.261 25.7401C17.2403 25.4808 18.0056 25.1964 18.9263 24.7496C20.0827 24.1885 21.0486 23.5453 22.099 22.6369C22.3317 22.4356 23.1272 21.6483 23.1417 21.6048C23.1583 21.555 21.8236 20.9166 21.1254 20.6405C20.7962 20.5103 19.9104 20.2061 19.8606 20.2061C19.8464 20.2061 19.8066 20.262 19.7721 20.3303ZM6.31174 20.3931C5.69119 20.5938 5.12812 20.8094 4.60815 21.0453C4.25903 21.2037 3.63649 21.5116 3.53231 21.5775C3.50479 21.5949 3.55665 21.6602 3.78075 21.8905C4.75513 22.8919 5.6193 23.583 6.73764 24.2552C8.06022 25.0501 9.61586 25.6474 11.0077 25.8947C11.0827 25.908 11.0471 25.8661 10.5922 25.406C9.56601 24.3681 8.85251 23.5003 8.10653 22.3827C7.72814 21.8158 7.26774 21.0168 6.99893 20.4604C6.92265 20.3025 6.87504 20.2302 6.84804 20.2311C6.82637 20.2318 6.58503 20.3047 6.31174 20.3931Z" fill-rule="evenodd" clip-rule="evenodd" fill="currentColor"/></symbol>
  <symbol id="s-instagram" viewBox="0 0 24 24"><path d="M6.96 0H17.04C20.88 0 24 3.12 24 6.96V17.04C24 18.8859 23.2667 20.6562 21.9615 21.9615C20.6562 23.2667 18.8859 24 17.04 24H6.96C3.12 24 0 20.88 0 17.04V6.96C0 5.11409 0.733284 3.34379 2.03854 2.03854C3.34379 0.733284 5.11409 0 6.96 0ZM6.72 2.4C5.57427 2.4 4.47546 2.85514 3.6653 3.6653C2.85514 4.47546 2.4 5.57427 2.4 6.72V17.28C2.4 19.668 4.332 21.6 6.72 21.6H17.28C18.4257 21.6 19.5245 21.1449 20.3347 20.3347C21.1449 19.5245 21.6 18.4257 21.6 17.28V6.72C21.6 4.332 19.668 2.4 17.28 2.4H6.72ZM18.3 4.2C18.6978 4.2 19.0794 4.35804 19.3607 4.63934C19.642 4.92064 19.8 5.30218 19.8 5.7C19.8 6.09783 19.642 6.47936 19.3607 6.76066C19.0794 7.04197 18.6978 7.2 18.3 7.2C17.9022 7.2 17.5206 7.04197 17.2393 6.76066C16.958 6.47936 16.8 6.09783 16.8 5.7C16.8 5.30218 16.958 4.92064 17.2393 4.63934C17.5206 4.35804 17.9022 4.2 18.3 4.2ZM12 6C13.5913 6 15.1174 6.63214 16.2426 7.75736C17.3679 8.88258 18 10.4087 18 12C18 13.5913 17.3679 15.1174 16.2426 16.2426C15.1174 17.3679 13.5913 18 12 18C10.4087 18 8.88258 17.3679 7.75736 16.2426C6.63214 15.1174 6 13.5913 6 12C6 10.4087 6.63214 8.88258 7.75736 7.75736C8.88258 6.63214 10.4087 6 12 6ZM12 8.4C11.0452 8.4 10.1295 8.77928 9.45442 9.45442C8.77928 10.1295 8.4 11.0452 8.4 12C8.4 12.9548 8.77928 13.8705 9.45442 14.5456C10.1295 15.2207 11.0452 15.6 12 15.6C12.9548 15.6 13.8705 15.2207 14.5456 14.5456C15.2207 13.8705 15.6 12.9548 15.6 12C15.6 11.0452 15.2207 10.1295 14.5456 9.45442C13.8705 8.77928 12.9548 8.4 12 8.4Z" fill="currentColor"/></symbol>
  <symbol id="s-telegram" viewBox="0 0 24 24"><path d="M12 0C5.376 0 0 5.376 0 12C0 18.624 5.376 24 12 24C18.624 24 24 18.624 24 12C24 5.376 18.624 0 12 0ZM17.568 8.16C17.388 10.056 16.608 14.664 16.212 16.788C16.044 17.688 15.708 17.988 15.396 18.024C14.7 18.084 14.172 17.568 13.5 17.124C12.444 16.428 11.844 15.996 10.824 15.324C9.636 14.544 10.404 14.112 11.088 13.416C11.268 13.236 14.34 10.44 14.4 10.188C14.4083 10.1498 14.4072 10.1102 14.3968 10.0726C14.3863 10.0349 14.3668 10.0004 14.34 9.972C14.268 9.912 14.172 9.936 14.088 9.948C13.98 9.972 12.3 11.088 9.024 13.296C8.544 13.62 8.112 13.788 7.728 13.776C7.296 13.764 6.48 13.536 5.868 13.332C5.112 13.092 4.524 12.96 4.572 12.54C4.596 12.324 4.896 12.108 5.46 11.88C8.964 10.356 11.292 9.348 12.456 8.868C15.792 7.476 16.476 7.236 16.932 7.236C17.028 7.236 17.256 7.26 17.4 7.38C17.594 7.5352 17.5747 7.82996 17.5713 8.07838C17.5709 8.10627 17.5699 8.13372 17.568 8.16Z" fill="currentColor"/></symbol>
  <symbol id="s-viber" viewBox="0 0 22 24"><path d="M16.5912 0.618345C12.9088 -0.206115 9.09003 -0.206115 5.40758 0.618345L5.0108 0.706268C3.97469 0.937602 3.02301 1.45241 2.26172 2.19339C1.50042 2.93436 0.959392 3.87242 0.698857 4.90313C-0.232952 8.58734 -0.232952 12.4461 0.698857 16.1303C0.947349 17.1133 1.45119 18.0129 2.1592 18.7376C2.8672 19.4624 3.75414 19.9866 4.72989 20.2569L5.27415 23.5112C5.29152 23.6145 5.33624 23.7113 5.40364 23.7915C5.47104 23.8716 5.55867 23.9322 5.65739 23.9669C5.75611 24.0016 5.86231 24.0092 5.96495 23.9888C6.06758 23.9685 6.16289 23.9209 6.24094 23.8511L9.43745 20.9872C11.837 21.1323 14.2449 20.9401 16.5912 20.4163L16.9892 20.3284C18.0253 20.097 18.977 19.5822 19.7383 18.8412C20.4996 18.1003 21.0406 17.1622 21.3011 16.1315C22.233 12.4473 22.233 8.58852 21.3011 4.9043C21.0405 3.87345 20.4993 2.93528 19.7378 2.1943C18.9763 1.45331 18.0244 0.938581 16.988 0.70744L16.5912 0.618345ZM6.39544 4.80817C6.17791 4.77627 5.95603 4.82014 5.76691 4.93244H5.75052C5.31161 5.19035 4.91599 5.51508 4.5789 5.89725C4.298 6.22198 4.14584 6.55022 4.10604 6.86675C4.08263 7.05432 4.09902 7.24423 4.15403 7.42359L4.1751 7.43532C4.49112 8.36496 4.90312 9.25943 5.40641 10.1011C6.05566 11.2832 6.85423 12.3766 7.78243 13.3543L7.81052 13.3942L7.855 13.427L7.88192 13.4586L7.91469 13.4868C8.89433 14.4191 9.98853 15.2228 11.1709 15.8783C12.5228 16.6157 13.3432 16.9638 13.836 17.1092V17.1162C13.98 17.1608 14.1111 17.1807 14.2433 17.1807C14.6632 17.1505 15.0607 16.9796 15.3716 16.6954C15.752 16.3578 16.0739 15.9603 16.3244 15.5184V15.5102C16.5596 15.0647 16.4801 14.645 16.1406 14.3601C15.4594 13.7628 14.7221 13.2328 13.939 12.7775C13.4146 12.4927 12.8821 12.665 12.6667 12.9534L12.2067 13.5348C11.9703 13.8232 11.5419 13.7834 11.5419 13.7834L11.5302 13.7904C8.33371 12.9733 7.48045 9.73187 7.48045 9.73187C7.48045 9.73187 7.44066 9.29108 7.73678 9.066L8.31264 8.60176C8.58887 8.37668 8.78082 7.84445 8.4847 7.31926C8.03124 6.53548 7.50325 5.79741 6.9081 5.11532C6.77792 4.95515 6.59559 4.846 6.3931 4.807M11.7959 3.39906C11.6407 3.39906 11.4918 3.46082 11.3821 3.57074C11.2723 3.68067 11.2107 3.82976 11.2107 3.98521C11.2107 4.14067 11.2723 4.28976 11.3821 4.39969C11.4918 4.50961 11.6407 4.57137 11.7959 4.57137C13.2765 4.57137 14.5055 5.05553 15.4781 5.984C15.9779 6.49161 16.3677 7.093 16.6228 7.75184C16.8792 8.41185 16.9962 9.11641 16.9658 9.82214C16.9626 9.89911 16.9745 9.97597 17.0009 10.0483C17.0274 10.1207 17.0678 10.1871 17.1198 10.2438C17.225 10.3584 17.3712 10.4264 17.5264 10.4329C17.6816 10.4394 17.8331 10.3839 17.9475 10.2786C18.0618 10.1733 18.1297 10.0268 18.1362 9.87137C18.1712 9.00335 18.0273 8.13741 17.7137 7.32746C17.3986 6.5134 16.9188 5.77341 16.3045 5.15401L16.2928 5.14228C15.086 3.98756 13.5586 3.39906 11.7959 3.39906ZM11.7561 5.32633C11.6009 5.32633 11.452 5.38809 11.3423 5.49802C11.2325 5.60794 11.1709 5.75703 11.1709 5.91249C11.1709 6.06795 11.2325 6.21704 11.3423 6.32696C11.452 6.43689 11.6009 6.49864 11.7561 6.49864H11.776C12.8435 6.57484 13.6206 6.93122 14.1649 7.51621C14.7232 8.11877 15.0123 8.86788 14.9901 9.794C14.9865 9.94946 15.0447 10.1 15.152 10.2124C15.2592 10.3249 15.4066 10.3901 15.5618 10.3936C15.717 10.3972 15.8673 10.3389 15.9796 10.2315C16.0919 10.1241 16.157 9.97642 16.1605 9.82096C16.1886 8.60528 15.7977 7.55606 15.0228 6.71904V6.71669C14.2304 5.8656 13.1431 5.41543 11.8345 5.32751L11.8146 5.32516L11.7561 5.32633ZM11.7339 7.28995C11.6556 7.28303 11.5766 7.29199 11.5019 7.31628C11.4271 7.34058 11.3579 7.37973 11.2986 7.43138C11.2392 7.48303 11.1909 7.54612 11.1564 7.6169C11.122 7.68769 11.1021 7.7647 11.098 7.84334C11.0939 7.92198 11.1057 8.00064 11.1326 8.07462C11.1595 8.14861 11.2011 8.2164 11.2548 8.27395C11.3084 8.3315 11.3731 8.37762 11.445 8.40957C11.5168 8.44153 11.5944 8.45865 11.673 8.45992C12.1623 8.48571 12.4748 8.63342 12.6714 8.83154C12.8692 9.03083 13.0167 9.35087 13.0436 9.85144C13.0451 9.9301 13.0623 10.0077 13.0943 10.0795C13.1264 10.1513 13.1725 10.216 13.23 10.2696C13.2875 10.3232 13.3552 10.3647 13.429 10.3915C13.5029 10.4184 13.5813 10.43 13.6598 10.4259C13.7382 10.4217 13.815 10.4018 13.8856 10.3672C13.9562 10.3327 14.0191 10.2843 14.0706 10.2249C14.1221 10.1655 14.1611 10.0963 14.1854 10.0215C14.2096 9.94664 14.2186 9.86769 14.2117 9.78931C14.1743 9.08593 13.9542 8.4646 13.5036 8.0074C13.0506 7.5502 12.4338 7.32747 11.7339 7.28995Z" fill-rule="evenodd" clip-rule="evenodd" fill="currentColor"/></symbol>
  <symbol id="s-tiktok" viewBox="0 0 21 24"><path d="M16.6607 3.76C15.7454 2.71937 15.2409 1.3832 15.2411 0H11.1027V16.5333C11.0714 17.4283 10.6922 18.2761 10.0451 18.898C9.39789 19.5199 8.53339 19.8672 7.63393 19.8667C5.73214 19.8667 4.15179 18.32 4.15179 16.4C4.15179 14.1067 6.375 12.3867 8.66518 13.0933V8.88C4.04464 8.26667 0 11.84 0 16.4C0 20.84 3.69643 24 7.62054 24C11.8259 24 15.2411 20.6 15.2411 16.4V8.01333C16.9192 9.21313 18.934 9.85686 21 9.85333V5.73333C21 5.73333 18.4821 5.85333 16.6607 3.76Z" fill="currentColor"/></symbol>
  <symbol id="s-facebook" viewBox="0 0 24 24"><path d="M24 12.0301C24 5.38947 18.624 0 12 0C5.376 0 0 5.38947 0 12.0301C0 17.8526 4.128 22.7008 9.6 23.8195V15.6391H7.2V12.0301H9.6V9.02256C9.6 6.70075 11.484 4.81203 13.8 4.81203H16.8V8.42105H14.4C13.74 8.42105 13.2 8.96241 13.2 9.62406V12.0301H16.8V15.6391H13.2V24C19.26 23.3985 24 18.2737 24 12.0301Z" fill="currentColor"/></symbol>
</svg>`;

const ASSET_V = "m66";
// Шрифти лежать на самому сайті. Без запиту до Google Fonts текст з'являється помітно швидше
const CYR = 'U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116';
const LAT = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
const ff = (fam, file, w, r) => `@font-face{font-family:'${fam}';font-style:normal;font-weight:${w};font-display:swap;src:url(/fonts/${file}.woff2) format('woff2');unicode-range:${r}}`;
const FONTS = `<link rel="preload" href="/fonts/oswald-cyrillic.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/manrope-cyrillic.woff2" as="font" type="font/woff2" crossorigin>
<style>${ff('Oswald', 'oswald-cyrillic', '200 700', CYR)}${ff('Oswald', 'oswald-latin', '200 700', LAT)}${ff('Manrope', 'manrope-cyrillic', '200 800', CYR)}${ff('Manrope', 'manrope-latin', '200 800', LAT)}</style>`;

const ldTag = (o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;

function head({ title, description, css, image, canonical, type = 'website', ld = [], noindex = false, preload = '' }) {
  return `<!doctype html>
<html lang="uk">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
${description ? `<meta name="description" content="${esc(description)}">` : ''}
<meta name="robots" content="${noindex ? 'noindex,follow' : 'index,follow,max-image-preview:large'}">
${canonical ? `<link rel="canonical" href="${esc(canonical)}">` : ''}
<meta name="theme-color" content="#141414">
<meta property="og:type" content="${type}">
<meta property="og:locale" content="uk_UA">
<meta property="og:site_name" content="Злі Бороди">
<meta property="og:title" content="${esc(title)}">
${description ? `<meta property="og:description" content="${esc(description)}">` : ''}
${canonical ? `<meta property="og:url" content="${esc(canonical)}">` : ''}
${image ? `<meta property="og:image" content="${esc(image)}">` : ''}
<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">
<meta name="twitter:title" content="${esc(title)}">
${description ? `<meta name="twitter:description" content="${esc(description)}">` : ''}
${image ? `<meta name="twitter:image" content="${esc(image)}">` : ''}
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%23e20011'/%3E%3Ctext x='16' y='22' font-family='Arial' font-weight='700' font-size='15' fill='white' text-anchor='middle'%3EЗБ%3C/text%3E%3C/svg%3E">
${FONTS}
${preload}${[].concat(css).map((h) => `<link rel="stylesheet" href="${h}?v=${ASSET_V}">`).join('')}
<script>/* Висота екрана фіксується в пікселях і змінюється лише при зміні ширини, тож панель браузера, що ховається при скролі, не зсуває сторінку */
(function(){var w=0;function f(){if(innerWidth===w)return;w=innerWidth;document.documentElement.style.setProperty('--vh0',innerHeight+'px')}f();addEventListener('resize',f)})();</script>
${ld.filter(Boolean).map(ldTag).join('\n')}
</head>`;
}

function header(c, { home, scrolled, activeBlog }) {
  const s = c.settings;
  const nav = (s.nav || []).map((n) => {
    let h = url(n.href);
    if (!home && h.startsWith('#')) h = '/' + h;
    const active = activeBlog && /^\/blog\/?$/.test(h) ? ' active' : '';
    return `<a class="flip${active}" href="${esc(h)}"${extAttrs(h)}>${esc(n.label)}</a>`;
  }).join('\n      ');
  return `<header class="hdr${scrolled ? ' scrolled' : ''}" id="hdr" data-edit="settings">
  <div class="wrap">
    <a href="${home ? '#top' : '/'}" class="logo">${esc(s.brand1)} <span>${esc(s.brand2)}</span></a>
    <nav class="nav" id="nav">
      ${nav}
    </nav>
    ${s.phone ? `<span class="phone flip" data-copy="${esc(s.phone)}" role="button" tabindex="0" title="Скопіювати номер">${esc(s.phone)}</span>` : ''}
    ${bookBtn(c)}
    ${tel(s.phone || (c.footer || {}).phone) ? `<a class="hdr-call" href="tel:${esc(tel(s.phone || (c.footer || {}).phone))}" aria-label="Подзвонити"><svg><use href="#mms-call"/></svg></a>` : ''}
    <button class="burger" id="burger" aria-label="Меню" aria-controls="mm"><span></span><span></span></button>
  </div>
</header>
${mobileMenu(c, home)}`;
}

// Меню на телефоні. Плитки розділів, адреса з графіком, телефон, соцмережі і кнопка запису
// Варіант мобільного меню. 'glass' це скло з розмиттям, 'solid' це суцільний темний фон
const MM_VARIANT = 'solid';

function mobileMenu(c, home) {
  const s = c.settings, f = c.footer || {}, fu = c.findUs || {};
  const fix = (h) => (!home && h.startsWith('#') ? '/' + h : h);
  const list = (s.nav || []).filter((n) => !/^#(top|contacts)?$/.test((n.href || '').trim()));
  if (!list.some((n) => /^\/blog\/?$/.test(n.href || ''))) list.push({ label: 'Блог', href: '/blog' });
  const st = () => '';
  const items = list.map((n) => { const h = fix(url(n.href)); return `<a class="mm-t mm-st" href="${esc(h)}"${extAttrs(h)}${st()}>${esc(n.label)}</a>`; }).join('');
  const addr = fu.address || f.address || '', map = url(fu.mapUrl || '', '');
  const phone = f.phone || fu.phone || s.phone || '', tel = phone.replace(/[^+\d]/g, '');
  const soc = [['instagram', 'Instagram', 'ig'], ['telegram', 'Telegram', 'tg'], ['viber', 'Viber', 'vb'], ['tiktok', 'TikTok', 'tt'], ['facebook', 'Facebook', 'fb']]
    .map(([key, l, ic]) => { const h = url(f[key]); return `<a href="${esc(h)}"${extAttrs(h)} aria-label="${l}"><svg><use href="#mms-${ic}"/></svg></a>`; }).join('');
  const bk = url(s.bookingUrl);
  const cta = `<a class="btn btn-red mm-cta" href="${esc(bk)}"${extAttrs(bk)}${st()}>${esc(s.bookingLabel || 'Записатися онлайн')}<svg><use href="#mms-cal"/></svg></a>`;
  const card = `<div class="mm-card mm-st"${st()}><div class="mm-g2">
    <div><span class="mm-chip"><svg><use href="#mms-call"/></svg>${esc(f.contactsTitle || 'Контакти')}</span><p>${phone ? `<a href="tel:${esc(tel)}">${esc(phone)}</a>` : ''}${f.email ? `<br><a href="mailto:${esc(f.email)}">${esc(f.email)}</a>` : ''}</p></div>
    <div><span class="mm-chip"><svg><use href="#mms-pin"/></svg>${esc(f.addressTitle || 'Адреса')}</span><p>${phone ? `<a href="tel:${esc(tel)}">${esc(phone)}</a><br>` : ''}${map ? `<a href="${esc(map)}"${extAttrs(map)}>${esc(addr)}</a>` : esc(addr)}</p></div>
  </div>
  <div class="mm-row"><span class="mm-chip"><svg><use href="#mms-globe"/></svg>${esc(f.socialTitle || 'Соцмережі')}</span><div class="mm-socs">${soc}</div></div>
  ${cta}</div>`;
  return `<div class="mm-scrim" id="mmScrim"></div>
<aside class="mm${MM_VARIANT === 'glass' ? ' mm-glass' : ''}" id="mm" aria-label="Меню" aria-hidden="true"><div class="mm-in">
  <nav class="mm-nav">${items}</nav>
  ${card}
</div></aside>`;
}

// Карусель гортає по колу, тому елементів має бути щонайменше вісім
function loop(items, min = 8) {
  const out = items.map((it) => ({ it, dup: false }));
  if (!items.length) return out;
  while (out.length < min) for (const it of items) { if (out.length >= min) break; out.push({ it, dup: true }); }
  return out;
}

const COMMON_JS = `
  try{if(sessionStorage.getItem('zb-norv')){sessionStorage.removeItem('zb-norv');var R0=document.documentElement;R0.classList.add('no-rv');document.querySelectorAll('.rv').forEach(function(x){x.classList.add('in')});setTimeout(function(){R0.classList.remove('no-rv')},1500)}}catch(_){}
  document.querySelectorAll('.btn,.flip').forEach(function(b){var t=b.firstChild;if(!t||t.nodeType!==3)return;var v=t.nodeValue.trim();var w=document.createElement('span');w.className='bt';w.innerHTML='<span></span><span aria-hidden="true"></span>';w.firstChild.textContent=v;w.lastChild.textContent=v;b.replaceChild(w,t);});
  var hdr=document.getElementById('hdr');
  if(hdr){var mm=document.getElementById('mm'),mq860=matchMedia('(max-width:860px)');
    function mmSet(v){document.documentElement.classList.toggle('mm-open',v);if(mm)mm.setAttribute('aria-hidden',v?'false':'true')}
    document.getElementById('burger').addEventListener('click',function(){if(mm&&mq860.matches)return mmSet(!document.documentElement.classList.contains('mm-open'));hdr.classList.toggle('open')});
    hdr.querySelectorAll('.nav a').forEach(function(a){a.addEventListener('click',function(){hdr.classList.remove('open')})});
    if(mm){document.getElementById('mmScrim').addEventListener('click',function(){mmSet(false)});
      mm.querySelectorAll('.mm-t').forEach(function(e){e.addEventListener('click',function(){var R=document.documentElement;if(/^\\/?#/.test(e.getAttribute('href'))){R.classList.add('no-rv');document.querySelectorAll('.rv').forEach(function(x){x.classList.add('in')});setTimeout(function(){R.classList.remove('no-rv')},1500);setTimeout(function(){mmSet(false)},180);if(location.pathname!=='/'){try{sessionStorage.setItem('zb-norv','1')}catch(_){}}}else{try{sessionStorage.setItem('zb-norv','1')}catch(_){}}})});
      addEventListener('pageshow',function(){mmSet(false)});
      mq860.addEventListener&&mq860.addEventListener('change',function(){mmSet(false)});
      addEventListener('keydown',function(e){if(e.key==='Escape')mmSet(false)})}}
  // Перехід до блоку. Заголовок блоку стає на 70px нижче шапки і ніколи не ховається під нею
  function secTop(el){var y=0,e=el;while(e){y+=e.offsetTop;e=e.offsetParent}return y}
  function goTo(id,smooth){if(!id||id==='top'){scrollTo({top:0,behavior:smooth?'smooth':'instant'});return true}
    var sec=document.getElementById(id);if(!sec)return false;var t=sec.querySelector('h2,.h2,h1')||sec;
    var hh=hdr?hdr.getBoundingClientRect().height:0,y=Math.max(0,secTop(t)-hh-(innerWidth<=860?40:70));
    if(t===sec)y=Math.max(0,secTop(sec)-hh);
    scrollTo({top:y,behavior:smooth?'smooth':'instant'});return true}
  document.addEventListener('click',function(e){if(e.defaultPrevented||e.button||e.metaKey||e.ctrlKey||e.shiftKey)return;var a=e.target.closest&&e.target.closest('a[href]');if(!a)return;var h=a.getAttribute('href'),m=h.match(/^[/]?#([a-zA-Z0-9_-]+)$/);if(!m)return;
    if(h.charAt(0)==='/'&&location.pathname!=='/')return;if(goTo(m[1],true)){e.preventDefault();if(location.hash&&history.replaceState)history.replaceState(null,'',location.pathname+location.search)}});
  if(location.hash.length>1){var hid=location.hash.slice(1),nv=performance.getEntriesByType&&performance.getEntriesByType('navigation')[0];if(history.replaceState)history.replaceState(null,'',location.pathname+location.search);if(!nv||nv.type!=='reload')addEventListener('load',function(){setTimeout(function(){goTo(hid,false)},60)})}
  // Без цього Safari на iPhone не показує стан натискання кнопки
  document.addEventListener('touchstart',function(){},{passive:true});
  // Кнопка нагору з'являється після першого екрана
  var tg=document.getElementById('toTop');if(tg){var tgs=function(){tg.classList.toggle('on',scrollY>innerHeight*.8)};addEventListener('scroll',tgs,{passive:true});tgs();tg.addEventListener('click',function(){scrollTo({top:0,behavior:'smooth'})})}
  // Навігація статтею. Підсвічує розділ, який зараз читають. На телефоні після вибору список згортається
  var toc=document.querySelector('.toc');if(toc){var tl=[].slice.call(toc.querySelectorAll('.toc-l a')),hs=tl.map(function(a){return document.getElementById(a.getAttribute('href').slice(1))});
    var box=toc.querySelector('details'),mob=matchMedia('(max-width:860px)'),fab=document.getElementById('tocFab'),scr=document.getElementById('tocScrim');
         function tocSet(o){document.documentElement.classList.toggle('toc-open',o)}
         toc.querySelector('summary').addEventListener('click',function(e){e.preventDefault();if(e.target.closest('.toc-x'))tocSet(false)});
         if(fab)fab.addEventListener('click',function(){tocSet(true)});if(scr)scr.addEventListener('click',function(){tocSet(false)});
         addEventListener('keydown',function(e){if(e.key==='Escape')tocSet(false)});
    function spy(){var y=(hdr?hdr.offsetHeight:0)+90,k=0;hs.forEach(function(h,i){if(h&&h.getBoundingClientRect().top<=y)k=i});tl.forEach(function(a,i){a.classList.toggle('on',i===k)})}
    addEventListener('scroll',spy,{passive:true});spy();
    tl.forEach(function(a){a.addEventListener('click',function(){tocSet(false)})})}
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
<button class="to-top" id="toTop" aria-label="Нагору"><svg viewBox="0 0 24 24"><path d="M12 19V5M6 11l6-6 6 6"/></svg></button>
${SPRITE}
<script>
(function(){${js}})();
</script>
${preview ? PREVIEW_JS : ''}
</body>
</html>`;

const tel = (p) => String(p || '').replace(/[^\d+]/g, '');

// Перший рядок «Про нас». *Слово* стоїть на білій плашці. Без зірочок плашка йде до тире
function aboutLine1(t) {
  const v = String(t ?? '');
  if (v.includes('*')) return inline(v, { red: 'mark' });
  const m = v.match(/^(.+?)(\s+[–—-]\s+.*)$/);
  return m ? `<mark>${esc(m[1])}</mark>${esc(m[2])}` : esc(v);
}

const SOCIALS = [['instagram', 'Instagram'], ['telegram', 'Telegram'], ['viber', 'Viber'], ['tiktok', 'TikTok'], ['facebook', 'Facebook']];

// Справжня карта Google. Працює без ключа API, адресу беремо з блоку «Де нас знайти»
function mapEmbed(f) {
  let q = (f.mapQuery || '').trim();
  if (!q) { try { q = new URL(f.mapUrl).searchParams.get('query') || ''; } catch {} }
  if (!q) q = String(f.address || '').replace(/^м\.\s*/, '');
  return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&hl=uk&z=16&output=embed`;
}
const clampP = (v, d) => { const n = Number(v); return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : d; };

function footer(c, { home }) {
  const s = c.settings, f = c.footer;
  const fix = (h) => (!home && h.startsWith('#') ? '/' + h : h);
  const fnav = (f.nav || []).some((n) => /^\/blog\/?$/.test(n.href || '')) ? (f.nav || []) : [...(f.nav || []), { label: 'Блог', href: '/blog' }];
  const nav = fnav.map((n) => { const h = fix(url(n.href)); return `<li><a class="flip" href="${esc(h)}"${extAttrs(h)}>${esc(n.label)}</a></li>`; }).join('');
  const soc = SOCIALS.map(([k, name]) => { const h = url(f[k]); return `<a class="soc${k === 'instagram' ? ' on' : ''}" href="${esc(h)}"${extAttrs(h)} aria-label="${name}"><svg viewBox="0 0 24 24"><use href="#s-${k}"/></svg></a>`; }).join('');
  const links = (f.links || []).map((l) => { const h = (l.href || '').trim(); return h ? `<a class="chip-s" href="${esc(url(h))}"${extAttrs(h)}>${esc(l.label)}</a>` : `<span class="chip-s">${esc(l.label)}</span>`; }).join('');
  const mail = (f.email || '').trim();
  const mapHref = url(c.findUs.mapUrl), mapX = extAttrs(mapHref);
  return `<footer class="ftr" data-edit="footer">
  <div class="wrap">
    <div class="ftr-box">
      <a class="ftr-map" href="${esc(mapHref)}"${mapX} aria-label="${esc(f.city || "Львів")}, відкрити адресу на карті"><img class="ftr-sil" src="/img/map-lviv-silhouette.svg" alt=""><svg class="ftr-pin" style="left:${clampP(c.findUs.pinX, 45.2)}%;top:${clampP(c.findUs.pinY, 54)}%" viewBox="0 0 24 24"><use href="#i-pin"/></svg>${f.city ? `<b style="left:${clampP(c.findUs.pinX, 45.2)}%">${esc(f.city)}</b>` : ''}</a>
      <a class="ftr-brand" href="${home ? '#top' : '/'}">${esc(f.brand)}</a>
      <div class="ftr-nav">
        <h4 class="chip"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-nav"/></svg>${esc(f.navTitle)}</h4>
        <ul>${nav}</ul>
      </div>
      <div class="ftr-right">
        <div class="ftr-cols">
          <div>
            <h4 class="chip"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-pin"/></svg>${esc(f.addressTitle)}</h4>
            <p><a class="lt" href="${esc(mapHref)}"${mapX}>${esc(f.address)}</a>${f.hours ? `<br><span class="lt">${esc(f.hours)}</span>` : ''}</p>
          </div>
          <div>
            <h4 class="chip"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-phone"/></svg>${esc(f.contactsTitle)}</h4>
            <p>${f.phone ? `<a class="lt" href="tel:${esc(tel(f.phone))}">${esc(f.phone)}</a>` : ''}${mail ? `<br><a class="lt" href="mailto:${esc(mail)}">${esc(mail)}</a>` : ''}</p>
          </div>
        </div>
        <div class="ftr-soc">
          <h4 class="chip"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-globe"/></svg>${esc(f.socialTitle)}</h4>
          ${soc}
        </div>
        ${bookBtn(c, f.btnLabel, f.btnUrl, 'btn btn-red ftr-btn')}
      </div>
      <div class="ftr-legal">${f.copyright ? `<span class="chip-s">${esc(f.copyright)}</span>` : ''}${links}</div>
    </div>
  </div>
</footer>`;
}

// Якщо в адмінці лишились старі короткі заголовки для Google, беремо повніші, з містом і послугами
const SEO_UPGRADE = {
  'Злі Бороди Барбершоп': 'Барбершоп Злі Бороди у Львові. Чоловічі стрижки і борода',
  'Блог Злі Бороди': 'Блог барбершопу Злі Бороди у Львові. Поради про стрижки і бороду',
};
const seoT = (t) => SEO_UPGRADE[String(t || '').trim()] || t;
/* ------------------------- Розмітка для Google ------------------------- */
const DAYS = { 'пн': 'Mo', 'вт': 'Tu', 'ср': 'We', 'чт': 'Th', 'пт': 'Fr', 'сб': 'Sa', 'нд': 'Su' };
const DAY_ORDER = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const SCHEMA_DAYS = { Mo: 'Monday', Tu: 'Tuesday', We: 'Wednesday', Th: 'Thursday', Fr: 'Friday', Sa: 'Saturday', Su: 'Sunday' };
// «Пн–Нд 10:00–18:00» або «Пн–Пт 10:00–20:00, Сб–Нд 11:00–18:00» перетворюється на графік для Google
function hoursSpec(text) {
  const out = [];
  for (const part of String(text || '').split(/[,;\n]/)) {
    const m = part.trim().toLowerCase().match(/^(пн|вт|ср|чт|пт|сб|нд)(?:\s*[–—-]\s*(пн|вт|ср|чт|пт|сб|нд))?\s+(\d{1,2}:\d{2})\s*[–—-]\s*(\d{1,2}:\d{2})/);
    if (!m) continue;
    const a = DAY_ORDER.indexOf(DAYS[m[1]]), b = m[2] ? DAY_ORDER.indexOf(DAYS[m[2]]) : a;
    const days = []; for (let k = 0, n = (b - a + 7) % 7 + 1; k < n; k++) days.push(SCHEMA_DAYS[DAY_ORDER[(a + k) % 7]]);
    const pad = (t) => t.padStart(5, '0');
    out.push({ '@type': 'OpeningHoursSpecification', dayOfWeek: days, opens: pad(m[3]), closes: pad(m[4]) });
  }
  return out;
}
const priceNum = (t) => { const m = String(t || '').replace(/\s/g, '').match(/(\d+)/); return m ? Number(m[1]) : null; };

function orgRef(c, origin) { return { '@type': 'HairSalon', '@id': origin + '/#barbershop', name: plain(`${c.settings.brand1} ${c.settings.brand2}`) }; }

function businessLd(c, origin) {
  const s = c.settings, f = c.footer || {}, fu = c.findUs || {}, sv = c.services || {};
  const name = plain(`${s.brand1} ${s.brand2}`);
  const street = String(fu.address || f.address || '').replace(/^м\.\s*[^,]+,\s*/, '');
  const prices = (sv.items || []).map((it) => priceNum(it.price)).filter((n) => n);
  const phone = tel(f.phone || fu.phone || s.phone);
  const same = SOCIALS.map(([k]) => (f[k] || '').trim()).filter((u) => /^https?:/i.test(u));
  const ld = {
    '@context': 'https://schema.org', '@type': 'HairSalon', '@id': origin + '/#barbershop',
    name, alternateName: 'Angry Beards Barbershop',
    description: s.seoDescription || undefined,
    url: origin + '/',
    image: s.ogImage ? origin + url(s.ogImage, '') : undefined,
    telephone: phone || undefined,
    email: (f.email || '').trim() || undefined,
    address: { '@type': 'PostalAddress', streetAddress: street, addressLocality: fu.city || f.city || 'Львів', addressRegion: 'Львівська область', addressCountry: 'UA' },
    hasMap: fu.mapUrl || undefined,
    areaServed: { '@type': 'City', name: 'Львів' },
    openingHoursSpecification: hoursSpec(f.hours),
    priceRange: prices.length ? `${Math.min(...prices)}–${Math.max(...prices)} грн` : undefined,
    currenciesAccepted: 'UAH',
    sameAs: same.length ? same : undefined,
    potentialAction: s.bookingUrl ? { '@type': 'ReserveAction', target: { '@type': 'EntryPoint', urlTemplate: url(s.bookingUrl), inLanguage: 'uk' }, name: s.bookingLabel || 'Записатися онлайн' } : undefined,
    hasOfferCatalog: (sv.items || []).length ? {
      '@type': 'OfferCatalog', name: plain(sv.title) || 'Послуги',
      itemListElement: sv.items.map((it) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: it.name },
        priceSpecification: priceNum(it.price) ? { '@type': 'PriceSpecification', price: priceNum(it.price), minPrice: priceNum(it.price), priceCurrency: 'UAH' } : undefined })),
    } : undefined,
  };
  return ld;
}
const siteLd = (c, origin) => ({ '@context': 'https://schema.org', '@type': 'WebSite', '@id': origin + '/#website', name: plain(`${c.settings.brand1} ${c.settings.brand2}`), url: origin + '/', inLanguage: 'uk', publisher: { '@id': origin + '/#barbershop' } });
const crumbsLd = (origin, items) => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: origin + path })) });

// Карта сайту для Google. Головна, блог, усі опубліковані статті і юридичні сторінки
export function renderSitemap(c, origin) {
  const u = (path, lastmod, pr) => `  <url><loc>${esc(origin + path)}</loc>${lastmod ? `<lastmod>${esc(lastmod)}</lastmod>` : ''}${pr ? `<priority>${pr}</priority>` : ''}</url>`;
  const posts = visiblePosts(c, false);
  const newest = posts.map((p) => p.date).filter(Boolean).sort().pop();
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[u('/', '', '1.0'), u('/blog', newest, '0.8'), ...posts.map((p) => u(`/blog/${p.slug}`, p.date, '0.7')), u('/privacy', '', '0.2'), u('/oferta', '', '0.2')].join('\n')}
</urlset>`;
}
export const renderRobots = (origin) => `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/

Sitemap: ${origin}/sitemap.xml
`;

// Відео на першому екрані. На телефоні береться вирізана по центру легша версія (0,5 МБ замість 1,3 МБ).
// Браузер без підтримки media просто візьме перше джерело, тобто звичайне відео
function heroSources(v) {
  if (v.split('?')[0] !== '/hero.mp4') return `<source src="${esc(v)}" type="video/mp4">`;
  return `<source src="/hero.mp4?v=${ASSET_V}" type="video/mp4" media="(min-width:561px), (orientation:landscape)"><source src="/hero-m.mp4?v=${ASSET_V}" type="video/mp4">`;
}
/* ------------------------------ Головна ------------------------------ */
export function renderHome(c, { preview = false, origin = '' } = {}) {
  const s = c.settings, h = c.hero, w = c.why, wk = c.works, t = c.team, a = c.about, sv = c.services, f = c.findUs;
  const hMap = url(f.mapUrl || '', ''), hAddr = f.address || (c.footer || {}).address || '';
  const hStreet = hAddr.replace(/^\s*(м\.?|місто)\s*Львів,?\s*/i, '');
  const hChip = `<i aria-hidden="true"><svg viewBox="0 0 16 22"><use href="#i-pin"/></svg></i><span><b>Барбершоп у Львові</b><em>${esc(hStreet)}</em></span>`;
  const heroAddr = hAddr ? (hMap ? `<a class="hero-addr" href="${esc(hMap)}"${extAttrs(hMap)}>${hChip}</a>` : `<span class="hero-addr">${hChip}</span>`) : '';
  const whyLines = String(w.title || '').split(/\r?\n/).map((l) => `<span class="l">${inline(l, { red: 'span class="r"', dim: 'span class="d"' })}</span>`).join('');
  const cards = (w.cards || []).slice(0, 4).map((cd, i) => {
    if (i < 2) return `<article class="wc"><div class="ph" style="background-image:url('${esc(wp(url(cd.image, '')))}')"></div><h3>${inline(cd.title)}</h3><p>${esc(cd.text)}</p></article>`;
    const anim = i === 2 ? 'scissors' : 'face';
    return `<article class="wc art"><h3>${inline(cd.title)}</h3><div class="dr dr-${anim}"><img class="draw-end" src="/img/draw-${anim}-end.webp" alt="Злі Бороди"${LAZY}><video muted playsinline preload="auto" src="/img/draw-${anim}.mp4" aria-hidden="true"></video></div><p>${esc(cd.text)}</p></article>`;
  }).join('\n        ');
  const works = loop(wk.items || []).map(({ it, dup }) => `<div class="work"${dup ? ' aria-hidden="true"' : ''}><img src="${esc(wp(url(it.image, '')))}" alt="${dup ? '' : esc(it.alt || 'Злі Бороди')}"${LAZY}></div>`).join('\n          ');
  // Порожні місця в команді, повтори того самого барбера і барбери без фото показуються карткою «Скоро в команді»
  // Картка без фото це вільне місце. Показуємо рівно те, що в адмінці
  const tItems = (t.items || []).map((it) => (it.photo ? it : { ph: true }));
  const BPH = `<div class="b-ph" aria-hidden="true"><img src="/img/marquee-face.webp?v=${ASSET_V}" alt=""${LAZY}><span class="b-ph-x"><b>Місце<br>для майстра</b><small>Новий барбер уже скоро</small></span></div>`;
  const team = loop(tItems, 6).map(({ it, dup }) => it.ph
    ? `<article class="barber barber-ph"${dup ? ' aria-hidden="true"' : ''}>${BPH}<div class="cap"><h3>Місце вільне</h3><p>Новий барбер незабаром</p></div></article>`
    : `<article class="barber"${dup ? ' aria-hidden="true"' : ''}><img src="${esc(wp(url(it.photo, '')))}" alt="${dup ? '' : esc(it.name ? it.name + ', Злі Бороди' : 'Злі Бороди')}"${LAZY}><div class="cap"><h3>${esc(it.name)}</h3><p>${esc(it.role)}</p></div></article>`).join('\n          ');
  const svcs = (sv.items || []).map((it) => { const hr = url((it.url || '').trim() || sv.btnUrl || s.bookingUrl); return `<a class="svc" href="${esc(hr)}"${extAttrs(hr)}><span class="svc-n">${esc(it.name)}</span><span class="svc-p">${esc(it.price)}</span><span class="svc-i">${CAL}</span></a>`; }).join('\n        ');
  const mapHref = url(f.mapUrl);
  const pinX = 41, pinY = 27; // пін на карті «Де нас знайти» стоїть як у першому дизайні
  const paras = String(a.text || '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('\n        ');
  const arrows = (what) => `<div class="arrows">
            <button class="car-btn prev" aria-label="Попередні ${what}"><svg viewBox="0 0 24 24"><path d="M19 12H5M11 6l-6 6 6 6"/></svg></button>
            <button class="car-btn next" aria-label="Наступні ${what}"><svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
          </div>`;

  const poster = h.poster ? wp(url(h.poster, '')) : '';
  return `${head({ title: seoT(s.seoTitle) || 'Злі Бороди', description: s.seoDescription, css: '/css/site.css', image: s.ogImage ? origin + url(s.ogImage, '') : '', canonical: origin ? origin + '/' : '',
    ld: origin ? [businessLd(c, origin), siteLd(c, origin)] : [], preload: poster ? `<link rel="preload" as="image" href="${esc(poster)}" fetchpriority="high">\n` : '' })}
<body>

${header(c, { home: true })}

<main id="top">
  <section class="hero" aria-label="Головна" data-edit="hero"${h.poster ? ` style="background-image:url('${esc(wp(url(h.poster, '')))}?v=${ASSET_V}')"` : ''}>
    ${h.video ? `<video autoplay muted loop playsinline preload="auto"${h.poster ? ` poster="${esc(wp(url(h.poster, '')))}?v=${ASSET_V}"` : ''} aria-hidden="true">${heroSources(url(h.video, ''))}</video>` : ''}
    <div class="wrap">
      <div class="hero-in">
        ${heroAddr}
        <h1>${inline(h.title)}</h1>
        ${h.text ? `<p>${esc(h.text)}</p>` : ''}
        ${bookBtn(c, h.btnLabel, h.btnUrl)}
      </div>
    </div>
    <div class="hero-scroll" aria-hidden="true"><span>Скрол</span><svg viewBox="0 0 12 18" aria-hidden="true"><path d="M6 1v15M1 11l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.4"/></svg></div>
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

  <section class="services" id="services" data-edit="services">
    <div class="wrap">
      <h2 class="h2 rv">${inline(sv.title)}</h2>
      ${sv.lead ? `<p class="lead rv">${esc(sv.lead)}</p>` : ''}
      <div class="svc-grid rv">
        ${svcs}
      </div>
      <div class="cta-c rv">${bookBtn(c, sv.btnLabel, sv.btnUrl)}</div>
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
        <div class="team-foot center">
          ${arrows('барбери')}
        </div>
      </div>
    </div>
  </section>

  <section class="find" id="contacts" data-edit="findUs">
    <div class="wrap">
      <div class="find-box rv">
        <h2 class="find-t">${inline(f.title)}</h2>
        ${f.text ? `<p class="find-x">${esc(f.text)}</p>` : ''}
        <div class="find-geo">
        <a class="find-map" href="${esc(mapHref)}"${extAttrs(mapHref)} aria-label="Відкрити адресу на карті">
          <img src="/img/map-lviv.svg?v=${ASSET_V}" alt="Карта Львова" loading="lazy">
          <svg class="find-pin" style="left:${pinX}%;top:${pinY}%" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-pin"/></svg>
        </a>
        ${f.city ? `<div class="find-city" style="--px:${pinX}%">${esc(f.city)}</div>` : ''}
        </div>
        <div class="find-card">
          <div class="find-col">
            <span class="chip"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-pin"/></svg>${esc(f.addressLabel)}</span>
            <a class="ul" href="${esc(mapHref)}"${extAttrs(mapHref)}>${esc(f.address)}</a>
          </div>
          <div class="find-col">
            <span class="chip"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-phone"/></svg>${esc(f.phoneLabel)}</span>
            <a class="ul" href="tel:${esc(tel(f.phone))}">${esc(f.phone)}</a>
          </div>
          ${bookBtn(c, f.btnLabel, f.btnUrl, 'btn btn-dark')}
        </div>
      </div>
    </div>
  </section>

  <section class="about" id="about" data-edit="about">
    <div class="wrap">
      <div class="ab-red rv">
        <i class="cn tl"></i><i class="cn tr"></i><i class="cn bl"></i><i class="cn br"></i>
        ${a.label ? `<div class="ab-lbl" aria-hidden="true"><span>${esc(a.label)}</span><span>${esc(a.label)}</span><span>${esc(a.label)}</span></div>` : ''}
        <h2><span class="l">${aboutLine1(a.line1)}</span><span class="l in"><span>${esc(a.line2)}</span></span><span class="l">${esc(a.line3)}${a.inlineImage ? `<img src="${esc(wp(url(a.inlineImage, '')))}" alt="Злі Бороди"${LAZY}>` : ''}</span></h2>
        <div class="ab-mid" aria-hidden="true"><i></i><img class="ab-face" src="/img/logo-face-red.webp?v=4" alt="Злі Бороди"${LAZY}><i></i></div>
        <div class="ab-bot">
          ${a.subtitle ? `<h3>${esc(a.subtitle)}</h3>` : ''}
          ${paras}
        </div>
      </div>
      <div class="ab-photo rv"><img src="${esc(wp(url(a.photo, '')))}"${srcset(a.photo, '(max-width:860px) 100vw, 1380px')} alt="${esc(a.photoAlt || 'Злі Бороди')}"${LAZY}></div>
    </div>
  </section>
</main>
${footer(c, { home: true })}
${foot(preview, HOME_JS)}`;
}

/* ------------------------------ Блог ------------------------------ */
// Опис у картці статті завжди закінчується трьома крапками, а не обрізаним словом
function dots(t, max = 150) {
  let v = String(t || '').replace(/\s+/g, ' ').trim();
  if (v.length > max) { v = v.slice(0, max); v = v.slice(0, v.lastIndexOf(' ') > 60 ? v.lastIndexOf(' ') : max); }
  return v.replace(/[\s.,;:!?…-]+$/, '') + '...';
}
export const visiblePosts = (c, preview) => (c.posts || []).filter((p) => p.slug && (preview || p.published !== false));

export function renderBlog(c, { page = 1, preview = false, origin = '' } = {}) {
  const b = c.blog, per = Math.max(1, Number(b.perPage) || 8);
  const posts = visiblePosts(c, preview);
  const pages = Math.max(1, Math.ceil(posts.length / per));
  page = Math.min(Math.max(1, page | 0), pages);
  const list = posts.slice((page - 1) * per, page * per).map((p) => `<a class="post" href="/blog/${esc(p.slug)}">
        <span class="post-img">${p.cover ? `<img src="${esc(wp(url(p.cover, '')))}" alt="${esc(p.coverAlt || plain(p.title) || 'Злі Бороди')}"${LAZY}>` : ''}</span>
        <span class="post-t">${inline(p.title)}</span>
        ${p.excerpt ? `<span class="post-x">${esc(dots(p.excerpt))}</span>` : ''}
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
  const blogLd = origin ? [
    { '@context': 'https://schema.org', '@type': 'Blog', '@id': origin + '/blog#blog', name: plain(b.title), description: b.seoDescription || undefined, url: origin + '/blog', inLanguage: 'uk', publisher: orgRef(c, origin),
      blogPost: posts.slice(0, 20).map((p) => ({ '@type': 'BlogPosting', headline: plain(p.title), url: `${origin}/blog/${p.slug}`, datePublished: p.date || undefined })) },
    crumbsLd(origin, [['Головна', '/'], ['Блог', '/blog']]),
  ] : [];
  return `${head({ title: (seoT(b.seoTitle) || plain(b.title)) + (page > 1 ? ` | Сторінка ${page}` : ''), description: b.seoDescription, css: ['/css/site.css', '/blog/blog.css'], canonical: origin ? origin + href(page) : '', ld: blogLd, image: c.settings.ogImage && origin ? origin + url(c.settings.ogImage, '') : '' })}
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
${footer(c, { home: false })}
${foot(preview, COMMON_JS)}`;
}

// Заголовки H2 статті отримують якорі, з них збирається навігація справа
function withToc(html) {
  const toc = [], used = new Set();
  const out = html.replace(/<h2>([\s\S]*?)<\/h2>/g, (m, inner) => {
    const text = inner.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (!text) return m;
    let id = slugify(text).slice(0, 60) || 'rozdil', n = 2;
    while (used.has(id)) id = `${id.replace(/-\d+$/, '')}-${n++}`;
    used.add(id); toc.push({ id, text });
    return `<h2 id="${id}">${inner}</h2>`;
  });
  return { html: out, toc };
}

function moreBlock(c, p, preview) {
  const others = visiblePosts(c, preview).filter((x) => x.slug !== p.slug).slice(0, 4);
  if (!others.length) return '';
  const cards = others.map((o) => `<a class="post" href="/blog/${esc(o.slug)}">
        <span class="post-img">${o.cover ? `<img src="${esc(wp(url(o.cover, '')))}" alt="${esc(o.coverAlt || plain(o.title))}"${LAZY}>` : ''}</span>
        <span class="post-t">${inline(o.title)}</span>
        ${o.excerpt ? `<span class="post-x">${esc(dots(o.excerpt))}</span>` : ''}
      </a>`).join('\n      ');
  return `<aside class="more" aria-label="Читайте також">
    <h2 class="more-t">Читайте також</h2>
    <div class="posts more-p">
      ${cards}
    </div>
  </aside>`;
}

export function renderPost(c, slug, { preview = false, origin = '' } = {}) {
  const p = visiblePosts(c, preview).find((x) => x.slug === slug);
  if (!p) return null;
  const t = plain(p.title);
  const cta = bookBtn(c, p.ctaLabel, p.ctaUrl, 'btn btn-red', ' art-cta');
  const { html: body, toc } = withToc(bodyImgs(sanitizeBody(p.body)));
  const img = p.cover ? origin + url(p.cover, '') : '';
  const postLd = origin ? [
    { '@context': 'https://schema.org', '@type': 'BlogPosting', headline: t, description: p.seoDescription || p.excerpt || undefined, image: img || undefined,
      datePublished: p.date || undefined, dateModified: p.updated || p.date || undefined, inLanguage: 'uk',
      mainEntityOfPage: { '@type': 'WebPage', '@id': `${origin}/blog/${p.slug}` },
      author: orgRef(c, origin), publisher: orgRef(c, origin), isPartOf: { '@id': origin + '/blog#blog' } },
    crumbsLd(origin, [['Головна', '/'], ['Блог', '/blog'], [t, `/blog/${p.slug}`]]),
  ] : [];
  return `${head({ title: p.seoTitle || t, description: p.seoDescription || p.excerpt, css: ['/css/site.css', '/blog/blog.css'], image: img, canonical: origin ? `${origin}/blog/${p.slug}` : '', type: 'article', ld: postLd })}
<body>
${header(c, { scrolled: true, activeBlog: true })}

<main class="page page-art wrap" data-edit="post">
  <nav class="crumbs" aria-label="Навігація сторінками"><a href="/">Головна</a><i aria-hidden="true"></i><a href="/blog">Блог</a><i aria-hidden="true"></i><span aria-current="page">${esc(t)}</span></nav>
  <div class="art-wrap">
    <div class="art-col"><h1 class="ttl art-ttl">${inline(p.title)}</h1>
    <article class="art">
${body}
    </article></div>
    ${toc.length > 1 ? `<aside class="toc" id="toc" aria-label="Зміст статті"><details class="toc-box" open><summary class="toc-t">Зміст статті<button class="toc-x" type="button" aria-label="Закрити"><svg viewBox="0 0 16 16"><path d="M3 3l10 10M13 3L3 13"/></svg></button></summary><nav class="toc-l">${toc.map((t) => `<a href="#${t.id}">${esc(t.text)}</a>`).join('')}</nav></details></aside>` : ''}
  </div>
  ${toc.length > 1 ? `<div class="toc-scrim" id="tocScrim"></div><button class="toc-fab" id="tocFab" type="button" aria-controls="toc">Навігація<svg viewBox="0 0 20 20"><path d="M3 5h14M3 10h14M3 15h9"/></svg></button>` : ''}
  ${moreBlock(c, p, preview)}
</main>
${footer(c, { home: false })}
${foot(preview, COMMON_JS)}`;
}

// Юридичні сторінки. Політика конфіденційності і договір оферти
export function renderLegal(c, kind, { preview = false, origin = '' } = {}) {
  const l = c.legal, isOffer = kind === 'offer';
  const title = isOffer ? l.offerTitle : l.privacyTitle, body = isOffer ? l.offerBody : l.privacyBody;
  const path = isOffer ? '/oferta' : '/privacy';
  return `${head({ title: `${plain(title)} | Злі Бороди`, css: ['/css/site.css', '/blog/blog.css'], canonical: origin ? origin + path : '' })}
<body>
${header(c, { scrolled: true })}

<main class="page wrap" data-edit="legal">
  <nav class="crumbs" aria-label="Навігація сторінками"><a href="/">Головна</a><i aria-hidden="true"></i><span aria-current="page">${esc(plain(title))}</span></nav>
  <article class="art legal">
    <h1 class="ttl">${inline(title)}</h1>
${sanitizeBody(body)}
  </article>
</main>
${footer(c, { home: false })}
${foot(preview, COMMON_JS)}`;
}

export function render404(c, opts = {}) {
  return `${head({ title: 'Сторінку не знайдено', css: ['/css/site.css', '/blog/blog.css'], noindex: true })}
<body>
${header(c, { scrolled: true })}
<main class="page wrap">
  <h1 class="ttl">Сторінку не знайдено</h1>
  <p class="empty">Можливо, її перенесли або видалили. <a class="ul" href="/">На головну</a></p>
</main>
${footer(c, { home: false })}
${foot(opts.preview, COMMON_JS)}`;
}

const HOME_JS = String.raw`
  document.documentElement.classList.add('js');
  var $=function(s,c){return (c||document).querySelector(s)},$$=function(s,c){return Array.prototype.slice.call((c||document).querySelectorAll(s))};
  var rm=matchMedia('(prefers-reduced-motion:reduce)');
` + COMMON_JS + String.raw`
  // Бігущий рядок. Дві однакові половини, щоб стрічка йшла без шва
  var mq=$('#mq');if(mq){var src=mq.getAttribute('data-src'),h='';if(/marquee-unit\.png$/.test(src)){for(var i=0;i<16;i++)h+='<span class="mq-u"><img src="/img/marquee-face.webp" alt="Злі Бороди"><b>Злі Бороди</b></span>';}else if(src){for(var i=0;i<16;i++)h+='<img src="'+src+'" alt="Злі Бороди">';}mq.innerHTML=h;}

  // Поява при скролі
  var rv=$$('.rv');
  if('IntersectionObserver' in window){
    var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{rootMargin:matchMedia('(max-width:560px)').matches?'0px 0px 40px 0px':'0px 0px 40px 0px',threshold:0});
    rv.forEach(function(el,i){var p=el.parentElement;el.style.transitionDelay=(Array.prototype.indexOf.call(p.children,el)%4)*110+'ms';io.observe(el)});
  } else rv.forEach(function(el){el.classList.add('in')});
  // Телефон. При натисканні послуга коротко світиться червоним, а після повернення на сайт підсвітка знята
  (function(){var sv=$$('.svc');if(!sv.length)return;var touch=matchMedia('(hover:none)').matches,root=document.documentElement;
    function off(){root.classList.add('no-tr');sv.forEach(function(e){e.classList.remove('tap');e.blur()});requestAnimationFrame(function(){requestAnimationFrame(function(){root.classList.remove('no-tr')})})}
    sv.forEach(function(e){
      e.addEventListener('click',function(ev){e.classList.add('tap');
        if(touch&&!e.getAttribute('target')&&!ev.metaKey&&!ev.ctrlKey){ev.preventDefault();var h=e.href;setTimeout(function(){location.href=h},220)}
        else setTimeout(function(){e.classList.remove('tap')},900)})});
    addEventListener('pagehide',off);addEventListener('pageshow',off);document.addEventListener('visibilitychange',function(){if(!document.hidden)off()})})();

  // Шапка
  addEventListener('scroll',function(){hdr.classList.toggle('scrolled',scrollY>40)},{passive:true});

  // Блок переваг. Картки по черзі вилітають знизу у віяло, потім розкладаються в ряд
  (function(){
    var sec=$('#advantages');if(!sec)return;var stage=$('.why-stage',sec),title=$('.why-title',sec),cards=$$('.wc',sec);
    var desk=matchMedia('(min-width:861px), (max-width:560px)');
    var FAN=[{x:-.274,y:.011,r:-10},{x:-.059,y:-.214,r:-2},{x:0,y:0,r:0},{x:.321,y:-.119,r:10}];
    // Черга вильоту. Кожна наступна лягає зверху на попередню, і в цьому ж порядку картки стають у ряд. Фото, анімація, фото, анімація
    var ORDER=[1,3,0,2];
    var FROM=[{x:-.9,r:-38},{x:-.25,r:-14},{x:.15,r:12},{x:.9,r:34}];
    function clamp(v){return v<0?0:v>1?1:v}
    function eo(t){return 1-Math.pow(1-t,3)}
    function eio(t){return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2}
    function reset(c){var v=$('video',c);if(!v||!c.__played)return;c.__played=false;try{v.pause();v.currentTime=0}catch(_){}v.style.display='';var e=$('.draw-end',c);if(e)e.style.opacity=0}
    function play(c){var v=$('video',c);if(!v||c.__played)return;c.__played=true;
      if(rm.matches){$('.draw-end',c).style.opacity=1;v.style.display='none';return}
      try{v.currentTime=G?.4:0;if(v.duration>1.5)v.playbackRate=v.duration/(v.duration-1);var p=v.play();if(p&&p.catch)p.catch(function(){$('.draw-end',c).style.opacity=1;v.style.display='none'})}catch(_){}}
    // Телефон. Картки так само вилітають у віяло поверх заголовка, а потім розкладаються сіткою два на два
    // Телефон. Великі картки по черзі вилітають і лягають віялом одна на одну поверх заголовка, далі звичайний скрол
    // Розміри рахуються лише при зміні екрана, під час скролу тільки зсуваються картки
    var G=null;
    function absTop(e){var y=0;while(e){y+=e.offsetTop;e=e.offsetParent}return y}
    // На телефоні стрічка переїжджає всередину закріпленої сцени, тож лишається видно, поки вилітають картки
    var MQ=document.querySelector('.mq'),mqHome=MQ&&MQ.parentNode,mqNext=MQ&&MQ.nextSibling;
    function mqIn(){if(MQ&&MQ.parentNode!==stage){stage.insertBefore(MQ,stage.firstChild);MQ.classList.add('in-why')}}
    function mqOut(){if(MQ&&MQ.parentNode===stage){mqHome.insertBefore(MQ,mqNext);MQ.classList.remove('in-why')}}
    function measure(){
      mqIn();
      var hd=document.querySelector('.hdr'),hb=hd?hd.offsetHeight:0;
      stage.style.top=hb+'px';stage.style.height='calc(var(--vh0,100svh) - '+hb+'px)';
      var W=innerWidth,H=stage.clientHeight,u=W/375,M=15,mh=MQ?MQ.offsetHeight:0;
      // Віяло разом з нахилом карток вписується в екран з полями 15px з обох боків
      var lo=1e9,hi=-1e9;
      FAN.forEach(function(f){var a=Math.abs(f.r*Math.PI/180),e=(Math.cos(a)+1.15*Math.sin(a))/2;lo=Math.min(lo,f.x-.04-e);hi=Math.max(hi,f.x-.04+e)});
      var cw=Math.min(W*.6,(W-2*M)/(hi-lo)),ch=cw*1.15,x0=M-cw*lo;
      // Заголовок теж займає рівно ширину між полями
      title.style.setProperty('--k',u+'px');
      var mw=0;title.querySelectorAll('.l').forEach(function(l){var rg=document.createRange();rg.selectNodeContents(l);mw=Math.max(mw,rg.getBoundingClientRect().width)});
      if(mw>0)title.style.setProperty('--k',(u*(W-2*M)/mw)+'px');
      var th=title.offsetHeight;
      // Віяло починається під заголовком, жодна картка не налазить на текст
      var up=0;FAN.forEach(function(f){var a=Math.abs(f.r*Math.PI/180);up=Math.max(up,-f.y*cw+(cw*Math.sin(a)+ch*Math.cos(a))/2)});
      var fy=th+Math.round(th*.18)+up,bot=0;
      cards.forEach(function(c,i){c.style.setProperty('--cw',cw+'px');var f=FAN[i],a=Math.abs(f.r*Math.PI/180);
        bot=Math.max(bot,fy+f.y*cw+(cw*Math.sin(a)+ch*Math.cos(a))/2)});
      // Під стрічкою до заголовка до 80px, а якщо екран низький, менше. Під картками лишається щонайменше 50px повітря
      var g=Math.max(28,Math.min(80,H-mh-bot-50)),t0=mh+g,fanCY=t0+fy;bot+=t0;
      sec.style.marginTop='';
      title.style.transform='translate3d(0,'+t0.toFixed(1)+'px,0)';
      // Від нижнього краю карток до наступного блоку рівно 110px, як і між іншими блоками
      var nx=sec.nextElementSibling,hh=nx&&nx.querySelector('h2,.h2'),pt=hh?absTop(hh)-absTop(nx):0;
      sec.style.marginBottom=Math.round(110-pt-(H-bot))+'px';
      G={W:W,H:H,cw:cw,ch:ch,fanCY:fanCY,x0:x0,hb:hb};
    }
    function phone(){
      if(!G||G.W!==innerWidth||G.H!==stage.clientHeight)measure();
      var W=G.W,H=G.H,cw=G.cw,ch=G.ch,fanCY=G.fanCY,x0=G.x0;
      var r=sec.getBoundingClientRect(),tot=sec.offsetHeight-H,p=Math.max(-.3,Math.min(1,(G.hb-r.top)/Math.max(1,tot)));
      if(rm.matches)p=1;
      cards.forEach(function(c,i){
        var k=ORDER.indexOf(i),t=eo(clamp((p-(-.02+k*.235))/.26)),f=FAN[i],fw=FROM[i];
        var cx=x0+(f.x-.04)*cw,cy=fanCY+f.y*cw;
        // Картка виїжджає з-під нижнього краю екрана на своє місце. До старту її повністю не видно
        var from=(innerHeight-G.hb)+ch*.75-cy;
        cx+=(1-t)*fw.x*cw*.35;cy+=(1-t)*from;
        var rot=f.r+(1-t)*fw.r*.4;
        if(c.__z!==k+1){c.__z=k+1;c.style.zIndex=k+1}
        c.style.transform='translate3d('+(cx-cw/2).toFixed(1)+'px,'+(cy-ch/2).toFixed(1)+'px,0) rotate('+rot.toFixed(2)+'deg)';
        var vis=t<=0?'hidden':'';if(c.__v!==vis){c.__v=vis;c.style.visibility=vis}
        if(t<=0)reset(c);
        if(t>.02)play(c);
      });
    }
    function layout(){
      if(innerWidth<=560)return phone();
      G=null;sec.style.marginTop='';mqOut();stage.style.top='';stage.style.height='';cards.forEach(function(c){if(c.__o!==undefined){c.__o=undefined;c.style.opacity=''}});
      var W=innerWidth,H=stage.clientHeight,u=Math.min(W/1440,H/860,1.25);
      var r=sec.getBoundingClientRect(),tot=sec.offsetHeight-H,p=clamp(-r.top/Math.max(1,tot));
      if(rm.matches)p=1;
      var pad=Math.max(20,W*.014),gap=Math.round(30*W/1440),cw=Math.min(380,(W-pad*2-gap*3)/4),ch=cw*166/150;
      var tH=113*u*2;
      var blockH=640*u,t0=Math.max(80,(H-blockH)/2),fanCY=t0+384*u,fanS=360*u/cw;
      var t1=Math.max(76,(H-(tH+44*u+ch))/2),rowY=t1+tH+44*u;
      // Під розкладеними картками до наступного блоку рівно 170px
      var gapB=H-(rowY+ch);sec.style.marginBottom=Math.max(0,Math.round(170-gapB))+'px';
      var sp=eio(clamp((p-.6)/.24));
      title.style.setProperty('--k',u+'px');
      var tt=t0-20*u;title.style.transform='translateY('+(tt+(t1-tt)*sp).toFixed(1)+'px)';
      var x0=(W-(cw*4+gap*3))/2;
      cards.forEach(function(c,i){
        c.style.setProperty('--cw',cw+'px');
        var k=ORDER.indexOf(i),t=eo(clamp((p-(.05+k*.12))/.15)),f=FAN[i],fw=FROM[i];
        var fx=W/2-7*u+f.x*360*u,fy=fanCY+f.y*360*u;
        var rx=x0+k*(cw+gap)+cw/2,ry=rowY+ch/2;
        var cx=fx+(rx-fx)*sp,cy=fy+(ry-fy)*sp;
        cx+=(1-t)*fw.x*W*.35;cy+=(1-t)*(H*.75+ch);
        var rot=f.r*(1-sp)+(1-t)*fw.r,sc=fanS+(1-fanS)*sp;
        c.style.zIndex=k+1;
        c.style.transform='translate('+(cx-cw/2).toFixed(1)+'px,'+(cy-ch/2).toFixed(1)+'px) rotate('+rot.toFixed(2)+'deg) scale('+sc.toFixed(3)+')';
        c.style.visibility=t<=0?'hidden':'';
        if(t<=0)reset(c);
        if(t>.02)play(c);
      });
    }
    var mio=null;
    function mobile(){
      title.style.transform='';title.style.removeProperty('--k');sec.style.marginBottom='';sec.style.marginTop='';mqOut();stage.style.top='';stage.style.height='';cards.forEach(function(c){c.__o=undefined;c.style.opacity=''});
      cards.forEach(function(c,i){c.style.zIndex='';c.style.visibility='';c.style.removeProperty('--cw');
        if(!c.__in&&!rm.matches)c.style.transform='translate('+(i%2?40:-40)+'vw,60px) rotate('+(i%2?24:-24)+'deg)';else c.style.transform='none'});
      if(!mio&&'IntersectionObserver' in window){mio=new IntersectionObserver(function(es){es.forEach(function(e){var c=e.target,i=cards.indexOf(c);if(e.isIntersecting){if(c.__in)return;c.__in=true;c.style.transform='none';clearTimeout(c.__t);c.__t=setTimeout(function(){play(c)},150)}else if(c.__in&&!rm.matches&&e.boundingClientRect.top>0){c.__in=false;clearTimeout(c.__t);c.style.transform='translate('+(i%2?40:-40)+'vw,60px) rotate('+(i%2?24:-24)+'deg)';reset(c)}})},{rootMargin:'0px 0px -15% 0px'});cards.forEach(function(c){mio.observe(c)})}
    }
    var raf=0;
    function run(){G=null;if(desk.matches){cards.forEach(function(c){c.style.transition='none'});layout()}else{cards.forEach(function(c){c.style.transition=''});mobile()}}
    addEventListener('scroll',function(){if(desk.matches&&!raf)raf=requestAnimationFrame(function(){raf=0;layout()})},{passive:true});
    addEventListener('resize',run);run();
    if(document.fonts&&document.fonts.ready)document.fonts.ready.then(run);
  })();

  // Заголовок «Про нас». Рядок «де зароджується» виїжджає зліва направо на своє місце один раз і назад не повертається
  (function(){var ln=$('.ab-red h2 .in');if(!ln)return;var cur=0,tgt=0,raf=0;
    function calc(){var r=ln.getBoundingClientRect(),vh=innerHeight;tgt=Math.max(tgt,Math.min(1,Math.max(0,(vh-r.top)/(vh*.55))));if(rm.matches)tgt=1;if(!raf)raf=requestAnimationFrame(tick)}
    function tick(){raf=0;cur+=(tgt-cur)*.12;if(Math.abs(tgt-cur)<.001)cur=tgt;ln.style.setProperty('--sl',cur.toFixed(4));if(cur!==tgt)raf=requestAnimationFrame(tick)}
    addEventListener('scroll',calc,{passive:true});addEventListener('resize',calc);calc()})();

  // Каруселі по колу
  $$('.car').forEach(function(car){
    var track=$('.car-track',car),busy=false,E='transform .45s cubic-bezier(.22,.61,.36,1)';
    if(!track.firstElementChild)return;
    function step(){return track.firstElementChild.getBoundingClientRect().width+(parseFloat(getComputedStyle(track).columnGap)||20)}
    // На телефоні карусель гортається нативно, стрілки просто прокручують на одну картку, по колу
    var nat=matchMedia('(max-width:560px)'),cv=$('.car-view',car);
    // На телефоні стрілка неактивна, коли далі гортати нікуди
    var bp=$('.car-btn.prev',car),bn=$('.car-btn.next',car);
    function ends(){var on=nat.matches,max=cv.scrollWidth-cv.clientWidth-2;bp.classList.toggle('off',on&&cv.scrollLeft<=2);bn.classList.toggle('off',on&&cv.scrollLeft>=max)}
    cv.addEventListener('scroll',ends,{passive:true});addEventListener('resize',ends);ends();
    function natGo(d){cv.scrollBy({left:d*step(),behavior:'smooth'})}
    $('.car-btn.next',car).addEventListener('click',function(){if(nat.matches)return natGo(1);if(busy)return;busy=true;
      track.style.transition=E;track.style.transform='translateX(-'+step()+'px)';
      setTimeout(function(){track.style.transition='none';track.appendChild(track.firstElementChild);track.style.transform='none';busy=false},470)});
    $('.car-btn.prev',car).addEventListener('click',function(){if(nat.matches)return natGo(-1);if(busy)return;busy=true;var s=step();
      track.style.transition='none';track.insertBefore(track.lastElementChild,track.firstElementChild);track.style.transform='translateX(-'+s+'px)';
      void track.offsetWidth;track.style.transition=E;track.style.transform='none';setTimeout(function(){busy=false},470)});
    // Свайп пальцем. Стрічка йде за пальцем, а швидкий змах прокручує одразу кілька карток
    var view=$('.car-view',car)||track,d=null;
    function px(){return d.base+d.dx}
    view.addEventListener('touchstart',function(e){if(busy||nat.matches)return;var t=e.touches[0];d={x:t.clientX,y:t.clientY,dx:0,lock:0,pts:[[t.clientX,e.timeStamp]]}},{passive:true});
    view.addEventListener('touchmove',function(e){if(!d)return;var t=e.touches[0],dx=t.clientX-d.x,dy=t.clientY-d.y;
      if(!d.lock){if(Math.abs(dx)<8&&Math.abs(dy)<8)return;d.lock=Math.abs(dx)>Math.abs(dy)?1:2;
        if(d.lock===1){busy=true;d.s=step();var m=Math.min(3,track.children.length-2);d.pre=dx>0?m:0;d.lo=dx>0?0:-m;d.hi=dx>0?m:0;for(var k=0;k<d.pre;k++)track.insertBefore(track.lastElementChild,track.firstElementChild);d.base=-d.pre*d.s;d.x=t.clientX;dx=0;track.style.transition='none'}}
      if(d.lock!==1)return;
      d.dx=Math.max(d.lo*d.s-30,Math.min(d.hi*d.s+30,dx));track.style.transform='translateX('+px()+'px)';
      d.pts.push([t.clientX,e.timeStamp]);if(d.pts.length>5)d.pts.shift()},{passive:true});
    function end(e){if(!d)return;var g=d;d=null;if(g.lock!==1)return;
      var a=g.pts[0],b=g.pts[g.pts.length-1],v=(b[1]-a[1])>0?(b[0]-a[0])/(b[1]-a[1]):0;
      var n=Math.round(-(g.dx+v*260)/g.s);n=Math.max(-g.hi,Math.min(-g.lo,n));
      var dur=Math.min(.7,.35+Math.abs(n)*.1);
      track.style.transition='transform '+dur+'s cubic-bezier(.17,.84,.32,1)';track.style.transform='translateX('+(g.base-n*g.s)+'px)';
      setTimeout(function(){track.style.transition='none';for(var k=0;k<g.pre+n;k++)track.appendChild(track.firstElementChild);track.style.transform='none';busy=false},dur*1000+30)}
    view.addEventListener('touchend',end,{passive:true});view.addEventListener('touchcancel',end,{passive:true});
  });
`;
