export type AppEnv = 'development' | 'test' | 'staging' | 'production';

export interface Config {
  env: AppEnv;
  port: number;
  databaseUrl: string;
  appBaseUrl: string;
  allowedOrigins: string[];
  sessionTtlDays: number;
  sessionMaxDays: number;
  invitationTtlDays: number;
  devSeed: boolean;
  devSeedPassword: string | null;
  cookieSecure: boolean;
  docs: boolean;
  /** Путь к openapi.yaml - источнику истины контракта */
  openapiPath: string;
}

function int(name: string, value: string | undefined, def: number): number {
  if (value === undefined || value === '') return def;
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new Error(`${name} должен быть положительным целым`);
  return n;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const appEnv = (env.APP_ENV ?? 'development') as AppEnv;
  if (!['development', 'test', 'staging', 'production'].includes(appEnv)) {
    throw new Error(`APP_ENV: неизвестное значение ${appEnv}`);
  }
  const devSeed = env.DEV_SEED === 'true';
  if (devSeed && appEnv === 'production') {
    throw new Error('DEV_SEED=true запрещён в продакшене (APP_ENV=production)');
  }
  const devSeedPassword = env.DEV_SEED_PASSWORD || null;
  if (devSeed && !devSeedPassword) throw new Error('DEV_SEED=true требует DEV_SEED_PASSWORD');

  const appBaseUrl = (env.APP_BASE_URL ?? 'http://localhost:4200').replace(/\/+$/, '');
  const allowedOrigins = (env.ALLOWED_ORIGINS ?? 'http://localhost:4200')
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  return {
    env: appEnv,
    port: int('PORT', env.PORT, 3000),
    databaseUrl: env.DATABASE_URL ?? 'postgres://localhost:5432/nurtech_tasks',
    appBaseUrl,
    allowedOrigins,
    sessionTtlDays: int('SESSION_TTL_DAYS', env.SESSION_TTL_DAYS, 7),
    sessionMaxDays: 30,
    invitationTtlDays: int('INVITATION_TTL_DAYS', env.INVITATION_TTL_DAYS, 7),
    devSeed,
    devSeedPassword,
    cookieSecure: env.COOKIE_SECURE ? env.COOKIE_SECURE === 'true' : appBaseUrl.startsWith('https://'),
    docs: appEnv !== 'production',
    openapiPath: env.OPENAPI_PATH ?? new URL('../../docs-short/backend/openapi/openapi.yaml', import.meta.url).pathname,
  };
}
