import {
  AbstractControl,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';

export function getRequiredValidator(message = 'Заполните поле'): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value: unknown = control.value;
    const isEmpty =
      typeof value === 'string'
        ? value.trim() === ''
        : Validators.required(control) !== null;

    return isEmpty ? { other: message } : null;
  };
}
