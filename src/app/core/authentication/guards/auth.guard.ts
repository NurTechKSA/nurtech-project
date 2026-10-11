import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { filter, map, take } from 'rxjs';

import { AppPath } from '@core/enums/app-path.enum';
import { QueryParam } from '@core/enums/query-param.enum';

import { AuthStore } from '../+store/auth.store';

export const authGuard: CanActivateFn = (_, state) => {
  const router = inject(Router);
  const authStore = inject(AuthStore);

  return toObservable(authStore.isLoading).pipe(
    filter((isLoading) => !isLoading),
    take(1),
    map(
      () =>
        authStore.isAuth() ||
        router.createUrlTree([AppPath.LOGIN], {
          queryParams: { [QueryParam.RETURN_URL]: state.url },
        })
    )
  );
};
