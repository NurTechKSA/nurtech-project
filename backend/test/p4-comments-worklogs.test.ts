import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { utcDate } from '../src/core.js';
import { as, projectId, setup, type Client, type Ctx } from './helpers.js';

let ctx: Ctx;
let DEMO: string;
let SIMPLE: string;
const c: Record<string, Client> = {};
let statuses: Record<string, string>;

type Comment = { id: string; body: string; kind: string; author: { username: string }; createdAt: string; editedAt: string | null };

const byKey = async (key: string) => (await c.clara.get(`/api/projects/${DEMO}/tasks/by-key/${key}`)).body;
const newTask = async (title: string, extra: Record<string, unknown> = {}) =>
  (await c.clara.post(`/api/projects/${DEMO}/tasks`, { type: 'task', title, ...extra })).body;

beforeAll(async () => {
  ctx = await setup();
  DEMO = await projectId(ctx, 'DEMO');
  SIMPLE = await projectId(ctx, 'SIMPLE');
  for (const u of ['anna_owner', 'boris_admin', 'clara_member', 'denis_member', 'eva_viewer']) c[u.split('_')[0]] = await as(ctx, u);
  statuses = Object.fromEntries(((await c.clara.get(`/api/projects/${DEMO}/statuses`)).body.items as Array<{ id: string; name: string }>).map((s) => [s.name, s.id]));
});
afterAll(() => ctx.close());

describe('Пакет 4. Комментарии', () => {
  it('1. создание добавляет в конец ленты, commentCount растёт; 2001 - too_long; пустой - required; markdown хранится как есть', async () => {
    const t = await newTask('Комменты');
    const r = await c.clara.post(`/api/tasks/${t.id}/comments`, { body: '  - пункт\n  - ещё  ' });
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ kind: 'comment', body: '  - пункт\n  - ещё  ', author: { username: 'clara_member' }, editedAt: null });
    await c.denis.post(`/api/tasks/${t.id}/comments`, { body: 'второй' });
    const list = (await c.clara.get(`/api/tasks/${t.id}/comments`)).body;
    expect(list.items.map((x: Comment) => x.body)).toEqual(['  - пункт\n  - ещё  ', 'второй']);
    expect(list).toMatchObject({ hasMore: false, nextCursor: null });
    expect((await byKey(t.key)).commentCount).toBe(2);
    expect((await c.clara.post(`/api/tasks/${t.id}/comments`, { body: 'x'.repeat(2001) })).body.error.fields.body).toBe('too_long');
    // Длина считается по обрезанному тексту; исходный длиннее лимита ответа - хранится обрезанный
    const padded = await c.clara.post(`/api/tasks/${t.id}/comments`, { body: ' '.repeat(10) + 'x'.repeat(2000) });
    expect(padded.status).toBe(201);
    expect(padded.body.body).toBe('x'.repeat(2000));
    expect((await c.clara.post(`/api/tasks/${t.id}/comments`, { body: '   ' })).body.error.fields.body).toBe('required');
    expect((await c.clara.post(`/api/tasks/${t.id}/comments`, {})).body.error.fields.body).toBe('required');
    expect((await c.clara.post(`/api/tasks/${t.id}/comments`, { body: 'x', kind: 'status_reason' })).body.error.fields.kind).toBe('invalid');
  });

  it('2. курсор: последние 20 и hasMore; более ранние без пропусков и повторов, даже если курсор удалили; before=abc - 422', async () => {
    const t = await byKey('DEMO-2');
    const first = (await c.clara.get(`/api/tasks/${t.id}/comments`)).body;
    expect(first.items).toHaveLength(20);
    expect(first.hasMore).toBe(true);
    const all = await ctx.db.selectFrom('comments').select('id').where('task_id', '=', t.id).orderBy('created_at').orderBy('id').execute();
    expect(all.length).toBeGreaterThan(25);
    expect(first.items.map((x: Comment) => x.id)).toEqual(all.slice(-20).map((x) => x.id));
    // Удаляем комментарий, на котором остановилась выдача
    expect((await c.anna.delete(`/api/comments/${first.items[0].id}`)).status).toBe(204);
    const second = (await c.clara.get(`/api/tasks/${t.id}/comments?before=${first.nextCursor}`)).body;
    expect(second.items.map((x: Comment) => x.id)).toEqual(all.slice(0, -20).map((x) => x.id).slice(-20));
    expect(second.hasMore).toBe(all.length - 20 > 20);
    const small = (await c.clara.get(`/api/tasks/${t.id}/comments?limit=5`)).body;
    expect(small.items).toHaveLength(5);
    const next = (await c.clara.get(`/api/tasks/${t.id}/comments?limit=5&before=${small.nextCursor}`)).body;
    expect(next.items.at(-1).createdAt <= small.items[0].createdAt).toBe(true);
    expect(new Set([...small.items, ...next.items].map((x: Comment) => x.id)).size).toBe(10);
    expect((await c.clara.get(`/api/tasks/${t.id}/comments?before=abc`)).body.error.fields.before).toBe('invalid');
    expect((await c.clara.get(`/api/tasks/${t.id}/comments?limit=51`)).body.error.fields.limit).toBe('invalid');
    expect((await c.clara.get(`/api/tasks/${t.id}/comments?limit=0`)).body.error.fields.limit).toBe('invalid');
  });

  it('3. правка и удаление по ролям', async () => {
    const t = await newTask('Права комментариев');
    const own = (await c.clara.post(`/api/tasks/${t.id}/comments`, { body: 'мой' })).body;
    const edited = await c.clara.patch(`/api/comments/${own.id}`, { body: 'мой, исправленный' });
    expect(edited.status).toBe(200);
    expect(edited.body.editedAt).not.toBeNull();
    const same = await c.clara.patch(`/api/comments/${own.id}`, {});
    expect(same.body.body).toBe('мой, исправленный');
    expect((await c.boris.patch(`/api/comments/${own.id}`, { body: 'x' })).status).toBe(403);
    expect((await c.anna.patch(`/api/comments/${own.id}`, { body: 'x' })).status).toBe(403);
    expect((await c.denis.delete(`/api/comments/${own.id}`)).status).toBe(403);
    expect((await c.boris.delete(`/api/comments/${own.id}`)).status).toBe(204);
    const mine = (await c.clara.post(`/api/tasks/${t.id}/comments`, { body: 'свой' })).body;
    expect((await c.clara.delete(`/api/comments/${mine.id}`)).status).toBe(204);
    expect((await c.clara.delete(`/api/comments/${mine.id}`)).status).toBe(404);
    const evas = await c.eva.post(`/api/tasks/${t.id}/comments`, { body: 'от наблюдателя' });
    expect(evas.status).toBe(201);
    expect((await c.eva.patch(`/api/comments/${evas.body.id}`, { body: 'поправила' })).status).toBe(200);
    const foreign = (await c.anna.post(`/api/tasks/${t.id}/comments`, { body: 'от владельца' })).body;
    expect((await c.eva.delete(`/api/comments/${foreign.id}`)).status).toBe(403);
    expect((await c.anna.delete(`/api/comments/${evas.body.id}`)).status).toBe(204);
    expect((await c.eva.patch(`/api/comments/${foreign.id}`, { body: '' })).status).toBe(403);
    expect((await c.anna.patch(`/api/comments/${foreign.id}`, { body: '' })).body.error.fields.body).toBe('required');
  });

  it('комментарий-причина читается, правится и удаляется по общим правилам', async () => {
    const t = await newTask('Причина');
    await c.clara.post(`/api/tasks/${t.id}/move`, { statusId: statuses.Blocked, reason: 'Ждём API' });
    const list = (await c.eva.get(`/api/tasks/${t.id}/comments`)).body.items;
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ kind: 'status_reason', body: 'Ждём API', author: { username: 'clara_member' } });
    expect((await c.clara.patch(`/api/comments/${list[0].id}`, { body: 'Ждём API бэкенда' })).body.kind).toBe('status_reason');
    // В сиде у задач в Blocked и Cancelled есть причины
    for (const key of ['DEMO-19', 'DEMO-20', 'DEMO-32']) {
      const task = await byKey(key);
      const items = (await c.clara.get(`/api/tasks/${task.id}/comments`)).body.items;
      expect(items.some((x: Comment) => x.kind === 'status_reason'), key).toBe(true);
    }
  });

  it('4. updatedAt задачи меняется после создания, правки и удаления комментария и не меняется после списания', async () => {
    const t = await newTask('updatedAt');
    let last = t.updatedAt;
    const tick = () => new Promise((r) => setTimeout(r, 15));
    const updated = async () => (await byKey(t.key)).updatedAt;
    await tick();
    const cm = (await c.clara.post(`/api/tasks/${t.id}/comments`, { body: 'a' })).body;
    expect(await updated()).not.toBe(last);
    last = await updated();
    await tick();
    await c.clara.patch(`/api/comments/${cm.id}`, { body: 'b' });
    expect(await updated()).not.toBe(last);
    last = await updated();
    await tick();
    await c.clara.delete(`/api/comments/${cm.id}`);
    expect(await updated()).not.toBe(last);
    last = await updated();
    await tick();
    const wl = (await c.clara.post(`/api/tasks/${t.id}/worklogs`, { minutes: 30 })).body;
    await c.clara.patch(`/api/worklogs/${wl.id}`, { minutes: 40 });
    await c.clara.delete(`/api/worklogs/${wl.id}`);
    expect(await updated()).toBe(last);
    expect((await c.clara.get(`/api/tasks/${t.id}/history`)).body.items).toHaveLength(1);
  });
});

describe('Пакет 4. Списания времени', () => {
  it('5. 0, 1441, послезавтра - 422; завтра - 201; суммы пересчитаны; totalMinutes', async () => {
    const parent = await newTask('Родитель');
    const sub = (await c.clara.post(`/api/projects/${DEMO}/tasks`, { type: 'subtask', title: 'Подзадача', parentId: parent.id })).body;
    expect((await c.clara.post(`/api/tasks/${sub.id}/worklogs`, { minutes: 0 })).body.error.fields.minutes).toBe('invalid');
    expect((await c.clara.post(`/api/tasks/${sub.id}/worklogs`, { minutes: 1441 })).body.error.fields.minutes).toBe('invalid');
    expect((await c.clara.post(`/api/tasks/${sub.id}/worklogs`, { minutes: 10, date: utcDate(2) })).body.error.fields.date).toBe('in_future');
    expect((await c.clara.post(`/api/tasks/${sub.id}/worklogs`, { minutes: 10, date: '2026-13-01' })).body.error.fields.date).toBe('invalid');
    expect((await c.clara.post(`/api/tasks/${sub.id}/worklogs`, { minutes: 10, comment: 'x'.repeat(2001) })).body.error.fields.comment).toBe('too_long');
    const tomorrow = await c.clara.post(`/api/tasks/${sub.id}/worklogs`, { minutes: 90, date: utcDate(1), comment: '  ' });
    expect(tomorrow.status).toBe(201);
    expect(tomorrow.body).toMatchObject({ minutes: 90, date: utcDate(1), comment: null, user: { username: 'clara_member' } });
    const today = await c.denis.post(`/api/tasks/${sub.id}/worklogs`, { minutes: 30, comment: 'ревью', date: null });
    expect(today.body.date).toBe(utcDate());
    await c.clara.post(`/api/tasks/${sub.id}/worklogs`, { minutes: 15, date: '2025-01-01' });
    await c.clara.post(`/api/tasks/${parent.id}/worklogs`, { minutes: 20 });
    const list = (await c.clara.get(`/api/tasks/${sub.id}/worklogs`)).body;
    expect(list.totalMinutes).toBe(135);
    expect(list.items.map((w: { date: string }) => w.date)).toEqual([utcDate(1), utcDate(), '2025-01-01']);
    expect((await byKey(sub.key)).spentMinutes).toBe(135);
    const p = await byKey(parent.key);
    expect(p.spentMinutes).toBe(20);
    expect(p.subtasksSpentMinutes).toBe(135);
  });

  it('6. clara правит и удаляет своё, чужое - 403; boris - любое; eva создать не может', async () => {
    const t = await newTask('Права времени');
    const claras = (await c.clara.post(`/api/tasks/${t.id}/worklogs`, { minutes: 60 })).body;
    const denis = (await c.denis.post(`/api/tasks/${t.id}/worklogs`, { minutes: 45 })).body;
    const edited = await c.clara.patch(`/api/worklogs/${claras.id}`, { minutes: 75, comment: 'уточнила', date: utcDate(-1) });
    expect(edited.body).toMatchObject({ minutes: 75, comment: 'уточнила', date: utcDate(-1) });
    expect((await c.clara.patch(`/api/worklogs/${claras.id}`, { comment: null })).body.comment).toBeNull();
    expect((await c.clara.patch(`/api/worklogs/${claras.id}`, { minutes: null })).body.error.fields.minutes).toBe('invalid');
    expect((await c.clara.patch(`/api/worklogs/${claras.id}`, { date: utcDate(2) })).body.error.fields.date).toBe('in_future');
    expect((await c.clara.patch(`/api/worklogs/${denis.id}`, { minutes: 1 })).status).toBe(403);
    expect((await c.clara.delete(`/api/worklogs/${denis.id}`)).status).toBe(403);
    const byAdmin = await c.boris.patch(`/api/worklogs/${denis.id}`, { minutes: 50 });
    expect(byAdmin.body).toMatchObject({ minutes: 50, user: { username: 'denis_member' } });
    expect((await c.boris.delete(`/api/worklogs/${denis.id}`)).status).toBe(204);
    expect((await c.clara.delete(`/api/worklogs/${claras.id}`)).status).toBe(204);
    expect((await c.eva.post(`/api/tasks/${t.id}/worklogs`, { minutes: 10 })).status).toBe(403);
    expect((await c.eva.get(`/api/tasks/${t.id}/worklogs`)).status).toBe(200);
  });

  it('7. комментарий или списание из чужого проекта - 404', async () => {
    const boris = c.boris;
    const simpleTask = await ctx.db.selectFrom('tasks').select('id').where('project_id', '=', SIMPLE).executeTakeFirstOrThrow();
    const cm = (await boris.post(`/api/tasks/${simpleTask.id}/comments`, { body: 'в SIMPLE' })).body;
    const wl = (await boris.post(`/api/tasks/${simpleTask.id}/worklogs`, { minutes: 5 })).body;
    // anna не участница SIMPLE
    expect((await c.anna.patch(`/api/comments/${cm.id}`, { body: 'x' })).status).toBe(404);
    expect((await c.anna.delete(`/api/comments/${cm.id}`)).status).toBe(404);
    expect((await c.anna.patch(`/api/worklogs/${wl.id}`, { minutes: 1 })).status).toBe(404);
    expect((await c.anna.delete(`/api/worklogs/${wl.id}`)).status).toBe(404);
    expect((await c.anna.get(`/api/tasks/${simpleTask.id}/comments`)).status).toBe(404);
    expect((await c.anna.get(`/api/tasks/${simpleTask.id}/worklogs`)).status).toBe(404);
    expect((await c.anna.delete('/api/comments/00000000-0000-4000-8000-000000000000')).status).toBe(404);
    expect((await c.anna.delete('/api/worklogs/not-a-uuid')).status).toBe(404);
  });

  it('сид: списания у 5–6 задач от разных людей, у родителя строка «по подзадачам»', async () => {
    const rows = await ctx.db.selectFrom('worklogs').select(['task_id', 'user_id']).execute();
    expect(new Set(rows.map((r) => r.task_id)).size).toBeGreaterThanOrEqual(5);
    expect(new Set(rows.map((r) => r.user_id)).size).toBeGreaterThanOrEqual(3);
    expect((await byKey('DEMO-6')).subtasksSpentMinutes).toBeGreaterThan(0);
  });
});
