import type { Provider, Type } from '@nestjs/common';
import { BoardController } from './board/board.controller.js';
import { BoardService } from './board/board.service.js';
import { CommentsController } from './comments/comments.controller.js';
import { TasksController } from './tasks/tasks.controller.js';
import { TasksService } from './tasks/tasks.service.js';
import { WorklogsController } from './worklogs/worklogs.controller.js';

/** Контроллеры и сервисы пакетов 2–4 */
export const MODULE_CONTROLLERS: Type[] = [TasksController, BoardController, CommentsController, WorklogsController];
export const MODULE_PROVIDERS: Provider[] = [TasksService, BoardService];
