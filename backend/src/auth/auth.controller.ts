import { Body, Controller, Get, HttpCode, Inject, Param, Patch, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { sql } from 'kysely';
import { CONTRACT, DB, hashToken } from '../core.js';
import { pgCode, type Db } from '../db/db.js';
import type { Contract } from '../http/contract.js';
import { badRequest, conflict, invalidCredentials, invitationInvalid, validation } from '../http/errors.js';
import { AttemptLimiter } from './limiter.js';
import { hashPassword, passwordStrengthError, verifyPassword } from './passwords.js';
import { ClientIp, CurrentUser, Public, SessionService, type SessionUser } from './session.js';

const USERNAME = /^[a-z0-9_]{3,32}$/;

@Controller()
export class AuthController {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(CONTRACT) private readonly contract: Contract,
    @Inject(SessionService) private readonly sessions: SessionService,
    @Inject(AttemptLimiter) private readonly limiter: AttemptLimiter,
  ) {}

  @Public()
  @Post('auth/login')
  @HttpCode(200)
  async login(@Body() body: unknown, @ClientIp() ip: string, @Res({ passthrough: true }) res: Response) {
    if (body !== undefined && (typeof body !== 'object' || body === null || Array.isArray(body))) {
      throw badRequest('Тело запроса должно быть JSON-объектом');
    }
    const b = (body ?? {}) as Record<string, unknown>;
    const username = typeof b.username === 'string' ? b.username.trim().toLowerCase() : '';
    const password = typeof b.password === 'string' ? b.password : '';
    const key = username.slice(0, 64);
    this.limiter.check(key, ip);

    // Любая неудача - одинаковый 401; время не зависит от существования логина
    const wellFormed = username.length > 0 && username.length <= 64 && password.length > 0 && password.length <= 128;
    const user = wellFormed
      ? await this.db.selectFrom('users').select(['id', 'name', 'username', 'password_hash']).where('username', '=', username).executeTakeFirst()
      : undefined;
    const ok = await verifyPassword(user?.password_hash ?? null, wellFormed ? password : 'x');
    if (!ok || !user || !user.username) {
      this.limiter.fail(key, ip);
      throw invalidCredentials();
    }
    this.limiter.succeed(key, ip);
    this.sessions.setCookie(res, await this.sessions.start(this.db, user.id));
    return { user: { id: user.id, name: user.name, username: user.username } };
  }

  @Post('auth/logout')
  @HttpCode(204)
  async logout(@CurrentUser() user: SessionUser, @Res({ passthrough: true }) res: Response) {
    await this.sessions.revoke(user.sessionId);
    this.sessions.clearCookie(res);
  }

  @Get('auth/me')
  me(@CurrentUser() user: SessionUser) {
    return { user: { id: user.id, name: user.name, username: user.username } };
  }

  @Public()
  @Get('invitations/:token')
  async getInvitation(@Param('token') token: string) {
    const inv = await this.findInvitation(token);
    return { name: inv.name, kind: inv.kind, username: inv.kind === 'reissue' ? inv.username : null };
  }

  @Public()
  @Get('invitations/:token/username-available')
  async usernameAvailable(@Param('token') token: string, @Query() query: Record<string, unknown>) {
    await this.findInvitation(token);
    const { username } = this.contract.query<{ username?: string }>('checkUsernameAvailable', query);
    if (!username || !USERNAME.test(username)) return { available: false, reason: 'invalid' };
    const taken = await this.db.selectFrom('users').select('id').where('username', '=', username).executeTakeFirst();
    return taken ? { available: false, reason: 'taken' } : { available: true, reason: null };
  }

  @Public()
  @Post('invitations/:token/accept')
  @HttpCode(200)
  async accept(@Param('token') token: string, @Body() body: unknown, @Res({ passthrough: true }) res: Response) {
    const inv = await this.findInvitation(token);
    const { data } = this.contract.body<{ username?: string; password: string }>('acceptInvitation', body);
    const fields = { ...(passwordStrengthError('password', data.password) ?? {}) };
    if (inv.kind === 'new' && data.username === undefined) Object.assign(fields, { username: 'required' });
    if (inv.kind === 'reissue' && data.username !== undefined) Object.assign(fields, { username: 'not_allowed' });
    if (Object.keys(fields).length) throw validation(fields);

    const passwordHash = await hashPassword(data.password);
    const { user, sid } = await this.db
      .transaction()
      .execute(async (tx) => {
        // Приглашение закрывается атомарно: из двух одновременных accept успешен один
        const claimed = await tx
          .updateTable('invitations')
          .set({ used_at: sql<Date>`now()` })
          .where('id', '=', inv.id)
          .where('used_at', 'is', null)
          .where('revoked_at', 'is', null)
          .where('expires_at', '>', sql<Date>`now()`)
          .returning('id')
          .executeTakeFirst();
        if (!claimed) throw invitationInvalid();
        const updated = await tx
          .updateTable('users')
          .set(inv.kind === 'new' ? { username: data.username!, password_hash: passwordHash } : { password_hash: passwordHash })
          .where('id', '=', inv.userId)
          .returning(['id', 'name', 'username'])
          .executeTakeFirstOrThrow();
        await this.sessions.revokeOthers(tx, inv.userId, null);
        return { user: updated, sid: await this.sessions.start(tx, inv.userId) };
      })
      .catch((err) => {
        if (pgCode(err) === '23505') throw conflict('username_taken', 'Этот логин уже занят, выберите другой');
        throw err;
      });
    this.sessions.setCookie(res, sid);
    return { user: { id: user.id, name: user.name, username: user.username! } };
  }

  @Patch('profile')
  async updateProfile(@CurrentUser() user: SessionUser, @Body() body: unknown) {
    const { data } = this.contract.body<{ name: string }>('updateProfile', body);
    const row = await this.db
      .updateTable('users')
      .set({ name: data.name })
      .where('id', '=', user.id)
      .returning(['id', 'name', 'username'])
      .executeTakeFirstOrThrow();
    return { user: { id: row.id, name: row.name, username: row.username! } };
  }

  @Post('profile/password')
  @HttpCode(204)
  async changePassword(@CurrentUser() user: SessionUser, @Body() body: unknown, @ClientIp() ip: string) {
    const { data } = this.contract.body<{ current: string; next: string }>('changePassword', body);
    this.limiter.check(user.username, ip);
    const row = await this.db.selectFrom('users').select('password_hash').where('id', '=', user.id).executeTakeFirstOrThrow();
    if (!(await verifyPassword(row.password_hash, data.current))) {
      this.limiter.fail(user.username, ip);
      throw validation({ current: 'invalid' }, 'Текущий пароль указан неверно');
    }
    const weak = passwordStrengthError('next', data.next);
    if (weak) throw validation(weak, 'Пароль должен быть не короче 8 символов и содержать букву и цифру');
    const passwordHash = await hashPassword(data.next);
    await this.db.transaction().execute(async (tx) => {
      await tx.updateTable('users').set({ password_hash: passwordHash }).where('id', '=', user.id).execute();
      await this.sessions.revokeOthers(tx, user.id, user.sessionId);
    });
  }

  private async findInvitation(token: string) {
    if (!token || token.length > 200) throw invitationInvalid();
    const inv = await this.db
      .selectFrom('invitations as i')
      .innerJoin('users as u', 'u.id', 'i.user_id')
      .select(['i.id', 'i.kind', 'i.user_id as userId', 'u.name', 'u.username'])
      .where('i.token_hash', '=', hashToken(token))
      .where('i.used_at', 'is', null)
      .where('i.revoked_at', 'is', null)
      .where('i.expires_at', '>', sql<Date>`now()`)
      .executeTakeFirst();
    if (!inv) throw invitationInvalid();
    return inv;
  }
}
