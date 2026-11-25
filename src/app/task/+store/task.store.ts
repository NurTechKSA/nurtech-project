import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { updateState, withDevtools } from '@angular-architects/ngrx-toolkit';
import { signalStore, withMethods, withProps, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, filter, pipe, switchMap, tap, throwError } from 'rxjs';

import { AppPath } from '@core/enums/app-path.enum';
import { ProjectStore } from '@core/project/+store/project.store';
import { catchEffectError } from '@shared/store/catch-effect-error.operator';
import { setLoaded, setLoading } from '@shared/store/status-update.util';
import { withLoadingStatus } from '@shared/store/with-loading-status.util';

import { TaskDetail } from '../interfaces/task-detail.interface';
import { ApiTaskService } from '../services/api-task.service';

interface TaskState {
  task: TaskDetail | null;
}

const initialState: TaskState = {
  task: null,
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export const TaskStore = signalStore(
  withDevtools('task'),
  withLoadingStatus(),
  withState(initialState),
  withProps(() => ({
    router: inject(Router),
    apiTaskService: inject(ApiTaskService),
    projectStore: inject(ProjectStore),
  })),
  withMethods(({ apiTaskService, projectStore, router, ...store }) => ({
    loadTask: rxMethod<TaskDetail['key']>(
      pipe(
        filter(() => Boolean(projectStore.currentProjectId())),
        tap(() => {
          updateState(
            store,
            '[TaskStore] loadTask',
            initialState,
            setLoading()
          );
        }),
        switchMap((key) =>
          apiTaskService
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            .getTaskByKey(projectStore.currentProjectId()!, key)
            .pipe(
              catchError((error: HttpErrorResponse) => {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
                if (error.status === HttpStatusCode.NotFound) {
                  void router.navigate(['/', AppPath.NOT_FOUND], {
                    replaceUrl: true,
                  });
                }

                return throwError(() => error);
              })
            )
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
  }))
);
