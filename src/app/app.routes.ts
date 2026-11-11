import { Routes } from '@angular/router';

import { authGuard } from '@core/authentication/guards/auth.guard';
import { guestGuard } from '@core/authentication/guards/guest.guard';
import { AppPath } from '@core/enums/app-path.enum';

import { profileRoutes } from './profile/profile.routes';
import { projectRoutes } from './project.routes';

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
      ...projectRoutes,
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
