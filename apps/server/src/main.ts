import { buildApp } from './app';
import { createGoogleVerifier } from './auth/google';
import { loadConfig } from './config';
import { connect } from './db/client';
import { runMigrations } from './db/migrate';

const config = loadConfig();
const { db, pool } = connect(config.databaseUrl);
await runMigrations(db);

const { app, ctx } = await buildApp({
  db,
  jwtSecret: config.jwtSecret,
  accessTtlSeconds: config.accessTtlSeconds,
  refreshTtlDays: config.refreshTtlDays,
  google: createGoogleVerifier(config.googleClientIds),
  trustProxy: config.trustProxy,
  logLevel: config.logLevel,
});

// Expired sessions are cleaned once an hour.
const pruneTimer = setInterval(() => {
  ctx.tokens.prune().catch((error: unknown) => app.log.error(error));
}, 3_600_000);

async function shutdown(signal: string): Promise<void> {
  app.log.info({ signal }, 'shutting down');
  clearInterval(pruneTimer);
  await app.close();
  await pool.end();
  process.exit(0);
}
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

await app.listen({ host: config.host, port: config.port });
