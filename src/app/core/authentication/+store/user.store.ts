import { computed, inject } from '@angular/core';
import { updateState, withDevtools } from '@angular-architects/ngrx-toolkit';
import {
  signalStore,
  withComputed,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { exhaustMap, pipe, tap } from 'rxjs';

import { catchEffectError } from '@shared/store/catch-effect-error.operator';
import { setLoaded, setLoading } from '@shared/store/status-update.util';
import { withLoadingStatus } from '@shared/store/with-loading-status.util';

import { User } from '../interfaces/user.interface';
import { ApiAuthService } from '../services/api-auth.service';

interface UserState {
  currentUser: User | null;
}

const initialState: UserState = {
  currentUser: null,
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export const UserStore = signalStore(
  { providedIn: 'root' },
  withDevtools('user'),

  withLoadingStatus(),

  withState(initialState),

  withProps(() => ({
    apiAuthService: inject(ApiAuthService),
  })),

  withComputed(({ currentUser }) => ({
    isAuthenticated: computed(() => currentUser() !== null),
  })),

  withMethods((store) => ({
    setUser: (currentUser: User): void => {
      updateState(store, '[UserStore] setUser', setLoaded(), { currentUser });
    },
    reset: (): void => {
      updateState(store, '[UserStore] reset', initialState);
    },
  })),

  withMethods(({ apiAuthService, ...store }) => ({
    getCurrentUser: rxMethod<void>(
      pipe(
        tap(() => {
          updateState(store, '[UserStore] getCurrentUser', setLoading());
        }),
        exhaustMap(() => apiAuthService.getMe()),
        tap((currentUser) => {
          updateState(store, '[UserStore] getCurrentUserSuccess', setLoaded(), {
            currentUser,
          });
        }),
        catchEffectError({ store, methodName: '[UserStore] getCurrentUser' })
      )
    ),
  }))
);
