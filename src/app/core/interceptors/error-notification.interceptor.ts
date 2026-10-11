import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { ErrorResponse } from '@shared/interfaces/error-response.interface';
import { NotificationService } from '@shared/services/notification.service';

import { SKIP_ERROR_NOTIFICATION } from '../tokens/skip-error-notification.token';

const GENERIC_ERROR_MESSAGE =
  'Не удалось выполнить действие. Повторите попытку';
const NETWORK_ERROR_STATUS = 0;
const BAD_REQUEST_STATUS = 400;
const CONFLICT_STATUS = 409;
const SERVER_ERROR_MIN_STATUS = 500;

export const errorNotificationInterceptor: HttpInterceptorFn = (
  request,
  next
) => {
  if (request.context.get(SKIP_ERROR_NOTIFICATION)) {
    return next(request);
  }

  const notificationService = inject(NotificationService);

  return next(request).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) {
        return throwError(() => error);
      }

      if (error.status === CONFLICT_STATUS) {
        const response = error.error as ErrorResponse | null;

        notificationService.showError(
          response?.error.message ?? GENERIC_ERROR_MESSAGE
        );
      }

      if (error.status === BAD_REQUEST_STATUS) {
        // eslint-disable-next-line no-console
        console.error('Некорректный запрос', request, error);
        notificationService.showError(GENERIC_ERROR_MESSAGE);
      }

      if (
        error.status === NETWORK_ERROR_STATUS ||
        error.status >= SERVER_ERROR_MIN_STATUS
      ) {
        notificationService.showError(GENERIC_ERROR_MESSAGE);
      }

      return throwError(() => error);
    })
  );
};
