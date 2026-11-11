// Кеш сторінок на CDN Vercel. Після публікації скидаємо його за тегом
export const PAGE_TAG = 'zb-pages';
export const pageHeaders = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'public, max-age=0, must-revalidate',
  'Vercel-CDN-Cache-Control': 'max-age=600, stale-while-revalidate=86400',
  'Vercel-Cache-Tag': PAGE_TAG,
};
export async function purgePages() {
  if (!process.env.VERCEL) return;
  try {
    const { dangerouslyDeleteByTag } = await import('@vercel/functions');
    await dangerouslyDeleteByTag(PAGE_TAG);
  } catch (e) { console.error('purge', e); }
}
