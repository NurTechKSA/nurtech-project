import { sql } from 'kysely';
import type { Config } from '../config.js';
import { hashToken, newToken } from '../core.js';
import type { Db, Q } from '../db/db.js';
import type { BaseFilter, Role, StatusCategory } from '../db/schema.js';

/**
 * Служебные средства (вне контракта): пользователи, приглашения, проекты, участники, доски.
 * Вызываются из консольных команд (src/cli.ts) и тестовых данных DEV_SEED.
 */

interface StatusTemplate {
  name: string;
  category: StatusCategory;
  color: string;
  requiresReason?: boolean;
}

export const TEMPLATES: Record<'dev' | 'simple', { statuses: StatusTemplate[]; boards: Array<{ name: string; columns: string[] }>; subsystems: string[] }> = {
  dev: {
    statuses: [
      { name: 'Backlog', category: 'backlog', color: 'gray' },
      { name: 'PBR', category: 'backlog', color: 'purple' },
      { name: 'Plan', category: 'todo', color: 'blue' },
      { name: 'To do', category: 'todo', color: 'cyan' },
      { name: 'Reopened', category: 'todo', color: 'orange' },
      { name: 'In progress', category: 'in_progress', color: 'yellow' },
      { name: 'In review', category: 'in_progress', color: 'purple' },
      { name: 'In test', category: 'in_progress', color: 'blue' },
      { name: 'For release', category: 'in_progress', color: 'cyan' },
      { name: 'Blocked', category: 'in_progress', color: 'red', requiresReason: true },
      { name: 'Done', category: 'done', color: 'green' },
      { name: 'Cancelled', category: 'done', color: 'gray', requiresReason: true },
    ],
    boards: [
      { name: 'Разработка', columns: ['To do', 'Reopened', 'In progress', 'In review', 'In test', 'For release', 'Blocked', 'Done'] },
      { name: 'Планирование', columns: ['Backlog', 'PBR', 'Plan', 'To do'] },
    ],
    subsystems: ['Frontend', 'Backend'],
  },
  simple: {
    statuses: [
      { name: 'To do', category: 'todo', color: 'cyan' },
      { name: 'In progress', category: 'in_progress', color: 'yellow' },
      { name: 'Done', category: 'done', color: 'green' },
      { name: 'Cancelled', category: 'done', color: 'gray', requiresReason: true },
    ],
    boards: [{ name: 'Основная', columns: ['To do', 'In progress', 'Done'] }],
    subsystems: [],
  },
};

export class AdminError extends Error {}

export function invitationLink(config: Config, token: string): string {
  return `${config.appBaseUrl}/invite/${token}`;
}

export async function createUser(db: Db, config: Config, name: string) {
  const clean = name.trim();
  if (clean.length < 1 || clean.length > 100) throw new AdminError('Имя - от 1 до 100 символов');
  return db.transaction().execute(async (tx) => {
    const user = await tx.insertInto('users').values({ name: clean }).returning(['id', 'name']).executeTakeFirstOrThrow();
    const link = await issueInvitation(tx, config, user.id);
    return { user, link };
  });
}

/**
 * Новая ссылка-приглашение. Есть логин - вид reissue: прежний пароль, ссылки и сессии
 * перестают работать, логин сохраняется. Нет логина - вид new.
 */
export async function issueInvitation(q: Q, config: Config, userId: string): Promise<string> {
  const user = await q.selectFrom('users').select(['id', 'username']).where('id', '=', userId).executeTakeFirst();
  if (!user) throw new AdminError('Пользователь не найден');
  const kind = user.username ? 'reissue' : 'new';
  await q.updateTable('invitations').set({ revoked_at: sql<Date>`now()` }).where('user_id', '=', userId).where('used_at', 'is', null).where('revoked_at', 'is', null).execute();
  if (kind === 'reissue') {
    await q.updateTable('users').set({ password_hash: null }).where('id', '=', userId).execute();
    await q.updateTable('sessions').set({ revoked_at: sql<Date>`now()` }).where('user_id', '=', userId).where('revoked_at', 'is', null).execute();
  }
  const token = newToken();
  await q
    .insertInto('invitations')
    .values({
      user_id: userId,
      kind,
      token_hash: hashToken(token),
      expires_at: sql<Date>`now() + make_interval(days => ${config.invitationTtlDays})`,
    })
    .execute();
  return invitationLink(config, token);
}

export async function findUser(q: Q, ref: string) {
  const byName = await q.selectFrom('users').selectAll().where('username', '=', ref.trim().toLowerCase()).executeTakeFirst();
  if (byName) return byName;
  if (/^[0-9a-f-]{36}$/i.test(ref)) {
    const byId = await q.selectFrom('users').selectAll().where('id', '=', ref).executeTakeFirst();
    if (byId) return byId;
  }
  throw new AdminError(`Пользователь ${ref} не найден (логин или id)`);
}

export async function createProject(db: Db, input: { key: string; name: string; template: 'dev' | 'simple' }) {
  const key = input.key.trim();
  const name = input.name.trim();
  if (!/^[A-Z][A-Z0-9]{1,5}$/.test(key)) throw new AdminError('Ключ проекта: 2–6 символов A–Z и 0–9, первая - буква');
  if (name.length < 1 || name.length > 100) throw new AdminError('Название - от 1 до 100 символов');
  const tpl = TEMPLATES[input.template];
  if (!tpl) throw new AdminError('Шаблон: dev или simple');
  return db.transaction().execute(async (tx) => {
    const exists = await tx.selectFrom('projects').select('id').where('key', '=', key).executeTakeFirst();
    if (exists) throw new AdminError(`Проект с ключом ${key} уже есть`);
    const project = await tx.insertInto('projects').values({ key, name, template: input.template }).returning(['id', 'key', 'name']).executeTakeFirstOrThrow();
    const statuses = await tx
      .insertInto('statuses')
      .values(
        tpl.statuses.map((s, i) => ({
          project_id: project.id,
          name: s.name,
          category: s.category,
          color: s.color,
          requires_reason: s.requiresReason ?? false,
          position: i,
        })),
      )
      .returning(['id', 'name'])
      .execute();
    for (const sub of tpl.subsystems) await tx.insertInto('subsystems').values({ project_id: project.id, name: sub }).execute();
    for (const b of tpl.boards) await insertBoard(tx, project.id, b.name, b.columns, {}, 14, statuses);
    return project;
  });
}

async function insertBoard(
  tx: Q,
  projectId: string,
  name: string,
  columnNames: string[],
  filter: BaseFilter,
  doneWindowDays: number,
  statuses: Array<{ id: string; name: string }>,
) {
  const position = await tx
    .selectFrom('boards')
    .select(sql<number>`coalesce(max(position) + 1, 0)`.as('next'))
    .where('project_id', '=', projectId)
    .executeTakeFirstOrThrow();
  const board = await tx
    .insertInto('boards')
    .values({ project_id: projectId, name, base_filter: JSON.stringify(filter), done_window_days: doneWindowDays, position: position.next })
    .returning(['id', 'name'])
    .executeTakeFirstOrThrow();
  const ids = columnNames.map((n) => {
    const s = statuses.find((x) => x.name.toLowerCase() === n.trim().toLowerCase());
    if (!s) throw new AdminError(`Статуса «${n}» нет в проекте`);
    return s.id;
  });
  if (!ids.length) throw new AdminError('У доски должна быть хотя бы одна колонка');
  if (new Set(ids).size !== ids.length) throw new AdminError('Колонки доски повторяются');
  await tx.insertInto('board_columns').values(ids.map((status_id, i) => ({ board_id: board.id, status_id, position: i }))).execute();
  return board;
}

async function projectByKey(q: Q, key: string) {
  const p = await q.selectFrom('projects').selectAll().where('key', '=', key.trim().toUpperCase()).executeTakeFirst();
  if (!p) throw new AdminError(`Проект ${key} не найден`);
  return p;
}

/**
 * Доска-фильтр. Фильтр задаётся по-человечески: { subsystem: ['Frontend'], assignee: ['anna_owner'],
 * tag: ['ux'], priority: ['high'], type: ['bug'] } - имена переводятся в id проекта.
 */
export async function createBoard(
  db: Db,
  input: { project: string; name: string; columns?: string[]; filter?: Record<string, string[]>; doneWindowDays?: number },
) {
  return db.transaction().execute(async (tx) => {
    const p = await projectByKey(tx, input.project);
    const statuses = await tx.selectFrom('statuses').select(['id', 'name']).where('project_id', '=', p.id).orderBy('position').execute();
    const columns = input.columns?.length ? input.columns : TEMPLATES[p.template].boards[0].columns;
    const filter: BaseFilter = {};
    for (const [k, values] of Object.entries(input.filter ?? {})) {
      if (k === 'priority' || k === 'type') filter[k] = values as never;
      else if (k === 'subsystem') {
        filter.subsystem = [];
        for (const v of values) {
          if (v === 'none') filter.subsystem.push('none');
          else {
            const s = await tx.selectFrom('subsystems').select('id').where('project_id', '=', p.id).where(sql<string>`lower(name)`, '=', v.toLowerCase()).executeTakeFirst();
            if (!s) throw new AdminError(`Направления «${v}» нет в проекте`);
            filter.subsystem.push(s.id);
          }
        }
      } else if (k === 'tag') {
        filter.tag = [];
        for (const v of values) {
          const t = await tx.selectFrom('tags').select('id').where('project_id', '=', p.id).where(sql<string>`lower(name)`, '=', v.toLowerCase()).executeTakeFirst();
          if (!t) throw new AdminError(`Тега «${v}» нет в проекте`);
          filter.tag.push(t.id);
        }
      } else if (k === 'assignee' || k === 'reviewer') {
        filter[k] = [];
        for (const v of values) filter[k]!.push(v === 'none' ? 'none' : (await findUser(tx, v)).id);
      } else throw new AdminError(`Неизвестный фильтр ${k}`);
    }
    const days = input.doneWindowDays ?? 14;
    if (!Number.isInteger(days) || days < 1 || days > 365) throw new AdminError('Окно Done - от 1 до 365 дней');
    return insertBoard(tx, p.id, input.name.trim(), columns, filter, days, statuses);
  });
}

export async function addMember(db: Db, input: { project: string; user: string; role: Role }) {
  if (!['owner', 'admin', 'member', 'viewer'].includes(input.role)) throw new AdminError('Роль: owner, admin, member или viewer');
  const p = await projectByKey(db, input.project);
  const u = await findUser(db, input.user);
  if (!u.username) throw new AdminError('В проект добавляют только тех, кто уже принял приглашение');
  await db
    .insertInto('memberships')
    .values({ project_id: p.id, user_id: u.id, role: input.role })
    .onConflict((oc) => oc.columns(['project_id', 'user_id']).doUpdateSet({ role: input.role }))
    .execute();
  return { project: p.key, username: u.username, role: input.role };
}
