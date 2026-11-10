import { tap, type MonoTypeOperatorFunction } from 'rxjs';

import { type ApiError } from '@shared/interfaces/api-error.interface';

import { extractApiError } from './extract-api-error.util';

type ApiErrorHandler = (apiError: ApiError) => void;

export const tapApiError = <T>(
  handler: ApiErrorHandler
): MonoTypeOperatorFunction<T> => {
  return tap({
    error: (rawError: unknown) => {
      const apiError = extractApiError(rawError);
      if (apiError) handler(apiError);
    },
  });
};
