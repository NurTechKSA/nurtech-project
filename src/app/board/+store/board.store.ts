import { inject } from '@angular/core';
import { updateState, withDevtools } from '@angular-architects/ngrx-toolkit';
import { signalStore, withMethods, withProps, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { filter, forkJoin, pipe, switchMap, tap } from 'rxjs';

import { Project } from '@core/project/interfaces/project.interface';
import { catchEffectError } from '@shared/store/catch-effect-error.operator';
import { setLoaded, setLoading } from '@shared/store/status-update.util';
import { withLoadingStatus } from '@shared/store/with-loading-status.util';

import { Board } from '../interfaces/board.interface';
import { Status } from '../interfaces/status.interface';
import { ApiBoardService } from '../services/api-board.service';

interface BoardState {
  boards: Board[];
  statuses: Status[];
}

const initialState: BoardState = {
  boards: [],
  statuses: [],
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
    loadProjectData: rxMethod<Project['id'] | null>(
      pipe(
        filter((projectId): projectId is Project['id'] => projectId !== null),
        tap(() => {
          updateState(
            store,
            '[BoardStore] loadProjectData',
            initialState,
            setLoading()
          );
        }),
        switchMap((projectId) =>
          forkJoin([
            apiBoardService.getBoards(projectId),
            apiBoardService.getStatuses(projectId),
          ])
        ),
        tap(([boards, statuses]) => {
          updateState(
            store,
            '[BoardStore] loadProjectDataSuccess',
            { boards, statuses },
            setLoaded()
          );
        }),
        catchEffectError({
          store,
          methodName: '[BoardStore] loadProjectData',
        })
      )
    ),
  }))
);
