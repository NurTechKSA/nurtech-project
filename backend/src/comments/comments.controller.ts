import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Patch, Post, Query } from '@nestjs/common';
import { sql } from 'kysely';
import { AccessService } from '../auth/access.js';
import { CurrentUser, type SessionUser } from '../auth/session.js';
import { CONTRACT, DB, isUuid } from '../core.js';
import type { Db, Q } from '../db/db.js';
import type { Contract } from '../http/contract.js';
import { forbidden, validation } from '../http/errors.js';
import { touch } from '../tasks/tasks.service.js';

/** Курсор - base64url от (createdAt, id) самого раннего показанного комментария */
function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(JSON.stringify([createdAt.toISOString(), id])).toString('base64url');
}

function decodeCursor(cursor: string): { createdAt: string; id: string } {
  try {
    const [createdAt, id] = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    if (typeof createdAt !== 'string' || Number.isNaN(Date.parse(createdAt)) || !isUuid(id)) throw new Error();
    return { createdAt, id };
  } catch {
    throw validation({ before: 'invalid' }, 'Не удалось загрузить ещё комментарии, обновите страницу');
  }
}

function selectComments(q: Q) {
  return q
    .selectFrom('comments as c')
    .innerJoin('users as u', 'u.id', 'c.author_id')
    .select(['c.id', 'c.task_id', 'c.kind', 'c.body', 'c.created_at', 'c.edited_at', 'u.id as uId', 'u.name', 'u.username']);
}

type Row = Awaited<ReturnType<ReturnType<typeof selectComments>['executeTakeFirstOrThrow']>>;

const toComment = (r: Row) => ({
  id: r.id,
  taskId: r.task_id,
  kind: r.kind,
  body: r.body,
  author: { userId: r.uId, name: r.name, username: r.username ?? '' },
  createdAt: r.created_at.toISOString(),
  editedAt: r.edited_at ? r.edited_at.toISOString() : null,
});

@Controller()
export class CommentsController {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(CONTRACT) private readonly contract: Contract,
    @Inject(AccessService) private readonly access: AccessService,
  ) {}

  @Get('tasks/:taskId/comments')
  async list(@CurrentUser() user: SessionUser, @Param('taskId') taskId: string, @Query() query: Record<string, unknown>) {
    const a = await this.access.task(user, taskId, 'task-view');
    const { before, limit } = this.contract.query<{ before?: string; limit: number }>('listComments', query);
    let q = selectComments(this.db).where('c.task_id', '=', a.taskId);
    if (before) {
      const cur = decodeCursor(before);
      q = q.where(sql<boolean>`(c.created_at, c.id) < (${cur.createdAt}::timestamptz, ${cur.id}::uuid)`);
    }
    const rows = await q.orderBy('c.created_at', 'desc').orderBy('c.id', 'desc').limit(limit + 1).execute();
    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit).reverse();
    return {
      items: page.map(toComment),
      hasMore,
      nextCursor: hasMore && page.length ? encodeCursor(page[0].created_at, page[0].id) : null,
    };
  }

  @Post('tasks/:taskId/comments')
  async create(@CurrentUser() user: SessionUser, @Param('taskId') taskId: string, @Body() body: unknown) {
    const a = await this.access.task(user, taskId, 'comment-create');
    const { raw } = this.contract.body<{ body: string }>('createComment', body);
    const id = await this.db.transaction().execute(async (tx) => {
      const c = await tx.insertInto('comments').values({ task_id: a.taskId, author_id: user.id, kind: 'comment', body: raw.body }).returning('id').executeTakeFirstOrThrow();
      await touch(tx, [a.taskId]);
      return c.id;
    });
    return toComment(await selectComments(this.db).where('c.id', '=', id).executeTakeFirstOrThrow());
  }

  @Patch('comments/:commentId')
  async update(@CurrentUser() user: SessionUser, @Param('commentId') commentId: string, @Body() body: unknown) {
    const a = await this.access.comment(user, commentId, 'comment-update');
    // Чужой комментарий не правит никто, включая admin и owner
    if (a.comment.author_id !== user.id) throw forbidden('Править можно только свой комментарий');
    const { raw } = this.contract.body<{ body?: string }>('updateComment', body);
    if (raw.body !== undefined) {
      await this.db.transaction().execute(async (tx) => {
        const changed = await tx
          .updateTable('comments')
          .set({ body: raw.body!, edited_at: sql<Date>`now()` })
          .where('id', '=', a.comment.id)
          .where('body', '<>', raw.body!)
          .returning('id')
          .executeTakeFirst();
        if (changed) await touch(tx, [a.comment.task_id]);
      });
    }
    return toComment(await selectComments(this.db).where('c.id', '=', a.comment.id).executeTakeFirstOrThrow());
  }

  @Delete('comments/:commentId')
  @HttpCode(204)
  async remove(@CurrentUser() user: SessionUser, @Param('commentId') commentId: string) {
    const a = await this.access.comment(user, commentId, 'comment-delete');
    if (a.comment.author_id !== user.id && !a.isAdmin) throw forbidden('Удалить чужой комментарий может только администратор проекта');
    await this.db.transaction().execute(async (tx) => {
      await tx.deleteFrom('comments').where('id', '=', a.comment.id).execute();
      await touch(tx, [a.comment.task_id]);
    });
  }
}
