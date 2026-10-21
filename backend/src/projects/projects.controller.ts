import { Body, Controller, Get, Inject, Param, Post } from '@nestjs/common';
import { AccessService } from '../auth/access.js';
import { permissionsOf } from '../auth/permissions.js';
import { CurrentUser, type SessionUser } from '../auth/session.js';
import { CONTRACT, DB } from '../core.js';
import { pgCode, type Db } from '../db/db.js';
import type { Contract } from '../http/contract.js';
import { conflict } from '../http/errors.js';

const collator = new Intl.Collator('ru', { sensitivity: 'base', numeric: true });
export const byName = <T extends { name: string }>(a: T, b: T) => collator.compare(a.name, b.name);

@Controller()
export class ProjectsController {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(CONTRACT) private readonly contract: Contract,
    @Inject(AccessService) private readonly access: AccessService,
  ) {}

  @Get('projects')
  async list(@CurrentUser() user: SessionUser) {
    const rows = await this.db
      .selectFrom('memberships as m')
      .innerJoin('projects as p', 'p.id', 'm.project_id')
      .select(['p.id', 'p.key', 'p.name', 'm.role'])
      .where('m.user_id', '=', user.id)
      .execute();
    return { items: rows.sort(byName) };
  }

  @Get('projects/:projectId/me')
  async me(@CurrentUser() user: SessionUser, @Param('projectId') projectId: string) {
    const a = await this.access.project(user, projectId, 'project-view');
    return { userId: user.id, role: a.role, permissions: permissionsOf(a.role) };
  }

  @Get('projects/:projectId/members')
  async members(@CurrentUser() user: SessionUser, @Param('projectId') projectId: string) {
    const a = await this.access.project(user, projectId, 'member-list');
    const rows = await this.db
      .selectFrom('memberships as m')
      .innerJoin('users as u', 'u.id', 'm.user_id')
      .select(['u.id as userId', 'u.name', 'u.username'])
      .where('m.project_id', '=', a.projectId)
      .execute();
    return { items: rows.map((r) => ({ userId: r.userId, name: r.name, username: r.username ?? '' })).sort(byName) };
  }

  @Get('projects/:projectId/statuses')
  async statuses(@CurrentUser() user: SessionUser, @Param('projectId') projectId: string) {
    const a = await this.access.project(user, projectId, 'project-view');
    const rows = await this.db
      .selectFrom('statuses')
      .select(['id', 'name', 'color', 'category', 'requires_reason'])
      .where('project_id', '=', a.projectId)
      .orderBy('position')
      .execute();
    return {
      items: rows.map((s) => ({ id: s.id, name: s.name, color: s.color, category: s.category, requiresReason: s.requires_reason })),
    };
  }

  @Get('projects/:projectId/boards')
  async boards(@CurrentUser() user: SessionUser, @Param('projectId') projectId: string) {
    const a = await this.access.project(user, projectId, 'board-view');
    const boards = await this.db
      .selectFrom('boards')
      .select(['id', 'name', 'done_window_days'])
      .where('project_id', '=', a.projectId)
      .orderBy('position')
      .orderBy('created_at')
      .execute();
    const columns = boards.length
      ? await this.db
          .selectFrom('board_columns as c')
          .innerJoin('statuses as s', 's.id', 'c.status_id')
          .select(['c.board_id', 's.id', 's.name', 's.color', 's.category', 's.requires_reason'])
          .where(
            'c.board_id',
            'in',
            boards.map((b) => b.id),
          )
          .orderBy('c.position')
          .execute()
      : [];
    return {
      items: boards.map((b) => ({
        id: b.id,
        name: b.name,
        columns: columns
          .filter((c) => c.board_id === b.id)
          .map((c) => ({ statusId: c.id, name: c.name, color: c.color, category: c.category, requiresReason: c.requires_reason })),
        doneWindowDays: b.done_window_days,
      })),
    };
  }

  @Get('projects/:projectId/subsystems')
  async subsystems(@CurrentUser() user: SessionUser, @Param('projectId') projectId: string) {
    const a = await this.access.project(user, projectId, 'task-view');
    const rows = await this.db.selectFrom('subsystems').select(['id', 'name']).where('project_id', '=', a.projectId).execute();
    return { items: rows.sort(byName) };
  }

  @Get('projects/:projectId/tags')
  async tags(@CurrentUser() user: SessionUser, @Param('projectId') projectId: string) {
    const a = await this.access.project(user, projectId, 'task-view');
    const rows = await this.db.selectFrom('tags').select(['id', 'name']).where('project_id', '=', a.projectId).execute();
    return { items: rows.sort(byName) };
  }

  @Post('projects/:projectId/tags')
  async createTag(@CurrentUser() user: SessionUser, @Param('projectId') projectId: string, @Body() body: unknown) {
    const a = await this.access.project(user, projectId, 'tag-create');
    const { data } = this.contract.body<{ name: string }>('createTag', body);
    try {
      return await this.db
        .insertInto('tags')
        .values({ project_id: a.projectId, name: data.name })
        .returning(['id', 'name'])
        .executeTakeFirstOrThrow();
    } catch (err) {
      if (pgCode(err) === '23505') throw conflict('name_taken', 'Тег с таким названием уже есть', { name: 'taken' });
      throw err;
    }
  }
}
