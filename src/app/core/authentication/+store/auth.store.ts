import { computed, inject } from '@angular/core';
import { updateState, withDevtools } from '@angular-architects/ngrx-toolkit';
import {
  signalStore,
  withComputed,
  withMethods,
  withProps,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { exhaustMap, pipe, tap } from 'rxjs';

import { UserStore } from '@core/user/+store/user.store';
import { OptionalCallback } from '@shared/interfaces/optional-callback.interface';
import { catchEffectError } from '@shared/store/catch-effect-error.operator';
import { setLoaded, setLoading } from '@shared/store/status-update.util';
import { withLoadingStatus } from '@shared/store/with-loading-status.util';

import { ApiAuthService } from '../services/api-auth.service';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const AuthStore = signalStore(
  { providedIn: 'root' },
  withDevtools('auth'),

  withLoadingStatus(),

  withProps(() => ({
    userStore: inject(UserStore),
    apiAuthService: inject(ApiAuthService),
  })),

  withComputed(({ userStore }) => ({
    isAuth: computed(() => userStore.currentUser() !== null),
  })),

  withMethods(({ userStore }) => ({
    reset: (): void => {
      userStore.reset();
    },
  })),

  withMethods(({ userStore, apiAuthService, ...store }) => ({
    getCurrentUser: rxMethod<void>(
      pipe(
        tap(() => {
          updateState(store, '[AuthStore] getCurrentUser', setLoading());
        }),
        exhaustMap(() => apiAuthService.getMe()),
        tap((user) => {
          updateState(store, '[AuthStore] getCurrentUserSuccess', setLoaded());
          userStore.setUser(user);
        }),
        catchEffectError({ store, methodName: '[AuthStore] getCurrentUser' })
      )
    ),
    logout: rxMethod<OptionalCallback>(
      pipe(
        exhaustMap(({ callback }) =>
          apiAuthService.logout().pipe(
            tap(() => {
              store.reset();
              callback?.();
            })
          )
        ),
        catchEffectError({ store, methodName: '[AuthStore] logout' })
      )
    ),
  }))
);
