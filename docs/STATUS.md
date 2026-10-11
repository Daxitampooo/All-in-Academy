# Текущий статус

Обновляется в конце каждой сессии. Новая сессия читает этот файл после CLAUDE.md и docs/ARCHITECTURE.md.

## Сейчас
- Архитектура утверждена владельцем (docs/ARCHITECTURE.md).
- MVP, шаг 1 «Каркас» (раздел 13 архитектуры) готов к проверке: ветка `feat/scaffold`, открыт PR в `main`.
- Следующий шаг после мёржа: шаг 2 «Движок» (`packages/poker-engine` с тестами) в новой ветке `feat/poker-engine`.

## Что сделано в шаге 1
- Монорепо: pnpm workspaces + Turborepo; `apps/mobile` на Expo SDK 57 (React Native 0.86, expo-router 57, TypeScript 6).
- Тема Neon (тёмная) и Daylight (светлая): `apps/mobile/src/theme/tokens.ts`. Шрифты Unbounded (заголовки) и Inter (текст), оба с кириллицей.
- i18n EN/RU (i18next + expo-localization), язык и тема выбираются в настройках и сохраняются (Zustand + AsyncStorage).
- Вкладки Играть / Академия / Тренировка / Профиль с заглушками «Скоро», экран настроек, неоновый стол на главной, дисклеймер «без реальных денег».
- Иконка приложения, adaptive icon и сплэш (неоновая пика).
- CI: install, typecheck, lint, check:locales, веб-сборка; архив зависимостей для сессий без npm.
- APK: workflow `android-apk`, релиз `preview-feat-scaffold`.
- Веб-превью: приватный артефакт https://claude.ai/artifact/CPRx4cuNmAPekziDnf66qT (обновлять публикацией того же артефакта по URL).

## Как работать в сессии без доступа к npm
1. `scripts/fetch-deps.sh` — скачать `node_modules` для текущего `pnpm-lock.yaml`.
2. Если менял `package.json`: закоммитить и запушить, дождаться workflow `ci` (он закоммитит lockfile и выложит архив), сделать `git pull` и снова `scripts/fetch-deps.sh`.
3. Проверки: `pnpm typecheck`, `pnpm lint`, `pnpm check:locales`.
4. Превью: `cd apps/mobile && CI=1 EXPO_OFFLINE=1 npx expo export --platform web --output-dir dist`, затем `node scripts/build-preview.mjs <файл>` и публикация файла как артефакта.
5. Логи упавшего CI: аннотации check-run (`gh api repos/<repo>/check-runs/<id>/annotations`).

## Заметки
- Приложение переименовано в Pokero (Android-пакет `com.pokero.app`). Репозиторий пока называется All-in-Academy.
- Владелец работает только с Android-телефона, опыта мало: объяснять просто.
- Визуальный стиль — «Neon», неоновый и игровой.
- Аккаунта Google Play пока нет; тестовые APK подписаны debug-ключом.
