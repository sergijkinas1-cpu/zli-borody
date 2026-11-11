# Адмінпанель сайту Злі Бороди

Адмінка живе за адресою `/admin`. Вхід лише через Google, пускає тільки пошти зі списку адміністраторів.

## Як це влаштовано

- `public/` статичні файли сайту (стилі, фото, відео) і сама адмінка в `public/admin/`
- `api/` серверні функції Vercel
  - `page.js` збирає сторінки сайту (`/`, `/blog`, `/blog/<адреса статті>`) з опублікованого контенту
  - `auth.js` вхід через Google і вихід
  - `content.js` чернетка і публікація
  - `history.js` історія публікацій і відкат
  - `admins.js` список адміністраторів
  - `media.js` завантаження фото і відео
  - `preview.js` живий перегляд у адмінці
- `lib/render.js` шаблони сторінок, `lib/defaults.json` початковий контент сайту
- Контент, чернетка, історія і список адмінів зберігаються JSON-файлами в приватному сховищі Vercel Blob (`BLOB_READ_WRITE_TOKEN`). Фото і відео лежать в окремому публічному Blob (`MEDIA_BLOB_READ_WRITE_TOKEN`). Якщо підключити Upstash Redis, дані автоматично підуть туди
- Якщо бази немає, сайт показує контент із `lib/defaults.json`, тому він ніколи не лишиться порожнім

Після публікації сторінки на CDN Vercel скидаються за тегом, зміни видно за кілька секунд.

## Змінні середовища у Vercel

| Змінна | Що це | Звідки |
|---|---|---|
| `GOOGLE_CLIENT_ID` | Client ID для входу через Google | Google Cloud Console |
| `ADMIN_EMAILS` | Пошти власників через кому. Вони завжди мають доступ і їх не можна видалити з адмінки | вписати вручну |
| `SESSION_SECRET` | Довгий випадковий рядок для підпису сесій | `openssl rand -hex 32` |
| `BLOB_READ_WRITE_TOKEN` | Приватний Blob для даних адмінки | додається сам, коли підключаєш приватний Blob у Vercel Storage |
| `MEDIA_BLOB_READ_WRITE_TOKEN` | Публічний Blob для фото і відео | підключити публічний Blob, потім перейменувати його змінну на цю назву |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Необов'язково. Upstash Redis замість Blob для даних | додаються самі при підключенні Upstash |

## Перенесення на інший акаунт (GitHub і Vercel клієнта)

1. Перенести репозиторій у GitHub клієнта (Settings, Transfer) або зробити копію.
2. У Vercel клієнта імпортувати репозиторій як новий проєкт. Framework Preset лишити Other, нічого не змінювати.
3. У вкладці Storage створити два Blob. Публічний для фото (його змінну перейменувати на `MEDIA_BLOB_READ_WRITE_TOKEN`) і приватний для даних (змінна `BLOB_READ_WRITE_TOKEN`).
4. У Settings, Environment Variables додати `GOOGLE_CLIENT_ID`, `ADMIN_EMAILS`, `SESSION_SECRET`.
5. У Google Cloud Console в налаштуваннях Client ID додати новий домен у Authorized JavaScript origins.
6. Перенести контент. В старій адмінці нічого робити не треба. Достатньо в новій базі опублікувати контент заново, або попросити розробника скопіювати папку `cms/` зі старого приватного Blob у новий.
7. Фото, завантажені через адмінку, лежать у старому Blob. Їх варто перезавантажити в нову медіатеку перед видаленням старого проєкту.

## Як отримати Google Client ID

1. https://console.cloud.google.com/projectcreate створити проєкт.
2. https://console.cloud.google.com/auth/branding натиснути Get started, вказати назву і пошту, аудиторія External.
3. https://console.cloud.google.com/auth/audience натиснути Publish app.
4. https://console.cloud.google.com/auth/clients створити клієнт типу Web application, в Authorized JavaScript origins вказати адресу сайту, наприклад `https://zli-borody.vercel.app`.
5. Скопіювати Client ID у змінну `GOOGLE_CLIENT_ID` у Vercel і зробити Redeploy.

## Локальний запуск

```
npm install
DEV_LOGIN=1 ADMIN_EMAILS=you@gmail.com npm run dev
```

Відкрити http://localhost:3000/admin. Без змінних Redis дані пишуться у файл `.data/db.json`, фото у `.data/uploads`. Локальний вхід без Google працює тільки поза Vercel.
