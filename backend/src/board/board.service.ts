import { Inject, Injectable } from '@nestjs/common';
import { sql, type Expression, type SqlBool } from 'kysely';
import type { ProjectAccess } from '../auth/access.js';
import { DB, utcDate } from '../core.js';
import type { Db, Q } from '../db/db.js';
import type { BaseFilter, Priority, TaskType } from '../db/schema.js';
import { conflict, validation } from '../http/errors.js';
import { writeHistory } from '../tasks/history.js';
import { computeRank, lockStatus, type Placement } from '../tasks/rank.js';
import { isOverdue, taskDetail, userRef } from '../tasks/task-detail.js';
import { matchQuery } from '../tasks/tasks.service.js';

export interface CardFilters {
  q?: string;
  assignee?: string[];
  reviewer?: string[];
  priority?: Priority[];
  type?: TaskType[];
  subsystem?: string[];
  tag?: string[];
}

export interface MoveInput {
  statusId: string;
  prevId?: string;
  nextId?: string;
  reason?: string;
}

const STALE = 'Карточку успели переместить, доска обновлена';

@Injectable()
export class BoardService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async cards(a: ProjectAccess, boardId: string, input: CardFilters) {
    const board = await this.db.selectFrom('boards').select(['id', 'base_filter', 'done_window_days']).where('id', '=', boardId).executeTakeFirstOrThrow();
    const columns = await this.db
      .selectFrom('board_columns as c')
      .innerJoin('statuses as s', 's.id', 'c.status_id')
      .select(['s.id', 's.category'])
      .where('c.board_id', '=', boardId)
      .orderBy('c.position')
      .execute();

    // Пользовательские фильтры: me -> текущий пользователь; корректный UUID не из проекта отбрасывается
    const [members, subsystems, tags] = await Promise.all([
      this.db.selectFrom('memberships').select('user_id as id').where('project_id', '=', a.projectId).execute(),
      this.db.selectFrom('subsystems').select('id').where('project_id', '=', a.projectId).execute(),
      this.db.selectFrom('tags').select('id').where('project_id', '=', a.projectId).execute(),
    ]);
    const known = (rows: Array<{ id: string }>) => new Set(rows.map((r) => r.id));
    const clean = (values: string[] | undefined, allowed: Set<string>) => {
      if (!values) return undefined;
      const out = values
        .map((v) => (v === 'me' ? a.userId : v === 'none' ? v : v.toLowerCase()))
        .filter((v) => v === 'none' || allowed.has(v));
      return out.length ? [...new Set(out)] : undefined;
    };
    const user: BaseFilter = {
      assignee: clean(input.assignee, known(members)),
      reviewer: clean(input.reviewer, known(members)),
      priority: input.priority,
      type: input.type,
      subsystem: clean(input.subsystem, known(subsystems)),
      tag: clean(input.tag, known(tags)),
    };

    const statusIds = columns.map((c) => c.id);
    let query = this.db
      .selectFrom('tasks as t')
      .innerJoin('projects as p', 'p.id', 't.project_id')
      .innerJoin('statuses as s', 's.id', 't.status_id')
      .leftJoin('users as u', 'u.id', 't.assignee_id')
      .leftJoin('tasks as par', 'par.id', 't.parent_id')
      .select([
        't.id',
        't.number',
        't.type',
        't.title',
        't.priority',
        't.due_date',
        't.rank',
        't.status_id',
        's.category',
        'p.key',
        'u.id as uId',
        'u.name as uName',
        'u.username as uUsername',
        'par.id as parId',
        'par.number as parNumber',
        sql<boolean>`EXISTS (SELECT 1 FROM task_links l JOIN tasks bt ON bt.id = l.from_task_id JOIN statuses bs ON bs.id = bt.status_id
                      WHERE l.to_task_id = t.id AND bs.category <> 'done')`.as('blocked'),
      ])
      .where('t.project_id', '=', a.projectId)
      .where('t.status_id', 'in', statusIds.length ? statusIds : ['00000000-0000-0000-0000-000000000000'])
      // Окно Done: в колонке категории done - закрытые не раньше doneWindowDays суток назад
      .where(sql<boolean>`(s.category <> 'done' OR coalesce(t.closed_at, t.created_at) >= now() - make_interval(days => ${board.done_window_days}))`);
    for (const cond of [...filterConditions(board.base_filter), ...filterConditions(user)]) query = query.where(cond);
    if (input.q) query = query.where(matchQuery(input.q));
    const rows = await query.orderBy('t.rank').execute();

    const tagRows = rows.length
      ? await this.db
          .selectFrom('task_tags as tt')
          .innerJoin('tags as g', 'g.id', 'tt.tag_id')
          .select(['tt.task_id', 'g.id', 'g.name'])
          .where(
            'tt.task_id',
            'in',
            rows.map((r) => r.id),
          )
          .orderBy(sql`lower(g.name)`)
          .execute()
      : [];
    const tagsByTask = new Map<string, Array<{ id: string; name: string }>>();
    for (const t of tagRows) {
      const list = tagsByTask.get(t.task_id) ?? [];
      list.push({ id: t.id, name: t.name });
      tagsByTask.set(t.task_id, list);
    }

    const today = utcDate();
    return {
      columns: columns.map((c) => {
        const cards = rows
          .filter((r) => r.status_id === c.id)
          .map((r) => ({
            id: r.id,
            key: `${r.key}-${r.number}`,
            type: r.type,
            title: r.title,
            priority: r.priority,
            dueDate: r.due_date,
            isOverdue: isOverdue(r.due_date, r.category, today),
            assignee: userRef(r.uId, r.uName, r.uUsername),
            tags: tagsByTask.get(r.id) ?? [],
            parent: r.parId ? { id: r.parId, key: `${r.key}-${r.parNumber}` } : null,
            blocked: r.blocked,
            rank: r.rank,
          }));
        return { statusId: c.id, count: cards.length, cards };
      }),
    };
  }

  /**
   * Единственная ручка смены статуса и позиции. Соседи - карточки, которые пользователь
   * видит выше и ниже места броска; карточка встаёт вплотную к prevId (или к nextId).
   */
  async move(a: ProjectAccess, taskId: string, input: MoveInput, rawReason: string | undefined) {
    const target = await this.db.selectFrom('statuses').selectAll().where('id', '=', input.statusId).where('project_id', '=', a.projectId).executeTakeFirst();
    if (!target) throw validation({ statusId: 'not_found' }, 'Статус не найден в проекте');

    await this.db.transaction().execute(async (tx) => {
      await lockStatus(tx, target.id);
      const task = await tx
        .selectFrom('tasks as t')
        .innerJoin('statuses as s', 's.id', 't.status_id')
        .select(['t.id', 't.status_id', 't.rank', 's.name as statusName', 's.category'])
        .where('t.id', '=', taskId)
        .forUpdate('t')
        .executeTakeFirstOrThrow();
      const statusChanged = task.status_id !== target.id;
      if (statusChanged && target.requires_reason && !input.reason) {
        throw validation({ reason: 'required' }, 'Укажите причину смены статуса');
      }

      const neighbor = async (id: string | undefined) => {
        if (!id) return null;
        const n = await tx.selectFrom('tasks').select(['id', 'project_id', 'status_id', 'rank']).where('id', '=', id).executeTakeFirst();
        if (!n || n.project_id !== a.projectId || n.status_id !== target.id || n.id === taskId) throw conflict('stale_position', STALE);
        return n;
      };
      const prev = await neighbor(input.prevId);
      const next = await neighbor(input.nextId);
      if (prev && next && prev.rank >= next.rank) throw conflict('stale_position', STALE);

      if (!statusChanged && (await alreadyInPlace(tx, task, target.id, prev?.rank ?? null, next?.rank ?? null))) return;

      const place: Placement = prev ? { kind: 'after', id: prev.id } : next ? { kind: 'before', id: next.id } : { kind: 'end' };
      const rank = await computeRank(tx, target.id, place, taskId);
      if (!statusChanged) {
        await tx.updateTable('tasks').set({ rank }).where('id', '=', taskId).execute();
        return;
      }

      const wasDone = task.category === 'done';
      const isDone = target.category === 'done';
      await tx
        .updateTable('tasks')
        .set({
          status_id: target.id,
          rank,
          updated_at: sql<Date>`now()`,
          ...(isDone && !wasDone ? { closed_at: sql<Date>`now()` } : {}),
          ...(!isDone ? { closed_at: null } : {}),
        })
        .where('id', '=', taskId)
        .execute();
      await writeHistory(tx, a.userId, [
        {
          taskId,
          kind: 'field_changed',
          field: 'status',
          oldValue: { id: task.status_id, label: task.statusName },
          newValue: { id: target.id, label: target.name },
        },
      ]);
      if (input.reason) {
        await tx
          .insertInto('comments')
          .values({ task_id: taskId, author_id: a.userId, kind: 'status_reason', body: rawReason ?? input.reason })
          .execute();
      }
    });
    return taskDetail(this.db, taskId);
  }
}

/** Карточка уже стоит там, куда её бросили: повтор переноса ничего не меняет */
async function alreadyInPlace(tx: Q, task: { id: string; rank: string }, statusId: string, prev: string | null, next: string | null): Promise<boolean> {
  const between = async (lo: string | null, hi: string | null) => {
    let q = tx.selectFrom('tasks').select('id').where('status_id', '=', statusId).where('id', '<>', task.id);
    if (lo !== null) q = q.where('rank', '>', lo);
    if (hi !== null) q = q.where('rank', '<', hi);
    return !(await q.limit(1).executeTakeFirst());
  };
  if (prev !== null && next !== null) return prev < task.rank && task.rank < next;
  if (prev !== null) return prev < task.rank && (await between(prev, task.rank));
  if (next !== null) return task.rank < next && (await between(task.rank, next));
  return between(task.rank, null);
}

/** Условия фильтра: внутри параметра - «или», между параметрами - «и» */
function filterConditions(f: BaseFilter): Array<Expression<SqlBool>> {
  const out: Array<Expression<SqlBool>> = [];
  const nullable = (col: string, values?: string[]) => {
    if (!values?.length) return;
    const ids = values.filter((v) => v !== 'none');
    const parts = [];
    if (values.includes('none')) parts.push(sql`${sql.ref(col)} IS NULL`);
    if (ids.length) parts.push(sql`${sql.ref(col)} IN (${sql.join(ids)})`);
    out.push(sql<boolean>`(${sql.join(parts, sql` OR `)})`);
  };
  nullable('t.assignee_id', f.assignee);
  nullable('t.reviewer_id', f.reviewer);
  nullable('t.subsystem_id', f.subsystem);
  if (f.priority?.length) out.push(sql<boolean>`t.priority IN (${sql.join(f.priority)})`);
  if (f.type?.length) out.push(sql<boolean>`t.type IN (${sql.join(f.type)})`);
  if (f.tag?.length) out.push(sql<boolean>`EXISTS (SELECT 1 FROM task_tags x WHERE x.task_id = t.id AND x.tag_id IN (${sql.join(f.tag)}))`);
  return out;
}
