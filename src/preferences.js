import { locales } from './i18n.js';

export function readPreferences(storage, systemDark = false) {
  const read = key => { try { return storage?.getItem(key); } catch { return null; } };
  const language = ['frozen-rabbit-lang', 'frozen-rabbit-tome-lang']
    .map(read).find(value => Object.hasOwn(locales, value)) ?? 'tw';
  const theme = ['frozen-rabbit-dark-mode', 'frozen-rabbit-tome-dark-mode']
    .map(read).find(value => value === 'true' || value === 'false');
  return { language, dark: theme === undefined ? systemDark : theme === 'true' };
}
