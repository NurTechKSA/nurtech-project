import { Routes } from '@angular/router';

import { AppPath } from '@core/enums/app-path.enum';
import { RouteParam } from '@core/enums/route-param.enum';

import { projectGuard } from './guards/project.guard';

export const projectRoutes: Routes = [
  { path: AppPath.PROJECT, pathMatch: 'full', redirectTo: `/${AppPath.ROOT}` },
  {
    path: `${AppPath.PROJECT}/:${RouteParam.PROJECT_KEY}`,
    canActivate: [projectGuard],
    loadComponent: () =>
      import('./components/project-shell/project-shell.component').then(
        (m) => m.ProjectShellComponent
      ),
    children: [],
  },
];
