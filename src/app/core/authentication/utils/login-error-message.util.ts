import { HttpErrorResponse } from '@angular/common/http';

const UNAUTHORIZED_STATUS = 401;
const TOO_MANY_REQUESTS_STATUS = 429;

export function getLoginErrorMessage(error: unknown): string | null {
  if (!(error instanceof HttpErrorResponse)) {
    return null;
  }

  if (error.status === UNAUTHORIZED_STATUS) {
    return 'Неверный логин или пароль';
  }

  if (error.status === TOO_MANY_REQUESTS_STATUS) {
    const retryAfterSeconds = Number(error.headers.get('Retry-After'));
    const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));

    return `Слишком много попыток. Попробуйте через ${String(minutes)} мин.`;
  }

  return null;
}
