import { HttpErrorResponse } from '@angular/common/http';

import type { ApiError } from '@shared/interfaces/api-error.interface';
import type { ErrorResponse } from '@shared/interfaces/error-response.interface';

export const extractApiError = (error: unknown): ApiError | null => {
  if (error instanceof HttpErrorResponse) {
    const response: ErrorResponse | null = error.error as ErrorResponse | null;

    return response?.error ?? null;
  } else {
    return null;
  }
};
