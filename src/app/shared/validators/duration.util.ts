import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

import { parseDuration } from '@shared/utils/duration-parser.util';

interface DurationLimits {
  min?: number;
  max?: number;
}

export function getDurationValidator(limits: DurationLimits): ValidatorFn {
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

    if (limits.min !== undefined && duration < limits.min) {
      return { other: `Минимальная длительность — ${String(limits.min)} мин.` };
    }

    if (limits.max !== undefined && duration > limits.max) {
      return {
        other: `Максимальная длительность — ${String(limits.max)} мин.`,
      };
    }

    return null;
  };
}
