import { sql } from 'kysely';
import { utcDate } from '../core.js';
import type { Q } from '../db/db.js';
import { notFound } from '../http/errors.js';

export interface UserRef {
  userId: string;
  name: string;
  username: string;
}

export const userRef = (id: string | null, name: string | null, username: string | null): UserRef | null =>
  id ? { userId: id, name: name ?? '', username: username ?? '' } : null;

export const statusRef = (s: { id: string; name: string; color: string; category: string }) => ({
  id: s.id,
  name: s.name,
  color: s.color,
  category: s.category,
});

export const isOverdue = (dueDate: string | null, category: string, today = utcDate()) =>
  dueDate !== null && dueDate < today && category !== 'done';

const iso = (d: Date) => d.toISOString();

/**
 * TaskDetail одним набором запросов: число запросов не зависит от числа подзадач, связей и тегов.
 */
export async function taskDetail(q: Q, taskId: string) {
  const t = await q
    .selectFrom('tasks as t')
    .innerJoin('projects as p', 'p.id', 't.project_id')
    .innerJoin('statuses as s', 's.id', 't.status_id')
    .innerJoin('users as rep', 'rep.id', 't.reporter_id')
    .leftJoin('users as asg', 'asg.id', 't.assignee_id')
    .leftJoin('users as rev', 'rev.id', 't.reviewer_id')
    .leftJoin('subsystems as sub', 'sub.id', 't.subsystem_id')
    .leftJoin('tasks as par', 'par.id', 't.parent_id')
    .select([
      't.id',
      't.number',
      't.type',
      't.title',
      't.description',
      't.priority',
      't.due_date',
      't.estimate_minutes',
      't.created_at',
      't.updated_at',
      'p.key as projectKey',
      's.id as statusId',
      's.name as statusName',
      's.color as statusColor',
      's.category as statusCategory',
      'rep.id as repId',
      'rep.name as repName',
      'rep.username as repUsername',
      'asg.id as asgId',
      'asg.name as asgName',
      'asg.username as asgUsername',
      'rev.id as revId',
      'rev.name as revName',
      'rev.username as revUsername',
      'sub.id as subId',
      'sub.name as subName',
      'par.id as parId',
      'par.number as parNumber',
      'par.title as parTitle',
      sql<number>`(SELECT coalesce(sum(minutes), 0) FROM worklogs w WHERE w.task_id = t.id)`.as('spent'),
      sql<number>`(SELECT count(*) FROM comments c WHERE c.task_id = t.id)`.as('commentCount'),
      sql<number>`(SELECT coalesce(sum(st.estimate_minutes), 0) FROM tasks st WHERE st.parent_id = t.id)`.as('subEstimate'),
      sql<number>`(SELECT coalesce(sum(w.minutes), 0) FROM worklogs w JOIN tasks st ON st.id = w.task_id WHERE st.parent_id = t.id)`.as('subSpent'),
      sql<boolean>`EXISTS (SELECT 1 FROM task_links l JOIN tasks bt ON bt.id = l.from_task_id JOIN statuses bs ON bs.id = bt.status_id
                    WHERE l.to_task_id = t.id AND bs.category <> 'done')`.as('blocked'),
    ])
    .where('t.id', '=', taskId)
    .executeTakeFirst();
  if (!t) throw notFound('Задача не найдена');
  const key = (n: number) => `${t.projectKey}-${n}`;

  const [tags, subtasks, links, urls] = await Promise.all([
    q
      .selectFrom('task_tags as tt')
      .innerJoin('tags as g', 'g.id', 'tt.tag_id')
      .select(['g.id', 'g.name'])
      .where('tt.task_id', '=', taskId)
      .orderBy(sql`lower(g.name)`)
      .execute(),
    q
      .selectFrom('tasks as st')
      .innerJoin('statuses as s', 's.id', 'st.status_id')
      .leftJoin('users as u', 'u.id', 'st.assignee_id')
      .select(['st.id', 'st.number', 'st.title', 's.id as sId', 's.name as sName', 's.color as sColor', 's.category as sCategory', 'u.id as uId', 'u.name as uName', 'u.username as uUsername'])
      .where('st.parent_id', '=', taskId)
      .orderBy('st.number')
      .execute(),
    q
      .selectFrom('task_links as l')
      .innerJoin('tasks as o', (j) => j.on(sql<boolean>`o.id = CASE WHEN l.from_task_id = ${taskId} THEN l.to_task_id ELSE l.from_task_id END`))
      .innerJoin('statuses as s', 's.id', 'o.status_id')
      .select(['l.id', 'l.from_task_id', 'o.id as oId', 'o.number', 'o.title', 's.id as sId', 's.name as sName', 's.color as sColor', 's.category as sCategory'])
      .where((eb) => eb.or([eb('l.from_task_id', '=', taskId), eb('l.to_task_id', '=', taskId)]))
      .execute(),
    q.selectFrom('task_urls').select(['id', 'url', 'title', 'created_at']).where('task_id', '=', taskId).orderBy('created_at').orderBy('id').execute(),
  ]);

  const linkItems = links
    .map((l) => ({
      id: l.id,
      type: l.from_task_id === taskId ? ('blocks' as const) : ('blocked_by' as const),
      number: l.number,
      task: { id: l.oId, key: key(l.number), title: l.title, status: statusRef({ id: l.sId, name: l.sName, color: l.sColor, category: l.sCategory }) },
    }))
    .sort((a, b) => (a.type === b.type ? a.number - b.number : a.type === 'blocks' ? -1 : 1))
    .map(({ number: _n, ...rest }) => rest);

  return {
    id: t.id,
    key: key(t.number),
    type: t.type,
    title: t.title,
    description: t.description,
    status: statusRef({ id: t.statusId, name: t.statusName, color: t.statusColor, category: t.statusCategory }),
    priority: t.priority,
    assignee: userRef(t.asgId, t.asgName, t.asgUsername),
    reviewer: userRef(t.revId, t.revName, t.revUsername),
    reporter: userRef(t.repId, t.repName, t.repUsername)!,
    subsystem: t.subId ? { id: t.subId, name: t.subName! } : null,
    tags,
    dueDate: t.due_date,
    isOverdue: isOverdue(t.due_date, t.statusCategory),
    estimateMinutes: t.estimate_minutes,
    spentMinutes: t.spent,
    parent: t.parId ? { id: t.parId, key: key(t.parNumber!), title: t.parTitle! } : null,
    blocked: t.blocked,
    commentCount: t.commentCount,
    subtasks: subtasks.map((s) => ({
      id: s.id,
      key: key(s.number),
      title: s.title,
      status: statusRef({ id: s.sId, name: s.sName, color: s.sColor, category: s.sCategory }),
      assignee: userRef(s.uId, s.uName, s.uUsername),
    })),
    subtasksEstimateMinutes: t.subEstimate,
    subtasksSpentMinutes: t.subSpent,
    links: linkItems,
    urls: urls.map((u) => ({ id: u.id, url: u.url, title: u.title, createdAt: iso(u.created_at) })),
    createdAt: iso(t.created_at),
    updatedAt: iso(t.updated_at),
  };
}

export type TaskDetail = Awaited<ReturnType<typeof taskDetail>>;
