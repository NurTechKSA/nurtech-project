import { inject } from '@angular/core';
import { updateState, withDevtools } from '@angular-architects/ngrx-toolkit';
import { signalStore, withMethods, withProps, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap } from 'rxjs';

import { catchEffectError } from '@shared/store/catch-effect-error.operator';
import { setLoaded, setLoading } from '@shared/store/status-update.util';
import { withLoadingStatus } from '@shared/store/with-loading-status.util';

import { TaskDetail } from '../interfaces/task-detail.interface';
import { ApiTaskService } from '../services/api-task.service';

interface TaskState {
  currentTask: TaskDetail | null;
}

const initialState: TaskState = {
  currentTask: null,
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export const TaskStore = signalStore(
  withDevtools('task'),
  withLoadingStatus(),
  withState(initialState),

  withProps(() => ({
    apiTaskService: inject(ApiTaskService),
  })),

  withMethods(({ apiTaskService, ...store }) => ({
    loadTaskByKey: rxMethod<{ projectId: string; key: string }>(
      pipe(
        tap(() => {
          updateState(store, '[TaskStore] loadTaskByKey', setLoading());
        }),
        switchMap(({ projectId, key }) =>
          apiTaskService.getTaskByKey(projectId, key).pipe(
            tap((task) => {
              updateState(
                store,
                '[TaskStore] loadTaskByKeySuccess',
                { currentTask: task },
                setLoaded()
              );
            }),
            catchEffectError({
              store,
              methodName: '[TaskStore] loadTaskByKey',
            })
          )
        )
      )
    ),
  }))
);
