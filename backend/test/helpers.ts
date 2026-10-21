import type { NestExpressApplication } from '@nestjs/platform-express';
import { sql } from 'kysely';
import request from 'supertest';
import { expect } from 'vitest';
import { createApp } from '../src/app.js';
import { loadConfig, type Config } from '../src/config.js';
import type { Contract } from '../src/http/contract.js';
import type { AttemptLimiter } from '../src/auth/limiter.js';
import { createDb, migrate, type Db } from '../src/db/db.js';
import { devSeed } from '../src/seed/dev-seed.js';

export const ORIGIN = 'http://localhost:4200';
export const PASSWORD = 'seedpass123';

export interface Ctx {
  app: NestExpressApplication;
  db: Db;
  config: Config;
  contract: Contract;
  limiter: AttemptLimiter;
  inviteLink: string;
  close(): Promise<void>;
}

/** Чистая тестовая база с DEV_SEED и приложение в процессе */
export async function setup(): Promise<Ctx> {
  const config = loadConfig({
    APP_ENV: 'test',
    DATABASE_URL: process.env.TEST_DATABASE_URL ?? 'postgres://localhost:5432/nurtech_tasks_test',
    APP_BASE_URL: 'http://localhost:4200',
    ALLOWED_ORIGINS: ORIGIN,
    DEV_SEED: 'true',
    DEV_SEED_PASSWORD: PASSWORD,
  });
  const db = createDb(config.databaseUrl, 30);
  await migrate(db);
  await sql`TRUNCATE users, projects RESTART IDENTITY CASCADE`.execute(db);
  let inviteLink = '';
  await devSeed(db, config, (line) => {
    const m = /"link":"([^"]+)"/.exec(line);
    if (m) inviteLink = m[1];
  });
  const { app, contract, limiter } = await createApp(config, db);
  return {
    app,
    db,
    config,
    contract,
    limiter,
    inviteLink,
    async close() {
      await app.close();
      await db.destroy();
    },
  };
}

type Method = 'get' | 'post' | 'patch' | 'delete';

/**
 * HTTP-клиент для тестов: держит cookie, шлёт Origin и проверяет каждый ответ
 * по схеме контракта (статус объявлен у операции, тело совпадает со схемой).
 */
export class Client {
  private cookie: string | null = null;
  constructor(private readonly ctx: Ctx) {}

  async login(username: string, password = PASSWORD) {
    const r = await this.post('/api/auth/login', { username, password });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    return r;
  }

  get(url: string) {
    return this.send('get', url);
  }
  post(url: string, body?: unknown) {
    return this.send('post', url, body);
  }
  patch(url: string, body?: unknown) {
    return this.send('patch', url, body);
  }
  delete(url: string) {
    return this.send('delete', url);
  }

  async send(method: Method, url: string, body?: unknown, headers: Record<string, string> = {}) {
    let req = request(this.ctx.app.getHttpServer())[method](url).set('Origin', ORIGIN);
    if (this.cookie) req = req.set('Cookie', this.cookie);
    for (const [k, v] of Object.entries(headers)) req = req.set(k, v);
    if (body !== undefined) req = req.send(body as object);
    const res = await req;
    const set = res.headers['set-cookie'] as unknown as string[] | undefined;
    const sid = set?.find((c) => c.startsWith('sid='));
    if (sid) {
      const value = sid.split(';')[0];
      this.cookie = value === 'sid=' ? null : value;
    }
    checkContract(this.ctx.contract, method, url, res.status, res.body);
    return res;
  }

  get sid() {
    return this.cookie;
  }
  set sid(v: string | null) {
    this.cookie = v;
  }
}

export async function as(ctx: Ctx, username: string): Promise<Client> {
  const c = new Client(ctx);
  await c.login(username);
  return c;
}

let routes: Array<{ re: RegExp; method: string; opId: string }> | null = null;

export function opFor(contract: Contract, method: string, url: string): string | null {
  routes ??= contract.operations().map((op) => ({
    re: new RegExp('^/api' + op.path.replace(/\{[^}]+\}/g, '[^/]+') + '$'),
    method: op.method,
    opId: op.id,
  }));
  const path = url.split('?')[0];
  // Буквальные пути (by-key, search) раньше шаблонных
  const matches = routes.filter((r) => r.method === method.toUpperCase() && r.re.test(path));
  matches.sort((a, b) => b.re.source.replace(/\[\^\/\]\+/g, '').length - a.re.source.replace(/\[\^\/\]\+/g, '').length);
  return matches[0]?.opId ?? null;
}

function checkContract(contract: Contract, method: string, url: string, status: number, body: unknown) {
  const opId = opFor(contract, method, url);
  if (!opId) return;
  const err = contract.checkResponse(opId, status, body);
  expect(err, `${method.toUpperCase()} ${url} -> ${status}: ответ не по контракту: ${err}\n${JSON.stringify(body)}`).toBeNull();
}

export async function projectId(ctx: Ctx, key: string): Promise<string> {
  const p = await ctx.db.selectFrom('projects').select('id').where('key', '=', key).executeTakeFirstOrThrow();
  return p.id;
}

export function inviteToken(link: string): string {
  return link.split('/invite/')[1];
}
