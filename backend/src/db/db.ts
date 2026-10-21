import { readdirSync, readFileSync } from 'node:fs';
import { Kysely, PostgresDialect, sql, type Transaction } from 'kysely';
import pg from 'pg';
import type { Database } from './schema.js';

// date (без времени) отдаём строкой YYYY-MM-DD, без пересчёта в пояс сервера
pg.types.setTypeParser(1082, (v: string) => v);
// bigint (count, sum) - числом: суммы минут далеки от 2^53
pg.types.setTypeParser(20, (v: string) => Number(v));
pg.types.setTypeParser(1700, (v: string) => Number(v));

export type Db = Kysely<Database>;
export type Tx = Transaction<Database>;
export type Q = Db | Tx;

export function createDb(databaseUrl: string, max = 10): Db {
  return new Kysely<Database>({
    dialect: new PostgresDialect({ pool: new pg.Pool({ connectionString: databaseUrl, max }) }),
  });
}

const MIGRATIONS_DIR = new URL('../../migrations/', import.meta.url);

/** Применяет недостающие SQL-миграции по порядку имён. Возвращает имена применённых. */
export async function migrate(db: Db): Promise<string[]> {
  await sql`CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`.execute(db);
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
  const applied: string[] = [];
  for (const file of files) {
    await db.transaction().execute(async (tx) => {
      // Блокировка, чтобы два процесса не накатили одну миграцию одновременно
      await sql`SELECT pg_advisory_xact_lock(7349001)`.execute(tx);
      const done = await sql<{ name: string }>`SELECT name FROM schema_migrations WHERE name = ${file}`.execute(tx);
      if (done.rows.length) return;
      await sql.raw(readFileSync(new URL(file, MIGRATIONS_DIR), 'utf8')).execute(tx);
      await sql`INSERT INTO schema_migrations (name) VALUES (${file})`.execute(tx);
      applied.push(file);
    });
  }
  return applied;
}

/** Код ошибки Postgres (23505 - нарушение уникальности и т. п.) */
export function pgCode(err: unknown): string | undefined {
  return typeof err === 'object' && err !== null && 'code' in err ? String((err as { code: unknown }).code) : undefined;
}

export function pgConstraint(err: unknown): string | undefined {
  return typeof err === 'object' && err !== null && 'constraint' in err
    ? String((err as { constraint: unknown }).constraint)
    : undefined;
}
