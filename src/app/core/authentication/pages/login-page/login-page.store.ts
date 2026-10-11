import { inject } from '@angular/core';
import { updateState, withDevtools } from '@angular-architects/ngrx-toolkit';
import { signalStore, withMethods, withProps, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, EMPTY, exhaustMap, pipe, tap } from 'rxjs';

import { catchEffectError } from '@shared/store/catch-effect-error.operator';
import {
  setError,
  setLoaded,
  setLoading,
} from '@shared/store/status-update.util';
import { withLoadingStatus } from '@shared/store/with-loading-status.util';

import { UserStore } from '../../+store/user.store';
import { LoginRequest } from '../../interfaces/api/login-request.interface';
import { ApiAuthService } from '../../services/api-auth.service';
import { getLoginErrorMessage } from '../../utils/login-error-message.util';

interface LoginPageState {
  errorMessage: string | null;
}

const initialState: LoginPageState = {
  errorMessage: null,
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export const LoginPageStore = signalStore(
  withDevtools('login-page'),

  withLoadingStatus(),

  withState(initialState),

  withProps(() => ({
    userStore: inject(UserStore),
    apiAuthService: inject(ApiAuthService),
  })),

  withMethods(({ userStore, apiAuthService, ...store }) => ({
    login: rxMethod<LoginRequest>(
      pipe(
        tap(() => {
          updateState(store, '[LoginPageStore] login', setLoading(), {
            errorMessage: null,
          });
        }),
        exhaustMap((body) =>
          apiAuthService.login(body).pipe(
            tap((user) => {
              updateState(store, '[LoginPageStore] loginSuccess', setLoaded());
              userStore.setUser(user);
            }),
            catchError((error: unknown) => {
              updateState(store, '[LoginPageStore] loginFailure', setError(), {
                errorMessage: getLoginErrorMessage(error),
              });

              return EMPTY;
            })
          )
        ),
        catchEffectError({ store, methodName: '[LoginPageStore] login' })
      )
    ),
  }))
);
