import { computed } from '@angular/core';
import { updateState, withDevtools } from '@angular-architects/ngrx-toolkit';
import {
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';

import { ProjectPermission } from '../enums/project-permission.enum';

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

  withState(initialState),

  withComputed(({ permissions }) => ({
    permissionSet: computed(() => new Set(permissions())),
  })),

  withMethods((store) => ({
    setPermissions: (permissions: ProjectPermission[]): void => {
      updateState(store, '[PermissionStore] setPermissions', { permissions });
    },
    reset: (): void => {
      updateState(store, '[PermissionStore] reset', initialState);
    },
    hasPermission: (permission: ProjectPermission): boolean =>
      store.permissionSet().has(permission),
    hasPermissionEvery: (permissions: ProjectPermission[]): boolean =>
      permissions.every((permission) => store.permissionSet().has(permission)),
    hasPermissionSome: (permissions: ProjectPermission[]): boolean =>
      permissions.some((permission) => store.permissionSet().has(permission)),
  }))
);
