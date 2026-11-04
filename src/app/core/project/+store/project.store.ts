import { computed, inject } from '@angular/core';
import { updateState, withDevtools } from '@angular-architects/ngrx-toolkit';
import {
  signalMethod,
  signalStore,
  type,
  withComputed,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import {
  entityConfig,
  removeAllEntities,
  setAllEntities,
  withEntities,
} from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { exhaustMap, filter, pipe, tap } from 'rxjs';

import { PermissionStore } from '@core/permissions/+store/permission.store';
import { LoadingStatus } from '@shared/enums/loading-status.enum';
import { catchEffectError } from '@shared/store/catch-effect-error.operator';
import { setLoaded, setLoading } from '@shared/store/status-update.util';
import { withLoadingStatus } from '@shared/store/with-loading-status.util';

import { Project } from '../interfaces/project.interface';
import { ApiProjectService } from '../services/api-project.service';

interface ProjectState {
  currentProjectKey: Project['key'] | null;
}

const initialState: ProjectState = {
  currentProjectKey: null,
};

// Ключ проекта стоит в адресе, поэтому проекты храним по ключу, а не по id
const projectConfig = entityConfig({
  entity: type<Project>(),
  selectId: (project) => project.key,
});

// eslint-disable-next-line @typescript-eslint/naming-convention
export const ProjectStore = signalStore(
  { providedIn: 'root' },
  withDevtools('project'),

  withLoadingStatus(),

  withState(initialState),
  withEntities(projectConfig),

  withComputed(({ entityMap, currentProjectKey }) => ({
    currentProject: computed(() => {
      const key = currentProjectKey();

      return key ? (entityMap()[key] ?? null) : null;
    }),
  })),

  withComputed(({ currentProject }) => ({
    currentProjectId: computed(() => currentProject()?.id ?? null),
  })),

  withProps(() => ({
    permissionStore: inject(PermissionStore),
    apiProjectService: inject(ApiProjectService),
  })),

  withMethods(({ permissionStore, apiProjectService, ...store }) => ({
    loadProjects: rxMethod<void>(
      pipe(
        filter(() => !store.isLoaded()),
        tap(() => {
          updateState(store, '[ProjectStore] loadProjects', setLoading());
        }),
        exhaustMap(() => apiProjectService.getProjects()),
        tap((projects) => {
          updateState(
            store,
            '[ProjectStore] loadProjectsSuccess',
            setAllEntities(projects, projectConfig),
            setLoaded()
          );
        }),
        catchEffectError({ store, methodName: '[ProjectStore] loadProjects' })
      )
    ),
    openProject: signalMethod<Project['key']>((currentProjectKey) => {
      updateState(store, '[ProjectStore] openProject', { currentProjectKey });

      const project = store.currentProject();

      if (project) {
        permissionStore.loadPermissions(project.id);
      }
    }),
    closeProject: (): void => {
      permissionStore.reset();
      updateState(store, '[ProjectStore] closeProject', initialState);
    },
    reset: (): void => {
      updateState(
        store,
        '[ProjectStore] reset',
        initialState,
        removeAllEntities(),
        { status: LoadingStatus.INIT }
      );
    },
  }))
);
