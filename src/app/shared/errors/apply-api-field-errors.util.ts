import type { AbstractControl } from '@angular/forms';

import type { ApiError } from '@shared/interfaces/api-error.interface';

import { getFieldErrorMessage } from './field-error-message.util';
import { setControlApiError } from './set-control-api-error.util';

export const applyApiFieldErrors = (
  form: AbstractControl,
  apiError: ApiError,
  fieldMap: Record<string, string> = {}
): number => {
  let countFields = 0;

  if (!apiError.fields) {
    return 0;
  }

  const fieldEntries = Object.entries(apiError.fields);

  for (const [field, reason] of fieldEntries) {
    const controlPath = fieldMap[field] ?? field;
    const control = form.get(controlPath);

    if (!control) continue;

    let message: string;

    if (fieldEntries.length === 1) {
      message = apiError.message;
    } else {
      message = getFieldErrorMessage(reason);
    }

    setControlApiError(control, message);
    countFields++;
  }

  return countFields;
};
