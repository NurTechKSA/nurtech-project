import {
  computed,
  Directive,
  effect,
  inject,
  input,
  TemplateRef,
  ViewContainerRef,
} from '@angular/core';

import { PermissionStore } from '../+store/permission.store';
import { ProjectPermission } from '../enums/project-permission.enum';

interface PermissionCheck {
  permissions: ProjectPermission[];
  mode: 'every' | 'some';
}

function transformToPermissionCheck(
  value: ProjectPermission | ProjectPermission[] | PermissionCheck
): PermissionCheck {
  if (typeof value === 'string') {
    return { permissions: [value], mode: 'every' };
  }

  if (Array.isArray(value)) {
    return { permissions: value, mode: 'every' };
  }

  return value;
}

/**
 * Показывает элемент, только если у пользователя есть права в текущем проекте.
 *
 * В компоненте: `readonly permission = ProjectPermission;`
 *
 * @example
 * <!-- одно право -->
 * <button *appRestrictByPermission="permission.TASK_CREATE">+ Задача</button>
 *
 * <!-- нужны все права из списка -->
 * <div *appRestrictByPermission="[permission.TASK_UPDATE, permission.TASK_MOVE]">…</div>
 *
 * <!-- достаточно любого из списка -->
 * <div *appRestrictByPermission="{ permissions: [permission.TASK_CREATE, permission.TASK_UPDATE], mode: 'some' }">…</div>
 *
 * <!-- что показать, если прав нет -->
 * <button *appRestrictByPermission="permission.TASK_MOVE; else readonlyStatus">Сменить статус</button>
 * <ng-template #readonlyStatus><span>{{ status }}</span></ng-template>
 */
@Directive({ selector: '[appRestrictByPermission]' })
export class RestrictByPermissionDirective {
  private readonly templateRef = inject(TemplateRef);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly permissionStore = inject(PermissionStore);

  readonly appRestrictByPermission = input.required<
    PermissionCheck,
    ProjectPermission | ProjectPermission[] | PermissionCheck
  >({ transform: transformToPermissionCheck });

  readonly appRestrictByPermissionElse = input<TemplateRef<unknown> | null>(
    null
  );

  readonly isPermitted = computed(() => {
    const { permissions, mode } = this.appRestrictByPermission();

    return mode === 'every'
      ? this.permissionStore.hasPermissionEvery(permissions)
      : this.permissionStore.hasPermissionSome(permissions);
  });

  constructor() {
    effect(() => {
      const template = this.isPermitted()
        ? this.templateRef
        : this.appRestrictByPermissionElse();

      this.viewContainer.clear();

      if (template) {
        this.viewContainer.createEmbeddedView(template);
      }
    });
  }
}
