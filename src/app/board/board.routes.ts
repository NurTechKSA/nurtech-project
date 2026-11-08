import { Routes } from '@angular/router';

import { AppPath } from '@core/enums/app-path.enum';
import { RouteParam } from '@core/enums/route-param.enum';
import { projectGuard } from '@core/project/guards/project.guard';
import { projectsGuard } from '@core/project/guards/projects.guard';

export const boardRoutes: Routes = [
  {
    path: '',
    canActivate: [projectsGuard],
    children: [
      {
        path: `${AppPath.PROJECT}/:${RouteParam.PROJECT_KEY}`,
        canActivate: [projectGuard],
        loadComponent: () =>
          import('@core/project/components/project-shell/project-shell.component').then(
            (m) => m.ProjectShellComponent
          ),
        children: [
          {
            path: `${AppPath.BOARD}/:${RouteParam.BOARD_ID}`,
            title: 'Доска',
            loadComponent: () =>
              import('./pages/board-page/board-page.component').then(
                (m) => m.BoardPageComponent
              ),
          },
        ],
      },
    ],
  },
];
