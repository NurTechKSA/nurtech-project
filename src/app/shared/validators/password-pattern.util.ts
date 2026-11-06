import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

const PASSWORD_PATTERN = /^(?=.*[a-zA-Z])(?=.*\d)/;

export function getPasswordPatternValidator(): ValidatorFn {
  return ({ value }: AbstractControl<string>): ValidationErrors | null => {
    if (!value) {
      return null;
    }

    if (!PASSWORD_PATTERN.test(value)) {
      return { other: 'Пароль должен содержать букву и цифру' };
    }

    return null;
  };
}
