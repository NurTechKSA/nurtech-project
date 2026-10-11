import { Routes } from '@angular/router';

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
];
