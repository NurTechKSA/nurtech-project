import { Routes } from '@angular/router';

import { AppPath } from '@core/enums/app-path.enum';

export const profileRoutes: Routes = [
  {
    path: AppPath.PROFILE,
    title: 'Профиль',
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/profile-page/profile-page.component').then(
            (m) => m.ProfilePageComponent
          ),
      },
    ],
  },
];
