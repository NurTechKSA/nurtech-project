import { inject } from '@angular/core';
import { updateState, withDevtools } from '@angular-architects/ngrx-toolkit';
import { signalStore, withMethods, withProps, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, pipe, switchMap, tap } from 'rxjs';

import { Project } from '@core/project/interfaces/project.interface';
import { LoadingStatus } from '@shared/enums/loading-status.enum';
import { catchEffectError } from '@shared/store/catch-effect-error.operator';
import { setLoaded } from '@shared/store/status-update.util';
import { withLoadingStatus } from '@shared/store/with-loading-status.util';

import { Board } from '../interfaces/board.interface';
import { ApiBoardService } from '../services/api-board.service';

interface State {
  boards: Board[];
}

const initialState: State = {
  boards: [],
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export const BoardStore = signalStore(
  withDevtools('board'),

  withLoadingStatus(),

  withState(initialState),

  withProps(() => ({
    apiBoardService: inject(ApiBoardService),
  })),

  withMethods(({ apiBoardService, ...store }) => ({
    loadBoards: rxMethod<Project['id'] | null>(
      pipe(
        tap((projectId) => {
          updateState(store, '[BoardStore] loadBoards', initialState, {
            status:
              projectId === null ? LoadingStatus.INIT : LoadingStatus.LOADING,
          });
        }),
        switchMap((projectId) =>
          projectId === null ? EMPTY : apiBoardService.getBoards(projectId)
        ),
        tap((boards) => {
          updateState(
            store,
            '[BoardStore] loadBoardsSuccess',
            { boards },
            setLoaded()
          );
        }),
        catchEffectError({
          store,
          methodName: '[BoardStore] loadBoards',
        })
      )
    ),
  }))
);
