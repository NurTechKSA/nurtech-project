import { inject } from '@angular/core';
import { updateState, withDevtools } from '@angular-architects/ngrx-toolkit';
import { signalStore, withMethods, withProps, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import {
  catchError,
  debounceTime,
  EMPTY,
  exhaustMap,
  pipe,
  switchMap,
  tap,
} from 'rxjs';

import { Project } from '@core/project/interfaces/project.interface';
import { catchEffectError } from '@shared/store/catch-effect-error.operator';
import {
  setError,
  setLoaded,
  setLoading,
} from '@shared/store/status-update.util';
import { withLoadingStatus } from '@shared/store/with-loading-status.util';

import { TaskType } from '../enums/task-type.enum';
import { TaskCreateRequest } from '../interfaces/api/requests/task-create-request.interface';
import { TaskDetail } from '../interfaces/task-detail.interface';
import { TaskSearchItem } from '../interfaces/task-search-item.interface';
import { ApiTaskService } from '../services/api-task.service';

interface CreateTaskParams {
  projectId: Project['id'];
  body: TaskCreateRequest;
  onSuccess: (task: TaskDetail) => void;
  onError: (error: unknown) => void;
}

interface SearchParentsParams {
  projectId: Project['id'];
  query: string;
}

interface CreateTaskDialogState {
  parentOptions: TaskSearchItem[];
  isSearchingParents: boolean;
}

const PARENT_SEARCH_DEBOUNCE_MS = 250;
const PARENT_SEARCH_LIMIT = 20;

const initialState: CreateTaskDialogState = {
  parentOptions: [],
  isSearchingParents: false,
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export const CreateTaskDialogStore = signalStore(
  withDevtools('create-task-dialog'),
  withLoadingStatus(),
  withState(initialState),
  withProps(() => ({ apiTaskService: inject(ApiTaskService) })),
  withMethods(({ apiTaskService, ...store }) => ({
    createTask: rxMethod<CreateTaskParams>(
      pipe(
        tap(() => {
          updateState(
            store,
            '[CreateTaskDialogStore] createTask',
            setLoading()
          );
        }),
        exhaustMap(({ projectId, body, onSuccess, onError }) =>
          apiTaskService.createTask(projectId, body).pipe(
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
        ),
        catchEffectError({
          store,
          methodName: '[CreateTaskDialogStore] createTask',
        })
      )
    ),
    searchParents: rxMethod<SearchParentsParams>(
      pipe(
        debounceTime(PARENT_SEARCH_DEBOUNCE_MS),
        tap(() => {
          updateState(store, '[CreateTaskDialogStore] searchParents', {
            isSearchingParents: true,
          });
        }),
        switchMap(({ projectId, query }) =>
          apiTaskService
            .searchTasks(projectId, {
              q: query.trim() || undefined,
              types: [TaskType.TASK, TaskType.BUG],
              limit: PARENT_SEARCH_LIMIT,
            })
            .pipe(
              tap((parentOptions) => {
                updateState(
                  store,
                  '[CreateTaskDialogStore] searchParentsSuccess',
                  {
                    parentOptions,
                    isSearchingParents: false,
                  }
                );
              }),
              catchError(() => {
                updateState(
                  store,
                  '[CreateTaskDialogStore] searchParentsFailure',
                  {
                    isSearchingParents: false,
                  }
                );

                return EMPTY;
              })
            )
        )
      )
    ),
  }))
);
