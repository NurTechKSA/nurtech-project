import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { as, projectId, setup, type Client, type Ctx } from './helpers.js';

let ctx: Ctx;
let DEMO: string;
let clara: Client;
let statuses: Record<string, string>;
let boards: Record<string, { id: string; columns: Array<{ statusId: string; name: string }> }>;
const users: Record<string, string> = {};

type Card = { id: string; key: string; type: string; rank: string; parent: { key: string } | null; blocked: boolean; isOverdue: boolean; assignee: { userId: string } | null };
type Column = { statusId: string; count: number; cards: Card[] };

const cards = async (c: Client, board: string, query = '') => {
  const r = await c.get(`/api/boards/${boards[board].id}/cards${query}`);
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return r.body.columns as Column[];
};
const column = (cols: Column[], status: string) => cols.find((c) => c.statusId === statuses[status])!;
const keys = (col: Column) => col.cards.map((c) => c.key);
const byKey = async (key: string) => (await clara.get(`/api/projects/${DEMO}/tasks/by-key/${key}`)).body;
const create = async (title: string, status: string, extra: Record<string, unknown> = {}) =>
  (await clara.post(`/api/projects/${DEMO}/tasks`, { type: 'task', title, statusId: statuses[status], ...extra })).body;
const move = (id: string, body: Record<string, unknown>, c: Client = clara) => c.post(`/api/tasks/${id}/move`, body);
const rankOrder = async (status: string) =>
  (await ctx.db.selectFrom('tasks').select(['id', 'rank']).where('status_id', '=', statuses[status]).orderBy('rank').execute()).map((r) => r.id);

beforeAll(async () => {
  ctx = await setup();
  DEMO = await projectId(ctx, 'DEMO');
  clara = await as(ctx, 'clara_member');
  statuses = Object.fromEntries(((await clara.get(`/api/projects/${DEMO}/statuses`)).body.items as Array<{ id: string; name: string }>).map((s) => [s.name, s.id]));
  boards = Object.fromEntries(((await clara.get(`/api/projects/${DEMO}/boards`)).body.items as Array<{ id: string; name: string; columns: [] }>).map((b) => [b.name, b]));
  for (const u of await ctx.db.selectFrom('users').select(['id', 'username']).execute()) if (u.username) users[u.username] = u.id;
});
afterAll(() => ctx.close());

describe('Пакет 3. Карточки доски', () => {
  it('1. все колонки по порядку, пустые тоже; внутри - по rank; статусов вне доски не видно; no-store', async () => {
    const r = await clara.get(`/api/boards/${boards['Разработка'].id}/cards`);
    expect(r.headers['cache-control']).toBe('no-store');
    const cols = r.body.columns as Column[];
    expect(cols.map((c) => c.statusId)).toEqual(boards['Разработка'].columns.map((c) => c.statusId));
    for (const c of cols) {
      expect(c.cards.length).toBeGreaterThan(0);
      const ranks = c.cards.map((x) => x.rank);
      expect([...ranks].sort()).toEqual(ranks);
    }
    const all = cols.flatMap(keys);
    expect(all).not.toContain('DEMO-20'); // Cancelled
    expect(all).not.toContain('DEMO-23'); // Backlog
    const planning = await cards(clara, 'Планирование');
    expect(keys(column(planning, 'Backlog'))).toEqual(['DEMO-26', 'DEMO-14', 'DEMO-23', 'DEMO-27', 'DEMO-25']);
    expect(keys(column(planning, 'To do'))).toEqual(keys(column(cols, 'To do')));
    const simple = await projectId(ctx, 'SIMPLE');
    const boris = await as(ctx, 'boris_admin');
    const sb = (await boris.get(`/api/projects/${simple}/boards`)).body.items[0];
    const empty = await ctx.db.selectFrom('statuses').select('id').where('project_id', '=', simple).where('name', '=', 'In progress').executeTakeFirstOrThrow();
    await ctx.db.updateTable('tasks').set({ status_id: (await ctx.db.selectFrom('statuses').select('id').where('project_id', '=', simple).where('name', '=', 'To do').executeTakeFirstOrThrow()).id, rank: 'zz' }).where('status_id', '=', empty.id).where('title', '=', 'Настроить почту').execute();
    await ctx.db.updateTable('tasks').set({ status_id: (await ctx.db.selectFrom('statuses').select('id').where('project_id', '=', simple).where('name', '=', 'To do').executeTakeFirstOrThrow()).id, rank: 'zzz' }).where('status_id', '=', empty.id).execute();
    const sc = (await boris.get(`/api/boards/${sb.id}/cards`)).body.columns as Column[];
    expect(sc.map((c) => c.count)).toEqual([4, 0, 1]);
  });

  it('2. окно Done: закрытая 30 дней назад не видна при окне 14; count равен числу карточек', async () => {
    const done = column(await cards(clara, 'Разработка'), 'Done');
    expect(keys(done).sort()).toEqual(['DEMO-1', 'DEMO-3', 'DEMO-33', 'DEMO-7']);
    expect(done.count).toBe(done.cards.length);
    expect(keys(done)).not.toContain('DEMO-17');
  });

  it('3. фильтры: me, none, несколько значений, type=subtask, Frontend + пользовательский, ошибки формата, неизвестный тег', async () => {
    const mine = (await cards(clara, 'Разработка', '?assignee=me')).flatMap((c) => c.cards);
    expect(mine.length).toBeGreaterThan(0);
    expect(mine.every((c) => c.assignee?.userId === users.clara_member)).toBe(true);
    const none = (await cards(clara, 'Разработка', '?assignee=none')).flatMap((c) => c.cards);
    expect(none.every((c) => c.assignee === null)).toBe(true);
    expect(none.map((c) => c.key)).toContain('DEMO-5');
    const both = (await cards(clara, 'Разработка', `?assignee=me,${users.denis_member}`)).flatMap((c) => c.cards);
    expect(new Set(both.map((c) => c.assignee?.userId))).toEqual(new Set([users.clara_member, users.denis_member]));
    const subs = (await cards(clara, 'Разработка', '?type=subtask')).flatMap((c) => c.cards);
    expect(subs.length).toBeGreaterThan(0);
    expect(subs.every((c) => c.type === 'subtask' && c.parent)).toBe(true);

    const front = (await cards(clara, 'Frontend')).flatMap((c) => c.cards.map((x) => x.key));
    expect(front).toContain('DEMO-9');
    expect(front).not.toContain('DEMO-21'); // Backend
    const frontMine = (await cards(clara, 'Frontend', '?assignee=me&priority=high,critical')).flatMap((c) => c.cards.map((x) => x.key));
    expect(frontMine.sort()).toEqual(['DEMO-16', 'DEMO-2', 'DEMO-9'].sort());

    const bad = await clara.get(`/api/boards/${boards['Разработка'].id}/cards?assignee=abc`);
    expect(bad.status).toBe(422);
    expect(bad.body.error.fields.assignee).toBe('invalid');
    expect((await clara.get(`/api/boards/${boards['Разработка'].id}/cards?priority=urgent`)).body.error.fields.priority).toBe('invalid');
    expect((await clara.get(`/api/boards/${boards['Разработка'].id}/cards?subsystem=me`)).body.error.fields.subsystem).toBe('invalid');
    const gone = await clara.get(`/api/boards/${boards['Разработка'].id}/cards?tag=00000000-0000-4000-8000-000000000000`);
    expect(gone.status).toBe(200);
    const all = (await cards(clara, 'Разработка')).flatMap((c) => c.cards).length;
    expect((gone.body.columns as Column[]).flatMap((c) => c.cards).length).toBe(all);
    const q = (await cards(clara, 'Разработка', '?q=demo-2')).flatMap((c) => c.cards.map((x) => x.key));
    expect(q).toContain('DEMO-2');
    expect(q.every((k) => k.startsWith('DEMO-2'))).toBe(true);
    expect((await clara.get('/api/boards/00000000-0000-4000-8000-000000000000/cards')).status).toBe(404);
  });

  it('4. подзадачи - отдельные карточки с parent; blocked совпадает с TaskDetail; просроченная видна', async () => {
    const all = (await cards(clara, 'Разработка')).flatMap((c) => c.cards);
    const sub = all.find((c) => c.key === 'DEMO-10')!;
    expect(sub.parent?.key).toBe('DEMO-9');
    const blocked = all.find((c) => c.key === 'DEMO-21')!;
    expect(blocked.blocked).toBe(true);
    expect((await byKey('DEMO-21')).blocked).toBe(true);
    expect(all.find((c) => c.key === 'DEMO-9')!.isOverdue).toBe(true);
    for (const c of all.slice(0, 8)) expect(c.blocked).toBe((await byKey(c.key)).blocked);
  });
});

describe('Пакет 3. Перенос', () => {
  it('5. перенос между двумя карточками ставит её между ними; 100 переносов не создают общих позиций', async () => {
    const ids: string[] = [];
    for (let i = 0; i < 6; i++) ids.push((await create(`Ряд ${i}`, 'In test')).id);
    const [a, b, c] = ids;
    const r = await move(ids[5], { statusId: statuses['In test'], prevId: a, nextId: b });
    expect(r.status).toBe(200);
    const order = await rankOrder('In test');
    expect(order.indexOf(ids[5])).toBe(order.indexOf(a) + 1);
    expect(order.indexOf(b)).toBe(order.indexOf(ids[5]) + 1);
    for (let i = 0; i < 100; i++) {
      const cur = await rankOrder('In test');
      const t = ids[i % ids.length];
      const others = cur.filter((x) => x !== t);
      const mode = i % 3;
      const body =
        mode === 0
          ? { statusId: statuses['In test'], nextId: others[0] }
          : mode === 1
            ? { statusId: statuses['In test'], prevId: others[Math.floor(others.length / 2) - 1], nextId: others[Math.floor(others.length / 2)] }
            : { statusId: statuses['In test'], prevId: others[others.length - 1] };
      expect((await move(t, body)).status).toBe(200);
      const after = await rankOrder('In test');
      if (mode === 0) expect(after[0]).toBe(t);
      if (mode === 2) expect(after[after.length - 1]).toBe(t);
    }
    const ranks = await ctx.db.selectFrom('tasks').select('rank').where('status_id', '=', statuses['In test']).execute();
    expect(new Set(ranks.map((r) => r.rank)).size).toBe(ranks.length);
    expect(c).toBeTruthy();
  });

  it('6. только prevId, только nextId, без соседей, в пустую колонку; stale_position в четырёх случаях', async () => {
    const x = await create('X', 'Reopened');
    const y = await create('Y', 'Reopened');
    const z = await create('Z', 'Reopened');
    expect((await move(z.id, { statusId: statuses.Reopened, nextId: x.id })).status).toBe(200);
    expect((await rankOrder('Reopened')).indexOf(z.id)).toBe((await rankOrder('Reopened')).indexOf(x.id) - 1);
    expect((await move(z.id, { statusId: statuses.Reopened, prevId: y.id })).status).toBe(200);
    expect((await rankOrder('Reopened')).indexOf(z.id)).toBe((await rankOrder('Reopened')).indexOf(y.id) + 1);
    expect((await move(x.id, { statusId: statuses.Reopened, prevId: null, nextId: null })).status).toBe(200);
    expect((await rankOrder('Reopened')).at(-1)).toBe(x.id);
    // Пустая колонка: In review на SIMPLE нет, берём новый статус без задач
    await ctx.db.deleteFrom('task_links').execute();
    const emptyStatus = statuses['For release'];
    await ctx.db.updateTable('tasks').set({ status_id: statuses.Backlog, rank: 'zzzz1' }).where('status_id', '=', emptyStatus).where('title', '=', 'Подготовить релиз 1.0').execute();
    await ctx.db.updateTable('tasks').set({ status_id: statuses.Backlog, rank: 'zzzz2' }).where('status_id', '=', emptyStatus).execute();
    const r = await move(y.id, { statusId: emptyStatus });
    expect(r.status).toBe(200);
    expect(r.body.status.name).toBe('For release');

    const other = await create('Other', 'In progress');
    for (const body of [
      { statusId: statuses.Reopened, prevId: other.id },
      { statusId: statuses.Reopened, nextId: '00000000-0000-4000-8000-000000000000' },
      { statusId: statuses.Reopened, prevId: z.id },
      { statusId: statuses.Reopened, prevId: x.id, nextId: z.id },
    ]) {
      const s = await move(z.id, body);
      expect(s.status, JSON.stringify(body)).toBe(409);
      expect(s.body.error.code).toBe('stale_position');
      expect(s.body.error.message).toBe('Карточку успели переместить, доска обновлена');
    }
    const bad = await move(z.id, { statusId: '00000000-0000-4000-8000-000000000000' });
    expect(bad.body.error.fields.statusId).toBe('not_found');
    const malformed = await move(z.id, { statusId: statuses.Reopened, prevId: 'abc' });
    expect(malformed.body.error.fields.prevId).toBe('invalid');
    expect((await move(z.id, { statusId: statuses.Reopened, reason: 'x'.repeat(2001) })).body.error.fields.reason).toBe('too_long');
  });

  it('7. скрытые соседи: на Frontend между A и B лежит Backend-задача; перенос C между A и B; скрытая на месте', async () => {
    const A = await create('Front A', 'In test', { subsystemId: await sub('Frontend') });
    const H = await create('Back H', 'In test', { subsystemId: await sub('Backend') });
    const B = await create('Front B', 'In test', { subsystemId: await sub('Frontend') });
    const C = await create('Front C', 'In progress', { subsystemId: await sub('Frontend') });
    const front = keys(column(await cards(clara, 'Frontend'), 'In test'));
    expect(front.indexOf(B.key)).toBe(front.indexOf(A.key) + 1);
    const hRankBefore = (await ctx.db.selectFrom('tasks').select('rank').where('id', '=', H.id).executeTakeFirstOrThrow()).rank;
    const r = await move(C.id, { statusId: statuses['In test'], prevId: A.id, nextId: B.id });
    expect(r.status).toBe(200);
    const front2 = keys(column(await cards(clara, 'Frontend'), 'In test'));
    expect(front2.slice(front2.indexOf(A.key), front2.indexOf(A.key) + 3)).toEqual([A.key, C.key, B.key]);
    const dev = keys(column(await cards(clara, 'Разработка'), 'In test'));
    expect(dev.indexOf(H.key)).toBeGreaterThan(dev.indexOf(A.key));
    expect(dev.indexOf(H.key)).toBeLessThan(dev.indexOf(B.key));
    expect((await ctx.db.selectFrom('tasks').select('rank').where('id', '=', H.id).executeTakeFirstOrThrow()).rank).toBe(hRankBefore);
  });

  it('8. перестановка внутри колонки - только порядок; смена статуса - история и updatedAt; Done <-> In progress и окно Done', async () => {
    const a = await create('Порядок A', 'In progress');
    const b = await create('Порядок B', 'In progress');
    const before = await byKey(a.key);
    await new Promise((r) => setTimeout(r, 15));
    expect((await move(a.id, { statusId: statuses['In progress'], prevId: b.id })).body.updatedAt).toBe(before.updatedAt);
    expect((await clara.get(`/api/tasks/${a.id}/history`)).body.items).toHaveLength(1);

    const done = await move(a.id, { statusId: statuses.Done });
    expect(done.body.status.name).toBe('Done');
    expect(done.body.updatedAt > before.updatedAt).toBe(true);
    const h = (await clara.get(`/api/tasks/${a.id}/history`)).body.items[0];
    expect(h).toMatchObject({ kind: 'field_changed', field: 'status', oldValue: { id: statuses['In progress'], label: 'In progress' }, newValue: { id: statuses.Done, label: 'Done' } });
    expect(keys(column(await cards(clara, 'Разработка'), 'Done'))).toContain(a.key);
    const closed = await ctx.db.selectFrom('tasks').select('closed_at').where('id', '=', a.id).executeTakeFirstOrThrow();
    expect(closed.closed_at).not.toBeNull();
    await move(a.id, { statusId: statuses['In progress'] });
    expect((await ctx.db.selectFrom('tasks').select('closed_at').where('id', '=', a.id).executeTakeFirstOrThrow()).closed_at).toBeNull();
    // Закрыта давно - вне окна; при повторном закрытии момент ставится заново
    await move(a.id, { statusId: statuses.Done });
    await ctx.db.updateTable('tasks').set({ closed_at: new Date(Date.now() - 20 * 86_400_000) }).where('id', '=', a.id).execute();
    expect(keys(column(await cards(clara, 'Разработка'), 'Done'))).not.toContain(a.key);
    await move(a.id, { statusId: statuses['In progress'] });
    await move(a.id, { statusId: statuses.Done });
    expect(keys(column(await cards(clara, 'Разработка'), 'Done'))).toContain(a.key);
  });

  it('9. в Blocked без причины - 422; с причиной - комментарий status_reason; повтор в тот же статус - без нового комментария', async () => {
    const t = await create('Причина', 'In progress');
    const noReason = await move(t.id, { statusId: statuses.Blocked });
    expect(noReason.status).toBe(422);
    expect(noReason.body.error.fields.reason).toBe('required');
    expect((await move(t.id, { statusId: statuses.Blocked, reason: '   ' })).body.error.fields.reason).toBe('required');
    const ok = await move(t.id, { statusId: statuses.Blocked, reason: 'Ждём доступы' });
    expect(ok.status).toBe(200);
    expect(ok.body.commentCount).toBe(1);
    const again = await move(t.id, { statusId: statuses.Blocked, reason: 'Ещё причина' });
    expect(again.status).toBe(200);
    const comments = await ctx.db.selectFrom('comments').select(['kind', 'body', 'author_id']).where('task_id', '=', t.id).execute();
    expect(comments).toEqual([{ kind: 'status_reason', body: 'Ждём доступы', author_id: users.clara_member }]);
    // Причина для статуса без requiresReason тоже сохраняется
    const r = await move(t.id, { statusId: statuses['In progress'], reason: 'Доступы выдали' });
    expect(r.body.commentCount).toBe(2);
  });

  it('10. одновременные переносы двух карточек в одну позицию (20 повторов): 200 или 409, без 5xx и общих позиций', async () => {
    const anchorA = await create('Якорь A', 'In review');
    const anchorB = await create('Якорь B', 'In review');
    for (let i = 0; i < 20; i++) {
      const p = await create(`P${i}`, 'To do');
      const q = await create(`Q${i}`, 'To do');
      const [r1, r2] = await Promise.all([
        move(p.id, { statusId: statuses['In review'], prevId: anchorA.id, nextId: anchorB.id }),
        move(q.id, { statusId: statuses['In review'], prevId: anchorA.id, nextId: anchorB.id }),
      ]);
      for (const r of [r1, r2]) expect([200, 409]).toContain(r.status);
      await move(anchorB.id, { statusId: statuses['In review'], prevId: anchorA.id });
    }
    const ranks = await ctx.db.selectFrom('tasks').select('rank').where('status_id', '=', statuses['In review']).execute();
    expect(new Set(ranks.map((r) => r.rank)).size).toBe(ranks.length);
  });

  it('11. eva_viewer - 403 на move; clara_member - 200', async () => {
    const eva = await as(ctx, 'eva_viewer');
    const t = await byKey('DEMO-5');
    expect((await move(t.id, { statusId: statuses['To do'] }, eva)).status).toBe(403);
    expect((await move(t.id, { statusId: statuses['To do'] })).status).toBe(200);
  });

  it('12. перенос в To do на «Планировании» сразу виден в той же позиции на «Разработке»', async () => {
    const t = await create('Из плана', 'Plan');
    const plan = keys(column(await cards(clara, 'Планирование'), 'To do'));
    const first = await byKey(plan[0]);
    const second = await byKey(plan[1]);
    await move(t.id, { statusId: statuses['To do'], prevId: first.id, nextId: second.id });
    const planAfter = keys(column(await cards(clara, 'Планирование'), 'To do'));
    const devAfter = keys(column(await cards(clara, 'Разработка'), 'To do'));
    expect(planAfter.slice(0, 3)).toEqual([plan[0], t.key, plan[1]]);
    expect(devAfter).toEqual(planAfter);
  });
});

async function sub(name: string) {
  const r = await ctx.db.selectFrom('subsystems').select('id').where('project_id', '=', DEMO).where('name', '=', name).executeTakeFirstOrThrow();
  return r.id;
}
