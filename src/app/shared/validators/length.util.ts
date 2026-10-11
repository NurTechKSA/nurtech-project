import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

interface LengthLimits {
  min?: number;
  max?: number;
}

export function getLengthValidator({ min, max }: LengthLimits): ValidatorFn {
  return ({ value }: AbstractControl<string>): ValidationErrors | null => {
    if (!value) {
      return null;
    }

    if (min && value.length < min) {
      return { other: `Не менее ${String(min)} символов` };
    }

    if (max && value.length > max) {
      return { other: `Не более ${String(max)} символов` };
    }

    return null;
  };
}
