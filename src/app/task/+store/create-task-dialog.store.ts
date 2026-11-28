import { inject } from '@angular/core';
import { updateState, withDevtools } from '@angular-architects/ngrx-toolkit';
import { signalStore, withMethods, withProps } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, EMPTY, exhaustMap, filter, pipe, tap } from 'rxjs';

import { ProjectStore } from '@core/project/+store/project.store';
import { catchEffectError } from '@shared/store/catch-effect-error.operator';
import {
  setError,
  setLoaded,
  setLoading,
} from '@shared/store/status-update.util';
import { withLoadingStatus } from '@shared/store/with-loading-status.util';

import { TaskCreateRequest } from '../interfaces/api/requests/task-create-request.interface';
import { TaskDetail } from '../interfaces/task-detail.interface';
import { ApiTaskService } from '../services/api-task.service';

interface CreateTaskParams {
  payload: TaskCreateRequest;
  onSuccess: (task: TaskDetail) => void;
  onError: (error: unknown) => void;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export const CreateTaskDialogStore = signalStore(
  withDevtools('create-task-dialog'),
  withLoadingStatus(),
  withProps(() => ({
    apiTaskService: inject(ApiTaskService),
    projectStore: inject(ProjectStore),
  })),
  withMethods(({ apiTaskService, projectStore, ...store }) => ({
    createTask: rxMethod<CreateTaskParams>(
      pipe(
        filter(() => Boolean(projectStore.currentProjectId())),
        exhaustMap(({ payload, onSuccess, onError }) => {
          updateState(
            store,
            '[CreateTaskDialogStore] createTask',
            setLoading()
          );

          return (
            apiTaskService
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              .createTask(projectStore.currentProjectId()!, payload)
              .pipe(
                tap((task) => {
                  updateState(
                    store,
                    '[CreateTaskDialogStore] createTaskSuccess',
                    setLoaded()
                  );
                  onSuccess(task);
                }),
                catchError((error: unknown) => {
                  updateState(
                    store,
                    '[CreateTaskDialogStore] createTaskFailure',
                    setError()
                  );
                  onError(error);

                  return EMPTY;
                })
              )
          );
        }),
        catchEffectError({
          store,
          methodName: '[CreateTaskDialogStore] createTask',
        })
      )
    ),
  }))
);
