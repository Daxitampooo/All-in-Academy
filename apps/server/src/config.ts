import { z } from 'zod';

/** Settings come from environment variables; see deploy/.env.example for what each one means. */
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().min(1),
  /** Signs access tokens. A long random string; changing it signs everyone out within 15 minutes. */
  JWT_SECRET: z.string().min(32),
  ACCESS_TTL_SECONDS: z.coerce.number().int().min(60).max(86_400).default(900),
  REFRESH_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  /** OAuth client ids from Google Cloud, comma separated (Android and web). Empty turns Google sign-in off. */
  GOOGLE_CLIENT_IDS: z.string().default(''),
  /** Behind Caddy or another proxy: take the player's address from X-Forwarded-For (for rate limits). */
  TRUST_PROXY: z
    .enum(['true', 'false', '1', '0'])
    .default('false')
    .transform((v) => v === 'true' || v === '1'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

export type Config = {
  host: string;
  port: number;
  databaseUrl: string;
  jwtSecret: string;
  accessTtlSeconds: number;
  refreshTtlDays: number;
  googleClientIds: string[];
  trustProxy: boolean;
  logLevel: string;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`);
    throw new Error(`Server settings are missing or wrong:\n${lines.join('\n')}`);
  }
  const e = parsed.data;
  return {
    host: e.HOST,
    port: e.PORT,
    databaseUrl: e.DATABASE_URL,
    jwtSecret: e.JWT_SECRET,
    accessTtlSeconds: e.ACCESS_TTL_SECONDS,
    refreshTtlDays: e.REFRESH_TTL_DAYS,
    googleClientIds: e.GOOGLE_CLIENT_IDS.split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    trustProxy: e.TRUST_PROXY,
    logLevel: e.NODE_ENV === 'test' ? 'silent' : e.LOG_LEVEL,
  };
}
