import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Patch, Post } from '@nestjs/common';
import { AccessService } from '../auth/access.js';
import { CurrentUser, type SessionUser } from '../auth/session.js';
import { CONTRACT, DB, utcDate } from '../core.js';
import type { Db } from '../db/db.js';
import type { Contract } from '../http/contract.js';
import { forbidden, validation } from '../http/errors.js';

interface WorklogInput {
  minutes?: number;
  date?: string;
  comment?: string | null;
}

/** Дата списания - не позже завтрашней даты UTC (запас на часовые пояса) */
function checkDate(date: string | undefined) {
  if (date !== undefined && date > utcDate(1)) throw validation({ date: 'in_future' }, 'Нельзя списать время на будущую дату');
}

@Controller()
export class WorklogsController {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(CONTRACT) private readonly contract: Contract,
    @Inject(AccessService) private readonly access: AccessService,
  ) {}

  @Get('tasks/:taskId/worklogs')
  async list(@CurrentUser() user: SessionUser, @Param('taskId') taskId: string) {
    const a = await this.access.task(user, taskId, 'task-view');
    const rows = await this.select()
      .where('w.task_id', '=', a.taskId)
      .orderBy('w.date', 'desc')
      .orderBy('w.created_at', 'desc')
      .orderBy('w.id', 'desc')
      .execute();
    const items = rows.map(toWorklog);
    return { items, totalMinutes: items.reduce((s, w) => s + w.minutes, 0) };
  }

  @Post('tasks/:taskId/worklogs')
  async create(@CurrentUser() user: SessionUser, @Param('taskId') taskId: string, @Body() body: unknown) {
    const a = await this.access.task(user, taskId, 'worklog-create');
    const { data } = this.contract.body<WorklogInput>('createWorklog', body);
    checkDate(data.date);
    const row = await this.db
      .insertInto('worklogs')
      .values({ task_id: a.taskId, user_id: user.id, minutes: data.minutes!, date: data.date ?? utcDate(), comment: data.comment ?? null })
      .returning('id')
      .executeTakeFirstOrThrow();
    return this.one(row.id);
  }

  @Patch('worklogs/:worklogId')
  async update(@CurrentUser() user: SessionUser, @Param('worklogId') worklogId: string, @Body() body: unknown) {
    const a = await this.access.worklog(user, worklogId, 'worklog-update');
    if (a.worklog.user_id !== user.id && !a.isAdmin) throw forbidden('Править можно только свои записи времени');
    const { data } = this.contract.body<WorklogInput>('updateWorklog', body);
    checkDate(data.date);
    const set: Record<string, unknown> = {};
    if (data.minutes !== undefined) set.minutes = data.minutes;
    if (data.date !== undefined) set.date = data.date;
    if (data.comment !== undefined) set.comment = data.comment;
    if (Object.keys(set).length) await this.db.updateTable('worklogs').set(set).where('id', '=', a.worklog.id).execute();
    return this.one(a.worklog.id);
  }

  @Delete('worklogs/:worklogId')
  @HttpCode(204)
  async remove(@CurrentUser() user: SessionUser, @Param('worklogId') worklogId: string) {
    const a = await this.access.worklog(user, worklogId, 'worklog-delete');
    if (a.worklog.user_id !== user.id && !a.isAdmin) throw forbidden('Удалить можно только свои записи времени');
    await this.db.deleteFrom('worklogs').where('id', '=', a.worklog.id).execute();
  }

  private select() {
    return this.db
      .selectFrom('worklogs as w')
      .innerJoin('users as u', 'u.id', 'w.user_id')
      .select(['w.id', 'w.task_id', 'w.date', 'w.minutes', 'w.comment', 'w.created_at', 'u.id as uId', 'u.name', 'u.username']);
  }

  private async one(id: string) {
    return toWorklog(await this.select().where('w.id', '=', id).executeTakeFirstOrThrow());
  }
}

function toWorklog(r: { id: string; task_id: string; date: string; minutes: number; comment: string | null; created_at: Date; uId: string; name: string; username: string | null }) {
  return {
    id: r.id,
    taskId: r.task_id,
    user: { userId: r.uId, name: r.name, username: r.username ?? '' },
    date: r.date,
    minutes: r.minutes,
    comment: r.comment,
    createdAt: r.created_at.toISOString(),
  };
}
