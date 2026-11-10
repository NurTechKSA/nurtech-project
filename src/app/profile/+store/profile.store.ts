import { inject } from '@angular/core';
import { updateState, withDevtools } from '@angular-architects/ngrx-toolkit';
import { signalStore, withMethods, withProps, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, EMPTY, exhaustMap, pipe, switchMap, tap } from 'rxjs';

import { UserStore } from '@core/user/+store/user.store';
import { catchEffectError } from '@shared/store/catch-effect-error.operator';
import {
  setError,
  setLoaded,
  setLoading,
} from '@shared/store/status-update.util';
import { withLoadingStatus } from '@shared/store/with-loading-status.util';

import { ChangePasswordRequest } from '../interfaces/api/change-password-request.interface';
import { UpdateProfileRequest } from '../interfaces/api/update-profile-request.interface';
import { ApiProfileService } from '../services/api-profile.service';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const ProfileStore = signalStore(
  withDevtools('profile'),
  withLoadingStatus(),
  withState<{ error: unknown }>({ error: null }),
  withProps(() => ({
    apiProfileService: inject(ApiProfileService),
    userStore: inject(UserStore),
  })),
  withMethods(({ apiProfileService, userStore, ...store }) => ({
    updateName: rxMethod<UpdateProfileRequest>(
      pipe(
        tap(() => {
          updateState(store, '[ProfileStore] updateName', setLoading());
        }),
        switchMap((payload) => apiProfileService.updateName(payload)),
        tap((user) => {
          userStore.setUser(user);
          updateState(store, '[ProfileStore] updateNameSuccess', setLoaded());
        }),
        catchEffectError({ store, methodName: '[ProfileStore] updateName' })
      )
    ),
    changePassword: rxMethod<ChangePasswordRequest>(
      pipe(
        tap(() => {
          updateState(store, '[ProfileStore] changePassword', setLoading(), {
            error: null,
          });
        }),
        exhaustMap((body) =>
          apiProfileService.changePassword(body).pipe(
            tap(() => {
              updateState(
                store,
                '[ProfileStore] changePasswordSuccess',
                setLoaded()
              );
            }),
            catchError((error: unknown) => {
              updateState(
                store,
                '[ProfileStore] changePasswordFailure',
                setError(),
                { error }
              );

              return EMPTY;
            })
          )
        ),
        catchEffectError({ store, methodName: '[ProfileStore] changePassword' })
      )
    ),
  }))
);
