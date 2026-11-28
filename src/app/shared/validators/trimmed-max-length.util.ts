import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

// По контракту длина считается после trim(); текст ошибки — maxlength из app.config
export function getTrimmedMaxLengthValidator(max: number): ValidatorFn {
  return (control: AbstractControl<unknown>): ValidationErrors | null => {
    if (typeof control.value !== 'string') {
      return null;
    }

    const actualLength = control.value.trim().length;

    return actualLength > max
      ? { maxlength: { requiredLength: max, actualLength } }
      : null;
  };
}
