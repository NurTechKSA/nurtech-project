import { Pipe, PipeTransform } from '@angular/core';

import { dayjs } from '../config/dayjs.config';

const MAX_RELATIVE_DAYS = 7;

@Pipe({ name: 'relativeDate' })
export class RelativeDatePipe implements PipeTransform {
  transform(value: Date | string): string {
    const date = dayjs(value);
    const now = dayjs();

    if (
      now.startOf('day').diff(date.startOf('day'), 'day') > MAX_RELATIVE_DAYS
    ) {
      return date.format('D MMM');
    }

    return date.fromNow();
  }
}
