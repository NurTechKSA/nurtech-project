import { Inject, Injectable } from '@nestjs/common';
import { DB, pathId } from '../core.js';
import type { Db } from '../db/db.js';
import type { Role } from '../db/schema.js';
import { forbidden, notFound } from '../http/errors.js';
import { can, isProjectAdmin, type Permission } from './permissions.js';
import type { SessionUser } from './session.js';

export interface ProjectAccess {
  projectId: string;
  projectKey: string;
  userId: string;
  role: Role;
  isAdmin: boolean;
}

/**
 * Порядок ответов в ручках проекта (00, раздел 4): ресурс не найден или пользователь
 * не участник - 404; у роли нет ключа - 403. Права - по текущему членству на каждый запрос.
 */
@Injectable()
export class AccessService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async project(user: SessionUser, projectId: string, perm: Permission): Promise<ProjectAccess> {
    return this.check(user, pathId(projectId), perm);
  }

  async task(user: SessionUser, taskId: string, perm: Permission) {
    const id = pathId(taskId);
    const row = await this.db.selectFrom('tasks').select(['id', 'project_id']).where('id', '=', id).executeTakeFirst();
    if (!row) throw notFound('Задача не найдена');
    return { ...(await this.check(user, row.project_id, perm)), taskId: row.id };
  }

  async board(user: SessionUser, boardId: string, perm: Permission) {
    const id = pathId(boardId);
    const row = await this.db.selectFrom('boards').select(['id', 'project_id']).where('id', '=', id).executeTakeFirst();
    if (!row) throw notFound('Доска не найдена');
    return { ...(await this.check(user, row.project_id, perm)), boardId: row.id };
  }

  async comment(user: SessionUser, commentId: string, perm: Permission) {
    const id = pathId(commentId);
    const row = await this.db
      .selectFrom('comments as c')
      .innerJoin('tasks as t', 't.id', 'c.task_id')
      .select(['c.id', 'c.task_id', 'c.author_id', 't.project_id'])
      .where('c.id', '=', id)
      .executeTakeFirst();
    if (!row) throw notFound('Комментарий не найден');
    return { ...(await this.check(user, row.project_id, perm)), comment: row };
  }

  async worklog(user: SessionUser, worklogId: string, perm: Permission) {
    const id = pathId(worklogId);
    const row = await this.db
      .selectFrom('worklogs as w')
      .innerJoin('tasks as t', 't.id', 'w.task_id')
      .select(['w.id', 'w.task_id', 'w.user_id', 't.project_id'])
      .where('w.id', '=', id)
      .executeTakeFirst();
    if (!row) throw notFound('Запись времени не найдена');
    return { ...(await this.check(user, row.project_id, perm)), worklog: row };
  }

  private async check(user: SessionUser, projectId: string, perm: Permission): Promise<ProjectAccess> {
    const row = await this.db
      .selectFrom('memberships as m')
      .innerJoin('projects as p', 'p.id', 'm.project_id')
      .select(['m.role', 'p.key'])
      .where('m.project_id', '=', projectId)
      .where('m.user_id', '=', user.id)
      .executeTakeFirst();
    if (!row) throw notFound();
    if (!can(row.role, perm)) throw forbidden();
    return { projectId, projectKey: row.key, userId: user.id, role: row.role, isAdmin: isProjectAdmin(row.role) };
  }
}
