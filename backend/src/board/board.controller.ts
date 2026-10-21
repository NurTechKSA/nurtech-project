import { Body, Controller, Get, Header, HttpCode, Inject, Param, Post, Query } from '@nestjs/common';
import { AccessService } from '../auth/access.js';
import { CurrentUser, type SessionUser } from '../auth/session.js';
import { CONTRACT } from '../core.js';
import type { Contract } from '../http/contract.js';
import { BoardService, type CardFilters, type MoveInput } from './board.service.js';

@Controller()
export class BoardController {
  constructor(
    @Inject(CONTRACT) private readonly contract: Contract,
    @Inject(AccessService) private readonly access: AccessService,
    @Inject(BoardService) private readonly board: BoardService,
  ) {}

  @Get('boards/:boardId/cards')
  @Header('Cache-Control', 'no-store')
  async cards(@CurrentUser() user: SessionUser, @Param('boardId') boardId: string, @Query() query: Record<string, unknown>) {
    const a = await this.access.board(user, boardId, 'board-view');
    const filters = this.contract.query<CardFilters>('getBoardCards', query);
    return this.board.cards(a, a.boardId, filters);
  }

  @Post('tasks/:taskId/move')
  @HttpCode(200)
  async move(@CurrentUser() user: SessionUser, @Param('taskId') taskId: string, @Body() body: unknown) {
    const a = await this.access.task(user, taskId, 'task-move');
    // Пустая причина - как отсутствующая: обязательность проверяет сама ручка по статусу
    const input = body && typeof body === 'object' && !Array.isArray(body) ? { ...(body as Record<string, unknown>) } : body;
    if (input && typeof input === 'object' && typeof (input as { reason?: unknown }).reason === 'string' && !(input as { reason: string }).reason.trim()) {
      delete (input as { reason?: unknown }).reason;
    }
    const { data } = this.contract.body<MoveInput>('moveTask', input);
    const ids = {
      statusId: data.statusId.toLowerCase(),
      prevId: data.prevId?.toLowerCase(),
      nextId: data.nextId?.toLowerCase(),
    };
    const rawReason = (input as { reason?: string } | undefined)?.reason;
    return this.board.move(a, a.taskId, { ...data, ...ids }, rawReason);
  }
}
