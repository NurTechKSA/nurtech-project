import { inject } from '@angular/core';
import { updateState, withDevtools } from '@angular-architects/ngrx-toolkit';
import { signalStore, withMethods, withProps } from '@ngrx/signals';
import {
  removeAllEntities,
  setAllEntities,
  withEntities,
} from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap } from 'rxjs';

import { Project } from '@core/project/interfaces/project.interface';
import { catchEffectError } from '@shared/store/catch-effect-error.operator';
import { setLoaded, setLoading } from '@shared/store/status-update.util';
import { withLoadingStatus } from '@shared/store/with-loading-status.util';

import { Subsystem } from '../interfaces/subsystem.interface';
import { ApiSubsystemService } from '../services/api-subsystem.service';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const SubsystemStore = signalStore(
  withDevtools('subsystem'),
  withLoadingStatus(),
  withEntities<Subsystem>(),
  withProps(() => ({ apiSubsystemService: inject(ApiSubsystemService) })),
  withMethods(({ apiSubsystemService, ...store }) => ({
    loadSubsystems: rxMethod<Project['id']>(
      pipe(
        tap(() => {
          updateState(
            store,
            '[SubsystemStore] loadSubsystems',
            removeAllEntities(),
            setLoading()
          );
        }),
        switchMap((projectId) => apiSubsystemService.getSubsystems(projectId)),
        tap((subsystems) => {
          updateState(
            store,
            '[SubsystemStore] loadSubsystemsSuccess',
            setAllEntities(subsystems),
            setLoaded()
          );
        }),
        catchEffectError({
          store,
          methodName: '[SubsystemStore] loadSubsystems',
        })
      )
    ),
  }))
);
