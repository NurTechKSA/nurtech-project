import { HttpErrorResponse } from '@angular/common/http';
import type { AbstractControl } from '@angular/forms';

import type { ErrorResponse } from '@shared/interfaces/error-response.interface';

/**
 * Извлекает нормализованную ошибку API из неуспешного HTTP-запроса.
 * Возвращает `null`, если ошибка не соответствует ожидаемому формату.
 * Перед новым запросом сохранённую в Store ошибку следует очистить.
 *
 * @example
 * catchError((error: unknown) => {
 *   updateState(store, '[ProfileStore] changePasswordFailure', setError(), {
 *     formError: extractFormServerError(error),
 *   });
 *
 *   return EMPTY;
 * });
 */
export function extractFormServerError(
  error: unknown
): ErrorResponse['error'] | null {
  if (!(error instanceof HttpErrorResponse)) {
    return null;
  }

  const response = error.error as Partial<ErrorResponse> | null;

  return response?.error?.message ? response.error : null;
}

/**
 * Переносит сообщение серверной валидации в соответствующие контролы формы.
 *
 * Имена контролов должны совпадать с ключами `fields` из API, например
 * `current`, `next` или `name`. Неизвестные поля пропускаются. Функция не
 * перехватывает ошибку и не управляет RxJS-потоком.
 *
 * @example
 * effect(() => {
 *   applyFormServerError(changePasswordForm, store.formError());
 * });
 */
export function applyFormServerError(
  form: AbstractControl,
  error: ErrorResponse['error'] | null
): void {
  const fields = error?.fields;

  if (!fields) {
    return;
  }

  for (const field of Object.keys(fields)) {
    const control = form.get(field);

    if (!control) continue;

    control.setErrors({ ...control.errors, other: error.message });
    control.markAsTouched();
  }
}
