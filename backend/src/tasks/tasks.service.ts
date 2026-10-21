import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import type { ProjectAccess } from '../auth/access.js';
import { DB } from '../core.js';
import { pgCode, pgConstraint, type Db, type Q, type Tx } from '../db/db.js';
import type { Priority, TaskType } from '../db/schema.js';
import { conflict, notFound, validation, type FieldErrors } from '../http/errors.js';
import { scalar, writeHistory, type HistoryInput, type HistoryValue } from './history.js';
import { computeRank, lockStatus } from './rank.js';
import { statusRef, taskDetail } from './task-detail.js';

export interface CreateTaskInput {
  type: TaskType;
  title: string;
  description?: string | null;
  statusId?: string;
  priority?: Priority;
  assigneeId?: string;
  reviewerId?: string;
  subsystemId?: string;
  dueDate?: string;
  estimateMinutes?: number;
  tagIds?: string[];
  parentId?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  type?: 'task' | 'bug';
  priority?: Priority;
  assigneeId?: string | null;
  reviewerId?: string | null;
  subsystemId?: string | null;
  dueDate?: string | null;
  estimateMinutes?: number | null;
  tagIds?: string[];
}

/** Похоже на номер задачи: N, -N или KEY-N */
const NUMBER_LIKE = /^(?:([A-Za-z][A-Za-z0-9]{1,5})-|-)?(\d{1,9})$/;

export function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => '\\' + c);
}

/** Условие поиска по строке q: название (подстрока) или ключ, если q похож на номер */
export function matchQuery(q: string) {
  const like = `%${escapeLike(q)}%`;
  const numberLike = NUMBER_LIKE.test(q);
  return sql<boolean>`(t.title ILIKE ${like} ${numberLike ? sql`OR (p.key || '-' || t.number) ILIKE ${like}` : sql``})`;
}

@Injectable()
export class TasksService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async create(a: ProjectAccess, input: CreateTaskInput) {
    const fields: FieldErrors = {};
    const statuses = await this.db.selectFrom('statuses').selectAll().where('project_id', '=', a.projectId).orderBy('position').execute();
    let status = input.statusId ? statuses.find((s) => s.id === input.statusId) : statuses.find((s) => !s.requires_reason);
    if (input.statusId && !status) fields.statusId = 'not_found';
    else if (status?.requires_reason) fields.statusId = 'reason_required';

    if (input.type === 'subtask') {
      if (!input.parentId) fields.parentId = 'required';
      else {
        const parent = await this.db.selectFrom('tasks').select(['id', 'type']).where('id', '=', input.parentId).where('project_id', '=', a.projectId).executeTakeFirst();
        if (!parent) fields.parentId = 'not_found';
        else if (parent.type === 'subtask') fields.parentId = 'invalid';
      }
    } else if (input.parentId) fields.parentId = 'not_allowed';

    Object.assign(fields, await this.checkRefs(this.db, a.projectId, input));
    if (Object.keys(fields).length) throw validation(fields);
    status = status!;

    const id = await this.db.transaction().execute(async (tx) => {
      const seq = await tx
        .updateTable('projects')
        .set({ task_seq: sql`task_seq + 1` })
        .where('id', '=', a.projectId)
        .returning('task_seq')
        .executeTakeFirstOrThrow();
      await lockStatus(tx, status.id);
      const rank = await computeRank(tx, status.id, { kind: 'end' }, null);
      const task = await tx
        .insertInto('tasks')
        .values({
          project_id: a.projectId,
          number: seq.task_seq,
          parent_id: input.parentId ?? null,
          type: input.type,
          title: input.title,
          description: input.description ?? null,
          status_id: status.id,
          priority: input.priority ?? 'medium',
          assignee_id: input.assigneeId ?? null,
          reviewer_id: input.reviewerId ?? null,
          subsystem_id: input.subsystemId ?? null,
          due_date: input.dueDate ?? null,
          estimate_minutes: input.estimateMinutes ?? null,
          reporter_id: a.userId,
          rank,
          closed_at: status.category === 'done' ? sql<Date>`now()` : null,
        })
        .returning('id')
        .executeTakeFirstOrThrow();
      if (input.tagIds?.length) {
        await tx.insertInto('task_tags').values(input.tagIds.map((tag_id) => ({ task_id: task.id, tag_id }))).execute();
      }
      await writeHistory(tx, a.userId, [{ taskId: task.id, kind: 'created' }]);
      return task.id;
    });
    return taskDetail(this.db, id);
  }

  async byKey(a: ProjectAccess, key: string) {
    const m = /^([A-Za-z][A-Za-z0-9]{1,5})-([0-9]+)$/.exec(key);
    if (!m || m[1].toUpperCase() !== a.projectKey || m[2].length > 9) throw notFound('Задача не найдена');
    const row = await this.db.selectFrom('tasks').select('id').where('project_id', '=', a.projectId).where('number', '=', Number(m[2])).executeTakeFirst();
    if (!row) throw notFound('Задача не найдена');
    return taskDetail(this.db, row.id);
  }

  async update(a: ProjectAccess, taskId: string, input: UpdateTaskInput) {
    const fields: FieldErrors = {};
    const current = await this.db.selectFrom('tasks').selectAll().where('id', '=', taskId).executeTakeFirstOrThrow();
    if (input.type !== undefined && current.type === 'subtask') fields.type = 'invalid';
    Object.assign(fields, await this.checkRefs(this.db, a.projectId, input));
    if (Object.keys(fields).length) throw validation(fields);

    await this.db.transaction().execute(async (tx) => {
      const t = await tx.selectFrom('tasks').selectAll().where('id', '=', taskId).forUpdate().executeTakeFirstOrThrow();
      const set: Record<string, unknown> = {};
      const events: HistoryInput[] = [];
      const change = (col: string, from: unknown, to: unknown) => {
        if (to === undefined || from === to) return false;
        set[col] = to;
        return true;
      };

      change('title', t.title, input.title);
      change('description', t.description, input.description);
      if (change('type', t.type, input.type)) events.push(this.fieldEvent(taskId, 'type', scalar(t.type), scalar(input.type)));
      if (change('priority', t.priority, input.priority)) events.push(this.fieldEvent(taskId, 'priority', scalar(t.priority), scalar(input.priority)));
      if (change('due_date', t.due_date, input.dueDate)) events.push(this.fieldEvent(taskId, 'dueDate', scalar(t.due_date), scalar(input.dueDate)));
      if (change('estimate_minutes', t.estimate_minutes, input.estimateMinutes)) {
        events.push(this.fieldEvent(taskId, 'estimateMinutes', scalar(t.estimate_minutes), scalar(input.estimateMinutes)));
      }
      for (const [col, field, from, to] of [
        ['assignee_id', 'assignee', t.assignee_id, input.assigneeId],
        ['reviewer_id', 'reviewer', t.reviewer_id, input.reviewerId],
      ] as const) {
        if (change(col, from, to)) events.push(this.fieldEvent(taskId, field, await userValue(tx, from), await userValue(tx, to ?? null)));
      }
      if (change('subsystem_id', t.subsystem_id, input.subsystemId)) {
        events.push(this.fieldEvent(taskId, 'subsystem', await subsystemValue(tx, t.subsystem_id), await subsystemValue(tx, input.subsystemId ?? null)));
      }

      let tagsChanged = false;
      if (input.tagIds !== undefined) {
        const before = (await tx.selectFrom('task_tags').select('tag_id').where('task_id', '=', taskId).execute()).map((r) => r.tag_id);
        const added = input.tagIds.filter((id) => !before.includes(id));
        const removed = before.filter((id) => !input.tagIds!.includes(id));
        if (added.length || removed.length) {
          tagsChanged = true;
          const names = new Map(
            (await tx.selectFrom('tags').select(['id', 'name']).where('id', 'in', [...added, ...removed]).execute()).map((r) => [r.id, r.name]),
          );
          if (removed.length) await tx.deleteFrom('task_tags').where('task_id', '=', taskId).where('tag_id', 'in', removed).execute();
          if (added.length) await tx.insertInto('task_tags').values(added.map((tag_id) => ({ task_id: taskId, tag_id }))).execute();
          for (const id of added) events.push({ taskId, kind: 'tag_added', newValue: { id, label: names.get(id)! } });
          for (const id of removed) events.push({ taskId, kind: 'tag_removed', oldValue: { id, label: names.get(id)! } });
        }
      }

      if (Object.keys(set).length || tagsChanged) {
        await tx
          .updateTable('tasks')
          .set({ ...set, updated_at: sql<Date>`now()` })
          .where('id', '=', taskId)
          .execute();
        await writeHistory(tx, a.userId, events);
      }
    });
    return taskDetail(this.db, taskId);
  }

  async history(taskId: string) {
    const rows = await this.db
      .selectFrom('history_events as h')
      .innerJoin('users as u', 'u.id', 'h.actor_id')
      .select(['h.id', 'h.kind', 'h.field', 'h.old_value', 'h.new_value', 'h.created_at', 'u.id as uId', 'u.name', 'u.username'])
      .where('h.task_id', '=', taskId)
      .orderBy('h.created_at', 'desc')
      .orderBy('h.seq', 'desc')
      .execute();
    return {
      items: rows.map((r) => ({
        id: r.id,
        kind: r.kind,
        field: r.field,
        oldValue: (r.old_value as HistoryValue | null) ?? null,
        newValue: (r.new_value as HistoryValue | null) ?? null,
        createdAt: r.created_at.toISOString(),
        actor: { userId: r.uId, name: r.name, username: r.username ?? '' },
      })),
    };
  }

  async search(a: ProjectAccess, input: { q?: string; types?: TaskType[]; excludeId?: string; limit: number }) {
    let query = this.db
      .selectFrom('tasks as t')
      .innerJoin('projects as p', 'p.id', 't.project_id')
      .innerJoin('statuses as s', 's.id', 't.status_id')
      .select(['t.id', 't.number', 't.type', 't.title', 's.id as sId', 's.name as sName', 's.color as sColor', 's.category as sCategory'])
      .where('t.project_id', '=', a.projectId);
    if (input.types?.length) query = query.where('t.type', 'in', input.types);
    if (input.excludeId) query = query.where('t.id', '<>', input.excludeId.toLowerCase());
    if (input.q) {
      const q = input.q;
      const m = NUMBER_LIKE.exec(q);
      const exact = m && (!m[1] || m[1].toUpperCase() === a.projectKey) ? Number(m[2]) : null;
      const like = `%${escapeLike(q)}%`;
      query = query.where(matchQuery(q)).orderBy(
        sql`CASE WHEN t.number = ${exact ?? -1} THEN 0 WHEN ${m ? sql`(p.key || '-' || t.number) ILIKE ${like}` : sql`false`} THEN 1 ELSE 2 END`,
      );
    }
    const rows = await query.orderBy('t.updated_at', 'desc').orderBy('t.number', 'desc').limit(input.limit).execute();
    return {
      items: rows.map((r) => ({
        id: r.id,
        key: `${a.projectKey}-${r.number}`,
        type: r.type,
        title: r.title,
        status: statusRef({ id: r.sId, name: r.sName, color: r.sColor, category: r.sCategory }),
      })),
    };
  }

  async createLink(a: ProjectAccess, taskId: string, input: { type: 'blocks' | 'blocked_by'; targetTaskId: string }) {
    const targetId = input.targetTaskId.toLowerCase();
    if (targetId === taskId) throw validation({ targetTaskId: 'same_task' }, 'Задача не может блокировать сама себя');
    const target = await this.db.selectFrom('tasks').select('id').where('id', '=', targetId).where('project_id', '=', a.projectId).executeTakeFirst();
    if (!target) throw validation({ targetTaskId: 'not_found' }, 'Задача не найдена в проекте');
    const [from, to] = input.type === 'blocks' ? [taskId, targetId] : [targetId, taskId];

    const linkId = await this.db
      .transaction()
      .execute(async (tx) => {
        // Проверка цикла и вставка - под блокировкой проекта: две встречные связи не пройдут обе
        await sql`SELECT pg_advisory_xact_lock(hashtext('links:' || ${a.projectId}))`.execute(tx);
        const exists = await tx.selectFrom('task_links').select('id').where('from_task_id', '=', from).where('to_task_id', '=', to).executeTakeFirst();
        if (exists) throw conflict('link_exists', 'Такая связь уже есть');
        // Цикл: из to по цепочке «блокирует» достижима from
        const cycle = await sql<{ found: boolean }>`
          WITH RECURSIVE reach(id) AS (
            SELECT to_task_id FROM task_links WHERE from_task_id = ${to}
            UNION
            SELECT l.to_task_id FROM task_links l JOIN reach r ON l.from_task_id = r.id
          )
          SELECT EXISTS (SELECT 1 FROM reach WHERE id = ${from}) OR ${to}::uuid = ${from}::uuid AS found`.execute(tx);
        if (cycle.rows[0].found) throw conflict('link_cycle', 'Связь создаст цикл блокировок');
        const link = await tx.insertInto('task_links').values({ project_id: a.projectId, from_task_id: from, to_task_id: to }).returning('id').executeTakeFirstOrThrow();
        const [fromV, toV] = await Promise.all([taskValue(tx, from), taskValue(tx, to)]);
        await touch(tx, [from, to]);
        await writeHistory(tx, a.userId, [
          { taskId: from, kind: 'link_added', field: 'blocks', newValue: toV },
          { taskId: to, kind: 'link_added', field: 'blocked_by', newValue: fromV },
        ]);
        return link.id;
      })
      .catch((err) => {
        if (pgCode(err) === '23505' && pgConstraint(err) === 'task_links_pair_uq') throw conflict('link_exists', 'Такая связь уже есть');
        throw err;
      });
    const detail = await taskDetail(this.db, taskId);
    return { link: detail.links.find((l) => l.id === linkId)! };
  }

  async deleteLink(a: ProjectAccess, taskId: string, linkId: string) {
    await this.db.transaction().execute(async (tx) => {
      const link = await tx
        .selectFrom('task_links')
        .selectAll()
        .where('id', '=', linkId)
        .where((eb) => eb.or([eb('from_task_id', '=', taskId), eb('to_task_id', '=', taskId)]))
        .forUpdate()
        .executeTakeFirst();
      if (!link) throw notFound('Связь не найдена');
      await tx.deleteFrom('task_links').where('id', '=', link.id).execute();
      const [fromV, toV] = await Promise.all([taskValue(tx, link.from_task_id), taskValue(tx, link.to_task_id)]);
      await touch(tx, [link.from_task_id, link.to_task_id]);
      await writeHistory(tx, a.userId, [
        { taskId: link.from_task_id, kind: 'link_removed', field: 'blocks', oldValue: toV },
        { taskId: link.to_task_id, kind: 'link_removed', field: 'blocked_by', oldValue: fromV },
      ]);
    });
  }

  async createUrl(a: ProjectAccess, taskId: string, input: { url: string; title?: string | null }) {
    if (!isHttpUrl(input.url)) throw validation({ url: 'invalid' }, 'Укажите адрес, начинающийся с http:// или https://');
    const row = await this.db.transaction().execute(async (tx) => {
      await sql`SELECT id FROM tasks WHERE id = ${taskId} FOR UPDATE`.execute(tx);
      const count = await tx.selectFrom('task_urls').select(sql<number>`count(*)`.as('n')).where('task_id', '=', taskId).executeTakeFirstOrThrow();
      if (count.n >= 50) throw validation({ url: 'too_many' }, 'У задачи уже 50 ссылок');
      const url = await tx
        .insertInto('task_urls')
        .values({ task_id: taskId, url: input.url, title: input.title ?? null })
        .returning(['id', 'url', 'title', 'created_at'])
        .executeTakeFirstOrThrow();
      await touch(tx, [taskId]);
      await writeHistory(tx, a.userId, [{ taskId, kind: 'url_added', newValue: { id: url.id, label: url.url } }]);
      return url;
    });
    return { url: { id: row.id, url: row.url, title: row.title, createdAt: row.created_at.toISOString() } };
  }

  async deleteUrl(a: ProjectAccess, taskId: string, urlId: string) {
    await this.db.transaction().execute(async (tx) => {
      const url = await tx.deleteFrom('task_urls').where('id', '=', urlId).where('task_id', '=', taskId).returning(['id', 'url']).executeTakeFirst();
      if (!url) throw notFound('Ссылка не найдена');
      await touch(tx, [taskId]);
      await writeHistory(tx, a.userId, [{ taskId, kind: 'url_removed', oldValue: { id: url.id, label: url.url } }]);
    });
  }

  /** Ссылки тела запроса на сущности проекта: статус, направление, теги, исполнитель, ревьюер */
  private async checkRefs(
    q: Q,
    projectId: string,
    input: { subsystemId?: string | null; tagIds?: string[]; assigneeId?: string | null; reviewerId?: string | null },
  ): Promise<FieldErrors> {
    const fields: FieldErrors = {};
    if (input.subsystemId) {
      const s = await q.selectFrom('subsystems').select('id').where('id', '=', input.subsystemId).where('project_id', '=', projectId).executeTakeFirst();
      if (!s) fields.subsystemId = 'not_found';
    }
    if (input.tagIds?.length) {
      const found = await q.selectFrom('tags').select('id').where('project_id', '=', projectId).where('id', 'in', input.tagIds).execute();
      if (found.length !== new Set(input.tagIds).size) fields.tagIds = 'not_found';
    }
    for (const field of ['assigneeId', 'reviewerId'] as const) {
      const id = input[field];
      if (!id) continue;
      const m = await q.selectFrom('memberships').select('user_id').where('project_id', '=', projectId).where('user_id', '=', id).executeTakeFirst();
      if (!m) fields[field] = 'not_member';
    }
    return fields;
  }

  private fieldEvent(taskId: string, field: string, oldValue: HistoryValue | null, newValue: HistoryValue | null): HistoryInput {
    return { taskId, kind: 'field_changed', field, oldValue, newValue };
  }
}

async function userValue(q: Q, id: string | null): Promise<HistoryValue | null> {
  if (!id) return null;
  const u = await q.selectFrom('users').select(['id', 'name']).where('id', '=', id).executeTakeFirstOrThrow();
  return { id: u.id, label: u.name };
}

async function subsystemValue(q: Q, id: string | null): Promise<HistoryValue | null> {
  if (!id) return null;
  const s = await q.selectFrom('subsystems').select(['id', 'name']).where('id', '=', id).executeTakeFirstOrThrow();
  return { id: s.id, label: s.name };
}

async function taskValue(q: Q, id: string): Promise<HistoryValue> {
  const t = await q
    .selectFrom('tasks as t')
    .innerJoin('projects as p', 'p.id', 't.project_id')
    .select(['t.id', 't.number', 'p.key'])
    .where('t.id', '=', id)
    .executeTakeFirstOrThrow();
  return { id: t.id, label: `${t.key}-${t.number}` };
}

/** Отметить задачи изменёнными (updatedAt) */
export async function touch(tx: Tx, ids: string[]) {
  await tx.updateTable('tasks').set({ updated_at: sql<Date>`now()` }).where('id', 'in', ids).execute();
}

function isHttpUrl(value: string): boolean {
  if (value.length > 2000 || !/^https?:\/\//i.test(value)) return false;
  try {
    const u = new URL(value);
    return (u.protocol === 'http:' || u.protocol === 'https:') && u.hostname.length > 0;
  } catch {
    return false;
  }
}
