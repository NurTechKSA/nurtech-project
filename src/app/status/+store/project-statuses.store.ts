import { inject } from '@angular/core';
import { updateState, withDevtools } from '@angular-architects/ngrx-toolkit';
import { signalStore, withMethods, withProps, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap } from 'rxjs';

import { Project } from '@core/project/interfaces/project.interface';
import { catchEffectError } from '@shared/store/catch-effect-error.operator';
import { setLoaded, setLoading } from '@shared/store/status-update.util';
import { withLoadingStatus } from '@shared/store/with-loading-status.util';
import { Status } from '@status/interfaces/status.interface';

import { ApiStatusService } from '../services/api-status.service';

interface State {
  statuses: Status[];
}

const initialState: State = {
  statuses: [],
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export const ProjectStatusesStore = signalStore(
  withDevtools('projectStatuses'),
  withLoadingStatus(),
  withState(initialState),
  withProps(() => ({ apiStatusService: inject(ApiStatusService) })),
  withMethods(({ apiStatusService, ...store }) => ({
    loadStatuses: rxMethod<Project['id']>(
      pipe(
        tap(() => {
          updateState(
            store,
            '[ProjectStatusesStore] loadStatuses',
            { statuses: [] },
            setLoading()
          );
        }),
        switchMap((projectId) => apiStatusService.getStatuses(projectId)),
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
