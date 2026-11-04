import { inject } from '@angular/core';
import { updateState, withDevtools } from '@angular-architects/ngrx-toolkit';
import { signalStore, withMethods, withProps } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { exhaustMap, pipe, switchMap, tap } from 'rxjs';

import { UserStore } from '@core/user/+store/user.store';
import { catchEffectError } from '@shared/store/catch-effect-error.operator';
import { setLoaded, setLoading } from '@shared/store/status-update.util';
import { withLoadingStatus } from '@shared/store/with-loading-status.util';

import { ChangePasswordRequest } from '../interfaces/api/change-password-request.interface';
import { UpdateProfileRequest } from '../interfaces/api/update-profile-request.interface';
import { ApiProfileService } from '../services/api-profile.service';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const ProfileStore = signalStore(
  withDevtools('profile'),
  withLoadingStatus(),
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
          updateState(store, '[ProfileStore] changePassword', setLoading());
        }),
        exhaustMap((passwords) => apiProfileService.changePassword(passwords)),
        tap(() => {
          updateState(
            store,
            '[ProfileStore] changePasswordSuccess',
            setLoaded()
          );
        }),
        catchEffectError({ store, methodName: '[ProfileStore] changePassword' })
      )
    ),
  }))
);
