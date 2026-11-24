// Де працює сайт. На Vercel є змінна VERCEL, на Hostinger і будь-якому Node.js хостингу ставимо NODE_ENV=production
import os from 'node:os';
import path from 'node:path';

export const onVercel = Boolean(process.env.VERCEL);
// Локальна розробка запускається з прапорцем --dev, усе інше вважаємо робочим сайтом
const devRun = process.argv.includes('--dev') || process.env.NODE_ENV === 'development';
export const isProd = onVercel || process.env.NODE_ENV === 'production' || (!devRun && process.argv[1]?.endsWith('server.js'));
// Папка з даними адмінки і завантаженими фото. На Hostinger вона лежить у домашній теці,
// поза папкою застосунку, бо ту папку кожен деплой створює заново
export const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : isProd && !onVercel ? path.join(os.homedir(), 'zli-borody-data') : path.join(process.cwd(), '.data');
