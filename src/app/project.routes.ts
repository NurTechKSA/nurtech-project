import { Routes } from '@angular/router';

import { AppPath } from '@core/enums/app-path.enum';
import { RouteParam } from '@core/enums/route-param.enum';
import { homeGuard } from '@core/project/guards/home.guard';
import { projectGuard } from '@core/project/guards/project.guard';
import { projectsGuard } from '@core/project/guards/projects.guard';

import { boardRoutes } from './board/board.routes';

export const projectRoutes: Routes = [
  {
    path: '',
    canActivate: [projectsGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'Нет проектов',
        canActivate: [homeGuard],
        loadComponent: () =>
          import('@core/project/pages/no-projects-page/no-projects-page.component').then(
            (m) => m.NoProjectsPageComponent
          ),
      },
      {
        path: AppPath.PROJECT,
        pathMatch: 'full',
        redirectTo: `/${AppPath.ROOT}`,
      },
      {
        path: `${AppPath.PROJECT}/:${RouteParam.PROJECT_KEY}`,
        canActivate: [projectGuard],
        loadComponent: () =>
          import('@core/project/components/project-shell/project-shell.component').then(
            (m) => m.ProjectShellComponent
          ),
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./board/components/board-data-shell/board-data-shell.component').then(
                (m) => m.BoardDataShellComponent
              ),
            children: [
              ...boardRoutes,
              // TODO: задача `tasks/:taskKey`
              {
                // TODO: временные данные
                path: AppPath.PROJECT_DATA,
                title: 'Данные API',
                loadComponent: () =>
                  // eslint-disable-next-line import-x/no-restricted-paths
                  import('../temp/project-data/pages/project-data-page/project-data-page.component').then(
                    (m) => m.ProjectDataPageComponent
                  ),
              },
            ],
          },
        ],
      },
    ],
  },
];
