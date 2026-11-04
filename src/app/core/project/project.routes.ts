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
    children: [
      {
        path: `${AppPath.BOARD}/:${RouteParam.BOARD_ID}`,
        title: 'Доска',
        loadComponent: () =>
          import('../../board/pages/board-page/board-page.component').then(
            (m) => m.BoardPageComponent
          ),
      },
      // TODO: задача `tasks/:taskKey`
      {
        // TODO: временные данные
        path: AppPath.PROJECT_DATA,
        title: 'Данные API',
        loadComponent: () =>
          import('../../../temp/project-data/pages/project-data-page/project-data-page.component').then(
            (m) => m.ProjectDataPageComponent
          ),
      },
    ],
  },
];
