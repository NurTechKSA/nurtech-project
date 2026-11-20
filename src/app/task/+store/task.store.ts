import { inject } from '@angular/core';
import { updateState, withDevtools } from '@angular-architects/ngrx-toolkit';
import { signalStore, withMethods, withProps, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap } from 'rxjs';

import { Project } from '@core/project/interfaces/project.interface';
import { catchEffectError } from '@shared/store/catch-effect-error.operator';
import { setLoaded, setLoading } from '@shared/store/status-update.util';
import { withLoadingStatus } from '@shared/store/with-loading-status.util';

import { TaskDetail } from '../interfaces/task-detail.interface';
import { ApiTaskService } from '../services/api-task.service';

interface TaskState {
  task: TaskDetail | null;
}

interface LoadTaskParams {
  projectId: Project['id'];
  key: TaskDetail['key'];
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export const TaskStore = signalStore(
  withDevtools('task'),
  withLoadingStatus(),
  withState<TaskState>({ task: null }),
  withProps(() => ({
    apiTaskService: inject(ApiTaskService),
  })),
  withMethods(({ apiTaskService, ...store }) => ({
    loadTask: rxMethod<LoadTaskParams>(
      pipe(
        tap(() => {
          updateState(
            store,
            '[TaskStore] loadTask',
            { task: null },
            setLoading()
          );
        }),
        switchMap(({ projectId, key }) =>
          apiTaskService.getTaskByKey(projectId, key)
        ),
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
