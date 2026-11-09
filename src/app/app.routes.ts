import { Routes } from '@angular/router';

import { authGuard } from '@core/authentication/guards/auth.guard';
import { guestGuard } from '@core/authentication/guards/guest.guard';
import { AppPath } from '@core/enums/app-path.enum';
import { projectRoutes } from '@core/project/project.routes';

import { boardRoutes } from './board/board.routes';
import { profileRoutes } from './profile/profile.routes';

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
  // TODO: страница приглашения `invite/:token` — пока все работают под тестовыми пользователями
  {
    path: AppPath.ROOT,
    title: 'Главная',
    canActivate: [authGuard],
    loadComponent: () =>
      import('@core/layout/layout.component').then((m) => m.LayoutComponent),
    children: [
      ...projectRoutes([
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
                import('../temp/project-data/pages/project-data-page/project-data-page.component').then(
                  (m) => m.ProjectDataPageComponent
                ),
            },
          ],
        },
      ]),
      ...profileRoutes,
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
