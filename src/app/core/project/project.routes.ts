import { Routes } from '@angular/router';

import { AppPath } from '@core/enums/app-path.enum';
import { RouteParam } from '@core/enums/route-param.enum';

import { homeGuard } from './guards/home.guard';
import { projectGuard } from './guards/project.guard';
import { projectsGuard } from './guards/projects.guard';

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
          import('./components/project-shell/project-shell.component').then(
            (m) => m.ProjectShellComponent
          ),
        children: [
          // TODO: доска `board/:boardId` и задача `tasks/:taskKey`
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
    ],
  },
];
