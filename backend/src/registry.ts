import type { Provider, Type } from '@nestjs/common';
import { TasksController } from './tasks/tasks.controller.js';
import { TasksService } from './tasks/tasks.service.js';

/** Контроллеры и сервисы пакетов 2–4 */
export const MODULE_CONTROLLERS: Type[] = [TasksController];
export const MODULE_PROVIDERS: Provider[] = [TasksService];
