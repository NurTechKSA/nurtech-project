import { inject } from '@angular/core';
import { updateState, withDevtools } from '@angular-architects/ngrx-toolkit';
import { signalStore, withMethods, withProps, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { filter, pipe, switchMap, tap } from 'rxjs';

import { Project } from '@core/project/interfaces/project.interface';
import { catchEffectError } from '@shared/store/catch-effect-error.operator';
import { setLoaded, setLoading } from '@shared/store/status-update.util';
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
        filter((projectId): projectId is Project['id'] => projectId !== null),
        tap(() => {
          updateState(
            store,
            '[BoardStore] loadBoards',
            initialState,
            setLoading()
          );
        }),
        switchMap((projectId) => apiBoardService.getBoards(projectId)),
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
