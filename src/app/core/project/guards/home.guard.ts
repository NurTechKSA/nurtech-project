import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AppPath } from '@core/enums/app-path.enum';

import { ProjectStore } from '../+store/project.store';

// TODO: страница данных API — временно, пока в проекте нет доски
export const homeGuard: CanActivateFn = () => {
  const project = inject(ProjectStore).getLastProject();

  return project
    ? inject(Router).createUrlTree([
        AppPath.PROJECT,
        project.key,
        AppPath.PROJECT_DATA,
      ])
    : true;
};
