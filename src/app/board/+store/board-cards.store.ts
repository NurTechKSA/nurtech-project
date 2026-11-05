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
import { BoardColumnCards } from '../interfaces/board-column-cards.interface';
import { Board } from '../interfaces/board.interface';
import { ApiBoardService } from '../services/api-board.service';

interface BoardCardsState {
  columns: BoardColumnCards[];
}

const initialState: BoardCardsState = {
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

  withComputed(({ boardStore, columns }) => ({
    columnsWithNames: computed(() => {
      const statusNames = new Map(
        boardStore.statuses().map(({ id, name }) => [id, name])
      );

      return columns().map((column) => ({
        ...column,
        name: statusNames.get(column.statusId) ?? column.statusId,
      }));
    }),
  })),

  withMethods(({ apiBoardService, ...store }) => ({
    loadBoardCards: rxMethod<Board['id']>(
      pipe(
        tap(() => {
          updateState(
            store,
            '[BoardCardsStore] loadBoardCards',
            initialState,
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
