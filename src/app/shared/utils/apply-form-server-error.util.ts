import { HttpErrorResponse } from '@angular/common/http';
import type { AbstractControl } from '@angular/forms';

import type { ErrorResponse } from '@shared/interfaces/error-response.interface';

const CONFLICT_STATUS = 409;
const VALIDATION_FAILED_STATUS = 422;

interface ApplyFormServerErrorOptions {
  fieldMap?: Readonly<Record<string, string>>;
  fallbackField?: string;
}

/**
 * Используйте в обработчике неуспешного запроса формы для переноса серверного
 * `message` в соответствующие контролы. Обрабатываются только ответы 422 и 409.
 * Если 409 обрабатывается локально, запрос должен использовать
 * `SKIP_ERROR_NOTIFICATION`, чтобы не показывать одновременно ошибку поля и toast.
 *
 * @param form Форма, в которую нужно перенести серверную ошибку.
 * @param error Исходная ошибка HTTP-запроса.
 * @param options Настройки сопоставления и резервного поля.
 * @returns `true`, если сообщение установлено хотя бы одному контролу.
 *
 * @example Одинаковые имена полей API и контролов
 * applyFormServerError(form, error);
 *
 * @example Сопоставление полей API с контролами формы смены пароля
 * applyFormServerError(form, error, {
 *   fieldMap: { current: 'currentPassword', next: 'newPassword' },
 * });
 *
 * @example Ошибка приглашения без `fields`
 * applyFormServerError(invitationForm, error, {
 *   fallbackField: 'email',
 * });
 *
 * @example Общее сообщение, если ни один контрол не найден
 * const isApplied = applyFormServerError(form, error);
 *
 * if (!isApplied && error instanceof HttpErrorResponse) {
 *   const response = error.error as Partial<ErrorResponse>;
 *   const message = response.error?.message;
 *
 *   if (message) notificationService.showError(message);
 * }
 */
export function applyFormServerError(
  form: AbstractControl,
  error: unknown,
  options?: ApplyFormServerErrorOptions
): boolean {
  if (
    !(error instanceof HttpErrorResponse) ||
    (error.status !== VALIDATION_FAILED_STATUS &&
      error.status !== CONFLICT_STATUS)
  ) {
    return false;
  }

  const body: unknown = error.error;

  if (typeof body !== 'object' || body === null) {
    return false;
  }

  const apiError = (body as Partial<ErrorResponse>).error;

  if (!apiError?.message) {
    return false;
  }

  const controls = Object.keys(apiError.fields ?? {})
    .map((field) => options?.fieldMap?.[field] ?? field)
    .map((field) => form.get(field))
    .filter((control) => control !== null);

  if (controls.length === 0 && options?.fallbackField) {
    const fallbackControl = form.get(options.fallbackField);

    if (fallbackControl) controls.push(fallbackControl);
  }

  for (const control of controls) {
    control.setErrors({ ...control.errors, other: apiError.message });
    control.markAsTouched();
  }

  return controls.length > 0;
}
