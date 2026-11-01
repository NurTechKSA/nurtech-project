import { JsonPipe } from '@angular/common';
import {
  HttpContext,
  HttpErrorResponse,
  httpResource,
} from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  Signal,
  signal,
  WritableSignal,
} from '@angular/core';
import { TuiButton, TuiExpand } from '@taiga-ui/core';
import { TuiButtonLoading } from '@taiga-ui/kit';

import { PermissionStore } from '@core/permissions/+store/permission.store';
import { ProjectStore } from '@core/project/+store/project.store';
import { SKIP_ERROR_NOTIFICATION } from '@core/tokens/skip-error-notification.token';
import { UserStore } from '@core/user/+store/user.store';

interface DataBlockInfo {
  title: string;
  source: string;
  usage: string;
  // Тег и operationId запроса в Swagger: ссылка открывает его раскрытым
  swaggerOperation: string;
}

interface DataBlock extends DataBlockInfo {
  data: Signal<unknown>;
  isLoading: Signal<boolean>;
  isOpen: WritableSignal<boolean>;
  isRequested: WritableSignal<boolean>;
  isExpanded: Signal<boolean>;
}

// Страница для разработки: сырые ответы API текущего проекта
@Component({
  imports: [JsonPipe, TuiButton, TuiButtonLoading, TuiExpand],
  templateUrl: './project-data-page.component.html',
  styleUrl: './project-data-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectDataPageComponent {
  private readonly projectStore = inject(ProjectStore);
  private readonly permissionStore = inject(PermissionStore);
  private readonly userStore = inject(UserStore);

  private readonly projectId = computed(
    () => this.projectStore.currentProject()?.id
  );

  readonly currentProject = this.projectStore.currentProject;

  readonly swaggerPath = '/api/docs/#/';

  readonly blocks: DataBlock[] = [
    this.createStoreBlock(
      {
        title: 'Пользователь',
        swaggerOperation: 'Session/getMe',
        source: 'UserStore.currentUser',
        usage:
          'Меню пользователя и страница профиля; имя меняется через PATCH /profile, пароль — PATCH /profile/password',
      },
      this.userStore.currentUser
    ),
    this.createStoreBlock(
      {
        title: 'Проекты',
        swaggerOperation: 'Projects/listMyProjects',
        source: 'ProjectStore.entities',
        usage:
          'Все проекты пользователя с его ролью: переключатель проектов, переход с главной, проверка ключа из адреса',
      },
      this.projectStore.entities
    ),
    this.createStoreBlock(
      {
        title: 'Текущий проект',
        swaggerOperation: 'Projects/listMyProjects',
        source: 'ProjectStore.currentProject',
        usage:
          'Переключатель проектов в шапке; id нужен во всех запросах проекта, ключ — в адресе и ключах задач',
      },
      this.projectStore.currentProject
    ),
    this.createStoreBlock(
      {
        title: 'Права',
        swaggerOperation: 'Projects/getProjectMe',
        source: 'PermissionStore.permissions',
        usage:
          'Какие кнопки и действия видны: директива appRestrictByPermission, роли и ключи — в 08-data-model-and-permissions',
      },
      this.permissionStore.permissions
    ),
    this.createApiBlock(
      {
        title: 'Доски',
        swaggerOperation: 'Boards/listBoards',
        source: 'GET /projects/:id/boards',
        usage:
          'Переключатель досок и колонки доски; колонка — это статус, карточки колонки грузятся через GET /boards/:id/cards',
      },
      'boards'
    ),
    this.createApiBlock(
      {
        title: 'Статусы',
        swaggerOperation: 'Statuses/listStatuses',
        source: 'GET /projects/:id/statuses',
        usage:
          'Колонки доски, поле «Статус» в карточке задачи и диалог создания; requiresReason — нужна причина при переносе',
      },
      'statuses'
    ),
    this.createApiBlock(
      {
        title: 'Участники',
        swaggerOperation: 'Members/listMembers',
        source: 'GET /projects/:id/members',
        usage: 'Исполнитель и ревьюер в карточке, фильтры доски, аватары',
      },
      'members'
    ),
    this.createApiBlock(
      {
        title: 'Задачи',
        swaggerOperation: 'Tasks/searchTasks',
        source: 'GET /projects/:id/tasks/search?limit=20',
        usage:
          'Поиск задачи для родителя и связи в карточке; без строки поиска — последние обновлённые',
      },
      'tasks/search',
      { limit: 20 }
    ),
  ];

  onBlockToggle(block: DataBlock): void {
    block.isRequested.set(true);
    block.isOpen.update((isOpen) => !isOpen);
  }

  private createStoreBlock(
    info: DataBlockInfo,
    data: Signal<unknown>
  ): DataBlock {
    const isOpen = signal(false);

    return {
      ...info,
      data,
      isOpen,
      isRequested: signal(true),
      isLoading: signal(false),
      isExpanded: isOpen,
    };
  }

  // Запрос уходит при первом раскрытии блока и повторяется при смене проекта
  private createApiBlock(
    info: DataBlockInfo,
    path: string,
    params?: Record<string, number>
  ): DataBlock {
    const isOpen = signal(false);
    const isRequested = signal(false);

    const resource = httpResource(() => {
      const projectId = this.projectId();

      return isRequested() && projectId
        ? {
            url: `projects/${projectId}/${path}`,
            params,
            context: new HttpContext().set(SKIP_ERROR_NOTIFICATION, true),
          }
        : undefined;
    });

    return {
      ...info,
      isOpen,
      isRequested,
      isLoading: resource.isLoading,
      isExpanded: computed(() => isOpen() && !resource.isLoading()),
      data: computed(() => {
        const error = resource.error();

        return error instanceof HttpErrorResponse
          ? (error.error as unknown)
          : resource.value();
      }),
    };
  }
}
