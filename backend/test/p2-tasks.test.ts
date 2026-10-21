import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { as, projectId, setup, type Client, type Ctx } from './helpers.js';

let ctx: Ctx;
let DEMO: string;
let SIMPLE: string;
let clara: Client;
let eva: Client;
let statuses: Record<string, string>;
const users: Record<string, string> = {};

const byKey = async (c: Client, key: string) => (await c.get(`/api/projects/${DEMO}/tasks/by-key/${key}`)).body;

beforeAll(async () => {
  ctx = await setup();
  DEMO = await projectId(ctx, 'DEMO');
  SIMPLE = await projectId(ctx, 'SIMPLE');
  clara = await as(ctx, 'clara_member');
  eva = await as(ctx, 'eva_viewer');
  const list = (await clara.get(`/api/projects/${DEMO}/statuses`)).body.items as Array<{ id: string; name: string }>;
  statuses = Object.fromEntries(list.map((s) => [s.name, s.id]));
  for (const u of await ctx.db.selectFrom('users').select(['id', 'username']).execute()) if (u.username) users[u.username] = u.id;
});
afterAll(() => ctx.close());

describe('Пакет 2. Поиск', () => {
  it('15. q=de не находит задачи без «de» в названии; q=12 - DEMO-12; q=demo-1 - DEMO-1 и DEMO-10; types; excludeId; limit', async () => {
    const de = (await clara.get(`/api/projects/${DEMO}/tasks/search?q=de&limit=20`)).body.items;
    expect(de.every((t: { title: string }) => t.title.toLowerCase().includes('de'))).toBe(true);
    const n12 = (await clara.get(`/api/projects/${DEMO}/tasks/search?q=12`)).body.items;
    expect(n12[0].key).toBe('DEMO-12');
    const d1 = (await clara.get(`/api/projects/${DEMO}/tasks/search?q=demo-1&limit=20`)).body.items.map((t: { key: string }) => t.key);
    expect(d1[0]).toBe('DEMO-1');
    expect(d1).toContain('DEMO-10');
    const minus = (await clara.get(`/api/projects/${DEMO}/tasks/search?q=-1&limit=20`)).body.items.map((t: { key: string }) => t.key);
    expect(minus[0]).toBe('DEMO-1');
    const parents = (await clara.get(`/api/projects/${DEMO}/tasks/search?types=task,bug&limit=20`)).body.items;
    expect(parents.every((t: { type: string }) => t.type !== 'subtask')).toBe(true);
    const t12 = await byKey(clara, 'DEMO-12');
    const ex = (await clara.get(`/api/projects/${DEMO}/tasks/search?q=12&excludeId=${t12.id}`)).body.items;
    expect(ex.find((t: { key: string }) => t.key === 'DEMO-12')).toBeUndefined();
    expect((await clara.get(`/api/projects/${DEMO}/tasks/search?limit=3`)).body.items).toHaveLength(3);
    expect((await clara.get(`/api/projects/${DEMO}/tasks/search`)).body.items).toHaveLength(10);
    expect((await clara.get(`/api/projects/${DEMO}/tasks/search?q=%25`)).body.items).toEqual([]);
    expect((await clara.get(`/api/projects/${DEMO}/tasks/search?limit=21`)).body.error.fields.limit).toBe('invalid');
    expect((await clara.get(`/api/projects/${DEMO}/tasks/search?types=epic`)).body.error.fields.types).toBe('invalid');
    expect((await clara.get(`/api/projects/${DEMO}/tasks/search?excludeId=abc`)).body.error.fields.excludeId).toBe('invalid');
    expect((await clara.get(`/api/projects/${DEMO}/tasks/search?q=${'x'.repeat(101)}`)).body.error.fields.q).toBe('too_long');
  });
});

describe('Пакет 2. Создание задач', () => {
  it('1. 20 одновременных созданий дают 20 разных номеров подряд (10 повторов); пишется created', async () => {
    for (let round = 0; round < 10; round++) {
      const results = await Promise.all(Array.from({ length: 20 }, (_, i) => clara.post(`/api/projects/${DEMO}/tasks`, { type: 'task', title: `Гонка ${round}-${i}` })));
      expect(results.every((r) => r.status === 201)).toBe(true);
      const numbers = results.map((r) => Number(r.body.key.split('-')[1])).sort((a, b) => a - b);
      expect(new Set(numbers).size).toBe(20);
      expect(numbers[19] - numbers[0]).toBe(19);
    }
    const t = await clara.post(`/api/projects/${DEMO}/tasks`, { type: 'task', title: 'С историей' });
    const h = await clara.get(`/api/tasks/${t.body.id}/history`);
    expect(h.body.items.map((e: { kind: string }) => e.kind)).toEqual(['created']);
    expect(h.body.items[0].actor.username).toBe('clara_member');
  });

  it('2. подзадачи: без parentId - required; родитель-подзадача - invalid; другой проект - not_found; Task с parentId - not_allowed', async () => {
    const sub = await byKey(clara, 'DEMO-3');
    const parent = await byKey(clara, 'DEMO-2');
    const simpleTask = await ctx.db.selectFrom('tasks').select('id').where('project_id', '=', SIMPLE).executeTakeFirstOrThrow();
    const r1 = await clara.post(`/api/projects/${DEMO}/tasks`, { type: 'subtask', title: 'x' });
    expect(r1.status).toBe(422);
    expect(r1.body.error.fields.parentId).toBe('required');
    const r2 = await clara.post(`/api/projects/${DEMO}/tasks`, { type: 'subtask', title: 'x', parentId: sub.id });
    expect(r2.body.error.fields.parentId).toBe('invalid');
    const r3 = await clara.post(`/api/projects/${DEMO}/tasks`, { type: 'subtask', title: 'x', parentId: simpleTask.id });
    expect(r3.body.error.fields.parentId).toBe('not_found');
    const r4 = await clara.post(`/api/projects/${DEMO}/tasks`, { type: 'task', title: 'x', parentId: parent.id });
    expect(r4.body.error.fields.parentId).toBe('not_allowed');
    const ok = await clara.post(`/api/projects/${DEMO}/tasks`, { type: 'subtask', title: 'Новая подзадача', parentId: parent.id });
    expect(ok.status).toBe(201);
    expect(ok.body.parent).toEqual({ id: parent.id, key: 'DEMO-2', title: parent.title });
  });

  it('3. в Blocked или Cancelled - reason_required; без statusId - Backlog, в конец колонки', async () => {
    for (const name of ['Blocked', 'Cancelled']) {
      const r = await clara.post(`/api/projects/${DEMO}/tasks`, { type: 'task', title: 'x', statusId: statuses[name] });
      expect(r.status).toBe(422);
      expect(r.body.error.fields.statusId).toBe('reason_required');
    }
    const r = await clara.post(`/api/projects/${DEMO}/tasks`, { type: 'bug', title: 'В конец', statusId: null, priority: null });
    expect(r.status).toBe(201);
    expect(r.body.status.name).toBe('Backlog');
    expect(r.body.priority).toBe('medium');
    const ranks = await ctx.db.selectFrom('tasks').select(['id', 'rank']).where('status_id', '=', statuses.Backlog).orderBy('rank', 'desc').execute();
    expect(ranks[0].id).toBe(r.body.id);
  });

  it('4. название 101 и описание 5001 - too_long; пробелы по краям отсекаются; пустое описание - null', async () => {
    const r = await clara.post(`/api/projects/${DEMO}/tasks`, { type: 'task', title: 'я'.repeat(101), description: 'x'.repeat(5001) });
    expect(r.status).toBe(422);
    expect(r.body.error.fields).toEqual({ title: 'too_long', description: 'too_long' });
    const ok = await clara.post(`/api/projects/${DEMO}/tasks`, { type: 'task', title: '  Отступы  ', description: '   ' });
    expect(ok.body.title).toBe('Отступы');
    expect(ok.body.description).toBeNull();
    const empty = await clara.post(`/api/projects/${DEMO}/tasks`, { type: 'task', title: '   ' });
    expect(empty.body.error.fields.title).toBe('required');
    const bad = await clara.post(`/api/projects/${DEMO}/tasks`, { type: 'epic', title: 'x', estimateMinutes: 0, dueDate: '2026-02-30', extra: 1 });
    expect(bad.body.error.fields).toEqual({ type: 'invalid', estimateMinutes: 'invalid', dueDate: 'invalid', extra: 'invalid' });
  });

  it('8. исполнитель или ревьюер не участник - not_member; чужие статус, направление, тег - not_found', async () => {
    const r = await clara.post(`/api/projects/${DEMO}/tasks`, { type: 'task', title: 'x', assigneeId: users.hanna_free, reviewerId: users.hanna_free });
    expect(r.body.error.fields).toEqual({ assigneeId: 'not_member', reviewerId: 'not_member' });
    const simpleStatus = await ctx.db.selectFrom('statuses').select('id').where('project_id', '=', SIMPLE).executeTakeFirstOrThrow();
    const simpleTag = await ctx.db.insertInto('tags').values({ project_id: SIMPLE, name: 'чужой' }).returning('id').executeTakeFirstOrThrow();
    const r2 = await clara.post(`/api/projects/${DEMO}/tasks`, {
      type: 'task',
      title: 'x',
      statusId: simpleStatus.id,
      subsystemId: '00000000-0000-4000-8000-000000000000',
      tagIds: [simpleTag.id],
    });
    expect(r2.body.error.fields).toEqual({ statusId: 'not_found', subsystemId: 'not_found', tagIds: 'not_found' });
    const p = await clara.patch(`/api/tasks/${(await byKey(clara, 'DEMO-9')).id}`, { reviewerId: users.hanna_free });
    expect(p.body.error.fields.reviewerId).toBe('not_member');
  });

  it('создание со всеми полями отдаёт полный TaskDetail', async () => {
    const tags = (await clara.get(`/api/projects/${DEMO}/tags`)).body.items;
    const subs = (await clara.get(`/api/projects/${DEMO}/subsystems`)).body.items;
    const r = await clara.post(`/api/projects/${DEMO}/tasks`, {
      type: 'bug',
      title: 'Полная задача',
      description: '# Заголовок\n\n- пункт',
      statusId: statuses['In progress'],
      priority: 'critical',
      assigneeId: users.denis_member,
      reviewerId: users.denis_member,
      subsystemId: subs[0].id,
      dueDate: '2020-01-01',
      estimateMinutes: 150,
      tagIds: [tags[0].id, tags[1].id],
    });
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({
      type: 'bug',
      priority: 'critical',
      assignee: { userId: users.denis_member, username: 'denis_member' },
      reviewer: { username: 'denis_member' },
      reporter: { username: 'clara_member' },
      subsystem: subs[0],
      dueDate: '2020-01-01',
      isOverdue: true,
      estimateMinutes: 150,
      spentMinutes: 0,
      blocked: false,
      commentCount: 0,
      subtasks: [],
      subtasksEstimateMinutes: 0,
      subtasksSpentMinutes: 0,
      links: [],
      urls: [],
    });
    expect(r.body.tags).toHaveLength(2);
  });
});

describe('Пакет 2. Правка', () => {
  it('5. PATCH меняет только переданные поля; то же значение - без истории и updatedAt; несколько полей - общий createdAt', async () => {
    const t = (await clara.post(`/api/projects/${DEMO}/tasks`, { type: 'task', title: 'Правка', priority: 'low' })).body;
    await new Promise((r) => setTimeout(r, 15));
    const same = await clara.patch(`/api/tasks/${t.id}`, { title: 'Правка', priority: 'low' });
    expect(same.status).toBe(200);
    expect(same.body.updatedAt).toBe(t.updatedAt);
    expect((await clara.get(`/api/tasks/${t.id}/history`)).body.items).toHaveLength(1);

    const r = await clara.patch(`/api/tasks/${t.id}`, { priority: 'high', assigneeId: users.clara_member, dueDate: '2030-05-01', estimateMinutes: 60 });
    expect(r.body.title).toBe('Правка');
    expect(r.body.priority).toBe('high');
    expect(r.body.updatedAt > t.updatedAt).toBe(true);
    const h = (await clara.get(`/api/tasks/${t.id}/history`)).body.items;
    const changed = h.filter((e: { kind: string }) => e.kind === 'field_changed');
    expect(changed.map((e: { field: string }) => e.field).sort()).toEqual(['assignee', 'dueDate', 'estimateMinutes', 'priority']);
    expect(new Set(changed.map((e: { createdAt: string }) => e.createdAt)).size).toBe(1);
    expect(changed.find((e: { field: string }) => e.field === 'priority')).toMatchObject({ oldValue: { id: null, label: 'low' }, newValue: { id: null, label: 'high' } });
    expect(changed.find((e: { field: string }) => e.field === 'assignee')).toMatchObject({ oldValue: null, newValue: { id: users.clara_member, label: 'Клара Миронова' } });

    const cleared = await clara.patch(`/api/tasks/${t.id}`, { assigneeId: null, dueDate: null, description: null, estimateMinutes: null });
    expect(cleared.body).toMatchObject({ assignee: null, dueDate: null, estimateMinutes: null });
    const nulls = await clara.patch(`/api/tasks/${t.id}`, { title: null, type: null, priority: null });
    expect(nulls.body.error.fields).toEqual({ title: 'invalid', type: 'invalid', priority: 'invalid' });
    // Название и описание не пишутся в историю, но обновляют updatedAt
    const before = (await clara.get(`/api/tasks/${t.id}/history`)).body.items.length;
    const renamed = await clara.patch(`/api/tasks/${t.id}`, { title: 'Новое имя', description: 'текст' });
    expect(renamed.body.updatedAt > cleared.body.updatedAt).toBe(true);
    expect((await clara.get(`/api/tasks/${t.id}/history`)).body.items.length).toBe(before);
  });

  it('6. PATCH со statusId или parentId - invalid; Task <-> Bug; type у подзадачи и type: subtask - invalid', async () => {
    const t = (await clara.post(`/api/projects/${DEMO}/tasks`, { type: 'task', title: 'Тип' })).body;
    const r = await clara.patch(`/api/tasks/${t.id}`, { statusId: statuses.Done, parentId: t.id });
    expect(r.status).toBe(422);
    expect(r.body.error.fields).toEqual({ statusId: 'invalid', parentId: 'invalid' });
    expect((await clara.patch(`/api/tasks/${t.id}`, { type: 'bug' })).body.type).toBe('bug');
    expect((await clara.patch(`/api/tasks/${t.id}`, { type: 'task' })).body.type).toBe('task');
    expect((await clara.patch(`/api/tasks/${t.id}`, { type: 'subtask' })).body.error.fields.type).toBe('invalid');
    const sub = await byKey(clara, 'DEMO-4');
    expect((await clara.patch(`/api/tasks/${sub.id}`, { type: 'task' })).body.error.fields.type).toBe('invalid');
    expect((await clara.patch(`/api/tasks/${sub.id}`, { type: 'subtask' })).body.error.fields.type).toBe('invalid');
  });

  it('7. теги: набор заменяется целиком, событие на каждое отличие; чужой - not_found; 51 - too_many; повтор - duplicate', async () => {
    const tags = (await clara.get(`/api/projects/${DEMO}/tags`)).body.items as Array<{ id: string; name: string }>;
    const t = (await clara.post(`/api/projects/${DEMO}/tasks`, { type: 'task', title: 'Теги', tagIds: [tags[0].id, tags[1].id] })).body;
    const r = await clara.patch(`/api/tasks/${t.id}`, { tagIds: [tags[1].id, tags[2].id] });
    expect(r.body.tags.map((g: { id: string }) => g.id).sort()).toEqual([tags[1].id, tags[2].id].sort());
    const h = (await clara.get(`/api/tasks/${t.id}/history`)).body.items;
    expect(h.filter((e: { kind: string }) => e.kind === 'tag_added').map((e: { newValue: { label: string } }) => e.newValue.label)).toEqual([tags[2].name]);
    expect(h.filter((e: { kind: string }) => e.kind === 'tag_removed').map((e: { oldValue: { label: string } }) => e.oldValue.label)).toEqual([tags[0].name]);
    expect((await clara.patch(`/api/tasks/${t.id}`, { tagIds: ['00000000-0000-4000-8000-000000000001'] })).body.error.fields.tagIds).toBe('not_found');
    const many = Array.from({ length: 51 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`);
    expect((await clara.patch(`/api/tasks/${t.id}`, { tagIds: many })).body.error.fields.tagIds).toBe('too_many');
    expect((await clara.patch(`/api/tasks/${t.id}`, { tagIds: [tags[0].id, tags[0].id] })).body.error.fields.tagIds).toBe('duplicate');
    expect((await clara.patch(`/api/tasks/${t.id}`, { tagIds: [] })).body.tags).toEqual([]);
  });
});

describe('Пакет 2. Чтение', () => {
  it('9. by-key/demo-12 возвращает задачу; не участнику, несуществующему ключу и чужому префиксу - 404', async () => {
    const r = await clara.get(`/api/projects/${DEMO}/tasks/by-key/demo-12`);
    expect(r.status).toBe(200);
    expect(r.body.key).toBe('DEMO-12');
    expect((await clara.get(`/api/projects/${DEMO}/tasks/by-key/DEMO-99999`)).status).toBe(404);
    expect((await clara.get(`/api/projects/${DEMO}/tasks/by-key/SIMPLE-1`)).status).toBe(404);
    expect((await clara.get(`/api/projects/${DEMO}/tasks/by-key/garbage`)).status).toBe(404);
    const hanna = await as(ctx, 'hanna_free');
    expect((await hanna.get(`/api/projects/${DEMO}/tasks/by-key/DEMO-12`)).status).toBe(404);
    const hannaTask = await hanna.get(`/api/tasks/${r.body.id}/history`);
    expect(hannaTask.status).toBe(404);
  });

  it('10. TaskDetail родителя: подзадачи по номеру, суммы по подзадачам; isOverdue', async () => {
    const p = await byKey(clara, 'DEMO-12');
    expect(p.subtasks.map((s: { key: string }) => s.key)).toEqual(['DEMO-13', 'DEMO-14', 'DEMO-15']);
    expect(p.subtasksEstimateMinutes).toBe(240 + 180);
    expect(p.subtasksSpentMinutes).toBe(0);
    const p2 = await byKey(clara, 'DEMO-2');
    expect(p2.subtasksSpentMinutes).toBe(150 + 90 + 30);
    expect(p2.spentMinutes).toBe(0);
    const sub = await byKey(clara, 'DEMO-3');
    expect(sub.subtasks).toEqual([]);
    expect(sub.subtasksEstimateMinutes).toBe(0);
    expect((await byKey(clara, 'DEMO-9')).isOverdue).toBe(true);
    expect((await byKey(clara, 'DEMO-16')).isOverdue).toBe(true);
    const closed = await clara.post(`/api/projects/${DEMO}/tasks`, { type: 'task', title: 'Закрыта с прошлым сроком', statusId: statuses.Done, dueDate: '2020-01-01' });
    expect(closed.body.isOverdue).toBe(false);
  });

  it('11. история от новых к старым; label не меняется после переименования участника', async () => {
    const t = (await clara.post(`/api/projects/${DEMO}/tasks`, { type: 'task', title: 'Метки' })).body;
    await clara.patch(`/api/tasks/${t.id}`, { assigneeId: users.denis_member });
    const denis = await as(ctx, 'denis_member');
    await denis.patch('/api/profile', { name: 'Денис Переименованный' });
    const h = (await clara.get(`/api/tasks/${t.id}/history`)).body.items;
    expect(h.map((e: { kind: string }) => e.kind)).toEqual(['field_changed', 'created']);
    expect(h[0].newValue.label).toBe('Денис Морозов');
    expect(h[0].createdAt >= h[1].createdAt).toBe(true);
    await denis.patch('/api/profile', { name: 'Денис Морозов' });
  });
});

describe('Пакет 2. Связи', () => {
  it('12. blocks и blocked_by видны с обеих сторон, история обеих; на себя - same_task; повтор - link_exists; цикл - link_cycle', async () => {
    const mk = async (title: string) => (await clara.post(`/api/projects/${DEMO}/tasks`, { type: 'task', title })).body;
    const a = await mk('A');
    const b = await mk('B');
    const c = await mk('C');
    const r = await clara.post(`/api/tasks/${a.id}/links`, { type: 'blocks', targetTaskId: b.id });
    expect(r.status).toBe(201);
    expect(r.body.link).toMatchObject({ type: 'blocks', task: { id: b.id, key: b.key } });
    const r2 = await clara.post(`/api/tasks/${c.id}/links`, { type: 'blocked_by', targetTaskId: b.id });
    expect(r2.body.link).toMatchObject({ type: 'blocked_by', task: { id: b.id } });
    const bd = (await clara.get(`/api/projects/${DEMO}/tasks/by-key/${b.key}`)).body;
    expect(bd.links.map((l: { type: string; task: { key: string } }) => [l.type, l.task.key])).toEqual([
      ['blocks', c.key],
      ['blocked_by', a.key],
    ]);
    expect(bd.blocked).toBe(true);
    const ha = (await clara.get(`/api/tasks/${a.id}/history`)).body.items[0];
    expect(ha).toMatchObject({ kind: 'link_added', field: 'blocks', newValue: { id: b.id, label: b.key } });
    const hb = (await clara.get(`/api/tasks/${b.id}/history`)).body.items;
    expect(hb.filter((e: { kind: string }) => e.kind === 'link_added').map((e: { field: string }) => e.field).sort()).toEqual(['blocked_by', 'blocks']);

    expect((await clara.post(`/api/tasks/${a.id}/links`, { type: 'blocks', targetTaskId: a.id })).body.error.fields.targetTaskId).toBe('same_task');
    const simpleTask = await ctx.db.selectFrom('tasks').select('id').where('project_id', '=', SIMPLE).executeTakeFirstOrThrow();
    expect((await clara.post(`/api/tasks/${a.id}/links`, { type: 'blocks', targetTaskId: simpleTask.id })).body.error.fields.targetTaskId).toBe('not_found');
    const dup = await clara.post(`/api/tasks/${b.id}/links`, { type: 'blocked_by', targetTaskId: a.id });
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe('link_exists');
    const reverse = await clara.post(`/api/tasks/${b.id}/links`, { type: 'blocks', targetTaskId: a.id });
    expect(reverse.status).toBe(409);
    expect(reverse.body.error.code).toBe('link_cycle');
    const chain = await clara.post(`/api/tasks/${c.id}/links`, { type: 'blocks', targetTaskId: a.id });
    expect(chain.body.error.code).toBe('link_cycle');
    // Цепочка из сида: DEMO-24 -> 25 -> 26; замыкание 26 -> 24 - цикл
    const t24 = await byKey(clara, 'DEMO-24');
    const t26 = await byKey(clara, 'DEMO-26');
    expect((await clara.post(`/api/tasks/${t26.id}/links`, { type: 'blocks', targetTaskId: t24.id })).body.error.code).toBe('link_cycle');

    const del = await clara.delete(`/api/tasks/${c.id}/links/${r2.body.link.id}`);
    expect(del.status).toBe(204);
    expect((await clara.delete(`/api/tasks/${c.id}/links/${r2.body.link.id}`)).status).toBe(404);
    expect((await clara.get(`/api/tasks/${b.id}/history`)).body.items[0]).toMatchObject({ kind: 'link_removed', field: 'blocks', oldValue: { label: c.key } });
    // Удалить связь можно с любой стороны; с посторонней задачи - 404
    expect((await clara.delete(`/api/tasks/${c.id}/links/${r.body.link.id}`)).status).toBe(404);
    expect((await clara.delete(`/api/tasks/${b.id}/links/${r.body.link.id}`)).status).toBe(204);
  });

  it('12. одновременные A->B и B->A (20 повторов): один 201, второй 409', async () => {
    for (let i = 0; i < 20; i++) {
      const a = (await clara.post(`/api/projects/${DEMO}/tasks`, { type: 'task', title: `RA${i}` })).body;
      const b = (await clara.post(`/api/projects/${DEMO}/tasks`, { type: 'task', title: `RB${i}` })).body;
      const [x, y] = await Promise.all([
        clara.post(`/api/tasks/${a.id}/links`, { type: 'blocks', targetTaskId: b.id }),
        clara.post(`/api/tasks/${b.id}/links`, { type: 'blocks', targetTaskId: a.id }),
      ]);
      expect([x.status, y.status].sort()).toEqual([201, 409]);
      const n = await ctx.db.selectFrom('task_links').select('id').where('from_task_id', 'in', [a.id, b.id]).execute();
      expect(n).toHaveLength(1);
    }
  });

  it('13. blocked = true при незакрытом блокере и false, когда блокер в Done', async () => {
    const t21 = await byKey(clara, 'DEMO-21');
    expect(t21.blocked).toBe(true);
    expect(t21.links.filter((l: { type: string }) => l.type === 'blocked_by')).toHaveLength(3);
    const a = (await clara.post(`/api/projects/${DEMO}/tasks`, { type: 'task', title: 'Блокер' })).body;
    const b = (await clara.post(`/api/projects/${DEMO}/tasks`, { type: 'task', title: 'Жертва' })).body;
    await clara.post(`/api/tasks/${a.id}/links`, { type: 'blocks', targetTaskId: b.id });
    expect((await byKey(clara, b.key)).blocked).toBe(true);
    await ctx.db.updateTable('tasks').set({ status_id: statuses.Done }).where('id', '=', a.id).execute();
    expect((await byKey(clara, b.key)).blocked).toBe(false);
  });
});

describe('Пакет 2. Ссылки', () => {
  it('14. ftp, пустая, длиннее 2000 - invalid; 51-я - too_many; добавление и удаление пишут историю', async () => {
    const t = (await clara.post(`/api/projects/${DEMO}/tasks`, { type: 'task', title: 'Ссылки' })).body;
    for (const url of ['ftp://x', '', '   ', 'https://' + 'a'.repeat(2000), 'http://', 'not a url']) {
      const r = await clara.post(`/api/tasks/${t.id}/urls`, { url });
      expect(r.status, url).toBe(422);
      expect(r.body.error.fields.url, url).toBe('invalid');
    }
    const r = await clara.post(`/api/tasks/${t.id}/urls`, { url: 'https://example.com/a', title: '  ' });
    expect(r.status).toBe(201);
    expect(r.body.url).toMatchObject({ url: 'https://example.com/a', title: null });
    expect((await clara.post(`/api/tasks/${t.id}/urls`, { url: 'https://example.com/a', title: 'x'.repeat(101) })).body.error.fields.title).toBe('too_long');
    for (let i = 1; i < 50; i++) expect((await clara.post(`/api/tasks/${t.id}/urls`, { url: `https://example.com/${i}` })).status).toBe(201);
    const over = await clara.post(`/api/tasks/${t.id}/urls`, { url: 'https://example.com/51' });
    expect(over.status).toBe(422);
    expect(over.body.error.fields.url).toBe('too_many');
    const detail = await byKey(clara, t.key);
    expect(detail.urls).toHaveLength(50);
    expect(detail.urls[0].url).toBe('https://example.com/a');
    expect((await clara.delete(`/api/tasks/${t.id}/urls/${r.body.url.id}`)).status).toBe(204);
    expect((await clara.get(`/api/tasks/${t.id}/history`)).body.items[0]).toMatchObject({ kind: 'url_removed', oldValue: { id: r.body.url.id, label: 'https://example.com/a' } });
    expect((await clara.delete(`/api/tasks/${t.id}/urls/${r.body.url.id}`)).status).toBe(404);
    const other = (await clara.post(`/api/projects/${DEMO}/tasks`, { type: 'task', title: 'Другая' })).body;
    expect((await clara.delete(`/api/tasks/${other.id}/urls/${detail.urls[1].id}`)).status).toBe(404);
  });
});

describe('Пакет 2. Права', () => {
  it('16. eva_viewer: создание, правка, связи и ссылки - 403; чтение - 200', async () => {
    const t = await byKey(eva, 'DEMO-2');
    expect(t.key).toBe('DEMO-2');
    const other = await byKey(eva, 'DEMO-9');
    expect((await eva.post(`/api/projects/${DEMO}/tasks`, { type: 'task', title: 'x' })).status).toBe(403);
    expect((await eva.patch(`/api/tasks/${t.id}`, { title: 'x' })).status).toBe(403);
    expect((await eva.post(`/api/tasks/${t.id}/links`, { type: 'blocks', targetTaskId: other.id })).status).toBe(403);
    expect((await eva.post(`/api/tasks/${t.id}/urls`, { url: 'https://example.com' })).status).toBe(403);
    expect((await eva.delete(`/api/tasks/${t.id}/urls/${t.urls[0].id}`)).status).toBe(403);
    expect((await eva.get(`/api/tasks/${t.id}/history`)).status).toBe(200);
    expect((await eva.get(`/api/projects/${DEMO}/tasks/search?q=demo`)).status).toBe(200);
  });
});
