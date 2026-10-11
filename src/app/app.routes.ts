import { Routes } from '@angular/router';

import { authGuard } from '@core/authentication/guards/auth.guard';
import { AppPath } from '@core/enums/app-path.enum';

export const routes: Routes = [
  {
    path: AppPath.LOGIN,
    title: 'Вход',
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
    children: [],
  },
];
