# Текущий статус

Обновляется в конце каждой сессии. Новая сессия читает этот файл после CLAUDE.md и docs/ARCHITECTURE.md.

## Сейчас
- Архитектура утверждена владельцем (docs/ARCHITECTURE.md).
- Идёт MVP, шаг 1 «Каркас» (раздел 13 архитектуры). Ветка `feat/scaffold`, PR ещё не открыт.

## Что уже есть в ветке `feat/scaffold`
- Корень монорепо: `package.json` (pnpm + turbo), `pnpm-workspace.yaml`, `.npmrc` (`node-linker=hoisted`), `.gitignore`.
- `apps/mobile` сгенерирован `create-expo-app` (default template) на **Expo SDK 57** (React Native 0.86, React 19.2, expo-router 57, Reanimated 4.5, TypeScript 6). Корень маршрутов — `src/app`.
- Уже добавлены зависимости: expo-localization, react-native-svg, expo-font, @expo-google-fonts/space-grotesk, @expo-google-fonts/inter, expo-linear-gradient, i18next, react-i18next, zustand.
- `pnpm-lock.yaml` сгенерирован.
- Экраны и компоненты шаблона удалены. Сейчас в `src/app` только `_layout.tsx` из шаблона, он ссылается на удалённые компоненты: его нужно переписать.
- `.github/workflows/bootstrap.yml` — одноразовый костыль, созданный, когда в облачной сессии не было доступа к npm. **Удалить** в этом шаге.
- `.bootstrap/` — логи генерации из CI. **Удалить** в этом шаге.

## Что осталось сделать в шаге 1
1. Удалить `bootstrap.yml` и `.bootstrap/`; в `app.json` задать имя «All-in Academy», slug, scheme, package (`com.allinacademy.app`), цвета сплэша и иконки под тему Neon, `userInterfaceStyle`, edge-to-edge и predictive back (targetSdk 36).
2. Тема Neon (раздел 3 архитектуры): токены цветов тёмной и светлой темы, шрифты, типографическая шкала; ни одного «сырого» цвета в компонентах.
3. i18n: i18next + expo-localization, `src/locales/en.json` и `ru.json`, переключение языка и темы в настройках (Zustand, с сохранением).
4. Вкладки: Играть, Академия, Тренировка, Профиль — экраны-заглушки в стиле Neon с понятным текстом, что появится дальше.
5. Скрипт проверки локалей (`scripts/check-locales.mjs`): одинаковые ключи в en и ru.
6. `.github/workflows/ci.yml`: install, typecheck, lint, check:locales.
7. `.github/workflows/android-apk.yml`: по кнопке (workflow_dispatch) и по тегу — `expo prebuild` + Gradle, release APK в GitHub Release (pre-release). Пока ключа подписи нет — подписывать debug-ключом и явно пометить это в описании релиза.
8. Веб-превью: `npx expo export --platform web`, опубликовать как приватную страницу и дать владельцу ссылку.
9. Открыть PR в main, коротко описать владельцу, что проверить на телефоне.

## Заметки
- Владелец работает только с Android-телефона, опыта мало: объяснять просто.
- Визуальный стиль — «Neon», неоновый и игровой.
