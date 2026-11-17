import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export interface CompareControlOptions {
  targetControlName: string;
  message: string;
  match?: boolean;
}

export function getCompareControlValidator({
  targetControlName,
  message,
  match = true,
}: CompareControlOptions): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value || !control.parent) {
      return null;
    }

    const targetControl = control.parent.get(targetControlName);

    if (!targetControl?.value) {
      return null;
    }

    const isMatch = control.value === targetControl.value;
    const isValid = match ? isMatch : !isMatch;

    return isValid ? null : { other: message };
  };
}
