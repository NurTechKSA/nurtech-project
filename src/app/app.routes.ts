import { Routes } from '@angular/router';

import { authGuard } from '@core/authentication/guards/auth.guard';
import { guestGuard } from '@core/authentication/guards/guest.guard';
import { AppPath } from '@core/enums/app-path.enum';
import { homeGuard } from '@core/project/guards/home.guard';
import { projectsGuard } from '@core/project/guards/projects.guard';
import { projectRoutes } from '@core/project/project.routes';

export const routes: Routes = [
  {
    path: AppPath.LOGIN,
    title: 'Вход',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('@core/authentication/pages/login-page/login-page.component').then(
        (m) => m.LoginPageComponent
      ),
  },
  {
    path: AppPath.ROOT,
    title: 'Главная',
    canActivate: [authGuard],
    loadComponent: () =>
      import('@core/layout/layout.component').then((m) => m.LayoutComponent),
    children: [
      {
        path: AppPath.ROOT,
        canActivate: [projectsGuard],
        children: [
          {
            path: AppPath.ROOT,
            pathMatch: 'full',
            title: 'Нет проектов',
            canActivate: [homeGuard],
            loadComponent: () =>
              import('@core/project/pages/no-projects-page/no-projects-page.component').then(
                (m) => m.NoProjectsPageComponent
              ),
          },
          ...projectRoutes,
        ],
      },
      {
        path: AppPath.NOT_FOUND,
        title: 'Не найдено',
        loadComponent: () =>
          import('@shared/pages/not-found-page/not-found-page.component').then(
            (m) => m.NotFoundPageComponent
          ),
      },
    ],
  },
  { path: '**', redirectTo: AppPath.NOT_FOUND },
];
