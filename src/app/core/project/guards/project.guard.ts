import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { filter, map, take } from 'rxjs';

import { AppPath } from '@core/enums/app-path.enum';
import { RouteParam } from '@core/enums/route-param.enum';

import { ProjectStore } from '../+store/project.store';

export const projectGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const projectStore = inject(ProjectStore);
  const projectKey = route.paramMap.get(RouteParam.PROJECT_KEY) ?? '';

  projectStore.loadProjects();

  return toObservable(projectStore.status).pipe(
    filter(() => projectStore.isLoaded() || projectStore.isError()),
    take(1),
    map(
      () =>
        projectKey in projectStore.entityMap() ||
        router.createUrlTree([AppPath.NOT_FOUND])
    )
  );
};
