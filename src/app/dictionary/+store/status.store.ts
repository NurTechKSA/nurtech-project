import { effect, inject } from '@angular/core';
import { updateState, withDevtools } from '@angular-architects/ngrx-toolkit';
import {
  signalStore,
  type,
  withHooks,
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
import { filter, map, pipe, switchMap, tap } from 'rxjs';

import { Project } from '@core/project/interfaces/project.interface';
import { UserStore } from '@core/user/+store/user.store';
import { LoadingStatus } from '@shared/enums/loading-status.enum';
import { catchEffectError } from '@shared/store/catch-effect-error.operator';
import { setLoaded, setLoading } from '@shared/store/status-update.util';
import { withLoadingStatus } from '@shared/store/with-loading-status.util';

import { Status } from '../interfaces/status.interface';
import { ApiStatusService } from '../services/api-status.service';

interface StatusState {
  projectId: Project['id'] | null;
  resetCount: number;
}

const initialState: StatusState = {
  projectId: null,
  resetCount: 0,
};

const statusConfig = entityConfig({
  entity: type<Status>(),
  selectId: (status) => status.id,
});

// eslint-disable-next-line @typescript-eslint/naming-convention
export const StatusStore = signalStore(
  withDevtools('status'),
  withLoadingStatus(),
  withState(initialState),
  withEntities(statusConfig),
  withProps(() => ({
    apiStatusService: inject(ApiStatusService),
    userStore: inject(UserStore),
  })),
  withMethods(({ apiStatusService, ...store }) => ({
    loadStatuses: rxMethod<Project['id']>(
      pipe(
        filter(
          (projectId) => projectId !== store.projectId() || store.isError()
        ),
        tap((projectId) => {
          updateState(
            store,
            '[StatusStore] loadStatuses',
            { projectId },
            removeAllEntities(),
            setLoading()
          );
        }),
        map((projectId) => ({
          projectId,
          resetCount: store.resetCount(),
        })),
        switchMap(({ projectId, resetCount }) =>
          apiStatusService.getStatuses(projectId).pipe(
            map((statuses) => ({ statuses, resetCount }))
          )
        ),
        tap(({ statuses, resetCount }) => {
          if (resetCount !== store.resetCount()) {
            return;
          }

          updateState(
            store,
            '[StatusStore] loadStatusesSuccess',
            setAllEntities(statuses, statusConfig),
            setLoaded()
          );
        }),
        catchEffectError({ store, methodName: '[StatusStore] loadStatuses' })
      )
    ),
    reset: (): void => {
      updateState(
        store,
        '[StatusStore] reset',
        {
          projectId: null,
          resetCount: store.resetCount() + 1,
        },
        removeAllEntities(),
        { status: LoadingStatus.INIT }
      );
    },
  })),
  withHooks(({ userStore, reset }) => ({
    onInit(): void {
      effect(() => {
        if (!userStore.currentUser()) {
          reset();
        }
      });
    },
  }))
);