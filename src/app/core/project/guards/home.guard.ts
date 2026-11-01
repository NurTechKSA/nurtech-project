import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AppPath } from '@core/enums/app-path.enum';

import { ProjectStore } from '../+store/project.store';

// TODO: вести в последний открытый проект (хранить на устройстве), пока — в первый;
//  страница данных API — временно, пока в проекте нет доски
export const homeGuard: CanActivateFn = () => {
  const firstProject = inject(ProjectStore).entities().at(0);

  return firstProject
    ? inject(Router).createUrlTree([
        AppPath.PROJECT,
        firstProject.key,
        AppPath.PROJECT_DATA,
      ])
    : true;
};
