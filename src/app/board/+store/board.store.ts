import { inject } from '@angular/core';
import { updateState, withDevtools } from '@angular-architects/ngrx-toolkit';
import { signalStore, withMethods, withProps, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { filter, forkJoin, pipe, switchMap, tap } from 'rxjs';

import { Project } from '@core/project/interfaces/project.interface';
import { LoadingStatus } from '@shared/enums/loading-status.enum';
import { catchEffectError } from '@shared/store/catch-effect-error.operator';
import { setLoaded, setLoading } from '@shared/store/status-update.util';
import { withLoadingStatus } from '@shared/store/with-loading-status.util';

import { BoardColumnCards } from '../interfaces/board-column-cards.interface';
import { Board } from '../interfaces/board.interface';
import { Status } from '../interfaces/status.interface';
import { ApiBoardService } from '../services/api-board.service';

interface BoardState {
  boards: Board[];
  statuses: Status[];
  columns: BoardColumnCards[];
}

const initialState: BoardState = {
  boards: [],
  statuses: [],
  columns: [],
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export const BoardStore = signalStore(
  { providedIn: 'root' },

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
    loadBoardCards: rxMethod<Board['id']>(
      pipe(
        tap(() => {
          updateState(
            store,
            '[BoardStore] loadBoardCards',
            { columns: [] },
            setLoading()
          );
        }),
        switchMap((boardId) => apiBoardService.getBoardCards(boardId)),
        tap(({ columns }) => {
          updateState(
            store,
            '[BoardStore] loadBoardCardsSuccess',
            { columns },
            setLoaded()
          );
        }),
        catchEffectError({
          store,
          methodName: '[BoardStore] loadBoardCards',
        })
      )
    ),
    reset: (): void => {
      updateState(store, '[BoardStore] reset', initialState, {
        status: LoadingStatus.INIT,
      });
    },
  }))
);
