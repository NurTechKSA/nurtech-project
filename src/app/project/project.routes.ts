import { inject } from '@angular/core';
import { ResolveFn, Routes } from '@angular/router';

import { AppPath } from '@core/enums/app-path.enum';
import { RouteParam } from '@core/enums/route-param.enum';
import { ProjectStore } from '@core/project/+store/project.store';
import { homeGuard } from '@core/project/guards/home.guard';
import { projectGuard } from '@core/project/guards/project.guard';
import { projectsGuard } from '@core/project/guards/projects.guard';

import { BoardStore } from '../board/+store/board.store';
import { boardRoutes } from '../board/board.routes';
import { ProjectStatusesStore } from '../status/+store/project-statuses.store';
import { taskRoutes } from '../task/task.routes';

const loadProjectData: ResolveFn<void> = (route) => {
  const projectKey = route.paramMap.get(RouteParam.PROJECT_KEY) ?? '';
  const project = inject(ProjectStore).entityMap()[projectKey];

  inject(BoardStore).loadBoards(project.id);
  inject(ProjectStatusesStore).loadStatuses(project.id);
};

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
        providers: [BoardStore, ProjectStatusesStore],
        resolve: { projectData: loadProjectData },
        loadComponent: () =>
          import('@core/project/components/project-shell/project-shell.component').then(
            (m) => m.ProjectShellComponent
          ),
        children: [
          ...boardRoutes,
          ...taskRoutes,
          {
            path: '',
            pathMatch: 'full',
            redirectTo: AppPath.PROJECT_DATA,
          },
          {
            // TODO: временные данные
            path: AppPath.PROJECT_DATA,
            title: 'Данные API',
            loadComponent: () =>
              // eslint-disable-next-line import-x/no-restricted-paths
              import('../../temp/project-data/pages/project-data-page/project-data-page.component').then(
                (m) => m.ProjectDataPageComponent
              ),
          },
        ],
      },
    ],
  },
];
