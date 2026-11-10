import { HttpErrorResponse } from '@angular/common/http';
import { AbstractControl, FormGroup } from '@angular/forms';

import { ErrorResponse } from '@shared/interfaces/error-response.interface';

export function applyFormServerError(
  form: FormGroup,
  error: unknown,
  fieldMap?: Record<string, string>,
  fallbackControl?: AbstractControl
): void {
  if (!(error instanceof HttpErrorResponse)) {
    return;
  }

  const response = error.error as ErrorResponse | null;
  const message = response?.error.message;

  if (!message) {
    return;
  }

  const fields = Object.keys(response.error.fields ?? {});
  const control =
    fields.map((key) => form.get(fieldMap?.[key] ?? key)).find(Boolean) ??
    fallbackControl;

  control?.setErrors({ other: message });
  control?.markAsTouched();
}
