import { Pipe, PipeTransform } from '@angular/core';

import { dayjs } from '../config/dayjs.config';

@Pipe({ name: 'relativeDate' })
export class RelativeDatePipe implements PipeTransform {
  transform(value: Date | string | null | undefined): string {
    if (!value) {
      return '';
    }

    const date = dayjs(value);

    return date.isValid() ? date.fromNow() : '';
  }
}
