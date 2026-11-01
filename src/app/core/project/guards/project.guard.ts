import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AppPath } from '@core/enums/app-path.enum';
import { RouteParam } from '@core/enums/route-param.enum';

import { ProjectStore } from '../+store/project.store';

export const projectGuard: CanActivateFn = (route) => {
  const projectKey = route.paramMap.get(RouteParam.PROJECT_KEY) ?? '';

  return (
    projectKey in inject(ProjectStore).entityMap() ||
    inject(Router).createUrlTree([AppPath.NOT_FOUND])
  );
};
