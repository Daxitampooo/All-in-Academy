# @pokerall/server

The PokerALL server (stage 7): accounts, profile and progress sync, privacy settings and account deletion.
Fastify + PostgreSQL (Drizzle ORM). Later stages add friends, chat, ranked play and tournaments.

## What it does

| Route | What for |
|---|---|
| `POST /v1/auth/guest` | Guest account from a random secret kept on the phone (repeat = sign in). |
| `POST /v1/auth/register`, `/v1/auth/login` | Email and password (argon2id). |
| `POST /v1/auth/google` | Google ID token, checked against Google's keys and our client ids. |
| `POST /v1/auth/refresh`, `/v1/auth/logout` | Sessions: 15-minute access JWT, 30-day refresh token that changes on every use. A replaced token used again closes the session. |
| `POST /v1/me/identities/email`, `/google` | Add a sign-in method to the current account (a guest keeps all progress). |
| `GET /v1/me`, `PUT /v1/me/profile`, `PUT /v1/me/privacy` | Account, profile (same text checks as the app, unique nicknames), privacy. |
| `GET /v1/nicknames/check` | Is a nickname allowed and free. |
| `GET/PUT /v1/sync` | Progress sync; merge rules live in `@pokerall/shared` (`applySync`). |
| `DELETE /v1/me` | Deletes the account and all its rows (every table cascades from `users`). |
| `GET /account/delete` | Public deletion page for Google Play (EN/RU): email + password, or a request form. |
| `GET /health` | Database check for the container health check. |

Every error answers `{ error: { code, field?, reason? } }` with a code from `@pokerall/shared` that the
app translates. Sign-in routes are limited to 10 requests a minute per address.

Google sign-in is not joined automatically to a password account with the same email: emails are not
confirmed, so that would let someone who registered another person's address take over that person's
account later. Accounts are joined only from inside a signed-in account.

## Settings

Environment variables (see `deploy/.env.example`): `DATABASE_URL`, `JWT_SECRET` (32+ characters),
`GOOGLE_CLIENT_IDS` (comma separated, empty turns Google off), `TRUST_PROXY`, `PORT`, `ACCESS_TTL_SECONDS`,
`REFRESH_TTL_DAYS`, `LOG_LEVEL`.

## Database

Tables are described in `src/db/schema.ts`. After changing it, write a migration:

```
pnpm --filter @pokerall/server db:generate
```

Migrations in `drizzle/` run automatically when the server starts (`pnpm migrate` runs them alone).

## Tests

Tests run against a real Postgres: each test file creates its own database and drops it at the end.

```
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres pnpm --filter @pokerall/server test
```

CI starts Postgres as a service for this.

## Running in production

`deploy/docker-compose.yml` runs Postgres, the server and Caddy (automatic HTTPS) on one VPS:

```
cd deploy
cp .env.example .env   # fill in DOMAIN, POSTGRES_PASSWORD, JWT_SECRET
docker compose up -d --build
```

The app gets the server address at build time from `EXPO_PUBLIC_API_URL`.
