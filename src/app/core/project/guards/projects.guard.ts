import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn } from '@angular/router';
import { filter, map, take } from 'rxjs';

import { ProjectStore } from '../+store/project.store';

export const projectsGuard: CanActivateFn = () => {
  const projectStore = inject(ProjectStore);

  projectStore.loadProjects();

  return toObservable(projectStore.status).pipe(
    filter(() => projectStore.isLoaded() || projectStore.isError()),
    take(1),
    map(() => true)
  );
};
