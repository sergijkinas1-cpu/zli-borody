// Вхідний файл для Hostinger. Їхній сервер LiteSpeed підвантажує його через require(),
// тому сам сайт (ES-модуль server.js) запускаємо через import()
import('./server.js').catch((e) => { console.error(e); process.exit(1); });
