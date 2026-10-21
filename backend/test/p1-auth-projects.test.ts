import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createUser, issueInvitation } from '../src/admin/admin.js';
import { ALL_PERMISSIONS } from '../src/auth/permissions.js';
import { as, Client, inviteToken, ORIGIN, PASSWORD, projectId, setup, type Ctx } from './helpers.js';

let ctx: Ctx;
let DEMO: string;
let SIMPLE: string;

beforeAll(async () => {
  ctx = await setup();
  DEMO = await projectId(ctx, 'DEMO');
  SIMPLE = await projectId(ctx, 'SIMPLE');
});
afterAll(() => ctx.close());

describe('00. Сквозные правила', () => {
  it('X-Request-Id и Referrer-Policy в каждом ответе; присланный id возвращается', async () => {
    const c = new Client(ctx);
    const r = await c.get('/api/auth/me');
    expect(r.headers['x-request-id']).toBeTruthy();
    expect(r.headers['referrer-policy']).toBe('no-referrer');
    const r2 = await c.send('get', '/api/auth/me', undefined, { 'X-Request-Id': 'abc-123' });
    expect(r2.headers['x-request-id']).toBe('abc-123');
  });

  it('не-GET без Origin и Referer - 403; с чужим Origin - 403; с Referer - проходит', async () => {
    const server = ctx.app.getHttpServer();
    const r = await request(server).post('/api/auth/login').send({ username: 'anna_owner', password: PASSWORD });
    expect(r.status).toBe(403);
    expect(r.body.error.code).toBe('forbidden');
    const r2 = await request(server).post('/api/auth/login').set('Origin', 'https://evil.example').send({ username: 'anna_owner', password: PASSWORD });
    expect(r2.status).toBe(403);
    const r3 = await request(server).post('/api/auth/login').set('Referer', `${ORIGIN}/login`).send({ username: 'anna_owner', password: PASSWORD });
    expect(r3.status).toBe(200);
  });

  it('не-GET с телом без Content-Type: application/json - 400; битый JSON - 400', async () => {
    const server = ctx.app.getHttpServer();
    const r = await request(server).post('/api/auth/login').set('Origin', ORIGIN).set('Content-Type', 'text/plain').send('hello');
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe('bad_request');
    const r2 = await request(server).post('/api/auth/login').set('Origin', ORIGIN).set('Content-Type', 'application/json').send('{bad');
    expect(r2.status).toBe(400);
  });

  it('неизвестный адрес - 404 в формате ErrorResponse', async () => {
    const r = await new Client(ctx).get('/api/nope');
    expect(r.status).toBe(404);
    expect(r.body.error.code).toBe('not_found');
  });

  it('CORS для разрешённого origin с credentials', async () => {
    const r = await request(ctx.app.getHttpServer()).options('/api/auth/login').set('Origin', ORIGIN).set('Access-Control-Request-Method', 'POST');
    expect(r.status).toBe(204);
    expect(r.headers['access-control-allow-origin']).toBe(ORIGIN);
    expect(r.headers['access-control-allow-credentials']).toBe('true');
  });

  it('в контракте у каждой ручки есть x-permission или x-public (п. 11)', () => {
    const ops = ctx.contract.operations();
    expect(ops.length).toBe(35);
    for (const op of ops) expect(op.permission !== null || op.isPublic, op.id).toBe(true);
  });
});

describe('Пакет 1. Вход', () => {
  it('1. верные данные - 200 и cookie; Anna_Owner входит как anna_owner', async () => {
    const c = new Client(ctx);
    const r = await c.post('/api/auth/login', { username: '  Anna_Owner ', password: PASSWORD });
    expect(r.status).toBe(200);
    expect(r.body.user.username).toBe('anna_owner');
    const cookie = (r.headers['set-cookie'] as unknown as string[]).find((x) => x.startsWith('sid='))!;
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).toMatch(/Path=\//);
  });

  it('1. неверный пароль и несуществующий логин - одинаковый 401', async () => {
    const c = new Client(ctx);
    const a = await c.post('/api/auth/login', { username: 'boris_admin', password: 'wrong-pass1' });
    const b = await c.post('/api/auth/login', { username: 'no_such_user', password: 'wrong-pass1' });
    const d = await c.post('/api/auth/login', { username: 'boris_admin', password: 'x'.repeat(129) });
    for (const r of [a, b, d]) {
      expect(r.status).toBe(401);
      expect(r.body.error).toEqual(a.body.error);
      expect(r.body.error.code).toBe('invalid_credentials');
    }
  });

  it('1. 11-я неудачная попытка с одной пары за 15 минут - 429 с Retry-After', async () => {
    const c = new Client(ctx);
    for (let i = 0; i < 10; i++) {
      const r = await c.post('/api/auth/login', { username: 'denis_member', password: 'wrong-pass1' });
      expect(r.status).toBe(401);
    }
    const r = await c.post('/api/auth/login', { username: 'denis_member', password: PASSWORD });
    expect(r.status).toBe(429);
    expect(r.body.error.code).toBe('too_many_attempts');
    expect(Number(r.headers['retry-after'])).toBeGreaterThan(0);
    // Другая пара (логин, IP) не заблокирована; сброс - чтобы не мешать остальным тестам
    ctx.limiter.reset();
  });

  it('2. /auth/me без cookie - 401; после logout прежняя cookie - 401', async () => {
    const anon = new Client(ctx);
    expect((await anon.get('/api/auth/me')).status).toBe(401);
    const c = await as(ctx, 'clara_member');
    const me = await c.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.user.username).toBe('clara_member');
    const sid = c.sid;
    expect((await c.post('/api/auth/logout')).status).toBe(204);
    c.sid = sid;
    expect((await c.get('/api/auth/me')).status).toBe(401);
  });
});

describe('Пакет 1. Приглашения', () => {
  it('3. приглашение new: данные, проверка логина, ошибки accept, успех, повтор - 404', async () => {
    const token = inviteToken(ctx.inviteLink);
    const c = new Client(ctx);
    const info = await c.get(`/api/invitations/${token}`);
    expect(info.status).toBe(200);
    expect(info.body).toEqual({ name: 'Глеб Игнатьев', kind: 'new', username: null });

    const taken = await c.get(`/api/invitations/${token}/username-available?username=anna_owner`);
    expect(taken.body).toEqual({ available: false, reason: 'taken' });
    const invalid = await c.get(`/api/invitations/${token}/username-available?username=${encodeURIComponent('A!')}`);
    expect(invalid.body).toEqual({ available: false, reason: 'invalid' });
    const free = await c.get(`/api/invitations/${token}/username-available?username=gleb_invited`);
    expect(free.body).toEqual({ available: true, reason: null });

    const noLogin = await c.post(`/api/invitations/${token}/accept`, { password: 'goodpass1' });
    expect(noLogin.status).toBe(422);
    expect(noLogin.body.error.fields.username).toBe('required');
    const upper = await c.post(`/api/invitations/${token}/accept`, { username: 'Gleb', password: 'goodpass1' });
    expect(upper.status).toBe(422);
    expect(upper.body.error.fields.username).toBe('invalid');
    const busy = await c.post(`/api/invitations/${token}/accept`, { username: 'anna_owner', password: 'goodpass1' });
    expect(busy.status).toBe(409);
    expect(busy.body.error.code).toBe('username_taken');
    expect(busy.body.error.fields).toBeUndefined();
    const weak = await c.post(`/api/invitations/${token}/accept`, { username: 'gleb_invited', password: 'onlyletters' });
    expect(weak.status).toBe(422);
    expect(weak.body.error.fields.password).toBe('invalid');
    const short = await c.post(`/api/invitations/${token}/accept`, { username: 'gleb_invited', password: 'a1' });
    expect(short.body.error.fields.password).toBe('invalid');

    const ok = await c.post(`/api/invitations/${token}/accept`, { username: 'gleb_invited', password: 'goodpass1' });
    expect(ok.status).toBe(200);
    expect(ok.body.user.username).toBe('gleb_invited');
    expect((await c.get('/api/auth/me')).body.user.username).toBe('gleb_invited');

    const again = await c.post(`/api/invitations/${token}/accept`, { username: 'gleb_other', password: 'goodpass1' });
    expect(again.status).toBe(404);
    expect(again.body.error.code).toBe('invitation_invalid');
    expect((await c.get(`/api/invitations/${token}`)).status).toBe(404);
    expect((await c.get('/api/invitations/garbage')).body.error.code).toBe('invitation_invalid');
  });

  it('4. приглашение reissue: логин в ответе, username - not_allowed, новый пароль работает, старый - нет', async () => {
    const boris = await as(ctx, 'boris_admin');
    const user = await ctx.db.selectFrom('users').select('id').where('username', '=', 'boris_admin').executeTakeFirstOrThrow();
    const link = await ctx.db.transaction().execute((tx) => issueInvitation(tx, ctx.config, user.id));
    const token = inviteToken(link);
    const c = new Client(ctx);
    // Старая сессия отозвана выдачей новой ссылки, старый пароль не работает
    expect((await boris.get('/api/auth/me')).status).toBe(401);
    expect((await c.post('/api/auth/login', { username: 'boris_admin', password: PASSWORD })).status).toBe(401);

    const info = await c.get(`/api/invitations/${token}`);
    expect(info.body).toEqual({ name: 'Борис Адамов', kind: 'reissue', username: 'boris_admin' });
    const withLogin = await c.post(`/api/invitations/${token}/accept`, { username: 'boris_admin', password: 'newpass123' });
    expect(withLogin.status).toBe(422);
    expect(withLogin.body.error.fields.username).toBe('not_allowed');
    const ok = await c.post(`/api/invitations/${token}/accept`, { password: 'newpass123' });
    expect(ok.status).toBe(200);
    expect(ok.body.user.username).toBe('boris_admin');
    expect((await new Client(ctx).post('/api/auth/login', { username: 'boris_admin', password: 'newpass123' })).status).toBe(200);
    expect((await new Client(ctx).post('/api/auth/login', { username: 'boris_admin', password: PASSWORD })).status).toBe(401);
    // Вернуть пароль для остальных тестов
    const back = new Client(ctx);
    await back.login('boris_admin', 'newpass123');
    expect((await back.post('/api/profile/password', { current: 'newpass123', next: PASSWORD })).status).toBe(204);
  });

  it('5. два одновременных accept одной ссылки (20 повторов): один 200, второй 404', async () => {
    for (let i = 0; i < 20; i++) {
      const { link } = await createUser(ctx.db, ctx.config, `Параллельный ${i}`);
      const token = inviteToken(link);
      const [a, b] = await Promise.all([
        new Client(ctx).post(`/api/invitations/${token}/accept`, { username: `par_a_${i}`, password: 'goodpass1' }),
        new Client(ctx).post(`/api/invitations/${token}/accept`, { username: `par_b_${i}`, password: 'goodpass1' }),
      ]);
      expect([a.status, b.status].sort()).toEqual([200, 404]);
    }
  });
});

describe('Пакет 1. Профиль', () => {
  it('6. PATCH /profile меняет имя; пустое - 422 required; 101 символ - 422 too_long', async () => {
    const c = await as(ctx, 'denis_member');
    const r = await c.patch('/api/profile', { name: '  Денис М.  ' });
    expect(r.status).toBe(200);
    expect(r.body.user.name).toBe('Денис М.');
    const empty = await c.patch('/api/profile', { name: '   ' });
    expect(empty.status).toBe(422);
    expect(empty.body.error.fields.name).toBe('required');
    const long = await c.patch('/api/profile', { name: 'я'.repeat(101) });
    expect(long.status).toBe(422);
    expect(long.body.error.fields.name).toBe('too_long');
    const extra = await c.patch('/api/profile', { name: 'Денис', username: 'x' });
    expect(extra.body.error.fields.username).toBe('invalid');
    await c.patch('/api/profile', { name: 'Денис Морозов' });
  });

  it('6. смена пароля: неверный current - 422 invalid; верный - 204, другая сессия - 401, текущая жива', async () => {
    const first = await as(ctx, 'eva_viewer');
    const second = await as(ctx, 'eva_viewer');
    const bad = await first.post('/api/profile/password', { current: 'wrong-pass1', next: 'evapass123' });
    expect(bad.status).toBe(422);
    expect(bad.body.error.fields.current).toBe('invalid');
    const weak = await first.post('/api/profile/password', { current: PASSWORD, next: 'short' });
    expect(weak.status).toBe(422);
    expect(weak.body.error.fields.next).toBe('invalid');
    const ok = await first.post('/api/profile/password', { current: PASSWORD, next: 'evapass123' });
    expect(ok.status).toBe(204);
    expect((await second.get('/api/auth/me')).status).toBe(401);
    expect((await first.get('/api/auth/me')).status).toBe(200);
    expect((await first.post('/api/profile/password', { current: 'evapass123', next: PASSWORD })).status).toBe(204);
  });
});

describe('Пакет 1. Проекты, права, справочники', () => {
  it('7. GET /projects: clara - DEMO и SIMPLE с ролями, hanna - пусто', async () => {
    const clara = await as(ctx, 'clara_member');
    const r = await clara.get('/api/projects');
    expect(r.body.items.map((p: { key: string; role: string }) => [p.key, p.role])).toEqual([
      ['DEMO', 'member'],
      ['SIMPLE', 'member'],
    ]);
    const hanna = await as(ctx, 'hanna_free');
    expect((await hanna.get('/api/projects')).body).toEqual({ items: [] });
  });

  it('8. /projects/:id/me у каждой роли - ключи по матрице; hanna - 404; не UUID - 404', async () => {
    const viewerKeys = ['project-view', 'board-view', 'task-view', 'member-list', 'comment-create', 'comment-update', 'comment-delete'];
    const expected: Record<string, [string, string[]]> = {
      anna_owner: ['owner', ALL_PERMISSIONS],
      boris_admin: ['admin', ALL_PERMISSIONS],
      clara_member: ['member', ALL_PERMISSIONS],
      eva_viewer: ['viewer', viewerKeys],
    };
    for (const [username, [role, perms]] of Object.entries(expected)) {
      const c = await as(ctx, username);
      const r = await c.get(`/api/projects/${DEMO}/me`);
      expect(r.status).toBe(200);
      expect(r.body.role).toBe(role);
      expect(r.body.permissions).toEqual(perms);
    }
    const hanna = await as(ctx, 'hanna_free');
    expect((await hanna.get(`/api/projects/${DEMO}/me`)).status).toBe(404);
    expect((await hanna.get('/api/projects/not-a-uuid/me')).status).toBe(404);
  });

  it('9. участники, статусы, доски, направления', async () => {
    const c = await as(ctx, 'eva_viewer');
    const members = (await c.get(`/api/projects/${DEMO}/members`)).body.items;
    expect(members.map((m: { username: string }) => m.username)).toEqual(['anna_owner', 'boris_admin', 'denis_member', 'eva_viewer', 'clara_member']);
    const statuses = (await c.get(`/api/projects/${DEMO}/statuses`)).body.items;
    expect(statuses.map((s: { name: string }) => s.name)).toEqual([
      'Backlog', 'PBR', 'Plan', 'To do', 'Reopened', 'In progress', 'In review', 'In test', 'For release', 'Blocked', 'Done', 'Cancelled',
    ]);
    expect(statuses.filter((s: { requiresReason: boolean }) => s.requiresReason).map((s: { name: string }) => s.name)).toEqual(['Blocked', 'Cancelled']);
    const boards = (await c.get(`/api/projects/${DEMO}/boards`)).body.items;
    expect(boards.map((b: { name: string }) => b.name)).toEqual(['Разработка', 'Планирование', 'Frontend']);
    expect(boards[0].columns.map((x: { name: string }) => x.name)).toEqual(['To do', 'Reopened', 'In progress', 'In review', 'In test', 'For release', 'Blocked', 'Done']);
    expect(boards[0].columns.find((x: { name: string }) => x.name === 'Blocked').requiresReason).toBe(true);
    expect(boards[1].columns.map((x: { name: string }) => x.name)).toEqual(['Backlog', 'PBR', 'Plan', 'To do']);
    expect(boards[0].doneWindowDays).toBe(14);
    const subs = (await c.get(`/api/projects/${DEMO}/subsystems`)).body.items;
    expect(subs.map((s: { name: string }) => s.name)).toEqual(['Backend', 'Frontend']);
    const clara = await as(ctx, 'clara_member');
    expect((await clara.get(`/api/projects/${SIMPLE}/subsystems`)).body.items).toEqual([]);
    const simpleBoards = (await clara.get(`/api/projects/${SIMPLE}/boards`)).body.items;
    expect(simpleBoards.map((b: { name: string }) => b.name)).toEqual(['Основная']);
  });

  it('10. теги: Release при release - 409 name_taken; viewer - 403; гонка одного имени (20 повторов)', async () => {
    const clara = await as(ctx, 'clara_member');
    const tags = (await clara.get(`/api/projects/${DEMO}/tags`)).body.items;
    expect(tags.map((t: { name: string }) => t.name)).toEqual(['release', 'tech-debt', 'ux']);
    const dup = await clara.post(`/api/projects/${DEMO}/tags`, { name: 'Release' });
    expect(dup.status).toBe(409);
    expect(dup.body.error).toMatchObject({ code: 'name_taken', fields: { name: 'taken' } });
    const eva = await as(ctx, 'eva_viewer');
    expect((await eva.post(`/api/projects/${DEMO}/tags`, { name: 'new-tag' })).status).toBe(403);
    expect((await clara.post(`/api/projects/${DEMO}/tags`, { name: '' })).body.error.fields.name).toBe('required');
    expect((await clara.post(`/api/projects/${DEMO}/tags`, { name: 'x'.repeat(101) })).body.error.fields.name).toBe('too_long');
    const created = await clara.post(`/api/projects/${DEMO}/tags`, { name: '  backend-api ' });
    expect(created.status).toBe(201);
    expect(created.body.name).toBe('backend-api');
    for (let i = 0; i < 20; i++) {
      const [a, b] = await Promise.all([
        clara.post(`/api/projects/${DEMO}/tags`, { name: `race-${i}` }),
        clara.post(`/api/projects/${DEMO}/tags`, { name: `RACE-${i}` }),
      ]);
      expect([a.status, b.status].sort()).toEqual([201, 409]);
    }
  });

  it('порядок ответов: 401 раньше 404, 404 раньше 403, 403 раньше 422', async () => {
    const anon = new Client(ctx);
    expect((await anon.post(`/api/projects/${DEMO}/tags`, { name: '' })).status).toBe(401);
    const hanna = await as(ctx, 'hanna_free');
    expect((await hanna.post(`/api/projects/${DEMO}/tags`, { name: '' })).status).toBe(404);
    const eva = await as(ctx, 'eva_viewer');
    expect((await eva.post(`/api/projects/${DEMO}/tags`, { name: '' })).status).toBe(403);
  });
});
