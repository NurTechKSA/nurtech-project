import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

interface LengthLimits {
  min?: number;
  max?: number;
  trim?: boolean;
}

export function getLengthValidator({
  min,
  max,
  trim = false,
}: LengthLimits): ValidatorFn {
  return ({ value }: AbstractControl<string>): ValidationErrors | null => {
    if (!value) {
      return null;
    }

    const normalized = trim ? value.trim() : value;

    if (!normalized) {
      return null;
    }

    if (min && normalized.length < min) {
      return { other: `Не менее ${String(min)} символов` };
    }

    if (max && normalized.length > max) {
      return { other: `Не более ${String(max)} символов` };
    }

    return null;
  };
}
