import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AppPath } from '@core/enums/app-path.enum';
import { QueryParam } from '@core/enums/query-param.enum';

import { AuthStore } from '../+store/auth.store';
import { SKIP_UNAUTHORIZED } from '../tokens/skip-unauthorized.token';

const UNAUTHORIZED_STATUS = 401;

export const unauthorizedInterceptor: HttpInterceptorFn = (request, next) => {
  if (request.context.get(SKIP_UNAUTHORIZED)) {
    return next(request);
  }

  const router = inject(Router);
  const authStore = inject(AuthStore);

  return next(request).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === UNAUTHORIZED_STATUS
      ) {
        authStore.reset();
        void router.navigate([AppPath.LOGIN], {
          queryParams: { [QueryParam.RETURN_URL]: router.url },
        });
      }

      return throwError(() => error);
    })
  );
};
