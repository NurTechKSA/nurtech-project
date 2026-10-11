import {
  AbstractControl,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';

export function getRequiredValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null =>
    Validators.required(control) ? { other: 'Заполните поле' } : null;
}
