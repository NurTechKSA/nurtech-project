import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { AppPath } from '@core/enums/app-path.enum';
import { RouteParam } from '@core/enums/route-param.enum';
import { ProjectStore } from '@core/project/+store/project.store';

import { ApiBoardService } from '../services/api-board.service';

export const lastBoardGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const projectStore = inject(ProjectStore);
  const projectKey = route.paramMap.get(RouteParam.PROJECT_KEY) ?? '';
  const project = projectStore.entityMap()[projectKey];

  return inject(ApiBoardService)
    .getBoards(project.id)
    .pipe(
      map((boards) => {
        const lastBoardId = projectStore.lastBoardIds()[projectKey];
        const board =
          boards.find(({ id }) => id === lastBoardId) ?? boards.at(0);

        return board
          ? router.createUrlTree([
              '/',
              AppPath.PROJECT,
              projectKey,
              AppPath.BOARD,
              board.id,
            ])
          : true;
      }),
      catchError(() => of(true))
    );
};
