import i18n from '@/i18n';

const formatters = new Map<string, Intl.NumberFormat>();

function formatter(digits: number): Intl.NumberFormat {
  const lang = i18n.language || 'en';
  const key = `${lang}:${digits}`;
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat(lang === 'ru' ? 'ru-RU' : 'en-US', { maximumFractionDigits: digits });
    formatters.set(key, f);
  }
  return f;
}

/** Chip amounts with the locale's digit grouping: 12 500 in Russian, 12,500 in English. */
export function formatChips(amount: number): string {
  return formatter(0).format(amount);
}

/** Small numbers such as bet multipliers with the locale's decimal mark: 2,5 in Russian, 2.5 in English. */
export function formatDecimal(value: number): string {
  return formatter(1).format(value);
}
