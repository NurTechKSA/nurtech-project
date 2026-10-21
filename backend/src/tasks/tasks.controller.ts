import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Patch, Post, Query } from '@nestjs/common';
import { AccessService } from '../auth/access.js';
import { CurrentUser, type SessionUser } from '../auth/session.js';
import { CONTRACT, pathId } from '../core.js';
import type { TaskType } from '../db/schema.js';
import type { Contract } from '../http/contract.js';
import { validation } from '../http/errors.js';
import { TasksService, type CreateTaskInput, type UpdateTaskInput } from './tasks.service.js';

/** UUID в теле приводим к нижнему регистру, как их хранит база */
function lowerIds<T extends Record<string, any>>(data: T): T {
  const out: Record<string, any> = { ...data };
  for (const k of ['statusId', 'assigneeId', 'reviewerId', 'subsystemId', 'parentId', 'targetTaskId']) {
    if (typeof out[k] === 'string') out[k] = out[k].toLowerCase();
  }
  if (Array.isArray(out.tagIds)) out.tagIds = out.tagIds.map((x: string) => x.toLowerCase());
  return out as T;
}

@Controller()
export class TasksController {
  constructor(
    @Inject(CONTRACT) private readonly contract: Contract,
    @Inject(AccessService) private readonly access: AccessService,
    @Inject(TasksService) private readonly tasks: TasksService,
  ) {}

  @Post('projects/:projectId/tasks')
  async create(@CurrentUser() user: SessionUser, @Param('projectId') projectId: string, @Body() body: unknown) {
    const a = await this.access.project(user, projectId, 'task-create');
    const { data } = this.contract.body<CreateTaskInput>('createTask', body);
    return this.tasks.create(a, lowerIds(data));
  }

  @Get('projects/:projectId/tasks/search')
  async search(@CurrentUser() user: SessionUser, @Param('projectId') projectId: string, @Query() query: Record<string, unknown>) {
    const a = await this.access.project(user, projectId, 'task-view');
    const q = this.contract.query<{ q?: string; types?: TaskType[]; excludeId?: string; limit: number }>('searchTasks', query);
    return this.tasks.search(a, q);
  }

  @Get('projects/:projectId/tasks/by-key/:key')
  async byKey(@CurrentUser() user: SessionUser, @Param('projectId') projectId: string, @Param('key') key: string) {
    const a = await this.access.project(user, projectId, 'task-view');
    return this.tasks.byKey(a, key);
  }

  @Patch('tasks/:taskId')
  async update(@CurrentUser() user: SessionUser, @Param('taskId') taskId: string, @Body() body: unknown) {
    const a = await this.access.task(user, taskId, 'task-update');
    const { data } = this.contract.body<UpdateTaskInput>('updateTask', body);
    return this.tasks.update(a, a.taskId, lowerIds(data));
  }

  @Get('tasks/:taskId/history')
  async history(@CurrentUser() user: SessionUser, @Param('taskId') taskId: string) {
    const a = await this.access.task(user, taskId, 'task-view');
    return this.tasks.history(a.taskId);
  }

  @Post('tasks/:taskId/links')
  async createLink(@CurrentUser() user: SessionUser, @Param('taskId') taskId: string, @Body() body: unknown) {
    const a = await this.access.task(user, taskId, 'link-manage');
    const { data } = this.contract.body<{ type: 'blocks' | 'blocked_by'; targetTaskId: string }>('createTaskLink', body);
    return this.tasks.createLink(a, a.taskId, lowerIds(data));
  }

  @Delete('tasks/:taskId/links/:linkId')
  @HttpCode(204)
  async deleteLink(@CurrentUser() user: SessionUser, @Param('taskId') taskId: string, @Param('linkId') linkId: string) {
    const a = await this.access.task(user, taskId, 'link-manage');
    await this.tasks.deleteLink(a, a.taskId, pathId(linkId));
  }

  @Post('tasks/:taskId/urls')
  async createUrl(@CurrentUser() user: SessionUser, @Param('taskId') taskId: string, @Body() body: unknown) {
    const a = await this.access.task(user, taskId, 'link-manage');
    // ТЗ 02, раздел 7: пустой, слишком длинный или не http(s) адрес - fields.url = invalid
    const raw = (body ?? {}) as Record<string, unknown>;
    if (typeof raw === 'object' && typeof raw.url === 'string' && (raw.url.trim() === '' || raw.url.trim().length > 2000)) {
      throw validation({ url: 'invalid' }, 'Укажите адрес, начинающийся с http:// или https://');
    }
    const { data } = this.contract.body<{ url: string; title?: string | null }>('createTaskUrl', body);
    return this.tasks.createUrl(a, a.taskId, data);
  }

  @Delete('tasks/:taskId/urls/:urlId')
  @HttpCode(204)
  async deleteUrl(@CurrentUser() user: SessionUser, @Param('taskId') taskId: string, @Param('urlId') urlId: string) {
    const a = await this.access.task(user, taskId, 'link-manage');
    await this.tasks.deleteUrl(a, a.taskId, pathId(urlId));
  }
}
