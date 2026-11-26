import { Routes } from '@angular/router';

import { AppPath } from '@core/enums/app-path.enum';
import { RouteParam } from '@core/enums/route-param.enum';

export const taskRoutes: Routes = [
  {
    path: `${AppPath.TASKS}/:${RouteParam.TASK_KEY}`,
    title: 'Задача',
    loadComponent: () =>
      import('./pages/task-page/task-page.component').then(
        (m) => m.TaskPageComponent
      ),
  },
];
