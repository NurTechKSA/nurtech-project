import type { AbstractControl } from '@angular/forms';

export const setControlApiError = (
  control: AbstractControl,
  message: string
): void => {
  control.setErrors({
    ...(control.errors ?? {}),
    other: message,
  });
  control.markAsTouched();
};
