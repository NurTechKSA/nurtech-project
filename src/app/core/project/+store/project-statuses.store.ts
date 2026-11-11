import { inject } from '@angular/core';
import { updateState, withDevtools } from '@angular-architects/ngrx-toolkit';
import { signalStore, withMethods, withProps, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, pipe, switchMap, tap } from 'rxjs';

import { Project } from '@core/project/interfaces/project.interface';
import { LoadingStatus } from '@shared/enums/loading-status.enum';
import { catchEffectError } from '@shared/store/catch-effect-error.operator';
import { setLoaded } from '@shared/store/status-update.util';
import { withLoadingStatus } from '@shared/store/with-loading-status.util';

import { Status } from '../interfaces/status.interface';
import { ApiStatusService } from '../services/api-status.service';

interface State {
  statuses: Status[];
}

const initialState: State = {
  statuses: [],
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export const ProjectStatusesStore = signalStore(
  { providedIn: 'root' },
  withDevtools('projectStatuses'),
  withLoadingStatus(),
  withState(initialState),
  withProps(() => ({ apiStatusService: inject(ApiStatusService) })),
  withMethods(({ apiStatusService, ...store }) => ({
    loadStatuses: rxMethod<Project['id'] | null>(
      pipe(
        tap((projectId) => {
          updateState(
            store,
            '[ProjectStatusesStore] loadStatuses',
            initialState,
            {
              status:
                projectId === null ? LoadingStatus.INIT : LoadingStatus.LOADING,
            }
          );
        }),
        switchMap((projectId) =>
          projectId === null ? EMPTY : apiStatusService.getStatuses(projectId)
        ),
        tap((statuses) => {
          updateState(
            store,
            '[ProjectStatusesStore] loadStatusesSuccess',
            { statuses },
            setLoaded()
          );
        }),
        catchEffectError({
          store,
          methodName: '[ProjectStatusesStore] loadStatuses',
        })
      )
    ),
  }))
);
