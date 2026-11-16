import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

import { parseDuration } from '../utils/duration-parser.util';

interface DurationLimits {
  min?: number;
  max?: number;
}

export function getDurationValidator({
  min,
  max,
}: DurationLimits): ValidatorFn {
  return (control: AbstractControl<string>): ValidationErrors | null => {
    const value = control.value;

    if (!value.trim()) {
      return null;
    }

    const duration = parseDuration(value);

    if (duration === null) {
      return {
        other: 'Некорректный формат. Используйте формат: 2h 30m, 2h или 45m',
      };
    }

    if (min !== undefined && duration < min) {
      return { other: `Минимальная длительность — ${String(min)} мин.` };
    }

    if (max !== undefined && duration > max) {
      return { other: `Максимальная длительность — ${String(max)} мин.` };
    }

    return null;
  };
}
