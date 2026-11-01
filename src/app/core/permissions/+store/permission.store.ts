import { computed, inject } from '@angular/core';
import { updateState, withDevtools } from '@angular-architects/ngrx-toolkit';
import {
  signalStore,
  withComputed,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap } from 'rxjs';

import { Project } from '@core/project/interfaces/project.interface';
import { LoadingStatus } from '@shared/enums/loading-status.enum';
import { catchEffectError } from '@shared/store/catch-effect-error.operator';
import { setLoaded, setLoading } from '@shared/store/status-update.util';
import { withLoadingStatus } from '@shared/store/with-loading-status.util';

import { ProjectPermission } from '../enums/project-permission.enum';
import { ApiPermissionService } from '../services/api-permission.service';

interface PermissionState {
  permissions: ProjectPermission[];
}

const initialState: PermissionState = {
  permissions: [],
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export const PermissionStore = signalStore(
  { providedIn: 'root' },
  withDevtools('permission'),

  withLoadingStatus(),

  withState(initialState),

  withComputed(({ permissions }) => ({
    permissionSet: computed(() => new Set(permissions())),
  })),

  withProps(() => ({
    apiPermissionService: inject(ApiPermissionService),
  })),

  withMethods(({ apiPermissionService, ...store }) => ({
    loadPermissions: rxMethod<Project['id']>(
      pipe(
        tap(() => {
          updateState(
            store,
            '[PermissionStore] loadPermissions',
            initialState,
            setLoading()
          );
        }),
        switchMap((projectId) =>
          apiPermissionService.getProjectPermissions(projectId)
        ),
        tap(({ permissions }) => {
          updateState(
            store,
            '[PermissionStore] loadPermissionsSuccess',
            { permissions },
            setLoaded()
          );
        }),
        catchEffectError({
          store,
          methodName: '[PermissionStore] loadPermissions',
        })
      )
    ),
    reset: (): void => {
      updateState(store, '[PermissionStore] reset', initialState, {
        status: LoadingStatus.INIT,
      });
    },
    hasPermission: (permission: ProjectPermission): boolean =>
      store.permissionSet().has(permission),
    hasPermissionEvery: (permissions: ProjectPermission[]): boolean =>
      permissions.every((permission) => store.permissionSet().has(permission)),
    hasPermissionSome: (permissions: ProjectPermission[]): boolean =>
      permissions.some((permission) => store.permissionSet().has(permission)),
  }))
);
