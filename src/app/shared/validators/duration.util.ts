import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

import { parseDuration } from '../utils/duration-parser.util';

const DEFAULT_MAX_MINUTES = 100000;

export function getDurationValidator(
  maxMinutes = DEFAULT_MAX_MINUTES
): ValidatorFn {
  return ({ value }: AbstractControl<string>): ValidationErrors | null => {
    if (!value.trim()) {
      return null;
    }

    const minutes = parseDuration(value);

    if (minutes === null || minutes < 1) {
      return { other: 'Укажите длительность, например 2h 30m' };
    }

    if (minutes > maxMinutes) {
      return { other: 'Не более 100 000 минут' };
    }

    return null;
  };
}
