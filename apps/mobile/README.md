# PokerALL — mobile app

Expo (React Native) app for Android, with a web build used for previews.

- Screens live in `src/app` (Expo Router): the four tabs are in `src/app/(tabs)`.
- Colors, spacing and fonts: `src/theme/tokens.ts`. Components never use raw colors.
- All interface text: `src/locales/en.json` and `src/locales/ru.json` (same keys in both).

Commands (from the repo root, after `pnpm install`):

```bash
pnpm --filter @pokerall/mobile typecheck
pnpm --filter @pokerall/mobile lint
pnpm --filter @pokerall/mobile export:web
```
