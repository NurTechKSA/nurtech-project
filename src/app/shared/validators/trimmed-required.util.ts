import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function getTrimmedRequiredValidator(message: string): ValidatorFn {
  return (control: AbstractControl<unknown>): ValidationErrors | null => {
    const value = typeof control.value === 'string' ? control.value.trim() : '';

    return value.length > 0 ? null : { other: message };
  };
}
