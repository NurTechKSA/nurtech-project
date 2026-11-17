import { Routes } from '@angular/router';

import { AppPath } from '@core/enums/app-path.enum';
import { RouteParam } from '@core/enums/route-param.enum';

export const boardRoutes: Routes = [
  {
    path: `${AppPath.BOARD}/:${RouteParam.BOARD_ID}`,
    title: 'Доска',
    loadComponent: () =>
      import('./pages/board-page/board-page.component').then(
        (m) => m.BoardPageComponent
      ),
  },
];
