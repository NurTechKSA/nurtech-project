import { createHash, randomBytes } from 'node:crypto';
import { Global, Module, type DynamicModule } from '@nestjs/common';
import type { Config } from './config.js';
import type { Db } from './db/db.js';
import type { Contract } from './http/contract.js';
import { notFound } from './http/errors.js';

export const CONFIG = 'CONFIG';
export const DB = 'DB';
export const CONTRACT = 'CONTRACT';

@Global()
@Module({})
export class CoreModule {
  static register(config: Config, db: Db, contract: Contract): DynamicModule {
    return {
      module: CoreModule,
      providers: [
        { provide: CONFIG, useValue: config },
        { provide: DB, useValue: db },
        { provide: CONTRACT, useValue: contract },
      ],
      exports: [CONFIG, DB, CONTRACT],
    };
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(v: unknown): v is string {
  return typeof v === 'string' && UUID.test(v);
}

/** Идентификатор в пути: не UUID - 404 (существование не раскрываем) */
export function pathId(v: string): string {
  if (!isUuid(v)) throw notFound();
  return v.toLowerCase();
}

export function newToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashToken(token: string): Buffer {
  return createHash('sha256').update(token).digest();
}

/** Сегодняшняя дата UTC в виде YYYY-MM-DD, со сдвигом в днях */
export function utcDate(offsetDays = 0, now = new Date()): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offsetDays));
  return d.toISOString().slice(0, 10);
}
