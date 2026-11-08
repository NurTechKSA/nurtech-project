import { computed, inject } from '@angular/core';
import { updateState, withDevtools } from '@angular-architects/ngrx-toolkit';
import {
  signalStore,
  withComputed,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap } from 'rxjs';

import { catchEffectError } from '@shared/store/catch-effect-error.operator';
import { setLoaded, setLoading } from '@shared/store/status-update.util';
import { withLoadingStatus } from '@shared/store/with-loading-status.util';

import { BoardStore } from './board.store';
import { BoardColumn } from '../interfaces/board-column.interface';
import { Board } from '../interfaces/board.interface';
import { ApiBoardService } from '../services/api-board.service';

interface State {
  boardId: Board['id'] | null;
  columns: BoardColumn[];
}

const initialState: State = {
  boardId: null,
  columns: [],
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export const BoardCardsStore = signalStore(
  withDevtools('boardCards'),

  withLoadingStatus(),

  withState(initialState),

  withProps(() => ({
    apiBoardService: inject(ApiBoardService),
    boardStore: inject(BoardStore),
  })),

  withComputed(({ boardId, boardStore, columns }) => ({
    columnsWithDetails: computed(() => {
      const board = boardStore.boards().find(({ id }) => id === boardId());
      const detailsByStatusId = new Map(
        board?.columns.map((column) => [column.statusId, column])
      );

      return columns().map((column) => {
        const details = detailsByStatusId.get(column.statusId);

        return {
          ...details,
          ...column,
          name: details?.name ?? column.statusId,
        };
      });
    }),
  })),

  withMethods(({ apiBoardService, ...store }) => ({
    loadBoardCards: rxMethod<Board['id']>(
      pipe(
        tap((boardId) => {
          updateState(
            store,
            '[BoardCardsStore] loadBoardCards',
            initialState,
            { boardId },
            setLoading()
          );
        }),
        switchMap((boardId) => apiBoardService.getBoardCards(boardId)),
        tap((columns) => {
          updateState(
            store,
            '[BoardCardsStore] loadBoardCardsSuccess',
            { columns },
            setLoaded()
          );
        }),
        catchEffectError({
          store,
          methodName: '[BoardCardsStore] loadBoardCards',
        })
      )
    ),
  }))
);
