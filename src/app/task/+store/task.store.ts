import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { updateState, withDevtools } from '@angular-architects/ngrx-toolkit';
import { signalStore, withMethods, withProps, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, EMPTY, pipe, switchMap, tap, throwError } from 'rxjs';

import { ProjectStore } from '@core/project/+store/project.store';
import { catchEffectError } from '@shared/store/catch-effect-error.operator';
import { setLoaded, setLoading } from '@shared/store/status-update.util';
import { withLoadingStatus } from '@shared/store/with-loading-status.util';

import { TaskDetail } from '../interfaces/task-detail.interface';
import { ApiTaskService } from '../services/api-task.service';

interface TaskState {
  task: TaskDetail | null;
  isNotFound: boolean;
}

const NOT_FOUND_STATUS = 404;

const initialState: TaskState = {
  task: null,
  isNotFound: false,
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export const TaskStore = signalStore(
  withDevtools('task'),
  withLoadingStatus(),
  withState(initialState),
  withProps(() => ({
    apiTaskService: inject(ApiTaskService),
    projectStore: inject(ProjectStore),
  })),
  withMethods(({ apiTaskService, projectStore, ...store }) => ({
    loadTask: rxMethod<TaskDetail['key']>(
      pipe(
        tap(() => {
          updateState(
            store,
            '[TaskStore] loadTask',
            initialState,
            setLoading()
          );
        }),
        switchMap((key) => {
          const projectId = projectStore.currentProjectId();

          if (!projectId) {
            return EMPTY;
          }

          return apiTaskService.getTaskByKey(projectId, key).pipe(
            catchError((error: unknown) => {
              if (
                error instanceof HttpErrorResponse &&
                error.status === NOT_FOUND_STATUS
              ) {
                updateState(store, '[TaskStore] loadTaskNotFound', {
                  isNotFound: true,
                });
              }

              return throwError(() => error);
            })
          );
        }),
        tap((task) => {
          updateState(
            store,
            '[TaskStore] loadTaskSuccess',
            { task },
            setLoaded()
          );
        }),
        catchEffectError({ store, methodName: '[TaskStore] loadTask' })
      )
    ),
    setTask: (task: TaskDetail): void => {
      if (store.task()?.id !== task.id) {
        return;
      }

      updateState(store, '[TaskStore] setTask', { task });
    },
  }))
);
