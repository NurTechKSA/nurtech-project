import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { filter, map, take } from 'rxjs';

import { AppPath } from '@core/enums/app-path.enum';
import { RouteParam } from '@core/enums/route-param.enum';
import { ProjectStore } from '@core/project/+store/project.store';

import { BoardStore } from '../+store/board.store';

export const lastBoardGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const boardStore = inject(BoardStore);
  const projectStore = inject(ProjectStore);
  const projectKey = route.paramMap.get(RouteParam.PROJECT_KEY) ?? '';

  boardStore.loadBoards(projectStore.entityMap()[projectKey].id);

  return toObservable(boardStore.status).pipe(
    filter(() => boardStore.isLoaded() || boardStore.isError()),
    take(1),
    map(() => {
      const boards = boardStore.boards();
      const lastBoardId = projectStore.lastBoardIds()[projectKey];
      const board = boards.find(({ id }) => id === lastBoardId) ?? boards.at(0);

      return board
        ? router.createUrlTree([
            '/',
            AppPath.PROJECT,
            projectKey,
            AppPath.BOARD,
            board.id,
          ])
        : true;
    })
  );
};
