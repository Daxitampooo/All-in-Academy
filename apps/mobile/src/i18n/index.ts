import { getLocales } from 'expo-localization';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '@/locales/en.json';
import ru from '@/locales/ru.json';

export const supportedLanguages = ['en', 'ru'] as const;
export type Language = (typeof supportedLanguages)[number];

/** Language of the phone if we support it, otherwise English. */
export function deviceLanguage(): Language {
  for (const locale of getLocales()) {
    const code = locale.languageCode;
    if (code && (supportedLanguages as readonly string[]).includes(code)) {
      return code as Language;
    }
  }
  return 'en';
}

const i18n = createInstance();

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ru: { translation: ru },
  },
  lng: deviceLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
