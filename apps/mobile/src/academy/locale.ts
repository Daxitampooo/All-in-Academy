import type { Lesson, LessonText, Locale } from '@pokerall/content';
import { useTranslation } from 'react-i18next';

/** The content language that matches the app language. */
export function useContentLocale(): Locale {
  const { i18n } = useTranslation();
  return i18n.language.startsWith('ru') ? 'ru' : 'en';
}

export function lessonText(lesson: Lesson, locale: Locale): LessonText {
  return lesson.text[locale];
}
