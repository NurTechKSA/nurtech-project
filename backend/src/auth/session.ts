import {
  createParamDecorator,
  Inject,
  Injectable,
  SetMetadata,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { sql } from 'kysely';
import type { Config } from '../config.js';
import { CONFIG, DB, hashToken, newToken } from '../core.js';
import type { Db, Q } from '../db/db.js';
import { unauthenticated } from '../http/errors.js';

export interface SessionUser {
  id: string;
  name: string;
  username: string;
  sessionId: string;
}

export const COOKIE = 'sid';
const PUBLIC = 'isPublic';
/** Публичная ручка (x-public): сессия не нужна */
export const Public = () => SetMetadata(PUBLIC, true);

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): SessionUser => {
  return ctx.switchToHttp().getRequest<Request & { user: SessionUser }>().user;
});

export const ClientIp = createParamDecorator((_: unknown, ctx: ExecutionContext): string => {
  return ctx.switchToHttp().getRequest<Request>().ip ?? 'unknown';
});

export function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    if (part.slice(0, i).trim() === name) {
      try {
        return decodeURIComponent(part.slice(i + 1).trim());
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

@Injectable()
export class SessionService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(CONFIG) private readonly config: Config,
  ) {}

  /** Создаёт сессию; cookie ставится отдельно (setCookie), после фиксации транзакции */
  async start(q: Q, userId: string): Promise<string> {
    const token = newToken();
    await q
      .insertInto('sessions')
      .values({
        user_id: userId,
        token_hash: hashToken(token),
        expires_at: sql<Date>`now() + make_interval(days => ${this.config.sessionTtlDays})`,
      })
      .execute();
    return token;
  }

  setCookie(res: Response, token: string) {
    res.cookie(COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.cookieSecure,
      path: '/',
      maxAge: this.config.sessionMaxDays * 24 * 3600 * 1000,
    });
  }

  clearCookie(res: Response) {
    res.clearCookie(COOKIE, { httpOnly: true, sameSite: 'lax', secure: this.config.cookieSecure, path: '/' });
  }

  /** Сессия по cookie: живая, не отозвана, не старше абсолютного предела. Продлевает срок при активности. */
  async resolve(token: string | undefined): Promise<SessionUser | null> {
    if (!token || token.length > 200) return null;
    const row = await this.db
      .selectFrom('sessions as s')
      .innerJoin('users as u', 'u.id', 's.user_id')
      .select(['s.id as sessionId', 's.expires_at', 'u.id', 'u.name', 'u.username'])
      .where('s.token_hash', '=', hashToken(token))
      .where('s.revoked_at', 'is', null)
      .where('s.expires_at', '>', sql<Date>`now()`)
      .where('s.created_at', '>', sql<Date>`now() - make_interval(days => ${this.config.sessionMaxDays})`)
      .executeTakeFirst();
    if (!row || !row.username) return null;
    // Продление не чаще раза в час, чтобы не писать в базу на каждый запрос
    const ttlMs = this.config.sessionTtlDays * 24 * 3600 * 1000;
    if (row.expires_at.getTime() - Date.now() < ttlMs - 3600 * 1000) {
      await this.db
        .updateTable('sessions')
        .set({
          expires_at: sql<Date>`least(now() + make_interval(days => ${this.config.sessionTtlDays}), created_at + make_interval(days => ${this.config.sessionMaxDays}))`,
        })
        .where('id', '=', row.sessionId)
        .execute();
    }
    return { id: row.id, name: row.name, username: row.username, sessionId: row.sessionId };
  }

  async revoke(sessionId: string) {
    await this.db.updateTable('sessions').set({ revoked_at: sql<Date>`now()` }).where('id', '=', sessionId).execute();
  }

  /** Отзывает все сессии пользователя, кроме указанной */
  async revokeOthers(q: Q, userId: string, keepSessionId: string | null) {
    let query = q
      .updateTable('sessions')
      .set({ revoked_at: sql<Date>`now()` })
      .where('user_id', '=', userId)
      .where('revoked_at', 'is', null);
    if (keepSessionId) query = query.where('id', '<>', keepSessionId);
    await query.execute();
  }
}

/** Глобальный guard: без сессии - 401, кроме @Public */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(SessionService) private readonly sessions: SessionService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC, [ctx.getHandler(), ctx.getClass()]);
    if (isPublic) return true;
    const req = ctx.switchToHttp().getRequest<Request & { user?: SessionUser }>();
    const user = await this.sessions.resolve(readCookie(req, COOKIE));
    if (!user) throw unauthenticated();
    req.user = user;
    return true;
  }
}
